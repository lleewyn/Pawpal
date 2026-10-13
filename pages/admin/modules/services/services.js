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

    PawpalServices.showConfirmModal = showServiceConfirmModal;

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
        if (!booking || !['pending','confirmed'].includes(String(booking.status || '').toLowerCase())) return false;
        const date = booking.date || booking.appointment_date;
        const time = booking.time || booking.appointment_time;
        if (!date || !time) return false;
        const scheduledAt = Date.parse(`${String(date).slice(0,10)}T${String(time).slice(0,5)}:00+07:00`);
        const remaining = scheduledAt - Date.now();
        return Number.isFinite(scheduledAt) && remaining >= 0 && remaining <= 3600000;
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
    let _servicesLastFetchedAt = 0;
    const SERVICES_CACHE_TTL_MS = 90_000;

    async function loadServicesData({ force = false } = {}) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) { PawpalServices.state.loadError = 'Không thể kết nối cơ sở dữ liệu.'; return; }

        // Bỏ qua fetch lại nếu dữ liệu còn mới (< 90s) và đã có dữ liệu trong state
        if (!force && Date.now() - _servicesLastFetchedAt < SERVICES_CACHE_TTL_MS && PawpalServices.state.bookingsData.length > 0) {
            console.log('[PawpalServices] Dùng cache in-memory, bỏ qua fetch.');
            return;
        }

        try {
            PawpalServices.state.loadError = null;
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
                  .select('id, rating, review_content, review_type, created_at, shop_reply, customer:customer_id(id, phone_main, customer_profile(full_name)), service:service_id(id, service_name)')
                  .eq('review_type', 'SERVICE')
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

            for (const result of [appRes, svcRes, revRes]) { if (result.error) throw result.error; }
            const careLogs = (!careLogRes.error && careLogRes.data) ? careLogRes.data : [];

            if (!appRes.error && Array.isArray(appRes.data)) {
                PawpalServices.state.bookingsData = appRes.data.map((item, idx) => {
                    let cat = 'Spa';
                    const catRaw = String(item.service?.service_category || '').toUpperCase();
                    const serviceLabel = item.service?.service_name || '';
                    if (catRaw.includes('HOTEL') || /phòng|hotel|suite/i.test(serviceLabel)) cat = 'Hotel';
                    else if (catRaw.includes('TAXI') || /taxi|đưa đón/i.test(serviceLabel)) cat = 'Taxi';

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
                    const petWeight = Number(item.pet_profile?.weight) > 0 ? `${item.pet_profile.weight} kg` : 'Chưa cập nhật';
                    const petAllergy = item.pet_profile?.allergy && !/^(không|none)$/i.test(item.pet_profile.allergy.trim()) ? item.pet_profile.allergy : (item.note && item.note.toLowerCase().includes('dị ứng') ? item.note : null);

                    const relatedLogs = careLogs.filter(cl => cl.appointment_id === item.id);

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
                        petAge: item.pet_profile?.date_of_birth ? (() => { const months = Math.floor((Date.now()-Date.parse(item.pet_profile.date_of_birth))/2629800000); return months >= 12 ? `${Math.floor(months/12)} tuổi` : months >= 0 ? `${months} tháng` : 'Chưa cập nhật'; })() : 'Chưa cập nhật',
                        petAlert: petAllergy,
                        category: cat,
                        categoryName: cat === 'Hotel' ? 'Pet Hotel' : (cat === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming'),
                        serviceName,
                        duration: item.service?.estimated_duration ? `${item.service.estimated_duration} phút` : '60 phút',
                        date: item.appointment_date || '',
                        time: item.appointment_time ? item.appointment_time.substring(0, 5) : '',
                        staff,
                        price: item.total_price || 0,
                        total: item.total_price || 0,
                        paymentStatus: item.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thu',
                        status,
                        alertType: isBookingUpcoming({ status, date: item.appointment_date, time: item.appointment_time }) ? 'upcoming' : null,
                        careLogs: relatedLogs,
                        timeline: relatedLogs.map(log => ({title: log.description || 'Ghi nhận chăm sóc',time: log.recorded_at || log.created_at || '',desc: log.health_status || '',done: true}))
                    };
                });
            }

            if (!svcRes.error && Array.isArray(svcRes.data)) {
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

            if (!revRes.error && Array.isArray(revRes.data)) {
                PawpalServices.state.reviewsData = revRes.data.map((r, i) => {
                    let cat = 'Spa';
                    const sName = r.service?.service_name || '';
                    if (sName.includes('Hotel') || sName.includes('Phòng')) cat = 'Hotel';
                    else if (sName.includes('Taxi') || sName.includes('Đón')) cat = 'Taxi';

                    return {
                        id: 'REV-' + (100 + i),
                        dbId: r.id,
                        bookingId: '—',
                        customerName: r.customer?.customer_profile?.full_name || 'Khách hàng PawPal',
                        phone: r.customer?.phone_main || '—',
                        serviceName: sName || 'Dịch vụ Spa và Grooming',
                        category: cat,
                        staff: 'Chưa có thông tin',
                        rating: r.rating || 5,
                        comment: r.review_content || '—',
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
            const ratings = new Map();
            (revRes.data || []).forEach(review => {
                const value = Number(review.rating);
                if (!review.service?.id || !Number.isFinite(value) || value < 1 || value > 5) return;
                const values = ratings.get(review.service.id) || [];
                values.push(value); ratings.set(review.service.id, values);
            });
            PawpalServices.state.servicesData.forEach(service => {
                const values = ratings.get(service.dbId) || [];
                service.averageRating = values.length ? values.reduce((sum,rating)=>sum+rating,0)/values.length : null;
            });
            PawpalServices.state.isLoaded = true;
            _servicesLastFetchedAt = Date.now();
        } catch (err) {
            PawpalServices.state.loadError = 'Không thể tải dữ liệu dịch vụ. Vui lòng tải lại trang.';
            console.error('[PawpalServices] Lỗi kết nối Supabase:', err);
        }
    }
    PawpalServices.loadServicesData = loadServicesData;

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(bookingCode) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') return;
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
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') return;
        const subtabsContainer = document.getElementById('headerSubtabsGroup');

        if (subtabsContainer) {
            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-subtab') === subtabId);
            });
        }

        const root = document.getElementById('subtab-tab-service-bookings')?.closest('.admin-module-wrapper');
        if (!root || sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') return;
        root.querySelectorAll('.subtab-content').forEach(section => {
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

        const validTabs = ['tab-service-bookings', 'tab-service-detail', 'tab-service-catalog', 'tab-service-reviews'];

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
        if (PawpalServices.subtabs.detail?.renderBookingDetail) {
            const bId = sessionStorage.getItem('pawpal_admin_service_selected_id') || PawpalServices.state.selectedBookingId;
            PawpalServices.subtabs.detail.renderBookingDetail(bId);
        }

        // Khôi phục subtab active từ URL hash hoặc sessionStorage
        const savedSubtab = sessionStorage.getItem('pawpal_admin_services_active_subtab');
        const hashSubtab = window.location.hash ? window.location.hash.substring(1) : '';

        if (validTabs.includes(hashSubtab)) {
            switchSubtab(hashSubtab, false);
        } else if (savedSubtab && validTabs.includes(savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-service-bookings', false);
        }

        window.addEventListener('admin:subtab-change', (e) => {
            if (e.detail?.module === 'Dịch vụ' && validTabs.includes(e.detail.tabId)) {
                switchSubtab(e.detail.tabId, false);
            }
        });

        // BỘ LẮNG NGHE ĐÓNG MODAL 4 CHIỀU TOÀN CỤC CHUẨN RULE AGENTS.MD
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-close-modal]');
            if (closeBtn) {
                const modalId = closeBtn.getAttribute('data-close-modal');
                const modalEl = document.getElementById(modalId);
                if (modalEl) {
                    modalEl.classList.remove('active');
                    if (modalEl.style) modalEl.style.display = 'none';
                }
            }
            if (e.target.classList.contains('admin-modal-overlay')) {
                e.target.classList.remove('active');
                if (e.target.style) e.target.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.admin-modal-overlay.active').forEach(m => {
                    m.classList.remove('active');
                    if (m.style) m.style.display = 'none';
                });
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
