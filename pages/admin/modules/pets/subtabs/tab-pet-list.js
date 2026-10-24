// tab-pet-list.js - Subtab Danh sách thú cưng Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    let isHotelOnly = false;
    let isAlertOnly = false;
    let petCurrentPage = 1;
    const PETS_PER_PAGE = 10;
    let lastFilteredPets=[];
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

        if (PawpalPets.serverPetPaging) {
            const stats = PawpalPets.state.petPage?.stats;
            for (const [element,key] of [[statTotal,'total'],[statDog,'dog'],[statCat,'cat'],[statOther,'other'],[statAlert,'alert']]) {
                if (element) element.textContent = PawpalPets.state.loadError || !stats ? '\u2014' : Number(stats[key] || 0).toLocaleString('vi-VN');
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
        for (let i = Math.max(1, petCurrentPage-2); i <= Math.min(totalPages, petCurrentPage+2); i++) {
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

        const request = {query,species:speciesVal,breed:breedVal,weight:weightVal,hotel:isHotelOnly,alert:isAlertOnly,page:petCurrentPage,size:PETS_PER_PAGE};
        if (PawpalPets.serverPetPaging) {
            const correction=PawpalPets.state.correctedPage;
            if(correction?.fromKey===PawpalPets.petPageKey(request)){petCurrentPage=correction.page;request.page=petCurrentPage;PawpalPets.state.correctedPage=null;}
            const key = PawpalPets.petPageKey(request);
            PawpalPets.state.listRequest = request;
            if (PawpalPets.state.petPage?.key !== key) {
                if (PawpalPets.state.failedPageKey === key) {
                    tbody.innerHTML = '<tr><td class="pet-empty-state-table" colspan="9">Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch. <button type="button" class="pet-action-link" id="btnRetryPetPage">Th\u1eed l\u1ea1i</button></td></tr>';
                    document.getElementById('petPageNumbersContainer')?.replaceChildren();
                    document.getElementById('petPaginationBar').style.display='none';
                    document.getElementById('btnRetryPetPage').onclick=()=>{PawpalPets.state.failedPageKey=null;PawpalPets.loadPetsModuleData({force:true}).then(()=>{renderPetsTable();updatePetKPIs();});};
                    return;
                }
                tbody.innerHTML = '<tr><td class="pet-empty-state-table" colspan="9">\u0110ang t\u1ea3i danh s\u00e1ch...</td></tr>';
                if (PawpalPets.state.pendingPageKey !== key) {
                    PawpalPets.state.pendingPageKey=key;
                    PawpalPets.loadPetsModuleData().then(()=>{if(PawpalPets.state.pendingPageKey===key)PawpalPets.state.pendingPageKey=null;renderPetsTable();updatePetKPIs();});
                }
                return;
            }
        }

        const petsData = PawpalPets.state?.petsData || {};
        const petsList = PawpalPets.serverPetPaging ? (PawpalPets.state.petPage?.keys || []).map(code=>petsData[code]).filter(Boolean) : Object.values(petsData);
        const matchSearch = PawpalPets.matchSearch || ((src, q) => (!q ? true : String(src || '').toLowerCase().includes(String(q).toLowerCase())));

        const filteredPets = petsList.filter(pet => {
            if (PawpalPets.serverPetPaging) return true;
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

        lastFilteredPets=filteredPets;
        const totalItems = PawpalPets.serverPetPaging ? Number(PawpalPets.state.petPage?.total || 0) : filteredPets.length;
        if (PawpalPets.serverPetPaging) petCurrentPage = Number(PawpalPets.state.petPage?.page || 1);
        const totalPages = Math.ceil(totalItems / PETS_PER_PAGE) || 1;
        if (petCurrentPage > totalPages) petCurrentPage = totalPages;
        if (petCurrentPage < 1) petCurrentPage = 1;

        renderPetPagination(totalItems, totalPages);

        if (totalItems === 0) {
            if (PawpalPets.state?.loadError) {
                delete tbody.dataset.loadingSkeleton;
                tbody.innerHTML = '<tr><td class="pet-empty-state-center-lg" colspan="9">Không thể tải danh sách thú cưng. Vui lòng tải lại trang.</td></tr>';
                return;
            }
            if (!PawpalPets.state?.isLoaded) {
                tbody.dataset.loadingSkeleton = 'true';
                tbody.innerHTML = Array.from({ length: 5 }, (_, i) => `
                    <tr class="skeleton-row admin-auto-skeleton">
                        <td class="pet-u-text-center"><span class="skeleton-avatar"></span></td>
                        <td><span class="skeleton-text" style="width: ${65 + (i % 2) * 10}px;"></span></td>
                        <td>
                            <span class="skeleton-text" style="width: ${85 + (i % 3) * 15}px; margin-bottom: 5px;"></span>
                            <span class="skeleton-text pet-skeleton-bar-55"></span>
                        </td>
                        <td><span class="skeleton-text" style="width: ${95 + (i % 2) * 20}px;"></span></td>
                        <td><span class="skeleton-text pet-u-w-45"></span></td>
                        <td>
                            <span class="skeleton-text" style="width: ${100 + (i % 3) * 15}px; margin-bottom: 5px;"></span>
                            <span class="skeleton-text pet-skeleton-bar-75"></span>
                        </td>
                        <td><span class="skeleton-text pet-u-w-40"></span></td>
                        <td><span class="skeleton-badge"></span></td>
                        <td class="pet-u-text-center"><span class="skeleton-text pet-u-w-20"></span></td>
                    </tr>
                `).join('');
                return;
            }

            tbody.innerHTML = `
                <tr>
                    <td class="pet-empty-state-table" colspan="9">
                        Không tìm thấy bé cưng nào phù hợp với bộ lọc tìm kiếm hiện tại. 
                        <button class="pet-action-link" type="button" id="btnResetPetFilters">Xóa bộ lọc</button>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetPetFilters')?.addEventListener('click', clearAllPetFilters);
            return;
        }

        const pagedPets = PawpalPets.serverPetPaging ? filteredPets : filteredPets.slice((petCurrentPage - 1) * PETS_PER_PAGE, petCurrentPage * PETS_PER_PAGE);

        tbody.innerHTML = pagedPets.map(pet => {
            let alertRowClass = '';
            let alertHtml = '<span class="pet-muted-disabled">—</span>';
            
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
                    <td class="pet-u-text-center">
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
                    <td class="pet-col-actions-padded">
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
        if (infoEl) infoEl.textContent = `${pet.speciesBreed || pet.breed || 'Chó'} • ${pet.weight || 'Ch\u01b0a ghi nh\u1eadn c\u00e2n n\u1eb7ng'} • ${pet.gender || 'Đực'}`;
        if (codeEl) codeEl.textContent = pet.code || 'PET-NEW';
        if (ownerNameEl) ownerNameEl.textContent = pet.ownerName || 'Chủ nuôi';
        if (ownerPhoneEl) ownerPhoneEl.textContent = pet.ownerPhone || 'Ch\u01b0a c\u00f3 s\u1ed1 \u0111i\u1ec7n tho\u1ea1i';
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
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || '';
                if (PawpalPets.subtabs.profile?.updatePriceMatrix) {
                    PawpalPets.subtabs.profile.updatePriceMatrix(weighNewWeightInput ? weighNewWeightInput.value : 8.5);
                }
                sessionStorage.setItem('pawpal_admin_pet_id',pet.code);
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
                            await PawpalPets.saveProfile(pet,{status:'archived'});
                        } catch (aErr) {
                            console.error('Supabase archive error:', aErr);
                            PawpalPets.showToast('Không thể lưu trữ hồ sơ: ' + (aErr.message || 'Lỗi CSDL.'), 'danger');
                            return;
                        }
                        window.PawpalDataStore?.emitMutation?.('pet_profile', 'UPDATE', { id: pet.rawId });
                        await PawpalPets.refreshPetsData({petIds:[pet.rawId]});
                        renderPetsTable();
                        updatePetKPIs();
                        PawpalPets.showToast(`Đã lưu trữ hồ sơ bé cưng ${pet.name}!`, 'success');
                    }
                });
            } else if (action === 'restore') {
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client || !pet.rawId) throw new Error('Thiếu kết nối hoặc mã hồ sơ thú cưng.');
                    await PawpalPets.saveProfile(pet,{status:'active'});
                } catch (rErr) {
                    console.error('Supabase restore error:', rErr);
                    PawpalPets.showToast('Không thể khôi phục hồ sơ: ' + (rErr.message || 'Lỗi CSDL.'), 'danger');
                    return;
                }
                window.PawpalDataStore?.emitMutation?.('pet_profile', 'UPDATE', { id: pet.rawId });
                await PawpalPets.refreshPetsData({petIds:[pet.rawId]});
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

        let petSearchTimer = null;
        if (petSearchInput) {
            petSearchInput.addEventListener('input', () => {
                if (btnClearPetSearch) btnClearPetSearch.style.display = petSearchInput.value ? 'block' : 'none';
                clearTimeout(petSearchTimer);
                petSearchTimer = setTimeout(() => {
                    petCurrentPage = 1;
                    renderPetsTable();
                }, 300);
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
                const totalPages = Math.ceil((PawpalPets.serverPetPaging ? PawpalPets.state.petPage?.total || 0 : Object.values(petsData).length) / PETS_PER_PAGE) || 1;
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
            btnExportPetReport.addEventListener('click', async () => {
                if(!PawpalPets.state.isLoaded||PawpalPets.state.loadError){PawpalPets.showToast('Ch\u01b0a th\u1ec3 xu\u1ea5t d\u1eef li\u1ec7u. H\u00e3y t\u1ea3i l\u1ea1i danh s\u00e1ch.','warning');return;}
                let petsList=lastFilteredPets;
                if (PawpalPets.serverPetPaging) {
                    btnExportPetReport.disabled=true;
                    try {
                        const request={...PawpalPets.state.listRequest,page:1,size:100};
                        const first=await PawpalPets.readPetPage(request,{force:true});
                        if(first.total>1000){PawpalPets.showToast('C\u00f3 h\u01a1n 1.000 h\u1ed3 s\u01a1. H\u00e3y thu h\u1eb9p b\u1ed9 l\u1ecdc tr\u01b0\u1edbc khi xu\u1ea5t.','warning');return;}
                        const rawPages=[first];
                        for(let page=2;page<=Math.ceil(first.total/100);page++) {
                            const next=await PawpalPets.readPetPage({...request,page},{force:true});
                            if(next.total!==first.total||next.revision!==first.revision)throw new Error('directory_changed');
                            rawPages.push(next);
                        }
                        petsList=rawPages.flatMap(data=>PawpalPets.mapPetPageForExport(data));
                    } catch(error) {
                        PawpalPets.showToast('Ch\u01b0a xu\u1ea5t \u0111\u01b0\u1ee3c file. D\u1eef li\u1ec7u c\u00f3 th\u1ec3 \u0111\u00e3 thay \u0111\u1ed5i; h\u00e3y th\u1eed l\u1ea1i.','warning');return;
                    } finally {btnExportPetReport.disabled=false;}
                }
                const headers = ['Mã bé cưng', 'Tên bé cưng', 'Loài và giống', 'Giới tính', 'Cân nặng', 'Ngày sinh', 'Chủ sở hữu', 'Số điện thoại', 'Cảnh báo an toàn', 'Trạng thái'];
                const csvCell=value=>{let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
                const rows=petsList.map(p=>[p.code,p.name,p.speciesBreed||p.breed,p.gender,p.weight,p.dob,p.ownerName,p.ownerPhone,p.alert||'',p.status].map(csvCell));

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
            let ownerLookupVersion=0, ownerLookupTimer;
            async function updateOwnerAutocomplete(query) {
                const version=++ownerLookupVersion;
                const q = (query || '').toLowerCase().trim();
                const customersData = PawpalPets.state?.customersData || {};
                const petsData = PawpalPets.state?.petsData || {};
                const allCusts = Object.values(customersData);

                // Tính tổng số lượng bé cưng thuộc từng chủ nuôi từ CSDL
                const custPetCounts = {};
                Object.values(petsData).forEach(p => {
                    if (p.custId || p.customerId) {const ownerId=p.custId||p.customerId;custPetCounts[ownerId]=(custPetCounts[ownerId]||0)+1;}
                    if (p.ownerName) custPetCounts[p.ownerName] = (custPetCounts[p.ownerName] || 0) + 1;
                });

                let matched;
                try {
                    matched = PawpalPets.serverPetPaging ? await PawpalPets.lookupOwners(query || '') : allCusts.filter(c=>!q||PawpalPets.matchSearch(c.name,q)||PawpalPets.matchSearch(c.phone,q)).slice(0,15);
                } catch(error) {
                    if(version===ownerLookupVersion){newPetOwnerDropdown.innerHTML='<div class="autocomplete-empty">Kh\u00f4ng th\u1ec3 t\u1ea3i ch\u1ee7 nu\u00f4i. Vui l\u00f2ng th\u1eed l\u1ea1i.</div>';newPetOwnerDropdown.style.display='block';}
                    return;
                }
                if(version!==ownerLookupVersion || document.activeElement!==newPetOwnerInput)return;

                if (matched.length === 0) {
                    newPetOwnerDropdown.innerHTML = '<div class="autocomplete-empty">Không tìm thấy khách hàng. Bấm "Thêm nhanh chủ nuôi" để tạo mới!</div>';
                } else {
                    newPetOwnerDropdown.innerHTML = matched.map(c => {
                        const pCount = c.petCount ?? custPetCounts[c.id] ?? custPetCounts[c.name] ?? 0;
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
            newPetOwnerInput.addEventListener('input', () => {ownerLookupVersion++;clearTimeout(ownerLookupTimer);ownerLookupTimer=setTimeout(()=>updateOwnerAutocomplete(newPetOwnerInput.value),350);});

            newPetOwnerDropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.autocomplete-item');
                if (item) {
                    const custId = item.getAttribute('data-id');
                    const custName = item.getAttribute('data-name');
                    const custPhone = item.getAttribute('data-phone');
                    const custTier = item.getAttribute('data-tier');

                    if (newPetOwnerHidden) newPetOwnerHidden.value = custId;
                    newPetOwnerInput.value = `${esc(custName)} - ${esc(custPhone)}`;
                    if (newPetOwnerSelectedCard) {
                        newPetOwnerSelectedCard.innerHTML = `
                            <span>Chủ sở hữu: <strong>${esc(custName)}</strong> (${esc(custPhone || 'Chưa có SĐT')})</span>
                            <div class="pet-flex-align-gap-8">
                                <span>Hạng: <strong>${esc(custTier)}</strong></span>
                                <button type="button" class="btn-clear-selected-new-owner pet-action-danger">✕ Bỏ chọn</button>
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

                const baseList = (PawpalPets.state.breeds||[]).filter(b=>b.is_active&&b.species?.is_active&&b.speciesCode===sp&&!/chưa|unknown|undefined|null/i.test(b.breed_name)).map(b=>b.breed_name);
                const allBreeds = Array.from(new Set(baseList));

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
                            <div class="autocomplete-item" data-value="${esc(b.name)}">
                                <div class="autocomplete-meta">
                                    <div class="autocomplete-item-name">${esc(b.name)}</div>
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

                const allColors = Object.keys(dbCounts);
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
                            <div class="autocomplete-item" data-value="${esc(c.name)}">
                                <div class="autocomplete-meta">
                                    <div class="autocomplete-item-name">${esc(c.name)}</div>
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
                if(btnSubmitQuickAddOwner.disabled)return;
                const name = document.getElementById('quickOwnerName')?.value.trim();
                const phone = document.getElementById('quickOwnerPhone')?.value.trim();
                const tier = document.getElementById('quickOwnerTier')?.value || 'Khách mới';
                const address = document.getElementById('quickOwnerAddress')?.value.trim();
                const province=document.getElementById('quickOwnerProvince')?.value.trim();
                if(Boolean(address)!==Boolean(province)){PawpalPets.showToast('Vui l\u00f2ng nh\u1eadp c\u1ea3 \u0111\u1ecba ch\u1ec9 v\u00e0 t\u1ec9nh/th\u00e0nh.','warning');return;}

                if(name?.length<2 || !/^0[0-9]{9}$/.test(phone||'')){PawpalPets.showToast('Nh\u1eadp h\u1ecd t\u00ean v\u00e0 s\u1ed1 \u0111i\u1ec7n tho\u1ea1i 10 s\u1ed1 h\u1ee3p l\u1ec7.','warning');return;}
                if (!name || !phone) {
                    PawpalPets.showToast('Vui lòng nhập đầy đủ họ tên và số điện thoại của chủ nuôi!', 'warning');
                    return;
                }

                btnSubmitQuickAddOwner.disabled=true;
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client) {
                        PawpalPets.showToast('Không có kết nối tới cơ sở dữ liệu Supabase.', 'danger');
                        return;
                    }

                    const {data: customerId,error: customerError}=await client.rpc('create_customer_quick',{p_full_name:name,p_phone:phone,p_address:address||null,p_province:province||null});
                    if(customerError)throw customerError;
                    const newCust={id:customerId};
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
                            <span>Chủ sở hữu: <strong>${esc(name)}</strong> (${esc(phone)})</span>
                            <div class="pet-flex-align-gap-8">
                                <span>Hạng: <strong>${esc(tier)}</strong></span>
                                <button type="button" class="btn-clear-selected-new-owner pet-action-danger">✕ Bỏ chọn</button>
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
                } finally {btnSubmitQuickAddOwner.disabled=false;}
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
                const cust = customersData[ownerCustId] || { name: 'Khách hàng', phone: '' };
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
                if(btnSubmitAddPet.disabled)return;
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

                btnSubmitAddPet.disabled=true;
                const petsData = PawpalPets.state?.petsData || {};
                const randSuffix = Math.floor(100 + Math.random() * 900);
                const newPetId = 'PET-' + String(Date.now()).slice(-4) + '-' + randSuffix;
                const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
                const speciesBreedStr = `${speciesNameMap[species] || 'Chó'} ${breed}`;

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        const breedId=PawpalPets.resolveBreed(species,breed);
                        const createdPet=await PawpalPets.saveProfile(null,{customer_id:ownerCustId,pet_name:name,breed_id:breedId,gender:gender==='Cái'?'female':'male',date_of_birth:dob||null,color:color==='Chưa cập nhật'?null:color,safety_note:alertText||null,allergy:allergy==='Không ghi nhận'?null:allergy,routine:null},weight);
                        window.PawpalDataStore?.emitMutation?.('pet_profile', 'INSERT', createdPet);
                        await PawpalPets.refreshPetsData({petIds:[createdPet.id]});
                        renderPetsTable();
                        updatePetKPIs();

                        PawpalPets.showToast(`Đã thêm bé ${name}.`, 'success');
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
                } finally { btnSubmitAddPet.disabled=false; }
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
