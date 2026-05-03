const sql = require('../config/db');
const { moveStock, updateStock } = require('../services/stockService');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// Sync farmer's ledger balance from sum of all paddy_inwards balance_amount
async function syncFarmerBalance(farmerName) {
  if (!farmerName) return;
  await sql`
    UPDATE ledgers 
    SET current_balance = (
      SELECT COALESCE(SUM(balance_amount), 0) 
      FROM paddy_inwards 
      WHERE supplier_name = ${farmerName}
    )
    WHERE name = ${farmerName}
  `;
}

async function createPaddyInward(req, res) {
  try {
    const body = req.body || {};
    const grossWeightKg = toNumber(body.grossWeightKg);
    const tareWeightKg = toNumber(body.tareWeightKg);
    const netWeightKg = Math.max(grossWeightKg - tareWeightKg, 0);
    const ratePerKg = toNumber(body.ratePerKg);
    const rawTotal = netWeightKg * ratePerKg;
    const gstRate = toNumber(body.gstRate);
    const gstAmount = (rawTotal * gstRate) / 100;
    const deductions = toNumber(body.deductions);
    const totalAmount = rawTotal + gstAmount - deductions;
    const payableAmount = Math.max(0, totalAmount);
    const advancePaid = toNumber(body.advancePaid);
    const balanceAmount = payableAmount - advancePaid;
    const entryDate = body.entryDate || new Date().toISOString().split('T')[0];
    const entryTime = body.entryTime || new Date().toLocaleTimeString();
    const inwardNo = body.inwardNo || `INW-${Date.now()}`;
    const cashBankName = (body.paymentMode || '').toLowerCase().includes('bank') ? 'SBI - Main Account' : 'Cash in Hand';

    // Atomic Transaction using our sql.begin helper
    const result = await sql.begin(async txSql => {
      // 0. Overdraft Check for Advance
      if (advancePaid > 0) {
        const balRes = await txSql`SELECT current_balance FROM ledgers WHERE name ILIKE ${cashBankName}`;
        const currentBal = Number(balRes[0]?.current_balance || 0);
        if (advancePaid > currentBal) {
          throw new Error(`Insufficient Funds: Cannot pay ₹${advancePaid} from ${cashBankName}`);
        }
      }

      // 1. Insert Paddy Inward
      const inwardResult = await txSql`
        INSERT INTO paddy_inwards (
          entry_date, entry_time, inward_no, supplier_name, contact_number, village,
          paddy_variety, gross_weight_kg, tare_weight_kg, net_weight_kg,
          number_of_bags, bag_weight_kg, moisture_percent, broken_percent, impurity_percent,
          rate_per_kg, total_amount, deductions, payable_amount,
          payment_mode, advance_paid, balance_amount,
          vehicle_number, driver_name, transport_charges,
          godown, lot_number, stack_number, remarks,
          gst_rate, gst_amount
        ) VALUES (
          ${entryDate}, ${entryTime}, ${inwardNo}, ${body.supplierName}, ${body.contactNumber}, ${body.village}, 
          ${body.paddyVariety}, ${grossWeightKg}, ${tareWeightKg}, ${netWeightKg}, 
          ${toNumber(body.numberOfBags)}, ${toNumber(body.bagWeightKg)}, ${toNumber(body.moisturePercent)}, 
          ${toNumber(body.brokenPercent)}, ${toNumber(body.impurityPercent)}, ${ratePerKg}, ${totalAmount}, 
          ${deductions}, ${payableAmount}, ${body.paymentMode}, ${advancePaid}, ${balanceAmount}, 
          ${body.vehicleNumber}, ${body.driverName}, ${toNumber(body.transportCharges)}, ${body.godown}, 
          ${body.lotNumber}, ${body.stackNumber}, ${body.remarks}, ${gstRate}, ${gstAmount}
        ) 
        RETURNING *
      `;

      // 2. Accounting Legs
      // Fetch Party to get ledger_id
      const party = await txSql`SELECT ledger_id FROM parties WHERE name = ${body.supplierName} AND (mobile_number = ${body.contactNumber} OR mobile_number IS NULL) LIMIT 1`;
      let vendorId = party[0]?.ledger_id;

      if (!vendorId) {
        // Fallback: Create/Get ledger by Name - Mobile format
        const ledgerName = body.contactNumber ? `${body.supplierName} - ${body.contactNumber}` : body.supplierName;
        const existingLedger = await txSql`SELECT id FROM ledgers WHERE name ILIKE ${ledgerName}`;
        if (existingLedger.length > 0) {
          vendorId = existingLedger[0].id;
        } else {
          const newLedger = await txSql`
            INSERT INTO ledgers (name, group_name) 
            VALUES (${ledgerName}, 'Creditors') 
            RETURNING id
          `;
          vendorId = newLedger[0].id;
        }
      }

      // Get other Ledger IDs
      const ledgers = await txSql`
        SELECT id, name FROM ledgers 
        WHERE name ILIKE ${'Paddy Purchase A/C'} 
           OR name ILIKE ${'Input GST A/C'} 
           OR name ILIKE ${'Deductions & Commission A/C'} 
           OR name ILIKE ${cashBankName}
      `;
      const getId = (name) => ledgers.find(l => l.name.toLowerCase() === name.toLowerCase())?.id;

      const purchaseId = getId('Paddy Purchase A/C');
      const gstId      = getId('Input GST A/C');
      const dedId      = getId('Deductions & Commission A/C');
      const cashId     = getId(cashBankName);

      // Leg A: Purchase (Debit Purchase A/C, Credit Vendor)
      if (rawTotal > 0 && purchaseId && vendorId) {
        await txSql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${entryDate}, 'Journal', ${'PUR-' + inwardNo}, ${purchaseId}, ${vendorId}, ${rawTotal}, ${`Paddy Purchase: ${inwardNo}`}, 'PURCHASE', ${inwardNo})
        `;
      }

      // Leg B: GST (Debit Input GST A/C, Credit Vendor)
      if (gstAmount > 0 && gstId && vendorId) {
        await txSql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${entryDate}, 'Journal', ${'GST-' + inwardNo}, ${gstId}, ${vendorId}, ${gstAmount}, ${`Input GST: ${inwardNo}`}, 'PURCHASE', ${inwardNo})
        `;
      }

      // Leg C: Deductions (Debit Vendor, Credit Deductions A/C)
      if (deductions > 0 && vendorId && dedId) {
        await txSql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${entryDate}, 'Journal', ${'DED-' + inwardNo}, ${vendorId}, ${dedId}, ${deductions}, ${`Deductions: ${inwardNo}`}, 'PURCHASE', ${inwardNo})
        `;
      }

      // Leg D: Payment (Debit Vendor, Credit Cash/Bank)
      if (advancePaid > 0 && vendorId && cashId) {
        await txSql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${entryDate}, 'Payment', ${'PAY-' + inwardNo}, ${vendorId}, ${cashId}, ${advancePaid}, ${`Advance Paid: ${inwardNo}`}, 'PURCHASE', ${inwardNo})
        `;
        
        // Update Asset Balance
        await txSql`UPDATE ledgers SET current_balance = current_balance - ${advancePaid} WHERE id = ${cashId}`;
      }

      // Update Vendor Balance
      if (vendorId) {
        await txSql`UPDATE ledgers SET current_balance = current_balance + ${balanceAmount} WHERE id = ${vendorId}`;
      }

      // 3. Stock Movement
      await updateStock(txSql, 'paddy', body.paddyVariety, 'Raw Paddy', body.godown, toNumber(body.numberOfBags), netWeightKg, 'ADD');

      return inwardResult[0];
    });

    res.status(201).json({ inward: result, message: 'Paddy inward and accounting synced successfully.' });
  } catch (error) {
    console.error('Paddy Sync Error:', error);
    res.status(error.message.includes('Insufficient Funds') ? 400 : 500).json({ 
      message: 'Failed to sync paddy inward.', 
      error: error.message 
    });
  }
}

