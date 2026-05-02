const sql = require('../src/config/db');

async function checkSchema() {
  try {
    console.log('--- Cleaning Batches Column Info ---');
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'cleaning_batches'
      ORDER BY ordinal_position
    `;
    console.table(cols);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkSchema();
