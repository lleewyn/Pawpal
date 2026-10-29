
const BOOKING_STATUS = {
    upcoming:        { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    confirmed:       { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    accepted:        { label: 'Đã tiếp nhận',   cls: 'rg-badge-confirmed' },
    pending:         { label: 'Chờ xác nhận',   cls: 'rg-badge-pending' },
    'in-progress':   { label: 'Đang thực hiện', cls: 'rg-badge-inprogress' },
    completed:       { label: 'Hoàn thành',     cls: 'rg-badge-completed' },
    cancelled:       { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
    // Enum tiếng Việt CSDL Supabase
    cho_xac_nhan:    { label: 'Chờ xác nhận',   cls: 'rg-badge-pending' },
    da_xac_nhan:     { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    da_check_in:     { label: 'Đã tiếp nhận',   cls: 'rg-badge-confirmed' },
    dang_thuc_hien:  { label: 'Đang thực hiện', cls: 'rg-badge-inprogress' },
    da_hoan_tat:     { label: 'Đã hoàn tất',    cls: 'rg-badge-completed' },
    da_huy:          { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
    vang_mat:        { label: 'Vắng mặt',       cls: 'rg-badge-cancelled' },
};

const ORDER_STATUS = {
    pending:         { label: 'Chờ xác nhận',   cls: 'rg-badge-pending' },
    preparing:       { label: 'Chờ lấy hàng',   cls: 'rg-badge-inprogress' },
    shipping:        { label: 'Đang giao',      cls: 'rg-badge-shipping' },
    delivered:       { label: 'Đã giao',        cls: 'rg-badge-confirmed' },
    completed:       { label: 'Hoàn thành',     cls: 'rg-badge-completed' },
    cancelled:       { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
    returned:        { label: 'Trả hàng',       cls: 'rg-badge-pending' },
    return_pending:  { label: 'Chờ đổi trả',    cls: 'rg-badge-pending' },
    // Enum tiếng Việt CSDL Supabase
    cho_xac_nhan:    { label: 'Chờ xác nhận',   cls: 'rg-badge-pending' },
    da_xac_nhan:     { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    dang_dong_goi:   { label: 'Đang đóng gói',  cls: 'rg-badge-inprogress' },
    dang_giao_hang:  { label: 'Đang giao hàng', cls: 'rg-badge-shipping' },
    da_giao_hang:    { label: 'Đã giao hàng',   cls: 'rg-badge-confirmed' },
    da_huy:          { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
    da_tra_hang:     { label: 'Đã trả hàng',    cls: 'rg-badge-pending' },
};

let rgOtpFlowActive = false;
let rgVerifiedPhone = null;
let rgLastSearchState = {
    phone: '',
    bookings: [],
    orders: [],
};

function initReturnGuestPage() {
    const form=document.getElementById('rg-form');
    if(!form||form.dataset.rgRecovery==='true')return;
    form.dataset.rgRecovery='true';form.hidden=false;
    import('/pages/public/return-guest/guest-phone-lookup.mjs').then(phone=>{
        phone.mountGuestPhoneLookup(form, {loadMember:loadSupabaseGuestResults, renderMember:(bookings,orders,value)=>{
            rgVerifiedPhone=value;rgLastSearchState={phone:value,bookings,orders};renderResults(bookings,orders);
        },clearMember:()=>{rgVerifiedPhone=null;rgLastSearchState={phone:'',bookings:[],orders:[]};}});
    }).catch(()=>{const error=document.createElement('p');error.setAttribute('role','alert');error.textContent='Chưa tải được tra cứu. Vui lòng tải lại trang.';form.before(error);});
}

window.initReturnGuestPage = initReturnGuestPage;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReturnGuestPage);
} else {
    initReturnGuestPage();
}

async function isRegisteredMember(normPhone) {
    if (!normPhone) return false;
    try {
        const res = await fetch('/api/customer/auth/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: normPhone })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.exists) {
                // Thành viên chính thức: isMember = true hoặc isTemporary = false
                return Boolean(data.isMember || data.isTemporary === false);
            }
            if (data.success && !data.exists) {
                return false;
            }
        }
    } catch (err) {
        console.warn('[ReturnGuest] Backend lookup check failed, falling back:', err);
    }

    // Dự phòng khi offline / môi trường test local không qua backend
    try {
        const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
        const found = users.find(u => normalizePhone(u.phone) === normPhone && (!u.is_temporary || u.password));
        if (found) return true;

        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (currentUser && normalizePhone(currentUser.phone) === normPhone && !currentUser.is_temporary) {
            return true;
        }
    } catch (_) {}
    return false;
}

function resolveAppUrl(path) {
    return new URL(path, window.location.href).href;
}

function normalizePhone(p) {
    return String(p || '').replace(/\D/g, '').replace(/^84/, '0');
}

function validateLookupPhone(phone) {
    if (!phone) return 'Vui lòng nhập số điện thoại.';
    if (!/^0\d{9}$/.test(phone)) return 'Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số, bắt đầu bằng 0 (ví dụ: 0901234567).';
    return '';
}

async function loadSupabaseGuestResults(phone) {
    if (!phone) return { bookings: [], orders: [] };
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const session = await db?.auth?.getSession();
    const token = session?.data?.session?.access_token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/api/customer/auth/guest-records', {
        method: 'POST', headers, body: JSON.stringify({ phone: normalizePhone(phone) })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Vui lòng xác thực quyền tra cứu.');
    return {
        bookings: Array.isArray(data.bookings) ? data.bookings.map(mapSupabaseBookingRow) : [],
        orders: Array.isArray(data.orders) ? data.orders.map(mapSupabaseOrderRow) : []
    };
}

function mapSupabaseOrderRow(row) {
    const products = Array.isArray(row.sales_order_detail)
        ? row.sales_order_detail.map((detail) => ({
            id: detail.id || '',
            variant_id: detail.product_variant_id,
            name: detail.product_name_snapshot || 'Sản phẩm',
            sku: detail.sku_snapshot || '',
            image: '/assets/images/shop/products/placeholder.webp',
            quantity: detail.quantity,
            price: detail.unit_price,
            total: (Number(detail.quantity) || 1) * (Number(detail.unit_price) || 0) - (Number(detail.discount_amount) || 0),
        }))
        : [];

    const itemsSubtotal = products.reduce((acc, p) => acc + p.total, 0);
    const shippingFee = Number(row.shipping_fee_snapshot || 0);
    const grandTotal = itemsSubtotal + shippingFee;
    const payRow = (Array.isArray(row.payment) ? row.payment[0] : row.payment) || {};

    return {
        id: row.order_code || row.id,
        _supabaseId: row.id,
        userId: null,
        userPhone: row.receiver_phone_snapshot || '',
        status: mapOrderStatus(row.order_status),
        paymentStatus: String(payRow.payment_status || (row.order_status === 'da_xac_nhan' ? 'da_thanh_toan' : 'chua_thanh_toan')).toLowerCase(),
        paymentMethod: payRow.payment_method || 'cod',
        products,
        pricing: {
            subtotal: itemsSubtotal,
            shippingFee: shippingFee,
            discount: 0,
            total: grandTotal,
        },
        payment: {
            method: payRow.payment_method || 'cod',
            status: payRow.payment_status || (row.order_status === 'da_xac_nhan' ? 'da_thanh_toan' : 'pending')
        },
        delivery: {
            name: row.receiver_name_snapshot || '',
            phone: row.receiver_phone_snapshot || '',
            address: [row.street_address_snapshot, row.province_snapshot].filter(Boolean).join(', '),
        },
        note: row.note || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapSupabaseBookingRow(row) {
    const rawStatus = String(row.appointment_status || 'pending').toLowerCase();
    const normalizedBookingStatus = {
        'cho_xac_nhan': 'pending',
        'da_xac_nhan': 'confirmed',
        'da_check_in': 'confirmed',
        'dang_thuc_hien': 'in-progress',
        'da_hoan_tat': 'completed',
        'da_huy': 'cancelled',
        'vang_mat': 'cancelled'
    }[rawStatus] || rawStatus;

    const d = row.scheduled_start_at ? new Date(row.scheduled_start_at) : null;
    const primaryItem = (Array.isArray(row.appointment_item) ? row.appointment_item[0] : row.appointment_item) || {};

    return {
        id: row.appointment_code || row.id,
        _supabaseId: row.id,                  
        serviceName: primaryItem.name_snapshot || 'Dịch vụ PawPal',
        date: d ? d.toLocaleDateString('vi-VN') : '',
        time: d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
        timeStart: d ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
        scheduledEndAt: row.scheduled_end_at || null,
        serviceItems: (Array.isArray(row.appointment_item) ? row.appointment_item : row.appointment_item ? [row.appointment_item] : []).map(item => ({ name: item.name_snapshot, quantity: item.quantity })),
        status: normalizedBookingStatus,
        paymentStatus: 'pending',
        note: row.note || '',
        petName: row.pet_profile?.pet_name || 'Bé cưng',
        price: primaryItem.unit_price || 0,
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
    const s = String(status || '').toUpperCase();
    return {
        'PENDING':         'pending',
        'PENDING_PAYMENT': 'pending',
        'CONFIRMED':       'da_xac_nhan',
        'PREPARING':       'dang_dong_goi',
        'SHIPPING':        'dang_giao_hang',
        'DELIVERED':       'da_giao_hang',
        'COMPLETED':       'completed',
        'CANCELLED':       'da_huy',
        'RETURNED':        'da_tra_hang',
        'REFUNDED':        'da_tra_hang',
        'RETURN_PENDING':  'return_pending',
        'CHO_XAC_NHAN':    'cho_xac_nhan',
        'DA_XAC_NHAN':     'da_xac_nhan',
        'DANG_DONG_GOI':   'dang_dong_goi',
        'DANG_GIAO_HANG':  'dang_giao_hang',
        'DA_GIAO_HANG':    'da_giao_hang',
        'DA_HUY':          'da_huy',
        'DA_TRA_HANG':     'da_tra_hang',
        'HOAN_THANH':      'completed'
    }[s] || String(status || 'pending').toLowerCase();
}



function renderResults(bookings, orders) {
    const tabsEl = document.getElementById('rg-tabs');
    const chipsEl = document.getElementById('rg-status-chips');
    const listEl = document.getElementById('rg-list');
    const setupBtn = document.getElementById('rg-banner-setup-btn');
    if (setupBtn && rgVerifiedPhone) {
        setupBtn.href = `/login?phone=${encodeURIComponent(rgVerifiedPhone)}`;
    }

    let currentTab = 'all';
    let currentStatus = 'all';

    const statusOptions = {
        all: [
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ xác nhận', statuses: ['pending'] },
            { id: 'processing', label: 'Đang thực hiện / Giao hàng', statuses: ['confirmed', 'accepted', 'in-progress', 'preparing', 'shipping'] },
            { id: 'completed', label: 'Đã hoàn thành', statuses: ['completed', 'delivered'] },
            { id: 'cancelled', label: 'Đã hủy', statuses: ['cancelled', 'returned', 'return_pending'] },
        ],
        booking: [
            { id: 'all', label: 'Tất cả dịch vụ' },
            { id: 'pending', label: 'Chờ xác nhận', statuses: ['pending'] },
            { id: 'confirmed', label: 'Đã xác nhận', statuses: ['confirmed', 'accepted', 'upcoming'] },
            { id: 'in-progress', label: 'Đang thực hiện', statuses: ['in-progress'] },
            { id: 'completed', label: 'Hoàn thành', statuses: ['completed'] },
            { id: 'cancelled', label: 'Đã hủy', statuses: ['cancelled'] },
        ],
        order: [
            { id: 'all', label: 'Tất cả đơn hàng' },
            { id: 'pending', label: 'Chờ xác nhận', statuses: ['pending'] },
            { id: 'preparing', label: 'Chờ lấy hàng', statuses: ['preparing'] },
            { id: 'shipping', label: 'Đang giao', statuses: ['shipping'] },
            { id: 'delivered', label: 'Đã giao', statuses: ['delivered', 'completed'] },
            { id: 'cancelled', label: 'Đã hủy', statuses: ['cancelled'] },
            { id: 'returned', label: 'Đổi trả', statuses: ['returned', 'return_pending'] },
        ]
    };

    function applyFilter() {
        const items = listEl.querySelectorAll('.rg-item');
        let visibleCount = 0;
        const currentOpts = statusOptions[currentTab] || [];
        const activeOpt = currentOpts.find(o => o.id === currentStatus);
        const matchStatuses = activeOpt?.statuses || null;

        items.forEach(item => {
            const itemType = item.dataset.type;
            const itemStatus = item.dataset.status;

            const typeMatch = (currentTab === 'all' || itemType === currentTab);
            let statusMatch = true;
            if (currentStatus !== 'all' && matchStatuses) {
                statusMatch = matchStatuses.includes(itemStatus);
            }

            const visible = typeMatch && statusMatch;
            item.classList.toggle('d-none', !visible);
            if (visible) visibleCount++;
        });

        let emptyEl = document.getElementById('rg-filter-empty');
        if (visibleCount === 0) {
            if (!emptyEl) {
                emptyEl = document.createElement('div');
                emptyEl.id = 'rg-filter-empty';
                emptyEl.className = 'p-4 text-center text-muted';
                emptyEl.style.cssText = 'background:#F9FBFA; border-radius:9px; border:1px solid #ECF2EE; font-size:0.92rem; margin-top:12px;';
                emptyEl.textContent = 'Không tìm thấy mục nào phù hợp với bộ lọc đã chọn.';
                listEl.appendChild(emptyEl);
            }
            emptyEl.classList.remove('d-none');
        } else if (emptyEl) {
            emptyEl.classList.add('d-none');
        }
    }

    function renderStatusChips() {
        if (!chipsEl) return;
        const opts = statusOptions[currentTab] || [];
        chipsEl.innerHTML = opts.map(opt => `
            <button type="button" class="rg-chip ${opt.id === currentStatus ? 'active' : ''}" data-status="${opt.id}">
                ${opt.label}
            </button>
        `).join('');

        chipsEl.querySelectorAll('.rg-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                chipsEl.querySelectorAll('.rg-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatus = btn.dataset.status;
                applyFilter();
            });
        });
    }

    tabsEl.innerHTML = `
        <button class="rg-tab active" data-filter="all">Tất cả (${bookings.length + orders.length})</button>
        <button class="rg-tab" data-filter="booking">Dịch vụ (${bookings.length})</button>
        <button class="rg-tab" data-filter="order">Đơn hàng (${orders.length})</button>`;

    tabsEl.querySelectorAll('.rg-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabsEl.querySelectorAll('.rg-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.filter;
            currentStatus = 'all';
            renderStatusChips();
            applyFilter();
        });
    });

    renderStatusChips();

    listEl.innerHTML =
        bookings.map(b => buildBookingCard(b)).join('') +
        orders.map(o => buildOrderCard(o)).join('');

    applyFilter();
}

function badge(statusMap, status) {
    const raw = String(status || '').toLowerCase().trim();
    const normalized = statusMap === ORDER_STATUS ? normalizeOrderStatus(raw) : raw;
    const s = statusMap[raw] || statusMap[normalized] || { label: 'Chưa xác định', cls: 'rg-badge-pending' };
    return `<span class="rg-badge ${s.cls}">${s.label}</span>`;
}

function fmtDate(d) {
    if (!d) return '';
    const text=String(d).trim();
    const local=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(local){
        const [,day,month,year]=local, date=new Date(Number(year),Number(month)-1,Number(day));
        if(date.getFullYear()!==Number(year)||date.getMonth()!==Number(month)-1||date.getDate()!==Number(day))return 'Chưa có ngày';
        return `${day.padStart(2,'0')}/${month.padStart(2,'0')}/${year}`;
    }
    const date=new Date(d);
    return Number.isNaN(date.getTime()) ? 'Chưa có ngày' : date.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function guestVisibleBookingNote(value) {
    // Structured operational records are not customer-facing notes. Preserve surrounding prose.
    return String(value || '')
        .replace(/\[Pawpal\s+(intake|handover)(?:\s+v\d+)?\][\s\S]*?\[\/Pawpal\s+\1\]/gi,' ')
        .replace(/\[Pawpal\s+(?:intake|handover)(?:\s+v\d+)?\][\s\S]*$/gi,' ')
        .replace(/[ \t]{2,}/g,' ').replace(/\n[ \t]*\n+/g,'\n').trim();
}

function resolveBookingStatus(booking) {
    const rawStatus = (booking?.status || 'upcoming').toLowerCase();
    if(booking?._receiptOnly)return rawStatus;
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
    if(o._receiptOnly)return false;
    const status = normalizeOrderStatus(o.status);
    if (status !== 'pending') return false;
    if (o.paymentStatus === 'pending_refund' || o.paymentStatus === 'refunded') return false;
    
    return true;
}

function canReturnOrder(o) {
    if(o._receiptOnly)return false;
    const status = normalizeOrderStatus(o.status);
    if (status !== 'delivered' && status !== 'completed') return false;
    if (status === 'returned' || o.status === 'return_pending') return false;
    
    const updatedAt = o.updatedAt || o.createdAt;
    if (!updatedAt) return false;
    const daysDiff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
}
function canConfirmOrder(o) {
    if(o._receiptOnly)return false;
    if (o.status !== 'delivered') return false;
    return true;
}

function getBookingScheduledAt(booking) {
    if (!booking?.date) return null;
    const time = booking.time || booking.timeStart || '09:00';
    const scheduled = new Date(`${booking.date}T${time}:00`);
    return isNaN(scheduled.getTime()) ? null : scheduled;
}

function canModifyBooking(b) {
    if(b._receiptOnly)return false;
    const status = resolveBookingStatus(b);
    // 3.1.5: Chỉ kích hoạt đổi lịch khi ca hẹn ở trạng thái "Đã xác nhận" (confirmed)
    if (status !== 'confirmed') return false;
    if ((b.changeCount || 0) >= 2) return false;
    return true;
}

function canCancelBooking(b) {
    if(b._receiptOnly)return false;
    const status = resolveBookingStatus(b);
    // Hủy lịch: Chỉ cho phép khi pending hoặc confirmed. Khóa khi in-progress, accepted, completed, cancelled.
    if (!['pending', 'confirmed'].includes(status)) return false;
    if ((b.cancelCount || 0) >= 3) return false;
    return true;
}

function buildBookingCard(b) {
    const pet     = esc(b.petName || 'Bé cưng');
    const service = esc(b.serviceName || b.service || 'Dịch vụ');
    const date    = fmtDate(b.date || b.schedule?.date);
    const time    = b.timeStart || b.time || b.schedule?.slot || '';
    const staff   = esc(b.staff || 'Chưa phân công');
    const branch  = esc(b.branch || '');
    const endAt = b.scheduledEndAt ? new Date(b.scheduledEndAt) : null;
    const endTime = endAt && !Number.isNaN(endAt.getTime()) ? `${endAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${fmtDate(b.scheduledEndAt)}` : '';
    const serviceItems = (b.serviceItems || []).filter(item => item.name).map(item => `${esc(item.name)}${Number(item.quantity) > 1 ? ` × ${Number(item.quantity)}` : ''}`).join('<br>');
    const visibleNote = guestVisibleBookingNote(b.note);
    const resolvedStatus = resolveBookingStatus(b);
    const cancelClass = resolvedStatus === 'cancelled' ? ' rg-item-cancelled' : '';

    return `
    <div class="rg-item${cancelClass}" data-type="booking" data-status="${resolvedStatus}">
        <div class="rg-item-header">
            <div>
                <h4 class="rg-item-name">${service}</h4>
                <div class="rg-item-meta">
                    <span>Mã: ${esc(b.id)}</span>
                    ${branch ? `<span>${branch}</span>` : ''}
                </div>
            </div>
            <div class="text-end">
                <div class="rg-item-price">${b.price > 0 ? fmtPrice(b.price) : 'Giá theo thực tế'}</div>
                ${badge(BOOKING_STATUS, resolvedStatus)}
            </div>
        </div>
        <hr class="rg-divider">
        <div class="rg-summary rg-booking-summary">
            ${!b._receiptOnly || b.petName ? `<div>
                <div class="rg-summary-label">Bé cưng</div>
                <div class="rg-summary-value">${pet}</div>
            </div>` : ''}
            <div>
                <div class="rg-summary-label">Lịch hẹn</div>
                <div class="rg-summary-value">${esc(date || 'Chưa có ngày')}${time ? ' · ' + esc(time) : ''}</div>
            </div>
            ${endTime ? `<div>
                <div class="rg-summary-label">Kết thúc dự kiến</div>
                <div class="rg-summary-value">${esc(endTime)}</div>
            </div>` : ''}
            ${!b._receiptOnly || b.staff ? `<div>
                <div class="rg-summary-label">Nhân viên</div>
                <div class="rg-summary-value">${staff}</div>
            </div>` : ''}
            ${serviceItems ? `<div class="rg-booking-services">
                <div class="rg-summary-label">Dịch vụ đã đặt</div>
                <div class="rg-summary-value">${serviceItems}</div>
            </div>` : ''}
            ${visibleNote ? `<div class="rg-summary-note rg-booking-note">
                <div class="rg-summary-label">Ghi chú</div>
                <div class="rg-summary-value">${esc(visibleNote)}</div>
            </div>` : ''}
        </div>
        ${!b._receiptOnly && (canModifyBooking(b) || canCancelBooking(b) || ['in-progress', 'completed'].includes(resolvedStatus)) ? `
        <div class="rg-actions" class="rg-actions-flex">
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

    const isPaid = o.paymentStatus === 'paid' || o.payment?.status === 'paid';
    const isPendingRefund = o.paymentStatus === 'pending_refund';
    const isRefunded = o.paymentStatus === 'refunded';
    let paymentLabel, paymentColor;
    if (isRefunded) {
        paymentLabel = 'Đã hoàn tiền';
        paymentColor = 'rg-text-success';
    } else if (isPendingRefund) {
        paymentLabel = 'Đang xử lý hoàn tiền';
        paymentColor = 'rg-text-warning';
    } else if (isPaid) {
        paymentLabel = 'Đã thanh toán';
        paymentColor = 'rg-text-success';
    } else {
        paymentLabel = 'Chưa thanh toán';
        paymentColor = 'rg-text-inherit';
    }

    const productsHtml = (o.products || []).map(p => `
        <div class="rg-product-item-flex">
            <img src="${p.image}" class="rg-product-image" onerror="this.src='/assets/images/shop/products/placeholder.webp'">
            <div class="rg-product-details">
                <div class="rg-product-name">${esc(p.name)}</div>
                <div class="rg-product-price-qty">${fmtPrice(p.price)} <span class="mx-1">x</span> ${p.quantity}</div>
            </div>
            <div class="rg-product-total">${fmtPrice(p.price * p.quantity)}</div>
        </div>
    `).join('');

    const normalizedStatus = normalizeOrderStatus(o.status);
    const cancelClass = normalizedStatus === 'cancelled' ? ' rg-item-cancelled' : '';

    return `
    <div class="rg-item${cancelClass}" data-type="order" data-status="${normalizedStatus}">
        <div class="rg-item-header">
            <div>
                <h4 class="rg-item-name">Đơn hàng: ${esc(o.id)}</h4>
                <div class="rg-item-meta">
                    ${o.createdAt ? `<span>Ngày đặt: ${fmtDate(o.createdAt)}</span>` : ''}
                    ${o.delivery?.name ? `<span>Nhận: ${esc(o.delivery.name)}</span>` : ''}
                </div>
            </div>
            <div class="text-end">
                <div class="rg-item-price">${fmtPrice(o.pricing?.total)}</div>
                ${badge(ORDER_STATUS, o.status)}
            </div>
        </div>
        <hr class="rg-divider">
        <div class="rg-products p-md">
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
                <div class="rg-summary-value fw-medium ${paymentColor}">${paymentLabel}</div>
            </div>
        </div>
        ${!o._receiptOnly ? `<div class="rg-actions rg-actions-center">
            ${(o.status === 'return_pending') ? `
            <div class="flex-grow-1 text-start">
                <span class="rg-return-alert">
                    Đã yêu cầu đổi trả.
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
        </div>` : ''}
    </div>`;
}

window.handleGuestBookingAction = function(bookingId, action) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    const booking = (rgLastSearchState.bookings || []).find(b => String(b.id || b._supabaseId) === String(bookingId));
    if (!booking) {
        showToast('Không tìm thấy thông tin lịch hẹn.', 'error');
        return;
    }

    const scheduledAt = getBookingScheduledAt(booking);
    const now = new Date();
    const diffMinutes = scheduledAt ? (scheduledAt - now) / (1000 * 60) : 999;

    if (action === 'cancel') {
        if (diffMinutes < 120) {
            showToast('Chỉ được phép tự hủy lịch hẹn trước giờ bắt đầu tối thiểu 2 tiếng. Ca hẹn sắp diễn ra, vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'danger');
            return;
        }
        if ((booking.cancelCount || 0) >= 3) {
            showToast('Lịch hẹn này đã vượt quá ngưỡng hủy cho phép (> 3 lần). Vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'danger');
            return;
        }
        showActionConfirm(
            'Hủy lịch hẹn',
            `Bạn có chắc chắn muốn hủy lịch hẹn <strong>${esc(bookingId)}</strong>? Lịch hẹn sau khi hủy sẽ không thể khôi phục.`,
            () => {
                showOTPModal(phone, () => confirmCancelBooking(bookingId), 'xác thực hủy lịch hẹn');
            }
        );
    } else {
        if (diffMinutes < 120) {
            showToast('Đã quá thời gian tự thay đổi lịch hẹn (< 2 tiếng). Ca hẹn sắp diễn ra, vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'danger');
            return;
        }
        if ((booking.changeCount || 0) >= 2) {
            showToast('Bạn đã sử dụng hết 2 lần thay đổi lịch hẹn trực tuyến. Vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'warning');
            return;
        }
        showChangeScheduleModal(bookingId, phone);
    }
};

window.handleGuestCancelOrder = function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    const order = rgLastSearchState.orders.find(o => o.id === orderId);
    const isPaidOnline = order
        && (order.paymentStatus === 'paid' || order.payment?.status === 'paid')
        && order.paymentMethod !== 'cod'
        && order.paymentMethod;

    const total = order?.pricing?.total || 0;
    const refundNote = isPaidOnline
        ? `<br><span class="text-muted small">Số tiền <strong>${fmtPrice(total)}</strong> sẽ được hoàn lại theo chính sách của cửa hàng.</span>`
        : '';

    showActionConfirm(
        'Hủy đơn hàng',
        `Bạn có chắc chắn muốn hủy đơn hàng <strong>${esc(orderId)}</strong>? Đơn hàng sau khi hủy sẽ không thể khôi phục.${refundNote}`,
        () => confirmCancelOrder(orderId, isPaidOnline)
    );
};

window.handleGuestConfirmOrder = async function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    showActionConfirm(
        'Xác nhận đơn hàng',
        `Bạn xác nhận đã nhận hàng thành công cho đơn hàng <strong>${esc(orderId)}</strong>?`,
        async () => {
            const order = rgLastSearchState.orders.find(o => o.id === orderId);
            if (!order) {
                showToast('Không tìm thấy đơn hàng trong kết quả tra cứu.', 'error');
                return;
            }

            // Lưu CSDL trước, chỉ báo thành công khi cập nhật được (COMPLETED giống trang Đơn hàng của bé)
            const saved = await updateGuestOrderStatus(order, { order_status: 'COMPLETED', payment_status: 'PAID' });
            if (!saved) {
                showToast('Chưa xác nhận được đơn hàng. Vui lòng thử lại sau.', 'error');
                return;
            }

            order.status = 'completed';
            order.paymentStatus = 'paid';
            order.updatedAt = new Date().toISOString();
            renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
            showToast('Đã xác nhận nhận hàng!', 'success');

        }
    );
};

window.handleGuestReturnRequest = function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    const order = (rgLastSearchState.orders || []).find(o => o.id === orderId);
    if (!order) {
        showToast('Không tìm thấy đơn hàng.', 'error');
        return;
    }

    if (typeof openRMADrawer === 'function') {
        openRMADrawer(orderId);
    } else {
        window.location.href = `/pages/user/#orders`;
    }
};

function showActionConfirm(title, descHtml, onConfirm) {
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
                    <p class="mb-0">${descHtml}</p>
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
        if (typeof onConfirm === 'function') onConfirm();
    });
}

