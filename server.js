require('dotenv').config();
const express = require('express');
const path = require('path');
const chatApi = require('./scripts/api/chat.js');
const vnpayApi = require('./scripts/api/vnpay.js');

const app = express();
const port = 3000;

// Cho phép parse body JSON
app.use(express.json());

const getCustomerAuth = () => {
    delete require.cache[require.resolve('./scripts/api/customer_auth.js')];
    return require('./scripts/api/customer_auth.js');
};
app.post('/api/customer/auth/guest', (req, res) => getCustomerAuth().guest(req, res));
app.post('/api/customer/auth/lookup', (req, res) => getCustomerAuth().lookup(req, res));
app.post('/api/customer/auth/login', (req, res) => getCustomerAuth().login(req, res));
app.post('/api/customer/auth/otp/request', (req, res) => getCustomerAuth().requestOtp(req, res));
app.post('/api/customer/auth/otp/complete', (req, res) => getCustomerAuth().completeOtp(req, res));
app.post('/api/customer/auth/me', (req, res) => getCustomerAuth().me(req, res));
app.post('/api/customer/auth/change-password', (req, res) => getCustomerAuth().changePassword(req, res));

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
    '/pages/public/return-guest/return-guest': '/return-guest',
    '/pages/services/booking-success/booking-success.html': '/booking-success',
    '/pages/services/booking-success/booking-success': '/booking-success',
    '/booking-success/booking-success.html': '/booking-success',
    '/booking-success.html': '/booking-success',
    '/pages/shop/payment-success/payment-success.html': '/payment-success',
    '/pages/shop/payment-success/payment-success': '/payment-success',
    '/pages/shop/payment-success.html': '/payment-success',
    '/payment-success.html': '/payment-success',
    '/pages/shop/payment-failed/payment-failed.html': '/payment-failed',
    '/pages/shop/payment-failed/payment-failed': '/payment-failed',
    '/payment-failed.html': '/payment-failed',
    '/pages/shop/vnpay-sandbox/vnpay-sandbox.html': '/vnpay-sandbox',
    '/pages/shop/vnpay-sandbox/vnpay-sandbox': '/vnpay-sandbox',
    '/vnpay-sandbox.html': '/vnpay-sandbox',
    '/pages/admin/index.html': '/admin',
    '/pages/admin/index': '/admin',
    '/pages/admin/admin.html': '/admin',
    '/pages/admin/admin': '/admin',
    '/pages/admin/login/login.html': '/admin/login',
    '/pages/admin/login/login': '/admin/login',
    '/pages/admin/login.html': '/admin/login',
    '/pages/user/index.html': '/user',
    '/pages/user/index': '/user',
    '/pages/user/user.html': '/user',
    '/pages/user/user': '/user'
};

