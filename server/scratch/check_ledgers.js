const sql = require('../src/config/db');
async function check() {
  const ledgers = await sql`SELECT * FROM ledgers`;
  console.log(JSON.stringify(ledgers, null, 2));
  process.exit(0);
}
check();
