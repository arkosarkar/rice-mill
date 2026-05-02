const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function migrate() {
  try {
    console.log('Syncing productions schema...');
    
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS rice_bags NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS bag_weight_kg NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS rice_storage_godown TEXT`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS labour_cost NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE productions ADD COLUMN IF NOT EXISTS power_consumption NUMERIC DEFAULT 0`;
    
    console.log('Schema updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
