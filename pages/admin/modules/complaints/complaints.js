// complaints.js - Phân hệ Quản lý Khiếu nại Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalComplaints = window.PawpalComplaints = window.PawpalComplaints || {};
    window.PawpalComplaintsModule = PawpalComplaints;
    PawpalComplaints.subtabs = PawpalComplaints.subtabs || {};

    // State dùng chung cho toàn bộ phân hệ Khiếu nại
    PawpalComplaints.state = Object.assign({
        serviceComplaints: [],
        orderComplaints: [],
        cachedAppointments: [],
        cachedOrders: [],
        cachedCustomers: [],
        cachedProfiles: [],
        cachedPets: [],
        cachedStaff: [],
        currentActiveTicket: null,
        currentTicketType: 'service', // 'service' hoặc 'order'
        currentTicketId: sessionStorage.getItem('pawpal_admin_complaint_selected_id') || null,
        isLoaded: false
    }, PawpalComplaints.state || {});

    // Helper định dạng ngày giờ chuẩn hóa toàn hệ thống (YYYY-MM-DD HH:mm, YYYY-MM-DD, HH:mm)
    const formatDateTime = PawpalComplaints.formatDateTime = function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(dateObj);
    };

    const formatDate = PawpalComplaints.formatDate = function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(dateObj);
    };

    const formatTime = PawpalComplaints.formatTime = function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(dateObj);
    };

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    PawpalComplaints.escapeHtml = escapeHtml;

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

        const normalizedType = type === 'error' ? 'danger' : type;
        const bg = bgColors[normalizedType] || bgColors.info;
        const color = textColors[normalizedType] || textColors.info;

        toast.style.cssText = `
            background: ${bg};
            color: ${color};
            padding: 10px 16px;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            pointer-events: auto;
            opacity: 0;
            transform: translateY(-8px);
            transition: opacity 0.2s ease, transform 0.2s ease;
            max-width: 380px;
            line-height: 1.4;
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
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }
    PawpalComplaints.showToast = showToast;
    PawpalComplaints.errorMessage = function(error) {
        const messages = {
            complaint_changed:'Phiếu đã thay đổi. Tải lại trước khi thao tác.',
            complaint_request_conflict:'Yêu cầu đã được lưu với nội dung khác. Đóng và mở lại để tạo thao tác mới.',
            complaint_approval_forbidden:'Chỉ tài khoản có vai trò quản trị mới được duyệt phương án.',
            complaint_forbidden:'Bạn không có quyền thực hiện thao tác này.',
            complaint_handler_unavailable:'Nhân viên chưa đủ điều kiện nhận xử lý. Chọn nhân viên khác.',
            complaint_note_required:'Vui lòng nhập nội dung từ 2 ký tự.',
            invalid_complaint_resolution:'Kiểm tra phương án, số tiền và giao dịch liên quan.',
            complaint_refund_mismatch:'Chọn giao dịch hoàn tiền thành công, đúng khách và đúng đơn hoặc lịch hẹn.',
            complaint_return_mismatch:'Chọn yêu cầu trả hàng đã nhận, thuộc đúng đơn hàng.',
            complaint_replacement_order_required:'Chọn đơn đổi mới của khách đã giao thành công.',
            complaint_booking_mismatch:'Chọn lịch làm lại đã hoàn tất, cùng bé cưng và dịch vụ của lịch gốc.',
            complaint_approved_result_required:'Phương án cần được duyệt và có kết quả thực hiện trước khi hoàn tất.',
            complaint_approval_pending:'Phiếu đang chờ duyệt phương án.',
            complaint_not_open:'Phiếu đã kết thúc. Mở lại phiếu trước khi tiếp tục.',
            complaint_owner_mismatch:'Giao dịch không thuộc khách hàng của phiếu.',
            complaint_result_already_linked:'Giao dịch này đã được liên kết với phiếu khác.'
        };
        return messages[error?.message] || (error?.code==='42501'?'Bạn không có quyền thực hiện thao tác này.':'Không thể lưu thay đổi. Kiểm tra dữ liệu và tải lại để thử lại.');
    };

    function getCurrentStaffName() { return PawpalComplaints.state.actor?.full_name || ''; }
    PawpalComplaints.getCurrentStaffName = getCurrentStaffName;
    function getCurrentStaffId() { return PawpalComplaints.state.actor?.id || null; }
    PawpalComplaints.getCurrentStaffId = getCurrentStaffId;

    // SLA Calculation
    function calculateSla(item) {
        if (!item) return;
        item.slaStatus = ['resolved','closed'].includes(item.status) ? 'DONE' : 'UNKNOWN';
        item.slaRemainingText = item.slaStatus === 'DONE' ? 'Đã kết thúc' : 'Chưa cấu hình hạn xử lý';
    }
    PawpalComplaints.calculateSla = calculateSla;

    function sortComplaintsByUrgencyAndSla(a, b) {
        calculateSla(a);
        calculateSla(b);

        const doneStatuses = ['resolved', 'closed', 'completed', 'da_giai_quyet', 'da_dong', 'tu_choi', 'rejected'];
        const isDoneA = doneStatuses.includes(String(a.status || '').toLowerCase());
        const isDoneB = doneStatuses.includes(String(b.status || '').toLowerCase());
        if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;

        const slaRank = { 'OVERDUE': 1, 'URGENT': 2, 'NORMAL': 3, 'DONE': 4 };
        const sRankA = slaRank[a.slaStatus] || 3;
        const sRankB = slaRank[b.slaStatus] || 3;
        if (sRankA !== sRankB) return sRankA - sRankB;

        // F-010: Sắp xếp theo ưu tiên chuẩn: khan_cap (1) > cao (2) > trung_binh (3) > thap (4)
        const priorityRank = {
            'khan_cap': 1, 'urgent': 1,
            'cao': 2, 'high': 2,
            'trung_binh': 3, 'medium': 3, 'binh_thuong': 3,
            'thap': 4, 'low': 4
        };
        const pA = priorityRank[String(a.priority || '').toLowerCase()] || 3;
        const pB = priorityRank[String(b.priority || '').toLowerCase()] || 3;
        if (pA !== pB) return pA - pB;

        const statusRank = {
            'mo': 1, 'new': 1, 'pending': 1,
            'reprocessing': 2,
            'waiting_manager_approval': 3,
            'dang_xu_ly': 4, 'processing': 4, 'waiting_return': 4, 'refunding': 4,
            'cho_khach_hang': 5, 'waiting_customer': 5,
            'da_giai_quyet': 6, 'resolved': 6,
            'da_dong': 7, 'closed': 7, 'completed': 7,
            'tu_choi': 8, 'rejected': 8
        };
        const stA = statusRank[String(a.status || '').toLowerCase()] || 5;
        const stB = statusRank[String(b.status || '').toLowerCase()] || 5;
        if (stA !== stB) return stA - stB;

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
    }
    PawpalComplaints.sortComplaintsByUrgencyAndSla = sortComplaintsByUrgencyAndSla;

    // K-02: Bảo vệ SSOT - CSDL Supabase là nguồn sự thật duy nhất, không dùng localStorage ghi đè
    function saveComplaintsOverrides() {
        try {
            localStorage.removeItem('pawpal_complaint_overrides');
        } catch (e) {}
    }
    PawpalComplaints.saveComplaintsOverrides = saveComplaintsOverrides;

    // Cache TTL 90 giây — không fetch lại khi chuyển phân hệ
    let _complLastFetchedAt = 0;
    const COMPL_CACHE_TTL_MS = 90_000;
    let complaintsLoadSequence = 0;

    // K-01: Sử dụng Supabase client authenticated chuẩn toàn hệ thống
    // Đảm bảo request mang JWT phiên admin hợp lệ và tuân thủ RLS/RBAC chuẩn
    function getComplaintsDbClient() {
        if (typeof window.getSupabaseClient === 'function') {
            const client = window.getSupabaseClient();
            if (client) return client;
        }
        return window.SupabaseClient || null;
    }
    PawpalComplaints.getDbClient = getComplaintsDbClient;

    // Giữ alias cho các tab cũ; mọi truy vấn phải mang phiên Admin và chịu RLS.
    PawpalComplaints.getAnonDbClient = getComplaintsDbClient;

    // ====================================================================
    // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
    // ====================================================================
    async function loadComplaintsModuleData({ force = false } = {}) {
        const requestSequence = ++complaintsLoadSequence;
        try {
            let client = getComplaintsDbClient();
            if (!client) {
                for (let attempt = 0; attempt < 30; attempt++) {
                    await new Promise(r => setTimeout(r, 100));
                    client = getComplaintsDbClient();
                    if (client) break;
                }
            }
            if (!client) {
                throw new Error('Không thể kết nối cơ sở dữ liệu.');
            }

            // Sử dụng cache nếu dữ liệu còn mới VÀ đã có dữ liệu thực tế
            const totalComplaintsCount = (PawpalComplaints.state.serviceComplaints?.length || 0) + (PawpalComplaints.state.orderComplaints?.length || 0);
            if (!force && totalComplaintsCount > 0 && Date.now() - _complLastFetchedAt < COMPL_CACHE_TTL_MS) {
                console.log('[Complaints] Dùng cache, bỏ qua fetch.');
                updateComplaintsKpis();
                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable();
                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable();
                return;
            }

            const fetchComplaintsData = async () => {
                const readAll = async (table, columns, key = 'id') => {
                    const rows = [];
                    for (let offset = 0; ; offset += 500) {
                        const { data, error } = await client.from(table).select(columns)
                            .order(key, { ascending: true }).range(offset, offset + 499);
                        if (error) throw error;
                        rows.push(...(data || []));
                        if (!data || data.length < 500) return rows;
                    }
                };
                const [tickets, customers, phones, profiles, pets, appointments, orders, staffList, products] = await Promise.all([
                    readAll('support_ticket', '*'),
                    readAll('customer', 'id,contact_email,customer_status'),
                    readAll('customer_phone', 'id,customer_id,phone_number,is_primary'),
                    readAll('customer_profile', 'customer_id,full_name,gender', 'customer_id'),
                    readAll('pet_profile', 'id,customer_id,pet_code,pet_name,avatar_url,routine,allergy,safety_note,breed:pet_breed(breed_name,species:pet_species(species_name))'),
                    readAll('appointment', 'id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,appointment_status,note,staff:staff_id(full_name),items:appointment_item(id,is_primary,name_snapshot,service:service_id(service_name,category:service_category(category_code)))'),
                    readAll('sales_order', 'id,order_code,customer_id,order_status,shipping_status,tracking_code,created_at,carrier:shipping_provider(provider_name)'),
                    readAll('staff', 'id,full_name,job_title,employment_status,auth_user_id'),
                    readAll('product', 'id,product_name,status,product_variant(id,sku_variant,sale_price)')
                ]);
                return {
                    tickets, profiles, staffList,
                    customers: customers.map(c => ({ ...c, email: c.contact_email,
                        phone_main: phones.find(p => p.customer_id === c.id && p.is_primary)?.phone_number || null })),
                    pets: pets.map(p => ({ ...p, species: p.breed?.species?.species_name,
                        breed: p.breed?.breed_name })),
                    appointments: appointments.map(a => {
                        const primary = a.items?.find(i => i.is_primary) || a.items?.[0];
                        const category = String(primary?.service?.category?.category_code || '').toLowerCase();
                        return { ...a, appointment_date: a.scheduled_start_at,
                            service: primary ? { service_name: primary.name_snapshot } : null,
                            service_type: category.includes('hotel') ? 'hotel' : category.includes('taxi') ? 'taxi' : category ? 'spa' : 'contact' };
                    }),
                    orders: orders.map(o => ({ ...o, carrier: o.carrier?.provider_name })),
                    products: products.map(p => ({ ...p, sku: p.product_variant?.[0]?.sku_variant || null,
                        sale_price: p.product_variant?.[0]?.sale_price ?? null }))
                };
            };

            const cachedPayload = window.PawpalDataStore?.fetch
                ? await window.PawpalDataStore.fetch('complaints:data', fetchComplaintsData, {
                    ttlMs: window.PawpalDataStore.TTL.OPERATIONAL,
                    force
                })
                : await fetchComplaintsData();

            if (requestSequence !== complaintsLoadSequence) return;
            const identity = await client.auth.getUser();
            if (identity.error) throw identity.error;
            if (requestSequence !== complaintsLoadSequence) return;
            PawpalComplaints.state.loadError = null;
            PawpalComplaints.state.unclassifiedTickets = [];

            const tickets = cachedPayload.tickets || [];
            const messages = []; // Tải on-demand theo ticket_id khi mở chi tiết khiếu nại (PERF-03.K02)
            const customers = cachedPayload.customers || [];
            const profiles = cachedPayload.profiles || [];
            const pets = cachedPayload.pets || [];
            const appointments = cachedPayload.appointments || [];
            const orders = cachedPayload.orders || [];
            const staffList = cachedPayload.staffList || [];
            const products = cachedPayload.products || [];

            PawpalComplaints.state.cachedAppointments = appointments;
            PawpalComplaints.state.cachedOrders = orders;
            PawpalComplaints.state.cachedCustomers = customers;
            PawpalComplaints.state.cachedProfiles = profiles;
            PawpalComplaints.state.cachedPets = pets;
            PawpalComplaints.state.cachedStaff = staffList;
            PawpalComplaints.state.actor = staffList.find(s => s.auth_user_id === identity.data.user?.id) || null;
            PawpalComplaints.state.cachedProducts = products;

            // Map helpers
            const custMap = {};
            customers.forEach(c => {
                custMap[c.id] = c;
                if (c.phone_main) custMap[c.phone_main] = c;
                if (c.phone) custMap[c.phone] = c;
            });

            const profMap = {};
            profiles.forEach(p => {
                profMap[p.customer_id] = p;
                if (p.id) profMap[p.id] = p;
            });

            const petMap = {};
            pets.forEach(p => {
                petMap[p.id] = p;
                if (p.customer_id) {
                    if (!petMap['cust_' + p.customer_id]) petMap['cust_' + p.customer_id] = [];
                    petMap['cust_' + p.customer_id].push(p);
                }
            });

            const msgMap = {};
            messages.forEach(m => {
                if (!msgMap[m.ticket_id]) msgMap[m.ticket_id] = [];
                msgMap[m.ticket_id].push(m);
            });

            const apptMap = {};
            appointments.forEach(a => {
                if (a.customer_id) {
                    if (!apptMap['cust_' + a.customer_id]) apptMap['cust_' + a.customer_id] = [];
                    apptMap['cust_' + a.customer_id].push(a);
                }
            });

            const orderMap = {};
            orders.forEach(o => {
                if (o.customer_id) {
                    if (!orderMap['cust_' + o.customer_id]) orderMap['cust_' + o.customer_id] = [];
                    orderMap['cust_' + o.customer_id].push(o);
                }
            });

            const serviceComplaints = [];
            const orderComplaints = [];

            const localOverridesMap = {};

            tickets.forEach((record, idx) => {
                const t = {...record,user_id:record.customer_id || record.user_id,title:record.subject || record.title};
                const ticketMsgs = msgMap[t.id] || [];
                const userMsg = ticketMsgs.find(m => ['user','khach_hang'].includes(m.sender_type)) || ticketMsgs[0];
                const cskhMsgs = ticketMsgs.filter(m => ['cskh','nhan_vien'].includes(m.sender_type));
                const lastCskhMsg = cskhMsgs.length > 0 ? cskhMsgs[cskhMsgs.length - 1] : null;

                let cData = custMap[t.user_id] || (t.user_id ? customers.find(c => c.id === t.user_id || c.phone_main === t.user_id || c.phone === t.user_id) : null);
                let custId = cData ? cData.id : t.user_id;
                let pData = custId ? (profMap[custId] || profiles.find(p => p.customer_id === custId)) : null;

                let customerName = (pData && pData.full_name) || (cData && (cData.note || cData.phone_main || cData.email));
                if (!customerName && t.title && t.title.toLowerCase().startsWith('liên hệ từ ')) {
                    customerName = t.title.replace(/^liên hệ từ\s*/i, '').trim();
                }
                if (!customerName && t.user_id) {
                    customerName = `Khách hàng ${String(t.user_id).slice(-4)}`;
                }
                if (!customerName) customerName = 'Khách vãng lai';

                let phone = (cData && (cData.phone_main || cData.phone)) || (pData && pData.phone);
                if (!phone || phone === '—') {
                    if (userMsg && userMsg.content) {
                        const matchPhone = userMsg.content.match(/(0[35789]\d{8})/);
                        if (matchPhone) phone = matchPhone[1];
                    }
                }
                if (!phone) phone = '—';

                const timeline = [];
                if (ticketMsgs.length > 0) {
                    ticketMsgs.forEach(m => {
                        const isUser = ['user','khach_hang'].includes(m.sender_type);
                        const authorName = isUser ? `${customerName} (Khách hàng)` : `${m.agent_name || (lastCskhMsg ? lastCskhMsg.agent_name : 'CSKH PawPal')} (CSKH)`;
                        const dateObj = m.created_at ? new Date(m.created_at) : new Date();
                        const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')} - ${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                        timeline.push({
                            time: timeStr,
                            author: authorName,
                            title: isUser ? 'Phản ánh khiếu nại' : 'Phản hồi hỗ trợ',
                            desc: m.content || '',
                            isInternal: !isUser
                        });
                    });
                } else {
                    const dateObj = t.created_at ? new Date(t.created_at) : new Date();
                    const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')} - ${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                    timeline.push({
                        time: timeStr,
                        author: `${customerName} (Khách hàng)`,
                        title: 'Gửi yêu cầu hỗ trợ',
                        desc: t.title || 'Khách gửi phản ánh qua hệ thống',
                        isInternal: false
                    });
                }

                const createdAtStr = formatDateTime(t.created_at);

                let normPriority = 'medium';
                const pLower = (t.priority || '').toLowerCase();
                if (pLower === 'khan_cap' || pLower === 'urgent') normPriority = 'khan_cap';
                else if (pLower.includes('cao') || pLower === 'high') normPriority = 'high';
                else if (pLower.includes('thấp') || pLower === 'low' || pLower === 'thap') normPriority = 'low';

                let normStatus = 'new';
                const sLower = (t.status || '').toLowerCase();
                if (sLower === 'pending' || sLower === 'new' || sLower === 'mo') normStatus = 'new';
                else if (sLower === 'processing' || sLower === 'in_progress' || sLower === 'dang_xu_ly') normStatus = 'processing';
                else if (sLower === 'waiting_customer' || sLower === 'cho_khach_hang') normStatus = 'waiting_customer';
                else if (sLower === 'waiting_manager_approval') normStatus = 'waiting_manager_approval';
                else if (sLower === 'reprocessing') normStatus = 'reprocessing';
                else if (sLower === 'waiting_return') normStatus = 'waiting_return';
                else if (sLower === 'refunding') normStatus = 'refunding';
                else if (sLower === 'completed' || sLower === 'resolved' || sLower === 'da_giai_quyet') normStatus = 'resolved';
                else if (sLower === 'closed' || sLower === 'da_dong' || sLower === 'tu_choi' || sLower === 'rejected') normStatus = 'closed';

                const officialAssignedStaff = staffList.find(staff => staff.id === t.assigned_staff_id)?.full_name;
                const staffAssigned = officialAssignedStaff || lastCskhMsg?.agent_name || 'Chưa phân công';
                const ov = localOverridesMap[t.id];

                const tType = String(t.type || t.ticket_type || t.category || '').toLowerCase();
                const ref = t.appointment_id || t.sales_order_id || t.order_id || ov?.refId;
                const serviceRef = appointments.find(a=>a.id===ref || a.appointment_code===ref);
                const orderRef = orders.find(o=>o.id===ref || o.order_code===ref);
                const isOrder = t.category === 'order' || Boolean(orderRef) || ['payment','order','product','wrong_item','damaged','quality','return_request','missing_item','don_hang','thanh_toan','san_pham','hoan_tien'].includes(tType);
                const isService = Boolean(serviceRef) || ['service','health','spa','hotel','taxi','dich_vu','grooming','kham_benh','luu_chuong','booking','contact','other','general','inquiry','cskh','tu_van'].includes(tType);

                if (!isOrder) {
                    let appt = serviceRef || null;
                    if (ov && ov.refId) {
                        appt = appointments.find(a => a.id === ov.refId || a.appointment_code === ov.refId);
                    }
                    if (!appt) {
                        const custAppts = custId ? (apptMap['cust_' + custId] || []) : [];
                        appt = serviceRef || null;
                    }

                    let pet = null;
                    if (appt && appt.pet_id) {
                        pet = pets.find(p => p.id === appt.pet_id);
                    }
                    if (!pet) {
                        const custPets = custId ? (petMap['cust_' + custId] || []) : [];
                        pet = appt?.pet_id ? pets.find(p=>p.id===appt.pet_id) : null;
                    }

                    const isContactOrOther = ['contact', 'other', 'test', 'lien_he', 'khac'].includes(tType);
                    const sType = ['health', 'spa', 'hotel', 'taxi'].includes(tType) ? tType : (appt && appt.service_type ? appt.service_type : (isContactOrOther ? 'contact' : 'spa'));
                    const petDisplayBreed = pet ? `${pet.breed || pet.species || 'Thú cưng'} • ${pet.weight ? pet.weight + ' kg' : 'Chưa ghi nhận cân nặng'}` : (isContactOrOther ? 'Chưa xác định' : 'Chưa có thông tin');
                    const petDisplayNotes = pet ? [pet.allergy && `Dị ứng: ${pet.allergy}`, pet.routine, pet.safety_note].filter(Boolean).join('. ') || 'Chưa ghi nhận lưu ý.' : 'Chưa có thông tin bé cưng';

                    const demandLabels = {
                        'hoan_tien': 'Hoàn tiền cho khách',
                        'hoan_tien_mot_phan': 'Hoàn tiền một phần',
                        'doi_san_pham': 'Đổi sản phẩm mới',
                        'thuc_hien_lai_dich_vu': 'Làm lại dịch vụ',
                        'boi_thuong': 'Bồi thường sự cố',
                        'tu_choi': 'Từ chối giải quyết',
                        'khac': 'Giải pháp khác'
                    };

                    const optNames = {
                        'redo_service': 'Làm lại dịch vụ miễn phí',
                        'change_staff': 'Đổi kỹ thuật viên chăm sóc',
                        'reward_voucher': 'Tặng Voucher và Pawpoint bồi hoàn',
                        'refund': 'Hoàn tiền dịch vụ',
                        'rma_replace': 'Đổi sản phẩm mới (Tạo mã RMA)',
                        'rma_exchange': 'Đổi sản phẩm mới (Tạo mã RMA)',
                        'rma_refund': 'Thu hồi và hoàn tiền',
                        'explain': 'Giải thích quy trình và chăm sóc khách hàng',
                        'hoan_tien': 'Hoàn tiền cho khách',
                        'boi_thuong': 'Bồi thường sự cố'
                    };

                    let dbResolution = null;
                    if (t.resolution_type || t.resolution_note || (t.approved_amount && Number(t.approved_amount) > 0)) {
                        dbResolution = {
                            option: t.resolution_type,
                            type: t.resolution_type,
                            typeName: optNames[t.resolution_type] || t.resolution_type || 'Đã giải quyết',
                            note: t.resolution_note || t.investigation_note || '',
                            approvedAmount: Number(t.approved_amount) || 0,
                            resolvedBy: t.resolved_by,
                            resolvedAt: t.resolved_at,
                            closedAt: t.closed_at
                        };
                    }

                    const serviceItem = {
                        id: t.ticket_code || t.id,
                        rawId: t.id,
                        customerId: t.customer_id,
                        updated_at: t.updated_at,
                        customerName: customerName,
                        phone: phone,
                        petName: pet ? (pet.pet_name || pet.name) : (isContactOrOther ? '—' : 'Chưa gắn hồ sơ bé cưng'),
                        petBreed: petDisplayBreed,
                        petNotes: petDisplayNotes,
                        bookingId: appt ? (appt.appointment_code || appt.id) : (isContactOrOther ? '—' : null),
                        serviceType: sType,
                        serviceName: appt && appt.service ? appt.service.service_name : (isContactOrOther ? 'Hỗ trợ và phản ánh chung' : (t.title || 'Dịch vụ chăm sóc thú cưng')),
                        staffExecuted: appt && appt.staff ? `${appt.staff.full_name}` : (isContactOrOther ? 'Bộ phận CSKH' : 'Chưa phân công'),
                        title: t.title || 'Khiếu nại ca dịch vụ',
                        content: userMsg ? userMsg.content : (t.description || t.title || 'Khách phản ánh về dịch vụ'),
                        priority: normPriority,
                        staffAssigned: staffAssigned,
                        assigned_staff_id: t.assigned_staff_id,
                        requested_resolution: t.requested_resolution,
                        requested_amount: Number(t.requested_amount) || 0,
                        customerDemand: demandLabels[t.requested_resolution] || t.requested_resolution || 'Chưa ghi nhận yêu cầu',
                        first_response_at: t.first_response_at,
                        investigation_note: t.investigation_note,
                        resolution_type: t.resolution_type,
                        resolution_note: t.resolution_note,
                        approved_amount: t.approved_amount == null ? null : Number(t.approved_amount),
                        resolved_by: t.resolved_by,
                        resolved_at: t.resolved_at,
                        closed_at: t.closed_at,
                        resolution: dbResolution || ov?.resolution || null,
                        createdAt: createdAtStr,
                        createdAtRaw: t.created_at,
                        status: normStatus,
                        evidence: [],
                        checkinHealth: 'Chưa tải biên bản tiếp nhận.',
                        checkinPhotos: [],
                        staffLogNote: 'Chưa tải nhật ký ca dịch vụ.',
                        timeline: timeline
                    };

                    calculateSla(serviceItem);
                    serviceComplaints.push(serviceItem);
                } else {
                    let order = orderRef || null;
                    if (ov && ov.refId) {
                        order = orders.find(o => o.id === ov.refId || o.order_code === ov.refId);
                    }
                    if (!order) {
                        const custOrders = custId ? (orderMap['cust_' + custId] || []) : [];
                        order = orderRef || null;
                    }

                    let issueType = 'other';
                    if (['wrong_item', 'damaged', 'quality', 'return_request', 'missing_item', 'payment', 'delivery'].includes(t.category)) {
                        issueType = t.category;
                    } else if (['wrong_item', 'damaged', 'quality', 'return_request', 'missing_item'].includes(tType)) {
                        issueType = tType;
                    } else if (tType === 'payment') {
                        issueType = 'payment';
                    }

                    const demandLabels = {
                        'hoan_tien': 'Hoàn tiền cho khách',
                        'hoan_tien_mot_phan': 'Hoàn tiền một phần',
                        'doi_san_pham': 'Đổi sản phẩm mới',
                        'thuc_hien_lai_dich_vu': 'Làm lại dịch vụ',
                        'boi_thuong': 'Bồi thường sự cố',
                        'tu_choi': 'Từ chối giải quyết',
                        'khac': 'Giải pháp khác'
                    };

                    const optNames = {
                        'redo_service': 'Làm lại dịch vụ miễn phí',
                        'change_staff': 'Đổi kỹ thuật viên chăm sóc',
                        'reward_voucher': 'Tặng Voucher và Pawpoint bồi hoàn',
                        'refund': 'Hoàn tiền dịch vụ',
                        'rma_replace': 'Đổi sản phẩm mới (Tạo mã RMA)',
                        'rma_exchange': 'Đổi sản phẩm mới (Tạo mã RMA)',
                        'rma_refund': 'Thu hồi và hoàn tiền',
                        'explain': 'Giải thích quy trình và chăm sóc khách hàng',
                        'hoan_tien': 'Hoàn tiền cho khách',
                        'boi_thuong': 'Bồi thường sự cố'
                    };

                    let dbResolution = null;
                    if (t.resolution_type || t.resolution_note || (t.approved_amount && Number(t.approved_amount) > 0)) {
                        dbResolution = {
                            option: t.resolution_type,
                            type: t.resolution_type,
                            typeName: optNames[t.resolution_type] || t.resolution_type || 'Đã giải quyết',
                            note: t.resolution_note || t.investigation_note || '',
                            approvedAmount: Number(t.approved_amount) || 0,
                            resolvedBy: t.resolved_by,
                            resolvedAt: t.resolved_at,
                            closedAt: t.closed_at
                        };
                    }

                    const orderItem = {
                        title: t.subject || t.title,
                        id: t.ticket_code || t.id,
                        rawId: t.id,
                        customerId: t.customer_id,
                        updated_at: t.updated_at,
                        customerName: customerName,
                        phone: phone,
                        orderId: order ? (order.order_code || order.id) : null,
                        productName: (order && order.productName) || t.title || 'Chưa liên kết sản phẩm',
                        productSku: (order && order.productSku) || '—',
                        issueType: issueType,
                        customerDemand: demandLabels[t.requested_resolution] || t.requested_resolution || 'Chưa ghi nhận yêu cầu',
                        priority: normPriority,
                        staffAssigned: staffAssigned,
                        assigned_staff_id: t.assigned_staff_id,
                        requested_resolution: t.requested_resolution,
                        requested_amount: Number(t.requested_amount) || 0,
                        first_response_at: t.first_response_at,
                        investigation_note: t.investigation_note,
                        resolution_type: t.resolution_type,
                        resolution_note: t.resolution_note,
                        approved_amount: t.approved_amount == null ? null : Number(t.approved_amount),
                        resolved_by: t.resolved_by,
                        resolved_at: t.resolved_at,
                        closed_at: t.closed_at,
                        resolution: dbResolution || ov?.resolution || null,
                        createdAt: createdAtStr,
                        createdAtRaw: t.created_at,
                        status: normStatus,
                        content: userMsg ? userMsg.content : (t.description || t.title || 'Khách phản ánh về đơn hàng'),
                        evidence: [],
                        warehousePhotos: [],
                        carrier: order && order.carrier ? order.carrier : 'Chưa bàn giao đơn vị vận chuyển',
                        trackingCode: order && order.tracking_code ? order.tracking_code : 'Chưa cấp mã vận đơn',
                        deliveryStatus: order && order.order_status ? (['DELIVERED', 'delivered', 'da_giao_hang', 'completed', 'da_hoan_tat'].includes(order.order_status) ? 'Giao thành công' : (['dang_giao_hang', 'shipped'].includes(order.order_status) ? 'Đang giao hàng' : 'Đang xử lý')) : 'Chưa rõ',
                        timeline: timeline
                    };

                    calculateSla(orderItem);
                    orderComplaints.push(orderItem);
                }
            });

            // K-02: SSOT - Không ghi đè trạng thái từ localStorage, tôn trọng dữ liệu CSDL Supabase
            try {
                localStorage.removeItem('pawpal_complaint_overrides');
            } catch (e) {}

            serviceComplaints.sort(sortComplaintsByUrgencyAndSla);
            orderComplaints.sort(sortComplaintsByUrgencyAndSla);

            PawpalComplaints.state.serviceComplaints = serviceComplaints;
            PawpalComplaints.state.orderComplaints = orderComplaints;

            if (!PawpalComplaints.state.currentActiveTicket || !serviceComplaints.concat(orderComplaints).some(x => x.id === PawpalComplaints.state.currentActiveTicket.id)) {
                PawpalComplaints.state.currentActiveTicket = serviceComplaints[0] || orderComplaints[0] || null;
            }

            PawpalComplaints.state.isLoaded = true;
            _complLastFetchedAt = Date.now();
            ['serviceFilterStaff','orderFilterStaff'].forEach(id=>{
                const select=document.getElementById(id);if(!select)return;
                const value=select.value;
                select.innerHTML='<option value="ALL">Tất cả</option><option value="Chưa phân công">Chưa phân công</option>'+staffList.filter(staff=>staff.full_name).map(staff=>`<option value="${escapeHtml(staff.full_name)}">${escapeHtml(staff.full_name)}</option>`).join('');
                if(Array.from(select.options).some(option=>option.value===value))select.value=value;
            });


            // Tự động kích hoạt render bảng dữ liệu và cập nhật KPIs
            updateComplaintsKpis();
            renderComplaintsAlertBar();
            PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
            PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();
            const currentSelectedTicketId = PawpalComplaints.state.currentTicketId || PawpalComplaints.state.currentActiveTicket?.id;
            if (location.hash === '#tab-complaint-detail' && currentSelectedTicketId && PawpalComplaints.subtabs.detail?.renderTicketDetail) {
                PawpalComplaints.subtabs.detail.renderTicketDetail(currentSelectedTicketId);
            }

            console.log(`[Complaints] Nạp thành công từ Supabase: ${serviceComplaints.length} khiếu nại dịch vụ, ${orderComplaints.length} khiếu nại đơn hàng.`);
        } catch (err) {
            if (requestSequence !== complaintsLoadSequence) return;
            PawpalComplaints.state.serviceComplaints = [];
            PawpalComplaints.state.orderComplaints = [];
            PawpalComplaints.state.currentActiveTicket = null;
            PawpalComplaints.state.isLoaded = false;
            _complLastFetchedAt = 0;
            PawpalComplaints.state.loadError = 'Không thể tải khiếu nại. Vui lòng tải lại trang.';
            updateComplaintsKpis();
            renderComplaintsAlertBar();
            PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
            PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();
            PawpalComplaints.subtabs.detail?.renderTicketDetail?.();
            console.error('[Complaints] Lỗi nạp dữ liệu từ Supabase:', err.message || String(err), err.code || '');
        }
    }
    PawpalComplaints.loadComplaintsModuleData = loadComplaintsModuleData;

    // Helper lazy-fetch tin nhắn khi mở 1 ticket cụ thể (PERF-03.K02)
    PawpalComplaints.fetchTicketMessages = async function(ticketId, { force = false } = {}) {
        if (!ticketId) return [];
        const client = getComplaintsDbClient();
        if (!client) return [];

        const fetchMessages = async () => {
            const { data, error } = await client
                .from('support_ticket_message')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        };

        try {
            const msgs = window.PawpalDataStore?.fetch
                ? await window.PawpalDataStore.fetch(`complaints:messages:${ticketId}`, fetchMessages, {
                    ttlMs: window.PawpalDataStore.TTL.OPERATIONAL,
                    force
                })
                : await fetchMessages();
            return msgs;
        } catch (err) {
            console.warn(`[Complaints] Lỗi nạp tin nhắn cho ticket ${ticketId}:`, err);
            return [];
        }
    };

    // Cập nhật KPIs & Badge
    function updateComplaintsKpis() {
        if (PawpalComplaints.state.loadError) {
            document.getElementById('subtab-tab-complaint-services')?.querySelectorAll('.kpi-val').forEach(el=>{el.textContent='—';});
            document.getElementById('subtab-tab-complaint-orders')?.querySelectorAll('.kpi-val').forEach(el=>{el.textContent='—';});
            return;
        }
        if (!PawpalComplaints.state.isLoaded) return;
        const { serviceComplaints, orderComplaints } = PawpalComplaints.state;
        serviceComplaints.forEach(calculateSla);
        orderComplaints.forEach(calculateSla);

        const sNew = serviceComplaints.filter(i => i.status === 'new').length;
        const sProc = serviceComplaints.filter(i => i.status === 'processing').length;
        const sWait = serviceComplaints.filter(i => i.status === 'waiting_customer').length;
        const sHigh = serviceComplaints.filter(i => ['high','khan_cap'].includes(i.priority) && i.status !== 'resolved' && i.status !== 'closed').length;
        const sOver = serviceComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed').length;

        const elSNew = document.getElementById('statServiceNew');
        const elSProc = document.getElementById('statServiceProcessing');
        const elSWait = document.getElementById('statServiceWaiting');
        const elSHigh = document.getElementById('statServiceHighPriority');
        const elSOver = document.getElementById('statServiceOverdue');

        if (elSNew) elSNew.textContent = sNew;
        if (elSProc) elSProc.textContent = sProc;
        if (elSWait) elSWait.textContent = sWait;
        if (elSHigh) elSHigh.textContent = sHigh;
        if (elSOver) elSOver.textContent = '—';

        const oNew = orderComplaints.filter(i => i.status === 'new').length;
        const oProc = orderComplaints.filter(i => i.status === 'processing').length;
        const oRma = orderComplaints.filter(i => i.issueType === 'return_request').length;
        const oWait = orderComplaints.filter(i => i.status === 'waiting_return').length;
        const oRef = orderComplaints.filter(i => i.status === 'refunding').length;
        const oOver = orderComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed').length;

        const elONew = document.getElementById('statOrderNew');
        const elOProc = document.getElementById('statOrderProcessing');
        const elORma = document.getElementById('statOrderRMA');
        const elOWait = document.getElementById('statOrderWaitingReturn');
        const elORef = document.getElementById('statOrderRefunding');
        const elOOver = document.getElementById('statOrderOverdue');

        if (elONew) elONew.textContent = oNew;
        if (elOProc) elOProc.textContent = oProc;
        if (elORma) elORma.textContent = oRma;
        if (elOWait) elOWait.textContent = oWait;
        if (elORef) elORef.textContent = oRef;
        if (elOOver) elOOver.textContent = '—';

        // Cập nhật huy hiệu số đếm đỏ trên Subtab Header
        const servicePendingCount = sNew + sProc + sWait;
        const orderPendingCount = oNew + oProc + oWait;

        const badgeService = document.getElementById('badgeServiceComplaintsCount');
        const badgeOrder = document.getElementById('badgeOrderComplaintsCount');

        if (badgeService) {
            if (servicePendingCount > 0) {
                badgeService.textContent = servicePendingCount;
                badgeService.style.display = 'inline-block';
            } else {
                badgeService.style.display = 'none';
            }
        }

        if (badgeOrder) {
            if (orderPendingCount > 0) {
                badgeOrder.textContent = orderPendingCount;
                badgeOrder.style.display = 'inline-block';
            } else {
                badgeOrder.style.display = 'none';
            }
        }
    }
    PawpalComplaints.updateComplaintsKpis = updateComplaintsKpis;

    // Render thanh cảnh báo vận hành
    function renderComplaintsAlertBar() {
        const { serviceComplaints, orderComplaints } = PawpalComplaints.state;

        // Alert Dịch vụ
        const serviceContainer = document.getElementById('serviceAlertItemsContainer');
        if (serviceContainer) {
            const alerts = [];
            const reprocessService = serviceComplaints.filter(i => i.status === 'reprocessing');
            if (reprocessService.length > 0) {
                alerts.push({
                    type: 'danger',
                    prefix: 'Cảnh báo',
                    main: 'Khách chấm < 3 sao (Xử lý lần 2)',
                    sub: '',
                    text: `Có ${reprocessService.length} khiếu nại khách hàng không hài lòng cần Quản lý can thiệp`,
                    filter: 'REPROCESSING'
                });
            }

            const waitMgrService = serviceComplaints.filter(i => i.status === 'waiting_manager_approval');
            if (waitMgrService.length > 0) {
                alerts.push({
                    type: 'warning',
                    prefix: `${waitMgrService.length} ca`,
                    main: 'Chờ quản lý duyệt bồi hoàn',
                    sub: '',
                    text: `${waitMgrService.length} khiếu nại dịch vụ chờ Quản lý phê duyệt ngân sách/tài sản`,
                    filter: 'WAITING_MANAGER'
                });
            }

            const overdueService = serviceComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed');
            if (overdueService.length > 0) {
                alerts.push({
                    type: 'danger',
                    prefix: `${overdueService.length} ca`,
                    main: 'Quá hạn SLA',
                    sub: '',
                    text: `${overdueService.length} khiếu nại dịch vụ quá hạn SLA`,
                    filter: 'OVERDUE'
                });
            }

            let html = alerts.map(a => `
                <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">
                    <span class="tag-highlight">${escapeHtml(a.prefix)}</span>
                    <span class="tag-main">${escapeHtml(a.main)}</span>
                    ${a.sub ? `<span class="tag-sub">${escapeHtml(a.sub)}</span>` : ''}
                </span>
            `).join('');

            if (alerts.length > 2) {
                html += `<span class="alert-dots-text">...</span>`;
            }
            serviceContainer.innerHTML = html || '<span style="font-size: 12px; color: var(--text-muted);">Không có cảnh báo khẩn cấp nào cho dịch vụ.</span>';
        }

        // Alert Đơn hàng
        const orderContainer = document.getElementById('orderAlertItemsContainer');
        if (orderContainer) {
            const alerts = [];
            const reprocessOrder = orderComplaints.filter(i => i.status === 'reprocessing');
            if (reprocessOrder.length > 0) {
                alerts.push({
                    type: 'danger',
                    prefix: 'Cảnh báo',
                    main: 'Khách chấm < 3 sao (Xử lý lần 2)',
                    sub: '',
                    text: `Có ${reprocessOrder.length} khiếu nại đơn hàng cần Quản lý gọi điện xử lý lần 2`,
                    filter: 'REPROCESSING'
                });
            }

            const waitMgrOrder = orderComplaints.filter(i => i.status === 'waiting_manager_approval');
            if (waitMgrOrder.length > 0) {
                alerts.push({
                    type: 'warning',
                    prefix: `${waitMgrOrder.length} ca`,
                    main: 'Chờ quản lý duyệt hoàn tiền/đổi trả',
                    sub: '',
                    text: `${waitMgrOrder.length} khiếu nại đơn hàng chờ Quản lý duyệt`,
                    filter: 'WAITING_MANAGER'
                });
            }

            const overdueOrder = orderComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed');
            if (overdueOrder.length > 0) {
                alerts.push({
                    type: 'danger',
                    prefix: `${overdueOrder.length} ca`,
                    main: 'Quá hạn SLA',
                    sub: '',
                    text: `${overdueOrder.length} khiếu nại đơn hàng quá hạn SLA`,
                    filter: 'OVERDUE'
                });
            }

            let html = alerts.map(a => `
                <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">
                    <span class="tag-highlight">${escapeHtml(a.prefix)}</span>
                    <span class="tag-main">${escapeHtml(a.main)}</span>
                    ${a.sub ? `<span class="tag-sub">${escapeHtml(a.sub)}</span>` : ''}
                </span>
            `).join('');

            if (alerts.length > 2) {
                html += `<span class="alert-dots-text">...</span>`;
            }
            orderContainer.innerHTML = html || '<span style="font-size: 12px; color: var(--text-muted);">Không có cảnh báo khẩn cấp nào cho đơn hàng.</span>';
        }
    }
    PawpalComplaints.renderComplaintsAlertBar = renderComplaintsAlertBar;

    // Breadcrumb
    function updateBreadcrumb(ticketCode) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (ticketCode) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${escapeHtml(ticketCode)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }
    PawpalComplaints.updateBreadcrumb = updateBreadcrumb;

    // Điều phối Subtab
    function switchSubtab(targetSubtab) {
        sessionStorage.setItem('pawpal_admin_active_module', 'Khiếu nại');
        const headerSubtabBtns = document.querySelectorAll('#headerSubtabsGroup .header-subtab-btn');
        headerSubtabBtns.forEach(btn => {
            if (btn.getAttribute('data-subtab') === targetSubtab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const moduleRoot = document.querySelector('.complaints-module') || document.getElementById('complaintsModuleWrapper') || document;
        const sections = moduleRoot.querySelectorAll('.subtab-content');
        sections.forEach(sec => {
            if (sec.id === `subtab-${targetSubtab}`) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        if (targetSubtab === 'tab-complaint-services') {
            PawpalComplaints.subtabs.services?.renderServiceComplaintsTable();
            updateBreadcrumb(null);
        } else if (targetSubtab === 'tab-complaint-orders') {
            PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable();
            updateBreadcrumb(null);
        } else if (targetSubtab === 'tab-complaint-detail') {
            const ticketId = PawpalComplaints.state.currentTicketId || PawpalComplaints.state.currentActiveTicket?.id || sessionStorage.getItem('pawpal_admin_complaint_selected_id') || null;
            PawpalComplaints.subtabs.detail?.renderTicketDetail(ticketId);
            const selected=[...PawpalComplaints.state.serviceComplaints,...PawpalComplaints.state.orderComplaints].find(t=>t.id===ticketId || t.rawId===ticketId);
            updateBreadcrumb(selected?.id || null);
        }

        sessionStorage.setItem('pawpal_admin_complaint_active_subtab', targetSubtab);
        try {
            history.replaceState(null, '', '#' + targetSubtab);
        } catch (e) {}

        renderComplaintsAlertBar();
        updateComplaintsKpis();
    }
    function openTicketDetail(ticketId) {
        if (!ticketId) return;
        PawpalComplaints.state.currentTicketId = ticketId;
        sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticketId);
        switchSubtab('tab-complaint-detail');
        if (PawpalComplaints.subtabs.detail?.renderTicketDetail) {
            PawpalComplaints.subtabs.detail.renderTicketDetail(ticketId);
        }
    }
    PawpalComplaints.openTicketDetail = openTicketDetail;


    // Supabase Realtime Subscription
    let complaintsRealtimeSubscription = null;
    function setupComplaintsRealtimeChannel() {
        const client = getComplaintsDbClient();
        if (!client || typeof client.channel !== 'function') return;

        try {
            if (complaintsRealtimeSubscription) {
                client.removeChannel(complaintsRealtimeSubscription);
                complaintsRealtimeSubscription = null;
                window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin_complaints_live_sync');
            }

            const triggerComplaintsSync = (invalidatePattern, refreshFn) => {
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Khiếu nại',
                        invalidatePattern: invalidatePattern || 'complaints:*',
                        onActiveRefresh: async () => {
                            await loadComplaintsModuleData({ force: true });
                            if (typeof refreshFn === 'function') {
                                refreshFn();
                            } else {
                                updateComplaintsKpis();
                                renderComplaintsAlertBar();
                                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable();
                                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable();
                                if (PawpalComplaints.state.currentTicketId) {
                                    PawpalComplaints.subtabs.detail?.renderTicketDetail(PawpalComplaints.state.currentTicketId);
                                }
                            }
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Khiếu nại') {
                    loadComplaintsModuleData({ force: true }).then(() => {
                        if (refreshFn) refreshFn();
                    });
                }
            };

            const channel = client.channel('admin_complaints_live_sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket' }, (payload) => {
                    triggerComplaintsSync('complaints:*', () => {
                        updateComplaintsKpis();
                        renderComplaintsAlertBar();
                        PawpalComplaints.subtabs.services?.renderServiceComplaintsTable();
                        PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable();
                        if (PawpalComplaints.state.currentTicketId) {
                            PawpalComplaints.subtabs.detail?.renderTicketDetail(PawpalComplaints.state.currentTicketId);
                        }
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_message' }, (payload) => {
                    // PERF-04.09: Bảo vệ thứ tự sự kiện - tin nhắn của ticket khác không làm nhảy UI ticket đang mở
                    const msgTicketId = payload.new?.ticket_id || payload.old?.ticket_id;
                    const isTargetingOpenTicket = msgTicketId && (PawpalComplaints.state.currentTicketId === msgTicketId);

                    triggerComplaintsSync(msgTicketId ? `complaints:messages:${msgTicketId}` : 'complaints:*', () => {
                        updateComplaintsKpis();
                        PawpalComplaints.subtabs.services?.renderServiceComplaintsTable();
                        PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable();
                        if (isTargetingOpenTicket && PawpalComplaints.state.currentTicketId) {
                            PawpalComplaints.subtabs.detail?.renderTicketDetail(PawpalComplaints.state.currentTicketId);
                        }
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'refund_transaction' }, () => triggerComplaintsSync('complaints:*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'return_request' }, () => triggerComplaintsSync('complaints:*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_record' }, () => triggerComplaintsSync('complaints:*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'care_log' }, () => triggerComplaintsSync('complaints:*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_message_attachment' }, () => triggerComplaintsSync('complaints:*'))
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Complaints Realtime] Đã kết nối kênh Realtime Channel cho Khiếu nại ✓');
                    }
                });

            complaintsRealtimeSubscription = channel;
            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin_complaints_live_sync');
        } catch (err) {
            console.warn('[Complaints Realtime] Lỗi thiết lập Realtime Channel:', err);
        }
    }

    let _isComplaintsInit = false;
    // Khởi tạo phân hệ
    async function initComplaintsModule() {
        const hasData = ((PawpalComplaints.state?.serviceComplaints?.length || 0) + (PawpalComplaints.state?.orderComplaints?.length || 0)) > 0;
        if (_isComplaintsInit && hasData) {
            updateComplaintsKpis();
            renderComplaintsAlertBar();
            PawpalComplaints.subtabs.services?.renderServiceComplaintsTable?.();
            PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable?.();
            return;
        }
        _isComplaintsInit = true;

        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        await loadComplaintsModuleData({ force: !hasData });
        setupComplaintsRealtimeChannel();
        updateComplaintsKpis();
        renderComplaintsAlertBar();

        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_complaint_active_subtab');
        const validTabs = ['tab-complaint-services', 'tab-complaint-orders', 'tab-complaint-detail'];
        let initialSubtab = validTabs.includes(currentHash) ? currentHash : (validTabs.includes(savedSubtab) ? savedSubtab : 'tab-complaint-services');

        switchSubtab(initialSubtab);

        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Khiếu nại' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId);
            }
        });

        // Khởi tạo các subtab con
        PawpalComplaints.subtabs.services?.init?.();
        PawpalComplaints.subtabs.orders?.init?.();
        PawpalComplaints.subtabs.detail?.init?.();

        // Khởi tạo sự kiện Modal 1: Tiếp nhận khiếu nại
        initCreateTicketModalEvents();

        // Gắn sự kiện nút mở modal tạo khiếu nại dịch vụ và đơn hàng
        const btnOpenServiceTicket = document.getElementById('btnOpenCreateServiceTicket');
        if (btnOpenServiceTicket) {
            btnOpenServiceTicket.addEventListener('click', () => openCreateTicketModal('service'));
        }

        const btnOpenOrderTicket = document.getElementById('btnOpenCreateOrderTicket');
        if (btnOpenOrderTicket) {
            btnOpenOrderTicket.addEventListener('click', () => openCreateTicketModal('order'));
        }

        // Tự động mở modal tiếp nhận khiếu nại nếu chuyển từ lịch hẹn Dịch vụ hoặc Đơn hàng
        const pendingBookingId = sessionStorage.getItem('pawpal_admin_complaint_from_booking');
        const pendingOrderId = sessionStorage.getItem('pawpal_admin_complaint_from_order');
        if (pendingBookingId) {
            setTimeout(() => {
                openCreateTicketModal('service', pendingBookingId);
            }, 300);
        } else if (pendingOrderId) {
            setTimeout(() => {
                openCreateTicketModal('order', pendingOrderId);
            }, 300);
        }

        // URL Auto-open v=modal1 hoặc modal=1 hoặc modal=create
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('v') === 'modal1' || urlParams.get('modal') === '1' || urlParams.get('modal') === 'create') {
            setTimeout(() => {
                openCreateTicketModal('service');
            }, 300);
        } else if (urlParams.get('v') === 'modal2' || urlParams.get('modal') === '2' || urlParams.get('modal') === 'resolve') {
            setTimeout(() => {
                switchSubtab('tab-complaint-detail');
                PawpalComplaints.subtabs.detail?.openResolveModal?.();
            }, 300);
        } else if (urlParams.get('v') === 'modal3' || urlParams.get('modal') === '3' || urlParams.get('modal') === 'assign') {
            setTimeout(() => {
                switchSubtab('tab-complaint-detail');
                openAssignHandlerModal();
            }, 350);
        } else if (urlParams.get('v') === 'modal4' || urlParams.get('modal') === '4' || urlParams.get('modal') === 'request') {
            setTimeout(() => {
                switchSubtab('tab-complaint-detail');
                openRequestMoreInfoModal();
            }, 350);
        } else if (urlParams.get('v') === 'modal5' || urlParams.get('modal') === '5' || urlParams.get('modal') === 'preview') {
            setTimeout(() => {
                switchSubtab('tab-complaint-detail');
                openImagePreviewModal();
            }, 350);
        }
    }

    // Modal 3 Orchestrator Helper
    function openAssignHandlerModal() {
        if (PawpalComplaints.subtabs.detail?.openAssignHandlerModal) {
            return PawpalComplaints.subtabs.detail.openAssignHandlerModal();
        }
        const modal = document.getElementById('assignHandlerModalOverlay');
        if (!modal) return;
        const selectStaff = document.getElementById('selectAssignStaff');
        if (selectStaff) {
            const staff = PawpalComplaints.state?.cachedStaff || [];
            selectStaff.innerHTML = staff.filter(s => s?.full_name)
                .map(s => `<option value="${escapeHtml(s.full_name)}">${escapeHtml(s.full_name)}</option>`).join('');
        }
        modal.classList.add('active');
    }
    PawpalComplaints.openAssignHandlerModal = openAssignHandlerModal;

    // Modal 4 Orchestrator Helper
    function openRequestMoreInfoModal() {
        if (PawpalComplaints.subtabs.detail?.openRequestMoreInfoModal) {
            return PawpalComplaints.subtabs.detail.openRequestMoreInfoModal();
        }
        const modal = document.getElementById('requestMoreInfoModalOverlay');
        if (!modal) return;
        const msgInput = document.getElementById('inputRequestMessage');
        if (msgInput) msgInput.value = '';
        modal.classList.add('active');
    }
    PawpalComplaints.openRequestMoreInfoModal = openRequestMoreInfoModal;

    // Modal 5 Orchestrator Helper
    function openImagePreviewModal(src, title, meta) {
        if (PawpalComplaints.subtabs.detail?.openImagePreviewModal) {
            return PawpalComplaints.subtabs.detail.openImagePreviewModal(src, title, meta);
        }
        const modal = document.getElementById('imagePreviewModalOverlay');
        if (!modal) return;
        if (!src || !/^https:\/\//i.test(src)) return;
        const imgEl = document.getElementById('imagePreviewImg');
        const titleEl = document.getElementById('imagePreviewTitle');
        const metaEl = document.getElementById('imagePreviewMeta');
        if (imgEl) imgEl.src = src;
        if (titleEl && title) titleEl.textContent = title;
        if (metaEl && meta) metaEl.textContent = meta;
        modal.classList.add('active');
    }
    PawpalComplaints.openImagePreviewModal = openImagePreviewModal;

    // ====================================================================
    // ====================================================================
    // MODAL 1: TIẾP NHẬN KHIẾU NẠI DỊCH VỤ / ĐƠN HÀNG (740px)
    // Custom Autocomplete Popover & Smart Entity Auto-Fill (AGENTS.md)
    // ====================================================================
    function openCreateTicketModal(type = 'service', presetRefId = null) {
        const modal = document.getElementById('createTicketModalOverlay');
        if (!modal) return;

        modal.dataset.requestId = crypto.randomUUID();
        if (document.getElementById('inputTicketRefSearch')) document.getElementById('inputTicketRefSearch').disabled = false;
        PawpalComplaints.state.currentTicketType = type;
        PawpalComplaints.state.selectedCustomerId = null;
        PawpalComplaints.state.selectedRefTransaction = null;

        const titleEl = document.getElementById('createTicketModalTitle');
        const labelRefIdEl = document.getElementById('labelTicketRefId');
        const searchRefInput = document.getElementById('inputTicketRefSearch');
        const selectRefIdEl = document.getElementById('selectTicketRefId');
        const phoneInput = document.getElementById('inputTicketCustomerPhone');
        const nameInput = document.getElementById('inputTicketCustomerName');
        const prioritySelect = document.getElementById('selectTicketPriority');
        const chkUnverified = document.getElementById('chkTicketUnverified');
        const titleInput = document.getElementById('inputTicketTitle');
        const contentInput = document.getElementById('inputTicketContent');
        const warningBox = document.getElementById('ticketDuplicateWarningBox');
        const previewsContainer = document.getElementById('createTicketPreviewsContainer');

        const custCard = document.getElementById('ticketCustomerSelectedCard');
        const refCard = document.getElementById('ticketRefSelectedCard');
        const custDropdown = document.getElementById('ticketCustomerDropdown');
        const nameDropdown = document.getElementById('ticketCustomerNameDropdown');
        const refDropdown = document.getElementById('ticketRefDropdown');

        if (custCard) custCard.style.display = 'none';
        if (refCard) refCard.style.display = 'none';
        if (custDropdown) custDropdown.style.display = 'none';
        if (nameDropdown) nameDropdown.style.display = 'none';
        if (refDropdown) refDropdown.style.display = 'none';

        // Reset errors
        document.querySelectorAll('#createTicketModalForm .field-error-text').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });

        if (titleEl) {
            titleEl.textContent = type === 'order' ? 'Tiếp nhận khiếu nại đơn hàng' : 'Tiếp nhận khiếu nại dịch vụ';
        }

        if (labelRefIdEl) {
            labelRefIdEl.innerHTML = type === 'order' 
                ? 'Chọn đơn hàng liên quan <span style="color: #DC2626;">*</span>' 
                : 'Chọn lịch hẹn liên quan <span style="color: #DC2626;">*</span>';
        }

        if (searchRefInput) {
            searchRefInput.value = '';
            searchRefInput.placeholder = type === 'order' ? 'Tìm mã đơn hàng hoặc tên sản phẩm...' : 'Tìm mã lịch hẹn hoặc tên dịch vụ...';
        }
        if (selectRefIdEl) selectRefIdEl.value = '';

        // Reset form values
        if (phoneInput) phoneInput.value = '';
        if (nameInput) nameInput.value = '';
        if (prioritySelect) prioritySelect.value = 'medium';
        if (chkUnverified) chkUnverified.checked = false;
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';
        if (warningBox) warningBox.style.display = 'none';
        if (previewsContainer) previewsContainer.innerHTML = '';

        // Tự động điền dữ liệu nếu có presetRefId từ phân hệ Dịch vụ hoặc Đơn hàng
        const targetRefId = presetRefId || (type === 'service' ? sessionStorage.getItem('pawpal_admin_complaint_from_booking') : sessionStorage.getItem('pawpal_admin_complaint_from_order'));
        if (targetRefId) {
            sessionStorage.removeItem('pawpal_admin_complaint_from_booking');
            sessionStorage.removeItem('pawpal_admin_complaint_from_order');
            if (type === 'service') {
                const appts = PawpalComplaints.state.cachedAppointments || [];
                const appt = appts.find(a => String(a.id) === String(targetRefId) || String(a.appointment_code) === String(targetRefId));
                if (appt) {
                    const code = appt.appointment_code || appt.id;
                    if (selectRefIdEl) selectRefIdEl.value = code;
                    if (searchRefInput) searchRefInput.value = code;
                    if (refCard) {
                        const refInfo = document.getElementById('ticketRefSelectedInfo');
                        if (refInfo) refInfo.textContent = `Đã chọn lịch hẹn: ${code} (${appt.service?.service_name || 'Dịch vụ'})`;
                        refCard.style.display = 'flex';
                    }

                    // Tự động tìm khách hàng tương ứng
                    const customers = PawpalComplaints.state.cachedCustomers || [];
                    const profiles = PawpalComplaints.state.cachedProfiles || [];
                    const pets = PawpalComplaints.state.cachedPets || [];
                    const cust = customers.find(c => String(c.id) === String(appt.customer_id));
                    const prof = profiles.find(p => String(p.customer_id) === String(appt.customer_id));
                    const pet = pets.find(p => String(p.id) === String(appt.pet_id));

                    const cName = prof?.full_name || cust?.full_name || appt.customer_name || '';
                    const cPhone = cust?.phone_main || cust?.phone || '';

                    if (nameInput && cName) nameInput.value = cName;
                    if (phoneInput && cPhone) phoneInput.value = cPhone;
                    if (custCard && cName) {
                        const custInfo = document.getElementById('ticketCustomerSelectedInfo');
                        if (custInfo) custInfo.textContent = `Đã chọn: ${cName} - ${cPhone}`;
                        custCard.style.display = 'flex';
                    }
                    if (cust?.id) PawpalComplaints.state.selectedCustomerId = cust.id;

                    const petName = pet?.pet_name || pet?.name || '';
                    const sName = appt.service?.service_name || 'Dịch vụ';
                    if (titleInput) {
                        titleInput.value = `[Khiếu nại ca dịch vụ] ${sName}${petName ? ' - ' + petName : ''}`;
                    }
                    if (prioritySelect) prioritySelect.value = 'high';
                }
            } else if (type === 'order') {
                const orders = PawpalComplaints.state.cachedOrders || [];
                const order = orders.find(o => String(o.id) === String(targetRefId) || String(o.order_code) === String(targetRefId));
                if (order) {
                    const code = order.order_code || order.id;
                    if (selectRefIdEl) selectRefIdEl.value = code;
                    if (searchRefInput) searchRefInput.value = code;
                    if (refCard) {
                        const refInfo = document.getElementById('ticketRefSelectedInfo');
                        const totalStr = order.total_amount ? Number(order.total_amount).toLocaleString('vi-VN') + ' đ' : '';
                        if (refInfo) refInfo.textContent = `Đã chọn đơn hàng: ${code} ${totalStr ? '(' + totalStr + ')' : ''}`;
                        refCard.style.display = 'flex';
                    }

                    // Tự động tìm khách hàng tương ứng
                    const customers = PawpalComplaints.state.cachedCustomers || [];
                    const profiles = PawpalComplaints.state.cachedProfiles || [];
                    const cust = customers.find(c => String(c.id) === String(order.customer_id));
                    const prof = profiles.find(p => String(p.customer_id) === String(order.customer_id));

                    const cName = prof?.full_name || cust?.full_name || order.customer_name || '';
                    const cPhone = cust?.phone_main || cust?.phone || order.phone || '';

                    if (nameInput && cName) nameInput.value = cName;
                    if (phoneInput && cPhone) phoneInput.value = cPhone;
                    if (custCard && cName) {
                        const custInfo = document.getElementById('ticketCustomerSelectedInfo');
                        if (custInfo) custInfo.textContent = `Đã chọn: ${cName} - ${cPhone}`;
                        custCard.style.display = 'flex';
                    }
                    if (cust?.id) PawpalComplaints.state.selectedCustomerId = cust.id;

                    if (titleInput) {
                        titleInput.value = `[Khiếu nại đơn hàng ${code}] Sai sản phẩm / Yêu cầu đổi trả`;
                    }
                    if (prioritySelect) prioritySelect.value = 'high';
                }
            }
        }

        modal.classList.add('active');
        if (targetRefId && contentInput) {
            contentInput.focus();
        } else if (phoneInput) {
            phoneInput.focus();
        }
    }
    PawpalComplaints.openCreateTicketModal = openCreateTicketModal;

    function initCreateTicketModalEvents() {
        const modal = document.getElementById('createTicketModalOverlay');
        if (!modal) return;

        const phoneInput = document.getElementById('inputTicketCustomerPhone');
        const nameInput = document.getElementById('inputTicketCustomerName');
        const searchRefInput = document.getElementById('inputTicketRefSearch');
        const selectRefId = document.getElementById('selectTicketRefId');

        const custDropdown = document.getElementById('ticketCustomerDropdown');
        const nameDropdown = document.getElementById('ticketCustomerNameDropdown');
        const refDropdown = document.getElementById('ticketRefDropdown');

        const custSelectedCard = document.getElementById('ticketCustomerSelectedCard');
        const custSelectedInfo = document.getElementById('ticketCustomerSelectedInfo');
        const btnClearCustomer = document.getElementById('btnClearTicketCustomer');

        const refSelectedCard = document.getElementById('ticketRefSelectedCard');
        const refSelectedInfo = document.getElementById('ticketRefSelectedInfo');
        const btnClearRef = document.getElementById('btnClearTicketRef');

        const chkUnverified = document.getElementById('chkTicketUnverified');
        const warningBox = document.getElementById('ticketDuplicateWarningBox');
        const warningCode = document.getElementById('ticketDuplicateWarningCode');

        // Close dropdowns helper
        function hideAllDropdowns() {
            if (custDropdown) custDropdown.style.display = 'none';
            if (nameDropdown) nameDropdown.style.display = 'none';
            if (refDropdown) refDropdown.style.display = 'none';
        }

        // Helper lấy danh sách khách hàng hợp nhất từ nhiều nguồn
        function getUnifiedCustomerList() {
            const state = PawpalComplaints.state;
            return state.cachedCustomers.map(c => ({ id: c.id,
                name: state.cachedProfiles.find(p => p.customer_id === c.id)?.full_name || c.id,
                phone: c.phone_main || '', email: c.email || '',
                petCount: state.cachedPets.filter(p => p.customer_id === c.id).length
            }));
        }

        function renderCustomerDropdown(targetDropdown, query, isPhoneSearch = false) {
            if (!targetDropdown) return;
            const q = (query || '').toLowerCase().trim();
            const customers = getUnifiedCustomerList();

            let matches = customers.filter(c => {
                if (!q) return true;
                const phone = (c.phone || '').toLowerCase();
                const name = (c.name || '').toLowerCase();
                const cleanQ = q.replace(/[^0-9a-z]/g, '');
                const cleanPhone = phone.replace(/[^0-9a-z]/g, '');

                if (isPhoneSearch) {
                    return cleanPhone.includes(cleanQ) || name.includes(q);
                }
                return name.includes(q) || cleanPhone.includes(cleanQ);
            }).slice(0, 8);

            if (matches.length === 0) {
                targetDropdown.innerHTML = `<div class="customer-autocomplete-empty">Không tìm thấy khách hàng phù hợp</div>`;
                targetDropdown.style.display = 'block';
                return;
            }

            targetDropdown.innerHTML = matches.map(c => {
                const name = escapeHtml(c.name);
                const phone = escapeHtml(c.phone);
                const petBadge = `${c.petCount} bé cưng`;
                return `
                    <div class="customer-autocomplete-item" data-cust-id="${c.id}" data-cust-name="${name}" data-cust-phone="${phone}">
                        <div class="customer-autocomplete-meta">
                            <div class="customer-autocomplete-name">${name}</div>
                            <div class="customer-autocomplete-phone">${phone}</div>
                        </div>
                        <span class="customer-autocomplete-badge">${petBadge}</span>
                    </div>
                `;
            }).join('');
            targetDropdown.style.display = 'block';

            // Bind click item
            targetDropdown.querySelectorAll('.customer-autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    const custId = item.dataset.custId;
                    const custName = item.dataset.custName;
                    const custPhone = item.dataset.custPhone;
                    selectCustomer({ id: custId, name: custName, phone: custPhone });
                });
            });
        }

        // Chọn khách hàng & tự động liên kết (Smart Entity Relations)
        function selectCustomer(cust, { keepRef = false } = {}) {
            PawpalComplaints.state.selectedCustomerId = cust.id;
            const name = cust.name || 'Khách hàng';
            const phone = cust.phone || '';

            if (phoneInput) phoneInput.value = phone;
            if (nameInput) nameInput.value = name;

            if (custSelectedCard && custSelectedInfo) {
                custSelectedInfo.textContent = `Đã chọn: ${name} (${phone})`;
                custSelectedCard.style.display = 'flex';
            }
            hideAllDropdowns();

            // Tự động nạp & hiển thị gợi ý giao dịch của chính khách hàng này
            if (searchRefInput && refDropdown) {
                if (!keepRef) clearRefTransaction();
                if (refDropdown) refDropdown.style.display = 'none';
            }
        }

        // Bỏ chọn khách hàng
        function clearCustomer() {
            PawpalComplaints.state.selectedCustomerId = null;
            if (phoneInput) phoneInput.value = '';
            if (nameInput) nameInput.value = '';
            if (custSelectedCard) custSelectedCard.style.display = 'none';
            hideAllDropdowns();
            if (searchRefInput) searchRefInput.value = '';
            if (selectRefId) selectRefId.value = '';
            if (refSelectedCard) refSelectedCard.style.display = 'none';
        }

        if (btnClearCustomer) {
            btnClearCustomer.addEventListener('click', (e) => {
                e.stopPropagation();
                clearCustomer();
            });
        }

        // Helper render Reference Transaction Dropdown (100% Flat Text-Only)
        function renderRefDropdown(query, filterCustomerId = null) {
            if (!refDropdown) return;
            const type = PawpalComplaints.state.currentTicketType || 'service';
            const q = (query || '').toLowerCase().trim();

            if (type === 'order') {
                let orders = PawpalComplaints.state.cachedOrders || [];
                let filtered = orders.filter(o => {
                    if (filterCustomerId && String(o.customer_id) !== String(filterCustomerId)) return false;
                    if (!q) return true;
                    const code = (o.order_code || o.id || '').toLowerCase();
                    const cName = (o.customer_name || '').toLowerCase();
                    return code.includes(q) || cName.includes(q);
                }).slice(0, 8);

                if (filtered.length === 0) {
                    refDropdown.innerHTML = `<div class="customer-autocomplete-empty">Không có đơn hàng nào phù hợp</div>`;
                    refDropdown.style.display = 'block';
                    return;
                }

                refDropdown.innerHTML = filtered.map(o => {
                    const code = escapeHtml(o.order_code || o.id);
                    const dateStr = o.created_at ? PawpalComplaints.formatDate(o.created_at) : '';
                    const amtStr = '';
                    const cName = escapeHtml(getUnifiedCustomerList().find(c => c.id === o.customer_id)?.name || 'Chưa có tên');
                    return `
                        <div class="customer-autocomplete-item" data-ref-id="${code}" data-cust-id="${o.customer_id || ''}" data-cust-name="${cName}">
                            <div class="customer-autocomplete-meta">
                                <div class="customer-autocomplete-name">[${code}] ${cName}</div>
                                <div class="customer-autocomplete-phone">Ngày tạo: ${dateStr}</div>
                            </div>
                            <span class="customer-autocomplete-badge">${amtStr}</span>
                        </div>
                    `;
                }).join('');
            } else {
                let appts = PawpalComplaints.state.cachedAppointments || [];
                let filtered = appts.filter(a => {
                    if (filterCustomerId && String(a.customer_id) !== String(filterCustomerId)) return false;
                    if (!q) return true;
                    const code = (a.appointment_code || a.id || '').toLowerCase();
                    const cName = (a.customer_name || '').toLowerCase();
                    const sName = (a.service?.service_name || a.service_type || a.service_name || '').toLowerCase();
                    return code.includes(q) || cName.includes(q) || sName.includes(q) || (q === 'apt' && (code.startsWith('app') || code.startsWith('bkg')));
                }).slice(0, 8);

                if (filtered.length === 0) {
                    refDropdown.innerHTML = `<div class="customer-autocomplete-empty">Không có lịch hẹn nào phù hợp</div>`;
                    refDropdown.style.display = 'block';
                    return;
                }

                refDropdown.innerHTML = filtered.map(a => {
                    const code = escapeHtml(a.appointment_code || a.id);
                    const sName = escapeHtml(a.service?.service_name || 'Chưa có tên dịch vụ');
                    const dateStr = a.appointment_date || '';
                    const cName = escapeHtml(getUnifiedCustomerList().find(c => c.id === a.customer_id)?.name || 'Chưa có tên');
                    return `
                        <div class="customer-autocomplete-item" data-ref-id="${code}" data-cust-id="${a.customer_id || ''}" data-cust-name="${cName}">
                            <div class="customer-autocomplete-meta">
                                <div class="customer-autocomplete-name">[${code}] ${cName}</div>
                                <div class="customer-autocomplete-phone">${sName} (${dateStr})</div>
                            </div>
                            <span class="customer-autocomplete-badge">${a.status === 'completed' ? 'Đã hoàn tất' : 'Lịch hẹn'}</span>
                        </div>
                    `;
                }).join('');
            }

            refDropdown.style.display = 'block';

            // Bind click item
            refDropdown.querySelectorAll('.customer-autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    const refId = item.dataset.refId;
                    const custId = item.dataset.custId;
                    const custName = item.dataset.custName;
                    selectRefTransaction(refId, custId, custName);
                });
            });
        }

        // Chọn giao dịch liên quan
        function selectRefTransaction(refId, custId, custName) {
            if (selectRefId) selectRefId.value = refId;
            if (searchRefInput) searchRefInput.value = refId;

            if (refSelectedCard && refSelectedInfo) {
                refSelectedInfo.textContent = `Đã chọn giao dịch: ${refId} (${custName})`;
                refSelectedCard.style.display = 'flex';
            }
            hideAllDropdowns();

            // Nếu chưa có khách hàng, tự động điền khách hàng từ giao dịch (Smart Entity Auto-fill Reverse)
            if (!PawpalComplaints.state.selectedCustomerId && custId) {
                const matchedCust = getUnifiedCustomerList().find(c => String(c.id) === String(custId));
                if (matchedCust) {
                    selectCustomer(matchedCust, { keepRef: true });
                } else if (nameInput && !nameInput.value) {
                    nameInput.value = custName;
                }
            }

            // Kiểm tra trùng lặp ticket (Duplicate ticket warning)
            if (warningBox) {
                const allTickets = (PawpalComplaints.state.serviceComplaints || []).concat(PawpalComplaints.state.orderComplaints || []);
                const duplicate = allTickets.find(t => (t.refId === refId || t.appointmentCode === refId || t.orderCode === refId) && t.status !== 'resolved' && t.status !== 'closed');
                if (duplicate) {
                    if (warningCode) warningCode.textContent = duplicate.id;
                    warningBox.style.display = 'block';
                } else {
                    warningBox.style.display = 'none';
                }
            }
        }

        // Bỏ chọn giao dịch
        function clearRefTransaction() {
            if (selectRefId) selectRefId.value = '';
            if (searchRefInput) searchRefInput.value = '';
            if (refSelectedCard) refSelectedCard.style.display = 'none';
            if (warningBox) warningBox.style.display = 'none';
            hideAllDropdowns();
        }

        if (btnClearRef) {
            btnClearRef.addEventListener('click', (e) => {
                e.stopPropagation();
                clearRefTransaction();
            });
        }

        // Event listeners cho các ô input
        if (phoneInput) {
            phoneInput.addEventListener('input', () => {
                PawpalComplaints.state.selectedCustomerId = null;
                if (custSelectedCard) custSelectedCard.style.display = 'none';
                clearRefTransaction();
                renderCustomerDropdown(custDropdown, phoneInput.value, true);
            });
            phoneInput.addEventListener('focus', () => {
                renderCustomerDropdown(custDropdown, phoneInput.value, true);
            });
        }

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                PawpalComplaints.state.selectedCustomerId = null;
                if (custSelectedCard) custSelectedCard.style.display = 'none';
                clearRefTransaction();
                renderCustomerDropdown(nameDropdown, nameInput.value, false);
            });
            nameInput.addEventListener('focus', () => {
                renderCustomerDropdown(nameDropdown, nameInput.value, false);
            });
        }

        if (searchRefInput) {
            searchRefInput.addEventListener('input', () => {
                if (selectRefId) selectRefId.value = '';
                if (refSelectedCard) refSelectedCard.style.display = 'none';
                renderRefDropdown(searchRefInput.value, PawpalComplaints.state.selectedCustomerId);
            });
            searchRefInput.addEventListener('focus', () => {
                renderRefDropdown(searchRefInput.value, PawpalComplaints.state.selectedCustomerId);
            });
        }

        // Chưa xác minh giao dịch toggle
        if (chkUnverified) {
            chkUnverified.addEventListener('change', () => {
                if (chkUnverified.checked) {
                    clearRefTransaction();
                    if (searchRefInput) {
                        searchRefInput.disabled = true;
                        searchRefInput.placeholder = 'Đã chọn: Chưa xác minh giao dịch (Tạo vé trước)';
                    }
                } else {
                    if (searchRefInput) {
                        searchRefInput.disabled = false;
                        searchRefInput.placeholder = PawpalComplaints.state.currentTicketType === 'order' ? 'Tìm mã đơn hàng hoặc tên sản phẩm...' : 'Tìm mã lịch hẹn hoặc tên dịch vụ...';
                    }
                }
            });
        }

        // Ẩn popover khi click ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.customer-autocomplete-wrapper')) {
                hideAllDropdowns();
            }
        });

        // Save Ticket button
        const btnSave = document.getElementById('btnSaveCreateTicket');
        if (btnSave && btnSave.dataset.createTicketBound !== 'true') {
            btnSave.dataset.createTicketBound = 'true';
            btnSave.addEventListener('click', async () => {
                const phone = (phoneInput?.value || '').trim();
                const name = (nameInput?.value || '').trim();
                const refId = selectRefId?.value || '';
                const isUnverified = chkUnverified?.checked;
                const title = (document.getElementById('inputTicketTitle')?.value || '').trim();
                const content = (document.getElementById('inputTicketContent')?.value || '').trim();
                const priority = document.getElementById('selectTicketPriority')?.value || 'medium';
                const type = PawpalComplaints.state.currentTicketType || 'service';

                let hasError = false;
                const errPhone = document.getElementById('errorTicketCustomerPhone');
                const errName = document.getElementById('errorTicketCustomerName');
                const errRef = document.getElementById('errorTicketRefId');

                if (!phone) {
                    if (errPhone) { errPhone.textContent = 'Vui lòng nhập số điện thoại khách hàng.'; errPhone.style.display = 'block'; }
                    hasError = true;
                } else if (!/^[0-9]{9,11}$/.test(phone)) {
                    if (errPhone) { errPhone.textContent = 'Số điện thoại không đúng định dạng.'; errPhone.style.display = 'block'; }
                    hasError = true;
                } else {
                    if (errPhone) errPhone.style.display = 'none';
                }

                if (!name) {
                    if (errName) { errName.textContent = 'Vui lòng nhập tên khách hàng.'; errName.style.display = 'block'; }
                    hasError = true;
                } else {
                    if (errName) errName.style.display = 'none';
                }

                if (!isUnverified && !refId) {
                    if (errRef) { 
                        errRef.textContent = `Vui lòng chọn ${type === 'order' ? 'đơn hàng' : 'lịch hẹn'} liên quan hoặc tích Chưa xác minh giao dịch.`;
                        errRef.style.display = 'block';
                    }
                    hasError = true;
                } else {
                    if (errRef) errRef.style.display = 'none';
                }

                if (!title) {
                    PawpalComplaints.showToast('Vui lòng nhập tiêu đề khiếu nại.', 'warning');
                    return;
                }
                if (!content) {
                    PawpalComplaints.showToast('Vui lòng nhập nội dung phản ánh chi tiết.', 'warning');
                    return;
                }
                if (hasError) return;

                let targetCustomerId = PawpalComplaints.state.selectedCustomerId || null;
                if (!targetCustomerId && phone) {
                    const foundCust = (PawpalComplaints.state.cachedCustomers || []).find(c => c.phone_main === phone || c.phone === phone);
                    if (foundCust) targetCustomerId = foundCust.id;
                }

                if (!targetCustomerId) {
                    if (errName) { errName.textContent = 'Vui lòng chọn khách hàng từ danh sách.'; errName.style.display = 'block'; }
                    return;
                }
                if (btnSave.disabled) return;
                const client = getComplaintsDbClient();
                if (!client) return;
                const refs = type === 'order' ? PawpalComplaints.state.cachedOrders : PawpalComplaints.state.cachedAppointments;
                const ref = !isUnverified && refs.find(r => r.id === refId || r.order_code === refId || r.appointment_code === refId);
                if (!isUnverified && (!ref || ref.customer_id !== targetCustomerId)) {
                    if (errRef) { errRef.textContent = 'Giao dịch không thuộc khách hàng đã chọn.'; errRef.style.display = 'block'; }
                    return;
                }
                btnSave.disabled = true;
                try {
                    const { error } = await client.rpc('create_admin_complaint', {
                        p_id: modal.dataset.requestId,
                        p_customer_id: targetCustomerId,
                        p_order_id: type === 'order' ? ref?.id || null : null,
                        p_appointment_id: type === 'service' ? ref?.id || null : null,
                        p_category: type, p_subject: title, p_content: content,
                        p_priority: priority === 'medium' ? 'normal' : priority
                    });
                    if (error) throw error;
                    modal.classList.remove('active');
                    await loadComplaintsModuleData({ force: true });
                    PawpalComplaints.showToast('Đã tạo khiếu nại.', 'success');
                } catch (error) {
                    PawpalComplaints.showToast('Không thể tạo khiếu nại: ' + error.message, 'error');
                } finally { btnSave.disabled = false; }

            });
        }

        // Close handlers: data-close-modal, backdrop click, Escape key
        document.querySelectorAll('[data-close-modal="createTicketModalOverlay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                modal.classList.remove('active');
            }
        });
    }

    PawpalComplaints.init = initComplaintsModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComplaintsModule);
    } else {
        initComplaintsModule();
    }
})();

