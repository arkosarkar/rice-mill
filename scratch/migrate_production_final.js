const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function migrate() {
  try {
    console.log('Final sync for productions schema...');
    
    // Add every column used in the INSERT statement if not exists
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS process_date DATE`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS production_no TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS shift TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS cleaning_batch_ref TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS paddy_variety TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS rice_type TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS paddy_input_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS input_bags NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS input_moisture_percent NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS machine TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS polisher TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS grader TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS operator_name TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS start_time TIME`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS end_time TIME`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS premium_rice_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS grade_a_rice_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS grade_b_rice_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS broken_rice_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS bran_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS husk_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS other_waste_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS rice_storage_godown TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS input_godown TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS rice_bags NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS bag_weight_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS labour_count NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS labour_cost NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS power_consumption NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS yield_percent NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS remarks TEXT`;

    console.log('Schema updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
