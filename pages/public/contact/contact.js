function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function showFeedback(type, message) {
    let container = document.getElementById('contactToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'contactToastContainer';
        container.style.cssText = 'position:fixed;top:90px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:12px;max-width:360px;';
        document.body.appendChild(container);
    }

    const colors = {
        success: '#2d7d46',
        error: '#c44536',
        warning: '#d18b00',
        info: '#2b6cb0'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:14px 16px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.18);font-size:14px;line-height:1.45;`;
    toast.innerHTML = `<strong style="display:block;margin-bottom:4px;">${type === 'success' ? 'Thành công' : type === 'error' ? 'Lỗi' : type === 'warning' ? 'Cảnh báo' : 'Thông báo'}</strong><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(12px)';
        toast.style.transition = 'opacity .25s ease, transform .25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 4000);
}

function buildTicketPayload() {
    const fullName = getValue('fullName');
    const phoneNumber = getValue('phoneNumber');
    const serviceInterest = getValue('serviceInterest');
    const message = getValue('message');

    return {
        fullName,
        phoneNumber,
        serviceInterest,
        message
    };
}

function validatePayload(payload) {
    if (!payload.fullName) return 'Vui lòng nhập họ và tên.';
    if (!payload.phoneNumber) return 'Vui lòng nhập số điện thoại.';
    if (!payload.message) return 'Vui lòng nhập lời nhắn.';
    return null;
}

function saveContactTicket(payload) {
    const tickets = JSON.parse(localStorage.getItem('pawpal_support_tickets') || '[]');
    const ticketId = `CT-${Date.now()}`;
    const serviceMap = {
        spa: 'Spa và Grooming',
        hotel: 'Khách sạn thú cưng',
        clinic: 'Phòng khám thú y',
        other: 'Khác'
    };

    tickets.unshift({
        id: ticketId,
        title: `Liên hệ từ ${payload.fullName}`,
        type: 'contact',
        priority: 'normal',
        status: 'pending',
        name: payload.fullName,
        phone: payload.phoneNumber,
        serviceInterest: payload.serviceInterest,
        serviceInterestLabel: serviceMap[payload.serviceInterest] || 'Không chọn',
        messages: [
            {
                sender: 'user',
                text: payload.message,
                time: new Date().toISOString()
            }
        ],
        createdAt: new Date().toISOString()
    });

    localStorage.setItem('pawpal_support_tickets', JSON.stringify(tickets));
    return ticketId;
}

function handleSubmit(event) {
    event.preventDefault();

    const payload = buildTicketPayload();
    const validationError = validatePayload(payload);
    if (validationError) {
        showFeedback('warning', validationError);
        return;
    }

    const ticketId = saveContactTicket(payload);
    const form = document.getElementById('contactForm');
    if (form) form.reset();

    showFeedback(
        'success',
        `PawPal đã nhận tin nhắn của bạn. Mã hỗ trợ: ${ticketId}. Chúng tôi sẽ phản hồi sớm nhất.`
    );
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const submitBtn = document.querySelector('.btn-submit');

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    if (submitBtn && form) {
        submitBtn.addEventListener('click', () => {
            form.requestSubmit();
        });
    }
});
