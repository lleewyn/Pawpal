document.addEventListener('DOMContentLoaded', () => {
    // Avatar preview
    const avatarInput = document.getElementById('avatar-input');
    if (avatarInput) {
        avatarInput.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = e => {
                document.getElementById('avatarPreview').src = e.target.result;
                document.getElementById('avatarCircle').classList.add('has-image');
            };
            reader.readAsDataURL(file);
        });
    }

    // Hiện input khi chọn "Khác"
    document.querySelectorAll('input[name="species"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const wrap = document.getElementById('otherSpeciesWrap');
            if(wrap) {
                wrap.style.display = this.value === 'other' ? 'block' : 'none';
                if (this.value !== 'other') document.getElementById('otherSpecies').value = '';
            }
        });
    });

    // Basic validation
    const petForm = document.getElementById('petForm');
    if (petForm) {
        petForm.addEventListener('submit', function(e) {
            e.preventDefault();
            let valid = true;

            const name = document.getElementById('petName');
            if (name && !name.value.trim()) { name.classList.add('error'); valid = false; }
            else if (name) name.classList.remove('error');

            const weight = document.getElementById('weight');
            if (weight && (!weight.value || parseFloat(weight.value) <= 0)) { weight.classList.add('error'); valid = false; }
            else if (weight) weight.classList.remove('error');

            const species = document.querySelector('input[name="species"]:checked');
            if (!species) { valid = false; alert('Vui lòng chọn loài thú cưng.'); }
            else if (species.value === 'other') {
                const otherInput = document.getElementById('otherSpecies');
                if (otherInput && !otherInput.value.trim()) { otherInput.classList.add('error'); valid = false; }
                else if (otherInput) otherInput.classList.remove('error');
            }

            if (valid) {
                // Submit logic here
                alert('Đã lưu hồ sơ bé cưng thành công! 🐾');
                setTimeout(() => {
                    window.location.href = 'pet-profile.html';
                }, 1000);
            }
        });
    }

    // Remove error on input
    document.querySelectorAll('.field input').forEach(input => {
        input.addEventListener('input', () => input.classList.remove('error'));
    });
});
