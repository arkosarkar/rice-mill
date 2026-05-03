const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const res = await sql`SELECT * FROM transactions t JOIN ledgers l ON (t.debit_ledger_id = l.id OR t.credit_ledger_id = l.id) WHERE l.name ILIKE '%kaushik%'`;
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
