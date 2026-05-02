const mongoose = require('mongoose');

const paddyInwardSchema = new mongoose.Schema({
  entryDate: { type: String, required: true },
  entryTime: { type: String },
  supplierName: { type: String, required: true },
  contactNumber: { type: String },
  village: { type: String },
  paddyVariety: { type: String, required: true },
  grossWeightKg: { type: Number, required: true },
  tareWeightKg: { type: Number, required: true },
  netWeightKg: { type: Number, required: true },
  numberOfBags: { type: Number },
  bagWeightKg: { type: Number },
  moisturePercent: { type: Number },
  brokenPercent: { type: Number },
  impurityPercent: { type: Number },
  ratePerKg: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  deductions: { type: Number, default: 0 },
  payableAmount: { type: Number, required: true },
  paymentMode: { type: String },
  advancePaid: { type: Number, default: 0 },
  balanceAmount: { type: Number },
  vehicleNumber: { type: String },
  driverName: { type: String },
  transportCharges: { type: Number, default: 0 },
  godown: { type: String },
  lotNumber: { type: String },
  stackNumber: { type: String },
  remarks: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PaddyInward', paddyInwardSchema);
