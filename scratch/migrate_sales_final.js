const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function migrate() {
  try {
    console.log('Final sync for sales schema...');
    
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS billing_address TEXT`;
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_address TEXT`;
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS hsn_sac TEXT`;
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_rcm BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS igst_amount NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_type TEXT`;
    
    console.log('Schema updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
