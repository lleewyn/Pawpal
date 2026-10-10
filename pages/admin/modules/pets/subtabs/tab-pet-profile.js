// tab-pet-profile.js - Subtab Hồ sơ 360° bé cưng Pawpal-er
(function() {
    'use strict';

    const PawpalPets = window.PawpalPets = window.PawpalPets || {};
    PawpalPets.subtabs = PawpalPets.subtabs || {};

    let currentEditingPetCode = 'PET-001';
    let currentWeighingPetId = 'PET-001';

    function switchDrawerTab(targetPanelId) {
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        drawerTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-drawertab') === targetPanelId);
        });

        drawerPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === targetPanelId);
        });

        const hotelBadge = document.getElementById('petHotelEligibleBadge');
        if (hotelBadge) {
            hotelBadge.style.display = (targetPanelId === 'ptab-vaccine') ? 'inline-block' : 'none';
        }
    }

    function renderPetSubtabs(pet) {
        // Tab 1: Biến động cân nặng
        const weightTbody = document.getElementById('petWeightHistoryTbody');
        if (weightTbody) {
            const history = pet.weightHistory || [];
            if (history.length === 0) {
                weightTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 16px;">Chưa có dữ liệu ghi nhận cân nặng định kỳ.</td></tr>`;
            } else {
                weightTbody.innerHTML = history.map(w => `
                    <tr>
                        <td>${w.date}</td>
                        <td><strong>${w.weight}</strong></td>
                        <td>${w.tier}</td>
                        <td>${w.by}</td>
                    </tr>
                `).join('');
            }
        }

        // Tab 2: Xác nhận tiêm chủng & Dịch tễ Hotel
        const vaccineContainer = document.getElementById('petVaccineContainer');
        const hotelBadge = document.getElementById('petHotelEligibleBadge');
        const ptabVaccineBadge = document.getElementById('ptabVaccineBadge');
        
        if (vaccineContainer) {
            const vList = pet.vaccines || [];
            const hasRabies = vList.some(v => v.title.toLowerCase().includes('dại') || v.title.toLowerCase().includes('rabies'));
            const isHotelQualified = hasRabies && pet.status !== 'Lưu trữ';

            if (hotelBadge) {
                if (isHotelQualified) {
                    hotelBadge.className = 'admin-badge badge-success';
                    hotelBadge.textContent = 'Đủ điều kiện nhận phòng Hotel';
                } else {
                    hotelBadge.className = 'admin-badge badge-warning';
                    hotelBadge.textContent = 'Chưa đủ điều kiện nhận phòng Hotel';
                }
            }

            if (ptabVaccineBadge) {
                ptabVaccineBadge.style.display = hasRabies ? 'none' : 'inline-block';
            }

            if (vList.length === 0) {
                vaccineContainer.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13.5px; grid-column: 1 / -1; line-height: 1.6;">
                        Bé chưa có dữ liệu ghi nhận tiêm chủng. Bấm <strong>"+ Ghi nhận tiêm chủng hoặc xổ giun"</strong> ở trên để bổ sung hồ sơ dịch tễ.
                    </div>
                `;
            } else {
                vaccineContainer.innerHTML = vList.map(v => `
                    <div class="vaccine-item-card is-qualified">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong style="color: var(--text-heading);">${v.title}</strong>
                            <span class="admin-badge ${v.status === 'Đã tiêm đủ' || v.status === 'Đã thực hiện' || v.status === 'Đạt chuẩn' ? 'badge-success' : 'badge-warning'}">${v.status}</span>
                        </div>
                        <div style="font-size: 13px; color: var(--text-main); margin-top: 4px;">
                            <div><strong>Ngày tiêm gần nhất:</strong> ${v.date}</div>
                            ${v.nextDate ? `<div><strong>Ngày tái chủng dự kiến:</strong> ${v.nextDate}</div>` : ''}
                            <div><strong>Địa điểm / Ghi chú:</strong> ${v.place}</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Tab 3: Nhật ký chăm sóc dịch vụ
        const carelogTbody = document.getElementById('petCarelogTbody');
        if (carelogTbody) {
            const cLogs = pet.carelogs || [];
            if (cLogs.length === 0) {
                carelogTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Chưa có nhật ký ca làm trước và sau cho bé cưng này.</td></tr>`;
            } else {
                carelogTbody.innerHTML = cLogs.map(c => `
                    <tr>
                        <td>
                            <strong>${c.time.split(' ')[0]}</strong>
                            <div style="font-size: 12px; color: var(--text-muted);">${c.time.split(' ')[1] || ''}</div>
                        </td>
                        <td>
                            <strong style="color: var(--text-heading);">${c.service}</strong>
                            <div style="font-size: 12px; color: var(--text-muted);">KTV: ${c.ktv}</div>
                        </td>
                        <td style="text-align: center;">
                            <div style="display: inline-flex; gap: 4px;">
                                <img src="${c.imgBefore}" style="width: 32px; height: 32px; border-radius: var(--admin-radius); object-fit: cover; border: 1px solid var(--border-neutral);" alt="Trước" title="Ảnh trước dịch vụ">
                                <img src="${c.imgAfter}" style="width: 32px; height: 32px; border-radius: var(--admin-radius); object-fit: cover; border: 1px solid var(--border-neutral);" alt="Sau" title="Ảnh sau dịch vụ">
                            </div>
                        </td>
                        <td><span class="admin-badge badge-success">${c.checkText}</span></td>
                        <td><span class="admin-badge ${c.appStatus.includes('Đã gửi') ? 'badge-success' : 'badge-neutral'}">${c.appStatus}</span></td>
                        <td style="text-align: right;">
                            <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-carelog-modal" data-care-id="${c.careId || 'CL-001'}">Xem chi tiết</button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Tab 4: Lịch sử đặt hẹn & dịch vụ
        const historyTbody = document.getElementById('petHistoryTbody');
        if (historyTbody) {
            let sHistory = [...(pet.history || [])];
            try {
                const rawBookings = sessionStorage.getItem('pawpal_admin_services_bookings');
                if (rawBookings) {
                    const allBookings = JSON.parse(rawBookings);
                    const petBookings = allBookings.filter(b => b.petId === pet.code || (b.petName && b.petName.toLowerCase() === pet.name.toLowerCase()));
                    petBookings.forEach(pb => {
                        if (!sHistory.some(h => h.id === pb.id)) {
                            sHistory.unshift({
                                id: pb.id,
                                service: pb.serviceName,
                                time: pb.date + ' ' + (pb.time || ''),
                                weight: pb.petWeight || pet.weight,
                                price: pb.total ? Number(pb.total).toLocaleString('vi-VN') + 'đ' : '250.000đ',
                                status: pb.status === 'completed' ? 'Đã hoàn thành' : pb.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận'
                            });
                        }
                    });
                }
            } catch (e) {}

            if (sHistory.length === 0) {
                historyTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Bé chưa có lịch sử đặt dịch vụ.</td></tr>`;
            } else {
                historyTbody.innerHTML = sHistory.map(h => `
                    <tr>
                        <td>
                            <a href="javascript:void(0)" class="user-name-link btn-jump-service-booking" data-booking-id="${h.id}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${h.id}</a>
                        </td>
                        <td>${h.service}</td>
                        <td>${h.time}</td>
                        <td>${h.weight}</td>
                        <td style="text-align: right;"><strong>${h.price}</strong></td>
                        <td style="text-align: center;"><span class="admin-badge ${h.status === 'Đã hoàn thành' ? 'badge-success' : 'badge-warning'}">${h.status}</span></td>
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

    function openPetProfile(petId) {
        const pet = PawpalPets.state.petsData?.[petId];
        if (!pet) return;
        
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
                ? `${pet.ownerName} (${pet.ownerPhone})`
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
        if (document.getElementById('profilePetAllergy')) document.getElementById('profilePetAllergy').textContent = pet.allergy;
        if (document.getElementById('profilePetNotes')) document.getElementById('profilePetNotes').textContent = pet.notes;

        const groomerNotesEl = document.getElementById('petGroomerNotes');
        if (groomerNotesEl) {
            groomerNotesEl.value = pet.groomerNotes || 'Cắt tỉa mặt tròn gấu bông, cạo đệm chân và vệ sinh tuyến hôi kỹ. Dùng dầu tắm yến mạch dịu nhẹ tránh kích ứng da.';
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

        sessionStorage.setItem('pawpal_admin_pet_id', pet.code);
        sessionStorage.setItem('pawpal_admin_pet_name', pet.name);

        PawpalPets.switchSubtab('tab-pet-profile');
    }

    function updatePriceMatrix(weight) {
        const kg = parseFloat(weight) || 0;
        let tier = 'Dưới 5 kg';
        let spaPrice = '180.000đ';
        let groomPrice = '280.000đ';
        let hotelPrice = '200.000đ';

        if (kg >= 5 && kg <= 10) {
            tier = '5 - 10 kg';
            spaPrice = '250.000đ';
            groomPrice = '350.000đ';
            hotelPrice = '300.000đ';
        } else if (kg > 10 && kg <= 20) {
            tier = '10 - 20 kg';
            spaPrice = '350.000đ';
            groomPrice = '480.000đ';
            hotelPrice = '400.000đ';
        } else if (kg > 20) {
            tier = 'Trên 20 kg';
            spaPrice = '500.000đ';
            groomPrice = '650.000đ';
            hotelPrice = '550.000đ';
        }

        const weighTierResult = document.getElementById('weighTierResult');
        const weighSpaPriceResult = document.getElementById('weighSpaPriceResult');
        const weighGroomPriceResult = document.getElementById('weighGroomPriceResult');
        const weighHotelPriceResult = document.getElementById('weighHotelPriceResult');

        if (weighTierResult) weighTierResult.textContent = tier;
        if (weighSpaPriceResult) weighSpaPriceResult.textContent = spaPrice;
        if (weighGroomPriceResult) weighGroomPriceResult.textContent = groomPrice;
        if (weighHotelPriceResult) weighHotelPriceResult.textContent = hotelPrice;
        return tier;
    }

    function openEditPetModal(petId) {
        currentEditingPetCode = petId || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
        const pet = PawpalPets.state.petsData?.[currentEditingPetCode] || Object.values(PawpalPets.state.petsData || {})[0];
        const modalEditPet = document.getElementById('modalEditPetProfile');
        if (!modalEditPet || !pet) return;

        const editPetOwnerInput = document.getElementById('editPetOwnerInput');
        const editPetOwnerHidden = document.getElementById('editPetOwner');
        const editPetOwnerCard = document.getElementById('editPetOwnerSelectedCard');
        const editPetOwnerDropdown = document.getElementById('editPetOwnerDropdown');

        if (editPetOwnerDropdown) editPetOwnerDropdown.style.display = 'none';

        const customersData = PawpalPets.state.customersData || {};
        const currentCust = pet.custId && customersData[pet.custId] ? customersData[pet.custId] : null;
        if (currentCust) {
            if (editPetOwnerHidden) editPetOwnerHidden.value = currentCust.id;
            if (editPetOwnerInput) editPetOwnerInput.value = `${currentCust.name} - ${currentCust.phone || 'Chưa có SĐT'}`;
            if (editPetOwnerCard) {
                editPetOwnerCard.innerHTML = `
                    <span>Chủ sở hữu: <strong>${currentCust.name}</strong> (${currentCust.phone || 'Chưa có SĐT'})</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span>Hạng: <strong>${currentCust.tier || 'Khách mới'}</strong></span>
                        <button type="button" class="btn-clear-selected-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cursor: pointer; padding: 0 4px; font-weight: 600;">✕ Bỏ chọn</button>
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
        if (document.getElementById('editPetWeight')) document.getElementById('editPetWeight').value = pet.weightNum || parseFloat(pet.weight) || 8.5;
        if (document.getElementById('editPetDob')) document.getElementById('editPetDob').value = pet.dobRaw || '2023-05-15';
        if (document.getElementById('editPetColor')) document.getElementById('editPetColor').value = pet.color || '';
        if (document.getElementById('editPetStatus')) document.getElementById('editPetStatus').value = pet.status || 'Đang nuôi';
        if (document.getElementById('editPetAlert')) document.getElementById('editPetAlert').value = pet.alert || '';
        if (document.getElementById('editPetAllergy')) document.getElementById('editPetAllergy').value = pet.allergy || '';
        if (document.getElementById('editPetNotes')) document.getElementById('editPetNotes').value = pet.notes || '';

        modalEditPet.classList.add('open');
    }

    function initProfileTab() {
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
                const currentPetId = sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                const pet = PawpalPets.state.petsData?.[currentPetId];
                const notesVal = document.getElementById('petGroomerNotes')?.value || '';
                if (pet) {
                    try {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (client && pet.rawId) {
                            await client.from('pet_profile').update({ routine: notesVal }).eq('id', pet.rawId);
                        }
                    } catch (gErr) {
                        console.error('Supabase update groomer notes error:', gErr);
                    }
                    pet.groomerNotes = notesVal;
                    PawpalPets.showToast(`Đã lưu ghi chú kỹ thuật Groomer cho bé ${pet.name}!`);
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
                currentWeighingPetId = btnWeigh.getAttribute('data-id') || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                const pet = PawpalPets.state.petsData?.[currentWeighingPetId];
                if (!pet) return;
                
                const weighPetName = document.getElementById('weighPetName');
                const weighOldWeight = document.getElementById('weighPetOldWeight');
                if (weighPetName) weighPetName.value = pet.name;
                if (weighOldWeight) weighOldWeight.value = pet.weight;
                if (weighNewWeightInput) weighNewWeightInput.value = pet.weightNum || parseFloat(pet.weight) || 8.5;

                if (modalWeighPet) {
                    modalWeighPet.classList.add('open');
                    updatePriceMatrix(weighNewWeightInput.value);
                }
            }
        });

        if (btnSubmitWeigh) {
            btnSubmitWeigh.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const weightValue = weighNewWeightInput?.value.trim() || '';
                const newKg = Number(weightValue);
                const pet = PawpalPets.state.petsData?.[currentWeighingPetId];
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
                if (PawpalPets.subtabs.list) {
                    PawpalPets.subtabs.list.renderPetsTable();
                    PawpalPets.subtabs.list.updatePetKPIs();
                }

                const updatedPet = PawpalPets.state.petsData?.[currentWeighingPetId];
                if (updatedPet) {
                    renderPetSubtabs(updatedPet);
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

        if (btnSubmitEditPet) {
            btnSubmitEditPet.addEventListener('click', async () => {
                const pet = PawpalPets.state.petsData?.[currentEditingPetCode];
                if (!pet) return;

                const name = document.getElementById('editPetName')?.value || pet.name;
                const species = document.getElementById('editPetSpecies')?.value || pet.species;
                const breed = document.getElementById('editPetBreed')?.value || pet.breed;
                const gender = document.getElementById('editPetGender')?.value || pet.gender;
                const weight = parseFloat(document.getElementById('editPetWeight')?.value || '8.5');
                const dob = document.getElementById('editPetDob')?.value || pet.dobRaw;
                const color = document.getElementById('editPetColor')?.value || pet.color;
                const status = document.getElementById('editPetStatus')?.value || pet.status;
                const alertText = document.getElementById('editPetAlert')?.value || '';
                const allergy = document.getElementById('editPetAllergy')?.value || '';
                const notes = document.getElementById('editPetNotes')?.value || '';
                const ownerCustId = document.getElementById('editPetOwner')?.value || pet.custId;

                let dbStatus = 'ACTIVE';
                if (status === 'Lưu trú Hotel' || status === 'HOTEL') dbStatus = 'HOTEL';
                else if (status === 'Lưu trữ' || status === 'INACTIVE' || status === 'ARCHIVED') dbStatus = 'INACTIVE';

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && pet.rawId) {
                        const updatePayload = {
                            pet_name: name,
                            species: species,
                            breed: breed,
                            gender: gender === 'Cái' ? 'FEMALE' : 'MALE',
                            date_of_birth: dob || null,
                            weight: weight,
                            color: color,
                            routine: notes || (alertText ? `Lưu ý: ${alertText}` : 'Bé ngoan, hợp tác khi làm dịch vụ.'),
                            allergy: allergy,
                            status: dbStatus
                        };
                        const customersData = PawpalPets.state.customersData || {};
                        if (ownerCustId && customersData[ownerCustId]) {
                            updatePayload.customer_id = ownerCustId;
                        }

                        const { error: updErr } = await client.from('pet_profile').update(updatePayload).eq('id', pet.rawId);
                        if (updErr) {
                            console.error('Supabase update pet error:', updErr);
                            PawpalPets.showToast('Lỗi cập nhật CSDL: ' + updErr.message, 'danger');
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Edit pet exception:', err);
                    PawpalPets.showToast('Lỗi cập nhật hồ sơ: ' + err.message, 'danger');
                    return;
                }

                await PawpalPets.loadPetsModuleData();
                if (PawpalPets.subtabs.list) {
                    PawpalPets.subtabs.list.renderPetsTable();
                    PawpalPets.subtabs.list.updatePetKPIs();
                }

                if (PawpalPets.state.petsData?.[currentEditingPetCode]) {
                    openPetProfile(currentEditingPetCode);
                }

                PawpalPets.showToast(`Đã cập nhật thành công hồ sơ của bé ${name}!`);
                if (modalEditPet) modalEditPet.classList.remove('open');
            });
        }

        // Tiêm chủng
        const modalAddVaccine = document.getElementById('modalAddVaccine');
        const btnOpenAddVaccine = document.getElementById('btnOpenAddVaccineModal');
        const newVaccineTypeSelect = document.getElementById('newVaccineType');
        const groupCustomVaccine = document.getElementById('groupCustomVaccineName');
        const btnSubmitAddVaccine = document.getElementById('btnSubmitAddVaccine');

        if (btnOpenAddVaccine && modalAddVaccine) {
            btnOpenAddVaccine.addEventListener('click', () => {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const dateInput = document.getElementById('newVaccineDate');
                if (dateInput) dateInput.value = todayStr;
                modalAddVaccine.classList.add('open');
            });
        }

        if (newVaccineTypeSelect && groupCustomVaccine) {
            newVaccineTypeSelect.addEventListener('change', () => {
                groupCustomVaccine.style.display = (newVaccineTypeSelect.value === 'Khác') ? 'block' : 'none';
            });
        }

        if (btnSubmitAddVaccine) {
            btnSubmitAddVaccine.addEventListener('click', async () => {
                const currentPetId = sessionStorage.getItem('pawpal_admin_pet_id');
                const pet = PawpalPets.state.petsData?.[currentPetId];
                if (!pet || !pet.rawId) {
                    PawpalPets.showToast('Không xác định được hồ sơ thú cưng đang mở.', 'danger');
                    return;
                }

                let title = newVaccineTypeSelect?.value || 'Vắc-xin phòng dại (Rabies)';
                if (title === 'Khác') {
                    title = document.getElementById('newCustomVaccineName')?.value.trim() || 'Mũi tiêm dịch tễ';
                }

                const rawDate = document.getElementById('newVaccineDate')?.value;
                if (!rawDate) {
                    PawpalPets.showToast('Vui lòng chọn ngày tiêm gần nhất!', 'warning');
                    return;
                }
                if (!PawpalPets.isValidPetBirthDate(rawDate)) {
                    PawpalPets.showToast('Ngày tiêm không hợp lệ. Vui lòng kiểm tra lại.', 'warning');
                    return;
                }
                const parts = rawDate.split('-');
                const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client) throw new Error('Chưa kết nối được Supabase.');
                    const { error: vErr } = await client.from('pet_profile').update({
                        vaccination_history: `Đã tiêm ${title} (${formattedDate})`
                    }).eq('id', pet.rawId);
                    if (vErr) throw vErr;
                } catch (vErr) {
                    console.error('Lỗi lưu lịch sử tiêm vào Supabase:', vErr);
                    PawpalPets.showToast('Không thể lưu xác nhận tiêm chủng: ' + (vErr.message || 'Lỗi CSDL.'), 'danger');
                    return;
                }

                await PawpalPets.loadPetsModuleData();
                const updatedPet = PawpalPets.state.petsData?.[currentPetId];
                if (updatedPet) renderPetSubtabs(updatedPet);
                if (PawpalPets.subtabs.list) PawpalPets.subtabs.list.renderPetsTable();

                PawpalPets.showToast(`Đã ghi nhận ${title} cho bé ${pet.name}!`);
                if (modalAddVaccine) modalAddVaccine.classList.remove('open');
            });
        }
    }

    PawpalPets.subtabs.profile = {
        init: initProfileTab,
        renderPetSubtabs,
        openPetProfile,
        openEditPetModal,
        switchDrawerTab,
        updatePriceMatrix
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileTab);
    } else {
        initProfileTab();
    }
})();
