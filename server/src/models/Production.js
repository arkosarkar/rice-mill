const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
  processDate: { type: String, required: true },
  cleaningBatchRef: { type: String }, // ID of the cleaning batch
  paddyVariety: { type: String, required: true },
  riceType: { type: String, required: true }, // e.g., 'Raw', 'Parboiled', 'Steam'
  paddyInputKg: { type: Number, required: true },
  premiumRiceKg: { type: Number, default: 0 },
  gradeARiceKg: { type: Number, default: 0 },
  gradeBRiceKg: { type: Number, default: 0 },
  brokenRiceKg: { type: Number, default: 0 },
  totalRiceOutputKg: { type: Number, required: true },
  branKg: { type: Number, default: 0 },
  huskKg: { type: Number, default: 0 },
  otherWasteKg: { type: Number, default: 0 },
  totalByProductsKg: { type: Number, required: true },
  lossKg: { type: Number, default: 0 },
  riceYieldPercent: { type: Number },
  byProductPercent: { type: Number },
  riceStorageGodown: { type: String, required: true },
  riceBags: { type: Number, required: true },
  bagWeightKg: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Production', productionSchema);
