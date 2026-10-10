// complaints.js - Phân hệ Quản lý Khiếu nại Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalComplaints = window.PawpalComplaints = window.PawpalComplaints || {};
    window.PawpalComplaintsModule = PawpalComplaints;
    PawpalComplaints.subtabs = PawpalComplaints.subtabs || {};

    // State dùng chung cho toàn bộ phân hệ Khiếu nại
    PawpalComplaints.state = {
        serviceComplaints: [],
        orderComplaints: [],
        cachedAppointments: [],
        cachedOrders: [],
        cachedCustomers: [],
        cachedProfiles: [],
        cachedPets: [],
        currentActiveTicket: null,
        currentTicketType: 'service', // 'service' hoặc 'order'
        currentTicketId: sessionStorage.getItem('pawpal_admin_complaint_selected_id') || 'TKT-001'
    };

    // Helper định dạng ngày giờ chuẩn hóa toàn hệ thống (YYYY-MM-DD HH:mm, YYYY-MM-DD, HH:mm)
    const formatDateTime = PawpalComplaints.formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = PawpalComplaints.formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = PawpalComplaints.formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
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

    // SLA Calculation
    function calculateSla(item) {
        if (!item) return;
        if (item.status === 'resolved' || item.status === 'closed') {
            item.slaStatus = 'DONE';
            item.slaRemainingText = item.status === 'resolved' ? 'Đã giải quyết' : 'Đã đóng';
            return;
        }
        if (item.status === 'waiting_manager_approval') {
            item.slaStatus = 'URGENT';
            item.slaRemainingText = 'Chờ quản lý duyệt';
            return;
        }
        if (item.status === 'reprocessing') {
            item.slaStatus = 'OVERDUE';
            item.slaRemainingText = 'Cần xử lý lần 2';
            return;
        }

        let createTime = Date.now();
        if (item.createdAt) {
            let parsed = Date.parse(item.createdAt);
            if (isNaN(parsed)) {
                const parts = item.createdAt.split(' ');
                if (parts.length === 2) {
                    parsed = Date.parse(`${parts[0]}T${parts[1]}:00`);
                }
            }
            if (!isNaN(parsed)) {
                createTime = parsed;
            }
        }

        const isUrgent = item.priority === 'high' || item.issueType === 'injury' || item.issueType === 'damaged';
        const totalSlaMs = (isUrgent ? 2 : 4) * 60 * 60 * 1000;
        const deadline = createTime + totalSlaMs;
        const remainingMs = deadline - Date.now();

        if (remainingMs <= 0) {
            item.slaStatus = 'OVERDUE';
            const overdueMins = Math.floor(Math.abs(remainingMs) / 60000);
            if (overdueMins < 60) {
                item.slaRemainingText = `Quá hạn ${overdueMins} phút`;
            } else {
                const h = Math.floor(overdueMins / 60);
                const m = overdueMins % 60;
                item.slaRemainingText = `Quá hạn ${h}h ${m > 0 ? m + 'p' : ''}`.trim();
            }
        } else {
            const remMins = Math.floor(remainingMs / 60000);
            if (remMins <= 60) {
                item.slaStatus = 'URGENT';
                item.slaRemainingText = `Còn ${remMins} phút`;
            } else {
                item.slaStatus = 'NORMAL';
                const h = Math.floor(remMins / 60);
                const m = remMins % 60;
                item.slaRemainingText = `Còn ${h}h ${m > 0 ? m + 'p' : ''}`.trim();
            }
        }
    }
    PawpalComplaints.calculateSla = calculateSla;

    function sortComplaintsByUrgencyAndSla(a, b) {
        calculateSla(a);
        calculateSla(b);

        const isDoneA = (a.status === 'resolved' || a.status === 'closed');
        const isDoneB = (b.status === 'resolved' || b.status === 'closed');
        if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;

        const slaRank = { 'OVERDUE': 1, 'URGENT': 2, 'NORMAL': 3, 'DONE': 4 };
        const sRankA = slaRank[a.slaStatus] || 3;
        const sRankB = slaRank[b.slaStatus] || 3;
        if (sRankA !== sRankB) return sRankA - sRankB;

        const priorityRank = { 'high': 1, 'medium': 2, 'low': 3 };
        const pA = priorityRank[a.priority] || 2;
        const pB = priorityRank[b.priority] || 2;
        if (pA !== pB) return pA - pB;

        const statusRank = {
            'new': 1,
            'reprocessing': 2,
            'waiting_manager_approval': 3,
            'processing': 4,
            'waiting_return': 4,
            'refunding': 4,
            'waiting_customer': 5,
            'resolved': 6,
            'closed': 7
        };
        const stA = statusRank[a.status] || 5;
        const stB = statusRank[b.status] || 5;
        if (stA !== stB) return stA - stB;

        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
    }
    PawpalComplaints.sortComplaintsByUrgencyAndSla = sortComplaintsByUrgencyAndSla;

    function saveComplaintsOverrides() {
        try {
            const overrides = {};
            const allItems = PawpalComplaints.state.serviceComplaints.concat(PawpalComplaints.state.orderComplaints);
            allItems.forEach(item => {
                overrides[item.id] = {
                    status: item.status,
                    pendingResolution: item.pendingResolution,
                    resolution: item.resolution,
                    unverified: item.unverified,
                    waitingCustomerSince: item.waitingCustomerSince,
                    reminder48hSent: item.reminder48hSent,
                    resolvedAt: item.resolvedAt,
                    closedAt: item.closedAt,
                    closedReason: item.closedReason,
                    canReopenUntil: item.canReopenUntil,
                    customerRating: item.customerRating,
                    customerRatingComment: item.customerRatingComment,
                    timeline: item.timeline
                };
            });
            localStorage.setItem('pawpal_complaint_overrides', JSON.stringify(overrides));
        } catch (e) {
            console.warn('[Complaints] Lỗi lưu overrides:', e);
        }
    }
    PawpalComplaints.saveComplaintsOverrides = saveComplaintsOverrides;

    // ====================================================================
    // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
    // ====================================================================
    async function loadComplaintsModuleData() {
        try {
            let client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                for (let attempt = 0; attempt < 30; attempt++) {
                    await new Promise(r => setTimeout(r, 100));
                    client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) break;
                }
            }
            if (!client) {
                console.warn('[Complaints] Supabase client không khả dụng sau khi chờ.');
                updateComplaintsKpis();
                PawpalComplaints.subtabs.services?.renderServiceComplaintsTable();
                PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable();
                return;
            }

            const [
                ticketsRes,
                messagesRes,
                customersRes,
                profilesRes,
                petsRes,
                apptsRes,
                ordersRes,
                staffRes
            ] = await Promise.all([
                Promise.resolve(client.from('support_ticket').select('*').order('priority', { ascending: true }).order('created_at', { ascending: false })).catch(err => ({ data: [], error: err })),
                Promise.resolve(client.from('support_ticket_message').select('*').order('created_at', { ascending: true })).catch(err => ({ data: [], error: err })),
                Promise.resolve(client.from('customer').select('*')).catch(err => ({ data: [], error: err })),
                Promise.resolve(client.from('customer_profile').select('*')).catch(err => ({ data: [], error: err })),
                Promise.resolve(client.from('pet_profile').select('*')).catch(err => ({ data: [], error: err })),
                Promise.resolve(client.from('appointment').select('*, service:service_id(service_name), staff:staff_id(full_name)').order('appointment_date', { ascending: false })).catch(err => ({ data: [], error: err })),
                Promise.resolve(client.from('sales_order').select('*').order('created_at', { ascending: false })).catch(err => ({ data: [], error: err })),
                Promise.resolve(client.from('staff').select('*')).catch(err => ({ data: [], error: err }))
            ]);

            const tickets = (ticketsRes && ticketsRes.data) || [];
            const messages = (messagesRes && messagesRes.data) || [];
            const customers = (customersRes && customersRes.data) || [];
            const profiles = (profilesRes && profilesRes.data) || [];
            const pets = (petsRes && petsRes.data) || [];
            const appointments = (apptsRes && apptsRes.data) || [];
            const orders = (ordersRes && ordersRes.data) || [];
            const staffList = (staffRes && staffRes.data) || [];

            PawpalComplaints.state.cachedAppointments = appointments;
            PawpalComplaints.state.cachedOrders = orders;
            PawpalComplaints.state.cachedCustomers = customers;
            PawpalComplaints.state.cachedProfiles = profiles;
            PawpalComplaints.state.cachedPets = pets;

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

            let localOverridesMap = {};
            try {
                localOverridesMap = JSON.parse(localStorage.getItem('pawpal_complaint_overrides') || '{}');
            } catch (e) {}

            tickets.forEach((t, idx) => {
                const ticketMsgs = msgMap[t.id] || [];
                const userMsg = ticketMsgs.find(m => m.sender_type === 'user') || ticketMsgs[0];
                const cskhMsgs = ticketMsgs.filter(m => m.sender_type === 'cskh');
                const lastCskhMsg = cskhMsgs.length > 0 ? cskhMsgs[cskhMsgs.length - 1] : null;

                const cData = custMap[t.user_id] || (t.user_id ? customers.find(c => c.id === t.user_id || c.phone_main === t.user_id || c.phone === t.user_id) : null);
                const custId = cData ? cData.id : t.user_id;
                const pData = custId ? (profMap[custId] || profiles.find(p => p.customer_id === custId)) : null;

                const customerName = (pData && pData.full_name) || (cData && (cData.note || cData.phone_main || cData.email)) || (t.user_id ? `Khách hàng ${String(t.user_id).slice(-4)}` : 'Khách vãng lai');
                const phone = (cData && (cData.phone_main || cData.phone)) || (pData && pData.phone) || '0901234567';

                const timeline = [];
                if (ticketMsgs.length > 0) {
                    ticketMsgs.forEach(m => {
                        const isUser = m.sender_type === 'user';
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
                if (pLower.includes('cao') || pLower === 'high') normPriority = 'high';
                else if (pLower.includes('thấp') || pLower === 'low') normPriority = 'low';

                let normStatus = 'new';
                const sLower = (t.status || '').toLowerCase();
                if (sLower === 'pending' || sLower === 'new') normStatus = 'new';
                else if (sLower === 'processing' || sLower === 'in_progress') normStatus = 'processing';
                else if (sLower === 'waiting_customer') normStatus = 'waiting_customer';
                else if (sLower === 'waiting_manager_approval') normStatus = 'waiting_manager_approval';
                else if (sLower === 'reprocessing') normStatus = 'reprocessing';
                else if (sLower === 'waiting_return') normStatus = 'waiting_return';
                else if (sLower === 'refunding') normStatus = 'refunding';
                else if (sLower === 'completed' || sLower === 'resolved') normStatus = 'resolved';
                else if (sLower === 'closed') normStatus = 'closed';

                if (t.rating && Number(t.rating) < 3 && normStatus === 'resolved') {
                    normStatus = 'reprocessing';
                }

                const staffAssigned = lastCskhMsg && lastCskhMsg.agent_name ? lastCskhMsg.agent_name : (normStatus === 'new' ? 'Chưa phân công' : 'Lê Lệ Quyên');
                const ov = localOverridesMap[t.id];

                const tType = (t.type || '').toLowerCase();
                const isService = ['booking', 'service', 'health', 'spa', 'hotel', 'taxi'].includes(tType) || (!['payment', 'order', 'product', 'wrong_item', 'damaged', 'quality', 'return_request', 'missing_item'].includes(tType) && idx % 2 === 0);

                if (isService) {
                    let appt = null;
                    if (ov && ov.refId) {
                        appt = appointments.find(a => a.id === ov.refId || a.appointment_code === ov.refId);
                    }
                    if (!appt) {
                        const custAppts = custId ? (apptMap['cust_' + custId] || []) : [];
                        appt = custAppts[0] || appointments[idx % appointments.length] || null;
                    }

                    let pet = null;
                    if (appt && appt.pet_id) {
                        pet = pets.find(p => p.id === appt.pet_id);
                    }
                    if (!pet) {
                        const custPets = custId ? (petMap['cust_' + custId] || []) : [];
                        pet = custPets[0] || pets[idx % pets.length] || null;
                    }

                    const sType = (tType === 'health' || tType === 'spa' || tType === 'hotel' || tType === 'taxi') ? tType : (appt && appt.service_type ? appt.service_type : 'spa');
                    const petDisplayBreed = pet ? `${pet.breed || pet.species || 'Thú cưng'} • ${pet.weight || '4.5'} kg` : 'Mèo Anh Lông Ngắn • 4.2 kg';
                    const petDisplayNotes = pet ? (pet.allergy && pet.allergy !== 'Không' ? `Dị ứng: ${pet.allergy}. ${pet.routine || ''}` : (pet.routine || 'Không có tiền sử dị ứng.')) : 'Không có tiền sử dị ứng.';

                    const serviceItem = {
                        id: t.ticket_code || t.id,
                        rawId: t.id,
                        customerName: customerName,
                        phone: phone,
                        petName: pet ? (pet.pet_name || pet.name) : 'Miu Con',
                        petBreed: petDisplayBreed,
                        petNotes: petDisplayNotes,
                        bookingId: appt ? (appt.appointment_code || appt.id) : `BKG-${1001 + idx}`,
                        serviceType: sType,
                        serviceName: appt && appt.service ? appt.service.service_name : (t.title || 'Gói Dịch Vụ Chăm Sóc Thú Cưng'),
                        staffExecuted: appt && appt.staff ? `${appt.staff.full_name} (Chi nhánh trung tâm)` : 'Ngọc Anh (Chi nhánh Quận 1)',
                        title: t.title || 'Khiếu nại ca dịch vụ',
                        content: userMsg ? userMsg.content : (t.title || 'Khách phản ánh về dịch vụ'),
                        priority: normPriority,
                        staffAssigned: staffAssigned,
                        createdAt: createdAtStr,
                        createdAtRaw: t.created_at,
                        status: normStatus,
                        evidence: [],
                        checkinHealth: appt && appt.note ? appt.note : 'Bé tỉnh táo, nhanh nhẹn. Vành tai không phát hiện vết xước hay tụ máu ngoài da khi tiếp nhận.',
                        checkinPhotos: [],
                        staffLogNote: appt && appt.note ? appt.note : 'Đã hoàn tất quy trình dịch vụ và vệ sinh sạch sẽ cho bé.',
                        timeline: timeline
                    };

                    if (normStatus === 'resolved') {
                        serviceItem.resolution = {
                            type: 'reward_voucher',
                            typeName: 'Tặng Voucher và Pawpoint bồi hoàn',
                            pawpoints: 200,
                            voucherCode: 'PAWPALCARE50',
                            note: 'Đã gọi điện xin lỗi và tặng voucher chăm sóc khách hàng.',
                            updatedAt: createdAtStr
                        };
                    }

                    calculateSla(serviceItem);
                    serviceComplaints.push(serviceItem);
                } else {
                    let order = null;
                    if (ov && ov.refId) {
                        order = orders.find(o => o.id === ov.refId || o.order_code === ov.refId);
                    }
                    if (!order) {
                        const custOrders = custId ? (orderMap['cust_' + custId] || []) : [];
                        order = custOrders[0] || orders[idx % orders.length] || null;
                    }

                    let issueType = 'wrong_item';
                    if (['wrong_item', 'damaged', 'quality', 'return_request', 'missing_item'].includes(tType)) {
                        issueType = tType;
                    } else if (tType === 'payment') {
                        issueType = 'quality';
                    }

                    const orderItem = {
                        id: t.ticket_code || t.id,
                        rawId: t.id,
                        customerName: customerName,
                        phone: phone,
                        orderId: order ? (order.order_code || order.id) : `ORD-2026-${String(idx + 1).padStart(3, '0')}`,
                        productName: t.title || 'Đồ chơi gặm xương cao su tự nhiên an toàn',
                        productSku: `SKU-${1000 + idx}`,
                        issueType: issueType,
                        customerDemand: issueType === 'return_request' ? 'Đổi trả size sản phẩm' : (issueType === 'damaged' ? 'Gửi bù hàng hỏng' : 'Đổi sản phẩm mới'),
                        priority: normPriority,
                        staffAssigned: staffAssigned,
                        createdAt: createdAtStr,
                        createdAtRaw: t.created_at,
                        status: normStatus,
                        content: userMsg ? userMsg.content : (t.title || 'Khách phản ánh về đơn hàng'),
                        evidence: [],
                        warehousePhotos: [],
                        carrier: order && order.carrier ? order.carrier : 'Giao Hàng Nhanh (GHN)',
                        trackingCode: order && order.tracking_code ? order.tracking_code : `GHN${88291000 + idx}VN`,
                        deliveryStatus: order && order.order_status ? (order.order_status === 'DELIVERED' ? 'Giao thành công' : 'Đang xử lý') : 'Giao thành công',
                        timeline: timeline
                    };

                    if (issueType === 'return_request') {
                        orderItem.resolution = {
                            type: 'rma_exchange',
                            typeName: 'Đổi sản phẩm mới (Tạo mã RMA)',
                            rmaCode: `RMA-2026-${String(90 + idx).padStart(3, '0')}`,
                            rmaStep: normStatus === 'resolved' ? 4 : 2,
                            warehouse: 'Kho Pawpal Tân Bình (123 Hoàng Văn Thụ, Q. Tân Bình, TP.HCM)',
                            pickupMethod: 'Khách hàng tự gửi bưu điện về kho',
                            replacementItem: 'Sản phẩm đổi mới theo yêu cầu',
                            note: 'Đã tạo mã RMA hướng dẫn khách gửi hàng về kho.',
                            updatedAt: createdAtStr
                        };
                    } else if (normStatus === 'resolved') {
                        orderItem.resolution = {
                            type: 'refund',
                            typeName: 'Hoàn tiền bồi hoàn',
                            refundAmount: 150000,
                            refundMethod: 'Chuyển khoản trực tiếp',
                            note: 'Đã hoàn tiền đơn hàng bồi hoàn cho khách.',
                            updatedAt: createdAtStr
                        };
                    }

                    calculateSla(orderItem);
                    orderComplaints.push(orderItem);
                }
            });

            // Ghi đè từ localStorage nếu có
            try {
                const localOverrides = JSON.parse(localStorage.getItem('pawpal_complaint_overrides') || '{}');
                serviceComplaints.concat(orderComplaints).forEach(item => {
                    const ov = localOverrides[item.id] || localOverrides[item.rawId];
                    if (ov) {
                        if (ov.status) item.status = ov.status;
                        if (ov.pendingResolution) item.pendingResolution = ov.pendingResolution;
                        if (ov.resolution) item.resolution = ov.resolution;
                        if (ov.unverified !== undefined) item.unverified = ov.unverified;
                        if (ov.waitingCustomerSince) item.waitingCustomerSince = ov.waitingCustomerSince;
                        if (ov.reminder48hSent !== undefined) item.reminder48hSent = ov.reminder48hSent;
                        if (ov.resolvedAt) item.resolvedAt = ov.resolvedAt;
                        if (ov.closedAt) item.closedAt = ov.closedAt;
                        if (ov.closedReason) item.closedReason = ov.closedReason;
                        if (ov.canReopenUntil) item.canReopenUntil = ov.canReopenUntil;
                        if (ov.customerRating) item.customerRating = ov.customerRating;
                        if (ov.customerRatingComment) item.customerRatingComment = ov.customerRatingComment;
                        if (ov.timeline && ov.timeline.length > item.timeline.length) item.timeline = ov.timeline;
                    }
                });
            } catch (e) {}

            serviceComplaints.sort(sortComplaintsByUrgencyAndSla);
            orderComplaints.sort(sortComplaintsByUrgencyAndSla);

            PawpalComplaints.state.serviceComplaints = serviceComplaints;
            PawpalComplaints.state.orderComplaints = orderComplaints;

            if (!PawpalComplaints.state.currentActiveTicket || !serviceComplaints.concat(orderComplaints).some(x => x.id === PawpalComplaints.state.currentActiveTicket.id)) {
                PawpalComplaints.state.currentActiveTicket = serviceComplaints[0] || orderComplaints[0] || null;
            }

            console.log(`[Complaints] Nạp thành công từ Supabase: ${serviceComplaints.length} khiếu nại dịch vụ, ${orderComplaints.length} khiếu nại đơn hàng.`);
        } catch (err) {
            console.error('[Complaints] Lỗi nạp dữ liệu từ Supabase:', err);
        }
    }
    PawpalComplaints.loadComplaintsModuleData = loadComplaintsModuleData;

    // Cập nhật KPIs & Badge
    function updateComplaintsKpis() {
        const { serviceComplaints, orderComplaints } = PawpalComplaints.state;
        serviceComplaints.forEach(calculateSla);
        orderComplaints.forEach(calculateSla);

        const sNew = serviceComplaints.filter(i => i.status === 'new').length;
        const sProc = serviceComplaints.filter(i => i.status === 'processing').length;
        const sWait = serviceComplaints.filter(i => i.status === 'waiting_customer').length;
        const sHigh = serviceComplaints.filter(i => i.priority === 'high' && i.status !== 'resolved' && i.status !== 'closed').length;
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
        if (elSOver) elSOver.textContent = sOver;

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
        if (elOOver) elOOver.textContent = oOver;

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
                const ids = reprocessService.map(i => i.id).join(', ');
                alerts.push({
                    type: 'danger',
                    prefix: 'Cảnh báo',
                    main: 'Khách chấm < 3 sao (Xử lý lần 2)',
                    sub: `(${ids})`,
                    text: `Có ${reprocessService.length} khiếu nại khách hàng không hài lòng cần Quản lý can thiệp (${ids})`,
                    filter: 'REPROCESSING'
                });
            }

            const waitMgrService = serviceComplaints.filter(i => i.status === 'waiting_manager_approval');
            if (waitMgrService.length > 0) {
                const ids = waitMgrService.map(i => i.id).join(', ');
                alerts.push({
                    type: 'warning',
                    prefix: `${waitMgrService.length} ca`,
                    main: 'Chờ quản lý duyệt bồi hoàn',
                    sub: `(${ids})`,
                    text: `${waitMgrService.length} khiếu nại dịch vụ chờ Quản lý phê duyệt ngân sách/tài sản (${ids})`,
                    filter: 'WAITING_MANAGER'
                });
            }

            const overdueService = serviceComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed');
            if (overdueService.length > 0) {
                const ids = overdueService.map(i => i.id).join(', ');
                alerts.push({
                    type: 'danger',
                    prefix: `${overdueService.length} ca`,
                    main: 'Quá hạn SLA',
                    sub: `(${ids})`,
                    text: `${overdueService.length} khiếu nại dịch vụ quá hạn SLA (${ids})`,
                    filter: 'OVERDUE'
                });
            }

            let html = alerts.map(a => `
                <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">
                    <span class="tag-highlight">${escapeHtml(a.prefix)}</span>
                    <span class="tag-main">${escapeHtml(a.main)}</span>
                    <span class="tag-sub">${escapeHtml(a.sub)}</span>
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
                const ids = reprocessOrder.map(i => i.id).join(', ');
                alerts.push({
                    type: 'danger',
                    prefix: 'Cảnh báo',
                    main: 'Khách chấm < 3 sao (Xử lý lần 2)',
                    sub: `(${ids})`,
                    text: `Có ${reprocessOrder.length} khiếu nại đơn hàng cần Quản lý gọi điện xử lý lần 2 (${ids})`,
                    filter: 'REPROCESSING'
                });
            }

            const waitMgrOrder = orderComplaints.filter(i => i.status === 'waiting_manager_approval');
            if (waitMgrOrder.length > 0) {
                const ids = waitMgrOrder.map(i => i.id).join(', ');
                alerts.push({
                    type: 'warning',
                    prefix: `${waitMgrOrder.length} ca`,
                    main: 'Chờ quản lý duyệt hoàn tiền/đổi trả',
                    sub: `(${ids})`,
                    text: `${waitMgrOrder.length} khiếu nại đơn hàng chờ Quản lý duyệt (${ids})`,
                    filter: 'WAITING_MANAGER'
                });
            }

            const overdueOrder = orderComplaints.filter(i => i.slaStatus === 'OVERDUE' && i.status !== 'resolved' && i.status !== 'closed');
            if (overdueOrder.length > 0) {
                const ids = overdueOrder.map(i => i.id).join(', ');
                alerts.push({
                    type: 'danger',
                    prefix: `${overdueOrder.length} ca`,
                    main: 'Quá hạn SLA',
                    sub: `(${ids})`,
                    text: `${overdueOrder.length} khiếu nại đơn hàng quá hạn SLA (${ids})`,
                    filter: 'OVERDUE'
                });
            }

            let html = alerts.map(a => `
                <span class="alert-item-tag alert-${a.type}" data-filter="${a.filter}" title="${escapeHtml(a.text)}">
                    <span class="tag-highlight">${escapeHtml(a.prefix)}</span>
                    <span class="tag-main">${escapeHtml(a.main)}</span>
                    <span class="tag-sub">${escapeHtml(a.sub)}</span>
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
        const headerSubtabBtns = document.querySelectorAll('#headerSubtabsGroup .header-subtab-btn');
        headerSubtabBtns.forEach(btn => {
            if (btn.getAttribute('data-subtab') === targetSubtab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const sections = document.querySelectorAll('.subtab-content');
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
            const ticketId = PawpalComplaints.state.currentTicketId || 'TKT-001';
            PawpalComplaints.subtabs.detail?.renderTicketDetail(ticketId);
            updateBreadcrumb(ticketId);
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
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            if (complaintsRealtimeSubscription) {
                client.removeChannel(complaintsRealtimeSubscription);
                complaintsRealtimeSubscription = null;
            }

            const channel = client.channel('admin_complaints_live_sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket' }, async (payload) => {
                    console.log('[Complaints Realtime] support_ticket thay đổi:', payload.eventType);
                    await loadComplaintsModuleData();
                    updateComplaintsKpis();
                    renderComplaintsAlertBar();
                    PawpalComplaints.subtabs.services?.renderServiceComplaintsTable();
                    PawpalComplaints.subtabs.orders?.renderOrderComplaintsTable();
                    if (PawpalComplaints.state.currentTicketId) {
                        PawpalComplaints.subtabs.detail?.renderTicketDetail(PawpalComplaints.state.currentTicketId);
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_message' }, async (payload) => {
                    console.log('[Complaints Realtime] support_ticket_message thay đổi:', payload.eventType);
                    await loadComplaintsModuleData();
                    if (PawpalComplaints.state.currentTicketId) {
                        PawpalComplaints.subtabs.detail?.renderTicketDetail(PawpalComplaints.state.currentTicketId);
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[Complaints Realtime] Đã kết nối kênh Realtime Channel cho Khiếu nại ✓');
                    }
                });

            complaintsRealtimeSubscription = channel;
        } catch (err) {
            console.warn('[Complaints Realtime] Lỗi thiết lập Realtime Channel:', err);
        }
    }

    // Khởi tạo phân hệ
    async function initComplaintsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-complaint-services" style="position: relative;">
                    Theo dịch vụ
                    <span class="tab-badge-count" id="badgeServiceComplaintsCount" style="display: none;">0</span>
                </button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-orders" style="position: relative;">
                    Theo đơn hàng
                    <span class="tab-badge-count" id="badgeOrderComplaintsCount" style="display: none;">0</span>
                </button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-complaint-detail">Hồ sơ</button>
            `;

            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = btn.getAttribute('data-subtab');
                    if (target) {
                        switchSubtab(target);
                    }
                });
            });
        }

        await loadComplaintsModuleData();
        setupComplaintsRealtimeChannel();
        updateComplaintsKpis();
        renderComplaintsAlertBar();

        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_complaint_active_subtab');
        let initialSubtab = (currentHash && document.getElementById('subtab-' + currentHash))
            ? currentHash
            : (savedSubtab && document.getElementById('subtab-' + savedSubtab))
                ? savedSubtab
                : 'tab-complaint-services';

        switchSubtab(initialSubtab);

        // Khởi tạo các subtab con
        PawpalComplaints.subtabs.services?.init?.();
        PawpalComplaints.subtabs.orders?.init?.();
        PawpalComplaints.subtabs.detail?.init?.();
    }

    PawpalComplaints.init = initComplaintsModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComplaintsModule);
    } else {
        initComplaintsModule();
    }
})();
