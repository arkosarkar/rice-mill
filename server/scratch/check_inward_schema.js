const sql = require('./src/config/db');

async function check() {
  try {
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'paddy_inwards'
      ORDER BY ordinal_position;
    `;
    console.log('--- paddy_inwards Schema ---');
    tableInfo.forEach(c => console.log(`${c.column_name}: ${c.data_type} (null: ${c.is_nullable})`));
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
