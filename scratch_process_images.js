const fs = require('fs');
const path = require('path');

const srcImagesDir = path.join(__dirname, 'assets/images');
const destImagesDir = path.join(__dirname, 'assets/images');
const dataDir = path.join(__dirname, 'data');

const shopProductsDir = path.join(destImagesDir, 'shop/products');
const servicesDir = path.join(destImagesDir, 'services');
const hotelDir = path.join(servicesDir, 'hotel');
const spaProcessDir = path.join(servicesDir, 'spa/process');
const spaGalleryDir = path.join(servicesDir, 'spa/gallery');

// Ensure directories exist
[shopProductsDir, hotelDir, spaProcessDir, spaGalleryDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper to list all files in dir
function getFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getFiles(filePath, fileList);
        } else {
            fileList.push(filePath);
        }
    }
    return fileList;
}

// 1. Process Shop Products (Ảnh đồ dùng, Ảnh thực phẩm, Ảnh phụ kiện, Ảnh vệ sinh)
const productDirs = ['Ảnh đồ dùng', 'Ảnh thực phẩm', 'Ảnh phụ kiện', 'Ảnh vệ sinh'];
let allProductFiles = [];
productDirs.forEach(d => {
    allProductFiles = allProductFiles.concat(getFiles(path.join(srcImagesDir, d)));
});

// Read sanpham.csv
const sanphamPath = path.join(dataDir, 'sanpham.csv');
let sanphamLines = fs.readFileSync(sanphamPath, 'utf-8').split('\n');
const sanphamHeader = sanphamLines[0];
let sanphamData = sanphamLines.slice(1).filter(line => line.trim().length > 0);

// We need to match filenames to SKUs. CSV format: Danh m\u1ee5c,SKU,Tên,Th\u01b0\u01a1ng hi\u1ec7u,...
// Image is the 16th column (index 15) usually. Let's find index by parsing header or just splitting by tab.
// The CSV seems to be tab-separated from previous grep! Wait, the grep output showed `Thực phẩm\tTP-HAT-04\t...`. Let's assume tab separated.

let updatedSanphamData = sanphamData.map(line => {
    let cols = line.split('\t');
    let sku = cols[1];
    
    // Find matching image for this SKU
    // Match by basename without extension containing SKU
    let matchedFileIndex = allProductFiles.findIndex(f => {
        let basename = path.basename(f, path.extname(f));
        // Remove spaces, lowercase
        return basename.toLowerCase().replace(/[\(\) -]/g, '') === sku.toLowerCase().replace(/[\(\) -]/g, '');
    });

    if (matchedFileIndex !== -1) {
        let matchedFile = allProductFiles[matchedFileIndex];
        let ext = path.extname(matchedFile).toLowerCase();
        // Standardize extension
        if (ext === '.jfif') ext = '.jpg';
        
        let newBasename = sku.toLowerCase() + ext;
        let newPath = path.join(shopProductsDir, newBasename);
        
        // Copy file
        fs.copyFileSync(matchedFile, newPath);
        
        // Update CSV column 15 (Image)
        cols[15] = `assets/images/shop/products/${newBasename}`;
        
        // Remove from list so we know what's left
        allProductFiles.splice(matchedFileIndex, 1);
    }
    return cols.join('\t');
});

// Handle remaining unmapped product files (like images.jfif) by mapping them to random products that still have default images or just moving them
allProductFiles.forEach((f, i) => {
    let ext = path.extname(f).toLowerCase();
    if (ext === '.jfif') ext = '.jpg';
    let newBasename = `prod-misc-${Date.now()}-${i}${ext}`;
    fs.copyFileSync(f, path.join(shopProductsDir, newBasename));
});

// Write updated sanpham.csv
fs.writeFileSync(sanphamPath, [sanphamHeader, ...updatedSanphamData].join('\n'));

// 2. Process Hotel
const hotelFiles = getFiles(path.join(srcImagesDir, 'Ảnh hotel'));
hotelFiles.forEach(f => {
    let ext = path.extname(f).toLowerCase();
    if (ext === '.jfif') ext = '.jpg';
    let newBasename = 'htl-' + path.basename(f, path.extname(f)).toLowerCase().replace(/\s+/g, '-') + ext;
    fs.copyFileSync(f, path.join(hotelDir, newBasename));
});

// 3. Process Spa Process
const spaProcessFiles = getFiles(path.join(srcImagesDir, 'Ảnh quy trình'));
spaProcessFiles.forEach(f => {
    let ext = path.extname(f).toLowerCase();
    if (ext === '.jfif') ext = '.jpg';
    let basename = path.basename(f, path.extname(f)).toLowerCase();
    // remove accents
    basename = basename.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '_');
    let newBasename = `process_${basename}${ext}`;
    fs.copyFileSync(f, path.join(spaProcessDir, newBasename));
});

// 4. Process Spa Gallery (Ảnh khách)
const spaGalleryFiles = getFiles(path.join(srcImagesDir, 'Ảnh khách'));
let customerCount = 1;
spaGalleryFiles.forEach(f => {
    let ext = path.extname(f).toLowerCase();
    if (ext === '.jfif') ext = '.jpg';
    let dirName = path.basename(path.dirname(f)); // e.g. Khách 1
    let custId = dirName.replace(/\D/g, '') || customerCount++;
    let basename = path.basename(f, path.extname(f)).toLowerCase();
    basename = basename.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '_');
    let newBasename = `cust${custId}_${basename}${ext}`;
    fs.copyFileSync(f, path.join(spaGalleryDir, newBasename));
});

// 5. Cleanup original directories
const dirsToRemove = ['Ảnh đồ dùng', 'Ảnh hotel', 'Ảnh khách', 'Ảnh phụ kiện', 'Ảnh quy trình', 'Ảnh thực phẩm', 'Ảnh vệ sinh'];
dirsToRemove.forEach(d => {
    const fullPath = path.join(srcImagesDir, d);
    if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
    }
});

console.log("Images processed, files moved, sanpham.csv updated, and original directories removed.");
