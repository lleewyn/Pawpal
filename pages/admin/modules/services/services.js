// services.js - Phân hệ Quản lý Dịch vụ Pawpal-er (Core Orchestrator)
(function() {
    'use strict';

    // Khởi tạo Namespace đồng bộ chuẩn
    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    window.PawpalServicesModule = PawpalServices;
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    // State dùng chung
    PawpalServices.state = {
        bookingsData: [],
        servicesData: [],
        reviewsData: [],
        liveStaffList: [],
        liveCustomerDirectory: [],
        livePetDirectory: [],
        selectedBookingId: sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001'
    };

    // Helper: Chuyển chuỗi tiếng Việt không dấu
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

    function formatCurrency(num) {
        if (!num && num !== 0) return '0 đ';
        return Number(num).toLocaleString('vi-VN') + ' đ';
    }

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
            border-radius: 9px;
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

    function showServiceConfirmModal({ title = 'Xác nhận thao tác', message = 'Bạn có chắc chắn muốn thực hiện thao tác này?', acceptText = 'Đồng ý', onAccept }) {
        const modal = document.getElementById('modalConfirmServiceAction');
        const titleEl = document.getElementById('confirmServiceActionTitle');
        const msgEl = document.getElementById('confirmServiceActionMessage');
        const btnAccept = document.getElementById('btnAcceptServiceConfirm');
        const btnCancel = document.getElementById('btnCancelServiceConfirm');
        const btnClose = document.getElementById('btnCloseConfirmServiceAction');

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
            if (btnCancel) btnCancel.onclick = null;
            if (btnClose) btnClose.onclick = null;
        };

        if (btnCancel) btnCancel.onclick = closeModal;
        if (btnClose) btnClose.onclick = closeModal;

        if (btnAccept) {
            btnAccept.onclick = () => {
                closeModal();
                if (typeof onAccept === 'function') onAccept();
            };
        }

        modal.classList.add('active');
    }

    function getStatusBadge(status) {
        switch (status) {
            case 'pending':
                return '<span class="admin-badge badge-warning">Chờ xác nhận</span>';
            case 'confirmed':
                return '<span class="admin-badge badge-neutral">Đã xác nhận</span>';
            case 'in_progress':
                return '<span class="admin-badge badge-info">Đang thực hiện</span>';
            case 'completed':
                return '<span class="admin-badge badge-success">Hoàn thành</span>';
            case 'cancelled':
                return '<span class="admin-badge badge-danger">Đã hủy</span>';
            default:
                return `<span class="admin-badge badge-neutral">${status}</span>`;
        }
    }

    function isBookingUpcoming(booking) {
        if (!booking) return false;
        const status = booking.status ? String(booking.status).toLowerCase() : '';
        if (status === 'completed' || status === 'cancelled') return false;
        if (status === 'in_progress') return true;

        const dateVal = booking.date || booking.appointment_date;
        const timeVal = booking.time || booking.appointment_time;

        if (dateVal && timeVal) {
            try {
                const now = new Date();
                const dStr = String(dateVal).split('T')[0];
                const dParts = dStr.split('-');
                const tParts = String(timeVal).split(':');

                if (dParts.length === 3 && tParts.length >= 2) {
                    const bYear = parseInt(dParts[0], 10);
                    const bMonth = parseInt(dParts[1], 10) - 1;
                    const bDay = parseInt(dParts[2], 10);
                    const bHour = parseInt(tParts[0], 10);
                    const bMinute = parseInt(tParts[1], 10);

                    const bDate = new Date(bYear, bMonth, bDay, bHour, bMinute, 0);

                    if (!isNaN(bDate.getTime())) {
                        const isSameDay = (
                            bDate.getFullYear() === now.getFullYear() &&
                            bDate.getMonth() === now.getMonth() &&
                            bDate.getDate() === now.getDate()
                        );
                        if (isSameDay) {
                            const diffMinutes = (bDate.getTime() - now.getTime()) / (1000 * 60);
                            if (diffMinutes >= -30 && diffMinutes <= 60) {
                                return true;
                            }
                        }
                    }
                }
            } catch (e) {}
        }

        if (booking.alertType === 'upcoming') return true;
        return false;
    }

    function getServiceSlaInfo(booking) {
        if (!booking || booking.status === 'cancelled') {
            return { level: 'ok', label: 'Đã hủy', minutesLate: 0 };
        }
        if (booking.status === 'completed') {
            return { level: 'ok', label: 'Hoàn thành', minutesLate: 0 };
        }
        if (booking.status === 'pending') {
            if (booking.alertType === 'urgent' || booking.id === 'BKG-1006') {
                return { level: 'danger', label: 'Quá hạn duyệt (>30p)', minutesLate: 35 };
            }
            return { level: 'warning', label: 'Chờ duyệt (>15p)', minutesLate: 15 };
        }
        if (booking.status === 'confirmed') {
            if (booking.alertType === 'urgent' || (!booking.staff)) {
                return { level: 'warning', label: 'Chờ KTV (+15p)', minutesLate: 15 };
            }
            if (isBookingUpcoming(booking) || booking.id === 'BKG-1008') {
                return { level: 'info', label: 'Sắp tới giờ', minutesLate: 0 };
            }
            return { level: 'ok', label: 'Chờ đón bé', minutesLate: 0 };
        }
        if (booking.status === 'in_progress') {
            if (booking.id === 'BKG-1009') {
                return { level: 'danger', label: 'Quá hạn SLA (>30p)', minutesLate: 35 };
            }
            if (booking.alertType === 'urgent') {
                return { level: 'warning', label: 'Trễ ca (+15p)', minutesLate: 18 };
            }
            return { level: 'ok', label: 'Đúng tiến độ', minutesLate: 0 };
        }
        return { level: 'ok', label: 'Bình thường', minutesLate: 0 };
    }

    function getAlertBadge(item) {
        if (item.status === 'cancelled') {
            return '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
        }
        const alerts = [];
        const sla = getServiceSlaInfo(item);

        if (item.petAlert) {
            alerts.push('<span class="alert-indicator text-danger">• Pet có lưu ý</span>');
        }
        if (sla.level === 'danger') {
            alerts.push(`<span class="alert-indicator text-danger">• ${sla.label}</span>`);
        } else if (sla.level === 'warning') {
            alerts.push(`<span class="alert-indicator text-warning">• ${sla.label}</span>`);
        } else if (sla.level === 'info') {
            alerts.push(`<span class="alert-indicator text-info">• ${sla.label}</span>`);
        }

        if (alerts.length === 0) {
            return '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
        }

        return `<div class="alert-text-stack">${alerts.join('')}</div>`;
    }

    // Export helpers sang namespace
    PawpalServices.toUnaccent = toUnaccent;
    PawpalServices.matchSearch = matchSearch;
    PawpalServices.formatCurrency = formatCurrency;
    PawpalServices.showToast = showToast;
    PawpalServices.showServiceConfirmModal = showServiceConfirmModal;
    PawpalServices.getStatusBadge = getStatusBadge;
    PawpalServices.isBookingUpcoming = isBookingUpcoming;
    PawpalServices.getServiceSlaInfo = getServiceSlaInfo;
    PawpalServices.getAlertBadge = getAlertBadge;

    // Nạp dữ liệu 100% Supabase Live Database
    async function loadServicesData() {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) return;

        try {
            console.log('[PawpalServices] Đang nạp dữ liệu từ Supabase Live Database...');
            const [appRes, svcRes, priceRes, revRes, careLogRes, staffRes, custRes, petRes] = await Promise.all([
                db.from('appointment')
                  .select(`
                      id, 
                      appointment_code, 
                      appointment_date, 
                      appointment_time, 
                      appointment_status, 
                      payment_status, 
                      total_price, 
                      note, 
                      customer:customer_id (id, phone_main, customer_profile (full_name)), 
                      pet_profile:pet_id (id, pet_code, pet_name, species, breed, weight, date_of_birth, allergy, vaccination_history, routine, avatar_url), 
                      service:service_id (id, service_code, service_name, service_category, estimated_duration, checklist, benefits, amenities), 
                      staff:staff_id (id, full_name, role)
                  `)
                  .order('created_at', { ascending: false }),
                db.from('service')
                  .select('*')
                  .order('service_code', { ascending: true }),
                db.from('service_price_matrix')
                  .select('*'),
                db.from('review')
                  .select('id, rating, review_content, review_type, created_at, shop_reply, customer:customer_id(id, customer_profile(full_name)), service:service_id(id, service_name)')
                  .order('created_at', { ascending: false }),
                db.from('care_log')
                  .select('*, care_action(*), care_log_media(*)'),
                db.from('staff')
                  .select('id, full_name, role, specialization, phone_number')
                  .order('full_name', { ascending: true }),
                db.from('customer')
                  .select(`
                      id, 
                      phone_main, 
                      customer_profile (*), 
                      pet_profile (id, pet_code, pet_name, species, breed, weight, allergy, routine)
                  `)
                  .order('created_at', { ascending: false }),
                db.from('pet_profile')
                  .select(`
                      id,
                      pet_code,
                      pet_name,
                      species,
                      breed,
                      weight,
                      allergy,
                      routine,
                      customer_id,
                      customer:customer_id (id, phone_main, customer_profile (full_name))
                  `)
                  .order('pet_name', { ascending: true })
            ]);

            const careLogs = (!careLogRes.error && careLogRes.data) ? careLogRes.data : [];

            if (!appRes.error && appRes.data && appRes.data.length > 0) {
                PawpalServices.state.bookingsData = appRes.data.map((item, idx) => {
                    let cat = 'Spa';
                    const catRaw = item.service?.service_category || '';
                    if (catRaw === 'PET_HOTEL' || catRaw.includes('HOTEL')) cat = 'Hotel';
                    else if (catRaw === 'PET_TAXI' || catRaw.includes('TAXI')) cat = 'Taxi';

                    let status = 'pending';
                    const s = String(item.appointment_status || '').toUpperCase();
                    if (s === 'CONFIRMED') status = 'confirmed';
                    else if (s === 'IN_PROGRESS' || s === 'PROCESSING' || s === 'CHECKED_IN') status = 'in_progress';
                    else if (s === 'COMPLETED') status = 'completed';
                    else if (s === 'CANCELLED') status = 'cancelled';

                    const customerName = item.customer?.customer_profile?.full_name || 'Khách vãng lai';
                    const phone = item.customer?.phone_main || '—';
                    const petName = item.pet_profile?.pet_name || 'Pet cưng';
                    const petBreed = item.pet_profile?.breed || 'Thú cưng';
                    const serviceName = item.service?.service_name || 'Dịch vụ Spa';
                    const staff = item.staff?.full_name || null;
                    const petWeight = item.pet_profile?.weight ? `${item.pet_profile.weight} kg` : '4.5 kg';
                    const petAllergy = item.pet_profile?.allergy || (item.note && item.note.toLowerCase().includes('dị ứng') ? item.note : null);

                    const relatedLogs = careLogs.filter(cl => cl.appointment_id === item.id || cl.pet_id === item.pet_profile?.id);

                    return {
                        id: item.appointment_code || 'BKG-' + (1000 + idx),
                        dbId: item.id,
                        userId: item.customer?.id || 'USER-001',
                        customerName,
                        phone,
                        petName,
                        petBreed,
                        petId: item.pet_profile?.pet_code || 'PET-001',
                        petWeight,
                        petAge: item.pet_profile?.date_of_birth ? '2 tuổi' : 'Chưa rõ',
                        petAlert: petAllergy,
                        category: cat,
                        categoryName: cat === 'Hotel' ? 'Pet Hotel' : (cat === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming'),
                        serviceName,
                        duration: item.service?.estimated_duration ? `${item.service.estimated_duration} phút` : '60 phút',
                        date: item.appointment_date || '2026-07-10',
                        time: item.appointment_time ? item.appointment_time.substring(0, 5) : '09:00',
                        staff,
                        price: item.total_price || 0,
                        total: item.total_price || 0,
                        paymentStatus: item.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thu',
                        status,
                        alertType: isBookingUpcoming({ status, date: item.appointment_date, time: item.appointment_time }) ? 'upcoming' : null,
                        careLogs: relatedLogs,
                        timeline: [
                            { title: 'Đặt lịch hẹn', time: item.appointment_time ? item.appointment_time.substring(0, 5) : '09:00', desc: 'Khách hàng đặt trực tuyến', done: true },
                            { title: 'Tiếp nhận an toàn', time: '09:15', desc: 'KTV kiểm tra da lông, mắt tai', done: status === 'in_progress' || status === 'completed' },
                            { title: 'Thực hiện dịch vụ', time: '09:30', desc: serviceName, done: status === 'in_progress' || status === 'completed' },
                            { title: 'Hoàn tất & Trả bé', time: '10:30', desc: 'Bàn giao cho chủ nuôi', done: status === 'completed' }
                        ]
                    };
                });
            }

            if (!svcRes.error && svcRes.data && svcRes.data.length > 0) {
                const priceMatrix = priceRes.data || [];
                PawpalServices.state.servicesData = svcRes.data.map(svc => {
                    let group = 'spa';
                    const codeUpper = String(svc.service_code || '').toUpperCase();
                    const catUpper = String(svc.service_category || '').toUpperCase();
                    const nameUpper = String(svc.service_name || '').toUpperCase();

                    if (codeUpper.startsWith('HTL') || catUpper === 'PET_HOTEL' || catUpper.includes('HOTEL') || nameUpper.includes('PHÒNG') || nameUpper.includes('SUITE') || nameUpper.includes('DAYCARE')) {
                        group = 'hotel';
                    } else if (codeUpper.startsWith('TXI') || catUpper === 'PET_TAXI' || catUpper.includes('TAXI') || nameUpper.includes('ĐƯA ĐÓN') || nameUpper.includes('PET TAXI')) {
                        group = 'taxi';
                    }

                    const svcPrices = priceMatrix.filter(p => p.service_id === svc.id);
                    let minPriceVal = 120000;
                    const pricesObj = {
                        under5: '120.000',
                        to10: '150.000',
                        to20: '200.000',
                        over20: '250.000'
                    };

                    if (svcPrices.length > 0) {
                        const validPrices = svcPrices.map(p => Number(p.unit_price) || 0).filter(p => p > 0);
                        if (validPrices.length > 0) minPriceVal = Math.min(...validPrices);
                        svcPrices.forEach(p => {
                            const formatted = (Number(p.unit_price) || 0).toLocaleString('vi-VN');
                            if (p.weight_to < 5) pricesObj.under5 = formatted;
                            else if (p.weight_from >= 5 && p.weight_to <= 10) pricesObj.to10 = formatted;
                            else if (p.weight_from >= 10 && p.weight_to <= 20) pricesObj.to20 = formatted;
                            else if (p.weight_from >= 20) pricesObj.over20 = formatted;
                        });
                    }

                    return {
                        id: svc.service_code,
                        code: svc.service_code,
                        dbId: svc.id,
                        group: group,
                        category: group,
                        name: svc.service_name,
                        duration: svc.estimated_duration ? `${svc.estimated_duration} phút` : '60 phút',
                        prices: pricesObj,
                        desc: svc.description || '',
                        status: (svc.status === 'ACTIVE' || !svc.status) ? 'Đang phục vụ' : 'Tạm ẩn',
                        image: svc.thumbnail_url || (group === 'hotel' ? '/assets/images/services/hotel/deluxe.webp' : (group === 'taxi' ? '/assets/images/services/taxi/car.webp' : '/assets/images/services/spa/process/spa01.webp'))
                    };
                });
            }

            if (!revRes.error && revRes.data && revRes.data.length > 0) {
                PawpalServices.state.reviewsData = revRes.data.map((r, i) => {
                    let cat = 'Spa';
                    const sName = r.service?.service_name || '';
                    if (sName.includes('Hotel') || sName.includes('Phòng')) cat = 'Hotel';
                    else if (sName.includes('Taxi') || sName.includes('Đón')) cat = 'Taxi';

                    return {
                        id: 'REV-' + (100 + i),
                        dbId: r.id,
                        bookingId: r.appointment_id ? ('BKG-' + r.appointment_id.slice(0, 4)) : 'BKG-100' + (i % 8 + 1),
                        customerName: r.customer?.customer_profile?.full_name || 'Khách hàng PawPal',
                        phone: r.customer?.phone_main || '0901234567',
                        serviceName: sName || 'Dịch vụ Spa và Grooming',
                        category: cat,
                        staff: 'Ngọc Anh',
                        rating: r.rating || 5,
                        comment: r.review_content || 'Dịch vụ rất chu đáo và tận tâm.',
                        status: r.shop_reply ? 'replied' : 'pending',
                        replyText: r.shop_reply || ''
                    };
                });
            }

            if (!staffRes.error && Array.isArray(staffRes.data)) {
                PawpalServices.state.liveStaffList = staffRes.data;
            }
            if (!custRes.error && Array.isArray(custRes.data)) {
                PawpalServices.state.liveCustomerDirectory = custRes.data;
            }
            if (petRes && !petRes.error && Array.isArray(petRes.data)) {
                PawpalServices.state.livePetDirectory = petRes.data;
            }
        } catch (err) {
            console.error('[PawpalServices] Lỗi kết nối Supabase:', err);
        }
    }
    PawpalServices.loadServicesData = loadServicesData;

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(bookingCode) {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (bookingCode) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${bookingCode}</span>
            `;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }
    PawpalServices.updateBreadcrumb = updateBreadcrumb;

    function switchSubtab(subtabId, updateHistory = true) {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');

        if (subtabsContainer) {
            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtabId);
            });
        }

        document.querySelectorAll('.subtab-content').forEach(section => {
            section.classList.toggle('active', section.id === 'subtab-' + subtabId);
        });

        sessionStorage.setItem('pawpal_admin_services_active_subtab', subtabId);
        if (updateHistory) {
            if (window.location.hash !== '#' + subtabId) {
                try {
                    history.pushState(null, '', '#' + subtabId);
                } catch (e) {
                    window.location.hash = '#' + subtabId;
                }
            }
        } else {
            if (window.location.hash !== '#' + subtabId) {
                try {
                    history.replaceState(null, '', '#' + subtabId);
                } catch (e) {}
            }
        }

        if (subtabId === 'tab-service-detail') {
            const bId = PawpalServices.state.selectedBookingId || 'BKG-1001';
            updateBreadcrumb(bId);
            if (PawpalServices.subtabs.detail?.renderBookingDetail) {
                PawpalServices.subtabs.detail.renderBookingDetail(bId);
            }
        } else {
            updateBreadcrumb(null);
        }

        if (subtabId === 'tab-service-bookings' && PawpalServices.subtabs.bookings) {
            PawpalServices.subtabs.bookings.renderBookingsTable();
            PawpalServices.subtabs.bookings.renderUpcomingBar();
            PawpalServices.subtabs.bookings.updateKPIs();
        } else if (subtabId === 'tab-service-catalog' && PawpalServices.subtabs.catalog) {
            PawpalServices.subtabs.catalog.renderCatalogTable();
        } else if (subtabId === 'tab-service-reviews' && PawpalServices.subtabs.reviews) {
            PawpalServices.subtabs.reviews.renderReviewsTable();
            PawpalServices.subtabs.reviews.updateReviewKPIs();
        }

        if (window.lucide) lucide.createIcons();
    }
    PawpalServices.switchSubtab = switchSubtab;

    function openBookingDetail(bookingId) {
        PawpalServices.state.selectedBookingId = bookingId;
        sessionStorage.setItem('pawpal_admin_service_selected_id', bookingId);
        switchSubtab('tab-service-detail');
    }
    PawpalServices.openBookingDetail = openBookingDetail;

    async function initServicesModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // Render 4 subtab lên Header Bar
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-service-bookings">Lịch hẹn</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-service-detail">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-service-catalog">Bảng giá</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-service-reviews">Đánh giá</button>
            `;

            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const subtabId = btn.getAttribute('data-subtab');
                    switchSubtab(subtabId, true);
                });
            });
        }

        // Tải dữ liệu ban đầu từ Supabase
        await loadServicesData();

        // Khởi tạo các subtab con
        if (PawpalServices.subtabs.bookings?.renderBookingsTable) {
            PawpalServices.subtabs.bookings.renderBookingsTable();
            PawpalServices.subtabs.bookings.renderUpcomingBar();
            PawpalServices.subtabs.bookings.updateKPIs();
        }
        if (PawpalServices.subtabs.catalog?.renderCatalogTable) {
            PawpalServices.subtabs.catalog.renderCatalogTable();
        }
        if (PawpalServices.subtabs.reviews?.renderReviewsTable) {
            PawpalServices.subtabs.reviews.renderReviewsTable();
            PawpalServices.subtabs.reviews.updateReviewKPIs();
        }

        // Khôi phục subtab active từ URL hash hoặc sessionStorage
        const savedSubtab = sessionStorage.getItem('pawpal_admin_services_active_subtab');
        const hashSubtab = window.location.hash ? window.location.hash.substring(1) : '';
        const validTabs = ['tab-service-bookings', 'tab-service-detail', 'tab-service-catalog', 'tab-service-reviews'];

        if (validTabs.includes(hashSubtab)) {
            switchSubtab(hashSubtab, false);
        } else if (savedSubtab && validTabs.includes(savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-service-bookings', false);
        }

        window.addEventListener('hashchange', () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            if (validTabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        });
    }

    PawpalServices.init = initServicesModule;
    window.initServicesModule = initServicesModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServicesModule);
    } else {
        initServicesModule();
    }
})();
