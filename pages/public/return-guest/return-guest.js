
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
    preparing:       { label: 'Chờ lấy hàng',   cls: 'rg-badge-inprogress' },
    shipping:        { label: 'Đang giao',      cls: 'rg-badge-shipping' },
    delivered:       { label: 'Đã giao',        cls: 'rg-badge-confirmed' },
    completed:       { label: 'Hoàn thành',     cls: 'rg-badge-completed' },
    cancelled:       { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
    returned:        { label: 'Trả hàng',       cls: 'rg-badge-pending' },
    return_pending:  { label: 'Chờ đổi trả',    cls: 'rg-badge-pending' },
};

let rgOtpFlowActive = false;
let rgVerifiedPhone = null;
let rgLastSearchState = {
    phone: '',
    bookings: [],
    orders: [],
};

document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('rg-form');
    const errorBox  = document.getElementById('rg-error');
    const resultsEl = document.getElementById('rg-results');
    const phoneInput = document.getElementById('rg-phone');

    errorBox.classList.add('d-none');
    resultsEl.classList.add('d-none');

    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            const currentNorm = normalizePhone(e.target.value);
            if (rgVerifiedPhone && currentNorm !== rgVerifiedPhone) {
                rgVerifiedPhone = null;
                resultsEl.classList.add('d-none');
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const phone = phoneInput ? phoneInput.value.trim() : '';
            if (!phone) return;

            const normPhone = normalizePhone(phone);

            // Kiểm tra xem số điện thoại có thuộc về tài khoản Thành viên chính thức không
            const member = isRegisteredMember(normPhone);
            if (member) {
                resultsEl.classList.add('d-none');
                errorBox.classList.remove('d-none');
                errorBox.innerHTML = `
                    <div class="alert-member-prompt" style="padding:16px 20px; background:#f4f9f6; border-radius:9px; border:1px solid #c3dec7; color:#203a2c; text-align:left;">
                        <div style="font-weight:700; color:#236b48; font-size:1.05rem; margin-bottom:6px;">Số điện thoại đã được đăng ký thành viên</div>
                        <div style="font-size:0.92rem; margin-bottom:14px; color:#4f7a65;">Số điện thoại <strong>${esc(phone)}</strong> thuộc tài khoản thành viên Pawpal. Vui lòng đăng nhập để xem đầy đủ hồ sơ, lịch hẹn và quản lý đơn hàng của bạn.</div>
                        <a href="/pages/public/login/login.html?phone=${encodeURIComponent(normPhone)}" class="btn-cta" style="display:inline-block; padding:8px 20px; text-decoration:none; border-radius:9px;">Đăng nhập ngay</a>
                    </div>
                `;
                return;
            }

            const btn = form.querySelector('button[type=submit]');
            btn.disabled    = true;
            btn.textContent = 'Đang tìm...';

            const supabaseResults = await loadSupabaseGuestResults(phone);
            let bookings = supabaseResults.bookings || [];
            let orders = supabaseResults.orders || [];

            btn.disabled    = false;
            btn.textContent = 'Tìm kiếm';

            if (bookings.length === 0 && orders.length === 0) {
                resultsEl.classList.add('d-none');
                errorBox.classList.remove('d-none');
                errorBox.innerHTML = 'Không tìm thấy thông tin đơn hàng/lịch hẹn cho số điện thoại này.';
                return;
            }

            // Check if this phone number was already OTP-verified in this session
            if (rgVerifiedPhone === normPhone) {
                errorBox.classList.add('d-none');
                resultsEl.classList.remove('d-none');
                rgLastSearchState = { phone, bookings, orders };
                renderResults(bookings, orders);
                return;
            }

            // First time searching this phone: Prompt OTP verification before showing results
            errorBox.classList.add('d-none');
            showOTPModal(phone, () => {
                rgVerifiedPhone = normPhone;
                resultsEl.classList.remove('d-none');
                rgLastSearchState = { phone, bookings, orders };
                renderResults(bookings, orders);
                showToast('Xác thực số điện thoại thành công!', 'success');
            });
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

function isRegisteredMember(normPhone) {
    try {
        const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
        const found = users.find(u => normalizePhone(u.phone) === normPhone && (!u.is_temporary || u.password));
        if (found) return found;

        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (currentUser && normalizePhone(currentUser.phone) === normPhone && !currentUser.is_temporary) {
            return currentUser;
        }
    } catch (_) {}
    return null;
}

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
    const s = String(status || '').toUpperCase();
    return {
        'PENDING':         'pending',
        'PENDING_PAYMENT': 'pending',
        'CONFIRMED':       'preparing',
        'PREPARING':       'preparing',
        'SHIPPING':        'shipping',
        'DELIVERED':       'delivered',
        'COMPLETED':       'completed',
        'CANCELLED':       'cancelled',
        'RETURNED':        'returned',
        'REFUNDED':        'returned',
        'RETURN_PENDING':  'return_pending'
    }[s] || String(status || 'pending').toLowerCase();
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
    if (status !== 'pending') return false;
    if (o.paymentStatus === 'pending_refund' || o.paymentStatus === 'refunded') return false;
    
    return true;
}

function canReturnOrder(o) {
    const status = normalizeOrderStatus(o.status);
    if (status !== 'delivered' && status !== 'completed') return false;
    if (status === 'returned' || o.status === 'return_pending') return false;
    
    const updatedAt = o.updatedAt || o.createdAt;
    if (!updatedAt) return false;
    const daysDiff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
}
function canConfirmOrder(o) {
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
    const status = resolveBookingStatus(b);
    // 3.1.5: Chỉ kích hoạt đổi lịch khi ca hẹn ở trạng thái "Đã xác nhận" (confirmed)
    if (status !== 'confirmed') return false;
    if ((b.changeCount || 0) >= 2) return false;
    return true;
}

function canCancelBooking(b) {
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
        () => confirmCancelOrder(orderId)
    );
};

window.handleGuestConfirmOrder = async function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    showActionConfirm(
        'Xác nhận đơn hàng',
        `Bạn xác nhận đã nhận hàng thành công cho đơn hàng <strong>${esc(orderId)}</strong>?`,
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
                    <p class="text-muted small mb-4">Mã OTP 6 số đã được gửi đến <strong>${esc(phone)}</strong> để ${purposeText}.<br><span class="text-muted rg-otp-hint">(Mã test: 555666)</span></p>
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
                let query = db.from('appointment').update({ 
                    appointment_date: selDate,
                    appointment_time: selTime + ':00',
                    appointment_status: 'cho_xac_nhan', 
                    change_count: booking ? booking.changeCount : 1,
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
            showQuickSetupPasswordModal(phone);
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
                    await db.from('customer').update({
                        password_hash: pwd,
                        account_status: 'ACTIVE',
                        is_temporary: false
                    }).eq('phone_main', phone);
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

