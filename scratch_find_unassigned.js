const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const shopProductsDir = path.join(baseDir, 'assets/images/shop/products');
const sanphamPath = path.join(baseDir, 'data/sanpham.csv');

let currentProducts = fs.readdirSync(shopProductsDir);
let sanphamLines = fs.readFileSync(sanphamPath, 'utf-8').split('\n');

let assignedFiles = new Set();

sanphamLines.slice(1).forEach(line => {
    if (!line.trim()) return;
    let cols = line.split('\t');
    let imagesStr = cols[17];
    if (imagesStr && !imagesStr.includes('placeholder')) {
        let paths = imagesStr.split(',');
        paths.forEach(p => {
            let fname = path.basename(p);
            assignedFiles.add(fname);
        });
    }
});

let unassignedFiles = currentProducts.filter(f => !assignedFiles.has(f) && f !== 'placeholder.webp');
console.log("Unassigned Files:", unassignedFiles.join('\n'));
