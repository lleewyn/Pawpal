const fs = require('fs');
const path = require('path');

// Update index.html
let indexContent = fs.readFileSync('index.html', 'utf8');
indexContent = indexContent.replace(/href=\"#experts\"/g, 'href=\"pages/about.html\"');
indexContent = indexContent.replace(/href=\"#process\"/g, 'href=\"pages/blog.html\"');
indexContent = indexContent.replace(/href=\"#contact\"/g, 'href=\"pages/contact.html\"');
fs.writeFileSync('index.html', indexContent);

// Update pages/*.html
const pagesDir = 'pages';
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
files.forEach(file => {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    content = content.replace(/href=\"\.\.\/index\.html#experts\"/g, 'href=\"about.html\"');
    content = content.replace(/href=\"\.\.\/index\.html#process\"/g, 'href=\"blog.html\"');
    content = content.replace(/href=\"\.\.\/index\.html#contact\"/g, 'href=\"contact.html\"');
    content = content.replace(/href=\"\.\.\/index\.html#shop\"/g, 'href=\"shop.html\"');
    
    content = content.replace(/href=\"#experts\"/g, 'href=\"about.html\"');
    content = content.replace(/href=\"#process\"/g, 'href=\"blog.html\"');
    content = content.replace(/href=\"#contact\"/g, 'href=\"contact.html\"');
    
    fs.writeFileSync(filePath, content);
});
console.log('Navigation links updated successfully!');
