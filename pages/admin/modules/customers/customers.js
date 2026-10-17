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
    PawpalCustomers.state.listLoadStatus = 'idle';
    PawpalCustomers.state.hasLoadedCustomers = false;

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
            console.error('[Customers] Thiếu phần tử modal xác nhận (#modalConfirmCustomerAction). Thao tác đã bị hủy để đảm bảo an toàn.');
            if (typeof PawpalCustomers.showToast === 'function') {
                PawpalCustomers.showToast('Không thể hiển thị hộp thoại xác nhận. Thao tác đã bị hủy để đảm bảo an toàn.', 'danger');
            }
            return;
        }

        if (titleEl && title) titleEl.textContent = title;
        if (msgEl && message) msgEl.textContent = message;
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

    PawpalCustomers.escapeHtml = function(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    // 3. HEADER BREADCRUMB & SUBTAB NAVIGATION
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
    const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
    const subtabPanels = document.querySelectorAll('.subtab-content');

    PawpalCustomers.updateBreadcrumb = function(custName) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Khách hàng') return;
        if (!deepBreadcrumbEl) return;
        if (!document.getElementById('subtab-tab-profile')?.classList.contains('active')) custName = null;
        if (custName) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${PawpalCustomers.escapeHtml(custName)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    };

    PawpalCustomers.switchSubtab = function(targetSubtab, updateHistory = true) {
        const root = document.getElementById('subtab-tab-list')?.closest('.admin-module-wrapper');
        if (!root || sessionStorage.getItem('pawpal_admin_active_module') !== 'Khách hàng') return;
        if (!root.querySelector(`#subtab-${targetSubtab}`)) return;
        const btns = document.querySelectorAll('.header-subtab-btn');
        const panels = root.querySelectorAll('.subtab-content');

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
    // Cache TTL 90 giây — không fetch lại khi chuyển qua lại giữa các phân hệ
    let _custLastFetchedAt = 0;
    const CUST_CACHE_TTL_MS = 90_000;

    let customerLoadPromise = null;
    PawpalCustomers.loadCustomersModuleData = function(options = {}) {
        if (customerLoadPromise) return customerLoadPromise;
        const normalizedOptions = typeof options === 'boolean' ? { force: options } : (options || {});
        customerLoadPromise = loadCustomersModuleData(normalizedOptions).finally(() => {
            customerLoadPromise = null;
        });
        return customerLoadPromise;
    };

    async function loadCustomersModuleData({ force = false } = {}) {
        try {
            PawpalCustomers.state.listLoadStatus = 'loading';
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                throw new Error('Supabase client not initialized.');
            }

            // Sử dụng cache nếu dữ liệu còn mới và đã có ít nhất 1 khách hàng
            if (!force && Date.now() - _custLastFetchedAt < CUST_CACHE_TTL_MS && Object.keys(PawpalCustomers.state.customerDatabase || {}).length > 0) {
                console.log('[Customers] Dùng cache, bỏ qua fetch.');
                PawpalCustomers.state.listLoadStatus = 'loaded';
                return;
            }

            const fetchCustomersBase = async () => {
                const [
                    custRes,
                    profRes,
                    memRes,
                    addrRes,
                    petsRes
                ] = await Promise.all([
                    client.from('customer').select('id, email, phone_main, account_status, is_temporary, created_at').order('created_at', { ascending: false }),
                    client.from('customer_profile').select('id, customer_id, full_name, gender, date_of_birth'),
                    client.from('customer_membership').select('customer_id, total_paw_points'),
                    client.from('customer_address').select('id, customer_id, receiver_name, receiver_phone, street_address, province, is_default'),
                    client.from('pet_profile').select('id, customer_id, pet_code, pet_name, species, breed, weight, vaccination_history, allergy, routine, date_of_birth, avatar_url')
                ]);
                if (custRes.error) throw custRes.error;
                return {
                    custData: custRes.data || [],
                    profData: profRes.data || [],
                    memData: memRes.data || [],
                    addrData: addrRes.data || [],
                    petsData: petsRes.data || []
                };
            };

            const data = window.PawpalDataStore?.fetch
                ? await window.PawpalDataStore.fetch('customers:list', fetchCustomersBase, {
                    ttlMs: window.PawpalDataStore.TTL.LIST,
                    force
                })
                : await fetchCustomersBase();

            const profMap = {};
            (data.profData || []).forEach(p => { profMap[p.customer_id] = p; });

            const memMap = {};
            (data.memData || []).forEach(m => { memMap[m.customer_id] = m; });

            const addrMap = {};
            (data.addrData || []).forEach(a => {
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

            const petsMap = {};
            (data.petsData || []).forEach((p, idx) => {
                if (!petsMap[p.customer_id]) petsMap[p.customer_id] = [];
                const specName = p.species === 'cat' ? 'Mèo' : (p.species === 'dog' ? 'Chó' : (p.species === 'rabbit' ? 'Thỏ' : 'Thú cưng'));
                const petCode = p.pet_code || (p.id ? `PET-${p.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : `PET-${String(idx + 1).padStart(3, '0')}`);
                petsMap[p.customer_id].push({
                    id: petCode,
                    dbId: p.id,
                    name: p.pet_name || 'Bé cưng',
                    species: specName,
                    breed: p.breed || 'Chưa cập nhật',
                    weight: (p.weight !== null && p.weight !== undefined && p.weight !== '') ? String(p.weight) : 'Chưa ghi nhận',
                    vaccine: (p.vaccination_history && p.vaccination_history.trim()) ? p.vaccination_history : 'Chưa xác minh sổ tiêm',
                    alertNote: p.allergy && p.allergy !== 'Không' ? `Cảnh báo dị ứng: ${p.allergy}` : (p.routine || 'Bình thường')
                });
            });

            // PERF-03.C02: Khởi tạo rỗng, các đơn/lịch/ticket tải on-demand theo từng customer_id khi mở hồ sơ 360°
            const ordersMap = {};
            const apptsMap = {};
            const complaintsMap = {};

            const freshDb = {};

            // Hợp nhất danh sách khách hàng từ bảng customer và customer_profile để nạp đầy đủ 100% CSDL
            const customerIdSet = new Set();
            const unifiedCustomers = [];

            if (Array.isArray(data.custData)) {
                data.custData.forEach(c => {
                    if (c && c.id) {
                        customerIdSet.add(c.id);
                        unifiedCustomers.push(c);
                    }
                });
            }

            if (Array.isArray(data.profData)) {
                data.profData.forEach(p => {
                    if (p && p.customer_id && !customerIdSet.has(p.customer_id)) {
                        customerIdSet.add(p.customer_id);
                        unifiedCustomers.push({
                            id: p.customer_id,
                            full_name: p.full_name,
                            is_profile_only: true
                        });
                    }
                });
            }

            if (unifiedCustomers.length > 0) {
                unifiedCustomers.forEach((c, idx) => {
                    const rawClean = (c.id || '').replace(/-/g, '').toUpperCase();
                    const shortCode = rawClean.length >= 12 
                        ? ((rawClean.startsWith('D0000000') || rawClean.startsWith('F0000000')) ? rawClean.slice(-8) : rawClean.slice(0, 8))
                        : rawClean;
                    let custKey = c.customer_code || (shortCode ? `CUST-${shortCode}` : `CUST-${String(idx + 1).padStart(3, '0')}`);
                    if (freshDb[custKey]) {
                        custKey = `CUST-${rawClean.slice(-8)}`;
                    }
                    if (freshDb[custKey]) {
                        custKey = `${custKey}-${idx + 1}`;
                    }
                    const prof = profMap[c.id] || {};
                    const mem = memMap[c.id] || {};
                    const points = mem.total_paw_points || 0;

                    const hasMembership = !!memMap[c.id];
                    const isWalkInName = /vãng lai|vang lai/i.test(prof.full_name || c.full_name || '');
                    const isTemp = Boolean(c.is_temporary || !hasMembership || isWalkInName);

                    let tier = 'NONE';
                    let tierName = 'Vãng lai';
                    let tierBadge = 'badge-neutral';
                    if (!isTemp) {
                        tier = 'SILVER';
                        tierName = 'Bạc';
                        tierBadge = 'badge-tier-silver';
                        if (points >= 3000) { tier = 'DIAMOND'; tierName = 'Kim Cương'; tierBadge = 'badge-tier-diamond'; }
                        else if (points >= 1000) { tier = 'GOLD'; tierName = 'Vàng'; tierBadge = 'badge-tier-gold'; }
                        else if (points >= 300) { tier = 'SILVER'; tierName = 'Bạc'; tierBadge = 'badge-tier-silver'; }
                    }

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

                    const rawAccountStatus = String(c.account_status || '').toLowerCase();
                    // C-13: Nhận diện đầy đủ các trạng thái tài khoản: đã khóa, tạm khóa (tam_khoa/suspended/temp) và hoạt động
                    const isSuspended = rawAccountStatus === 'tam_khoa' || rawAccountStatus === 'suspended' || rawAccountStatus === 'temp';
                    const isLocked = c.account_status === 'LOCKED' || rawAccountStatus === 'da_khoa' || isSuspended;

                    // Xác định số điện thoại ưu tiên: c.phone_main -> số người nhận trong sổ địa chỉ -> '—'
                    const phoneVal = c.phone_main || addrs.find(a => a.receiverPhone)?.receiverPhone || '—';

                    freshDb[custKey] = {
                        id: custKey,
                        dbId: c.id,
                        accountStatusRaw: c.account_status,
                        name: prof.full_name || c.full_name || ('Khách hàng ' + (phoneVal !== '—' ? phoneVal : custKey)),
                        phone: phoneVal,
                        email: c.email || (prof.email || 'Chưa cập nhật'),
                        gender: (prof.gender === 'FEMALE' || prof.gender === 'Nữ') ? 'Nữ' : ((prof.gender === 'MALE' || prof.gender === 'Nam') ? 'Nam' : 'Khác'),
                        dob: prof.date_of_birth ? PawpalCustomers.formatDate(prof.date_of_birth) : 'Chưa cập nhật',
                        dobRaw: prof.date_of_birth || '',
                        tier,
                        tierName,
                        tierBadgeClass: tierBadge,
                        points: isTemp ? 0 : points,
                        isMember: !isTemp,
                        status: isLocked ? 'LOCKED' : (isTemp ? 'TEMP' : 'ACTIVE'),
                        authStatus: isLocked ? 'Tài khoản bị khóa' : (isTemp ? 'Khách vãng lai' : 'Đã kích hoạt'),
                        note: c.note || (isTemp ? 'Khách vãng lai tiếp nhận dịch vụ tại quầy.' : 'Khách hàng thành viên Pawpal Pet Center.'),
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

            // PERF-03.C04: Lịch sử điểm Pawpoint nạp on-demand khi mở subtab Pawpoints
            PawpalCustomers.state.pawpointHistory = [];

            PawpalCustomers.populateCustomerDatalists();
            _custLastFetchedAt = Date.now();
            PawpalCustomers.state.hasLoadedCustomers = true;
            PawpalCustomers.state.listLoadStatus = 'loaded';

            if (PawpalCustomers.subtabs.list?.renderCustomersTable) {
                PawpalCustomers.subtabs.list.renderCustomersTable();
                PawpalCustomers.subtabs.list.updateCustomerKPIs();
                if (PawpalCustomers.subtabs.list.renderComplaintBar) {
                    PawpalCustomers.subtabs.list.renderComplaintBar();
                }
            }
        } catch (err) {
            PawpalCustomers.state.listLoadStatus = 'error';
            console.error('[Customers] Lỗi nạp dữ liệu từ Supabase:', err);
            PawpalCustomers.subtabs.list?.renderCustomersTable?.();
            PawpalCustomers.subtabs.list?.updateCustomerKPIs?.();
            PawpalCustomers.subtabs.pawpoint?.renderPawpointHistory?.();
            PawpalCustomers.subtabs.profile?.renderDrawerCustomerProfile?.(sessionStorage.getItem('pawpal_admin_customer_id'));
        }
    }

    // Helper lazy-fetch hồ sơ 360° (Đơn hàng, Lịch hẹn, Khiếu nại) cho 1 khách hàng cụ thể (PERF-03.C03)
    PawpalCustomers.fetchCustomerProfile360 = async function(cust, { force = false } = {}) {
        if (!cust || !cust.dbId) return cust;
        if (!force && cust._detailsLoaded) return cust;

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) return cust;

        try {
            const fetchCust360 = async () => {
                const [ordersRes, apptsRes, ticketsRes] = await Promise.all([
                    client.from('sales_order')
                        .select('id, order_code, customer_id, order_status, payment_status, total_amount, created_at')
                        .eq('customer_id', cust.dbId)
                        .order('created_at', { ascending: false })
                        .limit(20),
                    client.from('appointment')
                        .select('id, appointment_code, customer_id, appointment_date, appointment_time, appointment_status, total_price, service:service_id(service_name), staff:staff_id(full_name)')
                        .eq('customer_id', cust.dbId)
                        .order('appointment_date', { ascending: false })
                        .limit(20),
                    client.from('support_ticket')
                        .select('id, user_id, title, type, status, priority, created_at')
                        .eq('user_id', cust.dbId)
                        .order('created_at', { ascending: false })
                        .limit(20)
                ]);
                return {
                    orders: ordersRes.data || [],
                    appts: apptsRes.data || [],
                    tickets: ticketsRes.data || []
                };
            };

            const payload = window.PawpalDataStore?.fetch
                ? await window.PawpalDataStore.fetch(`customers:360:${cust.dbId}`, fetchCust360, {
                    ttlMs: window.PawpalDataStore.TTL.OPERATIONAL,
                    force
                })
                : await fetchCust360();

            // Map orders
            cust.orders = (payload.orders || []).map(o => {
                const dateStr = o.created_at ? PawpalCustomers.formatDateTime(o.created_at) : '—';
                const totalStr = o.total_amount ? Number(o.total_amount).toLocaleString('vi-VN') + ' đ' : '0 đ';
                let st = 'Hoàn thành';
                let stClass = 'badge-success';
                if (o.order_status === 'PENDING') { st = 'Chờ xác nhận'; stClass = 'badge-warning'; }
                else if (o.order_status === 'PROCESSING' || o.order_status === 'CONFIRMED') { st = 'Đang chuẩn bị'; stClass = 'badge-info'; }
                else if (o.order_status === 'SHIPPING' || o.order_status === 'DELIVERING') { st = 'Đang giao'; stClass = 'badge-info'; }
                else if (o.order_status === 'CANCELLED') { st = 'Đã hủy'; stClass = 'badge-danger'; }
                return {
                    id: o.order_code || `ORD-${o.id.slice(0, 4)}`,
                    rawId: o.id,
                    date: dateStr,
                    total: totalStr,
                    payment: o.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán',
                    paymentClass: o.payment_status === 'PAID' ? 'badge-success' : 'badge-warning',
                    status: st,
                    statusClass: stClass
                };
            });

            // Map appts
            cust.bookings = (payload.appts || []).map(a => {
                const aTime = a.appointment_time ? ` ${a.appointment_time.slice(0, 5)}` : '';
                const aDate = a.appointment_date ? (PawpalCustomers.formatDate(a.appointment_date) + aTime) : '—';
                const apptStatus = (a.appointment_status || '').toUpperCase();
                let st = 'Chưa rõ';
                let stClass = 'badge-neutral';
                if (apptStatus === 'COMPLETED' || apptStatus === 'DA_HOAN_THANH') { st = 'Hoàn thành'; stClass = 'badge-success'; }
                else if (apptStatus === 'PENDING' || apptStatus === 'CHO_XAC_NHAN') { st = 'Chờ xác nhận'; stClass = 'badge-warning'; }
                else if (apptStatus === 'CONFIRMED' || apptStatus === 'DA_XAC_NHAN') { st = 'Đã xác nhận'; stClass = 'badge-info'; }
                else if (apptStatus === 'IN_PROGRESS' || apptStatus === 'DANG_THUC_HIEN') { st = 'Đang thực hiện'; stClass = 'badge-info'; }
                else if (apptStatus === 'CANCELLED' || apptStatus === 'DA_HUY') { st = 'Đã hủy'; stClass = 'badge-danger'; }
                return {
                    id: a.appointment_code || `APT-${a.id.slice(0, 4)}`,
                    rawId: a.id,
                    date: aDate,
                    service: a.service?.service_name || 'Dịch vụ Spa & Grooming',
                    staff: a.staff?.full_name || 'KTV Pawpal',
                    status: st,
                    statusClass: stClass
                };
            });

            // Map complaints
            cust.complaints = (payload.tickets || []).map(t => {
                const tDate = t.created_at ? PawpalCustomers.formatDateTime(t.created_at) : '—';
                let st = 'Đang xử lý';
                let stClass = 'badge-warning';
                if (t.status === 'RESOLVED' || t.status === 'CLOSED') { st = 'Đã giải quyết'; stClass = 'badge-success'; }
                else if (t.status === 'OPEN' || t.status === 'NEW') { st = 'Chưa xử lý'; stClass = 'badge-danger'; }
                return {
                    id: `TK-${t.id.slice(0, 4)}`,
                    rawId: t.id,
                    date: tDate,
                    issue: t.title || 'Phản ánh chất lượng dịch vụ',
                    level: t.priority === 'HIGH' ? 'Cao' : (t.priority === 'URGENT' ? 'Khẩn cấp' : 'Trung bình'),
                    status: st,
                    statusClass: stClass
                };
            });

            cust._detailsLoaded = true;
        } catch (e) {
            console.warn('[PawpalCustomers] Lỗi nạp 360:', e);
        }
        return cust;
    };

    // Helper lazy-fetch lịch sử điểm Pawpoint khi vào tab Pawpoints (PERF-03.C04)
    PawpalCustomers.fetchPawpointLedger = async function({ force = false, limit = 100 } = {}) {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) return [];

        const fetchLedger = async () => {
            const { data, error } = await client
                .from('paw_point_transaction')
                .select('id, customer_id, points, balance_after, description, created_at')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        };

        try {
            const rows = window.PawpalDataStore?.fetch
                ? await window.PawpalDataStore.fetch(`customers:pawpoints:${limit}`, fetchLedger, {
                    ttlMs: window.PawpalDataStore.TTL.OPERATIONAL,
                    force
                })
                : await fetchLedger();

            const freshDb = PawpalCustomers.state.customerDatabase || {};
            PawpalCustomers.state.pawpointHistory = rows.map(pt => {
                const cObj = Object.values(freshDb).find(c => c.dbId === pt.customer_id) || {};
                const tTime = pt.created_at ? PawpalCustomers.formatDateTime(pt.created_at) : '—';
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
            });
            return PawpalCustomers.state.pawpointHistory;
        } catch (err) {
            console.warn('[PawpalCustomers] Lỗi nạp lịch sử điểm Pawpoint:', err);
            return [];
        }
    };

    PawpalCustomers.getCustomer = function(idOrKey) {
        if (!idOrKey) return null;
        const db = PawpalCustomers.state.customerDatabase || {};
        if (db[idOrKey]) return db[idOrKey];
        const raw = String(idOrKey).trim();
        const lower = raw.toLowerCase();
        const digits = raw.replace(/\D/g, '');
        return Object.values(db).find(c => {
            if (c.dbId === idOrKey || c.id === idOrKey) return true;
            if (digits.length >= 9 && c.phone && c.phone.replace(/\D/g, '') === digits) return true;
            if (c.name && c.name.toLowerCase() === lower) return true;
            if (c.name && lower.length >= 3 && (c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()))) return true;
            return false;
        }) || null;
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
                window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin_customers_realtime');
            }

            const triggerCustSync = (invalidatePattern, refreshCallback) => {
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Khách hàng',
                        invalidatePattern: invalidatePattern || 'customers:*',
                        onActiveRefresh: async () => {
                            await PawpalCustomers.loadCustomersModuleData({ force: true });
                            if (typeof refreshCallback === 'function') {
                                refreshCallback();
                            } else if (PawpalCustomers.subtabs.list) {
                                PawpalCustomers.subtabs.list.renderCustomersTable();
                                PawpalCustomers.subtabs.list.updateCustomerKPIs();
                            }
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Khách hàng') {
                    PawpalCustomers.loadCustomersModuleData({ force: true }).then(() => {
                        if (refreshCallback) refreshCallback();
                    });
                }
            };

            window._custRealtimeChannel = client.channel('admin_customers_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer' }, () => {
                    triggerCustSync('customers:*', () => {
                        if (PawpalCustomers.subtabs.list) {
                            PawpalCustomers.subtabs.list.renderCustomersTable();
                            PawpalCustomers.subtabs.list.updateCustomerKPIs();
                        }
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_profile' }, () => {
                    triggerCustSync('customers:*', () => {
                        if (PawpalCustomers.subtabs.list) PawpalCustomers.subtabs.list.renderCustomersTable();
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_membership' }, () => {
                    triggerCustSync('customers:*', () => {
                        if (PawpalCustomers.subtabs.list) {
                            PawpalCustomers.subtabs.list.renderCustomersTable();
                            PawpalCustomers.subtabs.list.updateCustomerKPIs();
                        }
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_address' }, () => {
                    triggerCustSync('customers:*', () => {
                        const currentOpenId = sessionStorage.getItem('pawpal_admin_customer_id');
                        if (currentOpenId && PawpalCustomers.subtabs.profile) {
                            PawpalCustomers.subtabs.profile.renderDrawerAddresses(currentOpenId);
                        }
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_profile' }, () => {
                    triggerCustSync('customers:*', () => {
                        if (PawpalCustomers.subtabs.list) PawpalCustomers.subtabs.list.renderCustomersTable();
                        const currentOpenId = sessionStorage.getItem('pawpal_admin_customer_id');
                        if (currentOpenId && PawpalCustomers.subtabs.profile) {
                            PawpalCustomers.subtabs.profile.renderDrawerPets(currentOpenId);
                        }
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket' }, () => {
                    triggerCustSync('customers:*', () => {
                        if (PawpalCustomers.subtabs.list) {
                            PawpalCustomers.subtabs.list.renderComplaintBar();
                            PawpalCustomers.subtabs.list.renderCustomersTable();
                            PawpalCustomers.subtabs.list.updateCustomerKPIs();
                        }
                    });
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'paw_point_transaction' }, () => {
                    triggerCustSync('customers:*', () => {
                        if (PawpalCustomers.subtabs.pawpoint) {
                            PawpalCustomers.subtabs.pawpoint.renderPawpointHistory();
                        }
                    });
                })
                .subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin_customers_realtime');
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

        const validTabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Khách hàng' && validTabs.includes(e.detail.tabId)) {
                PawpalCustomers.switchSubtab(e.detail.tabId, false);
            }
        });

        // Nạp dữ liệu Supabase Live
        await PawpalCustomers.loadCustomersModuleData();

        // Khởi tạo các subtab nếu đã được tải
        if (PawpalCustomers.subtabs.list) {
            PawpalCustomers.subtabs.list.renderCustomersTable();
            PawpalCustomers.subtabs.list.updateCustomerKPIs();
            PawpalCustomers.subtabs.list.renderComplaintBar();
        }
        if (PawpalCustomers.subtabs.pawpoint) {
            PawpalCustomers.subtabs.pawpoint.init?.();
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
        const savedCustId = sessionStorage.getItem('pawpal_admin_customer_id');
        const resolvedCust = savedCustId ? PawpalCustomers.getCustomer(savedCustId) : null;
        const activeCustId = resolvedCust ? resolvedCust.id : (savedCustId || firstCustId);
        if (PawpalCustomers.subtabs.profile) {
            PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(activeCustId);
        }

        PawpalCustomers.switchSubtab(initialSubtab, false);

        const savedDrawerTab = sessionStorage.getItem('pawpal_admin_customer_drawertab');
        if (savedDrawerTab && document.getElementById(savedDrawerTab) && PawpalCustomers.subtabs.profile) {
            PawpalCustomers.subtabs.profile.switchDrawerTab(savedDrawerTab);
        }

        setupCustomersRealtimeSubscription();

        // Bộ xử lý đóng modal toàn cục cho phân hệ Khách hàng (Hỗ trợ nút Đóng, Hủy, click backdrop và phím Escape)
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close-modal]');
            if (closeBtn) {
                e.preventDefault();
                const modalId = closeBtn.getAttribute('data-close-modal');
                const targetModal = document.getElementById(modalId);
                if (targetModal) {
                    targetModal.style.display = 'none';
                    targetModal.classList.remove('open');
                    targetModal.classList.remove('show');
                }
                return;
            }

            if (e.target.classList.contains('admin-modal-backdrop') && (e.target.style.display === 'flex' || e.target.classList.contains('open'))) {
                e.target.style.display = 'none';
                e.target.classList.remove('open');
                e.target.classList.remove('show');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.admin-modal-backdrop').forEach(m => {
                    if (m.style.display === 'flex' || m.classList.contains('open')) {
                        m.style.display = 'none';
                        m.classList.remove('open');
                        m.classList.remove('show');
                    }
                });
            }
        });


        if (window.lucide) {
            lucide.createIcons();
        }
    }

    PawpalCustomers.init = initCustomersModule;

    window.addEventListener('admin:module-show', (e) => {
        if (e.detail?.module === 'Khách hàng') {
            if (PawpalCustomers.subtabs?.list?.renderCustomersTable) {
                PawpalCustomers.subtabs.list.renderCustomersTable();
                PawpalCustomers.subtabs.list.updateCustomerKPIs();
                if (PawpalCustomers.subtabs.list.renderComplaintBar) {
                    PawpalCustomers.subtabs.list.renderComplaintBar();
                }
            }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomersModule);
    } else {
        initCustomersModule();
    }
})();
