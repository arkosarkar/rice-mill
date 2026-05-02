const sql = require('../config/db');
const { moveStock, updateStock } = require('../services/stockService');
const numberToWords = require('number-to-words');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function createSale(req, res) {
  try {
    const body = req.body || {};
    const productId = body.productId;
    const quantityKg = toNumber(body.quantityKg);

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }
    if (quantityKg <= 0) {
      return res.status(400).json({ message: 'quantityKg must be > 0' });
    }

    // GST Logic Calculation Engine
    const stateStr = (body.customerState || 'West Bengal').trim();
    const isLocal = stateStr.toLowerCase() === 'west bengal';
    
    const rate = toNumber(body.ratePerKg);
    const taxableValue = Math.round((quantityKg * rate) * 100) / 100;
    
    const saleType = body.saleType || 'Rice';
    const hsnSac = body.hsnSac || (saleType.includes('Milling') ? '9988' : '1006');
    const taxPercent = toNumber(body.taxPercent) || 5; 
    const isRcm = body.isRcm === true || body.isRcm === 'true';

    const taxAmount = Math.round((taxableValue * (taxPercent / 100)) * 100) / 100;
    
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    if (isLocal) {
        cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
        sgstAmount = Math.round((taxAmount / 2) * 100) / 100;
        if (Math.abs((cgstAmount + sgstAmount) - taxAmount) > 0.001) {
            cgstAmount = Math.round((taxAmount - sgstAmount) * 100) / 100;
        }
    } else {
        igstAmount = taxAmount;
    }

    const grandTotal = Math.round((taxableValue + taxAmount) * 100) / 100;
    const amountReceived = toNumber(body.amountReceived);
    const balanceDue = Math.max(0, grandTotal - amountReceived);

    const paymentStatus = balanceDue === 0 ? 'Paid' : (amountReceived > 0 ? 'Partial Payment' : 'Unpaid');
    const cashBankName = (body.paymentMode || '').toLowerCase().includes('bank') ? 'SBI - Main Account' : 'Cash in Hand';

    // Step 1: Fetch product details
    const productRows = await sql`SELECT * FROM rice_stocks WHERE id = ${productId}`;
    if (productRows.length === 0) {
      return res.status(404).json({ message: 'Product not found in stock.' });
    }
    const product = productRows[0];
    const invoiceNo = body.invoiceNo;

    // Step 2: Transaction for Sale and Accounting
    const result = await sql.begin(async txSql => {
      // Check stock
      if (Number(product.available_weight_kg) < quantityKg) {
        throw new Error(`Insufficient stock. Available: ${product.available_weight_kg} Kg`);
      }

      // Insert Sale
      const saleResult = await txSql`
        INSERT INTO sales (
          invoice_no, invoice_date, customer_name, contact_number, address,
          gst_number, customer_state, billing_address, shipping_address, sale_type, hsn_sac,
          product_id, variety, rice_type, quantity_kg, bags,
          rate_per_kg, taxable_value, tax_percent, tax_amount, cgst_amount, sgst_amount, igst_amount, is_rcm, grand_total,
          amount_received, balance_due, payment_mode, payment_status,
          delivery_date, vehicle_number, driver_name, delivery_status,
          source_godown, remarks, total_amount
        )
        VALUES (
          ${invoiceNo}, ${body.invoiceDate}, ${body.customerName}, ${body.contactNumber}, ${body.address},
          ${body.gstNumber}, ${stateStr}, ${body.billingAddress || body.address}, ${body.shippingAddress || body.address}, ${saleType}, ${hsnSac},
          ${productId}, ${product.variety}, ${product.rice_type}, ${quantityKg}, ${toNumber(body.bags)},
          ${rate}, ${taxableValue}, ${taxPercent}, ${taxAmount}, ${cgstAmount}, ${sgstAmount}, ${igstAmount}, ${isRcm}, ${grandTotal},
          ${amountReceived}, ${balanceDue}, ${body.paymentMode}, ${paymentStatus},
          ${body.deliveryDate || null}, ${body.vehicleNumber}, ${body.driverName}, ${body.deliveryStatus},
          ${product.godown}, ${body.remarks}, ${grandTotal}
        )
        RETURNING *
      `;

      // Ledgers using ILIKE for case-insensitive matching
      await txSql`INSERT INTO ledgers (name, group_name) SELECT 'Sales Account', 'Sales' WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE name ILIKE 'Sales Account')`;
      await txSql`INSERT INTO ledgers (name, group_name) SELECT 'GST Payable', 'Current Liabilities' WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE name ILIKE 'GST Payable')`;
      await txSql`INSERT INTO ledgers (name, group_name) SELECT ${body.customerName}, 'Debtors' WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE name ILIKE ${body.customerName})`;
      await txSql`INSERT INTO ledgers (name, group_name) SELECT ${cashBankName}, 'Cash-in-hand' WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE name ILIKE ${cashBankName})`;

      const ledgers = await txSql`
        SELECT id, name FROM ledgers 
        WHERE name ILIKE ${'Sales Account'} 
           OR name ILIKE ${'GST Payable'} 
           OR name ILIKE ${body.customerName} 
           OR name ILIKE ${cashBankName}
      `;
      const getId = (name) => ledgers.find(l => l.name.toLowerCase() === name.toLowerCase())?.id;

      const salesLedgerId = getId('Sales Account');
      const gstLedgerId   = getId('GST Payable');
      const customerLedgerId = getId(body.customerName);
      const cashLedgerId = getId(cashBankName);

      // Party Link
      await txSql`
        INSERT INTO parties (name, type, mobile_number, address, state, gst_number, gst_status, ledger_id)
        SELECT ${body.customerName}, 'Customer', ${body.contactNumber || ''}, ${body.billingAddress || body.address || ''}, ${stateStr}, ${body.gstNumber || ''}, 
               CASE WHEN COALESCE(${body.gstNumber}, '') != '' THEN 'Registered' ELSE 'Unregistered' END, ${customerLedgerId}
        WHERE NOT EXISTS (SELECT 1 FROM parties WHERE name = ${body.customerName})
      `;

      // Transactions
      if (taxableValue > 0 && customerLedgerId && salesLedgerId) {
        await txSql`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${body.invoiceDate}, 'Journal', ${'JRN-SALE-' + invoiceNo}, ${customerLedgerId}, ${salesLedgerId}, ${taxableValue}, ${'Rice Sale Revenue: ' + invoiceNo}, 'SALE', ${invoiceNo})`;
      }
      if (taxAmount > 0 && customerLedgerId && gstLedgerId) {
        await txSql`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${body.invoiceDate}, 'Journal', ${'JRN-GST-' + invoiceNo}, ${customerLedgerId}, ${gstLedgerId}, ${taxAmount}, ${'Output GST for Invoice: ' + invoiceNo}, 'SALE', ${invoiceNo})`;
      }
      if (amountReceived > 0 && cashLedgerId && customerLedgerId) {
        await txSql`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${body.invoiceDate}, 'Receipt', ${'VCH-REC-' + invoiceNo}, ${cashLedgerId}, ${customerLedgerId}, ${amountReceived}, ${'Receipt for Invoice: ' + invoiceNo}, 'SALE', ${invoiceNo})`;
      }

      // Stock Movement
      await moveStock(txSql, product.godown, null, product.item_type, product.variety, product.rice_type, quantityKg, toNumber(body.bags), 'SALE', 'Dispatched to Customer');

      return saleResult[0];
    });

    // Sync Customer Ledger Balance
    await sql`
      UPDATE ledgers 
      SET current_balance = (SELECT COALESCE(SUM(balance_due), 0) FROM sales WHERE customer_name = ${body.customerName})
      WHERE name = ${body.customerName}
    `;

    res.status(201).json({ sale: result, message: 'Sale created successfully.' });
  } catch (error) {
    console.error('SQL Error in createSale:', error);
    res.status(error.message.includes('Insufficient stock') ? 400 : 500).json({ message: 'Failed to save sale', error: error.message });
  }
}

