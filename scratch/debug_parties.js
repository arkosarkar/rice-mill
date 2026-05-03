const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function check() {
  try {
    const res = await sql`SELECT id, name, type, ledger_id, opening_balance FROM parties`;
    console.log('PARTIES TABLE:');
    console.table(res);
    
    const txs = await sql`SELECT debit_ledger_id, credit_ledger_id, amount FROM transactions LIMIT 10`;
    console.log('TRANSACTIONS TABLE (SAMPLE):');
    console.table(txs);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

check();
