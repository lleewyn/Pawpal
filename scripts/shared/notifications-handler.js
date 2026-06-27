/**
 * notifications-handler.js - Quan ly thong bao va su kien thoi gian thuc
 */

(function () {
    const NOTI_KEY = 'pawpal_notifications';
    const NOTI_SEED_URL = '/data/notifications.json';

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        } catch {
            return null;
        }
    }

    function canUseNotifications() {
        const user = getCurrentUser();
        return Boolean(user && !user.is_temporary);
    }

    if (!canUseNotifications()) {
        window.PawPalNotificationsReady = false;
        return;
    }

    function readNotificationsSeed() {
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', NOTI_SEED_URL, false);
            xhr.send(null);
            if (xhr.status >= 200 && xhr.status < 300) {
                return JSON.parse(xhr.responseText);
            }
        } catch (error) {
            console.warn('[notifications] Cannot load seed data:', error);
        }
        return [];
    }

    function getPetName() {
        try {
            const pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
            if (Array.isArray(pets) && pets.length > 0) {
                return pets[0].name;
            }
        } catch (_) {}
        return null;
    }

    function personalizeText(text) {
        const petName = getPetName() || 'Bé yêu của bạn';
        return String(text || '').replace(/\[Tên Bé\]/g, petName);
    }

    function hydrateSeedNotifications(seedItems) {
        return (Array.isArray(seedItems) ? seedItems : []).map(item => {
            const minutesAgo = Number(item.timeOffsetMinutes || 0);
            const time = item.time || new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
            return {
                id: item.id,
                type: item.type || 'info',
                title: item.title || '',
                content: personalizeText(item.content || ''),
                time,
                read: Boolean(item.read),
                link: item.link || '#'
            };
        });
    }

    const initialNotifications = hydrateSeedNotifications(readNotificationsSeed());

    function getNotifications() {
        try {
            const stored = JSON.parse(localStorage.getItem(NOTI_KEY));
            if (Array.isArray(stored) && stored.length > 0) {
                return stored;
            }

            localStorage.setItem(NOTI_KEY, JSON.stringify(initialNotifications));
            return initialNotifications;
        } catch {
            localStorage.setItem(NOTI_KEY, JSON.stringify(initialNotifications));
            return initialNotifications;
        }
    }

    function saveNotifications(notis) {
        localStorage.setItem(NOTI_KEY, JSON.stringify(notis));
        document.dispatchEvent(new CustomEvent('notifications_updated'));
    }

    function getRelativeTimeString(date) {
        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    }

    function updateHeaderDropdown() {
        const notis = getNotifications();
        const unreadCount = notis.filter(n => !n.read).length;

        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        const listContainer = document.getElementById('headerNotificationList');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (notis.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: var(--space-md); text-align: center; color: var(--color-text-light); font-size: var(--fs-small);">
                    Bạn không có thông báo mới nào.
                </div>
            `;
            return;
        }

        const sortedNotis = [...notis].sort((a, b) => new Date(b.time) - new Date(a.time));

        sortedNotis.forEach(noti => {
            const item = document.createElement('a');
            item.href = noti.link || '#';
            item.className = `notification-item-dropdown ${noti.read ? '' : 'unread'}`;

            let iconSvg = '';
            if (noti.type === 'service') {
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V6c0-.5.5-1 1-1Z"/><path d="M19 8c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1Z"/><path d="M5 8c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1Z"/><path d="M12 12c-2.2 0-4 1.8-4 4 0 1.5 1.5 3 4 3s4-1.5 4-3c0-2.2-1.8-4-4-4Z"/></svg>`;
            } else if (noti.type === 'order') {
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
            } else {
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
            }

            const relativeTime = getRelativeTimeString(new Date(noti.time));
            item.innerHTML = `
                ${noti.read ? '' : '<span class="unread-dot"></span>'}
                <span class="item-icon" style="color: var(--color-primary);">${iconSvg}</span>
                <span class="item-content">
                    <span class="item-title">${noti.title}</span>
                    <span class="item-text">${noti.content}</span>
                    <span class="item-time">${relativeTime}</span>
                </span>
            `;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                noti.read = true;
                saveNotifications(notis);
                window.location.href = noti.link;
            });

            listContainer.appendChild(item);
        });
    }

    function ensureToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container-custom';
            document.body.appendChild(container);
        }
        return container;
    }

    function showToast(type, message, duration = 5000) {
        const container = ensureToastContainer();
        const toastId = 'noti-toast-' + Date.now();
        const titleMap = {
            success: 'Thành công',
            error: 'Lỗi',
            info: 'Thông báo',
            warning: 'Cảnh báo'
        };

        const toastHtml = `
            <div id="${toastId}" class="toast-custom toast-${type}">
                <span class="toast-content">
                    <div class="toast-title">${titleMap[type] || 'Thông báo'}</div>
                    <p class="toast-message">${message}</p>
                </span>
                <button type="button" class="toast-close" aria-label="Đóng">&times;</button>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        if (!toastElement) return;

        // Trigger animation to show the toast
        requestAnimationFrame(() => {
            toastElement.classList.add('show');
        });

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

    function markAllAsRead() {
        const notis = getNotifications();
        notis.forEach(n => (n.read = true));
        saveNotifications(notis);
        updateHeaderDropdown();
    }

    function markAsRead(id) {
        const notis = getNotifications();
        const item = notis.find(n => n.id === id);
        if (!item) return;
        item.read = true;
        saveNotifications(notis);
        updateHeaderDropdown();
    }

    function deleteNotification(id) {
        // Hiện confirm trước khi xóa (spec: "hỏi xác nhận một lần")
        const confirmId = 'noti-delete-confirm-modal';
        const existing = document.getElementById(confirmId);
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.id = confirmId;
        el.className = 'modal fade';
        el.tabIndex = -1;
        el.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Xóa thông báo</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Bạn có chắc chắn muốn xóa thông báo này không?</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn-danger-outline" id="noti-delete-confirm-btn">Xóa</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);

        const modal = typeof bootstrap !== 'undefined'
            ? new bootstrap.Modal(el)
            : null;
        modal ? modal.show() : el.style.display = 'block';

        document.getElementById('noti-delete-confirm-btn').addEventListener('click', () => {
            modal ? modal.hide() : el.remove();
            const notis = getNotifications().filter(n => n.id !== id);
            saveNotifications(notis);
            updateHeaderDropdown();
        });
    }

    function clearAllNotifications() {
        const confirmId = 'noti-clear-confirm-modal';
        const existing = document.getElementById(confirmId);
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.id = confirmId;
        el.className = 'modal fade';
        el.tabIndex = -1;
        el.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Xóa tất cả thông báo</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Bạn có chắc chắn muốn xóa toàn bộ thông báo không? Thao tác này không thể hoàn tác.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn-danger-outline" id="noti-clear-confirm-btn">Xóa tất cả</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);

        const modal = typeof bootstrap !== 'undefined'
            ? new bootstrap.Modal(el)
            : null;
        modal ? modal.show() : el.style.display = 'block';

        document.getElementById('noti-clear-confirm-btn').addEventListener('click', () => {
            modal ? modal.hide() : el.remove();
            saveNotifications([]);
            updateHeaderDropdown();
        });
    }

    window.PawPalNotifications = {
        getNotifications,
        saveNotifications,
        updateHeaderDropdown,
        markAllAsRead,
        markAsRead,
        deleteNotification,
        clearAllNotifications,
        showToast
    };
    window.PawPalNotificationsReady = true;

    document.addEventListener('DOMContentLoaded', updateHeaderDropdown);
    document.addEventListener('notifications_updated', updateHeaderDropdown);
})();
