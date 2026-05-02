const sql = require('../config/db');

/**
 * listExpenses — Fetches all expenses from the database
 */
async function listExpenses(req, res) {
  try {
    const items = await sql`
      SELECT
        id as "_id",
        expense_date as "date",
        category,
        paid_to as "paidTo",
        amount,
        payment_mode as "paymentMode",
        remarks,
        expense_type as "expenseType",
        created_at as "createdAt"
      FROM expenses
      ORDER BY created_at DESC
    `;
    res.json(items);
  } catch (error) {
    console.error('SQL Error in expenses list:', error);
    res.status(500).json({ message: 'Failed to load expenses', error: error.message });
  }
}

/**
 * createExpense — Atomic transaction for saving expense and creating double-entry
 */
async function createExpense(req, res) {
  try {
    const { date, category, paidTo, amount, paymentMode, expenseType, remarks } = req.body;
    const expenseAmt = Number(amount) || 0;

    // 1. Validation
    if (!date || !category || !paidTo || !expenseAmt) {
      return res.status(400).json({ message: 'Missing required fields: date, category, paidTo, or amount.' });
    }

    const cashBankName = (paymentMode || '').toLowerCase().includes('bank') ? 'SBI - Main Account' : 'Cash in Hand';
    
    // Group Mapping: Ensure correct accounting groups
    const ledgerGroup = (expenseType === 'Direct Expense') ? 'Direct Expenses' : 'Indirect Expenses';

    const voucherNo = `VCH-EXP-${Date.now()}`;

    // 2. Atomic Transaction
    const result = await sql.begin(async sql => {
      /* 
      // A. Overdraft / Balance Validation (Disabled to allow early setup)
      const balanceRes = await sql`SELECT id, current_balance FROM ledgers WHERE name = ${cashBankName}`;
      if (balanceRes.length > 0) {
        const currentBalance = Number(balanceRes[0].current_balance) || 0;
        if (expenseAmt > currentBalance) {
          throw new Error('Insufficient Funds: Transaction Denied');
        }
      }
      */

      // B. Insert Expense Record
      const expInsert = await sql`
        INSERT INTO expenses (expense_date, category, paid_to, amount, payment_mode, remarks, expense_type)
        VALUES (${date}, ${category}, ${paidTo}, ${expenseAmt}, ${paymentMode}, ${remarks}, ${expenseType})
        RETURNING *
      `;
      const insertedExp = expInsert[0];

      // C. Resolve Ledgers (Ensure Category Ledger exists with correct group)
      const expLedger = await sql`
        INSERT INTO ledgers (name, group_name) 
        VALUES (${category}, ${ledgerGroup}) 
        ON CONFLICT (name) 
        DO UPDATE SET group_name = EXCLUDED.group_name 
        RETURNING id
      `;
      const expLedgerId = expLedger[0].id;

      const assetLedger = await sql`
        INSERT INTO ledgers (name, group_name) 
        VALUES (${cashBankName}, 'Cash-in-hand') 
        ON CONFLICT (name) 
        DO UPDATE SET name = EXCLUDED.name 
        RETURNING id
      `;
      const assetLedgerId = assetLedger[0].id;

      // D. Update Ledger Balances (Double Entry Impact)
      // Debit Expense (Increases balance in P&L sense, but ledger track as Dr)
      await sql`UPDATE ledgers SET current_balance = current_balance + ${expenseAmt} WHERE id = ${expLedgerId}`;
      
      // Credit Cash/Bank (Decreases balance)
      await sql`UPDATE ledgers SET current_balance = current_balance - ${expenseAmt} WHERE id = ${assetLedgerId}`;

      // E. Create Journal Entry
      await sql`
        INSERT INTO transactions (
          transaction_date, voucher_type, voucher_no, debit_ledger_id, 
          credit_ledger_id, amount, narration, ref_module, ref_id
        ) VALUES (
          ${date}, 'PAYMENT', ${voucherNo}, ${expLedgerId}, 
          ${assetLedgerId}, ${expenseAmt}, ${`Expense: ${category} - Paid to ${paidTo}`}, 
          'EXPENSE', ${insertedExp.id.toString()}
        )
      `;

      return insertedExp;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Expense Save Error:', error);
    res.status(error.message.includes('Insufficient Funds') ? 400 : 500)
       .json({ message: error.message || 'Failed to save expense' });
  }
}

/**
 * deleteExpense — Deletes expense and its transaction
 */
async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    await sql.begin(async sql => {
      // Find the expense to get amount and ledgers for reversal
      const exp = await sql`SELECT * FROM expenses WHERE id = ${id}`;
      if (exp.length === 0) throw new Error('Expense not found');

      // Delete linked transaction first
      await sql`DELETE FROM transactions WHERE ref_module = 'EXPENSE' AND ref_id = ${id}`;
      
      // Delete expense
      await sql`DELETE FROM expenses WHERE id = ${id}`;
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Expense Delete Error:', error);
    res.status(500).json({ message: 'Failed to delete expense', error: error.message });
  }
}

module.exports = {
  listExpenses,
  createExpense,
  deleteExpense
};
