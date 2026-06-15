const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

// Mapping file name -> new path từ pages/
const pathMap = {
    // User pages
    'dashboard.html': '../user/dashboard.html',
    'orders.html': '../user/orders.html',
    'order-detail.html': '../user/order-detail.html',
    'pet-archive.html': '../user/pet-archive.html',
    'pet-form.html': '../user/pet-form.html',
    
    // Shop pages
    'shop.html': '../shop/shop.html',
    'checkout.html': '../shop/checkout.html',
    
    // Services pages
    'services.html': '../services/services.html',
    'booking.html': '../services/booking.html',
    
    // Public pages
    'about.html': '../public/about.html',
    'blog.html': '../public/blog.html',
    'contact.html': '../public/contact.html',
    'login.html': '../public/login.html',
    
    // Admin
    'admin.html': '../admin/index.html'
};

const folders = ['pages/user', 'pages/shop', 'pages/services', 'pages/public', 'pages/admin'];

folders.forEach(dir => {
    const fullDir = path.join(baseDir, dir);
    if (!fs.existsSync(fullDir)) return;
    
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.html'));
    
    files.forEach(file => {
        const filePath = path.join(fullDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace các href không có path prefix (same-level links)
        Object.keys(pathMap).forEach(oldName => {
            const newPath = pathMap[oldName];
            // Match: href="orders.html" hoặc href="shop.html" (không có ../)
            const regex = new RegExp(`href="${oldName}"`, 'g');
            content = content.replace(regex, `href="${newPath}"`);
        });
        
        fs.writeFileSync(filePath, content);
        console.log(`Fixed cross-links: ${dir}/${file}`);
    });
});

console.log('All cross-links fixed!');
