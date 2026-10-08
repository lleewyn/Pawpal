
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

    async function fetchNotificationsFromSupabase() {
        try {
            const db = window.SupabaseClient || (window.getSupabaseClient ? window.getSupabaseClient() : null);
            if (!db) return null;
            const { data, error } = await db.from('notification')
                .select('*')
                .order('sent_at', { ascending: false });
            if (error) return null;
            if (data && data.length > 0) {
                return data.map(n => ({
                    id: n.id,
                    type: (n.notification_type || 'info').toLowerCase(),
                    title: n.title || 'Thông báo PawPal',
                    content: personalizeText(n.content || n.message || ''),
                    time: n.sent_at || n.created_at || new Date().toISOString(),
                    read: Boolean(n.is_read),
                    link: n.target_url || n.link || '#'
                }));
            }
        } catch(e) {
            console.warn('[notifications] Error fetching Supabase notices:', e);
        }
        return null;
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

    // Tự động đồng bộ từ Supabase Live DB khi tải trang
    (async function initSupabaseNotis() {
        let attempts = 0;
        while (!window.SupabaseClient && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        const dbNotis = await fetchNotificationsFromSupabase();
        if (dbNotis && dbNotis.length > 0) {
            saveNotifications(dbNotis);
        }
    })();

    function getRelativeTimeString(date) {
        if (!date || isNaN(date.getTime())) return '';
        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour} giờ trước`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay} ngày trước`;
        
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
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

            const relativeTime = getRelativeTimeString(new Date(noti.time));
            item.innerHTML = `
                ${noti.read ? '' : '<span class="unread-dot"></span>'}
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
                if (noti.link && noti.link !== '#' && noti.link !== '') {
                    window.location.href = noti.link;
                } else if (typeof window.openAllNotificationsModal === 'function') {
                    window.openAllNotificationsModal(noti);
                }
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
