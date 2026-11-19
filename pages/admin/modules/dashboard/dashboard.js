/**
 * MODULE DASHBOARD COORDINATOR (PAWPAL ADMIN)
 * Quản lý 2 subtabs theo đặc tả chuẩn:
 *   + subtabs/tab-dashboard-business.js (Kinh doanh và tăng trưởng)
 *   + subtabs/tab-dashboard-operations.js (Quản trị vận hành)
 *   + subtabs/business-metrics.js (Lớp tính toán số liệu kinh doanh)
 *   + subtabs/operations-metrics.js (Lớp tính toán số liệu vận hành)
 */
(function initDashboardCoordinator() {
    'use strict';

    window.PawpalDashboard = window.PawpalDashboard || {};
    const subtabs = window.PawpalDashboard.subtabs = window.PawpalDashboard.subtabs || {};

    async function initDashboard(options = {}) {
        document.body.classList.add('dashboard-active');
        const activeSubtab = sessionStorage.getItem('pawpal_admin_dashboard_subtab') || 'tab-dashboard-business';
        if (activeSubtab === 'tab-dashboard-operations') {
            subtabs.business?.unmount?.();
            const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
            if (opsRoot && (subtabs.operations?.mount || window.PawpalOperationsDashboard?.mount)) {
                await (subtabs.operations?.mount || window.PawpalOperationsDashboard.mount)(opsRoot);
            }
        } else {
            subtabs.operations?.unmount?.();
            const biz = subtabs.business || window.PawpalBusinessDashboard;
            if (biz?.init) {
                await biz.init(options);
            }
        }
    }

    async function refreshDashboard(options = {}) {
        const activeSubtab = sessionStorage.getItem('pawpal_admin_dashboard_subtab') || 'tab-dashboard-business';
        if (activeSubtab === 'tab-dashboard-operations') {
            const ops = subtabs.operations || window.PawpalOperationsDashboard;
            if (ops?.refresh) {
                ops.refresh();
            } else {
                const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
                if (opsRoot && ops?.mount) await ops.mount(opsRoot);
            }
        } else {
            const biz = subtabs.business || window.PawpalBusinessDashboard;
            if (biz?.refresh) {
                await biz.refresh(options);
            } else if (biz?.init) {
                await biz.init(options);
            }
        }
    }

    // Lắng nghe sự kiện chuyển subtab trong Dashboard
    window.addEventListener('admin:subtab-change', async (e) => {
        if (e.detail?.module !== 'Dashboard') return;
        const tabId = e.detail.tabId;
        if (tabId === 'tab-dashboard-operations') {
            subtabs.business?.unmount?.();
            const opsRoot = document.getElementById('subtab-tab-dashboard-operations');
            const ops = subtabs.operations || window.PawpalOperationsDashboard;
            if (opsRoot && ops?.mount) {
                await ops.mount(opsRoot);
            }
        } else if (tabId === 'tab-dashboard-business') {
            subtabs.operations?.unmount?.();
            const biz = subtabs.business || window.PawpalBusinessDashboard;
            if (biz?.init) {
                await biz.init();
            }
        }
    });

    // Lắng nghe sự kiện hiển thị module Dashboard
    window.addEventListener('admin:module-show', async (e) => {
        document.body.classList.toggle('dashboard-active', e.detail?.module === 'Dashboard');
        if (e.detail?.module !== 'Dashboard') {
            subtabs.business?.unmount?.();
            subtabs.operations?.unmount?.();
            return;
        }
        await refreshDashboard();
    });

    // Public API
    Object.assign(window.PawpalDashboard, {
        init: initDashboard,
        refresh: refreshDashboard,
        subtabs
    });

    // Tự khởi động nếu không qua router admin.js
    if (!window._pawpalAdminLoaded && !document.querySelector('.admin-layout')) {
        initDashboard();
    }
})();
