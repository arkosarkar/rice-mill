const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function simulate() {
  try {
    const balanceQuery = `
      (
        (COALESCE(CAST(p.opening_balance AS NUMERIC), 0) * (CASE WHEN p.type = 'Farmer' THEN -1 ELSE 1 END)) + 
        COALESCE((
          SELECT SUM(CAST(amount AS NUMERIC)) 
          FROM transactions 
          WHERE debit_ledger_id = p.ledger_id
        ), 0) - 
        COALESCE((
          SELECT SUM(CAST(amount AS NUMERIC)) 
          FROM transactions 
          WHERE credit_ledger_id = p.ledger_id
        ), 0)
      ) as ledger_balance,
      (SELECT COUNT(*) FROM transactions WHERE debit_ledger_id = p.ledger_id OR credit_ledger_id = p.ledger_id) as tx_count
    `;
    const res = await sql(`SELECT p.name, p.ledger_id, ${balanceQuery} FROM parties p`);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

simulate();
