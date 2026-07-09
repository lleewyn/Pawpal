/* ==========================================================================
   return-guest.js — Tra cứu lịch dịch vụ / đơn hàng
   ========================================================================== */

const BOOKING_STATUS = {
    upcoming:      { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    confirmed:     { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    pending:       { label: 'Chờ xác nhận',   cls: 'rg-badge-pending' },
    'in-progress': { label: 'Đang thực hiện', cls: 'rg-badge-inprogress' },
    completed:     { label: 'Hoàn thành',     cls: 'rg-badge-completed' },
    cancelled:     { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
};

const ORDER_STATUS = {
    pending:         { label: 'Chờ xác nhận',   cls: 'rg-badge-pending' },
    pending_payment: { label: 'Chờ thanh toán', cls: 'rg-badge-pending' },
    preparing:       { label: 'Đang chuẩn bị',  cls: 'rg-badge-inprogress' },
    shipping:        { label: 'Đang giao hàng', cls: 'rg-badge-shipping' },
    delivered:       { label: 'Đã giao',        cls: 'rg-badge-confirmed' },
    completed:       { label: 'Hoàn thành',     cls: 'rg-badge-completed' },
    cancelled:       { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
    return_pending:  { label: 'Chờ đổi trả',    cls: 'rg-badge-pending' },
};

let rgOtpFlowActive = false;
let rgLastSearchState = {
    phone: '',
    bookings: [],
    orders: [],
};

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('rg-form');
    const errorBox  = document.getElementById('rg-error');
    const resultsEl = document.getElementById('rg-results');

    errorBox.classList.add('d-none');
    resultsEl.classList.add('d-none');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('rg-phone').value.trim();
        if (!phone) return;

        const btn = form.querySelector('button[type=submit]');
        btn.disabled    = true;
        btn.textContent = 'Đang tìm...';

        const data     = await loadData();
        const normPhone = normalizePhone(phone);
        const memberUser = (data.users || []).find(u =>
            normalizePhone(u.phone) === normPhone && !u.is_temporary
        );

        let bookings = findBookingsByPhone(phone, data);
        let orders   = findOrdersByPhone(phone, data);

        const supabaseResults = await loadSupabaseGuestResults(phone);
        if ((supabaseResults.bookings && supabaseResults.bookings.length) ||
            (supabaseResults.orders && supabaseResults.orders.length)) {
            
            // Gộp kết quả từ Supabase với kết quả local, ưu tiên Supabase nếu trùng ID
            const sbBookings = supabaseResults.bookings || [];
            const sbOrders = supabaseResults.orders || [];
            
            const sbBookingIds = new Set(sbBookings.map(b => b.id));
            const sbOrderIds = new Set(sbOrders.map(o => o.id));
            
            const mergedBookings = [...sbBookings];
            for (const b of bookings) {
                if (!sbBookingIds.has(b.id)) mergedBookings.push(b);
            }
            bookings = mergedBookings;
            
            const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
            const mergedOrders = [...sbOrders];
            mergedOrders.forEach(mo => {
                const lo = localOrders.find(l => l.id === mo.id);
                if (lo && (lo.status === 'completed' || lo.status === 'return_pending')) {
                    mo.status = lo.status;
                }
            });
            for (const o of orders) {
                if (!sbOrderIds.has(o.id)) mergedOrders.push(o);
            }
            orders = mergedOrders;
            
            showToast('Đã tìm thấy kết quả tra cứu.', 'success');
        }

        btn.disabled    = false;
        btn.textContent = 'Tìm kiếm';

        if (!bookings.length && !orders.length) {
            // Dự phòng: thử đọc dữ liệu gốc (bỏ qua dữ liệu ghi đè trong localStorage)
            const rawBookings = await fetchJSON(resolveAppUrl('../../../data/bookings.json')) || [];
            const rawOrders = await fetchJSON(resolveAppUrl('../../../data/orders.json')) || [];
            const normPhone = normalizePhone(phone);
            const fb = (rawBookings || []).filter(b =>
                normalizePhone(b.phone) === normPhone ||
                normalizePhone(b.customerPhone) === normPhone ||
                normalizePhone(b.ownerPhone) === normPhone
            ).map(b => ({ ...b }));
            const fo = (rawOrders || []).filter(o =>
                normalizePhone(o.delivery?.phone) === normPhone ||
                normalizePhone(o.phone) === normPhone ||
                normalizePhone(o.userPhone) === normPhone
            ).map(o => ({ ...o }));

            if (fb.length || fo.length) {
                bookings = fb;
                orders = fo;
                showToast('Kết quả lấy từ dữ liệu gốc (file). Nếu bạn dùng dữ liệu local cũ, thử xóa cache và reload.', 'info');
            } else {
                resultsEl.classList.add('d-none');
                errorBox.classList.remove('d-none');
                return;
            }
        }

        errorBox.classList.add('d-none');
        resultsEl.classList.remove('d-none');
        if (memberUser) {
            errorBox.innerHTML = `
                Số điện thoại này thuộc tài khoản thành viên. Mình vẫn hiển thị kết quả tra cứu bên dưới, nhưng nếu muốn xem đầy đủ lịch sử cá nhân thì hãy vào trang cá nhân.
            `;
            errorBox.classList.remove('d-none');
        }
        rgLastSearchState = {
            phone,
            bookings,
            orders,
        };
        renderResults(bookings, orders);
    });
});

// ── Data ──────────────────────────────────────────────────────────────────
function resolveAppUrl(path) {
    return new URL(path, window.location.href).href;
}

async function loadData() {
    const [bookingsRaw, ordersRaw, usersRaw, petsRaw] = await Promise.all([
        fetchJSON(resolveAppUrl('../../../data/bookings.json')),
        fetchJSON(resolveAppUrl('../../../data/orders.json')),
        fetchJSON(resolveAppUrl('../../../data/users.json')),
        fetchJSON(resolveAppUrl('../../../data/pets.json')),
    ]);

    // Merge với localStorage để phản ánh thay đổi user đã thực hiện
    const localBookings = safeParseArray('pawpal_bookings');
    const localOrders   = safeParseArray('pawpal_orders');
    const localPets     = safeParseArray('pawpal_pets');

    const bookingsMap = new Map((bookingsRaw || []).map(b => [b.id, b]));
    localBookings.forEach(b => { if (b.id) bookingsMap.set(b.id, b); });

    const ordersMap = new Map((ordersRaw || []).map(o => [o.id, o]));
    localOrders.forEach(o => { if (o.id) ordersMap.set(o.id, o); });

    // Merge pets: seed từ file + user tự thêm từ localStorage
    const petsMap = new Map((petsRaw || []).map(p => [p.id, p]));
    localPets.forEach(p => { if (p.id) petsMap.set(p.id, p); });

    return {
        bookings: [...bookingsMap.values()],
        orders:   [...ordersMap.values()],
        users:    usersRaw || [],
        pets:     [...petsMap.values()],
    };
}

async function fetchJSON(url) {
    try {
        const r = await fetch(url);
        return r.ok ? r.json() : [];
    } catch (_) { return []; }
}

function safeParseArray(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]') || []; }
    catch (_) { return []; }
}

