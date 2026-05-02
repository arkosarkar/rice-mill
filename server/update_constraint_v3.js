const sql = require('./src/config/db');

async function run() {
  try {
    // Try both methods to be sure
    try { await sql`ALTER TABLE rice_stocks DROP CONSTRAINT IF EXISTS rice_stocks_agg_key`; } catch(e) {}
    try { await sql`DROP INDEX IF EXISTS rice_stocks_agg_key`; } catch(e) {}
    
    await sql`ALTER TABLE rice_stocks ADD CONSTRAINT rice_stocks_agg_key UNIQUE (item_type, variety, rice_type, godown, is_recleaning, source_ref)`;
    console.log('Constraint updated successfully');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
