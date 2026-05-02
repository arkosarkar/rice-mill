const sql = require('../config/db');

/**
 * Centrally manages the rice_stocks aggregate ledger.
 *
 * NOTE: Neon HTTP driver does NOT support sql.begin() transactions.
 * All calls here are sequential but individually atomic SQL statements.
 *
 * @param {object}  db       - The neon sql tag
 * @param {string}  itemType - 'paddy' | 'finished_rice' | 'by_product'
 * @param {string}  variety  - e.g. 'PR 11'
 * @param {string}  riceType - e.g. 'Raw Paddy', 'Cleaned Paddy', 'Milled Rice', 'Rice Bran', …
 * @param {string}  godown   - Godown name (auto-created if needed on ADD)
 * @param {number}  bags     - Number of bags (0 is valid for by-products)
 * @param {number}  weightKg - Weight in kg
 * @param {string}  action   - 'ADD' | 'REMOVE'
 *
 * @throws {Error} When REMOVE is requested and stock is insufficient (caller must handle / rollback)
 */
async function updateStock(db, itemType, variety, riceType, godown, bags, weightKg, action, isRecleaning = false, sourceRef = 'Aggregate') {
  const w = parseFloat(weightKg);
  const b = parseInt(bags, 10) || 0;

  if (!w || isNaN(w) || w === 0) return;

  const safeItemType = (itemType || '').trim();
  const safeVariety  = (variety  || '').trim();
  const safeRiceType = (riceType || '').trim();
  const safeGodown   = (godown   || 'Unassigned').trim();

  const isAdd = action === 'ADD';

  if (isAdd) {
    await db`
      INSERT INTO rice_stocks (
        item_type, variety, rice_type, godown,
        total_weight_kg, available_weight_kg, bags, source_ref, is_recleaning
      ) VALUES (
        ${safeItemType}, ${safeVariety}, ${safeRiceType}, ${safeGodown},
        ${w}, ${w}, ${b}, ${sourceRef}, ${isRecleaning}
      )
      ON CONFLICT (item_type, variety, rice_type, godown, is_recleaning, source_ref) 
      DO UPDATE SET
        available_weight_kg = rice_stocks.available_weight_kg + ${w},
        total_weight_kg     = rice_stocks.total_weight_kg     + ${w},
        bags                = rice_stocks.bags                + ${b},
        last_updated        = CURRENT_TIMESTAMP
    `;
  } else {
    // When removing, we need to be specific about re-cleaning status
    // and match the sourceRef (default 'Aggregate').
    const result = await db`
      UPDATE rice_stocks
      SET
        available_weight_kg = available_weight_kg - ${w},
        total_weight_kg     = total_weight_kg     - ${w},
        bags                = bags                - ${b},
        last_updated        = CURRENT_TIMESTAMP
      WHERE item_type = ${safeItemType}
        AND variety   = ${safeVariety}
        AND rice_type = ${safeRiceType}
        AND godown    = ${safeGodown}
        AND is_recleaning = ${isRecleaning}
        AND source_ref = ${sourceRef}
        AND available_weight_kg >= ${w}
      RETURNING id
    `;

    if (result.length === 0) {
      const check = await db`
        SELECT available_weight_kg FROM rice_stocks
        WHERE item_type = ${safeItemType}
          AND variety   = ${safeVariety}
          AND rice_type = ${safeRiceType}
          AND godown    = ${safeGodown}
          AND is_recleaning = ${isRecleaning}
      `;

      if (check.length === 0) {
        throw new Error(`Insufficient Stock: No stock found for ${variety} ${riceType} in ${godown}`);
      } else {
        throw new Error(
          `Insufficient Stock: Requested ${w}kg but only ${parseFloat(check[0].available_weight_kg).toFixed(2)}kg available in ${godown}`
        );
      }
    }
  }
}

/**
 * moveStock(source, dest, itemType, variety, riceType, weight, bags, actionType, description)
 * 
 * Centralized function to move stock between godowns or represent Inwards/Sales.
 */
async function moveStock(db, source, dest, itemType, variety, riceType, weight, bags, actionType, description) {
  const w = parseFloat(weight);
  const b = parseInt(bags, 10) || 0;

  if (!w || isNaN(w) || w <= 0) return;

  // 1. Remove from source
  if (source) {
    await updateStock(db, itemType, variety, riceType, source, b, w, 'REMOVE');
  }

  // 2. Add to destination
  if (dest) {
    await updateStock(db, itemType, variety, riceType, dest, b, w, 'ADD');
  }

  // 3. Log Movement
  await db`
    INSERT INTO stock_movements (
      from_godown, to_godown, item_type, variety, rice_type, 
      weight_kg, bags, action_type, description
    ) VALUES (
      ${source || 'External Source'}, 
      ${dest || 'Dispatched/Consumed'}, 
      ${itemType}, ${variety}, ${riceType}, 
      ${w}, ${b}, ${actionType}, ${description}
    )
  `;

  console.log(`[moveStock] ${actionType}: ${source || 'OUT'} ➔ ${dest || 'OUT'} (${w}kg ${variety})`);
}

module.exports = { updateStock, moveStock };
