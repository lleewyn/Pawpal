import { API } from '/scripts/api/api.js';

async function loadReturnRequestFromSupabase(orderId) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !orderId) return null;

    try {
        const { data, error } = await db
            .from('return_request')
            .select(`
                id,
                sales_order_id,
                customer_id,
                reason,
                return_type,
                request_status,
                created_at,
                updated_at,
                refund_account,
                description,
                return_request_detail (
                    id,
                    product_id,
                    quantity,
                    unit_price,
                    product ( id, product_name, image_urls )
                )
            `)
            .eq('sales_order_id', orderId)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[ReturnDetail] Supabase lookup error:', error.message || error);
            return null;
        }

        return data || null;
    } catch (err) {
        console.warn('[ReturnDetail] Supabase fetch exception:', err);
        return null;
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
        status: String(row.request_status || 'placed').toLowerCase(),
        reason: row.reason || 'change_mind',
        type: String(row.return_type || 'exchange').toLowerCase(),
        description: row.description || '',
        refundAccount: row.refund_account || '',
        products,
        pointsDeducted: row.points_deducted || false,
    };
}

async function initReturnDetail() {
    await API.initData();

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        alert('Không tìm thấy mã đơn hàng.');
        window.location.href = '/pages/user/orders/orders.html'; // Bug 7: absolute path
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
        alert('Không tìm thấy yêu cầu đổi trả cho đơn hàng này.');
        window.location.href = '/pages/user/orders/orders.html';
        return;
    }

    // Fallback cho các yêu cầu cũ: nếu products bị lưu thiếu thì lấy lại từ đơn gốc
    if (!Array.isArray(rmaData.products) || rmaData.products.length === 0 || rmaData.products.every((p) => !p || !p.name)) {
        // Since we removed local orders, if products are missing we just have a placeholder
        rmaData.products = [{
            id: 'PROD-UNKNOWN',
            name: 'Sản phẩm',
            image: '/assets/images/shop/products/placeholder.webp',
            quantity: 1,
            price: 0,
            total: 0
        }];
    }

    // Bug 2 + 4: Trừ điểm khi RMA status = 'completed' (chưa trừ trước đó)
    if (rmaData.status === 'completed' && rmaData.type === 'refund' && !rmaData.pointsDeducted) {
        deductPointsForRefund(rmaData);
        // Supabase update for pointsDeducted should be here instead of local storage
        if (window.getSupabaseClient) {
            const db = window.getSupabaseClient();
            db.from('return_request').update({ points_deducted: true }).eq('rma_id', rmaData.rmaId).then();
        }
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

    // Hiển thị thông tin TK hoàn tiền nếu có
    const refundWrapper = document.getElementById('rma-refund-wrapper');
    const refundAccountEl = document.getElementById('rma-refund-account-display');
    if (refundWrapper && refundAccountEl && rmaData.type === 'refund') {
        refundWrapper.classList.remove('d-none');
        refundAccountEl.textContent = rmaData.refundAccount
            ? rmaData.refundAccount
            : 'Nhân viên CSKH sẽ liên hệ trong vòng 24 giờ.';
    }

    // Bug 7 (G7): Hiển thị hướng dẫn gửi hàng khi đã duyệt
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReturnDetail);
} else {
    initReturnDetail();
}

// Bug 2+4: Trừ điểm mua sắm + điểm đánh giá khi hoàn tiền được xác nhận
function deductPointsForRefund(rmaData) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!currentUser) return;

    // Điểm mua sắm: 10.000đ = 1 điểm
    const returnTotalValue = (rmaData.products || []).reduce((sum, p) =>
        sum + (p.total || ((p.price || 0) * (p.quantity || 1))), 0);
    let pointsToDeduct = Math.floor(returnTotalValue / 10000);

    // Điểm thưởng từ đánh giá: nếu có review cho đơn này, trừ thêm
    const reviewed = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    const reviewsForOrder = reviewed.filter(r => r.orderId === rmaData.orderId);
    reviewsForOrder.forEach(r => {
        // +5 điểm nếu có ảnh, +1 điểm nếu chỉ có text
        pointsToDeduct += r.hasMedia ? 5 : 1;
    });

    currentUser.points = Math.max(0, (currentUser.points || 0) - pointsToDeduct);
    localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));

    const users = JSON.parse('[]' || '[]');
    const uIdx = users.findIndex(u => u.phone === currentUser.phone);
    if (uIdx !== -1) {
        users[uIdx].points = currentUser.points;
        /* localStorage.setItem pawpal_users_db removed */
    }
    console.log(`[RMA] Đã trừ ${pointsToDeduct} điểm. Số dư mới: ${currentUser.points}`);
}

function getStatusLabel(status) {
    // Bug 6: Bỏ key trùng 'reviewing'
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

