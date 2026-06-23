/* ==========================================================================
   pet-profile-page.js — Main logic
   ========================================================================== */

import { getPets, savePets, generatePetId, calcAge, showToast } from './pet-profile.js';

export function initPetProfilePage() {
    console.log(' Pet Profile Page init...');
    
    renderPetGrids();
    setupForm();
    setupTabs();
    setupAvatar();
    setupSpeciesToggle();
    setupDeleteModal();
}

let editingPetId = null;

function openPetFormModal(petId = null) {
    const modal = document.getElementById('petFormModal');
    const petIdInput = document.getElementById('petId');

    if (!modal || !petIdInput) return;

    editingPetId = petId;
    if (petId) {
        const pet = getPets().find(p => p.id === petId);
        if (pet) {
            petIdInput.value = pet.id;
            populatePetForm(pet);
        }
    } else {
        petIdInput.value = '';
        resetPetForm();
    }

    modal.classList.add('active');
}

function populatePetForm(pet) {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };
    const setChecked = (selector, value) => {
        document.querySelectorAll(selector).forEach(r => { if (r.value === value) r.checked = true; });
    };

    setValue('petName', pet.name || '');
    setChecked('input[name="species"]', pet.species);

    const otherWrap = document.getElementById('otherSpeciesWrap');
    if (pet.species === 'other' && otherWrap) {
        otherWrap.classList.remove('d-none');
        setValue('otherSpecies', pet.otherSpecies || '');
    } else {
        if (otherWrap) otherWrap.classList.add('d-none');
        setValue('otherSpecies', '');
    }

    setValue('breed', pet.breed || '');
    setChecked('input[name="gender"]', pet.gender);
    setValue('weight', pet.weight || '');
    setValue('dob', pet.dob || '');
    setValue('color', pet.color || '');
    const vaccinatedEl = document.getElementById('vaccinated');
    if (vaccinatedEl) vaccinatedEl.checked = pet.vaccinated || false;
    setValue('allergies', pet.allergies || '');
    const notesEl = document.getElementById('notes');
    if (notesEl) notesEl.value = pet.notes || '';
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarCircle = document.getElementById('avatarCircle');
    if (avatarPreview) {
        avatarPreview.src = pet.avatar || '';
        if (pet.avatar && avatarCircle) {
            avatarCircle.classList.add('has-image');
        } else if (avatarCircle) {
            avatarCircle.classList.remove('has-image');
        }
    }
}

function resetPetForm() {
    const form = document.getElementById('petForm');
    if (form) form.reset();
    editingPetId = null;
    const petIdInput = document.getElementById('petId');
    if (petIdInput) petIdInput.value = '';
    const otherSpeciesWrap = document.getElementById('otherSpeciesWrap');
    if (otherSpeciesWrap) otherSpeciesWrap.classList.add('d-none');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarCircle = document.getElementById('avatarCircle');
    if (avatarPreview) {
        avatarPreview.src = '';
        if (avatarCircle) {
            avatarCircle.classList.remove('has-image');
        }
    }
    document.querySelectorAll('.error-msg').forEach(el => el.classList.add('d-none'));
}

// Render danh sách
function renderPetGrids() {
    const pets = getPets();
    const activeGrid = document.getElementById('activePetGrid');
    const archiveGrid = document.getElementById('archivePetGrid');

    const activePets = pets.filter(p => !p.isArchived);
    const archivedPets = pets.filter(p => p.isArchived);

    // Active
    if (activeGrid) {
        activeGrid.innerHTML = '';
        if (activePets.length === 0) {
            document.getElementById('emptyStateActive').classList.remove('d-none');
        } else {
            document.getElementById('emptyStateActive').classList.add('d-none');
            activePets.forEach(pet => activeGrid.appendChild(createPetCard(pet)));
            
            // Append the "Thêm bé mới" action card at the end of active grid
            const addCard = document.createElement('div');
            addCard.className = 'pet-card pet-card-add-new';
            addCard.style.border = '2px dashed #cbd5e1';
            addCard.classList.remove('d-none');
            addCard.style.flexDirection = 'column';
            addCard.style.alignItems = 'center';
            addCard.style.justifyContent = 'center';
            addCard.style.textAlign = 'center';
            addCard.style.padding = '32px 24px';
            addCard.style.minHeight = '300px';
            addCard.style.background = '#f8fafc';
            addCard.style.cursor = 'pointer';
            
            addCard.innerHTML = `
                <div class="add-card-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <h3>Thêm bé mới</h3>
                <p>Nhấn để đăng ký hồ sơ cho thành viên mới của gia đình.</p>
            `;
            addCard.addEventListener('click', () => {
                openPetFormModal();
            });
            activeGrid.appendChild(addCard);
        }
    }

    // Archive
    if (archiveGrid) {
        archiveGrid.innerHTML = '';
        if (archivedPets.length === 0) {
            document.getElementById('emptyStateArchive').classList.remove('d-none');
        } else {
            document.getElementById('emptyStateArchive').classList.add('d-none');
            archivedPets.forEach(pet => archiveGrid.appendChild(createPetCard(pet, true)));
        }
    }
}

