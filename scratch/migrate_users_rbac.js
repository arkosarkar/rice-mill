const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function migrate() {
  try {
    console.log('Migrating users table for RBAC...');
    
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS site_id INTEGER`;
    
    console.log('Migration completed.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
