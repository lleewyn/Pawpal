import { normalizeOrderStatus, getStatusLabel } from '/scripts/shared/order-status.mjs';

import { API } from '/scripts/api/api.js';
import { watchCustomerTables } from '/scripts/shared/customer-realtime.mjs';
import './return-handler.js';
import './review-handler.js';

const ordersState = {
    allOrders: [],
    filteredOrders: [],
    currentTab: 'all',
    currentPage: 1,
    ordersPerPage: 10,
    searchQuery: '',
    returns: [],
    reviews: []
};

let ordersLoadVersion = 0;
let stopOrdersRealtime;
export function dispose() {
    ++ordersLoadVersion;
    stopOrdersRealtime?.();
    clearInterval(pendingOrdersTicker);
}

async function loadOrders() {
    const loadVersion = ++ordersLoadVersion;
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        
        if (!currentUser) {
            showEmptyState('Vui lòng đăng nhập để xem đơn hàng.');
            return;
        }

        if (!window.SupabaseClient) {
            await new Promise(r => setTimeout(r, 300));
        }

        const remoteOrders = await API.getUserOrders(currentUser.id);
        if (loadVersion !== ordersLoadVersion) return;
        // Live data is authoritative; never merge browser copies over server state.
        const mergedList = remoteOrders.map(order => {
            const products = Array.isArray(order.products) && order.products.length > 0
                ? order.products
                : (Array.isArray(order.items) && order.items.length > 0 ? order.items : []);
            
            const normalizedProducts = products.map(p => ({
                ...p,
                id: p.id || p.productId || '',
                name: p.name || p.title || 'Sản phẩm',
                image: p.image || p.img || '/assets/images/publics/feed.jpg',
                quantity: Number(p.quantity ?? p.qty) || 1,
                price: Number(p.price ?? p.unitPrice) || 0,
                total: Number(p.total) || ((Number(p.price) || 0) * (Number(p.quantity) || 1))
            }));

            const grandTotal = Number(
                order.pricing?.grandTotal ?? order.pricing?.total ?? order.total ?? 0
            );

            return {
                ...order,
                id: order.id || order.orderId || `ORD-${Date.now()}`,
                products: normalizedProducts,
                pricing: {
                    ...(order.pricing || {}),
                    total: grandTotal,
                    grandTotal: grandTotal
                },
                paymentMethod: (order.paymentMethod || order.payment?.method || '').toLowerCase(),
                paymentStatus: String(order.paymentStatus || order.payment?.status || (order.paymentMethod === 'cod' ? 'pending_payment' : 'pending')).toLowerCase(),
                status: order.status || 'pending',
                createdAt: order.createdAt || new Date().toISOString()
            };
        });

        ordersState.allOrders = mergedList;
        ordersState.filteredOrders = ordersState.allOrders;

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        ordersState.returns=[];
        if (db && ordersState.allOrders.length > 0) {
            try {
                const orderUuids = ordersState.allOrders.map(o => o._supabaseId).filter(Boolean);
                if (orderUuids.length > 0) {
                    const { data: returnRows, error: returnError } = await db
                        .from('return_request')
                        .select('sales_order_id')
                        .in('sales_order_id', orderUuids);
                    if(returnError)throw returnError;
                    if (loadVersion !== ordersLoadVersion) return;
                    if (returnRows) ordersState.returns = returnRows.map(r => r.sales_order_id);
                }
            } catch(e) {
                throw e;
            }
        }

        const lineIds=ordersState.allOrders.flatMap(o=>o.products.map(p=>p.lineId)).filter(Boolean);
        ordersState.reviews=[];
        if(db&&lineIds.length){
            const reviewed=await db.from('review').select('sales_order_detail_id').in('sales_order_detail_id',lineIds);
            if(reviewed.error)throw reviewed.error;
            if(loadVersion!==ordersLoadVersion)return;
            const ids=new Set((reviewed.data||[]).map(r=>r.sales_order_detail_id));
            ordersState.reviews=ordersState.allOrders.filter(o=>o.products.length&&o.products.every(p=>ids.has(p.lineId))).map(o=>o.id);
        }
        checkAndExpirePendingOrders();
        if (loadVersion !== ordersLoadVersion) return;
        updateStats();
        updateTabCounts();
        applyFilters();
        startPendingOrdersTicker();
    } catch (error) {
        if (loadVersion !== ordersLoadVersion) return;
        console.error('Lỗi load đơn hàng:', error);
        showEmptyState('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    }
}

let pendingOrdersTicker;
function checkAndExpirePendingOrders() { return false; }
function startPendingOrdersTicker() {}

function updateStats() {
    const processingStatuses = ['pending', 'preparing', 'shipping', 'delivered'];
    const processingCount = ordersState.allOrders.filter((order) => processingStatuses.includes(normalizeOrderStatus(order.status))).length;
    const completedCount = ordersState.allOrders.filter((order) => normalizeOrderStatus(order.status) === 'completed').length;
    const totalSpent = ordersState.allOrders
        .filter((order) => order.paymentStatus === 'paid' && !['cancelled', 'returned'].includes(normalizeOrderStatus(order.status)))
        .reduce((sum, order) => {
            const amount = toNumber(order.pricing?.total)
                        || toNumber(order.pricing?.grandTotal);
            return sum + amount;
        }, 0);

    document.getElementById('processing-count').textContent = processingCount;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
}

function updateTabCounts() {
    const statuses = ['all', 'pending', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled', 'returned'];

    statuses.forEach((status) => {
        const count = status === 'all'
            ? ordersState.allOrders.length
            : ordersState.allOrders.filter((order) => normalizeOrderStatus(order.status) === status).length;

        const countElement = document.getElementById(`count-${status}`);
        if (countElement) countElement.textContent = `(${count})`;
    });
}

function filterByStatus(status) {
    ordersState.currentTab = status;
    ordersState.currentPage = 1;
    applyFilters();
}

function searchOrders(query) {
    const normalizedQuery = String(query ?? '').trim();
    ordersState.searchQuery = normalizedQuery.toLowerCase();
    const searchInput = document.getElementById('order-search');
    if (searchInput) searchInput.value = normalizedQuery;
    ordersState.currentPage = 1;
    applyFilters();
}

function applyFilters() {
    let filtered = ordersState.allOrders;

    if (ordersState.currentTab !== 'all') {
        filtered = filtered.filter((order) => normalizeOrderStatus(order.status) === ordersState.currentTab);
    }

    if (ordersState.searchQuery) {
        filtered = filtered.filter((order) => {
            const matchId = String(order.id || '').toLowerCase().includes(ordersState.searchQuery);
            const prods = Array.isArray(order.products) ? order.products : [];
            const matchProducts = prods.some((product) => String(product.name || '').toLowerCase().includes(ordersState.searchQuery));
            return matchId || matchProducts;
        });
    }

    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    });

    ordersState.filteredOrders = filtered;
    renderOrders();
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const cleaned = String(text).replace(/\s*&\s*/g, ' và ');
    const div = document.createElement('div');
    div.textContent = cleaned;
    return div.innerHTML;
}

