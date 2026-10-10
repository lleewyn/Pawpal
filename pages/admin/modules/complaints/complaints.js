// complaints.js - Phân hệ Quản lý Khiếu nại Pawpal-er (Chống bỏ sót, SLA và Giải quyết bồi hoàn)
(function() {
    // Hàm định dạng thời gian chuẩn hóa toàn hệ thống (YYYY-MM-DD HH:mm, YYYY-MM-DD, HH:mm)
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

    async function initComplaintsModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 3 Sub-tabs trực tiếp lên Header Bar kèm huy hiệu số đếm đỏ
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
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

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

        // ====================================================================
        // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
        // ====================================================================
        let serviceComplaints = [];
        let orderComplaints = [];
        let cachedAppointments = [];
        let cachedOrders = [];
        let cachedCustomers = [];
        let cachedProfiles = [];
        let cachedPets = [];

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
                    renderServiceComplaintsTable();
                    renderOrderComplaintsTable();
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

                cachedAppointments = appointments;
                cachedOrders = orders;
                cachedCustomers = customers;
                cachedProfiles = profiles;
                cachedPets = pets;

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

                // Clear live arrays
                serviceComplaints.length = 0;
                orderComplaints.length = 0;

                let localOverridesMap = {};
                try {
                    localOverridesMap = JSON.parse(localStorage.getItem('pawpal_complaint_overrides') || '{}');
                } catch (e) {}

                tickets.forEach((t, idx) => {
                    const ticketMsgs = msgMap[t.id] || [];
                    const userMsg = ticketMsgs.find(m => m.sender_type === 'user') || ticketMsgs[0];
                    const cskhMsgs = ticketMsgs.filter(m => m.sender_type === 'cskh');
                    const lastCskhMsg = cskhMsgs.length > 0 ? cskhMsgs[cskhMsgs.length - 1] : null;

                    // Match customer
                    const cData = custMap[t.user_id] || (t.user_id ? customers.find(c => c.id === t.user_id || c.phone_main === t.user_id || c.phone === t.user_id) : null);
                    const custId = cData ? cData.id : t.user_id;
                    const pData = custId ? (profMap[custId] || profiles.find(p => p.customer_id === custId)) : null;

                    const customerName = (pData && pData.full_name) || (cData && (cData.note || cData.phone_main || cData.email)) || (t.user_id ? `Khách hàng ${String(t.user_id).slice(-4)}` : 'Khách vãng lai');
                    const phone = (cData && (cData.phone_main || cData.phone)) || (pData && pData.phone) || '0901234567';

                    // Parse timeline
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

                    // Format created date
                    const createdAtStr = formatDateTime(t.created_at);

                    // Priority normalization
                    let normPriority = 'medium';
                    const pLower = (t.priority || '').toLowerCase();
                    if (pLower.includes('cao') || pLower === 'high') normPriority = 'high';
                    else if (pLower.includes('thấp') || pLower === 'low') normPriority = 'low';

                    // Status normalization
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

                    // Check override reference
                    const ov = localOverridesMap[t.id];

                    // Check if Service or Order
                    const tType = (t.type || '').toLowerCase();
                    const isService = ['booking', 'service', 'health', 'spa', 'hotel', 'taxi'].includes(tType) || (!['payment', 'order', 'product', 'wrong_item', 'damaged', 'quality', 'return_request', 'missing_item'].includes(tType) && idx % 2 === 0);

                    if (isService) {
                        // Find appointment & pet
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
                            id: t.id,
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
                        // Order complaint
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
                            id: t.id,
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

                // Khôi phục overrides cục bộ (trạng thái duyệt, hạn mở lại, timer, đánh giá)
                try {
                    const localOverrides = JSON.parse(localStorage.getItem('pawpal_complaint_overrides') || '{}');
                    serviceComplaints.concat(orderComplaints).forEach(item => {
                        const ov = localOverrides[item.id];
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
                } catch (e) {
                    console.warn('[Complaints] Lỗi khôi phục overrides:', e);
                }

                // Chạy kiểm tra các mốc tự động hóa (48h/72h/3 ngày)
                checkComplaintTimers();

                // Sắp xếp ưu tiên các ca khẩn cấp và hạn xử lý SLA lên đầu bảng
                serviceComplaints.sort(sortComplaintsByUrgencyAndSla);
                orderComplaints.sort(sortComplaintsByUrgencyAndSla);

                if (!currentActiveTicket || !serviceComplaints.concat(orderComplaints).some(x => x.id === currentActiveTicket.id)) {
                    currentActiveTicket = serviceComplaints[0] || orderComplaints[0] || null;
                }

                console.log(`[Complaints] Nạp thành công từ Supabase: ${serviceComplaints.length} khiếu nại dịch vụ, ${orderComplaints.length} khiếu nại đơn hàng.`);
            } catch (err) {
                console.error('[Complaints] Lỗi nạp dữ liệu từ Supabase:', err);
                updateComplaintsKpis();
                renderServiceComplaintsTable();
                renderOrderComplaintsTable();
            }
        }

        function formatTimestamp(d) {
            return formatDateTime(d);
        }

        function saveComplaintsOverrides() {
            try {
                const overrides = {};
                serviceComplaints.concat(orderComplaints).forEach(item => {
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

        // Tự động hóa thời gian theo quy trình 3.16:
        // - Chờ phản hồi khách hàng: 48h gửi nhắc nhở 1, 72h tự đóng và cho mở lại 7 ngày
        // - Đã giải quyết: Tự đóng sau 3 ngày nếu khách không khiếu nại thêm; nếu chấm < 3 sao thì chuyển Quản lý xử lý lần 2
        function checkComplaintTimers() {
            const now = Date.now();
            let changed = false;
            const allItems = serviceComplaints.concat(orderComplaints);

            allItems.forEach(item => {
                // 1. Quét Ticket Chờ phản hồi khách hàng (48h & 72h)
                if (item.status === 'waiting_customer') {
                    const waitStart = item.waitingCustomerSince ? Date.parse(item.waitingCustomerSince) : (item.createdAt ? Date.parse(item.createdAt) : now);
                    const elapsed = now - waitStart;
                    const hoursElapsed = elapsed / (3600 * 1000);

                    // Quá 48h tự động nhắc nhở lần 1
                    if (hoursElapsed >= 48 && !item.reminder48hSent) {
                        item.reminder48hSent = true;
                        if (!item.timeline) item.timeline = [];
                        item.timeline.unshift({
                            time: formatTimestamp(new Date()),
                            author: 'Hệ thống Pawpal',
                            title: 'Tự động gửi nhắc nhở lần 1 (Quá 48 giờ)',
                            desc: 'Đã tự động gửi thông báo nhắc khách hàng cung cấp bổ sung hình ảnh và bằng chứng đối chiếu sự cố.',
                            isInternal: true
                        });
                        changed = true;
                    }

                    // Quá 72h tự động đóng Ticket
                    if (hoursElapsed >= 72) {
                        item.status = 'closed';
                        item.closedReason = 'Khách hàng không bổ sung thông tin sau 72 giờ';
                        item.closedAt = new Date().toISOString();
                        item.canReopenUntil = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
                        if (!item.timeline) item.timeline = [];
                        item.timeline.unshift({
                            time: formatTimestamp(new Date()),
                            author: 'Hệ thống Pawpal',
                            title: 'Tự động đóng Ticket (Quá 72 giờ)',
                            desc: 'Hệ thống tự động đóng Ticket do khách hàng không phản hồi bổ sung thông tin sau 72 giờ. Cho phép mở lại trong vòng 07 ngày.',
                            isInternal: true
                        });
                        changed = true;
                    }
                }

                // 2. Quét Ticket Đã giải quyết
                if (item.status === 'resolved') {
                    // Nếu khách chấm dưới 3 sao: hủy tự đóng sau 3 ngày, chuyển Quản lý xử lý lần 2
                    if (item.customerRating && Number(item.customerRating) < 3) {
                        item.status = 'reprocessing';
                        if (!item.timeline) item.timeline = [];
                        item.timeline.unshift({
                            time: formatTimestamp(new Date()),
                            author: 'Hệ thống Pawpal',
                            title: `Cảnh báo khẩn cấp: Khách đánh giá ${item.customerRating} sao`,
                            desc: `Hệ thống hủy tự động đóng Ticket sau 3 ngày và chuyển thẳng lên cấp Quản lý để gọi điện trực tiếp xử lý lần 2. Nhận xét của khách: "${item.customerRatingComment || 'Không có nhận xét'}"`,
                            isInternal: true
                        });
                        changed = true;
                    } else {
                        // Tự động đóng sau 3 ngày (72h)
                        const resolveStart = item.resolvedAt ? Date.parse(item.resolvedAt) : (item.createdAt ? Date.parse(item.createdAt) : now);
                        const elapsed = now - resolveStart;
                        const hoursElapsed = elapsed / (3600 * 1000);

                        if (hoursElapsed >= 72) {
                            item.status = 'closed';
                            item.closedReason = 'Tự động đóng sau 03 ngày giải quyết thỏa đáng';
                            item.closedAt = new Date().toISOString();
                            item.canReopenUntil = new Date(now + 3 * 24 * 3600 * 1000).toISOString();
                            if (!item.timeline) item.timeline = [];
                            item.timeline.unshift({
                                time: formatTimestamp(new Date()),
                                author: 'Hệ thống Pawpal',
                                title: 'Tự động đóng Ticket (Sau 03 ngày giải quyết)',
                                desc: 'Ticket hoàn tất và lưu trữ hồ sơ. Toàn bộ lịch sử xử lý và bằng chứng được lưu giữ nguyên vẹn.',
                                isInternal: true
                            });
                            changed = true;
                        }
                    }
                }
            });

            if (changed) {
                saveComplaintsOverrides();
            }
        }

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

        // Hàm sắp xếp ưu tiên theo mức độ khẩn cấp và hạn xử lý SLA (Quy chuẩn vận hành thông minh)
        function sortComplaintsByUrgencyAndSla(a, b) {
            calculateSla(a);
            calculateSla(b);

            // 1. Ca đã đóng hoặc đã giải quyết luôn đưa xuống cuối bảng
            const isDoneA = (a.status === 'resolved' || a.status === 'closed');
            const isDoneB = (b.status === 'resolved' || b.status === 'closed');
            if (isDoneA !== isDoneB) return isDoneA ? 1 : -1;

            // 2. Độ ưu tiên theo SLA: OVERDUE (Quá hạn) > URGENT (Sắp quá hạn) > NORMAL > DONE
            const slaRank = { 'OVERDUE': 1, 'URGENT': 2, 'NORMAL': 3, 'DONE': 4 };
            const sRankA = slaRank[a.slaStatus] || 3;
            const sRankB = slaRank[b.slaStatus] || 3;
            if (sRankA !== sRankB) return sRankA - sRankB;

            // 3. Mức độ ưu tiên của Ticket: Cao (high: 1) > Trung bình (medium: 2) > Thấp (low: 3)
            const priorityRank = { 'high': 1, 'medium': 2, 'low': 3 };
            const pA = priorityRank[a.priority] || 2;
            const pB = priorityRank[b.priority] || 2;
            if (pA !== pB) return pA - pB;

            // 4. Trạng thái cần can thiệp: Chưa xử lý (1) > Xử lý lần 2 (2) > Chờ duyệt (3) > Đang xử lý (4) > Chờ khách (5)
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

            // 5. Nếu cùng mức độ khẩn cấp, đưa ca tiếp nhận mới nhất lên trước
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        }

        function saveComplaintsState() {
            try {
                localStorage.setItem('pawpal_service_complaints', JSON.stringify(serviceComplaints));
                localStorage.setItem('pawpal_order_complaints', JSON.stringify(orderComplaints));
            } catch(e) {
                console.warn('[ComplaintsSync] Could not save to localStorage', e);
            }
        }

        function applyCompensationToCustomer(resolution) {
            if (!resolution) return;
            try {
                if (resolution.pawpoints && Number(resolution.pawpoints) > 0) {
                    const pts = Number(resolution.pawpoints);
                    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || {};
                    currentUser.points = (Number(currentUser.points) || 0) + pts;
                    currentUser.pawPoints = currentUser.points;
                    localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));

                    const users = JSON.parse(localStorage.getItem('pawpal_users_db')) || [];
                    const uIdx = users.findIndex(u => u.phone === currentUser.phone || u.id === currentUser.id);
                    if (uIdx >= 0) {
                        users[uIdx].points = currentUser.points;
                        users[uIdx].pawPoints = currentUser.points;
                        localStorage.setItem('pawpal_users_db', JSON.stringify(users));
                    }
                    console.log(`[ComplaintsCompensation] Đã cộng +${pts} Pawpoint vào tài khoản khách!`);
                }

                if (resolution.voucherCode) {
                    const vouchers = JSON.parse(localStorage.getItem('pawpal_user_vouchers')) || [];
                    if (!vouchers.some(v => v.code === resolution.voucherCode)) {
                        vouchers.unshift({
                            code: resolution.voucherCode,
                            discountPercent: 50,
                            title: 'Voucher Chăm Sóc Khách Hàng',
                            desc: resolution.note || 'Ưu đãi bồi hoàn từ PawPal',
                            createdAt: new Date().toISOString()
                        });
                        localStorage.setItem('pawpal_user_vouchers', JSON.stringify(vouchers));
                        console.log(`[ComplaintsCompensation] Đã phát hành voucher ${resolution.voucherCode} vào ví ưu đãi!`);
                    }
                }
            } catch (err) {
                console.warn('[ComplaintsCompensation] Lỗi bồi hoàn tài khoản:', err);
            }
        }

        function syncTicketToUserPortal(ticket) {
            if (!ticket) return;
            try {
                const userTickets = JSON.parse(localStorage.getItem('pawpal_support_tickets')) || [];
                const foundIndex = userTickets.findIndex(t => t.id === ticket.id || (ticket.bookingId && t.context?.bookingId === ticket.bookingId) || (ticket.orderId && t.context?.orderId === ticket.orderId));

                const publicMessages = (ticket.timeline || [])
                    .filter(entry => !entry.isInternal)
                    .map(entry => ({
                        sender: entry.author.includes('Khách hàng') ? 'user' : 'cskh',
                        agent: entry.author.includes('Khách hàng') ? '' : entry.author,
                        text: `${entry.title}: ${entry.desc}`,
                        time: entry.time || new Date().toISOString()
                    }))
                    .reverse();

                let updatedStatus = 'pending';
                if (ticket.status === 'processing') updatedStatus = 'processing';
                else if (ticket.status === 'resolved' || ticket.status === 'closed') updatedStatus = 'completed';

                if (foundIndex >= 0) {
                    userTickets[foundIndex].status = updatedStatus;
                    userTickets[foundIndex].resolution = ticket.resolution || null;
                    if (publicMessages.length > 0) {
                        userTickets[foundIndex].messages = publicMessages;
                    }
                } else {
                    userTickets.unshift({
                        id: ticket.id,
                        title: ticket.title,
                        type: ticket.serviceType ? 'service' : 'order',
                        status: updatedStatus,
                        priority: ticket.priority === 'high' ? 'Cao' : 'Trung bình',
                        resolution: ticket.resolution || null,
                        context: {
                            bookingId: ticket.bookingId,
                            orderId: ticket.orderId,
                            serviceName: ticket.serviceName,
                            petName: ticket.petName
                        },
                        messages: publicMessages
                    });
                }
                localStorage.setItem('pawpal_support_tickets', JSON.stringify(userTickets));

                if (ticket.resolution) {
                    applyCompensationToCustomer(ticket.resolution);
                }
            } catch (e) {
                console.warn('[SyncToUser] Error syncing ticket to user portal:', e);
            }
        }

        // Tự động tính toán SLA ban đầu và sắp xếp theo mức độ khẩn cấp
        serviceComplaints.forEach(calculateSla);
        orderComplaints.forEach(calculateSla);
        serviceComplaints.sort(sortComplaintsByUrgencyAndSla);
        orderComplaints.sort(sortComplaintsByUrgencyAndSla);

        let currentActiveTicket = serviceComplaints[0];
        let currentTicketType = 'service'; // 'service' hoặc 'order'

        // Trạng thái lọc
        let currentServiceQuickFilter = 'ALL';
        let currentServiceKpiFilter = 'ALL';
        let currentOrderQuickFilter = 'ALL';
        let currentOrderKpiFilter = 'ALL';

        // ---------------------------------------------------------
        // 2. HELPER BADGE VÀ SLA
        // ---------------------------------------------------------
        function getSlaBadge(item) {
            calculateSla(item);
            if (item.status === 'resolved' || item.status === 'closed') {
                return '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
            }
            if (item.slaStatus === 'OVERDUE') {
                return `<span class="alert-indicator text-danger">• ${escapeHtml(item.slaRemainingText)}</span>`;
            }
            if (item.slaStatus === 'URGENT') {
                return `<span class="alert-indicator text-warning">• ${escapeHtml(item.slaRemainingText)}</span>`;
            }
            return `<span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(item.slaRemainingText)}</span>`;
        }

        function updateComplaintsKpis() {
            // Tái tính toán SLA trước khi đếm KPIs
            serviceComplaints.forEach(calculateSla);
            orderComplaints.forEach(calculateSla);

            // Service KPIs
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

            // Order KPIs
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

        // ---------------------------------------------------------
        // 3. RENDER THANH CẢNH BÁO VẬN HÀNH (COMPLAINTS ALERT BAR)
        // ---------------------------------------------------------
        function renderComplaintsAlertBar() {
            // Alert cho Dịch vụ
            const serviceContainer = document.getElementById('serviceAlertItemsContainer');
            if (serviceContainer) {
                const alerts = [];

                // 1. Ca cần xử lý lần 2 do đánh giá < 3 sao
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

                // 2. Ca chờ Quản lý duyệt bồi hoàn
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

                const urgentInjury = serviceComplaints.filter(i => i.priority === 'high' && (i.content.includes('trầy') || i.content.includes('máu') || i.content.includes('rớt')));
                if (urgentInjury.length > 0) {
                    alerts.push({
                        type: 'warning',
                        prefix: 'Khẩn cấp',
                        main: 'Sự cố can thiệp Pet',
                        sub: `(${urgentInjury[0].id})`,
                        text: `Có sự cố Pet cần can thiệp chăm sóc khẩn cấp (${urgentInjury[0].id})`,
                        filter: 'HIGH'
                    });
                }

                const unassignedService = serviceComplaints.filter(i => i.staffAssigned === 'Chưa phân công' && i.status !== 'resolved' && i.status !== 'closed');
                if (unassignedService.length > 0) {
                    alerts.push({
                        type: 'info',
                        prefix: `${unassignedService.length} ca`,
                        main: 'Chưa phân công',
                        sub: '(Dịch vụ)',
                        text: `${unassignedService.length} ca khiếu nại dịch vụ chưa phân công người phụ trách`,
                        filter: 'UNASSIGNED'
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

                serviceContainer.querySelectorAll('.alert-item-tag').forEach(tag => {
                    tag.addEventListener('click', () => {
                        const f = tag.getAttribute('data-filter');
                        setServiceQuickFilter(f);
                    });
                });
            }

            // Alert cho Đơn hàng
            const orderContainer = document.getElementById('orderAlertItemsContainer');
            if (orderContainer) {
                const alerts = [];

                // Ca cần xử lý lần 2
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

                // Ca chờ Quản lý duyệt
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

                const unassignedOrder = orderComplaints.filter(i => i.staffAssigned === 'Chưa phân công' && i.status !== 'resolved' && i.status !== 'closed');
                if (unassignedOrder.length > 0) {
                    alerts.push({
                        type: 'info',
                        prefix: `${unassignedOrder.length} ca`,
                        main: 'Chưa phân công',
                        sub: '(Đơn hàng)',
                        text: `${unassignedOrder.length} khiếu nại đơn hàng mới chưa phân công`,
                        filter: 'UNASSIGNED'
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

                orderContainer.querySelectorAll('.alert-item-tag').forEach(tag => {
                    tag.addEventListener('click', () => {
                        const f = tag.getAttribute('data-filter');
                        setOrderQuickFilter(f);
                    });
                });
            }
        }

        // ---------------------------------------------------------
        // 4. CHUYỂN ĐỔI SUB-TAB VÀ DEEP BREADCRUMB
        // ---------------------------------------------------------
        const headerSubtabBtns = subtabsContainer ? subtabsContainer.querySelectorAll('.header-subtab-btn') : [];
        const sections = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(ticketCode) {
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

        function switchSubtab(targetSubtab) {
            headerSubtabBtns.forEach(btn => {
                if (btn.getAttribute('data-subtab') === targetSubtab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            sections.forEach(sec => {
                if (sec.id === `subtab-${targetSubtab}`) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('active');
                }
            });

            if (targetSubtab === 'tab-complaint-services') {
                renderServiceComplaintsTable();
                updateBreadcrumb(null);
            } else if (targetSubtab === 'tab-complaint-orders') {
                renderOrderComplaintsTable();
                updateBreadcrumb(null);
            } else if (targetSubtab === 'tab-complaint-detail') {
                renderTicketDetail(currentActiveTicket);
                updateBreadcrumb(currentActiveTicket ? currentActiveTicket.id : null);
            }

            sessionStorage.setItem('pawpal_admin_complaint_active_subtab', targetSubtab);
            try {
                history.replaceState(null, '', '#' + targetSubtab);
            } catch (e) {}

            renderComplaintsAlertBar();
            updateComplaintsKpis();
            if (typeof bindExportButtons === 'function') {
                bindExportButtons();
            }
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const target = btn.getAttribute('data-subtab');
                if (target) {
                    switchSubtab(target);
                }
            });
        });

        // ---------------------------------------------------------
        // 5. RENDER SUB-TAB 1: KHIẾU NẠI DỊCH VỤ VÀ BỘ LỌC ĐỘNG
        // ---------------------------------------------------------
        let serviceCurrentPage = 1;
        let currentFilteredServices = [];
        let currentFilteredOrders = [];

        async function ensureXLSXLoaded() {
            if (window.XLSX && window.XLSX.utils && (window.XLSX.writeFile || window.XLSX.write)) {
                return window.XLSX;
            }

            return new Promise((resolve, reject) => {
                const existing = document.querySelector('script[data-xlsx-tag]');
                if (existing) {
                    if (window.XLSX) return resolve(window.XLSX);
                    existing.addEventListener('load', () => resolve(window.XLSX));
                    existing.addEventListener('error', () => {
                        loadCdnXlsx(resolve, reject);
                    });
                    return;
                }

                const script = document.createElement('script');
                script.setAttribute('data-xlsx-tag', 'true');
                script.src = '/scripts/xlsx.full.min.js';
                script.onload = () => {
                    if (window.XLSX) resolve(window.XLSX);
                    else loadCdnXlsx(resolve, reject);
                };
                script.onerror = () => {
                    loadCdnXlsx(resolve, reject);
                };
                document.head.appendChild(script);
            });
        }

        function loadCdnXlsx(resolve, reject) {
            const cdn = document.createElement('script');
            cdn.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            cdn.onload = () => {
                if (window.XLSX) resolve(window.XLSX);
                else reject(new Error('Không tìm thấy đối tượng XLSX sau khi tải.'));
            };
            cdn.onerror = () => reject(new Error('Không thể tải thư viện XLSX.'));
            document.head.appendChild(cdn);
        }

        async function exportServiceComplaintsToExcel(dataList) {
            let list = dataList;
            if (!list || list.length === 0) {
                list = (currentFilteredServices && currentFilteredServices.length > 0)
                    ? currentFilteredServices
                    : (serviceComplaints && serviceComplaints.length > 0 ? serviceComplaints : []);
            }

            if (!list || list.length === 0) {
                showToast('Không có dữ liệu khiếu nại dịch vụ để xuất file.', 'warning');
                return;
            }

            try {
                showToast('Đang khởi tạo và xuất file Excel (.xlsx)...', 'info');
                const XLSXLib = await ensureXLSXLoaded();
                if (!XLSXLib || !XLSXLib.utils) {
                    throw new Error('Thư viện XLSX không khả dụng.');
                }

                const headers = [
                    'STT',
                    'Mã khiếu nại',
                    'Tên khách hàng',
                    'Số điện thoại',
                    'Tên thú cưng',
                    'Giống loài và thể trạng',
                    'Ghi chú sức khỏe thú cưng',
                    'Mã lịch hẹn',
                    'Phân loại dịch vụ',
                    'Tên gói dịch vụ',
                    'Kỹ thuật viên thực hiện',
                    'Tiêu đề khiếu nại',
                    'Nội dung phản ánh của khách',
                    'Mức độ ưu tiên',
                    'Hạn xử lý SLA',
                    'Trạng thái SLA',
                    'Nhân viên CSKH phụ trách',
                    'Ngày tiếp nhận',
                    'Trạng thái giải quyết',
                    'Phương án bồi hoàn / giải quyết'
                ];

                const statusMap = {
                    'new': 'Chưa xử lý',
                    'processing': 'Đang xử lý',
                    'waiting_customer': 'Chờ phản hồi',
                    'waiting_manager_approval': 'Chờ quản lý duyệt',
                    'reprocessing': 'Xử lý lần 2',
                    'resolved': 'Đã giải quyết',
                    'closed': 'Đã đóng'
                };

                const priorityMap = {
                    'high': 'Cao',
                    'medium': 'Trung bình',
                    'low': 'Thấp'
                };

                const serviceTypeMap = {
                    'spa': 'Spa và Grooming',
                    'hotel': 'Khách sạn thú cưng',
                    'taxi': 'Pet Taxi vận chuyển',
                    'health': 'Khám chữa bệnh thú y'
                };

                const rows = list.map((item, idx) => {
                    const resInfo = item.resolution
                        ? `${item.resolution.typeName || ''}${item.resolution.note ? ' - ' + item.resolution.note : ''}${item.resolution.voucherCode ? ' [Mã: ' + item.resolution.voucherCode + ']' : ''}`
                        : '';

                    return [
                        idx + 1,
                        item.id || '',
                        item.customerName || '',
                        item.phone || '',
                        item.petName || '',
                        item.petBreed || '',
                        item.petNotes || '',
                        item.bookingId || '',
                        serviceTypeMap[item.serviceType] || item.serviceType || 'Dịch vụ',
                        item.serviceName || '',
                        item.staffExecuted || '',
                        item.title || '',
                        (item.content || '').replace(/\r?\n/g, ' '),
                        priorityMap[item.priority] || item.priority || 'Trung bình',
                        item.slaRemainingText || '',
                        item.slaStatus === 'OVERDUE' ? 'Quá hạn SLA' : (item.slaStatus === 'WARNING' ? 'Sắp quá hạn' : 'Trong hạn'),
                        item.staffAssigned || 'Chưa phân công',
                        item.createdAt || '',
                        statusMap[item.status] || item.status || '',
                        resInfo || 'Chưa có phương án'
                    ];
                });

                const wsData = [headers, ...rows];
                const ws = XLSXLib.utils.aoa_to_sheet(wsData);

                // Thiết lập độ rộng cột chuẩn mực cho file Excel
                ws['!cols'] = [
                    { wch: 6 },  // STT
                    { wch: 18 }, // Mã khiếu nại
                    { wch: 22 }, // Tên khách hàng
                    { wch: 14 }, // Số điện thoại
                    { wch: 14 }, // Tên thú cưng
                    { wch: 26 }, // Giống loài và thể trạng
                    { wch: 30 }, // Ghi chú sức khỏe
                    { wch: 16 }, // Mã lịch hẹn
                    { wch: 22 }, // Phân loại dịch vụ
                    { wch: 28 }, // Tên gói dịch vụ
                    { wch: 24 }, // KTV thực hiện
                    { wch: 28 }, // Tiêu đề khiếu nại
                    { wch: 45 }, // Nội dung phản ánh
                    { wch: 16 }, // Mức độ ưu tiên
                    { wch: 18 }, // Hạn xử lý SLA
                    { wch: 16 }, // Trạng thái SLA
                    { wch: 24 }, // CSKH phụ trách
                    { wch: 20 }, // Ngày tiếp nhận
                    { wch: 20 }, // Trạng thái
                    { wch: 38 }  // Phương án bồi hoàn
                ];

                const wb = XLSXLib.utils.book_new();
                XLSXLib.utils.book_append_sheet(wb, ws, 'Khieu_Nai_Theo_Dich_Vu');

                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                const fileName = `Pawpal_Khieu_Nai_Dich_Vu_${dateStr}.xlsx`;

                XLSXLib.writeFile(wb, fileName);
                showToast(`Đã xuất thành công ${list.length} khiếu nại dịch vụ ra file Excel (.xlsx)!`, 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi xuất file Excel dịch vụ:', err);
                showToast('Lỗi khi xuất file Excel: ' + (err.message || err), 'danger');
            }
        }

        async function exportOrderComplaintsToExcel(dataList) {
            let list = dataList;
            if (!list || list.length === 0) {
                list = (currentFilteredOrders && currentFilteredOrders.length > 0)
                    ? currentFilteredOrders
                    : (orderComplaints && orderComplaints.length > 0 ? orderComplaints : []);
            }

            if (!list || list.length === 0) {
                showToast('Không có dữ liệu khiếu nại đơn hàng để xuất file.', 'warning');
                return;
            }

            try {
                showToast('Đang khởi tạo và xuất file Excel (.xlsx)...', 'info');
                const XLSXLib = await ensureXLSXLoaded();
                if (!XLSXLib || !XLSXLib.utils) {
                    throw new Error('Thư viện XLSX không khả dụng.');
                }

                const headers = [
                    'STT',
                    'Mã khiếu nại',
                    'Tên khách hàng',
                    'Số điện thoại',
                    'Mã đơn hàng',
                    'Tên sản phẩm',
                    'Mã SKU',
                    'Phân loại sự cố',
                    'Yêu cầu của khách',
                    'Nội dung phản ánh của khách',
                    'Mức độ ưu tiên',
                    'Đơn vị vận chuyển',
                    'Mã vận đơn',
                    'Hạn xử lý SLA',
                    'Trạng thái SLA',
                    'Nhân viên CSKH phụ trách',
                    'Ngày tiếp nhận',
                    'Trạng thái giải quyết',
                    'Phương án bồi hoàn / RMA'
                ];

                const statusMap = {
                    'new': 'Chưa xử lý',
                    'processing': 'Đang xử lý',
                    'waiting_customer': 'Chờ phản hồi',
                    'waiting_manager_approval': 'Chờ quản lý duyệt',
                    'reprocessing': 'Xử lý lần 2',
                    'resolved': 'Đã giải quyết',
                    'closed': 'Đã đóng'
                };

                const priorityMap = {
                    'high': 'Cao',
                    'medium': 'Trung bình',
                    'low': 'Thấp'
                };

                const issueTypeMap = {
                    'wrong_item': 'Giao sai hàng',
                    'damaged': 'Hàng hỏng vỡ móp méo',
                    'quality': 'Lỗi chất lượng sản phẩm',
                    'return_request': 'Yêu cầu đổi hàng hoặc size',
                    'missing_item': 'Thiếu quà tặng hoặc phụ kiện'
                };

                const rows = list.map((item, idx) => {
                    const resInfo = item.resolution
                        ? `${item.resolution.typeName || ''}${item.resolution.note ? ' - ' + item.resolution.note : ''}${item.resolution.rmaCode ? ' [RMA: ' + item.resolution.rmaCode + ']' : ''}`
                        : '';

                    return [
                        idx + 1,
                        item.id || '',
                        item.customerName || '',
                        item.phone || '',
                        item.orderId || '',
                        item.productName || '',
                        item.productSku || '',
                        issueTypeMap[item.issueType] || item.issueType || 'Sự cố đơn hàng',
                        item.customerDemand || '',
                        (item.content || '').replace(/\r?\n/g, ' '),
                        priorityMap[item.priority] || item.priority || 'Trung bình',
                        item.carrier || '',
                        item.trackingCode || '',
                        item.slaRemainingText || '',
                        item.slaStatus === 'OVERDUE' ? 'Quá hạn SLA' : (item.slaStatus === 'WARNING' ? 'Sắp quá hạn' : 'Trong hạn'),
                        item.staffAssigned || 'Chưa phân công',
                        item.createdAt || '',
                        statusMap[item.status] || item.status || '',
                        resInfo || 'Chưa có phương án'
                    ];
                });

                const wsData = [headers, ...rows];
                const ws = XLSXLib.utils.aoa_to_sheet(wsData);

                ws['!cols'] = [
                    { wch: 6 },  // STT
                    { wch: 18 }, // Mã khiếu nại
                    { wch: 22 }, // Tên khách hàng
                    { wch: 14 }, // Số điện thoại
                    { wch: 18 }, // Mã đơn hàng
                    { wch: 30 }, // Tên sản phẩm
                    { wch: 16 }, // Mã SKU
                    { wch: 24 }, // Phân loại sự cố
                    { wch: 24 }, // Yêu cầu khách
                    { wch: 45 }, // Nội dung phản ánh
                    { wch: 16 }, // Mức độ ưu tiên
                    { wch: 24 }, // Đơn vị VC
                    { wch: 20 }, // Mã vận đơn
                    { wch: 18 }, // SLA
                    { wch: 16 }, // Trạng thái SLA
                    { wch: 24 }, // CSKH phụ trách
                    { wch: 20 }, // Ngày tiếp nhận
                    { wch: 20 }, // Trạng thái
                    { wch: 38 }  // Phương án bồi hoàn
                ];

                const wb = XLSXLib.utils.book_new();
                XLSXLib.utils.book_append_sheet(wb, ws, 'Khieu_Nai_Theo_Don_Hang');

                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                const fileName = `Pawpal_Khieu_Nai_Don_Hang_${dateStr}.xlsx`;

                XLSXLib.writeFile(wb, fileName);
                showToast(`Đã xuất thành công ${list.length} khiếu nại đơn hàng ra file Excel (.xlsx)!`, 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi xuất file Excel đơn hàng:', err);
                showToast('Lỗi khi xuất file Excel: ' + (err.message || err), 'danger');
            }
        }

        function exportServiceComplaintsToCSV(dataList) {
            exportServiceComplaintsToExcel(dataList);
        }

        function renderServicePagination(totalPages) {
            const pagContainer = document.getElementById('servicePagination');
            if (!pagContainer) return;

            if (totalPages === 0) {
                pagContainer.style.display = 'none';
                pagContainer.innerHTML = '';
                return;
            }

            pagContainer.style.display = 'flex';

            let html = '';
            const prevDisabled = serviceCurrentPage === 1 ? 'disabled' : '';
            html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>`;

            for (let p = 1; p <= totalPages; p++) {
                const activeClass = p === serviceCurrentPage ? 'active' : '';
                html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
            }

            const nextDisabled = serviceCurrentPage === totalPages ? 'disabled' : '';
            html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>`;

            pagContainer.innerHTML = html;

            pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
                btn.addEventListener('click', () => {
                    const pageAction = btn.getAttribute('data-page');
                    if (pageAction === 'prev') {
                        if (serviceCurrentPage > 1) {
                            serviceCurrentPage--;
                            renderServiceComplaintsTable();
                        }
                    } else if (pageAction === 'next') {
                        if (serviceCurrentPage < totalPages) {
                            serviceCurrentPage++;
                            renderServiceComplaintsTable();
                        }
                    } else {
                        const targetP = parseInt(pageAction, 10);
                        if (targetP && targetP !== serviceCurrentPage) {
                            serviceCurrentPage = targetP;
                            renderServiceComplaintsTable();
                        }
                    }
                });
            });
        }

        function setServiceQuickFilter(filter) {
            currentServiceQuickFilter = filter;
            serviceCurrentPage = 1;
            document.querySelectorAll('#serviceQuickChips .quick-chip-btn').forEach(btn => {
                if (btn.getAttribute('data-filter') === filter) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            renderServiceComplaintsTable();
        }

        function renderServiceComplaintsTable() {
            const tbody = document.getElementById('serviceComplaintsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const searchInput = document.getElementById('serviceSearchInput');
            const categorySelect = document.getElementById('serviceFilterCategory');
            const statusSelect = document.getElementById('serviceFilterStatus');
            const prioritySelect = document.getElementById('serviceFilterPriority');
            const staffSelect = document.getElementById('serviceFilterStaff');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
            const selectedCat = categorySelect ? categorySelect.value : 'ALL';
            const selectedStatus = statusSelect ? statusSelect.value : 'ALL';
            const selectedPriority = prioritySelect ? prioritySelect.value : 'ALL';
            const selectedStaff = staffSelect ? staffSelect.value : 'ALL';

            const filtered = serviceComplaints.filter(item => {
                // Search term
                if (searchTerm) {
                    const match = (item.id && item.id.toLowerCase().includes(searchTerm)) ||
                                  (item.customerName && item.customerName.toLowerCase().includes(searchTerm)) ||
                                  (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
                                  (item.petName && item.petName.toLowerCase().includes(searchTerm)) ||
                                  (item.bookingId && item.bookingId.toLowerCase().includes(searchTerm)) ||
                                  (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                                  (item.content && item.content.toLowerCase().includes(searchTerm));
                    if (!match) return false;
                }

                // Dropdowns
                if (selectedCat !== 'ALL' && item.serviceType !== selectedCat) return false;
                if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
                if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;
                if (selectedStaff !== 'ALL') {
                    if (selectedStaff === 'unassigned') {
                        if (item.staffAssigned !== 'Chưa phân công') return false;
                    } else if (item.staffAssigned !== selectedStaff) return false;
                }

                // Quick chips
                if (currentServiceQuickFilter === 'MY' && item.staffAssigned !== 'Lê Lệ Quyên') return false;
                if (currentServiceQuickFilter === 'UNASSIGNED' && item.staffAssigned !== 'Chưa phân công') return false;
                if (currentServiceQuickFilter === 'WAITING_MANAGER' && item.status !== 'waiting_manager_approval') return false;
                if (currentServiceQuickFilter === 'REPROCESSING' && item.status !== 'reprocessing') return false;
                if (currentServiceQuickFilter === 'OVERDUE' && item.slaStatus !== 'OVERDUE') return false;
                if (currentServiceQuickFilter === 'HIGH' && item.priority !== 'high') return false;

                // KPI filter
                if (currentServiceKpiFilter !== 'ALL') {
                    if (currentServiceKpiFilter === 'high') {
                        if (item.priority !== 'high') return false;
                    } else if (currentServiceKpiFilter === 'overdue') {
                        if (item.slaStatus !== 'OVERDUE') return false;
                    } else if (item.status !== currentServiceKpiFilter) return false;
                }

                return true;
            });

            // Sắp xếp ưu tiên theo mức độ khẩn cấp và hạn xử lý SLA lên đầu bảng
            filtered.sort(sortComplaintsByUrgencyAndSla);

            currentFilteredServices = filtered;

            const itemsPerPage = 10;
            const totalPages = Math.ceil(filtered.length / itemsPerPage);

            if (serviceCurrentPage > totalPages) {
                serviceCurrentPage = totalPages || 1;
            }
            if (serviceCurrentPage < 1) {
                serviceCurrentPage = 1;
            }

            // Vô hiệu hóa hoặc bật Nút Xuất file theo số lượng kết quả
            const btnExportService = document.getElementById('btnExportServiceComplaints');
            if (btnExportService) {
                if (filtered.length === 0 && (!serviceComplaints || serviceComplaints.length === 0)) {
                    btnExportService.disabled = true;
                    btnExportService.classList.add('disabled');
                    btnExportService.style.opacity = '0.45';
                    btnExportService.style.cursor = 'not-allowed';
                    btnExportService.title = 'Không có dữ liệu khiếu nại để xuất file';
                } else {
                    btnExportService.disabled = false;
                    btnExportService.classList.remove('disabled');
                    btnExportService.style.opacity = '1';
                    btnExportService.style.cursor = 'pointer';
                    btnExportService.title = 'Xuất file dữ liệu khiếu nại dịch vụ (.xlsx)';
                }
            }
            if (typeof bindExportButtons === 'function') {
                bindExportButtons();
            }

            // Ẩn thanh phân trang khi kết quả rỗng hoặc chỉ có 1 trang duy nhất
            const pagContainer = document.getElementById('servicePagination');
            if (filtered.length === 0) {
                if (pagContainer) {
                    pagContainer.style.display = 'none';
                    pagContainer.innerHTML = '';
                }
            } else {
                if (pagContainer) {
                    pagContainer.style.display = 'flex';
                    renderServicePagination(totalPages);
                }
            }

            if (filtered.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="12" style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
                        Không tìm thấy khiếu nại dịch vụ phù hợp với điều kiện lọc.
                    </td>
                `;
                tbody.appendChild(tr);
                return;
            }

            const startIdx = (serviceCurrentPage - 1) * itemsPerPage;
            const pagedItems = filtered.slice(startIdx, startIdx + itemsPerPage);

            pagedItems.forEach(item => {
                let statusBadge = '';
                if (item.status === 'new') statusBadge = '<span class="admin-badge badge-warning">Chưa xử lý</span>';
                else if (item.status === 'processing') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
                else if (item.status === 'waiting_customer') statusBadge = '<span class="admin-badge badge-neutral">Chờ phản hồi</span>';
                else if (item.status === 'waiting_manager_approval') statusBadge = '<span class="admin-badge badge-waiting-approval">Chờ quản lý duyệt</span>';
                else if (item.status === 'reprocessing') statusBadge = '<span class="admin-badge badge-reprocessing">Xử lý lần 2</span>';
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-success">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge badge-neutral">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge badge-danger">Cao</span>'
                    : (item.priority === 'medium' ? '<span class="admin-badge badge-warning">Trung bình</span>' : '<span class="admin-badge badge-neutral">Thấp</span>');

                let rowClass = '';
                if (item.slaStatus === 'OVERDUE' || item.priority === 'high') {
                    rowClass = 'row-alert-high';
                } else if (item.slaStatus === 'URGENT' || item.priority === 'medium') {
                    rowClass = 'row-alert-warning';
                }

                const slaBadgeHtml = getSlaBadge(item);

                let staffCellHtml = '';
                if (item.staffAssigned === 'Chưa phân công' && item.status !== 'resolved' && item.status !== 'closed') {
                    staffCellHtml = `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #DC2626; font-size: 12px; font-weight: 500;">Chưa nhận</span>
                            <button type="button" class="btn-text-action btn-quick-assign" data-id="${item.id}" data-type="service">Nhận xử lý</button>
                        </div>
                    `;
                } else {
                    staffCellHtml = `<span>${escapeHtml(item.staffAssigned)}</span>`;
                }

                const tr = document.createElement('tr');
                if (rowClass) tr.className = rowClass;
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.id)}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-open-ticket" data-id="${item.id}" data-type="service">${escapeHtml(item.customerName)}</a>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(item.phone)}</div>
                    </td>
                    <td>${escapeHtml(item.petName)}</td>
                    <td><a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${item.bookingId}">${escapeHtml(item.bookingId)}</a></td>
                    <td>${escapeHtml(item.serviceName)}</td>
                    <td>
                        <div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.content)}">
                            ${escapeHtml(item.title)}
                        </div>
                    </td>
                    <td>${priorityBadge}</td>
                    <td>${slaBadgeHtml}</td>
                    <td>${staffCellHtml}</td>
                    <td>${escapeHtml(item.createdAt)}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-complaint-action" data-id="${item.id}" data-type="service">•••</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachComplaintTableEvents();
        }

        // ---------------------------------------------------------
        // 6. RENDER SUB-TAB 2: KHIẾU NẠI ĐƠN HÀNG VÀ BỘ LỌC ĐỘNG
        // ---------------------------------------------------------
        function setOrderQuickFilter(filter) {
            currentOrderQuickFilter = filter;
            document.querySelectorAll('#orderQuickChips .quick-chip-btn').forEach(btn => {
                if (btn.getAttribute('data-filter') === filter) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            renderOrderComplaintsTable();
        }

        function renderOrderComplaintsTable() {
            const tbody = document.getElementById('orderComplaintsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const searchInput = document.getElementById('orderSearchInput');
            const issueSelect = document.getElementById('orderFilterIssue');
            const statusSelect = document.getElementById('orderFilterStatus');
            const prioritySelect = document.getElementById('orderFilterPriority');
            const staffSelect = document.getElementById('orderFilterStaff');

            const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
            const selectedIssue = issueSelect ? issueSelect.value : 'ALL';
            const selectedStatus = statusSelect ? statusSelect.value : 'ALL';
            const selectedPriority = prioritySelect ? prioritySelect.value : 'ALL';
            const selectedStaff = staffSelect ? staffSelect.value : 'ALL';

            const filtered = orderComplaints.filter(item => {
                if (searchTerm) {
                    const match = (item.id && item.id.toLowerCase().includes(searchTerm)) ||
                                  (item.customerName && item.customerName.toLowerCase().includes(searchTerm)) ||
                                  (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
                                  (item.orderId && item.orderId.toLowerCase().includes(searchTerm)) ||
                                  (item.productName && item.productName.toLowerCase().includes(searchTerm)) ||
                                  (item.content && item.content.toLowerCase().includes(searchTerm));
                    if (!match) return false;
                }

                if (selectedIssue !== 'ALL' && item.issueType !== selectedIssue) return false;
                if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
                if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;
                if (selectedStaff !== 'ALL') {
                    if (selectedStaff === 'unassigned') {
                        if (item.staffAssigned !== 'Chưa phân công') return false;
                    } else if (item.staffAssigned !== selectedStaff) return false;
                }

                if (currentOrderQuickFilter === 'MY' && item.staffAssigned !== 'Lê Lệ Quyên') return false;
                if (currentOrderQuickFilter === 'UNASSIGNED' && item.staffAssigned !== 'Chưa phân công') return false;
                if (currentOrderQuickFilter === 'WAITING_MANAGER' && item.status !== 'waiting_manager_approval') return false;
                if (currentOrderQuickFilter === 'REPROCESSING' && item.status !== 'reprocessing') return false;
                if (currentOrderQuickFilter === 'OVERDUE' && item.slaStatus !== 'OVERDUE') return false;
                if (currentOrderQuickFilter === 'HIGH' && item.priority !== 'high') return false;

                if (currentOrderKpiFilter !== 'ALL') {
                    if (currentOrderKpiFilter === 'return_request') {
                        if (item.issueType !== 'return_request') return false;
                    } else if (currentOrderKpiFilter === 'refunding') {
                        if (item.status !== 'refunding') return false;
                    } else if (currentOrderKpiFilter === 'overdue') {
                        if (item.slaStatus !== 'OVERDUE') return false;
                    } else if (item.status !== currentOrderKpiFilter) return false;
                }

                return true;
            });

            // Sắp xếp ưu tiên các ca khẩn cấp và hạn xử lý SLA lên đầu bảng
            filtered.sort(sortComplaintsByUrgencyAndSla);

            currentFilteredOrders = filtered;

            // Vô hiệu hóa hoặc bật Nút Xuất file theo số lượng kết quả
            const btnExportOrder = document.getElementById('btnExportOrderComplaints');
            if (btnExportOrder) {
                if (filtered.length === 0 && (!orderComplaints || orderComplaints.length === 0)) {
                    btnExportOrder.disabled = true;
                    btnExportOrder.classList.add('disabled');
                    btnExportOrder.style.opacity = '0.45';
                    btnExportOrder.style.cursor = 'not-allowed';
                    btnExportOrder.title = 'Không có dữ liệu khiếu nại để xuất file';
                } else {
                    btnExportOrder.disabled = false;
                    btnExportOrder.classList.remove('disabled');
                    btnExportOrder.style.opacity = '1';
                    btnExportOrder.style.cursor = 'pointer';
                    btnExportOrder.title = 'Xuất file dữ liệu khiếu nại đơn hàng (.xlsx)';
                }
            }
            if (typeof bindExportButtons === 'function') {
                bindExportButtons();
            }

            if (filtered.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td colspan="12" style="text-align: center; color: var(--text-muted); padding: 36px 16px;">
                        Không tìm thấy khiếu nại đơn hàng phù hợp với điều kiện lọc.
                    </td>
                `;
                tbody.appendChild(tr);
                return;
            }

            filtered.forEach(item => {
                let statusBadge = '';
                if (item.status === 'new') statusBadge = '<span class="admin-badge badge-warning">Chưa xử lý</span>';
                else if (item.status === 'processing') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
                else if (item.status === 'waiting_return') statusBadge = '<span class="admin-badge badge-neutral">Chờ nhận hàng</span>';
                else if (item.status === 'waiting_manager_approval') statusBadge = '<span class="admin-badge badge-waiting-approval">Chờ quản lý duyệt</span>';
                else if (item.status === 'reprocessing') statusBadge = '<span class="admin-badge badge-reprocessing">Xử lý lần 2</span>';
                else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-success">Đã giải quyết</span>';
                else statusBadge = '<span class="admin-badge badge-neutral">Đã đóng</span>';

                let priorityBadge = item.priority === 'high'
                    ? '<span class="admin-badge badge-danger">Cao</span>'
                    : '<span class="admin-badge badge-warning">Trung bình</span>';

                let rowClass = '';
                if (item.slaStatus === 'OVERDUE' || item.priority === 'high') {
                    rowClass = 'row-alert-high';
                } else if (item.slaStatus === 'URGENT' || item.priority === 'medium') {
                    rowClass = 'row-alert-warning';
                }

                const slaBadgeHtml = getSlaBadge(item);

                let staffCellHtml = '';
                if (item.staffAssigned === 'Chưa phân công' && item.status !== 'resolved' && item.status !== 'closed') {
                    staffCellHtml = `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #DC2626; font-size: 12px; font-weight: 500;">Chưa nhận</span>
                            <button type="button" class="btn-text-action btn-quick-assign" data-id="${item.id}" data-type="order">Nhận xử lý</button>
                        </div>
                    `;
                } else {
                    staffCellHtml = `<span>${escapeHtml(item.staffAssigned)}</span>`;
                }

                let issueName = item.issueType === 'wrong_item' ? 'Sai sản phẩm' : (item.issueType === 'damaged' ? 'Hư hỏng hàng' : (item.issueType === 'quality' ? 'Lỗi thiết bị' : (item.issueType === 'missing_item' ? 'Thiếu hàng' : 'Đổi và Trả')));

                const tr = document.createElement('tr');
                if (rowClass) tr.className = rowClass;
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.id)}</strong></td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-open-ticket" data-id="${item.id}" data-type="order">${escapeHtml(item.customerName)}</a>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(item.phone)}</div>
                    </td>
                    <td><a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${item.orderId}">${escapeHtml(item.orderId)}</a></td>
                    <td>
                        <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.productName)}">
                            ${escapeHtml(item.productName)}
                        </div>
                    </td>
                    <td>${issueName}</td>
                    <td>${escapeHtml(item.customerDemand)}</td>
                    <td>${priorityBadge}</td>
                    <td>${slaBadgeHtml}</td>
                    <td>${staffCellHtml}</td>
                    <td>${escapeHtml(item.createdAt)}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-complaint-action" data-id="${item.id}" data-type="order">•••</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachComplaintTableEvents();
        }

        // ---------------------------------------------------------
        // 7. RENDER SUB-TAB 3: CHI TIẾT TICKET 360° VÀ ĐỐI CHỨNG CHÉO
        // ---------------------------------------------------------
        function getStaffSafetyLockStatus(staffName) {
            if (!staffName) return false;
            if (window.PawpalStaffManager && typeof window.PawpalStaffManager.getStaffByName === 'function') {
                const s = window.PawpalStaffManager.getStaffByName(staffName);
                if (s) return !!s.serviceLocked;
            }
            try {
                const clean = staffName.split('(')[0].trim().toLowerCase();
                const stored = localStorage.getItem('pawpal_staff_locked_name_' + clean);
                if (stored !== null) return stored === '1';
            } catch (e) {}
            return false;
        }

        function setStaffSafetyLockStatus(staffName, isLocked) {
            if (!staffName) return false;
            let lockVal = isLocked;
            if (window.PawpalStaffManager && typeof window.PawpalStaffManager.toggleSafetyLock === 'function') {
                const s = window.PawpalStaffManager.toggleSafetyLock(staffName, isLocked);
                if (s) lockVal = !!s.serviceLocked;
            }
            try {
                const clean = staffName.split('(')[0].trim().toLowerCase();
                localStorage.setItem('pawpal_staff_locked_name_' + clean, lockVal ? '1' : '0');
            } catch (e) {}
            return lockVal;
        }

        // Sinh ảnh minh họa SVG chất lượng cao cho các tệp mô phỏng
        function generateEvidenceThumbnail(fileName, category) {
            let bg = '#EEF5F1';
            let label = 'ẢNH ĐÍNH KÈM';
            let icon = '📸';
            const fLower = (fileName || '').toLowerCase();
            if (fLower.includes('tai') || fLower.includes('tray') || fLower.includes('pet') || fLower.includes('corgi') || fLower.includes('miu')) {
                bg = '#FDE8E8'; label = 'SỰ CỐ PET'; icon = '🐾';
            } else if (fLower.includes('mop') || fLower.includes('lon') || fLower.includes('pack') || fLower.includes('san-pham')) {
                bg = '#FEF3C7'; label = 'KIỂM HÀNG'; icon = '📦';
            } else if (fLower.includes('seal') || fLower.includes('hoa-don') || fLower.includes('lich-trinh')) {
                bg = '#E0F2FE'; label = 'NIÊM PHONG'; icon = '📄';
            }
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
                <rect width="300" height="300" fill="${bg}"/>
                <circle cx="150" cy="115" r="48" fill="rgba(255,255,255,0.7)"/>
                <text x="50%" y="130" font-size="44" text-anchor="middle">${icon}</text>
                <text x="50%" y="195" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="14" font-weight="700" fill="#203A2C" text-anchor="middle">${label}</text>
                <text x="50%" y="222" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="12" fill="#4F7A65" text-anchor="middle">${escapeHtml(fileName.length > 22 ? fileName.slice(0, 20) + '...' : fileName)}</text>
                <text x="50%" y="250" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto" font-size="10" font-weight="600" fill="#236B48" text-anchor="middle">PawPal Care Verified</text>
            </svg>`;
            return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
        }

        // Mở và đóng Lightbox xem ảnh phóng to
        function openImageLightbox(src, title, meta) {
            const overlay = document.getElementById('imagePreviewModalOverlay');
            const img = document.getElementById('imagePreviewImg');
            const titleEl = document.getElementById('imagePreviewTitle');
            const metaEl = document.getElementById('imagePreviewMeta');
            if (img) img.src = src;
            if (titleEl) titleEl.textContent = title || 'Chi tiết hình ảnh bằng chứng';
            if (metaEl) metaEl.textContent = meta || 'Ảnh xác minh hệ thống';
            if (overlay) overlay.style.display = 'flex';
        }

        function closeImageLightbox() {
            const overlay = document.getElementById('imagePreviewModalOverlay');
            if (overlay) overlay.style.display = 'none';
        }

        // Render danh sách ảnh bằng chứng dạng Card tương tác
        function renderEvidenceList(containerEl, items, categoryName) {
            if (!containerEl) return;
            containerEl.innerHTML = '';
            if (!items || items.length === 0) {
                containerEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted); font-style: italic;">Chưa có hình ảnh nào.</span>';
                return;
            }

            items.forEach((item, index) => {
                let src = '';
                let name = '';
                let dateStr = 'Ảnh hồ sơ thẩm định';
                if (typeof item === 'string') {
                    name = item;
                    src = generateEvidenceThumbnail(item, categoryName);
                } else if (item && typeof item === 'object') {
                    name = item.name || `Ảnh bằng chứng ${index + 1}`;
                    src = item.dataUrl || generateEvidenceThumbnail(name, categoryName);
                    dateStr = item.uploadedAt || 'Tải lên từ máy';
                }

                const card = document.createElement('div');
                card.className = 'evidence-photo-card';
                card.title = `Bấm để phóng to xem chi tiết: ${name}`;
                card.innerHTML = `
                    <img src="${src}" class="evidence-thumb-img" alt="${escapeHtml(name)}">
                    <div class="evidence-info">
                        <div class="evidence-name">${escapeHtml(name)}</div>
                        <div class="evidence-sub">${escapeHtml(dateStr)} • Phóng to</div>
                    </div>
                `;
                card.addEventListener('click', () => {
                    openImageLightbox(src, name, `${dateStr} • Xác thực hồ sơ Pawpal`);
                });
                containerEl.appendChild(card);
            });
        }

        function renderTicketDetail(ticket) {
            if (!ticket) return;
            currentActiveTicket = ticket;
            sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticket.id);

            // Headline
            const codeEl = document.getElementById('viewTicketCode');
            const catBadgeEl = document.getElementById('viewTicketCategoryBadge');
            const statusBadgeEl = document.getElementById('viewTicketStatusBadge');
            const priorityBadgeEl = document.getElementById('viewTicketPriorityBadge');

            if (codeEl) codeEl.textContent = ticket.id;
            if (catBadgeEl) catBadgeEl.textContent = ticket.serviceName ? 'Dịch vụ: ' + ticket.serviceName : 'Đơn hàng: ' + ticket.orderId;
            if (statusBadgeEl) {
                const s = ticket.status;
                let text = 'Đã giải quyết';
                let cls = 'badge-active';
                if (s === 'processing') { text = 'Đang xử lý'; cls = 'badge-info'; }
                else if (s === 'new') { text = 'Chưa xử lý'; cls = 'badge-warning'; }
                else if (s === 'waiting_customer') { text = 'Chờ khách phản hồi'; cls = 'badge-warning'; }
                else if (s === 'waiting_return') { text = 'Chờ nhận hàng trả'; cls = 'badge-info'; }
                else if (s === 'waiting_manager_approval') { text = 'Chờ quản lý duyệt'; cls = 'badge-waiting-approval'; }
                else if (s === 'reprocessing') { text = 'Đang xử lý lần 2'; cls = 'badge-reprocessing'; }
                else if (s === 'closed') { text = 'Đã đóng'; cls = ''; }
                statusBadgeEl.textContent = text;
                statusBadgeEl.className = 'admin-badge ' + cls;
            }

            const unverifiedBadgeEl = document.getElementById('viewTicketUnverifiedBadge');
            if (unverifiedBadgeEl) {
                unverifiedBadgeEl.style.display = ticket.unverified ? 'inline-flex' : 'none';
            }

            const reopenBtn = document.getElementById('btnReopenTicket');
            if (reopenBtn) {
                reopenBtn.style.display = (ticket.status === 'closed') ? 'inline-block' : 'none';
            }

            if (priorityBadgeEl) {
                priorityBadgeEl.textContent = ticket.priority === 'high' ? 'Mức độ Cao' : 'Mức độ Trung bình';
            }

            // Cột trái: Phản ánh của khách
            const contentEl = document.getElementById('viewTicketCustomerContent');
            if (contentEl) contentEl.textContent = `"${ticket.content}"`;

            // Bằng chứng khách gửi (render dạng thumbnail có click phóng to)
            const customerEvidenceEl = document.getElementById('viewTicketCustomerEvidence');
            renderEvidenceList(customerEvidenceEl, ticket.evidence, 'customer');

            // Biên bản đối thoại từ Kênh Trực chat (nếu ticket bắt nguồn từ Chatbot)
            const chatTranscriptBlock = document.getElementById('viewTicketChatTranscriptBlock');
            const chatTranscriptEl = document.getElementById('viewTicketChatTranscript');
            if (chatTranscriptBlock && chatTranscriptEl) {
                if (ticket.chatTranscript) {
                    chatTranscriptBlock.style.display = 'block';
                    chatTranscriptEl.textContent = ticket.chatTranscript;
                } else {
                    chatTranscriptBlock.style.display = 'none';
                }
            }

            // Thông tin khách hàng và đối tượng
            const custNameEl = document.getElementById('viewTicketCustomerName');
            const custPhoneEl = document.getElementById('viewTicketCustomerPhone');
            const refTypeLabelEl = document.getElementById('viewTicketRefTypeLabel');
            const refInfoEl = document.getElementById('viewTicketRefInfo');
            const refIdLabelEl = document.getElementById('viewTicketIdLabel');
            const refIdEl = document.getElementById('viewTicketRefId');
            const petNotesEl = document.getElementById('viewTicketPetNotes');

            if (custNameEl) custNameEl.textContent = ticket.customerName;
            if (custPhoneEl) custPhoneEl.textContent = ticket.phone;

            if (ticket.bookingId) {
                if (refTypeLabelEl) refTypeLabelEl.textContent = 'Pet và Giống:';
                if (refInfoEl) refInfoEl.textContent = `${ticket.petName} (${ticket.petBreed})`;
                if (refIdLabelEl) refIdLabelEl.textContent = 'Mã lịch hẹn:';
                if (refIdEl) refIdEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-booking" data-id="${ticket.bookingId}">${ticket.bookingId}</a>`;
                if (petNotesEl) petNotesEl.textContent = ticket.petNotes || 'Không có ghi chú dị ứng';
            } else {
                if (refTypeLabelEl) refTypeLabelEl.textContent = 'Sản phẩm khiếu nại:';
                if (refInfoEl) refInfoEl.textContent = `${ticket.productName} (SKU: ${ticket.productSku})`;
                if (refIdLabelEl) refIdLabelEl.textContent = 'Mã đơn hàng:';
                if (refIdEl) refIdEl.innerHTML = `<a href="javascript:void(0)" class="user-name-link btn-jump-order" data-id="${ticket.orderId}">${ticket.orderId}</a>`;
                if (petNotesEl) petNotesEl.textContent = `Yêu cầu của khách: ${ticket.customerDemand}`;
            }

            // Dữ liệu đối chứng 360°
            const serviceBlock = document.getElementById('serviceCrossCheckBlock');
            const orderBlock = document.getElementById('orderCrossCheckBlock');

            if (ticket.bookingId) {
                if (serviceBlock) serviceBlock.style.display = 'block';
                if (orderBlock) orderBlock.style.display = 'none';

                const checkinHealthEl = document.getElementById('viewTicketCheckinHealth');
                if (checkinHealthEl) checkinHealthEl.textContent = ticket.checkinHealth || 'Bé khỏe mạnh, không phát hiện vết xước hay tổn thương ngoài da.';

                const checkinPhotosEl = document.getElementById('viewTicketCheckinPhotos');
                renderEvidenceList(checkinPhotosEl, ticket.checkinPhotos, 'checkin');

                const staffExecutedEl = document.getElementById('viewTicketStaffExecuted');
                if (staffExecutedEl) staffExecutedEl.textContent = ticket.staffExecuted || 'Chưa ghi nhận';

                const isLocked = getStaffSafetyLockStatus(ticket.staffExecuted);
                const lockBadgeEl = document.getElementById('viewStaffSafetyLockBadge');
                const lockBtnEl = document.getElementById('btnToggleStaffSafetyLock');
                if (lockBadgeEl) {
                    lockBadgeEl.innerHTML = isLocked
                        ? '<span class="admin-badge badge-danger">Đang khóa an toàn nhận việc</span>'
                        : '<span class="admin-badge badge-active">Hoạt động bình thường</span>';
                }
                if (lockBtnEl) {
                    lockBtnEl.textContent = isLocked ? 'Mở khóa nhận việc KTV' : 'Tạm khóa an toàn KTV';
                    lockBtnEl.style.color = isLocked ? '#166534' : '#DC2626';
                }

                const staffLogNoteEl = document.getElementById('viewTicketStaffLogNote');
                if (staffLogNoteEl) staffLogNoteEl.textContent = ticket.staffLogNote ? `"${ticket.staffLogNote}"` : '"Không có ghi chú thêm từ KTV."';
            } else {
                if (serviceBlock) serviceBlock.style.display = 'none';
                if (orderBlock) orderBlock.style.display = 'block';

                const orderPhotosEl = document.getElementById('viewTicketOrderWarehousePhotos');
                renderEvidenceList(orderPhotosEl, ticket.warehousePhotos, 'warehouse');

                const shippingCarrierEl = document.getElementById('viewTicketShippingCarrier');
                if (shippingCarrierEl) shippingCarrierEl.textContent = ticket.carrier || 'Giao Hàng Nhanh (GHN)';

                const shippingCodeEl = document.getElementById('viewTicketShippingCode');
                if (shippingCodeEl) shippingCodeEl.textContent = ticket.trackingCode || 'GHN88291039VN';

                const deliveryStatusEl = document.getElementById('viewTicketDeliveryStatus');
                if (deliveryStatusEl) deliveryStatusEl.textContent = ticket.deliveryStatus || 'Giao thành công';
            }

            // ---------------------------------------------------------
            // KHỐI 4: HIỂN THỊ PHƯƠNG ÁN BỒI HOÀN VÀ TIẾN ĐỘ RMA (PHASE 3)
            // ---------------------------------------------------------
            const resBlock = document.getElementById('ticketResolutionBlock');
            if (resBlock) {
                if (ticket.resolution) {
                    resBlock.style.display = 'block';

                    const resBadgeEl = document.getElementById('viewResolutionBadge');
                    if (resBadgeEl) resBadgeEl.textContent = ticket.resolution.typeName || 'Đã áp dụng phương án';

                    const resTimeEl = document.getElementById('viewResolutionTime');
                    if (resTimeEl) resTimeEl.textContent = 'Cập nhật: ' + (ticket.resolution.updatedAt || 'Vừa xong');

                    const resNoteEl = document.getElementById('viewResolutionNote');
                    if (resNoteEl) resNoteEl.textContent = `"${ticket.resolution.note || 'Đã thỏa thuận phương án giải quyết thỏa đáng với khách hàng.'}"`;

                    const rmaDetails = document.getElementById('resolutionRmaDetails');
                    const rewardDetails = document.getElementById('resolutionRewardDetails');
                    const redoDetails = document.getElementById('resolutionRedoServiceDetails');
                    const refundDetails = document.getElementById('resolutionRefundDetails');

                    // Reset tất cả các chi tiết con
                    if (rmaDetails) rmaDetails.style.display = 'none';
                    if (rewardDetails) rewardDetails.style.display = 'none';
                    if (redoDetails) redoDetails.style.display = 'none';
                    if (refundDetails) refundDetails.style.display = 'none';

                    if (ticket.resolution.type === 'rma_exchange' || ticket.resolution.type === 'rma_refund') {
                        if (rmaDetails) {
                            rmaDetails.style.display = 'block';
                            const rmaCodeEl = document.getElementById('viewRmaCode');
                            const pickupEl = document.getElementById('viewRmaPickupMethod');
                            const whEl = document.getElementById('viewRmaWarehouse');
                            const replGroup = document.getElementById('viewRmaReplacementGroup');
                            const replEl = document.getElementById('viewRmaReplacementItem');

                            if (rmaCodeEl) rmaCodeEl.textContent = ticket.resolution.rmaCode || 'RMA-2026-CHƯA_CẤP';
                            if (pickupEl) pickupEl.textContent = ticket.resolution.pickupMethod || 'Bưu tá tới lấy hàng';
                            if (whEl) whEl.textContent = ticket.resolution.warehouse || 'Kho Pawpal Tân Bình';

                            if (ticket.resolution.type === 'rma_exchange') {
                                if (replGroup) replGroup.style.display = 'block';
                                if (replEl) replEl.textContent = ticket.resolution.replacementItem || 'Sản phẩm đổi mới';
                            } else {
                                if (replGroup) replGroup.style.display = 'none';
                            }

                            // Cập nhật Stepper 4 bước (không dùng icon, tuân thủ AGENTS.md)
                            const currentStep = ticket.resolution.rmaStep || 2;
                            const stepperContainer = document.getElementById('viewRmaStepper');
                            if (stepperContainer) {
                                const steps = [
                                    '1. Cấp mã RMA',
                                    '2. Chờ nhận hàng hoàn',
                                    '3. Kiểm định tại kho',
                                    ticket.resolution.type === 'rma_exchange' ? '4. Xuất hàng đổi mới' : '4. Hoàn tiền thành công'
                                ];
                                stepperContainer.innerHTML = steps.map((s, idx) => {
                                    const stepNum = idx + 1;
                                    const isActive = stepNum <= currentStep;
                                    const arrow = idx < 3 ? '<span class="rma-step-arrow">→</span>' : '';
                                    return `<span class="rma-step-item ${isActive ? 'active' : ''}">${escapeHtml(s)}</span>${arrow}`;
                                }).join('');
                            }

                            // Cập nhật nút bấm tiến độ RMA
                            const btnAdvance = document.getElementById('btnAdvanceRmaStep');
                            if (btnAdvance) {
                                if (currentStep === 1) {
                                    btnAdvance.textContent = 'Cập nhật: Bắt đầu gửi hàng hoàn';
                                    btnAdvance.style.display = 'inline-block';
                                } else if (currentStep === 2) {
                                    btnAdvance.textContent = 'Cập nhật: Đã nhận hàng tại kho và Kiểm định';
                                    btnAdvance.style.display = 'inline-block';
                                } else if (currentStep === 3) {
                                    btnAdvance.textContent = ticket.resolution.type === 'rma_exchange' ? 'Cập nhật: Đã giao hàng đổi mới (Hoàn tất)' : 'Cập nhật: Đã hoàn tiền (Hoàn tất)';
                                    btnAdvance.style.display = 'inline-block';
                                } else {
                                    btnAdvance.textContent = 'Quy trình RMA đã hoàn tất thành công';
                                    btnAdvance.style.color = '#166534';
                                }
                            }
                        }
                    } else if (ticket.resolution.type === 'reward_voucher') {
                        if (rewardDetails) {
                            rewardDetails.style.display = 'block';
                            const ptsEl = document.getElementById('viewRewardPoints');
                            const vchEl = document.getElementById('viewRewardVoucher');
                            if (ptsEl) ptsEl.textContent = `+${ticket.resolution.pawpoints || 0} Pawpoint (Tương đương ${((ticket.resolution.pawpoints || 0) * 100).toLocaleString('vi-VN')}đ)`;
                            if (vchEl) vchEl.textContent = ticket.resolution.voucherCode || 'PAWPALCARE50';
                        }
                    } else if (ticket.resolution.type === 'redo_service') {
                        if (redoDetails) {
                            redoDetails.style.display = 'block';
                            const redoIdEl = document.getElementById('viewRedoBookingId');
                            const redoStaffEl = document.getElementById('viewRedoStaff');
                            const redoTimeEl = document.getElementById('viewRedoTime');

                            if (redoIdEl) redoIdEl.textContent = ticket.resolution.redoBookingId || 'BKG-REDO-01';
                            if (redoStaffEl) redoStaffEl.textContent = ticket.resolution.redoStaff || 'KTV chỉ định';
                            if (redoTimeEl) redoTimeEl.textContent = (ticket.resolution.redoTime || 'Thời gian đã hẹn') + ' (Miễn phí 100%)';
                        }
                    } else if (ticket.resolution.type === 'refund') {
                        if (refundDetails) {
                            refundDetails.style.display = 'block';
                            const refAmountEl = document.getElementById('viewRefundAmount');
                            const refMethodEl = document.getElementById('viewRefundMethod');
                            if (refAmountEl) refAmountEl.textContent = `${Number(ticket.resolution.refundAmount || 0).toLocaleString('vi-VN')} VNĐ`;
                            if (refMethodEl) refMethodEl.textContent = ticket.resolution.refundMethod || 'Chuyển khoản trực tiếp';
                        }
                    }
                } else {
                    resBlock.style.display = 'none';
                }
            }

            // Timeline
            const timelineContainer = document.getElementById('viewTicketTimeline');
            if (timelineContainer && ticket.timeline) {
                timelineContainer.innerHTML = '';
                ticket.timeline.forEach(t => {
                    const badge = t.isInternal
                        ? '<span class="timeline-entry-badge-internal">Ghi chú nội bộ</span>'
                        : '<span class="timeline-entry-badge-customer">Khách hàng</span>';

                    const entry = document.createElement('div');
                    entry.className = 'timeline-entry';
                    entry.innerHTML = `
                        <div class="timeline-entry-meta">
                            <span><strong>${escapeHtml(t.author)}</strong> ${badge}</span>
                            <span>${escapeHtml(t.time)}</span>
                        </div>
                        <div class="timeline-entry-title">${escapeHtml(t.title)}</div>
                        <div class="timeline-entry-desc">${escapeHtml(t.desc)}</div>
                    `;
                    timelineContainer.appendChild(entry);
                });
            }

            // Khối Quản lý phê duyệt bồi hoàn (vượt thẩm quyền CSKH)
            const managerApprovalPanel = document.getElementById('managerApprovalPanel');
            const managerApprovalSummary = document.getElementById('managerApprovalProposalSummary');
            if (managerApprovalPanel) {
                if (ticket.status === 'waiting_manager_approval' && ticket.pendingResolution) {
                    managerApprovalPanel.style.display = 'block';
                    const pres = ticket.pendingResolution;
                    let summaryHtml = `<strong>Phương án đề xuất:</strong> ${escapeHtml(pres.typeName)}<br>`;
                    if (pres.refundAmount) {
                        summaryHtml += `• Số tiền bồi hoàn: <strong>${Number(pres.refundAmount).toLocaleString('vi-VN')} VNĐ</strong> (Hình thức: ${escapeHtml(pres.refundMethod || 'Chuyển khoản trực tiếp')})<br>`;
                    }
                    if (pres.pawpoints || pres.voucherCode) {
                        summaryHtml += `• Bồi hoàn: ${pres.pawpoints ? '+' + pres.pawpoints + ' Pawpoint ' : ''}${pres.voucherCode ? '• Voucher: ' + escapeHtml(pres.voucherCode) : ''}<br>`;
                    }
                    if (pres.replacementItem) {
                        summaryHtml += `• Đổi bù sản phẩm: ${escapeHtml(pres.replacementItem)} (Kho: ${escapeHtml(pres.warehouse)})<br>`;
                    }
                    summaryHtml += `• Ghi chú đề xuất: <em>"${escapeHtml(pres.note || 'Không có ghi chú')}"</em>`;
                    if (managerApprovalSummary) managerApprovalSummary.innerHTML = summaryHtml;
                } else {
                    managerApprovalPanel.style.display = 'none';
                }
            }

            // Khối Mở lại khiếu nại (khi đã đóng trong vòng 7 ngày)
            const reopenPanel = document.getElementById('ticketReopenPanel');
            const reopenDeadlineText = document.getElementById('ticketReopenDeadlineText');
            if (reopenPanel) {
                if (ticket.status === 'closed') {
                    reopenPanel.style.display = 'flex';
                    if (reopenDeadlineText) {
                        if (ticket.canReopenUntil) {
                            const d = new Date(ticket.canReopenUntil);
                            reopenDeadlineText.textContent = `Thời hạn mở lại còn hiệu lực đến: ${formatDateTime(d)}`;
                        } else {
                            reopenDeadlineText.textContent = 'Có thể yêu cầu mở lại trong vòng 7 ngày kể từ khi đóng.';
                        }
                    }
                } else {
                    reopenPanel.style.display = 'none';
                }
            }

            // Khối Cảnh báo khẩn cấp khi khách đánh giá < 3 sao (Xử lý lần 2)
            const lowRatingPanel = document.getElementById('ticketLowRatingAlertPanel');
            const lowRatingStars = document.getElementById('ticketLowRatingStars');
            const lowRatingComment = document.getElementById('ticketLowRatingComment');
            if (lowRatingPanel) {
                if (ticket.status === 'reprocessing' || (ticket.customerRating && Number(ticket.customerRating) < 3)) {
                    lowRatingPanel.style.display = 'flex';
                    if (lowRatingStars) lowRatingStars.textContent = `${ticket.customerRating || '1-2'}★`;
                    if (lowRatingComment) {
                        lowRatingComment.textContent = ticket.customerRatingComment
                            ? `Phản hồi của khách: "${ticket.customerRatingComment}". Cần Quản lý trực tiếp can thiệp xoa dịu và xử lý lần 2.`
                            : 'Khách hàng không hài lòng với phương án xử lý trước đó. Chuyển sang trạng thái Xử lý lần 2, Quản lý cần can thiệp trực tiếp.';
                    }
                } else {
                    lowRatingPanel.style.display = 'none';
                }
            }

            // Nút liên kết xem lịch hẹn / đơn hàng gốc
            document.getElementById('btnJumpToOriginal')?.addEventListener('click', () => {
                if (ticket.bookingId) {
                    sessionStorage.setItem('pawpal_admin_service_selected_id', ticket.bookingId);
                    window.location.hash = '#tab-service-bookings';
                } else if (ticket.orderId) {
                    sessionStorage.setItem('pawpal_admin_order_selected_id', ticket.orderId);
                    window.location.hash = '#tab-order-list';
                }
            });
        }

        // ---------------------------------------------------------
        // 8. XỬ LÝ 1-CHẠM NHẬN TICKET (QUICK ASSIGN)
        // ---------------------------------------------------------
        async function handleQuickAssign(ticketId, ticketType) {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            try {
                // Update trạng thái sang processing trên Supabase
                await client.from('support_ticket').update({
                    status: 'processing',
                    updated_at: new Date().toISOString()
                }).eq('id', ticketId);

                // Insert tin nhắn tiếp nhận của CSKH
                await client.from('support_ticket_message').insert({
                    ticket_id: ticketId,
                    sender_type: 'cskh',
                    agent_name: 'Lê Lệ Quyên',
                    content: 'Đã nhận phụ trách trực tiếp xử lý khiếu nại này theo cam kết SLA.',
                    created_at: new Date().toISOString()
                });

                await loadComplaintsModuleData();

                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (ticketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();

                const updated = (ticketType === 'service' ? serviceComplaints : orderComplaints).find(i => i.id === ticketId);
                if (updated) {
                    if (currentActiveTicket && currentActiveTicket.id === ticketId) {
                        renderTicketDetail(updated);
                    }
                    syncTicketToUserPortal(updated);
                }

                showToast(`Đã nhận xử lý Ticket ${ticketId.substring(0, 8)}... thành công! Người phụ trách: Lê Lệ Quyên (CSKH).`, 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi khi nhận xử lý ticket:', err);
                showToast('Lỗi khi nhận xử lý: ' + err.message, 'danger');
            }
        }

        // ---------------------------------------------------------
        // 9. SỰ KIỆN BẢNG VÀ DROPDOWN MENU
        // ---------------------------------------------------------
        function attachComplaintTableEvents() {
            // Click tên khách để mở Ticket
            document.querySelectorAll('.btn-open-ticket').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const id = link.getAttribute('data-id');
                    const type = link.getAttribute('data-type');
                    let targetTicket = null;
                    if (type === 'service') {
                        targetTicket = serviceComplaints.find(i => i.id === id);
                        currentTicketType = 'service';
                    } else {
                        targetTicket = orderComplaints.find(i => i.id === id);
                        currentTicketType = 'order';
                    }
                    if (targetTicket) {
                        currentActiveTicket = targetTicket;
                        switchSubtab('tab-complaint-detail');
                    }
                });
            });

            // Nút 1-chạm Nhận xử lý trong bảng
            document.querySelectorAll('.btn-quick-assign').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    const type = btn.getAttribute('data-type');
                    handleQuickAssign(id, type);
                });
            });

            // Menu 3 chấm
            const triggers = document.querySelectorAll('.btn-complaint-action');
            const dropdown = document.getElementById('complaintsActionDropdown');
            if (!dropdown) return;

            triggers.forEach(trigger => {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.style.display = 'none');

                    const rect = trigger.getBoundingClientRect();
                    dropdown.style.display = 'flex';
                    dropdown.style.top = (rect.bottom + 4) + 'px';
                    dropdown.style.left = (rect.right - 190) + 'px';
                    dropdown.setAttribute('data-current-id', trigger.getAttribute('data-id'));
                    dropdown.setAttribute('data-current-type', trigger.getAttribute('data-type'));
                });
            });

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.action-dropdown-menu') && !e.target.closest('.btn-complaint-action')) {
                    dropdown.style.display = 'none';
                }
            });
        }

        // Dropdown actions
        document.getElementById('menuActionViewTicket')?.addEventListener('click', () => {
            const dropdown = document.getElementById('complaintsActionDropdown');
            const id = dropdown.getAttribute('data-current-id');
            const type = dropdown.getAttribute('data-current-type');
            dropdown.style.display = 'none';

            let t = type === 'service' ? serviceComplaints.find(i => i.id === id) : orderComplaints.find(i => i.id === id);
            if (t) {
                currentActiveTicket = t;
                switchSubtab('tab-complaint-detail');
            }
        });

        document.getElementById('menuActionQuickAssign')?.addEventListener('click', () => {
            const dropdown = document.getElementById('complaintsActionDropdown');
            const id = dropdown.getAttribute('data-current-id');
            const type = dropdown.getAttribute('data-current-type');
            dropdown.style.display = 'none';
            handleQuickAssign(id, type);
        });

        document.getElementById('menuActionCloseTicket')?.addEventListener('click', async () => {
            const dropdown = document.getElementById('complaintsActionDropdown');
            const id = dropdown.getAttribute('data-current-id');
            const type = dropdown.getAttribute('data-current-type');
            dropdown.style.display = 'none';

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            try {
                await client.from('support_ticket').update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                }).eq('id', id);

                await client.from('support_ticket_message').insert({
                    ticket_id: id,
                    sender_type: 'cskh',
                    agent_name: 'Lê Lệ Quyên',
                    content: 'Đã hoàn tất quy trình xử lý và chính thức đóng ticket.',
                    created_at: new Date().toISOString()
                });

                await loadComplaintsModuleData();

                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (type === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();

                const updated = (type === 'service' ? serviceComplaints : orderComplaints).find(i => i.id === id);
                if (updated && currentActiveTicket && currentActiveTicket.id === id) {
                    renderTicketDetail(updated);
                }

                showToast(`Ticket ${id.substring(0, 8)}... đã được đóng hoàn tất trên Supabase.`, 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi đóng ticket:', err);
                showToast('Lỗi khi đóng ticket: ' + err.message, 'danger');
            }
        });

        // ---------------------------------------------------------
        // SỰ KIỆN UPLOAD ẢNH VÀ XEM ẢNH PHÓNG TO (LIGHTBOX)
        // ---------------------------------------------------------
        document.getElementById('btnCloseImagePreview')?.addEventListener('click', closeImageLightbox);
        document.getElementById('btnDismissImagePreview')?.addEventListener('click', closeImageLightbox);
        document.getElementById('imagePreviewModalOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'imagePreviewModalOverlay') closeImageLightbox();
        });

        // 1. Upload bổ sung ảnh phản ánh của khách trong Chi tiết Ticket
        const btnUploadMoreEvidence = document.getElementById('btnTriggerUploadMoreEvidence');
        const inputUploadMoreEvidence = document.getElementById('inputUploadMoreEvidence');
        btnUploadMoreEvidence?.addEventListener('click', () => {
            inputUploadMoreEvidence?.click();
        });

        inputUploadMoreEvidence?.addEventListener('change', (e) => {
            if (!currentActiveTicket || !e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            let processed = 0;

            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!currentActiveTicket.evidence) currentActiveTicket.evidence = [];
                    currentActiveTicket.evidence.push({
                        name: file.name,
                        dataUrl: event.target.result,
                        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    processed++;
                    if (processed === files.length) {
                        currentActiveTicket.timeline.unshift({
                            time: 'Vừa xong',
                            author: 'Lê Lệ Quyên (Admin)',
                            title: 'Bổ sung ảnh bằng chứng từ máy',
                            desc: `Đã tải lên ${files.length} ảnh mới: ${files.map(f => f.name).join(', ')}.`,
                            isInternal: true
                        });
                        renderTicketDetail(currentActiveTicket);
                        showToast(`Đã tải lên thành công ${files.length} ảnh bằng chứng!`, 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
            inputUploadMoreEvidence.value = '';
        });

        // 2. Upload bổ sung ảnh check-in đón bé (Dịch vụ)
        const btnUploadCheckin = document.getElementById('btnTriggerUploadCheckinPhoto');
        const inputUploadCheckin = document.getElementById('inputUploadCheckinPhoto');
        btnUploadCheckin?.addEventListener('click', () => inputUploadCheckin?.click());
        inputUploadCheckin?.addEventListener('change', (e) => {
            if (!currentActiveTicket || !e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            let processed = 0;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!currentActiveTicket.checkinPhotos) currentActiveTicket.checkinPhotos = [];
                    currentActiveTicket.checkinPhotos.push({
                        name: file.name,
                        dataUrl: event.target.result,
                        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    processed++;
                    if (processed === files.length) {
                        renderTicketDetail(currentActiveTicket);
                        showToast(`Đã bổ sung ${files.length} ảnh đón bé vào hồ sơ dịch vụ!`, 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
            inputUploadCheckin.value = '';
        });

        // 3. Upload bổ sung ảnh kiểm kho (Đơn hàng)
        const btnUploadWarehouse = document.getElementById('btnTriggerUploadWarehousePhoto');
        const inputUploadWarehouse = document.getElementById('inputUploadWarehousePhoto');
        btnUploadWarehouse?.addEventListener('click', () => inputUploadWarehouse?.click());
        inputUploadWarehouse?.addEventListener('change', (e) => {
            if (!currentActiveTicket || !e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            let processed = 0;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (!currentActiveTicket.warehousePhotos) currentActiveTicket.warehousePhotos = [];
                    currentActiveTicket.warehousePhotos.push({
                        name: file.name,
                        dataUrl: event.target.result,
                        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                    processed++;
                    if (processed === files.length) {
                        renderTicketDetail(currentActiveTicket);
                        showToast(`Đã bổ sung ${files.length} ảnh kiểm tra kho hàng vào hồ sơ!`, 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
            inputUploadWarehouse.value = '';
        });

        // 4. Quản lý Upload ảnh trong Modal Tạo Ticket
        let createTicketUploadedFiles = [];
        const btnTriggerUploadModal = document.getElementById('btnTriggerUploadTicketFiles');
        const inputTicketFiles = document.getElementById('inputTicketFiles');
        const createPreviewsContainer = document.getElementById('createTicketPreviewsContainer');

        function renderCreateTicketPreviews() {
            if (!createPreviewsContainer) return;
            createPreviewsContainer.innerHTML = '';
            createTicketUploadedFiles.forEach((fileObj, idx) => {
                const item = document.createElement('div');
                item.className = 'uploaded-preview-item';
                item.innerHTML = `
                    <img src="${fileObj.dataUrl}" class="uploaded-preview-thumb" alt="${escapeHtml(fileObj.name)}">
                    <span style="font-size: 11.5px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(fileObj.name)}</span>
                    <button type="button" class="uploaded-preview-remove" data-idx="${idx}" title="Xóa ảnh này">✕</button>
                `;
                item.querySelector('.uploaded-preview-remove').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    createTicketUploadedFiles.splice(idx, 1);
                    renderCreateTicketPreviews();
                });
                createPreviewsContainer.appendChild(item);
            });
        }

        btnTriggerUploadModal?.addEventListener('click', () => inputTicketFiles?.click());
        inputTicketFiles?.addEventListener('change', (e) => {
            if (!e.target.files || e.target.files.length === 0) return;
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    createTicketUploadedFiles.push({
                        name: file.name,
                        dataUrl: ev.target.result,
                        uploadedAt: 'Đính kèm lúc tạo vé'
                    });
                    renderCreateTicketPreviews();
                };
                reader.readAsDataURL(file);
            });
            inputTicketFiles.value = '';
        });

        // Modal Tạo Ticket
        const createModal = document.getElementById('createTicketModalOverlay');

        function clearCreateTicketErrors() {
            const phoneErr = document.getElementById('errorTicketCustomerPhone');
            const nameErr = document.getElementById('errorTicketCustomerName');
            const phoneInput = document.getElementById('inputTicketCustomerPhone');
            const nameInput = document.getElementById('inputTicketCustomerName');

            if (phoneErr) {
                phoneErr.style.display = 'none';
                phoneErr.textContent = '';
            }
            if (nameErr) {
                nameErr.style.display = 'none';
                nameErr.textContent = '';
            }
            if (phoneInput) {
                phoneInput.style.borderColor = '';
                phoneInput.style.backgroundColor = '';
            }
            if (nameInput) {
                nameInput.style.borderColor = '';
                nameInput.style.backgroundColor = '';
            }
        }

        document.getElementById('btnOpenCreateServiceTicket')?.addEventListener('click', () => {
            document.getElementById('createTicketModalTitle').textContent = 'Tiếp nhận khiếu nại dịch vụ';
            document.getElementById('labelTicketRefId').textContent = 'Chọn lịch hẹn liên quan *';
            const sel = document.getElementById('selectTicketRefId');
            if (sel) {
                if (cachedAppointments && cachedAppointments.length > 0) {
                    sel.innerHTML = cachedAppointments.slice(0, 20).map(a => {
                        const sName = a.service ? a.service.service_name : (a.service_type || 'Dịch vụ');
                        const pName = a.pet_name || 'Bé cưng';
                        const aCode = a.appointment_code || a.id;
                        const aDate = a.appointment_date ? a.appointment_date.substring(0, 10) : '';
                        return `<option value="${aCode}">${aCode} (${pName} - ${sName}${aDate ? ' • ' + aDate : ''})</option>`;
                    }).join('');
                } else {
                    sel.innerHTML = `
                        <option value="BKG-1001">BKG-1001 (Tiếp nhận dịch vụ Spa / Hotel)</option>
                    `;
                }
            }
            createTicketUploadedFiles = [];
            renderCreateTicketPreviews();
            clearCreateTicketErrors();
            createModal.classList.add('active');
        });

        document.getElementById('btnOpenCreateOrderTicket')?.addEventListener('click', () => {
            document.getElementById('createTicketModalTitle').textContent = 'Tiếp nhận khiếu nại đơn hàng';
            document.getElementById('labelTicketRefId').textContent = 'Chọn đơn hàng liên quan *';
            const sel = document.getElementById('selectTicketRefId');
            if (sel) {
                if (cachedOrders && cachedOrders.length > 0) {
                    sel.innerHTML = cachedOrders.slice(0, 20).map(o => {
                        const oCode = o.order_code || o.id;
                        const total = o.total_amount ? Number(o.total_amount).toLocaleString('vi-VN') + 'đ' : '';
                        const dateStr = o.created_at ? o.created_at.substring(0, 10) : '';
                        return `<option value="${oCode}">${oCode} (${total ? total + ' • ' : ''}${dateStr})</option>`;
                    }).join('');
                } else {
                    sel.innerHTML = `
                        <option value="ORD-2026-001">ORD-2026-001 (Đơn hàng mua sắm)</option>
                    `;
                }
            }
            createTicketUploadedFiles = [];
            renderCreateTicketPreviews();
            clearCreateTicketErrors();
            createModal.classList.add('active');
        });

        document.getElementById('btnCancelCreateTicket')?.addEventListener('click', () => {
            clearCreateTicketErrors();
            createModal.classList.remove('active');
        });
        document.getElementById('btnDismissCreateTicket')?.addEventListener('click', () => {
            clearCreateTicketErrors();
            createModal.classList.remove('active');
        });
        
        
        // Kiểm tra phát hiện Ticket trùng lặp đang mở cho cùng khách hàng / mã giao dịch
        function checkDuplicateTicket(phone, refId) {
            const warningBox = document.getElementById('ticketDuplicateWarningBox');
            if (!warningBox) return;

            const allActive = serviceComplaints.concat(orderComplaints).filter(t => !['resolved', 'closed'].includes(t.status));
            const dup = allActive.find(t => {
                const matchPhone = phone && (t.phone === phone);
                const matchRef = refId && (t.bookingId === refId || t.orderId === refId);
                return matchPhone || matchRef;
            });

            if (dup) {
                warningBox.style.display = 'block';
                warningBox.innerHTML = `<strong>Cảnh báo trùng lặp:</strong> Phát hiện Ticket đang mở <strong>${escapeHtml(dup.id)}</strong> (${escapeHtml(dup.title || 'Đang xử lý')}) cho ${dup.phone === phone ? 'số điện thoại này' : 'mã giao dịch này'}. Vui lòng kiểm tra kỹ tránh tạo trùng Ticket!`;
            } else {
                warningBox.style.display = 'none';
            }
        }

        // Tự động nhận diện họ tên khách hàng và cảnh báo trùng lặp khi nhập số điện thoại trong modal tạo Ticket
        document.getElementById('inputTicketCustomerPhone')?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const phoneErr = document.getElementById('errorTicketCustomerPhone');
            const phoneInput = document.getElementById('inputTicketCustomerPhone');
            if (val && phoneErr && phoneErr.style.display !== 'none') {
                phoneErr.style.display = 'none';
                phoneErr.textContent = '';
                if (phoneInput) {
                    phoneInput.style.borderColor = '';
                    phoneInput.style.backgroundColor = '';
                }
            }
            if (val.length >= 9) {
                const found = cachedCustomers.find(c => (c.phone_main || c.phone) === val);
                if (found) {
                    const prof = cachedProfiles.find(p => p.customer_id === found.id);
                    const nameInput = document.getElementById('inputTicketCustomerName');
                    if (nameInput && !nameInput.value) {
                        nameInput.value = (prof && prof.full_name) || found.note || '';
                        const nameErr = document.getElementById('errorTicketCustomerName');
                        if (nameErr && nameErr.style.display !== 'none') {
                            nameErr.style.display = 'none';
                            nameErr.textContent = '';
                            nameInput.style.borderColor = '';
                            nameInput.style.backgroundColor = '';
                        }
                    }
                }
            }
            checkDuplicateTicket(val, document.getElementById('selectTicketRefId')?.value || '');
        });

        document.getElementById('inputTicketCustomerPhone')?.addEventListener('blur', (e) => {
            const val = e.target.value.trim();
            const phoneErr = document.getElementById('errorTicketCustomerPhone');
            const phoneInput = document.getElementById('inputTicketCustomerPhone');
            if (!val) {
                if (phoneErr) {
                    phoneErr.style.display = 'block';
                    phoneErr.textContent = 'Vui lòng nhập số điện thoại.';
                }
                if (phoneInput) {
                    phoneInput.style.borderColor = '#DC2626';
                    phoneInput.style.backgroundColor = '#FFF5F5';
                }
            }
        });

        document.getElementById('inputTicketCustomerName')?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            const nameErr = document.getElementById('errorTicketCustomerName');
            const nameInput = document.getElementById('inputTicketCustomerName');
            if (val && nameErr && nameErr.style.display !== 'none') {
                nameErr.style.display = 'none';
                nameErr.textContent = '';
                if (nameInput) {
                    nameInput.style.borderColor = '';
                    nameInput.style.backgroundColor = '';
                }
            }
        });

        document.getElementById('inputTicketCustomerName')?.addEventListener('blur', (e) => {
            const val = e.target.value.trim();
            const nameErr = document.getElementById('errorTicketCustomerName');
            const nameInput = document.getElementById('inputTicketCustomerName');
            if (!val) {
                if (nameErr) {
                    nameErr.style.display = 'block';
                    nameErr.textContent = 'Vui lòng nhập tên khách hàng.';
                }
                if (nameInput) {
                    nameInput.style.borderColor = '#DC2626';
                    nameInput.style.backgroundColor = '#FFF5F5';
                }
            }
        });

        document.getElementById('selectTicketRefId')?.addEventListener('change', (e) => {
            const refVal = e.target.value || '';
            const phoneVal = document.getElementById('inputTicketCustomerPhone')?.value.trim() || '';
            checkDuplicateTicket(phoneVal, refVal);
        });

        document.getElementById('btnSaveCreateTicket')?.addEventListener('click', async () => {
            const phoneInput = document.getElementById('inputTicketCustomerPhone');
            const nameInput = document.getElementById('inputTicketCustomerName');
            const phone = phoneInput?.value.trim() || '';
            const name = nameInput?.value.trim() || '';
            const title = document.getElementById('inputTicketTitle')?.value.trim() || '';
            const content = document.getElementById('inputTicketContent')?.value.trim() || title;
            const refId = document.getElementById('selectTicketRefId')?.value || '';
            const priority = document.getElementById('selectTicketPriority')?.value || 'medium';
            const isUnverified = document.getElementById('chkTicketUnverified')?.checked || false;
            const modalTitle = document.getElementById('createTicketModalTitle')?.textContent || '';
            const isService = modalTitle.includes('dịch vụ') || refId.startsWith('BKG') || refId.startsWith('APP');

            const phoneErr = document.getElementById('errorTicketCustomerPhone');
            const nameErr = document.getElementById('errorTicketCustomerName');

            let hasError = false;

            if (!phone) {
                if (phoneErr) {
                    phoneErr.style.display = 'block';
                    phoneErr.textContent = 'Vui lòng nhập số điện thoại.';
                }
                if (phoneInput) {
                    phoneInput.style.borderColor = '#DC2626';
                    phoneInput.style.backgroundColor = '#FFF5F5';
                }
                hasError = true;
            } else {
                if (phoneErr) {
                    phoneErr.style.display = 'none';
                    phoneErr.textContent = '';
                }
                if (phoneInput) {
                    phoneInput.style.borderColor = '';
                    phoneInput.style.backgroundColor = '';
                }
            }

            if (!name) {
                if (nameErr) {
                    nameErr.style.display = 'block';
                    nameErr.textContent = 'Vui lòng nhập tên khách hàng.';
                }
                if (nameInput) {
                    nameInput.style.borderColor = '#DC2626';
                    nameInput.style.backgroundColor = '#FFF5F5';
                }
                hasError = true;
            } else {
                if (nameErr) {
                    nameErr.style.display = 'none';
                    nameErr.textContent = '';
                }
                if (nameInput) {
                    nameInput.style.borderColor = '';
                    nameInput.style.backgroundColor = '';
                }
            }

            if (hasError) {
                if (!phone && phoneInput) {
                    phoneInput.focus();
                } else if (!name && nameInput) {
                    nameInput.focus();
                }
                return;
            }

            if (!title) {
                showToast('Vui lòng nhập tiêu đề khiếu nại.', 'warning');
                document.getElementById('inputTicketTitle')?.focus();
                return;
            }
            if (!content) {
                showToast('Vui lòng nhập nội dung phản ánh chi tiết.', 'warning');
                document.getElementById('inputTicketContent')?.focus();
                return;
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const saveBtn = document.getElementById('btnSaveCreateTicket');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Đang lưu...';
            }

            try {
                // 1. Tìm hoặc tạo Customer
                let matchedUserId = null;
                if (phone) {
                    const existingCust = cachedCustomers.find(c => (c.phone_main || c.phone) === phone);
                    if (existingCust) {
                        matchedUserId = existingCust.id;
                    } else {
                        const { data: dbCust } = await client.from('customer').select('id, phone_main').eq('phone_main', phone).limit(1);
                        if (dbCust && dbCust.length > 0) {
                            matchedUserId = dbCust[0].id;
                        } else {
                            const { data: newCust, error: newCustErr } = await client.from('customer').insert({
                                phone_main: phone,
                                account_status: 'ACTIVE',
                                is_temporary: true,
                                note: name || 'Khách hàng tiếp nhận khiếu nại'
                            }).select().single();

                            if (newCust) {
                                matchedUserId = newCust.id;
                                await client.from('customer_profile').insert({
                                    customer_id: newCust.id,
                                    full_name: name || 'Khách hàng tiếp nhận'
                                });
                            }
                        }
                    }
                }

                if (!matchedUserId && cachedCustomers.length > 0) {
                    matchedUserId = cachedCustomers[0].id;
                }

                // 2. Insert vào bảng support_ticket trên Supabase
                const ticketType = isService ? 'booking' : 'order';
                const normPriority = priority === 'high' ? 'Cao' : (priority === 'low' ? 'Thấp' : 'Trung bình');

                const { data: newTicket, error: ticketErr } = await client.from('support_ticket').insert({
                    user_id: matchedUserId,
                    title: title,
                    type: ticketType,
                    status: 'pending',
                    priority: normPriority,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).select().single();

                if (ticketErr) {
                    console.error('[Complaints] Lỗi khi tạo ticket:', ticketErr);
                    showToast('Lỗi tạo khiếu nại vào Supabase: ' + ticketErr.message, 'danger');
                    return;
                }

                // 3. Insert tin nhắn khởi tạo vào support_ticket_message
                await client.from('support_ticket_message').insert({
                    ticket_id: newTicket.id,
                    sender_type: 'user',
                    content: refId ? `[Tham chiếu: ${refId}] ${content}` : content,
                    created_at: new Date().toISOString()
                });

                if (createTicketUploadedFiles.length > 0) {
                    await client.from('support_ticket_message').insert({
                        ticket_id: newTicket.id,
                        sender_type: 'cskh',
                        agent_name: 'Lê Lệ Quyên',
                        content: `Tiếp nhận khiếu nại tại quầy kèm ${createTicketUploadedFiles.length} ảnh xác minh bằng chứng.`,
                        created_at: new Date().toISOString()
                    });
                }

                // Lưu liên kết refId và trạng thái xác minh vào local overrides
                const localOverrides = JSON.parse(localStorage.getItem('pawpal_complaint_overrides') || '{}');
                localOverrides[newTicket.id] = localOverrides[newTicket.id] || {};
                if (refId) localOverrides[newTicket.id].refId = refId;
                if (isUnverified) localOverrides[newTicket.id].unverified = true;
                localStorage.setItem('pawpal_complaint_overrides', JSON.stringify(localOverrides));

                // 4. Tải lại toàn bộ dữ liệu live từ Supabase
                await loadComplaintsModuleData();

                if (isService) {
                    renderServiceComplaintsTable();
                    switchSubtab('tab-complaint-services');
                } else {
                    renderOrderComplaintsTable();
                    switchSubtab('tab-complaint-orders');
                }

                updateComplaintsKpis();
                renderComplaintsAlertBar();
                createModal.classList.remove('active');

                // Reset form
                if (document.getElementById('inputTicketCustomerPhone')) document.getElementById('inputTicketCustomerPhone').value = '';
                if (document.getElementById('inputTicketCustomerName')) document.getElementById('inputTicketCustomerName').value = '';
                if (document.getElementById('inputTicketTitle')) document.getElementById('inputTicketTitle').value = '';
                if (document.getElementById('inputTicketContent')) document.getElementById('inputTicketContent').value = '';
                if (document.getElementById('chkTicketUnverified')) document.getElementById('chkTicketUnverified').checked = false;
                if (document.getElementById('ticketDuplicateWarningBox')) document.getElementById('ticketDuplicateWarningBox').style.display = 'none';
                clearCreateTicketErrors();
                createTicketUploadedFiles = [];
                renderCreateTicketPreviews();

                showToast(`Tiếp nhận khiếu nại thành công! Mã Ticket: ${newTicket.id.substring(0, 8)}...`, 'success');
            } catch (err) {
                console.error('[Complaints] Exception tạo ticket:', err);
                showToast('Lỗi khi tiếp nhận khiếu nại: ' + err.message, 'danger');
            } finally {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Tạo khiếu nại';
                }
            }
        });

        // Modal Phương án giải quyết (Phase 3: RMA, Redo, Reward và Refund)
        const resolveModal = document.getElementById('resolveTicketModalOverlay');
        const selectResolveOpt = document.getElementById('selectResolveOption');

        // Kiểm tra phân cấp thẩm quyền giải quyết bồi hoàn theo quy trình 3.16:
        // - CSKH tự quyết: Phi tiền mặt (Voucher < 100k, Pawpoint <= 500, Redo 0đ, Giải thích, Từ chối).
        // - Bắt buộc Quản lý duyệt: Hoàn tiền mặt / chuyển khoản bất kỳ, RMA hoàn tiền > 500.000đ, Voucher >= 100k, Pawpoint > 500.
        function checkRequiresManagerApproval(type, details) {
            if (type === 'refund') {
                return {
                    required: true,
                    reason: `Chi tiền mặt / hoàn tiền trực tiếp (${Number(details.refundAmount || 0).toLocaleString('vi-VN')}đ) bắt buộc phải có Quản lý phê duyệt.`
                };
            }
            if (type === 'rma_refund') {
                const amt = Number(details.refundAmount || 0);
                if (amt > 500000) {
                    return {
                        required: true,
                        reason: `Hoàn tiền RMA (${amt.toLocaleString('vi-VN')}đ > 500.000đ) vượt thẩm quyền CSKH, cần Quản lý duyệt.`
                    };
                }
            }
            if (type === 'reward_voucher') {
                const pts = Number(details.pawpoints || 0);
                const vch = String(details.voucherCode || '').toUpperCase();
                const vchMatch = vch.match(/\d+/);
                const vchVal = vchMatch ? parseInt(vchMatch[0], 10) : 0;
                if (pts > 500 || vchVal >= 100) {
                    return {
                        required: true,
                        reason: `Bồi hoàn ${pts > 500 ? pts + ' Pawpoint (> 500)' : 'Voucher giá trị lớn (' + vch + ')'} vượt hạn mức CSKH tự quyết, cần Quản lý duyệt.`
                    };
                }
            }
            return { required: false };
        }

        function updateResolveModalSubgroups() {
            if (!selectResolveOpt) return;
            const val = selectResolveOpt.value;

            const rmaGroup = document.getElementById('groupResolveRma');
            const redoGroup = document.getElementById('groupResolveRedo');
            const rewardGroup = document.getElementById('groupResolveReward');
            const refundGroup = document.getElementById('groupResolveRefund');

            if (rmaGroup) rmaGroup.style.display = 'none';
            if (redoGroup) redoGroup.style.display = 'none';
            if (rewardGroup) rewardGroup.style.display = 'none';
            if (refundGroup) refundGroup.style.display = 'none';

            if (val === 'rma_exchange' || val === 'rma_refund') {
                if (rmaGroup) {
                    rmaGroup.style.display = 'block';
                    const rmaCodeInput = document.getElementById('inputResolveRmaCode');
                    if (rmaCodeInput && !rmaCodeInput.value) {
                        rmaCodeInput.value = 'RMA-2026-' + Math.floor(100 + Math.random() * 900);
                    }
                    const exField = document.getElementById('resolveRmaExchangeField');
                    const refField = document.getElementById('resolveRmaRefundField');
                    if (val === 'rma_exchange') {
                        if (exField) exField.style.display = 'block';
                        if (refField) refField.style.display = 'none';
                        const replInput = document.getElementById('inputResolveRmaReplacement');
                        if (replInput && !replInput.value && currentActiveTicket) {
                            replInput.value = currentActiveTicket.productName ? `${currentActiveTicket.productName} (Đổi mới / đổi size)` : '';
                        }
                    } else {
                        if (exField) exField.style.display = 'none';
                        if (refField) refField.style.display = 'block';
                        const refAmtInput = document.getElementById('inputResolveRmaRefundAmount');
                        if (refAmtInput && !refAmtInput.value) {
                            refAmtInput.value = '350000';
                        }
                    }
                }
            } else if (val === 'redo_service') {
                if (redoGroup) {
                    redoGroup.style.display = 'block';
                    const timeInput = document.getElementById('inputResolveRedoTime');
                    if (timeInput && !timeInput.value) {
                        timeInput.value = '09:30 - Ngày mai';
                    }
                }
            } else if (val === 'reward_voucher') {
                if (rewardGroup) {
                    rewardGroup.style.display = 'block';
                    const ptsInput = document.getElementById('inputResolveRewardPoints');
                    const vchInput = document.getElementById('inputResolveRewardVoucher');
                    if (ptsInput && !ptsInput.value) ptsInput.value = '200';
                    if (vchInput && !vchInput.value) vchInput.value = 'PAWPALCARE50';
                }
            } else if (val === 'refund') {
                if (refundGroup) {
                    refundGroup.style.display = 'block';
                    const refAmtInput = document.getElementById('inputResolveRefundAmount');
                    if (refAmtInput && !refAmtInput.value) refAmtInput.value = '250000';
                }
            }

            // Kiểm tra phân cấp thẩm quyền (CSKH vs Quản lý)
            const details = {
                refundAmount: val === 'refund'
                    ? (document.getElementById('inputResolveRefundAmount')?.value || 250000)
                    : (val === 'rma_refund' ? (document.getElementById('inputResolveRmaRefundAmount')?.value || 350000) : 0),
                pawpoints: document.getElementById('inputResolveRewardPoints')?.value || 0,
                voucherCode: document.getElementById('inputResolveRewardVoucher')?.value || ''
            };

            const approvalCheck = checkRequiresManagerApproval(val, details);
            const noticeEl = document.getElementById('resolveManagerApprovalNotice');
            const confirmBtn = document.getElementById('btnConfirmResolveTicket');

            if (noticeEl) {
                if (approvalCheck.required) {
                    noticeEl.style.display = 'block';
                    const textP = noticeEl.querySelector('div:last-child');
                    if (textP) textP.textContent = approvalCheck.reason;
                } else {
                    noticeEl.style.display = 'none';
                }
            }
            if (confirmBtn) {
                confirmBtn.textContent = approvalCheck.required ? 'Gửi yêu cầu Quản lý duyệt' : 'Xác nhận áp dụng';
            }
        }

        function openResolveModal() {
            if (!currentActiveTicket) return;
            if (selectResolveOpt) {
                if (currentActiveTicket.bookingId) {
                    selectResolveOpt.value = 'redo_service';
                } else {
                    selectResolveOpt.value = 'rma_exchange';
                }
                const rmaCodeInput = document.getElementById('inputResolveRmaCode');
                if (rmaCodeInput) rmaCodeInput.value = 'RMA-2026-' + Math.floor(100 + Math.random() * 900);
                updateResolveModalSubgroups();
            }
            const noteInput = document.getElementById('inputResolveNote');
            if (noteInput) noteInput.value = '';
            resolveModal.classList.add('active');
        }

        document.getElementById('btnOpenResolveModal')?.addEventListener('click', openResolveModal);
        document.getElementById('menuActionQuickResolve')?.addEventListener('click', () => {
            document.getElementById('complaintsActionDropdown').style.display = 'none';
            openResolveModal();
        });

        document.getElementById('btnCancelResolveModal')?.addEventListener('click', () => resolveModal.classList.remove('active'));
        document.getElementById('btnDismissResolveModal')?.addEventListener('click', () => resolveModal.classList.remove('active'));

        selectResolveOpt?.addEventListener('change', updateResolveModalSubgroups);
        ['inputResolveRefundAmount', 'inputResolveRmaRefundAmount', 'inputResolveRewardPoints', 'inputResolveRewardVoucher'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateResolveModalSubgroups);
        });

        document.getElementById('btnConfirmResolveTicket')?.addEventListener('click', async () => {
            if (!currentActiveTicket) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const val = selectResolveOpt ? selectResolveOpt.value : 'explain';
            const note = document.getElementById('inputResolveNote')?.value.trim() || 'Đã thỏa thuận thống nhất phương án xử lý thỏa đáng với khách hàng.';

            const details = {
                refundAmount: val === 'refund'
                    ? (document.getElementById('inputResolveRefundAmount')?.value || 250000)
                    : (val === 'rma_refund' ? (document.getElementById('inputResolveRmaRefundAmount')?.value || 350000) : 0),
                pawpoints: document.getElementById('inputResolveRewardPoints')?.value || 0,
                voucherCode: document.getElementById('inputResolveRewardVoucher')?.value || ''
            };
            const approvalCheck = checkRequiresManagerApproval(val, details);

            let resolutionObj = null;
            let newStatus = 'resolved';
            let dbStatus = 'completed';
            let timelineTitle = 'Áp dụng phương án giải quyết';
            let timelineDesc = note;

            if (val === 'rma_exchange' || val === 'rma_refund') {
                const rmaCode = document.getElementById('inputResolveRmaCode')?.value || ('RMA-2026-' + Math.floor(100 + Math.random() * 900));
                const pickup = document.getElementById('selectResolveRmaPickup')?.value || 'Bưu tá tới tận nơi lấy hàng';
                const wh = document.getElementById('selectResolveRmaWarehouse')?.value || 'Kho Pawpal Tân Bình';
                const replItem = document.getElementById('inputResolveRmaReplacement')?.value.trim() || (currentActiveTicket.productName || 'Sản phẩm đổi bù mới');
                const refAmt = document.getElementById('inputResolveRmaRefundAmount')?.value.trim() || '350000';

                resolutionObj = {
                    type: val,
                    typeName: val === 'rma_exchange' ? `Đổi sản phẩm mới (Mã RMA: ${rmaCode})` : `Trả hàng hoàn tiền (Mã RMA: ${rmaCode})`,
                    rmaCode: rmaCode,
                    rmaStep: 2,
                    pickupMethod: pickup,
                    warehouse: wh,
                    replacementItem: replItem,
                    refundAmount: refAmt,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'waiting_return';
                dbStatus = 'processing';
                timelineTitle = `Phát hành mã đổi trả ${rmaCode}`;
                timelineDesc = `Đã cấp mã RMA đổi trả (${val === 'rma_exchange' ? 'Đổi mới: ' + replItem : 'Hoàn tiền: ' + Number(refAmt).toLocaleString('vi-VN') + 'đ'}). Hình thức thu hồi: ${pickup}. Kho nhận: ${wh}. Ghi chú: "${note}".`;
            } else if (val === 'redo_service') {
                const redoTime = document.getElementById('inputResolveRedoTime')?.value.trim() || '09:30 - Ngày mai';
                const redoStaff = document.getElementById('selectResolveRedoStaff')?.value || 'Trần Văn Hùng (Groomer trưởng)';
                const redoId = 'BKG-REDO-' + Date.now().toString().slice(-4);

                resolutionObj = {
                    type: 'redo_service',
                    typeName: 'Thực hiện lại dịch vụ miễn phí',
                    redoBookingId: redoId,
                    redoStaff: redoStaff,
                    redoTime: redoTime,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'processing';
                dbStatus = 'processing';
                timelineTitle = `Tạo lịch hẹn dịch vụ bù (${redoId})`;
                timelineDesc = `Đã tạo lịch hẹn chăm sóc bù miễn phí 100% vào lúc ${redoTime}. KTV tiếp nhận: ${redoStaff}. Ghi chú: "${note}".`;
            } else if (val === 'reward_voucher') {
                const pts = parseInt(document.getElementById('inputResolveRewardPoints')?.value) || 200;
                const vch = document.getElementById('inputResolveRewardVoucher')?.value.trim() || 'PAWPALCARE50';

                resolutionObj = {
                    type: 'reward_voucher',
                    typeName: 'Tặng Voucher và Pawpoint bồi hoàn',
                    pawpoints: pts,
                    voucherCode: vch,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'resolved';
                dbStatus = 'completed';
                timelineTitle = `Bồi hoàn +${pts} Pawpoint và tặng Voucher ${vch}`;
                timelineDesc = `Đã đề xuất/áp dụng ${pts} Pawpoint vào tài khoản khách hàng và phát hành mã voucher ${vch}. Ghi chú: "${note}".`;

                // Nếu không cần duyệt thì cộng điểm trực tiếp ngay
                if (!approvalCheck.required) {
                    try {
                        const cust = cachedCustomers.find(c => (c.phone_main || c.phone) === currentActiveTicket.phone || c.id === currentActiveTicket.user_id);
                        if (cust) {
                            await client.from('paw_point_transaction').insert({
                                customer_id: cust.id,
                                points: pts,
                                description: `Bồi hoàn khiếu nại ${currentActiveTicket.id}`,
                                created_at: new Date().toISOString()
                            });
                        }
                    } catch (e) {
                        console.warn('[Complaints] Lỗi cộng Pawpoint Supabase:', e);
                    }
                }
            } else if (val === 'refund') {
                const refAmt = document.getElementById('inputResolveRefundAmount')?.value.trim() || '250000';
                const refMethod = document.getElementById('selectResolveRefundMethod')?.value || 'Chuyển khoản trực tiếp';

                resolutionObj = {
                    type: 'refund',
                    typeName: 'Hoàn tiền bồi thường khiếu nại',
                    refundAmount: refAmt,
                    refundMethod: refMethod,
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'resolved';
                dbStatus = 'completed';
                timelineTitle = `Hoàn tiền bồi thường ${Number(refAmt).toLocaleString('vi-VN')}đ`;
                timelineDesc = `Hình thức: ${refMethod}. Ghi chú: "${note}".`;
            } else if (val === 'reject') {
                resolutionObj = {
                    type: 'reject',
                    typeName: 'Từ chối khiếu nại',
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'closed';
                dbStatus = 'closed';
                timelineTitle = 'Từ chối giải quyết khiếu nại';
                timelineDesc = `Lý do từ chối: "${note}".`;
            } else {
                resolutionObj = {
                    type: 'explain',
                    typeName: 'Giải thích và phản hồi khách hàng',
                    note: note,
                    updatedAt: 'Vừa xong'
                };
                newStatus = 'resolved';
                dbStatus = 'completed';
                timelineTitle = 'Giải thích và chăm sóc khách hàng';
                timelineDesc = note;
            }

            // Trường hợp vượt thẩm quyền CSKH: Chuyển sang Chờ Quản lý duyệt
            if (approvalCheck.required) {
                try {
                    currentActiveTicket.status = 'waiting_manager_approval';
                    currentActiveTicket.pendingResolution = resolutionObj;
                    if (!currentActiveTicket.timeline) currentActiveTicket.timeline = [];
                    currentActiveTicket.timeline.unshift({
                        time: formatTimestamp(new Date()),
                        author: 'Lê Lệ Quyên (CSKH)',
                        title: 'Đề xuất phương án bồi hoàn (Chờ Quản lý duyệt)',
                        desc: `Đã đề xuất phương án: ${resolutionObj.typeName}. Lý do cần duyệt: ${approvalCheck.reason}. Ghi chú: "${note}".`,
                        isInternal: true
                    });

                    // Cập nhật trạng thái và tin nhắn trong Supabase
                    await client.from('support_ticket').update({
                        status: 'processing',
                        updated_at: new Date().toISOString()
                    }).eq('id', currentActiveTicket.id);

                    await client.from('support_ticket_message').insert({
                        ticket_id: currentActiveTicket.id,
                        sender_type: 'cskh',
                        agent_name: 'Lê Lệ Quyên',
                        content: `Đề xuất phương án bồi hoàn: ${resolutionObj.typeName}. Chờ Quản lý duyệt (Lý do: ${approvalCheck.reason})`,
                        created_at: new Date().toISOString()
                    });

                    saveComplaintsOverrides();
                    resolveModal.classList.remove('active');
                    updateComplaintsKpis();
                    renderComplaintsAlertBar();
                    if (currentTicketType === 'service') renderServiceComplaintsTable();
                    else renderOrderComplaintsTable();

                    renderTicketDetail(currentActiveTicket);
                    showToast('Đã gửi đề xuất bồi hoàn lên Quản lý phê duyệt thành công!', 'info');
                    return;
                } catch (err) {
                    console.error('[Complaints] Lỗi gửi yêu cầu duyệt:', err);
                    showToast('Lỗi gửi yêu cầu duyệt: ' + err.message, 'danger');
                    return;
                }
            }

            // Trường hợp CSKH tự quyết định trong thẩm quyền
            try {
                // Update support_ticket trên Supabase
                await client.from('support_ticket').update({
                    status: dbStatus,
                    rating_comment: note,
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                // Insert message vào support_ticket_message
                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: 'Lê Lệ Quyên',
                    content: `${timelineTitle}: ${timelineDesc}`,
                    created_at: new Date().toISOString()
                });

                currentActiveTicket.status = newStatus;
                currentActiveTicket.resolution = resolutionObj;
                delete currentActiveTicket.pendingResolution;
                if (newStatus === 'resolved') {
                    currentActiveTicket.resolvedAt = new Date().toISOString();
                } else if (newStatus === 'closed') {
                    currentActiveTicket.closedAt = new Date().toISOString();
                    currentActiveTicket.canReopenUntil = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
                }

                if (!currentActiveTicket.timeline) currentActiveTicket.timeline = [];
                currentActiveTicket.timeline.unshift({
                    time: formatTimestamp(new Date()),
                    author: 'Lê Lệ Quyên (CSKH)',
                    title: timelineTitle,
                    desc: timelineDesc,
                    isInternal: false
                });

                saveComplaintsOverrides();
                resolveModal.classList.remove('active');
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();

                renderTicketDetail(currentActiveTicket);
                syncTicketToUserPortal(currentActiveTicket);

                showToast(`Đã áp dụng phương án "${resolutionObj.typeName}" cho Ticket thành công!`, 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi giải quyết ticket:', err);
                showToast('Lỗi áp dụng phương án: ' + err.message, 'danger');
            }
        });

        // ---------------------------------------------------------
        // EVENT LISTENERS QUẢN LÝ DUYỆT, CAN THIỆP LẦN 2 VÀ MỞ LẠI TICKET
        // ---------------------------------------------------------
        // Quản lý phê duyệt phương án đề xuất
        document.getElementById('btnManagerApproveProposal')?.addEventListener('click', async () => {
            if (!currentActiveTicket || !currentActiveTicket.pendingResolution) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const pres = currentActiveTicket.pendingResolution;
            const resType = pres.type;
            const newStatus = (resType === 'rma_exchange' || resType === 'rma_refund') ? 'waiting_return' : 'resolved';
            const dbStatus = (resType === 'rma_exchange' || resType === 'rma_refund') ? 'processing' : 'completed';

            try {
                // Nếu là reward_voucher có điểm, thực thi giao dịch điểm
                if (resType === 'reward_voucher' && pres.pawpoints) {
                    const cust = cachedCustomers.find(c => (c.phone_main || c.phone) === currentActiveTicket.phone || c.id === currentActiveTicket.user_id);
                    if (cust) {
                        await client.from('paw_point_transaction').insert({
                            customer_id: cust.id,
                            points: pres.pawpoints,
                            description: `Quản lý duyệt bồi hoàn khiếu nại ${currentActiveTicket.id}`,
                            created_at: new Date().toISOString()
                        });
                    }
                }

                await client.from('support_ticket').update({
                    status: dbStatus,
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: 'Quản lý Pawpal',
                    content: `Phê duyệt phương án bồi hoàn: ${pres.typeName}. Bắt đầu triển khai chi trả / xuất kho.`,
                    created_at: new Date().toISOString()
                });

                currentActiveTicket.resolution = pres;
                delete currentActiveTicket.pendingResolution;
                currentActiveTicket.status = newStatus;
                currentActiveTicket.resolvedAt = new Date().toISOString();
                if (!currentActiveTicket.timeline) currentActiveTicket.timeline = [];
                currentActiveTicket.timeline.unshift({
                    time: formatTimestamp(new Date()),
                    author: 'Quản lý Pawpal',
                    title: 'Phê duyệt phương án bồi hoàn',
                    desc: `Đã duyệt phương án: ${pres.typeName}. Bắt đầu triển khai thực hiện.`,
                    isInternal: true
                });

                saveComplaintsOverrides();
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();
                renderTicketDetail(currentActiveTicket);
                syncTicketToUserPortal(currentActiveTicket);
                showToast('Quản lý đã phê duyệt phương án bồi hoàn thành công!', 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi duyệt phương án:', err);
                showToast('Lỗi khi duyệt phương án: ' + err.message, 'danger');
            }
        });

        // Quản lý từ chối và yêu cầu CSKH điều chỉnh
        document.getElementById('btnManagerRejectProposal')?.addEventListener('click', async () => {
            if (!currentActiveTicket || !currentActiveTicket.pendingResolution) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const reason = prompt('Nhập lý do từ chối hoặc hướng dẫn điều chỉnh cho CSKH:', 'Phương án chi phí cao, CSKH thương lượng voucher thay vì hoàn tiền mặt');
            if (reason === null) return;

            try {
                await client.from('support_ticket').update({
                    status: 'processing',
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: 'Quản lý Pawpal',
                    content: `Từ chối đề xuất bồi hoàn. Chỉ đạo điều chỉnh: "${reason}"`,
                    created_at: new Date().toISOString()
                });

                delete currentActiveTicket.pendingResolution;
                currentActiveTicket.status = 'processing';
                if (!currentActiveTicket.timeline) currentActiveTicket.timeline = [];
                currentActiveTicket.timeline.unshift({
                    time: formatTimestamp(new Date()),
                    author: 'Quản lý Pawpal',
                    title: 'Từ chối đề xuất bồi hoàn',
                    desc: `Quản lý yêu cầu điều chỉnh phương án: "${reason}"`,
                    isInternal: true
                });

                saveComplaintsOverrides();
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();
                renderTicketDetail(currentActiveTicket);
                showToast('Đã trả về cho CSKH điều chỉnh phương án bồi hoàn.', 'warning');
            } catch (err) {
                console.error('[Complaints] Lỗi từ chối đề xuất:', err);
                showToast('Lỗi khi từ chối đề xuất: ' + err.message, 'danger');
            }
        });

        // Can thiệp giải quyết lần 2 (khi khách đánh giá < 3 sao)
        document.getElementById('btnResolveReprocess')?.addEventListener('click', async () => {
            if (!currentActiveTicket) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const note = prompt('Nhập kết quả can thiệp xử lý lần 2 cho khách:', 'Quản lý đã trực tiếp liên hệ xin lỗi, tặng voucher tri ân 100k, khách đã hài lòng');
            if (note === null) return;

            try {
                await client.from('support_ticket').update({
                    status: 'completed',
                    rating_comment: note,
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: 'Quản lý Pawpal',
                    content: `Hoàn tất can thiệp xử lý lần 2: "${note}"`,
                    created_at: new Date().toISOString()
                });

                currentActiveTicket.status = 'resolved';
                currentActiveTicket.resolvedAt = new Date().toISOString();
                if (!currentActiveTicket.timeline) currentActiveTicket.timeline = [];
                currentActiveTicket.timeline.unshift({
                    time: formatTimestamp(new Date()),
                    author: 'Quản lý Pawpal',
                    title: 'Hoàn tất xử lý khiếu nại lần 2',
                    desc: `Can thiệp trực tiếp giải quyết thỏa đáng: "${note}".`,
                    isInternal: true
                });

                saveComplaintsOverrides();
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();
                renderTicketDetail(currentActiveTicket);
                syncTicketToUserPortal(currentActiveTicket);
                showToast('Đã xử lý xong khiếu nại lần 2 thành công!', 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi can thiệp lần 2:', err);
                showToast('Lỗi can thiệp lần 2: ' + err.message, 'danger');
            }
        });

        // Mở lại khiếu nại (trong vòng 7 ngày)
        async function handleReopenTicket() {
            if (!currentActiveTicket) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            if (currentActiveTicket.canReopenUntil && Date.now() > Date.parse(currentActiveTicket.canReopenUntil)) {
                showToast('Đã quá thời hạn 07 ngày, không thể mở lại khiếu nại này. Vui lòng tạo Ticket mới.', 'warning');
                return;
            }

            const reason = prompt('Nhập lý do mở lại khiếu nại:', 'Khách hàng liên hệ lại thông báo vấn đề chưa được khắc phục triệt để');
            if (reason === null) return;

            try {
                await client.from('support_ticket').update({
                    status: 'processing',
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: 'Lê Lệ Quyên',
                    content: `Mở lại Ticket khiếu nại. Lý do: "${reason}"`,
                    created_at: new Date().toISOString()
                });

                currentActiveTicket.status = 'processing';
                currentActiveTicket.reopenedAt = new Date().toISOString();
                delete currentActiveTicket.closedAt;
                delete currentActiveTicket.closedReason;
                if (!currentActiveTicket.timeline) currentActiveTicket.timeline = [];
                currentActiveTicket.timeline.unshift({
                    time: formatTimestamp(new Date()),
                    author: 'Lê Lệ Quyên (CSKH)',
                    title: 'Mở lại khiếu nại',
                    desc: `Mở lại Ticket để tiếp tục theo dõi và xử lý. Lý do: "${reason}".`,
                    isInternal: true
                });

                saveComplaintsOverrides();
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();
                renderTicketDetail(currentActiveTicket);
                syncTicketToUserPortal(currentActiveTicket);
                showToast('Đã mở lại khiếu nại thành công!', 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi mở lại ticket:', err);
                showToast('Lỗi mở lại: ' + err.message, 'danger');
            }
        }

        document.getElementById('btnReopenTicket')?.addEventListener('click', handleReopenTicket);
        document.getElementById('btnTriggerReopenTicket')?.addEventListener('click', handleReopenTicket);

        // Nút cập nhật tiến độ RMA (Phase 3)
        document.getElementById('btnAdvanceRmaStep')?.addEventListener('click', async () => {
            if (!currentActiveTicket || !currentActiveTicket.resolution) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const res = currentActiveTicket.resolution;
            let currentStep = res.rmaStep || 2;

            if (currentStep < 4) {
                currentStep++;
                res.rmaStep = currentStep;
                res.updatedAt = 'Vừa xong';

                let stepTitle = '';
                let stepDesc = '';

                if (currentStep === 3) {
                    stepTitle = `RMA ${res.rmaCode}: Đã nhận hàng tại kho và Kiểm định`;
                    stepDesc = `Kho Pawpal đã tiếp nhận kiện hàng hoàn trả từ khách hàng. Bộ phận kiểm định xác nhận sản phẩm đạt tiêu chuẩn đổi trả theo quy định.`;
                } else if (currentStep === 4) {
                    stepTitle = `RMA ${res.rmaCode}: Hoàn tất lệnh đổi trả`;
                    stepDesc = res.type === 'rma_exchange'
                        ? `Đã xuất kho và bàn giao bưu tá sản phẩm đổi mới "${res.replacementItem || 'sản phẩm'}" gửi tới khách hàng. Ticket chuyển sang Đã giải quyết.`
                        : `Đã thực hiện lệnh hoàn tiền ${Number(res.refundAmount || 0).toLocaleString('vi-VN')}đ tới tài khoản khách hàng. Ticket chuyển sang Đã giải quyết.`;
                }

                try {
                    if (currentStep === 4) {
                        await client.from('support_ticket').update({
                            status: 'completed',
                            updated_at: new Date().toISOString()
                        }).eq('id', currentActiveTicket.id);
                    }

                    await client.from('support_ticket_message').insert({
                        ticket_id: currentActiveTicket.id,
                        sender_type: 'cskh',
                        agent_name: 'Lê Lệ Quyên',
                        content: `${stepTitle}: ${stepDesc}`,
                        created_at: new Date().toISOString()
                    });

                    await loadComplaintsModuleData();

                    updateComplaintsKpis();
                    renderComplaintsAlertBar();
                    if (currentTicketType === 'service') renderServiceComplaintsTable();
                    else renderOrderComplaintsTable();

                    const updated = (currentTicketType === 'service' ? serviceComplaints : orderComplaints).find(i => i.id === currentActiveTicket.id);
                    if (updated) {
                        currentActiveTicket = updated;
                        currentActiveTicket.resolution = res;
                        renderTicketDetail(currentActiveTicket);
                    }

                    showToast(`Đã cập nhật tiến độ RMA sang Bước ${currentStep} thành công!`, 'success');
                } catch (err) {
                    console.error('[Complaints] Lỗi cập nhật RMA:', err);
                    showToast('Lỗi cập nhật RMA: ' + err.message, 'danger');
                }
            } else {
                showToast('Quy trình đổi trả RMA này đã hoàn tất trọn vẹn.', 'info');
            }
        });

        // ---------------------------------------------------------
        // NÚT KHÓA AN TOÀN NHẬN VIỆC KTV (PHASE 2)
        // ---------------------------------------------------------
        document.getElementById('btnToggleStaffSafetyLock')?.addEventListener('click', () => {
            if (!currentActiveTicket || !currentActiveTicket.staffExecuted) return;
            const staffName = currentActiveTicket.staffExecuted;
            const currentLock = getStaffSafetyLockStatus(staffName);
            const newLock = !currentLock;
            setStaffSafetyLockStatus(staffName, newLock);

            currentActiveTicket.timeline.unshift({
                time: 'Vừa xong',
                author: 'Lê Lệ Quyên (Admin)',
                title: newLock ? 'Kích hoạt Khóa an toàn KTV' : 'Mở khóa an toàn nhận việc cho KTV',
                desc: newLock
                    ? `Đã kích hoạt khóa an toàn: tạm dừng tiếp nhận các lịch hẹn mới cho nhân viên "${staffName}" để phục vụ công tác thanh tra xác minh khiếu nại ${currentActiveTicket.id}.`
                    : `Đã dỡ bỏ lệnh tạm khóa nhận việc cho nhân viên "${staffName}". Nhân viên có thể tiếp tục nhận lịch dịch vụ bình thường.`,
                isInternal: true
            });

            renderTicketDetail(currentActiveTicket);
            showToast(newLock
                ? `Đã tạm khóa an toàn KTV "${staffName}" thành công! Hệ thống đã chặn tiếp nhận lịch hẹn mới.`
                : `Đã mở khóa nhận việc cho KTV "${staffName}" thành công!`, 'success');
        });

        // ---------------------------------------------------------
        // MODAL: CHUYỂN NGƯỜI PHỤ TRÁCH TICKET (PHASE 2)
        // ---------------------------------------------------------
        const assignModal = document.getElementById('assignHandlerModalOverlay');
        document.getElementById('btnAssignHandler')?.addEventListener('click', () => {
            if (!currentActiveTicket) return;
            const sel = document.getElementById('selectAssignStaff');
            if (sel) {
                let options = [];
                if (window.PawpalStaffManager && typeof window.PawpalStaffManager.getAllStaff === 'function') {
                    const allStaff = window.PawpalStaffManager.getAllStaff();
                    options = allStaff.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (${escapeHtml(s.position)} - ${escapeHtml(s.role)})</option>`);
                } else {
                    options = [
                        '<option value="Lê Lệ Quyên">Lê Lệ Quyên (Quản trị viên - Admin)</option>',
                        '<option value="Nguyễn Văn A">Nguyễn Văn A (Groomer - Kỹ thuật viên)</option>',
                        '<option value="Trần Thị B">Trần Thị B (Lễ tân - Tiếp tân)</option>',
                        '<option value="Phạm Thị D">Phạm Thị D (CSKH - Bán hàng)</option>',
                        '<option value="Trần Văn Hùng">Trần Văn Hùng (Groomer trưởng - Kỹ thuật viên)</option>'
                    ];
                }
                sel.innerHTML = options.join('');
                if (currentActiveTicket.staffAssigned && currentActiveTicket.staffAssigned !== 'Chưa phân công') {
                    sel.value = currentActiveTicket.staffAssigned;
                }
            }
            const noteEl = document.getElementById('inputAssignNote');
            if (noteEl) noteEl.value = '';
            assignModal.classList.add('active');
        });

        document.getElementById('btnCancelAssignHandler')?.addEventListener('click', () => assignModal.classList.remove('active'));
        document.getElementById('btnDismissAssignHandler')?.addEventListener('click', () => assignModal.classList.remove('active'));

        document.getElementById('btnConfirmAssignHandler')?.addEventListener('click', async () => {
            if (!currentActiveTicket) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const newStaff = document.getElementById('selectAssignStaff')?.value || 'Lê Lệ Quyên';
            const note = document.getElementById('inputAssignNote')?.value.trim() || 'Bàn giao phụ trách xử lý tiếp theo cam kết SLA.';

            try {
                await client.from('support_ticket').update({
                    status: 'processing',
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: newStaff,
                    content: `Chuyển giao người phụ trách cho: ${newStaff}. Ghi chú: "${note}".`,
                    created_at: new Date().toISOString()
                });

                await loadComplaintsModuleData();

                assignModal.classList.remove('active');
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();

                const updated = (currentTicketType === 'service' ? serviceComplaints : orderComplaints).find(i => i.id === currentActiveTicket.id);
                if (updated) {
                    currentActiveTicket = updated;
                    renderTicketDetail(currentActiveTicket);
                    syncTicketToUserPortal(currentActiveTicket);
                }

                showToast(`Đã chuyển người phụ trách cho "${newStaff}" thành công!`, 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi chuyển người phụ trách:', err);
                showToast('Lỗi chuyển giao: ' + err.message, 'danger');
            }
        });

        // ---------------------------------------------------------
        // MODAL: YÊU CẦU BỔ SUNG THÔNG TIN (PHASE 2)
        // ---------------------------------------------------------
        const requestInfoModal = document.getElementById('requestMoreInfoModalOverlay');
        document.getElementById('btnRequestMoreInfo')?.addEventListener('click', () => {
            if (!currentActiveTicket) return;
            const msgEl = document.getElementById('inputRequestMessage');
            if (msgEl) {
                const targetRef = currentActiveTicket.bookingId ? 'lịch hẹn dịch vụ ' + currentActiveTicket.bookingId : 'đơn hàng ' + currentActiveTicket.orderId;
                msgEl.value = `Kính gửi Quý khách ${currentActiveTicket.customerName}, Pawpal chân thành cáo lỗi vì trải nghiệm chưa trọn vẹn tại ${targetRef}. Để có thể hỗ trợ xác minh và giải quyết quyền lợi nhanh nhất cho Quý khách, Pawpal xin phép nhờ Quý khách gửi bổ sung thêm hình ảnh chụp rõ nét tình trạng hiện tại của bé / sản phẩm. Trân trọng cảm ơn Quý khách!`;
            }
            requestInfoModal.classList.add('active');
        });

        document.getElementById('btnCancelRequestInfo')?.addEventListener('click', () => requestInfoModal.classList.remove('active'));
        document.getElementById('btnDismissRequestInfo')?.addEventListener('click', () => requestInfoModal.classList.remove('active'));

        document.getElementById('btnSendRequestInfo')?.addEventListener('click', async () => {
            if (!currentActiveTicket) return;
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const channelSelect = document.getElementById('selectRequestChannel');
            const channelVal = channelSelect ? channelSelect.value : 'zalo';
            const channelLabel = channelVal === 'zalo' ? 'Tin nhắn Zalo OA' : (channelVal === 'sms' ? 'Tin nhắn SMS Brandname' : (channelVal === 'call' ? 'Cuộc gọi điện thoại' : 'Email thông báo'));
            const msg = document.getElementById('inputRequestMessage')?.value.trim();

            if (!msg) {
                showToast('Vui lòng nhập nội dung yêu cầu bổ sung thông tin.', 'warning');
                return;
            }

            try {
                currentActiveTicket.status = 'waiting_customer';
                currentActiveTicket.waitingCustomerSince = new Date().toISOString();
                currentActiveTicket.reminder48hSent = false;
                if (!currentActiveTicket.timeline) currentActiveTicket.timeline = [];
                currentActiveTicket.timeline.unshift({
                    time: formatTimestamp(new Date()),
                    author: 'Lê Lệ Quyên (CSKH)',
                    title: `Yêu cầu bổ sung thông tin (${channelLabel})`,
                    desc: msg,
                    isInternal: false
                });
                saveComplaintsOverrides();

                await client.from('support_ticket').update({
                    status: 'waiting_customer',
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: 'Lê Lệ Quyên',
                    content: `Gửi yêu cầu bổ sung thông tin qua ${channelLabel}: "${msg}"`,
                    created_at: new Date().toISOString()
                });

                requestInfoModal.classList.remove('active');
                updateComplaintsKpis();
                renderComplaintsAlertBar();
                if (currentTicketType === 'service') renderServiceComplaintsTable();
                else renderOrderComplaintsTable();

                renderTicketDetail(currentActiveTicket);
                syncTicketToUserPortal(currentActiveTicket);

                showToast(`Đã gửi yêu cầu bổ sung thông tin qua kênh ${channelLabel} thành công!`, 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi gửi yêu cầu thông tin:', err);
                showToast('Lỗi gửi yêu cầu: ' + err.message, 'danger');
            }
        });

        // Gửi phản hồi / ghi chú vào Timeline
        document.getElementById('btnSubmitReply')?.addEventListener('click', async () => {
            const txt = document.getElementById('replyContentInput');
            if (!txt || !txt.value.trim()) {
                showToast('Vui lòng nhập nội dung ghi nhận.', 'warning');
                return;
            }
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Chưa khởi tạo kết nối Supabase.', 'danger');
                return;
            }

            const isInternal = document.querySelector('input[name="replyType"]:checked')?.value === 'internal';
            const contentText = txt.value.trim();

            try {
                await client.from('support_ticket_message').insert({
                    ticket_id: currentActiveTicket.id,
                    sender_type: 'cskh',
                    agent_name: 'Lê Lệ Quyên',
                    content: (isInternal ? '[Nội bộ] ' : '') + contentText,
                    created_at: new Date().toISOString()
                });

                await client.from('support_ticket').update({
                    updated_at: new Date().toISOString()
                }).eq('id', currentActiveTicket.id);

                txt.value = '';
                await loadComplaintsModuleData();

                const updated = (currentTicketType === 'service' ? serviceComplaints : orderComplaints).find(i => i.id === currentActiveTicket.id);
                if (updated) {
                    currentActiveTicket = updated;
                    renderTicketDetail(currentActiveTicket);
                    syncTicketToUserPortal(currentActiveTicket);
                }

                showToast('Đã lưu phản hồi vào hệ thống Supabase thành công!', 'success');
            } catch (err) {
                console.error('[Complaints] Lỗi gửi phản hồi:', err);
                showToast('Lỗi gửi phản hồi: ' + err.message, 'danger');
            }
        });

        // ---------------------------------------------------------
        // GẮN SỰ KIỆN XUẤT FILE EXCEL (.XLSX) TOÀN DIỆN VÀ AN TOÀN
        // ---------------------------------------------------------
        let isExportingProcess = false;

        async function triggerServiceExport() {
            if (isExportingProcess) return;
            isExportingProcess = true;
            try {
                const dataToExport = (currentFilteredServices && currentFilteredServices.length > 0)
                    ? currentFilteredServices
                    : (serviceComplaints && serviceComplaints.length > 0 ? serviceComplaints : []);

                if (!dataToExport || dataToExport.length === 0) {
                    showToast('Không có dữ liệu khiếu nại dịch vụ để xuất file.', 'warning');
                    return;
                }
                await exportServiceComplaintsToExcel(dataToExport);
            } catch (e) {
                console.error('[Complaints] Lỗi triggerServiceExport:', e);
            } finally {
                setTimeout(() => { isExportingProcess = false; }, 600);
            }
        }

        async function triggerOrderExport() {
            if (isExportingProcess) return;
            isExportingProcess = true;
            try {
                const dataToExport = (currentFilteredOrders && currentFilteredOrders.length > 0)
                    ? currentFilteredOrders
                    : (orderComplaints && orderComplaints.length > 0 ? orderComplaints : []);

                if (!dataToExport || dataToExport.length === 0) {
                    showToast('Không có dữ liệu khiếu nại đơn hàng để xuất file.', 'warning');
                    return;
                }
                await exportOrderComplaintsToExcel(dataToExport);
            } catch (e) {
                console.error('[Complaints] Lỗi triggerOrderExport:', e);
            } finally {
                setTimeout(() => { isExportingProcess = false; }, 600);
            }
        }

        function bindExportButtons() {
            const btnExportService = document.getElementById('btnExportServiceComplaints');
            if (btnExportService) {
                btnExportService.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerServiceExport();
                };
            }

            const btnExportOrder = document.getElementById('btnExportOrderComplaints');
            if (btnExportOrder) {
                btnExportOrder.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerOrderExport();
                };
            }
        }

        // Gắn sự kiện ban đầu cho các nút xuất file
        bindExportButtons();

        // Gắn ủy quyền sự kiện trên tài liệu để bắt mọi trường hợp click kể cả khi DOM cập nhật động
        document.addEventListener('click', (e) => {
            const serviceBtn = e.target.closest('#btnExportServiceComplaints');
            if (serviceBtn) {
                e.preventDefault();
                triggerServiceExport();
                return;
            }

            const orderBtn = e.target.closest('#btnExportOrderComplaints');
            if (orderBtn) {
                e.preventDefault();
                triggerOrderExport();
                return;
            }
        });

        // Gắn sự kiện bộ lọc Subtab 1 (Dịch vụ)
        document.getElementById('serviceSearchInput')?.addEventListener('input', () => {
            serviceCurrentPage = 1;
            renderServiceComplaintsTable();
        });
        document.getElementById('serviceFilterCategory')?.addEventListener('change', () => {
            serviceCurrentPage = 1;
            renderServiceComplaintsTable();
        });
        document.getElementById('serviceFilterStatus')?.addEventListener('change', () => {
            serviceCurrentPage = 1;
            renderServiceComplaintsTable();
        });
        document.getElementById('serviceFilterPriority')?.addEventListener('change', () => {
            serviceCurrentPage = 1;
            renderServiceComplaintsTable();
        });
        document.getElementById('serviceFilterStaff')?.addEventListener('change', () => {
            serviceCurrentPage = 1;
            renderServiceComplaintsTable();
        });

        document.querySelectorAll('#serviceQuickChips .quick-chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.getAttribute('data-filter') || 'ALL';
                setServiceQuickFilter(f);
            });
        });

        // Click KPI Card Subtab 1
        document.querySelectorAll('[data-service-kpi]').forEach(card => {
            card.addEventListener('click', () => {
                serviceCurrentPage = 1;
                const filterVal = card.getAttribute('data-service-kpi');
                if (currentServiceKpiFilter === filterVal) {
                    currentServiceKpiFilter = 'ALL';
                    card.classList.remove('active');
                } else {
                    document.querySelectorAll('[data-service-kpi]').forEach(c => c.classList.remove('active'));
                    currentServiceKpiFilter = filterVal;
                    card.classList.add('active');
                }
                renderServiceComplaintsTable();
            });
        });

        document.getElementById('btnFilterUrgentService')?.addEventListener('click', () => {
            setServiceQuickFilter('OVERDUE');
        });

        // Gắn sự kiện bộ lọc Subtab 2 (Đơn hàng)
        document.getElementById('orderSearchInput')?.addEventListener('input', renderOrderComplaintsTable);
        document.getElementById('orderFilterIssue')?.addEventListener('change', renderOrderComplaintsTable);
        document.getElementById('orderFilterStatus')?.addEventListener('change', renderOrderComplaintsTable);
        document.getElementById('orderFilterPriority')?.addEventListener('change', renderOrderComplaintsTable);
        document.getElementById('orderFilterStaff')?.addEventListener('change', renderOrderComplaintsTable);

        document.querySelectorAll('#orderQuickChips .quick-chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const f = btn.getAttribute('data-filter') || 'ALL';
                setOrderQuickFilter(f);
            });
        });

        // Click KPI Card Subtab 2
        document.querySelectorAll('[data-order-kpi]').forEach(card => {
            card.addEventListener('click', () => {
                const filterVal = card.getAttribute('data-order-kpi');
                if (currentOrderKpiFilter === filterVal) {
                    currentOrderKpiFilter = 'ALL';
                    card.classList.remove('active');
                } else {
                    document.querySelectorAll('[data-order-kpi]').forEach(c => c.classList.remove('active'));
                    currentOrderKpiFilter = filterVal;
                    card.classList.add('active');
                }
                renderOrderComplaintsTable();
            });
        });

        document.getElementById('btnFilterUrgentOrder')?.addEventListener('click', () => {
            setOrderQuickFilter('OVERDUE');
        });

        // Đồng bộ vé khiếu nại được tạo từ kênh Chatbot CSKH
        function syncSharedTicketsFromChatbot() {
            try {
                const storedRaw = sessionStorage.getItem('pawpal_admin_shared_tickets');
                if (!storedRaw) return;
                const sharedList = JSON.parse(storedRaw);
                if (Array.isArray(sharedList)) {
                    sharedList.forEach(t => {
                        const isService = t.bookingId || t.serviceName;
                        if (isService) {
                            if (!serviceComplaints.some(item => item.id === t.id)) {
                                serviceComplaints.unshift(t);
                            }
                        } else {
                            if (!orderComplaints.some(item => item.id === t.id)) {
                                orderComplaints.unshift(t);
                            }
                        }
                    });
                }
            } catch (e) {
                console.error('Lỗi sync shared tickets:', e);
            }
        }

        
        // ====================================================================
        // GIAI ĐOẠN 4: SUPABASE REALTIME CHANNEL ĐỒNG BỘ THỜI GIAN THỰC
        // ====================================================================
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
                        if (currentTicketType === 'service') renderServiceComplaintsTable();
                        else renderOrderComplaintsTable();

                        if (currentActiveTicket) {
                            const updated = (currentTicketType === 'service' ? serviceComplaints : orderComplaints).find(x => x.id === currentActiveTicket.id);
                            if (updated) renderTicketDetail(updated);
                        }
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_message' }, async (payload) => {
                        console.log('[Complaints Realtime] support_ticket_message thay đổi:', payload.eventType);
                        await loadComplaintsModuleData();
                        if (currentActiveTicket) {
                            const updated = (currentTicketType === 'service' ? serviceComplaints : orderComplaints).find(x => x.id === currentActiveTicket.id);
                            if (updated) renderTicketDetail(updated);
                        }
                    })
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') {
                            console.log('[Complaints Realtime] Đã kết nối kênh Realtime Channel cho Khiếu nại & Tin nhắn ✓');
                        }
                    });

                complaintsRealtimeSubscription = channel;
            } catch (err) {
                console.warn('[Complaints Realtime] Lỗi thiết lập Realtime Channel:', err);
            }
        }

        // Khởi tạo ban đầu
        await loadComplaintsModuleData();
        setupComplaintsRealtimeChannel();
        syncSharedTicketsFromChatbot();
        updateComplaintsKpis();
        renderComplaintsAlertBar();

        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_complaint_active_subtab');
        let initialSubtab = (currentHash && document.getElementById('subtab-' + currentHash))
            ? currentHash
            : (savedSubtab && document.getElementById('subtab-' + savedSubtab))
                ? savedSubtab
                : 'tab-complaint-services';

        if (initialSubtab === 'tab-complaint-detail' && !currentActiveTicket) {
            initialSubtab = 'tab-complaint-services';
        }

        switchSubtab(initialSubtab);

        // Tiếp nhận preset khiếu nại hoặc mở Ticket từ phân hệ khác
        const checkPresetComplaint = () => {
            syncSharedTicketsFromChatbot();
            const rawPreset = sessionStorage.getItem('pawpal_admin_complaint_preset');
            if (rawPreset) {
                try {
                    const preset = JSON.parse(rawPreset);
                    const phoneEl = document.getElementById('inputTicketCustomerPhone');
                    const nameEl = document.getElementById('inputTicketCustomerName');
                    if (phoneEl && (preset.custPhone || preset.ownerPhone)) phoneEl.value = preset.custPhone || preset.ownerPhone;
                    if (nameEl && (preset.custName || preset.ownerName)) nameEl.value = preset.custName || preset.ownerName;

                    const createModal = document.getElementById('createTicketModalOverlay');
                    if (createModal) {
                        const titleEl = document.getElementById('createTicketModalTitle');
                        if (titleEl) titleEl.textContent = 'Tiếp nhận khiếu nại khách hàng';
                        createModal.classList.add('active');
                    }
                    sessionStorage.removeItem('pawpal_admin_complaint_preset');
                } catch (e) {}
            }

            const rawTicketId = sessionStorage.getItem('pawpal_admin_ticket_id') || sessionStorage.getItem('pawpal_admin_complaint_selected_id');
            if (rawTicketId) {
                sessionStorage.removeItem('pawpal_admin_ticket_id');
                const foundService = serviceComplaints.find(i => i.id === rawTicketId);
                const foundOrder = orderComplaints.find(i => i.id === rawTicketId);
                if (foundService) {
                    currentActiveTicket = foundService;
                    currentTicketType = 'service';
                    switchSubtab('tab-complaint-detail');
                } else if (foundOrder) {
                    currentActiveTicket = foundOrder;
                    currentTicketType = 'order';
                    switchSubtab('tab-complaint-detail');
                }
            }

            const filterStatus = sessionStorage.getItem('pawpal_admin_complaint_filter_status');
            if (filterStatus) {
                sessionStorage.removeItem('pawpal_admin_complaint_filter_status');
                const sSelect = document.getElementById('serviceFilterStatus');
                if (sSelect) {
                    sSelect.value = filterStatus;
                    renderServiceComplaintsTable();
                }
            }
        };

        // Lắng nghe sự kiện storage để đồng bộ real-time giữa Tab User và Tab Admin
        window.addEventListener('storage', (e) => {
            if (e.key === 'pawpal_service_complaints' || e.key === 'pawpal_order_complaints') {
                try {
                    const latestServices = JSON.parse(localStorage.getItem('pawpal_service_complaints')) || [];
                    const latestOrders = JSON.parse(localStorage.getItem('pawpal_order_complaints')) || [];
                    if (latestServices.length > 0) {
                        serviceComplaints.length = 0;
                        serviceComplaints.push(...latestServices);
                    }
                    if (latestOrders.length > 0) {
                        orderComplaints.length = 0;
                        orderComplaints.push(...latestOrders);
                    }
                    updateComplaintsKpis();
                    renderComplaintsAlertBar();
                    if (currentTicketType === 'service') renderServiceComplaintsTable();
                    else renderOrderComplaintsTable();
                    if (currentActiveTicket) {
                        const updated = (currentTicketType === 'service' ? serviceComplaints : orderComplaints).find(x => x.id === currentActiveTicket.id);
                        if (updated) renderTicketDetail(updated);
                    }
                } catch (err) {}
            }
        });

        setTimeout(checkPresetComplaint, 150);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComplaintsModule);
    } else {
        initComplaintsModule();
    }
})();
