const fs = require('fs');

const jsPath = 'd:/Aboutme/MyProject/Pawpal/assets/js/services/service-detail.js';
let js = fs.readFileSync(jsPath, 'utf8');

// petGroup and groomerGroup
js = js.replace(/petGroup\.style\.display\s*=\s*'block';/g, "petGroup.classList.remove('d-none');");
js = js.replace(/groomerGroup\.style\.display\s*=\s*'block';/g, "groomerGroup.classList.remove('d-none');");

// faq string template
js = js.replace(/style="display: none;"/g, 'class="d-none"');

// panel style none
js = js.replace(/panel\.style\.display\s*=\s*'none';/g, "panel.classList.add('d-none');\n                    panel.style.display = '';");

// toggleFaqAccordion condition
js = js.replace(/if \(panel\.style\.display === 'none'\)/g, "const isHidden = panel.classList.contains('d-none') || panel.style.display === 'none';\n        if (isHidden)");

// toggleFaqAccordion set block before gsap
js = js.replace(/trigger\.classList\.add\('active'\);/g, "panel.classList.remove('d-none');\n            trigger.classList.add('active');");

// lightbox
js = js.replace(/document\.getElementById\('lightboxModal'\)\.style\.display\s*=\s*'none';/g, "document.getElementById('lightboxModal').classList.add('d-none');");
js = js.replace(/modal\.style\.display\s*=\s*'flex';/g, "modal.classList.remove('d-none');");

// related services container
js = js.replace(/container\.parentElement\.style\.display\s*=\s*'none';/g, "container.parentElement.classList.add('d-none');");

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Fixed service-detail.js');