function renderOrders() {
    const container = document.getElementById('orders-list');

    if (ordersState.filteredOrders.length === 0) {
        showEmptyState('Không tìm thấy đơn hàng nào');
        return;
    }

    const startIndex = (ordersState.currentPage - 1) * ordersState.ordersPerPage;
    const endIndex = startIndex + ordersState.ordersPerPage;
    const ordersToShow = ordersState.filteredOrders.slice(startIndex, endIndex);

    container.innerHTML = ordersToShow.map((order) => createOrderCard(order)).join('');
    renderPagination();
}

function createOrderCard(order) {
    const orderId = order.id || order._id || '';
    const prods = Array.isArray(order.products) ? order.products : (Array.isArray(order.items) ? order.items : []);
    const firstProduct = prods.length > 0
        ? prods[0]
        : { name: 'Sản phẩm PawPal', image: '/assets/images/publics/feed.jpg', sku: '', quantity: 1, price: 0, total: 0 };
    const remainingCount = Math.max(0, prods.length - 1);
    const normalizedStatus = normalizeOrderStatus(order.status);

    const isPaid = order.paymentStatus === 'paid' || order.payment?.status === 'paid';
    const ONLINE_METHODS = ['vnpay', 'momo', 'zalopay', 'vietqr'];
    const payMethod = (order.paymentMethod || order.payment?.method || '').toLowerCase();
    const isOnline  = ONLINE_METHODS.includes(payMethod);

    const displayStatusLabel = getStatusLabel(normalizedStatus);
    const displayStatusClass = `status-${normalizedStatus}`;

    const isDelivered = normalizedStatus === 'delivered';
    const isCompleted = normalizedStatus === 'completed';
    const isReturned = normalizedStatus === 'returned';
    const productCount = Array.isArray(order.products)
        ? order.products.reduce((sum, product) => sum + (Number(product.quantity) || 1), 0)
        : 0;
    const paymentLabel = getPaymentMethodLabel(order.paymentMethod).replace(/\s*&\s*/g, ' và ');
    const orderAlreadyReviewed = (isDelivered || isCompleted) && ordersState.reviews.includes(String(orderId));

    const alreadyReturned = isReturned || ordersState.returns.includes(String(order._supabaseId));

    let actionButtonsHtml = '';

    // 1. Phản ánh / Khiếu nại đơn hàng (Tại Đã giao hoặc Hoàn thành)
    if (isDelivered || isCompleted) {
        actionButtonsHtml += `
            <a class="btn-order-action btn-action-complaint" href="#support-create?type=order&orderId=${encodeURIComponent(orderId)}" onclick="event.stopPropagation()" title="Gửi phản ánh hoặc khiếu nại về đơn hàng này">
                Phản ánh đơn
            </a>
        `;
    }

    // 2. Hủy đơn hàng (Chỉ cho phép khi đơn ở trạng thái Chờ xác nhận)
    if (normalizedStatus === 'pending') {
        actionButtonsHtml += `
            <button type="button" class="btn-order-action btn-action-cancel" onclick="event.stopPropagation(); cancelOrder('${escapeHtml(orderId)}')">
                Hủy đơn
            </button>
        `;
    }

    // 3. Đổi trả hàng:
    // - Nếu đã có yêu cầu / trạng thái trả hàng: hiển thị Chi tiết đổi trả
    // - Khách chỉ được tạo yêu cầu đổi/trả mới khi ở trạng thái Đã giao (trong thời hạn 7 ngày)
    if (alreadyReturned) {
        actionButtonsHtml += `
            <a href="#return-detail?orderId=${encodeURIComponent(orderId)}" class="btn-order-action btn-action-modify" onclick="event.stopPropagation()">
                Chi tiết đổi trả
            </a>
        `;
    } else if (isDelivered) {
        const deliveredEntry = Array.isArray(order.timeline)
            ? order.timeline.slice().reverse().find((timelineItem) => timelineItem.status === 'delivered')
            : null;
        const deliveredAt = deliveredEntry ? new Date(deliveredEntry.timestamp) : new Date(order.updatedAt || order.createdAt || 0);
        const daysPassed = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
        const withinReturnWindow = daysPassed <= 7;

        if (withinReturnWindow && !orderAlreadyReviewed) {
            actionButtonsHtml += `
                <button type="button" class="btn-order-action btn-action-modify" onclick="event.stopPropagation(); openRMADrawer('${escapeHtml(orderId)}')">
                    Yêu cầu đổi trả
                </button>
            `;
        }
    }

    // 4. Đổi phương thức thanh toán (khi đơn Chờ xác nhận chưa thanh toán online)
    const canPayNow = normalizedStatus === 'pending' && !isPaid && isOnline;
    if (canPayNow) {
        actionButtonsHtml += `
            <button type="button" class="btn-order-action btn-action-modify" onclick="event.stopPropagation(); openChangePaymentMethodModal('${escapeHtml(orderId)}')">
                Đổi phương thức
            </button>
        `;
    }

    // 5. Liên hệ hotline
    actionButtonsHtml += `
        <button type="button" class="btn-order-action btn-action-hotline" onclick="event.stopPropagation(); contactHotline('${escapeHtml(orderId)}')">
            Liên hệ hotline
        </button>
    `;

    // 6. Đánh giá sản phẩm (tùy chọn hậu mãi tại Đã giao hoặc Hoàn thành)
    if (isDelivered || isCompleted) {
        if (!orderAlreadyReviewed) {
            actionButtonsHtml += `
                <a class="btn-order-action btn-action-review" href="#order-detail?id=${encodeURIComponent(orderId)}&section=reviews" onclick="event.stopPropagation()">
                    Đánh giá
                </a>
            `;
        } else {
            actionButtonsHtml += `<span class="badge-reviewed-9px">Đã đánh giá</span>`;
        }
    }

    // 7. Xác nhận nhận hàng sớm (khi shipper đã giao thành công)
    if (normalizedStatus === 'delivered') {
        actionButtonsHtml += `
            <button type="button" class="btn-order-action btn-action-primary" onclick="event.stopPropagation(); confirmOrderReceipt('${escapeHtml(orderId)}')">
                Đã nhận được hàng
            </button>
        `;
    }

    // 8. Primary Action: Thanh toán ngay (vàng hổ phách) hoặc Mua lại (vàng hổ phách)
    if (canPayNow) {
        actionButtonsHtml += `
            <button type="button" class="btn-order-action btn-action-primary" onclick="event.stopPropagation(); openOrderPaymentModal('${escapeHtml(orderId)}')">
                Thanh toán ngay
            </button>
        `;
    } else if (isCompleted) {
        actionButtonsHtml += `
            <button type="button" class="btn-order-action btn-action-primary" onclick="event.stopPropagation(); reorder('${escapeHtml(orderId)}')">
                Mua lại
            </button>
        `;
    }

    let statusNoticeHtml = '';
    if (normalizedStatus === 'pending' && !isPaid && isOnline && order.paymentExpiry) {
        statusNoticeHtml = `
            <div class="order-alert-note order-pending-countdown" data-expiry="${order.paymentExpiry}" data-order-id="${orderId}">
                ⏳ Thời gian thanh toán còn lại: <strong class="countdown-clock">--:--</strong>
            </div>
        `;
    }

    const detailUrl = `#order-detail?id=${encodeURIComponent(orderId)}`;

    return `
        <article class="order-card pawpal-smooth-entrance status-${normalizedStatus}" data-order-id="${orderId}">
            <div class="order-card-main-content" onclick="window.location.href='${detailUrl}'" role="link" tabindex="0">
                <div class="order-product-thumb-wrapper">
                    <img src="${firstProduct.image || '/assets/images/publics/feed.jpg'}" alt="${escapeHtml(firstProduct.name)}" class="order-product-thumb" loading="lazy" onerror="this.onerror=null; this.src='/assets/images/publics/feed.jpg';">
                </div>
                <div class="order-info-col">
                    <div class="order-title-row">
                        <span class="order-code">Mã: #${escapeHtml(orderId)}</span>
                        <span class="order-dot-sep">•</span>
                        <span class="order-date">${formatDate(order.createdAt)}</span>
                    </div>
                    <h4 class="order-product-name">${escapeHtml(firstProduct.name)}</h4>
                    <div class="order-meta-row">
                        <span class="order-meta-item">${productCount > 0 ? `${productCount} sản phẩm` : '1 sản phẩm'}${remainingCount > 0 ? ` (và ${remainingCount} sản phẩm khác)` : ''}</span>
                        <span class="order-dot-sep">•</span>
                        <span class="order-meta-item">${escapeHtml(paymentLabel)}</span>
                    </div>
                    ${statusNoticeHtml}
                </div>
                <div class="order-status-price-col">
                    <span class="order-badge-status ${displayStatusClass}">${displayStatusLabel}</span>
                    <span class="order-price-value">${formatCurrency(toNumber(order.pricing?.total ?? order.pricing?.grandTotal ?? order.total))}</span>
                </div>
            </div>
            ${actionButtonsHtml ? `
                <div class="order-card-footer-actions">
                    <div class="order-card-actions-group">
                        ${actionButtonsHtml}
                    </div>
                </div>
            ` : ''}
        </article>
    `;
}

