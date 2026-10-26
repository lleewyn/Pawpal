
import { API } from '/scripts/api/api.js';
import { watchCustomerTables } from '/scripts/shared/customer-realtime.mjs';
import { parseVietnamDateTimeInput } from '/scripts/shared/booking-time.mjs';
import { statusLabels, formatDate, formatPrice, openBookingCancelModal, openBookingMoveModal } from './bookings.js';
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));


function mapBookingStatus(status) {
    if (!status) return 'pending';
    const s = String(status).toLowerCase().trim();
    const mapping = {
        'dang_giu_cho':   'pending',
        'cho_xac_nhan':   'pending',
        'da_xac_nhan':    'confirmed',
        'da_check_in':    'confirmed',
        'dang_thuc_hien': 'in-progress',
        'da_hoan_tat':    'completed',
        'da_huy':         'cancelled',
        'da_het_han':     'cancelled',
        'vang_mat':       'cancelled',
        'pending':        'pending',
        'confirmed':      'confirmed',
        'in_progress':    'in-progress',
        'in-progress':    'in-progress',
        'accepted':       'confirmed',
        'completed':      'completed',
        'cancelled':      'cancelled',
        'no_show':        'cancelled'
    };
    return mapping[s] || 'pending';
}

function getBookingPrice(priceMatrix, petSpecies) {
    if (!priceMatrix?.length) return 0;
    const match = priceMatrix.find(p => p.pet_species === petSpecies);
    return (match || priceMatrix[0])?.unit_price || 0;
}

let currentBooking = null;
let currentPet = null;
let currentCareLog = null;
let bannerTimeout = null;
let currentServiceReviewRating = 0;
let detailVersion=0,detailReadVersion=0,stopDetailAuth;
const detailOwner=()=>{try{return JSON.parse(localStorage.getItem('pawpal_current_user')||'null')?.id || null;}catch{return null;}};

function getBookingIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id') || urlParams.get('bookingId');
    if (id) return id;

    const hash = window.location.hash || '';
    const qIndex = hash.indexOf('?');
    if (qIndex !== -1) {
        const hashParams = new URLSearchParams(hash.substring(qIndex + 1));
        id = hashParams.get('id') || hashParams.get('bookingId');
        if (id) return id;
    }

    return null;
}

function showBookingLoadError(message) {
    const container = document.querySelector('.booking-detail-module-container');
    if (!container) return;
    container.classList.remove('booking-detail-loading');container.setAttribute('aria-busy','false');
    container.innerHTML = '<div class="text-center py-5" role="status"><p class="text-muted"></p><a href="#bookings">Quay lại danh sách lịch hẹn</a></div>';
    container.querySelector('p').textContent = message;
}

let isInitRunning = false;
let stopDetailRealtime = null;
export function dispose(){++detailVersion;++detailReadVersion;stopDetailRealtime?.();stopDetailRealtime=null;stopDetailAuth?.();stopDetailAuth=null;clearTimeout(bannerTimeout);currentBooking=null;currentPet=null;currentCareLog=null;}
window.addEventListener('hashchange',dispose);

