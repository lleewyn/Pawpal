// Auto-detect current page and set active state
(function() {
    const currentPath = window.location.pathname.toLowerCase();
    const urlParams = new URLSearchParams(window.location.search);
    const currentTab = urlParams.get('tab') || 'profile';
    const navLinks = document.querySelectorAll('.sidebar-nav .sidebar-link');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#') {
            const linkPath = href.toLowerCase();
            const linkTab = link.getAttribute('data-tab');
            
            // Check if on dashboard page with specific tab
            if (currentPath.includes('dashboard') && linkPath.includes('dashboard')) {
                if (linkTab === currentTab) {
                    link.classList.add('active');
                }
                
                // Add smooth tab switching for dashboard internal tabs
                if (linkPath.includes('dashboard') && linkTab) {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        // Update URL without reload
                        const newUrl = linkTab === 'profile' 
                            ? '/pages/user/dashboard.html' 
                            : `/pages/user/dashboard.html?tab=${linkTab}`;
                        window.history.pushState({}, '', newUrl);
                        
                        // Hide all tabs
                        document.querySelectorAll('.dashboard-content-panel').forEach(panel => {
                            panel.style.display = 'none';
                        });
                        
                        // Show target tab
                        const tabMap = {
                            'profile': 'profileTab',
                            'security': 'securityTab'
                        };
                        const targetTabId = tabMap[linkTab] || 'profileTab';
                        const targetTab = document.getElementById(targetTabId);
                        if (targetTab) {
                            targetTab.style.display = 'block';
                        }
                        
                        // Update active states
                        navLinks.forEach(l => l.classList.remove('active'));
                        link.classList.add('active');
                    });
                }
            } 
            // Check other pages
            else if (currentPath.includes('pet-profile') && linkPath.includes('pet-profile')) {
                link.classList.add('active');
            } else if (currentPath.includes('pet-diary') && linkPath.includes('pet-diary')) {
                link.classList.add('active');
            } else if (currentPath.includes('booking') && linkPath.includes('booking')) {
                link.classList.add('active');
            } else if (currentPath.includes('orders') && linkPath.includes('orders')) {
                link.classList.add('active');
            } else if (currentPath.includes('wishlist') && linkPath.includes('wishlist')) {
                link.classList.add('active');
            } else if (currentPath.includes('loyalty') && linkPath.includes('loyalty')) {
                link.classList.add('active');
            } else if (currentPath.includes('support') && linkPath.includes('support')) {
                link.classList.add('active');
            }
        }
    });
})();