function createPetCard(pet, isArchived = false) {
    const card = document.createElement('div');
    card.className = `pet-card ${isArchived ? 'pet-card-archived' : ''}`;
    
    card.innerHTML = `
        <div class="pet-card-header">
            ${pet.avatar ? 
                `<img src="${pet.avatar}" class="pet-avatar" alt="${pet.name}">` : 
                `<div class="pet-avatar-placeholder"></div>`
            }
            <div class="pet-card-info">
                <h3 class="pet-name">${pet.name}</h3>
                <div class="pet-id">${pet.id}</div>
                <div class="pet-meta">
                    <span>${getSpeciesName(pet)}</span>
                    <span class="pet-gender-badge">${pet.gender === 'male' ? ' Đực' : ' Cái'}</span>
                </div>
            </div>
        </div>
        <div class="pet-card-body">
            <div class="pet-info-row">
                <span class="pet-info-label">Cân nặng</span>
                <span class="pet-info-value">${pet.weight} kg</span>
            </div>
            <div class="pet-info-row">
                <span class="pet-info-label">Tuổi</span>
                <span class="pet-info-value">${calcAge(pet.dob)}</span>
            </div>
            <div class="pet-info-row">
                <span class="pet-info-label">Sở thích / Lưu ý</span>
                <span class="pet-info-value">${pet.notes && pet.notes.trim() !== '' 
                    ? (pet.notes.length > 65 ? pet.notes.substring(0, 62) + '...' : pet.notes) 
                    : 'Chưa biết'}</span>
            </div>
        </div>
        <div class="pet-card-actions">
            ${isArchived ? 
                `<button class="btn-card-action" onclick="restorePet('${pet.id}')">Khôi phục</button>` :
                `<button class="btn-card-action" onclick="editPet('${pet.id}')">Sửa</button>
                 <button class="btn-card-action btn-danger" onclick="deletePet('${pet.id}')">Xóa</button>`
            }
        </div>
    `;
    return card;
}

// Hàm lấy tên loài + giống (hỗ trợ loài "Khác")
function getSpeciesName(pet) {
    if (!pet) return 'Thú cưng';

    let speciesName = '';

    if (pet.species === 'other' && pet.otherSpecies && pet.otherSpecies.trim() !== '') {
        speciesName = pet.otherSpecies.trim();
    } else {
        switch(pet.species) {
            case 'dog': speciesName = 'Chó'; break;
            case 'cat': speciesName = 'Mèo'; break;
            case 'rabbit': speciesName = 'Thỏ'; break;
            default: speciesName = 'Thú cưng';
        }
    }

    // Kết hợp với giống (breed)
    if (pet.breed && pet.breed.trim() !== '') {
        return `${speciesName} ${pet.breed.trim()}`;
    }

    return speciesName;
}

