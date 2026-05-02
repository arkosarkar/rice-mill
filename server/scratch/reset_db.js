const sql = require('../src/config/db');

async function resetDB() {
  console.log('⚠️  WARNING: RESETTING ENTIRE DATABASE ⚠️');
  
  try {
    const tables = [
      'transactions',
      'stock_movements',
      'rice_stocks',
      'sales',
      'productions',
      'cleaning_batches',
      'paddy_inwards',
      'expenses',
      'parties',
      'ledgers'
    ];

    for (const table of tables) {
      console.log(`Truncating ${table}...`);
      // Since our custom 'sql' helper doesn't support dynamic table names as identifiers,
      // we use the raw string execution mode.
      await sql(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }

    console.log('Seeding default ledgers...');
    const defaultLedgers = [
      { name: 'Cash in Hand', group: 'Cash-in-hand' },
      { name: 'SBI - Main Account', group: 'Bank Accounts' },
      { name: 'Purchase Account', group: 'Purchases' },
      { name: 'Sales Account', group: 'Sales' },
      { name: 'GST Payable', group: 'Current Liabilities' }
    ];

    for (const l of defaultLedgers) {
      await sql`INSERT INTO ledgers (name, group_name) VALUES (${l.name}, ${l.group}) ON CONFLICT (name) DO NOTHING`;
    }

    console.log('✅ Database reset successfully! All modules are now empty and ready for fresh testing.');
  } catch (err) {
    console.error('❌ Reset failed.');
  } finally {
    process.exit();
  }
}

resetDB();
