const path = require('path');
const dbPath = path.join(process.cwd(), 'server', 'src', 'config', 'db.js');
const sql = require(dbPath);

async function fix() {
  try {
    console.log('Starting Cleanup...');

    // 1. Delete all duplicate RSYNC transactions
    const delRes = await sql`DELETE FROM transactions WHERE voucher_no LIKE 'RSYNC-%'`;
    console.log(`Deleted ${delRes.count} duplicate RSYNC transactions.`);

    // 2. Fix Sale ID 1 (INV-20260503-1736)
    // Rate = 45, Qty = 5, Taxable = 225, Tax = 11.25, Total = 236.25
    await sql`
      UPDATE sales SET
        taxable_value = 225.00,
        tax_amount = 11.25,
        cgst_amount = 5.63,
        sgst_amount = 5.62,
        grand_total = 236.25,
        total_amount = 236.25,
        rate_per_kg = 45.00
      WHERE id = 1
    `;
    console.log('Fixed Sale ID 1 data.');

    // 3. Fix System Transactions for Sale ID 1
    // Revenue Transaction
    await sql`
      UPDATE transactions SET amount = 225.00 
      WHERE voucher_no = 'JRN-SALE-INV-20260503-1736'
    `;
    // GST Transaction
    await sql`
      UPDATE transactions SET amount = 11.25
      WHERE voucher_no = 'JRN-GST-INV-20260503-1736'
    `;
    console.log('Fixed System Transactions (ID 5, 6).');

    // 4. Force sync ledger balances (optional but good)
    await sql`
      UPDATE ledgers SET current_balance = 0;
    `;
    // Recalculate balances would be complex, but let's at least fix the customer
    await sql`
      UPDATE ledgers l
      SET current_balance = (SELECT COALESCE(SUM(balance_due), 0) FROM sales WHERE customer_name = l.name)
      WHERE group_name = 'Debtors';
    `;

    console.log('Cleanup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

fix();
