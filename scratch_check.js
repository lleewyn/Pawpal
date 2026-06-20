const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
    if (dir.includes('node_modules') || dir.includes('.git')) return files;
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = dir + '/' + file;
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else {
            files.push(name);
        }
    }
    return files;
}

const allFiles = getFiles('.');
const codeFiles = allFiles.filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css'));
const imgPattern = /(?:src|href|url)\s*=\s*['"]?([^'"\s>)]+\.(?:jpg|jpeg|png|webp|svg|gif))['"]?/gi;

let usedImgs = new Set();
codeFiles.forEach(f => {
    const content = fs.readFileSync(f, 'utf-8');
    let match;
    while ((match = imgPattern.exec(content)) !== null) {
        // clean up CSS urls
        let url = match[1].replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
        usedImgs.add(url);
    }
});

let missing = [];
Array.from(usedImgs).forEach(img => {
    if (img.startsWith('http') || img.startsWith('data:')) return;
    try {
        // Resolve path relative to root if it starts with /, otherwise assume it's relative
        // Actually, just extract the basename and search if any file with that name exists in assets/images
        const basename = path.basename(img);
        missing.push({ original: img, basename: basename });
    } catch (e) {
    }
});

// Get all files in assets/images
let existingImgs = [];
try {
    existingImgs = getFiles('./assets/images').map(f => path.basename(f));
} catch(e) {}

const missingFiles = missing.filter(m => !existingImgs.includes(m.basename));
const uniqueMissing = [...new Set(missingFiles.map(m => m.original))].sort();

console.log(JSON.stringify(uniqueMissing, null, 2));
