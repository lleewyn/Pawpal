function currentMember() {
    try {
        const user = typeof window.getCurrentUser === 'function'
            ? window.getCurrentUser()
            : JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        return user?.id && !user.is_temporary ? user : null;
    } catch { return null; }
}

export function showCartNotice(message) {
    let container = document.getElementById('cart-feedback-toast');
    if (!container) {
        container = document.createElement('div');
        container.id = 'cart-feedback-toast';
        container.className = 'toast-container-custom';
        container.style.zIndex = '11010';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast-custom show';
    toast.setAttribute('role', 'alert');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

export function ensureCartAccess() {
    if (currentMember()) return true;

    // SPA navigation can leave the Shop quantity dialog attached to body.
    document.querySelectorAll('#buyNowQuantityModal, #landingBuyNowQuantityModal').forEach(modal => {
        modal.hidden = true;
    });
    document.body.classList.remove('buy-now-modal-open');
    if (window.pawpalCartLoginRedirect) return false;

    let container = document.getElementById('cart-login-toast');
    if (!container) {
        container = document.createElement('div');
        container.id = 'cart-login-toast';
        container.className = 'toast-container-custom';
        container.style.zIndex = '11010';
        const toast = document.createElement('div');
        toast.className = 'toast-custom show';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.textContent = 'Vui lòng đăng nhập để xem giỏ hàng';
        container.appendChild(toast);
        document.body.appendChild(container);
    }
    window.pawpalCartLoginRedirect = setTimeout(() => {
        window.pawpalCartLoginRedirect = null;
        container.remove();
        const onCartPage = /^\/(?:cart\/?|pages\/shop\/cart\/cart(?:\.html)?\/?)$/.test(window.location.pathname);
        if (onCartPage && !currentMember()) window.location.assign('/login');
    }, 1500);
    return false;
}
