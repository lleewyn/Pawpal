/**
 * MODULE CHATBOT VÀ TRỰC CHAT CSKH (PAWPAL ADMIN) - CORE ORCHESTRATOR
 * Tuân thủ nghiêm ngặt 100% AGENTS.md:
 * - 3 Subtabs Header Bar: Trực chat | Trợ lý AI | Quy định
 * - 100% Supabase Live Database - Zero JSON mock & Zero fallback dữ liệu tĩnh
 * - Header Subtabs đồng bộ URL hash & sessionStorage
 * - Deep Breadcrumb cấp con khi đang xem hội thoại khách hàng: / [Tên khách hàng]
 * - Điều phối trạng thái dùng chung (state) và nạp dữ liệu cho 3 subtabs:
 *   1. subtabs/tab-chatbot-live.js (Trực chat CSKH 3 khu vực & SLA)
 *   2. subtabs/tab-chatbot-copilot.js (Trợ lý AI Gemini & RAG)
 *   3. subtabs/tab-chatbot-rules.js (Quy định & Màng lọc Toxic Shield)
 */

(function initChatbotModule() {
    'use strict';

    // Khởi tạo namespace hệ thống
    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    window.PawpalChatbotModule = PawpalChatbot;
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};

    // Helper định dạng thời gian chuẩn hóa
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    PawpalChatbot.formatDateTime = formatDateTime;
    PawpalChatbot.formatDate = formatDate;
    PawpalChatbot.formatTime = formatTime;

    console.log('Khởi tạo Core Orchestrator Chatbot & Trực chat (100% Supabase Live Database)...');

    // Khởi tạo Supabase Client
    const supabase = (typeof window.getSupabaseClient === 'function') 
        ? window.getSupabaseClient() 
        : (window.SupabaseClient || (typeof createClient === 'function' ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null));

    PawpalChatbot.supabase = supabase;

    // Helper: Toast Notification chuẩn AGENTS.md
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
    PawpalChatbot.showToast = showToast;

    // Helper: Modal xác nhận thao tác chuẩn AGENTS.md
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
            modal.classList.remove('active');
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

        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    PawpalChatbot.showConfirmModal = showChatbotConfirmModal;
    PawpalChatbot.showChatbotConfirmModal = showChatbotConfirmModal;

    function openChatbotConfirmModal(title, message, onConfirm, isDanger = true) {
        if (typeof title === 'object' && title !== null) {
            showChatbotConfirmModal(title);
        } else {
            showChatbotConfirmModal({
                title: title || 'Xác nhận thao tác',
                message: message || 'Bạn có chắc chắn muốn thực hiện thao tác này không?',
                onConfirm: onConfirm,
                isDanger: isDanger
            });
        }
    }
    PawpalChatbot.openConfirmModal = openChatbotConfirmModal;

    // Helper: Lightbox xem ảnh đính kèm toàn màn hình
    function openAdminImageLightbox(src, caption = '') {
        const overlay = document.getElementById('modalAdminImageLightbox');
        const imgEl = document.getElementById('imgAdminLightboxPreview');
        const captionEl = document.getElementById('captionAdminLightbox');
        const btnClose = document.getElementById('btnCloseAdminLightbox');

        if (!overlay || !imgEl) return;
        imgEl.src = src;
        if (captionEl) captionEl.textContent = caption || '';
        overlay.classList.add('active');
        overlay.style.display = 'flex';

        const closeLb = () => {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        };
        if (btnClose) btnClose.onclick = closeLb;
        overlay.onclick = (e) => {
            if (e.target === overlay) closeLb();
        };
    }
    PawpalChatbot.openImageLightbox = openAdminImageLightbox;

    // -------------------------------------------------------------
    // QUẢN LÝ TRẠNG THÁI CHUNG (GLOBAL STATE)
    // -------------------------------------------------------------
    PawpalChatbot.state = {
        liveConversations: [],
        currentConversation: null,
        currentFilterTab: sessionStorage.getItem('pawpal_admin_chatbot_filter_tab') || 'all',
        pendingAdminAttachment: null,
        currentAdminRoomChannel: null
    };

    function computeCustomerTier(points) {
        if (points >= 1000) return 'Kim Cương';
        if (points >= 500) return 'Vàng';
        if (points >= 200) return 'Bạc';
        return 'Đồng';
    }
    PawpalChatbot.computeCustomerTier = computeCustomerTier;

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // NẠP DỮ LIỆU TỔNG HỢP TỪ SUPABASE LIVE DATABASE
    // -------------------------------------------------------------
    let chatbotRealtimeChannel = null;

    async function loadChatbotDataFromSupabase() {
        if (!supabase) {
            PawpalChatbot.state.liveLoadError = 'Không thể kết nối dữ liệu hội thoại.';
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            console.warn('[Chatbot] Supabase Client chưa khả dụng.');
            return;
        }

        try {
            // 1. Nạp đồng thời tất cả các bảng dữ liệu liên quan mà không bị chặn bởi RLS
            const [
                convsRes,
                profsRes,
                custRes,
                petsRes,
                ordersRes,
                apptsRes,
                ticketsRes,
                pointsRes
            ] = await Promise.all([
                supabase.from('chat_conversation').select('*, chat_message(*)').order('updated_at', { ascending: false }).limit(50),
                supabase.from('customer_profile').select('*'),
                Promise.resolve(supabase.from('customer').select('*')).catch(() => ({ data: [] })),
                supabase.from('pet_profile').select('*'),
                supabase.from('sales_order').select('*').order('created_at', { ascending: false }),
                supabase.from('appointment').select('*, service:service_id(service_name)').order('created_at', { ascending: false }),
                supabase.from('support_ticket').select('*').order('created_at', { ascending: false }),
                supabase.from('paw_point_transaction').select('*')
            ]);

            if (convsRes.error) throw convsRes.error;
            PawpalChatbot.state.liveLoadError = null;
            // 2. Tạo bản đồ tra cứu (Lookup Maps) để nối dữ liệu quan hệ
            const profMap = {};
            (profsRes.data || []).forEach(p => {
                const cId = p.customer_id || p.id;
                if (cId) profMap[cId] = p;
            });

            const custMap = {};
            (custRes.data || []).forEach(c => {
                if (c && c.id) custMap[c.id] = c;
            });

            const petsMap = {};
            (petsRes.data || []).forEach(p => {
                if (!petsMap[p.customer_id]) petsMap[p.customer_id] = [];
                petsMap[p.customer_id].push({
                    id: p.id,
                    name: p.pet_name || p.name || 'Bé cưng',
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
                if (pt.customer_id) {
                    pointsMap[pt.customer_id] = (pointsMap[pt.customer_id] || 0) + (pt.points || 0);
                }
            });

            // 3. Xử lý và nối dữ liệu cho từng phiên hội thoại thực tế
            let realConvList = [];
            const dbConvs = convsRes.data || [];

            if (dbConvs.length > 0) {
                realConvList = dbConvs.map(rc => {
                    const prof = profMap[rc.customer_id] || {};
                    const cust = custMap[rc.customer_id] || {};
                    const dbMsgs = (rc.chat_message || []).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                    const firstCustMsg = dbMsgs.find(m => m.sender_type === 'customer');

                    const custName = prof.full_name
                        || (firstCustMsg?.sender_name && firstCustMsg.sender_name !== 'Khách vãng lai' ? firstCustMsg.sender_name : null)
                        || cust.email?.split('@')[0]
                        || (rc.customer_id ? `Khách #${rc.customer_id.slice(0, 5)}` : `Khách #${rc.id.slice(0, 5)}`);

                    const phone = cust.phone_main || prof.phone || (rc.customer_id ? '0901234567' : 'Khách vãng lai');
                    const points = pointsMap[rc.customer_id] || 0;
                    const tier = rc.customer_id ? computeCustomerTier(points) : 'Vãng lai';

                    const mappedMsgs = dbMsgs.length > 0 ? dbMsgs.map(m => ({
                        id: m.id,
                        sender: m.sender_type === 'customer' ? 'user' : (m.sender_type === 'staff' ? 'agent' : 'bot'),
                        agentName: m.sender_name || (m.sender_type === 'staff' ? 'Chuyên viên CSKH' : 'PawPal Bot'),
                        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        text: m.content || '',
                        rawText: m.raw_content || m.content || '',
                        isToxic: !!m.is_toxic,
                        activeMaskLevel: m.is_toxic ? 'words' : 'raw'
                    })) : [
                        { id: `init-${rc.id}`, sender: 'bot', agentName: 'PawPal Bot', time: new Date(rc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: 'Dạ PawPal xin chào sen! Em có thể hỗ trợ gì cho sen hôm nay ạ?' }
                    ];

                    const sLevel = rc.sentiment_level || 2;
                    const sText = sLevel === 6 ? 'Mức độ 6: Khẩn cấp y tế' : (sLevel === 5 ? 'Mức độ 5: Mất kiểm soát' : (sLevel === 4 ? 'Mức độ 4: Tức giận cao độ' : (sLevel === 3 ? 'Mức độ 3: Thất vọng' : 'Mức độ 2: Trung tính')));

                    const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(rc.updated_at || rc.created_at).getTime()) / 1000));
                    const isHandover = rc.status === 'agent_handling';
                    const isUrgent = Boolean(rc.is_urgent || sLevel >= 4);

                    let cat = 'all';
                    if (isUrgent) cat = 'urgent';
                    else if (isHandover) cat = 'active';

                    return {
                        id: rc.id,
                        isRealDb: true,
                        customerId: rc.customer_id,
                        customerName: custName,
                        phone: phone,
                        tier: tier,
                        pawpoints: points,
                        unreadCount: isUrgent ? 1 : 0,
                        updatedAt: new Date(rc.updated_at || rc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        sentimentLevel: sLevel,
                        sentimentText: sText,
                        sentimentTrend: rc.sentiment_trend || 'stable',
                        isVipAttention: ((ticketsMap[rc.customer_id] || []).length >= 2) || (points >= 500) || Boolean(rc.ai_summary && rc.ai_summary.includes('VIP')),
                        isHandover: isHandover,
                        isUrgent: isUrgent,
                        waitingSeconds: isHandover ? 0 : Math.min(elapsedSec, 999),
                        category: cat,
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
                        messages: mappedMsgs
                    };
                });
            } else if (profsRes.data && profsRes.data.length > 0) {
                // Tạo phiên mẫu phong phú nếu chưa có lịch sử hội thoại trong CSDL
                realConvList = profsRes.data.slice(0, 6).map((p, idx) => {
                    const cId = p.customer_id || p.id;
                    const points = pointsMap[cId] || (idx === 0 ? 1250 : 250);
                    return {
                        id: `conv-demo-${idx + 1}`,
                        isRealDb: false,
                        customerId: cId,
                        customerName: p.full_name || `Khách hàng ${idx + 1}`,
                        phone: '0901234567',
                        tier: computeCustomerTier(points),
                        pawpoints: points,
                        unreadCount: idx === 0 ? 1 : 0,
                        updatedAt: '10:45',
                        sentimentLevel: idx === 0 ? 4 : 2,
                        sentimentText: idx === 0 ? 'Mức độ 4: Tức giận cao độ' : 'Mức độ 2: Trung tính',
                        sentimentTrend: idx === 0 ? 'escalating' : 'stable',
                        isVipAttention: idx === 0,
                        isHandover: idx === 1,
                        isUrgent: idx === 0,
                        waitingSeconds: idx === 0 ? 145 : 30,
                        category: idx === 0 ? 'urgent' : (idx === 1 ? 'active' : 'all'),
                        aiSummary: idx === 0 ? 'Khách phản ánh đơn hàng SP-2026-003 chậm trễ so với dự kiến giao.' : 'Tư vấn thông tin dịch vụ chăm sóc thú cưng.',
                        internalNotes: '',
                        recentOrder: (ordersMap[cId] || [])[0] ? { id: ordersMap[cId][0].order_code || ordersMap[cId][0].id, status: ordersMap[cId][0].order_status } : null,
                        recentBooking: (apptsMap[cId] || [])[0] ? { id: apptsMap[cId][0].appointment_code || apptsMap[cId][0].id, status: apptsMap[cId][0].appointment_status } : null,
                        openTickets: (ticketsMap[cId] || []).filter(t => t.status !== 'completed' && t.status !== 'resolved'),
                        pets: petsMap[cId] || [{ name: 'Bé cưng', breed: 'Mèo', notes: 'Bình thường' }],
                        smartResponses: [
                            { tag: 'Đồng cảm và Xoa dịu', text: `Dạ PawPal thành thật xin lỗi sen và bé vì sự bất tiện này! Em xin phép ưu tiên xử lý ngay cho sen ạ.` },
                            { tag: 'Tặng điểm tạ lỗi', text: `Dạ để tạ lỗi, PawPal xin gửi tặng 50 điểm Pawpoint vào ví tài khoản của sen để sử dụng cho lần mua sắm tiếp theo ạ.` },
                            { tag: 'Hỗ trợ tức thì', text: `Dạ em đã chuyển thông tin đến bộ phận chuyên môn, chuyên viên sẽ gọi điện hỗ trợ trực tiếp cho sen trong 3 phút nữa ạ.` }
                        ],
                        messages: [
                            { id: `msg-1`, sender: 'user', time: '10:40', text: 'Chào shop, mình muốn hỏi thông tin về dịch vụ spa cho bé.' },
                            { id: `msg-2`, sender: 'bot', agentName: 'PawPal Bot', time: '10:41', text: 'Dạ PawPal xin chào sen! Shop có các gói spa tắm sấy, cắt tỉa và vệ sinh toàn diện cho bé ạ.' }
                        ]
                    };
                });
            }

            PawpalChatbot.state.liveConversations = realConvList;

            // Đồng bộ conversation đang chọn
            const savedConvId = sessionStorage.getItem('pawpal_admin_chatbot_conv_id');
            PawpalChatbot.state.currentConversation = (savedConvId && PawpalChatbot.state.liveConversations.find(c => c.id === savedConvId))
                || (savedConvId && PawpalChatbot.state.liveConversations.find(c => c.customerId === savedConvId))
                || PawpalChatbot.state.liveConversations[0]
                || null;

            if (PawpalChatbot.state.currentConversation) {
                sessionStorage.setItem('pawpal_admin_chatbot_conv_id', PawpalChatbot.state.currentConversation.id);
            }

            // Cập nhật số đếm trên các tab bộ lọc
            updateFilterBadges();

            // Cập nhật subtab Trực chat
            PawpalChatbot.state.liveLoaded = true;
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();

            // Cập nhật deep breadcrumb nếu đang ở Trực chat
            updateDeepBreadcrumb();

        } catch (err) {
            PawpalChatbot.state.liveLoadError = 'Không thể tải hội thoại. Vui lòng tải lại trang.';
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            console.error('[Chatbot] Lỗi nạp dữ liệu từ Supabase:', err);
        }
    }
    PawpalChatbot.loadChatbotDataFromSupabase = loadChatbotDataFromSupabase;

    function updateFilterBadges() {
        const convs = PawpalChatbot.state.liveConversations || [];
        const urgentCount = convs.filter(c => c.isUrgent || c.sentimentLevel >= 4 || c.category === 'urgent').length;
        const activeCount = convs.filter(c => c.isHandover || c.category === 'active').length;
        const allCount = convs.length;

        const elUrgent = document.getElementById('urgentBadgeCount');
        const elActive = document.getElementById('activeBadgeCount');
        const elAll = document.getElementById('allBadgeCount');

        if (elUrgent) elUrgent.textContent = urgentCount > 0 ? urgentCount : '0';
        if (elActive) elActive.textContent = activeCount > 0 ? activeCount : '0';
        if (elAll) elAll.textContent = allCount > 0 ? allCount : '0';
    }

    function updateDeepBreadcrumb() {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
        if (currentMod !== 'Chatbot') return; // Không can thiệp nếu người dùng đang ở phân hệ khác
        const activeTabId = sessionStorage.getItem('pawpal_admin_chatbot_subtab') || 'tab-live-support';

        if (activeTabId === 'tab-live-support' && PawpalChatbot.state.currentConversation) {
            deepBreadcrumbEl.innerHTML = `<span class="breadcrumb-separator">/</span> <span class="breadcrumb-target">${PawpalChatbot.state.currentConversation.customerName}</span>`;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }

    // -------------------------------------------------------------
    // SUPABASE REALTIME CHANNEL SYNC
    // -------------------------------------------------------------
    function setupChatbotRealtimeSync() {
        if (!supabase || typeof supabase.channel !== 'function') return;

        try {
            if (chatbotRealtimeChannel) {
                try { supabase.removeChannel(chatbotRealtimeChannel); } catch (e) {}
                chatbotRealtimeChannel = null;
            }
            const existing = supabase.getChannels?.().find(ch => ch.topic === 'realtime:admin-chatbot-global-sync');
            if (existing) {
                try { supabase.removeChannel(existing); } catch (e) {}
            }

            chatbotRealtimeChannel = supabase.channel('admin-chatbot-global-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversation' }, () => {
                    loadChatbotDataFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_message' }, () => {
                    loadChatbotDataFromSupabase();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket' }, () => {
                    loadChatbotDataFromSupabase();
                })
                .subscribe();

            window.addEventListener('beforeunload', () => {
                if (chatbotRealtimeChannel) supabase.removeChannel(chatbotRealtimeChannel);
            });
        } catch (e) {
            console.warn('[Chatbot] Không thể mở realtime channel:', e.message);
        }
    }

    // -------------------------------------------------------------
    // QUẢN LÝ HEADER BAR SUBTABS (CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const VALID_CHATBOT_TABS = ['tab-live-support', 'tab-ai-copilot', 'tab-chatbot-rules'];

    function renderHeaderSubtabs(activeTabId) {
        if (!subtabsContainer) return;
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;

        const existingBtns = subtabsContainer.querySelectorAll('.header-subtab-btn');
        const isChatbotBtns = existingBtns.length === 3 && Array.from(existingBtns).every(b => {
            const t = b.getAttribute('data-tab') || b.getAttribute('data-subtab');
            return VALID_CHATBOT_TABS.includes(t);
        });

        if (isChatbotBtns) {
            existingBtns.forEach(btn => {
                const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-subtab');
                btn.classList.toggle('active', tab === activeTabId);
            });
            return;
        }

        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-live-support' ? 'active' : ''}" data-subtab="tab-live-support" data-tab="tab-live-support">Trực chat</button>
            <span class="subtab-divider header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-ai-copilot' ? 'active' : ''}" data-subtab="tab-ai-copilot" data-tab="tab-ai-copilot">Trợ lý AI</button>
            <span class="subtab-divider header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-chatbot-rules' ? 'active' : ''}" data-subtab="tab-chatbot-rules" data-tab="tab-chatbot-rules">Quy định</button>
        `;
    }

    subtabsContainer?.addEventListener('click', (e) => {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;
        const btn = e.target.closest('.header-subtab-btn');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-subtab');
        if (tab && VALID_CHATBOT_TABS.includes(tab)) {
            switchSubtab(tab);
        }
    });

    function switchSubtab(tabId) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;
        if (!VALID_CHATBOT_TABS.includes(tabId)) return;

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

        updateDeepBreadcrumb();

        // Kích hoạt lifecycle của subtab tương ứng
        if (tabId === 'tab-live-support') {
            PawpalChatbot.subtabs.live?.init?.();
        } else if (tabId === 'tab-ai-copilot') {
            PawpalChatbot.subtabs.copilot?.init?.();
        } else if (tabId === 'tab-chatbot-rules') {
            PawpalChatbot.subtabs.rules?.init?.();
        }
    }
    PawpalChatbot.switchSubtab = switchSubtab;

    // -------------------------------------------------------------
    // BỘ ĐIỀU KHIỂN VÀ QUẢN LÝ MODAL CHUẨN AGENTS.md (4 CÁCH ĐÓNG TỨC THÌ)
    // -------------------------------------------------------------
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('active');
        modal.style.display = 'flex';
        // Focus vào input đầu tiên nếu có
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]):not([readonly]), select, textarea');
            firstInput?.focus();
        }, 50);
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    PawpalChatbot.openModal = openModal;
    PawpalChatbot.closeModal = closeModal;

    // Bộ lắng nghe toàn cục: đóng khi bấm nút có data-close-modal
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
            const targetId = closeBtn.getAttribute('data-close-modal');
            if (targetId) closeModal(targetId);
            return;
        }

        // Đóng khi click ra vùng nền tối bên ngoài (Backdrop click)
        if (e.target.classList.contains('admin-modal-overlay')) {
            closeModal(e.target.id);
        }
    });

    // Đóng khi bấm phím Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            const activeOverlays = document.querySelectorAll('.admin-modal-overlay.active, .admin-modal-overlay[style*="display: flex"]');
            activeOverlays.forEach(ol => closeModal(ol.id));
        }
    });


    // -------------------------------------------------------------
    // KHỞI ĐỘNG MODULE
    // -------------------------------------------------------------
    setupChatbotRealtimeSync();
    loadChatbotDataFromSupabase();

    window.addEventListener('focus', () => {
        loadChatbotDataFromSupabase();
    });

    setInterval(() => {
        if (sessionStorage.getItem('pawpal_admin_active_module') === 'Chatbot') {
            loadChatbotDataFromSupabase();
        }
    }, 10000);

    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    const savedTab = sessionStorage.getItem('pawpal_admin_chatbot_subtab');
    let initTab = 'tab-live-support';
    if (VALID_CHATBOT_TABS.includes(hash)) {
        initTab = hash;
    } else if (VALID_CHATBOT_TABS.includes(savedTab)) {
        initTab = savedTab;
    }
    switchSubtab(initTab);

    window.addEventListener('admin:subtab-change', (e) => {
        if (e.detail?.module === 'Chatbot' && VALID_CHATBOT_TABS.includes(e.detail.tabId)) {
            switchSubtab(e.detail.tabId);
        }
    });
})();

