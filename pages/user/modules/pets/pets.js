/**
 * modules/pets/pets.js - Module quản lý hồ sơ thú cưng PawPal (độc lập 100%)
 */
import { getPets, savePets, deletePet as deletePetService, restorePet as restorePetService } from '/scripts/api/petService.js?v=20261001-dedup';
import { API } from '/scripts/api/api.js';


const STORAGE_KEY = 'pawpal_pets';
const TRACKER_LOGS_KEY = 'pawpal_pet_tracker_logs';

const DEFAULT_PET_AVATARS = {
    dog: '/assets/images/publics/dogcute3.jpg',
    cat: '/assets/images/publics/catcute5.jpg',
    rabbit: '/assets/images/publics/pet1.jpg',
    other: '/assets/images/publics/pet.jpg'
};

export function generatePetId() {
    let maxNum = 0;
    const checkList = (list) => {
        if (Array.isArray(list)) {
            list.forEach(p => {
                const match = String(p.id || p.code || '').match(/PET-(\d+)/i);
                if (match) {
                    const n = parseInt(match[1], 10);
                    if (n > maxNum) maxNum = n;
                }
            });
        } else if (list && typeof list === 'object') {
            Object.keys(list).forEach(key => {
                const match = String(key).match(/PET-(\d+)/i);
                if (match) {
                    const n = parseInt(match[1], 10);
                    if (n > maxNum) maxNum = n;
                }
            });
        }
    };
    try {
        checkList(JSON.parse(localStorage.getItem('pawpal_pets') || '[]'));
        checkList(JSON.parse(sessionStorage.getItem('pawpal_admin_pets_data') || '{}'));
    } catch (e) {}
    if (maxNum === 0) maxNum = 10;
    return 'PET-' + String(maxNum + 1).padStart(3, '0');
}

export function calcAge(birthday) {
    if (!birthday) return 'Chưa rõ';
    if (typeof birthday === 'string' && birthday.includes('tuổi')) return birthday;
    let birth;
    if (typeof birthday === 'string' && birthday.includes('/')) {
        const parts = birthday.split(' ')[0].split('/');
        if (parts.length === 3) {
            birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
    }
    if (!birth || isNaN(birth.getTime())) {
        birth = new Date(birthday);
    }
    if (isNaN(birth.getTime())) return 'Chưa rõ';
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 0) return 'Chưa rõ';
    if (months < 1) return 'Dưới 1 tháng';
    if (months < 12) return months + ' tháng';
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    return remainMonths > 0 ? (years + ' tuổi ' + remainMonths + ' tháng') : (years + ' tuổi');
}

export function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function showToast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

