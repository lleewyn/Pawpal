const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    type: { type: String, default: '' },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    timeOffsetMinutes: { type: Number, default: 0 },
    read: { type: Boolean, default: false },
    link: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
