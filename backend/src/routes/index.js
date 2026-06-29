const router = require('express').Router();

router.get('/', (req, res) => {
    res.json({
        ok: true,
        message: 'PawPal API is ready',
        collections: ['users', 'pets', 'bookings', 'orders']
    });
});

router.use('/users', require('./users'));
router.use('/pets', require('./pets'));
router.use('/bookings', require('./bookings'));
router.use('/orders', require('./orders'));
router.use('/cart', require('./cart'));
router.use('/wishlist', require('./wishlist'));

module.exports = router;
