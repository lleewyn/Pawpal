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
        if (!PawpalSettings.state.isLoaded || !PawpalSettings.state.hasSystemConfig) {
            root?.querySelectorAll('.info-value, [id^="disp"]').forEach(el => {
                if (!PawpalSettings.state.isLoaded) el.innerHTML = '<span class="skeleton-text" style="width:120px;"></span>';
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
            if (brandEl) brandEl.textContent = cfg.storeInfo.brandName || 'PawPal Pet Center';
            if (hotlineEl) hotlineEl.textContent = cfg.storeInfo.hotline || '1900 888 999';
            if (emailEl) emailEl.textContent = cfg.storeInfo.email || 'cskh@pawpal.vn';
            if (addrEl) addrEl.textContent = cfg.storeInfo.address || '120 Nguyễn Thị Minh Khai, P.6, Q.3, TP.HCM';
            if (taxEl) taxEl.textContent = cfg.storeInfo.taxId || '0316889988';
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
            if (freeShipEl) freeShipEl.textContent = `Đơn từ ${(cfg.shippingPolicy.freeShippingThreshold ?? 0).toLocaleString('vi-VN')} đ`;
            if (stdFeesEl) stdFeesEl.textContent = `${(cfg.shippingPolicy.innerCityFee ?? 0).toLocaleString('vi-VN')} đ / ${(cfg.shippingPolicy.outerCityFee ?? 0).toLocaleString('vi-VN')} đ`;
            if (expFeeEl) expFeeEl.textContent = `${(cfg.shippingPolicy.expressFee ?? 0).toLocaleString('vi-VN')} đ (Grab / Aha)`;
            if (apiStatusEl) apiStatusEl.textContent = `${(cfg.shippingPolicy.partnerName || 'Chưa cấu hình').split(' ')[0]} (Shop ID: ${cfg.shippingPolicy.shopId || 'Trống'})`;
            if (partnerBadge) partnerBadge.textContent = cfg.shippingPolicy.partnerName || 'Chưa cấu hình';
        }

        // Card 4: Booking Policy & Operating Hours
        if (cfg.operatingHours && cfg.hotelRules && cfg.bookingPolicy) {
            const opHoursEl = document.getElementById('dispOperatingHours');
            const hotelEl = document.getElementById('dispHotelCheckInOut');
            const capEl = document.getElementById('dispSlotCapacity');
            const cancelEl = document.getElementById('dispCancelPolicy');

            if (opHoursEl) opHoursEl.textContent = `${cfg.operatingHours.weekday?.open || '08:00'} - ${cfg.operatingHours.weekday?.close || '20:00'} (T7/CN: ${cfg.operatingHours.weekend?.close || '21:00'})`;
            if (hotelEl) hotelEl.textContent = `Nhận sau ${cfg.hotelRules.checkInTime || '14:00'} • Trả trước ${cfg.hotelRules.checkOutTime || '12:00'}`;
            if (capEl) capEl.textContent = `Tối đa ${cfg.bookingPolicy.slotCapacityMax ?? 0} bé / Khung giờ`;
            if (cancelEl) cancelEl.textContent = `Trước ${cfg.bookingPolicy.freeCancelHours ?? 0} giờ • Phí trễ ${(cfg.bookingPolicy.lateCancelFee ?? 0).toLocaleString('vi-VN')} đ`;
        }

        // Card 5: Partner Connection Badges
        const ghnBadge = document.getElementById('pingGhnBadge');
        const momoBadge = document.getElementById('pingMomoBadge');
        const vnpayBadge = document.getElementById('pingVnpayBadge');
        const isGhnOk = Boolean(cfg.shippingPolicy?.shopId && cfg.shippingPolicy?.apiKey);
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
            if (companyInput) companyInput.value = si.companyName || 'CÔNG TY CỔ PHẦN PAWPAL VIỆT NAM';
            if (hotlineInput) hotlineInput.value = si.hotline || '';
            if (emergInput) emergInput.value = si.emergencyPhone || '0901 234 567';
            if (emailInput) emailInput.value = si.email || '';
            if (taxInput) taxInput.value = si.taxId || '0316889988';
            if (addrInput) addrInput.value = si.address || '';
            if (zaloInput) zaloInput.value = si.zaloUrl || 'https://zalo.me/0901234567';
            if (fbInput) fbInput.value = si.facebookUrl || 'https://facebook.com/pawpalvietnam';

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
            const company = document.getElementById('inputStoreCompanyName')?.value.trim() || 'CÔNG TY CỔ PHẦN PAWPAL VIỆT NAM';
            const hotline = document.getElementById('inputStoreHotline')?.value.trim() || '';
            const emerg = document.getElementById('inputStoreEmergency')?.value.trim() || '0901 234 567';
            const email = document.getElementById('inputStoreEmail')?.value.trim() || '';
            const taxId = document.getElementById('inputStoreTaxId')?.value.trim() || '0316889988';
            const address = document.getElementById('inputStoreAddress')?.value.trim() || '';
            const zalo = document.getElementById('inputStoreZalo')?.value.trim() || 'https://zalo.me/0901234567';
            const fb = document.getElementById('inputStoreFacebook')?.value.trim() || 'https://facebook.com/pawpalvietnam';

            const requiredErrors = [];
            if (!brand) requiredErrors.push('Tên thương hiệu là bắt buộc.');
            if (!hotline) requiredErrors.push('Hotline là bắt buộc.');
            if (!address) requiredErrors.push('Địa chỉ là bắt buộc.');
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) requiredErrors.push('Email không hợp lệ.');
            if (requiredErrors.length) {
                showToast(requiredErrors.join(' '), 'warning');
                return;
            }

            PawpalSettings.openImpactConfirmationModal?.({
                title: 'Thông tin Cửa hàng và Chi nhánh',
                desc: 'Cập nhật Hotline, Địa chỉ, Email và Thông tin Pháp lý của PawPal.',
                affectedModules: [
                    { name: 'User Portal và Website Footer', note: `Đồng bộ Hotline ${hotline}, Email ${email} và Địa chỉ ${address}` },
                    { name: 'Hóa đơn VAT và Đơn hàng', note: `Đồng bộ Mã số thuế ${taxId} và Tên công ty xuất hóa đơn` }
                ],
                onConfirm: async () => {
                    try {
                        const cfg = PawpalSettings.state?.systemConfig;
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

            if (toggleCod) toggleCod.checked = Boolean(pm.cod?.enabled !== false);
            if (toggleBank) toggleBank.checked = Boolean(pm.bank?.enabled !== false);
            if (toggleMomo) toggleMomo.checked = Boolean(pm.momo?.enabled !== false);
            if (toggleVnpay) toggleVnpay.checked = Boolean(pm.vnpay?.enabled !== false);

            const bankSelect = document.getElementById('inputPaymentBank');
            const accNoInput = document.getElementById('inputPaymentAccNo');
            const accHolderInput = document.getElementById('inputPaymentAccHolder');
            const syntaxInput = document.getElementById('inputPaymentSyntax');

            if (bankSelect && pm.bank?.bankName) bankSelect.value = pm.bank.bankName;
            if (accNoInput) accNoInput.value = pm.bank?.accountNumber || '';
            if (accHolderInput) accHolderInput.value = pm.bank?.accountHolder || 'CONG TY CP PAWPAL VIET NAM';
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

            const bankName = document.getElementById('inputPaymentBank')?.value || 'vietcombank';
            const accNo = document.getElementById('inputPaymentAccNo')?.value.trim() || '';
            const accHolder = document.getElementById('inputPaymentAccHolder')?.value.trim() || 'CONG TY CP PAWPAL VIET NAM';
            const syntax = document.getElementById('inputPaymentSyntax')?.value.trim() || '';
            if (!accNo || !/^[\d\s-]+$/.test(accNo)) {
                showToast('Số tài khoản QR phải là số và không được để trống.', 'warning');
                return;
            }
            if (!syntax) {
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
                        const cfg = PawpalSettings.state?.systemConfig;
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
        document.getElementById('btnConfigureShipping')?.addEventListener('click', () => {
            const sp = PawpalSettings.state?.systemConfig?.shippingPolicy || {};
            const freeThresholdInput = document.getElementById('inputFreeShippingThreshold');
            const innerFeeInput = document.getElementById('inputInnerCityFee');
            const outerFeeInput = document.getElementById('inputOuterCityFee');
            const expressFeeInput = document.getElementById('inputExpressFee');
            const providerSelect = document.getElementById('inputShippingProvider');
            const shopIdInput = document.getElementById('inputShippingShopId');
            const apiKeyInput = document.getElementById('inputShippingApiKey');

            if (freeThresholdInput) freeThresholdInput.value = sp.freeShippingThreshold || 300000;
            if (innerFeeInput) innerFeeInput.value = sp.innerCityFee || 25000;
            if (outerFeeInput) outerFeeInput.value = sp.outerCityFee || 35000;
            if (expressFeeInput) expressFeeInput.value = sp.expressFee || 45000;
            if (providerSelect && sp.primaryPartner) providerSelect.value = sp.primaryPartner;
            if (shopIdInput) shopIdInput.value = sp.shopId || 'PAWPAL_Q1_STORE';
            if (apiKeyInput) apiKeyInput.value = sp.apiKey || 'ghn_prod_secret_token_12345';

            PawpalSettings.openModal?.('shippingConfigModalOverlay');
        });

        const closeShippingModalHandler = () => { PawpalSettings.closeModal?.('shippingConfigModalOverlay'); };
        document.getElementById('btnCancelShippingModal')?.addEventListener('click', closeShippingModalHandler);
        document.getElementById('btnDismissShippingModal')?.addEventListener('click', closeShippingModalHandler);

        document.getElementById('btnSaveShippingConfig')?.addEventListener('click', () => {
            if (PawpalSettings.state?.isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" trước khi lưu cấu hình vận chuyển.', 'warning');
                return;
            }

            const freeThreshold = parseInt(document.getElementById('inputFreeShippingThreshold')?.value || '300000', 10);
            const innerFee = parseInt(document.getElementById('inputInnerCityFee')?.value || '25000', 10);
            const outerFee = parseInt(document.getElementById('inputOuterCityFee')?.value || '35000', 10);
            const expressFee = parseInt(document.getElementById('inputExpressFee')?.value || '45000', 10);
            const provider = document.getElementById('inputShippingProvider')?.value || 'ghn';
            const shopId = document.getElementById('inputShippingShopId')?.value.trim() || '';
            const apiKey = document.getElementById('inputShippingApiKey')?.value.trim() || '';
            if (!shopId || !apiKey) {
                showToast('Shop ID và API Token là bắt buộc với đối tác vận chuyển.', 'warning');
                return;
            }
            if ([freeThreshold, innerFee, outerFee, expressFee].some(value => !Number.isFinite(value) || value < 0)) {
                showToast('Các mức phí vận chuyển không được là số âm.', 'warning');
                return;
            }

            const partnerNameMap = {
                ghn: 'Giao Hàng Nhanh (GHN Express)',
                ghtk: 'Giao Hàng Tiết Kiệm (GHTK)',
                grab: 'GrabExpress Siêu Tốc'
            };

            PawpalSettings.openImpactConfirmationModal?.({
                title: 'Cấu hình Đơn vị Vận chuyển và Biểu phí',
                desc: 'Cập nhật mức Miễn phí ship và biểu phí giao vận toàn hệ thống.',
                affectedModules: [
                    { name: 'User Portal Shop và Checkout', note: `Áp dụng Miễn phí ship đơn từ ${freeThreshold.toLocaleString('vi-VN')} VNĐ, Phí nội thành ${innerFee.toLocaleString('vi-VN')} VNĐ` },
                    { name: 'Phân hệ Bán hàng (Admin POS)', note: `Đồng bộ đối tác 3PL ${partnerNameMap[provider] || 'GHN'}` }
                ],
                onConfirm: async () => {
                    try {
                        const cfg = PawpalSettings.state?.systemConfig;
                        if (!cfg) throw new Error('Chưa khởi tạo cấu hình hệ thống.');
                        cfg.shippingPolicy = {
                            freeShippingThreshold: freeThreshold,
                            innerCityFee: innerFee,
                            outerCityFee: outerFee,
                            expressFee: expressFee,
                            primaryPartner: provider,
                            partnerName: partnerNameMap[provider] || 'GHN Express',
                            shopId: shopId,
                            isConfigured: Boolean(apiKey || shopId),
                            apiKey: apiKey ? '••••••••' : ''
                        };
                        await PawpalSettings.persistSystemConfig?.(cfg);
                        PawpalSettings.closeModal?.('shippingConfigModalOverlay');

                        await logSystemAudit('UPDATE', 'shipping', `Cập nhật biểu phí giao hàng: Freeship từ ${freeThreshold.toLocaleString('vi-VN')} VNĐ, Đối tác ${partnerNameMap[provider] || 'GHN'}`);
                        await PawpalSettings.loadSettingsModuleData?.();
                        renderSystemConfigCards();
                        PawpalSettings.subtabs.audit?.renderAuditLogs?.();
                        showToast('Đã lưu cấu hình vận chuyển và đồng bộ sang User Portal và Bán hàng thành công!', 'success');
                    } catch (e) {
                        console.error('[Settings] Lưu cấu hình vận chuyển thất bại:', e);
                        showToast(`Không thể lưu cấu hình vận chuyển: ${e?.message || 'Lỗi cơ sở dữ liệu'}`, 'danger');
                    }
                }
            });
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

            if (wkOpenInput) wkOpenInput.value = oh.weekday?.open || '08:00';
            if (wkCloseInput) wkCloseInput.value = oh.weekday?.close || '20:00';
            if (weOpenInput) weOpenInput.value = oh.weekend?.open || '08:00';
            if (weCloseInput) weCloseInput.value = oh.weekend?.close || '21:00';

            const checkInInput = document.getElementById('inputHotelCheckIn');
            const checkOutInput = document.getElementById('inputHotelCheckOut');
            const hotelLateFeeInput = document.getElementById('inputHotelLateFee');

            if (checkInInput) checkInInput.value = hr.checkInTime || '14:00';
            if (checkOutInput) checkOutInput.value = hr.checkOutTime || '12:00';
            if (hotelLateFeeInput) hotelLateFeeInput.value = hr.lateCheckOutFeePerHalfDay || 100000;

            const slotCapInput = document.getElementById('inputSlotCapacity');
            const freeCancelInput = document.getElementById('inputFreeCancelHours');
            const lateCancelFeeInput = document.getElementById('inputLateCancelFee');
            const allowPickStaffSelect = document.getElementById('inputAllowPickStaff');

            if (slotCapInput) slotCapInput.value = bp.slotCapacityMax || 4;
            if (freeCancelInput) freeCancelInput.value = bp.freeCancelHours || 4;
            if (lateCancelFeeInput) lateCancelFeeInput.value = bp.lateCancelFee || 50000;
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

            const wkOpen = document.getElementById('inputWeekdayOpen')?.value || '08:00';
            const wkClose = document.getElementById('inputWeekdayClose')?.value || '20:00';
            const weOpen = document.getElementById('inputWeekendOpen')?.value || '08:00';
            const weClose = document.getElementById('inputWeekendClose')?.value || '21:00';

            const checkIn = document.getElementById('inputHotelCheckIn')?.value || '14:00';
            const checkOut = document.getElementById('inputHotelCheckOut')?.value || '12:00';
            const hotelLateFee = parseInt(document.getElementById('inputHotelLateFee')?.value || '100000', 10);

            const slotCapacity = parseInt(document.getElementById('inputSlotCapacity')?.value || '4', 10);
            const freeHours = parseInt(document.getElementById('inputFreeCancelHours')?.value || '4', 10);
            const lateFee = parseInt(document.getElementById('inputLateCancelFee')?.value || '50000', 10);
            const allowPickStaff = document.getElementById('inputAllowPickStaff')?.value === 'yes';

            const toMinutes = (value) => {
                const [hour, minute] = String(value).split(':').map(Number);
                return hour * 60 + minute;
            };
            if (toMinutes(wkOpen) >= toMinutes(wkClose) || toMinutes(weOpen) >= toMinutes(weClose)) {
                showToast('Giờ mở cửa phải sớm hơn giờ đóng cửa.', 'warning');
                return;
            }
            if (!Number.isInteger(slotCapacity) || slotCapacity <= 0) {
                showToast('Công suất phải là số nguyên dương.', 'warning');
                return;
            }
            if ([hotelLateFee, freeHours, lateFee].some(value => !Number.isFinite(value) || value < 0)) {
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
                        const cfg = PawpalSettings.state?.systemConfig;
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
                            includedMealsPerDay: cfg.hotelRules?.includedMealsPerDay ?? 3,
                            cameraAccessEnabled: cfg.hotelRules?.cameraAccessEnabled ?? true
                        };
                        cfg.bookingPolicy = {
                            freeCancelHours: freeHours,
                            lateCancelFee: lateFee,
                            allowPickStaff: allowPickStaff,
                            slotCapacityMax: slotCapacity,
                            timeSlots: cfg.bookingPolicy?.timeSlots || ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
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
            const isGhnOk = Boolean(cfg.shippingPolicy?.shopId && (cfg.shippingPolicy?.apiKey || cfg.shippingPolicy?.isConfigured));
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
            const currentRole = (sessionStorage.getItem('pawpal_admin_system_role') || '').toUpperCase();
            if (PawpalSettings.state?.isSafeModeLocked && currentRole !== 'ADMIN' && currentRole !== 'MANAGER') {
                showToast('Chỉ Quản trị viên (Admin/Manager) mới có quyền mở khóa an toàn hệ thống.', 'danger');
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
