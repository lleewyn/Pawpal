// complaints.js - Phân hệ Quản lý Khiếu nại Pawpal-er
(function() {
    function initComplaintsModule() {
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
                <button type="button" class="header-subtab-btn active" data-subtab="tab-complaint-services">Theo Dịch vụ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-orders">Theo Đơn hàng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-detail">Chi tiết khiếu nại</button>
            `;
        }

        // ---------------------------------------------------------
        // 1. DATA MOCK (Khiếu nại Dịch vụ & Khiếu nại Đơn hàng)
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
                staffAssigned: 'Lê Lệ Quyên',
                createdAt: '2026-06-25 16:30',
                status: 'processing',
                evidence: ['vet-tray-tai.jpg', 'hoa-don-dich-vu.jpg'],
                timeline: [
                    { time: '16:30 - 25/06/2026', author: 'Lê Lệ Quyên (Khách hàng)', title: 'Gửi khiếu nại qua Website', desc: 'Khách gửi phản ánh về vết thương ở tai bé Miu kèm hình ảnh.', isInternal: false },
                    { time: '16:45 - 25/06/2026', author: 'Nguyễn Văn A (CSKH)', title: 'Tiếp nhận Ticket', desc: 'Đã nhận xử lý và chuyển thông tin cho Quản lý chi nhánh xác minh.', isInternal: true },
                    { time: '17:15 - 25/06/2026', author: 'Lê Lệ Quyên (Admin)', title: 'Kiểm tra camera phòng sấy', desc: 'Kỹ thuật viên Ngọc Anh thao tác gỡ móng bị vướng khăn khiến bé giật mình, không có hành vi bạo lực với Pet.', isInternal: true }
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
                staffExecuted: 'Ngọc Anh (Chi nhánh Quận 1)',
                title: 'Chưa thấy thuyên giảm tình trạng ngứa',
                content: 'Gói tắm trị liệu đã thực hiện 2 ngày nhưng bé vẫn gãi nhiều ở bả vai, mong muốn được bác sĩ da liễu khám lại.',
                priority: 'medium',
                staffAssigned: 'Nguyễn Văn A',
                createdAt: '2026-06-28 09:15',
                status: 'new',
                evidence: ['da-lung-viem.jpg'],
                timeline: [
                    { time: '09:15 - 28/06/2026', author: 'Trần Minh Quân (Khách hàng)', title: 'Gửi yêu cầu kiểm tra lại', desc: 'Khách đề nghị bác sĩ kiểm tra lại mảng viêm.', isInternal: false }
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
                title: 'Bé bỏ ăn bữa tối khi lưu trú',
                content: 'Camera phòng khách xem thấy bé không ăn hạt buổi tối, không thấy nhân viên bổ sung pate như Add-on đã mua.',
                priority: 'high',
                staffAssigned: 'Trần Thị B',
                createdAt: '2026-06-26 20:00',
                status: 'waiting_customer',
                evidence: [],
                timeline: [
                    { time: '20:00 - 26/06/2026', author: 'Hoàng Minh Tuấn (Khách hàng)', title: 'Phản ánh bữa ăn của bé', desc: 'Khách xem camera và báo bé chưa được ăn pate.', isInternal: false },
                    { time: '20:15 - 26/06/2026', author: 'Trần Thị B (Lễ tân)', title: 'Phản hồi khách', desc: 'Đã bổ sung pate hâm nóng và bé đã ăn hết. Đã gửi clip qua Zalo cho khách xác nhận.', isInternal: false }
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
                customerDemand: 'Đổi sản phẩm đúng màu xanh',
                priority: 'medium',
                staffAssigned: 'Phạm Thị D',
                createdAt: '2026-06-12 11:20',
                status: 'processing',
                content: 'Tôi đặt đồ chơi xương gặm màu cam nhưng khi mở kiện hàng giao tới lại là màu xanh lá.',
                evidence: ['anh-san-pham-giao-sai.jpg'],
                timeline: [
                    { time: '11:20 - 12/06/2026', author: 'Lê Lệ Quyên (Khách hàng)', title: 'Phản ánh giao sai màu', desc: 'Khách nhận nhầm màu đồ chơi so với đơn đặt.', isInternal: false },
                    { time: '11:35 - 12/06/2026', author: 'Phạm Thị D (CSKH)', title: 'Xác nhận đơn hàng và kho', desc: 'Kho đóng gói nhầm mã phân loại màu cam và xanh. Chấp thuận đổi hàng mới miễn phí vận chuyển.', isInternal: true }
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
                staffAssigned: 'Phạm Thị D',
                createdAt: '2026-06-15 14:00',
                status: 'new',
                content: 'Kiện hàng bị va đập khi vận chuyển khiến 2 lon pate bị móp méo rách seal bốc mùi.',
                evidence: ['anh-lon-mop.jpg'],
                timeline: [
                    { time: '14:00 - 15/06/2026', author: 'Nguyễn Văn An (Khách hàng)', title: 'Yêu cầu gửi bù hàng hỏng', desc: 'Khách gửi ảnh 2 lon pate hỏng seal.', isInternal: false }
                ]
            }
        ];

        let currentActiveTicket = mockServiceComplaints[0];
        let currentTicketType = 'service'; // 'service' hoặc 'order'

        // ---------------------------------------------------------
        // 2. CHUYỂN ĐỔI SUB-TAB & DEEP BREADCRUMB
        // ---------------------------------------------------------
        const headerSubtabBtns = subtabsContainer ? subtabsContainer.querySelectorAll('.header-subtab-btn') : [];
        const sections = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(ticketCode) {
            if (!deepBreadcrumbEl) return;
            if (ticketCode) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${ticketCode}</span>
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

            // Re-render data tương ứng
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

            // Lưu state
            sessionStorage.setItem('pawpal_admin_complaint_active_subtab', targetSubtab);
            try {
                history.replaceState(null, '', '#' + targetSubtab);
            } catch (e) {}

            if (window.lucide) lucide.createIcons();
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
        // 3. RENDER SUB-TAB 1: KHIẾU NẠI DỊCH VỤ
        // ---------------------------------------------------------
        function renderServiceComplaintsTable() {
            const tbody = document.getElementById('serviceComplaintsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            mockServiceComplaints.forEach(item => {
                let statusBadge = '';
                if (item.status === 'new') statusBadge = '<span class="admin-badge badge-warning">Mới tiếp nhận</span>';
                else if (item.status === 'processing') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
                else if (item.status === 'waiting_customer') statusBadge = '<span class="admin-badge badge-neutral">Chờ phản hồi</span>';
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-active">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge" style="color: #DC2626; background: #FEE2E2; border-color: #FED8D8;">Cao</span>'
                    : (item.priority === 'medium' ? '<span class="admin-badge badge-tier-gold">Trung bình</span>' : '<span class="admin-badge badge-neutral">Thấp</span>');

                let rowClass = item.priority === 'high' ? 'row-alert-high' : '';

                const tr = document.createElement('tr');
                if (rowClass) tr.className = rowClass;
                tr.innerHTML = `
                    <td><strong>${item.id}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-open-ticket" data-id="${item.id}" data-type="service">${item.customerName}</a>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.phone}</div>
                    </td>
                    <td>${item.petName}</td>
                    <td><a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${item.bookingId}">${item.bookingId}</a></td>
                    <td>${item.serviceName}</td>
                    <td>
                        <div style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.content}">
                            ${item.title}
                        </div>
                    </td>
                    <td>${priorityBadge}</td>
                    <td>${item.staffAssigned}</td>
                    <td>${item.createdAt}</td>
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
        // 4. RENDER SUB-TAB 2: KHIẾU NẠI ĐƠN HÀNG
        // ---------------------------------------------------------
        function renderOrderComplaintsTable() {
            const tbody = document.getElementById('orderComplaintsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            mockOrderComplaints.forEach(item => {
                let statusBadge = '';
                if (item.status === 'new') statusBadge = '<span class="admin-badge badge-warning">Mới tiếp nhận</span>';
                else if (item.status === 'processing') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
                else if (item.status === 'waiting_return') statusBadge = '<span class="admin-badge badge-neutral">Chờ nhận hàng</span>';
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-active">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge" style="color: #DC2626; background: #FEE2E2; border-color: #FED8D8;">Cao</span>'
                    : '<span class="admin-badge badge-tier-gold">Trung bình</span>';

                let rowClass = item.priority === 'high' ? 'row-alert-high' : '';

                const tr = document.createElement('tr');
                if (rowClass) tr.className = rowClass;
                tr.innerHTML = `
                    <td><strong>${item.id}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-open-ticket" data-id="${item.id}" data-type="order">${item.customerName}</a>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.phone}</div>
                    </td>
                    <td><a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${item.orderId}">${item.orderId}</a></td>
                    <td>
                        <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.productName}">
                            ${item.productName}
                        </div>
                    </td>
                    <td>${item.issueType === 'wrong_item' ? 'Sai sản phẩm' : 'Hư hỏng hàng'}</td>
                    <td>${item.customerDemand}</td>
                    <td>${priorityBadge}</td>
                    <td>${item.staffAssigned}</td>
                    <td>${item.createdAt}</td>
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
        // 5. RENDER SUB-TAB 3: CHI TIẾT TICKET 360°
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
                statusBadgeEl.textContent = ticket.status === 'processing' ? 'Đang xử lý' : (ticket.status === 'new' ? 'Mới tiếp nhận' : (ticket.status === 'waiting_customer' ? 'Chờ phản hồi khách hàng' : 'Đã giải quyết'));
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
                            <span><strong>${t.author}</strong> ${badge}</span>
                            <span>${t.time}</span>
                        </div>
                        <div class="timeline-entry-title">${t.title}</div>
                        <div class="timeline-entry-desc">${t.desc}</div>
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
        // 6. GẮN SỰ KIỆN CLICK BẢNG VÀ DROPDOWN
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
            alert('Đã nhận xử lý Ticket thành công! Ticket chuyển sang trạng thái Đang xử lý.');
            document.getElementById('complaintsActionDropdown').style.display = 'none';
        });

        document.getElementById('menuActionCloseTicket')?.addEventListener('click', () => {
            alert('Ticket đã được đóng hoàn tất.');
            document.getElementById('complaintsActionDropdown').style.display = 'none';
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
                currentActiveTicket.timeline.push({
                    time: 'Vừa xong',
                    author: 'Lê Lệ Quyên (Admin)',
                    title: 'Áp dụng phương án giải quyết',
                    desc: document.getElementById('inputResolveNote').value || 'Đã thống nhất phương án xử lý với khách hàng.',
                    isInternal: false
                });
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
                currentActiveTicket.timeline.push({
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

        // Khởi tạo subtab ban đầu theo Hash hoặc Session
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
