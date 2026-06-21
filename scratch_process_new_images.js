const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const srcDir = path.join(baseDir, 'assets/images/Ảnh-20260621T163007Z-3-001/Ảnh');
const destImagesDir = path.join(baseDir, 'assets/images');
const dataDir = path.join(baseDir, 'data');

const shopProductsDir = path.join(destImagesDir, 'shop/products');
const bannersDir = path.join(destImagesDir, 'banners');
const hotelDir = path.join(destImagesDir, 'services/hotel');
const spaProcessDir = path.join(destImagesDir, 'services/spa/process');
const spaGalleryDir = path.join(destImagesDir, 'services/spa/gallery');

// 1. Cleanup old directories
console.log('--- Cleaning up old files ---');
[shopProductsDir, hotelDir, spaProcessDir, spaGalleryDir, bannersDir].forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(f => {
            if (f === 'placeholder.webp' && dir === shopProductsDir) return; // Keep placeholder
            fs.unlinkSync(path.join(dir, f));
        });
        console.log(`Cleaned ${dir}`);
    } else {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created ${dir}`);
    }
});

// Helper to copy and normalize files
function copyFiles(srcSubDir, targetDir, prefix = '', lowercase = true) {
    const fullSrc = path.join(srcDir, srcSubDir);
    if (!fs.existsSync(fullSrc)) return [];
    
    let processedFiles = [];
    const files = fs.readdirSync(fullSrc, { withFileTypes: true });
    
    // We might have nested directories (like for spa gallery)
    function processDir(currentDir, currentPrefix = '') {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        entries.forEach(entry => {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                // Determine a safe prefix for the nested directory
                let safeName = entry.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '_').toLowerCase();
                processDir(fullPath, `${currentPrefix}${safeName}_`);
            } else {
                let ext = path.extname(entry.name).toLowerCase();
                if (ext === '.jfif') ext = '.jpg';
                if (ext === '.jpeg') ext = '.jpg';
                
                let baseName = path.basename(entry.name, path.extname(entry.name));
                if (lowercase) baseName = baseName.toLowerCase();
                
                // Remove weird accents if any
                baseName = baseName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '_');
                
                let newFileName = `${prefix}${currentPrefix}${baseName}${ext}`;
                let targetPath = path.join(targetDir, newFileName);
                
                fs.copyFileSync(fullPath, targetPath);
                processedFiles.push(targetPath);
            }
        });
    }
    
    processDir(fullSrc);
    return processedFiles;
}

console.log('\n--- Copying new files ---');
// Banners
copyFiles('Ảnh banner', bannersDir, 'banner_');
// Hotel
copyFiles('Ảnh hotel', hotelDir, 'htl-');
// Spa Process
copyFiles('Ảnh quy trình', spaProcessDir, 'process_');
// Spa Gallery
copyFiles('Ảnh khách', spaGalleryDir, 'cust_');

// Products (combine multiple dirs)
let allProductFiles = [];
allProductFiles = allProductFiles.concat(copyFiles('Ảnh đồ dùng', shopProductsDir, '', true));
allProductFiles = allProductFiles.concat(copyFiles('Ảnh thực phẩm', shopProductsDir, '', true));
allProductFiles = allProductFiles.concat(copyFiles('Ảnh phụ kiện', shopProductsDir, '', true));
allProductFiles = allProductFiles.concat(copyFiles('Ảnh vệ sinh', shopProductsDir, '', true));

console.log(`Copied ${allProductFiles.length} product images.`);

console.log('\n--- Updating sanpham.csv ---');
// Read CSV
const sanphamPath = path.join(dataDir, 'sanpham.csv');
let sanphamLines = fs.readFileSync(sanphamPath, 'utf-8').split('\n');
const sanphamHeader = sanphamLines[0];
let updateCount = 0;

let updatedSanphamData = sanphamLines.slice(1).map(line => {
    if (!line.trim()) return line;
    let cols = line.split('\t');
    let sku = cols[1]; // e.g. TP-HAT-01
    
    if (!sku) return line;

    // Find if any copied product file matches this SKU exactly (ignoring extension)
    let skuLower = sku.toLowerCase();
    
    // We just list the files in shopProductsDir
    let currentProducts = fs.readdirSync(shopProductsDir);
    let matchedFile = currentProducts.find(f => {
        let base = path.basename(f, path.extname(f)).toLowerCase();
        // Exact match or match with underscore (e.g. tp-hat-01_1)
        return base === skuLower;
    });

    if (matchedFile) {
        cols[15] = `assets/images/shop/products/${matchedFile}`;
        updateCount++;
    } else {
        cols[15] = `assets/images/shop/products/placeholder.webp`;
    }
    
    return cols.join('\t');
});

fs.writeFileSync(sanphamPath, [sanphamHeader, ...updatedSanphamData].join('\n'));
console.log(`Updated ${updateCount} image paths in sanpham.csv.`);

// Optionally cleanup the source zip/folder
try {
    fs.rmSync(path.join(baseDir, 'assets/images/Ảnh-20260621T163007Z-3-001'), { recursive: true, force: true });
    console.log('Removed extracted source folder.');
} catch (e) {
    console.error('Failed to remove source folder', e);
}

console.log('Done!');
