const sql = require('../config/db');
const { moveStock, updateStock } = require('../services/stockService');

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function createProduction(req, res) {
  try {
    const body = req.body || {};
    const paddyInputKg       = toNumber(body.paddyInputKg);
    const totalRiceOutputKg  = toNumber(body.totalRiceOutputKg);
    const premiumRiceKg      = toNumber(body.premiumRiceKg);
    const gradeARiceKg       = toNumber(body.gradeARiceKg);
    const gradeBRiceKg       = toNumber(body.gradeBRiceKg);
    const brokenRiceKg       = toNumber(body.brokenRiceKg);
    const riceBags           = toNumber(body.riceBags);
    const bagWeightKg        = toNumber(body.bagWeightKg);
    const branKg             = toNumber(body.branKg);
    const huskKg             = toNumber(body.huskKg);
    const otherWasteKg       = toNumber(body.otherWasteKg);
    const totalByProductsKg  = branKg + huskKg + otherWasteKg;

    if ((totalRiceOutputKg + totalByProductsKg) > paddyInputKg) {
      return res.status(400).json({ message: `Logic Error: Total Output cannot exceed Input.` });
    }

    const riceYieldPercent = paddyInputKg > 0 ? (totalRiceOutputKg / paddyInputKg) * 100 : 0;

    const result = await sql.begin(async txSql => {
      // 1. Insert Production Record
      const inserted = await txSql`
        INSERT INTO productions (
          process_date, production_no, shift, cleaning_batch_ref,
          paddy_variety, rice_type, paddy_input_kg, input_bags,
          input_moisture_percent, machine, polisher, grader,
          operator_name, start_time, end_time, premium_rice_kg,
          grade_a_rice_kg, grade_b_rice_kg, broken_rice_kg,
          bran_kg, husk_kg, other_waste_kg, rice_storage_godown, input_godown,
          rice_bags, bag_weight_kg, labour_count, labour_cost,
          power_consumption, yield_percent, remarks
        ) VALUES (
          ${body.processDate}, ${body.productionNo}, ${body.shift}, ${body.cleaningBatchRef}, 
          ${body.paddyVariety}, ${body.riceType}, ${paddyInputKg}, ${toNumber(body.inputBags)}, 
          ${toNumber(body.inputMoisturePercent)}, ${body.machine}, ${body.polisher}, ${body.grader}, 
          ${body.operatorName}, ${body.startTime || null}, ${body.endTime || null}, ${premiumRiceKg}, 
          ${gradeARiceKg}, ${gradeBRiceKg}, ${brokenRiceKg}, 
          ${branKg}, ${huskKg}, ${otherWasteKg}, ${body.riceStorageGodown}, ${body.inputGodown || 'Processing Tank'}, 
          ${riceBags}, ${bagWeightKg}, ${toNumber(body.labourCount)}, ${toNumber(body.labourCost)}, 
          ${toNumber(body.powerConsumption)}, ${riceYieldPercent}, ${body.remarks}
        ) 
        RETURNING *
      `;
      const prodResult = inserted[0];

      // 2. Accounting Sync: Stock Value Shift
      const rateRes = await txSql`SELECT rate_per_kg FROM paddy_inwards WHERE paddy_variety = ${body.paddyVariety} ORDER BY created_at DESC LIMIT 1`;
      const paddyRate = Number(rateRes[0]?.rate_per_kg || 30);
      const totalValue = paddyInputKg * paddyRate;

      // 2. Accounting Sync using ILIKE for case-insensitive matching
      const ledgers = await txSql`
        SELECT id, name FROM ledgers 
        WHERE name ILIKE ${'Stock in Hand - Paddy'} 
           OR name ILIKE ${'Stock in Hand - Rice'}
      `;
      const getId = (name) => ledgers.find(l => l.name.toLowerCase() === name.toLowerCase())?.id;

      const paddyStockLedger = getId('Stock in Hand - Paddy');
      const riceStockLedger  = getId('Stock in Hand - Rice');
      const directLabourLedger = getId('Direct Labour - Cleaning'); // Using existing labour ledger
      const cashLedger = getId('Cash in Hand');

      if (totalValue > 0 && riceStockLedger && paddyStockLedger) {
        await txSql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${body.processDate}, 'Journal', ${'VAL-' + prodResult.id}, ${riceStockLedger}, ${paddyStockLedger}, ${totalValue}, ${`Stock Value Shift: Milling Batch ${prodResult.production_no}`}, 'PRODUCTION', ${prodResult.id})
        `;
      }

      if (toNumber(body.labourCost) > 0 && directLabourLedger && cashLedger) {
        await txSql`
          INSERT INTO transactions (transaction_date, voucher_type, voucher_no, debit_ledger_id, credit_ledger_id, amount, narration, ref_module, ref_id)
          VALUES (${body.processDate}, 'Payment', ${'LAB-PROD-' + prodResult.id}, ${directLabourLedger}, ${cashLedger}, ${toNumber(body.labourCost)}, ${`Milling Labour: Batch ${prodResult.production_no}`}, 'PRODUCTION', ${prodResult.id})
        `;
        await txSql`UPDATE ledgers SET current_balance = current_balance - ${toNumber(body.labourCost)} WHERE id = ${cashLedger}`;
      }

      // 3. Stock Movements
      const inputGodown = body.inputGodown || 'Processing Tank';
      const riceGodown  = body.riceStorageGodown || 'Finished Rice Godown';

      await moveStock(txSql, inputGodown, null, 'paddy', body.paddyVariety, 'Cleaned Paddy', paddyInputKg, toNumber(body.inputBags), 'PRODUCTION_INPUT', 'Milling started');

      if (totalRiceOutputKg > 0) {
        await moveStock(txSql, null, riceGodown, 'finished_rice', body.paddyVariety, body.riceType || 'Milled Rice', totalRiceOutputKg, riceBags, 'PRODUCTION_OUTPUT', 'Finished Rice stored', false, prodResult.production_no);
      }
      if (branKg > 0) {
        await moveStock(txSql, null, 'By-Product Godown', 'by_product', body.paddyVariety, 'Rice Bran', branKg, 0, 'PRODUCTION_OUTPUT', 'Bran stored');
      }
      if (huskKg > 0) {
        await moveStock(txSql, null, 'By-Product Godown', 'by_product', body.paddyVariety, 'Rice Husk', huskKg, 0, 'PRODUCTION_OUTPUT', 'Husk stored');
      }

      return prodResult;
    });

    res.status(201).json({ production: result, message: 'Production batch and accounting synced successfully.' });
  } catch (error) {
    console.error('Production Sync Error:', error);
    res.status(500).json({ message: 'Failed to sync production batch.', error: error.message });
  }
}

async function listProduction(req, res) {
  try {
    const { page, limit, search, variety } = req.query;

    let baseQuery = `
      SELECT 
        id,
        process_date as "processDate",
        production_no as "productionNo",
        shift,
        cleaning_batch_ref as "cleaningBatchRef",
        paddy_variety as "paddyVariety",
        rice_type as "riceType",
        paddy_input_kg as "paddyInputKg",
        input_bags as "inputBags",
        input_moisture_percent as "inputMoisturePercent",
        machine,
        polisher,
        grader,
        operator_name as "operatorName",
        start_time as "startTime",
        end_time as "endTime",
        premium_rice_kg as "premiumRiceKg",
        grade_a_rice_kg as "gradeARiceKg",
        grade_b_rice_kg as "gradeBRiceKg",
        broken_rice_kg as "brokenRiceKg",
        bran_kg as "branKg",
        husk_kg as "huskKg",
        other_waste_kg as "otherWasteKg",
        rice_storage_godown as "riceStorageGodown",
        input_godown as "inputGodown",
        rice_bags as "riceBags",
        bag_weight_kg as "bagWeightKg",
        labour_count as "labourCount",
        labour_cost as "labourCost",
        power_consumption as "powerConsumption",
        yield_percent as "yieldPercent",
        remarks,
        created_at as "createdAt"
      FROM productions 
    `;
    let whereClauses = [];
    let queryParams = [];
    
    if (search) {
      queryParams.push(`%${search}%`);
      whereClauses.push(`(production_no ILIKE $${queryParams.length} OR paddy_variety ILIKE $${queryParams.length} OR rice_type ILIKE $${queryParams.length} OR operator_name ILIKE $${queryParams.length})`);
    }
    
    if (variety && variety !== 'All Varieties') {
      queryParams.push(variety);
      whereClauses.push(`paddy_variety = $${queryParams.length}`);
    }

    let whereString = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';
    let orderByString = ` ORDER BY created_at DESC`;

    const countQuery = `SELECT COUNT(*) as count FROM productions${whereString}`;
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
    console.error('SQL Error in listProduction:', error);
    res.status(500).json({ message: 'Failed to load production records.' });
  }
}

async function updateProduction(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const paddyInputKg      = toNumber(body.paddyInputKg);
    const totalRiceOutputKg = toNumber(body.totalRiceOutputKg);
    const premiumRiceKg     = toNumber(body.premiumRiceKg);
    const gradeARiceKg      = toNumber(body.gradeARiceKg);
    const gradeBRiceKg      = toNumber(body.gradeBRiceKg);
    const brokenRiceKg      = toNumber(body.brokenRiceKg);
    const branKg            = toNumber(body.branKg);
    const huskKg            = toNumber(body.huskKg);
    const otherWasteKg      = toNumber(body.otherWasteKg);
    const riceBags          = toNumber(body.riceBags);
    const bagWeightKg       = toNumber(body.bagWeightKg);
    const riceYieldPercent  = paddyInputKg > 0 ? (totalRiceOutputKg / paddyInputKg) * 100 : 0;

    const result = await sql`
      UPDATE productions SET
        process_date = ${body.processDate},
        shift = ${body.shift},
        paddy_variety = ${body.paddyVariety},
        rice_type = ${body.riceType},
        paddy_input_kg = ${paddyInputKg},
        input_bags = ${toNumber(body.inputBags)},
        input_moisture_percent = ${toNumber(body.inputMoisturePercent)},
        machine = ${body.machine},
        polisher = ${body.polisher},
        grader = ${body.grader},
        operator_name = ${body.operatorName},
        start_time = ${body.startTime || null},
        end_time = ${body.endTime || null},
        premium_rice_kg = ${premiumRiceKg},
        grade_a_rice_kg = ${gradeARiceKg},
        grade_b_rice_kg = ${gradeBRiceKg},
        broken_rice_kg = ${brokenRiceKg},
        bran_kg = ${branKg},
        husk_kg = ${huskKg},
        other_waste_kg = ${otherWasteKg},
        rice_storage_godown = ${body.riceStorageGodown},
        input_godown = ${body.inputGodown},
        rice_bags = ${riceBags},
        bag_weight_kg = ${bagWeightKg},
        labour_count = ${toNumber(body.labourCount)},
        labour_cost = ${toNumber(body.labourCost)},
        power_consumption = ${toNumber(body.powerConsumption)},
        yield_percent = ${riceYieldPercent},
        remarks = ${body.remarks}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!result.length) return res.status(404).json({ message: 'Production record not found' });

    // ✅ BUG #1 FIX: Preserve sold quantity when updating stock.
    const prodNo = result[0].production_no;
    if (prodNo) {
      const currentStock = await sql`
        SELECT total_weight_kg, available_weight_kg
        FROM rice_stocks
        WHERE source_ref = ${prodNo} AND item_type = 'finished_rice'
      `;

      if (currentStock.length > 0) {
        const soldKg = Math.max(
          0,
          toNumber(currentStock[0].total_weight_kg) - toNumber(currentStock[0].available_weight_kg)
        );
        const newAvailableKg = Math.max(0, totalRiceOutputKg - soldKg);

        await sql`
          UPDATE rice_stocks
          SET
            total_weight_kg     = ${totalRiceOutputKg},
            available_weight_kg = ${newAvailableKg},
            bags                = ${riceBags}
          WHERE source_ref = ${prodNo} AND item_type = 'finished_rice'
        `;
      } else {
        if (totalRiceOutputKg > 0) {
          await sql`
            INSERT INTO rice_stocks (
              item_type, variety, rice_type, godown,
              total_weight_kg, available_weight_kg, bags, bag_weight_kg, source_ref
            ) VALUES (
              'finished_rice', ${body.paddyVariety}, ${body.riceType}, ${body.riceStorageGodown},
              ${totalRiceOutputKg}, ${totalRiceOutputKg}, ${riceBags}, ${bagWeightKg}, ${prodNo}
            )
          `;
        }
      }
    }

    res.json({ production: result[0], message: 'Production record updated successfully.' });
  } catch (error) {
    console.error('SQL Error in updateProduction:', error);
    res.status(500).json({ message: 'Failed to update production entry.' });
  }
}

async function deleteProduction(req, res) {
  try {
    const { id } = req.params;
    const prod = await sql`SELECT * FROM productions WHERE id = ${id}`;
    if (!prod.length) return res.status(404).json({ message: 'Production record not found' });

    const prodNo = prod[0].production_no;

    // ✅ BUG #2 FIX (enhanced): Block deletion if any kg from this production has been sold.
    if (prodNo) {
      const stockRows = await sql`
        SELECT id, total_weight_kg, available_weight_kg
        FROM rice_stocks
        WHERE source_ref = ${prodNo}
      `;

      const soldKg = stockRows.reduce((sum, r) => {
        return sum + Math.max(0, toNumber(r.total_weight_kg) - toNumber(r.available_weight_kg));
      }, 0);

      if (soldKg > 0) {
        const stockIds = stockRows.map(r => r.id);
        const relatedSales = await sql`
          SELECT invoice_no, quantity_kg
          FROM sales
          WHERE product_id = ANY(${stockIds})
          ORDER BY invoice_date ASC
        `;

        const invoiceList = relatedSales.length > 0
          ? relatedSales.map(s => `${s.invoice_no} (${toNumber(s.quantity_kg).toFixed(2)} kg)`).join(', ')
          : 'unknown invoices';

        return res.status(400).json({
          message: `Cannot delete record '${prodNo}'. Impact: ${soldKg.toFixed(2)} Kg has already been sold. Please reverse/delete these invoices first: ${invoiceList}.`
        });
      }
    }
    // Stock operations (sequential - Neon HTTP doesn't support transactions)
    // Reverse the stock movements from production
    const inputGodown = prod[0].input_godown || 'Processing Tank';
    const riceGodown = prod[0].rice_storage_godown || 'Finished Rice Godown';
    const variety = prod[0].paddy_variety;
    const riceType = prod[0].rice_type || 'Milled Rice';

    // ADD back paddy to the correct input godown (reverse the consumption)
    await updateStock(sql, 'paddy', variety, 'Cleaned Paddy', inputGodown, toNumber(prod[0].input_bags), toNumber(prod[0].paddy_input_kg), 'ADD');

      // REMOVE finished rice and by-products that were added
      const totalRiceKg = toNumber(prod[0].premium_rice_kg) + toNumber(prod[0].grade_a_rice_kg) + toNumber(prod[0].grade_b_rice_kg) + toNumber(prod[0].broken_rice_kg);
      if (totalRiceKg > 0) await updateStock(sql, 'finished_rice', variety, riceType, riceGodown, toNumber(prod[0].rice_bags), totalRiceKg, 'REMOVE');
      if (toNumber(prod[0].bran_kg) > 0) await updateStock(sql, 'by_product', variety, 'Rice Bran', 'By-Product Godown', 0, toNumber(prod[0].bran_kg), 'REMOVE');
      if (toNumber(prod[0].husk_kg) > 0) await updateStock(sql, 'by_product', variety, 'Rice Husk', 'By-Product Godown', 0, toNumber(prod[0].husk_kg), 'REMOVE');
      if (toNumber(prod[0].broken_rice_kg) > 0) await updateStock(sql, 'by_product', variety, 'Broken Rice', riceGodown, 0, toNumber(prod[0].broken_rice_kg), 'REMOVE');

      await sql`DELETE FROM productions WHERE id = ${id}`;

    res.json({ message: 'Production record deleted and stock reversed successfully.' });
  } catch (error) {
    console.error('SQL Error in deleteProduction:', error);
    res.status(500).json({ message: 'Failed to delete production entry.' });
  }
}

module.exports = {
  createProduction,
  listProduction,
  updateProduction,
  deleteProduction,
};