async function getPaddyInwards(req, res) {
  try {
    const { page, limit, search, variety } = req.query;
    let baseQuery = `
      SELECT 
        p.id, 
        p.entry_date as "entryDate", 
        p.entry_time as "entryTime", 
        p.inward_no as "inwardNo", 
        p.supplier_name as "supplierName", 
        p.contact_number as "contactNumber", 
        p.village, 
        p.paddy_variety as "paddyVariety", 
        p.gross_weight_kg as "grossWeightKg", 
        p.tare_weight_kg as "tareWeightKg", 
        p.net_weight_kg as "netWeightKg",
        (p.net_weight_kg - COALESCE((
          SELECT SUM(input_weight_kg) 
          FROM cleaning_batches 
          WHERE TRIM(inward_ref) = TRIM(p.inward_no)
        ), 0)) as "availableWeightKg",
        p.number_of_bags as "numberOfBags", 
        p.bag_weight_kg as "bagWeightKg", 
        p.moisture_percent as "moisturePercent", 
        p.broken_percent as "brokenPercent", 
        p.impurity_percent as "impurityPercent", 
        p.rate_per_kg as "ratePerKg", 
        p.total_amount as "totalAmount",
        p.deductions,
        p.payable_amount as "payableAmount", 
        p.payment_mode as "paymentMode",
        p.advance_paid as "advancePaid",
        p.balance_amount as "balanceAmount", 
        p.vehicle_number as "vehicleNumber",
        p.driver_name as "driverName",
        p.transport_charges as "transportCharges",
        p.godown,
        p.lot_number as "lotNumber",
        p.stack_number as "stackNumber",
        p.remarks,
        p.created_at as "createdAt"
      FROM paddy_inwards p
    `;

    let whereClauses = [];
    let queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(p.supplier_name ILIKE $${queryParams.length} OR p.inward_no ILIKE $${queryParams.length} OR p.paddy_variety ILIKE $${queryParams.length})`);
    }
    
    if (variety && variety !== 'All Varieties') {
      queryParams.push(variety);
      whereClauses.push(`p.paddy_variety = $${queryParams.length}`);
    }

    let whereString = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    let orderByString = ` ORDER BY p.entry_date DESC, p.created_at DESC`;

    const countQuery = `SELECT COUNT(*) as count FROM paddy_inwards p${whereString}`;
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

    const data = await sql(`${baseQuery}${whereString}${orderByString}`, ...queryParams);
    res.json(data);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ message: 'Failed to load paddy inwards', error: error.message });
  }
}

async function updatePaddyInward(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const grossWeightKg = toNumber(body.grossWeightKg);
    const tareWeightKg = toNumber(body.tareWeightKg);
    const netWeightKg = body.netWeightKg !== undefined && body.netWeightKg !== '' ? toNumber(body.netWeightKg) : Math.max(grossWeightKg - tareWeightKg, 0);

    const ratePerKg = toNumber(body.ratePerKg);
    const rawTotal = netWeightKg * ratePerKg;
    const gstRate = toNumber(body.gstRate);
    const gstAmount = (rawTotal * gstRate) / 100;

    const deductions = toNumber(body.deductions);
    const totalAmount = Math.max(0, rawTotal + gstAmount - deductions);
    
    // ✅ BUG #7 FIX: Clamp payable at 0 in update as well.
    const payableAmount = totalAmount;

    const advancePaid = toNumber(body.advancePaid);
    const balanceAmount = payableAmount - advancePaid;

    // Step 1: Fetch old record (needed for stock delta)
    const old = await sql`SELECT * FROM paddy_inwards WHERE id = ${id}`;
    if (!old.length) return res.status(404).json({ message: 'Paddy inward entry not found' });
    const oldRecord = old[0];

    // Step 2: Update the paddy inward DB record
    const result = await sql`
      UPDATE paddy_inwards SET
        entry_date = ${body.entryDate},
        entry_time = ${body.entryTime},
        supplier_name = ${body.supplierName},
        contact_number = ${body.contactNumber},
        village = ${body.village},
        paddy_variety = ${body.paddyVariety},
        gross_weight_kg = ${grossWeightKg},
        tare_weight_kg = ${tareWeightKg},
        net_weight_kg = ${netWeightKg},
        number_of_bags = ${toNumber(body.numberOfBags)},
        bag_weight_kg = ${toNumber(body.bagWeightKg)},
        moisture_percent = ${toNumber(body.moisturePercent)},
        broken_percent = ${toNumber(body.brokenPercent)},
        impurity_percent = ${toNumber(body.impurityPercent)},
        rate_per_kg = ${ratePerKg},
        total_amount = ${totalAmount},
        deductions = ${deductions},
        payable_amount = ${payableAmount},
        payment_mode = ${body.paymentMode},
        advance_paid = ${advancePaid},
        balance_amount = ${balanceAmount},
        vehicle_number = ${body.vehicleNumber},
        driver_name = ${body.driverName},
        transport_charges = ${toNumber(body.transportCharges)},
        godown = ${body.godown},
        lot_number = ${body.lotNumber},
        stack_number = ${body.stackNumber},
        remarks = ${body.remarks},
        gst_rate = ${gstRate},
        gst_amount = ${gstAmount}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Paddy inward entry not found' });
    }

    // Step 3: Adjust stock — reverse old, apply new
    // REMOVE old stock first; soft-fail silently because old entry may not have a stock row
    // (e.g. records created before this feature was live)
    try {
      const oldNetKg  = toNumber(oldRecord.net_weight_kg);
      const oldGodown  = oldRecord.godown || 'Main Godown';
      const oldVariety = oldRecord.paddy_variety;
      const oldBags    = toNumber(oldRecord.number_of_bags);
      await updateStock(sql, 'paddy', oldVariety, 'Raw Paddy', oldGodown, oldBags, oldNetKg, 'REMOVE');
    } catch (removeErr) {
      console.warn('[updatePaddyInward] Could not reverse old stock (proceeding):', removeErr.message);
    }
    // ADD new stock values
    await updateStock(sql, 'paddy', body.paddyVariety, 'Raw Paddy', body.godown || 'Main Godown', toNumber(body.numberOfBags), netWeightKg, 'ADD');

    // Step 3: Sync Farmer Ledger Balance
    console.log('[createPaddyInward] Syncing farmer balance for:', body.supplierName);
    await syncFarmerBalance(body.supplierName);

    console.log('[createPaddyInward] Query result:', JSON.stringify(result));

    if (!result || !result.length) {
      console.error('[createPaddyInward] ERROR: No result returned from database.');
      throw new Error('Database insertion succeeded but returned no data.');
    }

    // Map result to camelCase for frontend
    const inward = {
      ...result[0],
      entryDate: result[0].entry_date,
      netWeightKg: result[0].net_weight_kg,
      payableAmount: result[0].payable_amount,
      balanceAmount: result[0].balance_amount
    };

    res.json({ inward, message: 'Paddy Inward updated successfully.' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ message: 'Failed to update paddy inward', error: error.message });
  }
}

