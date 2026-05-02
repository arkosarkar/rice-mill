const sql = require('./src/config/db');

async function debug() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    const start = `${startYear}-04-01`;
    const end = `${startYear + 1}-03-31`;
    
    console.log(`Debugging P&L for range: ${start} to ${end}`);

    const txns = await sql`
      SELECT t.id, t.transaction_date, l.name, l.group_name, t.amount, 
             CASE WHEN t.debit_ledger_id = l.id THEN 'DEBIT' ELSE 'CREDIT' END as side
      FROM transactions t
      JOIN ledgers l ON (t.debit_ledger_id = l.id OR t.credit_ledger_id = l.id)
      WHERE t.transaction_date BETWEEN ${start} AND ${end}
      LIMIT 20
    `;
    
    console.log('Sample Transactions found:', txns.length);
    if (txns.length > 0) {
      console.table(txns);
    } else {
      console.log('❌ NO TRANSACTIONS FOUND IN THIS RANGE!');
      const allCount = await sql`SELECT COUNT(*) FROM transactions`;
      console.log(`Total transactions in DB: ${allCount[0].count}`);
      const latest = await sql`SELECT transaction_date FROM transactions ORDER BY transaction_date DESC LIMIT 1`;
      console.log(`Latest transaction date in DB: ${latest[0]?.transaction_date}`);
    }

    const groups = await sql`SELECT DISTINCT group_name FROM ledgers`;
    console.log('Available Ledger Groups:', groups.map(g => g.group_name));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
debug();
