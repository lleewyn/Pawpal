/* ==========================================================================
   pet-add.js — Handle species "Khác" toggle
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const otherRadio = document.getElementById('other');
    const otherWrap = document.getElementById('otherSpeciesWrap');

    if (otherRadio) {
        otherRadio.addEventListener('change', () => {
            otherWrap.style.display = otherRadio.checked ? 'block' : 'none';
        });
    }

    // Reset form khi mở modal
    const modal = document.getElementById('petFormModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                resetPetForm();
            }
        });
    }
});

export function resetPetForm() {
    const form = document.getElementById('petForm');
    if (form) form.reset();
    
    document.getElementById('avatarPreview').src = '';
    document.getElementById('otherSpeciesWrap').style.display = 'none';
}