// complaints.js - Phân hệ Quản lý Khiếu nại Pawpal-er (Giai đoạn 1: Chống bỏ sót & SLA)
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
                    Theo Dịch vụ
                    <span class="tab-badge-count" id="badgeServiceComplaintsCount" style="display: none;">0</span>
                </button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-orders" style="position: relative;">
                    Theo Đơn hàng
                    <span class="tab-badge-count" id="badgeOrderComplaintsCount" style="display: none;">0</span>
                </button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-detail">Chi tiết khiếu nại</button>
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

        // ---------------------------------------------------------
        // 1. DATA MOCK (Khiếu nại Dịch vụ & Đơn hàng kèm SLA chuẩn)
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
                timeline: [
                    { time: '15:00 - 27/09/2026', author: 'Bùi Anh Tuấn (Khách hàng)', title: 'Báo thiếu hàng', desc: 'Thiếu 1 gói bánh thưởng sữa dê.', isInternal: false },
                    { time: '15:30 - 27/09/2026', author: 'Lê Lệ Quyên (Admin)', title: 'Check camera kho đóng hàng', desc: 'Nhân viên đóng gói sót 1 gói. Đã book bưu tá hỏa tốc gửi bù.', isInternal: true }
                ]
            }
        ];

        let currentActiveTicket = mockServiceComplaints[0];
        let currentTicketType = 'service'; // 'service' hoặc 'order'

        // Trạng thái lọc
        let currentServiceQuickFilter = 'ALL';
        let currentServiceKpiFilter = 'ALL';
        let currentOrderQuickFilter = 'ALL';
        let currentOrderKpiFilter = 'ALL';

        // ---------------------------------------------------------
        // 2. HELPER BADGE & SLA
        // ---------------------------------------------------------
        function getSlaBadge(item) {
            if (item.status === 'resolved' || item.status === 'closed') {
                return '<span class="sla-badge sla-done">Đã giải quyết</span>';
            }
            if (item.slaStatus === 'OVERDUE') {
                return `<span class="sla-badge sla-overdue">${escapeHtml(item.slaRemainingText)}</span>`;
            }
            if (item.slaStatus === 'URGENT') {
                return `<span class="sla-badge sla-urgent">${escapeHtml(item.slaRemainingText)}</span>`;
            }
            return `<span class="sla-badge sla-normal">${escapeHtml(item.slaRemainingText)}</span>`;
        }

        function updateComplaintsKpis() {
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
                        text: `${overdueService.length} khiếu nại dịch vụ quá hạn SLA (${ids})`,
                        filter: 'OVERDUE'
                    });
                }

                const urgentInjury = mockServiceComplaints.filter(i => i.priority === 'high' && (i.content.includes('trầy') || i.content.includes('máu') || i.content.includes('rớt')));
                if (urgentInjury.length > 0) {
                    alerts.push({
                        type: 'warning',
                        text: `Có sự cố Pet cần can thiệp chăm sóc khẩn cấp (${urgentInjury[0].id})`,
                        filter: 'HIGH'
                    });
                }

                const unassignedService = mockServiceComplaints.filter(i => i.staffAssigned === 'Chưa phân công' && i.status !== 'resolved' && i.status !== 'closed');
                if (unassignedService.length > 0) {
                    alerts.push({
                        type: 'info',
                        text: `${unassignedService.length} ca khiếu nại dịch vụ chưa phân công người phụ trách`,
                        filter: 'UNASSIGNED'
                    });
                }

                let html = alerts.map(a => `
                    <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">${escapeHtml(a.text)}</span>
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
                        text: `${overdueOrder.length} khiếu nại đơn hàng quá hạn SLA (${ids})`,
                        filter: 'OVERDUE'
                    });
                }

                const unassignedOrder = mockOrderComplaints.filter(i => i.staffAssigned === 'Chưa phân công' && i.status !== 'resolved' && i.status !== 'closed');
                if (unassignedOrder.length > 0) {
                    alerts.push({
                        type: 'info',
                        text: `${unassignedOrder.length} khiếu nại đơn hàng mới chưa phân công`,
                        filter: 'UNASSIGNED'
                    });
                }

                let html = alerts.map(a => `
                    <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">${escapeHtml(a.text)}</span>
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
        // 4. CHUYỂN ĐỔI SUB-TAB & DEEP BREADCRUMB
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
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-active">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge badge-danger">Cao</span>'
                    : (item.priority === 'medium' ? '<span class="admin-badge badge-tier-gold">Trung bình</span>' : '<span class="admin-badge badge-neutral">Thấp</span>');

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
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-active">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge badge-danger">Cao</span>'
                    : '<span class="admin-badge badge-tier-gold">Trung bình</span>';

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
        // 7. RENDER SUB-TAB 3: CHI TIẾT TICKET 360°
        // ---------------------------------------------------------
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

            // Cột trái
            const contentEl = document.getElementById('viewTicketCustomerContent');
            if (contentEl) contentEl.textContent = `"${ticket.content}"`;

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

            if (currentActiveTicket && currentActiveTicket.id === ticketId) {
                renderTicketDetail(targetTicket);
            }

            alert(`Đã nhận xử lý Ticket ${ticketId} thành công! Người phụ trách: Lê Lệ Quyên (CSKH).`);
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
                alert(`Ticket ${id} đã được đóng hoàn tất.`);
            }
        });

        // Modal Tạo Ticket
        const createModal = document.getElementById('createTicketModalOverlay');
        document.getElementById('btnOpenCreateServiceTicket')?.addEventListener('click', () => {
            document.getElementById('createTicketModalTitle').textContent = 'Tiếp nhận khiếu nại Dịch vụ';
            document.getElementById('labelTicketRefId').textContent = 'Chọn lịch hẹn liên quan *';
            const sel = document.getElementById('selectTicketRefId');
            sel.innerHTML = `
                <option value="BKG-1001">BKG-1001 (Miu Con - Tắm Vệ Sinh Cơ Bản)</option>
                <option value="BKG-1008">BKG-1008 (Bông Xù - Tắm Thuốc Da Liễu)</option>
                <option value="BKG-1004">BKG-1004 (Lu Lu - Pet Hotel Tiêu Chuẩn)</option>
            `;
            createModal.classList.add('active');
        });

        document.getElementById('btnOpenCreateOrderTicket')?.addEventListener('click', () => {
            document.getElementById('createTicketModalTitle').textContent = 'Tiếp nhận khiếu nại Đơn hàng';
            document.getElementById('labelTicketRefId').textContent = 'Chọn đơn hàng liên quan *';
            const sel = document.getElementById('selectTicketRefId');
            sel.innerHTML = `
                <option value="ORD-2026-001">ORD-2026-001 (Đồ chơi gặm xương)</option>
                <option value="ORD-2026-005">ORD-2026-005 (Pate mèo nắp bật)</option>
            `;
            createModal.classList.add('active');
        });

        document.getElementById('btnCancelCreateTicket')?.addEventListener('click', () => createModal.classList.remove('active'));
        document.getElementById('btnDismissCreateTicket')?.addEventListener('click', () => createModal.classList.remove('active'));
        document.getElementById('btnSaveCreateTicket')?.addEventListener('click', () => {
            alert('Tạo Ticket khiếu nại thành công!');
            createModal.classList.remove('active');
        });

        // Modal Phương án giải quyết
        const resolveModal = document.getElementById('resolveTicketModalOverlay');
        document.getElementById('btnOpenResolveModal')?.addEventListener('click', () => {
            resolveModal.classList.add('active');
        });
        document.getElementById('menuActionQuickResolve')?.addEventListener('click', () => {
            document.getElementById('complaintsActionDropdown').style.display = 'none';
            resolveModal.classList.add('active');
        });
        document.getElementById('btnCancelResolveModal')?.addEventListener('click', () => resolveModal.classList.remove('active'));
        document.getElementById('btnDismissResolveModal')?.addEventListener('click', () => resolveModal.classList.remove('active'));

        const selectResolveOpt = document.getElementById('selectResolveOption');
        selectResolveOpt?.addEventListener('change', () => {
            const val = selectResolveOpt.value;
            const valGroup = document.getElementById('resolveValueGroup');
            if (val === 'refund' || val === 'reward_voucher' || val === 'rma_refund') {
                valGroup.style.display = 'block';
            } else {
                valGroup.style.display = 'none';
            }
        });

        document.getElementById('btnConfirmResolveTicket')?.addEventListener('click', () => {
            alert('Phương án giải quyết đã được ghi nhận và cập nhật vào Timeline Ticket!');
            resolveModal.classList.remove('active');
            if (currentActiveTicket) {
                currentActiveTicket.status = 'resolved';
                currentActiveTicket.slaStatus = 'DONE';
                currentActiveTicket.slaRemainingText = 'Đã giải quyết';
                currentActiveTicket.timeline.unshift({
                    time: 'Vừa xong',
                    author: 'Lê Lệ Quyên (Admin)',
                    title: 'Áp dụng phương án giải quyết',
                    desc: document.getElementById('inputResolveNote').value || 'Đã thống nhất phương án xử lý với khách hàng.',
                    isInternal: false
                });
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                renderTicketDetail(currentActiveTicket);
            }
        });

        // Gửi phản hồi / ghi chú vào Timeline
        document.getElementById('btnSubmitReply')?.addEventListener('click', () => {
            const txt = document.getElementById('replyContentInput');
            if (!txt || !txt.value.trim()) {
                alert('Vui lòng nhập nội dung ghi nhận.');
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
                alert('Đã cập nhật Timeline thành công!');
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

        // Khởi tạo ban đầu
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComplaintsModule);
    } else {
        initComplaintsModule();
    }
})();
