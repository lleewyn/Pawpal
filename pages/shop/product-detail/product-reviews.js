

(function () {
    'use strict';

    
    const Lightbox = (function () {
        let overlay, mediaEl, prevBtn, nextBtn;
        let items = [], idx = 0;

        function build() {
            overlay = document.createElement('div');
            overlay.className = 'review-lightbox-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-label', 'Xem ảnh đánh giá');
            overlay.innerHTML = `
                <button class="lightbox-close" aria-label="Đóng">&times;</button>
                <div class="lightbox-inner"></div>
                <button class="lightbox-nav lightbox-prev" aria-label="Ảnh trước">&#8249;</button>
                <button class="lightbox-nav lightbox-next" aria-label="Ảnh sau">&#8250;</button>
            `;
            mediaEl = overlay.querySelector('.lightbox-inner');
            prevBtn = overlay.querySelector('.lightbox-prev');
            nextBtn = overlay.querySelector('.lightbox-next');

            overlay.querySelector('.lightbox-close').addEventListener('click', close);
            overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
            prevBtn.addEventListener('click', () => nav(-1));
            nextBtn.addEventListener('click', () => nav(1));
            document.addEventListener('keydown', e => {
                if (!overlay.classList.contains('open')) return;
                if (e.key === 'Escape')     close();
                if (e.key === 'ArrowLeft')  nav(-1);
                if (e.key === 'ArrowRight') nav(1);
            });
            document.body.appendChild(overlay);
        }

        function open(mediaArr, startIdx) {
            if (!overlay) build();
            items = mediaArr;
            idx   = startIdx || 0;
            render();
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            if (!overlay) return;
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }

        function nav(dir) {
            idx = Math.max(0, Math.min(items.length - 1, idx + dir));
            render();
        }

        function render() {
            const item = items[idx];
            mediaEl.innerHTML = item.isVideo
                ? `<video src="${item.src}" controls autoplay style="max-width:90vw;max-height:85vh;"></video>`
                : `<img src="${item.src}" alt="Ảnh đánh giá ${idx + 1}" style="max-width:90vw;max-height:85vh;object-fit:contain;">`;
            prevBtn.disabled = idx === 0;
            nextBtn.disabled = idx === items.length - 1;
        }

        return { open };
    })();

    
    let allReviewEls = [];
    let activeFilter = 'all';

    
    function init() {
        allReviewEls = Array.from(document.querySelectorAll('.review-item'));
        if (!allReviewEls.length) return;

        bindFilterTabs();
        bindLightbox();
        bindHelpful();
    }

    
    function bindFilterTabs() {
        const tabs = document.querySelectorAll('.filter-tab[data-filter]');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeFilter = tab.dataset.filter;
                applyFilter();
            });
        });
    }

    function applyFilter() {
        allReviewEls.forEach(el => {
            let show = true;
            const stars     = parseInt(el.dataset.stars || '0', 10);
            const hasMedia  = el.dataset.hasMedia === 'true';

            if (activeFilter === 'media') {
                show = hasMedia;
            } else if (activeFilter === 'replied') {
                show = el.querySelector('.seller-reply') !== null;
            } else if (activeFilter !== 'all') {
                const filterStars = parseInt(activeFilter, 10);
                show = stars === filterStars;
            }

            el.style.display = show ? '' : 'none';
        });
    }

    
    function bindLightbox() {
        document.querySelectorAll('.reviews-list').forEach(container => {
            container.addEventListener('click', e => {
                
                const imgEl = e.target.closest('img.review-photo, .review-media-list img');
                if (!imgEl) return;

                
                const reviewItem = imgEl.closest('.review-item');
                if (!reviewItem) return;

                const mediaEls = Array.from(
                    reviewItem.querySelectorAll('img.review-photo, .review-media-list img')
                );
                const mediaArr = mediaEls.map(img => ({ src: img.src, isVideo: false }));
                const startIdx = mediaEls.indexOf(imgEl);
                Lightbox.open(mediaArr, Math.max(0, startIdx));
            });
        });
    }

    
    function bindHelpful() {
        document.querySelectorAll('.reviews-list').forEach(container => {
            container.addEventListener('click', e => {
                const btn = e.target.closest('.btn-helpful');
                if (!btn || btn.dataset.voted) return;

                btn.dataset.voted = '1';
                btn.style.color   = 'var(--color-primary)';
                btn.style.fontWeight = '600';

                
                const match = btn.textContent.match(/\((\d+)\)/);
                const count = match ? parseInt(match[1], 10) + 1 : 1;

                
                btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    Hữu ích (${count})
                `;
            });
        });
    }

    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
