// tab-settings-audit.js - Subtab Nhật ký Cấu hình và Khóa SSOT (audit_log Supabase)
(function() {
    'use strict';

    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};

    let auditPage = 1;
    const SETTINGS_PAGE_SIZE = 10;

    function renderSettingsPager(containerId, page, totalPages, onChange) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (totalPages < 1) { el.innerHTML = ''; return; }
        el.innerHTML = `<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-p="prev">&lt;</button>${Array.from({length: totalPages}, (_, i) => `<button class="pagination-btn ${i + 1 === page ? 'active' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('')}<button class="pagination-btn" ${page === totalPages ? 'disabled' : ''} data-p="next">&gt;</button>`;
        el.querySelectorAll('[data-p]').forEach(btn => btn.addEventListener('click', () => {
            const p = btn.dataset.p;
            onChange(p === 'prev' ? page - 1 : p === 'next' ? page + 1 : Number(p));
        }));
    }

    function renderAuditLogs() {
        const tbody = document.getElementById('auditLogTableBody');
        if (!tbody) return;

        const auditLogsList = PawpalSettings.state?.auditLogsList || [];
        const isSafeModeLocked = PawpalSettings.state?.isSafeModeLocked;

        const totalLogs = auditLogsList.length;
        const syncedLogs = auditLogsList.filter(l => l.status === 'Đã đồng bộ SSOT').length;
        const lastMod = auditLogsList[0]?.targetModules || 'Chưa có';

        const totalEl = document.getElementById('statTotalAuditLogs');
        const syncedEl = document.getElementById('statSyncedAuditLogs');
        const lastModEl = document.getElementById('statLastModule');
        const safeModeEl = document.getElementById('statSafeModeStatus');

        if (totalEl) totalEl.textContent = totalLogs;
        if (syncedEl) syncedEl.textContent = syncedLogs;
        if (lastModEl) lastModEl.textContent = lastMod;
        if (safeModeEl) {
            safeModeEl.textContent = isSafeModeLocked ? 'Đang bật' : 'Đã mở';
            safeModeEl.className = isSafeModeLocked ? 'kpi-val text-warning' : 'kpi-val text-success';
        }

        const keyword = (document.getElementById('searchAuditLogInput')?.value || '').toLowerCase().trim();
        const targetFilter = document.getElementById('filterAuditTargetModule')?.value || 'all';

        const filtered = auditLogsList.filter(log => {
            if (targetFilter !== 'all' && !log.targetModules.includes(targetFilter)) return false;
            if (keyword) {
                return (
                    log.actionText.toLowerCase().includes(keyword) ||
                    log.actor.toLowerCase().includes(keyword) ||
                    log.targetModules.toLowerCase().includes(keyword)
                );
            }
            return true;
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / SETTINGS_PAGE_SIZE));
        auditPage = Math.min(auditPage, totalPages);
        renderSettingsPager('auditPaginationControls', auditPage, totalPages, p => {
            auditPage = p;
            renderAuditLogs();
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy nhật ký thay đổi nào phù hợp.</td></tr>`;
            return;
        }

        filtered.slice((auditPage - 1) * SETTINGS_PAGE_SIZE, auditPage * SETTINGS_PAGE_SIZE).forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-size: 12.5px; color: var(--text-muted);">${log.time}</span></td>
                <td><strong>${log.actor}</strong></td>
                <td><span class="admin-badge badge-neutral">${log.targetModules}</span></td>
                <td><span style="color: var(--text-main); font-weight: 500;">${log.actionText}</span></td>
                <td><span class="admin-badge badge-active">${log.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function initAuditSubtab() {
        // Lọc và tìm kiếm trên Subtab 4: Nhật ký Cấu hình
        document.getElementById('searchAuditLogInput')?.addEventListener('input', () => {
            renderAuditLogs();
        });
        document.getElementById('filterAuditTargetModule')?.addEventListener('change', () => {
            renderAuditLogs();
        });

        // Render ban đầu
        renderAuditLogs();
    }

    PawpalSettings.subtabs.audit = {
        init: initAuditSubtab,
        renderAuditLogs
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuditSubtab);
    } else {
        initAuditSubtab();
    }
})();
