
(function () {
    function getRootPath() {
        const scripts = document.querySelectorAll('script[src]');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src;
            const marker = '/scripts/shared/components.js';
            const idx = src.indexOf(marker);
            if (idx !== -1) {
                return src.substring(0, idx) + '/';
            }
        }

        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            return '/';
        }

        const depth = window.location.pathname.split('/').filter(Boolean).length;
        return depth <= 1 ? './' : '../'.repeat(Math.max(0, depth - 1));
    }

    window['pawpalGetRootPath'] = getRootPath;

    function cleanInjectedHtml(html) {
        var rootPath = getRootPath();
        
        html = html.replace(/(src|href)="\/([^"]*)"/g, function(match, attr, p1) {
            if (p1.startsWith('/') || p1.startsWith('http') || p1.startsWith('data:')) return match;
            if (rootPath === '/' || rootPath === '') {
                return attr + '="/' + p1 + '"';
            }
            return attr + '="' + rootPath + p1 + '"';
        });

        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('script').forEach(function (s) {
            if (s.textContent.includes('live-server') || (s.src && s.src.includes('live-server'))) {
                s.remove();
            }
        });

        var walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_COMMENT);
        var toRemove = [];
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue && walker.currentNode.nodeValue.includes('live-server')) {
                toRemove.push(walker.currentNode);
            }
        }
        toRemove.forEach(function (node) { node.remove(); });

        var headTags = '';
        if (doc.head) {
            doc.head.querySelectorAll('link[rel="stylesheet"], style').forEach(function(node) {
                headTags += node.outerHTML + '\n';
            });
        }
        
        return headTags + (doc.body || doc.documentElement).innerHTML.trim();
    }

    function ensureHeaderAuth() {
        var rootPath = getRootPath();
        var currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        } catch (e) {
            currentUser = null;
        }
        if (!document.querySelector('script[src*="header.js"]')) {
            var authScript = document.createElement('script');
            authScript.src = rootPath + 'components/header/header.js';
            authScript.defer = true;
            document.head.appendChild(authScript);
        }
        if (currentUser && !currentUser.is_temporary && !document.querySelector('script[src*="notifications-handler.js"]')) {
            var notiScript = document.createElement('script');
            notiScript.src = rootPath + 'scripts/shared/notifications-handler.js';
            notiScript.defer = true;
            document.head.appendChild(notiScript);
        }
        if (!document.querySelector('script[src*="support-handler.js"]')) {
            var supportScript = document.createElement('script');
            supportScript.src = rootPath + 'scripts/shared/support-handler.js';
            supportScript.defer = true;
            document.head.appendChild(supportScript);
        }
        if (!document.querySelector('script[src*="spa-router.js"]')) {
            var spaScript = document.createElement('script');
            spaScript.src = rootPath + 'scripts/shared/spa-router.js';
            spaScript.defer = true;
            document.head.appendChild(spaScript);
        }
    }

    function ensureFabJS() {
        var rootPath = getRootPath();
        if (!document.querySelector('script[src*="fab.js"]')) {
            var fabScript = document.createElement('script');
            fabScript.src = rootPath + 'components/fab/fab.js';
            fabScript.defer = true;
            document.head.appendChild(fabScript);
        }
    }

    function injectComponent(targetId, componentPath) {
        var el = document.getElementById(targetId);
        if (!el) {
            return;
        }

        var cacheKey = 'pawpal_component_' + targetId;
        var isSidebar = targetId === 'user-sidebar';
        
        // Đọc từ cache để hiển thị tức thì (0ms latency, triệt tiêu 100% hiện tượng chớp nháy)
        var cached = null;
        try {
            cached = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
        } catch(e) {}

        if (cached) {
            if (isSidebar) {
                el.innerHTML = cached;
                executeSidebarScripts();
                initLucideIcons();
                document.dispatchEvent(new CustomEvent('sidebarInjected'));
            } else {
                el.outerHTML = cached;
                if (targetId === 'site-header') {
                    ensureHeaderAuth();
                    document.dispatchEvent(new CustomEvent('headerInjected'));
                    if (typeof initActiveNav === 'function') initActiveNav();
                    if (typeof initMobileNavigation === 'function') initMobileNavigation();
                }
                if (targetId === 'site-footer') {
                    document.dispatchEvent(new CustomEvent('footerInjected'));
                }
                if (targetId === 'site-fab') {
                    ensureFabJS();
                    document.dispatchEvent(new CustomEvent('footerInjected'));
                }
            }
            return;
        }

        fetch(componentPath)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status + ' — Cannot load ' + componentPath);
                return res.text();
            })
            .then(function (html) {
                var cleanedHtml = cleanInjectedHtml(html);
                try {
                    sessionStorage.setItem(cacheKey, cleanedHtml);
                    localStorage.setItem(cacheKey, cleanedHtml);
                } catch(e) {}

                var currentEl = document.getElementById(targetId);
                if (!currentEl) return;

                if (isSidebar) {
                    currentEl.innerHTML = cleanedHtml;
                    executeSidebarScripts();
                    initLucideIcons();
                    document.dispatchEvent(new CustomEvent('sidebarInjected'));
                    return;
                }

                currentEl.outerHTML = cleanedHtml;
                if (targetId === 'site-header') {
                    ensureHeaderAuth();
                    document.dispatchEvent(new CustomEvent('headerInjected'));
                    if (typeof initActiveNav === 'function') initActiveNav();
                    if (typeof initMobileNavigation === 'function') initMobileNavigation();
                }
                if (targetId === 'site-footer') {
                    document.dispatchEvent(new CustomEvent('footerInjected'));
                }
                if (targetId === 'site-fab') {
                    ensureFabJS();
                    document.dispatchEvent(new CustomEvent('footerInjected'));
                }
            })
            .catch(function (err) {
                console.error('[components.js] FAILED to inject', targetId, '—', err.message);
            });
    }

    function initLucideIcons() {
        if (typeof lucide === 'undefined') {
            var script = document.createElement('script');
            script.src = 'https://unpkg.com/lucide@latest';
            script.onload = function() {
                lucide.createIcons();
            };
            document.head.appendChild(script);
        } else {
            lucide.createIcons();
        }
    }

    function executeSidebarScripts() {
        var sidebarContainer = document.getElementById('user-sidebar');
        if (sidebarContainer) {
            sidebarContainer.querySelectorAll('script').forEach(function(oldScript) {
                var newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(function(attr) {
                    newScript.setAttribute(attr.name, attr.value);
                });
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
        }
    }

    function initComponents() {
        var root = getRootPath();
        console.log('[components.js] root detected:', root);
        injectComponent('site-header', root + 'components/header/header.html');
        injectComponent('site-footer', root + 'components/footer/footer.html');
        injectComponent('site-fab', root + 'components/fab/fab.html');
        injectComponent('user-sidebar', root + 'components/user-sidebar/user-sidebar.html');
        
        initLucideIcons();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        initComponents();
    }
})();

