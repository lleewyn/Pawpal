/**
 * MODULE CHATBOT & TRỰC CHAT CSKH (PAWPAL ADMIN)
 * Tuân thủ nghiêm ngặt 100% AGENTS.md & ADMIN_DESIGN_SYSTEM.md:
 * - 2 Subtabs Header Bar: Trợ lý AI | Trực chat CSKH (Text-only, phân tách bởi '|')
 * - Tự động đồng bộ State và Hash (#tab-ai-copilot, #tab-live-support)
 * - Màn hình Trợ lý AI Copilot nội bộ cho Admin
 * - Màn hình Trực chat CSKH 3 khu vực: Danh sách hội thoại | Khung chat trực tiếp | Bảng thông tin khách hàng 360°
 * - Thẻ tóm tắt ngữ cảnh AI 3 giây
 * - Màng lọc bảo vệ tâm lý nhân viên (ẩn từ ngữ thô tục/tiêu cực)
 * - Thao tác một chạm: Tặng điểm Pawpoint tạ lỗi & Chuyển thành Ticket khiếu nại (liên kết sang phân hệ Khiếu nại)
 */

(function initChatbotModule() {
    console.log('Khởi tạo Module Chatbot & Trực chat CSKH...');

    // -------------------------------------------------------------
    // 1. DỮ LIỆU MẪU MÔ PHỎNG (MOCK DATA)
    // -------------------------------------------------------------
    const mockConversations = [
        {
            id: 'conv-001',
            customerName: 'Lê Lệ Quyên',
            phone: '0901234567',
            tier: 'Kim Cương',
            pawpoints: 1250,
            unreadCount: 2,
            updatedAt: '10:45',
            sentimentLevel: 4, // 1 đến 5
            sentimentText: 'Mức độ 4: Bực bội và Thất vọng',
            isHandover: false, // true = nhân viên tiếp nhận, false = Bot đang phục vụ
            category: 'urgent', // urgent, active, all
            aiSummary: 'Khách phản ánh đơn hàng SP-2026-003 đã quá 2 ngày giao dự kiến vẫn chưa nhận được. Khách đã thanh toán qua MoMo và đang cần gấp thức ăn cho thú cưng. Đề xuất: Kiểm tra bưu tá giao hàng và tặng 50 điểm Pawpoint tạ lỗi.',
            internalNotes: 'Khách hàng VIP Kim Cương, hay mua pate cho mèo. Cần xử lý nhanh và mềm mỏng.',
            recentOrder: { id: 'SP-2026-003', status: 'Chờ giao hàng' },
            recentBooking: { id: 'BKG-1001', status: 'Đã hoàn tất' },
            openTickets: [{ id: 'TK-2026-001', title: 'Vết trầy nhẹ ở vành tai sau tắm sấy' }],
            pets: [
                { name: 'Miu Con', breed: 'Mèo Anh Lông Ngắn', notes: 'Dị ứng phấn hoa' },
                { name: 'Bông Xù', breed: 'Poodle Trắng', notes: 'Bình thường' }
            ],
            messages: [
                { sender: 'user', time: '10:40', text: 'Shop ơi, đơn hàng hạt và pate của mình đặt 3 hôm trước sao giờ vẫn chưa thấy giao vậy?' },
                { sender: 'bot', time: '10:41', text: 'Dạ PawPal xin chào sen! Em xin phép kiểm tra tiến độ đơn hàng SP-2026-003 của sen ngay nhé ạ.' },
                { sender: 'user', time: '10:43', text: 'Kiểm tra nhanh giùm cái, mèo ở nhà hết đồ ăn từ tối qua rồi, giao trễ hoài bực mình quá!', isAngry: true },
                { sender: 'bot', time: '10:44', text: 'Dạ PawPal rất thấu hiểu sự bất tiện này và thành thật xin lỗi sen ạ! Em đang kết nối ngay với chuyên viên CSKH để hỗ trợ sen gấp ạ.' }
            ]
        },
        {
            id: 'conv-002',
            customerName: 'Trần Minh Khang',
            phone: '0988776655',
            tier: 'Vàng',
            pawpoints: 620,
            unreadCount: 1,
            updatedAt: '10:32',
            sentimentLevel: 5,
            sentimentText: 'Mức độ 5: Giận dữ và Khẩn cấp',
            isHandover: true,
            category: 'urgent',
            aiSummary: 'Khách giận dữ vì bé cún Corgi bị trầy xước sau khi tắm tỉa tại cơ sở Quận 1 và có lời lẽ kích động. Màng lọc tâm lý đã che mờ từ thô tục. Đề xuất: Mời bác sĩ thú y chi nhánh gọi điện trực tiếp thăm khám miễn phí.',
            internalNotes: 'Đã chuyển ca cho Quản lý chi nhánh Quận 1 theo dõi.',
            recentOrder: { id: 'SP-2026-001', status: 'Đã giao' },
            recentBooking: { id: 'BKG-1002', status: 'Hoàn tất' },
            openTickets: [{ id: 'TK-2026-003', title: 'Khiếu nại vết xước của cún' }],
            pets: [
                { name: 'Lu Lu', breed: 'Corgi Vàng Trắng', notes: 'Nhát nước, sợ kéo' }
            ],
            messages: [
                { sender: 'user', time: '10:28', text: 'Thợ làm ăn kiểu gì mà cắt rách da con tôi thế này hả lũ vô trách nhiệm?', isToxic: true, maskedText: '[Nội dung tiêu cực/thô tục đã được màng lọc bảo vệ tâm lý che mờ]' },
                { sender: 'bot', time: '10:29', text: 'Dạ PawPal vô cùng xin lỗi sen về sự cố xảy ra với bé! Em xin phép nối máy ngay với Trưởng ca chi nhánh để thăm khám và xử lý tận tình cho bé ạ.' },
                { sender: 'agent', agentName: 'Nguyễn Văn A (CSKH)', time: '10:31', text: 'Dạ em chào anh Khang, em là Văn A - CSKH PawPal. Em đã tiếp nhận ca chat và đang liên hệ Bác sĩ thú y trực tại chi nhánh để hỗ trợ kiểm tra vết thương cho bé Lu Lu ngay lập tức ạ.' }
            ]
        },
        {
            id: 'conv-003',
            customerName: 'Hoàng Bảo Nam',
            phone: '0912998877',
            tier: 'Bạc',
            pawpoints: 210,
            unreadCount: 0,
            updatedAt: '09:50',
            sentimentLevel: 2,
            sentimentText: 'Mức độ 2: Trung tính',
            isHandover: false,
            category: 'all',
            aiSummary: 'Khách hỏi thông tin đặt phòng Pet Hotel dịp lễ sắp tới và chính sách mang theo thức ăn riêng. Bot đã giải đáp theo tài liệu RAG.',
            internalNotes: 'Khách quan tâm phòng VIP cho mèo.',
            recentOrder: null,
            recentBooking: { id: 'BKG-0988', status: 'Đã hoàn tất' },
            openTickets: [],
            pets: [
                { name: 'Bơ Béo', breed: 'Mèo Ba Tư', notes: 'Ăn hạt chuyên biệt' }
            ],
            messages: [
                { sender: 'user', time: '09:48', text: 'PawPal cho mình hỏi giá phòng Pet Hotel dịp lễ 30/4 có tăng giá không và có nhận mang thức ăn riêng không ạ?' },
                { sender: 'bot', time: '09:49', text: 'Dạ PawPal xin chào sen! Vào dịp lễ, giá phòng giữ nguyên phụ thu ngày lễ chỉ 15% và PawPal hoàn toàn hoan nghênh sen mang thức ăn quen thuộc của bé đến gửi nhé ạ.' }
            ]
        },
        {
            id: 'conv-004',
            customerName: 'Nguyễn Thu Trang',
            phone: '0977112233',
            tier: 'Bạc',
            pawpoints: 150,
            unreadCount: 0,
            updatedAt: '09:15',
            sentimentLevel: 1,
            sentimentText: 'Mức độ 1: Tích cực và Thân thiện',
            isHandover: false,
            category: 'all',
            aiSummary: 'Khách gửi lời khen ngợi dịch vụ Spa của bé Poodle tại chi nhánh Bình Thạnh.',
            internalNotes: '',
            recentOrder: null,
            recentBooking: { id: 'BKG-0995', status: 'Đã hoàn tất' },
            openTickets: [],
            pets: [
                { name: 'Kẹo Ngọt', breed: 'Poodle Nâu Đỏ', notes: 'Thích vuốt ve' }
            ],
            messages: [
                { sender: 'user', time: '09:12', text: 'Cảm ơn PawPal nha, bé Kẹo cắt lông xong xinh xắn lắm, bạn nhân viên rất nhẹ nhàng!' },
                { sender: 'bot', time: '09:13', text: 'Dạ PawPal cảm ơn sen và bé Kẹo Ngọt thật nhiều ạ! Chúc sen và bé luôn tràn ngập niềm vui bên nhau nhé ạ ❤️' }
            ]
        }
    ];

    let currentConversation = mockConversations[0];
    let currentFilterTab = 'urgent';

    // -------------------------------------------------------------
    // 2. KHỞI TẠO SUBTABS TRÊN HEADER BAR (CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');

    function renderHeaderSubtabs(activeTabId) {
        if (!subtabsContainer) return;
        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-live-support' ? 'active' : ''}" data-tab="tab-live-support">Trực chat CSKH</button>
            <span class="subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-ai-copilot' ? 'active' : ''}" data-tab="tab-ai-copilot">Trợ lý AI</button>
        `;

        subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                switchSubtab(tab);
            });
        });
    }

    function switchSubtab(tabId) {
        document.querySelectorAll('.chatbot-module-wrapper .subtab-content').forEach(sec => {
            sec.classList.remove('active');
        });

        const activeSec = document.getElementById(`subtab-${tabId}`);
        if (activeSec) activeSec.classList.add('active');

        renderHeaderSubtabs(tabId);
        window.location.hash = `#${tabId}`;
        sessionStorage.setItem('pawpal_admin_chatbot_subtab', tabId);

        // Deep Breadcrumb
        if (deepBreadcrumbEl) {
            if (tabId === 'tab-live-support' && currentConversation) {
                deepBreadcrumbEl.innerHTML = `<span class="breadcrumb-separator">/</span> <span class="breadcrumb-target">${currentConversation.customerName}</span>`;
            } else {
                deepBreadcrumbEl.innerHTML = '';
            }
        }

        if (tabId === 'tab-live-support') {
            renderConversationsList();
            renderCurrentChat();
        }
    }

    // -------------------------------------------------------------
    // 3. LOGIC SUB-TAB 1: TRỢ LÝ AI COPILOT NỘI BỘ
    // -------------------------------------------------------------
    function setupCopilot() {
        const sendBtn = document.getElementById('btnSendCopilot');
        const inputArea = document.getElementById('copilotInput');
        const messagesArea = document.getElementById('copilotMessagesArea');
        const clearBtn = document.getElementById('btnClearCopilotChat');
        const syncRagBtn = document.getElementById('btnSyncRagData');

        function appendUserMessage(text) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const msgHtml = `
                <div class="copilot-msg msg-user">
                    <div class="copilot-msg-header">
                        <span class="copilot-sender-name">Quản trị viên</span>
                        <span class="copilot-msg-time">${timeStr}</span>
                    </div>
                    <div class="copilot-msg-bubble">${text}</div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function appendAiResponse(text) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const msgHtml = `
                <div class="copilot-msg msg-ai">
                    <div class="copilot-msg-header">
                        <span class="copilot-sender-name">PawPal Copilot (Nội bộ)</span>
                        <span class="copilot-msg-time">${timeStr}</span>
                    </div>
                    <div class="copilot-msg-bubble">${text}</div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function handleSend() {
            const text = inputArea.value.trim();
            if (!text) return;
            appendUserMessage(text);
            inputArea.value = '';

            // Phản hồi mẫu thông minh dựa trên ngữ cảnh đặc tả
            setTimeout(() => {
                let response = '';
                const lower = text.toLowerCase();
                if (lower.includes('lịch hẹn') || lower.includes('spa')) {
                    response = 'Dạ thưa Quản trị viên, theo cơ sở dữ liệu hệ thống hôm nay: Đang có tổng cộng **28 lịch hẹn** (18 lịch Spa & Grooming, 6 lịch gửi Hotel, 4 cuốc Pet Taxi). Có 2 ca đang thực hiện và 3 ca sắp tới trong khung giờ 11:00 - 13:00.';
                } else if (lower.includes('hết hàng') || lower.includes('sản phẩm')) {
                    response = 'Dạ báo cáo danh sách tồn kho dưới 5 món cần bổ sung khẩn cấp gồm có:<br>1. <strong>Pate Royal Canin Kitten 85g</strong>: còn 2 gói (Kho Quận 1).<br>2. <strong>Hạt Ganador Puppy 3kg</strong>: còn 3 bao.<br>3. <strong>Sữa tắm trị ve Joyce & Dolls 400ml</strong>: còn 4 chai.';
                } else if (lower.includes('xin lỗi') || lower.includes('giao trễ')) {
                    response = 'Dạ PawPal Copilot đã soạn thảo sẵn mẫu thư xin lỗi gửi khách kèm mã bồi hoàn như sau:<br><br><em>"Kính gửi Quý khách hàng, PawPal chân thành cáo lỗi vì đơn hàng của mình bị chậm trễ do ảnh hưởng mưa bão cục bộ. Đơn vị vận chuyển đang ưu tiên giao gấp trong chiều nay. Để tạ lỗi, PawPal xin gửi tặng mã giảm giá <strong>PAWPAL50K</strong> (trừ trực tiếp 50.000đ cho đơn tiếp theo) hoặc nạp 100 điểm Pawpoint vào ví của Quý khách. Kính chúc Quý khách và bé cưng luôn vui khỏe!"</em>';
                } else if (lower.includes('khiếu nại') || lower.includes('tồn đọng')) {
                    response = 'Dạ tổng hợp phân hệ Khiếu nại trong 24 giờ qua: Có <strong>2 vé đang mở</strong> (TK-2026-001 về vết xước vành tai sau tắm sấy, TK-2026-002 về giao thiếu phụ kiện). Đã có chuyên viên phụ trách và chưa có ca nào quá hạn xử lý.';
                } else {
                    response = `Dạ Copilot đã nhận lệnh: "${text}". Dữ liệu đã được truy vấn qua cơ chế RAG Supabase và mô hình Gemini 1.5 Pro. Hệ thống đang vận hành ổn định và sẵn sàng hỗ trợ các tác vụ tiếp theo!`;
                }
                appendAiResponse(response);
            }, 600);
        }

        sendBtn?.addEventListener('click', handleSend);
        inputArea?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });

        // Prompt pills
        document.querySelectorAll('.copilot-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.getAttribute('data-prompt');
                if (prompt && inputArea) {
                    inputArea.value = prompt;
                    handleSend();
                }
            });
        });

        clearBtn?.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện nội bộ với AI?')) {
                messagesArea.innerHTML = `
                    <div class="copilot-msg msg-ai">
                        <div class="copilot-msg-header">
                            <span class="copilot-sender-name">PawPal Copilot (Nội bộ)</span>
                            <span class="copilot-msg-time">Vừa xong</span>
                        </div>
                        <div class="copilot-msg-bubble">
                            Đã làm mới phiên hội thoại. Tôi có thể hỗ trợ gì cho bạn ngay lúc này?
                        </div>
                    </div>
                `;
            }
        });

        syncRagBtn?.addEventListener('click', () => {
            alert('Đã đồng bộ thành công các tài liệu tri thức RAG mới nhất từ Supabase Vector Store!');
        });
    }

    // -------------------------------------------------------------
    // 4. LOGIC SUB-TAB 2: TRỰC CHAT CSKH HỘP THƯ 3 KHU VỰC
    // -------------------------------------------------------------
    function renderConversationsList() {
        const container = document.getElementById('conversationsListContainer');
        if (!container) return;

        const searchKeyword = (document.getElementById('inboxSearchInput')?.value || '').toLowerCase().trim();

        const filtered = mockConversations.filter(c => {
            if (currentFilterTab === 'urgent' && c.category !== 'urgent') return false;
            if (currentFilterTab === 'active' && !c.isHandover) return false;
            if (searchKeyword) {
                return c.customerName.toLowerCase().includes(searchKeyword) || c.phone.includes(searchKeyword);
            }
            return true;
        });

        // Cập nhật số đếm ca khẩn cấp
        const urgentCount = mockConversations.filter(c => c.category === 'urgent').length;
        const countBadge = document.getElementById('urgentBadgeCount');
        if (countBadge) countBadge.textContent = urgentCount;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
                    Không tìm thấy hội thoại nào phù hợp.
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        filtered.forEach(conv => {
            const isActive = currentConversation && currentConversation.id === conv.id;
            const lastMsg = conv.messages[conv.messages.length - 1];
            const snippet = lastMsg ? (lastMsg.isToxic ? '[Nội dung đã được che mờ]' : lastMsg.text) : '...';

            let sentimentBadge = '';
            if (conv.sentimentLevel >= 4) {
                sentimentBadge = `<span class="admin-badge" style="color: #DC2626; background: #FEE2E2; border-color: #FED8D8; font-size: 10.5px;">Cảm xúc ${conv.sentimentLevel}</span>`;
            } else if (conv.sentimentLevel === 3) {
                sentimentBadge = `<span class="admin-badge badge-warning" style="font-size: 10.5px;">Cảm xúc 3</span>`;
            } else {
                sentimentBadge = `<span class="admin-badge badge-active" style="font-size: 10.5px;">Cảm xúc ${conv.sentimentLevel}</span>`;
            }

            const handoverTag = conv.isHandover
                ? `<span class="admin-badge badge-info" style="font-size: 10.5px;">Nhân viên</span>`
                : `<span class="admin-badge badge-neutral" style="font-size: 10.5px;">Bot</span>`;

            const item = document.createElement('div');
            item.className = `conversation-item ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <div class="conversation-item-top">
                    <span class="conv-cust-name">${conv.customerName}</span>
                    <span class="conv-time">${conv.updatedAt}</span>
                </div>
                <div class="conversation-item-mid">
                    <span class="conv-snippet">${snippet}</span>
                </div>
                <div class="conversation-item-bottom">
                    <div style="display: flex; gap: 4px;">
                        ${sentimentBadge}
                        ${handoverTag}
                    </div>
                    ${conv.unreadCount > 0 ? `<span class="badge-urgent-count">${conv.unreadCount}</span>` : ''}
                </div>
            `;

            item.addEventListener('click', () => {
                currentConversation = conv;
                renderConversationsList();
                renderCurrentChat();
                // Đồng bộ breadcrumb
                if (deepBreadcrumbEl) {
                    deepBreadcrumbEl.innerHTML = `<span class="breadcrumb-separator">/</span> <span class="breadcrumb-target">${conv.customerName}</span>`;
                }
            });

            container.appendChild(item);
        });
    }

    function renderCurrentChat() {
        if (!currentConversation) return;

        // Cột giữa - Header
        const nameEl = document.getElementById('currentChatCustomerName');
        const phoneEl = document.getElementById('currentChatCustomerPhone');
        const sentimentBadgeEl = document.getElementById('currentChatSentimentBadge');
        const handlerBadgeEl = document.getElementById('currentChatHandlerBadge');
        const takeoverBtn = document.getElementById('btnToggleTakeover');
        const aiSummaryTextEl = document.getElementById('aiContextSummaryText');
        const composerStatusEl = document.getElementById('composerModeStatus');

        if (nameEl) nameEl.textContent = currentConversation.customerName;
        if (phoneEl) phoneEl.textContent = currentConversation.phone;

        if (sentimentBadgeEl) {
            sentimentBadgeEl.textContent = currentConversation.sentimentText;
            if (currentConversation.sentimentLevel >= 4) {
                sentimentBadgeEl.style.cssText = 'color: #DC2626; background: #FEE2E2; border-color: #FED8D8;';
            } else if (currentConversation.sentimentLevel === 3) {
                sentimentBadgeEl.style.cssText = 'color: #B45309; background: #FEF3C7; border-color: #FDEEB0;';
            } else {
                sentimentBadgeEl.style.cssText = 'color: #166534; background: #D1F9DF; border-color: #C3DEC7;';
            }
        }

        if (handlerBadgeEl) {
            handlerBadgeEl.textContent = currentConversation.isHandover ? 'Nhân viên đang xử lý' : 'Bot đang phục vụ';
            handlerBadgeEl.className = 'admin-badge ' + (currentConversation.isHandover ? 'badge-info' : 'badge-neutral');
        }

        if (takeoverBtn) {
            takeoverBtn.textContent = currentConversation.isHandover ? 'Hoàn thành và trả quyền cho Bot' : 'Tiếp nhận ca chat';
            takeoverBtn.className = 'admin-btn ' + (currentConversation.isHandover ? 'admin-btn-secondary' : 'admin-btn-primary');
        }

        if (aiSummaryTextEl) {
            aiSummaryTextEl.textContent = currentConversation.aiSummary;
        }

        if (composerStatusEl) {
            composerStatusEl.innerHTML = currentConversation.isHandover
                ? 'Chế độ: <strong>Nhân viên trực tiếp (Đang mở)</strong>'
                : 'Chế độ: <em>Bot tự động (Bấm "Tiếp nhận" để trả lời)</em>';
        }

        // Render Dòng thời gian tin nhắn
        const timelineEl = document.getElementById('chatMessagesTimeline');
        if (timelineEl) {
            timelineEl.innerHTML = '';
            currentConversation.messages.forEach(msg => {
                const wrap = document.createElement('div');
                wrap.className = `chat-bubble-wrap sender-${msg.sender}`;

                let authorText = '';
                let senderBadge = '';
                if (msg.sender === 'user') {
                    authorText = currentConversation.customerName;
                    senderBadge = '<span class="admin-badge" style="color: #1D4ED8; background: #E0EEFD; border-color: #D0E3F8; font-size: 11px; padding: 1px 6px;">Khách hàng</span>';
                } else if (msg.sender === 'bot') {
                    authorText = 'PawPal Bot';
                    senderBadge = '<span class="admin-badge badge-neutral" style="font-size: 11px; padding: 1px 6px;">AI tự động</span>';
                } else {
                    authorText = msg.agentName || 'Chuyên viên CSKH';
                    senderBadge = '<span class="admin-badge badge-active" style="font-size: 11px; padding: 1px 6px;">Nhân viên CSKH</span>';
                }

                let bubbleContent = msg.text;
                if (msg.isToxic) {
                    bubbleContent = `<span class="masked-toxic-content">${msg.maskedText || '[Nội dung đã được che mờ]'}</span>`;
                }

                wrap.innerHTML = `
                    <div class="chat-bubble-meta">
                        <span><strong>${authorText}</strong> ${senderBadge}</span>
                        <span>${msg.time}</span>
                    </div>
                    <div class="chat-bubble">
                        ${bubbleContent}
                    </div>
                `;
                timelineEl.appendChild(wrap);
            });
            timelineEl.scrollTop = timelineEl.scrollHeight;
        }

        // Cột phải: Thông tin khách hàng 360
        const custNameEl = document.getElementById('infoCustomerName');
        const custTierEl = document.getElementById('infoCustomerTier');
        const custPhoneEl = document.getElementById('infoCustomerPhone');
        const custPointsEl = document.getElementById('infoCustomerPoints');
        const petsListEl = document.getElementById('infoPetsList');
        const recentOrderEl = document.getElementById('infoRecentOrder');
        const recentBookingEl = document.getElementById('infoRecentBooking');
        const ticketsListEl = document.getElementById('infoOpenTicketsList');
        const internalNoteInput = document.getElementById('chatInternalNoteInput');

        if (custNameEl) custNameEl.textContent = currentConversation.customerName;
        if (custTierEl) custTierEl.textContent = currentConversation.tier;
        if (custPhoneEl) custPhoneEl.textContent = currentConversation.phone;
        if (custPointsEl) custPointsEl.textContent = `${currentConversation.pawpoints.toLocaleString('vi-VN')} điểm`;

        if (petsListEl) {
            petsListEl.innerHTML = '';
            currentConversation.pets.forEach(p => {
                const card = document.createElement('div');
                card.className = 'pet-mini-card';
                card.innerHTML = `
                    <span class="pet-mini-name">${p.name} (${p.breed})</span>
                    <span style="font-size: 11.5px; color: ${p.notes.includes('Dị ứng') || p.notes.includes('sợ') ? '#DC2626' : 'var(--text-muted)'};">${p.notes}</span>
                `;
                petsListEl.appendChild(card);
            });
        }

        if (recentOrderEl) {
            if (currentConversation.recentOrder) {
                recentOrderEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${currentConversation.recentOrder.id}">${currentConversation.recentOrder.id}</a> (${currentConversation.recentOrder.status})`;
            } else {
                recentOrderEl.textContent = 'Chưa có đơn hàng';
            }
        }

        if (recentBookingEl) {
            if (currentConversation.recentBooking) {
                recentBookingEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${currentConversation.recentBooking.id}">${currentConversation.recentBooking.id}</a> (${currentConversation.recentBooking.status})`;
            } else {
                recentBookingEl.textContent = 'Chưa có lịch hẹn';
            }
        }

        if (ticketsListEl) {
            ticketsListEl.innerHTML = '';
            if (currentConversation.openTickets.length > 0) {
                currentConversation.openTickets.forEach(t => {
                    const el = document.createElement('div');
                    el.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-ticket" data-id="${t.id}">${t.id}</a>: ${t.title}`;
                    ticketsListEl.appendChild(el);
                });
            } else {
                ticketsListEl.innerHTML = '<span style="color: var(--text-muted); font-size: 12.5px;">Không có khiếu nại đang mở</span>';
            }
        }

        if (internalNoteInput) {
            internalNoteInput.value = currentConversation.internalNotes || '';
        }

        attachCrossLinks();
    }

    function attachCrossLinks() {
        document.querySelectorAll('.btn-jump-order').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                sessionStorage.setItem('pawpal_admin_order_selected_id', id);
                window.location.hash = '#tab-order-list';
            });
        });

        document.querySelectorAll('.btn-jump-booking').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                sessionStorage.setItem('pawpal_admin_service_selected_id', id);
                window.location.hash = '#tab-service-bookings';
            });
        });

        document.querySelectorAll('.btn-jump-ticket').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                sessionStorage.setItem('pawpal_admin_complaint_selected_id', id);
                window.location.hash = '#tab-complaint-detail';
            });
        });
    }

    // -------------------------------------------------------------
    // 5. GẮN SỰ KIỆN TƯƠNG TÁC CHAT VÀ MODALS
    // -------------------------------------------------------------
    function setupLiveChatEvents() {
        // Tab lọc
        document.querySelectorAll('.inbox-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.inbox-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilterTab = btn.getAttribute('data-filter');
                renderConversationsList();
            });
        });

        // Tìm kiếm
        document.getElementById('inboxSearchInput')?.addEventListener('input', () => {
            renderConversationsList();
        });

        // Tiếp nhận ca chat (Takeover / Handover)
        document.getElementById('btnToggleTakeover')?.addEventListener('click', () => {
            if (!currentConversation) return;
            currentConversation.isHandover = !currentConversation.isHandover;
            if (currentConversation.isHandover) {
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                currentConversation.messages.push({
                    sender: 'agent',
                    agentName: 'Lê Lệ Quyên (CSKH)',
                    time: timeStr,
                    text: 'Dạ PawPal xin chào sen, em là chuyên viên CSKH đã tiếp nhận cuộc trò chuyện để trực tiếp hỗ trợ giải quyết sự cố cho mình ngay ạ!'
                });
            }
            renderConversationsList();
            renderCurrentChat();
        });

        // Gửi tin nhắn
        const sendMsgBtn = document.getElementById('btnSendLiveMessage');
        const msgInput = document.getElementById('chatMessageInput');

        function sendLiveMsg() {
            if (!currentConversation) return;
            const text = msgInput.value.trim();
            if (!text) return;

            if (!currentConversation.isHandover) {
                alert('Vui lòng bấm nút "Tiếp nhận ca chat" trước khi gửi tin nhắn cho khách hàng.');
                return;
            }

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            currentConversation.messages.push({
                sender: 'agent',
                agentName: 'Lê Lệ Quyên (CSKH)',
                time: timeStr,
                text: text
            });
            msgInput.value = '';
            renderCurrentChat();
        }

        sendMsgBtn?.addEventListener('click', sendLiveMsg);
        msgInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendLiveMsg();
            }
        });

        // Quick replies (Tin nhắn mẫu một chạm)
        document.querySelectorAll('.quick-reply-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const text = pill.getAttribute('data-reply');
                if (msgInput && text) {
                    msgInput.value = text;
                    msgInput.focus();
                }
            });
        });

        // Lưu ghi chú nội bộ ca chat
        document.getElementById('btnSaveChatInternalNote')?.addEventListener('click', () => {
            if (!currentConversation) return;
            const note = document.getElementById('chatInternalNoteInput')?.value || '';
            currentConversation.internalNotes = note;
            alert('Đã lưu ghi chú nội bộ an toàn cho ca trò chuyện này!');
        });

        // --- MODAL 1: TẶNG ĐIỂM PAWPOINT ---
        const rewardOverlay = document.getElementById('rewardPointsModalOverlay');
        const btnOpenReward = document.getElementById('btnRewardPoints');
        const btnCancelReward = document.getElementById('btnCancelRewardPoints');
        const btnDismissReward = document.getElementById('btnDismissRewardModal');
        const btnConfirmReward = document.getElementById('btnConfirmRewardPoints');
        const rewardCustName = document.getElementById('rewardCustomerName');
        const inputPoints = document.getElementById('inputCustomRewardPoints');

        btnOpenReward?.addEventListener('click', () => {
            if (!currentConversation) return;
            if (rewardCustName) rewardCustName.value = currentConversation.customerName;
            rewardOverlay.style.display = 'flex';
        });

        function closeRewardModal() {
            rewardOverlay.style.display = 'none';
        }

        btnCancelReward?.addEventListener('click', closeRewardModal);
        btnDismissReward?.addEventListener('click', closeRewardModal);

        document.querySelectorAll('.btn-preset-point').forEach(pBtn => {
            pBtn.addEventListener('click', () => {
                document.querySelectorAll('.btn-preset-point').forEach(b => b.classList.remove('active'));
                pBtn.classList.add('active');
                if (inputPoints) inputPoints.value = pBtn.getAttribute('data-point');
            });
        });

        btnConfirmReward?.addEventListener('click', () => {
            if (!currentConversation) return;
            const pts = parseInt(inputPoints.value, 10) || 50;
            currentConversation.pawpoints += pts;

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            currentConversation.messages.push({
                sender: 'agent',
                agentName: 'Hệ thống PawPal',
                time: timeStr,
                text: `[Hệ thống] Đã nạp thành công +${pts} điểm Pawpoint bồi hoàn vào ví tài khoản của sen!`
            });

            closeRewardModal();
            renderCurrentChat();
            alert(`Đã tặng thành công ${pts} điểm Pawpoint cho khách hàng ${currentConversation.customerName}!`);
        });

        // --- MODAL 2: CHUYỂN THÀNH TICKET KHIẾU NẠI ---
        const convertOverlay = document.getElementById('convertTicketModalOverlay');
        const btnOpenConvert = document.getElementById('btnConvertToTicket');
        const btnCancelConvert = document.getElementById('btnCancelConvertTicket');
        const btnDismissConvert = document.getElementById('btnDismissConvertTicket');
        const btnConfirmConvert = document.getElementById('btnConfirmConvertTicket');
        const inputConvertRefId = document.getElementById('inputConvertRefId');
        const inputConvertTitle = document.getElementById('inputConvertTicketTitle');

        btnOpenConvert?.addEventListener('click', () => {
            if (!currentConversation) return;
            if (inputConvertRefId) {
                inputConvertRefId.value = currentConversation.recentOrder ? currentConversation.recentOrder.id : (currentConversation.recentBooking ? currentConversation.recentBooking.id : '');
            }
            if (inputConvertTitle) {
                inputConvertTitle.value = currentConversation.aiSummary.slice(0, 60) + '...';
            }
            convertOverlay.style.display = 'flex';
        });

        function closeConvertModal() {
            convertOverlay.style.display = 'none';
        }

        btnCancelConvert?.addEventListener('click', closeConvertModal);
        btnDismissConvert?.addEventListener('click', closeConvertModal);

        btnConfirmConvert?.addEventListener('click', () => {
            if (!currentConversation) return;
            const title = inputConvertTitle.value.trim() || 'Khiếu nại chuyển từ kênh chat trực tuyến';
            const newTicketId = 'TK-' + Math.floor(1000 + Math.random() * 9000);

            currentConversation.openTickets.push({
                id: newTicketId,
                title: title
            });

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            currentConversation.messages.push({
                sender: 'agent',
                agentName: 'Hệ thống PawPal',
                time: timeStr,
                text: `[Hệ thống] Đã trích xuất biên bản hội thoại và tạo thành công vé hỗ trợ chính thức mang mã định danh ${newTicketId} trong phân hệ Khiếu nại.`
            });

            closeConvertModal();
            renderCurrentChat();
            alert(`Đã tạo vé khiếu nại ${newTicketId} thành công và đồng bộ sang phân hệ Khiếu nại!`);
        });
    }

    // -------------------------------------------------------------
    // 6. KHỞI TẠO VÀ ĐỌC HASH BAN ĐẦU
    // -------------------------------------------------------------
    setupCopilot();
    setupLiveChatEvents();

    const savedTab = sessionStorage.getItem('pawpal_admin_chatbot_subtab');
    const hash = window.location.hash;

    let initTab = 'tab-live-support';
    if (hash === '#tab-ai-copilot' || savedTab === 'tab-ai-copilot') {
        initTab = 'tab-ai-copilot';
    } else if (hash === '#tab-live-support' || savedTab === 'tab-live-support') {
        initTab = 'tab-live-support';
    }

    switchSubtab(initTab);
})();
