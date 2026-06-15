const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

// Mapping: thư mục -> depth từ root pages/
const folders = [
    { dir: 'pages/user', depth: 2 },
    { dir: 'pages/shop', depth: 2 },
    { dir: 'pages/services', depth: 2 },
    { dir: 'pages/public', depth: 2 },
    { dir: 'pages/admin', depth: 2 }
];

folders.forEach(({ dir, depth }) => {
    const fullDir = path.join(baseDir, dir);
    if (!fs.existsSync(fullDir)) return;
    
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.html'));
    
    files.forEach(file => {
        const filePath = path.join(fullDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Fix CSS/JS paths: ../assets/ -> ../../assets/
        content = content.replace(/href="\.\.\/assets\//g, 'href="../../assets/');
        content = content.replace(/src="\.\.\/assets\//g, 'src="../../assets/');
        
        // Fix link to index: ../index.html -> ../../index.html
        content = content.replace(/href="\.\.\/index\.html"/g, 'href="../../index.html"');
        
        fs.writeFileSync(filePath, content);
        console.log(`Fixed: ${dir}/${file}`);
    });
});

console.log('All paths fixed!');
