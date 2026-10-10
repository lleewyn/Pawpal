// tab-service-bookings.js - Subtab Lịch hẹn và Vận hành Dịch vụ Pawpal-er
(function() {
    'use strict';

    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    let currentSearchTerm = '';
    let currentFilterCategory = 'ALL';
    let currentFilterStatus = 'ALL';
    let currentFilterStaff = 'ALL';
    let isUpcomingFilterActive = false;
    let isAllergyFilterActive = false;
    let isSlaFilterActive = false;
    let currentBookingPage = 1;
    const BOOKINGS_PER_PAGE = 10;

    let activeDropdownBookingId = null;
    let intakeProofImagesTemp = [];
    let surchargeProofImagesTemp = [];
    let completeProofImagesTemp = [];

    // Global action dropdown portal (•••)
    let globalBookingActionDropdown = null;

    function closeBookingGlobalDropdown() {
        if (globalBookingActionDropdown) {
            globalBookingActionDropdown.classList.remove('show');
            globalBookingActionDropdown.style.display = 'none';
            globalBookingActionDropdown.removeAttribute('data-booking-id');
        }
        document.querySelectorAll('.btn-booking-action-more.active').forEach(b => b.classList.remove('active'));
    }

    function toggleBookingGlobalDropdown(btn) {
        const bookingId = btn.getAttribute('data-booking-id');
        const isCurrentlyOpen = globalBookingActionDropdown &&
                                globalBookingActionDropdown.classList.contains('show') &&
                                globalBookingActionDropdown.getAttribute('data-booking-id') === bookingId;

        closeBookingGlobalDropdown();
        if (isCurrentlyOpen) return;

        const bookingsData = PawpalServices.state?.bookingsData || [];
        const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
        if (!booking) return;

        btn.classList.add('active');
        globalBookingActionDropdown.setAttribute('data-booking-id', booking.id);

        let menuHtml = `
            <button type="button" class="dropdown-item" data-action="view-detail">
                Xem hồ sơ 360°
            </button>
        `;

        if (booking.status === 'pending') {
            menuHtml += `
                <button type="button" class="dropdown-item" data-action="confirm-booking">
                    Xác nhận lịch hẹn
                </button>
                <button type="button" class="dropdown-item text-danger" data-action="cancel-booking">
                    Hủy lịch hẹn
                </button>
            `;
        } else if (booking.status === 'confirmed') {
            menuHtml += `
                <button type="button" class="dropdown-item" data-action="intake-safety">
                    Tiếp nhận an toàn
                </button>
                <button type="button" class="dropdown-item" data-action="change-staff">
                    Điều phối KTV
                </button>
                <button type="button" class="dropdown-item text-danger" data-action="cancel-booking">
                    Hủy lịch hẹn
                </button>
            `;
        } else if (booking.status === 'in_progress') {
            menuHtml += `
                <button type="button" class="dropdown-item" data-action="add-surcharge">
                    Thêm phụ phí
                </button>
                <button type="button" class="dropdown-item text-success" data-action="complete-booking">
                    Hoàn thành dịch vụ
                </button>
                <button type="button" class="dropdown-item" data-action="escalate-complaint">
                    Tạo khiếu nại
                </button>
            `;
        } else if (booking.status === 'completed') {
            menuHtml += `
                <button type="button" class="dropdown-item" data-action="escalate-complaint">
                    Tạo khiếu nại
                </button>
            `;
        }

        globalBookingActionDropdown.innerHTML = menuHtml;

        globalBookingActionDropdown.style.display = 'flex';
        globalBookingActionDropdown.style.visibility = 'hidden';
        globalBookingActionDropdown.style.top = '0px';
        globalBookingActionDropdown.style.left = '0px';

        const rect = btn.getBoundingClientRect();
        const dropdownWidth = globalBookingActionDropdown.offsetWidth || 185;
        const dropdownHeight = globalBookingActionDropdown.offsetHeight || 180;
        globalBookingActionDropdown.style.visibility = 'visible';

        let left = rect.right - dropdownWidth;
        if (left < 10) left = 10;

        const spaceBelow = window.innerHeight - rect.bottom;
        let top;
        if (spaceBelow < dropdownHeight + 10 && rect.top > dropdownHeight + 10) {
            top = rect.top - dropdownHeight - 4;
        } else {
            top = rect.bottom + 4;
        }

        globalBookingActionDropdown.style.top = `${top}px`;
        globalBookingActionDropdown.style.left = `${left}px`;
        globalBookingActionDropdown.style.zIndex = '99999';
        globalBookingActionDropdown.classList.add('show');
    }

    function updateKPIs() {
        const bookingsData = PawpalServices.state?.bookingsData || [];
        const isBookingUpcoming = PawpalServices.isBookingUpcoming || (() => false);

        const total = bookingsData.length;
        const pending = bookingsData.filter(b => b.status === 'pending').length;
        const upcoming = bookingsData.filter(isBookingUpcoming).length;
        const inProgress = bookingsData.filter(b => b.status === 'in_progress').length;
        const completed = bookingsData.filter(b => b.status === 'completed').length;
        const cancelled = bookingsData.filter(b => b.status === 'cancelled').length;

        const statTotal = document.getElementById('statTotalBookings');
        const statPending = document.getElementById('statPendingBookings');
        const statUpcoming = document.getElementById('statUpcomingBookings');
        const statInProgress = document.getElementById('statInProgressBookings');
        const statCompleted = document.getElementById('statCompletedBookings');
        const statCancelled = document.getElementById('statCancelledBookings');

        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pending;
        if (statUpcoming) statUpcoming.textContent = upcoming;
        if (statInProgress) statInProgress.textContent = inProgress;
        if (statCompleted) statCompleted.textContent = completed;
        if (statCancelled) statCancelled.textContent = cancelled;
    }

    function renderUpcomingBar() {
        const container = document.getElementById('upcomingItemsContainer');
        const bar = document.getElementById('upcomingAlertBar');
        if (!container) return;

        const bookingsData = PawpalServices.state?.bookingsData || [];
        const isBookingUpcoming = PawpalServices.isBookingUpcoming || (() => false);
        const upcomingList = bookingsData.filter(isBookingUpcoming);

        if (upcomingList.length === 0) {
            if (bar) bar.style.display = 'none';
            return;
        }

        if (bar) bar.style.display = 'flex';

        container.innerHTML = upcomingList.map(item => `
            <div class="upcoming-item-tag ${item.status === 'pending' || !item.staff ? 'urgent' : ''}" data-booking-id="${item.id}" title="Xem chi tiết ${item.customerName}">
                <span class="tag-time">${item.time}</span>
                <span class="tag-cust">${item.customerName}</span>
                <span class="tag-pet">(${item.petName})</span>
            </div>
        `).join('');

        container.querySelectorAll('.upcoming-item-tag').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const bkgId = el.getAttribute('data-booking-id');
                if (bkgId && PawpalServices.openBookingDetail) {
                    PawpalServices.openBookingDetail(bkgId);
                }
            });
        });
    }

    function renderBookingsTable() {
        closeBookingGlobalDropdown();
        const tbody = document.getElementById('servicesBookingTableBody');
        if (!tbody) return;

        const bookingsData = PawpalServices.state?.bookingsData || [];
        const toUnaccent = PawpalServices.toUnaccent || (str => str);
        const getServiceSlaInfo = PawpalServices.getServiceSlaInfo || (() => ({ level: 'ok', label: 'Bình thường' }));
        const isBookingUpcoming = PawpalServices.isBookingUpcoming || (() => false);
        const getStatusBadge = PawpalServices.getStatusBadge || (st => `<span class="admin-badge">${st}</span>`);
        const getAlertBadge = PawpalServices.getAlertBadge || (() => '—');
        const formatCurrency = PawpalServices.formatCurrency || (num => `${num} đ`);

        let filtered = bookingsData.filter(item => {
            if (currentSearchTerm) {
                const termUnaccent = toUnaccent(currentSearchTerm);
                const termRaw = currentSearchTerm.toLowerCase().trim();

                const matchCode = toUnaccent(item.id).includes(termUnaccent) || item.id.toLowerCase().includes(termRaw);
                const matchCustomer = toUnaccent(item.customerName).includes(termUnaccent) || item.customerName.toLowerCase().includes(termRaw);
                const matchPhone = (item.phone || '').includes(termRaw);
                const matchPet = toUnaccent(item.petName).includes(termUnaccent) || item.petName.toLowerCase().includes(termRaw);
                const matchBreed = toUnaccent(item.petBreed || '').includes(termUnaccent);
                const matchService = toUnaccent(item.serviceName || '').includes(termUnaccent);
                const matchStaff = toUnaccent(item.staff || '').includes(termUnaccent);

                if (!matchCode && !matchCustomer && !matchPhone && !matchPet && !matchBreed && !matchService && !matchStaff) {
                    return false;
                }
            }

            if (currentFilterCategory !== 'ALL' && item.category !== currentFilterCategory) return false;
            if (currentFilterStatus !== 'ALL' && item.status !== currentFilterStatus) return false;

            if (currentFilterStaff !== 'ALL') {
                if (currentFilterStaff === 'UNASSIGNED') {
                    if (item.staff) return false;
                } else if (item.staff !== currentFilterStaff) {
                    return false;
                }
            }

            if (isUpcomingFilterActive && !isBookingUpcoming(item)) return false;
            if (isAllergyFilterActive && !item.petAlert) return false;

            if (isSlaFilterActive) {
                const sla = getServiceSlaInfo(item);
                if (sla.level !== 'danger' && sla.level !== 'warning') return false;
            }

            return true;
        });

        const totalRecords = filtered.length;
        const totalPages = Math.ceil(totalRecords / BOOKINGS_PER_PAGE);

        const btnToolbarReset = document.getElementById('btnToolbarResetFilters');
        if (btnToolbarReset) {
            btnToolbarReset.style.display = (currentSearchTerm && currentSearchTerm.length > 0) ? 'inline-flex' : 'none';
        }

        const btnServiceClearFilters = document.getElementById('btnServiceClearFilters');
        const isAnyFilterActive = Boolean(
            currentSearchTerm ||
            currentFilterCategory !== 'ALL' ||
            currentFilterStatus !== 'ALL' ||
            currentFilterStaff !== 'ALL' ||
            isUpcomingFilterActive ||
            isAllergyFilterActive ||
            isSlaFilterActive
        );
        if (btnServiceClearFilters) {
            btnServiceClearFilters.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
        }

        if (totalRecords === 0) {
            currentBookingPage = 1;
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state-cell">
                        <div class="empty-state-wrapper">
                            <div class="empty-state-text" style="font-size: 13.5px; color: var(--text-muted); text-align: center; padding: 30px;">
                                Không tìm thấy lịch hẹn phù hợp với bộ lọc hiện tại. 
                                <button type="button" id="btnResetServiceFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetServiceFilters')?.addEventListener('click', clearBookingSearchAndFilters);
            renderBookingsPagination(0);
            return;
        }

        if (currentBookingPage > totalPages) currentBookingPage = totalPages;
        if (currentBookingPage < 1) currentBookingPage = 1;

        const startIndex = (currentBookingPage - 1) * BOOKINGS_PER_PAGE;
        const pagedBookings = filtered.slice(startIndex, startIndex + BOOKINGS_PER_PAGE);

        tbody.innerHTML = pagedBookings.map(item => {
            const sla = getServiceSlaInfo(item);
            let alertClass = '';
            if (item.petAlert || sla.level === 'danger') {
                alertClass = 'row-alert-danger';
            } else if ((!item.staff && item.status !== 'cancelled') || sla.level === 'warning') {
                alertClass = 'row-alert-warning';
            }

            const isLocked = item.status === 'cancelled' ? 'row-locked' : '';

            let serviceCellHtml = '';
            let datetimeCellHtml = '';

            if (item.category === 'Hotel') {
                serviceCellHtml = `
                    <div style="font-weight: 500; color: var(--text-main);">${item.serviceName}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                        ${item.roomCode || 'DLX-04'} • ${item.nights || 3} đêm • ${item.dietPlan ? 'Pate tươi' : 'Ăn theo yêu cầu'}
                    </div>
                `;
                datetimeCellHtml = `
                    <div style="font-weight: 600; color: var(--text-main);">${item.checkInDate ? `${item.checkInDate} ➔ ${item.checkOutDate}` : item.date}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${item.nights ? `${item.nights} đêm (${item.checkInTime || '08:00'} check-in)` : item.time}</div>
                `;
            } else if (item.category === 'Taxi') {
                const shortPickup = item.pickupAddress ? (item.pickupAddress.length > 22 ? item.pickupAddress.substring(0, 22) + '...' : item.pickupAddress) : 'Đón tận nơi';
                serviceCellHtml = `
                    <div style="font-weight: 500; color: var(--text-main);">${item.serviceName}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                        ${shortPickup} ➔ Q.1 (${item.distanceKm || 4.2}km)
                    </div>
                `;
                datetimeCellHtml = `
                    <div style="font-weight: 600; color: var(--text-main);">${item.time}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${item.date} • ${item.tripType || '2 chiều khứ hồi'}</div>
                `;
            } else {
                serviceCellHtml = `
                    <div style="font-weight: 500; color: var(--text-main);">${item.serviceName}</div>
                    ${item.styleType ? `<div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${item.styleType}</div>` : `<div style="font-size: 12px; color: var(--text-muted);">${item.duration}</div>`}
                `;
                datetimeCellHtml = `
                    <div style="font-weight: 600; color: var(--text-main);">${item.time}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${item.date}</div>
                `;
            }

            const staffDisplay = item.staff
                ? `<span style="font-weight: 500; color: var(--text-main);">${item.staff}</span>`
                : `<button type="button" class="btn-table-action-inline btn-assign-staff-inline" data-booking-id="${item.id}" style="color: #B45309; background: none; border: none; font-weight: 600; cursor: pointer; text-decoration: underline; font-size: 12px; padding: 0;">Điều phối</button>`;

            const alertBadgeHtml = getAlertBadge(item);

            return `
                <tr class="service-table-row ${alertClass} ${isLocked}" data-booking-id="${item.id}">
                    <td class="alert-border-cell" style="width: 100px; min-width: 100px; font-weight: 600;">
                        <a href="javascript:void(0)" class="user-name-link btn-view-booking-detail" data-booking-id="${item.id}">${item.id}</a>
                    </td>
                    <td style="min-width: 130px;">
                        ${datetimeCellHtml}
                    </td>
                    <td style="min-width: 140px;">
                        <div style="font-weight: 600; color: var(--text-main);">${item.customerName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.phone}</div>
                    </td>
                    <td style="min-width: 140px;">
                        <div style="font-weight: 600; color: var(--text-heading);">${item.petName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.petBreed || 'Chó'} • ${item.petWeight}</div>
                    </td>
                    <td style="min-width: 180px;">
                        ${serviceCellHtml}
                    </td>
                    <td style="min-width: 120px; text-align: left;">
                        ${staffDisplay}
                    </td>
                    <td style="min-width: 100px; text-align: right; font-weight: 600; color: var(--text-heading);">
                        ${formatCurrency(item.total || item.price || 0)}
                    </td>
                    <td style="min-width: 110px; text-align: center;">
                        <span class="admin-badge ${item.paymentStatus === 'Đã thanh toán' ? 'badge-success' : 'badge-neutral'}">${item.paymentStatus || 'Chưa thu'}</span>
                    </td>
                    <td style="min-width: 110px; text-align: center;">
                        ${getStatusBadge(item.status)}
                    </td>
                    <td style="min-width: 130px; text-align: left;">
                        ${alertBadgeHtml}
                    </td>
                    <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                        <button type="button" class="btn-booking-action-more" data-booking-id="${item.id}" title="Tác vụ">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderBookingsPagination(totalPages);
    }

    function renderBookingsPagination(totalPages) {
        const pagContainer = document.getElementById('servicesPagination');
        if (!pagContainer) return;

        if (totalPages === 0) {
            pagContainer.style.display = 'none';
            pagContainer.innerHTML = '';
            return;
        }

        pagContainer.style.display = 'flex';
        let html = '';

        const prevDisabled = currentBookingPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === currentBookingPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = currentBookingPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled || btn.classList.contains('disabled')) return;
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (currentBookingPage > 1) {
                        currentBookingPage--;
                        renderBookingsTable();
                    }
                } else if (pageAction === 'next') {
                    if (currentBookingPage < totalPages) {
                        currentBookingPage++;
                        renderBookingsTable();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== currentBookingPage) {
                        currentBookingPage = targetP;
                        renderBookingsTable();
                    }
                }
            });
        });
    }

    function clearBookingSearchAndFilters() {
        currentSearchTerm = '';
        currentFilterCategory = 'ALL';
        currentFilterStatus = 'ALL';
        currentFilterStaff = 'ALL';
        isUpcomingFilterActive = false;
        isAllergyFilterActive = false;
        isSlaFilterActive = false;
        currentBookingPage = 1;

        const searchInput = document.getElementById('serviceSearchInput');
        if (searchInput) searchInput.value = '';

        const selectCategory = document.getElementById('serviceFilterCategory');
        if (selectCategory) selectCategory.value = 'ALL';

        const selectStatus = document.getElementById('serviceFilterStatus');
        if (selectStatus) selectStatus.value = 'ALL';

        const selectStaff = document.getElementById('serviceFilterStaff');
        if (selectStaff) selectStaff.value = 'ALL';

        const btnUpcoming = document.getElementById('btnToggleUpcomingOnly');
        if (btnUpcoming) btnUpcoming.classList.remove('active');

        const btnAllergy = document.getElementById('btnToggleAllergyOnly');
        if (btnAllergy) btnAllergy.classList.remove('active');

        const btnSla = document.getElementById('btnToggleSlaOverdue');
        if (btnSla) btnSla.classList.remove('active');

        document.querySelectorAll('.kpi-card-clickable').forEach(c => c.classList.remove('active'));
        const kpiAll = document.querySelector('.kpi-card-clickable[data-kpi-filter="ALL"]');
        if (kpiAll) kpiAll.classList.add('active');

        const btnServiceClearFilters = document.getElementById('btnServiceClearFilters');
        if (btnServiceClearFilters) btnServiceClearFilters.style.display = 'none';

        const btnToolbarReset = document.getElementById('btnToolbarResetFilters');
        if (btnToolbarReset) btnToolbarReset.style.display = 'none';

        renderBookingsTable();
        PawpalServices.showToast('Đã xóa bộ lọc và hiển thị lại toàn bộ danh sách lịch hẹn.', 'info');
    }

    // Modal tạo lịch hẹn mới, điều phối KTV, tiếp nhận an toàn...
    function initBookingsSubtab() {
        globalBookingActionDropdown = document.getElementById('globalBookingActionDropdown');
        if (!globalBookingActionDropdown) {
            globalBookingActionDropdown = document.createElement('div');
            globalBookingActionDropdown.id = 'globalBookingActionDropdown';
            globalBookingActionDropdown.className = 'action-dropdown-menu';
            document.body.appendChild(globalBookingActionDropdown);
        }

        globalBookingActionDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            e.stopPropagation();

            const action = item.getAttribute('data-action');
            const bookingId = globalBookingActionDropdown.getAttribute('data-booking-id');
            closeBookingGlobalDropdown();

            if (!bookingId) return;

            if (action === 'view-detail') {
                if (PawpalServices.openBookingDetail) PawpalServices.openBookingDetail(bookingId);
            } else if (action === 'confirm-booking') {
                updateBookingStatus(bookingId, 'confirmed');
            } else if (action === 'intake-safety') {
                openIntakeModal(bookingId, 'intake');
            } else if (action === 'change-staff') {
                openChangeStaffModal(bookingId);
            } else if (action === 'add-surcharge') {
                openSurchargeModal(bookingId);
            } else if (action === 'complete-booking') {
                openCompleteBookingModal(bookingId);
            } else if (action === 'cancel-booking') {
                openCancelModal(bookingId);
            } else if (action === 'escalate-complaint') {
                escalateBookingToComplaint(bookingId);
            }
        });

        document.addEventListener('click', (e) => {
            const moreBtn = e.target.closest('.btn-booking-action-more');
            if (moreBtn) {
                e.stopPropagation();
                toggleBookingGlobalDropdown(moreBtn);
                return;
            }

            if (!e.target.closest('#globalBookingActionDropdown')) {
                closeBookingGlobalDropdown();
            }
        });

        window.addEventListener('resize', closeBookingGlobalDropdown);
        const scrollBox = document.querySelector('.table-responsive-wrapper');
        if (scrollBox) scrollBox.addEventListener('scroll', closeBookingGlobalDropdown);

        // Bắt sự kiện Toolbar lọc
        const searchInput = document.getElementById('serviceSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentSearchTerm = searchInput.value.trim();
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const btnToolbarReset = document.getElementById('btnToolbarResetFilters');
        if (btnToolbarReset) {
            btnToolbarReset.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                currentSearchTerm = '';
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const selectCategory = document.getElementById('serviceFilterCategory');
        if (selectCategory) {
            selectCategory.addEventListener('change', () => {
                currentFilterCategory = selectCategory.value;
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const selectStatus = document.getElementById('serviceFilterStatus');
        if (selectStatus) {
            selectStatus.addEventListener('change', () => {
                currentFilterStatus = selectStatus.value;
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const selectStaff = document.getElementById('serviceFilterStaff');
        if (selectStaff) {
            selectStaff.addEventListener('change', () => {
                currentFilterStaff = selectStaff.value;
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const btnUpcoming = document.getElementById('btnToggleUpcomingOnly');
        if (btnUpcoming) {
            btnUpcoming.addEventListener('click', () => {
                isUpcomingFilterActive = !isUpcomingFilterActive;
                btnUpcoming.classList.toggle('active', isUpcomingFilterActive);
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const btnAllergy = document.getElementById('btnToggleAllergyOnly');
        if (btnAllergy) {
            btnAllergy.addEventListener('click', () => {
                isAllergyFilterActive = !isAllergyFilterActive;
                btnAllergy.classList.toggle('active', isAllergyFilterActive);
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const btnSla = document.getElementById('btnToggleSlaOverdue');
        if (btnSla) {
            btnSla.addEventListener('click', () => {
                isSlaFilterActive = !isSlaFilterActive;
                btnSla.classList.toggle('active', isSlaFilterActive);
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        const btnServiceClearFilters = document.getElementById('btnServiceClearFilters');
        if (btnServiceClearFilters) {
            btnServiceClearFilters.addEventListener('click', clearBookingSearchAndFilters);
        }

        // Bắt sự kiện click thẻ KPI
        document.querySelectorAll('.kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const kpiVal = card.getAttribute('data-kpi-filter');
                document.querySelectorAll('.kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                if (kpiVal === 'ALL') {
                    currentFilterStatus = 'ALL';
                    isUpcomingFilterActive = false;
                } else if (kpiVal === 'upcoming') {
                    currentFilterStatus = 'ALL';
                    isUpcomingFilterActive = true;
                } else {
                    currentFilterStatus = kpiVal;
                    isUpcomingFilterActive = false;
                }

                if (selectStatus) selectStatus.value = currentFilterStatus;
                if (btnUpcoming) btnUpcoming.classList.toggle('active', isUpcomingFilterActive);
                currentBookingPage = 1;
                renderBookingsTable();
            });
        });

        // Bắt sự kiện xem chi tiết lịch hẹn từ bảng
        document.addEventListener('click', (e) => {
            const btnDetail = e.target.closest('.btn-view-booking-detail');
            if (btnDetail) {
                const bkgId = btnDetail.getAttribute('data-booking-id');
                if (bkgId && PawpalServices.openBookingDetail) {
                    PawpalServices.openBookingDetail(bkgId);
                }
            }

            const btnAssign = e.target.closest('.btn-assign-staff-inline');
            if (btnAssign) {
                const bkgId = btnAssign.getAttribute('data-booking-id');
                if (bkgId) openChangeStaffModal(bkgId);
            }
        });

        // Xuất file CSV báo cáo lịch hẹn
        const btnExport = document.getElementById('btnExportServiceReport');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const bookingsData = PawpalServices.state?.bookingsData || [];
                const headers = ['Mã lịch hẹn', 'Thời gian', 'Ngày', 'Khách hàng', 'Số điện thoại', 'Thú cưng', 'Dịch vụ', 'Kỹ thuật viên', 'Tổng tiền', 'Thanh toán', 'Trạng thái'];
                const rows = bookingsData.map(b => [
                    `"${b.id || ''}"`,
                    `"${b.time || ''}"`,
                    `"${b.date || ''}"`,
                    `"${b.customerName || ''}"`,
                    `"${b.phone || ''}"`,
                    `"${b.petName || ''}"`,
                    `"${b.serviceName || ''}"`,
                    `"${b.staff || 'Chưa phân công'}"`,
                    `"${b.total || b.price || 0}"`,
                    `"${b.paymentStatus || 'Chưa thu'}"`,
                    `"${b.status || ''}"`
                ]);

                const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                link.setAttribute('href', url);
                link.setAttribute('download', `bao_cao_lich_hen_pawpal_${dateStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                PawpalServices.showToast('Đã xuất thành công báo cáo lịch hẹn sang file CSV!');
            });
        }

        // Setup các modal phụ trợ
        setupBookingModals();
    }

    async function updateBookingStatus(bookingId, newStatus) {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            const bookingsData = PawpalServices.state?.bookingsData || [];
            const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
            if (!booking) return;

            let dbStatus = 'PENDING';
            if (newStatus === 'confirmed') dbStatus = 'CONFIRMED';
            else if (newStatus === 'in_progress') dbStatus = 'IN_PROGRESS';
            else if (newStatus === 'completed') dbStatus = 'COMPLETED';
            else if (newStatus === 'cancelled') dbStatus = 'CANCELLED';

            if (client && booking.dbId) {
                await client.from('appointment').update({ appointment_status: dbStatus }).eq('id', booking.dbId);
            }
            booking.status = newStatus;
            renderBookingsTable();
            updateKPIs();
            renderUpcomingBar();
            PawpalServices.showToast(`Đã chuyển trạng thái lịch hẹn ${booking.id} sang ${newStatus}!`);
        } catch (err) {
            console.error('Update booking status error:', err);
        }
    }

    function openIntakeModal(bookingId, mode = 'intake') {
        const modal = document.getElementById('modalIntakeSafety');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('data-booking-id', bookingId);
    }

    function openChangeStaffModal(bookingId) {
        const modal = document.getElementById('modalChangeStaff');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('data-booking-id', bookingId);
    }

    function openSurchargeModal(bookingId) {
        const modal = document.getElementById('modalAddSurcharge');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('data-booking-id', bookingId);
    }

    function openCompleteBookingModal(bookingId) {
        const modal = document.getElementById('modalCompleteBooking');
        if (!modal) return;
        modal.classList.add('active');
        modal.setAttribute('data-booking-id', bookingId);
    }

    function openCancelModal(bookingId) {
        PawpalServices.showServiceConfirmModal({
            title: 'Hủy lịch hẹn dịch vụ',
            message: `Bạn có chắc chắn muốn hủy lịch hẹn ${bookingId}?`,
            acceptText: 'Hủy lịch',
            onAccept: () => {
                updateBookingStatus(bookingId, 'cancelled');
            }
        });
    }

    function escalateBookingToComplaint(bookingId) {
        sessionStorage.setItem('pawpal_admin_complaint_from_booking', bookingId);
        window.location.hash = '#tab-complaint-services';
        const complaintNav = document.querySelector('.admin-nav-item[data-module="Khiếu nại"]');
        if (complaintNav) complaintNav.click();
    }

    function setupBookingModals() {
        // Đóng các modal khi bấm nút Đóng, Hủy bỏ hoặc bấm ra ngoài overlay
        document.querySelectorAll('.admin-modal-overlay .modal-btn-close-text, .admin-modal-overlay [id^="btnClose"], .admin-modal-overlay [id^="btnCancel"], .admin-modal-overlay [id^="btnDismiss"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.admin-modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        // Modal Lịch trực KTV
        const btnOpenStaffSchedule = document.getElementById('btnOpenStaffScheduleModal');
        const modalStaffSchedule = document.getElementById('modalStaffSchedule');
        if (btnOpenStaffSchedule && modalStaffSchedule) {
            btnOpenStaffSchedule.addEventListener('click', () => {
                modalStaffSchedule.classList.add('active');
            });
        }

        // Modal Thêm lịch hẹn mới
        const btnOpenCreateBooking = document.getElementById('btnOpenCreateBookingModal');
        const modalCreateBooking = document.getElementById('modalCreateBooking');
        const btnCloseCreateBooking = document.getElementById('btnCloseCreateBooking');
        const btnCancelCreateBooking = document.getElementById('btnCancelCreateBooking');
        const formCreateBooking = document.getElementById('formCreateBooking');

        const closeCreateModal = () => {
            if (modalCreateBooking) modalCreateBooking.classList.remove('active');
            if (formCreateBooking) formCreateBooking.reset();
        };

        if (btnOpenCreateBooking && modalCreateBooking) {
            btnOpenCreateBooking.addEventListener('click', () => {
                // Điền ngày hiện tại làm mặc định
                const dateInput = document.getElementById('newBookingDate');
                if (dateInput && !dateInput.value) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
                // Điền danh sách KTV vào select nếu chưa có
                const staffSelect = document.getElementById('newBookingStaff');
                const staffList = PawpalServices.state?.liveStaffList || [];
                if (staffSelect && staffList.length > 0 && staffSelect.options.length <= 1) {
                    staffList.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.full_name;
                        opt.textContent = `${s.full_name} (${s.specialization || s.role || 'KTV'})`;
                        staffSelect.appendChild(opt);
                    });
                }
                modalCreateBooking.classList.add('active');
            });
        }

        if (btnCloseCreateBooking) btnCloseCreateBooking.addEventListener('click', closeCreateModal);
        if (btnCancelCreateBooking) btnCancelCreateBooking.addEventListener('click', closeCreateModal);

        // Submit form tạo lịch hẹn
        const btnSubmitCreateBooking = document.getElementById('btnSubmitCreateBooking');
        if (btnSubmitCreateBooking) {
            btnSubmitCreateBooking.addEventListener('click', async (e) => {
                if (e) e.preventDefault();

                const customer = (document.getElementById('newBookingCustomer')?.value || '').trim();
                const phone = (document.getElementById('newBookingPhone')?.value || '').trim();
                const petName = (document.getElementById('newBookingPetName')?.value || '').trim();
                const category = document.getElementById('newBookingCategory')?.value || 'Spa';
                const serviceSelect = document.getElementById('newBookingServiceSelect');
                const serviceName = serviceSelect?.value || (category === 'Hotel' ? 'Phòng Deluxe' : (category === 'Taxi' ? 'Dịch Vụ Xe Đưa Đón Tận Nơi' : 'Gói Tắm Dưỡng Premium'));
                const date = document.getElementById('newBookingDate')?.value || new Date().toISOString().split('T')[0];
                const time = document.getElementById('newBookingTime')?.value || '09:00';
                const staff = document.getElementById('newBookingStaff')?.value || 'Chưa phân công';
                const petAlert = (document.getElementById('newBookingPetAlert')?.value || '').trim();
                const note = (document.getElementById('newBookingNotes')?.value || '').trim();

                if (!customer) {
                    PawpalServices.showToast('Vui lòng nhập tên khách hàng!', 'warning');
                    document.getElementById('newBookingCustomer')?.focus();
                    return;
                }
                if (!petName) {
                    PawpalServices.showToast('Vui lòng nhập tên bé cưng!', 'warning');
                    document.getElementById('newBookingPetName')?.focus();
                    return;
                }

                const newId = 'BKG-' + (2000 + Math.floor(Math.random() * 8000));
                const newBooking = {
                    id: newId,
                    dbId: null,
                    userId: 'CUST-NEW',
                    customerName: customer,
                    phone: phone || '—',
                    petName: petName,
                    petBreed: 'Thú cưng',
                    petId: 'PET-NEW',
                    petWeight: '5.0 kg',
                    petAge: 'Chưa rõ',
                    petAlert: petAlert || null,
                    category: category,
                    categoryName: category === 'Hotel' ? 'Pet Hotel' : (category === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming'),
                    serviceName: serviceName,
                    duration: '60 phút',
                    date: date,
                    time: time,
                    staff: staff !== 'Chưa phân công' ? staff : null,
                    price: 250000,
                    total: 250000,
                    paymentStatus: 'Chưa thu',
                    status: 'pending',
                    alertType: null,
                    careLogs: [],
                    timeline: [
                        { title: 'Đặt lịch hẹn', time: time, desc: 'Tạo lịch tại quầy / qua điện thoại', done: true },
                        { title: 'Tiếp nhận an toàn', time: '--:--', desc: 'Chưa tiếp nhận', done: false },
                        { title: 'Thực hiện dịch vụ', time: '--:--', desc: serviceName, done: false },
                        { title: 'Hoàn tất & Trả bé', time: '--:--', desc: 'Bàn giao cho chủ nuôi', done: false }
                    ]
                };

                const bookingsData = PawpalServices.state?.bookingsData || [];
                bookingsData.unshift(newBooking);

                // Lưu vào Supabase
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        const { data: inserted } = await client.from('appointment').insert([{
                            appointment_code: newId,
                            appointment_date: date,
                            appointment_time: time + ':00',
                            appointment_status: 'CONFIRMED',
                            payment_status: 'UNPAID',
                            total_price: 250000,
                            note: note || petAlert || null
                        }]).select().single();
                        if (inserted) newBooking.dbId = inserted.id;
                    }
                } catch (err) {
                    console.warn('[PawpalServices] Lưu lịch hẹn mới vào CSDL:', err);
                }

                renderBookingsTable();
                updateKPIs();
                renderUpcomingBar();
                closeCreateModal();
                PawpalServices.showToast(`Đã thêm lịch hẹn ${newId} thành công!`);
            });
        }

        // Tự động chuyển đổi các trường đặc thù theo Phân nhóm dịch vụ (Spa / Hotel / Taxi)
        const catSelect = document.getElementById('newBookingCategory');
        const hotelFields = document.getElementById('createBookingHotelFields');
        const taxiFields = document.getElementById('createBookingTaxiFields');
        const spaFields = document.getElementById('createBookingSpaFields');
        const svcSelect = document.getElementById('newBookingServiceSelect');

        function updateCategoryOptions() {
            const val = catSelect ? catSelect.value : 'Spa';
            if (hotelFields) hotelFields.style.display = (val === 'Hotel') ? 'block' : 'none';
            if (taxiFields) taxiFields.style.display = (val === 'Taxi') ? 'block' : 'none';
            if (spaFields) spaFields.style.display = (val === 'Spa') ? 'block' : 'none';

            if (svcSelect) {
                svcSelect.innerHTML = '<option value="">-- Chọn dịch vụ --</option>';
                const servicesData = PawpalServices.state?.servicesData || [];
                const targetGroup = val.toLowerCase();
                const filtered = servicesData.filter(s => s.group === targetGroup || s.category === targetGroup);
                if (filtered.length > 0) {
                    filtered.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.name;
                        opt.textContent = `${s.name} (${s.duration || '60p'})`;
                        svcSelect.appendChild(opt);
                    });
                } else {
                    const defaults = val === 'Hotel' 
                        ? ['Phòng Standard (180k/đêm)', 'Phòng Deluxe (380k/đêm)', 'Luxury Suite (500k/đêm)']
                        : (val === 'Taxi' 
                            ? ['Dịch Vụ Xe Đưa Đón Tận Nơi 1 Chiều', 'Dịch Vụ Xe Đưa Đón 2 Chiều']
                            : ['Gói Tắm Vệ Sinh Cơ Bản', 'Gói Tắm Dưỡng Premium', 'Grooming Cắt Tỉa Tạo Kiểu']);
                    defaults.forEach(d => {
                        const opt = document.createElement('option');
                        opt.value = d;
                        opt.textContent = d;
                        svcSelect.appendChild(opt);
                    });
                }
            }
        }
        if (catSelect) catSelect.addEventListener('change', updateCategoryOptions);

        // Chip gợi ý nhanh lý do / lưu ý
        document.querySelectorAll('#quickBookingAlertChips .reason-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const alertInp = document.getElementById('newBookingPetAlert');
                if (alertInp) {
                    const cur = alertInp.value.trim();
                    alertInp.value = cur ? `${cur}, ${chip.textContent.trim()}` : chip.textContent.trim();
                }
            });
        });
        document.querySelectorAll('#quickBookingNotesChips .reason-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const notesInp = document.getElementById('newBookingNotes');
                if (notesInp) {
                    const cur = notesInp.value.trim();
                    notesInp.value = cur ? `${cur}, ${chip.textContent.trim()}` : chip.textContent.trim();
                }
            });
        });

        // Xác nhận tiếp nhận an toàn
        const btnConfirmIntake = document.getElementById('btnSubmitIntakeRecord');
        if (btnConfirmIntake) {
            btnConfirmIntake.addEventListener('click', () => {
                const modal = document.getElementById('modalIntakeSafety');
                const bookingId = modal?.getAttribute('data-booking-id');
                if (bookingId) {
                    updateBookingStatus(bookingId, 'in_progress');
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        // Xác nhận hoàn thành ca làm
        const btnSubmitComplete = document.getElementById('btnSubmitCompleteBooking');
        if (btnSubmitComplete) {
            btnSubmitComplete.addEventListener('click', () => {
                const modal = document.getElementById('modalCompleteBooking');
                const bookingId = modal?.getAttribute('data-booking-id');
                if (bookingId) {
                    updateBookingStatus(bookingId, 'completed');
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        // Xác nhận đổi KTV
        const btnSubmitChangeStaff = document.getElementById('btnSubmitChangeStaff');
        if (btnSubmitChangeStaff) {
            btnSubmitChangeStaff.addEventListener('click', async () => {
                const modal = document.getElementById('modalChangeStaff');
                const bookingId = modal?.getAttribute('data-booking-id');
                const newStaff = document.getElementById('changeStaffSelect')?.value;
                if (!newStaff) {
                    PawpalServices.showToast('Vui lòng chọn KTV mới!', 'warning');
                    return;
                }
                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (booking) {
                    booking.staff = newStaff;
                    try {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (client && booking.dbId) {
                            const staffObj = (PawpalServices.state?.liveStaffList || []).find(s => s.full_name === newStaff);
                            if (staffObj) {
                                await client.from('appointment').update({ staff_id: staffObj.id }).eq('id', booking.dbId);
                            }
                        }
                    } catch (e) {}
                    renderBookingsTable();
                    PawpalServices.showToast(`Đã đổi KTV phụ trách sang ${newStaff}!`);
                    if (modal) modal.classList.remove('active');
                }
            });
        }
    }

    PawpalServices.subtabs.bookings = {
        init: initBookingsSubtab,
        renderBookingsTable,
        updateKPIs,
        renderUpcomingBar,
        clearBookingSearchAndFilters,
        updateBookingStatus,
        openIntakeModal,
        openChangeStaffModal,
        openSurchargeModal,
        openCompleteBookingModal,
        openCancelModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBookingsSubtab);
    } else {
        initBookingsSubtab();
    }
})();
