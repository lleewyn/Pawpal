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
                metaEl.textContent = `Lưu trú: ${booking.checkInDate || booking.date} ➔ ${booking.checkOutDate || '2026-07-04'} (${booking.nights || 3} đêm) | Phòng: ${booking.roomCode || 'DLX-04'} | Cơ sở: ${booking.branch || 'PawPal Quận 1'}`;
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
                    if (PawpalServices.subtabs.bookings?.updateBookingStatus) {
                        PawpalServices.subtabs.bookings.updateBookingStatus(booking.id, 'confirmed');
                    }
                    renderBookingDetail(booking.id);
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
                            <span class="info-value" style="font-weight: 600; color: #236B48;">${booking.checkInDate || booking.date} (${booking.checkInTime || '08:00'}) ➔ ${booking.checkOutDate || '2026-07-04'} (${booking.checkOutTime || '10:00'})</span>
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

        // Cập nhật Khối tài chính
        const priceBaseEl = document.getElementById('detailPriceBase');
        const priceSurchargeEl = document.getElementById('detailPriceSurcharge');
        const priceVoucherEl = document.getElementById('detailPriceVoucher');
        const priceTotalEl = document.getElementById('detailPriceTotal');
        const paymentBadgeEl = document.getElementById('detailPaymentBadge');

        const basePrice = booking.price || booking.total || 0;
        const surchargePrice = booking.surchargePrice || 0;
        const voucherPrice = booking.voucherDiscount || 0;
        const totalPrice = basePrice + surchargePrice - voucherPrice;

        if (priceBaseEl) priceBaseEl.textContent = formatCurrency(basePrice);
        if (priceSurchargeEl) priceSurchargeEl.textContent = formatCurrency(surchargePrice);
        if (priceVoucherEl) priceVoucherEl.textContent = voucherPrice > 0 ? `-${formatCurrency(voucherPrice)}` : '0 đ';
        if (priceTotalEl) priceTotalEl.textContent = formatCurrency(totalPrice);
        if (paymentBadgeEl) {
            paymentBadgeEl.textContent = booking.paymentStatus || 'Chưa thu';
            paymentBadgeEl.className = `admin-badge ${booking.paymentStatus === 'Đã thanh toán' ? 'badge-success' : 'badge-neutral'}`;
        }

        // Timeline tiến trình 4 giai đoạn
        renderDetailTimeline(booking);

        // Care-Log nhật ký từng bước dịch vụ
        renderDetailCareLogs(booking);
    }

    function renderDetailTimeline(booking) {
        const timelineContainer = document.getElementById('detailTimelineContainer');
        if (!timelineContainer) return;

        const timelineData = booking.timeline || [
            { title: 'Đặt lịch hẹn', time: booking.time || '09:00', desc: 'Khách hàng đặt trực tuyến', done: true },
            { title: 'Tiếp nhận an toàn', time: '09:15', desc: 'KTV kiểm tra da lông, mắt tai', done: booking.status === 'in_progress' || booking.status === 'completed' },
            { title: 'Thực hiện dịch vụ', time: '09:30', desc: booking.serviceName, done: booking.status === 'in_progress' || booking.status === 'completed' },
            { title: 'Hoàn tất & Trả bé', time: '10:30', desc: 'Bàn giao cho chủ nuôi', done: booking.status === 'completed' }
        ];

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

    function renderDetailCareLogs(booking) {
        const carelogsContainer = document.getElementById('detailCareLogsContainer');
        if (!carelogsContainer) return;

        const logs = booking.careLogs || [];
        if (logs.length === 0) {
            carelogsContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                    Chưa có nhật ký quy trình chăm sóc cho ca dịch vụ này.
                </div>
            `;
            return;
        }

        carelogsContainer.innerHTML = logs.map((log, idx) => `
            <div class="carelog-step-card" data-step-idx="${idx}">
                <div class="carelog-step-header">
                    <div class="carelog-step-title">
                        <span class="step-number">${idx + 1}.</span> ${log.description || log.step_name || 'Bước thực hiện'}
                    </div>
                    <span class="admin-badge ${log.completed ? 'badge-success' : 'badge-neutral'}">${log.completed ? 'Đã xong' : 'Đang làm'}</span>
                </div>
                <div class="carelog-step-body">
                    <div class="carelog-meta-row">
                        <span>KTV: <strong>${log.ktv || booking.staff || 'Chưa phân công'}</strong></span>
                        <span>Thời gian: ${log.recorded_at ? log.recorded_at.substring(11, 16) : '—'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function initDetailSubtab() {
        const initialBookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';
        renderBookingDetail(initialBookingId);
    }

    PawpalServices.subtabs.detail = {
        init: initDetailSubtab,
        openBookingDetail,
        renderBookingDetail
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDetailSubtab);
    } else {
        initDetailSubtab();
    }
})();
