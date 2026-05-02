const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function setup() {
  try {
    console.log('Initializing accounting ledgers...');
    
    const ledgers = [
      { name: 'Paddy Purchase A/C', group: 'Purchases' },
      { name: 'Sales Account', group: 'Sales' },
      { name: 'GST Payable', group: 'Current Liabilities' },
      { name: 'Input GST A/C', group: 'Current Assets' },
      { name: 'Deductions & Commission A/C', group: 'Indirect Incomes' },
      { name: 'Direct Labour - Cleaning', group: 'Direct Expenses' },
      { name: 'Electricity/Fuel Expense', group: 'Power & Fuel' },
      { name: 'Cash in Hand', group: 'Assets' },
      { name: 'SBI - Main Account', group: 'Bank Accounts' },
      { name: 'Capital Account', group: 'Capital Account' }
    ];

    for (const l of ledgers) {
      await sql`
        INSERT INTO ledgers (name, group_name) 
        VALUES (${l.name}, ${l.group}) 
        ON CONFLICT (name) DO UPDATE SET group_name = EXCLUDED.group_name
      `;
      console.log(`- ${l.name} (${l.group})`);
    }

    console.log('Ledgers initialized successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Ledger init failed:', error);
    process.exit(1);
  }
}

setup();
