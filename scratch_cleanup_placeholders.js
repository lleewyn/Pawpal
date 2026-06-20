const fs = require('fs');
const path = require('path');

const productsDir = path.join(__dirname, 'assets/images/shop/products');
const dataDir = path.join(__dirname, 'data');

const PLACEHOLDER_SIZE = 392917; // Old fake placeholder image size

// 1. Find all placeholder files (same size) — keep placeholder.webp itself
const allFiles = fs.readdirSync(productsDir);
const placeholderFiles = allFiles.filter(f => {
    if (f === 'placeholder.webp') return false; // Keep the actual placeholder fallback
    const stat = fs.statSync(path.join(productsDir, f));
    return stat.size === PLACEHOLDER_SIZE;
});

console.log('=== Deleting old placeholder images ===');
placeholderFiles.forEach(f => {
    fs.unlinkSync(path.join(productsDir, f));
    console.log('  Deleted:', f);
});
console.log(`Deleted ${placeholderFiles.length} placeholder files.\n`);

// 2. For each deleted placeholder, check if there's a real image with same SKU but diff ext
// Build a map of what real images exist now
const remaining = fs.readdirSync(productsDir);
const realImages = {};
remaining.forEach(f => {
    const base = path.basename(f, path.extname(f));
    realImages[base] = f;
});
console.log('=== Real images available after cleanup ===');
console.log(Object.values(realImages).sort().join('\n'), '\n');

// 3. Read sanpham.csv and update Image column to use real extension where available
const sanphamPath = path.join(dataDir, 'sanpham.csv');
const lines = fs.readFileSync(sanphamPath, 'utf-8').split('\n');
const header = lines[0];
let updateCount = 0;

const updatedLines = lines.slice(1).map(line => {
    if (!line.trim()) return line;
    const cols = line.split('\t');
    const currentImage = cols[15];
    if (!currentImage) return line;

    // Extract basename from current image path
    const currentBase = path.basename(currentImage, path.extname(currentImage));
    const currentExt = path.extname(currentImage).toLowerCase();

    // If there's a real image with same base name, prefer it
    if (realImages[currentBase]) {
        const newExt = path.extname(realImages[currentBase]).toLowerCase();
        if (newExt !== currentExt) {
            cols[15] = `assets/images/shop/products/${realImages[currentBase]}`;
            updateCount++;
            console.log(`  CSV updated: ${currentBase}${currentExt} -> ${realImages[currentBase]}`);
        }
    } else {
        // No real image found -> fall back to placeholder
        const oldBase = path.basename(currentImage, path.extname(currentImage));
        cols[15] = `assets/images/shop/products/placeholder.webp`;
        console.log(`  No real image for ${oldBase}, falling back to placeholder`);
    }
    return cols.join('\t');
});

fs.writeFileSync(sanphamPath, [header, ...updatedLines].join('\n'));
console.log(`\nUpdated ${updateCount} image paths in sanpham.csv.`);
console.log('Done!');
