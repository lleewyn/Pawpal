
window.PawpalStorage = {
    KEYS: {
        CURRENT_USER: 'pawpal_current_user',
        USERS_DB: 'pawpal_users_db',
        USERS_VERSION: 'pawpal_users_version',
        TEMP_TOKENS: 'pawpal_temp_tokens',
        PETS: 'pawpal_pets',
        BOOKINGS: 'pawpal_bookings',
        ORDERS: 'pawpal_orders'
    },
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return defaultValue;
            try {
                return JSON.parse(data);
            } catch (e) {
                return data;
            }
        } catch (e) {
            console.error(`[PawpalStorage] Error reading key "${key}":`, e);
            return defaultValue;
        }
    },
    set(key, value) {
        try {
            if (['pawpal_current_user', 'pawpal_users', 'pawpal_users_db'].includes(key)) {
                const clean = user => {
                    if (!user || typeof user !== 'object') return user;
                    const { password, password_hash, ...safe } = user;
                    return safe;
                };
                value = Array.isArray(value) ? value.map(clean) : clean(value);
            }
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`[PawpalStorage] Error writing key "${key}":`, e);
            return false;
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`[PawpalStorage] Error removing key "${key}":`, e);
        }
    }
};

const CURRENT_USER_KEY = window.PawpalStorage.KEYS.CURRENT_USER;

function getCurrentUser() {
    const user = window.PawpalStorage.get(CURRENT_USER_KEY);
    if (user && (user.system_role === 'ADMIN' || user.system_role === 'STAFF' || user.system_role === 'MANAGER' || user.role === 'admin' || user.role === 'staff')) {
        // Bảo vệ cô lập 2 chiều: Xóa tài khoản nhân viên nếu bị rò rỉ vào session khách
        window.PawpalStorage.remove(CURRENT_USER_KEY);
        try {
            sessionStorage.removeItem(CURRENT_USER_KEY);
        } catch(e) {}
        return null;
    }
    return user;
}

window.getCurrentUser = getCurrentUser;

function setCurrentUser(user) {
    if (user && (user.system_role === 'ADMIN' || user.system_role === 'STAFF' || user.system_role === 'MANAGER' || user.role === 'admin' || user.role === 'staff')) {
        console.warn('[auth] Chặn lưu tài khoản nhân sự/quản trị vào session khách hàng');
        return;
    }
    window.PawpalStorage.set(CURRENT_USER_KEY, user);
    document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
}

window.setCurrentUser = setCurrentUser;

async function logout() {
    const client = window.getSupabaseClient?.() || window.SupabaseClient;
    if (client) {
        const { error } = await client.auth.signOut();
        if (error) { console.error('[auth] Không thể đăng xuất:', error.message); return; }
    }
    window.PawpalStorage.remove(CURRENT_USER_KEY);
    try {
        sessionStorage.removeItem('pawpal_current_user');
        localStorage.removeItem('pawpal_cart');
        sessionStorage.removeItem('pawpal_cart');
    } catch(e) {}
    document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: null }));
    window.location.href = '/';
}

