const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    title: { type: String, default: '' },
    type: { type: String, default: '' },
    priority: { type: String, default: '' },
    status: { type: String, default: '' },
    messages: { type: Array, default: [] },
    rating: { type: Number, default: null },
    ratingComment: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
