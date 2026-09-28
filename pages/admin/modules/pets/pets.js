// pets.js - Phân hệ Quản lý Thú cưng Pawpal-er
(function() {
    function initPetsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 4 Sub-tabs trực tiếp lên Header Bar (thuần chữ, không icon, phân tách bằng |)
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-pet-list">Thú cưng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-reminders">Nhắc lịch</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-carelog">Nhật ký</button>
            `;
        }

        // 2. Chuyển đổi giữa 4 Sub-tabs trên Header Bar
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(petName) {
            if (!deepBreadcrumbEl) return;
            if (petName) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${petName}</span>
                `;
            } else {
                deepBreadcrumbEl.innerHTML = '';
            }
        }

        function switchSubtab(targetSubtab) {
            headerSubtabBtns.forEach(btn => {
                if (btn.getAttribute('data-subtab') === targetSubtab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            subtabPanels.forEach(panel => {
                if (panel.id === `subtab-${targetSubtab}`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Khi ở tab Hồ sơ, luôn hiển thị đường dẫn tinh gọn / [Tên bé cưng]
            if (targetSubtab === 'tab-pet-profile') {
                const currentName = sessionStorage.getItem('pawpal_admin_pet_name') || 
                                    document.getElementById('drawerPetName')?.textContent?.trim() || 
                                    'Milu';
                updateBreadcrumb(currentName);
            } else {
                updateBreadcrumb(null);
            }

            // Lưu trạng thái subtab để khi reload trang vẫn giữ nguyên
            sessionStorage.setItem('pawpal_admin_pet_subtab', targetSubtab);
            try {
                history.replaceState(null, '', '#' + targetSubtab);
            } catch (e) {}

            if (window.lucide) lucide.createIcons();
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSubtab = btn.getAttribute('data-subtab');
                switchSubtab(targetSubtab);
            });
        });

        // 3. Chuyển đổi giữa 4 tabs con trong Drawer Hồ sơ
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        function switchDrawerTab(targetPanelId) {
            drawerTabs.forEach(t => {
                if (t.getAttribute('data-drawertab') === targetPanelId) {
                    t.classList.add('active');
                } else {
                    t.classList.remove('active');
                }
            });

            drawerPanels.forEach(panel => {
                if (panel.id === targetPanelId) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Badge 'Đủ điều kiện nhận phòng Hotel' xuất hiện tinh gọn ở góc phải thanh subtab khi xem Xác nhận tiêm chủng
            const hotelBadge = document.getElementById('petHotelEligibleBadge');
            if (hotelBadge) {
                hotelBadge.style.display = (targetPanelId === 'ptab-vaccine') ? 'inline-block' : 'none';
            }
        }

        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetId);
                sessionStorage.setItem('pawpal_admin_pet_drawertab', targetId);
            });
        });

        // 4. Mở hồ sơ chi tiết khi click vào Tên bé cưng hoặc nút Xem hồ sơ
        const petsData = {
            'PET-001': {
                name: 'Milu',
                code: 'PET-001',
                species: 'dog',
                speciesBreed: 'Chó Corgi',
                gender: 'Đực',
                weight: '8.5 kg',
                dob: '15/05/2023 (1 tuổi 4 tháng)',
                color: 'Vàng trắng',
                allergy: 'Dị ứng hải sản & sữa tắm tinh dầu tràm',
                notes: 'Bé khá nhát người lạ, thích ăn pate bò. Hơi dữ khi sấy đuôi.',
                alert: 'Cảnh báo: Bé hay cắn khi chạm vào đuôi hoặc khi sấy chân sau. Kỹ thuật viên Groomer cần đeo loa chắn mõm hoặc bố trí 2 người cùng phối hợp để đảm bảo an toàn!',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                avatar: '/assets/images/publics/dogcute3.jpg',
                status: 'Đang nuôi'
            },
            'PET-002': {
                name: 'Mimi',
                code: 'PET-002',
                species: 'cat',
                speciesBreed: 'Mèo ALN',
                gender: 'Cái',
                weight: '4.2 kg',
                dob: '20/01/2024 (8 tháng)',
                color: 'Xám xanh',
                allergy: 'Không phát hiện',
                notes: 'Thích cào móng vào buổi sáng, ngoan khi tắm.',
                alert: '',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                avatar: '/assets/images/publics/catcute5.jpg',
                status: 'Lưu trú Hotel'
            },
            'PET-003': {
                name: 'Boss',
                code: 'PET-003',
                species: 'dog',
                speciesBreed: 'Golden Retriever',
                gender: 'Đực',
                weight: '25.0 kg',
                dob: '10/10/2021 (2 tuổi 11 tháng)',
                color: 'Vàng nhạt',
                allergy: 'Không',
                notes: 'Rất hiếu động, thích nghịch nước, không sợ máy sấy.',
                alert: '',
                ownerName: 'Lê Thị Bình',
                ownerPhone: '0987654321',
                custId: 'CUST-002',
                avatar: '/assets/images/publics/dogcute8.jpg',
                status: 'Đang nuôi'
            },
            'PET-004': {
                name: 'Bông',
                code: 'PET-004',
                species: 'cat',
                speciesBreed: 'Mèo ta',
                gender: 'Cái',
                weight: '3.5 kg',
                dob: '10/03/2024 (6 tháng)',
                color: 'Trắng kem',
                allergy: 'Không',
                notes: 'Bé nhút nhát với người lạ, chưa xuất trình sổ tiêm ngừa.',
                alert: 'Lưu ý: Bé chưa xác nhận tiêm ngừa theo quy chuẩn. Cần kiểm tra kỹ sổ tiêm thực tế trước khi nhận phòng Pet Hotel!',
                ownerName: 'Trần Khách Vãng Lai',
                ownerPhone: '0933221100',
                custId: 'CUST-003',
                avatar: '/assets/images/publics/catcute8.jpg',
                status: 'Đang nuôi'
            },
            'PET-005': {
                name: 'Trà Sữa',
                code: 'PET-005',
                species: 'dog',
                speciesBreed: 'Poodle Toy',
                gender: 'Cái',
                weight: '2.8 kg',
                dob: '01/06/2024 (3 tháng)',
                color: 'Nâu kem',
                allergy: 'Không',
                notes: 'Bé rất thích chạy nhảy, cần cắt lông thường xuyên. Hơi sợ máy sấy lớn.',
                alert: 'Lưu ý: Bé sợ tiếng máy sấy công suất lớn. Kỹ thuật viên nên dùng máy sấy chế độ gió êm.',
                ownerName: 'Hoàng Minh Tuấn',
                ownerPhone: '0903112233',
                custId: 'CUST-005',
                avatar: '/assets/images/publics/dogcute6.jpg',
                status: 'Đang nuôi'
            },
            'PET-007': {
                name: 'Mochi',
                code: 'PET-007',
                species: 'dog',
                speciesBreed: 'Phốc Sóc (Pomeranian)',
                gender: 'Cái',
                weight: '3.2 kg',
                dob: '15/11/2023 (10 tháng)',
                color: 'Trắng tinh',
                allergy: 'Dị ứng sữa tắm tinh dầu tràm & hoa cúc',
                notes: 'Da bé khá nhạy cảm. Chỉ sử dụng sữa tắm hypoallergenic dịu nhẹ.',
                alert: 'Cảnh báo dị ứng: Dị ứng sữa tắm tinh dầu tràm! Dùng đúng loại xà phòng dịu nhẹ chuyên dụng tránh kích ứng da bé.',
                ownerName: 'Bùi Thu Trang',
                ownerPhone: '0938776655',
                custId: 'CUST-008',
                avatar: '/assets/images/publics/dogcute1.jpg',
                status: 'Đang nuôi'
            }
        };

        function openPetProfile(petId) {
            const pet = petsData[petId] || petsData['PET-001'];
            
            // Cập nhật DOM Drawer
            const avatarEl = document.getElementById('drawerPetAvatar');
            if (avatarEl) avatarEl.src = pet.avatar;
            
            const nameEl = document.getElementById('drawerPetName');
            if (nameEl) nameEl.textContent = pet.name;
            
            const codeEl = document.getElementById('drawerPetCode');
            if (codeEl) codeEl.textContent = pet.code;

            const speciesEl = document.getElementById('drawerPetSpeciesBreed');
            if (speciesEl) speciesEl.textContent = pet.speciesBreed;

            const weightHeadlineEl = document.getElementById('drawerPetWeightHeadline');
            if (weightHeadlineEl) weightHeadlineEl.textContent = pet.weight;

            const ownerLinkEl = document.getElementById('drawerPetOwnerLink');
            if (ownerLinkEl) {
                ownerLinkEl.textContent = `${pet.ownerName} (${pet.ownerPhone})`;
                ownerLinkEl.setAttribute('data-cust-id', pet.custId);
            }

            const jumpBtn = document.getElementById('btnDrawerJumpCustomer');
            if (jumpBtn) {
                jumpBtn.setAttribute('data-cust-id', pet.custId);
            }

            // Tab 1 data
            const pCode = document.getElementById('profilePetCode');
            if (pCode) pCode.textContent = pet.code;
            const pName = document.getElementById('profilePetName');
            if (pName) pName.textContent = pet.name;
            const pSpecies = document.getElementById('profilePetSpecies');
            if (pSpecies) pSpecies.textContent = pet.speciesBreed;
            const pGender = document.getElementById('profilePetGender');
            if (pGender) pGender.textContent = pet.gender;
            const pWeight = document.getElementById('profilePetWeight');
            if (pWeight) pWeight.textContent = pet.weight;
            const pDob = document.getElementById('profilePetDob');
            if (pDob) pDob.textContent = pet.dob;
            const pColor = document.getElementById('profilePetColor');
            if (pColor) pColor.textContent = pet.color;
            const pAllergy = document.getElementById('profilePetAllergy');
            if (pAllergy) pAllergy.textContent = pet.allergy;
            const pNotes = document.getElementById('profilePetNotes');
            if (pNotes) pNotes.textContent = pet.notes;

            // Alert banner
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

            // Lưu tên bé vào sessionStorage
            sessionStorage.setItem('pawpal_admin_pet_id', pet.code);
            sessionStorage.setItem('pawpal_admin_pet_name', pet.name);

            // Chuyển sang subtab Hồ sơ
            switchSubtab('tab-pet-profile');
        }

        // Gắn sự kiện mở hồ sơ từ bảng
        document.addEventListener('click', (e) => {
            const btnOpen = e.target.closest('.btn-open-pet-drawer');
            if (btnOpen) {
                const petId = btnOpen.getAttribute('data-id');
                if (petId) openPetProfile(petId);
            }

            // Liên kết chuyển sang module Khách hàng
            const btnJumpCust = e.target.closest('.btn-jump-customer');
            if (btnJumpCust) {
                const custId = btnJumpCust.getAttribute('data-cust-id');
                if (custId) {
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
                    // Kích hoạt sidebar Khách hàng
                    const custMenuBtn = document.querySelector('.sidebar-menu-btn[data-title="Khách hàng"]');
                    if (custMenuBtn) custMenuBtn.click();
                }
            }
        });

        // 5. Quản lý dropdown 3 chấm (•••)
        document.addEventListener('click', (e) => {
            const moreBtn = e.target.closest('.btn-action-more');
            const allDropdowns = document.querySelectorAll('.action-dropdown-wrapper');

            if (moreBtn) {
                const wrapper = moreBtn.closest('.action-dropdown-wrapper');
                const isOpen = wrapper.classList.contains('open');
                allDropdowns.forEach(w => w.classList.remove('open'));
                if (!isOpen) {
                    wrapper.classList.add('open');
                }
            } else if (!e.target.closest('.action-dropdown-menu')) {
                allDropdowns.forEach(w => w.classList.remove('open'));
            }
        });

        // 6. Bộ lọc và Tìm kiếm Thú cưng
        const petSearchInput = document.getElementById('petSearchInput');
        const petFilterSpecies = document.getElementById('petFilterSpecies');
        const petFilterBreed = document.getElementById('petFilterBreed');
        const petFilterWeight = document.getElementById('petFilterWeight');
        const petFilterVaccine = document.getElementById('petFilterVaccine');
        const btnFilterHotelOnly = document.getElementById('btnFilterHotelOnly');
        const btnFilterAlertOnly = document.getElementById('btnFilterAlertOnly');
        const tableRows = document.querySelectorAll('#petTableTbody tr');

        let isHotelOnly = false;
        let isAlertOnly = false;

        if (btnFilterHotelOnly) {
            btnFilterHotelOnly.addEventListener('click', () => {
                isHotelOnly = !isHotelOnly;
                btnFilterHotelOnly.classList.toggle('active', isHotelOnly);
                filterPetsTable();
            });
        }

        if (btnFilterAlertOnly) {
            btnFilterAlertOnly.addEventListener('click', () => {
                isAlertOnly = !isAlertOnly;
                btnFilterAlertOnly.classList.toggle('active', isAlertOnly);
                filterPetsTable();
            });
        }

        function filterPetsTable() {
            const query = petSearchInput ? petSearchInput.value.toLowerCase().trim() : '';
            const speciesVal = petFilterSpecies ? petFilterSpecies.value : 'ALL';
            const breedVal = petFilterBreed ? petFilterBreed.value : 'ALL';
            const weightVal = petFilterWeight ? petFilterWeight.value : 'ALL';
            const vaccineVal = petFilterVaccine ? petFilterVaccine.value : 'ALL';

            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                let matchSearch = !query || text.includes(query);
                let matchSpecies = true;
                let matchBreed = true;
                let matchWeight = true;
                let matchVaccine = true;
                let matchHotel = true;
                let matchAlert = true;

                // Kiểm tra loài
                if (speciesVal !== 'ALL') {
                    if (speciesVal === 'dog') matchSpecies = text.includes('chó') || text.includes('poodle') || text.includes('corgi') || text.includes('golden') || text.includes('phốc');
                    else if (speciesVal === 'cat') matchSpecies = text.includes('mèo');
                    else if (speciesVal === 'rabbit') matchSpecies = text.includes('thỏ');
                    else if (speciesVal === 'other') matchSpecies = text.includes('thỏ') || text.includes('hamster') || text.includes('khác');
                }

                // Kiểm tra giống
                if (breedVal !== 'ALL') {
                    matchBreed = text.includes(breedVal.toLowerCase());
                }

                // Kiểm tra hotel
                if (isHotelOnly) {
                    matchHotel = text.includes('hotel');
                }

                // Kiểm tra cảnh báo
                if (isAlertOnly) {
                    matchAlert = row.classList.contains('row-alert-critical') || row.classList.contains('row-alert-warning');
                }

                if (matchSearch && matchSpecies && matchBreed && matchHotel && matchAlert) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        if (petSearchInput) petSearchInput.addEventListener('input', filterPetsTable);
        if (petFilterSpecies) petFilterSpecies.addEventListener('change', filterPetsTable);
        if (petFilterBreed) petFilterBreed.addEventListener('change', filterPetsTable);
        if (petFilterWeight) petFilterWeight.addEventListener('change', filterPetsTable);
        if (petFilterVaccine) petFilterVaccine.addEventListener('change', filterPetsTable);

        // 7. Modal Quản lý Cân nặng & Ma trận giá
        const modalWeighPet = document.getElementById('modalWeighPet');
        const weighNewWeightInput = document.getElementById('weighPetNewWeight');
        const weighTierResult = document.getElementById('weighTierResult');
        const weighSpaPriceResult = document.getElementById('weighSpaPriceResult');
        const weighGroomPriceResult = document.getElementById('weighGroomPriceResult');
        const weighHotelPriceResult = document.getElementById('weighHotelPriceResult');

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

            if (weighTierResult) weighTierResult.textContent = tier;
            if (weighSpaPriceResult) weighSpaPriceResult.textContent = spaPrice;
            if (weighGroomPriceResult) weighGroomPriceResult.textContent = groomPrice;
            if (weighHotelPriceResult) weighHotelPriceResult.textContent = hotelPrice;
        }

        if (weighNewWeightInput) {
            weighNewWeightInput.addEventListener('input', (e) => {
                updatePriceMatrix(e.target.value);
            });
        }

        // Gắn sự kiện mở modal Cân bé
        document.addEventListener('click', (e) => {
            const btnWeigh = e.target.closest('.btn-open-weigh-modal');
            if (btnWeigh) {
                const petId = btnWeigh.getAttribute('data-id') || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                const pet = petsData[petId] || petsData['PET-001'];
                
                const weighPetName = document.getElementById('weighPetName');
                const weighOldWeight = document.getElementById('weighPetOldWeight');
                if (weighPetName) weighPetName.value = pet.name;
                if (weighOldWeight) weighOldWeight.value = pet.weight;

                if (modalWeighPet) {
                    modalWeighPet.classList.add('open');
                    updatePriceMatrix(8.6);
                }
            }
        });

        // Submit form Cân bé
        const btnSubmitWeigh = document.getElementById('btnSubmitWeigh');
        if (btnSubmitWeigh) {
            btnSubmitWeigh.addEventListener('click', () => {
                const newKg = weighNewWeightInput?.value || '8.6';
                showToast(`Đã cập nhật cân nặng mới (${newKg} kg) và tự động tính lại ma trận giá dịch vụ!`);
                if (modalWeighPet) modalWeighPet.classList.remove('open');
            });
        }

        // 8. Modal Tiếp nhận tại quầy (Thêm bé cưng)
        const modalAddPet = document.getElementById('modalAddPet');
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        if (btnOpenAddPet && modalAddPet) {
            btnOpenAddPet.addEventListener('click', () => {
                modalAddPet.classList.add('open');
            });
        }

        const btnSubmitAddPet = document.getElementById('btnSubmitAddPet');
        if (btnSubmitAddPet) {
            btnSubmitAddPet.addEventListener('click', () => {
                const name = document.getElementById('newPetName')?.value || 'Bé Mới';
                showToast(`Tiếp nhận bé ${name} thành công! Đã tự động in thẻ đeo cổ chống thất lạc.`);
                if (modalAddPet) modalAddPet.classList.remove('open');
            });
        }

        const btnPrintCollar = document.getElementById('btnPrintCollarTag');
        if (btnPrintCollar) {
            btnPrintCollar.addEventListener('click', () => {
                alert('Lệnh in thẻ đeo cổ đã gửi tới máy in nhãn nhiệt quầy lễ tân:\n- Tên bé cưng: Milu\n- Mã PET: PET-001\n- Hotline chủ: 0912345678');
            });
        }

        // 9. Modal Gửi tin nhắn chăm sóc định kỳ
        const modalSendReminder = document.getElementById('modalSendReminder');
        document.addEventListener('click', (e) => {
            const btnReminder = e.target.closest('.btn-open-reminder-modal');
            if (btnReminder && modalSendReminder) {
                const pet = btnReminder.getAttribute('data-pet') || 'Milu';
                const owner = btnReminder.getAttribute('data-owner') || 'Nguyễn Văn An';
                const phone = btnReminder.getAttribute('data-phone') || '0912345678';

                const ownerInput = document.getElementById('reminderModalOwner');
                const petInput = document.getElementById('reminderModalPet');
                const contentInput = document.getElementById('reminderMessageContent');

                if (ownerInput) ownerInput.value = `${owner} (${phone})`;
                if (petInput) petInput.value = pet;
                if (contentInput) {
                    contentInput.value = `PawPal mến chào Sen ${owner}! Bé ${pet} đã hơn 2 tuần chưa ghé spa làm đẹp rồi đó ạ. PawPal gửi tặng bé voucher ưu đãi 10% dịch vụ Spa trong tuần này. Sen đặt lịch ngay cho bé nhé!`;
                }

                modalSendReminder.classList.add('open');
            }
        });

        const btnSubmitSendReminder = document.getElementById('btnSubmitSendReminder');
        if (btnSubmitSendReminder) {
            btnSubmitSendReminder.addEventListener('click', () => {
                showToast('Đã gửi tin nhắn chăm sóc qua Zalo OA kèm ưu đãi 10% đến số điện thoại của chủ!');
                if (modalSendReminder) modalSendReminder.classList.remove('open');
            });
        }

        // Đóng các Modal
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.getAttribute('data-close-modal');
                const modal = document.getElementById(modalId);
                if (modal) modal.classList.remove('open');
            });
        });

        // 10. Modal Xem chi tiết nhật ký chăm sóc
        const modalViewCareLogDetail = document.getElementById('modalViewCareLogDetail');
        document.addEventListener('click', (e) => {
            const btnViewCarelog = e.target.closest('.btn-view-carelog-modal');
            if (btnViewCarelog && modalViewCareLogDetail) {
                const careId = btnViewCarelog.getAttribute('data-care-id');
                const titleEl = document.getElementById('carelogModalTitle');
                const timeEl = document.getElementById('carelogModalTime');
                const groomerEl = document.getElementById('carelogModalGroomer');
                const badgeEl = document.getElementById('carelogModalBadge');
                const imgBeforeEl = document.getElementById('carelogModalImgBefore');
                const imgAfterEl = document.getElementById('carelogModalImgAfter');
                const msgEl = document.getElementById('carelogModalMessage');

                const imgEar = document.getElementById('modalChkImgEar');
                const imgNail = document.getElementById('modalChkImgNail');
                const imgAnal = document.getElementById('modalChkImgAnal');
                const imgSkin = document.getElementById('modalChkImgSkin');

                if (careId === 'CL-002') {
                    if (titleEl) titleEl.textContent = 'Chi tiết ca làm: Cắt tỉa tạo kiểu Corgi mặt gấu';
                    if (timeEl) timeEl.textContent = 'Thời gian: 10/08/2026 10:00';
                    if (groomerEl) groomerEl.textContent = 'KTV: Đỗ Hương • Bàn 1';
                    if (badgeEl) {
                        badgeEl.textContent = 'Đã lưu trữ';
                        badgeEl.className = 'admin-badge badge-neutral';
                    }
                    if (imgBeforeEl) imgBeforeEl.src = '/assets/images/publics/dogcute7.jpg';
                    if (imgAfterEl) imgAfterEl.src = '/assets/images/publics/dogcute3.jpg';
                    if (imgEar) imgEar.src = '/assets/images/publics/catcute8.jpg';
                    if (imgNail) imgNail.src = '/assets/images/publics/handpaw.jpg';
                    if (imgAnal) imgAnal.src = '/assets/images/publics/spa.jpg';
                    if (imgSkin) imgSkin.src = '/assets/images/publics/dogcute8.jpg';
                    if (msgEl) msgEl.textContent = 'Bé rất hợp tác trong ca làm, form lông cắt tỉa tròn trịa đáng yêu, tai và móng đã vệ sinh nhẵn bóng.';
                } else {
                    if (titleEl) titleEl.textContent = 'Chi tiết ca làm: Tắm sấy dưỡng ẩm và Cắt mài móng';
                    if (timeEl) timeEl.textContent = 'Thời gian: 25/09/2026 14:30';
                    if (groomerEl) groomerEl.textContent = 'KTV: Hoàng Tuấn • Bàn 2';
                    if (badgeEl) {
                        badgeEl.textContent = 'Đã gửi app cho chủ';
                        badgeEl.className = 'admin-badge badge-success';
                    }
                    if (imgBeforeEl) imgBeforeEl.src = '/assets/images/publics/dogcute3.jpg';
                    if (imgAfterEl) imgAfterEl.src = '/assets/images/publics/dogcute1.jpg';
                    if (imgEar) imgEar.src = '/assets/images/publics/cat5.jpg';
                    if (imgNail) imgNail.src = '/assets/images/publics/handpaw.jpg';
                    if (imgAnal) imgAnal.src = '/assets/images/publics/spa.jpg';
                    if (imgSkin) imgSkin.src = '/assets/images/publics/pet2.jpg';
                    if (msgEl) msgEl.textContent = 'Lông vùng tai bé hơi rối nhẹ, tiệm đã gỡ và xịt dưỡng mượt mà. Vệ sinh tai sạch bóng, móng chân sau đã mài tròn nhẵn.';
                }

                modalViewCareLogDetail.classList.add('open');
            }
        });

        // 11. Sub-tab 4: Nhật ký chăm sóc (Bàn làm việc Groomer & Hotel)
        const queueItems = document.querySelectorAll('.queue-card-item');
        const wbFormTitle = document.getElementById('wbFormTitle');
        const wbStatusBadge = document.getElementById('wbStatusBadge');
        const wbFormSub = document.getElementById('wbFormSub');

        queueItems.forEach(item => {
            item.addEventListener('click', () => {
                queueItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const petName = item.querySelector('.queue-pet-name')?.textContent || 'Bé cưng';
                if (wbFormTitle) wbFormTitle.textContent = `Cập nhật nhật ký ca: ${petName}`;
                if (wbStatusBadge) wbStatusBadge.textContent = 'Đang tiến hành';

                const subTexts = Array.from(item.querySelectorAll('.queue-card-sub')).map(el => el.textContent.trim());
                if (wbFormSub && subTexts.length > 0) {
                    wbFormSub.textContent = `${subTexts[0]} • Mã lịch hẹn: BK-2609 • ${subTexts[1] || ''}`;
                }
            });
        });

        // Nút Lưu bản nháp
        const btnSaveDraft = document.getElementById('btnSaveDraftCareLog');
        if (btnSaveDraft) {
            btnSaveDraft.addEventListener('click', () => {
                showToast('Đã lưu bản nháp nhật ký ca làm. Chưa gửi sang ứng dụng của chủ nuôi.');
            });
        }

        // Nút Hoàn thiện và Gửi — đổi trạng thái ca sang "Hoàn thiện"
        const btnCompleteAndSend = document.getElementById('btnCompleteAndSendCareLog');
        if (btnCompleteAndSend) {
            btnCompleteAndSend.addEventListener('click', () => {
                // Đổi badge trên form
                const wbBadge = document.getElementById('wbStatusBadge');
                if (wbBadge) {
                    wbBadge.textContent = 'Hoàn thiện';
                    wbBadge.className = 'admin-badge badge-success';
                }
                // Đổi badge trên thẻ ca làm bên cột trái
                const activeItem = document.querySelector('.queue-card-item.active');
                if (activeItem) {
                    const itemBadge = activeItem.querySelector('.admin-badge');
                    if (itemBadge) {
                        itemBadge.textContent = 'Hoàn thiện';
                        itemBadge.className = 'admin-badge badge-success';
                    }
                }
                showToast('Hoàn thiện ca làm! Nhật ký và ảnh đã đồng bộ sang ứng dụng của chủ nuôi.');
            });
        }

        const btnPreviewCustomerDiary = document.getElementById('btnPreviewCustomerDiary');
        if (btnPreviewCustomerDiary) {
            btnPreviewCustomerDiary.addEventListener('click', () => {
                window.open('/pages/user/pet-diary/pet-diary.html', '_blank');
            });
        }

        // Nút lưu ghi chú Groomer
        const btnSaveGroomer = document.getElementById('btnSaveGroomerNotes');
        if (btnSaveGroomer) {
            btnSaveGroomer.addEventListener('click', () => {
                showToast('Đã lưu ghi chú kỹ thuật Groomer cho bé!');
            });
        }

        // Nút quick carelog chuyển sang subtab Nhật ký
        document.querySelectorAll('.btn-quick-carelog').forEach(btn => {
            btn.addEventListener('click', () => {
                switchSubtab('tab-pet-carelog');
            });
        });

        // Nút quick book spa
        document.querySelectorAll('.btn-quick-book-spa').forEach(btn => {
            btn.addEventListener('click', () => {
                showToast('Đã chuyển sang phân hệ Dịch vụ & tự động điền sẵn thông tin bé cưng!');
                const srvMenuBtn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
                if (srvMenuBtn) srvMenuBtn.click();
            });
        });

        // Toast thông báo thanh lịch
        function showToast(msg) {
            let toast = document.getElementById('adminGlobalToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'adminGlobalToast';
                toast.style.cssText = `
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    background-color: #236B48;
                    color: #FFFFFF;
                    padding: 12px 20px;
                    border-radius: 9px;
                    font-size: 13.5px;
                    font-weight: 500;
                    box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
                    z-index: 9999;
                    display: none;
                `;
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }

        // 11. Khôi phục trạng thái Subtab khi F5 / Reload trang
        const savedSubtab = sessionStorage.getItem('pawpal_admin_pet_subtab');
        const hash = window.location.hash.replace('#', '');
        
        if (hash && document.getElementById(`subtab-${hash}`)) {
            switchSubtab(hash);
        } else if (savedSubtab && document.getElementById(`subtab-${savedSubtab}`)) {
            switchSubtab(savedSubtab);
        } else {
            switchSubtab('tab-pet-list');
        }

        const savedDrawerTab = sessionStorage.getItem('pawpal_admin_pet_drawertab');
        if (savedDrawerTab) {
            switchDrawerTab(savedDrawerTab);
        }
    }

    // Tự động khởi tạo khi DOM sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPetsModule);
    } else {
        initPetsModule();
    }
})();