function normalizePhone(p) {
    return String(p || '').replace(/\D/g, '').replace(/^84/, '0');
}

async function loadSupabaseGuestResults(phone) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !phone) return { bookings: [], orders: [] };

    const normPhone = normalizePhone(phone);
    try {
        const { data: orderRows, error: orderError } = await db
            .from('sales_order')
            .select(`
                id,
                order_code,
                order_status,
                payment_status,
                subtotal,
                shipping_fee,
                discount_amount,
                total_amount,
                created_at,
                updated_at,
                note,
                customer_address!inner ( receiver_name, receiver_phone, street_address, province ),
                sales_order_detail ( id, quantity, unit_price, discount_amount, subtotal, product ( id, product_name, sku, image_urls ) ),
                payment ( payment_method, transaction_status )
            `)
            .eq('customer_address.receiver_phone', normPhone)
            .order('created_at', { ascending: false });

        if (orderError) {
            console.warn('[ReturnGuest] Supabase order lookup failed:', orderError.message || orderError);
        }

        const { data: bookingRows, error: bookingError } = await db
            .from('appointment')
            .select(`
                id,
                appointment_code,
                appointment_date,
                appointment_time,
                appointment_status,
                payment_status,
                note,
                customer!inner ( id, phone_main, customer_profile ( full_name ) ),
                service ( id, service_name, service_price_matrix ( unit_price ) ),
                pet_profile ( id, pet_name )
            `)
            .eq('customer.phone_main', normPhone)
            .order('appointment_date', { ascending: false });

        if (bookingError) {
            console.warn('[ReturnGuest] Supabase booking lookup failed:', bookingError.message || bookingError);
        }

        return {
            bookings: Array.isArray(bookingRows) ? bookingRows.map(mapSupabaseBookingRow) : [],
            orders: Array.isArray(orderRows) ? orderRows.map(mapSupabaseOrderRow) : [],
        };
    } catch (err) {
        console.warn('[ReturnGuest] Supabase guest lookup exception:', err);
        return { bookings: [], orders: [] };
    }
}

function mapSupabaseOrderRow(row) {
    const addr = row.customer_address || {};
    const products = Array.isArray(row.sales_order_detail)
        ? row.sales_order_detail.map((detail) => ({
            id: detail.product?.id || '',
            name: detail.product?.product_name || 'Sản phẩm',
            sku: detail.product?.sku || '',
            image: normalizeImageUrl(detail.product?.image_urls?.[0]),
            quantity: detail.quantity,
            price: detail.unit_price,
            total: detail.subtotal,
        }))
        : [];

    return {
        id: row.order_code || row.id,
        _supabaseId: row.id,
        userId: null,
        userPhone: addr.receiver_phone || '',
        status: mapOrderStatus(row.order_status),
        paymentStatus: String(row.payment_status || '').toLowerCase(),
        paymentMethod: 'cod',
        products,
        pricing: {
            subtotal: row.subtotal || products.reduce((acc, p) => acc + p.total, 0),
            shippingFee: row.shipping_fee || 0,
            discount: row.discount_amount || 0,
            total: row.total_amount || (products.reduce((acc, p) => acc + p.total, 0) + (row.shipping_fee || 0) - (row.discount_amount || 0)),
        },
        payment: {
            method: (Array.isArray(row.payment) ? row.payment[0]?.payment_method : row.payment?.payment_method) || 'cod',
            status: (Array.isArray(row.payment) ? row.payment[0]?.status : row.payment?.status) || 'pending'
        },
        delivery: {
            name: addr.receiver_name || '',
            phone: addr.receiver_phone || '',
            address: [addr.street_address, addr.province].filter(Boolean).join(', '),
        },
        note: row.note || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapSupabaseBookingRow(row) {
    return {
        id: row.appointment_code || row.id,
        _supabaseId: row.id,                   // UUID thực, dùng cho Supabase queries
        serviceName: row.service?.service_name || 'Dịch vụ',
        date: row.appointment_date,
        time: row.appointment_time,
        timeStart: row.appointment_time,
        status: String(row.appointment_status || 'pending').toLowerCase(),
        paymentStatus: row.payment_status || 'pending',
        note: row.note || '',
        petName: row.pet_profile?.pet_name || (Array.isArray(row.customer?.customer_profile) ? row.customer.customer_profile[0]?.full_name : row.customer?.customer_profile?.full_name) || 'Bé cưng',
        price: (Array.isArray(row.service?.service_price_matrix) && row.service.service_price_matrix.length > 0) ? row.service.service_price_matrix[0].unit_price : 0,
        branch: '',
        staff: '',
    };
}

function normalizeImageUrl(url) {
    if (!url) return '/assets/images/shop/products/placeholder.webp';
    if (!url.startsWith('http') && !url.startsWith('/')) return '/' + url;
    return url;
}

function mapOrderStatus(status) {
    return {
        'PENDING': 'pending',
        'CONFIRMED': 'pending',
        'PREPARING': 'preparing',
        'SHIPPING': 'shipping',
        'DELIVERED': 'delivered',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled',
    }[String(status || '').toUpperCase()] || String(status || 'pending').toLowerCase();
}

// ── Search ────────────────────────────────────────────────────────────────
function findBookingsByPhone(phone, { bookings, users, pets }) {
    const norm = normalizePhone(phone);
    const user = users.find(u => normalizePhone(u.phone) === norm);

    return bookings
        .filter(b =>
            normalizePhone(b.phone) === norm ||
            normalizePhone(b.customerPhone) === norm ||
            normalizePhone(b.ownerPhone) === norm ||
            (user && String(b.userId) === String(user.id))
        )
        .map(b => {
            const pet = pets.find(p => String(p.id) === String(b.petId));
            return { ...b, petName: pet?.name || b.petName || 'Bé cưng' };
        });
}

function findOrdersByPhone(phone, { orders, users }) {
    const norm = normalizePhone(phone);
    const user = users.find(u => normalizePhone(u.phone) === norm);

    return orders.filter(o =>
        normalizePhone(o.delivery?.phone) === norm ||
        normalizePhone(o.shipping?.phone) === norm ||
        normalizePhone(o.phone) === norm ||
        normalizePhone(o.userPhone) === norm ||
        (user && String(o.userId) === String(user.id))
    );
}

// ── Render ────────────────────────────────────────────────────────────────
function renderResults(bookings, orders) {
    const tabsEl = document.getElementById('rg-tabs');
    const listEl = document.getElementById('rg-list');

    tabsEl.innerHTML = `
        <button class="rg-tab active" data-filter="all">Tất cả (${bookings.length + orders.length})</button>
        <button class="rg-tab" data-filter="booking">Dịch vụ (${bookings.length})</button>
        <button class="rg-tab" data-filter="order">Đơn hàng (${orders.length})</button>`;

    tabsEl.querySelectorAll('.rg-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabsEl.querySelectorAll('.rg-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            listEl.querySelectorAll('.rg-item').forEach(item => {
                item.style.display = (f === 'all' || item.dataset.type === f) ? '' : 'none';
            });
        });
    });

    listEl.innerHTML =
        bookings.map(b => buildBookingCard(b)).join('') +
        orders.map(o => buildOrderCard(o)).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────────