export async function init() {
    if (isInitRunning) return;
    dispose();const version=detailVersion,owner=detailOwner();
    const changed=()=>{dispose();showBookingLoadError('Phiên tài khoản đã thay đổi. Vui lòng mở lại lịch hẹn.');};
    const storage=event=>{if(event.key==='pawpal_current_user')changed();};
    document.addEventListener('auth_state_changed',changed);window.addEventListener('storage',storage);
    stopDetailAuth=()=>{document.removeEventListener('auth_state_changed',changed);window.removeEventListener('storage',storage);};
    isInitRunning = true;
    const loadingContainer = document.querySelector('.booking-detail-module-container');
    try {
        const bookingId = getBookingIdFromUrl();

        if (!bookingId) {
            showBookingLoadError('Không tìm thấy mã lịch hẹn.');
            return;
        }

        await loadBookingDetail(bookingId);
        if(version!==detailVersion || owner!==detailOwner() || !loadingContainer?.isConnected)return;
        stopDetailRealtime?.();
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (currentBooking && loadingContainer?.isConnected) {
            stopDetailRealtime = watchCustomerTables(db, currentBooking.userId, ['appointment','appointment_item','payment','review','hotel_booking','taxi_trip','appointment_record','appointment_adjustment','care_log'], async () => {
                if (!loadingContainer.isConnected) { stopDetailRealtime?.(); stopDetailRealtime = null; return; }
                const dirty = [...loadingContainer.querySelectorAll('#serviceReviewForm textarea')].some(el => el.value.trim());
                try { await loadBookingDetail(bookingId, dirty); } catch { if(version===detailVersion && owner===detailOwner())showToast('Không thể cập nhật lịch hẹn. Vui lòng tải lại trang.', 'error'); }
            });
        }
    } catch (error) {
        console.error('[BookingDetail] Không thể tải lịch hẹn:', error);
        if(version===detailVersion && owner===detailOwner())showBookingLoadError('Không thể tải chi tiết lịch hẹn. Vui lòng tải lại trang.');
    } finally {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            if(version!==detailVersion || owner!==detailOwner())return;
            loadingContainer?.classList.remove('booking-detail-loading');
            loadingContainer?.setAttribute('aria-busy', 'false');
            setTimeout(() => loadingContainer?.querySelector('.booking-detail-skeleton')?.remove(), 260);
        }));
        isInitRunning = false;
    }
}

export const initBookingDetail = init;
window.initBookingDetail = init;

