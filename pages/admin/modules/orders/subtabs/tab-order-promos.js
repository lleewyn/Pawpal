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

    const escapeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

    // Render bảng danh sách voucher
    function renderVouchersTable() {
        const tbody = document.getElementById('vouchersTableBody');
        if (!tbody) return;
        if (state.vouchersError) {
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:28px;color:var(--text-muted);">Không thể tải dữ liệu. Vui lòng tải lại trang.</td></tr>';
            return;
        }


        const searchVal = (document.getElementById('promoSearchInput')?.value || '').trim();
        const vouchersList = getSharedVouchersList();
        if (!state.vouchersLoaded) return;
        delete tbody.dataset.loadingSkeleton;
        const running = vouchersList.filter(v=>['active','Đang chạy'].includes(v.status) && (!v.endsAt || Date.parse(v.endsAt)>=Date.now()) && (!v.startsAt || Date.parse(v.startsAt)<=Date.now()));
        const metrics = {statActiveVouchers:running.length,statVoucherUsedToday:'—',statExpiringVouchers:running.filter(v=>v.endsAt && Date.parse(v.endsAt)-Date.now()<=7*86400000).length};
        Object.entries(metrics).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value;});


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
                    <td colspan="9" style="text-align: center; padding: 36px; color: var(--text-muted); font-size: 13.5px;">
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

            const limitVal = v.limit ? v.limit : '∞';
            const usedVal = v.used || 0;
            const pct = (typeof v.limit === 'number' && v.limit > 0) ? Math.min(100, Math.round((usedVal / v.limit) * 100)) : 0;

            return `
                <tr>
                    <td>
                        <span class="voucher-code-badge">${escapeText(v.code)}</span>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${escapeText(v.title || v.name)}</div>
                        <div class="sub-meta-text">Áp dụng: ${escapeText(v.target || 'Toàn bộ Shop')}</div>
                    </td>
                    <td>
                        <div style="font-weight: 700; color: #B45309;">${escapeText(v.discount || (v.type === 'percent' ? v.value + '%' : formatVND(v.value)))}</div>

                    </td>
                    <td>${formatVND(Number(v.minOrder)||0)}</td>
                    <td>${Number(v.points)||0}</td>
                    <td>${escapeText(v.validDate || v.expiry || "Không giới hạn")}</td>
                    <td>
                        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                            <span>${escapeText(usedVal)} / ${escapeText(limitVal)}</span>
                            <span style="font-weight: 600;">${pct}%</span>
                        </div>
                        <div style="width: 100%; height: 6px; background-color: #ECF2EE; border-radius: 9px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background-color: #236B48; border-radius: 9px;"></div>
                        </div>
                    </td>

                    <td>${statusBadge}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger" data-voucher-code="${escapeText(v.code)}">•••</button>
                    </td>
                </tr>
            `;
        }).join('');
        tbody.querySelectorAll('[data-voucher-code]').forEach(button => {
            button.addEventListener('click', () => window.PawpalOrdersModule.openVoucherActionModal(button.dataset.voucherCode));
        });
    }

    // Đăng ký controller với Core
    PawpalOrders.controllers.promos = {
        renderVouchersTable
    };

    // Khởi tạo các sự kiện giao diện cho Subtab Promos
    let isPromosEventsInitialized = false;
    function initPromosEvents() {
        if (isPromosEventsInitialized) return;
        isPromosEventsInitialized = true;

        document.getElementById('formCreateVoucher')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('formVoucherAction')?.addEventListener('submit', (e) => e.preventDefault());
        document.getElementById('promoSearchInput')?.addEventListener('input', renderVouchersTable);

        // Mở modal tạo mã khuyến mãi
        document.getElementById('btnOpenCreateVoucherModal')?.addEventListener('click', () => {
            document.getElementById('formCreateVoucher').reset();state.voucherCreateId=crypto.randomUUID();state.voucherCreateRequest=crypto.randomUUID();
            document.getElementById('newVoucherStart').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
            document.getElementById('modalCreateVoucher')?.classList.add('active');
        });

        // Xác nhận tạo mã khuyến mãi dùng chung
        document.getElementById('btnSubmitCreateVoucher')?.addEventListener('click', async event => {
            const value=id=>document.getElementById(id).value.trim();
            const details={code:value('newVoucherCode').toUpperCase(),name:value('newVoucherTitle'),type:value('newVoucherType'),discount_value:value('newVoucherDiscount'),minimum_order_amount:value('newVoucherMinOrder'),required_points:value('newVoucherPoints'),start_date:value('newVoucherStart'),end_date:value('newVoucherExpiry'),max_usage:value('newVoucherMaxUses')||null,applicable_for:value('newVoucherScope'),is_active:true,description:value('newVoucherTitle')};
            event.currentTarget.disabled=true;
            try {
                const {error}=await window.getSupabaseClient().rpc('save_admin_sales_voucher',{p_request_id:state.voucherCreateRequest,p_voucher_id:state.voucherCreateId,p_expected_updated_at:null,p_details:details});
                if(error)throw error;
                document.getElementById('modalCreateVoucher').classList.remove('active');await PawpalOrders.fetchVouchersData({force:true});showToast('\u0110\u00e3 l\u01b0u m\u00e3 khuy\u1ebfn m\u00e3i.');
            }catch(error){showToast(error.code==='23505'?'M\u00e3 khuy\u1ebfn m\u00e3i \u0111\u00e3 t\u1ed3n t\u1ea1i.':'Ki\u1ec3m tra m\u1ee9c gi\u1ea3m, ng\u00e0y hi\u1ec7u l\u1ef1c v\u00e0 c\u00e1c tr\u01b0\u1eddng b\u1eaft bu\u1ed9c.','warning');}
            finally{document.getElementById('btnSubmitCreateVoucher').disabled=false;}
        });

        document.getElementById('btnSubmitUpdateVoucher')?.addEventListener('click',async event=>{
            const voucher=state.voucherEditSnapshot;if(!voucher)return;
            const raw=voucher.raw,details={code:raw.voucher_code,name:raw.voucher_name,type:raw.type,discount_value:raw.discount_value,minimum_order_amount:raw.minimum_order_amount,required_points:raw.required_points,start_date:raw.start_date,end_date:document.getElementById('voucherTargetExpiry').value,max_usage:raw.max_usage,applicable_for:raw.applicable_for,is_active:document.getElementById('voucherTargetStatus').value==='active',description:raw.description};
            event.currentTarget.disabled=true;
            try{const {error}=await window.getSupabaseClient().rpc('save_admin_sales_voucher',{p_request_id:state.voucherEditRequest,p_voucher_id:voucher.id,p_expected_updated_at:voucher.updatedAt,p_details:details});if(error)throw error;
                document.getElementById('modalVoucherAction').classList.remove('active');await PawpalOrders.fetchVouchersData({force:true});showToast('\u0110\u00e3 l\u01b0u m\u00e3 khuy\u1ebfn m\u00e3i.');
            }catch(error){showToast(error.code==='PT409'?'M\u00e3 \u0111\u00e3 thay \u0111\u1ed5i. \u0110\u00f3ng v\u00e0 m\u1edf l\u1ea1i \u0111\u1ec3 \u0111\u1ed1i chi\u1ebfu.':'Kh\u00f4ng th\u1ec3 l\u01b0u. Ki\u1ec3m tra ng\u00e0y hi\u1ec7u l\u1ef1c v\u00e0 quy\u1ec1n thao t\u00e1c.','warning');}
            finally{document.getElementById('btnSubmitUpdateVoucher').disabled=false;}
        });

        // Hỗ trợ kiểm thử tự động cho modal11 & modal12
        if (window.location.search.includes('v=modal11')) {
            setTimeout(() => {
                document.getElementById('modalCreateVoucher')?.classList.add('active');
            }, 600);
        }
        if (window.location.search.includes('v=modal12')) {
            setTimeout(() => {
                const list = getSharedVouchersList();
                if (list.length > 0) {
                    PawpalOrdersModule.openVoucherActionModal(list[0].code);
                }
            }, 600);
        }
    }

    // Xuất các phương thức ra window.PawpalOrdersModule cho inline handlers
    window.PawpalOrdersModule = window.PawpalOrdersModule || {};
    window.PawpalOrdersModule.renderVouchersTable = renderVouchersTable;
    window.PawpalOrdersModule.openVoucherActionModal = function(code) {
        const vouchersList = getSharedVouchersList();
        const voucher = vouchersList.find(v => v.code === code);
        if (!voucher) return;

        state.voucherEditSnapshot=structuredClone(voucher);state.voucherEditRequest=crypto.randomUUID();
        document.querySelector('#modalVoucherAction .rma-order-summary-box').style.cssText='background:transparent;border:none;padding:0;margin-bottom:16px;';
        state.activeActionVoucherCode = code;
        const codeEl = document.getElementById('voucherTargetCode');
        const titleEl = document.getElementById('voucherTargetTitle');
        const usedEl = document.getElementById('voucherTargetUsed');
        const statusSelect = document.getElementById('voucherTargetStatus');
        const expiryInput = document.getElementById('voucherTargetExpiry');

        if (codeEl) codeEl.textContent = voucher.code;
        if (titleEl) titleEl.textContent = voucher.name || voucher.title;
        if (usedEl) usedEl.textContent = `${voucher.used || 0} / ${voucher.limit ?? '\u2014'}`;
        if (statusSelect) statusSelect.value = voucher.raw.is_active?'active':'paused';
        if (expiryInput) expiryInput.value = voucher.raw.end_date;

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
