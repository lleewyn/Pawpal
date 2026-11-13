/**
 * TAB QUẢN TRỊ VẬN HÀNH (PAWPAL ADMIN) — module độc lập, không phụ thuộc Dashboard cũ.
 * - Đọc 100% từ Supabase bằng phiên đăng nhập Admin (RLS kiểm soát quyền), không dữ liệu giả.
 * - Realtime: nghe thay đổi các bảng liên quan + tín hiệu làm mới của Admin, gom sự kiện rồi truy vấn lại;
 *   không cộng trừ số liệu từ nội dung sự kiện. Mất Realtime thì chuyển sang làm mới định kỳ.
 * - Dashboard chỉ đọc: mọi thao tác nghiệp vụ thực hiện tại phân hệ tương ứng.
 * Gắn vào trang: PawpalOperationsDashboard.mount(container). Gỡ: PawpalOperationsDashboard.unmount().
 */
(function initOperationsDashboard() {
    'use strict';

    const HTML_URL = '/pages/admin/modules/dashboard/dashboard.html';
    const PAGE_SIZE = 500;
    const MAX_ROWS = 5000;
    const ALERTS_PER_PAGE = 10;
    const REALTIME_DEBOUNCE_MS = 800;
    const POLL_INTERVAL_MS = 60_000;
    const CHANNEL_NAME = 'admin-ops-dashboard-live';

    // Bảng CSDL -> nhóm dữ liệu cần tải lại khi bảng thay đổi
    const TABLE_RESOURCES = {
        appointment: ['periodAppointments', 'todayAppointments', 'backlogAppointments'],
        appointment_item: ['periodAppointments', 'backlogAppointments'],
        sales_order: ['periodOrders', 'actionOrders', 'openReturns', 'salesVelocity'],
        sales_order_detail: ['salesVelocity'],
        return_request: ['openReturns'],
        staff: ['staff'],
        staff_schedule: ['schedules'],
        inventory: ['inventory'],
        product_variant: ['inventory'],
        product: ['inventory'],
        stock_reservation: ['reservations'],
        support_ticket: ['openTickets', 'periodTickets'],
        review: ['periodReviews']
    };

    // Khối hiển thị -> nhóm dữ liệu phụ thuộc
    const PANEL_RESOURCES = {
        appointmentStatus: ['periodAppointments'],
        orderStatus: ['periodOrders'],
        topServices: ['periodAppointments'],
        heatmap: ['periodAppointments'],
        staff: ['periodAppointments', 'staff', 'schedules'],
        stock: ['inventory', 'reservations', 'salesVelocity'],
        quality: ['periodReviews', 'periodTickets', 'openTickets'],
        alerts: ['backlogAppointments', 'actionOrders', 'openReturns', 'openTickets', 'inventory', 'reservations', 'salesVelocity', 'periodAppointments', 'schedules']
    };
    const KPI_RESOURCES = {
        todayAppointments: ['todayAppointments'],
        pendingAppointments: ['backlogAppointments'],
        pendingOrders: ['actionOrders'],
        staffOnShift: ['schedules', 'staff'],
        lowStock: ['inventory', 'reservations', 'salesVelocity'],
        openTickets: ['openTickets']
    };

    const M = () => window.PawpalOpsMetrics;

    const state = {
        root: null,
        preset: 'today',
        custom: { from: '', to: '' },
        period: null,
        data: {},
        errors: {},
        loading: new Set(),
        dirty: new Set(),
        alertsPage: 1,
        lastUpdatedAt: null,
        channel: null,
        realtime: 'connecting',
        debounceTimer: null,
        pollTimer: null,
        inFlight: null,
        generation: 0,
        listeners: []
    };

    // ------------------------------------------------------------------
    // Tiện ích
    // ------------------------------------------------------------------
    function getClient() {
        return window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function num(value, digits = 0) {
        return Number(value).toLocaleString('vi-VN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
    }

    function percent(value) {
        return value === null || value === undefined || !Number.isFinite(value) ? 'N/A' : `${Math.round(value * 100)}%`;
    }

    // Biến thể chữ hoa/chữ thường để lọc IN phía CSDL (so khớp chuỗi phân biệt hoa thường).
    function variants(values) {
        return [...new Set(values.flatMap(value => [value, value.toUpperCase()]))];
    }

    function inList(values) {
        return `(${variants(values).map(value => `"${value}"`).join(',')})`;
    }

    function on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        state.listeners.push(() => target.removeEventListener(type, handler, options));
    }

    async function readPaged(buildQuery, orderColumn = 'id') {
        const rows = [];
        for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
            const { data, error } = await buildQuery().order(orderColumn, { ascending: true }).range(offset, offset + PAGE_SIZE - 1);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < PAGE_SIZE) return { rows, truncated: false };
        }
        return { rows, truncated: true };
    }

    function safeErrorMessage(error) {
        if (!error) return 'Không tải được dữ liệu.';
        if (error.code === '42501' || /permission|rls|not allowed/i.test(error.message || '')) return 'Tài khoản hiện tại không có quyền xem dữ liệu này.';
        if (/fetch|network|Failed to fetch/i.test(error.message || '')) return 'Mất kết nối tới máy chủ dữ liệu.';
        return 'Không tải được dữ liệu.';
    }

    // ------------------------------------------------------------------
    // Truy vấn từng nhóm dữ liệu
    // ------------------------------------------------------------------
    const APPOINTMENT_COLUMNS = 'id,appointment_code,staff_id,appointment_status,scheduled_start_at,scheduled_end_at,created_at,updated_at,check_in_time,items:appointment_item(id,service_id,name_snapshot,quantity,duration_minutes,staff_id,status,is_primary)';

    const LOADERS = {
        async periodAppointments(client, period) {
            const result = await readPaged(() => client.from('appointment').select(APPOINTMENT_COLUMNS)
                .gte('scheduled_start_at', period.startIso).lt('scheduled_start_at', period.endIso));
            return result;
        },
        async todayAppointments(client, period) {
            const metrics = M();
            const startIso = `${period.today}T00:00:00+07:00`;
            const endIso = `${metrics.shiftDateKey(period.today, 1)}T00:00:00+07:00`;
            return readPaged(() => client.from('appointment').select('id,appointment_status')
                .gte('scheduled_start_at', startIso).lt('scheduled_start_at', endIso));
        },
        async backlogAppointments(client) {
            const groups = M().STATUS_GROUPS.appointment;
            const now = Date.now();
            const [pending, active] = await Promise.all([
                readPaged(() => client.from('appointment').select(APPOINTMENT_COLUMNS).in('appointment_status', variants(groups.pending))),
                // Lịch đã xác nhận/đang làm quanh thời điểm hiện tại: phát hiện trễ hẹn, chưa có KTV, quá giờ.
                readPaged(() => client.from('appointment').select(APPOINTMENT_COLUMNS)
                    .in('appointment_status', variants([...groups.confirmed, ...groups.checked_in, ...groups.in_progress]))
                    .gte('scheduled_start_at', new Date(now - 2 * 86_400_000).toISOString())
                    .lt('scheduled_start_at', new Date(now + M().THRESHOLDS.appointmentUnassignedHours * 3_600_000).toISOString()))
            ]);
            return { rows: [...pending.rows, ...active.rows], truncated: pending.truncated || active.truncated };
        },
        async periodOrders(client, period) {
            return readPaged(() => client.from('sales_order').select('id,order_code,order_status,created_at,updated_at')
                .gte('created_at', period.startIso).lt('created_at', period.endIso));
        },
        async actionOrders(client) {
            const groups = M().STATUS_GROUPS.order;
            return readPaged(() => client.from('sales_order').select('id,order_code,order_status,created_at,updated_at')
                .in('order_status', variants([...groups.pending, ...groups.processing])));
        },
        async openReturns(client) {
            const result = await readPaged(() => client.from('return_request').select('id,request_status,created_at,sales_order_id,so:sales_order(order_code)')
                .in('request_status', variants(M().STATUS_GROUPS.returnRequest.open)));
            result.rows = result.rows.map(row => ({ ...row, order_code: row.so?.order_code || null }));
            return result;
        },
        async staff(client) {
            return readPaged(() => client.from('staff').select('id,full_name,job_title,employment_status'));
        },
        async schedules(client, period) {
            const metrics = M();
            const todayStart = `${period.today}T00:00:00+07:00`;
            const todayEnd = `${metrics.shiftDateKey(period.today, 1)}T00:00:00+07:00`;
            const from = period.startIso < todayStart ? period.startIso : todayStart;
            const to = period.endIso > todayEnd ? period.endIso : todayEnd;
            return readPaged(() => client.from('staff_schedule').select('id,staff_id,start_at,end_at,schedule_status,availability_status')
                .lt('start_at', new Date(to).toISOString()).gt('end_at', new Date(from).toISOString()));
        },
        async inventory(client) {
            const result = await readPaged(() => client.from('inventory')
                .select('product_variant_id,quantity_in_stock,minimum_stock,variant:product_variant(id,sku_variant,status,product:product(product_name,status))'), 'product_variant_id');
            result.rows = result.rows.map(row => ({
                product_variant_id: row.product_variant_id,
                quantity_in_stock: row.quantity_in_stock,
                minimum_stock: row.minimum_stock,
                sku: row.variant?.sku_variant || '',
                product_name: row.variant?.product?.product_name || '',
                variant_status: row.variant?.status || '',
                product_status: row.variant?.product?.status || ''
            }));
            return result;
        },
        // Giữ hàng không trừ vào quantity_in_stock (M027, M122) nên phải trừ ở đây để ra tồn khả dụng.
        async reservations(client) {
            return readPaged(() => client.from('stock_reservation').select('id,product_variant_id,quantity,status,expires_at')
                .in('status', variants(M().STATUS_GROUPS.reservation.active))
                .gt('expires_at', new Date().toISOString()));
        },
        async salesVelocity(client) {
            const metrics = M();
            const since = new Date(Date.now() - metrics.THRESHOLDS.salesWindowDays * 86_400_000).toISOString();
            // Bỏ đơn nháp, hủy, trả hàng. Alias "so" tránh trùng tham số sắp xếp "order" của PostgREST.
            const excluded = ['draft', ...metrics.STATUS_GROUPS.order.cancelled, ...metrics.STATUS_GROUPS.order.returned];
            return readPaged(() => client.from('sales_order_detail')
                .select('id,product_variant_id,quantity,so:sales_order!inner(created_at,order_status)')
                .gte('so.created_at', since)
                .not('so.order_status', 'in', inList(excluded)));
        },
        async openTickets(client) {
            return readPaged(() => client.from('support_ticket').select('id,ticket_code,subject,status,priority,created_at,first_response_at')
                .not('status', 'in', inList(M().STATUS_GROUPS.ticket.closed)));
        },
        async periodTickets(client, period) {
            return readPaged(() => client.from('support_ticket').select('id,status,priority,created_at,first_response_at,resolved_at,rating')
                .gte('created_at', period.startIso).lt('created_at', period.endIso));
        },
        async periodReviews(client, period) {
            return readPaged(() => client.from('review').select('id,rating,review_status,created_at')
                .gte('created_at', period.startIso).lt('created_at', period.endIso));
        }
    };

    // Nhóm không phụ thuộc bộ lọc thời gian (ảnh chụp trạng thái hiện tại)
    const SNAPSHOT_RESOURCES = new Set(['todayAppointments', 'backlogAppointments', 'actionOrders', 'openReturns', 'staff', 'inventory', 'reservations', 'salesVelocity', 'openTickets']);

    async function loadResources(names) {
        const client = getClient();
        const generation = state.generation;
        const period = state.period;
        const list = [...new Set(names)];
        list.forEach(name => state.loading.add(name));
        renderAll();
        if (!client) {
            list.forEach(name => { state.errors[name] = 'Kết nối dữ liệu chưa sẵn sàng. Vui lòng đăng nhập Admin.'; state.loading.delete(name); });
            renderAll();
            return;
        }
        let running = 0;
        const queue = [];
        const withSlot = async job => {
            if (running >= 3) await new Promise(resolve => queue.push(resolve)); else running++;
            try { return await job(); } finally { const next = queue.shift(); if (next) next(); else running--; }
        };
        await Promise.all(list.map(name => withSlot(async () => {
            try {
                const result = await LOADERS[name](client, period);
                if (generation !== state.generation) return;
                state.data[name] = result;
                delete state.errors[name];
            } catch (error) {
                if (generation !== state.generation) return;
                console.warn(`[Vận hành] Lỗi tải ${name}:`, error?.message || error);
                state.errors[name] = safeErrorMessage(error);
            } finally {
                if (generation === state.generation) state.loading.delete(name);
            }
        })));
        if (generation !== state.generation) return;
        state.lastUpdatedAt = new Date();
        renderAll();
    }

    function allResourceNames() {
        return Object.keys(LOADERS);
    }

    // Gom các yêu cầu tải lại: chỉ một lượt chạy cùng lúc, sự kiện tới giữa chừng sẽ được xử lý ở lượt kế tiếp.
    function requestReload(names) {
        names.forEach(name => state.dirty.add(name));
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(flushReload, REALTIME_DEBOUNCE_MS);
    }

    async function flushReload() {
        if (!state.root?.isConnected || document.hidden || !state.root.getClientRects().length) return;
        if (state.inFlight) { await state.inFlight; if (state.dirty.size) flushReload(); return; }
        const names = [...state.dirty];
        state.dirty.clear();
        if (!names.length) return;
        state.inFlight = loadResources(names).finally(() => { state.inFlight = null; });
        await state.inFlight;
        if (state.dirty.size) flushReload();
    }

    // ------------------------------------------------------------------
    // Realtime và làm mới định kỳ
    // ------------------------------------------------------------------
    function setRealtimeStatus(status) {
        state.realtime = status;
        if (status === 'live') stopPolling(); else startPolling();
        renderSyncStatus();
    }

    function subscribeRealtime() {
        const client = getClient();
        if (!client || typeof client.channel !== 'function') { setRealtimeStatus('offline'); return; }
        try {
            const channel = client.channel(CHANNEL_NAME);
            Object.entries(TABLE_RESOURCES).forEach(([table, resources]) => {
                channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => requestReload(resources));
            });
            channel.subscribe(status => {
                if (channel !== state.channel) return;
                if (status === 'SUBSCRIBED') setRealtimeStatus('live');
                else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRealtimeStatus('offline');
            });
            state.channel = channel;
        } catch (error) {
            console.warn('[Vận hành] Không khởi tạo được Realtime:', error?.message || error);
            setRealtimeStatus('offline');
        }
    }

    function unsubscribeRealtime() {
        const client = getClient();
        if (state.channel && client?.removeChannel) client.removeChannel(state.channel);
        state.channel = null;
    }

    function startPolling() {
        if (state.pollTimer || !state.root) return;
        state.pollTimer = setInterval(() => {
            if (!document.hidden && state.root?.isConnected && state.root.getClientRects().length) requestReload(allResourceNames());
        }, POLL_INTERVAL_MS);
    }

    function stopPolling() {
        clearInterval(state.pollTimer);
        state.pollTimer = null;
    }

    // ------------------------------------------------------------------
    // Điều hướng sang phân hệ nghiệp vụ (Dashboard chỉ đọc)
    // ------------------------------------------------------------------
    const NAV_TARGETS = {
        appointments: { module: 'Dịch vụ', keys: { pawpal_admin_services_active_subtab: 'tab-service-bookings' } },
        orders: { module: 'Bán hàng', keys: { pawpal_admin_order_subtab: 'tab-order-list', pawpal_admin_order_filter_status: 'pending' } },
        staff: { module: 'Nhân sự', keys: { pawpal_admin_staff_active_subtab: 'tab-staff-schedule' } },
        stock: { module: 'Bán hàng', keys: { pawpal_admin_order_subtab: 'tab-order-products' } },
        tickets: { module: 'Khiếu nại', keys: { pawpal_admin_complaint_active_subtab: 'tab-complaint-services' } }
    };

    function navigate(target, recordId) {
        let config = NAV_TARGETS[target];
        if (target === 'appointment' && recordId) config = { module: 'Dịch vụ', keys: { pawpal_admin_services_active_subtab: 'tab-service-detail', pawpal_admin_service_selected_id: recordId } };
        else if (target === 'order' && recordId) config = { module: 'Bán hàng', keys: { pawpal_admin_order_subtab: 'tab-order-detail', pawpal_admin_order_selected_id: recordId } };
        else if (target === 'ticket' && recordId) config = { module: 'Khiếu nại', keys: { pawpal_admin_complaint_active_subtab: 'tab-complaint-detail', pawpal_admin_complaint_selected_id: recordId } };
        else if (target === 'return') config = { module: 'Khiếu nại', keys: { pawpal_admin_complaint_active_subtab: 'tab-complaint-orders' } };
        else if (target === 'appointment') config = NAV_TARGETS.appointments;
        else if (target === 'order') config = NAV_TARGETS.orders;
        else if (target === 'ticket') config = NAV_TARGETS.tickets;
        if (!config) return;
        Object.entries(config.keys).forEach(([key, value]) => sessionStorage.setItem(key, value));
        const button = [...document.querySelectorAll('.sidebar-menu-btn')].find(node => node.getAttribute('data-title') === config.module);
        if (button) button.click();
        else window.location.href = '/admin';
    }

    // ------------------------------------------------------------------
    // Tính toán dẫn xuất
    // ------------------------------------------------------------------
    function rows(name) {
        return state.data[name]?.rows || [];
    }

    // Đang tải lại mà đã có dữ liệu cũ thì giữ khung cũ (làm mờ), không nháy khung xương.
    function resourcesStatus(names) {
        if (names.some(name => state.errors[name])) return { status: 'error', message: state.errors[names.find(name => state.errors[name])] };
        if (names.some(name => !state.data[name])) return { status: 'loading' };
        return { status: 'ok', refreshing: names.some(name => state.loading.has(name)), truncated: names.some(name => state.data[name]?.truncated) };
    }

    function stockRisks() {
        const metrics = M();
        const reservedByVariant = new Map();
        for (const reservation of rows('reservations')) {
            reservedByVariant.set(reservation.product_variant_id, (reservedByVariant.get(reservation.product_variant_id) || 0) + (Number(reservation.quantity) || 0));
        }
        const soldByVariant = new Map();
        for (const detail of rows('salesVelocity')) {
            soldByVariant.set(detail.product_variant_id, (soldByVariant.get(detail.product_variant_id) || 0) + (Number(detail.quantity) || 0));
        }
        // Bỏ SKU ngừng bán như get_admin_dashboard_low_stock (M088).
        const inactive = metrics.STATUS_GROUPS.productInactive;
        const sellable = rows('inventory').filter(row => !inactive.includes(metrics.norm(row.variant_status)));
        return metrics.inventoryRisks(sellable, { reservedByVariant, soldByVariant });
    }

    // Mã chức danh trong CSDL -> tên hiển thị, cùng bộ mã phân hệ Nhân sự dùng (staff.js mapPositionToDbRole).
    const JOB_TITLE_LABELS = {
        cham_soc_thu_cung: 'Chăm sóc thú cưng', quan_tri_vien: 'Quản trị viên', quan_ly: 'Quản lý',
        le_tan: 'Lễ tân', cham_soc_khach_hang: 'Chăm sóc khách hàng', chu_he_thong: 'Chủ hệ thống'
    };
    function jobTitleLabel(value) {
        return JOB_TITLE_LABELS[String(value || '').trim().toLowerCase()] || value || '';
    }

    function staffSummary() {
        return M().staffAllocation({ appointments: rows('periodAppointments'), schedules: rows('schedules'), staff: rows('staff'), period: state.period, now: new Date() });
    }

    function currentAlerts() {
        return M().buildAlerts({
            pendingAppointments: rows('backlogAppointments'),
            activeOrders: rows('actionOrders'),
            openReturns: rows('openReturns'),
            openTickets: rows('openTickets'),
            stockRisks: stockRisks(),
            capacity: staffSummary().capacityRisks,
            now: new Date()
        });
    }

    // ------------------------------------------------------------------
    // Dùng cùng bảng màu trạng thái pastel với badge của hệ thống Admin.
    // ------------------------------------------------------------------
    const SEG = {
        warning: { color: '#F5E8D3', text: 'status-warning' },
        info: { color: '#DCEAF2', text: 'status-info' },
        success: { color: '#DCEEE2', text: 'status-success' },
        neutral: { color: '#E2ECE5', text: 'status-neutral' },
        danger: { color: '#F7DCDC', text: 'status-danger' }
    };
    const APPOINTMENT_SEGMENTS = [
        { label: 'Chờ xác nhận', groups: ['pending'], ...SEG.warning },
        { label: 'Đã xác nhận', groups: ['confirmed'], ...SEG.info },
        { label: 'Đang phục vụ', groups: ['checked_in', 'in_progress'], ...SEG.info },
        { label: 'Hoàn thành', groups: ['completed'], ...SEG.success },
        { label: 'Đã hủy', groups: ['cancelled', 'expired'], ...SEG.danger },
        { label: 'Không đến', groups: ['no_show'], ...SEG.danger },
        { label: 'Khác', groups: ['other'], ...SEG.neutral }
    ];
    const ORDER_SEGMENTS = [
        { label: 'Chờ xác nhận', groups: ['pending'], ...SEG.warning },
        { label: 'Đang chuẩn bị', groups: ['processing'], ...SEG.info },
        { label: 'Đang giao', groups: ['shipping'], ...SEG.info },
        { label: 'Hoàn thành', groups: ['completed'], ...SEG.success },
        { label: 'Đã hủy', groups: ['cancelled'], ...SEG.danger },
        { label: 'Trả hàng', groups: ['returned'], ...SEG.danger },
        { label: 'Khác', groups: ['other'], ...SEG.neutral }
    ];

    // ------------------------------------------------------------------
    // Khối dựng biểu đồ (HTML thuần, chú thích qua data-tip, nội dung luôn được escape)
    // ------------------------------------------------------------------
    function tip(text) {
        return ` data-tip="${esc(text)}" aria-label="${esc(String(text).replace(/\n/g, ', '))}"`;
    }

    function segmentedBar(breakdown, segments, unit) {
        // Trạng thái chưa phân loại được hiển thị riêng trong nhóm "Khác".
        const counts = new Map(breakdown.items.map(item => [item.key, item.value]));
        const parts = segments
            .map(segment => ({ ...segment, value: segment.groups.reduce((sum, group) => sum + (counts.get(group) || 0), 0) }))
            .filter(part => part.value > 0);
        const total = breakdown.total;
        const bar = parts.map(part => {
            const share = part.value / total;
            return `<span class="ops-seg-part ${part.text}" style="flex:${part.value} 1 0;background:${part.color}" tabindex="0"${tip(`${part.label}: ${num(part.value)} ${unit} (${Math.round(share * 100)}%)`)}></span>`;
        }).join('');
        const legend = parts.map(part => `<li><i aria-hidden="true" style="background:${part.color}"></i><span>${esc(part.label)}</span><strong>${num(part.value)}</strong><small>${Math.round(part.value / total * 100)}%</small></li>`).join('');
        return `<div class="ops-seg" role="group" aria-label="Tỷ lệ theo trạng thái">${bar}</div><ul class="ops-legend">${legend}</ul>`;
    }

    function rankedBars(items) {
        const max = Math.max(...items.map(item => item.value), 1);
        return `<ul class="ops-rank">${items.map(item => {
            const width = item.value > 0 ? Math.max(2, Math.round((item.value / max) * 100)) : 0;
            return `<li class="ops-rank-row"><span class="ops-rank-label" title="${esc(item.label)}">${esc(item.label)}</span><span class="ops-rank-plot" tabindex="0"${tip(item.tip || `${item.label}: ${num(item.value)}`)}><span class="ops-rank-track"><span class="ops-rank-bar${item.tone ? ` is-${item.tone}` : ''}" style="width:${width}%"></span></span><span class="ops-rank-value">${num(item.value)}</span></span></li>`;
        }).join('')}</ul>`;
    }

    function meterRow({ name, value, fraction, tone, sub, tipText }) {
        const width = Math.max(0, Math.min(1, fraction || 0)) * 100;
        return `<li tabindex="0"${tip(tipText || `${name}: ${value}`)}><div class="ops-meter-top"><span class="ops-meter-name">${esc(name)}</span><span class="ops-meter-value${tone && tone !== 'ok' ? ` is-${tone}` : ''}">${esc(value)}</span></div><div class="ops-meter-track"><div class="ops-meter-fill${tone && tone !== 'ok' ? ` is-${tone}` : ''}" style="width:${width}%"></div></div>${sub ? `<div class="ops-meter-sub">${esc(sub)}</div>` : ''}</li>`;
    }

    // ------------------------------------------------------------------
    // Hiển thị
    // ------------------------------------------------------------------
    function panel(name) {
        return state.root?.querySelector(`[data-ops-panel="${name}"]`);
    }

    function setPanel(name, html, { tag = '', refreshing = false } = {}) {
        const node = panel(name);
        if (!node) return;
        node.querySelector('[data-ops-body]').innerHTML = html;
        node.querySelector('[data-ops-tag]').textContent = tag;
        node.classList.toggle('is-refreshing', refreshing);
    }

    function skeleton() {
        return '<span class="ops-skeleton"></span><span class="ops-skeleton"></span><span class="ops-skeleton"></span>';
    }

    function errorBlock(message, panelName) {
        return `<p class="ops-error">${esc(message)} <button class="ops-link-btn" data-ops-retry="${esc(panelName)}" type="button">Thử lại</button></p>`;
    }

    function truncatedNote(truncated) {
        return truncated ? `<p class="ops-caption">Dữ liệu vượt ${num(MAX_ROWS)} dòng, hãy thu hẹp khoảng thời gian.</p>` : '';
    }

    function guard(panelName, names, render) {
        const status = resourcesStatus(names);
        if (status.status === 'loading') return setPanel(panelName, skeleton());
        if (status.status === 'error') return setPanel(panelName, errorBlock(status.message, panelName));
        try {
            render(status);
        } catch (error) {
            console.warn(`[Vận hành] Lỗi hiển thị ${panelName}:`, error);
            setPanel(panelName, errorBlock('Không hiển thị được khối này.', panelName));
        }
    }

    function renderKpis() {
        const metrics = M();
        const set = (key, value, tipText, { attention = false, error = false } = {}) => {
            const card = state.root.querySelector(`[data-kpi="${key}"]`);
            if (!card) return;
            card.querySelector('[data-kpi-value]').textContent = value;
            card.dataset.tip = tipText || '';
            card.setAttribute('aria-label', `${card.querySelector('.kpi-label').textContent}: ${value}. ${tipText || ''}`);
            card.classList.toggle('is-attention', attention);
            card.classList.toggle('is-error', error);
        };
        const apply = (key, compute) => {
            const status = resourcesStatus(KPI_RESOURCES[key]);
            if (status.status === 'loading') return set(key, '…', 'Đang tải');
            if (status.status === 'error') return set(key, '—', status.message, { error: true });
            const [value, tipText, attention] = compute();
            set(key, value, tipText, { attention });
        };
        apply('todayAppointments', () => {
            const valid = rows('todayAppointments').filter(metrics.isValidAppointment);
            return [num(valid.length), `Lịch hẹn ngày ${metrics.formatDateKey(state.period.today)}, không tính lịch đã hủy.`];
        });
        apply('pendingAppointments', () => {
            const count = metrics.countPendingAppointments(rows('backlogAppointments'), new Date());
            return [num(count.total), `Chờ xác nhận: ${num(count.pending)}\nĐã xác nhận nhưng chưa có KTV (24 giờ tới): ${num(count.unassigned)}`, count.total > 0];
        });
        apply('pendingOrders', () => {
            const count = metrics.countActionOrders(rows('actionOrders'));
            return [num(count), 'Đơn chờ xác nhận hoặc đang chuẩn bị, chưa giao.', count > 0];
        });
        apply('staffOnShift', () => {
            const summary = staffSummary();
            return [num(summary.staffWithShift), `Nhân viên có ca hợp lệ trong kỳ.\nĐang trong ca lúc này: ${num(summary.onShiftNow)}`];
        });
        apply('lowStock', () => {
            const risks = stockRisks();
            const urgent = risks.filter(item => item.level !== 'watch').length;
            return [num(urgent), `Tồn kho hiện tại.\nHết hàng: ${num(risks.filter(item => item.level === 'out').length)}\nDưới mức tối thiểu hoặc đủ bán dưới ${metrics.THRESHOLDS.stockCoverHighDays} ngày: ${num(risks.filter(item => item.level === 'high').length)}`, urgent > 0];
        });
        apply('openTickets', () => {
            const open = rows('openTickets').filter(ticket => metrics.isTicketOpen(ticket.status));
            return [num(open.length), `Yêu cầu hỗ trợ chưa đóng, tại thời điểm hiện tại.\nChưa phản hồi lần nào: ${num(open.filter(ticket => !ticket.first_response_at).length)}`, open.length > 0];
        });
    }

    const KIND_LABELS = { appointment: 'Lịch hẹn', order: 'Đơn hàng', return: 'Đổi trả', ticket: 'Hỗ trợ', stock: 'Tồn kho', staff: 'Nhân sự' };

    function thresholdsTip() {
        const t = M().THRESHOLDS;
        return `Ngưỡng đang áp dụng\nLịch, đơn chờ xác nhận: từ ${t.appointmentPendingWarnMinutes} phút cần xử lý, quá ${t.appointmentPendingUrgentMinutes} phút khẩn cấp\nLịch chưa có KTV: trong ${t.appointmentUnassignedHours} giờ tới\nKhách chưa đến: quá giờ hẹn ${t.appointmentLateMinutes} phút\nĐơn đã xác nhận chưa giao: từ ${t.orderProcessingHours} giờ\nĐổi trả: quá ${t.returnPendingHours} giờ\nHỗ trợ: chưa phản hồi quá ${t.ticketFirstResponseHours} giờ, chưa giải quyết quá ${t.ticketResolveHours} giờ (ưu tiên cao ${t.ticketResolveUrgentHours} giờ)`;
    }

    function renderAlerts() {
        const pagination = state.root.querySelector('[data-ops-pagination]');
        const hidePagination = () => { pagination.hidden = true; pagination.innerHTML = ''; };
        const title = panel('alerts').querySelector('[data-ops-title]');
        title.dataset.tip = thresholdsTip();
        title.tabIndex = 0;
        const status = resourcesStatus(PANEL_RESOURCES.alerts);
        if (status.status !== 'ok') hidePagination();
        guard('alerts', PANEL_RESOURCES.alerts, ({ refreshing }) => {
            const metrics = M();
            const alerts = currentAlerts();
            if (!alerts.length) {
                hidePagination();
                return setPanel('alerts', '<p class="ops-empty">Không có việc quá hạn theo ngưỡng hiện tại.</p>', { tag: 'Hiện tại', refreshing });
            }
            const urgentCount = alerts.filter(alert => alert.severity === 'urgent').length;
            const byKind = new Map();
            alerts.forEach(alert => {
                const entry = byKind.get(alert.kind) || { total: 0, urgent: 0 };
                entry.total += 1;
                if (alert.severity === 'urgent') entry.urgent += 1;
                byKind.set(alert.kind, entry);
            });
            const kindBars = rankedBars([...byKind.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([kind, entry]) => ({ label: KIND_LABELS[kind] || kind, value: entry.total, tone: entry.urgent ? 'bad' : 'warn', tip: `${KIND_LABELS[kind] || kind}: ${num(entry.total)} việc\nKhẩn cấp: ${num(entry.urgent)}` })));
            const navOf = alert => (alert.kind === 'stock' ? 'stock' : alert.kind === 'staff' ? 'staff' : alert.kind);
            const severityDot = alert => (alert.severity === 'urgent' ? '<span class="ops-dot is-urgent">• Khẩn cấp</span>' : '<span class="ops-dot is-warning">• Cần xử lý</span>');
            const waiting = alert => (alert.waitingHours === null ? '' : metrics.formatWaiting(alert.waitingHours));
            const openButton = alert => `<button class="ops-link-btn" data-ops-nav="${esc(navOf(alert))}" data-ops-record="${esc(alert.recordId || '')}" type="button">Mở</button>`;
            const top = alerts.slice(0, 5).map(alert => `<li class="ops-task">${severityDot(alert)}<span class="ops-task-ref" title="${esc(`${KIND_LABELS[alert.kind]} ${alert.ref}`)}">${esc(alert.ref)}</span><span class="ops-task-reason" title="${esc(alert.reason)}">${esc(alert.reason)}</span><span class="ops-task-wait">${esc(waiting(alert))}</span>${openButton(alert)}</li>`).join('');
            const toggle = `<button class="ops-link-btn" data-ops-toggle-alerts type="button">${state.alertsExpanded ? 'Thu gọn' : `Xem tất cả ${num(alerts.length)} việc`}</button>`;
            let full = '';
            if (state.alertsExpanded) {
                const pages = Math.ceil(alerts.length / ALERTS_PER_PAGE);
                state.alertsPage = Math.min(Math.max(1, state.alertsPage), pages);
                const slice = alerts.slice((state.alertsPage - 1) * ALERTS_PER_PAGE, state.alertsPage * ALERTS_PER_PAGE);
                full = `<div class="table-responsive-wrapper"><table class="admin-table"><thead><tr><th>Mức độ</th><th>Loại</th><th>Mã tham chiếu</th><th>Lý do</th><th class="num">Đã chờ</th><th>Thao tác</th></tr></thead><tbody>${slice.map(alert => `<tr class="${alert.severity === 'urgent' ? 'row-urgent' : 'row-warning'}"><td>${severityDot(alert)}</td><td>${esc(KIND_LABELS[alert.kind] || alert.kind)}</td><td>${esc(alert.ref)}</td><td>${esc(alert.reason)}</td><td class="num">${esc(waiting(alert) || '—')}</td><td>${openButton(alert)}</td></tr>`).join('')}</tbody></table></div>`;
                if (pages > 1) {
                    const buttons = [`<button aria-label="Trang trước" data-ops-page="${state.alertsPage - 1}" type="button"${state.alertsPage === 1 ? ' disabled' : ''}>&lt;</button>`];
                    for (let page = 1; page <= pages; page++) buttons.push(`<button class="${page === state.alertsPage ? 'active' : ''}" data-ops-page="${page}" type="button"${page === state.alertsPage ? ' aria-current="page"' : ''}>${page}</button>`);
                    buttons.push(`<button aria-label="Trang sau" data-ops-page="${state.alertsPage + 1}" type="button"${state.alertsPage === pages ? ' disabled' : ''}>&gt;</button>`);
                    pagination.innerHTML = buttons.join('');
                    pagination.hidden = false;
                } else hidePagination();
            } else hidePagination();
            setPanel('alerts', `<div class="ops-alert-layout"><div><p class="ops-hero"><strong>${num(alerts.length)}</strong><span>việc, ${num(urgentCount)} khẩn cấp</span></p>${kindBars}</div><div><ul class="ops-tasks">${top}</ul><div class="ops-foot"><span></span>${toggle}</div></div></div>${full}`, { tag: 'Hiện tại', refreshing });
        });
    }

    function renderStatusPanel(panelName, resource, breakdownFn, segments, unit, emptyText) {
        guard(panelName, PANEL_RESOURCES[panelName], ({ refreshing, truncated }) => {
            const breakdown = breakdownFn(rows(resource));
            if (!breakdown.total) return setPanel(panelName, `<p class="ops-empty">${emptyText}</p>`, { refreshing });
            const unknown = breakdown.unknownStatuses?.length ? `<p class="ops-caption"${tip(`Trạng thái chưa phân loại: ${breakdown.unknownStatuses.map(item => `${item.status} (${item.count})`).join(', ')}`)} tabindex="0">Có ${num(breakdown.unknownStatuses.reduce((sum, item) => sum + item.count, 0))} ${unit} trạng thái chưa phân loại, đang tính vào "Khác".</p>` : '';
            setPanel(panelName, `<p class="ops-hero"><strong>${num(breakdown.total)}</strong><span>${unit}</span></p>${segmentedBar(breakdown, segments, unit)}${unknown}${truncatedNote(truncated)}`, { refreshing });
        });
    }

    function renderTopServices() {
        guard('topServices', PANEL_RESOURCES.topServices, ({ refreshing, truncated }) => {
            const top = M().topServices(rows('periodAppointments'), new Map(), 5);
            if (!top.length) return setPanel('topServices', '<p class="ops-empty">Chưa có lượt đặt dịch vụ.</p>', { refreshing });
            setPanel('topServices', `${rankedBars(top.map(item => ({ label: item.name, value: item.quantity, tip: `${item.name}\n${num(item.quantity)} lượt trong ${num(item.appointmentCount)} lịch hẹn` })))}${truncatedNote(truncated)}`, { tag: 'Số lượt', refreshing });
        });
    }

    function renderHeatmap() {
        guard('heatmap', PANEL_RESOURCES.heatmap, ({ refreshing, truncated }) => {
            const map = M().appointmentHeatmap(rows('periodAppointments'));
            if (!map.total) return setPanel('heatmap', '<p class="ops-empty">Chưa có lịch hẹn.</p>', { refreshing });
            const hours = [];
            for (let hour = map.fromHour; hour <= map.toHour; hour++) hours.push(hour);
            const level = count => (!count ? 0 : Math.min(4, Math.ceil((count / map.max) * 4)));
            const shortDay = label => label.replace('Thứ ', 'T').replace('Chủ nhật', 'CN');
            const head = `<tr><th scope="col"><span class="ops-sr-only">Ngày</span></th>${hours.map(hour => `<th scope="col">${hour % 2 === 0 ? `${hour}h` : ''}</th>`).join('')}</tr>`;
            const body = map.matrix.map((row, weekday) => `<tr><th scope="row">${esc(shortDay(map.weekdayLabels[weekday]))}</th>${hours.map(hour => {
                const count = row[hour];
                return `<td class="lv-${level(count)}"${tip(`${map.weekdayLabels[weekday]}, ${String(hour).padStart(2, '0')}:00\n${num(count)} lịch hẹn`)}></td>`;
            }).join('')}</tr>`).join('');
            const peak = map.peak ? `<p class="ops-caption">Cao điểm: <strong>${esc(map.peak.label)}</strong> (${num(map.peak.count)} lịch)</p>` : '';
            setPanel('heatmap', `<div class="ops-heatmap-wrap"><table class="ops-heatmap" aria-label="Số lịch hẹn theo ngày trong tuần và giờ bắt đầu"><thead>${head}</thead><tbody>${body}</tbody></table></div>${peak}${truncatedNote(truncated)}`, { refreshing });
        });
    }

    function renderStaff() {
        guard('staff', PANEL_RESOURCES.staff, ({ refreshing, truncated }) => {
            const summary = staffSummary();
            if (!summary.rows.length) return setPanel('staff', '<p class="ops-empty">Chưa có ca làm hoặc lịch được phân công.</p>', { refreshing });
            const high = M().THRESHOLDS.staffUtilizationHigh;
            const meters = summary.rows.slice(0, 6).map(row => {
                const noShift = row.unscheduledWork;
                const tone = noShift ? 'warn' : row.utilization > 1 ? 'bad' : row.utilization > high ? 'warn' : 'ok';
                return meterRow({
                    name: row.name,
                    value: noShift ? 'Chưa có ca' : percent(row.utilization),
                    fraction: noShift ? 1 : row.utilization,
                    tone,
                    sub: `${num(row.assigned)} lịch · ${num(row.shiftHours, 1)} giờ ca`,
                    tipText: `${row.name}${row.jobTitle ? ` (${jobTitleLabel(row.jobTitle)})` : ''}\nGiờ phục vụ dự kiến: ${num(row.bookedHours, 1)} giờ / ${num(row.shiftHours, 1)} giờ ca\nLịch được giao: ${num(row.assigned)}, hoàn thành: ${num(row.completed)}\nTỷ lệ hoàn thành: ${percent(row.completionRate)}`
                });
            }).join('');
            const risk = summary.capacityRisks;
            const riskItems = risk.items || [];
            const unscheduled = risk.unscheduledDays || [];
            const footParts = [];
            if (!risk.evaluated) footParts.push('<span>Chưa có dữ liệu ca làm để đánh giá thiếu người</span>');
            else if (riskItems.length) footParts.push(`<span class="is-risk" tabindex="0"${tip(`Lịch diễn ra cùng lúc nhiều hơn số nhân viên có ca:\n${riskItems.slice(0, 6).map(item => `${item.label}: ${item.demand} lịch, ${item.staffCount} nhân viên`).join('\n')}`)}>${num(riskItems.length)} khung giờ thiếu người</span>`);
            else footParts.push('<span>Không có khung giờ thiếu người</span>');
            if (unscheduled.length) footParts.push(`<span tabindex="0"${tip(`Có lịch hẹn nhưng chưa xếp ca nào:\n${unscheduled.slice(0, 10).map(day => `${day.label}: ${day.appointmentCount} lịch`).join('\n')}${unscheduled.length > 10 ? `\nvà ${unscheduled.length - 10} ngày khác` : ''}`)}>${num(unscheduled.length)} ngày chưa xếp ca</span>`);
            const more = summary.rows.length > 6 ? `<span>Và ${num(summary.rows.length - 6)} nhân viên khác</span>` : '';
            setPanel('staff', `<ul class="ops-meters">${meters}</ul><div class="ops-foot">${footParts.join('')}${more}</div>${truncatedNote(truncated)}`, { tag: 'Giờ phục vụ / giờ ca', refreshing });
        });
    }

    function renderStock() {
        guard('stock', PANEL_RESOURCES.stock, ({ refreshing }) => {
            const risks = stockRisks();
            if (!risks.length) return setPanel('stock', '<p class="ops-empty">Không có SKU nào cần nhập.</p>', { tag: 'Hiện tại', refreshing });
            const metrics = M();
            const meters = risks.slice(0, 6).map(item => {
                const tone = item.level === 'out' ? 'bad' : item.level === 'high' ? 'warn' : 'ok';
                const fraction = item.minimum > 0 ? item.available / item.minimum : (item.coverDays ?? 0) / metrics.THRESHOLDS.stockCoverWatchDays;
                const cover = item.coverDays === null ? 'Chưa có lượt bán' : `Đủ bán khoảng ${num(Math.floor(item.coverDays))} ngày`;
                return meterRow({
                    name: item.productName,
                    value: item.minimum > 0 ? `${num(item.available)} / ${num(item.minimum)}` : num(item.available),
                    fraction,
                    tone,
                    sub: `${item.sku || 'Chưa có SKU'} · ${cover}`,
                    tipText: `${item.productName}\nSKU: ${item.sku || '—'}\nTồn kho: ${num(item.onHand)}, đang giữ: ${num(item.reserved)}, khả dụng: ${num(item.available)}\nTồn tối thiểu: ${num(item.minimum)}\nBán trung bình: ${num(item.dailyRate, 1)}/ngày (${metrics.THRESHOLDS.salesWindowDays} ngày gần nhất)`
                });
            }).join('');
            const more = risks.length > 6 ? `Và ${num(risks.length - 6)} SKU khác` : '';
            setPanel('stock', `<ul class="ops-meters">${meters}</ul><div class="ops-foot"><span>${more}</span><button class="ops-link-btn" data-ops-nav="stock" type="button">Xem kho hàng</button></div>`, { tag: 'Khả dụng / tối thiểu', refreshing });
        });
    }

    function renderQuality() {
        guard('quality', PANEL_RESOURCES.quality, ({ refreshing }) => {
            const metrics = M();
            const q = metrics.serviceQuality({ reviews: rows('periodReviews'), ticketsInPeriod: rows('periodTickets'), openTickets: rows('openTickets'), now: new Date() });
            const reviewHtml = q.reviewCount
                ? `<p class="ops-hero"><strong>${num(q.averageRating, 1)}/5</strong><span>${num(q.reviewCount)} đánh giá trong kỳ</span></p>${rankedBars(q.distribution.map(item => ({ label: `${item.star} sao`, value: item.count, tone: item.star <= 2 ? 'bad' : '', tip: `${item.star} sao: ${num(item.count)} đánh giá` })))}`
                : '<p class="ops-empty">Chưa có đánh giá trong kỳ.</p>';
            const supportHtml = `<div class="ops-stats"><div class="ops-stat" tabindex="0"${tip('Yêu cầu hỗ trợ chưa đóng, tại thời điểm hiện tại')}><span>Đang mở</span><strong class="${q.openCount ? 'is-attention' : ''}">${num(q.openCount)}</strong></div><div class="ops-stat" tabindex="0"${tip(`Chưa được phản hồi lần nào.${q.oldestOpenHours !== null ? `\nYêu cầu mở lâu nhất: ${metrics.formatWaiting(q.oldestOpenHours)}` : ''}`)}><span>Chưa phản hồi</span><strong class="${q.waitingFirstResponse ? 'is-attention' : ''}">${num(q.waitingFirstResponse)}</strong></div><div class="ops-stat" tabindex="0"${tip(`Thời gian phản hồi đầu tiên (trung vị) của yêu cầu tạo trong kỳ.\nTạo mới: ${num(q.ticketsCreated)}, đã xong: ${num(q.ticketsResolved)}${q.supportRatingCount ? `\nKhách chấm hỗ trợ: ${num(q.supportRatingAverage, 1)}/5 (${num(q.supportRatingCount)} lượt)` : ''}`)}><span>Phản hồi đầu tiên</span><strong>${q.medianFirstResponseHours === null ? 'N/A' : esc(metrics.formatWaiting(q.medianFirstResponseHours))}</strong></div></div>`;
            setPanel('quality', `<div class="ops-quality"><div><p class="ops-subtitle">Đánh giá của khách</p>${reviewHtml}</div><div><p class="ops-subtitle">Hỗ trợ khách hàng</p>${supportHtml}</div></div>`, { refreshing });
        });
    }

    // Kỳ không có lịch hẹn lẫn đơn hàng: thay các khối trống bằng một dòng, gợi ý xem kỳ dài hơn.
    const PERIOD_PANELS = ['appointmentStatus', 'orderStatus', 'topServices', 'heatmap'];
    function renderEmptyPeriod() {
        const node = state.root.querySelector('[data-ops-empty-period]');
        const status = resourcesStatus(['periodAppointments', 'periodOrders']);
        const empty = status.status === 'ok' && !rows('periodAppointments').length && !rows('periodOrders').length;
        const staffEmpty = empty && resourcesStatus(PANEL_RESOURCES.staff).status === 'ok' && !staffSummary().rows.length;
        PERIOD_PANELS.forEach(name => { panel(name).hidden = empty; });
        panel('staff').hidden = staffEmpty;
        panel('stock').classList.toggle('ops-panel-wide', staffEmpty); // không để khối tồn kho đứng một mình nửa hàng
        node.hidden = !empty;
        if (empty) {
            const next = { today: ['7d', '7 ngày'], '7d': ['30d', '30 ngày'], '30d': ['90d', '90 ngày'] }[state.preset];
            const label = state.preset === 'today' ? 'Hôm nay' : 'Kỳ này';
            node.innerHTML = `<span>${label} chưa có lịch hẹn và đơn hàng.</span>${next ? `<button class="ops-link-btn" data-ops-range="${next[0]}" type="button">Xem ${next[1]}</button>` : ''}`;
        }
    }

    function renderSyncStatus() {
        const node = state.root?.querySelector('[data-ops-sync-status]');
        if (!node) return;
        const time = state.lastUpdatedAt ? state.lastUpdatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;
        let text;
        if (!time) text = state.loading.size ? 'Đang tải' : 'Đang kết nối';
        else if (state.realtime === 'live') text = `Trực tiếp · ${time}`;
        else if (state.realtime === 'connecting') text = `Đang kết nối · ${time}`;
        else text = `Tự làm mới mỗi phút · ${time}`;
        node.textContent = text;
        node.dataset.tip = state.realtime === 'live'
            ? 'Đang nhận thay đổi trực tiếp từ hệ thống. Số liệu tự cập nhật khi có lịch, đơn, ca làm, tồn kho hoặc hỗ trợ thay đổi.'
            : 'Chưa nhận được thay đổi trực tiếp. Trang tự làm mới mỗi phút, hoặc dùng nút Làm mới trên header.';
        node.classList.toggle('is-live', state.realtime === 'live');
        node.classList.toggle('is-offline', state.realtime === 'offline');
    }

    function renderToolbar() {
        state.root.querySelectorAll('.ops-range-group [data-ops-range]').forEach(button => {
            const active = button.dataset.opsRange === state.preset;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        state.root.querySelector('[data-ops-custom]').hidden = state.preset !== 'custom';
        state.root.querySelector('[data-ops-period-label]').textContent = state.period ? `(${state.period.label})` : '';
    }

    function renderAll() {
        if (!state.root || !state.period || !M()) return;
        renderToolbar();
        renderKpis();
        renderAlerts();
        renderStatusPanel('appointmentStatus', 'periodAppointments', M().appointmentStatusBreakdown, APPOINTMENT_SEGMENTS, 'lịch hẹn', 'Chưa có lịch hẹn.');
        renderStatusPanel('orderStatus', 'periodOrders', M().orderStatusBreakdown, ORDER_SEGMENTS, 'đơn hàng', 'Chưa có đơn hàng.');
        renderTopServices();
        renderHeatmap();
        renderStaff();
        renderStock();
        renderQuality();
        renderEmptyPeriod();
        renderSyncStatus();
    }

    // ------------------------------------------------------------------
    // Chú thích khi rê chuột hoặc chọn bằng bàn phím (nội dung gán bằng textContent)
    // ------------------------------------------------------------------
    function bindTooltip() {
        const tipNode = state.root.querySelector('[data-ops-tip]');
        const show = target => {
            const text = target?.dataset?.tip;
            if (!text) return hide();
            tipNode.textContent = text;
            tipNode.hidden = false;
            const rect = target.getBoundingClientRect();
            const box = tipNode.getBoundingClientRect();
            let left = rect.left + rect.width / 2 - box.width / 2;
            left = Math.max(8, Math.min(left, window.innerWidth - box.width - 8));
            let top = rect.top - box.height - 8;
            if (top < 8) top = rect.bottom + 8;
            tipNode.style.left = `${left}px`;
            tipNode.style.top = `${top}px`;
        };
        const hide = () => { tipNode.hidden = true; };
        on(state.root, 'mouseover', event => { const target = event.target.closest('[data-tip]'); if (target) show(target); });
        on(state.root, 'mouseout', event => { if (!event.relatedTarget?.closest?.('[data-tip]')) hide(); });
        on(state.root, 'focusin', event => { const target = event.target.closest('[data-tip]'); if (target) show(target); else hide(); });
        on(state.root, 'focusout', hide);
        on(document, 'scroll', hide, true);
    }

    // ------------------------------------------------------------------
    // Bộ lọc và sự kiện giao diện
    // ------------------------------------------------------------------
    function showFilterError(message) {
        const node = state.root.querySelector('[data-ops-filter-error]');
        node.textContent = message || '';
        node.hidden = !message;
    }

    // Đổi kỳ hoặc làm mới: tải lại toàn bộ, giữ khung cũ làm mờ trong lúc tải.
    function reloadAll() {
        state.generation++;
        state.loading.clear();
        state.dirty.clear();
        allResourceNames().forEach(name => { delete state.errors[name]; });
        loadResources(allResourceNames());
    }

    function applyPeriod(preset, custom) {
        const period = M().resolvePeriod(preset, new Date(), custom);
        if (!period.ok) { showFilterError(period.error); return; }
        showFilterError('');
        state.preset = preset;
        state.period = period;
        state.alertsPage = 1;
        try { sessionStorage.setItem('pawpal_admin_ops_dashboard_range', JSON.stringify({ preset, custom: preset === 'custom' ? custom : null })); } catch (_) { /* bỏ qua */ }
        reloadAll();
    }

    function bindEvents() {
        on(state.root, 'click', event => {
            const range = event.target.closest('[data-ops-range]');
            if (range) {
                const preset = range.dataset.opsRange;
                if (preset === 'custom') {
                    state.preset = 'custom';
                    const from = state.root.querySelector('[data-ops-from]');
                    const to = state.root.querySelector('[data-ops-to]');
                    if (!from.value) from.value = state.period?.from || '';
                    if (!to.value) to.value = state.period?.to || '';
                    renderToolbar();
                    from.focus();
                } else {
                    applyPeriod(preset);
                }
                return;
            }
            if (event.target.closest('[data-ops-apply]')) {
                applyPeriod('custom', { from: state.root.querySelector('[data-ops-from]').value, to: state.root.querySelector('[data-ops-to]').value });
                return;
            }
            if (event.target.closest('[data-ops-toggle-alerts]')) {
                state.alertsExpanded = !state.alertsExpanded;
                state.alertsPage = 1;
                renderAlerts();
                return;
            }
            const retry = event.target.closest('[data-ops-retry]');
            if (retry) {
                const names = PANEL_RESOURCES[retry.dataset.opsRetry] || [];
                names.forEach(name => delete state.errors[name]);
                loadResources(names);
                return;
            }
            const page = event.target.closest('[data-ops-page]');
            if (page && !page.disabled) {
                state.alertsPage = Number(page.dataset.opsPage) || 1;
                renderAlerts();
                return;
            }
            const nav = event.target.closest('[data-ops-nav]');
            if (nav) { navigate(nav.dataset.opsNav, nav.dataset.opsRecord || null); return; }
            const kpi = event.target.closest('[data-ops-link]');
            if (kpi) navigate(kpi.dataset.opsLink);
        });
        on(state.root, 'keydown', event => {
            const kpi = event.target.closest('[data-ops-link]');
            if (kpi && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); navigate(kpi.dataset.opsLink); }
        });
        state.root.querySelectorAll('[data-ops-link]').forEach(card => { card.tabIndex = 0; card.setAttribute('role', 'button'); });
        // Tín hiệu làm mới của Admin (bao gồm thao tác xóa mà Realtime theo bảng không gửi).
        on(window, 'pawpal:workspace-invalidated', () => requestReload(allResourceNames()));
        on(window, 'pawpal:mutation', event => {
            const table = event.detail?.table;
            if (TABLE_RESOURCES[table]) requestReload(TABLE_RESOURCES[table]);
        });
        on(document, 'visibilitychange', () => {
            if (!document.hidden && state.dirty.size) flushReload();
        });
        on(window, 'admin:module-show', () => { if(state.dirty.size) flushReload(); });
        on(window, 'admin:subtab-change', () => { if(state.dirty.size) flushReload(); });
        bindTooltip();
    }

    // ------------------------------------------------------------------
    // Gắn và gỡ module
    // ------------------------------------------------------------------
    async function mount(container) {
        if (!M()) throw new Error('Thiếu operations-metrics.js');
        unmount();
        let root = container?.matches?.('[data-ops-root]') ? container : container?.querySelector?.('[data-ops-root]');
        if (!root && container) {
            const response = await fetch(HTML_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error('Không tải được giao diện tab Quản trị vận hành');
            container.innerHTML = await response.text();
            root = container.querySelector('[data-ops-root]');
        }
        if (!root) throw new Error('Không tìm thấy vùng hiển thị tab Quản trị vận hành');
        state.root = root;
        state.data = {};
        state.errors = {};
        state.loading.clear();
        state.dirty.clear();
        state.alertsExpanded = false;
        state.realtime = 'connecting';
        bindEvents();
        let saved = null;
        try { saved = JSON.parse(sessionStorage.getItem('pawpal_admin_ops_dashboard_range') || 'null'); } catch (_) { saved = null; }
        if (saved?.preset === 'custom' && saved.custom) {
            root.querySelector('[data-ops-from]').value = saved.custom.from || '';
            root.querySelector('[data-ops-to]').value = saved.custom.to || '';
        }
        subscribeRealtime();
        const preset = saved?.preset && ['today', '7d', '30d', '90d', 'custom'].includes(saved.preset) ? saved.preset : 'today';
        const period = M().resolvePeriod(preset, new Date(), saved?.custom || {});
        applyPeriod(period.ok ? preset : 'today', saved?.custom || {});
    }

    function unmount() {
        clearTimeout(state.debounceTimer);
        stopPolling();
        unsubscribeRealtime();
        state.listeners.splice(0).forEach(remove => remove());
        state.generation++;
        state.root = null;
    }

    window.PawpalOperationsDashboard = {
        mount,
        unmount,
        refresh: () => state.root && reloadAll(),
        getState: () => ({ preset: state.preset, period: state.period, realtime: state.realtime, lastUpdatedAt: state.lastUpdatedAt, errors: { ...state.errors } })
    };
    window.PawpalDashboard = window.PawpalDashboard || {};
    window.PawpalDashboard.subtabs = window.PawpalDashboard.subtabs || {};
    window.PawpalDashboard.subtabs.operations = window.PawpalOperationsDashboard;
})();