async function loadBookingDetail(bookingId, preserveReview = false) {
    const version=detailVersion,read=++detailReadVersion,owner=detailOwner();
    const valid=()=>version===detailVersion && read===detailReadVersion && owner===detailOwner() && document.querySelector('.booking-detail-module-container')?.isConnected;
    await API.initData();
    if(!valid())return;

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');

    const remoteBookings = currentUser ? await API.getUserBookings(currentUser) : [];
    if(!valid())return;

    currentBooking = (remoteBookings || []).find(b => [b.id,b._id,b._supabaseId,b.code,b.appointment_code].some(id=>id!=null&&String(id)===String(bookingId)));

    if (!currentBooking) {
        showBookingLoadError('Không tìm thấy lịch hẹn này.');
        return;
    }
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const logistics = await db.rpc('own_service_booking_logistics', {p_booking: currentBooking._supabaseId});
    if(!valid())return;
    if (logistics.error) throw logistics.error;
    currentBooking.logistics = logistics.data;

    if (typeof window.setUserSubBreadcrumb === 'function') {
        window.setUserSubBreadcrumb(currentBooking.code || currentBooking.id || 'Chi tiết', 'bookings');
    }

    const userPets = currentUser ? await API.getUserPets(currentUser.id) : [];
    if(!valid())return;
    currentPet = userPets.find((pet) => String(pet._id || pet.id) === String(currentBooking.petId)) || null;
    const careLogs = await API.getCareLogs();
    if(!valid())return;
    currentCareLog = currentBooking.petId ? (careLogs[currentBooking.petId] || null) : null;

    const careLogButton = document.getElementById('btnViewCareLog');
    if (careLogButton) {
        careLogButton.onclick = () => {
            const petId = currentBooking.petId || currentPet?._id || currentPet?.id;
            if (!petId) {
                showToast('Không tìm thấy mã bé cưng để mở nhật ký chăm sóc.', 'error');
                return;
            }
            const sessionId = currentBooking._supabaseId || '';
            const query = `id=${encodeURIComponent(petId)}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;
            window.scrollTo(0, 0);
            window.location.hash = `#diary?${query}`;
        };
    }

    renderBookingDetail(currentBooking);
    await loadBookingExecution(db, currentBooking,valid);
    if(!valid())return;
    if (!preserveReview) await renderServiceReviewSection(currentBooking,valid);
    if(!valid())return;
    checkBookingModifiability(currentBooking);
    const cancelButton=document.getElementById('btnCancelBooking');
    if(cancelButton)cancelButton.onclick=handleCancelBooking;
    const moveButton=document.getElementById('btnChangeSchedule');
    if(moveButton)moveButton.onclick=handleChangeSchedule;

    if (window.setUserSubBreadcrumb && currentBooking) {
        window.setUserSubBreadcrumb('#' + (currentBooking.code || currentBooking.id), 'booking-detail');
    }



    if (window.location.hash === '#service-review' || window.location.hash.includes('section=service-review')) {
        setTimeout(() => {
            const target = document.getElementById('serviceReviewSection')
                        || document.querySelector('.service-review-section');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 200);
    }
}

function renderBookingDetail(booking) {
    const normalizedStatus = resolveBookingStatus(booking);
    const petName = booking.petName || currentPet?.name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const petBreed = booking.petBreed || booking.petInfo?.breed || '';
    const petWeight = booking.petWeight || booking.petInfo?.weight || '';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const servicePackage = booking.package ? ` - ${booking.package}` : '';

    const headerBadge = document.getElementById('headerStatusBadge');
    if (headerBadge) {
        headerBadge.className = `admin-badge badge-${normalizedStatus}`;
        headerBadge.textContent = statusLabels[normalizedStatus] || normalizedStatus;
    }

    const statusInfo = document.getElementById('statusInfo');
    if (statusInfo) {
        statusInfo.innerHTML = `<span class="admin-badge badge-${normalizedStatus}">${statusLabels[normalizedStatus] || normalizedStatus}</span>`;
    }

    const codeEl = document.getElementById('bookingCode');
    if (codeEl) codeEl.textContent = booking.id;

    const bannerCode = document.getElementById('bannerBookingCode');
    if (bannerCode) bannerCode.textContent = booking.id;

    const petInfoEl = document.getElementById('petInfo');
    if (petInfoEl) petInfoEl.textContent = `${petName}${petBreed || petWeight ? ` (${[petBreed, petWeight].filter(Boolean).join(', ')})` : ''}`;

    const serviceInfoEl = document.getElementById('serviceInfo');
    if (serviceInfoEl) serviceInfoEl.textContent = `${serviceName}${servicePackage}`;

    let dateTimeText = formatDate(booking.date || booking.schedule?.date);
    if (booking.timeStart) {
        dateTimeText += ` | ${booking.timeStart}${booking.timeEnd ? ` - ${booking.timeEnd}` : ''}`;
    } else if (booking.time) {
        dateTimeText += ` | ${booking.time}`;
    } else if (booking.schedule?.slot) {
        dateTimeText += ` | ${booking.schedule.slot}`;
    } else if (booking.dateEnd) {
        dateTimeText = `${dateTimeText} - ${formatDate(booking.dateEnd)}`;
    }

    const dateTimeEl = document.getElementById('dateTimeInfo');
    if (dateTimeEl) dateTimeEl.textContent = dateTimeText;
    if (dateTimeEl && booking.scheduledStartAt && booking.scheduledEndAt) {
        const stamp = value => new Date(value).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'});
        dateTimeEl.textContent = `${stamp(booking.scheduledStartAt)} — ${stamp(booking.scheduledEndAt)}`;
    }
    const serviceLines = document.getElementById('bookingServiceLines');
    if (serviceLines) {
        serviceLines.replaceChildren();
        for (const item of booking.items || []) {
            const row = document.createElement('div');row.className='booking-service-detail-row';
            const worker = booking.logistics?.item_staff?.find(w => w.item_id === item.id)?.staff_name;
            row.innerHTML=`<div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.quantity)} × ${escapeHtml(formatPrice(item.unitPrice))}${worker?` · ${escapeHtml(worker)}`:''}${Number(item.discount)?` · Giảm ${escapeHtml(formatPrice(item.discount))}`:''}</span></div><b>${escapeHtml(formatPrice(Number(item.quantity)*Number(item.unitPrice)-Number(item.discount||0)))}</b>`;
            serviceLines.appendChild(row);
        }
    }

    const staffEl = document.getElementById('staffInfo');
    if (staffEl) staffEl.textContent = booking.logistics?.staff_name || 'Chưa phân công';
    renderBookingLogistics(booking.logistics);

    const priceEl = document.getElementById('priceInfo');
    if (priceEl) priceEl.textContent = formatPrice(booking.price || 0);
    const paidEl = document.getElementById('netPaidInfo');
    if (paidEl) paidEl.textContent = new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'}).format(Number(booking.netPaid || 0));

    const noteRow = document.getElementById('noteRow');
    const noteInfo = document.getElementById('noteInfo');
    if (booking.note && noteRow && noteInfo) {
        noteRow.classList.remove('d-none');
        noteInfo.textContent = booking.note;
    } else if (noteRow) {
        noteRow.classList.add('d-none');
    }

    const careLogSection = document.getElementById('careLogActionSection');
    if (careLogSection) {
        const hasCareLog = currentCareLog && (
            currentCareLog.currentSession ||
            (Array.isArray(currentCareLog.history) && currentCareLog.history.length > 0)
        );
        careLogSection.classList.toggle('d-none', !(['in-progress','accepted','completed'].includes(normalizedStatus) || hasCareLog));
    }

    const complaintSection = document.getElementById('serviceComplaintSection');
    const complaintLink = document.getElementById('btnServiceComplaintDetail');
    if (complaintSection && complaintLink) {
        const isCompleted = normalizedStatus === 'completed';
        complaintSection.classList.toggle('d-none', !isCompleted);
        if (isCompleted) {
            complaintLink.href = `#support-create?type=service&bookingId=${encodeURIComponent(booking.id)}`;
            complaintLink.onclick = () => window.scrollTo(0, 0);
        }
    }
}

async function loadBookingExecution(db, booking,valid=()=>true) {
    let section = document.getElementById('bookingExecutionDetails');
    if (!section) {
        section = document.createElement('section'); section.id = 'bookingExecutionDetails';
        section.className = 'booking-detail-card mb-4';
        document.getElementById('bookingServiceLines')?.closest('section')?.after(section);
    }
    const stamp = value => value ? new Date(value).toLocaleString('vi-VN', {timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}) : 'Chưa ghi nhận';
    const status=resolveBookingStatus(booking);
    // A pending/cancelled request has no active care session to follow.
    section.hidden=['pending','cancelled'].includes(status);
    if(section.hidden){section.replaceChildren();return;}
    const money = value => Number(value || 0).toLocaleString('vi-VN') + 'đ';
    try {
        const result = await db.rpc('own_service_booking_execution', {p_booking:booking._supabaseId});
        if(!valid() || !section.isConnected)return;
        if (result.error) throw result.error;
        const data = result.data || {};
        if(!data.check_in_at&&!data.check_out_at&&!(data.records||[]).length&&!(data.updates||[]).length){
            section.innerHTML='<h4 class="card-section-title">Tiếp nhận và chăm sóc</h4><p class="booking-execution-empty">Bé chưa được tiếp nhận. Nhật ký sẽ xuất hiện khi nhân viên bắt đầu chăm sóc và ghi cập nhật.</p>';
        } else section.innerHTML = `<h4 class="card-section-title">Tiếp nhận và chăm sóc</h4>
            <div class="booking-execution-times"><p>Tiếp nhận thực tế <strong>${escapeHtml(stamp(data.check_in_at))}</strong></p><p>Bàn giao thực tế <strong>${escapeHtml(stamp(data.check_out_at))}</strong></p></div>
            ${(data.records || []).map(record=>`<article class="booking-execution-record"><h5>${record.record_type==='intake'?'Biên bản tiếp nhận':'Biên bản bàn giao'}</h5><span class="booking-execution-date">${escapeHtml(stamp(record.recorded_at))}</span><p>${escapeHtml(record.condition_note || 'Chưa có nội dung')}</p>${record.allergy_note_snapshot?`<p>Dị ứng: ${escapeHtml(record.allergy_note_snapshot)}</p>`:''}${record.safety_note_snapshot?`<p>Lưu ý an toàn: ${escapeHtml(record.safety_note_snapshot)}</p>`:''}<small>${record.customer_confirmation_status==='confirmed'?'Đã có xác nhận của chủ nuôi':'Chưa có xác nhận của chủ nuôi'}</small></article>`).join('') || '<p class="booking-execution-empty">Chưa có biên bản tiếp nhận hoặc bàn giao được ghi nhận.</p>'}
            <h5 class="booking-execution-heading">Cập nhật chăm sóc gần nhất</h5>
            ${(data.updates || []).map(log=>`<article class="booking-execution-update"><strong>${escapeHtml(log.action_name_snapshot)}</strong><span class="booking-execution-date">${escapeHtml(stamp(log.recorded_at))}</span><p>${escapeHtml(log.description || '')}</p>${log.observed_condition?`<p>${escapeHtml(log.observed_condition)}</p>`:''}</article>`).join('') || '<p class="booking-execution-empty">Nhân viên chưa ghi nhật ký chăm sóc cho ca này.</p>'}`;
        let costs = document.getElementById('bookingCostBreakdown');
        if (!costs) {
            costs = document.createElement('div'); costs.id = 'bookingCostBreakdown';
            document.getElementById('netPaidInfo')?.closest('.booking-specs-grid')?.append(costs);
        }
        const lineSubtotal = (booking.items || []).reduce((sum,item)=>sum+Number(item.quantity)*Number(item.unitPrice),0);
        const discounts = (booking.items || []).reduce((sum,item)=>sum+Number(item.discount||0),0);
        const row=(label,value)=>`<div class="booking-spec-row"><span class="spec-label">${escapeHtml(label)}</span><span class="spec-value">${escapeHtml(value)}</span></div>`;
        costs.innerHTML=row('Giá các dịch vụ',money(lineSubtotal))+row('Giảm giá dịch vụ',money(discounts))+
            (data.adjustments || []).map(a=>row(a.reason || 'Điều chỉnh đã duyệt',`${Number(a.amount_delta)>0?'+':''}${money(a.amount_delta)}${a.duration_delta_minutes?' · '+a.duration_delta_minutes+' phút':''}`)).join('')+
            row('Còn cần thanh toán',money(Math.max(0,Number(booking.price)-Number(booking.netPaid||0))));
    } catch {
        if(!valid() || !section.isConnected)return;
        section.innerHTML='<h4 class="card-section-title">Tiếp nhận và chăm sóc</h4><p role="alert">Chưa tải được thông tin tiếp nhận và nhật ký. Vui lòng tải lại trang.</p>';
    }
}

function renderBookingLogistics(data) {
    const section = document.getElementById('bookingLogisticsSection');
    const content = document.getElementById('bookingLogisticsInfo');
    if (!section || !content) return;
    section.classList.toggle('d-none', !data?.hotel && !data?.taxi);
    content.replaceChildren();
    const stamp = value => value ? new Date(value).toLocaleString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}) : 'Chưa xác định';
    const status = {pending:'Chờ xác nhận',reserved:'Đã giữ phòng',confirmed:'Đã xác nhận',checked_in:'Đang lưu trú',in_house:'Đang lưu trú',checked_out:'Đã trả phòng',closed:'Đã trả phòng',in_progress:'Đang thực hiện',completed:'Hoàn thành',cancelled:'Đã hủy',assigned:'Đã phân công',dispatched:'Đã điều xe',picked_up:'Đã đón',arrived:'Đã đến nơi',outbound:'Đang đi',returning:'Đang về'};
    const row = (label, value) => {
        const item = document.createElement('div'); item.className = 'booking-spec-row';
        const name = document.createElement('span'); name.className = 'spec-label'; name.textContent = label;
        const text = document.createElement('span'); text.className = 'spec-value'; text.style.whiteSpace = 'pre-wrap'; text.textContent = value ?? '—';
        item.append(name, text); content.appendChild(item);
    };
    document.getElementById('bookingLogisticsTitle').textContent = data?.hotel ? 'Thông tin lưu trú' : 'Thông tin đưa đón';
    if (data?.hotel) {
        const h = data.hotel;
        row('Mã lưu trú', h.booking_code); row('Phòng', h.room_number); row('Loại phòng', h.room_type);
        row('Nhận phòng', stamp(h.check_in_at)); row('Trả phòng dự kiến', stamp(h.check_out_at));
        row('Đơn giá mỗi 24 giờ', formatPrice(h.daily_price)); row('Trạng thái lưu trú', status[h.status] || 'Chưa xác định');
        if (h.special_diet_notes) row('Chế độ dinh dưỡng', h.special_diet_notes);
        if (h.care_notes) row('Lưu ý chăm sóc', h.care_notes);
    }
    if (data?.taxi) {
        const t = data.taxi;
        row('Địa chỉ đón', t.pickup_address); row('Địa chỉ trả', t.dropoff_address);
        row('Quãng đường', `${Number(t.distance_km).toLocaleString('vi-VN')} km`);
        row('Loại chuyến', t.trip_type === 'round_trip' ? 'Khứ hồi' : 'Một chiều');
        row('Lượt đi', stamp(t.outbound_at)); if (t.trip_type === 'round_trip') row('Lượt về', stamp(t.return_at));
        row('Nhân viên đưa đón', t.driver_name || 'Chưa phân công'); row('Giá chuyến đã chốt', formatPrice(t.quoted_amount));
        row('Trạng thái chuyến', status[t.status] || 'Chưa xác định');
    }
}

