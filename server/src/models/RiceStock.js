const mongoose = require('mongoose');

const riceStockSchema = new mongoose.Schema({
  type: { type: String, enum: ['paddy', 'clean_paddy', 'finished_rice', 'by_product'], required: true },
  variety: { type: String, required: true },
  riceType: { type: String }, // e.g., 'Raw', 'Parboiled', 'Steam', 'Broken', 'Bran'
  godown: { type: String, required: true },
  lotNumber: { type: String },
  stackNumber: { type: String },
  totalWeightKg: { type: Number, required: true },
  availableWeightKg: { type: Number, required: true },
  bags: { type: Number, required: true },
  bagWeightKg: { type: Number, required: true },
  costPerKg: { type: Number, default: 0 }, // For COGS calculation
  sourceRef: { type: String }, // ID of inward, cleaning, or production entry
}, { timestamps: true });

module.exports = mongoose.model('RiceStock', riceStockSchema);
