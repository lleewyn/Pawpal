// customers.js - Phân hệ Quản lý Khách hàng Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    window.PawpalCustomersModule = PawpalCustomers;

    PawpalCustomers.state = PawpalCustomers.state || {
        customerDatabase: {},
        pawpointHistory: []
    };
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};

    // 1. FORMATTERS CHUẨN HÓA TOÀN HỆ THỐNG
    PawpalCustomers.formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    PawpalCustomers.formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(dateObj);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    PawpalCustomers.formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    PawpalCustomers.toUnaccent = function(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    };

    PawpalCustomers.matchSearch = function(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return PawpalCustomers.toUnaccent(sourceText).includes(PawpalCustomers.toUnaccent(searchTerm));
    };

    // 2. TOAST NOTIFICATION & CONFIRM MODAL CHUẨN AGENTS.MD
    PawpalCustomers.showToast = function(msg, type = 'success') {
        let toast = document.getElementById('adminGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminGlobalToast';
            document.body.appendChild(toast);
        }
        const isAlert = type === 'warning' || type === 'error' || type === 'danger';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: ${isAlert ? '#8F2424' : '#236B48'};
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: 9px;
            font-size: 13.5px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
            z-index: 9999;
            display: block;
        `;
        toast.textContent = msg;
        if (window._custToastTimer) clearTimeout(window._custToastTimer);
        window._custToastTimer = setTimeout(() => {
            toast.style.display = 'none';
        }, 3200);
    };

    let activeCustConfirmCallback = null;
    PawpalCustomers.showCustomerConfirmModal = function({ title, message, acceptText = 'Xác nhận', onAccept }) {
        const modal = document.getElementById('modalConfirmCustomerAction');
        const titleEl = document.getElementById('custConfirmTitle');
        const msgEl = document.getElementById('custConfirmMessage');
        const acceptBtn = document.getElementById('btnAcceptCustConfirm');
        if (!modal) {
            if (onAccept) onAccept();
            return;
        }

        if (titleEl && title) titleEl.textContent = title;
        if (msgEl && message) msgEl.innerHTML = message;
        if (acceptBtn) acceptBtn.textContent = acceptText;

        activeCustConfirmCallback = onAccept;
        modal.style.display = 'flex';
    };

    document.getElementById('btnAcceptCustConfirm')?.addEventListener('click', () => {
        const modal = document.getElementById('modalConfirmCustomerAction');
        if (modal) modal.style.display = 'none';
        if (typeof activeCustConfirmCallback === 'function') {
            activeCustConfirmCallback();
            activeCustConfirmCallback = null;
        }
    });

    document.getElementById('btnCancelCustConfirm')?.addEventListener('click', () => {
        const modal = document.getElementById('modalConfirmCustomerAction');
        if (modal) modal.style.display = 'none';
        activeCustConfirmCallback = null;
    });

    document.getElementById('btnCloseCustConfirm')?.addEventListener('click', () => {
        const modal = document.getElementById('modalConfirmCustomerAction');
        if (modal) modal.style.display = 'none';
        activeCustConfirmCallback = null;
    });

    // 3. HEADER BREADCRUMB & SUBTAB NAVIGATION
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
    const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
    const subtabPanels = document.querySelectorAll('.subtab-content');

    PawpalCustomers.updateBreadcrumb = function(custName) {
        if (!deepBreadcrumbEl) return;
        if (custName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${custName}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    };

    PawpalCustomers.switchSubtab = function(targetSubtab, updateHistory = true) {
        const btns = document.querySelectorAll('.header-subtab-btn');
        const panels = document.querySelectorAll('.subtab-content');

        btns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
        });

        if (targetSubtab === 'tab-profile') {
            const currentName = sessionStorage.getItem('pawpal_admin_customer_name') || 
                                document.getElementById('drawerCustomerName')?.textContent?.trim() || 
                                'Khách hàng';
            PawpalCustomers.updateBreadcrumb(currentName);
        } else {
            PawpalCustomers.updateBreadcrumb(null);
        }

        sessionStorage.setItem('pawpal_admin_customer_subtab', targetSubtab);
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }

        if (window.lucide) lucide.createIcons();
    };

    // 4. DATA LOADER 100% TỪ SUPABASE LIVE DATABASE (ZERO JSON MOCK)
    PawpalCustomers.loadCustomersModuleData = async function() {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                console.warn('[Customers] Supabase client not initialized.');
                return;
            }

            const [
                custRes,
                profRes,
                memRes,
                addrRes,
                petsRes,
                ordersRes,
                apptsRes,
                ticketsRes,
                pointsTxRes
            ] = await Promise.all([
                client.from('customer').select('*').order('created_at', { ascending: false }),
                client.from('customer_profile').select('*'),
                client.from('customer_membership').select('*'),
                client.from('customer_address').select('*'),
                client.from('pet_profile').select('*'),
                client.from('sales_order').select('*').order('created_at', { ascending: false }),
                client.from('appointment').select('*, service:service_id(service_name), staff:staff_id(full_name)').order('appointment_date', { ascending: false }),
                client.from('support_ticket').select('*').order('created_at', { ascending: false }),
                client.from('paw_point_transaction').select('*').order('created_at', { ascending: false })
            ]);

            const profMap = {};
            if (Array.isArray(profRes.data)) {
                profRes.data.forEach(p => { profMap[p.customer_id] = p; });
            }

            const memMap = {};
            if (Array.isArray(memRes.data)) {
                memRes.data.forEach(m => { memMap[m.customer_id] = m; });
            }

            const addrMap = {};
            if (Array.isArray(addrRes.data)) {
                addrRes.data.forEach(a => {
                    if (!addrMap[a.customer_id]) addrMap[a.customer_id] = [];
                    const street = a.street_address || '';
                    const prov = a.province || '';
                    const fullAddr = [street, prov].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ';
                    addrMap[a.customer_id].push({
                        rawId: a.id,
                        address: fullAddr,
                        receiverName: a.receiver_name || '',
                        receiverPhone: a.receiver_phone || '',
                        isDefault: !!a.is_default
                    });
                });
            }

            const petsMap = {};
            if (Array.isArray(petsRes.data)) {
                petsRes.data.forEach((p, idx) => {
                    if (!petsMap[p.customer_id]) petsMap[p.customer_id] = [];
                    const specName = p.species === 'cat' ? 'Mèo' : (p.species === 'dog' ? 'Chó' : (p.species === 'rabbit' ? 'Thỏ' : 'Thú cưng'));
                    petsMap[p.customer_id].push({
                        id: p.pet_code || `PET-${String(idx + 1).padStart(3, '0')}`,
                        dbId: p.id,
                        name: p.pet_name || 'Bé cưng',
                        species: specName,
                        breed: p.breed || 'Chưa cập nhật',
                        weight: p.weight ? String(p.weight) : '4.0',
                        vaccine: p.vaccination_history || 'Đầy đủ sổ tiêm',
                        alertNote: p.allergy && p.allergy !== 'Không' ? `Cảnh báo dị ứng: ${p.allergy}` : (p.routine || 'Bình thường')
                    });
                });
            }

            const ordersMap = {};
            if (Array.isArray(ordersRes.data)) {
                ordersRes.data.forEach(o => {
                    if (!ordersMap[o.customer_id]) ordersMap[o.customer_id] = [];
                    const dateStr = o.created_at ? PawpalCustomers.formatDateTime(o.created_at) : '2026-09-25 14:30';
                    const totalStr = o.total_amount ? Number(o.total_amount).toLocaleString('vi-VN') + ' đ' : '0 đ';
                    let st = 'Hoàn thành';
                    let stClass = 'badge-success';
                    if (o.order_status === 'PENDING') {
                        st = 'Chờ xác nhận';
                        stClass = 'badge-warning';
                    } else if (o.order_status === 'PROCESSING' || o.order_status === 'CONFIRMED') {
                        st = 'Đang chuẩn bị';
                        stClass = 'badge-info';
                    } else if (o.order_status === 'SHIPPING' || o.order_status === 'DELIVERING') {
                        st = 'Đang giao';
                        stClass = 'badge-info';
                    } else if (o.order_status === 'CANCELLED') {
                        st = 'Đã hủy';
                        stClass = 'badge-danger';
                    }
                    ordersMap[o.customer_id].push({
                        id: o.order_code || `ORD-${o.id.slice(0, 4)}`,
                        rawId: o.id,
                        date: dateStr,
                        total: totalStr,
                        payment: o.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
                        paymentClass: o.payment_status === 'PAID' ? 'badge-success' : 'badge-warning',
                        status: st,
                        statusClass: stClass
                    });
                });
            }

            const apptsMap = {};
            if (Array.isArray(apptsRes.data)) {
                apptsRes.data.forEach(a => {
                    if (!apptsMap[a.customer_id]) apptsMap[a.customer_id] = [];
                    const aDate = a.appointment_date ? (PawpalCustomers.formatDate(a.appointment_date) + (a.start_time ? ` ${PawpalCustomers.formatTime(a.start_time)}` : '')) : '2026-09-25 09:00';
                    let st = 'Hoàn thành';
                    let stClass = 'badge-success';
                    if (a.status === 'PENDING') {
                        st = 'Chờ xác nhận';
                        stClass = 'badge-warning';
                    } else if (a.status === 'IN_PROGRESS' || a.status === 'CONFIRMED') {
                        st = 'Đang thực hiện';
                        stClass = 'badge-info';
                    } else if (a.status === 'CANCELLED') {
                        st = 'Đã hủy';
                        stClass = 'badge-danger';
                    }
                    apptsMap[a.customer_id].push({
                        id: a.appointment_code || `APT-${a.id.slice(0, 4)}`,
                        rawId: a.id,
                        date: aDate,
                        service: a.service?.service_name || 'Dịch vụ Spa & Grooming',
                        staff: a.staff?.full_name || 'KTV Pawpal',
                        status: st,
                        statusClass: stClass
                    });
                });
            }

            const complaintsMap = {};
            if (Array.isArray(ticketsRes.data)) {
                ticketsRes.data.forEach(t => {
                    const uId = t.customer_id || t.user_id;
                    if (!uId) return;
                    if (!complaintsMap[uId]) complaintsMap[uId] = [];
                    const tDate = t.created_at ? PawpalCustomers.formatDateTime(t.created_at) : '2026-09-25 10:00';
                    let st = 'Đang xử lý';
                    let stClass = 'badge-warning';
                    if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
                        st = 'Đã giải quyết';
                        stClass = 'badge-success';
                    } else if (t.status === 'OPEN' || t.status === 'NEW') {
                        st = 'Chưa xử lý';
                        stClass = 'badge-danger';
                    }
                    complaintsMap[uId].push({
                        id: `TK-${t.id.slice(0, 4)}`,
                        rawId: t.id,
                        date: tDate,
                        issue: t.title || 'Phản ánh chất lượng dịch vụ',
                        level: t.priority === 'HIGH' ? 'Cao' : (t.priority === 'URGENT' ? 'Khẩn cấp' : 'Trung bình'),
                        status: st,
                        statusClass: stClass
                    });
                });
            }

            const freshDb = {};
            if (Array.isArray(custRes.data) && custRes.data.length > 0) {
                custRes.data.forEach((c, idx) => {
                    const custKey = `CUST-${String(idx + 1).padStart(3, '0')}`;
                    const prof = profMap[c.id] || {};
                    const mem = memMap[c.id] || {};
                    const points = mem.total_paw_points || 0;

                    let tier = 'SILVER';
                    let tierName = 'Bạc';
                    let tierBadge = 'badge-tier-silver';
                    if (points >= 3000) { tier = 'DIAMOND'; tierName = 'Kim Cương'; tierBadge = 'badge-tier-diamond'; }
                    else if (points >= 1000) { tier = 'GOLD'; tierName = 'Vàng'; tierBadge = 'badge-tier-gold'; }
                    else if (points >= 300) { tier = 'SILVER'; tierName = 'Bạc'; tierBadge = 'badge-tier-silver'; }

                    const addrs = addrMap[c.id] || [];
                    if (addrs.length === 0) {
                        addrs.push({ address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true });
                    }

                    const cPets = petsMap[c.id] || [];
                    const cOrders = ordersMap[c.id] || [];
                    const cAppts = apptsMap[c.id] || [];
                    const cComplaints = complaintsMap[c.id] || [];

                    let emergency = null;
                    const pendingComp = cComplaints.find(comp => comp.status !== 'Đã giải quyết');
                    if (pendingComp) {
                        emergency = `Ticket ${pendingComp.id} · ${pendingComp.status}: ${pendingComp.issue}`;
                    }

                    let isLocked = c.account_status === 'LOCKED';
                    let isTemp = c.is_temporary;

                    freshDb[custKey] = {
                        id: custKey,
                        dbId: c.id,
                        name: prof.full_name || ('Khách hàng ' + (c.phone_main || '')),
                        phone: c.phone_main || '—',
                        email: c.email || 'Chưa cập nhật',
                        gender: (prof.gender === 'FEMALE' || prof.gender === 'Nữ') ? 'Nữ' : ((prof.gender === 'MALE' || prof.gender === 'Nam') ? 'Nam' : 'Khác'),
                        dob: prof.date_of_birth ? PawpalCustomers.formatDate(prof.date_of_birth) : 'Chưa cập nhật',
                        dobRaw: prof.date_of_birth || '',
                        tier,
                        tierName,
                        tierBadgeClass: tierBadge,
                        points,
                        status: isLocked ? 'LOCKED' : (isTemp ? 'TEMP' : 'ACTIVE'),
                        authStatus: isLocked ? 'Tài khoản bị khóa' : (isTemp ? 'Chưa kích hoạt' : 'Đã kích hoạt'),
                        note: c.note || 'Khách hàng Pawpal Pet Center.',
                        emergencyAlert: emergency,
                        addresses: addrs,
                        pets: cPets,
                        orders: cOrders,
                        bookings: cAppts,
                        complaints: cComplaints
                    };
                });
            }

            PawpalCustomers.state.customerDatabase = freshDb;

            // Nạp lịch sử giao dịch điểm Pawpoint từ Supabase
            if (Array.isArray(pointsTxRes.data) && pointsTxRes.data.length > 0) {
                PawpalCustomers.state.pawpointHistory = pointsTxRes.data.map(pt => {
                    const cObj = Object.values(freshDb).find(c => c.dbId === pt.customer_id) || {};
                    const tTime = pt.created_at ? PawpalCustomers.formatDateTime(pt.created_at) : '2026-09-25 14:30';
                    const rawPoints = Number(pt.points ?? pt.point_amount ?? pt.amount ?? 0) || 0;
                    const transactionType = String(pt.transaction_type || pt.type || pt.direction || '').toUpperCase();
                    const descriptionText = String(pt.description || pt.reason || '').toLowerCase();
                    const isSubtraction = rawPoints < 0 || ['SUB', 'DEBIT', 'DEDUCT', 'REDEEM', 'TRỪ'].includes(transactionType) || /trừ|đổi quà|sử dụng điểm|khấu trừ/.test(descriptionText);
                    const ptsNum = Math.abs(rawPoints);
                    return {
                        id: `PWH-${pt.id.slice(0, 4)}`,
                        rawId: pt.id,
                        time: tTime,
                        custId: cObj.id || 'CUST-001',
                        custName: cObj.name || 'Khách hàng',
                        phone: cObj.phone || '—',
                        type: isSubtraction ? 'SUB' : 'ADD',
                        points: ptsNum,
                        balance: pt.balance_after ?? cObj.points ?? 0,
                        reason: pt.description || 'Giao dịch điểm Pawpoint'
                    };
                }).sort((a, b) => {
                    const timeA = Date.parse(a.time) || 0;
                    const timeB = Date.parse(b.time) || 0;
                    return timeB - timeA;
                });
            } else {
                PawpalCustomers.state.pawpointHistory = [];
            }

            PawpalCustomers.populateCustomerDatalists();
        } catch (err) {
            console.error('[Customers] Lỗi nạp dữ liệu từ Supabase:', err);
        }
    };

    PawpalCustomers.populateCustomerDatalists = function() {
        const searchDatalist = document.getElementById('customerSearchDatalist');
        const adjustDatalist = document.getElementById('adjustCustomerDatalist');
        const breedDatalist = document.getElementById('quickAddBreedDatalist');
        const petBreedDatalist = document.getElementById('petBreedDatalist');

        const customers = Object.values(PawpalCustomers.state.customerDatabase || {});

        if (searchDatalist) {
            searchDatalist.innerHTML = '';
            customers.forEach(c => {
                const opt = document.createElement('option');
                const petNames = (c.pets && c.pets.length > 0) ? ` (Bé: ${c.pets.map(p => p.name).join(', ')})` : '';
                opt.value = `${c.name} - ${c.phone}`;
                opt.label = `${c.tierName} • ${(c.points || 0).toLocaleString('vi-VN')} điểm${petNames}`;
                searchDatalist.appendChild(opt);
            });
        }

        const commonBreeds = [
            'Poodle', 'Corgi', 'Golden Retriever', 'Phốc sóc (Pomeranian)', 
            'Husky', 'Alaska', 'Pug', 'Chihuahua', 'Shiba Inu', 'Bulldog Pháp',
            'Mèo Anh lông ngắn (ALN)', 'Mèo Anh lông dài (ALD)', 'Mèo Ba Tư (Persian)',
            'Mèo Xiêm', 'Mèo Ragdoll', 'Mèo Munchkin', 'Mèo Sphynx', 'Thỏ Minilop'
        ];

        if (breedDatalist) breedDatalist.innerHTML = commonBreeds.map(b => `<option value="${b}">`).join('');
        if (petBreedDatalist) petBreedDatalist.innerHTML = commonBreeds.map(b => `<option value="${b}">`).join('');
    };

    // 5. SUPABASE REALTIME SUBSCRIPTION
    function setupCustomersRealtimeSubscription() {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) return;

            if (window._custRealtimeChannel) {
                client.removeChannel(window._custRealtimeChannel);
            }

            window._custRealtimeChannel = client.channel('admin_customers_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer' }, async () => {
                    await PawpalCustomers.loadCustomersModuleData();
                    if (PawpalCustomers.subtabs.list) {
                        PawpalCustomers.subtabs.list.renderCustomersTable();
                        PawpalCustomers.subtabs.list.updateCustomerKPIs();
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_profile' }, async () => {
                    await PawpalCustomers.loadCustomersModuleData();
                    if (PawpalCustomers.subtabs.list) PawpalCustomers.subtabs.list.renderCustomersTable();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_membership' }, async () => {
                    await PawpalCustomers.loadCustomersModuleData();
                    if (PawpalCustomers.subtabs.list) {
                        PawpalCustomers.subtabs.list.renderCustomersTable();
                        PawpalCustomers.subtabs.list.updateCustomerKPIs();
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_address' }, async () => {
                    await PawpalCustomers.loadCustomersModuleData();
                    const currentOpenId = sessionStorage.getItem('pawpal_admin_customer_id');
                    if (currentOpenId && PawpalCustomers.subtabs.profile) {
                        PawpalCustomers.subtabs.profile.renderDrawerAddresses(currentOpenId);
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_profile' }, async () => {
                    await PawpalCustomers.loadCustomersModuleData();
                    if (PawpalCustomers.subtabs.list) PawpalCustomers.subtabs.list.renderCustomersTable();
                    const currentOpenId = sessionStorage.getItem('pawpal_admin_customer_id');
                    if (currentOpenId && PawpalCustomers.subtabs.profile) {
                        PawpalCustomers.subtabs.profile.renderDrawerPets(currentOpenId);
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket' }, async () => {
                    await PawpalCustomers.loadCustomersModuleData();
                    if (PawpalCustomers.subtabs.list) {
                        PawpalCustomers.subtabs.list.renderComplaintBar();
                        PawpalCustomers.subtabs.list.renderCustomersTable();
                        PawpalCustomers.subtabs.list.updateCustomerKPIs();
                    }
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'paw_point_transaction' }, async () => {
                    await PawpalCustomers.loadCustomersModuleData();
                    if (PawpalCustomers.subtabs.pawpoint) {
                        PawpalCustomers.subtabs.pawpoint.renderPawpointHistory();
                    }
                })
                .subscribe();
        } catch (err) {
            console.warn('[Customers] Không thể thiết lập Supabase Realtime:', err);
        }
    }

    // 6. KHỞI TẠO TOÀN BỘ PHÂN HỆ KHÁCH HÀNG
    async function initCustomersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-list">Khách hàng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pawpoint">Pawpoint</button>
            `;

            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetSubtab = btn.getAttribute('data-subtab');
                    PawpalCustomers.switchSubtab(targetSubtab, true);
                });
            });
        }

        const handleCustomersHashChange = () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            const validTabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
            if (validTabs.includes(currentHash)) {
                PawpalCustomers.switchSubtab(currentHash, false);
            }
        };
        window.addEventListener('hashchange', handleCustomersHashChange);

        // Nạp dữ liệu Supabase Live
        await PawpalCustomers.loadCustomersModuleData();

        // Khởi tạo các subtab nếu đã được tải
        if (PawpalCustomers.subtabs.list) {
            PawpalCustomers.subtabs.list.renderCustomersTable();
            PawpalCustomers.subtabs.list.updateCustomerKPIs();
            PawpalCustomers.subtabs.list.renderComplaintBar();
        }
        if (PawpalCustomers.subtabs.pawpoint) {
            PawpalCustomers.subtabs.pawpoint.renderPawpointHistory();
        }

        // Khôi phục subtab active và hồ sơ khách hàng đang xem
        const hashSubtab = window.location.hash ? window.location.hash.replace('#', '') : null;
        const validSubtabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
        let initialSubtab = 'tab-list';

        if (hashSubtab && validSubtabs.includes(hashSubtab)) {
            initialSubtab = hashSubtab;
        } else {
            const savedSubtab = sessionStorage.getItem('pawpal_admin_customer_subtab');
            if (savedSubtab && validSubtabs.includes(savedSubtab)) {
                initialSubtab = savedSubtab;
            }
        }

        const firstCustId = Object.keys(PawpalCustomers.state.customerDatabase)[0] || 'CUST-001';
        const savedCustId = sessionStorage.getItem('pawpal_admin_customer_id') || firstCustId;
        if (PawpalCustomers.subtabs.profile) {
            PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(savedCustId);
        }

        if (initialSubtab !== 'tab-list') {
            PawpalCustomers.switchSubtab(initialSubtab);
        }

        const savedDrawerTab = sessionStorage.getItem('pawpal_admin_customer_drawertab');
        if (savedDrawerTab && document.getElementById(savedDrawerTab) && PawpalCustomers.subtabs.profile) {
            PawpalCustomers.subtabs.profile.switchDrawerTab(savedDrawerTab);
        }

        setupCustomersRealtimeSubscription();

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomersModule);
    } else {
        initCustomersModule();
    }
})();
