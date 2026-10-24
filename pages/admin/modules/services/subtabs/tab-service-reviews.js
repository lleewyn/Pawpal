// tab-service-reviews.js - Subtab Đánh giá chất lượng dịch vụ Pawpal-er
(function() {
    'use strict';

    const PawpalServices = window.PawpalServices = window.PawpalServices || {};
    PawpalServices.subtabs = PawpalServices.subtabs || {};

    let reviewSearchTerm = '';
    let reviewFilterStar = 'ALL';
    let reviewFilterCategory = 'ALL';
    let reviewFilterStaff = 'ALL';
    let reviewFilterStatus = 'ALL';
    let reviewFilterServiceId = null;
    let reviewFilterServiceCode = null;
    let reviewFilterServiceName = null;
    let reviewCurrentPage = 1;
    let reviewExportRows=[];
    const REVIEWS_PAGE_SIZE = 10;
    const esc = (s) => (PawpalServices.escapeHtml ? PawpalServices.escapeHtml(s) : String(s || ''));

    // Cập nhật 4 thẻ thống kê KPI Đánh giá dịch vụ
    function updateReviewKPIs() {
        const reviewsData = PawpalServices.state?.reviewsData || [];
        const isLoaded = Boolean(PawpalServices.state?.isLoaded);

        // Giữ nguyên skeleton-kpi khi chưa nạp xong
        if (!isLoaded && reviewsData.length === 0) {
            return;
        }

        const ratedReviews = reviewsData.filter(r => Number.isFinite(Number(r.rating)) && Number(r.rating) >= 1 && Number(r.rating) <= 5);
        let avgRating = '—';
        if (ratedReviews.length > 0) {
            const sumStars = ratedReviews.reduce((acc, r) => acc + Number(r.rating), 0);
            avgRating = (sumStars / ratedReviews.length).toFixed(1) + ' / 5.0';
        }

        const pendingCount = reviewsData.filter(r => !r.replyText && r.status !== 'replied').length;
        const lowStarCount = ratedReviews.filter(r => Number(r.rating) <= 3).length;

        const statAvg = document.getElementById('statAvgRating');
        const statTotal = document.getElementById('statTotalReviews');
        const statPending = document.getElementById('statPendingReviews');
        const statLow = document.getElementById('statLowRatingReviews');

        const total = reviewsData.length;
        if (statAvg) statAvg.textContent = avgRating;
        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pendingCount;
        if (statLow) statLow.textContent = lowStarCount;
    }

    // Hiển thị thanh thông báo khi đang lọc theo gói dịch vụ cụ thể
    function renderActiveFilterBanner() {
        let banner = document.getElementById('serviceReviewFilterBanner');
        if (!reviewFilterServiceId && !reviewFilterServiceCode) {
            if (banner) banner.remove();
            return;
        }

        const subtab = document.getElementById('subtab-tab-service-reviews');
        const masterCard = subtab?.querySelector('.service-master-card');
        if (!masterCard) return;

        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'serviceReviewFilterBanner';
            banner.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: #EEF5F1; border-radius: 9px; padding: 10px 16px; margin-bottom: 14px; font-size: 13px; color: #236B48; border: 1px solid #C3DEC7;';
            masterCard.parentNode.insertBefore(banner, masterCard);
        }

        const label = reviewFilterServiceName || reviewFilterServiceCode || 'Gói dịch vụ đã chọn';
        banner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>Đang hiển thị đánh giá cho gói: <strong style="font-weight: 700; color: #236B48;">${esc(label)}</strong></span>
            </div>
            <button type="button" id="btnClearServiceReviewFilter" style="background: none; border: none; color: #DC2626; font-size: 12.5px; cursor: pointer; font-weight: 600; padding: 2px 6px;">✕ Bỏ lọc gói</button>
        `;

        document.getElementById('btnClearServiceReviewFilter')?.addEventListener('click', () => {
            reviewFilterServiceId = null;
            reviewFilterServiceCode = null;
            reviewFilterServiceName = null;
            renderActiveFilterBanner();
            renderReviewsTable();
            updateReviewKPIs();
        });
    }

    // Hiển thị bảng danh sách Đánh giá
    function renderReviewsTable() {
        const tbody = document.getElementById('servicesReviewTableBody') || document.getElementById('servicesReviewsTableBody');
        if (!tbody) return;

        const reviewsData = PawpalServices.state?.reviewsData || [];
        const isLoaded = Boolean(PawpalServices.state?.isLoaded);
        if (PawpalServices.state?.loadError) {
            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:28px;">Không thể tải đánh giá dịch vụ. Vui lòng tải lại trang.</td></tr>';
            return;
        }
        const toUnaccent = PawpalServices.toUnaccent || (str => {
            if (!str) return '';
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        });

        const filtered = reviewsData.filter(r => {
            if (reviewFilterServiceId || reviewFilterServiceCode) {
                const matchId = (r.serviceId && r.serviceId === reviewFilterServiceId) ||
                                (r.serviceDbId && r.serviceDbId === reviewFilterServiceId);
                const matchCode = reviewFilterServiceCode && r.serviceCode && r.serviceCode.toUpperCase() === reviewFilterServiceCode.toUpperCase();
                const matchName = reviewFilterServiceName && r.serviceName && r.serviceName.toLowerCase().includes(reviewFilterServiceName.toLowerCase());
                if (!matchId && !matchCode && !matchName) return false;
            }

            if (reviewSearchTerm) {
                const termUnaccent = toUnaccent(reviewSearchTerm);
                const termRaw = reviewSearchTerm.toLowerCase().trim();
                const matchCust = toUnaccent(r.customerName || '').includes(termUnaccent) || (r.customerName || '').toLowerCase().includes(termRaw);
                const matchComment = toUnaccent(r.comment || '').includes(termUnaccent);
                const matchBooking = (r.bookingId || '').toLowerCase().includes(termRaw);
                const matchReview = (r.reviewCode || r.id || '').toLowerCase().includes(termRaw);
                const matchPhone = (r.phone || '').includes(termRaw);
                if (!matchCust && !matchComment && !matchBooking && !matchReview && !matchPhone) return false;
            }

            if (reviewFilterStar !== 'ALL') {
                const rStar = Number.isFinite(Number(r.rating)) && Number(r.rating) >= 1 && Number(r.rating) <= 5 ? Math.round(Number(r.rating)) : null;
                if (reviewFilterStar === 'LOW') {
                    if (rStar === null || rStar > 3) return false;
                } else if (rStar === null || parseInt(reviewFilterStar, 10) !== rStar) {
                    return false;
                }
            }

            if (reviewFilterCategory !== 'ALL' && r.category !== reviewFilterCategory) {
                return false;
            }

            if (reviewFilterStaff !== 'ALL' && r.staff !== reviewFilterStaff) {
                return false;
            }

            if (reviewFilterStatus !== 'ALL') {
                const isReplied = Boolean(r.replyText || r.status === 'replied');
                if (reviewFilterStatus === 'replied' && !isReplied) return false;
                if (reviewFilterStatus === 'pending' && isReplied) return false;
                if (reviewFilterStatus === 'escalated' && !r.hasServiceTicket) return false;
            }

            return true;
        });

        reviewExportRows=filtered;
        if (filtered.length === 0) {
            if (!isLoaded) {
                tbody.dataset.loadingSkeleton = 'true';
                tbody.innerHTML = Array.from({ length: 4 }, (_, i) => `
                    <tr class="skeleton-row admin-auto-skeleton">
                        <td><span class="skeleton-text" style="width: 80px;"></span></td>
                        <td>
                            <span class="skeleton-text" style="width: 100px; margin-bottom: 4px;"></span>
                            <span class="skeleton-text" style="width: 70px; height: 11px;"></span>
                        </td>
                        <td><span class="skeleton-text" style="width: 110px;"></span></td>
                        <td><span class="skeleton-text" style="width: 70px;"></span></td>
                        <td><span class="skeleton-text" style="width: 80px;"></span></td>
                        <td><span class="skeleton-text" style="width: 140px;"></span></td>
                        <td><span class="skeleton-badge"></span></td>
                        <td style="text-align: center;"><span class="skeleton-text" style="width: 24px;"></span></td>
                    </tr>
                `).join('');
                return;
            }

            delete tbody.dataset.loadingSkeleton;
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 36px 16px; font-size: 13.5px; border-left: 3px solid transparent;">
                        Không có đánh giá nào phù hợp với bộ lọc hiện tại.
                    </td>
                </tr>
            `;
            renderReviewsPagination(0);
            return;
        }

        // Xóa thuộc tính loading skeleton nếu có
        delete tbody.dataset.loadingSkeleton;

        const totalPages = Math.ceil(filtered.length / REVIEWS_PAGE_SIZE);
        if (reviewCurrentPage > totalPages) reviewCurrentPage = totalPages;
        if (reviewCurrentPage < 1) reviewCurrentPage = 1;

        const startIndex = (reviewCurrentPage - 1) * REVIEWS_PAGE_SIZE;
        const pageItems = filtered.slice(startIndex, startIndex + REVIEWS_PAGE_SIZE);

        tbody.innerHTML = pageItems.map(r => {
            const isReplied = Boolean(r.replyText || r.status === 'replied');
            const hasValidRating = Number.isFinite(Number(r.rating)) && Number(r.rating) >= 1 && Number(r.rating) <= 5;
            const starNum = hasValidRating ? Math.round(Number(r.rating)) : null;
            const starsHtml = starNum !== null ? ('★'.repeat(starNum) + '☆'.repeat(5 - starNum)) : '<span style="color: var(--text-muted); font-size: 11px;">Chưa chấm</span>';
            const isLowRating = starNum !== null && starNum <= 3;
            const borderLeftStyle = isLowRating ? 'border-left: 3px solid #D97706;' : 'border-left: 3px solid transparent;';

            return `
                <tr data-review-id="${esc(r.id)}">
                    <td style="${borderLeftStyle} font-weight: 600; color: var(--text-heading);">
                        <div>${esc(r.bookingId || '—')}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${esc(r.reviewCode || r.id)}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${esc(r.customerName)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${esc(r.phone || '—')}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500; color: var(--text-main);">${esc(r.serviceName)}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${r.category === 'Hotel' ? 'Pet Hotel' : (r.category === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming')}</div>
                    </td>
                    <td style="color: #D97706; font-size: 13.5px; letter-spacing: 1px; white-space: nowrap;">
                        ${starsHtml} <span style="font-size: 12px; font-weight: 600; color: var(--text-main); margin-left: 2px;">${starNum}★</span>
                    </td>
                    <td class="service-review-content-cell" style="max-width: 260px; font-size: 12.5px; line-height: 1.45;">
                        <div class="review-comment-text" style="color: var(--text-main);">${esc(r.comment || 'Khách không để lại nhận xét bằng lời.')}</div>
                        ${isReplied ? `<div class="review-reply-box" style="margin-top: 6px; padding: 6px 10px; background: #EEF5F1; border-radius: 6px; font-size: 11.5px; color: #236B48; line-height: 1.45;"><span style="font-weight: 600;">Phản hồi:</span> ${esc(r.replyText)}</div>` : ''}
                    </td>
                    <td>${esc(r.staff || 'Chưa phân công')}</td>
                    <td>
                        <span class="admin-badge ${isReplied ? 'badge-success' : 'badge-warning'}">
                            ${isReplied ? 'Đã phản hồi' : 'Chờ phản hồi'}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reply-review" data-review-id="${esc(r.id)}" style="padding: 4px 10px; font-size: 12px;">
                            ${isReplied ? 'Sửa' : 'Phản hồi'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Gắn sự kiện mở modal phản hồi
        tbody.querySelectorAll('.btn-reply-review').forEach(btn => {
            btn.addEventListener('click', () => {
                const rId = btn.getAttribute('data-review-id');
                openReplyReviewModal(rId);
            });
        });

        renderReviewsPagination(totalPages);
    }

    // Render thanh phân trang chuẩn Rule 1 (Căn giữa, không nền, không viền, nút < và >)
    function renderReviewsPagination(totalPages) {
        const pagContainer = document.getElementById('servicesReviewsPagination');
        if (!pagContainer) return;

        if (totalPages <= 1) {
            pagContainer.style.display = 'none';
            pagContainer.innerHTML = '';
            return;
        }

        pagContainer.style.display = 'flex';
        let html = '';

        const prevDisabled = reviewCurrentPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disabled' : ''}>&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === reviewCurrentPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = reviewCurrentPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled' : ''}>&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAttr = btn.getAttribute('data-page');
                if (pageAttr === 'prev') {
                    if (reviewCurrentPage > 1) {
                        reviewCurrentPage--;
                        renderReviewsTable();
                    }
                } else if (pageAttr === 'next') {
                    if (reviewCurrentPage < totalPages) {
                        reviewCurrentPage++;
                        renderReviewsTable();
                    }
                } else {
                    const p = parseInt(pageAttr, 10);
                    if (p && p !== reviewCurrentPage) {
                        reviewCurrentPage = p;
                        renderReviewsTable();
                    }
                }
            });
        });
    }

    // Mẫu câu phản hồi theo chuẩn dịch vụ PawPal
    const REVIEW_REPLY_PRESETS = {
        'PRESET_THANK_5': 'PawPal chân thành cảm ơn quý khách đã tin yêu và lựa chọn dịch vụ của chúng tôi! Rất hân hạnh được đồng hành và chăm sóc bé cưng ở các lần hẹn tới.',
        'PRESET_ACK_4': 'PawPal trân trọng cảm ơn sự tin tưởng và góp ý quý báu của quý khách. Đội ngũ xin ghi nhận và sẽ không ngừng cải tiến nâng cao chất lượng dịch vụ hơn nữa.',
        'PRESET_APOLOGY_LOW': 'PawPal thành thật cáo lỗi cùng quý khách và bé vì trải nghiệm chưa trọn vẹn này. Quản lý phụ trách sẽ liên hệ trực tiếp để lắng nghe và có phương án chăm sóc hỗ trợ chu đáo nhất.',
        'PRESET_EXPLAIN': 'PawPal xin ghi nhận phản ánh của quý khách. Do đặc thù tình trạng lông và sức khỏe của bé trong ca thực tế, đội ngũ sẽ kiểm tra lại nhật ký ca làm việc và giải thích chi tiết tới quý khách ngay.'
    };

    // Mở modal phản hồi đánh giá
    function openReplyReviewModal(reviewId) {
        const reviewsData = PawpalServices.state?.reviewsData || [];
        const review = reviewsData.find(r => r.id === reviewId);
        const modal = document.getElementById('modalReplyReview');
        if (!modal || !review) return;

        const headerMetaEl = document.getElementById('reviewModalHeaderMeta') || document.getElementById('replyReviewCustomerInfo');
        const commentEl = document.getElementById('reviewModalCustomerComment') || document.getElementById('replyReviewComment');
        const staffMetaEl = document.getElementById('reviewModalStaffMeta');
        const textInput = document.getElementById('replyReviewText');
        const hiddenId = document.getElementById('replyReviewIdHidden');
        const presetSelect = document.getElementById('replyPresetSelect');
        const voucherSelect = document.getElementById('replyVoucherSelect');
        const btnEscalate = document.getElementById('btnEscalateToComplaint');

        const starNum = Number(review.rating) || 5;
        if (headerMetaEl) {
            headerMetaEl.textContent = `${review.customerName} • ${review.bookingId || review.id} • ${starNum}.0 ★ (${review.serviceName})`;
        }
        if (commentEl) {
            commentEl.textContent = `"${review.comment || 'Khách không để lại nhận xét bằng lời.'}"`;
        }
        if (staffMetaEl) {
            staffMetaEl.textContent = `KTV phụ trách: ${review.staff || 'Chưa phân công'}`;
        }
        if (hiddenId) {
            hiddenId.value = reviewId;
        }
        if (textInput) {
            textInput.value = review.replyText || '';
        }
        if (presetSelect) {
            presetSelect.value = 'CUSTOM';
        }
        if (voucherSelect) {
            voucherSelect.value = 'NONE';
        }

        // Hiện nút Chuyển thành khiếu nại nếu đánh giá <= 3 sao
        if (btnEscalate) {
            btnEscalate.style.display = starNum <= 3 ? 'inline-block' : 'none';
        }

        modal.setAttribute('data-review-id', reviewId);
        modal.classList.add('active');
    }

    // Đóng modal phản hồi
    function closeReplyReviewModal() {
        const modal = document.getElementById('modalReplyReview');
        if (modal) modal.classList.remove('active');
    }

    // Khởi tạo các sự kiện lọc, tìm kiếm và nút thao tác
    function initReviewsSubtab() {
        const searchInput = document.getElementById('reviewSearchInput');
        let reviewSearchTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(reviewSearchTimer);
                reviewSearchTimer = setTimeout(() => {
                    reviewSearchTerm = searchInput.value.trim();
                    reviewCurrentPage = 1;
                    renderReviewsTable();
                }, 300);
            });
        }

        const filterStar = document.getElementById('reviewFilterStar');
        if (filterStar) {
            filterStar.addEventListener('change', () => {
                reviewFilterStar = filterStar.value;
                reviewCurrentPage = 1;
                renderReviewsTable();
            });
        }

        const filterCategory = document.getElementById('reviewFilterCategory');
        if (filterCategory) {
            filterCategory.addEventListener('change', () => {
                reviewFilterCategory = filterCategory.value;
                reviewCurrentPage = 1;
                renderReviewsTable();
            });
        }

        const filterStaff = document.getElementById('reviewFilterStaff');
        if (filterStaff) {
            // Nạp danh sách KTV vào select nếu chưa có
            const staffList = PawpalServices.state?.liveStaffList || [];
            if (staffList.length > 0 && filterStaff.options.length <= 1) {
                staffList.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.full_name;
                    opt.textContent = s.full_name;
                    filterStaff.appendChild(opt);
                });
            }

            filterStaff.addEventListener('change', () => {
                reviewFilterStaff = filterStaff.value;
                reviewCurrentPage = 1;
                renderReviewsTable();
            });
        }

        const filterStatus = document.getElementById('reviewFilterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                reviewFilterStatus = filterStatus.value;
                reviewCurrentPage = 1;
                renderReviewsTable();
            });
        }

        // Bấm vào thẻ KPI để lọc nhanh
        document.querySelectorAll('.services-kpi-grid .kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-review-filter');
                if (!filter) return;

                if (filter === 'ALL') {
                    reviewFilterStar = 'ALL';
                    reviewFilterStatus = 'ALL';
                    if (filterStar) filterStar.value = 'ALL';
                    if (filterStatus) filterStatus.value = 'ALL';
                } else if (filter === 'pending') {
                    reviewFilterStatus = 'pending';
                    if (filterStatus) filterStatus.value = 'pending';
                } else if (filter === 'low_rating') {
                    reviewFilterStar = 'LOW';
                    if (filterStar) filterStar.value = 'LOW';
                }
                reviewCurrentPage = 1;
                renderReviewsTable();
            });
        });

        // Dropdown mẫu câu trả lời chuyên nghiệp
        const presetSelect = document.getElementById('replyPresetSelect');
        if (presetSelect) {
            presetSelect.addEventListener('change', () => {
                const textInput = document.getElementById('replyReviewText');
                if (textInput && REVIEW_REPLY_PRESETS[presetSelect.value]) {
                    textInput.value = REVIEW_REPLY_PRESETS[presetSelect.value];
                    textInput.focus();
                }
            });
        }

        // Chip gợi ý một chạm tự điền câu trả lời nhanh
        const quickChips = document.getElementById('quickReviewReplyChips');
        if (quickChips) {
            quickChips.querySelectorAll('.reason-quick-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const textInput = document.getElementById('replyReviewText');
                    if (textInput) {
                        textInput.value = chip.textContent.trim();
                        textInput.focus();
                    }
                });
            });
        }

        // Nút Chuyển thành khiếu nại (đối với đánh giá <= 3 sao)
        const btnEscalate = document.getElementById('btnEscalateToComplaint');
        if (btnEscalate) {
            btnEscalate.addEventListener('click', async () => {
                const modal = document.getElementById('modalReplyReview');
                const rId = modal?.getAttribute('data-review-id');
                const reviewsData = PawpalServices.state?.reviewsData || [];
                const review = reviewsData.find(r => r.id === rId);

                closeReplyReviewModal();
                try{const booking=await PawpalServices.ensureBooking(review?.appointmentId);PawpalServices.openServiceTicket(booking,review);}catch(error){PawpalServices.showToast('Không thể tải lịch hẹn liên quan.','warning');}
            });
        }

        // Nút Đóng / Hủy modal phản hồi
        const btnClose = document.getElementById('btnCloseReplyReview');
        if (btnClose) btnClose.addEventListener('click', closeReplyReviewModal);

        const btnCancel = document.getElementById('btnCancelReplyReview');
        if (btnCancel) btnCancel.addEventListener('click', closeReplyReviewModal);

        // Nút Lưu gửi phản hồi đánh giá
        const btnSubmitReply = document.getElementById('btnSubmitReplyReview');
        if (btnSubmitReply) {
            btnSubmitReply.addEventListener('click', async () => {
                const modal = document.getElementById('modalReplyReview');
                const rId = modal?.getAttribute('data-review-id');
                const text = document.getElementById('replyReviewText')?.value.trim();

                if (!text) {
                    if (PawpalServices.showToast) {
                        PawpalServices.showToast('Vui lòng nhập nội dung phản hồi!', 'warning');
                    } else {
                        alert('Vui lòng nhập nội dung phản hồi!');
                    }
                    return;
                }

                const reviewsData = PawpalServices.state?.reviewsData || [];
                const review = reviewsData.find(r => r.id === rId);
                if (!review) return;

                btnSubmitReply.disabled = true;
                btnSubmitReply.textContent = 'Đang lưu...';

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (!client) throw new Error('Chưa kết nối được CSDL.');
                    if (!review.dbId) throw new Error('Không tìm thấy định danh bản ghi đánh giá.');

                    const {data,error}=await client.rpc('reply_admin_service_review',{p_review_id:review.dbId,p_response_id:review.responseId,p_expected_updated_at:review.responseUpdatedAt,p_text:text});
                    if(error)throw error;
                    if(!data)throw Error('Không xác minh được phản hồi đã lưu.');
                    await PawpalServices.loadReviewsData({force:true});
                    renderReviewsTable();
                    updateReviewKPIs();
                    if (PawpalServices.showToast) {
                        PawpalServices.showToast('Đã gửi phản hồi đánh giá thành công!');
                    }
                    closeReplyReviewModal();
                } catch (e) {
                    console.error('Error saving review reply:', e);
                    PawpalServices.showToast?.('Không thể lưu phản hồi: ' + (e.message || 'Lỗi kết nối'), 'danger');
                } finally {
                    btnSubmitReply.disabled = false;
                    btnSubmitReply.textContent = 'Gửi phản hồi';
                }
            });
        }

        // Xuất file báo cáo
        const btnExport = document.getElementById('btnExportReviewReport');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const rows = reviewExportRows;
                if (rows.length === 0) {
                    PawpalServices.showToast?.('Không có đánh giá để xuất.', 'warning');
                    return;
                }
                const sanitizeCsvCell = (val) => {
                    let str = String(val ?? '');
                    if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
                    return `"${str.replace(/"/g, '""')}"`;
                };
                const csv = [
                    ['Mã lịch hẹn', 'Mã đánh giá', 'Khách hàng', 'Số điện thoại', 'Dịch vụ', 'Nhóm dịch vụ', 'Điểm sao', 'Nội dung đánh giá', 'Nhân viên phụ trách', 'Trạng thái phản hồi'],
                    ...rows.map(r => [
                        r.bookingId || '—', r.reviewCode || r.id, r.customerName, r.phone,
                        r.serviceName, r.category === 'Hotel' ? 'Pet Hotel' : (r.category === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming'),
                        r.rating ?? '—', r.comment, r.staff || 'Chưa có thông tin', (r.replyText || r.status === 'replied') ? 'Đã phản hồi' : 'Chưa phản hồi'
                    ])
                ].map(row => row.map(sanitizeCsvCell).join(',')).join('\r\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `bao-cao-danh-gia-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                if (PawpalServices.showToast) {
                    PawpalServices.showToast('Đã trích xuất báo cáo đánh giá dịch vụ thành công!');
                }
            });
        }

        renderActiveFilterBanner();
        renderReviewsTable();
        updateReviewKPIs();
    }

    function filterByService(serviceId, serviceCode, serviceName) {
        reviewFilterServiceId = serviceId || null;
        reviewFilterServiceCode = serviceCode || null;
        reviewFilterServiceName = serviceName || null;
        reviewCurrentPage = 1;
        renderActiveFilterBanner();
        renderReviewsTable();
        updateReviewKPIs();
    }

    PawpalServices.subtabs.reviews = {
        init: initReviewsSubtab,
        renderReviewsTable,
        updateReviewKPIs,
        openReplyReviewModal,
        closeReplyReviewModal,
        filterByService
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReviewsSubtab);
    } else {
        initReviewsSubtab();
    }
})();