function showOTPModal(phone, onSuccess, purposeText = 'xác thực quyền truy cập tra cứu') {
    if (rgOtpFlowActive) return;
    rgOtpFlowActive = true;

    const existing = document.getElementById('rg-otp-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-otp-modal';
    el.className = 'modal fade rg-public-otp';
    el.tabIndex = -1;
    el.setAttribute('aria-labelledby', 'rg-otp-title');
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="rg-otp-title">Xác thực số điện thoại</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
                </div>
                <div class="modal-body text-center py-4">
                    <p class="rg-otp-description">Nhập mã gồm 6 chữ số để ${esc(purposeText)} cho số <strong>${esc(phone)}</strong>.</p>
                    <p class="rg-otp-hint">Chế độ dùng thử · Mã xác thực: 555666</p>
                    <div class="otp-inputs-wrapper mb-3">
                        ${Array.from({length:6}, (_,i) =>
                            `<input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric" aria-label="Chữ số ${i + 1}"${i>0?' disabled':''}>`
                        ).join('')}
                    </div>
                    <div class="text-danger small d-none" id="rg-otp-error">Mã OTP không đúng, vui lòng thử lại.</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Hủy</button>
                    <button type="button" class="btn-cta" id="rg-otp-confirm" disabled>Xác nhận</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    el.addEventListener('shown.bs.modal', () => el.querySelector('.otp-input')?.focus(), { once: true });
    el.addEventListener('hidden.bs.modal', () => {
        rgOtpFlowActive = false;
        el.remove();
    });

    const inputs = el.querySelectorAll('.otp-input');
    const confirmBtn = document.getElementById('rg-otp-confirm');
    const errorEl = document.getElementById('rg-otp-error');

    inputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '').slice(0, 1);
            errorEl.classList.add('d-none');
            inputs.forEach(i => i.classList.remove('otp-error'));

            if (input.value && idx < 5) {
                inputs[idx + 1].disabled = false;
                inputs[idx + 1].focus();
            }

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

let guestCareLogRequestId = 0;

window.handleGuestViewCareLog = async function(bookingId) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) {
        showToast('Chức năng đang bảo trì, không thể xem nhật ký chăm sóc lúc này.', 'info');
        return;
    }

    const modal = getOrCreateGuestCareLogModal();
    const timelineWrapper = document.getElementById('guestCareLogTimeline');
    const requestId = String(++guestCareLogRequestId);
    timelineWrapper.dataset.requestId = requestId;
    timelineWrapper.setAttribute('aria-busy', 'true');
    timelineWrapper.innerHTML = `<div class="rg-carelog-skeleton" role="status" aria-label="Đang tải nhật ký chăm sóc">${Array.from({ length: 3 }, () => `
        <div class="rg-carelog-skeleton-entry" aria-hidden="true">
            <div class="pawpal-skeleton" style="width:38%;height:14px"></div>
            <div class="pawpal-skeleton" style="width:65%;height:20px"></div>
            <div class="pawpal-skeleton" style="width:95%;height:16px"></div>
            <div class="pawpal-skeleton" style="width:48%;height:12px"></div>
        </div>`).join('')}</div>`;
    const renderTimeline = html => {
        if (timelineWrapper.dataset.requestId !== requestId) return;
        timelineWrapper.innerHTML = `<div class="rg-carelog-loaded">${html}</div>`;
    };
    
    const booking = (rgLastSearchState.bookings || []).find(b => b.id === bookingId) || (rgLastSearchState.bookings || []).find(b => b._supabaseId === bookingId);
    if (booking) {
        document.getElementById('guestCareLogTitle').innerHTML = `Nhật ký chăm sóc: <strong>${esc(booking.petName)}</strong> - <strong>${esc(booking.serviceName || booking.service)}</strong>`;
    }

    modal.show();

    try {
        const { data: authData, error: authError } = await db.auth.getUser();
        if (authError || !authData?.user) {
            renderTimeline(`<div class="text-center p-4">Vui lòng đăng nhập tài khoản của chủ nuôi để xem nhật ký chăm sóc.<div class="mt-3"><a class="btn-green-outline" href="/login">Đăng nhập</a></div></div>`);
            return;
        }
        const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(bookingId);
        if (!isUUID) {
            renderTimeline(`
                <div class="text-center p-4 text-muted">
                    Chưa có nhật ký chăm sóc nào được ghi nhận cho dịch vụ này.
                </div>`);
            return;
        }

        const { data, error } = await db.from('care_log')
            .select(`
                id,
                description,
                observed_condition,
                action_name_snapshot,
                recorded_at,
                care_log_media ( media_url )
            `)
            .eq('appointment_id', bookingId)
            .order('recorded_at', { ascending: false });

        if (error) {
            console.error('[ReturnGuest] care_log query error:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            renderTimeline(`
                <div class="text-center p-4 text-muted">
                    Chưa có nhật ký chăm sóc nào được ghi nhận cho dịch vụ này.
                </div>`);
            return;
        }

        renderTimeline(data.map(log => {
            const recordedAt = new Date(log.recorded_at);
            const time = Number.isNaN(recordedAt.getTime()) ? '' : recordedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const date = fmtDate(log.recorded_at);
            const mediaUrl = log.care_log_media?.[0]?.media_url;
            const staffName = 'Nhân viên PawPal';
            const isUrgent = false;

            return `
                <div class="rg-timeline-item-flex timeline-item ${isUrgent ? 'timeline-item-urgent' : ''}">
                    <div class="rg-timeline-dot ${isUrgent ? 'rg-timeline-dot-urgent' : ''}"></div>
                    <div class="rg-timeline-content">
                        <div class="rg-timeline-time">${time} - ${date}</div>
                        <h5 class="rg-timeline-title ${isUrgent ? 'rg-timeline-title-urgent' : ''}">
                            ${esc(log.action_name_snapshot || 'Cập nhật')}
                        </h5>
                        <p class="mb-2">${esc(log.description)}</p>
                        ${log.observed_condition ? `<p class="mb-2">${esc(log.observed_condition)}</p>` : ''}
                        <div class="rg-timeline-meta">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                            ${esc(staffName)}
                        </div>
                        ${mediaUrl && /^https?:\/\//i.test(normalizeImageUrl(mediaUrl)) ? `<img src="${esc(normalizeImageUrl(mediaUrl))}" alt="Ảnh chăm sóc" class="rg-timeline-img">` : ''}
                    </div>
                </div>
            `;
        }).join(''));
    } catch (err) {
        renderTimeline(`
            <div class="text-center p-4 text-danger">
                Lỗi khi tải nhật ký chăm sóc. Vui lòng thử lại sau.
            </div>`);
    } finally {
        if (timelineWrapper.dataset.requestId === requestId) timelineWrapper.setAttribute('aria-busy', 'false');
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
                    <div class="modal-body ps-4">
                        <div id="guestCareLogTimeline" class="rg-timeline-wrapper"></div>
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
    const booking = rgLastSearchState.bookings.find(b => String(b.id || b._supabaseId) === String(bookingId));
    if (!booking) {
        showToast('Không tìm thấy lịch hẹn.', 'error');
        return;
    }

    booking.status = 'cancelled';
    booking.cancelCount = (booking.cancelCount || 0) + 1;

    // Gửi thông báo đến Admin
    try {
        const adminNotifs = JSON.parse(localStorage.getItem('pawpal_admin_notifications') || '[]');
        adminNotifs.unshift({
            id: `admin-notif-${Date.now()}`,
            type: 'booking_cancelled',
            title: 'Khách vãng lai hủy lịch hẹn',
            content: `Khách hàng vãng lai (${rgLastSearchState.phone}) vừa hủy ca hẹn #${booking.id || bookingId}.`,
            createdAt: new Date().toISOString(),
            read: false
        });
        localStorage.setItem('pawpal_admin_notifications', JSON.stringify(adminNotifs));
    } catch (_) {}

    // Cập nhật pawpal_bookings nếu có
    try {
        const localBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = localBookings.findIndex(b => String(b.id || b._id) === String(bookingId));
        if (idx !== -1) {
            localBookings[idx].status = 'cancelled';
            localBookings[idx].cancelCount = (localBookings[idx].cancelCount || 0) + 1;
            localStorage.setItem('pawpal_bookings', JSON.stringify(localBookings));
        }
    } catch (_) {}

    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (db) {
        const isUUID = typeof bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
        let query = db.from('appointment').update({ appointment_status: 'da_huy', updated_at: new Date().toISOString() });
        query = isUUID ? query.eq('id', bookingId) : query.eq('appointment_code', bookingId);
        query.then(({error}) => { if (error) console.warn('[ReturnGuest] Cancel booking sync error:', error); });
    }

    showToast('Đã hủy lịch hẹn thành công!', 'success');
    renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
    
    const phone = document.getElementById('rg-phone')?.value?.trim() || '';
    if (phone) setTimeout(() => showUpsellModal(phone), 250);
}

