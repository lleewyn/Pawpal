const fs = require('fs');
let js = fs.readFileSync('components/header/header.js', 'utf8');
js = js.replace(/item\.style\.setProperty\('display',\s*'none',\s*'important'\);/g, "item.classList.add('d-none');");
js = js.replace(/item\.style\.setProperty\('display',\s*'',\s*'important'\);/g, "item.classList.remove('d-none');");
js = js.replace(/link\.style\.setProperty\('display',\s*'none',\s*'important'\);/g, "link.classList.add('d-none');");
js = js.replace(/link\.style\.setProperty\('display',\s*'',\s*'important'\);/g, "link.classList.remove('d-none');");
js = js.replace(/lookupBtn\.style\.display\s*=\s*'none';/g, "lookupBtn.classList.add('d-none');");
js = js.replace(/lookupDivider\.style\.display\s*=\s*'none';/g, "lookupDivider.classList.add('d-none');");
js = js.replace(/lookupBtn\.style\.display\s*=\s*'';/g, "lookupBtn.classList.remove('d-none');");
js = js.replace(/lookupDivider\.style\.display\s*=\s*'';/g, "lookupDivider.classList.remove('d-none');");
js = js.replace(/cartBadge\.style\.display\s*=\s*totalItems\s*>\s*0\s*\?\s*'flex'\s*:\s*'none';/g, "if(totalItems > 0) { cartBadge.classList.add('d-flex'); cartBadge.classList.remove('d-none'); } else { cartBadge.classList.add('d-none'); cartBadge.classList.remove('d-flex'); }");
fs.writeFileSync('components/header/header.js', js, 'utf8');

let sb = fs.readFileSync('components/user-sidebar/user-sidebar.js', 'utf8');
sb = sb.replace(/panel\.style\.display\s*=\s*'none';/g, "panel.classList.add('d-none');");
sb = sb.replace(/targetTab\.style\.display\s*=\s*'block';/g, "targetTab.classList.remove('d-none');");
fs.writeFileSync('components/user-sidebar/user-sidebar.js', sb, 'utf8');
console.log('Success');
