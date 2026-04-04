const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

stockSchema.index({ sku: 1, size: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
