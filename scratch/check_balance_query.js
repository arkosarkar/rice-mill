const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const balanceQuery = `
      (
        COALESCE(p.opening_balance, 0) * (CASE WHEN p.type = 'Farmer' THEN -1 ELSE 1 END) + 
        COALESCE((
          SELECT SUM(CASE WHEN t.debit_ledger_id = p.ledger_id THEN t.amount ELSE -t.amount END)
          FROM transactions t
          WHERE t.debit_ledger_id = p.ledger_id OR t.credit_ledger_id = p.ledger_id
        ), 0)
      ) as ledger_balance
    `;
    const res = await sql`SELECT p.name, ${sql.unsafe(balanceQuery)} FROM parties p WHERE p.name ILIKE '%kaushik%'`;
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
