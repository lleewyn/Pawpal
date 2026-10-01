
(function (global) {
    'use strict';

    const DRAFT_KEY_PREFIX  = 'pawpal_review_draft_';
    const REVIEWS_KEY       = 'pawpal_reviews';
    const REVIEWED_KEY      = 'pawpal_reviewed';          // per-product (compat)
    const ORDER_REVIEWED_KEY = 'pawpal_order_reviewed';   // per-order batch lock

    function saveDraft(orderId, data) {
        try { localStorage.setItem(DRAFT_KEY_PREFIX + orderId, JSON.stringify(data)); } catch (_) {}
    }

    function loadDraft(orderId) {
        try {
            const raw = localStorage.getItem(DRAFT_KEY_PREFIX + orderId);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }

    function clearDraft(orderId) {
        localStorage.removeItem(DRAFT_KEY_PREFIX + orderId);
    }

    function getStoredReviews() {
        try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]'); } catch (_) { return []; }
    }

    function saveStoredReviews(reviews) {
        try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); } catch (_) {}
    }

    function hasOrderReviewed(orderId) {
        if (window.pawpalReviews) {
            return window.pawpalReviews.some(r => String(r.sales_order_id) === String(orderId) || String(r.order_id) === String(orderId) || String(r.sales_order_code) === String(orderId));
        }
        try {
            const list = JSON.parse(localStorage.getItem(ORDER_REVIEWED_KEY) || '[]');
            return list.includes(String(orderId));
        } catch (_) { return false; }
    }

    function markOrderReviewed(orderId) {
        try {
            const list = JSON.parse(localStorage.getItem(ORDER_REVIEWED_KEY) || '[]');
            if (!list.includes(String(orderId))) {
                list.push(String(orderId));
                localStorage.setItem(ORDER_REVIEWED_KEY, JSON.stringify(list));
            }
        } catch (_) {}
    }

    function markProductReviewedCompat(orderId, productId, hasMedia) {
        try {
            const list = JSON.parse(localStorage.getItem(REVIEWED_KEY) || '[]');
            list.push({ orderId: String(orderId), productId: String(productId), hasMedia });
            localStorage.setItem(REVIEWED_KEY, JSON.stringify(list));
        } catch (_) {}
    }

    function showPawPointsToast(points) {
        let toast = document.getElementById('paw-points-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'paw-points-toast';
            toast.className = 'paw-points-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.innerHTML = `
            <span style="font-size:1.2rem">&#x1F43E;</span>
            <span><span class="points-amount">+${points}</span> Paw Points đã được thêm vào ví của bạn</span>
        `;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    const Lightbox = (function () {
        let overlay, mediaEl, prevBtn, nextBtn, closeBtn;
        let items = [], currentIndex = 0;

        function build() {
            overlay = document.createElement('div');
            overlay.className = 'review-lightbox-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Xem ảnh/video đánh giá');

            overlay.innerHTML = `
                <button class="lightbox-close" aria-label="Đóng">&times;</button>
                <div class="lightbox-inner"></div>
                <button class="lightbox-nav lightbox-prev" aria-label="Ảnh trước">&#8249;</button>
                <button class="lightbox-nav lightbox-next" aria-label="Ảnh sau">&#8250;</button>
            `;

            mediaEl  = overlay.querySelector('.lightbox-inner');
            closeBtn = overlay.querySelector('.lightbox-close');
            prevBtn  = overlay.querySelector('.lightbox-prev');
            nextBtn  = overlay.querySelector('.lightbox-next');

            closeBtn.addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            prevBtn.addEventListener('click', () => navigate(-1));
            nextBtn.addEventListener('click', () => navigate(1));
            document.addEventListener('keydown', e => {
                if (!overlay.classList.contains('open')) return;
                if (e.key === 'Escape')      close();
                if (e.key === 'ArrowLeft')   navigate(-1);
                if (e.key === 'ArrowRight')  navigate(1);
            });

            document.body.appendChild(overlay);
        }

        function open(mediaItems, startIndex) {
            if (!overlay) build();
            items        = mediaItems;
            currentIndex = startIndex || 0;
            showCurrent();
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            if (!overlay) return;
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        function navigate(dir) {
            currentIndex = Math.max(0, Math.min(items.length - 1, currentIndex + dir));
            showCurrent();
        }

        function showCurrent() {
            const item = items[currentIndex];
            const isVideo = item.type === 'video';
            mediaEl.innerHTML = isVideo
                ? `<video src="${item.src}" controls autoplay style="max-width:90vw;max-height:85vh;"></video>`
                : `<img src="${item.src}" alt="Ảnh đánh giá ${currentIndex + 1}" loading="lazy">`;
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === items.length - 1;
        }

        return { open };
    })();

    const EMOTIONS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

    function buildProductRowHTML(product, draft) {
        const pid     = product.id;
        const defRating = (draft && draft[pid] && draft[pid].rating) ? draft[pid].rating : 5;
        const defComment = (draft && draft[pid] && draft[pid].comment) ? draft[pid].comment : '';

        const starInputs = [5, 4, 3, 2, 1].map(v => `
            <input type="radio" name="rating-${pid}" id="star${v}-${pid}" value="${v}" ${defRating === v ? 'checked' : ''}>
            <label for="star${v}-${pid}" aria-label="${v} sao — ${EMOTIONS[v]}" title="${EMOTIONS[v]}">&#9733;</label>
        `).join('');

        return `
        <div class="batch-review-product" data-product-id="${pid}" id="batch-product-${pid}">
            <!-- Product header -->
            <div class="batch-product-header">
                <img src="${product.image}" alt="${product.name}" class="batch-product-img" loading="lazy">
                <div class="batch-product-info">
                    <div class="batch-product-name">${product.name}</div>
                    ${product.deliveredDate ? `<div class="batch-product-date">Đã mua · ${product.deliveredDate}</div>` : ''}
                </div>
            </div>

            <!-- Star rating — default 5★ -->
            <div class="batch-star-group">
                <div class="star-picker" role="radiogroup" aria-label="Chọn số sao cho ${product.name}">
                    ${starInputs}
                </div>
                <div class="batch-star-emotion" id="batch-emotion-${pid}" aria-live="polite">${EMOTIONS[defRating]}</div>
            </div>

            <!-- Comment (optional) -->
            <div class="batch-comment-group">
                <textarea
                    id="batch-comment-${pid}"
                    class="batch-textarea"
                    name="comment-${pid}"
                    rows="3"
                    maxlength="500"
                    placeholder="Chia sẻ trải nghiệm về sản phẩm này (tùy chọn)...">${defComment}</textarea>
                <span class="batch-char-counter" id="batch-char-${pid}" aria-live="polite">${defComment.length}/500</span>
            </div>

            <!-- Upload ảnh/video (optional, collapsed by default) -->
            <div class="batch-upload-section" id="batch-upload-section-${pid}">
                <button type="button" class="batch-upload-toggle" id="batch-upload-toggle-${pid}"
                        aria-expanded="false" aria-controls="batch-upload-zone-${pid}">
                    &#128247; Thêm ảnh/video
                </button>
                <div class="batch-upload-collapsible" id="batch-upload-zone-${pid}" hidden>
                    <div class="review-upload-zone" id="upload-drop-${pid}"
                         role="button" tabindex="0" aria-label="Kéo thả hoặc click để tải ảnh/video">
                        <input type="file" id="file-input-${pid}"
                               accept="image/jpeg,image/png,image/webp,video/mp4" multiple aria-hidden="true">
                        <div class="upload-placeholder-icon" aria-hidden="true">&#9650;</div>
                        <p class="upload-placeholder-text">Kéo thả hoặc click để tải</p>
                        <span class="upload-placeholder-hint">Tối đa 5MB — JPG, PNG, WEBP, MP4</span>
                    </div>
                    <div class="upload-error" id="upload-error-${pid}" role="alert"></div>
                    <div class="review-preview-list" id="preview-list-${pid}"></div>
                </div>
            </div>

            <hr class="batch-product-divider">
        </div>`;
    }

    function buildBatchFormHTML(orderId, products, draft) {
        const rows = products.map(p => buildProductRowHTML(p, draft)).join('');

        return `
        <div class="batch-review-section" id="batch-review-section-${orderId}">
            <!-- Offline banner -->
            <div class="review-offline-banner" id="batch-offline-banner" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                    <path d="M10.71 5.05A16 16 0 0 1 22.56 9"></path>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                    <line x1="12" y1="20" x2="12.01" y2="20"></line>
                </svg>
                <span>Mất kết nối mạng. Đang tự động lưu nháp...</span>
            </div>

            <div class="batch-products-list">
                ${rows}
            </div>

            <!-- Submit area -->
            <div class="batch-submit-wrap">
                <button type="button" class="btn-batch-submit" id="batch-submit-btn-${orderId}">
                    Gửi tất cả đánh giá
                </button>
                </button>
                <p class="batch-submit-hint">
                    &#9733; Mỗi sản phẩm đã được đặt 5 sao mặc định — bạn có thể thay đổi hoặc để nguyên
                </p>
            </div>
        </div>`;
    }

    function buildReviewedHTML(productCount) {
        return `
        <div class="batch-reviewed-done" id="batch-reviewed-done">
            <div class="reviewed-done-icon">&#10003;</div>
            <div class="reviewed-done-text">
                <strong>Đã gửi đánh giá thành công!</strong>
                <span>${productCount} sản phẩm trong đơn hàng đã được đánh giá.</span>
            </div>
        </div>`;
    }

    function wireUploadZone(pid, uploadedFilesMap) {
        uploadedFilesMap[pid] = [];

        const toggleBtn  = document.getElementById(`batch-upload-toggle-${pid}`);
        const zone       = document.getElementById(`batch-upload-zone-${pid}`);
        const dropArea   = document.getElementById(`upload-drop-${pid}`);
        const fileInput  = document.getElementById(`file-input-${pid}`);
        const uploadError = document.getElementById(`upload-error-${pid}`);
        const previewList = document.getElementById(`preview-list-${pid}`);

        if (!toggleBtn || !zone) return;

        toggleBtn.addEventListener('click', () => {
            const isHidden = zone.hidden;
            zone.hidden = !isHidden;
            toggleBtn.setAttribute('aria-expanded', String(isHidden));
            toggleBtn.textContent = isHidden
                ? '▲ Ẩn bớt'
                : '📷 Thêm ảnh/video';
        });

        dropArea.addEventListener('click', () => fileInput.click());
        dropArea.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
        dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('drag-over'); });
        dropArea.addEventListener('dragleave', () => dropArea.classList.remove('drag-over'));
        dropArea.addEventListener('drop', e => {
            e.preventDefault();
            dropArea.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });
        fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

        function handleFiles(fileList) {
            uploadError.textContent = '';
            uploadError.classList.remove('visible');

            Array.from(fileList).forEach(file => {
                const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
                if (!allowed.includes(file.type)) {
                    uploadError.textContent = `Định dạng không hỗ trợ: ${file.name}. Chỉ chấp nhận JPG, PNG, WEBP, MP4.`;
                    uploadError.classList.add('visible');
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    uploadError.textContent = `File "${file.name}" vượt quá 5MB.`;
                    uploadError.classList.add('visible');
                    return;
                }

                const reader = new FileReader();
                reader.onload = ev => {
                    const src  = ev.target.result;
                    const type = file.type.startsWith('video') ? 'video' : 'image';
                    uploadedFilesMap[pid].push({ file, src, type });
                    renderPreview();
                };
                reader.readAsDataURL(file);
            });
        }

        function renderPreview() {
            previewList.innerHTML = uploadedFilesMap[pid].map((item, i) => `
                <div class="preview-thumb" data-pid="${pid}" data-index="${i}">
                    ${item.type === 'video'
                        ? `<video src="${item.src}" muted></video>`
                        : `<img src="${item.src}" alt="Ảnh ${i + 1}" loading="lazy">`}
                    <button class="remove-thumb" data-pid="${pid}" data-index="${i}" aria-label="Xóa ảnh ${i + 1}">&times;</button>
                </div>
            `).join('');

            previewList.querySelectorAll('.remove-thumb').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    uploadedFilesMap[btn.dataset.pid].splice(parseInt(btn.dataset.index, 10), 1);
                    renderPreview();
                });
            });

            previewList.querySelectorAll('.preview-thumb').forEach(thumb => {
                thumb.addEventListener('click', e => {
                    if (e.target.classList.contains('remove-thumb')) return;
                    const idx = parseInt(thumb.dataset.index, 10);
                    Lightbox.open(uploadedFilesMap[pid].map(f => ({ src: f.src, type: f.type })), idx);
                });
            });
        }
    }

    function wireBatchForm(orderId, products) {
        const section    = document.getElementById(`batch-review-section-${orderId}`);
        const submitBtn  = document.getElementById(`batch-submit-btn-${orderId}`);
        const offlineBanner = document.getElementById('batch-offline-banner');

        if (!section || !submitBtn) return;

        const uploadedFilesMap = {};

        products.forEach(product => {
            const pid = product.id;

            section.querySelectorAll(`input[name="rating-${pid}"]`).forEach(radio => {
                radio.addEventListener('change', () => {
                    const emotionEl = document.getElementById(`batch-emotion-${pid}`);
                    if (emotionEl) emotionEl.textContent = EMOTIONS[parseInt(radio.value, 10)] || '';
                    autoSaveDraft();
                });
            });

            const textarea = document.getElementById(`batch-comment-${pid}`);
            const counter  = document.getElementById(`batch-char-${pid}`);
            if (textarea && counter) {
                textarea.addEventListener('input', () => {
                    counter.textContent = `${textarea.value.length}/500`;
                    autoSaveDraft();
                });
            }

            wireUploadZone(pid, uploadedFilesMap);
        });

        function autoSaveDraft() {
            const draftData = {};
            products.forEach(product => {
                const pid = product.id;
                const ratingInput = section.querySelector(`input[name="rating-${pid}"]:checked`);
                const textarea = document.getElementById(`batch-comment-${pid}`);
                draftData[pid] = {
                    rating:  ratingInput ? parseInt(ratingInput.value, 10) : 5,
                    comment: textarea ? textarea.value : ''
                };
            });
            saveDraft(orderId, draftData);
        }

        let pendingOfflineSubmit = null;
        window.addEventListener('online', () => {
            offlineBanner && offlineBanner.classList.remove('visible');
            if (pendingOfflineSubmit) { pendingOfflineSubmit(); pendingOfflineSubmit = null; }
        });
        window.addEventListener('offline', () => {
            offlineBanner && offlineBanner.classList.add('visible');
        });

        submitBtn.addEventListener('click', () => {
            const userId = getCurrentUserId();
            if (!userId || userId === 'GUEST') {
                showToast('Bạn cần đăng nhập để gửi đánh giá.', 'error');
                return;
            }

            doSubmitAll();
        });

        async function doSubmitAll() {
            if (!navigator.onLine) {
                offlineBanner && offlineBanner.classList.add('visible');
                autoSaveDraft();
                pendingOfflineSubmit = doSubmitAll;
                submitBtn.classList.remove('confirm-pending');
                submitBtn.textContent = 'Đang kết nối lại...';
                submitBtn.disabled = true;
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang gửi...';

            const now = new Date().toISOString();
            const newReviews = [];
            let totalPoints = 0;

            products.forEach(product => {
                const pid = product.id;
                const ratingInput = section.querySelector(`input[name="rating-${pid}"]:checked`);
                const textarea    = document.getElementById(`batch-comment-${pid}`);
                const rating      = ratingInput ? parseInt(ratingInput.value, 10) : 5;
                const comment     = textarea ? textarea.value.trim() : '';
                const files       = uploadedFilesMap[pid] || [];
                const isDefaultRating = !ratingInput || (rating === 5);

                const review = {
                    id:              'REV-' + Date.now() + '-' + pid,
                    orderId:         String(orderId),
                    productId:       String(pid),
                    userId:          getCurrentUserId(),
                    userName:        getMaskedUserName(),
                    rating,
                    isDefaultRating,
                    comment,
                    media:           files.map(f => ({ src: f.src, type: f.type })),
                    verified:        true,
                    status:          rating >= 4 ? 'published' : 'published_flagged',
                    createdAt:       now,
                    helpful:         0,
                    shopReply:       null
                };

                newReviews.push(review);

                markProductReviewedCompat(orderId, pid, files.length > 0);

                totalPoints += files.length > 0 ? 5 : 1;
            });

            const allReviews = getStoredReviews();
            allReviews.push(...newReviews);
            saveStoredReviews(allReviews);

            const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
            if (db) {
                const customerId = getCurrentUserId();
                if (customerId !== 'GUEST' && customerId.length >= 32) { // check valid UUID
                    for (const rv of newReviews) {
                        try {
                            const { error: dbErr } = await db.from('review').insert({
                                customer_id: customerId,
                                product_id: rv.productId.length >= 32 ? rv.productId : null, // Handle UUID check
                                review_type: 'PRODUCT',
                                rating: rv.rating,
                                review_content: rv.comment,
                                image_urls: rv.media.map(m => m.src),
                                review_status: 'APPROVED', // Default as per plan
                                created_at: rv.createdAt
                            });
                            if (dbErr) console.warn('[ReviewHandler] Supabase insert failed:', dbErr);
                        } catch (err) {
                            console.warn('[ReviewHandler] Supabase insert error:', err);
                        }
                    }
                }
            }

            markOrderReviewed(orderId);
            clearDraft(orderId);

            addPawPoints(totalPoints);
            showPawPointsToast(totalPoints);

            section.outerHTML = buildReviewedHTML(products.length);

            window.dispatchEvent(new CustomEvent('pawpal:reviewSubmitted', { detail: { orderId } }));

            console.log(`[ReviewHandler] Batch submitted ${newReviews.length} reviews for order ${orderId}, +${totalPoints} pts`);
        }
    }

    function getCurrentUserId() {
        try {
            const u = JSON.parse(localStorage.getItem('pawpal_current_user'));
            return u ? u.id || u.phone : 'GUEST';
        } catch (_) { return 'GUEST'; }
    }

    function getMaskedUserName() {
        try {
            const u = JSON.parse(localStorage.getItem('pawpal_current_user'));
            if (!u || !u.name) return 'Khách hàng';
            const name = u.name.trim();
            if (name.length <= 2) return name + '***';
            return name[0] + '***' + name[name.length - 1];
        } catch (_) { return 'Khách hàng'; }
    }

    function addPawPoints(amount) {
        try {
            const u = JSON.parse(localStorage.getItem('pawpal_current_user'));
            if (!u) return;
            u.points = (u.points || 0) + amount;
            localStorage.setItem('pawpal_current_user', JSON.stringify(u));

            const users = JSON.parse('[]' || '[]');
            const idx = users.findIndex(usr => usr.phone === u.phone);
            if (idx !== -1) {
                users[idx].points = u.points;
            }

            const el = document.getElementById('headerPoints');
            if (el) el.textContent = u.points + ' Paw Points';
        } catch (_) {}
    }

    function showToast(msg, type) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = `
            position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
            background:${type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)'};
            color:#fff;padding:10px 20px;border-radius:var(--border-radius-pill);
            font-size:var(--fs-small);font-weight:600;z-index:9999;
            box-shadow:var(--shadow-lg);pointer-events:none;
        `;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }


    function init(orderId, products) {
        if (!orderId || !products || !products.length) return;

        const container = _getOrCreateReviewContainer();
        if (!container) return;

        if (!document.querySelector('.order-reviews-heading')) {
            const heading = document.createElement('h3');
            heading.className = 'order-reviews-heading';
            heading.id = 'reviews';
            heading.textContent = 'Đánh giá sản phẩm';
            container.prepend(heading);
        }

        if (hasOrderReviewed(orderId)) {
            const done = document.createElement('div');
            done.innerHTML = buildReviewedHTML(products.length);
            container.appendChild(done.firstElementChild);
            return;
        }

        const draft = loadDraft(orderId);
        const wrap  = document.createElement('div');
        wrap.innerHTML = buildBatchFormHTML(orderId, products, draft);
        container.appendChild(wrap.firstElementChild);

        wireBatchForm(orderId, products);
    }

    function _getOrCreateReviewContainer() {
        const productsList = document.querySelector('.products-list, #products-list');
        if (productsList && productsList.parentNode) {
            let reviewContainer = document.getElementById('order-review-container');
            if (!reviewContainer) {
                reviewContainer = document.createElement('div');
                reviewContainer.id = 'order-review-container';
                reviewContainer.className = 'order-review-container';
                productsList.parentNode.insertBefore(reviewContainer, productsList.nextSibling);
            }
            return reviewContainer;
        }
        return document.querySelector('.order-detail-main') || document.body;
    }

    global.ReviewHandler = { init, hasOrderReviewed, Lightbox };

})(window);
