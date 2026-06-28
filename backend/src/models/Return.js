const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    orderId: { type: String, index: true },
    rmaId: { type: String, index: true },
    createdAtLegacy: { type: String, default: '' },
    status: { type: String, default: '' },
    reason: { type: String, default: '' },
    type: { type: String, default: '' },
    description: { type: String, default: '' },
    products: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Return', returnSchema);
