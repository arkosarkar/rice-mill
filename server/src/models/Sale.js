const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  invoiceNo: { type: String },
  invoiceDate: { type: String, required: true },
  customerName: { type: String, required: true },
  paymentMode: { type: String },
  paymentStatus: { type: String },
  items: [{
    riceType: { type: String },
    godown: { type: String },
    requestedQtyKg: { type: Number, required: true },
    deliveredQtyKg: { type: Number, default: 0 },
    backorderQtyKg: { type: Number, default: 0 },
    ratePerKg: { type: Number, required: true },
    amount: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  amountReceived: { type: Number, default: 0 },
  balanceAmount: { type: Number, default: 0 },
  totalDeliveredKg: { type: Number, default: 0 },
  totalBackorderKg: { type: Number, default: 0 },
  status: { type: String, enum: ['Fulfilled', 'Partially Fulfilled', 'Pending'], default: 'Pending' },
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);
