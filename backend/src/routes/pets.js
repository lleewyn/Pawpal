const router = require('express').Router();
const mongoose = require('mongoose');
const Pet = require('../models/Pet');

router.get('/', async (req, res) => {
    const items = await Pet.find().sort({ createdAt: -1 });
    res.json(items);
});

async function findPetByAnyId(id) {
    if (!id) return null;

    if (mongoose.isValidObjectId(id)) {
        const byObjectId = await Pet.findById(id);
        if (byObjectId) return byObjectId;
    }

    return Pet.findOne({ legacyId: String(id) });
}

router.get('/:id', async (req, res) => {
    const item = await findPetByAnyId(req.params.id);
    if (!item) return res.status(404).json({ message: 'Pet not found' });
    res.json(item);
});

router.post('/', async (req, res) => {
    const created = await Pet.create(req.body);
    res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const payload = { ...req.body };
        delete payload._id;

        let updated = null;

        if (mongoose.isValidObjectId(id)) {
            updated = await Pet.findByIdAndUpdate(id, payload, {
                new: true,
                runValidators: true
            });
        }

        if (!updated) {
            updated = await Pet.findOneAndUpdate(
                { legacyId: String(id) },
                payload,
                { new: true, runValidators: true }
            );
        }

        if (!updated) return res.status(404).json({ message: 'Pet not found' });
        res.json(updated);
    } catch (error) {
        console.error('[pets] update failed:', error);
        res.status(400).json({ message: 'Invalid pet update payload' });
    }
});

router.delete('/:id', async (req, res) => {
    const deleted = await Pet.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Pet not found' });
    res.json({ ok: true });
});

module.exports = router;
