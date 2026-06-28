const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    code: { type: String, index: true, unique: true },
    type: { type: String, default: '' },
    value: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    validFrom: { type: String, default: '' },
    validUntil: { type: String, default: '' },
    usageCount: { type: Number, default: 0 },
    maxUsage: { type: Number, default: 0 },
    applicableFor: { type: Array, default: [] },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Voucher', voucherSchema);
