const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['numeric', 'alphabetic'], required: true },
  order: { type: Number, required: true }
});

module.exports = mongoose.model('Size', sizeSchema);
