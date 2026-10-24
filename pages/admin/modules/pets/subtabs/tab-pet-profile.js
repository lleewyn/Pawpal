// tab-pet-profile.js - Subtab Hồ sơ 360° bé cưng Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    let currentEditingPetCode = 'PET-001';
    let currentWeighingPetId = 'PET-001';
    let editingSnapshot = null;
    let weighingSnapshot = null;

    function switchDrawerTab(targetPanelId) {
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        drawerTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-drawertab') === targetPanelId);
        });

        drawerPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === targetPanelId);
        });

        sessionStorage.setItem('pawpal_admin_pet_drawertab', targetPanelId);
        loadVisibleDetails();

        const hotelBadge = document.getElementById('petHotelEligibleBadge');
        if (hotelBadge) {
            hotelBadge.style.display = (targetPanelId === 'ptab-vaccine') ? 'inline-block' : 'none';
        }
    }

    const esc = (s) => (PawpalPets.escapeHtml ? PawpalPets.escapeHtml(s) : String(s || ''));

    function loadVisibleDetails() {
        if (document.hidden || !document.getElementById('subtab-tab-pet-profile')?.classList.contains('active')) return;
        const moduleName = sessionStorage.getItem('pawpal_admin_active_module');
        if (moduleName && moduleName !== 'Thú cưng') return;
        const pet = PawpalPets.state.petsData?.[sessionStorage.getItem('pawpal_admin_pet_id')];
        if (!pet || (pet._detailsLoaded && !pet._detailStatus)) return;
        const panel = sessionStorage.getItem('pawpal_admin_pet_drawertab') || 'ptab-traits';
        const kind = { 'ptab-traits':'weight', 'ptab-carelog':'carelog', 'ptab-history':'history' }[panel];
        if (!kind) return;
        const task = PawpalPets.fetchPetProfileDetails(pet, {kind, page:pet._detailPages?.[kind] || 1});
        renderPetSubtabs(pet);
        task.then(() => {
            if (sessionStorage.getItem('pawpal_admin_pet_id') !== pet.code) return;
            renderPetSubtabs(pet);
            updateCarelogCount(pet);
        });
    }

    function updateCarelogCount(pet) {
        const badge = document.querySelector('[data-drawertab="ptab-carelog"] .tab-badge-count');
        if (!badge) return;
        const count = pet._detailCounts?.carelog;
        badge.textContent = count === undefined ? '' : String(count);
        badge.classList.toggle('pet-is-hidden', !(count > 0));
    }

    function detailsUnavailable(tbody, pet, kind) {
        const status = pet._detailStatus?.[kind];
        if (status === 'loaded' || (!status && pet._detailsLoaded)) return false;
        const text = status === 'error' ? 'Không tải được dữ liệu. Mở lại tab để thử lại.'
            : status === 'loading' ? 'Đang tải...' : 'Mở tab để tải dữ liệu.';
        tbody.innerHTML = `<tr><td class="pet-empty-state-md" colspan="6">${text}</td></tr>`;
        document.getElementById(tbody.id + 'Pager')?.replaceChildren();
        return true;
    }

    function renderDetailsPager(tbody, pet, kind) {
        const total = Math.ceil((pet._detailCounts?.[kind] || 0) / 10);
        const page = pet._detailPages?.[kind] || 1;
        let pager = document.getElementById(tbody.id + 'Pager');
        if (!pager) {
            pager = document.createElement('div');
            pager.id = tbody.id + 'Pager';
            pager.className = 'admin-pagination-bar';
            const table = tbody.closest('table');
            (table.closest('.table-responsive-wrapper') || table).after(pager);
        }
        if (total <= 1) { pager.replaceChildren(); return; }
        const start = Math.max(1, page - 2), end = Math.min(total, page + 2);
        pager.innerHTML = `<div class="pagination-controls"><button type="button" class="pagination-btn" data-page="${page-1}" ${page===1?'disabled':''}>&lt;</button>`
            + Array.from({length:end-start+1},(_,i)=>`<button type="button" class="pagination-btn ${start+i===page?'active':''}" data-page="${start+i}">${start+i}</button>`).join('')
            + `<button type="button" class="pagination-btn" data-page="${page+1}" ${page===total?'disabled':''}>&gt;</button></div>`;
        pager.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
            const task = PawpalPets.fetchPetProfileDetails(pet,{kind,page:Number(button.dataset.page)});
            renderPetSubtabs(pet);
            task.then(()=>{if(sessionStorage.getItem('pawpal_admin_pet_id')===pet.code){renderPetSubtabs(pet);updateCarelogCount(pet);}});
        }));
    }

    function renderPetSubtabs(pet) {
        // Tab 1: Biến động cân nặng
        const weightTbody = document.getElementById('petWeightHistoryTbody');
        if (weightTbody && !detailsUnavailable(weightTbody, pet, 'weight')) {
            const history = pet.weightHistory || [];
            renderDetailsPager(weightTbody, pet, 'weight');
            if (history.length === 0) {
                weightTbody.innerHTML = `<tr><td class="pet-empty-state-sm" colspan="4">Chưa có dữ liệu ghi nhận cân nặng định kỳ.</td></tr>`;
            } else {
                weightTbody.innerHTML = history.map(w => `
                    <tr>
                        <td>${esc(w.date)}</td>
                        <td><strong>${esc(w.weight)}</strong></td>
                        <td>${esc(w.tier)}</td>
                        <td>${esc(w.by)}</td>
                    </tr>
                `).join('');
            }
        }

        // Tab 3: Nhật ký chăm sóc dịch vụ
        const carelogTbody = document.getElementById('petCarelogTbody');
        if (carelogTbody && !detailsUnavailable(carelogTbody, pet, 'carelog')) {
            const cLogs = pet.carelogs || [];
            renderDetailsPager(carelogTbody, pet, 'carelog');
            if (cLogs.length === 0) {
                carelogTbody.innerHTML = `<tr><td class="pet-empty-state-md" colspan="6">Chưa có nhật ký ca làm trước và sau cho bé cưng này.</td></tr>`;
            } else {
                carelogTbody.innerHTML = cLogs.map(c => `
                    <tr>
                        <td>
                            <strong>${esc(String(c.time || '').split(' ')[0])}</strong>
                            <div class="pet-meta-xs">${esc(String(c.time || '').split(' ')[1] || '')}</div>
                        </td>
                        <td>
                            <strong class="pet-text-heading">${esc(c.service)}</strong>
                            <div class="pet-meta-xs">KTV: ${esc(c.ktv)}</div>
                        </td>
                        <td class="pet-u-text-center">
                            <div class="pet-inline-flex-gap-4">
                                ${c.imgBefore ? `<img class="pet-carelog-thumb" src="${esc(c.imgBefore)}" alt="Trước">` : ''}
                                ${c.imgAfter ? `<img class="pet-carelog-thumb" src="${esc(c.imgAfter)}" alt="Sau">` : ''}
                            </div>
                        </td>
                        <td><span class="admin-badge badge-success">${esc(c.checkText)}</span></td>
                        <td><span class="admin-badge ${String(c.appStatus || '').includes('Đã gửi') ? 'badge-success' : 'badge-neutral'}">${esc(c.appStatus)}</span></td>
                        <td class="pet-u-text-right">
                            <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-carelog-modal" data-care-id="${esc(c.careId || 'CL-001')}">Xem chi tiết</button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Tab 4: Lịch sử đặt hẹn & dịch vụ
        const historyTbody = document.getElementById('petHistoryTbody');
        if (historyTbody && !detailsUnavailable(historyTbody, pet, 'history')) {
            let sHistory = [...(pet.history || [])];
            renderDetailsPager(historyTbody, pet, 'history');
            if (sHistory.length === 0) {
                historyTbody.innerHTML = `<tr><td class="pet-empty-state-md" colspan="6">Bé chưa có lịch sử đặt dịch vụ.</td></tr>`;
            } else {
                historyTbody.innerHTML = sHistory.map(h => `
                    <tr>
                        <td>
                            <a href="javascript:void(0)" class="user-name-link btn-jump-service-booking pet-booking-link" data-booking-id="${esc(h.id)}">${esc(h.id)}</a>
                        </td>
                        <td>${esc(h.service)}</td>
                        <td>${esc(h.time)}</td>
                        <td>${esc(h.weight)}</td>
                        <td class="pet-u-text-right"><strong>${esc(h.price)}</strong></td>
                        <td class="pet-u-text-center"><span class="admin-badge ${h.status === 'Đã hoàn thành' ? 'badge-success' : 'badge-warning'}">${esc(h.status)}</span></td>
                    </tr>
                `).join('');

                historyTbody.querySelectorAll('.btn-jump-service-booking').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const bkgId = btn.getAttribute('data-booking-id');
                        sessionStorage.setItem('pawpal_admin_service_selected_id', bkgId);
                        sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-detail');
                        window.location.hash = '#tab-service-detail';
                    });
                });
            }
        }
    }

    let profileOpenVersion=0;
    function openPetProfile(petId, navigate = true) {
        const version=++profileOpenVersion;
        const pet = PawpalPets.getPet ? PawpalPets.getPet(petId) : PawpalPets.state.petsData?.[petId];
        if (petId && PawpalPets.loadPetContext && (!pet || (PawpalPets.serverPetPaging && !PawpalPets.isPetContextFresh(pet)))) {
            sessionStorage.setItem('pawpal_admin_pet_id',petId);
            if(navigate)PawpalPets.switchSubtab('tab-pet-profile');
            PawpalPets.loadPetContext([petId]).then(()=>{
                if(version!==profileOpenVersion)return;
                const loaded=PawpalPets.getPet(petId);
                if(loaded)openPetProfile(loaded.code,navigate);
                else document.getElementById('drawerPetName').textContent='Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ed3 s\u01a1';
            }).catch(()=>{if(version===profileOpenVersion)document.getElementById('drawerPetName').textContent='Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c h\u1ed3 s\u01a1';});
            return;
        }
        if (!pet) {
            const name = document.getElementById('drawerPetName');
            if (name) name.textContent = PawpalPets.state.loadError ? 'Không thể tải hồ sơ thú cưng' : 'Chưa có hồ sơ thú cưng';
            return;
        }
        
        const avatarEl = document.getElementById('drawerPetAvatar');
        if (avatarEl) avatarEl.src = pet.avatar;
        
        const nameEl = document.getElementById('drawerPetName');
        if (nameEl) nameEl.textContent = pet.name;
        
        const codeEl = document.getElementById('drawerPetCode');
        if (codeEl) codeEl.textContent = pet.code;

        const speciesEl = document.getElementById('drawerPetSpeciesBreed');
        if (speciesEl) speciesEl.textContent = pet.speciesBreed;

        const statusBadgeEl = document.getElementById('drawerPetStatusBadge');
        if (statusBadgeEl) {
            statusBadgeEl.textContent = pet.status;
            statusBadgeEl.className = `admin-badge ${pet.status === 'Đang nuôi' ? 'badge-success' : (pet.status === 'Lưu trú Hotel' ? 'badge-warning' : 'badge-neutral')}`;
        }

        const weightHeadlineEl = document.getElementById('drawerPetWeightHeadline');
        if (weightHeadlineEl) weightHeadlineEl.textContent = pet.weight;

        const drawerWeighButton = document.getElementById('btnDrawerWeighPet');
        if (drawerWeighButton) drawerWeighButton.setAttribute('data-id', pet.code);

        const ownerLinkEl = document.getElementById('drawerPetOwnerLink');
        if (ownerLinkEl) {
            ownerLinkEl.textContent = pet.custId
                ? `${pet.ownerName}${pet.ownerPhone ? ` (${pet.ownerPhone})` : ''}`
                : 'Chưa có thông tin chủ nuôi';
            ownerLinkEl.setAttribute('data-cust-id', pet.custId || '');
        }

        const jumpBtn = document.getElementById('btnDrawerJumpCustomer');
        if (jumpBtn) {
            jumpBtn.setAttribute('data-cust-id', pet.custId || '');
            jumpBtn.disabled = !pet.custId;
        }

        if (document.getElementById('profilePetCode')) document.getElementById('profilePetCode').textContent = pet.code;
        if (document.getElementById('profilePetName')) document.getElementById('profilePetName').textContent = pet.name;
        if (document.getElementById('profilePetSpecies')) document.getElementById('profilePetSpecies').textContent = pet.speciesBreed;
        if (document.getElementById('profilePetGender')) document.getElementById('profilePetGender').textContent = pet.gender;
        if (document.getElementById('profilePetWeight')) document.getElementById('profilePetWeight').textContent = pet.weight;
        if (document.getElementById('profilePetDob')) document.getElementById('profilePetDob').textContent = pet.dob;
        if (document.getElementById('profilePetColor')) document.getElementById('profilePetColor').textContent = pet.color;
        const allergyValue = document.getElementById('profilePetAllergy');
        if (allergyValue) {
            allergyValue.textContent = pet.allergy || 'Chưa cập nhật';
            const allergy = String(pet.allergies ?? pet.allergy ?? '').trim();
            const hasAllergy = Boolean(allergy) && !/^(không|không có|không ghi nhận|chưa ghi nhận|chưa cập nhật|none|no|—)$/i.test(allergy);
            allergyValue.classList.toggle('text-danger', hasAllergy);
        }
        if (document.getElementById('profilePetNotes')) document.getElementById('profilePetNotes').textContent = pet.notes;

        const noteRead = document.getElementById('petGroomerNotesRead');
        if (noteRead) noteRead.textContent = pet.groomerNotes || pet.notes || 'Chưa có ghi chú';
        const noteEditor = document.getElementById('petGroomerNotesEditor');
        if (noteEditor && noteEditor.dataset.petId !== pet.rawId) {
            noteEditor.open = false;
            noteEditor.dataset.petId = pet.rawId;
        }

        const groomerNotesEl = document.getElementById('petGroomerNotes');
        if (groomerNotesEl) {
            if(groomerNotesEl.dataset.petId!==pet.rawId||groomerNotesEl.value===groomerNotesEl.dataset.savedValue){groomerNotesEl.value=pet.groomerNotes||'';groomerNotesEl.dataset.savedValue=groomerNotesEl.value;groomerNotesEl.dataset.petId=pet.rawId;groomerNotesEl.dataset.version=pet.updatedAt;}
        }

        const alertBanner = document.getElementById('drawerPetAlertBanner');
        const alertText = document.getElementById('drawerPetAlertText');
        if (alertBanner && alertText) {
            if (pet.alert) {
                alertText.textContent = pet.alert;
                alertBanner.style.display = 'block';
            } else {
                alertBanner.style.display = 'none';
            }
        }

        renderPetSubtabs(pet);
        updateCarelogCount(pet);

        sessionStorage.setItem('pawpal_admin_pet_id', pet.code);
        sessionStorage.setItem('pawpal_admin_pet_name', pet.name);

        if (navigate) PawpalPets.switchSubtab('tab-pet-profile');
        loadVisibleDetails();
    }

    function updatePriceMatrix(weight) {
        const kg = parseFloat(weight) || 0;
        let tier = kg>20?'Trên 20 kg':kg>10?'Trên 10 đến 20 kg':kg>=5?'Từ 5 đến 10 kg':'Dưới 5 kg';
        const weighTierResult = document.getElementById('weighTierResult');
        const weighSpaPriceResult = document.getElementById('weighSpaPriceResult');
        const weighGroomPriceResult = document.getElementById('weighGroomPriceResult');
        const weighHotelPriceResult = document.getElementById('weighHotelPriceResult');

        if (weighTierResult) weighTierResult.textContent = tier;
        if (weighSpaPriceResult) weighSpaPriceResult.textContent = 'Xem bảng giá dịch vụ';
        if (weighGroomPriceResult) weighGroomPriceResult.textContent = 'Xem bảng giá dịch vụ';
        if (weighHotelPriceResult) weighHotelPriceResult.textContent = 'Xem bảng giá dịch vụ';
        return tier;
    }

    function openEditPetModal(petId) {
        currentEditingPetCode = petId || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
        const pet = PawpalPets.getPet(currentEditingPetCode);
        const modalEditPet = document.getElementById('modalEditPetProfile');
        if (!modalEditPet || !pet) return;
        editingSnapshot = {...pet};

        const editPetOwnerInput = document.getElementById('editPetOwnerInput');
        const editPetOwnerHidden = document.getElementById('editPetOwner');
        const editPetOwnerCard = document.getElementById('editPetOwnerSelectedCard');
        const editPetOwnerDropdown = document.getElementById('editPetOwnerDropdown');

        if (editPetOwnerDropdown) editPetOwnerDropdown.style.display = 'none';

        const customersData = PawpalPets.state.customersData || {};
        const currentCust = pet.custId && customersData[pet.custId] ? customersData[pet.custId] : null;
        if (currentCust) {
            if (editPetOwnerHidden) editPetOwnerHidden.value = currentCust.id;
            if (editPetOwnerInput) editPetOwnerInput.value = `${esc(currentCust.name)} - ${currentCust.phone || 'Chưa có SĐT'}`;
            if (editPetOwnerCard) {
                editPetOwnerCard.innerHTML = `
                    <span>Chủ sở hữu: <strong>${esc(currentCust.name)}</strong>${currentCust.phone ? ` (${esc(currentCust.phone)})` : ''}</span>
                    <div class="pet-flex-align-gap-8">
                        <span>Hạng: <strong>${currentCust.tier || 'Khách mới'}</strong></span>
                        <button type="button" class="btn-clear-selected-owner pet-action-danger">✕ Bỏ chọn</button>
                    </div>
                `;
                editPetOwnerCard.style.display = 'flex';
                const btnClear = editPetOwnerCard.querySelector('.btn-clear-selected-owner');
                if (btnClear) {
                    btnClear.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (editPetOwnerHidden) editPetOwnerHidden.value = '';
                        if (editPetOwnerInput) editPetOwnerInput.value = '';
                        editPetOwnerCard.style.display = 'none';
                    });
                }
            }
        } else {
            if (editPetOwnerHidden) editPetOwnerHidden.value = '';
            if (editPetOwnerInput) editPetOwnerInput.value = '';
            if (editPetOwnerCard) editPetOwnerCard.style.display = 'none';
        }

        if (document.getElementById('editPetCode')) document.getElementById('editPetCode').value = pet.code;
        if (document.getElementById('editPetName')) document.getElementById('editPetName').value = pet.name || '';
        if (document.getElementById('editPetSpecies')) document.getElementById('editPetSpecies').value = pet.species || 'dog';
        if (document.getElementById('editPetBreed')) document.getElementById('editPetBreed').value = pet.breed || pet.speciesBreed || '';
        if (document.getElementById('editPetGender')) document.getElementById('editPetGender').value = pet.gender || 'Đực';
        if (document.getElementById('editPetWeight')) document.getElementById('editPetWeight').value = pet.weightNum || parseFloat(pet.weight) || '';
        if (document.getElementById('editPetDob')) document.getElementById('editPetDob').value = pet.dobRaw || '';
        if (document.getElementById('editPetColor')) document.getElementById('editPetColor').value = pet.color || '';
        if (document.getElementById('editPetStatus')) document.getElementById('editPetStatus').value = pet.status || 'Đang nuôi';
        if (document.getElementById('editPetAlert')) document.getElementById('editPetAlert').value = pet.safetyNote || '';
        if (document.getElementById('editPetAllergy')) document.getElementById('editPetAllergy').value = pet.allergy || '';
        if (document.getElementById('editPetNotes')) document.getElementById('editPetNotes').value = pet.notes || '';

        modalEditPet.classList.add('open');
    }

    function initProfileTab() {
        document.querySelector('.btn-quick-book-spa')?.addEventListener('click', () => {
            const petId = sessionStorage.getItem('pawpal_admin_pet_id');
            if (!PawpalPets.state.petsData?.[petId]) {
                PawpalPets.showToast('Vui lòng chọn hồ sơ thú cưng trước khi đặt lịch.', 'warning');
                return;
            }
            PawpalPets.subtabs.list?.handleCreateServiceForPet?.(petId);
        });
        // Drawer Subtabs switching
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetId);
                sessionStorage.setItem('pawpal_admin_pet_drawertab', targetId);
            });
        });

        // Ghi chú KTV
        const btnSaveGroomerNotes = document.getElementById('btnSaveGroomerNotes');
        if (btnSaveGroomerNotes) {
            btnSaveGroomerNotes.addEventListener('click', async () => {
                const currentPetId = sessionStorage.getItem('pawpal_admin_pet_id');
                const pet = PawpalPets.state.petsData?.[currentPetId];
                const notesVal = document.getElementById('petGroomerNotes')?.value || '';
                if (pet) {
                    try {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (client && pet.rawId) {
                            await PawpalPets.saveProfile({...pet,updatedAt:document.getElementById('petGroomerNotes')?.dataset.version},{routine:notesVal});
                            await PawpalPets.refreshPetsData({petIds:[pet.rawId]});
                        }
                    } catch (gErr) {
                        console.error('Supabase update groomer notes error:', gErr);
                        PawpalPets.showToast('Không thể lưu ghi chú: ' + (gErr.message || 'Lỗi CSDL.'), 'danger');
                        return;
                    }
                    const noteInput=document.getElementById('petGroomerNotes');if(noteInput){noteInput.dataset.savedValue=notesVal;noteInput.dataset.version=PawpalPets.getPet(pet.rawId)?.updatedAt||pet.updatedAt;}
                    const noteRead = document.getElementById('petGroomerNotesRead');
                    if (noteRead) noteRead.textContent = notesVal || 'Chưa có ghi chú';
                    const noteEditor = document.getElementById('petGroomerNotesEditor');
                    if (noteEditor) noteEditor.open = false;
                    pet.groomerNotes = notesVal;
                    pet.notes = notesVal;
                    const profileNotes = document.getElementById('profilePetNotes');
                    if (profileNotes) profileNotes.textContent = notesVal;
                    PawpalPets.showToast(`Đã lưu ghi chú kỹ thuật viên cho bé ${pet.name}!`);
                }
            });
        }

        // Cân bé
        const modalWeighPet = document.getElementById('modalWeighPet');
        const weighNewWeightInput = document.getElementById('weighPetNewWeight');
        const btnSubmitWeigh = document.getElementById('btnSubmitWeigh');
        const formWeighPet = document.getElementById('formWeighPet');

        if (formWeighPet) formWeighPet.addEventListener('submit', (e) => e.preventDefault());
        if (weighNewWeightInput) {
            weighNewWeightInput.addEventListener('input', (e) => updatePriceMatrix(e.target.value));
        }

        document.addEventListener('click', (e) => {
            const btnWeigh = e.target.closest('.btn-open-weigh-modal');
            if (btnWeigh) {
                const profileCode = document.getElementById('drawerPetCode')?.textContent?.trim();
                currentWeighingPetId = btnWeigh.getAttribute('data-id') || sessionStorage.getItem('pawpal_admin_pet_id') || profileCode || 'PET-001';
                const pet = PawpalPets.state.petsData?.[currentWeighingPetId] || (profileCode ? PawpalPets.state.petsData?.[profileCode] : null);
                if (!pet) return;
                currentWeighingPetId = pet.code || currentWeighingPetId;
                weighingSnapshot = {...pet};
                
                const weighPetName = document.getElementById('weighPetName');
                const weighOldWeight = document.getElementById('weighPetOldWeight');
                if (weighPetName) weighPetName.value = pet.name;
                if (weighOldWeight) weighOldWeight.value = pet.weight;
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || '';

                if (modalWeighPet) {
                    modalWeighPet.classList.add('open');
                    updatePriceMatrix(weighNewWeightInput.value);
                }
            }
        });

        // Bắt sự kiện chọn nhanh lý do cân thể trọng một chạm
        const weighPetNote = document.getElementById('weighPetNote');
        const weighChips = document.querySelectorAll('#weighPetNoteChips .reason-quick-chip');
        weighChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (weighPetNote) {
                    weighPetNote.value = chip.textContent.trim();
                }
            });
        });

        // Xử lý mở Modal 4: Chi tiết ca làm việc (modalViewCareLogDetail)
        const modalViewCareLogDetail = document.getElementById('modalViewCareLogDetail');
        document.addEventListener('click', (e) => {
            const btnViewCarelog = e.target.closest('.btn-view-carelog-modal');
            if (btnViewCarelog && modalViewCareLogDetail) {
                const careId = btnViewCarelog.getAttribute('data-care-id') || 'CL-001';
                const currentPetId = sessionStorage.getItem('pawpal_admin_pet_id');
                const pet = PawpalPets.state?.petsData?.[currentPetId];
                const careItem = pet?.carelogs?.find(c => c.careId === careId);
                if (!careItem) {
                    PawpalPets.showToast('Không tìm thấy nhật ký chăm sóc tương ứng.', 'warning');
                    return;
                }

                const titleEl = document.getElementById('carelogModalTitle');
                const timeEl = document.getElementById('carelogModalTime');
                const groomerEl = document.getElementById('carelogModalGroomer');
                const badgeEl = document.getElementById('carelogModalBadge');
                const beforeImg = document.getElementById('carelogModalImgBefore');
                const afterImg = document.getElementById('carelogModalImgAfter');
                const messageEl = document.getElementById('carelogModalMessage');

                if (titleEl) titleEl.textContent = `Chi tiết ca làm: ${careItem.service}`;
                if (timeEl) timeEl.textContent = `Thời gian: ${careItem.time}`;
                if (groomerEl) groomerEl.textContent = `KTV: ${careItem.ktv}`;
                if (badgeEl) badgeEl.textContent = careItem.appStatus;
                if (beforeImg) beforeImg.src = careItem.imgBefore;
                if (afterImg) afterImg.src = careItem.imgAfter;
                const condition=document.getElementById('carelogModalCondition');if(condition)condition.textContent=careItem.checkText||'Chưa ghi nhận';
                if (messageEl) messageEl.textContent = careItem.service || 'Chưa có ghi chú.';
                if(beforeImg)beforeImg.hidden=!careItem.imgBefore;
                if(afterImg)afterImg.hidden=!careItem.imgAfter;

                modalViewCareLogDetail.classList.add('open');
            }
        });

        if (btnSubmitWeigh) {
            btnSubmitWeigh.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (btnSubmitWeigh.disabled) return;
                const weightValue = weighNewWeightInput?.value.trim() || '';
                const newKg = Number(weightValue);
                const pet = weighingSnapshot || PawpalPets.state.petsData?.[currentWeighingPetId];
                if (!pet) return;
                if (!weightValue || !Number.isFinite(newKg) || newKg <= 0 || newKg < 0.1) {
                    PawpalPets.showToast('Vui lòng nhập cân nặng lớn hơn 0 kg.', 'warning');
                    weighNewWeightInput?.focus();
                    return;
                }

                btnSubmitWeigh.disabled = true;
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client || !pet.rawId) {
                        PawpalPets.showToast('Không thể lưu cân nặng khi chưa kết nối được hồ sơ thú cưng.', 'danger');
                        return;
                    }

                    await PawpalPets.recordWeight(pet,newKg,weighPetNote?.value||'');
                } catch (err) {
                    console.error('Weight update error:', err);
                    PawpalPets.showToast('Lỗi lưu cân nặng: ' + (err.message || 'Không thể ghi dữ liệu.'), 'danger');
                    return;
                } finally {
                    btnSubmitWeigh.disabled = false;
                }

                window.PawpalDataStore?.emitMutation?.('pet_profile', 'UPDATE', { id: pet.rawId });
                window.PawpalDataStore?.emitMutation?.('pet_weight_history', 'INSERT', { pet_id: pet.rawId });
                window.PawpalDataStore?.invalidate?.(`pets:details:${pet.rawId}`);
                pet._detailsLoaded = false;

                await PawpalPets.refreshPetsData({petIds:[pet.rawId],kinds:['weight']});
                if (PawpalPets.subtabs.list) {
                    PawpalPets.subtabs.list.renderPetsTable();
                    PawpalPets.subtabs.list.updatePetKPIs();
                }

                const updatedPet = PawpalPets.state.petsData?.[currentWeighingPetId];
                if (updatedPet) {
                    if (sessionStorage.getItem('pawpal_admin_pet_id') === currentWeighingPetId) openPetProfile(currentWeighingPetId, false);
                    else renderPetSubtabs(updatedPet);
                }

                PawpalPets.showToast(`Đã lưu cân nặng mới (${newKg} kg) cho bé ${pet.name}!`);
                if (modalWeighPet) modalWeighPet.classList.remove('open');
            });
        }

        // Sửa hồ sơ thú cưng
        const btnOpenEditPet = document.getElementById('btnOpenEditPetModal');
        const btnSubmitEditPet = document.getElementById('btnSubmitEditPetProfile');
        const modalEditPet = document.getElementById('modalEditPetProfile');

        if (btnOpenEditPet) {
            btnOpenEditPet.addEventListener('click', () => {
                const currentId = sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                openEditPetModal(currentId);
            });
        }

        const formEditPetProfile = document.getElementById('formEditPetProfile');
        if (formEditPetProfile) {
            formEditPetProfile.addEventListener('submit', (e) => e.preventDefault());
        }

        if (btnSubmitEditPet) {
            btnSubmitEditPet.addEventListener('click', async (e) => {
                if (e) e.preventDefault();
                const pet = editingSnapshot;
                if (!pet) return;

                const name = document.getElementById('editPetName')?.value || pet.name;
                const species = document.getElementById('editPetSpecies')?.value || pet.species;
                const breed = document.getElementById('editPetBreed')?.value || pet.breed;
                const gender = document.getElementById('editPetGender')?.value || pet.gender;
                const rawWeight = document.getElementById('editPetWeight')?.value;
                const weight = rawWeight ? parseFloat(rawWeight) : (pet.weightNum || null);
                const dob = document.getElementById('editPetDob')?.value || '';
                const color = document.getElementById('editPetColor')?.value || pet.color;
                const status = document.getElementById('editPetStatus')?.value || pet.status;
                const alertText = document.getElementById('editPetAlert')?.value || '';
                const allergy = document.getElementById('editPetAllergy')?.value || '';
                const notes = document.getElementById('editPetNotes')?.value || '';
                const ownerCustId = document.getElementById('editPetOwner')?.value || '';

                if (!ownerCustId) {
                    PawpalPets.showToast('Bắt buộc chọn chủ nuôi trước khi lưu hồ sơ bé cưng.', 'warning');
                    return;
                }

                let dbStatus = 'dang_hoat_dong';
                if (status === 'Lưu trữ' || status === 'INACTIVE' || status === 'ARCHIVED' || status === 'tam_ngung') dbStatus = 'tam_ngung';
                else if (status === 'Đã mất' || status === 'DECEASED' || status === 'da_an') dbStatus = 'da_an';

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && pet.rawId) {
                        const breedId=PawpalPets.resolveBreed(species,breed);
                        await PawpalPets.saveProfile(pet,{customer_id:ownerCustId,pet_name:name,breed_id:breedId,gender:gender==='Cái'||gender==='female'?'female':gender==='Đực'||gender==='male'?'male':'unknown',date_of_birth:dob||null,color,safety_note:alertText||null,allergy:allergy||null,routine:notes||null,status:status==='Lưu trữ'?'archived':'active'},weight);
                    }
                } catch (err) {
                    console.error('Edit pet exception:', err);
                    PawpalPets.showToast('Lỗi cập nhật hồ sơ: ' + err.message, 'danger');
                    return;
                }

                await PawpalPets.refreshPetsData({petIds:[pet.rawId],kinds:['weight']});
                if (PawpalPets.subtabs.list) {
                    PawpalPets.subtabs.list.renderPetsTable();
                    PawpalPets.subtabs.list.updatePetKPIs();
                }

                if (PawpalPets.state.petsData?.[currentEditingPetCode]) {
                    openPetProfile(currentEditingPetCode);
                }

                PawpalPets.showToast(`Đã cập nhật thành công hồ sơ của bé ${name}!`, 'success');
                if (modalEditPet) {
                    modalEditPet.classList.remove('open');
                    modalEditPet.classList.remove('show');
                }
            });
        }

        // Khởi tạo Autocomplete CSDL cho Modal Chỉnh sửa hồ sơ
        if (PawpalPets.setupBreedAutocomplete) {
            PawpalPets.setupBreedAutocomplete(
                document.getElementById('editPetBreed'),
                document.getElementById('editPetBreedDropdown'),
                document.getElementById('editPetSpecies')
            );
            PawpalPets.setupColorAutocomplete(
                document.getElementById('editPetColor'),
                document.getElementById('editPetColorDropdown')
            );
        }

        const editPetOwnerInput = document.getElementById('editPetOwnerInput');
        const editPetOwnerDropdown = document.getElementById('editPetOwnerDropdown');
        const editPetOwnerHidden = document.getElementById('editPetOwner');
        const editPetOwnerCard = document.getElementById('editPetOwnerSelectedCard');

        if (editPetOwnerInput && editPetOwnerDropdown) {
            let ownerLookupVersion=0, ownerLookupTimer;
            async function updateEditOwnerAutocomplete(query) {
                const version=++ownerLookupVersion;
                const q = (query || '').toLowerCase().trim();
                const customersData = PawpalPets.state?.customersData || {};
                const petsData = PawpalPets.state?.petsData || {};
                const allCusts = Object.values(customersData);

                const custPetCounts = {};
                Object.values(petsData).forEach(p => {
                    if (p.custId || p.customerId) {const ownerId=p.custId||p.customerId;custPetCounts[ownerId]=(custPetCounts[ownerId]||0)+1;}
                    if (p.ownerName) custPetCounts[p.ownerName] = (custPetCounts[p.ownerName] || 0) + 1;
                });

                let matched;
                try {
                    matched = PawpalPets.serverPetPaging ? await PawpalPets.lookupOwners(query || '') : allCusts.filter(c=>!q||PawpalPets.matchSearch(c.name,q)||PawpalPets.matchSearch(c.phone,q)).slice(0,15);
                } catch(error) {
                    if(version===ownerLookupVersion){editPetOwnerDropdown.innerHTML='<div class="autocomplete-empty">Kh\u00f4ng th\u1ec3 t\u1ea3i ch\u1ee7 nu\u00f4i. Vui l\u00f2ng th\u1eed l\u1ea1i.</div>';editPetOwnerDropdown.style.display='block';}
                    return;
                }
                if(version!==ownerLookupVersion || document.activeElement!==editPetOwnerInput)return;

                if (matched.length === 0) {
                    editPetOwnerDropdown.innerHTML = '<div class="autocomplete-empty">Không tìm thấy khách hàng.</div>';
                } else {
                    editPetOwnerDropdown.innerHTML = matched.map(c => {
                        const pCount = c.petCount ?? custPetCounts[c.id] ?? custPetCounts[c.name] ?? 0;
                        const petInfoStr = pCount > 0 ? `${pCount} bé cưng` : 'Khách hàng';
                        return `
                            <div class="autocomplete-item" data-id="${c.id}" data-name="${esc(c.name)}" data-phone="${c.phone || ''}" data-tier="${c.tier || 'Khách mới'}">
                                <div class="autocomplete-meta">
                                    <div class="autocomplete-item-name">${esc(c.name)}</div>
                                    <div class="autocomplete-item-phone">${c.phone || 'Chưa có SĐT'} • ${petInfoStr}</div>
                                </div>
                                <div class="autocomplete-item-badge">Hạng ${c.tier || 'Khách mới'}</div>
                            </div>
                        `;
                    }).join('');
                }
                editPetOwnerDropdown.style.display = 'block';
            }

            editPetOwnerInput.addEventListener('focus', () => updateEditOwnerAutocomplete(editPetOwnerInput.value));
            editPetOwnerInput.addEventListener('input', () => {ownerLookupVersion++;clearTimeout(ownerLookupTimer);ownerLookupTimer=setTimeout(()=>updateEditOwnerAutocomplete(editPetOwnerInput.value),350);});

            editPetOwnerDropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.autocomplete-item');
                if (item) {
                    const custId = item.getAttribute('data-id');
                    const custName = item.getAttribute('data-name');
                    const custPhone = item.getAttribute('data-phone');
                    const custTier = item.getAttribute('data-tier');

                    if (editPetOwnerHidden) editPetOwnerHidden.value = custId;
                    editPetOwnerInput.value = `${custName} - ${custPhone}`;
                    if (editPetOwnerCard) {
                        editPetOwnerCard.innerHTML = `
                            <span>Chủ sở hữu: <strong>${esc(custName)}</strong>${custPhone ? ` (${esc(custPhone)})` : ''}</span>
                            <div class="pet-flex-align-gap-8">
                                <span>Hạng: <strong>${custTier}</strong></span>
                                <button type="button" class="btn-clear-selected-owner pet-action-danger">✕ Bỏ chọn</button>
                            </div>
                        `;
                        editPetOwnerCard.style.display = 'flex';
                        const btnClear = editPetOwnerCard.querySelector('.btn-clear-selected-owner');
                        if (btnClear) {
                            btnClear.addEventListener('click', (ev) => {
                                ev.stopPropagation();
                                if (editPetOwnerHidden) editPetOwnerHidden.value = '';
                                if (editPetOwnerInput) editPetOwnerInput.value = '';
                                editPetOwnerCard.style.display = 'none';
                            });
                        }
                    }
                    editPetOwnerDropdown.style.display = 'none';
                }
            });
        }

    }

    PawpalPets.subtabs.profile = {
        init: initProfileTab,
        renderPetSubtabs,
        openPetProfile,
        openEditPetModal,
        setWeighingPet: (petId) => { currentWeighingPetId = petId;const pet=PawpalPets.getPet(petId);weighingSnapshot=pet?{...pet}:null; },
        switchDrawerTab,
        updatePriceMatrix
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileTab);
    } else {
        initProfileTab();
    }
})();
