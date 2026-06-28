const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    userLegacyId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, default: 'placed', index: true },
    paymentStatus: { type: String, default: 'unpaid', index: true },
    paymentMethod: { type: String, default: '' },
    createdAtLegacy: { type: String, default: '' },
    updatedAtLegacy: { type: String, default: '' },
    delivery: { type: Object, default: {} },
    products: { type: Array, default: [] },
    pricing: { type: Object, default: {} },
    timeline: { type: Array, default: [] },
    allowedActions: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
