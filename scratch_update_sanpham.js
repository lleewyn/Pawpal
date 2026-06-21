const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'data/sanpham.csv');
let lines = fs.readFileSync(csvPath, 'utf-8').split('\n');
const header = lines[0];

const imgDir = path.join(__dirname, 'assets/images/shop/products');
const files = fs.readdirSync(imgDir);

let updatedCount = 0;
for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let cols = lines[i].split('\t');
    
    const code = cols[1]; // Mã sản phẩm
    
    // Check if image column is missing, empty, or placeholder
    if (!cols[17] || cols[17].trim() === '' || cols[17].includes('placeholder.webp')) {
        const prefix = code.toLowerCase() + '.';
        const prefix_with_underscore = code.toLowerCase() + '_';
        
        const matches = files.filter(f => f.toLowerCase().startsWith(code.toLowerCase()));
        if (matches.length > 0) {
            // Find main image (doesn't have _2, _3 etc)
            const mainImg = matches.find(f => !f.includes('_')) || matches[0];
            const otherImgs = matches.filter(f => f !== mainImg);
            
            let imgStr = 'assets/images/shop/products/' + mainImg;
            if (otherImgs.length > 0) {
                imgStr += ';' + otherImgs.map(f => 'assets/images/shop/products/' + f).join(';');
            }
            
            cols[17] = imgStr;
            updatedCount++;
            console.log(`Updated ${code} with ${imgStr}`);
        }
    }
    
    lines[i] = cols.join('\t');
}

fs.writeFileSync(csvPath, lines.join('\n'));
console.log('Total updated:', updatedCount);
