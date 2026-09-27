// orders.js - Phân hệ Quản lý Bán hàng Pawpal-er
(function() {
    // Dữ liệu mẫu đơn hàng chuẩn (kế thừa từ data/orders.json)
    const initialOrders = [
        {
            id: 'ORD-2026-001',
            userId: 'USER-001',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            status: 'shipping',
            paymentStatus: 'unpaid',
            paymentMethod: 'cod',
            carrier: 'J&T Express',
            trackingNumber: 'JT123456789',
            createdAt: '2026-06-10T14:30:00',
            subtotal: 850000,
            shippingFee: 30000,
            discount: 0,
            pawPointsUsed: 0,
            total: 880000,
            customerNote: 'Giao hàng giờ hành chính, gọi trước khi đến.',
            internalNote: 'Đã xác nhận địa chỉ và kiểm tra hạn sử dụng túi thức ăn còn trên 12 tháng.',
            alertType: null,
            products: [
                {
                    sku: 'TP-HAT-01',
                    name: 'Thức ăn hạt cao cấp Royal Canin Mother và Babycat',
                    spec: 'Túi 2kg',
                    price: 225000,
                    quantity: 2,
                    total: 450000,
                    image: '/assets/images/shop/products/tp-hat-01.png'
                },
                {
                    sku: 'DD-DOCHOI-01',
                    name: 'Đồ chơi gặm xương cao su tự nhiên an toàn',
                    spec: 'Màu cam',
                    price: 400000,
                    quantity: 1,
                    total: 400000,
                    image: '/assets/images/shop/products/pk-dochoi-01.jpg'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '14:30 - 10/06/2026', desc: 'Đơn hàng được đặt qua Website PawPal', done: true },
                { title: 'Đã xác nhận đơn hàng', time: '15:00 - 10/06/2026', desc: 'Nhân viên kho đã kiểm tra tồn và xuất phiếu nhặt hàng', done: true },
                { title: 'Đã bàn giao vận chuyển', time: '09:00 - 11/06/2026', desc: 'Bàn giao cho J&T Express. Mã vận đơn: JT123456789', done: true },
                { title: 'Đang giao hàng', time: '10:30 - 11/06/2026', desc: 'Bưu tá đang trên đường giao đến người nhận', done: true },
                { title: 'Giao hàng thành công', time: 'Dự kiến hôm nay', desc: 'Chờ người nhận kiểm tra hàng và ký nhận', done: false }
            ]
        },
        {
            id: 'ORD-2026-002',
            userId: 'USER-002',
            customerName: 'Trần Minh Quân',
            phone: '0912345678',
            address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: 'vnpay',
            carrier: 'Viettel Post',
            trackingNumber: 'VP992831201',
            createdAt: '2026-06-08T10:15:00',
            subtotal: 540000,
            shippingFee: 0,
            discount: 50000,
            pawPointsUsed: 500,
            total: 490000,
            customerNote: 'Gửi hàng gói cẩn thận tránh móp hộp.',
            internalNote: 'Đơn hoàn tất tốt, khách đã tích lũy thêm 49 điểm Pawpoint.',
            alertType: null,
            products: [
                {
                    sku: 'TP-PATE-02',
                    name: 'Pate lon hỗn hợp cá hồi và gà chín mềm King\'s Pet',
                    spec: 'Lon 180g',
                    price: 45000,
                    quantity: 12,
                    total: 540000,
                    image: '/assets/images/shop/products/TP-PATE-02.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '10:15 - 08/06/2026', desc: 'Thanh toán trực tuyến VNPay thành công', done: true },
                { title: 'Đã xác nhận đơn hàng', time: '10:45 - 08/06/2026', desc: 'Nhân viên kho đóng gói hàng', done: true },
                { title: 'Đã bàn giao vận chuyển', time: '14:00 - 08/06/2026', desc: 'Viettel Post tiếp nhận kiện hàng', done: true },
                { title: 'Giao hàng thành công', time: '11:00 - 09/06/2026', desc: 'Khách hàng đã nhận đủ hàng và hài lòng', done: true }
            ]
        },
        {
            id: 'ORD-2026-003',
            userId: 'USER-003',
            customerName: 'Hoàng Hải Yến',
            phone: '0987654321',
            address: '78 Hai Bà Trưng, Phường 6, Quận 3, TP. Hồ Chí Minh',
            status: 'returned',
            paymentStatus: 'paid',
            paymentMethod: 'momo',
            carrier: 'GHTK',
            trackingNumber: 'GHTK8829103',
            createdAt: '2026-06-07T16:00:00',
            subtotal: 950000,
            shippingFee: 35000,
            discount: 0,
            pawPointsUsed: 0,
            total: 985000,
            customerNote: '',
            internalNote: 'Đang có khiếu nại RMA-2026-001: Khách báo máy lọc nước bị nứt đế.',
            alertType: 'danger',
            alertMessage: 'Có khiếu nại đổi trả (RMA-2026-001)',
            products: [
                {
                    sku: 'DD-MAY-03',
                    name: 'Đài phun nước lọc tự động thông minh Petkit Eversweet 3',
                    spec: 'Màu trắng 1.35L',
                    price: 950000,
                    quantity: 1,
                    total: 950000,
                    image: '/assets/images/shop/products/DD-MAY-03.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '16:00 - 07/06/2026', desc: 'Thanh toán MoMo thành công', done: true },
                { title: 'Đã giao hàng', time: '15:00 - 08/06/2026', desc: 'Giao hàng thành công', done: true },
                { title: 'Tiếp nhận yêu cầu đổi trả', time: '17:30 - 08/06/2026', desc: 'Khách tạo yêu cầu đổi trả vì hàng bị móp nứt trong quá trình vận chuyển', done: true }
            ]
        },
        {
            id: 'ORD-2026-004',
            userId: 'USER-004',
            customerName: 'Nguyễn Văn Hùng',
            phone: '0933445566',
            address: '15 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP. Hồ Chí Minh',
            status: 'pending',
            paymentStatus: 'unpaid',
            paymentMethod: 'cod',
            carrier: 'Chưa phân công',
            trackingNumber: '--',
            createdAt: '2026-06-12T08:15:00',
            subtotal: 560000,
            shippingFee: 25000,
            discount: 0,
            pawPointsUsed: 0,
            total: 585000,
            customerNote: 'Khách vừa gọi điện xin hủy đơn do mua nhầm phân loại cho chó con.',
            internalNote: 'Chờ duyệt yêu cầu hủy trước khi chuyển kho nhặt hàng.',
            alertType: 'danger',
            alertMessage: 'Khách yêu cầu hủy đơn',
            products: [
                {
                    sku: 'TP-HAT-06',
                    name: 'Thức ăn hạt Taste of the Wild High Prairie cho chó',
                    spec: 'Túi 2.0kg',
                    price: 280000,
                    quantity: 2,
                    total: 560000,
                    image: '/assets/images/shop/products/TP-HAT-06.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '08:15 - 12/06/2026', desc: 'Khách đặt trực tuyến qua website', done: true },
                { title: 'Yêu cầu hủy đơn hàng', time: '08:45 - 12/06/2026', desc: 'Khách yêu cầu hủy đơn qua tổng đài chăm sóc khách hàng', done: true }
            ]
        },
        {
            id: 'ORD-2026-005',
            userId: 'USER-005',
            customerName: 'Phạm Thu Thảo',
            phone: '0944556677',
            address: '89 Cách Mạng Tháng 8, Phường 7, Quận Tân Bình, TP. Hồ Chí Minh',
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentMethod: 'bank_transfer',
            carrier: 'Đội giao PawPal',
            trackingNumber: 'PW-SHIP-012',
            createdAt: '2026-06-12T09:00:00',
            subtotal: 370000,
            shippingFee: 0,
            discount: 30000,
            pawPointsUsed: 300,
            total: 340000,
            customerNote: 'Giao trước 17h chiều nay giúp mình nhé.',
            internalNote: 'Kho đã in phiếu nhặt hàng và chuẩn bị đóng gói.',
            alertType: null,
            products: [
                {
                    sku: 'TP-SUP-11',
                    name: 'Gel dinh dưỡng Virbac Nutri-Plus Gel phục hồi sức khỏe',
                    spec: 'Tuýp 120.5g',
                    price: 240000,
                    quantity: 1,
                    total: 240000,
                    image: '/assets/images/shop/products/TP-SUP-11.png'
                },
                {
                    sku: 'TP-HAT-04',
                    name: 'Thức ăn hạt Whiskas vị cá biển thơm ngon cho mèo lớn',
                    spec: 'Túi 1.2kg',
                    price: 130000,
                    quantity: 1,
                    total: 130000,
                    image: '/assets/images/shop/products/TP-HAT-04.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '09:00 - 12/06/2026', desc: 'Đã nhận chuyển khoản ngân hàng Vietcombank', done: true },
                { title: 'Đã xác nhận đơn hàng', time: '09:20 - 12/06/2026', desc: 'Kho đang chuẩn bị hàng', done: true }
            ]
        },
        {
            id: 'ORD-2026-006',
            userId: 'USER-006',
            customerName: 'Vũ Đức Thịnh',
            phone: '0977889900',
            address: '320 Huỳnh Tấn Phát, Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh',
            status: 'cancelled',
            paymentStatus: 'unpaid',
            paymentMethod: 'cod',
            carrier: '--',
            trackingNumber: '--',
            createdAt: '2026-06-09T11:20:00',
            subtotal: 195000,
            shippingFee: 30000,
            discount: 0,
            pawPointsUsed: 0,
            total: 225000,
            customerNote: '',
            internalNote: 'Đã gọi 3 lần không nghe máy xác nhận, hệ thống tự động hủy đơn sau 24h.',
            alertType: null,
            products: [
                {
                    sku: 'TP-SUP-10',
                    name: 'Dầu cá hồi Na Uy dưỡng lông ép lạnh tinh khiết',
                    spec: 'Chai 150ml',
                    price: 185000,
                    quantity: 1,
                    total: 185000,
                    image: '/assets/images/shop/products/TP-SUP-10.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '11:20 - 09/06/2026', desc: 'Khách đặt trực tuyến COD', done: true },
                { title: 'Đã hủy đơn hàng', time: '11:25 - 10/06/2026', desc: 'Lý do: Không liên lạc được xác nhận', done: true }
            ]
        },
        {
            id: 'ORD-2026-007',
            userId: 'USER-007',
            customerName: 'Đặng Ngọc Ánh',
            phone: '0909988776',
            address: '12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
            status: 'pending',
            paymentStatus: 'unpaid',
            paymentMethod: 'vnpay',
            carrier: 'Chưa phân công',
            trackingNumber: '--',
            createdAt: '2026-06-12T07:45:00',
            subtotal: 700000,
            shippingFee: 0,
            discount: 0,
            pawPointsUsed: 0,
            total: 700000,
            customerNote: 'Đã trừ tiền ngân hàng nhưng đơn vẫn chưa báo thành công.',
            internalNote: 'Đang đối soát mã giao dịch VNPay 14298192 với cổng thanh toán.',
            alertType: 'warning',
            alertMessage: 'Chờ đối soát thanh toán VNPay',
            products: [
                {
                    sku: 'TP-HAT-05',
                    name: 'Thức ăn hạt không ngũ cốc Orijen Fit và Trim cho mèo',
                    spec: 'Túi 1.8kg',
                    price: 350000,
                    quantity: 2,
                    total: 700000,
                    image: '/assets/images/shop/products/TP-HAT-05.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '07:45 - 12/06/2026', desc: 'Chờ xác nhận giao dịch VNPay', done: true }
            ]
        }
    ];

    // Dữ liệu sản phẩm mẫu (kế thừa từ data/sanpham.csv)
    const initialProducts = [
        { sku: 'TP-HAT-01', name: 'Thức ăn hạt cao cấp Royal Canin Mother và Babycat', category: 'Thức ăn khô', brand: 'Royal Canin', price: 200000, stock: 45, minStock: 5, status: 'Còn hàng' },
        { sku: 'TP-PATE-02', name: 'Pate lon hỗn hợp cá hồi và gà chín mềm King\'s Pet', category: 'Thức ăn ướt', brand: 'King\'s Pet', price: 45000, stock: 120, minStock: 10, status: 'Còn hàng' },
        { sku: 'TP-SUP-03', name: 'Súp thưởng Ciao Churu vị cá ngừ thanh mát', category: 'Thức ăn ướt', brand: 'Inaba Ciao', price: 55000, stock: 3, minStock: 5, status: 'Sắp hết' },
        { sku: 'TP-HAT-04', name: 'Thức ăn hạt Whiskas vị cá biển thơm ngon cho mèo lớn', category: 'Thức ăn khô', brand: 'Whiskas', price: 130000, stock: 0, minStock: 5, status: 'Hết hàng' },
        { sku: 'TP-HAT-05', name: 'Thức ăn hạt không ngũ cốc Orijen Fit và Trim cho mèo', category: 'Thức ăn khô', brand: 'Orijen', price: 350000, stock: 22, minStock: 3, status: 'Còn hàng' },
        { sku: 'TP-HAT-06', name: 'Thức ăn hạt Taste of the Wild High Prairie cho chó', category: 'Thức ăn khô', brand: 'Taste of the Wild', price: 280000, stock: 15, minStock: 4, status: 'Còn hàng' },
        { sku: 'TP-PATE-07', name: 'Pate tươi vị bò và rau củ dinh dưỡng PawPal Home-cooked', category: 'Thức ăn ướt', brand: 'PawPal', price: 65000, stock: 50, minStock: 10, status: 'Còn hàng' },
        { sku: 'TP-SUP-10', name: 'Dầu cá hồi Na Uy dưỡng lông ép lạnh hồi phục da', category: 'Sức khỏe', brand: 'PawPal', price: 185000, stock: 35, minStock: 5, status: 'Còn hàng' },
        { sku: 'TP-SUP-11', name: 'Gel dinh dưỡng Virbac Nutri-Plus Gel phục hồi sức khỏe', category: 'Sức khỏe', brand: 'Virbac', price: 240000, stock: 28, minStock: 5, status: 'Còn hàng' },
        { sku: 'DD-BAT-01', name: 'Bát ăn đôi bằng inox đế nhựa PP cao cấp chống kiến bò', category: 'Bát ăn', brand: 'OEM', price: 85000, stock: 25, minStock: 3, status: 'Còn hàng' },
        { sku: 'DD-MAY-03', name: 'Đài phun nước lọc tự động thông minh Petkit Eversweet 3', category: 'Bát ăn', brand: 'Petkit', price: 950000, stock: 0, minStock: 2, status: 'Tạm ngưng' }
    ];

    // Dữ liệu khuyến mãi và voucher mẫu
    const initialVouchers = [
        { code: 'PAWNEW10', title: 'Chào mừng thành viên mới giảm 10%', discount: '10% (Tối đa 50k)', minOrder: '200.000 đ', points: 'Miễn phí', expiry: '31/12/2026', used: '142 / 500', status: 'Đang chạy' },
        { code: 'FREESHIP50K', title: 'Miễn phí giao hàng đơn từ 300k', discount: '30.000 đ', minOrder: '300.000 đ', points: '200 điểm', expiry: '30/06/2026', used: '89 / 200', status: 'Đang chạy' },
        { code: 'VIPGOLD50', title: 'Tri ân khách hàng hạng Vàng', discount: '50.000 đ', minOrder: '500.000 đ', points: '500 điểm', expiry: '31/12/2026', used: '28 / 100', status: 'Đang chạy' },
        { code: 'PAWPOINT100', title: 'Đổi điểm thưởng Pawpoint lấy voucher 100k', discount: '100.000 đ', minOrder: '800.000 đ', points: '1.000 điểm', expiry: '15/07/2026', used: '64 / 100', status: 'Sắp hết' }
    ];

    let currentOrdersList = [...initialOrders];
    let selectedOrderId = 'ORD-2026-001';
    let currentFilterStatus = 'ALL';
    let currentFilterPayment = 'ALL';
    let currentFilterPayStatus = 'ALL';
    let filterComplaintOnly = false;
    let filterUrgentOnly = false;
    let activeActionOrderId = null;
    let renderOrderDetailRef = null;

    function formatVND(amount) {
        return (amount || 0).toLocaleString('vi-VN') + ' đ';
    }

    function initOrdersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 4 Sub-tabs trên Header Bar (Thuần chữ, phân tách bằng |, không icon)
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-order-list">Đơn hàng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-order-detail">Hồ sơ đơn</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-order-products">Sản phẩm và Kho</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-order-promos">Khuyến mãi</button>
            `;
        }

        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(orderId) {
            if (!deepBreadcrumbEl) return;
            if (orderId) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${orderId}</span>
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

            if (targetSubtab === 'tab-order-detail') {
                updateBreadcrumb(selectedOrderId);
            } else {
                updateBreadcrumb('');
            }

            sessionStorage.setItem('pawpal_admin_order_subtab', targetSubtab);
            window.location.hash = targetSubtab;
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-subtab');
                switchSubtab(target);
            });
        });

        // 2. Render bảng danh sách đơn hàng
        function renderOrdersTable() {
            const tbody = document.getElementById('ordersTableBody');
            if (!tbody) return;

            const searchVal = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();

            const filtered = currentOrdersList.filter(o => {
                if (currentFilterStatus !== 'ALL' && o.status !== currentFilterStatus) return false;
                if (currentFilterPayment !== 'ALL' && o.paymentMethod !== currentFilterPayment) return false;
                if (currentFilterPayStatus !== 'ALL' && o.paymentStatus !== currentFilterPayStatus) return false;
                if (filterComplaintOnly && o.status !== 'returned' && o.alertType !== 'danger') return false;
                if (filterUrgentOnly && !o.alertType) return false;

                if (searchVal) {
                    const matchId = o.id.toLowerCase().includes(searchVal);
                    const matchName = o.customerName.toLowerCase().includes(searchVal);
                    const matchPhone = o.phone.includes(searchVal);
                    const matchTrack = (o.trackingNumber || '').toLowerCase().includes(searchVal);
                    if (!matchId && !matchName && !matchPhone && !matchTrack) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 36px; color: var(--text-muted);">
                            <div>Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.</div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = filtered.map(o => {
                let statusBadge = '';
                if (o.status === 'pending') statusBadge = '<span class="admin-badge badge-pending">Chờ xác nhận</span>';
                else if (o.status === 'confirmed') statusBadge = '<span class="admin-badge badge-confirmed">Đang chuẩn bị</span>';
                else if (o.status === 'shipping') statusBadge = '<span class="admin-badge badge-shipping">Đang giao</span>';
                else if (o.status === 'delivered') statusBadge = '<span class="admin-badge badge-delivered">Đã giao</span>';
                else if (o.status === 'completed') statusBadge = '<span class="admin-badge badge-completed">Hoàn tất</span>';
                else if (o.status === 'cancelled') statusBadge = '<span class="admin-badge badge-cancelled">Đã hủy</span>';
                else if (o.status === 'returned') statusBadge = '<span class="admin-badge badge-cancelled">Đổi trả</span>';

                let payBadge = o.paymentStatus === 'paid' 
                    ? '<span class="admin-badge badge-paid">Đã thanh toán</span>' 
                    : '<span class="admin-badge badge-unpaid">Chưa thanh toán</span>';

                let rowAlertClass = '';
                let alertLabel = '<span style="color: var(--text-muted); font-size: 12px;">--</span>';
                if (o.alertType === 'danger') {
                    rowAlertClass = 'row-alert-danger';
                    alertLabel = `<span class="admin-badge badge-alert">${o.alertMessage || 'Cần xử lý'}</span>`;
                } else if (o.alertType === 'warning') {
                    rowAlertClass = 'row-alert-warning';
                    alertLabel = `<span class="admin-badge badge-warning">${o.alertMessage || 'Lưu ý'}</span>`;
                }

                if (o.status === 'cancelled') {
                    rowAlertClass += ' row-locked';
                }

                const firstProd = o.products[0];
                const moreCount = o.products.length - 1;
                const prodSummary = firstProd ? (firstProd.name + (moreCount > 0 ? ` (+${moreCount} món)` : '')) : '--';

                let payMethodLabel = 'COD';
                if (o.paymentMethod === 'vnpay') payMethodLabel = 'VNPay';
                else if (o.paymentMethod === 'momo') payMethodLabel = 'MoMo';
                else if (o.paymentMethod === 'bank_transfer') payMethodLabel = 'Chuyển khoản';

                return `
                    <tr class="${rowAlertClass}">
                        <td>
                            <a href="javascript:void(0)" class="order-code-link" onclick="PawpalOrdersModule.openOrderDetail('${o.id}')">${o.id}</a>
                        </td>
                        <td>
                            <div>
                                <span class="user-name-link" onclick="PawpalOrdersModule.openCustomerProfile('${o.userId}')">${o.customerName}</span>
                                <div class="sub-meta-text">${o.phone}</div>
                            </div>
                        </td>
                        <td style="max-width: 240px;">
                            <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${prodSummary}">${prodSummary}</div>
                            <div class="sub-meta-text">Tổng: ${o.products.reduce((acc, p) => acc + p.quantity, 0)} sản phẩm</div>
                        </td>
                        <td>
                            <div class="price-text-main">${formatVND(o.total)}</div>
                        </td>
                        <td>
                            <div>${payMethodLabel}</div>
                            <div style="margin-top: 2px;">${payBadge}</div>
                        </td>
                        <td>
                            <div>${o.carrier || '--'}</div>
                            <div class="sub-meta-text" style="font-family: monospace;">${o.trackingNumber || '--'}</div>
                        </td>
                        <td>${statusBadge}</td>
                        <td>${alertLabel}</td>
                        <td style="text-align: center;">
                            <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openActionDropdown(event, '${o.id}')">•••</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 3. Render chi tiết đơn hàng
        function renderOrderDetail(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId) || currentOrdersList[0];
            if (!order) return;

            selectedOrderId = order.id;

            // Header bar
            const codeEl = document.getElementById('detailOrderCode');
            const metaEl = document.getElementById('detailOrderMeta');
            const actionBtnsEl = document.getElementById('detailOrderActionButtons');

            if (codeEl) codeEl.textContent = order.id;
            if (metaEl) {
                const dateObj = new Date(order.createdAt);
                metaEl.textContent = `Đặt lúc: ${dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${dateObj.toLocaleDateString('vi-VN')} | Kênh đặt: Website PawPal`;
            }

            // Nút thao tác một chạm theo trạng thái
            if (actionBtnsEl) {
                let btnsHtml = '';
                if (order.status === 'pending') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openCancelModal('${order.id}')" style="color: #DC2626;">Hủy đơn</button>
                        <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.confirmOrder('${order.id}')">Xác nhận đơn</button>
                    `;
                } else if (order.status === 'confirmed') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printPackingSlip('${order.id}')">In phiếu đóng gói</button>
                        <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Bàn giao vận chuyển</button>
                    `;
                } else if (order.status === 'shipping') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Cập nhật vận đơn</button>
                        <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeDelivery('${order.id}')">Đã giao hàng thành công</button>
                    `;
                } else if (order.status === 'delivered') {
                    if (order.paymentStatus === 'unpaid') {
                        btnsHtml += `
                            <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.confirmPayment('${order.id}')">Xác nhận thu tiền COD</button>
                        `;
                    }
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
                        <button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeOrder('${order.id}')">Hoàn tất đơn hàng</button>
                    `;
                } else if (order.status === 'completed') {
                    btnsHtml += `
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printInvoice('${order.id}')">In hóa đơn</button>
                        <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại và Đổi trả</button>
                    `;
                }
                actionBtnsEl.innerHTML = btnsHtml;
            }

            // Danh sách sản phẩm
            const itemsTbody = document.getElementById('detailOrderItemsBody');
            if (itemsTbody) {
                itemsTbody.innerHTML = order.products.map(p => `
                    <tr>
                        <td>
                            <div class="prod-item-row">
                                <img src="${p.image}" alt="${p.name}" class="prod-thumb" onerror="this.src='/assets/images/shop/products/tp-hat-01.png'">
                                <div class="prod-info-cell">
                                    <span class="prod-title">${p.name}</span>
                                    <span class="prod-sku-tag">Quy cách: ${p.spec || 'Tiêu chuẩn'}</span>
                                </div>
                            </div>
                        </td>
                        <td style="font-family: monospace; color: var(--text-muted);">${p.sku}</td>
                        <td>${formatVND(p.price)}</td>
                        <td style="text-align: center; font-weight: 600;">${p.quantity}</td>
                        <td style="text-align: right; font-weight: 700; color: var(--text-heading);">${formatVND(p.total)}</td>
                    </tr>
                `).join('');
            }

            // Bảng kê thanh toán
            const subtotalEl = document.getElementById('detailSummarySubtotal');
            const shipEl = document.getElementById('detailSummaryShipping');
            const voucherEl = document.getElementById('detailSummaryVoucher');
            const pointsEl = document.getElementById('detailSummaryPoints');
            const totalEl = document.getElementById('detailSummaryTotal');

            if (subtotalEl) subtotalEl.textContent = formatVND(order.subtotal);
            if (shipEl) shipEl.textContent = formatVND(order.shippingFee);
            if (voucherEl) voucherEl.textContent = '- ' + formatVND(order.discount);
            if (pointsEl) pointsEl.textContent = '- ' + formatVND((order.pawPointsUsed || 0) * 100);
            if (totalEl) totalEl.textContent = formatVND(order.total);

            // Ghi chú
            const custNoteEl = document.getElementById('detailCustomerNote');
            const intNoteEl = document.getElementById('detailInternalNote');
            if (custNoteEl) custNoteEl.textContent = order.customerNote ? `"${order.customerNote}"` : '(Không có ghi chú)';
            if (intNoteEl) intNoteEl.textContent = order.internalNote || 'Chưa có ghi chú nội bộ.';

            // Giao nhận
            const recNameEl = document.getElementById('detailReceiverName');
            const recPhoneEl = document.getElementById('detailReceiverPhone');
            const recAddrEl = document.getElementById('detailReceiverAddress');
            const payMethodEl = document.getElementById('detailPaymentMethod');
            const payBadgeEl = document.getElementById('detailPaymentBadge');
            const carrierEl = document.getElementById('detailShippingCarrier');
            const trackingEl = document.getElementById('detailTrackingNumber');

            if (recNameEl) recNameEl.textContent = order.customerName;
            if (recPhoneEl) recPhoneEl.textContent = order.phone;
            if (recAddrEl) recAddrEl.textContent = order.address;
            if (payMethodEl) {
                let txt = 'Thanh toán tiền mặt khi nhận hàng (COD)';
                if (order.paymentMethod === 'vnpay') txt = 'Cổng thanh toán VNPay QR';
                else if (order.paymentMethod === 'momo') txt = 'Ví điện tử MoMo';
                else if (order.paymentMethod === 'bank_transfer') txt = 'Chuyển khoản trực tiếp ngân hàng Vietcombank';
                payMethodEl.textContent = txt;
            }
            if (payBadgeEl) {
                if (order.paymentStatus === 'paid') {
                    payBadgeEl.className = 'admin-badge badge-paid';
                    payBadgeEl.textContent = 'Đã thanh toán';
                } else {
                    payBadgeEl.className = 'admin-badge badge-unpaid';
                    payBadgeEl.textContent = 'Chưa thanh toán';
                }
            }
            if (carrierEl) carrierEl.textContent = order.carrier || 'Chưa phân công';
            if (trackingEl) trackingEl.textContent = order.trackingNumber || '--';

            // Timeline lịch trình
            const timelineListEl = document.getElementById('detailOrderTimeline');
            if (timelineListEl) {
                timelineListEl.innerHTML = order.timeline.map(t => `
                    <div class="timeline-step-item ${t.done ? '' : 'future'}">
                        <span class="timeline-step-title">${t.title}</span>
                        <span class="timeline-step-time">${t.time}</span>
                        <span class="timeline-step-desc">${t.desc}</span>
                    </div>
                `).join('');
            }
        }

        // 4. Render danh sách sản phẩm và kho
        function renderProductsTable() {
            const tbody = document.getElementById('productsTableBody');
            if (!tbody) return;

            const searchVal = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
            const catVal = document.getElementById('productFilterCategory')?.value || 'ALL';
            const stockVal = document.getElementById('productFilterStockStatus')?.value || 'ALL';

            const filtered = initialProducts.filter(p => {
                if (catVal !== 'ALL' && p.category !== catVal) return false;
                if (stockVal === 'LOW' && (p.stock > p.minStock || p.stock === 0)) return false;
                if (stockVal === 'OUT' && p.stock !== 0) return false;
                if (stockVal === 'IN_STOCK' && p.stock <= p.minStock) return false;

                if (searchVal) {
                    const matchName = p.name.toLowerCase().includes(searchVal);
                    const matchSku = p.sku.toLowerCase().includes(searchVal);
                    const matchBrand = p.brand.toLowerCase().includes(searchVal);
                    if (!matchName && !matchSku && !matchBrand) return false;
                }
                return true;
            });

            tbody.innerHTML = filtered.map(p => {
                let stockBadge = `<span class="stock-badge-ok">${p.stock}</span>`;
                let alertBadge = '<span style="color: var(--text-muted); font-size: 12px;">Bình thường</span>';

                if (p.stock === 0) {
                    stockBadge = '<span class="stock-badge-low">0</span>';
                    alertBadge = '<span class="admin-badge badge-alert">Hết hàng</span>';
                } else if (p.stock <= p.minStock) {
                    stockBadge = `<span class="stock-badge-low">${p.stock}</span>`;
                    alertBadge = '<span class="admin-badge badge-warning">Sắp hết</span>';
                }

                let statusBadge = p.status === 'Tạm ngưng' 
                    ? '<span class="admin-badge badge-cancelled">Tạm ngưng</span>' 
                    : '<span class="admin-badge badge-paid">Đang bán</span>';

                return `
                    <tr>
                        <td style="font-family: monospace; font-weight: 600; color: #236B48;">${p.sku}</td>
                        <td style="font-weight: 500;">${p.name}</td>
                        <td>${p.category}</td>
                        <td>${p.brand}</td>
                        <td style="font-weight: 600;">${formatVND(p.price)}</td>
                        <td>${stockBadge}</td>
                        <td>${alertBadge}</td>
                        <td>${statusBadge}</td>
                        <td style="text-align: center;">
                            <button type="button" class="btn-action-trigger" onclick="alert('Điều chỉnh tồn kho cho ${p.sku}')">•••</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 5. Render danh sách khuyến mãi
        function renderVouchersTable() {
            const tbody = document.getElementById('vouchersTableBody');
            if (!tbody) return;

            tbody.innerHTML = initialVouchers.map(v => `
                <tr>
                    <td><span class="voucher-code-pill">${v.code}</span></td>
                    <td style="font-weight: 500;">${v.title}</td>
                    <td style="font-weight: 600; color: #236B48;">${v.discount}</td>
                    <td>${v.minOrder}</td>
                    <td>${v.points}</td>
                    <td>${v.expiry}</td>
                    <td>${v.used}</td>
                    <td><span class="admin-badge badge-paid">${v.status}</span></td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger" onclick="alert('Tác vụ cho voucher ${v.code}')">•••</button>
                    </td>
                </tr>
            `).join('');
        }

        // Gắn sự kiện bộ lọc bảng đơn hàng
        document.getElementById('orderSearchInput')?.addEventListener('input', renderOrdersTable);
        document.getElementById('orderFilterStatus')?.addEventListener('change', (e) => {
            currentFilterStatus = e.target.value;
            renderOrdersTable();
        });
        document.getElementById('orderFilterPayment')?.addEventListener('change', (e) => {
            currentFilterPayment = e.target.value;
            renderOrdersTable();
        });
        document.getElementById('orderFilterPayStatus')?.addEventListener('change', (e) => {
            currentFilterPayStatus = e.target.value;
            renderOrdersTable();
        });

        document.getElementById('btnFilterComplaintOrders')?.addEventListener('click', function() {
            filterComplaintOnly = !filterComplaintOnly;
            this.classList.toggle('active', filterComplaintOnly);
            renderOrdersTable();
        });

        document.getElementById('btnFilterUrgentOrders')?.addEventListener('click', function() {
            filterUrgentOnly = !filterUrgentOnly;
            this.classList.toggle('active', filterUrgentOnly);
            renderOrdersTable();
        });

        // Bộ lọc bảng sản phẩm
        document.getElementById('productSearchInput')?.addEventListener('input', renderProductsTable);
        document.getElementById('productFilterCategory')?.addEventListener('change', renderProductsTable);
        document.getElementById('productFilterStockStatus')?.addEventListener('change', renderProductsTable);

        // Xuất file
        document.getElementById('btnExportOrderReport')?.addEventListener('click', () => {
            alert('Đã xuất báo cáo danh sách đơn hàng sang file Excel/CSV thành công.');
        });
        document.getElementById('btnExportProductStock')?.addEventListener('click', () => {
            alert('Đã xuất báo cáo kiểm kê kho hàng thành công.');
        });

        // Tạo đơn tại quầy
        document.getElementById('btnOpenCreateOrderModal')?.addEventListener('click', () => {
            document.getElementById('modalCreateOrder')?.classList.add('active');
        });
        document.getElementById('btnSubmitCreateOrder')?.addEventListener('click', () => {
            const phone = document.getElementById('createOrderPhone')?.value.trim();
            const name = document.getElementById('createOrderName')?.value.trim();
            const prodSelect = document.getElementById('createOrderProductSelect');
            const qty = parseInt(document.getElementById('createOrderQty')?.value || '1', 10);
            const payMethod = document.getElementById('createOrderPaymentMethod')?.value || 'cash';

            if (!phone || !name) {
                alert('Vui lòng nhập họ tên và số điện thoại người nhận.');
                return;
            }
            if (!prodSelect || !prodSelect.value) {
                alert('Vui lòng chọn ít nhất một sản phẩm để tạo đơn.');
                return;
            }

            const newCode = 'ORD-2026-00' + (currentOrdersList.length + 1);
            const opt = prodSelect.options[prodSelect.selectedIndex];
            const price = parseInt(opt.getAttribute('data-price') || '0', 10);

            const newOrder = {
                id: newCode,
                userId: 'USER-GUEST',
                customerName: name,
                phone: phone,
                address: 'Chi nhánh Quận 1, TP. Hồ Chí Minh',
                status: 'confirmed',
                paymentStatus: (payMethod === 'cod') ? 'unpaid' : 'paid',
                paymentMethod: payMethod,
                carrier: 'Tại quầy PawPal',
                trackingNumber: '--',
                createdAt: new Date().toISOString(),
                subtotal: price * qty,
                shippingFee: 0,
                discount: 0,
                pawPointsUsed: 0,
                total: price * qty,
                customerNote: 'Tạo đơn tại quầy',
                internalNote: 'Đơn bán trực tiếp tại cửa hàng',
                alertType: null,
                products: [
                    {
                        sku: prodSelect.value,
                        name: opt.text.split(' (Tồn:')[0],
                        spec: 'Tiêu chuẩn',
                        price: price,
                        quantity: qty,
                        total: price * qty,
                        image: '/assets/images/shop/products/tp-hat-01.png'
                    }
                ],
                timeline: [
                    { title: 'Tạo đơn hàng tại quầy', time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay', desc: 'Nhân viên thu ngân tiếp nhận và thu tiền', done: true }
                ]
            };

            currentOrdersList.unshift(newOrder);
            document.getElementById('modalCreateOrder')?.classList.remove('active');
            renderOrdersTable();
            alert(`Đã tạo thành công đơn hàng ${newCode}!`);
            PawpalOrdersModule.openOrderDetail(newCode);
        });

        // Bàn giao vận chuyển modal
        document.getElementById('btnSubmitShipOrder')?.addEventListener('click', () => {
            const tracking = document.getElementById('shipTrackingInput')?.value.trim();
            const carrier = document.getElementById('shipCarrierSelect')?.value;

            if (!tracking) {
                alert('Vui lòng nhập mã vận đơn bưu cục.');
                return;
            }

            const order = currentOrdersList.find(o => o.id === selectedOrderId);
            if (order) {
                order.status = 'shipping';
                order.carrier = carrier;
                order.trackingNumber = tracking;
                order.timeline.push({
                    title: 'Đã bàn giao vận chuyển',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: `Bàn giao cho ${carrier}. Mã vận đơn: ${tracking}`,
                    done: true
                });
            }

            document.getElementById('modalShipOrder')?.classList.remove('active');
            renderOrdersTable();
            renderOrderDetail(selectedOrderId);
            alert(`Đã cập nhật giao vận cho đơn ${selectedOrderId}!`);
        });

        // Hủy đơn modal
        document.getElementById('btnSubmitCancelOrder')?.addEventListener('click', () => {
            const reason = document.getElementById('cancelOrderReasonSelect')?.value;
            const detail = document.getElementById('cancelOrderReasonDetail')?.value.trim();

            const order = currentOrdersList.find(o => o.id === selectedOrderId);
            if (order) {
                order.status = 'cancelled';
                order.alertType = null;
                order.internalNote = (order.internalNote ? order.internalNote + ' | ' : '') + `Lý do hủy: ${reason} (${detail})`;
                order.timeline.push({
                    title: 'Đã hủy đơn hàng',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: `Hủy bởi nhân viên quản trị. Lý do: ${reason}`,
                    done: true
                });
            }

            document.getElementById('modalCancelOrder')?.classList.remove('active');
            renderOrdersTable();
            renderOrderDetail(selectedOrderId);
            alert(`Đã hủy đơn hàng ${selectedOrderId} và hoàn lại số lượng tồn kho.`);
        });

        // Đóng dropdown khi click ngoài
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('orderActionDropdown');
            if (popover && popover.classList.contains('active')) {
                if (!e.target.closest('.btn-action-trigger') && !e.target.closest('#orderActionDropdown')) {
                    popover.classList.remove('active');
                }
            }
        });

        // Gắn action cho popover menu
        document.getElementById('menuActionViewDetail')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.openOrderDetail(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionPrintPack')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.printPackingSlip(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionShipOrder')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.openShipModal(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionConfirmPayment')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.confirmPayment(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionCancelOrder')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.openCancelModal(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });

        // Render lần đầu
        renderOrdersTable();
        renderOrderDetail(selectedOrderId);
        renderProductsTable();
        renderVouchersTable();
        renderOrderDetailRef = renderOrderDetail;

        // Khôi phục subtab từ hash hoặc sessionStorage
        const savedSubtab = sessionStorage.getItem('pawpal_admin_order_subtab') || 
                            (window.location.hash ? window.location.hash.replace('#', '') : null);
        if (savedSubtab && document.getElementById(`subtab-${savedSubtab}`)) {
            switchSubtab(savedSubtab);
        }
    }

    // Xuất API công khai cho module Orders
    window.PawpalOrdersModule = {
        openOrderDetail: function(orderId) {
            selectedOrderId = orderId;
            const subtabBtn = document.querySelector('.header-subtab-btn[data-subtab="tab-order-detail"]');
            if (subtabBtn) subtabBtn.click();
            // Cập nhật lại giao diện chi tiết
            if (renderOrderDetailRef) {
                renderOrderDetailRef(orderId);
            }
        },
        openCustomerProfile: function(userId) {
            // Chuyển sang phân hệ Khách hàng
            sessionStorage.setItem('pawpal_admin_active_module', 'Khách hàng');
            sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
            const custBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khách hàng');
            if (custBtn) custBtn.click();
        },
        openShipModal: function(orderId) {
            selectedOrderId = orderId;
            const targetEl = document.getElementById('shipOrderTargetCode');
            if (targetEl) targetEl.textContent = orderId;
            document.getElementById('modalShipOrder')?.classList.add('active');
        },
        openCancelModal: function(orderId) {
            selectedOrderId = orderId;
            const targetEl = document.getElementById('cancelOrderTargetCode');
            if (targetEl) targetEl.textContent = orderId;
            document.getElementById('modalCancelOrder')?.classList.add('active');
        },
        closeModal: function(modalId) {
            document.getElementById(modalId)?.classList.remove('active');
        },
        confirmOrder: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (order) {
                order.status = 'confirmed';
                order.timeline.push({
                    title: 'Đã xác nhận đơn hàng',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: 'Nhân viên đã duyệt đơn và xuất kho đóng gói',
                    done: true
                });
                alert(`Đã xác nhận đơn hàng ${orderId}!`);
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        confirmPayment: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (order) {
                order.paymentStatus = 'paid';
                alert(`Đã xác nhận thu tiền cho đơn hàng ${orderId}!`);
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        completeDelivery: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (order) {
                order.status = 'delivered';
                order.timeline.push({
                    title: 'Đã giao hàng thành công',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: 'Bưu tá xác nhận khách đã nhận hàng',
                    done: true
                });
                alert(`Đã cập nhật trạng thái Đã giao cho đơn ${orderId}!`);
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        completeOrder: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (order) {
                order.status = 'completed';
                order.paymentStatus = 'paid';
                order.timeline.push({
                    title: 'Hoàn tất đơn hàng',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: 'Đơn hàng đã hoàn thành và tích điểm Pawpoint cho khách',
                    done: true
                });
                alert(`Đơn hàng ${orderId} đã hoàn tất thành công!`);
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        printPackingSlip: function(orderId) {
            alert(`Đang kết nối máy in để in Phiếu đóng gói (Packing Slip) cho đơn ${orderId}...`);
        },
        printInvoice: function(orderId) {
            alert(`Đang xuất hóa đơn bán lẻ PDF cho đơn ${orderId}...`);
        },
        openRmaTicket: function(orderId) {
            alert(`Chuyển sang phân hệ Khiếu nại (RMA Desk) để tạo yêu cầu đổi trả cho đơn ${orderId}...`);
        },
        openActionDropdown: function(e, orderId) {
            e.stopPropagation();
            activeActionOrderId = orderId;
            const popover = document.getElementById('orderActionDropdown');
            if (!popover) return;

            const rect = e.target.getBoundingClientRect();
            popover.style.top = `${rect.bottom + 4}px`;
            popover.style.left = `${rect.left - 130}px`;
            popover.classList.add('active');
        }
    };

    // Khởi tạo
    initOrdersModule();
})();
