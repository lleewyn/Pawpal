/**
 * notifications-handler.js — Quản lý dữ liệu thông báo và sự kiện thời gian thực
 */

(function () {
    const NOTI_KEY = 'pawpal_notifications';
    const CONFIG_KEY = 'pawpal_notification_config';

    // Dữ liệu mẫu ban đầu nếu localStorage chưa có
    const initialNotifications = [
        {
            id: 'noti-1',
            type: 'service', // service, order, promo
            title: 'Dịch vụ của bé',
            content: 'Bé Bông đã tắm xong và đang chơi ở khu vực chờ nhé!',
            time: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 phút trước
            read: false,
            link: '/pages/user/pet-diary.html'
        },
        {
            id: 'noti-2',
            type: 'order',
            title: 'Cập nhật đơn hàng',
            content: 'Đơn hàng #ORD-2026 của bạn đã được bàn giao cho đơn vị vận chuyển.',
            time: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 phút trước
            read: false,
            link: '/pages/user/orders.html'
        },
        {
            id: 'noti-3',
            type: 'promo',
            title: 'Ưu đãi đặc quyền',
            content: 'PawPal gửi tặng bạn mã giảm giá 15% dịch vụ Hotel nhân dịp sinh nhật bé cưng!',
            time: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 giờ trước
            read: true,
            link: '/pages/user/loyalty.html'
        }
    ];

    const defaultConfig = {
        service: true,
        order: true,
        promo: true,
        sms: true
    };

    function getNotifications() {
        try {
            return JSON.parse(localStorage.getItem(NOTI_KEY)) || initialNotifications;
        } catch {
            return initialNotifications;
        }
    }

    function saveNotifications(notis) {
        localStorage.setItem(NOTI_KEY, JSON.stringify(notis));
        // Phát sự kiện toàn cục để cập nhật UI trên các trang khác
        document.dispatchEvent(new CustomEvent('notifications_updated'));
    }

    function getConfig() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG_KEY)) || defaultConfig;
        } catch {
            return defaultConfig;
        }
    }

    function saveConfig(config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    // Lấy tên bé cưng hiện tại của user để cá nhân hóa
    function getPetName() {
        try {
            const pets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
            if (pets && pets.length > 0) {
                return pets[0].name;
            }
        } catch (e) { }
        return null;
    }

    // Cập nhật số lượng Badge & UI Dropdown ở Header
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
        if (listContainer) {
            listContainer.innerHTML = '';
            if (notis.length === 0) {
                listContainer.innerHTML = `
                    <div style="padding: var(--space-md); text-align: center; color: var(--color-text-light); font-size: var(--fs-small);">
                        Bạn không có thông báo mới nào.
                    </div>
                `;
                return;
            }

            // Sắp xếp theo thời gian mới nhất
            const sortedNotis = [...notis].sort((a, b) => new Date(b.time) - new Date(a.time));

            sortedNotis.forEach(noti => {
                const item = document.createElement('a');
                item.href = noti.link || '#';
                item.className = `notification-item-dropdown ${noti.read ? '' : 'unread'}`;

                // SVG Icons tối giản tùy theo phân loại
                let iconSvg = '';
                if (noti.type === 'service') {
                    // Dấu chân thú cưng
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V6c0-.5.5-1 1-1Z"/><path d="M19 8c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1Z"/><path d="M5 8c.5 0 1 .5 1 1v2c0 .5-.5 1-1 1s-1-.5-1-1V9c0-.5.5-1 1-1Z"/><path d="M12 12c-2.2 0-4 1.8-4 4 0 1.5 1.5 3 4 3s4-1.5 4-3c0-2.2-1.8-4-4-4Z"/></svg>`;
                } else if (noti.type === 'order') {
                    // Giỏ hàng
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
                } else {
                    // Ưu đãi / Loyalty
                    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
                }

                // Tính thời gian hiển thị tương đối gọn
                const relativeTime = getRelativeTimeString(new Date(noti.time));

                item.innerHTML = `
                    ${noti.read ? '' : '<span class="unread-dot"></span>'}
                    <span class="item-icon" style="color: var(--color-primary);">${iconSvg}</span>
                    <span class="item-content">
                        <span class="item-text" style="font-weight: ${noti.read ? '500' : '700'};">${noti.content}</span>
                        <span class="item-time">${relativeTime}</span>
                    </span>
                `;

                // Xử lý sự kiện click để đánh dấu đã đọc trước khi điều hướng
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    noti.read = true;
                    saveNotifications(notis);
                    window.location.href = noti.link;
                });

                listContainer.appendChild(item);
            });
        }
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

    // Đăng ký Toast Container nếu chưa có
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

    // Hiển thị Toast thông báo đẩy trượt góc phải
    function showPushToast(noti) {
        const container = ensureToastContainer();
        const toast = document.createElement('div');
        toast.className = 'toast show';

        let borderLeftColor = 'var(--color-success)';
        if (noti.type === 'service') borderLeftColor = 'var(--color-primary)';
        if (noti.type === 'promo') borderLeftColor = 'var(--color-accent)';

        toast.style.borderLeft = `4px solid ${borderLeftColor}`;

        toast.innerHTML = `
            <div style="display: flex; gap: var(--space-xs); align-items: start;">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 700; color: var(--color-primary-dark); font-size: var(--fs-small); margin-bottom: 2px;">
                        ${noti.title.toUpperCase()}
                    </div>
                    <div style="font-size: var(--fs-body); color: var(--color-text-dark); line-height: 1.4;">
                        ${noti.content}
                    </div>
                </div>
                <button class="btn-close-toast" style="background: none; border: none; font-size: 1.1rem; color: var(--color-text-light); cursor: pointer; padding: 0; line-height: 1;">&times;</button>
            </div>
        `;

        container.appendChild(toast);

        // Đóng toast khi click nút X
        toast.querySelector('.btn-close-toast').addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });

        // Tự động ẩn sau 5 giây
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // Thêm thông báo mới với các ràng buộc nghiệp vụ
    function addNotification(type, title, content, link = '#') {
        const config = getConfig();

        // 1. Kiểm tra cấu hình riêng tư (US 14-4 Chặn thông báo Marketing)
        if (type === 'promo' && !config.promo) {
            console.log('Chặn thông báo tiếp thị do cấu hình riêng tư.');
            return;
        }

        // 2. Chặn thông báo tiếp thị ngoài giờ vàng (08:00 - 21:00) (US 14-5 / AC5.2)
        if (type === 'promo') {
            const currentHour = new Date().getHours();
            if (currentHour < 8 || currentHour >= 21) {
                console.log('Ngoài khung giờ vàng (08:00 - 21:00). Trì hoãn thông báo tiếp thị.');
                // Giả lập lưu vào queue gửi lại vào 8h sáng hôm sau
                return;
            }
        }

        // 3. Chặn trùng lặp nội dung trong vòng 5 phút (US 14-5 / AC5.3)
        const notis = getNotifications();
        const duplicate = notis.find(n => {
            const timeDiff = Date.now() - new Date(n.time).getTime();
            return n.content === content && timeDiff < 5 * 60 * 1000;
        });

        if (duplicate) {
            console.log('Hệ thống chặn gửi thông báo trùng lặp nội dung trong vòng 5 phút.');
            return;
        }

        // 4. Cá nhân hóa tên bé cưng hoặc fallback (US 14-1)
        let finalContent = content;
        const petName = getPetName();
        if (content.includes('[Tên Bé]')) {
            finalContent = content.replace('[Tên Bé]', petName ? petName : 'Bé yêu của bạn');
        }

        const newNoti = {
            id: 'noti-' + Date.now(),
            type: type,
            title: title,
            content: finalContent,
            time: new Date().toISOString(),
            read: false,
            link: link
        };

        notis.push(newNoti);
        saveNotifications(notis);

        // Hiển thị Toast thông báo đẩy thời gian thực
        showPushToast(newNoti);

        // 5. Kích hoạt SMS dự phòng sau 15 phút nếu vẫn chưa đọc (US 14-5 / AC5.1)
        if (type === 'service' && config.sms) {
            setTimeout(() => {
                const refreshedNotis = getNotifications();
                const target = refreshedNotis.find(n => n.id === newNoti.id);
                if (target && !target.read) {
                    showSmsBackup(target.content);
                }
            }, 15 * 60 * 1000); // 15 phút
        }
    }

    function showSmsBackup(content) {
        // Mock gửi SMS dự phòng dưới 160 ký tự không dấu
        const cleanText = content.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        const smsContent = `[PawPal SMS] ${cleanText.substring(0, 130)}...`;
        console.log(`[SMS SỰ CỐ / DỰ PHÒNG] Đang gửi SMS tới SĐT khách hàng: "${smsContent}"`);
    }

    // Đánh dấu đọc tất cả
    function markAllAsRead() {
        const notis = getNotifications();
        notis.forEach(n => n.read = true);
        saveNotifications(notis);
    }

    // Giả lập phát sinh thông báo đẩy ngẫu nhiên khi đang lướt web để kiểm tra tính năng
    function setupMockNotificationSimulator() {
        // Gửi 1 thông báo sau 20 giây để test thời gian thực
        setTimeout(() => {
            const petName = getPetName() || 'Bé cưng';
            addNotification(
                'service',
                'Trạng thái Spa',
                `[Tên Bé] đã hoàn thành xong liệu trình sấy lông mượt mà rồi đó!`,
                '/pages/user/pet-diary.html'
            );
        }, 15000);
    }

    // Xuất ra phạm vi toàn cục để trang notifications.html và các trang khác sử dụng
    window.PawPalNotifications = {
        get: getNotifications,
        save: saveNotifications,
        getConfig: getConfig,
        saveConfig: saveConfig,
        add: addNotification,
        markAllAsRead: markAllAsRead,
        updateHeaderDropdown: updateHeaderDropdown
    };

    // Khởi động
    document.addEventListener('DOMContentLoaded', () => {
        updateHeaderDropdown();
        setupMockNotificationSimulator();

        const btnMarkAll = document.getElementById('btnMarkAllRead');
        if (btnMarkAll) {
            btnMarkAll.addEventListener('click', (e) => {
                e.preventDefault();
                markAllAsRead();
            });
        }
    });

    document.addEventListener('notifications_updated', () => {
        updateHeaderDropdown();
    });

})();
