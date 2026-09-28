// customers.js - Phân hệ Quản lý Khách hàng Pawpal-er
(function() {
    function initCustomersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 3 Sub-tabs trực tiếp lên Header Bar (thuần chữ, không icon, phân tách bằng |)
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-list">Khách hàng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pawpoint">Pawpoint</button>
            `;
        }

        // ====================================================================
        // DATA STORE MÔ PHỎNG CHI TIẾT THEO TỪNG KHÁCH HÀNG (CÁ NHÂN, PET, ĐƠN, LỊCH, KHIẾU NẠI)
        // ====================================================================
        const customerDatabase = {
            'CUST-001': {
                id: 'CUST-001',
                name: 'Nguyễn Văn An',
                phone: '0912345678',
                email: 'an.nguyen@email.com',
                gender: 'Nam',
                dob: '15/08/1992',
                tier: 'GOLD',
                tierName: 'Vàng',
                tierBadgeClass: 'badge-tier-gold',
                points: 1250,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Khách hàng thân thiết từ 2024. Rất yêu quý bé Lu (Poodle). Khách yêu cầu thợ cắt tỉa nhẹ nhàng, không xịt nước hoa nồng.',
                emergencyAlert: 'Khách hàng đang có vé khiếu nại mức độ Cao chưa giải quyết (Mã: TK-008 - Bé Lu bị trầy móng chân). Cần giải quyết dứt điểm trước khi nhận giao dịch mới!',
                addresses: [
                    { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true },
                    { address: 'Toà nhà Bitexco, 2 Hải Triều, Bến Nghé, Quận 1, TP.HCM', isDefault: false }
                ],
                pets: [
                    {
                        id: 'PET-001',
                        name: 'Bé Lu',
                        species: 'Chó',
                        breed: 'Poodle',
                        weight: '4.5',
                        vaccine: 'Sổ theo dõi tiêm phòng định kỳ đầy đủ (Chủ xuất trình tháng 8/2026)',
                        alertNote: 'Cảnh báo: Dị ứng phấn hoa'
                    },
                    {
                        id: 'PET-011',
                        name: 'Bé Miu',
                        species: 'Mèo',
                        breed: 'Mèo Anh lông ngắn',
                        weight: '3.2',
                        vaccine: 'Đầy đủ sổ tiêm',
                        alertNote: 'Bình thường'
                    }
                ],
                orders: [
                    { id: 'ORD-8921', date: '25/09/2026', total: '450.000 đ', payment: 'Đã thanh toán', status: 'Đang giao', statusClass: 'badge-info' }
                ],
                bookings: [
                    { id: 'AP-201', date: '27/09/2026 09:00', service: 'Spa Grooming và Cắt tỉa tạo kiểu', staff: 'Trần Hoàng (Thợ bậc 2)', status: 'Đang thực hiện', statusClass: 'badge-warning' }
                ],
                complaints: [
                    { id: 'TK-008', date: '27/09/2026 10:15', issue: 'Bé Lu bị trầy móng sau buổi cắt tỉa', level: 'Cao', status: 'Đang xử lý', statusClass: 'badge-warning' }
                ]
            },
            'CUST-002': {
                id: 'CUST-002',
                name: 'Lê Thị Bình',
                phone: '0987654321',
                email: 'binh.le@email.com',
                gender: 'Nữ',
                dob: '20/11/1995',
                tier: 'SILVER',
                tierName: 'Bạc',
                tierBadgeClass: 'badge-tier-silver',
                points: 420,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Khách cẩn thận, bé Miu rất nhát người lạ nên ưu tiên nhân viên nữ chăm sóc.',
                emergencyAlert: null,
                addresses: [
                    { address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-002',
                        name: 'Bé Miu',
                        species: 'Mèo',
                        breed: 'Mèo Anh lông ngắn',
                        weight: '3.8',
                        vaccine: 'Đã tiêm phòng 4 bệnh mèo mũi nhắc lại 2026',
                        alertNote: 'Dị ứng sữa tắm hoa hồng'
                    }
                ],
                orders: [
                    { id: 'ORD-8920', date: '25/09/2026', total: '420.000 đ', payment: 'Đã thanh toán', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                bookings: [
                    { id: 'AP-198', date: '24/09/2026 14:00', service: 'Tắm vệ sinh và cạo lông đệm chân', staff: 'Nguyễn Thị Hoa', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                complaints: []
            },
            'CUST-003': {
                id: 'CUST-003',
                name: 'Trần Khách Vãng Lai',
                phone: '0933221100',
                email: 'Chưa cập nhật',
                gender: 'Nam',
                dob: '01/01/1990',
                tier: 'BRONZE',
                tierName: 'Đồng',
                tierBadgeClass: 'badge-neutral',
                points: 0,
                status: 'TEMP',
                authStatus: 'Chưa kích hoạt',
                note: 'Khách ghé mua phụ kiện tại quầy, chưa tải app Pawpal.',
                emergencyAlert: null,
                addresses: [
                    { address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-003',
                        name: 'Bé Bông',
                        species: 'Chó',
                        breed: 'Corgi',
                        weight: '6.2',
                        vaccine: 'Chưa cập nhật',
                        alertNote: 'Bình thường'
                    }
                ],
                orders: [],
                bookings: [],
                complaints: []
            },
            'CUST-004': {
                id: 'CUST-004',
                name: 'Phạm Văn Vi Phạm',
                phone: '0944556677',
                email: 'pham.vipham@email.com',
                gender: 'Nam',
                dob: '12/03/1988',
                tier: 'BRONZE',
                tierName: 'Đồng',
                tierBadgeClass: 'badge-neutral',
                points: 50,
                status: 'LOCKED',
                authStatus: 'Tài khoản bị khóa',
                note: 'Tạm khóa do có tranh chấp thanh toán đơn hàng.',
                emergencyAlert: 'Tài khoản đang bị tạm khóa quản trị do tranh chấp thanh toán. Không thực hiện giao dịch ghi nợ!',
                addresses: [
                    { address: '88 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM', isDefault: true }
                ],
                pets: [],
                orders: [
                    { id: 'ORD-8810', date: '10/09/2026', total: '1.250.000 đ', payment: 'Tranh chấp', status: 'Tạm giữ', statusClass: 'badge-warning' }
                ],
                bookings: [],
                complaints: []
            },
            'CUST-005': {
                id: 'CUST-005',
                name: 'Hoàng Minh Tuấn',
                phone: '0903112233',
                email: 'tuan.hoang@email.com',
                gender: 'Nam',
                dob: '05/06/1985',
                tier: 'GOLD',
                tierName: 'Vàng',
                tierBadgeClass: 'badge-tier-gold',
                points: 1100,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Thường đặt gửi Pet Hotel phòng VIP vào cuối tuần.',
                emergencyAlert: null,
                addresses: [
                    { address: '15 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-005',
                        name: 'Bé Max',
                        species: 'Chó',
                        breed: 'Golden Retriever',
                        weight: '28.0',
                        vaccine: 'Đầy đủ sổ tiêm dại và 7 bệnh',
                        alertNote: 'Thân thiện, ham ăn'
                    }
                ],
                orders: [
                    { id: 'ORD-8902', date: '22/09/2026', total: '850.000 đ', payment: 'Đã thanh toán', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                bookings: [
                    { id: 'AP-180', date: '20/09/2026 10:00', service: 'Khách sạn thú cưng Room VIP', staff: 'Lê Văn Nam', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                complaints: []
            },
            'CUST-007': {
                id: 'CUST-007',
                name: 'Vũ Đức Thắng',
                phone: '0977889900',
                email: 'thang.vu@email.com',
                gender: 'Nam',
                dob: '18/09/1982',
                tier: 'DIAMOND',
                tierName: 'Kim Cương',
                tierBadgeClass: 'badge-tier-diamond',
                points: 3420,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Khách hàng VIP Kim Cương. Thường xuyên sử dụng Pet Taxi đưa đón tận nơi.',
                emergencyAlert: 'Khách hàng VIP đang có vé khiếu nại dịch vụ (Mã: TK-015 - Bé cưng bị trầy nhẹ sau spa). Quản lý cần theo dõi sát sao!',
                addresses: [
                    { address: 'Khu biệt thự Chateau, Phú Mỹ Hưng, Quận 7, TP.HCM', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-007',
                        name: 'Bé Sam',
                        species: 'Chó',
                        breed: 'Samoyed',
                        weight: '22.5',
                        vaccine: 'Đầy đủ tiêm phòng',
                        alertNote: 'Lông dày, cần sấy khô kỹ'
                    },
                    {
                        id: 'PET-012',
                        name: 'Bé Corgi',
                        species: 'Chó',
                        breed: 'Corgi',
                        weight: '11.0',
                        vaccine: 'Đầy đủ tiêm phòng',
                        alertNote: 'Thân thiện'
                    },
                    {
                        id: 'PET-013',
                        name: 'Bé Mochi',
                        species: 'Chó',
                        breed: 'Phốc sóc',
                        weight: '2.8',
                        vaccine: 'Đầy đủ tiêm phòng',
                        alertNote: 'Bình thường'
                    }
                ],
                orders: [
                    { id: 'ORD-8930', date: '26/09/2026', total: '2.150.000 đ', payment: 'Đã thanh toán', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                bookings: [
                    { id: 'AP-210', date: '26/09/2026 15:30', service: 'Spa phục hồi da lông chuyên sâu', staff: 'Nguyễn Văn Hải', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                complaints: [
                    { id: 'TK-015', date: '27/09/2026 08:30', issue: 'Thú cưng bị trầy nhẹ sau spa', level: 'Cao', status: 'Đang xử lý', statusClass: 'badge-warning' }
                ]
            },
            'CUST-006': {
                id: 'CUST-006',
                name: 'Đỗ Thị Mai',
                phone: '0918445566',
                email: 'mai.dothi@email.com',
                gender: 'Nữ',
                dob: '24/04/1993',
                tier: 'SILVER',
                tierName: 'Bạc',
                tierBadgeClass: 'badge-tier-silver',
                points: 380,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Khách hàng thường xuyên đặt dịch vụ tắm sấy và tỉa lông cho bé Bơ.',
                emergencyAlert: null,
                addresses: [
                    { address: '280 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-006',
                        name: 'Bé Bơ',
                        species: 'Chó',
                        breed: 'Poodle',
                        weight: '3.6',
                        vaccine: 'Đầy đủ sổ tiêm định kỳ',
                        alertNote: 'Ngoan, dễ chăm sóc'
                    }
                ],
                orders: [
                    { id: 'ORD-8890', date: '21/09/2026', total: '380.000 đ', payment: 'Đã thanh toán', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                bookings: [
                    { id: 'AP-175', date: '21/09/2026 11:00', service: 'Tắm vệ sinh và cạo lông đệm chân', staff: 'Nguyễn Thị Hoa', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                complaints: []
            },
            'CUST-008': {
                id: 'CUST-008',
                name: 'Bùi Thu Trang',
                phone: '0938776655',
                email: 'trang.bui@email.com',
                gender: 'Nữ',
                dob: '10/12/1996',
                tier: 'BRONZE',
                tierName: 'Đồng',
                tierBadgeClass: 'badge-neutral',
                points: 80,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Khách hàng mới đăng ký tài khoản app, quan tâm các sản phẩm pate dinh dưỡng.',
                emergencyAlert: null,
                addresses: [
                    { address: '56 Hoàng Diệu, Phường 12, Quận 4, TP.HCM', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-008',
                        name: 'Bé Kem',
                        species: 'Mèo',
                        breed: 'Mèo Ba Tư',
                        weight: '4.1',
                        vaccine: 'Đã tiêm 3 mũi',
                        alertNote: 'Lông dài, dễ rụng'
                    }
                ],
                orders: [
                    { id: 'ORD-8865', date: '18/09/2026', total: '290.000 đ', payment: 'Đã thanh toán', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                bookings: [],
                complaints: []
            },
            'CUST-009': {
                id: 'CUST-009',
                name: 'Ngô Gia Bảo',
                phone: '0909123890',
                email: 'bao.ngo@email.com',
                gender: 'Nam',
                dob: '08/07/1991',
                tier: 'SILVER',
                tierName: 'Bạc',
                tierBadgeClass: 'badge-tier-silver',
                points: 510,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Khách hàng yêu cầu kiểm tra kỹ da và lông trước khi tắm sấy.',
                emergencyAlert: null,
                addresses: [
                    { address: '184 Nam Kỳ Khởi Nghĩa, Phường 6, Quận 3, TP.HCM', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-009',
                        name: 'Bé Shin',
                        species: 'Chó',
                        breed: 'Shiba Inu',
                        weight: '9.8',
                        vaccine: 'Đầy đủ',
                        alertNote: 'Năng động, hơi bướng'
                    }
                ],
                orders: [
                    { id: 'ORD-8850', date: '16/09/2026', total: '620.000 đ', payment: 'Đã thanh toán', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                bookings: [
                    { id: 'AP-160', date: '15/09/2026 14:00', service: 'Combo tắm sấy và sục ozone', staff: 'Trần Hoàng', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                complaints: []
            },
            'CUST-010': {
                id: 'CUST-010',
                name: 'Đặng Thùy Linh',
                phone: '0945678123',
                email: 'linh.dang@email.com',
                gender: 'Nữ',
                dob: '30/03/1994',
                tier: 'GOLD',
                tierName: 'Vàng',
                tierBadgeClass: 'badge-tier-gold',
                points: 950,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Khách hàng thân thiết, thường tích điểm đổi quà phụ kiện cho bé Mầm.',
                emergencyAlert: null,
                addresses: [
                    { address: '72 Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP.HCM', isDefault: true }
                ],
                pets: [
                    {
                        id: 'PET-010',
                        name: 'Bé Mầm',
                        species: 'Chó',
                        breed: 'Pug',
                        weight: '7.5',
                        vaccine: 'Đầy đủ sổ tiêm',
                        alertNote: 'Dễ thở dốc khi trời nóng'
                    }
                ],
                orders: [
                    { id: 'ORD-8915', date: '24/09/2026', total: '780.000 đ', payment: 'Đã thanh toán', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                bookings: [
                    { id: 'AP-192', date: '23/09/2026 09:30', service: 'Cắt tỉa tạo kiểu theo yêu cầu', staff: 'Nguyễn Văn Hải', status: 'Hoàn tất', statusClass: 'badge-success' }
                ],
                complaints: []
            }
        };

        // Hàm định dạng ô Thú cưng trên bảng theo Phương án 1 (hiển thị bé chính + số lượng bé phụ)
        function formatCustomerPetsCell(pets) {
            if (!pets || pets.length === 0) {
                return `<span class="customer-pet-sub">Chưa có thú cưng</span>`;
            }
            if (pets.length === 1) {
                const p = pets[0];
                const breedText = p.breed || (p.species === 'CAT' || p.species === 'Mèo' ? 'Mèo' : 'Chó');
                return `
                    <div class="customer-pet-cell">${p.name}</div>
                    <div class="customer-pet-sub">${breedText}</div>
                `;
            }
            const mainPet = pets[0];
            const moreCount = pets.length - 1;
            const allBreeds = pets.map(p => p.breed || (p.species === 'CAT' || p.species === 'Mèo' ? 'Mèo' : 'Chó')).filter(Boolean).join(', ');
            const fullTooltip = pets.map(p => `${p.name} (${p.breed || p.species})`).join(', ');

            return `
                <div class="customer-pet-cell">${mainPet.name} <span class="customer-pet-more">(+${moreCount} bé)</span></div>
                <div class="customer-pet-sub" title="${fullTooltip}">${allBreeds}</div>
            `;
        }

        // State tạm cho danh sách địa chỉ đang chỉnh sửa trong modal
        let currentEditingAddresses = [];
        let currentEditingPetCustId = null;

        // 2. Chuyển đổi giữa 3 Sub-tabs khi bấm nút trên Header Bar
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(custName) {
            if (!deepBreadcrumbEl) return;
            if (custName) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${custName}</span>
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

            // Khi ở tab Hồ sơ, luôn hiển thị đường dẫn tinh gọn / [Tên khách hàng]
            if (targetSubtab === 'tab-profile') {
                const currentName = sessionStorage.getItem('pawpal_admin_customer_name') || 
                                    document.getElementById('drawerCustomerName')?.textContent?.trim() || 
                                    'Nguyễn Văn An';
                updateBreadcrumb(currentName);
            } else {
                updateBreadcrumb(null);
            }

            sessionStorage.setItem('pawpal_admin_customer_subtab', targetSubtab);
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

        // 3. Chuyển đổi giữa 5 tabs con trong Drawer Hồ sơ
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        function switchDrawerTab(targetPanelId) {
            drawerTabs.forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-drawertab') === targetPanelId);
            });

            drawerPanels.forEach(panel => {
                panel.classList.toggle('active', panel.id === targetPanelId);
            });

            sessionStorage.setItem('pawpal_admin_customer_drawertab', targetPanelId);
            if (window.lucide) lucide.createIcons();
        }

        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanelId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetPanelId);
            });
        });

        // ====================================================================
        // HÀM RENDER ĐẦY ĐỦ 5 TAB CON TRONG DRAWER THEO TỪNG KHÁCH HÀNG
        // ====================================================================
        function renderDrawerCustomerProfile(custId) {
            let data = customerDatabase[custId];
            if (!data) {
                // Tạo record mặc định nếu là khách mới
                data = {
                    id: custId,
                    name: 'Khách hàng ' + custId,
                    phone: '0900000000',
                    email: 'khachhang@email.com',
                    gender: 'Nam',
                    dob: '01/01/1990',
                    tier: 'BRONZE',
                    tierName: 'Đồng',
                    tierBadgeClass: 'badge-neutral',
                    points: 0,
                    status: 'ACTIVE',
                    authStatus: 'Đã kích hoạt',
                    note: 'Chưa có ghi chú đặc biệt.',
                    emergencyAlert: null,
                    addresses: [{ address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }],
                    pets: [],
                    orders: [],
                    bookings: [],
                    complaints: []
                };
                customerDatabase[custId] = data;
            }

            // Headline
            const headlineName = document.getElementById('drawerCustomerName');
            const headlineTier = document.getElementById('drawerCustomerTier');
            const headlinePhoneBadge = document.querySelector('.drawer-user-headline .badge-success');
            if (headlineName) headlineName.textContent = data.name;
            if (headlineTier) {
                headlineTier.textContent = data.tierName;
                headlineTier.className = `admin-badge ${data.tierBadgeClass}`;
            }
            if (headlinePhoneBadge) headlinePhoneBadge.textContent = data.phone;

            // Nút thao tác một chạm (Gọi điện, Zalo)
            const btnCall = document.querySelector('.drawer-action-buttons a[href^="tel:"]');
            const btnZalo = document.querySelector('.drawer-action-buttons a[href*="zalo.me"]');
            if (btnCall) btnCall.href = `tel:${data.phone}`;
            if (btnZalo) btnZalo.href = `https://zalo.me/${data.phone}`;

            // Banner cảnh báo khẩn cấp
            const banner = document.getElementById('custEmergencyBanner');
            const alertText = document.getElementById('custEmergencyAlertText');
            if (data.emergencyAlert) {
                if (banner) banner.style.display = 'flex';
                if (alertText) alertText.textContent = data.emergencyAlert;
            } else {
                if (banner) banner.style.display = 'none';
            }

            // Tab 1: Cá nhân
            if (document.getElementById('profileValCustId')) document.getElementById('profileValCustId').textContent = data.id;
            if (document.getElementById('profileValFullName')) document.getElementById('profileValFullName').textContent = data.name;
            if (document.getElementById('profileValPhone')) document.getElementById('profileValPhone').textContent = data.phone;
            if (document.getElementById('profileValEmail')) document.getElementById('profileValEmail').textContent = data.email;
            if (document.getElementById('profileValGender')) document.getElementById('profileValGender').textContent = data.gender;
            if (document.getElementById('profileValDob')) document.getElementById('profileValDob').textContent = data.dob || 'Chưa cập nhật';
            if (document.getElementById('drawerCustNote')) document.getElementById('drawerCustNote').value = data.note || '';

            // Sổ địa chỉ
            renderDrawerAddresses(custId);

            // Tab 2: Thú cưng
            renderDrawerPets(custId);

            // Tab 3: Đơn hàng
            renderDrawerOrders(custId);

            // Tab 4: Lịch hẹn
            renderDrawerBookings(custId);

            // Tab 5: Khiếu nại
            renderDrawerComplaints(custId);

            // Cập nhật số đếm badge đỏ trên các tabs con
            const badgeOrders = document.getElementById('badgeCountOrders');
            const badgeBookings = document.getElementById('badgeCountBookings');
            const badgeComplaints = document.getElementById('badgeCountComplaints');
            if (badgeOrders) {
                badgeOrders.textContent = data.orders.length;
                badgeOrders.style.display = data.orders.length > 0 ? 'inline-flex' : 'none';
            }
            if (badgeBookings) {
                badgeBookings.textContent = data.bookings.length;
                badgeBookings.style.display = data.bookings.length > 0 ? 'inline-flex' : 'none';
            }
            if (badgeComplaints) {
                badgeComplaints.textContent = data.complaints.length;
                badgeComplaints.style.display = data.complaints.length > 0 ? 'inline-flex' : 'none';
            }

            updateBreadcrumb(data.name);
        }

        // Render Sổ địa chỉ
        function renderDrawerAddresses(custId) {
            const container = document.getElementById('profileValAddressContainer');
            if (!container) return;
            const list = customerDatabase[custId]?.addresses || [
                { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true }
            ];

            container.innerHTML = list.map(item => `
                <div class="drawer-address-row" style="${!item.isDefault ? 'color: var(--text-muted);' : ''}">
                    <span class="admin-badge ${item.isDefault ? 'badge-success' : 'badge-neutral'}" style="font-size: 11px; padding: 2px 7px;">
                        ${item.isDefault ? 'Mặc định' : 'Phụ'}
                    </span>
                    <span>${item.address}</span>
                </div>
            `).join('');
        }

        // Render Danh sách thú cưng kèm NÚT SỬA và XÓA (Thuần text, đúng Forest Palette)
        function renderDrawerPets(custId) {
            const container = document.getElementById('petCardsListContainer');
            if (!container) return;
            const pets = customerDatabase[custId]?.pets || [];

            if (pets.length === 0) {
                container.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13.5px;">
                        Khách hàng chưa có bé cưng nào trong danh sách theo dõi. Bấm <strong>+ Thêm bé cưng</strong> để tạo mới.
                    </div>
                `;
                return;
            }

            container.innerHTML = pets.map((pet, idx) => `
                <div class="pet-detail-card" data-pet-id="${pet.id || ('PET-' + idx)}">
                    <div class="pet-card-head">
                        <div class="pet-card-head-left">
                            <span class="pet-card-name">${pet.name} (Mã: ${pet.id || ('PET-' + (idx+1))})</span>
                            <span class="admin-badge ${pet.alertNote && pet.alertNote !== 'Bình thường' ? 'badge-warning' : 'badge-neutral'}">
                                ${pet.alertNote || 'Bình thường'}
                            </span>
                        </div>
                        <div class="pet-card-actions">
                            <button type="button" class="btn-pet-action btn-pet-edit" data-cust-id="${custId}" data-pet-index="${idx}">Sửa</button>
                            <button type="button" class="btn-pet-action btn-pet-delete" data-cust-id="${custId}" data-pet-index="${idx}">Xóa</button>
                        </div>
                    </div>
                    <div class="pet-card-body">
                        <div><strong>Loài:</strong> ${pet.species} ${pet.breed ? '(' + pet.breed + ')' : ''}</div>
                        <div><strong>Cân nặng:</strong> ${pet.weight ? pet.weight + ' kg' : 'Chưa cân'}</div>
                        <div><strong>Tiền sử tiêm chủng:</strong> ${pet.vaccine || 'Chưa cập nhật'}</div>
                        <div><strong>Tính cách / Lưu ý:</strong> ${pet.alertNote || 'Bình thường'}</div>
                    </div>
                </div>
            `).join('');

            // Gán sự kiện Sửa cho từng thẻ Pet
            container.querySelectorAll('.btn-pet-edit').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cId = btn.getAttribute('data-cust-id');
                    const pIdx = parseInt(btn.getAttribute('data-pet-index'), 10);
                    openEditPetModal(cId, pIdx);
                });
            });

            // Gán sự kiện Xóa cho từng thẻ Pet
            container.querySelectorAll('.btn-pet-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cId = btn.getAttribute('data-cust-id');
                    const pIdx = parseInt(btn.getAttribute('data-pet-index'), 10);
                    const pet = customerDatabase[cId]?.pets[pIdx];
                    if (confirm(`Bạn có chắc chắn muốn xóa bé cưng ${pet?.name || ''} khỏi hồ sơ của khách?`)) {
                        customerDatabase[cId].pets.splice(pIdx, 1);
                        renderDrawerPets(cId);
                        alert('Đã xóa bé cưng khỏi hồ sơ thành công!');
                    }
                });
            });
        }

        // Render Tab Đơn hàng
        function renderDrawerOrders(custId) {
            const tbody = document.getElementById('drawerOrdersTbody');
            if (!tbody) return;
            const orders = customerDatabase[custId]?.orders || [];

            if (orders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch sử mua hàng.</td></tr>`;
                return;
            }

            tbody.innerHTML = orders.map(ord => `
                <tr>
                    <td><strong>${ord.id}</strong></td>
                    <td>${ord.date}</td>
                    <td>${ord.total}</td>
                    <td><span class="admin-badge badge-success">${ord.payment}</span></td>
                    <td><span class="admin-badge ${ord.statusClass}">${ord.status}</span></td>
                    <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-order-action" data-order-id="${ord.id}">Xem chi tiết đơn</button></td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.btn-view-order-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const ordId = btn.getAttribute('data-order-id');
                    alert(`Mở thông tin chi tiết đơn hàng ${ordId} tại phân hệ Bán hàng!`);
                    const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Bán hàng"]');
                    if (menuBtn) menuBtn.click();
                });
            });
        }

        // Render Tab Lịch hẹn
        function renderDrawerBookings(custId) {
            const tbody = document.getElementById('drawerBookingsTbody');
            if (!tbody) return;
            const bookings = customerDatabase[custId]?.bookings || [];

            if (bookings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch hẹn dịch vụ nào.</td></tr>`;
                return;
            }

            tbody.innerHTML = bookings.map(b => `
                <tr>
                    <td><strong>${b.id}</strong></td>
                    <td>${b.date}</td>
                    <td>${b.service}</td>
                    <td>${b.staff}</td>
                    <td><span class="admin-badge ${b.statusClass}">${b.status}</span></td>
                    <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-booking-action" data-booking-id="${b.id}">Xem nhật ký</button></td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.btn-view-booking-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const bId = btn.getAttribute('data-booking-id');
                    alert(`Mở nhật ký quy trình chăm sóc lịch hẹn ${bId} tại phân hệ Dịch vụ!`);
                    const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
                    if (menuBtn) menuBtn.click();
                });
            });
        }

        // Render Tab Khiếu nại
        function renderDrawerComplaints(custId) {
            const tbody = document.getElementById('drawerComplaintsTbody');
            if (!tbody) return;
            const complaints = customerDatabase[custId]?.complaints || [];

            if (complaints.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng không có phản ánh hay khiếu nại nào.</td></tr>`;
                return;
            }

            tbody.innerHTML = complaints.map(c => `
                <tr>
                    <td><strong>${c.id}</strong></td>
                    <td>${c.date}</td>
                    <td>${c.issue}</td>
                    <td><span class="admin-badge badge-danger">${c.level}</span></td>
                    <td><span class="admin-badge ${c.statusClass}">${c.status}</span></td>
                    <td><button type="button" class="admin-btn admin-btn-primary btn-sm btn-view-ticket-action" data-ticket-id="${c.id}">Mở Ticket xử lý</button></td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.btn-view-ticket-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tId = btn.getAttribute('data-ticket-id');
                    alert(`Chuyển đến xử lý Ticket khiếu nại ${tId} tại phân hệ Khiếu nại!`);
                    const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
                    if (menuBtn) menuBtn.click();
                });
            });
        }

        // 4. Mở Hồ sơ khi click vào Họ tên hoặc nút Xem trong dropdown
        document.querySelectorAll('.btn-open-profile-drawer').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const custId = trigger.getAttribute('data-id');

                // Đóng tất cả dropdown nếu đang mở
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));

                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                const custName = customerDatabase[custId]?.name || custId;
                sessionStorage.setItem('pawpal_admin_customer_name', custName);

                // Render toàn bộ hồ sơ khách hàng
                renderDrawerCustomerProfile(custId);

                // Kích hoạt sub-tab Hồ sơ trên Header Bar
                switchSubtab('tab-profile');
            });
        });

        // 5. Đóng/Mở menu tác vụ 3 chấm (•••) — dùng position:fixed để thoát khỏi overflow scroll container
        function closeAllDropdowns() {
            document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
                m.classList.remove('show');
                m.style.cssText = '';
            });
            document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
        }

        function positionAndShowDropdown(btn) {
            const menu = btn.nextElementSibling;
            if (!menu || !menu.classList.contains('action-dropdown-menu')) return;

            const wasShown = menu.classList.contains('show');
            closeAllDropdowns();

            if (!wasShown) {
                const rect = btn.getBoundingClientRect();
                const menuWidth = 175;
                const top = rect.bottom + 4;
                let left = rect.right - menuWidth;
                if (left < 8) left = 8;

                menu.style.position = 'fixed';
                menu.style.top = top + 'px';
                menu.style.left = left + 'px';
                menu.style.zIndex = '9999';
                menu.classList.add('show');
                btn.classList.add('active');
            }
        }

        // Event delegation cho toàn bộ bảng (bao gồm cả dòng mới thêm vào)
        const customerTable = document.getElementById('customerDataTable');
        if (customerTable) {
            customerTable.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-action-more');
                if (btn) {
                    e.stopPropagation();
                    positionAndShowDropdown(btn);
                }
            });
        }

        // Bấm ra ngoài tự động đóng menu 3 chấm
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-action-more') && !e.target.closest('.action-dropdown-menu')) {
                closeAllDropdowns();
            }
        });

        // 6. Modal Tiếp nhận tại quầy (Quick Add)
        const modalAdd = document.getElementById('modalAddCustomer');
        const btnOpenAdd = document.getElementById('btnOpenAddCustomerModal');
        const btnCloseAdd = document.getElementById('btnCloseAddCustomer');
        const btnCancelAdd = document.getElementById('btnCancelAddCustomer');
        const formAdd = document.getElementById('formAddCustomerQuick');

        if (btnOpenAdd && modalAdd) {
            btnOpenAdd.addEventListener('click', () => {
                modalAdd.style.display = 'flex';
            });
        }
        function closeAddModal() {
            if (modalAdd) modalAdd.style.display = 'none';
        }
        if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddModal);
        if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);
        if (formAdd) {
            formAdd.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('quickAddName')?.value || 'Khách vãng lai';
                const phone = document.getElementById('quickAddPhone')?.value || '';
                const petName = document.getElementById('quickAddPetName')?.value || '';
                const petSpecies = document.getElementById('quickAddPetSpecies')?.value || 'Chó';
                const petWeight = document.getElementById('quickAddPetWeight')?.value || '';

                const newId = 'CUST-' + String(Object.keys(customerDatabase).length + 1).padStart(3, '0');
                customerDatabase[newId] = {
                    id: newId,
                    name: name,
                    phone: phone,
                    email: 'Chưa cập nhật',
                    gender: 'Khác',
                    dob: '01/01/1990',
                    tier: 'BRONZE',
                    tierName: 'Đồng',
                    tierBadgeClass: 'badge-neutral',
                    points: 0,
                    status: 'TEMP',
                    authStatus: 'Tạm thời tại quầy',
                    note: 'Khách tiếp nhận nhanh tại quầy.',
                    emergencyAlert: null,
                    addresses: [{ address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }],
                    pets: petName ? [{
                        id: 'PET-' + newId,
                        name: petName,
                        species: petSpecies === 'CAT' ? 'Mèo' : 'Chó',
                        breed: 'Chưa cập nhật',
                        weight: petWeight,
                        vaccine: 'Chưa cập nhật',
                        alertNote: 'Bình thường'
                    }] : [],
                    orders: [],
                    bookings: [],
                    complaints: []
                };

                // Thêm 1 dòng mới vào đầu bảng
                const tbody = document.getElementById('customerTableTbody');
                if (tbody) {
                    const petHtml = `<td>${formatCustomerPetsCell(customerDatabase[newId].pets)}</td>`;
                    const newTr = document.createElement('tr');
                    newTr.innerHTML = `
                        <td><strong>${newId}</strong></td>
                        <td>
                            <div class="user-name-cell">
                                <a href="javascript:void(0)" class="user-name-link btn-open-profile-drawer" data-id="${newId}">${name}</a>
                            </div>
                            <div class="user-sub-cell">Khách tiếp nhận tại quầy</div>
                        </td>
                        <td><strong>${phone}</strong></td>
                        ${petHtml}
                        <td>
                            <span class="admin-badge badge-neutral">Đồng</span>
                            <span class="points-val">0 pts</span>
                        </td>
                        <td><span class="admin-badge badge-neutral">Bình thường</span></td>
                        <td><span class="admin-badge badge-warning">Tạm thời</span></td>
                        <td style="text-align: center;">
                            <div class="action-dropdown-wrapper">
                                <button type="button" class="btn-action-more" data-id="${newId}" title="Tác vụ">•••</button>
                                <div class="action-dropdown-menu">
                                    <button type="button" class="dropdown-item btn-open-profile-drawer" data-id="${newId}">Xem hồ sơ 360°</button>
                                    <button type="button" class="dropdown-item btn-edit-user-table" data-id="${newId}">Sửa hồ sơ</button>
                                    <button type="button" class="dropdown-item text-danger btn-lock-user" data-id="${newId}">Khóa tài khoản</button>
                                </div>
                            </div>
                        </td>
                    `;
                    tbody.prepend(newTr);

                    // Gán lại sự kiện cho dòng mới
                    newTr.querySelector('.btn-open-profile-drawer')?.addEventListener('click', () => {
                        sessionStorage.setItem('pawpal_admin_customer_id', newId);
                        sessionStorage.setItem('pawpal_admin_customer_name', name);
                        renderDrawerCustomerProfile(newId);
                        switchSubtab('tab-profile');
                    });
                }

                alert(`Đã tạo thành công tài khoản tạm ${newId} cho khách hàng ${name} tại quầy!`);
                formAdd.reset();
                closeAddModal();
            });
        }

        // 7. Modal Điều chỉnh Pawpoint (Hỗ trợ cả CỘNG ĐIỂM và TRỪ ĐIỂM, cập nhật tức thì vào bảng)
        const modalAdjust = document.getElementById('modalAdjustPoints');
        const btnOpenAdjust = document.getElementById('btnOpenAdjustPointsModal');
        const btnCloseAdjust = document.getElementById('btnCloseAdjustPoints');
        const btnCancelAdjust = document.getElementById('btnCancelAdjustPoints');
        const formAdjust = document.getElementById('formAdjustPoints');

        if (btnOpenAdjust && modalAdjust) {
            btnOpenAdjust.addEventListener('click', () => {
                modalAdjust.style.display = 'flex';
            });
        }
        function closeAdjustModal() {
            if (modalAdjust) modalAdjust.style.display = 'none';
        }
        if (btnCloseAdjust) btnCloseAdjust.addEventListener('click', closeAdjustModal);
        if (btnCancelAdjust) btnCancelAdjust.addEventListener('click', closeAdjustModal);
        if (formAdjust) {
            formAdjust.addEventListener('submit', (e) => {
                e.preventDefault();
                const phone = document.getElementById('adjustPhone')?.value || '';
                const type = document.getElementById('adjustType')?.value || 'ADD';
                const pts = parseInt(document.getElementById('adjustPointsVal')?.value || '0', 10);
                const reason = document.getElementById('adjustReason')?.value || 'Điều chỉnh điểm';

                if (pts <= 0) {
                    alert('Vui lòng nhập số điểm lớn hơn 0!');
                    return;
                }

                // Tìm khách hàng có số điện thoại này
                let matchedCust = Object.values(customerDatabase).find(c => c.phone === phone);
                const custName = matchedCust ? matchedCust.name : 'Khách hàng';
                const currentBalance = matchedCust ? matchedCust.points : 500;
                const newBalance = type === 'ADD' ? (currentBalance + pts) : Math.max(0, currentBalance - pts);
                if (matchedCust) matchedCust.points = newBalance;

                // Thêm dòng lịch sử vào bảng Tab Pawpoint
                const histTbody = document.getElementById('pawpointHistoryTbody');
                if (histTbody) {
                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    const sign = type === 'ADD' ? '+' : '-';
                    const colorClass = type === 'ADD' ? 'text-success' : 'text-danger';

                    const newHistRow = document.createElement('tr');
                    newHistRow.innerHTML = `
                        <td>${timeStr}</td>
                        <td>${custName} (${phone})</td>
                        <td><strong class="${colorClass}">${sign}${pts} pts</strong></td>
                        <td>${newBalance.toLocaleString('vi-VN')} pts</td>
                        <td>${reason}</td>
                    `;
                    histTbody.prepend(newHistRow);
                }

                alert(`Đã ${type === 'ADD' ? 'cộng' : 'trừ'} ${pts} Pawpoint cho khách hàng ${custName} thành công! Số dư mới: ${newBalance} pts`);
                formAdjust.reset();
                closeAdjustModal();
            });
        }

        // 8. Tác vụ Khóa / Mở khóa tài khoản từ menu 3 chấm
        document.querySelectorAll('.btn-lock-user, .btn-unlock-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('tr');
                const badge = row?.querySelector('.admin-badge.badge-success, .admin-badge.badge-danger, .admin-badge.badge-warning');
                const isLock = btn.classList.contains('btn-lock-user');
                const custId = btn.getAttribute('data-id');

                if (isLock && badge) {
                    row.classList.add('row-locked');
                    badge.className = 'admin-badge badge-danger';
                    badge.textContent = 'Bị khóa';
                    btn.className = 'dropdown-item text-success btn-unlock-user';
                    btn.innerHTML = `<span>Mở khóa tài khoản</span>`;
                    if (customerDatabase[custId]) customerDatabase[custId].status = 'LOCKED';
                    alert('Đã khóa tài khoản khách hàng!');
                } else if (!isLock && badge) {
                    row.classList.remove('row-locked');
                    badge.className = 'admin-badge badge-success';
                    badge.textContent = 'Đang hoạt động';
                    btn.className = 'dropdown-item text-danger btn-lock-user';
                    btn.innerHTML = `<span>Khóa tài khoản</span>`;
                    if (customerDatabase[custId]) customerDatabase[custId].status = 'ACTIVE';
                    alert('Đã mở khóa tài khoản khách hàng!');
                }

                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
                if (window.lucide) lucide.createIcons();
            });
        });

        // 9. QUẢN LÝ SỔ ĐỊA CHỈ TRONG MODAL 3
        function updateAddressValuesFromDOM() {
            const container = document.getElementById('editCustAddressList');
            if (!container) return;
            const cards = container.querySelectorAll('.address-row-card');
            cards.forEach((card, idx) => {
                if (currentEditingAddresses[idx]) {
                    const input = card.querySelector('.address-input-val');
                    if (input) currentEditingAddresses[idx].address = input.value;
                }
            });
        }

        function renderModalAddressList() {
            const container = document.getElementById('editCustAddressList');
            if (!container) return;

            // Đảm bảo luôn có ít nhất 1 địa chỉ được đánh dấu mặc định
            if (currentEditingAddresses.length > 0 && !currentEditingAddresses.some(a => a.isDefault)) {
                currentEditingAddresses[0].isDefault = true;
            }

            container.innerHTML = currentEditingAddresses.map((item, index) => `
                <div class="address-row-card ${item.isDefault ? 'is-default' : ''}" data-index="${index}">
                    <div class="address-row-meta">
                        <label class="address-radio-label">
                            <input type="radio" name="default_address_radio" value="${index}" ${item.isDefault ? 'checked' : ''}>
                            <span class="default-badge ${item.isDefault ? 'active' : ''}">
                                ${item.isDefault ? 'Địa chỉ mặc định' : 'Đặt làm mặc định'}
                            </span>
                        </label>
                        ${currentEditingAddresses.length > 1 && !item.isDefault ? `
                            <button type="button" class="btn-remove-address" data-index="${index}">Xóa</button>
                        ` : ''}
                    </div>
                    <input type="text" class="admin-input address-input-val" value="${item.address}" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP..." required>
                </div>
            `).join('');

            // Sự kiện chọn radio làm địa chỉ mặc định
            container.querySelectorAll('input[name="default_address_radio"]').forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const chosenIdx = parseInt(e.target.value, 10);
                    updateAddressValuesFromDOM();
                    currentEditingAddresses.forEach((addr, idx) => {
                        addr.isDefault = (idx === chosenIdx);
                    });
                    renderModalAddressList();
                });
            });

            // Sự kiện xóa địa chỉ
            container.querySelectorAll('.btn-remove-address').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const delIdx = parseInt(btn.getAttribute('data-index'), 10);
                    updateAddressValuesFromDOM();
                    currentEditingAddresses.splice(delIdx, 1);
                    if (!currentEditingAddresses.some(a => a.isDefault) && currentEditingAddresses.length > 0) {
                        currentEditingAddresses[0].isDefault = true;
                    }
                    renderModalAddressList();
                });
            });
        }

        // Bắt sự kiện nút Thêm địa chỉ trong modal
        const btnAddAddressItem = document.getElementById('btnAddAddressItem');
        if (btnAddAddressItem) {
            btnAddAddressItem.addEventListener('click', () => {
                updateAddressValuesFromDOM();
                const isFirst = currentEditingAddresses.length === 0;
                currentEditingAddresses.push({
                    address: '',
                    isDefault: isFirst
                });
                renderModalAddressList();
                setTimeout(() => {
                    const inputs = document.querySelectorAll('#editCustAddressList .address-input-val');
                    if (inputs.length > 0) {
                        inputs[inputs.length - 1].focus();
                    }
                }, 50);
            });
        }

        // 10. MODAL 3: CHỈNH SỬA HỒ SƠ KHÁCH HÀNG (HỌ TÊN, SĐT, EMAIL, GIỚI TÍNH, NGÀY SINH, HẠNG THÀNH VIÊN, ĐỊA CHỈ)
        const modalEdit = document.getElementById('modalEditCustomer');
        const btnOpenEdit = document.getElementById('btnOpenEditProfileModal');
        const btnCloseEdit = document.getElementById('btnCloseEditCustomer');
        const btnCancelEdit = document.getElementById('btnCancelEditCustomer');
        const formEdit = document.getElementById('formEditCustomer');

        function openEditCustomerModal(custId) {
            if (!modalEdit) return;
            const currentId = custId || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const data = customerDatabase[currentId] || {};

            if (document.getElementById('editCustId')) document.getElementById('editCustId').value = currentId;
            if (document.getElementById('editCustFullName')) document.getElementById('editCustFullName').value = data.name || '';
            if (document.getElementById('editCustPhone')) document.getElementById('editCustPhone').value = data.phone || '';
            if (document.getElementById('editCustEmail')) document.getElementById('editCustEmail').value = data.email || '';
            if (document.getElementById('editCustGender')) document.getElementById('editCustGender').value = data.gender || 'Nam';
            if (document.getElementById('editCustTier')) document.getElementById('editCustTier').value = data.tier || 'GOLD';
            
            const dob = data.dob || '';
            if (dob && dob.includes('/')) {
                const parts = dob.split('/');
                if (parts.length === 3 && document.getElementById('editCustDob')) {
                    document.getElementById('editCustDob').value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            // Nạp danh sách địa chỉ cho khách hàng
            const existingAddresses = data.addresses || [
                { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true }
            ];
            currentEditingAddresses = JSON.parse(JSON.stringify(existingAddresses));
            renderModalAddressList();

            modalEdit.style.display = 'flex';
        }

        function closeEditModal() {
            if (modalEdit) modalEdit.style.display = 'none';
        }

        if (btnOpenEdit) {
            btnOpenEdit.addEventListener('click', () => openEditCustomerModal());
        }
        if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
        if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

        // Nút Sửa hồ sơ từ menu 3 chấm ngoài bảng danh sách
        document.querySelectorAll('.btn-edit-user-table').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const custId = btn.getAttribute('data-id');
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
                openEditCustomerModal(custId);
            });
        });

        if (formEdit) {
            formEdit.addEventListener('submit', (e) => {
                e.preventDefault();
                const custId = document.getElementById('editCustId')?.value || 'CUST-001';
                const newName = document.getElementById('editCustFullName')?.value || '';
                const newPhone = document.getElementById('editCustPhone')?.value || '';
                const newEmail = document.getElementById('editCustEmail')?.value || '';
                const newGender = document.getElementById('editCustGender')?.value || 'Nam';
                const newTier = document.getElementById('editCustTier')?.value || 'GOLD';
                const newDobRaw = document.getElementById('editCustDob')?.value || '';

                // Cập nhật giá trị địa chỉ từ DOM
                updateAddressValuesFromDOM();
                const validAddresses = currentEditingAddresses.filter(a => a.address.trim() !== '');
                if (validAddresses.length === 0) {
                    alert('Vui lòng nhập ít nhất một địa chỉ nhận hàng!');
                    return;
                }
                if (!validAddresses.some(a => a.isDefault)) {
                    validAddresses[0].isDefault = true;
                }

                let formattedDob = newDobRaw;
                if (newDobRaw && newDobRaw.includes('-')) {
                    const p = newDobRaw.split('-');
                    formattedDob = `${p[2]}/${p[1]}/${p[0]}`;
                }

                // Map tên và class của Hạng thẻ
                const tierMap = {
                    'BRONZE': { name: 'Đồng', badgeClass: 'badge-neutral' },
                    'SILVER': { name: 'Bạc', badgeClass: 'badge-tier-silver' },
                    'GOLD': { name: 'Vàng', badgeClass: 'badge-tier-gold' },
                    'DIAMOND': { name: 'Kim Cương', badgeClass: 'badge-tier-diamond' }
                };

                // Cập nhật vào Database
                if (!customerDatabase[custId]) customerDatabase[custId] = {};
                customerDatabase[custId].name = newName;
                customerDatabase[custId].phone = newPhone;
                customerDatabase[custId].email = newEmail;
                customerDatabase[custId].gender = newGender;
                customerDatabase[custId].dob = formattedDob;
                customerDatabase[custId].tier = newTier;
                customerDatabase[custId].tierName = tierMap[newTier].name;
                customerDatabase[custId].tierBadgeClass = tierMap[newTier].badgeClass;
                customerDatabase[custId].addresses = validAddresses;

                // Cập nhật hiển thị Drawer Hồ sơ
                renderDrawerCustomerProfile(custId);

                // Cập nhật lên dòng dữ liệu trong bảng danh sách
                document.querySelectorAll('#customerTableTbody tr').forEach(row => {
                    const idCell = row.querySelector('td:first-child')?.textContent?.trim();
                    if (idCell === custId) {
                        const link = row.querySelector('.user-name-link');
                        if (link) link.textContent = newName;
                        const sub = row.querySelector('.user-sub-cell');
                        if (sub) sub.textContent = newEmail;
                        const phoneCell = row.querySelectorAll('td')[2]?.querySelector('strong');
                        if (phoneCell) phoneCell.textContent = newPhone;
                        const tierBadge = row.querySelector('.points-val')?.parentElement?.querySelector('.admin-badge') || row.querySelectorAll('td')[4]?.querySelector('.admin-badge');
                        if (tierBadge) {
                            tierBadge.textContent = tierMap[newTier].name;
                            tierBadge.className = `admin-badge ${tierMap[newTier].badgeClass}`;
                        }
                    }
                });

                alert(`Đã cập nhật thành công hồ sơ của khách hàng ${newName}!`);
                closeEditModal();
            });
        }

        // 11. MODAL 4: THÊM THÚ CƯNG MỚI (ADD PET)
        const modalAddPet = document.getElementById('modalAddPet');
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        const btnCloseAddPet = document.getElementById('btnCloseAddPet');
        const btnCancelAddPet = document.getElementById('btnCancelAddPet');
        const formAddPet = document.getElementById('formAddPet');

        if (btnOpenAddPet && modalAddPet) {
            btnOpenAddPet.addEventListener('click', () => {
                modalAddPet.style.display = 'flex';
            });
        }
        function closeAddPetModal() {
            if (modalAddPet) modalAddPet.style.display = 'none';
        }
        if (btnCloseAddPet) btnCloseAddPet.addEventListener('click', closeAddPetModal);
        if (btnCancelAddPet) btnCancelAddPet.addEventListener('click', closeAddPetModal);

        if (formAddPet) {
            formAddPet.addEventListener('submit', (e) => {
                e.preventDefault();
                const petName = document.getElementById('addPetName')?.value || 'Bé cưng';
                const species = document.getElementById('addPetSpecies')?.value || 'Chó';
                const breed = document.getElementById('addPetBreed')?.value || '';
                const weight = document.getElementById('addPetWeight')?.value || '';
                const vaccine = document.getElementById('addPetVaccine')?.value || 'Chưa cập nhật';
                const alertNote = document.getElementById('addPetAlert')?.value || 'Bình thường';

                const currentCustId = document.getElementById('profileValCustId')?.textContent || 'CUST-001';
                if (!customerDatabase[currentCustId]) {
                    customerDatabase[currentCustId] = { pets: [] };
                }
                if (!customerDatabase[currentCustId].pets) {
                    customerDatabase[currentCustId].pets = [];
                }

                const newPetId = 'PET-' + String(customerDatabase[currentCustId].pets.length + 1).padStart(3, '0');
                customerDatabase[currentCustId].pets.unshift({
                    id: newPetId,
                    name: petName,
                    species: species,
                    breed: breed,
                    weight: weight,
                    vaccine: vaccine,
                    alertNote: alertNote
                });

                renderDrawerPets(currentCustId);

                // Cập nhật lại cột thú cưng trên bảng danh sách
                document.querySelectorAll('#customerTableTbody tr').forEach(row => {
                    const idCell = row.querySelector('td:first-child')?.textContent?.trim();
                    if (idCell === currentCustId) {
                        const petCell = row.querySelectorAll('td')[3];
                        if (petCell) {
                            petCell.innerHTML = formatCustomerPetsCell(customerDatabase[currentCustId]?.pets);
                        }
                    }
                });

                alert(`Đã thêm thành công bé cưng ${petName} vào hồ sơ!`);
                formAddPet.reset();
                closeAddPetModal();
            });
        }

        // 12. MODAL 5: CHỈNH SỬA THÔNG TIN THÚ CƯNG (EDIT PET)
        const modalEditPet = document.getElementById('modalEditPet');
        const btnCloseEditPet = document.getElementById('btnCloseEditPet');
        const btnCancelEditPet = document.getElementById('btnCancelEditPet');
        const formEditPet = document.getElementById('formEditPet');
        let currentEditPetIndex = null;

        function openEditPetModal(custId, petIndex) {
            if (!modalEditPet) return;
            currentEditingPetCustId = custId;
            currentEditPetIndex = petIndex;
            const pet = customerDatabase[custId]?.pets[petIndex];
            if (!pet) return;

            if (document.getElementById('editPetId')) document.getElementById('editPetId').value = pet.id || '';
            if (document.getElementById('editPetName')) document.getElementById('editPetName').value = pet.name || '';
            if (document.getElementById('editPetSpecies')) document.getElementById('editPetSpecies').value = pet.species || 'Chó';
            if (document.getElementById('editPetBreed')) document.getElementById('editPetBreed').value = pet.breed || '';
            if (document.getElementById('editPetWeight')) document.getElementById('editPetWeight').value = pet.weight || '';
            if (document.getElementById('editPetVaccine')) document.getElementById('editPetVaccine').value = pet.vaccine || '';
            if (document.getElementById('editPetAlert')) document.getElementById('editPetAlert').value = pet.alertNote || 'Bình thường';

            modalEditPet.style.display = 'flex';
        }

        function closeEditPetModal() {
            if (modalEditPet) modalEditPet.style.display = 'none';
        }
        if (btnCloseEditPet) btnCloseEditPet.addEventListener('click', closeEditPetModal);
        if (btnCancelEditPet) btnCancelEditPet.addEventListener('click', closeEditPetModal);

        if (formEditPet) {
            formEditPet.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!currentEditingPetCustId || currentEditPetIndex === null) return;
                const pet = customerDatabase[currentEditingPetCustId]?.pets[currentEditPetIndex];
                if (!pet) return;

                pet.name = document.getElementById('editPetName')?.value || pet.name;
                pet.species = document.getElementById('editPetSpecies')?.value || pet.species;
                pet.breed = document.getElementById('editPetBreed')?.value || '';
                pet.weight = document.getElementById('editPetWeight')?.value || '';
                pet.vaccine = document.getElementById('editPetVaccine')?.value || 'Chưa cập nhật';
                pet.alertNote = document.getElementById('editPetAlert')?.value || 'Bình thường';

                renderDrawerPets(currentEditingPetCustId);

                // Cập nhật lại cột thú cưng trên bảng danh sách
                document.querySelectorAll('#customerTableTbody tr').forEach(row => {
                    const idCell = row.querySelector('td:first-child')?.textContent?.trim();
                    if (idCell === currentEditingPetCustId) {
                        const petCell = row.querySelectorAll('td')[3];
                        if (petCell) {
                            petCell.innerHTML = formatCustomerPetsCell(customerDatabase[currentEditingPetCustId]?.pets);
                        }
                    }
                });

                alert(`Đã cập nhật thành công thông tin bé cưng ${pet.name}!`);
                closeEditPetModal();
            });
        }

        // 13. Lưu ghi chú khách hàng trong Drawer
        const btnSaveNote = document.getElementById('btnSaveCustomerNote');
        if (btnSaveNote) {
            btnSaveNote.addEventListener('click', () => {
                const currentCustId = document.getElementById('profileValCustId')?.textContent || 'CUST-001';
                const noteVal = document.getElementById('drawerCustNote')?.value || '';
                if (customerDatabase[currentCustId]) {
                    customerDatabase[currentCustId].note = noteVal;
                }
                alert('Đã lưu thành công ghi chú khách hàng!');
            });
        }

        // 14. Gửi lại SMS kích hoạt tài khoản
        const btnResendSms = document.getElementById('btnResendSmsToken');
        if (btnResendSms) {
            btnResendSms.addEventListener('click', () => {
                const phone = document.getElementById('profileValPhone')?.textContent || 'khách hàng';
                alert(`Đã gửi lại tin nhắn SMS chứa liên kết tạo mật khẩu đến số ${phone}!`);
            });
        }

        // 15. Điều hướng liên kết chéo trên đầu Hồ sơ (Cross-module quick actions)
        document.querySelector('.btn-link-service')?.addEventListener('click', () => {
            const custName = document.getElementById('drawerCustomerName')?.textContent || '';
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
            alert(`Tự động điền thông tin ${custName} và chuyển sang phân hệ Dịch vụ!`);
            if (btn) btn.click();
        });

        document.querySelector('.btn-link-order')?.addEventListener('click', () => {
            const custName = document.getElementById('drawerCustomerName')?.textContent || '';
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Bán hàng"]');
            alert(`Tự động điền thông tin ${custName} và chuyển sang phân hệ Bán hàng để lên đơn!`);
            if (btn) btn.click();
        });

        document.querySelector('.btn-link-complaint')?.addEventListener('click', () => {
            const custName = document.getElementById('drawerCustomerName')?.textContent || '';
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
            alert(`Mở phiếu hỗ trợ cho khách hàng ${custName} tại phân hệ Khiếu nại!`);
            if (btn) btn.click();
        });

        // 16. THANH THÔNG BÁO KHÁCH HÀNG CÓ KHIẾU NẠI (DẢI MỎNG ALERT TONE, THUẦN CHỮ)
        const complaintCustomers = [
            { id: 'CUST-001', name: 'Nguyễn Văn An', ticket: 'TK-008', reason: 'Chưa nhận quà tặng hạng Vàng' },
            { id: 'CUST-007', name: 'Vũ Đức Thắng', ticket: 'TK-015', reason: 'Thú cưng bị trầy nhẹ sau spa' }
        ];

        function renderComplaintBar() {
            const container = document.getElementById('custComplaintItemsContainer');
            const bar = document.getElementById('custComplaintAlertBar');
            if (!container) return;

            if (complaintCustomers.length === 0) {
                if (bar) bar.style.display = 'none';
                return;
            }

            if (bar) bar.style.display = 'flex';

            container.innerHTML = complaintCustomers.map(item => `
                <div class="complaint-item-tag" data-id="${item.id}" title="Xem hồ sơ ${item.name} (${item.ticket})">
                    <span class="tag-ticket">${item.ticket}</span>
                    <span class="tag-cust">${item.name}</span>
                    <span class="tag-reason">(${item.reason})</span>
                </div>
            `).join('');

            container.querySelectorAll('.complaint-item-tag').forEach(tag => {
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const custId = tag.getAttribute('data-id');
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    renderDrawerCustomerProfile(custId);
                    switchSubtab('tab-profile');
                });
            });
        }

        renderComplaintBar();

        // 17. Bộ lọc bảng và tương tác thẻ KPI 1 chạm
        const tableRows = document.querySelectorAll('#customerTableTbody tr');
        const filterStatusSelect = document.getElementById('custFilterStatus');
        const filterTierSelect = document.getElementById('custFilterTier');
        const btnFilterComplaint = document.getElementById('btnFilterComplaintOnly');
        const btnComplaintStripFilter = document.getElementById('btnFilterComplaintQuick');
        const searchInput = document.getElementById('custSearchInput');
        let currentFilter = 'ALL';

        function applyCustomerFilters() {
            const query = (searchInput?.value || '').toLowerCase().trim();
            const selectedTier = filterTierSelect?.value || 'ALL';

            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matchesSearch = !query || text.includes(query);
                let matchesCategory = true;
                let matchesTier = true;

                if (selectedTier !== 'ALL') {
                    const tierNameMap = { 'BRONZE': 'đồng', 'SILVER': 'bạc', 'GOLD': 'vàng', 'DIAMOND': 'kim cương' };
                    const expectedTier = tierNameMap[selectedTier];
                    matchesTier = text.includes(expectedTier);
                }

                if (currentFilter === 'COMPLAINT') {
                    const isLocked = row.classList.contains('row-locked') || text.includes('bị khóa');
                    matchesCategory = !isLocked && (row.classList.contains('row-highlight-complaint') || text.includes('khiếu nại'));
                } else if (currentFilter === 'LOCKED') {
                    matchesCategory = row.classList.contains('row-locked') || text.includes('bị khóa');
                } else if (currentFilter === 'TEMP') {
                    matchesCategory = text.includes('tạm thời') || text.includes('vãng lai');
                } else if (currentFilter === 'MEMBER') {
                    matchesCategory = !row.classList.contains('row-locked') && !text.includes('tạm thời');
                }

                if (matchesSearch && matchesCategory && matchesTier) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', applyCustomerFilters);
        }

        if (filterStatusSelect) {
            filterStatusSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'ALL') currentFilter = 'ALL';
                else if (val === 'ACTIVE') currentFilter = 'MEMBER';
                else if (val === 'TEMP') currentFilter = 'TEMP';
                else if (val === 'LOCKED') currentFilter = 'LOCKED';
                applyCustomerFilters();
            });
        }

        if (filterTierSelect) {
            filterTierSelect.addEventListener('change', applyCustomerFilters);
        }

        if (btnFilterComplaint) {
            btnFilterComplaint.addEventListener('click', () => {
                if (currentFilter === 'COMPLAINT') {
                    currentFilter = 'ALL';
                    btnFilterComplaint.classList.remove('active');
                } else {
                    currentFilter = 'COMPLAINT';
                    btnFilterComplaint.classList.add('active');
                }
                applyCustomerFilters();
            });
        }

        if (btnComplaintStripFilter) {
            btnComplaintStripFilter.addEventListener('click', () => {
                currentFilter = 'COMPLAINT';
                if (btnFilterComplaint) btnFilterComplaint.classList.add('active');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => {
                    c.classList.toggle('active', c.getAttribute('data-kpi-filter') === 'COMPLAINT');
                });
                applyCustomerFilters();
            });
        }

        document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-kpi-filter');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                currentFilter = filter;
                if (btnFilterComplaint) {
                    btnFilterComplaint.classList.toggle('active', filter === 'COMPLAINT');
                }
                if (filterStatusSelect) {
                    if (filter === 'ALL') filterStatusSelect.value = 'ALL';
                    else if (filter === 'LOCKED') filterStatusSelect.value = 'LOCKED';
                    else if (filter === 'TEMP') filterStatusSelect.value = 'TEMP';
                }
                applyCustomerFilters();
            });
        });

        // 18. KHỞI TẠO VÀ KHÔI PHỤC TRẠNG THÁI KHI F5 / RELOAD
        const hashSubtab = window.location.hash ? window.location.hash.replace('#', '') : null;
        const validSubtabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
        let initialSubtab = 'tab-list';

        if (hashSubtab && validSubtabs.includes(hashSubtab)) {
            initialSubtab = hashSubtab;
        } else {
            const savedSubtab = sessionStorage.getItem('pawpal_admin_customer_subtab');
            if (savedSubtab && validSubtabs.includes(savedSubtab)) {
                initialSubtab = savedSubtab;
            }
        }

        const savedCustId = sessionStorage.getItem('pawpal_admin_customer_id') || 'CUST-001';
        renderDrawerCustomerProfile(savedCustId);

        if (initialSubtab !== 'tab-list') {
            switchSubtab(initialSubtab);
        }

        const savedDrawerTab = sessionStorage.getItem('pawpal_admin_customer_drawertab');
        if (savedDrawerTab && document.getElementById(savedDrawerTab)) {
            switchDrawerTab(savedDrawerTab);
        }

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomersModule);
    } else {
        initCustomersModule();
    }
})();