async function renderServiceReviewSection(booking,valid=()=>true) {
    const section = document.getElementById('serviceReviewSection');
    if (!section) return;
    section.classList.toggle('d-none', resolveBookingStatus(booking) !== 'completed');
    if (resolveBookingStatus(booking) !== 'completed') return;
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!section.querySelector('#serviceReviewForm')) section.querySelector('.service-review-body').textContent = 'Đang tải đánh giá…';
    const {data: reviews, error} = await db.rpc('own_service_reviews', {p_booking: booking._supabaseId});
    if (!section.isConnected || !valid()) return;
    if (error) {
        section.querySelector('.service-review-body').textContent = 'Không thể tải đánh giá. Vui lòng tải lại trang.';
        return;
    }
    const prior = new Map((reviews || []).map(r => [r.appointment_item_id, r]));
    const lines = (booking.items || []).filter(item => item.status === 'completed');
    const pending = lines.filter(item => !prior.has(item.id));
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const labels = {pending:'Chờ duyệt',published:'Đã công bố',approved:'Đã duyệt',da_duyet:'Đã duyệt',hidden:'Đã ẩn',rejected:'Không được duyệt'};
    section.querySelector('#serviceReviewStatus').textContent = pending.length ? 'Chưa đánh giá đủ' : 'Đã đánh giá';
    section.querySelector('.service-review-body').innerHTML = `<form id="serviceReviewForm" onsubmit="return false;">${lines.map((line, index) => {
        const review = prior.get(line.id);
        return `<fieldset style="border:0;padding:12px 0"><legend style="font-size:16px">${esc(line.name)}</legend>${review ?
            `<p>${review.rating}/5 — ${esc(labels[review.review_status] || 'Đã tiếp nhận')}</p><p>${esc(review.review_content)}</p>${review.shop_reply ? `<p><strong>Phản hồi cửa hàng</strong></p><p>${esc(review.shop_reply)}</p>` : ''}` :
            `<label for="serviceRating${index}">Mức đánh giá <span style="color:#DC2626">*</span></label><select class="form-select mb-3" id="serviceRating${index}" data-service-rating="${line.id}"><option value="">Chọn mức đánh giá</option>${[1,2,3,4,5].map(n => `<option value="${n}">${n}/5</option>`).join('')}</select><label for="serviceContent${index}">Nhận xét <span style="color:#DC2626">*</span></label><textarea class="form-control" id="serviceContent${index}" data-service-content="${line.id}" maxlength="3000" rows="3"></textarea>`}</fieldset>`;
    }).join('')}<p id="serviceReviewError" role="alert" style="color:#DC2626"></p>${pending.length ? '<p>Đánh giá sẽ được kiểm duyệt trước khi công bố.</p><button type="button" class="btn-detail-action btn-action-primary-green" id="btnSubmitServiceReview">Gửi đánh giá</button>' : ''}${!lines.length ? '<p>Chưa có dòng dịch vụ hoàn thành để đánh giá.</p>' : ''}</form>`;
    const form = section.querySelector('form');
    form.addEventListener('submit', e => e.preventDefault());
    form.addEventListener('input', () => { section.querySelector('#serviceReviewError').textContent = ''; });
    const button = section.querySelector('#btnSubmitServiceReview');
    const reviewOwner=detailOwner();
    const reviewKey=line=>`pawpal_service_review_request:${reviewOwner}:${booking._supabaseId}:${line.id}`;
    const ids = new Map(pending.map(line => {
        let id;try{id=sessionStorage.getItem(reviewKey(line));}catch{}
        if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||''))id=crypto.randomUUID();
        return [line.id,id];
    }));
    if (button) button.onclick = async () => {
        if(button.disabled || !valid() || !section.isConnected)return;
        const errorEl = section.querySelector('#serviceReviewError');
        errorEl.textContent = '';
        button.disabled = true;
        try {
            const payload = pending.map(line => {
                const rating = Number(section.querySelector(`[data-service-rating="${line.id}"]`).value);
                const content = section.querySelector(`[data-service-content="${line.id}"]`).value.trim();
                if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !content || content.length > 3000) throw Error('Vui lòng chọn mức đánh giá và nhập nhận xét cho từng dịch vụ.');
                return {id: ids.get(line.id), line_id: line.id, rating, content};
            });
            for(const line of pending){sessionStorage.setItem(reviewKey(line),ids.get(line.id));if(sessionStorage.getItem(reviewKey(line))!==ids.get(line.id))throw Error('Không thể giữ mã đánh giá để thử lại an toàn.');}
            const result = await db.rpc('submit_own_service_reviews', {p_booking: booking._supabaseId, p_reviews: payload});
            if(!valid() || !section.isConnected)return;
            if (result.error) throw Error(result.error.code === 'PT409' ? 'Dịch vụ đã được đánh giá. Vui lòng tải lại để xem kết quả.' : 'Không thể gửi đánh giá. Nội dung đã nhập được giữ lại để bạn thử lại.');
            if (!Array.isArray(result.data) || result.data.length !== payload.length || payload.some(item => !result.data.includes(item.id))) throw Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại với nội dung hiện tại.');
            for(const line of pending)if(sessionStorage.getItem(reviewKey(line))===ids.get(line.id))sessionStorage.removeItem(reviewKey(line));
            await renderServiceReviewSection(booking,valid);
            window.dispatchEvent(new CustomEvent('pawpal:reviewSubmitted', {detail:{bookingId: booking._supabaseId}}));
        } catch (error) {
            errorEl.textContent = error.message;
            button.disabled = false;
        }
    };
}


