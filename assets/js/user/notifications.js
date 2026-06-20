 * notifications.js — Quản lý tương tác UI trên trang cài đặt thông báo của khách hàng
    */

document.addEventListener('DOMContentLoaded', () => {
    let deletedQueue = null; // Hàng đợi lưu thông báo vừa xóa để Undo
    let undoTimeout = null;

    // Xử lý chuyển tab
    const tabBtns = document.querySelectorAll('.notifications-tab-btn');
    const panels = document.querySelectorAll('.notification-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
        });
    });

    // Nạp cấu hình riêng tư
    const config = window.PawPalNotifications.getConfig();
    document.getElementById('prefOrder').checked = config.order;
    document.getElementById('prefPromo').checked = config.promo;
    document.getElementById('prefSms').checked = config.sms;

    // Lưu cấu hình riêng tư
    document.getElementById('btnSaveConfig').addEventListener('click', () => {
        const newConfig = {
            service: true, // Bắt buộc
            order: document.getElementById('prefOrder').checked,
            promo: document.getElementById('prefPromo').checked,
            sms: document.getElementById('prefSms').checked
        };
        window.PawPalNotifications.saveConfig(newConfig);

        // Show toast thông báo lưu thành công
        showNotificationPageToast('Đã lưu cấu hình riêng tư thành công!');
    });

    function showNotificationPageToast(message, actionText = null, actionCallback = null) {
        const container = document.getElementById('toastContainer') || document.body;
        let toast = document.createElement('div');
        toast.className = 'toast show';
        toast.style.borderLeft = '4px solid var(--color-success)';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.zIndex = '10005';
        toast.style.background = 'var(--color-bg-white)';
        toast.style.boxShadow = 'var(--shadow-card-hover)';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = 'var(--card-border-radius)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '16px';
        toast.style.minWidth = '280px';

        toast.innerHTML = `
            <div style="flex-grow: 1; font-size: var(--fs-body); color: var(--color-text-dark);">${message}</div>
            ${actionText ? `<button class="btn-undo-toast" style="background: none; border: none; color: var(--color-primary); font-weight: 700; text-decoration: underline; cursor: pointer; padding: 0;">${actionText}</button>` : ''}
        `;

        container.appendChild(toast);

        if (actionText && actionCallback) {
            toast.querySelector('.btn-undo-toast').addEventListener('click', () => {
                actionCallback();
                toast.remove();
            });
        }

        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // Render danh sách thông báo trên trang
    function renderPageList() {
        const notis = window.PawPalNotifications.get();
        const listContainer = document.getElementById('pageNotificationsList');
        const emptyMsg = document.getElementById('emptyNotificationsMessage');

        if (notis.length === 0) {
            listContainer.innerHTML = '';
            emptyMsg.style.display = 'block';
            return;
        }

        emptyMsg.style.display = 'none';
        listContainer.innerHTML = '';

        // Sắp xếp thời gian mới nhất
        const sortedNotis = [...notis].sort((a, b) => new Date(b.time) - new Date(a.time));

        sortedNotis.forEach(noti => {
            const item = document.createElement('div');
            item.className = `notification-page-item ${noti.read ? '' : 'unread'}`;
            item.id = `page-noti-${noti.id}`;

            let iconSvg = '';
            if (noti.type === 'service') {
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V6c0-.5.5-1 1-1Z"/><path d="M19 8c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1Z"/><path d="M5 8c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1Z"/><path d="M12 12c-2.2 0-4 1.8-4 4 0 1.5 1.5 3 4 3s4-1.5 4-3c0-2.2-1.8-4-4-4Z"/></svg>`;
            } else if (noti.type === 'order') {
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
            } else {
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
            }

            const formattedTime = new Date(noti.time).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

            item.innerHTML = `
                ${noti.read ? '' : '<span class="unread-dot-large"></span>'}
                <div class="item-icon" style="color: var(--color-primary); background: var(--color-primary-light); padding: 10px; border-radius: 50%; display: flex; align-items: center; justify-content: center; height: 44px; width: 44px; flex-shrink: 0;">
                    ${iconSvg}
                </div>
                <div class="item-main-content">
                    <div class="item-title-row">
                        <h5 class="item-title">${noti.title}</h5>
                        <span style="font-size: var(--fs-caption); color: var(--color-text-light);">${formattedTime}</span>
                    </div>
                    <p class="item-body">${noti.content}</p>
                </div>
                <button class="btn-delete-item" data-id="${noti.id}" title="Xóa thông báo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            // Click item để đọc & điều hướng
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-item')) return;
                noti.read = true;
                window.PawPalNotifications.save(notis);
                window.location.href = noti.link;
            });

            // Xóa thông báo
            item.querySelector('.btn-delete-item').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNoti(noti.id);
            });

            listContainer.appendChild(item);
        });
    }

    // Cơ chế xóa & hoàn tác trong 3 giây
    function deleteNoti(id) {
        const notis = window.PawPalNotifications.get();
        const targetIdx = notis.findIndex(n => n.id === id);
        if (targetIdx === -1) return;

        // Lưu vào hàng đợi hoãn xóa
        deletedQueue = {
            item: notis[targetIdx],
            index: targetIdx
        };

        // Xóa khỏi UI và localStorage
        notis.splice(targetIdx, 1);
        window.PawPalNotifications.save(notis);
        renderPageList();

        // Hiện Toast thông báo kèm nút Hoàn tác
        showNotificationPageToast('Đã xóa thông báo.', 'Hoàn tác', () => {
            if (deletedQueue) {
                const currentNotis = window.PawPalNotifications.get();
                currentNotis.splice(deletedQueue.index, 0, deletedQueue.item);
                window.PawPalNotifications.save(currentNotis);
                deletedQueue = null;
                clearTimeout(undoTimeout);
                renderPageList();
            }
        });

        // Clear queue sau 3 giây
        clearTimeout(undoTimeout);
        undoTimeout = setTimeout(() => {
            deletedQueue = null;
        }, 3000);
    }

    // Đọc tất cả
    document.getElementById('btnPageMarkAllRead').addEventListener('click', () => {
        window.PawPalNotifications.markAllAsRead();
        renderPageList();
    });

    // Lắng nghe sự kiện để re-render
    document.addEventListener('notifications_updated', renderPageList);

    renderPageList();
});
