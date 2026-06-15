/**
 * Thêm auth.js vào tất cả HTML pages còn thiếu
 * Chèn trước </body> tag
 */
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

const pages = [
    'pages/user/order-detail.html',
    'pages/user/orders.html',
    'pages/user/pet-archive.html',
    'pages/user/pet-form.html',
    'pages/shop/checkout.html',
    'pages/shop/shop.html',
    'pages/services/booking.html',
    'pages/services/services.html',
    'pages/public/about.html',
    'pages/public/blog.html',
    'pages/public/contact.html',
];

pages.forEach(rel => {
    const filePath = path.join(baseDir, rel);
    if (!fs.existsSync(filePath)) {
        console.log(`SKIP (not found): ${rel}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('auth.js')) {
        console.log(`SKIP (already has auth.js): ${rel}`);
        return;
    }

    // Chèn trước </body>
    const authTag = '    <script src="../../assets/js/auth.js"></script>\n';
    content = content.replace('</body>', authTag + '</body>');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`ADDED auth.js: ${rel}`);
});

console.log('Done!');
