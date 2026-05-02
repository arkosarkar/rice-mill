const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  loan_id: { type: String, unique: true }, // Format: LOAN-YYYY-NNN
  bank_name: { type: String, required: true },
  loan_type: { type: String, enum: ['TERM_LOAN', 'CC', 'OD', 'PERSONAL'], required: true },
  principal_amount: { type: Number, required: true },
  interest_rate: { type: Number, required: true }, // annual %
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  emi_amount: { type: Number },
  emi_day: { type: Number, min: 1, max: 31 },
  total_paid: { type: Number, default: 0 },
  remaining_balance: { type: Number, required: true },
  status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
  emis: [{
    emi_no: { type: Number },
    due_date: { type: Date },
    principal: { type: Number },
    interest: { type: Number },
    total: { type: Number },
    paid_date: { type: Date },
    status: { type: String, enum: ['PAID', 'PENDING', 'OVERDUE'], default: 'PENDING' },
    txn_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
  }]
}, { timestamps: true });

// Auto-generate loan_id before saving
loanSchema.pre('save', async function(next) {
  if (!this.loan_id) {
    const date = new Date(this.start_date);
    const year = date.getFullYear();
    const count = await mongoose.model('Loan').countDocuments({
      start_date: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.loan_id = `LOAN-${year}-${(count + 1).toString().padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
