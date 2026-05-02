const sql = require('./src/config/db');

async function checkFKs() {
  try {
    const fks = await sql`
      SELECT
          conname AS constraint_name,
          conrelid::regclass AS table_name,
          confrelid::regclass AS referenced_table
      FROM pg_constraint
      WHERE confrelid = 'rice_stocks'::regclass;
    `;
    console.log('FKs referencing rice_stocks:', fks);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkFKs();
