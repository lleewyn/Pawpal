/**
 * spa-router.js — Điều hướng mượt Single-Page cho toàn bộ hệ thống PawPal
 * Giữ nguyên Header & Footer 100%, chỉ hoán đổi nội dung <main> mượt mà không bao giờ chớp giật.
 */

(function () {
    if (window.PawPalSPARouterReady) return;
    window.PawPalSPARouterReady = true;

    async function spaNavigateTo(url, pushState = true) {
        try {
            const targetUrl = new URL(url, window.location.origin);

            // Bỏ qua trang admin và trang user có router riêng
            if (targetUrl.pathname.startsWith('/admin') || targetUrl.pathname.startsWith('/pages/admin')) {
                window.location.href = targetUrl.href;
                return;
            }

            // Nếu cùng đường dẫn và query param
            if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
                if (targetUrl.hash) {
                    window.location.hash = targetUrl.hash;
                }
                return;
            }

            // Nếu đang chuyển vào hoặc ra khỏi trang User Portal
            if (targetUrl.pathname.includes('/user') || window.location.pathname.includes('/user')) {
                window.location.href = targetUrl.href;
                return;
            }

            const currentMain = document.querySelector('main');
            if (currentMain) {
                currentMain.style.transition = 'opacity 140ms ease';
                currentMain.style.opacity = '0.35';
            }

            const res = await fetch(targetUrl.href);
            if (!res.ok) {
                window.location.href = targetUrl.href;
                return;
            }

            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const newMain = doc.querySelector('main');
            if (!newMain || !currentMain) {
                window.location.href = targetUrl.href;
                return;
            }

            // Cập nhật tiêu đề trang
            if (doc.title) {
                document.title = doc.title;
            }

            // Đồng bộ thẻ body class nếu cần
            if (doc.body && doc.body.className) {
                document.body.className = doc.body.className;
            }

            // Nạp các file CSS mới của trang đích
            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const href = link.getAttribute('href');
                if (href && !document.querySelector(`link[href="${href}"]`)) {
                    const newLink = document.createElement('link');
                    newLink.rel = 'stylesheet';
                    newLink.href = href;
                    document.head.appendChild(newLink);
                }
            });

            // Thay thế nội dung main
            currentMain.className = newMain.className;
            currentMain.id = newMain.id;
            currentMain.innerHTML = newMain.innerHTML;

            // Đổi URL trên thanh địa chỉ
            if (pushState) {
                window.history.pushState({}, '', targetUrl.href);
            }

            // Cuộn lên đầu trang
            window.scrollTo({ top: 0, behavior: 'instant' });

            // Nạp và thực thi các script của trang mới
            doc.querySelectorAll('main script, body script[src*="services.js"], body script[src*="shop.js"], body script[src*="about.js"], body script[src*="contact.js"], body script[src*="blog.js"], body script[src*="booking.js"]').forEach(s => {
                const script = document.createElement('script');
                if (s.src) {
                    script.src = s.src + (s.src.includes('?') ? '&' : '?') + 't=' + Date.now();
                    script.defer = true;
                } else {
                    script.textContent = s.textContent;
                }
                document.body.appendChild(script);
            });

            // Khôi phục hiển thị mượt mà
            requestAnimationFrame(() => {
                currentMain.style.opacity = '1';
            });

            // Kích hoạt lại các module liên quan
            if (typeof window.initActiveNav === 'function') {
                window.initActiveNav();
            }
            if (typeof window.initApp === 'function') {
                window.initApp();
            }
            if (typeof window.initLucideIcons === 'function') {
                window.initLucideIcons();
            }
            if (typeof window.updateCartBadge === 'function') {
                window.updateCartBadge();
            }

            document.dispatchEvent(new CustomEvent('page_navigated', { detail: { url: targetUrl.href } }));

        } catch (err) {
            console.warn('[spa-router] Fallback to standard navigation:', err);
            window.location.href = url;
        }
    }

    // Đón bắt toàn bộ sự kiện click link nội bộ
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Bỏ qua các liên kết không phải navigation
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if (link.target === '_blank' || link.hasAttribute('download')) return;

        try {
            const targetUrl = new URL(link.href, window.location.origin);
            if (targetUrl.origin !== window.location.origin) return;

            // Bỏ qua các file tài nguyên tĩnh
            if (/\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|mp4)$/i.test(targetUrl.pathname)) return;

            e.preventDefault();
            spaNavigateTo(targetUrl.href, true);
        } catch (error) {
            // Nếu parse URL lỗi thì để browser điều hướng tự nhiên
        }
    });

    // Lắng nghe nút Back/Forward của trình duyệt
    window.addEventListener('popstate', function () {
        spaNavigateTo(window.location.href, false);
    });

    window.spaNavigateTo = spaNavigateTo;
})();
