const sql = require('../config/db');
const { moveStock, updateStock } = require('../services/stockService');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function createCleaning(req, res) {
  const client = await sql.pool.connect();
  try {
    const body = req.body || {};
    const inputWeightKg  = toNumber(body.rawPaddyInputKg);
    const cleanOutputKg  = toNumber(body.cleanPaddyOutputKg);
    const stonesKg       = toNumber(body.stonesKg);
    const dustKg         = toNumber(body.dustKg);
    const strawKg        = toNumber(body.strawKg);
    const otherWasteKg   = toNumber(body.otherWasteKg);
    const labourCost     = toNumber(body.labourCost);
    const powerCost      = toNumber(body.powerCost);

    const totalWasteKg      = stonesKg + dustKg + strawKg + otherWasteKg;
    const maxPossibleOutput = inputWeightKg - totalWasteKg;

    if (cleanOutputKg > maxPossibleOutput) {
      return res.status(400).json({
        message: `Logic Error: Clean Output (${cleanOutputKg}kg) cannot exceed (Input - Waste) which is ${maxPossibleOutput}kg.`
      });
    }

    await client.query('BEGIN');

    // 1. Insert the cleaning batch record
    const wastePercent      = inputWeightKg > 0 ? (totalWasteKg / inputWeightKg) * 100 : 0;
    const efficiencyPercent = inputWeightKg > 0 ? (cleanOutputKg / inputWeightKg) * 100 : 0;
    const isRecleaningNeeded = body.readyForMilling === 'No - Needs Re-cleaning';
    const batchStatus = isRecleaningNeeded ? 'requires_recleaning' : 'completed';

    const insertResult = await client.query(`
      INSERT INTO cleaning_batches (
        process_date, shift, inward_ref, paddy_variety, source_godown,
        input_weight_kg, input_bags, pre_cleaning_moisture_percent,
        stones_kg, dust_kg, straw_kg, other_waste_kg, total_waste_kg, waste_percent,
        clean_output_kg, output_bags, post_cleaning_moisture_percent,
        destination_godown, destination_stack, efficiency_percent,
        ready_for_milling, impurity_after_percent, labour_count,
        labour_cost, power_consumption, remarks, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
      RETURNING *`,
      [body.processDate, body.shift, body.inwardRef, body.paddyVariety, body.sourceGodown, inputWeightKg, toNumber(body.inputBags), toNumber(body.preCleaningMoisturePercent), stonesKg, dustKg, strawKg, otherWasteKg, totalWasteKg, wastePercent, cleanOutputKg, toNumber(body.outputBags), toNumber(body.postCleaningMoisturePercent), body.destinationGodown, body.destinationStack, efficiencyPercent, body.readyForMilling, toNumber(body.impurityAfter), toNumber(body.labourCount), labourCost, powerCost, body.remarks, batchStatus]
    );
    const savedResult = insertResult.rows[0];

    // 2. Process Costing Sync (Accounting)
    const getId = async (name) => (await client.query('SELECT id FROM ledgers WHERE name = $1', [name])).rows[0]?.id;
    const labourLedgerId = await getId('Direct Labour - Cleaning');
    const powerLedgerId  = await getId('Electricity/Fuel Expense');
    const cashLedgerId   = await getId('Cash in Hand');

    if (labourCost > 0) {
      await client.query(`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
        VALUES ($1, 'Payment', $2, $3, $4, $5, $6, 'CLEANING', $7)`,
        [body.processDate, 'LAB-' + savedResult.id, labourLedgerId, cashLedgerId, labourCost, `Labour Wages: Cleaning Batch ${savedResult.id}`, savedResult.id]);
      await client.query('UPDATE ledgers SET current_balance = current_balance - $1 WHERE id = $2', [labourCost, cashLedgerId]);
    }
    if (powerCost > 0) {
      await client.query(`INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
        VALUES ($1, 'Payment', $2, $3, $4, $5, $6, 'CLEANING', $7)`,
        [body.processDate, 'PWR-' + savedResult.id, powerLedgerId, cashLedgerId, powerCost, `Power Expense: Cleaning Batch ${savedResult.id}`, savedResult.id]);
      await client.query('UPDATE ledgers SET current_balance = current_balance - $1 WHERE id = $2', [powerCost, cashLedgerId]);
    }

    // 3. Stock Movements
    const srcGodown = body.sourceGodown || 'Main Godown';
    const dstGodown = body.destinationGodown || 'Processing Tank';
    
    if (body.inputType === 'Re-clean') {
      await updateStock(client, 'paddy', body.paddyVariety, 'Raw Paddy', srcGodown, toNumber(body.inputBags), inputWeightKg, 'REMOVE', true, body.inwardRef);
    } else {
      await moveStock(client, srcGodown, 'Processing Tank', 'paddy', body.paddyVariety, 'Raw Paddy', inputWeightKg, toNumber(body.inputBags), 'CLEANING', 'Paddy moved for sorting');
    }
    
    if (isRecleaningNeeded) {
      await updateStock(client, 'paddy', body.paddyVariety, 'Raw Paddy', dstGodown, toNumber(body.outputBags), cleanOutputKg, 'ADD', true, body.inwardRef);
    } else {
      await updateStock(client, 'paddy', body.paddyVariety, 'Cleaned Paddy', dstGodown, toNumber(body.outputBags), cleanOutputKg, 'ADD', false);
    }

    await client.query('COMMIT');
    res.status(201).json({ cleaning: savedResult, message: 'Cleaning batch and accounting synced successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cleaning Sync Error:', error);
    res.status(500).json({ message: 'Failed to sync cleaning batch.', error: error.message });
  } finally {
    client.release();
  }
}

async function listCleaning(req, res) {
  try {
    const { page, limit, search, variety } = req.query;

    let baseQuery = `
      SELECT 
        *,
        (clean_output_kg - COALESCE((
          SELECT SUM(paddy_input_kg) 
          FROM productions 
          WHERE cleaning_batch_ref = cleaning_batches.id::text OR cleaning_batch_ref = cleaning_batches.inward_ref
        ), 0)) as "available_kg"
      FROM cleaning_batches
    `;

    let whereClauses = [];
    let queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(inward_ref ILIKE $${queryParams.length} OR paddy_variety ILIKE $${queryParams.length})`);
    }
    
    if (variety && variety !== 'All Varieties') {
      queryParams.push(variety);
      whereClauses.push(`paddy_variety = $${queryParams.length}`);
    }

    let whereString = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    let orderByString = ` ORDER BY created_at DESC`;

    const countQuery = `SELECT COUNT(*) as count FROM cleaning_batches${whereString}`;
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
    res.status(500).json({ message: 'Failed to load cleaning entries.' });
  }
}

// ✅ C-5 FIX: updateCleaning now validates new input against available paddy,
// using a delta approach that excludes this batch's OWN old contribution.
async function updateCleaning(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const inputWeightKg     = toNumber(body.rawPaddyInputKg);
    const cleanOutputKg     = toNumber(body.cleanPaddyOutputKg);
    const stonesKg          = toNumber(body.stonesKg);
    const dustKg            = toNumber(body.dustKg);
    const strawKg           = toNumber(body.strawKg);
    const otherWasteKg      = toNumber(body.otherWasteKg);
    const totalWasteKg      = stonesKg + dustKg + strawKg + otherWasteKg;
    const wastePercent      = inputWeightKg > 0 ? (totalWasteKg / inputWeightKg) * 100 : 0;
    const efficiencyPercent = inputWeightKg > 0 ? (cleanOutputKg / inputWeightKg) * 100 : 0;

    // Determine the inward_ref to validate against
    const inwardRef = body.inwardRef;

    if (inwardRef) {
      // Available = net_weight - sum of ALL OTHER batches for this inward (excluding self)
      const availRows = await sql`
        SELECT
          p.net_weight_kg,
          COALESCE((
            SELECT SUM(cb2.input_weight_kg)
            FROM cleaning_batches cb2
            WHERE TRIM(cb2.inward_ref) = TRIM(${inwardRef})
              AND cb2.id != ${id}
          ), 0) AS other_batches_kg
        FROM paddy_inwards p
        WHERE TRIM(p.inward_no) = TRIM(${inwardRef})
        LIMIT 1
      `;

      if (!availRows.length) {
        return res.status(400).json({ message: `Inward reference '${inwardRef}' not found.` });
      }

      const availableForThisBatch =
        toNumber(availRows[0].net_weight_kg) - toNumber(availRows[0].other_batches_kg);

      if (inputWeightKg > availableForThisBatch) {
        return res.status(400).json({
          message: `Cannot update: only ${availableForThisBatch.toFixed(2)} kg available for inward '${inwardRef}' (excluding other batches). Requested: ${inputWeightKg} kg.`,
        });
      }
    }

    const result = await sql`
      UPDATE cleaning_batches SET
        process_date                  = ${body.processDate},
        shift                         = ${body.shift},
        inward_ref                    = ${inwardRef},
        paddy_variety                 = ${body.paddyVariety},
        source_godown                 = ${body.sourceGodown},
        input_weight_kg               = ${inputWeightKg},
        input_bags                    = ${toNumber(body.inputBags)},
        pre_cleaning_moisture_percent = ${toNumber(body.preCleaningMoisturePercent)},
        stones_kg                     = ${stonesKg},
        dust_kg                       = ${dustKg},
        straw_kg                      = ${strawKg},
        other_waste_kg                = ${otherWasteKg},
        total_waste_kg                = ${totalWasteKg},
        waste_percent                 = ${wastePercent},
        clean_output_kg               = ${cleanOutputKg},
        output_bags                   = ${toNumber(body.outputBags)},
        post_cleaning_moisture_percent= ${toNumber(body.postCleaningMoisturePercent)},
        destination_godown            = ${body.destinationGodown},
        destination_stack             = ${body.destinationStack},
        efficiency_percent            = ${efficiencyPercent},
        ready_for_milling             = ${body.readyForMilling},
        impurity_after_percent        = ${toNumber(body.impurityAfter)},
        labour_count                  = ${toNumber(body.labourCount)},
        labour_cost                   = ${toNumber(body.labourCost)},
        power_consumption             = ${toNumber(body.powerConsumption)},
        remarks                       = ${body.remarks}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) return res.status(404).json({ message: 'Cleaning record not found' });
    res.json({ cleaning: result[0], message: 'Cleaning record updated successfully.' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ message: 'Failed to update cleaning entry.' });
  }
}

