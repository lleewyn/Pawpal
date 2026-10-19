// orders.js - Core Orchestrator cho Phân hệ Quản lý Bán hàng Pawpal-er
(function() {
    'use strict';

    // ====================================================================
    // CHUẨN HÓA HÀM THỜI GIAN VÀ TIỀN TỆ TOÀN PHÂN HỆ
    // ====================================================================
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    function formatVND(amount) {
        return (amount || 0).toLocaleString('vi-VN') + ' đ';
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    }

    function matchSearch(sourceText, searchTerm) {
        if (!searchTerm) return true;
        if (!sourceText) return false;
        const src = String(sourceText).toLowerCase();
        const query = String(searchTerm).toLowerCase().trim();
        if (src.includes(query)) return true;
        return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
    }

    // ====================================================================
    // DATA STORE 100% TRỰC TIẾP TỪ SUPABASE LIVE DATABASE (RULE 6)
    // ====================================================================
    function getSharedVouchersList() {
        return window.PawpalOrders?.state?.vouchers || [];
    }

    function persistSharedVouchersData(vouchers) {
        if (window.PawpalOrders?.state) window.PawpalOrders.state.vouchers = vouchers || [];
        try {
            sessionStorage.setItem('pawpal_settings_vouchers', JSON.stringify(vouchers || []));
        } catch (e) {}
    }

    let currentProductsList = [];
    try {
        const savedProducts = sessionStorage.getItem('pawpal_admin_products_data');
        currentProductsList = savedProducts ? JSON.parse(savedProducts) : [];
        if (!Array.isArray(currentProductsList)) currentProductsList = [];
    } catch (e) {
        currentProductsList = [];
    }

    function persistProductsData() {
        try {
            sessionStorage.setItem('pawpal_admin_products_data', JSON.stringify(currentProductsList));
        } catch (e) {}
    }

    let currentStockLogsList = [];
    try {
        const savedLogs = sessionStorage.getItem('pawpal_admin_stock_logs');
        currentStockLogsList = savedLogs ? JSON.parse(savedLogs) : [];
        if (!Array.isArray(currentStockLogsList)) currentStockLogsList = [];
    } catch (e) {
        currentStockLogsList = [];
    }

    function persistStockLogsData() {
        try {
            sessionStorage.setItem('pawpal_admin_stock_logs', JSON.stringify(currentStockLogsList));
        } catch (e) {}
    }

    function addStockLog(entry) {
        const newLog = {
            id: 'LOG-' + String(currentStockLogsList.length + 1).padStart(3, '0'),
            date: formatDateTime(new Date()),
            staff: 'Quản trị viên',
            ...entry
        };
        currentStockLogsList.unshift(newLog);
        persistStockLogsData();

        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (client && entry.sku) {
            try {
                const transType = entry.type === 'IMPORT' ? 'IMPORT' : (entry.type === 'EXPORT' ? 'EXPORT' : 'ADJUSTMENT');
                client.from('inventory_transaction').insert({
                    transaction_type: transType,
                    quantity: Math.abs(parseInt(entry.change) || 0),
                    stock_before: Number(entry.beforeStock) || 0,
                    stock_after: Number(entry.afterStock) || 0,
                    note: [entry.sku, entry.typeLabel, entry.reason].filter(Boolean).join(' - '),
                    staff_id: 'd0000000-5555-5555-5555-555555555555',
                    created_at: new Date().toISOString()
                }).then(({ error }) => {
                    if (error) console.warn('[Inventory Transaction] Lỗi ghi inventory_transaction:', error.message);
                });

                client.from('audit_log').insert({
                    staff_id: 'd0000000-5555-5555-5555-555555555555',
                    action: 'UPDATE',
                    entity_name: 'inventory',
                    description: `Điều chỉnh tồn kho SKU ${entry.sku}: ${entry.beforeStock} -> ${entry.afterStock} (${entry.reason || entry.typeLabel || 'Điều chỉnh kho'})`,
                    created_at: new Date().toISOString()
                }).then(({ error }) => {
                    if (error) console.warn('[Audit Log] Lỗi ghi audit_log inventory:', error.message);
                });
            } catch (errLog) {}
        }
    }

    let currentOrdersList = [];
    try {
        const savedOrders = sessionStorage.getItem('pawpal_admin_orders_data');
        currentOrdersList = savedOrders ? JSON.parse(savedOrders) : [];
        if (!Array.isArray(currentOrdersList)) currentOrdersList = [];
    } catch (e) {
        currentOrdersList = [];
    }

    function persistOrdersData() {
        try {
            sessionStorage.setItem('pawpal_admin_orders_data', JSON.stringify(currentOrdersList));
        } catch (e) {}
    }

    // Toast thông báo chuẩn hệ thống
    function showToast(msg, type = 'success') {
        let toast = document.getElementById('adminGlobalToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminGlobalToast';
            document.body.appendChild(toast);
        }
        const isAlert = type === 'warning' || type === 'error' || type === 'danger';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: ${isAlert ? '#8F2424' : '#236B48'};
            color: #FFFFFF;
            padding: 12px 20px;
            border-radius: var(--admin-radius);
            font-size: 13.5px;
            font-weight: 500;
            box-shadow: 0 8px 24px rgba(26, 43, 35, 0.2);
            z-index: 99999;
            display: block;
        `;
        toast.textContent = msg;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    // Modal xác nhận thao tác
    function showOrderConfirmModal({ title = 'Xác nhận thao tác', message = 'Bạn có chắc chắn muốn thực hiện thao tác này?', acceptText = 'Đồng ý', onAccept }) {
        const modal = document.getElementById('modalConfirmOrderAction');
        const titleEl = document.getElementById('confirmOrderActionTitle');
        const msgEl = document.getElementById('confirmOrderActionMessage');
        const btnAccept = document.getElementById('btnAcceptOrderConfirm');

        if (!modal) {
            if (typeof onAccept === 'function') onAccept();
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) btnAccept.textContent = acceptText;

        const closeModal = () => {
            modal.classList.remove('active');
            if (btnAccept) btnAccept.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                closeModal();
                if (typeof onAccept === 'function') onAccept();
            };
        }

        modal.classList.add('active');
    }

    // Tạo HTML phiếu đóng gói và bảng kê vận chuyển
    function generatePackingSlipHtml(order) {
        const carrierName = order.carrier || 'Chưa bàn giao';
        const trackingCode = order.trackingNumber || ('PAW' + order.id.replace(/[^0-9]/g, ''));
        const dateFormatted = formatDateTime(order.createdAt);
        const customerAddr = order.address || 'Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh';

        const itemsRows = (order.products || []).map((p, idx) => `
            <tr>
                <td style="width: 36px; text-align: center; color: var(--text-muted);">${idx + 1}</td>
                <td style="width: 120px; font-family: monospace; font-weight: 600;">${p.sku}</td>
                <td>
                    <div style="font-weight: 500; line-height: 1.45; font-size: 13px;">${p.name}</div>
                    ${p.spec ? `<div class="sub-meta-text" style="margin-top: 3px;">${p.spec}</div>` : ''}
                </td>
                <td style="width: 50px; text-align: center; font-weight: 700; font-size: 13.5px; color: #236B48;">${p.quantity}</td>
                <td style="width: 110px; text-align: right;">${formatVND(p.price)}</td>
                <td style="width: 125px; text-align: right; font-weight: 600;">${formatVND(p.total || (p.price * p.quantity))}</td>
            </tr>
        `).join('');

        return `
            <div class="packing-slip-sheet">
                <div class="slip-header-block">
                    <div>
                        <div class="slip-brand-title">PawPal Pet Care</div>
                        <div class="slip-brand-sub">Hệ thống chăm sóc thú cưng toàn diện | Hotline: 1900-PAWPAL</div>
                        <div class="slip-brand-sub">Kho vận: 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
                    </div>
                    <div class="slip-tracking-box">
                        <div class="slip-barcode-text">*${order.id}*</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Mã vận đơn <strong style="font-family: monospace; color: var(--text-main);">${trackingCode}</strong></div>
                        <div style="font-size: 11.5px; color: #236B48; font-weight: 600;">${carrierName}</div>
                    </div>
                </div>

                <div class="slip-info-grid">
                    <div class="slip-info-col">
                        <span class="slip-info-label">Người nhận hàng</span>
                        <span class="slip-info-val strong">${order.customerName} - ${order.phone}</span>
                        <span class="slip-info-val">${customerAddr}</span>
                    </div>
                    <div class="slip-info-col">
                        <span class="slip-info-label">Thông tin đơn hàng</span>
                        <span class="slip-info-val">Mã đơn <strong style="color: #236B48;">${order.id}</strong> | Ngày đặt ${dateFormatted}</span>
                        <span class="slip-info-val">Ghi chú: ${order.customerNote || 'Giao giờ hành chính, cho kiểm tra hàng'}</span>
                    </div>
                </div>

                <div>
                    <div style="font-weight: 600; font-size: 12.5px; margin-bottom: 8px; color: var(--text-heading);">Danh sách hàng cần đóng gói</div>
                    <table class="slip-items-table">
                        <thead>
                            <tr>
                                <th style="width: 36px; text-align: center;">STT</th>
                                <th style="width: 120px;">Mã SKU</th>
                                <th>Tên sản phẩm</th>
                                <th style="width: 50px; text-align: center;">SL</th>
                                <th style="width: 110px; text-align: right;">Đơn giá</th>
                                <th style="width: 125px; text-align: right;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>

                <div class="slip-total-row">
                    <span style="font-size: 13.5px;">Tổng cộng tiền hàng</span>
                    <span class="slip-total-amount">${formatVND(order.total)}</span>
                </div>

                <div class="slip-sign-row">
                    <div class="slip-sign-col">
                        <span class="slip-sign-title">Người lập phiếu</span>
                        <span class="slip-sign-note">(Ký, ghi rõ họ tên)</span>
                    </div>
                    <div class="slip-sign-col">
                        <span class="slip-sign-title">Nhân viên đóng gói</span>
                        <span class="slip-sign-note">(Ký, ghi rõ họ tên)</span>
                    </div>
                    <div class="slip-sign-col">
                        <span class="slip-sign-title">Bưu tá tiếp nhận</span>
                        <span class="slip-sign-note">(Ký, ghi rõ họ tên)</span>
                    </div>
                </div>
            </div>
        `;
    }

    function generateManifestHtml(ordersList, carrierName) {
        const manifestCode = 'MNF-2026-' + (Math.floor(1000 + Math.random() * 9000));
        const nowFormatted = formatDateTime(new Date());
        let totalItemsCount = 0;
        let totalCodSum = 0;

        const rows = ordersList.map((o, idx) => {
            const isCod = (o.paymentMethod === 'cod' && o.paymentStatus !== 'paid');
            const codAmt = isCod ? (o.total || 0) : 0;
            const itemsCount = (o.products || []).reduce((sum, p) => sum + (p.quantity || 1), 0);
            totalItemsCount += itemsCount;
            totalCodSum += codAmt;

            const tracking = o.trackingNumber || ('JT' + o.id.replace(/[^0-9]/g, ''));

            return `
                <tr>
                    <td style="text-align: center; color: var(--text-muted);">${idx + 1}</td>
                    <td style="font-weight: 600; color: #236B48;">${o.id}</td>
                    <td style="font-family: monospace; font-weight: 600;">${tracking}</td>
                    <td>
                        <div style="font-weight: 500;">${o.customerName}</div>
                        <div class="sub-meta-text">${o.phone}</div>
                    </td>
                    <td style="font-size: 12px; line-height: 1.4;">${o.address}</td>
                    <td style="text-align: center; font-weight: 600;">${itemsCount}</td>
                    <td style="text-align: right; font-weight: 600; color: ${isCod ? '#B45309' : 'var(--text-muted)'};">
                        ${isCod ? formatVND(codAmt) : '0 đ'}
                    </td>
                    <td style="font-size: 11.5px; color: var(--text-muted);">${o.customerNote || 'Cho xem hàng'}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="manifest-sheet">
                <div class="slip-header-block" style="border-bottom: 2px solid var(--text-heading); padding-bottom: 16px; margin-bottom: 16px;">
                    <div>
                        <div class="slip-brand-title">Bảng kê bàn giao hàng hóa vận chuyển</div>
                        <div class="slip-brand-sub">Đơn vị gửi Công ty TNHH PawPal Việt Nam</div>
                        <div class="slip-brand-sub">Kho xuất hàng 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
                    </div>
                    <div class="slip-tracking-box">
                        <div style="font-weight: 700; font-size: 14px; color: #236B48;">${manifestCode}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Thời gian in ${nowFormatted}</div>
                        <div style="font-size: 12px; font-weight: 600; margin-top: 2px;">Đơn vị vận chuyển ${carrierName}</div>
                    </div>
                </div>

                <table class="manifest-table">
                    <thead>
                        <tr>
                            <th style="width: 36px; text-align: center;">STT</th>
                            <th style="width: 105px;">Mã đơn</th>
                            <th style="width: 130px;">Mã vận đơn</th>
                            <th style="width: 140px;">Người nhận</th>
                            <th>Địa chỉ giao hàng</th>
                            <th style="width: 50px; text-align: center;">Kiện</th>
                            <th style="width: 110px; text-align: right;">Tiền thu COD</th>
                            <th style="width: 120px;">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                <div class="slip-total-row" style="margin-top: 16px; border-top: 1px solid var(--border-neutral); padding-top: 12px;">
                    <div>
                        <span>Tổng số đơn <strong style="color: #236B48;">${ordersList.length}</strong> đơn hàng | Tổng số kiện <strong>${totalItemsCount}</strong> kiện</span>
                    </div>
                    <div>
                        <span>Tổng tiền thu hộ COD <strong style="color: #B45309; font-size: 15px;">${formatVND(totalCodSum)}</strong></span>
                    </div>
                </div>

                <div class="slip-sign-row" style="margin-top: 36px;">
                    <div class="slip-sign-col">
                        <span class="slip-sign-title">Đại diện PawPal</span>
                        <span class="slip-sign-note">(Ký, ghi rõ họ tên)</span>
                    </div>
                    <div class="slip-sign-col">
                        <span class="slip-sign-title">Thủ kho xuất hàng</span>
                        <span class="slip-sign-note">(Ký, ghi rõ họ tên)</span>
                    </div>
                    <div class="slip-sign-col">
                        <span class="slip-sign-title">Bưu tá tiếp nhận - ${carrierName}</span>
                        <span class="slip-sign-note">(Ký, ghi rõ họ tên)</span>
                    </div>
                </div>
            </div>
        `;
    }

    function getOrderSlaInfo(order) {
        if (!order || !order.createdAt) {
            return { level: 'normal', badgeClass: '', label: '--', isSlaOverdue: false };
        }
        const createdMs = new Date(order.createdAt).getTime();
        const nowMs = Date.now();
        const diffMinutes = Math.floor((nowMs - createdMs) / 60000);

        if (order.status === 'pending') {
            if (diffMinutes > 30) {
                return {
                    level: 'danger',
                    badgeClass: 'badge-danger',
                    label: `Quá hạn tiếp nhận (${diffMinutes}p)`,
                    isSlaOverdue: true
                };
            }
            if (diffMinutes >= 15) {
                return {
                    level: 'warning',
                    badgeClass: 'badge-warning',
                    label: `Cần tiếp nhận gấp (${diffMinutes}p)`,
                    isSlaOverdue: false
                };
            }
            return {
                level: 'normal',
                badgeClass: 'badge-neutral',
                label: `Mới đặt (${diffMinutes}p)`,
                isSlaOverdue: false
            };
        }

        if (order.status === 'confirmed') {
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours >= 4) {
                return {
                    level: 'warning',
                    badgeClass: 'badge-warning',
                    label: `Chờ đóng gói (${diffHours}h)`,
                    isSlaOverdue: false
                };
            }
        }

        if (order.status === 'returned' || order.alertType === 'danger') {
            return {
                level: 'danger',
                badgeClass: 'badge-danger',
                label: 'Có khiếu nại / Đổi trả',
                isSlaOverdue: false
            };
        }

        return {
            level: 'normal',
            badgeClass: '',
            label: '--',
            isSlaOverdue: false
        };
    }

    // ====================================================================
    // GLOBAL NAMESPACE: WINDOW.PAWPALORDERS
    // ====================================================================
    window.PawpalOrders = {
        state: {
            orders: currentOrdersList,
            products: currentProductsList,
            stockLogs: currentStockLogsList,
            selectedOrderId: sessionStorage.getItem('pawpal_admin_order_selected_id') || sessionStorage.getItem('pawpal_admin_order_id') || null,
            selectedBatchOrderIds: [],
            activeActionOrderId: null,
            activeAdjustProductSku: null,
            activeStockActionSku: null,
            activeGrnItems: [],
            activeActionVoucherCode: null
        },
        helpers: {
            formatVND,
            formatDateTime,
            formatDate,
            formatTime,
            toUnaccent,
            matchSearch,
            showToast,
            showOrderConfirmModal,
            generatePackingSlipHtml,
            generateManifestHtml,
            getOrderSlaInfo,
            getSharedVouchersList,
            persistSharedVouchersData,
            persistProductsData,
            persistStockLogsData,
            addStockLog,
            persistOrdersData,
            syncOrdersAndProductsFromSupabase
        },
        controllers: {
            list: null,
            detail: null,
            products: null,
            promos: null
        },
        renderOrdersTable: function() {
            if (this.controllers.list?.renderOrdersTable) {
                this.controllers.list.renderOrdersTable();
            }
        },
        renderOrderDetail: function(id) {
            if (this.controllers.detail?.renderOrderDetail) {
                this.controllers.detail.renderOrderDetail(id);
            }
        },
        renderProductsTable: function() {
            if (this.controllers.products?.renderProductsTable) {
                this.controllers.products.renderProductsTable();
            }
        },
        renderVouchersTable: function() {
            if (this.controllers.promos?.renderVouchersTable) {
                this.controllers.promos.renderVouchersTable();
            }
        },
        updateCategoryFilterDropdown: function(cats) {
            if (this.controllers.products?.updateCategoryFilterDropdown) {
                this.controllers.products.updateCategoryFilterDropdown(cats);
            }
        },
        switchSubtab: function(targetSubtab, updateHistory = true) {
            switchSubtab(targetSubtab, updateHistory);
        }
    };

    // Đồng bộ Supabase Live Database qua PawpalDataStore
    async function fetchProductsData({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');

            const [catRes, prodRes] = await Promise.all([
                client.from('product_category').select('id, category_name, description').order('category_name'),
                client.from('product').select(`
                    id, product_name, unit,
                    brand_name, target_pet, description, min_price, slug,
                    status, specs, badge, origin, ingredients, benefits, usage_instructions,
                    rating, review_count, image_urls,
                    category_id,
                    product_category (id, category_name),
                    inventory (quantity_in_stock, minimum_stock),
                    product_variant (
                        id, sku_variant, cost_price, sale_price, compare_at_price, status,
                        variant_size (id, size_name),
                        variant_color (id, color_name),
                        variant_flavor (id, flavor_name)
                    )
                `)
            ]);

            if (prodRes.error) throw prodRes.error;
            return {
                categories: catRes.data || [],
                products: prodRes.data || []
            };
        };

        try {
            let res;
            if (window.PawpalDataStore) {
                res = await window.PawpalDataStore.fetch('orders:products', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                    force
                });
            } else {
                res = await fetcher();
            }

            const prodData = res.products || [];
            currentProductsList = prodData.map(p => {
                const catObj = p.product_category || {};
                const invObj = Array.isArray(p.inventory) ? p.inventory[0] : (p.inventory || {});
                const imgs = Array.isArray(p.image_urls) ? p.image_urls : (typeof p.image_urls === 'string' && p.image_urls ? p.image_urls.split(',').map(s => s.trim()) : []);
                const hasInv = invObj && invObj.quantity_in_stock !== undefined && invObj.quantity_in_stock !== null;
                const stockVal = hasInv ? Number(invObj.quantity_in_stock) : null;
                const minStockVal = invObj && invObj.minimum_stock !== undefined && invObj.minimum_stock !== null ? Number(invObj.minimum_stock) : null;

                const variants = Array.isArray(p.product_variant) ? p.product_variant : [];
                const primaryVar = variants.length > 0 ? variants[0] : null;

                const effectiveSku = (primaryVar && primaryVar.sku_variant) ? primaryVar.sku_variant : 'SKU-000';
                const effectiveCostPrice = (primaryVar && primaryVar.cost_price !== undefined) ? Number(primaryVar.cost_price) : 0;
                const effectiveSalePrice = (primaryVar && primaryVar.sale_price !== undefined) ? Number(primaryVar.sale_price) : 0;

                // Xác định tên thuộc tính 1 và thuộc tính 2 cho sản phẩm nếu có nhiều biến thể
                const hasFlavor = variants.some(v => v.variant_flavor?.flavor_name);
                const hasSize = variants.some(v => v.variant_size?.size_name);
                const hasColor = variants.some(v => v.variant_color?.color_name);

                let detectedAttr1Name = 'Hương vị';
                let detectedAttr2Name = 'Quy cách';

                if (hasFlavor) {
                    detectedAttr1Name = 'Hương vị';
                    if (hasSize) detectedAttr2Name = 'Kích thước';
                    else if (hasColor) detectedAttr2Name = 'Màu sắc';
                } else if (hasSize) {
                    detectedAttr1Name = 'Kích thước';
                    if (hasColor) detectedAttr2Name = 'Màu sắc';
                } else if (hasColor) {
                    detectedAttr1Name = 'Màu sắc';
                }

                const mappedVariants = variants.map(v => {
                    let a1 = '';
                    let a2 = '';
                    if (hasFlavor) {
                        a1 = v.variant_flavor?.flavor_name || '';
                        a2 = v.variant_size?.size_name || v.variant_color?.color_name || '';
                    } else if (hasSize) {
                        a1 = v.variant_size?.size_name || '';
                        a2 = v.variant_color?.color_name || '';
                    } else if (hasColor) {
                        a1 = v.variant_color?.color_name || '';
                    } else {
                        a1 = v.sku_variant || '';
                    }

                    return {
                        id: v.id,
                        sku: v.sku_variant,
                        attr1: a1,
                        attr2: a2,
                        name: a2 ? `${a1} - ${a2}` : a1,
                        costPrice: Number(v.cost_price) || 0,
                        price: Number(v.sale_price) || 0,
                        originalPrice: v.compare_at_price ? Number(v.compare_at_price) : (Number(v.sale_price) || 0),
                        stock: stockVal !== null ? Math.round(stockVal / (variants.length || 1)) : 20,
                        status: v.status
                    };
                });

                const detectedBrand = (function(name) {
                    if (!name) return 'PawPal';
                    const lower = name.toLowerCase();
                    const brandMap = [
                        { key: 'royal canin', brand: 'Royal Canin' },
                        { key: 'petkit', brand: 'Petkit' },
                        { key: "king's pet", brand: "King's Pet" },
                        { key: 'kings pet', brand: "King's Pet" },
                        { key: 'ciao churu', brand: 'Ciao Churu' },
                        { key: 'churu', brand: 'Ciao Churu' },
                        { key: 'ciao', brand: 'Ciao Churu' },
                        { key: 'whiskas', brand: 'Whiskas' },
                        { key: 'orijen', brand: 'Orijen' },
                        { key: 'pidan', brand: 'Pidan' },
                        { key: 'me-o', brand: 'Me-O' },
                        { key: "cat's best", brand: "Cat's Best" },
                        { key: 'kit cat', brand: 'Kit Cat' },
                        { key: 'furrytail', brand: 'Furrytail' },
                        { key: 'gimcat', brand: 'GimCat' },
                        { key: 'purina', brand: 'Purina' },
                        { key: 'pro plan', brand: 'Pro Plan' },
                        { key: 'nutrience', brand: 'Nutrience' },
                        { key: 'taste of the wild', brand: 'Taste of the Wild' },
                        { key: 'monge', brand: 'Monge' }
                    ];
                    for (const item of brandMap) {
                        if (lower.includes(item.key)) return item.brand;
                    }
                    return 'PawPal';
                })(p.product_name);

                return {
                    id: p.id,
                    sku: effectiveSku,
                    name: p.product_name || 'Sản phẩm PawPal',
                    category: catObj.category_name || 'Chưa phân loại',
                    brand: p.brand_name || detectedBrand,
                    petType: p.target_pet || 'Chó và Mèo',
                    description: p.description || p.specs || '',
                    origin: p.origin || 'Việt Nam',
                    unit: p.unit || 'Túi',
                    spec: p.specs || 'Tiêu chuẩn',
                    badge: p.badge || (stockVal === 0 ? 'Hết hàng' : (p.status === 'INACTIVE' ? 'Tạm ngưng' : '')),
                    costPrice: effectiveCostPrice,
                    rating: p.rating,
                    reviewCount: p.review_count || 0,
                    price: effectiveSalePrice,
                    originalPrice: effectiveSalePrice || effectiveCostPrice || 0,
                    memberPrice: effectiveSalePrice,
                    stock: stockVal,
                    minStock: minStockVal,
                    images: imgs.length > 0 ? imgs.join(', ') : '/assets/images/shop/products/tp-hat-01.png',
                    image: imgs[0] || '/assets/images/shop/products/tp-hat-01.png',
                    status: p.status === 'INACTIVE' ? 'Tạm ngưng' : (stockVal === 0 ? 'Hết hàng' : (stockVal !== null && minStockVal !== null && stockVal <= minStockVal ? 'Sắp hết' : 'Còn hàng')),
                    hasVariants: variants.length > 1,
                    attr1Name: detectedAttr1Name,
                    attr2Name: detectedAttr2Name,
                    variants: mappedVariants
                };
            });

            window.PawpalOrders.state.products = currentProductsList;
            persistProductsData();

            window.PawpalOrders.updateCategoryFilterDropdown(res.categories || []);
            window.PawpalOrders.state.productsLoaded = true;
            window.PawpalOrders.state.productsError = false;
            window.PawpalOrders.renderProductsTable();
            return currentProductsList;
        } catch (err) {
            console.warn('[Orders Core] Lỗi nạp sản phẩm:', err);
            window.PawpalOrders.state.productsError = true;
            window.PawpalOrders.renderProductsTable();
            return [];
        }
    }

    async function fetchVouchersData({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const { data, error } = await client.from('voucher').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        };

        try {
            let voucherData;
            if (window.PawpalDataStore) {
                voucherData = await window.PawpalDataStore.fetch('orders:vouchers', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                    force
                });
            } else {
                voucherData = await fetcher();
            }

            const vouchersList = (voucherData || []).map(v => {
                const isPct = v.type === 'percentage' || v.type === 'percent';
                const rawDiscount = Number(v.discount_value) || 0;
                const safeDiscount = isPct ? Math.min(100, Math.max(0, rawDiscount)) : Math.max(0, rawDiscount);
                const discountVal = isPct ? `${safeDiscount}%` : formatVND(safeDiscount);
                let expFormatted = 'Không giới hạn';
                if (v.end_date) {
                    const expD = new Date(v.end_date);
                    if (!isNaN(expD.getTime())) {
                        expFormatted = `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`;
                    }
                }
                return {
                    code: String(v.voucher_code || '').trim().replace(/[^A-Za-z0-9_-]/g, ''),
                    dbCode: v.voucher_code,
                    name: v.voucher_name || v.description,
                    title: v.voucher_name || v.description,
                    type: isPct ? 'percent' : 'fixed',
                    target: 'Shop',
                    value: safeDiscount,
                    discount: discountVal,
                    minOrder: Math.max(0, Number(v.minimum_order_amount) || 0),
                    points: Math.max(0, Number(v.required_points) || 0),
                    startsAt: v.start_date,
                    endsAt: v.end_date,
                    validDate: expFormatted,
                    expiry: expFormatted,
                    limit: (v.max_usage !== null && v.max_usage !== undefined) ? Number(v.max_usage) : null,
                    used: v.usage_count || 0,
                    status: v.end_date && Date.parse(v.end_date) < Date.now() ? 'expired' : (v.is_active ? 'active' : 'paused')
                };
            });
            window.PawpalOrders.state.vouchersLoaded = true;
            window.PawpalOrders.state.vouchersError = false;
            persistSharedVouchersData(vouchersList);
            window.PawpalOrders.renderVouchersTable();
            return vouchersList;
        } catch (err) {
            console.warn('[Orders Core] Lỗi khi nạp voucher:', err);
            window.PawpalOrders.state.vouchersError = true;
            window.PawpalOrders.renderVouchersTable();
            return [];
        }
    }

    async function fetchOrdersData({ force = false } = {}) {
        const fetcher = async () => {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');

            const [orderRes, rmaRes] = await Promise.all([
                client.from('sales_order').select(`
                    id, order_code, order_status, payment_status, total_amount, note, created_at, tracking_code, shipping_provider_id, shipped_at,
                    customer (
                        id, phone_main,
                        customer_profile (full_name)
                    ),
                    shipping_address:customer_address!shipping_address_id (
                        receiver_name, receiver_phone, province, street_address
                    ),
                    sales_order_detail (
                        id, quantity, unit_price, discount_amount, subtotal,
                        product (id, product_name, image_urls, specs, product_variant (sku_variant, sale_price))
                    ),
                    payment (payment_method_id, payment_method_config_id, amount, transaction_status)
                `).order('created_at', { ascending: false }),
                client.from('return_request').select('id, sales_order_id, reason, return_type, description, request_status, created_at, return_request_detail (*, product (id, product_name, product_variant (sku_variant, sale_price)))').order('created_at', { ascending: false })
            ]);

            if (orderRes.error) throw orderRes.error;
            return {
                orders: orderRes.data || [],
                rma: rmaRes.data || []
            };
        };

        try {
            let res;
            if (window.PawpalDataStore) {
                res = await window.PawpalDataStore.fetch('orders:list', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.OPERATIONAL,
                    force
                });
            } else {
                res = await fetcher();
            }

            const rmaMapByOrderId = {};
            (res.rma || []).forEach(r => {
                const isResolved = r.request_status === 'COMPLETED' || r.request_status === 'RESOLVED';
                const items = (r.return_request_detail || []).map(d => ({
                    sku: d.product?.product_variant?.[0]?.sku_variant || 'SKU',
                    name: d.product?.product_name || 'Sản phẩm',
                    quantity: d.quantity || 1,
                    price: d.unit_price || 0
                }));

                rmaMapByOrderId[r.sales_order_id] = {
                    id: r.id.slice(0, 12).toUpperCase(),
                    solutionType: (r.return_type === 'REFUND' || r.return_type === 'RETURN') ? 'refund' : 'exchange',
                    solutionTypeName: (r.return_type === 'REFUND' || r.return_type === 'RETURN') ? 'Hoàn tiền' : 'Đổi hàng mới',
                    reason: r.reason,
                    reasonText: r.reason,
                    restockAction: 'restock',
                    restockText: 'Đã nhập lại kho khả dụng',
                    refundMethod: 'bank_transfer',
                    refundAmount: 0,
                    refundText: isResolved ? 'Đã xử lý' : 'Đang xử lý',
                    items: items,
                    note: r.description,
                    createdAt: r.created_at
                };
            });

            const orderData = res.orders || [];
            currentOrdersList = orderData.map(o => {
                const cust = o.customer || {};
                const custProfile = Array.isArray(cust.customer_profile) ? cust.customer_profile[0] : (cust.customer_profile || {});
                const shipAddr = o.shipping_address || {};
                const custName = custProfile.full_name || shipAddr.receiver_name || 'Khách hàng PawPal';
                const phone = cust.phone_main || shipAddr.receiver_phone || '';
                let formattedAddr = 'Tại cửa hàng PawPal';
                if (shipAddr.street_address || shipAddr.province) {
                    formattedAddr = [shipAddr.street_address, shipAddr.province].filter(Boolean).join(', ');
                }

                const rawStatus = (o.order_status || 'PENDING').toLowerCase();
                const mappedStatus = (rawStatus === 'packing') ? 'confirmed' : rawStatus;
                const rawPaymentStatus = (o.payment_status || 'UNPAID').toLowerCase();
                let mappedPaymentStatus = rawPaymentStatus;
                if (rawPaymentStatus === 'pending_refund') mappedPaymentStatus = 'refund_pending';

                let payMethod = 'cod';
                const payObj = Array.isArray(o.payment) ? o.payment[0] : (o.payment || {});
                if (payObj && payObj.payment_method_id) {
                    const pmId = String(payObj.payment_method_id).toLowerCase();
                    if (pmId.includes('bank') || pmId.includes('transfer')) payMethod = 'bank_transfer';
                    else if (pmId.includes('momo')) payMethod = 'momo';
                    else if (pmId.includes('vnpay')) payMethod = 'vnpay';
                    else if (pmId.includes('card')) payMethod = 'pos_card';
                    else if (pmId.includes('cash') || pmId.includes('tien_mat')) payMethod = 'cash';
                } else if (o.note && (o.note.includes('Tiền mặt') || o.note.toLowerCase().includes('cash'))) {
                    payMethod = 'cash';
                } else if (o.note && (o.note.includes('Chuyển khoản') || o.note.toLowerCase().includes('transfer') || o.note.toLowerCase().includes('bank'))) {
                    payMethod = 'bank_transfer';
                }

                let calculatedDiscount = 0;
                let calculatedSubtotal = 0;
                const prods = (o.sales_order_detail || []).map(d => {
                    const pr = d.product || {};
                    const pImgs = Array.isArray(pr.image_urls) ? pr.image_urls : (typeof pr.image_urls === 'string' && pr.image_urls ? pr.image_urls.split(',').map(s => s.trim()) : []);
                    const qty = Number(d.quantity) || 1;
                    const uPrice = Number(d.unit_price) || 0;
                    const sub = Number(d.subtotal) || (uPrice * qty);
                    const disc = Number(d.discount_amount) || 0;
                    calculatedDiscount += disc;
                    calculatedSubtotal += sub;

                    return {
                        sku: pr.product_variant?.[0]?.sku_variant || 'SKU-000',
                        name: pr.product_name || 'Sản phẩm PawPal',
                        spec: pr.specs || 'Tiêu chuẩn',
                        price: uPrice,
                        quantity: qty,
                        total: sub,
                        image: pImgs[0] || '/assets/images/shop/products/tp-hat-01.png'
                    };
                });

                const rmaInfo = rmaMapByOrderId[o.id] || null;
                const elapsedMinutes = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
                let alertType = null;
                let alertMessage = null;

                if (rmaInfo || rawStatus === 'returned') {
                    alertType = 'danger';
                    alertMessage = 'Đổi trả / RMA';
                } else if (rawStatus === 'pending' && elapsedMinutes > 30) {
                    alertType = 'danger';
                    alertMessage = 'Quá hạn SLA (>30p)';
                } else if (rawStatus === 'delivered' && mappedPaymentStatus === 'cod_pending') {
                    alertType = 'warning';
                    alertMessage = 'Chờ đối soát COD';
                }

                const carrierMatch = o.note ? o.note.match(/Hãng:\s*([^\n;]+)/i)?.[1] : null;
                const trackingMatch = o.note ? o.note.match(/Vận đơn:\s*([^\n;]+)/i)?.[1] : null;
                const resolvedCarrier = o.shipping_provider_id || o.carrier || carrierMatch || (rawStatus === 'shipping' || rawStatus === 'delivered' ? 'Bưu cục đối tác' : 'Chưa phân công');
                const resolvedTracking = o.tracking_code || o.tracking_number || trackingMatch || '--';

                const timeline = [
                    { title: 'Tạo đơn hàng thành công', time: formatTime(o.created_at) + ' - ' + formatDate(o.created_at), desc: 'Đơn hàng được ghi nhận vào hệ thống PawPal', done: true }
                ];

                if (['confirmed', 'shipping', 'delivered', 'completed'].includes(rawStatus)) {
                    timeline.push({ title: 'Đã xác nhận đơn hàng', time: 'Chưa ghi nhận thời gian', desc: 'Nhân viên đã duyệt đơn và xuất kho đóng gói', done: true });
                }
                if (['shipping', 'delivered', 'completed'].includes(rawStatus)) {
                    timeline.push({ title: 'Đã bàn giao vận chuyển', time: 'Chưa ghi nhận thời gian', desc: `Đã bàn giao cho ${resolvedCarrier}. Mã vận đơn: ${resolvedTracking}`, done: true });
                }
                if (['delivered', 'completed'].includes(rawStatus)) {
                    timeline.push({ title: 'Đã giao hàng thành công', time: 'Chưa ghi nhận thời gian', desc: 'Khách hàng đã nhận đủ sản phẩm', done: true });
                }
                if (rawStatus === 'completed') {
                    timeline.push({ title: 'Hoàn tất đơn hàng', time: 'Chưa ghi nhận thời gian', desc: 'Đơn hàng đã hoàn thành và cộng điểm Pawpoint', done: true });
                }
                if (rawStatus === 'cancelled') {
                    timeline.push({ title: 'Đã hủy đơn hàng', time: 'Chưa ghi nhận thời gian', desc: 'Đơn hàng bị hủy bởi quản trị viên hoặc khách yêu cầu', done: true });
                }

                const orderTotal = Number(o.total_amount) || 0;
                const finalSubtotal = calculatedSubtotal || orderTotal;
                const shippingFee = Math.max(0, orderTotal + calculatedDiscount - finalSubtotal);

                return {
                    id: o.order_code || `ORD-${o.id.slice(0, 8).toUpperCase()}`,
                    rawId: o.id,
                    userId: cust.id || 'GUEST',
                    customerName: custName,
                    phone: phone,
                    address: formattedAddr,
                    status: mappedStatus,
                    paymentStatus: mappedPaymentStatus,
                    paymentMethod: payMethod,
                    carrier: resolvedCarrier,
                    trackingNumber: resolvedTracking,
                    createdAt: o.created_at,
                    subtotal: finalSubtotal,
                    shippingFee: shippingFee,
                    discount: calculatedDiscount,
                    pawPointsUsed: 0,
                    total: orderTotal,
                    customerNote: o.note || '',
                    internalNote: '',
                    alertType: alertType,
                    alertMessage: alertMessage,
                    rmaInfo: rmaInfo,
                    delivery: null,
                    products: prods,
                    timeline: timeline
                };
            });

            window.PawpalOrders.state.orders = currentOrdersList;
            persistOrdersData();

            window.PawpalOrders.state.ordersLoaded = true;
            window.PawpalOrders.state.ordersError = false;

            window.PawpalOrders.renderOrdersTable();
            if (window.PawpalOrders.state.selectedOrderId) {
                window.PawpalOrders.renderOrderDetail(window.PawpalOrders.state.selectedOrderId);
            }

            if (window.PawpalOrders.controllers.list?.loadPosCustomerDirectory) {
                window.PawpalOrders.controllers.list.loadPosCustomerDirectory();
            }

            return currentOrdersList;
        } catch (err) {
            console.warn('[Orders Core] Lỗi nạp đơn hàng:', err);
            window.PawpalOrders.state.ordersError = true;
            window.PawpalOrders.renderOrdersTable();
            return [];
        }
    }

    window.PawpalOrders.fetchProductsData = fetchProductsData;
    window.PawpalOrders.fetchVouchersData = fetchVouchersData;
    window.PawpalOrders.fetchOrdersData = fetchOrdersData;

    async function syncOrdersAndProductsFromSupabase({ force = false } = {}) {
        if (force && window.PawpalDataStore) {
            window.PawpalDataStore.invalidate('orders:*');
        }
        await Promise.allSettled([
            fetchOrdersData({ force }),
            fetchProductsData({ force }),
            fetchVouchersData({ force })
        ]);
        console.log(`[Orders Core] Đã đồng bộ từ Supabase: ${currentOrdersList.length} đơn hàng, ${currentProductsList.length} sản phẩm.`);
    }

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'sales_order') {
                window.PawpalDataStore.invalidate('orders:list*');
            } else if (mutation.entity === 'product' || mutation.entity === 'inventory' || mutation.entity === 'inventory_log') {
                window.PawpalDataStore.invalidate('orders:products*');
            } else if (mutation.entity === 'voucher') {
                window.PawpalDataStore.invalidate('orders:vouchers*');
            }
        });
    }

    // Điều hướng Subtab
    function updateBreadcrumb(orderId) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (orderId) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${escapeHtml(orderId)}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }

    function switchSubtab(targetSubtab, updateHistory = true) {
        const validTabs = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'];
        if (!validTabs.includes(targetSubtab)) {
            targetSubtab = 'tab-order-list';
        }

        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Bán hàng') return;
        const root = document.getElementById('subtab-tab-order-list')?.closest('.admin-module-wrapper');
        const subtabPanels = root?.querySelectorAll('.subtab-content') || [];

        headerSubtabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        let matched = false;
        subtabPanels.forEach(panel => {
            const isMatch = panel.id === `subtab-${targetSubtab}`;
            panel.classList.toggle('active', isMatch);
            if (isMatch) matched = true;
        });

        if (!matched && subtabPanels.length > 0) {
            subtabPanels[0].classList.add('active');
            targetSubtab = validTabs[0];
        }

        if (targetSubtab === 'tab-order-detail') {
            const targetId = window.PawpalOrders.state.selectedOrderId || sessionStorage.getItem('pawpal_admin_order_selected_id') || null;
            window.PawpalOrders.state.selectedOrderId = targetId;
            window.PawpalOrders.renderOrderDetail(targetId);
            updateBreadcrumb(targetId || '');
        } else {
            updateBreadcrumb('');
            if (targetSubtab === 'tab-order-list') {
                if (!window.PawpalOrders.state.ordersLoaded) {
                    fetchOrdersData().then(() => window.PawpalOrders.renderOrdersTable());
                } else {
                    window.PawpalOrders.renderOrdersTable();
                }
            } else if (targetSubtab === 'tab-order-products') {
                const needsFresh = !window.PawpalOrders.state.productsLoaded || state.products.some(p => p.hasVariants && !p.variants[0]?.attr1);
                if (needsFresh) {
                    fetchProductsData({ force: true }).then(() => window.PawpalOrders.renderProductsTable());
                } else {
                    window.PawpalOrders.renderProductsTable();
                }
            } else if (targetSubtab === 'tab-order-promos') {
                if (!window.PawpalOrders.state.vouchersLoaded) {
                    fetchVouchersData().then(() => window.PawpalOrders.renderVouchersTable());
                } else {
                    window.PawpalOrders.renderVouchersTable();
                }
            }
        }

        sessionStorage.setItem('pawpal_admin_order_subtab', targetSubtab);
        if (updateHistory) {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.pushState(null, '', '#' + targetSubtab);
                } catch (e) {
                    window.location.hash = targetSubtab;
                }
            }
        } else {
            if (window.location.hash !== '#' + targetSubtab) {
                try {
                    history.replaceState(null, '', '#' + targetSubtab);
                } catch (e) {}
            }
        }
    }

    function initOrdersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        const validTabs = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'];

        // Khôi phục subtab từ hash hoặc sessionStorage
        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedTab = sessionStorage.getItem('pawpal_admin_order_subtab') || 'tab-order-list';
        const targetTab = validTabs.includes(currentHash) ? currentHash : (validTabs.includes(savedTab) ? savedTab : 'tab-order-list');

        switchSubtab(targetTab, false);

        // Lắng nghe sự kiện chuyển subtab từ router cha
        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Bán hàng' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId, false);
            }
        });

        setupOrdersRealtimeSync();
        syncOrdersAndProductsFromSupabase();

        // Hỗ trợ kiểm thử tự động cho modal17
        if (window.location.search.includes('v=modal17')) {
            setTimeout(() => {
                showOrderConfirmModal({
                    title: 'Xác nhận thao tác',
                    message: 'Bạn có chắc chắn muốn thực hiện thao tác này không? Hành động này sẽ được ghi nhận vào nhật ký hệ thống.',
                    acceptText: 'Đồng ý'
                });
            }, 600);
        }
    }

    let _ordersRealtimeChannel = null;
    function setupOrdersRealtimeSync() {
        if (_ordersRealtimeChannel) return;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            const triggerOrderSync = (pattern) => {
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Bán hàng',
                        invalidatePattern: pattern || 'orders:*',
                        onActiveRefresh: async () => {
                            await syncOrdersAndProductsFromSupabase({ force: true });
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Bán hàng') {
                    syncOrdersAndProductsFromSupabase({ force: true });
                }
            };

            _ordersRealtimeChannel = client.channel('admin-orders-live-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_order' }, () => triggerOrderSync('orders:list*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'product' }, () => triggerOrderSync('orders:products*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => triggerOrderSync('orders:products*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'voucher' }, () => triggerOrderSync('orders:vouchers*'))
                .subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-orders-live-sync');

            window.addEventListener('beforeunload', () => {
                if (_ordersRealtimeChannel) {
                    client.removeChannel(_ordersRealtimeChannel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-orders-live-sync');
                }
            });
        } catch (e) {
            console.warn('[Orders] Lỗi mở kênh realtime:', e);
        }
    }

    // Export bridge cho window.PawpalOrdersModule
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.switchSubtab = switchSubtab;
    window.PawpalOrdersModule.syncOrdersAndProductsFromSupabase = syncOrdersAndProductsFromSupabase;
    window.PawpalOrdersModule.loadOrdersData = syncOrdersAndProductsFromSupabase;
    window.PawpalOrdersModule.showOrderConfirmModal = showOrderConfirmModal;
    window.PawpalOrdersModule.escapeHtml = escapeHtml;

    // Tự động khởi tạo sau khi tất cả script subtab nạp xong
    setTimeout(() => {
        initOrdersModule();
    }, 50);
})();
