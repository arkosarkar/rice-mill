const Transaction = require('../models/Transaction');
const Party = require('../models/Party');
const { calculateGST } = require('../utils/gstCalculator');
const { getFinancialYear } = require('../utils/invoiceGenerator');
const dayjs = require('dayjs');

/**
 * Add a new transaction.
 */
exports.addTransaction = async (req, res) => {
  try {
    const {
      date,
      type,
      category,
      party,
      amount,
      gst,
      payment_mode,
      is_paid,
      due_date,
      notes,
      quantity,
      rate_per_unit
    } = req.body;

    // 1. Validate amount and party
    if (!amount.base_amount || amount.base_amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid base amount' });
    }

    const partyExists = await Party.findOne({ name: party.name });
    if (!partyExists && party.type !== 'OTHER') {
      // Create party if doesn't exist? For now just log
      console.log('Party not found:', party.name);
    }

    // 2. Calculate GST if applied
    let finalAmount = { ...amount };
    let finalGst = { ...gst };

    if (amount.gst_applied) {
      const gstCalc = calculateGST(amount.base_amount, amount.gst_rate, gst.is_igst);
      finalAmount.gst_amount = gstCalc.gst_amount;
      finalAmount.total_amount = gstCalc.total;
      finalGst.cgst = gstCalc.cgst;
      finalGst.sgst = gstCalc.sgst;
      finalGst.igst = gstCalc.igst;
    } else {
      finalAmount.total_amount = amount.base_amount;
    }

    // 3. Set financial metadata
    const txnDate = dayjs(date || new Date());
    const month = txnDate.format('YYYY-MM');
    const financial_year = getFinancialYear(txnDate.toDate());

    // 4. Create transaction
    const transaction = await Transaction.create({
      date: txnDate.toDate(),
      month,
      financial_year,
      type,
      category,
      party,
      amount: finalAmount,
      gst: finalGst,
      quantity,
      rate_per_unit,
      payment_mode,
      is_paid,
      due_date,
      notes,
      created_by: req.user ? req.user.name : 'System' // Assuming auth middleware
    });

    // 5. Update party outstanding if not paid
    if (!is_paid && partyExists) {
      const outstandingChange = type === 'INCOME' ? -finalAmount.total_amount : finalAmount.total_amount;
      partyExists.current_outstanding += outstandingChange;
      await partyExists.save();
    }

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get daily cash flow.
 */
exports.getDailyCashFlow = async (req, res) => {
  try {
    const dateStr = req.params.date; // YYYY-MM-DD
    const date = dayjs(dateStr).startOf('day');
    const nextDay = date.add(1, 'day');

    // Fetch all paid transactions for the date
    const transactions = await Transaction.find({
      date: { $gte: date.toDate(), $lt: nextDay.toDate() },
      is_paid: true
    });

    // Opening Balance (sum of all is_paid transactions before this date)
    const prevTxns = await Transaction.aggregate([
      { $match: { date: { $lt: date.toDate() }, is_paid: true } },
      {
        $group: {
          _id: null,
          total_in: {
            $sum: {
              $cond: [{ $in: ['$type', ['INCOME', 'LOAN_IN', 'ADVANCE_IN']] }, '$amount.total_amount', 0]
            }
          },
          total_out: {
            $sum: {
              $cond: [{ $in: ['$type', ['EXPENSE', 'EMI', 'LOAN_OUT', 'ADVANCE_OUT']] }, '$amount.total_amount', 0]
            }
          }
        }
      }
    ]);

    const opening_balance = prevTxns.length > 0 ? prevTxns[0].total_in - prevTxns[0].total_out : 0;

    let cash_in_total = 0;
    let cash_out_total = 0;
    const cash_in_breakup = {};
    const cash_out_breakup = {};

    transactions.forEach(txn => {
      const amt = txn.amount.total_amount;
      if (['INCOME', 'LOAN_IN', 'ADVANCE_IN'].includes(txn.type)) {
        cash_in_total += amt;
        cash_in_breakup[txn.category] = (cash_in_breakup[txn.category] || 0) + amt;
      } else {
        cash_out_total += amt;
        cash_out_breakup[txn.category] = (cash_out_breakup[txn.category] || 0) + amt;
      }
    });

    const net_cash_flow = cash_in_total - cash_out_total;
    const closing_balance = opening_balance + net_cash_flow;

    res.json({
      opening_balance,
      cash_in_total,
      cash_in_breakup,
      cash_out_total,
      cash_out_breakup,
      net_cash_flow,
      closing_balance,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get monthly cash flow.
 */
exports.getMonthlyCashFlow = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthStr = `${year}-${month.padStart(2, '0')}`;

    const transactions = await Transaction.find({
      month: monthStr,
      is_paid: true
    });

    // Opening Balance (sum of all is_paid transactions before this month)
    const startOfMonth = dayjs(monthStr).startOf('month').toDate();
    const prevTxns = await Transaction.aggregate([
      { $match: { date: { $lt: startOfMonth }, is_paid: true } },
      {
        $group: {
          _id: null,
          total_in: {
            $sum: {
              $cond: [{ $in: ['$type', ['INCOME', 'LOAN_IN', 'ADVANCE_IN']] }, '$amount.total_amount', 0]
            }
          },
          total_out: {
            $sum: {
              $cond: [{ $in: ['$type', ['EXPENSE', 'EMI', 'LOAN_OUT', 'ADVANCE_OUT']] }, '$amount.total_amount', 0]
            }
          }
        }
      }
    ]);

    const opening_balance = prevTxns.length > 0 ? prevTxns[0].total_in - prevTxns[0].total_out : 0;

    let cash_in_total = 0;
    let cash_out_total = 0;
    const cash_in_breakup = {};
    const cash_out_breakup = {};

    transactions.forEach(txn => {
      const amt = txn.amount.total_amount;
      if (['INCOME', 'LOAN_IN', 'ADVANCE_IN'].includes(txn.type)) {
        cash_in_total += amt;
        cash_in_breakup[txn.category] = (cash_in_breakup[txn.category] || 0) + amt;
      } else {
        cash_out_total += amt;
        cash_out_breakup[txn.category] = (cash_out_breakup[txn.category] || 0) + amt;
      }
    });

    const net_cash_flow = cash_in_total - cash_out_total;
    const closing_balance = opening_balance + net_cash_flow;

    res.json({
      opening_balance,
      cash_in_total,
      cash_in_breakup,
      cash_out_total,
      cash_out_breakup,
      net_cash_flow,
      closing_balance,
      transactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
