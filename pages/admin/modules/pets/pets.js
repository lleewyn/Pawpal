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
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-carelog">Nhật ký</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pet-reminders">Nhắc lịch</button>
            `;
        }

        // ====================================================================
        // DATA STORE MÔ PHỎNG CHI TIẾT TỪNG BÉ CƯNG (ĐẦY ĐỦ 4 TAB CON)
        // ====================================================================
        const petsData = {
            'PET-001': {
                name: 'Milu',
                code: 'PET-001',
                species: 'dog',
                speciesBreed: 'Chó Corgi',
                breed: 'Corgi',
                gender: 'Đực',
                weight: '8.5 kg',
                weightNum: 8.5,
                dob: '15/05/2023 (1 tuổi 4 tháng)',
                dobRaw: '2023-05-15',
                color: 'Vàng trắng',
                allergy: 'Dị ứng hải sản và sữa tắm tinh dầu tràm',
                notes: 'Bé khá nhát người lạ, thích ăn pate bò. Hơi dữ khi sấy đuôi.',
                alert: 'Cảnh báo: Bé hay cắn khi chạm vào đuôi hoặc khi sấy chân sau. Kỹ thuật viên Groomer cần đeo loa chắn mõm hoặc bố trí 2 người cùng phối hợp để đảm bảo an toàn!',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                avatar: '/assets/images/publics/dogcute3.jpg',
                status: 'Đang nuôi',
                vaccinated: true,
                isHotel: false,
                weightHistory: [
                    { date: '25/09/2026', weight: '8.5 kg', tier: 'Phân khúc 5 - 10kg (250.000đ)', by: 'Lễ tân Mai' },
                    { date: '10/08/2026', weight: '8.2 kg', tier: 'Phân khúc 5 - 10kg (250.000đ)', by: 'Groomer Tuấn' },
                    { date: '15/06/2026', weight: '7.9 kg', tier: 'Phân khúc 5 - 10kg (250.000đ)', by: 'Groomer Hương' }
                ],
                vaccines: [
                    { title: 'Vắc-xin phòng dại (Rabies)', status: 'Đã tiêm đủ', date: '15/04/2026', nextDate: '15/04/2027', place: 'Sổ tiêm chủng do chủ xuất trình' },
                    { title: 'Vắc-xin 7 bệnh cho Chó (Vanguard Plus 5/CV-L)', status: 'Đã tiêm đủ', date: '20/05/2026', nextDate: '20/05/2027', place: 'Sổ giấy đối chiếu tại quầy' },
                    { title: 'Xổ giun định kỳ và Nhỏ gáy ve rận', status: 'Đã thực hiện', date: '10/08/2026 (NexGard Spectra)', nextDate: '10/10/2026', place: 'Pawpal Center' },
                    { title: 'Quy chuẩn an toàn dịch tễ Pet Hotel', status: 'Đạt chuẩn', date: 'Đáp ứng 100% điều kiện nhận phòng', nextDate: '', place: 'Pawpal Hotel' }
                ],
                carelogs: [
                    { time: '25/09/2026 14:30', service: 'Tắm sấy dưỡng ẩm và Cắt mài móng', ktv: 'Hoàng Tuấn • Bàn 2', imgBefore: '/assets/images/publics/dogcute3.jpg', imgAfter: '/assets/images/publics/dogcute1.jpg', checkText: '4/4 mục đạt chuẩn', appStatus: 'Đã gửi app cho chủ', careId: 'CL-001' },
                    { time: '10/08/2026 10:00', service: 'Cắt tỉa tạo kiểu Corgi mặt gấu', ktv: 'Đỗ Hương • Bàn 1', imgBefore: '/assets/images/publics/dogcute7.jpg', imgAfter: '/assets/images/publics/dogcute3.jpg', checkText: '4/4 mục đạt chuẩn', appStatus: 'Đã lưu trữ', careId: 'CL-002' }
                ],
                history: [
                    { id: 'BK-2609-01', service: 'Tắm sấy dưỡng lông toàn diện', time: '25/09/2026 14:30', weight: '8.5 kg', price: '250.000đ', status: 'Đã hoàn thành' },
                    { id: 'BK-2608-14', service: 'Lưu trú Pet Hotel (Phòng VIP) 3 đêm', time: '12/08/2026 - 15/08/2026', weight: '8.2 kg', price: '1.050.000đ', status: 'Đã hoàn thành' },
                    { id: 'BK-2608-03', service: 'Cắt tỉa tạo kiểu toàn diện', time: '10/08/2026 10:00', weight: '8.2 kg', price: '350.000đ', status: 'Đã hoàn thành' }
                ]
            },
            'PET-002': {
                name: 'Mimi',
                code: 'PET-002',
                species: 'cat',
                speciesBreed: 'Mèo ALN',
                breed: 'Mèo Anh lông ngắn (ALN)',
                gender: 'Cái',
                weight: '4.2 kg',
                weightNum: 4.2,
                dob: '20/01/2024 (8 tháng)',
                dobRaw: '2024-01-20',
                color: 'Xám xanh',
                allergy: 'Không phát hiện',
                notes: 'Thích cào móng vào buổi sáng, ngoan khi tắm.',
                alert: '',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                avatar: '/assets/images/publics/catcute5.jpg',
                status: 'Lưu trú Hotel',
                vaccinated: true,
                isHotel: true,
                weightHistory: [
                    { date: '24/09/2026', weight: '4.2 kg', tier: 'Dưới 5kg (180.000đ)', by: 'Lễ tân Mai' },
                    { date: '01/08/2026', weight: '4.0 kg', tier: 'Dưới 5kg (180.000đ)', by: 'KTV Hương' }
                ],
                vaccines: [
                    { title: 'Vắc-xin phòng dại (Rabies)', status: 'Đã tiêm đủ', date: '10/03/2026', nextDate: '10/03/2027', place: 'Sổ tiêm chủng do chủ xuất trình' },
                    { title: 'Vắc-xin 4 bệnh cho Mèo (Purevax RCPCh)', status: 'Đã tiêm đủ', date: '15/03/2026', nextDate: '15/03/2027', place: 'Đầy đủ sổ tiêm' },
                    { title: 'Nhỏ gáy Advocate trị nội ngoại ký sinh', status: 'Đã thực hiện', date: '05/09/2026', nextDate: '05/10/2026', place: 'Pawpal Center' },
                    { title: 'Quy chuẩn an toàn dịch tễ Pet Hotel', status: 'Đạt chuẩn', date: 'Đang lưu trú phòng VIP #03', nextDate: '', place: 'Pawpal Hotel' }
                ],
                carelogs: [
                    { time: '26/09/2026 09:30', service: 'Tắm khô dưỡng lông và cạo lông đệm', ktv: 'Đỗ Hương', imgBefore: '/assets/images/publics/catcute5.jpg', imgAfter: '/assets/images/publics/catcute2.jpg', checkText: '4/4 mục đạt chuẩn', appStatus: 'Đã gửi app cho chủ', careId: 'CL-003' }
                ],
                history: [
                    { id: 'BK-2609-12', service: 'Lưu trú Pet Hotel phòng Mèo Condo 4 ngày', time: '24/09/2026 - 28/09/2026', weight: '4.2 kg', price: '800.000đ', status: 'Đang lưu trú' }
                ]
            },
            'PET-003': {
                name: 'Boss',
                code: 'PET-003',
                species: 'dog',
                speciesBreed: 'Golden Retriever',
                breed: 'Golden Retriever',
                gender: 'Đực',
                weight: '25.0 kg',
                weightNum: 25.0,
                dob: '10/10/2021 (2 tuổi 11 tháng)',
                dobRaw: '2021-10-10',
                color: 'Vàng nhạt',
                allergy: 'Không',
                notes: 'Rất hiếu động, thích nghịch nước, không sợ máy sấy.',
                alert: '',
                ownerName: 'Lê Thị Bình',
                ownerPhone: '0987654321',
                custId: 'CUST-002',
                avatar: '/assets/images/publics/dogcute8.jpg',
                status: 'Đang nuôi',
                vaccinated: true,
                isHotel: false,
                weightHistory: [
                    { date: '22/08/2026', weight: '25.0 kg', tier: 'Trên 20kg (500.000đ)', by: 'Groomer Nam' }
                ],
                vaccines: [
                    { title: 'Vắc-xin phòng dại và 7 bệnh chó lớn', status: 'Đã tiêm đủ', date: '01/02/2026', nextDate: '01/02/2027', place: 'Sổ tiêm chủng do chủ cung cấp' },
                    { title: 'Xổ giun và ngừa ve rận', status: 'Đã thực hiện', date: '15/08/2026', nextDate: '15/10/2026', place: 'Pawpal Center' }
                ],
                carelogs: [
                    { time: '22/08/2026 14:00', service: 'Spa tắm sấy chó lớn và chải lông rụng', ktv: 'Nguyễn Văn Nam', imgBefore: '/assets/images/publics/dogcute8.jpg', imgAfter: '/assets/images/publics/dogcute8.jpg', checkText: '4/4 mục đạt chuẩn', appStatus: 'Đã gửi app cho chủ', careId: 'CL-005' }
                ],
                history: [
                    { id: 'BK-2608-20', service: 'Tắm sấy chó lớn phân khúc >20kg', time: '22/08/2026', weight: '25.0 kg', price: '500.000đ', status: 'Đã hoàn thành' }
                ]
            },
            'PET-004': {
                name: 'Bông',
                code: 'PET-004',
                species: 'cat',
                speciesBreed: 'Mèo ta',
                breed: 'Mèo ta',
                gender: 'Cái',
                weight: '3.5 kg',
                weightNum: 3.5,
                dob: '10/03/2024 (6 tháng)',
                dobRaw: '2024-03-10',
                color: 'Trắng kem',
                allergy: 'Không',
                notes: 'Bé nhút nhát với người lạ, chưa xuất trình sổ tiêm ngừa.',
                alert: 'Lưu ý: Bé chưa xác nhận tiêm ngừa theo quy chuẩn. Cần kiểm tra kỹ sổ tiêm thực tế trước khi nhận phòng Pet Hotel!',
                ownerName: 'Trần Khách Vãng Lai',
                ownerPhone: '0933221100',
                custId: 'CUST-003',
                avatar: '/assets/images/publics/catcute8.jpg',
                status: 'Đang nuôi',
                vaccinated: false,
                isHotel: false,
                weightHistory: [
                    { date: '15/09/2026', weight: '3.5 kg', tier: 'Dưới 5kg (180.000đ)', by: 'Lễ tân Tuấn' }
                ],
                vaccines: [
                    { title: 'Vắc-xin phòng dại và 4 bệnh mèo', status: 'Chưa xác nhận', date: 'Chưa có dữ liệu', nextDate: 'Cần tiêm phòng ngay', place: 'Chưa xuất trình sổ' }
                ],
                carelogs: [],
                history: []
            },
            'PET-005': {
                name: 'Trà Sữa',
                code: 'PET-005',
                species: 'dog',
                speciesBreed: 'Poodle Toy',
                breed: 'Poodle',
                gender: 'Cái',
                weight: '2.8 kg',
                weightNum: 2.8,
                dob: '01/06/2024 (3 tháng)',
                dobRaw: '2024-06-01',
                color: 'Nâu kem',
                allergy: 'Không',
                notes: 'Bé rất thích chạy nhảy, cần cắt lông thường xuyên. Hơi sợ máy sấy lớn.',
                alert: 'Lưu ý: Bé sợ tiếng máy sấy công suất lớn. Kỹ thuật viên nên dùng máy sấy chế độ gió êm.',
                ownerName: 'Hoàng Minh Tuấn',
                ownerPhone: '0903112233',
                custId: 'CUST-005',
                avatar: '/assets/images/publics/dogcute6.jpg',
                status: 'Đang nuôi',
                vaccinated: true,
                isHotel: false,
                weightHistory: [
                    { date: '26/09/2026', weight: '2.8 kg', tier: 'Dưới 5kg (180.000đ)', by: 'KTV Hương' }
                ],
                vaccines: [
                    { title: 'Vắc-xin 5 bệnh mũi 2 cho Cún con', status: 'Đã tiêm đủ', date: '10/08/2026', nextDate: '10/09/2026 (Mũi 3)', place: 'Sổ theo dõi tiêm phòng định kỳ' }
                ],
                carelogs: [],
                history: []
            },
            'PET-007': {
                name: 'Mochi',
                code: 'PET-007',
                species: 'dog',
                speciesBreed: 'Phốc Sóc (Pomeranian)',
                breed: 'Phốc sóc',
                gender: 'Cái',
                weight: '3.2 kg',
                weightNum: 3.2,
                dob: '15/11/2023 (10 tháng)',
                dobRaw: '2023-11-15',
                color: 'Trắng tinh',
                allergy: 'Dị ứng sữa tắm tinh dầu tràm và hoa cúc',
                notes: 'Da bé khá nhạy cảm. Chỉ sử dụng sữa tắm hypoallergenic dịu nhẹ.',
                alert: 'Cảnh báo dị ứng: Dị ứng sữa tắm tinh dầu tràm! Dùng đúng loại xà phòng dịu nhẹ chuyên dụng tránh kích ứng da bé.',
                ownerName: 'Bùi Thu Trang',
                ownerPhone: '0938776655',
                custId: 'CUST-008',
                avatar: '/assets/images/publics/dogcute1.jpg',
                status: 'Đang nuôi',
                vaccinated: true,
                isHotel: false,
                weightHistory: [
                    { date: '18/09/2026', weight: '3.2 kg', tier: 'Dưới 5kg (180.000đ)', by: 'Lễ tân Mai' }
                ],
                vaccines: [
                    { title: 'Vắc-xin phòng dại và 7 bệnh', status: 'Đã tiêm đủ', date: '12/01/2026', nextDate: '12/01/2027', place: 'Sổ tiêm chủng do chủ cung cấp' }
                ],
                carelogs: [],
                history: []
            },
            'PET-008': {
                name: 'Bé Bơ',
                code: 'PET-008',
                species: 'rabbit',
                speciesBreed: 'Thỏ Minilop',
                breed: 'Thỏ',
                gender: 'Đực',
                weight: '1.6 kg',
                weightNum: 1.6,
                dob: '20/04/2024 (5 tháng)',
                dobRaw: '2024-04-20',
                color: 'Xám khói',
                allergy: 'Không',
                notes: 'Dễ giật mình, thích ăn cỏ Timothy khô.',
                alert: '',
                ownerName: 'Ngô Gia Bảo',
                ownerPhone: '0909123890',
                custId: 'CUST-009',
                avatar: '/assets/images/publics/hamster1.jpg',
                status: 'Đang nuôi',
                vaccinated: true,
                isHotel: false,
                weightHistory: [
                    { date: '10/09/2026', weight: '1.6 kg', tier: 'Dưới 5kg (180.000đ)', by: 'KTV Tuấn' }
                ],
                vaccines: [
                    { title: 'Sổ kiểm tra định kỳ Thỏ cảnh', status: 'Đã thực hiện', date: '10/08/2026', nextDate: '10/11/2026', place: 'Sổ theo dõi sức khỏe do chủ cung cấp' }
                ],
                carelogs: [],
                history: []
            },
            'PET-009': {
                name: 'Đậu Đậu',
                code: 'PET-009',
                species: 'dog',
                speciesBreed: 'Poodle Standard',
                breed: 'Poodle',
                gender: 'Đực',
                weight: '6.8 kg',
                weightNum: 6.8,
                dob: '15/01/2023 (1 tuổi 8 tháng)',
                dobRaw: '2023-01-15',
                color: 'Nâu đỏ',
                allergy: 'Không',
                notes: 'Rất ngoan, thích chạy giỡn.',
                alert: '',
                ownerName: 'Đặng Thùy Linh',
                ownerPhone: '0945678123',
                custId: 'CUST-010',
                avatar: '/assets/images/publics/dogcute4.jpg',
                status: 'Lưu trú Hotel',
                vaccinated: true,
                isHotel: true,
                weightHistory: [
                    { date: '25/09/2026', weight: '6.8 kg', tier: 'Phân khúc 5 - 10kg (250.000đ)', by: 'Lễ tân Mai' }
                ],
                vaccines: [
                    { title: 'Vắc-xin phòng dại và 7 bệnh', status: 'Đã tiêm đủ', date: '05/03/2026', nextDate: '05/03/2027', place: 'Sổ tiêm chủng do chủ xuất trình' }
                ],
                carelogs: [],
                history: []
            },
            'PET-010': {
                name: 'Bé Xíu',
                code: 'PET-010',
                species: 'cat',
                speciesBreed: 'Mèo Ba Tư',
                breed: 'Mèo ta',
                gender: 'Cái',
                weight: '3.8 kg',
                weightNum: 3.8,
                dob: '01/01/2022',
                dobRaw: '2022-01-01',
                color: 'Trắng kem',
                allergy: 'Không',
                notes: 'Đã chuyển quyền nuôi cho người thân.',
                alert: '',
                ownerName: 'Phạm Văn Vi Phạm',
                ownerPhone: '0944556677',
                custId: 'CUST-004',
                avatar: '/assets/images/publics/catcute7.jpg',
                status: 'Lưu trữ',
                vaccinated: true,
                isHotel: false,
                weightHistory: [],
                vaccines: [],
                carelogs: [],
                history: []
            }
        };

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
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
            });

            subtabPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
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

        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetId);
                sessionStorage.setItem('pawpal_admin_pet_drawertab', targetId);
            });
        });

        // ====================================================================
        // RENDER ĐỘNG TOÀN BỘ 4 TAB CON THEO TỪNG BÉ CƯNG
        // ====================================================================
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

            // Tab 2: Xác nhận tiêm chủng
            const vaccineContainer = document.getElementById('petVaccineContainer');
            if (vaccineContainer) {
                const vList = pet.vaccines || [];
                if (vList.length === 0) {
                    vaccineContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13.5px;">Bé chưa có dữ liệu tiêm chủng.</div>`;
                } else {
                    vaccineContainer.innerHTML = vList.map(v => `
                        <div class="vaccine-item-card is-qualified">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <strong style="color: var(--text-heading);">${v.title}</strong>
                                <span class="admin-badge ${v.status === 'Đã tiêm đủ' || v.status === 'Đã thực hiện' || v.status === 'Đạt chuẩn' ? 'badge-success' : 'badge-warning'}">${v.status}</span>
                            </div>
                            <div style="font-size: 13px; color: var(--text-main);">
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
                const sHistory = pet.history || [];
                if (sHistory.length === 0) {
                    historyTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Bé chưa có lịch sử đặt dịch vụ.</td></tr>`;
                } else {
                    historyTbody.innerHTML = sHistory.map(h => `
                        <tr>
                            <td><strong>${h.id}</strong></td>
                            <td>${h.service}</td>
                            <td>${h.time}</td>
                            <td>${h.weight}</td>
                            <td style="text-align: right;"><strong>${h.price}</strong></td>
                            <td style="text-align: center;"><span class="admin-badge badge-success">${h.status}</span></td>
                        </tr>
                    `).join('');
                }
            }
        }

        // 4. Mở hồ sơ chi tiết khi click vào Tên bé cưng hoặc nút Xem hồ sơ
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

            const statusBadgeEl = document.getElementById('drawerPetStatusBadge');
            if (statusBadgeEl) {
                statusBadgeEl.textContent = pet.status;
                statusBadgeEl.className = `admin-badge ${pet.status === 'Đang nuôi' ? 'badge-success' : (pet.status === 'Lưu trú Hotel' ? 'badge-warning' : 'badge-neutral')}`;
            }

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
            if (document.getElementById('profilePetCode')) document.getElementById('profilePetCode').textContent = pet.code;
            if (document.getElementById('profilePetName')) document.getElementById('profilePetName').textContent = pet.name;
            if (document.getElementById('profilePetSpecies')) document.getElementById('profilePetSpecies').textContent = pet.speciesBreed;
            if (document.getElementById('profilePetGender')) document.getElementById('profilePetGender').textContent = pet.gender;
            if (document.getElementById('profilePetWeight')) document.getElementById('profilePetWeight').textContent = pet.weight;
            if (document.getElementById('profilePetDob')) document.getElementById('profilePetDob').textContent = pet.dob;
            if (document.getElementById('profilePetColor')) document.getElementById('profilePetColor').textContent = pet.color;
            if (document.getElementById('profilePetAllergy')) document.getElementById('profilePetAllergy').textContent = pet.allergy;
            if (document.getElementById('profilePetNotes')) document.getElementById('profilePetNotes').textContent = pet.notes;

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

            // Render động cả 4 tabs con
            renderPetSubtabs(pet);

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
                const petId = btnOpen.getAttribute('data-id') || btnOpen.closest('tr')?.getAttribute('data-id');
                if (petId) openPetProfile(petId);
            }

            // Liên kết chuyển sang module Khách hàng
            const btnJumpCust = e.target.closest('.btn-jump-customer');
            if (btnJumpCust) {
                const custId = btnJumpCust.getAttribute('data-cust-id');
                if (custId) {
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
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

        // ====================================================================
        // 6. BỘ LỌC VÀ TÌM KIẾM THÚ CƯNG (ĐẦY ĐỦ CÂN NẶNG & TIÊM CHỦNG)
        // ====================================================================
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
                const petId = row.getAttribute('data-id');
                const pet = petsData[petId] || {};
                const text = row.textContent.toLowerCase();

                let matchSearch = !query || text.includes(query);
                let matchSpecies = true;
                let matchBreed = true;
                let matchWeight = true;
                let matchVaccine = true;
                let matchHotel = true;
                let matchAlert = true;

                // 1. Kiểm tra loài
                if (speciesVal !== 'ALL') {
                    if (speciesVal === 'dog') matchSpecies = pet.species === 'dog' || text.includes('chó') || text.includes('poodle') || text.includes('corgi') || text.includes('golden') || text.includes('phốc');
                    else if (speciesVal === 'cat') matchSpecies = pet.species === 'cat' || text.includes('mèo');
                    else if (speciesVal === 'rabbit') matchSpecies = pet.species === 'rabbit' || text.includes('thỏ');
                    else if (speciesVal === 'other') matchSpecies = pet.species === 'other' || text.includes('thỏ') || text.includes('hamster') || text.includes('khác');
                }

                // 2. Kiểm tra giống
                if (breedVal !== 'ALL') {
                    matchBreed = text.includes(breedVal.toLowerCase());
                }

                // 3. Kiểm tra Cân nặng
                if (weightVal !== 'ALL') {
                    const kg = pet.weightNum || parseFloat(pet.weight) || 0;
                    if (weightVal === 'under5') matchWeight = kg < 5;
                    else if (weightVal === '5to10') matchWeight = (kg >= 5 && kg <= 10);
                    else if (weightVal === '10to20') matchWeight = (kg > 10 && kg <= 20);
                    else if (weightVal === 'over20') matchWeight = kg > 20;
                }

                // 4. Kiểm tra Tiêm chủng
                if (vaccineVal !== 'ALL') {
                    if (vaccineVal === 'VACCINATED') matchVaccine = pet.vaccinated !== false;
                    else if (vaccineVal === 'NOT_VACCINATED') matchVaccine = pet.vaccinated === false;
                }

                // 5. Kiểm tra Hotel
                if (isHotelOnly) {
                    matchHotel = pet.isHotel === true || text.includes('hotel');
                }

                // 6. Kiểm tra Cảnh báo
                if (isAlertOnly) {
                    matchAlert = row.classList.contains('row-alert-critical') || row.classList.contains('row-alert-warning') || Boolean(pet.alert);
                }

                if (matchSearch && matchSpecies && matchBreed && matchWeight && matchVaccine && matchHotel && matchAlert) {
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

        // ====================================================================
        // 7. TÁC VỤ LƯU TRỮ VÀ KHÔI PHỤC HỒ SƠ THÚ CƯNG TRÊN MENU 3 CHẤM
        // ====================================================================
        document.addEventListener('click', (e) => {
            const btnArchive = e.target.closest('.btn-archive-pet');
            const btnRestore = e.target.closest('.btn-restore-pet');

            if (btnArchive) {
                e.stopPropagation();
                const petId = btnArchive.getAttribute('data-id');
                const row = btnArchive.closest('tr');
                if (confirm(`Bạn có chắc muốn lưu trữ hồ sơ của bé cưng ${petsData[petId]?.name || petId}?`)) {
                    row.classList.add('row-archived');
                    const badge = row.querySelectorAll('td')[7]?.querySelector('.admin-badge');
                    if (badge) {
                        badge.textContent = 'Lưu trữ';
                        badge.className = 'admin-badge badge-neutral';
                    }
                    if (petsData[petId]) petsData[petId].status = 'Lưu trữ';

                    btnArchive.className = 'dropdown-item text-success btn-restore-pet';
                    btnArchive.textContent = 'Khôi phục hồ sơ';
                    btnArchive.closest('.action-dropdown-wrapper')?.classList.remove('open');
                    showToast(`Đã lưu trữ hồ sơ bé cưng ${petsData[petId]?.name || petId}!`);
                }
            }

            if (btnRestore) {
                e.stopPropagation();
                const petId = btnRestore.getAttribute('data-id');
                const row = btnRestore.closest('tr');
                row.classList.remove('row-archived');
                const badge = row.querySelectorAll('td')[7]?.querySelector('.admin-badge');
                if (badge) {
                    badge.textContent = 'Đang nuôi';
                    badge.className = 'admin-badge badge-success';
                }
                if (petsData[petId]) petsData[petId].status = 'Đang nuôi';

                btnRestore.className = 'dropdown-item text-danger btn-archive-pet';
                btnRestore.textContent = 'Lưu trữ hồ sơ';
                btnRestore.closest('.action-dropdown-wrapper')?.classList.remove('open');
                showToast(`Đã khôi phục hoạt động cho bé cưng ${petsData[petId]?.name || petId}!`);
            }
        });

        // ====================================================================
        // 8. MODAL 2: CÂN BÉ VÀ LƯU VÀO BẢNG LỊCH SỬ BIẾN ĐỘNG CÂN NẶNG
        // ====================================================================
        const modalWeighPet = document.getElementById('modalWeighPet');
        const weighNewWeightInput = document.getElementById('weighPetNewWeight');
        const weighTierResult = document.getElementById('weighTierResult');
        const weighSpaPriceResult = document.getElementById('weighSpaPriceResult');
        const weighGroomPriceResult = document.getElementById('weighGroomPriceResult');
        const weighHotelPriceResult = document.getElementById('weighHotelPriceResult');
        let currentWeighingPetId = 'PET-001';

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
            return tier;
        }

        if (weighNewWeightInput) {
            weighNewWeightInput.addEventListener('input', (e) => {
                updatePriceMatrix(e.target.value);
            });
        }

        document.addEventListener('click', (e) => {
            const btnWeigh = e.target.closest('.btn-open-weigh-modal');
            if (btnWeigh) {
                currentWeighingPetId = btnWeigh.getAttribute('data-id') || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                const pet = petsData[currentWeighingPetId] || petsData['PET-001'];
                
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

        const btnSubmitWeigh = document.getElementById('btnSubmitWeigh');
        if (btnSubmitWeigh) {
            btnSubmitWeigh.addEventListener('click', () => {
                const newKg = parseFloat(weighNewWeightInput?.value || '8.5');
                const pet = petsData[currentWeighingPetId];
                if (!pet) return;

                const tierStr = updatePriceMatrix(newKg);
                pet.weight = `${newKg} kg`;
                pet.weightNum = newKg;

                // Thêm 1 dòng vào lịch sử cân nặng
                const now = new Date();
                const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()}`;
                if (!pet.weightHistory) pet.weightHistory = [];
                pet.weightHistory.unshift({
                    date: dateStr,
                    weight: `${newKg} kg`,
                    tier: `Phân khúc ${tierStr}`,
                    by: 'Lễ tân quầy'
                });

                // Cập nhật DOM Drawer
                if (document.getElementById('drawerPetWeightHeadline')) {
                    document.getElementById('drawerPetWeightHeadline').textContent = `${newKg} kg`;
                }
                if (document.getElementById('profilePetWeight')) {
                    document.getElementById('profilePetWeight').textContent = `${newKg} kg`;
                }
                renderPetSubtabs(pet);

                // Cập nhật dòng ngoài bảng
                const row = document.querySelector(`#petTableTbody tr[data-id="${currentWeighingPetId}"]`);
                if (row) {
                    const weightCell = row.querySelectorAll('td')[4]?.querySelector('strong');
                    if (weightCell) weightCell.textContent = `${newKg} kg`;
                }

                showToast(`Đã lưu cân nặng mới (${newKg} kg) cho bé ${pet.name} và cập nhật lịch sử!`);
                if (modalWeighPet) modalWeighPet.classList.remove('open');
            });
        }

        // ====================================================================
        // 9. MODAL 5: CHỈNH SỬA HỒ SƠ THÚ CƯNG (EDIT PET PROFILE)
        // ====================================================================
        const modalEditPet = document.getElementById('modalEditPetProfile');
        const formEditPet = document.getElementById('formEditPetProfile');
        let currentEditingPetCode = 'PET-001';

        function openEditPetModal(petId) {
            currentEditingPetCode = petId || sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
            const pet = petsData[currentEditingPetCode] || petsData['PET-001'];
            if (!modalEditPet) return;

            if (document.getElementById('editPetCode')) document.getElementById('editPetCode').value = pet.code;
            if (document.getElementById('editPetOwner')) document.getElementById('editPetOwner').value = pet.custId || 'CUST-001';
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

        const btnOpenEditPet = document.getElementById('btnOpenEditPetModal');
        if (btnOpenEditPet) {
            btnOpenEditPet.addEventListener('click', () => {
                const currentId = sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
                openEditPetModal(currentId);
            });
        }

        const btnSubmitEditPet = document.getElementById('btnSubmitEditPetProfile');
        if (btnSubmitEditPet) {
            btnSubmitEditPet.addEventListener('click', () => {
                const pet = petsData[currentEditingPetCode];
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

                const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
                const speciesBreedStr = `${speciesNameMap[species] || 'Chó'} ${breed}`;

                // Cập nhật Database
                pet.name = name;
                pet.species = species;
                pet.breed = breed;
                pet.speciesBreed = speciesBreedStr;
                pet.gender = gender;
                pet.weight = `${weight} kg`;
                pet.weightNum = weight;
                pet.dobRaw = dob;
                pet.dob = dob ? `${dob.split('-')[2]}/${dob.split('-')[1]}/${dob.split('-')[0]}` : pet.dob;
                pet.color = color;
                pet.status = status;
                pet.alert = alertText;
                pet.allergy = allergy;
                pet.notes = notes;
                pet.custId = ownerCustId;

                // Cập nhật lại Drawer
                openPetProfile(currentEditingPetCode);

                // Cập nhật lại dòng ngoài bảng danh sách
                const row = document.querySelector(`#petTableTbody tr[data-id="${currentEditingPetCode}"]`);
                if (row) {
                    const nameLink = row.querySelector('.pet-name-link');
                    if (nameLink) nameLink.textContent = name;
                    const subCell = row.querySelector('.pet-sub-cell');
                    if (subCell) subCell.textContent = `${gender} • ${pet.dob}`;
                    const speciesCell = row.querySelectorAll('td')[3];
                    if (speciesCell) speciesCell.textContent = speciesBreedStr;
                    const weightCell = row.querySelectorAll('td')[4]?.querySelector('strong');
                    if (weightCell) weightCell.textContent = `${weight} kg`;
                    const alertCell = row.querySelectorAll('td')[6]?.querySelector('.admin-badge');
                    if (alertCell) {
                        alertCell.textContent = alertText || 'Bình thường';
                        alertCell.className = `admin-badge ${alertText ? 'badge-danger' : 'badge-neutral'}`;
                        alertCell.style.cssText = '';
                    }
                    const statusCell = row.querySelectorAll('td')[7]?.querySelector('.admin-badge');
                    if (statusCell) {
                        statusCell.textContent = status;
                        statusCell.className = `admin-badge ${status === 'Đang nuôi' ? 'badge-success' : (status === 'Lưu trú Hotel' ? 'badge-warning' : 'badge-neutral')}`;
                    }
                }

                showToast(`Đã cập nhật thành công hồ sơ của bé ${name}!`);
                if (modalEditPet) modalEditPet.classList.remove('open');
            });
        }

        // ====================================================================
        // 10. TIẾP NHẬN BÉ CƯNG MỚI TẠI QUẦY (MODAL 1)
        // ====================================================================
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
                const ownerCustId = document.getElementById('newPetOwner')?.value || 'CUST-001';
                const species = document.getElementById('newPetSpecies')?.value || 'dog';
                const breed = document.getElementById('newPetBreed')?.value || 'Corgi';
                const gender = document.getElementById('newPetGender')?.value === 'female' ? 'Cái' : 'Đực';
                const weight = parseFloat(document.getElementById('newPetWeight')?.value || '5.0');
                const dob = document.getElementById('newPetDob')?.value || '2024-01-15';
                const color = document.getElementById('newPetColor')?.value || 'Vàng trắng';
                const alertText = document.getElementById('newPetAlert')?.value || '';
                const allergy = document.getElementById('newPetAllergy')?.value || 'Không';

                const newPetId = 'PET-' + String(Object.keys(petsData).length + 1).padStart(3, '0');
                const speciesNameMap = { 'dog': 'Chó', 'cat': 'Mèo', 'rabbit': 'Thỏ', 'other': 'Khác' };
                const speciesBreedStr = `${speciesNameMap[species] || 'Chó'} ${breed}`;

                petsData[newPetId] = {
                    name: name,
                    code: newPetId,
                    species: species,
                    speciesBreed: speciesBreedStr,
                    breed: breed,
                    gender: gender,
                    weight: `${weight} kg`,
                    weightNum: weight,
                    dob: dob,
                    dobRaw: dob,
                    color: color,
                    allergy: allergy,
                    notes: 'Tiếp nhận mới tại quầy.',
                    alert: alertText,
                    ownerName: 'Khách hàng',
                    ownerPhone: '0900000000',
                    custId: ownerCustId,
                    avatar: species === 'cat' ? '/assets/images/publics/catcute5.jpg' : '/assets/images/publics/dogcute3.jpg',
                    status: 'Đang nuôi',
                    vaccinated: true,
                    isHotel: false,
                    weightHistory: [{ date: 'Hôm nay', weight: `${weight} kg`, tier: 'Cân tiếp nhận quầy', by: 'Lễ tân' }],
                    vaccines: [],
                    carelogs: [],
                    history: []
                };

                // Thêm 1 dòng mới vào bảng
                const tbody = document.getElementById('petTableTbody');
                if (tbody) {
                    const newTr = document.createElement('tr');
                    newTr.setAttribute('data-id', newPetId);
                    newTr.innerHTML = `
                        <td style="text-align: center;">
                            <img src="${petsData[newPetId].avatar}" class="pet-avatar-cell" alt="${name}">
                        </td>
                        <td><strong>${newPetId}</strong></td>
                        <td>
                            <div class="pet-name-cell">
                                <a href="javascript:void(0)" class="pet-name-link btn-open-pet-drawer" data-id="${newPetId}">${name}</a>
                            </div>
                            <div class="pet-sub-cell">${gender} • ${dob}</div>
                        </td>
                        <td>${speciesBreedStr}</td>
                        <td><strong>${weight} kg</strong></td>
                        <td>
                            <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${ownerCustId}">${ownerCustId}</a>
                            <div class="pet-sub-cell">Chủ nuôi</div>
                        </td>
                        <td>
                            <span class="admin-badge ${alertText ? 'badge-warning' : 'badge-neutral'}">${alertText || 'Bình thường'}</span>
                        </td>
                        <td><span class="admin-badge badge-success">Đang nuôi</span></td>
                        <td style="text-align: center;">
                            <div class="action-dropdown-wrapper">
                                <button type="button" class="btn-action-more" data-id="${newPetId}" title="Tác vụ">•••</button>
                                <div class="action-dropdown-menu">
                                    <button type="button" class="dropdown-item btn-open-pet-drawer" data-id="${newPetId}">Xem hồ sơ chi tiết</button>
                                    <button type="button" class="dropdown-item btn-open-weigh-modal" data-id="${newPetId}">Cân bé và Thể trạng</button>
                                    <button type="button" class="dropdown-item btn-create-service-pet" data-id="${newPetId}">Tạo ca dịch vụ</button>
                                    <button type="button" class="dropdown-item text-danger btn-archive-pet" data-id="${newPetId}">Lưu trữ hồ sơ</button>
                                </div>
                            </div>
                        </td>
                    `;
                    tbody.prepend(newTr);
                }

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

        // ====================================================================
        // 11. GỬI TIN NHẮN CHĂM SÓC ĐỊNH KỲ VÀ GỬI ĐỒNG LOẠT (SUBTAB 3)
        // ====================================================================
        const remindersData = [
            {
                id: 'REM-001',
                petId: 'PET-001',
                petName: 'Bé Milu',
                speciesBreed: 'Chó Corgi',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                type: 'BATH',
                typeText: 'Quá 18 ngày chưa tắm sấy',
                typeBadgeClass: 'badge-warning',
                lastDateText: '09/09/2026 (18 ngày trước)',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-002',
                petId: 'PET-003',
                petName: 'Bé Boss',
                speciesBreed: 'Chó Golden Retriever',
                ownerName: 'Lê Thị Bình',
                ownerPhone: '0987654321',
                custId: 'CUST-002',
                type: 'GROOM',
                typeText: 'Quá 35 ngày chưa cắt lông',
                typeBadgeClass: 'badge-danger',
                typeBadgeStyle: '',
                lastDateText: '22/08/2026 (36 ngày trước)',
                status: 'SENT',
                statusText: 'Đã gửi Zalo hôm qua',
                statusBadgeClass: 'badge-success'
            },
            {
                id: 'REM-003',
                petId: 'PET-002',
                petName: 'Bé Mimi',
                speciesBreed: 'Mèo Anh lông ngắn',
                ownerName: 'Nguyễn Văn An',
                ownerPhone: '0912345678',
                custId: 'CUST-001',
                type: 'HOTEL',
                typeText: 'Gửi Pet Hotel cuối tuần',
                typeBadgeClass: 'badge-tier-gold',
                lastDateText: 'Khách quen gửi thứ 7 hằng tuần',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-004',
                petId: 'PET-005',
                petName: 'Bé Trà Sữa',
                speciesBreed: 'Chó Poodle Toy',
                ownerName: 'Hoàng Minh Tuấn',
                ownerPhone: '0903112233',
                custId: 'CUST-005',
                type: 'GROOM',
                typeText: 'Quá 32 ngày chưa cắt tỉa lông',
                typeBadgeClass: 'badge-danger',
                typeBadgeStyle: '',
                lastDateText: '26/08/2026 (32 ngày trước)',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            },
            {
                id: 'REM-005',
                petId: 'PET-007',
                petName: 'Bé Mochi',
                speciesBreed: 'Phốc Sóc (Pomeranian)',
                ownerName: 'Bùi Thu Trang',
                ownerPhone: '0938776655',
                custId: 'CUST-008',
                type: 'BATH',
                typeText: 'Quá 16 ngày chưa tắm sấy',
                typeBadgeClass: 'badge-warning',
                lastDateText: '12/09/2026 (16 ngày trước)',
                status: 'SENT',
                statusText: 'Đã gửi Zalo sáng nay',
                statusBadgeClass: 'badge-success'
            },
            {
                id: 'REM-006',
                petId: 'PET-009',
                petName: 'Bé Đậu Đậu',
                speciesBreed: 'Poodle Standard',
                ownerName: 'Đặng Thùy Linh',
                ownerPhone: '0945678123',
                custId: 'CUST-010',
                type: 'HOTEL',
                typeText: 'Gửi Pet Hotel cuối tuần',
                typeBadgeClass: 'badge-tier-gold',
                lastDateText: 'Khách quen đặt phòng cuối tuần',
                status: 'UNSENT',
                statusText: 'Chưa gửi',
                statusBadgeClass: 'badge-neutral'
            }
        ];

        const reminderSearchInput = document.getElementById('reminderSearchInput');
        const reminderFilterType = document.getElementById('reminderFilterType');
        const reminderFilterStatus = document.getElementById('reminderFilterStatus');
        const reminderTableTbody = document.getElementById('reminderTableTbody');
        const modalSendReminder = document.getElementById('modalSendReminder');
        let currentSendingReminderId = 'REM-001';

        function renderRemindersTable() {
            if (!reminderTableTbody) return;
            const query = (reminderSearchInput?.value || '').toLowerCase().trim();
            const typeFilter = reminderFilterType?.value || 'ALL';
            const statusFilter = reminderFilterStatus?.value || 'ALL';

            const filtered = remindersData.filter(item => {
                const matchSearch = !query || 
                    item.petName.toLowerCase().includes(query) ||
                    item.ownerName.toLowerCase().includes(query) ||
                    item.ownerPhone.includes(query) ||
                    item.speciesBreed.toLowerCase().includes(query) ||
                    item.petId.toLowerCase().includes(query);

                const matchType = (typeFilter === 'ALL') || (item.type === typeFilter);
                const matchStatus = (statusFilter === 'ALL') || (item.status === statusFilter);
                return matchSearch && matchType && matchStatus;
            });

            if (filtered.length === 0) {
                reminderTableTbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">
                            Không tìm thấy lịch nhắc chăm sóc nào phù hợp với bộ lọc.
                        </td>
                    </tr>
                `;
                return;
            }

            reminderTableTbody.innerHTML = filtered.map(item => `
                <tr data-rem-id="${item.id}">
                    <td>
                        <strong style="color: var(--text-heading);">${item.petName}</strong>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.speciesBreed} • Mã: ${item.petId}</div>
                    </td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-jump-customer" data-cust-id="${item.custId}">${item.ownerName}</a>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.ownerPhone}</div>
                    </td>
                    <td>
                        <span class="admin-badge ${item.typeBadgeClass}" ${item.typeBadgeStyle ? `style="${item.typeBadgeStyle}"` : ''}>
                            ${item.typeText}
                        </span>
                    </td>
                    <td>${item.lastDateText}</td>
                    <td>
                        <span class="admin-badge ${item.statusBadgeClass}">
                            ${item.statusText}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px;">
                            <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-reminder-modal"
                                data-rem-id="${item.id}"
                                data-pet="${item.petName}"
                                data-owner="${item.ownerName}"
                                data-phone="${item.ownerPhone}">
                                ${item.status === 'SENT' ? 'Gửi lại' : 'Gửi tin'}
                            </button>
                            <button type="button" class="admin-btn admin-btn-primary btn-sm btn-quick-book-spa" data-id="${item.petId}">
                                Đặt lịch
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        if (reminderSearchInput) reminderSearchInput.addEventListener('input', renderRemindersTable);
        if (reminderFilterType) reminderFilterType.addEventListener('change', renderRemindersTable);
        if (reminderFilterStatus) reminderFilterStatus.addEventListener('change', renderRemindersTable);

        // Khởi tạo render bảng Subtab 3
        renderRemindersTable();

        document.addEventListener('click', (e) => {
            const btnReminder = e.target.closest('.btn-open-reminder-modal');
            if (btnReminder && modalSendReminder) {
                currentSendingReminderId = btnReminder.getAttribute('data-rem-id') || 'REM-001';
                const pet = btnReminder.getAttribute('data-pet') || 'Milu';
                const owner = btnReminder.getAttribute('data-owner') || 'Nguyễn Văn An';
                const phone = btnReminder.getAttribute('data-phone') || '0912345678';

                const ownerInput = document.getElementById('reminderModalOwner');
                const petInput = document.getElementById('reminderModalPet');
                const contentInput = document.getElementById('reminderMessageContent');

                if (ownerInput) ownerInput.value = `${owner} (${phone})`;
                if (petInput) petInput.value = pet;
                if (contentInput) {
                    contentInput.value = `PawPal mến chào Sen ${owner}! Bé ${pet} đã đến kỳ làm đẹp định kỳ rồi đó ạ. PawPal gửi tặng bé voucher ưu đãi 10% dịch vụ Spa trong tuần này. Sen đặt lịch ngay cho bé nhé!`;
                }

                modalSendReminder.classList.add('open');
            }
        });

        const btnSubmitSendReminder = document.getElementById('btnSubmitSendReminder');
        if (btnSubmitSendReminder) {
            btnSubmitSendReminder.addEventListener('click', () => {
                const targetRem = remindersData.find(r => r.id === currentSendingReminderId);
                if (targetRem) {
                    targetRem.status = 'SENT';
                    targetRem.statusText = 'Đã gửi Zalo vừa xong';
                    targetRem.statusBadgeClass = 'badge-success';
                }
                renderRemindersTable();
                showToast('Đã gửi tin nhắn chăm sóc qua Zalo Official Account kèm ưu đãi 10% đến số điện thoại của chủ!');
                if (modalSendReminder) modalSendReminder.classList.remove('open');
            });
        }

        // Nút Gửi tin đồng loạt Zalo
        const btnBatchSend = document.getElementById('btnBatchSendReminder');
        if (btnBatchSend) {
            btnBatchSend.addEventListener('click', () => {
                const unsentCount = remindersData.filter(r => r.status === 'UNSENT').length;
                if (confirm(`Bạn có chắc chắn muốn gửi tin nhắn chăm sóc tự động qua Zalo ZNS cho toàn bộ ${remindersData.length} bé cưng đang đến chu kỳ làm đẹp?`)) {
                    remindersData.forEach(r => {
                        r.status = 'SENT';
                        r.statusText = 'Đã gửi Zalo vừa xong';
                        r.statusBadgeClass = 'badge-success';
                    });
                    renderRemindersTable();
                    showToast(`Đã gửi tin nhắn chăm sóc đồng loạt thành công tới ${remindersData.length} chủ nuôi qua Zalo Official Account!`);
                }
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

        // 12. Modal Xem chi tiết nhật ký chăm sóc
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

        // 13. Sub-tab 4: Nhật ký chăm sóc (Bàn làm việc Groomer & Hotel)
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

        const btnSaveDraft = document.getElementById('btnSaveDraftCareLog');
        if (btnSaveDraft) {
            btnSaveDraft.addEventListener('click', () => {
                showToast('Đã lưu bản nháp nhật ký ca làm. Chưa gửi sang ứng dụng của chủ nuôi.');
            });
        }

        const btnCompleteAndSend = document.getElementById('btnCompleteAndSendCareLog');
        if (btnCompleteAndSend) {
            btnCompleteAndSend.addEventListener('click', () => {
                const wbBadge = document.getElementById('wbStatusBadge');
                if (wbBadge) {
                    wbBadge.textContent = 'Hoàn thiện';
                    wbBadge.className = 'admin-badge badge-success';
                }
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

        const btnSaveGroomer = document.getElementById('btnSaveGroomerNotes');
        if (btnSaveGroomer) {
            btnSaveGroomer.addEventListener('click', () => {
                showToast('Đã lưu ghi chú kỹ thuật Groomer cho bé!');
            });
        }

        document.querySelectorAll('.btn-quick-carelog').forEach(btn => {
            btn.addEventListener('click', () => {
                switchSubtab('tab-pet-carelog');
            });
        });

        // ====================================================================
        // LIÊN KẾT ĐẶT LỊCH VÀ TẠO CA DỊCH VỤ SANG PHÂN HỆ DỊCH VỤ
        // ====================================================================
        function handleCreateServiceForPet(petId) {
            const pet = petsData[petId] || petsData[sessionStorage.getItem('pawpal_admin_pet_id')] || petsData['PET-001'];
            if (!pet) return;

            const presetBooking = {
                petId: pet.code,
                petName: pet.name,
                ownerName: pet.ownerName,
                ownerPhone: pet.ownerPhone,
                breed: pet.speciesBreed,
                weight: pet.weight
            };
            sessionStorage.setItem('pawpal_admin_booking_preset', JSON.stringify(presetBooking));
            sessionStorage.setItem('pawpal_admin_service_subtab', 'tab-booking-list');

            showToast(`Đang chuyển sang phân hệ Dịch vụ để tạo ca cho bé ${pet.name}...`);
            const srvMenuBtn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
            if (srvMenuBtn) {
                srvMenuBtn.click();
            }
        }

        document.addEventListener('click', (e) => {
            const btnCreate = e.target.closest('.btn-create-service-pet');
            if (btnCreate) {
                const petId = btnCreate.getAttribute('data-id') || btnCreate.closest('tr')?.getAttribute('data-id');
                btnCreate.closest('.action-dropdown-wrapper')?.classList.remove('open');
                handleCreateServiceForPet(petId);
                return;
            }

            const btnQuickBook = e.target.closest('.btn-quick-book-spa');
            if (btnQuickBook) {
                const petId = btnQuickBook.getAttribute('data-id') || 
                              btnQuickBook.getAttribute('data-pet-id') || 
                              btnQuickBook.closest('tr')?.getAttribute('data-id') ||
                              sessionStorage.getItem('pawpal_admin_pet_id');
                handleCreateServiceForPet(petId);
            }
        });

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

        // 14. Khôi phục trạng thái Subtab khi F5 / Reload trang
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

        // Render hồ sơ mặc định ban đầu
        const initPetId = sessionStorage.getItem('pawpal_admin_pet_id') || 'PET-001';
        if (petsData[initPetId]) {
            renderPetSubtabs(petsData[initPetId]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPetsModule);
    } else {
        initPetsModule();
    }
})();
