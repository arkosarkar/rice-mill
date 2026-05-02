const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function migrate() {
  try {
    console.log('Starting migration...');
    await sql`ALTER TABLE rice_stocks ADD COLUMN IF NOT EXISTS is_recleaning BOOLEAN DEFAULT FALSE`;
    await sql`ALTER TABLE rice_stocks ADD COLUMN IF NOT EXISTS source_ref TEXT DEFAULT 'Aggregate'`;
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