async function processPayment(req, res) {
  try {
    const { farmerName, amount, paymentMode, date, note } = req.body;
    const paymentAmt = Number(amount);

    if (!farmerName || !paymentAmt || paymentAmt <= 0) {
      return res.status(400).json({ message: 'farmerName and a positive amount are required.' });
    }

    // ✅ BUG #3 FIX: Calculate total outstanding before applying payment.
    // Block overpayment that would push balance_amount into negative territory.
    const unpaidInwards = await sql`
      SELECT * FROM paddy_inwards
      WHERE supplier_name = ${farmerName} AND balance_amount > 0
      ORDER BY entry_date ASC
    `;

    const totalDue = unpaidInwards.reduce((sum, i) => sum + Number(i.balance_amount), 0);

    if (paymentAmt > totalDue && totalDue > 0) {
      return res.status(400).json({
        message: `Payment ₹${paymentAmt} exceeds total outstanding balance ₹${totalDue.toFixed(2)} for ${farmerName}.`,
      });
    }
    if (totalDue <= 0 && unpaidInwards.length === 0) {
      return res.status(400).json({ message: `No outstanding balance found for ${farmerName}.` });
    }

    let paymentLeft = paymentAmt;

    for (const inward of unpaidInwards) {
      if (paymentLeft <= 0) break;
      const due = Number(inward.balance_amount);
      const applyAmt = Math.min(due, paymentLeft);
      paymentLeft -= applyAmt;

      const newAdvancePaid = Number(inward.advance_paid) + applyAmt;
      const newBalance = due - applyAmt;

      await sql`
        UPDATE paddy_inwards
        SET advance_paid = ${newAdvancePaid}, balance_amount = ${newBalance}
        WHERE id = ${inward.id}
      `;
    }

    await sql`
      UPDATE ledgers 
      SET current_balance = (SELECT COALESCE(SUM(balance_amount), 0) FROM paddy_inwards WHERE supplier_name = ${farmerName})
      WHERE name = ${farmerName}
    `;
    await syncFarmerBalance(farmerName);

    const voucher_no = `VCH-PAY-${Date.now()}`;
    const credit_ledger_id = paymentMode === 'bank' || paymentMode === 'cheque' ? (await sql`SELECT id FROM ledgers WHERE name = 'SBI - Main Account'`)[0]?.id : (await sql`SELECT id FROM ledgers WHERE name = 'Cash in Hand'`)[0]?.id;
    const debit_ledger_id = (await sql`SELECT id FROM ledgers WHERE name = ${farmerName}`)[0]?.id;

    if (debit_ledger_id && credit_ledger_id) {
       await sql`
         INSERT INTO transactions (
           transaction_date, voucher_type, voucher_no, debit_ledger_id, 
           credit_ledger_id, amount, narration, ref_module
         ) VALUES (
           ${date || new Date().toISOString().split('T')[0]}, 'Payment', ${voucher_no}, ${debit_ledger_id}, 
           ${credit_ledger_id}, ${amount}, ${note || `Payment to ${farmerName} - ₹${amount}`}, 'PaddyPurchase'
         )
       `;
    }
    res.json({ message: 'Payment processed successfully' });
  } catch (error) {
    console.error('Payment Processing Error:', error);
    res.status(500).json({ message: 'Failed to process payment', error: error.message });
  }
}

