/**
 * spa-router.js — Điều hướng mượt Single-Page cho toàn bộ hệ thống PawPal
 * Giữ nguyên Header & Footer 100%, chỉ hoán đổi nội dung <main> mượt mà không bao giờ chớp giật.
 */

(function () {
    if (window.PawPalSPARouterReady) return;
    window.PawPalSPARouterReady = true;

    // Các script shared đã được load ở mọi trang — KHÔNG load lại
    const SHARED_SCRIPT_PATTERNS = [
        'components.js', 'header.js', 'main.js', 'auth.js',
        'spa-router.js', 'supabase', 'bootstrap', 'lenis',
        'gsap', 'ScrollTrigger', 'lucide', 'data-loader.js',
        'api-global.js', 'supabase-client.js', 'notifications-handler.js',
        'support-handler.js', 'fab.js'
    ];

    function isSharedScript(src) {
        return SHARED_SCRIPT_PATTERNS.some(p => src.includes(p));
    }

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

            // Đồng bộ thẻ body class
            if (doc.body && doc.body.className) {
                document.body.className = doc.body.className;
            }

            // Nạp các file CSS mới của trang đích
            doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const href = link.getAttribute('href');
                if (href && !document.querySelector('link[href="' + href + '"]')) {
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

            // Track các script đã load
            const loadedSrcs = new Set(
                Array.from(document.querySelectorAll('script[src]')).map(function(s) {
                    try { return new URL(s.src, window.location.origin).pathname; } catch (e) { return s.src; }
                })
            );

            // Tìm script page-specific (không phải shared)
            const pageScripts = Array.from(doc.querySelectorAll('body script[src]')).filter(function(s) {
                const rawSrc = s.getAttribute('src') || '';
                if (isSharedScript(rawSrc)) return false;
                try {
                    const pathname = new URL(rawSrc, targetUrl.origin).pathname;
                    return !loadedSrcs.has(pathname);
                } catch (e) { return false; }
            });

            // Load tuần tự từng script page-specific với cache-bust
            for (const s of pageScripts) {
                await new Promise(function(resolve) {
                    const script = document.createElement('script');
                    const rawSrc = s.getAttribute('src');
                    script.src = rawSrc + (rawSrc.includes('?') ? '&' : '?') + 't=' + Date.now();
                    if (s.type === 'module') script.type = 'module';
                    script.defer = true;
                    script.onload = resolve;
                    script.onerror = resolve;
                    document.body.appendChild(script);
                });
            }

            // Chạy inline script trong <main>
            currentMain.querySelectorAll('script:not([src])').forEach(function(s) {
                const inline = document.createElement('script');
                inline.textContent = s.textContent;
                document.body.appendChild(inline);
            });

            // Khôi phục hiển thị
            requestAnimationFrame(function() {
                currentMain.style.opacity = '1';
            });

            // Kích hoạt lại các module
            if (typeof window.initActiveNav === 'function') window.initActiveNav();
            if (typeof window.initApp === 'function') window.initApp();
            if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
            if (typeof window.updateNotificationBadge === 'function') window.updateNotificationBadge();
            if (typeof lucide !== 'undefined') lucide.createIcons();

            document.dispatchEvent(new CustomEvent('page_navigated', { detail: { url: targetUrl.href } }));

        } catch (err) {
            console.warn('[spa-router] Fallback to standard navigation:', err);
            window.location.href = url;
        }
    }

    // Đón bắt toàn bộ sự kiện click link nội bộ
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if (link.target === '_blank' || link.hasAttribute('download')) return;

        try {
            const targetUrl = new URL(link.href, window.location.origin);
            if (targetUrl.origin !== window.location.origin) return;
            if (/\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|mp4)$/i.test(targetUrl.pathname)) return;

            e.preventDefault();
            spaNavigateTo(targetUrl.href, true);
        } catch (error) {
            // parse URL lỗi — để browser xử lý
        }
    });

    // Lắng nghe nút Back/Forward
    window.addEventListener('popstate', function() {
        spaNavigateTo(window.location.href, false);
    });

    window.spaNavigateTo = spaNavigateTo;
})();
