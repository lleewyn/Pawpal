// tab-order-promos.js - Subtab Khuyến mãi & Voucher của Phân hệ Bán hàng Pawpal-er
(function() {
    'use strict';

    const PawpalOrders = window.PawpalOrders;
    if (!PawpalOrders) {
        console.error('[Orders Promos] Không tìm thấy window.PawpalOrders core!');
        return;
    }

    const { helpers, state } = PawpalOrders;
    const { formatVND, showToast, getSharedVouchersList, persistSharedVouchersData, matchSearch } = helpers;

    // Render bảng danh sách voucher
    function renderVouchersTable() {
        const tbody = document.getElementById('vouchersTableBody');
        if (!tbody) return;

        const searchVal = (document.getElementById('promoSearchInput')?.value || '').trim();
        const vouchersList = getSharedVouchersList();

        const filtered = vouchersList.filter(v => {
            if (searchVal) {
                const matchCode = matchSearch(v.code, searchVal);
                const matchTitle = matchSearch(v.title || v.name, searchVal);
                if (!matchCode && !matchTitle) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13.5px;">
                        Không tìm thấy chương trình khuyến mãi nào phù hợp.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(v => {
            const isAct = v.status === 'active' || v.status === 'Đang chạy';
            const isPaused = v.status === 'paused' || v.status === 'Tạm ngưng';
            let statusBadge = '<span class="admin-badge badge-paid">Đang chạy</span>';
            if (isPaused) {
                statusBadge = '<span class="admin-badge badge-warning">Tạm ngưng</span>';
            } else if (!isAct) {
                statusBadge = '<span class="admin-badge badge-cancelled">Hết hạn</span>';
            }

            const limitVal = v.limit || 100;
            const usedVal = v.used || 0;
            const pct = Math.min(100, Math.round((usedVal / limitVal) * 100));

            return `
                <tr>
                    <td>
                        <span class="voucher-code-badge">${v.code}</span>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${v.title || v.name}</div>
                        <div class="sub-meta-text">Áp dụng: ${v.target || 'Toàn bộ Shop'}</div>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: #B45309;">${v.discount || (v.type === 'percent' ? v.value + '%' : formatVND(v.value))}</div>
                        <div class="sub-meta-text">Đơn tối thiểu: ${typeof v.minOrder === 'number' ? formatVND(v.minOrder) : v.minOrder}</div>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                            <span>${usedVal} / ${limitVal}</span>
                            <span style="font-weight: 600;">${pct}%</span>
                        </div>
                        <div style="width: 100%; height: 6px; background-color: #ECF2EE; border-radius: 9px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background-color: #236B48; border-radius: 9px;"></div>
                        </div>
                    </td>
                    <td>
                        <div>${v.validDate || v.expiry}</div>
                        <div class="sub-meta-text">Đổi bằng: ${v.points ? (typeof v.points === 'number' ? v.points + ' Pawpoint' : v.points) : 'Miễn phí'}</div>
                    </td>
                    <td>${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openVoucherActionModal('${v.code}')">•••</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.promos = {
        renderVouchersTable
    };

    // Khởi tạo các sự kiện giao diện cho Subtab Promos
    function initPromosEvents() {
        document.getElementById('promoSearchInput')?.addEventListener('input', renderVouchersTable);

        // Mở modal tạo mã khuyến mãi
        document.getElementById('btnOpenCreateVoucherModal')?.addEventListener('click', () => {
            document.getElementById('modalCreateVoucher')?.classList.add('active');
        });

        // Xác nhận tạo mã khuyến mãi dùng chung
        document.getElementById('btnSubmitCreateVoucher')?.addEventListener('click', async () => {
            const code = document.getElementById('newVoucherCode')?.value.trim().toUpperCase();
            const title = document.getElementById('newVoucherTitle')?.value.trim();
            const discount = document.getElementById('newVoucherDiscount')?.value.trim();
            const minOrder = document.getElementById('newVoucherMinOrder')?.value.trim() || '0 đ';
            const points = document.getElementById('newVoucherPoints')?.value.trim() || 'Miễn phí';
            const expiry = document.getElementById('newVoucherExpiry')?.value.trim();
            const maxUses = document.getElementById('newVoucherMaxUses')?.value;

            if (!code || !title || !discount || !expiry || !maxUses) {
                showToast('Vui lòng nhập đầy đủ mã, tên, mức giảm, ngày hết hạn và số lượt.', 'warning');
                return;
            }
            if (!/^[A-Z0-9]+$/.test(code)) {
                showToast('Mã voucher chỉ được gồm chữ in hoa không dấu và chữ số, không khoảng trắng hoặc ký tự đặc biệt.', 'warning');
                return;
            }
            if (title.length > 100) {
                showToast('Tên chương trình không được vượt quá 100 ký tự.', 'warning');
                return;
            }

            const vouchersList = getSharedVouchersList();
            if (vouchersList.some(v => (v.code || '').toUpperCase() === code)) {
                showToast(`Mã khuyến mãi "${code}" đã tồn tại trên hệ thống. Vui lòng chọn mã khác.`, 'warning');
                return;
            }

            const isPct = discount.includes('%');
            const numericDiscount = Number(discount.replace(/[%\s,đ₫]/gi, ''));
            const numVal = Number.isFinite(numericDiscount) ? numericDiscount : NaN;
            const numMinOrder = Number(minOrder.replace(/[,\sđ₫]/gi, ''));
            const pointsNum = points.includes('Miễn phí') ? 0 : Number(points.replace(/[^\d]/g, ''));
            const maxUsesNum = Number(maxUses);
            const expiryMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(expiry);
            const expiryDate = expiryMatch ? new Date(`${expiryMatch[3]}-${expiryMatch[2]}-${expiryMatch[1]}T23:59:59`) : null;

            if (!Number.isFinite(numVal) || numVal <= 0 || (isPct && numVal > 100) || (!isPct && discount.includes('-'))) {
                showToast('Mức giảm giá không hợp lệ.', 'warning');
                return;
            }
            if (!Number.isFinite(numMinOrder) || numMinOrder <= 0) {
                showToast('Đơn hàng tối thiểu phải lớn hơn 0.', 'warning');
                return;
            }
            if (!Number.isFinite(pointsNum) || pointsNum < 0 || !Number.isFinite(maxUsesNum) || maxUsesNum <= 0) {
                showToast('Điểm PawPoint và số lượt phải là số hợp lệ.', 'warning');
                return;
            }
            if (!expiryDate || Number.isNaN(expiryDate.getTime()) || expiryDate.getDate() !== Number(expiryMatch[1]) || expiryDate.getMonth() + 1 !== Number(expiryMatch[2]) || expiryDate < new Date()) {
                showToast('Ngày hết hạn không hợp lệ hoặc đã qua.', 'warning');
                return;
            }

            // Ghi nhận vào Supabase
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Không thể kết nối cơ sở dữ liệu.', 'danger');
                return;
            }

            try {
                let formattedEndDate = '2026-12-31T23:59:59Z';
                if (expiry && expiry.includes('/')) {
                    const parts = expiry.split('/');
                    if (parts.length === 3) {
                        formattedEndDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T23:59:59Z`;
                    }
                }

                const { error: voucherInsertError } = await client.from('voucher').insert({
                    voucher_code: code,
                    voucher_name: title,
                    discount_value: numVal,
                    minimum_order_amount: numMinOrder,
                    required_points: pointsNum,
                    start_date: new Date().toISOString(),
                    end_date: formattedEndDate,
                    is_active: true,
                    type: isPct ? 'percentage' : 'fixed',
                    usage_count: 0,
                    max_usage: maxUsesNum,
                    applicable_for: ['all'],
                    description: title
                });
                if (voucherInsertError) throw voucherInsertError;
            } catch (errVouDb) {
                console.error('Lỗi khi thêm voucher vào Supabase:', errVouDb);
                showToast('Không thể tạo mã khuyến mãi: ' + (errVouDb.message || ''), 'danger');
                return;
            }

            vouchersList.unshift({
                code: code,
                name: title,
                title: title,
                type: isPct ? 'percent' : 'fixed',
                target: 'Shop',
                value: numVal,
                discount: discount,
                minOrder: numMinOrder,
                points: points,
                validDate: expiry,
                expiry: expiry,
                limit: maxUsesNum,
                used: 0,
                status: 'active'
            });

            persistSharedVouchersData(vouchersList);
            document.getElementById('modalCreateVoucher')?.classList.remove('active');
            renderVouchersTable();
            showToast(`Đã phát hành thành công mã khuyến mãi "${code}" trên toàn hệ thống!`, 'success');
        });

        // Cập nhật voucher từ modal tác vụ
        document.getElementById('btnSubmitUpdateVoucher')?.addEventListener('click', async () => {
            const code = state.activeActionVoucherCode;
            const vouchersList = getSharedVouchersList();
            const voucher = vouchersList.find(v => v.code === code);
            if (!voucher) return;

            const newStatus = document.getElementById('voucherTargetStatus')?.value;
            const newExpiry = document.getElementById('voucherTargetExpiry')?.value.trim();

            const nextStatus = newStatus ? ((newStatus === 'Đang chạy' || newStatus === 'active') ? 'active' : (newStatus === 'Tạm ngưng' || newStatus === 'paused') ? 'paused' : 'expired') : voucher.status;
            if (newExpiry) {
                const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(newExpiry);
                const d = m ? new Date(`${m[3]}-${m[2]}-${m[1]}T23:59:59`) : null;
                if (!d || Number.isNaN(d.getTime()) || d.getDate() !== Number(m[1]) || d.getMonth() + 1 !== Number(m[2]) || d < new Date()) {
                    showToast('Ngày gia hạn không hợp lệ.', 'warning');
                    return;
                }
            }

            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!client) {
                showToast('Không thể kết nối cơ sở dữ liệu.', 'danger');
                return;
            }

            try {
                let formattedEndDate = undefined;
                if (newExpiry && newExpiry.includes('/')) {
                    const parts = newExpiry.split('/');
                    if (parts.length === 3) {
                        formattedEndDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T23:59:59Z`;
                    }
                }

                const isAct = (nextStatus === 'active');
                const updatePayload = { is_active: isAct };
                if (formattedEndDate) updatePayload.end_date = formattedEndDate;

                const { error } = await client.from('voucher').update(updatePayload).eq('voucher_code', code);
                if (error) throw error;
            } catch (errUpVouDb) {
                console.error('Lỗi khi cập nhật voucher trên Supabase:', errUpVouDb);
                showToast('Không thể cập nhật Voucher: ' + (errUpVouDb.message || ''), 'danger');
                return;
            }

            voucher.status = nextStatus;
            if (newExpiry) {
                voucher.validDate = newExpiry;
                voucher.expiry = newExpiry;
            }

            persistSharedVouchersData(vouchersList);
            document.getElementById('modalVoucherAction')?.classList.remove('active');
            renderVouchersTable();
            showToast(`Đã lưu thay đổi cho mã khuyến mãi "${code}" thành công!`, 'success');
        });
    }

    // Xuất các phương thức ra window.PawpalOrdersModule cho inline handlers
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.renderVouchersTable = renderVouchersTable;
    window.PawpalOrdersModule.openVoucherActionModal = function(code) {
        const vouchersList = getSharedVouchersList();
        const voucher = vouchersList.find(v => v.code === code);
        if (!voucher) return;

        state.activeActionVoucherCode = code;
        const codeEl = document.getElementById('voucherTargetCode');
        const titleEl = document.getElementById('voucherTargetTitle');
        const usedEl = document.getElementById('voucherTargetUsed');
        const statusSelect = document.getElementById('voucherTargetStatus');
        const expiryInput = document.getElementById('voucherTargetExpiry');

        if (codeEl) codeEl.textContent = voucher.code;
        if (titleEl) titleEl.textContent = voucher.name || voucher.title;
        if (usedEl) usedEl.textContent = `${voucher.used || 0} / ${voucher.limit || 100}`;
        if (statusSelect) statusSelect.value = (voucher.status === 'active' || voucher.status === 'Đang chạy') ? 'Đang chạy' : (voucher.status === 'paused' || voucher.status === 'Tạm ngưng') ? 'Tạm ngưng' : 'Hết hạn';
        if (expiryInput) expiryInput.value = voucher.validDate || voucher.expiry || '';

        document.getElementById('modalVoucherAction')?.classList.add('active');
    };
    window.PawpalOrdersModule.navigateToSettingsMarketing = function() {
        sessionStorage.setItem('pawpal_admin_active_module', 'Cấu hình');
        sessionStorage.setItem('pawpal_admin_settings_subtab', 'tab-banner-promos');
        window.location.hash = '#tab-banner-promos';
        const settingsBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Cấu hình');
        if (settingsBtn) {
            settingsBtn.click();
        }
    };

    // Khởi tạo sự kiện
    initPromosEvents();
})();
