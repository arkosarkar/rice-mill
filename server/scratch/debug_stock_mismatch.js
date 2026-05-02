const sql = require('../src/config/db');

async function debugStock() {
  try {
    console.log('--- Cleaning Batches ---');
    const cleaning = await sql`SELECT id, inward_ref, destination_godown FROM cleaning_batches LIMIT 5`;
    console.table(cleaning);

    console.log('\n--- Rice Stocks (Cleaned Paddy) ---');
    const stocks = await sql`SELECT item_type, variety, rice_type, godown, available_weight_kg FROM rice_stocks WHERE rice_type = 'Cleaned Paddy' LIMIT 10`;
    console.table(stocks);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

debugStock();
