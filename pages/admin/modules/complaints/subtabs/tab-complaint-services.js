// tab-complaint-services.js - Subtab Khiếu nại dịch vụ Pawpal-er
(function() {
    'use strict';

    const PawpalComplaints = window.PawpalComplaints = window.PawpalComplaints || {};
    PawpalComplaints.subtabs = PawpalComplaints.subtabs || {};
    PawpalComplaints.state = PawpalComplaints.state || {
        serviceComplaints: [],
        orderComplaints: [],
        isLoaded: false
    };

    let serviceCurrentPage = 1;
    const ITEMS_PER_PAGE = 10;
    let currentServiceQuickFilter = 'ALL';
    let currentServiceKpiFilter = 'ALL';
    let lastFilteredServices = [];
    function syncServiceControls(){
        const status=document.getElementById('serviceFilterStatus')?.value||'ALL',priority=document.getElementById('serviceFilterPriority')?.value||'ALL',staff=document.getElementById('serviceFilterStaff')?.value||'ALL';
        document.querySelectorAll('[data-service-kpi]').forEach(card=>{card.classList.toggle('active',card.dataset.serviceKpi===currentServiceKpiFilter);});
        const all=currentServiceQuickFilter==='ALL'&&currentServiceKpiFilter==='ALL'&&status==='ALL'&&priority==='ALL'&&staff==='ALL';
        document.querySelectorAll('#serviceQuickChips [data-filter]').forEach(button=>button.classList.toggle('active',button.dataset.filter===currentServiceQuickFilter&&(currentServiceQuickFilter!=='ALL'||all)));
    }
    function changeServiceDropdown(){
        currentServiceQuickFilter='ALL';
        const status=document.getElementById('serviceFilterStatus').value,priority=document.getElementById('serviceFilterPriority').value;
        currentServiceKpiFilter=priority==='high_open'&&status==='ALL'?'high':['new','processing','waiting_customer'].includes(status)?status:'ALL';
        if(status==='waiting_manager_approval')currentServiceQuickFilter='WAITING_MANAGER';
        if(status==='reprocessing')currentServiceQuickFilter='REPROCESSING';
        if(status==='ALL'&&priority==='high_open')currentServiceQuickFilter='HIGH';
        syncServiceControls();serviceCurrentPage=1;renderServiceComplaintsTable();
    }

    function sanitizeCsvCell(val) {
        if (val === null || val === undefined) return '""';
        let str = String(val);
        if (/^[=+\-@]/.test(str)) {
            str = "'" + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function sortComplaintsByUrgencyAndSla(a, b) {
        const priorityOrder = { 'khan_cap': 1, 'urgent': 1, 'cao': 2, 'high': 2, 'trung_binh': 3, 'medium': 3, 'binh_thuong': 3, 'thap': 4, 'low': 4 };
        const pA = priorityOrder[String(a.priority || '').toLowerCase()] || 4;
        const pB = priorityOrder[String(b.priority || '').toLowerCase()] || 4;
        if (pA !== pB) return pA - pB;
        if (a.slaStatus === 'OVERDUE' && b.slaStatus !== 'OVERDUE') return -1;
        if (b.slaStatus === 'OVERDUE' && a.slaStatus !== 'OVERDUE') return 1;
        return new Date(b.createdAtRaw || 0) - new Date(a.createdAtRaw || 0);
    }

    function renderServicePagination(totalPages) {
        const pagContainer = document.getElementById('servicePagination');
        if (!pagContainer) return;

        if (totalPages <= 0) {
            pagContainer.style.display = 'none';
            pagContainer.innerHTML = '';
            return;
        }

        pagContainer.style.display = 'flex';
        let html = '';
        const prevDisabled = serviceCurrentPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === serviceCurrentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = serviceCurrentPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (serviceCurrentPage > 1) {
                        serviceCurrentPage--;
                        renderServiceComplaintsTable();
                    }
                } else if (pageAction === 'next') {
                    if (serviceCurrentPage < totalPages) {
                        serviceCurrentPage++;
                        renderServiceComplaintsTable();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== serviceCurrentPage) {
                        serviceCurrentPage = targetP;
                        renderServiceComplaintsTable();
                    }
                }
            });
        });
    }

    let serviceRenderSequence = 0;
    let serviceServerFilters = {};
    async function renderServiceComplaintsTable() {
        const tbody = document.getElementById('serviceComplaintsTableBody');
        if (!tbody) return;
        if (PawpalComplaints.state?.loadError) { delete tbody.dataset.loadingSkeleton; renderServicePagination(0); tbody.innerHTML='<tr><td colspan="12" style="padding:28px;text-align:center;">Không thể tải khiếu nại. Vui lòng tải lại trang.</td></tr>';return; }
        if (!PawpalComplaints.state?.isLoaded) return;
        if (!document.getElementById('subtab-tab-complaint-services')?.classList.contains('active')) return;
        const version = ++serviceRenderSequence;
        delete tbody.dataset.loadingSkeleton;

        tbody.innerHTML = '';

        const serviceComplaints = PawpalComplaints.state?.serviceComplaints || [];
        const searchInput = document.getElementById('serviceSearchInput');
        const categorySelect = document.getElementById('serviceFilterCategory');
        const statusSelect = document.getElementById('serviceFilterStatus');
        const prioritySelect = document.getElementById('serviceFilterPriority');
        const staffSelect = document.getElementById('serviceFilterStaff');

        const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().replace(/\s+/g,' ') : '';
        const selectedCat = categorySelect ? categorySelect.value : 'ALL';
        const selectedStatus = statusSelect ? statusSelect.value : 'ALL';
        const selectedPriority = prioritySelect ? prioritySelect.value : 'ALL';
        const selectedStaff = staffSelect ? staffSelect.value : 'ALL';

        serviceServerFilters = { query: searchTerm, status: selectedStatus, priority: selectedPriority, staff: selectedStaff, quick: currentServiceQuickFilter, category: selectedCat, kpi: currentServiceKpiFilter };
        let serverPage;
        try {
            serverPage = await PawpalComplaints.ensureComplaintPage('service', serviceServerFilters, serviceCurrentPage);
            if (version !== serviceRenderSequence) return;
            serviceCurrentPage = serverPage.page;
        } catch (error) {
            if (version !== serviceRenderSequence) return;
            tbody.innerHTML = '<tr><td colspan="12">Không tải được danh sách khiếu nại. Vui lòng làm mới.</td></tr>';
            renderServicePagination(0);
            return;
        }
        const byId=new Map((PawpalComplaints.state.serviceComplaints||[]).map(item=>[item.rawId,item]));
        const filtered=serverPage.pageIds.map(id=>byId.get(id)).filter(Boolean);
        lastFilteredServices = filtered;

        const totalPages = Math.ceil(serverPage.total / ITEMS_PER_PAGE);
        if (serviceCurrentPage > totalPages) serviceCurrentPage = totalPages || 1;
        if (serviceCurrentPage < 1) serviceCurrentPage = 1;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không tìm thấy khiếu nại dịch vụ nào phù hợp với điều kiện lọc hiện tại.
                        <button type="button" id="btnResetServiceComplaintFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetServiceComplaintFilters')?.addEventListener('click', clearServiceFilters);
            renderServicePagination(0);
            return;
        }

        const startIndex = (serviceCurrentPage - 1) * ITEMS_PER_PAGE;
        const pageList = filtered;

        tbody.innerHTML = pageList.map(item => {
            let priorityBadge = '';
            if (item.priority === 'khan_cap') priorityBadge = '<span class="admin-badge priority-chip priority-critical">Khẩn cấp</span>';
            else if (item.priority === 'high') priorityBadge = '<span class="admin-badge priority-chip priority-high">Cao</span>';
            else priorityBadge = `<span class="admin-badge priority-chip ${item.priority === 'low' ? 'priority-low' : 'priority-medium'}">${item.priority === 'low' ? 'Thấp' : 'Trung bình'}</span>`;

            let statusBadge = '';
            if (item.status === 'open' || item.status === 'new') statusBadge = '<span class="admin-badge badge-warning">Chưa xử lý</span>';
            else if (item.status === 'in_progress' || item.status === 'processing') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
            else if (item.status === 'waiting_customer') statusBadge = '<span class="admin-badge badge-neutral">Chờ khách</span>';
            else if (item.status === 'waiting_manager_approval') statusBadge = '<span class="admin-badge badge-warning">Chờ duyệt</span>';
            else if (item.status === 'reprocessing') statusBadge = '<span class="admin-badge badge-danger">Xử lý lại</span>';
            else if (item.status === 'closed') statusBadge = '<span class="admin-badge badge-neutral">Đã đóng</span>';
            else if (item.status === 'resolved') statusBadge = '<span class="admin-badge badge-success">Đã giải quyết</span>';
            else statusBadge = '<span class="admin-badge badge-neutral">Đang xử lý</span>';

            let slaClass = 'sla-normal';
            if (item.slaStatus === 'OVERDUE') slaClass = 'sla-overdue';
            else if (item.slaStatus === 'URGENT') slaClass = 'sla-urgent';
            else if (item.slaStatus === 'DONE') slaClass = 'sla-done';
            const slaBadge = `<span class="sla-badge ${slaClass}">${escapeHtml(item.slaRemainingText || 'Bình thường')}</span>`;

            const alertBorderClass = (['high','khan_cap'].includes(item.priority) || item.slaStatus === 'OVERDUE') ? 'row-alert-danger' : '';

            return `
                <tr class="${alertBorderClass}" data-ticket-id="${item.id}">
                    <td style="font-weight: 600; white-space: nowrap;">
                        <a href="javascript:void(0)" class="user-link-text btn-open-complaint-detail" data-ticket-id="${item.id}">${item.id}</a>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main); white-space: nowrap;">${escapeHtml(item.customerName)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(item.phone || '')}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500; white-space: nowrap;">${escapeHtml(item.petName || '—')}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); white-space: nowrap;">${escapeHtml(item.petBreed || '')}</div>
                    </td>
                    <td>
                        <span style="font-weight: 500; color: var(--text-muted); font-size: 12px; white-space: nowrap;">${escapeHtml(item.bookingId || '—')}</span>
                    </td>
                    <td>
                        <div style="font-weight: 500; max-width: 170px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.serviceName || item.serviceType || 'Dịch vụ')}">${escapeHtml(item.serviceName || item.serviceType || 'Dịch vụ')}</div>
                    </td>
                    <td style="max-width: 240px;">
                        <div style="font-weight: 600; color: var(--text-heading); font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
                        <div style="color: var(--text-muted); font-size: 11.5px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(item.content || '')}">${escapeHtml(item.content || '').substring(0, 60)}...</div>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">${priorityBadge}</td>
                    <td style="text-align: center; white-space: nowrap;">${slaBadge}</td>
                    <td style="white-space: nowrap;">${escapeHtml(item.staffAssigned || 'Chưa phân công')}</td>
                    <td style="white-space: nowrap; font-size: 12px; color: var(--text-muted);">${item.createdAt || '—'}</td>
                    <td style="text-align: center; white-space: nowrap;">${statusBadge}</td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-complaint-detail" data-ticket-id="${item.id}">Xử lý</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderServicePagination(totalPages);
        attachDetailEvents();
    }

    function clearServiceFilters() {
        const searchInput = document.getElementById('serviceSearchInput');
        const categorySelect = document.getElementById('serviceFilterCategory');
        const statusSelect = document.getElementById('serviceFilterStatus');
        const prioritySelect = document.getElementById('serviceFilterPriority');
        const staffSelect = document.getElementById('serviceFilterStaff');

        if (searchInput) searchInput.value = '';
        if (categorySelect) categorySelect.value = 'ALL';
        if (statusSelect) statusSelect.value = 'ALL';
        if (prioritySelect) prioritySelect.value = 'ALL';
        if (staffSelect) staffSelect.value = 'ALL';

        currentServiceQuickFilter = 'ALL';
        currentServiceKpiFilter = 'ALL';
        syncServiceControls();
        serviceCurrentPage = 1;
        renderServiceComplaintsTable();
    }

    function attachDetailEvents() {
        document.querySelectorAll('.btn-open-complaint-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const ticketId = btn.getAttribute('data-ticket-id');
                if (ticketId && PawpalComplaints.openTicketDetail) {
                    PawpalComplaints.openTicketDetail(ticketId);
                }
            });
        });
    }

    function renderComplaintsAlertBar() {
        const bar = document.getElementById('complaintsAlertBar');
        if (!bar) return;

        const serviceComplaints = PawpalComplaints.state?.serviceComplaints || [];
        const orderComplaints = PawpalComplaints.state?.orderComplaints || [];
        const all = [...serviceComplaints, ...orderComplaints];

        const urgentTickets = all.filter(t => ['high','khan_cap'].includes(t.priority) || t.slaStatus === 'OVERDUE');
        if (urgentTickets.length === 0) {
            bar.style.display = 'none';
            return;
        }

        bar.style.display = 'flex';
        const container = bar.querySelector('.complaints-alert-items');
        if (container) {
            container.innerHTML = urgentTickets.map(t => `
                <div class="alert-item-tag" data-ticket-id="${t.id}">
                    <strong>${t.id}</strong>: ${escapeHtml(t.customerName)} (${t.slaStatus === 'OVERDUE' ? 'Quá hạn SLA' : 'Khẩn cấp'})
                </div>
            `).join('');
        }
    }

    let isServicesInitialized = false;
    function initServiceComplaintsSubtab() {
        if (isServicesInitialized) return;
        isServicesInitialized = true;
        const searchInput = document.getElementById('serviceSearchInput');
        let serviceSearchTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(serviceSearchTimer);
                serviceSearchTimer = setTimeout(() => {
                    serviceCurrentPage = 1;
                    renderServiceComplaintsTable();
                }, 300);
            });
        }

        const categorySelect = document.getElementById('serviceFilterCategory');
        if (categorySelect) categorySelect.addEventListener('change', () => { serviceCurrentPage = 1; renderServiceComplaintsTable(); });

        const statusSelect = document.getElementById('serviceFilterStatus');
        if (statusSelect) statusSelect.addEventListener('change', changeServiceDropdown);

        const prioritySelect = document.getElementById('serviceFilterPriority');
        if (prioritySelect) prioritySelect.addEventListener('change', changeServiceDropdown);

        const staffSelect = document.getElementById('serviceFilterStaff');
        if (staffSelect) staffSelect.addEventListener('change', changeServiceDropdown);

        document.querySelectorAll('[data-service-kpi]').forEach(card=>{
            if(card.dataset.serviceKpi==='overdue'){card.setAttribute('aria-disabled','true');card.title='Chưa cấu hình hạn xử lý khiếu nại.';return;}
            card.addEventListener('click',()=>{
                const value=card.dataset.serviceKpi;currentServiceKpiFilter=value;currentServiceQuickFilter=value==='high'?'HIGH':'ALL';
                statusSelect.value=value==='high'?'ALL':value;prioritySelect.value=value==='high'?'high_open':'ALL';staffSelect.value='ALL';
                syncServiceControls();serviceCurrentPage=1;renderServiceComplaintsTable();
            });
        });
        document.querySelectorAll('#serviceQuickChips [data-filter]').forEach(button=>{
            if(button.dataset.filter==='OVERDUE'){button.disabled=true;button.title='Chưa cấu hình hạn xử lý khiếu nại.';return;}
            button.addEventListener('click',()=>{
                const value=button.dataset.filter;if(value==='ALL'){clearServiceFilters();return;}
                currentServiceQuickFilter=value;currentServiceKpiFilter=value==='HIGH'?'high':'ALL';
                statusSelect.value=({WAITING_MANAGER:'waiting_manager_approval',REPROCESSING:'reprocessing'})[value]||'ALL';prioritySelect.value=value==='HIGH'?'high_open':'ALL';staffSelect.value=value==='UNASSIGNED'?'Chưa phân công':'ALL';
                syncServiceControls();serviceCurrentPage=1;renderServiceComplaintsTable();
            });
        });

        // Nút xuất file CSV
        const btnExport = document.getElementById('btnExportServiceComplaints');
        if (btnExport) {
            btnExport.addEventListener('click', async () => {
                if (btnExport.disabled) return;
                btnExport.disabled = true;
                try {
                const exportList = await PawpalComplaints.exportComplaintRows('service', serviceServerFilters);
                const headers = ['Mã ticket', 'Thời gian', 'Khách hàng', 'Số điện thoại', 'Dịch vụ', 'Nội dung', 'Mức độ', 'Trạng thái', 'Người phụ trách'];
                const rows = exportList.map(t => [
                    sanitizeCsvCell(t.id),
                    sanitizeCsvCell(t.createdAt),
                    sanitizeCsvCell(t.customerName),
                    sanitizeCsvCell(t.phone),
                    sanitizeCsvCell(t.serviceName),
                    sanitizeCsvCell(t.title),
                    sanitizeCsvCell(t.priority),
                    sanitizeCsvCell(t.status),
                    sanitizeCsvCell(t.staffAssigned)
                ]);

                const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                link.setAttribute('href', url);
                link.setAttribute('download', `khieu_nai_dich_vu_pawpal_${dateStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                PawpalComplaints.showToast(`Đã xuất thành công ${exportList.length} khiếu nại dịch vụ sang file CSV!`);
                } catch (error) {
                    PawpalComplaints.showToast('Không xuất được danh sách. Vui lòng thử lại.', 'danger');
                } finally { btnExport.disabled = false; }
            });
        }

        renderServiceComplaintsTable();
        renderComplaintsAlertBar();
    }

    PawpalComplaints.subtabs.services = {
        init: initServiceComplaintsSubtab,
        renderServiceComplaintsTable,
        renderComplaintsAlertBar,
        clearServiceFilters
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServiceComplaintsSubtab);
    } else {
        initServiceComplaintsSubtab();
    }
})();
