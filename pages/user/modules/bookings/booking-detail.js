
import { API } from '/scripts/api/api.js';
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

async function loadBookingDetail(bookingId) {
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
    await renderServiceReviewSection(currentBooking);
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

    const staffEl = document.getElementById('staffInfo');
    if (staffEl) staffEl.textContent = booking.staff || 'Chưa phân công';

    const priceEl = document.getElementById('priceInfo');
    if (priceEl) priceEl.textContent = formatPrice(booking.price || 0);

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

async function loadServiceReviewFromSupabase(booking) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const apptId = booking?._supabaseId || booking?.id;
    if (!db || !apptId) return null;
    try {
        const { data, error } = await db
            .from('review')
            .select('id, rating, review_content, created_at, shop_reply')
            .eq('appointment_id', apptId)
            .in('review_type', ['dich_vu', 'SERVICE'])
            .maybeSingle();
        if (error) {
            console.warn('[BookingDetail] Lỗi kiểm tra đánh giá từ Supabase:', error);
            return null;
        }
        return data ? {
            id: data.id,
            rating: Number(data.rating),
            comment: data.review_content || '',
            replyText: data.shop_reply || '',
            createdAt: data.created_at
        } : null;
    } catch (e) {
        console.warn('[BookingDetail] Exception khi nạp đánh giá từ Supabase:', e);
        return null;
    }
}

async function renderServiceReviewSection(booking) {
    const section = document.getElementById('serviceReviewSection');
    if (!section) return;

    const normalizedStatus = resolveBookingStatus(booking);
    section.classList.toggle('d-none', normalizedStatus !== 'completed');
    if (normalizedStatus !== 'completed') return;

    const statusEl = document.getElementById('serviceReviewStatus');
    const hintEl = document.getElementById('serviceReviewHint');
    const textarea = document.getElementById('serviceReviewComment');
    const submitBtn = document.getElementById('btnSubmitServiceReview');

    const reviewKey = getServiceReviewKey(booking);
    const localReview = loadServiceReview(reviewKey);

    function applyReviewToUI(rev) {
        if (!rev) return;
        currentServiceReviewRating = Number(rev.rating || 0);
        if (statusEl) statusEl.textContent = 'Đã đánh giá';
        if (hintEl) hintEl.textContent = `Bạn đã đánh giá ${rev.rating}/5 sao.`;
        if (textarea) {
            textarea.value = rev.comment || rev.review_content || '';
            textarea.disabled = true;
        }
        syncServiceStarUI(currentServiceReviewRating);
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đã gửi đánh giá';
        }
    }

    if (localReview) {
        applyReviewToUI(localReview);
    } else {
        currentServiceReviewRating = 0;
        if (statusEl) statusEl.textContent = 'Chưa đánh giá';
        if (hintEl) hintEl.textContent = 'Hãy chọn mức độ hài lòng của bạn.';
        if (textarea) {
            textarea.value = '';
            textarea.disabled = false;
        }
        syncServiceStarUI(0);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Gửi đánh giá';
            submitBtn.onclick = handleSubmitServiceReview;
        }
    }

    // Kiểm tra đồng bộ từ Supabase
    const remoteRev = await loadServiceReviewFromSupabase(booking);
    if (remoteRev) {
        localStorage.setItem(reviewKey, JSON.stringify({
            bookingId: booking.id,
            service: booking.service || booking.serviceName || 'Dịch vụ PawPal',
            rating: remoteRev.rating,
            comment: remoteRev.comment,
            createdAt: remoteRev.createdAt
        }));
        applyReviewToUI(remoteRev);
    }

    const starButtons = document.querySelectorAll('#serviceStarRow .service-star-btn');
    starButtons.forEach((btn) => {
        btn.onclick = () => {
            if (textarea?.disabled) return;
            currentServiceReviewRating = Number(btn.dataset.rating || 0);
            syncServiceStarUI(currentServiceReviewRating);
        };
    });
}

function syncServiceStarUI(rating) {
    document.querySelectorAll('#serviceStarRow .service-star-btn').forEach((btn) => {
        const value = Number(btn.dataset.rating || 0);
        btn.classList.toggle('active', value <= rating && rating > 0);
    });
}

async function handleSubmitServiceReview() {
    if (!currentBooking) return;

    if (!currentServiceReviewRating) {
        showToast('Vui lòng chọn số sao đánh giá.', 'error');
        return;
    }

    const apptId = currentBooking._supabaseId || currentBooking.id;
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const commentEl = document.getElementById('serviceReviewComment');
    const commentText = commentEl ? commentEl.value.trim() : '';
    const submitBtn = document.getElementById('btnSubmitServiceReview');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang gửi đánh giá...';
    }

    try {
        let savedDbReview = null;
        if (db && apptId) {
            const { data: appt, error: apptErr } = await db
                .from('appointment')
                .select('id, customer_id, service_id, appointment_status')
                .eq('id', apptId)
                .maybeSingle();

            if (apptErr) throw apptErr;

            if (appt) {
                const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                const customerId = appt.customer_id || currentUser?.id;
                const serviceId = appt.service_id || currentBooking.serviceId || currentBooking.serviceDbId;

                const { data: inserted, error: insErr } = await db
                    .from('review')
                    .insert([{
                        appointment_id: appt.id,
                        customer_id: customerId,
                        service_id: serviceId,
                        review_type: 'dich_vu',
                        rating: currentServiceReviewRating,
                        review_content: commentText,
                        review_status: 'da_duyet'
                    }])
                    .select()
                    .single();

                if (insErr) {
                    if (insErr.code === '23505' || insErr.message?.includes('duplicate') || insErr.message?.includes('unique')) {
                        console.warn('[BookingDetail] Lịch hẹn này đã có đánh giá trong hệ thống.');
                    } else {
                        throw insErr;
                    }
                } else {
                    savedDbReview = inserted;
                }
            }
        }

        const reviewKey = getServiceReviewKey(currentBooking);
        const review = {
            id: savedDbReview?.id || `rev-local-${Date.now()}`,
            bookingId: currentBooking.id,
            service: currentBooking.service || currentBooking.serviceName || currentBooking.selectedService?.name || 'Dịch vụ PawPal',
            rating: currentServiceReviewRating,
            comment: commentText,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(reviewKey, JSON.stringify(review));

        const statusEl = document.getElementById('serviceReviewStatus');
        const hintEl = document.getElementById('serviceReviewHint');
        if (statusEl) statusEl.textContent = 'Đã đánh giá';
        if (hintEl) hintEl.textContent = `Bạn đã đánh giá ${currentServiceReviewRating}/5 sao.`;
        if (commentEl) commentEl.disabled = true;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đã gửi đánh giá';
        }

        showServiceReviewToast('Cảm ơn bạn đã gửi đánh giá cho dịch vụ này.');
    } catch (err) {
        console.error('[BookingDetail] Lỗi lưu đánh giá:', err);
        showToast('Không thể gửi đánh giá: ' + (err.message || 'Lỗi kết nối'), 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Gửi đánh giá';
        }
    }
}

function showServiceReviewToast(message) {
    let container = document.getElementById('service-review-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'service-review-toast-container';
        container.style.cssText = 'position:fixed;top:92px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:360px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'background:#2d7d46;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 8px 22px rgba(0,0,0,.15);font-size:0.92rem;';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
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
    toast.innerHTML = `<div class="toast-content"><span class="toast-message">${message}</span></div>`;
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

