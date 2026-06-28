const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    name: { type: String, required: true },
    phone: { type: String, index: true },
    email: { type: String, index: true },
    password: { type: String, default: null },
    role: { type: String, default: 'customer' },
    is_temporary: { type: Boolean, default: false },
    points: { type: Number, default: 0 },
    accountType: { type: String, default: 'Thành viên Mới' },
    tier: { type: String, default: '' },
    address: { type: String, default: '' },
    settings: { type: Object, default: {} },
    notifications: { type: Object, default: {} },
    socialLinks: { type: Object, default: {} },
    avatar: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
