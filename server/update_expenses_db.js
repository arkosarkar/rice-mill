const sql = require('./src/config/db');
async function run() {
  try {
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS expense_type VARCHAR(50) DEFAULT 'Indirect Expense'`;
    console.log('Column expense_type added successfully');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
