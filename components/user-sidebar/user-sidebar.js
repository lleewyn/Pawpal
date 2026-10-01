(function() {
    function updateActiveState() {
        const currentPath = window.location.pathname.toLowerCase();
        const currentHash = (window.location.hash || '').toLowerCase();
        const navLinks = document.querySelectorAll('.sidebar-nav .sidebar-link');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;
            const linkHref = href.toLowerCase();

            // Nếu đang trong SPA trung tâm (/pages/user/ hoặc index.html)
            if (currentPath.includes('/pages/user') && (currentPath.endsWith('/user/') || currentPath.includes('index.html') || currentPath.endsWith('/user'))) {
                let targetHash = '#profile';
                if (linkHref.includes('#')) {
                    targetHash = '#' + linkHref.split('#')[1];
                }

                const activeHash = currentHash.split('?')[0] || '#profile';
                if (activeHash === targetHash) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            } else {
                // Legacy path check
                if (currentPath.includes('dashboard') && linkHref.includes('profile')) {
                    link.classList.add('active');
                } else if (currentPath.includes('pet-profile') && linkHref.includes('pets')) {
                    link.classList.add('active');
                } else if (currentPath.includes('pet-diary') && linkHref.includes('diary')) {
                    link.classList.add('active');
                } else if (currentPath.includes('booking') && linkHref.includes('booking')) {
                    link.classList.add('active');
                } else if (currentPath.includes('order') && linkHref.includes('order')) {
                    link.classList.add('active');
                } else if (currentPath.includes('wishlist') && linkHref.includes('wishlist')) {
                    link.classList.add('active');
                } else if (currentPath.includes('loyalty') && linkHref.includes('loyalty')) {
                    link.classList.add('active');
                } else if (currentPath.includes('support') && linkHref.includes('support')) {
                    link.classList.add('active');
                } else if (currentPath.includes('settings') && linkHref.includes('settings')) {
                    link.classList.add('active');
                }
            }
        });
    }

    updateActiveState();
    window.addEventListener('hashchange', updateActiveState);
})();
