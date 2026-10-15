import { API } from '/scripts/api/api.js';

async function loadReturnRequestFromSupabase(orderId) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !orderId) return null;

    try {
        let resolvedOrderId = orderId;
        if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
            const lookup = await db.from('sales_order').select('id').eq('order_code', orderId).maybeSingle();
            if (lookup.error) throw lookup.error;
            if (!lookup.data) return null;
            resolvedOrderId = lookup.data.id;
        }
        const { data, error } = await db.from('return_request')
            .select('*, return_request_detail(*)')
            .eq('sales_order_id', resolvedOrderId)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (data?.return_request_detail?.length) {
            for (const detail of data.return_request_detail) {
                if (detail.product_variant_id) {
                    const result = await db.from('product_variant').select('*, product(*)').eq('id', detail.product_variant_id).maybeSingle();
                    if (result.error) throw result.error;
                    detail.product = result.data?.product;
                } else if (detail.product_id) {
                    const result = await db.from('product').select('*').eq('id', detail.product_id).maybeSingle();
                    if (result.error) throw result.error;
                    detail.product = result.data;
                }
            }
        }

        if (error) {
            console.warn('[ReturnDetail] Supabase lookup error:', error.message || error);
            throw error;
        }

        return data || null;
    } catch (err) {
        console.warn('[ReturnDetail] Supabase fetch exception:', err);
        throw err;
    }
}

function normalizeReturnRequestRow(row) {
    if (!row) return null;

    const products = Array.isArray(row.return_request_detail)
        ? row.return_request_detail.map((item) => {
            const product = item.product || {};
            let imageUrls = product.image_urls;
            if (typeof imageUrls === 'string') {
                try {
                    imageUrls = JSON.parse(imageUrls);
                } catch {
                    imageUrls = [imageUrls];
                }
            }
            const image = Array.isArray(imageUrls) && imageUrls.length
                ? imageUrls[0]
                : '/assets/images/shop/products/placeholder.webp';

            return {
                id: item.product_id || product.id || '',
                name: product.product_name || item.product_name || 'Sản phẩm',
                image,
                quantity: Number(item.quantity) || 1,
                price: Number(item.unit_price) || 0,
                total: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
            };
        })
        : [];

    return {
        orderId: row.sales_order_id || '',
        rmaId: row.id || '',
        createdAt: row.created_at || new Date().toISOString(),
        status: ({PENDING:'reviewing',RESOLVED:'completed',APPROVED:'approved',REJECTED:'rejected',cho_xu_ly:'reviewing',dang_xu_ly:'reviewing',da_duyet:'approved',da_hoan_tat:'completed',da_tu_choi:'rejected',da_huy:'cancelled'})[row.request_status] || String(row.request_status || 'placed').toLowerCase(),
        reason: row.reason || 'change_mind',
        type: ['hoan_tien', 'refund'].includes(String(row.return_type).toLowerCase()) ? 'refund' : 'exchange',
        description: row.description || '',
        refundAccount: row.refund_account || '',
        products,
        pointsDeducted: row.points_deducted || false,
    };
}

