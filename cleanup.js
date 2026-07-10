const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            // 1. Replace safeParseArray('pawpal_bookings')
            content = content.replace(/safeParseArray\('pawpal_bookings'\)/g, "[]");
            // 2. Replace localStorage.getItem('pawpal_bookings')
            content = content.replace(/localStorage\.getItem\('pawpal_bookings'\)/g, "'[]'");
            // 3. Replace localStorage.setItem('pawpal_bookings', ...)
            content = content.replace(/localStorage\.setItem\('pawpal_bookings',[^)]+\)/g, "/* localStorage.setItem removed */");
            // 4. Replace pawpal_users_db similarly (if any)
            content = content.replace(/localStorage\.getItem\('pawpal_users_db'\)/g, "'[]'");
            content = content.replace(/localStorage\.setItem\('pawpal_users_db',[^)]+\)/g, "/* localStorage.setItem pawpal_users_db removed */");
            // 5. Replace pawpal_pets similarly (if any)
            content = content.replace(/localStorage\.getItem\('pawpal_pets'\)/g, "'[]'");
            content = content.replace(/localStorage\.setItem\('pawpal_pets',[^)]+\)/g, "/* localStorage.setItem pawpal_pets removed */");
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Cleaned: ' + fullPath);
            }
        }
    }
}
processDir('pages');
processDir('scripts');
