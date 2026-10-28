// tab-settings-system.js - Subtab Cấu hình Vận hành và Hệ thống (Thanh toán, Vận chuyển, Đặt lịch, Đối tác)
(function() {
    'use strict';

    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};
    PawpalSettings.state = PawpalSettings.state || {};

    let isSystemInitialized = false;

    function showToast(msg, type) {
        if (PawpalSettings.showToast) PawpalSettings.showToast(msg, type);
    }

    function logSystemAudit(action, entityName, description) {
        if (PawpalSettings.logSystemAudit) return PawpalSettings.logSystemAudit(action, entityName, description);
        return Promise.resolve();
    }

    function renderSystemConfigCards() {
        const root = document.getElementById('subtab-tab-system-config');
        if(PawpalSettings.state.loadError){root?.querySelectorAll('.info-value, [id^="disp"]').forEach(el=>el.textContent='Không tải được cấu hình');return;}
        if (!PawpalSettings.state.isLoaded || !PawpalSettings.state.hasSystemConfig) {
            root?.querySelectorAll('.info-value, [id^="disp"]').forEach(el => {
                if (!PawpalSettings.state.isLoaded) el.innerHTML = '<span class="skeleton-text skeleton-text--value"></span>';
                else el.textContent = 'Chưa có cấu hình được lưu';
            });
            return;
        }
        const cfg = PawpalSettings.state?.systemConfig;
        if (!cfg) return;

        // Card 1: Store Profile
        if (cfg.storeInfo) {
            const brandEl = document.getElementById('dispStoreBrand');
            const hotlineEl = document.getElementById('dispStoreHotline');
            const emailEl = document.getElementById('dispStoreEmail');
            const addrEl = document.getElementById('dispStoreAddress');
            const taxEl = document.getElementById('dispStoreTaxId');
            if (brandEl) brandEl.textContent = cfg.storeInfo.brandName || '';
            if (hotlineEl) hotlineEl.textContent = cfg.storeInfo.hotline || '';
            if (emailEl) emailEl.textContent = cfg.storeInfo.email || '';
            if (addrEl) addrEl.textContent = cfg.storeInfo.address || '';
            if (taxEl) taxEl.textContent = cfg.storeInfo.taxId || '';
        }

        // Card 2: Payment Gateways
        if (cfg.paymentMethods) {
            const codBadge = document.getElementById('statusCodBadge');
            const bankBadge = document.getElementById('statusBankBadge');
            const momoBadge = document.getElementById('statusMomoBadge');
            const vnpayBadge = document.getElementById('statusVnpayBadge');
            const countBadge = document.getElementById('badgePaymentCount');

            let activeCount = 0;
            if (codBadge) {
                const en = Boolean(cfg.paymentMethods.cod?.enabled);
                codBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                codBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (bankBadge) {
                const en = Boolean(cfg.paymentMethods.bank?.enabled);
                bankBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                bankBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (momoBadge) {
                const en = Boolean(cfg.paymentMethods.momo?.enabled);
                momoBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                momoBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (vnpayBadge) {
                const en = Boolean(cfg.paymentMethods.vnpay?.enabled);
                vnpayBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                vnpayBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (countBadge) {
                countBadge.textContent = `${activeCount} Cổng hoạt động`;
            }
        }

        // Card 3: Shipping & Delivery
        if (cfg.shippingPolicy) {
            const freeShipEl = document.getElementById('dispFreeShipThreshold');
            const stdFeesEl = document.getElementById('dispStandardShippingFees');
            const expFeeEl = document.getElementById('dispExpressShippingFee');
            const apiStatusEl = document.getElementById('dispShippingApiStatus');
            const partnerBadge = document.getElementById('dispShippingPartnerBadge');

            // CFG-29: Dùng ?? thay cho || để giữ đúng giá trị 0 hoặc false
            if (freeShipEl) freeShipEl.textContent = 'Theo hình thức giao hàng được chọn';
            if (stdFeesEl) stdFeesEl.textContent = (PawpalSettings.state.deliveryOptions||[]).map(o=>o.name+': '+Number(o.fee).toLocaleString('vi-VN')+' đ'+(o.available?'':' · Tạm tắt')).join('; ')||'—';
            if (expFeeEl) expFeeEl.textContent = 'Chưa tích hợp giao vận thật';
            if (apiStatusEl) apiStatusEl.textContent = `${(cfg.shippingPolicy.partnerName || 'Chưa cấu hình').split(' ')[0]} (Shop ID: ${cfg.shippingPolicy.shopId || 'Trống'})`;
            if (partnerBadge) partnerBadge.textContent = cfg.shippingPolicy.partnerName || 'Chưa cấu hình';
        }

        // Card 4: Booking Policy & Operating Hours
        if (cfg.operatingHours && cfg.hotelRules && cfg.bookingPolicy) {
            const opHoursEl = document.getElementById('dispOperatingHours');
            const hotelEl = document.getElementById('dispHotelCheckInOut');
            const capEl = document.getElementById('dispSlotCapacity');
            const cancelEl = document.getElementById('dispCancelPolicy');

            if (opHoursEl) opHoursEl.textContent = cfg.operatingHours.weekday?.open&&cfg.operatingHours.weekday?.close?`${cfg.operatingHours.weekday.open} - ${cfg.operatingHours.weekday.close}`:'—';
            if (hotelEl) hotelEl.textContent = cfg.hotelRules.checkInTime&&cfg.hotelRules.checkOutTime?`Nhận sau ${cfg.hotelRules.checkInTime} • Trả trước ${cfg.hotelRules.checkOutTime}`:'—';
            if (capEl) capEl.textContent = `Tối đa ${cfg.bookingPolicy.slotCapacityMax ?? 0} bé / Khung giờ`;
            if (cancelEl) cancelEl.textContent = `Trước ${cfg.bookingPolicy.freeCancelHours ?? 0} giờ • Phí trễ ${(cfg.bookingPolicy.lateCancelFee ?? 0).toLocaleString('vi-VN')} đ`;
        }

        // Card 5: Partner Connection Badges
        const ghnBadge = document.getElementById('pingGhnBadge');
        const momoBadge = document.getElementById('pingMomoBadge');
        const vnpayBadge = document.getElementById('pingVnpayBadge');
        const isGhnOk = false;
        const isMomoOk = Boolean(cfg.paymentMethods?.momo?.enabled);
        const isVnpayOk = Boolean(cfg.paymentMethods?.vnpay?.enabled);

        if (ghnBadge) {
            ghnBadge.className = isGhnOk ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
            ghnBadge.textContent = isGhnOk ? 'Đã cấu hình' : 'Chưa cấu hình';
        }
        if (momoBadge) {
            momoBadge.className = isMomoOk ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
            momoBadge.textContent = isMomoOk ? 'Đang kích hoạt' : 'Tạm tắt';
        }
        if (vnpayBadge) {
            vnpayBadge.className = isVnpayOk ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
            vnpayBadge.textContent = isVnpayOk ? 'Đang kích hoạt' : 'Tạm tắt';
        }
    }

    function initSystemSubtab() {
        if (isSystemInitialized) {
            renderSystemConfigCards();
            return;
        }
        isSystemInitialized = true;

        // Modal 1: Thông tin Cửa hàng và Chi nhánh
        document.getElementById('btnConfigureStoreProfile')?.addEventListener('click', () => {
            const si = PawpalSettings.state?.systemConfig?.storeInfo || {};
            const brandInput = document.getElementById('inputStoreBrandName');
            const companyInput = document.getElementById('inputStoreCompanyName');
            const hotlineInput = document.getElementById('inputStoreHotline');
            const emergInput = document.getElementById('inputStoreEmergency');
            const emailInput = document.getElementById('inputStoreEmail');
            const taxInput = document.getElementById('inputStoreTaxId');
            const addrInput = document.getElementById('inputStoreAddress');
            const zaloInput = document.getElementById('inputStoreZalo');
            const fbInput = document.getElementById('inputStoreFacebook');

            if (brandInput) brandInput.value = si.brandName || '';
            if (companyInput) companyInput.value = si.companyName || '';
            if (hotlineInput) hotlineInput.value = si.hotline || '';
            if (emergInput) emergInput.value = si.emergencyPhone || '';
            if (emailInput) emailInput.value = si.email || '';
            if (taxInput) taxInput.value = si.taxId || '';
            if (addrInput) addrInput.value = si.address || '';
            if (zaloInput) zaloInput.value = si.zaloUrl || '';
            if (fbInput) fbInput.value = si.facebookUrl || '';

            PawpalSettings.openModal?.('storeProfileModalOverlay');
        });

        const closeStoreModalHandler = () => { PawpalSettings.closeModal?.('storeProfileModalOverlay'); };
        document.getElementById('btnCancelStoreProfileModal')?.addEventListener('click', closeStoreModalHandler);
        document.getElementById('btnDismissStoreProfileModal')?.addEventListener('click', closeStoreModalHandler);

        document.getElementById('btnSaveStoreProfile')?.addEventListener('click', () => {
            if (PawpalSettings.state?.isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" trước khi thay đổi thông tin cửa hàng.', 'warning');
                return;
            }

            const brand = document.getElementById('inputStoreBrandName')?.value.trim() || '';
            const company = document.getElementById('inputStoreCompanyName')?.value.trim() || '';
            const hotline = document.getElementById('inputStoreHotline')?.value.trim() || '';
            const emerg = document.getElementById('inputStoreEmergency')?.value.trim() || '';
            const email = document.getElementById('inputStoreEmail')?.value.trim() || '';
            const taxId = document.getElementById('inputStoreTaxId')?.value.trim() || '';
            const address = document.getElementById('inputStoreAddress')?.value.trim() || '';
            const zalo = document.getElementById('inputStoreZalo')?.value.trim() || '';
            const fb = document.getElementById('inputStoreFacebook')?.value.trim() || '';

            const requiredErrors = [];
            if (!brand) requiredErrors.push('Tên thương hiệu là bắt buộc.');
            if (!hotline) requiredErrors.push('Hotline là bắt buộc.');
            else if (!/^(?:0\d{9,10}|1[89]00\d{4,6}|\+84\d{9,10})$/.test(hotline.replace(/[\s().-]/g, ''))) requiredErrors.push('Hotline không đúng định dạng số điện thoại.');
            if (!address) requiredErrors.push('Địa chỉ là bắt buộc.');
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) requiredErrors.push('Email không hợp lệ.');
            if (requiredErrors.length) {
                showToast(requiredErrors.join(' '), 'warning');
                return;
            }

            PawpalSettings.openImpactConfirmationModal?.({
                title: 'Thông tin cửa hàng',
                desc: 'Cập nhật Hotline, Địa chỉ, Email và Thông tin Pháp lý của PawPal.',
                affectedModules: [
                    { name: 'User Portal và Website Footer', note: `Đồng bộ Hotline ${hotline}, Email ${email} và Địa chỉ ${address}` },
                    { name: 'Hóa đơn VAT và Đơn hàng', note: `Đồng bộ Mã số thuế ${taxId} và Tên công ty xuất hóa đơn` }
                ],
                onConfirm: async () => {
                    try {
                        const cfg = structuredClone(PawpalSettings.state?.systemConfig);
                        if (!cfg) throw new Error('Chưa khởi tạo cấu hình hệ thống.');
                        cfg.storeInfo = {
                            brandName: brand,
                            companyName: company,
                            hotline: hotline,
                            emergencyPhone: emerg,
                            email: email,
                            address: address,
                            taxId: taxId,
                            zaloUrl: zalo,
                            facebookUrl: fb
                        };
                        await PawpalSettings.persistSystemConfig?.(cfg);
                        PawpalSettings.closeModal?.('storeProfileModalOverlay');
                        await logSystemAudit('UPDATE', 'store_profile', `Cập nhật thông tin cửa hàng: Hotline ${hotline}, Email ${email}`);
                        await PawpalSettings.loadSettingsModuleData?.();
                        renderSystemConfigCards();
                        PawpalSettings.subtabs.audit?.renderAuditLogs?.();
                        showToast('Đã cập nhật thông tin cửa hàng và đồng bộ sang User Portal thành công!', 'success');
                    } catch (e) {
                        console.error('[Settings] Lưu thông tin cửa hàng thất bại:', e);
                        showToast(`Không thể lưu thông tin cửa hàng: ${e?.message || 'Lỗi cơ sở dữ liệu'}`, 'danger');
                    }
                }
            });
        });

        // Modal 2: Phương thức Thanh toán
        document.getElementById('btnConfigurePayment')?.addEventListener('click', () => {
            const pm = PawpalSettings.state?.systemConfig?.paymentMethods || {};
            const toggleCod = document.getElementById('toggleCodEnabled');
            const toggleBank = document.getElementById('toggleBankEnabled');
            const toggleMomo = document.getElementById('toggleMomoEnabled');
            const toggleVnpay = document.getElementById('toggleVnpayEnabled');

            if (toggleCod) toggleCod.checked = Boolean(pm.cod?.enabled);
            if (toggleBank) toggleBank.checked = Boolean(pm.bank?.enabled);
            if (toggleMomo) toggleMomo.checked = Boolean(pm.momo?.enabled);
            if (toggleVnpay) toggleVnpay.checked = Boolean(pm.vnpay?.enabled);

            const bankSelect = document.getElementById('inputPaymentBank');
            const accNoInput = document.getElementById('inputPaymentAccNo');
            const accHolderInput = document.getElementById('inputPaymentAccHolder');
            const syntaxInput = document.getElementById('inputPaymentSyntax');

            if (bankSelect) bankSelect.value = pm.bank?.bankName || '';
            if (accNoInput) accNoInput.value = pm.bank?.accountNumber || '';
            if (accHolderInput) accHolderInput.value = pm.bank?.accountHolder || '';
            if (syntaxInput) syntaxInput.value = pm.bank?.syntax || '';

            PawpalSettings.openModal?.('paymentConfigModalOverlay');
        });

        const closePaymentModalHandler = () => { PawpalSettings.closeModal?.('paymentConfigModalOverlay'); };
        document.getElementById('btnCancelPaymentModal')?.addEventListener('click', closePaymentModalHandler);
        document.getElementById('btnDismissPaymentModal')?.addEventListener('click', closePaymentModalHandler);

        document.getElementById('btnSavePaymentConfig')?.addEventListener('click', () => {
            if (PawpalSettings.state?.isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" trước khi lưu cấu hình cổng thanh toán.', 'warning');
                return;
            }

            const codEn = document.getElementById('toggleCodEnabled')?.checked || false;
            const bankEn = document.getElementById('toggleBankEnabled')?.checked || false;
            const momoEn = document.getElementById('toggleMomoEnabled')?.checked || false;
            const vnpayEn = document.getElementById('toggleVnpayEnabled')?.checked || false;

            const bankName = document.getElementById('inputPaymentBank')?.value || '';
            const accNo = (document.getElementById('inputPaymentAccNo')?.value.trim() || '').replace(/[\s-]/g, '');
            const accHolder = document.getElementById('inputPaymentAccHolder')?.value.trim() || '';
            const syntax = document.getElementById('inputPaymentSyntax')?.value.trim() || '';
            if (bankEn && (!bankName || !accHolder || !/^\d+$/.test(accNo))) {
                showToast('Số tài khoản QR phải là số và không được để trống.', 'warning');
                return;
            }
            if (bankEn && !syntax) {
                showToast('Cú pháp chuyển khoản không được để trống.', 'warning');
                return;
            }

            PawpalSettings.openImpactConfirmationModal?.({
                title: 'Cấu hình Cổng Thanh toán',
                desc: 'Cập nhật danh sách cổng thanh toán trực tuyến và thông tin QR Banking.',
                affectedModules: [
                    { name: 'Phân hệ Bán hàng và User Portal Checkout', note: `Trạng thái cổng: COD (${codEn ? 'Bật' : 'Tắt'}), QR Bank (${bankEn ? 'Bật' : 'Tắt'}), MoMo (${momoEn ? 'Bật' : 'Tắt'}), VNPay (${vnpayEn ? 'Bật' : 'Tắt'})` }
                ],
                onConfirm: async () => {
                    try {
                        const cfg = structuredClone(PawpalSettings.state?.systemConfig);
                        if (!cfg) throw new Error('Chưa khởi tạo cấu hình hệ thống.');
                        // CFG-28: Bảo lưu cấu hình đối tác và các trường mở rộng hiện có, không hardcode override
                        cfg.paymentMethods = {
                            cod: { enabled: codEn, name: 'Thanh toán khi nhận hàng (COD)', fee: cfg.paymentMethods?.cod?.fee ?? 0 },
                            bank: {
                                enabled: bankEn,
                                name: 'Chuyển khoản QR Banking',
                                bankName: bankName,
                                accountNumber: accNo,
                                accountHolder: accHolder,
                                syntax: syntax
                            },
                            momo: { enabled: momoEn, name: 'Ví điện tử MoMo', merchantId: cfg.paymentMethods?.momo?.merchantId ?? '' },
                            vnpay: { enabled: vnpayEn, name: 'Cổng thanh toán VNPay', tmnCode: cfg.paymentMethods?.vnpay?.tmnCode ?? '' }
                        };
                        await PawpalSettings.persistSystemConfig?.(cfg);
                        PawpalSettings.closeModal?.('paymentConfigModalOverlay');

                        await logSystemAudit('UPDATE', 'payment', `Cấu hình thanh toán: COD (${codEn ? 'Bật' : 'Tắt'}), Bank (${bankEn ? 'Bật' : 'Tắt'}), MoMo (${momoEn ? 'Bật' : 'Tắt'}), VNPay (${vnpayEn ? 'Bật' : 'Tắt'})`);
                        await PawpalSettings.loadSettingsModuleData?.();
                        renderSystemConfigCards();
                        PawpalSettings.subtabs.audit?.renderAuditLogs?.();
                        // CFG-27: Thông báo lưu trung thực, không hứa hẹn đồng bộ ngoài thẩm quyền client
                        showToast('Đã lưu cấu hình cổng thanh toán thành công!', 'success');
                    } catch (e) {
                        console.error('[Settings] Lưu cổng thanh toán thất bại:', e);
                        showToast(`Không thể lưu cấu hình cổng thanh toán: ${e?.message || 'Lỗi cơ sở dữ liệu'}`, 'danger');
                    }
                }
            });
        });

        // Modal 3: Đơn vị Giao hàng và Biểu phí Vận chuyển
        document.getElementById('btnConfigureShipping')?.addEventListener('click',()=>{
            const policy=PawpalSettings.state.systemConfig.shippingPolicy||{},container=document.getElementById('shippingDeliveryOptions');container.replaceChildren();
            const options=PawpalSettings.state.deliveryOptions||[];
            if(!options.length)container.textContent='Chưa có hình thức giao hàng.';
            for(const option of options){
                const row=document.createElement('div');row.className='shipping-option-row';row.dataset.id=option.id;
                const name=document.createElement('label');name.textContent=option.name;name.htmlFor='shipping-fee-'+option.id;
                const fee=document.createElement('input');fee.type='number';fee.className='admin-input shipping-option-fee';fee.id=name.htmlFor;fee.min='0';fee.step='0.01';fee.value=option.fee;fee.setAttribute('aria-label','Phí '+option.name);
                const label=document.createElement('label'),available=document.createElement('input');available.type='checkbox';available.className='shipping-option-available';available.checked=option.available;label.append(available,document.createTextNode(' Bật'));
                row.append(name,fee,label);container.append(row);
            }
            document.getElementById('inputShippingProvider').value=policy.primaryPartner||'';document.getElementById('inputShippingShopId').value=policy.shopId||'';document.getElementById('inputShippingApiKey').value='';
            PawpalSettings.openModal('shippingConfigModalOverlay');
        });
        document.getElementById('btnCancelShippingModal')?.addEventListener('click',()=>PawpalSettings.closeModal('shippingConfigModalOverlay'));
        document.getElementById('btnDismissShippingModal')?.addEventListener('click',()=>PawpalSettings.closeModal('shippingConfigModalOverlay'));
        document.getElementById('btnSaveShippingConfig')?.addEventListener('click',()=>{
            if(PawpalSettings.state.isSafeModeLocked){showToast('Vui lòng mở khóa cấu hình trước khi lưu.','warning');return;}
            const options=Array.from(document.querySelectorAll('.shipping-option-row')).map(row=>({id:row.dataset.id,fee:Number(row.querySelector('.shipping-option-fee').value||NaN),available:row.querySelector('.shipping-option-available').checked}));
            if(options.some(o=>!Number.isFinite(o.fee)||o.fee<0||o.fee>1000000000)){showToast('Biểu phí không hợp lệ.','warning');return;}
            const provider=document.getElementById('inputShippingProvider').value,shopId=document.getElementById('inputShippingShopId').value.trim();
            PawpalSettings.openImpactConfirmationModal({title:'Biểu phí giao hàng',affectedModules:[{name:'Bán hàng',note:'Áp dụng khi chọn hình thức giao hàng cho đơn mới.'}],onConfirm:async()=>{
                try{
                    const cfg=structuredClone(PawpalSettings.state.systemConfig);cfg.shippingPolicy={...cfg.shippingPolicy,primaryPartner:provider,partnerName:{ghn:'Giao Hàng Nhanh',ghtk:'Giao Hàng Tiết Kiệm',grab:'GrabExpress'}[provider]||'',shopId,isConfigured:false};
                    await PawpalSettings.saveShipping(options,cfg);PawpalSettings.closeModal('shippingConfigModalOverlay');await PawpalSettings.loadSettingsModuleData({force:true});renderSystemConfigCards();showToast('Đã lưu biểu phí giao hàng.','success');
                }catch(error){showToast(error.message,'danger');}
            }});
        });

        // Modal 4: Chính sách Đặt lịch, Giờ mở cửa và Pet Hotel
        document.getElementById('btnConfigureBookingPolicy')?.addEventListener('click', () => {
            const oh = PawpalSettings.state?.systemConfig?.operatingHours || {};
            const hr = PawpalSettings.state?.systemConfig?.hotelRules || {};
            const bp = PawpalSettings.state?.systemConfig?.bookingPolicy || {};

            const wkOpenInput = document.getElementById('inputWeekdayOpen');
            const wkCloseInput = document.getElementById('inputWeekdayClose');
            const weOpenInput = document.getElementById('inputWeekendOpen');
            const weCloseInput = document.getElementById('inputWeekendClose');

            if (wkOpenInput) wkOpenInput.value = oh.weekday?.open || '';
            if (wkCloseInput) wkCloseInput.value = oh.weekday?.close || '';
            if (weOpenInput) weOpenInput.value = oh.weekend?.open || '';
            if (weCloseInput) weCloseInput.value = oh.weekend?.close || '';

            const checkInInput = document.getElementById('inputHotelCheckIn');
            const checkOutInput = document.getElementById('inputHotelCheckOut');
            const hotelLateFeeInput = document.getElementById('inputHotelLateFee');

            if (checkInInput) checkInInput.value = hr.checkInTime || '';
            if (checkOutInput) checkOutInput.value = hr.checkOutTime || '';
            if (hotelLateFeeInput) hotelLateFeeInput.value = hr.lateCheckOutFeePerHalfDay ?? '';

            const slotCapInput = document.getElementById('inputSlotCapacity');
            const freeCancelInput = document.getElementById('inputFreeCancelHours');
            const lateCancelFeeInput = document.getElementById('inputLateCancelFee');
            const allowPickStaffSelect = document.getElementById('inputAllowPickStaff');

            if (slotCapInput) slotCapInput.value = bp.slotCapacityMax ?? '';
            if (freeCancelInput) freeCancelInput.value = bp.freeCancelHours ?? '';
            if (lateCancelFeeInput) lateCancelFeeInput.value = bp.lateCancelFee ?? '';
            if (allowPickStaffSelect) allowPickStaffSelect.value = bp.allowPickStaff ? 'yes' : 'no';

            PawpalSettings.openModal?.('bookingPolicyModalOverlay');
        });

        const closeBookingModalHandler = () => { PawpalSettings.closeModal?.('bookingPolicyModalOverlay'); };
        document.getElementById('btnCancelBookingPolicyModal')?.addEventListener('click', closeBookingModalHandler);
        document.getElementById('btnDismissBookingPolicyModal')?.addEventListener('click', closeBookingModalHandler);

        document.getElementById('btnSaveBookingPolicy')?.addEventListener('click', () => {
            if (PawpalSettings.state?.isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" trước khi thay đổi quy tắc đặt lịch.', 'warning');
                return;
            }

            const wkOpen = document.getElementById('inputWeekdayOpen')?.value || '';
            const wkClose = document.getElementById('inputWeekdayClose')?.value || '';
            const weOpen = document.getElementById('inputWeekendOpen')?.value || '';
            const weClose = document.getElementById('inputWeekendClose')?.value || '';

            const checkIn = document.getElementById('inputHotelCheckIn')?.value || '';
            const checkOut = document.getElementById('inputHotelCheckOut')?.value || '';
            const hotelLateFee = Number(document.getElementById('inputHotelLateFee')?.value || 'NaN');

            const slotCapacity = Number(document.getElementById('inputSlotCapacity')?.value || 'NaN');
            const freeHours = Number(document.getElementById('inputFreeCancelHours')?.value || 'NaN');
            const lateFee = Number(document.getElementById('inputLateCancelFee')?.value || 'NaN');
            const allowPickStaff = document.getElementById('inputAllowPickStaff')?.value === 'yes';

            const toMinutes = (value) => {
                const [hour, minute] = String(value).split(':').map(Number);
                return hour * 60 + minute;
            };
            if (![wkOpen,wkClose,weOpen,weClose,checkIn,checkOut].every(value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) { showToast('Vui l\u00f2ng nh\u1eadp \u0111\u1ee7 gi\u1edd h\u1ee3p l\u1ec7.', 'warning'); return; }
            if (toMinutes(wkOpen) >= toMinutes(wkClose) || toMinutes(weOpen) >= toMinutes(weClose)) {
                showToast('Giờ mở cửa phải sớm hơn giờ đóng cửa.', 'warning');
                return;
            }
            if (checkIn === checkOut) {
                showToast('Giờ nhận và trả phòng phải khác nhau.', 'warning');
                return;
            }
            if (!Number.isInteger(slotCapacity) || slotCapacity <= 0 || slotCapacity > 1000000000) {
                showToast('Công suất phải là số nguyên dương.', 'warning');
                return;
            }
            if ([hotelLateFee, freeHours, lateFee].some(value => !Number.isFinite(value) || value < 0 || value > 1000000000)) {
                showToast('Phí Hotel, phí hủy và số giờ miễn phí không được là số âm.', 'warning');
                return;
            }

            PawpalSettings.openImpactConfirmationModal?.({
                title: 'Chính sách Đặt lịch, Giờ mở cửa và Pet Hotel',
                desc: 'Quy tắc hủy lịch hẹn, giờ nhận/trả Pet Hotel và công suất ca phục vụ.',
                affectedModules: [
                    { name: 'Phân hệ Dịch vụ và User Booking Portal', note: `Giờ mở cửa ${wkOpen}-${wkClose} (Cuối tuần đến ${weClose}), Pet Hotel Check-in ${checkIn}/Check-out ${checkOut}` },
                    { name: 'Phân hệ Nhân sự', note: `Công suất tối đa ${slotCapacity} bé/khung giờ, Chỉ định nhân viên: ${allowPickStaff ? 'Cho phép' : 'Tự động'}` }
                ],
                onConfirm: async () => {
                    try {
                        const cfg = structuredClone(PawpalSettings.state?.systemConfig);
                        if (!cfg) throw new Error('Chưa khởi tạo cấu hình hệ thống.');
                        // CFG-28: Bảo lưu holidayNotice và quy tắc hotel/booking hiện có, không ghi đè cứng
                        cfg.operatingHours = {
                            weekday: { open: wkOpen, close: wkClose },
                            weekend: { open: weOpen, close: weClose },
                            holidayNotice: cfg.operatingHours?.holidayNotice ?? ''
                        };
                        cfg.hotelRules = {
                            checkInTime: checkIn,
                            checkOutTime: checkOut,
                            lateCheckOutFeePerHalfDay: hotelLateFee,
                            includedMealsPerDay: cfg.hotelRules?.includedMealsPerDay ?? null,
                            cameraAccessEnabled: false
                        };
                        cfg.bookingPolicy = {
                            freeCancelHours: freeHours,
                            lateCancelFee: lateFee,
                            allowPickStaff: allowPickStaff,
                            slotCapacityMax: slotCapacity,
                            timeSlots: cfg.bookingPolicy?.timeSlots || []
                        };
                        await PawpalSettings.persistSystemConfig?.(cfg);
                        PawpalSettings.closeModal?.('bookingPolicyModalOverlay');

                        await logSystemAudit('UPDATE', 'booking_policy', `Chính sách đặt lịch: Giờ mở cửa ${wkOpen}-${wkClose}, Hủy miễn phí trước ${freeHours}h, Phí trễ ${lateFee.toLocaleString('vi-VN')} đ`);
                        await PawpalSettings.loadSettingsModuleData?.();
                        renderSystemConfigCards();
                        PawpalSettings.subtabs.audit?.renderAuditLogs?.();
                        // CFG-27: Thông báo lưu trung thực
                        showToast('Đã áp dụng chính sách đặt lịch mới vào cấu hình hệ thống!', 'success');
                    } catch (e) {
                        console.error('[Settings] Lưu chính sách đặt lịch thất bại:', e);
                        showToast(`Không thể lưu chính sách đặt lịch: ${e?.message || 'Lỗi cơ sở dữ liệu'}`, 'danger');
                    }
                }
            });
        });

        // Live Healthcheck đối tác (CFG-26: Thông báo kiểm tra cấu hình đối tác trung thực)
        document.getElementById('btnConfigurePartners')?.addEventListener('click', () => {
            const cfg = PawpalSettings.state?.systemConfig || {};
            const isGhnOk = false;
            const isMomoOk = Boolean(cfg.paymentMethods?.momo?.enabled);
            const isVnpayOk = Boolean(cfg.paymentMethods?.vnpay?.enabled);

            const ghnBadge = document.getElementById('pingGhnBadge');
            const momoBadge = document.getElementById('pingMomoBadge');
            const vnpayBadge = document.getElementById('pingVnpayBadge');

            if (ghnBadge) {
                ghnBadge.className = isGhnOk ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                ghnBadge.textContent = isGhnOk ? 'Đã cấu hình' : 'Chưa cấu hình';
            }
            if (momoBadge) {
                momoBadge.className = isMomoOk ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                momoBadge.textContent = isMomoOk ? 'Đang kích hoạt' : 'Tạm tắt';
            }
            if (vnpayBadge) {
                vnpayBadge.className = isVnpayOk ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                vnpayBadge.textContent = isVnpayOk ? 'Đang kích hoạt' : 'Tạm tắt';
            }
            showToast('Đã kiểm tra trạng thái cấu hình đối tác (kết nối trực tiếp cần backend integration API).', 'info');
        });

        // Safe mode UI & Toggle
        const handleSafeModeToggle = () => {
            let actor = null;
            try { actor = JSON.parse(sessionStorage.getItem('pawpal_admin_user') || localStorage.getItem('pawpal_admin_user') || 'null'); } catch (_) {}
            const roles = new Set([...(Array.isArray(actor?.access_roles) ? actor.access_roles : []), actor?.system_role, actor?.role].filter(Boolean).map(role => String(role).toUpperCase()));
            const permissions = new Set(Array.isArray(actor?.permissions) ? actor.permissions : []);
            const canUnlock = (roles.has('ADMIN') || roles.has('MANAGER')) && ['pawpal_setting.read', 'pawpal_setting.write', 'audit_log.write'].every(permission => permissions.has(permission));
            if (PawpalSettings.state?.isSafeModeLocked && !canUnlock) {
                showToast('Chỉ quản trị viên hoặc quản lý có quyền sửa cấu hình mới được mở khóa an toàn hệ thống.', 'danger');
                return;
            }
            PawpalSettings.state.isSafeModeLocked = !PawpalSettings.state.isSafeModeLocked;
            PawpalSettings.updateSafeModeUI?.();
            if (PawpalSettings.state.isSafeModeLocked) {
                showToast('Đã BẬT Khóa an toàn! Toàn bộ tham số cấu hình lõi được bảo vệ chống thao tác nhầm.', 'warning');
            } else {
                showToast('Đã MỞ KHÓA thành công! Bạn có thể chỉnh sửa các chính sách và cấu hình vận hành.', 'success');
            }
        };

        document.getElementById('btnToggleSafeMode')?.addEventListener('click', handleSafeModeToggle);
        document.getElementById('btnToggleSafeModeAudit')?.addEventListener('click', handleSafeModeToggle);

        // Render ban đầu
        renderSystemConfigCards();
    }

    PawpalSettings.subtabs.system = {
        init: initSystemSubtab,
        renderSystemConfigCards
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSystemSubtab);
    } else {
        initSystemSubtab();
    }
})();
