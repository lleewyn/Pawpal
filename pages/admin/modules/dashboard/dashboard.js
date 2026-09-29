(function initDashboard() {
    try {
        history.replaceState(null, '', '#tab-dashboard');
    } catch (e) {
        window.location.hash = 'tab-dashboard';
    }
    sessionStorage.setItem('pawpal_admin_active_module', 'Dashboard');

    updateDashboardLiveMetrics();
    setupQuickReceptionActions();
    setupBookingQuickModalEvents();
    window.addEventListener('focus', updateDashboardLiveMetrics);
    window.addEventListener('storage', updateDashboardLiveMetrics);
    setupDashboardCalendar();

    const chart = document.getElementById('dashboardRevenueChart');
    if (chart) {
        const currentWeek = [34, 52, 43, 70, 59, 82, 76];
        const previousWeek = [28, 39, 47, 42, 55, 61, 57];
        const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const yTicks = [
            { val: 80, label: '8 tr' },
            { val: 60, label: '6 tr' },
            { val: 40, label: '4 tr' },
            { val: 20, label: '2 tr' },
            { val: 0, label: '0' }
        ];

        const chartLeft = 45;
        const chartRight = 620;
        const chartTop = 20;
        const chartBottom = 160;
        const chartHeight = chartBottom - chartTop;
        const chartWidth = chartRight - chartLeft;

        const x = (index) => chartLeft + (index / (labels.length - 1)) * chartWidth;
        const y = (val) => chartBottom - (val / 90) * chartHeight;

        const gridLines = yTicks.map((tick) => {
            const lineY = y(tick.val);
            return `<g class="chart-grid-row"><text x="${chartLeft - 10}" y="${lineY + 4}" text-anchor="end" class="chart-y-label">${tick.label}</text><line x1="${chartLeft}" y1="${lineY}" x2="${chartRight}" y2="${lineY}" stroke="#ECF2EE" stroke-width="1" /></g>`;
        }).join('');
        const dayLabels = labels.map((label, index) =>
            `<text x="${x(index).toFixed(1)}" y="${chartBottom + 20}" text-anchor="middle" class="chart-x-label">${label}</text>`
        ).join('');
        const currentPoints = currentWeek.map((val, idx) => `${x(idx).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
        const previousPoints = previousWeek.map((val, idx) => `${x(idx).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
        const areaPolygon = `${x(0).toFixed(1)},${chartBottom} ${currentPoints} ${x(currentWeek.length - 1).toFixed(1)},${chartBottom}`;

        const currentDots = currentWeek.map((value, index) =>
            `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="4" fill="#236B48" stroke="#FFFFFF" stroke-width="2"><title>Thứ ${labels[index]}: ${labelCurrency(value * 100000)} VNĐ</title></circle>`
        ).join('');
        chart.innerHTML = `
            <svg viewBox="0 0 640 195" preserveAspectRatio="none" aria-hidden="true">
                ${gridLines}
                <polygon points="${areaPolygon}" fill="rgba(35, 107, 72, 0.06)" />
                <polyline points="${previousPoints}" fill="none" stroke="#AEC8B9" stroke-width="2" stroke-dasharray="5 5" stroke-linecap="round" stroke-linejoin="round" />
                <polyline points="${currentPoints}" fill="none" stroke="#236B48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                ${currentDots}
                ${dayLabels}
            </svg>`;
    }

    bindModuleNavigation();

    function labelCurrency(value) {
        return Number(value).toLocaleString('vi-VN');
    }

    function setupDashboardCalendar() {
        const monthLabel = document.getElementById('dashboardCalendarMonth');
        const daysGrid = document.getElementById('dashboardCalendarDays');
        const weekdays = document.getElementById('dashboardCalendarWeekdays');
        const agendaTitle = document.getElementById('dashboardAgendaTitle');
        const bookingList = document.getElementById('dashboardBookingList');
        const calendarAgenda = document.querySelector('.dashboard-calendar-agenda');
        if (!monthLabel || !daysGrid || !agendaTitle || !bookingList) return;
        const monthWeekdayMarkup = weekdays?.innerHTML || '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let shownMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        let selectedDate = new Date(today);
        let calendarView = 'month';
        let services = [
            { pet: 'Bé Bông', customer: 'Nguyễn Thu Hà', service: 'Tắm sấy và cắt tỉa', time: '09:30', status: 'Đã xác nhận', badge: 'badge-success', id: 'BKG-1001' },
            { pet: 'Bé Đậu', customer: 'Trần Minh Khang', service: 'Combo Vệ sinh tai móng', time: '10:15', status: 'Chờ xác nhận', badge: 'badge-warning', id: 'BKG-1002' },
            { pet: 'Bé Milu', customer: 'Lê Lệ Quyên', service: 'Nhận phòng Pet Hotel', time: '11:00', status: 'Đã xác nhận', badge: 'badge-success', id: 'BKG-1003' },
            { pet: 'Bé Mây', customer: 'Phạm Hoàng Yến', service: 'Tắm sấy dưỡng lông', time: '13:30', status: 'Sắp tới', badge: 'badge-neutral', id: 'BKG-1004' }
        ];

        try {
            const storedBookings = sessionStorage.getItem('pawpal_admin_services_bookings');
            if (storedBookings) {
                const parsed = JSON.parse(storedBookings);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    services = parsed.slice(0, 8).map(b => ({
                        id: b.id || 'BKG-1001',
                        pet: b.petName || b.pet || 'Bé cưng',
                        customer: b.customerName || b.customer || 'Khách hàng',
                        service: b.serviceName || b.service || 'Chăm sóc thú cưng',
                        time: b.time || '10:00',
                        status: b.status === 'completed' ? 'Đã hoàn thành' : b.status === 'confirmed' ? 'Đã xác nhận' : 'Chờ xác nhận',
                        badge: b.status === 'completed' ? 'badge-neutral' : b.status === 'confirmed' ? 'badge-success' : 'badge-warning'
                    }));
                }
            }
        } catch (e) {}

        function toDateKey(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function dateFromKey(key) {
            const [year, month, day] = key.split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        function bookingsForMonth(year, month) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const currentMonth = year === today.getFullYear() && month === today.getMonth();
            const candidateDays = currentMonth
                ? [today.getDate(), today.getDate() + 1, today.getDate() + 2, today.getDate() + 4, today.getDate() + 7]
                : [3, 7, 12, 16, 21, 26];
            return candidateDays
                .filter((day, index, all) => day <= daysInMonth && all.indexOf(day) === index)
                .map((day, index) => ({
                    date: new Date(year, month, day),
                    appointments: currentMonth && day === today.getDate() && today.getHours() >= 14
                        ? services.slice(1, 3)
                        : services.slice(index % 2, (index % 2) + (index % 3 === 0 ? 2 : 1))
                }));
        }

        function bookingsOnDate(date) {
            return bookingsForMonth(date.getFullYear(), date.getMonth())
                .find((entry) => toDateKey(entry.date) === toDateKey(date))?.appointments || [];
        }

        function renderAgenda(date, monthBookings) {
            const dateKey = toDateKey(date);
            const dayBookings = monthBookings.find((entry) => toDateKey(entry.date) === dateKey)?.appointments || [];
            agendaTitle.textContent = new Intl.DateTimeFormat('vi-VN', {
                weekday: 'long', day: 'numeric', month: 'long'
            }).format(date);

            if (!dayBookings.length) {
                bookingList.innerHTML = '<p class="dashboard-agenda-empty">Ngày này chưa có lịch hẹn.</p>';
                return;
            }

            bookingList.innerHTML = dayBookings.map((booking, idx) => `
                <button type="button" class="dashboard-booking-row" data-booking-idx="${idx}">
                    <time>${booking.time}</time>
                    <span class="dashboard-booking-detail"><strong>${booking.pet} · ${booking.customer}</strong><small>${booking.service}</small></span>
                    <span class="admin-badge ${booking.badge}">${booking.status}</span>
                </button>`).join('');

            bookingList.querySelectorAll('.dashboard-booking-row').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.bookingIdx, 10);
                    const booking = dayBookings[idx] || dayBookings[0];
                    if (booking) openBookingQuickModal(booking);
                });
            });
        }

        function renderCalendar() {
            const year = shownMonth.getFullYear();
            const month = shownMonth.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const mondayFirstOffset = (new Date(year, month, 1).getDay() + 6) % 7;
            const dateLabel = new Intl.DateTimeFormat('vi-VN', {
                month: 'long', year: 'numeric'
            }).format(shownMonth);
            document.getElementById('dashboardCalendarPrev')?.setAttribute(
                'aria-label', calendarView === 'month' ? 'Tháng trước' : calendarView === 'week' ? 'Tuần trước' : 'Ngày trước'
            );
            document.getElementById('dashboardCalendarNext')?.setAttribute(
                'aria-label', calendarView === 'month' ? 'Tháng sau' : calendarView === 'week' ? 'Tuần sau' : 'Ngày sau'
            );

            const calendarDates = [];
            if (calendarView === 'month') {
                for (let blank = 0; blank < mondayFirstOffset; blank += 1) calendarDates.push(null);
                for (let day = 1; day <= daysInMonth; day += 1) calendarDates.push(new Date(year, month, day));
                while (calendarDates.length % 7 !== 0) calendarDates.push(null);
                monthLabel.textContent = dateLabel;
                daysGrid.classList.remove('is-week-view', 'is-day-view');
                if (weekdays) {
                    weekdays.hidden = false;
                    weekdays.classList.remove('is-week-heading');
                    weekdays.innerHTML = monthWeekdayMarkup;
                }
            } else if (calendarView === 'week') {
                const weekStart = new Date(selectedDate);
                weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
                for (let day = 0; day < 7; day += 1) {
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + day);
                    calendarDates.push(date);
                }
                const weekEnd = calendarDates[6];
                monthLabel.textContent = `${weekStart.getDate()} ${new Intl.DateTimeFormat('vi-VN', { month: 'short' }).format(weekStart)} – ${weekEnd.getDate()} ${new Intl.DateTimeFormat('vi-VN', { month: 'short', year: 'numeric' }).format(weekEnd)}`;
                daysGrid.classList.add('is-week-view');
                daysGrid.classList.remove('is-day-view');
                if (weekdays) {
                    weekdays.hidden = false;
                    weekdays.classList.add('is-week-heading');
                    weekdays.innerHTML = calendarDates.map((date) => {
                        const key = toDateKey(date);
                        const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date);
                        return `<button type="button" class="dashboard-week-heading-btn ${key === toDateKey(selectedDate) ? 'is-selected' : ''}" data-calendar-date="${key}" aria-pressed="${key === toDateKey(selectedDate)}"><span>${weekday}</span><strong>${date.getDate()}</strong></button>`;
                    }).join('');
                }
            } else {
                calendarDates.push(new Date(selectedDate));
                monthLabel.textContent = new Intl.DateTimeFormat('vi-VN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                }).format(selectedDate);
                daysGrid.classList.add('is-day-view');
                daysGrid.classList.remove('is-week-view');
                if (weekdays) {
                    weekdays.hidden = true;
                    weekdays.classList.remove('is-week-heading');
                }
            }

            const eventDateKeys = new Set();
            calendarDates.filter(Boolean).forEach((date) => {
                const events = bookingsForMonth(date.getFullYear(), date.getMonth());
                if (events.some((entry) => toDateKey(entry.date) === toDateKey(date))) {
                    eventDateKeys.add(toDateKey(date));
                }
            });
            if (calendarView === 'week') {
                daysGrid.innerHTML = calendarDates.map((date) => {
                    const key = toDateKey(date);
                    const dayBookings = bookingsOnDate(date);
                    const selected = key === toDateKey(selectedDate);
                    const events = dayBookings.length
                        ? dayBookings.map((booking) => `<span class="dashboard-week-event"><time>${booking.time}</time>${booking.pet}</span>`).join('')
                        : '<span class="dashboard-week-empty">Không có lịch</span>';
                    return `<button type="button" class="dashboard-calendar-day dashboard-week-day ${selected ? 'is-selected' : ''} ${key === toDateKey(today) ? 'is-today' : ''}" data-calendar-date="${key}" aria-label="${new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)}" aria-pressed="${selected}"><span class="dashboard-week-events">${events}</span></button>`;
                }).join('');
            } else if (calendarView === 'day') {
                const dayBookings = bookingsOnDate(selectedDate);
                // Giờ hiển thị từ 08:00 đến 19:00 (11 tiếng, mỗi tiếng cao 46px)
                const startHour = 8;
                const endHour = 19;
                const slotHeight = 46; // px mỗi giờ

                const timeSlotsMarkup = Array.from({ length: endHour - startHour + 1 }, (_, i) => {
                    const hour = startHour + i;
                    return `<div class="dashboard-day-timeline-hour" style="top: ${i * slotHeight}px;"><time>${String(hour).padStart(2, '0')}:00</time><div class="dashboard-day-timeline-line"></div></div>`;
                }).join('');

                // Parse thời gian thành phút từ 08:00
                const parsedBookings = dayBookings.map((b) => {
                    const [h, m] = b.time.split(':').map(Number);
                    const startMinutes = (h - startHour) * 60 + m;
                    const durationMinutes = 60; // thời lượng mỗi ca là 60 phút
                    return { ...b, startMinutes, endMinutes: startMinutes + durationMinutes };
                }).sort((a, b) => a.startMinutes - b.startMinutes);

                // Phân cụm các ca lịch giao nhau (Connected Overlap Clusters)
                // để tính toán tỷ lệ độ rộng và độ lệch hợp lý theo từng tầng chồng lấn
                const clusters = [];
                parsedBookings.forEach((booking) => {
                    let added = false;
                    for (const cluster of clusters) {
                        const hasOverlap = cluster.some((item) =>
                            booking.startMinutes < item.endMinutes && booking.endMinutes > item.startMinutes
                        );
                        if (hasOverlap) {
                            cluster.push(booking);
                            added = true;
                            break;
                        }
                    }
                    if (!added) {
                        clusters.push([booking]);
                    }
                });

                // Phân tầng (layer index) cho từng lịch trong cluster
                const eventsMarkup = clusters.flatMap((cluster) => {
                    const totalInCluster = cluster.length;
                    return cluster.map((b, idx) => {
                        const topPx = (b.startMinutes / 60) * slotHeight;
                        const heightPx = Math.max(38, (60 / 60) * slotHeight - 4);

                        let styleAttrs = `top: ${topPx}px; height: ${heightPx}px;`;
                        let classes = 'dashboard-day-event';

                        if (totalInCluster === 1) {
                            // Không bị trùng với ai: chiếm 96% độ rộng, căn trái
                            classes += ' is-single-event';
                            styleAttrs += ' left: 0; width: 96%; z-index: 1;';
                        } else {
                            // Có từ 2 ca chồng lên nhau:
                            // Tỷ lệ độ rộng giảm dần có tính toán: 100% - (idx * 14%), tối thiểu 62% để luôn đủ chỗ đọc chữ
                            // Độ lệch lề trái tăng dần: idx * 16%
                            const widthPercent = Math.max(62, 94 - idx * 14);
                            const leftPercent = idx * 16;
                            const zIndex = idx + 2;

                            classes += ` is-overlapped-layer layer-idx-${idx % 3}`;
                            styleAttrs += ` left: ${leftPercent}%; width: ${widthPercent}%; z-index: ${zIndex};`;
                        }

                        return `<button type="button" class="${classes}" style="${styleAttrs}" data-dashboard-module="Dịch vụ" data-booking-id="${b.id || ''}">
                            <div class="dashboard-day-event-header">
                                <strong>${b.time} · ${b.pet}</strong>
                                <span class="dashboard-day-event-status">${b.status}</span>
                            </div>
                            <div class="dashboard-day-event-body">${b.customer} · ${b.service}</div>
                        </button>`;
                    });
                }).join('');

                const totalTimelineHeight = (endHour - startHour + 1) * slotHeight;
                daysGrid.innerHTML = `
                    <div class="dashboard-day-timeline-container" style="height: ${totalTimelineHeight}px;">
                        <div class="dashboard-day-timeline-grid">${timeSlotsMarkup}</div>
                        <div class="dashboard-day-timeline-events">${eventsMarkup}</div>
                    </div>`;

                daysGrid.querySelectorAll('.dashboard-day-event').forEach((btn) => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const bId = btn.getAttribute('data-booking-id');
                        const found = dayBookings.find(b => b.id === bId) || dayBookings[0];
                        if (found) openBookingQuickModal(found);
                    });
                });
            } else {
                daysGrid.innerHTML = calendarDates.map((date) => {
                    if (!date) return '<span class="dashboard-calendar-blank" aria-hidden="true"></span>';
                    const key = toDateKey(date);
                    const hasAppointments = eventDateKeys.has(key);
                    const classes = [
                        'dashboard-calendar-day',
                        hasAppointments ? 'has-appointments' : '',
                        key === toDateKey(today) ? 'is-today' : '',
                        key === toDateKey(selectedDate) ? 'is-selected' : ''
                    ].filter(Boolean).join(' ');
                    const label = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
                    return `<button type="button" class="${classes}" data-calendar-date="${key}" aria-label="${label}${hasAppointments ? ', có lịch hẹn' : ''}" aria-pressed="${key === toDateKey(selectedDate)}"><span class="dashboard-calendar-day-number">${date.getDate()}</span>${hasAppointments ? '<span class="dashboard-calendar-event-dot"></span>' : ''}</button>`;
                }).join('');
            }

            document.querySelectorAll('[data-calendar-view]').forEach((button) => {
                const active = button.dataset.calendarView === calendarView;
                button.classList.toggle('is-active', active);
                button.setAttribute('aria-pressed', String(active));
            });
            calendarAgenda?.classList.toggle('is-week-view', calendarView === 'week');
            calendarAgenda?.classList.toggle('is-day-view', calendarView === 'day');
            renderAgenda(selectedDate, bookingsForMonth(selectedDate.getFullYear(), selectedDate.getMonth()));

            daysGrid.querySelectorAll('[data-calendar-date]').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedDate = dateFromKey(button.dataset.calendarDate);
                    renderCalendar();
                });
            });
            weekdays?.querySelectorAll('[data-calendar-date]').forEach((button) => {
                button.addEventListener('click', () => {
                    selectedDate = dateFromKey(button.dataset.calendarDate);
                    renderCalendar();
                });
            });
        }

        document.getElementById('dashboardCalendarPrev')?.addEventListener('click', () => {
            if (calendarView === 'month') {
                shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() - 1, 1);
                selectedDate = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
            } else if (calendarView === 'week') {
                selectedDate.setDate(selectedDate.getDate() - 7);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            } else {
                selectedDate.setDate(selectedDate.getDate() - 1);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            }
            renderCalendar();
        });
        document.getElementById('dashboardCalendarNext')?.addEventListener('click', () => {
            if (calendarView === 'month') {
                shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + 1, 1);
                selectedDate = new Date(shownMonth.getFullYear(), shownMonth.getMonth(), 1);
            } else if (calendarView === 'week') {
                selectedDate.setDate(selectedDate.getDate() + 7);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            } else {
                selectedDate.setDate(selectedDate.getDate() + 1);
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
            }
            renderCalendar();
        });

        document.querySelectorAll('[data-calendar-view]').forEach((button) => {
            button.addEventListener('click', () => {
                calendarView = button.dataset.calendarView;
                shownMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                renderCalendar();
            });
        });

        renderCalendar();
    }

    function bindModuleNavigation(root = document) {
        root.querySelectorAll('[data-dashboard-module]').forEach((control) => {
            if (control.dataset.dashboardBound === 'true') return;
            control.dataset.dashboardBound = 'true';
            control.addEventListener('click', () => {
                const moduleName = control.getAttribute('data-dashboard-module');

                // 1. Deep linking theo ngữ cảnh thông minh
                const action = control.getAttribute('data-action');
                const sku = control.getAttribute('data-sku');
                const bookingId = control.getAttribute('data-booking-id');

                if (action === 'complaints') {
                    sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-services');
                    sessionStorage.setItem('pawpal_admin_complaint_filter_status', 'pending');
                } else if (action === 'orders') {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
                    sessionStorage.setItem('pawpal_admin_order_filter_status', 'pending');
                } else if (control.id === 'btnDashboardViewAllStock' || control.classList.contains('dashboard-stock-heading')) {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-products');
                } else if (sku) {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-products');
                    sessionStorage.setItem('pawpal_admin_product_search', sku);
                } else if (bookingId) {
                    sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-bookings');
                    sessionStorage.setItem('pawpal_admin_service_selected_id', bookingId);
                } else if (moduleName === 'Dịch vụ') {
                    sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-bookings');
                } else if (moduleName === 'Bán hàng') {
                    sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
                } else if (moduleName === 'Khách hàng') {
                    sessionStorage.setItem('pawpal_admin_customer_subtab', 'tab-customer-list');
                } else if (moduleName === 'Thú cưng') {
                    sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-list');
                }

                // 2. Chuyển sang module đích
                const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                    .find((button) => button.getAttribute('data-title') === moduleName);
                if (target) target.click();
            });
        });
    }

    function updateDashboardLiveMetrics() {
        // 1. Thống kê Đơn hàng
        let pendingOrdersCount = 4;
        let totalOrdersToday = 12;
        let todayRevenueVal = 25500000;
        try {
            const rawOrders = sessionStorage.getItem('pawpal_admin_orders_list');
            if (rawOrders) {
                const list = JSON.parse(rawOrders);
                if (Array.isArray(list) && list.length > 0) {
                    totalOrdersToday = list.length;
                    pendingOrdersCount = list.filter(o => o.status === 'pending').length;
                    const completedRevenue = list
                        .filter(o => o.status === 'completed')
                        .reduce((sum, o) => sum + (parseFloat(o.total || o.amount) || 0), 0);
                    if (completedRevenue > 0) todayRevenueVal = completedRevenue;
                }
            }
        } catch (e) {}

        // 2. Thống kê Khiếu nại
        let pendingComplaintsCount = 2;
        try {
            const rawComplaints = sessionStorage.getItem('pawpal_admin_complaints_data');
            if (rawComplaints) {
                const list = JSON.parse(rawComplaints);
                if (Array.isArray(list) && list.length > 0) {
                    pendingComplaintsCount = list.filter(c => c.status === 'pending' || c.status === 'processing').length;
                }
            }
        } catch (e) {}

        // 3. Thống kê Dịch vụ / Lịch hẹn
        let todayBookingsCount = 18;
        try {
            const rawBookings = sessionStorage.getItem('pawpal_admin_services_bookings');
            if (rawBookings) {
                const list = JSON.parse(rawBookings);
                if (Array.isArray(list) && list.length > 0) {
                    todayBookingsCount = list.length;
                }
            }
        } catch (e) {}

        // 4. Thống kê Khách hàng
        let newCustomersCount = 7;
        try {
            const rawCust = sessionStorage.getItem('pawpal_admin_customers_data');
            if (rawCust) {
                const obj = JSON.parse(rawCust);
                const count = Object.keys(obj).length;
                if (count > 0) newCustomersCount = count;
            }
        } catch (e) {}

        // 5. Thống kê Thú cưng
        let newPetsCount = 5;
        try {
            const rawPets = sessionStorage.getItem('pawpal_admin_pets_data');
            if (rawPets) {
                const obj = JSON.parse(rawPets);
                const count = Object.keys(obj).length;
                if (count > 0) newPetsCount = count;
            }
        } catch (e) {}

        // Render DOM các thẻ KPI
        const elRevenue = document.getElementById('dashboardRevenue');
        if (elRevenue) elRevenue.textContent = `${labelCurrency(todayRevenueVal)} VNĐ`;

        const elBookings = document.getElementById('dashboardBookings');
        if (elBookings) elBookings.textContent = todayBookingsCount;

        const elOrders = document.getElementById('dashboardOrders');
        if (elOrders) elOrders.textContent = totalOrdersToday;

        const elCust = document.getElementById('dashboardCustomers');
        if (elCust) elCust.textContent = newCustomersCount;

        const elPets = document.getElementById('dashboardPets');
        if (elPets) elPets.textContent = newPetsCount;

        // Render khối Ưu tiên xử lý
        const totalPriority = pendingComplaintsCount + pendingOrdersCount;
        const elPriorityCount = document.getElementById('dashboardPriorityCount');
        if (elPriorityCount) {
            elPriorityCount.textContent = `${totalPriority} việc`;
            elPriorityCount.className = `admin-badge ${totalPriority > 0 ? 'badge-warning' : 'badge-success'}`;
        }

        const elComplaintsBadge = document.getElementById('dashboardComplaintsBadge');
        if (elComplaintsBadge) elComplaintsBadge.textContent = pendingComplaintsCount;

        const elComplaintsSub = document.getElementById('dashboardComplaintsSub');
        if (elComplaintsSub) {
            elComplaintsSub.textContent = pendingComplaintsCount > 0 
                ? `${pendingComplaintsCount} ticket cần nhân viên tiếp nhận`
                : `Không có khiếu nại tồn đọng`;
        }

        const elOrdersBadge = document.getElementById('dashboardOrdersBadge');
        if (elOrdersBadge) elOrdersBadge.textContent = pendingOrdersCount;

        const elOrdersSub = document.getElementById('dashboardOrdersSub');
        if (elOrdersSub) {
            elOrdersSub.textContent = pendingOrdersCount > 0
                ? `${pendingOrdersCount} đơn hàng mới cần xác nhận`
                : `Tất cả đơn hàng đã được duyệt`;
        }

        // Cập nhật Dòng cảnh báo khẩn cấp (thuần chữ đỏ, không khung theo AGENTS.md)
        const alertBanner = document.getElementById('dashboardAlertBanner');
        const alertText = document.getElementById('dashboardAlertText');
        const alertBtn = document.getElementById('dashboardAlertAction');
        if (alertBanner && alertText && alertBtn) {
            if (pendingComplaintsCount > 0) {
                alertBanner.style.display = 'flex';
                alertText.textContent = `Cảnh báo vận hành: Có ${pendingComplaintsCount} khiếu nại khách hàng đang chờ xử lý SLA khẩn cấp!`;
                alertBtn.onclick = () => {
                    sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-services');
                    sessionStorage.setItem('pawpal_admin_complaint_filter_status', 'pending');
                    const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                        .find(b => b.getAttribute('data-title') === 'Khiếu nại');
                    if (target) target.click();
                };
            } else {
                alertBanner.style.display = 'none';
            }
        }
    }

    // ==========================================================================
    // GIAI ĐOẠN 2: THANH THAO TÁC TIẾP NHẬN TẠI QUẦY (QUICK RECEPTION BAR)
    // ==========================================================================
    function setupQuickReceptionActions() {
        const btnPet = document.getElementById('btnQuickReceptionPet');
        const btnService = document.getElementById('btnQuickBookingService');
        const btnOrder = document.getElementById('btnQuickCreateOrder');

        if (btnPet) {
            btnPet.addEventListener('click', () => {
                sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-list');
                sessionStorage.setItem('pawpal_admin_pet_open_add_modal', 'true');
                const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                    .find(b => b.getAttribute('data-title') === 'Thú cưng');
                if (target) target.click();
            });
        }

        if (btnService) {
            btnService.addEventListener('click', () => {
                sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-bookings');
                sessionStorage.setItem('pawpal_admin_service_open_create_modal', 'true');
                const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                    .find(b => b.getAttribute('data-title') === 'Dịch vụ');
                if (target) target.click();
            });
        }

        if (btnOrder) {
            btnOrder.addEventListener('click', () => {
                sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
                sessionStorage.setItem('pawpal_admin_order_open_create_modal', 'true');
                const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                    .find(b => b.getAttribute('data-title') === 'Bán hàng');
                if (target) target.click();
            });
        }
    }

    // ==========================================================================
    // GIAI ĐOẠN 2: MODAL XEM NHANH CA DỊCH VỤ TRÊN LỊCH HẸN
    // ==========================================================================
    let currentSelectedQuickBooking = null;

    function openBookingQuickModal(booking) {
        currentSelectedQuickBooking = booking;
        const modal = document.getElementById('dashboardBookingQuickModal');
        if (!modal) return;

        const elPet = document.getElementById('modalBookingPet');
        const elCust = document.getElementById('modalBookingCustomer');
        const elSvc = document.getElementById('modalBookingService');
        const elTime = document.getElementById('modalBookingTime');
        const elStaff = document.getElementById('modalBookingStaff');
        const elStatus = document.getElementById('modalBookingStatus');
        const elNotes = document.getElementById('modalBookingNotes');

        if (elPet) elPet.textContent = booking.pet || 'Bé cưng';
        if (elCust) elCust.textContent = booking.customer || 'Khách hàng';
        if (elSvc) elSvc.textContent = booking.service || 'Chăm sóc thú cưng';
        if (elTime) elTime.textContent = `${booking.time || '10:00'} · Hôm nay`;
        if (elStaff) elStaff.textContent = booking.staff || 'Groomer Tuấn (Đã xếp ca)';
        if (elStatus) elStatus.innerHTML = `<span class="admin-badge ${booking.badge || 'badge-success'}">${booking.status || 'Đã xác nhận'}</span>`;
        if (elNotes) elNotes.textContent = booking.notes || 'Bé ngoan, cẩn thận sấy vùng tai và dùng dầu tắm dưỡng lông dịu nhẹ.';

        modal.style.display = 'flex';
    }

    function closeBookingQuickModal() {
        const modal = document.getElementById('dashboardBookingQuickModal');
        if (modal) modal.style.display = 'none';
        currentSelectedQuickBooking = null;
    }

    function setupBookingQuickModalEvents() {
        const modal = document.getElementById('dashboardBookingQuickModal');
        const btnClose = document.getElementById('btnCloseBookingQuickModal');
        const btnDismiss = document.getElementById('btnDismissBookingModal');
        const btnGo = document.getElementById('btnGoToServiceDetail');

        if (btnClose) btnClose.addEventListener('click', closeBookingQuickModal);
        if (btnDismiss) btnDismiss.addEventListener('click', closeBookingQuickModal);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeBookingQuickModal();
            });
        }

        if (btnGo) {
            btnGo.addEventListener('click', () => {
                closeBookingQuickModal();
                sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-bookings');
                if (currentSelectedQuickBooking && currentSelectedQuickBooking.id) {
                    sessionStorage.setItem('pawpal_admin_service_selected_id', currentSelectedQuickBooking.id);
                }
                const target = Array.from(document.querySelectorAll('.sidebar-menu-btn'))
                    .find(b => b.getAttribute('data-title') === 'Dịch vụ');
                if (target) target.click();
            });
        }
    }
})();