// Cập nhật trạng thái đơn trên Supabase; trả về true khi thực sự có dòng được cập nhật
async function updateGuestOrderStatus(order, fields) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !order) return false;
    try {
        let query = db.from('sales_order').update({ ...fields, updated_at: new Date().toISOString() });
        query = order._supabaseId ? query.eq('id', order._supabaseId) : query.eq('order_code', order.id);
        const { data, error } = await query.select('id');
        if (error || !Array.isArray(data) || data.length === 0) {
            console.warn('[ReturnGuest] Order status sync failed:', error || 'no row updated');
            return false;
        }
        return true;
    } catch (err) {
        console.warn('[ReturnGuest] Order status sync exception:', err);
        return false;
    }
}

async function confirmCancelOrder(orderId, isPaidOnline = false) {
    const order = rgLastSearchState.orders.find(o => o.id === orderId);
    if (!order) {
        showToast('Không tìm thấy đơn hàng trong kết quả tra cứu.', 'error');
        return;
    }

    const saved = await updateGuestOrderStatus(order, { order_status: 'CANCELLED' });
    if (!saved) {
        showToast('Chưa hủy được đơn hàng. Vui lòng thử lại sau.', 'error');
        return;
    }

    order.status = 'cancelled';
    order.orderStatus = 'CANCELLED';
    order.updatedAt = new Date().toISOString();


    const toastMsg = isPaidOnline
        ? 'Đã hủy đơn hàng. Yêu cầu hoàn tiền đã được ghi nhận!'
        : 'Đã hủy đơn hàng thành công!';
    showToast(toastMsg, 'success');
    renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
}