// Form
function setupForm() {
    const form = document.getElementById('petForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const petNameField = document.getElementById('petName');
        const petName = petNameField?.value.trim() || '';
        const species = document.querySelector('input[name="species"]:checked')?.value;
        const otherSpecies = document.getElementById('otherSpecies')?.value.trim() || '';
        const breedField = document.getElementById('breed');
        const breed = breedField ? breedField.value.trim() : '';
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        const weight = parseFloat(document.getElementById('weight')?.value || '');
        const dob = document.getElementById('dob')?.value || '';
        const color = document.getElementById('color')?.value.trim() || '';
        const vaccinated = document.getElementById('vaccinated')?.checked || false;
        const allergies = document.getElementById('allergies')?.value.trim() || '';
        const notes = document.getElementById('notes')?.value.trim() || '';
        const avatarPreview = document.getElementById('avatarPreview');
        const avatar = avatarPreview?.src || '';
        const petId = document.getElementById('petId')?.value || null;

        const errors = [];
        const nameField = document.getElementById('petName');
        const weightField = document.getElementById('weight');
        const speciesField = document.querySelector('input[name="species"]')?.closest('.field');
        const speciesError = speciesField?.querySelector('.error-msg');

        document.querySelectorAll('.error-msg').forEach(el => el.classList.add('d-none'));

        if (!petName) {
            errors.push('name');
            nameField.nextElementSibling.classList.remove('d-none');
        }

        if (!species) {
            errors.push('species');
            if (speciesError) speciesError.classList.remove('d-none');
            showToast('Vui lòng chọn loài thú cưng.', 'error');
        }

        if (species === 'other' && !otherSpecies) {
            errors.push('otherSpecies');
            const otherSpeciesError = document.querySelector('#otherSpeciesWrap .error-msg');
            if (otherSpeciesError) otherSpeciesError.classList.remove('d-none');
            showToast('Vui lòng nhập loài khác.', 'error');
        }

        if (isNaN(weight) || weight <= 0) {
            errors.push('weight');
            weightField.nextElementSibling.classList.remove('d-none');
        }

        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput && avatarInput.files && avatarInput.files[0]) {
            const file = avatarInput.files[0];
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                showToast('Ảnh phải là JPG, PNG hoặc WEBP.', 'error');
                errors.push('avatar');
            }
            if (file.size > 5 * 1024 * 1024) {
                showToast('Ảnh không được lớn hơn 5MB.', 'error');
                errors.push('avatar');
            }
        }

        if (errors.length > 0) {
            if (!errors.includes('name') && !errors.includes('weight')) {
                showToast('Vui lòng kiểm tra lại thông tin hồ sơ bé cưng.', 'error');
            }
            return;
        }

        const petData = {
            id: petId || generatePetId(),
            name: petName,
            species,
            otherSpecies,
            breed,
            gender,
            weight,
            dob,
            color,
            vaccinated,
            allergies,
            notes,
            avatar,
            isArchived: false,
            createdAt: petId ? getPets().find(p => p.id === petId)?.createdAt || new Date().toISOString() : new Date().toISOString()
        };

        let allPets = getPets();
        if (petId) {
            allPets = allPets.map(p => p.id === petId ? { ...p, ...petData } : p);
            showToast('Cập nhật hồ sơ bé cưng thành công!');
        } else {
            allPets.unshift(petData);
            showToast('Thêm bé cưng thành công!');
        }

        savePets(allPets);
        document.getElementById('petFormModal').classList.remove('active');
        resetPetForm();
        renderPetGrids();
    });
}

function setupAvatar() {
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
}

function setupSpeciesToggle() {
    const otherWrap = document.getElementById('otherSpeciesWrap');
    document.querySelectorAll('input[name="species"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (otherWrap) {
                otherWrap.style.display = radio.value === 'other' ? 'block' : 'none';
            }
        });
    });
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.getElementById('activeTab').style.display = btn.dataset.tab === 'active' ? 'block' : 'none';
            document.getElementById('archiveTab').style.display = btn.dataset.tab === 'archive' ? 'block' : 'none';
        });
    });

    const addPetBtn = document.getElementById('btnAddPet');
    if (addPetBtn) {
        addPetBtn.addEventListener('click', () => openPetFormModal());
    }
}


// Biến toàn cục để lưu ID pet đang xóa
let petToDeleteId = null;

// Hàm mở modal xác nhận xóa
window.deletePet = function(id) {
    const pets = getPets();
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    petToDeleteId = id;
    document.getElementById('deletePetName').textContent = pet.name;
    
    // Hiển thị modal
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.add('active');
};

// Đóng modal
window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('active');
    petToDeleteId = null;
};

// Xác nhận xóa
function confirmDelete() {
    if (!petToDeleteId) return;

    let pets = getPets();
    pets = pets.map(p => p.id === petToDeleteId ? { ...p, isArchived: true } : p);
    
    if (savePets(pets)) {
        showToast('Đã chuyển hồ sơ vào kho lưu trữ', 'info');
        renderPetGrids();
    }
    
    closeDeleteModal();
}

// Khởi tạo sự kiện cho nút Xóa trong modal (chạy 1 lần khi init)
function setupDeleteModal() {
    const confirmBtn = document.getElementById('btnConfirmDelete');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDelete);
    }
    
    // Đóng modal khi click overlay
    const modalOverlay = document.getElementById('deleteConfirmModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeDeleteModal();
            }
        });
    }
}

// Global functions
window.restorePet = function(id) {
    let pets = getPets();
    pets = pets.map(p => p.id === id ? {...p, isArchived: false} : p);
    savePets(pets);
    showToast('Đã khôi phục');
    renderPetGrids();
};

window.openPetFormModal = openPetFormModal;
window.resetPetForm = resetPetForm;
window.editPet = function(id) {
    openPetFormModal(id);
};