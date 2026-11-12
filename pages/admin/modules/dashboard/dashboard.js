/**
 * MODULE DASHBOARD COORDINATOR (PAWPAL ADMIN)
 * Tuân thủ mô hình module chuẩn của Pawpal Admin (tương tự customers.js, orders.js):
 * - Quản lý cấu trúc 3 subtabs:
 *   + subtabs/tab-dashboard-overview.js (Tổng quan)
 *   + subtabs/tab-dashboard-operations.js (Quản trị vận hành)
 *   + subtabs/tab-dashboard-business.js (Kinh doanh và tăng trưởng)
 *   + subtabs/operations-metrics.js (Lớp tính toán số liệu vận hành)
 *   + subtabs/business-metrics.js (Lớp tính toán số liệu kinh doanh)
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
            subtabs.business?.unmount?.();
            const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
            if (opsRoot && (subtabs.operations?.mount || window.PawpalOperationsDashboard?.mount)) {
                await (subtabs.operations?.mount || window.PawpalOperationsDashboard.mount)(opsRoot);
            }
        } else if (activeSubtab === 'tab-dashboard-business') {
            subtabs.overview?.unmount?.();
            subtabs.operations?.unmount?.();
            const biz = subtabs.business || window.PawpalBusinessDashboard;
            if (biz?.init) {
                await biz.init(options);
            }
        } else {
            subtabs.operations?.unmount?.();
            subtabs.business?.unmount?.();
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
        } else if (activeSubtab === 'tab-dashboard-business') {
            const biz = subtabs.business || window.PawpalBusinessDashboard;
            if (biz?.refresh) {
                await biz.refresh(options);
            } else if (biz?.init) {
                await biz.init(options);
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
            subtabs.business?.unmount?.();
            const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
            const ops = subtabs.operations || window.PawpalOperationsDashboard;
            if (opsRoot && ops?.mount) {
                await ops.mount(opsRoot);
            }
        } else if (tabId === 'tab-dashboard-business') {
            subtabs.overview?.unmount?.();
            subtabs.operations?.unmount?.();
            const biz = subtabs.business || window.PawpalBusinessDashboard;
            if (biz?.init) {
                await biz.init();
            }
        } else if (tabId === 'tab-dashboard') {
            subtabs.operations?.unmount?.();
            subtabs.business?.unmount?.();
            // Nếu có overview thì nạp overview; trong môi trường test cô lập nếu chỉ nạp business thì nạp business
            const overview = subtabs.overview || window.PawpalDashboardOverview;
            if (overview?.init && overview !== subtabs.business) {
                await overview.init();
            } else if (subtabs.business?.init) {
                await subtabs.business.init();
            }
        }
    });

    // Lắng nghe sự kiện hiển thị module Dashboard
    window.addEventListener('admin:module-show', async (e) => {
        if (e.detail?.module !== 'Dashboard') {
            subtabs.business?.unmount?.();
            return;
        }
        const activeSubtab = sessionStorage.getItem('pawpal_admin_dashboard_subtab') || 'tab-dashboard';
        if (activeSubtab === 'tab-dashboard-business') {
            await (subtabs.business || window.PawpalBusinessDashboard)?.init?.();
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
