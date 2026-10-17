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
    const esc = (s) => (PawpalPets.escapeHtml ? PawpalPets.escapeHtml(s) : String(s || ''));

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
        if (!pet) {
            PawpalPets.showToast('Không tìm thấy thông tin thú cưng để tạo dịch vụ.', 'warning');
            return;
        }

        const petUuid = pet.rawId || pet.id || petId;
        const ownerUuid = pet.custId || pet.customerId || '';

        sessionStorage.setItem('pawpal_admin_selected_pet_id', petUuid);
        sessionStorage.setItem('pawpal_admin_selected_pet_code', pet.code || '');
        sessionStorage.setItem('pawpal_admin_selected_pet_name', pet.name || '');
        sessionStorage.setItem('pawpal_admin_selected_pet_weight', pet.weight || '');
        sessionStorage.setItem('pawpal_admin_selected_pet_owner_id', ownerUuid);
        sessionStorage.setItem('pawpal_admin_services_open_booking_modal', 'true');

        if (window.PawpalRouter?.navigateToModule) {
            window.PawpalRouter.navigateToModule('Dịch vụ', 'tab-service-bookings');
        } else {
            const serviceNavBtn = document.querySelector('.admin-nav-item[data-module="Dịch vụ"]');
            if (serviceNavBtn) {
                serviceNavBtn.click();
            } else {
                window.location.hash = '#tab-service-bookings';
            }
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

        // Nếu dữ liệu đang tải và chưa có bản ghi: giữ nguyên skeleton animation
        if (petsList.length === 0 && !PawpalPets.state?.isLoaded) {
            if (PawpalPets.state?.loadError) {
                [statTotal, statDog, statCat, statOther, statAlert].forEach(element => { if (element) element.textContent = '—'; });
            }
            return;
        }

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
                const rawKg = pet.weightNum ?? parseFloat(pet.weight);
                const hasValidWeight = typeof rawKg === 'number' && !Number.isNaN(rawKg) && rawKg > 0;
                if (!hasValidWeight) return false; // Không xếp thú cưng chưa có cân nặng vào bất kỳ khoảng số nào

                if (weightVal === 'under5' && rawKg >= 5) return false;
                if (weightVal === '5to10' && (rawKg < 5 || rawKg >= 10)) return false;
                if (weightVal === '10to20' && (rawKg < 10 || rawKg >= 20)) return false;
                if (weightVal === 'over20' && rawKg < 20) return false;
            }

            if (vaccineVal !== 'ALL') {
                const isVaccinated = pet.vaccinated === true || (Boolean(pet.vaccineHistory) && !/^(chưa|chua|không|khong|none)$/i.test(String(pet.vaccineHistory).trim()));
                if (vaccineVal === 'VACCINATED' && !isVaccinated) return false;
                if (vaccineVal === 'NOT_VACCINATED' && isVaccinated) return false;
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
            if (PawpalPets.state?.loadError) {
                delete tbody.dataset.loadingSkeleton;
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--text-muted);">Không thể tải danh sách thú cưng. Vui lòng tải lại trang.</td></tr>';
                return;
            }
            if (!PawpalPets.state?.isLoaded) {
                tbody.dataset.loadingSkeleton = 'true';
                tbody.innerHTML = Array.from({ length: 5 }, (_, i) => `
                    <tr class="skeleton-row admin-auto-skeleton">
                        <td style="text-align: center;"><span class="skeleton-avatar"></span></td>
                        <td><span class="skeleton-text" style="width: ${65 + (i % 2) * 10}px;"></span></td>
                        <td>
                            <span class="skeleton-text" style="width: ${85 + (i % 3) * 15}px; margin-bottom: 5px;"></span>
                            <span class="skeleton-text" style="width: 55px; height: 11px;"></span>
                        </td>
                        <td><span class="skeleton-text" style="width: ${95 + (i % 2) * 20}px;"></span></td>
                        <td><span class="skeleton-text" style="width: 45px;"></span></td>
                        <td>
                            <span class="skeleton-text" style="width: ${100 + (i % 3) * 15}px; margin-bottom: 5px;"></span>
                            <span class="skeleton-text" style="width: 75px; height: 11px;"></span>
                        </td>
                        <td><span class="skeleton-text" style="width: 40px;"></span></td>
                        <td><span class="skeleton-badge"></span></td>
                        <td style="text-align: center;"><span class="skeleton-text" style="width: 20px;"></span></td>
                    </tr>
                `).join('');
                return;
            }

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
                const lowAlert = String(pet.alert).toLowerCase();
                const safeAlert = esc(pet.alert);
                if (lowAlert.includes('cắn') || lowAlert.includes('dữ') || lowAlert.includes('hung') || lowAlert.includes('nguy hiểm') || lowAlert.includes('cảnh báo:')) {
                    alertRowClass = 'row-alert-critical';
                    alertHtml = `<span class="alert-indicator text-danger" title="${safeAlert}">• ${safeAlert.split(' • ').join('<br>• ')}</span>`;
                } else {
                    alertRowClass = 'row-alert-warning';
                    alertHtml = `<span class="alert-indicator text-warning" title="${safeAlert}">• ${safeAlert.split(' • ').join('<br>• ')}</span>`;
                }
            }

            const isArchived = pet.status === 'Lưu trữ';
            const rowClass = [alertRowClass, isArchived ? 'row-archived' : ''].filter(Boolean).join(' ');

            let statusBadgeClass = 'badge-success';
            if (pet.status === 'Lưu trú Hotel') statusBadgeClass = 'badge-warning';
            else if (pet.status === 'Lưu trữ') statusBadgeClass = 'badge-neutral';

            return `
                <tr class="${rowClass}" data-id="${esc(pet.code)}">
                    <td style="text-align: center;">
                        <img src="${esc(pet.avatar || '/assets/images/publics/dogcute3.jpg')}" class="pet-avatar-cell" alt="${esc(pet.name)}">
                    </td>
                    <td><strong>${esc(pet.code)}</strong></td>
                    <td>
                        <div class="pet-name-cell">
                            <a href="javascript:void(0)" class="pet-name-link btn-open-pet-drawer" data-id="${esc(pet.code)}">${esc(pet.name)}</a>
                        </div>
                        <div class="pet-sub-cell">${esc(pet.gender || 'Đực')} • ${esc(pet.dob || '')}</div>
                    </td>
                    <td>${esc(pet.breed || 'Chưa cập nhật')}</td>
                    <td><strong>${esc(pet.weight)}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${esc(pet.custId || 'CUST-001')}">${esc(pet.ownerName || 'Chủ nuôi')}</a>
                        <div class="pet-sub-cell">${esc(pet.ownerPhone || '')}</div>
                    </td>
                    <td>${alertHtml}</td>
                    <td>
                        <span class="admin-badge ${statusBadgeClass}">${esc(pet.status)}</span>
                    </td>
                    <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                        <button type="button" class="btn-action-more" data-id="${esc(pet.code)}" title="Tác vụ">•••</button>
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
                if (PawpalPets.subtabs.profile?.setWeighingPet) PawpalPets.subtabs.profile.setWeighingPet(petId);
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
                            if (!client || !pet.rawId) throw new Error('Thiếu kết nối hoặc mã hồ sơ thú cưng.');
                            const { data: archivedRows, error: archiveError } = await client.from('pet_profile').update({ status: 'INACTIVE' }).eq('id', pet.rawId).select('id, status');
                            if (archiveError) throw archiveError;
                            if (!Array.isArray(archivedRows) || archivedRows.length !== 1 || archivedRows[0].status !== 'INACTIVE') throw new Error('Không xác minh được trạng thái lưu trữ trong CSDL.');
                        } catch (aErr) {
                            console.error('Supabase archive error:', aErr);
                            PawpalPets.showToast('Không thể lưu trữ hồ sơ: ' + (aErr.message || 'Lỗi CSDL.'), 'danger');
                            return;
                        }
                        await PawpalPets.loadPetsModuleData({ force: true });
                        renderPetsTable();
                        updatePetKPIs();
                        PawpalPets.showToast(`Đã lưu trữ hồ sơ bé cưng ${pet.name}!`, 'success');
                    }
                });
            } else if (action === 'restore') {
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client || !pet.rawId) throw new Error('Thiếu kết nối hoặc mã hồ sơ thú cưng.');
                    const { data: restoredRows, error: restoreError } = await client.from('pet_profile').update({ status: 'ACTIVE' }).eq('id', pet.rawId).select('id, status');
                    if (restoreError) throw restoreError;
                    if (!Array.isArray(restoredRows) || restoredRows.length !== 1 || restoredRows[0].status !== 'ACTIVE') throw new Error('Không xác minh được trạng thái khôi phục trong CSDL.');
                } catch (rErr) {
                    console.error('Supabase restore error:', rErr);
                    PawpalPets.showToast('Không thể khôi phục hồ sơ: ' + (rErr.message || 'Lỗi CSDL.'), 'danger');
                    return;
                }
                await PawpalPets.loadPetsModuleData({ force: true });
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
        // Modal cân dùng chung bộ xử lý tại tab hồ sơ để mỗi lần bấm chỉ ghi một mốc.

        // Luôn render bảng thú cưng và cập nhật KPI ngay khi khởi tạo subtab
        renderPetsTable();
        updatePetKPIs();
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

        // ====================================================================
        // HỆ THỐNG AUTOCOMPLETE POPOVER KẾT NỐI TRỰC TIẾP TỪ CSDL SUPABASE
        // ====================================================================

        // 1. Autocomplete Chủ sở hữu - Hiển thị số lượng thú cưng đang sở hữu (loại bỏ UUID thô)
        if (newPetOwnerInput && newPetOwnerDropdown) {
            function updateOwnerAutocomplete(query) {
                const q = (query || '').toLowerCase().trim();
                const customersData = PawpalPets.state?.customersData || {};
                const petsData = PawpalPets.state?.petsData || {};
                const allCusts = Object.values(customersData);

                // Tính tổng số lượng bé cưng thuộc từng chủ nuôi từ CSDL
                const custPetCounts = {};
                Object.values(petsData).forEach(p => {
                    if (p.customerId) custPetCounts[p.customerId] = (custPetCounts[p.customerId] || 0) + 1;
                    if (p.ownerName) custPetCounts[p.ownerName] = (custPetCounts[p.ownerName] || 0) + 1;
                });

                const matched = allCusts.filter(c => 
                    !q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
                ).slice(0, 15);

                if (matched.length === 0) {
                    newPetOwnerDropdown.innerHTML = '<div class="autocomplete-empty">Không tìm thấy khách hàng. Bấm "Thêm nhanh chủ nuôi" để tạo mới!</div>';
                } else {
                    newPetOwnerDropdown.innerHTML = matched.map(c => {
                        const pCount = custPetCounts[c.id] || custPetCounts[c.name] || 0;
                        const petInfoStr = pCount > 0 ? `${pCount} bé cưng` : 'Khách hàng';
                        return `
                            <div class="autocomplete-item" data-id="${esc(c.id)}" data-name="${esc(c.name)}" data-phone="${esc(c.phone || '')}" data-tier="${esc(c.tier || 'Khách mới')}">
                                <div class="autocomplete-meta">
                                    <div class="autocomplete-item-name">${esc(c.name)}</div>
                                    <div class="autocomplete-item-phone">${esc(c.phone || 'Chưa có SĐT')} • ${esc(petInfoStr)}</div>
                                </div>
                                <div class="autocomplete-item-badge">Hạng ${esc(c.tier || 'Khách mới')}</div>
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
                            <span>Chủ sở hữu: <strong>${esc(custName)}</strong> (${esc(custPhone || 'Chưa có SĐT')})</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span>Hạng: <strong>${esc(custTier)}</strong></span>
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
        }

        // 2. Autocomplete Giống loài kết nối CSDL theo Loài thú cưng được chọn
        function setupBreedAutocomplete(inputEl, dropdownEl, speciesSelectEl) {
            if (!inputEl || !dropdownEl) return;

            const popularBreedsBySpecies = {
                'dog': ['Poodle', 'Corgi', 'Golden', 'Phốc sóc', 'Pug', 'Husky', 'Alaska', 'Shiba', 'Samoyed', 'Chihuahua', 'Lạp xưởng', 'Bull Pháp', 'Becgie', 'Pomeranian'],
                'cat': ['Mèo ALN', 'Mèo Ba Tư', 'Mèo Anh lông dài', 'Mèo Xiêm', 'Ragdoll', 'Mèo Nga', 'Mèo Bengal', 'Mèo Scottish Fold', 'Mèo Sphynx', 'Mèo Mướp', 'Mèo Mun'],
                'rabbit': ['Thỏ Minilop', 'Thỏ New Zealand', 'Thỏ Lionhead', 'Thỏ Hà Lan', 'Thỏ cảnh Rex'],
                'other': ['Hamster Bear', 'Hamster Winter White', 'Bọ ú Guinea Pig', 'Nhím kiểng', 'Sóc bay']
            };

            function getBreedsData() {
                const sp = (speciesSelectEl?.value || 'dog').toLowerCase();
                const petsData = PawpalPets.state?.petsData || {};
                const dbCounts = {};

                Object.values(petsData).forEach(p => {
                    const pSp = (p.species || 'dog').toLowerCase();
                    const br = (p.breed || '').trim();
                    // Lọc bỏ chuỗi rỗng, số hoặc từ khóa không xác định
                    if (!br) return;
                    if (/^\d+$/.test(br)) return;
                    if (/^(chưa rõ|chưa cập nhật|unknown|khác|undefined|null)$/i.test(br)) return;

                    if (pSp === sp) {
                        dbCounts[br] = (dbCounts[br] || 0) + 1;
                    }
                });

                const baseList = popularBreedsBySpecies[sp] || popularBreedsBySpecies['dog'];
                const allBreeds = Array.from(new Set([...Object.keys(dbCounts), ...baseList]));

                return allBreeds.map(name => ({
                    name,
                    count: dbCounts[name] || 0,
                    speciesName: sp === 'cat' ? 'Giống mèo' : (sp === 'dog' ? 'Giống cún' : 'Thú cưng nhỏ')
                })).sort((a, b) => b.count - a.count);
            }

            function renderDropdown(query) {
                const q = (query || '').toLowerCase().trim();
                const breeds = getBreedsData().filter(b => !q || b.name.toLowerCase().includes(q));

                if (breeds.length === 0) {
                    dropdownEl.innerHTML = '<div class="autocomplete-empty">Không tìm thấy giống loài phù hợp. Bạn có thể tự nhập tên giống mới!</div>';
                } else {
                    dropdownEl.innerHTML = breeds.map(b => {
                        const badgeText = b.count > 0 ? `${b.count} bé trong tiệm` : 'Phổ biến';
                        return `
                            <div class="autocomplete-item" data-value="${b.name}">
                                <div class="autocomplete-meta">
                                    <div class="autocomplete-item-name">${b.name}</div>
                                    <div class="autocomplete-item-phone">${b.speciesName}</div>
                                </div>
                                <div class="autocomplete-item-badge">${badgeText}</div>
                            </div>
                        `;
                    }).join('');
                }
                dropdownEl.style.display = 'block';
            }

            inputEl.addEventListener('focus', () => renderDropdown(inputEl.value));
            inputEl.addEventListener('input', () => renderDropdown(inputEl.value));

            dropdownEl.addEventListener('click', (e) => {
                const item = e.target.closest('.autocomplete-item');
                if (item) {
                    inputEl.value = item.getAttribute('data-value');
                    dropdownEl.style.display = 'none';
                }
            });

            if (speciesSelectEl) {
                speciesSelectEl.addEventListener('change', () => {
                    if (dropdownEl.style.display === 'block') renderDropdown(inputEl.value);
                });
            }
        }

        // 3. Autocomplete Màu lông tổng hợp từ CSDL
        function setupColorAutocomplete(inputEl, dropdownEl) {
            if (!inputEl || !dropdownEl) return;

            const baseColors = [
                'Vàng trắng', 'Xám khói', 'Nâu đỏ', 'Đen tuyền', 'Trắng kem',
                'Tam thể', 'Bicolor', 'Xám tro', 'Vàng kem', 'Nâu socola',
                'Vằn vện Tabby', 'Trắng tuyết', 'Tricolor', 'Xám xanh', 'Đốm đen trắng'
            ];

            function getColorsData() {
                const petsData = PawpalPets.state?.petsData || {};
                const dbCounts = {};

                Object.values(petsData).forEach(p => {
                    const c = (p.color || '').trim();
                    if (!c) return;
                    if (/^\d+$/.test(c)) return;
                    if (/^(chưa rõ|chưa cập nhật|unknown|khác|undefined|null)$/i.test(c)) return;
                    dbCounts[c] = (dbCounts[c] || 0) + 1;
                });

                const allColors = Array.from(new Set([...Object.keys(dbCounts), ...baseColors]));
                return allColors.map(name => ({
                    name,
                    count: dbCounts[name] || 0
                })).sort((a, b) => b.count - a.count);
            }

            function renderDropdown(query) {
                const q = (query || '').toLowerCase().trim();
                const colors = getColorsData().filter(c => !q || c.name.toLowerCase().includes(q));

                if (colors.length === 0) {
                    dropdownEl.innerHTML = '<div class="autocomplete-empty">Không có màu có sẵn. Bạn có thể tự nhập màu mới!</div>';
                } else {
                    dropdownEl.innerHTML = colors.map(c => {
                        const badgeText = c.count > 0 ? `${c.count} bé` : 'Màu phổ biến';
                        return `
                            <div class="autocomplete-item" data-value="${c.name}">
                                <div class="autocomplete-meta">
                                    <div class="autocomplete-item-name">${c.name}</div>
                                    <div class="autocomplete-item-phone">Màu sắc bộ lông</div>
                                </div>
                                <div class="autocomplete-item-badge">${badgeText}</div>
                            </div>
                        `;
                    }).join('');
                }
                dropdownEl.style.display = 'block';
            }

            inputEl.addEventListener('focus', () => renderDropdown(inputEl.value));
            inputEl.addEventListener('input', () => renderDropdown(inputEl.value));

            dropdownEl.addEventListener('click', (e) => {
                const item = e.target.closest('.autocomplete-item');
                if (item) {
                    inputEl.value = item.getAttribute('data-value');
                    dropdownEl.style.display = 'none';
                }
            });
        }

        // Khởi tạo các Autocomplete cho Modal Thêm bé cưng
        setupBreedAutocomplete(
            document.getElementById('newPetBreed'),
            document.getElementById('newPetBreedDropdown'),
            document.getElementById('newPetSpecies')
        );
        setupColorAutocomplete(
            document.getElementById('newPetColor'),
            document.getElementById('newPetColorDropdown')
        );

        // Xuất các hàm setup ra namespace để subtab hồ sơ (Modal chỉnh sửa) dùng chung
        PawpalPets.setupBreedAutocomplete = setupBreedAutocomplete;
        PawpalPets.setupColorAutocomplete = setupColorAutocomplete;

        // Đóng toàn bộ dropdown popover khi nhấp ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.pet-owner-autocomplete-wrapper') && !e.target.closest('.pet-field-autocomplete-wrapper')) {
                document.querySelectorAll('.autocomplete-dropdown').forEach(dd => {
                    dd.style.display = 'none';
                });
            }
        });

        // Mở popup Thêm nhanh chủ nuôi
        if (btnOpenQuickAddOwnerModal && modalQuickAddOwner) {
            btnOpenQuickAddOwnerModal.addEventListener('click', () => {
                const formQuick = document.getElementById('formQuickAddOwner');
                if (formQuick) formQuick.reset();
                modalQuickAddOwner.classList.add('open');
            });
        }

        // Lưu tạo nhanh chủ nuôi trực tiếp vào Supabase
        const formQuickAddOwner = document.getElementById('formQuickAddOwner');
        if (formQuickAddOwner) {
            formQuickAddOwner.addEventListener('submit', (e) => e.preventDefault());
        }

        if (btnSubmitQuickAddOwner) {
            btnSubmitQuickAddOwner.addEventListener('click', async (e) => {
                if (e) e.preventDefault();
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
                    if (!client) {
                        PawpalPets.showToast('Không có kết nối tới cơ sở dữ liệu Supabase.', 'danger');
                        return;
                    }

                    const activationToken = (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
                    const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                    const { data: newCust, error: custErr } = await client.from('customer').insert({
                        email: null,
                        phone_main: phone,
                        account_status: 'ACTIVE',
                        is_temporary: true,
                        note: 'Khách tạo nhanh tại quầy tiếp nhận thú cưng.',
                        activation_token: activationToken,
                        activation_token_expires_at: activationExpiresAt
                    }).select().single();

                    if (custErr || !newCust) {
                        console.error('Supabase create customer error:', custErr);
                        PawpalPets.showToast('Lỗi tạo chủ nuôi: ' + (custErr?.message || 'Không thể tạo tài khoản'), 'danger');
                        return;
                    }

                    const { error: profErr } = await client.from('customer_profile').insert({
                        customer_id: newCust.id,
                        full_name: name,
                        gender: 'OTHER'
                    });
                    if (profErr) {
                        console.error('Supabase create profile error:', profErr);
                        await client.from('customer').delete().eq('id', newCust.id);
                        PawpalPets.showToast('Lỗi tạo hồ sơ chủ nuôi: ' + profErr.message, 'danger');
                        return;
                    }

                    const { error: memErr } = await client.from('customer_membership').insert({
                        customer_id: newCust.id,
                        total_paw_points: 0
                    });
                    if (memErr) {
                        console.warn('Lỗi tạo membership cho chủ nuôi:', memErr);
                    }

                    if (address) {
                        const { error: addrErr } = await client.from('customer_address').insert({
                            customer_id: newCust.id,
                            receiver_name: name,
                            receiver_phone: phone,
                            street_address: address,
                            is_default: true
                        });
                        if (addrErr) {
                            console.warn('Lỗi lưu địa chỉ chủ nuôi:', addrErr);
                        }
                    }

                    if (!PawpalPets.state.customersData) PawpalPets.state.customersData = {};
                    PawpalPets.state.customersData[newCust.id] = {
                        id: newCust.id,
                        name: name,
                        phone: phone,
                        tier: tier,
                        address: address
                    };

                    if (newPetOwnerHidden) newPetOwnerHidden.value = newCust.id;
                    if (newPetOwnerInput) newPetOwnerInput.value = `${name} - ${phone}`;

                    if (newPetOwnerSelectedCard) {
                        newPetOwnerSelectedCard.innerHTML = `
                            <span>Chủ sở hữu: <strong>${name}</strong> (${phone})</span>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span>Hạng: <strong>${tier}</strong></span>
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

                    if (modalQuickAddOwner) {
                        modalQuickAddOwner.classList.remove('open');
                        modalQuickAddOwner.classList.remove('show');
                    }
                    if (formQuickAddOwner) formQuickAddOwner.reset();
                    PawpalPets.showToast(`Đã thêm thành công chủ nuôi ${name}!`, 'success');
                } catch (err) {
                    console.error('Create quick owner exception:', err);
                    PawpalPets.showToast('Lỗi khi lưu chủ nuôi vào CSDL: ' + err.message, 'danger');
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
        const formAddPet = document.getElementById('formAddPet');
        if (formAddPet) {
            formAddPet.addEventListener('submit', (e) => e.preventDefault());
        }

        if (btnSubmitAddPet) {
            btnSubmitAddPet.addEventListener('click', async (e) => {
                if (e) e.preventDefault();
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
                const ownerCustId = newPetOwnerHidden?.value?.trim();

                // P-01: Tuyệt đối không tự ý gán chủ sở hữu đầu tiên nếu chưa chọn rõ ràng
                if (!ownerCustId || !customersData[ownerCustId]) {
                    PawpalPets.showToast('Vui lòng tìm và chọn đúng chủ sở hữu từ danh sách gợi ý trước khi lưu bé cưng.', 'warning');
                    newPetOwnerInput?.focus();
                    return;
                }

                const species = document.getElementById('newPetSpecies')?.value || 'dog';
                const breed = document.getElementById('newPetBreed')?.value.trim() || 'Chưa cập nhật';
                const gender = document.getElementById('newPetGender')?.value === 'female' ? 'Cái' : 'Đực';
                const weightInput = document.getElementById('newPetWeight');
                const weightValue = weightInput?.value.trim() || '';
                const weight = Number(weightValue);
                if (!weightValue || !Number.isFinite(weight) || weight <= 0) {
                    PawpalPets.showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weightInput?.focus();
                    return;
                }
                const color = document.getElementById('newPetColor')?.value.trim() || 'Chưa cập nhật';
                const alertText = document.getElementById('newPetAlert')?.value.trim() || '';
                const allergy = document.getElementById('newPetAllergy')?.value.trim() || 'Không ghi nhận';

                const petsData = PawpalPets.state?.petsData || {};
                const randSuffix = Math.floor(100 + Math.random() * 900);
                const newPetId = 'PET-' + String(Date.now()).slice(-4) + '-' + randSuffix;
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
                            routine: alertText ? `Cảnh báo: ${alertText}` : 'Hồ sơ tạo mới.',
                            allergy: allergy,
                            vaccination_history: null, // P-03: Không tự động tạo xác nhận tiêm chủng giả
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

                        await PawpalPets.loadPetsModuleData({ force: true });
                        renderPetsTable();
                        updatePetKPIs();

                        PawpalPets.showToast(`Thêm bé ${name} (${newPetId}) thành công!`, 'success');
                        if (modalAddPet) {
                            modalAddPet.classList.remove('open');
                            modalAddPet.classList.remove('show');
                        }
                        if (formAddPet) formAddPet.reset();
                        if (newPetOwnerHidden) newPetOwnerHidden.value = '';
                        if (newPetOwnerSelectedCard) newPetOwnerSelectedCard.style.display = 'none';
                    }
                } catch (err) {
                    console.error('Add pet exception:', err);
                    PawpalPets.showToast('Lỗi khi thêm bé cưng: ' + err.message, 'danger');
                }
            });
        }
    }

    function setupCollarTagModal() {
        const modalCollarTagPreview = document.getElementById('modalCollarTagPreview');
        const btnConfirmSendPrintCollar = document.getElementById('btnConfirmSendPrintCollar');

        if (btnConfirmSendPrintCollar) {
            btnConfirmSendPrintCollar.addEventListener('click', () => {
                window.print();
                PawpalPets.showToast('Đã gửi lệnh in thẻ đeo cổ tới máy in nhãn!');
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
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || '';

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
                    // Nếu môi trường gặp sự cố với bảng lịch sử cân hoặc chưa phân quyền RLS cho anon, vẫn đảm bảo cập nhật cân nặng hiện tại
                    if (historyError && !/schema cache|relation .* does not exist|Could not find the table|permission denied/i.test(historyError.message || '')) {
                        throw historyError;
                    }

                    const { error: wErr } = await client.from('pet_profile').update({ weight: newKg }).eq('id', pet.rawId);
                    if (wErr) throw wErr;
                } catch (err) {
                    console.error('Weight update error:', err);
                    PawpalPets.showToast('Lỗi lưu cân nặng: ' + (err.message || 'Không thể ghi dữ liệu.'), 'danger');
                    return;
                }

                await PawpalPets.loadPetsModuleData({ force: true });
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

        // P-17: Nối nút tải ảnh từ thiết bị với file input
        const btnUploadPetPhoto = document.getElementById('btnUploadPetPhoto');
        const petPhotoFileInput = document.getElementById('petPhotoFileInput');
        if (btnUploadPetPhoto && petPhotoFileInput) {
            btnUploadPetPhoto.addEventListener('click', () => petPhotoFileInput.click());
            petPhotoFileInput.addEventListener('change', () => {
                const file = petPhotoFileInput.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                    PawpalPets.showToast('Dung lượng ảnh vượt quá giới hạn 5 MB. Vui lòng chọn ảnh nhẹ hơn.', 'warning');
                    petPhotoFileInput.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target?.result;
                    if (dataUrl) {
                        const avatarPreview = document.getElementById('editPetAvatarPreview') || document.getElementById('newPetAvatarPreview');
                        if (avatarPreview) avatarPreview.src = dataUrl;
                        PawpalPets.showToast('Đã nạp ảnh từ thiết bị thành công!', 'success');
                        const modalSelectPhoto = document.getElementById('modalSelectPhoto');
                        if (modalSelectPhoto) modalSelectPhoto.classList.remove('open');
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    }

    PawpalPets.subtabs.list = {
        init: initPetListSubtab,
        renderPetsTable,
        updatePetKPIs,
        clearAllPetFilters,
        handleCreateServiceForPet,
        openCollarTagPreview
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPetListSubtab);
    } else {
        initPetListSubtab();
    }
})();
