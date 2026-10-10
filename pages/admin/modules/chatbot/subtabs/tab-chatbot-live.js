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
    let customerTypingHideTimer = null;
    let adminTypingDebounceTimer = null;

    const defaultSmartSuggestions = [
        { tag: 'Đồng cảm và Xoa dịu', text: 'Dạ PawPal thành thật xin lỗi sen và bé vì sự bất tiện này! Em xin phép ưu tiên xử lý ngay cho sen ạ.' },
        { tag: 'Tặng điểm tạ lỗi', text: 'Dạ để tạ lỗi, PawPal xin gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.' },
        { tag: 'Hỗ trợ tức thì', text: 'Dạ em đã chuyển thông tin đến bộ phận chuyên môn, chuyên viên sẽ gọi điện hỗ trợ trực tiếp cho sen trong 3 phút nữa ạ.' }
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

    function formatAdminChatText(rawText) {
        if (!rawText) return '';
        let html = rawText;
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        html = html.replace(/:::order\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                const st = data.status || 'Đang xử lý';
                const statusBadge = (st === 'Đã giao' || st === 'Hoàn thành') ? 'badge-active' : (st === 'Đã hủy' ? 'badge-danger' : 'badge-info');
                const code = data.code || data.id || 'DH';
                return `<div class="fab-rich-card fab-rich-card--order"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Đơn hàng #${code}</span><span class="admin-badge ${statusBadge}">${st}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${data.items || 'Sản phẩm PawPal'}</div><div class="fab-rich-card-desc">Tổng tiền: <strong>${data.total || '0đ'}</strong></div></div><div class="fab-rich-card-action">Đơn hàng đã chia sẻ</div></div>`;
            } catch(e) { return match; }
        });

        html = html.replace(/:::booking\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                const st = data.status || 'Đã xác nhận';
                const statusBadge = (st === 'Hoàn thành' || st === 'Đang thực hiện') ? 'badge-active' : (st === 'Đã hủy' ? 'badge-danger' : 'badge-info');
                return `<div class="fab-rich-card fab-rich-card--booking"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Lịch hẹn dịch vụ</span><span class="admin-badge ${statusBadge}">${st}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${data.service || 'Chăm sóc thú cưng'}</div><div class="fab-rich-card-desc">Bé: <strong>${data.pet || 'Bé cưng'}</strong> • Giờ hẹn: <strong>${data.time || 'Hôm nay'}</strong></div></div><div class="fab-rich-card-action">Lịch hẹn dịch vụ</div></div>`;
            } catch(e) { return match; }
        });

        html = html.replace(/:::voucher\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                const code = data.code || 'PAWPAL';
                return `<div class="fab-rich-card fab-rich-card--voucher"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Ưu đãi PawPal</span><span class="fab-voucher-code">${code}</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">${data.discount || 'Giảm giá đặc biệt'}</div><div class="fab-rich-card-desc">${data.minOrder || 'Áp dụng mọi đơn'} • ${data.expiry || 'HSD: 30 ngày'}</div></div><div class="fab-rich-card-action">Mã ưu đãi đã gửi</div></div>`;
            } catch(e) { return match; }
        });

        html = html.replace(/:::csat_survey\s*(\{[\s\S]*?\})\s*:::/g, (match, jsonStr) => {
            try {
                const data = JSON.parse(jsonStr);
                const staff = data.staffName || 'Chuyên viên CSKH';
                return `<div class="fab-rich-card fab-rich-card--csat"><div class="fab-rich-card-header"><span class="fab-rich-card-tag">Đánh giá dịch vụ</span><span class="admin-badge badge-warning">Khảo sát CSAT</span></div><div class="fab-rich-card-body"><div class="fab-rich-card-title">Biểu mẫu đánh giá mức độ hài lòng</div><div class="fab-rich-card-desc">Phụ trách: <strong>${staff}</strong> • Đã gửi tới màn hình khách hàng</div></div></div>`;
            } catch(e) { return match; }
        });

        html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
            const safeAlt = (alt || '').replace(/"/g, '&quot;');
            return `<div class="chat-attachment-image-wrap" data-img-url="${url}" data-img-caption="${safeAlt}"><img src="${url}" alt="${safeAlt || 'Ảnh đính kèm'}" class="chat-attachment-img">${safeAlt ? `<span class="chat-attachment-caption">${safeAlt}</span>` : ''}</div>`;
        });
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function subscribeToConversationRoom(convId) {
        if (!supabase || !convId) return;
        if (currentAdminRoomChannel) {
            try { supabase.removeChannel(currentAdminRoomChannel); } catch(e) {}
        }
        const customerTypingBar = document.getElementById('customerTypingBar');
        const customerTypingText = document.getElementById('customerTypingText');
        if (customerTypingBar) customerTypingBar.style.display = 'none';

        currentAdminRoomChannel = supabase.channel('fab-customer-' + convId)
            .on('broadcast', { event: 'typing' }, (payload) => {
                const data = payload && payload.payload;
                if (data && data.who === 'customer') {
                    if (data.isTyping) {
                        if (customerTypingBar) {
                            if (customerTypingText) customerTypingText.textContent = `${data.customerName || 'Khách hàng'} đang soạn tin...`;
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

    function renderConversationsList() {
        const container = document.getElementById('conversationsListContainer');
        if (!container) return;

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
            const lastMsg = conv.messages[conv.messages.length - 1];
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
                ? `<span class="conv-member-badge">${conv.tier || 'Thành viên'}</span>` 
                : '';

            const handoverTag = `<span class="admin-badge badge-neutral" style="font-size: 10.5px; height: 20px; padding: 0 6px;">${conv.isHandover ? 'Nhân viên' : 'Bot'}</span>`;
            const sla = formatSlaInfo(conv.waitingSeconds, conv.isHandover);

            const item = document.createElement('div');
            item.className = `conversation-item ${isMember ? 'is-member' : 'is-guest'} ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <div class="conversation-item-top">
                    <span class="conv-cust-name">${conv.customerName}${memberBadge}${vipTag}</span>
                    <span class="conv-time">${conv.updatedAt}</span>
                </div>
                <div class="conversation-item-mid">
                    <span class="conv-snippet">${snippet}</span>
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
                PawpalChatbot.state.currentConversation = conv;
                sessionStorage.setItem('pawpal_admin_chatbot_conv_id', conv.id);
                renderConversationsList();
                renderCurrentChat();
                PawpalChatbot.updateBreadcrumb?.(conv.customerName);
            });

            container.appendChild(item);
        });
    }

    function renderCurrentChat() {
        const currentConversation = PawpalChatbot.state?.currentConversation;
        if (!currentConversation) return;

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
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-reward-pts">+${msg.rewardData.points} Pawpoint</div>
                                    <div class="action-card-meta">
                                        <div><strong>Lý do:</strong> ${msg.rewardData.reason}</div>
                                        <div><strong>Mã bồi hoàn:</strong> ${msg.rewardData.txId}</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${msg.text}</div>
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
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-ticket-title">${msg.ticketData.id}: ${msg.ticketData.title}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Phân loại:</strong> ${msg.ticketData.category}</div>
                                        <div><strong>Tham chiếu:</strong> ${msg.ticketData.refId || 'Đơn hàng hiện tại'}</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${msg.text}</div>
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
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #8F2424; font-size: 12.5px;">Chuyển cấp Quản lý</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div class="action-card-escalate-target">Tiếp nhận: <strong>${msg.escalateData.targetName}</strong></div>
                                    <div class="action-card-meta">
                                        <div><strong>Lý do:</strong> ${msg.escalateData.reason}</div>
                                        ${msg.escalateData.notes ? `<div><strong>Ghi chú:</strong> ${msg.escalateData.notes}</div>` : ''}
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${msg.text}</div>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-tracking') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-tracking">
                                <div class="action-card-header">
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #20495E; font-size: 12.5px;">Vận đơn Hỏa tốc</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div style="font-weight: 700; color: #20495E;">${msg.trackingData.orderId} • ${msg.trackingData.carrier}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Bưu tá:</strong> ${msg.trackingData.shipperName} (${msg.trackingData.shipperPhone})</div>
                                        <div><strong>Vị trí:</strong> ${msg.trackingData.location} (${msg.trackingData.status})</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${msg.text}</div>
                                </div>
                            </div>
                        `;
                    } else if (msg.type === 'action-camera') {
                        cardWrap.innerHTML = `
                            <div class="chat-action-card card-camera">
                                <div class="action-card-header">
                                    <span class="action-card-badge-title" style="font-weight: 700; color: #165335; font-size: 12.5px;">Camera Giám sát</span>
                                    <span class="action-card-time">${msg.time}</span>
                                </div>
                                <div class="action-card-body">
                                    <div style="font-weight: 700; color: #236B48;">${msg.cameraData.roomName} • ${msg.cameraData.petName}</div>
                                    <div class="action-card-meta">
                                        <div><strong>Tình trạng:</strong> ${msg.cameraData.caption}</div>
                                        <div><strong>Môi trường:</strong> ${msg.cameraData.temp} | ${msg.cameraData.humidity}</div>
                                    </div>
                                    <div style="font-size: 12.5px; color: var(--text-main);">${msg.text}</div>
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
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const targetLevel = item.getAttribute('data-level');
                        const msgId = w.getAttribute('data-msg-id');
                        const targetMsg = currentConversation.messages.find(m => m.id === msgId);
                        if (targetMsg) {
                            targetMsg.activeMaskLevel = targetLevel;
                            renderCurrentChat();
                        }
                    });
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

        if (custNameEl) custNameEl.textContent = currentConversation.customerName;
        if (custTierEl) custTierEl.textContent = currentConversation.tier;
        if (custPhoneEl) custPhoneEl.textContent = currentConversation.phone;
        if (custPointsEl) custPointsEl.textContent = `${(currentConversation.pawpoints || 0).toLocaleString('vi-VN')} điểm`;

        if (petsListEl) {
            petsListEl.innerHTML = '';
            currentConversation.pets.forEach(p => {
                const card = document.createElement('div');
                card.className = 'pet-mini-card';
                const notesHtml = (p.notes === 'Bình thường' || !p.notes)
                    ? '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>'
                    : `<span style="font-size: 11.5px; color: ${p.notes.includes('Dị ứng') || p.notes.includes('sợ') ? '#DC2626' : 'var(--text-muted)'};">${p.notes}</span>`;
                card.innerHTML = `
                    <span class="pet-mini-name">${p.name} (${p.breed})</span>
                    ${notesHtml}
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
            if (currentConversation.openTickets && currentConversation.openTickets.length > 0) {
                currentConversation.openTickets.forEach(t => {
                    const el = document.createElement('div');
                    el.style.marginBottom = '6px';
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
        const currentConversation = PawpalChatbot.state?.currentConversation;
        if (!currentConversation) return;

        const msgInput = document.getElementById('chatMessageInput');
        const text = msgInput ? msgInput.value.trim() : '';
        if (!text && !pendingAdminAttachment) return;

        if (!currentConversation.isHandover) {
            PawpalChatbot.showToast?.('Vui lòng bấm nút "Tiếp nhận" trước khi gửi tin nhắn cho khách hàng.', 'warning');
            return;
        }

        let fullText = text;
        if (pendingAdminAttachment) {
            const imgMd = `![${pendingAdminAttachment.name}](${pendingAdminAttachment.dataUrl})`;
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

        clearTimeout(adminTypingDebounceTimer);
        notifyAdminTyping(false);
        const customerTypingBar = document.getElementById('customerTypingBar');
        if (customerTypingBar) customerTypingBar.style.display = 'none';

        if (msgInput) msgInput.value = '';
        clearAdminAttachment();
        renderCurrentChat();

        if (supabase) {
            try {
                const convId = await ensureRealConversation(currentConversation);
                if (convId) {
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

                    if (!msgErr && insertedMsg) {
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
            }
        }
    }

    function initLiveChatSubtab() {
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
        document.getElementById('inboxSearchInput')?.addEventListener('input', () => {
            renderConversationsList();
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

        msgInput?.addEventListener('input', () => {
            notifyAdminTyping(true);
            clearTimeout(adminTypingDebounceTimer);
            adminTypingDebounceTimer = setTimeout(() => {
                notifyAdminTyping(false);
            }, 2500);
        });

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

            if (file.size > 5 * 1024 * 1024) {
                PawpalChatbot.showToast?.('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.', 'warning');
                adminFileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                pendingAdminAttachment = {
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
        document.getElementById('btnSaveChatInternalNote')?.addEventListener('click', async () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;

            const note = document.getElementById('chatInternalNoteInput')?.value || '';
            currentConversation.internalNotes = note;

            if (supabase && currentConversation.customerId) {
                try {
                    await supabase
                        .from('customer')
                        .update({ note: note })
                        .eq('id', currentConversation.customerId);
                } catch (e) {
                    console.error('Lỗi khi lưu note vào Supabase:', e);
                }
            }
            PawpalChatbot.showToast?.('Đã lưu ghi chú nội bộ an toàn trên Supabase Live DB!', 'success');
        });

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

        // Modal Tặng điểm
        const rewardOverlay = document.getElementById('rewardPointsModalOverlay');
        const btnOpenReward = document.getElementById('btnRewardPoints');
        const btnCancelReward = document.getElementById('btnCancelRewardPoints');
        const btnDismissReward = document.getElementById('btnDismissRewardModal');
        const btnConfirmReward = document.getElementById('btnConfirmRewardPoints');
        const rewardCustName = document.getElementById('rewardCustomerName');
        const inputPoints = document.getElementById('inputCustomRewardPoints');

        btnOpenReward?.addEventListener('click', () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;
            if (rewardCustName) rewardCustName.value = currentConversation.customerName;
            if (rewardOverlay) rewardOverlay.style.display = 'flex';
        });

        const closeRewardModal = () => { if (rewardOverlay) rewardOverlay.style.display = 'none'; };
        btnCancelReward?.addEventListener('click', closeRewardModal);
        btnDismissReward?.addEventListener('click', closeRewardModal);

        document.querySelectorAll('.btn-preset-point').forEach(pBtn => {
            pBtn.addEventListener('click', () => {
                document.querySelectorAll('.btn-preset-point').forEach(b => b.classList.remove('active'));
                pBtn.classList.add('active');
                if (inputPoints) inputPoints.value = pBtn.getAttribute('data-point');
            });
        });

        btnConfirmReward?.addEventListener('click', async () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;

            const pts = parseInt(inputPoints?.value, 10) || 50;
            const selectReason = document.getElementById('selectRewardReason');
            const reasonText = selectReason ? selectReason.options[selectReason.selectedIndex].text : 'Tạ lỗi vì sự cố dịch vụ';
            const txCode = 'PT-' + Math.floor(100000 + Math.random() * 900000);

            if (supabase && currentConversation.customerId) {
                try {
                    const newBalance = (currentConversation.pawpoints || 0) + pts;
                    await supabase.from('paw_point_transaction').insert([{
                        customer_id: currentConversation.customerId,
                        points: pts,
                        balance_after: newBalance,
                        description: `[CSKH Trực tuyến] ${reasonText} (Mã: ${txCode})`,
                        created_at: new Date().toISOString()
                    }]);
                } catch (e) {
                    console.error('Lỗi khi insert paw_point_transaction:', e);
                }
            }

            currentConversation.pawpoints = (currentConversation.pawpoints || 0) + pts;
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
                text: `Đã nạp thành công +${pts} điểm Pawpoint bồi hoàn vào ví tài khoản trên Supabase Live DB!`
            });

            closeRewardModal();
            renderCurrentChat();
            PawpalChatbot.showToast?.(`Đã tặng thành công +${pts} điểm Pawpoint cho khách hàng!`, 'success');
        });

        // Modal Chuyển Ticket
        const convertOverlay = document.getElementById('convertTicketModalOverlay');
        const btnOpenConvert = document.getElementById('btnConvertToTicket');
        const btnCancelConvert = document.getElementById('btnCancelConvertTicket');
        const btnDismissConvert = document.getElementById('btnDismissConvertTicket');
        const btnConfirmConvert = document.getElementById('btnConfirmConvertTicket');
        const inputConvertRefId = document.getElementById('inputConvertRefId');
        const inputConvertTitle = document.getElementById('inputConvertTicketTitle');

        btnOpenConvert?.addEventListener('click', () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;
            if (inputConvertRefId) {
                inputConvertRefId.value = currentConversation.recentOrder ? currentConversation.recentOrder.id : (currentConversation.recentBooking ? currentConversation.recentBooking.id : '');
            }
            if (inputConvertTitle) {
                inputConvertTitle.value = (currentConversation.aiSummary || '').slice(0, 60) + '...';
            }
            if (convertOverlay) convertOverlay.style.display = 'flex';
        });

        const closeConvertModal = () => { if (convertOverlay) convertOverlay.style.display = 'none'; };
        btnCancelConvert?.addEventListener('click', closeConvertModal);
        btnDismissConvert?.addEventListener('click', closeConvertModal);

        btnConfirmConvert?.addEventListener('click', async () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;

            const title = inputConvertTitle?.value.trim() || 'Khiếu nại chuyển từ kênh chat trực tuyến';
            const selectCat = document.getElementById('selectConvertTicketCategory');
            const catVal = selectCat ? selectCat.value : 'order';
            const catText = selectCat ? selectCat.options[selectCat.selectedIndex].text : 'Khiếu nại Đơn hàng';
            const isServiceTicket = catVal === 'service' || catText.includes('Dịch vụ');
            let newTicketId = isServiceTicket
                ? 'TK-' + Math.floor(1000 + Math.random() * 9000)
                : 'TK-ORD-' + Math.floor(100 + Math.random() * 900);

            const selectPri = document.getElementById('selectConvertPriority');
            const priText = selectPri ? selectPri.options[selectPri.selectedIndex].text : 'Mức độ Trung bình';
            const priVal = priText.includes('Cao') ? 'high' : (priText.includes('Thấp') ? 'low' : 'medium');
            const refId = inputConvertRefId?.value.trim() || '';

            const chatTranscript = currentConversation.messages.map(m => {
                const senderLabel = m.sender === 'user'
                    ? currentConversation.customerName
                    : (m.sender === 'agent' ? (m.agentName || 'CSKH Trực tuyến') : 'PawPal AI Bot');
                return `[${m.time}] ${senderLabel}: ${m.text || ''}`;
            }).join('\n');

            if (supabase && currentConversation.customerId) {
                try {
                    const normPriority = priVal === 'high' ? 'Cao' : (priVal === 'low' ? 'Thấp' : 'Trung bình');
                    const ticketType = isServiceTicket ? 'booking' : 'order';
                    const { data: ticketCreated, error: tErr } = await supabase.from('support_ticket').insert([{
                        user_id: currentConversation.customerId,
                        title: title,
                        type: ticketType,
                        status: 'pending',
                        priority: normPriority,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]).select().single();

                    if (!tErr && ticketCreated) {
                        newTicketId = ticketCreated.id;
                        await supabase
                            .from('chat_conversation')
                            .update({
                                ticket_id: ticketCreated.id,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', currentConversation.id);

                        await supabase.from('support_ticket_message').insert([{
                            ticket_id: ticketCreated.id,
                            sender_type: 'user',
                            content: `[Chuyển từ Chat trực tuyến CSKH${refId ? ' • Tham chiếu: ' + refId : ''}]:\n${chatTranscript}`,
                            created_at: new Date().toISOString()
                        }]);
                    }
                } catch (e) {
                    console.error('Lỗi khi insert support_ticket vào Supabase:', e);
                }
            }

            currentConversation.openTickets.push({
                id: newTicketId,
                title: title,
                status: 'new'
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
                    refId: refId || (isServiceTicket ? (currentConversation.recentBooking ? currentConversation.recentBooking.id : '') : (currentConversation.recentOrder ? currentConversation.recentOrder.id : ''))
                },
                text: `Đã trích xuất biên bản hội thoại và tạo thành công vé hỗ trợ chính thức mang mã định danh ${newTicketId} trong Supabase Live DB.`
            });

            closeConvertModal();
            renderCurrentChat();
            renderCustomerInfoPanel();
            PawpalChatbot.showToast?.(`Đã tạo vé khiếu nại ${newTicketId} thành công trên hệ thống!`, 'success');
        });

        // Modal Chuyển cấp Quản lý
        const escalateModal = document.getElementById('escalateManagerModalOverlay');
        const btnOpenEscalate = document.getElementById('btnEscalateManager');
        const btnCancelEscalate = document.getElementById('btnCancelEscalate');
        const btnDismissEscalate = document.getElementById('btnDismissEscalateModal');
        const btnConfirmEscalate = document.getElementById('btnConfirmEscalate');
        const escalateCustName = document.getElementById('escalateCustomerName');
        const inputEscalateNotes = document.getElementById('inputEscalateNotes');

        btnOpenEscalate?.addEventListener('click', () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;
            if (escalateCustName) escalateCustName.value = currentConversation.customerName;
            if (inputEscalateNotes) inputEscalateNotes.value = '';
            if (escalateModal) escalateModal.style.display = 'flex';
        });

        const closeEscalateModal = () => { if (escalateModal) escalateModal.style.display = 'none'; };
        btnCancelEscalate?.addEventListener('click', closeEscalateModal);
        btnDismissEscalate?.addEventListener('click', closeEscalateModal);

        btnConfirmEscalate?.addEventListener('click', () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
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

            currentConversation.messages.push({
                sender: 'agent',
                agentName: targetName,
                time: timeStr,
                text: `Dạ PawPal xin chào sen! Em là ${targetName}. Em đã tiếp nhận trực tiếp ca hỗ trợ này để giải quyết dứt điểm sự cố cho gia đình mình ngay ạ!`
            });

            closeEscalateModal();
            renderConversationsList();
            renderCurrentChat();
            PawpalChatbot.showToast?.(`Đã chuyển ca cho ${targetName}!`, 'info');
        });

        // Modal Hoàn tất ca chat
        const resolveModal = document.getElementById('modalResolveChatOverlay');
        const btnResolveAction = document.getElementById('btnResolveChatAction');
        const btnHeaderResolve = document.getElementById('btnHeaderResolveChat');
        const btnCloseResolveModal = document.getElementById('btnCloseResolveChatModal');
        const btnCancelResolve = document.getElementById('btnCancelResolveChat');
        const btnConfirmResolve = document.getElementById('btnConfirmResolveChat');
        const resolveCustomerNameInput = document.getElementById('resolveChatCustomerName');
        const selectResolveReason = document.getElementById('selectResolveReason');
        const textareaResolveNotes = document.getElementById('textareaResolveNotes');
        const checkboxSendCsat = document.getElementById('checkboxSendCsatSurvey');

        function openResolveModal() {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;
            if (resolveCustomerNameInput) resolveCustomerNameInput.value = currentConversation.customerName;
            if (textareaResolveNotes) textareaResolveNotes.value = '';
            if (resolveModal) resolveModal.style.display = 'flex';
        }

        const closeResolveModal = () => { if (resolveModal) resolveModal.style.display = 'none'; };
        btnResolveAction?.addEventListener('click', openResolveModal);
        btnHeaderResolve?.addEventListener('click', openResolveModal);
        btnCloseResolveModal?.addEventListener('click', closeResolveModal);
        btnCancelResolve?.addEventListener('click', closeResolveModal);

        btnConfirmResolve?.addEventListener('click', async () => {
            const currentConversation = PawpalChatbot.state?.currentConversation;
            if (!currentConversation) return;

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

        // Khởi chạy đồng hồ SLA ticker
        startSlaTicker();
        renderConversationsList();
        renderCurrentChat();
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
