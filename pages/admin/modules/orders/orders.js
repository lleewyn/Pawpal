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
            carrier: 'J và T Express',
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
                { title: 'Đã bàn giao vận chuyển', time: '09:00 - 11/06/2026', desc: 'Bàn giao cho J và T Express. Mã vận đơn: JT123456789', done: true },
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
            rmaInfo: {
                id: 'RMA-2026-001',
                solutionType: 'exchange',
                solutionTypeName: 'Đổi hàng mới (1-đổi-1)',
                reason: 'damaged',
                reasonText: 'Hàng bị vỡ hoặc móp méo seal do vận chuyển',
                restockAction: 'writeoff',
                restockText: 'Chuyển vào kho Hủy (Write-off)',
                refundMethod: 'none',
                refundAmount: 0,
                refundText: 'Đổi sản phẩm mới (không hoàn tiền mặt)',
                items: [
                    {
                        sku: 'DD-MAY-03',
                        name: 'Đài phun nước lọc tự động thông minh Petkit Eversweet 3',
                        quantity: 1,
                        price: 950000
                    }
                ],
                note: 'Khách báo đài phun nước bị nứt đế khi nhận hàng. Đã lập đơn bù sản phẩm mới và chuyển hàng vỡ sang kho hủy kiểm định.',
                createdAt: '2026-06-08T17:30:00'
            },
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
            carrier: 'J và T Express',
            trackingNumber: 'JT99281203',
            createdAt: '2026-06-11T13:00:00',
            subtotal: 650000,
            shippingFee: 30000,
            discount: 0,
            pawPointsUsed: 0,
            total: 680000,
            customerNote: 'Kiểm tra hàng trước khi nhận.',
            internalNote: 'Bưu tá J và T báo phát thành công, tiền thu hộ COD đang chờ bưu cục chuyển đợt thứ 6.',
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
                { title: 'Đã bàn giao vận chuyển', time: '15:00 - 11/06/2026', desc: 'J và T Express tiếp nhận', done: true },
                { title: 'Giao hàng thành công', time: '10:00 - 12/06/2026', desc: 'Khách đã nhận hàng và trả tiền mặt cho bưu tá', done: true },
                { title: 'Chờ đối soát tiền COD', time: '10:30 - 12/06/2026', desc: 'Tiền thu hộ 680.000 đ đang chờ J và T đối soát kỳ tuần', done: false }
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

    // Dữ liệu khuyến mãi và voucher dùng chung với phân hệ Cấu hình (Single Source of Truth)
    const defaultSharedVouchers = [
        { code: 'PAWPAL30K', name: 'Giảm 30K cho đơn hàng đầu tiên', type: 'fixed', target: 'Shop', value: 30000, minOrder: 150000, limit: 200, used: 86, validDate: 'Đến 31/12/2026', status: 'active' },
        { code: 'FREESHIPQ1', name: 'Miễn phí giao hàng nội thành', type: 'fixed', target: 'System', value: 25000, minOrder: 300000, limit: 500, used: 120, validDate: 'Đến 31/12/2026', status: 'active' },
        { code: 'PAWNEW10', name: 'Chào mừng thành viên mới giảm 10%', type: 'percent', target: 'Shop', value: 10, minOrder: 200000, limit: 500, used: 142, validDate: 'Đến 31/12/2026', status: 'active' },
        { code: 'VIPGOLD50', name: 'Tri ân khách hàng hạng Vàng', type: 'fixed', target: 'Shop', value: 50000, minOrder: 500000, limit: 100, used: 28, validDate: 'Đến 31/12/2026', status: 'active' },
        { code: 'SPASUMMER20', name: 'Ưu đãi 20% Dịch vụ Spa và Grooming', type: 'percent', target: 'Spa', value: 20, minOrder: 200000, limit: 100, used: 96, validDate: 'Đến 30/10/2026', status: 'active' },
        { code: 'HOTELVIP50', name: 'Giảm 50K gửi Pet Hotel từ 3 ngày', type: 'fixed', target: 'Hotel', value: 50000, minOrder: 500000, limit: 50, used: 50, validDate: 'Đến 15/11/2026', status: 'expired' }
    ];

    function getSharedVouchersList() {
        try {
            const raw = sessionStorage.getItem('pawpal_settings_vouchers');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {}
        sessionStorage.setItem('pawpal_settings_vouchers', JSON.stringify(defaultSharedVouchers));
        return [...defaultSharedVouchers];
    }

    function persistSharedVouchersData(vouchers) {
        try {
            sessionStorage.setItem('pawpal_settings_vouchers', JSON.stringify(vouchers));
        } catch (e) {}
    }

    let currentProductsList = [];
    try {
        const savedProducts = sessionStorage.getItem('pawpal_admin_products_data');
        currentProductsList = savedProducts ? JSON.parse(savedProducts) : [...initialProducts];
    } catch (e) {
        currentProductsList = [...initialProducts];
    }

    function persistProductsData() {
        try {
            sessionStorage.setItem('pawpal_admin_products_data', JSON.stringify(currentProductsList));
        } catch (e) {}
    }

    // Dữ liệu Lịch sử Biến động Tồn kho mẫu (Giai đoạn 3)
    const initialStockLogs = [
        { id: 'LOG-001', date: '10:30 - 12/06/2026', sku: 'TP-HAT-01', name: 'Thức ăn hạt cao cấp Royal Canin Mother và Babycat', type: 'IN', typeLabel: 'Nhập kho nhà cung cấp', change: '+50', beforeStock: 5, afterStock: 55, refCode: 'GRN-2026-001', staff: 'Nguyễn Văn Quản' },
        { id: 'LOG-002', date: '14:30 - 10/06/2026', sku: 'TP-HAT-01', name: 'Thức ăn hạt cao cấp Royal Canin Mother và Babycat', type: 'OUT', typeLabel: 'Xuất bán đơn hàng', change: '-2', beforeStock: 55, afterStock: 53, refCode: 'ORD-2026-001', staff: 'Lê Thu Thảo' },
        { id: 'LOG-003', date: '16:20 - 11/06/2026', sku: 'TP-HAT-01', name: 'Thức ăn hạt cao cấp Royal Canin Mother và Babycat', type: 'OUT', typeLabel: 'Xuất bán đơn hàng', change: '-1', beforeStock: 53, afterStock: 52, refCode: 'ORD-2026-009', staff: 'Lê Thu Thảo' },
        { id: 'LOG-004', date: '09:15 - 12/06/2026', sku: 'TP-PATE-02', name: 'Pate lon hỗn hợp cá hồi và gà chín mềm King\'s Pet', type: 'IN', typeLabel: 'Nhập kho nhà cung cấp', change: '+100', beforeStock: 32, afterStock: 132, refCode: 'GRN-2026-002', staff: 'Nguyễn Văn Quản' },
        { id: 'LOG-005', date: '10:15 - 08/06/2026', sku: 'TP-PATE-02', name: 'Pate lon hỗn hợp cá hồi và gà chín mềm King\'s Pet', type: 'OUT', typeLabel: 'Xuất bán đơn hàng', change: '-12', beforeStock: 132, afterStock: 120, refCode: 'ORD-2026-002', staff: 'Lê Thu Thảo' },
        { id: 'LOG-006', date: '11:45 - 09/06/2026', sku: 'TP-PATE-02', name: 'Pate lon hỗn hợp cá hồi và gà chín mềm King\'s Pet', type: 'RETURN', typeLabel: 'Khách trả hoàn kho (RMA)', change: '+2', beforeStock: 120, afterStock: 122, refCode: 'RMA-2026-001', staff: 'Nguyễn Văn Quản' },
        { id: 'LOG-007', date: '08:00 - 10/06/2026', sku: 'DD-MAY-03', name: 'Đài phun nước lọc tự động thông minh Petkit Eversweet 3', type: 'ADJUST', typeLabel: 'Kiểm kê định kỳ cân đối', change: '=0', beforeStock: 2, afterStock: 0, refCode: 'STK-2026-001', staff: 'Trần Hoài Nam' }
    ];

    let currentStockLogsList = [];
    try {
        const savedLogs = sessionStorage.getItem('pawpal_admin_stock_logs');
        currentStockLogsList = savedLogs ? JSON.parse(savedLogs) : [...initialStockLogs];
    } catch (e) {
        currentStockLogsList = [...initialStockLogs];
    }

    function persistStockLogsData() {
        try {
            sessionStorage.setItem('pawpal_admin_stock_logs', JSON.stringify(currentStockLogsList));
        } catch (e) {}
    }

    function addStockLog(entry) {
        const newLog = {
            id: 'LOG-' + String(currentStockLogsList.length + 1).padStart(3, '0'),
            date: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('vi-VN'),
            staff: 'Quản trị viên',
            ...entry
        };
        currentStockLogsList.unshift(newLog);
        persistStockLogsData();
    }

    let currentOrdersList = [];
    try {
        const savedOrders = sessionStorage.getItem('pawpal_admin_orders_data');
        currentOrdersList = savedOrders ? JSON.parse(savedOrders) : [...initialOrders];
    } catch (e) {
        currentOrdersList = [...initialOrders];
    }

    function persistOrdersData() {
        try {
            sessionStorage.setItem('pawpal_admin_orders_data', JSON.stringify(currentOrdersList));
        } catch (e) {}
    }

    let selectedOrderId = sessionStorage.getItem('pawpal_admin_order_selected_id') || sessionStorage.getItem('pawpal_admin_order_id') || 'ORD-2026-001';
    let currentFilterStatus = 'ALL';
    let currentFilterPayment = 'ALL';
    let currentFilterPayStatus = 'ALL';
    let filterComplaintOnly = false;
    let filterUrgentOnly = false;
    let filterSlaOverdueOnly = false;
    let selectedBatchOrderIds = []; // Giai đoạn 2: Danh sách đơn chọn hàng loạt
    let activeActionOrderId = null;
    let activeAdjustProductSku = null;
    let activeStockActionSku = null;
    let activeGrnItems = []; // [{ sku, name, qty, price, total }]
    let activeActionVoucherCode = null;
    let renderOrderDetailRef = null;
    let renderProductsTableRef = null;
    let renderGrnItemsTableRef = null;

    function formatVND(amount) {
        return (amount || 0).toLocaleString('vi-VN') + ' đ';
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
            z-index: 99999;
            display: block;
        `;
        toast.textContent = msg;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    function showOrderConfirmModal({ title = 'Xác nhận thao tác', message = 'Bạn có chắc chắn muốn thực hiện thao tác này?', acceptText = 'Đồng ý', onAccept }) {
        const modal = document.getElementById('modalConfirmOrderAction');
        const titleEl = document.getElementById('confirmOrderActionTitle');
        const msgEl = document.getElementById('confirmOrderActionMessage');
        const btnAccept = document.getElementById('btnAcceptOrderConfirm');
        const btnCancel = document.getElementById('btnCancelOrderConfirm');

        if (!modal) {
            if (typeof onAccept === 'function') onAccept();
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) btnAccept.textContent = acceptText;

        const closeModal = () => {
            modal.classList.remove('active');
            if (btnAccept) btnAccept.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                closeModal();
                if (typeof onAccept === 'function') onAccept();
            };
        }

        modal.classList.add('active');
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
                <button type="button" class="header-subtab-btn" data-subtab="tab-order-detail">Hồ sơ</button>
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
                if (o.status === 'pending') statusBadge = '<span class="admin-badge badge-warning">Chờ xác nhận</span>';
                else if (o.status === 'confirmed') statusBadge = '<span class="admin-badge badge-neutral">Đang chuẩn bị</span>';
                else if (o.status === 'shipping') statusBadge = '<span class="admin-badge badge-info">Đang giao</span>';
                else if (o.status === 'delivered') statusBadge = '<span class="admin-badge badge-success">Đã giao</span>';
                else if (o.status === 'completed') statusBadge = '<span class="admin-badge badge-success">Hoàn tất</span>';
                else if (o.status === 'cancelled') statusBadge = '<span class="admin-badge badge-danger">Đã hủy</span>';
                else if (o.status === 'returned') statusBadge = '<span class="admin-badge badge-danger">Đổi trả</span>';

                let payBadge = '';
                if (o.paymentStatus === 'paid') {
                    payBadge = '<span class="admin-badge badge-success">Đã thanh toán</span>';
                } else if (o.paymentStatus === 'cod_pending') {
                    payBadge = '<span class="admin-badge badge-warning">Chờ đối soát COD</span>';
                } else {
                    payBadge = '<span class="admin-badge badge-unpaid">Chưa thanh toán</span>';
                }

                let rowAlertClass = '';
                let alertLabel = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
                if (o.status === 'cancelled') {
                    rowAlertClass += ' row-locked';
                    alertLabel = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
                } else if (sla.level === 'danger') {
                    rowAlertClass = 'row-alert-danger';
                    alertLabel = `<span class="alert-indicator text-danger">• ${sla.label}</span>`;
                } else if (sla.level === 'warning') {
                    rowAlertClass = 'row-alert-warning';
                    alertLabel = `<span class="alert-indicator text-warning">• ${sla.label}</span>`;
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
                                <span class="user-name-link" onclick="PawpalOrdersModule.openCustomerProfile('${o.userId}', '${o.customerName}')">${o.customerName}</span>
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
            sessionStorage.setItem('pawpal_admin_order_selected_id', order.id);
            sessionStorage.setItem('pawpal_admin_order_id', order.id);

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
                            <button type="button" class="btn-rma-link-complaint" onclick="PawpalOrdersModule.openComplaintModule('${rma.id}')">Xem hồ sơ tại phân hệ Khiếu nại -></button>
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

            if (recNameEl) {
                recNameEl.textContent = order.customerName;
                recNameEl.onclick = () => {
                    PawpalOrdersModule.openCustomerProfile(order.userId, order.customerName);
                };
            }
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
        renderOrderDetailRef = renderOrderDetail;

        // 4. Render danh sách sản phẩm và kho (Giai đoạn 3)
        function renderProductsTable() {
            const tbody = document.getElementById('productsTableBody');
            if (!tbody) return;

            // Tính số lượng tạm giữ theo các đơn hàng đang xử lý (pending, confirmed)
            const reservedMap = {};
            currentOrdersList.forEach(o => {
                if (o.status === 'pending' || o.status === 'confirmed') {
                    o.products.forEach(p => {
                        reservedMap[p.sku] = (reservedMap[p.sku] || 0) + (p.quantity || 1);
                    });
                }
            });

            // Cập nhật 5 thẻ KPI chỉ số kho hàng
            const totalProd = currentProductsList.length;
            const inStockProd = currentProductsList.filter(p => p.status !== 'Tạm ngưng' && Math.max(0, (p.stock || 0) - (reservedMap[p.sku] || 0)) > p.minStock).length;
            const lowStockProd = currentProductsList.filter(p => p.status !== 'Tạm ngưng' && Math.max(0, (p.stock || 0) - (reservedMap[p.sku] || 0)) <= p.minStock && Math.max(0, (p.stock || 0) - (reservedMap[p.sku] || 0)) > 0).length;
            const outStockProd = currentProductsList.filter(p => Math.max(0, (p.stock || 0) - (reservedMap[p.sku] || 0)) === 0).length;
            const totalStockValue = currentProductsList.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);

            const statTotalEl = document.getElementById('statTotalProducts');
            const statInStockEl = document.getElementById('statInStockProducts');
            const statLowStockEl = document.getElementById('statLowStockProducts');
            const statOutStockEl = document.getElementById('statOutStockProducts');
            const statStockValueEl = document.getElementById('statTotalStockValue');

            if (statTotalEl) statTotalEl.textContent = totalProd;
            if (statInStockEl) statInStockEl.textContent = inStockProd;
            if (statLowStockEl) statLowStockEl.textContent = lowStockProd;
            if (statOutStockEl) statOutStockEl.textContent = outStockProd;
            if (statStockValueEl) statStockValueEl.textContent = formatVND(totalStockValue);

            const searchVal = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
            const catVal = document.getElementById('productFilterCategory')?.value || 'ALL';
            const stockVal = document.getElementById('productFilterStockStatus')?.value || 'ALL';

            const filtered = currentProductsList.filter(p => {
                const physical = p.stock || 0;
                const reserved = reservedMap[p.sku] || 0;
                const available = Math.max(0, physical - reserved);

                if (catVal !== 'ALL' && p.category !== catVal) return false;
                if (stockVal === 'LOW' && (available > p.minStock || available === 0)) return false;
                if (stockVal === 'OUT' && available !== 0) return false;
                if (stockVal === 'IN_STOCK' && available <= p.minStock) return false;

                if (searchVal) {
                    const matchName = p.name.toLowerCase().includes(searchVal);
                    const matchSku = p.sku.toLowerCase().includes(searchVal);
                    const matchBrand = p.brand.toLowerCase().includes(searchVal);
                    if (!matchName && !matchSku && !matchBrand) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="11" style="text-align: center; padding: 28px; color: var(--text-muted);">
                            Không tìm thấy sản phẩm nào phù hợp với bộ lọc hiện tại.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = filtered.map(p => {
                const physical = p.stock || 0;
                const reserved = reservedMap[p.sku] || 0;
                const available = Math.max(0, physical - reserved);

                let availableClass = '';
                let alertBadge = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';

                if (available === 0) {
                    availableClass = 'out';
                    alertBadge = '<span class="alert-indicator text-danger">• Hết hàng</span>';
                } else if (available <= p.minStock) {
                    availableClass = 'low';
                    alertBadge = `<span class="alert-indicator text-warning">• Sắp hết (còn ${available})</span>`;
                }

                let statusBadge = p.status === 'Tạm ngưng' 
                    ? '<span class="admin-badge badge-danger">Tạm ngưng</span>' 
                    : '<span class="admin-badge badge-neutral">Đang bán</span>';

                return `
                    <tr>
                        <td style="font-family: monospace; font-weight: 600; color: #236B48;">${p.sku}</td>
                        <td style="font-weight: 500;">
                            <div>${p.name}</div>
                            <div style="margin-top: 2px;">
                                <a href="javascript:void(0)" class="user-link-text" style="font-size: 11.5px;" onclick="PawpalOrdersModule.openStockLogsModal('${p.sku}')">Xem lịch sử kho</a>
                            </div>
                        </td>
                        <td>${p.category}</td>
                        <td>${p.brand}</td>
                        <td style="font-weight: 600;">${formatVND(p.price)}</td>
                        <td class="stock-val-physical">${physical}</td>
                        <td style="text-align: center;">
                            <span class="stock-val-reserved ${reserved === 0 ? 'none' : ''}">${reserved > 0 ? reserved : '0'}</span>
                        </td>
                        <td class="stock-val-available ${availableClass}">${available}</td>
                        <td>${alertBadge}</td>
                        <td>${statusBadge}</td>
                        <td style="text-align: center;">
                            <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openStockActionPopover(event, '${p.sku}')">•••</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        renderProductsTableRef = renderProductsTable;

        // 5. Render danh sách khuyến mãi dùng chung toàn hệ thống (Single Source of Truth)
        function renderVouchersTable() {
            const tbody = document.getElementById('vouchersTableBody');
            if (!tbody) return;

            const searchVal = (document.getElementById('promoSearchInput')?.value || '').toLowerCase().trim();
            const vouchersList = getSharedVouchersList();

            const statActive = document.getElementById('statActiveVouchers');
            const statExpiring = document.getElementById('statExpiringVouchers');
            const activeCount = vouchersList.filter(v => v.status === 'active' || v.status === 'Đang chạy').length;
            const expiringCount = vouchersList.filter(v => v.status === 'expired' || v.status === 'Hết hạn' || (v.status === 'active' && (v.limit - (v.used || 0) <= 10))).length;

            if (statActive) statActive.textContent = activeCount;
            if (statExpiring) statExpiring.textContent = expiringCount;

            const filtered = vouchersList.filter(v => {
                if (searchVal) {
                    const matchCode = (v.code || '').toLowerCase().includes(searchVal);
                    const matchTitle = ((v.name || v.title) || '').toLowerCase().includes(searchVal);
                    if (!matchCode && !matchTitle) return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">
                            Không tìm thấy mã khuyến mãi phù hợp.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = filtered.map(v => {
                const titleText = v.name || v.title || 'Ưu đãi PawPal';
                const discountText = v.type === 'percent' 
                    ? `${v.value}% (Tối đa 50k)` 
                    : (typeof v.value === 'number' ? formatVND(v.value) : (v.discount || '30.000 đ'));
                const minOrderText = v.minOrder ? (typeof v.minOrder === 'number' ? formatVND(v.minOrder) : v.minOrder) : '0 đ';
                const targetText = v.target === 'Spa' ? 'Dịch vụ Spa' : (v.target === 'Hotel' ? 'Pet Hotel' : (v.target === 'Shop' ? 'Cửa hàng' : 'Toàn hệ thống'));
                const expiryText = v.validDate || v.expiry || 'Đến 31/12/2026';
                const usedText = `${v.used || 0} / ${v.limit || 100}`;

                let badgeClass = 'badge-paid';
                let statusLabel = 'Đang chạy';

                if (v.status === 'paused' || v.status === 'Tạm ngưng') {
                    badgeClass = 'badge-unpaid';
                    statusLabel = 'Tạm ngưng';
                } else if (v.status === 'expired' || v.status === 'Hết hạn') {
                    badgeClass = 'badge-cancelled';
                    statusLabel = 'Hết hạn';
                } else if (v.limit && (v.limit - (v.used || 0) <= 10)) {
                    badgeClass = 'badge-warning';
                    statusLabel = 'Sắp hết';
                }

                return `
                    <tr>
                        <td><span class="voucher-code-pill">${v.code}</span></td>
                        <td>
                            <div style="font-weight: 500;">${titleText}</div>
                            <div class="sub-meta-text">Áp dụng: ${targetText}</div>
                        </td>
                        <td style="font-weight: 600; color: #236B48;">${discountText}</td>
                        <td>${minOrderText}</td>
                        <td>${v.points || 'Miễn phí'}</td>
                        <td>${expiryText}</td>
                        <td style="font-weight: 500;">${usedText}</td>
                        <td><span class="admin-badge ${badgeClass}">${statusLabel}</span></td>
                        <td style="text-align: center;">
                            <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openVoucherActionModal('${v.code}')">•••</button>
                        </td>
                    </tr>
                `;
            }).join('');
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
            showToast(`Đã bàn giao thành công ${count} đơn hàng cho đơn vị vận chuyển ${carrier}!`, 'success');
        });

        // Lệnh in phiếu đóng gói và in bảng kê
        document.getElementById('btnPrintSlipConfirm')?.addEventListener('click', () => {
            showToast('Lệnh in phiếu đóng gói (Packing Slip) đã gửi đến máy in nhiệt A6 / K80 thành công!', 'success');
        });
        document.getElementById('btnPrintManifestConfirm')?.addEventListener('click', () => {
            showToast('Đã gửi lệnh in Bảng kê bàn giao bưu cục (Manifest) ra máy in văn phòng!', 'success');
        });

        // Nút đối soát toàn bộ tiền COD bưu cục
        document.getElementById('btnQuickReconcileAllCod')?.addEventListener('click', function() {
            const codOrders = currentOrdersList.filter(o => o.paymentStatus === 'cod_pending');
            if (codOrders.length === 0) {
                showToast('Không có đơn hàng nào đang chờ đối soát tiền COD.', 'warning');
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
            persistOrdersData();
            renderOrdersTable();
            if (selectedOrderId) renderOrderDetail(selectedOrderId);
            showToast(`Đã đối soát và xác nhận tiền về tài khoản thành công cho toàn bộ ${codOrders.length} đơn hàng COD!`, 'success');
        });

        // Bộ lọc bảng sản phẩm và khuyến mãi
        document.getElementById('productSearchInput')?.addEventListener('input', renderProductsTable);
        document.getElementById('productFilterCategory')?.addEventListener('change', renderProductsTable);
        document.getElementById('productFilterStockStatus')?.addEventListener('change', renderProductsTable);
        document.getElementById('promoSearchInput')?.addEventListener('input', renderVouchersTable);

        // Xuất file
        document.getElementById('btnExportOrderReport')?.addEventListener('click', () => {
            showToast('Đã xuất báo cáo danh sách đơn hàng sang file Excel/CSV thành công.', 'success');
        });
        document.getElementById('btnExportProductStock')?.addEventListener('click', () => {
            showToast('Đã xuất báo cáo kiểm kê kho hàng thành công.', 'success');
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
                showToast('Vui lòng nhập đầy đủ mã SKU và tên sản phẩm.', 'warning');
                return;
            }

            if (currentProductsList.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
                showToast(`Mã SKU "${sku}" đã tồn tại trong kho. Vui lòng nhập mã khác.`, 'warning');
                return;
            }

            currentProductsList.unshift({
                sku: sku,
                name: name,
                category: cat,
                brand: brand,
                price: price,
                stock: stock,
                minStock: minStock,
                status: 'Còn hàng'
            });
            persistProductsData();

            if (stock > 0) {
                addStockLog({
                    sku: sku,
                    name: name,
                    type: 'IN',
                    typeLabel: 'Nhập kho ban đầu khi tạo sản phẩm',
                    change: `+${stock}`,
                    beforeStock: 0,
                    afterStock: stock,
                    refCode: 'INIT-' + sku,
                    staff: 'Quản trị viên'
                });
            }

            document.getElementById('modalAddProduct')?.classList.remove('active');
            renderProductsTable();
            showToast(`Đã thêm thành công sản phẩm mới "${name}" (SKU: ${sku}) vào kho hàng!`, 'success');
        });

        // Xác nhận lưu điều chỉnh tồn kho
        document.getElementById('btnSubmitAdjustStock')?.addEventListener('click', () => {
            const sku = activeAdjustProductSku;
            const prod = currentProductsList.find(p => p.sku === sku);
            if (!prod) return;

            const opType = document.getElementById('adjustOperationType')?.value || 'ADD';
            const qty = parseInt(document.getElementById('adjustQuantityInput')?.value || '0', 10);
            const newPrice = document.getElementById('adjustPriceInput')?.value;
            const newStatus = document.getElementById('adjustStatusSelect')?.value || 'Đang bán';
            const reason = document.getElementById('adjustReasonSelect')?.value;

            const beforeStock = prod.stock;
            if (opType === 'ADD') {
                prod.stock += qty;
            } else if (opType === 'SUB') {
                prod.stock = Math.max(0, prod.stock - qty);
            } else if (opType === 'SET') {
                prod.stock = Math.max(0, qty);
            }
            const afterStock = prod.stock;

            if (newPrice && parseInt(newPrice, 10) > 0) {
                prod.price = parseInt(newPrice, 10);
            }

            prod.status = newStatus;
            persistProductsData();

            const changeStr = (opType === 'ADD' ? `+${qty}` : opType === 'SUB' ? `-${qty}` : `=${qty}`);
            addStockLog({
                sku: prod.sku,
                name: prod.name,
                type: 'ADJUST',
                typeLabel: reason,
                change: changeStr,
                beforeStock: beforeStock,
                afterStock: afterStock,
                refCode: 'ADJ-' + Date.now().toString().slice(-4),
                staff: 'Quản trị viên'
            });

            document.getElementById('modalAdjustStock')?.classList.remove('active');
            renderProductsTable();
            showToast(`Đã cập nhật tồn kho cho sản phẩm ${sku}! Số lượng tồn mới: ${prod.stock} (Lý do: ${reason}).`, 'success');
        });

        // -------------------------------------------------------------
        // GIAI ĐOẠN 3: PHIẾU NHẬP HÀNG NCC & PHIẾU KIỂM KÊ KHO
        // -------------------------------------------------------------
        function renderGrnItemsTable() {
            const tbody = document.getElementById('grnItemsTableBody');
            const totalQtyEl = document.getElementById('grnTotalQtyDisp');
            const totalAmtEl = document.getElementById('grnTotalAmountDisp');
            if (!tbody) return;

            const totalQty = activeGrnItems.reduce((sum, i) => sum + i.qty, 0);
            const totalAmt = activeGrnItems.reduce((sum, i) => sum + i.total, 0);

            if (totalQtyEl) totalQtyEl.textContent = `${totalQty} món`;
            if (totalAmtEl) totalAmtEl.textContent = formatVND(totalAmt);

            if (activeGrnItems.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px 12px;">
                            Chưa có mặt hàng nào. Vui lòng chọn sản phẩm ở trên và bấm "Thêm dòng".
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = activeGrnItems.map((item, idx) => `
                <tr>
                    <td style="font-family: monospace; font-weight: 600; color: #236B48; white-space: nowrap;">${item.sku}</td>
                    <td style="font-weight: 500;">${item.name}</td>
                    <td style="text-align: center; white-space: nowrap;">
                        <input type="number" class="admin-input" value="${item.qty}" min="1" style="width: 75px; height: 28px; text-align: center; padding: 2px;" onchange="PawpalOrdersModule.updateGrnItemQty(${idx}, this.value)">
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <input type="number" class="admin-input" value="${item.price}" min="0" step="5000" style="width: 110px; height: 28px; text-align: right; padding: 2px 6px;" onchange="PawpalOrdersModule.updateGrnItemPrice(${idx}, this.value)">
                    </td>
                    <td style="text-align: right; font-weight: 600; color: #236B48; white-space: nowrap;">${formatVND(item.total)}</td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removeGrnItem(${idx})">Xóa</button>
                    </td>
                </tr>
            `).join('');
        }
        renderGrnItemsTableRef = renderGrnItemsTable;

        // Nút mở modal nhập hàng NCC
        document.getElementById('btnOpenGoodsReceiptModal')?.addEventListener('click', () => {
            PawpalOrdersModule.openGoodsReceiptModal();
        });

        // Nút thêm dòng sản phẩm vào phiếu nhập
        document.getElementById('btnGrnAddItem')?.addEventListener('click', () => {
            const picker = document.getElementById('grnProductPicker');
            if (!picker || !picker.value) return;
            const sku = picker.value;
            const prod = currentProductsList.find(p => p.sku === sku);
            if (!prod) return;

            const existing = activeGrnItems.find(i => i.sku === sku);
            if (existing) {
                existing.qty += 10;
                existing.total = existing.qty * existing.price;
            } else {
                const costPrice = Math.round((prod.price || 50000) * 0.65); // Giá nhập vốn ước tính 65% giá bán
                activeGrnItems.push({
                    sku: prod.sku,
                    name: prod.name,
                    qty: 10,
                    price: costPrice,
                    total: 10 * costPrice
                });
            }
            renderGrnItemsTable();
        });

        // Xác nhận nhập kho và cộng dồn tồn
        document.getElementById('btnSubmitGoodsReceipt')?.addEventListener('click', () => {
            if (activeGrnItems.length === 0) {
                showToast('Vui lòng thêm ít nhất một mặt hàng vào phiếu nhập kho.', 'warning');
                return;
            }

            const receiptCode = document.getElementById('grnReceiptCode')?.value || ('GRN-' + Date.now().toString().slice(-4));
            const supplier = document.getElementById('grnSupplierSelect')?.value || 'Nhà cung cấp';
            const invoiceNo = document.getElementById('grnInvoiceNo')?.value.trim() || 'N/A';

            activeGrnItems.forEach(item => {
                const prod = currentProductsList.find(p => p.sku === item.sku);
                if (prod) {
                    const before = prod.stock;
                    prod.stock += item.qty;
                    if (prod.status === 'Tạm ngưng' && prod.stock > 0) {
                        prod.status = 'Còn hàng';
                    }
                    addStockLog({
                        sku: prod.sku,
                        name: prod.name,
                        type: 'IN',
                        typeLabel: `Nhập kho từ ${supplier}`,
                        change: `+${item.qty}`,
                        beforeStock: before,
                        afterStock: prod.stock,
                        refCode: receiptCode,
                        staff: 'Nguyễn Văn Quản'
                    });
                }
            });

            persistProductsData();
            document.getElementById('modalGoodsReceipt')?.classList.remove('active');
            renderProductsTable();
            showToast(`Đã hoàn tất nhập kho phiếu ${receiptCode} (${activeGrnItems.length} mặt hàng) từ ${supplier}!`, 'success');
            activeGrnItems = [];
        });

        // Nút mở modal kiểm kê kho
        document.getElementById('btnOpenStocktakeModal')?.addEventListener('click', () => {
            PawpalOrdersModule.openStocktakeModal();
        });

        // Xác nhận cân đối kiểm kê
        document.getElementById('btnSubmitStocktake')?.addEventListener('click', () => {
            const auditCode = document.getElementById('stkAuditCode')?.value || ('STK-' + Date.now().toString().slice(-4));
            const reason = document.getElementById('stkReasonSelect')?.value || 'Kiểm kê định kỳ';
            const rows = document.querySelectorAll('.stk-row-item');

            let updatedCount = 0;
            rows.forEach(row => {
                const sku = row.getAttribute('data-sku');
                const countInput = row.querySelector('.stk-count-input');
                const diffReasonSelect = row.querySelector('.stk-row-reason-select');
                if (!sku || !countInput) return;

                const actualCount = parseInt(countInput.value || '0', 10);
                const prod = currentProductsList.find(p => p.sku === sku);
                if (prod && prod.stock !== actualCount) {
                    const before = prod.stock;
                    const diff = actualCount - before;
                    prod.stock = actualCount;
                    updatedCount++;

                    addStockLog({
                        sku: prod.sku,
                        name: prod.name,
                        type: 'STK',
                        typeLabel: `${reason} (${diffReasonSelect?.value || 'Cân đối kiểm kê'})`,
                        change: diff > 0 ? `+${diff}` : `${diff}`,
                        beforeStock: before,
                        afterStock: prod.stock,
                        refCode: auditCode,
                        staff: 'Trần Hoài Nam'
                    });
                }
            });

            persistProductsData();
            document.getElementById('modalStocktake')?.classList.remove('active');
            renderProductsTable();
            showToast(`Đã hoàn tất phiên kiểm kê ${auditCode}! Đã cân đối tồn cho ${updatedCount} mặt hàng.`, 'success');
        });

        // Bắt sự kiện menu tác vụ kho (Popover Dropdown)
        document.getElementById('menuStockActionLogs')?.addEventListener('click', () => {
            document.getElementById('stockActionDropdown')?.classList.remove('active');
            if (activeStockActionSku) {
                PawpalOrdersModule.openStockLogsModal(activeStockActionSku);
            }
        });
        document.getElementById('menuStockActionAdjust')?.addEventListener('click', () => {
            document.getElementById('stockActionDropdown')?.classList.remove('active');
            if (activeStockActionSku) {
                PawpalOrdersModule.openAdjustStockModal(activeStockActionSku);
            }
        });
        document.getElementById('menuStockActionQuickGrn')?.addEventListener('click', () => {
            document.getElementById('stockActionDropdown')?.classList.remove('active');
            if (activeStockActionSku) {
                PawpalOrdersModule.openGoodsReceiptModal(activeStockActionSku);
            }
        });
        document.getElementById('menuStockActionToggleStatus')?.addEventListener('click', () => {
            document.getElementById('stockActionDropdown')?.classList.remove('active');
            if (activeStockActionSku) {
                PawpalOrdersModule.openConfirmToggleStatusModal(activeStockActionSku);
            }
        });

        // Xác nhận đổi trạng thái kinh doanh trong modal
        document.getElementById('btnConfirmToggleProductStatus')?.addEventListener('click', () => {
            if (!activeStockActionSku) return;
            const prod = currentProductsList.find(p => p.sku === activeStockActionSku);
            if (prod) {
                const isCurrentlySuspended = prod.status === 'Tạm ngưng';
                prod.status = isCurrentlySuspended ? 'Còn hàng' : 'Tạm ngưng';
                persistProductsData();
                if (renderProductsTableRef) renderProductsTableRef();
                document.getElementById('modalConfirmToggleProductStatus')?.classList.remove('active');
            }
        });

        // Mở modal tạo mã khuyến mãi
        document.getElementById('btnOpenCreateVoucherModal')?.addEventListener('click', () => {
            document.getElementById('modalCreateVoucher')?.classList.add('active');
        });

        // Xác nhận tạo mã khuyến mãi dùng chung
        document.getElementById('btnSubmitCreateVoucher')?.addEventListener('click', () => {
            const code = document.getElementById('newVoucherCode')?.value.trim().toUpperCase();
            const title = document.getElementById('newVoucherTitle')?.value.trim();
            const discount = document.getElementById('newVoucherDiscount')?.value.trim();
            const minOrder = document.getElementById('newVoucherMinOrder')?.value.trim() || '0 đ';
            const points = document.getElementById('newVoucherPoints')?.value.trim() || 'Miễn phí';
            const expiry = document.getElementById('newVoucherExpiry')?.value.trim() || '31/12/2026';
            const maxUses = document.getElementById('newVoucherMaxUses')?.value || '100';

            if (!code || !title || !discount) {
                showToast('Vui lòng nhập đầy đủ mã voucher, tên chương trình và mức giảm giá.', 'warning');
                return;
            }

            const vouchersList = getSharedVouchersList();
            if (vouchersList.some(v => (v.code || '').toUpperCase() === code)) {
                showToast(`Mã khuyến mãi "${code}" đã tồn tại trên hệ thống. Vui lòng chọn mã khác.`, 'warning');
                return;
            }

            const isPct = discount.includes('%');
            const numVal = parseInt(discount.replace(/[^\d]/g, '') || '0', 10);
            const numMinOrder = parseInt(minOrder.replace(/[^\d]/g, '') || '0', 10);
            const maxUsesNum = parseInt(maxUses || '100', 10);

            vouchersList.unshift({
                code: code,
                name: title,
                title: title,
                type: isPct ? 'percent' : 'fixed',
                target: 'Shop',
                value: numVal,
                discount: discount,
                minOrder: numMinOrder,
                points: points,
                validDate: expiry,
                expiry: expiry,
                limit: maxUsesNum,
                used: 0,
                status: 'active'
            });

            persistSharedVouchersData(vouchersList);

            document.getElementById('modalCreateVoucher')?.classList.remove('active');
            renderVouchersTable();
            showToast(`Đã phát hành thành công mã khuyến mãi "${code}" trên toàn hệ thống!`, 'success');
        });

        // Cập nhật voucher từ modal tác vụ
        document.getElementById('btnSubmitUpdateVoucher')?.addEventListener('click', () => {
            const code = activeActionVoucherCode;
            const vouchersList = getSharedVouchersList();
            const voucher = vouchersList.find(v => v.code === code);
            if (!voucher) return;

            const newStatus = document.getElementById('voucherTargetStatus')?.value;
            const newExpiry = document.getElementById('voucherTargetExpiry')?.value.trim();

            if (newStatus) {
                voucher.status = (newStatus === 'Đang chạy' || newStatus === 'active') ? 'active' : (newStatus === 'Tạm ngưng' || newStatus === 'paused') ? 'paused' : 'expired';
            }
            if (newExpiry) {
                voucher.validDate = newExpiry;
                voucher.expiry = newExpiry;
            }

            persistSharedVouchersData(vouchersList);

            document.getElementById('modalVoucherAction')?.classList.remove('active');
            renderVouchersTable();
            showToast(`Đã lưu thay đổi cho mã khuyến mãi "${code}" thành công!`, 'success');
        });

        // Tạo đơn tại quầy
        // ====================================================================
        // GIAI ĐOẠN 1: GIỎ HÀNG POS ĐA SẢN PHẨM & MÁY TÍNH TIỀN THỪA TẠI QUẦY
        // ====================================================================
        let activePosCustomer = null;
        let activePendingServiceData = null;
        let posCartItems = []; // [{ sku, name, price, qty, total, isService, bookingId, image }]

        function renderPosCartTable() {
            const listEl = document.getElementById('posCartItemsList');
            const countEl = document.getElementById('posCartItemCount');
            if (!listEl) return;

            const totalCount = posCartItems.reduce((sum, item) => sum + item.qty, 0);
            if (countEl) countEl.textContent = totalCount;

            if (posCartItems.length === 0) {
                listEl.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px 12px;">
                            Chưa có món nào trong giỏ hàng. Vui lòng chọn sản phẩm và bấm "Thêm món" ở trên.
                        </td>
                    </tr>
                `;
                return;
            }

            listEl.innerHTML = posCartItems.map((item, idx) => `
                <tr style="border-bottom: 1px solid var(--border-neutral); height: 44px;">
                    <td style="padding: 8px 12px;">
                        <div style="font-weight: 600; color: var(--text-main);">${item.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.sku}</div>
                    </td>
                    <td style="padding: 8px 10px; text-align: right; font-weight: 500;">
                        ${formatVND(item.price)}
                    </td>
                    <td style="padding: 8px 10px; text-align: center;">
                        <div style="display: inline-flex; align-items: center; border: 1px solid var(--border-neutral); border-radius: var(--admin-radius); overflow: hidden; background: #FFFFFF;">
                            <button type="button" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty - 1})" style="width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; font-weight: 700; color: #236B48;" ${item.qty <= 1 ? 'disabled' : ''}>-</button>
                            <input type="number" value="${item.qty}" min="1" onchange="PawpalOrdersModule.updatePosCartQty(${idx}, parseInt(this.value, 10))" style="width: 36px; height: 26px; border: none; text-align: center; font-weight: 600; font-size: 12px; outline: none;">
                            <button type="button" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty + 1})" style="width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; font-weight: 700; color: #236B48;">+</button>
                        </div>
                    </td>
                    <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #236B48;">
                        ${formatVND(item.price * item.qty)}
                    </td>
                    <td style="padding: 8px 8px; text-align: center;">
                        <button type="button" onclick="PawpalOrdersModule.removePosCartItem(${idx})" title="Xóa món này" style="background: transparent; border: none; color: #DC2626; cursor: pointer; font-size: 13px; font-weight: 600; padding: 4px;">✕</button>
                    </td>
                </tr>
            `).join('');
        }

        function addToPosCart(sku, qty) {
            if (!sku) {
                showToast('Vui lòng chọn sản phẩm để thêm vào giỏ hàng.', 'warning');
                return;
            }
            if (qty <= 0) qty = 1;

            // Xử lý ca dịch vụ liên kết
            if (sku.startsWith('SVC-')) {
                const bookingId = sku.replace('SVC-', '');
                const existing = posCartItems.find(i => i.sku === sku);
                if (existing) {
                    existing.qty += qty;
                } else {
                    const svcData = activePendingServiceData;
                    posCartItems.push({
                        sku: sku,
                        name: svcData ? `[Dịch vụ] ${svcData.serviceName} (${bookingId})` : `[Dịch vụ] Ca ${bookingId}`,
                        price: (svcData && (svcData.total || svcData.basePrice)) || 250000,
                        qty: qty,
                        isService: true,
                        bookingId: bookingId,
                        image: '/assets/images/shop/products/tp-hat-01.png'
                    });
                }
                renderPosCartTable();
                updatePosLiveCalculation();
                return;
            }

            // Xử lý sản phẩm bán lẻ
            const prod = currentProductsList.find(p => p.sku === sku);
            if (!prod) {
                showToast('Không tìm thấy thông tin sản phẩm trong kho.', 'warning');
                return;
            }

            const existing = posCartItems.find(i => i.sku === sku);
            const currentInCart = existing ? existing.qty : 0;
            if (prod.stock < currentInCart + qty) {
                showToast(`Sản phẩm "${prod.name}" chỉ còn ${prod.stock} trong kho (đang có ${currentInCart} trong giỏ).`, 'warning');
                return;
            }

            if (existing) {
                existing.qty += qty;
            } else {
                posCartItems.push({
                    sku: prod.sku,
                    name: prod.name,
                    price: prod.price,
                    qty: qty,
                    isService: false,
                    bookingId: null,
                    image: prod.image || '/assets/images/shop/products/tp-hat-01.png'
                });
            }

            renderPosCartTable();
            updatePosLiveCalculation();
        }

        function updatePosCartQty(index, newQty) {
            if (index < 0 || index >= posCartItems.length) return;
            const item = posCartItems[index];

            if (isNaN(newQty) || newQty <= 0) {
                removePosCartItem(index);
                return;
            }

            if (!item.isService) {
                const prod = currentProductsList.find(p => p.sku === item.sku);
                if (prod && prod.stock < newQty) {
                    showToast(`Sản phẩm "${prod.name}" chỉ còn ${prod.stock} trong kho.`, 'warning');
                    item.qty = prod.stock;
                    renderPosCartTable();
                    updatePosLiveCalculation();
                    return;
                }
            }

            item.qty = newQty;
            renderPosCartTable();
            updatePosLiveCalculation();
        }

        function removePosCartItem(index) {
            if (index < 0 || index >= posCartItems.length) return;
            posCartItems.splice(index, 1);
            renderPosCartTable();
            updatePosLiveCalculation();
        }

        function updatePosLiveCalculation() {
            const voucherInput = document.getElementById('createOrderVoucherCode')?.value.trim().toUpperCase();
            const pointsInput = parseInt(document.getElementById('createOrderPointsInput')?.value || '0', 10);
            const isDelivery = document.getElementById('radioAddrDelivery')?.checked;
            const isFastDelivery = document.getElementById('createOrderFastDelivery')?.checked;
            const payMethod = document.getElementById('createOrderPaymentMethod')?.value || 'cash';
            const cashTendered = parseInt(document.getElementById('createOrderCashTendered')?.value || '0', 10);

            const subtotalEl = document.getElementById('posLiveSubtotal');
            const totalEl = document.getElementById('posLiveTotal');
            const rowShipping = document.getElementById('posRowShippingFee');
            const rowTier = document.getElementById('posRowTierDiscount');
            const rowVoucher = document.getElementById('posRowVoucherDiscount');
            const rowPoints = document.getElementById('posRowPointsDiscount');
            const cashSection = document.getElementById('posCashCalcSection');
            const cashChangeEl = document.getElementById('posLiveCashChange');

            // Tính tổng tiền hàng từ giỏ hàng
            const subtotal = posCartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

            // Phí vận chuyển
            let shippingFee = 0;
            if (isDelivery) {
                shippingFee = isFastDelivery ? 25000 : 15000;
                if (subtotal >= 500000) {
                    shippingFee = 0;
                }
            }

            // 1. Chiết khấu hạng thành viên
            let tierDiscountPercent = 0;
            if (activePosCustomer && activePosCustomer.rank) {
                if (activePosCustomer.rank.includes('Kim Cương')) tierDiscountPercent = 10;
                else if (activePosCustomer.rank.includes('Vàng')) tierDiscountPercent = 5;
                else if (activePosCustomer.rank.includes('Bạc')) tierDiscountPercent = 3;
            }
            const tierDiscount = Math.round(subtotal * (tierDiscountPercent / 100));

            // 2. Mã giảm giá Voucher dùng chung
            let voucherDiscount = 0;
            if (voucherInput) {
                const vouchersList = getSharedVouchersList();
                const matchedVoucher = vouchersList.find(v => (v.code || '').toUpperCase() === voucherInput && (v.status === 'active' || v.status === 'Đang chạy'));
                if (matchedVoucher) {
                    const minOrderReq = typeof matchedVoucher.minOrder === 'number' 
                        ? matchedVoucher.minOrder 
                        : parseInt((matchedVoucher.minOrder || '0').toString().replace(/[^\d]/g, '') || '0', 10);

                    if (subtotal >= minOrderReq) {
                        if (matchedVoucher.type === 'percent' || (matchedVoucher.discount && matchedVoucher.discount.includes('%'))) {
                            const pct = typeof matchedVoucher.value === 'number' && matchedVoucher.type === 'percent'
                                ? matchedVoucher.value
                                : parseInt(matchedVoucher.discount?.match(/\d+/)?.[0] || '10', 10);
                            voucherDiscount = Math.min(50000, Math.round(subtotal * (pct / 100)));
                        } else {
                            const fixedVal = typeof matchedVoucher.value === 'number'
                                ? matchedVoucher.value
                                : parseInt((matchedVoucher.discount || '0').toString().replace(/[^\d]/g, '') || '0', 10);
                            voucherDiscount = fixedVal;
                        }
                    }
                }
            }

            // 3. Đổi điểm PawPoint (100 điểm = 10.000 đ)
            let maxPointsAvailable = (activePosCustomer && activePosCustomer.points) || 0;
            let actualPointsUsed = Math.min(pointsInput || 0, maxPointsAvailable);
            if (actualPointsUsed < 0) actualPointsUsed = 0;
            const pointsDiscount = actualPointsUsed * 100;

            const grandTotal = Math.max(0, subtotal + shippingFee - tierDiscount - voucherDiscount - pointsDiscount);

            if (subtotalEl) subtotalEl.textContent = formatVND(subtotal);

            if (rowShipping) {
                rowShipping.style.display = isDelivery ? 'flex' : 'none';
                const el = document.getElementById('posLiveShippingFee');
                if (el) el.textContent = shippingFee === 0 ? '0 đ (Miễn phí đơn > 500k)' : formatVND(shippingFee);
            }
            
            if (rowTier) {
                rowTier.style.display = tierDiscount > 0 ? 'flex' : 'none';
                const el = document.getElementById('posLiveTierDiscount');
                if (el) el.textContent = '- ' + formatVND(tierDiscount);
            }

            if (rowVoucher) {
                rowVoucher.style.display = voucherDiscount > 0 ? 'flex' : 'none';
                const el = document.getElementById('posLiveVoucherDiscount');
                if (el) el.textContent = '- ' + formatVND(voucherDiscount);
            }

            if (rowPoints) {
                rowPoints.style.display = pointsDiscount > 0 ? 'flex' : 'none';
                const el = document.getElementById('posLivePointsDiscount');
                if (el) el.textContent = '- ' + formatVND(pointsDiscount);
            }

            if (totalEl) totalEl.textContent = formatVND(grandTotal);

            // Xử lý máy tính tiền mặt
            if (cashSection) {
                cashSection.style.display = (payMethod === 'cash') ? 'block' : 'none';
            }
            if (cashChangeEl) {
                if (payMethod === 'cash') {
                    if (cashTendered > 0) {
                        const change = cashTendered - grandTotal;
                        if (change >= 0) {
                            cashChangeEl.textContent = formatVND(change);
                            cashChangeEl.style.color = '#236B48';
                        } else {
                            cashChangeEl.textContent = `Thiếu ${formatVND(Math.abs(change))}`;
                            cashChangeEl.style.color = '#DC2626';
                        }
                    } else {
                        cashChangeEl.textContent = '0 đ';
                        cashChangeEl.style.color = '#236B48';
                    }
                }
            }

            return {
                subtotal,
                shippingFee,
                tierDiscount,
                voucherDiscount,
                pointsDiscount,
                pointsUsed: actualPointsUsed,
                grandTotal,
                cashTendered,
                cashChange: Math.max(0, cashTendered - grandTotal)
            };
        }

        function populateCreateOrderProducts(passedPending) {
            const prodSelect = document.getElementById('createOrderProductSelect');
            if (!prodSelect) return;

            let extraOptions = '';
            try {
                const data = passedPending !== undefined ? passedPending : activePendingServiceData;
                if (data && data.bookingId) {
                    extraOptions = `
                        <option value="SVC-${data.bookingId}" data-price="${data.total || data.basePrice || 250000}" selected>
                            [Dịch vụ] ${data.serviceName} (${data.bookingId}) - ${formatVND(data.total || data.basePrice || 250000)}
                        </option>
                    `;
                }
            } catch (e) {}

            prodSelect.innerHTML = '<option value="">-- Chọn mặt hàng từ kho --</option>' + 
                extraOptions +
                currentProductsList.map(p => `
                    <option value="${p.sku}" data-price="${p.price}" ${p.stock <= 0 ? 'disabled' : ''}>
                        ${p.name} (Tồn: ${p.stock}) - ${formatVND(p.price)} ${p.stock <= 0 ? '[Hết hàng]' : ''}
                    </option>
                `).join('');
        }

        function checkPendingServiceCheckout() {
            try {
                const rawPending = sessionStorage.getItem('pawpal_pos_pending_service_checkout');
                if (!rawPending) return;
                
                // Tiêu thụ ngay lập tức để không tự động bật lại ở các lần chuyển tab tiếp theo
                sessionStorage.removeItem('pawpal_pos_pending_service_checkout');
                
                const data = JSON.parse(rawPending);
                if (!data || !data.bookingId) return;
                activePendingServiceData = data;

                const banner = document.getElementById('posServiceCheckoutBanner');
                const titleEl = document.getElementById('posServiceBannerTitle');
                const detailsEl = document.getElementById('posServiceBannerDetails');
                const costEl = document.getElementById('posServiceBannerCost');
                const phoneInput = document.getElementById('createOrderPhone');
                const nameInput = document.getElementById('createOrderName');
                const noteInput = document.getElementById('createOrderNote');

                if (banner) {
                    banner.style.display = 'block';
                    if (titleEl) titleEl.textContent = `🧾 Thanh toán ca dịch vụ: ${data.bookingId}`;
                    if (detailsEl) detailsEl.textContent = `${data.serviceName} (Bé ${data.petName || 'Pet'} • ${data.petBreed || ''})`;
                    if (costEl) costEl.textContent = formatVND(data.total || data.basePrice || 250000);
                }

                if (phoneInput && data.phone) {
                    phoneInput.value = data.phone;
                    phoneInput.dispatchEvent(new Event('input'));
                }
                if (nameInput && data.customerName) nameInput.value = data.customerName;
                if (noteInput) noteInput.value = data.note || `Thanh toán ca dịch vụ ${data.bookingId}`;

                populateCreateOrderProducts(data);
                // Tự động thêm ca dịch vụ vào giỏ hàng
                addToPosCart(`SVC-${data.bookingId}`, 1);

                document.getElementById('modalCreateOrder')?.classList.add('active');
                updatePosLiveCalculation();
            } catch (err) {
                console.error('Lỗi khi nạp đơn dịch vụ chờ thanh toán tại POS:', err);
            }
        }

        document.getElementById('btnOpenCreateOrderModal')?.addEventListener('click', () => {
            activePosCustomer = null;
            activePendingServiceData = null;
            posCartItems = [];
            renderPosCartTable();

            const memberBanner = document.getElementById('createOrderMemberBanner');
            if (memberBanner) memberBanner.style.display = 'none';

            // Ẩn banner pending service nếu mở thủ công thông thường
            const banner = document.getElementById('posServiceCheckoutBanner');
            if (banner) {
                banner.style.display = 'none';
            }

            populateCreateOrderProducts(null);
            document.getElementById('modalCreateOrder')?.classList.add('active');
            updatePosLiveCalculation();
        });

        // Nút thêm sản phẩm vào giỏ hàng POS
        document.getElementById('btnPosAddToCart')?.addEventListener('click', () => {
            const prodSelect = document.getElementById('createOrderProductSelect');
            const qty = parseInt(document.getElementById('createOrderQty')?.value || '1', 10);
            if (!prodSelect || !prodSelect.value) {
                showToast('Vui lòng chọn sản phẩm trong danh sách trước khi bấm Thêm món.', 'warning');
                return;
            }
            addToPosCart(prodSelect.value, qty);
        });

        // Chuyển đổi phương thức nhận hàng
        const cardAddrInStore = document.getElementById('cardAddrInStore');
        const cardAddrDelivery = document.getElementById('cardAddrDelivery');
        const radioAddrInStore = document.getElementById('radioAddrInStore');
        const radioAddrDelivery = document.getElementById('radioAddrDelivery');

        cardAddrInStore?.addEventListener('click', () => {
            if (radioAddrInStore) radioAddrInStore.checked = true;
            cardAddrInStore.classList.add('selected');
            cardAddrDelivery?.classList.remove('selected');
            updatePosLiveCalculation();
        });

        cardAddrDelivery?.addEventListener('click', () => {
            if (radioAddrDelivery) radioAddrDelivery.checked = true;
            cardAddrDelivery.classList.add('selected');
            cardAddrInStore?.classList.remove('selected');
            updatePosLiveCalculation();
        });

        document.getElementById('createOrderFastDelivery')?.addEventListener('change', updatePosLiveCalculation);

        // Gắn sự kiện tính tiền tức thời khi thay đổi trường trong form POS
        document.getElementById('createOrderVoucherCode')?.addEventListener('input', updatePosLiveCalculation);
        document.getElementById('createOrderPointsInput')?.addEventListener('input', updatePosLiveCalculation);
        document.getElementById('createOrderPaymentMethod')?.addEventListener('change', updatePosLiveCalculation);
        document.getElementById('createOrderCashTendered')?.addEventListener('input', updatePosLiveCalculation);

        // Nút Đủ tiền
        document.getElementById('btnCashExact')?.addEventListener('click', () => {
            const calc = updatePosLiveCalculation();
            const input = document.getElementById('createOrderCashTendered');
            if (input) {
                input.value = calc.grandTotal;
                input.dispatchEvent(new Event('input'));
            }
        });

        // Tự động tìm kiếm thông tin khách hàng khi nhập số điện thoại
        document.getElementById('createOrderPhone')?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const memberBanner = document.getElementById('createOrderMemberBanner');
            const rankLabel = document.getElementById('createOrderRankLabel');
            const pointsLabel = document.getElementById('createOrderPointsLabel');

            if (val.length >= 9) {
                let foundName = '';
                let foundAddr = '';
                let foundRank = 'Thành viên Đồng';
                let foundPoints = 0;
                let foundUserId = 'USER-001';

                // Tìm trong bộ nhớ khách hàng hệ thống
                try {
                    const rawCusts = sessionStorage.getItem('pawpal_admin_customers_data');
                    if (rawCusts) {
                        const parsed = JSON.parse(rawCusts);
                        Object.keys(parsed).forEach(cId => {
                            const c = parsed[cId];
                            if (c.phone && c.phone.replace(/\s+/g, '') === val.replace(/\s+/g, '')) {
                                foundName = c.fullName || c.name || foundName;
                                foundAddr = c.address || (c.addresses && c.addresses[0]?.address) || foundAddr;
                                foundRank = c.membershipTier || c.tier || 'Thành viên Vàng';
                                foundPoints = c.points || 0;
                                foundUserId = cId;
                            }
                        });
                    }
                } catch (err) {}

                // Tìm trong danh sách đơn hàng đã có
                if (!foundName) {
                    const matchedOrder = currentOrdersList.find(o => o.phone && o.phone.replace(/\s+/g, '') === val.replace(/\s+/g, ''));
                    if (matchedOrder) {
                        foundName = matchedOrder.customerName;
                        foundAddr = matchedOrder.address;
                        foundUserId = matchedOrder.userId || 'USER-001';
                        foundRank = 'Thành viên Vàng (Giảm 5%)';
                        foundPoints = 500;
                    }
                }

                if (foundName) {
                    activePosCustomer = {
                        userId: foundUserId,
                        name: foundName,
                        phone: val,
                        address: foundAddr,
                        rank: foundRank,
                        points: foundPoints
                    };

                    const nameInput = document.getElementById('createOrderName');
                    if (nameInput && !nameInput.value) nameInput.value = foundName;

                    const customAddrInput = document.getElementById('createOrderCustomAddress');
                    if (customAddrInput && foundAddr && !customAddrInput.value) customAddrInput.value = foundAddr;

                    if (memberBanner) {
                        memberBanner.style.display = 'flex';
                        if (rankLabel) rankLabel.textContent = foundRank;
                        if (pointsLabel) pointsLabel.textContent = `${foundPoints.toLocaleString('vi-VN')} điểm`;
                    }
                } else {
                    activePosCustomer = null;
                    if (memberBanner) memberBanner.style.display = 'none';
                }
            } else {
                activePosCustomer = null;
                if (memberBanner) memberBanner.style.display = 'none';
            }

            updatePosLiveCalculation();
        });

        // Hàm hiển thị modal hóa đơn nhiệt K80
        function renderAndOpenPosReceipt(order, calc) {
            const recOrderId = document.getElementById('recOrderId');
            const recOrderTime = document.getElementById('recOrderTime');
            const recCashier = document.getElementById('recCashier');
            const recCustName = document.getElementById('recCustName');
            const recCustPhone = document.getElementById('recCustPhone');
            const recItemsBody = document.getElementById('recItemsBody');
            const recSubtotal = document.getElementById('recSubtotal');
            const recRowDiscount = document.getElementById('recRowDiscount');
            const recDiscount = document.getElementById('recDiscount');
            const recRowPoints = document.getElementById('recRowPoints');
            const recPointsDiscount = document.getElementById('recPointsDiscount');
            const recRowShipping = document.getElementById('recRowShipping');
            const recShipping = document.getElementById('recShipping');
            const recTotal = document.getElementById('recTotal');
            const recPayMethod = document.getElementById('recPayMethod');
            const recRowCashTendered = document.getElementById('recRowCashTendered');
            const recCashTendered = document.getElementById('recCashTendered');
            const recRowCashChange = document.getElementById('recRowCashChange');
            const recCashChange = document.getElementById('recCashChange');
            const recPointsEarned = document.getElementById('recPointsEarned');
            const recCustRank = document.getElementById('recCustRank');

            const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('vi-VN');

            if (recOrderId) recOrderId.textContent = order.id;
            if (recOrderTime) recOrderTime.textContent = nowStr;
            if (recCashier) recCashier.textContent = 'Quản trị viên';
            if (recCustName) recCustName.textContent = order.customerName;
            if (recCustPhone) recCustPhone.textContent = order.phone;

            if (recItemsBody) {
                recItemsBody.innerHTML = order.products.map(p => `
                    <tr style="border-bottom: 1px dotted #ECF2EE;">
                        <td style="padding: 4px 0; font-weight: 500;">${p.name}</td>
                        <td style="padding: 4px 4px; text-align: center;">${p.quantity}</td>
                        <td style="padding: 4px 4px; text-align: right;">${formatVND(p.price)}</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600;">${formatVND(p.price * p.quantity)}</td>
                    </tr>
                `).join('');
            }

            const totalDiscount = (order.discount || 0);
            if (recSubtotal) recSubtotal.textContent = formatVND(order.subtotal);
            if (recRowDiscount) {
                recRowDiscount.style.display = totalDiscount > 0 ? 'flex' : 'none';
                if (recDiscount) recDiscount.textContent = '- ' + formatVND(totalDiscount);
            }
            if (recRowPoints) {
                recRowPoints.style.display = (order.pawPointsUsed > 0) ? 'flex' : 'none';
                if (recPointsDiscount) recPointsDiscount.textContent = '- ' + formatVND(order.pawPointsUsed * 100);
            }
            if (recRowShipping) {
                recRowShipping.style.display = (order.shippingFee > 0) ? 'flex' : 'none';
                if (recShipping) recShipping.textContent = formatVND(order.shippingFee);
            }
            if (recTotal) recTotal.textContent = formatVND(order.total);

            const methodNames = {
                'cash': 'Tiền mặt tại quầy',
                'pos': 'Quẹt thẻ POS',
                'qr': 'Chuyển khoản QR code',
                'cod': 'Giao hàng thu tiền COD'
            };
            if (recPayMethod) recPayMethod.textContent = methodNames[order.paymentMethod] || order.paymentMethod;

            if (recRowCashTendered) {
                recRowCashTendered.style.display = (order.paymentMethod === 'cash' && calc && calc.cashTendered > 0) ? 'flex' : 'none';
                if (recCashTendered) recCashTendered.textContent = formatVND(calc?.cashTendered || order.total);
            }
            if (recRowCashChange) {
                recRowCashChange.style.display = (order.paymentMethod === 'cash' && calc && calc.cashTendered > 0) ? 'flex' : 'none';
                if (recCashChange) recCashChange.textContent = formatVND(calc?.cashChange || 0);
            }

            const pointsEarned = Math.round(order.total / 10000);
            if (recPointsEarned) recPointsEarned.textContent = `+${pointsEarned} điểm Pawpoint`;
            if (recCustRank) recCustRank.textContent = activePosCustomer ? activePosCustomer.rank : 'Thành viên mới';

            document.getElementById('modalPosReceipt')?.classList.add('active');
        }

        function finalizePosOrder(phone, name, payMethod, voucherInput, isDelivery, slotSelect, noteVal, calc) {
            const newCode = 'ORD-2026-00' + (currentOrdersList.length + 1);
            const addrInput = document.getElementById('createOrderCustomAddress')?.value?.trim();
            const preset = window.__currentOrderPresetCust;
            const finalAddr = isDelivery ? (addrInput || (preset && preset.address) || (activePosCustomer && activePosCustomer.address) || 'Giao tận nơi theo yêu cầu') : 'Tại cửa hàng PawPal (Nhận trực tiếp)';
            const finalUserId = (preset && (preset.custId || preset.userId)) || (activePosCustomer && activePosCustomer.userId) || 'USER-001';

            const newOrder = {
                id: newCode,
                userId: finalUserId,
                customerName: name,
                phone: phone,
                address: finalAddr,
                status: 'confirmed',
                paymentStatus: (payMethod === 'cod') ? 'unpaid' : 'paid',
                paymentMethod: payMethod,
                carrier: isDelivery ? 'Giao tận nơi (PawPal Express)' : 'Tại quầy PawPal',
                trackingNumber: '--',
                createdAt: new Date().toISOString(),
                subtotal: calc.subtotal,
                shippingFee: calc.shippingFee,
                discount: calc.tierDiscount + calc.voucherDiscount,
                pawPointsUsed: calc.pointsUsed,
                total: calc.grandTotal,
                customerNote: noteVal || (isDelivery ? `Giao tận nơi (${slotSelect})` : 'Tạo đơn tại quầy'),
                internalNote: `Đơn bán trực tiếp POS | Khách: ${activePosCustomer ? activePosCustomer.rank : 'Thành viên mới'}${calc.cashTendered > 0 ? ` | Khách đưa: ${formatVND(calc.cashTendered)} - Thối: ${formatVND(calc.cashChange)}` : ''}`,
                alertType: null,
                products: posCartItems.map(item => ({
                    sku: item.sku,
                    name: item.name,
                    spec: 'Tiêu chuẩn',
                    price: item.price,
                    quantity: item.qty,
                    total: item.price * item.qty,
                    image: item.image || '/assets/images/shop/products/tp-hat-01.png'
                })),
                timeline: [
                    { title: 'Tạo đơn hàng tại quầy (POS)', time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay', desc: `Nhân viên thu ngân lập đơn (${posCartItems.length} mặt hàng) và thu tiền ${formatVND(calc.grandTotal)}`, done: true }
                ]
            };

            // Trừ tồn kho từng sản phẩm bán lẻ
            posCartItems.forEach(cartItem => {
                if (!cartItem.isService) {
                    const prodItem = currentProductsList.find(p => p.sku === cartItem.sku);
                    if (prodItem) {
                        prodItem.stock = Math.max(0, prodItem.stock - cartItem.qty);
                        if (prodItem.stock === 0) {
                            prodItem.status = 'Hết hàng';
                        }
                    }
                }
            });
            persistProductsData();

            // Trừ điểm PawPoint nếu có dùng
            if (calc.pointsUsed > 0 && activePosCustomer) {
                try {
                    const rawCusts = sessionStorage.getItem('pawpal_admin_customers_data');
                    if (rawCusts) {
                        const parsed = JSON.parse(rawCusts);
                        if (parsed[finalUserId]) {
                            parsed[finalUserId].points = Math.max(0, (parsed[finalUserId].points || 0) - calc.pointsUsed);
                            sessionStorage.setItem('pawpal_admin_customers_data', JSON.stringify(parsed));
                        }
                    }
                } catch (e) {}
            }

            // Tăng số lượt đã dùng của voucher nếu có dùng
            if (voucherInput) {
                const voucher = initialVouchers.find(v => v.code === voucherInput);
                if (voucher) {
                    const parts = voucher.used.split('/');
                    const usedCount = parseInt(parts[0].trim(), 10) + 1;
                    const maxCount = parts[1] ? parts[1].trim() : '500';
                    voucher.used = `${usedCount} / ${maxCount}`;
                }
            }

            // Hoàn tất các ca dịch vụ liên kết nếu có trong giỏ hàng
            posCartItems.forEach(cartItem => {
                if (cartItem.isService && cartItem.bookingId) {
                    try {
                        const rawBookings = sessionStorage.getItem('pawpal_admin_services_bookings');
                        if (rawBookings) {
                            const bookings = JSON.parse(rawBookings);
                            const targetBooking = bookings.find(b => b.id === cartItem.bookingId);
                            if (targetBooking) {
                                targetBooking.paymentStatus = `Đã thanh toán (Tại POS - Đơn ${newCode})`;
                                targetBooking.status = (targetBooking.status === 'pending' || targetBooking.status === 'confirmed') ? 'in_progress' : targetBooking.status;
                                targetBooking.timeline = targetBooking.timeline || [];
                                targetBooking.timeline.push({
                                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                    title: `Đã thanh toán tại POS (${newCode})`,
                                    desc: `Đã thu tiền tại quầy ${formatVND(cartItem.price * cartItem.qty)} qua hình thức ${payMethod}. Đơn hàng POS: ${newCode}.`,
                                    done: true,
                                    staff: 'Thu ngân'
                                });
                                sessionStorage.setItem('pawpal_admin_services_bookings', JSON.stringify(bookings));
                            }
                        }
                    } catch (err) {
                        console.error('Lỗi cập nhật ca dịch vụ sau thanh toán POS:', err);
                    }
                }
            });

            activePendingServiceData = null;
            const banner = document.getElementById('posServiceCheckoutBanner');
            if (banner) banner.style.display = 'none';

            currentOrdersList.unshift(newOrder);
            persistOrdersData();
            window.__currentOrderPresetCust = null;
            document.getElementById('modalCreateOrder')?.classList.remove('active');
            renderOrdersTable();
            renderProductsTable();
            renderVouchersTable();
            
            // Mở modal hóa đơn nhiệt K80
            renderAndOpenPosReceipt(newOrder, calc);
            showToast(`Tạo thành công đơn hàng ${newCode}!`, 'success');
        }

        // Xử lý tạo đơn hàng từ form POS
        document.getElementById('btnSubmitCreateOrder')?.addEventListener('click', () => {
            const phone = document.getElementById('createOrderPhone')?.value.trim();
            const name = document.getElementById('createOrderName')?.value.trim();
            const payMethod = document.getElementById('createOrderPaymentMethod')?.value || 'cash';
            const voucherInput = document.getElementById('createOrderVoucherCode')?.value.trim().toUpperCase();
            const isDelivery = document.getElementById('radioAddrDelivery')?.checked;
            const slotSelect = document.getElementById('createOrderDeliverySlot')?.value;
            const noteVal = document.getElementById('createOrderNote')?.value.trim();

            if (!phone || !name) {
                showToast('Vui lòng nhập họ tên và số điện thoại người nhận.', 'warning');
                return;
            }
            if (posCartItems.length === 0) {
                showToast('Giỏ hàng đang trống! Vui lòng chọn sản phẩm và bấm "Thêm món" trước khi tạo đơn.', 'warning');
                return;
            }

            const calc = updatePosLiveCalculation();

            if (payMethod === 'cash' && calc.cashTendered > 0 && calc.cashTendered < calc.grandTotal) {
                showOrderConfirmModal({
                    title: 'Xác nhận tạo đơn thanh toán thiếu',
                    message: `Tiền khách đưa (${formatVND(calc.cashTendered)}) đang nhỏ hơn tổng hóa đơn (${formatVND(calc.grandTotal)}). Bạn có muốn tiếp tục tạo đơn nợ/chưa thanh toán đủ không?`,
                    acceptText: 'Vẫn tạo đơn',
                    onAccept: () => {
                        finalizePosOrder(phone, name, payMethod, voucherInput, isDelivery, slotSelect, noteVal, calc);
                    }
                });
                return;
            }

            finalizePosOrder(phone, name, payMethod, voucherInput, isDelivery, slotSelect, noteVal, calc);
        });

        // Bàn giao vận chuyển modal
        document.getElementById('btnSubmitShipOrder')?.addEventListener('click', () => {
            const tracking = document.getElementById('shipTrackingInput')?.value.trim();
            const carrier = document.getElementById('shipCarrierSelect')?.value;

            if (!tracking) {
                showToast('Vui lòng nhập mã vận đơn bưu cục.', 'warning');
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
                persistOrdersData();
            }

            document.getElementById('modalShipOrder')?.classList.remove('active');
            renderOrdersTable();
            renderOrderDetail(selectedOrderId);
            showToast(`Đã cập nhật giao vận cho đơn ${selectedOrderId}!`, 'success');
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
                persistOrdersData();
            }

            document.getElementById('modalCancelOrder')?.classList.remove('active');
            renderOrdersTable();
            renderOrderDetail(selectedOrderId);
            showToast(`Đã hủy đơn hàng ${selectedOrderId} và hoàn lại tồn kho.`, 'success');
        });

        // Đóng dropdown khi click ngoài
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('orderActionDropdown');
            if (popover && popover.classList.contains('active')) {
                if (!e.target.closest('.btn-action-trigger') && !e.target.closest('#orderActionDropdown')) {
                    popover.classList.remove('active');
                }
            }
            const stockPopover = document.getElementById('stockActionDropdown');
            if (stockPopover && stockPopover.classList.contains('active')) {
                if (!e.target.closest('.btn-action-trigger') && !e.target.closest('#stockActionDropdown')) {
                    stockPopover.classList.remove('active');
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
                showToast('Vui lòng tích chọn ít nhất một sản phẩm cần đổi trả hoặc bồi hoàn.', 'warning');
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
                        const stockItem = currentProductsList.find(p => p.sku === sku);
                        if (stockItem) {
                            stockItem.stock += qty;
                            if (stockItem.stock > 0 && stockItem.status === 'Hết hàng') {
                                stockItem.status = 'Còn hàng';
                            }
                            persistProductsData();
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
            persistOrdersData();
            renderOrdersTable();
            renderProductsTable();
            renderOrderDetail(order.id);

            showToast(`Đã phê duyệt thành công phiếu đổi trả ${rmaCode}!`, 'success');
        });

        // Render lần đầu
        renderOrdersTable();
        renderOrderDetail(selectedOrderId);
        renderProductsTable();
        renderVouchersTable();
        renderOrderDetailRef = renderOrderDetail;

        // Khôi phục subtab từ hash hoặc sessionStorage
        const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_order_subtab');
        const initialSubtab = (hash && document.getElementById(`subtab-${hash}`))
            ? hash
            : (savedSubtab && document.getElementById(`subtab-${savedSubtab}`))
                ? savedSubtab
                : 'tab-order-list';
        switchSubtab(initialSubtab);

        // Tiếp nhận preset đặt đơn và mở đơn hàng từ phân hệ Khách hàng
        const checkPresetOrder = () => {
            const rawPreset = sessionStorage.getItem('pawpal_admin_order_preset');
            if (rawPreset) {
                try {
                    const preset = JSON.parse(rawPreset);
                    window.__currentOrderPresetCust = preset;
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

            if (sessionStorage.getItem('pawpal_admin_order_open_create_modal') === 'true') {
                sessionStorage.removeItem('pawpal_admin_order_open_create_modal');
                const modal = document.getElementById('modalCreateOrder');
                if (modal) modal.classList.add('active');
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

            // Kiểm tra và tự động mở form POS thanh toán cho ca dịch vụ nếu được chuyển sang từ module Dịch vụ
            checkPendingServiceCheckout();
        };
        setTimeout(checkPresetOrder, 150);
    }

    // Xuất API công khai cho module Orders
    window.PawpalOrdersModule = {
        navigateToSettingsMarketing: function() {
            sessionStorage.setItem('pawpal_admin_active_module', 'Cấu hình');
            sessionStorage.setItem('pawpal_admin_settings_subtab', 'tab-banner-promos');
            window.location.hash = '#tab-banner-promos';
            const settingsBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Cấu hình');
            if (settingsBtn) {
                settingsBtn.click();
            }
        },
        openOrderDetail: function(orderId) {
            selectedOrderId = orderId;
            const subtabBtn = document.querySelector('.header-subtab-btn[data-subtab="tab-order-detail"]');
            if (subtabBtn) subtabBtn.click();
            // Cập nhật lại giao diện chi tiết
            if (renderOrderDetailRef) {
                renderOrderDetailRef(orderId);
            }
        },
        openCustomerProfile: function(userId, customerName) {
            const custIdMap = {
                'USER-001': 'CUST-001',
                'USER-002': 'CUST-002',
                'USER-003': 'CUST-003',
                'USER-004': 'CUST-004',
                'USER-005': 'CUST-005',
                'USER-ADMIN': 'CUST-001'
            };
            const targetCustId = custIdMap[userId] || (userId && userId.startsWith('CUST-') ? userId : 'CUST-001');
            sessionStorage.setItem('pawpal_admin_customer_id', targetCustId);
            if (customerName) sessionStorage.setItem('pawpal_admin_customer_name', customerName);
            sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
            sessionStorage.setItem('pawpal_admin_active_module', 'Khách hàng');
            window.location.hash = '#tab-profile';
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
            if (modalId === 'modalCreateOrder') {
                activePendingServiceData = null;
                sessionStorage.removeItem('pawpal_pos_pending_service_checkout');
                const banner = document.getElementById('posServiceCheckoutBanner');
                if (banner) banner.style.display = 'none';
            }
        },
        updatePosCartQty: function(index, qty) {
            updatePosCartQty(index, qty);
        },
        removePosCartItem: function(index) {
            removePosCartItem(index);
        },
        addCashTendered: function(amount) {
            const input = document.getElementById('createOrderCashTendered');
            if (input) {
                const cur = parseInt(input.value || '0', 10);
                input.value = cur + amount;
                input.dispatchEvent(new Event('input'));
            }
        },
        printReceiptDirectly: function() {
            const printArea = document.getElementById('posReceiptPrintArea');
            if (!printArea) return;
            const win = window.open('', '', 'width=420,height=650');
            if (win) {
                win.document.write(`
                    <html>
                    <head>
                        <title>In hóa đơn PawPal</title>
                        <style>
                            @page { size: 80mm auto; margin: 0; }
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; font-size: 12px; color: #000; }
                        </style>
                    </head>
                    <body>
                        ${printArea.innerHTML}
                    </body>
                    </html>
                `);
                win.document.close();
                win.focus();
                setTimeout(() => {
                    win.print();
                    win.close();
                }, 250);
            } else {
                window.print();
            }
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
                showToast(`Đã xác nhận đơn hàng ${orderId}!`, 'success');
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        confirmPayment: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (order) {
                order.paymentStatus = 'paid';
                persistOrdersData();
                showToast(`Đã xác nhận thu tiền cho đơn hàng ${orderId}!`, 'success');
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
                persistOrdersData();
                showToast(`Đã cập nhật trạng thái Đã giao cho đơn ${orderId}!`, 'success');
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
                persistOrdersData();
                showToast(`Đã đối soát thành công tiền COD cho đơn hàng ${orderId}!`, 'success');
                renderOrdersTable();
                window.PawpalOrdersModule.openOrderDetail(orderId);
            }
        },
        completeOrder: function(orderId) {
            const order = currentOrdersList.find(o => o.id === orderId);
            if (!order) return;
            if (order.paymentMethod === 'cod' && order.paymentStatus === 'cod_pending') {
                showToast(`Đơn hàng ${orderId} đang chờ đối soát tiền COD trước khi hoàn tất.`, 'warning');
                return;
            }
            if (order.paymentStatus === 'unpaid') {
                showToast(`Đơn hàng ${orderId} chưa thanh toán. Vui lòng xác nhận thu tiền trước khi hoàn tất.`, 'warning');
                return;
            }
            order.status = 'completed';
            const pointsEarned = Math.floor(order.total / 10000);
            order.timeline.push({
                title: 'Hoàn tất đơn hàng',
                time: new Date().toLocaleTimeString('vi-VN') + ' - Hôm nay',
                desc: `Đơn hàng đã hoàn thành và tích lũy +${pointsEarned} điểm Pawpoint cho khách hàng`,
                done: true
            });

            // Tự động cộng điểm thưởng Pawpoint vào ví khách hàng
            try {
                const rawCust = sessionStorage.getItem('pawpal_admin_customers_data');
                if (rawCust) {
                    const cData = JSON.parse(rawCust);
                    const custIdMap = { 'USER-001': 'CUST-001', 'USER-002': 'CUST-002', 'USER-003': 'CUST-003', 'USER-004': 'CUST-004', 'USER-005': 'CUST-005' };
                    const cId = custIdMap[order.userId] || order.userId;
                    if (cData[cId]) {
                        cData[cId].points = (cData[cId].points || 0) + pointsEarned;
                        cData[cId].orders = cData[cId].orders || [];
                        if (!cData[cId].orders.some(o => o.id === order.id)) {
                            cData[cId].orders.unshift({
                                id: order.id,
                                date: new Date().toLocaleDateString('vi-VN'),
                                total: formatVND(order.total),
                                payment: 'Đã thanh toán',
                                status: 'Hoàn tất',
                                statusClass: 'badge-success'
                            });
                        }
                        sessionStorage.setItem('pawpal_admin_customers_data', JSON.stringify(cData));
                    }
                }
            } catch (e) {}

            persistOrdersData();
            showToast(`Đơn hàng ${orderId} đã hoàn tất! +${pointsEarned} điểm Pawpoint.`, 'success');
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
                showToast('Vui lòng chọn ít nhất một đơn hàng để in phiếu đóng gói.', 'warning');
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
                showToast('Vui lòng chọn ít nhất một đơn hàng để bàn giao vận chuyển.', 'warning');
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
                showToast('Không có đơn hàng nào để xuất bảng kê bàn giao vận chuyển.', 'warning');
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
            showToast(`Đang xuất hóa đơn bán lẻ PDF cho đơn ${orderId}...`, 'info');
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
                showToast(`Đang chuyển sang hồ sơ khiếu nại ${rmaId}...`, 'info');
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
            const prod = currentProductsList.find(p => p.sku === sku);
            if (!prod) return;

            // Tính tạm giữ và khả dụng
            const reserved = currentOrdersList.filter(o => o.status === 'pending' || o.status === 'confirmed').reduce((sum, o) => {
                const item = o.products.find(x => x.sku === sku);
                return sum + (item ? item.quantity : 0);
            }, 0);
            const available = Math.max(0, prod.stock - reserved);

            activeAdjustProductSku = sku;
            const skuEl = document.getElementById('adjustSkuCode');
            const nameEl = document.getElementById('adjustProdName');
            const stockEl = document.getElementById('adjustCurrentStock');
            const priceInput = document.getElementById('adjustPriceInput');
            const statusSelect = document.getElementById('adjustStatusSelect');

            if (skuEl) skuEl.textContent = prod.sku;
            if (nameEl) nameEl.textContent = prod.name;
            if (stockEl) stockEl.innerHTML = `${prod.stock} tổng tồn (${reserved > 0 ? `Đang giữ: ${reserved} • ` : ''}Khả dụng: ${available})`;
            if (priceInput) priceInput.value = prod.price || '';
            if (statusSelect) statusSelect.value = prod.status || 'Đang bán';

            document.getElementById('modalAdjustStock')?.classList.add('active');
        },
        openStockActionPopover: function(e, sku) {
            e.stopPropagation();
            activeStockActionSku = sku;
            document.getElementById('orderActionDropdown')?.classList.remove('active');
            const popover = document.getElementById('stockActionDropdown');
            if (!popover) return;

            const rect = e.target.getBoundingClientRect();
            popover.style.top = `${rect.bottom + 4}px`;
            popover.style.left = `${rect.left - 150}px`;
            popover.classList.add('active');
        },
        handleStockAction: function(action) {
            const sku = activeStockActionSku;
            document.getElementById('stockActionDropdown')?.classList.remove('active');
            if (!sku) return;
            if (action === 'logs') {
                this.openStockLogsModal(sku);
            } else if (action === 'adjust') {
                this.openAdjustStockModal(sku);
            } else if (action === 'grn') {
                this.openGoodsReceiptModal(sku);
            } else if (action === 'toggle') {
                this.openConfirmToggleStatusModal(sku);
            }
        },
        openConfirmToggleStatusModal: function(sku) {
            activeStockActionSku = sku;
            const prod = currentProductsList.find(p => p.sku === sku);
            if (!prod) return;

            const isCurrentlySuspended = prod.status === 'Tạm ngưng';

            const subEl = document.getElementById('toggleStatusProdSubtitle');
            const nameEl = document.getElementById('toggleStatusProdName');
            const currEl = document.getElementById('toggleStatusCurrentBadge');
            const newEl = document.getElementById('toggleStatusNewBadge');
            const descEl = document.getElementById('toggleStatusDescText');

            if (subEl) subEl.textContent = `Mã SKU: ${prod.sku}`;
            if (nameEl) nameEl.textContent = prod.name;
            if (currEl) {
                currEl.innerHTML = isCurrentlySuspended 
                    ? '<span class="admin-badge badge-cancelled">Tạm ngưng</span>'
                    : '<span class="admin-badge badge-paid">Đang bán</span>';
            }
            if (newEl) {
                newEl.innerHTML = isCurrentlySuspended 
                    ? '<span class="admin-badge badge-paid">Còn hàng (Mở bán lại)</span>'
                    : '<span class="admin-badge badge-cancelled">Tạm ngưng kinh doanh</span>';
            }
            if (descEl) {
                descEl.innerHTML = isCurrentlySuspended
                    ? 'Khi mở bán lại, sản phẩm sẽ hiển thị công khai trên Shop và khách hàng có thể tiếp tục đặt mua bình thường.'
                    : 'Khi chuyển sang <strong>Tạm ngưng</strong>, sản phẩm sẽ tạm thời bị ẩn khỏi gian hàng và khách hàng không thể đặt mua trực tuyến.';
            }

            document.getElementById('modalConfirmToggleProductStatus')?.classList.add('active');
        },
        openStockLogsModal: function(sku) {
            activeStockActionSku = sku;
            const prod = currentProductsList.find(p => p.sku === sku);
            if (!prod) return;

            const subEl = document.getElementById('stockLogsSubtitle');
            const totalEl = document.getElementById('stockLogsCurrentTotal');
            const minEl = document.getElementById('stockLogsMinStock');
            const statusEl = document.getElementById('stockLogsStatusText');
            const tbody = document.getElementById('stockLogsTableBody');

            if (subEl) subEl.textContent = `Mã SKU: ${prod.sku} • ${prod.name}`;
            if (totalEl) totalEl.textContent = `${prod.stock} món`;
            if (minEl) minEl.textContent = `${prod.minStock} món`;
            if (statusEl) {
                if (prod.stock === 0) {
                    statusEl.textContent = 'Đã hết hàng';
                    statusEl.className = 'info-value text-danger';
                } else if (prod.stock <= prod.minStock) {
                    statusEl.textContent = 'Sắp hết hàng';
                    statusEl.className = 'info-value text-warning';
                } else {
                    statusEl.textContent = 'An toàn';
                    statusEl.className = 'info-value text-success';
                }
            }

            const skuLogs = currentStockLogsList.filter(l => l.sku === sku);
            if (tbody) {
                if (skuLogs.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">
                                Chưa có lịch sử biến động nào cho sản phẩm này.
                            </td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML = skuLogs.map(l => {
                        let badgeType = 'badge-paid';
                        if (l.type === 'OUT') badgeType = 'badge-cancelled';
                        else if (l.type === 'ADJUST' || l.type === 'STK') badgeType = 'badge-warning';

                        const isPos = l.change.startsWith('+');
                        const isNeg = l.change.startsWith('-');
                        const changeColor = isPos ? '#165335' : (isNeg ? '#8F2424' : '#734718');

                        return `
                            <tr>
                                <td style="white-space: nowrap; color: var(--text-muted); font-size: 11.5px;">${l.date}</td>
                                <td style="white-space: nowrap;">
                                    <span class="admin-badge ${badgeType}">${l.typeLabel}</span>
                                </td>
                                <td style="text-align: center; font-weight: 700; color: ${changeColor}; white-space: nowrap;">${l.change}</td>
                                <td style="text-align: center; white-space: nowrap;">${l.beforeStock}</td>
                                <td style="text-align: center; font-weight: 600; white-space: nowrap;">${l.afterStock}</td>
                                <td style="font-family: monospace; font-weight: 600; color: #236B48; white-space: nowrap;">${l.refCode || '--'}</td>
                                <td style="color: var(--text-muted); white-space: nowrap;">${l.staff || 'Hệ thống'}</td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            document.getElementById('modalStockLogs')?.classList.add('active');
        },
        openAdjustStockModalFromLogs: function() {
            document.getElementById('modalStockLogs')?.classList.remove('active');
            if (activeStockActionSku) {
                PawpalOrdersModule.openAdjustStockModal(activeStockActionSku);
            }
        },
        openGoodsReceiptModal: function(prefillSku) {
            const codeEl = document.getElementById('grnReceiptCode');
            const picker = document.getElementById('grnProductPicker');
            const invInput = document.getElementById('grnInvoiceNo');
            const noteInput = document.getElementById('grnNoteInput');

            if (codeEl) codeEl.value = 'GRN-2026-' + Date.now().toString().slice(-4);
            if (invInput) invInput.value = '';
            if (noteInput) noteInput.value = '';

            if (picker) {
                picker.innerHTML = currentProductsList.map(p => `
                    <option value="${p.sku}" ${prefillSku === p.sku ? 'selected' : ''}>${p.sku} - ${p.name} (Tồn: ${p.stock})</option>
                `).join('');
            }

            activeGrnItems = [];
            if (prefillSku) {
                const prod = currentProductsList.find(p => p.sku === prefillSku);
                if (prod) {
                    const costPrice = Math.round((prod.price || 50000) * 0.65);
                    activeGrnItems.push({
                        sku: prod.sku,
                        name: prod.name,
                        qty: 20,
                        price: costPrice,
                        total: 20 * costPrice
                    });
                }
            }
            if (renderGrnItemsTableRef) renderGrnItemsTableRef();
            document.getElementById('modalGoodsReceipt')?.classList.add('active');
        },
        updateGrnItemQty: function(index, val) {
            const num = parseInt(val || '1', 10);
            if (activeGrnItems[index]) {
                activeGrnItems[index].qty = Math.max(1, num);
                activeGrnItems[index].total = activeGrnItems[index].qty * activeGrnItems[index].price;
                if (renderGrnItemsTableRef) renderGrnItemsTableRef();
            }
        },
        updateGrnItemPrice: function(index, val) {
            const num = parseInt(val || '0', 10);
            if (activeGrnItems[index]) {
                activeGrnItems[index].price = Math.max(0, num);
                activeGrnItems[index].total = activeGrnItems[index].qty * activeGrnItems[index].price;
                if (renderGrnItemsTableRef) renderGrnItemsTableRef();
            }
        },
        removeGrnItem: function(index) {
            activeGrnItems.splice(index, 1);
            if (renderGrnItemsTableRef) renderGrnItemsTableRef();
        },
        openStocktakeModal: function() {
            const codeEl = document.getElementById('stkAuditCode');
            const tbody = document.getElementById('stocktakeTableBody');
            const diffSummary = document.getElementById('stkTotalDiff');

            if (codeEl) codeEl.value = 'STK-2026-' + Date.now().toString().slice(-4);
            if (tbody) {
                tbody.innerHTML = currentProductsList.map(p => `
                    <tr class="stk-row-item" data-sku="${p.sku}">
                        <td style="font-family: monospace; font-weight: 600; color: #236B48;">${p.sku}</td>
                        <td style="font-weight: 500;">${p.name}</td>
                        <td style="text-align: center; font-weight: 600;" class="stk-system-val">${p.stock}</td>
                        <td style="text-align: center;">
                            <input type="number" class="admin-input stk-count-input" value="${p.stock}" min="0" style="width: 75px; height: 28px; text-align: center; padding: 2px;" oninput="PawpalOrdersModule.calcStocktakeDiff(this, ${p.stock})">
                        </td>
                        <td style="text-align: center; font-weight: 700;" class="stk-diff-disp text-success">
                            Khớp (0)
                        </td>
                        <td>
                            <select class="admin-select stk-row-reason-select" style="height: 28px; font-size: 11.5px; padding: 0 6px;">
                                <option value="Khớp số liệu">Khớp số liệu</option>
                                <option value="Hao hụt tự nhiên">Hao hụt tự nhiên</option>
                                <option value="Xuất nhầm mẫu mã">Xuất nhầm mẫu mã</option>
                                <option value="Hàng vỡ hỏng bao bì">Hàng vỡ hỏng bao bì</option>
                                <option value="Chưa nhập phiếu bổ sung">Chưa nhập phiếu bổ sung</option>
                            </select>
                        </td>
                    </tr>
                `).join('');
            }

            if (diffSummary) {
                diffSummary.textContent = '0 mặt hàng lệch';
                diffSummary.className = 'text-success';
            }

            document.getElementById('modalStocktake')?.classList.add('active');
        },
        calcStocktakeDiff: function(inputEl, systemStock) {
            const val = parseInt(inputEl.value || '0', 10);
            const diff = val - systemStock;
            const row = inputEl.closest('.stk-row-item');
            if (!row) return;

            const diffEl = row.querySelector('.stk-diff-disp');
            const reasonSelect = row.querySelector('.stk-row-reason-select');

            if (diffEl) {
                if (diff === 0) {
                    diffEl.textContent = 'Khớp (0)';
                    diffEl.className = 'stk-diff-disp text-success';
                    if (reasonSelect) reasonSelect.value = 'Khớp số liệu';
                } else if (diff > 0) {
                    diffEl.textContent = `Thừa (+${diff})`;
                    diffEl.className = 'stk-diff-disp text-warning';
                    if (reasonSelect && reasonSelect.value === 'Khớp số liệu') reasonSelect.value = 'Chưa nhập phiếu bổ sung';
                } else {
                    diffEl.textContent = `Thiếu (${diff})`;
                    diffEl.className = 'stk-diff-disp text-danger';
                    if (reasonSelect && reasonSelect.value === 'Khớp số liệu') reasonSelect.value = 'Hao hụt tự nhiên';
                }
            }

            // Cập nhật tổng số mặt hàng lệch
            const allRows = document.querySelectorAll('.stk-row-item');
            let diffCount = 0;
            allRows.forEach(r => {
                const count = parseInt(r.querySelector('.stk-count-input')?.value || '0', 10);
                const sys = parseInt(r.querySelector('.stk-system-val')?.textContent || '0', 10);
                if (count !== sys) diffCount++;
            });

            const diffSummary = document.getElementById('stkTotalDiff');
            if (diffSummary) {
                if (diffCount === 0) {
                    diffSummary.textContent = '0 mặt hàng lệch';
                    diffSummary.className = 'text-success';
                } else {
                    diffSummary.textContent = `${diffCount} mặt hàng lệch`;
                    diffSummary.className = 'text-warning';
                }
            }
        },
        openVoucherActionModal: function(code) {
            const vouchersList = getSharedVouchersList();
            const voucher = vouchersList.find(v => v.code === code);
            if (!voucher) return;

            activeActionVoucherCode = code;
            const codeEl = document.getElementById('voucherTargetCode');
            const titleEl = document.getElementById('voucherTargetTitle');
            const usedEl = document.getElementById('voucherTargetUsed');
            const statusSelect = document.getElementById('voucherTargetStatus');
            const expiryInput = document.getElementById('voucherTargetExpiry');

            if (codeEl) codeEl.textContent = voucher.code;
            if (titleEl) titleEl.textContent = voucher.name || voucher.title;
            if (usedEl) usedEl.textContent = `${voucher.used || 0} / ${voucher.limit || 100}`;
            if (statusSelect) statusSelect.value = (voucher.status === 'active' || voucher.status === 'Đang chạy') ? 'Đang chạy' : (voucher.status === 'paused' || voucher.status === 'Tạm ngưng') ? 'Tạm ngưng' : 'Hết hạn';
            if (expiryInput) expiryInput.value = voucher.validDate || voucher.expiry || '';

            document.getElementById('modalVoucherAction')?.classList.add('active');
        }
    };

    // Khởi tạo
    initOrdersModule();
})();
