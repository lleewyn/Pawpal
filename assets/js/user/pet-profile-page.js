/* ==========================================================================
   pet-profile-page.js — Pet Profile Page Logic (US 3.1.3)
   ========================================================================== */

import { getPets, savePets, showToast, generatePetId, calcAge, fmtDate } from './pet-profile.js';

const STORAGE_KEY = 'pawpal_pets';
const MAX_PHOTO_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ARCHIVE_DAYS = 30;

let currentEditingPetId = null;
let currentDeletingPetId = null;
let uploadedPhotoBase64 = null;

// ── Initialize Page ───────────────────────────────────────────────────────────
export function initPetProfilePage() {
    console.log('🐾 Initializing Pet Profile Page...');
    setupTabSwitching();
    setupModalHandlers();
    setupFormHandlers();
    setupAvatarUpload();
    renderPetCards();
    console.log('✅ Pet Profile Page initialized');
}

// ── Tab Switching ─────────────────────────────────────────────────────────────
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const activeTab = document.getElementById('activeTab');
    const archiveTab = document.getElementById('archiveTab');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Update button states
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update tab visibility
            if (targetTab === 'active') {
                activeTab.style.display = 'block';
                archiveTab.style.display = 'none';
            } else {
                activeTab.style.display = 'none';
                archiveTab.style.display = 'block';
            }
        });
    });
}

// ── Modal Handlers ────────────────────────────────────────────────────────────
function setupModalHandlers() {
    const btnAddPet = document.getElementById('btnAddPet');
    const petFormModal = document.getElementById('petFormModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelForm = document.getElementById('btnCancelForm');

    // Open modal for adding new pet
    btnAddPet.addEventListener('click', () => {
        currentEditingPetId = null;
        resetForm();
        document.getElementById('modalTitle').textContent = 'Thêm bé cưng mới';
        petFormModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    const closeModal = () => {
        petFormModal.classList.remove('active');
        document.body.style.overflow = '';
        resetForm();
    };

    btnCloseModal.addEventListener('click', closeModal);
    btnCancelForm.addEventListener('click', closeModal);
    
    // Close on overlay click
    petFormModal.addEventListener('click', (e) => {
        if (e.target === petFormModal) {
            closeModal();
        }
    });
}

// ── Form Handlers ─────────────────────────────────────────────────────────────
function setupFormHandlers() {
    const form = document.getElementById('petForm');
    const requiredFields = ['petName', 'petSpecies', 'petWeight'];
    const btnSavePet = document.getElementById('btnSavePet');

    // Real-time validation
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field.addEventListener('input', () => validateForm());
        field.addEventListener('blur', () => validateForm());
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        await savePetData();
    });
}

function validateForm() {
    const petName = document.getElementById('petName').value.trim();
    const petSpecies = document.getElementById('petSpecies').value;
    const petWeight = document.getElementById('petWeight').value;
    const btnSavePet = document.getElementById('btnSavePet');

    const isValid = petName && petSpecies && petWeight && parseFloat(petWeight) > 0;
    btnSavePet.disabled = !isValid;
    
    return isValid;
}

function resetForm() {
    const form = document.getElementById('petForm');
    form.reset();
    uploadedPhotoBase64 = null;
    
    // Reset avatar preview
    const avatarImg = document.getElementById('avatarImg');
    const avatarPlaceholder = document.getElementById('avatarPlaceholder');
    avatarImg.style.display = 'none';
    avatarPlaceholder.style.display = 'flex';
    
    // Reset error messages
    document.getElementById('uploadError').style.display = 'none';
    
    // Disable save button
    document.getElementById('btnSavePet').disabled = true;
}

// ── Avatar Upload ─────────────────────────────────────────────────────────────
function setupAvatarUpload() {
    const btnUploadPhoto = document.getElementById('btnUploadPhoto');
    const avatarInput = document.getElementById('avatarInput');
    const uploadError = document.getElementById('uploadError');

    btnUploadPhoto.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        uploadError.style.display = 'none';

        // AC3.1.1: Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            uploadError.textContent = 'Chỉ chấp nhận file JPG, PNG hoặc WEBP';
            uploadError.style.display = 'block';
            avatarInput.value = '';
            return;
        }

        // AC3.1.1: Validate file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_PHOTO_MB) {
            uploadError.textContent = `Dung lượng file không được vượt quá ${MAX_PHOTO_MB}MB`;
            uploadError.style.display = 'block';
            avatarInput.value = '';
            return;
        }

        // AC3.1.2: Preview image
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedPhotoBase64 = event.target.result;
            const avatarImg = document.getElementById('avatarImg');
            const avatarPlaceholder = document.getElementById('avatarPlaceholder');
            
            avatarImg.src = uploadedPhotoBase64;
            avatarImg.style.display = 'block';
            avatarPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });
}

