const sql = require('../src/config/db');

async function migrate() {
  try {
    console.log('Adding input_godown column to productions table...');
    await sql`
      ALTER TABLE productions 
      ADD COLUMN IF NOT EXISTS input_godown TEXT
    `;
    console.log('Migration successful.');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

migrate();