async function listSales(req, res) {
  try {
    const { page, limit, search, customer, status } = req.query;
    let baseQuery = `SELECT * FROM sales`;
    let whereClauses = [];
    let queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(invoice_no ILIKE $${queryParams.length} OR customer_name ILIKE $${queryParams.length})`);
    }
    
    if (customer && customer !== 'All Customers') {
      queryParams.push(customer);
      whereClauses.push(`customer_name = $${queryParams.length}`);
    }
    
    if (status && status !== 'All Status') {
      queryParams.push(status);
      whereClauses.push(`payment_status = $${queryParams.length}`);
    }

    let whereString = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    let orderByString = ` ORDER BY created_at DESC`;

    const countQuery = `SELECT COUNT(*) as count FROM sales${whereString}`;
    const totalResult = await sql(countQuery, ...queryParams);
    const total = parseInt(totalResult[0].count) || 0;

    if (page && limit) {
      const p = parseInt(page);
      const l = parseInt(limit);
      const offset = (p - 1) * l;
      
      const dataQuery = `${baseQuery}${whereString}${orderByString} LIMIT ${l} OFFSET ${offset}`;
      const data = await sql(dataQuery, ...queryParams);
      
      return res.json({
        data,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l)
      });
    }

    const items = await sql(`${baseQuery}${whereString}${orderByString}`, ...queryParams);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load sales', error: error.message });
  }
}

// ✅ H-4 FIX: nullOr() — safe COALESCE helper.
// toNumber(undefined) = 0, which silently overwrites valid DB values via COALESCE(0, column).
// nullOr() returns null for missing/empty fields so COALESCE keeps the existing column value.
function nullOr(v) {
  return (v === undefined || v === null || v === '') ? null : v;
}
function nullOrNum(v) {
  const n = nullOr(v);
  return n === null ? null : Number(n);
}

// ✅ C-1 FIX: updateSale — wrapped in transaction, adjusts rice_stocks on qty/product change.
async function updateSale(req, res) {
  const { id } = req.params;
  const body = req.body || {};
  let updatedSale = null;

  try {
    await sql.begin(async (tx) => {

      // Step 1: Fetch existing sale
      const existing = await tx`SELECT * FROM sales WHERE id = ${id} FOR UPDATE`;
      if (!existing.length) {
        const e = new Error('Sale not found'); e.statusCode = 404; throw e;
      }
      const old = existing[0];

      // Step 2: Resolve final values (fall back to old DB values if not sent)
      const newQty        = nullOr(body.quantityKg)  !== null ? toNumber(body.quantityKg)  : toNumber(old.quantity_kg);
      const newRate       = nullOr(body.ratePerKg)   !== null ? toNumber(body.ratePerKg)   : toNumber(old.rate_per_kg);
      const newProductId  = nullOr(body.productId)   !== null ? body.productId             : old.product_id;
      const newGrandTotal = nullOr(body.grandTotal)  !== null ? toNumber(body.grandTotal)  : toNumber(old.grand_total);
      const newAmtRcvd    = nullOr(body.amountReceived) !== null ? toNumber(body.amountReceived) : toNumber(old.amount_received);
      const newBalanceDue = Math.max(0, newGrandTotal - newAmtRcvd);
      const newStatus     = newBalanceDue <= 0 ? 'Paid' : newAmtRcvd > 0 ? 'Partial Payment' : 'Unpaid';

      const oldQty       = toNumber(old.quantity_kg);
      const oldProductId = old.product_id;
      const productChanged = String(newProductId) !== String(oldProductId);

      // Step 3: Stock adjustment
      if (productChanged) {
        // Return old qty to old stock, deduct new qty from new stock
        await tx`UPDATE rice_stocks SET available_weight_kg = available_weight_kg + ${oldQty} WHERE id = ${oldProductId}`;
        const newStk = await tx`SELECT available_weight_kg FROM rice_stocks WHERE id = ${newProductId}`;
        if (!newStk.length) {
          const e = new Error(`Product ${newProductId} not found.`); e.statusCode = 400; throw e;
        }
        if (toNumber(newStk[0].available_weight_kg) < newQty) {
          const e = new Error(`Insufficient stock — Available: ${toNumber(newStk[0].available_weight_kg)} kg, Requested: ${newQty} kg`);
          e.statusCode = 400; throw e;
        }
        await tx`UPDATE rice_stocks SET available_weight_kg = available_weight_kg - ${newQty} WHERE id = ${newProductId}`;
      } else {
        const delta = newQty - oldQty; // +ve = need more stock, -ve = return stock
        if (delta > 0) {
          const stk = await tx`SELECT available_weight_kg FROM rice_stocks WHERE id = ${oldProductId} FOR UPDATE`;
          if (!stk.length || toNumber(stk[0].available_weight_kg) < delta) {
            const avail = stk[0]?.available_weight_kg ?? 0;
            const e = new Error(`Cannot increase qty by ${delta} kg — only ${avail} kg available.`);
            e.statusCode = 400; throw e;
          }
        }
        if (delta !== 0) {
          await tx`UPDATE rice_stocks SET available_weight_kg = available_weight_kg - ${delta} WHERE id = ${oldProductId}`;
        }
      }

      // Step 4: Update sale record
      const updated = await tx`
        UPDATE sales SET
          invoice_no      = COALESCE(${nullOr(body.invoiceNo)},      invoice_no),
          invoice_date    = COALESCE(${nullOr(body.invoiceDate)},    invoice_date),
          customer_name   = COALESCE(${nullOr(body.customerName)},   customer_name),
          contact_number  = COALESCE(${nullOr(body.contactNumber)},  contact_number),
          address         = COALESCE(${nullOr(body.address)},        address),
          gst_number      = COALESCE(${nullOr(body.gstNumber)},      gst_number),
          customer_state  = COALESCE(${nullOr(body.customerState)},  customer_state),
          product_id      = ${newProductId},
          variety         = COALESCE(${nullOr(body.variety)},        variety),
          rice_type       = COALESCE(${nullOr(body.riceType)},       rice_type),
          quantity_kg     = ${newQty},
          bags            = COALESCE(${nullOrNum(body.bags)},        bags),
          rate_per_kg     = ${newRate},
          total_amount    = COALESCE(${nullOrNum(body.totalAmount)}, total_amount),
          tax_percent     = COALESCE(${nullOrNum(body.taxPercent)},  tax_percent),
          tax_amount      = COALESCE(${nullOrNum(body.taxAmount)},   tax_amount),
          cgst_amount     = COALESCE(${nullOrNum(body.cgst)},        cgst_amount),
          sgst_amount     = COALESCE(${nullOrNum(body.sgst)},        sgst_amount),
          igst_amount     = COALESCE(${nullOrNum(body.igst)},        igst_amount),
          grand_total     = ${newGrandTotal},
          amount_received = ${newAmtRcvd},
          balance_due     = ${newBalanceDue},
          payment_mode    = COALESCE(${nullOr(body.paymentMode)},    payment_mode),
          payment_status  = ${newStatus},
          delivery_date   = COALESCE(${nullOr(body.deliveryDate)},   delivery_date),
          vehicle_number  = COALESCE(${nullOr(body.vehicleNumber)},  vehicle_number),
          driver_name     = COALESCE(${nullOr(body.driverName)},     driver_name),
          delivery_status = COALESCE(${nullOr(body.deliveryStatus)}, delivery_status),
          source_godown   = COALESCE(${nullOr(body.sourceGodown)},   source_godown),
          remarks         = COALESCE(${nullOr(body.remarks)},        remarks),
          hsn_sac         = COALESCE(${nullOr(body.hsnSac)},         hsn_sac),
          sale_type       = COALESCE(${nullOr(body.saleType)},       sale_type),
          is_rcm          = COALESCE(${nullOr(body.isRcm)},          is_rcm)
        WHERE id = ${id}
        RETURNING *
      `;

      updatedSale = updated[0];

      // Step 5: Sync ledger balance
      if (updatedSale.customer_name) {
        await tx`
          UPDATE ledgers
          SET current_balance = (SELECT COALESCE(SUM(balance_due), 0) FROM sales WHERE customer_name = ${updatedSale.customer_name})
          WHERE name = ${updatedSale.customer_name}
        `;
      }
    }); // end transaction — auto-rollback on any throw

    res.json({ sale: updatedSale, message: 'Sale updated successfully.' });

  } catch (error) {
    console.error('SQL Error in updateSale:', error);
    const status = error.statusCode || 500;
    const msg = status < 500 ? error.message : 'Failed to update sale.';
    res.status(status).json({ message: msg });
  }
}

async function processPayment(req, res) {
  try {
    const { customerName, amountReceived, paymentMode, date, note } = req.body;
    
    if (!customerName || !amountReceived || Number(amountReceived) <= 0) {
      return res.status(400).json({ message: 'Invalid customer or amount.' });
    }

    const amt = Number(amountReceived);

    const unpaidSales = await sql`
      SELECT * FROM sales 
      WHERE customer_name = ${customerName} AND balance_due > 0 
      ORDER BY invoice_date ASC, created_at ASC
    `;

    if (!unpaidSales.length) {
      return res.status(400).json({ message: 'No unpaid invoices found for this customer.' });
    }

    let remainingToApply = amt;
    const totalDue = unpaidSales.reduce((sum, sale) => sum + Number(sale.balance_due), 0);

    if (amt > totalDue) {
      return res.status(400).json({ message: `Amount exceeds total balance due (₹${totalDue})` });
    }

    for (let sale of unpaidSales) {
      if (remainingToApply <= 0) break;
      
      let due = Number(sale.balance_due);
      let deduct = Math.min(remainingToApply, due);
      
      let newAmountReceived = Number(sale.amount_received || 0) + deduct;
      let newBalanceDue = due - deduct;
      let newStatus = newBalanceDue <= 0 ? 'Paid' : 'Partial Payment';
      
      await sql`
        UPDATE sales 
        SET amount_received = ${newAmountReceived}, balance_due = ${newBalanceDue}, payment_status = ${newStatus}
        WHERE id = ${sale.id}
      `;
      
      remainingToApply -= deduct;
    }

    await sql`
      UPDATE ledgers 
      SET current_balance = (SELECT COALESCE(SUM(balance_due), 0) FROM sales WHERE customer_name = ${customerName})
      WHERE name = ${customerName}
    `;

    const voucher_no = `VCH-RECT-${Date.now()}`;
    const debit_ledger_id = paymentMode === 'bank' ? (await sql`SELECT id FROM ledgers WHERE name = 'SBI - Main Account'`)[0]?.id : (await sql`SELECT id FROM ledgers WHERE name = 'Cash in Hand'`)[0]?.id;
    const credit_ledger_id = (await sql`SELECT id FROM ledgers WHERE name = ${customerName}`)[0]?.id;

    if (debit_ledger_id && credit_ledger_id) {
       await sql`
         INSERT INTO transactions (
           transaction_date, voucher_type, voucher_no, debit_ledger_id, 
           credit_ledger_id, amount, narration, ref_module
         ) VALUES (
           ${date || new Date().toISOString().split('T')[0]}, 'Receipt', ${voucher_no}, ${debit_ledger_id}, 
           ${credit_ledger_id}, ${amt}, ${note || `Receipt from ${customerName} - ₹${amt}`}, 'Sales'
         )
       `;
    }

    res.json({ message: 'Payment processed successfully' });
  } catch (error) {
    console.error('Payment Error:', error);
    res.status(500).json({ message: 'Failed to process payment', error: error.message });
  }
}

async function getInvoiceJSON(req, res) {
  try {
    const { id } = req.params;
    const saleRows = await sql`
      SELECT 
        s.id, s.invoice_no, s.invoice_date, s.customer_name, s.gst_number,
        s.customer_state, s.billing_address, s.shipping_address, s.sale_type, s.hsn_sac,
        s.variety, s.rice_type, s.quantity_kg, s.bags, s.rate_per_kg,
        s.taxable_value, s.tax_percent, s.cgst_amount, s.sgst_amount, s.igst_amount,
        s.is_rcm, s.grand_total, s.remarks
      FROM sales s
      WHERE s.id = ${id}
    `;

    if (!saleRows || saleRows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const s = saleRows[0];
    
    // Convert to proper readable numbers logic
    const totalWords = numberToWords.toWords(s.grand_total) + ' rupees only';

    // Output mapped specifically for PDF and compliance requirements
    const taxInvoice = {
      invoice_number: s.invoice_no,
      date: s.invoice_date,
      party_name: s.customer_name,
      gstin: s.gst_number || 'Unregistered',
      state: s.customer_state || 'West Bengal',
      billing_address: s.billing_address || 'Same as Party',
      shipping_address: s.shipping_address || 'Same as Party',
      reverse_charge: s.is_rcm ? 'Yes' : 'No',
      items: [
        {
          name: `${s.variety} - ${s.rice_type}`,
          hsn: s.hsn_sac,
          qty_kg: Number(s.quantity_kg),
          bags: Number(s.bags),
          rate_per_kg: Number(s.rate_per_kg),
          taxable_amount: Number(s.taxable_value)
        }
      ],
      tax_bifurcation: {
        taxable_value: Number(s.taxable_value),
        tax_rate: Number(s.tax_percent),
        cgst: Number(s.cgst_amount || 0),
        sgst: Number(s.sgst_amount || 0),
        igst: Number(s.igst_amount || 0),
        total_tax: (Number(s.cgst_amount || 0) + Number(s.sgst_amount || 0) + Number(s.igst_amount || 0)).toFixed(2)
      },
      grand_total: Number(s.grand_total),
      amount_in_words: totalWords.charAt(0).toUpperCase() + totalWords.slice(1).replace(/-/g, ' '),
      declaration: 'Goods once sold will not be taken back.',
      triplicate_copies: ['Original for Recipient', 'Duplicate for Transporter', 'Triplicate for Supplier']
    };

    res.json(taxInvoice);
  } catch (error) {
    console.error('Invoice JSON Generation Error:', error);
    res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
  }
}

async function downloadCSV(req, res) {
  try {
    const { from, to } = req.query;

    
    // Default to current month if no range given
    const now = new Date();
    const startDate = from || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endDate   = to   || now.toISOString().split('T')[0];

    const MILL_STATE = 'west bengal'; // Change this to your mill's state (lowercase)

    const rows = await sql`
      SELECT
        invoice_no,
        customer_name,
        gst_number,
        invoice_date,
        hsn_sac,
        taxable_value,
        cgst_amount,
        sgst_amount,
        igst_amount,
        tax_amount,
        grand_total,
        customer_state
      FROM sales
      WHERE invoice_date BETWEEN ${startDate} AND ${endDate}
      ORDER BY invoice_date ASC, invoice_no ASC
    `;

    // CSV header
    const headers = [
      'Invoice ID',
      'Customer Name',
      'GSTIN',
      'Invoice Date',
      'HSN/SAC',
      'Taxable Value (₹)',
      'CGST (₹)',
      'SGST (₹)',
      'IGST (₹)',
      'Grand Total (₹)',
    ];

    const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Wrap in quotes if it contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const fmt = (n) => Number(n || 0).toFixed(2);

    const csvLines = rows.map(r => {
      const isLocal = (r.customer_state || '').trim().toLowerCase() === MILL_STATE;

      // Re-derive split if needed (data already stored correctly, but fall back gracefully)
      const taxAmount = toNumber(r.tax_amount);
      const cgst = isLocal ? toNumber(r.cgst_amount) || Math.round((taxAmount / 2) * 100) / 100 : 0;
      const sgst = isLocal ? toNumber(r.sgst_amount) || Math.round((taxAmount / 2) * 100) / 100 : 0;
      const igst = !isLocal ? toNumber(r.igst_amount) || taxAmount : 0;

      return [
        escape(r.invoice_no),
        escape(r.customer_name),
        escape(r.gst_number || 'Unregistered'),
        escape(r.invoice_date ? new Date(r.invoice_date).toLocaleDateString('en-IN') : ''),
        escape(r.hsn_sac || '1006'),
        escape(fmt(r.taxable_value)),
        escape(fmt(cgst)),
        escape(fmt(sgst)),
        escape(fmt(igst)),
        escape(fmt(r.grand_total)),
      ].join(',');
    });

    // BOM + header + rows
    const csvContent = '\uFEFF' + [headers.join(','), ...csvLines].join('\r\n');

    const filename = `Tax_Invoice_Report_${startDate}_to_${endDate}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('CSV Export Error:', error);
    res.status(500).json({ message: 'Failed to generate CSV', error: error.message });
  }
}

