const mongoose = require('mongoose');

const cleaningBatchSchema = new mongoose.Schema({
  processDate: { type: String, required: true },
  shift: { type: String },
  inwardRef: { type: String }, // ID of the paddy inward entry
  paddyVariety: { type: String, required: true },
  sourceGodown: { type: String, required: true },
  inputWeightKg: { type: Number, required: true },
  inputBags: { type: Number },
  preCleaningMoisturePercent: { type: Number },
  stonesKg: { type: Number, default: 0 },
  dustKg: { type: Number, default: 0 },
  strawKg: { type: Number, default: 0 },
  otherWasteKg: { type: Number, default: 0 },
  totalWasteKg: { type: Number, required: true },
  wastePercent: { type: Number },
  cleanOutputKg: { type: Number, required: true },
  outputBags: { type: Number },
  postCleaningMoisturePercent: { type: Number },
  destinationGodown: { type: String, required: true },
  destinationStack: { type: String },
  efficiencyPercent: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('CleaningBatch', cleaningBatchSchema);
