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
        selectedBookingId: sessionStorage.getItem('pawpal_admin_service_selected_id') || null
    };

    PawpalServices.escapeHtml = function(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    function assertHandoverReady(booking) {
        if(booking?.status!=='in_progress') throw new Error('Chỉ hoàn tất ca đang thực hiện.');
        const intake=booking.intakeRecord;
        if(!intake || !Number.isFinite(Date.parse(intake.recordedAt)) || !/^[0-9a-f-]{36}$/i.test(intake.staffId||'') || !(intake.actualWeight>0)) throw new Error('Ca chưa có biên bản tiếp nhận hợp lệ đã lưu.');
    }
    PawpalServices.assertHandoverReady=assertHandoverReady;
    function recordPattern(kind) { return new RegExp('\\[Pawpal '+kind+' v1\\]\\n([\\s\\S]*?)\\n\\[\\/Pawpal '+kind+'\\]\\n?'); }
    function readBookingRecord(note,kind) {
        const match=String(note||'').match(recordPattern(kind));
        if(!match) return null;
        return Object.fromEntries(match[1].split('\n').filter(Boolean).map(line=>line.split('\t').map(decodeURIComponent)));
    }
    const recordSaves=new Set();
    PawpalServices.saveBookingRecord=async function(booking,kind,record,payload) {
        if(recordSaves.has(booking.dbId)) throw new Error('Đang lưu hồ sơ, vui lòng chờ.');
        recordSaves.add(booking.dbId);
        try {
            if(!['intake','handover'].includes(kind)) throw new Error('Loại biên bản không hợp lệ.');
            const block='[Pawpal '+kind+' v1]\n'+Object.entries(record).map(pair=>pair.map(value=>encodeURIComponent(String(value))).join('\t')).join('\n')+'\n[/Pawpal '+kind+']\n';
            const note=block+String(booking.rawNote||'').replace(recordPattern(kind),'');
            let query=window.getSupabaseClient().from('appointment').update({...payload,note}).eq('id',booking.dbId).eq('appointment_status',booking.rawStatus).eq('total_price',booking.total);
            query=booking.rawNote==null ? query.is('note',null) : query.eq('note',booking.rawNote);
            const {data,error}=await query.select('id,appointment_status,note,staff_id,payment_status,total_price').single();
            if(error) throw error;
            if(!data?.id || data.note!==note || data.appointment_status!==payload.appointment_status) throw new Error('Không xác minh được biên bản đã lưu.');
            if(payload.staff_id && data.staff_id!==payload.staff_id) throw new Error('Không xác minh được nhân viên tiếp nhận.');
            if (window.PawpalDataStore) {
                window.PawpalDataStore.invalidate('services:bookings*');
                window.PawpalDataStore.invalidate(`services:carelogs:${booking.dbId}`);
                window.PawpalDataStore.invalidate('dashboard:*');
                window.PawpalDataStore.emitMutation({ entity: 'appointment', type: 'UPDATE', id: booking.dbId });
            }
            await PawpalServices.loadServicesData({force:true});
            PawpalServices.subtabs.bookings?.renderBookingsTable();
            PawpalServices.subtabs.bookings?.updateKPIs();
            PawpalServices.subtabs.detail?.renderBookingDetail(booking.id);
        } finally {recordSaves.delete(booking.dbId);}
    };
    const financePattern = /\[Pawpal charges v1\]\n([\s\S]*?)\n\[\/Pawpal charges\]\n?/;
    function readCharges(note) {
        const match = String(note || '').match(financePattern);
        if (!match) return [];
        return match[1].split('\n').filter(Boolean).map(line => {
            const [id, kind, amount, name, reason, staff, serviceId] = line.split('\t').map(decodeURIComponent);
            if (!['surcharge', 'service'].includes(kind) || !Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error('Chi tiết chi phí đã lưu không hợp lệ.');
            return { id, kind, amount: Number(amount), name, reason, staff, serviceId };
        });
    }
    PawpalServices.readCharges = readCharges;
    const savingCharges = new Set();
    PawpalServices.saveCharges = async function(booking, charges) {
        if (savingCharges.has(booking.dbId)) throw new Error('Đang lưu chi phí, vui lòng chờ.');
        savingCharges.add(booking.dbId);
        try {
            if (!['pending', 'confirmed', 'in_progress'].includes(booking.status) || booking.paymentStatus === 'Đã thanh toán') throw new Error('Ca đã kết thúc hoặc đã thanh toán, không thể đổi chi phí.');
            if (charges.some(c => !Number.isSafeInteger(c.amount) || c.amount <= 0 || !c.name)) throw new Error('Số tiền phải là số nguyên dương.');
            const db = window.getSupabaseClient();
            const oldCharges = readCharges(booking.rawNote);
            const total = Number(booking.total) - oldCharges.reduce((sum,c)=>sum+c.amount,0) + charges.reduce((sum,c)=>sum+c.amount,0);
            const block = charges.length ? '[Pawpal charges v1]\n' + charges.map(c => [c.id,c.kind,c.amount,c.name,c.reason||'',c.staff||'',c.serviceId||''].map(value=>encodeURIComponent(String(value))).join('\t')).join('\n') + '\n[/Pawpal charges]\n' : '';
            const note = block + String(booking.rawNote || '').replace(financePattern, '');
            let query = db.from('appointment').update({ note: note || null, total_price: total }).eq('id',booking.dbId).eq('appointment_status',booking.rawStatus).eq('total_price',booking.total);
            query = booking.rawNote == null ? query.is('note',null) : query.eq('note',booking.rawNote);
            const { data,error } = await query.select('id,total_price,note').single();
            if (error) throw error;
            if (!data?.id || Number(data.total_price)!==total || (data.note||'')!==note) throw new Error('Không xác minh được chi phí đã lưu.');
            if (window.PawpalDataStore) {
                window.PawpalDataStore.invalidate('services:bookings*');
                window.PawpalDataStore.invalidate('dashboard:*');
                window.PawpalDataStore.emitMutation({ entity: 'appointment', type: 'UPDATE', id: booking.dbId });
            }
            await PawpalServices.loadServicesData({force:true});
            PawpalServices.subtabs.bookings?.renderBookingsTable();
            PawpalServices.subtabs.detail?.renderBookingDetail(booking.id);
        } finally { savingCharges.delete(booking.dbId); }
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

        const now = Date.now();
        const createdAt = booking.created_at ? Date.parse(booking.created_at) : null;
        const waitingMinutes = createdAt ? Math.max(0, Math.floor((now - createdAt) / 60000)) : 0;

        if (booking.status === 'pending') {
            if (waitingMinutes > 30) {
                return { level: 'danger', label: `Quá hạn duyệt (${waitingMinutes}p)`, minutesLate: waitingMinutes };
            }
            if (waitingMinutes > 15) {
                return { level: 'warning', label: `Chờ duyệt (${waitingMinutes}p)`, minutesLate: waitingMinutes };
            }
            return { level: 'info', label: 'Mới tiếp nhận', minutesLate: 0 };
        }

        if (booking.status === 'confirmed') {
            if (!booking.staff) {
                return { level: 'warning', label: 'Chờ KTV tiếp nhận', minutesLate: 0 };
            }
            if (isBookingUpcoming(booking)) {
                return { level: 'info', label: 'Sắp tới giờ', minutesLate: 0 };
            }
            return { level: 'ok', label: 'Chờ đón bé', minutesLate: 0 };
        }

        if (booking.status === 'in_progress') {
            const date = booking.date || booking.appointment_date;
            const time = booking.time || booking.appointment_time;
            if (date && time) {
                const scheduledStart = Date.parse(`${String(date).slice(0, 10)}T${String(time).slice(0, 5)}:00+07:00`);
                const durationMinutes = Number(booking.duration) || 60;
                const expectedEnd = scheduledStart + (durationMinutes * 60000);
                if (Number.isFinite(expectedEnd) && now > expectedEnd) {
                    const lateMin = Math.floor((now - expectedEnd) / 60000);
                    return { level: 'danger', label: `Quá hạn SLA (${lateMin}p)`, minutesLate: lateMin };
                }
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

    // Nạp dữ liệu qua PawpalDataStore và Supabase Live Database
    const SERVICES_QUERY_TIMEOUT_MS = 12_000;

    function withServicesQueryTimeout(query) {
        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error('Truy vấn dữ liệu dịch vụ quá thời gian chờ.')), SERVICES_QUERY_TIMEOUT_MS);
        });
        return Promise.race([query, timeout]).finally(() => window.clearTimeout(timeoutId));
    }

    async function fetchBookingsRaw({ force = false } = {}) {
        const fetcher = async () => {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) throw new Error('Không thể kết nối cơ sở dữ liệu.');
            const { data, error } = await withServicesQueryTimeout(
                db.from('appointment')
                  .select(`
                      id, 
                      appointment_code,
                      customer_id,
                      pet_id,
                      appointment_date, 
                      appointment_time, 
                      appointment_status, 
                      payment_status, 
                      total_price, 
                      note, 
                      customer:customer_id (id, phone_main, customer_profile (full_name)), 
                      pet_profile:pet_id (id, customer_id, pet_code, pet_name, species, breed, weight, date_of_birth, allergy, vaccination_history, routine, avatar_url, customer:customer_id (id, phone_main, customer_profile (full_name))),
                      service:service_id (id, service_code, service_name, service_category, estimated_duration, checklist, benefits, amenities), 
                      staff:staff_id (id, full_name, role)
                  `)
                  .order('created_at', { ascending: false })
            );
            if (error) throw error;
            return data || [];
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('services:bookings', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.OPERATIONAL,
                force
            });
        }
        return fetcher();
    }

    async function fetchStaffRaw({ force = false } = {}) {
        const fetcher = async () => {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) return [];
            const { data, error } = await withServicesQueryTimeout(
                db.from('staff')
                  .select('id, full_name, role, specialization, phone_number')
                  .order('full_name', { ascending: true })
            );
            if (error) {
                console.warn('[PawpalServices] Lỗi nạp staff:', error);
                return [];
            }
            return data || [];
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('services:staff', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                force
            });
        }
        return fetcher();
    }

    async function fetchCatalogRaw({ force = false } = {}) {
        const fetcher = async () => {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) return { services: [], prices: [] };
            const [svcRes, priceRes] = await Promise.all([
                withServicesQueryTimeout(db.from('service').select('*').order('service_code', { ascending: true })),
                withServicesQueryTimeout(db.from('service_price_matrix').select('*'))
            ]);
            if (svcRes.error) throw svcRes.error;
            return {
                services: svcRes.data || [],
                prices: priceRes.data || [],
                priceError: priceRes.error ? priceRes.error.message : null
            };
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('services:catalog', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                force
            });
        }
        return fetcher();
    }

    async function fetchReviewsRaw({ force = false } = {}) {
        const fetcher = async () => {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) return [];
            const { data, error } = await withServicesQueryTimeout(
                db.from('review')
                  .select('id, appointment_id, rating, review_content, review_type, created_at, shop_reply, customer:customer_id(id, phone_main, customer_profile(full_name)), service:service_id(id, service_name, service_category), appointment:appointment_id(appointment_code, staff:staff_id(full_name))')
                  .eq('review_type', 'SERVICE')
                  .order('created_at', { ascending: false })
            );
            if (error) throw error;
            return data || [];
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch('services:reviews', fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.LIST,
                force
            });
        }
        return fetcher();
    }

    async function fetchBookingCareLogs(bookingDbId) {
        if (!bookingDbId) return [];
        const fetcher = async () => {
            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (!db) return [];
            const { data, error } = await withServicesQueryTimeout(
                db.from('care_log')
                  .select('id, appointment_id, pet_id, care_action_id, description, health_status, recorded_at, created_at, care_action:care_action_id(id, action_name)')
                  .eq('appointment_id', bookingDbId)
                  .order('recorded_at', { ascending: true })
            );
            if (error) {
                console.warn('[PawpalServices] Lỗi nạp care_log của ca:', error);
                return [];
            }
            return (data || []).map(log => {
                const author = String(log.description || '').match(/\n?Nhân viên: (.*) \(([0-9a-f-]{36})\)$/i);
                return {
                    ...log,
                    step_name: log.care_action?.action_name || 'Ghi nhận chăm sóc',
                    ktv: author?.[1] || '',
                    note: author ? String(log.description).slice(0, author.index).trim() : (log.description || ''),
                    images: (log.care_log_media || []).map(media => media.media_url)
                };
            });
        };

        if (window.PawpalDataStore) {
            return window.PawpalDataStore.fetch(`services:carelogs:${bookingDbId}`, fetcher, {
                ttlMs: window.PawpalDataStore.TTL_TIERS.OPERATIONAL
            });
        }
        return fetcher();
    }
    PawpalServices.fetchBookingCareLogs = fetchBookingCareLogs;

    async function loadCatalogData({ force = false } = {}) {
        try {
            const { services, prices, priceError } = await fetchCatalogRaw({ force });
            PawpalServices.state.auxiliaryErrors = PawpalServices.state.auxiliaryErrors || {};
            PawpalServices.state.auxiliaryErrors.price = priceError;

            PawpalServices.state.servicesData = (services || []).map(svc => {
                let group = 'spa';
                const codeUpper = String(svc.service_code || '').toUpperCase();
                const catUpper = String(svc.service_category || '').toUpperCase();
                const nameUpper = String(svc.service_name || '').toUpperCase();

                if (codeUpper.startsWith('HTL') || catUpper === 'PET_HOTEL' || catUpper.includes('HOTEL') || nameUpper.includes('PHÒNG') || nameUpper.includes('SUITE') || nameUpper.includes('DAYCARE')) {
                    group = 'hotel';
                } else if (codeUpper.startsWith('TXI') || catUpper === 'PET_TAXI' || catUpper.includes('TAXI') || nameUpper.includes('ĐƯA ĐÓN') || nameUpper.includes('PET TAXI')) {
                    group = 'taxi';
                }

                const svcPrices = (prices || []).filter(p => p.service_id === svc.id);
                const defaultPriceLabel = priceError ? 'Lỗi tải giá' : 'Chưa có giá';
                const pricesObj = {
                    under5: defaultPriceLabel,
                    to10: defaultPriceLabel,
                    to20: defaultPriceLabel,
                    over20: defaultPriceLabel
                };

                let minPriceVal = null;
                if (svcPrices.length > 0) {
                    const validPrices = svcPrices.map(p => Number(p.unit_price) || 0).filter(p => p > 0);
                    if (validPrices.length > 0) minPriceVal = Math.min(...validPrices);
                    svcPrices.forEach(p => {
                        const formatted = (Number(p.unit_price) || 0).toLocaleString('vi-VN');
                        if (p.weight_to <= 5) pricesObj.under5 = formatted;
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
            return PawpalServices.state.servicesData;
        } catch (err) {
            console.error('[PawpalServices] Lỗi nạp danh mục dịch vụ:', err);
            return [];
        }
    }
    PawpalServices.loadCatalogData = loadCatalogData;

    async function loadReviewsData({ force = false } = {}) {
        try {
            const rawReviews = await fetchReviewsRaw({ force });
            const getCustomerProfileName = (customer) => {
                const profile = customer?.customer_profile;
                if (Array.isArray(profile)) return profile.find(p => p?.full_name)?.full_name || '';
                return profile?.full_name || '';
            };

            PawpalServices.state.reviewsData = (rawReviews || []).map(r => {
                let cat = 'Spa';
                const sName = r.service?.service_name || '';
                const serviceCategory = String(r.service?.service_category || '').toUpperCase();
                if (serviceCategory === 'PET_HOTEL' || sName.includes('Hotel') || sName.includes('Phòng')) cat = 'Hotel';
                else if (serviceCategory === 'PET_TAXI' || sName.includes('Taxi') || sName.includes('Đón')) cat = 'Taxi';

                return {
                    id: r.id,
                    reviewCode: `ĐG-${String(r.id || '').slice(0, 8).toUpperCase()}`,
                    dbId: r.id,
                    bookingId: r.appointment?.appointment_code || '—',
                    customerName: getCustomerProfileName(r.customer) || 'Khách hàng PawPal',
                    phone: r.customer?.phone_main || '—',
                    serviceName: sName || 'Dịch vụ Spa và Grooming',
                    category: cat,
                    staff: r.appointment?.staff?.full_name || 'Chưa có thông tin',
                    rating: Number.isFinite(Number(r.rating)) && Number(r.rating) >= 1 && Number(r.rating) <= 5 ? Number(r.rating) : 0,
                    comment: r.review_content || '—',
                    status: r.shop_reply ? 'replied' : 'pending',
                    replyText: r.shop_reply || ''
                };
            });
            return PawpalServices.state.reviewsData;
        } catch (err) {
            console.error('[PawpalServices] Lỗi nạp đánh giá:', err);
            return [];
        }
    }
    PawpalServices.loadReviewsData = loadReviewsData;

    async function loadServicesData({ force = false } = {}) {
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db) { PawpalServices.state.loadError = 'Không thể kết nối cơ sở dữ liệu.'; return; }

        try {
            PawpalServices.state.loadError = null;
            const [rawBookings, rawStaff] = await Promise.all([
                fetchBookingsRaw({ force }),
                fetchStaffRaw({ force })
            ]);

            PawpalServices.state.liveStaffList = rawStaff;

            const getCustomerProfileName = (customer) => {
                const profile = customer?.customer_profile;
                if (Array.isArray(profile)) return profile.find(p => p?.full_name)?.full_name || '';
                return profile?.full_name || '';
            };

            PawpalServices.state.bookingsData = (rawBookings || []).map((item, idx) => {
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

                const customerName = getCustomerProfileName(item.customer) || getCustomerProfileName(item.pet_profile?.customer) || 'Chưa cập nhật tên khách hàng';
                const phone = item.customer?.phone_main || item.pet_profile?.customer?.phone_main || '—';
                const petName = item.pet_profile?.pet_name || 'Pet cưng';
                const petBreed = item.pet_profile?.breed || 'Thú cưng';
                const serviceName = item.service?.service_name || 'Dịch vụ Spa';
                const rawStaffName = item.staff?.full_name || '';
                const staff = rawStaffName && !rawStaffName.includes('@') ? rawStaffName : null;
                const petWeight = Number(item.pet_profile?.weight) > 0 ? `${item.pet_profile.weight} kg` : 'Chưa cập nhật';
                const petAllergy = item.pet_profile?.allergy && !/^(không|none)$/i.test(item.pet_profile.allergy.trim()) ? item.pet_profile.allergy : (item.note && item.note.toLowerCase().includes('dị ứng') ? item.note : null);

                const taxiMatch = String(item.note || '').match(/\[Pawpal Taxi v1\]\nĐón: ([^\n]+)\nTrả: ([^\n]+)\nHình thức: ([^\n]+)\nCự ly: ([0-9.]+)\nBảng giá: ([^\n]+)\n\[\/Pawpal Taxi\]$/);
                const taxiInfo = cat === 'Taxi' && taxiMatch ? {
                    pickupAddress: taxiMatch[1], dropoffAddress: taxiMatch[2],
                    tripType: taxiMatch[3], distanceKm: Number(taxiMatch[4])
                } : {};
                const intake = readBookingRecord(item.note, 'intake');
                const intakeRecord = intake ? { ...intake, actualWeight: Number(intake.actualWeight), belongings: (intake.belongings || '').split(', ').filter(Boolean), proofPhotos: [] } : null;
                const charges = readCharges(item.note);

                return {
                    id: item.appointment_code || (item.id ? `BKG-${item.id.replace(/-/g, '').slice(0, 8).toUpperCase()}` : `BKG-${1000 + idx}`),
                    dbId: item.id,
                    rawStatus: item.appointment_status,
                    staffId: item.staff?.id || null,
                    rawNote: item.note,
                    petDbId: item.pet_id,
                    serviceDbId: item.service?.id,
                    serviceCategory: item.service?.service_category,
                    userId: item.customer_id || null,
                    customerName,
                    phone,
                    ...taxiInfo,
                    customerNote: taxiMatch ? String(item.note || '').slice(0, taxiMatch.index).replace(financePattern, '').replace(recordPattern('intake'),'').replace(recordPattern('handover'),'').trim() : String(item.note || '').replace(financePattern, '').replace(recordPattern('intake'),'').replace(recordPattern('handover'),'').trim(),
                    petName,
                    petBreed,
                    petId: item.pet_profile?.pet_code || 'PET-001',
                    petWeight: intakeRecord ? `${intakeRecord.actualWeight} kg` : petWeight,
                    petAge: item.pet_profile?.date_of_birth ? (() => { const months = Math.floor((Date.now()-Date.parse(item.pet_profile.date_of_birth))/2629800000); return months >= 12 ? `${Math.floor(months/12)} tuổi` : months >= 0 ? `${months} tháng` : 'Chưa cập nhật'; })() : 'Chưa cập nhật',
                    petAlert: petAllergy,
                    category: cat,
                    categoryName: cat === 'Hotel' ? 'Pet Hotel' : (cat === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming'),
                    serviceName,
                    duration: item.service?.estimated_duration ? `${item.service.estimated_duration} phút` : '60 phút',
                    date: item.appointment_date || '',
                    time: item.appointment_time ? item.appointment_time.substring(0, 5) : '',
                    staff,
                    intakeRecord,
                    handoverRecord: readBookingRecord(item.note, 'handover'),
                    originalWeight: petWeight,
                    charges,
                    surcharges: charges.filter(c => c.kind === 'surcharge'),
                    accompanyingServices: charges.filter(c => c.kind === 'service').map(c => ({ ...c, price: c.amount, note: c.reason })),
                    price: Number(item.total_price || 0) - charges.reduce((sum, c) => sum + c.amount, 0),
                    total: item.total_price || 0,
                    paymentStatus: item.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chưa thu',
                    status,
                    alertType: isBookingUpcoming({ status, date: item.appointment_date, time: item.appointment_time }) ? 'upcoming' : null,
                    careLogs: [],
                    _careLogsLoaded: false
                };
            });

            PawpalServices.state.isLoaded = true;

            // Nạp trước danh mục và đánh giá nếu rảnh tay
            if (PawpalServices.state.servicesData.length === 0) {
                loadCatalogData({ force: false }).catch(() => {});
            }
            if (PawpalServices.state.reviewsData.length === 0) {
                loadReviewsData({ force: false }).catch(() => {});
            }
        } catch (err) {
            PawpalServices.state.loadError = 'Không thể tải dữ liệu dịch vụ. Vui lòng tải lại trang.';
            console.error('[PawpalServices] Lỗi kết nối Supabase:', err);
        }
    }
    PawpalServices.loadServicesData = loadServicesData;

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'appointment') {
                window.PawpalDataStore.invalidate('services:bookings*');
                if (mutation.id) {
                    window.PawpalDataStore.invalidate(`services:carelogs:${mutation.id}`);
                }
            } else if (mutation.entity === 'service' || mutation.entity === 'service_price_matrix') {
                window.PawpalDataStore.invalidate('services:catalog*');
            } else if (mutation.entity === 'staff') {
                window.PawpalDataStore.invalidate('services:staff*');
            }
        });
    }

    // Quản lý Header Subtabs & Breadcrumb
    function updateBreadcrumb(bookingCode) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Dịch vụ') return;
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        if (bookingCode) {
            deepBreadcrumbEl.innerHTML = `
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-detail-name">${PawpalServices.escapeHtml(bookingCode)}</span>
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
            const bId = PawpalServices.state.selectedBookingId || null;
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
            if (!PawpalServices.state.servicesData || PawpalServices.state.servicesData.length === 0) {
                loadCatalogData().then(() => {
                    PawpalServices.subtabs.catalog?.renderCatalogTable();
                });
            } else {
                PawpalServices.subtabs.catalog.renderCatalogTable();
            }
        } else if (subtabId === 'tab-service-reviews' && PawpalServices.subtabs.reviews) {
            if (!PawpalServices.state.reviewsData || PawpalServices.state.reviewsData.length === 0) {
                loadReviewsData().then(() => {
                    PawpalServices.subtabs.reviews?.renderReviewsTable();
                    PawpalServices.subtabs.reviews?.updateReviewKPIs();
                });
            } else {
                PawpalServices.subtabs.reviews.renderReviewsTable();
                PawpalServices.subtabs.reviews.updateReviewKPIs();
            }
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

    let _isServicesInit = false;
    async function initServicesModule() {
        if (_isServicesInit) {
            if (PawpalServices.subtabs.bookings?.renderBookingsTable) {
                PawpalServices.subtabs.bookings.renderBookingsTable();
                PawpalServices.subtabs.bookings.renderUpcomingBar();
                PawpalServices.subtabs.bookings.updateKPIs();
            }
            return;
        }
        _isServicesInit = true;

        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        const validTabs = ['tab-service-bookings', 'tab-service-detail', 'tab-service-catalog', 'tab-service-reviews'];

        // Tải dữ liệu ban đầu từ Supabase
        await loadServicesData();

        if (sessionStorage.getItem('pawpal_admin_services_open_booking_modal') === 'true') {
            const petCode = sessionStorage.getItem('pawpal_admin_selected_pet_code');
            const pet = window.PawpalPets?.state?.petsData?.[petCode];
            if (pet && PawpalServices.subtabs.bookings?.openForPet) {
                switchSubtab('tab-service-bookings', false);
                PawpalServices.subtabs.bookings.openForPet(pet);
                sessionStorage.removeItem('pawpal_admin_services_open_booking_modal');
            }
        }

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

        setupServicesRealtimeSync();

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

    let _servicesRealtimeChannel = null;
    function setupServicesRealtimeSync() {
        if (_servicesRealtimeChannel) return;
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!client || typeof client.channel !== 'function') return;

        try {
            const triggerServiceSync = (invalidatePattern, refreshFn) => {
                if (window.PawpalDataStore?.handleRealtimeChange) {
                    window.PawpalDataStore.handleRealtimeChange({
                        moduleName: 'Dịch vụ',
                        invalidatePattern: invalidatePattern || 'services:*',
                        onActiveRefresh: async () => {
                            await loadServicesData({ force: true });
                            if (typeof refreshFn === 'function') {
                                refreshFn();
                            } else {
                                PawpalServices.subtabs?.bookings?.renderBookingsTable?.();
                                PawpalServices.subtabs?.bookings?.updateKPIs?.();
                            }
                        },
                        debounceMs: 300
                    });
                } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Dịch vụ') {
                    loadServicesData({ force: true }).then(() => {
                        PawpalServices.subtabs?.bookings?.renderBookingsTable?.();
                        PawpalServices.subtabs?.bookings?.updateKPIs?.();
                    });
                }
            };

            _servicesRealtimeChannel = client.channel('admin-services-live-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment' }, () => triggerServiceSync('services:bookings*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'service' }, () => triggerServiceSync('services:catalog*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'service_price' }, () => triggerServiceSync('services:catalog*'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'service_review' }, () => triggerServiceSync('services:reviews*'))
                .subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-services-live-sync');

            window.addEventListener('beforeunload', () => {
                if (_servicesRealtimeChannel) {
                    client.removeChannel(_servicesRealtimeChannel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-services-live-sync');
                }
            });
        } catch (e) {
            console.warn('[Services] Lỗi mở kênh realtime:', e);
        }
    }

    PawpalServices.init = initServicesModule;
    window.initServicesModule = initServicesModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initServicesModule);
    } else {
        initServicesModule();
    }
})();
