const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(filePath));
        } else { 
            if (filePath.endsWith('.html')) results.push(filePath);
        }
    });
    return results;
}

const htmlFiles = walk('d:/Aboutme/MyProject/Pawpal/pages');

let modifiedCount = 0;

htmlFiles.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');

    // Look for the block of scripts near the end. Usually starting with <!-- Scripts --> or just `<script` near `</body>`
    // We will match everything from <!-- Scripts --> up to </body> (exclusive)
    const scriptBlockRegex = /([\s\S]*?)(\s*<!-- Scripts -->[\s\S]*?)(<\/body>)/i;
    const match = scriptBlockRegex.exec(html);

    if (match) {
        let beforeScripts = match[1];
        let scriptsBlock = match[2];
        let bodyEnd = match[3];

        // Ensure we add defer to any <script src="..."> that does not have defer, async, or type="module"
        scriptsBlock = scriptsBlock.replace(/<script([^>]*src=[^>]*)>/gi, (tag, attrs) => {
            if (attrs.includes('defer') || attrs.includes('async') || attrs.includes('type="module"')) {
                return tag;
            }
            return `<script${attrs} defer>`;
        });

        // We have to be careful with inline scripts. If there's an inline script doing DOM manipulation, it will break.
        // Let's wrap inline scripts with DOMContentLoaded, EXCEPT for Auth Guards.
        // We'll replace <script>...</script> (inline, no src)
        scriptsBlock = scriptsBlock.replace(/<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi, (tag, attrs, content) => {
            // If it's a module, it's automatically deferred
            if (attrs.includes('type="module"')) {
                return tag;
            }
            // If it contains Auth Guard logic, keep it as is (so it runs synchronously)
            if (content.includes('pawpal_current_user') || content.includes('localStorage')) {
                // Wait, if it ALSO contains DOM logic, we should wrap the DOM logic.
                // It's complex. Let's just wrap the loadSidebar synchronously
                if (content.includes('loadSidebar') && content.includes('XMLHttpRequest')) {
                    content = content.replace(/\(function loadSidebar\(\) \{[\s\S]*?\}\)\(\);/g, 
                        "document.addEventListener('DOMContentLoaded', function() { $& });");
                }
                return `<script${attrs}>${content}</script>`;
            }
            
            // For other generic inline scripts, wrap in DOMContentLoaded to be safe
            // unless it already has DOMContentLoaded inside.
            if (!content.includes('DOMContentLoaded')) {
                return `<script${attrs}>\ndocument.addEventListener('DOMContentLoaded', function() {\n${content}\n});\n</script>`;
            }
            return `<script${attrs}>${content}</script>`;
        });

        // Reconstruct HTML:
        // Remove the scripts block from the bottom
        html = beforeScripts + '\\n' + bodyEnd;

        // Insert into <head>
        html = html.replace('</head>', scriptsBlock + '\\n</head>');

        fs.writeFileSync(file, html, 'utf8');
        modifiedCount++;
    }
});

console.log(`Moved scripts to <head> in ${modifiedCount} files.`);
