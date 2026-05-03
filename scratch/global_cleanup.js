const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function cleanup() {
  try {
    console.log('Starting Global Ledger Cleanup...');

    // 1. Find all parties and their linked ledgers
    const parties = await sql`SELECT id, name, ledger_id FROM parties`;
    const ledgers = await sql`SELECT id, name FROM ledgers`;

    for (const p of parties) {
      console.log(`Checking party: ${p.name} (Ledger ID: ${p.ledger_id})`);
      
      // Find any other ledgers with the same name or Name - Mobile
      const dupes = ledgers.filter(l => 
        (l.name.toLowerCase() === p.name.toLowerCase() || 
         l.name.toLowerCase().startsWith(p.name.toLowerCase() + ' - ')) &&
        l.id !== p.ledger_id
      );

      for (const d of dupes) {
        console.log(`  Merging duplicate ledger ${d.name} (ID: ${d.id}) into ${p.ledger_id}`);
        // Move transactions
        await sql`UPDATE transactions SET debit_ledger_id = ${p.ledger_id} WHERE debit_ledger_id = ${d.id}`;
        await sql`UPDATE transactions SET credit_ledger_id = ${p.ledger_id} WHERE credit_ledger_id = ${d.id}`;
        // Delete ghost ledger
        await sql`DELETE FROM ledgers WHERE id = ${d.id}`;
      }
    }

    console.log('Cleanup completed.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

cleanup();
