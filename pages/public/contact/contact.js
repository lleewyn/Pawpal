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

async function saveContactTicket(payload) {
    const serviceMap = {
        spa: 'Spa và Grooming',
        hotel: 'Khách sạn thú cưng',
        clinic: 'Phòng khám thú y',
        other: 'Khác'
    };

    const title = `Liên hệ từ ${payload.fullName}`;
    const type = 'contact';
    const content = `Họ tên: ${payload.fullName}
Số điện thoại: ${payload.phoneNumber}
Dịch vụ quan tâm: ${serviceMap[payload.serviceInterest] || 'Không chọn'}

Tin nhắn:
${payload.message}`;

    // Gọi hàm hỗ trợ Supabase
    if (window.PawPalSupport && window.PawPalSupport.createTicket) {
        const result = await window.PawPalSupport.createTicket(title, type, content);
        return result ? result.id : `CT-${Date.now()}`;
    }

    // Dự phòng: Nếu không load được support-handler
    return `CT-${Date.now()}`;
}

async function handleSubmit(event) {
    event.preventDefault();

    const payload = buildTicketPayload();
    const validationError = validatePayload(payload);
    if (validationError) {
        showFeedback('warning', validationError);
        return;
    }

    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Đang gửi...';
    }

    const ticketId = await saveContactTicket(payload);
    const form = document.getElementById('contactForm');
    if (form) form.reset();

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Gửi tin nhắn';
    }

    const shortId = ticketId.length > 10 ? ticketId.substring(0, 8) : ticketId;
    showFeedback(
        'success',
        `PawPal đã nhận tin nhắn của bạn. Mã hỗ trợ: #${shortId}. Chúng tôi sẽ phản hồi sớm nhất.`
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
