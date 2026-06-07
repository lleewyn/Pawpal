const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');

// ==========================================
// 1. Compile CSS (Concatenate split stylesheets into assets/css/style.css)
// ==========================================
console.log('Compiling CSS...');
const stylePath = path.join(baseDir, 'assets', 'css', 'style.css');
let styleContent = '';
if (fs.existsSync(stylePath)) {
    styleContent = fs.readFileSync(stylePath, 'utf8');
}

const coreStylesMarker = '/* --- CORE_STYLES_START --- */';
let coreStyles = '';

if (styleContent.includes(coreStylesMarker)) {
    const parts = styleContent.split(coreStylesMarker);
    coreStyles = parts[parts.length - 1].trim();
} else {
    // If no marker, find the Header & Navigation section comment
    const index = styleContent.indexOf('Header & Navigation');
    if (index !== -1) {
        const commentStart = styleContent.lastIndexOf('/*', index);
        if (commentStart !== -1) {
            coreStyles = styleContent.substring(commentStart).trim();
        } else {
            coreStyles = styleContent.substring(index).trim();
        }
    } else {
        const indexHeader = styleContent.indexOf('.main-header');
        if (indexHeader !== -1) {
            coreStyles = styleContent.substring(indexHeader).trim();
        } else {
            coreStyles = styleContent.trim();
        }
    }
}

const cssFilesToConcat = [
    path.join(baseDir, 'assets', 'css', 'tokens', 'colors.css'),
    path.join(baseDir, 'assets', 'css', 'tokens', 'typography.css'),
    path.join(baseDir, 'assets', 'css', 'tokens', 'spacing.css'),
    path.join(baseDir, 'assets', 'css', 'base', 'reset.css'),
    path.join(baseDir, 'assets', 'css', 'components', 'button.css')
];

let concatenatedCss = `/* ==========================================================================\n   PawPal Core Compiled Styles (Do not edit directly above the marker)\n   ========================================================================== */\n\n`;

cssFilesToConcat.forEach(file => {
    if (fs.existsSync(file)) {
        concatenatedCss += fs.readFileSync(file, 'utf8') + '\n\n';
    } else {
        console.warn(`Warning: CSS file not found: ${file}`);
    }
});

concatenatedCss += `${coreStylesMarker}\n\n${coreStyles}\n`;
fs.writeFileSync(stylePath, concatenatedCss, 'utf8');
console.log('CSS compiled successfully!');

// ==========================================
// 2. Sync HTML Components (Header & Footer)
// ==========================================
console.log('Syncing HTML components...');
let headerHtml = fs.readFileSync(path.join(baseDir, 'components', 'header.html'), 'utf8');
let footerHtml = fs.readFileSync(path.join(baseDir, 'components', 'footer.html'), 'utf8');

// Khôi phục các đường dẫn tương đối (../../) trong Header & Footer gốc
headerHtml = headerHtml.replace(/href="\/pages\//g, 'href="../../pages/');
headerHtml = headerHtml.replace(/src="\/assets\//g, 'src="../../assets/');
headerHtml = headerHtml.replace(/href="\/assets\//g, 'href="../../assets/');

footerHtml = footerHtml.replace(/href="\/pages\//g, 'href="../../pages/');
footerHtml = footerHtml.replace(/src="\/assets\//g, 'src="../../assets/');
footerHtml = footerHtml.replace(/href="\/assets\//g, 'href="../../assets/');

// Lưu lại các file component với đường dẫn tương đối chuẩn
fs.writeFileSync(path.join(baseDir, 'components', 'header.html'), headerHtml, 'utf8');
fs.writeFileSync(path.join(baseDir, 'components', 'footer.html'), footerHtml, 'utf8');

// Quét toàn bộ các trang con để nhúng code tĩnh vào
const subDirs = ['user', 'shop', 'services', 'public', 'admin'];

subDirs.forEach(subDir => {
    const pagesDir = path.join(baseDir, 'pages', subDir);
    if (!fs.existsSync(pagesDir)) return;
    
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
    
    files.forEach(file => {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Loại bỏ notification bar thừa ngoài header (vì đã nhúng vào header)
        content = content.replace(/<!-- Notification Bar -->[\s\S]*?<\/div>\s*<\/div>/g, '');
        
        // Loại bỏ toast container thừa (vì đã nhúng vào footer)
        content = content.replace(/<!-- Toast Notification Container -->\s*<div id="toastContainer" class="toast-container"><\/div>/g, '');
        content = content.replace(/<div id="toastContainer" class="toast-container"><\/div>/g, '');
        
        // Nhúng nội dung header.html thực tế vào thẻ header
        const headerRegex = /<header class="main-header" id="mainHeader">[\s\S]*?<\/header>/g;
        content = content.replace(headerRegex, `<header class="main-header" id="mainHeader">\n${headerHtml}\n</header>`);
        
        // Nhúng nội dung footer.html thực tế vào thẻ footer
        const footerRegex = /<footer class="main-footer" id="contact">[\s\S]*?<\/footer>/g;
        content = content.replace(footerRegex, `<footer class="main-footer" id="contact">\n${footerHtml}\n<\/footer>`);
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Successfully synced static components and cleaned layout in: ${subDir}/${file}`);
    });
});

console.log('All static pages and assets have been fully compiled and synced!');

