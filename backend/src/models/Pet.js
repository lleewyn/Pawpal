const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    userLegacyId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true },
    species: { type: String, default: '' },
    breed: { type: String, default: '' },
    gender: { type: String, default: '' },
    weight: { type: Number, default: 0 },
    dob: { type: String, default: '' },
    color: { type: String, default: '' },
    vaccinated: { type: Boolean, default: false },
    allergies: { type: String, default: '' },
    notes: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isArchived: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Pet', petSchema);
