// Authentication Guard
(function () {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
    if (!currentUser) {
        alert('Vui lòng đăng nhập để truy cập trang này');
        window.location.href = '/pages/public/login.html';
        return;
    }
})();

// Load sidebar synchronously if #user-sidebar exists
(function loadSidebar() {
    const sidebarContainer = document.getElementById('user-sidebar');
    if (sidebarContainer) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '../../components/user-sidebar.html', false);
        xhr.send();
        if (xhr.status === 200) {
            sidebarContainer.innerHTML = xhr.responseText;
        }
    }
})();
