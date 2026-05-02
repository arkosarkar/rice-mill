const Loan = require('../models/Loan');
const Transaction = require('../models/Transaction');
const { getFinancialYear } = require('../utils/invoiceGenerator');
const mongoose = require('mongoose');
const dayjs = require('dayjs');

/**
 * Create a new loan and auto-generate EMI schedule.
 */
exports.createLoan = async (req, res) => {
  try {
    const { bank_name, loan_type, principal_amount, interest_rate, start_date, emi_amount, emi_day, tenure_months } = req.body;

    const emis = [];
    let remaining = principal_amount;
    let currentDate = dayjs(start_date);

    for (let i = 1; i <= tenure_months; i++) {
      const interest = (remaining * interest_rate) / 100 / 12;
      const principal = emi_amount - interest;
      
      emis.push({
        emi_no: i,
        due_date: currentDate.date(emi_day).toDate(),
        principal,
        interest,
        total: emi_amount,
        status: 'PENDING'
      });

      remaining -= principal;
      currentDate = currentDate.add(1, 'month');
    }

    const loan = await Loan.create({
      bank_name,
      loan_type,
      principal_amount,
      interest_rate,
      start_date,
      end_date: currentDate.subtract(1, 'month').toDate(),
      emi_amount,
      emi_day,
      remaining_balance: principal_amount,
      emis
    });

    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Pay an EMI.
 */
exports.payEMI = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { loan_id, emi_no, payment_mode } = req.body;
    
    const loan = await Loan.findById(loan_id).session(session);
    if (!loan) throw new Error('Loan not found');

    const emi = loan.emis.find(e => e.emi_no === emi_no);
    if (!emi || emi.status === 'PAID') throw new Error('Invalid or already paid EMI');

    // 1. Create transaction
    const txnDate = dayjs();
    const txn = await Transaction.create([{
      date: txnDate.toDate(),
      month: txnDate.format('YYYY-MM'),
      financial_year: getFinancialYear(txnDate.toDate()),
      type: 'EMI',
      category: 'LOAN_EMI',
      party: {
        name: loan.bank_name,
        type: 'BANK'
      },
      amount: {
        base_amount: emi.total,
        gst_applied: false,
        gst_rate: 0,
        gst_amount: 0,
        total_amount: emi.total
      },
      payment_mode: payment_mode || 'BANK',
      is_paid: true,
      loan_ref: {
        loan_id: loan._id,
        principal_component: emi.principal,
        interest_component: emi.interest
      },
      notes: `EMI ${emi.emi_no} payment for ${loan.loan_id}`
    }], { session });

    // 2. Update loan
    emi.status = 'PAID';
    emi.paid_date = new Date();
    emi.txn_ref = txn[0]._id;
    
    loan.total_paid += emi.total;
    loan.remaining_balance -= emi.principal;

    if (loan.remaining_balance <= 0) {
      loan.status = 'CLOSED';
    }

    await loan.save({ session });

    await session.commitTransaction();
    res.json({ success: true, data: loan });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get EMIs due in next 30 days.
 */
exports.getUpcomingEMIs = async (req, res) => {
  try {
    const today = dayjs();
    const next30Days = today.add(30, 'days');

    const loans = await Loan.find({ status: 'ACTIVE' });
    
    const upcoming = [];
    loans.forEach(loan => {
      loan.emis.forEach(emi => {
        if (emi.status === 'PENDING' && dayjs(emi.due_date).isBefore(next30Days)) {
          upcoming.push({
            loan_id: loan.loan_id,
            bank_name: loan.bank_name,
            ...emi.toObject()
          });
        }
      });
    });

    res.json({ success: true, data: upcoming });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
