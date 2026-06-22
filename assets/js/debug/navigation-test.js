/**
 * Navigation Test và Debug Helper
 * Kiểm tra và debug navigation flow trong User Dashboard
 * 
 * Usage:
 * 1. Include script này vào bất kỳ user page nào
 * 2. Open browser console
 * 3. Type: NavTest.run()
 */

window.NavTest = {
    version: '1.0.0',
    
    /**
     * Run all navigation tests
     */
    run() {
        console.log('%c Navigation Test Suite', 'font-size: 16px; font-weight: bold; color: #667eea;');
        console.log('Version:', this.version);
        console.log('---');
        
        this.testCurrentPage();
        this.testSidebarLoaded();
        this.testActiveStates();
        this.testAllLinks();
        this.testAuthentication();
        
        console.log('---');
        console.log('%c Test Complete', 'color: green; font-weight: bold;');
    },
    
    /**
     * Test 1: Current page detection
     */
    testCurrentPage() {
        console.log('%c Test 1: Current Page Detection', 'color: #667eea; font-weight: bold;');
        
        const currentPath = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const currentTab = urlParams.get('tab');
        
        console.log('Current Path:', currentPath);
        console.log('Current Tab Param:', currentTab || 'none');
        
        if (currentPath.includes('dashboard')) {
            console.log(' On Dashboard page');
            console.log('  Active Tab:', currentTab || 'profile (default)');
        } else if (currentPath.includes('pet-profile')) {
            console.log(' On Pet Profile page');
        } else if (currentPath.includes('orders')) {
            console.log(' On Orders page');
        } else if (currentPath.includes('loyalty')) {
            console.log(' On Loyalty page');
        } else {
            console.log('️ Unknown page');
        }
    },
    
    /**
     * Test 2: Sidebar component loaded
     */
    testSidebarLoaded() {
        console.log('%c Test 2: Sidebar Component', 'color: #667eea; font-weight: bold;');
        
        const sidebarContainer = document.getElementById('user-sidebar');
        const sidebar = document.querySelector('.dashboard-sidebar');
        const navLinks = document.querySelectorAll('.sidebar-nav .sidebar-link');
        
        if (!sidebarContainer) {
            console.error(' #user-sidebar container NOT FOUND');
            return;
        }
        console.log(' Sidebar container found');
        
        if (!sidebar) {
            console.error(' .dashboard-sidebar NOT FOUND - Component failed to load');
            return;
        }
        console.log(' Sidebar component loaded');
        
        if (navLinks.length === 0) {
            console.error(' No navigation links found');
            return;
        }
        console.log(` Found ${navLinks.length} navigation links`);
    },
    
    /**
     * Test 3: Active state detection
     */
    testActiveStates() {
        console.log('%c Test 3: Active States', 'color: #667eea; font-weight: bold;');
        
        const activeLinks = document.querySelectorAll('.sidebar-link.active');
        
        if (activeLinks.length === 0) {
            console.warn('️ No active links detected - Active state script may not be running');
        } else if (activeLinks.length === 1) {
            console.log(' Exactly 1 active link (correct)');
            console.log('  Active:', activeLinks[0].textContent.trim());
        } else {
            console.error(` Multiple active links (${activeLinks.length}) - Should be only 1`);
            activeLinks.forEach((link, i) => {
                console.log(`  ${i + 1}:`, link.textContent.trim());
            });
        }
    },
    
    /**
     * Test 4: All navigation links
     */
    testAllLinks() {
        console.log('%c Test 4: Navigation Links', 'color: #667eea; font-weight: bold;');
        
        const navLinks = document.querySelectorAll('.sidebar-nav .sidebar-link');
        const linkData = [];
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const text = link.textContent.trim();
            const isActive = link.classList.contains('active');
            const dataTab = link.getAttribute('data-tab');
            
            linkData.push({
                text,
                href,
                isActive,
                dataTab,
                isValid: href && href !== '#'
            });
        });
        
        console.table(linkData);
        
        // Validate
        const invalidLinks = linkData.filter(l => !l.isValid);
        if (invalidLinks.length > 0) {
            console.error(` Found ${invalidLinks.length} invalid links (href is '#' or empty)`);
        } else {
            console.log(' All links have valid hrefs');
        }
    },
    
    /**
     * Test 5: Authentication state
     */
    testAuthentication() {
        console.log('%c Test 5: Authentication', 'color: #667eea; font-weight: bold;');
        
        const currentUser = localStorage.getItem('pawpal_current_user');
        
        if (!currentUser) {
            console.warn('️ No user logged in - Pages may redirect to login');
            return;
        }
        
        try {
            const user = JSON.parse(currentUser);
            console.log(' User authenticated');
            console.log('  Name:', user.name);
            console.log('  Phone:', user.phone);
            console.log('  Is Temporary:', user.is_temporary || false);
            console.log('  Points:', user.points || 0);
        } catch (e) {
            console.error(' Failed to parse user data:', e);
        }
    },
    
    /**
     * Helper: Get navigation map
     */
    getNavigationMap() {
        return {
            'dashboard': {
                url: '/pages/user/dashboard.html',
                tabs: ['profile', 'security', 'notifications', 'preferences']
            },
            'pet-profile': {
                url: '/pages/user/pet-profile.html'
            },
            'orders': {
                url: '/pages/user/orders.html'
            },
            'loyalty': {
                url: '/pages/user/loyalty.html'
            }
        };
    },
    
    /**
     * Helper: Simulate navigation
     */
    simulate(page, tab = null) {
        const map = this.getNavigationMap();
        
        if (!map[page]) {
            console.error(` Unknown page: ${page}`);
            console.log('Available pages:', Object.keys(map));
            return;
        }
        
        let url = map[page].url;
        if (tab && map[page].tabs) {
            url += `?tab=${tab}`;
        }
        
        console.log(` Navigating to: ${url}`);
        window.location.href = url;
    },
    
    /**
     * Helper: Show navigation help
     */
    help() {
        console.log('%c Navigation Test Helper', 'font-size: 14px; font-weight: bold; color: #667eea;');
        console.log('');
        console.log('Available commands:');
        console.log('  NavTest.run()                    - Run all tests');
        console.log('  NavTest.testCurrentPage()        - Test current page detection');
        console.log('  NavTest.testSidebarLoaded()      - Test sidebar loading');
        console.log('  NavTest.testActiveStates()       - Test active state detection');
        console.log('  NavTest.testAllLinks()           - Test all navigation links');
        console.log('  NavTest.testAuthentication()     - Test auth state');
        console.log('');
        console.log('Simulate navigation:');
        console.log('  NavTest.simulate("dashboard")           - Go to dashboard (profile tab)');
        console.log('  NavTest.simulate("dashboard", "security") - Go to dashboard security tab');
        console.log('  NavTest.simulate("pet-profile")         - Go to pet profile');
        console.log('  NavTest.simulate("orders")              - Go to orders');
        console.log('  NavTest.simulate("loyalty")             - Go to loyalty');
        console.log('');
        console.log('Other:');
        console.log('  NavTest.getNavigationMap()       - Get navigation structure');
        console.log('');
    }
};

// Auto-run on load (optional - can be disabled)
window.addEventListener('DOMContentLoaded', () => {
    // Only run if explicitly enabled
    if (window.localStorage.getItem('navtest_auto_run') === 'true') {
        console.log(' NavTest auto-run enabled');
        setTimeout(() => NavTest.run(), 1000);
    } else {
        console.log(' Type NavTest.help() for navigation testing commands');
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.NavTest;
}
