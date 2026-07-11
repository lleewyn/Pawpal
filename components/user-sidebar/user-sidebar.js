// Tự động nhận diện trang hiện tại và đặt trạng thái active
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
            
            // Kiểm tra nếu đang ở trang dashboard với tab cụ thể
            if (currentPath.includes('dashboard') && linkPath.includes('dashboard')) {
                if (linkTab === currentTab) {
                    link.classList.add('active');
                }
                
                // Thêm hiệu ứng chuyển tab mượt mà cho dashboard
                if (linkPath.includes('dashboard') && linkTab) {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        // Cập nhật URL mà không cần tải lại trang
                        const newUrl = linkTab === 'profile' 
                            ? '/pages/user/dashboard.html' 
                            : `/pages/user/dashboard.html?tab=${linkTab}`;
                        window.history.pushState({}, '', newUrl);
                        
                        // Ẩn tất cả các tab
                        document.querySelectorAll('.dashboard-content-panel').forEach(panel => {
                            panel.classList.add('d-none');
                        });
                        
                        // Hiển thị tab mục tiêu
                        const tabMap = {
                            'profile': 'profileTab',
                            'security': 'securityTab'
                        };
                        const targetTabId = tabMap[linkTab] || 'profileTab';
                        const targetTab = document.getElementById(targetTabId);
                        if (targetTab) {
                            targetTab.classList.remove('d-none');
                        }
                        
                        // Cập nhật trạng thái active
                        navLinks.forEach(l => l.classList.remove('active'));
                        link.classList.add('active');
                    });
                }
            } 
            // Kiểm tra các trang khác
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
