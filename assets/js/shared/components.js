/**
 * components.js — Inject shared header & footer vào tất cả page
 *
 * Cách dùng trong HTML:
 *   <div id="site-header"></div>   ← header inject vào đây
 *   <div id="site-footer"></div>   ← footer inject vào đây
 *
 * Dùng absolute path /components/ để hoạt động đúng trên cả Vite
 * lẫn Live Server (miễn là cả hai đều serve từ root của project).
 * Fallback: tự detect root từ src của thẻ <script> hiện tại.
 */

(function () {
    /**
     * Tìm root path của project bằng cách đọc src của chính script này.
     * Ví dụ: src = "/assets/js/shared/components.js"
     *        → root = "/"  (absolute, luôn đúng)
     * Fallback về relative nếu không detect được.
     */
    function getRootPath() {
        // Ưu tiên: dùng absolute path nếu server hỗ trợ (Vite & Live Server đều hỗ trợ)
        // Detect xem URL có dạng http/https không (tức là đang chạy qua server)
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            // Tìm script tag hiện tại để biết prefix root
            var scripts = document.querySelectorAll('script[src]');
            for (var i = 0; i < scripts.length; i++) {
                // Dùng .src (full absolute URL) thay vì getAttribute('src') (relative path)
                // VD: "http://localhost:3000/assets/js/shared/components.js"
                var src = scripts[i].src;
                var marker = '/assets/js/shared/components.js';
                var idx = src.indexOf(marker);
                if (idx !== -1) {
                    // Lấy phần origin + prefix: "http://localhost:3000"
                    var detectedRoot = src.substring(0, idx);
                    return detectedRoot + '/';
                }
            }
            // Không tìm được → dùng absolute root '/'
            return '/';
        }

        // Fallback cho file:// (mở trực tiếp file, không qua server)
        var depth = window.location.pathname.split('/').filter(Boolean).length;
        return depth <= 1 ? './' : '../'.repeat(depth - 1);
    }

    function cleanInjectedHtml(html) {
        // Dùng DOMParser để an toàn hơn — tránh regex xoá nhầm nội dung HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        // Xoá tất cả <script> có chứa "live-server" trong nội dung
        doc.querySelectorAll('script').forEach(function (s) {
            if (s.textContent.includes('live-server') || (s.src && s.src.includes('live-server'))) {
                s.remove();
            }
        });

        // Xoá comment <!-- Code injected by live-server -->
        var walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_COMMENT);
        var toRemove = [];
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue && walker.currentNode.nodeValue.includes('live-server')) {
                toRemove.push(walker.currentNode);
            }
        }
        toRemove.forEach(function (node) { node.remove(); });

        // Trả về innerHTML của body (vì DOMParser wrap vào <html><body>)
        return (doc.body || doc.documentElement).innerHTML.trim();
    }

    function injectComponent(targetId, componentPath) {
        console.log('[components.js] injectComponent', targetId, componentPath);
        var el = document.getElementById(targetId);
        if (!el) {
            console.warn('[components.js] missing target:', targetId);
            return;
        }

        // Try sessionStorage cache first (eliminates layout shift on repeat visits)
        var cacheKey = 'pawpal_component_' + targetId;
        var cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            el.outerHTML = cached;
            if (targetId === 'site-header') {
                document.dispatchEvent(new CustomEvent('headerInjected'));
                if (typeof initActiveNav === 'function') initActiveNav();
                if (typeof initMobileNavigation === 'function') initMobileNavigation();
            }
            if (targetId === 'site-footer') {
                document.dispatchEvent(new CustomEvent('footerInjected'));
            }
            if (targetId === 'site-fab') {
                document.dispatchEvent(new CustomEvent('footerInjected'));
            }
            return;
        }

        var url = componentPath + '?v=' + Date.now();
        fetch(url, { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status + ' — Cannot load ' + url);
                return res.text();
            })
            .then(function (html) {
                var cleanedHtml = cleanInjectedHtml(html);
                // Cache for this session
                try { sessionStorage.setItem(cacheKey, cleanedHtml); } catch(e) {}
                el.outerHTML = cleanedHtml;
                console.log('[components.js] injected', targetId);
                if (targetId === 'site-header') {
                    document.dispatchEvent(new CustomEvent('headerInjected'));
                    if (typeof initActiveNav === 'function') initActiveNav();
                    if (typeof initMobileNavigation === 'function') initMobileNavigation();
                }
                if (targetId === 'site-footer') {
                    document.dispatchEvent(new CustomEvent('footerInjected'));
                }
                if (targetId === 'site-fab') {
                    document.dispatchEvent(new CustomEvent('footerInjected'));
                }
            })
            .catch(function (err) {
                console.error('[components.js] FAILED to inject', targetId, '—', err.message);
            });
    }

    function initComponents() {
        var root = getRootPath();
        console.log('[components.js] root detected:', root);
        injectComponent('site-header', root + 'components/header.html');
        injectComponent('site-footer', root + 'components/footer.html');
        injectComponent('site-fab', root + 'components/fab.html');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        initComponents();
    }
})();

