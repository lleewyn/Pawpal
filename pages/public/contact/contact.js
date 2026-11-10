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
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
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
        subject: getValue('contactSubject'),
        serviceInterest,
        message
    };
}

function validatePayload(payload) {
    if (!payload.fullName) return 'Vui lòng nhập họ và tên.';
    const phone = payload.phoneNumber.replace(/[\s().-]/g, '').replace(/^(?:\+84|0084|84)/, '0');
    if (!/^0[35789]\d{8}$/.test(phone)) return 'Vui lòng nhập số điện thoại di động Việt Nam hợp lệ.';
    if (payload.subject.length < 2) return 'Vui lòng nhập tiêu đề.';
    if (!payload.message) return 'Vui lòng nhập lời nhắn.';
    return null;
}

let pendingContact;

async function hasMemberSession(client) {
    const session = await client?.auth.getSession();
    if (!session?.data?.session) return false;
    const {data,error} = await client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError' && ![400,401,403].includes(error.status)) {
        throw Error('Không kiểm tra được phiên đăng nhập. Vui lòng thử lại.');
    }
    return Boolean(!error && data?.user);
}

async function saveContactTicket(payload) {
    const client = window.getSupabaseClient?.() || window.SupabaseClient;
    if (!await hasMemberSession(client)) {
        const key = JSON.stringify(payload);
        if (pendingContact?.key !== key) pendingContact = {key, id:crypto.randomUUID(), proof:crypto.randomUUID()};
        const {id,proof} = pendingContact;
        const response = await fetch('/api/customer/guest/contact-ticket', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({...payload, requestId:id, proof})
        });
        const result = await response.json();
        if (!response.ok || !result.success || !result.ticketCode) {
            throw Error(result.message || 'Chưa xác nhận được yêu cầu. Vui lòng thử lại.');
        }
        pendingContact = null;
        let trackingUrl = null;
        try {
            sessionStorage.setItem('pawpal_guest_support_claim:' + id, proof);
            trackingUrl = '/user#support?claim=' + encodeURIComponent(id);
        } catch {}
        return {ticketCode:result.ticketCode, trackingUrl, guest:true};
    }
    const serviceMap = {
        spa: 'Spa và Grooming',
        hotel: 'Khách sạn thú cưng',
        taxi: 'Pet Taxi',
        other: 'Khác'
    };

    const title = payload.subject;
    const type = 'other';
    const content = `Họ tên: ${payload.fullName}
Số điện thoại: ${payload.phoneNumber}
Dịch vụ quan tâm: ${serviceMap[payload.serviceInterest] || 'Không chọn'}

Tin nhắn:
${payload.message}`;

    if (window.PawPalSupport && window.PawPalSupport.createTicket) {
        const result = await window.PawPalSupport.createTicket(title, type, content);
        if (!result?.id) throw Error('Chưa xác nhận được yêu cầu. Vui lòng thử lại.');
        return {ticketCode:result.id.slice(0,8), trackingUrl:'/user#support?id='+encodeURIComponent(result.id), guest:false};
    }

    throw Error('Chưa kết nối được hỗ trợ. Vui lòng thử lại.');
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
    if (submitBtn?.disabled) return;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Đang gửi...';
    }

    try {
        const result = await saveContactTicket(payload);
        document.getElementById('contactForm')?.reset();
        const receipt = document.getElementById('contactReceipt');
        if (receipt) {
            receipt.hidden = false;
            document.getElementById('contactReceiptCode').textContent = 'PawPal đã nhận yêu cầu. Mã hỗ trợ ' + result.ticketCode + '.';
            document.getElementById('contactReceiptHint').textContent = result.guest
                ? (result.trackingUrl ? 'Đăng nhập hoặc đăng ký bằng số điện thoại đã gửi để theo dõi yêu cầu trong mục Hỗ trợ. Hãy mở liên kết ở tab này.' : 'Hãy lưu mã hỗ trợ để liên hệ PawPal.')
                : 'Bạn có thể theo dõi phản hồi trong mục Hỗ trợ.';
            const link = document.getElementById('contactReceiptLink');
            link.hidden = !result.trackingUrl;
            if (result.trackingUrl) link.href = result.trackingUrl;
        } else {
            showFeedback('success', 'PawPal đã nhận yêu cầu. Mã hỗ trợ ' + result.ticketCode + '.');
        }
    } catch (error) {
        showFeedback('error', error.message || 'Chưa gửi được tin nhắn. Vui lòng thử lại.');
    } finally {
        if (submitBtn) {submitBtn.disabled=false;submitBtn.textContent='Gửi tin nhắn';}
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (form) {
        if(form.dataset.contactReady)return;
        form.dataset.contactReady='true';
        form.addEventListener('submit', handleSubmit);
    }

});
