/**
 * auth.js — Shared authentication core của PawPal.
 * Chứa: database helpers, session management, toast/banner UI,
 * session protection cho tài khoản tạm.
 *
 * Logic UI riêng của trang login (form, OTP, routing) nằm trong:
 * → /pages/public/login/login.js
 */

// --- 1. MOCK DATABASE SETUP ---
const PAWPAL_USERS_KEY    = 'pawpal_users_db';
const CURRENT_USER_KEY    = 'pawpal_current_user';
const TEMP_TOKENS_KEY     = 'pawpal_temp_tokens';
const TEMP_TOKENS_URL     = '/data/temp-tokens.json';
const PAWPAL_USERS_VERSION = 'v5'; // Tăng khi users.json thay đổi

// --- ID helpers ---
function generateUserId() {
    return `USER-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function ensureUserId(user) {
    if (!user.id) {
        user.id = generateUserId();
    }
    return user;
}

// --- Database init ---
function initMockDatabase() {
    // Force re-seed nếu version cũ hơn
    if (localStorage.getItem('pawpal_users_version') !== PAWPAL_USERS_VERSION) {
        localStorage.removeItem(PAWPAL_USERS_KEY);
        localStorage.removeItem(TEMP_TOKENS_KEY);
        localStorage.setItem('pawpal_users_version', PAWPAL_USERS_VERSION);
    }

    if (!localStorage.getItem(PAWPAL_USERS_KEY)) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '/data/users.json', false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 300) {
                localStorage.setItem(PAWPAL_USERS_KEY, xhr.responseText);
            }
        } catch (error) {
            console.warn('[auth] Cannot load /data/users.json:', error);
        }
    }

    if (!localStorage.getItem(TEMP_TOKENS_KEY)) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', TEMP_TOKENS_URL, false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 300) {
                localStorage.setItem(TEMP_TOKENS_KEY, xhr.responseText);
            }
        } catch (error) {
            console.warn('[auth] Cannot load /data/temp-tokens.json:', error);
        }
    }
}

// --- CRUD helpers ---
function getUsers() {
    const users = JSON.parse(localStorage.getItem(PAWPAL_USERS_KEY)) || [];
    let updated = false;

    users.forEach(user => {
        if (!user.id) {
            user.id = generateUserId();
            updated = true;
        }
    });

    if (updated) saveUsers(users);
    return users;
}

function saveUsers(users) {
    localStorage.setItem(PAWPAL_USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
    if (user && !user.id) {
        user.id = generateUserId();
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

        const users = getUsers();
        const idx = users.findIndex(u => u.phone === user.phone);
        if (idx !== -1) {
            users[idx] = user;
            saveUsers(users);
        }
    }
    return user;
}

function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
}

function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = '/pages/public/landing/landing.html';
}

// --- 2. TOAST NOTIFICATION SYSTEM ---
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

    toastElement.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toastElement);
    });

    setTimeout(() => removeToast(toastElement), duration);
}

function removeToast(toastElement) {
    toastElement.style.opacity = '0';
    toastElement.style.transform = 'translateX(100%)';
    setTimeout(() => toastElement.remove(), 300);
}

// --- ERROR BANNER DISPLAY ---
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

// --- 3. SESSION PROTECTION — KHÓA TÀI KHOẢN TẠM (US 1-2) ---
function enforceTemporaryAccountLock() {
    const currentUser = getCurrentUser();
    const isTemp = currentUser && currentUser.is_temporary;

    // Tài khoản tạm truy cập thẳng vào trang /user/ → đẩy ra ngoài
    const currentPath = window.location.pathname.toLowerCase();
    if (isTemp && currentPath.includes('/pages/user/')) {
        const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
        let tokenObj = tokens.find(t => t.phone === currentUser.phone);
        if (!tokenObj) {
            tokenObj = {
                token: 'token-dynamic-' + Math.random().toString(36).substr(2, 9),
                phone: currentUser.phone,
                createdAt: Date.now()
            };
            tokens.push(tokenObj);
            localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));
        }
        window.location.href = `/pages/public/login/login.html?action=setup-password&token=${tokenObj.token}`;
        return;
    }

    // Chờ header inject xong để khóa nav links
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

// --- ADMIN TOAST (dùng trong admin quick-add) ---
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

// --- 4. ADMIN QUICK ADD CUSTOMER (US 1-3) ---
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

            // Tạo token kích hoạt mật khẩu
            const token  = 'token-dynamic-' + Math.random().toString(36).substr(2, 9);
            const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
            tokens.push({ token, phone, createdAt: Date.now() });
            localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));

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

// --- 5. SHARED INIT (dùng cho mọi trang, không phải login) ---
function initAuthShared() {
    initMockDatabase();
    enforceTemporaryAccountLock();
    initAdminQuickAddCustomer();
}

// Chạy shared init trên mọi trang
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthShared);
} else {
    initAuthShared();
}
