const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  size: { type: String, required: true },
  clientId: { type: String, default: 'general' },
  clientName: { type: String, default: 'General' },
  quantity: { type: Number, default: 0 },
  status: { type: String, enum: ['pendiente', 'entregado'], default: 'pendiente' },
  createdAt: { type: Date, default: Date.now }
});

orderSchema.index({ sku: 1, size: 1 });

module.exports = mongoose.model('Order', orderSchema);
