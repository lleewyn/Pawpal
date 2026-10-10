// tab-order-list.js - Subtab Quản lý Danh sách Đơn hàng & POS của Phân hệ Bán hàng Pawpal-er
(function() {
    'use strict';

    const PawpalOrders = window.PawpalOrders;
    if (!PawpalOrders) {
        console.error('[Orders List] Không tìm thấy window.PawpalOrders core!');
        return;
    }

    const { helpers, state } = PawpalOrders;
    const {
        formatVND, formatDateTime, formatDate, formatTime,
        showToast, showOrderConfirmModal,
        generatePackingSlipHtml, generateManifestHtml, getOrderSlaInfo,
        matchSearch, persistOrdersData, persistProductsData
    } = helpers;

    const ORDERS_PER_PAGE = 10;
    let ordersCurrentPage = parseInt(sessionStorage.getItem('pawpal_admin_orders_page') || '1', 10);
    if (isNaN(ordersCurrentPage) || ordersCurrentPage < 1) ordersCurrentPage = 1;

    let currentFilterStatus = 'ALL';
    let currentFilterPayment = 'ALL';
    let currentFilterPayStatus = 'ALL';
    let filterComplaintOnly = false;
    let filterUrgentOnly = false;
    let filterSlaOverdueOnly = false;

    // Render phân trang đơn hàng
    function renderOrdersPagination(totalPages) {
        const pagContainer = document.getElementById('ordersPagination');
        if (!pagContainer) return;

        if (totalPages === 0) {
            pagContainer.style.display = 'none';
            return;
        }
        pagContainer.style.display = 'flex';

        let html = '';
        const prevDisabled = ordersCurrentPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === ordersCurrentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = ordersCurrentPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (ordersCurrentPage > 1) {
                        ordersCurrentPage--;
                        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);
                        renderOrdersTable();
                    }
                } else if (pageAction === 'next') {
                    if (ordersCurrentPage < totalPages) {
                        ordersCurrentPage++;
                        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);
                        renderOrdersTable();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== ordersCurrentPage) {
                        ordersCurrentPage = targetP;
                        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);
                        renderOrdersTable();
                    }
                }
            });
        });
    }

    // Xóa tất cả bộ lọc đơn hàng
    function clearAllOrderFilters() {
        const searchInput = document.getElementById('orderSearchInput');
        const filterStatus = document.getElementById('orderFilterStatus');
        const filterPayment = document.getElementById('orderFilterPayment');
        const filterPayStatus = document.getElementById('orderFilterPayStatus');
        const btnClearOrderSearch = document.getElementById('btnClearOrderSearch');
        const btnOrderClearFilters = document.getElementById('btnOrderClearFilters');

        if (searchInput) searchInput.value = '';
        if (btnClearOrderSearch) btnClearOrderSearch.style.display = 'none';
        if (btnOrderClearFilters) btnOrderClearFilters.style.display = 'none';
        if (filterStatus) filterStatus.value = 'ALL';
        if (filterPayment) filterPayment.value = 'ALL';
        if (filterPayStatus) filterPayStatus.value = 'ALL';

        currentFilterStatus = 'ALL';
        currentFilterPayment = 'ALL';
        currentFilterPayStatus = 'ALL';
        filterComplaintOnly = false;
        filterUrgentOnly = false;
        filterSlaOverdueOnly = false;
        ordersCurrentPage = 1;

        const btnComplaint = document.getElementById('btnFilterComplaintOrders');
        if (btnComplaint) btnComplaint.classList.remove('active');
        const btnUrgent = document.getElementById('btnFilterUrgentOrders');
        if (btnUrgent) btnUrgent.classList.remove('active');
        const btnSla = document.getElementById('btnFilterSlaOverdue');
        if (btnSla) btnSla.classList.remove('active');

        document.querySelectorAll('.order-kpi-card, .kpi-card-clickable').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.order-quick-filter-btn').forEach(b => b.classList.remove('active'));

        renderOrdersTable();
    }

    // Render bảng danh sách đơn hàng
    function renderOrdersTable() {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        const ordersList = state.orders || [];

        // Cập nhật 6 thẻ KPI nhanh
        const statTotalOrdersEl = document.getElementById('statTotalOrders');
        const statPendingOrdersEl = document.getElementById('statPendingOrders');
        const statPreparingOrdersEl = document.getElementById('statPreparingOrders');
        const statShippingOrdersEl = document.getElementById('statShippingOrders');
        const statCompletedOrdersEl = document.getElementById('statCompletedOrders');
        const statCancelledOrdersEl = document.getElementById('statCancelledOrders');

        if (statTotalOrdersEl) statTotalOrdersEl.textContent = ordersList.length;
        if (statPendingOrdersEl) statPendingOrdersEl.textContent = ordersList.filter(o => o.status === 'pending').length;
        if (statPreparingOrdersEl) statPreparingOrdersEl.textContent = ordersList.filter(o => o.status === 'confirmed').length;
        if (statShippingOrdersEl) statShippingOrdersEl.textContent = ordersList.filter(o => o.status === 'shipping' || o.status === 'delivered').length;
        if (statCompletedOrdersEl) statCompletedOrdersEl.textContent = ordersList.filter(o => o.status === 'completed').length;
        if (statCancelledOrdersEl) statCancelledOrdersEl.textContent = ordersList.filter(o => o.status === 'cancelled' || o.status === 'returned').length;

        const searchVal = (document.getElementById('orderSearchInput')?.value || '').trim();
        const btnOrderClearFilters = document.getElementById('btnOrderClearFilters');

        const isAnyFilterActive = Boolean(
            searchVal ||
            currentFilterStatus !== 'ALL' ||
            currentFilterPayment !== 'ALL' ||
            currentFilterPayStatus !== 'ALL' ||
            filterComplaintOnly ||
            filterUrgentOnly ||
            filterSlaOverdueOnly
        );
        if (btnOrderClearFilters) {
            btnOrderClearFilters.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
        }

        const filtered = ordersList.filter(o => {
            const sla = getOrderSlaInfo(o);

            if (currentFilterStatus !== 'ALL' && o.status !== currentFilterStatus) return false;
            if (currentFilterPayment !== 'ALL' && o.paymentMethod !== currentFilterPayment) return false;
            if (currentFilterPayStatus !== 'ALL') {
                if (currentFilterPayStatus === 'refund_pending') {
                    if (o.paymentStatus !== 'refund_pending' && o.paymentStatus !== 'pending_refund') return false;
                } else if (o.paymentStatus !== currentFilterPayStatus) {
                    return false;
                }
            }
            if (filterComplaintOnly && o.status !== 'returned' && o.alertType !== 'danger') return false;
            if (filterUrgentOnly && sla.level !== 'danger' && sla.level !== 'warning') return false;
            if (filterSlaOverdueOnly && !sla.isSlaOverdue) return false;

            if (searchVal) {
                const matchId = matchSearch(o.id, searchVal);
                const matchName = matchSearch(o.customerName, searchVal);
                const matchPhone = matchSearch(o.phone, searchVal);
                const matchTrack = matchSearch(o.trackingNumber, searchVal);
                const matchItems = (o.products && o.products.some(it => matchSearch(it.name, searchVal) || matchSearch(it.sku, searchVal)));
                if (!matchId && !matchName && !matchPhone && !matchTrack && !matchItems) return false;
            }
            return true;
        });

        // Dải tổng hợp đối soát dòng tiền COD
        const codStrip = document.getElementById('codReconcileSummaryStrip');
        const codPendingOrders = ordersList.filter(o => o.paymentStatus === 'cod_pending');
        const totalCodAmount = codPendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        if (codStrip) {
            if (currentFilterPayStatus === 'cod_pending' || codPendingOrders.length > 0) {
                codStrip.style.display = 'flex';
                const countEl = document.getElementById('dispCodPendingCount');
                const amtEl = document.getElementById('dispCodPendingAmount');
                if (countEl) countEl.textContent = `${codPendingOrders.length} đơn hàng`;
                if (amtEl) amtEl.textContent = formatVND(totalCodAmount);
            } else {
                codStrip.style.display = 'none';
            }
        }

        // Dải thao tác hàng loạt
        const batchToolbar = document.getElementById('batchActionToolbar');
        const batchCountEl = document.getElementById('batchSelectedCount');
        const selectedBatchOrderIds = state.selectedBatchOrderIds || [];
        if (batchToolbar) {
            if (selectedBatchOrderIds.length > 0) {
                batchToolbar.style.display = 'flex';
                if (batchCountEl) batchCountEl.textContent = selectedBatchOrderIds.length;
            } else {
                batchToolbar.style.display = 'none';
            }
        }

        const checkAllEl = document.getElementById('checkSelectAllOrders');
        if (checkAllEl) {
            checkAllEl.checked = filtered.length > 0 && filtered.every(o => selectedBatchOrderIds.includes(o.id));
        }

        // Tính toán phân trang
        const totalOrdersPages = Math.ceil(filtered.length / ORDERS_PER_PAGE) || 1;
        if (ordersCurrentPage > totalOrdersPages) ordersCurrentPage = totalOrdersPages;
        if (ordersCurrentPage < 1) ordersCurrentPage = 1;
        sessionStorage.setItem('pawpal_admin_orders_page', ordersCurrentPage);

        const startIdx = (ordersCurrentPage - 1) * ORDERS_PER_PAGE;
        const pagedOrders = filtered.slice(startIdx, startIdx + ORDERS_PER_PAGE);

        if (pagedOrders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13.5px;">
                        <div>Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại. 
                        <button type="button" id="btnResetOrderFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetOrderFilters')?.addEventListener('click', clearAllOrderFilters);
            renderOrdersPagination(0);
            return;
        }

        tbody.innerHTML = pagedOrders.map(o => {
            const sla = getOrderSlaInfo(o);

            let statusBadge = '';
            if (o.status === 'pending') statusBadge = '<span class="admin-badge badge-warning">Chờ xác nhận</span>';
            else if (o.status === 'confirmed') statusBadge = '<span class="admin-badge badge-neutral">Đang chuẩn bị</span>';
            else if (o.status === 'shipping') statusBadge = '<span class="admin-badge badge-info">Đang giao</span>';
            else if (o.status === 'delivered') statusBadge = '<span class="admin-badge badge-success">Đã giao</span>';
            else if (o.status === 'completed') statusBadge = '<span class="admin-badge badge-success">Hoàn tất</span>';
            else if (o.status === 'cancelled') statusBadge = '<span class="admin-badge badge-danger">Đã hủy</span>';
            else if (o.status === 'returned') statusBadge = '<span class="admin-badge badge-danger">Đổi trả</span>';

            let payBadge = '';
            if (o.paymentStatus === 'paid') {
                payBadge = '<span class="admin-badge badge-success">Đã thanh toán</span>';
            } else if (o.paymentStatus === 'refund_pending' || o.paymentStatus === 'pending_refund') {
                payBadge = '<span class="admin-badge badge-warning">Chờ hoàn tiền</span>';
            } else if (o.paymentStatus === 'refunded') {
                payBadge = '<span class="admin-badge badge-danger">Đã hoàn tiền</span>';
            } else if (o.paymentStatus === 'cancelled') {
                payBadge = '<span class="admin-badge badge-danger">Đã hủy</span>';
            } else if (o.paymentStatus === 'cod_pending') {
                payBadge = '<span class="admin-badge badge-warning">Chờ đối soát COD</span>';
            } else {
                payBadge = '<span class="admin-badge badge-unpaid">Chưa thanh toán</span>';
            }

            let rowAlertClass = '';
            let alertLabel = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
            if (o.status === 'cancelled') {
                rowAlertClass += ' row-locked';
            } else if (sla.level === 'danger') {
                rowAlertClass = 'row-alert-danger';
                alertLabel = `<span class="alert-indicator text-danger">• ${sla.label}</span>`;
            } else if (sla.level === 'warning') {
                rowAlertClass = 'row-alert-warning';
                alertLabel = `<span class="alert-indicator text-warning">• ${sla.label}</span>`;
            }

            const firstProd = (o.products && o.products[0]) ? o.products[0] : null;
            const moreCount = (o.products ? o.products.length : 0) - 1;
            const prodSummary = firstProd ? (firstProd.name + (moreCount > 0 ? ` (+${moreCount} món)` : '')) : '--';

            let payMethodLabel = 'COD';
            if (o.paymentMethod === 'vnpay') payMethodLabel = 'VNPay';
            else if (o.paymentMethod === 'momo') payMethodLabel = 'MoMo';
            else if (o.paymentMethod === 'bank_transfer') payMethodLabel = 'Chuyển khoản';

            const isChecked = selectedBatchOrderIds.includes(o.id);

            return `
                <tr class="${rowAlertClass}">
                    <td style="text-align: center; width: 42px;">
                        <input type="checkbox" class="admin-checkbox order-row-checkbox" data-id="${o.id}" ${isChecked ? 'checked' : ''} onclick="PawpalOrdersModule.toggleSelectOrder(event, '${o.id}')">
                    </td>
                    <td>
                        <a href="javascript:void(0)" class="order-code-link" onclick="PawpalOrdersModule.openOrderDetail('${o.id}')">${o.id}</a>
                    </td>
                    <td>
                        <div>
                            <span class="user-name-link" onclick="PawpalOrdersModule.openCustomerProfile('${o.userId}', '${o.customerName}')">${o.customerName}</span>
                            <div class="sub-meta-text">${o.phone}</div>
                        </div>
                    </td>
                    <td style="max-width: 240px;">
                        <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${prodSummary}">${prodSummary}</div>
                        <div class="sub-meta-text">Tổng: ${(o.products || []).reduce((acc, p) => acc + (p.quantity || 1), 0)} sản phẩm</div>
                    </td>
                    <td>
                        <div class="price-text-main">${formatVND(o.total)}</div>
                    </td>
                    <td>
                        <div>${payMethodLabel}</div>
                        <div style="margin-top: 2px;">${payBadge}</div>
                    </td>
                    <td>
                        <div>${o.carrier || '--'}</div>
                        <div class="sub-meta-text" style="font-family: monospace;">${o.trackingNumber || '--'}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${alertLabel}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openActionDropdown(event, '${o.id}')">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderOrdersPagination(totalOrdersPages);
    }

    // ====================================================================
    // POS: GIỎ HÀNG TẠO ĐƠN TẠI QUẦY
    // ====================================================================
    let activePosCustomer = null;
    let activePendingServiceData = null;
    let posCartItems = [];
    let posCustomerDirectory = [];

    async function loadPosCustomerDirectory() {
        try {
            const rawCusts = sessionStorage.getItem('pawpal_admin_customers_data');
            if (rawCusts) {
                try {
                    const parsed = JSON.parse(rawCusts);
                    const list = Object.keys(parsed).map(id => {
                        const c = parsed[id];
                        return {
                            id: id,
                            name: c.fullName || c.name || 'Khách hàng',
                            phone: c.phone || '',
                            rank: c.membershipTier || c.tier || 'Thành viên Bạc',
                            points: c.points || 0,
                            address: c.address || (c.addresses && c.addresses[0]?.address) || '',
                            pets: c.pets || []
                        };
                    });
                    if (list.length > 0) posCustomerDirectory = list;
                } catch (e) {}
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client) {
                const { data, error } = await client
                    .from('customer')
                    .select(`
                        id,
                        phone_main,
                        customer_profile (*),
                        customer_membership (*, membership_tier (*)),
                        customer_address (*),
                        pet_profile (id, pet_name, breed, species)
                    `)
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (!error && Array.isArray(data) && data.length > 0) {
                    posCustomerDirectory = data.map(item => {
                        const prof = Array.isArray(item.customer_profile) ? item.customer_profile[0] : item.customer_profile;
                        const mem = Array.isArray(item.customer_membership) ? item.customer_membership[0] : item.customer_membership;
                        const tier = mem ? (Array.isArray(mem.membership_tier) ? mem.membership_tier[0] : mem.membership_tier) : null;
                        const pets = Array.isArray(item.pet_profile) ? item.pet_profile : (item.pet_profile ? [item.pet_profile] : []);
                        let addr = '';
                        if (item.customer_address && item.customer_address.length > 0) {
                            const def = item.customer_address.find(a => a.is_default) || item.customer_address[0];
                            addr = [def.street_address, def.ward, def.district, def.province || def.city].filter(Boolean).join(', ');
                        }
                        return {
                            id: item.id,
                            name: prof?.full_name || 'Khách hàng PawPal',
                            phone: item.phone_main || '',
                            rank: tier?.tier_name ? `Thành viên ${tier.tier_name}` : 'Thành viên Bạc',
                            points: mem?.total_paw_points || 0,
                            address: addr,
                            pets: pets
                        };
                    });
                }
            }
        } catch (err) {
            console.warn('Lỗi tải danh bạ khách hàng cho POS:', err);
        }
    }

    function renderCreateOrderCustomerDropdown(filterText = '') {
        const dropdown = document.getElementById('createOrderCustomerDropdown');
        if (!dropdown) return;

        const q = (filterText || '').toLowerCase().trim();
        const cleanQ = q.replace(/[^0-9]/g, '');

        let matches = posCustomerDirectory.filter(c => {
            if (!q) return true;
            const nameMatch = (c.name || '').toLowerCase().includes(q);
            const phoneClean = (c.phone || '').replace(/[^0-9]/g, '');
            const phoneMatch = cleanQ ? phoneClean.includes(cleanQ) : false;
            const petMatch = (c.pets || []).some(p => (p.pet_name || p.name || '').toLowerCase().includes(q));
            return nameMatch || phoneMatch || petMatch;
        });

        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="customer-autocomplete-empty">Không tìm thấy khách hàng phù hợp</div>';
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = matches.map(c => `
            <div class="customer-autocomplete-item" onclick="PawpalOrdersModule.selectPosCustomer('${c.id}')">
                <div class="cust-auto-left">
                    <div class="cust-auto-avatar">${c.name.charAt(0)}</div>
                    <div>
                        <div class="cust-auto-name">${c.name}</div>
                        <div class="cust-auto-phone">${c.phone || 'Chưa có SĐT'}</div>
                    </div>
                </div>
                <div class="cust-auto-right">
                    <span class="cust-auto-rank">${c.rank}</span>
                    <span class="cust-auto-points">${c.points} điểm</span>
                </div>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    }

    function selectPosCustomer(cust) {
        activePosCustomer = cust;
        const nameInput = document.getElementById('createOrderName');
        const phoneInput = document.getElementById('createOrderPhone');
        const dropdown = document.getElementById('createOrderCustomerDropdown');
        const card = document.getElementById('posCustomerSelectedCard');
        const cardName = document.getElementById('posCustCardName');
        const cardPhone = document.getElementById('posCustCardPhone');
        const cardRank = document.getElementById('posCustCardRank');
        const cardPoints = document.getElementById('posCustCardPoints');

        if (nameInput) nameInput.value = cust.name;
        if (phoneInput) phoneInput.value = cust.phone;
        if (dropdown) dropdown.style.display = 'none';

        if (card) {
            if (cardName) cardName.textContent = cust.name;
            if (cardPhone) cardPhone.textContent = cust.phone;
            if (cardRank) cardRank.textContent = cust.rank;
            if (cardPoints) cardPoints.textContent = `${cust.points} điểm`;
            card.style.display = 'flex';
        }

        updatePosLiveCalculation();
    }

    function renderPosCartTable() {
        const tbody = document.getElementById('createOrderCartBody');
        const emptyRow = document.getElementById('posCartEmptyRow');
        if (!tbody) return;

        if (posCartItems.length === 0) {
            tbody.innerHTML = '';
            if (emptyRow) emptyRow.style.display = 'table-row';
            updatePosLiveCalculation();
            return;
        }

        if (emptyRow) emptyRow.style.display = 'none';
        tbody.innerHTML = posCartItems.map((item, idx) => `
            <tr>
                <td>
                    <div style="font-weight: 500; font-size: 13px;">${item.name}</div>
                    <div class="sub-meta-text">${item.sku}</div>
                </td>
                <td style="text-align: right;">${formatVND(item.price)}</td>
                <td style="text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 4px;">
                        <button type="button" class="btn-qty-mini" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty - 1})">-</button>
                        <span style="font-weight: 600; min-width: 20px; text-align: center;">${item.qty}</span>
                        <button type="button" class="btn-qty-mini" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty + 1})">+</button>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 600; color: #236B48;">${formatVND(item.price * item.qty)}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removePosCartItem(${idx})">&times;</button>
                </td>
            </tr>
        `).join('');

        updatePosLiveCalculation();
    }

    function addToPosCart(sku, qty = 1) {
        const prod = (state.products || []).find(p => p.sku === sku);
        if (!prod) return;

        const existing = posCartItems.find(i => i.sku === sku);
        if (existing) {
            existing.qty += qty;
        } else {
            posCartItems.push({
                sku: prod.sku,
                name: prod.name,
                price: prod.price,
                qty: qty,
                image: prod.image
            });
        }
        renderPosCartTable();
    }

    function updatePosCartQty(index, newQty) {
        if (newQty <= 0) {
            posCartItems.splice(index, 1);
        } else if (posCartItems[index]) {
            posCartItems[index].qty = newQty;
        }
        renderPosCartTable();
    }

    function removePosCartItem(index) {
        posCartItems.splice(index, 1);
        renderPosCartTable();
    }

    function updatePosLiveCalculation() {
        const subtotal = posCartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
        let tierDiscount = 0;
        if (activePosCustomer) {
            const r = (activePosCustomer.rank || '').toLowerCase();
            if (r.includes('kim cương') || r.includes('diamond')) tierDiscount = Math.round(subtotal * 0.10);
            else if (r.includes('vàng') || r.includes('gold')) tierDiscount = Math.round(subtotal * 0.05);
            else if (r.includes('bạc') || r.includes('silver')) tierDiscount = Math.round(subtotal * 0.02);
        }

        const voucherInput = document.getElementById('createOrderVoucherCode')?.value.trim().toUpperCase();
        let voucherDiscount = 0;
        if (voucherInput) {
            const vList = helpers.getSharedVouchersList();
            const foundVoucher = vList.find(v => v.code === voucherInput && (v.status === 'active' || v.status === 'Đang chạy'));
            if (foundVoucher) {
                if (foundVoucher.type === 'percent') {
                    voucherDiscount = Math.round(subtotal * (foundVoucher.value / 100));
                } else {
                    voucherDiscount = foundVoucher.value;
                }
            }
        }

        const pointsInput = parseInt(document.getElementById('createOrderPointsInput')?.value || '0', 10);
        const pointsDiscount = Math.max(0, pointsInput * 100);

        const isDelivery = document.querySelector('input[name="posDeliveryMethod"]:checked')?.value === 'delivery';
        const shippingFee = (isDelivery && subtotal > 0) ? 25000 : 0;

        const grandTotal = Math.max(0, subtotal - tierDiscount - voucherDiscount - pointsDiscount + shippingFee);

        const subtotalDisp = document.getElementById('posCalcSubtotal');
        const tierDisp = document.getElementById('posCalcTierDiscount');
        const voucherDisp = document.getElementById('posCalcVoucherDiscount');
        const pointsDisp = document.getElementById('posCalcPointsDiscount');
        const shipDisp = document.getElementById('posCalcShipping');
        const grandDisp = document.getElementById('posCalcGrandTotal');

        if (subtotalDisp) subtotalDisp.textContent = formatVND(subtotal);
        if (tierDisp) tierDisp.textContent = '- ' + formatVND(tierDiscount);
        if (voucherDisp) voucherDisp.textContent = '- ' + formatVND(voucherDiscount);
        if (pointsDisp) pointsDisp.textContent = '- ' + formatVND(pointsDiscount);
        if (shipDisp) shipDisp.textContent = formatVND(shippingFee);
        if (grandDisp) grandDisp.textContent = formatVND(grandTotal);

        const cashInput = parseInt(document.getElementById('createOrderCashTendered')?.value || '0', 10);
        const cashChangeEl = document.getElementById('posCalcCashChange');
        if (cashChangeEl) {
            const change = Math.max(0, cashInput - grandTotal);
            cashChangeEl.textContent = formatVND(change);
        }

        return {
            subtotal,
            tierDiscount,
            voucherDiscount,
            pointsDiscount,
            shippingFee,
            grandTotal,
            cashTendered: cashInput,
            cashChange: Math.max(0, cashInput - grandTotal),
            pointsUsed: pointsInput
        };
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.list = {
        renderOrdersTable,
        renderOrdersPagination,
        clearAllOrderFilters,
        loadPosCustomerDirectory
    };

    // Khởi tạo các sự kiện giao diện cho Subtab List
    function initListEvents() {
        document.getElementById('orderSearchInput')?.addEventListener('input', () => {
            ordersCurrentPage = 1;
            renderOrdersTable();
        });
        document.getElementById('orderFilterStatus')?.addEventListener('change', (e) => {
            currentFilterStatus = e.target.value;
            ordersCurrentPage = 1;
            renderOrdersTable();
        });
        document.getElementById('orderFilterPayment')?.addEventListener('change', (e) => {
            currentFilterPayment = e.target.value;
            ordersCurrentPage = 1;
            renderOrdersTable();
        });
        document.getElementById('orderFilterPayStatus')?.addEventListener('change', (e) => {
            currentFilterPayStatus = e.target.value;
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnFilterComplaintOrders')?.addEventListener('click', function() {
            filterComplaintOnly = !filterComplaintOnly;
            this.classList.toggle('active', filterComplaintOnly);
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnFilterUrgentOrders')?.addEventListener('click', function() {
            filterUrgentOnly = !filterUrgentOnly;
            this.classList.toggle('active', filterUrgentOnly);
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnFilterSlaOverdue')?.addEventListener('click', function() {
            filterSlaOverdueOnly = !filterSlaOverdueOnly;
            this.classList.toggle('active', filterSlaOverdueOnly);
            ordersCurrentPage = 1;
            renderOrdersTable();
        });

        document.getElementById('btnOrderClearFilters')?.addEventListener('click', clearAllOrderFilters);

        // Checkbox chọn tất cả
        document.getElementById('checkSelectAllOrders')?.addEventListener('change', function(e) {
            const ordersList = state.orders || [];
            if (e.target.checked) {
                state.selectedBatchOrderIds = ordersList.map(o => o.id);
            } else {
                state.selectedBatchOrderIds = [];
            }
            renderOrdersTable();
        });

        document.getElementById('btnBatchDeselectAll')?.addEventListener('click', () => {
            state.selectedBatchOrderIds = [];
            renderOrdersTable();
        });

        document.getElementById('btnBatchPrintPack')?.addEventListener('click', () => {
            PawpalOrdersModule.printBatchPackingSlips();
        });

        document.getElementById('btnBatchDispatch')?.addEventListener('click', () => {
            PawpalOrdersModule.openBatchDispatchModal();
        });

        document.getElementById('btnBatchExportManifest')?.addEventListener('click', () => {
            PawpalOrdersModule.exportDispatchManifest();
        });

        // Xuất file báo cáo đơn hàng Excel
        document.getElementById('btnExportOrderReport')?.addEventListener('click', () => {
            const ordersList = state.orders || [];
            if (ordersList.length === 0) {
                showToast('Không có dữ liệu đơn hàng để xuất file.', 'warning');
                return;
            }
            if (window.XLSX) {
                const sheetData = ordersList.map((o, idx) => ({
                    'STT': idx + 1,
                    'Mã đơn': o.id,
                    'Khách hàng': o.customerName,
                    'SĐT': o.phone,
                    'Tổng tiền': o.total,
                    'Hình thức TT': o.paymentMethod,
                    'Trạng thái TT': o.paymentStatus,
                    'Vận chuyển': o.carrier,
                    'Mã vận đơn': o.trackingNumber,
                    'Trạng thái đơn': o.status,
                    'Thời gian đặt': formatDateTime(o.createdAt)
                }));
                const ws = XLSX.utils.json_to_sheet(sheetData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Don_Hang');
                XLSX.writeFile(wb, `Bao_Cao_Don_Hang_PawPal_${new Date().toISOString().slice(0, 10)}.xlsx`);
                showToast('Đã xuất báo cáo đơn hàng Excel thành công!', 'success');
            } else {
                showToast('Đang nạp thư viện xuất file, vui lòng thử lại sau giây lát...', 'info');
            }
        });

        // Đối soát COD toàn bộ
        document.getElementById('btnQuickReconcileAllCod')?.addEventListener('click', async function() {
            const ordersList = state.orders || [];
            const codPending = ordersList.filter(o => o.paymentStatus === 'cod_pending');
            if (codPending.length === 0) {
                showToast('Không có đơn hàng nào đang chờ đối soát tiền COD.', 'info');
                return;
            }

            const totalAmount = codPending.reduce((sum, o) => sum + (o.total || 0), 0);
            showOrderConfirmModal({
                title: 'Đối soát toàn bộ COD bưu cục',
                message: `Bạn có chắc chắn muốn xác nhận đối soát toàn bộ ${codPending.length} đơn hàng với tổng số tiền ${formatVND(totalAmount)}?`,
                acceptText: 'Xác nhận đối soát',
                onAccept: async () => {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    for (const o of codPending) {
                        o.paymentStatus = 'paid';
                        o.timeline.push({
                            title: 'Đã đối soát tiền COD (Hàng loạt)',
                            time: formatTime(new Date()) + ' - Hôm nay',
                            desc: 'Kế toán xác nhận bưu cục đã chuyển khoản tiền COD về tài khoản PawPal',
                            done: true
                        });
                        if (client) {
                            try {
                                if (o.rawId) {
                                    await client.from('sales_order').update({ payment_status: 'PAID' }).eq('id', o.rawId);
                                } else {
                                    await client.from('sales_order').update({ payment_status: 'PAID' }).eq('order_code', o.id);
                                }
                            } catch (e) {}
                        }
                    }
                    persistOrdersData();
                    renderOrdersTable();
                    showToast(`Đã đối soát thành công toàn bộ ${codPending.length} đơn hàng COD (${formatVND(totalAmount)})!`, 'success');
                }
            });
        });

        // POS Listeners
        document.getElementById('btnOpenCreateOrderModal')?.addEventListener('click', () => {
            posCartItems = [];
            activePosCustomer = null;
            const card = document.getElementById('posCustomerSelectedCard');
            if (card) card.style.display = 'none';

            const nameInput = document.getElementById('createOrderName');
            const phoneInput = document.getElementById('createOrderPhone');
            if (nameInput) nameInput.value = '';
            if (phoneInput) phoneInput.value = '';

            const prodPicker = document.getElementById('createOrderProductPicker');
            if (prodPicker) {
                prodPicker.innerHTML = '<option value="">-- Chọn sản phẩm thêm vào giỏ --</option>' + (state.products || []).map(p => `
                    <option value="${p.sku}">${p.sku} - ${p.name} (${formatVND(p.price)})</option>
                `).join('');
            }

            renderPosCartTable();
            document.getElementById('modalCreateOrder')?.classList.add('active');
        });

        document.getElementById('createOrderBtnAddProduct')?.addEventListener('click', () => {
            const picker = document.getElementById('createOrderProductPicker');
            const qtyInput = document.getElementById('createOrderProductQty');
            if (!picker || !picker.value) return;
            const sku = picker.value;
            const qty = parseInt(qtyInput?.value || '1', 10);
            addToPosCart(sku, qty);
        });

        document.getElementById('createOrderPhone')?.addEventListener('input', (e) => {
            renderCreateOrderCustomerDropdown(e.target.value);
        });

        document.getElementById('createOrderCashTendered')?.addEventListener('input', () => {
            updatePosLiveCalculation();
        });

        document.getElementById('btnFinalizePosOrder')?.addEventListener('click', async () => {
            if (posCartItems.length === 0) {
                showToast('Giỏ hàng đang trống. Vui lòng thêm ít nhất một sản phẩm.', 'warning');
                return;
            }

            const name = document.getElementById('createOrderName')?.value.trim() || 'Khách vãng lai';
            const phone = document.getElementById('createOrderPhone')?.value.trim() || '0900000000';
            const payMethod = document.querySelector('input[name="posPaymentMethod"]:checked')?.value || 'cash';
            const voucherInput = document.getElementById('createOrderVoucherCode')?.value.trim();
            const isDelivery = document.querySelector('input[name="posDeliveryMethod"]:checked')?.value === 'delivery';
            const noteVal = document.getElementById('createOrderNote')?.value.trim();
            const calc = updatePosLiveCalculation();

            const newCode = 'ORD-2026-00' + ((state.orders || []).length + 1);
            const finalAddr = isDelivery ? 'Giao tận nơi theo yêu cầu' : 'Tại cửa hàng PawPal - Khách nhận trực tiếp (Chi nhánh Quận 1, TP. HCM)';
            const finalUserId = (activePosCustomer && activePosCustomer.id) || 'USER-001';

            const newOrder = {
                id: newCode,
                rawId: null,
                userId: finalUserId,
                customerName: name,
                phone: phone,
                address: finalAddr,
                status: isDelivery ? 'confirmed' : 'completed',
                paymentStatus: (isDelivery && payMethod === 'cod') ? 'unpaid' : 'paid',
                paymentMethod: payMethod,
                carrier: isDelivery ? 'Giao tận nơi (PawPal Express)' : 'Mua trực tiếp tại quầy',
                trackingNumber: '--',
                createdAt: new Date().toISOString(),
                subtotal: calc.subtotal,
                shippingFee: calc.shippingFee,
                discount: calc.tierDiscount + calc.voucherDiscount,
                pawPointsUsed: calc.pointsUsed,
                total: calc.grandTotal,
                customerNote: noteVal || (isDelivery ? 'Giao tận nơi' : 'Mua trực tiếp tại quầy'),
                internalNote: `Đơn bán POS | Khách: ${activePosCustomer ? activePosCustomer.rank : 'Thành viên mới'}`,
                alertType: null,
                products: posCartItems.map(item => ({
                    sku: item.sku,
                    name: item.name,
                    spec: 'Tiêu chuẩn',
                    price: item.price,
                    quantity: item.qty,
                    total: item.price * item.qty,
                    image: item.image || '/assets/images/shop/products/tp-hat-01.png'
                })),
                timeline: [
                    {
                        title: 'Tạo đơn hàng tại quầy (POS)',
                        time: formatTime(new Date()) + ' - Hôm nay',
                        desc: `Thu ngân lập đơn (${posCartItems.length} mặt hàng) và thanh toán ${formatVND(calc.grandTotal)}`,
                        done: true
                    }
                ]
            };

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client) {
                try {
                    const { data: orderRow } = await client.from('sales_order').insert({
                        order_code: newCode,
                        customer_id: (finalUserId && finalUserId.length > 20) ? finalUserId : null,
                        order_status: isDelivery ? 'CONFIRMED' : 'COMPLETED',
                        payment_status: (isDelivery && payMethod === 'cod') ? 'UNPAID' : 'PAID',
                        total_amount: calc.grandTotal,
                        note: noteVal || 'Đơn POS'
                    }).select().single();

                    if (orderRow) newOrder.rawId = orderRow.id;
                } catch (e) {
                    console.warn('Lỗi ghi nhận đơn POS lên Supabase:', e);
                }
            }

            state.orders = state.orders || [];
            state.orders.unshift(newOrder);
            persistOrdersData();

            document.getElementById('modalCreateOrder')?.classList.remove('active');
            renderOrdersTable();
            showToast(`Đã tạo thành công đơn hàng POS ${newCode}!`, 'success');
        });

        // Bàn giao vận chuyển modal submit
        document.getElementById('btnSubmitShipOrder')?.addEventListener('click', async () => {
            const carrier = document.getElementById('shipCarrierSelect')?.value || 'J&T Express';
            const tracking = document.getElementById('shipTrackingInput')?.value.trim() || ('JT' + Date.now().toString().slice(-6));
            const note = document.getElementById('shipCarrierNote')?.value.trim();

            const order = (state.orders || []).find(o => o.id === state.selectedOrderId);
            if (!order) return;

            order.status = 'shipping';
            order.carrier = carrier;
            order.trackingNumber = tracking;
            order.timeline.push({
                title: 'Đã bàn giao vận chuyển',
                time: formatTime(new Date()) + ' - Hôm nay',
                desc: `Đã bàn giao cho ${carrier}. Mã vận đơn: ${tracking}${note ? ` | Ghi chú: ${note}` : ''}`,
                done: true
            });

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client) {
                try {
                    const payload = {
                        order_status: 'SHIPPING',
                        shipping_carrier: carrier,
                        tracking_number: tracking
                    };
                    if (order.rawId) {
                        await client.from('sales_order').update(payload).eq('id', order.rawId);
                    } else {
                        await client.from('sales_order').update(payload).eq('order_code', order.id);
                    }
                } catch (e) {}
            }

            persistOrdersData();
            PawpalOrdersModule.closeModal('modalShipOrder');
            renderOrdersTable();
            if (typeof PawpalOrders.renderOrderDetail === 'function') {
                PawpalOrders.renderOrderDetail(order.id);
            }
            showToast(`Đã bàn giao vận chuyển cho đơn ${order.id}!`, 'success');
        });

        // Hủy đơn modal submit
        document.getElementById('btnSubmitCancelOrder')?.addEventListener('click', async () => {
            const reason = document.getElementById('cancelOrderReasonSelect')?.value || 'Khách yêu cầu hủy';
            const detail = document.getElementById('cancelOrderReasonDetail')?.value.trim() || '';

            const order = (state.orders || []).find(o => o.id === state.selectedOrderId);
            if (!order) return;

            order.status = 'cancelled';
            order.paymentStatus = (order.paymentStatus === 'paid') ? 'refund_pending' : 'cancelled';
            order.timeline.push({
                title: 'Đã hủy đơn hàng',
                time: formatTime(new Date()) + ' - Hôm nay',
                desc: `Hủy bởi nhân viên quản trị. Lý do: ${reason}${detail ? ` (${detail})` : ''}`,
                done: true
            });

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client) {
                try {
                    const payload = {
                        order_status: 'CANCELLED',
                        payment_status: (order.paymentStatus === 'refund_pending') ? 'PENDING_REFUND' : 'CANCELLED'
                    };
                    if (order.rawId) {
                        await client.from('sales_order').update(payload).eq('id', order.rawId);
                    } else {
                        await client.from('sales_order').update(payload).eq('order_code', order.id);
                    }
                } catch (e) {}
            }

            persistOrdersData();
            PawpalOrdersModule.closeModal('modalCancelOrder');
            renderOrdersTable();
            if (typeof PawpalOrders.renderOrderDetail === 'function') {
                PawpalOrders.renderOrderDetail(order.id);
            }
            showToast(`Đã hủy đơn hàng ${order.id}!`, 'success');
        });

        // Đóng action dropdown khi click ngoài
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('orderActionDropdown');
            if (popover && popover.classList.contains('active')) {
                if (!e.target.closest('.btn-action-trigger') && !e.target.closest('#orderActionDropdown')) {
                    popover.classList.remove('active');
                }
            }
        });

        // Gắn action cho popover menu
        document.getElementById('menuActionViewDetail')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openOrderDetail(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionPrintPack')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.printPackingSlip(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionShipOrder')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openShipModal(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionConfirmPayment')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.confirmPayment(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionReconcileCod')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.reconcileCod(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionReturnRefund')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openReturnRefundModal(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
        document.getElementById('menuActionCancelOrder')?.addEventListener('click', () => {
            if (state.activeActionOrderId) {
                PawpalOrdersModule.openCancelModal(state.activeActionOrderId);
                document.getElementById('orderActionDropdown')?.classList.remove('active');
            }
        });
    }

    // Xuất ra window.PawpalOrdersModule cho inline handlers
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};

    window.PawpalOrdersModule.toggleSelectOrder = function(e, orderId) {
        e.stopPropagation();
        state.selectedBatchOrderIds = state.selectedBatchOrderIds || [];
        if (state.selectedBatchOrderIds.includes(orderId)) {
            state.selectedBatchOrderIds = state.selectedBatchOrderIds.filter(id => id !== orderId);
        } else {
            state.selectedBatchOrderIds.push(orderId);
        }
        renderOrdersTable();
    };

    window.PawpalOrdersModule.openActionDropdown = function(e, orderId) {
        e.stopPropagation();
        state.activeActionOrderId = orderId;
        const popover = document.getElementById('orderActionDropdown');
        if (!popover) return;

        const order = (state.orders || []).find(o => o.id === orderId);
        if (order) {
            const btnPay = document.getElementById('menuActionConfirmPayment');
            if (btnPay) {
                const canPay = (order.paymentStatus === 'unpaid' || !order.paymentStatus) && order.paymentStatus !== 'paid' && order.paymentMethod !== 'cod' && order.status !== 'cancelled';
                btnPay.style.display = canPay ? 'block' : 'none';
            }
            const btnReconcile = document.getElementById('menuActionReconcileCod');
            if (btnReconcile) {
                const isCod = order.paymentMethod === 'cod';
                const isDeliveredOrCompleted = order.status === 'delivered' || order.status === 'completed';
                const isAwaitingReconcile = order.paymentStatus === 'cod_pending' || order.paymentStatus === 'unpaid';
                const notPaid = order.paymentStatus !== 'paid';
                const notCancelled = order.status !== 'cancelled';
                btnReconcile.style.display = (isCod && isDeliveredOrCompleted && isAwaitingReconcile && notPaid && notCancelled) ? 'block' : 'none';
            }
            const btnShip = document.getElementById('menuActionShipOrder');
            if (btnShip) {
                const canShip = (order.status === 'confirmed' || order.status === 'pending' || order.status === 'shipping') && order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'delivered';
                btnShip.style.display = canShip ? 'block' : 'none';
            }
            const btnCancel = document.getElementById('menuActionCancelOrder');
            if (btnCancel) {
                btnCancel.style.display = (order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'delivered') ? 'block' : 'none';
            }
            const btnRma = document.getElementById('menuActionReturnRefund');
            if (btnRma) {
                btnRma.style.display = (order.status === 'delivered' || order.status === 'completed') ? 'block' : 'none';
            }
        }

        const rect = e.target.getBoundingClientRect();
        popover.style.top = `${rect.bottom + 4}px`;
        popover.style.left = `${rect.left - 130}px`;
        popover.classList.add('active');
    };

    window.PawpalOrdersModule.openOrderDetail = function(orderId) {
        state.selectedOrderId = orderId;
        sessionStorage.setItem('pawpal_admin_order_selected_id', orderId);
        if (typeof PawpalOrders.switchSubtab === 'function') {
            PawpalOrders.switchSubtab('tab-order-detail');
        }
        if (typeof PawpalOrders.renderOrderDetail === 'function') {
            PawpalOrders.renderOrderDetail(orderId);
        }
    };

    window.PawpalOrdersModule.openCustomerProfile = function(userId, customerName) {
        const custIdMap = {
            'USER-001': 'CUST-001', 'USER-002': 'CUST-002', 'USER-003': 'CUST-003',
            'USER-004': 'CUST-004', 'USER-005': 'CUST-005', 'USER-ADMIN': 'CUST-001'
        };
        const targetCustId = custIdMap[userId] || (userId && userId.startsWith('CUST-') ? userId : 'CUST-001');
        sessionStorage.setItem('pawpal_admin_customer_id', targetCustId);
        if (customerName) sessionStorage.setItem('pawpal_admin_customer_name', customerName);
        sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
        sessionStorage.setItem('pawpal_admin_active_module', 'Khách hàng');
        window.location.hash = '#tab-profile';
        const custBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khách hàng');
        if (custBtn) custBtn.click();
    };

    window.PawpalOrdersModule.confirmPayment = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;
        order.paymentStatus = 'paid';
        order.timeline.push({
            title: 'Đã xác nhận thu tiền',
            time: formatTime(new Date()) + ' - Hôm nay',
            desc: 'Nhân viên xác nhận đã thu đủ số tiền cho đơn hàng',
            done: true
        });

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client) {
            try {
                if (order.rawId) {
                    await client.from('sales_order').update({ payment_status: 'PAID' }).eq('id', order.rawId);
                } else {
                    await client.from('sales_order').update({ payment_status: 'PAID' }).eq('order_code', order.id);
                }
            } catch (e) {}
        }

        persistOrdersData();
        renderOrdersTable();
        showToast(`Đã xác nhận thu tiền cho đơn hàng ${orderId}!`, 'success');
    };

    window.PawpalOrdersModule.reconcileCod = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;
        order.paymentStatus = 'paid';
        order.timeline.push({
            title: 'Đã đối soát tiền COD',
            time: formatTime(new Date()) + ' - Hôm nay',
            desc: 'Kế toán xác nhận bưu cục đã chuyển khoản tiền COD về tài khoản PawPal',
            done: true
        });

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client) {
            try {
                if (order.rawId) {
                    await client.from('sales_order').update({ payment_status: 'PAID' }).eq('id', order.rawId);
                } else {
                    await client.from('sales_order').update({ payment_status: 'PAID' }).eq('order_code', order.id);
                }
            } catch (e) {}
        }

        persistOrdersData();
        renderOrdersTable();
        showToast(`Đã đối soát tiền COD cho đơn hàng ${orderId}!`, 'success');
    };

    window.PawpalOrdersModule.completeOrder = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;
        order.status = 'completed';
        const pointsEarned = Math.floor(order.total / 10000);
        order.timeline.push({
            title: 'Hoàn tất đơn hàng',
            time: formatTime(new Date()) + ' - Hôm nay',
            desc: `Đơn hàng đã hoàn thành và tích lũy +${pointsEarned} điểm Pawpoint`,
            done: true
        });

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client) {
            try {
                if (order.rawId) {
                    await client.from('sales_order').update({ order_status: 'COMPLETED' }).eq('id', order.rawId);
                } else {
                    await client.from('sales_order').update({ order_status: 'COMPLETED' }).eq('order_code', order.id);
                }
            } catch (e) {}
        }

        persistOrdersData();
        renderOrdersTable();
        if (typeof PawpalOrders.renderOrderDetail === 'function') {
            PawpalOrders.renderOrderDetail(orderId);
        }
        showToast(`Đơn hàng ${orderId} đã hoàn tất! +${pointsEarned} điểm Pawpoint.`, 'success');
    };

    window.PawpalOrdersModule.confirmOrder = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;
        order.status = 'confirmed';
        order.timeline.push({
            title: 'Đã xác nhận đơn hàng',
            time: formatTime(new Date()) + ' - Hôm nay',
            desc: 'Nhân viên đã duyệt đơn và xuất kho đóng gói',
            done: true
        });

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client) {
            try {
                if (order.rawId) {
                    await client.from('sales_order').update({ order_status: 'CONFIRMED' }).eq('id', order.rawId);
                } else {
                    await client.from('sales_order').update({ order_status: 'CONFIRMED' }).eq('order_code', order.id);
                }
            } catch (e) {}
        }

        persistOrdersData();
        renderOrdersTable();
        if (typeof PawpalOrders.renderOrderDetail === 'function') {
            PawpalOrders.renderOrderDetail(orderId);
        }
        showToast(`Đã xác nhận đơn hàng ${orderId}!`, 'success');
    };

    window.PawpalOrdersModule.completeDelivery = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;
        order.status = 'delivered';
        if (order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid') {
            order.paymentStatus = 'cod_pending';
        }
        order.timeline.push({
            title: 'Đã giao hàng thành công',
            time: formatTime(new Date()) + ' - Hôm nay',
            desc: 'Khách hàng đã nhận hàng thành công',
            done: true
        });

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client) {
            try {
                if (order.rawId) {
                    await client.from('sales_order').update({ order_status: 'DELIVERED' }).eq('id', order.rawId);
                } else {
                    await client.from('sales_order').update({ order_status: 'DELIVERED' }).eq('order_code', order.id);
                }
            } catch (e) {}
        }

        persistOrdersData();
        renderOrdersTable();
        if (typeof PawpalOrders.renderOrderDetail === 'function') {
            PawpalOrders.renderOrderDetail(orderId);
        }
        showToast(`Đã cập nhật Đã giao hàng cho đơn ${orderId}!`, 'success');
    };

    window.PawpalOrdersModule.openShipModal = function(orderId) {
        state.selectedOrderId = orderId;
        const targetEl = document.getElementById('shipOrderTargetCode');
        if (targetEl) targetEl.textContent = orderId;
        document.getElementById('modalShipOrder')?.classList.add('active');
    };

    window.PawpalOrdersModule.openCancelModal = function(orderId) {
        state.selectedOrderId = orderId;
        const targetEl = document.getElementById('cancelOrderTargetCode');
        if (targetEl) targetEl.textContent = orderId;
        document.getElementById('modalCancelOrder')?.classList.add('active');
    };

    window.PawpalOrdersModule.printPackingSlip = function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;
        const container = document.getElementById('packingSlipContainer');
        if (container) container.innerHTML = generatePackingSlipHtml(order);
        document.getElementById('modalPackingSlip')?.classList.add('active');
    };

    window.PawpalOrdersModule.printInvoice = function(orderId) {
        showToast(`Đang xuất hóa đơn bán lẻ PDF cho đơn ${orderId}...`, 'info');
    };

    window.PawpalOrdersModule.printBatchPackingSlips = function() {
        const selected = state.selectedBatchOrderIds || [];
        if (selected.length === 0) {
            showToast('Vui lòng chọn ít nhất một đơn hàng để in phiếu đóng gói.', 'warning');
            return;
        }
        const container = document.getElementById('packingSlipContainer');
        const selectedOrders = (state.orders || []).filter(o => selected.includes(o.id));
        if (container) {
            container.innerHTML = selectedOrders.map(o => generatePackingSlipHtml(o)).join('');
        }
        document.getElementById('modalPackingSlip')?.classList.add('active');
    };

    window.PawpalOrdersModule.openBatchDispatchModal = function() {
        const selected = state.selectedBatchOrderIds || [];
        if (selected.length === 0) {
            showToast('Vui lòng chọn ít nhất một đơn hàng để bàn giao vận chuyển.', 'warning');
            return;
        }
        const countEl = document.getElementById('batchDispatchCount');
        if (countEl) countEl.textContent = `${selected.length} đơn hàng`;
        document.getElementById('modalBatchDispatch')?.classList.add('active');
    };

    window.PawpalOrdersModule.exportDispatchManifest = function() {
        const selected = state.selectedBatchOrderIds || [];
        const targetOrders = selected.length > 0
            ? (state.orders || []).filter(o => selected.includes(o.id))
            : (state.orders || []).filter(o => o.status === 'shipping' || o.status === 'confirmed');

        if (targetOrders.length === 0) {
            showToast('Không có đơn hàng nào để xuất bảng kê bàn giao vận chuyển.', 'warning');
            return;
        }

        const carrier = targetOrders[0]?.carrier || 'Bưu cục đối tác';
        const container = document.getElementById('manifestContentContainer');
        if (container) container.innerHTML = generateManifestHtml(targetOrders, carrier);
        document.getElementById('modalDispatchManifest')?.classList.add('active');
    };

    window.PawpalOrdersModule.openReturnRefundModal = function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;

        state.selectedOrderId = order.id;
        const codeEl = document.getElementById('rmaOrderTargetCode');
        const custEl = document.getElementById('rmaCustomerName');
        const totalEl = document.getElementById('rmaOrderTotal');
        const tbody = document.getElementById('rmaItemsTableBody');

        if (codeEl) codeEl.textContent = order.id;
        if (custEl) custEl.textContent = `${order.customerName} (${order.phone})`;
        if (totalEl) totalEl.textContent = formatVND(order.total);

        if (tbody) {
            tbody.innerHTML = (order.products || []).map(p => `
                <tr data-sku="${p.sku}">
                    <td style="text-align: center;">
                        <input type="checkbox" class="admin-checkbox rma-item-select-checkbox" data-sku="${p.sku}" data-price="${p.price}" checked>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${p.name}</div>
                        <div class="sub-meta-text">Mã SKU: ${p.sku}</div>
                    </td>
                    <td style="text-align: center; font-weight: 500;">${p.quantity}</td>
                    <td style="text-align: center;">
                        <input type="number" class="admin-input rma-item-qty-input" value="${p.quantity}" min="1" max="${p.quantity}" data-max="${p.quantity}" style="width: 54px; height: 28px; text-align: center; padding: 2px;">
                    </td>
                    <td style="text-align: right; font-weight: 600;">${formatVND(p.price)}</td>
                </tr>
            `).join('');
        }

        document.getElementById('modalReturnRefund')?.classList.add('active');
    };

    window.PawpalOrdersModule.openRmaTicket = function(orderId) {
        PawpalOrdersModule.openReturnRefundModal(orderId);
    };

    window.PawpalOrdersModule.openComplaintModule = function(rmaId) {
        sessionStorage.setItem('pawpal_admin_active_module', 'Khiếu nại');
        sessionStorage.setItem('pawpal_admin_complaint_subtab', 'tab-complaint-orders');
        if (rmaId) sessionStorage.setItem('pawpal_admin_complaint_search', rmaId);
        const compBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khiếu nại');
        if (compBtn) compBtn.click();
    };

    window.PawpalOrdersModule.closeModal = function(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    };

    window.PawpalOrdersModule.selectPosCustomer = function(custId) {
        const cust = posCustomerDirectory.find(c => c.id === custId);
        if (cust) selectPosCustomer(cust);
    };

    window.PawpalOrdersModule.updatePosCartQty = updatePosCartQty;
    window.PawpalOrdersModule.removePosCartItem = removePosCartItem;

    // Khởi tạo sự kiện
    initListEvents();
})();
