
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

    function getStorageKey() {
        const u = getCurrentUser();
        return (u && u.id) ? `pawpal_notifications_${u.id}` : NOTI_KEY;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeHref(url) {
        if (!url || typeof url !== 'string') return '#';
        const trimmed = url.trim();
        if (/^(javascript|data):/i.test(trimmed)) {
            return '#';
        }
        return trimmed;
    }

    function readNotificationsSeed() {
        // Return empty array for production/real sessions, avoid synchronous XHR blocking
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
                isRead: Boolean(item.read),
                link: item.link || '#'
            };
        });
    }

    async function fetchNotificationsFromSupabase() {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.id || currentUser.is_temporary) return [];
            const db = window.SupabaseClient || (window.getSupabaseClient ? window.getSupabaseClient() : null);
            if (!db) return null;
            const { data, error } = await db.from('notification')
                .select('id, notification_type, title, content, is_read, sent_at, read_at, related_entity_type, sales_order_id, appointment_id, support_ticket_id, refund_transaction_id')
                .eq('customer_id', currentUser.id)
                .order('sent_at', { ascending: false })
                .limit(30);
            if (error) {
                console.warn('[notifications] Error fetching Supabase notices:', error.message);
                return null;
            }
            if (Array.isArray(data)) {
                return data.map(n => ({
                    id: n.id,
                    type: (n.notification_type || 'info').toLowerCase(),
                    title: n.title || 'Thông báo PawPal',
                    content: personalizeText(n.content || n.message || ''),
                    time: n.sent_at || n.created_at || new Date().toISOString(),
                    read: Boolean(n.is_read),
                    isRead: Boolean(n.is_read),
                    link: n.link || '#'
                }));
            }
        } catch(e) {
            console.warn('[notifications] Error fetching Supabase notices:', e);
        }
        return null;
    }

    const initialNotifications = hydrateSeedNotifications(readNotificationsSeed());

    function getNotifications() {
        const key = getStorageKey();
        try {
            const stored = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(stored)) {
                return stored;
            }
            if (key !== NOTI_KEY) {
                const legacy = JSON.parse(localStorage.getItem(NOTI_KEY));
                if (Array.isArray(legacy)) return legacy;
            }
            return [];
        } catch {
            return [];
        }
    }

    function saveNotifications(notis) {
        const key = getStorageKey();
        const dataStr = JSON.stringify(notis);
        localStorage.setItem(key, dataStr);
        localStorage.setItem(NOTI_KEY, dataStr);
        document.dispatchEvent(new CustomEvent('notifications_updated'));
    }

    let stopNotiRealtime = null;
    let lastNotiFetchTime = 0;

    function setupNotificationRealtime(db, customerId) {
        if (!db?.channel || !customerId) return;
        if (stopNotiRealtime) {
            try { stopNotiRealtime(); } catch (_) {}
            stopNotiRealtime = null;
        }
        let timer, disposed = false;
        const channelName = `customer-notis-${customerId}-${Math.random().toString(36).slice(2)}`;
        const channel = db.channel(channelName);
        channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notification',
            filter: `customer_id=eq.${customerId}`
        }, () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                if (!disposed) {
                    const freshNotis = await fetchNotificationsFromSupabase();
                    if (Array.isArray(freshNotis)) {
                        saveNotifications(freshNotis);
                    }
                }
            }, 300);
        });
        channel.subscribe();
        stopNotiRealtime = () => {
            disposed = true;
            clearTimeout(timer);
            try { db.removeChannel(channel); } catch (_) {}
        };
    }

    // Tự động đồng bộ từ Supabase Live DB khi tải trang và thiết lập Realtime
    async function syncNotificationsWithSupabase() {
        if (!canUseNotifications()) return;
        let attempts = 0;
        while (!window.SupabaseClient && !(window.getSupabaseClient && window.getSupabaseClient()) && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        const db = window.SupabaseClient || (window.getSupabaseClient ? window.getSupabaseClient() : null);
        const currentUser = getCurrentUser();
        if (db && currentUser?.id && !currentUser.is_temporary) {
            setupNotificationRealtime(db, currentUser.id);
        }
        const dbNotis = await fetchNotificationsFromSupabase();
        lastNotiFetchTime = Date.now();
        if (Array.isArray(dbNotis)) {
            saveNotifications(dbNotis);
        }
    }
    syncNotificationsWithSupabase();

    // Lắng nghe visibilitychange và focus: tự động cập nhật khi quay lại tab nếu quá 30s
    if (typeof document !== 'undefined') {
        const handleTabRevisit = async () => {
            if (document.visibilityState === 'visible' && canUseNotifications()) {
                if (Date.now() - lastNotiFetchTime > 30000) {
                    lastNotiFetchTime = Date.now();
                    const fresh = await fetchNotificationsFromSupabase();
                    if (Array.isArray(fresh)) saveNotifications(fresh);
                }
            }
        };
        document.addEventListener('visibilitychange', handleTabRevisit);
        if (typeof window !== 'undefined') {
            window.addEventListener('focus', handleTabRevisit);
        }

        document.addEventListener('auth_state_changed', (e) => {
            if (!e.detail) {
                if (stopNotiRealtime) {
                    try { stopNotiRealtime(); } catch (_) {}
                    stopNotiRealtime = null;
                }
            } else {
                syncNotificationsWithSupabase();
            }
        });
    }

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
        const unreadCount = notis.filter(n => !n.read && !n.isRead).length;

        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
                badge.textContent = '0';
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
            const safeLink = sanitizeHref(noti.link);
            item.href = safeLink;
            item.className = `notification-item-dropdown ${noti.read || noti.isRead ? '' : 'unread'}`;

            const relativeTime = getRelativeTimeString(new Date(noti.time));
            const safeTitle = escapeHtml(noti.title);
            const safeContent = escapeHtml(noti.content);
            item.innerHTML = `
                ${noti.read || noti.isRead ? '' : '<span class="unread-dot"></span>'}
                <span class="item-content">
                    <span class="item-title">${safeTitle}</span>
                    <span class="item-text">${safeContent}</span>
                    <span class="item-time">${relativeTime}</span>
                </span>
            `;

            item.addEventListener('click', (e) => {
                e.preventDefault();
                markAsRead(noti.id);
                if (safeLink && safeLink !== '#' && safeLink !== '') {
                    window.location.href = safeLink;
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
                    <p class="toast-message">${escapeHtml(message)}</p>
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

    async function markAllAsRead() {
        const notis = getNotifications();
        notis.forEach(n => { n.read = true; n.isRead = true; });
        saveNotifications(notis);
        updateHeaderDropdown();

        const currentUser = getCurrentUser();
        const db = window.SupabaseClient || (window.getSupabaseClient ? window.getSupabaseClient() : null);
        if (db && currentUser?.id) {
            try {
                await db.from('notification')
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .eq('customer_id', currentUser.id)
                    .eq('is_read', false);
            } catch (err) {
                console.warn('[notifications] markAllAsRead db update error:', err);
            }
        }
    }

    async function markAsRead(id) {
        const notis = getNotifications();
        const item = notis.find(n => String(n.id) === String(id));
        if (!item) return;
        item.read = true;
        item.isRead = true;
        saveNotifications(notis);
        updateHeaderDropdown();

        const db = window.SupabaseClient || (window.getSupabaseClient ? window.getSupabaseClient() : null);
        if (db && id && !String(id).startsWith('seed-') && !String(id).startsWith('local-')) {
            try {
                await db.from('notification')
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .eq('id', id);
            } catch (err) {
                console.warn('[notifications] markAsRead db update error:', err);
            }
        }
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
