const router = require('express').Router();
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    const query = mongoose.isValidObjectId(userId)
        ? { $or: [{ userId }, { userLegacyId: String(userId) }] }
        : { userLegacyId: String(userId) };
    const wishlist = await Wishlist.findOne(query).lean();
    res.json(wishlist || { productIds: [], serviceIds: [] });
});

router.put('/:userId', async (req, res) => {
    const { userId } = req.params;
    const payload = {
        productIds: Array.isArray(req.body.productIds) ? req.body.productIds.map(String) : [],
        serviceIds: Array.isArray(req.body.serviceIds) ? req.body.serviceIds.map(String) : []
    };
    const query = mongoose.isValidObjectId(userId)
        ? { $or: [{ userId }, { userLegacyId: String(userId) }] }
        : { userLegacyId: String(userId) };

    const updated = await Wishlist.findOneAndUpdate(
        query,
        {
            ...payload,
            userLegacyId: String(userId),
            ...(mongoose.isValidObjectId(userId) ? { userId } : {})
        },
        { new: true, upsert: true, runValidators: true }
    );

    res.json(updated);
});

module.exports = router;
