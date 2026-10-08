/**
 * spa-router.js — Điều hướng mượt Single-Page cho toàn bộ hệ thống PawPal
 * Giữ nguyên Header & Footer 100%, chỉ hoán đổi nội dung <main> mượt mà không bao giờ chớp giật.
 * Triệt tiêu hoàn toàn 100% FOUC (Flash of Unstyled Content).
 */

(function () {
    if (window.PawPalSPARouterReady) return;
    window.PawPalSPARouterReady = true;

    // Danh sách toàn bộ Stylesheet cốt lõi của các trang trong PawPal
    const CORE_PAGE_STYLES = [
        '/pages/public/landing/landing.css',
        '/pages/shop/shop.css',
        '/pages/services/services.css',
        '/pages/public/about/about.css',
        '/pages/public/contact/contact.css',
        '/pages/public/blog/blog.css',
        '/pages/shop/cart/cart.css',
        '/pages/public/return-guest/return-guest.css',
        '/pages/user/modules/orders/return-detail.css'
    ];

    // Nạp trước tất cả Stylesheet để khi chuyển trang là có sẵn CSS ngay, 0% FOUC
    function preloadAllPageStyles() {
        CORE_PAGE_STYLES.forEach(function(href) {
            if (!document.querySelector('link[href="' + href + '"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                document.head.appendChild(link);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(preloadAllPageStyles, 80);
        });
    } else {
        setTimeout(preloadAllPageStyles, 80);
    }

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

    function getProgressBar() {
        let bar = document.getElementById('pawpal-top-progress-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'pawpal-top-progress-bar';
            document.body.appendChild(bar);
        }
        return bar;
    }

    function startProgressBar() {
        const bar = getProgressBar();
        bar.style.transition = 'none';
        bar.style.width = '0%';
        bar.classList.add('loading');
        void bar.offsetWidth;
        bar.style.transition = 'width 350ms cubic-bezier(0.1, 0.9, 0.2, 1), opacity 200ms ease';
        bar.style.width = '75%';
    }

    function completeProgressBar() {
        const bar = getProgressBar();
        bar.style.width = '100%';
        setTimeout(function() {
            bar.classList.remove('loading');
            setTimeout(function() {
                bar.style.width = '0%';
            }, 250);
        }, 150);
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

            startProgressBar();

            const currentMain = document.querySelector('main');
            if (currentMain) {
                // Khóa hiển thị ngay tức thì — triệt tiêu 100% tình trạng lộ unstyled HTML
                currentMain.style.transition = 'none';
                currentMain.style.opacity = '0';
                currentMain.style.visibility = 'hidden';
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

            // Nạp và ĐỢI các file CSS mới của trang đích nạp xong 100% trước khi hiển thị (Chống FOUC)
            const newCssLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).filter(link => {
                const href = link.getAttribute('href');
                return href && !document.querySelector('link[href="' + href + '"]');
            });

            if (newCssLinks.length > 0) {
                await Promise.all(newCssLinks.map(link => {
                    return new Promise(resolve => {
                        const newLink = document.createElement('link');
                        newLink.rel = 'stylesheet';
                        newLink.href = link.getAttribute('href');
                        newLink.onload = resolve;
                        newLink.onerror = resolve;
                        setTimeout(resolve, 400); // Timeout dự phòng
                        document.head.appendChild(newLink);
                    });
                }));
            }

            // Thay thế nội dung main sau khi CSS đã chắc chắn sẵn sàng
            currentMain.className = newMain.className;
            currentMain.id = newMain.id;
            currentMain.innerHTML = newMain.innerHTML;

            // Ép browser tính toán lại layout trước khi hiển thị
            void currentMain.offsetHeight;

            // Đổi URL trên thanh địa chỉ
            if (pushState) {
                window.history.pushState({}, '', targetUrl.href);
            }
            updateActiveNav(targetUrl.pathname);

            // Cuộn lên đầu trang
            window.scrollTo({ top: 0, behavior: 'instant' });

            // Tìm tất cả script page-specific (không phải shared) trong cả head và body
            const pageScripts = Array.from(doc.querySelectorAll('script[src]')).filter(function(s) {
                const rawSrc = s.getAttribute('src') || '';
                if (!rawSrc) return false;
                if (isSharedScript(rawSrc)) return false;
                return true;
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

            // Kích hoạt hàm khởi tạo dữ liệu của trang tương ứng
            try {
                if (targetUrl.pathname.includes('/shop') && typeof window.initShop === 'function') {
                    window.initShop();
                } else if (targetUrl.pathname.includes('/services') && typeof window.initServicesPage === 'function') {
                    window.initServicesPage();
                } else if (targetUrl.pathname.includes('/blog') && typeof window.initBlog === 'function') {
                    window.initBlog();
                } else if (targetUrl.pathname.includes('/cart') && typeof window.initCart === 'function') {
                    window.initCart();
                } else if (targetUrl.pathname.includes('return-guest') && typeof window.initReturnGuestPage === 'function') {
                    window.initReturnGuestPage();
                }
            } catch (initErr) {
                console.warn('[spa-router] Page init function error:', initErr);
            }

            // Khôi phục hiển thị dứt khoát không chớp giật
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    currentMain.style.visibility = 'visible';
                    currentMain.style.transition = 'opacity 150ms ease';
                    currentMain.style.opacity = '1';
                });
            });

            // Cập nhật lại thanh điều hướng Active Nav chuẩn xác
            updateActiveNav(targetUrl.pathname);

            // Kích hoạt lại các module
            if (typeof window.initApp === 'function') window.initApp();
            if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
            if (typeof window.updateNotificationBadge === 'function') window.updateNotificationBadge();
            if (typeof lucide !== 'undefined') lucide.createIcons();

            // Kích hoạt DOMContentLoaded cho các script lắng nghe
            document.dispatchEvent(new Event('DOMContentLoaded'));

            completeProgressBar();
            document.dispatchEvent(new CustomEvent('page_navigated', { detail: { url: targetUrl.href } }));

        } catch (err) {
            completeProgressBar();
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

    // Tự động prefetch trang khi rê chuột (hover) để khi bấm là chuyển tức thì không giật
    const prefetchedUrls = new Set();
    document.addEventListener('mouseover', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        if (link.target === '_blank') return;

        try {
            const targetUrl = new URL(link.href, window.location.origin);
            if (targetUrl.origin === window.location.origin && !prefetchedUrls.has(targetUrl.pathname)) {
                if (targetUrl.pathname.startsWith('/admin') || targetUrl.pathname.startsWith('/user')) return;
                prefetchedUrls.add(targetUrl.pathname);
                const prefetch = document.createElement('link');
                prefetch.rel = 'prefetch';
                prefetch.href = targetUrl.href;
                document.head.appendChild(prefetch);
            }
        } catch (err) {}
    }, { passive: true });

    function updateActiveNav(targetPath) {
        const nav = document.getElementById('primaryNavigation') || document.querySelector('.main-header .navbar-nav');
        if (!nav) return;

        const path = (targetPath || window.location.pathname).toLowerCase();
        const links = nav.querySelectorAll('a.nav-link');

        links.forEach(link => {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
            if (typeof link.blur === 'function') link.blur();
        });

        if (path.includes('/pages/user/') || path.includes('/user/')) return;

        let matched = null;
        if (path === '/' || path === '/landing' || path.endsWith('/index.html') || path === '') {
            matched = nav.querySelector('a.nav-link[href="/"]') || nav.querySelector('a.nav-link[href*="landing"]');
        } else if (path.startsWith('/services') || path.includes('service-detail') || path.startsWith('/booking')) {
            matched = nav.querySelector('a.nav-link[href="/services"]') || nav.querySelector('a.nav-link[href*="services"]');
        } else if (path.startsWith('/shop') || path.includes('product-detail') || path.startsWith('/cart') || path.startsWith('/checkout')) {
            matched = nav.querySelector('a.nav-link[href="/shop"]') || nav.querySelector('a.nav-link[href*="shop"]');
        } else if (path.startsWith('/blog') || path.includes('cam-nang')) {
            matched = nav.querySelector('a.nav-link[href="/blog"]') || nav.querySelector('a.nav-link[href*="blog"]');
        } else if (path.startsWith('/contact') || path.includes('lien-he')) {
            matched = nav.querySelector('a.nav-link[href="/contact"]') || nav.querySelector('a.nav-link[href*="contact"]');
        } else if (path.startsWith('/about') || path.includes('ve-chung-toi')) {
            matched = nav.querySelector('a.nav-link[href="/about"]') || nav.querySelector('a.nav-link[href*="about"]');
        }

        if (matched) {
            matched.classList.add('active');
            matched.setAttribute('aria-current', 'page');
        }
    }

    // Tự động khởi tạo active nav khi load trang
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            updateActiveNav(window.location.pathname);
        });
    } else {
        updateActiveNav(window.location.pathname);
    }

    window.initActiveNav = updateActiveNav;
    window.spaNavigateTo = spaNavigateTo;
})();
