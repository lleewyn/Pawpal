
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

document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('rg-form');
    const errorBox  = document.getElementById('rg-error');
    const resultsEl = document.getElementById('rg-results');

    errorBox.classList.add('d-none');
    resultsEl.classList.add('d-none');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const phone = document.getElementById('rg-phone').value.trim();
            if (!phone) return;

            const btn = form.querySelector('button[type=submit]');
            btn.disabled    = true;
            btn.textContent = 'Đang tìm...';

            const supabaseResults = await loadSupabaseGuestResults(phone);
            let bookings = supabaseResults.bookings || [];
            let orders = supabaseResults.orders || [];

            if (bookings.length > 0 || orders.length > 0) {
                showToast('Đã tìm thấy kết quả tra cứu.', 'success');
            } else {
                resultsEl.classList.add('d-none');
                errorBox.classList.remove('d-none');
                errorBox.innerHTML = 'Không tìm thấy thông tin đơn hàng/lịch hẹn cho số điện thoại này.';
                btn.disabled    = false;
                btn.textContent = 'Tìm kiếm';
                return;
            }

            btn.disabled    = false;
            btn.textContent = 'Tìm kiếm';

            errorBox.classList.add('d-none');
            resultsEl.classList.remove('d-none');
            
            rgLastSearchState = {
                phone,
                bookings,
                orders,
            };
            renderResults(bookings, orders);
        } catch (fatalErr) {
            console.error(fatalErr);
            alert("Error in submit handler: " + fatalErr.message + "\n" + fatalErr.stack);
            const btn = form.querySelector('button[type=submit]');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Tìm kiếm';
            }
        }
    });
});

function resolveAppUrl(path) {
    return new URL(path, window.location.href).href;
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
                total_amount,
                created_at,
                updated_at,
                note,
                customer_address!inner ( receiver_name, receiver_phone, street_address, province ),
                sales_order_detail ( id, quantity, unit_price, discount_amount, subtotal, product ( id, product_name, sku, image_urls ) )
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
    const normalizeImageUrl = (url) => {
        if (!url) return '/assets/images/shop/products/placeholder.webp';
        if (url.startsWith('http') || url.startsWith('/')) return url;
        if (url.startsWith('assets/')) return '/' + url;
        return `/assets/images/shop/products/${url}`;
    };
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
        _supabaseId: row.id,                  
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
                item.classList.toggle('d-none', !(f === 'all' || item.dataset.type === f));
            });
        });
    });

    listEl.innerHTML =
        bookings.map(b => buildBookingCard(b)).join('') +
        orders.map(o => buildOrderCard(o)).join('');
}

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
    if (!['pending', 'pending_payment', 'preparing'].includes(status)) return false;
    if (o.paymentStatus === 'pending_refund' || o.paymentStatus === 'refunded') return false;
    
    return true;
}

function canReturnOrder(o) {
    if (o.status !== 'completed') return false;
    if (o.status === 'return_pending') return false;
    
    const updatedAt = o.updatedAt || o.createdAt;
    if (!updatedAt) return false;
    const daysDiff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
}
function canConfirmOrder(o) {
    if (o.status !== 'delivered') return false;
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
            <div class="text-end">
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
    <div class="rg-item${cancelClass}" data-type="order">
        <div class="rg-item-header">
            <div>
                <h4 class="rg-item-name">Đơn hàng: ${esc(o.id)}</h4>
                <div class="rg-item-meta">
                    <span>Ngày đặt: ${fmtDate(o.createdAt)}</span>
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
        <div class="rg-actions rg-actions-center">
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
        </div>
    </div>`;
}

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

    const order = rgLastSearchState.orders.find(o => o.id === orderId);
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
            const order = rgLastSearchState.orders.find(o => o.id === orderId);
            if (order) {
                order.status = 'completed';
                order.updatedAt = new Date().toISOString();
            }
            
            renderResults(rgLastSearchState.bookings, rgLastSearchState.orders);
            showToast('Đã xác nhận nhận hàng!', 'success');

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
            const order = (rgLastSearchState.orders || []).find(o => o.id === orderId);

            if (!order) {
                showToast('Không tìm thấy đơn hàng.', 'error');
                return;
            }

            if (typeof openRMADrawer === 'function') {
                openRMADrawer(orderId);
            } else {
                window.location.href = `/pages/user/return-detail/return-detail.html?orderId=${orderId}`;
            }
        }
    );
};

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
        showOTPModal(phone, onConfirm);
    });
}


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
                    <p class="text-muted small mb-4">Mã OTP 6 số đã được gửi đến <strong>${esc(phone)}</strong>.<br><span class="text-muted" class="rg-otp-hint">(Mã test: 555666)</span></p>
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

window.handleGuestViewCareLog = async function(bookingId) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) {
        showToast('Chức năng đang bảo trì, không thể xem nhật ký chăm sóc lúc này.', 'info');
        return;
    }

    const modal = getOrCreateGuestCareLogModal();
    const timelineWrapper = document.getElementById('guestCareLogTimeline');
    timelineWrapper.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div></div>';
    
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
                <div class="rg-timeline-item-flex timeline-item ${isUrgent ? 'timeline-item-urgent' : ''}">
                    <div class="rg-timeline-dot ${isUrgent ? 'rg-timeline-dot-urgent' : ''}"></div>
                    <div class="rg-timeline-content">
                        <div class="rg-timeline-time">${time} - ${date}</div>
                        <h5 class="rg-timeline-title ${isUrgent ? 'rg-timeline-title-urgent' : ''}">
                            ${esc(log.care_action?.action_name || 'Cập nhật')}
                        </h5>
                        <p class="mb-2">${esc(log.description)}</p>
                        <div class="rg-timeline-meta">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                            ${esc(staffName)}
                        </div>
                        ${mediaUrl ? `<img src="${normalizeImageUrl(mediaUrl)}" alt="Photo" class="rg-timeline-img">` : ''}
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
    const booking = rgLastSearchState.bookings.find(b => b.id === bookingId);
    if (!booking) {
        showToast('Không tìm thấy lịch hẹn.', 'error');
        return;
    }

    booking.status = 'cancelled';
    booking.cancelCount = (booking.cancelCount || 0) + 1;

    if (window.API && typeof window.API.updateBookingStatus === 'function') {
        window.API.updateBookingStatus(bookingId, 'CANCELLED').catch(e => console.warn(e));
    } else {
        const db = window.SupabaseClient;
        if (db) {
            const isUUID = typeof bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
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

function confirmCancelOrder(orderId) {
    const order = rgLastSearchState.orders.find(o => o.id === orderId);
    if (!order) {
        showToast('Không tìm thấy đơn hàng trong kết quả tra cứu.', 'error');
        return;
    }

    order.status = 'cancelled';
    order.orderStatus = 'CANCELLED';
    order.updatedAt = new Date().toISOString();

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
    return status || 'pending';
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
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast-custom toast-${type}`;
    t.innerHTML = `<div class="toast-content"><span class="toast-message">${msg}</span></div>`;
    container.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
}

