const sql = require('./src/config/db');
async function run() {
  try {
    await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS labour_cost NUMERIC(12,2) DEFAULT 0`;
    await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS power_cost NUMERIC(12,2) DEFAULT 0`;
    console.log('cleaning_batches columns added.');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
