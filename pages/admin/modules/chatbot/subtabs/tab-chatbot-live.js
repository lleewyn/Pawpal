// tab-chatbot-live.js - Subtab Trực chat CSKH Pawpal-er (Hộp thư 3 khu vực thời gian thực)
(function() {
    'use strict';

    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};

    const supabase = (typeof window.getSupabaseClient === 'function') 
        ? window.getSupabaseClient() 
        : (window.SupabaseClient || (typeof createClient === 'function' ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null));

    let slaTickerInterval = null;
    let currentSuggestIndex = 0;
    let pendingAdminAttachment = null;
    let currentAdminRoomChannel = null;
    let subscribedConversationId = null;
    let customerTypingHideTimer = null;
    let isSendingLiveMsg = false;
    let isStaffTypingActive = false;
    let staffTypingStopTimer = null;

    // PR-02: Gợi ý phản hồi mẫu chân thực, không hứa hẹn bồi hoàn ảo (CB-25)
    const defaultSmartSuggestions = [
        { tag: 'Đồng cảm và Xoa dịu', text: 'Dạ PawPal thành thật xin lỗi sen và bé vì sự bất tiện này! Em xin phép ưu tiên kiểm tra và xử lý ngay cho sen ạ.' },
        { tag: 'Kiểm tra thông tin', text: 'Dạ sen cho em xin thêm thông tin chi tiết hoặc hình ảnh tình trạng của bé để em hỗ trợ kịp thời nhé ạ.' },
        { tag: 'Chuyển chuyên viên', text: 'Dạ em đã ghi nhận thông tin và đang kết nối chuyên viên phụ trách để giải quyết trường hợp của sen ngay ạ.' }
    ];

    let cannedResponsesDatabase = [
        { id: 'cr-01', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Lời chào tiếp nhận ca hỗ trợ', content: 'Dạ PawPal xin chào sen, em là chuyên viên CSKH đã tiếp nhận ca chat này để trực tiếp hỗ trợ mình ngay ạ!' },
        { id: 'cr-02', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Xin phép kiểm tra hệ thống trong 1-2 phút', content: 'Dạ sen vui lòng đợi em trong 1-2 phút, em đang tiến hành tra cứu dữ liệu trên hệ thống và sẽ phản hồi mình ngay ạ.' },
        { id: 'cr-03', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Xác nhận thông tin bé và đơn hàng', content: 'Dạ để hỗ trợ chính xác nhất, sen cho em xin mã đơn hàng hoặc số điện thoại đăng ký tài khoản của bé nhé ạ.' }
    ];

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

    function updateSlaBadgesInDom() {
        const liveConversations = PawpalChatbot.state?.liveConversations || [];
        const currentConversation = PawpalChatbot.state?.currentConversation;

        liveConversations.forEach(c => {
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
            const liveConversations = PawpalChatbot.state?.liveConversations || [];
            liveConversations.forEach(c => {
                if (!c.isHandover) {
                    c.waitingSeconds = (c.waitingSeconds || 0) + 1;
                    changed = true;
                }
            });
            if (changed) {
                updateSlaBadgesInDom();
            }
        }, 1000);
    }

    function formatSnippetPreview(rawText) {
        if (!rawText) return '...';
        let text = String(rawText);
        text = text.replace(/:::csat_survey\b[\s\S]*?(:::|$)/gi, '[Khảo sát đánh giá dịch vụ]');
        text = text.replace(/:::order\b[\s\S]*?(:::|$)/gi, '[Thông tin đơn hàng]');
        text = text.replace(/:::booking\b[\s\S]*?(:::|$)/gi, '[Lịch hẹn dịch vụ]');
        text = text.replace(/:::voucher\b[\s\S]*?(:::|$)/gi, '[Mã ưu đãi PawPal]');
        text = text.replace(/!\[(.*?)\]\(.*?\)/gi, (m, alt) => (alt ? `[Hình ảnh: ${alt}]` : '[Hình ảnh]'));
        text = text.replace(/\*\*(.*?)\*\*/g, '$1');
        text = text.replace(/\s+/g, ' ').trim();
        return text || '...';
    }

    function escapeHtml(str) {
        if (!str && str !== 0) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function isSafeUrl(url) {
        if (!url) return false;
        const trimmed = String(url).trim().toLowerCase();
        return trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/') || trimmed.startsWith('./');
    }

    function hasRawContentPermission() {
        try {
            const adminUser = JSON.parse(localStorage.getItem('pawpal_admin_user') || sessionStorage.getItem('pawpal_admin_user') || '{}');
            const role = (adminUser.system_role || adminUser.role || '').toUpperCase();
            if (role === 'ADMIN' || role === 'CSKH_LEAD') return true;
            const perms = Array.isArray(adminUser.permissions) ? adminUser.permissions : [];
            return perms.includes('chat.raw.read') || perms.includes('all');
        } catch (e) {
            return false;
        }
    }

    async function requestUnlockRawMessage(targetMsg) {
        if (!targetMsg || !targetMsg.id) return;
        try {
            const token = sessionStorage.getItem('pawpal_staff_token') || 'local:' + (sessionStorage.getItem('pawpal_staff_id') || 'd0000000-5555-5555-5555-555555555555');
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: 'CHAT_GET_RAW_CONTENT',
                    messageId: targetMsg.id
                })
            });
            const data = await res.json();
            if (res.ok && data.ok) {
                targetMsg.unlockedRawContent = data.raw_content;
                targetMsg.activeMaskLevel = 'raw';
                renderCurrentChat();
                PawpalChatbot.showToast?.('Đã mở xem nguyên văn. Nhật ký kiểm toán đã được ghi nhận an toàn.', 'info');
            } else {
                PawpalChatbot.showToast?.(data.error || 'Không thể xem nguyên văn.', 'error');
            }
        } catch (e) {
            console.error('Lỗi khi mở raw message:', e);
            PawpalChatbot.showToast?.('Lỗi kết nối máy chủ khi mở nguyên văn.', 'error');
        }
    }

    function formatAdminChatText(rawText) {
        if (!rawText) return '';
        const blocks = [];

        // 1. Tokenize cards and images
        let text = rawText.replace(/:::order\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            const idx = blocks.length;
            try {
                const data = JSON.parse(jsonStr);
                const st = escapeHtml(data.status || 'Đang xử lý');
                const rawSt = data.status || '';
                const statusBadge = (rawSt === 'Đã giao' || rawSt === 'Hoàn thành') ? 'badge-active' : (rawSt === 'Đã hủy' ? 'badge-danger' : 'badge-info');
                const code = escapeHtml(data.code || data.id || 'DH');
                const items = escapeHtml(data.items || 'Sản phẩm PawPal');
                const total = escapeHtml(data.total || '0đ');
                blocks.push(`<div class="fab-rich-card fab-rich-card--order"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Đơn hàng #${code}</span><span class="admin-badge ${statusBadge}">${st}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${items}</div><div class="fab-rich-card-desc">Tổng tiền: <strong>${total}</strong></div></div><div class="fab-rich-card-action">Đơn hàng đã chia sẻ</div></div>`);
            } catch(e) {
                blocks.push(escapeHtml(match));
            }
            return `__PAWPAL_BLOCK_${idx}__`;
        });

        text = text.replace(/:::booking\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            const idx = blocks.length;
            try {
                const data = JSON.parse(jsonStr);
                const st = escapeHtml(data.status || 'Đã xác nhận');
                const rawSt = data.status || '';
                const statusBadge = (rawSt === 'Hoàn thành' || rawSt === 'Đang thực hiện') ? 'badge-active' : (rawSt === 'Đã hủy' ? 'badge-danger' : 'badge-info');
                const service = escapeHtml(data.service || 'Chăm sóc thú cưng');
                const pet = escapeHtml(data.pet || 'thú cưng');
                const time = escapeHtml(data.time || 'Hôm nay');
                blocks.push(`<div class="fab-rich-card fab-rich-card--booking"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Lịch hẹn dịch vụ</span><span class="admin-badge ${statusBadge}">${st}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${service}</div><div class="fab-rich-card-desc">Bé: <strong>${pet}</strong> • Giờ hẹn: <strong>${time}</strong></div></div><div class="fab-rich-card-action">Lịch hẹn dịch vụ</div></div>`);
            } catch(e) {
                blocks.push(escapeHtml(match));
            }
            return `__PAWPAL_BLOCK_${idx}__`;
        });

        text = text.replace(/:::voucher\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            const idx = blocks.length;
            try {
                const data = JSON.parse(jsonStr);
                const code = escapeHtml(data.code || 'PAWPAL');
                const discount = escapeHtml(data.discount || 'Giảm giá đặc biệt');
                const minOrder = escapeHtml(data.minOrder || 'Áp dụng mọi đơn');
                const expiry = escapeHtml(data.expiry || 'HSD: 30 ngày');
                blocks.push(`<div class="fab-rich-card fab-rich-card--voucher"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Ưu đãi PawPal</span><span class="fab-voucher-code">${code}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${discount}</div><div class="fab-rich-card-desc">${minOrder} • ${expiry}</div></div><div class="fab-rich-card-action">Mã ưu đãi đã gửi</div></div>`);
            } catch(e) {
                blocks.push(escapeHtml(match));
            }
            return `__PAWPAL_BLOCK_${idx}__`;
        });

        text = text.replace(/:::csat_survey\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            const idx = blocks.length;
            try {
                const data = JSON.parse(jsonStr);
                const staff = escapeHtml(data.staffName || 'Chuyên viên CSKH');
                blocks.push(`<div class="fab-rich-card fab-rich-card--csat"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Đánh giá dịch vụ</span><span class="admin-badge badge-warning">Khảo sát CSAT</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">Biểu mẫu đánh giá mức độ hài lòng</div><div class="fab-rich-card-desc">Phụ trách: <strong>${staff}</strong> • Đã gửi tới màn hình khách hàng</div></div></div>`);
            } catch(e) {
                blocks.push(escapeHtml(match));
            }
            return `__PAWPAL_BLOCK_${idx}__`;
        });

        text = text.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
            const idx = blocks.length;
            const safeAlt = escapeHtml(alt || '');
            if (isSafeUrl(url)) {
                const safeUrl = escapeHtml(url);
                blocks.push(`<div class="chat-attachment-image-wrap" data-img-url="${safeUrl}" data-img-caption="${safeAlt}"><img src="${safeUrl}" alt="${safeAlt || 'Ảnh đính kèm'}" class="chat-attachment-img">${safeAlt ? `<span class="chat-attachment-caption">${safeAlt}</span>` : ''}</div>`);
            } else {
                blocks.push(`[Hình ảnh: ${safeAlt || 'Liên kết không an toàn'}]`);
            }
            return `__PAWPAL_BLOCK_${idx}__`;
        });

        // 2. Escape regular text
        let html = escapeHtml(text);

        // 3. Convert markdown bold and linebreaks on escaped text
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\n/g, '<br>');

        // 4. Restore sanitized rich blocks
        blocks.forEach((blockHtml, i) => {
            html = html.replace(`__PAWPAL_BLOCK_${i}__`, blockHtml);
        });

        return html;
    }

    // PR-02: Chống tạo mới/hủy liên tục phòng WebSocket nếu ID không đổi (CB-11)
    function subscribeToConversationRoom(convId) {
        if (!supabase || !convId) return;
        if (subscribedConversationId === convId && currentAdminRoomChannel) {
            return;
        }

        if (currentAdminRoomChannel) {
            try { supabase.removeChannel(currentAdminRoomChannel); } catch(e) {}
            currentAdminRoomChannel = null;
        }
        subscribedConversationId = convId;

        const customerTypingBar = document.getElementById('customerTypingBar');
        const customerTypingText = document.getElementById('customerTypingText');
        if (customerTypingBar) customerTypingBar.style.display = 'none';

        currentAdminRoomChannel = supabase.channel('fab-customer-' + convId)
            .on('broadcast', { event: 'typing' }, (payload) => {
                const data = payload && payload.payload;
                if (data && data.who === 'customer') {
                    if (data.isTyping) {
                        if (customerTypingBar) {
                            if (customerTypingText) customerTypingText.textContent = `${escapeHtml(data.customerName || 'Khách hàng')} đang soạn tin...`;
                            customerTypingBar.style.display = 'flex';
                        }
                        clearTimeout(customerTypingHideTimer);
                        customerTypingHideTimer = setTimeout(() => {
                            if (customerTypingBar) customerTypingBar.style.display = 'none';
                        }, 4000);
                    } else {
                        clearTimeout(customerTypingHideTimer);
                        if (customerTypingBar) customerTypingBar.style.display = 'none';
                    }
                }
            })
            .subscribe();
    }

    function unsubscribeConversationRoom() {
        if (currentAdminRoomChannel) {
            try { supabase.removeChannel(currentAdminRoomChannel); } catch(e) {}
            currentAdminRoomChannel = null;
        }
        subscribedConversationId = null;
    }

    function notifyAdminTyping(isTyping) {
        if (currentAdminRoomChannel && PawpalChatbot.state?.currentConversation?.id) {
            try {
                currentAdminRoomChannel.send({
                    type: 'broadcast',
                    event: 'typing',
                    payload: { who: 'staff', staffName: PawpalChatbot.state.currentConversation.agentName || 'Chuyên viên CSKH', isTyping }
                });
            } catch(e) {}
        }
    }

    // PR-02: Debounce gõ phím nhân viên, ngăn phát 100 broadcast khi gõ 100 ký tự (CB-20)
    function handleStaffTyping() {
        if (!isStaffTypingActive) {
            isStaffTypingActive = true;
            notifyAdminTyping(true);
        }
        clearTimeout(staffTypingStopTimer);
        staffTypingStopTimer = setTimeout(() => {
            isStaffTypingActive = false;
            notifyAdminTyping(false);
        }, 2500);
    }

    // PR-02: Xử lý tin nhắn realtime đến hội thoại đang mở trực tiếp (không kéo lại cả 8 bảng)
    function handleIncomingMessage(newMsg) {
        if (!newMsg) return;
        const currentConv = PawpalChatbot.state?.currentConversation;
        if (!currentConv || currentConv.id !== newMsg.conversation_id) return;

        currentConv.messages = currentConv.messages || [];
        const exists = currentConv.messages.some(m => m.id === newMsg.id);
        if (exists) return;

        const mapped = {
            id: newMsg.id,
            sender: newMsg.sender_type === 'customer' ? 'user' : (newMsg.sender_type === 'staff' ? 'agent' : 'bot'),
            agentName: newMsg.sender_name || (newMsg.sender_type === 'staff' ? 'Chuyên viên CSKH' : 'PawPal Bot'),
            time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: newMsg.content || '',
            isToxic: !!newMsg.is_toxic,
            activeMaskLevel: newMsg.is_toxic ? 'words' : 'raw'
        };

        currentConv.messages.push(mapped);
        renderCurrentChat();
    }
    PawpalChatbot.subtabs.live.handleIncomingMessage = handleIncomingMessage;

    function renderConversationsList() {
        const container = document.getElementById('conversationsListContainer');
        if (!container) return;
        if (PawpalChatbot.state.liveLoadError) { container.textContent=PawpalChatbot.state.liveLoadError; return; }
        if (!PawpalChatbot.state.liveLoaded) {
            if (!container.querySelector('.skeleton-text')) container.innerHTML=Array.from({length:3},()=>'<div style="padding:16px;"><span class="skeleton-text" style="width:65%;"></span><span class="skeleton-text" style="width:90%;margin-top:10px;"></span></div>').join('');
            return;
        }


        const liveConversations = PawpalChatbot.state?.liveConversations || [];
        const currentFilterTab = PawpalChatbot.state?.currentFilterTab || 'all';
        const currentConversation = PawpalChatbot.state?.currentConversation;
        const searchKeyword = (document.getElementById('inboxSearchInput')?.value || '').toLowerCase().trim();

        const filtered = liveConversations.filter(c => {
            if (currentFilterTab === 'urgent' && c.category !== 'urgent') return false;
            if (currentFilterTab === 'active' && !c.isHandover) return false;
            if (searchKeyword) {
                return c.customerName.toLowerCase().includes(searchKeyword) || c.phone.includes(searchKeyword);
            }
            return true;
        });

        const urgentCount = liveConversations.filter(c => c.category === 'urgent').length;
        const activeCount = liveConversations.filter(c => c.isHandover).length;
        const allCount = liveConversations.length;

        const countBadge = document.getElementById('urgentBadgeCount');
        if (countBadge) countBadge.textContent = urgentCount;

        const activeBadge = document.getElementById('activeBadgeCount');
        if (activeBadge) activeBadge.textContent = activeCount;

        const allBadge = document.getElementById('allBadgeCount');
        if (allBadge) allBadge.textContent = allCount;

        document.querySelectorAll('.inbox-tab-btn').forEach(btn => {
            const f = btn.getAttribute('data-filter') || 'all';
            if (f === currentFilterTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

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
            const lastMsg = (conv.messages && conv.messages.length > 0) ? conv.messages[conv.messages.length - 1] : null;
            const snippet = lastMsg ? (lastMsg.isToxic ? '[Nội dung đã được che mờ]' : formatSnippetPreview(lastMsg.text)) : '...';

            let sentimentDot = '';
            if (conv.sentimentLevel >= 4) {
                sentimentDot = '<span style="color: #DC2626; font-size: 11px; font-weight: 600;">• Bực bội</span>';
            } else if (conv.sentimentLevel === 3) {
                sentimentDot = '<span style="color: #D97706; font-size: 11px; font-weight: 600;">• Cần lưu ý</span>';
            }

            let trendHtml = '';
            if (conv.sentimentTrend === 'escalating') {
                trendHtml = '<span style="color: #DC2626; font-size: 11px; margin-right: 4px;" title="Căng thẳng gia tăng">↑</span>';
            } else if (conv.sentimentTrend === 'de_escalating') {
                trendHtml = '<span style="color: #236B48; font-size: 11px; margin-right: 4px;" title="Tâm lý hạ nhiệt">↓</span>';
            }

            let vipTag = '';
            if (conv.isVipAttention) {
                vipTag = '<span style="color: #236B48; font-size: 11px; font-weight: 600; margin-left: 6px;">• VIP Lưu ý</span>';
            }

            const isMember = Boolean(conv.customerId && conv.customerId !== 'guest');
            const memberBadge = isMember 
                ? `<span class="conv-member-badge">${escapeHtml(conv.tier || 'Thành viên')}</span>` 
                : '';

            const handoverTag = `<span class="admin-badge badge-neutral" style="font-size: 10.5px; height: 20px; padding: 0 6px;">${conv.isHandover ? 'Nhân viên' : 'Bot'}</span>`;
            const sla = formatSlaInfo(conv.waitingSeconds, conv.isHandover);

            const item = document.createElement('div');
            item.className = `conversation-item ${isMember ? 'is-member' : 'is-guest'} ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <div class="conversation-item-top">
                    <span class="conv-cust-name">${escapeHtml(conv.customerName || 'Khách hàng')}${memberBadge}${vipTag}</span>
                    <span class="conv-time">${escapeHtml(conv.updatedAt || '')}</span>
                </div>
                <div class="conversation-item-mid">
                    <span class="conv-snippet">${escapeHtml(snippet)}</span>
                </div>
                <div class="conversation-item-bottom">
                    <div class="conv-bottom-left">
                        ${trendHtml}${sentimentDot}
                        ${handoverTag}
                        <span class="sla-timer-pill ${sla.className} sla-pill-${conv.id}">${sla.text}</span>
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                // Xóa bỏ sạch sẽ các raw content đã mở trước đó khỏi bộ nhớ (G2-05)
                if (PawpalChatbot.state?.liveConversations) {
                    PawpalChatbot.state.liveConversations.forEach(c => {
                        c.messages?.forEach(m => { delete m.unlockedRawContent; });
                    });
                }
                PawpalChatbot.state.currentConversation = conv;
                sessionStorage.setItem('pawpal_admin_chatbot_conv_id', conv.id);
                renderConversationsList();
                renderCurrentChat();
                PawpalChatbot.loadConversationDetails?.(conv);
                PawpalChatbot.updateBreadcrumb?.(conv.customerName);
            });

            container.appendChild(item);
        });
    }

    function renderCurrentChat() {
        const timeline=document.getElementById('chatMessagesTimeline');
        const info=document.getElementById('chatCustomerInfoData');
        const placeholder=document.getElementById('chatCustomerInfoLoading');
        const ready=PawpalChatbot.state.liveLoaded && !PawpalChatbot.state.liveLoadError && PawpalChatbot.state.currentConversation;
        if(info)info.style.display=ready ? '' : 'none';
        if(placeholder){placeholder.style.display=ready ? 'none' : '';if(PawpalChatbot.state.liveLoadError)placeholder.textContent=PawpalChatbot.state.liveLoadError;else if(PawpalChatbot.state.liveLoaded && !ready)placeholder.textContent='Chưa chọn hội thoại.';}

        if (PawpalChatbot.state.liveLoadError) { if(timeline)timeline.textContent=PawpalChatbot.state.liveLoadError; return; }
        if (!PawpalChatbot.state.liveLoaded) {
            if(timeline)timeline.innerHTML='<div role="status" aria-label="Đang tải hội thoại" style="padding:24px;"><span class="skeleton-text" style="width:65%;"></span><span class="skeleton-text" style="width:85%;margin-top:16px;"></span></div>';
            return;
        }

        const currentConversation = PawpalChatbot.state?.currentConversation;
        if (!currentConversation) { if(timeline)timeline.textContent="Chọn một hội thoại để xem nội dung."; return; }

        if (currentConversation.id) {
            subscribeToConversationRoom(currentConversation.id);
        }

        const nameEl = document.getElementById('currentChatCustomerName');
        const sentimentBadgeEl = document.getElementById('currentChatSentimentBadge');
        const takeoverBtn = document.getElementById('btnToggleTakeover');
        const aiSummaryTextEl = document.getElementById('aiContextSummaryText');
        const composerStatusEl = document.getElementById('composerModeStatus');

        if (nameEl) nameEl.textContent = currentConversation.customerName;

        if (sentimentBadgeEl) {
            const shortSentiment = (() => {
                const level = currentConversation.sentimentLevel;
                if (level >= 5) return '• Giận dữ';
                if (level === 4) return '• Bực bội';
                if (level === 3) return '• Cần lưu ý';
                if (level === 2) return '• Thắc mắc';
                return '';
            })();
            if (shortSentiment) {
                sentimentBadgeEl.style.display = 'inline-block';
                sentimentBadgeEl.textContent = shortSentiment;
                sentimentBadgeEl.className = currentConversation.sentimentLevel >= 4 ? 'alert-indicator text-danger' : 'alert-indicator text-warning';
                sentimentBadgeEl.style.fontSize = '12px';
                sentimentBadgeEl.style.fontWeight = '600';
            } else {
                sentimentBadgeEl.style.display = 'none';
            }
        }

        const headerSla = document.getElementById('currentChatSlaBadge');
        if (headerSla) {
            const sla = formatSlaInfo(currentConversation.waitingSeconds, currentConversation.isHandover);
            headerSla.textContent = sla.text;
            headerSla.className = `sla-timer-pill ${sla.className}`;
        }

        const resolveHeaderBtn = document.getElementById('btnHeaderResolveChat');
        if (takeoverBtn) {
            takeoverBtn.textContent = currentConversation.isHandover ? 'Trả lại AI' : 'Tiếp nhận';
            takeoverBtn.className = 'admin-btn btn-takeover-compact ' + (currentConversation.isHandover ? 'admin-btn-secondary' : 'admin-btn-primary');
        }

        if (resolveHeaderBtn) {
            resolveHeaderBtn.style.display = currentConversation.isHandover ? 'inline-flex' : 'none';
        }

        if (aiSummaryTextEl) {
            aiSummaryTextEl.textContent = currentConversation.aiSummary;
        }

        if (composerStatusEl) {
            composerStatusEl.innerHTML = currentConversation.isHandover
                ? 'Chế độ: <strong>Nhân viên trực tiếp (Đang mở)</strong>'
                : 'Chế độ: <em>Bot tự động (Bấm "Tiếp nhận" để trả lời)</em>';
        }

        const timelineEl = document.getElementById('chatMessagesTimeline');
        if (timelineEl) {
            timelineEl.innerHTML = '';
            currentConversation.messages.forEach(msg => {
                if (msg.type && msg.type.startsWith('action-')) {
                    const cardWrap = document.createElement('div');
                    cardWrap.className = 'chat-bubble-wrap sender-agent';

                    if (msg.type === 'action-reward') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-reward">
                                <div class="action-card-header">
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #165335; font-size: 12.5px;">Bồi hoàn Pawpoint (Supabase)</span>
                                    <span class="action-card-time">${escapeHtml(msg.time)}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-reward-pts">+${escapeHtml(msg.rewardData?.points)} Pawpoint</div>
                                    <div class="action-card-meta">
                                        <div><strong>Lý do:</strong> ${escapeHtml(msg.rewardData?.reason)}</div>
                                        <div><strong>Mã bồi hoàn:</strong> ${escapeHtml(msg.rewardData?.txId)}</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${escapeHtml(msg.text)}</div>
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
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #734718; font-size: 12.5px;">Biên bản Vé Ticket (Supabase)</span>
                                    <span class="action-card-time">${escapeHtml(msg.time)}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-ticket-title">${escapeHtml(msg.ticketData?.id)}: ${escapeHtml(msg.ticketData?.title)}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Phân loại:</strong> ${escapeHtml(msg.ticketData?.category)}</div>
                                        <div><strong>Tham chiếu:</strong> ${escapeHtml(msg.ticketData?.refId || 'Đơn hàng hiện tại')}</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${escapeHtml(msg.text)}</div>
                                </div>
                                <div class="action-card-footer">
                                    <button type="button" class="btn-card-action btn-jump-ticket" data-id="${escapeHtml(msg.ticketData?.id)}">Mở vé trong Khiếu nại</button>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-escalate') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-escalate">
                                <div class="action-card-header">
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #8F2424; font-size: 12.5px;">Chuyển cấp Quản lý</span>
                                    <span class="action-card-time">${escapeHtml(msg.time)}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-escalate-target">Tiếp nhận: <strong>${escapeHtml(msg.escalateData?.targetName)}</strong></div>
                                    <div class="action-card-meta">
                                        <div><strong>Lý do:</strong> ${escapeHtml(msg.escalateData?.reason)}</div>
                                        ${msg.escalateData?.notes ? `<div><strong>Ghi chú:</strong> ${escapeHtml(msg.escalateData.notes)}</div>` : ''}
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${escapeHtml(msg.text)}</div>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-tracking') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-tracking">
                                <div class="action-card-header">
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #20495E; font-size: 12.5px;">Vận đơn Hỏa tốc</span>
                                    <span class="action-card-time">${escapeHtml(msg.time)}</span>
                                </div>
                                <div class="action-card-body">
                                    <div style="font-weight: 700; color: #20495E;">${escapeHtml(msg.trackingData?.orderId)} • ${escapeHtml(msg.trackingData?.carrier)}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Bưu tá:</strong> ${escapeHtml(msg.trackingData?.shipperName)} (${escapeHtml(msg.trackingData?.shipperPhone)})</div>
                                        <div><strong>Vị trí:</strong> ${escapeHtml(msg.trackingData?.location)} (${escapeHtml(msg.trackingData?.status)})</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${escapeHtml(msg.text)}</div>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-camera') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-camera">
                                <div class="action-card-header">
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #165335; font-size: 12.5px;">Camera Giám sát</span>
                                    <span class="action-card-time">${escapeHtml(msg.time)}</span>
                                </div>
                                <div class="action-card-body">
                                    <div style="font-weight: 700; color: #236B48;">${escapeHtml(msg.cameraData?.roomName)} • ${escapeHtml(msg.cameraData?.petName)}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Tình trạng:</strong> ${escapeHtml(msg.cameraData?.caption)}</div>
                                        <div><strong>Môi trường:</strong> ${escapeHtml(msg.cameraData?.temp)} | ${escapeHtml(msg.cameraData?.humidity)}</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${escapeHtml(msg.text)}</div>
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
                    marker.innerHTML = `<span class="chat-system-marker-text">${escapeHtml(msg.text)}</span>`;
                    timelineEl.appendChild(marker);
                    return;
                }

                const wrap = document.createElement('div');
                wrap.className = `chat-bubble-wrap sender-${msg.sender}`;

                let authorText = '';
                let senderBadge = '';
                if (msg.sender === 'user') {
                    authorText = escapeHtml(currentConversation.customerName || 'Khách hàng');
                } else if (msg.sender === 'bot') {
                    authorText = 'PawPal Bot';
                    senderBadge = '<span class="admin-badge badge-neutral" style="font-size: 11px; padding: 1px 6px;">AI tự động</span>';
                } else {
                    authorText = escapeHtml(msg.agentName || 'Chuyên viên CSKH');
                    senderBadge = '<span class="admin-badge badge-active" style="font-size: 11px; padding: 1px 6px;">Nhân viên CSKH</span>';
                }

                let bubbleContent = '';
                if (msg.isToxic) {
                    const level = msg.activeMaskLevel || 'words';
                    let contentHtml = '';
                    if (level === 'full') {
                        contentHtml = `<span class="toxic-text-full">${escapeHtml(msg.fullMaskedText || '[Nội dung kích động đã được màng lọc tâm lý che mờ: ***]')}</span>`;
                    } else if (level === 'words') {
                        const highlighted = escapeHtml(msg.maskedWordsText || msg.text).replace(/\*\*\*/g, '<span class="toxic-asterisk-badge">***</span>');
                        contentHtml = `<span class="toxic-text-words">${highlighted}</span>`;
                    } else {
                        const canReadRaw = hasRawContentPermission();
                        if (canReadRaw) {
                            if (msg.unlockedRawContent) {
                                contentHtml = `<span class="toxic-text-raw">${escapeHtml(msg.unlockedRawContent)}</span>`;
                            } else {
                                const highlighted = escapeHtml(msg.maskedWordsText || msg.text || '***').replace(/\*\*\*/g, '<span class="toxic-asterisk-badge">***</span>');
                                contentHtml = `<span class="toxic-text-words">${highlighted}</span> <button type="button" class="btn-unlock-raw-inline" data-msg-id="${msg.id || ''}" style="margin-left: 8px; padding: 2px 8px; border-radius: var(--admin-radius); background: #236B48; color: #fff; border: none; font-size: 11px; cursor: pointer;">Mở xem nguyên văn</button>`;
                            }
                        } else {
                            contentHtml = `<span class="toxic-text-full">[Bạn không có quyền chat.raw.read để xem nguyên văn nội dung này]</span>`;
                        }
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
                    bubbleContent = formatAdminChatText(msg.text);
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

            timelineEl.querySelectorAll('.chat-attachment-image-wrap').forEach(w => {
                w.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = w.getAttribute('data-img-url');
                    const caption = w.getAttribute('data-img-caption');
                    PawpalChatbot.openAdminImageLightbox?.(url, caption);
                });
            });

            timelineEl.querySelectorAll('.toxic-dots-wrap').forEach(w => {
                const dotsBtn = w.querySelector('.btn-toxic-dots');
                const dropdown = w.querySelector('.toxic-dots-dropdown');

                dotsBtn?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    timelineEl.querySelectorAll('.toxic-dots-wrap.open').forEach(other => {
                        if (other !== w) other.classList.remove('open');
                    });
                    w.classList.toggle('open');
                });

                dropdown?.querySelectorAll('.toxic-dots-item').forEach(item => {
                    item.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const targetLevel = item.getAttribute('data-level');
                        const msgId = w.getAttribute('data-msg-id');
                        const targetMsg = currentConversation.messages.find(m => m.id === msgId);
                        if (!targetMsg) return;

                        if (targetLevel === 'raw') {
                            if (!hasRawContentPermission()) {
                                PawpalChatbot.showToast?.('Bạn không có quyền chat.raw.read để xem nguyên văn nội dung này.', 'warning');
                                return;
                            }
                            if (targetMsg.unlockedRawContent) {
                                targetMsg.activeMaskLevel = 'raw';
                                renderCurrentChat();
                                return;
                            }
                            if (typeof PawpalChatbot.showChatbotConfirmModal === 'function') {
                                PawpalChatbot.showChatbotConfirmModal({
                                    title: 'Cảnh báo nội dung độc hại',
                                    message: 'Tin nhắn này chứa ngôn từ kích động / vi phạm tiêu chuẩn cộng đồng. Bạn có chắc chắn muốn mở xem nguyên văn để phục vụ kiểm toán / xử lý vi phạm?',
                                    confirmText: 'Xem nguyên văn',
                                    isDanger: true,
                                    onConfirm: async () => {
                                        await requestUnlockRawMessage(targetMsg);
                                    }
                                });
                            } else {
                                await requestUnlockRawMessage(targetMsg);
                            }
                            return;
                        }

                        targetMsg.activeMaskLevel = targetLevel;
                        renderCurrentChat();
                    });
                });
            });

            timelineEl.querySelectorAll('.btn-unlock-raw-inline').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const msgId = btn.getAttribute('data-msg-id');
                    const targetMsg = currentConversation.messages.find(m => m.id === msgId);
                    if (targetMsg) {
                        if (typeof PawpalChatbot.showChatbotConfirmModal === 'function') {
                            PawpalChatbot.showChatbotConfirmModal({
                                title: 'Cảnh báo nội dung độc hại',
                                message: 'Tin nhắn này chứa ngôn từ kích động / vi phạm tiêu chuẩn cộng đồng. Bạn có chắc chắn muốn mở xem nguyên văn để phục vụ kiểm toán / xử lý vi phạm?',
                                confirmText: 'Xem nguyên văn',
                                isDanger: true,
                                onConfirm: async () => {
                                    await requestUnlockRawMessage(targetMsg);
                                }
                            });
                        } else {
                            requestUnlockRawMessage(targetMsg);
                        }
                    }
                });
            });

            document.addEventListener('click', () => {
                timelineEl.querySelectorAll('.toxic-dots-wrap.open').forEach(w => w.classList.remove('open'));
            }, { once: false, capture: false });

            timelineEl.scrollTop = timelineEl.scrollHeight;
        }

        renderSmartSuggestions();
        renderCustomerInfoPanel();
    }

    function renderSmartSuggestions() {
        const box = document.getElementById('aiSmartSuggestionsBox');
        if (!box) return;

        const currentConversation = PawpalChatbot.state?.currentConversation;
        const list = (currentConversation && currentConversation.smartResponses && currentConversation.smartResponses.length > 0)
            ? currentConversation.smartResponses
            : defaultSmartSuggestions;

        box.style.display = 'flex';
        currentSuggestIndex = Math.min(currentSuggestIndex, list.length - 1);
        if (currentSuggestIndex < 0) currentSuggestIndex = 0;
        const item = list[currentSuggestIndex];

        const tagEl = document.getElementById('suggestCarouselTag');
        const textEl = document.getElementById('suggestCarouselText');

        if (tagEl && item) tagEl.textContent = item.tag;
        if (textEl && item) textEl.textContent = item.text;
    }

    function renderCustomerInfoPanel() {
        const currentConversation = PawpalChatbot.state?.currentConversation;
        if (!currentConversation) return;

        const custNameEl = document.getElementById('infoCustomerName');
        const custTierEl = document.getElementById('infoCustomerTier');
        const custPhoneEl = document.getElementById('infoCustomerPhone');
        const custPointsEl = document.getElementById('infoCustomerPoints');
        const petsListEl = document.getElementById('infoPetsList');
        const recentOrderEl = document.getElementById('infoRecentOrder');
        const recentBookingEl = document.getElementById('infoRecentBooking');
        const ticketsListEl = document.getElementById('infoOpenTicketsList');
        const internalNoteInput = document.getElementById('chatInternalNoteInput');

        if (custNameEl) custNameEl.textContent = currentConversation.customerName || 'Khách hàng';
        if (custTierEl) custTierEl.textContent = currentConversation.tier || '—';
        if (custPhoneEl) custPhoneEl.textContent = currentConversation.phone || '—';
        if (custPointsEl) custPointsEl.textContent = `${(currentConversation.pawpoints || 0).toLocaleString('vi-VN')} điểm`;

        if (petsListEl) {
            petsListEl.innerHTML = '';
            if (currentConversation.pets && currentConversation.pets.length > 0) {
                currentConversation.pets.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'pet-mini-card';
                    const notesHtml = (p.notes === 'Bình thường' || !p.notes)
                        ? '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>'
                        : `<span style="font-size: 11.5px; color: ${String(p.notes).includes('Dị ứng') || String(p.notes).includes('sợ') ? '#DC2626' : 'var(--text-muted)'};">${escapeHtml(p.notes)}</span>`;
                    card.innerHTML = `
                        <span class="pet-mini-name">${escapeHtml(p.name)} (${escapeHtml(p.breed)})</span>
                        ${notesHtml}
                    `;
                    petsListEl.appendChild(card);
                });
            } else {
                petsListEl.innerHTML = '<span style="color: var(--text-muted); font-size: 12.5px;">Chưa đăng ký thú cưng</span>';
            }
        }

        if (recentOrderEl) {
            if (currentConversation.recentOrder) {
                recentOrderEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${escapeHtml(currentConversation.recentOrder.id)}">${escapeHtml(currentConversation.recentOrder.id)}</a> (${escapeHtml(currentConversation.recentOrder.status)})`;
            } else {
                recentOrderEl.textContent = 'Chưa có đơn hàng';
            }
        }

        if (recentBookingEl) {
            if (currentConversation.recentBooking) {
                recentBookingEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${escapeHtml(currentConversation.recentBooking.id)}">${escapeHtml(currentConversation.recentBooking.id)}</a> (${escapeHtml(currentConversation.recentBooking.status)})`;
            } else {
                recentBookingEl.textContent = 'Chưa có lịch hẹn';
            }
        }

        if (ticketsListEl) {
            ticketsListEl.innerHTML = '';
            if (currentConversation.openTickets && currentConversation.openTickets.length > 0) {
                currentConversation.openTickets.forEach(t => {
                    const el = document.createElement('div');
                    el.style.marginBottom = '6px';
                    el.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-ticket" data-id="${escapeHtml(t.id)}">${escapeHtml(t.id)}</a>: ${escapeHtml(t.title)}`;
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

    async function ensureRealConversation(conv) {
        if (!conv || !supabase) return conv ? conv.id : null;
        if (conv.isRealDb && conv.id) return conv.id;

        try {
            if (conv.customerId) {
                const { data: existing } = await supabase
                    .from('chat_conversation')
                    .select('id')
                    .eq('customer_id', conv.customerId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (existing && existing.id) {
                    conv.id = existing.id;
                    conv.isRealDb = true;
                    return existing.id;
                }

                const { data: created, error: crErr } = await supabase
                    .from('chat_conversation')
                    .insert([{
                        customer_id: conv.customerId,
                        status: conv.isHandover ? 'agent_handling' : 'bot_handling',
                        sentiment_level: conv.sentimentLevel || 2,
                        is_urgent: conv.isUrgent || false,
                        ai_summary: conv.aiSummary || 'Phiên tiếp nhận hỗ trợ khách hàng',
                        channel: 'web'
                    }])
                    .select('id')
                    .single();

                if (!crErr && created) {
                    conv.id = created.id;
                    conv.isRealDb = true;
                    return created.id;
                }
            }
        } catch (err) {
            console.warn('[Chatbot] Lỗi ensureRealConversation:', err.message);
        }
        return conv.id;
    }

    function clearAdminAttachment() {
        pendingAdminAttachment = null;
        const adminFileInput = document.getElementById('adminChatFileInput');
        const adminAttachPreview = document.getElementById('adminChatAttachPreview');
        if (adminFileInput) adminFileInput.value = '';
        if (adminAttachPreview) adminAttachPreview.style.display = 'none';
    }

    async function sendLiveMsg() {
        if (isSendingLiveMsg) return; // PR-02: Chặn click liên tục gửi nhiều bản tin (CB-20)
        const currentConversation = PawpalChatbot.state?.currentConversation;
        if (!currentConversation) return;

        const msgInput = document.getElementById('chatMessageInput');
        const sendMsgBtn = document.getElementById('btnSendLiveMessage');
        const text = msgInput ? msgInput.value.trim() : '';
        if (!text && !pendingAdminAttachment) return;

        if (!currentConversation.isHandover) {
            PawpalChatbot.showToast?.('Vui lòng bấm nút "Tiếp nhận" trước khi gửi tin nhắn cho khách hàng.', 'warning');
            return;
        }

        isSendingLiveMsg = true;
        if (sendMsgBtn) {
            sendMsgBtn.disabled = true;
            sendMsgBtn.style.opacity = '0.6';
        }

        let fullText = text;
        if (pendingAdminAttachment) {
            let imageSource = null;
            if (pendingAdminAttachment.file && supabase && supabase.storage) {
                try {
                    const ext = (pendingAdminAttachment.file.name || 'image.jpg').split('.').pop().toLowerCase();
                    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
                    const filePath = `staff/${fileName}`;
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                        .from('chat-attachments')
                        .upload(filePath, pendingAdminAttachment.file, { cacheControl: '3600', upsert: false });
                    if (!uploadErr && uploadData) {
                        const { data: publicData } = supabase.storage
                            .from('chat-attachments')
                            .getPublicUrl(filePath);
                        imageSource = publicData?.publicUrl || filePath;
                    }
                } catch (stErr) {
                    console.warn('[Staff Storage] Lỗi upload tệp:', stErr);
                }
            }
            if (!imageSource) {
                imageSource = (pendingAdminAttachment.size <= 65536) ? pendingAdminAttachment.dataUrl : `[Ảnh đính kèm: ${pendingAdminAttachment.name}]`;
            }
            const imgMd = `![${pendingAdminAttachment.name}](${imageSource})`;
            fullText = text ? `${text}\n${imgMd}` : imgMd;
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const localMsgId = 'msg-staff-' + Date.now();
        currentConversation.messages.push({
            id: localMsgId,
            sender: 'agent',
            agentName: 'Chuyên viên CSKH',
            time: timeStr,
            text: fullText
        });

        clearTimeout(staffTypingStopTimer);
        isStaffTypingActive = false;
        notifyAdminTyping(false);
        const customerTypingBar = document.getElementById('customerTypingBar');
        if (customerTypingBar) customerTypingBar.style.display = 'none';

        if (msgInput) msgInput.value = '';
        const savedAttachment = pendingAdminAttachment;
        clearAdminAttachment();
        renderCurrentChat();

        try {
            if (supabase) {
                const convId = await ensureRealConversation(currentConversation);
                if (!convId) {
                    throw new Error('Không xác định được mã phiên hội thoại trong CSDL');
                }

                const { data: insertedMsg, error: msgErr } = await supabase
                    .from('chat_message')
                    .insert([{
                        conversation_id: convId,
                        sender_type: 'staff',
                        sender_name: 'Chuyên viên CSKH',
                        content: fullText,
                        raw_content: fullText,
                        is_toxic: false
                    }])
                    .select('id')
                    .single();

                if (msgErr) {
                    throw msgErr;
                }

                if (insertedMsg) {
                    const localM = currentConversation.messages.find(m => m.id === localMsgId);
                    if (localM) localM.id = insertedMsg.id;
                }

                await supabase
                    .from('chat_conversation')
                    .update({
                        updated_at: new Date().toISOString(),
                        status: 'agent_handling'
                    })
                    .eq('id', convId);
            }
        } catch (dbErr) {
            console.error('[Chatbot] Lỗi lưu tin nhắn nhân viên vào Supabase:', dbErr);
            // Khôi phục trạng thái khi gửi thất bại (G1-04: draft preservation, honest error reporting)
            currentConversation.messages = currentConversation.messages.filter(m => m.id !== localMsgId);
            if (msgInput) msgInput.value = text;
            if (savedAttachment) {
                pendingAdminAttachment = savedAttachment;
                const adminAttachPreview = document.getElementById('adminChatAttachPreview');
                const adminAttachPreviewImg = document.getElementById('adminChatAttachPreviewImg');
                if (adminAttachPreviewImg) adminAttachPreviewImg.src = savedAttachment.dataUrl;
                if (adminAttachPreview) adminAttachPreview.style.display = 'flex';
            }
            renderCurrentChat();
            PawpalChatbot.showToast?.(`Gửi tin nhắn thất bại: ${dbErr?.message || 'Lỗi kết nối CSDL'}. Bản nháp đã được giữ lại.`, 'error');
        } finally {
            isSendingLiveMsg = false;
            if (sendMsgBtn) {
                sendMsgBtn.disabled = false;
                sendMsgBtn.style.opacity = '1';
            }
        }
    }

    let isLiveChatEventsInitialized = false;

    function initLiveChatSubtab() {
        if (!isLiveChatEventsInitialized) {
            setupLiveChatEventListeners();
            isLiveChatEventsInitialized = true;
        }

        // Khởi chạy đồng hồ SLA ticker
        startSlaTicker();
        renderConversationsList();
        renderCurrentChat();

        if (!PawpalChatbot.state?.liveConversations || PawpalChatbot.state.liveConversations.length === 0) {
            PawpalChatbot.loadInboxSummary?.();
        }

        window.addEventListener('beforeunload', unsubscribeConversationRoom);
    }

    function setupLiveChatEventListeners() {
        // Tab lọc
        document.querySelectorAll('.inbox-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter') || 'all';
                if (PawpalChatbot.state) PawpalChatbot.state.currentFilterTab = filter;
                sessionStorage.setItem('pawpal_admin_chatbot_filter_tab', filter);
                document.querySelectorAll('.inbox-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderConversationsList();
            });
        });

        // Tìm kiếm
        let inboxSearchTimer = null;
        document.getElementById('inboxSearchInput')?.addEventListener('input', () => {
            clearTimeout(inboxSearchTimer);
            inboxSearchTimer = setTimeout(() => {
                renderConversationsList();
            }, 300);
        });

        // NÚT 3 CHẤM
        const dotsWrap = document.getElementById('chatActionsMenuWrap');
        const dotsBtn = document.getElementById('btnChatActionsDots');
        if (dotsBtn && dotsWrap) {
            dotsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dotsWrap.classList.toggle('open');
            });
            document.addEventListener('click', (e) => {
                if (!dotsWrap.contains(e.target)) {
                    dotsWrap.classList.remove('open');
                }
            });
            dotsWrap.querySelectorAll('.chat-action-item').forEach(item => {
                item.addEventListener('click', () => {
                    dotsWrap.classList.remove('open');
                });
            });
        }

        // Tiếp nhận / Hoàn trả
        document.getElementById('btnToggleTakeover')?.addEventListener('click', async () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;

            currentConversation.isHandover = !currentConversation.isHandover;
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const sysMsgText = currentConversation.isHandover
                ? `Hệ thống: PawPal Bot đã tạm dừng. Chuyên viên CSKH đã tiếp quản ca chat lúc ${timeStr}`
                : `Hệ thống: Ca chat đã được hỗ trợ trực tiếp xong. Quyền điều phối tự động được hoàn trả cho PawPal Bot lúc ${timeStr}`;

            currentConversation.messages.push({
                sender: 'system',
                time: timeStr,
                text: sysMsgText
            });

            if (currentConversation.isHandover) {
                currentConversation.messages.push({
                    sender: 'agent',
                    agentName: 'Chuyên viên CSKH',
                    time: timeStr,
                    text: 'Dạ PawPal xin chào sen! Em là chuyên viên CSKH đã tiếp nhận ca chat để hỗ trợ trực tiếp cho sen ngay đây ạ!'
                });
                currentConversation.waitingSeconds = 0;
            }

            renderConversationsList();
            renderCurrentChat();

            if (supabase) {
                try {
                    const convId = await ensureRealConversation(currentConversation);
                    if (convId) {
                        const newStatus = currentConversation.isHandover ? 'agent_handling' : 'bot_handling';
                        await supabase
                            .from('chat_conversation')
                            .update({
                                status: newStatus,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', convId);

                        await supabase
                            .from('chat_message')
                            .insert([{
                                conversation_id: convId,
                                sender_type: 'staff',
                                sender_name: 'Hệ thống PawPal',
                                content: sysMsgText,
                                raw_content: sysMsgText,
                                is_toxic: false
                            }]);
                    }
                } catch (takeoverErr) {
                    console.error('[Chatbot] Lỗi cập nhật tiếp quản vào Supabase:', takeoverErr);
                }
            }
        });

        // Gửi tin nhắn
        const sendMsgBtn = document.getElementById('btnSendLiveMessage');
        const msgInput = document.getElementById('chatMessageInput');

        sendMsgBtn?.addEventListener('click', sendLiveMsg);
        msgInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendLiveMsg();
            }
        });

        msgInput?.addEventListener('input', handleStaffTyping);

        // Đính kèm ảnh
        const btnAdminAttach = document.getElementById('btnAdminChatAttach');
        const adminFileInput = document.getElementById('adminChatFileInput');
        const adminAttachPreview = document.getElementById('adminChatAttachPreview');
        const adminAttachPreviewImg = document.getElementById('adminChatAttachPreviewImg');
        const adminAttachPreviewName = document.getElementById('adminChatAttachPreviewName');
        const adminAttachPreviewSize = document.getElementById('adminChatAttachPreviewSize');
        const adminAttachPreviewRemove = document.getElementById('adminChatAttachPreviewRemove');

        btnAdminAttach?.addEventListener('click', () => adminFileInput?.click());
        adminFileInput?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedMimes.includes(file.type)) {
                PawpalChatbot.showToast?.('Định dạng tệp không được hỗ trợ. Vui lòng chỉ gửi ảnh JPEG, PNG hoặc WebP.', 'warning');
                adminFileInput.value = '';
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                PawpalChatbot.showToast?.('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.', 'warning');
                adminFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                pendingAdminAttachment = {
                    file: file,
                    name: file.name,
                    size: file.size,
                    dataUrl: dataUrl
                };
                if (adminAttachPreviewImg) adminAttachPreviewImg.src = dataUrl;
                if (adminAttachPreviewName) adminAttachPreviewName.textContent = file.name;
                if (adminAttachPreviewSize) {
                    const kb = Math.round(file.size / 1024);
                    adminAttachPreviewSize.textContent = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
                }
                if (adminAttachPreview) adminAttachPreview.style.display = 'flex';
                if (msgInput) msgInput.focus();
            };
            reader.readAsDataURL(file);
        });
        adminAttachPreviewRemove?.addEventListener('click', clearAdminAttachment);

        // Lưu ghi chú nội bộ
        const saveNoteButton = document.getElementById('btnSaveChatInternalNote');
        if (saveNoteButton && saveNoteButton.dataset.noteBound !== 'true') {
            saveNoteButton.dataset.noteBound = 'true';
            saveNoteButton.addEventListener('click', async () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;

            const note = document.getElementById('chatInternalNoteInput')?.value || '';
            currentConversation.internalNotes = note;

            if (!supabase) {
                PawpalChatbot.showToast?.('Không xác định được phiên chat để lưu ghi chú.', 'error');
                return;
            }
            try {
                const conversationId = await ensureRealConversation(currentConversation);
                if (!conversationId) throw new Error('Missing conversation id');
                const { data: savedConversation, error: conversationError } = await supabase
                    .from('chat_conversation')
                    .update({ internal_note: note })
                    .eq('id', conversationId)
                    .select('id, internal_note')
                    .single();
                if (conversationError) throw conversationError;
                if (!savedConversation || savedConversation.internal_note !== note) throw new Error('Saved note could not be verified');
                if (currentConversation.customerId && !currentConversation.isRealDb) {
                    const { error: customerError } = await supabase
                        .from('customer')
                        .update({ note })
                        .eq('id', currentConversation.customerId);
                    if (customerError) throw customerError;
                }
            } catch (e) {
                console.error('Lỗi khi lưu note vào Supabase:', e);
                PawpalChatbot.showToast?.(`Không thể lưu ghi chú: ${e?.message || 'Lỗi CSDL hoặc quyền truy cập'}`, 'error');
                return;
            }
            PawpalChatbot.showToast?.('Đã lưu ghi chú nội bộ an toàn trên Supabase Live DB!', 'success');
            });
        }

        // Smart Suggestions carousel
        document.getElementById('btnSuggestPrev')?.addEventListener('click', () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            const list = (currentConversation?.smartResponses?.length) ? currentConversation.smartResponses : defaultSmartSuggestions;
            const total = list.length;
            currentSuggestIndex = (currentSuggestIndex - 1 + total) % total;
            renderSmartSuggestions();
        });

        document.getElementById('btnSuggestNext')?.addEventListener('click', () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            const list = (currentConversation?.smartResponses?.length) ? currentConversation.smartResponses : defaultSmartSuggestions;
            const total = list.length;
            currentSuggestIndex = (currentSuggestIndex + 1) % total;
            renderSmartSuggestions();
        });

        document.getElementById('btnApplySuggest')?.addEventListener('click', () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            const list = (currentConversation?.smartResponses?.length) ? currentConversation.smartResponses : defaultSmartSuggestions;
            const item = list[currentSuggestIndex];
            const input = document.getElementById('chatMessageInput');
            if (input && item) {
                input.value = item.text;
                input.focus();
            }
        });

        // ====================================================================
        // HELPER TRUY XUẤT HỘI THOẠI AN TOÀN CHO CÁC MODAL THAO TÁC
        // ====================================================================
        function getCurrentConversationSafe() {
            if (PawpalChatbot.state?.currentConversation && PawpalChatbot.state.currentConversation.id) {
                return PawpalChatbot.state.currentConversation;
            }
            if (PawpalChatbot.state?.liveConversations && PawpalChatbot.state.liveConversations.length > 0) {
                return PawpalChatbot.state.liveConversations[0];
            }
            return null;
        }

        // ====================================================================
        // MODAL 1: TẶNG ĐIỂM PAWPOINT BỒI HOÀN
        // ====================================================================
        const btnOpenReward = document.getElementById('btnRewardPoints');
        const btnConfirmReward = document.getElementById('btnConfirmRewardPoints');
        const rewardCustName = document.getElementById('rewardCustomerName');
        const inputPoints = document.getElementById('inputCustomRewardPoints');

        btnOpenReward?.addEventListener('click', () => {
            const currentConversation = getCurrentConversationSafe();
            if (!currentConversation || !currentConversation.id) {
                PawpalChatbot.showToast?.('Vui lòng chọn một phiên hội thoại từ danh sách trước khi thực hiện thao tác.', 'warning');
                return;
            }
            if (rewardCustName) rewardCustName.value = currentConversation.customerName || '';
            PawpalChatbot.openModal?.('rewardPointsModalOverlay');
        });

        const closeRewardModal = () => { PawpalChatbot.closeModal?.('rewardPointsModalOverlay'); };

        document.querySelectorAll('.btn-preset-point').forEach(pBtn => {
            pBtn.addEventListener('click', () => {
                document.querySelectorAll('.btn-preset-point').forEach(b => b.classList.remove('active'));
                pBtn.classList.add('active');
                if (inputPoints) inputPoints.value = pBtn.getAttribute('data-point');
            });
        });

        btnConfirmReward?.addEventListener('click', async () => {
            const currentConversation = getCurrentConversationSafe();
            if (!currentConversation || !currentConversation.id) {
                PawpalChatbot.showToast?.('Vui lòng chọn một phiên hội thoại trước khi bồi hoàn điểm.', 'warning');
                return;
            }

            const pts = parseInt(inputPoints?.value, 10) || 50;
            const selectReason = document.getElementById('selectRewardReason');
            const reasonText = selectReason ? selectReason.options[selectReason.selectedIndex].text : 'Tạ lỗi vì sự cố dịch vụ';
            const staffToken = sessionStorage.getItem('pawpal_staff_token') || 'local:' + (sessionStorage.getItem('pawpal_staff_id') || 'd0000000-5555-5555-5555-555555555555');
            const idempotencyKey = 'reward-' + currentConversation.id + '-' + Date.now();

            btnConfirmReward.disabled = true;
            btnConfirmReward.textContent = 'Đang xử lý...';

            try {
                const res = await fetch('/api/admin/chat-actions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${staffToken}`
                    },
                    body: JSON.stringify({
                        action: 'CHAT_COMPENSATE_POINTS',
                        conversation_id: currentConversation.id,
                        customer_id: currentConversation.customerId,
                        points: pts,
                        reason: reasonText,
                        idempotency_key: idempotencyKey
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.ok) {
                    PawpalChatbot.showToast?.(data.error || 'Không thể bồi hoàn điểm.', 'error');
                    btnConfirmReward.disabled = false;
                    btnConfirmReward.textContent = 'Xác nhận bồi hoàn';
                    return;
                }

                currentConversation.pawpoints = data.balance_after;
                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                currentConversation.messages.push({
                    id: 'msg-reward-' + Date.now(),
                    sender: 'agent',
                    agentName: 'Hệ thống PawPal',
                    type: 'action-reward',
                    time: timeStr,
                    rewardData: {
                        points: data.points,
                        customerName: currentConversation.customerName,
                        reason: reasonText,
                        txId: data.transaction_id
                    },
                    text: `Đã nạp thành công +${data.points} điểm Pawpoint bồi hoàn vào ví tài khoản trên Supabase Live DB (Số dư mới: ${data.balance_after} điểm)!`
                });

                closeRewardModal();
                renderCurrentChat();
                renderCustomerInfoPanel?.();
                PawpalChatbot.showToast?.(`Đã tặng thành công +${data.points} điểm Pawpoint cho khách hàng!`, 'success');
            } catch (err) {
                console.error('Lỗi gọi API bồi hoàn điểm:', err);
                PawpalChatbot.showToast?.('Lỗi kết nối máy chủ khi bồi hoàn điểm: ' + err.message, 'error');
            } finally {
                btnConfirmReward.disabled = false;
                btnConfirmReward.textContent = 'Xác nhận bồi hoàn';
            }
        });

        // ====================================================================
        // MODAL 2: CHUYỂN TICKET (AUTOCOMPLETE GIAO DỊCH CHUẨN AGENTS.md)
        // ====================================================================
        const btnOpenConvert = document.getElementById('btnConvertToTicket');
        const btnConfirmConvert = document.getElementById('btnConfirmConvertTicket');
        const inputConvertRefId = document.getElementById('inputConvertRefId');
        const inputConvertTitle = document.getElementById('inputConvertTicketTitle');
        const convertTicketRefDropdown = document.getElementById('convertTicketRefDropdown');
        const convertTicketRefSelectedCard = document.getElementById('convertTicketRefSelectedCard');
        const selectedRefTitle = document.getElementById('selectedRefTitle');
        const selectedRefBadge = document.getElementById('selectedRefBadge');
        const selectedRefMeta = document.getElementById('selectedRefMeta');
        const btnClearSelectedRef = document.getElementById('btnClearSelectedRef');

        btnOpenConvert?.addEventListener('click', () => {
            const currentConversation = getCurrentConversationSafe();
            if (!currentConversation || !currentConversation.id) {
                PawpalChatbot.showToast?.('Vui lòng chọn một phiên hội thoại từ danh sách trước khi thực hiện thao tác.', 'warning');
                return;
            }
            const defaultRef = currentConversation.recentOrder ? currentConversation.recentOrder.id : (currentConversation.recentBooking ? currentConversation.recentBooking.id : '');
            if (inputConvertRefId) inputConvertRefId.value = defaultRef;
            if (inputConvertTitle) inputConvertTitle.value = '';
            if (convertTicketRefSelectedCard) convertTicketRefSelectedCard.style.display = 'none';
            PawpalChatbot.openModal?.('convertTicketModalOverlay');
        });

        function getSuggestedTransactions() {
            const currentConversation = getCurrentConversationSafe();
            const list = [];
            if (currentConversation?.recentOrder && currentConversation.recentOrder.id) {
                list.push({
                    code: currentConversation.recentOrder.id,
                    badge: 'Đơn hàng',
                    meta: `Đơn hàng #${currentConversation.recentOrder.id} (${currentConversation.recentOrder.status || 'Đang xử lý'})`
                });
            }
            if (currentConversation?.recentBooking && currentConversation.recentBooking.id) {
                list.push({
                    code: currentConversation.recentBooking.id,
                    badge: 'Lịch hẹn',
                    meta: `Lịch hẹn #${currentConversation.recentBooking.id} (${currentConversation.recentBooking.status || 'Đang thực hiện'})`
                });
            }
            return list;
        }

        function renderRefDropdown(query = '') {
            if (!convertTicketRefDropdown) return;
            const q = (query || '').toLowerCase().trim();
            const txs = getSuggestedTransactions().filter(t => !q || t.code.toLowerCase().includes(q) || t.meta.toLowerCase().includes(q) || t.badge.toLowerCase().includes(q));

            if (txs.length === 0) {
                convertTicketRefDropdown.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12.5px;">Không tìm thấy mã giao dịch phù hợp</div>`;
                convertTicketRefDropdown.style.display = 'block';
                return;
            }

            convertTicketRefDropdown.innerHTML = txs.map(t => `
                <div class="customer-autocomplete-item" data-ref-code="${t.code}" data-ref-badge="${t.badge}" data-ref-meta="${t.meta.replace(/"/g, '&quot;')}" style="padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #ECF2EE; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span style="font-weight: 600; color: #203A2C; font-size: 13px;">${t.code}</span>
                        <span style="color: #4F7A65; font-size: 11.5px;">${t.meta}</span>
                    </div>
                    <span class="admin-badge badge-neutral" style="font-size: 11px;">${t.badge}</span>
                </div>
            `).join('');
            convertTicketRefDropdown.style.display = 'block';

            convertTicketRefDropdown.querySelectorAll('.customer-autocomplete-item').forEach(itemEl => {
                itemEl.addEventListener('click', () => {
                    const code = itemEl.getAttribute('data-ref-code');
                    const badge = itemEl.getAttribute('data-ref-badge');
                    const meta = itemEl.getAttribute('data-ref-meta');
                    selectRefTransaction(code, badge, meta);
                });
            });
        }

        function selectRefTransaction(code, badge, meta) {
            if (inputConvertRefId) inputConvertRefId.value = code;
            if (selectedRefTitle) selectedRefTitle.textContent = code;
            if (selectedRefBadge) selectedRefBadge.textContent = badge;
            if (selectedRefMeta) selectedRefMeta.textContent = meta;
            if (convertTicketRefSelectedCard) convertTicketRefSelectedCard.style.display = 'block';
            if (convertTicketRefDropdown) convertTicketRefDropdown.style.display = 'none';
        }

        function clearSelectedRef() {
            if (inputConvertRefId) inputConvertRefId.value = '';
            if (convertTicketRefSelectedCard) convertTicketRefSelectedCard.style.display = 'none';
        }

        btnClearSelectedRef?.addEventListener('click', clearSelectedRef);

        inputConvertRefId?.addEventListener('focus', () => {
            renderRefDropdown(inputConvertRefId.value);
        });

        inputConvertRefId?.addEventListener('input', (e) => {
            renderRefDropdown(e.target.value);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.customer-autocomplete-wrapper')) {
                if (convertTicketRefDropdown) convertTicketRefDropdown.style.display = 'none';
            }
        });

        btnOpenConvert?.addEventListener('click', () => {
            const currentConversation = getCurrentConversationSafe();

            const defCode = currentConversation.recentOrder ? currentConversation.recentOrder.id : (currentConversation.recentBooking ? currentConversation.recentBooking.id : '');
            if (defCode) {
                const list = getSuggestedTransactions();
                const matched = list.find(l => l.code === defCode) || { code: defCode, badge: 'Đơn hàng', meta: 'Giao dịch gần nhất của khách hàng' };
                selectRefTransaction(matched.code, matched.badge, matched.meta);
            } else {
                clearSelectedRef();
            }

            if (inputConvertTitle) {
                inputConvertTitle.value = (currentConversation.aiSummary || 'Khách hàng cần hỗ trợ xử lý vấn đề').slice(0, 60) + '...';
            }
            PawpalChatbot.openModal?.('convertTicketModalOverlay');
        });

        const closeConvertModal = () => { PawpalChatbot.closeModal?.('convertTicketModalOverlay'); };

        btnConfirmConvert?.addEventListener('click', async () => {
            const currentConversation = getCurrentConversationSafe();
            if (!currentConversation || !currentConversation.id) {
                PawpalChatbot.showToast?.('Vui lòng chọn một phiên hội thoại trước khi lập ticket.', 'warning');
                return;
            }

            const title = inputConvertTitle?.value.trim() || 'Khiếu nại chuyển từ kênh chat trực tuyến';
            const selectCat = document.getElementById('selectConvertTicketCategory');
            const catVal = selectCat ? selectCat.value : 'service';
            const catText = selectCat ? selectCat.options[selectCat.selectedIndex].text : 'Khiếu nại Dịch vụ';
            const isServiceTicket = catVal === 'service' || catText.includes('Dịch vụ');

            const selectPri = document.getElementById('selectConvertPriority');
            const priText = selectPri ? selectPri.options[selectPri.selectedIndex].text : 'Trung bình';
            const normPriority = priText.includes('Cao') ? 'Cao' : (priText.includes('Thấp') ? 'Bình thường' : 'Trung bình');
            const refId = inputConvertRefId?.value.trim() || '';

            const chatTranscript = currentConversation.messages.map(m => {
                const senderLabel = m.sender === 'user'
                    ? currentConversation.customerName
                    : (m.sender === 'agent' ? (m.agentName || 'CSKH Trực tuyến') : 'PawPal AI Bot');
                return `[${m.time || ''}] ${senderLabel}: ${m.text || m.content || ''}`;
            }).join('\n');

            const staffToken = sessionStorage.getItem('pawpal_staff_token') || 'local:' + (sessionStorage.getItem('pawpal_staff_id') || 'd0000000-5555-5555-5555-555555555555');
            const idempotencyKey = 'ticket-' + currentConversation.id + '-' + Date.now();

            btnConfirmConvert.disabled = true;
            btnConfirmConvert.textContent = 'Đang lập vé...';

            try {
                const res = await fetch('/api/admin/chat-actions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${staffToken}`
                    },
                    body: JSON.stringify({
                        action: 'CHAT_CREATE_TICKET',
                        conversation_id: currentConversation.id,
                        customer_id: currentConversation.customerId,
                        title: title,
                        description: chatTranscript,
                        category: isServiceTicket ? 'service' : (catVal === 'booking' ? 'booking' : 'order'),
                        priority: normPriority,
                        ref_id: refId,
                        idempotency_key: idempotencyKey
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.ok) {
                    PawpalChatbot.showToast?.(data.error || 'Không thể tạo ticket khiếu nại.', 'error');
                    btnConfirmConvert.disabled = false;
                    btnConfirmConvert.textContent = 'Tạo Vé';
                    return;
                }

                const newTicketId = data.ticket_id;
                currentConversation.openTickets = currentConversation.openTickets || [];
                currentConversation.openTickets.push({
                    id: newTicketId,
                    title: data.title,
                    status: 'pending'
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
                        title: data.title,
                        category: catText,
                        priority: data.priority,
                        refId: refId || 'N/A'
                    },
                    text: `Đã trích xuất biên bản hội thoại và tạo thành công vé hỗ trợ chính thức mang mã định danh ${newTicketId} trong Supabase Live DB.`
                });

                closeConvertModal();
                renderCurrentChat();
                renderCustomerInfoPanel?.();
                PawpalChatbot.showToast?.(`Đã tạo vé khiếu nại ${newTicketId} thành công trên hệ thống!`, 'success');
            } catch (err) {
                console.error('Lỗi gọi API tạo ticket:', err);
                PawpalChatbot.showToast?.('Lỗi kết nối máy chủ khi tạo ticket: ' + err.message, 'error');
            } finally {
                btnConfirmConvert.disabled = false;
                btnConfirmConvert.textContent = 'Tạo Vé';
            }
        });

        // ====================================================================
        // MODAL 3: CHUYỂN CẤP QUẢN LÝ VÀ BÁC SĨ THÚ Y
        // ====================================================================
        const btnOpenEscalate = document.getElementById('btnEscalateManager');
        const btnConfirmEscalate = document.getElementById('btnConfirmEscalate');
        const escalateCustName = document.getElementById('escalateCustomerName');
        const inputEscalateNotes = document.getElementById('inputEscalateNotes');

        btnOpenEscalate?.addEventListener('click', () => {
            const currentConversation = getCurrentConversationSafe();
            if (escalateCustName) escalateCustName.value = currentConversation.customerName;
            if (inputEscalateNotes) inputEscalateNotes.value = '';
            PawpalChatbot.openModal?.('escalateManagerModalOverlay');
        });

        const closeEscalateModal = () => { PawpalChatbot.closeModal?.('escalateManagerModalOverlay'); };

        btnConfirmEscalate?.addEventListener('click', async () => {
            const currentConversation = getCurrentConversationSafe();
            if (!currentConversation || !currentConversation.id) {
                PawpalChatbot.showToast?.('Vui lòng chọn một phiên hội thoại trước khi chuyển ca.', 'warning');
                return;
            }

            const targetSelect = document.getElementById('selectEscalateTarget');
            const targetName = targetSelect ? targetSelect.options[targetSelect.selectedIndex].text : 'Quản lý Chi nhánh';
            const reasonSelect = document.getElementById('selectEscalateReason');
            const reasonText = reasonSelect ? reasonSelect.options[reasonSelect.selectedIndex].text : 'Khách hàng bức xúc vượt thẩm quyền';
            const notesText = inputEscalateNotes ? inputEscalateNotes.value.trim() : '';
            const staffToken = sessionStorage.getItem('pawpal_staff_token') || 'local:' + (sessionStorage.getItem('pawpal_staff_id') || 'd0000000-5555-5555-5555-555555555555');

            btnConfirmEscalate.disabled = true;
            btnConfirmEscalate.textContent = 'Đang chuyển ca...';

            try {
                const res = await fetch('/api/admin/chat-actions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${staffToken}`
                    },
                    body: JSON.stringify({
                        action: 'CHAT_HANDOVER_MANAGER',
                        conversation_id: currentConversation.id,
                        reason: reasonText + (notesText ? ` (${notesText})` : ''),
                        target_role: 'CSKH_LEAD'
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.ok) {
                    PawpalChatbot.showToast?.(data.error || 'Không thể chuyển ca.', 'error');
                    btnConfirmEscalate.disabled = false;
                    btnConfirmEscalate.textContent = 'Xác nhận chuyển ca';
                    return;
                }

                const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                currentConversation.isHandover = false; // Trả về hàng đợi chờ người mới nhận
                currentConversation.status = 'waiting_agent';
                currentConversation.isEscalated = true;
                currentConversation.category = 'urgent';

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
                    text: `Ca chat đã được chuyển cấp khẩn cho [${targetName}] lúc ${timeStr}. Đang chờ tiếp nhận chính thức.`
                });

                closeEscalateModal();
                renderConversationsList();
                renderCurrentChat();
                PawpalChatbot.showToast?.(`Đã chuyển ca thành công cho ${targetName}!`, 'info');
            } catch (err) {
                console.error('Lỗi khi chuyển ca:', err);
                PawpalChatbot.showToast?.('Lỗi kết nối máy chủ khi chuyển ca: ' + err.message, 'error');
            } finally {
                btnConfirmEscalate.disabled = false;
                btnConfirmEscalate.textContent = 'Xác nhận chuyển ca';
            }
        });

        // ====================================================================
        // MODAL 4: THƯ VIỆN CÂU MẪU CSKH CHUẨN MỰC
        // ====================================================================
        const btnOpenCannedModal = document.getElementById('btnOpenCannedModal');
        const inputSearchCanned = document.getElementById('inputSearchCanned');
        const selectCannedCategory = document.getElementById('selectCannedCategory');
        const cannedResponsesList = document.getElementById('cannedResponsesList');

        const defaultCannedLibraryData = [
            { id: 'c1', shortcut: '/chao', category: 'greeting', catName: 'Chào hỏi', title: 'Chào hỏi tiếp nhận chuyên nghiệp', content: 'Dạ PawPal xin chào sen! Em là chuyên viên CSKH phụ trách hỗ trợ trực tiếp cho gia đình mình. Em có thể hỗ trợ gì cho sen và bé hôm nay ạ?' },
            { id: 'c2', shortcut: '/giaotre', category: 'shipping', catName: 'Vận chuyển', title: 'Tạ lỗi và cập nhật giao trễ', content: 'Dạ PawPal thành thật xin lỗi vì sự chậm trễ này! Em vừa liên hệ trực tiếp với bưu tá tuyến hỏa tốc, kiện hàng của bé đang cách nhà mình khoảng 15 phút di chuyển và sẽ được giao trước 12:00 trưa nay ạ.' },
            { id: 'c3', shortcut: '/anh', category: 'greeting', catName: 'Tiếp nhận', title: 'Yêu cầu gửi ảnh xác minh', content: 'Dạ để hỗ trợ kiểm tra và đối soát chính xác nhất cho gia đình mình, sen vui lòng chụp giúp em hình ảnh tình trạng hiện tại gửi qua khung chat này nhé ạ.' },
            { id: 'c4', shortcut: '/tangdiem', category: 'reward', catName: 'Bồi hoàn', title: 'Tặng điểm Pawpoint tạ lỗi sự cố', content: 'Dạ để tạ lỗi vì sự bất tiện vừa rồi, PawPal xin phép gửi tặng ngay 50 điểm Pawpoint vào tài khoản thành viên của sen để sử dụng cho lần mua sắm hoặc đặt lịch hẹn tiếp theo nhé ạ!' },
            { id: 'c5', shortcut: '/spa', category: 'service', catName: 'Spa', title: 'Tư vấn liệu trình Spa thư giãn', content: 'Dạ bé cưng nhà mình sẽ được tắm bồn sục thảo mộc làm dịu da, sấy ấm chải phồng lông và cắt tỉa form chuẩn xinh xắn bởi Kỹ thuật viên tay nghề cao của PawPal ạ.' },
            { id: 'c6', shortcut: '/hotel', category: 'service', catName: 'Khách sạn', title: 'Cam kết tiêu chuẩn phòng Pet Hotel', content: 'Dạ phòng Pet Hotel tại PawPal luôn duy trì nhiệt độ 24-25°C, khử khuẩn tia UV hàng ngày, có camera an ninh xem trực tiếp 24/7 và nhật ký báo cáo ăn uống từng bữa cho sen ạ.' }
        ];

        function renderCannedLibrary() {
            if (!cannedResponsesList) return;
            const searchVal = (inputSearchCanned?.value || '').toLowerCase().trim();
            const catVal = selectCannedCategory?.value || 'all';

            const filtered = defaultCannedLibraryData.filter(item => {
                const matchSearch = !searchVal || item.title.toLowerCase().includes(searchVal) || item.content.toLowerCase().includes(searchVal) || item.shortcut.toLowerCase().includes(searchVal);
                const matchCat = catVal === 'all' || item.category === catVal;
                return matchSearch && matchCat;
            });

            if (filtered.length === 0) {
                cannedResponsesList.innerHTML = `<div style="text-align: center; padding: 32px; color: var(--text-muted); font-size: 13px;">Không tìm thấy câu mẫu phù hợp</div>`;
                return;
            }

            cannedResponsesList.innerHTML = filtered.map(item => `
                <div class="canned-response-card" style="padding: 14px 16px; border: 1px solid #ECF2EE; border-radius: 9px; margin-bottom: 10px; background: #FFFFFF; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <code style="background: #EEF5F1; padding: 2px 7px; border-radius: 6px; color: #236B48; font-weight: 700; font-size: 12px;">${item.shortcut}</code>
                            <span style="font-weight: 600; color: #203A2C; font-size: 13.5px;">${item.title}</span>
                        </div>
                        <span class="admin-badge badge-neutral" style="font-size: 11px;">${item.catName}</span>
                    </div>
                    <div style="font-size: 13px; color: #4F7A65; line-height: 1.5;">${item.content}</div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-apply-canned-response" data-content="${item.content.replace(/"/g, '&quot;')}" style="padding: 5px 14px; font-size: 12.5px;">Chèn vào chat</button>
                    </div>
                </div>
            `).join('');

            cannedResponsesList.querySelectorAll('.btn-apply-canned-response').forEach(b => {
                b.addEventListener('click', () => {
                    const txt = b.getAttribute('data-content');
                    const input = document.getElementById('chatMessageInput');
                    if (input && txt) {
                        input.value = txt;
                        input.focus();
                    }
                    PawpalChatbot.closeModal?.('cannedResponsesModalOverlay');
                    PawpalChatbot.showToast?.('Đã chèn câu mẫu vào ô soạn thảo chat!', 'success');
                });
            });
        }

        btnOpenCannedModal?.addEventListener('click', () => {
            PawpalChatbot.openModal?.('cannedResponsesModalOverlay');
            renderCannedLibrary();
        });

        inputSearchCanned?.addEventListener('input', renderCannedLibrary);
        selectCannedCategory?.addEventListener('change', renderCannedLibrary);

        // ====================================================================
        // ====================================================================
        // MODAL 5: TRA CỨU VẬN ĐƠN HỎA TỐC BƯU TÁ
        // ====================================================================
        const btnSendTrackingCardToChat = document.getElementById('btnSendTrackingCardToChat');

        // Lắng nghe sự kiện click link tra cứu đơn hàng & xem camera an ninh (Event Delegation toàn diện)
        document.addEventListener('click', (e) => {
            const orderLink = e.target.closest('#linkRecentOrder, .btn-jump-order');
            if (orderLink) {
                PawpalChatbot.openModal?.('orderTrackingModalOverlay');
            }
            const bookingLink = e.target.closest('#linkRecentBooking, .btn-jump-booking');
            if (bookingLink) {
                const cameraTimeEl = document.getElementById('cameraCurrentTime');
                if (cameraTimeEl) cameraTimeEl.textContent = new Date().toLocaleTimeString();
                PawpalChatbot.openModal?.('petCameraModalOverlay');
            }
        });

        btnSendTrackingCardToChat?.addEventListener('click', async () => {
            const currentConversation = getCurrentConversationSafe();
            if (!currentConversation) {
                PawpalChatbot.showToast?.('Vui lòng chọn một phiên hội thoại trước khi gửi thông tin.', 'warning');
                return;
            }

            const orderId = currentConversation.recentOrder?.id || currentConversation.recentOrder?.order_code || 'đang được đồng bộ';
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const trackingMsgText = `Dạ PawPal gửi sen thông tin vận đơn ${orderId}: Đơn hàng đang được điều phối giao hỏa tốc đến địa chỉ của sen ạ!`;
            const localMsgId = 'msg-tracking-' + Date.now();

            currentConversation.messages.push({
                id: localMsgId,
                sender: 'agent',
                agentName: 'Hệ thống PawPal',
                type: 'action-card-order',
                time: timeStr,
                text: trackingMsgText
            });

            PawpalChatbot.closeModal?.('orderTrackingModalOverlay');
            renderCurrentChat();
            PawpalChatbot.showToast?.('Đã gửi thông tin lộ trình vận đơn vào chat!', 'success');

            if (supabase) {
                try {
                    const convId = await ensureRealConversation(currentConversation);
                    if (convId) {
                        await supabase.from('chat_message').insert([{
                            conversation_id: convId,
                            sender_type: 'staff',
                            sender_name: 'Hệ thống PawPal',
                            content: trackingMsgText,
                            raw_content: trackingMsgText,
                            is_toxic: false
                        }]);
                    }
                } catch (e) {
                    console.error('[Chatbot] Lỗi lưu tracking card vào DB:', e);
                }
            }
        });

        // ====================================================================
        // MODAL 6: CAMERA AN NINH PHÒNG THÚ CƯNG
        // ====================================================================
        const btnSendCameraSnapshotToChat = document.getElementById('btnSendCameraSnapshotToChat');

        btnSendCameraSnapshotToChat?.addEventListener('click', async () => {
            const currentConversation = getCurrentConversationSafe();
            if (!currentConversation) {
                PawpalChatbot.showToast?.('Vui lòng chọn một phiên hội thoại trước khi gửi thông tin.', 'warning');
                return;
            }

            const petName = currentConversation.petName || currentConversation.petInfo?.name || (currentConversation.pets?.[0]?.name) || 'thú cưng';
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const cameraMsgText = `[Snapshot Camera Live lúc ${timeStr}]: Bé ${petName} đang sinh hoạt ngoan ngoãn trong phòng lưu trú. Nhiệt độ phòng 24.5°C, độ ẩm 55% đạt chuẩn an toàn 5 sao!`;
            const localMsgId = 'msg-camera-' + Date.now();

            currentConversation.messages.push({
                id: localMsgId,
                sender: 'agent',
                agentName: 'Camera An Ninh',
                time: timeStr,
                text: cameraMsgText
            });

            PawpalChatbot.closeModal?.('petCameraModalOverlay');
            renderCurrentChat();
            PawpalChatbot.showToast?.('Đã gửi ảnh chụp camera an ninh vào chat!', 'success');

            if (supabase) {
                try {
                    const convId = await ensureRealConversation(currentConversation);
                    if (convId) {
                        await supabase.from('chat_message').insert([{
                            conversation_id: convId,
                            sender_type: 'staff',
                            sender_name: 'Camera An Ninh',
                            content: cameraMsgText,
                            raw_content: cameraMsgText,
                            is_toxic: false
                        }]);
                    }
                } catch (e) {
                    console.error('[Chatbot] Lỗi lưu camera snapshot vào DB:', e);
                }
            }
        });

        // ====================================================================
        // MODAL 11: HOÀN TẤT CA CHAT VÀ GỬI ĐÁNH GIÁ CSAT
        // ====================================================================
        const btnResolveAction = document.getElementById('btnResolveChatAction');
        const btnHeaderResolve = document.getElementById('btnHeaderResolveChat');
        const btnConfirmResolve = document.getElementById('btnConfirmResolveChat');
        const resolveCustomerNameInput = document.getElementById('resolveChatCustomerName');
        const selectResolveReason = document.getElementById('selectResolveReason');
        const textareaResolveNotes = document.getElementById('textareaResolveNotes');
        const checkboxSendCsat = document.getElementById('checkboxSendCsatSurvey');

        function openResolveModal() {
            const currentConversation = getCurrentConversationSafe();
            if (resolveCustomerNameInput) resolveCustomerNameInput.value = currentConversation.customerName;
            if (textareaResolveNotes) textareaResolveNotes.value = '';
            PawpalChatbot.openModal?.('modalResolveChatOverlay');
        }

        const closeResolveModal = () => { PawpalChatbot.closeModal?.('modalResolveChatOverlay'); };
        btnResolveAction?.addEventListener('click', openResolveModal);
        btnHeaderResolve?.addEventListener('click', openResolveModal);

        btnConfirmResolve?.addEventListener('click', async () => {
            const currentConversation = getCurrentConversationSafe();

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const reasonText = selectResolveReason ? selectResolveReason.options[selectResolveReason.selectedIndex].text : 'Đã giải quyết yêu cầu';
            const notes = textareaResolveNotes ? textareaResolveNotes.value.trim() : '';
            const shouldSendCsat = checkboxSendCsat ? checkboxSendCsat.checked : true;

            currentConversation.isHandover = false;
            currentConversation.waitingSeconds = 0;
            currentConversation.category = 'resolved';

            const endNotice = `Hệ thống: Ca hỗ trợ trực tuyến đã được chuyên viên CSKH hoàn tất lúc ${timeStr} (Kết quả: ${reasonText}).`;
            currentConversation.messages.push({
                id: 'msg-resolve-notice-' + Date.now(),
                sender: 'system',
                time: timeStr,
                text: endNotice
            });

            closeResolveModal();
            renderConversationsList();
            renderCurrentChat();

            if (supabase) {
                try {
                    const convId = await ensureRealConversation(currentConversation);
                    if (convId) {
                        await supabase
                            .from('chat_conversation')
                            .update({
                                status: 'resolved',
                                is_urgent: false,
                                resolved_at: new Date().toISOString(),
                                resolved_reason: reasonText,
                                internal_note: (currentConversation.internalNotes ? currentConversation.internalNotes + '\n' : '') + `[Hoàn tất ca ${timeStr}]: ${notes || reasonText}`,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', convId);

                        await supabase
                            .from('chat_message')
                            .insert([{
                                conversation_id: convId,
                                sender_type: 'staff',
                                sender_name: 'Hệ thống PawPal',
                                content: endNotice,
                                raw_content: endNotice,
                                is_toxic: false
                            }]);

                        if (shouldSendCsat) {
                            const csatPayload = JSON.stringify({
                                convId: convId,
                                staffName: currentConversation.agentName || 'Chuyên viên CSKH',
                                timestamp: new Date().toISOString()
                            });
                            const csatMessageContent = `:::csat_survey ${csatPayload} :::`;

                            await supabase
                                .from('chat_message')
                                .insert([{
                                    conversation_id: convId,
                                    sender_type: 'staff',
                                    sender_name: 'PawPal CSKH',
                                    content: csatMessageContent,
                                    raw_content: 'PawPal rất mong nhận được đánh giá từ sen để nâng cao chất lượng dịch vụ!',
                                    is_toxic: false
                                }]);
                        }
                    }
                } catch (resErr) {
                    console.error('[Chatbot] Lỗi hoàn tất ca chat trên Supabase:', resErr);
                }
            }

            PawpalChatbot.showToast?.('Đã hoàn tất ca chat và gửi biểu mẫu đánh giá CSAT cho khách hàng!', 'success');
        });
    }

    PawpalChatbot.subtabs.live = {
        init: initLiveChatSubtab,
        renderConversationsList,
        renderCurrentChat,
        renderCustomerInfoPanel
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLiveChatSubtab);
    } else {
        initLiveChatSubtab();
    }
})();