async function resyncAllFarmerBalances(req, res) {
  try {
    // Bulk update all farmer ledger balances in one query
    await sql`
      UPDATE ledgers
      SET current_balance = (
        SELECT COALESCE(SUM(pi.balance_amount), 0)
        FROM paddy_inwards pi
        WHERE pi.supplier_name = ledgers.name
      )
      WHERE group_name = 'Creditors'
         OR name IN (SELECT DISTINCT supplier_name FROM paddy_inwards)
    `;
    console.log('[resyncAllFarmerBalances] All farmer balances resynced');
    res.json({ message: 'All farmer balances resynced successfully' });
  } catch (error) {
    console.error('Resync error:', error);
    res.status(500).json({ message: 'Resync failed', error: error.message });
  }
}

async function deletePaddyInward(req, res) {
  try {
    const { id } = req.params;
    
    // Get the inward details to sync balances later
    const inward = await sql`SELECT inward_no, supplier_name FROM paddy_inwards WHERE id = ${id}`;
    if (inward.length === 0) {
      return res.status(404).json({ message: 'Paddy inward entry not found' });
    }
    const { inward_no, supplier_name } = inward[0];
    
    // Check if cleaning batches exist for this inward
    const cleaningBatches = await sql`SELECT id FROM cleaning_batches WHERE TRIM(inward_ref) = TRIM(${inward_no})`;
    if (cleaningBatches.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete: This inward has already been used in ${cleaningBatches.length} cleaning batch(es). Please delete the cleaning records first.` 
      });
    }

    // Get full record for stock reversal
    const fullRecord = await sql`SELECT * FROM paddy_inwards WHERE id = ${id}`;
    const rec = fullRecord[0];
    // Stock operations (sequential - Neon HTTP doesn't support transactions)
      // Reverse Paddy from Godown Stock
      await updateStock(sql, 'paddy', rec.paddy_variety, 'Raw Paddy', rec.godown || 'Main Godown', toNumber(rec.number_of_bags), toNumber(rec.net_weight_kg), 'REMOVE');

      // Delete related transactions (Purchase and Advance Payment)
      await sql`DELETE FROM transactions WHERE ref_module = 'PURCHASE' AND ref_id = ${inward_no}`;

      // Delete the actual paddy inward record
      await sql`DELETE FROM paddy_inwards WHERE id = ${id}`;

    // Sync Farmer Ledger Balance
    await syncFarmerBalance(supplier_name);

    res.json({ message: 'Paddy Inward deleted successfully' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ message: 'Failed to delete paddy inward entry', error: error.message });
  }
}

async function getStats(req, res) {
  try {
    const todayResult = await sql`SELECT SUM(net_weight_kg) as sum FROM paddy_inwards WHERE entry_date = CURRENT_DATE`;
    const weekResult = await sql`SELECT SUM(net_weight_kg) as sum FROM paddy_inwards WHERE entry_date >= date_trunc('week', CURRENT_DATE)`;
    const monthResult = await sql`SELECT SUM(net_weight_kg) as sum FROM paddy_inwards WHERE entry_date >= date_trunc('month', CURRENT_DATE)`;
    const suppliersResult = await sql`SELECT COUNT(DISTINCT supplier_name) as count FROM paddy_inwards`;
    
    res.json({
      today: parseFloat(todayResult[0]?.sum || 0),
      week: parseFloat(weekResult[0]?.sum || 0),
      month: parseFloat(monthResult[0]?.sum || 0),
      suppliers: parseInt(suppliersResult[0]?.count || 0)
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createPaddyInward,
  getPaddyInwards,
  updatePaddyInward,
  processPayment,
  resyncAllFarmerBalances,
  deletePaddyInward,
  getStats
};
