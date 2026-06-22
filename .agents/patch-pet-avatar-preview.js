const fs = require('fs');

const jsPath = 'd:/Aboutme/MyProject/Pawpal/assets/js/user/pet-profile-page.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Normalize to LF
js = js.replace(/\r\n/g, '\n');

// 1. Update populatePetForm
const targetPopulate = `    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview) {
        avatarPreview.src = pet.avatar || '';
    }`;

const replacementPopulate = `    const avatarPreview = document.getElementById('avatarPreview');
    const avatarCircle = document.getElementById('avatarCircle');
    if (avatarPreview) {
        avatarPreview.src = pet.avatar || '';
        if (pet.avatar && avatarCircle) {
            avatarCircle.classList.add('has-image');
        } else if (avatarCircle) {
            avatarCircle.classList.remove('has-image');
        }
    }`;

// 2. Update resetPetForm
const targetReset = `    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview) avatarPreview.src = '';`;

const replacementReset = `    const avatarPreview = document.getElementById('avatarPreview');
    const avatarCircle = document.getElementById('avatarCircle');
    if (avatarPreview) avatarPreview.src = '';
    if (avatarCircle) avatarCircle.classList.remove('has-image');`;

// 3. Update setupAvatar
const targetSetupAvatar = `function setupAvatar() {
    const input = document.getElementById('avatar-input');
    const preview = document.getElementById('avatarPreview');
    if (input && preview) {
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => preview.src = ev.target.result;
                reader.readAsDataURL(file);
            }
        });
    }
}`;

const replacementSetupAvatar = `function setupAvatar() {
    const input = document.getElementById('avatar-input');
    const preview = document.getElementById('avatarPreview');
    const circle = document.getElementById('avatarCircle');
    if (input && preview) {
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    preview.src = ev.target.result;
                    if (circle) circle.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}`;

if (js.includes(targetPopulate) && js.includes(targetReset) && js.includes(targetSetupAvatar)) {
    js = js.replace(targetPopulate, replacementPopulate);
    js = js.replace(targetReset, replacementReset);
    js = js.replace(targetSetupAvatar, replacementSetupAvatar);
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('Successfully patched avatar preview class toggle in pet-profile-page.js');
} else {
    console.error('Error: target text blocks not found in pet-profile-page.js');
}