async function deleteSale(req, res) {
  try {
    const { id } = req.params;
    
    // 1. Fetch the sale details
    const sale = await sql`SELECT * FROM sales WHERE id = ${id}`;
    if (!sale.length) return res.status(404).json({ message: 'Sale record not found' });
    
    const s = sale[0];
    const invoiceNo = s.invoice_no;
    const productId = s.product_id;
    const qty = toNumber(s.quantity_kg);
    const customerName = s.customer_name;

    await sql.begin(async (tx) => {
      // 2. Reverse stock in rice_stocks
      if (productId) {
        await tx`
          UPDATE rice_stocks 
          SET available_weight_kg = available_weight_kg + ${qty}
          WHERE id = ${productId}
        `;
      }

      // 3. Delete linked transactions (Journal and Receipt)
      // These are linked by the invoice number in ref_id
      await tx`DELETE FROM transactions WHERE ref_module = 'SALE' AND ref_id = ${invoiceNo}`;

      // 4. Delete the sale record itself
      await tx`DELETE FROM sales WHERE id = ${id}`;

      // 5. Sync the customer ledger balance
      if (customerName) {
        await tx`
          UPDATE ledgers
          SET current_balance = (SELECT COALESCE(SUM(balance_due), 0) FROM sales WHERE customer_name = ${customerName})
          WHERE name = ${customerName}
        `;
      }
    });

    res.json({ message: 'Sale deleted and stock reversed successfully.' });
  } catch (error) {
    console.error('SQL Error in deleteSale:', error);
    res.status(500).json({ message: 'Failed to delete sale.', error: error.message });
  }
}

module.exports = { createSale, listSales, updateSale, processPayment, getInvoiceJSON, downloadCSV, deleteSale };