export function getTrackerLogs() {
    try {
        const raw = localStorage.getItem(TRACKER_LOGS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function saveTrackerLogs(logs) {
    try {
        localStorage.setItem(TRACKER_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
        console.error('saveTrackerLogs error:', e);
    }
}

let isInitRunning = false;

export async function initPetProfilePage() {
    if (isInitRunning) return;
    isInitRunning = true;
    console.log('Pet Profile Page init...');
    
    try {
        console.log('Waiting for API.initData()...');
        await API.initData();
        console.log('API.initData() finished.');

        console.log('Waiting for renderPetGrids()...');
        await renderPetGrids();
        console.log('renderPetGrids() finished.');
        
        ensureModalsInBody();
        setupModalBackdropDismiss();
        setupForm();
        setupTabs();
        setupAvatar();
        setupSpeciesToggle();
        setupDeleteModal();
        loadUpcomingBookings();
    } catch (e) {
        console.error('Error during initPetProfilePage:', e);
    } finally {
        isInitRunning = false;
    }
}

let editingPetId = null;

function ensureModalsInBody() {
    const formModal = document.getElementById('petFormModal');
    const delModal = document.getElementById('deleteConfirmModal');
    if (formModal && formModal.parentElement !== document.body) {
        document.body.appendChild(formModal);
    }
    if (delModal && delModal.parentElement !== document.body) {
        document.body.appendChild(delModal);
    }
}

function setupModalBackdropDismiss() {
    const formModal = document.getElementById('petFormModal');
    if (formModal) {
        formModal.addEventListener('click', (e) => {
            if (e.target === formModal) {
                formModal.classList.remove('active');
                if (!document.getElementById('petId')?.value) resetPetForm();
            }
        });
    }
}

function getDefaultPetAvatar(species) {
    return DEFAULT_PET_AVATARS[species] || DEFAULT_PET_AVATARS.other;
}

async function openPetFormModal(petId = null) {
    ensureModalsInBody();
    const modal = document.getElementById('petFormModal');
    const petIdInput = document.getElementById('petId');
    const titleEl = document.getElementById('petModalTitle');
    const subtitleEl = document.getElementById('petModalSubtitle');

    if (!modal || !petIdInput) return;

    editingPetId = petId;
    if (petId) {
        const pets = await getPets();
        const pet = pets.find(p => p.id === petId);
        if (pet) {
            petIdInput.value = pet.id;
            if (titleEl) titleEl.textContent = `Chỉnh sửa hồ sơ: ${pet.name}`;
            if (subtitleEl) subtitleEl.textContent = 'Cập nhật cân nặng, ngày sinh và đặc điểm chăm sóc của bé';
            populatePetForm(pet);
        }
    } else {
        petIdInput.value = '';
        if (titleEl) titleEl.textContent = 'Thêm bé cưng mới';
        if (subtitleEl) subtitleEl.textContent = 'Đăng ký thông tin để PawPal chăm sóc bé chu đáo và chuẩn xác nhất';
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
    const isFemale = (pet.gender === 'female' || pet.gender === 'Cái');
    setChecked('input[name="gender"]', isFemale ? 'female' : 'male');
    const numWeight = typeof pet.weight === 'number' ? pet.weight : (parseFloat(pet.weight) || pet.weightNum || '');
    setValue('weight', numWeight);
    let dobVal = pet.dobRaw || pet.dob || '';
    if (dobVal.includes('/')) {
        const parts = dobVal.split(' ')[0].split('/');
        if (parts.length === 3) dobVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    setValue('dob', dobVal);
    setValue('color', pet.color || '');
    const vaccinatedEl = document.getElementById('vaccinated');
    if (vaccinatedEl) vaccinatedEl.checked = !!pet.vaccinated;
    setValue('allergies', pet.allergies || pet.allergy || '');
    const notesEl = document.getElementById('notes');
    if (notesEl) notesEl.value = pet.notes || '';
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarCircle = document.getElementById('avatarCircle');
    const targetAvatar = pet.avatar || getDefaultPetAvatar(pet.species);
    if (avatarPreview && targetAvatar) {
        avatarPreview.src = targetAvatar;
        avatarPreview.style.display = 'block';
        if (avatarCircle) avatarCircle.classList.add('has-image');
    } else if (avatarPreview) {
        avatarPreview.src = '';
        avatarPreview.style.display = 'none';
        if (avatarCircle) avatarCircle.classList.remove('has-image');
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
        avatarPreview.style.display = 'none';
    }
    if (avatarCircle) {
        avatarCircle.classList.remove('has-image');
    }
    document.querySelectorAll('.error-msg').forEach(el => el.classList.add('d-none'));
}

async function renderPetGrids() {
    console.log('renderPetGrids: Calling getPets()...');
    const pets = await getPets();
    console.log('renderPetGrids: getPets() returned', pets);
    
    const activeGrid = document.getElementById('activePetGrid');
    const archiveGrid = document.getElementById('archivePetGrid');

    const activePets = pets.filter(p => !p.isArchived);
    const archivedPets = pets.filter(p => p.isArchived);
    
    console.log('activePets:', activePets.length, 'archivedPets:', archivedPets.length);

    if (activeGrid) {
        activeGrid.innerHTML = '';
        if (activePets.length === 0) {
            document.getElementById('emptyStateActive').classList.remove('d-none');
        } else {
            document.getElementById('emptyStateActive').classList.add('d-none');
            activePets.forEach(pet => activeGrid.appendChild(createPetCard(pet)));
            
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
    const isMale = (pet.gender === 'male' || pet.gender === 'Đực');
    const displayWeight = typeof pet.weight === 'number' ? pet.weight : (parseFloat(pet.weight) || pet.weightNum || 0);
    const petDob = pet.dobRaw || pet.dob || '';
    const petAllergies = pet.allergies || pet.allergy || '';
    const petId = pet.id || pet.code || '';
    
    card.innerHTML = `
        <div class="pet-card-header">
            <img src="${avatarSrc}" class="pet-avatar" alt="${pet.name}">
            <div class="pet-card-info">
                <h3 class="pet-name">${pet.name}</h3>
                <div class="pet-id">${petId}</div>
                <div class="pet-meta">
                    <span>${getSpeciesName(pet)}</span>
                    <span class="pet-gender-badge">${isMale ? 'Đực' : 'Cái'}</span>
                </div>
            </div>
        </div>
        <div class="pet-card-body">
            <div class="pet-info-row">
                <span class="pet-info-label">Cân nặng</span>
                <span class="pet-info-value">${displayWeight} kg</span>
            </div>
            <div class="pet-info-row">
                <span class="pet-info-label">Tuổi</span>
                <span class="pet-info-value">${calcAge(petDob)}</span>
            </div>
            ${petAllergies && petAllergies.trim() !== '' ? `
            <div class="pet-info-row pet-allergy-row">
                <span class="pet-info-label pet-allergy-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:4px;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Dị ứng / Bệnh nền
                </span>
                <span class="pet-info-value pet-allergy-value">${petAllergies.length > 50 ? petAllergies.substring(0, 47) + '...' : petAllergies}</span>
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
                `<button class="btn-card-action" onclick="restorePet('${petId}')">Khôi phục</button>` :
                `<a class="btn-card-action btn-diary-action" href="#diary?id=${petId}">Nhật ký</a>
                 <button class="btn-card-action" onclick="editPet('${petId}')">Sửa</button>
                 <button class="btn-card-action btn-danger" onclick="deletePet('${petId}')">Xóa</button>`
            }
        </div>
    `;
    return card;
}

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

    if (pet.breed && pet.breed.trim() !== '') {
        return `${speciesName} ${pet.breed.trim()}`;
    }

    return speciesName;
}

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

        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        const allPetsForDup = await getPets();
        const sameNamePets = allPetsForDup.filter(p =>
            p.name.trim().toLowerCase() === petName.toLowerCase() &&
            String(p.userId) === String(currentUser?.id) &&
            !p.isArchived &&
            p.id !== (petId || '')
        );

        if (sameNamePets.length > 0) {
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
            userId: currentUser ? (currentUser.id || currentUser.custId || 'USER-001') : 'USER-001',
            custId: currentUser ? (currentUser.custId || currentUser.id || 'CUST-001') : 'CUST-001',
            ownerName: currentUser ? (currentUser.name || currentUser.fullname || 'Khách hàng') : 'Khách hàng',
            ownerPhone: currentUser ? (currentUser.phone || currentUser.phone_main || '') : '',
            name: petName,
            species,
            otherSpecies,
            breed: breed || (species === 'cat' ? 'Mèo ta' : species === 'dog' ? 'Chó cỏ' : 'Khác'),
            gender: gender || 'male',
            weight: isNaN(weight) ? 0 : weight,
            weightNum: isNaN(weight) ? 0 : weight,
            dob,
            dobRaw: dob,
            color,
            vaccinated: !!vaccinated,
            allergies,
            allergy: allergies,
            notes,
            alert: allergies ? `Cảnh báo dị ứng: ${allergies}` : '',
            status: 'Đang nuôi',
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
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarCircle = document.getElementById('avatarCircle');

    document.querySelectorAll('input[name="species"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (otherWrap) {
                otherWrap.classList.toggle('d-none', radio.value !== 'other');
            }
            const avatarInput = document.getElementById('avatar-input');
            const hasCustomFile = avatarInput && avatarInput.files && avatarInput.files.length > 0;
            if (!hasCustomFile && avatarPreview && avatarCircle) {
                const def = getDefaultPetAvatar(radio.value);
                if (def) {
                    avatarPreview.src = def;
                    avatarPreview.style.display = 'block';
                    avatarCircle.classList.add('has-image');
                }
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


let petToDeleteId = null;

window.deletePet = async function(id) {
    ensureModalsInBody();
    const pets = await getPets();
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    petToDeleteId = id;
    document.getElementById('deletePetName').textContent = pet.name;
    
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.add('active');
};

window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.classList.remove('active');
    petToDeleteId = null;
};

async function confirmDelete() {
    if (!petToDeleteId) return;

    if (await deletePetService(petToDeleteId)) {
        showToast('Đã chuyển hồ sơ vào kho lưu trữ', 'info');
        await renderPetGrids();
    }
    
    closeDeleteModal();
}

function setupDeleteModal() {
    const confirmBtn = document.getElementById('btnConfirmDelete');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDelete);
    }
    
    const modalOverlay = document.getElementById('deleteConfirmModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeDeleteModal();
            }
        });
    }
}

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

async function loadUpcomingBookings() {
    const listEl = document.getElementById('pet-reminders-list');
    if (!listEl) return;
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || '{}');
        const bookings = currentUser?.id ? await API.getUserBookings(currentUser.id) : [];
        
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
        
        upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
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


export const init = initPetProfilePage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
