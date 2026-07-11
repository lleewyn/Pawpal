import { initPetProfilePage } from './pet-profile-page.js';

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, initializing pet profile page...');
        initPetProfilePage();
    });
} else {
    console.log('DOM already loaded, initializing pet profile page...');
    initPetProfilePage();
}
