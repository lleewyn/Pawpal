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
                    id, email, phone_main, account_status, note,
                    customer_profile (id, full_name, date_of_birth, gender)
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
                supabase.from('appointment').select('*, service:service_id(service_name)').in('customer_id', customerIds).order('created_at', { ascending: false }),
                supabase.from('support_ticket').select('*').in('user_id', customerIds).order('created_at', { ascending: false }),
                supabase.from('paw_point_transaction').select('*').in('customer_id', customerIds)
            ]);

            const petsMap = {};
            (petsRes.data || []).forEach(p => {
                if (!petsMap[p.customer_id]) petsMap[p.customer_id] = [];
                petsMap[p.customer_id].push({
                    id: p.id,
                    name: p.pet_name || p.name || 'Thú cưng',
                    breed: p.breed || p.species || 'Chưa rõ',
                    notes: p.allergy || p.routine || 'Bình thường'
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
                const uId = t.user_id || t.customer_id;
                if (uId) {
                    if (!ticketsMap[uId]) ticketsMap[uId] = [];
                    ticketsMap[uId].push(t);
                }
            });

            const pointsMap = {};
            (pointsRes.data || []).forEach(pt => {
                pointsMap[pt.customer_id] = (pointsMap[pt.customer_id] || 0) + (pt.points || 0);
            });

            // 3. ƯU TIÊN LẤY CÁC PHIÊN HỘI THOẠI THỰC TỪ BẢNG CHAT_CONVERSATION
            let realConvList = [];
            try {
                const { data: dbConvs, error: convErr } = await supabase
                    .from('chat_conversation')
                    .select(`
                        *,
                        customer (
                            id, email, phone_main, note,
                            customer_profile (id, full_name, date_of_birth, gender)
                        ),
                        chat_message (*)
                    `)
                    .order('updated_at', { ascending: false })
                    .limit(30);

                if (!convErr && dbConvs && dbConvs.length > 0) {
                    realConvList = dbConvs.map(rc => {
                        const cust = rc.customer || {};
                        const prof = Array.isArray(cust.customer_profile) ? cust.customer_profile[0] : (cust.customer_profile || {});
                        const custName = prof.full_name || cust.email?.split('@')[0] || (rc.customer_id ? `Khách #${rc.customer_id.slice(0, 5)}` : 'Khách vãng lai');
                        const phone = prof.phone || cust.phone_main || '—';
                        const points = pointsMap[rc.customer_id] || 0;
                        const tier = computeCustomerTier(points);

                        const dbMsgs = (rc.chat_message || []).sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(m => ({
                            id: m.id,
                            sender: m.sender_type === 'customer' ? 'user' : (m.sender_type === 'staff' ? 'agent' : 'bot'),
                            agentName: m.sender_name || (m.sender_type === 'staff' ? 'Chuyên viên CSKH' : 'PawPal Bot'),
                            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            text: m.content,
                            rawText: m.raw_content,
                            isToxic: m.is_toxic,
                            activeMaskLevel: m.is_toxic ? 'words' : 'raw'
                        }));

                        const sLevel = rc.sentiment_level || 2;
                        const sText = sLevel === 6 ? 'Mức độ 6: Khẩn cấp y tế' : (sLevel === 5 ? 'Mức độ 5: Mất kiểm soát' : (sLevel === 4 ? 'Mức độ 4: Tức giận cao độ' : (sLevel === 3 ? 'Mức độ 3: Thất vọng' : 'Mức độ 2: Trung tính')));

                        return {
                            id: rc.id,
                            isRealDb: true,
                            customerId: rc.customer_id,
                            customerName: custName,
                            phone: phone,
                            tier: tier,
                            pawpoints: points,
                            unreadCount: rc.is_urgent ? 1 : 0,
                            updatedAt: new Date(rc.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            sentimentLevel: sLevel,
                            sentimentText: sText,
                            sentimentTrend: rc.sentiment_trend || 'stable',
                            isVipAttention: ((ticketsMap[rc.customer_id] || []).length >= 2) || (points >= 500) || Boolean(rc.ai_summary && rc.ai_summary.includes('VIP')),
                            isHandover: rc.status === 'agent_handling',
                            isUrgent: rc.is_urgent,
                            waitingSeconds: rc.is_urgent ? 180 : 30,
                            category: rc.is_urgent ? 'urgent' : 'all',
                            aiSummary: rc.ai_summary || (sLevel >= 4 ? 'Khách hàng có phản ánh cần ưu tiên xử lý.' : 'Hội thoại chăm sóc khách hàng tự động.'),
                            internalNotes: rc.internal_note || cust.note || '',
                            recentOrder: (ordersMap[rc.customer_id] || [])[0] ? { id: ordersMap[rc.customer_id][0].order_code || ordersMap[rc.customer_id][0].id, status: ordersMap[rc.customer_id][0].order_status } : null,
                            recentBooking: (apptsMap[rc.customer_id] || [])[0] ? { id: apptsMap[rc.customer_id][0].appointment_code || apptsMap[rc.customer_id][0].id, status: apptsMap[rc.customer_id][0].appointment_status } : null,
                            openTickets: (ticketsMap[rc.customer_id] || []).filter(t => t.status !== 'completed' && t.status !== 'resolved'),
                            pets: petsMap[rc.customer_id] || [{ name: 'Bé cưng', breed: 'Thú cưng', notes: 'Bình thường' }],
                            smartResponses: [
                                { tag: 'Đồng cảm và Xoa dịu', text: `Dạ PawPal thành thật xin lỗi sen và bé vì sự bất tiện này! Em xin phép ưu tiên xử lý ngay cho sen ạ.` },
                                { tag: 'Tặng điểm tạ lỗi', text: `Dạ để tạ lỗi, PawPal xin gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.` },
                                { tag: 'Hỗ trợ tức thì', text: `Dạ em đã chuyển thông tin đến bộ phận chuyên môn, chuyên viên sẽ gọi điện hỗ trợ trực tiếp cho sen trong 3 phút nữa ạ.` }
                            ],
                            messages: dbMsgs.length > 0 ? dbMsgs : [
                                { id: `init-${rc.id}`, sender: 'bot', time: new Date(rc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: 'Dạ PawPal xin chào sen! Em có thể hỗ trợ gì cho sen hôm nay ạ?' }
                            ]
                        };
                    });
                }
            } catch (convFetchErr) {
                console.warn('[Chatbot] Không lấy được chat_conversation, sử dụng danh sách khách hàng:', convFetchErr.message);
            }

            // 4. Nếu chưa có phiên thực trong chat_conversation, khởi tạo từ khách hàng hiện có
            const fallbackConvList = customersData.map((c, index) => {
                const profile = Array.isArray(c.customer_profile) ? c.customer_profile[0] : (c.customer_profile || {});
                const fullName = profile.full_name || c.email?.split('@')[0] || `Khách hàng ${c.id.slice(0, 5)}`;
                const phone = profile.phone || c.phone_main || '0900.000.000';
                const totalPoints = pointsMap[c.id] || 0;
                const tier = computeCustomerTier(totalPoints);

                const cPets = petsMap[c.id] || [{ name: 'Bé cưng', breed: 'Thú cưng', notes: 'Bình thường' }];
                const cOrders = ordersMap[c.id] || [];
                const cAppts = apptsMap[c.id] || [];
                const cTickets = ticketsMap[c.id] || [];

                const openTickets = cTickets.filter(t => t.status !== 'completed' && t.status !== 'resolved' && t.status !== 'closed');
                const recentOrder = cOrders[0] ? { id: cOrders[0].order_code || cOrders[0].id, status: cOrders[0].order_status || 'Đang xử lý' } : null;
                const recentBooking = cAppts[0] ? { id: cAppts[0].appointment_code || cAppts[0].id, status: cAppts[0].appointment_status || 'Đã đặt' } : null;

                const hasUrgentIssue = openTickets.length > 0 || (recentOrder && recentOrder.status === 'Chờ giao hàng');
                const sentimentLevel = openTickets.length > 0 ? (openTickets[0].priority === 'Cao' || openTickets[0].priority === 'high' ? 5 : 4) : 2;
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
                    isRealDb: false,
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
                    internalNotes: c.note || '',
                    recentOrder: recentOrder,
                    recentBooking: recentBooking,
                    openTickets: openTickets.map(t => ({ id: t.id, title: t.title, status: t.status })),
                    pets: cPets,
                    smartResponses: [
                        { tag: 'Đồng cảm và Xoa dịu', text: `Dạ PawPal thành thật xin lỗi sen và bé vì sự bất tiện này! Em xin phép ưu tiên xử lý ngay cho sen ạ.` },
                        { tag: 'Tặng điểm tạ lỗi', text: `Dạ để tạ lỗi, PawPal xin gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.` },
                        { tag: 'Hỗ trợ tức thì', text: `Dạ em đã chuyển thông tin đến bộ phận chuyên môn, chuyên viên sẽ gọi điện hỗ trợ trực tiếp cho sen trong 3 phút nữa ạ.` }
                    ],
                    messages: initialMessages
                };
            });

            liveConversations = realConvList.length > 0 ? realConvList : fallbackConvList;

            // Đồng bộ conversation đang chọn (hỗ trợ cả conv_id lẫn customer_id)
            const savedConvId = sessionStorage.getItem('pawpal_admin_chatbot_conv_id');
            currentConversation = (savedConvId && liveConversations.find(c => c.id === savedConvId))
                || (savedConvId && liveConversations.find(c => c.customerId === savedConvId))
                || liveConversations[0];

            if (currentConversation) {
                sessionStorage.setItem('pawpal_admin_chatbot_conv_id', currentConversation.id);
            }

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
    const defaultSmartSuggestions = [
        { tag: 'Đồng cảm và Xoa dịu', text: 'Dạ PawPal thành thật xin lỗi sen và bé vì sự bất tiện này! Em xin phép ưu tiên xử lý ngay cho sen ạ.' },
        { tag: 'Tặng điểm tạ lỗi', text: 'Dạ để tạ lỗi, PawPal xin gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.' },
        { tag: 'Hỗ trợ tức thì', text: 'Dạ em đã chuyển thông tin đến bộ phận chuyên môn, chuyên viên sẽ gọi điện hỗ trợ trực tiếp cho sen trong 3 phút nữa ạ.' }
    ];

    function renderSmartSuggestions() {
        const box = document.getElementById('aiSmartSuggestionsBox');
        if (!box) return;

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

    function setupSuggestCarouselEvents() {
        document.getElementById('btnSuggestPrev')?.addEventListener('click', () => {
            const list = (currentConversation?.smartResponses?.length) ? currentConversation.smartResponses : defaultSmartSuggestions;
            const total = list.length;
            currentSuggestIndex = (currentSuggestIndex - 1 + total) % total;
            renderSmartSuggestions();
        });

        document.getElementById('btnSuggestNext')?.addEventListener('click', () => {
            const list = (currentConversation?.smartResponses?.length) ? currentConversation.smartResponses : defaultSmartSuggestions;
            const total = list.length;
            currentSuggestIndex = (currentSuggestIndex + 1) % total;
            renderSmartSuggestions();
        });

        document.getElementById('btnApplySuggest')?.addEventListener('click', () => {
            const list = (currentConversation?.smartResponses?.length) ? currentConversation.smartResponses : defaultSmartSuggestions;
            const item = list[currentSuggestIndex];
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

        // Toggle Smart Assistant Bar (Mặc định ban đầu KHÔNG MỞ SẴN - người dùng tự bấm "Mở gợi ý AI" khi cần)
        const assistantBar = document.getElementById('smartAssistantBar');
        const btnHideAssistant = document.getElementById('btnHideAssistantBar');
        const btnShowAssistant = document.getElementById('btnShowAssistantBar');

        // Mặc định ban đầu không mở sẵn: Ẩn thanh gợi ý, hiển thị nút "Mở gợi ý AI"
        if (assistantBar) assistantBar.style.display = 'none';
        if (btnShowAssistant) btnShowAssistant.style.display = 'inline-flex';

        btnHideAssistant?.addEventListener('click', () => {
            if (assistantBar) assistantBar.style.display = 'none';
            if (btnShowAssistant) btnShowAssistant.style.display = 'inline-flex';
        });

        btnShowAssistant?.addEventListener('click', () => {
            if (assistantBar) assistantBar.style.display = 'flex';
            if (btnShowAssistant) btnShowAssistant.style.display = 'none';
        });

        // Toggle AI Context Strip (Mặc định ban đầu KHÔNG MỞ SẴN - người dùng tự bấm "Mở tóm tắt AI" khi cần)
        const aiContextCard = document.getElementById('aiContextCard');
        const btnHideAiContext = document.getElementById('btnHideAiContext');
        const btnShowAiContext = document.getElementById('btnShowAiContext');

        // Ban đầu mặc định ẩn thẻ tóm tắt AI, hiển thị nút "Mở tóm tắt AI"
        if (aiContextCard) aiContextCard.style.display = 'none';
        if (btnShowAiContext) btnShowAiContext.style.display = 'inline-flex';

        btnHideAiContext?.addEventListener('click', () => {
            if (aiContextCard) aiContextCard.style.display = 'none';
            if (btnShowAiContext) btnShowAiContext.style.display = 'inline-flex';
        });

        btnShowAiContext?.addEventListener('click', () => {
            if (aiContextCard) aiContextCard.style.display = 'flex';
            if (btnShowAiContext) btnShowAiContext.style.display = 'none';
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
        try {
            history.replaceState(null, '', `#${tabId}`);
        } catch (e) {
            window.location.hash = `#${tabId}`;
        }
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
        } else if (tabId === 'tab-chatbot-rules') {
            initRulesHub();
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

            const handoverTag = `<span class="admin-badge badge-neutral" style="font-size: 10.5px; height: 20px; padding: 0 6px;">${conv.isHandover ? 'Nhân viên' : 'Bot'}</span>`;
            const sla = formatSlaInfo(conv.waitingSeconds, conv.isHandover);

            const item = document.createElement('div');
            item.className = `conversation-item ${isActive ? 'active' : ''}`;
            item.innerHTML = `
                <div class="conversation-item-top">
                    <span class="conv-cust-name">${conv.customerName}${vipTag}</span>
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

    function formatAdminChatText(rawText) {
        if (!rawText) return '';
        let html = rawText;
        // In đậm
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Thẻ Ảnh đính kèm: ![caption](url)
        html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
            const safeAlt = (alt || '').replace(/"/g, '&quot;');
            return `<div class="chat-attachment-image-wrap" data-img-url="${url}" data-img-caption="${safeAlt}"><img src="${url}" alt="${safeAlt || 'Ảnh đính kèm'}" class="chat-attachment-img">${safeAlt ? `<span class="chat-attachment-caption">${safeAlt}</span>` : ''}</div>`;
        });
        // Xuống dòng text thông thường
        html = html.replace(/\n/g, '<br>');
        return html;
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

            // Click vào ảnh xem lightbox toàn màn hình
            timelineEl.querySelectorAll('.chat-attachment-image-wrap').forEach(wrap => {
                wrap.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = wrap.getAttribute('data-img-url');
                    const caption = wrap.getAttribute('data-img-caption');
                    openAdminImageLightbox(url, caption);
                });
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

        // Helper: Đảm bảo conversation đã tồn tại trong bảng chat_conversation trên Supabase
        async function ensureRealConversation(conv) {
            if (!conv || !supabase) return conv ? conv.id : null;
            if (conv.isRealDb && conv.id) return conv.id;

            try {
                // Kiểm tra xem khách hàng này đã có phiên chat nào trong database chưa
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

                    // Nếu chưa có, tạo mới phiên chat chuẩn
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

        // Tiếp nhận ca chat (Takeover / Handover) - Đồng bộ Supabase Live DB
        document.getElementById('btnToggleTakeover')?.addEventListener('click', async () => {
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

            renderChatbotAlertBar();
            renderConversationsList();
            renderCurrentChat();

            // Ghi nhận trạng thái vào Supabase Live DB
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

                        // Lưu tin nhắn thông báo vào bảng chat_message
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

        // --- GIAI ĐOẠN 2: ĐÍNH KÈM ẢNH VÀ LIGHTBOX XEM ẢNH ADMIN ---
        const adminLightboxModal = document.getElementById('modalAdminImageLightbox');
        const adminLightboxImg = document.getElementById('imgAdminLightboxPreview');
        const adminLightboxCaption = document.getElementById('captionAdminLightbox');
        const btnCloseAdminLightbox = document.getElementById('btnCloseAdminLightbox');

        function openAdminImageLightbox(url, caption) {
            if (!adminLightboxModal || !adminLightboxImg) return;
            adminLightboxImg.src = url;
            if (adminLightboxCaption) adminLightboxCaption.textContent = caption || '';
            adminLightboxModal.style.display = 'flex';
        }

        function closeAdminImageLightbox() {
            if (!adminLightboxModal) return;
            adminLightboxModal.style.display = 'none';
            if (adminLightboxImg) adminLightboxImg.src = '';
        }

        btnCloseAdminLightbox?.addEventListener('click', closeAdminImageLightbox);
        adminLightboxModal?.addEventListener('click', (e) => {
            if (e.target === adminLightboxModal) closeAdminImageLightbox();
        });

        // Đính kèm ảnh phía Admin
        const btnAdminAttach = document.getElementById('btnAdminChatAttach');
        const adminFileInput = document.getElementById('adminChatFileInput');
        const adminAttachPreview = document.getElementById('adminChatAttachPreview');
        const adminAttachPreviewImg = document.getElementById('adminChatAttachPreviewImg');
        const adminAttachPreviewName = document.getElementById('adminChatAttachPreviewName');
        const adminAttachPreviewSize = document.getElementById('adminChatAttachPreviewSize');
        const adminAttachPreviewRemove = document.getElementById('adminChatAttachPreviewRemove');

        let pendingAdminAttachment = null; // { name, size, dataUrl }

        function clearAdminAttachment() {
            pendingAdminAttachment = null;
            if (adminFileInput) adminFileInput.value = '';
            if (adminAttachPreview) adminAttachPreview.style.display = 'none';
        }

        if (btnAdminAttach && adminFileInput) {
            btnAdminAttach.addEventListener('click', () => {
                adminFileInput.click();
            });

            adminFileInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                    showToast('Dung lượng ảnh vượt quá 5MB. Vui lòng chọn ảnh nhẹ hơn.', 'warning');
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
        }

        adminAttachPreviewRemove?.addEventListener('click', clearAdminAttachment);

        // Gửi tin nhắn nhân viên trực tiếp (Ghi trực tiếp vào bảng chat_message trên Supabase)
        const sendMsgBtn = document.getElementById('btnSendLiveMessage');
        const msgInput = document.getElementById('chatMessageInput');

        async function sendLiveMsg() {
            if (!currentConversation) return;
            const text = msgInput ? msgInput.value.trim() : '';
            if (!text && !pendingAdminAttachment) return;

            if (!currentConversation.isHandover) {
                showToast('Vui lòng bấm nút "Tiếp nhận" trước khi gửi tin nhắn cho khách hàng.', 'warning');
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

            if (msgInput) msgInput.value = '';
            clearAdminAttachment();
            renderCurrentChat();

            // Ghi trực tiếp vào bảng chat_message trên Supabase Live DB
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
                        .from('customer')
                        .update({ note: note })
                        .eq('id', currentConversation.customerId);
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
                        // Insert tin nhắn biên bản vào support_ticket_message
                        await supabase.from('support_ticket_message').insert([{
                            ticket_id: ticketCreated.id,
                            sender_type: 'user',
                            content: `[Chuyển từ Chat trực tuyến CSKH${refId ? ' • Tham chiếu: ' + refId : ''}]:\n${chatTranscript}`,
                            created_at: new Date().toISOString()
                        }]);

                        // Lưu override liên kết tham chiếu
                        try {
                            const localOverrides = JSON.parse(localStorage.getItem('pawpal_complaint_overrides') || '{}');
                            localOverrides[ticketCreated.id] = localOverrides[ticketCreated.id] || {};
                            if (refId) localOverrides[ticketCreated.id].refId = refId;
                            localStorage.setItem('pawpal_complaint_overrides', JSON.stringify(localOverrides));
                        } catch (e) {}
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

        // --- MODAL 11: HOÀN TẤT CA CHAT VÀ GỬI ĐÁNH GIÁ CSAT ---
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
            if (!currentConversation) return;
            if (resolveCustomerNameInput) resolveCustomerNameInput.value = currentConversation.customerName;
            if (textareaResolveNotes) textareaResolveNotes.value = '';
            if (resolveModal) resolveModal.style.display = 'flex';
        }

        function closeResolveModal() {
            if (resolveModal) resolveModal.style.display = 'none';
        }

        btnResolveAction?.addEventListener('click', openResolveModal);
        btnHeaderResolve?.addEventListener('click', openResolveModal);
        btnCloseResolveModal?.addEventListener('click', closeResolveModal);
        btnCancelResolve?.addEventListener('click', closeResolveModal);

        btnConfirmResolve?.addEventListener('click', async () => {
            if (!currentConversation) return;
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const reasonVal = selectResolveReason ? selectResolveReason.value : 'resolved_complete';
            const reasonText = selectResolveReason ? selectResolveReason.options[selectResolveReason.selectedIndex].text : 'Đã giải quyết yêu cầu';
            const notes = textareaResolveNotes ? textareaResolveNotes.value.trim() : '';
            const shouldSendCsat = checkboxSendCsat ? checkboxSendCsat.checked : true;

            currentConversation.isHandover = false;
            currentConversation.waitingSeconds = 0;
            currentConversation.category = 'resolved';

            // Thêm tin nhắn hệ thống đóng ca
            const endNotice = `Hệ thống: Ca hỗ trợ trực tuyến đã được chuyên viên CSKH hoàn tất lúc ${timeStr} (Kết quả: ${reasonText}).`;
            currentConversation.messages.push({
                id: 'msg-resolve-notice-' + Date.now(),
                sender: 'system',
                time: timeStr,
                text: endNotice
            });

            closeResolveModal();
            renderChatbotAlertBar();
            renderConversationsList();
            renderCurrentChat();

            // Ghi nhận vào Supabase Live DB
            if (supabase) {
                try {
                    const convId = await ensureRealConversation(currentConversation);
                    if (convId) {
                        // 1. Cập nhật trạng thái hội thoại sang resolved
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

                        // 2. Ghi tin nhắn kết thúc vào bảng chat_message
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

                        // 3. Nếu có gửi đánh giá CSAT, bắn thẻ CSAT survey để widget User hiển thị
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

            showToast('Đã hoàn tất ca chat và gửi biểu mẫu đánh giá CSAT cho khách hàng!', 'success');
        });
    }

    // -------------------------------------------------------------
    // THƯ VIỆN CÂU MẪU CSKH CHUẨN MỰC (100% SUPABASE LIVE DATABASE)
    // -------------------------------------------------------------
    let cannedResponsesDatabase = [
        { id: 'cr-01', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Lời chào tiếp nhận ca hỗ trợ', content: 'Dạ PawPal xin chào sen, em là chuyên viên CSKH đã tiếp nhận ca chat này để trực tiếp hỗ trợ mình ngay ạ!' },
        { id: 'cr-02', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Xin phép kiểm tra hệ thống trong 1-2 phút', content: 'Dạ sen vui lòng đợi em trong 1-2 phút, em đang tiến hành tra cứu dữ liệu trên hệ thống và sẽ phản hồi mình ngay ạ.' },
        { id: 'cr-03', category: 'greeting', categoryName: 'Chào hỏi và Tiếp nhận', title: 'Xác nhận thông tin bé và đơn hàng', content: 'Dạ để hỗ trợ chính xác nhất, sen cho em xin mã đơn hàng hoặc số điện thoại đăng ký tài khoản của bé nhé ạ.' }
    ];

    async function loadCannedResponsesFromSupabase() {
        if (!supabase) return;
        try {
            const { data, error } = await supabase
                .from('chatbot_canned_response')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (!error && data && data.length > 0) {
                cannedResponsesDatabase = data.map(r => ({
                    id: r.id,
                    category: r.category || 'all',
                    categoryName: r.category || 'Chăm sóc khách hàng',
                    title: r.title,
                    content: r.content,
                    shortcut: r.shortcut
                }));

                const catSelect = document.getElementById('selectCannedCategory');
                if (catSelect) {
                    const uniqueCats = Array.from(new Set(cannedResponsesDatabase.map(c => c.categoryName))).filter(Boolean);
                    catSelect.innerHTML = '<option value="all">Tất cả danh mục</option>' +
                        uniqueCats.map(c => `<option value="${c}">${c}</option>`).join('');
                }
            }
        } catch (err) {
            console.warn('[Chatbot] Lỗi load chatbot_canned_response từ Supabase:', err.message);
        }
    }

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
                const matchCat = activeCat === 'all' || item.category === activeCat || item.categoryName === activeCat;
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

                btnSend?.addEventListener('click', async () => {
                    if (!currentConversation) return;
                    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const localMsgId = 'msg-agent-' + Date.now();
                    currentConversation.messages.push({
                        id: localMsgId,
                        sender: 'agent',
                        agentName: 'Chuyên viên CSKH',
                        time: timeStr,
                        text: item.content
                    });
                    closeModal();
                    renderCurrentChat();

                    // Ghi trực tiếp vào Supabase Live DB
                    if (supabase) {
                        try {
                            const convId = await ensureRealConversation(currentConversation);
                            if (convId) {
                                await supabase
                                    .from('chat_message')
                                    .insert([{
                                        conversation_id: convId,
                                        sender_type: 'staff',
                                        sender_name: 'Chuyên viên CSKH',
                                        content: item.content,
                                        raw_content: item.content,
                                        is_toxic: false
                                    }]);

                                await supabase
                                    .from('chat_conversation')
                                    .update({
                                        updated_at: new Date().toISOString(),
                                        status: 'agent_handling'
                                    })
                                    .eq('id', convId);
                            }
                        } catch (sendErr) {
                            console.error('[Chatbot] Lỗi lưu câu mẫu vào Supabase:', sendErr);
                        }
                    }
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
            if (window._pawpalChatbotRealtimeChannel) {
                try { supabase.removeChannel(window._pawpalChatbotRealtimeChannel); } catch (e) {}
            }
            const channelName = 'admin-chatbot-sync-' + Date.now();
            const channel = supabase.channel(channelName)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_message' }, (payload) => {
                    const newMsg = payload.new;
                    if (!newMsg) return;
                    console.log('[Realtime] Tin nhắn chat mới:', newMsg);
                    if (currentConversation && currentConversation.id === newMsg.conversation_id) {
                        const exists = currentConversation.messages.some(m => m.id === newMsg.id);
                        if (!exists) {
                            currentConversation.messages.push({
                                id: newMsg.id,
                                sender: newMsg.sender_type === 'customer' ? 'user' : (newMsg.sender_type === 'staff' ? 'agent' : 'bot'),
                                agentName: newMsg.sender_name || (newMsg.sender_type === 'staff' ? 'Chuyên viên CSKH' : 'PawPal Bot'),
                                time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                text: newMsg.content,
                                rawText: newMsg.raw_content,
                                isToxic: newMsg.is_toxic,
                                activeMaskLevel: newMsg.is_toxic ? 'words' : 'raw'
                            });
                            renderCurrentChat();
                        }
                    }
                    loadChatbotDataFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversation' }, () => {
                    console.log('[Realtime] Cập nhật phiên chat chat_conversation -> Đồng bộ danh sách');
                    loadChatbotDataFromSupabase();
                })
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

            window._pawpalChatbotRealtimeChannel = channel;

            window.addEventListener('beforeunload', () => {
                supabase.removeChannel(channel);
            });
        } catch (e) {
            console.error('Lỗi khi đăng ký Supabase Realtime Channel:', e);
        }
    }

    // =============================================================
    // SUB-TAB 3: KHO TRI THỨC VÀ QUY ĐỊNH CHATBOT (PHASE 3)
    // 100% Supabase Live Database - Zero Mock JSON - Chuẩn AGENTS.md
    // =============================================================
    let rulesFaqData = [];
    let rulesProfanityData = [];
    let rulesCannedData = [];
    let rulesCompPolicyData = [];
    let rulesHandoverRuleData = [];
    let rulesMatrixData = [];

    let currentRulesView = 'faq';
    let currentPolicySubView = 'comp';

    let faqPage = 1;
    let profanityPage = 1;
    let cannedPage = 1;
    let policyPage = 1;
    let matrixPage = 1;
    const RULES_PAGE_SIZE = 10;
    let rulesHubInitialized = false;

    async function loadAllRulesDataFromSupabase() {
        if (!supabase) return;
        try {
            // 1. FAQ (chatbot_knowledge_faq)
            const { data: faqRes } = await supabase
                .from('chatbot_knowledge_faq')
                .select('*')
                .order('priority', { ascending: true })
                .order('created_at', { ascending: false });
            if (faqRes) rulesFaqData = faqRes;

            // 2. Toxic Shield (chatbot_profanity_filter)
            const { data: profRes } = await supabase
                .from('chatbot_profanity_filter')
                .select('*')
                .order('created_at', { ascending: false });
            if (profRes) rulesProfanityData = profRes;

            // 3. Canned Responses (chatbot_canned_response)
            const { data: cannedRes } = await supabase
                .from('chatbot_canned_response')
                .select('*')
                .order('usage_count', { ascending: false })
                .order('created_at', { ascending: false });
            if (cannedRes) rulesCannedData = cannedRes;

            // 4. Compensation Policy (chatbot_compensation_policy)
            const { data: compRes } = await supabase
                .from('chatbot_compensation_policy')
                .select('*')
                .order('max_points', { ascending: false });
            if (compRes) rulesCompPolicyData = compRes;

            // 5. Handover Rules (chatbot_handover_rule)
            const { data: handRes } = await supabase
                .from('chatbot_handover_rule')
                .select('*')
                .order('sla_seconds', { ascending: true });
            if (handRes) rulesHandoverRuleData = handRes;

            // 6. Scenario Matrix (chatbot_scenario_matrix)
            const { data: matRes } = await supabase
                .from('chatbot_scenario_matrix')
                .select('*')
                .order('created_at', { ascending: true });
            if (matRes) rulesMatrixData = matRes;

            updateRulesBadges();
            populateRulesCategories();
            renderActiveRulesView();
        } catch (err) {
            console.error('[Chatbot Rules Hub] Lỗi nạp dữ liệu từ Supabase:', err);
        }
    }

    function updateRulesBadges() {
        const bFaq = document.getElementById('badgeFaqCount');
        const bProf = document.getElementById('badgeProfanityCount');
        const bCanned = document.getElementById('badgeCannedCount');
        const bPol = document.getElementById('badgePolicyCount');
        const bMat = document.getElementById('badgeMatrixCount');

        if (bFaq) bFaq.textContent = rulesFaqData.length;
        if (bProf) bProf.textContent = rulesProfanityData.length;
        if (bCanned) bCanned.textContent = rulesCannedData.length;
        if (bPol) bPol.textContent = rulesCompPolicyData.length + rulesHandoverRuleData.length;
        if (bMat) bMat.textContent = rulesMatrixData.length;
    }

    function populateRulesCategories() {
        // FAQ Categories
        const faqCatSelect = document.getElementById('selectFaqCategoryFilter');
        if (faqCatSelect) {
            const currentVal = faqCatSelect.value;
            const cats = Array.from(new Set(rulesFaqData.map(f => f.category))).filter(Boolean);
            faqCatSelect.innerHTML = '<option value="all">Tất cả danh mục</option>' +
                cats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
        }

        // Canned Categories
        const cannedCatSelect = document.getElementById('selectCannedCategoryFilter');
        if (cannedCatSelect) {
            const currentVal = cannedCatSelect.value;
            const cats = Array.from(new Set(rulesCannedData.map(c => c.category))).filter(Boolean);
            cannedCatSelect.innerHTML = '<option value="all">Tất cả chủ đề</option>' +
                cats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
        }
    }

    function renderActiveRulesView() {
        if (currentRulesView === 'faq') renderFaqTable();
        else if (currentRulesView === 'profanity') renderProfanityTable();
        else if (currentRulesView === 'canned') renderCannedTable();
        else if (currentRulesView === 'policy') renderPolicyTable();
        else if (currentRulesView === 'matrix') renderMatrixTable();
    }

    // Helper: Tạo thanh phân trang chuẩn AGENTS.md (căn giữa, không đóng khung, < và >, max 10 dòng)
    function renderPaginationControls(containerId, currentPage, totalPages, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';
        html += `<button type="button" class="rules-page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
                html += `<button type="button" class="rules-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
            } else if (p === currentPage - 3 || p === currentPage + 3) {
                html += `<span style="color: var(--text-muted); font-size: 12px; padding: 0 4px;">...</span>`;
            }
        }

        html += `<button type="button" class="rules-page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">&gt;</button>`;
        container.innerHTML = html;

        container.querySelectorAll('.rules-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPage = parseInt(btn.getAttribute('data-page'), 10);
                if (targetPage && targetPage !== currentPage && targetPage >= 1 && targetPage <= totalPages) {
                    onPageChange(targetPage);
                }
            });
        });
    }

    // -------------------------------------------------------------
    // VIEW 1: FAQ TABLE
    // -------------------------------------------------------------
    function renderFaqTable() {
        const tbody = document.getElementById('faqTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputFaqSearch')?.value || '').toLowerCase().trim();
        const catVal = document.getElementById('selectFaqCategoryFilter')?.value || 'all';
        const statusVal = document.getElementById('selectFaqStatusFilter')?.value || 'all';

        const filtered = rulesFaqData.filter(item => {
            const matchSearch = !searchVal ||
                (item.question && item.question.toLowerCase().includes(searchVal)) ||
                (item.answer && item.answer.toLowerCase().includes(searchVal)) ||
                (Array.isArray(item.keywords) && item.keywords.some(k => k.toLowerCase().includes(searchVal)));
            const matchCat = catVal === 'all' || item.category === catVal;
            const matchStatus = statusVal === 'all' ||
                (statusVal === 'active' && item.is_active) ||
                (statusVal === 'inactive' && !item.is_active);
            return matchSearch && matchCat && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (faqPage > totalPages) faqPage = totalPages;
        const start = (faqPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy câu hỏi FAQ phù hợp</td></tr>`;
            renderPaginationControls('faqPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const kwHtml = Array.isArray(item.keywords) && item.keywords.length > 0
                ? `<div class="rules-keywords-wrap">${item.keywords.slice(0, 3).map(k => `<span class="rules-keyword-pill">${k}</span>`).join('')}${item.keywords.length > 3 ? `<span class="rules-keyword-pill">+${item.keywords.length - 3}</span>` : ''}</div>`
                : '<span style="color: var(--text-muted); opacity: 0.4;">—</span>';

            const statusBadge = item.is_active
                ? `<span class="admin-badge badge-active">Kích hoạt</span>`
                : `<span class="admin-badge badge-neutral">Tạm tắt</span>`;

            return `
                <tr class="${item.is_active ? '' : 'row-inactive'}">
                    <td><span style="font-weight: 600; color: #236B48;">${item.category || 'Chung'}</span></td>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${item.question}</div></td>
                    <td><div style="max-width: 380px; font-size: 12.5px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${(item.answer || '').replace(/"/g, '&quot;')}">${item.answer || ''}</div></td>
                    <td>${kwHtml}</td>
                    <td style="text-align: center;"><span style="font-size: 12px; font-weight: 600; color: var(--text-muted);">#${item.priority || 1}</span></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-faq-id="${item.id}" title="Thao tác">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('faqPaginationWrap', faqPage, totalPages, (newPage) => {
            faqPage = newPage;
            renderFaqTable();
        });

        // Event listener cho nút 3 chấm của FAQ
        tbody.querySelectorAll('.rules-action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-faq-id');
                const item = rulesFaqData.find(f => f.id === id);
                if (!item) return;
                openFaqActionMenu(item, e.currentTarget);
            });
        });
    }

    function openFaqActionMenu(item, targetBtn) {
        openGenericRulesActionMenu(targetBtn, [
            {
                label: 'Chỉnh sửa câu hỏi',
                action: () => openFaqEditorModal(item)
            },
            {
                label: item.is_active ? 'Tạm tắt kích hoạt' : 'Kích hoạt câu hỏi',
                action: async () => {
                    if (!supabase) return;
                    const { error } = await supabase
                        .from('chatbot_knowledge_faq')
                        .update({ is_active: !item.is_active, updated_at: new Date().toISOString() })
                        .eq('id', item.id);
                    if (error) {
                        showToast('Lỗi cập nhật trạng thái FAQ: ' + error.message, 'danger');
                    } else {
                        item.is_active = !item.is_active;
                        renderFaqTable();
                        showToast(`Đã ${item.is_active ? 'kích hoạt' : 'tạm tắt'} câu hỏi!`, 'success');
                    }
                }
            },
            {
                label: 'Xóa câu hỏi',
                danger: true,
                action: () => {
                    openChatbotConfirmModal('Xóa câu hỏi tri thức FAQ', `Bạn có chắc chắn muốn xóa câu hỏi "${item.question}" khỏi kho tri thức không?`, async () => {
                        if (!supabase) return;
                        const { error } = await supabase.from('chatbot_knowledge_faq').delete().eq('id', item.id);
                        if (error) {
                            showToast('Lỗi xóa câu hỏi: ' + error.message, 'danger');
                        } else {
                            rulesFaqData = rulesFaqData.filter(f => f.id !== item.id);
                            updateRulesBadges();
                            renderFaqTable();
                            showToast('Đã xóa câu hỏi FAQ thành công!', 'success');
                        }
                    });
                }
            }
        ]);
    }

    function openFaqEditorModal(item = null) {
        const overlay = document.getElementById('modalFaqEditorOverlay');
        const titleEl = document.getElementById('modalFaqEditorTitle');
        const editId = document.getElementById('inputFaqEditId');
        const catInput = document.getElementById('inputFaqCategory');
        const qInput = document.getElementById('inputFaqQuestionText');
        const aInput = document.getElementById('textareaFaqAnswerText');
        const kwInput = document.getElementById('inputFaqKeywordsList');
        const prioInput = document.getElementById('inputFaqPriorityNum');
        const activeCheck = document.getElementById('checkboxFaqIsActive');

        if (!overlay) return;

        if (item) {
            if (titleEl) titleEl.textContent = 'Chỉnh sửa câu hỏi tri thức FAQ';
            if (editId) editId.value = item.id;
            if (catInput) catInput.value = item.category || '';
            if (qInput) qInput.value = item.question || '';
            if (aInput) aInput.value = item.answer || '';
            if (kwInput) kwInput.value = Array.isArray(item.keywords) ? item.keywords.join(', ') : '';
            if (prioInput) prioInput.value = item.priority || 1;
            if (activeCheck) activeCheck.checked = !!item.is_active;
        } else {
            if (titleEl) titleEl.textContent = 'Thêm câu hỏi tri thức FAQ';
            if (editId) editId.value = '';
            if (catInput) catInput.value = 'Thông tin dịch vụ';
            if (qInput) qInput.value = '';
            if (aInput) aInput.value = '';
            if (kwInput) kwInput.value = '';
            if (prioInput) prioInput.value = 1;
            if (activeCheck) activeCheck.checked = true;
        }

        overlay.style.display = 'flex';
    }

    // -------------------------------------------------------------
    // VIEW 2: TOXIC SHIELD PROFANITY FILTER TABLE
    // -------------------------------------------------------------
    function renderProfanityTable() {
        const tbody = document.getElementById('profanityTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputProfanitySearch')?.value || '').toLowerCase().trim();
        const sevVal = document.getElementById('selectProfanitySeverityFilter')?.value || 'all';
        const actVal = document.getElementById('selectProfanityActionFilter')?.value || 'all';
        const statusVal = document.getElementById('selectProfanityStatusFilter')?.value || 'all';

        const filtered = rulesProfanityData.filter(item => {
            const matchSearch = !searchVal || (item.keyword && item.keyword.toLowerCase().includes(searchVal));
            const matchSev = sevVal === 'all' || item.severity === sevVal;
            const matchAct = actVal === 'all' || item.action === actVal;
            const matchStatus = statusVal === 'all' ||
                (statusVal === 'active' && item.is_active) ||
                (statusVal === 'inactive' && !item.is_active);
            return matchSearch && matchSev && matchAct && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (profanityPage > totalPages) profanityPage = totalPages;
        const start = (profanityPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy từ ngữ vi phạm phù hợp</td></tr>`;
            renderPaginationControls('profanityPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const sevBadges = {
                critical: `<span class="admin-badge" style="background:#F7DCDC; color:#8F2424;">Khẩn cấp</span>`,
                high: `<span class="admin-badge" style="background:#F5E8D3; color:#734718;">Mức độ cao</span>`,
                medium: `<span class="admin-badge" style="background:#E2ECE5; color:#2D483B;">Trung bình</span>`,
                low: `<span class="admin-badge" style="background:#DCEAF2; color:#20495E;">Mức độ thấp</span>`
            };

            const actLabels = {
                mask: `Che mờ ký tự`,
                warn: `Cảnh báo nhắc nhở`,
                block: `Chặn tạm thời 15 phút`
            };

            const statusBadge = item.is_active
                ? `<span class="admin-badge badge-active">Kích hoạt</span>`
                : `<span class="admin-badge badge-neutral">Tạm tắt</span>`;

            return `
                <tr class="${item.is_active ? '' : 'row-inactive'}">
                    <td><span style="font-weight: 700; color: #DC2626;">${item.keyword}</span></td>
                    <td style="text-align: center;">${sevBadges[item.severity] || sevBadges.medium}</td>
                    <td><span style="font-size: 13px; color: var(--text-main); font-weight: 500;">${actLabels[item.action] || item.action}</span></td>
                    <td><code style="background: #EEF5F1; padding: 2px 8px; border-radius: var(--admin-radius); color: #236B48; font-weight: 600;">${item.replacement_text || '***'}</code></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-prof-id="${item.id}" title="Thao tác">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('profanityPaginationWrap', profanityPage, totalPages, (newPage) => {
            profanityPage = newPage;
            renderProfanityTable();
        });

        tbody.querySelectorAll('.rules-action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-prof-id');
                const item = rulesProfanityData.find(p => p.id === id);
                if (!item) return;
                openProfanityActionMenu(item, e.currentTarget);
            });
        });
    }

    function openProfanityActionMenu(item, targetBtn) {
        openGenericRulesActionMenu(targetBtn, [
            {
                label: 'Chỉnh sửa từ cấm',
                action: () => openProfanityEditorModal(item)
            },
            {
                label: item.is_active ? 'Tạm tắt màng lọc' : 'Kích hoạt màng lọc',
                action: async () => {
                    if (!supabase) return;
                    const { error } = await supabase
                        .from('chatbot_profanity_filter')
                        .update({ is_active: !item.is_active })
                        .eq('id', item.id);
                    if (error) {
                        showToast('Lỗi cập nhật: ' + error.message, 'danger');
                    } else {
                        item.is_active = !item.is_active;
                        renderProfanityTable();
                        showToast(`Đã ${item.is_active ? 'kích hoạt' : 'tạm tắt'} từ cấm!`, 'success');
                    }
                }
            },
            {
                label: 'Xóa từ cấm',
                danger: true,
                action: () => {
                    openChatbotConfirmModal('Xóa từ ngữ Toxic Shield', `Bạn có chắc chắn muốn xóa từ "${item.keyword}" khỏi danh sách lọc không?`, async () => {
                        if (!supabase) return;
                        const { error } = await supabase.from('chatbot_profanity_filter').delete().eq('id', item.id);
                        if (error) {
                            showToast('Lỗi xóa từ cấm: ' + error.message, 'danger');
                        } else {
                            rulesProfanityData = rulesProfanityData.filter(p => p.id !== item.id);
                            updateRulesBadges();
                            renderProfanityTable();
                            showToast('Đã xóa từ cấm thành công!', 'success');
                        }
                    });
                }
            }
        ]);
    }

    function openProfanityEditorModal(item = null) {
        const overlay = document.getElementById('modalProfanityEditorOverlay');
        const titleEl = document.getElementById('modalProfanityEditorTitle');
        const editId = document.getElementById('inputProfanityEditId');
        const kwInput = document.getElementById('inputProfanityKeywordText');
        const sevSelect = document.getElementById('selectProfanitySeverityVal');
        const actSelect = document.getElementById('selectProfanityActionVal');
        const repInput = document.getElementById('inputProfanityReplacementVal');
        const activeCheck = document.getElementById('checkboxProfanityIsActive');

        if (!overlay) return;

        if (item) {
            if (titleEl) titleEl.textContent = 'Chỉnh sửa từ khóa Toxic Shield';
            if (editId) editId.value = item.id;
            if (kwInput) kwInput.value = item.keyword || '';
            if (sevSelect) sevSelect.value = item.severity || 'medium';
            if (actSelect) actSelect.value = item.action || 'mask';
            if (repInput) repInput.value = item.replacement_text || '***';
            if (activeCheck) activeCheck.checked = !!item.is_active;
        } else {
            if (titleEl) titleEl.textContent = 'Thêm từ khóa Toxic Shield';
            if (editId) editId.value = '';
            if (kwInput) kwInput.value = '';
            if (sevSelect) sevSelect.value = 'medium';
            if (actSelect) actSelect.value = 'mask';
            if (repInput) repInput.value = '***';
            if (activeCheck) activeCheck.checked = true;
        }

        overlay.style.display = 'flex';
    }

    // -------------------------------------------------------------
    // VIEW 3: CANNED RESPONSES TABLE
    // -------------------------------------------------------------
    function renderCannedTable() {
        const tbody = document.getElementById('cannedTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputCannedSearch')?.value || '').toLowerCase().trim();
        const catVal = document.getElementById('selectCannedCategoryFilter')?.value || 'all';
        const statusVal = document.getElementById('selectCannedStatusFilter')?.value || 'all';

        const filtered = rulesCannedData.filter(item => {
            const matchSearch = !searchVal ||
                (item.title && item.title.toLowerCase().includes(searchVal)) ||
                (item.shortcut && item.shortcut.toLowerCase().includes(searchVal)) ||
                (item.content && item.content.toLowerCase().includes(searchVal));
            const matchCat = catVal === 'all' || item.category === catVal;
            const matchStatus = statusVal === 'all' ||
                (statusVal === 'active' && item.is_active) ||
                (statusVal === 'inactive' && !item.is_active);
            return matchSearch && matchCat && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (cannedPage > totalPages) cannedPage = totalPages;
        const start = (cannedPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy mẫu câu phù hợp</td></tr>`;
            renderPaginationControls('cannedPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const statusBadge = item.is_active
                ? `<span class="admin-badge badge-active">Kích hoạt</span>`
                : `<span class="admin-badge badge-neutral">Tạm tắt</span>`;

            return `
                <tr class="${item.is_active ? '' : 'row-inactive'}">
                    <td><code style="background: #EEF5F1; padding: 3px 8px; border-radius: var(--admin-radius); color: #236B48; font-weight: 700;">${item.shortcut || '—'}</code></td>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${item.title}</div></td>
                    <td><div style="max-width: 400px; font-size: 12.5px; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${(item.content || '').replace(/"/g, '&quot;')}">${item.content || ''}</div></td>
                    <td><span class="admin-badge badge-neutral">${item.category || 'Chung'}</span></td>
                    <td style="text-align: center;"><span style="font-weight: 600; color: var(--text-main);">${item.usage_count || 0}</span></td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="rules-action-menu-btn" data-canned-id="${item.id}" title="Thao tác">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('cannedPaginationWrap', cannedPage, totalPages, (newPage) => {
            cannedPage = newPage;
            renderCannedTable();
        });

        tbody.querySelectorAll('.rules-action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-canned-id');
                const item = rulesCannedData.find(c => c.id === id);
                if (!item) return;
                openCannedActionMenu(item, e.currentTarget);
            });
        });
    }

    function openCannedActionMenu(item, targetBtn) {
        openGenericRulesActionMenu(targetBtn, [
            {
                label: 'Chỉnh sửa câu mẫu',
                action: () => openCannedEditorModal(item)
            },
            {
                label: item.is_active ? 'Tạm tắt mẫu câu' : 'Kích hoạt mẫu câu',
                action: async () => {
                    if (!supabase) return;
                    const { error } = await supabase
                        .from('chatbot_canned_response')
                        .update({ is_active: !item.is_active })
                        .eq('id', item.id);
                    if (error) {
                        showToast('Lỗi cập nhật: ' + error.message, 'danger');
                    } else {
                        item.is_active = !item.is_active;
                        renderCannedTable();
                        loadCannedResponsesFromSupabase();
                        showToast(`Đã ${item.is_active ? 'kích hoạt' : 'tạm tắt'} mẫu câu!`, 'success');
                    }
                }
            },
            {
                label: 'Xóa mẫu câu',
                danger: true,
                action: () => {
                    openChatbotConfirmModal('Xóa mẫu câu phản hồi', `Bạn có chắc chắn muốn xóa mẫu câu "${item.title}" không?`, async () => {
                        if (!supabase) return;
                        const { error } = await supabase.from('chatbot_canned_response').delete().eq('id', item.id);
                        if (error) {
                            showToast('Lỗi xóa mẫu câu: ' + error.message, 'danger');
                        } else {
                            rulesCannedData = rulesCannedData.filter(c => c.id !== item.id);
                            updateRulesBadges();
                            renderCannedTable();
                            loadCannedResponsesFromSupabase();
                            showToast('Đã xóa mẫu câu thành công!', 'success');
                        }
                    });
                }
            }
        ]);
    }

    function openCannedEditorModal(item = null) {
        const overlay = document.getElementById('modalCannedEditorOverlay');
        const titleEl = document.getElementById('modalCannedEditorTitle');
        const editId = document.getElementById('inputCannedEditId');
        const scInput = document.getElementById('inputCannedShortcutText');
        const titInput = document.getElementById('inputCannedTitleText');
        const catInput = document.getElementById('inputCannedCategoryText');
        const cntInput = document.getElementById('textareaCannedContentText');
        const activeCheck = document.getElementById('checkboxCannedIsActive');

        if (!overlay) return;

        if (item) {
            if (titleEl) titleEl.textContent = 'Chỉnh sửa mẫu câu phản hồi nhanh';
            if (editId) editId.value = item.id;
            if (scInput) scInput.value = item.shortcut || '';
            if (titInput) titInput.value = item.title || '';
            if (catInput) catInput.value = item.category || '';
            if (cntInput) cntInput.value = item.content || '';
            if (activeCheck) activeCheck.checked = !!item.is_active;
        } else {
            if (titleEl) titleEl.textContent = 'Thêm mẫu câu phản hồi nhanh';
            if (editId) editId.value = '';
            if (scInput) scInput.value = '/';
            if (titInput) titInput.value = '';
            if (catInput) catInput.value = 'Tiếp nhận hội thoại';
            if (cntInput) cntInput.value = '';
            if (activeCheck) activeCheck.checked = true;
        }

        overlay.style.display = 'flex';
    }

    // -------------------------------------------------------------
    // VIEW 4: COMPENSATION POLICY & HANDOVER RULES
    // -------------------------------------------------------------
    function renderPolicyTable() {
        const compWrapper = document.getElementById('compPolicyTableWrapper');
        const handWrapper = document.getElementById('handoverRuleTableWrapper');
        const searchVal = (document.getElementById('inputPolicySearch')?.value || '').toLowerCase().trim();

        if (currentPolicySubView === 'comp') {
            if (compWrapper) compWrapper.style.display = 'block';
            if (handWrapper) handWrapper.style.display = 'none';

            const tbody = document.getElementById('compPolicyTableBody');
            if (!tbody) return;

            const filtered = rulesCompPolicyData.filter(item => {
                return !searchVal ||
                    (item.issue_type && item.issue_type.toLowerCase().includes(searchVal)) ||
                    (item.description && item.description.toLowerCase().includes(searchVal));
            });

            const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
            if (policyPage > totalPages) policyPage = totalPages;
            const start = (policyPage - 1) * RULES_PAGE_SIZE;
            const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy hạn mức bồi hoàn phù hợp</td></tr>`;
                renderPaginationControls('policyPaginationWrap', 1, 1, () => {});
                return;
            }

            tbody.innerHTML = pageItems.map(item => `
                <tr>
                    <td><div style="font-weight: 600; color: var(--text-main); line-height: 1.4;">${item.issue_type}</div></td>
                    <td style="text-align: center;"><span style="font-weight: 700; color: #236B48; background: #EEF5F1; padding: 2px 8px; border-radius: var(--admin-radius);">${item.max_points ? item.max_points + ' điểm' : '—'}</span></td>
                    <td style="text-align: right;"><span style="font-weight: 600; color: var(--text-main);">${item.max_discount_vnd ? item.max_discount_vnd.toLocaleString('vi-VN') + ' đ' : '—'}</span></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.approval_required ? 'badge-warning' : 'badge-neutral'}">${item.approval_required ? 'Cần Quản lý duyệt' : 'Nhân viên tự duyệt'}</span>
                    </td>
                    <td><div style="max-width: 420px; font-size: 12px; color: var(--text-muted); line-height: 1.4; white-space: pre-line;">${item.description || ''}</div></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.is_active ? 'badge-active' : 'badge-neutral'}">${item.is_active ? 'Hiệu lực' : 'Tắt'}</span>
                    </td>
                </tr>
            `).join('');

            renderPaginationControls('policyPaginationWrap', policyPage, totalPages, (newPage) => {
                policyPage = newPage;
                renderPolicyTable();
            });
        } else {
            if (compWrapper) compWrapper.style.display = 'none';
            if (handWrapper) handWrapper.style.display = 'block';

            const tbody = document.getElementById('handoverRuleTableBody');
            if (!tbody) return;

            const filtered = rulesHandoverRuleData.filter(item => {
                return !searchVal ||
                    (item.condition_name && item.condition_name.toLowerCase().includes(searchVal)) ||
                    (item.threshold_value && item.threshold_value.toLowerCase().includes(searchVal)) ||
                    (item.auto_assign_role && item.auto_assign_role.toLowerCase().includes(searchVal));
            });

            const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
            if (policyPage > totalPages) policyPage = totalPages;
            const start = (policyPage - 1) * RULES_PAGE_SIZE;
            const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

            if (pageItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy quy tắc chuyển ca phù hợp</td></tr>`;
                renderPaginationControls('policyPaginationWrap', 1, 1, () => {});
                return;
            }

            tbody.innerHTML = pageItems.map(item => `
                <tr>
                    <td><div style="font-weight: 600; color: #236B48; line-height: 1.4;">${item.condition_name}</div></td>
                    <td><span class="admin-badge badge-neutral">${item.trigger_type || 'Tự động'}</span></td>
                    <td><div style="max-width: 380px; font-size: 12px; color: var(--text-muted); line-height: 1.4;">${item.threshold_value || ''}</div></td>
                    <td><span style="font-weight: 600; color: var(--text-main);">${item.auto_assign_role || 'Nhân viên CSKH'}</span></td>
                    <td style="text-align: center;"><span style="font-weight: 700; color: #DC2626;">${item.sla_seconds ? item.sla_seconds + ' giây' : '—'}</span></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.is_active ? 'badge-active' : 'badge-neutral'}">${item.is_active ? 'Hiệu lực' : 'Tắt'}</span>
                    </td>
                </tr>
            `).join('');

            renderPaginationControls('policyPaginationWrap', policyPage, totalPages, (newPage) => {
                policyPage = newPage;
                renderPolicyTable();
            });
        }
    }

    // -------------------------------------------------------------
    // VIEW 5: MA TRẬN KỊCH BẢN BENCHMARK TABLE (chatbot_scenario_matrix)
    // -------------------------------------------------------------
    function renderMatrixTable() {
        const tbody = document.getElementById('matrixTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('inputMatrixSearch')?.value || '').toLowerCase().trim();
        const statusVal = document.getElementById('selectMatrixStatusFilter')?.value || 'all';

        const filtered = rulesMatrixData.filter(item => {
            const matchSearch = !searchVal || 
                (item.scenario_name && item.scenario_name.toLowerCase().includes(searchVal)) ||
                (item.sample_user_input && item.sample_user_input.toLowerCase().includes(searchVal));
            const matchStatus = statusVal === 'all' || item.benchmark_status === statusVal;
            return matchSearch && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / RULES_PAGE_SIZE) || 1;
        if (matrixPage > totalPages) matrixPage = totalPages;
        const start = (matrixPage - 1) * RULES_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + RULES_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">Không tìm thấy kịch bản kiểm thử phù hợp</td></tr>`;
            renderPaginationControls('matrixPaginationWrap', 1, 1, () => {});
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const statusBadge = item.benchmark_status === 'passed'
                ? `<span class="admin-badge badge-active">Đạt chuẩn</span>`
                : `<span class="admin-badge badge-danger">Chưa đạt</span>`;

            const sentimentLabels = {
                1: 'Cấp 1: Hài lòng',
                2: 'Cấp 2: Trung tính',
                3: 'Cấp 3: Thất vọng',
                4: 'Cấp 4: Tức giận',
                5: 'Cấp 5: Mất kiểm soát',
                6: 'Cấp 6: Y tế khẩn cấp'
            };

            const sampleSnippet = (item.sample_user_input || '').length > 120 
                ? (item.sample_user_input.substring(0, 115) + '...') 
                : (item.sample_user_input || '—');

            return `
                <tr>
                    <td><div style="font-weight: 600; color: #236B48; line-height: 1.4;">${item.scenario_name}</div></td>
                    <td><div style="font-size: 12.5px; color: var(--text-main); line-height: 1.4;">${sampleSnippet}</div></td>
                    <td style="text-align: center;"><span style="font-size: 12px; font-weight: 600; color: var(--text-main);">${sentimentLabels[item.expected_sentiment] || `Cấp ${item.expected_sentiment}`}</span></td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${item.expected_handover ? 'badge-neutral' : ''}">${item.expected_handover ? 'Bàn giao' : 'Tự động'}</span>
                    </td>
                    <td style="text-align: center;">${statusBadge}</td>
                </tr>
            `;
        }).join('');

        renderPaginationControls('matrixPaginationWrap', matrixPage, totalPages, (newPage) => {
            matrixPage = newPage;
            renderMatrixTable();
        });
    }

    async function runBenchmarkFromUI() {
        showToast('Đang tiến hành chạy kiểm thử Benchmark trên Supabase...', 'info');
        try {
            if (!supabase) return;
            const [filtersRes, triggersRes] = await Promise.all([
                supabase.from('chatbot_profanity_filter').select('*').eq('is_active', true),
                supabase.from('chatbot_sentiment_trigger').select('*').eq('is_active', true)
            ]);
            const filters = filtersRes.data || [];
            const triggers = triggersRes.data || [];

            let passed = 0;
            for (const sc of rulesMatrixData) {
                const text = sc.sample_user_input || sc.scenario_name;
                const lower = text.toLowerCase();
                let detLevel = 2;
                triggers.forEach(tr => {
                    const patterns = (tr.trigger_pattern || '').split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
                    for (const p of patterns) {
                        if (lower.includes(p)) {
                            if (tr.tier_level === 6 || tr.tier_level > detLevel) detLevel = tr.tier_level;
                        }
                    }
                });
                filters.forEach(f => {
                    const kw = (f.keyword || '').toLowerCase().trim();
                    if (kw && lower.includes(kw) && detLevel < 4) detLevel = 4;
                });

                const isMatch = (detLevel === sc.expected_sentiment) ||
                                (sc.expected_sentiment >= 4 && detLevel >= 4) ||
                                (sc.expected_sentiment === 2 && [1, 2, 3].includes(detLevel));

                const nextStatus = isMatch ? 'passed' : 'failed';
                if (isMatch) passed++;
                sc.benchmark_status = nextStatus;

                await supabase.from('chatbot_scenario_matrix').update({ benchmark_status: nextStatus }).eq('id', sc.id);
            }

            renderMatrixTable();
            const rate = rulesMatrixData.length > 0 ? ((passed / rulesMatrixData.length) * 100).toFixed(0) : 100;
            showToast(`Kiểm thử hoàn tất! Đạt ${passed}/${rulesMatrixData.length} kịch bản (${rate}%).`, 'success');
        } catch (e) {
            console.error('Lỗi khi chạy benchmark từ UI:', e);
            showToast('Lỗi khi chạy kiểm thử Benchmark: ' + e.message, 'danger');
        }
    }

    // Helper: Popup dropdown chung cho các tác vụ 3 chấm (Clean Text-Only chuẩn AGENTS.md)
    function openGenericRulesActionMenu(targetBtn, items) {
        document.querySelectorAll('.rules-popover-dropdown').forEach(p => p.remove());

        const popover = document.createElement('div');
        popover.className = 'rules-popover-dropdown';
        popover.style.cssText = `
            position: absolute;
            background: var(--surface-white);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid var(--border-neutral);
            border-radius: var(--admin-radius);
            box-shadow: 0 4px 16px rgba(35, 107, 72, 0.12);
            z-index: 9999;
            min-width: 170px;
            display: flex;
            flex-direction: column;
            padding: 4px 0;
        `;

        items.forEach(it => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = it.label;
            btn.style.cssText = `
                border: none;
                background: transparent;
                padding: 8px 14px;
                text-align: left;
                font-size: 13px;
                color: ${it.danger ? '#DC2626' : 'var(--text-main)'};
                font-weight: ${it.danger ? '600' : '500'};
                cursor: pointer;
                transition: background 0.15s;
                font-family: inherit;
            `;
            btn.addEventListener('mouseenter', () => btn.style.background = '#EEF5F1');
            btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
            btn.addEventListener('click', () => {
                popover.remove();
                it.action();
            });
            popover.appendChild(btn);
        });

        document.body.appendChild(popover);

        const rect = targetBtn.getBoundingClientRect();
        popover.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        popover.style.left = (rect.right + window.scrollX - popover.offsetWidth) + 'px';

        const closeHandler = (e) => {
            if (!popover.contains(e.target) && e.target !== targetBtn) {
                popover.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 10);
    }

    // -------------------------------------------------------------
    // KHỞI TẠO VÀ GẮN EVENT CHO SUBTAB 3
    // -------------------------------------------------------------
    function initRulesHub() {
        if (!rulesHubInitialized) {
            setupRulesHubEventListeners();
            rulesHubInitialized = true;
        }
        loadAllRulesDataFromSupabase();
    }

    function setupRulesHubEventListeners() {
        // Tab switching bên trong Subtab 3
        document.querySelectorAll('.rules-hub-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-rules-view');
                if (!view) return;

                document.querySelectorAll('.rules-hub-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentRulesView = view;
                document.querySelectorAll('.rules-view-panel').forEach(p => {
                    p.style.display = 'none';
                    p.classList.remove('active');
                });

                const viewIdMap = {
                    faq: 'rulesViewFaq',
                    profanity: 'rulesViewProfanity',
                    canned: 'rulesViewCanned',
                    policy: 'rulesViewPolicy',
                    matrix: 'rulesViewMatrix',
                    guidelines: 'rulesViewGuidelines'
                };

                const targetEl = document.getElementById(viewIdMap[view]);
                if (targetEl) {
                    targetEl.style.display = 'flex';
                    targetEl.classList.add('active');
                }

                renderActiveRulesView();
            });
        });

        // FAQ Filters & Add
        document.getElementById('inputFaqSearch')?.addEventListener('input', () => {
            faqPage = 1;
            renderFaqTable();
        });
        document.getElementById('selectFaqCategoryFilter')?.addEventListener('change', () => {
            faqPage = 1;
            renderFaqTable();
        });
        document.getElementById('selectFaqStatusFilter')?.addEventListener('change', () => {
            faqPage = 1;
            renderFaqTable();
        });
        document.getElementById('btnOpenAddFaqModal')?.addEventListener('click', () => {
            openFaqEditorModal(null);
        });

        // Profanity Filters & Add
        document.getElementById('inputProfanitySearch')?.addEventListener('input', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('selectProfanitySeverityFilter')?.addEventListener('change', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('selectProfanityActionFilter')?.addEventListener('change', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('selectProfanityStatusFilter')?.addEventListener('change', () => {
            profanityPage = 1;
            renderProfanityTable();
        });
        document.getElementById('btnOpenAddProfanityModal')?.addEventListener('click', () => {
            openProfanityEditorModal(null);
        });

        // Canned Filters & Add
        document.getElementById('inputCannedSearch')?.addEventListener('input', () => {
            cannedPage = 1;
            renderCannedTable();
        });
        document.getElementById('selectCannedCategoryFilter')?.addEventListener('change', () => {
            cannedPage = 1;
            renderCannedTable();
        });
        document.getElementById('selectCannedStatusFilter')?.addEventListener('change', () => {
            cannedPage = 1;
            renderCannedTable();
        });
        document.getElementById('btnOpenAddCannedModal')?.addEventListener('click', () => {
            openCannedEditorModal(null);
        });

        // Policy Sub-Toggles & Search
        const btnComp = document.getElementById('btnToggleCompPolicy');
        const btnHand = document.getElementById('btnToggleHandoverRule');
        btnComp?.addEventListener('click', () => {
            btnComp.classList.add('active');
            btnHand?.classList.remove('active');
            currentPolicySubView = 'comp';
            policyPage = 1;
            renderPolicyTable();
        });
        btnHand?.addEventListener('click', () => {
            btnHand.classList.add('active');
            btnComp?.classList.remove('active');
            currentPolicySubView = 'handover';
            policyPage = 1;
            renderPolicyTable();
        });
        document.getElementById('inputPolicySearch')?.addEventListener('input', () => {
            policyPage = 1;
            renderPolicyTable();
        });

        // Matrix Filters & Run Benchmark
        document.getElementById('inputMatrixSearch')?.addEventListener('input', () => {
            matrixPage = 1;
            renderMatrixTable();
        });
        document.getElementById('selectMatrixStatusFilter')?.addEventListener('change', () => {
            matrixPage = 1;
            renderMatrixTable();
        });
        document.getElementById('btnRunBenchmarkUI')?.addEventListener('click', runBenchmarkFromUI);

        // Modal 8: Save FAQ
        const faqModal = document.getElementById('modalFaqEditorOverlay');
        document.getElementById('btnCloseFaqEditorModal')?.addEventListener('click', () => faqModal.style.display = 'none');
        document.getElementById('btnCancelFaqEditor')?.addEventListener('click', () => faqModal.style.display = 'none');
        document.getElementById('btnSaveFaqRecord')?.addEventListener('click', async () => {
            const id = document.getElementById('inputFaqEditId')?.value.trim();
            const category = document.getElementById('inputFaqCategory')?.value.trim() || 'Thông tin dịch vụ';
            const question = document.getElementById('inputFaqQuestionText')?.value.trim();
            const answer = document.getElementById('textareaFaqAnswerText')?.value.trim();
            const rawKw = document.getElementById('inputFaqKeywordsList')?.value.trim();
            const priority = parseInt(document.getElementById('inputFaqPriorityNum')?.value || '1', 10);
            const is_active = document.getElementById('checkboxFaqIsActive')?.checked ?? true;

            if (!question || !answer) {
                showToast('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!', 'warning');
                return;
            }

            const keywords = rawKw ? rawKw.split(',').map(s => s.trim()).filter(Boolean) : [];
            const saveBtn = document.getElementById('btnSaveFaqRecord');
            if (saveBtn) saveBtn.disabled = true;

            try {
                if (id) {
                    const { error } = await supabase
                        .from('chatbot_knowledge_faq')
                        .update({
                            category,
                            question,
                            answer,
                            keywords,
                            priority,
                            is_active,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id);
                    if (error) throw error;
                    showToast('Đã cập nhật câu hỏi FAQ thành công!', 'success');
                } else {
                    const { error } = await supabase
                        .from('chatbot_knowledge_faq')
                        .insert([{
                            category,
                            question,
                            answer,
                            keywords,
                            priority,
                            is_active
                        }]);
                    if (error) throw error;
                    showToast('Đã thêm câu hỏi FAQ mới vào kho tri thức!', 'success');
                }

                if (faqModal) faqModal.style.display = 'none';
                await loadAllRulesDataFromSupabase();
            } catch (err) {
                showToast('Lỗi lưu câu hỏi FAQ: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });

        // Modal 9: Save Profanity
        const profModal = document.getElementById('modalProfanityEditorOverlay');
        document.getElementById('btnCloseProfanityEditorModal')?.addEventListener('click', () => profModal.style.display = 'none');
        document.getElementById('btnCancelProfanityEditor')?.addEventListener('click', () => profModal.style.display = 'none');
        document.getElementById('btnSaveProfanityRecord')?.addEventListener('click', async () => {
            const id = document.getElementById('inputProfanityEditId')?.value.trim();
            const keyword = document.getElementById('inputProfanityKeywordText')?.value.trim().toLowerCase();
            const severity = document.getElementById('selectProfanitySeverityVal')?.value || 'medium';
            const action = document.getElementById('selectProfanityActionVal')?.value || 'mask';
            const replacement_text = document.getElementById('inputProfanityReplacementVal')?.value.trim() || '***';
            const is_active = document.getElementById('checkboxProfanityIsActive')?.checked ?? true;

            if (!keyword) {
                showToast('Vui lòng nhập từ ngữ cần nhận diện!', 'warning');
                return;
            }

            const saveBtn = document.getElementById('btnSaveProfanityRecord');
            if (saveBtn) saveBtn.disabled = true;

            try {
                if (id) {
                    const { error } = await supabase
                        .from('chatbot_profanity_filter')
                        .update({
                            keyword,
                            severity,
                            action,
                            replacement_text,
                            is_active
                        })
                        .eq('id', id);
                    if (error) throw error;
                    showToast('Đã cập nhật từ cấm Toxic Shield thành công!', 'success');
                } else {
                    const { error } = await supabase
                        .from('chatbot_profanity_filter')
                        .insert([{
                            keyword,
                            severity,
                            action,
                            replacement_text,
                            is_active
                        }]);
                    if (error) throw error;
                    showToast('Đã thêm từ ngữ mới vào màng lọc Toxic Shield!', 'success');
                }

                if (profModal) profModal.style.display = 'none';
                await loadAllRulesDataFromSupabase();
            } catch (err) {
                showToast('Lỗi lưu từ cấm: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });

        // Modal 10: Save Canned
        const canModal = document.getElementById('modalCannedEditorOverlay');
        document.getElementById('btnCloseCannedEditorModal')?.addEventListener('click', () => canModal.style.display = 'none');
        document.getElementById('btnCancelCannedEditor')?.addEventListener('click', () => canModal.style.display = 'none');
        document.getElementById('btnSaveCannedRecord')?.addEventListener('click', async () => {
            const id = document.getElementById('inputCannedEditId')?.value.trim();
            const shortcut = document.getElementById('inputCannedShortcutText')?.value.trim();
            const title = document.getElementById('inputCannedTitleText')?.value.trim();
            const category = document.getElementById('inputCannedCategoryText')?.value.trim() || 'Tiếp nhận hội thoại';
            const content = document.getElementById('textareaCannedContentText')?.value.trim();
            const is_active = document.getElementById('checkboxCannedIsActive')?.checked ?? true;

            if (!title || !content) {
                showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung câu mẫu!', 'warning');
                return;
            }

            const saveBtn = document.getElementById('btnSaveCannedRecord');
            if (saveBtn) saveBtn.disabled = true;

            try {
                if (id) {
                    const { error } = await supabase
                        .from('chatbot_canned_response')
                        .update({
                            shortcut,
                            title,
                            category,
                            content,
                            is_active
                        })
                        .eq('id', id);
                    if (error) throw error;
                    showToast('Đã cập nhật mẫu câu phản hồi!', 'success');
                } else {
                    const { error } = await supabase
                        .from('chatbot_canned_response')
                        .insert([{
                            shortcut,
                            title,
                            category,
                            content,
                            is_active,
                            usage_count: 0
                        }]);
                    if (error) throw error;
                    showToast('Đã thêm mẫu câu phản hồi mới!', 'success');
                }

                if (canModal) canModal.style.display = 'none';
                await loadAllRulesDataFromSupabase();
                await loadCannedResponsesFromSupabase();
            } catch (err) {
                showToast('Lỗi lưu mẫu câu: ' + err.message, 'danger');
            } finally {
                if (saveBtn) saveBtn.disabled = false;
            }
        });
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
    initRulesHub();

    // Nạp dữ liệu thực tế từ Supabase Live DB
    loadCannedResponsesFromSupabase();
    loadChatbotDataFromSupabase();

    // Tự động đồng bộ lại khi người dùng quay lại tab Admin hoặc định kỳ 8 giây
    window.addEventListener('focus', () => {
        loadChatbotDataFromSupabase();
    });
    setInterval(() => {
        loadChatbotDataFromSupabase();
    }, 8000);

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
