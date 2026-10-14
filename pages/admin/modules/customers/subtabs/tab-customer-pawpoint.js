// tab-customer-pawpoint.js - Subtab Quản lý Pawpoint (Khách hàng Pawpal-er)
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};

    let pawpointCurrentPage = 1;
    const PAWPOINT_PAGE_SIZE = 10;
    let selectedAdjustCustomer = null;

    function renderPawpointHistory() {
        const tbody = document.getElementById('pawpointHistoryTbody');
        if (!tbody) return;
        if (!PawpalCustomers.state.hasLoadedCustomers) {
            if (PawpalCustomers.state.listLoadStatus === 'error') {
                delete tbody.dataset.loadingSkeleton;
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Không thể tải lịch sử Pawpoint. Vui lòng tải lại trang.</td></tr>';
            } else if (!tbody.querySelector('.skeleton-row')) {
                window.PawpalAdmin?.renderTableSkeleton?.(tbody, { columns: 5 });
            }
            return;
        }
        delete tbody.dataset.loadingSkeleton;

        const query = (document.getElementById('pawpointSearchInput')?.value || '').trim();
        const filterType = document.getElementById('pawpointFilterType')?.value || 'ALL';
        const historyData = PawpalCustomers.state.pawpointHistory || [];

        const filtered = historyData.filter(item => {
            let matchQuery = !query;
            if (query) {
                const qParts = query.includes(' - ') ? query.split(' - ').map(s => s.trim()) : [query];
                matchQuery = qParts.some(part => 
                    PawpalCustomers.matchSearch(item.custName, part) ||
                    PawpalCustomers.matchSearch(item.phone, part) ||
                    PawpalCustomers.matchSearch(item.reason, part)
                );
            }
            const matchType = (filterType === 'ALL') || (item.type === filterType);
            return matchQuery && matchType;
        });

        const totalPages = Math.max(1, Math.ceil(filtered.length / PAWPOINT_PAGE_SIZE));
        pawpointCurrentPage = Math.min(pawpointCurrentPage, totalPages);
        const pageItems = filtered.slice((pawpointCurrentPage - 1) * PAWPOINT_PAGE_SIZE, pawpointCurrentPage * PAWPOINT_PAGE_SIZE);
        const pager = document.getElementById('pawpointPaginationControls');
        if (pager) {
            pager.innerHTML = filtered.length > 0 ? `<button type="button" class="pagination-btn" ${pawpointCurrentPage === 1 ? 'disabled' : ''} data-pawpoint-page="prev">&lt;</button>${Array.from({length: totalPages}, (_, i) => `<button type="button" class="pagination-btn ${i + 1 === pawpointCurrentPage ? 'active' : ''}" data-pawpoint-page="${i + 1}">${i + 1}</button>`).join('')}<button type="button" class="pagination-btn" ${pawpointCurrentPage === totalPages ? 'disabled' : ''} data-pawpoint-page="next">&gt;</button>` : '';
            pager.querySelectorAll('[data-pawpoint-page]').forEach(btn => btn.addEventListener('click', () => {
                const action = btn.dataset.pawpointPage;
                if (action === 'prev') pawpointCurrentPage = Math.max(1, pawpointCurrentPage - 1);
                else if (action === 'next') pawpointCurrentPage = Math.min(totalPages, pawpointCurrentPage + 1);
                else pawpointCurrentPage = Number(action);
                renderPawpointHistory();
            }));
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">Không tìm thấy lịch sử biến động điểm phù hợp.</td></tr>`;
            return;
        }

        tbody.innerHTML = pageItems.map(item => {
            const sign = item.type === 'ADD' ? '+' : '-';
            const colorClass = item.type === 'ADD' ? 'text-success' : 'text-danger';
            return `
                <tr>
                    <td>${item.time}</td>
                    <td><strong>${item.custName}</strong> <span style="color: var(--text-muted); font-size: 12px;">(${item.phone})</span></td>
                    <td><strong class="${colorClass}">${sign}${item.points} điểm</strong></td>
                    <td>${Number(item.balance).toLocaleString('vi-VN')} điểm</td>
                    <td>${item.reason}</td>
                </tr>
            `;
        }).join('');
    }

    function exportPawpointHistoryToCSV() {
        const query = (document.getElementById('pawpointSearchInput')?.value || '').trim();
        const filterType = document.getElementById('pawpointFilterType')?.value || 'ALL';
        const historyData = PawpalCustomers.state.pawpointHistory || [];
        const filteredHistory = historyData.filter(item => {
            const matchesQuery = !query || [item.custName, item.phone, item.reason].some(value => PawpalCustomers.matchSearch(value, query));
            return matchesQuery && (filterType === 'ALL' || item.type === filterType);
        });
        if (filteredHistory.length === 0) {
            PawpalCustomers.showToast('Không có lịch sử điểm để xuất!', 'warning');
            return;
        }

        const headers = [
            'Mã giao dịch',
            'Thời gian',
            'Mã khách hàng',
            'Tên khách hàng',
            'Số điện thoại',
            'Loại giao dịch',
            'Số điểm',
            'Số dư sau giao dịch',
            'Lý do điều chỉnh'
        ];

        const rows = filteredHistory.map(item => [
            item.id || '',
            item.time || '',
            item.custId || '',
            item.custName || '',
            item.phone || '',
            item.type === 'ADD' ? 'Cộng điểm' : 'Trừ điểm',
            (item.type === 'ADD' ? '+' : '-') + item.points + ' điểm',
            Number(item.balance).toLocaleString('vi-VN') + ' điểm',
            item.reason || ''
        ]);

        const csvRows = [
            headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ];

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `Pawpal_Lich_Su_Pawpoint_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        PawpalCustomers.showToast(`Đã xuất lịch sử ${filteredHistory.length} giao dịch Pawpoint theo bộ lọc hiện tại ra file CSV!`);
    }

    // Helpers truy xuất DOM động (tránh lỗi cache phần tử rỗng khi script tải trước HTML)
    const getAdjustModal = () => document.getElementById('modalAdjustPoints');
    const getAdjustPhoneInput = () => document.getElementById('adjustPhone');
    const getAdjustCustomerDropdown = () => document.getElementById('adjustCustomerDropdown');
    const getAdjustPhoneCustomerHint = () => document.getElementById('adjustPhoneCustomerHint');
    const getAdjustReasonInput = () => document.getElementById('adjustReason');

    function renderAdjustCustomerDropdown(filterText = '') {
        const dropdown = getAdjustCustomerDropdown();
        if (!dropdown) return;
        const q = (filterText || '').toLowerCase().trim();
        const allCustomers = Object.values(PawpalCustomers.state.customerDatabase || {});

        const matches = allCustomers.filter(c => {
            if (!q) return true;
            const name = (c.name || '').toLowerCase();
            const phone = (c.phone || '').replace(/[^0-9]/g, '');
            const cleanQ = q.replace(/[^0-9]/g, '');
            const matchPhone = cleanQ && phone.includes(cleanQ);
            const matchName = name.includes(q);
            const matchPets = (c.pets || []).some(p => (p.name || '').toLowerCase().includes(q));
            return matchName || matchPhone || matchPets;
        }).slice(0, 15);

        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="customer-autocomplete-empty">Không tìm thấy khách hàng phù hợp</div>';
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = '';
        matches.forEach(c => {
            const item = document.createElement('div');
            item.className = 'customer-autocomplete-item';
            const pts = (c.points || 0).toLocaleString('vi-VN');
            const petNames = (c.pets && c.pets.length > 0) ? ` • Bé: ${c.pets.map(p => p.name).join(', ')}` : '';

            item.innerHTML = `
                <div class="customer-autocomplete-info">
                    <div class="customer-autocomplete-meta">
                        <div class="customer-autocomplete-name" style="font-weight: 600; color: #203A2C;">${c.name}</div>
                        <div class="customer-autocomplete-phone" style="color: #4F7A65; font-size: 11.5px;">${c.phone || 'Chưa có SĐT'}${petNames}</div>
                    </div>
                </div>
                <div class="customer-autocomplete-badge">${c.tierName} • ${pts} điểm</div>
            `;

            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                selectAdjustCustomer(c);
            });

            dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
    }

    function clearAdjustCustomerSelection() {
        selectedAdjustCustomer = null;
        const phoneInput = getAdjustPhoneInput();
        if (phoneInput) phoneInput.value = '';
        const hint = getAdjustPhoneCustomerHint();
        if (hint) {
            hint.innerHTML = '';
            hint.style.display = 'none';
        }
        const dropdown = getAdjustCustomerDropdown();
        if (dropdown) dropdown.style.display = 'none';
    }

    function selectAdjustCustomer(cust) {
        selectedAdjustCustomer = cust;
        const phoneInput = getAdjustPhoneInput();
        if (phoneInput) {
            phoneInput.value = `${cust.name} - ${cust.phone}`;
        }
        const hint = getAdjustPhoneCustomerHint();
        if (hint) {
            hint.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        <span>Khách hàng: <strong>${cust.name}</strong> (${cust.tierName})</span>
                        <span style="margin-left: 12px;">Số dư hiện tại: <strong>${(cust.points || 0).toLocaleString('vi-VN')} điểm</strong></span>
                    </div>
                    <button type="button" class="btn-clear-selected-customer" style="background: none; border: none; color: #236B48; font-size: 12px; font-weight: 600; cursor: pointer; padding: 2px 6px;">✕ Bỏ chọn</button>
                </div>
            `;
            hint.style.display = 'flex';
            hint.querySelector('.btn-clear-selected-customer')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAdjustCustomerSelection();
                getAdjustPhoneInput()?.focus();
            });
        }
        const dropdown = getAdjustCustomerDropdown();
        if (dropdown) dropdown.style.display = 'none';
    }

    function openAdjustPointsModal(presetPhone = '') {
        const modal = getAdjustModal();
        if (modal) {
            modal.style.display = 'flex';
            const dropdown = getAdjustCustomerDropdown();
            if (dropdown) dropdown.style.display = 'none';

            if (presetPhone) {
                const clean = presetPhone.replace(/[^0-9]/g, '').trim();
                const found = Object.values(PawpalCustomers.state.customerDatabase || {}).find(c => 
                    (c.phone && c.phone.replace(/[^0-9]/g, '').trim() === clean) ||
                    c.id === presetPhone
                );
                if (found) {
                    selectAdjustCustomer(found);
                } else {
                    const phoneInput = getAdjustPhoneInput();
                    if (phoneInput) {
                        selectedAdjustCustomer = null;
                        phoneInput.value = presetPhone;
                        const hint = getAdjustPhoneCustomerHint();
                        if (hint) hint.style.display = 'none';
                    }
                }
            } else {
                clearAdjustCustomerSelection();
                const ptsInput = document.getElementById('adjustPointsVal');
                if (ptsInput) ptsInput.value = '';
                const reasonInput = getAdjustReasonInput();
                if (reasonInput) reasonInput.value = '';
            }
        }
    }

    function closeAdjustModal() {
        const modal = getAdjustModal();
        if (modal) modal.style.display = 'none';
        const dropdown = getAdjustCustomerDropdown();
        if (dropdown) dropdown.style.display = 'none';
    }

    async function handleAdjustPointsSubmit() {
        const phoneInput = getAdjustPhoneInput();
        const phoneVal = (phoneInput?.value || '').trim();
        const type = document.getElementById('adjustType')?.value || 'ADD';
        const pts = parseInt(document.getElementById('adjustPointsVal')?.value || '0', 10);
        const reasonInput = getAdjustReasonInput();
        const reason = (reasonInput?.value || '').trim();

        if (pts <= 0 || isNaN(pts)) {
            PawpalCustomers.showToast('Vui lòng nhập số điểm lớn hơn 0!', 'warning');
            return;
        }
        if (!reason) {
            PawpalCustomers.showToast('Vui lòng nhập hoặc chọn lý do điều chỉnh điểm.', 'warning');
            return;
        }

        let matchedCust = selectedAdjustCustomer;
        if (!matchedCust) {
            const cleanPhone = phoneVal.replace(/[^0-9]/g, '').trim();
            matchedCust = Object.values(PawpalCustomers.state.customerDatabase || {}).find(c => 
                (cleanPhone.length >= 9 && c.phone && c.phone.replace(/[^0-9]/g, '').trim() === cleanPhone) ||
                (c.name && c.name.toLowerCase() === phoneVal.toLowerCase())
            );
            if (!matchedCust && phoneVal.includes(' - ')) {
                const [nPart, pPart] = phoneVal.split(' - ').map(s => s.trim().toLowerCase());
                matchedCust = Object.values(PawpalCustomers.state.customerDatabase || {}).find(c => 
                    (c.phone && c.phone.toLowerCase() === pPart) || 
                    (c.name && c.name.toLowerCase() === nPart)
                );
            }
        }

        if (!matchedCust) {
            PawpalCustomers.showToast(`Không tìm thấy khách hàng với thông tin "${phoneVal}"! Vui lòng chọn từ danh sách gợi ý.`, 'warning');
            return;
        }

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) {
            PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
            return;
        }

        try {
            const custDbId = matchedCust.dbId;
            const currentBalance = Number(matchedCust.points) || 0;
            if (type === 'SUB' && pts > currentBalance) {
                PawpalCustomers.showToast('Số điểm trừ không được vượt quá số dư hiện tại.', 'warning');
                return;
            }
            const newBalance = type === 'ADD' ? (currentBalance + pts) : (currentBalance - pts);
            const ptsSigned = type === 'ADD' ? pts : -pts;

            if (custDbId) {
                const { data: updatedMembership, error: memErr } = await client
                    .from('customer_membership')
                    .update({ total_paw_points: newBalance })
                    .eq('customer_id', custDbId)
                    .select('customer_id, total_paw_points')
                    .maybeSingle();

                if (memErr || !updatedMembership || Number(updatedMembership.total_paw_points) !== newBalance) {
                    console.warn('[Customers] Lỗi cập nhật customer_membership, thử upsert:', memErr);
                    const { error: upsertErr } = await client
                        .from('customer_membership')
                        .upsert({ customer_id: custDbId, total_paw_points: newBalance });
                    if (upsertErr) throw upsertErr;
                }

                const { error: transactionError } = await client.from('paw_point_transaction').insert({
                    customer_id: custDbId,
                    reward_rule_id: '92222222-2222-2222-2222-222222222222',
                    points: ptsSigned,
                    balance_after: newBalance,
                    description: reason
                });
                if (transactionError) throw transactionError;
            }

            await PawpalCustomers.loadCustomersModuleData({ force: true });
            if (PawpalCustomers.subtabs.list) {
                PawpalCustomers.subtabs.list.renderCustomersTable();
                PawpalCustomers.subtabs.list.updateCustomerKPIs();
            }
            renderPawpointHistory();

            const currentOpenCustId = sessionStorage.getItem('pawpal_admin_customer_id');
            if (currentOpenCustId === matchedCust.id && PawpalCustomers.subtabs.profile) {
                PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(matchedCust.id);
            }

            PawpalCustomers.showToast(`Đã ${type === 'ADD' ? 'cộng' : 'trừ'} ${pts.toLocaleString('vi-VN')} Pawpoint cho khách hàng ${matchedCust.name}! Số dư mới: ${newBalance.toLocaleString('vi-VN')} điểm`, 'success');
            const formAdjust = document.getElementById('formAdjustPoints');
            if (formAdjust) formAdjust.reset();
            clearAdjustCustomerSelection();
            closeAdjustModal();
        } catch (err) {
            console.error('[Customers] Lỗi điều chỉnh điểm:', err);
            PawpalCustomers.showToast('Đã xảy ra lỗi khi điều chỉnh điểm!', 'danger');
        }
    }

    let _hasAttachedPawpointDelegates = false;
    function initPawpointTab() {
        renderPawpointHistory();
        if (_hasAttachedPawpointDelegates) return;
        _hasAttachedPawpointDelegates = true;

        // Xử lý autocomplete khách hàng
        document.addEventListener('focusin', (e) => {
            if (e.target && e.target.id === 'adjustPhone') {
                renderAdjustCustomerDropdown(e.target.value);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'adjustPhone') {
                selectedAdjustCustomer = null;
                renderAdjustCustomerDropdown(e.target.value);
            }
        });

        document.addEventListener('click', (e) => {
            // Đóng autocomplete popover khi click ngoài
            if (!e.target.closest('.customer-autocomplete-wrapper')) {
                const dd = getAdjustCustomerDropdown();
                if (dd) dd.style.display = 'none';
            }

            // Chọn nhanh lý do từ quick chips
            const chip = e.target.closest('#adjustReasonQuickTags .reason-quick-chip');
            if (chip) {
                e.preventDefault();
                const reasonInput = getAdjustReasonInput();
                if (reasonInput) {
                    reasonInput.value = chip.textContent.trim();
                    reasonInput.focus();
                }
            }

            // Nút mở modal điều chỉnh
            if (e.target.closest('#btnOpenAdjustPointsModal')) {
                e.preventDefault();
                openAdjustPointsModal();
            }

            // Nút đóng modal
            if (e.target.closest('#btnCloseAdjustPoints') || e.target.closest('#btnCancelAdjustPoints')) {
                e.preventDefault();
                closeAdjustModal();
            }

            // Nút xác nhận điều chỉnh
            if (e.target.closest('#btnSubmitAdjustPoints')) {
                e.preventDefault();
                handleAdjustPointsSubmit();
            }

            // Nút xuất CSV
            if (e.target.closest('#btnExportPawpointHistory')) {
                e.preventDefault();
                exportPawpointHistoryToCSV();
            }
        });

        // Tìm kiếm và lọc bảng lịch sử Pawpoint
        document.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'pawpointSearchInput') {
                renderPawpointHistory();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'pawpointFilterType') {
                renderPawpointHistory();
            }
        });
    }

    // Đăng ký subtab vào namespace
    PawpalCustomers.subtabs.pawpoint = {
        init: initPawpointTab,
        renderPawpointHistory,
        openAdjustPointsModal,
        exportPawpointHistoryToCSV
    };

    // Khởi tạo nếu DOM đã sẵn sàng
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPawpointTab);
    } else {
        initPawpointTab();
    }
})();
