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

        openModal('modalConfirmChatbotAction');
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
        currentAdminRoomChannel: null,
        isRealtimeHealthy: false,
        liveLoaded: false,
        liveLoadError: null
    };

    // -------------------------------------------------------------
    // PR-02: KIẾN TRÚC 2-TIER NẠP INBOX VÀ CHI TIẾT THEO YÊU CẦU
    // -------------------------------------------------------------
    let chatbotRealtimeChannel = null;
    let isInboxRefreshing = false;
    let hasPendingRefresh = false;
    let inboxDebounceTimer = null;
    const customerContextCache = new Map();

    function invalidateCustomerCache(customerId) {
        if (customerId) customerContextCache.delete(customerId);
    }
    PawpalChatbot.invalidateCustomerCache = invalidateCustomerCache;

    // TIER 1: Tải tóm tắt danh sách hội thoại nhẹ (không join 8 bảng, không lấy raw_content)
    const inboxPages=new Map(),inboxRequests=new Map();
    let inboxVersion=0;
    async function loadInboxSummary(options = {}) {
        const limit = options.limit || 50;

        if (!supabase) {
            PawpalChatbot.state.liveLoadError = 'Không thể kết nối dữ liệu hội thoại.';
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            console.warn('[Chatbot] Supabase Client chưa khả dụng.');
            return;
        }

        const version=++inboxVersion;
        try {
            // 1. Chỉ lấy các cột cần thiết từ chat_conversation (không join chat_message(*) toàn bộ)
            const args={p_query:(document.getElementById('inboxSearchInput')?.value||'').trim(),p_filter:PawpalChatbot.state.currentFilterTab||'all',p_page:options.page||PawpalChatbot.state.inboxPage?.page||1};
            const key=JSON.stringify(args);
            if(!options.page)inboxPages.clear();
            PawpalChatbot.state.liveLoaded=false;PawpalChatbot.state.liveLoadError=null;
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            let payload=inboxPages.get(key);
            if(!payload || Date.now()-payload.at>30000){
                if(!inboxRequests.has(key))inboxRequests.set(key,supabase.rpc('get_admin_chat_inbox_page',args).then(result=>{if(result.error)throw result.error;return result.data;}).finally(()=>inboxRequests.delete(key)));
                payload={at:Date.now(),data:await inboxRequests.get(key)};
                if(inboxPages.size>=20)inboxPages.delete(inboxPages.keys().next().value);inboxPages.set(key,payload);
            }
            if(version!==inboxVersion)return;
            PawpalChatbot.state.inboxPage=payload.data;
            const dbConvs=payload.data.rows||[];
            PawpalChatbot.state.liveLoadError = null;

            if (!dbConvs || dbConvs.length === 0) {
                PawpalChatbot.state.liveConversations = [];
                PawpalChatbot.state.currentConversation = null;
                updateFilterBadges();
                PawpalChatbot.state.liveLoaded = true;
                PawpalChatbot.subtabs.live?.renderConversationsList?.();
                PawpalChatbot.subtabs.live?.renderCurrentChat?.();
                updateDeepBreadcrumb();
                return;
            }

            const convIds = dbConvs.map(c => c.id);
            const customerIds = [...new Set(dbConvs.map(c => c.customer_id).filter(Boolean))];

            // 2. Chỉ truy vấn thông tin khách hàng và tin nhắn gần nhất cho các hội thoại được trả về
            const [profsRes,custsRes,phonesRes] = await Promise.all([
                customerIds.length ? supabase.from('customer_profile').select('customer_id,full_name').in('customer_id',customerIds) : {data:[]},
                customerIds.length ? supabase.from('customer').select('id,contact_email').in('id',customerIds) : {data:[]},
                customerIds.length ? supabase.from('customer_phone').select('customer_id,phone_number').eq('is_primary',true).in('customer_id',customerIds) : {data:[]}
            ]);
            for(const response of [profsRes,custsRes,phonesRes])if(response.error)throw response.error;
            const recentMsgsRes={data:dbConvs.map(c=>c.latest_message).filter(Boolean)};
            custsRes.data=custsRes.data.map(c=>({...c,email:c.contact_email,phone_main:phonesRes.data.find(p=>p.customer_id===c.id)?.phone_number || null}));

            const profMap = {};
            (profsRes.data || []).forEach(p => {
                if (p.customer_id) profMap[p.customer_id] = p;
            });

            const custMap = {};
            (custsRes.data || []).forEach(c => {
                if (c && c.id) custMap[c.id] = c;
            });

            const latestMsgMap = {};
            (recentMsgsRes.data || []).forEach(m => {
                if (!latestMsgMap[m.conversation_id]) {
                    latestMsgMap[m.conversation_id] = m;
                }
            });

            // 3. Xây dựng danh sách hội thoại nhẹ Tier 1
            const realConvList = dbConvs.map(rc => {
                const prof = profMap[rc.customer_id] || {};
                const cust = custMap[rc.customer_id] || {};
                const latestMsg = latestMsgMap[rc.id];

                const custName = prof.full_name

                    || cust.email?.split('@')[0]
                    || (rc.customer_id ? `Khách #${rc.customer_id.slice(0, 5)}` : `Khách #${rc.id.slice(0, 5)}`);

                // CB-25: Không bịa số điện thoại giả, lấy chính xác phone_main từ bảng customer
                const phone = cust.phone_main || (rc.customer_id ? '—' : 'Khách vãng lai');
                const sLevel = rc.sentiment_level || 2;
                const sText = sLevel === 6 ? 'Mức độ 6: Khẩn cấp y tế' : (sLevel === 5 ? 'Mức độ 5: Mất kiểm soát' : (sLevel === 4 ? 'Mức độ 4: Tức giận cao độ' : (sLevel === 3 ? 'Mức độ 3: Thất vọng' : 'Mức độ 2: Trung tính')));

                const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(rc.updated_at || rc.created_at).getTime()) / 1000));
                const isHandover = Boolean(rc.assigned_staff_id) || rc.status === 'agent_handling';
                const isUrgent = Boolean(rc.is_urgent || sLevel >= 4);

                let cat = 'all';
                if (['resolved','closed','completed'].includes(rc.status)) cat = 'resolved';
                else if (isUrgent) cat = 'urgent';
                else if (isHandover) cat = 'active';

                // Nếu hội thoại đã có tin nhắn được nạp trước đó trong state, giữ lại để không bị chớp giật
                const existingConv = (PawpalChatbot.state.liveConversations || []).find(c => c.id === rc.id);

                const messages = existingConv && existingConv.messagesLoaded
                    ? existingConv.messages
                    : (latestMsg ? [{
                        id: latestMsg.id,
                        sender: ['customer','guest'].includes(latestMsg.sender_type) ? 'user' : (latestMsg.sender_type === 'staff' ? 'agent' : (latestMsg.sender_type === 'system' ? 'system' : 'bot')),
                        agentName: (latestMsg.sender_type === 'system' ? 'Hệ thống' : latestMsg.sender_type === 'staff' ? 'Chuyên viên CSKH' : 'PawPal Bot'),
                        time: new Date(latestMsg.created_at).toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }),
                        text: latestMsg.content || '',
                        isToxic: !!latestMsg.is_toxic,
                        activeMaskLevel: latestMsg.is_toxic ? 'words' : 'raw'
                    }] : []);

                return {
                    id: rc.id,
                    updatedAtRaw: rc.updated_at,
                    assignedStaffId: rc.assigned_staff_id,
                    status: rc.status,
                    slaDeadline: rc.sla_deadline,
                    isRealDb: true,
                    customerId: rc.customer_id,
                    customerName: custName,
                    phone: phone,
                    tier: existingConv?.tier || (rc.customer_id ? 'Thành viên' : 'Vãng lai'),
                    pawpoints: existingConv?.pawpoints || 0,
                    unreadCount: isUrgent ? 1 : 0,
                    updatedAt: new Date(rc.updated_at || rc.created_at).toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }),
                    sentimentLevel: sLevel,
                    sentimentText: sText,
                    sentimentTrend: rc.sentiment_trend || 'stable',
                    isVipAttention: Boolean(rc.ai_summary && rc.ai_summary.includes('VIP')) || (sLevel >= 4),
                    isHandover: isHandover,
                    isUrgent: isUrgent,
                    waitingSeconds: isHandover ? 0 : Math.min(elapsedSec, 999),
                    category: cat,
                    aiSummary: rc.ai_summary || 'Chưa có tóm tắt.',
                    internalNotes: rc.internal_note || '',
                    recentOrder: existingConv?.recentOrder || null,
                    recentBooking: existingConv?.recentBooking || null,
                    openTickets: existingConv?.openTickets || [],
                    pets: existingConv?.pets || [],
                    smartResponses: [],
                    messages: messages,
                    messagesLoaded: Boolean(existingConv?.messagesLoaded),
                    contextLoaded: Boolean(existingConv?.contextLoaded)
                };
            });

            if(version!==inboxVersion)return;
            PawpalChatbot.state.liveConversations = realConvList;

            // Đồng bộ conversation đang chọn
            const savedConvId = sessionStorage.getItem('pawpal_admin_chatbot_conv_id');
            const targetConv = (savedConvId && realConvList.find(c => c.id === savedConvId))
                || (savedConvId && realConvList.find(c => c.customerId === savedConvId))
                || realConvList[0]
                || null;

            PawpalChatbot.state.currentConversation = targetConv;
            if (targetConv) {
                sessionStorage.setItem('pawpal_admin_chatbot_conv_id', targetConv.id);
                // Kích hoạt nạp chi tiết Tier 2 theo yêu cầu
                await loadConversationDetails(targetConv);
            }

            if(version!==inboxVersion)return;
            updateFilterBadges();
            PawpalChatbot.state.liveLoaded = true;
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            updateDeepBreadcrumb();

        } catch (err) {
            if(version!==inboxVersion)return;
            PawpalChatbot.state.liveLoadError = 'Không thể tải hội thoại. Vui lòng tải lại trang.';
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            console.error('[Chatbot] Lỗi nạp dữ liệu Inbox tóm tắt:', err);
        }
    }

    // TIER 2: Nạp tin nhắn đầy đủ (30 tin gần nhất) theo phiên hội thoại
    async function loadConversationMessages(convId, options = {}) {
        if (!supabase || !convId) return [];
        const limit = options.limit || 30;
        try {
            const {data:msgs,error}=await supabase.rpc('get_admin_chat_messages',{p_conversation:convId,p_before_at:options.beforeCreatedAt||null,p_before_id:options.beforeId||null});
            if (error) throw error;

            const sorted = (msgs || []).slice().reverse();
            return sorted.map(m => ({
                id: m.id,
                createdAtRaw: m.created_at,
                sender: ['customer','guest'].includes(m.sender_type) ? 'user' : (m.sender_type === 'staff' ? 'agent' : (m.sender_type === 'system' ? 'system' : 'bot')),
                agentName: (m.sender_type === 'system' ? 'Hệ thống' : m.sender_type === 'staff' ? (m.staff_name || 'Nhân viên') : 'PawPal Bot'),
                time: new Date(m.created_at).toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }),
                text: m.content || '',
                isToxic: !!m.is_toxic,
                activeMaskLevel: m.is_toxic ? 'words' : 'raw'
            }));
        } catch (err) {
            console.error('[Chatbot] Lỗi nạp tin nhắn phiên:', err);
            throw err;
        }
    }

    // TIER 2: Nạp ngữ cảnh hồ sơ khách hàng (đơn hàng, lịch hẹn, ticket, thú cưng, điểm thưởng)
    async function loadCustomerContext(customerId) {
        if (!supabase || !customerId || customerId === 'guest') {
            return {
                pets: [],
                recentOrder: null,
                recentBooking: null,
                openTickets: [],
                pawpoints: 0,
                tier: 'Vãng lai'
            };
        }

        if (customerContextCache.has(customerId)) {
            return customerContextCache.get(customerId);
        }

        try {
            const [petsRes, ordersRes, apptsRes, ticketsRes, pointsRes, membershipRes] = await Promise.all([
                supabase.from('pet_profile').select('id,pet_name,allergy,routine,breed:pet_breed(breed_name,species:pet_species(species_name))').eq('customer_id', customerId),
                supabase.from('sales_order').select('id, order_code, order_status, created_at').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1),
                supabase.from('appointment').select('id, appointment_code, appointment_status, created_at, items:appointment_item(name_snapshot,is_primary)').eq('customer_id', customerId).order('created_at', { ascending: false }).limit(1),
                supabase.from('support_ticket').select('id,subject,status,category,created_at').eq('customer_id',customerId).not('status','in','(completed,resolved,closed,rejected)').order('created_at',{ascending:false}).limit(5),
                supabase.from('customer_point_balance').select('total_paw_points').eq('customer_id',customerId).maybeSingle(),
                supabase.from('customer_membership').select('tier:membership_tier(tier_name)').eq('customer_id',customerId).maybeSingle()
            ]);

            for(const response of [petsRes,ordersRes,apptsRes,ticketsRes,pointsRes,membershipRes])if(response.error)throw response.error;
            const pets = (petsRes.data || []).map(p => ({
                id: p.id,
                name: p.pet_name || 'Thú cưng',
                breed: p.breed?.breed_name || p.breed?.species?.species_name || '—',
                notes: p.allergy || p.routine || ''
            }));

            const recentOrder = (ordersRes.data || [])[0] ? {
                id: ordersRes.data[0].id,
                code: ordersRes.data[0].order_code,
                status: ordersRes.data[0].order_status || 'Đang xử lý'
            } : null;

            const recentBooking = (apptsRes.data || [])[0] ? {
                id: apptsRes.data[0].id,
                code: apptsRes.data[0].appointment_code,
                status: apptsRes.data[0].appointment_status || 'Đã xếp lịch'
            } : null;

            const openTickets = (ticketsRes.data || []).map(t=>({...t,title:t.subject}));

            // CB-17: Lấy số dư authoritative từ customer_membership
            const totalPoints = pointsRes.data?.total_paw_points ?? 0;

            const ctx = {
                pets,
                recentOrder,
                recentBooking,
                openTickets,
                pawpoints: totalPoints,
                tier: membershipRes.data?.tier?.tier_name || 'Chưa gán hạng'
            };

            customerContextCache.set(customerId, ctx);
            return ctx;
        } catch (err) {
            console.error('[Chatbot] Lỗi nạp ngữ cảnh khách hàng:', err);
            return {
                pets: [],
                recentOrder: null,
                recentBooking: null,
                openTickets: [],
                pawpoints: null,
                tier: 'Chưa tải được hạng',error:true
            };
        }
    }

    // Nạp đầy đủ thông tin chi tiết phiên được chọn (Tier 2 on-demand)
    async function loadConversationDetails(conv) {
        if (!conv) return;

        const tasks = [];
        if (!conv.messagesLoaded) {
            tasks.push(loadConversationMessages(conv.id, { limit: 30 }).then(msgs => {
                conv.messages = msgs;
                conv.hasMoreMessages=msgs.length===30;
                conv.messagesLoaded = true;
            }));
        }

        if (!conv.contextLoaded && conv.customerId) {
            tasks.push(loadCustomerContext(conv.customerId).then(ctx => {
                conv.pets = ctx.pets;
                conv.recentOrder = ctx.recentOrder;
                conv.recentBooking = ctx.recentBooking;
                conv.openTickets = ctx.openTickets;
                conv.pawpoints = ctx.pawpoints;
                conv.tier = ctx.tier;
                conv.contextLoaded = !ctx.error;
            }));
        }

        if (tasks.length > 0) {
            try { await Promise.all(tasks); } catch(error) {conv.messagesLoaded=false;conv.messages=[];console.warn('[Chatbot] Conversation details unavailable');}
            if (PawpalChatbot.state.currentConversation && PawpalChatbot.state.currentConversation.id === conv.id) {
                PawpalChatbot.subtabs.live?.renderCurrentChat?.();
                PawpalChatbot.subtabs.live?.renderCustomerInfoPanel?.();
            }
        }
    }

    // Debounce và In-flight Coalescing cho làm mới Inbox
    function refreshInboxDebounced(delay = 350) {
        if (inboxDebounceTimer) clearTimeout(inboxDebounceTimer);
        inboxDebounceTimer = setTimeout(async () => {
            if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') {
                return;
            }
            if (isInboxRefreshing) {
                hasPendingRefresh = true;
                return;
            }
            isInboxRefreshing = true;
            try {
                await loadInboxSummary();
            } catch (err) {
                console.error('[Chatbot] Lỗi refreshInboxDebounced:', err);
            } finally {
                isInboxRefreshing = false;
                if (hasPendingRefresh) {
                    hasPendingRefresh = false;
                    refreshInboxDebounced(100);
                }
            }
        }, delay);
    }

    // Phơi bày ra namespace toàn cục
    PawpalChatbot.loadInboxSummary = loadInboxSummary;
    PawpalChatbot.loadChatbotDataFromSupabase = loadInboxSummary; // Tương thích ngược
    PawpalChatbot.loadConversationMessages = loadConversationMessages;
    PawpalChatbot.loadCustomerContext = loadCustomerContext;
    PawpalChatbot.loadConversationDetails = loadConversationDetails;
    PawpalChatbot.refreshInboxDebounced = refreshInboxDebounced;

    function updateFilterBadges() {
        const convs = PawpalChatbot.state.liveConversations || [];
        const urgentCount = PawpalChatbot.state.inboxPage?.counts?.urgent??convs.filter(c => c.category === 'urgent').length;
        const activeCount = PawpalChatbot.state.inboxPage?.counts?.active??convs.filter(c => c.isHandover).length;
        const allCount = PawpalChatbot.state.inboxPage?.counts?.all??convs.length;

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
    // SUPABASE REALTIME CHANNEL SYNC (PR-02: THÔNG MINH, KHÔNG THRASHING)
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
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversation' }, payload => {
                    const changedId=payload?.new?.id||payload?.old?.id;
                    for(const conversation of PawpalChatbot.state.liveConversations||[])if(!changedId||conversation.id===changedId)conversation.messagesLoaded=false;
                    const current=PawpalChatbot.state.currentConversation;
                    if(current&&(!changedId||current.id===changedId))current.messagesLoaded=false;
                    refreshInboxDebounced(350);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        PawpalChatbot.state.isRealtimeHealthy = true;
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        PawpalChatbot.state.isRealtimeHealthy = false;
                    }
                });

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
    const modalOpeners=new Map();
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modalOpeners.set(modalId,document.activeElement);
        const dialog=modal.firstElementChild;
        if(dialog){dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;const title=dialog.querySelector('h2,h3,.admin-modal-title');if(title){title.id||=modalId+'Title';dialog.setAttribute('aria-labelledby',title.id);}}
        modal.classList.add('active');
        modal.style.display = 'flex';
        // Focus vào input đầu tiên nếu có
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]):not([readonly]), select, textarea');
            (firstInput || dialog)?.focus();
        }, 50);
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.display = 'none';
        const opener=modalOpeners.get(modalId);modalOpeners.delete(modalId);if(opener?.isConnected)opener.focus();
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
        const open=Array.from(document.querySelectorAll('.admin-modal-overlay.active, .admin-modal-overlay[style*="display: flex"]')).filter(el=>el.getClientRects().length).at(-1);
        if(e.key==='Tab'&&open){
            const controls=Array.from(open.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"],a[href]')).filter(el=>el.getClientRects().length);
            const first=controls[0],last=controls.at(-1);
            if(!first){e.preventDefault();open.firstElementChild?.focus();}
            else if(e.shiftKey&&(document.activeElement===first||!open.contains(document.activeElement))){e.preventDefault();last.focus();}
            else if(!e.shiftKey&&(document.activeElement===last||!open.contains(document.activeElement))){e.preventDefault();first.focus();}
        }
        if (e.key === 'Escape' || e.keyCode === 27) {
            const activeOverlays = document.querySelectorAll('.admin-modal-overlay.active, .admin-modal-overlay[style*="display: flex"]');
            const top=Array.from(activeOverlays).filter(el=>el.getClientRects().length).at(-1);if(top){e.preventDefault();closeModal(top.id);}
        }
    });


    // -------------------------------------------------------------
    // KHỞI ĐỘNG MODULE (PR-02: TIẾT KIỆM TẢI, TẮT POLLING KHI REALTIME KHỎE)
    // -------------------------------------------------------------
    setupChatbotRealtimeSync();
    loadInboxSummary();

    window.addEventListener('focus', () => {
        refreshInboxDebounced(150);
    });

    // PR-02: Fallback polling 45s chỉ chạy khi Realtime mất kết nối và tab đang hiển thị
    setInterval(() => {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;
        if (document.hidden) return;
        if (PawpalChatbot.state.isRealtimeHealthy) return;
        refreshInboxDebounced(0);
    }, 45000);

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