function badge(statusMap, status) {
    const normalized = normalizeOrderStatus(status);
    const s = statusMap[normalized] || { label: normalized, cls: 'rg-badge-pending' };
    return `<span class="rg-badge ${s.cls}">${s.label}</span>`;
}

function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (_) { return d; }
}

/** Tính trạng thái booking dựa vào thời gian thực — copy từ bookings.js */
function resolveBookingStatus(booking) {
    const rawStatus = (booking?.status || 'upcoming').toLowerCase();
    if (['pending', 'cancelled', 'completed', 'in-progress', 'accepted'].includes(rawStatus)) {
        return rawStatus;
    }
    try {
        const date = booking.date || '';
        if (!date) return rawStatus === 'confirmed' ? 'accepted' : 'confirmed';
        const time = booking.timeStart || booking.time || '00:00';
        const scheduled = new Date(`${date}T${time}:00`);
        if (isNaN(scheduled.getTime())) return 'confirmed';
        const hoursPast = (Date.now() - scheduled.getTime()) / (1000 * 60 * 60);
        if (hoursPast >= 4)  return 'completed';
        if (hoursPast >= 1)  return 'in-progress';
        if (hoursPast >= 0)  return 'accepted';
        return 'confirmed';
    } catch (_) { return 'confirmed'; }
}

function fmtPrice(n) {
    return new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
}

function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function canCancelOrder(o) {
    const status = normalizeOrderStatus(o.status);
    // Chỉ cho hủy khi đơn chưa được giao / chưa hoàn thành
    if (!['pending', 'pending_payment', 'preparing'].includes(status)) return false;
    // Đơn đang xử lý hoàn tiền hoặc đã hoàn tiền → không cho hủy lần 2
    if (o.paymentStatus === 'pending_refund' || o.paymentStatus === 'refunded') return false;
    
    // Cho phép hủy bất kể thanh toán COD hay Online (sẽ chuyển sang trạng thái chờ hoàn tiền)
    return true;
}

function canReturnOrder(o) {
    if (o.status !== 'completed') return false;
    // Đã có RMA rồi → không cho yêu cầu thêm
    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    if (returnsList.some(r => r.orderId === o.id)) return false;
    // Trong vòng 7 ngày kể từ ngày hoàn thành
    const updatedAt = o.updatedAt || o.createdAt;
    if (!updatedAt) return false;
    const daysDiff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
}
function canConfirmOrder(o) {
    if (o.status !== 'delivered') return false;
    // Đã có RMA rồi → ẩn nút xác nhận
    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    if (returnsList.some(r => r.orderId === o.id)) return false;
    // Nếu order local đang là completed hoặc return_pending thì ẩn
    const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const localOrder = localOrders.find(lo => lo.id === o.id);
    if (localOrder && (localOrder.status === 'completed' || localOrder.status === 'return_pending')) return false;
    
    return true;
}

function canModifyBooking(b) {
    if (!['pending', 'confirmed', 'upcoming'].includes(b.status)) return false;
    if ((b.changeCount || 0) >= 2) return false;
    try {
        const [y, m, d] = (b.date || '').split('-');
        const [h, min]  = (b.timeStart || b.time || '09:00').split(':');
        return (new Date(y, m - 1, d, h, min) - new Date()) > 2 * 3600 * 1000;
    } catch (_) { return false; }
}

function canCancelBooking(b) {
    if (!['pending', 'confirmed', 'upcoming'].includes(b.status)) return false;
    if ((b.cancelCount || 0) >= 3) return false;
    try {
        const [y, m, d] = (b.date || '').split('-');
        const [h, min]  = (b.timeStart || b.time || '09:00').split(':');
        return (new Date(y, m - 1, d, h, min) - new Date()) > 2 * 3600 * 1000;
    } catch (_) { return false; }
}

// ── Cards ─────────────────────────────────────────────────────────────────
function buildBookingCard(b) {
    const pet     = esc(b.petName || 'Bé cưng');
    const service = esc(b.serviceName || b.service || 'Dịch vụ');
    const date    = fmtDate(b.date || b.schedule?.date);
    const time    = b.timeStart || b.time || b.schedule?.slot || '';
    const staff   = esc(b.staff || 'Chưa phân công');
    const branch  = esc(b.branch || '');
    const resolvedStatus = resolveBookingStatus(b);
    const cancelClass = resolvedStatus === 'cancelled' ? ' rg-item-cancelled' : '';

    return `
    <div class="rg-item${cancelClass}" data-type="booking">
        <div class="rg-item-header">
            <div>
                <h4 class="rg-item-name">${service}</h4>
                <div class="rg-item-meta">
                    <span>Mã: ${esc(b.id)}</span>
                    <span>${date}${time ? ' · ' + time : ''}</span>
                    <span>Bé: ${pet}</span>
                    ${branch ? `<span>${branch}</span>` : ''}
                </div>
            </div>
            <div style="text-align:right">
                <div class="rg-item-price">${b.price > 0 ? fmtPrice(b.price) : 'Giá theo thực tế'}</div>
                ${badge(BOOKING_STATUS, resolvedStatus)}
            </div>
        </div>
        <hr class="rg-divider">
        <div class="rg-summary">
            <div>
                <div class="rg-summary-label">Nhân viên</div>
                <div class="rg-summary-value">${staff}</div>
            </div>
            ${b.note ? `<div>
                <div class="rg-summary-label">Ghi chú</div>
                <div class="rg-summary-value">${esc(b.note)}</div>
            </div>` : ''}
        </div>
        ${canModifyBooking(b) || canCancelBooking(b) || ['in-progress', 'completed'].includes(resolvedStatus) ? `
        <div class="rg-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px;">
            ${canCancelBooking(b) ? `
            <button class="btn-track-order text-danger border-danger" onclick="handleGuestBookingAction('${esc(b.id)}', 'cancel')">
                Hủy lịch
            </button>` : ''}
            ${canModifyBooking(b) ? `
            <button class="btn-track-order" onclick="handleGuestBookingAction('${esc(b.id)}', 'change')">
                Đổi lịch
            </button>` : ''}
            ${['in-progress', 'completed'].includes(resolvedStatus) ? `
            <button class="btn-track-order" onclick="handleGuestViewCareLog('${esc(b._supabaseId || b.id)}')">
                Nhật ký chăm sóc
            </button>` : ''}
        </div>` : ''}
    </div>`;
}