async function deleteCleaning(req, res) {
  try {
    const { id } = req.params;

    // Check if any production records use this cleaning batch
    // Cleaning batches are referenced either by their ID or by their inward_ref
    const cleaningBatch = await sql`SELECT inward_ref FROM cleaning_batches WHERE id = ${id}`;
    if (cleaningBatch.length === 0) return res.status(404).json({ message: 'Cleaning record not found' });
    
    const inwardRef = cleaningBatch[0].inward_ref;
    const productionRecords = await sql`
      SELECT id FROM productions 
      WHERE TRIM(cleaning_batch_ref) = TRIM(${id}) 
         OR (${inwardRef} IS NOT NULL AND TRIM(cleaning_batch_ref) = TRIM(${inwardRef}))
    `;

    if (productionRecords.length > 0) {
      return res.status(400).json({
        message: `Cannot delete: This cleaning batch has already been used in ${productionRecords.length} production batch(es). Please delete the production records first.`
      });
    }
    // Stock operations (sequential - Neon HTTP doesn't support transactions)
      await sql`DELETE FROM cleaning_batches WHERE id = ${id}`;

      // Reverse the stock transfer
      const srcGodown = cleaningBatch[0].source_godown || 'Main Godown';
      const dstGodown = cleaningBatch[0].destination_godown || 'Processing Tank';
      const variety = cleaningBatch[0].paddy_variety;
      const inputKg = toNumber(cleaningBatch[0].input_weight_kg);
      const cleanKg = toNumber(cleaningBatch[0].clean_output_kg);
      const inputBags = toNumber(cleaningBatch[0].input_bags);
      const outputBags = toNumber(cleaningBatch[0].output_bags);

      // Return the cleaned paddy back to source, remove from process tank
      await updateStock(sql, 'paddy', variety, 'Cleaned Paddy', dstGodown, outputBags, cleanKg, 'REMOVE');
      await updateStock(sql, 'paddy', variety, 'Raw Paddy', srcGodown, inputBags, inputKg, 'ADD');

    res.json({ message: 'Cleaning record deleted successfully.' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ message: 'Failed to delete cleaning entry.' });
  }
}

module.exports = {
  createCleaning,
  listCleaning,
  updateCleaning,
  deleteCleaning,
};
