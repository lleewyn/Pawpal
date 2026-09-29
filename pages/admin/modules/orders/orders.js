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
            slaMinutes: 48, // Quá hạn SLA 48 phút (> 30p)
            subtotal: 700000,
            shippingFee: 0,
            discount: 0,
            pawPointsUsed: 0,
            total: 700000,
            customerNote: 'Đã trừ tiền ngân hàng nhưng đơn vẫn chưa báo thành công.',
            internalNote: 'Đang đối soát mã giao dịch VNPay 14298192 với cổng thanh toán.',
            alertType: 'danger',
            alertMessage: 'Quá hạn SLA (48p) - Cần duyệt gấp',
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
        },
        {
            id: 'ORD-2026-008',
            userId: 'USER-008',
            customerName: 'Bùi Thanh Trúc',
            phone: '0981122334',
            address: '56 Hoàng Diệu, Phường 12, Quận 4, TP. Hồ Chí Minh',
            status: 'delivered',
            paymentStatus: 'cod_pending', // Đã giao hàng nhưng tiền COD chưa về
            paymentMethod: 'cod',
            carrier: 'J&T Express',
            trackingNumber: 'JT99281203',
            createdAt: '2026-06-11T13:00:00',
            subtotal: 650000,
            shippingFee: 30000,
            discount: 0,
            pawPointsUsed: 0,
            total: 680000,
            customerNote: 'Kiểm tra hàng trước khi nhận.',
            internalNote: 'Bưu tá J&T báo phát thành công, tiền thu hộ COD đang chờ bưu cục chuyển đợt thứ 6.',
            alertType: 'warning',
            alertMessage: 'Chờ đối soát COD (680.000 đ)',
            products: [
                {
                    sku: 'TP-HAT-01',
                    name: 'Thức ăn hạt cao cấp Royal Canin Mother và Babycat',
                    spec: 'Túi 2kg',
                    price: 200000,
                    quantity: 3,
                    total: 600000,
                    image: '/assets/images/shop/products/tp-hat-01.png'
                },
                {
                    sku: 'TP-PATE-02',
                    name: 'Pate lon hỗn hợp cá hồi và gà chín mềm King\'s Pet',
                    spec: 'Lon 180g',
                    price: 45000,
                    quantity: 1,
                    total: 45000,
                    image: '/assets/images/shop/products/TP-PATE-02.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '13:00 - 11/06/2026', desc: 'Đặt hàng COD trực tuyến', done: true },
                { title: 'Đã bàn giao vận chuyển', time: '15:00 - 11/06/2026', desc: 'J&T Express tiếp nhận', done: true },
                { title: 'Giao hàng thành công', time: '10:00 - 12/06/2026', desc: 'Khách đã nhận hàng và trả tiền mặt cho bưu tá', done: true },
                { title: 'Chờ đối soát tiền COD', time: '10:30 - 12/06/2026', desc: 'Tiền thu hộ 680.000 đ đang chờ J&T đối soát kỳ tuần', done: false }
            ]
        },
        {
            id: 'ORD-2026-009',
            userId: 'USER-009',
            customerName: 'Ngô Kiến Huy',
            phone: '0938887766',
            address: '205 Nguyễn Tri Phương, Phường 9, Quận 5, TP. Hồ Chí Minh',
            status: 'delivered',
            paymentStatus: 'cod_pending',
            paymentMethod: 'cod',
            carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
            trackingNumber: 'GHTK77881920',
            createdAt: '2026-06-11T16:20:00',
            subtotal: 1150000,
            shippingFee: 0,
            discount: 0,
            pawPointsUsed: 0,
            total: 1150000,
            customerNote: 'Giao giờ hành chính tại văn phòng.',
            internalNote: 'Đơn vị vận chuyển GHTK đã thu tiền, đang tổng hợp biên bản đối soát phiên ngày mai.',
            alertType: 'warning',
            alertMessage: 'Chờ đối soát COD (1.150.000 đ)',
            products: [
                {
                    sku: 'DD-MAY-03',
                    name: 'Đài phun nước lọc tự động thông minh Petkit Eversweet 3',
                    spec: 'Màu trắng 1.35L',
                    price: 950000,
                    quantity: 1,
                    total: 950000,
                    image: '/assets/images/shop/products/DD-MAY-03.png'
                },
                {
                    sku: 'TP-HAT-01',
                    name: 'Thức ăn hạt cao cấp Royal Canin Mother và Babycat',
                    spec: 'Túi 2kg',
                    price: 200000,
                    quantity: 1,
                    total: 200000,
                    image: '/assets/images/shop/products/tp-hat-01.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '16:20 - 11/06/2026', desc: 'Đặt hàng COD trực tuyến', done: true },
                { title: 'Đã bàn giao vận chuyển', time: '09:00 - 12/06/2026', desc: 'Bàn giao cho GHTK', done: true },
                { title: 'Giao hàng thành công', time: '14:30 - 12/06/2026', desc: 'Bưu tá thu đủ 1.150.000 đ tiền mặt', done: true },
                { title: 'Chờ đối soát tiền COD', time: '15:00 - 12/06/2026', desc: 'Chờ GHTK chuyển khoản đối soát doanh thu', done: false }
            ]
        },
        {
            id: 'ORD-2026-010',
            userId: 'USER-010',
            customerName: 'Lâm Bảo Châu',
            phone: '0903332211',
            address: '102 Phan Xích Long, Phường 2, Quận Phú Nhuận, TP. Hồ Chí Minh',
            status: 'pending',
            paymentStatus: 'paid',
            paymentMethod: 'momo',
            carrier: 'Chưa phân công',
            trackingNumber: '--',
            createdAt: '2026-06-12T10:45:00',
            slaMinutes: 12, // Mới đặt 12 phút (SLA An toàn)
            subtotal: 420000,
            shippingFee: 25000,
            discount: 0,
            pawPointsUsed: 0,
            total: 445000,
            customerNote: 'Gói hàng cẩn thận giúp mình nhé.',
            internalNote: 'Đơn mới thanh toán MoMo thành công, tồn kho còn đủ, sẵn sàng xác nhận.',
            alertType: null,
            products: [
                {
                    sku: 'TP-PATE-07',
                    name: 'Pate tươi vị bò và rau củ dinh dưỡng PawPal Home-cooked',
                    spec: 'Hộp 200g',
                    price: 65000,
                    quantity: 4,
                    total: 260000,
                    image: '/assets/images/shop/products/tp-hat-01.png'
                },
                {
                    sku: 'TP-SUP-10',
                    name: 'Dầu cá hồi Na Uy dưỡng lông ép lạnh hồi phục da',
                    spec: 'Chai 150ml',
                    price: 185000,
                    quantity: 1,
                    total: 185000,
                    image: '/assets/images/shop/products/TP-SUP-10.png'
                }
            ],
            timeline: [
                { title: 'Đặt hàng thành công', time: '10:45 - Hôm nay', desc: 'Đã thanh toán MoMo thành công', done: true },
                { title: 'Chờ xác nhận đơn', time: 'Đang chờ 12 phút', desc: 'Chờ nhân viên duyệt xuất kho', done: false }
            ]
        },
        {
            id: 'ORD-2026-011',
            userId: 'USER-011',
            customerName: 'Trịnh Thăng Bình',
            phone: '0918776655',
            address: '77 Pasteur, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            status: 'pending',
            paymentStatus: 'unpaid',
            paymentMethod: 'cod',
            carrier: 'Chưa phân công',
            trackingNumber: '--',
            createdAt: '2026-06-12T10:35:00',
            slaMinutes: 24, // Chờ duyệt 24 phút (Sắp chạm ngưỡng 30p)
            subtotal: 560000,
            shippingFee: 25000,
            discount: 0,
            pawPointsUsed: 0,
            total: 585000,
            customerNote: 'Giao trong sáng nay giúp mình.',
            internalNote: 'Khách VIP, cần gọi điện xác nhận nhanh.',
            alertType: 'warning',
            alertMessage: 'Chờ duyệt (24p)',
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
                { title: 'Đặt hàng thành công', time: '10:35 - Hôm nay', desc: 'Đơn đặt trực tuyến COD', done: true }
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
    let filterSlaOverdueOnly = false;
    let selectedBatchOrderIds = []; // Giai đoạn 2: Danh sách đơn chọn hàng loạt
    let activeActionOrderId = null;
    let activeAdjustProductSku = null;
    let activeActionVoucherCode = null;
    let renderOrderDetailRef = null;

    function formatVND(amount) {
        return (amount || 0).toLocaleString('vi-VN') + ' đ';
    }

    // -------------------------------------------------------------
    // GIAI ĐOẠN 2: HÀM TẠO PHIẾU ĐÓNG GÓI VÀ BẢNG KÊ VẬN CHUYỂN
    // -------------------------------------------------------------
    function generatePackingSlipHtml(order) {
        const isCod = order.paymentMethod === 'cod' && order.paymentStatus !== 'paid';
        const carrierName = order.carrier || 'Chưa bàn giao';
        const trackingCode = order.trackingNumber || ('PAW' + order.id.replace(/[^0-9]/g, ''));
        const dateFormatted = new Date(order.createdAt).toLocaleString('vi-VN');
        const customerAddr = order.shippingAddress || 'Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh';

        const itemsRows = (order.products || []).map((p, idx) => `
            <tr>
                <td style="width: 32px; text-align: center;">${idx + 1}</td>
                <td style="font-family: monospace; font-weight: 600;">${p.sku}</td>
                <td>
                    <div style="font-weight: 500;">${p.name}</div>
                    ${p.spec ? `<div class="sub-meta-text">${p.spec}</div>` : ''}
                </td>
                <td style="text-align: center; font-weight: 700; font-size: 14px; color: #236B48;">${p.quantity}</td>
                <td style="text-align: right;">${formatVND(p.price)}</td>
                <td style="text-align: right; font-weight: 600;">${formatVND(p.total || (p.price * p.quantity))}</td>
            </tr>
        `).join('');

        return `
            <div class="packing-slip-sheet">
                <div class="slip-header-block">
                    <div>
                        <div class="slip-brand-title">PAWPAL PET CARE</div>
                        <div class="slip-brand-sub">Hệ thống chăm sóc thú cưng toàn diện | Hotline: 1900-PAWPAL</div>
                        <div class="slip-brand-sub">Kho vận: 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
                    </div>
                    <div class="slip-tracking-box">
                        <div class="slip-barcode-text">*${order.id}*</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Mã vận đơn: <strong style="font-family: monospace; color: var(--text-main);">${trackingCode}</strong></div>
                        <div style="font-size: 11.5px; color: #236B48; font-weight: 600;">${carrierName}</div>
                    </div>
                </div>

                <div class="slip-info-grid">
                    <div class="slip-info-col">
                        <span class="slip-info-label">NGƯỜI NHẬN HÀNG:</span>
                        <span class="slip-info-val strong">${order.customerName} - ${order.phone}</span>
                        <span class="slip-info-val">${customerAddr}</span>
                    </div>
                    <div class="slip-info-col">
                        <span class="slip-info-label">THÔNG TIN ĐƠN HÀNG:</span>
                        <span class="slip-info-val">Mã đơn: <strong style="color: #236B48;">${order.id}</strong> | Ngày đặt: ${dateFormatted}</span>
                        <span class="slip-info-val">Ghi chú: ${order.customerNote || 'Giao giờ hành chính, cho kiểm tra hàng'}</span>
                    </div>
                </div>

                <div>
                    <div style="font-weight: 600; font-size: 12.5px; margin-bottom: 6px; color: var(--text-heading);">DANH SÁCH HÀNG CẦN ĐÓNG GÓI (PICK-LIST):</div>
                    <table class="slip-items-table">
                        <thead>
                            <tr>
                                <th style="width: 32px; text-align: center;">STT</th>
                                <th style="width: 95px;">Mã SKU</th>
                                <th>Tên sản phẩm</th>
                                <th style="width: 45px; text-align: center;">SL</th>
                                <th style="width: 90px; text-align: right;">Đơn giá</th>
                                <th style="width: 100px; text-align: right;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>

                <div class="slip-cod-highlight-box ${isCod ? 'is-cod' : 'is-paid'}">
                    <div>
                        <div style="font-weight: 700; font-size: 13px;">${isCod ? 'TIỀN THU HỘ (COD):' : 'TRẠNG THÁI THANH TOÁN:'}</div>
                        <div style="font-size: 11.5px;">${isCod ? 'Bưu tá vui lòng thu đúng số tiền ghi trên phiếu trước khi giao hàng' : 'Đơn đã được thanh toán trực tuyến, bưu tá tuyệt đối không thu thêm'}</div>
                    </div>
                    <div class="slip-cod-val">
                        ${isCod ? formatVND(order.total) : 'ĐÃ THANH TOÁN (0 đ)'}
                    </div>
                </div>

                <div class="slip-sign-row">
                    <div class="slip-sign-col">
                        <span>Xác nhận đóng gói (Ký và ghi rõ họ tên)</span>
                        <span style="font-weight: 500; color: var(--text-main);">Nhân viên kho PawPal</span>
                    </div>
                    <div class="slip-sign-col">
                        <span>Bưu tá nhận hàng (Ký và ghi rõ họ tên)</span>
                        <span style="font-weight: 500; color: var(--text-main);">${carrierName}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function generateManifestHtml(ordersList, carrierName) {
        const todayStr = new Date().toLocaleDateString('vi-VN');
        const totalCod = ordersList.reduce((sum, o) => {
            return sum + (o.paymentMethod === 'cod' && o.paymentStatus !== 'paid' ? o.total : 0);
        }, 0);

        const rows = ordersList.map((o, idx) => {
            const isCod = o.paymentMethod === 'cod' && o.paymentStatus !== 'paid';
            return `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td style="font-weight: 600; font-family: monospace;">${o.id}</td>
                    <td style="font-family: monospace; color: #236B48;">${o.trackingNumber || '--'}</td>
                    <td>
                        <div style="font-weight: 500;">${o.customerName}</div>
                        <div class="sub-meta-text">${o.phone}</div>
                    </td>
                    <td style="font-size: 12px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${o.shippingAddress || ''}">${o.shippingAddress || o.customerAddress || 'Chi nhánh Q1'}</td>
                    <td style="text-align: center;">${o.products.reduce((acc, p) => acc + p.quantity, 0)} món</td>
                    <td style="text-align: right; font-weight: ${isCod ? '700' : '400'}; color: ${isCod ? '#734718' : 'var(--text-main)'};">
                        ${isCod ? formatVND(o.total) : '0 đ (Đã trả)'}
                    </td>
                    <td style="text-align: center; color: var(--text-muted);">Đã nhận</td>
                </tr>
            `;
        }).join('');

        return `
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                    <div style="font-size: 15px; font-weight: 700; color: #236B48;">PAWPAL PET CARE - BẢNG KÊ BÀN GIAO HÀNG HÓA</div>
                    <div class="sub-meta-text">Đơn vị vận chuyển: <strong>${carrierName}</strong> | Ngày lập: ${todayStr}</div>
                </div>
                <div style="text-align: right; font-size: 13px;">
                    <div>Tổng số đơn: <strong>${ordersList.length} kiện</strong></div>
                    <div>Tổng COD bưu tá thu hộ: <strong style="color: #236B48; font-size: 15px;">${formatVND(totalCod)}</strong></div>
                </div>
            </div>

            <table class="manifest-table">
                <thead>
                    <tr>
                        <th style="width: 32px; text-align: center;">STT</th>
                        <th style="width: 95px;">Mã đơn</th>
                        <th style="width: 120px;">Mã vận đơn</th>
                        <th>Khách hàng</th>
                        <th>Địa chỉ nhận</th>
                        <th style="width: 60px; text-align: center;">Số lượng</th>
                        <th style="width: 100px; text-align: right;">Tiền COD</th>
                        <th style="width: 80px; text-align: center;">Xác nhận</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div style="margin-top: 24px; display: flex; justify-content: space-between; padding: 0 40px; text-align: center; font-size: 12.5px; color: var(--text-muted);">
                <div>
                    <div>ĐẠI DIỆN KHO PAWPAL</div>
                    <div style="margin-top: 50px; font-weight: 600; color: var(--text-main);">Nhân viên điều phối</div>
                </div>
                <div>
                    <div>ĐẠI DIỆN ĐƠN VỊ VẬN CHUYỂN</div>
                    <div style="margin-top: 50px; font-weight: 600; color: var(--text-main);">${carrierName}</div>
                </div>
            </div>
        `;
    }

    // -------------------------------------------------------------
    // HÀM TÍNH TOÁN SLA THỜI GIAN VÀ CẢNH BÁO TẮC NGHẼN ĐƠN HÀNG (GIAI ĐOẠN 1)
    // -------------------------------------------------------------
    function getOrderSlaInfo(order) {
        if (order.status === 'returned' || (order.alertType === 'danger' && order.alertMessage && order.alertMessage.includes('khiếu nại'))) {
            return {
                level: 'danger',
                badgeClass: 'badge-sla-urgent',
                label: order.alertMessage || 'Có khiếu nại (RMA)',
                isSlaOverdue: false
            };
        }

        if (order.paymentStatus === 'cod_pending') {
            return {
                level: 'warning',
                badgeClass: 'badge-cod-pending',
                label: 'Chờ đối soát COD',
                isSlaOverdue: false
            };
        }

        if (order.status === 'pending') {
            const mins = order.slaMinutes || 10;
            if (mins > 30) {
                return {
                    level: 'danger',
                    badgeClass: 'badge-sla-urgent',
                    label: `Quá hạn SLA (${mins}p)`,
                    isSlaOverdue: true
                };
            } else if (mins >= 15) {
                return {
                    level: 'warning',
                    badgeClass: 'badge-sla-warning',
                    label: `Chờ duyệt (${mins}p)`,
                    isSlaOverdue: false
                };
            } else {
                return {
                    level: 'ok',
                    badgeClass: 'badge-sla-ok',
                    label: `Mới đặt (${mins}p)`,
                    isSlaOverdue: false
                };
            }
        }

        if (order.status === 'confirmed' && order.slaMinutes && order.slaMinutes > 120) {
            return {
                level: 'warning',
                badgeClass: 'badge-sla-warning',
                label: 'Chậm đóng gói (>2h)',
                isSlaOverdue: true
            };
        }

        if (order.alertType === 'danger') {
            return {
                level: 'danger',
                badgeClass: 'badge-sla-urgent',
                label: order.alertMessage || 'Cần xử lý gấp',
                isSlaOverdue: false
            };
        }

        if (order.alertType === 'warning') {
            return {
                level: 'warning',
                badgeClass: 'badge-sla-warning',
                label: order.alertMessage || 'Lưu ý',
                isSlaOverdue: false
            };
        }

        return {
            level: 'normal',
            badgeClass: '',
            label: '--',
            isSlaOverdue: false
        };
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
                const sla = getOrderSlaInfo(o);

                if (currentFilterStatus !== 'ALL' && o.status !== currentFilterStatus) return false;
                if (currentFilterPayment !== 'ALL' && o.paymentMethod !== currentFilterPayment) return false;
                if (currentFilterPayStatus !== 'ALL' && o.paymentStatus !== currentFilterPayStatus) return false;
                if (filterComplaintOnly && o.status !== 'returned' && o.alertType !== 'danger') return false;
                if (filterUrgentOnly && sla.level !== 'danger' && sla.level !== 'warning') return false;
                if (filterSlaOverdueOnly && !sla.isSlaOverdue) return false;

                if (searchVal) {
                    const matchId = o.id.toLowerCase().includes(searchVal);
                    const matchName = o.customerName.toLowerCase().includes(searchVal);
                    const matchPhone = o.phone.includes(searchVal);
                    const matchTrack = (o.trackingNumber || '').toLowerCase().includes(searchVal);
                    if (!matchId && !matchName && !matchPhone && !matchTrack) return false;
                }
                return true;
            });

            // Cập nhật Dải tổng hợp đối soát dòng tiền COD
            const codStrip = document.getElementById('codReconcileSummaryStrip');
            const codPendingOrders = currentOrdersList.filter(o => o.paymentStatus === 'cod_pending');
            const totalCodAmount = codPendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);

            if (codStrip) {
                if (currentFilterPayStatus === 'cod_pending' || codPendingOrders.length > 0) {
                    codStrip.style.display = 'flex';
                    const countEl = document.getElementById('dispCodPendingCount');
                    const amtEl = document.getElementById('dispCodPendingAmount');
                    if (countEl) countEl.textContent = `${codPendingOrders.length} đơn hàng`;
                    if (amtEl) amtEl.textContent = formatVND(totalCodAmount);
                } else {
                    codStrip.style.display = 'none';
                }
            }

            // Cập nhật Dải thao tác hàng loạt (Giai đoạn 2)
            const batchToolbar = document.getElementById('batchActionToolbar');
            const batchCountEl = document.getElementById('batchSelectedCount');
            if (batchToolbar) {
                if (selectedBatchOrderIds.length > 0) {
                    batchToolbar.style.display = 'flex';
                    if (batchCountEl) batchCountEl.textContent = selectedBatchOrderIds.length;
                } else {
                    batchToolbar.style.display = 'none';
                }
            }

            const checkAllEl = document.getElementById('checkSelectAllOrders');
            if (checkAllEl) {
                checkAllEl.checked = filtered.length > 0 && filtered.every(o => selectedBatchOrderIds.includes(o.id));
            }

            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 36px; color: var(--text-muted);">
                            <div>Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.</div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = filtered.map(o => {
                const sla = getOrderSlaInfo(o);

                let statusBadge = '';
                if (o.status === 'pending') statusBadge = '<span class="admin-badge badge-pending">Chờ xác nhận</span>';
                else if (o.status === 'confirmed') statusBadge = '<span class="admin-badge badge-confirmed">Đang chuẩn bị</span>';
                else if (o.status === 'shipping') statusBadge = '<span class="admin-badge badge-shipping">Đang giao</span>';
                else if (o.status === 'delivered') statusBadge = '<span class="admin-badge badge-delivered">Đã giao</span>';
                else if (o.status === 'completed') statusBadge = '<span class="admin-badge badge-completed">Hoàn tất</span>';
                else if (o.status === 'cancelled') statusBadge = '<span class="admin-badge badge-cancelled">Đã hủy</span>';
                else if (o.status === 'returned') statusBadge = '<span class="admin-badge badge-cancelled">Đổi trả</span>';

                let payBadge = '';
                if (o.paymentStatus === 'paid') {
                    payBadge = '<span class="admin-badge badge-paid">Đã thanh toán</span>';
                } else if (o.paymentStatus === 'cod_pending') {
                    payBadge = '<span class="admin-badge badge-cod-pending">Chờ đối soát COD</span>';
                } else {
                    payBadge = '<span class="admin-badge badge-unpaid">Chưa thanh toán</span>';
                }

                let rowAlertClass = '';
                let alertLabel = '<span style="color: var(--text-muted); font-size: 12px;">--</span>';
                if (sla.level === 'danger') {
                    rowAlertClass = 'row-alert-danger';
                    alertLabel = `<span class="admin-badge ${sla.badgeClass}">${sla.label}</span>`;
                } else if (sla.level === 'warning') {
                    rowAlertClass = 'row-alert-warning';
                    alertLabel = `<span class="admin-badge ${sla.badgeClass}">${sla.label}</span>`;
                } else if (sla.level === 'ok') {
                    alertLabel = `<span class="admin-badge ${sla.badgeClass}">${sla.label}</span>`;
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

                const isChecked = selectedBatchOrderIds.includes(o.id);

                return `
                    <tr class="${rowAlertClass}">
                        <td style="text-align: center; width: 42px;">
                            <input type="checkbox" class="admin-checkbox order-row-checkbox" data-id="${o.id}" ${isChecked ? 'checked' : ''} onclick="PawpalOrdersModule.toggleSelectOrder(event, '${o.id}')">
                        </td>
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
                            <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.confirmPayment('${order.id}')">Xác nhận thu tiền</button>
                        `;
                    } else if (order.paymentStatus === 'cod_pending') {
                        btnsHtml += `
                            <button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #236B48; font-weight: 600;">Đối soát tiền COD bưu cục</button>
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

            // GIAI ĐOẠN 3: Khối hồ sơ Đổi trả và Bồi hoàn RMA (nếu có)
            const rmaBannerContainer = document.getElementById('detailOrderRmaBannerContainer');
            if (rmaBannerContainer) {
                if (order.rmaInfo) {
                    const rma = order.rmaInfo;
                    rmaBannerContainer.innerHTML = `
                        <div class="order-rma-detail-card">
                            <div class="rma-card-left">
                                <div class="rma-card-title">
                                    <span>HỒ SƠ ĐỔI TRẢ VÀ HOÀN TIỀN (RMA)</span>
                                    <span class="admin-badge badge-cancelled">${rma.id}</span>
                                </div>
                                <div class="rma-card-sub">
                                    Hình thức: <strong>${rma.solutionTypeName}</strong> | Lý do: <strong>${rma.reasonText}</strong> | Kiểm định kho: <strong>${rma.restockText}</strong> | Bồi hoàn: <strong style="color: #236B48;">${rma.refundText}</strong>
                                </div>
                            </div>
                            <button type="button" class="btn-rma-link-complaint" onclick="PawpalOrdersModule.openComplaintModule('${rma.id}')">Xem hồ sơ tại phân hệ Khiếu nại &rarr;</button>
                        </div>
                    `;
                } else {
                    rmaBannerContainer.innerHTML = '';
                }
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
                            <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openAdjustStockModal('${p.sku}')">•••</button>
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
                        <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openVoucherActionModal('${v.code}')">•••</button>
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

        // Lọc quá hạn SLA (>30p)
        document.getElementById('btnFilterSlaOverdue')?.addEventListener('click', function() {
            filterSlaOverdueOnly = !filterSlaOverdueOnly;
            this.classList.toggle('active', filterSlaOverdueOnly);
            renderOrdersTable();
        });

        // GIAI ĐOẠN 2: Checkbox chọn tất cả đơn hàng
        document.getElementById('checkSelectAllOrders')?.addEventListener('change', function(e) {
            const isChecked = e.target.checked;
            const searchVal = (document.getElementById('orderSearchInput')?.value || '').toLowerCase().trim();
            const visibleOrders = currentOrdersList.filter(o => {
                if (currentFilterStatus !== 'ALL' && o.status !== currentFilterStatus) return false;
                if (currentFilterPayment !== 'ALL' && o.paymentMethod !== currentFilterPayment) return false;
                if (currentFilterPayStatus !== 'ALL' && o.paymentStatus !== currentFilterPayStatus) return false;
                if (filterComplaintOnly && o.status !== 'returned' && o.alertType !== 'danger') return false;
                if (filterSlaOverdueOnly && !getOrderSlaInfo(o).isSlaOverdue) return false;
                if (searchVal) {
                    const matchId = o.id.toLowerCase().includes(searchVal);
                    const matchName = o.customerName.toLowerCase().includes(searchVal);
                    const matchPhone = o.phone.includes(searchVal);
                    const matchTrack = (o.trackingNumber || '').toLowerCase().includes(searchVal);
                    if (!matchId && !matchName && !matchPhone && !matchTrack) return false;
                }
                return true;
            });

            if (isChecked) {
                visibleOrders.forEach(o => {
                    if (!selectedBatchOrderIds.includes(o.id)) {
                        selectedBatchOrderIds.push(o.id);
                    }
                });
            } else {
                const visibleIds = visibleOrders.map(o => o.id);
                selectedBatchOrderIds = selectedBatchOrderIds.filter(id => !visibleIds.includes(id));
            }
            renderOrdersTable();
        });

        // Nút bỏ chọn toàn bộ đơn hàng
        document.getElementById('btnBatchDeselectAll')?.addEventListener('click', () => {
            selectedBatchOrderIds = [];
            renderOrdersTable();
        });

        // Nút in hàng loạt phiếu đóng gói
        document.getElementById('btnBatchPrintPack')?.addEventListener('click', () => {
            PawpalOrdersModule.printBatchPackingSlips();
        });

        // Nút bàn giao vận chuyển hàng loạt
        document.getElementById('btnBatchDispatch')?.addEventListener('click', () => {
            PawpalOrdersModule.openBatchDispatchModal();
        });

        // Nút xuất bảng kê bàn giao (Manifest)
        document.getElementById('btnBatchExportManifest')?.addEventListener('click', () => {
            PawpalOrdersModule.exportDispatchManifest();
        });

        // Ô QUÉT MÃ VẬN ĐƠN / BARCODE SIÊU TỐC
        document.getElementById('quickScanTrackingInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const code = e.target.value.trim();
                if (!code) return;

                const targetOrder = currentOrdersList.find(o => 
                    o.id.toLowerCase() === code.toLowerCase() || 
                    (o.trackingNumber && o.trackingNumber.toLowerCase() === code.toLowerCase())
                );

                if (!targetOrder) {
                    alert(`Không tìm thấy đơn hàng tương ứng với mã quét "${code}". Vui lòng kiểm tra lại.`);
                    return;
                }

                e.target.value = '';

                if (targetOrder.status === 'confirmed') {
                    if (confirm(`Đơn hàng ${targetOrder.id} đang chuẩn bị xuất kho.\nBạn có muốn bàn giao nhanh cho bưu cục và chuyển sang trạng thái Đang giao ngay?`)) {
                        targetOrder.status = 'shipping';
                        targetOrder.timeline.push({
                            title: 'Bàn giao vận chuyển qua máy quét mã vạch',
                            time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                            desc: 'Nhân viên kho quét barcode xuất bưu cục thành công',
                            done: true
                        });
                        renderOrdersTable();
                    }
                } else if (targetOrder.status === 'shipping') {
                    if (confirm(`Đơn hàng ${targetOrder.id} đang giao.\nXác nhận khách đã nhận hàng thành công?`)) {
                        PawpalOrdersModule.completeDelivery(targetOrder.id);
                        return;
                    }
                }

                PawpalOrdersModule.openOrderDetail(targetOrder.id);
            }
        });

        // Xác nhận bàn giao vận chuyển hàng loạt
        document.getElementById('btnSubmitBatchDispatch')?.addEventListener('click', () => {
            if (selectedBatchOrderIds.length === 0) return;
            const carrier = document.getElementById('batchCarrierSelect')?.value || 'J và T Express';
            const mode = document.getElementById('batchTrackingMode')?.value || 'auto';
            const note = document.getElementById('batchCarrierNote')?.value.trim() || '';

            selectedBatchOrderIds.forEach(id => {
                const ord = currentOrdersList.find(o => o.id === id);
                if (ord) {
                    ord.status = 'shipping';
                    ord.carrier = carrier;
                    if (mode === 'auto' || !ord.trackingNumber) {
                        const prefix = carrier.includes('GHTK') ? 'GHTK' : (carrier.includes('Viettel') ? 'VT' : 'JT');
                        ord.trackingNumber = `${prefix}${Date.now().toString().slice(-6)}${ord.id.slice(-3)}`;
                    }
                    ord.timeline.push({
                        title: `Bàn giao vận chuyển hàng loạt cho ${carrier}`,
                        time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                        desc: note ? `Xuất kho hàng loạt. Ghi chú: ${note}` : 'Xuất kho và bàn giao bưu cục thành công',
                        done: true
                    });
                }
            });

            const count = selectedBatchOrderIds.length;
            selectedBatchOrderIds = [];
            document.getElementById('modalBatchDispatch')?.classList.remove('active');
            renderOrdersTable();
            if (selectedOrderId) renderOrderDetail(selectedOrderId);
            alert(`Đã bàn giao thành công ${count} đơn hàng cho đơn vị vận chuyển ${carrier}!`);
        });

        // Lệnh in phiếu đóng gói và in bảng kê
        document.getElementById('btnPrintSlipConfirm')?.addEventListener('click', () => {
            alert('Lệnh in phiếu đóng gói (Packing Slip) đã gửi đến máy in nhiệt A6 / K80 thành công!');
        });
        document.getElementById('btnPrintManifestConfirm')?.addEventListener('click', () => {
            alert('Đã gửi lệnh in Bảng kê bàn giao bưu cục (Manifest) ra máy in văn phòng!');
        });

        // Nút đối soát toàn bộ tiền COD bưu cục
        document.getElementById('btnQuickReconcileAllCod')?.addEventListener('click', function() {
            const codOrders = currentOrdersList.filter(o => o.paymentStatus === 'cod_pending');
            if (codOrders.length === 0) {
                alert('Không có đơn hàng nào đang chờ đối soát tiền COD.');
                return;
            }
            codOrders.forEach(o => {
                o.paymentStatus = 'paid';
                o.timeline.push({
                    title: 'Đã đối soát tiền COD',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: 'Kế toán đối soát thành công tiền COD bưu cục về tài khoản PawPal',
                    done: true
                });
            });
            renderOrdersTable();
            if (selectedOrderId) renderOrderDetail(selectedOrderId);
            alert(`Đã đối soát và xác nhận tiền về tài khoản thành công cho toàn bộ ${codOrders.length} đơn hàng COD!`);
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

        // Mở modal thêm sản phẩm mới
        document.getElementById('btnOpenAddProductModal')?.addEventListener('click', () => {
            document.getElementById('modalAddProduct')?.classList.add('active');
        });

        // Xác nhận thêm sản phẩm mới
        document.getElementById('btnSubmitAddProduct')?.addEventListener('click', () => {
            const sku = document.getElementById('newProdSku')?.value.trim();
            const name = document.getElementById('newProdName')?.value.trim();
            const cat = document.getElementById('newProdCategory')?.value;
            const brand = document.getElementById('newProdBrand')?.value.trim() || 'PawPal';
            const price = parseInt(document.getElementById('newProdPrice')?.value || '0', 10);
            const stock = parseInt(document.getElementById('newProdInitialStock')?.value || '0', 10);
            const minStock = parseInt(document.getElementById('newProdMinStock')?.value || '5', 10);

            if (!sku || !name) {
                alert('Vui lòng nhập đầy đủ mã SKU và tên sản phẩm.');
                return;
            }

            if (initialProducts.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
                alert(`Mã SKU "${sku}" đã tồn tại trong kho. Vui lòng nhập mã khác.`);
                return;
            }

            initialProducts.unshift({
                sku: sku,
                name: name,
                category: cat,
                brand: brand,
                price: price,
                stock: stock,
                minStock: minStock,
                status: 'Còn hàng'
            });

            document.getElementById('modalAddProduct')?.classList.remove('active');
            renderProductsTable();
            alert(`Đã thêm thành công sản phẩm mới "${name}" (SKU: ${sku}) vào kho hàng!`);
        });

        // Xác nhận lưu điều chỉnh tồn kho
        document.getElementById('btnSubmitAdjustStock')?.addEventListener('click', () => {
            const sku = activeAdjustProductSku;
            const prod = initialProducts.find(p => p.sku === sku);
            if (!prod) return;

            const opType = document.getElementById('adjustOperationType')?.value || 'ADD';
            const qty = parseInt(document.getElementById('adjustQuantityInput')?.value || '0', 10);
            const newPrice = document.getElementById('adjustPriceInput')?.value;
            const newStatus = document.getElementById('adjustStatusSelect')?.value || 'Đang bán';
            const reason = document.getElementById('adjustReasonSelect')?.value;

            if (opType === 'ADD') {
                prod.stock += qty;
            } else if (opType === 'SUB') {
                prod.stock = Math.max(0, prod.stock - qty);
            } else if (opType === 'SET') {
                prod.stock = Math.max(0, qty);
            }

            if (newPrice && parseInt(newPrice, 10) > 0) {
                prod.price = parseInt(newPrice, 10);
            }

            prod.status = newStatus;

            document.getElementById('modalAdjustStock')?.classList.remove('active');
            renderProductsTable();
            alert(`Đã cập nhật tồn kho cho sản phẩm ${sku}!\nSố lượng tồn mới: ${prod.stock} (Lý do: ${reason}).`);
        });

        // Mở modal tạo mã khuyến mãi
        document.getElementById('btnOpenCreateVoucherModal')?.addEventListener('click', () => {
            document.getElementById('modalCreateVoucher')?.classList.add('active');
        });

        // Xác nhận tạo mã khuyến mãi
        document.getElementById('btnSubmitCreateVoucher')?.addEventListener('click', () => {
            const code = document.getElementById('newVoucherCode')?.value.trim().toUpperCase();
            const title = document.getElementById('newVoucherTitle')?.value.trim();
            const discount = document.getElementById('newVoucherDiscount')?.value.trim();
            const minOrder = document.getElementById('newVoucherMinOrder')?.value.trim() || '0 đ';
            const points = document.getElementById('newVoucherPoints')?.value.trim() || 'Miễn phí';
            const expiry = document.getElementById('newVoucherExpiry')?.value.trim() || '31/12/2026';
            const maxUses = document.getElementById('newVoucherMaxUses')?.value || '100';

            if (!code || !title || !discount) {
                alert('Vui lòng nhập đầy đủ mã voucher, tên chương trình và mức giảm giá.');
                return;
            }

            if (initialVouchers.some(v => v.code.toUpperCase() === code)) {
                alert(`Mã khuyến mãi "${code}" đã tồn tại. Vui lòng chọn mã khác.`);
                return;
            }

            initialVouchers.unshift({
                code: code,
                title: title,
                discount: discount,
                minOrder: minOrder,
                points: points,
                expiry: expiry,
                used: `0 / ${maxUses}`,
                status: 'Đang chạy'
            });

            const statActive = document.getElementById('statActiveVouchers');
            if (statActive) {
                statActive.textContent = initialVouchers.filter(v => v.status === 'Đang chạy').length;
            }

            document.getElementById('modalCreateVoucher')?.classList.remove('active');
            renderVouchersTable();
            alert(`Đã phát hành thành công mã khuyến mãi "${code}"!`);
        });

        // Cập nhật voucher từ modal tác vụ
        document.getElementById('btnSubmitUpdateVoucher')?.addEventListener('click', () => {
            const code = activeActionVoucherCode;
            const voucher = initialVouchers.find(v => v.code === code);
            if (!voucher) return;

            const newStatus = document.getElementById('voucherTargetStatus')?.value;
            const newExpiry = document.getElementById('voucherTargetExpiry')?.value.trim();

            if (newStatus) voucher.status = newStatus;
            if (newExpiry) voucher.expiry = newExpiry;

            const statActive = document.getElementById('statActiveVouchers');
            if (statActive) {
                statActive.textContent = initialVouchers.filter(v => v.status === 'Đang chạy').length;
            }

            document.getElementById('modalVoucherAction')?.classList.remove('active');
            renderVouchersTable();
            alert(`Đã lưu thay đổi cho mã khuyến mãi "${code}" thành công!`);
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
        document.getElementById('menuActionReconcileCod')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.reconcileCod(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionReturnRefund')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.openReturnRefundModal(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionCancelOrder')?.addEventListener('click', () => {
            if (activeActionOrderId) {
                PawpalOrdersModule.openCancelModal(activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });

        // GIAI ĐOẠN 3: Thay đổi hình thức bồi hoàn RMA
        document.getElementById('rmaSolutionType')?.addEventListener('change', (e) => {
            const isRefund = e.target.value === 'refund';
            const row = document.getElementById('rmaRefundFieldsRow');
            if (row) row.style.display = isRefund ? 'flex' : 'none';
        });

        // GIAI ĐOẠN 3: Xác nhận phê duyệt RMA Ticket
        document.getElementById('btnSubmitRmaTicket')?.addEventListener('click', () => {
            const order = currentOrdersList.find(o => o.id === selectedOrderId);
            if (!order) return;

            // Kiểm tra sản phẩm được tích chọn
            const checkedBoxes = document.querySelectorAll('.rma-item-select-checkbox:checked');
            if (checkedBoxes.length === 0) {
                alert('Vui lòng tích chọn ít nhất một sản phẩm cần đổi trả hoặc bồi hoàn.');
                return;
            }

            const solSelect = document.getElementById('rmaSolutionType');
            const solType = solSelect?.value || 'exchange';
            const solTypeName = solSelect?.options[solSelect.selectedIndex]?.text.split(' (')[0] || 'Đổi hàng mới';

            const reasonSelect = document.getElementById('rmaReasonSelect');
            const reasonVal = reasonSelect?.value || 'damaged';
            const reasonText = reasonSelect?.options[reasonSelect.selectedIndex]?.text || 'Hàng móp vỡ';

            const restockRadio = document.querySelector('input[name="rmaRestockAction"]:checked');
            const restockVal = restockRadio ? restockRadio.value : 'restock';

            const refundMethod = document.getElementById('rmaRefundMethod')?.value || 'bank_transfer';
            const refundAmountVal = parseInt(document.getElementById('rmaRefundAmountInput')?.value || '0', 10);
            const internalNote = document.getElementById('rmaInternalNote')?.value.trim() || '';

            const rmaCode = 'RMA-2026-' + (Math.floor(100 + Math.random() * 900));

            // Thu thập các sản phẩm trả và xử lý tồn kho
            const returnedItems = [];
            checkedBoxes.forEach(cb => {
                const sku = cb.getAttribute('data-sku');
                const row = cb.closest('tr');
                const qtyInput = row?.querySelector('.rma-item-qty-input');
                const qty = parseInt(qtyInput?.value || '1', 10);

                const prodInOrder = order.products.find(p => p.sku === sku);
                if (prodInOrder) {
                    returnedItems.push({
                        sku: sku,
                        name: prodInOrder.name,
                        quantity: qty,
                        price: prodInOrder.price
                    });

                    // Nếu kiểm định đạt chuẩn -> Tự động nhập lại kho khả dụng
                    if (restockVal === 'restock') {
                        const stockItem = initialProducts.find(p => p.sku === sku);
                        if (stockItem) {
                            stockItem.stock += qty;
                            if (stockItem.stock > 0 && stockItem.status === 'Hết hàng') {
                                stockItem.status = 'Còn hàng';
                            }
                        }
                    }
                }
            });

            // Cập nhật trạng thái đơn hàng sang Đổi trả
            order.status = 'returned';
            order.alertType = 'danger';
            order.alertMessage = `Phiếu RMA: ${rmaCode}`;
            order.rmaInfo = {
                id: rmaCode,
                solutionType: solType,
                solutionTypeName: solTypeName,
                reason: reasonVal,
                reasonText: reasonText,
                restockAction: restockVal,
                restockText: restockVal === 'restock' ? 'Đã nhập lại kho khả dụng (Restock)' : 'Chuyển vào kho Hủy (Write-off)',
                refundMethod: refundMethod,
                refundAmount: refundAmountVal,
                refundText: solType === 'refund' ? formatVND(refundAmountVal) : 'Không phát sinh bồi hoàn tiền mặt',
                items: returnedItems,
                note: internalNote,
                createdAt: new Date().toISOString()
            };

            // Ghi nhận vào Lịch trình (Timeline)
            order.timeline.push({
                title: 'Tiếp nhận Đổi trả và Hoàn tiền (RMA)',
                time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                desc: `Phê duyệt ${rmaCode}. Hình thức: ${solTypeName}. Lý do: ${reasonText}`,
                done: true
            });

            if (restockVal === 'restock') {
                order.timeline.push({
                    title: 'Kiểm định kho hàng đạt chuẩn',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: 'Sản phẩm còn nguyên seal hộp. Đã tự động nhập lại kho khả dụng',
                    done: true
                });
            } else {
                order.timeline.push({
                    title: 'Chuyển kho hàng lỗi và phế phẩm',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: 'Hàng hư hại do vận chuyển. Đã đưa vào kho hủy và ghi nhận chi phí rủi ro',
                    done: true
                });
            }

            if (solType === 'refund' && refundAmountVal > 0) {
                order.timeline.push({
                    title: 'Hoàn tất bồi hoàn tiền cho khách',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: `Đã xác nhận hoàn tiền ${formatVND(refundAmountVal)} qua ${refundMethod === 'bank_transfer' ? 'chuyển khoản ngân hàng' : 'điểm thưởng Pawpoint'}`,
                    done: true
                });
            }

            // Liên thông tự động sang phân hệ Khiếu nại
            try {
                const storedTickets = JSON.parse(sessionStorage.getItem('pawpal_admin_order_rma_tickets') || '[]');
                storedTickets.unshift({
                    id: rmaCode,
                    orderId: order.id,
                    customerName: order.customerName,
                    phone: order.phone,
                    reason: reasonText,
                    solutionType: solTypeName,
                    refundAmount: refundAmountVal,
                    status: 'resolved',
                    createdAt: new Date().toLocaleDateString('vi-VN')
                });
                sessionStorage.setItem('pawpal_admin_order_rma_tickets', JSON.stringify(storedTickets));
            } catch (err) {
                console.warn('Không thể lưu session RMA:', err);
            }

            document.getElementById('modalReturnRefund')?.classList.remove('active');
            renderOrdersTable();
            renderProductsTable();
            renderOrderDetail(order.id);

            alert(`Đã phê duyệt thành công phiếu đổi trả ${rmaCode}!\nTồn kho sản phẩm và dữ liệu liên thông phân hệ Khiếu nại đã được cập nhật tự động.`);
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

        // Tiếp nhận preset đặt đơn và mở đơn hàng từ phân hệ Khách hàng
        const checkPresetOrder = () => {
            const rawPreset = sessionStorage.getItem('pawpal_admin_order_preset');
            if (rawPreset) {
                try {
                    const preset = JSON.parse(rawPreset);
                    const phoneEl = document.getElementById('createOrderPhone');
                    const nameEl = document.getElementById('createOrderName');
                    const addrInput = document.getElementById('createOrderCustomAddress');
                    const addrRadios = document.querySelectorAll('input[name="addrSelect"]');

                    if (phoneEl && (preset.custPhone || preset.ownerPhone)) phoneEl.value = preset.custPhone || preset.ownerPhone;
                    if (nameEl && (preset.custName || preset.ownerName)) nameEl.value = preset.custName || preset.ownerName;
                    if (preset.address && addrInput) {
                        addrInput.value = preset.address;
                        if (addrRadios && addrRadios[1]) {
                            addrRadios[1].checked = true;
                            addrRadios[1].closest('.address-item-card')?.classList.add('selected');
                            addrRadios[0]?.closest('.address-item-card')?.classList.remove('selected');
                        }
                    }

                    const modal = document.getElementById('modalCreateOrder');
                    if (modal) modal.classList.add('active');
                    sessionStorage.removeItem('pawpal_admin_order_preset');
                } catch (e) {}
            }

            const rawOrderId = sessionStorage.getItem('pawpal_admin_order_id');
            if (rawOrderId) {
                sessionStorage.removeItem('pawpal_admin_order_id');
                if (window.PawpalOrdersModule?.openOrderDetail) {
                    window.PawpalOrdersModule.openOrderDetail(rawOrderId);
                }
            }

            const filterStatus = sessionStorage.getItem('pawpal_admin_order_filter_status');
            if (filterStatus) {
                sessionStorage.removeItem('pawpal_admin_order_filter_status');
                const statusSelect = document.getElementById('orderFilterStatus');
                if (statusSelect) {
                    statusSelect.value = filterStatus;
                    renderOrdersTable();
                }
            }

            const productSearch = sessionStorage.getItem('pawpal_admin_product_search');
            if (productSearch) {
                sessionStorage.removeItem('pawpal_admin_product_search');
                const pSearchInput = document.getElementById('productSearchInput');
                if (pSearchInput) {
                    pSearchInput.value = productSearch;
                    renderProductsTable();
                }
            }
        };
        setTimeout(checkPresetOrder, 150);
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
                if (order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid') {
                    order.paymentStatus = 'cod_pending';
                }
                order.timeline.push({
                    title: 'Đã giao hàng thành công',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: order.paymentStatus === 'cod_pending' 
                        ? 'Bưu tá xác nhận khách đã nhận hàng và thu tiền COD. Đơn chuyển sang trạng thái chờ bưu cục chuyển khoản đối soát.'
                        : 'Bưu tá xác nhận khách đã nhận hàng thành công',
                    done: true
                });
                alert(`Đã cập nhật trạng thái Đã giao cho đơn ${orderId}!`);
                renderOrdersTable();
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        reconcileCod: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (order) {
                order.paymentStatus = 'paid';
                order.timeline.push({
                    title: 'Đã đối soát tiền COD',
                    time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                    desc: 'Kế toán xác nhận bưu cục đã chuyển khoản tiền COD về tài khoản PawPal',
                    done: true
                });
                alert(`Đã đối soát thành công tiền COD cho đơn hàng ${orderId}!`);
                renderOrdersTable();
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        completeOrder: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (!order) return;
            if (order.paymentMethod === 'cod' && order.paymentStatus === 'cod_pending') {
                alert(`Chặn hoàn tất đơn: Đơn hàng ${orderId} đang chờ bưu cục chuyển khoản tiền COD (Chờ đối soát). Vui lòng xác nhận đối soát tiền về tài khoản trước khi hoàn tất.`);
                return;
            }
            if (order.paymentStatus === 'unpaid') {
                alert(`Chặn hoàn tất đơn: Đơn hàng ${orderId} chưa được thanh toán. Vui lòng xác nhận thu tiền trước khi hoàn tất.`);
                return;
            }
            order.status = 'completed';
            order.timeline.push({
                title: 'Hoàn tất đơn hàng',
                time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                desc: 'Đơn hàng đã hoàn thành và tích điểm Pawpoint cho khách',
                done: true
            });
            alert(`Đơn hàng ${orderId} đã hoàn tất thành công!`);
            renderOrdersTable();
            window.PawpalOrdersModule.openOrderDetail(orderId);
        },
        printPackingSlip: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (!order) return;
            const container = document.getElementById('packingSlipContainer');
            const titleEl = document.getElementById('slipModalSubtitle');
            if (container) {
                container.innerHTML = generatePackingSlipHtml(order);
            }
            if (titleEl) {
                titleEl.textContent = `Phiếu đóng gói đơn hàng ${order.id} | Khổ in A6 / K80`;
            }
            document.getElementById('modalPackingSlip')?.classList.add('active');
        },
        toggleSelectOrder: function(e, orderId) {
            e.stopPropagation();
            if (selectedBatchOrderIds.includes(orderId)) {
                selectedBatchOrderIds = selectedBatchOrderIds.filter(id => id !== orderId);
            } else {
                selectedBatchOrderIds.push(orderId);
            }
            renderOrdersTable();
        },
        printBatchPackingSlips: function() {
            if (selectedBatchOrderIds.length === 0) {
                alert('Vui lòng chọn ít nhất một đơn hàng trên danh sách để in phiếu đóng gói hàng loạt.');
                return;
            }
            const container = document.getElementById('packingSlipContainer');
            const titleEl = document.getElementById('slipModalSubtitle');
            const selectedOrders = currentOrdersList.filter(o => selectedBatchOrderIds.includes(o.id));
            if (container) {
                container.innerHTML = selectedOrders.map(o => generatePackingSlipHtml(o)).join('');
            }
            if (titleEl) {
                titleEl.textContent = `In hàng loạt ${selectedOrders.length} phiếu đóng gói liên tiếp | Khổ in A6 / K80`;
            }
            document.getElementById('modalPackingSlip')?.classList.add('active');
        },
        openBatchDispatchModal: function() {
            if (selectedBatchOrderIds.length === 0) {
                alert('Vui lòng chọn ít nhất một đơn hàng để bàn giao vận chuyển hàng loạt.');
                return;
            }
            const countEl = document.getElementById('batchDispatchCount');
            if (countEl) countEl.textContent = `${selectedBatchOrderIds.length} đơn hàng`;
            document.getElementById('modalBatchDispatch')?.classList.add('active');
        },
        exportDispatchManifest: function() {
            const targetOrders = selectedBatchOrderIds.length > 0 
                ? currentOrdersList.filter(o => selectedBatchOrderIds.includes(o.id))
                : currentOrdersList.filter(o => o.status === 'shipping' || o.status === 'confirmed');

            if (targetOrders.length === 0) {
                alert('Không có đơn hàng nào để xuất bảng kê bàn giao vận chuyển.');
                return;
            }

            const carrier = targetOrders[0]?.carrier || 'Bưu cục đối tác';
            const container = document.getElementById('manifestContentContainer');
            const subTitle = document.getElementById('manifestSubtitle');
            if (container) {
                container.innerHTML = generateManifestHtml(targetOrders, carrier);
            }
            if (subTitle) {
                subTitle.textContent = `Bảng kê gồm ${targetOrders.length} đơn hàng bàn giao cho ${carrier}`;
            }
            document.getElementById('modalDispatchManifest')?.classList.add('active');
        },
        printInvoice: function(orderId) {
            alert(`Đang xuất hóa đơn bán lẻ PDF cho đơn ${orderId}...`);
        },
        openReturnRefundModal: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (!order) return;

            selectedOrderId = order.id;

            const codeEl = document.getElementById('rmaOrderTargetCode');
            const custEl = document.getElementById('rmaCustomerName');
            const totalEl = document.getElementById('rmaOrderTotal');
            const amountInput = document.getElementById('rmaRefundAmountInput');
            const tbody = document.getElementById('rmaItemsTableBody');

            if (codeEl) codeEl.textContent = order.id;
            if (custEl) custEl.textContent = `${order.customerName} (${order.phone})`;
            if (totalEl) totalEl.textContent = formatVND(order.total);
            if (amountInput) amountInput.value = order.total || 0;

            if (tbody) {
                tbody.innerHTML = order.products.map(p => `
                    <tr>
                        <td style="text-align: center;">
                            <input type="checkbox" class="admin-checkbox rma-item-select-checkbox" data-sku="${p.sku}" data-price="${p.price}" checked>
                        </td>
                        <td>
                            <div style="font-weight: 500;">${p.name}</div>
                            <div class="sub-meta-text">${p.sku}</div>
                        </td>
                        <td style="text-align: center; font-weight: 500;">${p.quantity}</td>
                        <td style="text-align: center;">
                            <input type="number" class="admin-input rma-item-qty-input" value="${p.quantity}" min="1" max="${p.quantity}" style="width: 54px; height: 28px; text-align: center; padding: 2px;">
                        </td>
                        <td style="text-align: right; font-weight: 600;">${formatVND(p.price)}</td>
                    </tr>
                `).join('');
            }

            document.getElementById('modalReturnRefund')?.classList.add('active');
        },
        openRmaTicket: function(orderId) {
            this.openReturnRefundModal(orderId);
        },
        openComplaintModule: function(rmaId) {
            // Chuyển trực tiếp sang phân hệ Khiếu nại
            sessionStorage.setItem('pawpal_admin_active_module', 'Khiếu nại');
            sessionStorage.setItem('pawpal_admin_complaint_subtab', 'tab-complaint-orders');
            if (rmaId) {
                sessionStorage.setItem('pawpal_admin_complaint_search', rmaId);
            }
            const compBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khiếu nại');
            if (compBtn) {
                compBtn.click();
            } else {
                alert(`Đang mở hồ sơ khiếu nại ${rmaId} tại phân hệ Khiếu nại...`);
            }
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
        },
        openAdjustStockModal: function(sku) {
            const prod = initialProducts.find(p => p.sku === sku);
            if (!prod) return;

            activeAdjustProductSku = sku;
            const skuEl = document.getElementById('adjustSkuCode');
            const nameEl = document.getElementById('adjustProdName');
            const stockEl = document.getElementById('adjustCurrentStock');
            const priceInput = document.getElementById('adjustPriceInput');
            const statusSelect = document.getElementById('adjustStatusSelect');

            if (skuEl) skuEl.textContent = prod.sku;
            if (nameEl) nameEl.textContent = prod.name;
            if (stockEl) stockEl.textContent = `${prod.stock} đơn vị`;
            if (priceInput) priceInput.value = prod.price || '';
            if (statusSelect) statusSelect.value = prod.status || 'Đang bán';

            document.getElementById('modalAdjustStock')?.classList.add('active');
        },
        openVoucherActionModal: function(code) {
            const voucher = initialVouchers.find(v => v.code === code);
            if (!voucher) return;

            activeActionVoucherCode = code;
            const codeEl = document.getElementById('voucherTargetCode');
            const titleEl = document.getElementById('voucherTargetTitle');
            const usedEl = document.getElementById('voucherTargetUsed');
            const statusSelect = document.getElementById('voucherTargetStatus');
            const expiryInput = document.getElementById('voucherTargetExpiry');

            if (codeEl) codeEl.textContent = voucher.code;
            if (titleEl) titleEl.textContent = voucher.title;
            if (usedEl) usedEl.textContent = voucher.used;
            if (statusSelect) statusSelect.value = voucher.status || 'Đang chạy';
            if (expiryInput) expiryInput.value = voucher.expiry || '';

            document.getElementById('modalVoucherAction')?.classList.add('active');
        }
    };

    // Khởi tạo
    initOrdersModule();
})();
