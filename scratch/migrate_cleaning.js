const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function migrate() {
  try {
    console.log('Syncing cleaning_batches schema...');
    
    // Add missing columns to cleaning_batches
    await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed'`;
    await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS labour_cost NUMERIC DEFAULT 0`;
    await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS power_consumption NUMERIC DEFAULT 0`;
    
    console.log('Schema updated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
