const router = require('express').Router();
const mongoose = require('mongoose');
const Cart = require('../models/Cart');

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    const query = mongoose.isValidObjectId(userId)
        ? { $or: [{ userId }, { userLegacyId: String(userId) }] }
        : { userLegacyId: String(userId) };
    const cart = await Cart.findOne(query).lean();
    res.json(cart || { items: [] });
});

router.put('/:userId', async (req, res) => {
    const { userId } = req.params;
    const payload = { items: Array.isArray(req.body.items) ? req.body.items : [] };
    const query = mongoose.isValidObjectId(userId)
        ? { $or: [{ userId }, { userLegacyId: String(userId) }] }
        : { userLegacyId: String(userId) };

    const updated = await Cart.findOneAndUpdate(
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
