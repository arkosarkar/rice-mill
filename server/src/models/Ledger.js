const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  entityId: { type: String, required: true }, // Supplier or Customer ID/Name
  entityType: { type: String, enum: ['supplier', 'customer'], required: true },
  transactionDate: { type: Date, default: Date.now },
  referenceType: { type: String, enum: ['inward', 'sale', 'payment', 'expense'], required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  remarks: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
