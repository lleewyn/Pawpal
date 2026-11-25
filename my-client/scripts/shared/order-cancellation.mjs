export const cancellationReasons = Object.freeze([
    'Tôi muốn thay đổi địa chỉ giao hàng',
    'Tôi muốn nhập/thay đổi mã voucher',
    'Tôi muốn thay đổi sản phẩm trong đơn hàng (size, màu sắc, số lượng,...)',
    'Thủ tục thanh toán rắc rối',
    'Tìm thấy giá rẻ hơn ở chỗ khác',
    'Đổi ý, không muốn mua nữa'
]);

export function styleOrderAction(container) {
    (container.closest('dialog, .modal') || container).classList.add('pawpal-order-action');
    if (!document.querySelector('link[data-order-cancellation-styles]')) {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';stylesheet.href = '/scripts/shared/order-cancellation.css';
        stylesheet.dataset.orderCancellationStyles = '';document.head.append(stylesheet);
    }
}

export function mountCancellationReasons(container, id, {reasons = cancellationReasons, otherLabel = 'Lý do khác', maxLength = 1000} = {}) {
    styleOrderAction(container);
    const fieldset = document.createElement('fieldset');
    fieldset.style.cssText = 'border:0;padding:0;margin:12px 0;display:grid;gap:12px';
    const legend = document.createElement('legend');
    legend.textContent = 'Lý do hủy';
    legend.style.cssText = 'font-size:14px;font-weight:600;color:#236B48';
    const required = document.createElement('span');
    required.textContent = ' *';required.style.color = '#DC2626';legend.append(required);
    fieldset.append(legend);
    for (const reason of [...reasons, otherLabel]) {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:14px;line-height:1.5';
        const radio = document.createElement('input');
        radio.type = 'radio';radio.name = id + '-choice';radio.value = reason;
        radio.style.cssText = 'accent-color:#236B48;flex-shrink:0;margin-top:4px';
        label.append(radio, document.createTextNode(reason));fieldset.append(label);
    }
    const detail = document.createElement('textarea');
    detail.id = id;detail.className = 'form-control admin-input';detail.maxLength = maxLength;
    detail.rows = 3;detail.placeholder = 'Nhập lý do khác';detail.setAttribute('aria-label', otherLabel);detail.hidden = true;
    fieldset.append(detail);
    fieldset.addEventListener('change', () => {
        detail.hidden = fieldset.querySelector('input:checked')?.value !== otherLabel;
        if (!detail.hidden) detail.focus();
    });
    container.append(fieldset);
    return () => {
        const selected = fieldset.querySelector('input:checked')?.value;
        return selected === otherLabel ? detail.value.trim() : selected || '';
    };
}

export function renderCancellationSummary(container, order) {
    let summary = container.querySelector('[data-cancellation-summary]');
    if (!summary) {
        summary = document.createElement('section');summary.dataset.cancellationSummary = '';
        summary.style.cssText = 'margin:0 0 20px;padding:0;color:#203A2C;white-space:pre-wrap;overflow-wrap:anywhere';
        container.prepend(summary);
    }
    summary.replaceChildren();summary.hidden = !['cancelled','da_huy'].includes(order.orderStatus || order.status || order.rawStatus);
    if (summary.hidden) return;
    const title = document.createElement('h3');title.textContent = 'Lý do hủy đơn hàng';
    title.style.cssText = 'font-size:16px;font-weight:600;color:#236B48;margin:0 0 8px';
    const reason = document.createElement('p');reason.style.margin = '0';
    reason.textContent = order.cancelReason || order.cancel_reason || 'Chưa ghi nhận lý do hủy';
    summary.append(title, reason);
}
