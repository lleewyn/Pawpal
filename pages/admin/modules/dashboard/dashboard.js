/**
 * MODULE DASHBOARD COORDINATOR (PAWPAL ADMIN)
 * Tuân thủ mô hình module chuẩn của Pawpal Admin (tương tự customers.js, orders.js):
 * - Quản lý cấu trúc subtabs:
 *   + subtabs/business-metrics.js (Dữ liệu kinh doanh)
 *   + subtabs/tab-dashboard-business.js (Kinh doanh và tăng trưởng)
 *   + subtabs/tab-dashboard-operations.js (Quản trị vận hành)
 *   + subtabs/operations-metrics.js (Lớp tính toán số liệu vận hành)
 * - Điều phối vòng đời nạp/hủy/làm mới và đồng bộ subtab qua admin.js
 */
(function initDashboardCoordinator() {
    'use strict';

    window.PawpalDashboard = window.PawpalDashboard || {};
    const subtabs = window.PawpalDashboard.subtabs = window.PawpalDashboard.subtabs || {};

    async function initDashboard(options = {}) {
        const activeSubtab = sessionStorage.getItem('pawpal_admin_dashboard_subtab') || 'tab-dashboard';
        if (activeSubtab === 'tab-dashboard-operations') {
            subtabs.overview?.unmount?.();
            const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
            if (opsRoot && (subtabs.operations?.mount || window.PawpalOperationsDashboard?.mount)) {
                await (subtabs.operations?.mount || window.PawpalOperationsDashboard.mount)(opsRoot);
            }
        } else {
            subtabs.operations?.unmount?.();
            const overview = subtabs.overview || window.PawpalDashboardOverview;
            if (overview?.init) {
                await overview.init(options);
            }
        }
    }

    async function refreshDashboard(options = {}) {
        const activeSubtab = sessionStorage.getItem('pawpal_admin_dashboard_subtab') || 'tab-dashboard';
        if (activeSubtab === 'tab-dashboard-operations') {
            const ops = subtabs.operations || window.PawpalOperationsDashboard;
            if (ops?.refresh) {
                ops.refresh();
            } else {
                const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
                if (opsRoot && ops?.mount) await ops.mount(opsRoot);
            }
        } else {
            const overview = subtabs.overview || window.PawpalDashboardOverview;
            if (overview?.refresh) {
                await overview.refresh(options);
            }
        }
    }

    // Lắng nghe sự kiện chuyển subtab trong Dashboard
    window.addEventListener('admin:subtab-change', async (e) => {
        if (e.detail?.module !== 'Dashboard') return;
        const tabId = e.detail.tabId;
        if (tabId === 'tab-dashboard-operations') {
            subtabs.overview?.unmount?.();
            const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
            const ops = subtabs.operations || window.PawpalOperationsDashboard;
            if (opsRoot && ops?.mount) {
                await ops.mount(opsRoot);
            }
        } else if (tabId === 'tab-dashboard') {
            subtabs.operations?.unmount?.();
            const overview = subtabs.overview || window.PawpalDashboardOverview;
            if (overview?.init) {
                await overview.init();
            }
        }
    });

    // Lắng nghe sự kiện hiển thị module Dashboard
    window.addEventListener('admin:module-show', async (e) => {
        if (e.detail?.module !== 'Dashboard') {
            subtabs.overview?.unmount?.();
            return;
        }
        // A cached DOM may have been detached; remount listeners before refreshing.
        if ((sessionStorage.getItem('pawpal_admin_dashboard_subtab') || 'tab-dashboard') === 'tab-dashboard') {
            await (subtabs.overview || window.PawpalDashboardOverview)?.init?.();
            return;
        }
        await refreshDashboard();
    });

    // Ủy quyền các hàm public API về Overview subtab (đảm bảo tương thích 100% với router admin.js và các bài kiểm thử)
    Object.assign(window.PawpalDashboard, {
        init: initDashboard,
        refresh: refreshDashboard,
        subtabs,
        loadDashboardData: (opts) => (subtabs.overview || window.PawpalDashboardOverview)?.loadDashboardData?.(opts),
        getLastUpdatedTime: () => (subtabs.overview || window.PawpalDashboardOverview)?.getLastUpdatedTime?.() || 'Chưa cập nhật',
        renderDashboardKPIs: () => (subtabs.overview || window.PawpalDashboardOverview)?.renderDashboardKPIs?.(),
        renderDashboardStockList: () => (subtabs.overview || window.PawpalDashboardOverview)?.renderDashboardStockList?.(),
        renderRevenueChart: () => (subtabs.overview || window.PawpalDashboardOverview)?.renderRevenueChart?.(),
        setupDashboardCalendar: () => (subtabs.overview || window.PawpalDashboardOverview)?.setupDashboardCalendar?.()
    });

    // Tự khởi động nếu không qua router admin.js
    if (!window._pawpalAdminLoaded && !document.querySelector('.admin-layout')) {
        initDashboard();
    }
})();
