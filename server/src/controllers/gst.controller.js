const Transaction = require('../models/Transaction');

/**
 * Monthly GST report controller.
 */
exports.getMonthlyGSTReport = async (req, res) => {
  try {
    const { year, month } = req.params;
    const monthStr = `${year}-${month.padStart(2, '0')}`;

    // 1. Fetch all transactions for the month
    const transactions = await Transaction.find({ month: monthStr });

    // 2. Initialize GST components
    let outputTax = { cgst: 0, sgst: 0, igst: 0, total: 0 };
    let inputITC = { cgst: 0, sgst: 0, igst: 0, total: 0 };

    // 3. Excluded categories for ITC as per business rules
    const excludedITCCategories = ['PADDY_PURCHASE', 'FUEL', 'LABOUR', 'ELECTRICITY'];

    transactions.forEach(txn => {
      const gst = txn.gst || { cgst: 0, sgst: 0, igst: 0 };
      const txnGstTotal = (gst.cgst || 0) + (gst.sgst || 0) + (gst.igst || 0);

      if (txn.type === 'INCOME') {
        // Output Tax (on Sales/Income)
        outputTax.cgst += (gst.cgst || 0);
        outputTax.sgst += (gst.sgst || 0);
        outputTax.igst += (gst.igst || 0);
        outputTax.total += txnGstTotal;
      } else if (txn.type === 'EXPENSE' && txn.amount.gst_applied) {
        // Input Tax Credit (on Expenses, if not excluded)
        if (!excludedITCCategories.includes(txn.category)) {
          inputITC.cgst += (gst.cgst || 0);
          inputITC.sgst += (gst.sgst || 0);
          inputITC.igst += (gst.igst || 0);
          inputITC.total += txnGstTotal;
        }
      }
    });

    // 4. Net Payable calculation
    const netPayable = outputTax.total - inputITC.total;
    const carryForward = netPayable < 0;

    res.json({
      success: true,
      data: {
        month: monthStr,
        output_tax: outputTax,
        input_itc: inputITC,
        net_payable: Math.abs(netPayable),
        carry_forward: carryForward,
        transactions_count: transactions.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
