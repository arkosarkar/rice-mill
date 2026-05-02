const sql = require('./src/config/db');
async function test() {
  try {
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'cleaning_batches'`;
    console.log('Columns:', cols.map(c => c.column_name));
  } catch (err) {
    console.error('Check Fail:', err);
  } finally {
    process.exit(0);
  }
}
test();
