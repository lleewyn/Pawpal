// tab-complaint-services.js - Subtab Khiếu nại dịch vụ Pawpal-er
(function() {
    'use strict';

    const PawpalComplaints = window.PawpalComplaints = window.PawpalComplaints || {};
    PawpalComplaints.subtabs = PawpalComplaints.subtabs || {};

    let serviceCurrentPage = 1;
    const ITEMS_PER_PAGE = 10;
    let currentServiceQuickFilter = 'ALL';
    let currentServiceKpiFilter = 'ALL';

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
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        const pA = priorityOrder[a.priority] || 4;
        const pB = priorityOrder[b.priority] || 4;
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

    function renderServiceComplaintsTable() {
        const tbody = document.getElementById('serviceComplaintsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const serviceComplaints = PawpalComplaints.state?.serviceComplaints || [];
        const searchInput = document.getElementById('serviceSearchInput');
        const categorySelect = document.getElementById('serviceFilterCategory');
        const statusSelect = document.getElementById('serviceFilterStatus');
        const prioritySelect = document.getElementById('serviceFilterPriority');
        const staffSelect = document.getElementById('serviceFilterStaff');

        const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
        const selectedCat = categorySelect ? categorySelect.value : 'ALL';
        const selectedStatus = statusSelect ? statusSelect.value : 'ALL';
        const selectedPriority = prioritySelect ? prioritySelect.value : 'ALL';
        const selectedStaff = staffSelect ? staffSelect.value : 'ALL';

        const filtered = serviceComplaints.filter(item => {
            if (searchTerm) {
                const match = (item.id && item.id.toLowerCase().includes(searchTerm)) ||
                              (item.customerName && item.customerName.toLowerCase().includes(searchTerm)) ||
                              (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
                              (item.petName && item.petName.toLowerCase().includes(searchTerm)) ||
                              (item.bookingId && item.bookingId.toLowerCase().includes(searchTerm)) ||
                              (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                              (item.content && item.content.toLowerCase().includes(searchTerm));
                if (!match) return false;
            }

            if (selectedCat !== 'ALL' && item.serviceType !== selectedCat) return false;
            if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
            if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;

            if (selectedStaff !== 'ALL') {
                if (selectedStaff === 'unassigned') {
                    if (item.staffAssigned !== 'Chưa phân công') return false;
                } else if (item.staffAssigned !== selectedStaff) return false;
            }

            if (currentServiceQuickFilter === 'MY' && item.staffAssigned !== 'Lê Lệ Quyên') return false;
            if (currentServiceQuickFilter === 'UNASSIGNED' && item.staffAssigned !== 'Chưa phân công') return false;
            if (currentServiceQuickFilter === 'WAITING_MANAGER' && item.status !== 'waiting_manager_approval') return false;
            if (currentServiceQuickFilter === 'REPROCESSING' && item.status !== 'reprocessing') return false;
            if (currentServiceQuickFilter === 'OVERDUE' && item.slaStatus !== 'OVERDUE') return false;
            if (currentServiceQuickFilter === 'HIGH' && item.priority !== 'high') return false;

            if (currentServiceKpiFilter !== 'ALL') {
                if (currentServiceKpiFilter === 'high') {
                    if (item.priority !== 'high') return false;
                } else if (currentServiceKpiFilter === 'overdue') {
                    if (item.slaStatus !== 'OVERDUE') return false;
                } else if (item.status !== currentServiceKpiFilter) return false;
            }

            return true;
        });

        filtered.sort(sortComplaintsByUrgencyAndSla);

        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
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
        const pageList = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        tbody.innerHTML = pageList.map(item => {
            let priorityBadge = '';
            if (item.priority === 'high') priorityBadge = '<span class="admin-badge badge-danger">Khẩn cấp</span>';
            else if (item.priority === 'medium') priorityBadge = '<span class="admin-badge badge-warning">Ưu tiên cao</span>';
            else priorityBadge = '<span class="admin-badge badge-neutral">Bình thường</span>';

            let statusBadge = '';
            if (item.status === 'open') statusBadge = '<span class="admin-badge badge-warning">Chờ tiếp nhận</span>';
            else if (item.status === 'in_progress') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
            else if (item.status === 'waiting_manager_approval') statusBadge = '<span class="admin-badge badge-warning">Chờ duyệt bồi hoàn</span>';
            else if (item.status === 'resolved' || item.status === 'closed') statusBadge = '<span class="admin-badge badge-success">Đã giải quyết</span>';
            else statusBadge = '<span class="admin-badge badge-neutral">Đang xử lý</span>';

            const alertBorderClass = (item.priority === 'high' || item.slaStatus === 'OVERDUE') ? 'row-alert-danger' : '';

            return `
                <tr class="${alertBorderClass}" data-ticket-id="${item.id}">
                    <td style="font-weight: 600;">
                        <a href="javascript:void(0)" class="user-link-text btn-open-complaint-detail" data-ticket-id="${item.id}">${item.id}</a>
                    </td>
                    <td>${item.createdAt || '—'}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.customerName)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.phone || ''}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${escapeHtml(item.serviceName || item.serviceType || 'Dịch vụ')}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">Mã lịch: ${item.bookingId || '—'}</div>
                    </td>
                    <td style="max-width: 260px; font-size: 12.5px;">
                        <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(item.title)}</div>
                        <div style="color: var(--text-muted); font-size: 11.5px; margin-top: 2px;">${escapeHtml(item.content || '').substring(0, 60)}...</div>
                    </td>
                    <td style="text-align: center;">${priorityBadge}</td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td>${item.staffAssigned || 'Chưa phân công'}</td>
                    <td style="text-align: center;">
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

        const urgentTickets = all.filter(t => t.priority === 'high' || t.slaStatus === 'OVERDUE');
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

    function initServiceComplaintsSubtab() {
        const searchInput = document.getElementById('serviceSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                serviceCurrentPage = 1;
                renderServiceComplaintsTable();
            });
        }

        const categorySelect = document.getElementById('serviceFilterCategory');
        if (categorySelect) categorySelect.addEventListener('change', () => { serviceCurrentPage = 1; renderServiceComplaintsTable(); });

        const statusSelect = document.getElementById('serviceFilterStatus');
        if (statusSelect) statusSelect.addEventListener('change', () => { serviceCurrentPage = 1; renderServiceComplaintsTable(); });

        const prioritySelect = document.getElementById('serviceFilterPriority');
        if (prioritySelect) prioritySelect.addEventListener('change', () => { serviceCurrentPage = 1; renderServiceComplaintsTable(); });

        const staffSelect = document.getElementById('serviceFilterStaff');
        if (staffSelect) staffSelect.addEventListener('change', () => { serviceCurrentPage = 1; renderServiceComplaintsTable(); });

        // Nút xuất file CSV
        const btnExport = document.getElementById('btnExportServiceComplaints');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const serviceComplaints = PawpalComplaints.state?.serviceComplaints || [];
                const headers = ['Mã ticket', 'Thời gian', 'Khách hàng', 'Số điện thoại', 'Dịch vụ', 'Nội dung', 'Mức độ', 'Trạng thái', 'Người phụ trách'];
                const rows = serviceComplaints.map(t => [
                    `"${t.id || ''}"`,
                    `"${t.createdAt || ''}"`,
                    `"${t.customerName || ''}"`,
                    `"${t.phone || ''}"`,
                    `"${t.serviceName || ''}"`,
                    `"${(t.title || '').replace(/"/g, '""')}"`,
                    `"${t.priority || ''}"`,
                    `"${t.status || ''}"`,
                    `"${t.staffAssigned || ''}"`
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
                PawpalComplaints.showToast('Đã xuất thành công dữ liệu khiếu nại dịch vụ sang file CSV!');
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
