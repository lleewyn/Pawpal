const mongoose = require('mongoose');

const careLogSchema = new mongoose.Schema({
    petId: { type: String, index: true, unique: true },
    currentSession: { type: Object, default: {} },
    history: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('CareLog', careLogSchema);
