// tab-complaint-orders.js - Subtab Khiếu nại đơn hàng Pawpal-er
(function() {
    'use strict';

    const PawpalComplaints = window.PawpalComplaints = window.PawpalComplaints || {};
    PawpalComplaints.subtabs = PawpalComplaints.subtabs || {};

    let orderCurrentPage = 1;
    const ITEMS_PER_PAGE = 10;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderOrderPagination(totalPages) {
        const pagContainer = document.getElementById('orderPagination');
        if (!pagContainer) return;

        if (totalPages <= 0) {
            pagContainer.style.display = 'none';
            pagContainer.innerHTML = '';
            return;
        }

        pagContainer.style.display = 'flex';
        let html = '';
        const prevDisabled = orderCurrentPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === orderCurrentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = orderCurrentPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (orderCurrentPage > 1) {
                        orderCurrentPage--;
                        renderOrderComplaintsTable();
                    }
                } else if (pageAction === 'next') {
                    if (orderCurrentPage < totalPages) {
                        orderCurrentPage++;
                        renderOrderComplaintsTable();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== orderCurrentPage) {
                        orderCurrentPage = targetP;
                        renderOrderComplaintsTable();
                    }
                }
            });
        });
    }

    function renderOrderComplaintsTable() {
        const tbody = document.getElementById('orderComplaintsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const orderComplaints = PawpalComplaints.state?.orderComplaints || [];
        const searchInput = document.getElementById('orderSearchInput');
        const statusSelect = document.getElementById('orderFilterStatus');
        const prioritySelect = document.getElementById('orderFilterPriority');

        const searchTerm = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
        const selectedStatus = statusSelect ? statusSelect.value : 'ALL';
        const selectedPriority = prioritySelect ? prioritySelect.value : 'ALL';

        const filtered = orderComplaints.filter(item => {
            if (searchTerm) {
                const match = (item.id && item.id.toLowerCase().includes(searchTerm)) ||
                              (item.customerName && item.customerName.toLowerCase().includes(searchTerm)) ||
                              (item.phone && item.phone.toLowerCase().includes(searchTerm)) ||
                              (item.orderId && item.orderId.toLowerCase().includes(searchTerm)) ||
                              (item.title && item.title.toLowerCase().includes(searchTerm)) ||
                              (item.content && item.content.toLowerCase().includes(searchTerm));
                if (!match) return false;
            }

            if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;
            if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;

            return true;
        });

        const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
        if (orderCurrentPage > totalPages) orderCurrentPage = totalPages || 1;
        if (orderCurrentPage < 1) orderCurrentPage = 1;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không tìm thấy khiếu nại đơn hàng nào phù hợp với điều kiện lọc hiện tại.
                        <button type="button" id="btnResetOrderComplaintFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetOrderComplaintFilters')?.addEventListener('click', clearOrderFilters);
            renderOrderPagination(0);
            return;
        }

        const startIndex = (orderCurrentPage - 1) * ITEMS_PER_PAGE;
        const pageList = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        tbody.innerHTML = pageList.map(item => {
            let priorityBadge = '';
            if (item.priority === 'high') priorityBadge = '<span class="admin-badge badge-danger">Khẩn cấp</span>';
            else if (item.priority === 'medium') priorityBadge = '<span class="admin-badge badge-warning">Ưu tiên cao</span>';
            else priorityBadge = '<span class="admin-badge badge-neutral">Bình thường</span>';

            let statusBadge = '';
            if (item.status === 'open') statusBadge = '<span class="admin-badge badge-warning">Chờ tiếp nhận</span>';
            else if (item.status === 'in_progress') statusBadge = '<span class="admin-badge badge-info">Đang xử lý</span>';
            else if (item.status === 'resolved' || item.status === 'closed') statusBadge = '<span class="admin-badge badge-success">Đã giải quyết</span>';
            else statusBadge = '<span class="admin-badge badge-neutral">Đang xử lý</span>';

            const alertBorderClass = (item.priority === 'high' || item.slaStatus === 'OVERDUE') ? 'row-alert-danger' : '';

            return `
                <tr class="${alertBorderClass}" data-ticket-id="${item.id}">
                    <td style="font-weight: 600;">
                        <a href="javascript:void(0)" class="user-link-text btn-open-order-complaint-detail" data-ticket-id="${item.id}">${item.id}</a>
                    </td>
                    <td>${item.createdAt || '—'}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.customerName)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.phone || ''}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">Mã đơn: ${item.orderId || '—'}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.paymentMethod || 'COD'}</div>
                    </td>
                    <td style="max-width: 260px; font-size: 12.5px;">
                        <div style="font-weight: 600; color: var(--text-heading);">${escapeHtml(item.title)}</div>
                        <div style="color: var(--text-muted); font-size: 11.5px; margin-top: 2px;">${escapeHtml(item.content || '').substring(0, 60)}...</div>
                    </td>
                    <td style="text-align: center;">${priorityBadge}</td>
                    <td style="text-align: center;">${statusBadge}</td>
                    <td>${item.staffAssigned || 'Chưa phân công'}</td>
                    <td style="text-align: center;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-order-complaint-detail" data-ticket-id="${item.id}">Xử lý</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderOrderPagination(totalPages);
        attachOrderEvents();
    }

    function attachOrderEvents() {
        document.querySelectorAll('.btn-open-order-complaint-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const ticketId = btn.getAttribute('data-ticket-id');
                if (ticketId && PawpalComplaints.openTicketDetail) {
                    PawpalComplaints.openTicketDetail(ticketId);
                }
            });
        });
    }

    function initOrderComplaintsSubtab() {
        const searchInput = document.getElementById('orderSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                orderCurrentPage = 1;
                renderOrderComplaintsTable();
            });
        }

        const statusSelect = document.getElementById('orderFilterStatus');
        if (statusSelect) statusSelect.addEventListener('change', () => { orderCurrentPage = 1; renderOrderComplaintsTable(); });

        const prioritySelect = document.getElementById('orderFilterPriority');
        if (prioritySelect) prioritySelect.addEventListener('change', () => { orderCurrentPage = 1; renderOrderComplaintsTable(); });

        // Nút xuất file CSV
        const btnExport = document.getElementById('btnExportOrderComplaints');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const orderComplaints = PawpalComplaints.state?.orderComplaints || [];
                const headers = ['Mã ticket', 'Thời gian', 'Khách hàng', 'Số điện thoại', 'Mã đơn hàng', 'Nội dung', 'Mức độ', 'Trạng thái', 'Người phụ trách'];
                const rows = orderComplaints.map(t => [
                    `"${t.id || ''}"`,
                    `"${t.createdAt || ''}"`,
                    `"${t.customerName || ''}"`,
                    `"${t.phone || ''}"`,
                    `"${t.orderId || ''}"`,
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
                link.setAttribute('download', `khieu_nai_don_hang_pawpal_${dateStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                PawpalComplaints.showToast('Đã xuất thành công dữ liệu khiếu nại đơn hàng sang file CSV!');
            });
        }

        renderOrderComplaintsTable();
    }

    PawpalComplaints.subtabs.orders = {
        init: initOrderComplaintsSubtab,
        renderOrderComplaintsTable
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOrderComplaintsSubtab);
    } else {
        initOrderComplaintsSubtab();
    }
})();
