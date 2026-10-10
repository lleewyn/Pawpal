// tab-pet-list.js - Subtab Danh sách thú cưng Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    let isHotelOnly = false;
    let isAlertOnly = false;
    let petCurrentPage = 1;
    const PETS_PER_PAGE = 10;
    let currentWeighingPetId = 'PET-001';

    // Dropdown portal 3 chấm cho bảng thú cưng
    let petGlobalActionDropdown = null;

    function closePetGlobalDropdown() {
        if (petGlobalActionDropdown) {
            petGlobalActionDropdown.classList.remove('show');
            petGlobalActionDropdown.style.display = 'none';
            petGlobalActionDropdown.removeAttribute('data-id');
        }
        document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
    }

    function togglePetGlobalDropdown(btn) {
        const petId = btn.getAttribute('data-id');
        const isCurrentlyOpen = petGlobalActionDropdown &&
                                petGlobalActionDropdown.classList.contains('show') &&
                                petGlobalActionDropdown.getAttribute('data-id') === petId;

        closePetGlobalDropdown();
        if (isCurrentlyOpen) return;

        const petsData = PawpalPets.state?.petsData || {};
        const pet = petsData[petId];
        if (!pet) return;

        btn.classList.add('active');
        petGlobalActionDropdown.setAttribute('data-id', petId);
        const isArchived = pet.status === 'Lưu trữ';

        petGlobalActionDropdown.innerHTML = `
            <button type="button" class="dropdown-item" data-action="profile">
                Xem hồ sơ chi tiết
            </button>
            <button type="button" class="dropdown-item" data-action="weigh">
                Cân bé và thể trạng
            </button>
            <button type="button" class="dropdown-item" data-action="print">
                In thẻ đeo cổ (80mm)
            </button>
            <button type="button" class="dropdown-item" data-action="service">
                Tạo ca dịch vụ
            </button>
            ${isArchived ? `
                <button type="button" class="dropdown-item text-success" data-action="restore">
                    Khôi phục hồ sơ
                </button>
            ` : `
                <button type="button" class="dropdown-item text-danger" data-action="archive">
                    Lưu trữ hồ sơ
                </button>
            `}
        `;

        petGlobalActionDropdown.style.display = 'flex';
        petGlobalActionDropdown.style.visibility = 'hidden';
        petGlobalActionDropdown.style.top = '0px';
        petGlobalActionDropdown.style.left = '0px';

        const rect = btn.getBoundingClientRect();
        const dropdownWidth = petGlobalActionDropdown.offsetWidth || 185;
        const dropdownHeight = petGlobalActionDropdown.offsetHeight || 190;
        petGlobalActionDropdown.style.visibility = 'visible';

        let left = rect.right - dropdownWidth;
        if (left < 10) left = 10;

        const spaceBelow = window.innerHeight - rect.bottom;
        let top;
        if (spaceBelow < dropdownHeight + 10 && rect.top > dropdownHeight + 10) {
            top = rect.top - dropdownHeight - 4;
        } else {
            top = rect.bottom + 4;
        }

        petGlobalActionDropdown.style.top = `${top}px`;
        petGlobalActionDropdown.style.left = `${left}px`;
        petGlobalActionDropdown.style.zIndex = '99999';
        petGlobalActionDropdown.classList.add('show');
    }

    function handleCreateServiceForPet(petId) {
        const petsData = PawpalPets.state?.petsData || {};
        const pet = petsData[petId];
        if (!pet) return;

        sessionStorage.setItem('pawpal_admin_selected_pet_code', pet.code);
        sessionStorage.setItem('pawpal_admin_selected_pet_name', pet.name);
        sessionStorage.setItem('pawpal_admin_selected_pet_weight', pet.weight);
        sessionStorage.setItem('pawpal_admin_selected_pet_owner_id', pet.custId || '');
        sessionStorage.setItem('pawpal_admin_services_open_booking_modal', 'true');

        const serviceNavBtn = document.querySelector('.admin-nav-item[data-module="Dịch vụ"]');
        if (serviceNavBtn) {
            serviceNavBtn.click();
        } else {
            window.location.hash = '#tab-service-bookings';
        }
    }

    function updatePetKPIs() {
        const statTotal = document.getElementById('petStatTotal');
        const statDog = document.getElementById('petStatDog');
        const statCat = document.getElementById('petStatCat');
        const statOther = document.getElementById('petStatOther');
        const statAlert = document.getElementById('petStatAlert');

        const petsData = PawpalPets.state?.petsData || {};
        const petsList = Object.values(petsData);
        const activePets = petsList.filter(p => p.status !== 'Lưu trữ');

        if (statTotal) statTotal.textContent = activePets.length;
        if (statDog) statDog.textContent = activePets.filter(p => p.species === 'dog').length;
        if (statCat) statCat.textContent = activePets.filter(p => p.species === 'cat').length;
        if (statOther) statOther.textContent = activePets.filter(p => p.species !== 'dog' && p.species !== 'cat').length;
        if (statAlert) statAlert.textContent = activePets.filter(p => Boolean(p.alert)).length;
    }

    function renderPetPagination(totalItems, totalPages) {
        const paginationBar = document.getElementById('petPaginationBar');
        const pageNumbersContainer = document.getElementById('petPageNumbersContainer');
        const prevBtn = document.getElementById('petPrevPageBtn');
        const nextBtn = document.getElementById('petNextPageBtn');

        if (!paginationBar || !pageNumbersContainer) return;

        paginationBar.style.display = totalItems === 0 ? 'none' : 'flex';

        if (prevBtn) {
            prevBtn.classList.toggle('disabled', petCurrentPage <= 1);
            prevBtn.disabled = petCurrentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.classList.toggle('disabled', petCurrentPage >= totalPages);
            nextBtn.disabled = petCurrentPage >= totalPages;
        }

        pageNumbersContainer.innerHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `pagination-btn ${i === petCurrentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                if (petCurrentPage !== i) {
                    petCurrentPage = i;
                    renderPetsTable();
                    const scrollBox = document.querySelector('.table-responsive-wrapper');
                    if (scrollBox) scrollBox.scrollTop = 0;
                }
            });
            pageNumbersContainer.appendChild(btn);
        }
    }

    function renderPetsTable() {
        closePetGlobalDropdown();
        const tbody = document.getElementById('petTableTbody');
        if (!tbody) return;

        const petSearchInput = document.getElementById('petSearchInput');
        const petFilterSpecies = document.getElementById('petFilterSpecies');
        const petFilterBreed = document.getElementById('petFilterBreed');
        const petFilterWeight = document.getElementById('petFilterWeight');
        const petFilterVaccine = document.getElementById('petFilterVaccine');
        const btnPetClearFilters = document.getElementById('btnPetClearFilters');

        const query = petSearchInput ? petSearchInput.value.trim() : '';
        const speciesVal = petFilterSpecies ? petFilterSpecies.value : 'ALL';
        const breedVal = petFilterBreed ? petFilterBreed.value : 'ALL';
        const weightVal = petFilterWeight ? petFilterWeight.value : 'ALL';
        const vaccineVal = petFilterVaccine ? petFilterVaccine.value : 'ALL';

        const isAnyFilterActive = Boolean(
            query ||
            speciesVal !== 'ALL' ||
            breedVal !== 'ALL' ||
            weightVal !== 'ALL' ||
            vaccineVal !== 'ALL' ||
            isHotelOnly ||
            isAlertOnly
        );
        if (btnPetClearFilters) {
            btnPetClearFilters.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
        }

        const petsData = PawpalPets.state?.petsData || {};
        const petsList = Object.values(petsData);
        const matchSearch = PawpalPets.matchSearch || ((src, q) => (!q ? true : String(src || '').toLowerCase().includes(String(q).toLowerCase())));

        const filteredPets = petsList.filter(pet => {
            if (query) {
                const matchPet = matchSearch(pet.code, query) ||
                                 matchSearch(pet.name, query) ||
                                 matchSearch(pet.speciesBreed, query) ||
                                 matchSearch(pet.breed, query) ||
                                 matchSearch(pet.ownerName, query) ||
                                 matchSearch(pet.ownerPhone, query) ||
                                 matchSearch(pet.notes, query) ||
                                 matchSearch(pet.alert, query);
                if (!matchPet) return false;
            }

            if (speciesVal !== 'ALL') {
                if (speciesVal === 'dog' && pet.species !== 'dog') return false;
                if (speciesVal === 'cat' && pet.species !== 'cat') return false;
                if (speciesVal === 'rabbit' && pet.species !== 'rabbit') return false;
                if (speciesVal === 'other' && (pet.species === 'dog' || pet.species === 'cat' || pet.species === 'rabbit')) return false;
            }

            if (breedVal !== 'ALL') {
                const breedMatches = matchSearch(pet.breed, breedVal) || matchSearch(pet.speciesBreed, breedVal);
                if (!breedMatches) return false;
            }

            if (weightVal !== 'ALL') {
                const kg = pet.weightNum || parseFloat(pet.weight) || 0;
                if (weightVal === 'under5' && kg >= 5) return false;
                if (weightVal === '5to10' && (kg < 5 || kg > 10)) return false;
                if (weightVal === '10to20' && (kg < 10 || kg > 20)) return false;
                if (weightVal === 'over20' && kg <= 20) return false;
            }

            if (vaccineVal !== 'ALL') {
                if (vaccineVal === 'VACCINATED' && pet.vaccinated === false) return false;
                if (vaccineVal === 'NOT_VACCINATED' && pet.vaccinated !== false) return false;
            }

            if (isHotelOnly && pet.isHotel !== true && pet.status !== 'Lưu trú Hotel') return false;
            if (isAlertOnly && !pet.alert) return false;

            return true;
        });

        const totalItems = filteredPets.length;
        const totalPages = Math.ceil(totalItems / PETS_PER_PAGE) || 1;
        if (petCurrentPage > totalPages) petCurrentPage = totalPages;
        if (petCurrentPage < 1) petCurrentPage = 1;

        renderPetPagination(totalItems, totalPages);

        if (totalItems === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 36px 16px; font-size: 13.5px;">
                        Không tìm thấy bé cưng nào phù hợp với bộ lọc tìm kiếm hiện tại. 
                        <button type="button" id="btnResetPetFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetPetFilters')?.addEventListener('click', clearAllPetFilters);
            return;
        }

        const pagedPets = filteredPets.slice((petCurrentPage - 1) * PETS_PER_PAGE, petCurrentPage * PETS_PER_PAGE);

        tbody.innerHTML = pagedPets.map(pet => {
            let alertRowClass = '';
            let alertHtml = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
            
            if (pet.alert) {
                const lowAlert = pet.alert.toLowerCase();
                if (lowAlert.includes('cắn') || lowAlert.includes('dữ') || lowAlert.includes('hung') || lowAlert.includes('nguy hiểm') || lowAlert.includes('cảnh báo:')) {
                    alertRowClass = 'row-alert-critical';
                    alertHtml = `<span class="alert-indicator text-danger" title="${pet.alert}">• ${String(pet.alert).split(' • ').join('<br>• ')}</span>`;
                } else {
                    alertRowClass = 'row-alert-warning';
                    alertHtml = `<span class="alert-indicator text-warning" title="${pet.alert}">• ${String(pet.alert).split(' • ').join('<br>• ')}</span>`;
                }
            }

            const isArchived = pet.status === 'Lưu trữ';
            const rowClass = [alertRowClass, isArchived ? 'row-archived' : ''].filter(Boolean).join(' ');

            let statusBadgeClass = 'badge-success';
            if (pet.status === 'Lưu trú Hotel') statusBadgeClass = 'badge-warning';
            else if (pet.status === 'Lưu trữ') statusBadgeClass = 'badge-neutral';

            return `
                <tr class="${rowClass}" data-id="${pet.code}">
                    <td style="text-align: center;">
                        <img src="${pet.avatar || '/assets/images/publics/dogcute3.jpg'}" class="pet-avatar-cell" alt="${pet.name}">
                    </td>
                    <td><strong>${pet.code}</strong></td>
                    <td>
                        <div class="pet-name-cell">
                            <a href="javascript:void(0)" class="pet-name-link btn-open-pet-drawer" data-id="${pet.code}">${pet.name}</a>
                        </div>
                        <div class="pet-sub-cell">${pet.gender || 'Đực'} • ${pet.dob || ''}</div>
                    </td>
                    <td>${pet.speciesBreed || pet.breed || 'Chó'}</td>
                    <td><strong>${pet.weight}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${pet.custId || 'CUST-001'}">${pet.ownerName || 'Chủ nuôi'}</a>
                        <div class="pet-sub-cell">${pet.ownerPhone || ''}</div>
                    </td>
                    <td>${alertHtml}</td>
                    <td>
                        <span class="admin-badge ${statusBadgeClass}">${pet.status}</span>
                    </td>
                    <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                        <button type="button" class="btn-action-more" data-id="${pet.code}" title="Tác vụ">•••</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function clearAllPetFilters() {
        const petSearchInput = document.getElementById('petSearchInput');
        const petFilterSpecies = document.getElementById('petFilterSpecies');
        const petFilterBreed = document.getElementById('petFilterBreed');
        const petFilterWeight = document.getElementById('petFilterWeight');
        const petFilterVaccine = document.getElementById('petFilterVaccine');
        const btnClearPetSearch = document.getElementById('btnClearPetSearch');
        const btnPetClearFilters = document.getElementById('btnPetClearFilters');
        const btnToggleHotelOnly = document.getElementById('btnFilterHotelOnly');
        const btnToggleAlertOnly = document.getElementById('btnFilterAlertOnly');

        if (petSearchInput) petSearchInput.value = '';
        if (btnClearPetSearch) btnClearPetSearch.style.display = 'none';
        if (btnPetClearFilters) btnPetClearFilters.style.display = 'none';
        if (petFilterSpecies) petFilterSpecies.value = 'ALL';
        if (petFilterBreed) petFilterBreed.value = 'ALL';
        if (petFilterWeight) petFilterWeight.value = 'ALL';
        if (petFilterVaccine) petFilterVaccine.value = 'ALL';

        isHotelOnly = false;
        isAlertOnly = false;
        petCurrentPage = 1;

        if (btnToggleHotelOnly) btnToggleHotelOnly.classList.remove('active');
        if (btnToggleAlertOnly) btnToggleAlertOnly.classList.remove('active');
        document.querySelectorAll('#tab-pet-list .kpi-card, .pet-kpi-card').forEach(c => c.classList.remove('active'));

        updatePetKPIs();
        renderPetsTable();
    }

    // Modal xem trước thẻ đeo cổ in nhiệt 80mm
    function openCollarTagPreview(pet) {
        const modalCollarTagPreview = document.getElementById('modalCollarTagPreview');
        if (!modalCollarTagPreview || !pet) return;

        const nameEl = document.getElementById('tagPreviewPetName');
        const infoEl = document.getElementById('tagPreviewPetInfo');
        const codeEl = document.getElementById('tagPreviewPetCode');
        const ownerNameEl = document.getElementById('tagPreviewOwnerName');
        const ownerPhoneEl = document.getElementById('tagPreviewOwnerPhone');
        const intakeTimeEl = document.getElementById('tagPreviewIntakeTime');
        const alertWrap = document.getElementById('tagPreviewAlertWrapper');
        const alertTextEl = document.getElementById('tagPreviewAlertText');
        const barcodeNumEl = document.getElementById('tagPreviewBarcodeNum');

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ngày ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()}`;

        if (nameEl) nameEl.textContent = (pet.name || 'BÉ CƯNG').toUpperCase();
        if (infoEl) infoEl.textContent = `${pet.speciesBreed || pet.breed || 'Chó'} • ${pet.weight || '5.0 kg'} • ${pet.gender || 'Đực'}`;
        if (codeEl) codeEl.textContent = pet.code || 'PET-NEW';
        if (ownerNameEl) ownerNameEl.textContent = pet.ownerName || 'Chủ nuôi';
        if (ownerPhoneEl) ownerPhoneEl.textContent = pet.ownerPhone || '0900000000';
        if (intakeTimeEl) intakeTimeEl.textContent = timeStr;
        if (barcodeNumEl) barcodeNumEl.textContent = `*${pet.code || 'PET-NEW'}*`;

        if (alertWrap && alertTextEl) {
            if (pet.alert) {
                alertTextEl.textContent = pet.alert;
                alertWrap.style.display = 'block';
            } else {
                alertWrap.style.display = 'none';
            }
        }

        modalCollarTagPreview.classList.add('open');
    }

    function initPetListSubtab() {
        // Tạo container portal dropdown nếu chưa có
        petGlobalActionDropdown = document.getElementById('petGlobalActionDropdown');
        if (!petGlobalActionDropdown) {
            petGlobalActionDropdown = document.createElement('div');
            petGlobalActionDropdown.id = 'petGlobalActionDropdown';
            petGlobalActionDropdown.className = 'action-dropdown-menu';
            document.body.appendChild(petGlobalActionDropdown);
        }

        // Bắt sự kiện trên dropdown portal
        petGlobalActionDropdown.addEventListener('click', async (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            e.stopPropagation();

            const action = item.getAttribute('data-action');
            const petId = petGlobalActionDropdown.getAttribute('data-id');
            closePetGlobalDropdown();

            const petsData = PawpalPets.state?.petsData || {};
            if (!petId || !petsData[petId]) return;
            const pet = petsData[petId];

            if (action === 'profile') {
                sessionStorage.setItem('pawpal_admin_pet_id', petId);
                sessionStorage.setItem('pawpal_admin_pet_name', pet.name);
                if (PawpalPets.subtabs.profile?.openPetProfile) {
                    PawpalPets.subtabs.profile.openPetProfile(petId);
                } else if (PawpalPets.openPetProfile) {
                    PawpalPets.openPetProfile(petId);
                }
            } else if (action === 'weigh') {
                currentWeighingPetId = petId;
                const weighPetName = document.getElementById('weighPetName');
                const weighOldWeight = document.getElementById('weighPetOldWeight');
                const weighNewWeightInput = document.getElementById('weighPetNewWeight');
                const modalWeigh = document.getElementById('modalWeighPet');
                if (weighPetName) weighPetName.value = pet.name;
                if (weighOldWeight) weighOldWeight.value = pet.weight;
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || 8.5;
                if (PawpalPets.subtabs.profile?.updatePriceMatrix) {
                    PawpalPets.subtabs.profile.updatePriceMatrix(weighNewWeightInput ? weighNewWeightInput.value : 8.5);
                }
                if (modalWeigh) modalWeigh.classList.add('open');
            } else if (action === 'print') {
                openCollarTagPreview(pet);
            } else if (action === 'service') {
                handleCreateServiceForPet(petId);
            } else if (action === 'archive') {
                PawpalPets.showPetConfirmModal({
                    title: 'Lưu trữ hồ sơ',
                    message: `Bạn có chắc muốn lưu trữ hồ sơ của bé cưng ${pet.name || petId}?`,
                    confirmText: 'Lưu trữ',
                    isDanger: true,
                    onConfirm: async () => {
                        try {
                            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                            if (client && pet.rawId) {
                                await client.from('pet_profile').update({ status: 'INACTIVE' }).eq('id', pet.rawId);
                            }
                        } catch (aErr) {
                            console.error('Supabase archive error:', aErr);
                        }
                        await PawpalPets.loadPetsModuleData();
                        renderPetsTable();
                        updatePetKPIs();
                        PawpalPets.showToast(`Đã lưu trữ hồ sơ bé cưng ${pet.name}!`, 'success');
                    }
                });
            } else if (action === 'restore') {
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && pet.rawId) {
                        await client.from('pet_profile').update({ status: 'ACTIVE' }).eq('id', pet.rawId);
                    }
                } catch (rErr) {
                    console.error('Supabase restore error:', rErr);
                }
                await PawpalPets.loadPetsModuleData();
                renderPetsTable();
                updatePetKPIs();
                PawpalPets.showToast(`Đã khôi phục hoạt động cho bé cưng ${pet.name}!`);
            }
        });

        // Bấm 3 chấm mở dropdown hoặc click ra ngoài để đóng
        document.addEventListener('click', (e) => {
            const moreBtn = e.target.closest('.btn-action-more');
            if (moreBtn) {
                e.stopPropagation();
                togglePetGlobalDropdown(moreBtn);
                return;
            }

            if (!e.target.closest('#petGlobalActionDropdown')) {
                closePetGlobalDropdown();
            }
        });

        window.addEventListener('resize', closePetGlobalDropdown);
        const petScrollBox = document.querySelector('.table-responsive-wrapper');
        if (petScrollBox) {
            petScrollBox.addEventListener('scroll', closePetGlobalDropdown);
        }

        // Bắt sự kiện bộ lọc & tìm kiếm
        const petSearchInput = document.getElementById('petSearchInput');
        const petFilterSpecies = document.getElementById('petFilterSpecies');
        const petFilterBreed = document.getElementById('petFilterBreed');
        const petFilterWeight = document.getElementById('petFilterWeight');
        const petFilterVaccine = document.getElementById('petFilterVaccine');
        const btnFilterHotelOnly = document.getElementById('btnFilterHotelOnly');
        const btnFilterAlertOnly = document.getElementById('btnFilterAlertOnly');
        const btnClearPetSearch = document.getElementById('btnClearPetSearch');
        const btnPetClearFilters = document.getElementById('btnPetClearFilters');

        if (petSearchInput) {
            petSearchInput.addEventListener('input', () => {
                if (btnClearPetSearch) btnClearPetSearch.style.display = petSearchInput.value ? 'block' : 'none';
                petCurrentPage = 1;
                renderPetsTable();
            });
        }

        if (btnClearPetSearch) {
            btnClearPetSearch.addEventListener('click', () => {
                if (petSearchInput) petSearchInput.value = '';
                btnClearPetSearch.style.display = 'none';
                petCurrentPage = 1;
                renderPetsTable();
            });
        }

        if (petFilterSpecies) petFilterSpecies.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });
        if (petFilterBreed) petFilterBreed.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });
        if (petFilterWeight) petFilterWeight.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });
        if (petFilterVaccine) petFilterVaccine.addEventListener('change', () => { petCurrentPage = 1; renderPetsTable(); });

        if (btnFilterHotelOnly) {
            btnFilterHotelOnly.addEventListener('click', () => {
                isHotelOnly = !isHotelOnly;
                btnFilterHotelOnly.classList.toggle('active', isHotelOnly);
                petCurrentPage = 1;
                renderPetsTable();
            });
        }

        if (btnFilterAlertOnly) {
            btnFilterAlertOnly.addEventListener('click', () => {
                isAlertOnly = !isAlertOnly;
                btnFilterAlertOnly.classList.toggle('active', isAlertOnly);
                petCurrentPage = 1;
                renderPetsTable();
            });
        }

        if (btnPetClearFilters) {
            btnPetClearFilters.addEventListener('click', clearAllPetFilters);
        }

        // Điều hướng phân trang nút Prev / Next
        const petPrevBtn = document.getElementById('petPrevPageBtn');
        if (petPrevBtn) {
            petPrevBtn.addEventListener('click', () => {
                if (petCurrentPage > 1) {
                    petCurrentPage--;
                    renderPetsTable();
                    if (petScrollBox) petScrollBox.scrollTop = 0;
                }
            });
        }

        const petNextBtn = document.getElementById('petNextPageBtn');
        if (petNextBtn) {
            petNextBtn.addEventListener('click', () => {
                const petsData = PawpalPets.state?.petsData || {};
                const totalPages = Math.ceil(Object.values(petsData).length / PETS_PER_PAGE) || 1;
                if (petCurrentPage < totalPages) {
                    petCurrentPage++;
                    renderPetsTable();
                    if (petScrollBox) petScrollBox.scrollTop = 0;
                }
            });
        }

        // Xuất file CSV danh sách thú cưng
        const btnExportPetReport = document.getElementById('btnExportPetReport');
        if (btnExportPetReport) {
            btnExportPetReport.addEventListener('click', () => {
                const petsData = PawpalPets.state?.petsData || {};
                const petsList = Object.values(petsData);
                const headers = ['Mã bé cưng', 'Tên bé cưng', 'Loài và giống', 'Giới tính', 'Cân nặng', 'Ngày sinh', 'Chủ sở hữu', 'Số điện thoại', 'Cảnh báo an toàn', 'Trạng thái'];
                const rows = petsList.map(p => [
                    `"${p.code || ''}"`,
                    `"${p.name || ''}"`,
                    `"${p.speciesBreed || p.breed || ''}"`,
                    `"${p.gender || ''}"`,
                    `"${p.weight || ''}"`,
                    `"${p.dob || ''}"`,
                    `"${p.ownerName || ''}"`,
                    `"${p.ownerPhone || ''}"`,
                    `"${(p.alert || 'Bình thường').replace(/"/g, '""')}"`,
                    `"${p.status || 'Đang nuôi'}"`
                ]);

                const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                link.setAttribute('href', url);
                link.setAttribute('download', `danh_sach_thu_cung_pawpal_${dateStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                PawpalPets.showToast('Đã xuất thành công danh sách thú cưng sang file CSV!');
            });
        }

        // Gắn sự kiện mở hồ sơ chi tiết từ link hoặc avatar
        document.addEventListener('click', (e) => {
            const btnOpen = e.target.closest('.btn-open-pet-drawer');
            if (btnOpen) {
                const petId = btnOpen.getAttribute('data-id') || btnOpen.closest('tr')?.getAttribute('data-id');
                if (petId) {
                    if (PawpalPets.subtabs.profile?.openPetProfile) {
                        PawpalPets.subtabs.profile.openPetProfile(petId);
                    } else if (PawpalPets.openPetProfile) {
                        PawpalPets.openPetProfile(petId);
                    }
                }
            }

            // Nhảy sang Khách hàng từ bảng
            const btnJumpCust = e.target.closest('.btn-jump-customer');
            if (btnJumpCust) {
                const custId = btnJumpCust.getAttribute('data-cust-id');
                if (!custId) return;

                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
                sessionStorage.removeItem('pawpal_admin_customer_drawertab');

                const targetHash = '#tab-profile';
                if (window.location.hash === targetHash &&
                    sessionStorage.getItem('pawpal_admin_active_module') === 'Khách hàng') {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                } else {
                    window.location.hash = targetHash;
                }
            }
        });

        // Setup Tiếp nhận bé cưng mới
        setupAddPetModal();

        // Setup In thẻ đeo cổ
        setupCollarTagModal();

        // Setup Cân bé
        setupWeighModal();
    }

    function setupAddPetModal() {
        const modalAddPet = document.getElementById('modalAddPet');
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        const newPetDobInput = document.getElementById('newPetDob');
        const newPetOwnerInput = document.getElementById('newPetOwnerInput');
        const newPetOwnerHidden = document.getElementById('newPetOwner');
        const newPetOwnerDropdown = document.getElementById('newPetOwnerDropdown');
        const newPetOwnerSelectedCard = document.getElementById('newPetOwnerSelectedCard');
        const btnPreviewCollarTagFromAdd = document.getElementById('btnPreviewCollarTagFromAdd');
        const btnSubmitAddPet = document.getElementById('btnSubmitAddPet');
        const modalQuickAddOwner = document.getElementById('modalQuickAddOwner');
        const btnOpenQuickAddOwnerModal = document.getElementById('btnOpenQuickAddOwnerModal');
        const btnSubmitQuickAddOwner = document.getElementById('btnSubmitQuickAddOwner');

        // Autocomplete chủ nuôi
        if (newPetOwnerInput && newPetOwnerDropdown) {
            function updateOwnerAutocomplete(query) {
                const q = (query || '').toLowerCase().trim();
                const customersData = PawpalPets.state?.customersData || {};
                const allCusts = Object.values(customersData);
                const matched = allCusts.filter(c => 
                    !q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || c.id.toLowerCase().includes(q)
                ).slice(0, 15);

                if (matched.length === 0) {
                    newPetOwnerDropdown.innerHTML = '<div class="autocomplete-empty">Không tìm thấy khách hàng. Bấm "Thêm nhanh chủ nuôi" để tạo mới!</div>';
                } else {
                    newPetOwnerDropdown.innerHTML = matched.map(c => {
                        const initial = (c.name || 'K').trim().charAt(0).toUpperCase();
                        return `
                            <div class="autocomplete-item" data-id="${c.id}" data-name="${c.name}" data-phone="${c.phone || ''}" data-tier="${c.tier || 'Khách mới'}">
                                <div class="autocomplete-item-info">
                                    <div class="autocomplete-avatar">${initial}</div>
                                    <div class="autocomplete-meta">
                                        <div class="autocomplete-item-name">${c.name}</div>
                                        <div class="autocomplete-item-phone">${c.phone || 'Chưa có SĐT'} • ${c.id}</div>
                                    </div>
                                </div>
                                <div class="autocomplete-item-badge">Hạng ${c.tier || 'Khách mới'}</div>
                            </div>
                        `;
                    }).join('');
                }
                newPetOwnerDropdown.style.display = 'block';
            }

            newPetOwnerInput.addEventListener('focus', () => updateOwnerAutocomplete(newPetOwnerInput.value));
            newPetOwnerInput.addEventListener('input', () => updateOwnerAutocomplete(newPetOwnerInput.value));

            newPetOwnerDropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.autocomplete-item');
                if (item) {
                    const custId = item.getAttribute('data-id');
                    const custName = item.getAttribute('data-name');
                    const custPhone = item.getAttribute('data-phone');
                    const custTier = item.getAttribute('data-tier');

                    if (newPetOwnerHidden) newPetOwnerHidden.value = custId;
                    newPetOwnerInput.value = `${custName} - ${custPhone}`;
                    if (newPetOwnerSelectedCard) {
                        newPetOwnerSelectedCard.innerHTML = `
                            <span>Chủ sở hữu: <strong>${custName}</strong> (${custPhone || 'Chưa có SĐT'})</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span>Hạng: <strong>${custTier}</strong></span>
                                <button type="button" class="btn-clear-selected-new-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cursor: pointer; padding: 0 4px; font-weight: 600;">✕ Bỏ chọn</button>
                            </div>
                        `;
                        newPetOwnerSelectedCard.style.display = 'flex';
                        const btnClear = newPetOwnerSelectedCard.querySelector('.btn-clear-selected-new-owner');
                        if (btnClear) {
                            btnClear.addEventListener('click', (ev) => {
                                ev.stopPropagation();
                                if (newPetOwnerHidden) newPetOwnerHidden.value = '';
                                if (newPetOwnerInput) newPetOwnerInput.value = '';
                                newPetOwnerSelectedCard.style.display = 'none';
                            });
                        }
                    }
                    newPetOwnerDropdown.style.display = 'none';
                }
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.pet-owner-autocomplete-wrapper')) {
                    newPetOwnerDropdown.style.display = 'none';
                }
            });
        }

        // Mở popup Thêm nhanh chủ nuôi
        if (btnOpenQuickAddOwnerModal && modalQuickAddOwner) {
            btnOpenQuickAddOwnerModal.addEventListener('click', () => {
                modalQuickAddOwner.classList.add('open');
            });
        }

        // Lưu tạo nhanh chủ nuôi trực tiếp vào Supabase
        if (btnSubmitQuickAddOwner) {
            btnSubmitQuickAddOwner.addEventListener('click', async () => {
                const name = document.getElementById('quickOwnerName')?.value.trim();
                const phone = document.getElementById('quickOwnerPhone')?.value.trim();
                const tier = document.getElementById('quickOwnerTier')?.value || 'Khách mới';
                const address = document.getElementById('quickOwnerAddress')?.value.trim();

                if (!name || !phone) {
                    PawpalPets.showToast('Vui lòng nhập đầy đủ họ tên và số điện thoại của chủ nuôi!', 'warning');
                    return;
                }

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        const { data: newCust, error: custErr } = await client.from('customer').insert({
                            phone_main: phone,
                            email: '',
                            account_status: 'ACTIVE'
                        }).select().single();

                        if (custErr) {
                            console.error('Supabase create customer error:', custErr);
                            PawpalPets.showToast('Lỗi tạo chủ nuôi: ' + custErr.message, 'danger');
                            return;
                        }

                        if (newCust) {
                            await client.from('customer_profile').insert({
                                customer_id: newCust.id,
                                full_name: name
                            });

                            if (!PawpalPets.state.customersData) PawpalPets.state.customersData = {};
                            PawpalPets.state.customersData[newCust.id] = {
                                id: newCust.id,
                                name: name,
                                phone: phone,
                                tier: tier,
                                address: address
                            };

                            if (newPetOwnerHidden) newPetOwnerHidden.value = newCust.id;
                            if (newPetOwnerInput) newPetOwnerInput.value = `${name} - ${phone} (Hạng ${tier})`;

                            if (modalQuickAddOwner) modalQuickAddOwner.classList.remove('open');
                            PawpalPets.showToast(`Đã tạo nhanh khách hàng ${name} thành công!`);
                        }
                    }
                } catch (err) {
                    console.error('Create quick owner exception:', err);
                    PawpalPets.showToast('Lỗi khi lưu khách hàng vào CSDL: ' + err.message, 'danger');
                }
            });
        }

        // Nút xem trước thẻ in từ form tiếp nhận
        if (btnPreviewCollarTagFromAdd) {
            btnPreviewCollarTagFromAdd.addEventListener('click', () => {
                const name = document.getElementById('newPetName')?.value.trim();
                if (!name) {
                    PawpalPets.showToast('Vui lòng nhập tên bé cưng.', 'warning');
                    document.getElementById('newPetName')?.focus();
                    return;
                }
                const customersData = PawpalPets.state?.customersData || {};
                const ownerCustId = newPetOwnerHidden?.value;
                const cust = customersData[ownerCustId] || { name: 'Khách hàng', phone: '0900000000' };
                const species = document.getElementById('newPetSpecies')?.value || 'dog';
                const breed = document.getElementById('newPetBreed')?.value || 'Corgi';
                const gender = document.getElementById('newPetGender')?.value === 'female' ? 'Cái' : 'Đực';
                const weightInput = document.getElementById('newPetWeight');
                const weightValue = weightInput?.value.trim() || '';
                const weight = Number(weightValue);
                if (!weightValue || !Number.isFinite(weight) || weight <= 0) {
                    PawpalPets.showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weightInput?.focus();
                    return;
                }
                const alertText = document.getElementById('newPetAlert')?.value || '';

                const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
                const speciesBreedStr = `${speciesNameMap[species] || 'Chó'} ${breed}`;

                const petsData = PawpalPets.state?.petsData || {};
                openCollarTagPreview({
                    name: name,
                    code: 'PET-' + String(Object.keys(petsData).length + 1).padStart(3, '0'),
                    speciesBreed: speciesBreedStr,
                    weight: `${weight} kg`,
                    gender: gender,
                    ownerName: cust.name,
                    ownerPhone: cust.phone,
                    alert: alertText
                });
            });
        }

        // Mở modal tiếp nhận
        if (btnOpenAddPet && modalAddPet) {
            btnOpenAddPet.addEventListener('click', () => {
                if (newPetOwnerInput) newPetOwnerInput.value = '';
                if (newPetOwnerHidden) newPetOwnerHidden.value = '';
                if (newPetOwnerSelectedCard) newPetOwnerSelectedCard.style.display = 'none';
                modalAddPet.classList.add('open');
            });

            if (sessionStorage.getItem('pawpal_admin_pet_open_add_modal') === 'true') {
                sessionStorage.removeItem('pawpal_admin_pet_open_add_modal');
                if (newPetOwnerInput) newPetOwnerInput.value = '';
                if (newPetOwnerHidden) newPetOwnerHidden.value = '';
                if (newPetOwnerSelectedCard) newPetOwnerSelectedCard.style.display = 'none';
                modalAddPet.classList.add('open');
            }
        }

        // Submit form tiếp nhận bé mới trực tiếp vào Supabase
        if (btnSubmitAddPet) {
            btnSubmitAddPet.addEventListener('click', async () => {
                const nameInput = document.getElementById('newPetName');
                const name = nameInput?.value.trim() || '';
                if (!name) {
                    PawpalPets.showToast('Vui lòng nhập tên bé cưng.', 'warning');
                    nameInput?.focus();
                    return;
                }

                const dob = newPetDobInput?.value || '';
                if (dob && !PawpalPets.isValidPetBirthDate(dob)) {
                    PawpalPets.showToast('Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.', 'warning');
                    newPetDobInput?.focus();
                    return;
                }

                const customersData = PawpalPets.state?.customersData || {};
                let ownerCustId = newPetOwnerHidden?.value;
                if (!ownerCustId || !customersData[ownerCustId]) {
                    const firstCustId = Object.keys(customersData)[0];
                    ownerCustId = firstCustId || null;
                }

                const species = document.getElementById('newPetSpecies')?.value || 'dog';
                const breed = document.getElementById('newPetBreed')?.value.trim() || 'Corgi';
                const gender = document.getElementById('newPetGender')?.value === 'female' ? 'Cái' : 'Đực';
                const weightInput = document.getElementById('newPetWeight');
                const weightValue = weightInput?.value.trim() || '';
                const weight = Number(weightValue);
                if (!weightValue || !Number.isFinite(weight) || weight <= 0) {
                    PawpalPets.showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weightInput?.focus();
                    return;
                }
                const color = document.getElementById('newPetColor')?.value.trim() || 'Vàng trắng';
                const alertText = document.getElementById('newPetAlert')?.value.trim() || '';
                const allergy = document.getElementById('newPetAllergy')?.value.trim() || 'Không';

                const petsData = PawpalPets.state?.petsData || {};
                const newPetId = 'PET-' + String(Object.keys(petsData).length + 1).padStart(3, '0');
                const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
                const speciesBreedStr = `${speciesNameMap[species] || 'Chó'} ${breed}`;

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        const { data: duplicatePets, error: duplicateCheckError } = await client
                            .from('pet_profile')
                            .select('id, pet_name')
                            .eq('customer_id', ownerCustId)
                            .ilike('pet_name', name)
                            .limit(1);
                        if (duplicateCheckError) throw duplicateCheckError;
                        if (duplicatePets?.length) {
                            PawpalPets.showToast(`Chủ nuôi đã có bé cưng tên "${name}". Vui lòng dùng tên khác.`, 'warning');
                            nameInput?.focus();
                            return;
                        }
                        const insertPayload = {
                            customer_id: ownerCustId,
                            pet_code: newPetId,
                            pet_name: name,
                            species: species,
                            breed: breed,
                            gender: gender === 'Cái' ? 'FEMALE' : 'MALE',
                            date_of_birth: dob || null,
                            weight: weight,
                            color: color,
                            routine: alertText ? `Cảnh báo: ${alertText}` : 'Tiếp nhận mới tại quầy.',
                            allergy: allergy,
                            vaccination_history: 'Đã tiêm phòng định kỳ',
                            avatar_url: species === 'cat' ? '/assets/images/publics/catcute5.jpg' : '/assets/images/publics/dogcute3.jpg',
                            status: 'ACTIVE'
                        };

                        const { data: createdPet, error: petErr } = await client.from('pet_profile').insert(insertPayload).select().single();
                        if (petErr) {
                            console.error('Supabase insert pet error:', petErr);
                            PawpalPets.showToast('Lỗi lưu bé cưng vào CSDL: ' + petErr.message, 'danger');
                            return;
                        }

                        const { error: initialWeightError } = await client.from('pet_weight_history').insert({
                            pet_id: createdPet.id,
                            weight: weight,
                            measured_at: new Date().toISOString(),
                            recorded_by_name: 'Nhân viên PawPal'
                        });
                        if (initialWeightError) {
                            console.error('Supabase initial pet weight history error:', initialWeightError);
                            PawpalPets.showToast('Đã tạo hồ sơ nhưng chưa ghi được lịch sử cân nặng: ' + initialWeightError.message, 'danger');
                        }

                        await PawpalPets.loadPetsModuleData();
                        renderPetsTable();
                        updatePetKPIs();

                        const savedPetObj = PawpalPets.state?.petsData?.[newPetId] || {
                            name: name,
                            code: newPetId,
                            speciesBreed: speciesBreedStr,
                            weight: `${weight} kg`,
                            gender: gender,
                            ownerName: customersData[ownerCustId]?.name || 'Khách hàng',
                            ownerPhone: customersData[ownerCustId]?.phone || '0900000000',
                            alert: alertText
                        };

                        PawpalPets.showToast(`Tiếp nhận bé ${name} (${newPetId}) thành công!`);
                        if (modalAddPet) modalAddPet.classList.remove('open');

                        setTimeout(() => {
                            openCollarTagPreview(savedPetObj);
                        }, 300);
                    }
                } catch (err) {
                    console.error('Add pet exception:', err);
                    PawpalPets.showToast('Lỗi khi tiếp nhận bé cưng: ' + err.message, 'danger');
                }
            });
        }
    }

    function setupCollarTagModal() {
        const modalCollarTagPreview = document.getElementById('modalCollarTagPreview');
        const btnConfirmSendPrintCollar = document.getElementById('btnConfirmSendPrintCollar');

        if (btnConfirmSendPrintCollar) {
            btnConfirmSendPrintCollar.addEventListener('click', () => {
                PawpalPets.showToast('Đã gửi lệnh in thẻ đeo cổ tới máy in nhãn nhiệt quầy tiếp nhận!');
                if (modalCollarTagPreview) modalCollarTagPreview.classList.remove('open');
            });
        }

        document.addEventListener('click', (e) => {
            const btnPrint = e.target.closest('.btn-print-collar-tag');
            if (btnPrint) {
                const petId = btnPrint.getAttribute('data-id');
                const petsData = PawpalPets.state?.petsData || {};
                const pet = petsData[petId];
                if (pet) {
                    openCollarTagPreview(pet);
                }
                closePetGlobalDropdown();
            }
        });
    }

    function setupWeighModal() {
        const modalWeighPet = document.getElementById('modalWeighPet');
        const weighNewWeightInput = document.getElementById('weighPetNewWeight');
        const btnSubmitWeigh = document.getElementById('btnSubmitWeigh');
        const formWeighPet = document.getElementById('formWeighPet');

        if (formWeighPet) formWeighPet.addEventListener('submit', (e) => e.preventDefault());

        if (weighNewWeightInput) {
            weighNewWeightInput.addEventListener('input', (e) => {
                if (PawpalPets.subtabs.profile?.updatePriceMatrix) {
                    PawpalPets.subtabs.profile.updatePriceMatrix(e.target.value);
                }
            });
        }

        document.addEventListener('click', (e) => {
            const btnWeigh = e.target.closest('.btn-open-weigh-modal');
            if (btnWeigh) {
                currentWeighingPetId = btnWeigh.getAttribute('data-id') || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                const petsData = PawpalPets.state?.petsData || {};
                const pet = petsData[currentWeighingPetId];
                if (!pet) return;
                
                const weighPetName = document.getElementById('weighPetName');
                const weighOldWeight = document.getElementById('weighPetOldWeight');
                if (weighPetName) weighPetName.value = pet.name;
                if (weighOldWeight) weighOldWeight.value = pet.weight;
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || 8.5;

                if (modalWeighPet) {
                    modalWeighPet.classList.add('open');
                    if (PawpalPets.subtabs.profile?.updatePriceMatrix) {
                        PawpalPets.subtabs.profile.updatePriceMatrix(weighNewWeightInput.value);
                    }
                }
            }
        });

        if (btnSubmitWeigh) {
            btnSubmitWeigh.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const weightValue = weighNewWeightInput?.value.trim() || '';
                const newKg = Number(weightValue);
                const petsData = PawpalPets.state?.petsData || {};
                const pet = petsData[currentWeighingPetId];
                if (!pet) return;

                if (!weightValue || !Number.isFinite(newKg) || newKg <= 0 || newKg < 0.1) {
                    PawpalPets.showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weighNewWeightInput?.focus();
                    return;
                }

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client || !pet.rawId) {
                        PawpalPets.showToast('Không thể lưu cân nặng khi chưa kết nối được hồ sơ thú cưng.', 'danger');
                        return;
                    }

                    const measuredAt = new Date().toISOString();
                    const { error: historyError } = await client.from('pet_weight_history').insert({
                        pet_id: pet.rawId,
                        weight: newKg,
                        measured_at: measuredAt,
                        recorded_by_name: window.currentUser?.full_name || window.currentUser?.name || 'Nhân viên PawPal'
                    });
                    if (historyError) throw historyError;

                    const { error: wErr } = await client.from('pet_profile').update({ weight: newKg }).eq('id', pet.rawId);
                    if (wErr) throw wErr;
                } catch (err) {
                    console.error('Weight update error:', err);
                    PawpalPets.showToast('Lỗi lưu cân nặng: ' + (err.message || 'Không thể ghi dữ liệu.'), 'danger');
                    return;
                }

                await PawpalPets.loadPetsModuleData();
                renderPetsTable();
                updatePetKPIs();

                const updatedPet = PawpalPets.state?.petsData?.[currentWeighingPetId];
                if (updatedPet && PawpalPets.subtabs.profile?.renderPetSubtabs) {
                    PawpalPets.subtabs.profile.renderPetSubtabs(updatedPet);
                }

                PawpalPets.showToast(`Đã lưu cân nặng mới (${newKg} kg) cho bé ${pet.name}!`);
                if (modalWeighPet) modalWeighPet.classList.remove('open');
            });
        }
    }

    PawpalPets.subtabs.list = {
        init: initPetListSubtab,
        renderPetsTable,
        updatePetKPIs,
        clearAllPetFilters,
        openCollarTagPreview
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPetListSubtab);
    } else {
        initPetListSubtab();
    }
})();