app.use((req, res, next) => {
    const cleanPath = req.path.toLowerCase();
    if (legacyRedirectMap[cleanPath]) {
        const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        return res.redirect(301, legacyRedirectMap[cleanPath] + queryString);
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
app.get('/services.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/services.css')));
app.get('/services.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/services.js')));
app.get('/shop.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/shop.css')));
app.get('/shop.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/shop.js')));
app.get('/booking', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking/booking.html')));
app.get('/booking.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking/booking.css')));
app.get('/booking.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking/booking.js')));
app.get('/booking-success', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking-success/booking-success.html')));
app.get('/booking-success.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking-success/booking-success.html')));
app.get('/booking-success/booking-success.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking-success/booking-success.html')));
app.get('/booking-success.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking-success/booking-success.css')));
app.get('/booking-success.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/booking-success/booking-success.js')));
app.get('/payment-success', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/payment-success/payment-success.html')));
app.get('/payment-success.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/payment-success/payment-success.css')));
app.get('/payment-success.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/payment-success/payment-success.js')));
app.get('/payment-failed', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/payment-failed/payment-failed.html')));
app.get('/payment-failed.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/payment-failed/payment-failed.css')));
app.get('/payment-failed.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/payment-failed/payment-failed.js')));
app.get('/vnpay-sandbox', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/vnpay-sandbox/vnpay-sandbox.html')));
app.get('/vnpay-sandbox.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/vnpay-sandbox/vnpay-sandbox.css')));
app.get('/vnpay-sandbox.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/vnpay-sandbox/vnpay-sandbox.js')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/about/about.html')));
app.get('/about.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/about/about.css')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/contact/contact.html')));
app.get('/contact.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/contact/contact.css')));
app.get('/contact.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/contact/contact.js')));
app.get('/blog', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog/blog.html')));
app.get('/blog.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog/blog.css')));
app.get('/blog.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog/blog.js')));
app.get('/blog-detail', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog-detail/blog-detail.html')));
app.get('/blog-detail.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog-detail/blog-detail.html')));
app.get('/blog-detail/blog-detail.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog-detail/blog-detail.html')));
app.get('/blog-detail.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog-detail/blog-detail.css')));
app.get('/blog-detail.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/blog-detail/blog-detail.js')));
app.get('/service-detail', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/service-detail/service-detail.html')));
app.get('/service-detail.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/service-detail/service-detail.html')));
app.get('/service-detail/service-detail.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/service-detail/service-detail.html')));
app.get('/service-detail.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/service-detail/service-detail.css')));
app.get('/service-detail.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/services/service-detail/service-detail.js')));
app.get('/cart.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/cart/cart.css')));
app.get('/cart.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/cart/cart.js')));
app.get('/checkout.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/checkout/checkout.css')));
app.get('/checkout.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/checkout/checkout.js')));
app.get('/product-detail.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/product-detail/product-detail.html')));
app.get('/product-detail/product-detail.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/product-detail/product-detail.html')));
app.get('/product-detail.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/product-detail/product-detail.css')));
app.get('/product-detail.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop/product-detail/product-detail.js')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/login/login.html')));
app.get('/login.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/login/login.css')));
app.get('/login.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/login/login.js')));
app.get('/return-guest', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/return-guest/return-guest.html')));
app.get('/return-guest.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/return-guest/return-guest.html')));
app.get('/return-guest/return-guest.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/return-guest/return-guest.html')));
app.get('/return-guest.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/return-guest/return-guest.css')));
app.get('/return-guest.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/public/return-guest/return-guest.js')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, 'pages/user/index.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/login/login.html')));
app.get('/admin/login.html', (req, res) => res.redirect(301, '/admin/login'));
app.get('/admin/login/login.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/login/login.css')));
app.get('/admin/login/login.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/login/login.js')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/index.html')));
app.get('/admin/', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/index.html')));
app.get('/admin.css', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/admin.css')));
app.get('/admin.js', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin/admin.js')));
app.use('/modules', express.static(path.join(__dirname, 'pages/admin/modules')));

// 3. Phục vụ các file tĩnh (html, css, js) từ thư mục gốc
app.use(express.static(path.join(__dirname, '.'), { extensions: ['html'] }));

// Route cho API Chatbot (hỗ trợ tải động script AI)
app.post('/api/chat', async (req, res) => {
    try {
        delete require.cache[require.resolve('./scripts/api/chat.js')];
        const handler = require('./scripts/api/chat.js');
        await handler(req, res);
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

// Routes cho Phân hệ Quản trị Nhân sự: Cấp & Quản lý Tài khoản Đăng nhập
const staffAuthApi = require('./scripts/api/staff_auth.js');
app.post('/api/admin/staff/provision-account', staffAuthApi.provisionAccount);
app.post('/api/admin/staff/reset-password', staffAuthApi.resetPassword);
app.post('/api/admin/staff/toggle-account-status', staffAuthApi.toggleAccountStatus);

app.listen(port, () => {
    console.log(`===========================================`);
    console.log(`PawPal Local Server is running!`);
    console.log(`Vui lòng mở trình duyệt và truy cập:`);
    console.log(`http://localhost:${port}/`);
    console.log(`===========================================`);
});
