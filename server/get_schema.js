const sql = require('./src/config/db');

async function test() {
  const result = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cleaning_batches'`;
  console.log('cleaning_batches', result);
  const result2 = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rice_stocks'`;
  console.log('rice_stocks', result2);
  process.exit();
}
test();
