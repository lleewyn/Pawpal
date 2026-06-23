// Authentication Guard
(function () {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
    if (!currentUser) {
        alert('Vui lòng đăng nhập để truy cập trang này');
        window.location.href = '/pages/public/login/login.html';
        return;
    }
})();

// Load sidebar synchronously if #user-sidebar exists
(function loadSidebar() {
    const sidebarContainer = document.getElementById('user-sidebar');
    if (!sidebarContainer) return;

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '../../components/user-sidebar.html', false);
        xhr.send();
        if (xhr.status === 200) {
            sidebarContainer.innerHTML = xhr.responseText;
        } else {
            sidebarContainer.innerHTML = '<div class="dashboard-sidebar"><p class="text-center p-4 text-muted">Không tải được thanh điều hướng.</p></div>';
            console.warn('[dashboard-init] Không thể tải sidebar:', xhr.status, xhr.statusText);
        }
    } catch (error) {
        sidebarContainer.innerHTML = '<div class="dashboard-sidebar"><p class="text-center p-4 text-muted">Không tải được thanh điều hướng.</p></div>';
        console.warn('[dashboard-init] Lỗi tải sidebar:', error);
    }
})();
