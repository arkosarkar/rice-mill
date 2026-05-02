const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_id: { type: String, unique: true }, // Format: TXN-YYYY-NNNNN
  date: { type: Date, default: Date.now, required: true },
  month: { type: String, required: true }, // YYYY-MM
  financial_year: { type: String, required: true }, // YYYY-YY
  type: {
    type: String,
    enum: ['INCOME', 'EXPENSE', 'EMI', 'LOAN_IN', 'LOAN_OUT', 'ADVANCE_IN', 'ADVANCE_OUT'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'RICE_SALE', 'RICE_SALE_LOOSE', 'BRAN_SALE', 'HUSK_SALE', 'BROKEN_RICE_SALE',
      'MILLING_CHARGES', 'PADDY_PURCHASE', 'LABOUR', 'LABOUR_CONTRACT', 'ELECTRICITY',
      'FUEL', 'MAINTENANCE', 'RENT', 'INSURANCE', 'TRANSPORT_IN', 'TRANSPORT_OUT',
      'BANK_CHARGES', 'CC_INTEREST', 'LOAN_EMI', 'BACKORDER_ADVANCE', 'OTHER_INCOME', 'OTHER_EXPENSE'
    ],
    required: true
  },
  party: {
    name: { type: String, required: true },
    type: { type: String, enum: ['FARMER', 'CUSTOMER', 'VENDOR', 'BANK', 'OTHER'], required: true },
    gstin: { type: String }
  },
  amount: {
    base_amount: { type: Number, required: true },
    gst_applied: { type: Boolean, default: false },
    gst_rate: { type: Number, enum: [0, 5, 12, 18], default: 0 },
    gst_amount: { type: Number, default: 0 },
    total_amount: { type: Number, required: true }
  },
  gst: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    is_igst: { type: Boolean, default: false }
  },
  quantity: {
    value: { type: Number },
    unit: { type: String, enum: ['kg', 'quintal', 'bag', 'liter'] }
  },
  rate_per_unit: { type: Number },
  payment_mode: { type: String, enum: ['CASH', 'BANK', 'UPI', 'CREDIT'], required: true },
  is_paid: { type: Boolean, default: false },
  due_date: { type: Date },
  invoice_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  backorder_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Backorder' },
  loan_ref: {
    loan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    principal_component: { type: Number },
    interest_component: { type: Number }
  },
  notes: { type: String },
  created_by: { type: String }
}, { timestamps: true });

// Auto-generate transaction_id before saving
transactionSchema.pre('save', async function(next) {
  if (!this.transaction_id) {
    const date = new Date(this.date);
    const year = date.getFullYear();
    const count = await mongoose.model('Transaction').countDocuments({
      date: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.transaction_id = `TXN-${year}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
