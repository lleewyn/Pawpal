import { API } from '/assets/js/api/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    await API.initData();

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId') || 'ORD-2026-002';

    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const rmaData = returnsList.find((item) => item.orderId === orderId);

    if (!rmaData) {
        alert('Không tìm thấy yêu cầu đổi trả cho đơn hàng này.');
        window.location.href = 'orders.html';
        return;
    }

    document.getElementById('rma-id-title').textContent = `Yêu cầu đổi trả #${rmaData.rmaId}`;

    const dateObj = new Date(rmaData.createdAt);
    document.getElementById('rma-date').textContent = `Ngay tao: ${dateObj.toLocaleDateString('vi-VN')} luc ${dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

    const badge = document.getElementById('rma-status-badge');
    badge.textContent = getStatusLabel(rmaData.status);

    const prodContainer = document.getElementById('rma-products-list');
    prodContainer.innerHTML = rmaData.products.map((product) => `
        <div class="rma-product-item border-0 p-0">
            <img src="${product.image}" alt="${product.name}" class="rma-product-thumb">
            <div class="rma-product-info">
                <h5 class="rma-product-name">${product.name}</h5>
                <p class="rma-product-meta">So luong: ${product.quantity} * Don gia: ${new Intl.NumberFormat('vi-VN').format(product.price)}d</p>
            </div>
        </div>
    `).join('');

    const reasonsMap = {
        broken: 'Sản phẩm lỗi hỏng (do vận chuyển hoặc NSX)',
        wrong_item: 'Giao sai mẫu mã, chủng loại',
        wrong_size: 'Không vừa kích thước',
        change_mind: 'Không còn nhu cầu sử dụng'
    };

    document.getElementById('rma-reason-text').textContent = reasonsMap[rmaData.reason] || rmaData.reason;
    document.getElementById('rma-description-text').textContent = rmaData.description || 'Không có mô tả chi tiết.';

    const timelineSteps = [
        { key: 'placed', title: 'Gửi yêu cầu', desc: 'Đã tiếp nhận yêu cầu đổi trả' },
        { key: 'reviewing', title: 'Đang kiểm duyệt', desc: 'Đội ngũ hỗ trợ đang xem xét thông tin' },
        { key: 'approved', title: 'Đã chấp nhận', desc: 'Yêu cầu được duyệt. Vui lòng gửi hàng về shop' },
        { key: 'shipping_return', title: 'Đang gửi hàng trả', desc: 'Đang chờ kho nhận sản phẩm' },
        { key: 'completed', title: 'Hoàn tất', desc: 'Giao dịch đổi trả đã được giải quyết' }
    ];

    const timelineContainer = document.getElementById('rma-timeline');
    let activeIdx = 0;
    if (rmaData.status === 'reviewing') activeIdx = 1;
    else if (rmaData.status === 'approved') activeIdx = 2;
    else if (rmaData.status === 'shipping_return') activeIdx = 3;
    else if (rmaData.status === 'completed') activeIdx = 4;

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

function getStatusLabel(status) {
    const statusMap = {
        placed: 'Đã gửi yêu cầu',
        reviewing: 'Dang kiem duyet',
        reviewing: 'Đang kiểm duyệt',
        approved: 'Đã chấp nhận',
        shipping_return: 'Đang gửi hàng trả',
        completed: 'Hoàn tất',
        rejected: 'Từ chối'
    };

    return statusMap[status] || status;
}