function checkBookingModifiability(booking) {
    const btnChange = document.getElementById('btnChangeSchedule');
    const btnCancel = document.getElementById('btnCancelBooking');

    if (!btnChange || !btnCancel) return;

    const scheduledAt = getBookingScheduledAt(booking);
    const currentStatus = resolveBookingStatus(booking);

    // 1. Nghiệp vụ Thay đổi lịch hẹn (Quy trình 3.1.5):
    // Chỉ kích hoạt khi ca hẹn ở trạng thái "Đã xác nhận" (confirmed)
    const isConfirmed = currentStatus === 'confirmed';
    const changeCount = Number(booking.changeCount || 0);
    const changeLimitReached = changeCount >= 2;

    if (!isConfirmed || changeLimitReached || !scheduledAt) {
        btnChange.classList.add('d-none');
    } else {
        btnChange.classList.remove('d-none');
        const now = new Date();
        const diffMinutes = (scheduledAt - now) / (1000 * 60);

        if (diffMinutes < 120) {
            btnChange.disabled = true;
            btnChange.classList.add('disabled');
            btnChange.setAttribute('title', 'Đã quá thời gian tự thay đổi lịch. Vui lòng gửi yêu cầu tại mục Hỗ trợ.');
        } else {
            btnChange.disabled = false;
            btnChange.classList.remove('disabled');
            btnChange.removeAttribute('title');
        }
    }

    // 2. Nghiệp vụ Hủy lịch hẹn:
    // Tuyệt đối không cho phép hủy khi: Đang thực hiện (in-progress), Đã tiếp nhận (accepted), Hoàn thành (completed), Đã hủy (cancelled)
    const nonCancellable = ['in-progress', 'accepted', 'completed', 'cancelled'];
    const canAttemptCancel = ['pending', 'confirmed'].includes(currentStatus) && !nonCancellable.includes(currentStatus);

    if (!canAttemptCancel || !scheduledAt) {
        btnCancel.classList.add('d-none');
    } else {
        btnCancel.classList.remove('d-none');
        const now = new Date();
        const diffMinutes = (scheduledAt - now) / (1000 * 60);

        if (diffMinutes < 120) {
            btnCancel.disabled = true;
            btnCancel.classList.add('disabled');
            btnCancel.setAttribute('title', 'Đã quá thời gian tự hủy lịch. Vui lòng gửi yêu cầu tại mục Hỗ trợ.');
        } else {
            btnCancel.disabled = false;
            btnCancel.classList.remove('disabled');
            btnCancel.removeAttribute('title');
        }
    }
}

