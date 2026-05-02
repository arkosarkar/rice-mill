const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  party_id: { type: String, unique: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['FARMER', 'CUSTOMER', 'VENDOR', 'BANK', 'OTHER'],
    required: true
  },
  phone: { type: String },
  gstin: { type: String },
  address: { type: String },
  state: { type: String },
  credit_limit: { type: Number, default: 0 },
  current_outstanding: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);
