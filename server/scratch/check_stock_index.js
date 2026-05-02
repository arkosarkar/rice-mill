const sql = require('../src/config/db');

async function checkIndex() {
  try {
    console.log('--- Rice Stocks Indexes ---');
    const indexes = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'rice_stocks'
    `;
    console.table(indexes);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkIndex();
