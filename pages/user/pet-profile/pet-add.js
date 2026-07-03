/* ==========================================================================
   pet-add.js — Handle species "Khác" toggle
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const otherRadio = document.getElementById('other');
    const otherWrap = document.getElementById('otherSpeciesWrap');

    if (otherRadio) {
        otherRadio.addEventListener('change', () => {
            if (otherRadio.checked) otherWrap.classList.remove('d-none'); else otherWrap.classList.add('d-none');
        });
    }

    // KHÔNG reset form khi click backdrop — tránh mất dữ liệu đã nhập
    // Form chỉ reset khi user chủ động bấm nút Đóng hoặc Hủy
});

function resetPetForm() {
    const form = document.getElementById('petForm');
    if (form) form.reset();
    
    document.getElementById('avatarPreview').src = '';
    document.getElementById('otherSpeciesWrap').classList.add('d-none');
}