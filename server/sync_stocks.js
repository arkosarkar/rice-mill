const sql = require('./src/config/db');

/**
 * Migration Script: Syncing existing ERP data to the centralized rice_stocks table.
 * Revised: Uses a ZERO-OUT + UPSERT strategy to preserve foreign key integrity.
 */
async function syncStocks() {
  console.log('--- Starting Stock Synchronization (Safe Mode) ---');
  
  try {
    // 1. Zero out existing balances instead of deleting rows (to preserve FKs)
    console.log('Zeroing out existing rice_stocks balances...');
    await sql`
      UPDATE rice_stocks 
      SET available_weight_kg = 0, total_weight_kg = 0, bags = 0
    `;

    // 2. Process Paddy Inwards (ADD Raw Paddy)
    console.log('Processing Paddy Inwards...');
    const inwards = await sql`
      SELECT paddy_variety, godown, net_weight_kg, number_of_bags 
      FROM paddy_inwards
    `;
    
    for (const row of inwards) {
      await sql`
        INSERT INTO rice_stocks (item_type, variety, rice_type, godown, total_weight_kg, available_weight_kg, bags, source_ref)
        VALUES ('paddy', ${row.paddy_variety}, 'Raw Paddy', ${row.godown || 'Main Godown'}, ${row.net_weight_kg}, ${row.net_weight_kg}, ${row.number_of_bags}, 'Aggregate')
        ON CONFLICT (item_type, variety, rice_type, godown) DO UPDATE SET
          total_weight_kg = rice_stocks.total_weight_kg + EXCLUDED.total_weight_kg,
          available_weight_kg = rice_stocks.available_weight_kg + EXCLUDED.available_weight_kg,
          bags = rice_stocks.bags + EXCLUDED.bags
      `;
    }

    // 3. Process Cleaning Batches (REMOVE Raw Paddy, ADD Cleaned Paddy)
    console.log('Processing Cleaning Batches...');
    const cleaning = await sql`
      SELECT paddy_variety, source_godown, destination_godown, input_weight_kg, input_bags, clean_output_kg, output_bags
      FROM cleaning_batches
    `;

    for (const row of cleaning) {
      // REMOVE Raw Paddy
      await sql`
        UPDATE rice_stocks SET
          total_weight_kg = total_weight_kg - ${row.input_weight_kg},
          available_weight_kg = available_weight_kg - ${row.input_weight_kg},
          bags = bags - ${row.input_bags}
        WHERE item_type = 'paddy' AND variety = ${row.paddy_variety} AND rice_type = 'Raw Paddy' AND godown = ${row.source_godown || 'Main Godown'}
      `;

      // ADD Cleaned Paddy
      await sql`
        INSERT INTO rice_stocks (item_type, variety, rice_type, godown, total_weight_kg, available_weight_kg, bags, source_ref)
        VALUES ('paddy', ${row.paddy_variety}, 'Cleaned Paddy', ${row.destination_godown || 'Processing Tank'}, ${row.clean_output_kg}, ${row.clean_output_kg}, ${row.output_bags}, 'Aggregate')
        ON CONFLICT (item_type, variety, rice_type, godown) DO UPDATE SET
          total_weight_kg = rice_stocks.total_weight_kg + EXCLUDED.total_weight_kg,
          available_weight_kg = rice_stocks.available_weight_kg + EXCLUDED.available_weight_kg,
          bags = rice_stocks.bags + EXCLUDED.bags
      `;
    }

    // 4. Process Productions (REMOVE Cleaned Paddy, ADD Finished Rice & By-products)
    console.log('Processing Productions...');
    const production = await sql`
      SELECT 
        paddy_variety, rice_type, paddy_input_kg, input_bags, 
        premium_rice_kg, grade_a_rice_kg, grade_b_rice_kg, broken_rice_kg,
        bran_kg, husk_kg, other_waste_kg, rice_storage_godown, rice_bags
      FROM productions
    `;

    for (const row of production) {
      // REMOVE Cleaned Paddy (usually from Processing Tank)
      await sql`
        UPDATE rice_stocks SET
          total_weight_kg = total_weight_kg - ${row.paddy_input_kg},
          available_weight_kg = available_weight_kg - ${row.paddy_input_kg},
          bags = bags - ${row.input_bags}
        WHERE item_type = 'paddy' AND variety = ${row.paddy_variety} AND rice_type = 'Cleaned Paddy' AND godown = 'Processing Tank'
      `;

      const totalRiceKg = Number(row.premium_rice_kg) + Number(row.grade_a_rice_kg) + Number(row.grade_b_rice_kg) + Number(row.broken_rice_kg);
      const riceGodown = row.rice_storage_godown || 'Finished Rice Godown';

      // ADD Finished Rice
      if (totalRiceKg > 0) {
        await sql`
          INSERT INTO rice_stocks (item_type, variety, rice_type, godown, total_weight_kg, available_weight_kg, bags, source_ref)
          VALUES ('finished_rice', ${row.paddy_variety}, ${row.rice_type || 'Milled Rice'}, ${riceGodown}, ${totalRiceKg}, ${totalRiceKg}, ${row.rice_bags}, 'Aggregate')
          ON CONFLICT (item_type, variety, rice_type, godown) DO UPDATE SET
            total_weight_kg = rice_stocks.total_weight_kg + EXCLUDED.total_weight_kg,
            available_weight_kg = rice_stocks.available_weight_kg + EXCLUDED.available_weight_kg,
            bags = rice_stocks.bags + EXCLUDED.bags
        `;
      }

      // ADD By-products (Bran, Husk)
      if (Number(row.bran_kg) > 0) {
        await sql`
          INSERT INTO rice_stocks (item_type, variety, rice_type, godown, total_weight_kg, available_weight_kg, bags, source_ref)
          VALUES ('by_product', ${row.paddy_variety}, 'Rice Bran', 'By-Product Godown', ${row.bran_kg}, ${row.bran_kg}, 0, 'Aggregate')
          ON CONFLICT (item_type, variety, rice_type, godown) DO UPDATE SET
            total_weight_kg = rice_stocks.total_weight_kg + EXCLUDED.total_weight_kg,
            available_weight_kg = rice_stocks.available_weight_kg + EXCLUDED.available_weight_kg
        `;
      }
      if (Number(row.husk_kg) > 0) {
        await sql`
          INSERT INTO rice_stocks (item_type, variety, rice_type, godown, total_weight_kg, available_weight_kg, bags, source_ref)
          VALUES ('by_product', ${row.paddy_variety}, 'Rice Husk', 'By-Product Godown', ${row.husk_kg}, ${row.husk_kg}, 0, 'Aggregate')
          ON CONFLICT (item_type, variety, rice_type, godown) DO UPDATE SET
            total_weight_kg = rice_stocks.total_weight_kg + EXCLUDED.total_weight_kg,
            available_weight_kg = rice_stocks.available_weight_kg + EXCLUDED.available_weight_kg
        `;
      }
    }

    // 5. Process Sales (REMOVE Finished Rice)
    console.log('Processing Sales...');
    const sales = await sql`
      SELECT product_id, quantity_kg, bags, variety, rice_type, source_godown
      FROM sales
    `;

    for (const row of sales) {
       await sql`
         UPDATE rice_stocks SET
           total_weight_kg = total_weight_kg - ${row.quantity_kg},
           available_weight_kg = available_weight_kg - ${row.quantity_kg},
           bags = bags - ${row.bags}
         WHERE item_type = 'finished_rice' AND variety = ${row.variety} AND rice_type = ${row.rice_type} AND godown = ${row.source_godown}
       `;
    }

    console.log('--- Stock Synchronization Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration Failed:', err);
    process.exit(1);
  }
}

syncStocks();
