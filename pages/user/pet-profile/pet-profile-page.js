 /* ==========================================================================
   pet-profile-page.js — Main logic
   ========================================================================== */

import { getPets, savePets, deletePet as deletePetService, restorePet as restorePetService } from '../../../scripts/api/petService.js';
import { generatePetId, calcAge, showToast } from '../pet-profile/pet-profile.js';
import { API } from '../../../scripts/api/api.js';

const DEFAULT_PET_AVATARS = {
    dog: '/assets/images/publics/dogcute.jpg',
    cat: '/assets/images/publics/catcute.jpg',
    rabbit: '/assets/images/publics/pet1.jpg',
    other: '/assets/images/publics/pet.jpg'
};

export async function initPetProfilePage() {
    console.log('Pet Profile Page init...');
    
    try {
        // Đảm bảo dữ liệu API đã nạp vào localStorage
        console.log('Waiting for API.initData()...');
        await API.initData();
        console.log('API.initData() finished.');

        // Fallback: nếu localPets vẫn empty sau initData → thử seed lại
        const localPetsCheck = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        if (localPetsCheck.length === 0) {
            console.warn('[PetProfile] localPets empty after initData, forcing re-seed...');
            try {
                const resp = await fetch('/data/pets.json');
                if (resp.ok) {
                    const petsData = await resp.json();
                    if (Array.isArray(petsData) && petsData.length > 0) {
                        localStorage.setItem('pawpal_pets', JSON.stringify(petsData));
                        console.log(`[PetProfile] Re-seeded ${petsData.length} pets`);
                    }
                }
            } catch (e) {
                console.warn('[PetProfile] Re-seed failed:', e);
            }
        }

        console.log('Waiting for renderPetGrids()...');
        await renderPetGrids();
        console.log('renderPetGrids() finished.');
        
        setupForm();
        setupTabs();
        setupAvatar();
        setupSpeciesToggle();
        setupDeleteModal();
        loadUpcomingBookings();
    } catch (e) {
        console.error('Error during initPetProfilePage:', e);
    }
}

let editingPetId = null;

function getDefaultPetAvatar(species) {
    return DEFAULT_PET_AVATARS[species] || DEFAULT_PET_AVATARS.other;
}

