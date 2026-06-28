const router = require('express').Router();
const Order = require('../models/Order');

router.get('/', async (req, res) => {
    const items = await Order.find().sort({ createdAt: -1 });
    res.json(items);
});

router.get('/:id', async (req, res) => {
    const item = await Order.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Order not found' });
    res.json(item);
});

router.post('/', async (req, res) => {
    const created = await Order.create(req.body);
    res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Order not found' });
    res.json(updated);
});

router.delete('/:id', async (req, res) => {
    const deleted = await Order.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Order not found' });
    res.json({ ok: true });
});

module.exports = router;
