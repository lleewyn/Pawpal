/**
 * modules/pets/pets.js - Module quản lý hồ sơ thú cưng PawPal (Chuẩn AGENTS.md: 9px radius, Flat Solid, Text-Only, Màn hình riêng)
 */
import { getPets, savePets, deletePet as deletePetService, restorePet as restorePetService } from '/scripts/api/petService.js?v=20261001-dedup';
import { API } from '/scripts/api/api.js';

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

export function showToast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const colors = { success: '#236B48', error: '#8F2424', info: '#20495E', warning: '#734718' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type] || colors.success};color:#fff;padding:12px 18px;border-radius:9px;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,.15);max-width:340px;opacity:1;transition:opacity 0.3s ease;`;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const cleaned = String(text).replace(/\s*&\s*/g, ' và ');
    const div = document.createElement('div');
    div.textContent = cleaned;
    return div.innerHTML;
}

function getDefaultPetAvatar(species) {
    return DEFAULT_PET_AVATARS[species] || DEFAULT_PET_AVATARS.other;
}

let isInitRunning = false;
let editingPetId = null;

export async function initPetProfilePage() {
    if (isInitRunning) return;
    isInitRunning = true;
    
    try {
        if (typeof window.setUserSubBreadcrumb === 'function') {
            window.setUserSubBreadcrumb('', 'pets');
        }

        await API.initData();
        await renderPetGrids();
        
        setupTabs();
        setupNavigationEvents();
        setupForm();
        setupAvatar();
        setupVaccineCardUploader();
        setupSpeciesToggle();
        setupDeleteModal();
        loadPetBottomInsights();

        // Kiểm tra deep link tham số URL ví dụ ?action=create hoặc ?id=PET-xxx hoặc ?edit=PET-xxx
        const urlParams = new URLSearchParams(window.location.search);
        const actionParam = urlParams.get('action');
        const editId = urlParams.get('id') || urlParams.get('edit');
        if (actionParam === 'create') {
            switchToPetFormScreen();
        } else if (editId) {
            switchToPetFormScreen(editId);
        }
    } catch (e) {
        console.error('Error during initPetProfilePage:', e);
    } finally {
        isInitRunning = false;
    }
}