function buildOrderCard(o) {
    const address = esc(o.delivery?.address || '');

    // Trạng thái thanh toán — đọc cả hai cấu trúc dữ liệu
    const isPaid = o.paymentStatus === 'paid' || o.payment?.status === 'paid';
    const isPendingRefund = o.paymentStatus === 'pending_refund';
    const isRefunded = o.paymentStatus === 'refunded';
    let paymentLabel, paymentColor;
    if (isRefunded) {
        paymentLabel = 'Đã hoàn tiền';
        paymentColor = 'var(--color-success, #2d7d46)';
    } else if (isPendingRefund) {
        paymentLabel = 'Đang xử lý hoàn tiền';
        paymentColor = '#d18b00';
    } else if (isPaid) {
        paymentLabel = 'Đã thanh toán';
        paymentColor = 'var(--color-success, #2d7d46)';
    } else {
        paymentLabel = 'Chưa thanh toán';
        paymentColor = 'inherit';
    }

    const productsHtml = (o.products || []).map(p => `
        <div style="display: flex; gap: 15px; margin-bottom: 12px; align-items: flex-start;">
            <img src="${p.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color, #eee);" onerror="this.src='/assets/images/shop/products/placeholder.webp'">
            <div style="flex: 1; font-size: 0.95em; text-align: left; min-width: 0;">
                <div style="font-weight: 500; color: var(--text-color); line-height: 1.4; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${esc(p.name)}</div>
                <div style="color: #666;">${fmtPrice(p.price)} <span style="margin: 0 4px;">x</span> ${p.quantity}</div>
            </div>
            <div style="font-weight: 600; color: var(--color-primary); white-space: nowrap; padding-left: 10px;">${fmtPrice(p.price * p.quantity)}</div>
        </div>
    `).join('');

    const normalizedStatus = normalizeOrderStatus(o.status);
    const cancelClass = normalizedStatus === 'cancelled' ? ' rg-item-cancelled' : '';

    return `
    <div class="rg-item${cancelClass}" data-type="order">
        <div class="rg-item-header">
            <div>
                <h4 class="rg-item-name">Đơn hàng: ${esc(o.id)}</h4>
                <div class="rg-item-meta">
                    <span>Ngày đặt: ${fmtDate(o.createdAt)}</span>
                    ${o.delivery?.name ? `<span>Nhận: ${esc(o.delivery.name)}</span>` : ''}
                </div>
            </div>
            <div style="text-align:right">
                <div class="rg-item-price">${fmtPrice(o.pricing?.total)}</div>
                ${badge(ORDER_STATUS, o.status)}
            </div>
        </div>
        <hr class="rg-divider">
        <div class="rg-products" style="padding: var(--space-md);">
            ${productsHtml}
        </div>
        <hr class="rg-divider">
        <div class="rg-summary">
            ${address ? `<div>
                <div class="rg-summary-label">Địa chỉ giao</div>
                <div class="rg-summary-value">${address}</div>
            </div>` : ''}
            <div>
                <div class="rg-summary-label">Thanh toán</div>
                <div class="rg-summary-value" style="color:${paymentColor};font-weight:500;">${paymentLabel}</div>
            </div>
        </div>
        <div class="rg-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 15px; align-items: center;">
            ${(JSON.parse(localStorage.getItem('pawpal_returns') || '[]').some(r => r.orderId === o.id)) ? `
            <div style="flex: 1; text-align: left;">
                <span style="display: inline-block; padding: 6px 12px; background: #fff3cd; color: #856404; border-radius: 4px; border: 1px solid #ffeeba; font-size: 0.9em;">
                    Đã yêu cầu đổi trả. <a href="javascript:void(0)" onclick="showGuestReturnDetail('${esc(o.id)}')" style="color: #533f03; text-decoration: underline; font-weight: 500; cursor: pointer;">Xem chi tiết</a>
                </span>
            </div>` : ''}
            ${canCancelOrder(o) ? `
            <button class="btn-track-order text-danger border-danger" onclick="handleGuestCancelOrder('${esc(o.id)}')">
                Hủy đơn hàng
            </button>` : ''}
            ${canConfirmOrder(o) ? `
            <button class="btn-track-order" onclick="handleGuestConfirmOrder('${esc(o.id)}')">
                Xác nhận đơn hàng
            </button>` : ''}
            ${canReturnOrder(o) ? `
            <button class="btn-track-order" onclick="handleGuestReturnRequest('${esc(o.id)}')">
                Yêu cầu trả hàng/hoàn tiền
            </button>` : ''}
        </div>
    </div>`;
}

// ── Actions ───────────────────────────────────────────────────────────────
window.handleGuestBookingAction = function(bookingId, action) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    const title  = action === 'cancel' ? 'Hủy lịch hẹn' : 'Đổi lịch hẹn';
    const desc   = action === 'cancel'
        ? 'Lịch hẹn sau khi hủy sẽ không thể khôi phục. Bạn có chắc muốn tiếp tục?'
        : 'Bạn có muốn thay đổi lịch hẹn này không? PawPal sẽ xác thực danh tính trước khi tiến hành.';

    showActionConfirm(title, desc, phone, () => {
        if (action === 'cancel') {
            confirmCancelBooking(bookingId);
        } else {
            showChangeScheduleModal(bookingId, phone);
        }
    });
};

window.handleGuestCancelOrder = function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    // Tìm đơn để kiểm tra trạng thái thanh toán
    const orders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const order = orders.find(o => o.id === orderId);
    const isPaidOnline = order
        && (order.paymentStatus === 'paid' || order.payment?.status === 'paid')
        && order.paymentMethod !== 'cod'
        && order.paymentMethod;

    const total = order?.pricing?.total || 0;
    const refundNote = isPaidOnline
        ? ` Số tiền <strong>${fmtPrice(total)}</strong> sẽ được hoàn lại theo chính sách của cửa hàng.`
        : '';

    showSendOTPConfirm(
        'Hủy đơn hàng',
        `Đơn hàng sau khi hủy sẽ không thể khôi phục.${refundNote}`,
        phone,
        () => { confirmCancelOrder(orderId); }
    );
};

window.handleGuestConfirmOrder = async function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    showSendOTPConfirm(
        'Xác nhận đơn hàng',
        'Bạn xác nhận đã nhận hàng thành công?',
        phone,
        () => {
            // Update local state immediately
            const order = rgLastSearchState.orders.find(o => o.id === orderId);
            if (order) {
                order.status = 'completed';
                order.updatedAt = new Date().toISOString();
                
                const allOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
                const index = allOrders.findIndex(o => String(o.id) === String(order.id));
                if (index !== -1) {
                    allOrders[index].status = 'completed';
                    allOrders[index].orderStatus = 'COMPLETED';
                } else {
                    allOrders.push({ ...order, status: 'completed', orderStatus: 'COMPLETED' });
                }
                localStorage.setItem('pawpal_orders', JSON.stringify(allOrders));
            }
            
            // Cập nhật lại UI
            renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
            showToast('Đã xác nhận nhận hàng!', 'success');

            // Cập nhật lên Supabase
            if (window.API && typeof window.API.updateOrderStatus === 'function') {
                window.API.updateOrderStatus(orderId, 'COMPLETED').catch(err => {
                    console.warn('[ReturnGuest] Failed to sync completed status:', err);
                });
            } else {
                const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (db) {
                    const isUUID = typeof orderId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
                    let query = db.from('sales_order').update({ order_status: 'DELIVERED', payment_status: 'PAID', updated_at: new Date().toISOString() });
                    query = isUUID ? query.eq('id', orderId) : query.eq('order_code', orderId);
                    query.then(({error}) => {
                        if (error) console.warn('[ReturnGuest] Sync error:', error);
                    });
                }
            }
        }
    );
};

