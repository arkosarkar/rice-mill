const sql = require('./src/config/db');

async function run() {
  try {
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS shipping_address TEXT`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS credit_limit DECIMAL DEFAULT 0`;
    await sql`ALTER TABLE parties ADD COLUMN IF NOT EXISTS opening_balance_date DATE`;
    await sql`ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS email TEXT`;
    console.log('Columns added successfully');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
