const sql = require('../config/db');

async function createLedger(req, res) {
  try {
    const { name, group_name, opening_balance } = req.body;
    const result = await sql`
      INSERT INTO ledgers (name, group_name, opening_balance, current_balance)
      VALUES (${name}, ${group_name}, ${opening_balance || 0}, ${opening_balance || 0})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create ledger', error: error.message });
  }
}

async function listLedgers(req, res) {
  try {
    const items = await sql`
      SELECT 
        l.*,
        COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM transactions WHERE debit_ledger_id = l.id), 0) as total_debit,
        COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM transactions WHERE credit_ledger_id = l.id), 0) as total_credit,
        COALESCE(CAST(l.opening_balance AS NUMERIC), 0) + 
        COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM transactions WHERE debit_ledger_id = l.id), 0) -
        COALESCE((SELECT SUM(CAST(amount AS NUMERIC)) FROM transactions WHERE credit_ledger_id = l.id), 0) as current_balance
      FROM ledgers l
      ORDER BY l.name ASC
    `;
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ledgers', error: error.message });
  }
}

async function updateLedger(req, res) {
  try {
    const { id } = req.params;
    const { name, group_name, opening_balance } = req.body;
    const result = await sql`
      UPDATE ledgers 
      SET name = ${name}, group_name = ${group_name}, opening_balance = ${opening_balance || 0}
      WHERE id = ${id}
      RETURNING *
    `;
    if (result.length === 0) return res.status(404).json({ message: 'Ledger not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update ledger', error: error.message });
  }
}

async function createTransaction(req, res) {
  try {
    const { 
      transaction_date, voucher_type, debit_ledger_id, 
      credit_ledger_id, amount, narration, ref_module, ref_id 
    } = req.body;

    const voucher_no = `VCH-${Date.now()}`;

    await sql.begin(async sql => {
      await sql`
        INSERT INTO transactions (
          transaction_date, voucher_type, voucher_no, debit_ledger_id, 
          credit_ledger_id, amount, narration, ref_module, ref_id
        ) VALUES (
          ${transaction_date}, ${voucher_type}, ${voucher_no}, ${debit_ledger_id}, 
          ${credit_ledger_id}, ${amount}, ${narration}, ${ref_module}, ${ref_id}
        )
      `;

      await sql`
        UPDATE ledgers SET current_balance = current_balance + ${amount} 
        WHERE id = ${debit_ledger_id}
      `;

      await sql`
        UPDATE ledgers SET current_balance = current_balance - ${amount} 
        WHERE id = ${credit_ledger_id}
      `;
    });

    res.status(201).json({ message: 'Transaction recorded successfully', voucher_no });
  } catch (error) {
    console.error('Transaction Error:', error);
    res.status(500).json({ message: 'Failed to record transaction', error: error.message });
  }
}

async function listTransactions(req, res) {
  try {
    const items = await sql`
      SELECT 
        t.*,
        dl.name as debit_ledger_name,
        cl.name as credit_ledger_name
      FROM transactions t
      JOIN ledgers dl ON t.debit_ledger_id = dl.id
      JOIN ledgers cl ON t.credit_ledger_id = cl.id
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `;
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
}

async function getBalanceSheet(req, res) {
  try {
    const asOf = req.query.asOf || new Date().toISOString().split('T')[0];

    const cashBankRows = await sql`
      SELECT 
        l.name, 
        l.group_name,
        COALESCE(l.opening_balance, 0) + 
        COALESCE((SELECT SUM(amount) FROM transactions WHERE debit_ledger_id = l.id AND transaction_date <= ${asOf}), 0) -
        COALESCE((SELECT SUM(amount) FROM transactions WHERE credit_ledger_id = l.id AND transaction_date <= ${asOf}), 0) as balance
      FROM ledgers l
      WHERE LOWER(l.group_name) IN ('cash-in-hand', 'bank accounts', 'assets')
    `;
    const cashBankTotal = cashBankRows.reduce((sum, r) => sum + Number(r.balance), 0);

    const lastRateRow = await sql`SELECT rate_per_kg FROM paddy_inwards WHERE entry_date <= ${asOf} ORDER BY entry_date DESC, id DESC LIMIT 1`;
    const lastRate = Number(lastRateRow[0]?.rate_per_kg) || 25; 
    const stockRow = await sql`SELECT SUM(available_weight_kg) as total_kg FROM rice_stocks`;
    const stockValue = (Number(stockRow[0]?.total_kg) || 0) * lastRate;

    const receivableRow = await sql`SELECT SUM(balance_due) as total FROM sales WHERE invoice_date <= ${asOf}`;
    const accountsReceivable = Number(receivableRow[0]?.total) || 0;

    const topDebtors = await sql`
      SELECT customer_name as name, SUM(balance_due) as due 
      FROM sales 
      WHERE invoice_date <= ${asOf} AND balance_due > 0 
      GROUP BY customer_name 
      ORDER BY due DESC LIMIT 5
    `;

    const payableRow = await sql`SELECT SUM(balance_amount) as total FROM paddy_inwards WHERE entry_date <= ${asOf}`;
    const accountsPayable = Number(payableRow[0]?.total) || 0;

    const outputGstRow = await sql`SELECT SUM(tax_amount) as total FROM sales WHERE invoice_date <= ${asOf}`;
    const inputGstRow = await sql`SELECT SUM(gst_amount) as total FROM paddy_inwards WHERE entry_date <= ${asOf}`;
    const gstPayable = (Number(outputGstRow[0]?.total) || 0) - (Number(inputGstRow[0]?.total) || 0);

    const capitalRow = await sql`SELECT opening_balance FROM ledgers WHERE name ILIKE 'Capital Account' LIMIT 1`;
    const openingCapital = Number(capitalRow[0]?.opening_balance) || 0;

    const totalSalesRow = await sql`SELECT SUM(taxable_value) as total FROM sales WHERE invoice_date <= ${asOf}`;
    const totalSales = Number(totalSalesRow[0]?.total) || 0;
    
    const weightSoldRow = await sql`SELECT SUM(quantity_kg) as total FROM sales WHERE invoice_date <= ${asOf}`;
    const cogs = (Number(weightSoldRow[0]?.total) || 0) * lastRate;

    const totalExpensesRow = await sql`SELECT SUM(amount) as total FROM expenses WHERE expense_date <= ${asOf}`;
    const totalExpenses = Number(totalExpensesRow[0]?.total) || 0;

    const netProfit = totalSales - cogs - totalExpenses;

    const totalAssets = cashBankTotal + stockValue + accountsReceivable;
    const totalLiabilities = accountsPayable + Math.max(0, gstPayable) + openingCapital + netProfit;

    res.json({
      asOf,
      assets: {
        cashBank: cashBankRows.map(r => ({ name: r.name, balance: Number(r.balance) })),
        cashBankTotal,
        stockValue,
        accountsReceivable,
        topDebtors
      },
      liabilities: {
        accountsPayable,
        gstPayable: Math.max(0, gstPayable),
        openingCapital,
        netProfit
      },
      summary: {
        totalAssets,
        totalLiabilities,
        mismatch: totalAssets - totalLiabilities
      }
    });
  } catch (error) {
    console.error('Balance Sheet Error:', error);
    res.status(500).json({ message: 'Failed to calculate balance sheet', error: error.message });
  }
}

async function getPLStatement(req, res) {
  try {
    const { fromDate, toDate } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
    const start = (fromDate && fromDate !== '') ? fromDate : `${startYear}-04-01`;
    const end = (toDate && toDate !== '') ? toDate : `${startYear + 1}-03-31`;

    // Fetch and aggregate using LOWER(group_name) for robust matching
    const results = await sql`
      SELECT 
        LOWER(l.group_name) as group_key,
        SUM(CASE WHEN t.credit_ledger_id = l.id THEN t.amount ELSE 0 END) as credit_total,
        SUM(CASE WHEN t.debit_ledger_id = l.id THEN t.amount ELSE 0 END) as debit_total
      FROM transactions t
      JOIN ledgers l ON (t.debit_ledger_id = l.id OR t.credit_ledger_id = l.id)
      WHERE t.transaction_date BETWEEN ${start} AND ${end}
      GROUP BY LOWER(l.group_name)
    `;

    const getVal = (key, side = 'debit') => {
      const row = results.find(r => r.group_key === key.toLowerCase());
      return Number(row ? (side === 'debit' ? row.debit_total : row.credit_total) : 0);
    };

    // Mapping to EXACT React Frontend keys
    const riceSalesRevenue = getVal('sales', 'credit') + getVal('direct incomes', 'credit');
    const otherIncome = getVal('indirect incomes', 'credit');
    
    // THE FIX: 'purchases' group -> paddyPurchaseCost
    const paddyPurchaseCost = getVal('purchases', 'debit');
    
    const labourWages = getVal('direct expenses', 'debit');
    const electricityFuel = getVal('power & fuel', 'debit');
    const packagingTransport = getVal('freight & packaging', 'debit');
    const otherExpenses = getVal('indirect expenses', 'debit') + getVal('expenses', 'debit');

    const totalIncome = riceSalesRevenue + otherIncome;
    const totalExpenditure = paddyPurchaseCost + labourWages + electricityFuel + packagingTransport + otherExpenses;
    const netProfit = totalIncome - totalExpenditure;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    
    // Calculate Net GST Liability (Output - Input)
    const outputGst = getVal('Sales', 'credit') * 0.05; // Simplified or fetch from transactions
    // Better: Fetch actual GST from transactions
    const gstResults = await sql`
      SELECT 
        SUM(CASE WHEN t.voucher_type = 'SALE' THEN (t.amount * 0.05) ELSE 0 END) as output_gst,
        SUM(CASE WHEN t.voucher_type = 'PURCHASE' THEN (t.amount * 0.05) ELSE 0 END) as input_gst
      FROM transactions t
      WHERE t.transaction_date BETWEEN ${start} AND ${end}
    `;
    const netGST = (Number(gstResults[0].output_gst) || 0) - (Number(gstResults[0].input_gst) || 0);

    res.json({
      period: { start, end },
      riceSalesRevenue: Number(riceSalesRevenue.toFixed(2)),
      otherIncome: Number(otherIncome.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      paddyPurchaseCost: Number(paddyPurchaseCost.toFixed(2)),
      labourWages: Number(labourWages.toFixed(2)),
      electricityFuel: Number(electricityFuel.toFixed(2)),
      packagingTransport: Number(packagingTransport.toFixed(2)),
      otherExpenses: Number(otherExpenses.toFixed(2)),
      totalExpenditure: Number(totalExpenditure.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(2)),
      netGST: Number(netGST.toFixed(2))
    });
  } catch (error) {
    console.error('P&L Error:', error);
    res.status(500).json({ message: 'Failed to generate P&L Statement', error: error.message });
  }
}

module.exports = {
  createLedger,
  listLedgers,
  updateLedger,
  createTransaction,
  listTransactions,
  getBalanceSheet,
  getPLStatement
};