window.handleGuestReturnRequest = function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    showSendOTPConfirm(
        'Yêu cầu đổi trả',
        'Bạn có muốn gửi yêu cầu đổi trả cho đơn hàng này?',
        phone,
        () => {
            // Tìm đơn từ kết quả search hiện tại (đã merge localStorage + seed)
            const order = (rgLastSearchState.orders || []).find(o => o.id === orderId)
                        || JSON.parse(localStorage.getItem('pawpal_orders') || '[]').find(o => o.id === orderId);

            if (!order) {
                showToast('Không tìm thấy đơn hàng.', 'error');
                return;
            }

            // Sync đơn vào localStorage để openRMADrawer đọc được
            try {
                const stored = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
                if (!stored.find(o => o.id === orderId)) {
                    stored.unshift(order);
                    localStorage.setItem('pawpal_orders', JSON.stringify(stored));
                }
            } catch (_) {}

            // Mở RMA drawer
            if (typeof openRMADrawer === 'function') {
                openRMADrawer(orderId);
            } else {
                const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
                const existing = returnsList.find(r => r.orderId === orderId);
                if (existing) {
                    window.location.href = `/pages/user/return-detail/return-detail.html?orderId=${orderId}`;
                } else {
                    showToast('Vui lòng liên hệ Hotline: 1900 xxxx để được hỗ trợ đổi trả.', 'info');
                }
            }
        }
    );
};

// ── Bước 1: Xác nhận hành động (Đồng ý → tự gửi OTP) ────────────────────
function showActionConfirm(title, desc, phone, onConfirm) {
    const existing = document.getElementById('rg-action-confirm-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-action-confirm-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${esc(title)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-0">${esc(desc)}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ bỏ</button>
                    <button type="button" class="btn-cta" id="rg-action-confirm-btn">Đồng ý</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('rg-action-confirm-btn').addEventListener('click', () => {
        modal.hide();
        // Sau khi đồng ý → tự động gửi OTP (không cần user nhấn "Gửi OTP" nữa)
        showOTPModal(phone, onConfirm);
    });
}

// ── Bước 2: Xác nhận gửi OTP (dùng cho hủy đơn hàng) ────────────────────
function showSendOTPConfirm(title, desc, phone, onConfirm) {
    const existing = document.getElementById('rg-send-otp-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-send-otp-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${esc(title)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-1">${desc}</p>
                    <p class="text-muted small">Để xác nhận, PawPal sẽ gửi mã OTP đến số <strong>${esc(phone)}</strong>.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ bỏ</button>
                    <button type="button" class="btn-cta" id="rg-send-otp-btn">Gửi OTP</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('rg-send-otp-btn').addEventListener('click', () => {
        modal.hide();
        showOTPModal(phone, onConfirm);
    });
}

// ── OTP Modal ─────────────────────────────────────────────────────────────
function showOTPModal(phone, onSuccess) {
    if (rgOtpFlowActive) return;
    rgOtpFlowActive = true;

    const existing = document.getElementById('rg-otp-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-otp-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác thực số điện thoại</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center py-4">
                    <p class="text-muted small mb-4">Mã OTP 6 số đã được gửi đến <strong>${esc(phone)}</strong>.<br><span class="text-muted" style="font-size:0.8rem">(Mã test: 555666)</span></p>
                    <div class="otp-inputs-wrapper mb-3">
                        ${Array.from({length:6}, (_,i) =>
                            `<input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric"${i>0?' disabled':''}>`
                        ).join('')}
                    </div>
                    <div class="text-danger small d-none" id="rg-otp-error">Mã OTP không đúng, vui lòng thử lại.</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ</button>
                    <button type="button" class="btn-cta" id="rg-otp-confirm" disabled>Xác nhận</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    el.addEventListener('hidden.bs.modal', () => {
        rgOtpFlowActive = false;
        el.remove();
    });

    const inputs = el.querySelectorAll('.otp-input');
    const confirmBtn = document.getElementById('rg-otp-confirm');
    const errorEl = document.getElementById('rg-otp-error');

    // Auto-focus và navigate giữa các ô
    inputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '').slice(0, 1);
            errorEl.classList.add('d-none');
            inputs.forEach(i => i.classList.remove('otp-error'));

            if (input.value && idx < 5) {
                inputs[idx + 1].disabled = false;
                inputs[idx + 1].focus();
            }

            // Kiểm tra đủ 6 số
            const code = [...inputs].map(i => i.value).join('');
            confirmBtn.disabled = code.length < 6;
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) {
                inputs[idx - 1].focus();
                inputs[idx - 1].value = '';
                if (idx > 0) inputs[idx].disabled = true;
                confirmBtn.disabled = true;
            }
        });
    });

    confirmBtn.addEventListener('click', () => {
        const code = [...inputs].map(i => i.value).join('');
        if (code === '555666') {
            modal.hide();
            onSuccess();
            rgOtpFlowActive = false;
        } else {
            inputs.forEach(i => i.classList.add('otp-error'));
            errorEl.classList.remove('d-none');
        }
    });
}

