const fs = require('fs');
const path = require('path');

const srcDirs = ['components', 'assets', 'data'];
const destDir = path.resolve(__dirname, '..', 'dist');

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(
                path.join(src, childItemName),
                path.join(dest, childItemName)
            );
        });
    } else {
        // Do not overwrite files already built/processed by Vite if they exist
        if (!fs.existsSync(dest)) {
            const destParent = path.dirname(dest);
            if (!fs.existsSync(destParent)) {
                fs.mkdirSync(destParent, { recursive: true });
            }
            fs.copyFileSync(src, dest);
        }
    }
}

console.log('Copying static assets (components, assets, data) to dist...');
srcDirs.forEach(dir => {
    const srcPath = path.resolve(__dirname, '..', dir);
    const destPath = path.join(destDir, dir);
    if (fs.existsSync(srcPath)) {
        copyRecursiveSync(srcPath, destPath);
        console.log(`Copied ${dir} to dist/${dir}`);
    } else {
        console.warn(`Warning: Source directory not found: ${dir}`);
    }
});
console.log('Static assets copy completed!');
