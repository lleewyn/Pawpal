const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    userLegacyId: { type: String, index: true },
    petLegacyId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', index: true },
    serviceName: { type: String, required: true },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    status: { type: String, default: 'upcoming', index: true },
    price: { type: Number, default: 0 },
    branch: { type: String, default: '' },
    staff: { type: String, default: '' },
    note: { type: String, default: '' },
    changeCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