// ── Guest Care Log Modal ──────────────────────────────────────────────────
window.handleGuestViewCareLog = async function(bookingId) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) {
        showToast('Chức năng đang bảo trì, không thể xem nhật ký chăm sóc lúc này.', 'info');
        return;
    }

    const modal = getOrCreateGuestCareLogModal();
    const timelineWrapper = document.getElementById('guestCareLogTimeline');
    timelineWrapper.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';
    
    // Tìm booking trong danh sách search
    const booking = (rgLastSearchState.bookings || []).find(b => b.id === bookingId) || (rgLastSearchState.bookings || []).find(b => b._supabaseId === bookingId);
    if (booking) {
        document.getElementById('guestCareLogTitle').innerHTML = `Nhật ký chăm sóc: <strong>${esc(booking.petName)}</strong> - <strong>${esc(booking.serviceName || booking.service)}</strong>`;
    }

    modal.show();

    try {
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(bookingId);
        if (!isUUID) {
            timelineWrapper.innerHTML = `
                <div class="text-center p-4 text-muted">
                    Chưa có nhật ký chăm sóc nào được ghi nhận cho dịch vụ này.
                </div>`;
            return;
        }

        const { data, error } = await db.from('care_log')
            .select(`
                id,
                description,
                health_status,
                recorded_at,
                care_action ( action_name ),
                care_log_media ( media_url )
            `)
            .eq('appointment_id', bookingId)
            .order('recorded_at', { ascending: false });

        if (error) {
            console.error('[ReturnGuest] care_log query error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            timelineWrapper.innerHTML = `
                <div class="text-center p-4 text-muted">
                    Chưa có nhật ký chăm sóc nào được ghi nhận cho dịch vụ này.
                </div>`;
            return;
        }

        timelineWrapper.innerHTML = data.map(log => {
            const time = new Date(log.recorded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const date = new Date(log.recorded_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const mediaUrl = log.care_log_media?.[0]?.media_url;
            const staffName = 'Nhân viên PawPal';
            const isUrgent = log.health_status !== 'Tốt' && log.health_status !== 'Bình thường' && log.health_status != null;

            return `
                <div class="timeline-item ${isUrgent ? 'timeline-item-urgent' : ''}" style="display:flex; margin-bottom:1.5rem; position:relative;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${isUrgent ? 'var(--color-danger)' : 'var(--color-primary)'}; position: absolute; left: -6px; top: 6px;"></div>
                    <div style="border-left: 2px solid #e2e8f0; padding-left: 1.5rem; width: 100%;">
                        <div style="font-size: 0.85rem; color: #64748b;">${time} - ${date}</div>
                        <h5 style="margin: 0.25rem 0; font-weight: 600; color: ${isUrgent ? 'var(--color-danger)' : 'inherit'}">
                            ${esc(log.care_action?.action_name || 'Cập nhật')}
                        </h5>
                        <p style="margin-bottom: 0.5rem;">${esc(log.description)}</p>
                        <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                            ${esc(staffName)}
                        </div>
                        ${mediaUrl ? `<img src="${normalizeImageUrl(mediaUrl)}" alt="Photo" style="max-width: 100%; border-radius: 8px; margin-top: 0.5rem; max-height: 200px; object-fit: cover;">` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        timelineWrapper.innerHTML = `
            <div class="text-center p-4 text-danger">
                Lỗi khi tải nhật ký chăm sóc. Vui lòng thử lại sau.
            </div>`;
    }
}

function getOrCreateGuestCareLogModal() {
    let el = document.getElementById('guestCareLogModal');
    if (!el) {
        el = document.createElement('div');
        el.id = 'guestCareLogModal';
        el.className = 'modal fade';
        el.tabIndex = -1;
        el.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="guestCareLogTitle">Nhật ký chăm sóc</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding-left: 2rem;">
                        <div id="guestCareLogTimeline" style="position: relative; border-left: 2px solid transparent;"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Đóng</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);
    }
    return new bootstrap.Modal(el);
}

// ── Cancel Booking Modal ──────────────────────────────────────────────────
function showCancelConfirmModal(bookingId, phone) {
    const existing = document.getElementById('rg-cancel-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-cancel-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác nhận hủy lịch hẹn</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Bạn có chắc muốn hủy lịch hẹn <strong>${esc(bookingId)}</strong>?</p>
                    <p class="text-muted small">Lịch đã hủy sẽ không thể khôi phục.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Quay lại</button>
                    <button type="button" class="btn-cta" id="rg-cancel-confirm">Gửi OTP</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('rg-cancel-confirm').addEventListener('click', () => {
        modal.hide();
        confirmCancelBooking(bookingId);
        showUpsellModal(phone);
    });
}

function confirmCancelBooking(bookingId) {
    const booking = rgLastSearchState.bookings.find(b => b.id === bookingId);
    if (!booking) {
        showToast('Không tìm thấy lịch hẹn.', 'error');
        return;
    }

    // Cập nhật trạng thái hiển thị local
    booking.status = 'cancelled';
    booking.cancelCount = (booking.cancelCount || 0) + 1;
    
    // Lưu vào localStorage pawpal_bookings
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const idx = bookings.findIndex(b => String(b.id) === String(bookingId));
    if (idx !== -1) {
        bookings[idx].status = 'cancelled';
        bookings[idx].cancelCount = (bookings[idx].cancelCount || 0) + 1;
        localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
    } else {
        bookings.push({ ...booking, status: 'cancelled' });
        localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
    }

    // Gọi API hoặc kết nối Supabase
    if (window.API && typeof window.API.updateBookingStatus === 'function') {
        window.API.updateBookingStatus(bookingId, 'CANCELLED').catch(e => console.warn(e));
    } else {
        const db = window.SupabaseClient;
        if (db) {
            const isUUID = typeof bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
            // Fix: Sử dụng bảng 'appointment' thay vì 'service_booking' (cấu trúc mới)
            let query = db.from('appointment').update({ appointment_status: 'CANCELLED', updated_at: new Date().toISOString() });
            query = isUUID ? query.eq('id', bookingId) : query.eq('appointment_code', bookingId);
            query.then(({error}) => { if (error) console.warn('[ReturnGuest] Cancel booking sync error:', error); });
        }
    }

    showToast('Đã hủy lịch hẹn thành công!', 'success');
    renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
    
    const phone = document.getElementById('rg-phone')?.value?.trim() || '';
    if (phone) setTimeout(() => showUpsellModal(phone), 250);
}

// ── Cancel Order ──────────────────────────────────────────────────────────
function confirmCancelOrder(orderId) {
    const order = rgLastSearchState.orders.find(o => o.id === orderId);
    if (!order) {
        showToast('Không tìm thấy đơn hàng trong kết quả tra cứu.', 'error');
        return;
    }

    // Cập nhật trạng thái hiển thị local
    order.status = 'cancelled';
    order.orderStatus = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    
    // Cập nhật pawpal_orders nếu có
    const orders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const idx = orders.findIndex(o => String(o.id) === String(orderId));
    if (idx !== -1) {
        orders[idx].status = 'cancelled';
        orders[idx].orderStatus = 'CANCELLED';
        localStorage.setItem('pawpal_orders', JSON.stringify(orders));
    } else {
        orders.push({ ...order, status: 'cancelled', orderStatus: 'CANCELLED' });
        localStorage.setItem('pawpal_orders', JSON.stringify(orders));
    }

    // Hoàn tồn kho
    try {
        const storedProducts = JSON.parse(localStorage.getItem('pawpal_products') || '[]');
        if (storedProducts.length && Array.isArray(order.products)) {
            order.products.forEach(item => {
                const pi = storedProducts.findIndex(p => String(p.id) === String(item.id));
                if (pi !== -1) {
                    storedProducts[pi].stock = (Number(storedProducts[pi].stock) || 0) + (Number(item.quantity) || 0);
                    storedProducts[pi].inStock = true;
                }
            });
            localStorage.setItem('pawpal_products', JSON.stringify(storedProducts));
        }
    } catch (_) {}

    // Ghi nhận hoàn tiền nếu đã thanh toán online
    const isPaidOnline = (order.paymentStatus === 'paid' || order.payment?.status === 'paid')
                      && order.paymentMethod && order.paymentMethod !== 'cod';
    if (isPaidOnline) {
        const refunds = JSON.parse(localStorage.getItem('pawpal_refunds') || '[]');
        refunds.push({
            orderId: order.id,
            amount: order.pricing?.total || 0,
            paymentMethod: order.paymentMethod,
            status: 'pending_refund',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('pawpal_refunds', JSON.stringify(refunds));
        orders[idx].paymentStatus = 'pending_refund';
    }

    // Trừ điểm Paw Points nếu đơn đã cộng điểm (pointsAwarded)
    if (order.pointsAwarded && order.pointsEarned > 0) {
        try {
            const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
            const phone = order.delivery?.phone || order.userPhone || '';
            const ui = users.findIndex(u => u.phone === phone);
            if (ui !== -1) {
                users[ui].points = Math.max(0, (users[ui].points || 0) - order.pointsEarned);
                localStorage.setItem('pawpal_users_db', JSON.stringify(users));
                // Sync session nếu đang đăng nhập
                const sessionUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                if (sessionUser && sessionUser.phone === phone) {
                    sessionUser.points = users[ui].points;
                    localStorage.setItem('pawpal_current_user', JSON.stringify(sessionUser));
                }
            }
        } catch (_) {}
    }

    // Cập nhật lại timeline trong local storage (nếu có)
    const finalOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const finalIdx = finalOrders.findIndex(o => String(o.id) === String(orderId));
    if (finalIdx !== -1) {
        if (!Array.isArray(finalOrders[finalIdx].timeline)) finalOrders[finalIdx].timeline = [];
        finalOrders[finalIdx].timeline.push({
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            title: 'Đã hủy',
            description: isPaidOnline
                ? `Khách hàng hủy đơn. Yêu cầu hoàn tiền ${fmtPrice(order.pricing?.total || 0)} đã được ghi nhận.`
                : 'Khách hàng hủy đơn hàng'
        });
        localStorage.setItem('pawpal_orders', JSON.stringify(finalOrders));
    }

    // Gọi API hoặc kết nối Supabase
    if (window.API && typeof window.API.updateOrderStatus === 'function') {
        window.API.updateOrderStatus(orderId, 'CANCELLED').catch(e => console.warn(e));
    } else {
        const db = window.SupabaseClient;
        if (db) {
            const isUUID = typeof orderId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
            let query = db.from('sales_order').update({ order_status: 'CANCELLED', updated_at: new Date().toISOString() });
            query = isUUID ? query.eq('id', orderId) : query.eq('order_code', orderId);
            query.then(({error}) => { if (error) console.warn('[ReturnGuest] Cancel order sync error:', error); });
        }
    }

    const toastMsg = isPaidOnline
        ? 'Đã hủy đơn hàng. Yêu cầu hoàn tiền đã được ghi nhận!'
        : 'Đã hủy đơn hàng thành công!';
    showToast(toastMsg, 'success');
    renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
}

function normalizeOrderStatus(status) {
    // Không cần remap nữa — ORDER_STATUS đã có đủ các trạng thái
    return status || 'pending';
}

// ── Change Schedule Modal ─────────────────────────────────────────────────
function showChangeScheduleModal(bookingId, phone) {
    const existing = document.getElementById('rg-change-modal');
    if (existing) existing.remove();

    const slots = (window.PawPalBookingConfig?.slots) || [
        '08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'
    ];
    const staffs = (window.PawPalBookingConfig?.staffs) || [
        { name: 'Phân bổ ngẫu nhiên', desc: 'PawPal tự động chọn nhân viên trống lịch', id: 'random' },
        { name: 'Nguyễn Minh An',     desc: 'Chuyên viên Spa • 3 năm kinh nghiệm',      id: 'staff1' },
        { name: 'Trần An Nhiên',      desc: 'Bảo mẫu Hotel • Cực kỳ nhẹ nhàng',         id: 'staff2' },
        { name: 'Lê Hoàng Tiến',     desc: 'Chuyên viên cắt tỉa Grooming',              id: 'staff3' }
    ];

    // Disabled cho đến khi chọn ngày
    const slotsHtml = slots.map(s =>
        `<button class="rg-slot-time" data-time="${s}" disabled style="opacity:0.4;cursor:not-allowed;">${s}</button>`
    ).join('');

    const staffHtml = staffs.map(s => {
        const initials = s.name === 'Phân bổ ngẫu nhiên' ? '🎲' : s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
            <div class="rg-staff-card" data-name="${s.name}" tabindex="-1" role="button"
                style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:not-allowed;opacity:0.4;transition:all .2s;pointer-events:none;">
                <div style="width:36px;height:36px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:#2e7d32;flex-shrink:0;">${initials}</div>
                <div>
                    <div style="font-weight:700;font-size:0.88rem;color:#2e7d32;">${s.name}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${s.desc}</div>
                </div>
            </div>`;
    }).join('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const el = document.createElement('div');
    el.id = 'rg-change-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Chọn lịch mới — ${esc(bookingId)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">Chọn ngày trước, sau đó chọn giờ và nhân viên.</p>

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn ngày</div>
                    <input type="date" id="rg-date-picker" class="form-control mb-4" min="${minDate}" style="max-width:220px;">

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn giờ</div>
                    <div class="rg-time-grid mb-3" id="rg-slot-grid">${slotsHtml}</div>
                    <div id="rg-hold-banner" class="d-none mb-3" style="font-size:0.82rem;padding:8px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;color:#7a5c00;">
                        ⏳ <strong>Giữ chỗ tạm thời:</strong> Giờ <strong id="rg-hold-label"></strong> được giữ riêng cho bạn trong <strong id="rg-hold-countdown"></strong>
                    </div>

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn nhân viên</div>
                    <div id="rg-staff-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:12px;">${staffHtml}</div>

                    <div class="rg-slot-selected mt-2 d-none" id="rg-slot-info" style="font-size:0.85rem;color:#2e7d32;display:flex;align-items:center;gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Đã chọn: <strong id="rg-slot-text"></strong>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ</button>
                    <button type="button" class="btn-cta" id="rg-change-confirm" disabled>Xác nhận đổi lịch</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    let selDate = '', selTime = null, selStaff = null;
    let holdInterval = null;

    function clearHoldTimer() {
        if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
        document.getElementById('rg-hold-banner').classList.add('d-none');
    }

    function startHoldTimer(slot) {
        clearHoldTimer();
        let remaining = 15 * 60;
        const banner    = document.getElementById('rg-hold-banner');
        const label     = document.getElementById('rg-hold-label');
        const countdown = document.getElementById('rg-hold-countdown');
        label.textContent = slot;
        banner.style.background = '#fff8e1';
        banner.style.borderColor = '#ffe082';
        banner.classList.remove('d-none');

        function tick() {
            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = (remaining % 60).toString().padStart(2, '0');
            countdown.textContent = `${m}:${s}`;
            if (remaining <= 0) {
                clearHoldTimer();
                selTime = null;
                el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
                banner.innerHTML = `⚠️ <strong>Hết thời gian giữ chỗ!</strong> Vui lòng chọn lại giờ.`;
                banner.style.background = '#fff3cd';
                banner.style.borderColor = '#ffeeba';
                banner.classList.remove('d-none');
                refresh();
            }
            remaining--;
        }
        tick();
        holdInterval = setInterval(tick, 1000);
    }

    el.addEventListener('hidden.bs.modal', () => clearHoldTimer());

    function enableTimeAndStaff() {
        el.querySelectorAll('.rg-slot-time').forEach(b => {
            b.disabled = false;
            b.style.opacity = '';
            b.style.cursor = '';
        });
        el.querySelectorAll('.rg-staff-card').forEach(c => {
            c.style.opacity = '';
            c.style.cursor = '';
            c.style.pointerEvents = '';
            c.tabIndex = 0;
        });
    }

    function refresh() {
        const info = document.getElementById('rg-slot-info');
        const txt  = document.getElementById('rg-slot-text');
        const btn  = document.getElementById('rg-change-confirm');
        if (selDate && selTime && selStaff) {
            const d = new Date(selDate + 'T00:00:00');
            txt.textContent = `${d.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })} lúc ${selTime} • ${selStaff}`;
            info.classList.remove('d-none');
            btn.disabled = false;
        } else {
            info.classList.add('d-none');
            btn.disabled = true;
        }
    }

    document.getElementById('rg-date-picker').addEventListener('change', (e) => {
        selDate = e.target.value;
        selTime = null;
        clearHoldTimer();
        el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
        enableTimeAndStaff();
        refresh();
    });

    el.querySelectorAll('.rg-slot-time').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!selDate) return;
            el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selTime = btn.dataset.time;
            startHoldTimer(selTime);
            refresh();
        });
    });

    el.querySelectorAll('.rg-staff-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!selDate) return;
            el.querySelectorAll('.rg-staff-card').forEach(c => {
                c.style.borderColor = '#e2e8f0';
                c.style.background = '';
            });
            card.style.borderColor = '#4caf50';
            card.style.background = '#e8f5e9';
            selStaff = card.dataset.name;
            refresh();
        });
    });

    document.getElementById('rg-change-confirm').addEventListener('click', () => {
        if (!selDate || !selTime || !selStaff) return;
        clearHoldTimer();
        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = bookings.findIndex(b => b.id === bookingId);
        if (idx !== -1) {
            bookings[idx].date = selDate;
            bookings[idx].time = selTime;
            bookings[idx].timeStart = selTime;
            bookings[idx].staff = selStaff;
            bookings[idx].changeCount = (bookings[idx].changeCount || 0) + 1;
            localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
        }

        // Gọi API hoặc kết nối Supabase
        if (window.API && typeof window.API.updateBookingStatus === 'function') {
            window.API.updateBookingStatus(bookingId, 'CONFIRMED').catch(e => console.warn(e));
        } else {
            const db = window.SupabaseClient;
            if (db) {
                const isUUID = typeof bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
                let query = db.from('appointment').update({ 
                    appointment_date: selDate,
                    appointment_time: selTime,
                    appointment_status: 'CONFIRMED', 
                    updated_at: new Date().toISOString() 
                });
                query = isUUID ? query.eq('id', bookingId) : query.eq('appointment_code', bookingId);
                query.then(({error}) => { if (error) console.warn('[ReturnGuest] Change booking sync error:', error); });
            }
        }

        modal.hide();
        showToast('Đã đổi lịch hẹn thành công!', 'success');
        showUpsellModal(phone);
        setTimeout(() => document.getElementById('rg-form').dispatchEvent(new Event('submit')), 1200);
    });
}

// ── Upsell mật khẩu ───────────────────────────────────────────────────────
function showUpsellModal(phone) {
    setTimeout(() => {
        const existing = document.getElementById('rg-upsell-modal');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.id = 'rg-upsell-modal';
        el.className = 'modal fade';
        el.tabIndex = -1;
        el.setAttribute('data-bs-backdrop', 'static');
        el.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center py-4 px-4">
                        <div style="font-size:2.2rem;margin-bottom:12px">🐾</div>
                        <h5 class="fw-bold mb-2" style="color:var(--color-primary-dark)">Thao tác thành công!</h5>
                        <p class="text-muted mb-4">Thiết lập mật khẩu để quản lý lịch hẹn, tích điểm Paw Points và nhận nhiều ưu đãi thành viên.</p>
                        <div class="d-flex flex-column gap-2">
                            <button class="btn-cta w-100" id="rg-upsell-setup">Thiết lập mật khẩu ngay</button>
                            <button class="btn-green-outline w-100" id="rg-upsell-skip">Bỏ qua</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);

        const modal = new bootstrap.Modal(el);
        modal.show();

        document.getElementById('rg-upsell-setup').addEventListener('click', () => {
            window.location.href = `/pages/public/login/login.html`;
        });
        document.getElementById('rg-upsell-skip').addEventListener('click', () => {
            modal.hide();
            restoreLastSearchResults();
        });
    }, 800);
}

function restoreLastSearchResults() {
    const resultsEl = document.getElementById('rg-results');
    const errorBox  = document.getElementById('rg-error');
    if (!resultsEl || !errorBox) return;

    if (rgLastSearchState.bookings.length || rgLastSearchState.orders.length) {
        errorBox.style.display = 'none';
        resultsEl.style.display = 'block';
        renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
        const phoneInput = document.getElementById('rg-phone');
        if (phoneInput && rgLastSearchState.phone) {
            phoneInput.value = rgLastSearchState.phone;
        }
    }
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast-custom toast-${type}`;
    t.innerHTML = `<div class="toast-content"><span class="toast-message">${msg}</span></div>`;
    container.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
}

// --- HIỂN THỊ POPUP CHI TIẾT ĐỔI TRẢ CHO KHÁCH VÃNG LAI ---
window.showGuestReturnDetail = function(orderId) {
    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const ret = returnsList.find(r => r.orderId === orderId);
    if (!ret) {
        showToast('Không tìm thấy thông tin đổi trả!', 'error');
        return;
    }

    let itemsHtml = '';
    if (ret.items && ret.items.length) {
        itemsHtml = ret.items.map(i => `
            <div class="mb-3 p-3 border rounded" style="background: #fafafa">
                <div class="fw-bold mb-1">${i.name} (SL: ${i.quantity})</div>
                <div class="small text-muted mb-1">Tình trạng: ${i.condition}</div>
                <div class="small">Lý do: <span class="fw-medium">${i.reason}</span></div>
            </div>
        `).join('');
    }

    let refundInfoHtml = '';
    if (ret.refundMethod === 'VNPAY') {
        refundInfoHtml = `<div class="mt-3 p-3 bg-light rounded border">
            <h6 class="fw-bold mb-2">Thông tin nhận tiền (VNPAY/Chuyển khoản)</h6>
            <div class="small"><strong>Ngân hàng:</strong> ${ret.refundBank}</div>
            <div class="small"><strong>Số TK:</strong> ${ret.refundAccount}</div>
            <div class="small"><strong>Chủ TK:</strong> ${ret.refundName}</div>
        </div>`;
    }

    const modalHtml = `
        <div class="modal fade" id="guestReturnDetailModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content border-0 shadow-lg">
                    <div class="modal-header border-bottom bg-light">
                        <h5 class="modal-title fw-bold text-primary">Chi tiết Yêu cầu Đổi trả</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                            <div>
                                <div class="text-muted small text-uppercase fw-semibold mb-1">Mã đơn hàng</div>
                                <div class="fw-bold fs-5">${orderId}</div>
                            </div>
                            <div class="text-end">
                                <span class="badge bg-warning text-dark px-3 py-2 fs-6 rounded-pill">Đang chờ xử lý</span>
                            </div>
                        </div>
                        <div class="mb-4 d-flex justify-content-between text-muted small">
                            <span><strong>Ngày gửi yêu cầu:</strong> ${ret.createdAt || 'Gần đây'}</span>
                            <span><strong>Kiểu yêu cầu:</strong> ${ret.requestType === 'refund' ? 'Hoàn tiền' : 'Đổi sản phẩm'}</span>
                        </div>
                        <h6 class="fw-bold mb-3 text-secondary">Sản phẩm đổi/trả:</h6>
                        ${itemsHtml}
                        ${refundInfoHtml}
                    </div>
                    <div class="modal-footer border-top-0 bg-light rounded-bottom">
                        <button type="button" class="btn-cta w-100 py-2 rounded-pill shadow-sm" data-bs-dismiss="modal">Đóng</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('guestReturnDetailModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = new bootstrap.Modal(document.getElementById('guestReturnDetailModal'));
    modal.show();
};
