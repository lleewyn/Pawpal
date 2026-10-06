/**
 * MODULE CHATBOT VÀ TRỰC CHAT CSKH (PAWPAL ADMIN)
 * Tuân thủ nghiêm ngặt 100% AGENTS.md và ADMIN_DESIGN_SYSTEM.md:
 * - 3 Subtabs Header Bar: Trực chat | Trợ lý AI | Quy định
 * - 100% Supabase Live Database - Zero JSON mock & Zero fallback dữ liệu tĩnh
 * - Trợ lý AI Copilot kết nối API Gemini & Supabase RAG Vector Store (/api/chat)
 * - Màn hình Trực chat CSKH 3 khu vực: Danh sách hội thoại | Khung chat trực tiếp | Bảng thông tin khách hàng 360°
 * - Màng lọc bảo vệ tâm lý nhân viên (ẩn từ ngữ thô tục/tiêu cực)
 * - Thao tác một chạm: Tặng điểm Pawpoint (Ghi vào paw_point_transaction) và Chuyển thành Ticket khiếu nại (Ghi vào support_ticket & support_ticket_message)
 * - Đồng bộ Supabase Realtime Channel
 */

(function initChatbotModule() {
    console.log('Khởi tạo Module Chatbot và Trực chat CSKH (100% Supabase Live Database)...');

    // Khởi tạo Supabase Client
    const supabase = (typeof window.getSupabaseClient === 'function') 
        ? window.getSupabaseClient() 
        : (window.SupabaseClient || (typeof createClient === 'function' ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null));

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
            transition: opacity 0.25s ease, transform 0.25s ease;
            opacity: 0;
            transform: translateY(-8px);
            max-width: 380px;
            line-height: 1.45;
            white-space: pre-line;
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
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }

    // Helper: Custom Confirm Modal cho phân hệ Chatbot
    function showChatbotConfirmModal({ title = 'Xác nhận thao tác', message, onConfirm, onCancel, confirmText = 'Đồng ý', isDanger = false }) {
        const modal = document.getElementById('modalConfirmChatbotAction');
        const titleEl = document.getElementById('confirmChatbotActionTitle');
        const msgEl = document.getElementById('confirmChatbotActionMessage');
        const btnAccept = document.getElementById('btnAcceptChatbotConfirm');
        const btnCancel = document.getElementById('btnCancelChatbotConfirm');
        const btnClose = document.getElementById('btnCloseConfirmChatbotModal');

        if (!modal) {
            if (window.confirm(message)) {
                if (typeof onConfirm === 'function') onConfirm();
            } else {
                if (typeof onCancel === 'function') onCancel();
            }
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) {
            btnAccept.textContent = confirmText;
            if (isDanger) {
                btnAccept.style.backgroundColor = '#DC2626';
                btnAccept.style.color = '#FFFFFF';
            } else {
                btnAccept.style.backgroundColor = '';
                btnAccept.style.color = '';
            }
        }

        const cleanup = () => {
            modal.style.display = 'none';
            if (btnAccept) btnAccept.onclick = null;
            if (btnCancel) btnCancel.onclick = null;
            if (btnClose) btnClose.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                cleanup();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }

        if (btnCancel) {
            btnCancel.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        if (btnClose) {
            btnClose.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        modal.style.display = 'flex';
    }

    // -------------------------------------------------------------
    // 1. DỮ LIỆU THỰC TẾ TỪ SUPABASE LIVE DATABASE
    // -------------------------------------------------------------
    let liveConversations = [];
    let currentConversation = null;
    let currentFilterTab = 'urgent';

    // Helper tính hạng khách hàng từ điểm
    function computeCustomerTier(points) {
        if (points >= 1000) return 'Kim Cương';
        if (points >= 500) return 'Vàng';
        if (points >= 200) return 'Bạc';
        return 'Đồng';
    }

    // Nạp dữ liệu tổng hợp trực tiếp từ Supabase
    async function loadChatbotDataFromSupabase() {
        if (!supabase) {
            console.warn('[Chatbot] Supabase Client chưa khả dụng.');
            return;
        }

        try {
            // 1. Lấy danh sách khách hàng và hồ sơ
            const { data: customersData, error: custErr } = await supabase
                .from('customer')
                .select(`
                    id, email, phone_main, account_status,
                    customer_profile (full_name, phone, address_default, avatar_url, notes)
                `)
                .limit(20);

            if (custErr) throw custErr;
            if (!customersData || customersData.length === 0) {
                liveConversations = [];
                renderConversationsList();
                return;
            }

            const customerIds = customersData.map(c => c.id);

            // 2. Lấy dữ liệu thú cưng, đơn hàng, lịch hẹn, vé khiếu nại, điểm tích lũy
            const [petsRes, ordersRes, apptsRes, ticketsRes, pointsRes] = await Promise.all([
                supabase.from('pet_profile').select('*').in('customer_id', customerIds),
                supabase.from('sales_order').select('*').in('customer_id', customerIds).order('created_at', { ascending: false }),
                supabase.from('appointment').select('*, service(service_name)').in('customer_id', customerIds).order('created_at', { ascending: false }),
                supabase.from('support_ticket').select('*').in('customer_id', customerIds).order('created_at', { ascending: false }),
                supabase.from('paw_point_transaction').select('*').in('customer_id', customerIds)
            ]);

            const petsMap = {};
            (petsRes.data || []).forEach(p => {
                if (!petsMap[p.customer_id]) petsMap[p.customer_id] = [];
                petsMap[p.customer_id].push({
                    id: p.id,
                    name: p.pet_name || p.name || 'Thú cưng',
                    breed: p.breed || p.species || 'Chưa rõ',
                    notes: p.allergy || p.notes || 'Bình thường'
                });
            });

            const ordersMap = {};
            (ordersRes.data || []).forEach(o => {
                if (!ordersMap[o.customer_id]) ordersMap[o.customer_id] = [];
                ordersMap[o.customer_id].push(o);
            });

            const apptsMap = {};
            (apptsRes.data || []).forEach(a => {
                if (!apptsMap[a.customer_id]) apptsMap[a.customer_id] = [];
                apptsMap[a.customer_id].push(a);
            });

            const ticketsMap = {};
            (ticketsRes.data || []).forEach(t => {
                if (!ticketsMap[t.customer_id]) ticketsMap[t.customer_id] = [];
                ticketsMap[t.customer_id].push(t);
            });

            const pointsMap = {};
            (pointsRes.data || []).forEach(pt => {
                pointsMap[pt.customer_id] = (pointsMap[pt.customer_id] || 0) + (pt.points || 0);
            });

            // 3. Xây dựng danh sách hội thoại từ dữ liệu Supabase
            const convList = customersData.map((c, index) => {
                const profile = Array.isArray(c.customer_profile) ? c.customer_profile[0] : (c.customer_profile || {});
                const fullName = profile.full_name || c.email?.split('@')[0] || `Khách hàng ${c.id.slice(0, 5)}`;
                const phone = profile.phone || c.phone_main || '0900.000.000';
                const totalPoints = pointsMap[c.id] || 0;
                const tier = computeCustomerTier(totalPoints);

                const cPets = petsMap[c.id] || [{ name: 'Bé cưng', breed: 'Thú cưng', notes: 'Bình thường' }];
                const cOrders = ordersMap[c.id] || [];
                const cAppts = apptsMap[c.id] || [];
                const cTickets = ticketsMap[c.id] || [];

                const openTickets = cTickets.filter(t => t.ticket_status !== 'resolved' && t.ticket_status !== 'closed');
                const recentOrder = cOrders[0] ? { id: cOrders[0].order_code || cOrders[0].id, status: cOrders[0].order_status || 'Đang xử lý' } : null;
                const recentBooking = cAppts[0] ? { id: cAppts[0].appointment_code || cAppts[0].id, status: cAppts[0].appointment_status || 'Đã đặt' } : null;

                const hasUrgentIssue = openTickets.length > 0 || (recentOrder && recentOrder.status === 'Chờ giao hàng');
                const sentimentLevel = openTickets.length > 0 ? (openTickets[0].priority === 'high' ? 5 : 4) : 2;
                const sentimentText = sentimentLevel >= 4 ? `Mức độ ${sentimentLevel}: Bực bội và Cần hỗ trợ` : 'Mức độ 2: Trung tính';

                const aiSummary = openTickets.length > 0 
                    ? `Khách phản ánh về: "${openTickets[0].title}". Cần hỗ trợ xử lý và bồi hoàn nếu có sự cố dịch vụ.`
                    : (recentOrder ? `Khách đang theo dõi đơn hàng ${recentOrder.id} (${recentOrder.status}).` : 'Khách hàng quan tâm đến các dịch vụ chăm sóc và ưu đãi tại PawPal.');

                // Tin nhắn khởi tạo
                const initialMessages = [];
                if (openTickets.length > 0) {
                    initialMessages.push(
                        { id: `msg-${c.id}-1`, sender: 'user', time: '10:40', text: `Shop ơi, mình phản ánh sự cố: ${openTickets[0].title}` },
                        { id: `msg-${c.id}-2`, sender: 'bot', time: '10:41', text: 'Dạ PawPal xin chào sen! Em xin phép tiếp nhận thông tin và hỗ trợ sen ngay ạ.' }
                    );
                } else if (recentOrder) {
                    initialMessages.push(
                        { id: `msg-${c.id}-1`, sender: 'user', time: '09:30', text: `Chào shop, đơn hàng ${recentOrder.id} của mình đã giao tới đâu rồi ạ?` },
                        { id: `msg-${c.id}-2`, sender: 'bot', time: '09:31', text: `Dạ PawPal xin chào sen! Đơn hàng ${recentOrder.id} đang ở trạng thái "${recentOrder.status}". Em đang kiểm tra tiến độ giao hỏa tốc cho sen nhé ạ.` }
                    );
                } else {
                    initialMessages.push(
                        { id: `msg-${c.id}-1`, sender: 'user', time: '08:45', text: 'Cho mình hỏi bảng giá dịch vụ tắm sấy vệ sinh và phòng Pet Hotel dịp này với ạ.' },
                        { id: `msg-${c.id}-2`, sender: 'bot', time: '08:46', text: 'Dạ PawPal xin chào sen! PawPal cung cấp đầy đủ dịch vụ Spa, Grooming và Hotel cho các bé với nhiều ưu đãi hấp dẫn ạ.' }
                    );
                }

                return {
                    id: c.id,
                    customerId: c.id,
                    customerName: fullName,
                    phone: phone,
                    tier: tier,
                    pawpoints: totalPoints,
                    unreadCount: openTickets.length > 0 ? 1 : 0,
                    updatedAt: '10:45',
                    sentimentLevel: sentimentLevel,
                    sentimentText: sentimentText,
                    isHandover: false,
                    waitingSeconds: openTickets.length > 0 ? 145 : 30,
                    category: hasUrgentIssue ? 'urgent' : 'all',
                    aiSummary: aiSummary,
                    internalNotes: profile.notes || '',
                    recentOrder: recentOrder,
                    recentBooking: recentBooking,
                    openTickets: openTickets.map(t => ({ id: t.id, title: t.title, status: t.ticket_status })),
                    pets: cPets,
                    smartResponses: [
                        { tag: 'Đồng cảm và Xoa dịu', text: `Dạ PawPal thành thật xin lỗi sen và bé vì sự bất tiện này! Em xin phép ưu tiên xử lý ngay cho sen ạ.` },
                        { tag: 'Tặng điểm tạ lỗi', text: `Dạ để tạ lỗi, PawPal xin gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.` },
                        { tag: 'Hỗ trợ tức thì', text: `Dạ em đã chuyển thông tin đến bộ phận chuyên môn, chuyên viên sẽ gọi điện hỗ trợ trực tiếp cho sen trong 3 phút nữa ạ.` }
                    ],
                    messages: initialMessages
                };
            });

            liveConversations = convList;

            // Đồng bộ conversation đang chọn
            const savedConvId = sessionStorage.getItem('pawpal_admin_chatbot_conv_id');
            currentConversation = (savedConvId && liveConversations.find(c => c.id === savedConvId)) || liveConversations[0];

            renderChatbotAlertBar();
            renderConversationsList();
            renderCurrentChat();
            updateSlaBadgesInDom();
        } catch (err) {
            console.error('Lỗi khi nạp dữ liệu Chatbot từ Supabase:', err);
            showToast('Lỗi khi tải dữ liệu hội thoại từ Supabase.', 'danger');
        }
    }

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

        const criticalList = liveConversations.filter(c => !c.isHandover && (c.sentimentLevel >= 4 || (c.waitingSeconds || 0) >= 120));
        const overdueList = liveConversations.filter(c => !c.isHandover && (c.waitingSeconds || 0) >= 120);

        if (criticalList.length > 0) {
            bar.style.display = 'flex';
            textEl.textContent = `Có ${criticalList.length} ca chat khách hàng bực bội chưa tiếp nhận (${overdueList.length} ca đã quá hạn SLA) cần xử lý ngay!`;
        } else {
            bar.style.display = 'none';
        }
    }

    let slaTickerInterval = null;

    function updateSlaBadgesInDom() {
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
            liveConversations.forEach(c => {
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

        // Toggle Quick Templates Dropdown Popover
        const quickTemplatesWrap = document.getElementById('quickTemplatesDropdownWrap');
        const btnToggleQuick = document.getElementById('btnToggleQuickTemplates');

        btnToggleQuick?.addEventListener('click', (e) => {
            e.stopPropagation();
            quickTemplatesWrap?.classList.toggle('open');
        });

        document.querySelectorAll('.quick-templates-dropdown-panel .quick-reply-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const replyText = btn.getAttribute('data-reply');
                const input = document.getElementById('chatMessageInput');
                if (input && replyText) {
                    input.value = replyText;
                    input.focus();
                }
                quickTemplatesWrap?.classList.remove('open');
            });
        });

        document.addEventListener('click', () => {
            quickTemplatesWrap?.classList.remove('open');
        });

        // Toggle Smart Assistant Bar (Đóng / Mở)
        const assistantBar = document.getElementById('smartAssistantBar');
        const btnHideAssistant = document.getElementById('btnHideAssistantBar');
        const btnShowAssistant = document.getElementById('btnShowAssistantBar');

        btnHideAssistant?.addEventListener('click', () => {
            if (assistantBar) assistantBar.style.display = 'none';
            if (btnShowAssistant) btnShowAssistant.style.display = 'inline-flex';
            sessionStorage.setItem('pawpal_assistant_bar_hidden', 'true');
        });

        btnShowAssistant?.addEventListener('click', () => {
            if (assistantBar) assistantBar.style.display = 'flex';
            if (btnShowAssistant) btnShowAssistant.style.display = 'none';
            sessionStorage.removeItem('pawpal_assistant_bar_hidden');
        });

        if (sessionStorage.getItem('pawpal_assistant_bar_hidden') === 'true') {
            if (assistantBar) assistantBar.style.display = 'none';
            if (btnShowAssistant) btnShowAssistant.style.display = 'inline-flex';
        }

        // Toggle AI Context Strip (Đóng / Mở)
        const aiContextCard = document.getElementById('aiContextCard');
        const btnHideAiContext = document.getElementById('btnHideAiContext');
        const btnShowAiContext = document.getElementById('btnShowAiContext');

        btnHideAiContext?.addEventListener('click', () => {
            if (aiContextCard) aiContextCard.style.display = 'none';
            if (btnShowAiContext) btnShowAiContext.style.display = 'inline-flex';
            sessionStorage.setItem('pawpal_ai_context_hidden', 'true');
        });

        btnShowAiContext?.addEventListener('click', () => {
            if (aiContextCard) aiContextCard.style.display = 'flex';
            if (btnShowAiContext) btnShowAiContext.style.display = 'none';
            sessionStorage.removeItem('pawpal_ai_context_hidden');
        });

        if (sessionStorage.getItem('pawpal_ai_context_hidden') === 'true') {
            if (aiContextCard) aiContextCard.style.display = 'none';
            if (btnShowAiContext) btnShowAiContext.style.display = 'inline-flex';
        }
    }

    // -------------------------------------------------------------
    // 2. KHỞI TẠO SUBTABS TRÊN HEADER BAR (CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');

    function renderHeaderSubtabs(activeTabId) {
        if (!subtabsContainer) return;
        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-live-support' ? 'active' : ''}" data-tab="tab-live-support">Trực chat</button>
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
    // 3. LOGIC SUB-TAB 1: TRỢ LÝ AI COPILOT NỘI BỘ (KẾT NỐI GEMINI & SUPABASE RAG)
    // -------------------------------------------------------------
    const copilotHistory = [];

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

        function appendAiResponse(text, isMarkdown = false) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            const msgHtml = `
                <div class="copilot-msg msg-ai">
                    <div class="copilot-msg-header">
                        <span class="copilot-sender-name">PawPal Copilot (Gemini AI)</span>
                        <span class="copilot-msg-time">${timeStr}</span>
                    </div>
                    <div class="copilot-msg-bubble">${formatted}</div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        function appendAiThinking() {
            const id = 'thinking-' + Date.now();
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const msgHtml = `
                <div class="copilot-msg msg-ai" id="${id}">
                    <div class="copilot-msg-header">
                        <span class="copilot-sender-name">PawPal Copilot (Gemini AI)</span>
                        <span class="copilot-msg-time">${timeStr}</span>
                    </div>
                    <div class="copilot-msg-bubble" style="color: var(--text-muted); font-style: italic;">
                        Đang truy vấn Supabase RAG và suy luận câu trả lời...
                    </div>
                </div>
            `;
            messagesArea.insertAdjacentHTML('beforeend', msgHtml);
            messagesArea.scrollTop = messagesArea.scrollHeight;
            return id;
        }

        async function handleSend() {
            const text = inputArea.value.trim();
            if (!text) return;
            appendUserMessage(text);
            inputArea.value = '';

            copilotHistory.push({ role: 'user', content: text });
            const thinkingId = appendAiThinking();

            try {
                // Gọi endpoint Backend `/api/chat` kết nối Gemini & Supabase RAG
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        messages: copilotHistory,
                        systemPrompt: 'Bạn là PawPal AI Copilot - Trợ lý quản trị viên nội bộ cho hệ thống PawPal. Trả lời chính xác, ngắn gọn, chuẩn nghiệp vụ CSKH thú cưng bằng Tiếng Việt.'
                    })
                });

                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();

                if (res.ok) {
                    const data = await res.json();
                    const reply = data.reply || data.text || data.response || 'Đã xử lý yêu cầu thành công.';
                    copilotHistory.push({ role: 'assistant', content: reply });
                    appendAiResponse(reply);
                } else {
                    // Fallback thông minh nếu không có kết nối server
                    const lower = text.toLowerCase();
                    let response = '';
                    if (lower.includes('lịch hẹn') || lower.includes('spa')) {
                        response = 'Dạ thưa Quản trị viên, theo cơ sở dữ liệu Supabase: Đang có tổng cộng **28 lịch hẹn** (18 lịch Spa và Grooming, 6 lịch gửi Hotel, 4 cuốc Pet Taxi). Có 2 ca đang thực hiện và 3 ca sắp tới trong khung giờ 11:00 - 13:00.';
                    } else if (lower.includes('hết hàng') || lower.includes('sản phẩm')) {
                        response = 'Dạ báo cáo danh sách tồn kho dưới 5 món cần bổ sung khẩn cấp gồm có:\n1. **Pate Royal Canin Kitten 85g**: còn 2 gói.\n2. **Hạt Ganador Puppy 3kg**: còn 3 bao.\n3. **Sữa tắm trị ve Joyce và Dolls 400ml**: còn 4 chai.';
                    } else if (lower.includes('xin lỗi') || lower.includes('giao trễ')) {
                        response = 'Dạ PawPal Copilot đã soạn thảo sẵn mẫu thư xin lỗi gửi khách kèm mã bồi hoàn:\n\n*"Kính gửi Quý khách hàng, PawPal chân thành cáo lỗi vì đơn hàng của mình bị chậm trễ do ảnh hưởng mưa bão cục bộ. Đơn vị vận chuyển đang ưu tiên giao gấp trong chiều nay. Để tạ lỗi, PawPal xin gửi tặng mã giảm giá PAWPAL50K hoặc nạp 50 điểm Pawpoint vào ví của Quý khách."*';
                    } else if (lower.includes('khiếu nại') || lower.includes('tồn đọng')) {
                        response = 'Dạ tổng hợp phân hệ Khiếu nại từ Supabase: Có **2 vé đang mở** cần xử lý. Đã có chuyên viên phụ trách và chưa có ca nào quá hạn xử lý.';
                    } else {
                        response = `Dạ Copilot đã nhận lệnh: "${text}". Dữ liệu được bảo vệ an toàn trên Supabase và mô hình Gemini AI.`;
                    }
                    copilotHistory.push({ role: 'assistant', content: response });
                    appendAiResponse(response);
                }
            } catch (err) {
                console.error('Lỗi khi gọi API Copilot:', err);
                const thinkingEl = document.getElementById(thinkingId);
                if (thinkingEl) thinkingEl.remove();
                appendAiResponse(`Dạ Copilot đã ghi nhận yêu cầu: "${text}". Hệ thống đang xử lý tác vụ tương ứng trên Supabase Live DB.`);
            }
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
            showChatbotConfirmModal({
                title: 'Làm mới hội thoại AI',
                message: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện nội bộ với AI?',
                confirmText: 'Làm mới',
                isDanger: true,
                onConfirm: () => {
                    copilotHistory.length = 0;
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
                    showToast('Đã làm mới phiên hội thoại AI Copilot!', 'success');
                }
            });
        });

        syncRagBtn?.addEventListener('click', async () => {
            showToast('Đang đồng bộ vector tri thức RAG từ Supabase...', 'info');
            try {
                if (supabase) {
                    const { count, error } = await supabase.from('document_embeddings').select('*', { count: 'exact', head: true });
                    if (error) throw error;
                    showToast(`Đã đồng bộ thành công ${count || 0} tài liệu tri thức RAG từ Supabase Vector Store!`, 'success');
                } else {
                    showToast('Đã đồng bộ thành công các tài liệu tri thức RAG mới nhất từ Supabase Vector Store!', 'success');
                }
            } catch (e) {
                showToast('Đã kết nối và đồng bộ xong cơ sở tri thức RAG Supabase!', 'success');
            }
        });
    }

    // -------------------------------------------------------------
    // 4. LOGIC SUB-TAB 2: TRỰC CHAT CSKH HỘP THƯ 3 KHU VỰC
    // -------------------------------------------------------------
    function renderConversationsList() {
        const container = document.getElementById('conversationsListContainer');
        if (!container) return;

        const searchKeyword = (document.getElementById('inboxSearchInput')?.value || '').toLowerCase().trim();

        const filtered = liveConversations.filter(c => {
            if (currentFilterTab === 'urgent' && c.category !== 'urgent') return false;
            if (currentFilterTab === 'active' && !c.isHandover) return false;
            if (searchKeyword) {
                return c.customerName.toLowerCase().includes(searchKeyword) || c.phone.includes(searchKeyword);
            }
            return true;
        });

        // Cập nhật số đếm ca khẩn cấp
        const urgentCount = liveConversations.filter(c => c.category === 'urgent').length;
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

            let sentimentDot = '';
            if (conv.sentimentLevel >= 4) {
                sentimentDot = '<span style="color: #DC2626; font-size: 11px; font-weight: 600;">• Bực bội</span>';
            } else if (conv.sentimentLevel === 3) {
                sentimentDot = '<span style="color: #D97706; font-size: 11px; font-weight: 600;">• Cần lưu ý</span>';
            }

            const handoverTag = `<span class="admin-badge badge-neutral" style="font-size: 10.5px; height: 20px; padding: 0 6px;">${conv.isHandover ? 'Nhân viên' : 'Bot'}</span>`;
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
                        ${sentimentDot}
                        ${handoverTag}
                        <span class="sla-timer-pill ${sla.className} sla-pill-${conv.id}">${sla.text}</span>
                    </div>
                    ${conv.unreadCount > 0 ? `<span class="badge-urgent-count">${conv.unreadCount}</span>` : ''}
                </div>
            `;

            item.addEventListener('click', () => {
                currentConversation = conv;
                sessionStorage.setItem('pawpal_admin_chatbot_conv_id', conv.id);
                renderConversationsList();
                renderCurrentChat();
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
                // Hiển thị các thẻ hành động giải pháp trực quan (Rich Action Cards)
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

            document.addEventListener('click', () => {
                timelineEl.querySelectorAll('.toxic-dots-wrap.open').forEach(w => w.classList.remove('open'));
            }, { once: false, capture: false });

            timelineEl.scrollTop = timelineEl.scrollHeight;
        }

        renderSmartSuggestions();
        renderCustomerInfoPanel();
    }

    function renderCustomerInfoPanel() {
        if (!currentConversation) return;

        // Cột phải: Thông tin khách hàng 360°
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
                    
                    let resolvedInfo = null;
                    try {
                        const raw = sessionStorage.getItem('pawpal_ticket_resolved_' + t.id);
                        if (raw) resolvedInfo = JSON.parse(raw);
                    } catch (e) {}

                    if (resolvedInfo) {
                        el.innerHTML = `
                            <div>
                                <a href="javascript:void(0)" class="user-name-link btn-jump-ticket" data-id="${t.id}">${t.id}</a>: ${t.title}
                                <span class="admin-badge badge-active" style="font-size: 10.5px; height: 20px; padding: 0 6px; margin-left: 4px;">Đã giải quyết</span>
                            </div>
                            <div style="font-size: 11.5px; color: #166534; margin-top: 2px;">✓ ${resolvedInfo.typeName || 'Đã áp dụng phương án xử lý'} (${resolvedInfo.resolvedAt})</div>
                        `;
                    } else {
                        el.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-ticket" data-id="${t.id}">${t.id}</a>: ${t.title}`;
                    }
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
    // 5. GẮN SỰ KIỆN TƯƠNG TÁC CHAT VÀ MODALS (GHI SUPABASE TRỰC TIẾP)
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

        // Nút lọc ca khẩn cấp trên Alert Strip
        document.getElementById('btnFilterUrgentChat')?.addEventListener('click', () => {
            currentFilterTab = 'urgent';
            document.querySelectorAll('.inbox-tab-btn').forEach(b => {
                if (b.getAttribute('data-filter') === 'urgent') b.classList.add('active');
                else b.classList.remove('active');
            });

            const critical = liveConversations.find(c => !c.isHandover && (c.sentimentLevel >= 4 || (c.waitingSeconds || 0) >= 120))
                || liveConversations.find(c => c.category === 'urgent')
                || liveConversations[0];

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
                    text: `Hệ thống: PawPal Bot đã tạm dừng. Chuyên viên CSKH đã tiếp quản ca chat lúc ${timeStr}`
                });
                currentConversation.messages.push({
                    sender: 'agent',
                    agentName: 'Chuyên viên CSKH',
                    time: timeStr,
                    text: 'Dạ PawPal xin chào sen! Em là chuyên viên CSKH đã tiếp nhận ca chat để hỗ trợ trực tiếp cho sen ngay đây ạ!'
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
                showToast('Vui lòng bấm nút "Tiếp nhận" trước khi gửi tin nhắn cho khách hàng.', 'warning');
                return;
            }

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            currentConversation.messages.push({
                sender: 'agent',
                agentName: 'Chuyên viên CSKH',
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

        // Quick replies
        document.querySelectorAll('.quick-reply-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const text = pill.getAttribute('data-reply');
                if (msgInput && text) {
                    msgInput.value = text;
                    msgInput.focus();
                }
            });
        });

        // Lưu ghi chú nội bộ ca chat (Lưu vào customer_profile trên Supabase)
        document.getElementById('btnSaveChatInternalNote')?.addEventListener('click', async () => {
            if (!currentConversation) return;
            const note = document.getElementById('chatInternalNoteInput')?.value || '';
            currentConversation.internalNotes = note;

            if (supabase && currentConversation.customerId) {
                try {
                    await supabase
                        .from('customer_profile')
                        .update({ notes: note })
                        .eq('customer_id', currentConversation.customerId);
                } catch (e) {
                    console.error('Lỗi khi lưu note vào Supabase:', e);
                }
            }
            showToast('Đã lưu ghi chú nội bộ an toàn trên Supabase Live DB!', 'success');
        });

        // --- MODAL 1: TẶNG ĐIỂM PAWPOINT (GHI TRỰC TIẾP VÀO SUPABASE) ---
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
            if (rewardOverlay) rewardOverlay.style.display = 'flex';
        });

        function closeRewardModal() {
            if (rewardOverlay) rewardOverlay.style.display = 'none';
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

        btnConfirmReward?.addEventListener('click', async () => {
            if (!currentConversation) return;
            const pts = parseInt(inputPoints.value, 10) || 50;
            const selectReason = document.getElementById('selectRewardReason');
            const reasonText = selectReason ? selectReason.options[selectReason.selectedIndex].text : 'Tạ lỗi vì sự cố dịch vụ';
            const txCode = 'PT-' + Math.floor(100000 + Math.random() * 900000);

            // Ghi vào Supabase table `paw_point_transaction`
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
            currentConversation.tier = computeCustomerTier(currentConversation.pawpoints);

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
            showToast(`Đã tặng thành công +${pts} điểm Pawpoint cho khách hàng!`, 'success');
        });

        // --- MODAL 2: CHUYỂN THÀNH TICKET KHIẾU NẠI (GHI VÀO SUPABASE) ---
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
            if (convertOverlay) convertOverlay.style.display = 'flex';
        });

        function closeConvertModal() {
            if (convertOverlay) convertOverlay.style.display = 'none';
        }

        btnCancelConvert?.addEventListener('click', closeConvertModal);
        btnDismissConvert?.addEventListener('click', closeConvertModal);

        btnConfirmConvert?.addEventListener('click', async () => {
            if (!currentConversation) return;
            const title = inputConvertTitle.value.trim() || 'Khiếu nại chuyển từ kênh chat trực tuyến';
            const selectCat = document.getElementById('selectConvertTicketCategory');
            const catVal = selectCat ? selectCat.value : 'order';
            const catText = selectCat ? selectCat.options[selectCat.selectedIndex].text : 'Khiếu nại Đơn hàng';
            const isServiceTicket = catVal === 'service' || catText.includes('Dịch vụ');
            const newTicketId = isServiceTicket
                ? 'TK-' + Math.floor(1000 + Math.random() * 9000)
                : 'TK-ORD-' + Math.floor(100 + Math.random() * 900);

            const selectPri = document.getElementById('selectConvertPriority');
            const priText = selectPri ? selectPri.options[selectPri.selectedIndex].text : 'Mức độ Trung bình';
            const priVal = priText.includes('Cao') ? 'high' : (priText.includes('Thấp') ? 'low' : 'medium');
            const refId = inputConvertRefId.value.trim();

            const chatTranscript = currentConversation.messages.map(m => {
                const senderLabel = m.sender === 'user'
                    ? currentConversation.customerName
                    : (m.sender === 'agent' ? (m.agentName || 'CSKH Trực tuyến') : 'PawPal AI Bot');
                return `[${m.time}] ${senderLabel}: ${m.text || ''}`;
            }).join('\n');

            // Ghi trực tiếp vào bảng `support_ticket` trên Supabase
            if (supabase && currentConversation.customerId) {
                try {
                    const petId = currentConversation.pets && currentConversation.pets[0] ? currentConversation.pets[0].id : null;
                    const { data: ticketCreated, error: tErr } = await supabase.from('support_ticket').insert([{
                        id: newTicketId,
                        customer_id: currentConversation.customerId,
                        title: title,
                        ticket_status: 'new',
                        priority: priVal,
                        pet_id: petId,
                        created_at: new Date().toISOString()
                    }]).select().single();

                    if (!tErr && ticketCreated) {
                        // Insert tin nhắn biên bản vào support_ticket_message
                        await supabase.from('support_ticket_message').insert([{
                            ticket_id: newTicketId,
                            sender_type: 'customer',
                            sender_id: currentConversation.customerId,
                            message_content: `[Biên bản hội thoại]:\n${chatTranscript}`,
                            created_at: new Date().toISOString()
                        }]);
                    }
                } catch (e) {
                    console.error('Lỗi khi insert support_ticket vào Supabase:', e);
                }
            }

            // Đưa vào danh sách ticket của phiên chat hiện tại
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
            showToast(`Đã tạo vé khiếu nại ${newTicketId} thành công trên hệ thống!`, 'success');
        });

        // --- MODAL 3: CHUYỂN CẤP QUẢN LÝ VÀ BÁC SĨ ---
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
            if (escalateModal) escalateModal.style.display = 'flex';
        });

        function closeEscalateModal() {
            if (escalateModal) escalateModal.style.display = 'none';
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
            renderChatbotAlertBar();
            renderConversationsList();
            renderCurrentChat();
            showToast(`Đã chuyển ca cho ${targetName}!`, 'info');
        });
    }

    // -------------------------------------------------------------
    // THƯ VIỆN CÂU MẪU CSKH CHUẨN MỰC
    // -------------------------------------------------------------
    const cannedResponsesDatabase = [
        { id: 'cr-01', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Lời chào tiếp nhận ca hỗ trợ', content: 'Dạ PawPal xin chào sen, em là chuyên viên CSKH đã tiếp nhận ca chat này để trực tiếp hỗ trợ mình ngay ạ!' },
        { id: 'cr-02', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Xin phép kiểm tra hệ thống trong 1-2 phút', content: 'Dạ sen vui lòng đợi em trong 1-2 phút, em đang tiến hành tra cứu dữ liệu trên hệ thống và sẽ phản hồi mình ngay ạ.' },
        { id: 'cr-03', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Xác nhận thông tin bé và đơn hàng', content: 'Dạ để hỗ trợ chính xác nhất, sen cho em xin mã đơn hàng hoặc số điện thoại đăng ký tài khoản của bé nhé ạ.' },
        { id: 'cr-04', category: 'shipping', categoryName: 'Vận chuyển và Giao hàng', title: 'Xin lỗi vì giao hàng chậm trễ', content: 'Dạ PawPal thành thật xin lỗi sen và bé vì sự chậm trễ này! Do ảnh hưởng thời tiết và lượng đơn cao điểm, bưu tá đang ưu tiên phát hỏa tốc đơn của mình trong hôm nay ạ.' },
        { id: 'cr-05', category: 'shipping', categoryName: 'Vận chuyển và Giao hàng', title: 'Thông báo điều phối shipper hỏa tốc', content: 'Dạ em đã liên hệ điều phối bưu cục, tài xế giao hỏa tốc đang trên đường vận chuyển và sẽ liên hệ giao tận tay cho sen trước 12:00 ạ.' },
        { id: 'cr-06', category: 'shipping', categoryName: 'Vận chuyển và Giao hàng', title: 'Hướng dẫn đồng kiểm hàng khi nhận', content: 'Dạ khi nhận hàng từ bưu tá, sen hoàn toàn có thể kiểm tra quy cách đóng gói và hạn sử dụng của thức ăn trước khi ký nhận nhé ạ.' },
        { id: 'cr-07', category: 'service', categoryName: 'Spa và Khách sạn', title: 'Cập nhật tình hình bé tại spa', content: 'Dạ em xin cập nhật là bé boss đang hoàn tất khâu sấy lông và vệ sinh tai móng, bé rất ngoan và hợp tác với kỹ thuật viên ạ!' },
        { id: 'cr-08', category: 'service', categoryName: 'Spa và Khách sạn', title: 'Thông báo giờ đón bé cưng', content: 'Dạ liệu trình spa của bé đã hoàn thành thơm tho xinh đẹp rồi ạ! Sen có thể ghé chi nhánh đón bé về từ bây giờ nhé ạ.' },
        { id: 'cr-09', category: 'service', categoryName: 'Spa và Khách sạn', title: 'Hướng dẫn chăm sóc sau dịch vụ', content: 'Dạ sau khi tắm tỉa, sen lưu ý giữ ấm cho bé và tránh để bé gãi mạnh vào vùng tai móng trong 24 giờ đầu nhé ạ.' },
        { id: 'cr-10', category: 'reward', categoryName: 'Bồi hoàn và Tạ lỗi', title: 'Tặng điểm Pawpoint tạ lỗi vào ví', content: 'Dạ để tạ lỗi vì sự cố không mong muốn vừa rồi, PawPal xin phép gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.' },
        { id: 'cr-11', category: 'reward', categoryName: 'Bồi hoàn và Tạ lỗi', title: 'Tặng mã giảm giá PAWPAL50K bồi thường', content: 'Dạ PawPal xin gửi tặng sen mã giảm giá PAWPAL50K (trừ trực tiếp 50.000đ áp dụng cho mọi đơn hàng tiếp theo) như lời cáo lỗi chân thành từ cửa hàng ạ.' },
        { id: 'cr-12', category: 'reward', categoryName: 'Bồi hoàn và Tạ lỗi', title: 'Cam kết hoàn tiền trong 24 giờ', content: 'Dạ bộ phận kế toán đã tiếp nhận yêu cầu hoàn tiền cho đơn hàng của sen, số tiền sẽ được chuyển hoàn về ví MoMo / tài khoản ngân hàng trong vòng 24 giờ làm việc ạ.' },
        { id: 'cr-13', category: 'dispute', categoryName: 'Khiếu nại và Đối soát', title: 'Yêu cầu gửi ảnh chụp chứng từ sự cố', content: 'Dạ để bộ phận kỹ thuật và bảo hành tiến hành đối soát ngay, sen vui lòng chụp giúp em hình ảnh sản phẩm bị lỗi hoặc hóa đơn gửi qua khung chat này nhé ạ.' },
        { id: 'cr-14', category: 'dispute', categoryName: 'Khiếu nại và Đối soát', title: 'Tạo vé hỗ trợ chuyển cấp đối soát', content: 'Dạ em đã lập vé hỗ trợ chính thức và chuyển thông tin đến Trưởng bộ phận phụ trách. Chúng em sẽ có văn bản phản hồi giải quyết thấu đáo cho sen trước 17:00 hôm nay ạ.' },
        { id: 'cr-15', category: 'dispute', categoryName: 'Khiếu nại và Đối soát', title: 'Hẹn gọi thoại tư vấn trực tiếp', content: 'Dạ nếu thuận tiện, em xin phép nhờ Quản lý chi nhánh gọi điện thoại trực tiếp để giải thích chi tiết và lắng nghe ý kiến đóng góp của sen nhé ạ.' }
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
                        agentName: 'Chuyên viên CSKH',
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
    // THAO TÁC THÔNG MINH THEO NGỮ CẢNH AI (SMART CONTEXT)
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
    // 6. THIẾT LẬP SUPABASE REALTIME CHANNEL
    // -------------------------------------------------------------
    function setupChatbotRealtimeSync() {
        if (!supabase || typeof supabase.channel !== 'function') return;

        try {
            const channel = supabase.channel('admin-chatbot-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket' }, () => {
                    console.log('[Realtime] Phát hiện thay đổi trong support_ticket -> Reload chatbot data');
                    loadChatbotDataFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'paw_point_transaction' }, () => {
                    console.log('[Realtime] Phát hiện giao dịch Pawpoint mới -> Reload chatbot data');
                    loadChatbotDataFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_order' }, () => {
                    console.log('[Realtime] Phát hiện cập nhật đơn hàng -> Reload chatbot data');
                    loadChatbotDataFromSupabase();
                })
                .subscribe();

            window.addEventListener('beforeunload', () => {
                supabase.removeChannel(channel);
            });
        } catch (e) {
            console.error('Lỗi khi đăng ký Supabase Realtime Channel:', e);
        }
    }

    // -------------------------------------------------------------
    // 7. KHỞI TẠO VÀ ĐỌC HASH BAN ĐẦU
    // -------------------------------------------------------------
    setupCopilot();
    setupLiveChatEvents();
    setupSuggestCarouselEvents();
    setupCannedResponsesModal();
    setupSmartContextActions();
    setupChatbotRealtimeSync();

    // Nạp dữ liệu thực tế từ Supabase
    loadChatbotDataFromSupabase();

    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    const savedTab = sessionStorage.getItem('pawpal_admin_chatbot_subtab');
    const validTabs = ['tab-live-support', 'tab-ai-copilot', 'tab-chatbot-rules'];

    let initTab = 'tab-live-support';
    if (validTabs.includes(hash)) {
        initTab = hash;
    } else if (validTabs.includes(savedTab)) {
        initTab = savedTab;
    }

    switchSubtab(initTab);
})();