// ── Save Pet Data ─────────────────────────────────────────────────────────────
async function savePetData() {
    const btnSavePet = document.getElementById('btnSavePet');
    const btnText = btnSavePet.querySelector('.btn-text');
    const btnSpinner = btnSavePet.querySelector('.btn-spinner');
    
    // Show loading state
    btnSavePet.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';
    
    // Collect form data
    const petData = {
        id: currentEditingPetId || generatePetId(),
        name: document.getElementById('petName').value.trim(),
        species: document.getElementById('petSpecies').value,
        breed: document.getElementById('petBreed').value.trim() || '',
        weight: parseFloat(document.getElementById('petWeight').value),
        birthday: document.getElementById('petBirthday').value || '',
        gender: document.getElementById('petGender').value || '',
        medicalHistory: document.getElementById('petMedicalHistory').value.trim() || '',
        notes: document.getElementById('petNotes').value.trim() || '',
        photo: uploadedPhotoBase64 || '',
        createdAt: currentEditingPetId ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archived: false,
        archivedAt: null
    };
    
    // Save to localStorage
    const allPets = getPets();
    if (currentEditingPetId) {
        const index = allPets.findIndex(p => p.id === currentEditingPetId);
        if (index !== -1) {
            allPets[index] = { ...allPets[index], ...petData };
        }
    } else {
        allPets.push(petData);
    }
    savePets(allPets);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Hide loading state
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    btnSavePet.disabled = false;
    
    // Close modal
    document.getElementById('petFormModal').classList.remove('active');
    document.body.style.overflow = '';
    
    // Show success animation (AC3.1.2 requirement)
    showSuccessAnimation(petData.species);
    
    // Re-render cards
    setTimeout(() => {
        renderPetCards();
    }, 2500);
}

// ── Success Animation (AC3.1.2) ───────────────────────────────────────────────
function showSuccessAnimation(species) {
    const overlay = document.getElementById('successOverlay');
    const sprite = document.getElementById('animalSprite');
    
    // Choose emoji based on species
    const emojis = {
        'Chó': '🐕',
        'Mèo': '🐈',
        'Hamster': '🐹',
        'Thỏ': '🐰',
        'Khác': '🐾'
    };
    sprite.textContent = emojis[species] || '🐾';
    
    overlay.style.display = 'flex';
    
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 2500);
}

// ── Render Pet Cards ──────────────────────────────────────────────────────────
function renderPetCards() {
    const allPets = getPets();
    console.log(`🔍 Total pets in localStorage: ${allPets.length}`, allPets);
    const activePets = allPets.filter(p => !p.archived);
    const archivedPets = allPets.filter(p => p.archived);
    console.log(`✅ Active pets: ${activePets.length}, Archived: ${archivedPets.length}`);
    
    renderActivePets(activePets);
    renderArchivedPets(archivedPets);
}

