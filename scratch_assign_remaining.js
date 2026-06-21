const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const shopProductsDir = path.join(baseDir, 'assets/images/shop/products');
const sanphamPath = path.join(baseDir, 'data/sanpham.csv');

let currentProducts = fs.readdirSync(shopProductsDir).filter(f => f !== 'placeholder.webp');
let sanphamLines = fs.readFileSync(sanphamPath, 'utf-8').split('\n');
const sanphamHeader = sanphamLines[0];

// Parse CSV into objects
let products = sanphamLines.slice(1).map(line => {
    if (!line.trim()) return null;
    let cols = line.split('\t');
    return { line, cols, sku: cols[1], imagesStr: cols[17] };
}).filter(p => p);

// Group by prefix (e.g., PK-NEM-06 -> pk-nem)
let prefixMap = {};
products.forEach(p => {
    if (!p.sku) return;
    let parts = p.sku.toLowerCase().split('-');
    if (parts.length >= 3) {
        let prefix = parts[0] + '-' + parts[1]; // e.g., pk-nem
        if (!prefixMap[prefix]) prefixMap[prefix] = [];
        prefixMap[prefix].push(p);
    }
});

let updateCount = 0;

products.forEach(p => {
    if (!p.sku) return;
    let parts = p.sku.toLowerCase().split('-');
    if (parts.length < 3) return;
    let prefix = parts[0] + '-' + parts[1]; // e.g., pk-nem
    let skuLower = p.sku.toLowerCase();

    // Find files matching EXACT SKU (e.g. pk-balo-05, pk-balo-05_2)
    let matchedFiles = currentProducts.filter(f => {
        let base = path.basename(f, path.extname(f)).toLowerCase();
        return base === skuLower || base.startsWith(skuLower + '_');
    });

    // If no exact match, AND this product is the ONLY ONE with this prefix, 
    // assign ALL files starting with the prefix.
    if (matchedFiles.length === 0 && prefixMap[prefix].length === 1) {
        matchedFiles = currentProducts.filter(f => f.toLowerCase().startsWith(prefix + '-'));
    }
    
    // For PK-BALO-05, it had an exact match (pk-balo-05.jpg), but it also should get pk-balo-01 to 04
    // If it's the only product with the prefix, just give it ALL prefix files to be safe
    if (prefixMap[prefix].length === 1) {
        let allPrefixFiles = currentProducts.filter(f => f.toLowerCase().startsWith(prefix + '-'));
        matchedFiles = Array.from(new Set([...matchedFiles, ...allPrefixFiles]));
    }

    matchedFiles.sort();

    if (matchedFiles.length > 0) {
        let imagePaths = matchedFiles.map(m => `assets/images/shop/products/${m}`);
        p.cols[17] = imagePaths.join(',');
        updateCount++;
    } else {
        p.cols[17] = `assets/images/shop/products/placeholder.webp`;
    }
});

let newLines = [sanphamHeader, ...products.map(p => p.cols.join('\t'))];
fs.writeFileSync(sanphamPath, newLines.join('\n'));

console.log(`Assigned images smartly for ${updateCount} products.`);
