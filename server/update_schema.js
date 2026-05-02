const sql = require('./src/config/db');

async function run() {
  try {
    await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS previous_cleaning_id INTEGER REFERENCES cleaning_batches(id)`;
    await sql`ALTER TABLE cleaning_batches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'`;
    await sql`ALTER TABLE rice_stocks ADD COLUMN IF NOT EXISTS is_recleaning BOOLEAN DEFAULT false`;
    console.log('Schema updated successfully');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
