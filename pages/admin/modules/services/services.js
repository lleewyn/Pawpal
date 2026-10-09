// services.js - Phân hệ Quản lý Dịch vụ Pawpal-er
(function() {
    // Dữ liệu vận hành của phân hệ Dịch vụ
    let bookingsData = [];
    let servicesData = [];
    let reviewsData = [];
    let liveStaffList = [];
    let liveCustomerDirectory = [];
    let livePetDirectory = [];
    let updateServiceOptionsRef = null;
    let populateStaffSelectRef = null;
    let populateCustomerDatalistRef = null;
    let selectedBookingId = sessionStorage.getItem('pawpal_admin_service_selected_id') || 'BKG-1001';

    // Helper: Kiểm tra lịch hẹn sắp tới theo thời gian thực (trong vòng 60 phút)
    function isBookingUpcoming(booking) {
        if (!booking) return false;
        const status = booking.status ? String(booking.status).toLowerCase() : '';
        if (status === 'completed' || status === 'cancelled') {
            return false;
        }

        // 1. Ca đang diễn ra trong phiên phục vụ tại tiệm (in_progress)
        if (status === 'in_progress') {
            return true;
        }

        // 2. Kiểm tra mốc thời gian thực tế trong vòng 60 phút
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

                        // Nếu là cùng ngày hôm nay: tính độ chênh lệch phút
                        // Sắp tới trong 60 phút: từ -30 phút (trễ/đang chờ tiếp nhận) đến +60 phút (sắp đến giờ)
                        if (isSameDay) {
                            const diffMinutes = (bDate.getTime() - now.getTime()) / (1000 * 60);
                            if (diffMinutes >= -30 && diffMinutes <= 60) {
                                return true;
                            }
                        }
                    }
                }
            } catch (err) {
                // Bỏ qua lỗi parse
            }
        }

        // 3. Cờ alertType được gán rõ ràng
        if (booking.alertType === 'upcoming') {
            return true;
        }

        return false;
    }

    // Hàm nạp dữ liệu từ Supabase (kèm fallback tệp JSON tĩnh nếu cần)
    async function loadServicesData(forceReload = false) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

        if (db && !forceReload) {
            try {
                console.log('[Services] Đang nạp dữ liệu Dịch vụ & Lịch hẹn từ Supabase...');
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
                    bookingsData = appRes.data.map((item, idx) => {
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

                        // Tìm care logs thuộc về appointment này
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
                    servicesData = svcRes.data.map(svc => {
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
                            under5: "120.000",
                            to10: "150.000",
                            to20: "200.000",
                            over20: "250.000"
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

                        let steps = [
                            "Tiếp nhận bé và kiểm tra da lông sơ bộ",
                            "Tắm sạch sâu và xả thơm thảo dược dịu nhẹ",
                            "Sấy khô và đánh tơi phồng lông",
                            "Vệ sinh tai, tuyến hôi và mài dũa móng",
                            "Chụp ảnh hoàn tất và bàn giao cho chủ"
                        ];
                        if (Array.isArray(svc.checklist) && svc.checklist.length > 0) {
                            steps = svc.checklist;
                        } else if (typeof svc.checklist === 'string' && svc.checklist) {
                            try {
                                const parsed = JSON.parse(svc.checklist);
                                if (Array.isArray(parsed)) steps = parsed;
                            } catch(e) {
                                steps = svc.checklist.split(',').map(s => s.trim());
                            }
                        }

                        let categoryName = 'Spa và Grooming – Chăm sóc cơ bản';
                        if (group === 'hotel') categoryName = 'Pet Hotel – Phòng lưu trú cao cấp';
                        else if (group === 'taxi') categoryName = 'Pet Taxi – Đưa đón tận nơi';
                        else if (svc.service_name.includes('Tạo Kiểu') || svc.service_name.includes('Grooming')) categoryName = 'Spa và Grooming – Tạo kiểu';
                        else if (svc.service_name.includes('Trị Liệu') || svc.service_name.includes('Thuốc')) categoryName = 'Spa và Grooming – Đặc trị';

                        const rawImg = svc.thumbnail_url || (Array.isArray(svc.images) ? svc.images[0] : (typeof svc.images === 'string' ? svc.images.split(',')[0].trim() : ''));
                        const imgUrl = rawImg || (group === 'hotel' ? '/assets/images/services/hotel/deluxe.webp' : (group === 'taxi' ? '/assets/images/services/taxi/car.webp' : '/assets/images/services/spa/process/spa01.webp'));

                        return {
                            id: svc.service_code,
                            code: svc.service_code,
                            dbId: svc.id,
                            group: group,
                            category: group,
                            categoryName: categoryName,
                            name: svc.service_name,
                            petType: svc.pet_type || 'Chó / Mèo',
                            duration: svc.estimated_duration ? `${svc.estimated_duration} phút` : '60 phút',
                            rating: parseFloat(svc.rating || 4.8),
                            reviews: svc.review_count || 50,
                            priceFrom: minPriceVal.toLocaleString('vi-VN'),
                            prices: pricesObj,
                            desc: svc.description || '',
                            description: svc.description || '',
                            staffLevel: svc.groomer_level || 'Junior Groomer',
                            status: (svc.status === 'ACTIVE' || !svc.status) ? 'Đang phục vụ' : 'Tạm ẩn',
                            image: imgUrl,
                            steps: steps,
                            commission: 15,
                            checklist: steps,
                            benefits: svc.benefits,
                            amenities: svc.amenities
                        };
                    });
                }

                if (!revRes.error && revRes.data && revRes.data.length > 0) {
                    reviewsData = revRes.data.map((r, i) => {
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
                            petName: 'Bé cưng',
                            serviceName: sName || 'Dịch vụ Spa và Grooming',
                            category: cat,
                            staff: 'Ngọc Anh',
                            rating: r.rating || 5,
                            comment: r.review_content || 'Dịch vụ rất chu đáo và tận tâm.',
                            date: r.created_at ? r.created_at.split('T')[0] : '2026-06-10',
                            status: r.shop_reply ? 'replied' : 'pending',
                            replyText: r.shop_reply || '',
                            replyDate: r.shop_reply ? (r.updated_at ? r.updated_at.split('T')[0] : '2026-06-10') : '',
                            voucherSent: null
                        };
                    });
                }

                if (!staffRes.error && Array.isArray(staffRes.data)) {
                    liveStaffList = staffRes.data;
                    if (typeof populateStaffSelectRef === 'function') populateStaffSelectRef();
                }
                if (!custRes.error && Array.isArray(custRes.data)) {
                    liveCustomerDirectory = custRes.data;
                    if (typeof populateCustomerDatalistRef === 'function') populateCustomerDatalistRef();
                }
                if (petRes && !petRes.error && Array.isArray(petRes.data) && petRes.data.length > 0) {
                    livePetDirectory = petRes.data;
                } else if (liveCustomerDirectory.length > 0) {
                    livePetDirectory = [];
                    liveCustomerDirectory.forEach(c => {
                        const pets = Array.isArray(c.pet_profile) ? c.pet_profile : (c.pet_profile ? [c.pet_profile] : []);
                        pets.forEach(p => {
                            livePetDirectory.push({
                                ...p,
                                customer_id: c.id,
                                customer: c
                            });
                        });
                    });
                }
                if (typeof updateServiceOptionsRef === 'function') {
                    const currentCat = document.getElementById('newBookingCategory')?.value || 'Spa';
                    updateServiceOptionsRef(currentCat);
                }

                if (bookingsData.length > 0 || servicesData.length > 0) {
                    console.log(`[Services] Đã nạp thành công từ Supabase: ${bookingsData.length} lịch hẹn, ${servicesData.length} dịch vụ, ${reviewsData.length} đánh giá, ${liveStaffList.length} nhân viên.`);
                    return;
                }
            } catch (err) {
                console.error('[Services] Lỗi kết nối Supabase:', err);
            }
        }
    }
    let currentCatalogGroup = 'spa';
    let activeDropdownBookingId = null;
    let currentEditingServiceSteps = [];
    let currentCarelogStepImages = [];

    // Bộ lọc Lịch hẹn
    let currentSearchTerm = '';
    let currentFilterCategory = 'ALL';
    let currentFilterStatus = 'ALL';
    let currentFilterStaff = 'ALL';
    let isUpcomingFilterActive = false;
    let isAllergyFilterActive = false;
    let isSlaFilterActive = false;
    let currentBookingPage = 1;
    const BOOKINGS_PER_PAGE = 10;
    let intakeProofImagesTemp = [];
    let surchargeProofImagesTemp = [];
    let completeProofImagesTemp = [];
    let editCarelogStepPhotosTemp = [];

    // Bộ lọc Danh mục
    let catalogSearchTerm = '';
    let catalogFilterStatus = 'ALL';

    // Bộ lọc Đánh giá
    let reviewSearchTerm = '';
    let reviewFilterStar = 'ALL';
    let reviewFilterCategory = 'ALL';
    let reviewFilterStaff = 'ALL';
    let reviewFilterStatus = 'ALL';
    // Chuyển chuỗi tiếng Việt có dấu thành không dấu để tìm kiếm thông minh (Unaccent Search)
    function toUnaccent(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
            .toLowerCase()
            .trim();
    }

    // Cấu hình danh mục KTV và định mức tải ca trong ngày (Chuẩn Forest Palette & Muted Pastel)
    const STAFF_DIRECTORY = [
        { name: 'Ngọc Anh', role: 'Senior Groomer', maxCapacity: 4, level: 'Senior' },
        { name: 'Thu Thảo', role: 'Junior Groomer', maxCapacity: 4, level: 'Junior' },
        { name: 'Hoàng Nam', role: 'Master Groomer và Pet Hotel', maxCapacity: 4, level: 'Master' },
        { name: 'Hữu Phúc', role: 'Pet Taxi và Phụ tá chăm sóc', maxCapacity: 4, level: 'Assistant' }
    ];

    function getStaffActiveBookings(staffName) {
        if (!staffName) return [];
        return bookingsData.filter(b => b.staff === staffName && b.status !== 'cancelled');
    }

    function getShiftForBooking(booking) {
        const timeStr = booking.time || booking.date || '';
        const match = timeStr.match(/(\d{1,2}):(\d{2})/);
        if (match) {
            const hour = parseInt(match[1], 10);
            if (hour < 12) return 'MORNING';
            if (hour < 17) return 'AFTERNOON';
            return 'EVENING';
        }
        return 'AFTERNOON';
    }

    // Lưu dữ liệu vào SessionStorage
    function persistData() {
        sessionStorage.setItem('pawpal_admin_services_bookings', JSON.stringify(bookingsData));
        sessionStorage.setItem('pawpal_admin_services_catalog', JSON.stringify(servicesData));
        sessionStorage.setItem('pawpal_admin_services_reviews', JSON.stringify(reviewsData));
        sessionStorage.setItem('pawpal_admin_service_selected_id', selectedBookingId);
    }

    // Helper: Hiển thị thông báo Toast chuẩn 9px
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
            z-index: 9999;
            display: block;
        `;
        toast.textContent = msg;
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    // Helper: Mở Custom Confirm Modal chuẩn AGENTS.md thay thế window.confirm()
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

    // Helper: Định dạng tiền tệ
    function formatCurrency(num) {
        if (!num && num !== 0) return '0 đ';
        return Number(num).toLocaleString('vi-VN') + ' đ';
    }

    // Helper: Trạng thái badge
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

    // Helper: Tính toán giám sát SLA tiến trình dịch vụ và Aging
    function getServiceSlaInfo(booking) {
        if (!booking || booking.status === 'cancelled') {
            return { level: 'ok', label: 'Đã hủy', minutesLate: 0 };
        }
        if (booking.status === 'completed') {
            return { level: 'ok', label: 'Hoàn thành', minutesLate: 0 };
        }

        // 1. Chờ xác nhận (pending)
        if (booking.status === 'pending') {
            if (booking.alertType === 'urgent' || booking.id === 'BKG-1006') {
                return { level: 'danger', label: 'Quá hạn duyệt (>30p)', minutesLate: 35 };
            }
            return { level: 'warning', label: 'Chờ duyệt (>15p)', minutesLate: 15 };
        }

        // 2. Đã xác nhận (confirmed - chờ khách tới tiếp nhận)
        if (booking.status === 'confirmed') {
            if (booking.alertType === 'urgent' || (!booking.staff)) {
                return { level: 'warning', label: 'Chờ KTV (+15p)', minutesLate: 15 };
            }
            if (isBookingUpcoming(booking) || booking.id === 'BKG-1008') {
                return { level: 'info', label: 'Sắp tới giờ', minutesLate: 0 };
            }
            return { level: 'ok', label: 'Chờ đón bé', minutesLate: 0 };
        }

        // 3. Đang thực hiện (in_progress)
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

    // Helper: Nhãn cảnh báo (Tích hợp Pet Alert, SLA Alert, và Phân công KTV - Tối giản, thuần chữ, không hộp màu)
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

    // ==========================================================================
    // 1. QUẢN LÝ SUB-TABS TRÊN HEADER BAR
    // ==========================================================================
    function setupHeaderSubtabs() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');

        if (!subtabsContainer) return;

        // Ẩn tiêu đề module thừa
        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // Tạo 4 subtab dạng text thuần phân tách bởi |
        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn active" data-subtab="tab-service-bookings">Lịch hẹn</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-detail">Hồ sơ</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-catalog">Bảng giá</button>
            <span class="header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn" data-subtab="tab-service-reviews">Đánh giá</button>
        `;

        const subtabBtns = subtabsContainer.querySelectorAll('.header-subtab-btn');
        subtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subtabId = btn.getAttribute('data-subtab');
                switchSubtab(subtabId, true);
            });
        });

        const handleServicesHashChange = () => {
            const currentHash = window.location.hash ? window.location.hash.substring(1) : '';
            const validTabs = ['tab-service-bookings', 'tab-service-catalog', 'tab-service-pricing', 'tab-service-reports', 'tab-service-reviews', 'tab-service-detail'];
            if (validTabs.includes(currentHash)) {
                switchSubtab(currentHash, false);
            }
        };
        window.addEventListener('hashchange', handleServicesHashChange);

        const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
        if (currentMod && currentMod !== 'Dịch vụ') return;

        // Kiểm tra hash hoặc sessionStorage để mở subtab mong muốn
        const hash = window.location.hash || '';
        const savedSubtab = sessionStorage.getItem('pawpal_admin_services_active_subtab');
        if (hash === '#tab-service-detail' || (hash.startsWith('#tab-service') && savedSubtab === 'tab-service-detail')) {
            switchSubtab('tab-service-detail', false);
        } else if (hash === '#tab-service-catalog' || (hash.startsWith('#tab-service') && savedSubtab === 'tab-service-catalog')) {
            switchSubtab('tab-service-catalog', false);
        } else if (hash === '#tab-service-reviews' || (hash.startsWith('#tab-service') && savedSubtab === 'tab-service-reviews')) {
            switchSubtab('tab-service-reviews', false);
        } else if (hash === '#tab-service-bookings' || (hash.startsWith('#tab-service') && savedSubtab === 'tab-service-bookings')) {
            switchSubtab('tab-service-bookings', false);
        } else if (savedSubtab && document.getElementById('subtab-' + savedSubtab)) {
            switchSubtab(savedSubtab, false);
        } else {
            switchSubtab('tab-service-bookings', false);
        }
    }

    function switchSubtab(subtabId, updateHistory = true) {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');

        // Cập nhật nút active trên Header
        if (subtabsContainer) {
            subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
                if (btn.getAttribute('data-subtab') === subtabId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Ẩn hiện nội dung subtab
        document.querySelectorAll('.subtab-content').forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById('subtab-' + subtabId);
        if (targetSection) targetSection.classList.add('active');

        // Đồng bộ URL Hash
        const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
        if (!currentMod || currentMod === 'Dịch vụ') {
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
        }

        // Quản lý Deep Breadcrumb
        if (deepBreadcrumbEl) {
            if (subtabId === 'tab-service-detail') {
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                const code = booking ? booking.id : selectedBookingId;
                deepBreadcrumbEl.innerHTML = `<span class="breadcrumb-separator">/</span> <span class="breadcrumb-detail-name">${code}</span>`;
                renderBookingDetail(selectedBookingId);
            } else {
                deepBreadcrumbEl.innerHTML = '';
            }
        }

        if (subtabId === 'tab-service-bookings') {
            renderBookingsTable();
            renderUpcomingBar();
            updateKPIs();
        } else if (subtabId === 'tab-service-catalog') {
            renderCatalogTable();
        } else if (subtabId === 'tab-service-reviews') {
            renderReviewsTable();
            updateReviewKPIs();
        }
    }

    // ==========================================================================
    // 2. RENDER VÀ TÍNH TOÁN KPI
    // ==========================================================================
    function updateKPIs() {
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

    // ==========================================================================
    // 3. THANH THÔNG BÁO LỊCH HẸN TRONG 60 PHÚT (MỎNG, GỌN, KHÔNG ICON)
    // ==========================================================================
    function renderUpcomingBar() {
        const container = document.getElementById('upcomingItemsContainer');
        const bar = document.getElementById('upcomingAlertBar');
        if (!container) return;

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
                if (bkgId) openBookingDetail(bkgId);
            });
        });
    }

    // ==========================================================================
    // 4. RENDER BẢNG DỮ LIỆU LỊCH HẸN
    // ==========================================================================
    function renderBookingsTable() {
        const tbody = document.getElementById('servicesBookingTableBody');
        if (!tbody) return;

        // Lọc dữ liệu
        let filtered = bookingsData.filter(item => {
            // Tìm kiếm (Hỗ trợ tiếng Việt không dấu và có dấu)
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

            // Nhóm dịch vụ
            if (currentFilterCategory !== 'ALL' && item.category !== currentFilterCategory) return false;

            // Trạng thái
            if (currentFilterStatus !== 'ALL' && item.status !== currentFilterStatus) return false;

            // Kỹ thuật viên
            if (currentFilterStaff !== 'ALL') {
                if (currentFilterStaff === 'UNASSIGNED') {
                    if (item.staff) return false;
                } else if (item.staff !== currentFilterStaff) {
                    return false;
                }
            }

            // Toggle lịch sắp tới (đồng bộ logic thời gian thực 60 phút)
            if (isUpcomingFilterActive && !isBookingUpcoming(item)) return false;

            // Toggle pet có dị ứng / lưu ý
            if (isAllergyFilterActive && !item.petAlert) return false;

            // Toggle quá hạn SLA và Trễ ca
            if (isSlaFilterActive) {
                const sla = getServiceSlaInfo(item);
                if (sla.level !== 'danger' && sla.level !== 'warning') return false;
            }

            return true;
        });

        const totalRecords = filtered.length;
        const totalPages = Math.ceil(totalRecords / BOOKINGS_PER_PAGE);

        // Cập nhật hiển thị nút X xóa ô tìm kiếm (chỉ hiện khi có nhập text vào ô tìm kiếm)
        const btnToolbarReset = document.getElementById('btnToolbarResetFilters');
        if (btnToolbarReset) {
            btnToolbarReset.style.display = (currentSearchTerm && currentSearchTerm.length > 0) ? 'inline-flex' : 'none';
        }

        if (totalRecords === 0) {
            currentBookingPage = 1;
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state-cell">
                        <div class="empty-state-wrapper">
                            <div class="empty-state-text">
                                Không tìm thấy lịch hẹn phù hợp
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            renderBookingsPagination(0);
            return;
        }

        if (currentBookingPage > totalPages) {
            currentBookingPage = totalPages;
        }
        if (currentBookingPage < 1) {
            currentBookingPage = 1;
        }

        const startIndex = (currentBookingPage - 1) * BOOKINGS_PER_PAGE;
        const pagedBookings = filtered.slice(startIndex, startIndex + BOOKINGS_PER_PAGE);

        tbody.innerHTML = pagedBookings.map(item => {
            // Xác định class alert mép trái thẳng
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
                // Spa và Grooming
                serviceCellHtml = `
                    <div style="font-weight: 500; color: var(--text-main);">${item.serviceName}</div>
                    ${item.styleType ? `<div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${item.styleType}</div>` : `<div style="font-size: 12px; color: var(--text-muted);">${item.duration}</div>`}
                `;
                datetimeCellHtml = `
                    <div style="font-weight: 600; color: var(--text-main);">${item.time}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${item.date} • ${item.duration}</div>
                `;
            }

            return `
                <tr class="${alertClass} ${isLocked}" data-booking-id="${item.id}">
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-view-booking" data-booking-id="${item.id}">
                            ${item.id}
                        </a>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${item.customerName}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.phone}</div>
                    </td>
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-jump-pet" data-pet-id="${item.petId || 'PET-001'}" data-pet-name="${item.petName}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${item.petName}</a>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.petBreed}</div>
                    </td>
                    <td>
                        <span style="font-size: 13px; color: var(--text-main);">${item.categoryName}</span>
                    </td>
                    <td>
                        ${serviceCellHtml}
                    </td>
                    <td>
                        ${datetimeCellHtml}
                    </td>
                    <td>
                        ${item.staff ? `<span style="font-size: 13px; font-weight: 500;">${item.staff}</span>` : '<span class="text-danger" style="font-size: 12px; font-weight: 600;">Chưa phân công</span>'}
                    </td>
                    <td>
                        <div style="font-weight: 700; color: var(--text-heading);">${formatCurrency(item.total)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.paymentStatus.includes('Đã') ? 'Đã thu' : 'Chưa thu'}</div>
                    </td>
                    <td>
                        ${getStatusBadge(item.status)}
                    </td>
                    <td>
                        ${getAlertBadge(item)}
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-action-trigger" data-booking-id="${item.id}">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Gắn sự kiện click vào tên thú cưng để nhảy sang hồ sơ Thú cưng
        tbody.querySelectorAll('.btn-jump-pet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const petId = btn.getAttribute('data-pet-id') || 'PET-001';
                const pName = btn.getAttribute('data-pet-name') || '';
                sessionStorage.setItem('pawpal_admin_pet_id', petId);
                if (pName) sessionStorage.setItem('pawpal_admin_pet_name', pName);
                sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-profile');
                window.location.hash = '#tab-pet-profile';
            });
        });

        // Gắn sự kiện click xem chi tiết
        tbody.querySelectorAll('.btn-view-booking').forEach(link => {
            link.addEventListener('click', () => {
                const bkgId = link.getAttribute('data-booking-id');
                openBookingDetail(bkgId);
            });
        });

        // Gắn sự kiện mở dropdown thao tác 3 chấm
        tbody.querySelectorAll('.btn-action-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const bkgId = btn.getAttribute('data-booking-id');
                toggleActionDropdown(bkgId, btn);
            });
        });

        // Cập nhật phân trang động theo số lượng bản ghi thực tế
        renderBookingsPagination(totalPages);
    }

    // Render thanh phân trang danh sách Lịch hẹn (Căn giữa, không nền, không viền khung)
    function renderBookingsPagination(totalPages) {
        const pagContainer = document.getElementById('servicesPagination');
        if (!pagContainer) return;

        // Nếu không có dữ liệu hoặc chỉ có 1 trang: ẩn hoặc vô hiệu hóa các nút vượt quá số lượng bản ghi thực tế
        if (totalPages <= 1) {
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

    // Xóa toàn bộ bộ lọc và từ khóa tìm kiếm của danh sách Lịch hẹn
    function clearBookingSearchAndFilters() {
        currentSearchTerm = '';
        currentFilterCategory = 'ALL';
        currentFilterStatus = 'ALL';
        currentFilterStaff = 'ALL';
        isUpcomingFilterActive = false;
        isAllergyFilterActive = false;
        isSlaFilterActive = false;
        currentBookingPage = 1;

        // 1. Làm trống ô tìm kiếm
        const searchInput = document.getElementById('serviceSearchInput');
        if (searchInput) searchInput.value = '';

        // 2. Reset toàn bộ dropdown về "Tất cả"
        const selectCategory = document.getElementById('serviceFilterCategory');
        if (selectCategory) selectCategory.value = 'ALL';

        const selectStatus = document.getElementById('serviceFilterStatus');
        if (selectStatus) selectStatus.value = 'ALL';

        const selectStaff = document.getElementById('serviceFilterStaff');
        if (selectStaff) selectStaff.value = 'ALL';

        // 3. Reset các nút lọc nhanh toggle
        const btnUpcoming = document.getElementById('btnToggleUpcomingOnly');
        if (btnUpcoming) btnUpcoming.classList.remove('active');

        const btnAllergy = document.getElementById('btnToggleAllergyOnly');
        if (btnAllergy) btnAllergy.classList.remove('active');

        const btnSla = document.getElementById('btnToggleSlaOverdue');
        if (btnSla) btnSla.classList.remove('active');

        // 4. Reset trạng thái chọn trên các thẻ KPI về "Tất cả"
        document.querySelectorAll('.kpi-card-clickable').forEach(c => c.classList.remove('active'));
        const kpiAll = document.querySelector('.kpi-card-clickable[data-kpi-filter="ALL"]');
        if (kpiAll) kpiAll.classList.add('active');

        // 5. Hiển thị lại toàn bộ danh sách
        renderBookingsTable();
        showToast('Đã xóa bộ lọc và hiển thị lại toàn bộ danh sách lịch hẹn.', 'info');
    }

    // Mở hồ sơ chi tiết một lịch hẹn
    function openBookingDetail(bookingId) {
        selectedBookingId = bookingId;
        persistData();
        switchSubtab('tab-service-detail');
    }

    // ==========================================================================
    // 5. RENDER HỒ SƠ CHI TIẾT 360° (SUB-TAB 2)
    // ==========================================================================
    function renderBookingDetail(bookingId) {
        const booking = bookingsData.find(b => b.id === bookingId) || bookingsData[0];
        if (!booking) return;

        // Headline và Meta
        const codeEl = document.getElementById('detailBookingCode');
        const metaEl = document.getElementById('detailBookingMeta');
        if (codeEl) codeEl.textContent = booking.id;
        if (metaEl) {
            if (booking.category === 'Hotel') {
                metaEl.textContent = `Lưu trú: ${booking.checkInDate || booking.date} ➔ ${booking.checkOutDate || '2026-07-04'} (${booking.nights || 3} đêm) | Phòng: ${booking.roomCode || 'DLX-04'} | Cơ sở: ${booking.branch}`;
            } else if (booking.category === 'Taxi') {
                const shortPickup = booking.pickupAddress ? (booking.pickupAddress.length > 22 ? booking.pickupAddress.substring(0, 22) + '...' : booking.pickupAddress) : 'Đón tận nơi';
                metaEl.textContent = `Giờ đón: ${booking.time} - ${booking.date} | ${booking.tripType || '2 chiều'} | Lộ trình: ${shortPickup} ➔ Q.1 | Cơ sở: ${booking.branch}`;
            } else {
                metaEl.textContent = `Thời gian hẹn: ${booking.time} - ${booking.date} | Cơ sở: ${booking.branch}`;
            }
        }

        // Cảnh báo an toàn Pet (Thuần chữ đỏ, không viền, không nền)
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

            // Gắn sự kiện các nút 1 chạm
            const btnConfirm = actionButtonsContainer.querySelector('.btn-action-confirm');
            const btnIntake = actionButtonsContainer.querySelector('.btn-action-intake');
            const btnComplete = actionButtonsContainer.querySelector('.btn-action-complete');
            const btnCancel = actionButtonsContainer.querySelector('.btn-action-cancel');
            const btnChange = actionButtonsContainer.querySelector('.btn-action-change');
            const btnComplaint = actionButtonsContainer.querySelector('.btn-action-complaint');

            if (btnConfirm) {
                btnConfirm.addEventListener('click', () => {
                    updateBookingStatus(booking.id, 'confirmed');
                });
            }
            if (btnIntake) {
                btnIntake.addEventListener('click', () => {
                    openIntakeModal(booking.id, 'intake');
                });
            }
            if (btnComplete) {
                btnComplete.addEventListener('click', () => {
                    openCompleteBookingModal(booking.id);
                });
            }
            if (btnCancel) {
                btnCancel.addEventListener('click', () => {
                    openCancelModal(booking.id);
                });
            }
            if (btnChange) {
                btnChange.addEventListener('click', () => {
                    openChangeStaffModal(booking.id);
                });
            }
            if (btnComplaint) {
                btnComplaint.addEventListener('click', () => {
                    escalateBookingToComplaint(booking.id);
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
                            <span class="info-label">Hình thức đưa đón:</span>
                            <span class="info-value"><span class="admin-badge badge-info">${booking.tripType || '2 chiều khứ hồi'}</span></span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Khoảng cách ước tính:</span>
                            <span class="info-value" style="font-weight: 600;">${booking.distanceKm || 4.2} km</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Tài xế chuyên trách:</span>
                            <span class="info-value" style="font-weight: 600;">${booking.driverName || booking.staff || 'Hữu Phúc'}</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">SĐT tài xế khẩn cấp:</span>
                            <span class="info-value" style="color: #0369A1;">${booking.driverPhone || '0978.112.233'}</span>
                        </div>
                    </div>
                `;
            } else {
                // Spa và Grooming
                specialFieldsContainer.innerHTML = `
                    <div style="font-size: 13px; font-weight: 700; color: #236B48; margin-bottom: 8px;">Yêu cầu tạo hình và Grooming:</div>
                    <div class="info-grid-2col">
                        <div class="info-pair">
                            <span class="info-label">Phong cách tạo hình:</span>
                            <span class="info-value" style="font-weight: 600; color: #236B48;">${booking.styleType || 'Tắm sấy và Vệ sinh tiêu chuẩn'}</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Cấp độ thợ phụ trách:</span>
                            <span class="info-value" style="font-weight: 500;">${booking.groomerLevel || 'Senior Groomer'}</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Khung cân nặng áp dụng:</span>
                            <span class="info-value">${booking.petWeight ? `${booking.petWeight} (Phân khúc chuẩn)` : 'Dưới 5kg'}</span>
                        </div>
                        <div class="info-pair">
                            <span class="info-label">Thời lượng ước tính:</span>
                            <span class="info-value">${booking.duration || '60 phút'}</span>
                        </div>
                    </div>
                `;
            }
        }

        // Cập nhật khách hàng, Pet và Thông tin tiếp nhận
        const customerName = document.getElementById('detailCustomerName');
        const customerPhone = document.getElementById('detailCustomerPhone');
        const petName = document.getElementById('detailPetName');
        const petBreed = document.getElementById('detailPetBreed');
        const petWeight = document.getElementById('detailPetWeight');
        const petAge = document.getElementById('detailPetAge');
        const belongingsText = document.getElementById('detailBelongingsText');

        if (customerName) {
            customerName.textContent = booking.customerName;
            customerName.onclick = () => {
                sessionStorage.setItem('pawpal_admin_customer_selected_id', booking.userId || 'USER-001');
                window.location.hash = '#tab-profile';
            };
        }
        if (customerPhone) customerPhone.textContent = booking.phone;
        if (petName) {
            petName.textContent = booking.petName;
            petName.onclick = () => {
                sessionStorage.setItem('pawpal_admin_pet_id', booking.petId || 'PET-001');
                sessionStorage.setItem('pawpal_admin_pet_name', booking.petName);
                sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-profile');
                window.location.hash = '#tab-pet-profile';
            };
        }
        if (petBreed) petBreed.textContent = booking.petBreed;
        if (petWeight) petWeight.textContent = booking.petWeight || '4.0 kg';
        if (petAge) petAge.textContent = booking.petAge || 'Chưa rõ';
        if (belongingsText) belongingsText.textContent = booking.belongings || 'Không có';

        // Cập nhật Khối Biên bản tiếp nhận an toàn (Zero-Claim)
        const intakeSection = document.getElementById('detailIntakeSafetySection');
        const intakeEmptyNotice = document.getElementById('detailIntakeEmptyNotice');
        const intakeContent = document.getElementById('detailIntakeContentContainer');
        const btnEditSafety = document.getElementById('btnEditIntakeSafety');
        const btnPrintWaiver = document.getElementById('btnPrintIntakeWaiver');

        if (btnPrintWaiver) {
            btnPrintWaiver.style.display = (booking.status !== 'cancelled') ? 'inline-block' : 'none';
            btnPrintWaiver.onclick = () => openIntakeWaiverModal(booking.id);
        }

        const btnNotifyPickup = document.getElementById('btnNotifyCustomerPickup');
        if (btnNotifyPickup) {
            btnNotifyPickup.style.display = (booking.status === 'in_progress' || booking.status === 'completed') ? 'inline-block' : 'none';
            btnNotifyPickup.onclick = () => openNotifyPickupModal(booking.id);
        }

        if (intakeSection) {
            const hasIntake = !!booking.intakeSafety;
            if (!hasIntake) {
                if (intakeEmptyNotice) intakeEmptyNotice.style.display = 'block';
                if (intakeContent) intakeContent.style.display = 'none';
                if (btnEditSafety) {
                    btnEditSafety.textContent = 'Tiếp nhận bé';
                    btnEditSafety.style.display = (booking.status === 'confirmed' || booking.status === 'pending') ? 'inline-block' : 'none';
                    btnEditSafety.onclick = () => openIntakeModal(booking.id, 'intake');
                }
            } else {
                if (intakeEmptyNotice) intakeEmptyNotice.style.display = 'none';
                if (intakeContent) intakeContent.style.display = 'block';
                if (btnEditSafety) {
                    btnEditSafety.textContent = 'Sửa biên bản tiếp nhận';
                    btnEditSafety.style.display = (booking.status !== 'cancelled') ? 'inline-block' : 'none';
                    btnEditSafety.onclick = () => openIntakeModal(booking.id, 'edit');
                }

                const s = booking.intakeSafety;
                const actWeight = document.getElementById('detailIntakeActualWeight');
                const weightEval = document.getElementById('detailIntakeWeightEval');
                const skinCoat = document.getElementById('detailIntakeSkinCoat');
                const eyesEars = document.getElementById('detailIntakeEyesEarsNose');
                const wounds = document.getElementById('detailIntakeWounds');
                const tempEl = document.getElementById('detailIntakeTemperament');
                const staffEl = document.getElementById('detailIntakeStaff');
                const belongEl = document.getElementById('detailIntakeBelongings');
                const proofGrid = document.getElementById('detailIntakeProofGrid');

                if (actWeight) actWeight.textContent = s.actualWeight || booking.petWeight || 'Chưa cân';
                if (weightEval) weightEval.textContent = s.weightEval || 'Đúng khung giá';
                if (skinCoat) skinCoat.textContent = s.skinCoat || 'Sạch sẽ';
                if (eyesEars) eyesEars.textContent = s.eyesEarsNose || 'Bình thường';
                if (wounds) wounds.textContent = s.wounds || 'Không có vết thương cũ';
                if (tempEl) tempEl.textContent = s.temperament || 'Ngoan hiền';
                if (staffEl) staffEl.textContent = `${s.intakeStaff || booking.staff || 'KTV'} (${s.intakeTime || 'Tiếp nhận'})`;
                if (belongEl) belongEl.textContent = s.belongings || booking.belongings || 'Không có';

                if (proofGrid) {
                    const imgs = s.proofImages || [];
                    if (imgs.length === 0) {
                        proofGrid.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Chưa có ảnh đính kèm lúc đón bé</span>';
                    } else {
                        proofGrid.innerHTML = imgs.map(img => `
                            <img src="${img}" class="intake-proof-thumb" alt="Ảnh đối chứng Zero-Claim" onclick="window.open('${img}', '_blank')" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                        `).join('');
                    }
                }
            }
        }

        // Cập nhật tài chính và Bảng kê chi phí / Dịch vụ đi cùng / Phụ phí phát sinh
        const costBase = document.getElementById('detailCostBase');
        const costAddon = document.getElementById('detailCostAddon');
        const costDiscount = document.getElementById('detailCostDiscount');
        const costTotal = document.getElementById('detailCostTotal');
        const paymentStatus = document.getElementById('detailPaymentStatus');

        const addons = booking.addons || [];
        const accompanyingServices = booking.accompanyingServices || [];
        const accompanyingTotal = accompanyingServices.reduce((sum, item) => sum + Number(item.price || 0), 0);
        booking.addonPrice = addons.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        booking.total = Math.max(0, Number(booking.price || 0) + accompanyingTotal + booking.addonPrice - Number(booking.discount || 0));

        if (costBase) costBase.textContent = formatCurrency(booking.price);
        if (costAddon) costAddon.textContent = formatCurrency(booking.addonPrice);
        if (costDiscount) costDiscount.textContent = '-' + formatCurrency(booking.discount);
        if (costTotal) costTotal.textContent = formatCurrency(booking.total);
        if (paymentStatus) paymentStatus.textContent = booking.paymentStatus;
        if (addonsText) addonsText.textContent = booking.addonPrice > 0 ? `Gói chăm sóc mở rộng (${formatCurrency(booking.addonPrice)})` : 'Không có';

        // Nút Thanh toán tại POS
        const btnSettlePos = document.getElementById('btnSettleToPos');
        if (btnSettlePos) {
            btnSettlePos.style.display = (booking.status !== 'cancelled') ? 'inline-block' : 'none';
            btnSettlePos.onclick = () => settleBookingToPos(booking.id);
        }

        // Thêm dịch vụ đi cùng và phụ phí chỉ mở khi đang thực hiện ca (in_progress)
        // Trước khi vào ca chưa nên ghi phụ phí và thêm dịch vụ
        const btnOpenAddAccompanying = document.getElementById('btnOpenAddAccompanyingServiceModal');
        const btnOpenAddSurchargeModal = document.getElementById('btnOpenAddSurchargeModal');
        const isEditableState = (booking.status === 'in_progress');

        if (btnOpenAddAccompanying) {
            btnOpenAddAccompanying.style.display = isEditableState ? 'inline-block' : 'none';
        }
        if (btnOpenAddSurchargeModal) {
            btnOpenAddSurchargeModal.style.display = isEditableState ? 'inline-block' : 'none';
        }

        // Render Danh sách Dịch vụ đi cùng (Accompanying Services)
        const accompanyingListContainer = document.getElementById('detailAccompanyingServicesList');
        if (accompanyingListContainer) {
            if (accompanyingServices.length === 0) {
                accompanyingListContainer.innerHTML = '';
            } else {
                accompanyingListContainer.innerHTML = accompanyingServices.map(item => `
                    <div class="accompanying-item-row" data-acc-id="${item.id}">
                        <div class="accompanying-item-title-row">
                            <span class="accompanying-item-name">+ ${item.name}</span>
                            <span class="accompanying-item-price">+${formatCurrency(item.price)}</span>
                        </div>
                        <div class="accompanying-item-meta">
                            <span>KTV: ${item.staff || booking.staff || 'PawPal Team'}</span>
                            ${item.note ? `<span>• ${item.note}</span>` : ''}
                            ${isEditableState ? `<button type="button" class="btn-del-surcharge btn-del-accompanying" data-acc-id="${item.id}">Xóa</button>` : ''}
                        </div>
                    </div>
                `).join('');

                if (isEditableState) {
                    accompanyingListContainer.querySelectorAll('.btn-del-accompanying').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const accId = btn.getAttribute('data-acc-id');
                            const targetAcc = booking.accompanyingServices.find(a => a.id === accId);
                            if (!targetAcc) return;

                            showServiceConfirmModal({
                                title: 'Xóa dịch vụ đi cùng',
                                message: `Bạn có chắc chắn muốn xóa dịch vụ đi cùng "${targetAcc.name}" (${formatCurrency(targetAcc.price)}) khỏi ca?`,
                                acceptText: 'Xác nhận xóa',
                                onAccept: () => {
                                    booking.accompanyingServices = booking.accompanyingServices.filter(a => a.id !== accId);
                                    const newAccTotal = booking.accompanyingServices.reduce((sum, a) => sum + Number(a.price || 0), 0);
                                    booking.total = Math.max(0, Number(booking.price || 0) + newAccTotal + booking.addonPrice - Number(booking.discount || 0));

                                    // Ghi nhật ký hủy dịch vụ đi cùng
                                    booking.timeline = booking.timeline || [];
                                    booking.timeline.push({
                                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                        title: `Đã hủy dịch vụ đi cùng: ${targetAcc.name}`,
                                        desc: `Đã loại bỏ gói ${targetAcc.name} (${formatCurrency(targetAcc.price)}) khỏi ca`,
                                        done: true,
                                        staff: 'Admin'
                                    });

                                    persistData();
                                    renderBookingDetail(booking.id);
                                    renderBookingsTable();
                                    showToast(`Đã xóa dịch vụ đi cùng "${targetAcc.name}" thành công!`);
                                }
                            });
                        });
                    });
                }
            }
        }

        // Render Bóc tách chi tiết từng phụ phí / Add-on phát sinh
        const surchargeListContainer = document.getElementById('detailSurchargeBreakdownList');
        if (surchargeListContainer) {
            if (addons.length === 0) {
                surchargeListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12.5px; font-style: italic; padding: 4px 0;">Không có phụ phí hoặc dịch vụ phát sinh trong ca này.</div>';
            } else {
                surchargeListContainer.innerHTML = addons.map(item => `
                    <div class="surcharge-item-row" data-addon-id="${item.id}">
                        <div class="surcharge-item-main">
                            <div class="surcharge-item-title-row">
                                <span class="surcharge-item-name">${item.name}</span>
                                <span class="surcharge-item-amount">+${formatCurrency(item.amount)}</span>
                            </div>
                            <div class="surcharge-item-desc">${item.reason}</div>
                            ${item.consentNote ? `<div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">Ghi chú xác nhận: ${item.consentNote}</div>` : ''}
                            ${(item.images && item.images.length > 0) ? `
                                <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                                    ${item.images.map(img => `<img src="${img}" alt="Ảnh bằng chứng" style="width: 44px; height: 44px; object-fit: cover; border-radius: 9px; border: 1px solid var(--border-neutral); cursor: pointer;" onclick="window.open('${img}', '_blank')" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">`).join('')}
                                </div>
                            ` : ''}
                            <div class="surcharge-item-meta" style="margin-top: 4px;">
                                <span class="surcharge-tag-consent">${item.consent}</span>
                                <span class="surcharge-time-text">${item.time || ''}</span>
                                ${isEditableState ? `<button type="button" class="btn-del-surcharge" data-addon-id="${item.id}">Xóa</button>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');

                if (isEditableState) {
                    surchargeListContainer.querySelectorAll('.btn-del-surcharge').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const addonId = btn.getAttribute('data-addon-id');
                            const targetAddon = booking.addons.find(a => a.id === addonId);
                            if (!targetAddon) return;

                            showServiceConfirmModal({
                                title: 'Xóa phụ phí phát sinh',
                                message: `Bạn có chắc chắn muốn xóa phụ phí "${targetAddon.name}" (${formatCurrency(targetAddon.amount)})?`,
                                acceptText: 'Xác nhận xóa',
                                onAccept: () => {
                                    booking.addons = booking.addons.filter(a => a.id !== addonId);
                                    booking.addonPrice = booking.addons.reduce((sum, a) => sum + Number(a.amount || 0), 0);
                                    const currentAccTotal = (booking.accompanyingServices || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                                    booking.total = Math.max(0, Number(booking.price || 0) + currentAccTotal + booking.addonPrice - Number(booking.discount || 0));

                                    // Ghi lại nhật ký xóa phụ phí
                                    booking.timeline = booking.timeline || [];
                                    booking.timeline.push({
                                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                                        title: `Đã xóa phụ phí: ${targetAddon.name}`,
                                        desc: `Đã loại bỏ khoản phụ thu ${formatCurrency(targetAddon.amount)} khỏi ca dịch vụ`,
                                        done: true,
                                        staff: 'Admin'
                                    });

                                    persistData();
                                    renderBookingDetail(booking.id);
                                    renderBookingsTable();
                                    showToast(`Đã xóa phụ phí "${targetAddon.name}" thành công!`);
                                }
                            });
                        });
                    });
                }
            }
        }

        // Cập nhật Care-Log Timeline
        const carelogContainer = document.getElementById('detailCarelogList');
        if (carelogContainer) {
            carelogContainer.innerHTML = (booking.timeline || []).map((step, idx) => {
                const imagesHtml = (step.images && step.images.length > 0)
                    ? `<div class="step-gallery-strip">
                        ${step.images.map(imgUrl => `
                            <img src="${imgUrl}" alt="${step.title}" class="step-photo-thumb" data-full-src="${imgUrl}" data-title="${step.title}" data-time="${step.time}" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                        `).join('')}
                       </div>`
                    : '';

                const actionsHtml = (booking.status !== 'cancelled')
                    ? `<div class="step-action-bar">
                        ${(!step.done && booking.status === 'in_progress') ? `<button type="button" class="btn-step-action complete-action btn-mark-step-done" data-step-index="${idx}">Đánh dấu xong</button>` : ''}
                        <button type="button" class="btn-step-action btn-edit-step" data-step-index="${idx}">Sửa bước</button>
                        <button type="button" class="btn-step-action btn-add-step-photo" data-step-index="${idx}">Thêm ảnh</button>
                        ${booking.status === 'in_progress' ? `<button type="button" class="btn-step-action btn-del-step" data-step-index="${idx}" style="color: #DC2626;">Xóa</button>` : ''}
                       </div>`
                    : '';

                return `
                    <div class="timeline-step-item ${step.done ? '' : 'future'}">
                        <div class="timeline-step-title">${step.title} ${step.done ? '<span style="color: #236B48; font-size: 11.5px; font-weight: 500;">(Đã xong)</span>' : '<span style="color: var(--text-muted); font-size: 11.5px; font-weight: 400;">(Đang chờ)</span>'}</div>
                        <div class="timeline-step-time">${step.time} • KTV: ${step.staff || booking.staff || 'PawPal Team'}</div>
                        <div class="timeline-step-desc">${step.desc}</div>
                        ${imagesHtml}
                        ${actionsHtml}
                    </div>
                `;
            }).join('');

            // Gắn sự kiện click xem ảnh phóng to (Lightbox)
            carelogContainer.querySelectorAll('.step-photo-thumb').forEach(thumb => {
                thumb.addEventListener('click', () => {
                    const src = thumb.getAttribute('data-full-src');
                    const title = thumb.getAttribute('data-title');
                    const time = thumb.getAttribute('data-time');
                    openPhotoLightbox(src, title, time);
                });
            });

            // Gắn sự kiện Sửa bước nhật ký
            carelogContainer.querySelectorAll('.btn-edit-step').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-step-index'), 10);
                    openEditCarelogStepModal(idx);
                });
            });

            // Gắn sự kiện Xóa bước nhật ký
            carelogContainer.querySelectorAll('.btn-del-step').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-step-index'), 10);
                    if (booking.timeline && booking.timeline[idx]) {
                        const stepTitle = booking.timeline[idx].title;
                        showServiceConfirmModal({
                            title: 'Xóa bước nhật ký',
                            message: `Bạn có chắc chắn muốn xóa bước nhật ký "${stepTitle}"?`,
                            acceptText: 'Xác nhận xóa',
                            onAccept: () => {
                                booking.timeline.splice(idx, 1);
                                persistData();
                                renderBookingDetail(booking.id);
                                showToast(`Đã xóa bước nhật ký "${stepTitle}"!`);
                            }
                        });
                    }
                });
            });

            // Gắn sự kiện Đánh dấu hoàn tất bước (1-chạm)
            carelogContainer.querySelectorAll('.btn-mark-step-done').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-step-index'), 10);
                    if (booking.timeline && booking.timeline[idx]) {
                        booking.timeline[idx].done = true;
                        booking.timeline[idx].time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                        booking.timeline[idx].staff = booking.staff || 'Ngọc Anh';
                        persistData();
                        renderBookingDetail(booking.id);
                    }
                });
            });

            // Gắn sự kiện Thêm ảnh vào bước có sẵn
            carelogContainer.querySelectorAll('.btn-add-step-photo').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-step-index'), 10);
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.accept = 'image/*';
                    tempInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (evt) => {
                                booking.timeline[idx].images = booking.timeline[idx].images || [];
                                booking.timeline[idx].images.push(evt.target.result);
                                persistData();
                                renderBookingDetail(booking.id);
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                    tempInput.click();
                });
            });
        }

        // QUY TẮC NGHIỆP VỤ: Khóa/Mở form ghi nhật ký Care-Log theo trạng thái ca
        const carelogQuickAddBox = document.getElementById('carelogQuickAddBox');
        const carelogLockNotice = document.getElementById('carelogLockNotice');

        if (carelogQuickAddBox && carelogLockNotice) {
            if (booking.status === 'in_progress') {
                carelogQuickAddBox.style.display = 'flex';
                carelogLockNotice.style.display = 'none';
            } else {
                carelogQuickAddBox.style.display = 'none';
                carelogLockNotice.style.display = 'block';

                if (booking.status === 'pending') {
                    carelogLockNotice.innerHTML = '<strong>Khóa ghi nhật ký:</strong> Lịch hẹn đang chờ xác nhận. Vui lòng bấm <em>"Xác nhận lịch"</em> trước, sau đó bấm <em>"Tiếp nhận bé"</em> khi khách đến quầy để cập nhật nhật ký.';
                } else if (booking.status === 'confirmed') {
                    carelogLockNotice.innerHTML = '<strong>Chờ tiếp nhận:</strong> Lịch hẹn đã được xác nhận. Vui lòng bấm nút <em>"Tiếp nhận bé"</em> ở trên khi khách đến quầy để kiểm tra thông tin, xác nhận đồ gửi lại và bắt đầu ca dịch vụ.';
                } else if (booking.status === 'completed') {
                    carelogLockNotice.innerHTML = '<strong>Đã hoàn thành và chốt ca:</strong> Tiến trình chăm sóc đã hoàn tất. Toàn bộ hồ sơ và nhật ký đã được lưu trữ an toàn.';
                } else if (booking.status === 'cancelled') {
                    carelogLockNotice.innerHTML = '<strong>Ca đã hủy:</strong> Lịch hẹn này đã bị hủy bỏ.';
                }
            }
        }
    }

    // Cập nhật trạng thái lịch hẹn theo Quy tắc Nghiệp vụ (State Machine)
    async function updateBookingStatus(bookingId, newStatus) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        booking.status = newStatus;

        let dbStatus = 'PENDING';
        if (newStatus === 'confirmed') {
            dbStatus = 'CONFIRMED';
            if (!booking.staff) booking.staff = 'Ngọc Anh';
        } else if (newStatus === 'in_progress') {
            dbStatus = 'IN_PROGRESS';
            booking.alertType = null;
            if (!booking.staff) booking.staff = 'Ngọc Anh';
            
            // Tự động ghi nhận mốc bắt đầu vào Timeline
            booking.timeline = booking.timeline || [];
            if (booking.timeline.length > 0) booking.timeline[0].done = true;
            booking.timeline.push({
                time: timeNow,
                title: 'Bắt đầu thực hiện ca dịch vụ',
                desc: `Kỹ thuật viên ${booking.staff} đã tiếp nhận bé và bắt đầu liệu trình chăm sóc`,
                done: true,
                staff: booking.staff
            });
        } else if (newStatus === 'completed') {
            dbStatus = 'COMPLETED';
            booking.alertType = null;
            if (!booking.paymentStatus || booking.paymentStatus.includes('Chưa')) {
                booking.paymentStatus = 'Đã thanh toán (Tại quầy)';
            }

            // Tự động đánh dấu hoàn tất toàn bộ các bước và ghi mốc kết thúc
            booking.timeline = booking.timeline || [];
            booking.timeline.forEach(st => st.done = true);
            booking.timeline.push({
                time: timeNow,
                title: 'Hoàn tất dịch vụ và bàn giao bé',
                desc: 'Đã hoàn thành toàn bộ quy trình chăm sóc, kiểm tra an toàn cho bé cưng và xuất phiếu thanh toán',
                done: true,
                staff: booking.staff || 'KTV'
            });
        } else if (newStatus === 'cancelled') {
            dbStatus = 'CANCELLED';
        }

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db && booking.dbId) {
            try {
                const payload = { appointment_status: dbStatus };
                if (newStatus === 'completed') {
                    payload.payment_status = 'PAID';
                }
                await db.from('appointment').update(payload).eq('id', booking.dbId);
            } catch (err) {
                console.warn('Lỗi cập nhật Supabase appointment status:', err);
            }
        }

        persistData();
        renderBookingDetail(bookingId);
        renderBookingsTable();
        renderUpcomingBar();
        updateKPIs();
    }

    // ==========================================================================
    // 6. RENDER DANH MỤC VÀ BẢNG GIÁ DỊCH VỤ (SUB-TAB 3)
    // ==========================================================================
    function renderCatalogTable() {
        const tbody = document.getElementById('servicesCatalogTableBody');
        if (!tbody) return;

        let filtered = servicesData.filter(item => item.group === currentCatalogGroup);

        if (catalogSearchTerm) {
            const term = catalogSearchTerm.toLowerCase();
            filtered = filtered.filter(s => s.code.toLowerCase().includes(term) || s.name.toLowerCase().includes(term));
        }

        if (catalogFilterStatus !== 'ALL') {
            filtered = filtered.filter(s => s.status === catalogFilterStatus);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="empty-state-cell">
                        Chưa có dịch vụ nào phù hợp với điều kiện tìm kiếm.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(item => `
            <tr>
                <td>
                    <img src="${item.image}" alt="${item.name}" class="service-thumb" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                </td>
                <td style="font-weight: 600; color: #236B48;">${item.code}</td>
                <td>
                    <div style="font-weight: 600; color: var(--text-main);">${item.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${item.desc ? item.desc.substring(0, 50) + '...' : ''}</div>
                </td>
                <td><span style="font-size: 13px; color: var(--text-muted);">${item.categoryName}</span></td>
                <td><span style="font-size: 13px; font-weight: 500;">${item.petType}</span></td>
                <td><span style="font-size: 13px;">${item.duration}</span></td>
                <td><span style="font-weight: 700; color: var(--text-heading);">${item.priceFrom} đ</span></td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 3px;">
                        <button type="button" class="btn-view-sop-pill btn-open-sop-details" data-service-code="${item.code}" title="Bấm để xem chi tiết các bước chuẩn">
                            ${(item.steps || []).length} bước SOP
                        </button>
                        <span style="font-size: 11.5px; color: var(--text-muted);">Hoa hồng: ${item.commission || 15}%</span>
                    </div>
                </td>
                <td>
                    <a href="javascript:void(0)" class="catalog-rating-link btn-view-service-reviews" data-service-name="${item.name}" data-service-group="${item.group}" title="Bấm để xem tất cả đánh giá của ${item.name}">
                        <span class="star-rating-pill">★ ${item.rating}</span> <span class="reviews-count-text">(${item.reviews})</span>
                    </a>
                </td>
                <td>
                    ${item.status === 'Đang phục vụ' ? '<span class="admin-badge badge-success">Đang phục vụ</span>' : '<span class="admin-badge badge-warning">Tạm ẩn</span>'}
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        <button type="button" class="btn-table-action-sm btn-edit-service" data-service-code="${item.code}">Sửa</button>
                        <button type="button" class="btn-table-action-sm btn-open-sop-details" data-service-code="${item.code}">SOP</button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-service').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-service-code');
                openEditServiceModal(code);
            });
        });

        tbody.querySelectorAll('.btn-open-sop-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-service-code');
                openSopDetailsModal(code);
            });
        });

        // Bấm vào điểm đánh giá để lọc xem toàn bộ đánh giá của dịch vụ đó
        tbody.querySelectorAll('.btn-view-service-reviews').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const svcName = link.getAttribute('data-service-name');
                const svcGroup = link.getAttribute('data-service-group');
                filterAndShowReviewsForService(svcName, svcGroup);
            });
        });
    }

    // Chuyển sang tab Đánh giá và lọc sẵn đúng dịch vụ
    function filterAndShowReviewsForService(serviceName, group) {
        switchSubtab('tab-service-reviews');
        reviewSearchTerm = serviceName;
        const searchInput = document.getElementById('reviewSearchInput');
        if (searchInput) searchInput.value = serviceName;

        const catSelect = document.getElementById('reviewFilterCategory');
        if (catSelect) {
            catSelect.value = group === 'spa' ? 'Spa' : (group === 'hotel' ? 'Hotel' : (group === 'taxi' ? 'Taxi' : 'ALL'));
            reviewFilterCategory = catSelect.value;
        }

        renderReviewsTable();
        updateReviewKPIs();
    }

    // ==========================================================================
    // 6B. QUẢN LÝ ĐÁNH GIÁ VÀ PHẢN HỒI (SUB-TAB 4)
    // ==========================================================================
    function updateReviewKPIs() {
        const total = reviewsData.length;
        const avg = total > 0 ? (reviewsData.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : '5.0';
        const pending = reviewsData.filter(r => r.status === 'pending').length;
        const low = reviewsData.filter(r => r.rating <= 3).length;

        const elAvg = document.getElementById('statAvgRating');
        const elTotal = document.getElementById('statTotalReviews');
        const elPending = document.getElementById('statPendingReviews');
        const elLow = document.getElementById('statLowRatingReviews');

        if (elAvg) elAvg.textContent = `${avg} ★`;
        if (elTotal) elTotal.textContent = total;
        if (elPending) elPending.textContent = pending;
        if (elLow) elLow.textContent = low;
    }

    function renderReviewsTable() {
        const tbody = document.getElementById('servicesReviewTableBody');
        if (!tbody) return;

        let filtered = reviewsData.filter(r => {
            if (reviewSearchTerm) {
                const term = reviewSearchTerm.toLowerCase();
                const matchCust = r.customerName.toLowerCase().includes(term);
                const matchPhone = r.phone.includes(term);
                const matchBooking = r.bookingId.toLowerCase().includes(term);
                const matchComment = r.comment.toLowerCase().includes(term);
                if (!matchCust && !matchPhone && !matchBooking && !matchComment) return false;
            }

            if (reviewFilterStar !== 'ALL') {
                if (reviewFilterStar === 'LOW') {
                    if (r.rating > 3) return false;
                } else if (r.rating !== parseInt(reviewFilterStar)) {
                    return false;
                }
            }

            if (reviewFilterCategory !== 'ALL' && r.category !== reviewFilterCategory) return false;
            if (reviewFilterStaff !== 'ALL' && r.staff !== reviewFilterStaff) return false;
            if (reviewFilterStatus !== 'ALL' && r.status !== reviewFilterStatus) return false;

            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state-cell">
                        Không tìm thấy đánh giá nào phù hợp với điều kiện tìm kiếm.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(item => {
            const starsText = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
            const alertClass = item.rating <= 3 ? 'row-alert-red' : '';

            let statusBadge = '<span class="admin-badge badge-warning">Chờ phản hồi</span>';
            if (item.status === 'replied') {
                statusBadge = '<span class="admin-badge badge-success">Đã phản hồi</span>';
            } else if (item.status === 'escalated') {
                statusBadge = '<span class="admin-badge escalated-badge">Đã chuyển CSKH</span>';
            }

            return `
                <tr class="${alertClass}" data-review-id="${item.id}">
                    <td>
                        <a href="javascript:void(0)" class="user-name-link btn-view-review-booking" data-booking-id="${item.bookingId}">
                            ${item.bookingId}
                        </a>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${item.customerName}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${item.phone} • Bé ${item.petName}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500; color: var(--text-main);">${item.serviceName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${item.date}</div>
                    </td>
                    <td>
                        <span class="star-rating-text">${starsText}</span>
                    </td>
                    <td>
                        <div class="review-comment-box">
                            <div class="review-comment-text">"${item.comment}"</div>
                            ${item.replyText ? `
                                <div class="review-reply-preview">
                                    <strong>PawPal Admin (${item.replyDate || ''}):</strong> "${item.replyText}"
                                    ${item.voucherSent ? `<div style="font-weight: 600; color: #B45309; margin-top: 2px;">🎁 Đã gửi: ${item.voucherSent}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </td>
                    <td><span style="font-weight: 500;">${item.staff || 'PawPal Team'}</span></td>
                    <td>
                        ${statusBadge}
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="btn-reply-review-table btn-open-reply-modal" data-review-id="${item.id}">
                            ${item.status === 'replied' ? 'Sửa bài' : (item.status === 'escalated' ? 'Chi tiết' : 'Phản hồi')}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-view-review-booking').forEach(link => {
            link.addEventListener('click', () => {
                const bkgId = link.getAttribute('data-booking-id');
                openBookingDetail(bkgId);
            });
        });

        tbody.querySelectorAll('.btn-open-reply-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const revId = btn.getAttribute('data-review-id');
                openReplyReviewModal(revId);
            });
        });
    }

    function openReplyReviewModal(reviewId) {
        const modal = document.getElementById('modalReplyReview');
        const review = reviewsData.find(r => r.id === reviewId);
        if (!review || !modal) return;
        currentReplyingReview = review;

        document.getElementById('replyReviewIdHidden').value = review.id;
        document.getElementById('reviewModalHeaderMeta').textContent = `${review.customerName} • ${review.bookingId} • ${'★'.repeat(review.rating)} (${review.rating}/5)`;
        document.getElementById('reviewModalCustomerComment').textContent = `"${review.comment}"`;
        
        const staffMetaEl = document.getElementById('reviewModalStaffMeta');
        if (staffMetaEl) {
            staffMetaEl.textContent = `KTV phụ trách: ${review.staff || 'Chưa phân công'} | Gói dịch vụ: ${review.serviceName}`;
        }

        const replyPresetSelect = document.getElementById('replyPresetSelect');
        if (replyPresetSelect) replyPresetSelect.value = 'CUSTOM';

        document.getElementById('replyContentText').value = review.replyText || '';
        document.getElementById('replyVoucherSelect').value = 'NONE';

        const btnEscalate = document.getElementById('btnEscalateToComplaint');
        if (btnEscalate) {
            if (review.rating <= 3) {
                btnEscalate.style.display = 'inline-block';
                if (review.status === 'escalated') {
                    btnEscalate.textContent = 'Đã chuyển CSKH';
                    btnEscalate.disabled = true;
                } else {
                    btnEscalate.textContent = 'Chuyển thành khiếu nại CSKH';
                    btnEscalate.disabled = false;
                }
            } else {
                btnEscalate.style.display = 'none';
            }
        }

        modal.classList.add('active');
    }

    // Render danh sách các bước quy trình chuẩn trong Modal Dịch vụ
    function renderServiceStepsEditor() {
        const container = document.getElementById('serviceStepsListContainer');
        if (!container) return;

        if (!currentEditingServiceSteps || currentEditingServiceSteps.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 12.5px; font-style: italic; padding: 4px;">Chưa có bước chăm sóc nào. Hãy nhập tên bước bên dưới để thêm vào quy trình chuẩn.</div>';
            return;
        }

        container.innerHTML = currentEditingServiceSteps.map((step, idx) => `
            <div class="service-step-item-tag">
                <span class="step-num">Bước ${idx + 1}:</span>
                <span class="step-text">${step}</span>
                <button type="button" class="btn-remove-step" data-step-index="${idx}" title="Xóa bước này">✕</button>
            </div>
        `).join('');

        container.querySelectorAll('.btn-remove-step').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.getAttribute('data-step-index'));
                currentEditingServiceSteps.splice(index, 1);
                renderServiceStepsEditor();
            });
        });
    }

    // ==========================================================================
    // Render danh sách ảnh preview trong modal tiếp nhận
    function renderIntakeProofPreviewList() {
        const listEl = document.getElementById('intakeProofPreviewList');
        if (!listEl) return;
        if (intakeProofImagesTemp.length === 0) {
            listEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Chưa có ảnh nào được chọn (nhấn nút tải ảnh ở trên)</span>';
            return;
        }
        listEl.innerHTML = intakeProofImagesTemp.map((img, idx) => `
            <div class="intake-proof-preview-item">
                <img src="${img}" alt="Ảnh bằng chứng ${idx + 1}" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                <button type="button" class="btn-remove-proof" data-proof-idx="${idx}" title="Gỡ ảnh">×</button>
            </div>
        `).join('');

        listEl.querySelectorAll('.btn-remove-proof').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-proof-idx'));
                intakeProofImagesTemp.splice(idx, 1);
                renderIntakeProofPreviewList();
            });
        });
    }

    // Render danh sách ảnh preview trong modal thêm phụ phí (Zero-Dispute)
    function renderSurchargeProofPreviewList() {
        const listEl = document.getElementById('surchargeProofPreviewList');
        if (!listEl) return;
        if (surchargeProofImagesTemp.length === 0) {
            listEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Chưa có ảnh bằng chứng đính kèm</span>';
            return;
        }
        listEl.innerHTML = surchargeProofImagesTemp.map((img, idx) => `
            <div class="intake-proof-preview-item">
                <img src="${img}" alt="Bằng chứng phụ phí ${idx + 1}" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                <button type="button" class="btn-remove-proof" data-surcharge-proof-idx="${idx}" title="Gỡ ảnh">×</button>
            </div>
        `).join('');

        listEl.querySelectorAll('.btn-remove-proof').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-surcharge-proof-idx'));
                surchargeProofImagesTemp.splice(idx, 1);
                renderSurchargeProofPreviewList();
            });
        });
    }

    // Render danh sách ảnh preview thành phẩm sau khi hoàn thành ca
    function renderCompleteProofPreviewList() {
        const listEl = document.getElementById('completeProofPreviewList');
        if (!listEl) return;
        if (completeProofImagesTemp.length === 0) {
            listEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Chưa có ảnh chụp thành phẩm sau ca</span>';
            return;
        }
        listEl.innerHTML = completeProofImagesTemp.map((img, idx) => `
            <div class="intake-proof-preview-item">
                <img src="${img}" alt="Ảnh thành phẩm ${idx + 1}" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                <button type="button" class="btn-remove-proof" data-complete-proof-idx="${idx}" title="Gỡ ảnh">×</button>
            </div>
        `).join('');

        listEl.querySelectorAll('.btn-remove-proof').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-complete-proof-idx'));
                completeProofImagesTemp.splice(idx, 1);
                renderCompleteProofPreviewList();
            });
        });
    }

    // ==========================================================================
    // 6a. CHUYỂN SANG BỘ PHẬN KHIẾU NẠI (1-CLICK ESCALATION TO COMPLAINTS)
    // ==========================================================================
    function escalateBookingToComplaint(bookingId, customTitle, customContent) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        const defaultTitle = `Sự cố ca ${booking.id} - ${booking.serviceName} (${booking.petName})`;
        const defaultContent = `Khách hàng ${booking.customerName} phản ánh về ca dịch vụ ${booking.serviceName} của bé ${booking.petName}. KTV phụ trách: ${booking.staff || 'Chưa phân công'}.`;

        const title = customTitle || prompt('Nhập tiêu đề phản ánh / khiếu nại ca dịch vụ:', defaultTitle);
        if (!title) return;

        const content = customContent || prompt('Nhập nội dung chi tiết phản ánh của khách hàng:', defaultContent);
        if (!content) return;

        const ticketId = 'TK-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100);
        const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('vi-VN');

        // Tạo đối tượng Ticket Khiếu nại chuẩn đồng bộ với complaints.js
        const newComplaint = {
            id: ticketId,
            customerName: booking.customerName,
            phone: booking.phone,
            petName: booking.petName,
            petBreed: `${booking.petBreed} • ${booking.petWeight || '5.0 kg'}`,
            petNotes: booking.petAlert || 'Không có ghi chú dị ứng',
            bookingId: booking.id,
            serviceType: booking.category ? booking.category.toLowerCase() : 'spa',
            serviceName: booking.serviceName,
            staffExecuted: `${booking.staff || 'Chưa phân công'} (${booking.branch || 'PawPal Chi nhánh Quận 1'})`,
            title: title,
            content: content,
            priority: 'high',
            slaStatus: 'URGENT',
            slaRemainingText: 'Còn 120 phút',
            staffAssigned: 'Lê Lệ Quyên',
            createdAt: nowStr,
            status: 'pending',
            evidence: [],
            checkinHealth: booking.intakeSafety ? `Cân nặng ${booking.intakeSafety.actualWeight}. Da lông: ${booking.intakeSafety.skinCoat}. Tính khí: ${booking.intakeSafety.temperament}.` : 'Chưa có biên bản ngoại quan',
            checkinPhotos: booking.intakeSafety ? (booking.intakeSafety.proofImages || []) : [],
            staffLogNote: 'Ca dịch vụ được chuyển sang bộ phận CSKH xử lý từ phân hệ Dịch vụ.',
            timeline: [
                { time: nowStr, author: `${booking.customerName} (Khách hàng)`, title: 'Tiếp nhận phản ánh', desc: content, isInternal: false },
                { time: nowStr, author: 'Quản trị viên Dịch vụ', title: 'Khởi tạo Ticket Khiếu nại khẩn cấp', desc: `Đã chuyển tiếp từ phân hệ Dịch vụ (Mã ca: ${booking.id}) sang CSKH.`, isInternal: true }
            ]
        };

        // Lưu vào sessionStorage khiếu nại
        try {
            const rawComplaints = sessionStorage.getItem('pawpal_admin_complaints_data');
            let complaintsList = rawComplaints ? JSON.parse(rawComplaints) : [];
            complaintsList.unshift(newComplaint);
            sessionStorage.setItem('pawpal_admin_complaints_data', JSON.stringify(complaintsList));
        } catch (e) {}

        // Cập nhật ca dịch vụ
        booking.alertType = 'urgent';
        booking.timeline = booking.timeline || [];
        booking.timeline.push({
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            title: `Chuyển CSKH: Ticket ${ticketId}`,
            desc: `Đã khởi tạo hồ sơ khiếu nại [${title}] chuyển sang bộ phận CSKH xử lý đền bù.`,
            done: false,
            staff: 'Quản trị viên'
        });

        // Đồng bộ lên Supabase support_ticket
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                db.from('support_ticket').insert([{
                    ticket_code: ticketId,
                    customer_id: (booking.userId && String(booking.userId).length > 30) ? booking.userId : null,
                    appointment_id: booking.dbId || null,
                    channel: 'WEB',
                    category: 'APPOINTMENT',
                    subject: title,
                    description: content,
                    priority: 'HIGH',
                    status: 'OPEN'
                }]);
            } catch(err) {
                console.warn('Lỗi ghi Supabase support_ticket:', err);
            }
        }

        showServiceConfirmModal({
            title: 'Khởi tạo Ticket Khiếu nại thành công',
            message: `Đã tạo thành công Phiếu Khiếu Nại ${ticketId}! Bạn có muốn chuyển sang phân hệ Khiếu Nại để xử lý ngay không?`,
            acceptText: 'Đến phân hệ Khiếu nại',
            onAccept: () => {
                sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticketId);
                sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-services');
                window.location.hash = '#tab-complaints';
            }
        });
        showToast(`Đã chuyển ca ${booking.id} sang bộ phận Khiếu nại (Ticket: ${ticketId})!`);
    }

    // ==========================================================================
    // 6a1. MỞ MODAL SỬA BƯỚC NHẬT KÝ CARE-LOG (CARE-LOG STEP EDITOR)
    // ==========================================================================
    function openEditCarelogStepModal(stepIdx) {
        const booking = bookingsData.find(b => b.id === selectedBookingId);
        if (!booking || !booking.timeline || !booking.timeline[stepIdx]) return;

        const step = booking.timeline[stepIdx];
        const modal = document.getElementById('modalEditCarelogStep');
        const metaEl = document.getElementById('editCarelogModalMeta');
        const idxHidden = document.getElementById('editCarelogStepIndexHidden');
        const titleInput = document.getElementById('editCarelogStepTitle');
        const staffInput = document.getElementById('editCarelogStepStaff');
        const timeInput = document.getElementById('editCarelogStepTime');
        const descInput = document.getElementById('editCarelogStepDesc');
        const doneCheck = document.getElementById('editCarelogStepDone');

        if (metaEl) {
            metaEl.textContent = `Mã ca: ${booking.id} | Bé: ${booking.petName} (${booking.petBreed}) | KTV: ${booking.staff || 'Chưa phân công'}`;
        }
        if (idxHidden) idxHidden.value = stepIdx;
        if (titleInput) titleInput.value = step.title || '';
        if (staffInput) staffInput.value = step.staff || booking.staff || '';
        if (timeInput) timeInput.value = step.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (descInput) descInput.value = step.desc || '';
        if (doneCheck) doneCheck.checked = !!step.done;

        editCarelogStepPhotosTemp = step.images ? [...step.images] : [];
        renderEditCarelogPhotosPreview();

        if (modal) modal.classList.add('active');
    }

    function renderEditCarelogPhotosPreview() {
        const listEl = document.getElementById('editCarelogPhotosPreviewList');
        if (!listEl) return;
        if (editCarelogStepPhotosTemp.length === 0) {
            listEl.innerHTML = '<span style="font-size: 12px; color: var(--text-muted);">Chưa có ảnh đính kèm trong bước này</span>';
            return;
        }
        listEl.innerHTML = editCarelogStepPhotosTemp.map((img, idx) => `
            <div class="intake-proof-preview-item">
                <img src="${img}" alt="Ảnh bước ${idx + 1}" onerror="this.src='/assets/images/services/spa/process/spa01.webp'">
                <button type="button" class="btn-remove-proof" data-step-photo-idx="${idx}" title="Gỡ ảnh">×</button>
            </div>
        `).join('');

        listEl.querySelectorAll('.btn-remove-proof').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-step-photo-idx'), 10);
                editCarelogStepPhotosTemp.splice(idx, 1);
                renderEditCarelogPhotosPreview();
            });
        });
    }

    // ==========================================================================
    // 6b. MỞ BIÊN BẢN TIẾP NHẬN BÉ VÀ KIỂM TRA AN TOÀN (ZERO-CLAIM INTAKE)
    // ==========================================================================
    function openIntakeModal(bookingId, mode) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        selectedBookingId = bookingId;

        const modalIntake = document.getElementById('modalEditIntakeInfo');
        const modalTitleEl = document.getElementById('intakeModalTitle');
        const petSummaryEl = document.getElementById('intakePetSummary');
        const submitBtnEl = document.getElementById('intakeModalSubmitBtn');
        const modeInput = document.getElementById('intakeModalMode');
        const intakeWeightInput = document.getElementById('intakePetWeightInput');
        const origWeightLabel = document.getElementById('intakeOriginalWeightLabel');
        const staffSelect = document.getElementById('intakeStaffSelect');
        const weightAlertBox = document.getElementById('intakeWeightAlertBox');
        const weightAlertText = document.getElementById('intakeWeightAlertText');
        const checkAutoWeightLabel = document.getElementById('checkAutoAddWeightSurchargeLabel');
        const checkAutoWeightInput = document.getElementById('checkAutoAddWeightSurcharge');
        const intakeBelongingsInput = document.getElementById('intakeBelongingsInput');
        const woundNoteInput = document.getElementById('intakeExistingWoundNote');

        // Subtitle tóm tắt
        if (petSummaryEl) {
            petSummaryEl.textContent = `Mã ca: ${booking.id} | Bé: ${booking.petName} (${booking.petBreed}) | Chủ nuôi: ${booking.customerName} - ${booking.phone}`;
        }

        // Cân nặng
        const originalWeightNum = parseFloat(booking.petWeight) || 4.0;
        if (origWeightLabel) {
            origWeightLabel.textContent = `(Đăng ký online: ${booking.petWeight || '4.0 kg'})`;
        }
        if (intakeWeightInput) {
            const currentActual = booking.intakeSafety ? parseFloat(booking.intakeSafety.actualWeight) : originalWeightNum;
            intakeWeightInput.value = currentActual || originalWeightNum;
        }

        // Kỹ thuật viên
        if (staffSelect) {
            staffSelect.value = booking.staff || '';
        }

        // Hàm tính khung giá theo cân nặng (Dưới 5kg, 5-10kg, 10-20kg, Trên 20kg)
        function getWeightTier(w) {
            if (w < 5.0) return { name: 'Dưới 5kg (<5kg)', tierIdx: 0, extra: 0 };
            if (w <= 10.0) return { name: '5kg - 10kg', tierIdx: 1, extra: 50000 };
            if (w <= 20.0) return { name: '10kg - 20kg', tierIdx: 2, extra: 100000 };
            return { name: 'Trên 20kg (>20kg)', tierIdx: 3, extra: 150000 };
        }

        let currentPriceDelta = 0;

        // Hàm kiểm tra lệch cân nặng
        const checkWeightDiff = () => {
            if (!intakeWeightInput || !weightAlertBox) return;
            const actualVal = parseFloat(intakeWeightInput.value);
            if (isNaN(actualVal)) {
                weightAlertBox.style.display = 'none';
                currentPriceDelta = 0;
                return;
            }

            const origTier = getWeightTier(originalWeightNum);
            const actualTier = getWeightTier(actualVal);
            const diff = actualVal - originalWeightNum;
            const isTierDiff = (origTier.tierIdx !== actualTier.tierIdx);

            if (isTierDiff && diff > 0) {
                currentPriceDelta = Math.max(0, actualTier.extra - origTier.extra);
                weightAlertBox.style.display = 'block';
                if (weightAlertText) {
                    weightAlertText.innerHTML = `Cảnh báo: Cân thực tế ${actualVal} kg vượt phân khúc đăng ký (${origTier.name} ➔ ${actualTier.name}). Chênh lệch giá dịch vụ: +${formatCurrency(currentPriceDelta)}.`;
                }
                if (checkAutoWeightLabel) {
                    checkAutoWeightLabel.textContent = `Tự động cộng phụ phí chênh lệch phân khúc cân nặng (+${formatCurrency(currentPriceDelta)}) vào ca`;
                }
                if (checkAutoWeightInput) {
                    checkAutoWeightInput.checked = true;
                    checkAutoWeightInput.setAttribute('data-price-delta', currentPriceDelta);
                }
            } else if (Math.abs(diff) >= 1.0) {
                currentPriceDelta = 0;
                weightAlertBox.style.display = 'block';
                if (weightAlertText) {
                    weightAlertText.innerHTML = `Lưu ý: Đo tại quầy ${actualVal} kg (chênh lệch ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg so với đăng ký ban đầu ${originalWeightNum} kg, cùng phân khúc ${actualTier.name}).`;
                }
                if (checkAutoWeightLabel) {
                    checkAutoWeightLabel.textContent = 'Cân nặng cùng phân khúc giá (Không phát sinh phụ phí)';
                }
                if (checkAutoWeightInput) {
                    checkAutoWeightInput.checked = false;
                    checkAutoWeightInput.setAttribute('data-price-delta', 0);
                }
            } else {
                weightAlertBox.style.display = 'none';
                currentPriceDelta = 0;
                if (checkAutoWeightInput) checkAutoWeightInput.setAttribute('data-price-delta', 0);
            }
        };
        checkWeightDiff();
        if (intakeWeightInput) {
            intakeWeightInput.oninput = checkWeightDiff;
        }

        // Checklist
        const s = booking.intakeSafety;
        if (s) {
            // Khôi phục từ dữ liệu đã có
            const checkSkinNorm = document.getElementById('checkSkinNormal');
            const checkSkinFlea = document.getElementById('checkSkinFleas');
            const checkSkinFung = document.getElementById('checkSkinFungus');
            const checkSkinMatt = document.getElementById('checkSkinMatted');
            if (checkSkinNorm) checkSkinNorm.checked = (s.skinCoat && s.skinCoat.includes('Sạch sẽ'));
            if (checkSkinFlea) checkSkinFlea.checked = (s.skinCoat && s.skinCoat.includes('ve rận'));
            if (checkSkinFung) checkSkinFung.checked = (s.skinCoat && s.skinCoat.includes('nấm'));
            if (checkSkinMatt) checkSkinMatt.checked = (s.skinCoat && s.skinCoat.includes('bết'));

            const checkEyesNorm = document.getElementById('checkEyesEarsNormal');
            const checkEyesDisc = document.getElementById('checkEyesDischarge');
            const checkEarsInf = document.getElementById('checkEarsInfection');
            const checkNoseRun = document.getElementById('checkNoseRunny');
            if (checkEyesNorm) checkEyesNorm.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('Bình thường'));
            if (checkEyesDisc) checkEyesDisc.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('Đỏ mắt'));
            if (checkEarsInf) checkEarsInf.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('tai'));
            if (checkNoseRun) checkNoseRun.checked = (s.eyesEarsNose && s.eyesEarsNose.includes('mũi'));

            const checkWoundNo = document.getElementById('checkWoundNone');
            const checkWoundExist = document.getElementById('checkWoundExisting');
            if (checkWoundNo) checkWoundNo.checked = (s.wounds && s.wounds.includes('Không có'));
            if (checkWoundExist) checkWoundExist.checked = (s.wounds && !s.wounds.includes('Không có'));
            if (woundNoteInput) woundNoteInput.value = (s.wounds && !s.wounds.includes('Không có')) ? s.wounds : '';

            // Radios tâm lý
            const radioTemperament = document.querySelectorAll('input[name="intakeTemperamentRadio"]');
            radioTemperament.forEach(r => {
                if (s.temperament && s.temperament.includes(r.value)) r.checked = true;
            });

            if (intakeBelongingsInput) intakeBelongingsInput.value = s.belongings || booking.belongings || '';
            intakeProofImagesTemp = [...(s.proofImages || [])];
        } else {
            // Mặc định ban đầu
            const checkSkinNorm = document.getElementById('checkSkinNormal');
            const checkSkinFlea = document.getElementById('checkSkinFleas');
            const checkSkinFung = document.getElementById('checkSkinFungus');
            const checkSkinMatt = document.getElementById('checkSkinMatted');
            if (checkSkinNorm) checkSkinNorm.checked = true;
            if (checkSkinFlea) checkSkinFlea.checked = false;
            if (checkSkinFung) checkSkinFung.checked = false;
            if (checkSkinMatt) checkSkinMatt.checked = false;

            const checkEyesNorm = document.getElementById('checkEyesEarsNormal');
            const checkEyesDisc = document.getElementById('checkEyesDischarge');
            const checkEarsInf = document.getElementById('checkEarsInfection');
            const checkNoseRun = document.getElementById('checkNoseRunny');
            if (checkEyesNorm) checkEyesNorm.checked = true;
            if (checkEyesDisc) checkEyesDisc.checked = false;
            if (checkEarsInf) checkEarsInf.checked = false;
            if (checkNoseRun) checkNoseRun.checked = false;

            const checkWoundNo = document.getElementById('checkWoundNone');
            const checkWoundExist = document.getElementById('checkWoundExisting');
            if (checkWoundNo) checkWoundNo.checked = true;
            if (checkWoundExist) checkWoundExist.checked = false;
            if (woundNoteInput) woundNoteInput.value = '';

            const radioTemperament = document.querySelectorAll('input[name="intakeTemperamentRadio"]');
            if (radioTemperament.length > 0) radioTemperament[0].checked = true;

            if (intakeBelongingsInput) intakeBelongingsInput.value = booking.belongings || '';
            intakeProofImagesTemp = [];
        }

        renderIntakeProofPreviewList();

        // Nút gắn ảnh bằng chứng
        const btnAddProof = document.getElementById('btnAddProofPhotoBtn');
        const fileInput = document.getElementById('intakeProofFileInput');
        if (btnAddProof && fileInput) {
            btnAddProof.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        intakeProofImagesTemp.push(evt.target.result);
                        renderIntakeProofPreviewList();
                    };
                    reader.readAsDataURL(file);
                });
                fileInput.value = '';
            };
        }

        // Checkbox đồ dùng
        const belongingCheckboxes = document.querySelectorAll('.check-belonging-item');
        belongingCheckboxes.forEach(cb => {
            cb.onchange = () => {
                const checkedVals = Array.from(belongingCheckboxes).filter(c => c.checked).map(c => c.value);
                if (intakeBelongingsInput) {
                    let currentTxt = intakeBelongingsInput.value;
                    checkedVals.forEach(v => {
                        if (!currentTxt.includes(v)) {
                            currentTxt = currentTxt ? `${currentTxt}, ${v}` : v;
                        }
                    });
                    intakeBelongingsInput.value = currentTxt;
                }
            };
        });

        if (mode === 'intake') {
            if (modalTitleEl) modalTitleEl.textContent = 'Biên bản tiếp nhận bé và Kiểm tra an toàn (Zero-Claim)';
            if (submitBtnEl) submitBtnEl.textContent = 'Xác nhận tiếp nhận và Bắt đầu ca';
            if (modeInput) modeInput.value = 'intake';
        } else {
            if (modalTitleEl) modalTitleEl.textContent = 'Cập nhật biên bản tiếp nhận an toàn';
            if (submitBtnEl) submitBtnEl.textContent = 'Lưu biên bản';
            if (modeInput) modeInput.value = 'edit';
        }

        if (modalIntake) modalIntake.classList.add('active');
    }

    // ==========================================================================
    // 7. QUẢN LÝ CÁC MODAL DIALOG
    // ==========================================================================
    function setupModals() {
        // Modal 1: Tạo lịch hẹn
        const modalCreate = document.getElementById('modalCreateBooking');
        const btnOpenCreate = document.getElementById('btnOpenCreateBookingModal');
        const btnCloseCreate = document.getElementById('btnCloseCreateBooking');
        const btnCancelCreate = document.getElementById('btnCancelCreateBooking');
        const formCreate = document.getElementById('formCreateBooking');

        // Tự động chuyển đổi hiển thị trường theo phân nhóm dịch vụ (Hotel / Taxi / Spa)
        const catSelect = document.getElementById('newBookingCategory');
        const svcSelect = document.getElementById('newBookingServiceSelect');
        const hotelFields = document.getElementById('createBookingHotelFields');
        const taxiFields = document.getElementById('createBookingTaxiFields');
        const spaFields = document.getElementById('createBookingSpaFields');
        const custInput = document.getElementById('newBookingCustomer');
        const phoneInput = document.getElementById('newBookingPhone');
        const petInput = document.getElementById('newBookingPetName');
        const petDatalist = document.getElementById('bookingPetDatalist');
        const custDatalist = document.getElementById('bookingCustomerDatalist');
        const alertInput = document.getElementById('newBookingPetAlert');
        const newBookingStaffSelect = document.getElementById('newBookingStaff');
        const newBookingStaffHint = document.getElementById('newBookingStaffWorkloadHint');

        let currentMatchedCustomer = null;
        let currentMatchedPet = null;

        // Cập nhật danh sách gói dịch vụ cụ thể lọc chuẩn theo Nhóm dịch vụ từ CSDL Supabase
        function updateServiceOptionsForCategory(val) {
            if (!svcSelect) return;
            const targetGroup = (val === 'Hotel') ? 'hotel' : ((val === 'Taxi') ? 'taxi' : 'spa');
            let filtered = servicesData.filter(s => s.group === targetGroup);

            // Dự phòng nếu dữ liệu CSDL chưa tải xong
            if (filtered.length === 0) {
                if (targetGroup === 'spa') {
                    filtered = [
                        { name: 'Gói Tắm Vệ Sinh Cơ Bản', priceFrom: '120.000', code: 'SPA01' },
                        { name: 'Gói Tắm Dưỡng Premium', priceFrom: '220.000', code: 'SPA02' },
                        { name: 'Grooming Tạo Kiểu Cơ Bản', priceFrom: '350.000', code: 'SPA07' }
                    ];
                } else if (targetGroup === 'hotel') {
                    filtered = [
                        { name: 'Phòng Standard', priceFrom: '180.000', code: 'HTL01' },
                        { name: 'Phòng Standard Plus', priceFrom: '250.000', code: 'HTL02' },
                        { name: 'Phòng Deluxe', priceFrom: '380.000', code: 'HTL03' },
                        { name: 'Phòng Cat Condo – Khách Sạn Cho Mèo', priceFrom: '300.000', code: 'HTL04' },
                        { name: 'Luxury Suite', priceFrom: '500.000', code: 'HTL05' }
                    ];
                } else {
                    filtered = [
                        { name: 'Dịch Vụ Xe Đưa Đón Tận Nơi (Pet Taxi)', priceFrom: '150.000', code: 'TXI01' }
                    ];
                }
            }

            svcSelect.innerHTML = '<option value="">-- Chọn dịch vụ --</option>';
            filtered.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.name;
                opt.dataset.dbId = s.dbId || '';
                opt.dataset.code = s.code || s.id || '';
                const priceNum = (typeof s.priceFrom === 'string') ? s.priceFrom : ((s.priceFrom || 150000).toLocaleString('vi-VN'));
                const unit = (targetGroup === 'hotel') ? ' đ/đêm' : ' đ';
                opt.textContent = `${s.name} (${priceNum}${unit})`;
                svcSelect.appendChild(opt);
            });
            svcSelect.value = '';
        }
        updateServiceOptionsRef = updateServiceOptionsForCategory;

        // Cập nhật danh sách Kỹ thuật viên / Tài xế từ CSDL Supabase
        function populateStaffSelect() {
            if (!newBookingStaffSelect) return;
            const curVal = newBookingStaffSelect.value;
            newBookingStaffSelect.innerHTML = '<option value="">Chưa phân công (Phân công sau)</option>';

            if (liveStaffList && liveStaffList.length > 0) {
                liveStaffList.forEach(stf => {
                    const opt = document.createElement('option');
                    opt.value = stf.full_name;
                    opt.dataset.id = stf.id;
                    const spec = stf.specialization || (stf.role === 'PET_CARE' ? 'KTV Chăm sóc' : (stf.role || 'KTV'));
                    opt.textContent = `${stf.full_name} (${spec})`;
                    newBookingStaffSelect.appendChild(opt);
                });
            } else {
                ['Trần Văn Nhân Viên', 'Nguyễn Thị Chăm Sóc', 'Lê Hoàng Tiến', 'Phạm Thúy Vy'].forEach(name => {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    newBookingStaffSelect.appendChild(opt);
                });
            }
            if (curVal) newBookingStaffSelect.value = curVal;
        }
        populateStaffSelectRef = populateStaffSelect;

        // Helper: Lấy tên hiển thị chuẩn mực của Khách hàng
        function getCustomerDisplayName(c) {
            if (!c) return 'Khách hàng';
            const prof = Array.isArray(c.customer_profile) ? c.customer_profile[0] : c.customer_profile;
            const name = (prof?.full_name || c.full_name || c.name || '').trim();
            if (name && name.toLowerCase() !== 'khách hàng') return name;
            const pets = Array.isArray(c.pet_profile) ? c.pet_profile : (c.pet_profile ? [c.pet_profile] : []);
            if (pets.length > 0 && pets[0]?.pet_name) {
                return `Chủ nuôi bé ${pets[0].pet_name}`;
            }
            return c.phone_main ? `Khách (${c.phone_main})` : 'Khách hàng';
        }

        const custDropdown = document.getElementById('bookingCustomerDropdown');
        const petDropdown = document.getElementById('bookingPetDropdown');

        // Chọn thú cưng từ dropdown gợi ý
        function selectPetForBooking(p) {
            currentMatchedPet = p;
            if (petInput) petInput.value = p.pet_name || '';
            if (alertInput && (p.allergy || p.routine)) {
                alertInput.value = p.allergy || p.routine;
            }
            if (petDropdown) petDropdown.style.display = 'none';
            clearBookingFieldError('newBookingPetName', 'errorNewBookingPetName');

            // Nếu thú cưng có liên kết với khách hàng, tự động điền khách hàng & SĐT nếu chưa có
            const ownerId = p.customer_id || p.customer?.id;
            const ownerPhone = p.customer?.phone_main;
            if (ownerId || ownerPhone) {
                const matchedCust = liveCustomerDirectory.find(c => c.id === ownerId || (ownerPhone && c.phone_main === ownerPhone));
                if (matchedCust && (!currentMatchedCustomer || currentMatchedCustomer.id !== matchedCust.id)) {
                    currentMatchedCustomer = matchedCust;
                    const realName = getCustomerDisplayName(matchedCust);
                    const realPhone = matchedCust.phone_main || '';
                    if (custInput) custInput.value = realName;
                    if (phoneInput && realPhone) phoneInput.value = realPhone;
                    clearBookingFieldError('newBookingCustomer', 'errorNewBookingCustomer');
                    clearBookingFieldError('newBookingPhone', 'errorNewBookingPhone');
                }
            }
        }

        // Chọn khách hàng từ dropdown gợi ý
        function selectCustomerForBooking(c) {
            currentMatchedCustomer = c;
            const realName = getCustomerDisplayName(c);
            const realPhone = c.phone_main || '';
            if (custInput) custInput.value = realName;
            if (phoneInput && realPhone) phoneInput.value = realPhone;
            if (custDropdown) custDropdown.style.display = 'none';
            clearBookingFieldError('newBookingCustomer', 'errorNewBookingCustomer');
            clearBookingFieldError('newBookingPhone', 'errorNewBookingPhone');

            // Xử lý danh sách thú cưng của khách này
            const pets = Array.isArray(c.pet_profile) ? c.pet_profile : (c.pet_profile ? [c.pet_profile] : []);
            if (pets.length === 1 && petInput) {
                selectPetForBooking(pets[0]);
            } else if (pets.length > 1 && petInput) {
                petInput.value = '';
                petInput.placeholder = `Bấm để chọn 1 trong ${pets.length} bé cưng của khách...`;
                currentMatchedPet = null;
                if (alertInput) alertInput.value = '';
            } else if (pets.length === 0 && petInput) {
                petInput.placeholder = 'Khách chưa có bé cưng, nhập tên bé mới...';
            }
        }

        // Hiển thị danh sách gợi ý khách hàng (Custom Autocomplete Popover)
        function renderCustomerAutocomplete(filterText = '') {
            if (!custDropdown) return;
            const q = (filterText || '').toLowerCase().trim();
            const filtered = liveCustomerDirectory.filter(c => {
                if (!q) return true;
                const name = getCustomerDisplayName(c).toLowerCase();
                const phone = (c.phone_main || '').toLowerCase();
                const pets = Array.isArray(c.pet_profile) ? c.pet_profile : (c.pet_profile ? [c.pet_profile] : []);
                const petMatch = pets.some(p => (p.pet_name || '').toLowerCase().includes(q));
                return name.includes(q) || phone.includes(q) || petMatch;
            });

            if (filtered.length === 0) {
                custDropdown.innerHTML = '<div class="customer-autocomplete-empty" style="padding: 14px; text-align: center; font-size: 12.5px; color: #4F7A65;">Không tìm thấy khách trong danh bạ. Bạn có thể nhập thông tin khách mới trực tiếp.</div>';
                custDropdown.style.display = 'block';
                return;
            }

            custDropdown.innerHTML = '';
            filtered.forEach(c => {
                const name = getCustomerDisplayName(c);
                const phone = c.phone_main || 'Chưa có SĐT';
                const pets = Array.isArray(c.pet_profile) ? c.pet_profile : (c.pet_profile ? [c.pet_profile] : []);
                const petsSummary = pets.length > 0 ? pets.map(p => p.pet_name).join(', ') : 'Chưa có bé cưng';
                const initial = name.charAt(0).toUpperCase() || 'K';

                const item = document.createElement('div');
                item.className = 'customer-autocomplete-item';
                item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #F4FAF6; cursor: pointer; transition: background 0.15s ease; background-color: #ffffff;';
                item.innerHTML = `
                    <div class="customer-autocomplete-info" style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                        <div class="customer-autocomplete-avatar" style="width: 32px; height: 32px; border-radius: 50%; background-color: #DCEEE2; color: #165335; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${initial}</div>
                        <div class="customer-autocomplete-meta" style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                            <div class="customer-autocomplete-name" style="font-size: 13px; font-weight: 600; color: #203A2C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                            <div class="customer-autocomplete-phone" style="font-size: 11.5px; color: #4F7A65;">${phone}</div>
                        </div>
                    </div>
                    <div class="customer-autocomplete-pets" style="font-size: 11.5px; color: #236B48; background-color: #EEF5F1; padding: 3px 8px; border-radius: 9px; font-weight: 500; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;" title="${petsSummary}">🐾 ${petsSummary}</div>
                `;
                item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#EEF5F1'; });
                item.addEventListener('mouseleave', () => { item.style.backgroundColor = '#ffffff'; });
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectCustomerForBooking(c);
                });
                custDropdown.appendChild(item);
            });
            custDropdown.style.display = 'block';
        }

        // Hiển thị danh sách gợi ý thú cưng (Custom Autocomplete Popover)
        function renderPetAutocomplete(filterText = '') {
            if (!petDropdown) return;
            const q = (filterText || '').toLowerCase().trim();

            let candidatePets = [];
            if (currentMatchedCustomer) {
                // Ưu tiên các bé cưng của khách hàng này
                const custPets = Array.isArray(currentMatchedCustomer.pet_profile) ? currentMatchedCustomer.pet_profile : (currentMatchedCustomer.pet_profile ? [currentMatchedCustomer.pet_profile] : []);
                if (custPets.length > 0) {
                    candidatePets = custPets.map(p => ({ ...p, customer: currentMatchedCustomer }));
                } else {
                    candidatePets = livePetDirectory.filter(p => p.customer_id === currentMatchedCustomer.id);
                }
            }

            // Nếu không có khách hoặc người dùng đang tìm kiếm mà khách hiện tại không có bé khớp
            if (candidatePets.length === 0 || (!currentMatchedCustomer && livePetDirectory.length > 0)) {
                candidatePets = livePetDirectory;
            }

            const filtered = candidatePets.filter(p => {
                if (!q) return true;
                const petName = (p.pet_name || '').toLowerCase();
                const breed = (p.breed || '').toLowerCase();
                const species = (p.species || '').toLowerCase();
                const ownerName = (p.customer?.customer_profile?.full_name || '').toLowerCase();
                const ownerPhone = (p.customer?.phone_main || '').toLowerCase();
                return petName.includes(q) || breed.includes(q) || species.includes(q) || ownerName.includes(q) || ownerPhone.includes(q);
            });

            if (filtered.length === 0) {
                petDropdown.innerHTML = '<div class="customer-autocomplete-empty" style="padding: 14px; text-align: center; font-size: 12.5px; color: #4F7A65;">Không tìm thấy bé cưng. Bạn có thể nhập tên bé cưng mới trực tiếp.</div>';
                petDropdown.style.display = 'block';
                return;
            }

            petDropdown.innerHTML = '';
            filtered.forEach(p => {
                const petName = p.pet_name || 'Bé cưng';
                const breed = p.breed || p.species || 'Thú cưng';
                const weightText = p.weight ? ` • ${p.weight}kg` : '';
                const ownerProf = Array.isArray(p.customer?.customer_profile) ? p.customer?.customer_profile[0] : p.customer?.customer_profile;
                const ownerName = ownerProf?.full_name || (p.customer?.phone_main ? `Khách (${p.customer.phone_main})` : 'Chưa có chủ');
                const ownerPhone = p.customer?.phone_main || '';
                const ownerInfo = ownerPhone ? `${ownerName} • ${ownerPhone}` : ownerName;
                const initial = petName.charAt(0).toUpperCase() || '🐾';

                const item = document.createElement('div');
                item.className = 'customer-autocomplete-item';
                item.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #F4FAF6; cursor: pointer; transition: background 0.15s ease; background-color: #ffffff;';
                item.innerHTML = `
                    <div class="customer-autocomplete-info" style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                        <div class="customer-autocomplete-avatar" style="width: 32px; height: 32px; border-radius: 50%; background-color: #EEF5F1; color: #236B48; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${initial}</div>
                        <div class="customer-autocomplete-meta" style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                            <div class="customer-autocomplete-name" style="font-size: 13px; font-weight: 600; color: #203A2C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${petName} <span style="font-size: 12px; font-weight: 400; color: #4F7A65;">(${breed}${weightText})</span></div>
                            <div class="customer-autocomplete-phone" style="font-size: 11.5px; color: #4F7A65;">Chủ: ${ownerInfo}</div>
                        </div>
                    </div>
                    ${p.allergy || p.routine ? `<div class="customer-autocomplete-pets" style="font-size: 11px; color: #D97706; background-color: #FEF3C7; padding: 3px 8px; border-radius: 9px; font-weight: 500; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;" title="${p.allergy || p.routine}">⚠️ Lưu ý</div>` : ''}
                `;
                item.addEventListener('mouseenter', () => { item.style.backgroundColor = '#EEF5F1'; });
                item.addEventListener('mouseleave', () => { item.style.backgroundColor = '#ffffff'; });
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    selectPetForBooking(p);
                });
                petDropdown.appendChild(item);
            });
            petDropdown.style.display = 'block';
        }

        if (custInput) {
            custInput.addEventListener('focus', () => {
                renderCustomerAutocomplete(custInput.value);
            });
            custInput.addEventListener('input', () => {
                renderCustomerAutocomplete(custInput.value);
            });
            custInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (custDropdown) custDropdown.style.display = 'none';
                }, 200);
            });
        }

        if (petInput) {
            petInput.addEventListener('focus', () => {
                renderPetAutocomplete(petInput.value);
            });
            petInput.addEventListener('input', () => {
                renderPetAutocomplete(petInput.value);
            });
            petInput.addEventListener('blur', () => {
                setTimeout(() => {
                    if (petDropdown) petDropdown.style.display = 'none';
                }, 200);
            });
            petInput.addEventListener('change', () => {
                const petVal = (petInput.value || '').trim().toLowerCase();
                const matchedPet = livePetDirectory.find(p => (p.pet_name || '').toLowerCase() === petVal);
                if (matchedPet) {
                    selectPetForBooking(matchedPet);
                }
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('change', () => {
                const rawPhone = phoneInput.value.trim().toLowerCase();
                if (!rawPhone) return;
                const matched = liveCustomerDirectory.find(c => (c.phone_main || '').toLowerCase() === rawPhone);
                if (matched) selectCustomerForBooking(matched);
            });
        }

        function updateCreateCategoryFields() {
            const val = catSelect ? catSelect.value : 'Spa';
            if (hotelFields) hotelFields.style.display = (val === 'Hotel') ? 'block' : 'none';
            if (taxiFields) taxiFields.style.display = (val === 'Taxi') ? 'block' : 'none';
            if (spaFields) spaFields.style.display = (val === 'Spa') ? 'block' : 'none';
            updateServiceOptionsForCategory(val);
        }
        if (catSelect) {
            catSelect.addEventListener('change', updateCreateCategoryFields);
        }

        // Khởi tạo ngay options dịch vụ và nhân viên
        updateServiceOptionsForCategory(catSelect ? catSelect.value : 'Spa');
        populateStaffSelect();

        // Helper hiển thị và xóa thông báo lỗi chữ đỏ bên dưới trường bắt buộc
        function setBookingFieldError(fieldId, errorId, message) {
            const errEl = document.getElementById(errorId);
            const inputEl = document.getElementById(fieldId);
            if (errEl) {
                errEl.textContent = message;
                errEl.style.display = 'block';
            }
            if (inputEl) {
                inputEl.classList.add('input-error-border');
                inputEl.style.borderColor = '#DC2626';
            }
        }

        function clearBookingFieldError(fieldId, errorId) {
            const errEl = document.getElementById(errorId);
            const inputEl = document.getElementById(fieldId);
            if (errEl) {
                errEl.textContent = '';
                errEl.style.display = 'none';
            }
            if (inputEl) {
                inputEl.classList.remove('input-error-border');
                inputEl.style.borderColor = '';
            }
        }

        function clearCreateBookingErrors() {
            const errorMappings = [
                ['newBookingCustomer', 'errorNewBookingCustomer'],
                ['newBookingPhone', 'errorNewBookingPhone'],
                ['newBookingPetName', 'errorNewBookingPetName'],
                ['newBookingCategory', 'errorNewBookingCategory'],
                ['newBookingServiceSelect', 'errorNewBookingServiceSelect'],
                ['newBookingDate', 'errorNewBookingDate'],
                ['newBookingTime', 'errorNewBookingTime'],
                ['newBookingHotelCheckOutDate', 'errorNewBookingHotelCheckOutDate'],
                ['newBookingTaxiPickup', 'errorNewBookingTaxiPickup']
            ];
            errorMappings.forEach(([fieldId, errorId]) => clearBookingFieldError(fieldId, errorId));
        }

        // Tự động xóa lỗi khi người dùng nhập liệu hoặc thay đổi giá trị
        [
            ['newBookingCustomer', 'errorNewBookingCustomer', 'input'],
            ['newBookingPhone', 'errorNewBookingPhone', 'input'],
            ['newBookingPetName', 'errorNewBookingPetName', 'input'],
            ['newBookingCategory', 'errorNewBookingCategory', 'change'],
            ['newBookingServiceSelect', 'errorNewBookingServiceSelect', 'change'],
            ['newBookingDate', 'errorNewBookingDate', 'change'],
            ['newBookingTime', 'errorNewBookingTime', 'change'],
            ['newBookingHotelCheckOutDate', 'errorNewBookingHotelCheckOutDate', 'change'],
            ['newBookingTaxiPickup', 'errorNewBookingTaxiPickup', 'input']
        ].forEach(([fieldId, errorId, evtName]) => {
            const el = document.getElementById(fieldId);
            if (el) {
                el.addEventListener(evtName, () => clearBookingFieldError(fieldId, errorId));
            }
        });

        // Hàm xóa sạch toàn bộ dữ liệu trên form Thêm lịch hẹn
        function resetCreateBookingForm() {
            if (formCreate) {
                formCreate.reset();
            }

            // Xóa sạch tường minh tất cả các trường nhập liệu
            if (custInput) custInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (petInput) {
                petInput.value = '';
                petInput.placeholder = 'Tên bé cưng...';
            }
            if (catSelect) catSelect.value = 'Spa';
            if (svcSelect) svcSelect.value = '';
            if (alertInput) alertInput.value = '';

            const dateInput = document.getElementById('newBookingDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }

            const timeInput = document.getElementById('newBookingTime');
            if (timeInput) timeInput.value = '09:00';

            const checkOutDateInput = document.getElementById('newBookingHotelCheckOutDate');
            if (checkOutDateInput) {
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + 3);
                checkOutDateInput.value = nextDate.toISOString().split('T')[0];
            }

            const checkOutTimeInput = document.getElementById('newBookingHotelCheckOutTime');
            if (checkOutTimeInput) checkOutTimeInput.value = '10:00';

            const roomTypeInput = document.getElementById('newBookingHotelRoomType');
            if (roomTypeInput) roomTypeInput.selectedIndex = 0;

            const dietInput = document.getElementById('newBookingHotelDiet');
            if (dietInput) dietInput.selectedIndex = 0;

            const taxiPickup = document.getElementById('newBookingTaxiPickup');
            if (taxiPickup) taxiPickup.value = '';

            const taxiDropoff = document.getElementById('newBookingTaxiDropoff');
            if (taxiDropoff) taxiDropoff.value = '';

            const taxiTripType = document.getElementById('newBookingTaxiTripType');
            if (taxiTripType) taxiTripType.selectedIndex = 0;

            const taxiDistance = document.getElementById('newBookingTaxiDistance');
            if (taxiDistance) taxiDistance.value = '4.0';

            const spaStyle = document.getElementById('newBookingSpaStyle');
            if (spaStyle) spaStyle.value = '';

            const spaLevel = document.getElementById('newBookingSpaGroomerLevel');
            if (spaLevel) spaLevel.selectedIndex = 0;

            if (newBookingStaffSelect) newBookingStaffSelect.value = '';

            const branchSelect = document.getElementById('newBookingBranch');
            if (branchSelect) branchSelect.selectedIndex = 0;

            const notesInput = document.getElementById('newBookingNotes');
            if (notesInput) notesInput.value = '';

            // Ẩn popover gợi ý autocomplete
            if (custDropdown) {
                custDropdown.style.display = 'none';
                custDropdown.innerHTML = '';
            }
            if (petDropdown) {
                petDropdown.style.display = 'none';
                petDropdown.innerHTML = '';
            }

            // Ẩn cảnh báo tải ca KTV
            if (newBookingStaffHint) {
                newBookingStaffHint.style.display = 'none';
                newBookingStaffHint.textContent = '';
            }

            // Reset các biến liên kết
            activeBookingPreset = null;
            currentMatchedCustomer = null;
            currentMatchedPet = null;

            // Xóa sạch trạng thái lỗi đỏ
            clearCreateBookingErrors();

            // Cập nhật lại các trường hiển thị theo nhóm Spa
            updateCreateCategoryFields();
        }

        if (btnOpenCreate) {
            btnOpenCreate.addEventListener('click', () => {
                resetCreateBookingForm();
                populateStaffSelect();
                if (modalCreate) modalCreate.classList.add('active');
            });
        }

        let activeBookingPreset = null;
        let hotelVaccineWarningConfirmed = false;

        // Tự động kiểm tra nếu chuyển từ phân hệ Thú cưng sang với thông tin bé cưng điền sẵn
        const checkPresetBooking = () => {
            const rawPreset = sessionStorage.getItem('pawpal_admin_booking_preset');
            if (rawPreset) {
                try {
                    const preset = JSON.parse(rawPreset);
                    resetCreateBookingForm();
                    activeBookingPreset = preset;
                    hotelVaccineWarningConfirmed = false;
                    const custEl = document.getElementById('newBookingCustomer');
                    const phoneEl = document.getElementById('newBookingPhone');
                    const petEl = document.getElementById('newBookingPetName');
                    const alertEl = document.getElementById('newBookingPetAlert');
                    const dateInput = document.getElementById('newBookingDate');

                    if (custEl && preset.ownerName) custEl.value = preset.ownerName;
                    if (phoneEl && preset.ownerPhone) phoneEl.value = preset.ownerPhone;
                    if (petEl && preset.petName) petEl.value = preset.petName;
                    if (alertEl && (preset.petAlert || preset.alert || preset.allergy)) {
                        alertEl.value = preset.petAlert || preset.alert || preset.allergy;
                    }
                    if (dateInput) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        dateInput.value = todayStr;
                    }

                    populateStaffSelect();
                    updateCreateCategoryFields();
                    clearCreateBookingErrors();
                    if (modalCreate) modalCreate.classList.add('active');
                    sessionStorage.removeItem('pawpal_admin_booking_preset');
                    showToast(`Đã tự động điền thông tin bé ${preset.petName} và cảnh báo an toàn vào phiếu đặt lịch!`);
                } catch (e) {}
            }

            if (sessionStorage.getItem('pawpal_admin_service_open_create_modal') === 'true') {
                sessionStorage.removeItem('pawpal_admin_service_open_create_modal');
                resetCreateBookingForm();
                populateStaffSelect();
                if (modalCreate) modalCreate.classList.add('active');
            }
        };
        setTimeout(checkPresetBooking, 150);

        const closeCreateModal = () => {
            if (modalCreate) modalCreate.classList.remove('active');
            resetCreateBookingForm();
        };
        if (btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateModal);
        if (btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateModal);
        if (modalCreate) {
            modalCreate.addEventListener('click', (e) => {
                if (e.target === modalCreate) {
                    closeCreateModal();
                }
            });
        }

        if (newBookingStaffSelect && newBookingStaffHint) {
            newBookingStaffSelect.addEventListener('change', () => {
                const staff = newBookingStaffSelect.value;
                if (!staff) {
                    newBookingStaffHint.style.display = 'none';
                    return;
                }
                const staffItem = (liveStaffList && liveStaffList.find(s => s.full_name === staff)) || { maxCapacity: 4 };
                const count = getStaffActiveBookings(staff).length;
                const max = staffItem.maxCapacity || 4;
                newBookingStaffHint.style.display = 'block';
                newBookingStaffHint.className = '';
                if (count >= max) {
                    newBookingStaffHint.classList.add('staff-workload-hint-danger');
                    newBookingStaffHint.textContent = `🟡 ${staff} đã nhận ${count}/${max} ca hôm nay (Cảnh báo quá tải - nên cân nhắc chọn KTV khác).`;
                } else if (count >= max - 1) {
                    newBookingStaffHint.classList.add('staff-workload-hint-warning');
                    newBookingStaffHint.textContent = `⚠️ ${staff} đang nhận ${count}/${max} ca hôm nay (Sắp đầy ca).`;
                } else {
                    newBookingStaffHint.classList.add('staff-workload-hint-available');
                    newBookingStaffHint.textContent = `🟢 ${staff} đang nhận ${count}/${max} ca hôm nay (Khả dụng - còn ${max - count} ca trống).`;
                }
            });
        }

        async function handleCreateBookingSubmit(e) {
            if (e && e.preventDefault) e.preventDefault();

            // Xóa trạng thái lỗi cũ trước khi kiểm tra
            clearCreateBookingErrors();

            const customer = (document.getElementById('newBookingCustomer')?.value || '').trim();
            const phone = (document.getElementById('newBookingPhone')?.value || '').trim();
            const petName = (document.getElementById('newBookingPetName')?.value || '').trim();
            const category = document.getElementById('newBookingCategory')?.value || '';
            const serviceName = document.getElementById('newBookingServiceSelect')?.value || '';
            const date = document.getElementById('newBookingDate')?.value || '';
            const time = document.getElementById('newBookingTime')?.value || '';
            const staff = document.getElementById('newBookingStaff')?.value || '';
            const branch = document.getElementById('newBookingBranch')?.value || '';
            const petAlert = (document.getElementById('newBookingPetAlert')?.value || '').trim();
            const note = (document.getElementById('newBookingNotes')?.value || '').trim();

            const matchedPetNotVaccinated = currentMatchedPet &&
                (!currentMatchedPet.vaccination_history || /chưa|không/i.test(currentMatchedPet.vaccination_history));
            if (category === 'Hotel' && (activeBookingPreset?.petVaccinated === false || matchedPetNotVaccinated) && !hotelVaccineWarningConfirmed) {
                showServiceConfirmModal({
                    title: 'Cần kiểm tra sổ tiêm',
                    message: `Bé ${petName || 'thú cưng'} chưa được xác nhận đủ vắc-xin. Vui lòng kiểm tra sổ tiêm trước khi check-in Pet Hotel. Bạn vẫn muốn tiếp tục tạo lịch hẹn để chờ đối chiếu?`,
                    acceptText: 'Vẫn tạo lịch hẹn',
                    onAccept: () => {
                        hotelVaccineWarningConfirmed = true;
                        handleCreateBookingSubmit(e);
                    }
                });
                return;
            }

            let hasError = false;
            let firstErrorInput = null;

            const markError = (fieldId, errorId, message) => {
                setBookingFieldError(fieldId, errorId, message);
                if (!hasError) {
                    hasError = true;
                    firstErrorInput = document.getElementById(fieldId);
                }
            };

            // 1. Validate Khách hàng (bắt buộc)
            if (!customer) {
                markError('newBookingCustomer', 'errorNewBookingCustomer', 'Vui lòng nhập tên khách hàng.');
            }

            // 2. Validate Thú cưng (bắt buộc)
            if (!petName) {
                markError('newBookingPetName', 'errorNewBookingPetName', 'Vui lòng nhập tên thú cưng.');
            }

            // 3. Validate Gói dịch vụ cụ thể (bắt buộc)
            if (!serviceName) {
                markError('newBookingServiceSelect', 'errorNewBookingServiceSelect', 'Vui lòng chọn dịch vụ.');
            }

            // Validate Số điện thoại (nếu có nhập thì kiểm tra định dạng)
            if (phone) {
                const cleanPhone = phone.replace(/[\s.-]/g, '');
                if (!/^(\+84|0)[0-9]{8,10}$/.test(cleanPhone)) {
                    markError('newBookingPhone', 'errorNewBookingPhone', 'Số điện thoại không hợp lệ (9 - 11 chữ số).');
                }
            }

            // Validate Nhóm dịch vụ
            if (!category) {
                markError('newBookingCategory', 'errorNewBookingCategory', 'Vui lòng chọn nhóm dịch vụ.');
            }

            // Validate Ngày hẹn
            if (!date) {
                markError('newBookingDate', 'errorNewBookingDate', 'Vui lòng chọn ngày hẹn.');
            }

            // Validate Giờ hẹn
            if (!time) {
                markError('newBookingTime', 'errorNewBookingTime', 'Vui lòng chọn giờ hẹn.');
            }

            // Validate trường đặc thù theo Nhóm dịch vụ Hotel / Taxi
            if (category === 'Hotel') {
                const checkOutDate = document.getElementById('newBookingHotelCheckOutDate')?.value || '';
                if (!checkOutDate) {
                    markError('newBookingHotelCheckOutDate', 'errorNewBookingHotelCheckOutDate', 'Vui lòng chọn ngày trả phòng.');
                } else if (date && checkOutDate < date) {
                    markError('newBookingHotelCheckOutDate', 'errorNewBookingHotelCheckOutDate', 'Ngày trả phòng không được trước ngày nhận phòng.');
                }
            } else if (category === 'Taxi') {
                const pickup = (document.getElementById('newBookingTaxiPickup')?.value || '').trim();
                if (!pickup) {
                    markError('newBookingTaxiPickup', 'errorNewBookingTaxiPickup', 'Vui lòng nhập địa chỉ đón bé.');
                }
            }

            // Nếu có lỗi, dừng submit và cuộn/focus vào ô đầu tiên bị lỗi
            if (hasError) {
                if (firstErrorInput) firstErrorInput.focus();
                showToast('Vui lòng điền đầy đủ và chính xác các trường bắt buộc.', 'warning');
                return;
            }

            const newId = 'BKG-' + (1000 + bookingsData.length + 1);
            let categoryName = 'Spa và Grooming';
            if (category === 'Hotel') categoryName = 'Pet Hotel';
            if (category === 'Taxi') categoryName = 'Pet Taxi';

            // Tự động sinh danh sách bước Care-log từ Quy trình chuẩn của Dịch vụ được chọn
            const matchedSvc = servicesData.find(s => s.name === serviceName);
            const initialTimeline = (matchedSvc && matchedSvc.steps && matchedSvc.steps.length > 0)
                ? matchedSvc.steps.map((st, i) => ({
                    time: i === 0 ? time : '--:--',
                    title: st,
                    desc: i === 0 ? 'Đã tiếp nhận và chuẩn bị ca dịch vụ' : 'Đang chờ thực hiện theo quy trình',
                    done: i === 0,
                    staff: staff || 'KTV'
                }))
                : [ { time: time, title: 'Tiếp nhận ca mới', desc: 'Đã tạo lịch hẹn thành công', done: true, staff: staff || 'PawPal' } ];

            let extraProps = {};
            let calculatedDuration = matchedSvc ? matchedSvc.duration : '60 phút';
            let calculatedPrice = 250000;

            if (category === 'Hotel') {
                const checkOutDate = document.getElementById('newBookingHotelCheckOutDate')?.value || date;
                const checkOutTime = document.getElementById('newBookingHotelCheckOutTime')?.value || '10:00';
                const roomType = document.getElementById('newBookingHotelRoomType')?.value || 'Phòng Deluxe (Máy lạnh 24/7)';
                const dietPlan = document.getElementById('newBookingHotelDiet')?.value || 'Pate tươi dinh dưỡng (2 bữa/ngày)';

                const d1 = new Date(date);
                const d2 = new Date(checkOutDate);
                const diffTime = Math.abs(d2 - d1);
                const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                calculatedDuration = `${diffDays} đêm`;
                calculatedPrice = diffDays * 380000;

                extraProps = {
                    checkInDate: date,
                    checkInTime: time,
                    checkOutDate: checkOutDate,
                    checkOutTime: checkOutTime,
                    nights: diffDays,
                    roomType: roomType,
                    roomCode: 'DLX-0' + (bookingsData.length + 1),
                    dietPlan: dietPlan,
                    cameraCode: 'CAM-HOTEL-0' + (bookingsData.length + 1),
                    duration: calculatedDuration
                };
            } else if (category === 'Taxi') {
                const pickup = document.getElementById('newBookingTaxiPickup')?.value || 'Địa chỉ đón bé';
                const dropoff = document.getElementById('newBookingTaxiDropoff')?.value || 'PawPal Chi nhánh Quận 1';
                const tripType = document.getElementById('newBookingTaxiTripType')?.value || '2 chiều khứ hồi';
                const dist = parseFloat(document.getElementById('newBookingTaxiDistance')?.value) || 4.0;
                calculatedPrice = 150000;

                extraProps = {
                    pickupAddress: pickup,
                    dropoffAddress: dropoff,
                    tripType: tripType,
                    distanceKm: dist,
                    driverName: staff || 'Hữu Phúc',
                    driverPhone: '0978.112.233'
                };
            } else {
                const style = document.getElementById('newBookingSpaStyle')?.value || 'Tắm sấy và Tạo hình tiêu chuẩn';
                const lvl = document.getElementById('newBookingSpaGroomerLevel')?.value || 'Senior Groomer';
                calculatedPrice = 350000;

                extraProps = {
                    styleType: style,
                    groomerLevel: lvl
                };
            }

            const preset = activeBookingPreset;
            const newBooking = Object.assign({
                id: newId,
                userId: (preset && preset.userId) ? preset.userId : 'USER-001',
                customerName: customer,
                phone: phone,
                petId: (preset && preset.petId) ? preset.petId : 'PET-001',
                petName: petName,
                petBreed: (preset && (preset.breed || preset.speciesBreed)) ? (preset.breed || preset.speciesBreed) : 'Thú cưng',
                petWeight: (preset && preset.weight) ? preset.weight : '5.0 kg',
                petAge: (preset && preset.age) ? preset.age : '2 tuổi',
                serviceCode: matchedSvc ? matchedSvc.code : 'SPA01',
                category: category,
                categoryName: categoryName,
                serviceName: serviceName,
                date: date,
                time: time,
                duration: calculatedDuration,
                staff: staff,
                branch: branch,
                price: calculatedPrice,
                addonPrice: 0,
                discount: 0,
                total: calculatedPrice,
                paymentStatus: 'Chưa thanh toán (Tại quầy)',
                status: 'pending',
                alertType: !staff ? 'urgent' : null,
                petAlert: petAlert || null,
                customerNote: note,
                timeline: initialTimeline
            }, extraProps);

            // Xác định chính xác các khóa ngoại liên kết CSDL Supabase
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            let customerDbId = currentMatchedCustomer?.id || null;
            let petDbId = currentMatchedPet?.id || null;

            // Lấy service_id từ option đang chọn hoặc servicesData
            const selectedSvcOpt = svcSelect?.selectedOptions?.[0];
            let serviceDbId = selectedSvcOpt?.dataset?.dbId || matchedSvc?.dbId || null;
            if (!serviceDbId && matchedSvc) serviceDbId = matchedSvc.dbId;

            // Lấy staff_id từ option KTV đang chọn
            const selectedStaffOpt = newBookingStaffSelect?.selectedOptions?.[0];
            let staffDbId = selectedStaffOpt?.dataset?.id || (liveStaffList && liveStaffList.find(s => s.full_name === staff)?.id) || null;

            // Nếu là khách hàng mới chưa có trong CSDL, tạo mới khách hàng & hồ sơ trong Supabase
            if (db && !customerDbId && phone) {
                try {
                    const { data: createdCust } = await db.from('customer').insert([{ phone_main: phone }]).select();
                    if (createdCust && createdCust[0]) {
                        customerDbId = createdCust[0].id;
                        await db.from('customer_profile').insert([{
                            customer_id: customerDbId,
                            full_name: customer || 'Khách hàng mới'
                        }]);
                    }
                } catch(errCust) {
                    console.warn('Lỗi ghi khách hàng mới Supabase:', errCust);
                }
            }

            // Nếu thú cưng chưa có ID trong CSDL, tạo mới pet_profile trong Supabase
            if (db && customerDbId && !petDbId && petName) {
                try {
                    const { data: createdPet } = await db.from('pet_profile').insert([{
                        customer_id: customerDbId,
                        pet_name: petName,
                        species: (category === 'Hotel' && (serviceName.includes('Mèo') || serviceName.includes('Cat'))) ? 'cat' : 'dog',
                        breed: (preset && preset.breed) ? preset.breed : 'Thú cưng',
                        allergy: petAlert || null
                    }]).select();
                    if (createdPet && createdPet[0]) {
                        petDbId = createdPet[0].id;
                    }
                } catch(errPet) {
                    console.warn('Lỗi ghi pet_profile Supabase:', errPet);
                }
            }

            // Ghi nhận trực tiếp vào Supabase appointment với đầy đủ liên kết ngoại
            if (db) {
                try {
                    const { data: insertedApp, error: appErr } = await db.from('appointment').insert([{
                        appointment_code: newId,
                        customer_id: customerDbId,
                        pet_id: petDbId,
                        service_id: serviceDbId,
                        staff_id: staffDbId,
                        appointment_date: date,
                        appointment_time: time.length === 5 ? time + ':00' : time,
                        appointment_status: 'PENDING',
                        payment_status: 'UNPAID',
                        total_price: calculatedPrice,
                        note: (petAlert ? `[Lưu ý: ${petAlert}] ` : '') + (note || '')
                    }]).select();

                    if (!appErr && insertedApp && insertedApp[0]) {
                        newBooking.dbId = insertedApp[0].id;
                    }
                } catch(err) {
                    console.warn('Lỗi ghi Supabase appointment:', err);
                }
            }

            resetCreateBookingForm();
            closeCreateModal();
            if (db) {
                await loadServicesData(true);
            } else {
                bookingsData.unshift(newBooking);
                persistData();
            }
            renderBookingsTable();
            renderUpcomingBar();
            updateKPIs();
            resetCreateBookingForm();
            showToast(`Đã lưu thành công lịch hẹn ${newId} (${categoryName})!`);
        }

        if (formCreate) {
            formCreate.addEventListener('submit', handleCreateBookingSubmit);
        }
        const btnSubmitCreate = document.getElementById('btnSubmitCreateBooking');
        if (btnSubmitCreate) {
            btnSubmitCreate.addEventListener('click', handleCreateBookingSubmit);
        }

        // Modal 2: Thêm / Sửa dịch vụ
        const modalService = document.getElementById('modalServiceForm');
        const btnOpenCreateService = document.getElementById('btnOpenCreateServiceModal');
        const btnCloseService = document.getElementById('btnCloseServiceForm');
        const btnCancelService = document.getElementById('btnCancelServiceForm');
        const formService = document.getElementById('formServiceItem');
        const btnAddStep = document.getElementById('btnAddStepToService');
        const inputNewStep = document.getElementById('newServiceStepInput');
        const sopPresetSelect = document.getElementById('serviceSopPresetSelect');

        const sopTemplates = {
            SOP_SPA_FULL: [
                'Khám ngoại quan da lông và tư vấn kiểu chăm sóc',
                'Cắt mài móng chân, vệ sinh tai mắt và cạo lông đệm bàn chân',
                'Vắt tuyến hôi và tắm nước ấm xà bông 1 khử mùi',
                'Tắm bọt thảo dược y tế trị liệu và ủ xả dưỡng lông',
                'Sấy tạo phồng chân lông và chải tơi lông chuyên sâu',
                'Tỉa phom vệ sinh bụng hậu môn và kiểm tra hoàn thiện',
                'Xịt tinh dầu dưỡng bóng lông và thắt nơ xinh'
            ],
            SOP_GROOMING_STYLE: [
                'Tư vấn phom dáng theo sở thích chủ nuôi và kiểm tra độ bết rối',
                'Tắm vệ sinh chuyên sâu và sấy phồng chân lông tạo độ tơi',
                'Cắt định hình phom thân và 4 chân cân đối',
                'Điêu khắc tỉa chi tiết khuôn mặt, tai và chóp đuôi',
                'Kiểm tra cân đối toàn thân và khử trùng dụng cụ kéo',
                'Chụp ảnh thành phẩm xinh xắn và xuất phiếu bàn giao'
            ],
            SOP_PET_HOTEL: [
                'Check-in phòng riêng, kiểm tra thể trạng và kết nối camera IP',
                'Khẩu phần ăn sáng dinh dưỡng và bổ sung nước lọc tinh khiết',
                'Thả chơi sân cỏ tương tác vận động và giao lưu',
                'Dọn vệ sinh phòng chuồng, thay khay cát và khử khuẩn UV',
                'Khẩu phần ăn tối, kiểm tra thân nhiệt và chải lông massage',
                'Gửi clip 4K và nhật ký sinh hoạt của bé cho chủ nuôi'
            ],
            SOP_PET_TAXI: [
                'Khảo sát lộ trình di chuyển và khử khuẩn lồng chuyên dụng',
                'Đón bé tận nhà, kiểm tra tình trạng sức khỏe và đối chiếu phụ kiện',
                'Di chuyển cabin máy lạnh êm ái, theo dõi tâm lý bé suốt tuyến',
                'Bàn giao bé an toàn tại điểm đến cho chủ nuôi hoặc bác sĩ'
            ]
        };

        if (sopPresetSelect) {
            sopPresetSelect.addEventListener('change', (e) => {
                const key = e.target.value;
                if (sopTemplates[key]) {
                    currentEditingServiceSteps = [...sopTemplates[key]];
                    renderServiceStepsEditor();
                }
            });
        }

        if (btnAddStep) {
            btnAddStep.addEventListener('click', () => {
                if (inputNewStep && inputNewStep.value.trim()) {
                    currentEditingServiceSteps.push(inputNewStep.value.trim());
                    inputNewStep.value = '';
                    renderServiceStepsEditor();
                }
            });
        }

        if (inputNewStep) {
            inputNewStep.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (btnAddStep) btnAddStep.click();
                }
            });
        }

        if (btnOpenCreateService) {
            btnOpenCreateService.addEventListener('click', () => {
                document.getElementById('serviceFormModalTitle').textContent = 'Thêm dịch vụ mới';
                document.getElementById('editServiceCodeHidden').value = '';
                formService.reset();
                if (sopPresetSelect) sopPresetSelect.value = 'CUSTOM';
                const commissionInput = document.getElementById('formServiceCommission');
                if (commissionInput) commissionInput.value = 15;
                currentEditingServiceSteps = [
                    'Tiếp nhận bé và kiểm tra da lông sơ bộ',
                    'Thực hiện liệu trình dịch vụ chuyên nghiệp',
                    'Vệ sinh tai móng và khử khuẩn',
                    'Chụp ảnh hoàn tất và bàn giao cho chủ'
                ];
                renderServiceStepsEditor();
                modalService.classList.add('active');
            });
        }

        const closeServiceModal = () => {
            if (modalService) modalService.classList.remove('active');
        };
        if (btnCloseService) btnCloseService.addEventListener('click', closeServiceModal);
        if (btnCancelService) btnCancelService.addEventListener('click', closeServiceModal);

        if (formService) {
            formService.addEventListener('submit', async (e) => {
                e.preventDefault();
                const hiddenCode = document.getElementById('editServiceCodeHidden').value;
                const id = document.getElementById('formServiceId').value;
                const group = document.getElementById('formServiceGroup').value.toLowerCase();
                const name = document.getElementById('formServiceName').value;
                const petType = document.getElementById('formServicePetType').value;
                const duration = document.getElementById('formServiceDuration').value;
                const desc = document.getElementById('formServiceDesc').value;
                const staffLevel = document.getElementById('formServiceStaffLevel').value;
                const status = document.getElementById('formServiceStatus').value;
                const commission = parseInt(document.getElementById('formServiceCommission')?.value || '15');
                const pUnder5 = document.getElementById('formPriceUnder5').value || '150.000';
                const p5To10 = document.getElementById('formPrice5To10').value || '200.000';
                const p10To20 = document.getElementById('formPrice10To20').value || '250.000';
                const pOver20 = document.getElementById('formPriceOver20').value || '300.000';
                const parseVnd = (str) => parseInt(String(str).replace(/[^\d]/g, ''), 10) || 120000;

                const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

                if (hiddenCode) {
                    // Chỉnh sửa dịch vụ
                    const existing = servicesData.find(s => s.code === hiddenCode);
                    if (existing) {
                        existing.name = name;
                        existing.petType = petType;
                        existing.duration = duration;
                        existing.desc = desc;
                        existing.description = desc;
                        existing.staffLevel = staffLevel;
                        existing.status = status;
                        existing.commission = commission;
                        existing.priceFrom = pUnder5;
                        existing.prices = { under5: pUnder5, to10: p5To10, to20: p10To20, over20: pOver20 };
                        existing.steps = [...currentEditingServiceSteps];

                        if (db && existing.dbId) {
                            try {
                                await db.from('service').update({
                                    service_name: name,
                                    description: desc,
                                    estimated_duration: parseInt(duration) || 60,
                                    status: status === 'Đang phục vụ' ? 'ACTIVE' : 'INACTIVE',
                                    pet_type: petType,
                                    checklist: currentEditingServiceSteps,
                                    groomer_level: staffLevel
                                }).eq('id', existing.dbId);
                            } catch(err) {
                                console.warn('Lỗi cập nhật Supabase service:', err);
                            }
                        }
                    }
                } else {
                    // Thêm dịch vụ mới
                    const newSvc = {
                        code: id,
                        id: id,
                        group: group,
                        category: group,
                        categoryName: group === 'spa' ? 'Spa và Grooming' : (group === 'hotel' ? 'Pet Hotel' : 'Pet Taxi'),
                        name: name,
                        petType: petType,
                        duration: duration,
                        rating: 5.0,
                        reviews: 0,
                        commission: commission,
                        priceFrom: pUnder5,
                        prices: { under5: pUnder5, to10: p5To10, to20: p10To20, over20: pOver20 },
                        desc: desc,
                        description: desc,
                        staffLevel: staffLevel,
                        status: status,
                        steps: [...currentEditingServiceSteps],
                        checklist: [...currentEditingServiceSteps],
                        image: '/assets/images/services/spa/process/spa01.webp'
                    };

                    if (db) {
                        try {
                            const catCode = group === 'hotel' ? 'PET_HOTEL' : (group === 'taxi' ? 'PET_TAXI' : 'SPA_GROOMING');
                            const { data: insertedSvc, error: svcErr } = await db.from('service').insert([{
                                service_code: id,
                                service_name: name,
                                service_category: catCode,
                                description: desc,
                                estimated_duration: parseInt(duration) || 60,
                                status: status === 'Đang phục vụ' ? 'ACTIVE' : 'INACTIVE',
                                pet_type: petType,
                                checklist: currentEditingServiceSteps,
                                groomer_level: staffLevel,
                                thumbnail_url: '/assets/images/services/spa/process/spa01.webp'
                            }]).select();

                            if (!svcErr && insertedSvc && insertedSvc[0]) {
                                const svcDbId = insertedSvc[0].id;
                                newSvc.dbId = svcDbId;
                                await db.from('service_price_matrix').insert([
                                    { service_id: svcDbId, weight_from: 0, weight_to: 5, unit_price: parseVnd(pUnder5), status: 'ACTIVE' },
                                    { service_id: svcDbId, weight_from: 5, weight_to: 10, unit_price: parseVnd(p5To10), status: 'ACTIVE' },
                                    { service_id: svcDbId, weight_from: 10, weight_to: 20, unit_price: parseVnd(p10To20), status: 'ACTIVE' },
                                    { service_id: svcDbId, weight_from: 20, weight_to: 99, unit_price: parseVnd(pOver20), status: 'ACTIVE' }
                                ]);
                            }
                        } catch(err) {
                            console.warn('Lỗi ghi Supabase service & price matrix:', err);
                        }
                    }

                    servicesData.unshift(newSvc);
                }

                persistData();
                closeServiceModal();
                renderCatalogTable();
                showToast(`Đã lưu thông tin dịch vụ ${name} thành công!`);
            });
        }

        // Modal 3: Hủy lịch hẹn
        const modalCancel = document.getElementById('modalCancelBooking');
        const btnCloseCancel = document.getElementById('btnCloseCancelBooking');
        const btnDismissCancel = document.getElementById('btnDismissCancelBooking');
        const btnConfirmCancel = document.getElementById('btnConfirmCancelBooking');

        const closeCancelModal = () => {
            if (modalCancel) modalCancel.classList.remove('active');
        };
        if (btnCloseCancel) btnCloseCancel.addEventListener('click', closeCancelModal);
        if (btnDismissCancel) btnDismissCancel.addEventListener('click', closeCancelModal);

        if (btnConfirmCancel) {
            btnConfirmCancel.addEventListener('click', async () => {
                const bkgId = btnConfirmCancel.getAttribute('data-booking-id');
                const reasonSelect = document.getElementById('cancelBookingReasonSelect').value;
                const reasonDetail = document.getElementById('cancelBookingReasonDetail').value;
                const booking = bookingsData.find(b => b.id === bkgId);
                if (booking) {
                    booking.status = 'cancelled';
                    booking.alertType = null;
                    booking.customerNote = `[Đã hủy]: ${reasonSelect} - ${reasonDetail}`;
                    booking.timeline.push({
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        title: 'Đã hủy ca',
                        desc: `Lý do: ${reasonSelect} (${reasonDetail})`,
                        done: true,
                        staff: 'Admin'
                    });

                    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (db && booking.dbId) {
                        try {
                            await db.from('appointment').update({
                                appointment_status: 'CANCELLED',
                                note: booking.customerNote
                            }).eq('id', booking.dbId);
                        } catch(err) {
                            console.warn('Lỗi cập nhật Supabase khi hủy ca:', err);
                        }
                    }
                }
                persistData();
                closeCancelModal();
                renderBookingsTable();
                renderUpcomingBar();
                updateKPIs();
                if (window.location.hash === '#tab-service-detail') {
                    renderBookingDetail(bkgId);
                }
            });
        }

        // Upload và quản lý ảnh trong form thêm bước Care-Log
        const btnTriggerUpload = document.getElementById('btnTriggerCarelogImageUpload');
        const fileInput = document.getElementById('carelogImageFileInput');
        const previewStrip = document.getElementById('carelogImagePreviewStrip');
        const countText = document.getElementById('carelogImageCountText');

        function renderCarelogPreviewStrip() {
            if (!previewStrip || !countText) return;
            if (currentCarelogStepImages.length === 0) {
                previewStrip.style.display = 'none';
                previewStrip.innerHTML = '';
                countText.textContent = '0 ảnh đã chọn';
                return;
            }
            previewStrip.style.display = 'flex';
            countText.textContent = `${currentCarelogStepImages.length} ảnh đã chọn`;
            previewStrip.innerHTML = currentCarelogStepImages.map((src, i) => `
                <div class="carelog-preview-thumb-wrap">
                    <img src="${src}" class="carelog-preview-thumb" alt="Ảnh đính kèm">
                    <button type="button" class="carelog-thumb-del-btn" data-img-index="${i}">✕</button>
                </div>
            `).join('');

            previewStrip.querySelectorAll('.carelog-thumb-del-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const i = parseInt(btn.getAttribute('data-img-index'));
                    currentCarelogStepImages.splice(i, 1);
                    renderCarelogPreviewStrip();
                });
            });
        }

        if (btnTriggerUpload && fileInput) {
            btnTriggerUpload.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        currentCarelogStepImages.push(evt.target.result);
                        renderCarelogPreviewStrip();
                    };
                    reader.readAsDataURL(file);
                });
                fileInput.value = '';
            });
        }

        // Thêm bước Care-Log nhanh trong chi tiết
        const btnSubmitCarelog = document.getElementById('btnSubmitCarelogStep');
        if (btnSubmitCarelog) {
            btnSubmitCarelog.addEventListener('click', async () => {
                const titleInput = document.getElementById('newLogStepTitle');
                const staffInput = document.getElementById('newLogStepStaff');
                const noteInput = document.getElementById('newLogStepNote');

                if (!titleInput.value.trim()) {
                    showToast('Vui lòng nhập tên bước chăm sóc!', 'warning');
                    return;
                }

                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (booking) {
                    const stepItem = {
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        title: titleInput.value.trim(),
                        desc: noteInput.value.trim() || 'Đã hoàn thành bước chăm sóc',
                        done: true,
                        staff: staffInput.value.trim() || booking.staff || 'KTV',
                        images: [...currentCarelogStepImages]
                    };

                    booking.timeline = booking.timeline || [];
                    booking.timeline.push(stepItem);

                    // Ghi nhận trực tiếp vào Supabase care_log
                    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (db && booking.dbId) {
                        try {
                            const { data: insertedLog, error: logErr } = await db.from('care_log').insert([{
                                appointment_id: booking.dbId,
                                description: `${titleInput.value.trim()}: ${noteInput.value.trim()}`,
                                health_status: 'NORMAL',
                                recorded_at: new Date().toISOString()
                            }]).select();

                            if (!logErr && insertedLog && insertedLog[0] && currentCarelogStepImages.length > 0) {
                                const logDbId = insertedLog[0].id;
                                const mediaRows = currentCarelogStepImages.map(img => ({
                                    care_log_id: logDbId,
                                    media_type: 'IMAGE',
                                    media_url: img,
                                    file_name: 'carelog_photo.jpg'
                                }));
                                await db.from('care_log_media').insert(mediaRows);
                            }
                        } catch(err) {
                            console.warn('Lỗi ghi Supabase care_log:', err);
                        }
                    }

                    persistData();
                    renderBookingDetail(booking.id);
                    titleInput.value = '';
                    staffInput.value = '';
                    noteInput.value = '';
                    currentCarelogStepImages = [];
                    renderCarelogPreviewStrip();
                    showToast('Đã thêm bước chăm sóc mới vào nhật ký!');
                }
            });
        }

        // Modal 6: Xem ảnh phóng to (Lightbox)
        const modalPhoto = document.getElementById('modalCarelogPhotoPreview');
        const btnClosePhoto = document.getElementById('btnClosePhotoPreview');
        if (btnClosePhoto && modalPhoto) {
            btnClosePhoto.addEventListener('click', () => modalPhoto.classList.remove('active'));
            modalPhoto.addEventListener('click', (e) => {
                if (e.target === modalPhoto) modalPhoto.classList.remove('active');
            });
        }

        // Modal 6B: Chỉnh sửa bước nhật ký Care-Log
        const modalEditCarelog = document.getElementById('modalEditCarelogStep');
        const formEditCarelog = document.getElementById('formEditCarelogStep');
        const btnCloseEditCarelog = document.getElementById('btnCloseEditCarelogStep');
        const btnCancelEditCarelog = document.getElementById('btnCancelEditCarelogStep');
        const btnDeleteCarelog = document.getElementById('btnDeleteCarelogStep');
        const btnAddCarelogPhoto = document.getElementById('btnEditCarelogAddPhoto');
        const editCarelogFileInput = document.getElementById('editCarelogFileInput');

        const closeEditCarelogModal = () => {
            if (modalEditCarelog) modalEditCarelog.classList.remove('active');
        };

        if (btnCloseEditCarelog) btnCloseEditCarelog.addEventListener('click', closeEditCarelogModal);
        if (btnCancelEditCarelog) btnCancelEditCarelog.addEventListener('click', closeEditCarelogModal);
        if (modalEditCarelog) modalEditCarelog.addEventListener('click', (e) => {
            if (e.target === modalEditCarelog) closeEditCarelogModal();
        });

        if (btnAddCarelogPhoto && editCarelogFileInput) {
            btnAddCarelogPhoto.onclick = () => editCarelogFileInput.click();
            editCarelogFileInput.onchange = (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        editCarelogStepPhotosTemp.push(evt.target.result);
                        renderEditCarelogPhotosPreview();
                    };
                    reader.readAsDataURL(file);
                });
                editCarelogFileInput.value = '';
            };
        }

        if (btnDeleteCarelog) {
            btnDeleteCarelog.addEventListener('click', () => {
                const idxHidden = document.getElementById('editCarelogStepIndexHidden');
                const idx = parseInt(idxHidden ? idxHidden.value : '-1', 10);
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking || idx < 0 || !booking.timeline || !booking.timeline[idx]) return;

                const stepTitle = booking.timeline[idx].title;
                showServiceConfirmModal({
                    title: 'Xóa bước nhật ký',
                    message: `Bạn có chắc chắn muốn xóa bước nhật ký "${stepTitle}"?`,
                    acceptText: 'Xác nhận xóa',
                    onAccept: () => {
                        booking.timeline.splice(idx, 1);
                        persistData();
                        closeEditCarelogModal();
                        renderBookingDetail(booking.id);
                        showToast(`Đã xóa bước nhật ký "${stepTitle}"!`);
                    }
                });
            });
        }

        if (formEditCarelog) {
            formEditCarelog.addEventListener('submit', (e) => {
                e.preventDefault();
                const idxHidden = document.getElementById('editCarelogStepIndexHidden');
                const idx = parseInt(idxHidden ? idxHidden.value : '-1', 10);
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking || idx < 0 || !booking.timeline || !booking.timeline[idx]) return;

                const titleInput = document.getElementById('editCarelogStepTitle');
                const staffInput = document.getElementById('editCarelogStepStaff');
                const timeInput = document.getElementById('editCarelogStepTime');
                const descInput = document.getElementById('editCarelogStepDesc');
                const doneCheck = document.getElementById('editCarelogStepDone');

                booking.timeline[idx] = {
                    title: titleInput ? titleInput.value.trim() : booking.timeline[idx].title,
                    staff: staffInput ? staffInput.value.trim() : (booking.timeline[idx].staff || booking.staff || 'KTV'),
                    time: timeInput ? timeInput.value.trim() : booking.timeline[idx].time,
                    desc: descInput ? descInput.value.trim() : '',
                    done: doneCheck ? doneCheck.checked : true,
                    images: [...editCarelogStepPhotosTemp]
                };

                persistData();
                closeEditCarelogModal();
                renderBookingDetail(booking.id);
                showToast('Đã lưu cập nhật bước nhật ký chăm sóc!');
            });
        }

        // Nút chia sẻ link nhật ký cho khách
        const btnShareCarelog = document.getElementById('btnShareCarelogLink');
        if (btnShareCarelog) {
            btnShareCarelog.addEventListener('click', () => {
                const url = window.location.origin + `/pages/carelog.html?booking=${selectedBookingId}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => {
                        showToast('Đã sao chép liên kết Nhật ký chăm sóc thời gian thực!');
                    }).catch(() => {
                        showToast('Đã tạo liên kết xem nhật ký chăm sóc!');
                    });
                } else {
                    showToast('Đã tạo liên kết xem nhật ký chăm sóc!');
                }
            });
        }

        // Modal 4: Phản hồi đánh giá
        const modalReply = document.getElementById('modalReplyReview');
        const btnCloseReply = document.getElementById('btnCloseReplyReview');
        const btnCancelReply = document.getElementById('btnCancelReplyReview');
        const formReply = document.getElementById('formReplyReview');

        const closeReplyModal = () => {
            if (modalReply) modalReply.classList.remove('active');
        };

        if (btnCloseReply) btnCloseReply.addEventListener('click', closeReplyModal);
        if (btnCancelReply) btnCancelReply.addEventListener('click', closeReplyModal);

        const replyPresetSelect = document.getElementById('replyPresetSelect');
        const replyContentText = document.getElementById('replyContentText');
        const btnEscalate = document.getElementById('btnEscalateToComplaint');

        if (replyPresetSelect && replyContentText) {
            replyPresetSelect.addEventListener('change', (e) => {
                const key = e.target.value;
                if (!currentReplyingReview) return;
                const r = currentReplyingReview;
                if (key === 'PRESET_THANK_5') {
                    replyContentText.value = `Dạ PawPal xin chân thành cảm ơn Anh/Chị ${r.customerName} đã tin tưởng gửi gắm bé ${r.petName}! Toàn thể đội ngũ KTV và PawPal rất hạnh phúc khi nhận được sự hài lòng của gia đình. Chúc bé luôn xinh đẹp, khỏe mạnh và hẹn gặp lại Anh/Chị ở ca chăm sóc tiếp theo ạ!`;
                } else if (key === 'PRESET_ACK_4') {
                    replyContentText.value = `Dạ PawPal cảm ơn Anh/Chị ${r.customerName} đã dành thời gian đánh giá trải nghiệm của bé ${r.petName}. PawPal xin ghi nhận góp ý quý giá này để không ngừng cải thiện tay nghề và chất lượng dịch vụ ngày một hoàn thiện, chu đáo hơn nữa ạ!`;
                } else if (key === 'PRESET_APOLOGY_LOW') {
                    replyContentText.value = `Dạ PawPal thành thật xin lỗi Anh/Chị ${r.customerName} vì trải nghiệm chưa trọn vẹn của bé ${r.petName} trong ca dịch vụ vừa qua. Quản lý cơ sở mong muốn được liên hệ trực tiếp qua số ${r.phone} để lắng nghe chi tiết và có phương án bảo hành, chăm sóc lại miễn phí chu đáo nhất cho bé ạ!`;
                } else if (key === 'PRESET_EXPLAIN') {
                    replyContentText.value = `Dạ PawPal xin chào Anh/Chị ${r.customerName}! PawPal xin phép được chia sẻ thêm về quy trình kỹ thuật chuyên môn của ca dịch vụ bé ${r.petName} để gia đình an tâm. Đội ngũ chuyên gia PawPal luôn sẵn sàng giải đáp và đồng hành cùng sức khỏe, sắc đẹp của bé yêu ạ!`;
                }
            });
        }

        if (btnEscalate) {
            btnEscalate.addEventListener('click', () => {
                const reviewId = document.getElementById('replyReviewIdHidden').value;
                const review = reviewsData.find(r => r.id === reviewId);
                if (!review) return;

                review.status = 'escalated';
                persistData();
                closeReplyModal();
                renderReviewsTable();
                updateReviewKPIs();

                escalateBookingToComplaint(
                    review.bookingId,
                    `Phản ánh đánh giá ${review.rating} sao (${review.serviceName || 'Dịch vụ'})`,
                    `Khách hàng ${review.customerName} đánh giá ${review.rating} sao: "${review.comment}". KTV phụ trách: ${review.staff || 'Chưa rõ'}.`
                );
            });
        }

        if (formReply) {
            formReply.addEventListener('submit', async (e) => {
                e.preventDefault();
                const reviewId = document.getElementById('replyReviewIdHidden').value;
                const replyText = document.getElementById('replyContentText').value.trim();
                const voucherVal = document.getElementById('replyVoucherSelect').value;

                const review = reviewsData.find(r => r.id === reviewId);
                if (review) {
                    review.status = 'replied';
                    review.replyText = replyText;
                    review.replyDate = new Date().toLocaleDateString('vi-VN');

                    if (voucherVal === 'VOUCHER_50K') review.voucherSent = 'Voucher 50.000 đ';
                    else if (voucherVal === 'VOUCHER_100K') review.voucherSent = 'Voucher 100.000 đ';
                    else if (voucherVal === 'VOUCHER_FREE_BATH') review.voucherSent = '01 Lượt Tắm Miễn Phí';
                    else review.voucherSent = null;

                    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (db && review.dbId) {
                        try {
                            await db.from('review').update({
                                shop_reply: replyText
                            }).eq('id', review.dbId);
                        } catch(err) {
                            console.warn('Lỗi cập nhật phản hồi Supabase review:', err);
                        }
                    }

                    persistData();
                    closeReplyModal();
                    renderReviewsTable();
                    updateReviewKPIs();
                    showToast('Đã lưu và gửi phản hồi đánh giá cho khách hàng!');
                }
            });
        }

        // Modal 5: Thêm phụ phí và Dịch vụ phát sinh (Zero-Dispute)
        const modalAddSurcharge = document.getElementById('modalAddSurcharge');
        const btnOpenAddSurcharge = document.getElementById('btnOpenAddSurchargeModal');
        const btnCloseAddSurcharge = document.getElementById('btnCloseAddSurcharge');
        const btnCancelAddSurcharge = document.getElementById('btnCancelAddSurcharge');
        const formAddSurcharge = document.getElementById('formAddSurcharge');
        const surchargePresetSelect = document.getElementById('surchargePresetSelect');
        const surchargeNameInput = document.getElementById('surchargeNameInput');
        const surchargeAmountInput = document.getElementById('surchargeAmountInput');
        const surchargeCommissionSelect = document.getElementById('surchargeCommissionSelect');
        const surchargeCommissionEarned = document.getElementById('surchargeCommissionEarned');
        const surchargeReasonInput = document.getElementById('surchargeReasonInput');
        const surchargeConsentSelect = document.getElementById('surchargeConsentSelect');
        const surchargeConsentNote = document.getElementById('surchargeConsentNote');
        const surchargeMetaEl = document.getElementById('surchargeBookingMeta');
        const btnAddSurchargePhoto = document.getElementById('btnAddSurchargePhotoBtn');
        const surchargeFileInput = document.getElementById('surchargeProofFileInput');

        function updateSurchargeCommissionDisplay() {
            const amount = parseInt(surchargeAmountInput ? surchargeAmountInput.value : '0', 10) || 0;
            const rate = parseInt(surchargeCommissionSelect ? surchargeCommissionSelect.value : '15', 10) || 0;
            const earned = Math.round(amount * (rate / 100));
            if (surchargeCommissionEarned) {
                surchargeCommissionEarned.textContent = `+${formatCurrency(earned)}`;
            }
        }

        if (surchargeAmountInput) {
            surchargeAmountInput.addEventListener('input', updateSurchargeCommissionDisplay);
        }
        if (surchargeCommissionSelect) {
            surchargeCommissionSelect.addEventListener('change', updateSurchargeCommissionDisplay);
        }

        if (btnOpenAddSurcharge) {
            btnOpenAddSurcharge.addEventListener('click', () => {
                if (formAddSurcharge) formAddSurcharge.reset();
                if (surchargePresetSelect) surchargePresetSelect.value = 'CUSTOM';
                if (surchargeCommissionSelect) surchargeCommissionSelect.value = '15';
                updateSurchargeCommissionDisplay();
                surchargeProofImagesTemp = [];
                renderSurchargeProofPreviewList();

                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (booking && surchargeMetaEl) {
                    surchargeMetaEl.textContent = `Mã ca: ${booking.id} | Bé: ${booking.petName} (${booking.petBreed}) | KTV phụ trách: ${booking.staff || 'Chưa phân công'}`;
                }

                if (modalAddSurcharge) modalAddSurcharge.classList.add('active');
            });
        }

        if (btnAddSurchargePhoto && surchargeFileInput) {
            btnAddSurchargePhoto.onclick = () => surchargeFileInput.click();
            surchargeFileInput.onchange = (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        surchargeProofImagesTemp.push(evt.target.result);
                        renderSurchargeProofPreviewList();
                    };
                    reader.readAsDataURL(file);
                });
                surchargeFileInput.value = '';
            };
        }

        const closeAddSurchargeModal = () => {
            if (modalAddSurcharge) modalAddSurcharge.classList.remove('active');
        };

        if (btnCloseAddSurcharge) btnCloseAddSurcharge.addEventListener('click', closeAddSurchargeModal);
        if (btnCancelAddSurcharge) btnCancelAddSurcharge.addEventListener('click', closeAddSurchargeModal);

        if (surchargePresetSelect) {
            surchargePresetSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val && val !== 'CUSTOM') {
                    const [presetName, presetPrice] = val.split('|');
                    if (surchargeNameInput) surchargeNameInput.value = presetName || '';
                    if (surchargeAmountInput) surchargeAmountInput.value = presetPrice || '';
                    updateSurchargeCommissionDisplay();
                }
            });
        }

        if (formAddSurcharge) {
            formAddSurcharge.addEventListener('submit', (e) => {
                e.preventDefault();
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking) return;

                const name = surchargeNameInput.value.trim();
                const amount = parseInt(surchargeAmountInput.value) || 0;
                const commissionRate = parseInt(surchargeCommissionSelect ? surchargeCommissionSelect.value : '15', 10) || 0;
                const commissionAmount = Math.round(amount * (commissionRate / 100));
                const reason = surchargeReasonInput.value.trim();
                const consent = surchargeConsentSelect.value;
                const noteVal = surchargeConsentNote ? surchargeConsentNote.value.trim() : '';
                const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                booking.addons = booking.addons || [];
                const newAddon = {
                    id: 'ADD-' + (1000 + booking.addons.length + 1),
                    name: name,
                    amount: amount,
                    commissionRate: commissionRate,
                    commissionAmount: commissionAmount,
                    reason: reason,
                    consent: consent,
                    consentNote: noteVal,
                    images: [...surchargeProofImagesTemp],
                    time: currentTime,
                    staff: booking.staff || 'KTV'
                };
                booking.addons.push(newAddon);
                booking.addonPrice = booking.addons.reduce((sum, a) => sum + Number(a.amount || 0), 0);
                const currentAccompanyingTotal = (booking.accompanyingServices || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                booking.total = Math.max(0, Number(booking.price || 0) + currentAccompanyingTotal + booking.addonPrice - Number(booking.discount || 0));

                // Tự động ghi nhật ký vào Timeline Care-Log kèm bằng chứng và hoa hồng KTV
                booking.timeline = booking.timeline || [];
                booking.timeline.push({
                    time: currentTime,
                    title: `Phát sinh: ${name} (+${formatCurrency(amount)})`,
                    desc: `[${consent}${noteVal ? ' - ' + noteVal : ''}] ${reason}. Hoa hồng KTV (${booking.staff || 'KTV'}): ${commissionRate}% (~${formatCurrency(commissionAmount)}).`,
                    done: true,
                    staff: booking.staff || 'KTV',
                    images: [...surchargeProofImagesTemp]
                });

                persistData();
                closeAddSurchargeModal();
                renderBookingDetail(booking.id);
                renderBookingsTable();

                const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (db && booking.dbId) {
                    try {
                        db.from('appointment').update({ total_price: booking.total }).eq('id', booking.dbId);
                    } catch(err) {}
                }

                showToast(`Đã thêm phụ phí phát sinh "${name}" (+${formatCurrency(amount)}, Hoa hồng KTV: +${formatCurrency(commissionAmount)})!`);
            });
        }

        // Modal 7: Thêm Dịch vụ đi cùng vào ca
        const modalAddAccompanying = document.getElementById('modalAddAccompanyingService');
        const btnOpenAddAccompanying = document.getElementById('btnOpenAddAccompanyingServiceModal');
        const btnCloseAddAccompanying = document.getElementById('btnCloseAddAccompanying');
        const btnCancelAddAccompanying = document.getElementById('btnCancelAddAccompanying');
        const formAddAccompanying = document.getElementById('formAddAccompanyingService');
        const accCatSelect = document.getElementById('accompanyingCategorySelect');
        const accItemSelect = document.getElementById('accompanyingServiceItemSelect');
        const accPriceInput = document.getElementById('accompanyingPriceInput');
        const accStaffInput = document.getElementById('accompanyingStaffInput');
        const accNoteInput = document.getElementById('accompanyingNoteInput');

        function populateAccompanyingServicesDropdown(filterGroup) {
            if (!accItemSelect) return;
            let list = servicesData;
            if (filterGroup && filterGroup !== 'ALL') {
                list = list.filter(s => s.group === filterGroup);
            }
            accItemSelect.innerHTML = list.map(s => `
                <option value="${s.code}" data-price="${s.priceFrom.replace(/\./g, '')}">${s.name} (${s.code} - ${s.priceFrom} đ)</option>
            `).join('');

            if (list.length > 0 && accPriceInput) {
                const initialPrice = list[0].priceFrom.replace(/\./g, '');
                accPriceInput.value = initialPrice;
            }
        }

        if (accCatSelect) {
            accCatSelect.addEventListener('change', (e) => {
                populateAccompanyingServicesDropdown(e.target.value);
            });
        }

        if (accItemSelect) {
            accItemSelect.addEventListener('change', (e) => {
                const selectedOpt = accItemSelect.options[accItemSelect.selectedIndex];
                if (selectedOpt && accPriceInput) {
                    accPriceInput.value = selectedOpt.getAttribute('data-price') || '200000';
                }
            });
        }

        if (btnOpenAddAccompanying) {
            btnOpenAddAccompanying.addEventListener('click', () => {
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (formAddAccompanying) formAddAccompanying.reset();
                if (accCatSelect) accCatSelect.value = 'ALL';
                populateAccompanyingServicesDropdown('ALL');
                if (accStaffInput && booking) accStaffInput.value = booking.staff || 'Hoàng Nam';
                if (modalAddAccompanying) modalAddAccompanying.classList.add('active');
            });
        }

        const closeAddAccompanyingModal = () => {
            if (modalAddAccompanying) modalAddAccompanying.classList.remove('active');
        };

        if (btnCloseAddAccompanying) btnCloseAddAccompanying.addEventListener('click', closeAddAccompanyingModal);
        if (btnCancelAddAccompanying) btnCancelAddAccompanying.addEventListener('click', closeAddAccompanyingModal);

        if (formAddAccompanying) {
            formAddAccompanying.addEventListener('submit', (e) => {
                e.preventDefault();
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking) return;

                const svcCode = accItemSelect.value;
                const matchedSvc = servicesData.find(s => s.code === svcCode);
                const price = parseInt(accPriceInput.value) || 200000;
                const staff = accStaffInput.value.trim() || booking.staff || 'KTV';
                const note = accNoteInput.value.trim();

                booking.accompanyingServices = booking.accompanyingServices || [];
                const newAcc = {
                    id: 'ACC-' + Date.now(),
                    code: svcCode,
                    name: matchedSvc ? matchedSvc.name : 'Dịch vụ đi cùng',
                    price: price,
                    staff: staff,
                    note: note
                };
                booking.accompanyingServices.push(newAcc);

                // Tự động ghép thêm các bước của dịch vụ đi cùng vào Care-Log Timeline
                booking.timeline = booking.timeline || [];
                if (matchedSvc && matchedSvc.steps && matchedSvc.steps.length > 0) {
                    matchedSvc.steps.forEach(st => {
                        booking.timeline.push({
                            time: '--:--',
                            title: `[${matchedSvc.name}] ${st}`,
                            desc: note || 'Bước theo gói dịch vụ đi cùng đã thêm',
                            done: false,
                            staff: staff,
                            images: []
                        });
                    });
                } else {
                    booking.timeline.push({
                        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        title: `Bổ sung: ${newAcc.name}`,
                        desc: note || 'Đã thêm gói dịch vụ đi cùng vào ca',
                        done: false,
                        staff: staff,
                        images: []
                    });
                }

                const accompanyingTotal = booking.accompanyingServices.reduce((sum, a) => sum + Number(a.price || 0), 0);
                booking.addonPrice = (booking.addons || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
                booking.total = Math.max(0, Number(booking.price || 0) + accompanyingTotal + booking.addonPrice - Number(booking.discount || 0));

                persistData();
                closeAddAccompanyingModal();
                renderBookingDetail(booking.id);
                renderBookingsTable();

                const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (db && booking.dbId) {
                    try {
                        db.from('appointment').update({ total_price: booking.total }).eq('id', booking.dbId);
                    } catch(err) {}
                }
            });
        }

        // Modal 8: Sửa thông tin tiếp nhận tại quầy
        const modalIntake = document.getElementById('modalEditIntakeInfo');
        const btnCloseIntake = document.getElementById('btnCloseEditIntakeInfo');
        const btnCancelIntake = document.getElementById('btnCancelEditIntakeInfo');
        const formIntake = document.getElementById('formEditIntakeInfo');

        const closeIntakeModal = () => {
            if (modalIntake) modalIntake.classList.remove('active');
        };

        if (btnCloseIntake) btnCloseIntake.addEventListener('click', closeIntakeModal);
        if (btnCancelIntake) btnCancelIntake.addEventListener('click', closeIntakeModal);

        if (formIntake) {
            formIntake.addEventListener('submit', async (e) => {
                e.preventDefault();
                const booking = bookingsData.find(b => b.id === selectedBookingId);
                if (!booking) return;

                const intakeWeightInput = document.getElementById('intakePetWeightInput');
                const staffSelect = document.getElementById('intakeStaffSelect');
                const intakeBelongingsInput = document.getElementById('intakeBelongingsInput');
                const woundNoteInput = document.getElementById('intakeExistingWoundNote');

                const checkSkinNorm = document.getElementById('checkSkinNormal');
                const checkSkinFlea = document.getElementById('checkSkinFleas');
                const checkSkinFung = document.getElementById('checkSkinFungus');
                const checkSkinMatt = document.getElementById('checkSkinMatted');

                const checkEyesNorm = document.getElementById('checkEyesEarsNormal');
                const checkEyesDisc = document.getElementById('checkEyesDischarge');
                const checkEarsInf = document.getElementById('checkEarsInfection');
                const checkNoseRun = document.getElementById('checkNoseRunny');

                const checkWoundNo = document.getElementById('checkWoundNone');

                const actualWeightNum = parseFloat(intakeWeightInput ? intakeWeightInput.value : booking.petWeight) || 4.0;
                const actualWeightStr = actualWeightNum.toFixed(1) + ' kg';
                const staffVal = (staffSelect && staffSelect.value) ? staffSelect.value : (booking.staff || 'Ngọc Anh');

                // Da lông
                const skinParts = [];
                if (checkSkinNorm && checkSkinNorm.checked) skinParts.push('Sạch sẽ');
                if (checkSkinFlea && checkSkinFlea.checked) skinParts.push('Có ve rận/bọ chét');
                if (checkSkinFung && checkSkinFung.checked) skinParts.push('Có mảng nấm/viêm đỏ');
                if (checkSkinMatt && checkSkinMatt.checked) skinParts.push('Lông bết rối nhiều');

                // Mắt tai mũi
                const eyesParts = [];
                if (checkEyesNorm && checkEyesNorm.checked) eyesParts.push('Bình thường');
                if (checkEyesDisc && checkEyesDisc.checked) eyesParts.push('Đỏ mắt/nhiều rỉ ghèn');
                if (checkEarsInf && checkEarsInf.checked) eyesParts.push('Sáp tai đen/viêm tai');
                if (checkNoseRun && checkNoseRun.checked) eyesParts.push('Chảy nước mũi/hắt hơi');

                // Vết thương cũ
                const woundsVal = (checkWoundNo && checkWoundNo.checked)
                    ? 'Không có vết thương cũ'
                    : ((woundNoteInput && woundNoteInput.value.trim()) ? woundNoteInput.value.trim() : 'Có vết trầy xước/sẹo cũ từ trước');

                // Tính khí
                const selectedTempRadio = document.querySelector('input[name="intakeTemperamentRadio"]:checked');
                const selectedTemp = selectedTempRadio ? selectedTempRadio.value : 'Ngoan hiền';

                // Đồ dùng gửi lại
                const belongingsVal = (intakeBelongingsInput && intakeBelongingsInput.value.trim()) ? intakeBelongingsInput.value.trim() : 'Không có';

                // Đánh giá cân nặng
                const origNum = parseFloat(booking.petWeight) || 4.0;
                const diff = actualWeightNum - origNum;
                const weightEval = Math.abs(diff) >= 1.0 ? `Lệch khung cân (${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg)` : 'Đúng khung giá đăng ký';

                const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                // Lưu hồ sơ Intake Safety
                booking.intakeSafety = {
                    actualWeight: actualWeightStr,
                    weightEval: weightEval,
                    skinCoat: skinParts.join(', ') || 'Sạch sẽ',
                    eyesEarsNose: eyesParts.join(', ') || 'Bình thường',
                    wounds: woundsVal,
                    temperament: selectedTemp,
                    belongings: belongingsVal,
                    proofImages: [...intakeProofImagesTemp],
                    intakeStaff: staffVal,
                    intakeTime: timeNow
                };

                booking.petWeight = actualWeightStr;
                booking.staff = staffVal;
                booking.belongings = belongingsVal;

                // Tự động thêm phụ phí chênh lệch cân nặng nếu được chọn
                const checkAutoWeight = document.getElementById('checkAutoAddWeightSurcharge');
                const priceDelta = parseInt(checkAutoWeight ? (checkAutoWeight.getAttribute('data-price-delta') || '0') : '0', 10);
                if (checkAutoWeight && checkAutoWeight.checked && priceDelta > 0) {
                    booking.addons = booking.addons || [];
                    const existingWeightAddon = booking.addons.find(a => a.name.includes('chênh lệch phân khúc cân nặng') || a.name.includes('khung cân nặng'));
                    if (!existingWeightAddon) {
                        booking.addons.push({
                            id: 'ADD-' + Date.now(),
                            name: 'Phụ phí chênh lệch phân khúc cân nặng thực tế',
                            amount: priceDelta,
                            reason: `Cân nặng thực tế ${actualWeightStr} lệch phân khúc so với đăng ký ban đầu (${origNum} kg)`,
                            consent: 'Khách hàng đồng ý trực tiếp tại quầy lúc đón bé',
                            time: timeNow,
                            staff: staffVal
                        });
                        booking.addonPrice = booking.addons.reduce((sum, a) => sum + Number(a.amount || 0), 0);
                        const curAccTotal = (booking.accompanyingServices || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                        booking.total = Math.max(0, Number(booking.price || 0) + curAccTotal + booking.addonPrice - Number(booking.discount || 0));
                    }
                }

                // Tự động cập nhật cân nặng mới nhất vào Hồ sơ Thú cưng liên kết
                if (booking.petId) {
                    try {
                        const savedPets = sessionStorage.getItem('pawpal_admin_pets_data');
                        if (savedPets) {
                            const pData = JSON.parse(savedPets);
                            if (pData[booking.petId]) {
                                pData[booking.petId].weight = actualWeightStr;
                                pData[booking.petId].weightNum = parseFloat(actualWeightStr) || pData[booking.petId].weightNum;
                                pData[booking.petId].weightHistory = pData[booking.petId].weightHistory || [];
                                pData[booking.petId].weightHistory.unshift({
                                    date: new Date().toLocaleDateString('vi-VN'),
                                    weight: actualWeightStr,
                                    tier: `Tiếp nhận tại quầy (${booking.serviceName})`,
                                    by: staffVal || 'KTV Tiếp nhận'
                                });
                                sessionStorage.setItem('pawpal_admin_pets_data', JSON.stringify(pData));
                            }
                        }
                    } catch (e) {}
                }

                const modeInput = document.getElementById('intakeModalMode');
                const mode = modeInput ? modeInput.value : 'edit';

                if (mode === 'intake') {
                    // Chuyển trạng thái sang in_progress
                    booking.status = 'in_progress';
                    booking.alertType = null;

                    booking.timeline = booking.timeline || [];
                    if (booking.timeline.length > 0) booking.timeline[0].done = true;
                    booking.timeline.push({
                        time: timeNow,
                        title: 'Tiếp nhận bé và Kiểm tra an toàn (Zero-Claim)',
                        desc: `Cân nặng: ${actualWeightStr} (${weightEval}). Da lông: ${booking.intakeSafety.skinCoat}. Vết thương: ${woundsVal}. Tính khí: ${selectedTemp}. Đồ gửi lại: ${belongingsVal}. KTV phụ trách: ${staffVal}.`,
                        done: true,
                        staff: staffVal,
                        images: [...intakeProofImagesTemp]
                    });

                    // Tự động nạp các bước quy trình chuẩn từ danh mục dịch vụ vào Care-Log
                    const serviceEntry = servicesData.find(s => s.code === booking.serviceCode);
                    if (serviceEntry && serviceEntry.steps && serviceEntry.steps.length > 0) {
                        serviceEntry.steps.forEach((stepName, idx) => {
                            booking.timeline.push({
                                time: '',
                                title: stepName,
                                desc: `Bước ${idx + 1} trong quy trình ${serviceEntry.name}`,
                                done: false,
                                staff: staffVal,
                                images: []
                            });
                        });
                    }

                    // Đồng bộ lên Supabase
                    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (db && booking.dbId) {
                        try {
                            await db.from('appointment').update({
                                appointment_status: 'IN_PROGRESS',
                                note: (booking.customerNote ? booking.customerNote + '\n' : '') + `[Tiếp nhận]: ${actualWeightStr}, ${booking.intakeSafety.skinCoat}`
                            }).eq('id', booking.dbId);

                            const { data: intakeLog } = await db.from('care_log').insert([{
                                appointment_id: booking.dbId,
                                description: `Tiếp nhận an toàn: Cân nặng ${actualWeightStr} (${weightEval}). Da lông: ${booking.intakeSafety.skinCoat}. Vết thương: ${woundsVal}. Tính khí: ${selectedTemp}. Đồ gửi: ${belongingsVal}.`,
                                health_status: (skinParts.includes('Có mảng nấm/viêm đỏ') || skinParts.includes('Có ve rận/bọ chét')) ? 'WARNING' : 'NORMAL',
                                recorded_at: new Date().toISOString()
                            }]).select();

                            if (intakeLog && intakeLog[0] && intakeProofImagesTemp.length > 0) {
                                const logDbId = intakeLog[0].id;
                                const mediaRows = intakeProofImagesTemp.map(img => ({
                                    care_log_id: logDbId,
                                    media_type: 'IMAGE',
                                    media_url: img,
                                    file_name: 'intake_photo.jpg'
                                }));
                                await db.from('care_log_media').insert(mediaRows);
                            }
                        } catch(err) {
                            console.warn('Lỗi cập nhật Supabase khi tiếp nhận bé:', err);
                        }
                    }

                    persistData();
                    closeIntakeModal();
                    renderBookingDetail(booking.id);
                    renderBookingsTable();
                    renderUpcomingBar();
                    updateKPIs();
                    showToast(`Đã hoàn tất tiếp nhận bé ${booking.petName} và bắt đầu ca dịch vụ!`);
                } else {
                    // Chế độ Sửa thông tin: chỉ lưu hồ sơ an toàn
                    persistData();
                    closeIntakeModal();
                    renderBookingDetail(booking.id);
                    renderBookingsTable();
                    showToast(`Đã cập nhật biên bản tiếp nhận an toàn bé ${booking.petName}!`);
                }
            });
        }
    }

    // ==========================================================================
    // 6c. MỞ MODAL ĐỔI KTV (STAFF REASSIGNMENT VÀ AUDIT TRAIL)
    // ==========================================================================
    function openChangeStaffModal(bookingId) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        const modal = document.getElementById('modalChangeStaff');
        const staffSelect = document.getElementById('changeStaffSelect');
        const reasonInput = document.getElementById('changeStaffReasonInput');
        const presetReason = document.getElementById('changeStaffPresetReason');
        const metaEl = document.getElementById('changeStaffBookingMeta');
        const currentNameEl = document.getElementById('changeStaffCurrentName');

        if (metaEl) {
            metaEl.textContent = `Mã ca: ${booking.id} (${booking.petName}) | KTV hiện tại: ${booking.staff || 'Chưa phân công'}`;
        }
        if (currentNameEl) {
            currentNameEl.textContent = booking.staff || 'Chưa phân công';
        }

        // Pre-select KTV hiện tại nếu có
        if (staffSelect) {
            staffSelect.value = '';
        }
        const changeStaffHint = document.getElementById('changeStaffWorkloadHint');
        if (changeStaffHint) changeStaffHint.style.display = 'none';

        if (presetReason) presetReason.value = 'CUSTOM';
        if (reasonInput) reasonInput.value = '';

        // Lưu bookingId để submit biết cần cập nhật ca nào
        if (modal) {
            modal.setAttribute('data-booking-id', bookingId);
            modal.classList.add('active');
        }
    }

    function setupChangeStaffModal() {
        const modal = document.getElementById('modalChangeStaff');
        const form = document.getElementById('formChangeStaff');
        const btnClose = document.getElementById('btnCloseChangeStaff');
        const btnCancel = document.getElementById('btnCancelChangeStaff');
        const staffSelect = document.getElementById('changeStaffSelect');
        const changeStaffHint = document.getElementById('changeStaffWorkloadHint');
        const presetReason = document.getElementById('changeStaffPresetReason');
        const reasonInput = document.getElementById('changeStaffReasonInput');

        const closeModal = () => { if (modal) modal.classList.remove('active'); };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        if (staffSelect && changeStaffHint) {
            staffSelect.addEventListener('change', () => {
                const staff = staffSelect.value;
                if (!staff) {
                    changeStaffHint.style.display = 'none';
                    return;
                }
                const staffItem = STAFF_DIRECTORY.find(s => s.name === staff) || { maxCapacity: 4 };
                const count = getStaffActiveBookings(staff).length;
                const max = staffItem.maxCapacity || 4;
                changeStaffHint.style.display = 'block';
                changeStaffHint.className = '';
                if (count >= max) {
                    changeStaffHint.classList.add('staff-workload-hint-danger');
                    changeStaffHint.textContent = `🟡 ${staff} đã nhận ${count}/${max} ca hôm nay (Cảnh báo quá tải - khuyến nghị chọn KTV khác).`;
                } else if (count >= max - 1) {
                    changeStaffHint.classList.add('staff-workload-hint-warning');
                    changeStaffHint.textContent = `⚠️ ${staff} đang nhận ${count}/${max} ca hôm nay (Sắp đầy công suất).`;
                } else {
                    changeStaffHint.classList.add('staff-workload-hint-available');
                    changeStaffHint.textContent = `🟢 ${staff} đang nhận ${count}/${max} ca hôm nay (Khả dụng - còn ${max - count} ca trống).`;
                }
            });
        }

        if (presetReason) {
            presetReason.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val && val !== 'CUSTOM') {
                    if (reasonInput) reasonInput.value = val;
                }
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const bookingId = modal ? modal.getAttribute('data-booking-id') : null;
                const booking = bookingsData.find(b => b.id === bookingId);
                if (!booking) return;

                const newStaff = staffSelect ? staffSelect.value.trim() : '';
                const reason = reasonInput ? reasonInput.value.trim() : 'Điều phối nhân sự ca trực';
                const scopeRadio = form.elements['changeStaffScope'];
                const scope = (scopeRadio && scopeRadio.value) ? scopeRadio.value : 'next_steps';

                if (!newStaff) return;

                const oldStaff = booking.staff || 'Chưa phân công';
                booking.staff = newStaff;

                // Cập nhật KTV cho các bước timeline theo phạm vi
                booking.timeline = booking.timeline || [];
                if (scope === 'all_steps') {
                    booking.timeline.forEach(st => st.staff = newStaff);
                } else {
                    booking.timeline.forEach(st => {
                        if (!st.done) st.staff = newStaff;
                    });
                }

                // Ghi mốc timeline kiểm toán (Audit Trail)
                const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                booking.timeline.push({
                    time: timeNow,
                    title: `Điều phối KTV: ${oldStaff} ➔ ${newStaff}`,
                    desc: `Lý do: ${reason}. Phạm vi: ${scope === 'all_steps' ? 'Bàn giao toàn bộ ca' : 'Tiếp quản các bước tiếp theo'}. Điều phối bởi Quản trị viên lúc ${timeNow}.`,
                    done: true,
                    staff: newStaff,
                    images: []
                });

                // Đồng bộ cập nhật KTV lên Supabase
                const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (db && booking.dbId) {
                    try {
                        db.from('care_log').insert([{
                            appointment_id: booking.dbId,
                            description: `Điều phối KTV: ${oldStaff} ➔ ${newStaff}. Lý do: ${reason}`,
                            health_status: 'NORMAL',
                            recorded_at: new Date().toISOString()
                        }]);
                    } catch(err) {}
                }

                persistData();
                closeModal();
                renderBookingDetail(booking.id);
                renderBookingsTable();
                showToast(`Đã điều chuyển KTV phụ trách ca sang ${newStaff}!`);
            });
        }
    }

    // ==========================================================================
    // 6d. MỞ BIÊN BẢN NGHIỆM THU VÀ BÀN GIAO BÉ (ZERO-DISPUTE CHECKOUT DESK)
    // ==========================================================================
    function openCompleteBookingModal(bookingId) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        selectedBookingId = bookingId;

        const modal = document.getElementById('modalCompleteBooking');
        const metaEl = document.getElementById('completeBookingMeta');
        const progressEl = document.getElementById('completeStepsProgressText');
        const belongingsDescEl = document.getElementById('completeBelongingsDesc');
        const checkBelongings = document.getElementById('completeCheckBelongings');
        const checkQuality = document.getElementById('completeCheckQuality');
        const checkPaid = document.getElementById('completeCheckPaid');
        const priceBaseEl = document.getElementById('completePriceBase');
        const priceAccEl = document.getElementById('completePriceAccompanying');
        const priceAddonsEl = document.getElementById('completePriceAddons');
        const priceDiscountEl = document.getElementById('completePriceDiscount');
        const priceTotalEl = document.getElementById('completePriceTotal');
        const payMethodSelect = document.getElementById('completePaymentMethodSelect');

        if (metaEl) {
            metaEl.textContent = `Mã ca: ${booking.id} | Bé: ${booking.petName} (${booking.petBreed}) | Chủ nuôi: ${booking.customerName} - ${booking.phone}`;
        }

        // Tiến độ Care-Log
        const timeline = booking.timeline || [];
        const doneSteps = timeline.filter(s => s.done).length;
        const totalSteps = timeline.length;
        if (progressEl) {
            if (doneSteps === totalSteps && totalSteps > 0) {
                progressEl.textContent = `${doneSteps}/${totalSteps} bước kỹ thuật đã hoàn tất`;
                progressEl.style.color = '#165335';
            } else {
                progressEl.textContent = `${doneSteps}/${totalSteps} bước hoàn thành (tự động chốt hoàn tất khi nghiệm thu)`;
                progressEl.style.color = '#B45309';
            }
        }
        if (checkQuality) checkQuality.checked = true;

        // Đối chiếu tư trang đã gửi
        const belongings = booking.belongings || (booking.intakeSafety && booking.intakeSafety.belongings) || 'Không có';
        if (belongingsDescEl) {
            if (belongings && belongings !== 'Không có') {
                belongingsDescEl.innerHTML = `<strong>Tư trang gửi tại quầy:</strong> ${belongings}`;
                if (checkBelongings) {
                    checkBelongings.checked = true;
                    checkBelongings.disabled = false;
                }
            } else {
                belongingsDescEl.textContent = 'Khách không gửi lại đồ dùng / tư trang tại quầy.';
                if (checkBelongings) {
                    checkBelongings.checked = true;
                    checkBelongings.disabled = true;
                }
            }
        }

        // Bảng kê tài chính
        const accompanyingTotal = (booking.accompanyingServices || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
        const addonTotal = (booking.addons || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
        booking.addonPrice = addonTotal;
        const subtotal = Number(booking.price || 0) + accompanyingTotal + addonTotal;

        const voucherSelect = document.getElementById('completeVoucherSelect');
        const pointsSelect = document.getElementById('completePointsSelect');
        const earnedPointsEl = document.getElementById('completeEarnedPointsText');

        if (voucherSelect) voucherSelect.value = '0';
        if (pointsSelect) pointsSelect.value = '0';

        function recalculateCompleteBill() {
            let discount = 0;
            if (voucherSelect && voucherSelect.value !== '0') {
                const vVal = parseFloat(voucherSelect.value);
                if (vVal > 0 && vVal < 1) {
                    discount += Math.round(subtotal * vVal);
                } else if (vVal >= 1000) {
                    discount += vVal;
                }
            }
            if (pointsSelect && pointsSelect.value !== '0') {
                const pVal = parseInt(pointsSelect.value, 10);
                discount += Math.round(pVal * 100); // 100 điểm = 10.000 đ
            }

            const finalTotal = Math.max(0, subtotal - discount);
            const earnedPoints = Math.max(1, Math.floor(finalTotal / 10000));

            if (priceBaseEl) priceBaseEl.textContent = formatCurrency(booking.price);
            if (priceAccEl) priceAccEl.textContent = accompanyingTotal > 0 ? `+${formatCurrency(accompanyingTotal)}` : '+0 đ';
            if (priceAddonsEl) priceAddonsEl.textContent = addonTotal > 0 ? `+${formatCurrency(addonTotal)}` : '+0 đ';
            if (priceDiscountEl) priceDiscountEl.textContent = `-${formatCurrency(discount)}`;
            if (priceTotalEl) priceTotalEl.textContent = formatCurrency(finalTotal);
            if (earnedPointsEl) earnedPointsEl.textContent = `+${earnedPoints} Pawpoint`;

            return { subtotal, discount, finalTotal, earnedPoints };
        }

        recalculateCompleteBill();

        if (voucherSelect) voucherSelect.onchange = recalculateCompleteBill;
        if (pointsSelect) pointsSelect.onchange = recalculateCompleteBill;

        // Hình thức thanh toán
        if (payMethodSelect) {
            if (booking.paymentStatus && booking.paymentStatus.includes('Đã thanh toán')) {
                payMethodSelect.value = 'Đã thanh toán trước Online';
            } else {
                payMethodSelect.value = 'Tiền mặt (Tại quầy)';
            }
        }
        if (checkPaid) checkPaid.checked = true;

        // Reset ảnh thành phẩm
        completeProofImagesTemp = [];
        renderCompleteProofPreviewList();

        // Gắn nút chụp ảnh thành phẩm
        const btnAddCompletePhoto = document.getElementById('btnAddCompletePhotoBtn');
        const completeFileInput = document.getElementById('completeProofFileInput');
        if (btnAddCompletePhoto && completeFileInput) {
            btnAddCompletePhoto.onclick = () => completeFileInput.click();
            completeFileInput.onchange = (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                Array.from(files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        completeProofImagesTemp.push(evt.target.result);
                        renderCompleteProofPreviewList();
                    };
                    reader.readAsDataURL(file);
                });
                completeFileInput.value = '';
            };
        }

        if (modal) {
            modal.setAttribute('data-booking-id', bookingId);
            modal.classList.add('active');
        }
    }

    function setupCompleteBookingModal() {
        const modal = document.getElementById('modalCompleteBooking');
        const form = document.getElementById('formCompleteBooking');
        const btnClose = document.getElementById('btnCloseCompleteBooking');
        const btnCancel = document.getElementById('btnCancelCompleteBooking');

        const closeModal = () => { if (modal) modal.classList.remove('active'); };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const bookingId = modal ? modal.getAttribute('data-booking-id') : null;
                const booking = bookingsData.find(b => b.id === bookingId);
                if (!booking) return;

                const payMethodSelect = document.getElementById('completePaymentMethodSelect');
                const checkPaid = document.getElementById('completeCheckPaid');
                const voucherSelect = document.getElementById('completeVoucherSelect');
                const pointsSelect = document.getElementById('completePointsSelect');
                const payMethod = payMethodSelect ? payMethodSelect.value : 'Tiền mặt (Tại quầy)';
                const isPaid = checkPaid ? checkPaid.checked : true;

                const accompanyingTotal = (booking.accompanyingServices || []).reduce((sum, a) => sum + Number(a.price || 0), 0);
                const addonTotal = (booking.addons || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
                const subtotal = Number(booking.price || 0) + accompanyingTotal + addonTotal;

                let discount = 0;
                let voucherCodeUsed = '';
                if (voucherSelect && voucherSelect.value !== '0') {
                    const vVal = parseFloat(voucherSelect.value);
                    voucherCodeUsed = voucherSelect.options[voucherSelect.selectedIndex].getAttribute('data-code') || '';
                    if (vVal > 0 && vVal < 1) {
                        discount += Math.round(subtotal * vVal);
                    } else if (vVal >= 1000) {
                        discount += vVal;
                    }
                }

                let usedPoints = 0;
                if (pointsSelect && pointsSelect.value !== '0') {
                    usedPoints = parseInt(pointsSelect.value, 10);
                    discount += Math.round(usedPoints * 100);
                }

                const finalTotal = Math.max(0, subtotal - discount);
                const earnedPoints = Math.max(1, Math.floor(finalTotal / 10000));

                const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                booking.status = 'completed';
                booking.alertType = null;
                booking.discount = discount;
                booking.total = finalTotal;
                booking.paymentStatus = isPaid ? `Đã thanh toán (${payMethod})` : `Chưa thanh toán (${payMethod})`;

                // Đồng bộ tích điểm tự động vào tài khoản khách hàng PawPal
                try {
                    const rawCusts = sessionStorage.getItem('pawpal_admin_customers_data');
                    if (rawCusts) {
                        const custData = JSON.parse(rawCusts);
                        const cId = booking.userId || 'USER-001';
                        if (custData[cId]) {
                            if (usedPoints > 0) {
                                custData[cId].points = Math.max(0, (custData[cId].points || 0) - usedPoints);
                            }
                            custData[cId].points = (custData[cId].points || 0) + earnedPoints;
                            custData[cId].pointHistory = custData[cId].pointHistory || custData[cId].pointsHistory || [];
                            if (usedPoints > 0) {
                                custData[cId].pointHistory.unshift({
                                    date: new Date().toLocaleDateString('vi-VN'),
                                    points: `-${usedPoints}`,
                                    reason: `Đổi ưu đãi giảm giá ca ${booking.id}`
                                });
                            }
                            custData[cId].pointHistory.unshift({
                                date: new Date().toLocaleDateString('vi-VN'),
                                points: `+${earnedPoints}`,
                                reason: `Tích điểm hoàn tất ca ${booking.id} (${booking.serviceName})`
                            });
                            sessionStorage.setItem('pawpal_admin_customers_data', JSON.stringify(custData));
                        }
                    }
                } catch (err) {}

                // Đánh dấu hoàn tất toàn bộ các bước trong Care-Log
                booking.timeline = booking.timeline || [];
                booking.timeline.forEach(st => st.done = true);

                const belongings = booking.belongings || (booking.intakeSafety && booking.intakeSafety.belongings) || 'Không có';
                const belongingsNote = (belongings && belongings !== 'Không có') ? `Đã đối chiếu và trao trả đầy đủ tư trang: ${belongings}.` : 'Không có tư trang gửi lại.';
                const voucherNote = voucherCodeUsed ? ` (Áp dụng voucher ${voucherCodeUsed})` : '';
                const pointsNote = usedPoints > 0 ? ` (Dùng ${usedPoints} Pawpoint)` : '';

                booking.timeline.push({
                    time: timeNow,
                    title: 'Nghiệm thu ca dịch vụ và Bàn giao bé',
                    desc: `Đã hoàn tất toàn bộ liệu trình chăm sóc đạt chuẩn chất lượng. ${belongingsNote} Xuất hóa đơn: ${formatCurrency(booking.total)}${voucherNote}${pointsNote} (${booking.paymentStatus}). Tích lũy +${earnedPoints} Pawpoint cho khách.`,
                    done: true,
                    staff: booking.staff || 'KTV',
                    images: [...completeProofImagesTemp]
                });

                // Cập nhật trạng thái và xuất log lên Supabase
                const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (db && booking.dbId) {
                    try {
                        await db.from('appointment').update({
                            appointment_status: 'COMPLETED',
                            payment_status: isPaid ? 'PAID' : 'UNPAID',
                            total_price: finalTotal
                        }).eq('id', booking.dbId);

                        const { data: compLog } = await db.from('care_log').insert([{
                            appointment_id: booking.dbId,
                            description: `Nghiệm thu ca dịch vụ và bàn giao bé. Tổng hóa đơn: ${finalTotal.toLocaleString('vi-VN')} đ. ${belongingsNote}`,
                            health_status: 'NORMAL',
                            recorded_at: new Date().toISOString()
                        }]).select();

                        if (compLog && compLog[0] && completeProofImagesTemp.length > 0) {
                            const logDbId = compLog[0].id;
                            const mediaRows = completeProofImagesTemp.map(img => ({
                                care_log_id: logDbId,
                                media_type: 'IMAGE',
                                media_url: img,
                                file_name: 'complete_photo.jpg'
                            }));
                            await db.from('care_log_media').insert(mediaRows);
                        }

                        // Ghi nhận tích điểm vào bảng paw_point_transaction trên Supabase
                        if (booking.userId && String(booking.userId).length > 30) {
                            if (earnedPoints > 0) {
                                await db.from('paw_point_transaction').insert([{
                                    customer_id: booking.userId,
                                    points: earnedPoints,
                                    description: `Tích điểm hoàn tất ca dịch vụ ${booking.id} (${booking.serviceName})`
                                }]);
                            }
                            if (usedPoints > 0) {
                                await db.from('paw_point_transaction').insert([{
                                    customer_id: booking.userId,
                                    points: -usedPoints,
                                    description: `Đổi ưu đãi giảm giá ca dịch vụ ${booking.id}`
                                }]);
                            }
                        }
                    } catch(err) {
                        console.warn('Lỗi cập nhật Supabase khi hoàn tất ca:', err);
                    }
                }

                persistData();
                closeModal();
                renderBookingDetail(booking.id);
                renderBookingsTable();
                renderUpcomingBar();
                updateKPIs();
                showToast(`Ca dịch vụ ${booking.id} đã hoàn tất bàn giao bé! Tích lũy +${earnedPoints} Pawpoint cho khách hàng.`);
            });
        }
    }

    function openPhotoLightbox(src, title, time) {
        const modal = document.getElementById('modalCarelogPhotoPreview');
        const imgEl = document.getElementById('previewPhotoModalImg');
        const titleEl = document.getElementById('previewPhotoModalTitle');
        const captionEl = document.getElementById('previewPhotoModalCaption');

        if (!modal || !imgEl) return;
        imgEl.src = src;
        if (titleEl) titleEl.textContent = title || 'Ảnh nhật ký chăm sóc';
        if (captionEl) captionEl.textContent = `Ghi nhận lúc: ${time || ''} • Hồ sơ ca ${selectedBookingId}`;
        modal.classList.add('active');
    }

    function openCancelModal(bookingId) {
        const modal = document.getElementById('modalCancelBooking');
        const codeDisplay = document.getElementById('cancelBookingCodeDisplay');
        const confirmBtn = document.getElementById('btnConfirmCancelBooking');
        if (codeDisplay) codeDisplay.textContent = bookingId;
        if (confirmBtn) confirmBtn.setAttribute('data-booking-id', bookingId);
        if (modal) modal.classList.add('active');
    }

    function openEditServiceModal(serviceCode) {
        const modal = document.getElementById('modalServiceForm');
        const service = servicesData.find(s => s.code === serviceCode);
        if (!service || !modal) return;

        document.getElementById('serviceFormModalTitle').textContent = `Chỉnh sửa dịch vụ ${service.code}`;
        document.getElementById('editServiceCodeHidden').value = service.code;
        document.getElementById('formServiceId').value = service.code;
        document.getElementById('formServiceId').readOnly = true;
        document.getElementById('formServiceGroup').value = service.group === 'spa' ? 'Spa' : (service.group === 'hotel' ? 'Hotel' : 'Taxi');
        document.getElementById('formServiceName').value = service.name;
        document.getElementById('formServicePetType').value = service.petType;
        document.getElementById('formServiceDuration').value = service.duration;
        document.getElementById('formServiceDesc').value = service.desc || '';
        document.getElementById('formServiceStaffLevel').value = service.staffLevel;
        document.getElementById('formServiceStatus').value = service.status;

        if (service.prices) {
            document.getElementById('formPriceUnder5').value = service.prices.under5 || '';
            document.getElementById('formPrice5To10').value = service.prices.to10 || '';
            document.getElementById('formPrice10To20').value = service.prices.to20 || '';
            document.getElementById('formPriceOver20').value = service.prices.over20 || '';
        }

        const commissionInput = document.getElementById('formServiceCommission');
        if (commissionInput) commissionInput.value = service.commission || 15;
        const sopPresetSelect = document.getElementById('serviceSopPresetSelect');
        if (sopPresetSelect) sopPresetSelect.value = 'CUSTOM';

        // Khởi tạo các bước chuẩn vào trình chỉnh sửa
        currentEditingServiceSteps = [...(service.steps || [
            'Tiếp nhận bé và kiểm tra da lông sơ bộ',
            'Thực hiện liệu trình dịch vụ chuyên nghiệp',
            'Vệ sinh và kiểm tra hoàn thiện',
            'Bàn giao cho chủ nuôi'
        ])];
        renderServiceStepsEditor();

        modal.classList.add('active');
    }

    // ==========================================================================
    // 7B. XEM CHI TIẾT QUY TRÌNH CHUẨN SOP (MODAL 11)
    // ==========================================================================
    function openSopDetailsModal(serviceCode) {
        const modal = document.getElementById('modalViewSopDetails');
        const service = servicesData.find(s => s.code === serviceCode);
        if (!service || !modal) return;

        const titleEl = document.getElementById('sopViewerTitle');
        const metaEl = document.getElementById('sopViewerMeta');
        const listEl = document.getElementById('sopViewerStepsList');
        const btnEdit = document.getElementById('btnEditSopFromViewer');

        if (titleEl) titleEl.textContent = `Quy trình chuẩn: ${service.name}`;
        if (metaEl) {
            metaEl.textContent = `Mã gói: ${service.code} | Nhóm: ${service.categoryName} | Thời lượng: ${service.duration} | Hoa hồng KTV: ${service.commission || 15}% | Cấp độ: ${service.staffLevel || 'Groomer'}`;
        }

        const steps = (service.steps && service.steps.length > 0) ? service.steps : [
            'Tiếp nhận bé và kiểm tra da lông sơ bộ',
            'Thực hiện liệu trình dịch vụ chuyên nghiệp',
            'Vệ sinh tai móng và khử khuẩn',
            'Chụp ảnh hoàn tất và bàn giao cho chủ'
        ];

        if (listEl) {
            listEl.innerHTML = steps.map((step, idx) => `
                <div class="sop-flow-step-item">
                    <span class="sop-flow-step-badge">Bước ${idx + 1}</span>
                    <div class="sop-flow-step-content">
                        <div class="sop-flow-step-title">${step}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                            Bắt buộc KTV kiểm tra đạt chuẩn và cập nhật vào Care-Log ca dịch vụ
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (btnEdit) {
            btnEdit.onclick = () => {
                modal.classList.remove('active');
                openEditServiceModal(serviceCode);
            };
        }

        modal.classList.add('active');
    }

    function setupSopDetailsModal() {
        const modal = document.getElementById('modalViewSopDetails');
        const btnClose = document.getElementById('btnCloseSopViewer');
        const btnDismiss = document.getElementById('btnDismissSopViewer');

        const closeModal = () => { if (modal) modal.classList.remove('active'); };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnDismiss) btnDismiss.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }

    // ==========================================================================
    // 8. DROPDOWN THAO TÁC 3 CHẤM (TEXT-ONLY)
    // ==========================================================================
    function toggleActionDropdown(bookingId, triggerBtn) {
        const dropdown = document.getElementById('servicesActionDropdown');
        if (!dropdown) return;

        if (dropdown.style.display === 'block' && activeDropdownBookingId === bookingId) {
            dropdown.style.display = 'none';
            activeDropdownBookingId = null;
            return;
        }

        activeDropdownBookingId = bookingId;
        const rect = triggerBtn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
        dropdown.style.left = `${rect.right - 180 + window.scrollX}px`;
        dropdown.style.display = 'block';

        const booking = bookingsData.find(b => b.id === bookingId);
        const btnConfirm = document.getElementById('menuActionConfirm');
        const btnIntake = document.getElementById('menuActionIntake');
        const btnComplete = document.getElementById('menuActionComplete');
        const btnCancel = document.getElementById('menuActionCancel');

        if (booking) {
            btnConfirm.style.display = booking.status === 'pending' ? 'block' : 'none';
            btnIntake.style.display = booking.status === 'confirmed' ? 'block' : 'none';
            btnComplete.style.display = booking.status === 'in_progress' ? 'block' : 'none';
            btnCancel.style.display = (booking.status !== 'completed' && booking.status !== 'cancelled') ? 'block' : 'none';
        }
    }

    function setupActionDropdownEvents() {
        const dropdown = document.getElementById('servicesActionDropdown');
        if (!dropdown) return;

        document.getElementById('menuActionViewDetail').onclick = () => {
            if (activeDropdownBookingId) openBookingDetail(activeDropdownBookingId);
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionConfirm').onclick = () => {
            if (activeDropdownBookingId) updateBookingStatus(activeDropdownBookingId, 'confirmed');
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionIntake').onclick = () => {
            if (activeDropdownBookingId) {
                openIntakeModal(activeDropdownBookingId, 'intake');
            }
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionComplete').onclick = () => {
            if (activeDropdownBookingId) openCompleteBookingModal(activeDropdownBookingId);
            dropdown.style.display = 'none';
        };

        document.getElementById('menuActionCancel').onclick = () => {
            if (activeDropdownBookingId) openCancelModal(activeDropdownBookingId);
            dropdown.style.display = 'none';
        };

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !e.target.classList.contains('btn-action-trigger')) {
                dropdown.style.display = 'none';
                activeDropdownBookingId = null;
            }
        });
    }

    // ==========================================================================
    // 9. GẮN SỰ KIỆN TÌM KIẾM VÀ BỘ LỌC
    // ==========================================================================
    function setupFilterEvents() {
        const searchInput = document.getElementById('serviceSearchInput');
        const selectCategory = document.getElementById('serviceFilterCategory');
        const selectStatus = document.getElementById('serviceFilterStatus');
        const selectStaff = document.getElementById('serviceFilterStaff');
        const btnUpcoming = document.getElementById('btnToggleUpcomingOnly');
        const btnAllergy = document.getElementById('btnToggleAllergyOnly');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value.trim();
                const btnX = document.getElementById('btnToolbarResetFilters');
                if (btnX) {
                    btnX.style.display = e.target.value.length > 0 ? 'inline-flex' : 'none';
                }
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        if (selectCategory) {
            selectCategory.addEventListener('change', (e) => {
                currentFilterCategory = e.target.value;
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        if (selectStatus) {
            selectStatus.addEventListener('change', (e) => {
                currentFilterStatus = e.target.value;
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        if (selectStaff) {
            selectStaff.addEventListener('change', (e) => {
                currentFilterStaff = e.target.value;
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        if (btnUpcoming) {
            btnUpcoming.addEventListener('click', () => {
                isUpcomingFilterActive = !isUpcomingFilterActive;
                btnUpcoming.classList.toggle('active', isUpcomingFilterActive);

                // Đồng bộ class active trên thẻ KPI
                document.querySelectorAll('.kpi-card-clickable').forEach(card => {
                    const kf = card.getAttribute('data-kpi-filter');
                    if (kf === 'upcoming') {
                        card.classList.toggle('active', isUpcomingFilterActive);
                    } else if (isUpcomingFilterActive) {
                        card.classList.remove('active');
                    } else if (kf === 'ALL') {
                        card.classList.add('active');
                    }
                });

                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

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

        // Nút lọc nhanh trên dải ruy-băng thông báo 60 phút
        const btnStripFilter = document.getElementById('btnFilterUpcomingQuick');
        if (btnStripFilter) {
            btnStripFilter.addEventListener('click', () => {
                isUpcomingFilterActive = true;
                if (btnUpcoming) btnUpcoming.classList.add('active');

                // Đồng bộ class active trên thẻ KPI
                document.querySelectorAll('.kpi-card-clickable').forEach(card => {
                    if (card.getAttribute('data-kpi-filter') === 'upcoming') {
                        card.classList.add('active');
                    } else {
                        card.classList.remove('active');
                    }
                });

                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        // Tương tác click trực tiếp trên các thẻ KPI để lọc 1 chạm
        document.querySelectorAll('.kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const kpiFilter = card.getAttribute('data-kpi-filter');
                document.querySelectorAll('.kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                currentBookingPage = 1;
                if (kpiFilter === 'ALL') {
                    currentFilterStatus = 'ALL';
                    isUpcomingFilterActive = false;
                    if (selectStatus) selectStatus.value = 'ALL';
                    if (btnUpcoming) btnUpcoming.classList.remove('active');
                } else if (kpiFilter === 'upcoming') {
                    currentFilterStatus = 'ALL';
                    isUpcomingFilterActive = true;
                    if (selectStatus) selectStatus.value = 'ALL';
                    if (btnUpcoming) btnUpcoming.classList.add('active');
                } else {
                    currentFilterStatus = kpiFilter;
                    isUpcomingFilterActive = false;
                    if (selectStatus) selectStatus.value = kpiFilter;
                    if (btnUpcoming) btnUpcoming.classList.remove('active');
                }
                renderBookingsTable();
            });
        });

        // Nút Xóa ô tìm kiếm ngay bên trong ô tìm kiếm đầu bảng
        const btnToolbarReset = document.getElementById('btnToolbarResetFilters');
        if (btnToolbarReset) {
            btnToolbarReset.addEventListener('click', (e) => {
                e.preventDefault();
                const searchIn = document.getElementById('serviceSearchInput');
                if (searchIn) {
                    searchIn.value = '';
                    searchIn.focus();
                }
                currentSearchTerm = '';
                btnToolbarReset.style.display = 'none';
                currentBookingPage = 1;
                renderBookingsTable();
            });
        }

        // Bộ lọc cho Subtab 3: Danh mục và Bảng giá
        const catalogSearchInput = document.getElementById('catalogSearchInput');
        const catalogFilterStatusSelect = document.getElementById('catalogFilterStatus');

        if (catalogSearchInput) {
            catalogSearchInput.addEventListener('input', (e) => {
                catalogSearchTerm = e.target.value.trim();
                renderCatalogTable();
            });
        }

        if (catalogFilterStatusSelect) {
            catalogFilterStatusSelect.addEventListener('change', (e) => {
                catalogFilterStatus = e.target.value;
                renderCatalogTable();
            });
        }

        // Bộ lọc cho Subtab 4: Đánh giá
        const reviewSearchInput = document.getElementById('reviewSearchInput');
        const reviewFilterStarSelect = document.getElementById('reviewFilterStar');
        const reviewFilterCatSelect = document.getElementById('reviewFilterCategory');
        const reviewFilterStatusSelect = document.getElementById('reviewFilterStatus');

        if (reviewSearchInput) {
            reviewSearchInput.addEventListener('input', (e) => {
                reviewSearchTerm = e.target.value.trim();
                renderReviewsTable();
            });
        }

        if (reviewFilterStarSelect) {
            reviewFilterStarSelect.addEventListener('change', (e) => {
                reviewFilterStar = e.target.value;
                renderReviewsTable();
            });
        }

        if (reviewFilterCatSelect) {
            reviewFilterCatSelect.addEventListener('change', (e) => {
                reviewFilterCategory = e.target.value;
                renderReviewsTable();
            });
        }

        if (reviewFilterStatusSelect) {
            reviewFilterStatusSelect.addEventListener('change', (e) => {
                reviewFilterStatus = e.target.value;
                renderReviewsTable();
            });
        }

        const reviewFilterStaffSelect = document.getElementById('reviewFilterStaff');
        if (reviewFilterStaffSelect) {
            reviewFilterStaffSelect.addEventListener('change', (e) => {
                reviewFilterStaff = e.target.value;
                renderReviewsTable();
            });
        }

        // Click KPI Card Đánh giá
        document.querySelectorAll('[data-review-filter]').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-review-filter');
                if (filter === 'pending') {
                    reviewFilterStatus = 'pending';
                    if (reviewFilterStatusSelect) reviewFilterStatusSelect.value = 'pending';
                } else if (filter === 'low_rating') {
                    reviewFilterStar = 'LOW';
                    if (reviewFilterStarSelect) reviewFilterStarSelect.value = 'LOW';
                } else {
                    reviewFilterStatus = 'ALL';
                    reviewFilterStar = 'ALL';
                    if (reviewFilterStatusSelect) reviewFilterStatusSelect.value = 'ALL';
                    if (reviewFilterStarSelect) reviewFilterStarSelect.value = 'ALL';
                }
                renderReviewsTable();
            });
        });

        // Tabs 3 nhóm trong Sub-tab 3 (Danh mục và Bảng giá)
        document.querySelectorAll('.catalog-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.catalog-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCatalogGroup = btn.getAttribute('data-group');
                renderCatalogTable();
            });
        });
    }

    // ==========================================================================
    // 9B. GIAI ĐOẠN 1: BIÊN BẢN TIẾP NHẬN, POS CHECKOUT VÀ BÁO ĐÓN BÉ
    // ==========================================================================

    // 1. Mở Modal In Biên bản tiếp nhận (Zero-Claim & Waiver)
    function openIntakeWaiverModal(bookingId) {
        const modal = document.getElementById('modalPrintIntakeWaiver');
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!modal || !booking) return;

        const s = booking.intakeSafety || {};
        const safeText = (val, fallback = 'Bình thường / Chuẩn') => val || fallback;

        // Meta và Brand
        const codeEl = document.getElementById('waiverBookingCode');
        const dateEl = document.getElementById('waiverPrintDate');
        const branchEl = document.getElementById('waiverBranchInfo');
        if (codeEl) codeEl.textContent = booking.id;
        if (dateEl) dateEl.textContent = `Tiếp nhận: ${booking.time || '14:00'} - ${booking.date || 'Hôm nay'}`;
        if (branchEl) branchEl.textContent = `Hệ thống chăm sóc thú cưng chuẩn Nhật Bản • Cơ sở: ${booking.branch || 'PawPal Chi nhánh Quận 1'}`;

        // Customer và Pet
        const custNameEl = document.getElementById('waiverCustName');
        const custPhoneEl = document.getElementById('waiverCustPhone');
        const petNameEl = document.getElementById('waiverPetName');
        const petBreedEl = document.getElementById('waiverPetBreed');
        const petWeightEl = document.getElementById('waiverPetWeight');
        const petAgeEl = document.getElementById('waiverPetAge');

        if (custNameEl) custNameEl.textContent = booking.customerName || 'Khách hàng';
        if (custPhoneEl) custPhoneEl.textContent = booking.phone || '0901234567';
        if (petNameEl) petNameEl.textContent = booking.petName || 'Bé cưng';
        if (petBreedEl) petBreedEl.textContent = booking.petBreed || 'Chó / Mèo';
        if (petWeightEl) petWeightEl.textContent = s.actualWeight || booking.petWeight || '4.0 kg';
        if (petAgeEl) petAgeEl.textContent = booking.petAge || '2 tuổi';

        // Zero-Claim Inspection
        const actualWeightEl = document.getElementById('waiverActualWeight');
        const weightEvalEl = document.getElementById('waiverWeightEval');
        const skinCoatEl = document.getElementById('waiverSkinCoat');
        const eyesEarsEl = document.getElementById('waiverEyesEars');
        const woundsEl = document.getElementById('waiverWounds');
        const tempEl = document.getElementById('waiverTemperament');
        const belongingsEl = document.getElementById('waiverBelongings');

        if (actualWeightEl) actualWeightEl.textContent = s.actualWeight || booking.petWeight || 'Chưa cân';
        if (weightEvalEl) weightEvalEl.textContent = s.weightEval || 'Đúng khung giá đăng ký';
        if (skinCoatEl) skinCoatEl.textContent = safeText(s.skinCoat, 'Sạch sẽ, không ve rận');
        if (eyesEarsEl) eyesEarsEl.textContent = safeText(s.eyesEarsNose, 'Bình thường, không viêm');
        if (woundsEl) woundsEl.textContent = safeText(s.wounds, 'Không có vết thương / sẹo cũ');
        if (tempEl) tempEl.textContent = safeText(s.temperament, 'Ngoan hiền, hợp tác');
        if (belongingsEl) belongingsEl.textContent = s.belongings || booking.belongings || 'Không có tư trang gửi lại quầy';

        // Service và Financials
        const svcNameEl = document.getElementById('waiverServiceName');
        const priceBaseEl = document.getElementById('waiverPriceBase');
        const staffNameEl = document.getElementById('waiverStaffName');
        const durationEl = document.getElementById('waiverDuration');
        const priceTotalEl = document.getElementById('waiverPriceTotal');
        const extraItemsBlock = document.getElementById('waiverExtraItemsBlock');
        const extraItemsText = document.getElementById('waiverExtraItemsText');

        if (svcNameEl) svcNameEl.textContent = booking.serviceName || 'Dịch vụ PawPal';
        if (priceBaseEl) priceBaseEl.textContent = formatCurrency(booking.price);
        if (staffNameEl) staffNameEl.textContent = s.intakeStaff || booking.staff || 'KTV PawPal';
        if (durationEl) durationEl.textContent = booking.duration || '60 phút';
        if (priceTotalEl) priceTotalEl.textContent = formatCurrency(booking.total || booking.price);

        const accompanying = booking.accompanyingServices || [];
        const addons = booking.addons || [];
        if (accompanying.length > 0 || addons.length > 0) {
            if (extraItemsBlock) extraItemsBlock.style.display = 'block';
            const accNames = accompanying.map(a => `${a.name} (+${formatCurrency(a.price)})`);
            const addonNames = addons.map(a => `${a.name} (+${formatCurrency(a.amount)})`);
            if (extraItemsText) extraItemsText.textContent = [...accNames, ...addonNames].join(', ');
        } else {
            if (extraItemsBlock) extraItemsBlock.style.display = 'none';
        }

        // Signatures
        const staffSignEl = document.getElementById('waiverStaffSignName');
        const custSignEl = document.getElementById('waiverCustSignName');
        if (staffSignEl) staffSignEl.textContent = `KTV. ${s.intakeStaff || booking.staff || 'PawPal Team'}`;
        if (custSignEl) custSignEl.textContent = booking.customerName || 'Chủ nuôi';

        modal.classList.add('active');
    }

    function setupIntakeWaiverModal() {
        const modal = document.getElementById('modalPrintIntakeWaiver');
        const btnClose = document.getElementById('btnCloseIntakeWaiver');
        const btnDismiss = document.getElementById('btnDismissIntakeWaiver');
        const btnPrint = document.getElementById('btnPrintIntakeWaiverAction');

        const closeModal = () => { if (modal) modal.classList.remove('active'); };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnDismiss) btnDismiss.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        if (btnPrint) {
            btnPrint.addEventListener('click', () => {
                window.print();
            });
        }
    }

    // 2. 1-Click "Thanh toán tại POS" (Service-to-POS Checkout Handshake)
    function settleBookingToPos(bookingId) {
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!booking) return;

        const posPayload = {
            bookingId: booking.id,
            userId: booking.userId || 'USER-001',
            customerName: booking.customerName,
            phone: booking.phone,
            petName: booking.petName,
            petBreed: booking.petBreed,
            serviceName: booking.serviceName,
            serviceCode: booking.serviceCode || booking.serviceId || 'SVC-SPA',
            basePrice: booking.price,
            accompanyingServices: booking.accompanyingServices || [],
            surcharges: booking.addons || [],
            total: booking.total || booking.price,
            note: `Thanh toán ca dịch vụ ${booking.id} - ${booking.serviceName} cho bé ${booking.petName}`
        };

        sessionStorage.setItem('pawpal_pos_pending_service_checkout', JSON.stringify(posPayload));
        sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
        sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
        showToast(`Đang chuyển sang phân hệ Bán hàng (POS) để tạo đơn thanh toán cho ca ${booking.id}...`);

        // Điều hướng sang phân hệ Bán hàng
        window.location.hash = '#tab-order-list';
        const sidebarOrderBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Bán hàng');
        if (sidebarOrderBtn) {
            sidebarOrderBtn.click();
        }
    }

    // 3. Mở Modal Báo khách đón bé qua Zalo / SMS
    let currentNotifyBooking = null;

    function openNotifyPickupModal(bookingId) {
        const modal = document.getElementById('modalNotifyPickup');
        const booking = bookingsData.find(b => b.id === bookingId);
        if (!modal || !booking) return;
        currentNotifyBooking = booking;

        const metaEl = document.getElementById('notifyPickupMeta');
        const svcNameEl = document.getElementById('notifyPickupServiceName');
        const totalCostEl = document.getElementById('notifyPickupTotalCost');
        const staffNameEl = document.getElementById('notifyPickupStaffName');
        const belongingsEl = document.getElementById('notifyPickupBelongings');
        const msgTextarea = document.getElementById('notifyPickupMessageText');

        if (metaEl) metaEl.textContent = `Mã ca: ${booking.id} • Bé: ${booking.petName} (${booking.petBreed}) • Chủ nuôi: ${booking.customerName} (${booking.phone})`;
        if (svcNameEl) svcNameEl.textContent = booking.serviceName || 'Dịch vụ PawPal';
        if (totalCostEl) totalCostEl.textContent = formatCurrency(booking.total || booking.price);
        if (staffNameEl) staffNameEl.textContent = booking.staff || 'KTV PawPal';

        const belongings = booking.belongings || (booking.intakeSafety && booking.intakeSafety.belongings) || 'Không có';
        if (belongingsEl) belongingsEl.textContent = belongings;

        const defaultChannelRadio = modal.querySelector('input[name="pickupChannel"]:checked');
        const channel = defaultChannelRadio ? defaultChannelRadio.value : 'Zalo ZNS';

        if (msgTextarea) {
            msgTextarea.value = buildPickupMessageTemplate(booking, channel);
        }

        modal.classList.add('active');
    }

    function buildPickupMessageTemplate(booking, channel = 'Zalo ZNS') {
        const branch = booking.branch || 'PawPal Chi nhánh Quận 1 (123 Nguyễn Huệ, Q.1)';
        const totalText = formatCurrency(booking.total || booking.price);
        const belongings = booking.belongings || (booking.intakeSafety && booking.intakeSafety.belongings);
        const belongingsText = (belongings && belongings !== 'Không có') ? ` (Đã kèm tư trang: ${belongings})` : '';

        if (channel.includes('Zalo')) {
            return `[PAWPAL PET CARE] Kính gửi Quý khách ${booking.customerName},\n\n` +
                `Bé ${booking.petName} đã hoàn thành xuất sắc ca chăm sóc [${booking.serviceName}] tại ${branch}!\n\n` +
                `Hiện bé đang rất thơm tho, khỏe mạnh và sẵn sàng chờ ba mẹ ghé đón${belongingsText}.\n` +
                `Tổng chi phí thanh toán: ${totalText} (${booking.paymentStatus || 'Thanh toán tại quầy'}).\n\n` +
                `Kính mời Quý khách ghé cơ sở trước 20:00 hôm nay hoặc liên hệ hotline 1900 8888 nếu cần hỗ trợ xe Pet Taxi đưa đón bé tận nơi. PawPal trân trọng cảm ơn!`;
        } else {
            return `[PAWPAL] Be ${booking.petName} da hoan tat goi ${booking.serviceName} tai ${branch}. Moi Quy khach ${booking.customerName} den don be truoc 20h. Tong tien: ${totalText}. Hotline: 19008888.`;
        }
    }

    function setupNotifyPickupModal() {
        const modal = document.getElementById('modalNotifyPickup');
        const form = document.getElementById('formNotifyPickup');
        const btnClose = document.getElementById('btnCloseNotifyPickup');
        const btnCancel = document.getElementById('btnCancelNotifyPickup');
        const btnReset = document.getElementById('btnResetNotifyTemplate');
        const msgTextarea = document.getElementById('notifyPickupMessageText');

        const closeModal = () => { if (modal) modal.classList.remove('active'); };
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        modal?.querySelectorAll('input[name="pickupChannel"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (currentNotifyBooking && msgTextarea) {
                    msgTextarea.value = buildPickupMessageTemplate(currentNotifyBooking, radio.value);
                }
            });
        });

        if (btnReset) {
            btnReset.addEventListener('click', () => {
                if (!currentNotifyBooking || !msgTextarea) return;
                const channel = modal.querySelector('input[name="pickupChannel"]:checked')?.value || 'Zalo ZNS';
                msgTextarea.value = buildPickupMessageTemplate(currentNotifyBooking, channel);
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!currentNotifyBooking) return;

                const channel = modal.querySelector('input[name="pickupChannel"]:checked')?.value || 'Zalo ZNS';
                const includeCarelog = document.getElementById('notifyIncludeCarelogLink')?.checked;
                const logTimeline = document.getElementById('notifyLogTimelineEvent')?.checked;
                const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                if (logTimeline) {
                    currentNotifyBooking.timeline = currentNotifyBooking.timeline || [];
                    currentNotifyBooking.timeline.push({
                        time: timeNow,
                        title: `Báo khách đón bé (${channel})`,
                        desc: `Đã gửi thông báo hoàn thành ca dịch vụ cho chủ nuôi ${currentNotifyBooking.customerName} (${currentNotifyBooking.phone}) qua ${channel}.${includeCarelog ? ' Kèm link nhật ký Care-Log.' : ''}`,
                        done: true,
                        staff: currentNotifyBooking.staff || 'CSKH',
                        images: []
                    });
                    persistData();
                    renderBookingDetail(currentNotifyBooking.id);
                }

                closeModal();
                showToast(`Đã gửi thông báo đón bé ${currentNotifyBooking.petName} thành công qua ${channel} tới SĐT ${currentNotifyBooking.phone}!`);
            });
        }
    }

    // ==========================================================================
    // 7E. LỊCH TRỰC VÀ ĐIỀU PHỐI KỸ THUẬT VIÊN (MODAL 14)
    // ==========================================================================
    let currentStaffScheduleShiftFilter = 'ALL';

    function renderStaffScheduleCards(filterShift = 'ALL') {
        currentStaffScheduleShiftFilter = filterShift;
        const grid = document.getElementById('staffScheduleGrid');
        if (!grid) return;

        const totalStaffEl = document.getElementById('summaryTotalStaffCount');
        const totalBookingsEl = document.getElementById('summaryTotalAssignedBookings');
        const avgCapacityEl = document.getElementById('summaryAvgCapacity');
        const overloadedEl = document.getElementById('summaryOverloadedCount');

        let totalAssigned = 0;
        let overloadedCount = 0;

        STAFF_DIRECTORY.forEach(staff => {
            const bookings = getStaffActiveBookings(staff.name);
            totalAssigned += bookings.length;
            if (bookings.length >= staff.maxCapacity) {
                overloadedCount++;
            }
        });

        const totalCapacitySlots = STAFF_DIRECTORY.length * 4;
        const avgCap = Math.round((totalAssigned / totalCapacitySlots) * 100);

        if (totalStaffEl) totalStaffEl.textContent = `${STAFF_DIRECTORY.length}`;
        if (totalBookingsEl) totalBookingsEl.textContent = `${totalAssigned} ca`;
        if (avgCapacityEl) avgCapacityEl.textContent = `${avgCap}%`;
        if (overloadedEl) overloadedEl.textContent = `${overloadedCount}`;

        grid.innerHTML = STAFF_DIRECTORY.map(staff => {
            const allActiveBookings = getStaffActiveBookings(staff.name);
            const count = allActiveBookings.length;
            const max = staff.maxCapacity;
            const pct = Math.min(100, Math.round((count / max) * 100));

            // Lọc theo ca trực nếu người dùng chọn
            const filteredBookings = (filterShift === 'ALL')
                ? allActiveBookings
                : allActiveBookings.filter(b => getShiftForBooking(b) === filterShift);

            let statusBadge = '';
            let barColor = '#236B48';
            let cardClass = 'staff-schedule-card';

            if (count >= max) {
                statusBadge = '<span class="admin-badge badge-danger">Đầy ca</span>';
                barColor = '#DC2626';
                cardClass += ' is-overloaded';
            } else if (count >= max - 1) {
                statusBadge = '<span class="admin-badge badge-warning">Tải cao</span>';
                barColor = '#D97706';
            } else if (count > 0) {
                statusBadge = '<span class="admin-badge badge-info">Đang nhận ca</span>';
                barColor = '#236B48';
            } else {
                statusBadge = '<span class="admin-badge badge-success">Khả dụng</span>';
                barColor = '#236B48';
            }

            const initials = staff.name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();

            const bookingsHtml = filteredBookings.length > 0
                ? filteredBookings.map(b => {
                    const timeShort = b.time ? b.time.split('-')[0].trim() : '14:00';
                    return `
                        <div class="staff-assigned-booking-item">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong style="color: #236B48; font-weight: 700;">${timeShort}</strong>
                                <span style="color: var(--text-main);">${b.petName} • ${b.serviceName}</span>
                            </div>
                            <button type="button" class="staff-assigned-booking-link" data-bkg-id="${b.id}">Chi tiết</button>
                        </div>
                    `;
                }).join('')
                : `<div style="font-size: 12px; color: var(--text-muted); padding: 10px 0; text-align: center;">${filterShift === 'ALL' ? 'Chưa có ca hẹn' : 'Không có ca trong khung giờ này'}</div>`;

            return `
                <div class="${cardClass}">
                    <div class="staff-schedule-card-header">
                        <div class="staff-card-left">
                            <div class="staff-avatar-initials">
                                ${initials}
                            </div>
                            <div>
                                <div class="staff-meta-name">${staff.name}</div>
                                <div class="staff-meta-role">${staff.role}</div>
                            </div>
                        </div>
                        <div>
                            ${statusBadge}
                        </div>
                    </div>

                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
                            <span style="color: var(--text-muted);">Công suất:</span>
                            <span style="font-weight: 700; color: ${barColor};">${count}/${max} ca</span>
                        </div>
                        <div class="staff-workload-bar-wrap">
                            <div class="staff-workload-bar-fill" style="width: ${pct}%; background-color: ${barColor};"></div>
                        </div>
                    </div>

                    <div class="staff-assigned-bookings-list" style="margin-top: 4px;">
                        ${bookingsHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Gắn sự kiện bấm vào link "Chi tiết" ca
        grid.querySelectorAll('.staff-assigned-booking-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bkgId = e.currentTarget.getAttribute('data-bkg-id');
                const modal = document.getElementById('modalStaffSchedule');
                if (modal) modal.classList.remove('active');
                if (bkgId) openBookingDetail(bkgId);
            });
        });
    }

    function openStaffScheduleModal() {
        const modal = document.getElementById('modalStaffSchedule');
        if (!modal) return;
        renderStaffScheduleCards('ALL');
        modal.classList.add('active');
    }

    function setupStaffScheduleModal() {
        const modal = document.getElementById('modalStaffSchedule');
        const btnOpen = document.getElementById('btnOpenStaffScheduleModal');
        const btnClose = document.getElementById('btnCloseStaffSchedule');
        const btnDismiss = document.getElementById('btnDismissStaffSchedule');
        const btnNavStaff = document.getElementById('btnNavToStaffModule');

        const closeModal = () => { if (modal) modal.classList.remove('active'); };
        if (btnOpen) btnOpen.addEventListener('click', openStaffScheduleModal);
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnDismiss) btnDismiss.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        if (modal) {
            modal.querySelectorAll('.staff-shift-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.staff-shift-tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const shift = btn.getAttribute('data-shift-filter') || 'ALL';
                    renderStaffScheduleCards(shift);
                });
            });
        }

        if (btnNavStaff) {
            btnNavStaff.addEventListener('click', () => {
                closeModal();
                sessionStorage.setItem('pawpal_admin_active_module', 'Nhân sự');
                sessionStorage.setItem('pawpal_admin_staff_subtab', 'tab-staff-list');
                showToast('Đang chuyển sang phân hệ Quản lý Nhân sự...');
                window.location.hash = '#tab-staff-list';
                const sidebarStaffBtn = Array.from(document.querySelectorAll('.sidebar-menu-btn')).find(b => b.getAttribute('data-title') === 'Nhân sự');
                if (sidebarStaffBtn) sidebarStaffBtn.click();
            });
        }
    }

    // Thiết lập Supabase Realtime Subscription cho phân hệ Dịch vụ
    function setupServicesRealtimeSubscription() {
        try {
            const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (client && typeof client.channel === 'function') {
                if (window._pawpalServicesRealtimeChannel) {
                    try { client.removeChannel(window._pawpalServicesRealtimeChannel); } catch (e) {}
                }
                const channelName = 'pawpal-services-realtime-' + Date.now();
                window._pawpalServicesRealtimeChannel = client.channel(channelName)
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, async (payload) => {
                        console.log('Realtime Supabase Appointment updated in Services:', payload);
                        await loadServicesData();
                        renderBookingsTable();
                        updateKPIs();
                        renderUpcomingBar();
                        if (selectedBookingId) openBookingDetail(selectedBookingId);
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'service' }, async (payload) => {
                        console.log('Realtime Supabase Service updated:', payload);
                        await loadServicesData();
                        renderCatalogTable();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'review' }, async (payload) => {
                        console.log('Realtime Supabase Review updated in Services:', payload);
                        await loadServicesData();
                        renderReviewsTable();
                        updateReviewKPIs();
                    })
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'care_log' }, async (payload) => {
                        console.log('Realtime Supabase Care Log updated in Services:', payload);
                        await loadServicesData();
                        if (selectedBookingId) openBookingDetail(selectedBookingId);
                    })
                    .subscribe();
            }
        } catch (err) {
            console.warn('Không thể khởi tạo Supabase Realtime cho Services:', err);
        }
    }

    // ==========================================================================
    // 10. KHỞI CHẠY PHÂN HỆ
    // ==========================================================================
    async function init() {
        await loadServicesData();
        if (sessionStorage.getItem('pawpal_admin_active_module') && sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') {
            return;
        }
        setupHeaderSubtabs();
        renderUpcomingBar();
        updateKPIs();
        renderBookingsTable();
        renderCatalogTable();
        renderReviewsTable();
        updateReviewKPIs();
        setupFilterEvents();
        setupModals();
        setupChangeStaffModal();
        setupCompleteBookingModal();
        setupSopDetailsModal();
        setupIntakeWaiverModal();
        setupNotifyPickupModal();
        setupStaffScheduleModal();
        setupActionDropdownEvents();
        setupServicesRealtimeSubscription();
    }

    // Chạy khởi tạo
    init();

    // Xuất API toàn cục
    window.PawpalServicesModule = {
        init: init,
        switchSubtab: switchSubtab,
        openBookingDetail: openBookingDetail,
        openStaffScheduleModal: openStaffScheduleModal
    };
})();

