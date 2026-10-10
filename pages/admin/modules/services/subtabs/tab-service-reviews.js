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

    function updateReviewKPIs() {
        const reviewsData = PawpalServices.state?.reviewsData || [];
        const total = reviewsData.length;
        const fiveStar = reviewsData.filter(r => r.rating === 5).length;
        const lowStar = reviewsData.filter(r => r.rating <= 3).length;
        const replied = reviewsData.filter(r => r.status === 'replied' || r.replyText).length;

        const statTotal = document.getElementById('statTotalReviews');
        const statFiveStar = document.getElementById('statFiveStarReviews');
        const statLowStar = document.getElementById('statLowStarReviews');
        const statReplied = document.getElementById('statRepliedReviews');

        if (statTotal) statTotal.textContent = total;
        if (statFiveStar) statFiveStar.textContent = fiveStar;
        if (statLowStar) statLowStar.textContent = lowStar;
        if (statReplied) statReplied.textContent = replied;
    }

    function renderReviewsTable() {
        const tbody = document.getElementById('servicesReviewsTableBody');
        if (!tbody) return;

        const reviewsData = PawpalServices.state?.reviewsData || [];
        const toUnaccent = PawpalServices.toUnaccent || (str => str);

        let filtered = reviewsData.filter(r => {
            if (reviewSearchTerm) {
                const termUnaccent = toUnaccent(reviewSearchTerm);
                const termRaw = reviewSearchTerm.toLowerCase().trim();
                const matchCust = toUnaccent(r.customerName || '').includes(termUnaccent) || (r.customerName || '').toLowerCase().includes(termRaw);
                const matchComment = toUnaccent(r.comment || '').includes(termUnaccent);
                const matchBooking = (r.bookingId || '').toLowerCase().includes(termRaw);
                if (!matchCust && !matchComment && !matchBooking) return false;
            }

            if (reviewFilterStar !== 'ALL') {
                if (parseInt(reviewFilterStar, 10) !== r.rating) return false;
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

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 36px 16px; font-size: 13.5px;">
                        Không có đánh giá nào phù hợp với bộ lọc hiện tại.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            const isReplied = Boolean(r.replyText || r.status === 'replied');
            const starsHtml = '★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5));

            return `
                <tr data-review-id="${r.id}">
                    <td style="font-weight: 600; color: var(--text-heading);">${r.id}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-main);">${r.customerName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${r.phone || ''}</div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${r.serviceName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">Mã lịch: ${r.bookingId}</div>
                    </td>
                    <td>${r.staff || 'Chưa phân công'}</td>
                    <td style="color: #D97706; font-size: 14px; letter-spacing: 1px;">${starsHtml}</td>
                    <td style="max-width: 280px; font-size: 12.5px; line-height: 1.4;">
                        <div>${r.comment || 'Khách không để lại lời nhắn.'}</div>
                        ${isReplied ? `
                            <div style="margin-top: 4px; padding: 4px 8px; background: #EEF5F1; border-radius: 6px; font-size: 11.5px; color: #236B48;">
                                <strong>Phản hồi:</strong> ${r.replyText}
                            </div>
                        ` : ''}
                    </td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${isReplied ? 'badge-success' : 'badge-warning'}">${isReplied ? 'Đã phản hồi' : 'Chờ phản hồi'}</span>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reply-review" data-review-id="${r.id}">
                            ${isReplied ? 'Sửa phản hồi' : 'Phản hồi'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-reply-review').forEach(btn => {
            btn.addEventListener('click', () => {
                const rId = btn.getAttribute('data-review-id');
                openReplyReviewModal(rId);
            });
        });
    }

    function openReplyReviewModal(reviewId) {
        const reviewsData = PawpalServices.state?.reviewsData || [];
        const review = reviewsData.find(r => r.id === reviewId);
        const modal = document.getElementById('modalReplyReview');
        if (!modal || !review) return;

        const infoEl = document.getElementById('replyReviewCustomerInfo');
        const commentEl = document.getElementById('replyReviewComment');
        const textInput = document.getElementById('replyReviewText');

        if (infoEl) infoEl.textContent = `${review.customerName} - ${review.serviceName} (${review.rating} sao)`;
        if (commentEl) commentEl.textContent = `"${review.comment}"`;
        if (textInput) textInput.value = review.replyText || '';

        modal.setAttribute('data-review-id', reviewId);
        modal.classList.add('active');
    }

    function initReviewsSubtab() {
        const searchInput = document.getElementById('reviewSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                reviewSearchTerm = searchInput.value.trim();
                renderReviewsTable();
            });
        }

        const filterStar = document.getElementById('reviewFilterStar');
        if (filterStar) {
            filterStar.addEventListener('change', () => {
                reviewFilterStar = filterStar.value;
                renderReviewsTable();
            });
        }

        const filterCategory = document.getElementById('reviewFilterCategory');
        if (filterCategory) {
            filterCategory.addEventListener('change', () => {
                reviewFilterCategory = filterCategory.value;
                renderReviewsTable();
            });
        }

        const filterStaff = document.getElementById('reviewFilterStaff');
        if (filterStaff) {
            filterStaff.addEventListener('change', () => {
                reviewFilterStaff = filterStaff.value;
                renderReviewsTable();
            });
        }

        const filterStatus = document.getElementById('reviewFilterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => {
                reviewFilterStatus = filterStatus.value;
                renderReviewsTable();
            });
        }

        // Submit phản hồi đánh giá
        const btnSubmitReply = document.getElementById('btnSubmitReplyReview');
        if (btnSubmitReply) {
            btnSubmitReply.addEventListener('click', async () => {
                const modal = document.getElementById('modalReplyReview');
                const rId = modal?.getAttribute('data-review-id');
                const text = document.getElementById('replyReviewText')?.value.trim();

                if (!text) {
                    PawpalServices.showToast('Vui lòng nhập nội dung phản hồi!', 'warning');
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
                    PawpalServices.showToast('Đã lưu phản hồi đánh giá thành công!');
                    if (modal) modal.classList.remove('active');
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
        openReplyReviewModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReviewsSubtab);
    } else {
        initReviewsSubtab();
    }
})();
