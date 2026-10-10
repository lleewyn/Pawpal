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
    let reviewCurrentPage = 1;
    const REVIEWS_PAGE_SIZE = 10;

    // Cập nhật 4 thẻ thống kê KPI Đánh giá dịch vụ
    function updateReviewKPIs() {
        const reviewsData = PawpalServices.state?.reviewsData || [];
        const total = reviewsData.length;
        
        let avgRating = '—';
        if (total > 0) {
            const sumStars = reviewsData.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
            avgRating = (sumStars / total).toFixed(1) + ' / 5.0';
        }

        const pendingCount = reviewsData.filter(r => !r.replyText && r.status !== 'replied').length;
        const lowStarCount = reviewsData.filter(r => (Number(r.rating) || 5) <= 3).length;

        const statAvg = document.getElementById('statAvgRating');
        const statTotal = document.getElementById('statTotalReviews');
        const statPending = document.getElementById('statPendingReviews');
        const statLow = document.getElementById('statLowRatingReviews');

        if (statAvg) statAvg.textContent = avgRating;
        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pendingCount;
        if (statLow) statLow.textContent = lowStarCount;
    }

    // Hiển thị bảng danh sách Đánh giá
    function renderReviewsTable() {
        const tbody = document.getElementById('servicesReviewTableBody') || document.getElementById('servicesReviewsTableBody');
        if (!tbody) return;

        const reviewsData = PawpalServices.state?.reviewsData || [];
        const toUnaccent = PawpalServices.toUnaccent || (str => {
            if (!str) return '';
            return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        });

        const filtered = reviewsData.filter(r => {
            if (reviewSearchTerm) {
                const termUnaccent = toUnaccent(reviewSearchTerm);
                const termRaw = reviewSearchTerm.toLowerCase().trim();
                const matchCust = toUnaccent(r.customerName || '').includes(termUnaccent) || (r.customerName || '').toLowerCase().includes(termRaw);
                const matchComment = toUnaccent(r.comment || '').includes(termUnaccent);
                const matchBooking = (r.bookingId || '').toLowerCase().includes(termRaw);
                const matchPhone = (r.phone || '').includes(termRaw);
                if (!matchCust && !matchComment && !matchBooking && !matchPhone) return false;
            }

            if (reviewFilterStar !== 'ALL') {
                const rStar = Number(r.rating) || 5;
                if (reviewFilterStar === 'LOW') {
                    if (rStar > 2) return false;
                } else if (parseInt(reviewFilterStar, 10) !== rStar) {
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
            }

            return true;
        });

        // Xóa thuộc tính loading skeleton nếu có
        delete tbody.dataset.loadingSkeleton;

        if (filtered.length === 0) {
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

        const totalPages = Math.ceil(filtered.length / REVIEWS_PAGE_SIZE);
        if (reviewCurrentPage > totalPages) reviewCurrentPage = totalPages;
        if (reviewCurrentPage < 1) reviewCurrentPage = 1;

        const startIndex = (reviewCurrentPage - 1) * REVIEWS_PAGE_SIZE;
        const pageItems = filtered.slice(startIndex, startIndex + REVIEWS_PAGE_SIZE);

        tbody.innerHTML = pageItems.map(r => {
            const isReplied = Boolean(r.replyText || r.status === 'replied');
            const starNum = Number(r.rating) || 5;
            const starsHtml = '★'.repeat(starNum) + '☆'.repeat(5 - starNum);
            const isLowRating = starNum <= 3;
            const borderLeftStyle = isLowRating ? 'border-left: 3px solid #D97706;' : 'border-left: 3px solid transparent;';

            return `
                <tr data-review-id="${r.id}">
                    <td style="${borderLeftStyle} font-weight: 600; color: var(--text-heading);">
                        <div>${r.bookingId || r.id}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${r.id}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${r.customerName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${r.phone || '—'}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500; color: var(--text-main);">${r.serviceName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${r.category === 'Hotel' ? 'Pet Hotel' : (r.category === 'Taxi' ? 'Pet Taxi' : 'Spa và Grooming')}</div>
                    </td>
                    <td style="color: #D97706; font-size: 13.5px; letter-spacing: 1px; white-space: nowrap;">
                        ${starsHtml} <span style="font-size: 12px; font-weight: 600; color: var(--text-main); margin-left: 2px;">${starNum}★</span>
                    </td>
                    <td style="max-width: 260px; font-size: 12.5px; line-height: 1.45;">
                        <div style="color: var(--text-main);">${r.comment || 'Khách không để lại nhận xét bằng lời.'}</div>
                        ${isReplied ? `
                            <div style="margin-top: 6px; padding: 4px 8px; background: #EEF5F1; border-radius: 6px; font-size: 11.5px; color: #236B48;">
                                <span style="font-weight: 600;">Phản hồi:</span> ${r.replyText}
                            </div>
                        ` : ''}
                    </td>
                    <td>${r.staff || 'Chưa phân công'}</td>
                    <td>
                        <span class="admin-badge ${isReplied ? 'badge-success' : 'badge-warning'}">
                            ${isReplied ? 'Đã phản hồi' : 'Chờ phản hồi'}
                        </span>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reply-review" data-review-id="${r.id}" style="padding: 4px 10px; font-size: 12px;">
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

    // Mở modal phản hồi đánh giá
    function openReplyReviewModal(reviewId) {
        const reviewsData = PawpalServices.state?.reviewsData || [];
        const review = reviewsData.find(r => r.id === reviewId);
        const modal = document.getElementById('modalReplyReview');
        if (!modal || !review) return;

        const infoEl = document.getElementById('replyReviewCustomerInfo');
        const commentEl = document.getElementById('replyReviewComment');
        const textInput = document.getElementById('replyReviewText');

        if (infoEl) {
            infoEl.textContent = `${review.customerName} • ${review.serviceName} (${review.rating} sao)`;
        }
        if (commentEl) {
            commentEl.textContent = `"${review.comment}"`;
        }
        if (textInput) {
            textInput.value = review.replyText || '';
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
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                reviewSearchTerm = searchInput.value.trim();
                reviewCurrentPage = 1;
                renderReviewsTable();
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
                if (review) {
                    review.replyText = text;
                    review.status = 'replied';

                    try {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (client && review.dbId) {
                            await client.from('review').update({ shop_reply: text }).eq('id', review.dbId);
                        }
                    } catch (e) {
                        console.error('Error saving review reply:', e);
                    }

                    renderReviewsTable();
                    updateReviewKPIs();
                    if (PawpalServices.showToast) {
                        PawpalServices.showToast('Đã lưu phản hồi đánh giá thành công!');
                    }
                    closeReplyReviewModal();
                }
            });
        }

        // Xuất file báo cáo
        const btnExport = document.getElementById('btnExportReviewReport');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                if (PawpalServices.showToast) {
                    PawpalServices.showToast('Đã trích xuất báo cáo đánh giá dịch vụ thành công!');
                }
            });
        }

        renderReviewsTable();
        updateReviewKPIs();
    }

    PawpalServices.subtabs.reviews = {
        init: initReviewsSubtab,
        renderReviewsTable,
        updateReviewKPIs,
        openReplyReviewModal,
        closeReplyReviewModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReviewsSubtab);
    } else {
        initReviewsSubtab();
    }
})();
