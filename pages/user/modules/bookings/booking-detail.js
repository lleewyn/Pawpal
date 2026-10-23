
import { API } from '/scripts/api/api.js';
import { watchCustomerTables } from '/scripts/shared/customer-realtime.mjs';
import { statusLabels, formatDate, formatPrice, openBookingCancelModal, openBookingMoveModal } from './bookings.js';


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
    container.innerHTML = '<div class="text-center py-5" role="status"><p class="text-muted"></p><a href="#bookings">Quay lại danh sách lịch hẹn</a></div>';
    container.querySelector('p').textContent = message;
}

let isInitRunning = false;
let stopDetailRealtime = null;
window.addEventListener('hashchange', () => { stopDetailRealtime?.(); stopDetailRealtime = null; });

export async function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    const loadingContainer = document.querySelector('.booking-detail-module-container');
    try {
        const bookingId = getBookingIdFromUrl();

        if (!bookingId) {
            showBookingLoadError('Không tìm thấy mã lịch hẹn.');
            return;
        }

        await loadBookingDetail(bookingId);
        stopDetailRealtime?.();
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (currentBooking && loadingContainer?.isConnected) {
            stopDetailRealtime = watchCustomerTables(db, currentBooking.userId, ['appointment','appointment_item','payment','review'], async () => {
                if (!loadingContainer.isConnected) { stopDetailRealtime?.(); stopDetailRealtime = null; return; }
                const dirty = [...loadingContainer.querySelectorAll('#serviceReviewForm textarea')].some(el => el.value.trim());
                try { await loadBookingDetail(bookingId, dirty); } catch { showToast('Không thể cập nhật lịch hẹn. Vui lòng tải lại trang.', 'error'); }
            });
        }
    } catch (error) {
        console.error('[BookingDetail] Không thể tải lịch hẹn:', error);
        showBookingLoadError('Không thể tải chi tiết lịch hẹn. Vui lòng tải lại trang.');
    } finally {
        requestAnimationFrame(() => requestAnimationFrame(() => {
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
    await API.initData();

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');

    const remoteBookings = currentUser ? await API.getUserBookings(currentUser) : [];

    currentBooking = (remoteBookings || []).find(b => [b.id,b._id,b._supabaseId,b.code,b.appointment_code].some(id=>id!=null&&String(id)===String(bookingId)));

    if (!currentBooking) {
        showBookingLoadError('Không tìm thấy lịch hẹn này.');
        return;
    }

    if (typeof window.setUserSubBreadcrumb === 'function') {
        window.setUserSubBreadcrumb(currentBooking.code || currentBooking.id || 'Chi tiết', 'bookings');
    }

    const userPets = currentUser ? await API.getUserPets(currentUser.id) : [];
    currentPet = userPets.find((pet) => String(pet._id || pet.id) === String(currentBooking.petId)) || null;
    const careLogs = await API.getCareLogs();
    currentCareLog = currentBooking.petId ? (careLogs[currentBooking.petId] || null) : null;

    const careLogButton = document.getElementById('btnViewCareLog');
    if (careLogButton) {
        careLogButton.onclick = () => {
            const petId = currentBooking.petId || currentPet?._id || currentPet?.id;
            if (!petId) {
                showToast('Không tìm thấy mã bé cưng để mở nhật ký chăm sóc.', 'error');
                return;
            }
            const sessionId = currentBooking.id || '';
            const query = `id=${encodeURIComponent(petId)}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;
            window.scrollTo(0, 0);
            window.location.hash = `#diary?${query}`;
        };
    }

    renderBookingDetail(currentBooking);
    if (!preserveReview) await renderServiceReviewSection(currentBooking);
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
        const stamp = value => new Date(value).toLocaleString('vi-VN', {hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'});
        dateTimeEl.textContent = `${stamp(booking.scheduledStartAt)} — ${stamp(booking.scheduledEndAt)}`;
    }
    const serviceLines = document.getElementById('bookingServiceLines');
    if (serviceLines) {
        serviceLines.replaceChildren();
        for (const item of booking.items || []) {
            const row = document.createElement('p');
            row.textContent = `${item.name} — ${item.quantity} × ${formatPrice(item.unitPrice)}${Number(item.discount) ? `; giảm ${formatPrice(item.discount)}` : ''}`;
            serviceLines.appendChild(row);
        }
    }

    const staffEl = document.getElementById('staffInfo');
    if (staffEl) staffEl.textContent = booking.staff || 'Chưa phân công';

    const priceEl = document.getElementById('priceInfo');
    if (priceEl) priceEl.textContent = formatPrice(booking.price || 0);
    const paidEl = document.getElementById('netPaidInfo');
    if (paidEl) paidEl.textContent = formatPrice(booking.netPaid || 0);

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
        careLogSection.classList.toggle('d-none', !(normalizedStatus === 'completed' && hasCareLog));
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

async function renderServiceReviewSection(booking) {
    const section = document.getElementById('serviceReviewSection');
    if (!section) return;
    section.classList.toggle('d-none', resolveBookingStatus(booking) !== 'completed');
    if (resolveBookingStatus(booking) !== 'completed') return;
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!section.querySelector('#serviceReviewForm')) section.querySelector('.service-review-body').textContent = 'Đang tải đánh giá…';
    const {data: reviews, error} = await db.rpc('own_service_reviews', {p_booking: booking._supabaseId});
    if (!section.isConnected) return;
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
    const ids = new Map(pending.map(line => [line.id, crypto.randomUUID()]));
    if (button) button.onclick = async () => {
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
            const result = await db.rpc('submit_own_service_reviews', {p_booking: booking._supabaseId, p_reviews: payload});
            if (result.error) throw Error(result.error.code === 'PT409' ? 'Dịch vụ đã được đánh giá. Vui lòng tải lại để xem kết quả.' : 'Không thể gửi đánh giá. Nội dung đã nhập được giữ lại để bạn thử lại.');
            if (!Array.isArray(result.data) || result.data.length !== payload.length || payload.some(item => !result.data.includes(item.id))) throw Error('Chưa xác nhận được kết quả lưu. Vui lòng thử lại với nội dung hiện tại.');
            await renderServiceReviewSection(booking);
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
            btnChange.setAttribute('title', 'Đã quá thời gian tự thay đổi lịch tự động (< 2 tiếng). Vui lòng gọi Hotline để được hỗ trợ.');
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
            btnCancel.setAttribute('title', 'Đã quá thời gian tự hủy lịch tự động (< 2 tiếng). Vui lòng gọi Hotline để được hỗ trợ.');
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
    if (!booking?.date) return null;
    const isHotel = String(booking?.serviceCategory || booking?.category || booking?.service_type || '').toLowerCase() === 'hotel' || String(booking?.service || booking?.serviceName || '').toLowerCase().includes('hotel');
    const time = booking.timeStart || booking.time || (isHotel ? '12:00' : '09:00');
    const scheduled = new Date(`${booking.date}T${time}:00`);
    return Number.isNaN(scheduled.getTime()) ? null : scheduled;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const banner = document.getElementById('errorBanner');
        if (banner && !banner.classList.contains('d-none')) closeErrorBanner();
    }
});

