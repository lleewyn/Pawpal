const USER_SAMPLE_SEED_URL = '/data/user-sample-seed.json';

function safeParseJSON(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function readJSONSync(url) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send(null);

        if (xhr.status >= 200 && xhr.status < 300) {
            return safeParseJSON(xhr.responseText, null);
        }
    } catch (error) {
        console.warn('[dashboard-init] Cannot load sample data:', error);
    }

    return null;
}

function seedLocalStorageIfNeeded() {
    const sampleData = readJSONSync(USER_SAMPLE_SEED_URL);
    if (!sampleData) return;

    Object.entries(sampleData).forEach(([key, value]) => {
        const existingRaw = localStorage.getItem(key);
        if (existingRaw === null) {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }

        const parsed = safeParseJSON(existingRaw, null);
        if (Array.isArray(value) && Array.isArray(parsed) && parsed.length === 0) {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }

        if (value && typeof value === 'object' && !Array.isArray(value) && parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });

    if (!localStorage.getItem('pawpal_mock_data_version')) {
        localStorage.setItem('pawpal_mock_data_version', '2026-06-24-user-sample-seed-v1');
    }
}

seedLocalStorageIfNeeded();

// Authentication Guard
(function () {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
    if (!currentUser) {
        alert('Vui long dang nhap de truy cap trang nay');
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
            console.warn('[dashboard-init] Cannot load sidebar:', xhr.status, xhr.statusText);
        }
    } catch (error) {
        sidebarContainer.innerHTML = '<div class="dashboard-sidebar"><p class="text-center p-4 text-muted">Không tải được thanh điều hướng.</p></div>';
        console.warn('[dashboard-init] Sidebar load error:', error);
    }
})();
