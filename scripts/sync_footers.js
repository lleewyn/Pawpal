const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(baseDir, 'pages', 'public', 'landing.html'), 'utf8');

const footerStart = indexHtml.indexOf('<footer class="main-footer"');
const footerEnd = indexHtml.indexOf('</footer>', footerStart) + '</footer>'.length;
let newFooterHtml = '';
if (footerStart !== -1 && footerEnd > footerStart) {
    newFooterHtml = indexHtml.substring(footerStart, footerEnd);
}

if (!newFooterHtml) {
    console.error('Footer not found in index.html');
    process.exit(1);
}

const subDirs = ['user', 'shop', 'services', 'public', 'admin'];

subDirs.forEach(subDir => {
    const pagesDir = path.join(baseDir, 'pages', subDir);
    if (!fs.existsSync(pagesDir)) return;
    
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

    files.forEach(file => {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        const oldFooterStart = content.indexOf('<footer class="main-footer"');
        if (oldFooterStart !== -1) {
            const oldFooterEnd = content.indexOf('</footer>', oldFooterStart) + '</footer>'.length;
            
            let subPageFooter = newFooterHtml;
            
            // Fix asset paths
            subPageFooter = subPageFooter.replace(/src="assets\//g, 'src="../../assets/');
            
            // Fix links from root pages/ -> subdir
            subPageFooter = subPageFooter.replace(/href="pages\/services\.html"/g, 'href="../services/services.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/shop\.html"/g, 'href="../shop/shop.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/about\.html"/g, 'href="../public/about.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/blog\.html"/g, 'href="../public/blog.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/contact\.html"/g, 'href="../public/contact.html"');
            
            // Fix nested paths
            subPageFooter = subPageFooter.replace(/href="pages\/services\/services\.html"/g, 'href="../services/services.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/shop\/shop\.html"/g, 'href="../shop/shop.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/public\/about\.html"/g, 'href="../public/about.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/public\/blog\.html"/g, 'href="../public/blog.html"');
            subPageFooter = subPageFooter.replace(/href="pages\/public\/contact\.html"/g, 'href="../public/contact.html"');
            
            content = content.substring(0, oldFooterStart) + subPageFooter + content.substring(oldFooterEnd);
            fs.writeFileSync(filePath, content);
        }
    });
});

console.log('Successfully updated footers for all subpages!');
