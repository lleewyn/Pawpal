
function initFab() {
    if (window.__pawpalFabInitialized) return;

    const bookingBtn = document.getElementById('fabBookingBtn');
    if (bookingBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                bookingBtn.classList.add('visible');
            } else {
                bookingBtn.classList.remove('visible');
            }
        }, { passive: true });
    }

    const aiBtn       = document.getElementById('fabAiBtn');
    const chatPanel   = document.getElementById('fabChatPanel');
    const closeBtn    = document.getElementById('fabChatClose');
    const expandBtn   = document.getElementById('fabChatExpand');
    const handoverBtn = document.getElementById('fabHandoverBtn');
    const newBtn      = document.getElementById('fabChatNewBtn');
    const historyBtn  = document.getElementById('fabChatHistoryBtn');
    const historyBackBtn = document.getElementById('fabHistoryBackBtn');
    const historyNewBtn  = document.getElementById('fabHistoryNewBtn');
    const historyView = document.getElementById('fabChatHistoryView');
    const mainView    = document.getElementById('fabChatMainView');
    const historyList = document.getElementById('fabHistoryList');
    const chatTitleText = document.getElementById('fabChatTitleText');
    const chatStatus  = document.getElementById('fabChatStatus');
    const input       = document.getElementById('fabChatInput');
    const sendBtn     = document.getElementById('fabChatSend');
    const messages    = document.getElementById('fabChatMessages');

    if (!aiBtn || !chatPanel) return;

    aiBtn.addEventListener('click', () => {
        chatPanel.classList.toggle('open');
        if (chatPanel.classList.contains('open') && input) {
            setTimeout(() => input.focus(), 300);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => chatPanel.classList.remove('open'));
    }

    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            chatPanel.classList.toggle('expanded');
            const isExp = chatPanel.classList.contains('expanded');
            expandBtn.setAttribute('title', isExp ? 'Thu nhỏ lại' : 'Mở rộng khung chat');
            expandBtn.innerHTML = isExp 
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
        });
    }

    if (messages) {
        messages.addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }

    // -------------------------------------------------------------
    // GIAI ĐOẠN 1: QUẢN LÝ PHIÊN (SESSION PERSISTENCE 24H & AUTO-LINKING)
    // -------------------------------------------------------------
    let currentUserId = 'guest';
    let currentUserName = 'Khách vãng lai';
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (currentUser && (currentUser.id || currentUser._supabaseId)) {
            currentUserId = currentUser._supabaseId || currentUser.id;
            currentUserName = currentUser.full_name || currentUser.name || currentUser.email?.split('@')[0] || 'Khách hàng';
        }
    } catch(e) {}

    // Quản lý Guest Session Token với TTL 24 giờ
    const GUEST_TOKEN_KEY = 'pawpal_fab_guest_token';
    const GUEST_TS_KEY = 'pawpal_fab_guest_token_ts';
    const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

    let currentSessionToken = localStorage.getItem(GUEST_TOKEN_KEY);
    const guestTs = parseInt(localStorage.getItem(GUEST_TS_KEY) || '0', 10);
    const now = Date.now();

    if (!currentSessionToken || !guestTs || (now - guestTs > SESSION_TTL_MS)) {
        currentSessionToken = 'st_' + Math.random().toString(36).substring(2, 12);
        localStorage.setItem(GUEST_TOKEN_KEY, currentSessionToken);
        localStorage.setItem(GUEST_TS_KEY, String(now));
    }

    // ID phiên chat đang mở
    let activeConversationId = localStorage.getItem('pawpal_fab_conv_id') || null;

    // Khóa lưu lịch sử hội thoại
    const CHAT_HISTORY_KEY = currentUserId !== 'guest' 
        ? `pawpal_chat_history_${currentUserId}` 
        : `pawpal_chat_history_guest_${currentSessionToken}`;

    let conversationHistory = [];
    try {
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
            conversationHistory = JSON.parse(savedHistory);
        }
    } catch(e) {}

    function saveChatHistory() {
        if (conversationHistory.length > 60) {
            conversationHistory = conversationHistory.slice(-60); 
        }
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversationHistory));
    }

    // Tự động liên kết tài khoản khi khách vãng lai vừa đăng nhập (Auto-linking)
    async function tryLinkGuestConversationToUser() {
        if (currentUserId === 'guest' || !activeConversationId) return;
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;
        try {
            await db.from('chat_conversation')
                .update({ 
                    customer_id: currentUserId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', activeConversationId)
                .is('customer_id', null);
            console.log('[FAB] Đã đồng bộ liên kết phiên chat cũ với tài khoản:', currentUserId);
        } catch(e) {
            console.warn('[FAB] Không thể liên kết phiên chat:', e.message);
        }
    }
    tryLinkGuestConversationToUser();

    // -------------------------------------------------------------
    // GIAI ĐOẠN 2: CHUYỂN GIAO CHUYÊN VIÊN 1 CHẠM & TRẠNG THÁI REALTIME
    // -------------------------------------------------------------
    let currentConversationStatus = 'bot_handling'; // 'bot_handling' | 'waiting_agent' | 'agent_handling'
    let currentStaffName = '';

    function updateHeaderMode(status, staffName = '') {
        currentConversationStatus = status;
        if (staffName) currentStaffName = staffName;

        if (!chatTitleText || !chatStatus) return;

        if (status === 'waiting_agent') {
            chatTitleText.textContent = 'PawPal CSKH';
            chatStatus.textContent = 'Đang chờ chuyên viên...';
            chatStatus.className = 'fab-chat-status waiting';
            if (handoverBtn) {
                handoverBtn.textContent = 'Hỏi lại AI';
                handoverBtn.setAttribute('title', 'Quay lại hỏi Trợ lý AI PawPal');
                handoverBtn.classList.add('active-agent');
            }
        } else if (status === 'agent_handling') {
            chatTitleText.textContent = currentStaffName ? `Chuyên viên: ${currentStaffName}` : 'Chuyên viên CSKH';
            chatStatus.textContent = 'Đang trực tiếp';
            chatStatus.className = 'fab-chat-status live';
            if (handoverBtn) {
                handoverBtn.textContent = 'Hỏi lại AI';
                handoverBtn.setAttribute('title', 'Quay lại hỏi Trợ lý AI PawPal');
                handoverBtn.classList.add('active-agent');
            }
        } else {
            // bot_handling
            chatTitleText.textContent = 'PawPal AI';
            chatStatus.textContent = 'Trực tuyến';
            chatStatus.className = 'fab-chat-status';
            if (handoverBtn) {
                handoverBtn.textContent = 'Gặp chuyên viên';
                handoverBtn.setAttribute('title', 'Gặp chuyên viên tư vấn trực tiếp');
                handoverBtn.classList.remove('active-agent');
            }
        }
    }

    async function ensureConversationExists() {
        if (activeConversationId) return activeConversationId;
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return null;

        try {
            const { data, error } = await db.from('chat_conversation').insert([{
                customer_id: currentUserId !== 'guest' ? currentUserId : null,
                session_token: currentSessionToken,
                status: 'bot_handling',
                sentiment_level: 2,
                is_urgent: false,
                channel: 'web'
            }]).select('id').single();

            if (!error && data) {
                activeConversationId = data.id;
                localStorage.setItem('pawpal_fab_conv_id', activeConversationId);
                registerConversationSession(activeConversationId, 'Đoạn chat mới', 'bot_handling');
                subscribeToStaffRealtime(activeConversationId);
                return activeConversationId;
            }
        } catch(e) {
            console.warn('[FAB] Không thể khởi tạo conversation:', e.message);
        }
        return null;
    }

    // Yêu cầu chuyển giao cho chuyên viên KTV
    async function requestHumanHandover(reason = 'Khách yêu cầu hỗ trợ trực tiếp') {
        const convId = await ensureConversationExists();
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

        appendMessage('Tôi cần gặp chuyên viên tư vấn trực tiếp.', 'user');
        conversationHistory.push({ role: 'user', content: 'Tôi cần gặp chuyên viên tư vấn trực tiếp.' });
        saveChatHistory();

        updateHeaderMode('waiting_agent');
        appendSystemNotice('Đang kết nối tới chuyên viên CSKH PawPal... Vui lòng đợi trong giây lát, chuyên viên sẽ tiếp nhận hỗ trợ sen ngay ạ!');

        if (db && convId) {
            try {
                // 1. Cập nhật trạng thái hội thoại sang waiting_agent + is_urgent = true
                await db.from('chat_conversation').update({
                    status: 'waiting_agent',
                    is_urgent: true,
                    updated_at: new Date().toISOString()
                }).eq('id', convId);

                // 2. Ghi tin nhắn yêu cầu vào chat_message để hiển thị trên màn hình CSKH Admin
                await db.from('chat_message').insert([{
                    conversation_id: convId,
                    sender_type: 'customer',
                    sender_name: currentUserName,
                    content: 'Tôi cần gặp chuyên viên tư vấn trực tiếp.',
                    raw_content: 'Tôi cần gặp chuyên viên tư vấn trực tiếp.',
                    is_toxic: false
                }]);
            } catch(e) {
                console.error('[FAB] Lỗi khi chuyển giao chuyên viên:', e);
            }
        }
    }

    // Chuyển lại quyền trò chuyện cho AI bot
    async function switchBackToAi() {
        const convId = activeConversationId;
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

        updateHeaderMode('bot_handling');
        appendSystemNotice('Đã chuyển lại quyền trò chuyện cho <strong>Trợ lý AI PawPal</strong>. Sen có thể tiếp tục hỏi bất kỳ điều gì!');

        if (db && convId) {
            try {
                await db.from('chat_conversation').update({
                    status: 'bot_handling',
                    is_urgent: false,
                    updated_at: new Date().toISOString()
                }).eq('id', convId);
            } catch(e) {
                console.error('[FAB] Lỗi khi chuyển về AI:', e);
            }
        }
    }

    if (handoverBtn) {
        handoverBtn.addEventListener('click', () => {
            if (currentConversationStatus === 'waiting_agent' || currentConversationStatus === 'agent_handling') {
                switchBackToAi();
            } else {
                requestHumanHandover();
            }
        });
    }

    // -------------------------------------------------------------
    // GIAI ĐOẠN 3: PARSER THẺ TƯƠNG TÁC (RICH MESSAGE CARDS)
    // -------------------------------------------------------------
    function formatChatContent(rawText) {
        if (!rawText) return '';
        let html = rawText;

        // Thay thế in đậm
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 1. Thẻ Đơn hàng: :::order { ... } :::
        html = html.replace(/:::order\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                const st = data.status || 'Đang xử lý';
                const statusBadge = (st === 'Đã giao' || st === 'Hoàn thành') ? 'badge-active' : (st === 'Đã hủy' ? 'badge-danger' : 'badge-info');
                const code = data.code || data.id || 'DH';
                return `<div class="fab-rich-card fab-rich-card--order"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Đơn hàng #${code}</span><span class="admin-badge ${statusBadge}">${st}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${data.items || 'Sản phẩm PawPal'}</div><div class="fab-rich-card-desc">Tổng thanh toán: <strong>${data.total || '0đ'}</strong>${data.date ? ' • ' + data.date : ''}</div></div><a href="/pages/orders/?order=${code}" class="fab-rich-card-action">Theo dõi đơn hàng</a></div>`;
            } catch(e) { return match; }
        });

        // 2. Thẻ Lịch hẹn Dịch vụ: :::booking { ... } :::
        html = html.replace(/:::booking\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                const st = data.status || 'Đã xác nhận';
                const statusBadge = (st === 'Hoàn thành' || st === 'Đang thực hiện') ? 'badge-active' : (st === 'Đã hủy' ? 'badge-danger' : 'badge-info');
                return `<div class="fab-rich-card fab-rich-card--booking"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Lịch hẹn dịch vụ</span><span class="admin-badge ${statusBadge}">${st}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${data.service || 'Chăm sóc thú cưng'}</div><div class="fab-rich-card-desc">Bé: <strong>${data.pet || 'Bé cưng'}</strong> • Giờ hẹn: <strong>${data.time || 'Hôm nay'}</strong></div></div><a href="/pages/services/booking.html" class="fab-rich-card-action">Xem chi tiết lịch hẹn</a></div>`;
            } catch(e) { return match; }
        });

        // 3. Thẻ Ưu đãi / Voucher: :::voucher { ... } :::
        html = html.replace(/:::voucher\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                const code = data.code || 'PAWPAL';
                return `<div class="fab-rich-card fab-rich-card--voucher"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Ưu đãi PawPal</span><span class="fab-voucher-code">${code}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${data.discount || 'Giảm giá đặc biệt'}</div><div class="fab-rich-card-desc">${data.minOrder || 'Áp dụng mọi đơn'} • ${data.expiry || 'HSD: 30 ngày'}</div></div><button type="button" class="fab-rich-card-action copy-code-btn" data-code="${code}">Sao chép mã voucher</button></div>`;
            } catch(e) { return match; }
        });

        // Xuống dòng text thông thường
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function appendStaffMessage(text, staffName) {
        const bubble = document.createElement('div');
        bubble.className = 'fab-chat-bubble fab-chat-bubble--staff';
        bubble.innerHTML = `<span class="staff-sender-title">${staffName || 'Chuyên viên CSKH'}</span>${formatChatContent(text)}`;
        if (messages) {
            messages.appendChild(bubble);
            scrollToBottom();
        }
    }

    const toxicBanner = document.getElementById('fabToxicBanner');
    const toxicCountdown = document.getElementById('fabToxicCountdown');
    let blockTimerInterval = null;

    function handleToxicWarning(warn) {
        if (!warn) return;
        if (warn.level === 3 || warn.blocked_until) {
            startBlockCountdown(warn.blocked_until);
        } else if (toxicBanner) {
            toxicBanner.textContent = warn.message || 'Vui lòng giữ ngôn từ lịch thiệp để chuyên viên hỗ trợ tốt nhất nhé ạ!';
            toxicBanner.className = 'fab-toxic-banner' + (warn.level === 2 ? ' danger' : '');
            toxicBanner.style.display = 'flex';
            setTimeout(() => {
                if (toxicBanner) toxicBanner.style.display = 'none';
            }, 12000);
        }
    }

    function startBlockCountdown(blockedUntil) {
        if (!blockedUntil) return;
        const targetTime = new Date(blockedUntil).getTime();
        if (blockTimerInterval) clearInterval(blockTimerInterval);

        function updateCountdown() {
            const nowTime = Date.now();
            const diffSec = Math.max(0, Math.ceil((targetTime - nowTime) / 1000));
            if (diffSec <= 0) {
                clearInterval(blockTimerInterval);
                if (toxicCountdown) toxicCountdown.style.display = 'none';
                if (input) {
                    input.disabled = false;
                    input.placeholder = 'Nhập câu hỏi...';
                }
                if (sendBtn) sendBtn.disabled = false;
                return;
            }

            const m = Math.floor(diffSec / 60);
            const s = diffSec % 60;
            const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
            if (toxicCountdown) {
                toxicCountdown.innerHTML = `Khung chat tạm khóa do vi phạm tiêu chuẩn: Còn <strong>${timeStr}</strong>`;
                toxicCountdown.style.display = 'block';
            }
            if (input) {
                input.disabled = true;
                input.placeholder = `Tạm khóa: Còn ${timeStr}`;
            }
            if (sendBtn) sendBtn.disabled = true;
        }

        updateCountdown();
        blockTimerInterval = setInterval(updateCountdown, 1000);
    }

    function appendSystemNotice(html) {
        const bubble = document.createElement('div');
        bubble.className = 'fab-chat-bubble fab-chat-bubble--system-notice';
        bubble.innerHTML = html;
        if (messages) {
            messages.appendChild(bubble);
            scrollToBottom();
        }
    }

    // Lắng nghe Supabase Realtime 2 chiều cho ca chat
    function subscribeToStaffRealtime(convId) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || typeof db.channel !== 'function' || !convId) return;
        if (window.__pawpalFabRealtimeChannel) {
            try { db.removeChannel(window.__pawpalFabRealtimeChannel); } catch(e) {}
        }

        window.__pawpalFabRealtimeChannel = db.channel('fab-customer-' + convId)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_message', 
                filter: `conversation_id=eq.${convId}` 
            }, (payload) => {
                const newM = payload.new;
                if (newM && newM.sender_type === 'staff') {
                    const exists = conversationHistory.some(h => h._msgId === newM.id);
                    if (!exists) {
                        conversationHistory.push({
                            role: 'model',
                            content: newM.content,
                            _msgId: newM.id,
                            isStaff: true,
                            senderName: newM.sender_name || 'Chuyên viên CSKH'
                        });
                        saveChatHistory();
                        appendStaffMessage(newM.content, newM.sender_name || 'Chuyên viên CSKH');
                    }
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chat_conversation',
                filter: `id=eq.${convId}`
            }, async (payload) => {
                const updated = payload.new;
                if (!updated) return;

                if (updated.status === 'agent_handling') {
                    let staffName = 'Chuyên viên CSKH';
                    if (updated.assigned_staff_id) {
                        try {
                            const { data: stData } = await db.from('staff').select('full_name').eq('id', updated.assigned_staff_id).maybeSingle();
                            if (stData && stData.full_name) staffName = stData.full_name;
                        } catch(e) {}
                    }
                    updateHeaderMode('agent_handling', staffName);
                    appendSystemNotice(`<strong>${staffName}</strong> đã tiếp nhận ca chat để hỗ trợ trực tiếp cho sen!`);
                } else if (updated.status === 'bot_handling') {
                    updateHeaderMode('bot_handling');
                } else if (updated.status === 'waiting_agent') {
                    updateHeaderMode('waiting_agent');
                }

                if (updated.blocked_until && new Date(updated.blocked_until) > new Date()) {
                    startBlockCountdown(updated.blocked_until);
                }
            })
            .subscribe();
    }

    if (activeConversationId) {
        subscribeToStaffRealtime(activeConversationId);
    }

    // Tự động khôi phục lịch sử chat và trạng thái từ Supabase Live DB
    async function restoreRemoteHistoryIfAvailable() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;

        try {
            let conv = null;
            if (activeConversationId) {
                const { data } = await db.from('chat_conversation')
                    .select('id, status, assigned_staff_id')
                    .eq('id', activeConversationId)
                    .maybeSingle();
                conv = data;
            } else if (currentUserId && currentUserId !== 'guest') {
                const { data } = await db.from('chat_conversation')
                    .select('id, status, assigned_staff_id')
                    .eq('customer_id', currentUserId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                conv = data;
            } else if (currentSessionToken) {
                const { data } = await db.from('chat_conversation')
                    .select('id, status, assigned_staff_id')
                    .eq('session_token', currentSessionToken)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                conv = data;
            }

            if (conv && conv.id) {
                activeConversationId = conv.id;
                localStorage.setItem('pawpal_fab_conv_id', activeConversationId);
                subscribeToStaffRealtime(activeConversationId);

                // Cập nhật trạng thái header dựa vào conv status
                if (conv.status === 'agent_handling' || conv.status === 'waiting_agent') {
                    let staffName = '';
                    if (conv.assigned_staff_id) {
                        const { data: stData } = await db.from('staff').select('full_name').eq('id', conv.assigned_staff_id).maybeSingle();
                        if (stData) staffName = stData.full_name;
                    }
                    updateHeaderMode(conv.status, staffName);
                }

                if (conversationHistory.length === 0) {
                    const { data: dbMsgs } = await db.from('chat_message')
                        .select('*')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: true })
                        .limit(40);

                    if (dbMsgs && dbMsgs.length > 0) {
                        conversationHistory = dbMsgs.map(m => ({
                            role: m.sender_type === 'customer' ? 'user' : 'model',
                            content: m.content,
                            _msgId: m.id,
                            isStaff: m.sender_type === 'staff',
                            senderName: m.sender_name
                        }));
                        saveChatHistory();
                        renderLoadedHistory();
                    }
                }
            }
        } catch(e) {
            console.warn('[FAB] Không thể khôi phục lịch sử chat từ Supabase:', e.message);
        }
    }

    function renderLoadedHistory() {
        if (!messages) return;
        messages.innerHTML = '';
        conversationHistory.forEach(msg => {
            const bubble = document.createElement('div');
            if (msg.isStaff) {
                bubble.className = 'fab-chat-bubble fab-chat-bubble--staff';
                bubble.innerHTML = `<span class="staff-sender-title">${msg.senderName || 'Chuyên viên CSKH'}</span>${formatChatContent(msg.content)}`;
            } else {
                bubble.className = `fab-chat-bubble fab-chat-bubble--${msg.role === 'user' ? 'user' : 'bot'}`;
                bubble.innerHTML = msg.role === 'model' ? formatChatContent(msg.content) : msg.content;
            }
            messages.appendChild(bubble);
        });
        setTimeout(() => scrollToBottom(), 100);
    }

    if (conversationHistory.length > 0) {
        renderLoadedHistory();
        restoreRemoteHistoryIfAvailable();
    } else {
        restoreRemoteHistoryIfAvailable();
    }

    // -------------------------------------------------------------
    // QUẢN LÝ ĐA PHIÊN CHAT (MULTI-SESSION & CHAT HISTORY DRAWER)
    // -------------------------------------------------------------
    function getGuestConversations() {
        try {
            return JSON.parse(localStorage.getItem('pawpal_guest_conversations') || '[]');
        } catch(e) { return []; }
    }

    function saveGuestConversations(list) {
        localStorage.setItem('pawpal_guest_conversations', JSON.stringify((list || []).slice(0, 30)));
    }

    function registerConversationSession(convId, initialTitle = 'Đoạn chat mới', status = 'bot_handling') {
        if (!convId) return;
        const list = getGuestConversations();
        const existingIdx = list.findIndex(c => c.id === convId);
        const nowIso = new Date().toISOString();
        if (existingIdx >= 0) {
            list[existingIdx].updatedAt = nowIso;
            if (status) list[existingIdx].status = status;
            if (initialTitle && (!list[existingIdx].title || list[existingIdx].title === 'Đoạn chat mới')) {
                list[existingIdx].title = initialTitle.substring(0, 50);
            }
        } else {
            list.unshift({
                id: convId,
                title: (initialTitle || 'Đoạn chat mới').substring(0, 50),
                status: status || 'bot_handling',
                createdAt: nowIso,
                updatedAt: nowIso
            });
        }
        saveGuestConversations(list);
    }

    function startNewConversation() {
        // Bắt đầu đoạn chat mới: Lưu giữ các đoạn chat trước, reset phiên chat hiện tại
        activeConversationId = null;
        localStorage.removeItem('pawpal_fab_conv_id');
        conversationHistory = [];
        updateHeaderMode('bot_handling');

        if (messages) {
            messages.innerHTML = `
                <div class="fab-chat-bubble fab-chat-bubble--bot">
                    Xin chào! Tôi là trợ lý AI của PawPal <br>
                    Bạn cần tư vấn về dịch vụ nào?
                </div>
                <div class="fab-chat-suggestions">
                    <button class="fab-chat-suggest">Dịch vụ Spa và Grooming</button>
                    <button class="fab-chat-suggest">Pet Hotel giá bao nhiêu?</button>
                    <button class="fab-chat-suggest">Cần chuẩn bị gì khi gửi bé?</button>
                    <button class="fab-chat-suggest fab-chat-suggest--agent">Gặp nhân viên tư vấn</button>
                </div>
            `;
        }

        closeHistoryView();
        if (input) {
            input.disabled = false;
            input.value = '';
            input.placeholder = 'Nhập câu hỏi...';
            setTimeout(() => input.focus(), 150);
        }
    }

    function openHistoryView() {
        if (mainView) mainView.style.display = 'none';
        if (historyView) historyView.style.display = 'flex';
        loadAndRenderHistoryList();
    }

    function closeHistoryView() {
        if (historyView) historyView.style.display = 'none';
        if (mainView) mainView.style.display = 'flex';
        scrollToBottom();
    }

    function formatRelativeTime(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diffMin = Math.floor((now - d) / (1000 * 60));
            if (diffMin < 1) return 'Vừa xong';
            if (diffMin < 60) return `${diffMin} phút trước`;
            const diffHour = Math.floor(diffMin / 60);
            if (diffHour < 24) return `${diffHour} giờ trước`;
            const diffDays = Math.floor(diffHour / 24);
            if (diffDays < 7) return `${diffDays} ngày trước`;
            return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        } catch(e) { return ''; }
    }

    async function loadAndRenderHistoryList() {
        if (!historyList) return;
        historyList.innerHTML = `<div class="fab-history-loading" style="text-align:center;padding:24px 12px;font-size:12px;color:var(--text-muted,#4F7A65);">Đang tải các đoạn chat...</div>`;

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        let convs = [];

        try {
            if (db && currentUserId && currentUserId !== 'guest') {
                const { data } = await db.from('chat_conversation')
                    .select('id, status, created_at, updated_at, ai_summary')
                    .eq('customer_id', currentUserId)
                    .order('updated_at', { ascending: false })
                    .limit(20);
                if (data) convs = data;
            } else if (db && currentSessionToken) {
                const { data } = await db.from('chat_conversation')
                    .select('id, status, created_at, updated_at, ai_summary')
                    .eq('session_token', currentSessionToken)
                    .order('updated_at', { ascending: false })
                    .limit(20);
                if (data && data.length > 0) convs = data;
            }
        } catch(e) {
            console.warn('[FAB] Không thể lấy lịch sử từ Supabase:', e.message);
        }

        const localList = getGuestConversations();
        if (convs.length === 0 && localList.length > 0) {
            convs = localList.map(l => ({
                id: l.id,
                status: l.status || 'bot_handling',
                updated_at: l.updatedAt || l.createdAt,
                ai_summary: l.title
            }));
        } else if (localList.length > 0) {
            localList.forEach(loc => {
                const existing = convs.find(c => c.id === loc.id);
                if (existing) {
                    if (!existing.ai_summary && loc.title) existing.ai_summary = loc.title;
                } else {
                    convs.push({
                        id: loc.id,
                        status: loc.status || 'bot_handling',
                        updated_at: loc.updatedAt || loc.createdAt,
                        ai_summary: loc.title
                    });
                }
            });
            convs.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
        }

        if (convs.length === 0) {
            historyList.innerHTML = `<div class="fab-history-empty">Chưa có đoạn chat nào trước đó.</div>`;
            return;
        }

        historyList.innerHTML = '';
        convs.forEach(c => {
            const isActive = c.id === activeConversationId;
            const title = c.ai_summary || ('Đoạn chat #' + c.id.substring(0, 6));
            let statusText = 'PawPal AI';
            let badgeClass = 'badge-neutral';

            if (c.status === 'agent_handling') {
                statusText = 'Chuyên viên';
                badgeClass = 'badge-active';
            } else if (c.status === 'waiting_agent') {
                statusText = 'Chờ tiếp nhận';
                badgeClass = 'badge-warning';
            } else if (c.status === 'closed' || c.status === 'resolved') {
                statusText = 'Hoàn tất';
                badgeClass = 'badge-neutral';
            }

            const timeStr = formatRelativeTime(c.updated_at || c.created_at);

            const card = document.createElement('div');
            card.className = `fab-history-card ${isActive ? 'active' : ''}`;
            card.setAttribute('data-conv-id', c.id);
            card.innerHTML = `
                <div class="fab-history-card-info">
                    <div class="fab-history-card-title">${title}</div>
                    <div class="fab-history-card-meta">
                        <span class="admin-badge ${badgeClass}">${statusText}</span>
                        <span>${timeStr}</span>
                    </div>
                </div>
                <button type="button" class="fab-history-card-del" title="Xóa đoạn chat này" data-del-id="${c.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.fab-history-card-del')) return;
                switchConversation(c.id);
            });

            const delBtn = card.querySelector('.fab-history-card-del');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSingleConversation(c.id);
                });
            }

            historyList.appendChild(card);
        });
    }

    async function switchConversation(convId) {
        if (!convId) return;
        if (convId === activeConversationId) {
            closeHistoryView();
            return;
        }

        activeConversationId = convId;
        localStorage.setItem('pawpal_fab_conv_id', convId);

        closeHistoryView();
        if (messages) {
            messages.innerHTML = `<div class="fab-chat-bubble fab-chat-bubble--system-notice">Đang tải đoạn chat...</div>`;
        }

        subscribeToStaffRealtime(convId);

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                const { data: convData } = await db.from('chat_conversation')
                    .select('id, status, assigned_staff_id')
                    .eq('id', convId)
                    .maybeSingle();

                if (convData) {
                    let staffName = '';
                    if (convData.assigned_staff_id) {
                        const { data: st } = await db.from('staff').select('full_name').eq('id', convData.assigned_staff_id).maybeSingle();
                        if (st) staffName = st.full_name;
                    }
                    updateHeaderMode(convData.status || 'bot_handling', staffName);
                }

                const { data: dbMsgs } = await db.from('chat_message')
                    .select('*')
                    .eq('conversation_id', convId)
                    .order('created_at', { ascending: true })
                    .limit(50);

                if (dbMsgs && dbMsgs.length > 0) {
                    conversationHistory = dbMsgs.map(m => ({
                        role: m.sender_type === 'customer' ? 'user' : 'model',
                        content: m.content,
                        _msgId: m.id,
                        isStaff: m.sender_type === 'staff',
                        senderName: m.sender_name
                    }));
                    saveChatHistory();
                    renderLoadedHistory();
                } else {
                    conversationHistory = [];
                    renderLoadedHistory();
                }
            } catch(e) {
                console.error('[FAB] Lỗi chuyển conversation:', e);
            }
        }
    }

    async function deleteSingleConversation(convId) {
        if (!convId) return;
        if (!confirm('Bạn có chắc chắn muốn xóa đoạn chat này không? Các đoạn chat khác vẫn sẽ được giữ nguyên.')) return;

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                await db.from('chat_message').delete().eq('conversation_id', convId);
                await db.from('chat_conversation').delete().eq('id', convId);
            } catch(e) {
                console.warn('[FAB] Không thể xóa conversation trên DB:', e.message);
            }
        }

        let localList = getGuestConversations();
        localList = localList.filter(c => c.id !== convId);
        saveGuestConversations(localList);

        if (activeConversationId === convId) {
            startNewConversation();
        } else {
            loadAndRenderHistoryList();
        }
    }

    if (newBtn) newBtn.addEventListener('click', startNewConversation);
    if (historyBtn) historyBtn.addEventListener('click', openHistoryView);
    if (historyBackBtn) historyBackBtn.addEventListener('click', closeHistoryView);
    if (historyNewBtn) historyNewBtn.addEventListener('click', startNewConversation);

    // -------------------------------------------------------------
    // GỬI TIN NHẮN (ĐIỀU PHỐI: TRỰC TIẾP NHÂN VIÊN HOẶC QUA AI COPILOT)
    // -------------------------------------------------------------
    async function sendMessage() {
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';
        appendMessage(text, 'user');

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

        // Trường hợp 1: Đang có chuyên viên tiếp quản hoặc đang đợi chuyên viên
        if (currentConversationStatus === 'agent_handling' || currentConversationStatus === 'waiting_agent') {
            const convId = await ensureConversationExists();
            conversationHistory.push({ role: 'user', content: text });
            saveChatHistory();

            if (db && convId) {
                try {
                    await db.from('chat_message').insert([{
                        conversation_id: convId,
                        sender_type: 'customer',
                        sender_name: currentUserName,
                        content: text,
                        raw_content: text,
                        is_toxic: false
                    }]);

                    await db.from('chat_conversation').update({
                        updated_at: new Date().toISOString()
                    }).eq('id', convId);
                } catch(e) {
                    console.error('[FAB] Lỗi gửi tin nhắn trực tiếp tới chuyên viên:', e);
                }
            }
            return;
        }

        // Trường hợp 2: Trò chuyện với PawPal AI
        showTyping();
        
        let aiTimerSeconds = 0;
        let aiTimerInterval = null;
        let finalReplyForConsole = '';
        
        try {
            aiTimerInterval = setInterval(() => {
                aiTimerSeconds++;
            }, 1000);

            let token = "";
            if (db) {
                const { data } = await db.auth.getSession();
                if (data && data.session) {
                    token = data.session.access_token;
                }
            }
            if (!token) {
                try {
                    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                    if (currentUser && (currentUser.id || currentUser._supabaseId)) {
                        token = 'local:' + (currentUser._supabaseId || currentUser.id);
                    }
                } catch(e) {}
            }
            
            conversationHistory.push({
                "role": "user",
                "content": text
            });
            saveChatHistory();

            const bodyPayload = {
                messages: conversationHistory,
                conversationId: activeConversationId || undefined,
                sessionToken: currentSessionToken,
                stream: true
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream, application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(bodyPayload)
            });

            removeTyping();

            let botBubble = null;
            let fullReply = '';
            const contentType = response.headers.get('content-type') || '';

            if (contentType.includes('application/json')) {
                const data = await response.json();
                if (data.conversationId && data.conversationId !== activeConversationId) {
                    activeConversationId = data.conversationId;
                    localStorage.setItem('pawpal_fab_conv_id', activeConversationId);
                    registerConversationSession(activeConversationId, text, 'bot_handling');
                    subscribeToStaffRealtime(activeConversationId);
                } else if (activeConversationId) {
                    registerConversationSession(activeConversationId, text, 'bot_handling');
                }

                fullReply = data.reply || data.text || '';
                if (fullReply) {
                    botBubble = document.createElement('div');
                    botBubble.className = 'fab-chat-bubble fab-chat-bubble--bot';
                    botBubble.innerHTML = formatChatContent(fullReply);
                    messages.appendChild(botBubble);
                    scrollToBottom();
                    conversationHistory.push({ "role": "model", "content": fullReply });
                    saveChatHistory();
                }
            } else {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    
                    const streamChunk = decoder.decode(value, { stream: true });
                    const lines = streamChunk.split('\n');
                    
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const parsed = JSON.parse(line.slice(6));
                            
                            if (parsed.conversationId && parsed.conversationId !== activeConversationId) {
                                activeConversationId = parsed.conversationId;
                                localStorage.setItem('pawpal_fab_conv_id', activeConversationId);
                                registerConversationSession(activeConversationId, text, 'bot_handling');
                                subscribeToStaffRealtime(activeConversationId);
                            } else if (activeConversationId) {
                                registerConversationSession(activeConversationId, text, 'bot_handling');
                            }

                            if (parsed.done) {
                                if (fullReply) {
                                    conversationHistory.push({ "role": "model", "content": fullReply });
                                    saveChatHistory();
                                }
                                break;
                            }

                            if (parsed.error) {
                                console.error("[PawPal AI Error]", parsed.error);
                            }
                            
                            if (parsed.reply) {
                                fullReply = parsed.reply;
                                if (!botBubble) {
                                    botBubble = document.createElement('div');
                                    botBubble.className = 'fab-chat-bubble fab-chat-bubble--bot';
                                    messages.appendChild(botBubble);
                                }
                                botBubble.innerHTML = formatChatContent(fullReply);
                                scrollToBottom();
                            } else if (parsed.chunk) {
                                fullReply += parsed.chunk;
                                if (!botBubble) {
                                    botBubble = document.createElement('div');
                                    botBubble.className = 'fab-chat-bubble fab-chat-bubble--bot';
                                    messages.appendChild(botBubble);
                                }
                                botBubble.innerHTML = formatChatContent(fullReply);
                                scrollToBottom();
                            }
                        } catch(e) { }
                    }
                }
            }
            
            if (!fullReply && !botBubble) {
                appendMessage('Xin lỗi, hệ thống PawPal AI đang gặp sự cố kết nối. Quý khách vui lòng thử lại sau.', 'bot');
            }
            finalReplyForConsole = fullReply;
        } catch (error) {
            console.error("Chatbot request failed", error);
            removeTyping();
            appendMessage("Xin lỗi, không thể kết nối tới PawPal AI lúc này.", 'bot');
        } finally {
            if (aiTimerInterval) clearInterval(aiTimerInterval);
        }
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    if (messages) {
        messages.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.copy-code-btn');
            if (copyBtn) {
                const code = copyBtn.getAttribute('data-code');
                if (code && navigator.clipboard) {
                    navigator.clipboard.writeText(code).then(() => {
                        const oldText = copyBtn.textContent;
                        copyBtn.textContent = 'Đã sao chép!';
                        setTimeout(() => { copyBtn.textContent = oldText; }, 2000);
                    });
                }
                return;
            }

            const btn = e.target.closest('.fab-chat-suggest');
            if (btn) {
                if (btn.classList.contains('fab-chat-suggest--agent')) {
                    requestHumanHandover('Khách bấm nút gợi ý gặp nhân viên tư vấn');
                    return;
                }
                if (!input) return;
                input.value = btn.innerText || btn.textContent;
                sendMessage();
            }
        });
    }

    window.__pawpalFabInitialized = true;

    function scrollToBottom() {
        if (messages) {
            requestAnimationFrame(() => {
                messages.scrollTop = messages.scrollHeight;
            });
        }
    }

    function appendMessage(text, type) {
        const bubble = document.createElement('div');
        bubble.className = `fab-chat-bubble fab-chat-bubble--${type}`;
        bubble.innerHTML = text;
        if (type === 'user') {
            const sug = messages && messages.querySelector('.fab-chat-suggestions');
            if (sug) sug.remove();
        }
        if (messages) {
            messages.appendChild(bubble);
            scrollToBottom();
        }
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'fab-chat-bubble fab-chat-bubble--typing';
        typing.id = 'fabTyping';
        typing.innerHTML = '<span></span><span></span><span></span>';
        if (messages) {
            messages.appendChild(typing);
            scrollToBottom();
        }
    }

    function removeTyping() {
        const t = document.getElementById('fabTyping');
        if (t) t.remove();
    }
}

document.addEventListener('footerInjected', function () {
    setTimeout(initFab, 100);
});

if (document.readyState !== 'loading') {
    setTimeout(initFab, 0);
} else {
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(initFab, 0);
    });
}