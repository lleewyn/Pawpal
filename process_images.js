const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const srcDir = 'assets/images/Hình bổ sung thêm nhưng có thể hơi lặp';
const productsDir = 'assets/images/shop/products';
const bannersDir = 'assets/images/banners';
const hotelDir = 'assets/images/services/hotel';
const galleryDir = 'assets/images/services/spa/gallery';
const processDir = 'assets/images/services/spa/process';

[productsDir, bannersDir, hotelDir, galleryDir, processDir].forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
    }
});

let files = [];
function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
            walk(p);
        } else {
            files.push(p);
        }
    }
}
walk(srcDir);

const hashes = new Map();
const toMove = [];

for (const f of files) {
    const buf = fs.readFileSync(f);
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    if (hashes.has(hash)) {
        console.log('Deleting duplicate:', f);
        fs.unlinkSync(f);
    } else {
        hashes.set(hash, f);
        toMove.push(f);
    }
}

// Move files
for (const f of toMove) {
    const basename = path.basename(f);
    let targetDir = null;
    if (f.includes('Ảnh banner')) targetDir = bannersDir;
    else if (f.includes('Ảnh hotel&taxi')) targetDir = hotelDir;
    else if (f.includes('Ảnh khách')) targetDir = galleryDir;
    else if (f.includes('Ảnh quy trình')) targetDir = processDir;
    else if (f.includes('Ảnh thực phẩm') || f.includes('Ảnh vệ sinh') || f.includes('Ảnh đồ dùng') || f.includes('Ảnh phụ kiện')) {
        targetDir = productsDir;
    }

    if (targetDir) {
        const targetPath = path.join(targetDir, basename);
        if (f !== targetPath) {
            // Copy and delete to handle cross-device move issues if any, though renameSync usually works
            fs.copyFileSync(f, targetPath);
            fs.unlinkSync(f);
            console.log(`Moved ${basename} to ${targetDir}`);
        }
    }
}

// Update sanpham.csv
const csvPath = 'data/sanpham.csv';
if (fs.existsSync(csvPath)) {
    let csv = fs.readFileSync(csvPath, 'utf8');
    let lines = csv.split('\n');
    let header = lines[0].split('\t');
    let skuIdx = header.indexOf('Mã sản phẩm (SKU)');
    let imgIdx = header.indexOf('Hình ảnh');
    
    // If we didn't find exactly because of BOM or invisible chars, fallback to indexes
    if (skuIdx === -1) skuIdx = 1;
    if (imgIdx === -1) imgIdx = 17;

    const allProductFiles = fs.readdirSync(productsDir);

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split('\t');
        const sku = cols[skuIdx];
        if (!sku) continue;

        // Find all images matching this SKU
        const matchingFiles = allProductFiles.filter(f => f.startsWith(sku + '.') || f.startsWith(sku + '_'));
        if (matchingFiles.length > 0) {
            // Sort so the one without _ is first
            matchingFiles.sort((a, b) => {
                const aIsMain = a.startsWith(sku + '.');
                const bIsMain = b.startsWith(sku + '.');
                if (aIsMain && !bIsMain) return -1;
                if (!aIsMain && bIsMain) return 1;
                return a.localeCompare(b);
            });
            const paths = matchingFiles.map(f => `assets/images/shop/products/${f}`).join(',');
            cols[imgIdx] = paths;
            lines[i] = cols.join('\t');
        }
    }
    fs.writeFileSync(csvPath, lines.join('\n'), 'utf8');
    console.log('Updated sanpham.csv with new images.');
}