export async function switchToPetFormScreen(petId = null) {
    const listView = document.getElementById('petListView');
    const detailView = document.getElementById('petDetailView');
    const titleEl = document.getElementById('petFormScreenTitle');
    const subtitleEl = document.getElementById('petFormScreenSubtitle');
    const quickBox = document.getElementById('petQuickLinksBox');
    const diaryLink = document.getElementById('linkPetDiaryQuick');
    const petIdInput = document.getElementById('petId');

    if (!listView || !detailView) return;

    editingPetId = petId;

    if (petId) {
        const pets = await getPets();
        const pet = pets.find(p => String(p.id) === String(petId));
        if (pet) {
            if (petIdInput) petIdInput.value = pet.id;
            if (titleEl) titleEl.textContent = `Hồ sơ bé cưng: ${pet.name}`;
            if (subtitleEl) subtitleEl.textContent = `Mã bé: #${pet.id} • Cập nhật cân nặng, ngày sinh và đặc điểm chăm sóc của bé`;
            if (quickBox) quickBox.classList.remove('d-none');
            if (diaryLink) diaryLink.href = `#diary?id=${encodeURIComponent(pet.id)}`;
            populatePetForm(pet);

            if (typeof window.setUserSubBreadcrumb === 'function') {
                window.setUserSubBreadcrumb(pet.name, 'pets');
            }
        }
    } else {
        if (petIdInput) petIdInput.value = '';
        if (titleEl) titleEl.textContent = 'Thêm bé cưng mới';
        if (subtitleEl) subtitleEl.textContent = 'Đăng ký thông tin để PawPal chăm sóc bé chu đáo và chuẩn xác nhất';
        if (quickBox) quickBox.classList.add('d-none');
        resetPetForm();

        if (typeof window.setUserSubBreadcrumb === 'function') {
            window.setUserSubBreadcrumb('Thêm bé mới', 'pets');
        }
    }

    listView.classList.add('d-none');
    detailView.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function switchToPetListScreen() {
    const listView = document.getElementById('petListView');
    const detailView = document.getElementById('petDetailView');

    if (listView && detailView) {
        detailView.classList.add('d-none');
        listView.classList.remove('d-none');
    }

    if (typeof window.setUserSubBreadcrumb === 'function') {
        window.setUserSubBreadcrumb('', 'pets');
    }

    renderPetGrids();
    loadPetBottomInsights();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.switchToPetListScreen = switchToPetListScreen;
window.switchToPetFormScreen = switchToPetFormScreen;

function setupNavigationEvents() {
    const btnTopAdd = document.getElementById('btnTopAddNewPet');
    if (btnTopAdd) {
        btnTopAdd.addEventListener('click', () => switchToPetFormScreen());
    }

    const btnEmptyAdd = document.getElementById('btnEmptyAddNewPet');
    if (btnEmptyAdd) {
        btnEmptyAdd.addEventListener('click', () => switchToPetFormScreen());
    }

    const btnBack = document.getElementById('btnBackToPetList');
    if (btnBack) {
        btnBack.addEventListener('click', () => switchToPetListScreen());
    }

    const btnCancel = document.getElementById('btnCancelPetForm');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => switchToPetListScreen());
    }

    const btnTriggerAvatar = document.getElementById('btnTriggerAvatarInput');
    const avatarCircle = document.getElementById('avatarCircle');
    const avatarInput = document.getElementById('avatar-input');
    if (btnTriggerAvatar && avatarInput) {
        btnTriggerAvatar.addEventListener('click', () => avatarInput.click());
    }
    if (avatarCircle && avatarInput) {
        avatarCircle.addEventListener('click', () => avatarInput.click());
    }
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
    setChecked('input[name="species"]', pet.species || 'dog');

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
    
    // Ảnh đại diện
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

    // Ảnh Sổ tiêm chủng
    const vaccineCardPreview = document.getElementById('vaccineCardPreview');
    const targetVaccineCard = pet.vaccineCardPhoto || pet.vaccineCard || '';
    if (vaccineCardPreview && targetVaccineCard) {
        vaccineCardPreview.src = targetVaccineCard;
        vaccineCardPreview.style.display = 'block';
    } else if (vaccineCardPreview) {
        vaccineCardPreview.src = '';
        vaccineCardPreview.style.display = 'none';
    }

    // Phân khúc giá & Lịch sử cân nặng
    const weightInsightBox = document.getElementById('userPetWeightInsightBox');
    const tierBadge = document.getElementById('userPetTierBadge');
    const weightRows = document.getElementById('userPetWeightHistoryRows');
    if (weightInsightBox && tierBadge && weightRows) {
        const kg = typeof numWeight === 'number' ? numWeight : (parseFloat(numWeight) || 0);
        let tierText = 'Phân khúc 1: Dưới 5 kg (Gói nhỏ)';
        if (kg >= 5 && kg <= 10) tierText = 'Phân khúc 2: 5 - 10 kg (Gói vừa)';
        else if (kg > 10 && kg <= 20) tierText = 'Phân khúc 3: 10 - 20 kg (Gói lớn)';
        else if (kg > 20) tierText = 'Phân khúc 4: Trên 20 kg (Gói đại)';

        tierBadge.textContent = tierText;

        const history = pet.weightHistory || [];
        if (history.length > 0) {
            weightRows.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 4px; color: #203A2C;">Lịch sử cân đo gần nhất tại PawPal:</div>
                ${history.slice(0, 3).map(h => `
                    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                        <span>• Ngày ${h.date}: <strong>${h.weight}</strong></span>
                        <span style="color: #4F7A65;">(${h.tier || h.by || 'Ghi nhận tại quầy'})</span>
                    </div>
                `).join('')}
            `;
        } else {
            weightRows.innerHTML = `<div>Cân nặng của bé sẽ được tự động đồng bộ và lưu lịch sử mỗi lần ghé PawPal Spa & Hotel.</div>`;
        }
        weightInsightBox.classList.remove('d-none');
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
    const vaccineCardPreview = document.getElementById('vaccineCardPreview');
    if (vaccineCardPreview) {
        vaccineCardPreview.src = '';
        vaccineCardPreview.style.display = 'none';
    }
    const weightInsightBox = document.getElementById('userPetWeightInsightBox');
    if (weightInsightBox) {
        weightInsightBox.classList.add('d-none');
    }
    document.querySelectorAll('.error-msg').forEach(el => el.classList.add('d-none'));
}

async function renderPetGrids() {
    const pets = await getPets();
    
    const activeGrid = document.getElementById('activePetGrid');
    const archiveGrid = document.getElementById('archivePetGrid');

    const activePets = pets.filter(p => !p.isArchived);
    const archivedPets = pets.filter(p => p.isArchived);

    const countActive = document.getElementById('countActive');
    if (countActive) countActive.textContent = `(${activePets.length})`;
    const countArchive = document.getElementById('countArchive');
    if (countArchive) countArchive.textContent = `(${archivedPets.length})`;

    if (activeGrid) {
        activeGrid.innerHTML = '';
        if (activePets.length === 0) {
            document.getElementById('emptyStateActive').classList.remove('d-none');
        } else {
            document.getElementById('emptyStateActive').classList.add('d-none');
            activePets.forEach(pet => activeGrid.appendChild(createPetCard(pet)));
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
    card.className = `pet-card pawpal-smooth-entrance ${isArchived ? 'pet-card-archived' : ''}`;
    const avatarSrc = pet.avatar || getDefaultPetAvatar(pet.species);
    const isMale = (pet.gender === 'male' || pet.gender === 'Đực');
    const displayWeight = typeof pet.weight === 'number' ? pet.weight : (parseFloat(pet.weight) || pet.weightNum || 0);
    const petDob = pet.dobRaw || pet.dob || '';
    const petAllergies = pet.allergies || pet.allergy || '';
    const petId = pet.id || pet.code || '';
    
    // Nhấp vào thẻ để mở màn hình riêng
    card.onclick = () => {
        if (!isArchived) {
            switchToPetFormScreen(petId);
        }
    };
    card.style.cursor = isArchived ? 'default' : 'pointer';

    card.innerHTML = `
        <div class="pet-card-header">
            <img src="${avatarSrc}" class="pet-avatar" alt="${escapeHtml(pet.name)}" loading="lazy">
            <div class="pet-card-info">
                <div class="pet-title-row" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <h4 class="pet-name">${escapeHtml(pet.name)}</h4>
                    <span class="pet-gender-badge ${isMale ? 'gender-male' : 'gender-female'}">${isMale ? 'Đực' : 'Cái'}</span>
                    ${pet.vaccinated ? '<span class="pet-gender-badge" style="background:#DCEEE2; color:#165335; border:none; font-size:11px;">Đã có sổ tiêm</span>' : ''}
                </div>
                <div class="pet-id">#${escapeHtml(petId)}</div>
                <div class="pet-meta">${escapeHtml(getSpeciesName(pet))}</div>
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
                <span class="pet-info-label pet-allergy-label">Dị ứng / Bệnh nền</span>
                <span class="pet-info-value pet-allergy-value">${escapeHtml(petAllergies.length > 40 ? petAllergies.substring(0, 37) + '...' : petAllergies)}</span>
            </div>` : ''}
            <div class="pet-info-row">
                <span class="pet-info-label">Sở thích / Lưu ý</span>
                <span class="pet-info-value">${escapeHtml(pet.notes && pet.notes.trim() !== '' 
                    ? (pet.notes.length > 50 ? pet.notes.substring(0, 47) + '...' : pet.notes) 
                    : 'Bình thường')}</span>
            </div>
        </div>
        <div class="pet-card-actions">
            ${isArchived ? 
                `<button type="button" class="btn-pet-card-action" onclick="event.stopPropagation(); window.restorePet('${escapeHtml(petId)}')">Khôi phục</button>` :
                `<a class="btn-pet-card-action btn-action-diary" href="#diary?id=${encodeURIComponent(petId)}" onclick="event.stopPropagation()">Nhật ký</a>
                 <button type="button" class="btn-pet-card-action" onclick="event.stopPropagation(); window.switchToPetFormScreen('${escapeHtml(petId)}')">Xem và Sửa</button>
                 <button type="button" class="btn-pet-card-action btn-action-danger" onclick="event.stopPropagation(); window.deletePet('${escapeHtml(petId)}')">Xóa</button>`
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
        const vaccineCardPreview = document.getElementById('vaccineCardPreview');
        const vaccineCardPhoto = (vaccineCardPreview && vaccineCardPreview.style.display !== 'none') ? vaccineCardPreview.src : '';
        const petId = document.getElementById('petId')?.value || null;

        const errors = [];
        const nameField = document.getElementById('petName');
        const weightField = document.getElementById('weight');
        const speciesField = document.querySelector('input[name="species"]')?.closest('.form-group');
        const speciesError = speciesField?.querySelector('.error-msg');

        document.querySelectorAll('.error-msg').forEach(el => el.classList.add('d-none'));

        if (!petName) {
            errors.push('name');
            if (nameField && nameField.nextElementSibling) nameField.nextElementSibling.classList.remove('d-none');
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
            if (weightField && weightField.nextElementSibling) weightField.nextElementSibling.classList.remove('d-none');
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
            vaccineCardPhoto: vaccineCardPhoto,
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
        switchToPetListScreen();
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
                    preview.style.display = 'block';
                    if (circle) circle.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function setupVaccineCardUploader() {
    const triggerBtn = document.getElementById('btnTriggerVaccineCard');
    const input = document.getElementById('vaccine-card-input');
    const preview = document.getElementById('vaccineCardPreview');
    if (triggerBtn && input) {
        triggerBtn.addEventListener('click', () => input.click());
    }
    if (input && preview) {
        input.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = ev => {
                    preview.src = ev.target.result;
                    preview.style.display = 'block';
                    if (triggerBtn) triggerBtn.textContent = 'Đổi ảnh sổ tiêm';
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
            if (!hasCustomFile && avatarPreview && avatarCircle && !editingPetId) {
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
    document.querySelectorAll('.pet-filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pet-filter-tab').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            const activeTab = document.getElementById('activeTab');
            const archiveTab = document.getElementById('archiveTab');
            if (activeTab) activeTab.style.display = btn.dataset.tab === 'active' ? 'block' : 'none';
            if (archiveTab) archiveTab.style.display = btn.dataset.tab === 'archive' ? 'block' : 'none';
        });
    });
}

let petToDeleteId = null;

window.deletePet = async function(id) {
    const pets = await getPets();
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    petToDeleteId = id;
    const nameEl = document.getElementById('deletePetName');
    if (nameEl) nameEl.textContent = pet.name;
    
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.add('active');
};

window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('active');
    petToDeleteId = null;
};

async function confirmDelete() {
    if (!petToDeleteId) return;

    if (await deletePetService(petToDeleteId)) {
        showToast('Đã chuyển hồ sơ vào kho lưu trữ', 'info');
        await renderPetGrids();
    }
    
    window.closeDeleteModal();
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
                window.closeDeleteModal();
            }
        });
    }
}

window.restorePet = async function(id) {
    await restorePetService(id);
    showToast('Đã khôi phục hồ sơ bé cưng');
    await renderPetGrids();
};

window.switchToPetFormScreen = switchToPetFormScreen;
window.switchToPetListScreen = switchToPetListScreen;
window.openPetFormModal = switchToPetFormScreen; // fallback alias

async function loadPetBottomInsights() {
    const routineBathSub = document.getElementById('routineBathSub');
    const routineBathStatus = document.getElementById('routineBathStatus');
    const routineGroomSub = document.getElementById('routineGroomSub');
    const routineGroomStatus = document.getElementById('routineGroomStatus');
    const diarySnippetEl = document.getElementById('petLatestDiarySnippet');
    const diaryBtn = document.getElementById('btnGoToPetDiary');

    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || '{}');
        const bookings = currentUser?.id ? await API.getUserBookings(currentUser.id) : [];
        const pets = await getPets();
        const activePets = pets.filter(p => !p.isArchived);
        const primaryPet = activePets[0] || null;

        if (diaryBtn && primaryPet) {
            diaryBtn.href = `#diary?id=${encodeURIComponent(primaryPet.id)}`;
        }

        // 1. Phân tích chu kỳ Spa từ các ca hoàn thành gần nhất
        const completedBookings = bookings
            .filter(b => b.status === 'completed' || b.status === 'in-progress')
            .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

        const lastSpa = completedBookings.find(b => {
            const srv = (b.serviceName || b.service || '').toLowerCase();
            return srv.includes('tắm') || srv.includes('spa') || srv.includes('vệ sinh');
        });

        const lastGroom = completedBookings.find(b => {
            const srv = (b.serviceName || b.service || '').toLowerCase();
            return srv.includes('cắt') || srv.includes('tỉa') || srv.includes('grooming');
        });

        if (lastSpa && routineBathSub && routineBathStatus) {
            const diffDays = Math.max(0, Math.floor((Date.now() - new Date(lastSpa.date).getTime()) / (1000 * 60 * 60 * 24)));
            routineBathSub.textContent = `Lần gần nhất: ${new Date(lastSpa.date).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})} (${diffDays} ngày trước)`;
            if (diffDays >= 10) {
                routineBathStatus.textContent = 'Nên đặt lịch sớm';
                routineBathStatus.className = 'routine-status status-due';
            } else {
                routineBathStatus.textContent = `Còn ${10 - diffDays} ngày`;
                routineBathStatus.className = 'routine-status status-ok';
            }
        }

        if (lastGroom && routineGroomSub && routineGroomStatus) {
            const diffDays = Math.max(0, Math.floor((Date.now() - new Date(lastGroom.date).getTime()) / (1000 * 60 * 60 * 24)));
            routineGroomSub.textContent = `Lần gần nhất: ${new Date(lastGroom.date).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})} (${diffDays} ngày trước)`;
            if (diffDays >= 28) {
                routineGroomStatus.textContent = 'Nên tỉa lông';
                routineGroomStatus.className = 'routine-status status-due';
            } else {
                routineGroomStatus.textContent = `Còn ${28 - diffDays} ngày`;
                routineGroomStatus.className = 'routine-status status-ok';
            }
        }

        // 2. Tải lời nhắn và nhật ký gần nhất
        if (diarySnippetEl) {
            const latestBooking = completedBookings[0];
            if (latestBooking) {
                const srvTitle = (latestBooking.serviceName || latestBooking.service || 'Tắm sấy và Spa thảo mộc').replace(/\s*&\s*/g, ' và ');
                const staffName = latestBooking.staff || 'Minh An (Chuyên viên Spa)';
                const petName = latestBooking.petName || (primaryPet ? primaryPet.name : 'Bé cưng');
                const noteText = latestBooking.notes || latestBooking.diaryNote || `Bé ${petName} rất ngoan và hợp tác, da sạch và lông sấy phồng mềm mượt.`;
                const dateText = latestBooking.date ? new Date(latestBooking.date).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'}) : 'Gần đây';

                diarySnippetEl.innerHTML = `
                    <div class="diary-snippet-item">
                        <div class="snippet-top-row">
                            <span class="snippet-service-tag">${escapeHtml(srvTitle)}</span>
                            <span class="snippet-date">${dateText}</span>
                        </div>
                        <div class="snippet-staff-row">
                            Chuyên viên phụ trách: <strong>${escapeHtml(staffName)}</strong> cho bé <strong>${escapeHtml(petName)}</strong>
                        </div>
                        <p class="snippet-note-quote">"${escapeHtml(noteText)}"</p>
                    </div>
                `;
            } else {
                diarySnippetEl.innerHTML = `
                    <div class="snippet-empty-box">
                        <p class="mb-1" style="font-weight: 600; color: #236B48;">Chưa có ghi chú nhật ký gần đây.</p>
                        <span class="text-muted small">Sau mỗi ca Spa hoặc Khách sạn, hình ảnh và lời nhắn từ chuyên viên PawPal sẽ lưu tại đây.</span>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.warn('[Pets] loadPetBottomInsights error:', err);
    }
}

export const init = initPetProfilePage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

