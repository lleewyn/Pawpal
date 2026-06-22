/**
 * Quick Verification Script
 * Chạy nhanh để verify navigation đang hoạt động đúng
 * 
 * Usage: Paste vào browser console
 */

(function quickVerify() {
    console.clear();
    console.log('%c Quick Navigation Verification', 'font-size: 18px; font-weight: bold; color: #667eea; background: #f0f0f0; padding: 10px; border-radius: 5px;');
    console.log('');
    
    const checks = [];
    let passCount = 0;
    let failCount = 0;
    
    // Helper function
    function addCheck(name, passed, details = '') {
        checks.push({ name, passed, details });
        if (passed) passCount++;
        else failCount++;
    }
    
    // Check 1: Sidebar container exists
    const sidebarContainer = document.getElementById('user-sidebar');
    addCheck(
        'Sidebar Container',
        !!sidebarContainer,
        sidebarContainer ? ' #user-sidebar found' : ' #user-sidebar NOT FOUND'
    );
    
    // Check 2: Sidebar component loaded
    const sidebar = document.querySelector('.dashboard-sidebar');
    addCheck(
        'Sidebar Component',
        !!sidebar,
        sidebar ? ' .dashboard-sidebar loaded' : ' Component failed to load'
    );
    
    // Check 3: Navigation links exist
    const navLinks = document.querySelectorAll('.sidebar-nav .sidebar-link');
    addCheck(
        'Navigation Links',
        navLinks.length >= 7,
        `${navLinks.length} links found (expected: 8)`
    );
    
    // Check 4: Active state exists
    const activeLinks = document.querySelectorAll('.sidebar-link.active');
    addCheck(
        'Active State',
        activeLinks.length === 1,
        activeLinks.length === 1 ? ` Exactly 1 active (${activeLinks[0]?.textContent.trim()})` : ` Found ${activeLinks.length} active links`
    );
    
    // Check 5: All links have valid hrefs
    let invalidLinks = 0;
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href === '#') invalidLinks++;
    });
    addCheck(
        'Valid Link Hrefs',
        invalidLinks === 0,
        invalidLinks === 0 ? ' All links valid' : ` ${invalidLinks} invalid links`
    );
    
    // Check 6: Authentication
    const currentUser = localStorage.getItem('pawpal_current_user');
    let userValid = false;
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            userValid = !!(user && user.name && user.phone);
        } catch (e) {}
    }
    addCheck(
        'User Authentication',
        userValid,
        userValid ? ' User logged in' : '️  No user (will redirect to login)'
    );
    
    // Check 7: Page detection
    const currentPath = window.location.pathname.toLowerCase();
    let pageDetected = false;
    let pageName = 'Unknown';
    
    if (currentPath.includes('dashboard')) {
        pageDetected = true;
        const tab = new URLSearchParams(window.location.search).get('tab') || 'profile';
        pageName = `Dashboard (${tab})`;
    } else if (currentPath.includes('pet-profile')) {
        pageDetected = true;
        pageName = 'Pet Profile';
    } else if (currentPath.includes('orders')) {
        pageDetected = true;
        pageName = 'Orders';
    } else if (currentPath.includes('loyalty')) {
        pageDetected = true;
        pageName = 'Loyalty';
    } else if (currentPath.includes('support')) {
        pageDetected = true;
        pageName = 'Support';
    }
    
    addCheck(
        'Page Detection',
        pageDetected,
        pageDetected ? ` Detected: ${pageName}` : ' Unknown page'
    );
    
    // Check 8: CSS loaded
    const dashboardCSS = Array.from(document.styleSheets).some(sheet => 
        sheet.href && sheet.href.includes('dashboard.css')
    );
    addCheck(
        'Dashboard CSS',
        dashboardCSS,
        dashboardCSS ? ' dashboard.css loaded' : '️  dashboard.css not found'
    );
    
    // Print results
    console.log('');
    console.log('%c Results:', 'font-weight: bold; font-size: 14px;');
    console.log('');
    
    checks.forEach(check => {
        const icon = check.passed ? '' : '';
        const color = check.passed ? 'color: green;' : 'color: red;';
        console.log(`${icon} %c${check.name}`, color, '\n   ' + check.details);
    });
    
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #ccc;');
    console.log('');
    
    // Summary
    const totalChecks = checks.length;
    const passRate = ((passCount / totalChecks) * 100).toFixed(0);
    
    if (failCount === 0) {
        console.log('%c ALL CHECKS PASSED!', 'font-size: 16px; font-weight: bold; color: white; background: green; padding: 10px; border-radius: 5px;');
        console.log(`   ${passCount}/${totalChecks} checks successful (${passRate}%)`);
    } else if (failCount <= 2) {
        console.log('%c️  MINOR ISSUES DETECTED', 'font-size: 16px; font-weight: bold; color: #333; background: orange; padding: 10px; border-radius: 5px;');
        console.log(`   ${passCount}/${totalChecks} checks passed, ${failCount} failed (${passRate}%)`);
    } else {
        console.log('%c CRITICAL ISSUES FOUND', 'font-size: 16px; font-weight: bold; color: white; background: red; padding: 10px; border-radius: 5px;');
        console.log(`   ${passCount}/${totalChecks} checks passed, ${failCount} failed (${passRate}%)`);
    }
    
    console.log('');
    
    // Recommendations
    if (failCount > 0) {
        console.log('%c Recommendations:', 'font-weight: bold;');
        console.log('');
        
        if (!sidebarContainer) {
            console.log('   • Add <div id="user-sidebar"></div> to your HTML');
        }
        if (!sidebar) {
            console.log('   • Check sidebar loading script is running');
            console.log('   • Verify path: ../../components/user-sidebar.html');
        }
        if (activeLinks.length !== 1) {
            console.log('   • Check active detection script in sidebar component');
        }
        if (!userValid) {
            console.log('   • Login required for user pages');
        }
        if (!pageDetected) {
            console.log('   • This page may not be a dashboard page');
        }
    }
    
    console.log('');
    console.log('%cFor detailed tests, run: NavTest.run()', 'color: #667eea; font-style: italic;');
    console.log('');
    
    // Return summary object
    return {
        totalChecks,
        passCount,
        failCount,
        passRate: parseFloat(passRate),
        checks,
        allPassed: failCount === 0
    };
})();