function renderActivePets(pets) {
    const grid = document.getElementById('activePetGrid');
    const emptyState = document.getElementById('emptyStateActive');
    
    console.log(`📋 Rendering ${pets.length} active pets`);
    
    if (pets.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        console.log('📭 No pets found, showing empty state');
        return;
    }
    
    emptyState.style.display = 'none';
    grid.innerHTML = pets.map(pet => createPetCard(pet, false)).join('');
    console.log('✅ Pet cards rendered');
    
    // Attach event listeners
    pets.forEach(pet => {
        const card = document.querySelector(`[data-pet-id="${pet.id}"]`);
        if (card) {
            card.querySelector('.btn-diary')?.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `pet-diary.html?id=${pet.id}`;
            });
            card.querySelector('.btn-edit')?.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(pet);
            });
            card.querySelector('.btn-delete')?.addEventListener('click', (e) => {
                e.stopPropagation();
                openDeleteConfirmModal(pet);
            });
        }
    });
}

function renderArchivedPets(pets) {
    const grid = document.getElementById('archivePetGrid');
    const emptyState = document.getElementById('emptyStateArchive');
    
    if (pets.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    grid.innerHTML = pets.map(pet => createPetCard(pet, true)).join('');
    
    // Attach event listeners for restore
    pets.forEach(pet => {
        const card = document.querySelector(`[data-pet-id="${pet.id}"]`);
        if (card) {
            card.querySelector('.btn-restore')?.addEventListener('click', (e) => {
                e.stopPropagation();
                restorePet(pet.id);
            });
        }
    });
}

// ── Create Pet Card HTML ──────────────────────────────────────────────────────
function createPetCard(pet, isArchived) {
    const age = calcAge(pet.birthday);
    const ageDisplay = age || 'Chưa rõ';
    const genderIcon = pet.gender === 'Đực' ? '♂' : pet.gender === 'Cái' ? '♀' : '';
    const avatarHTML = pet.photo 
        ? `<img src="${pet.photo}" alt="${pet.name}" class="pet-avatar">`
        : `<div class="pet-avatar-placeholder">${getSpeciesEmoji(pet.species)}</div>`;
    
    let countdownHTML = '';
    if (isArchived && pet.archivedAt) {
        const daysLeft = calculateDaysLeft(pet.archivedAt);
        countdownHTML = `<div class="archive-countdown">Còn ${daysLeft} ngày</div>`;
    }
    
    const cardClass = isArchived ? 'pet-card pet-card-archived' : 'pet-card';
    
    const actionsHTML = isArchived
        ? `<div class="pet-card-actions">
             <button class="btn-card-action btn-restore">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                     <path d="M21 3v5h-5"/>
                     <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                     <path d="M3 21v-5h5"/>
                 </svg>
                 Khôi phục
             </button>
           </div>`
        : `<div class="pet-card-actions">
             <button class="btn-card-action btn-diary">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                     <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                 </svg>
                 Nhật ký
             </button>
             <button class="btn-card-action btn-edit">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                 </svg>
                 Sửa
             </button>
             <button class="btn-card-action btn-danger btn-delete">
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <polyline points="3 6 5 6 21 6"/>
                     <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                 </svg>
                 Xóa
             </button>
           </div>`;
    
    return `
        <div class="${cardClass}" data-pet-id="${pet.id}">
            ${countdownHTML}
            <div class="pet-card-header">
                ${avatarHTML}
                <div class="pet-card-info">
                    <h3 class="pet-name">${pet.name}</h3>
                    <div class="pet-id">${pet.id}</div>
                    <div class="pet-meta">
                        <span>${pet.species}${pet.breed ? ` • ${pet.breed}` : ''}</span>
                        <span>${genderIcon} ${ageDisplay}</span>
                    </div>
                </div>
            </div>
            <div class="pet-card-body">
                <div class="pet-info-row">
                    <span class="pet-info-label">Cân nặng:</span>
                    <span class="pet-info-value">${pet.weight} kg</span>
                </div>
                ${pet.birthday ? `
                <div class="pet-info-row">
                    <span class="pet-info-label">Ngày sinh:</span>
                    <span class="pet-info-value">${fmtDate(pet.birthday)}</span>
                </div>` : ''}
            </div>
            ${actionsHTML}
        </div>
    `;
}

function getSpeciesEmoji(species) {
    const emojis = {
        'Chó': '🐕',
        'Mèo': '🐈',
        'Hamster': '🐹',
        'Thỏ': '🐰',
        'Khác': '🐾'
    };
    return emojis[species] || '🐾';
}

// ── Calculate Days Left ───────────────────────────────────────────────────────
function calculateDaysLeft(archivedAt) {
    const archived = new Date(archivedAt);
    const deleteDate = new Date(archived.getTime() + ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = deleteDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

// ── Edit Pet ──────────────────────────────────────────────────────────────────
function openEditModal(pet) {
    currentEditingPetId = pet.id;
    uploadedPhotoBase64 = pet.photo;
    
    // Fill form with pet data
    document.getElementById('petName').value = pet.name;
    document.getElementById('petSpecies').value = pet.species;
    document.getElementById('petBreed').value = pet.breed || '';
    document.getElementById('petWeight').value = pet.weight;
    document.getElementById('petBirthday').value = pet.birthday || '';
    document.getElementById('petGender').value = pet.gender || '';
    document.getElementById('petMedicalHistory').value = pet.medicalHistory || '';
    document.getElementById('petNotes').value = pet.notes || '';
    
    // Show avatar if exists
    if (pet.photo) {
        const avatarImg = document.getElementById('avatarImg');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');
        avatarImg.src = pet.photo;
        avatarImg.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
    }
    
    // Update modal title
    document.getElementById('modalTitle').textContent = `Chỉnh sửa hồ sơ ${pet.name}`;
    
    // Open modal
    document.getElementById('petFormModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Validate form
    validateForm();
}

// ── Delete Pet (Move to Archive - US 3-3) ────────────────────────────────────
function openDeleteConfirmModal(pet) {
    currentDeletingPetId = pet.id;
    document.getElementById('deletePetName').textContent = pet.name;
    document.getElementById('deleteConfirmModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Attach confirm handler
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    btnConfirmDelete.onclick = () => confirmDelete();
}

window.closeDeleteModal = function() {
    document.getElementById('deleteConfirmModal').classList.remove('active');
    document.body.style.overflow = '';
    currentDeletingPetId = null;
};

function confirmDelete() {
    if (!currentDeletingPetId) return;
    
    const allPets = getPets();
    const petIndex = allPets.findIndex(p => p.id === currentDeletingPetId);
    
    if (petIndex !== -1) {
        // AC3.3.1: Move to archive instead of deleting
        allPets[petIndex].archived = true;
        allPets[petIndex].archivedAt = new Date().toISOString();
        savePets(allPets);
        
        showToast('Hồ sơ bé cưng đã được chuyển vào Kho lưu trữ, Pawpal sẽ tự động xóa sau 30 ngày', 'success');
        renderPetCards();
    }
    
    window.closeDeleteModal();
}

// ── Restore Pet (US 3-3) ─────────────────────────────────────────────────────
function restorePet(petId) {
    const allPets = getPets();
    const petIndex = allPets.findIndex(p => p.id === petId);
    
    if (petIndex !== -1) {
        // AC3.3.2: Restore from archive
        allPets[petIndex].archived = false;
        allPets[petIndex].archivedAt = null;
        savePets(allPets);
        
        showToast('Đã khôi phục hồ sơ bé cưng thành công!', 'success');
        renderPetCards();
    }
}

// Make functions globally accessible
window.openEditModal = openEditModal;
window.openDeleteConfirmModal = openDeleteConfirmModal;
window.restorePet = restorePet;
