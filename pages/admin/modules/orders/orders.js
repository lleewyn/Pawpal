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
        try {
            const raw = sessionStorage.getItem('pawpal_settings_vouchers');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (e) {}
        return [];
    }

    function persistSharedVouchersData(vouchers) {
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
                        <div class="slip-brand-title">PAWPAL PET CARE</div>
                        <div class="slip-brand-sub">Hệ thống chăm sóc thú cưng toàn diện | Hotline: 1900-PAWPAL</div>
                        <div class="slip-brand-sub">Kho vận: 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
                    </div>
                    <div class="slip-tracking-box">
                        <div class="slip-barcode-text">*${order.id}*</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Mã vận đơn: <strong style="font-family: monospace; color: var(--text-main);">${trackingCode}</strong></div>
                        <div style="font-size: 11.5px; color: #236B48; font-weight: 600;">${carrierName}</div>
                    </div>
                </div>

                <div class="slip-info-grid">
                    <div class="slip-info-col">
                        <span class="slip-info-label">NGƯỜI NHẬN HÀNG:</span>
                        <span class="slip-info-val strong">${order.customerName} - ${order.phone}</span>
                        <span class="slip-info-val">${customerAddr}</span>
                    </div>
                    <div class="slip-info-col">
                        <span class="slip-info-label">THÔNG TIN ĐƠN HÀNG:</span>
                        <span class="slip-info-val">Mã đơn: <strong style="color: #236B48;">${order.id}</strong> | Ngày đặt: ${dateFormatted}</span>
                        <span class="slip-info-val">Ghi chú: ${order.customerNote || 'Giao giờ hành chính, cho kiểm tra hàng'}</span>
                    </div>
                </div>

                <div>
                    <div style="font-weight: 600; font-size: 12.5px; margin-bottom: 8px; color: var(--text-heading);">DANH SÁCH HÀNG CẦN ĐÓNG GÓI (PICK-LIST):</div>
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
                    <span style="font-size: 13.5px;">Tổng cộng tiền hàng:</span>
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
                        <div class="slip-brand-title">BẢNG KÊ BÀN GIAO HÀNG HÓA VẬN CHUYỂN</div>
                        <div class="slip-brand-sub">Đơn vị gửi: CÔNG TY TNHH PAWPAL VIỆT NAM</div>
                        <div class="slip-brand-sub">Kho xuất hàng: 45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
                    </div>
                    <div class="slip-tracking-box">
                        <div style="font-weight: 700; font-size: 14px; color: #236B48;">${manifestCode}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">Thời gian in: ${nowFormatted}</div>
                        <div style="font-size: 12px; font-weight: 600; margin-top: 2px;">Đơn vị vận chuyển: ${carrierName}</div>
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
                        <span>Tổng số đơn: <strong style="color: #236B48;">${ordersList.length}</strong> đơn hàng | Tổng số kiện: <strong>${totalItemsCount}</strong> kiện</span>
                    </div>
                    <div>
                        <span>Tổng tiền thu hộ COD: <strong style="color: #B45309; font-size: 15px;">${formatVND(totalCodSum)}</strong></span>
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
                        <span class="slip-sign-title">Bưu tá tiếp nhận (${carrierName})</span>
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
            selectedOrderId: sessionStorage.getItem('pawpal_admin_order_selected_id') || sessionStorage.getItem('pawpal_admin_order_id') || 'ORD-2026-001',
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

    // Đồng bộ Supabase Live Database
    async function syncOrdersAndProductsFromSupabase() {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) return;

            console.log('[Orders Core] Đang nạp dữ liệu Bán hàng, Kho, Voucher & Đổi trả từ Supabase...');

            // 1. Nạp danh mục sản phẩm từ CSDL Supabase
            let dbCategories = [];
            try {
                const { data: catData } = await client
                    .from('product_category')
                    .select('id, category_name, description')
                    .order('category_name');
                if (Array.isArray(catData)) dbCategories = catData;
            } catch (catErr) {
                console.warn('Lỗi khi nạp product_category từ Supabase:', catErr);
            }

            // 2. Nạp kho hàng & sản phẩm từ CSDL Supabase
            const { data: prodData } = await client
                .from('product')
                .select(`
                    id, sku, product_name, unit, cost_price, sale_price,
                    status, specs, badge, origin, ingredients, benefits, usage_instructions,
                    rating, review_count, image_urls,
                    category_id,
                    product_category (id, category_name),
                    inventory (quantity_in_stock, minimum_stock)
                `)
                .order('sku');

            if (Array.isArray(prodData) && prodData.length > 0) {
                currentProductsList = prodData.map(p => {
                    const catObj = p.product_category || {};
                    const invObj = Array.isArray(p.inventory) ? p.inventory[0] : (p.inventory || {});
                    const imgs = Array.isArray(p.image_urls) ? p.image_urls : (typeof p.image_urls === 'string' && p.image_urls ? p.image_urls.split(',').map(s => s.trim()) : []);
                    const stockVal = invObj ? (invObj.quantity_in_stock !== undefined ? invObj.quantity_in_stock : 10) : 10;
                    const minStockVal = invObj ? (invObj.minimum_stock !== undefined ? invObj.minimum_stock : 5) : 5;

                    return {
                        id: p.id,
                        sku: p.sku || 'SKU-000',
                        name: p.product_name || 'Sản phẩm PawPal',
                        category: catObj.category_name || 'Thức ăn khô',
                        brand: 'PawPal',
                        petType: 'Chó và Mèo',
                        origin: p.origin || 'Việt Nam',
                        unit: p.unit || 'Túi',
                        spec: p.specs || 'Tiêu chuẩn',
                        badge: p.badge || (stockVal === 0 ? 'Hết hàng' : 'Bán chạy'),
                        costPrice: p.cost_price || 0,
                        price: p.sale_price || 0,
                        originalPrice: Math.round((p.sale_price || 0) * 1.15),
                        memberPrice: Math.round((p.sale_price || 0) * 0.925),
                        stock: stockVal,
                        minStock: minStockVal,
                        images: imgs.length > 0 ? imgs.join(', ') : '/assets/images/shop/products/tp-hat-01.png',
                        image: imgs[0] || '/assets/images/shop/products/tp-hat-01.png',
                        status: stockVal === 0 ? 'Hết hàng' : (stockVal <= minStockVal ? 'Sắp hết' : (p.status === 'INACTIVE' ? 'Tạm ngưng' : 'Còn hàng')),
                        rating: p.rating || 5.0,
                        reviewCount: p.review_count || 0,
                        hasVariants: false,
                        variants: []
                    };
                });
                window.PawpalOrders.state.products = currentProductsList;
                persistProductsData();

                window.PawpalOrders.updateCategoryFilterDropdown(dbCategories);
                window.PawpalOrders.renderProductsTable();
            }

            // 3. Nạp danh sách Voucher từ CSDL Supabase
            try {
                const { data: voucherData } = await client
                    .from('voucher')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (Array.isArray(voucherData) && voucherData.length > 0) {
                    const vouchersList = voucherData.map(v => {
                        const isPct = v.type === 'percentage' || v.type === 'percent';
                        const discountVal = isPct ? `${v.discount_value}%` : formatVND(v.discount_value);
                        let expFormatted = '31/12/2026';
                        if (v.end_date) {
                            const expD = new Date(v.end_date);
                            if (!isNaN(expD.getTime())) {
                                expFormatted = `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`;
                            }
                        }
                        return {
                            code: v.voucher_code,
                            name: v.voucher_name || v.description,
                            title: v.voucher_name || v.description,
                            type: isPct ? 'percent' : 'fixed',
                            target: 'Shop',
                            value: v.discount_value,
                            discount: discountVal,
                            minOrder: v.minimum_order_amount || 0,
                            points: v.required_points || 0,
                            validDate: expFormatted,
                            expiry: expFormatted,
                            limit: v.max_usage || 100,
                            used: v.usage_count || 0,
                            status: v.is_active ? 'active' : 'paused'
                        };
                    });
                    persistSharedVouchersData(vouchersList);
                    window.PawpalOrders.renderVouchersTable();
                }
            } catch (errVou) {
                console.warn('Lỗi khi nạp voucher từ Supabase:', errVou);
            }

            // 4. Nạp đơn hàng & RMA từ Supabase
            let rmaMapByOrderId = {};
            try {
                const { data: rmaData } = await client
                    .from('return_request')
                    .select('id, sales_order_id, reason, return_type, description, request_status, created_at, return_request_detail (*, product (sku, product_name, sale_price))')
                    .order('created_at', { ascending: false });

                if (Array.isArray(rmaData)) {
                    rmaData.forEach(r => {
                        const isResolved = r.request_status === 'COMPLETED' || r.request_status === 'RESOLVED';
                        const items = (r.return_request_detail || []).map(d => ({
                            sku: d.product?.sku || 'SKU',
                            name: d.product?.product_name || 'Sản phẩm',
                            quantity: d.quantity || 1,
                            price: d.unit_price || 0
                        }));

                        rmaMapByOrderId[r.sales_order_id] = {
                            id: r.id.slice(0, 12).toUpperCase(),
                            solutionType: r.return_type === 'REFUND' ? 'refund' : 'exchange',
                            solutionTypeName: r.return_type === 'REFUND' ? 'Hoàn tiền' : 'Đổi hàng mới',
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
                }
            } catch (errRma) {
                console.warn('Lỗi khi nạp return_request từ Supabase:', errRma);
            }

            const { data: orderData } = await client
                .from('sales_order')
                .select(`
                    id, order_code, order_status, payment_status, total_amount, shipping_fee, discount_amount, note, created_at,
                    customer (id, phone_main, customer_profile (full_name), customer_address (street_address, ward, district, province, city, is_default)),
                    sales_order_detail (
                        id, quantity, unit_price, discount_amount, subtotal,
                        product (id, sku, product_name, image_urls, specs)
                    ),
                    payment (payment_method_id, payment_amount, transaction_status),
                    delivery (carrier_name, tracking_code, tracking_number, delivery_status, note)
                `)
                .order('created_at', { ascending: false });

            if (Array.isArray(orderData) && orderData.length > 0) {
                currentOrdersList = orderData.map(o => {
                    const cust = o.customer || {};
                    const custProfile = Array.isArray(cust.customer_profile) ? cust.customer_profile[0] : (cust.customer_profile || {});
                    const custAddresses = Array.isArray(cust.customer_address) ? cust.customer_address : [];
                    const defAddr = custAddresses.find(a => a.is_default) || custAddresses[0];
                    let formattedAddr = 'Tại cửa hàng PawPal';
                    if (defAddr) {
                        formattedAddr = [defAddr.street_address, defAddr.ward, defAddr.district, defAddr.province || defAddr.city].filter(Boolean).join(', ');
                    }

                    const rawStatus = (o.order_status || 'PENDING').toLowerCase();
                    const rawPaymentStatus = (o.payment_status || 'UNPAID').toLowerCase();
                    let mappedPaymentStatus = rawPaymentStatus;
                    if (rawPaymentStatus === 'pending_refund') mappedPaymentStatus = 'refund_pending';

                    let payMethod = 'cod';
                    const payObj = Array.isArray(o.payment) ? o.payment[0] : (o.payment || {});
                    if (payObj && payObj.payment_method_id) {
                        const pmId = String(payObj.payment_method_id).toLowerCase();
                        if (pmId.includes('bank')) payMethod = 'bank_transfer';
                        else if (pmId.includes('momo')) payMethod = 'momo';
                        else if (pmId.includes('vnpay')) payMethod = 'vnpay';
                        else if (pmId.includes('cash')) payMethod = 'cash';
                    }

                    const prods = (o.sales_order_detail || []).map(d => {
                        const pr = d.product || {};
                        const pImgs = Array.isArray(pr.image_urls) ? pr.image_urls : (typeof pr.image_urls === 'string' && pr.image_urls ? pr.image_urls.split(',').map(s => s.trim()) : []);
                        return {
                            sku: pr.sku || 'SKU-000',
                            name: pr.product_name || 'Sản phẩm PawPal',
                            spec: pr.specs || 'Tiêu chuẩn',
                            price: d.unit_price || 0,
                            quantity: d.quantity || 1,
                            total: d.subtotal || (d.unit_price * d.quantity),
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

                    const resolvedCarrier = o.delivery?.carrier_name || (rawStatus === 'shipping' || rawStatus === 'delivered' ? 'J&T Express' : 'Chưa phân công');
                    const resolvedTracking = o.delivery?.tracking_code || o.delivery?.tracking_number || (rawStatus === 'shipping' || rawStatus === 'delivered' ? `JT${o.id.slice(0, 8).toUpperCase()}` : '--');

                    const timeline = [
                        { title: 'Tạo đơn hàng thành công', time: formatTime(o.created_at) + ' - ' + formatDate(o.created_at), desc: 'Đơn hàng được ghi nhận vào hệ thống PawPal', done: true }
                    ];

                    if (['confirmed', 'shipping', 'delivered', 'completed'].includes(rawStatus)) {
                        timeline.push({ title: 'Đã xác nhận đơn hàng', time: formatTime(o.created_at), desc: 'Nhân viên đã duyệt đơn và xuất kho đóng gói', done: true });
                    }
                    if (['shipping', 'delivered', 'completed'].includes(rawStatus)) {
                        timeline.push({ title: 'Đã bàn giao vận chuyển', time: formatTime(o.created_at), desc: `Đã bàn giao cho ${resolvedCarrier}. Mã vận đơn: ${resolvedTracking}`, done: true });
                    }
                    if (['delivered', 'completed'].includes(rawStatus)) {
                        timeline.push({ title: 'Đã giao hàng thành công', time: formatTime(o.created_at), desc: 'Khách hàng đã nhận đủ sản phẩm', done: true });
                    }
                    if (rawStatus === 'completed') {
                        timeline.push({ title: 'Hoàn tất đơn hàng', time: formatTime(o.created_at), desc: 'Đơn hàng đã hoàn thành và cộng điểm Pawpoint', done: true });
                    }
                    if (rawStatus === 'cancelled') {
                        timeline.push({ title: 'Đã hủy đơn hàng', time: formatTime(o.created_at), desc: 'Đơn hàng bị hủy bởi quản trị viên hoặc khách yêu cầu', done: true });
                    }

                    return {
                        id: o.order_code || `ORD-${o.id.slice(0, 8).toUpperCase()}`,
                        rawId: o.id,
                        userId: cust.id || 'USER-001',
                        customerName: custProfile.full_name || 'Khách hàng PawPal',
                        phone: cust.phone_main || '0900000000',
                        address: formattedAddr,
                        status: rawStatus,
                        paymentStatus: mappedPaymentStatus,
                        paymentMethod: payMethod,
                        carrier: resolvedCarrier,
                        trackingNumber: resolvedTracking,
                        createdAt: o.created_at,
                        subtotal: (o.total_amount || 0) + (o.discount_amount || 0) - (o.shipping_fee || 0),
                        shippingFee: o.shipping_fee || 0,
                        discount: o.discount_amount || 0,
                        pawPointsUsed: 0,
                        total: o.total_amount || 0,
                        customerNote: o.note || '',
                        internalNote: '',
                        alertType: alertType,
                        alertMessage: alertMessage,
                        rmaInfo: rmaInfo,
                        delivery: o.delivery,
                        products: prods,
                        timeline: timeline
                    };
                });

                window.PawpalOrders.state.orders = currentOrdersList;
                persistOrdersData();

                window.PawpalOrders.renderOrdersTable();
                if (window.PawpalOrders.state.selectedOrderId) {
                    window.PawpalOrders.renderOrderDetail(window.PawpalOrders.state.selectedOrderId);
                }
            }

            if (window.PawpalOrders.controllers.list?.loadPosCustomerDirectory) {
                window.PawpalOrders.controllers.list.loadPosCustomerDirectory();
            }

            console.log(`[Orders Core] Đã đồng bộ thành công từ Supabase: ${currentOrdersList.length} đơn hàng, ${currentProductsList.length} sản phẩm.`);
        } catch (e) {
            console.warn('[Orders Core] Lỗi đồng bộ từ Supabase:', e);
        }
    }

    // Điều hướng Subtab
    function updateBreadcrumb(orderId) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (orderId) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${orderId}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }

    function switchSubtab(targetSubtab, updateHistory = true) {
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        headerSubtabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-subtab') === targetSubtab);
        });

        subtabPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === `subtab-${targetSubtab}`);
        });

        if (targetSubtab === 'tab-order-detail') {
            const targetId = window.PawpalOrders.state.selectedOrderId || sessionStorage.getItem('pawpal_admin_order_selected_id') || currentOrdersList[0]?.id;
            window.PawpalOrders.state.selectedOrderId = targetId;
            window.PawpalOrders.renderOrderDetail(targetId);
            updateBreadcrumb(targetId);
        } else {
            updateBreadcrumb('');
            if (targetSubtab === 'tab-order-list') {
                window.PawpalOrders.renderOrdersTable();
            } else if (targetSubtab === 'tab-order-products') {
                window.PawpalOrders.renderProductsTable();
            } else if (targetSubtab === 'tab-order-promos') {
                window.PawpalOrders.renderVouchersTable();
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

        // Render 4 Sub-tabs trên Header Bar
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-order-list">Đơn hàng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-order-detail">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-order-products">Sản phẩm và Kho</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-order-promos">Khuyến mãi</button>
            `;
        }

        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-subtab');
                switchSubtab(target, true);
            });
        });

        const handleOrdersHashChange = () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            const validTabs = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'];
            if (validTabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        };
        window.addEventListener('hashchange', handleOrdersHashChange);

        // Khôi phục subtab từ hash hoặc sessionStorage
        const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
        const savedTab = sessionStorage.getItem('pawpal_admin_order_subtab') || 'tab-order-list';
        const targetTab = ['tab-order-list', 'tab-order-detail', 'tab-order-products', 'tab-order-promos'].includes(currentHash) ? currentHash : savedTab;

        switchSubtab(targetTab, false);
        syncOrdersAndProductsFromSupabase();
    }

    // Export bridge cho window.PawpalOrdersModule
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.switchSubtab = switchSubtab;
    window.PawpalOrdersModule.syncOrdersAndProductsFromSupabase = syncOrdersAndProductsFromSupabase;
    window.PawpalOrdersModule.loadOrdersData = syncOrdersAndProductsFromSupabase;

    // Tự động khởi tạo sau khi tất cả script subtab nạp xong
    setTimeout(() => {
        initOrdersModule();
    }, 50);
})();
