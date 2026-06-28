const router = require('express').Router();
const Booking = require('../models/Booking');

router.get('/', async (req, res) => {
    const items = await Booking.find().sort({ createdAt: -1 });
    res.json(items);
});

router.get('/:id', async (req, res) => {
    const item = await Booking.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Booking not found' });
    res.json(item);
});

router.post('/', async (req, res) => {
    const created = await Booking.create(req.body);
    res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Booking not found' });
    res.json(updated);
});

router.delete('/:id', async (req, res) => {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Booking not found' });
    res.json({ ok: true });
});

module.exports = router;
