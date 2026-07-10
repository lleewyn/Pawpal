const fs = require('fs');
const path = require('path');
const keys = new Set();
function search(dir) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) search(full);
        else if (full.endsWith('.js') || full.endsWith('.html')) {
            const content = fs.readFileSync(full, 'utf8');
            let m;
            const regex = /localStorage\.[sg]etItem\(['"](pawpal_[^'"]+)['"]/g;
            while ((m = regex.exec(content)) !== null) {
                keys.add(m[1]);
            }
        }
    }
}
search('pages');
search('scripts');
console.log(Array.from(keys));
