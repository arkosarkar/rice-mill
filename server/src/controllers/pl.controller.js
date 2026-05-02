const Transaction = require('../models/Transaction');
const Backorder = require('../models/Backorder');
const dayjs = require('dayjs');

/**
 * Get monthly Profit and Loss statement.
 */
exports.getMonthlyPL = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthStr = `${year}-${month.padStart(2, '0')}`;

    // 1. Fetch all transactions for the month (exclude GST from income/expense)
    const transactions = await Transaction.find({ month: monthStr });

    // 2. Categories mapping for income/expenses
    const incomeCategories = ['RICE_SALE', 'RICE_SALE_LOOSE', 'BRAN_SALE', 'HUSK_SALE', 'BROKEN_RICE_SALE', 'MILLING_CHARGES', 'OTHER_INCOME'];
    const directCostCategories = ['PADDY_PURCHASE', 'TRANSPORT_IN', 'PACKAGING'];
    const operatingExpenseCategories = ['LABOUR', 'LABOUR_CONTRACT', 'ELECTRICITY', 'FUEL', 'MAINTENANCE', 'RENT', 'INSURANCE', 'TRANSPORT_OUT', 'OTHER_EXPENSE'];

    let totalIncome = 0;
    let directCost = 0;
    let operatingExpenses = 0;
    let loanInterest = 0;

    transactions.forEach(txn => {
      const baseAmt = txn.amount.base_amount;
      if (incomeCategories.includes(txn.category)) {
        totalIncome += baseAmt;
      } else if (directCostCategories.includes(txn.category)) {
        directCost += baseAmt;
      } else if (operatingExpenseCategories.includes(txn.category)) {
        operatingExpenses += baseAmt;
      } else if (txn.category === 'LOAN_EMI' || txn.type === 'EMI') {
        // From user request: loan interest only (from loan_ref.interest_component)
        if (txn.loan_ref && txn.loan_ref.interest_component) {
          loanInterest += txn.loan_ref.interest_component;
        }
      }
    });

    // 3. Profit calculations
    const grossProfit = totalIncome - directCost;
    const operatingProfit = grossProfit - operatingExpenses;
    const netProfit = operatingProfit - loanInterest;

    // 4. Backorder pending value (informational memo field)
    const pendingBackorders = await Backorder.aggregate([
      { $match: { status: { $in: ['PENDING', 'CONFIRMED', 'PARTIAL'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          total_pending_value: {
            $sum: { $multiply: ['$items.pending_qty', '$items.rate_per_unit'] }
          }
        }
      }
    ]);

    const backorderPendingValue = pendingBackorders.length > 0 ? pendingBackorders[0].total_pending_value : 0;

    res.json({
      success: true,
      data: {
        total_income: totalIncome,
        direct_cost: directCost,
        gross_profit: grossProfit,
        operating_expenses: operatingExpenses,
        operating_profit: operatingProfit,
        financial_expenses: loanInterest,
        net_profit: netProfit,
        memo_fields: {
          backorder_pending_value: backorderPendingValue
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
