const sql = require('../config/db');
const { updateStock } = require('../services/stockService');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Ensure "Sales Return" and "Purchase Return" ledgers exist
async function ensureLedgers() {
  await sql`INSERT INTO ledgers (name, group_name) VALUES ('Sales Return Account', 'Sales') ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO ledgers (name, group_name) VALUES ('Purchase Return Account', 'Purchases') ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO ledgers (name, group_name) VALUES ('GST Receivable', 'Current Assets') ON CONFLICT (name) DO NOTHING`;
}

// Function to handle Credit Note (Sales Return)
async function createCreditNote(req, res) {
  try {
    const { refInvoiceNo, returnQuantityKg, returnRatePerKg, reason } = req.body;
    
    // 1. Validation: Fetch Original Invoice
    const sales = await sql`SELECT * FROM sales WHERE invoice_no = ${refInvoiceNo}`;
    if (!sales.length) {
      return res.status(404).json({ message: 'Original Sales Invoice not found.' });
    }
    const sale = sales[0];
    
    const qtyKg = toNumber(returnQuantityKg);
    const rate = toNumber(returnRatePerKg) || toNumber(sale.rate_per_kg);
    if (qtyKg <= 0 || qtyKg > toNumber(sale.quantity_kg)) {
      return res.status(400).json({ message: 'Return quantity invalid or exceeds original sale quantity.' });
    }
    
    // Check previous returns against this invoice
    const existingNotes = await sql`SELECT SUM(quantity_kg) as returned_qty, SUM(total_amount) as returned_amount FROM notes WHERE ref_invoice_no = ${refInvoiceNo} AND note_type = 'Credit Note'`;
    const alreadyReturnedQty = toNumber(existingNotes[0]?.returned_qty);
    const alreadyReturnedAmt = toNumber(existingNotes[0]?.returned_amount);
    
    if (qtyKg + alreadyReturnedQty > toNumber(sale.quantity_kg)) {
      return res.status(400).json({ message: 'Total return quantity exceeds original sale quantity.' });
    }
    
    // 2. GST Logic Calculation
    const taxPercent = toNumber(sale.tax_percent);
    const taxableValue = Math.round((qtyKg * rate) * 100) / 100;
    const taxAmount = Math.round((taxableValue * (taxPercent / 100)) * 100) / 100;
    
    const stateStr = (sale.customer_state || 'West Bengal').trim();
    const isLocal = stateStr.toLowerCase() === 'west bengal';
    
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    if (isLocal) {
        cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
        sgstAmount = Math.round((taxAmount / 2) * 100) / 100;
        if (Math.abs((cgstAmount + sgstAmount) - taxAmount) > 0.001) {
            cgstAmount = Math.round((taxAmount - sgstAmount) * 100) / 100;
        }
    } else {
        igstAmount = taxAmount;
    }
    
    const totalAmount = Math.round((taxableValue + taxAmount) * 100) / 100;
    if (totalAmount + alreadyReturnedAmt > toNumber(sale.grand_total)) {
      return res.status(400).json({ message: 'Return amount exceeds original invoice amount.' });
    }

    const noteNo = `CN-${Date.now()}`;
    const noteDate = new Date().toISOString().split('T')[0];
    
    await ensureLedgers();
    
    // Insert Credit Note
    const result = await sql`
      INSERT INTO notes (
        note_no, note_type, note_date, ref_invoice_no, party_name, product_id, product_name,
        quantity_kg, rate_per_kg, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount, reason
      ) VALUES (
        ${noteNo}, 'Credit Note', ${noteDate}, ${refInvoiceNo}, ${sale.customer_name}, ${sale.product_id}, ${sale.variety + ' ' + sale.rice_type},
        ${qtyKg}, ${rate}, ${taxableValue}, ${cgstAmount}, ${sgstAmount}, ${igstAmount}, ${totalAmount}, ${reason}
      ) RETURNING *
    `;
    const note = result[0];
    
    // 3. Accounting Module Sync: Update Customer Ledger
    // Credit Customer (reduce receivable) -> Debit Sales Return
    const customerLedgers = await sql`SELECT id FROM ledgers WHERE name = ${sale.customer_name}`;
    const customerLedgerId = customerLedgers[0]?.id;
    const salesReturnLedgerId = (await sql`SELECT id FROM ledgers WHERE name = 'Sales Return Account'`)[0]?.id;
    const gstPayableLedgerId = (await sql`SELECT id FROM ledgers WHERE name = 'GST Payable'`)[0]?.id; // Reversing output GST
    
    if (customerLedgerId && salesReturnLedgerId) {
      await sql`
        INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
        VALUES (${noteDate}, 'Journal', ${noteNo}, ${salesReturnLedgerId}, ${customerLedgerId}, ${taxableValue}, ${'Sales Return for: ' + refInvoiceNo}, 'CREDIT_NOTE', ${noteNo})
      `;
      if (taxAmount > 0 && gstPayableLedgerId) {
        await sql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${noteDate}, 'Journal', ${noteNo + '-GST'}, ${gstPayableLedgerId}, ${customerLedgerId}, ${taxAmount}, ${'Reversal of Output GST: ' + refInvoiceNo}, 'CREDIT_NOTE', ${noteNo})
        `;
      }
    }
    
    // Reduce balance_due in sales
    await sql`
      UPDATE sales 
      SET balance_due = GREATEST(0, balance_due - ${totalAmount})
      WHERE invoice_no = ${refInvoiceNo}
    `;

    // Update Ledger current_balance
    await sql`
      UPDATE ledgers
      SET current_balance = (SELECT COALESCE(SUM(balance_due), 0) FROM sales WHERE customer_name = ${sale.customer_name})
      WHERE name = ${sale.customer_name}
    `;

    const updatedCustomerBalance = await sql`SELECT current_balance FROM ledgers WHERE name = ${sale.customer_name}`;

    // 4. Inventory Module Sync: Increment Stock
    const itemType = sale.sale_type && sale.sale_type.toLowerCase().includes('bran') ? 'by_product' : 'finished_rice';
    await updateStock(sql, itemType, sale.variety, sale.rice_type, sale.source_godown || 'Main Godown', 0, qtyKg, 'ADD');
    
    const stockResult = await sql`SELECT available_weight_kg FROM rice_stocks WHERE id = ${sale.product_id}`;
    
    res.status(201).json({
      message: 'Credit Note generated successfully.',
      note,
      updatedLedgerBalance: updatedCustomerBalance[0]?.current_balance || 0,
      updatedStockLevel: stockResult[0]?.available_weight_kg || 0
    });

  } catch (error) {
    console.error('Credit Note Error:', error);
    res.status(500).json({ message: 'Failed to create Credit Note', error: error.message });
  }
}

// Function to handle Debit Note (Purchase Return)
async function createDebitNote(req, res) {
  try {
    const { refInwardNo, returnQuantityKg, returnRatePerKg, reason } = req.body;
    
    // 1. Validation: Fetch Original Purchase Bill
    const purchases = await sql`SELECT * FROM paddy_inwards WHERE inward_no = ${refInwardNo}`;
    if (!purchases.length) {
      return res.status(404).json({ message: 'Original Purchase Bill not found.' });
    }
    const purchase = purchases[0];
    
    const qtyKg = toNumber(returnQuantityKg);
    const rate = toNumber(returnRatePerKg) || toNumber(purchase.rate_per_kg);
    if (qtyKg <= 0 || qtyKg > toNumber(purchase.net_weight_kg)) {
      return res.status(400).json({ message: 'Return quantity invalid or exceeds original purchase quantity.' });
    }
    
    // Check previous returns against this bill
    const existingNotes = await sql`SELECT SUM(quantity_kg) as returned_qty, SUM(total_amount) as returned_amount FROM notes WHERE ref_invoice_no = ${refInwardNo} AND note_type = 'Debit Note'`;
    const alreadyReturnedQty = toNumber(existingNotes[0]?.returned_qty);
    const alreadyReturnedAmt = toNumber(existingNotes[0]?.returned_amount);
    
    if (qtyKg + alreadyReturnedQty > toNumber(purchase.net_weight_kg)) {
      return res.status(400).json({ message: 'Total return quantity exceeds original purchase quantity.' });
    }
    
    // 2. GST Logic Calculation
    const gstRate = toNumber(purchase.gst_rate);
    const taxableValue = Math.round((qtyKg * rate) * 100) / 100;
    const taxAmount = Math.round((taxableValue * (gstRate / 100)) * 100) / 100;
    
    const totalAmount = Math.round((taxableValue + taxAmount) * 100) / 100;
    if (totalAmount + alreadyReturnedAmt > toNumber(purchase.payable_amount)) {
      return res.status(400).json({ message: 'Return amount exceeds original bill amount.' });
    }

    const noteNo = `DN-${Date.now()}`;
    const noteDate = new Date().toISOString().split('T')[0];
    
    await ensureLedgers();
    
    // Insert Debit Note
    const result = await sql`
      INSERT INTO notes (
        note_no, note_type, note_date, ref_invoice_no, party_name, product_name,
        quantity_kg, rate_per_kg, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount, reason
      ) VALUES (
        ${noteNo}, 'Debit Note', ${noteDate}, ${refInwardNo}, ${purchase.supplier_name}, ${purchase.paddy_variety},
        ${qtyKg}, ${rate}, ${taxableValue}, ${taxAmount/2}, ${taxAmount/2}, 0, ${totalAmount}, ${reason}
      ) RETURNING *
    `;
    const note = result[0];
    
    // 3. Accounting Module Sync: Update Supplier Ledger
    // Debit Supplier (reduce payable) -> Credit Purchase Return
    const supplierLedgers = await sql`SELECT id FROM ledgers WHERE name = ${purchase.supplier_name}`;
    const supplierLedgerId = supplierLedgers[0]?.id;
    const purchaseReturnLedgerId = (await sql`SELECT id FROM ledgers WHERE name = 'Purchase Return Account'`)[0]?.id;
    const gstReceivableLedgerId = (await sql`SELECT id FROM ledgers WHERE name = 'GST Receivable'`)[0]?.id; // Reversing input GST
    
    if (supplierLedgerId && purchaseReturnLedgerId) {
      await sql`
        INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
        VALUES (${noteDate}, 'Journal', ${noteNo}, ${supplierLedgerId}, ${purchaseReturnLedgerId}, ${taxableValue}, ${'Purchase Return for: ' + refInwardNo}, 'DEBIT_NOTE', ${noteNo})
      `;
      if (taxAmount > 0 && gstReceivableLedgerId) {
        await sql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${noteDate}, 'Journal', ${noteNo + '-GST'}, ${supplierLedgerId}, ${gstReceivableLedgerId}, ${taxAmount}, ${'Reversal of Input GST: ' + refInwardNo}, 'DEBIT_NOTE', ${noteNo})
        `;
      }
    }
    
    // Reduce balance_amount in paddy_inwards
    await sql`
      UPDATE paddy_inwards 
      SET balance_amount = GREATEST(0, balance_amount - ${totalAmount})
      WHERE inward_no = ${refInwardNo}
    `;

    // Update Ledger current_balance
    await sql`
      UPDATE ledgers
      SET current_balance = (SELECT COALESCE(SUM(balance_amount), 0) FROM paddy_inwards WHERE supplier_name = ${purchase.supplier_name})
      WHERE name = ${purchase.supplier_name}
    `;

    const updatedSupplierBalance = await sql`SELECT current_balance FROM ledgers WHERE name = ${purchase.supplier_name}`;

    // 4. Inventory Module Sync: Decrement Stock
    await updateStock(sql, 'paddy', purchase.paddy_variety, 'Raw Paddy', purchase.godown || 'Main Godown', 0, qtyKg, 'REMOVE');
    
    const stockResult = await sql`SELECT available_weight_kg FROM rice_stocks WHERE item_type = 'paddy' AND variety = ${purchase.paddy_variety} AND rice_type = 'Raw Paddy' AND godown = ${purchase.godown || 'Main Godown'}`;
    
    res.status(201).json({
      message: 'Debit Note generated successfully.',
      note,
      updatedLedgerBalance: updatedSupplierBalance[0]?.current_balance || 0,
      updatedStockLevel: stockResult[0]?.available_weight_kg || 0
    });

  } catch (error) {
    console.error('Debit Note Error:', error);
    res.status(500).json({ message: 'Failed to create Debit Note', error: error.message });
  }
}

async function listNotes(req, res) {
  try {
    const { noteType } = req.query;
    let notes;
    if (noteType) {
      notes = await sql`SELECT * FROM notes WHERE note_type = ${noteType} ORDER BY created_at DESC`;
    } else {
      notes = await sql`SELECT * FROM notes ORDER BY created_at DESC`;
    }
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load notes', error: error.message });
  }
}

module.exports = { createCreditNote, createDebitNote, listNotes };
