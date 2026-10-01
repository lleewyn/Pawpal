require('dotenv').config();
const express = require('express');
const path = require('path');
const chatApi = require('./scripts/api/chat.js');
const vnpayApi = require('./scripts/api/vnpay.js');

const app = express();
const port = 3000;

// Cho phép parse body JSON
app.use(express.json());

// 1. Tự động chuyển hướng từ các link cũ có đuôi .html sang Clean URLs chuẩn
const legacyRedirectMap = {
    '/pages/public/landing/landing.html': '/',
    '/pages/public/landing/landing': '/',
    '/pages/shop/shop.html': '/shop',
    '/pages/shop/shop': '/shop',
    '/pages/shop/cart/cart.html': '/cart',
    '/pages/shop/cart/cart': '/cart',
    '/pages/shop/checkout/checkout.html': '/checkout',
    '/pages/shop/checkout/checkout': '/checkout',
    '/pages/services/services.html': '/services',
    '/pages/services/services': '/services',
    '/pages/services/booking/booking.html': '/booking',
    '/pages/services/booking/booking': '/booking',
    '/pages/public/about/about.html': '/about',
    '/pages/public/about/about': '/about',
    '/pages/public/contact/contact.html': '/contact',
    '/pages/public/contact/contact': '/contact',
    '/pages/public/blog/blog.html': '/blog',
    '/pages/public/blog/blog': '/blog',
    '/pages/public/login/login.html': '/login',
    '/pages/public/login/login': '/login',
    '/pages/public/return-guest/return-guest.html': '/return-guest',
    '/pages/public/return-guest/return-guest': '/return-guest'
};

app.use((req, res, next) => {
    const cleanPath = req.path.toLowerCase();
    if (legacyRedirectMap[cleanPath]) {
        return res.redirect(301, legacyRedirectMap[cleanPath]);
    }
    next();
});

// 2. Clean URL Routes (Phục vụ trực tiếp không qua redirect)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/index.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/cart/cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/checkout/checkout.html')));
app.get('/product-detail', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/product-detail/product-detail.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/index.html')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking/booking.html')));
app.get('/booking-success', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking-success/booking-success.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/about/about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/contact/contact.html')));
app.get('/blog', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog/blog.html')));
app.get('/blog-detail', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog-detail/blog-detail.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/login/login.html')));
app.get('/login.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/login/login.css')));
app.get('/login.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/login/login.js')));
app.get('/return-guest', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/return-guest/return-guest.html')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, 'pages/user/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/index/index.html')));

// 3. Phục vụ các file tĩnh (html, css, js) từ thư mục gốc
app.use(express.static(path.join(__dirname, '.'), { extensions: ['html'] }));

// Route cho API Chatbot
app.post('/api/chat', async (req, res) => {
    try {
        await chatApi(req, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route cho Cổng thanh toán VNPAY
app.post('/api/vnpay/create-payment-url', async (req, res) => {
    try {
        await vnpayApi.createPaymentUrl(req, res);
    } catch (error) {
        console.error('[Server] VNPay Route error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`===========================================`);
    console.log(`PawPal Local Server is running!`);
    console.log(`Vui lòng mở trình duyệt và truy cập:`);
    console.log(`http://localhost:${port}/`);
    console.log(`===========================================`);
});
