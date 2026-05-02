const sql = require('./src/config/db');
async function run() {
  try {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'`;
    console.log('transactions columns:', cols.map(c => c.column_name));
  } catch(e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