function handleChangeSchedule() {
    if (!currentBooking) return;
    const id=currentBooking.id;
    openBookingMoveModal(currentBooking,()=>loadBookingDetail(id));
}
function handleCancelBooking() {
    if (!currentBooking) return;
    const id = currentBooking.id;
    openBookingCancelModal(currentBooking, () => loadBookingDetail(id));
}

function showErrorBanner() {
    const banner = document.getElementById('errorBanner');
    if (bannerTimeout) clearTimeout(bannerTimeout);
    banner.classList.remove('d-none', 'hiding');
    bannerTimeout = setTimeout(closeErrorBanner, 7000);
}

function closeErrorBanner() {
    const banner = document.getElementById('errorBanner');
    banner.classList.add('hiding');
    setTimeout(() => banner.classList.add('d-none'), 300);
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function resolveBookingStatus(booking) {
    return booking?.status || 'pending';
}

function getBookingScheduledAt(booking) {
    if (booking?.scheduledStartAt) {
        const instant = new Date(booking.scheduledStartAt);
        if (!Number.isNaN(instant.getTime())) return instant;
    }
    if (!booking?.date) return null;
    const isHotel = String(booking?.serviceCategory || booking?.category || booking?.service_type || '').toLowerCase() === 'hotel' || String(booking?.service || booking?.serviceName || '').toLowerCase().includes('hotel');
    const time = booking.timeStart || booking.time || (isHotel ? '12:00' : '09:00');
    return parseVietnamDateTimeInput(`${booking.date}T${time}`);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const banner = document.getElementById('errorBanner');
        if (banner && !banner.classList.contains('d-none')) closeErrorBanner();
    }
});

