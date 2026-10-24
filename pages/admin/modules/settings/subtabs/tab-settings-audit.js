// tab-settings-audit.js - Subtab Nhật ký Cấu hình và Khóa SSOT (audit_log Supabase)
(function() {
    'use strict';

    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};

    let auditPage = 1;
    const SETTINGS_PAGE_SIZE = 10;
    let isAuditInitialized = false;

    function renderSettingsPager(containerId, page, totalPages, onChange) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (totalPages < 1) {
            el.innerHTML = '';
            return;
        }
        el.innerHTML = `
            <button type="button" class="pagination-btn ${page === 1 ? 'disabled' : ''}" ${page === 1 ? 'disabled' : ''} data-p="prev" title="Trang trước">&lt;</button>
            ${Array.from({ length: totalPages }, (_, i) => `<button type="button" class="pagination-btn ${i + 1 === page ? 'active' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('')}
            <button type="button" class="pagination-btn ${page === totalPages ? 'disabled' : ''}" ${page === totalPages ? 'disabled' : ''} data-p="next" title="Trang sau">&gt;</button>
        `;
        el.querySelectorAll('[data-p]').forEach(btn => btn.addEventListener('click', () => {
            const p = btn.dataset.p;
            onChange(p === 'prev' ? page - 1 : p === 'next' ? page + 1 : Number(p));
        }));
    }

    function renderAuditLogs() {
        const tbody = document.getElementById('auditLogTableBody');
        if (!tbody) return;
        if (PawpalSettings.state.loadError) {
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = `<tr><td colspan="${tbody.closest('table').querySelectorAll('thead th').length}" class="settings-table-message settings-table-message--error">Không thể tải dữ liệu cấu hình. Vui lòng tải lại trang.</td></tr>`;
            return;
        }
        if (!PawpalSettings.state.isLoaded) return;
        delete tbody.dataset.loadingSkeleton;

        const auditLogsList = PawpalSettings.state?.auditLogsList || [];
        const isSafeModeLocked = PawpalSettings.state?.isSafeModeLocked;

        const totalLogs = auditLogsList.length;
        const syncedLogs = auditLogsList.filter(l => ['SETTINGS_WRITE','SETTINGS_KNOWLEDGE'].includes(l.action)).length;
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
            if (targetFilter !== 'all' && log.targetModules !== targetFilter && !log.targetModules.includes(targetFilter)) return false;
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
        if (auditPage > totalPages) auditPage = totalPages;
        if (auditPage < 1) auditPage = 1;

        renderSettingsPager('auditPaginationControls', auditPage, totalPages, p => {
            auditPage = p;
            renderAuditLogs();
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="settings-table-message">Không tìm thấy nhật ký thay đổi nào phù hợp.</td></tr>`;
            return;
        }

        const pageItems = filtered.slice((auditPage - 1) * SETTINGS_PAGE_SIZE, auditPage * SETTINGS_PAGE_SIZE);
        const esc = PawpalSettings.escapeHtml || (s => s);
        pageItems.forEach(log => {
            const rawActor = log.actor || 'Quản trị viên';
            const statusStr = log.status || 'Đã ghi nhận';
            let badgeClass = 'badge-active';
            if (statusStr.includes('Thất bại') || statusStr.includes('Lỗi')) {
                badgeClass = 'badge-danger';
            } else if (statusStr.includes('Chờ') || statusStr.includes('Chưa')) {
                badgeClass = 'badge-warning';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="settings-audit-time">${esc(log.time)}</span></td>
                <td>
                    <strong class="settings-audit-actor-name">${esc(rawActor)}</strong>
                </td>
                <td><span class="admin-badge badge-neutral">${esc(log.targetModules)}</span></td>
                <td><span class="settings-audit-action-text">${esc(log.actionText)}</span><details class="settings-audit-details"><summary class="settings-audit-detail-summary">Xem thay đổi</summary><pre class="settings-audit-detail-content">Đang tải…</pre></details></td>
                <td><span class="admin-badge ${badgeClass}">${esc(statusStr)}</span></td>
            `;
            tbody.appendChild(tr);
            const details=tr.querySelector('details');let loaded=false,loading=false;
            details.addEventListener('toggle',async()=>{
                if(!details.open||loaded||loading)return;loading=true;
                try{
                    const {data,error}=await PawpalSettings.getSupabaseClient().from('audit_log').select('description').eq('id',log.id).single();if(error)throw error;
                    details.querySelector('pre').textContent=data.description||'Không có nội dung bổ sung.';loaded=true;
                }catch{details.querySelector('pre').textContent='Chưa tải được nội dung. Đóng và mở lại để thử.';}
                finally{loading=false;}
            });
        });
    }

    function initAuditSubtab() {
        if (isAuditInitialized) {
            renderAuditLogs();
            return;
        }
        isAuditInitialized = true;

        // Lọc và tìm kiếm trên Subtab 4: Nhật ký Cấu hình
        document.getElementById('searchAuditLogInput')?.addEventListener('input', () => {
            auditPage = 1;
            renderAuditLogs();
        });
        document.getElementById('filterAuditTargetModule')?.addEventListener('change', () => {
            auditPage = 1;
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
