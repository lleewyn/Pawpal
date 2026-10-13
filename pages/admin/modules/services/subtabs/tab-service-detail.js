// tab-service-detail.js - Subtab Hồ sơ ca dịch vụ 360° Pawpal-er
(function() {
    'use strict';

    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    let currentEditingCarelogStepIdx = null;
    let editCarelogStepPhotosTemp = [];

    function openBookingDetail(bookingId) {
        PawpalServices.state.selectedBookingId = bookingId;
        sessionStorage.setItem('pawpal_admin_service_selected_id', bookingId);
        if (PawpalServices.switchSubtab) {
            PawpalServices.switchSubtab('tab-service-detail');
        }
    }

    function renderBookingDetail(bookingId) {
        const bookingsData = PawpalServices.state?.bookingsData || [];
        const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId) || bookingsData[0];
        if (!booking) return;

        PawpalServices.state.selectedBookingId = booking.id;
        sessionStorage.setItem('pawpal_admin_service_selected_id', booking.id);

        const formatCurrency = PawpalServices.formatCurrency || (num => `${num} đ`);
        const getStatusBadge = PawpalServices.getStatusBadge || (st => `<span class="admin-badge">${st}</span>`);

        // Headline và Meta
        const codeEl = document.getElementById('detailBookingCode');
        const metaEl = document.getElementById('detailBookingMeta');
        if (codeEl) codeEl.textContent = booking.id;
        if (metaEl) {
            if (booking.category === 'Hotel') {
                metaEl.textContent = `Lưu trú: ${booking.checkInDate || booking.date} ➔ ${booking.checkOutDate || 'Chưa cập nhật'} (${booking.nights || 'Chưa cập nhật'} đêm) | Phòng: ${booking.roomCode || 'Chưa cập nhật'} | Cơ sở: ${booking.branch || 'PawPal Quận 1'}`;
            } else if (booking.category === 'Taxi') {
                const shortPickup = booking.pickupAddress ? (booking.pickupAddress.length > 22 ? booking.pickupAddress.substring(0, 22) + '...' : booking.pickupAddress) : 'Đón tận nơi';
                metaEl.textContent = `Giờ đón: ${booking.time} - ${booking.date} | ${booking.tripType || '2 chiều'} | Lộ trình: ${shortPickup} ➔ Q.1 | Cơ sở: ${booking.branch || 'PawPal Quận 1'}`;
            } else {
                metaEl.textContent = `Thời gian hẹn: ${booking.time} - ${booking.date} | Cơ sở: ${booking.branch || 'PawPal Quận 1'}`;
            }
        }

        // Cảnh báo an toàn Pet Alert
        const petAlertBanner = document.getElementById('detailPetAlertBanner');
        if (petAlertBanner) {
            if (booking.petAlert) {
                petAlertBanner.style.display = 'block';
                petAlertBanner.textContent = `CẢNH BÁO AN TOÀN CHO BÉ: ${booking.petAlert}`;
            } else {
                petAlertBanner.style.display = 'none';
            }
        }

        // Nút thao tác một chạm theo trạng thái
        const actionButtonsContainer = document.getElementById('detailBookingActionButtons');
        if (actionButtonsContainer) {
            actionButtonsContainer.innerHTML = '';
            if (booking.status === 'pending') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-primary btn-action-confirm" data-booking-id="${booking.id}">Xác nhận lịch</button>
                    <button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch hẹn</button>
                `;
            } else if (booking.status === 'confirmed') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-primary btn-action-intake" data-booking-id="${booking.id}">Tiếp nhận bé</button>
                    <button type="button" class="admin-btn admin-btn-secondary btn-action-change" data-booking-id="${booking.id}">Đổi KTV</button>
                    <button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch</button>
                `;
            } else if (booking.status === 'in_progress') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-primary btn-action-complete" data-booking-id="${booking.id}">Hoàn thành dịch vụ</button>
                    <button type="button" class="admin-btn admin-btn-secondary btn-action-change" data-booking-id="${booking.id}">Đổi KTV</button>
                    <button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</button>
                `;
            } else if (booking.status === 'completed') {
                actionButtonsContainer.innerHTML = `
                    <button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</button>
                `;
            }

            const btnConfirm = actionButtonsContainer.querySelector('.btn-action-confirm');
            const btnIntake = actionButtonsContainer.querySelector('.btn-action-intake');
            const btnComplete = actionButtonsContainer.querySelector('.btn-action-complete');
            const btnCancel = actionButtonsContainer.querySelector('.btn-action-cancel');
            const btnChange = actionButtonsContainer.querySelector('.btn-action-change');
            const btnComplaint = actionButtonsContainer.querySelector('.btn-action-complaint');

            if (btnConfirm) {
                btnConfirm.addEventListener('click', () => {
                    const confirmAction = () => {
                        if (PawpalServices.subtabs.bookings?.updateBookingStatus) {
                            PawpalServices.subtabs.bookings.updateBookingStatus(booking.id, 'confirmed');
                        }
                        renderBookingDetail(booking.id);
                    };

                    if (typeof PawpalServices.showConfirmModal === 'function') {
                        PawpalServices.showConfirmModal({
                            title: 'Xác nhận lịch hẹn dịch vụ',
                            message: `Bạn có chắc chắn muốn xác nhận tiếp nhận lịch hẹn ${booking.id} của bé ${booking.pet_name || 'cưng'} không?`,
                            acceptText: 'Xác nhận lịch',
                            onAccept: confirmAction
                        });
                    } else {
                        confirmAction();
                    }
                });
            }
            if (btnIntake) {
                btnIntake.addEventListener('click', () => {
                    if (PawpalServices.subtabs.bookings?.openIntakeModal) {
                        PawpalServices.subtabs.bookings.openIntakeModal(booking.id, 'intake');
                    }
                });
            }
            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    if (PawpalServices.subtabs.bookings?.openCompleteBookingModal) {
                        PawpalServices.subtabs.bookings.openCompleteBookingModal(booking.id);
                    }
                });
            }
            if (btnCancel) {
                btnCancel.addEventListener('click', () => {
                    if (PawpalServices.subtabs.bookings?.openCancelModal) {
                        PawpalServices.subtabs.bookings.openCancelModal(booking.id);
                    }
                });
            }
            if (btnChange) {
                btnChange.addEventListener('click', () => {
                    if (PawpalServices.subtabs.bookings?.openChangeStaffModal) {
                        PawpalServices.subtabs.bookings.openChangeStaffModal(booking.id);
                    }
                });
            }
            if (btnComplaint) {
                btnComplaint.addEventListener('click', () => {
                    sessionStorage.setItem('pawpal_admin_complaint_from_booking', booking.id);
                    window.location.hash = '#tab-complaint-services';
                    const complaintNav = document.querySelector('.admin-nav-item[data-module="Khiếu nại"]');
                    if (complaintNav) complaintNav.click();
                });
            }
        }

        // Gắn nút đổi KTV cạnh dòng thông tin KTV
        const btnQuickChangeStaff = document.getElementById('btnDetailQuickChangeStaff');
        if (btnQuickChangeStaff) {
            btnQuickChangeStaff.onclick = () => {
                if (PawpalServices.subtabs.bookings?.openChangeStaffModal) {
                    PawpalServices.subtabs.bookings.openChangeStaffModal(booking.id);
                }
            };
        }

        // Cập nhật thông tin dịch vụ
        const statusText = document.getElementById('detailBookingStatusText');
        const staffText = document.getElementById('detailBookingStaffText');
        const serviceText = document.getElementById('detailBookingServiceText');
        const durationText = document.getElementById('detailBookingDurationText');
        const categoryText = document.getElementById('detailBookingCategoryText');
        const addonsText = document.getElementById('detailBookingAddonsText');
        const customerNote = document.getElementById('detailBookingCustomerNote');

        if (statusText) statusText.innerHTML = getStatusBadge(booking.status);
        if (staffText) staffText.textContent = booking.staff || 'Chưa phân công';
        if (serviceText) serviceText.textContent = booking.serviceName;
        if (durationText) durationText.textContent = booking.duration;
        if (categoryText) categoryText.textContent = booking.categoryName;
        if (addonsText) addonsText.textContent = booking.addonPrice > 0 ? `Gói chăm sóc mở rộng (${formatCurrency(booking.addonPrice)})` : 'Không có';
        if (customerNote) customerNote.textContent = booking.customerNote || 'Không có';

        // Cập nhật Khối đặc thù theo loại dịch vụ (Hotel / Taxi / Spa)
        const specialFieldsContainer = document.getElementById('detailSpecialServiceFields');
        if (specialFieldsContainer) {
            if (booking.category === 'Hotel') {
                specialFieldsContainer.innerHTML = `
                    <div style="font-size: 13px; font-weight: 700; color: #236B48; margin-bottom: 8px;">Thông tin lưu trú Khách sạn thú cưng (Pet Hotel):</div>
                    <div class="info-grid-2col">
                        <div class="info-pair">
                            <span class="info-label">Thời gian lưu trú:</span>
                    <span class="info-value" style="font-weight: 600; color: #236B48;">${booking.checkInDate || booking.date} (${booking.checkInTime || '08:00'}) ➔ ${booking.checkOutDate || 'Chưa cập nhật'} (${booking.checkOutTime || 'Chưa cập nhật'})</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Tổng thời lượng:</span>
                            <span class="info-value"><span class="admin-badge badge-warning">${booking.nights || 3} đêm lưu trú</span></span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Loại phòng và Chuồng:</span>
                            <span class="info-value" style="font-weight: 600;">${booking.roomType || 'Phòng Deluxe (Máy lạnh 24/7)'} (Mã: ${booking.roomCode || 'DLX-04'})</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Camera phòng 24/7:</span>
                            <span class="info-value" style="color: #0369A1; font-weight: 600;">${booking.cameraCode || 'CAM-HOTEL-04'} (Trực tuyến)</span>
                        </div>
                        <div class="info-pair" style="grid-column: span 2;">
                            <span class="info-label">Khẩu phần dinh dưỡng:</span>
                            <span class="info-value" style="font-weight: 500;">${booking.dietPlan || 'Pate tươi dinh dưỡng + Thịt bò luộc (2 bữa/ngày)'}</span>
                        </div>
                    </div>
                `;
            } else if (booking.category === 'Taxi') {
                const shortPickup = booking.pickupAddress || '45 Lê Duẩn, P. Bến Nghé, Quận 1';
                const shortDropoff = booking.dropoffAddress || booking.branch || 'PawPal Chi nhánh Quận 1';
                specialFieldsContainer.innerHTML = `
                    <div style="font-size: 13px; font-weight: 700; color: #236B48; margin-bottom: 8px;">Thông tin điều phối Pet Taxi đưa đón:</div>
                    <div class="info-grid-2col">
                        <div class="info-pair" style="grid-column: span 2;">
                            <span class="info-label">Lộ trình đưa đón:</span>
                            <span class="info-value" style="font-weight: 600; color: #236B48;">${shortPickup} ➔ ${shortDropoff}</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Hình thức chuyến:</span>
                            <span class="info-value" style="font-weight: 600;">${booking.tripType || 'Đưa đón khứ hồi 2 chiều'}</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Cự ly ước tính:</span>
                            <span class="info-value" style="font-weight: 600;">${booking.distanceKm || 4.2} km</span>
                        </div>
                    </div>
                `;
            } else {
                specialFieldsContainer.innerHTML = '';
            }
        }

        // Cập nhật Thông tin khách hàng & thú cưng
        const custNameEl = document.getElementById('detailCustomerName');
        const custPhoneEl = document.getElementById('detailCustomerPhone');
        const petNameEl = document.getElementById('detailPetName');
        const petBreedEl = document.getElementById('detailPetBreed');
        const petWeightEl = document.getElementById('detailPetWeight');
        const petAllergyEl = document.getElementById('detailPetAllergy');

        if (custNameEl) custNameEl.textContent = booking.customerName;
        if (custPhoneEl) custPhoneEl.textContent = booking.phone;
        if (petNameEl) petNameEl.textContent = booking.petName;
        if (petBreedEl) petBreedEl.textContent = booking.petBreed || 'Chó';
        if (petWeightEl) petWeightEl.textContent = booking.petWeight || '5.0 kg';
        if (petAllergyEl) petAllergyEl.textContent = booking.petAlert || 'Không có';

        // Gắn link nhảy sang Khách hàng và Thú cưng
        const jumpCustBtn = document.getElementById('btnDetailJumpCustomer');
        if (jumpCustBtn) {
            jumpCustBtn.onclick = () => {
                sessionStorage.setItem('pawpal_admin_customer_id', booking.userId || 'CUST-001');
                sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-profile');
                window.location.hash = '#tab-profile';
                const custNav = document.querySelector('.admin-nav-item[data-module="Khách hàng"]');
                if (custNav) custNav.click();
            };
        }

        const jumpPetBtn = document.getElementById('btnDetailJumpPet');
        if (jumpPetBtn) {
            jumpPetBtn.onclick = () => {
                sessionStorage.setItem('pawpal_admin_pet_id', booking.petId || 'PET-001');
                sessionStorage.setItem('pawpal_admin_pet_name', booking.petName);
                sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-profile');
                window.location.hash = '#tab-pet-profile';
                const petNav = document.querySelector('.admin-nav-item[data-module="Thú cưng"]');
                if (petNav) petNav.click();
            };
        }

        // Cập nhật Khối 2B: Biên bản tiếp nhận an toàn (Zero-Claim)
        const intakeEmptyNotice = document.getElementById('detailIntakeEmptyNotice');
        const intakeContentBox = document.getElementById('detailIntakeContentContainer');
        const btnEditIntake = document.getElementById('btnEditIntakeSafety');

        if (!booking.intakeRecord) {
            if (intakeEmptyNotice) intakeEmptyNotice.style.display = 'block';
            if (intakeContentBox) intakeContentBox.style.display = 'none';
        } else {
            if (intakeEmptyNotice) intakeEmptyNotice.style.display = 'none';
            if (intakeContentBox) intakeContentBox.style.display = 'block';

            const intake = booking.intakeRecord || {};
            const actualWeight = intake.actualWeight || parseFloat(booking.petWeight) || 4.2;
            const origWeight = parseFloat(booking.originalWeight || 4.2);
            const diffWeight = Math.round((actualWeight - origWeight) * 10) / 10;

            const actualWeightEl = document.getElementById('detailIntakeActualWeight');
            const evalWeightEl = document.getElementById('detailIntakeWeightEval');
            const skinCoatEl = document.getElementById('detailIntakeSkinCoat');
            const eyesEarsEl = document.getElementById('detailIntakeEyesEarsNose');
            const woundsEl = document.getElementById('detailIntakeWounds');
            const temperamentEl = document.getElementById('detailIntakeTemperament');
            const staffIntakeEl = document.getElementById('detailIntakeStaff');
            const belongingsEl = document.getElementById('detailIntakeBelongings');

            if (actualWeightEl) actualWeightEl.textContent = `${actualWeight} kg`;
            if (evalWeightEl) {
                if (diffWeight >= 0.5) {
                    evalWeightEl.innerHTML = `<span style="color: #D97706; font-weight: 600;">Vượt ${diffWeight} kg (+50k phụ phí)</span>`;
                } else if (diffWeight <= -0.5) {
                    evalWeightEl.innerHTML = `<span style="color: #2563EB;">Nhẹ hơn ${Math.abs(diffWeight)} kg so với đăng ký</span>`;
                } else {
                    evalWeightEl.innerHTML = `<span style="color: #16A34A; font-weight: 600;">Đúng khung giá đăng ký</span>`;
                }
            }
            if (skinCoatEl) skinCoatEl.textContent = intake.skinCoat || 'Sạch sẽ, không ve rận';
            if (eyesEarsEl) eyesEarsEl.textContent = intake.eyesEars || 'Bình thường';
            if (woundsEl) woundsEl.textContent = intake.wounds || 'Không có vết thương cũ';
            if (temperamentEl) temperamentEl.textContent = intake.temperament || 'Ngoan hiền';
            if (staffIntakeEl) staffIntakeEl.textContent = `${booking.staff || 'Ngọc Anh'} (Tiếp nhận tại quầy)`;

            const bNote = intake.belongingsNote || '';
            const bItems = Array.isArray(intake.belongings) && intake.belongings.length > 0 ? intake.belongings.join(', ') : '';
            if (belongingsEl) belongingsEl.textContent = bNote || bItems || 'Không có';

            // Ảnh đối chứng Zero-Claim
            const proofGrid = document.getElementById('detailIntakeProofGrid');
            if (proofGrid) {
                const photos = Array.isArray(intake.proofPhotos) && intake.proofPhotos.length > 0
                    ? intake.proofPhotos
                    : ['https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=150&auto=format&fit=crop&q=80'];
                proofGrid.innerHTML = photos.map(url => `
                    <div class="intake-proof-item" style="display: inline-block; margin-right: 8px;">
                        <img src="${url}" alt="Ảnh đối chứng" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral); cursor: pointer;">
                    </div>
                `).join('');
                proofGrid.querySelectorAll('img').forEach((img, idx) => {
                    img.addEventListener('click', () => {
                        if (openCarelogPhotoPreview) openCarelogPhotoPreview(img.src, `Ảnh đối chứng tiếp nhận ${idx + 1}`);
                    });
                });
            }
        }

        if (btnEditIntake) {
            btnEditIntake.onclick = () => {
                if (PawpalServices.subtabs.bookings?.openIntakeModal) {
                    PawpalServices.subtabs.bookings.openIntakeModal(booking.id, 'edit');
                }
            };
        }

        const btnPrintIntake = document.getElementById('btnPrintIntakeWaiver');
        if (btnPrintIntake) {
            btnPrintIntake.onclick = () => {
                openIntakeWaiverModal(booking);
            };
        }

        const btnNotifyPickup = document.getElementById('btnNotifyCustomerPickup');
        if (btnNotifyPickup) {
            btnNotifyPickup.onclick = () => {
                openNotifyPickupModal(booking);
            };
        }

        // Cập nhật Khối tài chính và Bảng kê chi phí
        renderDetailFinancials(booking);

        // Timeline tiến trình 4 giai đoạn
        renderDetailTimeline(booking);

        // Care-Log nhật ký từng bước dịch vụ
        renderDetailCareLogs(booking);
    }

    const ACCOMPANYING_SERVICE_PRESETS = [
        { cat: 'spa', name: 'Tắm thuốc y tế trị ve rận nấm da', price: 80000 },
        { cat: 'spa', name: 'Vệ sinh tai nấm và viêm chuyên sâu', price: 50000 },
        { cat: 'spa', name: 'Cắt tỉa móng và mài mịn chống xước', price: 40000 },
        { cat: 'spa', name: 'Nhuộm tai và đuôi thời trang organic', price: 150000 },
        { cat: 'hotel', name: 'Khách sạn thú cưng: Thêm bữa ăn tươi dinh dưỡng', price: 35000 },
        { cat: 'hotel', name: 'Khách sạn thú cưng: Dắt đi dạo công viên 30 phút', price: 50000 },
        { cat: 'taxi', name: 'Pet Taxi: Xe đưa đón tận nơi 1 chiều về nhà', price: 70000 },
        { cat: 'taxi', name: 'Pet Taxi: Xe đưa đón khứ hồi 2 chiều', price: 120000 }
    ];

    function renderDetailFinancials(booking) {
        const formatCurrency = PawpalServices.formatCurrency || (num => `${num.toLocaleString('vi-VN')} đ`);
        const basePrice = booking.price || booking.basePrice || 250000;

        // Dịch vụ đi cùng (Accompanying Services)
        const accompanyingList = booking.accompanyingServices || [];
        const accompanyingTotal = accompanyingList.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const accompanyingListEl = document.getElementById('detailAccompanyingServicesList');
        if (accompanyingListEl) {
            accompanyingListEl.innerHTML = accompanyingList.map((item, idx) => `
                <div class="summary-row" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px;">
                    <div>
                        <span style="font-weight: 500; color: #236B48;">+ ${item.name}</span>
                        ${item.staff ? `<span style="font-size: 11.5px; color: var(--text-muted); margin-left: 6px;">(KTV: ${item.staff})</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; color: var(--text-main);">${formatCurrency(item.price)}</span>
                        <button type="button" class="btn-del-accompanying" data-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor: pointer; font-size: 12px; padding: 0 4px;" title="Xóa">✕</button>
                    </div>
                </div>
            `).join('');

            accompanyingListEl.querySelectorAll('.btn-del-accompanying').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    if (!isNaN(idx)) {
                        accompanyingList.splice(idx, 1);
                        booking.accompanyingServices = accompanyingList;
                        renderDetailFinancials(booking);
                        PawpalServices.showToast('Đã xóa dịch vụ đi cùng!');
                    }
                });
            });
        }

        // Phụ phí (Surcharges)
        const surcharges = booking.surcharges || [];
        const surchargeTotal = surcharges.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) + (booking.surchargePrice || 0);
        const surchargeListEl = document.getElementById('detailSurchargeBreakdownList');
        if (surchargeListEl) {
            surchargeListEl.innerHTML = surcharges.map((s, idx) => `
                <div class="summary-row" style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 13px;">
                    <div>
                        <span style="font-weight: 500; color: #D97706;">+ ${s.name}</span>
                        ${s.reason ? `<div style="font-size: 11px; color: var(--text-muted);">${s.reason}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; color: var(--text-main);">${formatCurrency(s.amount)}</span>
                        <button type="button" class="btn-del-surcharge-item" data-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor: pointer; font-size: 12px; padding: 0 4px;" title="Xóa">✕</button>
                    </div>
                </div>
            `).join('');

            surchargeListEl.querySelectorAll('.btn-del-surcharge-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    if (!isNaN(idx)) {
                        surcharges.splice(idx, 1);
                        booking.surcharges = surcharges;
                        renderDetailFinancials(booking);
                        PawpalServices.showToast('Đã xóa phụ phí!');
                    }
                });
            });
        }

        const voucherDiscount = booking.voucherDiscount || 0;
        const total = basePrice + accompanyingTotal + surchargeTotal - voucherDiscount;
        booking.total = total;

        const baseEl = document.getElementById('detailCostBase') || document.getElementById('detailPriceBase');
        const discEl = document.getElementById('detailCostDiscount') || document.getElementById('detailPriceVoucher');
        const totalEl = document.getElementById('detailCostTotal') || document.getElementById('detailPriceTotal');
        const payStatusEl = document.getElementById('detailPaymentStatus');

        if (baseEl) baseEl.textContent = formatCurrency(basePrice);
        if (discEl) discEl.textContent = voucherDiscount > 0 ? `-${formatCurrency(voucherDiscount)}` : '-0 đ';
        if (totalEl) totalEl.textContent = formatCurrency(total);
        if (payStatusEl) payStatusEl.textContent = booking.paymentStatus || 'Chưa thanh toán (Thanh toán tại quầy)';
    }

    function renderDetailTimeline(booking) {
        const timelineContainer = document.getElementById('detailTimelineContainer');
        if (!timelineContainer) return;

        const timelineData = booking.timeline || [];

        timelineContainer.innerHTML = timelineData.map((step, idx) => `
            <div class="timeline-step-item ${step.done ? 'step-done' : ''}">
                <div class="step-marker">${step.done ? '✓' : (idx + 1)}</div>
                <div class="step-info">
                    <div class="step-title">${step.title} <span class="step-time">${step.time || ''}</span></div>
                    <div class="step-desc">${step.desc || ''}</div>
                </div>
            </div>
        `).join('');
    }

    let editCarelogPhotosTemp = [];

    // Mở Modal 6A: Xem ảnh phóng to (Lightbox)
    function openCarelogPhotoPreview(imgUrl, caption = '') {
        const modal = document.getElementById('modalCarelogPhotoPreview');
        const img = document.getElementById('previewPhotoModalImg');
        const captionEl = document.getElementById('previewPhotoModalCaption');
        if (!modal || !img) return;
        img.src = imgUrl;
        if (captionEl) captionEl.textContent = caption || 'Ảnh quy trình chăm sóc thực tế tại PawPal';
        modal.classList.add('active');
    }

    // Mở Modal 6B: Chỉnh sửa bước quy trình chăm sóc
    function openEditCarelogStepModal(stepIdx) {
        const bookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
        const bookingsData = PawpalServices.state?.bookingsData || [];
        const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
        if (!booking) return;

        const modal = document.getElementById('modalEditCarelogStep');
        if (!modal) return;

        const logs = booking.carelogs || booking.careLogs || [];
        const step = logs[stepIdx];
        if (!step) return;

        const metaEl = document.getElementById('editCarelogModalMeta');
        if (metaEl) metaEl.textContent = `Mã ca: ${booking.id} • Bé: ${booking.petName || 'Bé cưng'}`;

        const idxHidden = document.getElementById('editCarelogStepIndexHidden');
        if (idxHidden) idxHidden.value = stepIdx;

        const titleInp = document.getElementById('editCarelogStepTitle');
        if (titleInp) titleInp.value = step.description || step.step_name || '';

        const staffSelect = document.getElementById('editCarelogStepStaff');
        if (staffSelect) {
            const staffList = PawpalServices.state?.liveStaffList || [];
            if (staffList.length > 0 && staffSelect.options.length <= 1) {
                staffList.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.full_name;
                    opt.textContent = s.full_name;
                    staffSelect.appendChild(opt);
                });
            }
            staffSelect.value = step.ktv || booking.staff || '';
        }

        const timeInp = document.getElementById('editCarelogStepTime');
        if (timeInp) {
            timeInp.value = step.recorded_at ? step.recorded_at.substring(11, 16) : (new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
        }

        const descInp = document.getElementById('editCarelogStepDesc');
        if (descInp) descInp.value = step.note || '';

        const doneCheck = document.getElementById('editCarelogStepDone');
        if (doneCheck) doneCheck.checked = Boolean(step.completed);

        editCarelogPhotosTemp = Array.isArray(step.images) ? [...step.images] : [];
        renderEditCarelogPhotosPreview();

        modal.setAttribute('data-step-idx', stepIdx);
        modal.classList.add('active');
    }

    function renderEditCarelogPhotosPreview() {
        const previewContainer = document.getElementById('editCarelogPhotosPreviewList');
        if (!previewContainer) return;
        previewContainer.innerHTML = '';
        editCarelogPhotosTemp.forEach((url, i) => {
            const item = document.createElement('div');
            item.className = 'intake-proof-item';
            item.style.position = 'relative';
            item.innerHTML = `
                <img src="${url}" alt="Ảnh bước" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral); cursor: pointer;">
                <span class="btn-del-proof" style="position: absolute; top: -5px; right: -5px; background: #DC2626; color: #fff; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</span>
            `;
            item.querySelector('img').addEventListener('click', () => openCarelogPhotoPreview(url, 'Ảnh bước chăm sóc'));
            item.querySelector('.btn-del-proof').addEventListener('click', () => {
                editCarelogPhotosTemp.splice(i, 1);
                renderEditCarelogPhotosPreview();
            });
            previewContainer.appendChild(item);
        });
    }

    function renderDetailCareLogs(booking) {
        const carelogsContainer = document.getElementById('detailCarelogList') || document.getElementById('detailCareLogsContainer');
        if (!carelogsContainer) return;

        let logs = booking.carelogs || booking.careLogs || [];
        if (!logs.length) {
            carelogsContainer.innerHTML = '<div style="color:var(--text-muted);padding:12px 0;">Chưa có nhật ký chăm sóc cho ca dịch vụ này.</div>';
            return;
        }

        carelogsContainer.innerHTML = logs.map((log, idx) => `
            <div class="carelog-step-card" data-step-idx="${idx}" style="cursor: pointer; padding: 10px 12px; background: #fff; border: 1px solid var(--border-neutral); border-radius: var(--admin-radius); margin-bottom: 8px;">
                <div class="carelog-step-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="carelog-step-title" style="font-weight: 600; color: #236B48; font-size: 13px;">
                        <span class="step-number">${idx + 1}.</span> ${log.description || log.step_name || 'Bước thực hiện'}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="admin-badge ${log.completed ? 'badge-success' : 'badge-neutral'}">${log.completed ? 'Đã xong' : 'Đang làm'}</span>
                        <span style="font-size: 11.5px; color: #236B48; font-weight: 500;">Sửa</span>
                    </div>
                </div>
                <div class="carelog-step-body" style="margin-top: 4px;">
                    <div class="carelog-meta-row" style="font-size: 11.5px; color: var(--text-muted); display: flex; gap: 12px;">
                        <span>KTV: <strong>${log.ktv || booking.staff || 'Chưa phân công'}</strong></span>
                        <span>Thời gian: ${log.recorded_at ? log.recorded_at.substring(11, 16) : '—'}</span>
                    </div>
                    ${log.note ? `<div style="font-size: 12px; color: var(--text-main); margin-top: 4px;">${log.note}</div>` : ''}
                    ${(log.images && log.images.length > 0) ? `
                        <div class="carelog-step-images" style="display: flex; gap: 6px; margin-top: 6px;">
                            ${log.images.map(img => `
                                <img src="${img}" alt="Ảnh bước" class="carelog-thumb-clickable" data-img-src="${img}" style="width: 48px; height: 48px; object-fit: cover; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral); cursor: pointer;">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Gắn sự kiện nhấp vào ảnh thumbnail để mở Modal 6A (Lightbox)
        carelogsContainer.querySelectorAll('.carelog-thumb-clickable').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                const src = img.getAttribute('data-img-src');
                openCarelogPhotoPreview(src, 'Ảnh quy trình chăm sóc thực tế tại tiệm');
            });
        });

        // Gắn sự kiện nhấp vào thẻ bước để mở Modal 6B (Chỉnh sửa bước)
        carelogsContainer.querySelectorAll('.carelog-step-card').forEach(card => {
            card.addEventListener('click', () => {
                const stepIdx = parseInt(card.getAttribute('data-step-idx'), 10);
                if (!isNaN(stepIdx)) {
                    openEditCarelogStepModal(stepIdx);
                }
            });
        });
    }

    function initDetailSubtab() {
        const initialBookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
        renderBookingDetail(initialBookingId);

        // Nút mở Modal 5 (Thêm phụ phí)
        const btnAddSurcharge = document.getElementById('btnOpenAddSurchargeModal');
        if (btnAddSurcharge) {
            btnAddSurcharge.addEventListener('click', () => {
                const bId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
                if (PawpalServices.subtabs?.bookings?.openSurchargeModal) {
                    PawpalServices.subtabs.bookings.openSurchargeModal(bId);
                } else {
                    const modal = document.getElementById('modalAddSurcharge');
                    if (modal) modal.classList.add('active');
                }
            });
        }

        // ====================================================================
        // MODAL 6B: LẮNG NGHE SỰ KIỆN CHỈNH SỬA BƯỚC QUY TRÌNH CHĂM SÓC
        // ====================================================================
        const btnSubmitEditCarelog = document.getElementById('btnSubmitEditCarelogStep');
        if (btnSubmitEditCarelog) {
            btnSubmitEditCarelog.addEventListener('click', () => {
                const modal = document.getElementById('modalEditCarelogStep');
                const stepIdx = parseInt(document.getElementById('editCarelogStepIndexHidden')?.value, 10);
                const title = document.getElementById('editCarelogStepTitle')?.value.trim();
                const staff = document.getElementById('editCarelogStepStaff')?.value;
                const time = document.getElementById('editCarelogStepTime')?.value.trim();
                const desc = document.getElementById('editCarelogStepDesc')?.value.trim();
                const done = document.getElementById('editCarelogStepDone')?.checked;

                if (!title) {
                    PawpalServices.showToast('Vui lòng nhập tên bước chăm sóc!', 'warning');
                    document.getElementById('editCarelogStepTitle')?.focus();
                    return;
                }

                const bookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (booking && !isNaN(stepIdx)) {
                    const logs = booking.carelogs || booking.careLogs || [];
                    if (logs[stepIdx]) {
                        logs[stepIdx].description = title;
                        logs[stepIdx].step_name = title;
                        logs[stepIdx].ktv = staff || booking.staff;
                        logs[stepIdx].recorded_at = `2026-10-12T${time || '10:00'}:00`;
                        logs[stepIdx].note = desc;
                        logs[stepIdx].completed = Boolean(done);
                        logs[stepIdx].images = [...editCarelogPhotosTemp];
                    }
                    renderDetailCareLogs(booking);
                    PawpalServices.showToast('Đã cập nhật bước quy trình chăm sóc thành công!');
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        // Nút Xóa bước chăm sóc
        const btnDeleteCarelog = document.getElementById('btnDeleteCarelogStep');
        if (btnDeleteCarelog) {
            btnDeleteCarelog.addEventListener('click', () => {
                const modal = document.getElementById('modalEditCarelogStep');
                const stepIdx = parseInt(document.getElementById('editCarelogStepIndexHidden')?.value, 10);
                const bookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (booking && !isNaN(stepIdx)) {
                    const logs = booking.carelogs || booking.careLogs || [];
                    logs.splice(stepIdx, 1);
                    renderDetailCareLogs(booking);
                    PawpalServices.showToast('Đã xóa bước quy trình chăm sóc!');
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        // Nút thêm ảnh vào bước
        const btnAddPhoto = document.getElementById('btnEditCarelogAddPhoto');
        const photoFileInp = document.getElementById('editCarelogFileInput');
        if (btnAddPhoto && photoFileInp) {
            btnAddPhoto.addEventListener('click', () => photoFileInp.click());
            photoFileInp.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                    const url = URL.createObjectURL(file);
                    editCarelogPhotosTemp.push(url);
                });
                renderEditCarelogPhotosPreview();
            });
        }

        // ====================================================================
        // MODAL 7: THÊM DỊCH VỤ ĐI CÙNG VÀO CA
        // ====================================================================
        const btnOpenAccompanyingModal = document.getElementById('btnOpenAddAccompanyingServiceModal');
        const modalAccompanying = document.getElementById('modalAddAccompanyingService');
        const accompanyingCategorySelect = document.getElementById('accompanyingCategorySelect');
        const accompanyingItemSelect = document.getElementById('accompanyingServiceItemSelect');
        const accompanyingPriceInput = document.getElementById('accompanyingPriceInput');
        const accompanyingStaffSelect = document.getElementById('accompanyingStaffSelect');
        const accompanyingNoteInput = document.getElementById('accompanyingNoteInput');
        const btnSubmitAccompanying = document.getElementById('btnSubmitAddAccompanying');

        function updateAccompanyingServiceItems() {
            if (!accompanyingItemSelect) return;
            const cat = accompanyingCategorySelect ? accompanyingCategorySelect.value : 'ALL';
            const filtered = cat === 'ALL' 
                ? ACCOMPANYING_SERVICE_PRESETS 
                : ACCOMPANYING_SERVICE_PRESETS.filter(item => item.cat === cat);

            accompanyingItemSelect.innerHTML = '<option value="">-- Chọn gói dịch vụ đi cùng --</option>' + 
                filtered.map(item => `
                    <option value="${item.name}" data-price="${item.price}">${item.name} (${PawpalServices.formatCurrency(item.price)})</option>
                `).join('');

            if (accompanyingPriceInput) accompanyingPriceInput.value = '';
        }

        if (btnOpenAccompanyingModal && modalAccompanying) {
            btnOpenAccompanyingModal.addEventListener('click', () => {
                if (accompanyingCategorySelect) accompanyingCategorySelect.value = 'ALL';
                updateAccompanyingServiceItems();

                // Nạp KTV
                if (accompanyingStaffSelect) {
                    const staffList = PawpalServices.state?.liveStaffList || [];
                    accompanyingStaffSelect.innerHTML = '<option value="">-- Chọn KTV thực hiện --</option>' + 
                        staffList.map(s => `<option value="${s.full_name}">${s.full_name}</option>`).join('');
                }

                if (accompanyingPriceInput) accompanyingPriceInput.value = '';
                if (accompanyingNoteInput) accompanyingNoteInput.value = '';

                modalAccompanying.classList.add('active');
            });
        }

        if (accompanyingCategorySelect) {
            accompanyingCategorySelect.addEventListener('change', updateAccompanyingServiceItems);
        }

        if (accompanyingItemSelect) {
            accompanyingItemSelect.addEventListener('change', () => {
                const selectedOpt = accompanyingItemSelect.options[accompanyingItemSelect.selectedIndex];
                const price = selectedOpt ? selectedOpt.getAttribute('data-price') : '';
                if (accompanyingPriceInput && price) {
                    accompanyingPriceInput.value = price;
                }
            });
        }

        if (btnSubmitAccompanying) {
            btnSubmitAccompanying.addEventListener('click', () => {
                const name = accompanyingItemSelect?.value;
                const price = parseFloat(accompanyingPriceInput?.value || 0);
                const staff = accompanyingStaffSelect?.value;
                const note = accompanyingNoteInput?.value.trim();

                if (!name) {
                    PawpalServices.showToast('Vui lòng chọn gói dịch vụ đi cùng!', 'warning');
                    accompanyingItemSelect?.focus();
                    return;
                }
                if (!price || price <= 0) {
                    PawpalServices.showToast('Vui lòng nhập giá dịch vụ hợp lệ!', 'warning');
                    accompanyingPriceInput?.focus();
                    return;
                }

                const bookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (booking) {
                    booking.accompanyingServices = booking.accompanyingServices || [];
                    booking.accompanyingServices.push({ name, price, staff, note });

                    renderDetailFinancials(booking);
                    const formatCur = PawpalServices.formatCurrency || (num => `${num.toLocaleString('vi-VN')} đ`);
                    PawpalServices.showToast(`Đã thêm dịch vụ "${name}" (+${formatCur(price)}) vào ca!`);

                    if (modalAccompanying) modalAccompanying.classList.remove('active');
                }
            });
        }

        // Sự kiện mở Modal 12: In phiếu tiếp nhận an toàn
        const btnPrintIntakeStatic = document.getElementById('btnPrintIntakeWaiver');
        if (btnPrintIntakeStatic) {
            btnPrintIntakeStatic.addEventListener('click', () => {
                const bId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
                const bList = PawpalServices.state?.bookingsData || [];
                const b = bList.find(item => item.id === bId || item.dbId === bId) || bList[0];
                openIntakeWaiverModal(b);
            });
        }

        // Sự kiện mở Modal 13: Báo khách đón bé
        const btnNotifyPickupStatic = document.getElementById('btnNotifyCustomerPickup');
        if (btnNotifyPickupStatic) {
            btnNotifyPickupStatic.addEventListener('click', () => {
                const bId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
                const bList = PawpalServices.state?.bookingsData || [];
                const b = bList.find(item => item.id === bId || item.dbId === bId) || bList[0];
                openNotifyPickupModal(b);
            });
        }
    }

    function openIntakeWaiverModal(booking) {
        if (!booking) {
            const currentId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
            const bookingsList = PawpalServices.state?.bookingsData || [];
            booking = bookingsList.find(b => b.id === currentId || b.dbId === currentId) || bookingsList[0];
        }
        if (!booking) return;

        const modal = document.getElementById('modalPrintIntakeWaiver');
        if (!modal) return;

        const formatCurrency = PawpalServices.formatCurrency || (num => `${Number(num).toLocaleString('vi-VN')} đ`);
        const intake = booking.intakeRecord || {};
        const actualWeight = intake.actualWeight || parseFloat(booking.petWeight) || 4.2;
        const basePrice = booking.price || booking.basePrice || 250000;
        const total = booking.total || basePrice;

        // Điền Header phiếu in
        const codeEl = document.getElementById('waiverBookingCode');
        const dateEl = document.getElementById('waiverPrintDate');
        if (codeEl) codeEl.textContent = booking.id || 'BKG-1001';
        if (dateEl) {
            dateEl.textContent = `Ngày ${booking.date || '25/06/2026'} ${booking.time || '14:00'}`;
        }

        // Phần 1: Khách hàng & Thú cưng
        const custNameEl = document.getElementById('waiverCustName');
        const custPhoneEl = document.getElementById('waiverCustPhone');
        const petNameEl = document.getElementById('waiverPetName');
        const petBreedEl = document.getElementById('waiverPetBreed');
        const petWeightEl = document.getElementById('waiverPetWeight');
        const petAgeEl = document.getElementById('waiverPetAge');

        if (custNameEl) custNameEl.textContent = booking.customer || 'Lê Lệ Quyên';
        if (custPhoneEl) custPhoneEl.textContent = booking.phone || '0901234567';
        if (petNameEl) petNameEl.textContent = booking.petName || 'Miu Con';
        if (petBreedEl) petBreedEl.textContent = booking.petBreed || 'Mèo Anh Lông Ngắn';
        if (petWeightEl) petWeightEl.textContent = `${booking.petWeight || booking.originalWeight || '4.2'} kg`;
        if (petAgeEl) petAgeEl.textContent = booking.petAge || '2 tuổi';

        // Phần 2: Ngoại quan tiếp nhận (Zero-Claim)
        const actualWeightEl = document.getElementById('waiverActualWeight');
        const weightEvalEl = document.getElementById('waiverWeightEval');
        const skinCoatEl = document.getElementById('waiverSkinCoat');
        const eyesEarsEl = document.getElementById('waiverEyesEars');
        const woundsEl = document.getElementById('waiverWounds');
        const temperamentEl = document.getElementById('waiverTemperament');
        const belongingsEl = document.getElementById('waiverBelongings');

        if (actualWeightEl) actualWeightEl.textContent = `${actualWeight} kg`;
        if (weightEvalEl) weightEvalEl.textContent = intake.weightEvaluation || 'Đúng khung giá chuẩn';
        if (skinCoatEl) skinCoatEl.textContent = intake.skinCoat || 'Sạch sẽ, không ve rận';
        if (eyesEarsEl) eyesEarsEl.textContent = intake.eyesEars || 'Bình thường';
        if (woundsEl) woundsEl.textContent = intake.wounds || 'Không có vết thương cũ';
        if (temperamentEl) temperamentEl.textContent = intake.temperament || 'Ngoan hiền';
        
        const bNote = intake.belongingsNote || '';
        const bItems = Array.isArray(intake.belongings) && intake.belongings.length > 0 ? intake.belongings.join(', ') : '';
        if (belongingsEl) belongingsEl.textContent = bNote || bItems || '01 Dây dắt đỏ';

        // Phần 3: Gói dịch vụ & Chi phí
        const svcNameEl = document.getElementById('waiverServiceName');
        const priceBaseEl = document.getElementById('waiverPriceBase');
        const staffNameEl = document.getElementById('waiverStaffName');
        const durationEl = document.getElementById('waiverDuration');
        const priceTotalEl = document.getElementById('waiverPriceTotal');
        const extraItemsBlock = document.getElementById('waiverExtraItemsBlock');
        const extraItemsText = document.getElementById('waiverExtraItemsText');

        if (svcNameEl) svcNameEl.textContent = booking.service || 'Gói Tắm Vệ Sinh Cơ Bản';
        if (priceBaseEl) priceBaseEl.textContent = formatCurrency(basePrice);
        if (staffNameEl) staffNameEl.textContent = booking.staff || 'Ngọc Anh';
        if (durationEl) durationEl.textContent = booking.duration || '60 phút';
        if (priceTotalEl) priceTotalEl.textContent = formatCurrency(total);

        const accompanying = (booking.accompanyingServices || []).map(s => s.name);
        const surcharges = (booking.surcharges || []).map(s => s.name);
        const allExtras = [...accompanying, ...surcharges];
        if (extraItemsBlock && extraItemsText) {
            if (allExtras.length > 0) {
                extraItemsBlock.style.display = 'block';
                extraItemsText.textContent = allExtras.join(', ');
            } else {
                extraItemsBlock.style.display = 'none';
            }
        }

        // Chữ ký
        const staffSignEl = document.getElementById('waiverStaffSignName');
        const custSignEl = document.getElementById('waiverCustSignName');
        if (staffSignEl) staffSignEl.textContent = `KTV. ${booking.staff || 'Nguyễn Ngọc Anh'}`;
        if (custSignEl) custSignEl.textContent = booking.customer || 'Lê Lệ Quyên';

        // Nút in phiếu
        const btnPrintAction = document.getElementById('btnPrintIntakeWaiverAction');
        if (btnPrintAction) {
            btnPrintAction.onclick = () => {
                window.print();
            };
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
        const card = modal.querySelector('.admin-modal-card');
        if (card) card.scrollTop = 0;
    }

    function openNotifyPickupModal(booking) {
        if (!booking) {
            const currentId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
            const bookingsList = PawpalServices.state?.bookingsData || [];
            booking = bookingsList.find(b => b.id === currentId || b.dbId === currentId) || bookingsList[0];
        }
        if (!booking) return;

        const modal = document.getElementById('modalNotifyPickup');
        if (!modal) return;

        const formatCurrency = PawpalServices.formatCurrency || (num => `${Number(num).toLocaleString('vi-VN')} đ`);
        const metaEl = document.getElementById('notifyPickupMeta');
        const svcNameEl = document.getElementById('notifyPickupServiceName');
        const costEl = document.getElementById('notifyPickupTotalCost');
        const staffEl = document.getElementById('notifyPickupStaffName');
        const belongingsEl = document.getElementById('notifyPickupBelongings');
        const textareaEl = document.getElementById('notifyPickupMessageText');

        const custName = booking.customer || 'Quý khách';
        const custPhone = booking.phone || '';
        const petName = booking.petName || 'Bé cưng';
        const svcName = booking.service || 'Dịch vụ chăm sóc';
        const totalCost = formatCurrency(booking.total || booking.price || 250000);
        const staffName = booking.staff || 'KTV PawPal';
        const intake = booking.intakeRecord || {};
        const belongingsNote = intake.belongingsNote || (Array.isArray(intake.belongings) && intake.belongings.length > 0 ? intake.belongings.join(', ') : '01 Dây dắt đỏ');

        if (metaEl) {
            metaEl.textContent = `Mã ca ${booking.id || 'BKG-1001'} • Bé ${petName} • Chủ nuôi ${custName} ${custPhone ? `(${custPhone})` : ''}`;
        }
        if (svcNameEl) svcNameEl.textContent = svcName;
        if (costEl) costEl.textContent = totalCost;
        if (staffEl) staffEl.textContent = staffName;
        if (belongingsEl) belongingsEl.textContent = belongingsNote;

        function generateMessage() {
            return `Dạ PawPal xin chào Anh/Chị ${custName}!
Bé ${petName} đã hoàn thành xong dịch vụ ${svcName} thật thơm tho và xinh đẹp rồi ạ! ✨

• Kỹ thuật viên phụ trách: ${staffName}
• Tổng chi phí ca: ${totalCost}
• Tư trang nhận lại: ${belongingsNote}

PawPal kính mời Anh/Chị ghé tiệm để đón bé về sum vầy cùng gia đình nhé ạ. Cảm ơn Anh/Chị! 🐾`;
        }

        if (textareaEl) {
            textareaEl.value = generateMessage();
        }

        const btnReset = document.getElementById('btnResetNotifyTemplate');
        if (btnReset && textareaEl) {
            btnReset.onclick = () => {
                textareaEl.value = generateMessage();
                PawpalServices.showToast('Đã khôi phục mẫu tin nhắn chuẩn!');
            };
        }

        const btnSend = document.getElementById('btnSendNotifyPickup');
        if (btnSend) {
            btnSend.onclick = () => {
                const channel = document.querySelector('input[name="pickupChannel"]:checked')?.value || 'Zalo ZNS';
                PawpalServices.showToast(`Đã gửi thông báo đón bé ${petName} qua ${channel} thành công!`);
                modal.classList.remove('active');
            };
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
        const card = modal.querySelector('.admin-modal-card');
        if (card) card.scrollTop = 0;
    }

    PawpalServices.subtabs.detail = {
        init: initDetailSubtab,
        openBookingDetail,
        renderBookingDetail,
        openIntakeWaiverModal,
        openNotifyPickupModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDetailSubtab);
    } else {
        initDetailSubtab();
    }
})();
