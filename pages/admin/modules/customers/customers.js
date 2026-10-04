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

        // Helper: Hiển thị Toast Notification nhẹ nhàng chuẩn AGENTS.md
        function showToast(message, type = 'info') {
            let container = document.getElementById('adminToastContainer');
            if (!container) {
                container = document.createElement('div');
                container.id = 'adminToastContainer';
                container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            const bgColors = {
                success: '#DCEEE2',
                warning: '#F5E8D3',
                danger: '#F7DCDC',
                info: '#DCEAF2'
            };
            const textColors = {
                success: '#165335',
                warning: '#734718',
                danger: '#8F2424',
                info: '#20495E'
            };

            const bg = bgColors[type] || bgColors.info;
            const color = textColors[type] || textColors.info;

            toast.style.cssText = `
                background: ${bg};
                color: ${color};
                padding: 10px 16px;
                border-radius: 9px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                pointer-events: auto;
                opacity: 0;
                transform: translateY(-8px);
                transition: opacity 0.2s ease, transform 0.2s ease;
                max-width: 380px;
                line-height: 1.4;
            `;
            toast.textContent = message;
            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            });

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-8px)';
                setTimeout(() => toast.remove(), 200);
            }, 3000);
        }

        // Helper: Mở Custom Confirm Modal chuẩn AGENTS.md thay thế window.confirm()
        let activeCustConfirmCallback = null;
        function showCustomerConfirmModal({ title, message, acceptText = 'Xác nhận', onAccept }) {
            const modal = document.getElementById('modalConfirmCustomerAction');
            const titleEl = document.getElementById('custConfirmTitle');
            const msgEl = document.getElementById('custConfirmMessage');
            const acceptBtn = document.getElementById('btnAcceptCustConfirm');
            if (!modal) {
                if (onAccept) onAccept();
                return;
            }

            if (titleEl && title) titleEl.textContent = title;
            if (msgEl && message) msgEl.innerHTML = message;
            if (acceptBtn) acceptBtn.textContent = acceptText;

            activeCustConfirmCallback = onAccept;
            modal.style.display = 'flex';
        }

        document.getElementById('btnAcceptCustConfirm')?.addEventListener('click', () => {
            const modal = document.getElementById('modalConfirmCustomerAction');
            if (modal) modal.style.display = 'none';
            if (typeof activeCustConfirmCallback === 'function') {
                activeCustConfirmCallback();
                activeCustConfirmCallback = null;
            }
        });

        document.getElementById('btnCancelCustConfirm')?.addEventListener('click', () => {
            const modal = document.getElementById('modalConfirmCustomerAction');
            if (modal) modal.style.display = 'none';
            activeCustConfirmCallback = null;
        });

        document.getElementById('btnCloseCustConfirm')?.addEventListener('click', () => {
            const modal = document.getElementById('modalConfirmCustomerAction');
            if (modal) modal.style.display = 'none';
            activeCustConfirmCallback = null;
        });

        // ====================================================================
        // DATA STORE MÔ PHỎNG CHI TIẾT THEO TỪNG KHÁCH HÀNG (CÁ NHÂN, PET, ĐƠN, LỊCH, KHIẾU NẠI)
        // ====================================================================
        const defaultCustomerDatabase = {
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

        async function fetchJsonSafely(url) {
            try {
                const res = await fetch(url + '?v=' + Date.now());
                if (res.ok) return await res.json();
            } catch (e) {
                console.warn(`[customers] fetch ${url} failed:`, e);
            }
            return null;
        }

        function getCustomersData() {
            const saved = sessionStorage.getItem('pawpal_admin_customers_data') || localStorage.getItem('pawpal_admin_customers_data');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Lỗi phân tích cú pháp pawpal_admin_customers_data:', e);
                }
            }
            return JSON.parse(JSON.stringify(defaultCustomerDatabase));
        }

        let customerDatabase = getCustomersData();

        function persistCustomersData() {
            sessionStorage.setItem('pawpal_admin_customers_data', JSON.stringify(customerDatabase));
            localStorage.setItem('pawpal_admin_customers_data', JSON.stringify(customerDatabase));
        }

        async function syncCustomerDatabaseFromSources() {
            try {
                const fetched = await fetchJsonSafely('/data/customers.json');
                if (fetched && typeof fetched === 'object') {
                    Object.entries(fetched).forEach(([k, v]) => {
                        if (!customerDatabase[k]) {
                            customerDatabase[k] = v;
                        }
                    });
                }

                // Đồng bộ từ pawpal_users_db nếu có tài khoản mới đăng ký phía User
                const rawUsers = localStorage.getItem('pawpal_users_db');
                if (rawUsers) {
                    const localUsers = JSON.parse(rawUsers);
                    if (Array.isArray(localUsers)) {
                        localUsers.forEach(u => {
                            const uPhone = u.phone || u.phoneNumber;
                            if (uPhone) {
                                const cleanPhone = String(uPhone).replace(/[^0-9]/g, '').trim();
                                const exists = Object.values(customerDatabase).some(c => c.phone && String(c.phone).replace(/[^0-9]/g, '').trim() === cleanPhone);
                                if (!exists) {
                                    const newId = u.id || `CUST-${String(Object.keys(customerDatabase).length + 1).padStart(3, '0')}`;
                                    customerDatabase[newId] = {
                                        id: newId,
                                        name: u.name || u.fullName || 'Khách hàng ' + uPhone,
                                        phone: uPhone,
                                        email: u.email || 'Chưa cập nhật',
                                        gender: u.gender || 'Khác',
                                        dob: u.dob || u.birthday || 'Chưa cập nhật',
                                        tier: u.membershipTier === 'Vàng' ? 'GOLD' : (u.membershipTier === 'Bạc' ? 'SILVER' : (u.membershipTier === 'Kim Cương' ? 'DIAMOND' : 'BRONZE')),
                                        tierName: u.membershipTier || 'Đồng',
                                        tierBadgeClass: u.membershipTier === 'Vàng' ? 'badge-tier-gold' : (u.membershipTier === 'Bạc' ? 'badge-tier-silver' : (u.membershipTier === 'Kim Cương' ? 'badge-tier-diamond' : 'badge-neutral')),
                                        points: u.points || u.pawPoints || 0,
                                        status: u.isLocked ? 'LOCKED' : (u.is_temporary ? 'TEMP' : 'ACTIVE'),
                                        authStatus: u.is_temporary ? 'Chưa kích hoạt' : 'Đã kích hoạt',
                                        note: u.note || 'Tài khoản đăng ký trực tuyến qua Sen App.',
                                        emergencyAlert: null,
                                        addresses: u.addresses || (u.address ? [{ address: u.address, isDefault: true, label: 'Nhà riêng' }] : [{ address: 'Tiếp nhận trực tiếp tại quầy', isDefault: true, label: 'Tại quầy' }]),
                                        pets: u.pets || [],
                                        orders: [],
                                        bookings: [],
                                        complaints: []
                                    };
                                }
                            }
                        });
                    }
                }

                persistCustomersData();
                renderCustomersTable();
                updateCustomerKPIs();
                renderComplaintBar();
            } catch (e) {
                console.warn('[customers] syncCustomerDatabaseFromSources error:', e);
            }
        }

        // ====================================================================
        // CƠ CHẾ ĐÁNH GIÁ VÀ THĂNG HẠNG THÀNH VIÊN TỰ ĐỘNG (AUTOMATIC TIER PROGRESSION)
        // ====================================================================
        function evaluateCustomerTier(cust) {
            if (!cust) return { changed: false };
            const pts = Number(cust.points) || 0;
            let newTier = 'BRONZE';
            let newTierName = 'Đồng';
            let newBadgeClass = 'badge-neutral';

            if (pts >= 2000) {
                newTier = 'DIAMOND';
                newTierName = 'Kim Cương';
                newBadgeClass = 'badge-tier-diamond';
            } else if (pts >= 800) {
                newTier = 'GOLD';
                newTierName = 'Vàng';
                newBadgeClass = 'badge-tier-gold';
            } else if (pts >= 300) {
                newTier = 'SILVER';
                newTierName = 'Bạc';
                newBadgeClass = 'badge-tier-silver';
            }

            const oldTier = cust.tier;
            if (oldTier !== newTier) {
                const oldTierName = cust.tierName || oldTier;
                cust.tier = newTier;
                cust.tierName = newTierName;
                cust.tierBadgeClass = newBadgeClass;
                return { changed: true, oldTier, oldTierName, newTier, newTierName };
            }
            return { changed: false };
        }

        // ====================================================================
        // DATA STORE VÀ PERSISTENCE CHO LỊCH SỬ BIẾN ĐỘNG ĐIỂM PAWPOINT
        // ====================================================================
        const defaultPawpointHistory = [
            {
                id: 'PWH-001',
                time: '27/09/2026 10:30',
                custId: 'CUST-001',
                custName: 'Nguyễn Văn An',
                phone: '0912345678',
                type: 'ADD',
                points: 50,
                balance: 1250,
                reason: 'Bù sự cố dịch vụ theo Ticket TK-008'
            },
            {
                id: 'PWH-002',
                time: '25/09/2026 14:20',
                custId: 'CUST-002',
                custName: 'Lê Thị Bình',
                phone: '0987654321',
                type: 'ADD',
                points: 45,
                balance: 420,
                reason: 'Tích điểm đơn hàng ORD-8920'
            },
            {
                id: 'PWH-003',
                time: '24/09/2026 16:00',
                custId: 'CUST-005',
                custName: 'Hoàng Kim Long',
                phone: '0966778899',
                type: 'ADD',
                points: 215,
                balance: 2450,
                reason: 'Tích điểm đơn hàng ORD-8930'
            },
            {
                id: 'PWH-004',
                time: '20/09/2026 11:15',
                custId: 'CUST-006',
                custName: 'Đỗ Thị Mai',
                phone: '0918445566',
                type: 'SUB',
                points: 100,
                balance: 380,
                reason: 'Khách đổi quà tặng trực tiếp tại quầy'
            }
        ];

        function getPawpointHistory() {
            try {
                const saved = sessionStorage.getItem('pawpal_admin_pawpoint_history');
                if (saved) return JSON.parse(saved);
            } catch (e) {}
            return JSON.parse(JSON.stringify(defaultPawpointHistory));
        }

        const pawpointHistory = getPawpointHistory();

        function persistPawpointHistory() {
            try {
                sessionStorage.setItem('pawpal_admin_pawpoint_history', JSON.stringify(pawpointHistory));
            } catch (e) {}
        }

        function renderPawpointHistory() {
            const tbody = document.getElementById('pawpointHistoryTbody');
            if (!tbody) return;

            const query = (document.getElementById('pawpointSearchInput')?.value || '').toLowerCase().trim();
            const filterType = document.getElementById('pawpointFilterType')?.value || 'ALL';

            const filtered = pawpointHistory.filter(item => {
                const matchQuery = !query ||
                    (item.custName && item.custName.toLowerCase().includes(query)) ||
                    (item.phone && item.phone.includes(query)) ||
                    (item.reason && item.reason.toLowerCase().includes(query));
                const matchType = (filterType === 'ALL') || (item.type === filterType);
                return matchQuery && matchType;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Không tìm thấy lịch sử biến động điểm phù hợp.</td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(item => {
                const sign = item.type === 'ADD' ? '+' : '-';
                const colorClass = item.type === 'ADD' ? 'text-success' : 'text-danger';
                return `
                    <tr>
                        <td>${item.time}</td>
                        <td><strong>${item.custName}</strong> <span style="color: var(--text-muted); font-size: 12px;">(${item.phone})</span></td>
                        <td><strong class="${colorClass}">${sign}${item.points} pts</strong></td>
                        <td>${Number(item.balance).toLocaleString('vi-VN')} pts</td>
                        <td>${item.reason}</td>
                    </tr>
                `;
            }).join('');
        }

        function showToast(msg, type = 'success') {
            let toast = document.getElementById('adminGlobalToast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'adminGlobalToast';
                document.body.appendChild(toast);
            }
            const isAlert = type === 'warning' || type === 'error' || type === 'danger';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background-color: ${isAlert ? '#8F2424' : '#236B48'};
                color: #FFFFFF;
                padding: 12px 20px;
                border-radius: 9px;
                font-size: 13.5px;
                font-weight: 500;
                box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
                z-index: 9999;
                display: block;
            `;
            toast.textContent = msg;
            if (window._custToastTimer) clearTimeout(window._custToastTimer);
            window._custToastTimer = setTimeout(() => {
                toast.style.display = 'none';
            }, 3200);
        }

        // Tự động đồng bộ bé cưng sang kho dữ liệu pets module khi thêm khách mới hoặc thêm pet
        function syncNewPetToPetsModule(newPet, custId, custName, custPhone) {
            try {
                const savedPets = sessionStorage.getItem('pawpal_admin_pets_data');
                let petsData = savedPets ? JSON.parse(savedPets) : null;
                if (petsData) {
                    const newPetId = newPet.id || ('PET-' + String(Object.keys(petsData).length + 1).padStart(3, '0'));
                    newPet.id = newPetId;
                    const spec = newPet.species === 'Mèo' || newPet.species === 'CAT' ? 'cat' : (newPet.species === 'Thỏ' ? 'rabbit' : 'dog');
                    petsData[newPetId] = {
                        name: newPet.name,
                        code: newPetId,
                        species: spec,
                        speciesBreed: `${newPet.species} ${newPet.breed || ''}`.trim(),
                        breed: newPet.breed || 'Chưa cập nhật',
                        gender: 'Đực',
                        weight: newPet.weight ? `${newPet.weight} kg` : '3.5 kg',
                        weightNum: parseFloat(newPet.weight) || 3.5,
                        dob: 'Chưa cập nhật',
                        color: 'Chưa cập nhật',
                        allergy: 'Không',
                        notes: 'Tiếp nhận ban đầu tại quầy cùng khách hàng.',
                        alert: newPet.alertNote && newPet.alertNote !== 'Bình thường' ? newPet.alertNote : '',
                        ownerName: custName,
                        ownerPhone: custPhone,
                        custId: custId,
                        avatar: spec === 'cat' ? '/assets/images/publics/catcute1.jpg' : '/assets/images/publics/dogcute1.jpg',
                        status: 'Đang nuôi',
                        vaccinated: false,
                        isHotel: false,
                        weightHistory: [],
                        vaccines: [],
                        carelogs: [],
                        history: []
                    };
                    sessionStorage.setItem('pawpal_admin_pets_data', JSON.stringify(petsData));
                }
            } catch(err) {
                console.warn('Lỗi đồng bộ thú cưng sang pets module:', err);
            }
        }

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
                            <button type="button" class="btn-pet-action btn-pet-view-profile" data-pet-id="${pet.id || ('PET-' + (idx+1))}" data-pet-name="${pet.name}">Xem hồ sơ bé</button>
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

            // Gán sự kiện Xem hồ sơ bé cưng -> Chuyển sang phân hệ Thú cưng
            container.querySelectorAll('.btn-pet-view-profile').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const petId = btn.getAttribute('data-pet-id');
                    const petName = btn.getAttribute('data-pet-name') || 'Bé cưng';
                    sessionStorage.setItem('pawpal_admin_pet_id', petId);
                    sessionStorage.setItem('pawpal_admin_pet_name', petName);
                    sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-profile');
                    showToast(`Chuyển đến hồ sơ bé ${petName} (${petId}) tại phân hệ Thú cưng!`);
                    const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Thú cưng"]');
                    if (sidebarBtn) sidebarBtn.click();
                });
            });

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
                    showCustomerConfirmModal({
                        title: 'Xác nhận xóa thú cưng',
                        message: `Bạn có chắc chắn muốn xóa bé cưng <strong>${pet?.name || ''}</strong> khỏi hồ sơ của khách hàng này?`,
                        acceptText: 'Xóa thú cưng',
                        onAccept: () => {
                            customerDatabase[cId].pets.splice(pIdx, 1);
                            renderDrawerPets(cId);
                            persistCustomersData();
                            renderCustomersTable();
                            showToast('Đã xóa bé cưng khỏi hồ sơ thành công!', 'success');
                        }
                    });
                });
            });
        }

        // Render Tab Đơn hàng
        function renderDrawerOrders(custId) {
            const tbody = document.getElementById('drawerOrdersTbody');
            if (!tbody) return;
            let orders = [...(customerDatabase[custId]?.orders || [])];

            // Tự động hợp nhất các đơn hàng thực tế từ phân hệ Bán hàng
            try {
                const rawOrders = sessionStorage.getItem('pawpal_admin_orders_data');
                if (rawOrders) {
                    const allOrders = JSON.parse(rawOrders);
                    const custObj = customerDatabase[custId];
                    const custName = custObj?.name?.toLowerCase();
                    const custPhone = custObj?.phone;
                    const custIdMap = { 'CUST-001': 'USER-001', 'CUST-002': 'USER-002', 'CUST-003': 'USER-003', 'CUST-004': 'USER-004', 'CUST-005': 'USER-005' };
                    const mappedUserId = custIdMap[custId];

                    const matchedOrders = allOrders.filter(o =>
                        o.userId === custId ||
                        o.userId === mappedUserId ||
                        (custPhone && o.phone && o.phone.replace(/[^0-9]/g, '') === custPhone.replace(/[^0-9]/g, '')) ||
                        (custName && o.customerName && o.customerName.toLowerCase() === custName)
                    );

                    matchedOrders.forEach(mo => {
                        if (!orders.some(ord => ord.id === mo.id)) {
                            orders.unshift({
                                id: mo.id,
                                date: new Date(mo.createdAt).toLocaleDateString('vi-VN'),
                                total: Number(mo.total).toLocaleString('vi-VN') + ' đ',
                                payment: mo.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
                                status: mo.status === 'completed' ? 'Hoàn tất' : mo.status === 'shipping' ? 'Đang giao' : mo.status === 'confirmed' ? 'Đang chuẩn bị' : 'Chờ xác nhận',
                                statusClass: mo.status === 'completed' ? 'badge-success' : mo.status === 'shipping' ? 'badge-info' : 'badge-warning'
                            });
                        }
                    });
                }
            } catch (e) {}

            if (orders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch sử mua hàng.</td></tr>`;
                return;
            }

            tbody.innerHTML = orders.map(ord => `
                <tr>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-jump-order-code" data-order-id="${ord.id}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${ord.id}</a>
                    </td>
                    <td>${ord.date}</td>
                    <td>${ord.total}</td>
                    <td><span class="admin-badge badge-success">${ord.payment}</span></td>
                    <td><span class="admin-badge ${ord.statusClass}">${ord.status}</span></td>
                    <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-order-action" data-order-id="${ord.id}">Xem chi tiết đơn</button></td>
                </tr>
            `).join('');

            const jumpToOrder = (ordId) => {
                sessionStorage.setItem('pawpal_admin_order_id', ordId);
                sessionStorage.setItem('pawpal_admin_order_selected_id', ordId);
                sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-detail');
                sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
                showToast(`Mở chi tiết đơn hàng ${ordId} tại phân hệ Bán hàng!`);
                setTimeout(() => {
                    window.location.hash = '#tab-order-detail';
                }, 300);
            };

            tbody.querySelectorAll('.btn-jump-order-code, .btn-view-order-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const ordId = btn.getAttribute('data-order-id');
                    jumpToOrder(ordId);
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
                    sessionStorage.setItem('pawpal_admin_booking_id', bId);
                    showToast(`Mở nhật ký quy trình chăm sóc lịch hẹn ${bId} tại phân hệ Dịch vụ!`);
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
                    sessionStorage.setItem('pawpal_admin_ticket_id', tId);
                    sessionStorage.setItem('pawpal_admin_complaint_selected_id', tId);
                    showToast(`Chuyển đến xử lý Ticket khiếu nại ${tId} tại phân hệ Khiếu nại!`);
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

        // ====================================================================
        // 5. GLOBAL DROPDOWN TÁC VỤ 3 CHẤM (DIRECT BODY PORTAL - KHÔNG BỊ TRÀN/CẮT)
        // ====================================================================
        let globalActionDropdown = document.getElementById('customerGlobalActionDropdown');
        if (!globalActionDropdown) {
            globalActionDropdown = document.createElement('div');
            globalActionDropdown.id = 'customerGlobalActionDropdown';
            globalActionDropdown.className = 'action-dropdown-menu';
            globalActionDropdown.innerHTML = `
                <button type="button" class="dropdown-item" data-action="profile">
                    Xem hồ sơ 360°
                </button>
                <button type="button" class="dropdown-item" data-action="edit">
                    Sửa hồ sơ
                </button>
                <button type="button" class="dropdown-item" data-action="adjust-points">
                    Điều chỉnh điểm
                </button>
                <button type="button" class="dropdown-item" data-action="toggle-lock">
                    <span id="globalDropdownLockText">Khóa tài khoản</span>
                </button>
            `;
            document.body.appendChild(globalActionDropdown);
        }

        let activeMoreBtn = null;

        function closeGlobalDropdown() {
            if (globalActionDropdown) {
                globalActionDropdown.style.display = 'none';
                globalActionDropdown.classList.remove('show');
            }
            if (activeMoreBtn) {
                activeMoreBtn.classList.remove('active');
                activeMoreBtn = null;
            }
        }

        function toggleGlobalDropdown(btn) {
            if (!btn || !globalActionDropdown) return;
            const custId = btn.getAttribute('data-id');
            const cust = customerDatabase[custId];
            if (!cust) return;

            // Nếu đang mở chính nút này thì bấm vào sẽ đóng
            if (activeMoreBtn === btn && globalActionDropdown.style.display === 'flex') {
                closeGlobalDropdown();
                return;
            }

            closeGlobalDropdown();
            activeMoreBtn = btn;
            btn.classList.add('active');

            globalActionDropdown.setAttribute('data-id', custId);
            const lockItem = globalActionDropdown.querySelector('[data-action="toggle-lock"]');
            const lockText = globalActionDropdown.querySelector('#globalDropdownLockText');
            if (lockItem && lockText) {
                if (cust.status === 'LOCKED') {
                    lockItem.className = 'dropdown-item text-success';
                    lockText.textContent = 'Mở khóa tài khoản';
                } else {
                    lockItem.className = 'dropdown-item text-danger';
                    lockText.textContent = 'Khóa tài khoản';
                }
            }

            // Tính toán vị trí hiển thị chuẩn xác không phụ thuộc bất kỳ thẻ cha nào
            const rect = btn.getBoundingClientRect();
            const menuWidth = 180;
            const menuHeight = 160;

            let left = rect.right - menuWidth;
            if (left < 10) left = 10;
            if (left + menuWidth > window.innerWidth - 10) {
                left = window.innerWidth - menuWidth - 10;
            }

            let top = rect.bottom + 6;
            // Nếu nút ở gần mép dưới màn hình thì mở ngược lên trên
            if (top + menuHeight > window.innerHeight - 10) {
                top = rect.top - menuHeight - 6;
            }

            globalActionDropdown.style.position = 'fixed';
            globalActionDropdown.style.top = `${top}px`;
            globalActionDropdown.style.left = `${left}px`;
            globalActionDropdown.style.zIndex = '99999';
            globalActionDropdown.style.display = 'flex';
            globalActionDropdown.classList.add('show');
        }

        // Bắt sự kiện thao tác trên menu dropdown
        globalActionDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            e.stopPropagation();

            const action = item.getAttribute('data-action');
            const custId = globalActionDropdown.getAttribute('data-id');
            closeGlobalDropdown();

            if (!custId || !customerDatabase[custId]) return;

            if (action === 'profile') {
                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                sessionStorage.setItem('pawpal_admin_customer_name', customerDatabase[custId].name || custId);
                renderDrawerCustomerProfile(custId);
                switchSubtab('tab-profile');
            } else if (action === 'edit') {
                openEditCustomerModal(custId);
            } else if (action === 'adjust-points') {
                openAdjustPointsModal(customerDatabase[custId].phone);
            } else if (action === 'toggle-lock') {
                if (customerDatabase[custId].status === 'LOCKED') {
                    customerDatabase[custId].status = 'ACTIVE';
                    customerDatabase[custId].authStatus = 'Đã kích hoạt';
                    persistCustomersData();
                    renderCustomersTable();
                    updateCustomerKPIs();
                    showToast(`Đã mở khóa tài khoản khách hàng ${customerDatabase[custId].name}!`);
                } else {
                    customerDatabase[custId].status = 'LOCKED';
                    customerDatabase[custId].authStatus = 'Tài khoản bị khóa';
                    persistCustomersData();
                    renderCustomersTable();
                    updateCustomerKPIs();
                    showToast(`Đã khóa tài khoản khách hàng ${customerDatabase[custId].name}!`);
                }
            }
        });

        // Đóng dropdown khi click ra ngoài hoặc khi cuộn trang
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-action-more') && !e.target.closest('#customerGlobalActionDropdown')) {
                closeGlobalDropdown();
            }
        });

        window.addEventListener('resize', closeGlobalDropdown);
        const scrollContainer = document.querySelector('.table-responsive-wrapper');
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', closeGlobalDropdown);
        }

        // ====================================================================
        // RENDER BẢNG DỮ LIỆU KHÁCH HÀNG VÀ PHÂN TRANG ĐỘNG (CHUẨN 10 DÒNG/TRANG)
        // ====================================================================
        let currentCustomerPage = 1;
        const CUSTOMER_PAGE_SIZE = 10;
        let currentCustomerFilter = 'ALL'; // ALL, MEMBER, TEMP, LOCKED, COMPLAINT

        function updateCustomerKPIs() {
            const totalEl = document.getElementById('custStatTotal');
            const memberEl = document.getElementById('custStatMember');
            const guestEl = document.getElementById('custStatGuest');
            const lockedEl = document.getElementById('custStatLocked');
            const complaintEl = document.getElementById('custStatComplaint');

            const allCusts = Object.values(customerDatabase);
            const totalCount = allCusts.length;
            const memberCount = allCusts.filter(c => c.status === 'ACTIVE').length;
            const guestCount = allCusts.filter(c => c.status === 'TEMP').length;
            const lockedCount = allCusts.filter(c => c.status === 'LOCKED').length;
            const complaintCount = allCusts.filter(c => c.emergencyAlert || (c.complaints && c.complaints.some(tc => tc.status === 'Đang xử lý'))).length;

            if (totalEl) totalEl.textContent = totalCount.toLocaleString('vi-VN');
            if (memberEl) memberEl.textContent = memberCount.toLocaleString('vi-VN');
            if (guestEl) guestEl.textContent = guestCount.toLocaleString('vi-VN');
            if (lockedEl) lockedEl.textContent = lockedCount.toLocaleString('vi-VN');
            if (complaintEl) complaintEl.textContent = complaintCount.toLocaleString('vi-VN');
        }

        function renderCustomerPagination(totalPages) {
            const pagBar = document.getElementById('customerPaginationBar');
            const pagControls = document.getElementById('customerPaginationControls');
            if (!pagBar || !pagControls) return;

            if (totalPages <= 1) {
                pagBar.style.display = 'none';
                return;
            }
            pagBar.style.display = 'flex';

            let html = '';
            const prevDisabled = currentCustomerPage === 1 ? 'disabled' : '';
            html += `<button type="button" class="pagination-btn ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>`;

            for (let p = 1; p <= totalPages; p++) {
                const activeClass = p === currentCustomerPage ? 'active' : '';
                html += `<button type="button" class="pagination-btn ${activeClass}" data-page="${p}">${p}</button>`;
            }

            const nextDisabled = currentCustomerPage === totalPages ? 'disabled' : '';
            html += `<button type="button" class="pagination-btn ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>`;

            pagControls.innerHTML = html;

            pagControls.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const pageAction = btn.getAttribute('data-page');
                    if (pageAction === 'prev') {
                        if (currentCustomerPage > 1) {
                            currentCustomerPage--;
                            renderCustomersTable();
                        }
                    } else if (pageAction === 'next') {
                        if (currentCustomerPage < totalPages) {
                            currentCustomerPage++;
                            renderCustomersTable();
                        }
                    } else {
                        const targetP = parseInt(pageAction, 10);
                        if (targetP && targetP !== currentCustomerPage) {
                            currentCustomerPage = targetP;
                            renderCustomersTable();
                        }
                    }
                });
            });
        }

        function renderCustomersTable() {
            const tbody = document.getElementById('customerTableTbody');
            if (!tbody) return;

            const query = (document.getElementById('custSearchInput')?.value || '').toLowerCase().trim();
            const selectedTier = document.getElementById('custFilterTier')?.value || 'ALL';

            const allCusts = Object.values(customerDatabase);

            const filtered = allCusts.filter(c => {
                const matchSearch = !query || 
                    c.id.toLowerCase().includes(query) ||
                    c.name.toLowerCase().includes(query) ||
                    c.phone.includes(query) ||
                    (c.email && c.email.toLowerCase().includes(query)) ||
                    (c.pets && c.pets.some(p => p.name.toLowerCase().includes(query) || (p.breed && p.breed.toLowerCase().includes(query))));

                const matchTier = (selectedTier === 'ALL') || (c.tier === selectedTier);

                let matchCategory = true;
                if (currentCustomerFilter === 'MEMBER') {
                    matchCategory = (c.status === 'ACTIVE');
                } else if (currentCustomerFilter === 'TEMP') {
                    matchCategory = (c.status === 'TEMP');
                } else if (currentCustomerFilter === 'LOCKED') {
                    matchCategory = (c.status === 'LOCKED');
                } else if (currentCustomerFilter === 'COMPLAINT') {
                    matchCategory = Boolean(c.emergencyAlert || (c.complaints && c.complaints.some(tc => tc.status === 'Đang xử lý')));
                }

                return matchSearch && matchTier && matchCategory;
            });

            const totalPages = Math.ceil(filtered.length / CUSTOMER_PAGE_SIZE) || 1;
            if (currentCustomerPage > totalPages) currentCustomerPage = totalPages;

            const startIdx = (currentCustomerPage - 1) * CUSTOMER_PAGE_SIZE;
            const pageItems = filtered.slice(startIdx, startIdx + CUSTOMER_PAGE_SIZE);

            if (pageItems.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">
                            Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại.
                        </td>
                    </tr>
                `;
                renderCustomerPagination(0);
                return;
            }

            tbody.innerHTML = pageItems.map(c => {
                const isLocked = (c.status === 'LOCKED');
                const hasEmergency = Boolean(c.emergencyAlert || (c.complaints && c.complaints.some(tc => tc.status === 'Đang xử lý')));
                const hasPetAlert = Boolean(c.pets && c.pets.some(p => p.alertNote && p.alertNote !== 'Bình thường'));

                // Vạch border-left duy nhất ở td:first-child theo AGENTS.md
                let firstTdBorder = 'border-left: 3px solid transparent;';
                if (hasEmergency) {
                    firstTdBorder = 'border-left: 3px solid #DC2626 !important;';
                } else if (hasPetAlert) {
                    firstTdBorder = 'border-left: 3px solid #D97706 !important;';
                }

                const rowLockedClass = isLocked ? 'row-locked' : '';
                const rowComplaintClass = hasEmergency ? 'row-highlight-complaint' : '';

                let alertBadgeHtml = '<span class="admin-badge badge-neutral">Bình thường</span>';
                if (hasEmergency) {
                    const ticketId = (c.complaints && c.complaints.length > 0) ? c.complaints[0].id : 'Khiếu nại';
                    alertBadgeHtml = `<span class="admin-badge badge-danger">Khiếu nại ${ticketId}</span>`;
                } else if (hasPetAlert) {
                    const alertPet = c.pets.find(p => p.alertNote && p.alertNote !== 'Bình thường');
                    alertBadgeHtml = `<span class="admin-badge badge-warning">${alertPet.name}: ${alertPet.alertNote}</span>`;
                }

                let statusBadgeHtml = '<span class="admin-badge badge-success">Đang hoạt động</span>';
                if (isLocked) {
                    statusBadgeHtml = '<span class="admin-badge badge-danger">Bị khóa</span>';
                } else if (c.status === 'TEMP') {
                    statusBadgeHtml = '<span class="admin-badge badge-warning">Tạm thời</span>';
                }

                const lockBtnText = isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản';
                const lockBtnClass = isLocked ? 'text-success btn-unlock-user' : 'text-danger btn-lock-user';

                return `
                    <tr class="${rowLockedClass} ${rowComplaintClass}" data-id="${c.id}">
                        <td style="${firstTdBorder}"><strong>${c.id}</strong></td>
                        <td>
                            <div class="user-name-cell">
                                <a href="javascript:void(0)" class="user-name-link btn-open-profile-drawer" data-id="${c.id}">${c.name}</a>
                            </div>
                            <div class="user-sub-cell">${c.email && c.email !== 'Chưa cập nhật' ? c.email : 'Khách tiếp nhận tại quầy'}</div>
                        </td>
                        <td><strong>${c.phone}</strong></td>
                        <td>
                            ${formatCustomerPetsCell(c.pets)}
                        </td>
                        <td>
                            <span class="admin-badge ${c.tierBadgeClass || 'badge-neutral'}">${c.tierName || 'Đồng'}</span>
                            <span class="points-val">${(c.points || 0).toLocaleString('vi-VN')} pts</span>
                        </td>
                        <td>${alertBadgeHtml}</td>
                        <td>${statusBadgeHtml}</td>
                        <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                            <button type="button" class="btn-action-more" data-id="${c.id}" title="Tác vụ">•••</button>
                        </td>
                    </tr>
                `;
            }).join('');

            renderCustomerPagination(totalPages);
        }

        // Event delegation trên toàn bộ bảng khách hàng
        const customerTable = document.getElementById('customerDataTable');
        if (customerTable) {
            customerTable.addEventListener('click', (e) => {
                const btnMore = e.target.closest('.btn-action-more');
                if (btnMore) {
                    e.stopPropagation();
                    toggleGlobalDropdown(btnMore);
                    return;
                }

                const userLink = e.target.closest('.user-name-link');
                if (userLink) {
                    e.stopPropagation();
                    const custId = userLink.getAttribute('data-id');
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    sessionStorage.setItem('pawpal_admin_customer_name', customerDatabase[custId]?.name || '');
                    renderDrawerCustomerProfile(custId);
                    switchSubtab('tab-profile');
                    closeGlobalDropdown();
                    return;
                }
            });
        }

        // 6. Modal Tiếp nhận tại quầy (Quick Add) kèm Chống trùng SĐT
        const modalAdd = document.getElementById('modalAddCustomer');
        const btnOpenAdd = document.getElementById('btnOpenAddCustomerModal');
        const btnCloseAdd = document.getElementById('btnCloseAddCustomer');
        const btnCancelAdd = document.getElementById('btnCancelAddCustomer');
        const formAdd = document.getElementById('formAddCustomerQuick');
        const quickAddPhoneInput = document.getElementById('quickAddPhone');
        const quickAddPhoneAlert = document.getElementById('quickAddPhoneAlert');
        const quickAddDupName = document.getElementById('quickAddDupName');
        const quickAddDupId = document.getElementById('quickAddDupId');
        const btnOpenDupCustomer = document.getElementById('btnOpenDupCustomer');
        let dupFoundCustId = null;

        if (btnOpenAdd && modalAdd) {
            btnOpenAdd.addEventListener('click', () => {
                modalAdd.style.display = 'flex';
                if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
                dupFoundCustId = null;
            });
        }
        function closeAddModal() {
            if (modalAdd) modalAdd.style.display = 'none';
            if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
            dupFoundCustId = null;
        }
        if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddModal);
        if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

        if (quickAddPhoneInput) {
            quickAddPhoneInput.addEventListener('input', () => {
                const cleanPhone = quickAddPhoneInput.value.replace(/[^0-9]/g, '').trim();
                if (cleanPhone.length >= 9) {
                    const existing = Object.values(customerDatabase).find(c => c.phone && c.phone.replace(/[^0-9]/g, '').trim() === cleanPhone);
                    if (existing) {
                        dupFoundCustId = existing.id;
                        if (quickAddDupName) quickAddDupName.textContent = existing.name;
                        if (quickAddDupId) quickAddDupId.textContent = existing.id;
                        if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'block';
                        return;
                    }
                }
                dupFoundCustId = null;
                if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
            });
        }

        if (btnOpenDupCustomer) {
            btnOpenDupCustomer.addEventListener('click', () => {
                if (dupFoundCustId) {
                    closeAddModal();
                    sessionStorage.setItem('pawpal_admin_customer_id', dupFoundCustId);
                    sessionStorage.setItem('pawpal_admin_customer_name', customerDatabase[dupFoundCustId]?.name || '');
                    renderDrawerCustomerProfile(dupFoundCustId);
                    switchSubtab('tab-profile');
                }
            });
        }

        if (formAdd) {
            formAdd.addEventListener('submit', (e) => {
                e.preventDefault();
                if (dupFoundCustId) {
                    showToast(`Số điện thoại này đã thuộc về khách hàng ${customerDatabase[dupFoundCustId]?.name}! Vui lòng kiểm tra lại.`);
                    return;
                }

                const name = document.getElementById('quickAddName')?.value || 'Khách vãng lai';
                const phone = document.getElementById('quickAddPhone')?.value || '';
                const petName = document.getElementById('quickAddPetName')?.value || '';
                const petSpecies = document.getElementById('quickAddPetSpecies')?.value || 'DOG';
                const petBreed = document.getElementById('quickAddPetBreed')?.value || 'Chưa cập nhật';
                const petWeight = document.getElementById('quickAddPetWeight')?.value || '';
                const initialAddress = document.getElementById('quickAddAddress')?.value || 'Tiếp nhận trực tiếp tại quầy Pawpal Center';

                const newId = 'CUST-' + String(Object.keys(customerDatabase).length + 1).padStart(3, '0');
                const specName = petSpecies === 'CAT' ? 'Mèo' : (petSpecies === 'OTHER' ? 'Khác' : 'Chó');

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
                    addresses: [{ address: initialAddress, isDefault: true }],
                    pets: petName ? [{
                        id: 'PET-' + newId,
                        name: petName,
                        species: specName,
                        breed: petBreed,
                        weight: petWeight,
                        vaccine: 'Chưa cập nhật',
                        alertNote: 'Bình thường'
                    }] : [],
                    orders: [],
                    bookings: [],
                    complaints: []
                };

                persistCustomersData();

                // Tự động đồng bộ bé cưng sang kho dữ liệu pets module
                if (petName) {
                    syncNewPetToPetsModule(customerDatabase[newId].pets[0], newId, name, phone);
                }

                renderCustomersTable();
                updateCustomerKPIs();
                showToast(`Đã tạo thành công tài khoản tạm ${newId} cho khách hàng ${name} tại quầy!`);
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
        // Gợi ý thông tin khách hàng thời gian thực khi nhập SĐT điều chỉnh điểm
        const adjustPhoneInput = document.getElementById('adjustPhone');
        if (adjustPhoneInput) {
            adjustPhoneInput.addEventListener('input', () => {
                const clean = adjustPhoneInput.value.replace(/[^0-9]/g, '').trim();
                const hint = document.getElementById('adjustPhoneCustomerHint');
                if (!hint) return;
                if (clean.length >= 9) {
                    const matched = Object.values(customerDatabase).find(c => c.phone && c.phone.replace(/[^0-9]/g, '').trim() === clean);
                    if (matched) {
                        hint.innerHTML = `Khách hàng: <strong>${matched.name}</strong> (${matched.tierName}) — Số dư: <strong>${(matched.points || 0).toLocaleString('vi-VN')} pts</strong>`;
                        hint.style.display = 'block';
                        return;
                    }
                }
                hint.style.display = 'none';
            });
        }

        if (formAdjust) {
            formAdjust.addEventListener('submit', (e) => {
                e.preventDefault();
                const phone = document.getElementById('adjustPhone')?.value || '';
                const type = document.getElementById('adjustType')?.value || 'ADD';
                const pts = parseInt(document.getElementById('adjustPointsVal')?.value || '0', 10);
                const reason = document.getElementById('adjustReason')?.value || 'Điều chỉnh điểm';

                if (pts <= 0) {
                    showToast('Vui lòng nhập số điểm lớn hơn 0!', 'warning');
                    return;
                }

                // Tìm khách hàng có số điện thoại này
                const cleanPhone = phone.replace(/[^0-9]/g, '').trim();
                let matchedCust = Object.values(customerDatabase).find(c => c.phone && c.phone.replace(/[^0-9]/g, '').trim() === cleanPhone);
                if (!matchedCust) {
                    showToast(`Không tìm thấy khách hàng với số điện thoại ${phone}!`, 'warning');
                    return;
                }

                const custName = matchedCust.name;
                const currentBalance = Number(matchedCust.points) || 0;
                const newBalance = type === 'ADD' ? (currentBalance + pts) : Math.max(0, currentBalance - pts);
                matchedCust.points = newBalance;

                // Tự động kiểm tra và thăng / hạ hạng thành viên
                const tierResult = evaluateCustomerTier(matchedCust);

                // Thêm vào kho lịch sử Pawpoint
                const now = new Date();
                const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                pawpointHistory.unshift({
                    id: 'PWH-' + String(pawpointHistory.length + 1).padStart(3, '0'),
                    time: timeStr,
                    custId: matchedCust.id,
                    custName: custName,
                    phone: matchedCust.phone,
                    type: type,
                    points: pts,
                    balance: newBalance,
                    reason: reason
                });

                persistPawpointHistory();
                persistCustomersData();

                // Đồng bộ sang pawpal_current_user và pawpal_users_db trong localStorage nếu cùng số điện thoại
                try {
                    const rawCurrentUser = localStorage.getItem('pawpal_current_user');
                    if (rawCurrentUser) {
                        const currentUser = JSON.parse(rawCurrentUser);
                        if (currentUser && currentUser.phone && currentUser.phone.replace(/[^0-9]/g, '') === cleanPhone) {
                            currentUser.points = newBalance;
                            currentUser.pawPoints = newBalance;
                            if (tierResult.changed) {
                                currentUser.membershipTier = tierResult.newTierName;
                                currentUser.tier = tierResult.newTierName;
                            }
                            localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));
                        }
                    }
                    const rawUsersDb = localStorage.getItem('pawpal_users_db');
                    if (rawUsersDb) {
                        const usersDb = JSON.parse(rawUsersDb);
                        const idx = usersDb.findIndex(u => u.phone && u.phone.replace(/[^0-9]/g, '') === cleanPhone);
                        if (idx !== -1) {
                            usersDb[idx].points = newBalance;
                            usersDb[idx].pawPoints = newBalance;
                            if (tierResult.changed) {
                                usersDb[idx].membershipTier = tierResult.newTierName;
                                usersDb[idx].tier = tierResult.newTierName;
                            }
                            localStorage.setItem('pawpal_users_db', JSON.stringify(usersDb));
                        }
                    }
                } catch (err) {
                    console.warn('Lỗi đồng bộ điểm sang user storage:', err);
                }

                renderCustomersTable();
                updateCustomerKPIs();
                renderPawpointHistory();

                // Cập nhật lại Drawer nếu đang mở đúng khách hàng này
                const currentOpenCustId = sessionStorage.getItem('pawpal_admin_customer_id');
                if (currentOpenCustId === matchedCust.id) {
                    renderDrawerCustomerProfile(matchedCust.id);
                }

                if (tierResult.changed) {
                    showToast(`Đã ${type === 'ADD' ? 'cộng' : 'trừ'} ${pts} Pawpoint! ${matchedCust.name} được tự động cập nhật hạng: ${tierResult.newTierName}!`);
                } else {
                    showToast(`Đã ${type === 'ADD' ? 'cộng' : 'trừ'} ${pts} Pawpoint cho khách hàng ${matchedCust.name}! Số dư mới: ${newBalance.toLocaleString('vi-VN')} pts`);
                }

                formAdjust.reset();
                const hint = document.getElementById('adjustPhoneCustomerHint');
                if (hint) hint.style.display = 'none';
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
                    showToast('Đã khóa tài khoản khách hàng!');
                } else if (!isLock && badge) {
                    row.classList.remove('row-locked');
                    badge.className = 'admin-badge badge-success';
                    badge.textContent = 'Đang hoạt động';
                    btn.className = 'dropdown-item text-danger btn-lock-user';
                    btn.innerHTML = `<span>Khóa tài khoản</span>`;
                    if (customerDatabase[custId]) customerDatabase[custId].status = 'ACTIVE';
                    showToast('Đã mở khóa tài khoản khách hàng!');
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
                    showToast('Vui lòng nhập ít nhất một địa chỉ nhận hàng!', 'warning');
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

                persistCustomersData();
                renderCustomersTable();
                updateCustomerKPIs();
                showToast(`Đã cập nhật thành công hồ sơ của khách hàng ${newName}!`);
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

                persistCustomersData();
                syncNewPetToPetsModule(customerDatabase[currentCustId].pets[0], currentCustId, customerDatabase[currentCustId]?.name, customerDatabase[currentCustId]?.phone);
                renderCustomersTable();
                showToast(`Đã thêm thành công bé cưng ${petName} vào hồ sơ!`);
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

                persistCustomersData();
                renderCustomersTable();
                showToast(`Đã cập nhật thành công thông tin bé cưng ${pet.name}!`);
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
                persistCustomersData();
                    showToast('Đã lưu thành công ghi chú khách hàng!');
            });
        }

        // 14. Gửi lại SMS kích hoạt tài khoản
        const btnResendSms = document.getElementById('btnResendSmsToken');
        if (btnResendSms) {
            btnResendSms.addEventListener('click', () => {
                const phone = document.getElementById('profileValPhone')?.textContent || 'khách hàng';
                showToast(`Đã gửi lại tin nhắn SMS chứa liên kết tạo mật khẩu đến số ${phone}!`);
            });
        }

        // 15. Điều hướng liên kết chéo trên đầu Hồ sơ (Cross-module quick actions)
        document.querySelector('.btn-link-service')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = customerDatabase[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const presetBooking = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || '',
                petName: (cust.pets && cust.pets.length > 0) ? cust.pets[0].name : '',
                pets: cust.pets || []
            };
            sessionStorage.setItem('pawpal_admin_booking_preset', JSON.stringify(presetBooking));
            showToast(`Đã thiết lập thông tin đặt lịch cho ${cust.name}, chuyển sang phân hệ Dịch vụ!`);
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
            if (btn) btn.click();
        });

        document.querySelector('.btn-link-order')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = customerDatabase[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const defaultAddr = cust.addresses?.find(a => a.isDefault)?.address || cust.addresses?.[0]?.address || '';
            const presetOrder = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || '',
                address: defaultAddr
            };
            sessionStorage.setItem('pawpal_admin_order_preset', JSON.stringify(presetOrder));
            sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
            sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
            showToast(`Đã thiết lập thông tin lên đơn cho ${cust.name}, chuyển sang phân hệ Bán hàng!`);
            setTimeout(() => {
                window.location.hash = '#tab-order-list';
            }, 300);
        });

        document.querySelector('.btn-link-complaint')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = customerDatabase[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const presetComplaint = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || ''
            };
            sessionStorage.setItem('pawpal_admin_complaint_preset', JSON.stringify(presetComplaint));
            showToast(`Mở phiếu tiếp nhận khiếu nại cho ${cust.name} tại phân hệ Khiếu nại!`);
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
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
        const filterStatusSelect = document.getElementById('custFilterStatus');
        const filterTierSelect = document.getElementById('custFilterTier');
        const btnFilterComplaint = document.getElementById('btnFilterComplaintOnly');
        const btnComplaintStripFilter = document.getElementById('btnFilterComplaintQuick');
        const searchInput = document.getElementById('custSearchInput');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (filterStatusSelect) {
            filterStatusSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'ALL') currentCustomerFilter = 'ALL';
                else if (val === 'ACTIVE') currentCustomerFilter = 'MEMBER';
                else if (val === 'TEMP') currentCustomerFilter = 'TEMP';
                else if (val === 'LOCKED') currentCustomerFilter = 'LOCKED';
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (filterTierSelect) {
            filterTierSelect.addEventListener('change', () => {
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (btnFilterComplaint) {
            btnFilterComplaint.addEventListener('click', () => {
                if (currentCustomerFilter === 'COMPLAINT') {
                    currentCustomerFilter = 'ALL';
                    btnFilterComplaint.classList.remove('active');
                } else {
                    currentCustomerFilter = 'COMPLAINT';
                    btnFilterComplaint.classList.add('active');
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (btnComplaintStripFilter) {
            btnComplaintStripFilter.addEventListener('click', () => {
                currentCustomerFilter = 'COMPLAINT';
                if (btnFilterComplaint) btnFilterComplaint.classList.add('active');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => {
                    c.classList.toggle('active', c.getAttribute('data-kpi-filter') === 'COMPLAINT');
                });
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-kpi-filter');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                currentCustomerFilter = filter;
                if (btnFilterComplaint) {
                    btnFilterComplaint.classList.toggle('active', filter === 'COMPLAINT');
                }
                if (filterStatusSelect) {
                    if (filter === 'ALL') filterStatusSelect.value = 'ALL';
                    else if (filter === 'LOCKED') filterStatusSelect.value = 'LOCKED';
                    else if (filter === 'TEMP') filterStatusSelect.value = 'TEMP';
                    else if (filter === 'MEMBER') filterStatusSelect.value = 'ACTIVE';
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        });

        // ====================================================================
        // XUẤT BÁO CÁO DỮ LIỆU KHÁCH HÀNG VÀ LỊCH SỬ PAWPOINT (CSV / EXCEL UTF-8 BOM)
        // ====================================================================
        function exportCustomersToCSV() {
            const allCusts = Object.values(customerDatabase);
            if (!allCusts || allCusts.length === 0) {
                showToast('Không có dữ liệu khách hàng để xuất!', 'warning');
                return;
            }

            const headers = [
                'Mã khách hàng',
                'Họ và tên',
                'Số điện thoại',
                'Email',
                'Giới tính',
                'Ngày sinh',
                'Hạng thành viên',
                'Điểm Pawpoint',
                'Trạng thái tài khoản',
                'Số lượng thú cưng',
                'Danh sách thú cưng',
                'Địa chỉ mặc định',
                'Ghi chú'
            ];

            const rows = allCusts.map(c => {
                const petsList = (c.pets || []).map(p => `${p.name} (${p.species || 'Chó/Mèo'})`).join('; ');
                const defaultAddr = (c.addresses || []).find(a => a.isDefault)?.address || (c.addresses?.[0]?.address || '');
                const statusText = c.status === 'ACTIVE' ? 'Đang hoạt động' : (c.status === 'TEMP' ? 'Tài khoản tạm' : 'Bị khóa');

                return [
                    c.id || '',
                    c.name || '',
                    c.phone || '',
                    c.email || '',
                    c.gender || '',
                    c.dob || '',
                    c.tierName || c.tier || '',
                    c.points || 0,
                    statusText,
                    (c.pets || []).length,
                    petsList,
                    defaultAddr,
                    c.note || ''
                ];
            });

            const csvRows = [
                headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ];

            const csvContent = '\uFEFF' + csvRows.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            link.setAttribute('href', url);
            link.setAttribute('download', `Pawpal_Danh_Sach_Khach_Hang_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast(`Đã xuất báo cáo ${allCusts.length} khách hàng thành công ra file CSV!`);
        }

        function exportPawpointHistoryToCSV() {
            if (!pawpointHistory || pawpointHistory.length === 0) {
                showToast('Không có lịch sử điểm để xuất!', 'warning');
                return;
            }

            const headers = [
                'Mã giao dịch',
                'Thời gian',
                'Mã khách hàng',
                'Tên khách hàng',
                'Số điện thoại',
                'Loại giao dịch',
                'Số điểm',
                'Số dư sau giao dịch',
                'Lý do điều chỉnh'
            ];

            const rows = pawpointHistory.map(item => [
                item.id || '',
                item.time || '',
                item.custId || '',
                item.custName || '',
                item.phone || '',
                item.type === 'ADD' ? 'Cộng điểm' : 'Trừ điểm',
                (item.type === 'ADD' ? '+' : '-') + item.points + ' pts',
                Number(item.balance).toLocaleString('vi-VN') + ' pts',
                item.reason || ''
            ]);

            const csvRows = [
                headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ];

            const csvContent = '\uFEFF' + csvRows.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            link.setAttribute('href', url);
            link.setAttribute('download', `Pawpal_Lich_Su_Pawpoint_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast(`Đã xuất lịch sử ${pawpointHistory.length} giao dịch Pawpoint ra file CSV!`);
        }

        document.getElementById('btnExportCustomerReport')?.addEventListener('click', exportCustomersToCSV);
        document.getElementById('btnExportPawpointHistory')?.addEventListener('click', exportPawpointHistoryToCSV);

        const pawpointSearchInput = document.getElementById('pawpointSearchInput');
        if (pawpointSearchInput) {
            pawpointSearchInput.addEventListener('input', renderPawpointHistory);
        }
        const pawpointFilterType = document.getElementById('pawpointFilterType');
        if (pawpointFilterType) {
            pawpointFilterType.addEventListener('change', renderPawpointHistory);
        }

        // Khởi tạo render bảng, 5 thẻ KPI và lịch sử Pawpoint
        renderCustomersTable();
        updateCustomerKPIs();
        renderPawpointHistory();
        syncCustomerDatabaseFromSources();

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
