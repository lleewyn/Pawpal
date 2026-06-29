const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    userLegacyId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    items: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