function normalizeOrderStatus(status) {
    const s = String(status || '').toLowerCase().trim();
    if (s === 'cho_xac_nhan' || s === 'placed' || s === 'pending' || s === 'pending_payment' || s === 'cho_thanh_toan') return 'pending';
    if (s === 'cho_lay_hang' || s === 'preparing' || s === 'confirmed' || s === 'da_xac_nhan' || s === 'dang_chuan_bi') return 'preparing';
    if (s === 'dang_giao' || s === 'shipping') return 'shipping';
    if (s === 'da_giao' || s === 'delivered') return 'delivered';
    if (s === 'da_hoan_tat' || s === 'completed') return 'completed';
    if (s === 'da_huy' || s === 'cancelled' || s === 'thanh_toan_that_bai') return 'cancelled';
    if (s === 'tra_hang' || s === 'returned' || s === 'return_pending' || s === 'return_approved' || s === 'refunded') return 'returned';
    return s || 'pending';
}

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

    const slotsHtml = slots.map(s =>
        `<button class="rg-slot-time" data-time="${s}" disabled class="rg-slot-disabled">${s}</button>`
    ).join('');

    const staffHtml = staffs.map(s => {
        const initials = s.name === 'Phân bổ ngẫu nhiên' ? '🎲' : s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
            <div class="rg-staff-card" data-name="${s.name}" tabindex="-1" role="button"
                class="rg-staff-slot-disabled">
                <div class="rg-staff-avatar">${initials}</div>
                <div>
                    <div class="rg-staff-name">${s.name}</div>
                    <div class="rg-staff-desc">${s.desc}</div>
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

                    <div class="mb-1 fw-semibold" class="rg-label-sm">Chọn ngày</div>
                    <input type="date" id="rg-date-picker" class="form-control mb-4" min="${minDate}" class="rg-date-input">

                    <div class="mb-1 fw-semibold" class="rg-label-sm">Chọn giờ</div>
                    <div class="rg-time-grid mb-3" id="rg-slot-grid">${slotsHtml}</div>
                    <div id="rg-hold-banner" class="d-none mb-3" class="rg-hold-banner">
                        ⏳ <strong>Giữ chỗ tạm thời:</strong> Giờ <strong id="rg-hold-label"></strong> được giữ riêng cho bạn trong <strong id="rg-hold-countdown"></strong>
                    </div>

                    <div class="mb-1 fw-semibold" class="rg-label-sm">Chọn nhân viên</div>
                    <div id="rg-staff-list" class="rg-staff-grid">${staffHtml}</div>

                    <div class="rg-slot-selected mt-2 d-none" id="rg-slot-info" class="rg-slot-info-box">
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
        banner.classList.add('rg-banner-hold');
        banner.classList.remove('rg-banner-expired', 'd-none');

        function tick() {
            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = (remaining % 60).toString().padStart(2, '0');
            countdown.textContent = `${m}:${s}`;
            if (remaining <= 0) {
                clearHoldTimer();
                selTime = null;
                el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
                banner.innerHTML = `⚠️ <strong>Hết thời gian giữ chỗ!</strong> Vui lòng chọn lại giờ.`;
                banner.classList.remove('rg-banner-hold');
                banner.classList.add('rg-banner-expired');
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
        });
        el.querySelectorAll('.rg-staff-card').forEach(c => {
            c.classList.remove('rg-staff-slot-disabled');
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
                c.classList.remove('active');
            });
            card.classList.add('active');
            selStaff = card.dataset.name;
            refresh();
        });
    });

    document.getElementById('rg-change-confirm').addEventListener('click', () => {
        if (!selDate || !selTime || !selStaff) return;
        clearHoldTimer();
        modal.hide();

        // Kích hoạt bước bảo mật OTP xác thực thay đổi lịch hẹn theo quy trình 3.1.5
        showOTPModal(phone, () => {
            const booking = rgLastSearchState.bookings.find(b => String(b.id || b._supabaseId) === String(bookingId));
            if (booking) {
                booking.changeCount = (booking.changeCount || 0) + 1;
                booking.date = selDate;
                booking.time = selTime;
                booking.staff = selStaff;
            }

            // Cập nhật pawpal_bookings
            try {
                const localBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
                const idx = localBookings.findIndex(b => String(b.id || b._id) === String(bookingId));
                if (idx !== -1) {
                    localBookings[idx].date = selDate;
                    localBookings[idx].time = selTime;
                    localBookings[idx].staff = selStaff;
                    localBookings[idx].changeCount = (localBookings[idx].changeCount || 0) + 1;
                    localStorage.setItem('pawpal_bookings', JSON.stringify(localBookings));
                }
            } catch (_) {}

            // Gửi thông báo đến Admin
            try {
                const adminNotifs = JSON.parse(localStorage.getItem('pawpal_admin_notifications') || '[]');
                adminNotifs.unshift({
                    id: `admin-notif-${Date.now()}`,
                    type: 'booking_rescheduled',
                    title: 'Khách vãng lai đổi lịch hẹn',
                    content: `Khách hàng vãng lai (${rgLastSearchState.phone}) vừa đổi ca hẹn #${bookingId} sang ngày ${selDate} lúc ${selTime}.`,
                    createdAt: new Date().toISOString(),
                    read: false
                });
                localStorage.setItem('pawpal_admin_notifications', JSON.stringify(adminNotifs));
            } catch (_) {}

            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (db) {
                const isUUID = typeof bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
                const cleanTime = selTime.length === 5 ? selTime : selTime.slice(0, 5);
                const startIso = new Date(`${selDate}T${cleanTime}:00+07:00`).toISOString();
                const endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
                let query = db.from('appointment').update({ 
                    scheduled_start_at: startIso,
                    scheduled_end_at: endIso,
                    appointment_status: 'cho_xac_nhan', 
                    updated_at: new Date().toISOString() 
                });
                query = isUUID ? query.eq('id', bookingId) : query.eq('appointment_code', bookingId);
                query.then(({error}) => { if (error) console.warn('[ReturnGuest] Change booking sync error:', error); });
            }

            showToast('Đã đổi lịch hẹn thành công!', 'success');
            showUpsellModal(phone);
            setTimeout(() => document.getElementById('rg-form').dispatchEvent(new Event('submit')), 1200);
        }, 'xác thực thay đổi lịch hẹn');
    });
}

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
                        <div class="rg-success-icon">🐾</div>
                        <h5 class="fw-bold mb-2" class="rg-success-title">Thao tác thành công!</h5>
                        <p class="text-muted mb-4">Thiết lập mật khẩu để liên kết toàn bộ lịch sử đơn hàng, lịch hẹn, tích điểm Paw Points và nhận nhiều ưu đãi độc quyền dành cho thành viên.</p>
                        <div class="d-flex flex-column gap-2">
                            <button class="btn-cta w-100" id="rg-upsell-setup">Thiết lập mật khẩu ngay</button>
                            <button class="btn-green-outline w-100" id="rg-upsell-skip">Bỏ qua, quay lại tra cứu</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);

        const modal = new bootstrap.Modal(el);
        modal.show();

        document.getElementById('rg-upsell-setup').addEventListener('click', () => {
            modal.hide();
            window.location.href = `/login?phone=${encodeURIComponent(normalizePhone(phone))}`;
        });
        document.getElementById('rg-upsell-skip').addEventListener('click', () => {
            modal.hide();
            restoreLastSearchResults();
        });
    }, 800);
}

