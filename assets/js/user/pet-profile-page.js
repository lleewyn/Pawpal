/* ==========================================================================
   pet-profile-page.js — Main logic
   ========================================================================== */

import { getPets, savePets, generatePetId, calcAge, showToast } from './pet-profile.js';

export function initPetProfilePage() {
    console.log('🚀 Pet Profile Page init...');
    
    renderPetGrids();
    setupForm();
    setupTabs();
    setupAvatar();
    setupSpeciesToggle();
    setupDeleteModal();
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
            document.getElementById('emptyStateActive').style.display = 'block';
        } else {
            document.getElementById('emptyStateActive').style.display = 'none';
            activePets.forEach(pet => activeGrid.appendChild(createPetCard(pet)));
        }
    }

    // Archive
    if (archiveGrid) {
        archiveGrid.innerHTML = '';
        if (archivedPets.length === 0) {
            document.getElementById('emptyStateArchive').style.display = 'block';
        } else {
            document.getElementById('emptyStateArchive').style.display = 'none';
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
                `<div class="pet-avatar-placeholder">🐾</div>`
            }
            <div class="pet-card-info">
                <h3 class="pet-name">${pet.name}</h3>
                <div class="pet-id">${pet.id}</div>
                <div class="pet-meta">
                    <span>${getSpeciesName(pet)}</span>
                    <span class="pet-gender-badge">${pet.gender === 'male' ? '♂ Đực' : '♀ Cái'}</span>
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

        const petData = {
            id: generatePetId(),
            name: document.getElementById('petName').value.trim(),
            species: document.querySelector('input[name="species"]:checked')?.value,
            otherSpecies: document.getElementById('otherSpecies').value.trim(),
            breed: document.getElementById('breed').value.trim(),
            gender: document.querySelector('input[name="gender"]:checked')?.value,
            weight: parseFloat(document.getElementById('weight').value),
            dob: document.getElementById('dob').value,
            color: document.getElementById('color').value.trim(),
            vaccinated: document.getElementById('vaccinated').checked,
            allergies: document.getElementById('allergies').value.trim(),
            notes: document.getElementById('notes').value.trim(),
            avatar: document.getElementById('avatarPreview').src || '',
            isArchived: false,
            createdAt: new Date().toISOString()
        };

        if (!petData.name || !petData.species || isNaN(petData.weight)) {
            showToast('Vui lòng nhập đầy đủ thông tin bắt buộc!', 'error');
            return;
        }

        const allPets = getPets();
        allPets.unshift(petData);           
        savePets(allPets);

        showToast('Thêm bé cưng thành công!');
        document.getElementById('petFormModal').classList.remove('active');
        form.reset();
        document.getElementById('avatarPreview').src = '';
        renderPetGrids();
    });
}

function setupAvatar() {
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
}

function setupSpeciesToggle() {
    const otherWrap = document.getElementById('otherSpeciesWrap');
    document.querySelectorAll('input[name="species"]').forEach(radio => {
        radio.addEventListener('change', () => {
            otherWrap.style.display = radio.value === 'other' ? 'block' : 'none';
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

window.editPet = function(id) {
    showToast('Chức năng sửa sẽ được cập nhật sau', 'info');
};