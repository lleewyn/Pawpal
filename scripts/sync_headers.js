const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(baseDir, 'pages', 'public', 'landing.html'), 'utf8');

const headerStart = indexHtml.indexOf('<header class="main-header" id="mainHeader">');
const headerEnd = indexHtml.indexOf('</header>', headerStart) + '</header>'.length;
const newHeaderHtml = indexHtml.substring(headerStart, headerEnd);

// Các thư mục con trong pages/
const subDirs = ['user', 'shop', 'services', 'public', 'admin'];

subDirs.forEach(subDir => {
    const pagesDir = path.join(baseDir, 'pages', subDir);
    if (!fs.existsSync(pagesDir)) return;
    
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
    
    files.forEach(file => {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        const oldHeaderStart = content.indexOf('<header class="main-header" id="mainHeader">');
        if (oldHeaderStart !== -1) {
            const oldHeaderEnd = content.indexOf('</header>', oldHeaderStart) + '</header>'.length;
            
            let subPageHeader = newHeaderHtml;
            
            // Fix asset paths (2 levels deep: pages/subdir/)
            subPageHeader = subPageHeader.replace(/src="assets\//g, 'src="../../assets/');
            subPageHeader = subPageHeader.replace(/href="#"/g, 'href="../public/landing.html"');
            
            // Fix links to pages (from root pages/ -> các subdir)
            subPageHeader = subPageHeader.replace(/href="pages\/services\.html"/g, 'href="../services/services.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/shop\.html"/g, 'href="../shop/shop.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/about\.html"/g, 'href="../public/about.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/blog\.html"/g, 'href="../public/blog.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/contact\.html"/g, 'href="../public/contact.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/login\.html"/g, 'href="../public/login.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/booking\.html"/g, 'href="../services/booking.html"');
            
            // Fix nested paths
            subPageHeader = subPageHeader.replace(/href="pages\/services\/services\.html"/g, 'href="../services/services.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/shop\/shop\.html"/g, 'href="../shop/shop.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/public\/about\.html"/g, 'href="../public/about.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/public\/blog\.html"/g, 'href="../public/blog.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/public\/contact\.html"/g, 'href="../public/contact.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/public\/login\.html"/g, 'href="../public/login.html"');
            subPageHeader = subPageHeader.replace(/href="pages\/services\/booking\.html"/g, 'href="../services/booking.html"');
            
            content = content.substring(0, oldHeaderStart) + subPageHeader + content.substring(oldHeaderEnd);
        }
        
        // Add Bootstrap CSS if missing
        if (!content.includes('bootstrap.min.css')) {
            const headEnd = content.indexOf('</head>');
            if (headEnd !== -1) {
                const cssTag = '    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">\n';
                content = content.substring(0, headEnd) + cssTag + content.substring(headEnd);
            }
        }
        
        // Add Bootstrap JS if missing
        if (!content.includes('bootstrap.bundle.min.js')) {
            const bodyEnd = content.indexOf('</body>');
            if (bodyEnd !== -1) {
                const jsTag = '    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmxc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>\n';
                content = content.substring(0, bodyEnd) + jsTag + content.substring(bodyEnd);
            }
        }

        fs.writeFileSync(filePath, content);
    });
});

console.log('Successfully updated headers for all subpages!');
