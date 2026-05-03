const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function checkOrphans() {
  try {
    const res = await sql`
      SELECT p.id, p.name, p.ledger_id, l.id as actual_ledger_id
      FROM parties p
      LEFT JOIN ledgers l ON p.ledger_id = l.id
      WHERE l.id IS NULL AND p.ledger_id IS NOT NULL
    `;
    console.log('Orphaned Ledger Links in Parties:');
    console.table(res);
    
    const txOrphans = await sql`
      SELECT t.id, t.voucher_no, t.debit_ledger_id, t.credit_ledger_id
      FROM transactions t
      LEFT JOIN ledgers dl ON t.debit_ledger_id = dl.id
      LEFT JOIN ledgers cl ON t.credit_ledger_id = cl.id
      WHERE dl.id IS NULL OR cl.id IS NULL
    `;
    console.log('Transactions with Missing Ledgers:');
    console.table(txOrphans);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkOrphans();
