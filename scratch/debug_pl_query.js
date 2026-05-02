const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const start = '2026-04-01';
    const end = '2027-03-31';
    const results = await sql`
      SELECT 
        LOWER(l.group_name) as group_key,
        SUM(CASE WHEN t.credit_ledger_id = l.id THEN t.amount ELSE 0 END) as credit_total,
        SUM(CASE WHEN t.debit_ledger_id = l.id THEN t.amount ELSE 0 END) as debit_total
      FROM transactions t
      JOIN ledgers l ON (t.debit_ledger_id = l.id OR t.credit_ledger_id = l.id)
      WHERE t.transaction_date BETWEEN ${start} AND ${end}
      GROUP BY LOWER(l.group_name)
    `;
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
