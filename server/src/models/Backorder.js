const mongoose = require('mongoose');

const backorderSchema = new mongoose.Schema({
  order_id: { type: String, unique: true }, // Format: BO-YYYY-NNNNN
  order_date: { type: Date, default: Date.now, required: true },
  customer: {
    name: { type: String, required: true },
    phone: { type: String },
    gstin: { type: String },
    address: { type: String },
    state: { type: String }
  },
  items: [{
    product_type: { type: String, enum: ['RICE', 'BRAN', 'HUSK', 'BROKEN_RICE'], required: true },
    qty: { type: Number, required: true },
    unit: { type: String, required: true },
    rate_per_unit: { type: Number, required: true },
    gst_rate: { type: Number, enum: [0, 5, 12, 18], default: 0 },
    fulfilled_qty: { type: Number, default: 0 },
    pending_qty: { type: Number, required: true }
  }],
  total_order_value: { type: Number, required: true },
  advance_received: { type: Number, default: 0 },
  advance_txn_ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PARTIAL', 'FULFILLED', 'CANCELLED'],
    default: 'PENDING'
  },
  proforma_invoice_no: { type: String },
  deliveries: [{
    date: { type: Date },
    qty: { type: Number },
    invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    amount: { type: Number }
  }],
  notes: { type: String }
}, { timestamps: true });

// Auto-generate order_id before saving
backorderSchema.pre('save', async function (next) {
  if (!this.order_id) {
    const date = new Date(this.order_date);
    const year = date.getFullYear();
    const count = await mongoose.model('Backorder').countDocuments({
      order_date: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.order_id = `BO-${year}-${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Backorder', backorderSchema);