function showEmptyState(message) {
    const container = document.getElementById('orders-list');
    container.innerHTML = `
        <div class="empty-state">
            <h4 class="empty-title">Chưa có đơn hàng nào</h4>
            <p class="empty-desc">${escapeHtml(message || 'Các đơn mua sắm vật phẩm và phụ kiện cho bé cưng sẽ hiển thị tại đây')}</p>
            <a href="/shop" class="btn-order-primary-cta">Mua sắm cho bé ngay</a>
        </div>
    `;
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.classList.add('d-none');
}

function renderPagination() {
    const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.ordersPerPage);

    if (totalPages <= 1) {
        document.getElementById('pagination').classList.add('d-none');
        return;
    }

    document.getElementById('pagination').classList.remove('d-none');

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');

    prevBtn.disabled = ordersState.currentPage === 1;
    nextBtn.disabled = ordersState.currentPage === totalPages;

    let pagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= ordersState.currentPage - 1 && i <= ordersState.currentPage + 1)) {
            pagesHTML += `<button class="page-btn ${i === ordersState.currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === ordersState.currentPage - 2 || i === ordersState.currentPage + 2) {
            pagesHTML += '<span>...</span>';
        }
    }

    pageNumbers.innerHTML = pagesHTML;
}

function goToPage(page) {
    ordersState.currentPage = page;
    renderOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.goToPage = goToPage;

function contactHotline(orderId) {
    showOrdersToast(`Tổng đài hỗ trợ đơn hàng ${orderId}: 1900 1234`, 'info');
}

window.contactHotline = contactHotline;

function cancelOrder(orderId) {
    const order = ordersState.allOrders.find((item) => item.id === orderId);
    if (!order) {
        showOrdersToast('Không tìm thấy đơn hàng để hủy.', 'error');
        return;
    }

    const modalId = 'orders-cancel-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = modalId;
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác nhận hủy đơn hàng</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Bạn có chắc chắn muốn hủy đơn hàng <strong>${orderId}</strong>?</p>
                    <p class="text-muted small">Đơn hàng sau khi hủy sẽ không thể khôi phục.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Quay lại</button>
                    <button type="button" class="btn-danger-outline" id="orders-cancel-confirm">Xác nhận hủy</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    const reason=document.createElement('textarea');reason.id='orders-cancel-reason';reason.maxLength=1000;reason.className='form-control';reason.placeholder='Lý do hủy đơn';
    el.querySelector('.modal-body').appendChild(reason);
    document.getElementById('orders-cancel-confirm').addEventListener('click',async event=>{
        const button=event.currentTarget;if(button.disabled)return;
        if(reason.value.trim().length<2){showOrdersToast('Vui lòng nhập lý do hủy đơn.','error');return;}
        button.disabled=true;
        try{
            const db=window.getSupabaseClient?.()||window.SupabaseClient;
            const {error}=await db.rpc('cancel_own_sales_order',{p_request:crypto.randomUUID(),p_order:order._supabaseId,p_expected:order.updatedAt,p_reason:reason.value.trim()});
            if(error)throw error;
            modal.hide();await loadOrders();applyFilters();updateStats();updateTabCounts();
            showOrdersToast('Đã hủy đơn hàng.','success');
        }catch(error){showOrdersToast(error.message||'Không thể hủy đơn hàng.','error');}
        finally{button.disabled=false;}
    });
}

window.cancelOrder = cancelOrder;

async function confirmOrderReceipt(orderId) {
    const order=ordersState.allOrders.find(o=>String(o.id)===String(orderId));if(!order)return;
    try{
        const db=window.getSupabaseClient?.()||window.SupabaseClient;
        const {error}=await db.rpc('receive_own_sales_order',{p_request:crypto.randomUUID(),p_order:order._supabaseId,p_expected:order.updatedAt});
        if(error)throw error;
        await loadOrders();applyFilters();updateStats();updateTabCounts();
        showOrdersToast('Đã xác nhận nhận hàng.','success');
    }catch(error){showOrdersToast(error.message||'Không thể xác nhận nhận hàng.','error');}
}

window.confirmOrderReceipt = confirmOrderReceipt;

async function reorder(orderId) {
    const order=ordersState.allOrders.find(o=>String(o.id)===String(orderId));if(!order)return;
    try{
        const user=JSON.parse(localStorage.getItem('pawpal_current_user')||'null');
        const current=await API.getUserCart(user?.id);
        const additions=order.products.map(p=>({id:p.variantId||p.id,variantId:p.variantId||p.id,name:p.name,quantity:p.quantity}));
        await API.saveUserCart(user.id,[...current,...additions]);
        window.location.href='/cart';
    }catch(error){showOrdersToast(error.message||'Không thể mua lại đơn hàng.','error');}
}

window.reorder = reorder;

function openQuickReviewModal(orderId) {
    window.location.hash='#order-detail?orderId='+encodeURIComponent(orderId)+'&section=reviews';
}
window.openQuickReviewModal = openQuickReviewModal;

function showOrdersToast(message, type = 'info') {
    let container = document.getElementById('orders-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'orders-toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }

    const colors = { success: '#2a5944', error: '#dc3545', info: '#0d6efd', warning: '#ffc107' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type] || colors.info};color:${type === 'warning' ? '#000' : '#fff'};padding:12px 18px;border-radius:8px;font-size:0.88rem;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:320px;`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s';
    }, 3000);
    setTimeout(() => toast.remove(), 3400);
}