async function initReturnDetail() {
    await API.initData();

    const urlParams = new URLSearchParams(window.location.search);
    let orderId = urlParams.get('orderId') || urlParams.get('id');
    if (!orderId && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        orderId = hashParams.get('orderId') || hashParams.get('id');
    }

    if (!orderId) {
        showReturnLoadError('Không tìm thấy mã đơn hàng.');
        return;
    }

    let rmaData = null;

    if (window.getSupabaseClient || window.SupabaseClient) {
        const supabaseRow = await loadReturnRequestFromSupabase(orderId);
        if (supabaseRow) {
            rmaData = normalizeReturnRequestRow(supabaseRow);
        }
    }

    if (!rmaData) {
        showReturnLoadError('Không tìm thấy yêu cầu đổi trả cho đơn hàng này.');
        return;
    }

    if (!Array.isArray(rmaData.products) || rmaData.products.length === 0 || rmaData.products.every((p) => !p || !p.name)) {
        rmaData.products = [{
            id: 'PROD-UNKNOWN',
            name: 'Sản phẩm',
            image: '/assets/images/shop/products/placeholder.webp',
            quantity: 1,
            price: 0,
            total: 0
        }];
    }

    document.getElementById('rma-id-title').textContent = `Yêu cầu đổi trả #${rmaData.rmaId}`;

    const dateObj = new Date(rmaData.createdAt);
    document.getElementById('rma-date').textContent =
        `Ngày tạo: ${dateObj.toLocaleDateString('vi-VN')} lúc ${dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    const badge = document.getElementById('rma-status-badge');
    badge.textContent = getStatusLabel(rmaData.status);

    const prodContainer = document.getElementById('rma-products-list');
    prodContainer.innerHTML = (rmaData.products || []).map((product) => `
        <div class="rma-product-item border-0 p-0">
            <img src="${product.image}" alt="${product.name}" class="rma-product-thumb">
            <div class="rma-product-info">
                <h5 class="rma-product-name">${product.name}</h5>
                <p class="rma-product-meta">Số lượng: ${product.quantity} • Đơn giá: ${new Intl.NumberFormat('vi-VN').format(product.price)}đ</p>
            </div>
        </div>
    `).join('') || `
        <div class="rma-product-item border-0 p-0">
            <img src="/assets/images/shop/products/placeholder.webp" alt="Sản phẩm" class="rma-product-thumb">
            <div class="rma-product-info">
                <h5 class="rma-product-name">Sản phẩm không có dữ liệu</h5>
                <p class="rma-product-meta">Đơn hàng đang được cập nhật</p>
            </div>
        </div>
    `;

    const reasonsMap = {
        broken:      'Sản phẩm lỗi hỏng (do vận chuyển hoặc NSX)',
        wrong_item:  'Giao sai mẫu mã, chủng loại',
        wrong_size:  'Không vừa kích thước',
        change_mind: 'Không còn nhu cầu sử dụng'
    };

    document.getElementById('rma-reason-text').textContent = reasonsMap[rmaData.reason] || rmaData.reason;
    document.getElementById('rma-description-text').textContent = rmaData.description || 'Không có mô tả chi tiết.';

    const refundWrapper = document.getElementById('rma-refund-wrapper');
    const refundAccountEl = document.getElementById('rma-refund-account-display');
    if (refundWrapper && refundAccountEl && rmaData.type === 'refund') {
        refundWrapper.classList.remove('d-none');
        refundAccountEl.textContent = rmaData.refundAccount
            ? rmaData.refundAccount
            : 'Nhân viên CSKH sẽ liên hệ trong vòng 24 giờ.';
    }

    const shippingBox = document.getElementById('rma-shipping-box');
    if (shippingBox) {
        if (rmaData.status === 'approved' || rmaData.status === 'shipping_return') {
            shippingBox.classList.remove('d-none');
            const codeBold = document.getElementById('rma-code-bold');
            if (codeBold) codeBold.textContent = rmaData.rmaId;
        } else {
            shippingBox.classList.add('d-none');
        }
    }

    const timelineSteps = [
        { key: 'placed',          title: 'Gửi yêu cầu',        desc: 'Đã tiếp nhận yêu cầu đổi trả' },
        { key: 'reviewing',       title: 'Đang kiểm duyệt',    desc: 'Đội ngũ hỗ trợ đang xem xét thông tin' },
        { key: 'approved',        title: 'Đã chấp nhận',        desc: 'Yêu cầu được duyệt. Vui lòng gửi hàng về shop' },
        { key: 'shipping_return', title: 'Đang gửi hàng trả',  desc: 'Đang chờ kho nhận sản phẩm' },
        { key: 'completed',       title: 'Hoàn tất',            desc: 'Giao dịch đổi trả đã được giải quyết' }
    ];

    const statusOrder = timelineSteps.map(s => s.key);
    let activeIdx = statusOrder.indexOf(rmaData.status);
    if (activeIdx === -1) activeIdx = 0; // fallback

    const timelineContainer = document.getElementById('rma-timeline');
    timelineContainer.innerHTML = timelineSteps.map((step, idx) => {
        let statusClass = 'pending';
        if (idx < activeIdx) statusClass = 'completed';
        else if (idx === activeIdx) statusClass = 'active';

        return `
            <div class="rma-timeline-item ${statusClass}">
                <div class="rma-timeline-dot"></div>
                <div class="rma-timeline-content">
                    <div class="rma-timeline-title">${step.title}</div>
                    <div class="rma-timeline-desc">${step.desc}</div>
                </div>
            </div>
        `;
    }).join('');
}

function showReturnLoadError(message) {
    const container = document.querySelector('.return-detail-module-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-5" role="status"><p class="text-muted"></p><a href="#orders">Quay lại danh sách đơn hàng</a></div>';
    container.querySelector('p').textContent = message;
}

let isInitRunning = false;

export async function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    const loadingContainer = document.querySelector('.return-detail-module-container');
    try {
        await initReturnDetail();
    } catch (error) {
        console.error('[ReturnDetail] Không thể tải yêu cầu:', error);
        showReturnLoadError('Không thể tải yêu cầu đổi trả. Vui lòng tải lại trang.');
    } finally {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            loadingContainer?.classList.remove('return-detail-loading');
            loadingContainer?.setAttribute('aria-busy', 'false');
            setTimeout(() => loadingContainer?.querySelector('.return-detail-skeleton')?.remove(), 260);
        }));
        isInitRunning = false;
    }
}

export const initReturnDetailExport = init;
window.initReturnDetail = init;

function deductPointsForRefund(rmaData) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!currentUser) return;

    const returnTotalValue = (rmaData.products || []).reduce((sum, p) =>
        sum + (p.total || ((p.price || 0) * (p.quantity || 1))), 0);
    let pointsToDeduct = Math.floor(returnTotalValue / 10000);

    const reviewed = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    const reviewsForOrder = reviewed.filter(r => r.orderId === rmaData.orderId);
    reviewsForOrder.forEach(r => {
        pointsToDeduct += r.hasMedia ? 5 : 1;
    });

    currentUser.points = Math.max(0, (currentUser.points || 0) - pointsToDeduct);
    localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));

    const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
    const uIdx = users.findIndex(u => u.phone === currentUser.phone);
    if (uIdx !== -1) {
        users[uIdx].points = currentUser.points;
        localStorage.setItem('pawpal_users', JSON.stringify(users));
    }
    console.log(`[RMA] Đã trừ ${pointsToDeduct} điểm. Số dư mới: ${currentUser.points}`);
}

function getStatusLabel(status) {
    const statusMap = {
        placed:          'Đã gửi yêu cầu',
        reviewing:       'Đang kiểm duyệt',
        approved:        'Đã chấp nhận',
        shipping_return: 'Đang gửi hàng trả',
        completed:       'Hoàn tất',
        rejected:        'Từ chối'
    };
    return statusMap[status] || status;
}

