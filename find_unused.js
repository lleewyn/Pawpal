const fs = require('fs');
const path = require('path');

const projectDir = 'd:/Aboutme/MyProject/Pawpal';
const dirsToScan = ['assets/images', 'assets/css', 'assets/js', 'pages'];
const allFiles = [];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else {
            allFiles.push(fullPath);
        }
    }
}

dirsToScan.forEach(d => walk(path.join(projectDir, d)));

const sourceFiles = allFiles.filter(f => f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css'));
const allContent = sourceFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

const unused = [];

for (const f of allFiles) {
    const ext = path.extname(f);
    // Ignore .gitkeep, and index.html etc.
    if (ext === '.gitkeep') continue;
    const baseName = path.basename(f);
    
    // Check if the basename exists in the combined content.
    // This is a naive but effective check.
    // To avoid self-reference matching, we count occurrences.
    const regex = new RegExp(baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = allContent.match(regex);
    const count = matches ? matches.length : 0;
    
    // If it's a source file, it naturally appears in its own name or comments maybe,
    // but if count <= 1 and it's not index.html, it might be unused.
    if (count === 0) {
        unused.push(f.replace(projectDir, ''));
    }
}

console.log('Unused files:');
console.log(unused.join('\n'));
