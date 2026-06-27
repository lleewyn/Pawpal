/**
 * review-handler.js — QUY TRÌNH 3.1.11: ĐÁNH GIÁ
 *
 * Covers (excluding admin US 11-5):
 *   US 11-1  Hiển thị nút "Viết đánh giá" / "Đã đánh giá"
 *   US 11-2  Accordion form tại chỗ + kiểm tra quyền sở hữu
 *   US 11-3  Star rating, nhận xét, upload ảnh/video
 *   US 11-4  Confirm-on-button 2-tap + 5s countdown
 *   US 11-6  Cộng điểm Paw Points + toast
 *   US 11-7  Lightbox + filter reviews trên product-detail (xem product-reviews.js)
 *   US 11-8  Offline draft auto-save + auto-retry
 *
 * API surface (global):
 *   ReviewHandler.init(orderId, products)   — gọi từ order-detail.js
 *   ReviewHandler.openForm(productId)       — mở accordion cho 1 sản phẩm
 */

(function (global) {
    'use strict';

    // ── Storage helpers ─────────────────────────────────────────────────────
    const DRAFT_PREFIX = 'pawpal_review_draft_';
    const REVIEWS_KEY  = 'pawpal_reviews';

    function saveDraft(productId, data) {
        try {
            localStorage.setItem(DRAFT_PREFIX + productId, JSON.stringify(data));
        } catch (_) {}
    }

    function loadDraft(productId) {
        try {
            const raw = localStorage.getItem(DRAFT_PREFIX + productId);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }

    function clearDraft(productId) {
        localStorage.removeItem(DRAFT_PREFIX + productId);
    }

    /** Persistent review store backed by localStorage */
    function getStoredReviews() {
        try {
            return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
        } catch (_) { return []; }
    }

    function saveStoredReviews(reviews) {
        try {
            localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
        } catch (_) {}
    }

    function hasReviewed(orderId, productId) {
        return getStoredReviews().some(
            r => r.orderId === orderId && r.productId === productId
        );
    }

    // ── Paw Points Toast ────────────────────────────────────────────────────
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

    // ── Lightbox (Singleton) ────────────────────────────────────────────────
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

    // ── Star Emotion Labels ─────────────────────────────────────────────────
    const EMOTIONS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

    // ── Build accordion form for one product ───────────────────────────────
    function buildFormHTML(orderId, product) {
        const productId = product.id;
        return `
        <div class="review-accordion" id="review-accordion-${productId}" data-order-id="${orderId}" data-product-id="${productId}">
            <div class="review-form-card">
                <!-- Offline banner (US 11-8) -->
                <div class="review-offline-banner" id="offline-banner-${productId}" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"></path>
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                        <line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                    <span>Mất kết nối mạng. Đang tự động lưu nháp và thử kết nối lại...</span>
                </div>

                <!-- Product context (US 11-2) -->
                <div class="review-product-context">
                    <img src="${product.image}" alt="${product.name}" class="ctx-img" loading="lazy">
                    <div class="ctx-info">
                        <div class="ctx-name">${product.name}</div>
                        <div class="ctx-date">Đã mua • ${product.deliveredDate || ''}</div>
                    </div>
                </div>

                <form class="review-form" id="review-form-${productId}" novalidate>
                    <!-- Star Rating (US 11-3) -->
                    <div class="star-rating-group">
                        <label class="group-label">Đánh giá <span class="required">*</span></label>
                        <div class="star-picker" role="radiogroup" aria-label="Chọn số sao từ 1 đến 5">
                            <input type="radio" name="rating-${productId}" id="star5-${productId}" value="5">
                            <label for="star5-${productId}" aria-label="5 sao — Rất hài lòng" title="Rất hài lòng">&#9733;</label>
                            <input type="radio" name="rating-${productId}" id="star4-${productId}" value="4">
                            <label for="star4-${productId}" aria-label="4 sao — Hài lòng" title="Hài lòng">&#9733;</label>
                            <input type="radio" name="rating-${productId}" id="star3-${productId}" value="3">
                            <label for="star3-${productId}" aria-label="3 sao — Bình thường" title="Bình thường">&#9733;</label>
                            <input type="radio" name="rating-${productId}" id="star2-${productId}" value="2">
                            <label for="star2-${productId}" aria-label="2 sao — Tệ" title="Tệ">&#9733;</label>
                            <input type="radio" name="rating-${productId}" id="star1-${productId}" value="1">
                            <label for="star1-${productId}" aria-label="1 sao — Rất tệ" title="Rất tệ">&#9733;</label>
                        </div>
                        <div class="star-emotion" id="star-emotion-${productId}" aria-live="polite"></div>
                        <div class="star-rating-error" id="star-error-${productId}" role="alert">
                            Vui lòng chọn số sao đánh giá từ 1 đến 5.
                        </div>
                    </div>

                    <!-- Comment (optional) -->
                    <div class="review-form-field">
                        <label for="review-comment-${productId}">Nhận xét (tùy chọn)</label>
                        <textarea
                            id="review-comment-${productId}"
                            class="review-textarea"
                            name="comment"
                            rows="4"
                            maxlength="500"
                            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."></textarea>
                        <span class="char-counter" id="char-counter-${productId}" aria-live="polite">0/500</span>
                    </div>

                    <!-- Media Upload (optional) -->
                    <div class="review-form-field">
                        <label>Ảnh/Video minh chứng (tùy chọn)</label>
                        <div class="review-upload-zone" id="upload-zone-${productId}" role="button" tabindex="0" aria-label="Kéo thả hoặc click để tải ảnh/video">
                            <input type="file" id="file-input-${productId}" accept="image/jpeg,image/png,image/webp,video/mp4" multiple aria-hidden="true">
                            <div class="upload-placeholder-icon" aria-hidden="true">&#9650;</div>
                            <p class="upload-placeholder-text">Kéo thả hoặc click để tải ảnh/video</p>
                            <span class="upload-placeholder-hint">Tối đa 5MB — JPG, PNG, WEBP, MP4</span>
                        </div>
                        <div class="upload-error" id="upload-error-${productId}" role="alert"></div>
                        <div class="review-preview-list" id="preview-list-${productId}"></div>
                    </div>

                    <!-- Submit (US 11-4) -->
                    <div class="review-submit-wrap">
                        <p class="review-submit-notice" id="submit-notice-${productId}"></p>
                        <button type="submit" class="btn-review-submit" id="submit-btn-${productId}">
                            Gửi đánh giá
                            <span class="confirm-ring" aria-hidden="true">
                                <svg viewBox="0 0 200 40" preserveAspectRatio="none">
                                    <rect x="2" y="2" width="196" height="36" rx="18" ry="18"
                                        fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3"
                                        pathLength="500"
                                        id="confirm-ring-rect-${productId}"/>
                                </svg>
                            </span>
                        </button>
                    </div>
                </form>

                <button class="btn-collapse-review" id="collapse-btn-${productId}" aria-label="Thu gọn form đánh giá">
                    &#8963; Thu gọn
                </button>
            </div>
        </div>`;
    }

    // ── Wire up one product's form interactions ─────────────────────────────
    function wireForm(orderId, product) {
        const productId  = product.id;
        const accordion  = document.getElementById(`review-accordion-${productId}`);
        const form       = document.getElementById(`review-form-${productId}`);
        const submitBtn  = document.getElementById(`submit-btn-${productId}`);
        const submitNotice = document.getElementById(`submit-notice-${productId}`);
        const emotionEl  = document.getElementById(`star-emotion-${productId}`);
        const starError  = document.getElementById(`star-error-${productId}`);
        const charCounter = document.getElementById(`char-counter-${productId}`);
        const textarea   = document.getElementById(`review-comment-${productId}`);
        const uploadZone = document.getElementById(`upload-zone-${productId}`);
        const fileInput  = document.getElementById(`file-input-${productId}`);
        const uploadError = document.getElementById(`upload-error-${productId}`);
        const previewList = document.getElementById(`preview-list-${productId}`);
        const offlineBanner = document.getElementById(`offline-banner-${productId}`);
        const collapseBtn = document.getElementById(`collapse-btn-${productId}`);

        if (!accordion || !form) return;

        let uploadedFiles = [];     // { file, src, type } entries
        let confirmTimer  = null;
        let confirmState  = false;  // true = waiting for 2nd tap

        // ── Restore draft ──────────────────────────────────────────────────
        const draft = loadDraft(productId);
        if (draft) {
            if (draft.rating) {
                const radio = form.querySelector(`input[value="${draft.rating}"]`);
                if (radio) {
                    radio.checked = true;
                    emotionEl.textContent = EMOTIONS[draft.rating] || '';
                }
            }
            if (draft.comment && textarea) {
                textarea.value = draft.comment;
                charCounter.textContent = `${draft.comment.length}/500`;
            }
        }

        // ── Star rating ────────────────────────────────────────────────────
        form.querySelectorAll(`input[name="rating-${productId}"]`).forEach(radio => {
            radio.addEventListener('change', () => {
                const val = parseInt(radio.value, 10);
                emotionEl.textContent = EMOTIONS[val] || '';
                starError.classList.remove('visible');
                autoSaveDraft();
            });
        });

        // ── Textarea char counter ──────────────────────────────────────────
        if (textarea) {
            textarea.addEventListener('input', () => {
                charCounter.textContent = `${textarea.value.length}/500`;
                autoSaveDraft();
            });
        }

        // ── File upload ────────────────────────────────────────────────────
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

        uploadZone.addEventListener('dragover', e => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
        uploadZone.addEventListener('drop', e => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', () => handleFiles(fileInput.files));

        function handleFiles(fileList) {
            uploadError.textContent = '';
            uploadError.classList.remove('visible');
            let hasError = false;

            Array.from(fileList).forEach(file => {
                const allowed = ['image/jpeg','image/png','image/webp','video/mp4'];
                if (!allowed.includes(file.type)) {
                    uploadError.textContent = `Định dạng không hỗ trợ: ${file.name}. Chỉ chấp nhận JPG, PNG, WEBP, MP4.`;
                    uploadError.classList.add('visible');
                    hasError = true;
                    return;
                }
                if (file.size > 5 * 1024 * 1024) {
                    uploadError.textContent = `File "${file.name}" vượt quá 5MB.`;
                    uploadError.classList.add('visible');
                    hasError = true;
                    return;
                }
                if (hasError) return;

                const reader = new FileReader();
                reader.onload = ev => {
                    const src  = ev.target.result;
                    const type = file.type.startsWith('video') ? 'video' : 'image';
                    uploadedFiles.push({ file, src, type });
                    renderPreview();
                    autoSaveDraft();
                };
                reader.readAsDataURL(file);
            });
            // Reset input so same file can be re-selected
            fileInput.value = '';
        }

        function renderPreview() {
            previewList.innerHTML = uploadedFiles.map((item, i) => `
                <div class="preview-thumb" data-index="${i}">
                    ${item.type === 'video'
                        ? `<video src="${item.src}" muted></video>`
                        : `<img src="${item.src}" alt="Ảnh ${i + 1}" loading="lazy">`}
                    <button class="remove-thumb" data-index="${i}" aria-label="Xóa ảnh ${i + 1}">&times;</button>
                </div>
            `).join('');

            // Remove buttons
            previewList.querySelectorAll('.remove-thumb').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.index, 10);
                    uploadedFiles.splice(idx, 1);
                    renderPreview();
                    autoSaveDraft();
                });
            });

            // Lightbox on thumb click (US 11-7)
            previewList.querySelectorAll('.preview-thumb').forEach(thumb => {
                thumb.addEventListener('click', e => {
                    if (e.target.classList.contains('remove-thumb')) return;
                    const idx = parseInt(thumb.dataset.index, 10);
                    Lightbox.open(uploadedFiles.map(f => ({ src: f.src, type: f.type })), idx);
                });
            });
        }

        // ── Auto-save draft ────────────────────────────────────────────────
        function autoSaveDraft() {
            const ratingInput = form.querySelector(`input[name="rating-${productId}"]:checked`);
            saveDraft(productId, {
                rating:  ratingInput ? parseInt(ratingInput.value, 10) : null,
                comment: textarea ? textarea.value : '',
                orderId, productId
            });
        }

        // ── Collapse ───────────────────────────────────────────────────────
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                accordion.classList.remove('open');
            });
        }

        // ── Offline detection (US 11-8) ────────────────────────────────────
        let pendingOfflineSubmit = null;

        window.addEventListener('online', () => {
            offlineBanner.classList.remove('visible');
            if (pendingOfflineSubmit) {
                pendingOfflineSubmit();
                pendingOfflineSubmit = null;
            }
        });

        window.addEventListener('offline', () => {
            offlineBanner.classList.add('visible');
        });

        // ── Submit / Confirm-on-button (US 11-4) ───────────────────────────
        form.addEventListener('submit', e => {
            e.preventDefault();

            // Validate star
            const ratingInput = form.querySelector(`input[name="rating-${productId}"]:checked`);
            if (!ratingInput) {
                starError.classList.add('visible');
                starError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return;
            }

            if (!confirmState) {
                // First tap: enter confirm mode
                confirmState = true;
                submitBtn.classList.add('confirm-pending');
                submitBtn.textContent = 'Bấm lại để xác nhận công khai';
                submitNotice.textContent = 'Phản hồi của bạn sẽ hiển thị công khai trên trang sản phẩm.';

                // Re-append the ring (textContent wipes it)
                const ring = document.createElement('span');
                ring.className = 'confirm-ring';
                ring.setAttribute('aria-hidden', 'true');
                ring.innerHTML = `<svg viewBox="0 0 200 40" preserveAspectRatio="none">
                    <rect x="2" y="2" width="196" height="36" rx="18" ry="18"
                        fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3" pathLength="500"/>
                </svg>`;
                submitBtn.appendChild(ring);

                // 5-second timeout — revert (AC 4-3)
                confirmTimer = setTimeout(() => {
                    resetConfirmState();
                }, 5000);

                return;
            }

            // Second tap: submit
            clearTimeout(confirmTimer);
            doSubmit(ratingInput.value, textarea ? textarea.value : '');
        });

        function resetConfirmState() {
            confirmState = false;
            clearTimeout(confirmTimer);
            submitBtn.classList.remove('confirm-pending');
            submitBtn.textContent = 'Gửi đánh giá';
            submitNotice.textContent = '';
        }

        function doSubmit(rating, comment) {
            // Offline check (US 11-8)
            if (!navigator.onLine) {
                offlineBanner.classList.add('visible');
                autoSaveDraft();
                pendingOfflineSubmit = () => doSubmit(rating, comment);
                submitBtn.classList.remove('confirm-pending');
                submitBtn.textContent = 'Đang kết nối lại...';
                submitBtn.disabled = true;
                return;
            }

            // Disable button to prevent double-submit
            submitBtn.disabled = true;
            submitBtn.textContent = 'Đang gửi...';

            // Build review object
            const review = {
                id:        'REV-' + Date.now(),
                orderId,
                productId,
                userId:    getCurrentUserId(),
                userName:  getMaskedUserName(),
                rating:    parseInt(rating, 10),
                comment:   comment.trim(),
                media:     uploadedFiles.map(f => ({ src: f.src, type: f.type })),
                verified:  true,
                status:    parseInt(rating, 10) >= 4 ? 'published' : 'published_flagged',
                createdAt: new Date().toISOString(),
                helpful:   0,
                shopReply: null
            };

            // Persist locally
            const all = getStoredReviews();
            all.push(review);
            saveStoredReviews(all);

            // Mark order product as reviewed (lưu hasMedia để tính điểm trừ khi hoàn tiền)
            markProductReviewed(orderId, productId, uploadedFiles.length > 0);

            // Clear draft
            clearDraft(productId);

            // Paw Points (US 11-6)
            const points = uploadedFiles.length > 0 ? 5 : 1;
            addPawPoints(points);
            showPawPointsToast(points);

            // Update UI: close accordion, replace button with "Đã đánh giá"
            accordion.classList.remove('open');

            const trigger = document.querySelector(`[data-review-trigger="${productId}"]`);
            if (trigger) {
                trigger.outerHTML = `<span class="reviewed-label" aria-label="Sản phẩm đã được đánh giá">&#10003; Đã đánh giá</span>`;
            }

            // Success state on button
            submitBtn.disabled   = false;
            submitBtn.textContent = 'Giao dịch thành công';
            submitBtn.classList.remove('confirm-pending');

            console.log('[ReviewHandler] Review saved:', review);
        }
    }

    // ── Utility: get current user ───────────────────────────────────────────
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

    function markProductReviewed(orderId, productId, hasMedia = false) {
        const key  = 'pawpal_reviewed';
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.push({ orderId, productId, hasMedia });
        localStorage.setItem(key, JSON.stringify(list));
    }

    function addPawPoints(amount) {
        try {
            const u = JSON.parse(localStorage.getItem('pawpal_current_user'));
            if (!u) return;
            u.points = (u.points || 0) + amount;
            localStorage.setItem('pawpal_current_user', JSON.stringify(u));

            // Sync vào users_db để không bị ghi đè khi initData reload
            const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
            const idx = users.findIndex(usr => usr.phone === u.phone);
            if (idx !== -1) {
                users[idx].points = u.points;
                localStorage.setItem('pawpal_users_db', JSON.stringify(users));
            }

            // Sync to header display if present
            const el = document.getElementById('headerPoints');
            if (el) el.textContent = u.points + ' Paw Points';
        } catch (_) {}
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * init — inject review buttons + accordions for all products in an order
     * @param {string} orderId
     * @param {Array}  products  — array of { id, name, image, deliveredDate? }
     * @param {string} containerSelector — CSS selector of container to append to, default '#order-actions'
     */
    function init(orderId, products) {
        if (!orderId || !products || !products.length) return;

        // Add "Đánh giá sản phẩm" heading once above the products list
        const productsList = document.querySelector('.products-list');
        if (productsList && !document.querySelector('.order-reviews-heading')) {
            const heading = document.createElement('h3');
            heading.className = 'order-reviews-heading';
            heading.id = 'reviews';
            heading.textContent = 'Đánh giá sản phẩm';
            productsList.parentNode.insertBefore(heading, productsList);
        }

        products.forEach(product => {
            const productId   = product.id;
            const alreadyDone = hasReviewed(orderId, productId);

            // Find the product-item by data-product-id or by name match
            const productItems = document.querySelectorAll('.product-item');
            let targetItem = null;

            productItems.forEach(item => {
                const nameEl = item.querySelector('.product-item-name');
                if (nameEl && nameEl.textContent.trim() === product.name) {
                    targetItem = item;
                }
            });

            if (!targetItem) return;

            // Mark item so CSS knows review zone follows
            targetItem.classList.add('has-review');

            // Build review zone div (uses CSS class, no inline style)
            const zone = document.createElement('div');
            zone.className = 'product-review-zone';

            if (alreadyDone) {
                zone.innerHTML = `<span class="reviewed-label" aria-label="Sản phẩm đã được đánh giá">&#10003; Đã đánh giá</span>`;
            } else {
                zone.innerHTML = `
                    <button class="btn-write-review"
                            data-review-trigger="${productId}"
                            data-order-id="${orderId}"
                            aria-label="Viết đánh giá cho ${product.name}">
                        &#9998; Viết đánh giá
                    </button>`;
            }

            // Insert zone after the product item
            targetItem.parentNode.insertBefore(zone, targetItem.nextSibling);

            // Inject accordion form right after the zone
            if (!alreadyDone) {
                const accordionWrap = document.createElement('div');
                accordionWrap.innerHTML = buildFormHTML(orderId, product);
                zone.parentNode.insertBefore(accordionWrap.firstElementChild, zone.nextSibling);

                // Wire button to open accordion
                const btn = zone.querySelector(`[data-review-trigger="${productId}"]`);
                if (btn) {
                    btn.addEventListener('click', () => openForm(productId));
                }

                wireForm(orderId, product);
            }
        });
    }

    /**
     * openForm — expand accordion for a specific product
     * @param {string} productId
     */
    function openForm(productId) {
        const accordion = document.getElementById(`review-accordion-${productId}`);
        if (!accordion) return;

        // Security: verify the accordion belongs to current user's order (US 11-2 AC2.2)
        const orderId = accordion.dataset.orderId;
        const userId  = getCurrentUserId();
        // In frontend-only mode we trust localStorage; in real app this would be server-validated
        if (!orderId || !userId) {
            showToast('Bạn không có quyền đánh giá giao dịch này.', 'error');
            return;
        }

        accordion.classList.toggle('open');
        if (accordion.classList.contains('open')) {
            accordion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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

    // Expose
    global.ReviewHandler = { init, openForm, Lightbox };

})(window);
