// complaints.js - Phân hệ Quản lý Khiếu nại Pawpal-er (Chống bỏ sót, SLA và Giải quyết bồi hoàn)
(function() {
    function initComplaintsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 3 Sub-tabs trực tiếp lên Header Bar kèm huy hiệu số đếm đỏ
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-complaint-services" style="position: relative;">
                    Theo dịch vụ
                    <span class="tab-badge-count" id="badgeServiceComplaintsCount" style="display: none;">0</span>
                </button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-orders" style="position: relative;">
                    Theo đơn hàng
                    <span class="tab-badge-count" id="badgeOrderComplaintsCount" style="display: none;">0</span>
                </button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-detail">Hồ sơ</button>
            `;
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
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

        // ---------------------------------------------------------
        // 1. DATA MOCK (Khiếu nại Dịch vụ và Đơn hàng kèm SLA chuẩn)
        // ---------------------------------------------------------
        const mockServiceComplaints = [
            {
                id: 'TK-2026-001',
                customerName: 'Lê Lệ Quyên',
                phone: '0901234567',
                petName: 'Miu Con',
                petBreed: 'Mèo Anh Lông Ngắn • 4.2 kg',
                petNotes: 'Dị ứng phấn hoa và các loại dầu tắm chứa hương liệu đậm đặc. Hơi nhát nước.',
                bookingId: 'BKG-1001',
                serviceType: 'spa',
                serviceName: 'Gói Tắm Vệ Sinh Cơ Bản',
                staffExecuted: 'Ngọc Anh (Chi nhánh Quận 1)',
                title: 'Bé bị trầy xước nhẹ ở tai sau khi tắm sấy',
                content: 'Bé Miu sau khi tắm và sấy tại cơ sở Quận 1 về có vết trầy nhẹ ở vành tai phải và thái độ rất sợ nước, gia đình kiểm tra thấy có rớm máu nhẹ ở viền tai.',
                priority: 'high',
                slaStatus: 'URGENT',
                slaRemainingText: 'Còn 30 phút',
                staffAssigned: 'Lê Lệ Quyên',
                createdAt: '2026-09-28 14:30',
                status: 'processing',
                evidence: ['vet-tray-tai.jpg', 'hoa-don-dich-vu.jpg'],
                checkinHealth: 'Bé tỉnh táo, nhanh nhẹn. Vành tai không phát hiện vết xước hay tụ máu ngoài da khi tiếp nhận.',
                checkinPhotos: ['checkin-miu-01.jpg', 'checkin-miu-tai.jpg'],
                staffLogNote: 'Bé khá giật mình khi dùng máy sấy công suất lớn, đã chuyển sang chế độ sấy êm dịu. Đã hoàn tất vệ sinh tai sạch sẽ.',
                timeline: [
                    { time: '14:30 - 28/09/2026', author: 'Lê Lệ Quyên (Khách hàng)', title: 'Gửi khiếu nại qua Website', desc: 'Khách gửi phản ánh về vết thương ở tai bé Miu kèm hình ảnh.', isInternal: false },
                    { time: '14:45 - 28/09/2026', author: 'Lê Lệ Quyên (CSKH)', title: 'Tiếp nhận Ticket', desc: 'Đã nhận xử lý và chuyển thông tin cho Quản lý chi nhánh xác minh camera.', isInternal: true },
                    { time: '15:15 - 28/09/2026', author: 'Lê Lệ Quyên (CSKH)', title: 'Kiểm tra camera phòng sấy', desc: 'Kỹ thuật viên Ngọc Anh thao tác gỡ móng bị vướng khăn khiến bé giật mình, không có hành vi bạo lực với Pet.', isInternal: true }
                ]
            },
            {
                id: 'TK-2026-002',
                customerName: 'Trần Minh Quân',
                phone: '0912345678',
                petName: 'Bông Xù',
                petBreed: 'Chó Samoyed • 18.5 kg',
                petNotes: 'Da lưng đang có mảng viêm đỏ nhẹ.',
                bookingId: 'BKG-1008',
                serviceType: 'spa',
                serviceName: 'Tắm Thuốc Trị Liệu Da Liễu',
                staffExecuted: 'Trần Văn Hùng (Chi nhánh Quận 1)',
                title: 'Chưa thấy thuyên giảm tình trạng ngứa da',
                content: 'Gói tắm trị liệu đã thực hiện 2 ngày nhưng bé vẫn gãi nhiều ở bả vai, mong muốn được bác sĩ da liễu khám lại.',
                priority: 'medium',
                slaStatus: 'NORMAL',
                slaRemainingText: 'Còn 3h 45p',
                staffAssigned: 'Chưa phân công',
                createdAt: '2026-09-28 11:15',
                status: 'new',
                evidence: ['da-lung-viem.jpg'],
                checkinHealth: 'Vùng bả vai và sống lưng có mảng vảy gàu đỏ li ti, bé liên tục gãi ngứa khi nhận bàn giao.',
                checkinPhotos: ['checkin-samoyed-lung.jpg'],
                staffLogNote: 'Đã ủ dầu tắm trị liệu viêm da trong 15 phút theo phác đồ, sấy khô chân lông cẩn thận.',
                timeline: [
                    { time: '11:15 - 28/09/2026', author: 'Trần Minh Quân (Khách hàng)', title: 'Gửi yêu cầu kiểm tra lại', desc: 'Khách đề nghị bác sĩ kiểm tra lại mảng viêm.', isInternal: false }
                ]
            },
            {
                id: 'TK-2026-003',
                customerName: 'Hoàng Minh Tuấn',
                phone: '0903112233',
                petName: 'Lu Lu',
                petBreed: 'Chó Poodle • 5.0 kg',
                petNotes: 'Hiếu động, thích đồ chơi bóng tennis.',
                bookingId: 'BKG-1004',
                serviceType: 'hotel',
                serviceName: 'Pet Hotel Phòng Tiêu Chuẩn',
                staffExecuted: 'Trần Thị B (Chi nhánh Quận 10)',
                title: 'Bé bỏ ăn bữa tối khi lưu trú khách sạn',
                content: 'Camera phòng khách xem thấy bé không ăn hạt buổi tối, không thấy nhân viên bổ sung pate như Add-on đã mua.',
                priority: 'high',
                slaStatus: 'NORMAL',
                slaRemainingText: 'Còn 2h 10p',
                staffAssigned: 'Trần Thị B',
                createdAt: '2026-09-28 12:00',
                status: 'waiting_customer',
                evidence: [],
                checkinHealth: 'Bé năng động, mắt mũi sáng, thân nhiệt 38.5°C bình thường.',
                checkinPhotos: ['checkin-lulu-phong.jpg'],
                staffLogNote: 'Bé làm quen phòng mới trong 30 phút đầu hơi nhút nhát, sau đó chơi bóng bình thường.',
                timeline: [
                    { time: '12:00 - 28/09/2026', author: 'Hoàng Minh Tuấn (Khách hàng)', title: 'Phản ánh bữa ăn của bé', desc: 'Khách xem camera và báo bé chưa được ăn pate.', isInternal: false },
                    { time: '12:20 - 28/09/2026', author: 'Trần Thị B (Lễ tân)', title: 'Phản hồi khách', desc: 'Đã bổ sung pate hâm nóng và bé đã ăn hết. Đã gửi clip qua Zalo cho khách xác nhận.', isInternal: false }
                ]
            },
            {
                id: 'TK-2026-004',
                customerName: 'Đặng Thùy Dung',
                phone: '0938889900',
                petName: 'Mochi',
                petBreed: 'Mèo Corgi • 6.5 kg',
                petNotes: 'Say xe nhẹ khi đi đường dài.',
                bookingId: 'BKG-1015',
                serviceType: 'taxi',
                serviceName: 'Pet Taxi Sân Bay Tân Sơn Nhất',
                staffExecuted: 'Hoàng Văn E (Tài xế)',
                title: 'Tài xế đến trễ 25 phút giờ đưa bé đi sân bay',
                content: 'Tôi đặt xe lúc 08:30 nhưng đến 08:55 tài xế mới tới, suýt trễ giờ làm thủ tục check-in chuyến bay của gia đình.',
                priority: 'high',
                slaStatus: 'OVERDUE',
                slaRemainingText: 'Quá hạn 1h 15p',
                staffAssigned: 'Chưa phân công',
                createdAt: '2026-09-28 09:10',
                status: 'new',
                evidence: ['anh-lich-trinh-xe.jpg'],
                checkinHealth: 'Tiếp nhận bé trong lồng vận chuyển chuyên dụng, bé hơi lo lắng khi lên xe.',
                checkinPhotos: ['checkin-mochi-long.jpg'],
                staffLogNote: 'Điều hòa xe bật 25°C, che rèm tối để giảm căng thẳng cho bé suốt hành trình.',
                timeline: [
                    { time: '09:10 - 28/09/2026', author: 'Đặng Thùy Dung (Khách hàng)', title: 'Phản ánh tài xế đến trễ', desc: 'Khách khiếu nại tài xế không đúng giờ cam kết đón.', isInternal: false }
                ]
            },
            {
                id: 'TK-2026-005',
                customerName: 'Ngô Thanh Vân',
                phone: '0908765432',
                petName: 'Bắp Rang',
                petBreed: 'Chó Corgi • 12.0 kg',
                petNotes: 'Rất sợ cắt móng chân.',
                bookingId: 'BKG-1019',
                serviceType: 'spa',
                serviceName: 'Cắt Móng và Mài Móng Vệ Sinh',
                staffExecuted: 'Trần Văn Hùng (Groomer)',
                title: 'Bị rớm máu nhẹ ở đầu móng chân sau',
                content: 'Sau khi cắt móng về thấy bé đi khập khiễng, ngón chân sau bên trái bị rớm máu.',
                priority: 'medium',
                slaStatus: 'URGENT',
                slaRemainingText: 'Còn 40 phút',
                staffAssigned: 'Nguyễn Văn A',
                createdAt: '2026-09-28 13:40',
                status: 'processing',
                evidence: ['anh-mong-rom-mau.jpg'],
                checkinHealth: 'Móng chân dài chạm đất, chưa có dấu hiệu nứt móng trước khi cắt.',
                checkinPhotos: ['checkin-corgi-mong.jpg'],
                staffLogNote: 'Bé giãy mạnh khi cắt móng bàn chân sau bên trái, đã bôi bột cầm máu chuyên dụng ngay lập tức.',
                timeline: [
                    { time: '13:40 - 28/09/2026', author: 'Ngô Thanh Vân (Khách hàng)', title: 'Gửi hình ảnh ngón chân bé', desc: 'Khách phản ánh bé bị phạm tủy móng.', isInternal: false }
                ]
            },
            {
                id: 'TK-2026-006',
                customerName: 'Phan Văn Hậu',
                phone: '0977112233',
                petName: 'Simba',
                petBreed: 'Mèo Ba Tư • 4.8 kg',
                petNotes: 'Lông dài dày, cần chải mượt.',
                bookingId: 'BKG-0988',
                serviceType: 'spa',
                serviceName: 'Cắt Tỉa Lông Tạo Kiểu Toàn Diện',
                staffExecuted: 'Nguyễn Văn A (Groomer)',
                title: 'Tạo kiểu bờm sư tử ngắn hơn mong muốn',
                content: 'Khách muốn giữ phần bờm dài 5cm nhưng nhân viên cắt tỉa còn 3cm.',
                priority: 'low',
                slaStatus: 'DONE',
                slaRemainingText: 'Đã giải quyết',
                staffAssigned: 'Lê Lệ Quyên',
                createdAt: '2026-09-27 10:00',
                status: 'resolved',
                evidence: [],
                checkinHealth: 'Lông bờm và thân rối nhẹ, không có nấm da hay bọ chét.',
                checkinPhotos: ['checkin-simba-long.jpg'],
                staffLogNote: 'Cắt tỉa form sư tử theo tỉ lệ đầu thân cân đối, chải tơi lông xù.',
                resolution: {
                    type: 'reward_voucher',
                    typeName: 'Tặng Voucher và Pawpoint bồi hoàn',
                    pawpoints: 200,
                    voucherCode: 'PAWPALCARE50',
                    note: 'Đã gọi điện xin lỗi và tặng voucher giảm 50% gói Spa Grooming lần kế tiếp kèm 200 Pawpoint bồi hoàn.',
                    updatedAt: '11:00 - 27/09/2026'
                },
                timeline: [
                    { time: '10:00 - 27/09/2026', author: 'Phan Văn Hậu (Khách hàng)', title: 'Phản ánh form lông', desc: 'Khách không ưng ý độ dài bờm.', isInternal: false },
                    { time: '11:00 - 27/09/2026', author: 'Lê Lệ Quyên (Admin)', title: 'Tặng voucher chăm sóc', desc: 'Đã gọi điện xin lỗi và tặng voucher giảm 50% lần kế tiếp.', isInternal: false }
                ]
            }
        ];

        const mockOrderComplaints = [
            {
                id: 'TK-ORD-001',
                customerName: 'Lê Lệ Quyên',
                phone: '0901234567',
                orderId: 'ORD-2026-001',
                productName: 'Đồ chơi gặm xương cao su tự nhiên an toàn',
                productSku: 'DD-DOCHOI-01',
                issueType: 'wrong_item',
                customerDemand: 'Đổi sản phẩm đúng màu cam',
                priority: 'medium',
                slaStatus: 'NORMAL',
                slaRemainingText: 'Còn 4h 15p',
                staffAssigned: 'Phạm Thị D',
                createdAt: '2026-09-28 11:20',
                status: 'processing',
                content: 'Tôi đặt đồ chơi xương gặm màu cam nhưng khi mở kiện hàng giao tới lại là màu xanh lá.',
                evidence: ['anh-san-pham-giao-sai.jpg'],
                warehousePhotos: ['pack-ORD-001-cam.jpg', 'seal-ORD-001.jpg'],
                carrier: 'Giao Hàng Nhanh (GHN)',
                trackingCode: 'GHN88291039VN',
                deliveryStatus: 'Giao thành công • Người nhận ký tên: Quyen Le',
                timeline: [
                    { time: '11:20 - 28/09/2026', author: 'Lê Lệ Quyên (Khách hàng)', title: 'Phản ánh giao sai màu', desc: 'Khách nhận nhầm màu đồ chơi so với đơn đặt.', isInternal: false },
                    { time: '11:35 - 28/09/2026', author: 'Phạm Thị D (CSKH)', title: 'Xác nhận đơn hàng và kho', desc: 'Kho đóng gói nhầm mã phân loại màu cam và xanh. Chấp thuận đổi hàng mới miễn phí vận chuyển.', isInternal: true }
                ]
            },
            {
                id: 'TK-ORD-002',
                customerName: 'Nguyễn Văn An',
                phone: '0912345678',
                orderId: 'ORD-2026-005',
                productName: 'Pate Mèo Nắp Bật Thảo Dược Hộp 85g',
                productSku: 'PATE-ME-02',
                issueType: 'damaged',
                customerDemand: 'Gửi bù 2 lon bị móp vỡ',
                priority: 'high',
                slaStatus: 'URGENT',
                slaRemainingText: 'Còn 50 phút',
                staffAssigned: 'Chưa phân công',
                createdAt: '2026-09-28 13:00',
                status: 'new',
                content: 'Kiện hàng bị va đập khi vận chuyển khiến 2 lon pate bị móp méo rách seal bốc mùi.',
                evidence: ['anh-lon-mop.jpg'],
                warehousePhotos: ['pack-ORD-005-lon.jpg', 'seal-ORD-005.jpg'],
                carrier: 'Viettel Post',
                trackingCode: 'VTP99182377VN',
                deliveryStatus: 'Giao thành công • Người nhận ký tên: Nguyen Van An',
                timeline: [
                    { time: '13:00 - 28/09/2026', author: 'Nguyễn Văn An (Khách hàng)', title: 'Yêu cầu gửi bù hàng hỏng', desc: 'Khách gửi ảnh 2 lon pate hỏng seal.', isInternal: false }
                ]
            },
            {
                id: 'TK-ORD-003',
                customerName: 'Vũ Thị Mai',
                phone: '0988776655',
                orderId: 'ORD-2026-008',
                productName: 'Vòng Cổ Phát Sáng Định Vị GPS',
                productSku: 'VC-GPS-09',
                issueType: 'quality',
                customerDemand: 'Bảo hành đổi mới thiết bị',
                priority: 'high',
                slaStatus: 'OVERDUE',
                slaRemainingText: 'Quá hạn 2h 30p',
                staffAssigned: 'Chưa phân công',
                createdAt: '2026-09-28 08:30',
                status: 'new',
                content: 'Vòng cổ sạc pin 4 tiếng nhưng bật nguồn không lên đèn, không kết nối được App điện thoại.',
                evidence: ['video-test-nguon.mp4'],
                warehousePhotos: ['pack-ORD-008-box.jpg', 'seal-ORD-008.jpg'],
                carrier: 'SPX Express',
                trackingCode: 'SPX55198273VN',
                deliveryStatus: 'Giao thành công • Người nhận ký tên: Vu Thi Mai',
                timeline: [
                    { time: '08:30 - 28/09/2026', author: 'Vũ Thị Mai (Khách hàng)', title: 'Báo lỗi thiết bị', desc: 'Thiết bị không lên nguồn sau sạc.', isInternal: false }
                ]
            },
            {
                id: 'TK-ORD-004',
                customerName: 'Trịnh Hoàng Nam',
                phone: '0933221100',
                orderId: 'ORD-2026-012',
                productName: 'Áo Ấm Mùa Đông Lót Lông Poodle',
                productSku: 'AO-LEN-04',
                issueType: 'return_request',
                customerDemand: 'Đổi từ Size M sang Size L',
                priority: 'low',
                slaStatus: 'NORMAL',
                slaRemainingText: 'Còn 18 giờ',
                staffAssigned: 'Phạm Thị D',
                createdAt: '2026-09-28 10:15',
                status: 'waiting_return',
                content: 'Bé nhà mình mặc size M hơi kích nách, còn nguyên tem mác muốn đổi sang size L.',
                evidence: [],
                warehousePhotos: ['pack-ORD-012-nem.jpg'],
                carrier: 'J&T Express',
                trackingCode: 'JT11928374VN',
                deliveryStatus: 'Đang vận chuyển trung chuyển qua kho Củ Chi',
                resolution: {
                    type: 'rma_exchange',
                    typeName: 'Đổi sản phẩm mới (Tạo mã RMA)',
                    rmaCode: 'RMA-2026-091',
                    rmaStep: 2,
                    warehouse: 'Kho Pawpal Tân Bình (123 Hoàng Văn Thụ, Q. Tân Bình, TP.HCM)',
                    pickupMethod: 'Khách hàng tự gửi bưu điện về kho',
                    replacementItem: 'Áo Ấm Mùa Đông Lót Lông Poodle (Size L)',
                    note: 'Đã tạo mã RMA-091 hướng dẫn khách gửi lại size M, kho sẽ gửi bù size L ngay khi nhận được kiện hoàn.',
                    updatedAt: '10:45 - 28/09/2026'
                },
                timeline: [
                    { time: '10:15 - 28/09/2026', author: 'Trịnh Hoàng Nam (Khách hàng)', title: 'Đề nghị đổi size áo', desc: 'Khách đề nghị đổi size L.', isInternal: false },
                    { time: '10:45 - 28/09/2026', author: 'Phạm Thị D (CSKH)', title: 'Tạo mã đổi hàng RMA-091', desc: 'Hướng dẫn khách gửi hàng về kho PawPal.', isInternal: false }
                ]
            },
            {
                id: 'TK-ORD-005',
                customerName: 'Bùi Anh Tuấn',
                phone: '0909001122',
                orderId: 'ORD-2026-019',
                productName: 'Bánh Thưởng Sữa Dê Canxi 100g',
                productSku: 'BANH-THUONG-01',
                issueType: 'missing_item',
                customerDemand: 'Gửi bù 1 gói bị thiếu',
                priority: 'medium',
                slaStatus: 'DONE',
                slaRemainingText: 'Đã hoàn tất',
                staffAssigned: 'Lê Lệ Quyên',
                createdAt: '2026-09-27 15:00',
                status: 'resolved',
                content: 'Hóa đơn in 3 gói nhưng trong thùng xốp mở ra chỉ có 2 gói bánh.',
                evidence: ['anh-thung-hang.jpg'],
                warehousePhotos: ['pack-ORD-019-hat.jpg', 'seal-ORD-019.jpg'],
                carrier: 'Giao Hàng Nhanh (GHN)',
                trackingCode: 'GHN77281900VN',
                deliveryStatus: 'Giao thành công • Người nhận ký tên: Pham Duc Thang',
                timeline: [
                    { time: '15:00 - 27/09/2026', author: 'Bùi Anh Tuấn (Khách hàng)', title: 'Báo thiếu hàng', desc: 'Thiếu 1 gói bánh thưởng sữa dê.', isInternal: false },
                    { time: '15:30 - 27/09/2026', author: 'Lê Lệ Quyên (Admin)', title: 'Check camera kho đóng hàng', desc: 'Nhân viên đóng gói sót 1 gói. Đã book bưu tá hỏa tốc gửi bù.', isInternal: true }
                ]
            }
        ];

        // Đồng bộ dữ liệu khiếu nại do Khách hàng gửi từ trang Web User qua LocalStorage
        try {
            const userServices = JSON.parse(localStorage.getItem('pawpal_service_complaints')) || [];
            userServices.forEach(uItem => {
                if (!mockServiceComplaints.some(m => m.id === uItem.id)) {
                    mockServiceComplaints.unshift(uItem);
                }
            });
        } catch(e) {}

        try {
            const userOrders = JSON.parse(localStorage.getItem('pawpal_order_complaints')) || [];
            userOrders.forEach(uItem => {
                if (!mockOrderComplaints.some(m => m.id === uItem.id)) {
                    mockOrderComplaints.unshift(uItem);
                }
            });
        } catch(e) {}

        function calculateSla(item) {
            if (!item) return;
            if (item.status === 'resolved' || item.status === 'closed') {
                item.slaStatus = 'DONE';
                item.slaRemainingText = item.status === 'resolved' ? 'Đã giải quyết' : 'Đã đóng';
                return;
            }

            let createTime = Date.now();
            if (item.createdAt) {
                let parsed = Date.parse(item.createdAt);
                if (isNaN(parsed)) {
                    const parts = item.createdAt.split(' ');
                    if (parts.length === 2) {
                        parsed = Date.parse(`${parts[0]}T${parts[1]}:00`);
                    }
                }
                if (!isNaN(parsed)) {
                    createTime = parsed;
                }
            }

            const isUrgent = item.priority === 'high' || item.issueType === 'injury' || item.issueType === 'damaged';
            const totalSlaMs = (isUrgent ? 2 : 4) * 60 * 60 * 1000;
            const deadline = createTime + totalSlaMs;
            const remainingMs = deadline - Date.now();

            if (remainingMs <= 0) {
                item.slaStatus = 'OVERDUE';
                const overdueMins = Math.floor(Math.abs(remainingMs) / 60000);
                if (overdueMins < 60) {
                    item.slaRemainingText = `Quá hạn ${overdueMins} phút`;
                } else {
                    const h = Math.floor(overdueMins / 60);
                    const m = overdueMins % 60;
                    item.slaRemainingText = `Quá hạn ${h}h ${m > 0 ? m + 'p' : ''}`.trim();
                }
            } else {
                const remMins = Math.floor(remainingMs / 60000);
                if (remMins <= 60) {
                    item.slaStatus = 'URGENT';
                    item.slaRemainingText = `Còn ${remMins} phút`;
                } else {
                    item.slaStatus = 'NORMAL';
                    const h = Math.floor(remMins / 60);
                    const m = remMins % 60;
                    item.slaRemainingText = `Còn ${h}h ${m > 0 ? m + 'p' : ''}`.trim();
                }
            }
        }

        function saveComplaintsState() {
            try {
                localStorage.setItem('pawpal_service_complaints', JSON.stringify(mockServiceComplaints));
                localStorage.setItem('pawpal_order_complaints', JSON.stringify(mockOrderComplaints));
            } catch(e) {
                console.warn('[ComplaintsSync] Could not save to localStorage', e);
            }
        }

        function applyCompensationToCustomer(resolution) {
            if (!resolution) return;
            try {
                if (resolution.pawpoints && Number(resolution.pawpoints) > 0) {
                    const pts = Number(resolution.pawpoints);
                    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || {};
                    currentUser.points = (Number(currentUser.points) || 0) + pts;
                    currentUser.pawPoints = currentUser.points;
                    localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));

                    const users = JSON.parse(localStorage.getItem('pawpal_users_db')) || [];
                    const uIdx = users.findIndex(u => u.phone === currentUser.phone || u.id === currentUser.id);
                    if (uIdx >= 0) {
                        users[uIdx].points = currentUser.points;
                        users[uIdx].pawPoints = currentUser.points;
                        localStorage.setItem('pawpal_users_db', JSON.stringify(users));
                    }
                    console.log(`[ComplaintsCompensation] Đã cộng +${pts} Pawpoint vào tài khoản khách!`);
                }

                if (resolution.voucherCode) {
                    const vouchers = JSON.parse(localStorage.getItem('pawpal_user_vouchers')) || [];
                    if (!vouchers.some(v => v.code === resolution.voucherCode)) {
                        vouchers.unshift({
                            code: resolution.voucherCode,
                            discountPercent: 50,
                            title: 'Voucher Chăm Sóc Khách Hàng',
                            desc: resolution.note || 'Ưu đãi bồi hoàn từ PawPal',
                            createdAt: new Date().toISOString()
                        });
                        localStorage.setItem('pawpal_user_vouchers', JSON.stringify(vouchers));
                        console.log(`[ComplaintsCompensation] Đã phát hành voucher ${resolution.voucherCode} vào ví ưu đãi!`);
                    }
                }
            } catch (err) {
                console.warn('[ComplaintsCompensation] Lỗi bồi hoàn tài khoản:', err);
            }
        }

        function syncTicketToUserPortal(ticket) {
            if (!ticket) return;
            try {
                const userTickets = JSON.parse(localStorage.getItem('pawpal_support_tickets')) || [];
                const foundIndex = userTickets.findIndex(t => t.id === ticket.id || (ticket.bookingId && t.context?.bookingId === ticket.bookingId) || (ticket.orderId && t.context?.orderId === ticket.orderId));

                const publicMessages = (ticket.timeline || [])
                    .filter(entry => !entry.isInternal)
                    .map(entry => ({
                        sender: entry.author.includes('Khách hàng') ? 'user' : 'cskh',
                        agent: entry.author.includes('Khách hàng') ? '' : entry.author,
                        text: `${entry.title}: ${entry.desc}`,
                        time: entry.time || new Date().toISOString()
                    }))
                    .reverse();

                let updatedStatus = 'pending';
                if (ticket.status === 'processing') updatedStatus = 'processing';
                else if (ticket.status === 'resolved' || ticket.status === 'closed') updatedStatus = 'completed';

                if (foundIndex >= 0) {
                    userTickets[foundIndex].status = updatedStatus;
                    userTickets[foundIndex].resolution = ticket.resolution || null;
                    if (publicMessages.length > 0) {
                        userTickets[foundIndex].messages = publicMessages;
                    }
                } else {
                    userTickets.unshift({
                        id: ticket.id,
                        title: ticket.title,
                        type: ticket.serviceType ? 'service' : 'order',
                        status: updatedStatus,
                        priority: ticket.priority === 'high' ? 'Cao' : 'Trung bình',
                        resolution: ticket.resolution || null,
                        context: {
                            bookingId: ticket.bookingId,
                            orderId: ticket.orderId,
                            serviceName: ticket.serviceName,
                            petName: ticket.petName
                        },
                        messages: publicMessages
                    });
                }
                localStorage.setItem('pawpal_support_tickets', JSON.stringify(userTickets));

                if (ticket.resolution) {
                    applyCompensationToCustomer(ticket.resolution);
                }
            } catch (e) {
                console.warn('[SyncToUser] Error syncing ticket to user portal:', e);
            }
        }

        // Tự động tính toán SLA ban đầu cho tất cả vé
        mockServiceComplaints.forEach(calculateSla);
        mockOrderComplaints.forEach(calculateSla);

        let currentActiveTicket = mockServiceComplaints[0];
        let currentTicketType = 'service'; // 'service' hoặc 'order'

        // Trạng thái lọc
        let currentServiceQuickFilter = 'ALL';
        let currentServiceKpiFilter = 'ALL';
        let currentOrderQuickFilter = 'ALL';
        let currentOrderKpiFilter = 'ALL';

        // ---------------------------------------------------------
        // 2. HELPER BADGE VÀ SLA
        // ---------------------------------------------------------
        function getSlaBadge(item) {
            calculateSla(item);
            if (item.status === 'resolved' || item.status === 'closed') {
                return '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
            }
            if (item.slaStatus === 'OVERDUE') {
                return `<span class="alert-indicator text-danger">• ${escapeHtml(item.slaRemainingText)}</span>`;
            }
            if (item.slaStatus === 'URGENT') {
                return `<span class="alert-indicator text-warning">• ${escapeHtml(item.slaRemainingText)}</span>`;
            }
            return `<span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(item.slaRemainingText)}</span>`;
        }

        function updateComplaintsKpis() {
            // Tái tính toán SLA trước khi đếm KPIs
            mockServiceComplaints.forEach(calculateSla);
            mockOrderComplaints.forEach(calculateSla);

            // Service KPIs
            const sNew = mockServiceComplaints.filter(i => i.status === 'new').length;
            const sProc = mockServiceComplaints.filter(i => i.status === 'processing').length;
            const sWait = mockServiceComplaints.filter(i => i.status === 'waiting_customer').length;
            const sHigh = mockServiceComplaints.filter(i => i.priority === 'high' && i.status !== 'resolved' && i.status !== 'closed').length;
            const sOver = mockServiceComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed').length;

            const elSNew = document.getElementById('statServiceNew');
            const elSProc = document.getElementById('statServiceProcessing');
            const elSWait = document.getElementById('statServiceWaiting');
            const elSHigh = document.getElementById('statServiceHighPriority');
            const elSOver = document.getElementById('statServiceOverdue');

            if (elSNew) elSNew.textContent = sNew;
            if (elSProc) elSProc.textContent = sProc;
            if (elSWait) elSWait.textContent = sWait;
            if (elSHigh) elSHigh.textContent = sHigh;
            if (elSOver) elSOver.textContent = sOver;

            // Order KPIs
            const oNew = mockOrderComplaints.filter(i => i.status === 'new').length;
            const oProc = mockOrderComplaints.filter(i => i.status === 'processing').length;
            const oRma = mockOrderComplaints.filter(i => i.issueType === 'return_request').length;
            const oWait = mockOrderComplaints.filter(i => i.status === 'waiting_return').length;
            const oRef = mockOrderComplaints.filter(i => i.status === 'refunding').length;
            const oOver = mockOrderComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed').length;

            const elONew = document.getElementById('statOrderNew');
            const elOProc = document.getElementById('statOrderProcessing');
            const elORma = document.getElementById('statOrderRMA');
            const elOWait = document.getElementById('statOrderWaitingReturn');
            const elORef = document.getElementById('statOrderRefunding');
            const elOOver = document.getElementById('statOrderOverdue');

            if (elONew) elONew.textContent = oNew;
            if (elOProc) elOProc.textContent = oProc;
            if (elORma) elORma.textContent = oRma;
            if (elOWait) elOWait.textContent = oWait;
            if (elORef) elORef.textContent = oRef;
            if (elOOver) elOOver.textContent = oOver;

            // Cập nhật huy hiệu số đếm đỏ trên Subtab Header
            const servicePendingCount = sNew + sProc + sWait;
            const orderPendingCount = oNew + oProc + oWait;

            const badgeService = document.getElementById('badgeServiceComplaintsCount');
            const badgeOrder = document.getElementById('badgeOrderComplaintsCount');

            if (badgeService) {
                if (servicePendingCount > 0) {
                    badgeService.textContent = servicePendingCount;
                    badgeService.style.display = 'inline-block';
                } else {
                    badgeService.style.display = 'none';
                }
            }

            if (badgeOrder) {
                if (orderPendingCount > 0) {
                    badgeOrder.textContent = orderPendingCount;
                    badgeOrder.style.display = 'inline-block';
                } else {
                    badgeOrder.style.display = 'none';
                }
            }
        }

        // ---------------------------------------------------------
        // 3. RENDER THANH CẢNH BÁO VẬN HÀNH (COMPLAINTS ALERT BAR)
        // ---------------------------------------------------------
        function renderComplaintsAlertBar() {
            // Alert cho Dịch vụ
            const serviceContainer = document.getElementById('serviceAlertItemsContainer');
            if (serviceContainer) {
                const alerts = [];
                const overdueService = mockServiceComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed');
                if (overdueService.length > 0) {
                    const ids = overdueService.map(i => i.id).join(', ');
                    alerts.push({
                        type: 'danger',
                        prefix: `${overdueService.length} ca`,
                        main: 'Quá hạn SLA',
                        sub: `(${ids})`,
                        text: `${overdueService.length} khiếu nại dịch vụ quá hạn SLA (${ids})`,
                        filter: 'OVERDUE'
                    });
                }

                const urgentInjury = mockServiceComplaints.filter(i => i.priority === 'high' && (i.content.includes('trầy') || i.content.includes('máu') || i.content.includes('rớt')));
                if (urgentInjury.length > 0) {
                    alerts.push({
                        type: 'warning',
                        prefix: 'Khẩn cấp',
                        main: 'Sự cố can thiệp Pet',
                        sub: `(${urgentInjury[0].id})`,
                        text: `Có sự cố Pet cần can thiệp chăm sóc khẩn cấp (${urgentInjury[0].id})`,
                        filter: 'HIGH'
                    });
                }

                const unassignedService = mockServiceComplaints.filter(i => i.staffAssigned === 'Chưa phân công' && i.status !== 'resolved' && i.status !== 'closed');
                if (unassignedService.length > 0) {
                    alerts.push({
                        type: 'info',
                        prefix: `${unassignedService.length} ca`,
                        main: 'Chưa phân công',
                        sub: '(Dịch vụ)',
                        text: `${unassignedService.length} ca khiếu nại dịch vụ chưa phân công người phụ trách`,
                        filter: 'UNASSIGNED'
                    });
                }

                let html = alerts.map(a => `
                    <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">
                        <span class="tag-highlight">${escapeHtml(a.prefix)}</span>
                        <span class="tag-main">${escapeHtml(a.main)}</span>
                        <span class="tag-sub">${escapeHtml(a.sub)}</span>
                    </span>
                `).join('');

                if (alerts.length > 2) {
                    html += `<span class="alert-dots-text">...</span>`;
                }
                serviceContainer.innerHTML = html || '<span style="font-size: 12px; color: var(--text-muted);">Không có cảnh báo khẩn cấp nào cho dịch vụ.</span>';

                serviceContainer.querySelectorAll('.alert-item-tag').forEach(tag => {
                    tag.addEventListener('click', () => {
                        const f = tag.getAttribute('data-filter');
                        setServiceQuickFilter(f);
                    });
                });
            }

            // Alert cho Đơn hàng
            const orderContainer = document.getElementById('orderAlertItemsContainer');
            if (orderContainer) {
                const alerts = [];
                const overdueOrder = mockOrderComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed');
                if (overdueOrder.length > 0) {
                    const ids = overdueOrder.map(i => i.id).join(', ');
                    alerts.push({
                        type: 'danger',
                        prefix: `${overdueOrder.length} ca`,
                        main: 'Quá hạn SLA',
                        sub: `(${ids})`,
                        text: `${overdueOrder.length} khiếu nại đơn hàng quá hạn SLA (${ids})`,
                        filter: 'OVERDUE'
                    });
                }

                const unassignedOrder = mockOrderComplaints.filter(i => i.staffAssigned === 'Chưa phân công' && i.status !== 'resolved' && i.status !== 'closed');
                if (unassignedOrder.length > 0) {
                    alerts.push({
                        type: 'info',
                        prefix: `${unassignedOrder.length} ca`,
                        main: 'Chưa phân công',
                        sub: '(Đơn hàng)',
                        text: `${unassignedOrder.length} khiếu nại đơn hàng mới chưa phân công`,
                        filter: 'UNASSIGNED'
                    });
                }

                let html = alerts.map(a => `
                    <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">
                        <span class="tag-highlight">${escapeHtml(a.prefix)}</span>
                        <span class="tag-main">${escapeHtml(a.main)}</span>
                        <span class="tag-sub">${escapeHtml(a.sub)}</span>
                    </span>
                `).join('');

                if (alerts.length > 2) {
                    html += `<span class="alert-dots-text">...</span>`;
                }
                orderContainer.innerHTML = html || '<span style="font-size: 12px; color: var(--text-muted);">Không có cảnh báo khẩn cấp nào cho đơn hàng.</span>';

                orderContainer.querySelectorAll('.alert-item-tag').forEach(tag => {
                    tag.addEventListener('click', () => {
                        const f = tag.getAttribute('data-filter');
                        setOrderQuickFilter(f);
                    });
                });
            }
        }

        // ---------------------------------------------------------
        // 4. CHUYỂN ĐỔI SUB-TAB VÀ DEEP BREADCRUMB
        // ---------------------------------------------------------
        const headerSubtabBtns = subtabsContainer ? subtabsContainer.querySelectorAll('.header-subtab-btn') : [];
        const sections = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(ticketCode) {
            if (!deepBreadcrumbEl) return;
            if (ticketCode) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${escapeHtml(ticketCode)}</span>
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

            sections.forEach(sec => {
                if (sec.id === `subtab-${targetSubtab}`) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('active');
                }
            });

            if (targetSubtab === 'tab-complaint-services') {
                renderServiceComplaintsTable();
                updateBreadcrumb(null);
            } else if (targetSubtab === 'tab-complaint-orders') {
                renderOrderComplaintsTable();
                updateBreadcrumb(null);
            } else if (targetSubtab === 'tab-complaint-detail') {
                renderTicketDetail(currentActiveTicket);
                updateBreadcrumb(currentActiveTicket ? currentActiveTicket.id : null);
            }

            sessionStorage.setItem('pawpal_admin_complaint_active_subtab', targetSubtab);
            try {
                history.replaceState(null, '', '#' + targetSubtab);
            } catch (e) {}

            renderComplaintsAlertBar();
            updateComplaintsKpis();
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.getAttribute('data-subtab');
                if (target) {
                    switchSubtab(target);
                }
            });
        });

        // ---------------------------------------------------------
        // 5. RENDER SUB-TAB 1: KHIẾU NẠI DỊCH VỤ VÀ BỘ LỌC ĐỘNG
        // ---------------------------------------------------------
        function setServiceQuickFilter(filter) {
            currentServiceQuickFilter = filter;
            document.querySelectorAll('#serviceQuickChips .quick-chip-btn').forEach(btn => {
                if (btn.getAttribute('data-filter') === filter) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            renderServiceComplaintsTable();
        }

        function renderServiceComplaintsTable() {
            const tbody = document.getElementById('serviceComplaintsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const searchInput = document.getElementById('serviceSearchInput');
            const categorySelect = document.getElementById('serviceFilterCategory');
            const statusSelect = document.getElementById('serviceFilterStatus');
            const prioritySelect = document.getElementById('serviceFilterPriority');
            const staffSelect = document.getElementById('serviceFilterStaff');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
            const selectedCat = categorySelect ? categorySelect.value : 'ALL';
            const selectedStatus = statusSelect ? statusSelect.value : 'ALL';
            const selectedPriority = prioritySelect ? prioritySelect.value : 'ALL';
            const selectedStaff = staffSelect ? staffSelect.value : 'ALL';

            const filtered = mockServiceComplaints.filter(item => {
                // Search term
                if (searchTerm) {
                    const match = (item.id && item.id.toLowerCase().includes(searchTerm)) ||
                                  (item.customerName && item.customerName.toLowerCase().includes(searchTerm)) ||
                                  (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
                                  (item.petName && item.petName.toLowerCase().includes(searchTerm)) ||
                                  (item.bookingId && item.bookingId.toLowerCase().includes(searchTerm)) ||
                                  (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                                  (item.content && item.content.toLowerCase().includes(searchTerm));
                    if (!match) return false;
                }

                // Dropdowns
                if (selectedCat !== 'ALL' && item.serviceType !== selectedCat) return false;
                if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
                if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;
                if (selectedStaff !== 'ALL') {
                    if (selectedStaff === 'unassigned') {
                        if (item.staffAssigned !== 'Chưa phân công') return false;
                    } else if (item.staffAssigned !== selectedStaff) return false;
                }

                // Quick chips
                if (currentServiceQuickFilter === 'MY' && item.staffAssigned !== 'Lê Lệ Quyên') return false;
                if (currentServiceQuickFilter === 'UNASSIGNED' && item.staffAssigned !== 'Chưa phân công') return false;
                if (currentServiceQuickFilter === 'OVERDUE' && item.slaStatus !== 'OVERDUE') return false;
                if (currentServiceQuickFilter === 'HIGH' && item.priority !== 'high') return false;

                // KPI filter
                if (currentServiceKpiFilter !== 'ALL') {
                    if (currentServiceKpiFilter === 'high') {
                        if (item.priority !== 'high') return false;
                    } else if (currentServiceKpiFilter === 'overdue') {
                        if (item.slaStatus !== 'OVERDUE') return false;
                    } else if (item.status !== currentServiceKpiFilter) return false;
                }

                return true;
            });

            if (filtered.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="12" style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
                        Không tìm thấy khiếu nại dịch vụ phù hợp với điều kiện lọc.
                    </td>
                `;
                tbody.appendChild(tr);
                return;
            }

            filtered.forEach(item => {
                let statusBadge = '';
                if (item.status === 'new') statusBadge = '<span class="admin-badge badge-warning">Mới tiếp nhận</span>';
                else if (item.status === 'processing') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
                else if (item.status === 'waiting_customer') statusBadge = '<span class="admin-badge badge-neutral">Chờ phản hồi</span>';
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-success">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge badge-neutral">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge badge-danger">Cao</span>'
                    : (item.priority === 'medium' ? '<span class="admin-badge badge-warning">Trung bình</span>' : '<span class="admin-badge badge-neutral">Thấp</span>');

                let rowClass = '';
                if (item.slaStatus === 'OVERDUE' || item.priority === 'high') {
                    rowClass = 'row-alert-high';
                } else if (item.slaStatus === 'URGENT' || item.priority === 'medium') {
                    rowClass = 'row-alert-warning';
                }

                const slaBadgeHtml = getSlaBadge(item);

                let staffCellHtml = '';
                if (item.staffAssigned === 'Chưa phân công' && item.status !== 'resolved' && item.status !== 'closed') {
                    staffCellHtml = `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #DC2626; font-size: 12px; font-weight: 500;">Chưa nhận</span>
                            <button type="button" class="btn-text-action btn-quick-assign" data-id="${item.id}" data-type="service">Nhận xử lý</button>
                        </div>
                    `;
                } else {
                    staffCellHtml = `<span>${escapeHtml(item.staffAssigned)}</span>`;
                }

                const tr = document.createElement('tr');
                if (rowClass) tr.className = rowClass;
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.id)}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-open-ticket" data-id="${item.id}" data-type="service">${escapeHtml(item.customerName)}</a>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(item.phone)}</div>
                    </td>
                    <td>${escapeHtml(item.petName)}</td>
                    <td><a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${item.bookingId}">${escapeHtml(item.bookingId)}</a></td>
                    <td>${escapeHtml(item.serviceName)}</td>
                    <td>
                        <div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.content)}">
                            ${escapeHtml(item.title)}
                        </div>
                    </td>
                    <td>${priorityBadge}</td>
                    <td>${slaBadgeHtml}</td>
                    <td>${staffCellHtml}</td>
                    <td>${escapeHtml(item.createdAt)}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-complaint-action" data-id="${item.id}" data-type="service">•••</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachComplaintTableEvents();
        }

        // ---------------------------------------------------------
        // 6. RENDER SUB-TAB 2: KHIẾU NẠI ĐƠN HÀNG VÀ BỘ LỌC ĐỘNG
        // ---------------------------------------------------------
        function setOrderQuickFilter(filter) {
            currentOrderQuickFilter = filter;
            document.querySelectorAll('#orderQuickChips .quick-chip-btn').forEach(btn => {
                if (btn.getAttribute('data-filter') === filter) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            renderOrderComplaintsTable();
        }

        function renderOrderComplaintsTable() {
            const tbody = document.getElementById('orderComplaintsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const searchInput = document.getElementById('orderSearchInput');
            const issueSelect = document.getElementById('orderFilterIssue');
            const statusSelect = document.getElementById('orderFilterStatus');
            const prioritySelect = document.getElementById('orderFilterPriority');
            const staffSelect = document.getElementById('orderFilterStaff');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
            const selectedIssue = issueSelect ? issueSelect.value : 'ALL';
            const selectedStatus = statusSelect ? statusSelect.value : 'ALL';
            const selectedPriority = prioritySelect ? prioritySelect.value : 'ALL';
            const selectedStaff = staffSelect ? staffSelect.value : 'ALL';

            const filtered = mockOrderComplaints.filter(item => {
                if (searchTerm) {
                    const match = (item.id && item.id.toLowerCase().includes(searchTerm)) ||
                                  (item.customerName && item.customerName.toLowerCase().includes(searchTerm)) ||
                                  (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
                                  (item.orderId && item.orderId.toLowerCase().includes(searchTerm)) ||
                                  (item.productName && item.productName.toLowerCase().includes(searchTerm)) ||
                                  (item.content && item.content.toLowerCase().includes(searchTerm));
                    if (!match) return false;
                }

                if (selectedIssue !== 'ALL' && item.issueType !== selectedIssue) return false;
                if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
                if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;
                if (selectedStaff !== 'ALL') {
                    if (selectedStaff === 'unassigned') {
                        if (item.staffAssigned !== 'Chưa phân công') return false;
                    } else if (item.staffAssigned !== selectedStaff) return false;
                }

                if (currentOrderQuickFilter === 'MY' && item.staffAssigned !== 'Lê Lệ Quyên') return false;
                if (currentOrderQuickFilter === 'UNASSIGNED' && item.staffAssigned !== 'Chưa phân công') return false;
                if (currentOrderQuickFilter === 'OVERDUE' && item.slaStatus !== 'OVERDUE') return false;
                if (currentOrderQuickFilter === 'HIGH' && item.priority !== 'high') return false;

                if (currentOrderKpiFilter !== 'ALL') {
                    if (currentOrderKpiFilter === 'return_request') {
                        if (item.issueType !== 'return_request') return false;
                    } else if (currentOrderKpiFilter === 'refunding') {
                        if (item.status !== 'refunding') return false;
                    } else if (currentOrderKpiFilter === 'overdue') {
                        if (item.slaStatus !== 'OVERDUE') return false;
                    } else if (item.status !== currentOrderKpiFilter) return false;
                }

                return true;
            });

            if (filtered.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="12" style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
                        Không tìm thấy khiếu nại đơn hàng phù hợp với điều kiện lọc.
                    </td>
                `;
                tbody.appendChild(tr);
                return;
            }

            filtered.forEach(item => {
                let statusBadge = '';
                if (item.status === 'new') statusBadge = '<span class="admin-badge badge-warning">Mới tiếp nhận</span>';
                else if (item.status === 'processing') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
                else if (item.status === 'waiting_return') statusBadge = '<span class="admin-badge badge-neutral">Chờ nhận hàng</span>';
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-success">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge badge-neutral">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge badge-danger">Cao</span>'
                    : '<span class="admin-badge badge-warning">Trung bình</span>';

                let rowClass = '';
                if (item.slaStatus === 'OVERDUE' || item.priority === 'high') {
                    rowClass = 'row-alert-high';
                } else if (item.slaStatus === 'URGENT' || item.priority === 'medium') {
                    rowClass = 'row-alert-warning';
                }

                const slaBadgeHtml = getSlaBadge(item);

                let staffCellHtml = '';
                if (item.staffAssigned === 'Chưa phân công' && item.status !== 'resolved' && item.status !== 'closed') {
                    staffCellHtml = `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #DC2626; font-size: 12px; font-weight: 500;">Chưa nhận</span>
                            <button type="button" class="btn-text-action btn-quick-assign" data-id="${item.id}" data-type="order">Nhận xử lý</button>
                        </div>
                    `;
                } else {
                    staffCellHtml = `<span>${escapeHtml(item.staffAssigned)}</span>`;
                }

                let issueName = item.issueType === 'wrong_item' ? 'Sai sản phẩm' : (item.issueType === 'damaged' ? 'Hư hỏng hàng' : (item.issueType === 'quality' ? 'Lỗi thiết bị' : (item.issueType === 'missing_item' ? 'Thiếu hàng' : 'Đổi và Trả')));

                const tr = document.createElement('tr');
                if (rowClass) tr.className = rowClass;
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.id)}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-open-ticket" data-id="${item.id}" data-type="order">${escapeHtml(item.customerName)}</a>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(item.phone)}</div>
                    </td>
                    <td><a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${item.orderId}">${escapeHtml(item.orderId)}</a></td>
                    <td>
                        <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.productName)}">
                            ${escapeHtml(item.productName)}
                        </div>
                    </td>
                    <td>${issueName}</td>
                    <td>${escapeHtml(item.customerDemand)}</td>
                    <td>${priorityBadge}</td>
                    <td>${slaBadgeHtml}</td>
                    <td>${staffCellHtml}</td>
                    <td>${escapeHtml(item.createdAt)}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-complaint-action" data-id="${item.id}" data-type="order">•••</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachComplaintTableEvents();
        }

        // ---------------------------------------------------------
        // 7. RENDER SUB-TAB 3: CHI TIẾT TICKET 360° VÀ ĐỐI CHỨNG CHÉO
        // ---------------------------------------------------------
        function getStaffSafetyLockStatus(staffName) {
            if (!staffName) return false;
            if (window.PawpalStaffManager && typeof window.PawpalStaffManager.getStaffByName === 'function') {
                const s = window.PawpalStaffManager.getStaffByName(staffName);
                if (s) return !!s.serviceLocked;
            }
            try {
                const clean = staffName.split('(')[0].trim().toLowerCase();
                const stored = localStorage.getItem('pawpal_staff_locked_name_' + clean);
                if (stored !== null) return stored === '1';
            } catch (e) {}
            return false;
        }

        function setStaffSafetyLockStatus(staffName, isLocked) {
            if (!staffName) return false;
            let lockVal = isLocked;
            if (window.PawpalStaffManager && typeof window.PawpalStaffManager.toggleSafetyLock === 'function') {
                const s = window.PawpalStaffManager.toggleSafetyLock(staffName, isLocked);
                if (s) lockVal = !!s.serviceLocked;
            }
            try {
                const clean = staffName.split('(')[0].trim().toLowerCase();
                localStorage.setItem('pawpal_staff_locked_name_' + clean, lockVal ? '1' : '0');
            } catch (e) {}
            return lockVal;
        }

        // Sinh ảnh minh họa SVG chất lượng cao cho các tệp mô phỏng
        function generateEvidenceThumbnail(fileName, category) {
            let bg = '#EEF5F1';
            let label = 'ẢNH ĐÍNH KÈM';
            let icon = '📸';
            const fLower = (fileName || '').toLowerCase();
            if (fLower.includes('tai') || fLower.includes('tray') || fLower.includes('pet') || fLower.includes('corgi') || fLower.includes('miu')) {
                bg = '#FDE8E8'; label = 'SỰ CỐ PET'; icon = '🐾';
            } else if (fLower.includes('mop') || fLower.includes('lon') || fLower.includes('pack') || fLower.includes('san-pham')) {
                bg = '#FEF3C7'; label = 'KIỂM HÀNG'; icon = '📦';
            } else if (fLower.includes('seal') || fLower.includes('hoa-don') || fLower.includes('lich-trinh')) {
                bg = '#E0F2FE'; label = 'NIÊM PHONG'; icon = '📄';
            }
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
                <rect width="300" height="300" fill="${bg}"/>
                <circle cx="150" cy="115" r="48" fill="rgba(255,255,255,0.7)"/>
                <text x="50%" y="130" font-size="44" text-anchor="middle">${icon}</text>
                <text x="50%" y="195" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14" font-weight="700" fill="#203A2C" text-anchor="middle">${label}</text>
                <text x="50%" y="222" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="12" fill="#4F7A65" text-anchor="middle">${escapeHtml(fileName.length > 22 ? fileName.slice(0, 20) + '...' : fileName)}</text>
                <text x="50%" y="250" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="10" font-weight="600" fill="#236B48" text-anchor="middle">PawPal Care Verified</text>
            </svg>`;
            return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        }

        // Mở và đóng Lightbox xem ảnh phóng to
        function openImageLightbox(src, title, meta) {
            const overlay = document.getElementById('imagePreviewModalOverlay');
            const img = document.getElementById('imagePreviewImg');
            const titleEl = document.getElementById('imagePreviewTitle');
            const metaEl = document.getElementById('imagePreviewMeta');
            if (img) img.src = src;
            if (titleEl) titleEl.textContent = title || 'Chi tiết hình ảnh bằng chứng';
            if (metaEl) metaEl.textContent = meta || 'Ảnh xác minh hệ thống';
            if (overlay) overlay.style.display = 'flex';
        }

        function closeImageLightbox() {
            const overlay = document.getElementById('imagePreviewModalOverlay');
            if (overlay) overlay.style.display = 'none';
        }

        // Render danh sách ảnh bằng chứng dạng Card tương tác
        function renderEvidenceList(containerEl, items, categoryName) {
            if (!containerEl) return;
            containerEl.innerHTML = '';
            if (!items || items.length === 0) {
                containerEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Chưa có hình ảnh nào.</span>';
                return;
            }

            items.forEach((item, index) => {
                let src = '';
                let name = '';
                let dateStr = 'Ảnh hồ sơ thẩm định';
                if (typeof item === 'string') {
                    name = item;
                    src = generateEvidenceThumbnail(item, categoryName);
                } else if (item && typeof item === 'object') {
                    name = item.name || `Ảnh bằng chứng ${index + 1}`;
                    src = item.dataUrl || generateEvidenceThumbnail(name, categoryName);
                    dateStr = item.uploadedAt || 'Tải lên từ máy';
                }

                const card = document.createElement('div');
                card.className = 'evidence-photo-card';
                card.title = `Bấm để phóng to xem chi tiết: ${name}`;
                card.innerHTML = `
                    <img src="${src}" class="evidence-thumb-img" alt="${escapeHtml(name)}">
                    <div class="evidence-info">
                        <div class="evidence-name">${escapeHtml(name)}</div>
                        <div class="evidence-sub">${escapeHtml(dateStr)} • Phóng to</div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    openImageLightbox(src, name, `${dateStr} • Xác thực hồ sơ Pawpal`);
                });
                containerEl.appendChild(card);
            });
        }

        function renderTicketDetail(ticket) {
            if (!ticket) return;
            currentActiveTicket = ticket;
            sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticket.id);

            // Headline
            const codeEl = document.getElementById('viewTicketCode');
            const catBadgeEl = document.getElementById('viewTicketCategoryBadge');
            const statusBadgeEl = document.getElementById('viewTicketStatusBadge');
            const priorityBadgeEl = document.getElementById('viewTicketPriorityBadge');

            if (codeEl) codeEl.textContent = ticket.id;
            if (catBadgeEl) catBadgeEl.textContent = ticket.serviceName ? 'Dịch vụ: ' + ticket.serviceName : 'Đơn hàng: ' + ticket.orderId;
            if (statusBadgeEl) {
                statusBadgeEl.textContent = ticket.status === 'processing' ? 'Đang xử lý' : (ticket.status === 'new' ? 'Mới tiếp nhận' : (ticket.status === 'waiting_customer' ? 'Chờ phản hồi khách hàng' : (ticket.status === 'waiting_return' ? 'Chờ nhận hàng trả' : 'Đã giải quyết')));
                statusBadgeEl.className = 'admin-badge ' + (ticket.status === 'processing' ? 'badge-info' : (ticket.status === 'new' ? 'badge-warning' : 'badge-active'));
            }
            if (priorityBadgeEl) {
                priorityBadgeEl.textContent = ticket.priority === 'high' ? 'Mức độ Cao' : 'Mức độ Trung bình';
            }

            // Cột trái: Phản ánh của khách
            const contentEl = document.getElementById('viewTicketCustomerContent');
            if (contentEl) contentEl.textContent = `"${ticket.content}"`;

            // Bằng chứng khách gửi (render dạng thumbnail có click phóng to)
            const customerEvidenceEl = document.getElementById('viewTicketCustomerEvidence');
            renderEvidenceList(customerEvidenceEl, ticket.evidence, 'customer');

            // Biên bản đối thoại từ Kênh Trực chat (nếu ticket bắt nguồn từ Chatbot)
            const chatTranscriptBlock = document.getElementById('viewTicketChatTranscriptBlock');
            const chatTranscriptEl = document.getElementById('viewTicketChatTranscript');
            if (chatTranscriptBlock && chatTranscriptEl) {
                if (ticket.chatTranscript) {
                    chatTranscriptBlock.style.display = 'block';
                    chatTranscriptEl.textContent = ticket.chatTranscript;
                } else {
                    chatTranscriptBlock.style.display = 'none';
                }
            }

            // Thông tin khách hàng và đối tượng
            const custNameEl = document.getElementById('viewTicketCustomerName');
            const custPhoneEl = document.getElementById('viewTicketCustomerPhone');
            const refTypeLabelEl = document.getElementById('viewTicketRefTypeLabel');
            const refInfoEl = document.getElementById('viewTicketRefInfo');
            const refIdLabelEl = document.getElementById('viewTicketIdLabel');
            const refIdEl = document.getElementById('viewTicketRefId');
            const petNotesEl = document.getElementById('viewTicketPetNotes');

            if (custNameEl) custNameEl.textContent = ticket.customerName;
            if (custPhoneEl) custPhoneEl.textContent = ticket.phone;

            if (ticket.bookingId) {
                if (refTypeLabelEl) refTypeLabelEl.textContent = 'Pet và Giống:';
                if (refInfoEl) refInfoEl.textContent = `${ticket.petName} (${ticket.petBreed})`;
                if (refIdLabelEl) refIdLabelEl.textContent = 'Mã lịch hẹn:';
                if (refIdEl) refIdEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${ticket.bookingId}">${ticket.bookingId}</a>`;
                if (petNotesEl) petNotesEl.textContent = ticket.petNotes || 'Không có ghi chú dị ứng';
            } else {
                if (refTypeLabelEl) refTypeLabelEl.textContent = 'Sản phẩm khiếu nại:';
                if (refInfoEl) refInfoEl.textContent = `${ticket.productName} (SKU: ${ticket.productSku})`;
                if (refIdLabelEl) refIdLabelEl.textContent = 'Mã đơn hàng:';
                if (refIdEl) refIdEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${ticket.orderId}">${ticket.orderId}</a>`;
                if (petNotesEl) petNotesEl.textContent = `Yêu cầu của khách: ${ticket.customerDemand}`;
            }

            // Dữ liệu đối chứng 360°
            const serviceBlock = document.getElementById('serviceCrossCheckBlock');
            const orderBlock = document.getElementById('orderCrossCheckBlock');

            if (ticket.bookingId) {
                if (serviceBlock) serviceBlock.style.display = 'block';
                if (orderBlock) orderBlock.style.display = 'none';

                const checkinHealthEl = document.getElementById('viewTicketCheckinHealth');
                if (checkinHealthEl) checkinHealthEl.textContent = ticket.checkinHealth || 'Bé khỏe mạnh, không phát hiện vết xước hay tổn thương ngoài da.';

                const checkinPhotosEl = document.getElementById('viewTicketCheckinPhotos');
                renderEvidenceList(checkinPhotosEl, ticket.checkinPhotos, 'checkin');

                const staffExecutedEl = document.getElementById('viewTicketStaffExecuted');
                if (staffExecutedEl) staffExecutedEl.textContent = ticket.staffExecuted || 'Chưa ghi nhận';

                const isLocked = getStaffSafetyLockStatus(ticket.staffExecuted);
                const lockBadgeEl = document.getElementById('viewStaffSafetyLockBadge');
                const lockBtnEl = document.getElementById('btnToggleStaffSafetyLock');
                if (lockBadgeEl) {
                    lockBadgeEl.innerHTML = isLocked
                        ? '<span class="admin-badge badge-danger">Đang khóa an toàn nhận việc</span>'
                        : '<span class="admin-badge badge-active">Hoạt động bình thường</span>';
                }
                if (lockBtnEl) {
                    lockBtnEl.textContent = isLocked ? 'Mở khóa nhận việc KTV' : 'Tạm khóa an toàn KTV';
                    lockBtnEl.style.color = isLocked ? '#166534' : '#DC2626';
                }

                const staffLogNoteEl = document.getElementById('viewTicketStaffLogNote');
                if (staffLogNoteEl) staffLogNoteEl.textContent = ticket.staffLogNote ? `"${ticket.staffLogNote}"` : '"Không có ghi chú thêm từ KTV."';
            } else {
                if (serviceBlock) serviceBlock.style.display = 'none';
                if (orderBlock) orderBlock.style.display = 'block';

                const orderPhotosEl = document.getElementById('viewTicketOrderWarehousePhotos');
                renderEvidenceList(orderPhotosEl, ticket.warehousePhotos, 'warehouse');

                const shippingCarrierEl = document.getElementById('viewTicketShippingCarrier');
                if (shippingCarrierEl) shippingCarrierEl.textContent = ticket.carrier || 'Giao Hàng Nhanh (GHN)';

                const shippingCodeEl = document.getElementById('viewTicketShippingCode');
                if (shippingCodeEl) shippingCodeEl.textContent = ticket.trackingCode || 'GHN88291039VN';

                const deliveryStatusEl = document.getElementById('viewTicketDeliveryStatus');
                if (deliveryStatusEl) deliveryStatusEl.textContent = ticket.deliveryStatus || 'Giao thành công';
            }

            // ---------------------------------------------------------
            // KHỐI 4: HIỂN THỊ PHƯƠNG ÁN BỒI HOÀN VÀ TIẾN ĐỘ RMA (PHASE 3)
            // ---------------------------------------------------------
            const resBlock = document.getElementById('ticketResolutionBlock');
            if (resBlock) {
                if (ticket.resolution) {
                    resBlock.style.display = 'block';

                    const resBadgeEl = document.getElementById('viewResolutionBadge');
                    if (resBadgeEl) resBadgeEl.textContent = ticket.resolution.typeName || 'Đã áp dụng phương án';

                    const resTimeEl = document.getElementById('viewResolutionTime');
                    if (resTimeEl) resTimeEl.textContent = 'Cập nhật: ' + (ticket.resolution.updatedAt || 'Vừa xong');

                    const resNoteEl = document.getElementById('viewResolutionNote');
                    if (resNoteEl) resNoteEl.textContent = `"${ticket.resolution.note || 'Đã thỏa thuận phương án giải quyết thỏa đáng với khách hàng.'}"`;

                    const rmaDetails = document.getElementById('resolutionRmaDetails');
                    const rewardDetails = document.getElementById('resolutionRewardDetails');
                    const redoDetails = document.getElementById('resolutionRedoServiceDetails');
                    const refundDetails = document.getElementById('resolutionRefundDetails');

                    // Reset tất cả các chi tiết con
                    if (rmaDetails) rmaDetails.style.display = 'none';
                    if (rewardDetails) rewardDetails.style.display = 'none';
                    if (redoDetails) redoDetails.style.display = 'none';
                    if (refundDetails) refundDetails.style.display = 'none';

                    if (ticket.resolution.type === 'rma_exchange' || ticket.resolution.type === 'rma_refund') {
                        if (rmaDetails) {
                            rmaDetails.style.display = 'block';
                            const rmaCodeEl = document.getElementById('viewRmaCode');
                            const pickupEl = document.getElementById('viewRmaPickupMethod');
                            const whEl = document.getElementById('viewRmaWarehouse');
                            const replGroup = document.getElementById('viewRmaReplacementGroup');
                            const replEl = document.getElementById('viewRmaReplacementItem');

                            if (rmaCodeEl) rmaCodeEl.textContent = ticket.resolution.rmaCode || 'RMA-2026-CHƯA_CẤP';
                            if (pickupEl) pickupEl.textContent = ticket.resolution.pickupMethod || 'Bưu tá tới lấy hàng';
                            if (whEl) whEl.textContent = ticket.resolution.warehouse || 'Kho Pawpal Tân Bình';

                            if (ticket.resolution.type === 'rma_exchange') {
                                if (replGroup) replGroup.style.display = 'block';
                                if (replEl) replEl.textContent = ticket.resolution.replacementItem || 'Sản phẩm đổi mới';
                            } else {
                                if (replGroup) replGroup.style.display = 'none';
                            }

                            // Cập nhật Stepper 4 bước (không dùng icon, tuân thủ AGENTS.md)
                            const currentStep = ticket.resolution.rmaStep || 2;
                            const stepperContainer = document.getElementById('viewRmaStepper');
                            if (stepperContainer) {
                                const steps = [
                                    '1. Cấp mã RMA',
                                    '2. Chờ nhận hàng hoàn',
                                    '3. Kiểm định tại kho',
                                    ticket.resolution.type === 'rma_exchange' ? '4. Xuất hàng đổi mới' : '4. Hoàn tiền thành công'
                                ];
                                stepperContainer.innerHTML = steps.map((s, idx) => {
                                    const stepNum = idx + 1;
                                    const isActive = stepNum <= currentStep;
                                    const arrow = idx < 3 ? '<span class="rma-step-arrow">→</span>' : '';
                                    return `<span class="rma-step-item ${isActive ? 'active' : ''}">${escapeHtml(s)}</span>${arrow}`;
                                }).join('');
                            }

                            // Cập nhật nút bấm tiến độ RMA
                            const btnAdvance = document.getElementById('btnAdvanceRmaStep');
                            if (btnAdvance) {
                                if (currentStep === 1) {
                                    btnAdvance.textContent = 'Cập nhật: Bắt đầu gửi hàng hoàn';
                                    btnAdvance.style.display = 'inline-block';
                                } else if (currentStep === 2) {
                                    btnAdvance.textContent = 'Cập nhật: Đã nhận hàng tại kho và Kiểm định';
                                    btnAdvance.style.display = 'inline-block';
                                } else if (currentStep === 3) {
                                    btnAdvance.textContent = ticket.resolution.type === 'rma_exchange' ? 'Cập nhật: Đã giao hàng đổi mới (Hoàn tất)' : 'Cập nhật: Đã hoàn tiền (Hoàn tất)';
                                    btnAdvance.style.display = 'inline-block';
                                } else {
                                    btnAdvance.textContent = 'Quy trình RMA đã hoàn tất thành công';
                                    btnAdvance.style.color = '#166534';
                                }
                            }
                        }
                    } else if (ticket.resolution.type === 'reward_voucher') {
                        if (rewardDetails) {
                            rewardDetails.style.display = 'block';
                            const ptsEl = document.getElementById('viewRewardPoints');
                            const vchEl = document.getElementById('viewRewardVoucher');
                            if (ptsEl) ptsEl.textContent = `+${ticket.resolution.pawpoints || 0} Pawpoint (Tương đương ${((ticket.resolution.pawpoints || 0) * 100).toLocaleString('vi-VN')}đ)`;
                            if (vchEl) vchEl.textContent = ticket.resolution.voucherCode || 'PAWPALCARE50';
                        }
                    } else if (ticket.resolution.type === 'redo_service') {
                        if (redoDetails) {
                            redoDetails.style.display = 'block';
                            const redoIdEl = document.getElementById('viewRedoBookingId');
                            const redoStaffEl = document.getElementById('viewRedoStaff');
                            const redoTimeEl = document.getElementById('viewRedoTime');

                            if (redoIdEl) redoIdEl.textContent = ticket.resolution.redoBookingId || 'BKG-REDO-01';
                            if (redoStaffEl) redoStaffEl.textContent = ticket.resolution.redoStaff || 'KTV chỉ định';
                            if (redoTimeEl) redoTimeEl.textContent = (ticket.resolution.redoTime || 'Thời gian đã hẹn') + ' (Miễn phí 100%)';
                        }
                    } else if (ticket.resolution.type === 'refund') {
                        if (refundDetails) {
                            refundDetails.style.display = 'block';
                            const refAmountEl = document.getElementById('viewRefundAmount');
                            const refMethodEl = document.getElementById('viewRefundMethod');
                            if (refAmountEl) refAmountEl.textContent = `${Number(ticket.resolution.refundAmount || 0).toLocaleString('vi-VN')} VNĐ`;
                            if (refMethodEl) refMethodEl.textContent = ticket.resolution.refundMethod || 'Chuyển khoản trực tiếp';
                        }
                    }
                } else {
                    resBlock.style.display = 'none';
                }
            }

            // Timeline
            const timelineContainer = document.getElementById('viewTicketTimeline');
            if (timelineContainer && ticket.timeline) {
                timelineContainer.innerHTML = '';
                ticket.timeline.forEach(t => {
                    const badge = t.isInternal
                        ? '<span class="timeline-entry-badge-internal">Ghi chú nội bộ</span>'
                        : '<span class="timeline-entry-badge-customer">Khách hàng</span>';

                    const entry = document.createElement('div');
                    entry.className = 'timeline-entry';
                    entry.innerHTML = `
                        <div class="timeline-entry-meta">
                            <span><strong>${escapeHtml(t.author)}</strong> ${badge}</span>
                            <span>${escapeHtml(t.time)}</span>
                        </div>
                        <div class="timeline-entry-title">${escapeHtml(t.title)}</div>
                        <div class="timeline-entry-desc">${escapeHtml(t.desc)}</div>
                    `;
                    timelineContainer.appendChild(entry);
                });
            }

            // Nút liên kết xem lịch hẹn / đơn hàng gốc
            document.getElementById('btnJumpToOriginal')?.addEventListener('click', () => {
                if (ticket.bookingId) {
                    sessionStorage.setItem('pawpal_admin_service_selected_id', ticket.bookingId);
                    window.location.hash = '#tab-service-bookings';
                } else if (ticket.orderId) {
                    sessionStorage.setItem('pawpal_admin_order_selected_id', ticket.orderId);
                    window.location.hash = '#tab-order-list';
                }
            });
        }

        // ---------------------------------------------------------
        // 8. XỬ LÝ 1-CHẠM NHẬN TICKET (QUICK ASSIGN)
        // ---------------------------------------------------------
        function handleQuickAssign(ticketId, ticketType) {
            let targetTicket = null;
            if (ticketType === 'service') {
                targetTicket = mockServiceComplaints.find(i => i.id === ticketId);
            } else {
                targetTicket = mockOrderComplaints.find(i => i.id === ticketId);
            }

            if (!targetTicket) return;

            targetTicket.staffAssigned = 'Lê Lệ Quyên';
            if (targetTicket.status === 'new') {
                targetTicket.status = 'processing';
            }

            targetTicket.timeline.unshift({
                time: 'Vừa xong',
                author: 'Lê Lệ Quyên (CSKH)',
                title: 'Tiếp nhận xử lý Ticket',
                desc: 'Đã nhận phụ trách trực tiếp xử lý khiếu nại này theo cam kết SLA.',
                isInternal: true
            });

            updateComplaintsKpis();
            renderComplaintsAlertBar();
            if (ticketType === 'service') renderServiceComplaintsTable();
            else renderOrderComplaintsTable();

            saveComplaintsState();
            syncTicketToUserPortal(targetTicket);

            if (currentActiveTicket && currentActiveTicket.id === ticketId) {
                renderTicketDetail(targetTicket);
            }

            showToast(`Đã nhận xử lý Ticket ${ticketId} thành công! Người phụ trách: Lê Lệ Quyên (CSKH).`, 'success');
        }

        // ---------------------------------------------------------
        // 9. SỰ KIỆN BẢNG VÀ DROPDOWN MENU
        // ---------------------------------------------------------
        function attachComplaintTableEvents() {
            // Click tên khách để mở Ticket
            document.querySelectorAll('.btn-open-ticket').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const id = link.getAttribute('data-id');
                    const type = link.getAttribute('data-type');
                    let targetTicket = null;
                    if (type === 'service') {
                        targetTicket = mockServiceComplaints.find(i => i.id === id);
                        currentTicketType = 'service';
                    } else {
                        targetTicket = mockOrderComplaints.find(i => i.id === id);
                        currentTicketType = 'order';
                    }
                    if (targetTicket) {
                        currentActiveTicket = targetTicket;
                        switchSubtab('tab-complaint-detail');
                    }
                });
            });

            // Nút 1-chạm Nhận xử lý trong bảng
            document.querySelectorAll('.btn-quick-assign').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const type = btn.getAttribute('data-type');
                    handleQuickAssign(id, type);
                });
            });

            // Menu 3 chấm
            const triggers = document.querySelectorAll('.btn-complaint-action');
            const dropdown = document.getElementById('complaintsActionDropdown');
            if (!dropdown) return;

            triggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.style.display = 'none');

                    const rect = trigger.getBoundingClientRect();
                    dropdown.style.display = 'flex';
                    dropdown.style.top = (rect.bottom + 4) + 'px';
                    dropdown.style.left = (rect.right - 190) + 'px';
                    dropdown.setAttribute('data-current-id', trigger.getAttribute('data-id'));
                    dropdown.setAttribute('data-current-type', trigger.getAttribute('data-type'));
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.action-dropdown-menu') && !e.target.closest('.btn-complaint-action')) {
                    dropdown.style.display = 'none';
                }
            });
        }

        // Dropdown actions
        document.getElementById('menuActionViewTicket')?.addEventListener('click', () => {
            const dropdown = document.getElementById('complaintsActionDropdown');
            const id = dropdown.getAttribute('data-current-id');
            const type = dropdown.getAttribute('data-current-type');
            dropdown.style.display = 'none';

            let t = type === 'service' ? mockServiceComplaints.find(i => i.id === id) : mockOrderComplaints.find(i => i.id === id);
            if (t) {
                currentActiveTicket = t;
                switchSubtab('tab-complaint-detail');
            }
        });

        document.getElementById('menuActionQuickAssign')?.addEventListener('click', () => {
            const dropdown = document.getElementById('complaintsActionDropdown');
            const id = dropdown.getAttribute('data-current-id');
            const type = dropdown.getAttribute('data-current-type');
            dropdown.style.display = 'none';
            handleQuickAssign(id, type);
        });

        document.getElementById('menuActionCloseTicket')?.addEventListener('click', () => {
            const dropdown = document.getElementById('complaintsActionDropdown');
            const id = dropdown.getAttribute('data-current-id');
            const type = dropdown.getAttribute('data-current-type');
            dropdown.style.display = 'none';

            let t = type === 'service' ? mockServiceComplaints.find(i => i.id === id) : mockOrderComplaints.find(i => i.id === id);
            if (t) {
                t.status = 'closed';
                t.slaStatus = 'DONE';
                t.slaRemainingText = 'Đã đóng';
                t.timeline.unshift({
                    time: 'Vừa xong',
                    author: 'Lê Lệ Quyên (Admin)',
                    title: 'Đóng Ticket',
                    desc: 'Đã hoàn tất quy trình xử lý và chính thức đóng ticket.',
                    isInternal: true
                });
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (type === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();
                saveComplaintsState();
                syncTicketToUserPortal(t);
                showToast(`Ticket ${id} đã được đóng hoàn tất.`, 'success');
            }
        });

        // ---------------------------------------------------------
        // SỰ KIỆN UPLOAD ẢNH VÀ XEM ẢNH PHÓNG TO (LIGHTBOX)
        // ---------------------------------------------------------
        document.getElementById('btnCloseImagePreview')?.addEventListener('click', closeImageLightbox);
        document.getElementById('btnDismissImagePreview')?.addEventListener('click', closeImageLightbox);
        document.getElementById('imagePreviewModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'imagePreviewModalOverlay') closeImageLightbox();
        });

        // 1. Upload bổ sung ảnh phản ánh của khách trong Chi tiết Ticket
        const btnUploadMoreEvidence = document.getElementById('btnTriggerUploadMoreEvidence');
        const inputUploadMoreEvidence = document.getElementById('inputUploadMoreEvidence');
        btnUploadMoreEvidence?.addEventListener('click', () => {
            inputUploadMoreEvidence?.click();
        });

        inputUploadMoreEvidence?.addEventListener('change', (e) => {
            if (!currentActiveTicket || !e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            let processed = 0;

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!currentActiveTicket.evidence) currentActiveTicket.evidence = [];
                    currentActiveTicket.evidence.push({
                        name: file.name,
                        dataUrl: event.target.result,
                        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    processed++;
                    if (processed === files.length) {
                        currentActiveTicket.timeline.unshift({
                            time: 'Vừa xong',
                            author: 'Lê Lệ Quyên (Admin)',
                            title: 'Bổ sung ảnh bằng chứng từ máy',
                            desc: `Đã tải lên ${files.length} ảnh mới: ${files.map(f => f.name).join(', ')}.`,
                            isInternal: true
                        });
                        renderTicketDetail(currentActiveTicket);
                        showToast(`Đã tải lên thành công ${files.length} ảnh bằng chứng!`, 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
            inputUploadMoreEvidence.value = '';
        });

        // 2. Upload bổ sung ảnh check-in đón bé (Dịch vụ)
        const btnUploadCheckin = document.getElementById('btnTriggerUploadCheckinPhoto');
        const inputUploadCheckin = document.getElementById('inputUploadCheckinPhoto');
        btnUploadCheckin?.addEventListener('click', () => inputUploadCheckin?.click());
        inputUploadCheckin?.addEventListener('change', (e) => {
            if (!currentActiveTicket || !e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            let processed = 0;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!currentActiveTicket.checkinPhotos) currentActiveTicket.checkinPhotos = [];
                    currentActiveTicket.checkinPhotos.push({
                        name: file.name,
                        dataUrl: event.target.result,
                        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    processed++;
                    if (processed === files.length) {
                        renderTicketDetail(currentActiveTicket);
                        showToast(`Đã bổ sung ${files.length} ảnh đón bé vào hồ sơ dịch vụ!`, 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
            inputUploadCheckin.value = '';
        });

        // 3. Upload bổ sung ảnh kiểm kho (Đơn hàng)
        const btnUploadWarehouse = document.getElementById('btnTriggerUploadWarehousePhoto');
        const inputUploadWarehouse = document.getElementById('inputUploadWarehousePhoto');
        btnUploadWarehouse?.addEventListener('click', () => inputUploadWarehouse?.click());
        inputUploadWarehouse?.addEventListener('change', (e) => {
            if (!currentActiveTicket || !e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            let processed = 0;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!currentActiveTicket.warehousePhotos) currentActiveTicket.warehousePhotos = [];
                    currentActiveTicket.warehousePhotos.push({
                        name: file.name,
                        dataUrl: event.target.result,
                        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    processed++;
                    if (processed === files.length) {
                        renderTicketDetail(currentActiveTicket);
                        showToast(`Đã bổ sung ${files.length} ảnh kiểm tra kho hàng vào hồ sơ!`, 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
            inputUploadWarehouse.value = '';
        });

        // 4. Quản lý Upload ảnh trong Modal Tạo Ticket
        let createTicketUploadedFiles = [];
        const btnTriggerUploadModal = document.getElementById('btnTriggerUploadTicketFiles');
        const inputTicketFiles = document.getElementById('inputTicketFiles');
        const createPreviewsContainer = document.getElementById('createTicketPreviewsContainer');

        function renderCreateTicketPreviews() {
            if (!createPreviewsContainer) return;
            createPreviewsContainer.innerHTML = '';
            createTicketUploadedFiles.forEach((fileObj, idx) => {
                const item = document.createElement('div');
                item.className = 'uploaded-preview-item';
                item.innerHTML = `
                    <img src="${fileObj.dataUrl}" class="uploaded-preview-thumb" alt="${escapeHtml(fileObj.name)}">
                    <span style="font-size: 11.5px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(fileObj.name)}</span>
                    <button type="button" class="uploaded-preview-remove" data-idx="${idx}" title="Xóa ảnh này">✕</button>
                `;
                item.querySelector('.uploaded-preview-remove').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    createTicketUploadedFiles.splice(idx, 1);
                    renderCreateTicketPreviews();
                });
                createPreviewsContainer.appendChild(item);
            });
        }

        btnTriggerUploadModal?.addEventListener('click', () => inputTicketFiles?.click());
        inputTicketFiles?.addEventListener('change', (e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    createTicketUploadedFiles.push({
                        name: file.name,
                        dataUrl: ev.target.result,
                        uploadedAt: 'Đính kèm lúc tạo vé'
                    });
                    renderCreateTicketPreviews();
                };
                reader.readAsDataURL(file);
            });
            inputTicketFiles.value = '';
        });

        // Modal Tạo Ticket
        const createModal = document.getElementById('createTicketModalOverlay');
        document.getElementById('btnOpenCreateServiceTicket')?.addEventListener('click', () => {
            document.getElementById('createTicketModalTitle').textContent = 'Tiếp nhận khiếu nại dịch vụ';
            document.getElementById('labelTicketRefId').textContent = 'Chọn lịch hẹn liên quan *';
            const sel = document.getElementById('selectTicketRefId');
            sel.innerHTML = `
                <option value="BKG-1001">BKG-1001 (Miu Con - Tắm Vệ Sinh Cơ Bản)</option>
                <option value="BKG-1008">BKG-1008 (Bông Xù - Tắm Thuốc Da Liễu)</option>
                <option value="BKG-1004">BKG-1004 (Lu Lu - Pet Hotel Tiêu Chuẩn)</option>
            `;
            createTicketUploadedFiles = [];
            renderCreateTicketPreviews();
            createModal.classList.add('active');
        });

        document.getElementById('btnOpenCreateOrderTicket')?.addEventListener('click', () => {
            document.getElementById('createTicketModalTitle').textContent = 'Tiếp nhận khiếu nại đơn hàng';
            document.getElementById('labelTicketRefId').textContent = 'Chọn đơn hàng liên quan *';
            const sel = document.getElementById('selectTicketRefId');
            sel.innerHTML = `
                <option value="ORD-2026-001">ORD-2026-001 (Đồ chơi gặm xương)</option>
                <option value="ORD-2026-005">ORD-2026-005 (Pate mèo nắp bật)</option>
            `;
            createTicketUploadedFiles = [];
            renderCreateTicketPreviews();
            createModal.classList.add('active');
        });

        document.getElementById('btnCancelCreateTicket')?.addEventListener('click', () => createModal.classList.remove('active'));
        document.getElementById('btnDismissCreateTicket')?.addEventListener('click', () => createModal.classList.remove('active'));
        
        document.getElementById('btnSaveCreateTicket')?.addEventListener('click', () => {
            const phone = document.getElementById('inputTicketCustomerPhone')?.value.trim() || '0901234567';
            const name = document.getElementById('inputTicketCustomerName')?.value.trim() || 'Khách hàng tiếp nhận tại quầy';
            const title = document.getElementById('inputTicketTitle')?.value.trim() || 'Khiếu nại tiếp nhận tại quầy';
            const content = document.getElementById('inputTicketContent')?.value.trim() || title;
            const refId = document.getElementById('selectTicketRefId')?.value || 'BKG-1001';
            const priority = document.getElementById('selectTicketPriority')?.value || 'medium';
            const isService = refId.startsWith('BKG');
            const newId = isService ? ('TK-' + Math.floor(1000 + Math.random() * 9000)) : ('TK-ORD-' + Math.floor(100 + Math.random() * 900));

            const newTicket = {
                id: newId,
                customerName: name,
                phone: phone,
                petName: isService ? 'Bé cưng' : '',
                petBreed: isService ? 'Thú cưng' : '',
                petNotes: 'Ghi nhận lúc lập ticket tại quầy',
                bookingId: isService ? refId : '',
                orderId: !isService ? refId : '',
                serviceName: isService ? 'Dịch vụ Spa & Hotel' : '',
                productName: !isService ? 'Sản phẩm mua sắm' : '',
                title: title,
                content: content,
                priority: priority,
                slaStatus: priority === 'high' ? 'URGENT' : 'NORMAL',
                slaRemainingText: 'Còn 24 giờ',
                staffAssigned: 'Lê Lệ Quyên',
                createdAt: new Date().toLocaleDateString('vi-VN') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'new',
                evidence: [...createTicketUploadedFiles],
                checkinPhotos: [],
                warehousePhotos: [],
                timeline: [
                    {
                        time: 'Vừa xong',
                        author: 'Lê Lệ Quyên (Lễ tân)',
                        title: 'Tiếp nhận khiếu nại tại quầy',
                        desc: `Đã lập ticket và tải lên ${createTicketUploadedFiles.length} ảnh bằng chứng ban đầu.`,
                        isInternal: false
                    }
                ]
            };

            if (isService) {
                mockServiceComplaints.unshift(newTicket);
                renderServiceComplaintsTable();
            } else {
                mockOrderComplaints.unshift(newTicket);
                renderOrderComplaintsTable();
            }

            updateComplaintsKpis();
            renderComplaintsAlertBar();
            createModal.classList.remove('active');
            showToast(`Tạo Ticket ${newId} thành công với ${createTicketUploadedFiles.length} ảnh bằng chứng đính kèm!`, 'success');
        });

        // Modal Phương án giải quyết (Phase 3: RMA, Redo, Reward và Refund)
        const resolveModal = document.getElementById('resolveTicketModalOverlay');
        const selectResolveOpt = document.getElementById('selectResolveOption');

        function updateResolveModalSubgroups() {
            if (!selectResolveOpt) return;
            const val = selectResolveOpt.value;

            const rmaGroup = document.getElementById('groupResolveRma');
            const redoGroup = document.getElementById('groupResolveRedo');
            const rewardGroup = document.getElementById('groupResolveReward');
            const refundGroup = document.getElementById('groupResolveRefund');

            if (rmaGroup) rmaGroup.style.display = 'none';
            if (redoGroup) redoGroup.style.display = 'none';
            if (rewardGroup) rewardGroup.style.display = 'none';
            if (refundGroup) refundGroup.style.display = 'none';

            if (val === 'rma_exchange' || val === 'rma_refund') {
                if (rmaGroup) {
                    rmaGroup.style.display = 'block';
                    const rmaCodeInput = document.getElementById('inputResolveRmaCode');
                    if (rmaCodeInput && !rmaCodeInput.value) {
                        rmaCodeInput.value = 'RMA-2026-' + Math.floor(100 + Math.random() * 900);
                    }
                    const exField = document.getElementById('resolveRmaExchangeField');
                    const refField = document.getElementById('resolveRmaRefundField');
                    if (val === 'rma_exchange') {
                        if (exField) exField.style.display = 'block';
                        if (refField) refField.style.display = 'none';
                        const replInput = document.getElementById('inputResolveRmaReplacement');
                        if (replInput && !replInput.value && currentActiveTicket) {
                            replInput.value = currentActiveTicket.productName ? `${currentActiveTicket.productName} (Đổi mới / đổi size)` : '';
                        }
                    } else {
                        if (exField) exField.style.display = 'none';
                        if (refField) refField.style.display = 'block';
                        const refAmtInput = document.getElementById('inputResolveRmaRefundAmount');
                        if (refAmtInput && !refAmtInput.value) {
                            refAmtInput.value = '350000';
                        }
                    }
                }
            } else if (val === 'redo_service') {
                if (redoGroup) {
                    redoGroup.style.display = 'block';
                    const timeInput = document.getElementById('inputResolveRedoTime');
                    if (timeInput && !timeInput.value) {
                        timeInput.value = '09:30 - Ngày mai';
                    }
                }
            } else if (val === 'reward_voucher') {
                if (rewardGroup) {
                    rewardGroup.style.display = 'block';
                    const ptsInput = document.getElementById('inputResolveRewardPoints');
                    const vchInput = document.getElementById('inputResolveRewardVoucher');
                    if (ptsInput && !ptsInput.value) ptsInput.value = '200';
                    if (vchInput && !vchInput.value) vchInput.value = 'PAWPALCARE50';
                }
            } else if (val === 'refund') {
                if (refundGroup) {
                    refundGroup.style.display = 'block';
                    const refAmtInput = document.getElementById('inputResolveRefundAmount');
                    if (refAmtInput && !refAmtInput.value) refAmtInput.value = '250000';
                }
            }
        }

        function openResolveModal() {
            if (!currentActiveTicket) return;
            if (selectResolveOpt) {
                if (currentActiveTicket.bookingId) {
                    selectResolveOpt.value = 'redo_service';
                } else {
                    selectResolveOpt.value = 'rma_exchange';
                }
                const rmaCodeInput = document.getElementById('inputResolveRmaCode');
                if (rmaCodeInput) rmaCodeInput.value = 'RMA-2026-' + Math.floor(100 + Math.random() * 900);
                updateResolveModalSubgroups();
            }
            const noteInput = document.getElementById('inputResolveNote');
            if (noteInput) noteInput.value = '';
            resolveModal.classList.add('active');
        }

        document.getElementById('btnOpenResolveModal')?.addEventListener('click', openResolveModal);
        document.getElementById('menuActionQuickResolve')?.addEventListener('click', () => {
            document.getElementById('complaintsActionDropdown').style.display = 'none';
            openResolveModal();
        });

        document.getElementById('btnCancelResolveModal')?.addEventListener('click', () => resolveModal.classList.remove('active'));
        document.getElementById('btnDismissResolveModal')?.addEventListener('click', () => resolveModal.classList.remove('active'));

        selectResolveOpt?.addEventListener('change', updateResolveModalSubgroups);

        document.getElementById('btnConfirmResolveTicket')?.addEventListener('click', () => {
            if (!currentActiveTicket) return;
            const val = selectResolveOpt ? selectResolveOpt.value : 'explain';
            const note = document.getElementById('inputResolveNote')?.value.trim() || 'Đã thỏa thuận thống nhất phương án xử lý thỏa đáng với khách hàng.';

            let resolutionObj = null;
            let newStatus = 'resolved';
            let timelineTitle = 'Áp dụng phương án giải quyết';
            let timelineDesc = note;

            if (val === 'rma_exchange' || val === 'rma_refund') {
                const rmaCode = document.getElementById('inputResolveRmaCode')?.value || ('RMA-2026-' + Math.floor(100 + Math.random() * 900));
                const pickup = document.getElementById('selectResolveRmaPickup')?.value || 'Bưu tá tới tận nơi lấy hàng';
                const wh = document.getElementById('selectResolveRmaWarehouse')?.value || 'Kho Pawpal Tân Bình';
                const replItem = document.getElementById('inputResolveRmaReplacement')?.value.trim() || (currentActiveTicket.productName || 'Sản phẩm đổi bù mới');
                const refAmt = document.getElementById('inputResolveRmaRefundAmount')?.value.trim() || '350000';

                resolutionObj = {
                    type: val,
                    typeName: val === 'rma_exchange' ? `Đổi sản phẩm mới (Mã RMA: ${rmaCode})` : `Trả hàng hoàn tiền (Mã RMA: ${rmaCode})`,
                    rmaCode: rmaCode,
                    rmaStep: 2,
                    pickupMethod: pickup,
                    warehouse: wh,
                    replacementItem: replItem,
                    refundAmount: refAmt,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'waiting_return';
                timelineTitle = `Phát hành mã đổi trả ${rmaCode}`;
                timelineDesc = `Đã cấp mã RMA đổi trả (${val === 'rma_exchange' ? 'Đổi mới: ' + replItem : 'Hoàn tiền: ' + Number(refAmt).toLocaleString('vi-VN') + 'đ'}). Hình thức thu hồi: ${pickup}. Kho nhận: ${wh}. Ghi chú: "${note}".`;
            } else if (val === 'redo_service') {
                const redoTime = document.getElementById('inputResolveRedoTime')?.value.trim() || '09:30 - Ngày mai';
                const redoStaff = document.getElementById('selectResolveRedoStaff')?.value || 'Trần Văn Hùng (Groomer trưởng)';
                const redoId = 'BKG-REDO-' + Date.now().toString().slice(-4);

                resolutionObj = {
                    type: 'redo_service',
                    typeName: 'Thực hiện lại dịch vụ miễn phí',
                    redoBookingId: redoId,
                    redoStaff: redoStaff,
                    redoTime: redoTime,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'processing';
                timelineTitle = `Tạo lịch hẹn dịch vụ bù (${redoId})`;
                timelineDesc = `Đã tạo lịch hẹn chăm sóc bù miễn phí 100% vào lúc ${redoTime}. KTV tiếp nhận: ${redoStaff}. Ghi chú: "${note}".`;
            } else if (val === 'reward_voucher') {
                const pts = parseInt(document.getElementById('inputResolveRewardPoints')?.value) || 200;
                const vch = document.getElementById('inputResolveRewardVoucher')?.value.trim() || 'PAWPALCARE50';

                resolutionObj = {
                    type: 'reward_voucher',
                    typeName: 'Tặng Voucher và Pawpoint bồi hoàn',
                    pawpoints: pts,
                    voucherCode: vch,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'resolved';
                timelineTitle = `Bồi hoàn +${pts} Pawpoint và tặng Voucher ${vch}`;
                timelineDesc = `Đã cộng trực tiếp ${pts} Pawpoint vào tài khoản khách hàng và phát hành mã voucher ${vch}. Ghi chú: "${note}".`;

                try {
                    const key = 'pawpoint_reward_' + currentActiveTicket.phone;
                    const curr = parseInt(sessionStorage.getItem(key) || '0');
                    sessionStorage.setItem(key, (curr + pts).toString());
                } catch (e) {}
            } else if (val === 'refund') {
                const refAmt = document.getElementById('inputResolveRefundAmount')?.value.trim() || '250000';
                const refMethod = document.getElementById('selectResolveRefundMethod')?.value || 'Chuyển khoản trực tiếp';

                resolutionObj = {
                    type: 'refund',
                    typeName: 'Hoàn tiền bồi thường khiếu nại',
                    refundAmount: refAmt,
                    refundMethod: refMethod,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'resolved';
                timelineTitle = `Hoàn tiền bồi thường ${Number(refAmt).toLocaleString('vi-VN')}đ`;
                timelineDesc = `Hình thức: ${refMethod}. Ghi chú: "${note}".`;
            } else if (val === 'reject') {
                resolutionObj = {
                    type: 'reject',
                    typeName: 'Từ chối khiếu nại',
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'closed';
                timelineTitle = 'Từ chối giải quyết khiếu nại';
                timelineDesc = `Lý do từ chối: "${note}".`;
            } else {
                resolutionObj = {
                    type: 'explain',
                    typeName: 'Giải thích và phản hồi khách hàng',
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'resolved';
                timelineTitle = 'Giải thích và chăm sóc khách hàng';
                timelineDesc = note;
            }

            currentActiveTicket.resolution = resolutionObj;
            currentActiveTicket.status = newStatus;
            if (newStatus === 'resolved' || newStatus === 'closed') {
                currentActiveTicket.slaStatus = 'DONE';
                currentActiveTicket.slaRemainingText = newStatus === 'resolved' ? 'Đã giải quyết' : 'Đã đóng';
            }

            currentActiveTicket.timeline.unshift({
                time: 'Vừa xong',
                author: 'Lê Lệ Quyên (Admin)',
                title: timelineTitle,
                desc: timelineDesc,
                isInternal: false
            });

            resolveModal.classList.remove('active');
            updateComplaintsKpis();
            renderComplaintsAlertBar();
            if (currentTicketType === 'service') renderServiceComplaintsTable();
            else renderOrderComplaintsTable();
            renderTicketDetail(currentActiveTicket);
            saveComplaintsState();
            syncTicketToUserPortal(currentActiveTicket);

            // Ghi nhận cờ giải quyết cho Chatbot CSKH nắm bắt vòng lặp đóng
            try {
                sessionStorage.setItem('pawpal_ticket_resolved_' + currentActiveTicket.id, JSON.stringify({
                    id: currentActiveTicket.id,
                    status: newStatus,
                    typeName: resolutionObj.typeName,
                    note: resolutionObj.note,
                    customerName: currentActiveTicket.customerName,
                    resolvedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
            } catch (e) {}

            showToast(`Đã áp dụng phương án "${resolutionObj.typeName}" cho Ticket ${currentActiveTicket.id} thành công!`, 'success');
        });

        // Nút cập nhật tiến độ RMA (Phase 3)
        document.getElementById('btnAdvanceRmaStep')?.addEventListener('click', () => {
            if (!currentActiveTicket || !currentActiveTicket.resolution) return;
            const res = currentActiveTicket.resolution;
            let currentStep = res.rmaStep || 2;

            if (currentStep < 4) {
                currentStep++;
                res.rmaStep = currentStep;
                res.updatedAt = 'Vừa xong';

                let stepTitle = '';
                let stepDesc = '';

                if (currentStep === 3) {
                    stepTitle = `RMA ${res.rmaCode}: Đã nhận hàng tại kho và Kiểm định`;
                    stepDesc = `Kho Pawpal đã tiếp nhận kiện hàng hoàn trả từ khách hàng. Bộ phận kiểm định xác nhận sản phẩm đạt tiêu chuẩn đổi trả theo quy định.`;
                } else if (currentStep === 4) {
                    stepTitle = `RMA ${res.rmaCode}: Hoàn tất lệnh đổi trả`;
                    stepDesc = res.type === 'rma_exchange'
                        ? `Đã xuất kho và bàn giao bưu tá sản phẩm đổi mới "${res.replacementItem || 'sản phẩm'}" gửi tới khách hàng. Ticket chuyển sang Đã giải quyết.`
                        : `Đã thực hiện lệnh hoàn tiền ${Number(res.refundAmount || 0).toLocaleString('vi-VN')}đ tới tài khoản khách hàng. Ticket chuyển sang Đã giải quyết.`;
                    currentActiveTicket.status = 'resolved';
                    currentActiveTicket.slaStatus = 'DONE';
                    currentActiveTicket.slaRemainingText = 'Đã giải quyết';
                }

                currentActiveTicket.timeline.unshift({
                    time: 'Vừa xong',
                    author: 'Lê Lệ Quyên (Admin)',
                    title: stepTitle,
                    desc: stepDesc,
                    isInternal: false
                });

                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();
                renderTicketDetail(currentActiveTicket);

                showToast(`Đã cập nhật tiến độ RMA sang Bước ${currentStep}: ${stepTitle}!`, 'success');
            } else {
                showToast('Quy trình đổi trả RMA này đã hoàn tất trọn vẹn.', 'info');
            }
        });

        // ---------------------------------------------------------
        // NÚT KHÓA AN TOÀN NHẬN VIỆC KTV (PHASE 2)
        // ---------------------------------------------------------
        document.getElementById('btnToggleStaffSafetyLock')?.addEventListener('click', () => {
            if (!currentActiveTicket || !currentActiveTicket.staffExecuted) return;
            const staffName = currentActiveTicket.staffExecuted;
            const currentLock = getStaffSafetyLockStatus(staffName);
            const newLock = !currentLock;
            setStaffSafetyLockStatus(staffName, newLock);

            currentActiveTicket.timeline.unshift({
                time: 'Vừa xong',
                author: 'Lê Lệ Quyên (Admin)',
                title: newLock ? 'Kích hoạt Khóa an toàn KTV' : 'Mở khóa an toàn nhận việc cho KTV',
                desc: newLock
                    ? `Đã kích hoạt khóa an toàn: tạm dừng tiếp nhận các lịch hẹn mới cho nhân viên "${staffName}" để phục vụ công tác thanh tra xác minh khiếu nại ${currentActiveTicket.id}.`
                    : `Đã dỡ bỏ lệnh tạm khóa nhận việc cho nhân viên "${staffName}". Nhân viên có thể tiếp tục nhận lịch dịch vụ bình thường.`,
                isInternal: true
            });

            renderTicketDetail(currentActiveTicket);
            showToast(newLock
                ? `Đã tạm khóa an toàn KTV "${staffName}" thành công! Hệ thống đã chặn tiếp nhận lịch hẹn mới.`
                : `Đã mở khóa nhận việc cho KTV "${staffName}" thành công!`, 'success');
        });

        // ---------------------------------------------------------
        // MODAL: CHUYỂN NGƯỜI PHỤ TRÁCH TICKET (PHASE 2)
        // ---------------------------------------------------------
        const assignModal = document.getElementById('assignHandlerModalOverlay');
        document.getElementById('btnAssignHandler')?.addEventListener('click', () => {
            if (!currentActiveTicket) return;
            const sel = document.getElementById('selectAssignStaff');
            if (sel) {
                let options = [];
                if (window.PawpalStaffManager && typeof window.PawpalStaffManager.getAllStaff === 'function') {
                    const allStaff = window.PawpalStaffManager.getAllStaff();
                    options = allStaff.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${escapeHtml(s.position)} - ${escapeHtml(s.role)})</option>`);
                } else {
                    options = [
                        '<option value="Lê Lệ Quyên">Lê Lệ Quyên (Quản trị viên - Admin)</option>',
                        '<option value="Nguyễn Văn A">Nguyễn Văn A (Groomer - Kỹ thuật viên)</option>',
                        '<option value="Trần Thị B">Trần Thị B (Lễ tân - Tiếp tân)</option>',
                        '<option value="Phạm Thị D">Phạm Thị D (CSKH - Bán hàng)</option>',
                        '<option value="Trần Văn Hùng">Trần Văn Hùng (Groomer trưởng - Kỹ thuật viên)</option>'
                    ];
                }
                sel.innerHTML = options.join('');
                if (currentActiveTicket.staffAssigned && currentActiveTicket.staffAssigned !== 'Chưa phân công') {
                    sel.value = currentActiveTicket.staffAssigned;
                }
            }
            const noteEl = document.getElementById('inputAssignNote');
            if (noteEl) noteEl.value = '';
            assignModal.classList.add('active');
        });

        document.getElementById('btnCancelAssignHandler')?.addEventListener('click', () => assignModal.classList.remove('active'));
        document.getElementById('btnDismissAssignHandler')?.addEventListener('click', () => assignModal.classList.remove('active'));

        document.getElementById('btnConfirmAssignHandler')?.addEventListener('click', () => {
            if (!currentActiveTicket) return;
            const newStaff = document.getElementById('selectAssignStaff')?.value || 'Lê Lệ Quyên';
            const note = document.getElementById('inputAssignNote')?.value.trim() || 'Bàn giao phụ trách xử lý tiếp theo cam kết SLA.';

            currentActiveTicket.staffAssigned = newStaff;
            if (currentActiveTicket.status === 'new') {
                currentActiveTicket.status = 'processing';
            }

            currentActiveTicket.timeline.unshift({
                time: 'Vừa xong',
                author: 'Lê Lệ Quyên (Admin)',
                title: 'Chuyển giao người phụ trách Ticket',
                desc: `Đã phân công lại người phụ trách cho: ${newStaff}. Ghi chú dặn dò: "${note}".`,
                isInternal: true
            });

            assignModal.classList.remove('active');
            updateComplaintsKpis();
            renderComplaintsAlertBar();
            if (currentTicketType === 'service') renderServiceComplaintsTable();
            else renderOrderComplaintsTable();
            renderTicketDetail(currentActiveTicket);
            saveComplaintsState();
            syncTicketToUserPortal(currentActiveTicket);

            showToast(`Đã chuyển người phụ trách Ticket ${currentActiveTicket.id} cho "${newStaff}" thành công!`, 'success');
        });

        // ---------------------------------------------------------
        // MODAL: YÊU CẦU BỔ SUNG THÔNG TIN (PHASE 2)
        // ---------------------------------------------------------
        const requestInfoModal = document.getElementById('requestMoreInfoModalOverlay');
        document.getElementById('btnRequestMoreInfo')?.addEventListener('click', () => {
            if (!currentActiveTicket) return;
            const msgEl = document.getElementById('inputRequestMessage');
            if (msgEl) {
                const targetRef = currentActiveTicket.bookingId ? 'lịch hẹn dịch vụ ' + currentActiveTicket.bookingId : 'đơn hàng ' + currentActiveTicket.orderId;
                msgEl.value = `Kính gửi Quý khách ${currentActiveTicket.customerName}, Pawpal chân thành cáo lỗi vì trải nghiệm chưa trọn vẹn tại ${targetRef}. Để có thể hỗ trợ xác minh và giải quyết quyền lợi nhanh nhất cho Quý khách, Pawpal xin phép nhờ Quý khách gửi bổ sung thêm hình ảnh chụp rõ nét tình trạng hiện tại của bé / sản phẩm. Trân trọng cảm ơn Quý khách!`;
            }
            requestInfoModal.classList.add('active');
        });

        document.getElementById('btnCancelRequestInfo')?.addEventListener('click', () => requestInfoModal.classList.remove('active'));
        document.getElementById('btnDismissRequestInfo')?.addEventListener('click', () => requestInfoModal.classList.remove('active'));

        document.getElementById('btnSendRequestInfo')?.addEventListener('click', () => {
            if (!currentActiveTicket) return;
            const channelSelect = document.getElementById('selectRequestChannel');
            const channelVal = channelSelect ? channelSelect.value : 'zalo';
            const channelLabel = channelVal === 'zalo' ? 'Tin nhắn Zalo OA' : (channelVal === 'sms' ? 'Tin nhắn SMS Brandname' : (channelVal === 'call' ? 'Cuộc gọi điện thoại' : 'Email thông báo'));
            const msg = document.getElementById('inputRequestMessage')?.value.trim();

            if (!msg) {
                showToast('Vui lòng nhập nội dung yêu cầu bổ sung thông tin.', 'warning');
                return;
            }

            currentActiveTicket.status = 'waiting_customer';

            currentActiveTicket.timeline.unshift({
                time: 'Vừa xong',
                author: 'Lê Lệ Quyên (CSKH)',
                title: `Gửi yêu cầu bổ sung thông tin qua ${channelLabel}`,
                desc: `Đã gửi thông báo cho khách hàng ${currentActiveTicket.customerName} (${currentActiveTicket.phone}). Nội dung: "${msg}". Trạng thái chuyển sang Chờ phản hồi khách hàng.`,
                isInternal: false
            });

            requestInfoModal.classList.remove('active');
            updateComplaintsKpis();
            renderComplaintsAlertBar();
            if (currentTicketType === 'service') renderServiceComplaintsTable();
            else renderOrderComplaintsTable();
            renderTicketDetail(currentActiveTicket);
            saveComplaintsState();
            syncTicketToUserPortal(currentActiveTicket);

            showToast(`Đã gửi yêu cầu bổ sung thông tin đến khách hàng qua kênh ${channelLabel} thành công!`, 'success');
        });

        // Gửi phản hồi / ghi chú vào Timeline
        document.getElementById('btnSubmitReply')?.addEventListener('click', () => {
            const txt = document.getElementById('replyContentInput');
            if (!txt || !txt.value.trim()) {
                showToast('Vui lòng nhập nội dung ghi nhận.', 'warning');
                return;
            }
            const isInternal = document.querySelector('input[name="replyType"]:checked')?.value === 'internal';
            if (currentActiveTicket) {
                currentActiveTicket.timeline.unshift({
                    time: 'Vừa xong',
                    author: 'Lê Lệ Quyên (Admin)',
                    title: isInternal ? 'Ghi chú nội bộ' : 'Phản hồi cho khách hàng',
                    desc: txt.value.trim(),
                    isInternal: isInternal
                });
                txt.value = '';
                renderTicketDetail(currentActiveTicket);
                saveComplaintsState();
                syncTicketToUserPortal(currentActiveTicket);
                showToast('Đã cập nhật Timeline thành công!', 'success');
            }
        });

        // Gắn sự kiện bộ lọc Subtab 1 (Dịch vụ)
        document.getElementById('serviceSearchInput')?.addEventListener('input', renderServiceComplaintsTable);
        document.getElementById('serviceFilterCategory')?.addEventListener('change', renderServiceComplaintsTable);
        document.getElementById('serviceFilterStatus')?.addEventListener('change', renderServiceComplaintsTable);
        document.getElementById('serviceFilterPriority')?.addEventListener('change', renderServiceComplaintsTable);
        document.getElementById('serviceFilterStaff')?.addEventListener('change', renderServiceComplaintsTable);

        document.querySelectorAll('#serviceQuickChips .quick-chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.getAttribute('data-filter') || 'ALL';
                setServiceQuickFilter(f);
            });
        });

        // Click KPI Card Subtab 1
        document.querySelectorAll('[data-service-kpi]').forEach(card => {
            card.addEventListener('click', () => {
                const filterVal = card.getAttribute('data-service-kpi');
                if (currentServiceKpiFilter === filterVal) {
                    currentServiceKpiFilter = 'ALL';
                    card.classList.remove('active');
                } else {
                    document.querySelectorAll('[data-service-kpi]').forEach(c => c.classList.remove('active'));
                    currentServiceKpiFilter = filterVal;
                    card.classList.add('active');
                }
                renderServiceComplaintsTable();
            });
        });

        document.getElementById('btnFilterUrgentService')?.addEventListener('click', () => {
            setServiceQuickFilter('OVERDUE');
        });

        // Gắn sự kiện bộ lọc Subtab 2 (Đơn hàng)
        document.getElementById('orderSearchInput')?.addEventListener('input', renderOrderComplaintsTable);
        document.getElementById('orderFilterIssue')?.addEventListener('change', renderOrderComplaintsTable);
        document.getElementById('orderFilterStatus')?.addEventListener('change', renderOrderComplaintsTable);
        document.getElementById('orderFilterPriority')?.addEventListener('change', renderOrderComplaintsTable);
        document.getElementById('orderFilterStaff')?.addEventListener('change', renderOrderComplaintsTable);

        document.querySelectorAll('#orderQuickChips .quick-chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.getAttribute('data-filter') || 'ALL';
                setOrderQuickFilter(f);
            });
        });

        // Click KPI Card Subtab 2
        document.querySelectorAll('[data-order-kpi]').forEach(card => {
            card.addEventListener('click', () => {
                const filterVal = card.getAttribute('data-order-kpi');
                if (currentOrderKpiFilter === filterVal) {
                    currentOrderKpiFilter = 'ALL';
                    card.classList.remove('active');
                } else {
                    document.querySelectorAll('[data-order-kpi]').forEach(c => c.classList.remove('active'));
                    currentOrderKpiFilter = filterVal;
                    card.classList.add('active');
                }
                renderOrderComplaintsTable();
            });
        });

        document.getElementById('btnFilterUrgentOrder')?.addEventListener('click', () => {
            setOrderQuickFilter('OVERDUE');
        });

        // Đồng bộ vé khiếu nại được tạo từ kênh Chatbot CSKH
        function syncSharedTicketsFromChatbot() {
            try {
                const storedRaw = sessionStorage.getItem('pawpal_admin_shared_tickets');
                if (!storedRaw) return;
                const sharedList = JSON.parse(storedRaw);
                if (Array.isArray(sharedList)) {
                    sharedList.forEach(t => {
                        const isService = t.bookingId || t.serviceName;
                        if (isService) {
                            if (!mockServiceComplaints.some(item => item.id === t.id)) {
                                mockServiceComplaints.unshift(t);
                            }
                        } else {
                            if (!mockOrderComplaints.some(item => item.id === t.id)) {
                                mockOrderComplaints.unshift(t);
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('Lỗi sync shared tickets:', e);
            }
        }

        // Khởi tạo ban đầu
        syncSharedTicketsFromChatbot();
        updateComplaintsKpis();
        renderComplaintsAlertBar();

        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_complaint_active_subtab');
        const initialSubtab = (currentHash && document.getElementById('subtab-' + currentHash))
            ? currentHash
            : (savedSubtab && document.getElementById('subtab-' + savedSubtab))
                ? savedSubtab
                : 'tab-complaint-services';

        switchSubtab(initialSubtab);

        // Tiếp nhận preset khiếu nại hoặc mở Ticket từ phân hệ khác
        const checkPresetComplaint = () => {
            syncSharedTicketsFromChatbot();
            const rawPreset = sessionStorage.getItem('pawpal_admin_complaint_preset');
            if (rawPreset) {
                try {
                    const preset = JSON.parse(rawPreset);
                    const phoneEl = document.getElementById('inputTicketCustomerPhone');
                    const nameEl = document.getElementById('inputTicketCustomerName');
                    if (phoneEl && (preset.custPhone || preset.ownerPhone)) phoneEl.value = preset.custPhone || preset.ownerPhone;
                    if (nameEl && (preset.custName || preset.ownerName)) nameEl.value = preset.custName || preset.ownerName;

                    const createModal = document.getElementById('createTicketModalOverlay');
                    if (createModal) {
                        const titleEl = document.getElementById('createTicketModalTitle');
                        if (titleEl) titleEl.textContent = 'Tiếp nhận khiếu nại khách hàng';
                        createModal.classList.add('active');
                    }
                    sessionStorage.removeItem('pawpal_admin_complaint_preset');
                } catch (e) {}
            }

            const rawTicketId = sessionStorage.getItem('pawpal_admin_ticket_id') || sessionStorage.getItem('pawpal_admin_complaint_selected_id');
            if (rawTicketId) {
                sessionStorage.removeItem('pawpal_admin_ticket_id');
                const foundService = mockServiceComplaints.find(i => i.id === rawTicketId);
                const foundOrder = mockOrderComplaints.find(i => i.id === rawTicketId);
                if (foundService) {
                    currentActiveTicket = foundService;
                    currentTicketType = 'service';
                    switchSubtab('tab-complaint-detail');
                } else if (foundOrder) {
                    currentActiveTicket = foundOrder;
                    currentTicketType = 'order';
                    switchSubtab('tab-complaint-detail');
                }
            }

            const filterStatus = sessionStorage.getItem('pawpal_admin_complaint_filter_status');
            if (filterStatus) {
                sessionStorage.removeItem('pawpal_admin_complaint_filter_status');
                const sSelect = document.getElementById('serviceFilterStatus');
                if (sSelect) {
                    sSelect.value = filterStatus;
                    renderServiceComplaintsTable();
                }
            }
        };

        // Lắng nghe sự kiện storage để đồng bộ real-time giữa Tab User và Tab Admin
        window.addEventListener('storage', (e) => {
            if (e.key === 'pawpal_service_complaints' || e.key === 'pawpal_order_complaints') {
                try {
                    const latestServices = JSON.parse(localStorage.getItem('pawpal_service_complaints')) || [];
                    const latestOrders = JSON.parse(localStorage.getItem('pawpal_order_complaints')) || [];
                    if (latestServices.length > 0) {
                        mockServiceComplaints.length = 0;
                        mockServiceComplaints.push(...latestServices);
                    }
                    if (latestOrders.length > 0) {
                        mockOrderComplaints.length = 0;
                        mockOrderComplaints.push(...latestOrders);
                    }
                    updateComplaintsKpis();
                    renderComplaintsAlertBar();
                    if (currentTicketType === 'service') renderServiceComplaintsTable();
                    else renderOrderComplaintsTable();
                    if (currentActiveTicket) {
                        const updated = (currentTicketType === 'service' ? mockServiceComplaints : mockOrderComplaints).find(x => x.id === currentActiveTicket.id);
                        if (updated) renderTicketDetail(updated);
                    }
                } catch (err) {}
            }
        });

        setTimeout(checkPresetComplaint, 150);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComplaintsModule);
    } else {
        initComplaintsModule();
    }
})();
