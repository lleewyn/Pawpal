/**
 * MODULE CHATBOT VÀ TRỰC CHAT CSKH (PAWPAL ADMIN)
 * Tuân thủ nghiêm ngặt 100% AGENTS.md và ADMIN_DESIGN_SYSTEM.md:
 * - 3 Subtabs Header Bar: Trợ lý AI | Trực chat CSKH | Quy định
 * - Tự động đồng bộ State và Hash (#tab-ai-copilot, #tab-live-support, #tab-chatbot-rules)
 * - Màn hình Trợ lý AI Copilot nội bộ cho Admin
 * - Màn hình Trực chat CSKH 3 khu vực: Danh sách hội thoại | Khung chat trực tiếp | Bảng thông tin khách hàng 360°
 * - Thẻ tóm tắt ngữ cảnh AI 3 giây
 * - Màng lọc bảo vệ tâm lý nhân viên (ẩn từ ngữ thô tục/tiêu cực)
 * - Thao tác một chạm: Tặng điểm Pawpoint tạ lỗi và Chuyển thành Ticket khiếu nại (liên kết sang phân hệ Khiếu nại)
 */

(function initChatbotModule() {
    console.log('Khởi tạo Module Chatbot và Trực chat CSKH...');

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
            waitingSeconds: 145, // Quá hạn SLA (> 120s)
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
            smartResponses: [
                { tag: 'Xoa dịu và Đồng cảm', text: 'Dạ PawPal thành thật xin lỗi sen và bé vì sự chậm trễ này! Em rất hiểu bé đang hết thức ăn và sen đang sốt ruột. Em xin phép ưu tiên xử lý đơn ngay cho mình ạ.' },
                { tag: 'Hành động và Bồi hoàn', text: 'Dạ em đã liên hệ điều phối viên bưu cục giao hỏa tốc đến trước 12:00 trưa nay, đồng thời PawPal xin tặng 50 điểm Pawpoint vào tài khoản của sen để tạ lỗi ạ.' },
                { tag: 'Hỗ trợ khẩn cấp tại chỗ', text: 'Dạ nếu bé đang đói gấp, cửa hàng PawPal gần nhất (Quận 1) có thể ship hỏa tốc 1 phần pate tạm thời trong 30 phút, sen có đồng ý không ạ?' }
            ],
            messages: [
                { id: 'msg-001-1', sender: 'user', time: '10:40', text: 'Shop ơi, đơn hàng hạt và pate của mình đặt 3 hôm trước sao giờ vẫn chưa thấy giao vậy?' },
                { id: 'msg-001-2', sender: 'bot', time: '10:41', text: 'Dạ PawPal xin chào sen! Em xin phép kiểm tra tiến độ đơn hàng SP-2026-003 của sen ngay nhé ạ.' },
                {
                    id: 'msg-001-3',
                    sender: 'user',
                    time: '10:43',
                    text: 'Kiểm tra nhanh giùm cái, mèo ở nhà hết đồ ăn từ tối qua rồi, giao trễ hoài bực mình quá!',
                    isToxic: true,
                    toxicWord: 'bực mình quá',
                    maskedWordsText: 'Kiểm tra nhanh giùm cái, mèo ở nhà hết đồ ăn từ tối qua rồi, giao trễ hoài ***!',
                    fullMaskedText: '[Nội dung kích động đã được màng lọc tâm lý che mờ: ***]',
                    activeMaskLevel: 'words' // 'full' | 'words' | 'raw'
                },
                { id: 'msg-001-4', sender: 'bot', time: '10:44', text: 'Dạ PawPal rất thấu hiểu sự bất tiện này và thành thật xin lỗi sen ạ! Em đang kết nối ngay với chuyên viên CSKH để hỗ trợ sen gấp ạ.' },
                {
                    id: 'msg-001-5',
                    sender: 'agent',
                    agentName: 'Hệ thống PawPal',
                    type: 'action-reward',
                    time: '10:45',
                    rewardData: {
                        points: 50,
                        customerName: 'Lê Lệ Quyên',
                        reason: 'Giao hàng trễ so với cam kết',
                        txId: 'PT-882109'
                    },
                    text: 'Đã nạp thành công +50 điểm Pawpoint bồi hoàn vào ví tài khoản của sen!'
                }
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
            waitingSeconds: 0,
            category: 'urgent',
            aiSummary: 'Khách giận dữ vì bé cún Corgi bị trầy xước sau khi tắm tỉa tại cơ sở Quận 1 và có lời lẽ kích động. Màng lọc tâm lý đã che mờ từ thô tục. Đề xuất: Mời bác sĩ thú y chi nhánh gọi điện trực tiếp thăm khám miễn phí.',
            internalNotes: 'Đã chuyển ca cho Quản lý chi nhánh Quận 1 theo dõi.',
            recentOrder: { id: 'SP-2026-001', status: 'Đã giao' },
            recentBooking: { id: 'BKG-1002', status: 'Hoàn tất' },
            openTickets: [{ id: 'TK-2026-003', title: 'Khiếu nại vết xước của cún' }],
            pets: [
                { name: 'Lu Lu', breed: 'Corgi Vàng Trắng', notes: 'Nhát nước, sợ kéo' }
            ],
            smartResponses: [
                { tag: 'Xoa dịu và Đồng cảm', text: 'Dạ em chào anh Khang, em hiểu anh đang rất lo lắng và xót xa cho bé Lu Lu. PawPal thành thật xin lỗi anh về sự cố đáng tiếc xảy ra với bé ạ!' },
                { tag: 'Bác sĩ thăm khám tức thì', text: 'Dạ em đã báo Bác sĩ thú y chi nhánh chuẩn bị thuốc sát trùng và thuốc mỡ dịu da. Bác sĩ sẽ gọi điện thoại video cho anh trong 3 phút nữa để hướng dẫn chăm sóc tức thì cho bé ạ.' },
                { tag: 'Chuyển cấp Quản lý giải quyết', text: 'Dạ em xin phép kết nối trực tiếp Quản lý chi nhánh Quận 1 đến tận nhà thăm khám và chịu toàn bộ chi phí điều trị cho bé Lu Lu ạ.' }
            ],
            messages: [
                {
                    id: 'msg-002-1',
                    sender: 'user',
                    time: '10:28',
                    text: 'Thợ làm ăn kiểu gì mà cắt rách da con tôi thế này hả lũ vô trách nhiệm?',
                    isToxic: true,
                    toxicWord: 'lũ vô trách nhiệm',
                    maskedWordsText: 'Thợ làm ăn kiểu gì mà cắt rách da con tôi thế này hả ***?',
                    fullMaskedText: '[Nội dung kích động đã được màng lọc tâm lý che mờ: ***]',
                    activeMaskLevel: 'full' // 'full' | 'words' | 'raw'
                },
                { id: 'msg-002-2', sender: 'bot', time: '10:29', text: 'Dạ PawPal vô cùng xin lỗi sen về sự cố xảy ra với bé! Em xin phép nối máy ngay với Trưởng ca chi nhánh để thăm khám và xử lý tận tình cho bé ạ.' },
                { id: 'msg-002-3', sender: 'agent', agentName: 'Nguyễn Văn A (CSKH)', time: '10:31', text: 'Dạ em chào anh Khang, em là Văn A - CSKH PawPal. Em đã tiếp nhận ca chat và đang liên hệ Bác sĩ thú y trực tại chi nhánh để hỗ trợ kiểm tra vết thương cho bé Lu Lu ngay lập tức ạ.' },
                {
                    id: 'msg-002-4',
                    sender: 'agent',
                    agentName: 'Hệ thống PawPal',
                    type: 'action-escalate',
                    time: '10:33',
                    escalateData: {
                        targetName: 'Trần Hoàng Nam - Quản lý Chi nhánh Quận 1',
                        reason: 'Khách hàng giận dữ, lời lẽ công kích vượt thẩm quyền nhân viên',
                        notes: 'Bé cún bị trầy xước nhẹ, cần Quản lý chi nhánh trực tiếp đến thăm khám và hỗ trợ chi phí'
                    },
                    text: 'Ca chat đã được chuyển cấp khẩn cho [Trần Hoàng Nam - Quản lý Chi nhánh Quận 1] lúc 10:33. Chuyên viên CSKH đã được ngắt kết nối an toàn.'
                }
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
            waitingSeconds: 38, // Chờ bình thường (< 60s)
            category: 'all',
            aiSummary: 'Khách hỏi thông tin đặt phòng Pet Hotel dịp lễ sắp tới và chính sách mang theo thức ăn riêng. Bot đã giải đáp theo tài liệu RAG.',
            internalNotes: 'Khách quan tâm phòng VIP cho mèo.',
            recentOrder: null,
            recentBooking: { id: 'BKG-0988', status: 'Đã hoàn tất' },
            openTickets: [],
            pets: [
                { name: 'Bơ Béo', breed: 'Mèo Ba Tư', notes: 'Ăn hạt chuyên biệt' }
            ],
            smartResponses: [
                { tag: 'Tư vấn phòng Hotel', text: 'Dạ PawPal xin chào sen! Vào dịp lễ, giá phòng Pet Hotel giữ nguyên phụ thu chỉ 15% và sen hoàn toàn có thể mang thức ăn quen thuộc của bé đến gửi nhé ạ.' },
                { tag: 'Ưu đãi đặt sớm', text: 'Dạ nếu sen đặt phòng trước ngày 15/4, PawPal xin gửi tặng bé 1 suất tắm sấy vệ sinh miễn phí trước khi đón bé về ạ!' },
                { tag: 'Hỗ trợ giữ chỗ', text: 'Dạ sen cho em xin cân nặng của bé Bơ Béo để em giữ phòng VIP có camera trực tuyến 24/7 tốt nhất cho bé nhé ạ!' }
            ],
            messages: [
                { id: 'msg-003-1', sender: 'user', time: '09:48', text: 'PawPal cho mình hỏi giá phòng Pet Hotel dịp lễ 30/4 có tăng giá không và có nhận mang thức ăn riêng không ạ?' },
                { id: 'msg-003-2', sender: 'bot', time: '09:49', text: 'Dạ PawPal xin chào sen! Vào dịp lễ, giá phòng giữ nguyên phụ thu ngày lễ chỉ 15% và PawPal hoàn toàn hoan nghênh sen mang thức ăn quen thuộc của bé đến gửi nhé ạ.' }
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
            waitingSeconds: 78, // Cảnh báo (60s - 120s)
            category: 'all',
            aiSummary: 'Khách gửi lời khen ngợi dịch vụ Spa của bé Poodle tại chi nhánh Bình Thạnh.',
            internalNotes: '',
            recentOrder: null,
            recentBooking: { id: 'BKG-0995', status: 'Đã hoàn tất' },
            openTickets: [],
            pets: [
                { name: 'Kẹo Ngọt', breed: 'Poodle Nâu Đỏ', notes: 'Thích vuốt ve' }
            ],
            smartResponses: [
                { tag: 'Cảm ơn và Tri ân', text: 'Dạ PawPal cảm ơn sen và bé Kẹo Ngọt thật nhiều ạ! Chúc sen và bé luôn tràn ngập niềm vui bên nhau nhé ạ ❤️' },
                { tag: 'Tặng điểm khách thân thiết', text: 'Dạ PawPal xin tích lũy thêm 20 điểm thưởng dịch vụ vào ví của sen cho lượt trải nghiệm vừa rồi nhé ạ!' },
                { tag: 'Hẹn lịch định kỳ', text: 'Dạ lông Poodle thường cần tỉa gọn sau 3 - 4 tuần, sen có muốn em lưu lịch nhắc hẹn tự động cho bé Kẹo không ạ?' }
            ],
            messages: [
                { id: 'msg-004-1', sender: 'user', time: '09:12', text: 'Cảm ơn PawPal nha, bé Kẹo cắt lông xong xinh xắn lắm, bạn nhân viên rất nhẹ nhàng!' },
                { id: 'msg-004-2', sender: 'bot', time: '09:13', text: 'Dạ PawPal cảm ơn sen và bé Kẹo Ngọt thật nhiều ạ! Chúc sen và bé luôn tràn ngập niềm vui bên nhau nhé ạ ❤️' }
            ]
        }
    ];

    let currentConversation = mockConversations[0];
    let currentFilterTab = 'urgent';

    // -------------------------------------------------------------
    // 1B. TIỆN ÍCH ĐẾM NGƯỢC SLA THỜI GIAN THỰC VÀ ALERT STRIP
    // -------------------------------------------------------------
    function formatSlaInfo(waitingSeconds, isHandover) {
        if (isHandover) {
            return { text: 'Đang tiếp quản', className: 'sla-done' };
        }
        const sec = waitingSeconds || 0;
        if (sec >= 120) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return { text: `Quá hạn: ${m}m ${s < 10 ? '0' : ''}${s}s`, className: 'sla-danger' };
        } else if (sec >= 60) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return { text: `Chờ ${m}m ${s < 10 ? '0' : ''}${s}s`, className: 'sla-warning' };
        } else {
            return { text: `Chờ ${sec}s`, className: 'sla-normal' };
        }
    }

    function renderChatbotAlertBar() {
        const bar = document.getElementById('chatbotAlertBar');
        const textEl = document.getElementById('alertStripText');
        if (!bar || !textEl) return;

        const criticalList = mockConversations.filter(c => !c.isHandover && (c.sentimentLevel >= 4 || (c.waitingSeconds || 0) >= 120));
        const overdueList = mockConversations.filter(c => !c.isHandover && (c.waitingSeconds || 0) >= 120);

        if (criticalList.length > 0) {
            bar.style.display = 'flex';
            textEl.textContent = `Có ${criticalList.length} ca chat khách hàng bực bội chưa tiếp nhận (${overdueList.length} ca đã quá hạn SLA) cần xử lý ngay!`;
        } else {
            bar.style.display = 'none';
        }
    }

    let slaTickerInterval = null;

    function updateSlaBadgesInDom() {
        mockConversations.forEach(c => {
            const pill = document.querySelector(`.sla-pill-${c.id}`);
            if (pill) {
                const sla = formatSlaInfo(c.waitingSeconds, c.isHandover);
                pill.textContent = sla.text;
                pill.className = `sla-timer-pill ${sla.className} sla-pill-${c.id}`;
            }
        });

        if (currentConversation) {
            const headerSla = document.getElementById('currentChatSlaBadge');
            if (headerSla) {
                const sla = formatSlaInfo(currentConversation.waitingSeconds, currentConversation.isHandover);
                headerSla.textContent = sla.text;
                headerSla.className = `sla-timer-pill ${sla.className}`;
            }
        }
    }

    function startSlaTicker() {
        if (slaTickerInterval) clearInterval(slaTickerInterval);
        slaTickerInterval = setInterval(() => {
            let changed = false;
            mockConversations.forEach(c => {
                if (!c.isHandover) {
                    c.waitingSeconds = (c.waitingSeconds || 0) + 1;
                    changed = true;
                }
            });
            if (changed) {
                updateSlaBadgesInDom();
                renderChatbotAlertBar();
            }
        }, 1000);
    }

    let currentSuggestIndex = 0;

    function renderSmartSuggestions() {
        const box = document.getElementById('aiSmartSuggestionsBox');
        if (!box) return;

        if (!currentConversation || !currentConversation.smartResponses || currentConversation.smartResponses.length === 0) {
            box.style.display = 'none';
            return;
        }

        box.style.display = 'flex';
        currentSuggestIndex = Math.min(currentSuggestIndex, currentConversation.smartResponses.length - 1);
        const item = currentConversation.smartResponses[currentSuggestIndex];

        const tagEl = document.getElementById('suggestCarouselTag');
        const textEl = document.getElementById('suggestCarouselText');

        if (tagEl) tagEl.textContent = item.tag;
        if (textEl) textEl.textContent = item.text;
    }

    function setupSuggestCarouselEvents() {
        document.getElementById('btnSuggestPrev')?.addEventListener('click', () => {
            if (!currentConversation?.smartResponses?.length) return;
            const total = currentConversation.smartResponses.length;
            currentSuggestIndex = (currentSuggestIndex - 1 + total) % total;
            renderSmartSuggestions();
        });

        document.getElementById('btnSuggestNext')?.addEventListener('click', () => {
            if (!currentConversation?.smartResponses?.length) return;
            const total = currentConversation.smartResponses.length;
            currentSuggestIndex = (currentSuggestIndex + 1) % total;
            renderSmartSuggestions();
        });

        document.getElementById('btnApplySuggest')?.addEventListener('click', () => {
            if (!currentConversation?.smartResponses?.length) return;
            const item = currentConversation.smartResponses[currentSuggestIndex];
            const input = document.getElementById('chatMessageInput');
            if (input && item) {
                input.value = item.text;
                input.focus();
            }
        });
    }


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
            <span class="subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-chatbot-rules' ? 'active' : ''}" data-tab="tab-chatbot-rules">Quy định</button>
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
            renderChatbotAlertBar();
            renderConversationsList();
            renderCurrentChat();
            startSlaTicker();
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
                    response = 'Dạ thưa Quản trị viên, theo cơ sở dữ liệu hệ thống hôm nay: Đang có tổng cộng **28 lịch hẹn** (18 lịch Spa và Grooming, 6 lịch gửi Hotel, 4 cuốc Pet Taxi). Có 2 ca đang thực hiện và 3 ca sắp tới trong khung giờ 11:00 - 13:00.';
                } else if (lower.includes('hết hàng') || lower.includes('sản phẩm')) {
                    response = 'Dạ báo cáo danh sách tồn kho dưới 5 món cần bổ sung khẩn cấp gồm có:<br>1. <strong>Pate Royal Canin Kitten 85g</strong>: còn 2 gói (Kho Quận 1).<br>2. <strong>Hạt Ganador Puppy 3kg</strong>: còn 3 bao.<br>3. <strong>Sữa tắm trị ve Joyce và Dolls 400ml</strong>: còn 4 chai.';
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
                sentimentBadge = `<span class="admin-badge badge-danger" style="font-size: 10.5px;">Cảm xúc ${conv.sentimentLevel}</span>`;
            } else if (conv.sentimentLevel === 3) {
                sentimentBadge = `<span class="admin-badge badge-warning" style="font-size: 10.5px;">Cảm xúc 3</span>`;
            } else {
                sentimentBadge = `<span class="admin-badge badge-active" style="font-size: 10.5px;">Cảm xúc ${conv.sentimentLevel}</span>`;
            }

            const handoverTag = conv.isHandover
                ? `<span class="admin-badge badge-info" style="font-size: 10.5px;">Nhân viên</span>`
                : `<span class="admin-badge badge-neutral" style="font-size: 10.5px;">Bot</span>`;

            const sla = formatSlaInfo(conv.waitingSeconds, conv.isHandover);

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
                    <div class="conv-bottom-left">
                        ${sentimentBadge}
                        ${handoverTag}
                        <span class="sla-timer-pill ${sla.className} sla-pill-${conv.id}">${sla.text}</span>
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

        // Nhãn cảm xúc rút gọn cho header 1 dòng
        if (sentimentBadgeEl) {
            const shortSentiment = (() => {
                const level = currentConversation.sentimentLevel;
                if (level >= 5) return 'Giận dữ';
                if (level === 4) return 'Bực bội';
                if (level === 3) return 'Khó chịu';
                if (level === 2) return 'Thắc mắc';
                return 'Bình thường';
            })();
            sentimentBadgeEl.textContent = shortSentiment;
            sentimentBadgeEl.style.cssText = '';
            if (currentConversation.sentimentLevel >= 4) {
                sentimentBadgeEl.className = 'admin-badge badge-danger';
            } else if (currentConversation.sentimentLevel === 3) {
                sentimentBadgeEl.className = 'admin-badge badge-warning';
            } else {
                sentimentBadgeEl.className = 'admin-badge badge-active';
            }
        }

        const headerSla = document.getElementById('currentChatSlaBadge');
        if (headerSla) {
            const sla = formatSlaInfo(currentConversation.waitingSeconds, currentConversation.isHandover);
            headerSla.textContent = sla.text;
            headerSla.className = `sla-timer-pill ${sla.className}`;
        }

        if (takeoverBtn) {
            takeoverBtn.textContent = currentConversation.isHandover ? 'Hoàn thành' : 'Tiếp nhận';
            takeoverBtn.className = 'admin-btn btn-takeover-compact ' + (currentConversation.isHandover ? 'admin-btn-secondary' : 'admin-btn-primary');
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
                // PHASE 3: HIỂN THỊ CÁC THẺ HÀNH ĐỘNG GIẢI PHÁP TRỰC QUAN (RICH ACTION CARDS)
                if (msg.type && msg.type.startsWith('action-')) {
                    const cardWrap = document.createElement('div');
                    cardWrap.className = 'chat-bubble-wrap sender-agent';

                    if (msg.type === 'action-reward') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-reward">
                                <div class="action-card-header">
                                    <span class="admin-badge badge-active">Bồi hoàn Pawpoint</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-reward-pts">+${msg.rewardData.points} Pawpoint</div>
                                    <div class="action-card-meta">
                                        <div><strong>Khách nhận:</strong> ${msg.rewardData.customerName}</div>
                                        <div><strong>Lý do:</strong> ${msg.rewardData.reason}</div>
                                        <div><strong>Mã bồi hoàn:</strong> ${msg.rewardData.txId}</div>
                                    </div>
                                    <div style="font-size: 13px;">${msg.text}</div>
                                </div>
                                <div class="action-card-footer">
                                    <button type="button" class="btn-card-action btn-jump-pawpoint">Xem ví Pawpoint</button>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-ticket') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-ticket">
                                <div class="action-card-header">
                                    <span class="admin-badge badge-attention">Biên bản Vé Ticket</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-ticket-title">${msg.ticketData.id}: ${msg.ticketData.title}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Phân loại:</strong> ${msg.ticketData.category}</div>
                                        <div><strong>Tham chiếu:</strong> ${msg.ticketData.refId || 'Đơn hàng hiện tại'}</div>
                                        <div><strong>Mức độ:</strong> ${msg.ticketData.priority}</div>
                                    </div>
                                    <div style="font-size: 13px;">${msg.text}</div>
                                </div>
                                <div class="action-card-footer">
                                    <button type="button" class="btn-card-action btn-jump-ticket" data-id="${msg.ticketData.id}">Mở vé trong Khiếu nại</button>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-escalate') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-escalate">
                                <div class="action-card-header">
                                    <span class="admin-badge badge-danger">Chuyển cấp Quản lý</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-escalate-target">Tiếp nhận: <strong>${msg.escalateData.targetName}</strong></div>
                                    <div class="action-card-meta">
                                        <div><strong>Lý do:</strong> ${msg.escalateData.reason}</div>
                                        ${msg.escalateData.notes ? `<div><strong>Ghi chú:</strong> ${msg.escalateData.notes}</div>` : ''}
                                    </div>
                                    <div style="font-size: 13px;">${msg.text}</div>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-tracking') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-tracking">
                                <div class="action-card-header">
                                    <span class="admin-badge badge-progress">Vận đơn Hỏa tốc</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div style="font-weight: 700; color: #20495E;">${msg.trackingData.orderId} • ${msg.trackingData.carrier}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Bưu tá:</strong> ${msg.trackingData.shipperName} (${msg.trackingData.shipperPhone})</div>
                                        <div><strong>Trạng thái:</strong> ${msg.trackingData.status}</div>
                                        <div><strong>Vị trí:</strong> ${msg.trackingData.location}</div>
                                    </div>
                                    <div style="font-size: 13px;">${msg.text}</div>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-camera') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-camera">
                                <div class="action-card-header">
                                    <span class="admin-badge badge-active">Snapshot Camera Phòng</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div style="font-weight: 700; color: #236B48;">${msg.cameraData.roomName} • ${msg.cameraData.petName}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Tình trạng:</strong> ${msg.cameraData.caption}</div>
                                        <div><strong>Nhiệt độ:</strong> ${msg.cameraData.temp} | <strong>Độ ẩm:</strong> ${msg.cameraData.humidity}</div>
                                    </div>
                                    <div style="font-size: 13px;">${msg.text}</div>
                                </div>
                            </div>
                        `;
                    }

                    timelineEl.appendChild(cardWrap);
                    return;
                }

                if (msg.sender === 'system') {
                    const marker = document.createElement('div');
                    marker.className = 'chat-system-marker';
                    marker.innerHTML = `<span class="chat-system-marker-text">${msg.text}</span>`;
                    timelineEl.appendChild(marker);
                    return;
                }

                const wrap = document.createElement('div');
                wrap.className = `chat-bubble-wrap sender-${msg.sender}`;

                let authorText = '';
                let senderBadge = '';
                if (msg.sender === 'user') {
                    authorText = currentConversation.customerName;
                    senderBadge = '<span class="admin-badge badge-info" style="font-size: 11px; padding: 1px 6px;">Khách hàng</span>';
                } else if (msg.sender === 'bot') {
                    authorText = 'PawPal Bot';
                    senderBadge = '<span class="admin-badge badge-neutral" style="font-size: 11px; padding: 1px 6px;">AI tự động</span>';
                } else {
                    authorText = msg.agentName || 'Chuyên viên CSKH';
                    senderBadge = '<span class="admin-badge badge-active" style="font-size: 11px; padding: 1px 6px;">Nhân viên CSKH</span>';
                }

                let bubbleContent = '';
                if (msg.isToxic) {
                    const level = msg.activeMaskLevel || 'full';
                    let contentHtml = '';
                    if (level === 'full') {
                        contentHtml = `<span class="toxic-text-full">${msg.fullMaskedText || '[Nội dung kích động đã được màng lọc tâm lý che mờ: ***]'}</span>`;
                    } else if (level === 'words') {
                        const highlighted = (msg.maskedWordsText || msg.text).replace(/\*\*\*/g, '<span class="toxic-asterisk-badge">***</span>');
                        contentHtml = `<span class="toxic-text-words">${highlighted}</span>`;
                    } else {
                        contentHtml = `<span class="toxic-text-raw">${msg.text}</span>`;
                    }

                    const levelLabel = level === 'full' ? 'Che toàn bộ' : level === 'words' ? 'Che từ nhạy cảm' : 'Hiện gốc';
                    bubbleContent = `<div class="chat-toxic-container" data-msg-id="${msg.id || ''}">${contentHtml}</div>`;

                    wrap.innerHTML = `
                        <div class="chat-bubble-meta">
                            <span><strong>${authorText}</strong> ${senderBadge}</span>
                            <span>${msg.time}</span>
                        </div>
                        <div class="chat-bubble-toxic-row">
                            <div class="chat-bubble">${bubbleContent}</div>
                            <div class="toxic-dots-wrap" data-msg-id="${msg.id || ''}">
                                <button type="button" class="btn-toxic-dots" title="Màng lọc: ${levelLabel}">•••</button>
                                <div class="toxic-dots-dropdown">
                                    <button type="button" class="toxic-dots-item ${level === 'full' ? 'active' : ''}" data-level="full">Che toàn bộ</button>
                                    <button type="button" class="toxic-dots-item ${level === 'words' ? 'active' : ''}" data-level="words">Che từ nhạy cảm</button>
                                    <button type="button" class="toxic-dots-item ${level === 'raw' ? 'active' : ''}" data-level="raw">Hiện gốc</button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    bubbleContent = msg.text;
                    wrap.innerHTML = `
                        <div class="chat-bubble-meta">
                            <span><strong>${authorText}</strong> ${senderBadge}</span>
                            <span>${msg.time}</span>
                        </div>
                        <div class="chat-bubble">${bubbleContent}</div>
                    `;
                }
                timelineEl.appendChild(wrap);
            });

            // Nút ••• màng lọc tâm lý: toggle dropdown
            timelineEl.querySelectorAll('.toxic-dots-wrap').forEach(wrap => {
                const dotsBtn = wrap.querySelector('.btn-toxic-dots');
                const dropdown = wrap.querySelector('.toxic-dots-dropdown');

                dotsBtn?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Đóng tất cả dropdown khác
                    timelineEl.querySelectorAll('.toxic-dots-wrap.open').forEach(w => {
                        if (w !== wrap) w.classList.remove('open');
                    });
                    wrap.classList.toggle('open');
                });

                dropdown?.querySelectorAll('.toxic-dots-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const targetLevel = item.getAttribute('data-level');
                        const msgId = wrap.getAttribute('data-msg-id');
                        const targetMsg = currentConversation.messages.find(m => m.id === msgId);
                        if (targetMsg) {
                            targetMsg.activeMaskLevel = targetLevel;
                            renderCurrentChat();
                        }
                    });
                });
            });

            // Đóng tất cả toxic dropdown khi bấm ra ngoài
            document.addEventListener('click', () => {
                timelineEl.querySelectorAll('.toxic-dots-wrap.open').forEach(w => w.classList.remove('open'));
            }, { once: false, capture: false });

            timelineEl.scrollTop = timelineEl.scrollHeight;
        }

        // Render Gợi ý phản hồi thông minh AI Copilot
        renderSmartSuggestions();

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

        document.querySelectorAll('.btn-jump-pawpoint').forEach(btn => {
            btn.addEventListener('click', () => {
                sessionStorage.setItem('pawpal_admin_customer_selected_tab', 'pawpoint');
                window.location.hash = '#tab-customers';
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

        // NÚT 3 CHẤM: Toggle dropdown tác vụ
        const dotsWrap = document.getElementById('chatActionsMenuWrap');
        const dotsBtn = document.getElementById('btnChatActionsDots');
        if (dotsBtn && dotsWrap) {
            dotsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dotsWrap.classList.toggle('open');
            });
            // Đóng dropdown khi bấm ra ngoài
            document.addEventListener('click', (e) => {
                if (!dotsWrap.contains(e.target)) {
                    dotsWrap.classList.remove('open');
                }
            });
            // Đóng dropdown sau khi chọn mục
            dotsWrap.querySelectorAll('.chat-action-item').forEach(item => {
                item.addEventListener('click', () => {
                    dotsWrap.classList.remove('open');
                });
            });
        }

        // Nút lọc ca khẩn cấp trên Alert Strip
        document.getElementById('btnFilterUrgentChat')?.addEventListener('click', () => {
            currentFilterTab = 'urgent';
            document.querySelectorAll('.inbox-tab-btn').forEach(b => {
                if (b.getAttribute('data-filter') === 'urgent') b.classList.add('active');
                else b.classList.remove('active');
            });

            const critical = mockConversations.find(c => !c.isHandover && (c.sentimentLevel >= 4 || (c.waitingSeconds || 0) >= 120))
                || mockConversations.find(c => c.category === 'urgent')
                || mockConversations[0];

            if (critical) {
                currentConversation = critical;
            }

            renderConversationsList();
            renderCurrentChat();
        });

        // Tiếp nhận ca chat (Takeover / Handover)
        document.getElementById('btnToggleTakeover')?.addEventListener('click', () => {
            if (!currentConversation) return;
            currentConversation.isHandover = !currentConversation.isHandover;
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (currentConversation.isHandover) {
                currentConversation.messages.push({
                    sender: 'system',
                    time: timeStr,
                    text: `Hệ thống: PawPal Bot đã tạm dừng. Chuyên viên Lê Lệ Quyên (CSKH) đã tiếp quản ca chat lúc ${timeStr}`
                });
                currentConversation.messages.push({
                    sender: 'agent',
                    agentName: 'Lê Lệ Quyên (CSKH)',
                    time: timeStr,
                    text: 'Dạ PawPal xin chào sen! Em là Lê Lệ Quyên - Chuyên viên CSKH đã tiếp nhận ca chat để hỗ trợ trực tiếp cho sen ngay đây ạ!'
                });
                currentConversation.waitingSeconds = 0;
            } else {
                currentConversation.messages.push({
                    sender: 'system',
                    time: timeStr,
                    text: `Hệ thống: Ca chat đã được hỗ trợ trực tiếp xong. Quyền điều phối tự động được hoàn trả cho PawPal Bot lúc ${timeStr}`
                });
            }

            renderChatbotAlertBar();
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
            const selectReason = document.getElementById('selectRewardReason');
            const reasonText = selectReason ? selectReason.options[selectReason.selectedIndex].text : 'Tạ lỗi vì sự cố dịch vụ';
            const txCode = 'PT-' + Math.floor(100000 + Math.random() * 900000);

            currentConversation.pawpoints += pts;

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            currentConversation.messages.push({
                id: 'msg-reward-' + Date.now(),
                sender: 'agent',
                agentName: 'Hệ thống PawPal',
                type: 'action-reward',
                time: timeStr,
                rewardData: {
                    points: pts,
                    customerName: currentConversation.customerName,
                    reason: reasonText,
                    txId: txCode
                },
                text: `Đã nạp thành công +${pts} điểm Pawpoint bồi hoàn vào ví tài khoản của sen!`
            });

            closeRewardModal();
            renderCurrentChat();
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
            const selectCat = document.getElementById('selectConvertTicketCategory');
            const catText = selectCat ? selectCat.options[selectCat.selectedIndex].text : 'Khiếu nại Đơn hàng';
            const selectPri = document.getElementById('selectConvertPriority');
            const priText = selectPri ? selectPri.options[selectPri.selectedIndex].text : 'Mức độ Trung bình';
            const refId = inputConvertRefId.value.trim();

            currentConversation.openTickets.push({
                id: newTicketId,
                title: title
            });

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            currentConversation.messages.push({
                id: 'msg-ticket-' + Date.now(),
                sender: 'agent',
                agentName: 'Hệ thống PawPal',
                type: 'action-ticket',
                time: timeStr,
                ticketData: {
                    id: newTicketId,
                    title: title,
                    category: catText,
                    priority: priText,
                    refId: refId || (currentConversation.recentOrder ? currentConversation.recentOrder.id : '')
                },
                text: `Đã trích xuất biên bản hội thoại và tạo thành công vé hỗ trợ chính thức mang mã định danh ${newTicketId} trong phân hệ Khiếu nại.`
            });

            closeConvertModal();
            renderCurrentChat();
        });

        // --- MODAL 3: CHUYỂN CẤP QUẢN LÝ VÀ BÁC SĨ (BẢO VỆ NHÂN VIÊN) ---
        const escalateModal = document.getElementById('escalateManagerModalOverlay');
        const btnOpenEscalate = document.getElementById('btnEscalateManager');
        const btnCancelEscalate = document.getElementById('btnCancelEscalate');
        const btnDismissEscalate = document.getElementById('btnDismissEscalateModal');
        const btnConfirmEscalate = document.getElementById('btnConfirmEscalate');
        const escalateCustName = document.getElementById('escalateCustomerName');
        const inputEscalateNotes = document.getElementById('inputEscalateNotes');

        btnOpenEscalate?.addEventListener('click', () => {
            if (!currentConversation) return;
            if (escalateCustName) escalateCustName.value = currentConversation.customerName;
            if (inputEscalateNotes) inputEscalateNotes.value = '';
            escalateModal.style.display = 'flex';
        });

        function closeEscalateModal() {
            escalateModal.style.display = 'none';
        }

        btnCancelEscalate?.addEventListener('click', closeEscalateModal);
        btnDismissEscalate?.addEventListener('click', closeEscalateModal);

        btnConfirmEscalate?.addEventListener('click', () => {
            if (!currentConversation) return;
            const targetSelect = document.getElementById('selectEscalateTarget');
            const targetName = targetSelect ? targetSelect.options[targetSelect.selectedIndex].text : 'Quản lý Chi nhánh';
            const reasonSelect = document.getElementById('selectEscalateReason');
            const reasonText = reasonSelect ? reasonSelect.options[reasonSelect.selectedIndex].text : 'Khách hàng bức xúc vượt thẩm quyền';
            const notesText = inputEscalateNotes ? inputEscalateNotes.value.trim() : '';
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            currentConversation.isHandover = true;
            currentConversation.isEscalated = true;
            currentConversation.category = 'urgent';

            // Dấu mốc hệ thống dạng thẻ Rich Action Card
            currentConversation.messages.push({
                id: 'msg-escalate-' + Date.now(),
                sender: 'agent',
                agentName: 'Hệ thống PawPal',
                type: 'action-escalate',
                time: timeStr,
                escalateData: {
                    targetName: targetName,
                    reason: reasonText,
                    notes: notesText
                },
                text: `Ca chat đã được chuyển cấp khẩn cho [${targetName}] lúc ${timeStr}. Chuyên viên CSKH đã được ngắt kết nối an toàn.`
            });

            // Lời chào nhận trách nhiệm từ Quản lý / Bác sĩ
            currentConversation.messages.push({
                sender: 'agent',
                agentName: targetName,
                time: timeStr,
                text: `Dạ PawPal xin chào sen! Em là ${targetName}. Em đã tiếp nhận trực tiếp ca hỗ trợ này để giải quyết dứt điểm sự cố cho gia đình mình ngay ạ!`
            });

            closeEscalateModal();
            renderChatbotAlertBar();
            renderConversationsList();
            renderCurrentChat();
        });
    }

    // -------------------------------------------------------------
    // PHASE 3: THƯ VIỆN CÂU MẪU CSKH CHUẨN MỰC
    // -------------------------------------------------------------
    const cannedResponsesDatabase = [
        // 1. Chào hỏi và Tiếp nhận
        {
            id: 'cr-01',
            category: 'greeting',
            categoryName: 'Chào hỏi và Tiếp nhận',
            title: 'Lời chào tiếp nhận ca hỗ trợ',
            content: 'Dạ PawPal xin chào sen, em là chuyên viên CSKH đã tiếp nhận ca chat này để trực tiếp hỗ trợ mình ngay ạ!'
        },
        {
            id: 'cr-02',
            category: 'greeting',
            categoryName: 'Chào hỏi và Tiếp nhận',
            title: 'Xin phép kiểm tra hệ thống trong 1-2 phút',
            content: 'Dạ sen vui lòng đợi em trong 1-2 phút, em đang tiến hành tra cứu dữ liệu trên hệ thống và sẽ phản hồi mình ngay ạ.'
        },
        {
            id: 'cr-03',
            category: 'greeting',
            categoryName: 'Chào hỏi và Tiếp nhận',
            title: 'Xác nhận thông tin bé và đơn hàng',
            content: 'Dạ để hỗ trợ chính xác nhất, sen cho em xin mã đơn hàng hoặc số điện thoại đăng ký tài khoản của bé nhé ạ.'
        },
        // 2. Vận chuyển và Giao hàng
        {
            id: 'cr-04',
            category: 'shipping',
            categoryName: 'Vận chuyển và Giao hàng',
            title: 'Xin lỗi vì giao hàng chậm trễ',
            content: 'Dạ PawPal thành thật xin lỗi sen và bé vì sự chậm trễ này! Do ảnh hưởng thời tiết và lượng đơn cao điểm, bưu tá đang ưu tiên phát hỏa tốc đơn của mình trong hôm nay ạ.'
        },
        {
            id: 'cr-05',
            category: 'shipping',
            categoryName: 'Vận chuyển và Giao hàng',
            title: 'Thông báo điều phối shipper hỏa tốc',
            content: 'Dạ em đã liên hệ điều phối bưu cục, tài xế giao hỏa tốc đang trên đường vận chuyển và sẽ liên hệ giao tận tay cho sen trước 12:00 ạ.'
        },
        {
            id: 'cr-06',
            category: 'shipping',
            categoryName: 'Vận chuyển và Giao hàng',
            title: 'Hướng dẫn đồng kiểm hàng khi nhận',
            content: 'Dạ khi nhận hàng từ bưu tá, sen hoàn toàn có thể kiểm tra quy cách đóng gói và hạn sử dụng của thức ăn trước khi ký nhận nhé ạ.'
        },
        // 3. Dịch vụ Spa và Khách sạn
        {
            id: 'cr-07',
            category: 'service',
            categoryName: 'Spa và Khách sạn',
            title: 'Cập nhật tình hình bé tại spa',
            content: 'Dạ em xin cập nhật là bé boss đang hoàn tất khâu sấy lông và vệ sinh tai móng, bé rất ngoan và hợp tác với kỹ thuật viên ạ!'
        },
        {
            id: 'cr-08',
            category: 'service',
            categoryName: 'Spa và Khách sạn',
            title: 'Thông báo giờ đón bé cưng',
            content: 'Dạ liệu trình spa của bé đã hoàn thành thơm tho xinh đẹp rồi ạ! Sen có thể ghé chi nhánh đón bé về từ bây giờ nhé ạ.'
        },
        {
            id: 'cr-09',
            category: 'service',
            categoryName: 'Spa và Khách sạn',
            title: 'Hướng dẫn chăm sóc sau dịch vụ',
            content: 'Dạ sau khi tắm tỉa, sen lưu ý giữ ấm cho bé và tránh để bé gãi mạnh vào vùng tai móng trong 24 giờ đầu nhé ạ.'
        },
        // 4. Bồi hoàn và Tạ lỗi
        {
            id: 'cr-10',
            category: 'reward',
            categoryName: 'Bồi hoàn và Tạ lỗi',
            title: 'Tặng điểm Pawpoint tạ lỗi vào ví',
            content: 'Dạ để tạ lỗi vì sự cố không mong muốn vừa rồi, PawPal xin phép gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.'
        },
        {
            id: 'cr-11',
            category: 'reward',
            categoryName: 'Bồi hoàn và Tạ lỗi',
            title: 'Tặng mã giảm giá PAWPAL50K bồi thường',
            content: 'Dạ PawPal xin gửi tặng sen mã giảm giá PAWPAL50K (trừ trực tiếp 50.000đ áp dụng cho mọi đơn hàng tiếp theo) như lời cáo lỗi chân thành từ cửa hàng ạ.'
        },
        {
            id: 'cr-12',
            category: 'reward',
            categoryName: 'Bồi hoàn và Tạ lỗi',
            title: 'Cam kết hoàn tiền trong 24 giờ',
            content: 'Dạ bộ phận kế toán đã tiếp nhận yêu cầu hoàn tiền cho đơn hàng của sen, số tiền sẽ được chuyển hoàn về ví MoMo / tài khoản ngân hàng trong vòng 24 giờ làm việc ạ.'
        },
        // 5. Khiếu nại và Đối soát
        {
            id: 'cr-13',
            category: 'dispute',
            categoryName: 'Khiếu nại và Đối soát',
            title: 'Yêu cầu gửi ảnh chụp chứng từ sự cố',
            content: 'Dạ để bộ phận kỹ thuật và bảo hành tiến hành đối soát ngay, sen vui lòng chụp giúp em hình ảnh sản phẩm bị lỗi hoặc hóa đơn gửi qua khung chat này nhé ạ.'
        },
        {
            id: 'cr-14',
            category: 'dispute',
            categoryName: 'Khiếu nại và Đối soát',
            title: 'Tạo vé hỗ trợ chuyển cấp đối soát',
            content: 'Dạ em đã lập vé hỗ trợ chính thức và chuyển thông tin đến Trưởng bộ phận phụ trách. Chúng em sẽ có văn bản phản hồi giải quyết thấu đáo cho sen trước 17:00 hôm nay ạ.'
        },
        {
            id: 'cr-15',
            category: 'dispute',
            categoryName: 'Khiếu nại và Đối soát',
            title: 'Hẹn gọi thoại tư vấn trực tiếp',
            content: 'Dạ nếu thuận tiện, em xin phép nhờ Quản lý chi nhánh gọi điện thoại trực tiếp để giải thích chi tiết và lắng nghe ý kiến đóng góp của sen nhé ạ.'
        }
    ];

    function setupCannedResponsesModal() {
        const modalOverlay = document.getElementById('cannedResponsesModalOverlay');
        const btnOpen = document.getElementById('btnOpenCannedModal');
        const btnDismiss = document.getElementById('btnDismissCannedModal');
        const btnCloseBottom = document.getElementById('btnCloseCannedModalBottom');
        const searchInput = document.getElementById('inputSearchCanned');
        const categorySelect = document.getElementById('selectCannedCategory');
        const listContainer = document.getElementById('cannedResponsesList');
        const chatInput = document.getElementById('chatMessageInput');

        function closeModal() {
            if (modalOverlay) modalOverlay.style.display = 'none';
        }

        btnOpen?.addEventListener('click', () => {
            if (modalOverlay) modalOverlay.style.display = 'flex';
            if (searchInput) searchInput.value = '';
            if (categorySelect) categorySelect.value = 'all';
            renderList();
        });

        btnDismiss?.addEventListener('click', closeModal);
        btnCloseBottom?.addEventListener('click', closeModal);

        categorySelect?.addEventListener('change', () => {
            renderList();
        });

        searchInput?.addEventListener('input', () => {
            renderList();
        });

        function renderList() {
            if (!listContainer) return;
            const query = (searchInput?.value || '').toLowerCase().trim();
            const activeCat = categorySelect ? categorySelect.value : 'all';

            const filtered = cannedResponsesDatabase.filter(item => {
                const matchCat = activeCat === 'all' || item.category === activeCat;
                const matchQuery = !query || item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query);
                return matchCat && matchQuery;
            });

            if (filtered.length === 0) {
                listContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 13px;">Không tìm thấy câu mẫu phù hợp với từ khóa này.</div>';
                return;
            }

            listContainer.innerHTML = '';
            filtered.forEach(item => {
                const card = document.createElement('div');
                card.className = 'canned-item-card';
                card.innerHTML = `
                    <div class="canned-item-header">
                        <span class="canned-item-title">${item.title}</span>
                        <span class="admin-badge badge-neutral" style="font-size: 11px;">${item.categoryName}</span>
                    </div>
                    <div class="canned-item-content">${item.content}</div>
                    <div class="canned-item-actions">
                        <button type="button" class="canned-btn-insert">Chèn vào ô chat</button>
                        <button type="button" class="canned-btn-send">Gửi ngay</button>
                    </div>
                `;

                const btnInsert = card.querySelector('.canned-btn-insert');
                const btnSend = card.querySelector('.canned-btn-send');

                btnInsert?.addEventListener('click', () => {
                    if (chatInput) {
                        chatInput.value = item.content;
                        chatInput.focus();
                    }
                    closeModal();
                });

                btnSend?.addEventListener('click', () => {
                    if (!currentConversation) return;
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    currentConversation.messages.push({
                        id: 'msg-agent-' + Date.now(),
                        sender: 'agent',
                        agentName: 'Lê Lệ Quyên (CSKH)',
                        time: timeStr,
                        text: item.content
                    });
                    closeModal();
                    renderCurrentChat();
                });

                listContainer.appendChild(card);
            });
        }
    }

    // -------------------------------------------------------------
    // PHASE 3: THAO TÁC THÔNG MINH THEO NGỮ CẢNH AI (SMART CONTEXT)
    // -------------------------------------------------------------
    function setupSmartContextActions() {
        const btnTrack = document.getElementById('btnContextTrackOrder');
        const btnCamera = document.getElementById('btnContextPetCamera');

        // Modal Tra cứu vận đơn
        const trackingOverlay = document.getElementById('orderTrackingModalOverlay');
        const btnDismissTracking = document.getElementById('btnDismissTrackingModal');
        const btnCancelTracking = document.getElementById('btnCancelTrackingModal');
        const btnSendTracking = document.getElementById('btnSendTrackingCardToChat');
        const trackingOrderCode = document.getElementById('trackingModalOrderCode');

        btnTrack?.addEventListener('click', () => {
            if (!currentConversation) return;
            if (trackingOrderCode) {
                trackingOrderCode.textContent = currentConversation.recentOrder ? currentConversation.recentOrder.id : 'SP-2026-003';
            }
            if (trackingOverlay) trackingOverlay.style.display = 'flex';
        });

        function closeTrackingModal() {
            if (trackingOverlay) trackingOverlay.style.display = 'none';
        }

        btnDismissTracking?.addEventListener('click', closeTrackingModal);
        btnCancelTracking?.addEventListener('click', closeTrackingModal);

        btnSendTracking?.addEventListener('click', () => {
            if (!currentConversation) return;
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const orderId = currentConversation.recentOrder ? currentConversation.recentOrder.id : 'SP-2026-003';

            currentConversation.messages.push({
                id: 'msg-tracking-' + Date.now(),
                sender: 'agent',
                agentName: 'Hệ thống Vận Chuyển',
                type: 'action-tracking',
                time: timeStr,
                trackingData: {
                    orderId: orderId,
                    carrier: 'PawPal Express Hỏa Tốc',
                    shipperName: 'Nguyễn Văn Hùng',
                    shipperPhone: '0938.888.999',
                    status: 'Đang giao hàng',
                    location: 'Cách nhà khách 1.2 km (Tuyến Hai Bà Trưng, dự kiến đến trước 12:00)'
                },
                text: `Đã chia sẻ thông tin vị trí tài xế giao hỏa tốc đơn hàng ${orderId} vào cuộc trò chuyện.`
            });

            closeTrackingModal();
            renderCurrentChat();
        });

        // Modal Camera an ninh phòng thú cưng
        const cameraOverlay = document.getElementById('petCameraModalOverlay');
        const btnDismissCamera = document.getElementById('btnDismissCameraModal');
        const btnCancelCamera = document.getElementById('btnCancelCameraModal');
        const btnSendCamera = document.getElementById('btnSendCameraSnapshotToChat');
        const cameraTimeEl = document.getElementById('cameraCurrentTime');

        btnCamera?.addEventListener('click', () => {
            if (!currentConversation) return;
            if (cameraTimeEl) {
                cameraTimeEl.textContent = new Date().toLocaleTimeString();
            }
            if (cameraOverlay) cameraOverlay.style.display = 'flex';
        });

        function closeCameraModal() {
            if (cameraOverlay) cameraOverlay.style.display = 'none';
        }

        btnDismissCamera?.addEventListener('click', closeCameraModal);
        btnCancelCamera?.addEventListener('click', closeCameraModal);

        btnSendCamera?.addEventListener('click', () => {
            if (!currentConversation) return;
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const petName = currentConversation.pets.length > 0 ? currentConversation.pets[0].name : 'Boss cưng';

            currentConversation.messages.push({
                id: 'msg-camera-' + Date.now(),
                sender: 'agent',
                agentName: 'Hệ thống Camera An Ninh',
                type: 'action-camera',
                time: timeStr,
                cameraData: {
                    roomName: 'Chi nhánh Quận 1 • Phòng VIP 102',
                    petName: petName,
                    caption: 'Bé đang thư giãn ngủ trưa ngoan ngoãn trên thảm đệm ấm',
                    temp: '24.5°C',
                    humidity: '55%'
                },
                text: `Đã gửi ảnh chụp camera giám sát phòng bé ${petName} vào cuộc trò chuyện.`
            });

            closeCameraModal();
            renderCurrentChat();
        });
    }

    // -------------------------------------------------------------
    // 6. KHỞI TẠO VÀ ĐỌC HASH BAN ĐẦU
    // -------------------------------------------------------------
    setupCopilot();
    setupLiveChatEvents();
    setupSuggestCarouselEvents();
    setupCannedResponsesModal();
    setupSmartContextActions();

    const savedTab = sessionStorage.getItem('pawpal_admin_chatbot_subtab');
    const hash = window.location.hash;

    let initTab = 'tab-live-support';
    if (hash === '#tab-chatbot-rules' || savedTab === 'tab-chatbot-rules') {
        initTab = 'tab-chatbot-rules';
    } else if (hash === '#tab-ai-copilot' || savedTab === 'tab-ai-copilot') {
        initTab = 'tab-ai-copilot';
    } else if (hash === '#tab-live-support' || savedTab === 'tab-live-support') {
        initTab = 'tab-live-support';
    }

    switchSubtab(initTab);
})();

