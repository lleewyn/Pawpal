const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
    legacyId: { type: String, index: true, unique: true, sparse: true },
    userLegacyId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    productIds: { type: [String], default: [] },
    serviceIds: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