function formatCurrency(amount) {
    const value = Number(amount);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(Number.isFinite(value) ? value : 0);
}

function toNumber(value, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getPaymentMethodLabel(method) {
    const labels = {
        cod:           'Thanh toán khi nhận hàng (COD)',
        momo:          'Thanh toán MoMo',
        vnpay:         'VNPay',
        zalopay:       'ZaloPay',
        vietqr:        'VietQR',
        bank_transfer: 'Chuyển khoản ngân hàng',
        card:          'Thẻ ngân hàng',
        cash:          'Tiền mặt tại quầy',
        transfer:      'Chuyển khoản tại quầy'
    };
    return labels[method] || 'Thanh toán online';
}

async function openOrderPaymentModal(orderId) {
    window.location.hash='#order-detail?orderId='+encodeURIComponent(orderId);
}
window.openOrderPaymentModal = openOrderPaymentModal;

function openChangePaymentMethodModal(orderId) {
    showOrdersToast('Phương thức của đơn đã lập cần nhân viên xác nhận. Vui lòng liên hệ cửa hàng.', 'info');
    window.location.hash='#order-detail?orderId='+encodeURIComponent(orderId);
}
window.openChangePaymentMethodModal = openChangePaymentMethodModal;

let isInitRunning = false;

export async function initOrders() {
    if (isInitRunning) return;
    isInitRunning = true;
    try {
        const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        stopOrdersRealtime = watchCustomerTables(client, user?.id, ['sales_order', 'payment', 'return_request', 'review'], loadOrders);
        if (typeof window.setUserSubBreadcrumb === 'function') {
            window.setUserSubBreadcrumb('', 'orders');
        }

        // Kiểm tra tab ban đầu từ URL parameter (ví dụ ?status=pending_payment hoặc ?tab=pending_payment)
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
        const initialStatus = urlParams.get('status') || urlParams.get('tab');
        if (initialStatus) {
            ordersState.currentTab = initialStatus;
            const targetTab = document.querySelector(`.order-filter-tab[data-status="${initialStatus}"], .tab-btn[data-status="${initialStatus}"]`);
            if (targetTab) {
                document.querySelectorAll('.order-filter-tab, .tab-btn').forEach((item) => {
                    item.classList.remove('active');
                    item.setAttribute('aria-selected', 'false');
                });
                targetTab.classList.add('active');
                targetTab.setAttribute('aria-selected', 'true');
            }
        }

        await loadOrders();

        document.querySelectorAll('.order-filter-tab, .tab-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                document.querySelectorAll('.order-filter-tab, .tab-btn').forEach((item) => {
                    item.classList.remove('active');
                    item.setAttribute('aria-selected', 'false');
                });
                event.currentTarget.classList.add('active');
                event.currentTarget.setAttribute('aria-selected', 'true');
                filterByStatus(event.currentTarget.dataset.status);
            });
        });

        const searchInput = document.getElementById('order-search');
        const searchBtn = document.getElementById('search-btn');

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                searchOrders(searchInput.value);
            });

            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    searchOrders(searchInput.value);
                }
            });
        }

        const prevBtn = document.getElementById('prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (ordersState.currentPage > 1) goToPage(ordersState.currentPage - 1);
            });
        }

        const nextBtn = document.getElementById('next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.ordersPerPage);
                if (ordersState.currentPage < totalPages) goToPage(ordersState.currentPage + 1);
            });
        }
    } finally {
        isInitRunning = false;
    }
}

export const init = initOrders;
window.initOrders = initOrders;