function showQuickSetupPasswordModal(phone) {
    const existing = document.getElementById('rg-setup-pwd-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-setup-pwd-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Nâng cấp tài khoản thành viên</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body py-3 px-4">
                    <p class="text-muted small mb-3">Số điện thoại <strong>${esc(phone)}</strong> sẽ được nâng cấp lên tài khoản Thành viên chính thức.</p>
                    <div class="mb-3">
                        <label class="form-label fw-semibold small">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                        <input type="password" id="rgNewPassword" class="form-control" placeholder="Nhập mật khẩu..." minlength="6">
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-semibold small">Xác nhận mật khẩu</label>
                        <input type="password" id="rgConfirmPassword" class="form-control" placeholder="Nhập lại mật khẩu...">
                    </div>
                    <div class="text-danger small d-none mb-2" id="rgPwdError"></div>
                    <div class="p-2 mb-2" style="background:#f4f9f6;border-radius:9px;border:1px solid #c3dec7;font-size:0.83rem;color:#236b48;">
                        🎁 <strong>Đặc quyền thành viên:</strong> Tặng ngay <strong>50 PawPoint</strong> chào mừng và tự động liên kết toàn bộ đơn hàng, lịch hẹn!
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Hủy</button>
                    <button type="button" class="btn-cta" id="rgConfirmSetupPwdBtn">Tạo tài khoản ngay</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('rgConfirmSetupPwdBtn').addEventListener('click', async () => {
        const pwd = document.getElementById('rgNewPassword').value.trim();
        const confirmPwd = document.getElementById('rgConfirmPassword').value.trim();
        const errEl = document.getElementById('rgPwdError');

        if (!pwd || pwd.length < 6) {
            errEl.textContent = 'Mật khẩu phải có tối thiểu 6 ký tự.';
            errEl.classList.remove('d-none');
            return;
        }
        if (pwd !== confirmPwd) {
            errEl.textContent = 'Mật khẩu xác nhận không trùng khớp.';
            errEl.classList.remove('d-none');
            return;
        }
        errEl.classList.add('d-none');

        // Nâng cấp user và đồng bộ dữ liệu vãng lai
        let newMember = null;
        try {
            const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
            const normPhone = normalizePhone(phone);
            let uIdx = users.findIndex(u => normalizePhone(u.phone) === normPhone);
            newMember = {
                id: uIdx !== -1 ? users[uIdx].id : `USER-${Date.now()}`,
                phone: phone,
                password: pwd,
                name: (uIdx !== -1 && users[uIdx].name) ? users[uIdx].name : 'Khách hàng',
                role: 'customer',
                is_temporary: false,
                points: ((uIdx !== -1 && users[uIdx].points) ? users[uIdx].points : 0) + 50,
                tier: 'Standard',
                createdAt: new Date().toISOString()
            };
            if (uIdx !== -1) {
                users[uIdx] = { ...users[uIdx], ...newMember };
            } else {
                users.push(newMember);
            }
            localStorage.setItem('pawpal_users', JSON.stringify(users));
            localStorage.setItem('pawpal_current_user', JSON.stringify(newMember));

            // 1. Đồng bộ Thú cưng vãng lai
            const allPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
            let petChanged = false;
            allPets.forEach(p => {
                const pPhone = normalizePhone(p.ownerPhone || p.phone || '');
                if (pPhone === normPhone) {
                    p.userId = newMember.id;
                    p.ownerPhone = phone;
                    petChanged = true;
                }
            });
            if (petChanged) {
                localStorage.setItem('pawpal_pets', JSON.stringify(allPets));
            }

            // 2. Đồng bộ Lịch hẹn
            const allBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
            let bookingChanged = false;
            allBookings.forEach(b => {
                const bPhone = normalizePhone(b.ownerPhone || b.phone || '');
                if (bPhone === normPhone) {
                    b.userId = newMember.id;
                    b.ownerPhone = phone;
                    bookingChanged = true;
                }
            });
            if (bookingChanged) {
                localStorage.setItem('pawpal_bookings', JSON.stringify(allBookings));
            }

            // 3. Đồng bộ Đơn hàng
            const allOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
            let orderChanged = false;
            allOrders.forEach(o => {
                const oPhone = normalizePhone(o.shipping?.phone || o.userPhone || o.guestPhone || o.phone || '');
                if (oPhone === normPhone) {
                    o.userId = newMember.id;
                    o.userPhone = phone;
                    orderChanged = true;
                }
            });
            if (orderChanged) {
                localStorage.setItem('pawpal_orders', JSON.stringify(allOrders));
            }

            // 4. Xóa token tạm
            const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
            localStorage.setItem('pawpal_temp_tokens', JSON.stringify(tokens.filter(t => normalizePhone(t.phone) !== normPhone)));

            // 5. Đồng bộ Supabase nếu có
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (db) {
                try {
                    const { data: cPhone } = await db.from('customer_phone').select('customer_id').eq('phone_number', phone).maybeSingle();
                    if (cPhone?.customer_id) {
                        await db.from('customer').update({
                            customer_status: 'active'
                        }).eq('id', cPhone.customer_id);
                    }
                } catch (e) {
                    console.warn('[ReturnGuest] Supabase sync error:', e);
                }
            }
        } catch (_) {}

        modal.hide();
        showToast('Nâng cấp tài khoản thành công! Tặng bạn 50 PawPoint chào mừng.', 'success');
        setTimeout(() => {
            window.location.href = '/pages/user/#bookings';
        }, 1200);
    });
}

function restoreLastSearchResults() {
    const resultsEl = document.getElementById('rg-results');
    const errorBox  = document.getElementById('rg-error');
    if (!resultsEl || !errorBox) return;

    if (rgLastSearchState.bookings.length || rgLastSearchState.orders.length) {
        errorBox.classList.add('d-none');
        resultsEl.classList.remove('d-none');
        renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
        const phoneInput = document.getElementById('rg-phone');
        if (phoneInput && rgLastSearchState.phone) {
            phoneInput.value = rgLastSearchState.phone;
        }
    }
}

function showToast(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast-custom toast-${type}`;
    const bg = type === 'danger' || type === 'error' ? '#ef4444' : (type === 'success' ? '#236B48' : (type === 'warning' ? '#d97706' : '#3b82f6'));
    t.style.cssText = `background:${bg};color:#fff;padding:12px 18px;border-radius:9px;font-size:0.9rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
    t.innerHTML = `<div class="toast-content"><span class="toast-message">${msg}</span></div>`;
    container.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transition = 'opacity 0.3s ease';
        setTimeout(() => t.remove(), 300);
    }, 4000);
}
