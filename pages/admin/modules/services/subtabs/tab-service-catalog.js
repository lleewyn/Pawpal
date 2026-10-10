// tab-service-catalog.js - Subtab Bảng giá và Danh mục Dịch vụ Pawpal-er
(function() {
    'use strict';

    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    let currentCatalogGroup = 'spa';
    let catalogSearchTerm = '';
    let catalogFilterStatus = 'ALL';
    let currentEditingServiceSteps = [];

    function renderCatalogTable() {
        const tbody = document.getElementById('servicesCatalogTableBody');
        if (!tbody) return;

        const servicesData = PawpalServices.state?.servicesData || [];
        const toUnaccent = PawpalServices.toUnaccent || (str => str);

        let filtered = servicesData.filter(svc => {
            if (svc.group !== currentCatalogGroup && svc.category !== currentCatalogGroup) {
                return false;
            }

            if (catalogSearchTerm) {
                const termUnaccent = toUnaccent(catalogSearchTerm);
                const termRaw = catalogSearchTerm.toLowerCase().trim();
                const matchName = toUnaccent(svc.name || '').includes(termUnaccent) || (svc.name || '').toLowerCase().includes(termRaw);
                const matchCode = (svc.code || '').toLowerCase().includes(termRaw);
                if (!matchName && !matchCode) return false;
            }

            if (catalogFilterStatus !== 'ALL') {
                if (catalogFilterStatus === 'ACTIVE' && svc.status !== 'Đang phục vụ') return false;
                if (catalogFilterStatus === 'INACTIVE' && svc.status !== 'Tạm ẩn') return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 36px 16px; font-size: 13.5px;">
                        Không có dịch vụ nào phù hợp với bộ lọc trong danh mục này.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(svc => {
            const isHidden = svc.status === 'Tạm ẩn';
            const prices = svc.prices || {
                under5: '120.000',
                to10: '150.000',
                to20: '200.000',
                over20: '250.000'
            };

            let priceColsHtml = '';
            if (currentCatalogGroup === 'hotel') {
                priceColsHtml = `
                    <td style="text-align: right; font-weight: 600;">${prices.under5 || '200.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.to10 || '280.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.to20 || '350.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.over20 || '450.000'} đ</td>
                `;
            } else if (currentCatalogGroup === 'taxi') {
                priceColsHtml = `
                    <td style="text-align: right; font-weight: 600;">${prices.under5 || '50.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.to10 || '70.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.to20 || '100.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.over20 || '130.000'} đ</td>
                `;
            } else {
                priceColsHtml = `
                    <td style="text-align: right; font-weight: 600;">${prices.under5 || '120.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.to10 || '150.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.to20 || '200.000'} đ</td>
                    <td style="text-align: right; font-weight: 600;">${prices.over20 || '250.000'} đ</td>
                `;
            }

            return `
                <tr class="${isHidden ? 'row-locked' : ''}" data-service-code="${svc.code || svc.id}">
                    <td style="text-align: center;">
                        <img src="${svc.image || '/assets/images/services/spa/process/spa01.webp'}" class="service-thumb-cell" alt="${svc.name}" style="width: 40px; height: 40px; border-radius: 9px; object-fit: cover;">
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${svc.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${svc.code || ''} • ${svc.duration || '60 phút'}</div>
                    </td>
                    ${priceColsHtml}
                    <td style="text-align: center;">
                        <span class="admin-badge ${isHidden ? 'badge-neutral' : 'badge-success'}">${svc.status || 'Đang phục vụ'}</span>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-edit-catalog-service" data-service-code="${svc.code || svc.id}">Sửa</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-edit-catalog-service').forEach(btn => {
            btn.addEventListener('click', () => {
                const sCode = btn.getAttribute('data-service-code');
                openEditServiceModal(sCode);
            });
        });
    }

    function openEditServiceModal(serviceCode) {
        const servicesData = PawpalServices.state?.servicesData || [];
        const svc = servicesData.find(s => s.code === serviceCode || s.id === serviceCode);
        const modal = document.getElementById('modalEditServiceCatalog');
        if (!modal) return;

        if (svc) {
            const nameInput = document.getElementById('catalogServiceNameInput');
            const codeInput = document.getElementById('catalogServiceCodeInput');
            const durationInput = document.getElementById('catalogServiceDurationInput');
            const descInput = document.getElementById('catalogServiceDescInput');
            const statusSelect = document.getElementById('catalogServiceStatusSelect');

            if (nameInput) nameInput.value = svc.name || '';
            if (codeInput) codeInput.value = svc.code || '';
            if (durationInput) durationInput.value = parseInt(svc.duration, 10) || 60;
            if (descInput) descInput.value = svc.desc || svc.description || '';
            if (statusSelect) statusSelect.value = svc.status === 'Tạm ẩn' ? 'INACTIVE' : 'ACTIVE';

            const prices = svc.prices || {};
            const pUnder5 = document.getElementById('catalogPriceUnder5');
            const pTo10 = document.getElementById('catalogPriceTo10');
            const pTo20 = document.getElementById('catalogPriceTo20');
            const pOver20 = document.getElementById('catalogPriceOver20');

            if (pUnder5) pUnder5.value = prices.under5 || '';
            if (pTo10) pTo10.value = prices.to10 || '';
            if (pTo20) pTo20.value = prices.to20 || '';
            if (pOver20) pOver20.value = prices.over20 || '';

            modal.setAttribute('data-editing-code', svc.code || svc.id);
        }

        modal.classList.add('active');
    }

    function initCatalogSubtab() {
        // Tabs chuyển nhóm dịch vụ
        document.querySelectorAll('.catalog-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.catalog-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCatalogGroup = btn.getAttribute('data-catalog-group') || 'spa';
                renderCatalogTable();
            });
        });

        // Tìm kiếm và lọc trạng thái
        const searchInput = document.getElementById('catalogSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                catalogSearchTerm = searchInput.value.trim();
                renderCatalogTable();
            });
        }

        const filterStatus = document.getElementById('catalogFilterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                catalogFilterStatus = filterStatus.value;
                renderCatalogTable();
            });
        }

        // Nút thêm dịch vụ mới
        const btnOpenAddService = document.getElementById('btnOpenAddServiceModal');
        if (btnOpenAddService) {
            btnOpenAddService.addEventListener('click', () => {
                const modal = document.getElementById('modalEditServiceCatalog');
                if (modal) {
                    modal.removeAttribute('data-editing-code');
                    const form = modal.querySelector('form');
                    if (form) form.reset();
                    modal.classList.add('active');
                }
            });
        }

        renderCatalogTable();
    }

    PawpalServices.subtabs.catalog = {
        init: initCatalogSubtab,
        renderCatalogTable,
        openEditServiceModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCatalogSubtab);
    } else {
        initCatalogSubtab();
    }
})();
