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
                <button type="button" class="dropdown-item" data-action="add-surcharge">
                    Thêm phụ phí
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

        if (!PawpalServices.state.isLoaded) return;
        const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const total = bookingsData.filter(booking => booking.date?.slice(0,10) === today).length;
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
        if (PawpalServices.state.loadError || !PawpalServices.state.isLoaded) {
            if (PawpalServices.state.loadError) {
                delete tbody.dataset.loadingSkeleton;
                tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:28px;">Không thể tải dữ liệu dịch vụ. Vui lòng tải lại trang.</td></tr>';
            }
            return;
        }
        delete tbody.dataset.loadingSkeleton;


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
                        ${[item.roomCode, item.nights ? `${item.nights} đêm` : '', item.dietPlan].filter(Boolean).join(' • ')}
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
                        ${shortPickup}${item.dropoffAddress ? ` ➔ ${item.dropoffAddress}` : ''}${item.distanceKm ? ` (${item.distanceKm} km)` : ''}
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

    function checkIntakeWeightDiscrepancy(origWeight) {
        const weightInput = document.getElementById('intakePetWeightInput');
        const alertBox = document.getElementById('intakeWeightAlertBox');
        const alertText = document.getElementById('intakeWeightAlertText');
        if (!weightInput || !alertBox || !alertText) return;

        const currentWeight = parseFloat(weightInput.value) || origWeight;
        const diff = Math.round((currentWeight - origWeight) * 10) / 10;

        if (diff >= 0.5) {
            alertBox.style.display = 'block';
            alertText.textContent = `Bé vượt ${diff} kg so với đăng ký (${origWeight} kg ➔ ${currentWeight} kg), chênh lệch phân khúc cân nặng!`;
        } else if (diff <= -0.5) {
            alertBox.style.display = 'block';
            alertText.textContent = `Bé nhẹ hơn ${Math.abs(diff)} kg so với đăng ký (${origWeight} kg ➔ ${currentWeight} kg).`;
        } else {
            alertBox.style.display = 'none';
        }
    }

    function renderIntakeProofPreview() {
        const previewList = document.getElementById('intakeProofPreviewList');
        if (!previewList) return;
        previewList.innerHTML = '';
        intakeProofImagesTemp.forEach((url, idx) => {
            const thumb = document.createElement('div');
            thumb.className = 'intake-proof-item';
            thumb.style.position = 'relative';
            thumb.innerHTML = `
                <img src="${url}" alt="Bằng chứng tiếp nhận" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral);">
                <span class="btn-del-proof" style="position: absolute; top: -5px; right: -5px; background: #DC2626; color: #fff; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</span>
            `;
            thumb.querySelector('.btn-del-proof').addEventListener('click', () => {
                intakeProofImagesTemp.splice(idx, 1);
                renderIntakeProofPreview();
            });
            previewList.appendChild(thumb);
        });
    }

    function openIntakeModal(bookingId, mode = 'intake') {
        const modal = document.getElementById('modalEditIntakeInfo') || document.getElementById('modalIntakeSafety');
        if (!modal) return;

        const bookingsData = PawpalServices.state?.bookingsData || [];
        const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
        modal.setAttribute('data-booking-id', bookingId);

        const modeHidden = document.getElementById('intakeModalMode');
        if (modeHidden) modeHidden.value = mode;

        const titleEl = document.getElementById('intakeModalTitle');
        const submitBtn = document.getElementById('intakeModalSubmitBtn') || document.getElementById('btnSubmitIntakeRecord');
        const summaryEl = document.getElementById('intakePetSummary');

        if (titleEl) {
            titleEl.textContent = mode === 'edit' ? 'Biên bản tiếp nhận bé và kiểm tra an toàn' : 'Tiếp nhận bé và kiểm tra an toàn';
        }
        if (submitBtn) {
            submitBtn.textContent = mode === 'edit' ? 'Lưu biên bản tiếp nhận' : 'Xác nhận tiếp nhận và bắt đầu ca';
        }

        if (summaryEl && booking) {
            summaryEl.textContent = `Mã ca: ${booking.id} • Bé: ${booking.petName || 'Bé cưng'} • Chủ nuôi: ${booking.customerName || 'Khách hàng'}`;
        }

        // Nạp danh sách KTV vào select
        const staffSelect = document.getElementById('intakeStaffSelect');
        if (staffSelect) {
            const staffList = PawpalServices.state?.liveStaffList || [];
            staffSelect.innerHTML = '<option value="">-- Chọn KTV tiếp nhận --</option>';
            staffList.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.full_name;
                opt.textContent = s.full_name;
                staffSelect.appendChild(opt);
            });
            if (booking && booking.staff) {
                staffSelect.value = booking.staff;
            }
        }

        // Cân nặng ban đầu & Cân nặng thực tế
        const origWeightVal = booking ? (parseFloat(booking.originalWeight) || parseFloat(booking.petWeight) || 4.2) : 4.2;
        const origWeightLabel = document.getElementById('intakeOriginalWeightLabel');
        if (origWeightLabel) {
            origWeightLabel.textContent = `(Đăng ký: ${origWeightVal} kg)`;
        }

        const weightInput = document.getElementById('intakePetWeightInput');
        if (weightInput) {
            weightInput.value = booking?.intakeRecord?.actualWeight || origWeightVal;
            weightInput.oninput = () => checkIntakeWeightDiscrepancy(origWeightVal);
        }

        checkIntakeWeightDiscrepancy(origWeightVal);

        // Nạp dữ liệu checklist ngoại quan
        const intake = booking?.intakeRecord || {};
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = Boolean(val); };

        setCheck('checkSkinNormal', intake.skinCoat ? intake.skinCoat.includes('Sạch sẽ') || intake.skinCoat.includes('sạch sẽ') : true);
        setCheck('checkSkinFleas', intake.skinCoat ? intake.skinCoat.includes('ve rận') : false);
        setCheck('checkSkinFungus', intake.skinCoat ? intake.skinCoat.includes('nấm') : false);
        setCheck('checkSkinMatted', intake.skinCoat ? intake.skinCoat.includes('rối') : false);

        setCheck('checkEyesEarsNormal', intake.eyesEars ? intake.eyesEars.includes('bình thường') || intake.eyesEars.includes('Bình thường') : true);
        setCheck('checkEyesDischarge', intake.eyesEars ? intake.eyesEars.includes('ghèn') || intake.eyesEars.includes('Đỏ mắt') : false);
        setCheck('checkEarsInfection', intake.eyesEars ? intake.eyesEars.includes('viêm tai') || intake.eyesEars.includes('Sáp tai') : false);
        setCheck('checkNoseRunny', intake.eyesEars ? intake.eyesEars.includes('mũi') : false);

        const hasWounds = intake.wounds && !intake.wounds.includes('Không có');
        setCheck('checkWoundNone', !hasWounds);
        setCheck('checkWoundExisting', hasWounds);

        const woundNote = document.getElementById('intakeExistingWoundNote');
        if (woundNote) woundNote.value = intake.woundNote || '';

        const tempRadios = document.querySelectorAll('input[name="intakeTemperamentRadio"]');
        tempRadios.forEach(r => {
            r.checked = (r.value === (intake.temperament || 'Ngoan hiền'));
        });

        const belongingsInput = document.getElementById('intakeBelongingsInput');
        if (belongingsInput) belongingsInput.value = intake.belongingsNote || '';
        document.querySelectorAll('.check-belonging-item').forEach(cb => {
            cb.checked = intake.belongings ? intake.belongings.includes(cb.value) : false;
        });

        // Bằng chứng ảnh
        intakeProofImagesTemp = Array.isArray(intake.proofPhotos) ? [...intake.proofPhotos] : [];
        renderIntakeProofPreview();

        modal.classList.add('active');
    }

    function openChangeStaffModal(bookingId) {
        const modal = document.getElementById('modalChangeStaff');
        if (!modal) return;

        const bookingsData = PawpalServices.state?.bookingsData || [];
        const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
        modal.setAttribute('data-booking-id', bookingId);

        const currentStaffName = booking?.staff || 'Ngọc Anh';

        // Meta thông tin ca
        const metaEl = document.getElementById('changeStaffBookingMeta');
        if (metaEl) {
            metaEl.textContent = `Mã ca: ${booking?.id || bookingId} (${booking?.petName || 'Bé cưng'}) • KTV hiện tại: ${currentStaffName}`;
        }

        const currentNameEl = document.getElementById('changeStaffCurrentName');
        if (currentNameEl) {
            currentNameEl.textContent = currentStaffName;
        }

        // Nạp danh sách KTV mới vào select (loại trừ KTV hiện tại)
        const staffSelect = document.getElementById('changeStaffSelect');
        if (staffSelect) {
            const staffList = PawpalServices.state?.liveStaffList || [];
            staffSelect.innerHTML = '<option value="">-- Chọn KTV mới --</option>';
            staffList.forEach(s => {
                if (s.full_name !== currentStaffName) {
                    const opt = document.createElement('option');
                    opt.value = s.full_name;
                    opt.textContent = `${s.full_name} (${s.specialty || 'KTV Spa'})`;
                    staffSelect.appendChild(opt);
                }
            });
            // Nếu chưa có KTV nào khác trong danh sách, nạp danh sách mẫu
            if (staffSelect.options.length <= 1) {
                const sampleStaffs = ['Trần Minh Hoàng', 'Hoàng Bảo Vy', 'Nguyễn Văn Đạt', 'Lê Khánh Linh'];
                sampleStaffs.forEach(name => {
                    if (name !== currentStaffName) {
                        const opt = document.createElement('option');
                        opt.value = name;
                        opt.textContent = `${name} (KTV Chuyên sâu)`;
                        staffSelect.appendChild(opt);
                    }
                });
            }
        }

        // Reset lý do
        const presetReason = document.getElementById('changeStaffPresetReason');
        if (presetReason) presetReason.value = 'CUSTOM';

        const reasonInp = document.getElementById('changeStaffReasonInput');
        if (reasonInp) reasonInp.value = '';

        const hintEl = document.getElementById('changeStaffWorkloadHint');
        if (hintEl) hintEl.style.display = 'none';

        modal.classList.add('active');
    }

    function openSurchargeModal(bookingId) {
        const modal = document.getElementById('modalAddSurcharge');
        if (!modal) return;

        const bookingsData = PawpalServices.state?.bookingsData || [];
        const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);

        const metaEl = document.getElementById('surchargeBookingMeta');
        if (metaEl) {
            if (booking) {
                metaEl.textContent = `Mã ca: ${booking.id} • Bé: ${booking.petName || 'Bé cưng'} • KTV phụ trách: ${booking.staff || 'Chưa phân công'}`;
            } else {
                metaEl.textContent = `Mã ca: ${bookingId}`;
            }
        }

        const form = document.getElementById('formAddSurcharge');
        if (form) form.reset();

        const presetSelect = document.getElementById('surchargePresetSelect');
        if (presetSelect) presetSelect.value = 'CUSTOM';

        const commissionEarnedEl = document.getElementById('surchargeCommissionEarned');
        if (commissionEarnedEl) commissionEarnedEl.textContent = '0 đ';

        const previewList = document.getElementById('surchargeProofPreviewList');
        if (previewList) previewList.innerHTML = '';
        surchargeProofImagesTemp = [];

        modal.setAttribute('data-booking-id', bookingId);
        modal.classList.add('active');
    }

    function renderCompleteProofPreview() {
        const previewList = document.getElementById('completeProofPreviewList');
        if (!previewList) return;
        previewList.innerHTML = '';
        completeProofImagesTemp.forEach((url, idx) => {
            const thumb = document.createElement('div');
            thumb.className = 'intake-proof-item';
            thumb.style.position = 'relative';
            thumb.innerHTML = `
                <img src="${url}" alt="Ảnh thành phẩm" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral);">
                <span class="btn-del-proof" style="position: absolute; top: -5px; right: -5px; background: #DC2626; color: #fff; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</span>
            `;
            thumb.querySelector('.btn-del-proof').addEventListener('click', () => {
                completeProofImagesTemp.splice(idx, 1);
                renderCompleteProofPreview();
            });
            previewList.appendChild(thumb);
        });
    }

    function calculateCompleteTotal(booking) {
        if (!booking) return { finalTotal: 250000, totalDiscount: 0, earnedPoints: 25 };
        const basePrice = booking.price || booking.basePrice || 250000;
        const accompanyingTotal = (booking.accompanyingServices || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const surchargeTotal = (booking.surcharges || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0) + (booking.surchargePrice || 0);
        const subtotal = basePrice + accompanyingTotal + surchargeTotal;

        const voucherVal = parseFloat(document.getElementById('completeVoucherSelect')?.value || 0);
        let voucherDiscount = 0;
        if (voucherVal > 0 && voucherVal < 1) {
            voucherDiscount = Math.round(subtotal * voucherVal);
        } else if (voucherVal >= 1) {
            voucherDiscount = voucherVal;
        }

        const pointsVal = parseInt(document.getElementById('completePointsSelect')?.value || 0, 10);
        const pointsDiscount = pointsVal * 100; // 100 điểm = 10.000 đ

        const totalDiscount = voucherDiscount + pointsDiscount;
        const finalTotal = Math.max(0, subtotal - totalDiscount);
        const earnedPoints = Math.floor(finalTotal / 10000);

        const formatCurrency = PawpalServices.formatCurrency || (num => `${num.toLocaleString('vi-VN')} đ`);

        const discEl = document.getElementById('completePriceDiscount');
        const totalEl = document.getElementById('completePriceTotal');
        const pointsEl = document.getElementById('completeEarnedPointsText');

        if (discEl) discEl.textContent = totalDiscount > 0 ? `-${formatCurrency(totalDiscount)}` : '-0 đ';
        if (totalEl) totalEl.textContent = formatCurrency(finalTotal);
        if (pointsEl) pointsEl.textContent = `+${earnedPoints} Pawpoint`;

        return { finalTotal, totalDiscount, earnedPoints };
    }

    function openCompleteBookingModal(bookingId) {
        const modal = document.getElementById('modalCompleteBooking');
        if (!modal) return;

        const bookingsData = PawpalServices.state?.bookingsData || [];
        const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
        modal.setAttribute('data-booking-id', bookingId);

        const formatCurrency = PawpalServices.formatCurrency || (num => `${num.toLocaleString('vi-VN')} đ`);

        // Meta thông tin ca
        const metaEl = document.getElementById('completeBookingMeta');
        if (metaEl && booking) {
            metaEl.textContent = `Mã ca: ${booking.id} • Bé: ${booking.petName || 'Bé cưng'} • Chủ nuôi: ${booking.customerName || 'Khách hàng'}`;
        }

        // Tiến độ Care-Log
        const progressEl = document.getElementById('completeStepsProgressText');
        if (progressEl) {
            const logs = booking?.carelogs || booking?.careLogs || [];
            if (logs.length > 0) {
                const doneCount = logs.filter(l => l.completed).length;
                progressEl.textContent = `${doneCount}/${logs.length} bước đã thực hiện (${Math.round((doneCount / logs.length) * 100)}%)`;
                progressEl.style.color = doneCount === logs.length ? '#16A34A' : '#D97706';
            } else {
                progressEl.textContent = 'Quy trình đã hoàn tất nghiệm thu';
                progressEl.style.color = '#16A34A';
            }
        }

        // Tư trang đã gửi
        const belongingsDesc = document.getElementById('completeBelongingsDesc');
        if (belongingsDesc) {
            const b = booking?.intakeRecord;
            const bText = b?.belongingsNote || (Array.isArray(b?.belongings) && b.belongings.length > 0 ? b.belongings.join(', ') : '');
            belongingsDesc.textContent = bText ? `Tư trang gửi lại: ${bText}` : 'Không có đồ dùng gửi lại quầy lúc tiếp nhận.';
        }

        // Nạp các khoản chi phí
        const basePrice = booking?.price || booking?.basePrice || 250000;
        const accompanyingTotal = (booking?.accompanyingServices || []).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const surchargeTotal = (booking?.surcharges || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0) + (booking?.surchargePrice || 0);

        const baseEl = document.getElementById('completePriceBase');
        const accEl = document.getElementById('completePriceAccompanying');
        const addonsEl = document.getElementById('completePriceAddons');

        if (baseEl) baseEl.textContent = formatCurrency(basePrice);
        if (accEl) accEl.textContent = accompanyingTotal > 0 ? `+${formatCurrency(accompanyingTotal)}` : '+0 đ';
        if (addonsEl) addonsEl.textContent = surchargeTotal > 0 ? `+${formatCurrency(surchargeTotal)}` : '+0 đ';

        // Reset voucher và điểm
        const voucherSelect = document.getElementById('completeVoucherSelect');
        const pointsSelect = document.getElementById('completePointsSelect');
        if (voucherSelect) voucherSelect.value = '0';
        if (pointsSelect) pointsSelect.value = '0';

        calculateCompleteTotal(booking);

        if (voucherSelect) {
            voucherSelect.onchange = () => calculateCompleteTotal(booking);
        }
        if (pointsSelect) {
            pointsSelect.onchange = () => calculateCompleteTotal(booking);
        }

        // Reset ảnh thành phẩm
        completeProofImagesTemp = [];
        renderCompleteProofPreview();

        modal.classList.add('active');
    }

    let currentCancelingBookingId = null;

    function openCancelModal(bookingId) {
        const modal = document.getElementById('modalCancelBooking');
        if (!modal) return;

        currentCancelingBookingId = bookingId;
        const codeDisplay = document.getElementById('cancelBookingCodeDisplay');
        if (codeDisplay) {
            codeDisplay.textContent = bookingId;
        }

        const reasonSelect = document.getElementById('cancelBookingReasonSelect');
        if (reasonSelect) {
            reasonSelect.value = 'Khách bận đột xuất';
        }

        const reasonDetail = document.getElementById('cancelBookingReasonDetail');
        if (reasonDetail) {
            reasonDetail.value = '';
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
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

        // ====================================================================
        // MODAL 14: LỊCH TRỰC VÀ ĐIỀU PHỐI KỸ THUẬT VIÊN
        // ====================================================================
        function renderStaffScheduleModal(shiftFilter = 'ALL') {
            const grid = document.getElementById('staffScheduleGrid');
            const totalStaffEl = document.getElementById('summaryTotalStaffCount');
            const totalAssignedEl = document.getElementById('summaryTotalAssignedBookings');
            const avgCapacityEl = document.getElementById('summaryAvgCapacity');
            const overloadedEl = document.getElementById('summaryOverloadedCount');
            if (!grid) return;

            const liveStaff = PawpalServices.state?.liveStaffList || [];
            const defaultStaffList = [
                { id: 'STF-01', name: 'Nguyễn Ngọc Anh', role: 'Senior Groomer', shift: 'MORNING' },
                { id: 'STF-02', name: 'Trần Văn Nhân Viên', role: 'Junior Groomer', shift: 'MORNING' },
                { id: 'STF-03', name: 'Lê Thu Trang', role: 'Senior Groomer', shift: 'AFTERNOON' },
                { id: 'STF-04', name: 'Phạm Minh Trí', role: 'Grooming Master', shift: 'AFTERNOON' },
                { id: 'STF-05', name: 'Vũ Hoàng Nam', role: 'Bather Specialist', shift: 'EVENING' },
                { id: 'STF-06', name: 'Đặng Thảo Vy', role: 'Pet Care Associate', shift: 'EVENING' }
            ];

            const staffList = liveStaff.length > 0 
                ? liveStaff.map((s, idx) => ({
                    id: s.id || `STF-0${idx + 1}`,
                    name: s.full_name || s.name,
                    role: s.role || 'Kỹ thuật viên',
                    shift: idx % 3 === 0 ? 'MORNING' : (idx % 3 === 1 ? 'AFTERNOON' : 'EVENING')
                }))
                : defaultStaffList;

            const bookings = PawpalServices.state?.bookingsData || [];
            
            // Lọc theo ca
            const filteredStaff = shiftFilter === 'ALL' 
                ? staffList 
                : staffList.filter(s => s.shift === shiftFilter);

            let totalAssigned = 0;
            let overloadedCount = 0;

            const cardsHtml = filteredStaff.map(staff => {
                const assignedBookings = bookings.filter(b => (b.staff || '').toLowerCase().includes(staff.name.toLowerCase()) || staff.name.toLowerCase().includes((b.staff || '').toLowerCase()));
                const count = assignedBookings.length || Math.floor(Math.random() * 3) + 1;
                totalAssigned += count;
                const maxCap = 4;
                const capPct = Math.min(100, Math.round((count / maxCap) * 100));
                if (capPct >= 100) overloadedCount++;

                const statusClass = capPct >= 100 ? 'danger' : (capPct >= 75 ? 'warning' : '');
                const initials = staff.name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();

                const shiftLabel = staff.shift === 'MORNING' ? 'Ca sáng (08:00 - 12:00)' : (staff.shift === 'AFTERNOON' ? 'Ca chiều (13:00 - 17:00)' : 'Ca tối (17:00 - 21:00)');

                return `
                    <div class="ktv-schedule-card">
                        <div class="ktv-schedule-card-header">
                            <div class="ktv-schedule-avatar">${initials}</div>
                            <div class="ktv-schedule-info">
                                <div class="ktv-schedule-name">${staff.name}</div>
                                <div class="ktv-schedule-role">${staff.role} • ${shiftLabel}</div>
                            </div>
                            <span class="admin-badge ${capPct >= 100 ? 'badge-danger' : (capPct >= 75 ? 'badge-warning' : 'badge-success')}">
                                ${count}/${maxCap} ca (${capPct}%)
                            </span>
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted);">
                                <span>Tiến độ tải ca trong ngày</span>
                                <span>${count >= maxCap ? 'Đầy tải' : 'Sẵn sàng nhận thêm'}</span>
                            </div>
                            <div class="ktv-workload-bar-wrap">
                                <div class="ktv-workload-bar-fill ${statusClass}" style="width: ${capPct}%;"></div>
                            </div>
                        </div>
                        <div class="ktv-assigned-bookings-list">
                            ${assignedBookings.length > 0 ? assignedBookings.slice(0, 3).map(b => `
                                <div class="ktv-assigned-booking-chip">
                                    <span style="font-weight: 600; color: #203A2C;">${b.id} • ${b.petName || 'Bé cưng'}</span>
                                    <span style="color: var(--text-muted);">${b.time || '10:00'} (${b.service || 'Spa'})</span>
                                </div>
                            `).join('') : `
                                <div style="font-size: 11.5px; color: var(--text-muted); font-style: italic; padding: 4px 0;">
                                    Chưa có ca được chỉ định trong khung giờ này.
                                </div>
                            `}
                        </div>
                    </div>
                `;
            }).join('');

            grid.innerHTML = cardsHtml;

            if (totalStaffEl) totalStaffEl.textContent = filteredStaff.length;
            if (totalAssignedEl) totalAssignedEl.textContent = `${totalAssigned} ca`;
            if (avgCapacityEl) {
                const avg = filteredStaff.length > 0 ? Math.round((totalAssigned / (filteredStaff.length * 4)) * 100) : 0;
                avgCapacityEl.textContent = `${avg}%`;
            }
            if (overloadedEl) overloadedEl.textContent = overloadedCount;
        }

        // Gắn sự kiện tab ca trực trong Modal 14
        document.querySelectorAll('.staff-shift-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.staff-shift-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const shift = btn.getAttribute('data-shift-filter') || 'ALL';
                renderStaffScheduleModal(shift);
            });
        });

        // Nút Quản lý nhân sự trong Modal 14
        const btnNavStaff = document.getElementById('btnNavToStaffModule');
        if (btnNavStaff) {
            btnNavStaff.addEventListener('click', () => {
                const modal = document.getElementById('modalStaffSchedule');
                if (modal) modal.classList.remove('active');
                const staffNav = document.querySelector('.sidebar-menu-btn[data-title="Nhân sự"]');
                if (staffNav) staffNav.click();
            });
        }

        // Nút mở Modal Lịch trực KTV
        const btnOpenStaffSchedule = document.getElementById('btnOpenStaffScheduleModal');
        const modalStaffSchedule = document.getElementById('modalStaffSchedule');
        if (btnOpenStaffSchedule && modalStaffSchedule) {
            btnOpenStaffSchedule.addEventListener('click', () => {
                renderStaffScheduleModal('ALL');
                modalStaffSchedule.classList.add('active');
            });
        }

        // Modal 3: Xác nhận Hủy lịch hẹn
        const quickCancelChips = document.querySelectorAll('#quickCancelReasonChips .reason-quick-chip');
        const cancelReasonDetail = document.getElementById('cancelBookingReasonDetail');
        quickCancelChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (cancelReasonDetail) {
                    cancelReasonDetail.value = chip.textContent.trim();
                    cancelReasonDetail.focus();
                }
            });
        });

        const btnConfirmCancel = document.getElementById('btnConfirmCancelBooking');
        if (btnConfirmCancel) {
            btnConfirmCancel.addEventListener('click', async () => {
                if (!currentCancelingBookingId) return;

                const reasonSelect = document.getElementById('cancelBookingReasonSelect');
                const reasonDetail = document.getElementById('cancelBookingReasonDetail');
                const reasonText = (reasonSelect?.value || 'Khách bận đột xuất') + (reasonDetail?.value ? ` - ${reasonDetail.value.trim()}` : '');

                const bookingToCancel = currentCancelingBookingId;
                updateBookingStatus(bookingToCancel, 'cancelled');

                const modal = document.getElementById('modalCancelBooking');
                if (modal) {
                    modal.classList.remove('active');
                    modal.style.display = 'none';
                }

                if (PawpalServices.showToast) {
                    PawpalServices.showToast(`Đã hủy lịch hẹn ${bookingToCancel} thành công! Lý do: ${reasonText}`);
                }
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
            const hotelF = document.getElementById('createBookingHotelFields');
            const taxiF = document.getElementById('createBookingTaxiFields');
            const spaF = document.getElementById('createBookingSpaFields');
            if (hotelF) hotelF.style.display = 'none';
            if (taxiF) taxiF.style.display = 'none';
            if (spaF) spaF.style.display = 'none';

            const cCard = document.getElementById('bookingSelectedCustomerCard');
            const pCard = document.getElementById('bookingSelectedPetCard');
            const sCard = document.getElementById('bookingSelectedServiceCard');
            if (cCard) cCard.style.display = 'none';
            if (pCard) pCard.style.display = 'none';
            if (sCard) sCard.style.display = 'none';

            const cDrop = document.getElementById('bookingCustomerDropdown');
            const pDrop = document.getElementById('bookingPetDropdown');
            const sDrop = document.getElementById('bookingServiceDropdown');
            if (cDrop) cDrop.style.display = 'none';
            if (pDrop) pDrop.style.display = 'none';
            if (sDrop) sDrop.style.display = 'none';
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
                // Điền danh mục và danh sách gói dịch vụ tương ứng
                if (catSelect && !catSelect.value) catSelect.value = 'Spa';
                updateCategoryOptions();

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

        // ====================================================================
        // QUẢN LÝ PHÂN NHÓM DỊCH VỤ (SPA / HOTEL / TAXI)
        // ====================================================================
        const catSelect = document.getElementById('newBookingCategory');
        const hotelFields = document.getElementById('createBookingHotelFields');
        const taxiFields = document.getElementById('createBookingTaxiFields');
        const spaFields = document.getElementById('createBookingSpaFields');

        function isGroomingService(serviceName) {
            if (!serviceName) return false;
            const s = serviceName.toLowerCase();
            return s.includes('tỉa') || s.includes('cắt') || s.includes('tạo kiểu') || s.includes('grooming') || s.includes('style') || s.includes('nhuộm');
        }

        function updateGroomingFields() {
            const val = catSelect ? catSelect.value : 'Spa';
            const svcName = serviceHidden ? serviceHidden.value : '';
            if (spaFields) {
                spaFields.style.display = (val === 'Spa' && isGroomingService(svcName)) ? 'block' : 'none';
            }
        }

        function updateCategoryOptions() {
            const val = catSelect ? catSelect.value : 'Spa';
            if (hotelFields) hotelFields.style.display = (val === 'Hotel') ? 'block' : 'none';
            if (taxiFields) taxiFields.style.display = (val === 'Taxi') ? 'block' : 'none';
            
            // Reset lựa chọn gói dịch vụ cụ thể khi đổi nhóm dịch vụ
            if (serviceInput) serviceInput.value = '';
            if (serviceHidden) serviceHidden.value = '';
            if (serviceSelectedCard) serviceSelectedCard.style.display = 'none';
            updateGroomingFields();
        }
        if (catSelect) catSelect.addEventListener('change', updateCategoryOptions);

        // ====================================================================
        // CUSTOM AUTOCOMPLETE POPOVER: KHÁCH HÀNG (100% FLAT TEXT-ONLY)
        // ====================================================================
        const customerInput = document.getElementById('newBookingCustomer');
        const customerDropdown = document.getElementById('bookingCustomerDropdown');
        const customerSelectedCard = document.getElementById('bookingSelectedCustomerCard');
        const phoneInput = document.getElementById('newBookingPhone');
        let selectedCustomerObj = null;

        function getAllCustomersList() {
            // 1. Ưu tiên lấy từ phân hệ khách hàng nếu đã nạp
            if (window.PawpalCustomers?.state?.customerDatabase) {
                const list = Object.values(window.PawpalCustomers.state.customerDatabase);
                if (list.length > 0) return list;
            }

            // 2. Lấy từ liveCustomerDirectory trong phân hệ Dịch vụ
            const live = PawpalServices.state?.liveCustomerDirectory || [];
            if (live.length > 0) {
                return live.map(c => {
                    const prof = Array.isArray(c.customer_profile) ? (c.customer_profile[0] || {}) : (c.customer_profile || {});
                    const pets = Array.isArray(c.pet_profile) ? c.pet_profile : [];
                    return {
                        id: c.id,
                        name: prof.full_name || c.full_name || 'Khách hàng PawPal',
                        phone: c.phone_main || '',
                        tierName: c.membership_tier ? `Hạng ${c.membership_tier}` : (prof.tier ? `Hạng ${prof.tier}` : 'Thành viên'),
                        pets: pets.map(p => ({
                            name: p.pet_name,
                            species: p.species || 'Thú cưng',
                            breed: p.breed || 'Chưa rõ giống',
                            weight: p.weight || '',
                            allergy: p.allergy || ''
                        }))
                    };
                });
            }

            // 3. Lấy từ danh sách lịch hẹn hiện hữu (Bookings data)
            const bData = PawpalServices.state?.bookingsData || [];
            const custMap = {};
            bData.forEach(b => {
                if (b.customerName && !custMap[b.customerName]) {
                    custMap[b.customerName] = {
                        id: b.userId || b.id,
                        name: b.customerName,
                        phone: b.phone && b.phone !== '—' ? b.phone : '0901234567',
                        tierName: 'Thành viên',
                        pets: b.petName ? [{
                            name: b.petName,
                            species: 'Thú cưng',
                            breed: b.petBreed || 'Poodle',
                            weight: b.petWeight ? parseFloat(b.petWeight) : 4.5,
                            allergy: b.petAlert || ''
                        }] : []
                    };
                }
            });
            return Object.values(custMap);
        }

        function renderCustomerAutocomplete(query = '') {
            if (!customerDropdown) return;
            const q = (query || '').toLowerCase().trim();
            const customers = getAllCustomersList();
            
            const matches = customers.filter(c => {
                if (!q) return true;
                const name = (c.name || '').toLowerCase();
                const phone = (c.phone || '').replace(/[^0-9]/g, '');
                const cleanQ = q.replace(/[^0-9]/g, '');
                const matchPhone = cleanQ && phone.includes(cleanQ);
                const matchName = name.includes(q);
                const matchPets = (c.pets || []).some(p => (p.name || '').toLowerCase().includes(q));
                return matchName || matchPhone || matchPets;
            }).slice(0, 15);

            if (matches.length === 0) {
                customerDropdown.innerHTML = '<div style="padding: 10px 14px; color: var(--text-muted); font-size: 12.5px; text-align: center;">Không tìm thấy khách hàng phù hợp</div>';
                customerDropdown.style.display = 'block';
                return;
            }

            customerDropdown.innerHTML = '';
            matches.forEach(c => {
                const item = document.createElement('div');
                item.className = 'customer-autocomplete-item';
                const name = c.name || 'Khách vãng lai';
                const phone = c.phone || 'Chưa có SĐT';
                const petList = (c.pets && c.pets.length > 0) 
                    ? ` • Bé: ${c.pets.map(p => p.name).join(', ')}` 
                    : '';
                const tier = c.tierName || 'Thành viên';

                // 100% FLAT TEXT-ONLY: CẤM ICON / AVATAR TRÒN THEO RULE AGENTS.MD
                item.innerHTML = `
                    <div class="customer-autocomplete-meta" style="flex: 1;">
                        <div class="customer-autocomplete-name" style="font-weight: 600; color: #203A2C; font-size: 13.5px;">${name}</div>
                        <div class="customer-autocomplete-phone" style="color: #4F7A65; font-size: 11.5px; margin-top: 2px;">${phone}${petList}</div>
                    </div>
                    <div class="customer-autocomplete-pets" style="font-size: 11.5px; color: #236B48; background: #EEF5F1; padding: 2px 8px; border-radius: 9px; font-weight: 500;">
                        ${tier}
                    </div>
                `;

                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectCustomerItem(c);
                });

                customerDropdown.appendChild(item);
            });

            customerDropdown.style.display = 'block';
        }

        function selectCustomerItem(c) {
            selectedCustomerObj = c;
            const name = c.name || '';
            const phone = c.phone || '';
            if (customerInput) customerInput.value = name;
            if (phoneInput && phone) phoneInput.value = phone;

            if (customerSelectedCard) {
                customerSelectedCard.innerHTML = `
                    <span>Đã chọn: <strong>${name}</strong> (${phone || 'Chưa có SĐT'})</span>
                    <button type="button" class="btn-clear-selection" style="background: none; border: none; color: #236B48; font-size: 12px; cursor: pointer; font-weight: 600; padding: 0 4px;">✕ Bỏ chọn</button>
                `;
                customerSelectedCard.style.display = 'flex';
                customerSelectedCard.querySelector('.btn-clear-selection')?.addEventListener('click', () => {
                    selectedCustomerObj = null;
                    if (customerInput) customerInput.value = '';
                    customerSelectedCard.style.display = 'none';
                });
            }

            if (customerDropdown) customerDropdown.style.display = 'none';

            // Tự động gợi ý thú cưng đầu tiên của khách này
            if (c.pets && c.pets.length > 0) {
                selectPetItem(c.pets[0]);
            }
        }

        if (customerInput) {
            customerInput.addEventListener('focus', () => renderCustomerAutocomplete(customerInput.value));
            customerInput.addEventListener('input', () => renderCustomerAutocomplete(customerInput.value));
        }

        // ====================================================================
        // CUSTOM AUTOCOMPLETE POPOVER: BÉ CƯNG (100% FLAT TEXT-ONLY)
        // ====================================================================
        const petInput = document.getElementById('newBookingPetName');
        const petDropdown = document.getElementById('bookingPetDropdown');
        const petSelectedCard = document.getElementById('bookingSelectedPetCard');
        const petAlertInput = document.getElementById('newBookingPetAlert');

        function renderPetAutocomplete(query = '') {
            if (!petDropdown) return;
            const q = (query || '').toLowerCase().trim();
            let petList = [];

            if (selectedCustomerObj && selectedCustomerObj.pets && selectedCustomerObj.pets.length > 0) {
                petList = selectedCustomerObj.pets;
            } else if (selectedCustomerObj && selectedCustomerObj.pet_profile && selectedCustomerObj.pet_profile.length > 0) {
                petList = selectedCustomerObj.pet_profile;
            } else {
                petList = PawpalServices.state?.livePetDirectory || [];
            }

            const matches = petList.filter(p => {
                const name = (p.pet_name || p.name || '').toLowerCase();
                const breed = (p.breed || '').toLowerCase();
                const species = (p.species || '').toLowerCase();
                return !q || name.includes(q) || breed.includes(q) || species.includes(q);
            }).slice(0, 15);

            if (matches.length === 0) {
                petDropdown.innerHTML = '<div style="padding: 10px 14px; color: var(--text-muted); font-size: 12.5px; text-align: center;">Không tìm thấy bé cưng phù hợp</div>';
                petDropdown.style.display = 'block';
                return;
            }

            petDropdown.innerHTML = '';
            matches.forEach(p => {
                const item = document.createElement('div');
                item.className = 'customer-autocomplete-item';
                const pName = p.pet_name || p.name || 'Bé cưng';
                const details = `${p.species || 'Thú cưng'} • ${p.breed || 'Chưa rõ giống'}${p.weight ? ` • ${p.weight} kg` : ''}`;
                const ownerName = p.customer?.customer_profile?.full_name ? `Chủ: ${p.customer.customer_profile.full_name}` : (selectedCustomerObj?.name ? `Chủ: ${selectedCustomerObj.name}` : 'Bé cưng');

                item.innerHTML = `
                    <div class="customer-autocomplete-meta" style="flex: 1;">
                        <div class="customer-autocomplete-name" style="font-weight: 600; color: #203A2C; font-size: 13.5px;">${pName}</div>
                        <div class="customer-autocomplete-phone" style="color: #4F7A65; font-size: 11.5px; margin-top: 2px;">${details}</div>
                    </div>
                    <div class="customer-autocomplete-pets" style="font-size: 11.5px; color: #236B48; background: #EEF5F1; padding: 2px 8px; border-radius: 9px; font-weight: 500;">
                        ${ownerName}
                    </div>
                `;

                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectPetItem(p);
                });

                petDropdown.appendChild(item);
            });

            petDropdown.style.display = 'block';
        }

        function selectPetItem(p) {
            const petNameStr = p.pet_name || p.name || 'Bé cưng';
            if (petInput) petInput.value = petNameStr;
            if (p.allergy && petAlertInput && !petAlertInput.value) {
                petAlertInput.value = p.allergy;
            }

            if (petSelectedCard) {
                petSelectedCard.innerHTML = `
                    <span>Đã chọn bé: <strong>${petNameStr}</strong> (${p.breed || p.species || 'Thú cưng'})</span>
                    <button type="button" class="btn-clear-selection" style="background: none; border: none; color: #236B48; font-size: 12px; cursor: pointer; font-weight: 600; padding: 0 4px;">✕ Bỏ chọn</button>
                `;
                petSelectedCard.style.display = 'flex';
                petSelectedCard.querySelector('.btn-clear-selection')?.addEventListener('click', () => {
                    if (petInput) petInput.value = '';
                    petSelectedCard.style.display = 'none';
                });
            }

            if (petDropdown) petDropdown.style.display = 'none';

            // Nếu chưa chọn chủ mà pet có thông tin chủ, tự động điền luôn chủ
            if (!selectedCustomerObj && p.customer) {
                const custName = p.customer.customer_profile?.full_name;
                const custPhone = p.customer.phone_main;
                if (custName && customerInput && !customerInput.value) customerInput.value = custName;
                if (custPhone && phoneInput && !phoneInput.value) phoneInput.value = custPhone;
            }
        }

        if (petInput) {
            petInput.addEventListener('focus', () => renderPetAutocomplete(petInput.value));
            petInput.addEventListener('input', () => renderPetAutocomplete(petInput.value));
        }

        // ====================================================================
        // CUSTOM AUTOCOMPLETE POPOVER: GÓI DỊCH VỤ CỤ THỂ (100% FLAT TEXT-ONLY)
        // ====================================================================
        const serviceInput = document.getElementById('newBookingServiceInput');
        const serviceHidden = document.getElementById('newBookingServiceSelect');
        const serviceDropdown = document.getElementById('bookingServiceDropdown');
        const serviceSelectedCard = document.getElementById('bookingSelectedServiceCard');

        function getServicesForCategory(categoryVal) {
            const val = String(categoryVal || 'Spa').toLowerCase();
            const servicesData = PawpalServices.state?.servicesData || [];
            const filtered = servicesData.filter(s => {
                const grp = String(s.group || s.category || '').toLowerCase();
                return grp === val || grp.includes(val);
            });

            if (filtered.length > 0) {
                return filtered.map(s => ({
                    name: s.name,
                    duration: s.duration || '60 phút',
                    price: s.prices?.under5 ? `Từ ${s.prices.under5} đ` : 'Liên hệ',
                    desc: s.desc || ''
                }));
            }

            if (val === 'hotel') {
                return [
                    { name: 'Phòng Standard (STD-01)', duration: 'Theo ngày', price: '180.000 đ/ngày', desc: 'Chuồng inox sạch sẽ, điều hòa' },
                    { name: 'Phòng Deluxe (DLX-04)', duration: 'Theo ngày', price: '380.000 đ/ngày', desc: 'Phòng gỗ máy lạnh 24/7, vận động' },
                    { name: 'Phòng VIP Penthouse (VIP-02)', duration: 'Theo ngày', price: '500.000 đ/ngày', desc: 'Camera riêng 24/7, thực đơn riêng' }
                ];
            } else if (val === 'taxi') {
                return [
                    { name: 'Dịch Vụ Xe Đưa Đón 2 Chiều Khứ Hồi', duration: 'Linh hoạt', price: 'Từ 120.000 đ', desc: 'Đón tận nơi và đưa về sau khi xong' },
                    { name: 'Dịch Vụ Xe Đưa Đón 1 Chiều Đến Quầy', duration: 'Linh hoạt', price: 'Từ 70.000 đ', desc: 'Đón tận nơi giao đến PawPal' },
                    { name: 'Dịch Vụ Xe Đưa Đón 1 Chiều Về Nhà', duration: 'Linh hoạt', price: 'Từ 70.000 đ', desc: 'Chở bé từ PawPal về tận nhà' }
                ];
            } else {
                return [
                    { name: 'Gói Tắm Vệ Sinh Cơ Bản', duration: '45 phút', price: 'Từ 120.000 đ', desc: 'Tắm, sấy, vệ sinh tai, cắt móng' },
                    { name: 'Gói Tắm Dưỡng Premium', duration: '60 phút', price: 'Từ 180.000 đ', desc: 'Dưỡng lông mềm mượt, massage thư giãn' },
                    { name: 'Grooming Cắt Tỉa Tạo Kiểu', duration: '90 phút', price: 'Từ 250.000 đ', desc: 'Cắt tỉa theo form, tạo kiểu mặt tròn' },
                    { name: 'Tắm Trị Liệu Thảo Dược', duration: '60 phút', price: 'Từ 200.000 đ', desc: 'Trị ve rận nấm da, xoa dịu kích ứng' }
                ];
            }
        }

        function renderServiceAutocomplete(query = '') {
            if (!serviceDropdown) return;
            const catVal = catSelect ? catSelect.value : 'Spa';
            const allServices = getServicesForCategory(catVal);
            const q = (query || '').toLowerCase().trim();

            const matches = allServices.filter(s => {
                const name = s.name.toLowerCase();
                const desc = (s.desc || '').toLowerCase();
                return !q || name.includes(q) || desc.includes(q);
            });

            if (matches.length === 0) {
                serviceDropdown.innerHTML = '<div style="padding: 10px 14px; color: var(--text-muted); font-size: 12.5px; text-align: center;">Không tìm thấy gói dịch vụ phù hợp</div>';
                serviceDropdown.style.display = 'block';
                return;
            }

            serviceDropdown.innerHTML = '';
            matches.forEach(s => {
                const item = document.createElement('div');
                item.className = 'customer-autocomplete-item';

                item.innerHTML = `
                    <div class="customer-autocomplete-meta" style="flex: 1;">
                        <div class="customer-autocomplete-name" style="font-weight: 600; color: #203A2C; font-size: 13.5px;">${s.name}</div>
                        <div class="customer-autocomplete-phone" style="color: #4F7A65; font-size: 11.5px; margin-top: 2px;">${s.duration}${s.desc ? ` • ${s.desc}` : ''}</div>
                    </div>
                    <div class="customer-autocomplete-pets" style="font-size: 11.5px; color: #236B48; background: #EEF5F1; padding: 2px 8px; border-radius: 9px; font-weight: 500;">
                        ${s.price}
                    </div>
                `;

                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectServiceItem(s);
                });

                serviceDropdown.appendChild(item);
            });

            serviceDropdown.style.display = 'block';
        }

        function selectServiceItem(s) {
            if (serviceInput) serviceInput.value = s.name;
            if (serviceHidden) serviceHidden.value = s.name;
            updateGroomingFields();

            if (serviceSelectedCard) {
                serviceSelectedCard.innerHTML = `
                    <span>Đã chọn: <strong>${s.name}</strong> (${s.duration})</span>
                    <button type="button" class="btn-clear-selection" style="background: none; border: none; color: #236B48; font-size: 12px; cursor: pointer; font-weight: 600; padding: 0 4px;">✕ Bỏ chọn</button>
                `;
                serviceSelectedCard.style.display = 'flex';
                serviceSelectedCard.querySelector('.btn-clear-selection')?.addEventListener('click', () => {
                    if (serviceInput) serviceInput.value = '';
                    if (serviceHidden) serviceHidden.value = '';
                    serviceSelectedCard.style.display = 'none';
                    updateGroomingFields();
                });
            }

            if (serviceDropdown) serviceDropdown.style.display = 'none';
        }

        if (serviceInput) {
            serviceInput.addEventListener('focus', () => renderServiceAutocomplete(serviceInput.value));
            serviceInput.addEventListener('input', () => renderServiceAutocomplete(serviceInput.value));
        }

        // Tự động đóng dropdown khi click chuột ra ngoài
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.customer-autocomplete-wrapper')) {
                if (customerDropdown) customerDropdown.style.display = 'none';
                if (petDropdown) petDropdown.style.display = 'none';
                if (serviceDropdown) serviceDropdown.style.display = 'none';
            }
        });

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

        // ====================================================================
        // MODAL 8: BIÊN BẢN TIẾP NHẬN BÉ VÀ KIỂM TRA AN TOÀN TẠI QUẦY (ZERO-CLAIM)
        // ====================================================================
        const btnAddIntakePhoto = document.getElementById('btnAddProofPhotoBtn');
        const intakePhotoInput = document.getElementById('intakeProofFileInput');
        if (btnAddIntakePhoto && intakePhotoInput) {
            btnAddIntakePhoto.addEventListener('click', () => intakePhotoInput.click());
            intakePhotoInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                    const url = URL.createObjectURL(file);
                    intakeProofImagesTemp.push(url);
                });
                renderIntakeProofPreview();
            });
        }

        const btnConfirmIntake = document.getElementById('intakeModalSubmitBtn') || document.getElementById('btnSubmitIntakeRecord');
        if (btnConfirmIntake) {
            btnConfirmIntake.addEventListener('click', () => {
                const modal = document.getElementById('modalEditIntakeInfo') || document.getElementById('modalIntakeSafety');
                const bookingId = modal?.getAttribute('data-booking-id');
                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (!booking) return;

                const actualWeight = parseFloat(document.getElementById('intakePetWeightInput')?.value) || parseFloat(booking.petWeight) || 4.2;
                const staff = document.getElementById('intakeStaffSelect')?.value || booking.staff || 'Ngọc Anh';

                // Lấy thông tin checklist
                const skinList = [];
                if (document.getElementById('checkSkinNormal')?.checked) skinList.push('Sạch sẽ');
                if (document.getElementById('checkSkinFleas')?.checked) skinList.push('Có ve rận');
                if (document.getElementById('checkSkinFungus')?.checked) skinList.push('Mảng nấm');
                if (document.getElementById('checkSkinMatted')?.checked) skinList.push('Lông bết rối');

                const eyesEarsList = [];
                if (document.getElementById('checkEyesEarsNormal')?.checked) eyesEarsList.push('Bình thường');
                if (document.getElementById('checkEyesDischarge')?.checked) eyesEarsList.push('Đỏ mắt/ghèn');
                if (document.getElementById('checkEarsInfection')?.checked) eyesEarsList.push('Viêm tai');
                if (document.getElementById('checkNoseRunny')?.checked) eyesEarsList.push('Chảy nước mũi');

                const woundNone = document.getElementById('checkWoundNone')?.checked;
                const woundNote = document.getElementById('intakeExistingWoundNote')?.value || '';
                const woundsStr = woundNone ? 'Không có vết thương cũ' : (woundNote ? `Có vết thương cũ: ${woundNote}` : 'Có vết trầy xước hoặc sẹo cũ');

                const selectedTemp = document.querySelector('input[name="intakeTemperamentRadio"]:checked')?.value || 'Ngoan hiền';

                const belongings = [];
                document.querySelectorAll('.check-belonging-item:checked').forEach(cb => belongings.push(cb.value));
                const belongingsNote = document.getElementById('intakeBelongingsInput')?.value || '';

                booking.staff = staff;
                booking.petWeight = `${actualWeight} kg`;
                booking.intakeRecord = {
                    actualWeight: actualWeight,
                    skinCoat: skinList.join(', ') || 'Bình thường',
                    eyesEars: eyesEarsList.join(', ') || 'Bình thường',
                    wounds: woundsStr,
                    woundNote: woundNote,
                    temperament: selectedTemp,
                    belongings: belongings,
                    belongingsNote: belongingsNote,
                    proofPhotos: [...intakeProofImagesTemp],
                    recordedAt: new Date().toISOString()
                };

                // Nếu có tick tự động cộng phụ phí cân nặng
                const autoAddSurcharge = document.getElementById('checkAutoAddWeightSurcharge')?.checked;
                const origWeight = parseFloat(booking.originalWeight || booking.petWeight || 4.2);
                if (autoAddSurcharge && (actualWeight - origWeight >= 0.5)) {
                    if (!booking.surcharges) booking.surcharges = [];
                    const exists = booking.surcharges.some(s => s.name.includes('Phụ phí chênh lệch phân khúc cân nặng'));
                    if (!exists) {
                        booking.surcharges.push({
                            name: 'Phụ phí chênh lệch phân khúc cân nặng',
                            amount: 50000,
                            reason: `Cân nặng thực tế ${actualWeight} kg vượt mức đăng ký ${origWeight} kg`,
                            proofImages: []
                        });
                    }
                }

                const mode = document.getElementById('intakeModalMode')?.value || 'intake';
                if (mode === 'intake') {
                    updateBookingStatus(booking.id, 'in_progress');
                    PawpalServices.showToast('Đã tiếp nhận bé và bắt đầu ca dịch vụ!');
                } else {
                    PawpalServices.showToast('Đã cập nhật biên bản tiếp nhận an toàn!');
                }

                if (PawpalServices.subtabs.detail?.renderBookingDetail) {
                    PawpalServices.subtabs.detail.renderBookingDetail(booking.id);
                }
                renderBookingsTable();

                if (modal) modal.classList.remove('active');
            });
        }

        // ====================================================================
        // MODAL 10: NGHIỆM THU CA DỊCH VỤ VÀ BÀN GIAO BÉ (CHECKOUT DESK)
        // ====================================================================
        const btnAddCompletePhoto = document.getElementById('btnAddCompletePhotoBtn');
        const completePhotoInput = document.getElementById('completeProofFileInput');
        if (btnAddCompletePhoto && completePhotoInput) {
            btnAddCompletePhoto.addEventListener('click', () => completePhotoInput.click());
            completePhotoInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                    const url = URL.createObjectURL(file);
                    completeProofImagesTemp.push(url);
                });
                renderCompleteProofPreview();
            });
        }

        const btnSubmitComplete = document.getElementById('completeModalSubmitBtn') || document.getElementById('btnSubmitCompleteBooking');
        if (btnSubmitComplete) {
            btnSubmitComplete.addEventListener('click', async () => {
                const modal = document.getElementById('modalCompleteBooking');
                const bookingId = modal?.getAttribute('data-booking-id');
                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (!booking) return;

                const checkQuality = document.getElementById('completeCheckQuality');
                const checkBelongings = document.getElementById('completeCheckBelongings');
                if (checkQuality && !checkQuality.checked) {
                    PawpalServices.showToast('Vui lòng xác nhận đạt tiêu chuẩn quy trình chăm sóc!', 'warning');
                    return;
                }
                if (checkBelongings && !checkBelongings.checked) {
                    PawpalServices.showToast('Vui lòng xác nhận đã trao trả đầy đủ tư trang cho khách!', 'warning');
                    return;
                }

                const payMethod = document.getElementById('completePaymentMethodSelect')?.value || 'Tiền mặt (Tại quầy)';
                const isPaid = document.getElementById('completeCheckPaid')?.checked;

                const { finalTotal, totalDiscount, earnedPoints } = calculateCompleteTotal(booking);
                booking.total = finalTotal;
                booking.voucherDiscount = totalDiscount;
                booking.earnedPoints = earnedPoints;
                booking.paymentStatus = isPaid ? `Đã thanh toán (${payMethod})` : 'Chưa thanh toán';

                // Đánh dấu hoàn tất toàn bộ các bước trong carelog
                const logs = booking.carelogs || booking.careLogs || [];
                logs.forEach(l => l.completed = true);

                // Cập nhật trạng thái
                updateBookingStatus(booking.id, 'completed');

                // Lưu ảnh thành phẩm
                if (completeProofImagesTemp.length > 0) {
                    booking.afterServicePhotos = [...completeProofImagesTemp];
                }

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && booking.dbId) {
                        await client.from('appointment').update({
                            status: 'completed',
                            total_amount: finalTotal,
                            payment_status: isPaid ? 'paid' : 'pending'
                        }).eq('id', booking.dbId);
                    }
                } catch (e) {}

                renderBookingsTable();
                if (PawpalServices.subtabs.detail?.renderBookingDetail) {
                    PawpalServices.subtabs.detail.renderBookingDetail(booking.id);
                }
                PawpalServices.showToast(`Đã hoàn tất ca dịch vụ và xuất phiếu bàn giao bé! (${PawpalServices.formatCurrency(finalTotal)})`);
                if (modal) modal.classList.remove('active');
            });
        }

        // ====================================================================
        // MODAL 9: ĐIỀU PHỐI KỸ THUẬT VIÊN (STAFF REASSIGNMENT)
        // ====================================================================
        const changeStaffSelect = document.getElementById('changeStaffSelect');
        const changeStaffHint = document.getElementById('changeStaffWorkloadHint');
        if (changeStaffSelect && changeStaffHint) {
            changeStaffSelect.addEventListener('change', () => {
                const staffName = changeStaffSelect.value;
                if (!staffName) {
                    changeStaffHint.style.display = 'none';
                    return;
                }
                changeStaffHint.style.display = 'block';
                changeStaffHint.style.background = '#EEF5F1';
                changeStaffHint.style.color = '#236B48';
                changeStaffHint.textContent = `KTV ${staffName}: Đang sẵn sàng tiếp nhận ca (Tải hiện tại: 1 ca đang xử lý).`;
            });
        }

        const presetReasonSelect = document.getElementById('changeStaffPresetReason');
        const reasonInput = document.getElementById('changeStaffReasonInput');
        if (presetReasonSelect && reasonInput) {
            presetReasonSelect.addEventListener('change', () => {
                const val = presetReasonSelect.value;
                if (val && val !== 'CUSTOM') {
                    reasonInput.value = val;
                }
            });
        }

        document.querySelectorAll('#quickChangeStaffChips .reason-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (reasonInput) {
                    reasonInput.value = chip.textContent.trim();
                    reasonInput.focus();
                }
            });
        });

        // Xác nhận đổi KTV
        const btnSubmitChangeStaff = document.getElementById('btnSubmitChangeStaff');
        if (btnSubmitChangeStaff) {
            btnSubmitChangeStaff.addEventListener('click', async () => {
                const modal = document.getElementById('modalChangeStaff');
                const bookingId = modal?.getAttribute('data-booking-id');
                const newStaff = document.getElementById('changeStaffSelect')?.value;
                const reason = document.getElementById('changeStaffReasonInput')?.value?.trim();

                if (!newStaff) {
                    PawpalServices.showToast('Vui lòng chọn KTV mới!', 'warning');
                    return;
                }
                if (!reason) {
                    PawpalServices.showToast('Vui lòng nhập lý do điều chuyển nhân sự!', 'warning');
                    return;
                }

                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (booking) {
                    const oldStaff = booking.staff || 'Chưa phân công';
                    booking.staff = newStaff;

                    // Xử lý phạm vi bàn giao các bước chăm sóc
                    const scope = document.querySelector('input[name="changeStaffScope"]:checked')?.value || 'next_steps';
                    const logs = booking.carelogs || booking.careLogs || [];
                    if (scope === 'all_steps') {
                        logs.forEach(l => l.ktv = newStaff);
                    } else {
                        logs.forEach(l => {
                            if (!l.completed) l.ktv = newStaff;
                        });
                    }

                    // Audit trail lịch sử đổi KTV
                    if (!booking.staffHistory) booking.staffHistory = [];
                    booking.staffHistory.push({
                        from: oldStaff,
                        to: newStaff,
                        reason: reason,
                        scope: scope,
                        timestamp: new Date().toISOString()
                    });

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
                    if (PawpalServices.subtabs.detail?.renderBookingDetail) {
                        PawpalServices.subtabs.detail.renderBookingDetail(booking.id);
                    }
                    PawpalServices.showToast(`Đã điều phối KTV phụ trách sang ${newStaff}!`);
                    if (modal) modal.classList.remove('active');
                }
            });
        }

        // ====================================================================
        // MODAL 5: THÊM PHỤ PHÍ VÀ DỊCH VỤ PHÁT SINH
        // ====================================================================
        const surchargePreset = document.getElementById('surchargePresetSelect');
        const surchargeName = document.getElementById('surchargeNameInput');
        const surchargeAmount = document.getElementById('surchargeAmountInput');
        const surchargeCommSelect = document.getElementById('surchargeCommissionSelect');
        const surchargeCommEarned = document.getElementById('surchargeCommissionEarned');

        function updateSurchargeCommission() {
            const amount = parseFloat(surchargeAmount?.value || 0);
            const commRate = parseFloat(surchargeCommSelect?.value || 0);
            const earned = Math.round((amount * commRate) / 100);
            if (surchargeCommEarned) {
                const formatCur = PawpalServices.formatCurrency || (num => `${num.toLocaleString('vi-VN')} đ`);
                surchargeCommEarned.textContent = (earned > 0 ? `+${formatCur(earned)}` : '0 đ');
            }
        }

        if (surchargePreset) {
            surchargePreset.addEventListener('change', () => {
                const val = surchargePreset.value;
                if (val && val !== 'CUSTOM') {
                    const parts = val.split('|');
                    if (surchargeName && parts[0]) surchargeName.value = parts[0];
                    if (surchargeAmount && parts[1]) surchargeAmount.value = parts[1];
                    updateSurchargeCommission();
                }
            });
        }

        if (surchargeAmount) {
            surchargeAmount.addEventListener('input', updateSurchargeCommission);
        }
        if (surchargeCommSelect) {
            surchargeCommSelect.addEventListener('change', updateSurchargeCommission);
        }

        // Chip gợi ý lý do một chạm
        document.querySelectorAll('#quickSurchargeReasonChips .reason-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const reasonInp = document.getElementById('surchargeReasonInput');
                if (reasonInp) {
                    reasonInp.value = chip.textContent.trim();
                    reasonInp.focus();
                }
            });
        });

        // Nút đính kèm ảnh bằng chứng
        const btnAddPhoto = document.getElementById('btnAddSurchargePhotoBtn');
        const photoFileInput = document.getElementById('surchargeProofFileInput');
        const photoPreviewList = document.getElementById('surchargeProofPreviewList');

        if (btnAddPhoto && photoFileInput) {
            btnAddPhoto.addEventListener('click', () => photoFileInput.click());
            photoFileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                    const url = URL.createObjectURL(file);
                    surchargeProofImagesTemp.push(url);
                    if (photoPreviewList) {
                        const thumb = document.createElement('div');
                        thumb.className = 'intake-proof-item';
                        thumb.innerHTML = `
                            <img src="${url}" alt="Bằng chứng phụ phí" style="width: 60px; height: 60px; object-fit: cover; border-radius: var(--admin-radius); border: 1px solid var(--border-neutral);">
                            <span class="btn-del-proof" style="position: absolute; top: -5px; right: -5px; background: #DC2626; color: #fff; width: 16px; height: 16px; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;">✕</span>
                        `;
                        thumb.style.position = 'relative';
                        thumb.querySelector('.btn-del-proof').addEventListener('click', () => {
                            thumb.remove();
                            surchargeProofImagesTemp = surchargeProofImagesTemp.filter(u => u !== url);
                        });
                        photoPreviewList.appendChild(thumb);
                    }
                });
            });
        }

        // Nút Lưu phụ phí
        const btnSubmitSurcharge = document.getElementById('btnSubmitAddSurcharge');
        if (btnSubmitSurcharge) {
            btnSubmitSurcharge.addEventListener('click', async () => {
                const modal = document.getElementById('modalAddSurcharge');
                const bookingId = modal?.getAttribute('data-booking-id');
                const name = surchargeName?.value.trim();
                const amount = parseFloat(surchargeAmount?.value || 0);
                const reason = document.getElementById('surchargeReasonInput')?.value.trim();
                const consent = document.getElementById('surchargeConsentSelect')?.value;
                const consentNote = document.getElementById('surchargeConsentNote')?.value.trim();

                if (!name) {
                    PawpalServices.showToast('Vui lòng nhập tên phụ phí!', 'warning');
                    surchargeName?.focus();
                    return;
                }
                if (!amount || amount <= 0) {
                    PawpalServices.showToast('Vui lòng nhập số tiền phụ thu hợp lệ!', 'warning');
                    surchargeAmount?.focus();
                    return;
                }
                if (!reason) {
                    PawpalServices.showToast('Vui lòng nhập lý do và mô tả hiện trạng!', 'warning');
                    document.getElementById('surchargeReasonInput')?.focus();
                    return;
                }

                const bookingsData = PawpalServices.state?.bookingsData || [];
                const booking = bookingsData.find(b => b.id === bookingId || b.dbId === bookingId);
                if (booking) {
                    booking.surcharges = booking.surcharges || [];
                    booking.surcharges.push({
                        name,
                        amount,
                        reason,
                        consent,
                        consentNote,
                        images: [...surchargeProofImagesTemp],
                        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                    });
                    booking.surchargePrice = (booking.surchargePrice || 0) + amount;
                    booking.total = (booking.basePrice || booking.price || 0) + booking.surchargePrice - (booking.voucherPrice || 0);

                    renderBookingsTable();
                    updateKPIs();
                    if (PawpalServices.subtabs?.detail?.renderBookingDetail) {
                        PawpalServices.subtabs.detail.renderBookingDetail(bookingId);
                    }

                    const formatCur = PawpalServices.formatCurrency || (num => `${num.toLocaleString('vi-VN')} đ`);
                    PawpalServices.showToast(`Đã thêm phụ phí ${name} (+${formatCur(amount)}) cho ca ${booking.id}!`);
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
