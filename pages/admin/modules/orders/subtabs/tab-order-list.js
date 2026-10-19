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
        if (state.ordersError) {
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text-muted);">Không thể tải dữ liệu. Vui lòng tải lại trang.</td></tr>';
            return;
        }


        const ordersList = state.orders || [];
        if (!state.ordersLoaded) return;

        // Tự động nhận diện bộ lọc trạng thái chuyển tiếp từ Dashboard
        const pendingStatusFromSession = sessionStorage.getItem('pawpal_admin_order_filter_status');
        if (pendingStatusFromSession) {
            sessionStorage.removeItem('pawpal_admin_order_filter_status');
            currentFilterStatus = pendingStatusFromSession;
            const filterStatusSelect = document.getElementById('orderFilterStatus');
            if (filterStatusSelect) filterStatusSelect.value = pendingStatusFromSession;
            ordersCurrentPage = 1;
        }

        // Cập nhật 6 thẻ KPI nhanh
        const statTotalOrdersEl = document.getElementById('statTotalOrders');
        const statPendingOrdersEl = document.getElementById('statPendingOrders');
        const statPreparingOrdersEl = document.getElementById('statPreparingOrders');
        const statShippingOrdersEl = document.getElementById('statShippingOrders');
        const statCompletedOrdersEl = document.getElementById('statCompletedOrders');
        const statCancelledOrdersEl = document.getElementById('statCancelledOrders');

        if (statTotalOrdersEl) statTotalOrdersEl.textContent = ordersList.filter(order => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(order.createdAt)) === new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).length;
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
            // alertType danger cũng dùng cho SLA quá hạn; bộ lọc khiếu nại chỉ
            // nhận đơn đổi trả hoặc có hồ sơ RMA thực tế.
            if (filterComplaintOnly && o.status !== 'returned' && !o.rmaInfo) return false;
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

            const esc = (text) => window.PawpalOrdersModule?.escapeHtml ? window.PawpalOrdersModule.escapeHtml(text) : String(text || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
            const isChecked = selectedBatchOrderIds.includes(o.id);
            const safeId = esc(o.id);
            const safeName = esc(o.customerName);
            const safePhone = esc(o.phone);
            const safeUserId = esc(o.userId);
            const safeProdSummary = esc(prodSummary);
            const safeCarrier = esc(o.carrier || '--');
            const safeTracking = esc(o.trackingNumber || '--');

            return `
                <tr class="${rowAlertClass}">
                    <td style="text-align: center; width: 42px;">
                        <input type="checkbox" class="admin-checkbox order-row-checkbox" data-id="${safeId}" ${isChecked ? 'checked' : ''}>
                    </td>
                    <td>
                        <a href="javascript:void(0)" class="order-code-link btn-open-order-detail" data-id="${safeId}">${safeId}</a>
                    </td>
                    <td>
                        <div>
                            <span class="user-name-link btn-open-customer-profile" data-user-id="${safeUserId}" data-user-name="${safeName}">${safeName}</span>
                            <div class="sub-meta-text">${safePhone}</div>
                        </div>
                    </td>
                    <td style="max-width: 240px;">
                        <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${safeProdSummary}">${safeProdSummary}</div>
                        <div class="sub-meta-text">Tổng: ${(o.products || []).reduce((acc, p) => acc + (p.quantity || 1), 0)} sản phẩm</div>
                    </td>
                    <td>
                        <div class="price-text-main">${formatVND(o.total)}</div>
                    </td>
                    <td>
                        <div>${esc(payMethodLabel)}</div>
                        <div style="margin-top: 2px;">${payBadge}</div>
                    </td>
                    <td>
                        <div>${safeCarrier}</div>
                        <div class="sub-meta-text" style="font-family: monospace;">${safeTracking}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>${alertLabel}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger btn-order-action-trigger" data-id="${safeId}">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.order-row-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = cb.getAttribute('data-id');
                PawpalOrdersModule.toggleSelectOrder?.(e, id);
            });
        });
        tbody.querySelectorAll('.btn-open-order-detail').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-id');
                PawpalOrdersModule.openOrderDetail?.(id);
            });
        });
        tbody.querySelectorAll('.btn-open-customer-profile').forEach(el => {
            el.addEventListener('click', () => {
                const uid = el.getAttribute('data-user-id');
                const uname = el.getAttribute('data-user-name');
                PawpalOrdersModule.openCustomerProfile?.(uid, uname);
            });
        });
        tbody.querySelectorAll('.btn-order-action-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                PawpalOrdersModule.openActionDropdown?.(e, id);
            });
        });

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
                    .limit(500);

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

        if (!Array.isArray(posCustomerDirectory)) {
            posCustomerDirectory = [];
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
            <div class="customer-autocomplete-item" onclick="PawpalOrdersModule.selectPosCustomer('${c.id}')" style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; cursor: pointer; border-radius: var(--admin-radius);">
                <div class="cust-auto-left" style="display: flex; flex-direction: column; gap: 2px;">
                    <div class="cust-auto-name" style="font-weight: 600; color: #203A2C; font-size: 13px;">${c.name}</div>
                    <div class="cust-auto-phone" style="color: #4F7A65; font-size: 11.5px;">${c.phone || 'Chưa có SĐT'} • ${c.pets?.length || 0} bé cưng</div>
                </div>
                <div class="cust-auto-right" style="text-align: right;">
                    <span class="cust-auto-rank admin-badge" style="background: #EEF5F1; color: #236B48; font-size: 11px; padding: 2px 8px; border-radius: 9px; font-weight: 600;">${c.rank}</span>
                    <div class="cust-auto-points" style="color: #4F7A65; font-size: 11px; margin-top: 2px;">${c.points} điểm</div>
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

            const btnClear = document.getElementById('btnClearSelectedCustomer');
            if (btnClear) {
                btnClear.onclick = () => {
                    activePosCustomer = null;
                    if (nameInput) nameInput.value = '';
                    if (phoneInput) {
                        phoneInput.value = '';
                        phoneInput.focus();
                    }
                    card.style.display = 'none';
                    updatePosLiveCalculation();
                };
            }
        }

        updatePosLiveCalculation();
    }

    function renderPosCartTable() {
        const tbody = document.getElementById('posCartItemsList') || document.getElementById('createOrderCartBody');
        if (!tbody) return;

        if (posCartItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 18px 12px;">
                        Chưa có món nào trong giỏ hàng. Vui lòng chọn sản phẩm và bấm "Thêm món" ở trên.
                    </td>
                </tr>
            `;
            updatePosLiveCalculation();
            return;
        }

        tbody.innerHTML = posCartItems.map((item, idx) => `
            <tr>
                <td style="padding: 8px 12px;">
                    <div style="font-weight: 500; font-size: 13px;">${item.name}</div>
                    <div class="sub-meta-text">${item.sku}</div>
                </td>
                <td style="text-align: right; padding: 8px 10px;">${formatVND(item.price)}</td>
                <td style="text-align: center; padding: 8px 10px;">
                    <div style="display: inline-flex; align-items: center; gap: 4px;">
                        <button type="button" class="btn-qty-mini" aria-label="Giảm số lượng" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty - 1})">−</button>
                        <span style="font-weight: 600; min-width: 20px; text-align: center;">${item.qty}</span>
                        <button type="button" class="btn-qty-mini" aria-label="Tăng số lượng" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qty + 1})">+</button>
                    </div>
                </td>
                <td style="text-align: right; font-weight: 600; color: #236B48; padding: 8px 12px;">${formatVND(item.price * item.qty)}</td>
                <td style="text-align: center; padding: 8px;">
                    <button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removePosCartItem(${idx})">&times;</button>
                </td>
            </tr>
        `).join('');

        updatePosLiveCalculation();
    }

    const DEFAULT_POS_PRODUCTS = [
        { sku: 'TP-HAT-01', name: 'Thức ăn hạt cao cấp Royal Canin Mother & Babycat', price: 140000, category: 'Thực phẩm', stock: 45, image: '/assets/images/shop/products/tp-hat-01.png' },
        { sku: 'TP-PATE-02', name: 'Pate lon cho mèo Royal Canin Kitten Instinctive', price: 33000, category: 'Thực phẩm', stock: 80, image: '/assets/images/shop/products/tp-hat-01.png' },
        { sku: 'PK-BAT-01', name: 'Chén ăn bằng sứ vân đá cao cấp chống gù', price: 145000, category: 'Phụ kiện', stock: 18, image: '/assets/images/shop/products/tp-hat-01.png' },
        { sku: 'VS-CAT-01', name: 'Cát vệ sinh đậu nành hữu cơ Cature 6L', price: 120000, category: 'Vệ sinh', stock: 60, image: '/assets/images/shop/products/tp-hat-01.png' },
        { sku: 'DC-CAN-01', name: 'Cần câu mèo gắn chuông và lông vũ vũ đạo', price: 45000, category: 'Đồ chơi', stock: 32, image: '/assets/images/shop/products/tp-hat-01.png' }
    ];

    function getAvailableProducts() {
        if (Array.isArray(state.products) && state.products.length > 0) return state.products;
        return DEFAULT_POS_PRODUCTS;
    }

    function addToPosCart(sku, qty = 1) {
        const prod = getAvailableProducts().find(p => p.sku === sku);
        if (!prod) {
            showToast('Sản phẩm không tồn tại', 'warning');
            return;
        }
        if (prod.stock != null && prod.stock <= 0) {
            showToast(`Sản phẩm "${prod.name}" hiện đã hết hàng trong kho!`, 'warning');
            return;
        }

        const existing = posCartItems.find(i => i.sku === sku);
        const currentQty = existing ? existing.qty : 0;
        const targetQty = currentQty + qty;

        if (prod.stock != null && targetQty > prod.stock) {
            showToast(`Kho chỉ còn ${prod.stock} sản phẩm. Đã điều chỉnh về số lượng tối đa khả dụng!`, 'warning');
            if (existing) {
                existing.qty = prod.stock;
            } else {
                posCartItems.push({
                    sku: prod.sku,
                    name: prod.name,
                    price: prod.price,
                    qty: prod.stock,
                    image: prod.image,
                    maxStock: prod.stock
                });
            }
            renderPosCartTable();
            return;
        }

        if (existing) {
            existing.qty = targetQty;
        } else {
            posCartItems.push({
                sku: prod.sku,
                name: prod.name,
                price: prod.price,
                qty: qty,
                image: prod.image,
                maxStock: prod.stock
            });
        }
        renderPosCartTable();
    }

    function updatePosCartQty(index, newQty) {
        if (newQty <= 0) {
            posCartItems.splice(index, 1);
        } else if (posCartItems[index]) {
            const item = posCartItems[index];
            const prod = getAvailableProducts().find(p => p.sku === item.sku);
            if (prod && prod.stock != null && newQty > prod.stock) {
                showToast(`Số lượng vượt quá tồn kho khả dụng (${prod.stock})`, 'warning');
                item.qty = prod.stock;
            } else {
                item.qty = newQty;
            }
        }
        renderPosCartTable();
    }

    function removePosCartItem(index) {
        posCartItems.splice(index, 1);
        renderPosCartTable();
    }

    function renderCreateOrderProductDropdown(filterText = '') {
        const dropdown = document.getElementById('createOrderProductDropdown');
        if (!dropdown) return;

        const q = (filterText || '').toLowerCase().trim();
        const prods = getAvailableProducts().filter(p => {
            if (!q) return true;
            return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
        });

        if (prods.length === 0) {
            dropdown.innerHTML = '<div class="customer-autocomplete-empty">Không tìm thấy sản phẩm phù hợp</div>';
            dropdown.style.display = 'block';
            return;
        }

        dropdown.innerHTML = prods.slice(0, 15).map(p => `
            <div class="customer-autocomplete-item" onclick="PawpalOrdersModule.selectPosProduct('${p.sku}')" style="display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; cursor: pointer; border-radius: var(--admin-radius);">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-weight: 600; color: #203A2C; font-size: 13px;">${p.name}</div>
                    <div style="color: #4F7A65; font-size: 11.5px;">SKU: ${p.sku} • Kho: ${p.stock || p.stockQuantity || 25}</div>
                </div>
                <div style="font-weight: 600; color: #236B48; font-size: 13px;">${formatVND(p.price)}</div>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    }

    function selectPosProduct(sku) {
        const prod = getAvailableProducts().find(p => p.sku === sku);
        if (!prod) return;
        const searchInput = document.getElementById('createOrderProductSearchInput');
        const hiddenSku = document.getElementById('createOrderSelectedProductSku');
        const dropdown = document.getElementById('createOrderProductDropdown');

        if (searchInput) searchInput.value = prod.name;
        if (hiddenSku) hiddenSku.value = prod.sku;
        if (dropdown) dropdown.style.display = 'none';
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
            const now = new Date();
            const foundVoucher = vList.find(v => {
                if (v.code !== voucherInput) return false;
                if (v.status !== 'active' && v.status !== 'Đang chạy') return false;
                if (v.startDate && new Date(v.startDate) > now) return false;
                if (v.endDate && new Date(v.endDate) < now) return false;
                if (v.usageLimit && v.usedCount != null && v.usedCount >= v.usageLimit) return false;
                if (v.minOrder && subtotal < v.minOrder) return false;
                return true;
            });
            if (foundVoucher) {
                if (foundVoucher.type === 'percent') {
                    voucherDiscount = Math.round(subtotal * (foundVoucher.value / 100));
                    if (foundVoucher.maxDiscount && voucherDiscount > foundVoucher.maxDiscount) {
                        voucherDiscount = foundVoucher.maxDiscount;
                    }
                } else {
                    voucherDiscount = Number(foundVoucher.value) || 0;
                }
            }
        }

        let pointsInput = Math.max(0, parseInt(document.getElementById('createOrderPointsInput')?.value || '0', 10) || 0);
        const maxCustPoints = activePosCustomer?.points || 0;
        if (pointsInput > maxCustPoints) {
            pointsInput = maxCustPoints;
            const ptInputEl = document.getElementById('createOrderPointsInput');
            if (ptInputEl) ptInputEl.value = pointsInput;
        }
        const pointsDiscount = Math.max(0, pointsInput * 100);

        const isDelivery = document.getElementById('radioAddrDelivery')?.checked === true;
        const shippingFee = (isDelivery && subtotal > 0) ? 25000 : 0;

        const grandTotal = Math.max(0, subtotal - tierDiscount - voucherDiscount - pointsDiscount + shippingFee);

        const subtotalDisp = document.getElementById('posLiveSubtotal');
        const tierDisp = document.getElementById('posLiveTierDiscount');
        const voucherDisp = document.getElementById('posLiveVoucherDiscount');
        const pointsDisp = document.getElementById('posLivePointsDiscount');
        const shipDisp = document.getElementById('posLiveShippingFee');
        const grandDisp = document.getElementById('posLiveTotal');

        const itemCount = document.getElementById('posCartItemCount');
        if (itemCount) itemCount.textContent = posCartItems.reduce((sum, item) => sum + item.qty, 0);
        [
            ['posRowTierDiscount', tierDiscount],
            ['posRowVoucherDiscount', voucherDiscount],
            ['posRowPointsDiscount', pointsDiscount],
            ['posRowShippingFee', shippingFee]
        ].forEach(([id, amount]) => {
            const row = document.getElementById(id);
            if (row) row.style.display = amount > 0 ? '' : 'none';
        });
        const cashSection = document.getElementById('posCashCalcSection');
        if (cashSection) cashSection.style.display = document.getElementById('createOrderPaymentMethod')?.value === 'cash' ? '' : 'none';

        if (subtotalDisp) subtotalDisp.textContent = formatVND(subtotal);
        if (tierDisp) tierDisp.textContent = '- ' + formatVND(tierDiscount);
        if (voucherDisp) voucherDisp.textContent = '- ' + formatVND(voucherDiscount);
        if (pointsDisp) pointsDisp.textContent = '- ' + formatVND(pointsDiscount);
        if (shipDisp) shipDisp.textContent = formatVND(shippingFee);
        if (grandDisp) grandDisp.textContent = formatVND(grandTotal);

        const cashInput = parseInt(document.getElementById('createOrderCashTendered')?.value || '0', 10);
        const cashChangeEl = document.getElementById('posLiveCashChange');
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

    function addCashTendered(amount) {
        const input = document.getElementById('createOrderCashTendered');
        if (!input) return;
        const current = parseInt(input.value || '0', 10);
        input.value = current + amount;
        updatePosLiveCalculation();
    }

    function setCashTenderedExact() {
        const calc = updatePosLiveCalculation();
        const input = document.getElementById('createOrderCashTendered');
        if (input) {
            input.value = calc.grandTotal;
            updatePosLiveCalculation();
        }
    }

    function openPosReceipt(order) {
        if (!order) return;
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setTxt('recOrderId', order.id || '--');
        setTxt('recOrderTime', (formatTime(order.createdAt || new Date())) + ' - ' + (formatDate(order.createdAt || new Date())));
        setTxt('recCashier', 'Quản trị viên');
        setTxt('recCustName', order.customerName || 'Khách vãng lai');
        setTxt('recCustPhone', order.phone || '--');

        const tbody = document.getElementById('recItemsBody');
        if (tbody) {
            tbody.innerHTML = (order.products || []).map(p => `
                <tr style="border-bottom: 1px dashed #ECF2EE;">
                    <td style="padding: 4px 0;">
                        <div style="font-weight: 500;">${p.name}</div>
                        <div style="color: #5C6E64; font-size: 11px;">${p.sku}</div>
                    </td>
                    <td style="padding: 4px 4px; text-align: center;">${p.quantity}</td>
                    <td style="padding: 4px 4px; text-align: right;">${formatVND(p.price)}</td>
                    <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #236B48;">${formatVND(p.total || (p.price * p.quantity))}</td>
                </tr>
            `).join('');
        }

        setTxt('recSubtotal', formatVND(order.subtotal || 0));
        setTxt('recDiscount', (order.discount > 0 ? '- ' : '') + formatVND(order.discount || 0));
        setTxt('recPointsDiscount', (order.pawPointsUsed > 0 ? '- ' : '') + formatVND((order.pawPointsUsed || 0) * 100));
        setTxt('recShipping', formatVND(order.shippingFee || 0));
        setTxt('recTotal', formatVND(order.total || 0));

        let payLabel = 'Tiền mặt';
        if (order.paymentMethod === 'transfer' || order.paymentMethod === 'bank') payLabel = 'Chuyển khoản QR';
        else if (order.paymentMethod === 'pos_card' || order.paymentMethod === 'card') payLabel = 'Thẻ POS';
        else if (order.paymentMethod === 'cod') payLabel = 'Thanh toán COD';
        setTxt('recPayMethod', payLabel);

        const cashTenderedVal = order.cashTendered != null ? Number(order.cashTendered) : (order.total || 0);
        const cashChangeVal = order.cashChange != null ? Number(order.cashChange) : Math.max(0, cashTenderedVal - (order.total || 0));
        setTxt('recCashTendered', formatVND(cashTenderedVal));
        setTxt('recCashChange', formatVND(cashChangeVal));

        const earnedPoints = Math.max(0, Math.floor((order.total || 0) / 100000));
        setTxt('recPointsEarned', `+${earnedPoints} điểm Pawpoint`);
        setTxt('recCustRank', (activePosCustomer && activePosCustomer.rank) ? activePosCustomer.rank : 'Thành viên Bạc');

        document.getElementById('modalPosReceipt')?.classList.add('active');
    }

    function printReceiptDirectly() {
        showToast('Đang mở hộp thoại in của trình duyệt...', 'info');
        setTimeout(() => {
            window.print();
        }, 300);
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.list = {
        renderOrdersTable,
        renderOrdersPagination,
        clearAllOrderFilters,
        loadPosCustomerDirectory
    };

    // Khởi tạo các sự kiện giao diện cho Subtab List
    let isListEventsInitialized = false;
    function initListEvents() {
        if (isListEventsInitialized) return;
        isListEventsInitialized = true;
        let orderSearchTimer = null;
        document.getElementById('orderSearchInput')?.addEventListener('input', () => {
            clearTimeout(orderSearchTimer);
            orderSearchTimer = setTimeout(() => {
                ordersCurrentPage = 1;
                renderOrdersTable();
            }, 300);
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
                    const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || '').toUpperCase();
                    if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'ACCOUNTANT') {
                        showToast('Chỉ Kế toán, Quản lý hoặc Quản trị viên mới có quyền đối soát thu tiền COD.', 'danger');
                        return;
                    }

                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client) {
                        showToast('Chưa kết nối cơ sở dữ liệu Supabase!', 'danger');
                        return;
                    }

                    let successCount = 0;
                    let successAmount = 0;
                    let failedCount = 0;

                    for (const o of codPending) {
                        try {
                            let updateRes;
                            if (o.rawId) {
                                updateRes = await client.from('sales_order').update({ payment_status: 'da_thanh_toan' }).eq('id', o.rawId);
                            } else {
                                updateRes = await client.from('sales_order').update({ payment_status: 'da_thanh_toan' }).eq('order_code', o.id);
                            }
                            if (updateRes?.error) throw updateRes.error;

                            o.paymentStatus = 'paid';
                            o.timeline.push({
                                title: 'Đã đối soát tiền COD (Hàng loạt)',
                                time: formatTime(new Date()) + ' - Hôm nay',
                                desc: 'Kế toán xác nhận bưu cục đã chuyển khoản tiền COD về tài khoản PawPal',
                                done: true
                            });
                            successCount++;
                            successAmount += (o.total || 0);
                        } catch (errOne) {
                            console.error(`[COD] Lỗi đối soát đơn ${o.id}:`, errOne);
                            failedCount++;
                        }
                    }

                    persistOrdersData();
                    renderOrdersTable();

                    if (failedCount === 0) {
                        showToast(`Đã đối soát thành công toàn bộ ${successCount} đơn hàng COD (${formatVND(successAmount)})!`, 'success');
                    } else if (successCount > 0) {
                        showToast(`Đã đối soát thành công ${successCount}/${codPending.length} đơn (${formatVND(successAmount)}). Có ${failedCount} đơn cập nhật thất bại.`, 'warning');
                    } else {
                        showToast('Đối soát toàn bộ đơn COD thất bại trên cơ sở dữ liệu!', 'danger');
                    }
                }
            });
        });

        // POS Listeners
        document.getElementById('btnOpenCreateOrderModal')?.addEventListener('click', async () => {
            posCartItems = [];
            activePosCustomer = null;
            await loadPosCustomerDirectory();
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

        const handleAddProductToPos = () => {
            const prodList = getAvailableProducts();
            let sku = document.getElementById('createOrderSelectedProductSku')?.value;
            if (!sku) {
                const searchVal = (document.getElementById('createOrderProductSearchInput')?.value || '').trim().toLowerCase();
                if (!searchVal) {
                    showToast('Vui lòng chọn sản phẩm muốn thêm vào giỏ', 'warning');
                    return;
                }
                const matched = prodList.find(p => (p.name || '').toLowerCase().includes(searchVal) || (p.sku || '').toLowerCase() === searchVal);
                if (matched) sku = matched.sku;
            }
            if (!sku) {
                showToast('Không tìm thấy sản phẩm phù hợp', 'warning');
                return;
            }
            const qtyInput = document.getElementById('createOrderQty');
            const qty = parseInt(qtyInput?.value || '1', 10);
            if (!Number.isFinite(qty) || qty <= 0) {
                showToast('Số lượng sản phẩm phải là số nguyên dương lớn hơn 0', 'warning');
                return;
            }
            addToPosCart(sku, qty);

            const searchInput = document.getElementById('createOrderProductSearchInput');
            const hiddenSku = document.getElementById('createOrderSelectedProductSku');
            if (searchInput) searchInput.value = '';
            if (hiddenSku) hiddenSku.value = '';
        };

        document.getElementById('btnPosAddToCart')?.addEventListener('click', handleAddProductToPos);
        document.getElementById('createOrderBtnAddProduct')?.addEventListener('click', handleAddProductToPos);

        document.getElementById('createOrderProductSearchInput')?.addEventListener('input', (e) => {
            renderCreateOrderProductDropdown(e.target.value);
        });

        document.getElementById('createOrderProductSearchInput')?.addEventListener('focus', (e) => {
            renderCreateOrderProductDropdown(e.target.value);
        });

        document.getElementById('createOrderPhone')?.addEventListener('input', (e) => {
            renderCreateOrderCustomerDropdown(e.target.value);
        });

        document.getElementById('createOrderPhone')?.addEventListener('focus', (e) => {
            renderCreateOrderCustomerDropdown(e.target.value);
        });

        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('createOrderCustomerDropdown');
            const phoneInput = document.getElementById('createOrderPhone');
            if (dropdown && dropdown.style.display === 'block') {
                if (!dropdown.contains(e.target) && e.target !== phoneInput) {
                    dropdown.style.display = 'none';
                }
            }

            const prodDropdown = document.getElementById('createOrderProductDropdown');
            const prodInput = document.getElementById('createOrderProductSearchInput');
            if (prodDropdown && prodDropdown.style.display === 'block') {
                if (!prodDropdown.contains(e.target) && e.target !== prodInput) {
                    prodDropdown.style.display = 'none';
                }
            }
        });

        document.getElementById('btnCashExact')?.addEventListener('click', setCashTenderedExact);

        document.getElementById('createOrderCashTendered')?.addEventListener('input', () => {
            updatePosLiveCalculation();
        });

        ['createOrderVoucherCode', 'createOrderPointsInput'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updatePosLiveCalculation);
            document.getElementById(id)?.addEventListener('change', updatePosLiveCalculation);
        });
        ['radioAddrInStore', 'radioAddrDelivery', 'createOrderPaymentMethod'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', updatePosLiveCalculation);
        });

        document.getElementById('formCreateOrder')?.addEventListener('submit', (e) => e.preventDefault());

        let isPosFinalizing = false;
        const handleFinalizePosOrder = async () => {
            if (isPosFinalizing) return;
            if (posCartItems.length === 0) {
                showToast('Giỏ hàng đang trống. Vui lòng thêm ít nhất một sản phẩm.', 'warning');
                return;
            }
            isPosFinalizing = true;
            const btnSubmit = document.getElementById('btnSubmitCreateOrder');
            const btnFinalize = document.getElementById('btnFinalizePosOrder');
            if (btnSubmit) btnSubmit.disabled = true;
            if (btnFinalize) btnFinalize.disabled = true;

            const name = document.getElementById('createOrderName')?.value.trim() || 'Khách vãng lai';
            const phone = document.getElementById('createOrderPhone')?.value.trim() || '';
            const payMethod = document.getElementById('createOrderPaymentMethod')?.value || 'cash';
            const voucherInput = document.getElementById('createOrderVoucherCode')?.value.trim();
            const isDelivery = document.getElementById('radioAddrDelivery')?.checked === true;
            const noteVal = document.getElementById('createOrderNote')?.value.trim();
            const calc = updatePosLiveCalculation();

            const randSuffix = Math.floor(1000 + Math.random() * 9000);
            const newCode = 'ORD-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-4) + '-' + randSuffix;
            const finalAddr = isDelivery ? 'Giao tận nơi theo yêu cầu' : 'Tại cửa hàng PawPal - Khách nhận trực tiếp (Chi nhánh Quận 1, TP. HCM)';
            const finalUserId = (activePosCustomer && activePosCustomer.id) || null;

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
            if (!client) {
                showToast('Chưa kết nối được cơ sở dữ liệu Supabase. Vui lòng kiểm tra lại.', 'danger');
                return;
            }

            try {
                let targetShippingAddressId = null;
                if (activePosCustomer && activePosCustomer.id) {
                    const { data: addrs } = await client.from('customer_address').select('id').eq('customer_id', activePosCustomer.id).limit(1);
                    if (addrs && addrs.length > 0) {
                        targetShippingAddressId = addrs[0].id;
                    } else {
                        const { data: newAddr } = await client.from('customer_address').insert({
                            customer_id: activePosCustomer.id,
                            receiver_name: activePosCustomer.name || name,
                            receiver_phone: activePosCustomer.phone || phone || '0900000000',
                            province: 'TP. Hồ Chí Minh',
                            street_address: isDelivery ? 'Địa chỉ giao hàng' : 'Nhận trực tiếp tại quầy Pawpal',
                            is_default: true
                        }).select('id').single();
                        if (newAddr) targetShippingAddressId = newAddr.id;
                    }
                }
                if (!targetShippingAddressId) {
                    const { data: defaultAddr } = await client.from('customer_address').select('id').limit(1);
                    if (defaultAddr && defaultAddr.length > 0) targetShippingAddressId = defaultAddr[0].id;
                }
                // O-02: Địa chỉ thuộc đúng khách hàng nếu khách có tài khoản

                const { data: orderRow, error: orderErr } = await client.from('sales_order').insert({
                    order_code: newCode,
                    customer_id: (finalUserId && finalUserId.length > 20) ? finalUserId : null,
                    shipping_address_id: targetShippingAddressId,
                    order_status: isDelivery ? 'PACKING' : 'DELIVERED',
                    payment_status: (isDelivery && payMethod === 'cod') ? 'UNPAID' : 'PAID',
                    total_amount: calc.grandTotal,
                    note: noteVal || 'Đơn POS'
                }).select().single();

                if (orderErr || !orderRow) {
                    throw (orderErr || new Error('Không thể tạo bản ghi đơn hàng trên cơ sở dữ liệu.'));
                }

                // Cập nhật số lần sử dụng voucher nếu có áp dụng
                if (calc.voucherDiscount > 0 && voucherInput) {
                    try {
                        const { data: vRow } = await client.from('voucher').select('id, usage_count').ilike('voucher_code', voucherInput.trim()).maybeSingle();
                        if (vRow) {
                            await client.from('voucher').update({ usage_count: (vRow.usage_count || 0) + 1 }).eq('id', vRow.id);
                        }
                    } catch (vErr) {
                        console.warn('[POS] Lỗi cập nhật voucher usage:', vErr);
                    }
                }

                newOrder.rawId = orderRow.id;
                if (orderRow.order_code) {
                    newOrder.id = orderRow.order_code;
                }

                if (posCartItems.length > 0) {
                    const detailRows = posCartItems.map(item => {
                        const prod = (state.products || []).find(p => p.sku === item.sku);
                        const variantId = item.variantId || prod?.variant_id || prod?.default_variant_id || (prod?.variants && prod.variants[0]?.id) || null;
                        return {
                            order_id: orderRow.id,
                            product_variant_id: variantId,
                            quantity: item.qty,
                            unit_price: item.price,
                            subtotal: item.price * item.qty
                        };
                    }).filter(d => d.product_variant_id);
                    if (detailRows.length > 0) {
                        const { error: detailErr } = await client.from('sales_order_detail').insert(detailRows);
                        if (detailErr) {
                            console.error('[POS] Lỗi lưu chi tiết đơn hàng:', detailErr);
                        }
                    }

                    // O-04: Trừ tồn kho trong bảng inventory cho các mặt hàng đã bán tại POS
                    for (const item of posCartItems) {
                        const prod = (state.products || []).find(p => p.sku === item.sku);
                        const variantId = item.variantId || prod?.variant_id || prod?.default_variant_id || (prod?.variants && prod.variants[0]?.id) || null;
                        if (variantId) {
                            try {
                                const { data: invRow } = await client.from('inventory')
                                    .select('id, quantity_in_stock')
                                    .eq('product_variant_id', variantId)
                                    .limit(1);
                                if (invRow && invRow[0]) {
                                    const currentStock = Number(invRow[0].quantity_in_stock) || 0;
                                    const newStock = Math.max(0, currentStock - item.qty);
                                    await client.from('inventory')
                                        .update({ quantity_in_stock: newStock, last_updated_at: new Date().toISOString() })
                                        .eq('id', invRow[0].id);
                                    if (prod) prod.stock = newStock;
                                }
                            } catch (invErr) {
                                console.error('[POS] Lỗi trừ tồn kho cho sản phẩm ' + item.sku + ':', invErr);
                            }
                        }
                    }
                }

                // O-04: Xử lý trừ điểm Pawpoint thật trên membership và ghi ledger nếu khách dùng điểm
                if (calc.pointsUsed > 0 && finalUserId) {
                    try {
                        const { data: memData } = await client.from('customer_membership')
                            .select('id, total_paw_points')
                            .eq('customer_id', finalUserId)
                            .maybeSingle();
                        if (memData) {
                            const curPts = Number(memData.total_paw_points) || 0;
                            const newBalance = Math.max(0, curPts - calc.pointsUsed);
                            await client.from('customer_membership')
                                .update({ total_paw_points: newBalance })
                                .eq('id', memData.id);
                            await client.from('paw_point_transaction').insert({
                                customer_id: finalUserId,
                                reward_rule_id: '92222222-2222-2222-2222-222222222222',
                                points: -calc.pointsUsed,
                                balance_after: newBalance,
                                description: `Trừ ${calc.pointsUsed} điểm thanh toán đơn hàng POS ${newOrder.id}`
                            });
                        }
                    } catch (ptErr) {
                        console.error('[POS] Lỗi cập nhật trừ điểm Pawpoint:', ptErr);
                    }
                }

                state.orders = state.orders || [];
                state.orders.unshift(newOrder);
                persistOrdersData();

                document.getElementById('modalCreateOrder')?.classList.remove('active');
                renderOrdersTable();
                showToast(`Đã tạo thành công đơn hàng POS ${newOrder.id}!`, 'success');
                openPosReceipt(newOrder);
            } catch (e) {
                console.error('[POS] Lỗi ghi nhận đơn POS lên Supabase:', e);
                showToast(`Tạo đơn hàng POS thất bại: ${e?.message || 'Lỗi cơ sở dữ liệu'}`, 'danger');
                // O-03: Chặn đứng, không tạo đơn hàng ma trên màn hình khi CSDL gặp lỗi!
            } finally {
                isPosFinalizing = false;
                const btnSubmit = document.getElementById('btnSubmitCreateOrder');
                const btnFinalize = document.getElementById('btnFinalizePosOrder');
                if (btnSubmit) btnSubmit.disabled = false;
                if (btnFinalize) btnFinalize.disabled = false;
            }
        };

        document.getElementById('btnSubmitCreateOrder')?.addEventListener('click', handleFinalizePosOrder);
        document.getElementById('btnFinalizePosOrder')?.addEventListener('click', handleFinalizePosOrder);

        // Bàn giao vận chuyển modal submit
        document.getElementById('formShipOrder')?.addEventListener('submit', (e) => e.preventDefault());
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
                    const providerMap = {
                        'j và t express': 'cfd67b15-d045-42f6-b2b5-b182addb9eac',
                        'j&t express': 'cfd67b15-d045-42f6-b2b5-b182addb9eac',
                        'jnt': 'cfd67b15-d045-42f6-b2b5-b182addb9eac',
                        'giao hàng tiết kiệm ghtk': '59849fde-3105-4751-b1ae-e1d617068c79',
                        'giao hàng tiết kiệm': '59849fde-3105-4751-b1ae-e1d617068c79',
                        'ghtk': '59849fde-3105-4751-b1ae-e1d617068c79',
                        'viettel post': 'a5a7d7b8-9d07-4f05-849f-592604a9a12c',
                        'vtp': 'a5a7d7b8-9d07-4f05-849f-592604a9a12c',
                        'giao hàng nhanh': 'd6818d11-232a-4f72-b11b-3d5728ac3b2d',
                        'ghn': 'd6818d11-232a-4f72-b11b-3d5728ac3b2d',
                        'ninja van': '09e5fe86-59dd-426c-9321-0a0b7e5af5e9'
                    };
                    const resolvedProviderUuid = providerMap[String(carrier || '').toLowerCase().trim()] || null;
                    const shipNote = `Hãng: ${carrier}; Vận đơn: ${tracking}`;
                    const payload = {
                        order_status: 'dang_giao_hang',
                        tracking_code: tracking,
                        shipping_provider_id: resolvedProviderUuid,
                        shipped_at: new Date().toISOString(),
                        note: order.note ? `${order.note} | ${shipNote}` : shipNote
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
        document.getElementById('formCancelOrder')?.addEventListener('submit', (e) => e.preventDefault());
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
                        order_status: 'da_huy',
                        payment_status: (order.paymentStatus === 'refund_pending') ? 'da_hoan_tien' : 'chua_thanh_toan'
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

        // In phiếu đóng gói
        document.getElementById('btnPrintSlipConfirm')?.addEventListener('click', () => {
            showToast('Đang gửi lệnh in phiếu đóng gói tới máy in...', 'info');
            setTimeout(() => { window.print(); }, 300);
        });

        // Bàn giao vận chuyển hàng loạt
        document.getElementById('formBatchDispatch')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('btnSubmitBatchDispatch')?.addEventListener('click', async () => {
            const selected = state.selectedBatchOrderIds || [];
            if (selected.length === 0) {
                showToast('Chưa chọn đơn hàng nào để bàn giao.', 'warning');
                return;
            }
            const carrier = document.getElementById('batchCarrierSelect')?.value || 'J và T Express';
            const trackingMode = document.getElementById('batchTrackingMode')?.value || 'auto';
            const note = document.getElementById('batchCarrierNote')?.value?.trim() || '';

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            let successCount = 0;

            for (const orderId of selected) {
                const order = (state.orders || []).find(o => o.id === orderId);
                if (!order) continue;

                if (order.status === 'cancelled' || order.status === 'delivered') continue;

                let tracking = order.trackingNumber;
                if (trackingMode === 'auto' || !tracking) {
                    tracking = 'PAW' + Math.floor(10000000 + Math.random() * 90000000);
                }

                order.status = 'shipping';
                order.carrier = carrier;
                order.trackingNumber = tracking;
                order.timeline.push({
                    title: 'Đã bàn giao vận chuyển (Hàng loạt)',
                    time: formatTime(new Date()) + ' - Hôm nay',
                    desc: `Bàn giao cho ${carrier}. Mã vận đơn: ${tracking}${note ? ` | Ghi chú: ${note}` : ''}`,
                    done: true
                });

                if (client) {
                    try {
                        const providerMap = {
                            'j và t express': 'cfd67b15-d045-42f6-b2b5-b182addb9eac',
                            'j&t express': 'cfd67b15-d045-42f6-b2b5-b182addb9eac',
                            'jnt': 'cfd67b15-d045-42f6-b2b5-b182addb9eac',
                            'giao hàng tiết kiệm ghtk': '59849fde-3105-4751-b1ae-e1d617068c79',
                            'giao hàng tiết kiệm': '59849fde-3105-4751-b1ae-e1d617068c79',
                            'ghtk': '59849fde-3105-4751-b1ae-e1d617068c79',
                            'viettel post': 'a5a7d7b8-9d07-4f05-849f-592604a9a12c',
                            'vtp': 'a5a7d7b8-9d07-4f05-849f-592604a9a12c',
                            'giao hàng nhanh': 'd6818d11-232a-4f72-b11b-3d5728ac3b2d',
                            'ghn': 'd6818d11-232a-4f72-b11b-3d5728ac3b2d',
                            'ninja van': '09e5fe86-59dd-426c-9321-0a0b7e5af5e9'
                        };
                        const resolvedProviderUuid = providerMap[String(carrier || '').toLowerCase().trim()] || null;
                        const shipNote = `Hãng: ${carrier}; Vận đơn: ${tracking}`;
                        const payload = {
                            order_status: 'dang_giao_hang',
                            tracking_code: tracking,
                            shipping_provider_id: resolvedProviderUuid,
                            shipped_at: new Date().toISOString(),
                            note: order.note ? `${order.note} | ${shipNote}` : shipNote
                        };
                        if (order.rawId) {
                            await client.from('sales_order').update(payload).eq('id', order.rawId);
                        } else {
                            await client.from('sales_order').update(payload).eq('order_code', order.id);
                        }
                    } catch (e) {}
                }
                successCount++;
            }

            state.selectedBatchOrderIds = [];
            persistOrdersData();
            PawpalOrdersModule.closeModal('modalBatchDispatch');
            renderOrdersTable();
            showToast(`Đã bàn giao vận chuyển thành công ${successCount} đơn hàng cho ${carrier}!`, 'success');
        });

        // In bảng kê bàn giao bưu cục
        document.getElementById('btnPrintManifestConfirm')?.addEventListener('click', () => {
            showToast('Đang gửi lệnh in bảng kê bàn giao bưu cục tới máy in...', 'info');
            setTimeout(() => { window.print(); }, 300);
        });

        // Hỗ trợ kiểm thử tự động cho modal8
        if (window.location.search.includes('v=modal8')) {
            setTimeout(() => {
                PawpalOrdersModule.openReturnRefundModal();
            }, 600);
        }
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
        // Đơn mới dùng trực tiếp UUID customer_id. Chỉ giữ map cho dữ liệu cũ,
        // không được rơi về CUST-001 vì sẽ mở nhầm hồ sơ khách hàng.
        const targetCustId = custIdMap[userId] || (userId && userId !== 'GUEST' ? userId : '');
        if (!targetCustId) {
            PawpalOrders.showToast('Đơn vãng lai không có hồ sơ khách hàng để mở.');
            return;
        }
        sessionStorage.setItem('pawpal_admin_customer_id', targetCustId);
        if (customerName) sessionStorage.setItem('pawpal_admin_customer_name', customerName);
        sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
        sessionStorage.removeItem('pawpal_admin_order_selected_id');
        sessionStorage.removeItem('pawpal_admin_order_id');
        const custBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khách hàng');
        if (custBtn) {
            // Sidebar là điểm chuyển module duy nhất: nó đồng bộ module, hash và DOM.
            custBtn.click();
        } else {
            sessionStorage.setItem('pawpal_admin_active_module', 'Khách hàng');
            window.location.hash = '#tab-profile';
        }
    };

    window.PawpalOrdersModule.confirmPayment = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;

        const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || '').toUpperCase();
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'CASHIER' && userRole !== 'ACCOUNTANT') {
            showToast('Chỉ Thu ngân, Kế toán hoặc Quản trị viên mới có quyền xác nhận thu tiền.', 'danger');
            return;
        }

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) {
            showToast('Chưa kết nối cơ sở dữ liệu Supabase!', 'danger');
            return;
        }

        try {
            let res;
            if (order.rawId) {
                res = await client.from('sales_order').update({ payment_status: 'da_thanh_toan' }).eq('id', order.rawId);
            } else {
                res = await client.from('sales_order').update({ payment_status: 'da_thanh_toan' }).eq('order_code', order.id);
            }
            if (res?.error) throw res.error;

            order.paymentStatus = 'paid';
            order.timeline.push({
                title: 'Đã xác nhận thu tiền',
                time: formatTime(new Date()) + ' - Hôm nay',
                desc: 'Nhân viên xác nhận đã thu đủ số tiền cho đơn hàng',
                done: true
            });

            persistOrdersData();
            renderOrdersTable();
            showToast(`Đã xác nhận thu tiền cho đơn hàng ${orderId}!`, 'success');
        } catch (err) {
            console.error('[Orders] Lỗi xác nhận thu tiền:', err);
            showToast(`Xác nhận thu tiền thất bại: ${err?.message || 'Lỗi CSDL'}`, 'danger');
        }
    };

    window.PawpalOrdersModule.reconcileCod = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;

        const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || '').toUpperCase();
        if (userRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'ACCOUNTANT') {
            showToast('Chỉ Kế toán, Quản lý hoặc Quản trị viên mới có quyền đối soát thu tiền COD.', 'danger');
            return;
        }

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) {
            showToast('Chưa kết nối cơ sở dữ liệu Supabase!', 'danger');
            return;
        }

        try {
            let res;
            if (order.rawId) {
                res = await client.from('sales_order').update({ payment_status: 'da_thanh_toan' }).eq('id', order.rawId);
            } else {
                res = await client.from('sales_order').update({ payment_status: 'da_thanh_toan' }).eq('order_code', order.id);
            }
            if (res?.error) throw res.error;

            order.paymentStatus = 'paid';
            order.timeline.push({
                title: 'Đã đối soát tiền COD',
                time: formatTime(new Date()) + ' - Hôm nay',
                desc: 'Kế toán xác nhận bưu cục đã chuyển khoản tiền COD về tài khoản PawPal',
                done: true
            });

            persistOrdersData();
            renderOrdersTable();
            showToast(`Đã đối soát tiền COD cho đơn hàng ${orderId}!`, 'success');
        } catch (err) {
            console.error('[Orders] Lỗi đối soát COD:', err);
            showToast(`Đối soát COD thất bại: ${err?.message || 'Lỗi CSDL'}`, 'danger');
        }
    };

    window.PawpalOrdersModule.completeOrder = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) {
            showToast('Chưa kết nối cơ sở dữ liệu Supabase!', 'danger');
            return;
        }

        try {
            let res;
            if (order.rawId) {
                res = await client.from('sales_order').update({ order_status: 'da_giao_hang' }).eq('id', order.rawId);
            } else {
                res = await client.from('sales_order').update({ order_status: 'da_giao_hang' }).eq('order_code', order.id);
            }
            if (res?.error) throw res.error;

            order.status = 'completed';
            const pointsEarned = Math.floor(order.total / 10000);
            order.timeline.push({
                title: 'Hoàn tất đơn hàng',
                time: formatTime(new Date()) + ' - Hôm nay',
                desc: `Đơn hàng đã hoàn thành và tích lũy +${pointsEarned} điểm Pawpoint`,
                done: true
            });

            persistOrdersData();
            renderOrdersTable();
            if (typeof PawpalOrders.renderOrderDetail === 'function') {
                PawpalOrders.renderOrderDetail(orderId);
            }
            showToast(`Đơn hàng ${orderId} đã hoàn tất! +${pointsEarned} điểm Pawpoint.`, 'success');
        } catch (err) {
            console.error('[Orders] Lỗi hoàn tất đơn hàng:', err);
            showToast(`Hoàn tất đơn hàng thất bại: ${err?.message || 'Lỗi CSDL'}`, 'danger');
        }
    };

    window.PawpalOrdersModule.confirmOrder = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) {
            showToast('Chưa kết nối cơ sở dữ liệu Supabase!', 'danger');
            return;
        }

        try {
            let res;
            if (order.rawId) {
                res = await client.from('sales_order').update({ order_status: 'dang_dong_goi' }).eq('id', order.rawId);
            } else {
                res = await client.from('sales_order').update({ order_status: 'dang_dong_goi' }).eq('order_code', order.id);
            }
            if (res?.error) throw res.error;

            order.status = 'confirmed';
            order.timeline.push({
                title: 'Đã xác nhận đơn hàng',
                time: formatTime(new Date()) + ' - Hôm nay',
                desc: 'Nhân viên đã duyệt đơn và xuất kho đóng gói',
                done: true
            });

            persistOrdersData();
            renderOrdersTable();
            if (typeof PawpalOrders.renderOrderDetail === 'function') {
                PawpalOrders.renderOrderDetail(orderId);
            }
            showToast(`Đã xác nhận đơn hàng ${orderId}!`, 'success');
        } catch (err) {
            console.error('[Orders] Lỗi xác nhận đơn hàng:', err);
            showToast(`Xác nhận đơn hàng thất bại: ${err?.message || 'Lỗi CSDL'}`, 'danger');
        }
    };

    window.PawpalOrdersModule.completeDelivery = async function(orderId) {
        const order = (state.orders || []).find(o => o.id === orderId);
        if (!order) return;

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client) {
            showToast('Chưa kết nối cơ sở dữ liệu Supabase!', 'danger');
            return;
        }

        try {
            let res;
            if (order.rawId) {
                res = await client.from('sales_order').update({ order_status: 'da_giao_hang' }).eq('id', order.rawId);
            } else {
                res = await client.from('sales_order').update({ order_status: 'da_giao_hang' }).eq('order_code', order.id);
            }
            if (res?.error) throw res.error;

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

            persistOrdersData();
            renderOrdersTable();
            if (typeof PawpalOrders.renderOrderDetail === 'function') {
                PawpalOrders.renderOrderDetail(orderId);
            }
            showToast(`Đã cập nhật Đã giao hàng cho đơn ${orderId}!`, 'success');
        } catch (err) {
            console.error('[Orders] Lỗi cập nhật giao hàng:', err);
            showToast(`Cập nhật giao hàng thất bại: ${err?.message || 'Lỗi CSDL'}`, 'danger');
        }
    };

    window.PawpalOrdersModule.openShipModal = function(orderId) {
        state.selectedOrderId = orderId;
        const targetEl = document.getElementById('shipOrderTargetCode');
        if (targetEl) targetEl.textContent = orderId;
        const trackingInput = document.getElementById('shipTrackingInput');
        if (trackingInput && !trackingInput.value) {
            trackingInput.value = 'JT' + Math.floor(10000000 + Math.random() * 90000000);
        }
        const errEl = document.getElementById('shipTrackingError');
        if (errEl) errEl.style.display = 'none';
        document.getElementById('modalShipOrder')?.classList.add('active');
    };

    window.PawpalOrdersModule.openCancelModal = function(orderId) {
        state.selectedOrderId = orderId;
        const targetEl = document.getElementById('cancelOrderTargetCode');
        if (targetEl) targetEl.textContent = orderId;
        const payImpactEl = document.getElementById('cancelOrderPaymentImpact');
        const order = (state.orders || []).find(o => o.id === orderId);
        if (payImpactEl) {
            if (order && order.paymentStatus === 'paid') {
                payImpactEl.textContent = 'Hoàn tiền ' + formatVND(order.total) + ' về ví khách hàng';
                payImpactEl.style.color = '#DC2626';
            } else {
                payImpactEl.textContent = 'Đơn chưa thanh toán - Hủy trực tiếp không phát sinh hoàn tiền';
                payImpactEl.style.color = 'var(--text-main)';
            }
        }
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
        const order = (state.orders || []).find(o => o.id === orderId || o.rawId === orderId);
        if (!order) {
            showToast('Không tìm thấy đơn hàng cần tạo đổi trả (RMA)!', 'warning');
            return;
        }

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
                        <div class="sub-meta-text">Mã SKU ${p.sku}</div>
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
        sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-orders');
        window.location.hash = '#tab-complaint-orders';
        if (rmaId) {
            sessionStorage.setItem('pawpal_admin_complaint_selected_id', rmaId);
            sessionStorage.setItem('pawpal_admin_complaint_search', rmaId);
        }
        const compBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Khiếu nại');
        if (compBtn) {
            compBtn.click();
        } else if (window.PawpalAdmin?.loadModule) {
            window.PawpalAdmin.loadModule('Khiếu nại');
        }
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
    window.PawpalOrdersModule.openPosReceipt = openPosReceipt;
    window.PawpalOrdersModule.printReceiptDirectly = printReceiptDirectly;
    window.PawpalOrdersModule.addCashTendered = addCashTendered;
    window.PawpalOrdersModule.setCashTenderedExact = setCashTenderedExact;
    window.PawpalOrdersModule.selectPosProduct = selectPosProduct;

    // Khởi tạo sự kiện
    initListEvents();
})();
