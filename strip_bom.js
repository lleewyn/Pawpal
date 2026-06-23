const fs = require('fs');
const path = require('path');

function stripBOM(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Stripped BOM from ${filePath}`);
    } else {
        console.log(`No BOM in ${filePath}`);
    }
}

stripBOM('components/header/header.html');
stripBOM('components/footer/footer.html');
stripBOM('components/user-sidebar/user-sidebar.html');
