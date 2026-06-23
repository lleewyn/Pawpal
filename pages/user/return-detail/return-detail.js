import { API } from '/assets/js/api/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    await API.initData();

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId') || 'ORD-2026-002';

    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const rmaData = returnsList.find((item) => item.orderId === orderId);

    if (!rmaData) {
        alert('Khong tim thay yeu cau doi tra cho don hang nay.');
        window.location.href = 'orders.html';
        return;
    }

    document.getElementById('rma-id-title').textContent = `Yeu cau doi tra #${rmaData.rmaId}`;

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
        broken: 'San pham loi hong (do van chuyen hoac NSX)',
        wrong_item: 'Giao sai mau ma, chung loai',
        wrong_size: 'Khong vua kich thuoc',
        change_mind: 'Khong con nhu cau su dung'
    };

    document.getElementById('rma-reason-text').textContent = reasonsMap[rmaData.reason] || rmaData.reason;
    document.getElementById('rma-description-text').textContent = rmaData.description || 'Khong co mo ta chi tiet.';

    const timelineSteps = [
        { key: 'placed', title: 'Gui yeu cau', desc: 'Da tiep nhan yeu cau doi tra' },
        { key: 'reviewing', title: 'Dang kiem duyet', desc: 'Doi ngu ho tro dang xem xet thong tin' },
        { key: 'approved', title: 'Da chap nhan', desc: 'Yeu cau duoc duyet. Vui long gui hang ve shop' },
        { key: 'shipping_return', title: 'Dang gui hang tra', desc: 'Dang cho kho nhan san pham' },
        { key: 'completed', title: 'Hoan tat', desc: 'Giao dich doi tra da duoc giai quyet' }
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
        placed: 'Da gui yeu cau',
        reviewing: 'Dang kiem duyet',
        approved: 'Da chap nhan',
        shipping_return: 'Dang gui hang tra',
        completed: 'Hoan tat',
        rejected: 'Tu choi'
    };

    return statusMap[status] || status;
}
