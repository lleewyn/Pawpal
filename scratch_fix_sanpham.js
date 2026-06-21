const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const shopProductsDir = path.join(baseDir, 'assets/images/shop/products');
const sanphamPath = path.join(baseDir, 'data/sanpham.csv');

// Read current products in directory
let currentProducts = fs.readdirSync(shopProductsDir);

let sanphamLines = fs.readFileSync(sanphamPath, 'utf-8').split('\n');
const sanphamHeader = sanphamLines[0];
let updateCount = 0;

let updatedSanphamData = sanphamLines.slice(1).map(line => {
    if (!line.trim()) return line;
    let cols = line.split('\t');
    let sku = cols[1]; 
    if (!sku) return line;

    let skuLower = sku.toLowerCase();
    
    // Find all files that start with skuLower
    // Exact match: tp-hat-01.jpg
    // Sub-match: tp-hat-01_2.jpg, tp-hat-01_3.png
    let matchedFiles = currentProducts.filter(f => {
        let base = path.basename(f, path.extname(f)).toLowerCase();
        return base === skuLower || base.startsWith(skuLower + '_');
    });

    // Sort to make sure _2, _3 come after the main image
    matchedFiles.sort();

    if (matchedFiles.length > 0) {
        let imagePaths = matchedFiles.map(m => `assets/images/shop/products/${m}`);
        cols[17] = imagePaths.join(',');
        updateCount++;
    } else {
        cols[17] = `assets/images/shop/products/placeholder.webp`;
    }
    
    return cols.join('\t');
});

fs.writeFileSync(sanphamPath, [sanphamHeader, ...updatedSanphamData].join('\n'));
console.log(`Updated ${updateCount} products with new image paths (including extra images).`);
