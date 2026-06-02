const fs = require('fs');
const path = require('path');
const baseDir = path.resolve(__dirname, '..');

// Update index.html
let indexContent = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
indexContent = indexContent.replace(/href=\"#experts\"/g, 'href=\"pages/public/about.html\"');
indexContent = indexContent.replace(/href=\"#process\"/g, 'href=\"pages/public/blog.html\"');
indexContent = indexContent.replace(/href=\"#contact\"/g, 'href=\"pages/public/contact.html\"');
fs.writeFileSync(path.join(baseDir, 'index.html'), indexContent);

// Update pages/*/*.html
const subDirs = ['user', 'shop', 'services', 'public', 'admin'];

subDirs.forEach(subDir => {
    const pagesDir = path.join(baseDir, 'pages', subDir);
    if (!fs.existsSync(pagesDir)) return;
    
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
    
    files.forEach(file => {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Fix anchor links from index
        content = content.replace(/href=\"\.\.\/\.\.\/index\.html#experts\"/g, 'href=\"../public/about.html\"');
        content = content.replace(/href=\"\.\.\/\.\.\/index\.html#process\"/g, 'href=\"../public/blog.html\"');
        content = content.replace(/href=\"\.\.\/\.\.\/index\.html#contact\"/g, 'href=\"../public/contact.html\"');
        content = content.replace(/href=\"\.\.\/\.\.\/index\.html#shop\"/g, 'href=\"../shop/shop.html\"');

        content = content.replace(/href=\"#experts\"/g, 'href=\"../public/about.html\"');
        content = content.replace(/href=\"#process\"/g, 'href=\"../public/blog.html\"');
        content = content.replace(/href=\"#contact\"/g, 'href=\"../public/contact.html\"');

        fs.writeFileSync(filePath, content);
    });
});

console.log('Navigation links updated successfully!');
