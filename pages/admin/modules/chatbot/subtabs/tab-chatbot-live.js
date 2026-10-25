// tab-chatbot-live.js - Subtab Trực chat CSKH Pawpal-er (Hộp thư 3 khu vực thời gian thực)
(function() {
    'use strict';

    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};
    PawpalChatbot.subtabs.live = PawpalChatbot.subtabs.live || {};

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
    let inboxPage = Number(sessionStorage.getItem('pawpal_chat_inbox_page')) || 1;
    let isStaffTypingActive = false;
    let staffTypingStopTimer = null;

    // PR-02: Gợi ý phản hồi mẫu chân thực, không hứa hẹn bồi hoàn ảo (CB-25)
    let defaultSmartSuggestions = [];
    let cannedResponsesDatabase = [];
    async function loadLiveCannedResponses() {
        const fetcher = async () => {
            const rows=[];
            for(let offset=0;;offset+=500){
                const {data,error}=await supabase.from('chatbot_canned_response').select('id,shortcut,title,content,category').eq('is_active',true).order('id').range(offset,offset+499);
                if(error)throw error;
                rows.push(...data);
                if(data.length<500)break;
            }
            return rows;
        };
        const store=window.PawpalDataStore;
        const rows=store ? await store.fetch('chatbot:canned-live:'+store.buildKey('active-canned'),fetcher,{ttlMs:60000,backgroundRevalidate:false}) : await fetcher();
        cannedResponsesDatabase=rows;
        defaultSmartSuggestions=rows.map(r=>({tag:r.title,text:r.content}));
        return rows;
    }

    function formatSlaInfo(c) {
        if(['resolved','closed','completed'].includes(c.status))return {text:'Đã hoàn tất',className:'sla-done'};
        if(c.isHandover)return {text:'Đang tiếp nhận',className:'sla-done'};
        if(!c.slaDeadline)return {text:'Chưa có hạn phản hồi',className:'sla-normal'};
        const remaining=Math.ceil((new Date(c.slaDeadline)-Date.now())/1000),seconds=Math.abs(remaining);
        return {text:(remaining<0?'Quá hạn ':'Còn ')+Math.floor(seconds/60)+' phút '+seconds%60+' giây',className:remaining<0?'sla-danger':'sla-normal'};
    }

    function updateSlaBadgesInDom() {
        const liveConversations = PawpalChatbot.state?.liveConversations || [];
        const currentConversation = PawpalChatbot.state?.currentConversation;

        liveConversations.forEach(c => {
            const pill = document.querySelector(`.sla-pill-${c.id}`);
            if (pill) {
                const sla = formatSlaInfo(c);
                pill.textContent = sla.text;
                pill.className = `sla-timer-pill ${sla.className} sla-pill-${c.id}`;
            }
        });

        if (currentConversation) {
            const headerSla = document.getElementById('currentChatSlaBadge');
            if (headerSla) {
                const sla = formatSlaInfo(currentConversation);
                headerSla.textContent = sla.text;
                headerSla.className = `sla-timer-pill ${sla.className}`;
            }
        }
    }

    function startSlaTicker(){if(slaTickerInterval)clearInterval(slaTickerInterval);slaTickerInterval=setInterval(updateSlaBadgesInDom,1000);}

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
            const {data:raw,error}=await supabase.rpc('read_admin_chat_raw',{p_message_id:targetMsg.id});
            const data={raw_content:raw,error:error?.message};const res={ok:!error};data.ok=!error;
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
        if (PawpalChatbot.state.liveLoadError) { container.textContent=PawpalChatbot.state.liveLoadError;document.getElementById('chatInboxPager')?.replaceChildren(); return; }
        if (!PawpalChatbot.state.liveLoaded) {
            document.getElementById('chatInboxPager')?.replaceChildren();
            if (!container.querySelector('.skeleton-text')) container.innerHTML=Array.from({length:3},()=>'<div style="padding:16px;"><span class="skeleton-text" style="width:65%;"></span><span class="skeleton-text" style="width:90%;margin-top:10px;"></span></div>').join('');
            return;
        }


        const liveConversations = PawpalChatbot.state?.liveConversations || [];
        const currentFilterTab = PawpalChatbot.state?.currentFilterTab || 'all';
        const currentConversation = PawpalChatbot.state?.currentConversation;
        const searchKeyword = (document.getElementById('inboxSearchInput')?.value || '').toLowerCase().trim();

        const filtered = liveConversations;
        const meta=PawpalChatbot.state.inboxPage;
        inboxPage=meta?.page||1;
        const urgentCount=meta?.counts?.urgent||0,activeCount=meta?.counts?.active||0,allCount=meta?.counts?.all||0;
        document.getElementById('chatInboxPager')?.replaceChildren();
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
        const pages=Math.max(1,Math.ceil((meta?.total||0)/10));inboxPage=Math.min(inboxPage,pages);
        const pager=document.getElementById('chatInboxPager');pager?.replaceChildren();
        for(const [text,disabled,delta] of [['<',inboxPage===1,-1],[String(inboxPage),true,0],['>',inboxPage===pages,1]]){
            const b=document.createElement('button');b.type='button';b.className='admin-btn admin-btn-secondary';b.textContent=text;b.disabled=disabled;
            b.onclick=()=>{inboxPage+=delta;sessionStorage.setItem('pawpal_chat_inbox_page',inboxPage);PawpalChatbot.loadInboxSummary({page:inboxPage});};pager?.append(b);
        }
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
            const sla = formatSlaInfo(conv);

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
            const sla = formatSlaInfo(currentConversation);
            headerSla.textContent = sla.text;
            headerSla.className = `sla-timer-pill ${sla.className}`;
        }

        const resolveHeaderBtn = document.getElementById('btnHeaderResolveChat');
        const conversationClosed = ['resolved', 'closed', 'completed', 'blocked'].includes(currentConversation.status);
        const messageInput = document.getElementById('chatMessageInput');
        const sendButton = document.getElementById('btnSendLiveMessage');
        if (messageInput) messageInput.disabled = conversationClosed;
        if (sendButton) sendButton.disabled = conversationClosed;
        if (takeoverBtn) {
            takeoverBtn.disabled = conversationClosed;
            takeoverBtn.textContent = conversationClosed ? 'Đã kết thúc' : currentConversation.isHandover ? 'Trả lại AI' : 'Tiếp nhận';
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
            if (conversationClosed) composerStatusEl.textContent = 'Hội thoại đã kết thúc';
        }

        const timelineEl = document.getElementById('chatMessagesTimeline');
        if (timelineEl) {
            timelineEl.innerHTML = '';
            if (!currentConversation.messages || currentConversation.messages.length === 0) {
                const emptyWrap = document.createElement('div');
                emptyWrap.className = 'chat-timeline-empty-state';
                emptyWrap.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 280px; text-align: center; color: #4F7A65; padding: 32px 20px;';
                emptyWrap.innerHTML = '<div style="font-weight: 600; color: #236B48; font-size: 15px; margin-bottom: 8px;">Chưa có tin nhắn trong phiên này</div><p style="margin: 0; max-width: 440px; font-size: 13px; line-height: 1.5; color: #4F7A65;">Khách hàng chưa để lại lời nhắn hoặc đây là phiên mới. Bạn có thể nhấn <strong>"Tiếp nhận"</strong> và nhập tin nhắn bên dưới để chủ động trao đổi với khách.</p>';
                timelineEl.appendChild(emptyWrap);
                return;
            }
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

            if(currentConversation.hasMoreMessages){
                const more=document.createElement('button');more.type='button';more.className='admin-btn admin-btn-secondary';more.textContent='Tin nhắn trước';
                more.addEventListener('click',async()=>{
                    const first=currentConversation.messages[0];if(!first?.createdAtRaw)return;more.disabled=true;
                    try{
                        const older=await PawpalChatbot.loadConversationMessages(currentConversation.id,{beforeCreatedAt:first.createdAtRaw,beforeId:first.id});
                        const height=timelineEl.scrollHeight;
                        currentConversation.messages=[...older,...currentConversation.messages];currentConversation.hasMoreMessages=older.length===30;
                        if(PawpalChatbot.state.currentConversation?.id===currentConversation.id){renderCurrentChat();timelineEl.scrollTop=timelineEl.scrollHeight-height;}
                    }catch(e){PawpalChatbot.showToast?.('Không tải được lịch sử. Hãy thử lại.','error');more.disabled=false;}
                });timelineEl.prepend(more);
            }
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

        box.style.display = list.length ? 'flex' : 'none';
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
                recentOrderEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link chat-order-info" data-id="${escapeHtml(currentConversation.recentOrder.id)}">${escapeHtml(currentConversation.recentOrder.code || currentConversation.recentOrder.id)}</a>`;
            } else {
                recentOrderEl.textContent = 'Chưa có đơn hàng';
            }
        }

        if (recentBookingEl) {
            if (currentConversation.recentBooking) {
                recentBookingEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${escapeHtml(currentConversation.recentBooking.id)}">${escapeHtml(currentConversation.recentBooking.code || currentConversation.recentBooking.id)}</a> (${escapeHtml(currentConversation.recentBooking.status)})`;
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

    function clearAdminAttachment() {
        pendingAdminAttachment = null;
        const adminFileInput = document.getElementById('adminChatFileInput');
        const adminAttachPreview = document.getElementById('adminChatAttachPreview');
        if (adminFileInput) adminFileInput.value = '';
        if (adminAttachPreview) adminAttachPreview.style.display = 'none';
    }

    const operationRequests = new Map();
    async function operateConversation(action,content,button) {
        const conversation=PawpalChatbot.state?.currentConversation;
        if(!conversation || !supabase || button?.disabled)return false;
        const key=JSON.stringify([conversation.id,action,content,conversation.updatedAtRaw]);
        if(!operationRequests.has(key))operationRequests.set(key,crypto.randomUUID());
        if(button)button.disabled=true;
        try {
            const {error}=await supabase.rpc('act_admin_chat',{
                p_request_id:operationRequests.get(key),p_conversation_id:conversation.id,
                p_expected_updated_at:conversation.updatedAtRaw,p_action:action,p_content:content
            });
            if(error)throw error;
            operationRequests.delete(key);
            conversation.messagesLoaded=false;
            await PawpalChatbot.loadInboxSummary();
            return true;
        }catch(error){
            const messages={chat_changed:'Hội thoại đã thay đổi. Làm mới trước khi thao tác.',chat_assigned_to_other:'Hội thoại đang do nhân viên khác phụ trách.',chat_take_required:'Bạn cần tiếp nhận hội thoại trước.',chat_not_open:'Hội thoại đã kết thúc.',chat_forbidden:'Bạn không có quyền thao tác.'};
            PawpalChatbot.showToast?.(messages[error.message] || 'Không lưu được thao tác. Bản nháp được giữ lại.','error');return false;
        }finally{if(button)button.disabled=false;}
    }
    async function sendLiveMsg() {
        if(isSendingLiveMsg)return;
        const conversation=PawpalChatbot.state?.currentConversation,input=document.getElementById('chatMessageInput'),button=document.getElementById('btnSendLiveMessage');
        const text=input?.value.trim();if(!conversation || !text || input.disabled || button?.disabled)return;
        isSendingLiveMsg=true;
        try{if(await operateConversation('send',text,button)){
            if(PawpalChatbot.state.currentConversation?.id===conversation.id && input.value.trim()===text)input.value='';
        }}finally{isSendingLiveMsg=false;}
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
        document.getElementById('btnChatContext')?.addEventListener('click',()=>document.querySelector('.live-support-container')?.classList.toggle('context-open'));
        // Tab lọc
        document.querySelectorAll('.inbox-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.getAttribute('data-filter') || 'all';
                if (PawpalChatbot.state) PawpalChatbot.state.currentFilterTab = filter;
                sessionStorage.setItem('pawpal_admin_chatbot_filter_tab', filter);
                document.querySelectorAll('.inbox-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                PawpalChatbot.loadInboxSummary({page:1});
            });
        });

        // Tìm kiếm
        let inboxSearchTimer = null;
        document.getElementById('inboxSearchInput')?.addEventListener('input', () => {
            clearTimeout(inboxSearchTimer);
            inboxSearchTimer = setTimeout(() => {
                PawpalChatbot.loadInboxSummary({page:1});
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
        document.getElementById('btnToggleTakeover')?.addEventListener('click',event => {
            const conversation=PawpalChatbot.state?.currentConversation;if(!conversation)return;
            return operateConversation(conversation.isHandover?'release':'take','',event.currentTarget);
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
        if (btnAdminAttach) { btnAdminAttach.disabled=true;btnAdminAttach.title='Chưa triển khai lưu tệp'; }
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
                const note=document.getElementById('chatInternalNoteInput')?.value || '';
                if(await operateConversation('note',note,saveNoteButton))PawpalChatbot.showToast?.('Đã lưu ghi chú hội thoại.','success');

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

        let rewardTarget;
        const btnReward=document.getElementById('btnConfirmRewardPoints');
        document.getElementById('btnRewardPoints')?.addEventListener('click',()=>{
            const c=getCurrentConversationSafe();if(!c?.customerId)return PawpalChatbot.showToast?.('Cần chọn khách hàng.', 'error');
            rewardTarget={customer:c.customerId,conversation:c.id,request:crypto.randomUUID()};
            document.getElementById('rewardCustomerName').value=c.customerName;
            document.getElementById('inputCustomRewardPoints').value='';
            PawpalChatbot.openModal?.('rewardPointsModalOverlay');
        });
        document.querySelectorAll('.btn-preset-point').forEach(b=>b.addEventListener('click',()=>{document.getElementById('inputCustomRewardPoints').value=b.dataset.point;}));
        btnReward?.addEventListener('click',async()=>{
            if(!rewardTarget||btnReward.disabled)return;
            const points=Number(document.getElementById('inputCustomRewardPoints').value);
            const select=document.getElementById('selectRewardReason');
            const reason=select.options[select.selectedIndex].text;
            if(!Number.isSafeInteger(points)||points<=0||points>10000000)return PawpalChatbot.showToast?.('Số điểm không hợp lệ.', 'error');
            const key=JSON.stringify([points,reason]);if(rewardTarget.key&&rewardTarget.key!==key)rewardTarget.request=crypto.randomUUID();rewardTarget.key=key;
            btnReward.disabled=true;
            try{
                const {error}=await supabase.rpc('adjust_customer_points',{p_customer_id:rewardTarget.customer,p_points:points,p_reason:reason+' | Chat '+rewardTarget.conversation,p_request_id:rewardTarget.request});if(error)throw error;
                const c=getCurrentConversationSafe();if(c?.id===rewardTarget.conversation)c.contextLoaded=false;
                PawpalChatbot.closeModal?.('rewardPointsModalOverlay');await PawpalChatbot.loadInboxSummary();
                PawpalChatbot.showToast?.('Đã lưu điều chỉnh điểm.', 'success');
            }catch(e){PawpalChatbot.showToast?.('Chưa lưu được điểm. Hãy kiểm tra quyền và thử lại.', 'error');}finally{btnReward.disabled=false;}
        });

        // ====================================================================
        // MODAL 2: CHUYỂN TICKET (AUTOCOMPLETE GIAO DỊCH CHUẨN AGENTS.md)
        // ====================================================================

        const convertButton = document.getElementById('btnConfirmConvertTicket');
        const convertTitle = document.getElementById('inputConvertTicketTitle');
        const convertRef = document.getElementById('inputConvertRefId');
        let convertTarget;
        const convertDropdown = document.getElementById('convertTicketRefDropdown');
        function showConvertReferences() {
            convertDropdown.replaceChildren();
            const c = getCurrentConversationSafe();
            if (c?.id !== convertTarget?.id) return;
            const category = document.getElementById('selectConvertTicketCategory').value;
            const ref = category === 'order' ? c.recentOrder : c.recentBooking;
            if (ref?.id && ref.id.toLowerCase().includes(convertRef.value.trim().toLowerCase())) {
                const button = document.createElement('button');
                button.type = 'button'; button.className = 'admin-btn admin-btn-secondary';
                button.textContent = ref.code || ref.id;
                button.addEventListener('click', () => { convertRef.value = ref.id; convertDropdown.style.display = 'none'; });
                convertDropdown.append(button);
            } else {
                convertDropdown.textContent = 'Không có giao dịch phù hợp';
            }
            convertDropdown.style.display = 'block';
        }
        convertRef?.addEventListener('focus', showConvertReferences);
        convertRef?.addEventListener('input', showConvertReferences);
        document.getElementById('selectConvertTicketCategory')?.addEventListener('change', () => {
            convertRef.value = ''; convertDropdown.style.display = 'none';
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('#convertTicketModalOverlay .customer-autocomplete-wrapper')) convertDropdown.style.display = 'none';
        });
        document.getElementById('btnConvertToTicket')?.addEventListener('click', () => {
            const c = getCurrentConversationSafe();
            if (!c?.customerId || !c.isHandover) {
                PawpalChatbot.showToast?.('Cần khách hàng và nhân viên nhận phiên.', 'error'); return;
            }
            convertTarget = { id:c.id, version:c.updatedAtRaw, request:crypto.randomUUID() };
            convertTitle.value = '';convertRef.value = '';
            document.getElementById('convertTicketRefSelectedCard').style.display = 'none';
            PawpalChatbot.openModal?.('convertTicketModalOverlay');
        });
        document.querySelector('#convertTicketModalOverlay form')?.addEventListener('submit',e=>e.preventDefault());
        convertButton?.addEventListener('click', async () => {
            if (!convertTarget || convertButton.disabled) return;
            const subject=convertTitle.value.trim(), ref=convertRef.value.trim();
            if(subject.length<2 || subject.length>250 || (ref && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref))) {
                PawpalChatbot.showToast?.('Kiểm tra tiêu đề và mã giao dịch.', 'error');return;
            }
            const args={p_id:convertTarget.request,p_conversation_id:convertTarget.id,p_expected_updated_at:convertTarget.version,p_ref_id:ref||null,
                p_category:document.getElementById('selectConvertTicketCategory').value,p_subject:subject,
                p_priority:document.getElementById('selectConvertPriority').value};
            const key=JSON.stringify({...args,p_id:null});
            if(convertTarget.payload && convertTarget.payload!==key) args.p_id=convertTarget.request=crypto.randomUUID();
            convertTarget.payload=key;convertButton.disabled=true;
            try {
                const {error}=await supabase.rpc('create_chat_complaint',args);if(error)throw error;
                PawpalChatbot.closeModal?.('convertTicketModalOverlay');
                const c=getCurrentConversationSafe();if(c?.id===convertTarget.id)c.contextLoaded=false;
                await PawpalChatbot.loadInboxSummary();
                PawpalChatbot.showToast?.('Đã tạo khiếu nại.', 'success');
            }catch(error){PawpalChatbot.showToast?.('Chưa tạo được khiếu nại. Nội dung được giữ lại.', 'error');}
            finally{convertButton.disabled=false;}
        });

        // ====================================================================
        // MODAL 3: CHUYỂN CẤP QUẢN LÝ VÀ BÁC SĨ THÚ Y
        // ====================================================================

        let transferTarget, handlers=[],selectedHandler;
        const transferButton=document.getElementById('btnConfirmEscalate');
        const handlerInput=document.getElementById('selectEscalateTarget'),handlerOptions=document.getElementById('escalateTargetOptions');
        function renderHandlers(){
            handlerOptions.replaceChildren();
            handlers.filter(h=>h.full_name.toLowerCase().includes(handlerInput.value.toLowerCase())).forEach(h=>{
                const b=document.createElement('button');b.type='button';b.className='admin-btn admin-btn-secondary';b.textContent=h.full_name;
                b.addEventListener('click',()=>{selectedHandler=h.id;handlerInput.value=h.full_name;handlerOptions.style.display='none';});handlerOptions.append(b);
            });
            if(!handlerOptions.children.length)handlerOptions.textContent='Không có nhân viên khả dụng';
            handlerOptions.style.display='block';
        }
        handlerInput?.addEventListener('focus',renderHandlers);handlerInput?.addEventListener('input',()=>{selectedHandler=null;renderHandlers();});
        document.getElementById('btnEscalateManager')?.addEventListener('click',async()=>{
            const c=getCurrentConversationSafe();if(!c?.isHandover)return PawpalChatbot.showToast?.('Cần nhận phiên trước.', 'error');
            transferTarget={id:c.id,version:c.updatedAtRaw,request:crypto.randomUUID()};selectedHandler=null;handlers=[];handlerInput.value='';
            document.getElementById('escalateCustomerName').value=c.customerName;document.getElementById('inputEscalateNotes').value='';
            handlerOptions.style.display='none';PawpalChatbot.openModal?.('escalateManagerModalOverlay');
            const {data,error}=await supabase.rpc('get_admin_chat_handlers');if(error)PawpalChatbot.showToast?.('Không tải được nhân viên.', 'error');else handlers=data||[];
        });
        transferButton?.addEventListener('click',async()=>{
            if(!transferTarget||transferButton.disabled)return;
            if(!selectedHandler)return PawpalChatbot.showToast?.('Chọn nhân viên tiếp nhận.', 'error');
            const reason=document.getElementById('selectEscalateReason');
            const note=reason.options[reason.selectedIndex].text+' | '+document.getElementById('inputEscalateNotes').value.trim();
            const key=JSON.stringify([selectedHandler,note]);if(transferTarget.key&&transferTarget.key!==key)transferTarget.request=crypto.randomUUID();transferTarget.key=key;
            transferButton.disabled=true;
            try{
                const {error}=await supabase.rpc('transfer_admin_chat',{p_request_id:transferTarget.request,p_conversation_id:transferTarget.id,p_expected_updated_at:transferTarget.version,p_staff_id:selectedHandler,p_note:note});if(error)throw error;
                PawpalChatbot.closeModal?.('escalateManagerModalOverlay');await PawpalChatbot.loadInboxSummary();PawpalChatbot.showToast?.('Đã chuyển nhân viên.', 'success');
            }catch(e){PawpalChatbot.showToast?.('Chưa chuyển được phiên. Hãy kiểm tra và thử lại.', 'error');}finally{transferButton.disabled=false;}
        });

        // ====================================================================
        // MODAL 4: THƯ VIỆN CÂU MẪU CSKH CHUẨN MỰC
        // ====================================================================
        const btnOpenCannedModal = document.getElementById('btnOpenCannedModal');
        const inputSearchCanned = document.getElementById('inputSearchCanned');
        const selectCannedCategory = document.getElementById('selectCannedCategory');
        const cannedResponsesList = document.getElementById('cannedResponsesList');

        function renderCannedLibrary() {
            if (!cannedResponsesList) return;
            const searchVal = (inputSearchCanned?.value || '').toLowerCase().trim();
            const catVal = selectCannedCategory?.value || 'all';

            const filtered = cannedResponsesDatabase.map(r=>({...r,catName:r.category})).filter(item => {
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
                            <code style="background: #EEF5F1; padding: 2px 7px; border-radius: 6px; color: #236B48; font-weight: 700; font-size: 12px;">${escapeHtml(item.shortcut)}</code>
                            <span style="font-weight: 600; color: #203A2C; font-size: 13.5px;">${escapeHtml(item.title)}</span>
                        </div>
                        <span class="admin-badge badge-neutral" style="font-size: 11px;">${escapeHtml(item.catName)}</span>
                    </div>
                    <div style="font-size: 13px; color: #4F7A65; line-height: 1.5;">${escapeHtml(item.content)}</div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-apply-canned-response" data-content="${escapeHtml(item.content)}" style="padding: 5px 14px; font-size: 12.5px;">Chèn vào chat</button>
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

        btnOpenCannedModal?.addEventListener('click', async () => {
            PawpalChatbot.openModal?.('cannedResponsesModalOverlay');
            try {await loadLiveCannedResponses();
                selectCannedCategory.replaceChildren(new Option('Tất cả','all'),... [...new Set(cannedResponsesDatabase.map(r=>r.category))].map(c=>new Option(c,c)));
                renderCannedLibrary();
            } catch(e) { cannedResponsesDatabase=[];cannedResponsesList.textContent='Không tải được câu mẫu.'; }
        });

        inputSearchCanned?.addEventListener('input', renderCannedLibrary);
        selectCannedCategory?.addEventListener('change', renderCannedLibrary);

        // ====================================================================
        // ====================================================================
        // MODAL 5: TRA CỨU VẬN ĐƠN HỎA TỐC BƯU TÁ
        // ====================================================================

        let trackingTarget;
        document.addEventListener('click',async e=>{
            if(!e.target.closest('#linkRecentOrder, .chat-order-info'))return;
            const c=getCurrentConversationSafe();if(!c?.recentOrder?.id)return;
            const target={conversation:c.id,customer:c.customerId,order:c.recentOrder.id};trackingTarget=target;
            const summary=document.getElementById('trackingOrderSummary');summary.textContent='Đang tải...';
            PawpalChatbot.openModal?.('orderTrackingModalOverlay');
            const {data,error}=await supabase.from('sales_order').select('id,order_code,order_status').eq('id',target.order).eq('customer_id',target.customer).single();
            if(trackingTarget!==target)return;
            if(error){summary.textContent='Không tải được đơn hàng.';return;}
            const labels={shipping:'\u0110ang giao',returned:'\u0110\u00e3 tr\u1ea3 h\u00e0ng',pending:'Chờ xử lý',confirmed:'Đã xác nhận',processing:'Đang xử lý',shipped:'Đã xuất hàng',delivered:'Đã giao',completed:'Hoàn tất',cancelled:'Đã hủy'};
            target.text=(data.order_code||data.id)+': '+(labels[data.order_status]||'Chưa có nhãn trạng thái');summary.textContent=target.text;
        });
        document.getElementById('btnSendTrackingCardToChat')?.addEventListener('click',async e=>{
            if(!trackingTarget?.text||getCurrentConversationSafe()?.id!==trackingTarget.conversation)return;
            if(await operateConversation('send',trackingTarget.text,e.currentTarget))PawpalChatbot.closeModal?.('orderTrackingModalOverlay');
        });

        // ====================================================================
        // MODAL 6: CAMERA AN NINH PHÒNG THÚ CƯNG
        // ====================================================================
        // ====================================================================
        // MODAL 11: HOÀN TẤT CA CHAT VÀ GỬI ĐÁNH GIÁ CSAT
        // ====================================================================
        const btnResolveAction = document.getElementById('btnResolveChatAction');
        const btnHeaderResolve = document.getElementById('btnHeaderResolveChat');
        const btnConfirmResolve = document.getElementById('btnConfirmResolveChat');
        const resolveCustomerNameInput = document.getElementById('resolveChatCustomerName');
        const selectResolveReason = document.getElementById('selectResolveReason');
        const textareaResolveNotes = document.getElementById('textareaResolveNotes');


        let resolveTarget;
        function openResolveModal() {
            const c = getCurrentConversationSafe();
            if (!c?.isHandover) { PawpalChatbot.showToast?.('Cần nhận hội thoại trước khi hoàn tất.', 'error'); return; }
            resolveTarget = { id: c.id, version: c.updatedAtRaw, request: crypto.randomUUID() };
            resolveCustomerNameInput.value = c.customerName;
            textareaResolveNotes.value = '';
            selectResolveReason.value = 'resolved_complete';
            PawpalChatbot.openModal?.('modalResolveChatOverlay');
        }
        btnResolveAction?.addEventListener('click', openResolveModal);
        btnHeaderResolve?.addEventListener('click', openResolveModal);
        document.querySelector('#modalResolveChatOverlay form')?.addEventListener('submit', e => e.preventDefault());
        btnConfirmResolve?.addEventListener('click', async () => {
            if (!resolveTarget || btnConfirmResolve.disabled) return;
            const target = resolveTarget, reason = selectResolveReason.value, notes = textareaResolveNotes.value.trim();
            const survey=document.getElementById('checkboxSendCsatSurvey').checked;
            const payload = JSON.stringify([reason, notes, survey]);
            if (target.payload && target.payload !== payload) target.request = crypto.randomUUID();
            target.payload = payload;
            btnConfirmResolve.disabled = true;
            try {
                const { error } = await supabase.rpc('resolve_admin_chat', {
                    p_request_id: target.request, p_conversation_id: target.id,
                    p_expected_updated_at: target.version, p_reason: reason, p_notes: notes, p_send_survey:survey
                });
                if (error) throw error;
                const c = PawpalChatbot.state.currentConversation;
                if (c?.id === target.id) c.messagesLoaded = false;
                PawpalChatbot.closeModal?.('modalResolveChatOverlay');
                await PawpalChatbot.loadInboxSummary();
                PawpalChatbot.showToast?.('Đã lưu kết quả hoàn tất.', 'success');
            } catch (error) {
                PawpalChatbot.showToast?.('Chưa thể hoàn tất. Nội dung được giữ lại; hãy kiểm tra và tải lại hội thoại.', 'error');
            } finally { btnConfirmResolve.disabled = false; }
        });
    }
    Object.assign(PawpalChatbot.subtabs.live, {
        init: initLiveChatSubtab,
        renderConversationsList,
        renderCurrentChat,
        renderCustomerInfoPanel,
        handleIncomingMessage
    });
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLiveChatSubtab);
    } else {
        initLiveChatSubtab();
    }
})();
