const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const res = await sql`
      SELECT t.voucher_no, t.amount, l.name, l.group_name
      FROM transactions t
      JOIN ledgers l ON t.credit_ledger_id = l.id
      WHERE t.ref_module = 'SALE'
    `;
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
