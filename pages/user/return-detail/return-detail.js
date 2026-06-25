import { API } from '/assets/js/api/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    await API.initData();

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        alert('Không tìm thấy mã đơn hàng.');
        window.location.href = '/pages/user/orders/orders.html'; // Bug 7: absolute path
        return;
    }

    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const rmaData = returnsList.find((item) => item.orderId === orderId);

    if (!rmaData) {
        alert('Không tìm thấy yêu cầu đổi trả cho đơn hàng này.');
        window.location.href = '/pages/user/orders/orders.html';
        return;
    }

    // Bug 2 + 4: Trừ điểm khi RMA status = 'completed' (chưa trừ trước đó)
    if (rmaData.status === 'completed' && rmaData.type === 'refund' && !rmaData.pointsDeducted) {
        deductPointsForRefund(rmaData);
        // Đánh dấu đã trừ để tránh trừ lại khi reload
        rmaData.pointsDeducted = true;
        const updatedList = returnsList.map(r => r.rmaId === rmaData.rmaId ? rmaData : r);
        localStorage.setItem('pawpal_returns', JSON.stringify(updatedList));
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
    `).join('');

    const reasonsMap = {
        broken:      'Sản phẩm lỗi hỏng (do vận chuyển hoặc NSX)',
        wrong_item:  'Giao sai mẫu mã, chủng loại',
        wrong_size:  'Không vừa kích thước',
        change_mind: 'Không còn nhu cầu sử dụng'
    };

    document.getElementById('rma-reason-text').textContent = reasonsMap[rmaData.reason] || rmaData.reason;
    document.getElementById('rma-description-text').textContent = rmaData.description || 'Không có mô tả chi tiết.';

    // Hiển thị thông tin TK hoàn tiền nếu có
    const refundAccountEl = document.getElementById('rma-refund-account-display');
    if (refundAccountEl) {
        refundAccountEl.textContent = rmaData.refundAccount
            ? rmaData.refundAccount
            : 'Nhân viên CSKH sẽ liên hệ trong vòng 24 giờ.';
    }

    // Bug 7 (G7): Hiển thị hướng dẫn gửi hàng khi đã duyệt
    const shippingGuideEl = document.getElementById('rma-shipping-guide');
    if (shippingGuideEl) {
        if (rmaData.status === 'approved' || rmaData.status === 'shipping_return') {
            shippingGuideEl.style.display = 'block';
            shippingGuideEl.innerHTML = `
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin-top:12px;">
                    <h6 style="margin:0 0 8px;color:#166534;">📦 Hướng dẫn gửi hàng trả</h6>
                    <ol style="margin:0;padding-left:18px;font-size:0.88rem;color:#166534;line-height:1.7;">
                        <li>Đóng gói sản phẩm còn nguyên tem, bao bì (nếu có thể).</li>
                        <li>Ghi rõ <strong>mã RMA: ${rmaData.rmaId}</strong> lên bên ngoài kiện hàng.</li>
                        <li>Gửi về địa chỉ: <strong>PawPal — 123 Đường Thú Cưng, Quận 1, TP.HCM</strong></li>
                        <li>Sau khi gửi, liên hệ hotline <strong>1900 1234</strong> để thông báo mã vận đơn.</li>
                    </ol>
                </div>
            `;
        } else {
            shippingGuideEl.style.display = 'none';
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
        if (idx < activeIdx) statusClass = 'done';
        else if (idx === activeIdx) statusClass = 'active';

        return `
            <div class="timeline-step ${statusClass}">
                <div class="timeline-step-dot"></div>
                <div class="timeline-step-content">
                    <h5>${step.title}</h5>
                    <p>${step.desc}</p>
                </div>
            </div>
        `;
    }).join('');
});

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

    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    const uIdx = users.findIndex(u => u.phone === currentUser.phone);
    if (uIdx !== -1) {
        users[uIdx].points = currentUser.points;
        localStorage.setItem('pawpal_users_db', JSON.stringify(users));
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
