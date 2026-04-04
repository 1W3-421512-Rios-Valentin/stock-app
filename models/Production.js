const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  addedToStock: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

productionSchema.index({ sku: 1, size: 1 }, { unique: true });

module.exports = mongoose.model('Production', productionSchema);
