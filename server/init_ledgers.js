const sql = require('./src/config/db');

async function setup() {
  try {
    const ledgers = [
      { name: 'Paddy Purchase A/C', group: 'Direct Expenses' },
      { name: 'Input GST A/C', group: 'Duties & Taxes' },
      { name: 'Deductions & Commission A/C', group: 'Indirect Incomes' },
      { name: 'Direct Labour - Cleaning', group: 'Direct Expenses' },
      { name: 'Electricity/Fuel Expense', group: 'Direct Expenses' },
      { name: 'Stock in Hand - Rice', group: 'Stock-in-Hand' },
      { name: 'Stock in Hand - Paddy', group: 'Stock-in-Hand' },
      { name: 'Outstanding Wages', group: 'Current Liabilities' }
    ];

    for (const l of ledgers) {
      await sql`
        INSERT INTO ledgers (name, group_name) 
        VALUES (${l.name}, ${l.group}) 
        ON CONFLICT (name) DO UPDATE SET group_name = EXCLUDED.group_name
      `;
    }
    console.log('Accounting ledgers initialized.');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
setup();
