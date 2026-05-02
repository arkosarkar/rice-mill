const sql = require('../src/config/db');

async function checkSchema() {
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log('Tables:', tables.map(t => t.table_name));
  process.exit(0);
}

checkSchema().catch(console.error);
