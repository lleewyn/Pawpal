/**
 * auth.js — Shared authentication core của PawPal.
 * Chứa: database helpers, session management, toast/banner UI,
 * session protection cho tài khoản tạm.
 *
 * Logic UI riêng của trang login (form, OTP, routing) nằm trong:
 * → /pages/public/login/login.js
 */

// --- 0. CENTRALIZED STORAGE HELPER ---
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
                // If it's not valid JSON, it might just be a raw string
                return data;
            }
        } catch (e) {
            console.error(`[PawpalStorage] Error reading key "${key}":`, e);
            return defaultValue;
        }
    },
    set(key, value) {
        try {
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

// --- 1. MOCK DATABASE SETUP ---
const PAWPAL_USERS_KEY    = window.PawpalStorage.KEYS.USERS_DB;
const CURRENT_USER_KEY    = window.PawpalStorage.KEYS.CURRENT_USER;
const TEMP_TOKENS_KEY     = window.PawpalStorage.KEYS.TEMP_TOKENS;
const TEMP_TOKENS_URL     = '/data/temp-tokens.json';
const PAWPAL_USERS_VERSION = 'v7'; // Tăng khi users.json thay đổi

function resolveFromAuthScript(path) {
    const scriptSrc = document.currentScript?.src || document.querySelector('script[src*="scripts/shared/auth.js"]')?.src;
    return new URL(path, scriptSrc || window.location.href).href;
}

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
    if (localStorage.getItem(window.PawpalStorage.KEYS.USERS_VERSION) !== PAWPAL_USERS_VERSION) {
        // Backup currentUser trước khi xóa DB — tránh mất trạng thái đăng nhập
        const currentUserBackup = window.PawpalStorage.get(CURRENT_USER_KEY);

        window.PawpalStorage.remove(PAWPAL_USERS_KEY);
        window.PawpalStorage.remove(TEMP_TOKENS_KEY);
        localStorage.setItem(window.PawpalStorage.KEYS.USERS_VERSION, PAWPAL_USERS_VERSION);

        // Restore currentUser sau khi xóa DB
        if (currentUserBackup) {
            window.PawpalStorage.set(CURRENT_USER_KEY, currentUserBackup);
        }
    }

    if (!localStorage.getItem(PAWPAL_USERS_KEY)) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', resolveFromAuthScript('../../data/users.json'), false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 300) {
                // Merge seed với currentUser để không ghi đè trạng thái user đã kích hoạt
                const seedUsers = JSON.parse(xhr.responseText) || [];
                const currentUser = window.PawpalStorage.get(CURRENT_USER_KEY);
                if (currentUser && currentUser.phone) {
                    const idx = seedUsers.findIndex(u => u.phone === currentUser.phone);
                    if (idx !== -1) {
                        // Local (currentUser) thắng seed cho các field user-action
                        seedUsers[idx] = { ...seedUsers[idx], ...currentUser };
                    }
                }
                window.PawpalStorage.set(PAWPAL_USERS_KEY, seedUsers);
            }
        } catch (error) {
            console.warn('[auth] Cannot load /data/users.json:', error);
        }
    }

    if (!localStorage.getItem(TEMP_TOKENS_KEY)) {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', resolveFromAuthScript('../../data/temp-tokens.json'), false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 300) {
                window.PawpalStorage.set(TEMP_TOKENS_KEY, xhr.responseText);
            }
        } catch (error) {
            console.warn('[auth] Cannot load /data/temp-tokens.json:', error);
        }
    }
}

// --- CRUD helpers ---
function getUsers() {
    const users = window.PawpalStorage.get(PAWPAL_USERS_KEY, []);
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
    window.PawpalStorage.set(PAWPAL_USERS_KEY, users);
}

function reconcileUserSession(user, users) {
    if (!user) return null;

    const sameIdentityUsers = (users || []).filter((candidate) => {
        if (user.id && candidate.id && String(candidate.id) === String(user.id)) return true;
        if (user.phone && candidate.phone && String(candidate.phone) === String(user.phone)) return true;
        return false;
    });

    if (!sameIdentityUsers.length) return user;

    const preferredUser = sameIdentityUsers.find((candidate) => !candidate.is_temporary) || sameIdentityUsers[0];
    return { ...preferredUser, ...user, is_temporary: Boolean(preferredUser.is_temporary) };
}

function getCurrentUser() {
    const rawUser = window.PawpalStorage.get(CURRENT_USER_KEY);
    const users = getUsers();
    const user = reconcileUserSession(rawUser, users);

    if (user && JSON.stringify(user) !== JSON.stringify(rawUser)) {
        window.PawpalStorage.set(CURRENT_USER_KEY, user);
    }

    if (user && !user.id) {
        user.id = generateUserId();
        window.PawpalStorage.set(CURRENT_USER_KEY, user);

        const idx = users.findIndex(u => u.phone === user.phone);
        if (idx !== -1) {
            users[idx] = user;
            saveUsers(users);
        }
    }
    return user;
}

window.getCurrentUser = getCurrentUser;

function setCurrentUser(user) {
    window.PawpalStorage.set(CURRENT_USER_KEY, user);
    document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
}

window.setCurrentUser = setCurrentUser;

function logout() {
    window.PawpalStorage.remove(CURRENT_USER_KEY);
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

    // Force reflow and trigger animation to show the toast
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
        const tokens = window.PawpalStorage.get(TEMP_TOKENS_KEY, []);
        let tokenObj = tokens.find(t => t.phone === currentUser.phone);
        if (!tokenObj) {
            tokenObj = {
                token: 'token-dynamic-' + Math.random().toString(36).substr(2, 9),
                phone: currentUser.phone,
                createdAt: Date.now()
            };
            tokens.push(tokenObj);
            window.PawpalStorage.set(TEMP_TOKENS_KEY, tokens);
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

            // Tạo token kích hoạt tài khoản
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
