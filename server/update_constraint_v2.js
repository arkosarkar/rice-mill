const sql = require('./src/config/db');

async function run() {
  try {
    await sql`ALTER TABLE rice_stocks DROP CONSTRAINT IF EXISTS rice_stocks_agg_key`;
    await sql`ALTER TABLE rice_stocks ADD CONSTRAINT rice_stocks_agg_key UNIQUE (item_type, variety, rice_type, godown, is_recleaning, source_ref)`;
    console.log('Constraint updated successfully to include source_ref');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