function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('[auth] Toast container not found');
        return;
    }

    const toastId = 'toast-' + Date.now();
    const icons  = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const titles = { success: 'Thành công', error: 'Lỗi', info: 'Thông báo', warning: 'Cảnh báo' };

    const toastHtml = `
        <div id="${toastId}" class="toast-custom toast-${type}">
            <span class="toast-icon">${icons[type] || 'ℹ'}</span>
            <div class="toast-content">
                <div class="toast-title">${titles[type] || 'Thông báo'}</div>
                <p class="toast-message">${message}</p>
            </div>
            <button type="button" class="toast-close" aria-label="Đóng">&times;</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);

    toastElement.offsetHeight;
    toastElement.classList.add('show');

    toastElement.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toastElement);
    });

    setTimeout(() => removeToast(toastElement), duration);
}

function removeToast(toastElement) {
    if (!toastElement) return;
    toastElement.classList.remove('show');
    toastElement.style.opacity = '0';
    toastElement.style.transform = 'translateX(100%)';
    setTimeout(() => toastElement.remove(), 300);
}

function showErrorBanner(message, parentForm) {
    const existingBanner = parentForm.querySelector('.auth-error-banner');
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement('div');
    banner.className = 'auth-error-banner';
    banner.innerHTML = message;
    parentForm.insertBefore(banner, parentForm.firstChild);

    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }, 7000);
}

function enforceTemporaryAccountLock() {
    const currentUser = getCurrentUser();
    const isTemp = currentUser && currentUser.is_temporary;

    const currentPath = window.location.pathname.toLowerCase();
    if (isTemp && (currentPath.includes('/pages/user/') || currentPath === '/user' || currentPath === '/user/')) {
        window.location.href = `/login?action=guest-activate&phone=${encodeURIComponent(currentUser.phone || '')}`;
        return;
    }

    document.addEventListener('headerInjected', () => applyLockingUI(isTemp));
    applyLockingUI(isTemp);
}

function applyLockingUI(isTemp) {
    if (!isTemp) return;

    const navLinks = document.querySelectorAll('.nav-menu a, .navbar-nav a, .auth-actions a, .header-actions a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        const isPublicPage = ['landing', 'services', 'booking', 'shop', 'about', 'blog', 'contact', 'login']
            .some(p => href.includes(p + '.html'));

        if (!isPublicPage && (href.includes('/user/') || href.includes('/admin/'))) {
            link.classList.add('nav-link-locked');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showLockedTooltip(link);
            });
        }
    });
}

let currentTooltip = null;
function showLockedTooltip(targetElement) {
    if (currentTooltip) currentTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'locked-tooltip-custom';
    tooltip.textContent = 'Hãy thiết lập mật khẩu ngay để trở thành thành viên của Pawpal, mở khóa các tính năng thú vị!';
    document.body.appendChild(tooltip);
    currentTooltip = tooltip;

    const rect = targetElement.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    tooltip.style.top  = `${rect.top + window.scrollY}px`;

    setTimeout(() => {
        if (currentTooltip === tooltip) {
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.3s ease';
            setTimeout(() => tooltip.remove(), 300);
        }
    }, 4000);
}

function showAdminToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 6000 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function initAdminQuickAddCustomer() {
    const btnQuickAdd = document.getElementById('btnAdminQuickAddCustomer');
    if (!btnQuickAdd) return;

    btnQuickAdd.addEventListener('click', () => {
        const modalEl = document.getElementById('adminQuickAddModal');
        if (modalEl) new bootstrap.Modal(modalEl).show();
    });

    const formQuickAdd = document.getElementById('adminQuickAddForm');
    if (!formQuickAdd) return;

    formQuickAdd.addEventListener('submit', (e) => {
        e.preventDefault();

        const name      = document.getElementById('qaName').value;
        const phone     = document.getElementById('qaPhone').value;
        const petName   = document.getElementById('qaPetName').value;
        const submitBtn = formQuickAdd.querySelector('button[type="submit"]');

        if (!name || !/^0[0-9]{9}$/.test(phone)) {
            alert('Họ tên và Số điện thoại 10 số (bắt đầu bằng 0) là bắt buộc.');
            return;
        }

        const origContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...`;

        setTimeout(() => {
            const users = getUsers();
            const existing = users.find(u => u.phone === phone);

            if (!existing) {
                users.push({
                    name,
                    phone,
                    role: 'customer',
                    is_temporary: true,
                    points: 0,
                    pet: {
                        name: petName,
                        species: document.getElementById('qaPetSpecies').value,
                        weight:  document.getElementById('qaPetWeight').value
                    }
                });
                saveUsers(users);
            }

            const token  = 'token-dynamic-' + Math.random().toString(36).substr(2, 9);
            const tokens = window.PawpalStorage.get(TEMP_TOKENS_KEY, []);
            tokens.push({ token, phone, createdAt: Date.now() });
            window.PawpalStorage.set(TEMP_TOKENS_KEY, tokens);

            showAdminToast(
                `Đã khởi tạo tài khoản tạm và gửi link SMS kích hoạt cho khách thành công!<br>` +
                `<a href="/pages/public/login/login.html?action=setup-password&token=${token}" target="_blank" style="color:var(--color-accent);font-weight:bold;">Mở liên kết kích hoạt (Simulated SMS Link)</a>`
            );

            submitBtn.disabled = false;
            submitBtn.innerHTML = origContent;

            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('adminQuickAddModal'));
            if (modalInstance) modalInstance.hide();
            formQuickAdd.reset();

            if (typeof renderAdminUsersList === 'function') renderAdminUsersList();
        }, 1000);
    });
}

function initAuthShared() {
    for (const storage of [localStorage, sessionStorage]) {
        for (const key of ['pawpal_current_user', 'pawpal_users', 'pawpal_users_db']) {
            try {
                const value = JSON.parse(storage.getItem(key));
                const clean = user => {
                    if (!user || typeof user !== 'object') return user;
                    const { password, password_hash, ...safe } = user;
                    return safe;
                };
                if (value) storage.setItem(key, JSON.stringify(Array.isArray(value) ? value.map(clean) : clean(value)));
            } catch {}
        }
    }
    enforceTemporaryAccountLock();
    initAdminQuickAddCustomer();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthShared);
} else {
    initAuthShared();
}
