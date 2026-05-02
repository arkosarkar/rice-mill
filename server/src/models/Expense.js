const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  date: { type: String, required: true },
  category: { type: String, required: true },
  paidTo: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMode: { type: String, default: 'Cash' },
  status: { type: String, default: 'Approved' },
  approvedBy: { type: String },
  remarks: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
