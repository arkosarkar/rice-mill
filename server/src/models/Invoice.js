const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoice_no: { type: String, unique: true }, // Format: INV-YYYY-NNNNN
  invoice_date: { type: Date, default: Date.now, required: true },
  invoice_type: {
    type: String,
    enum: ['TAX_INVOICE', 'PROFORMA', 'CREDIT_NOTE', 'DEBIT_NOTE'],
    required: true
  },
  seller: {
    name: { type: String, required: true },
    address: { type: String },
    gstin: { type: String },
    state_code: { type: String }
  },
  buyer: {
    name: { type: String, required: true },
    address: { type: String },
    gstin: { type: String },
    state: { type: String },
    state_code: { type: String }
  },
  supply_type: { type: String, enum: ['INTRASTATE', 'INTERSTATE'], required: true },
  items: [{
    description: { type: String, required: true },
    hsn_code: { type: String },
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
    rate: { type: Number, required: true },
    base_amount: { type: Number, required: true },
    gst_rate: { type: Number, enum: [0, 5, 12, 18], required: true },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    line_total: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  total_cgst: { type: Number, default: 0 },
  total_sgst: { type: Number, default: 0 },
  total_igst: { type: Number, default: 0 },
  grand_total: { type: Number, required: true },
  amount_in_words: { type: String },
  advance_adjusted: { type: Number, default: 0 },
  balance_due: { type: Number, required: true },
  payment_mode: { type: String, enum: ['CASH', 'BANK', 'UPI', 'CREDIT'] },
  payment_status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID'], required: true },
  backorder_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Backorder' },
  transaction_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  notes: { type: String }
}, { timestamps: true });

// Auto-generate invoice_no before saving
invoiceSchema.pre('save', async function(next) {
  if (!this.invoice_no) {
    const date = new Date(this.invoice_date);
    const year = date.getFullYear();
    const count = await mongoose.model('Invoice').countDocuments({
      invoice_date: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.invoice_no = `INV-${year}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