async function openPetFormModal(petId = null) {
    const modal = document.getElementById('petFormModal');
    const petIdInput = document.getElementById('petId');

    if (!modal || !petIdInput) return;

    editingPetId = petId;
    if (petId) {
        const pets = await getPets();
        const pet = pets.find(p => p.id === petId);
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
        avatarPreview.src = pet.avatar || getDefaultPetAvatar(pet.species);
        if ((pet.avatar || pet.species) && avatarCircle) {
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
async function renderPetGrids() {
    console.log('renderPetGrids: Calling getPets()...');
    const pets = await getPets();
    console.log('renderPetGrids: getPets() returned', pets);
    
    const activeGrid = document.getElementById('activePetGrid');
    const archiveGrid = document.getElementById('archivePetGrid');

    const activePets = pets.filter(p => !p.isArchived);
    const archivedPets = pets.filter(p => p.isArchived);
    
    console.log('activePets:', activePets.length, 'archivedPets:', archivedPets.length);

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
    const avatarSrc = pet.avatar || getDefaultPetAvatar(pet.species);
    
    card.innerHTML = `
        <div class="pet-card-header">
            <img src="${avatarSrc}" class="pet-avatar" alt="${pet.name}">
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
            ${pet.allergies && pet.allergies.trim() !== '' ? `
            <div class="pet-info-row pet-allergy-row">
                <span class="pet-info-label pet-allergy-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Dị ứng / Bệnh nền
                </span>
                <span class="pet-info-value pet-allergy-value">${pet.allergies.length > 50 ? pet.allergies.substring(0, 47) + '...' : pet.allergies}</span>
            </div>` : ''}
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

    form.addEventListener('submit', async (e) => {
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

        // Kiểm tra tên trùng trong cùng tài khoản (quy trình 3.1.3)
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        const allPetsForDup = await getPets();
        const sameNamePets = allPetsForDup.filter(p =>
            p.name.trim().toLowerCase() === petName.toLowerCase() &&
            String(p.userId) === String(currentUser?.id) &&
            !p.isArchived &&
            p.id !== (petId || '')
        );

        if (sameNamePets.length > 0) {
            // Yêu cầu thêm điểm phân biệt: màu lông
            if (!color.trim()) {
                const colorField = document.getElementById('color');
                const colorError = colorField?.nextElementSibling;
                if (colorError && colorError.classList.contains('error-msg')) {
                    colorError.textContent = `Bé "${petName}" đã tồn tại. Vui lòng thêm màu lông / đặc điểm để phân biệt.`;
                    colorError.classList.remove('d-none');
                } else {
                    showToast(`Bé "${petName}" đã tồn tại. Vui lòng thêm màu lông để phân biệt.`, 'error');
                }
                colorField?.focus();
                return;
            }
        }
        const petData = {
            id: petId || generatePetId(),
            userId: currentUser ? currentUser.id : 'USER-001',
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
            avatar: avatar || getDefaultPetAvatar(species),
            isArchived: false,
            createdAt: petId ? (await getPets()).find(p => p.id === petId)?.createdAt || new Date().toISOString() : new Date().toISOString()
        };

        let allPets = await getPets();
        if (petId) {
            allPets = allPets.map(p => p.id === petId ? { ...p, ...petData } : p);
            showToast('Cập nhật hồ sơ bé cưng thành công!');
        } else {
            allPets.unshift(petData);
            showToast('Thêm bé cưng thành công!');
        }

        await savePets(allPets);
        document.getElementById('petFormModal').classList.remove('active');
        resetPetForm();
        await renderPetGrids();
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
window.deletePet = async function(id) {
    const pets = await getPets();
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
async function confirmDelete() {
    if (!petToDeleteId) return;

    if (await deletePetService(petToDeleteId)) {
        showToast('Đã chuyển hồ sơ vào kho lưu trữ', 'info');
        await renderPetGrids();
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
window.restorePet = async function(id) {
    await restorePetService(id);
    showToast('Đã khôi phục');
    await renderPetGrids();
};

window.openPetFormModal = openPetFormModal;
window.resetPetForm = resetPetForm;
window.editPet = function(id) {
    openPetFormModal(id);
};

function loadUpcomingBookings() {
    const listEl = document.getElementById('pet-reminders-list');
    if (!listEl) return;
    
    try {
        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || '{}');
        
        // Lọc các booking của user hiện tại, trạng thái 'pending' hoặc 'confirmed', và thời gian >= hiện tại (cho chênh lệch 1 ngày)
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Bỏ qua giờ để so sánh ngày
        
        let upcoming = bookings.filter(b => {
            if (b.userId !== currentUser.id && b.customerPhone !== currentUser.phone) return false;
            if (b.status !== 'pending' && b.status !== 'confirmed') return false;
            
            if (!b.date) return false;
            const bDate = new Date(b.date);
            bDate.setHours(0, 0, 0, 0);
            return bDate.getTime() >= now.getTime();
        });
        
        // Sắp xếp ngày gần nhất
        upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Lấy 3 lịch gần nhất
        upcoming = upcoming.slice(0, 3);
        
        if (upcoming.length === 0) {
            listEl.innerHTML = '<p class="text-muted" style="font-size: 0.85rem; padding: 10px;">Không có lịch hẹn nào sắp tới.</p>';
            return;
        }
        
        listEl.innerHTML = upcoming.map(b => {
            const bDate = new Date(b.date);
            const diffDays = Math.floor((bDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            let timeText = '';
            if (diffDays === 0) timeText = 'Hôm nay';
            else if (diffDays === 1) timeText = 'Ngày mai';
            else if (diffDays <= 7) timeText = `Trong ${diffDays} ngày tới`;
            else timeText = bDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            
            if (b.time) {
                timeText += ` (${b.time})`;
            }
            
            const isUrgent = diffDays <= 2;
            const itemClass = isUrgent ? 'yellow' : 'green';
            const title = b.serviceName || 'Dịch vụ';
            
            return `
                <div class="reminder-item ${itemClass}">
                    <div class="title">${title} ${b.petName ? '- ' + b.petName : ''}</div>
                    <div class="time">${timeText}</div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        console.error('Lỗi khi loadUpcomingBookings:', e);
        listEl.innerHTML = '<p class="text-muted" style="font-size: 0.85rem; padding: 10px;">Lỗi tải dữ liệu.</p>';
    }
}
