import { defineConfig } from 'vite';
import { resolve, extname, relative } from 'path';
import fs from 'fs';

function getHtmlInputs(dir, files = {}) {
    if (!fs.existsSync(dir)) return files;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = resolve(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git' && file !== 'components' && file !== '.agents' && file !== '.vscode') {
                getHtmlInputs(fullPath, files);
            }
        } else if (extname(file) === '.html') {
            const relativePath = relative(resolve(__dirname), fullPath);
            const key = relativePath.replace(/\\/g, '/').replace(/\.html$/, '');
            files[key] = resolve(__dirname, relativePath);
        }
    });
    return files;
}

export default defineConfig({
    root: '.',
    server: {
        port: 3000,
        open: '/pages/public/landing.html',
    },
    build: {
        rollupOptions: {
            input: getHtmlInputs(resolve(__dirname))
        }
    }
});
