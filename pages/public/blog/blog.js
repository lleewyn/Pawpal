/**
 * PawPal Journal — trang danh sách Cẩm nang.
 * Chỉ trình bày dữ liệu từ DataLoader; không tạo bài viết hoặc lượt xem giả.
 */
(function () {
    'use strict';

    const PAGE_SIZE = 6;
    const DETAIL_PATH = '/pages/public/blog-detail/blog-detail.html';
    const state = {
        articles: [],
        matches: [],
        featuredIds: new Set(),
        category: 'all',
        pet: 'all',
        keyword: '',
        sort: 'latest',
        page: 1,
        loaded: false
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }

    function safeImageUrl(value) {
        const url = String(value ?? '').trim();
        if (!url) return '';
        try {
            const parsed = new URL(url, window.location.origin);
            if (!['http:', 'https:'].includes(parsed.protocol)) return '';
            return parsed.href;
        } catch {
            return '';
        }
    }

    function normalize(value) {
        return String(value ?? '').toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
    }

    function formatDateVN(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.valueOf())) return '';
        return new Intl.DateTimeFormat('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric'
        }).format(date);
    }

    function detailUrl(article) {
        return DETAIL_PATH + '?slug=' + encodeURIComponent(String(article.slug || ''));
    }

    function imageMarkup(article, className, eager = false) {
        const src = safeImageUrl(article.thumbnail);
        if (!src) return '<span class="article-image-missing">PawPal Journal</span>';
        return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(article.title)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
    }

    function readingLabel(article) {
        return escapeHtml(article.readingTime || 'Bài viết');
    }

    function toArticle(blog) {
        const title = String(blog.title || 'Bài viết chưa có tiêu đề');
        const target = String(blog.petTarget || '').toLowerCase();
        let pet = target;
        if (!['all', 'cho', 'meo', 'be-con'].includes(pet)) {
            const normalized = normalize(title);
            if (normalized.includes('cho con') || normalized.includes('meo con')) pet = 'be-con';
            else if (normalized.includes('meo')) pet = 'meo';
            else if (normalized.includes('cho') || normalized.includes('cun')) pet = 'cho';
            else pet = 'all';
        }
        const labels = { all: 'Chó & mèo', cho: 'Chó cưng', meo: 'Mèo cưng', 'be-con': 'Bé con' };
        const rawViews = Number(blog.viewCount ?? blog.view_count);
        const content = String(blog.content || '');
        return {
            ...blog,
            title,
            id: blog.id,
            petTarget: pet,
            petTargetLabel: blog.petTargetLabel || labels[pet],
            author: blog.author || 'PawPal',
            readingTime: blog.readingTime || (content ? `${Math.max(1, Math.ceil(content.replace(/<[^>]*>/g, '').length / 1000))} phút đọc ước tính` : ''),
            viewCount: Number.isFinite(rawViews) ? Math.max(0, rawViews) : null,
            thumbnail: blog.thumbnail || blog.thumbnail_url || '',
            categoryName: blog.categoryName || 'Cẩm nang',
            date: blog.date || blog.publish_at || blog.created_at || null
        };
    }

    function sorting(articles, order = 'latest') {
        return [...articles].sort((a, b) => {
            if (order === 'popular') return (b.viewCount ?? -1) - (a.viewCount ?? -1);
            return (new Date(b.date).getTime() || 0) - (new Date(a.date).getTime() || 0);
        });
    }

    function featuredCard(article, main) {
        const url = escapeHtml(detailUrl(article));
        if (main) {
            return `<a class="bento-hero-card" href="${url}">
                <div class="bento-hero-media">${imageMarkup(article, 'feature-image', true)}</div>
                <div class="bento-hero-body">
                    <span class="bento-category-tag">${escapeHtml(article.categoryName)}</span>
                    <h3 class="bento-hero-title">${escapeHtml(article.title)}</h3>
                    <p class="bento-hero-excerpt">${escapeHtml(article.summary || '')}</p>
                    <div class="bento-hero-footer"><span>${escapeHtml(formatDateVN(article.date))}</span><span class="read-more-text">Đọc câu chuyện <span aria-hidden="true">↗</span></span></div>
                </div>
            </a>`;
        }
        return `<a class="bento-mini-card" href="${url}">
            <div class="bento-mini-media">${imageMarkup(article, 'feature-image')}</div>
            <div class="bento-mini-body">
                <span class="bento-category-tag">${escapeHtml(article.categoryName)}</span>
                <h3 class="bento-mini-title">${escapeHtml(article.title)}</h3>
                <p class="bento-mini-excerpt">${escapeHtml(article.summary || '')}</p>
                <span class="bento-mini-meta">${escapeHtml(formatDateVN(article.date))} ${article.readingTime ? '· ' + readingLabel(article) : ''}</span>
            </div>
        </a>`;
    }

    function renderSpotlight() {
        const container = byId('blogHeroBentoGrid');
        if (!container) return;
        const ordered = sorting(state.articles);
        const featuredFirst = ordered.filter((a) => Boolean(a.is_featured ?? a.featured));
        const spotlight = [...featuredFirst, ...ordered.filter((a) => !featuredFirst.includes(a))].slice(0, 3);
        state.featuredIds = new Set(spotlight.map((a) => a.id));
        if (!spotlight.length) {
            container.innerHTML = '<p class="bento-loading-placeholder">Hiện chưa có bài viết được xuất bản.</p>';
            return;
        }
        container.innerHTML = featuredCard(spotlight[0], true)
            + (spotlight.length > 1 ? `<div class="bento-stacked-cards">${spotlight.slice(1).map((a) => featuredCard(a, false)).join('')}</div>` : '');
    }

    function renderSidebar() {
        const box = byId('sidebarTrendingList');
        if (!box) return;
        const viewed = state.articles.filter((a) => a.viewCount !== null);
        if (!viewed.length) {
            box.innerHTML = '<p class="sidebar-empty">Chưa có thống kê lượt đọc.</p>';
            return;
        }
        box.innerHTML = sorting(viewed, 'popular').slice(0, 5).map((article, index) => `
            <a class="trending-row-item" href="${escapeHtml(detailUrl(article))}">
                <span class="trending-rank-num">${String(index + 1).padStart(2, '0')}</span>
                <span class="trending-row-info"><strong class="trending-row-title">${escapeHtml(article.title)}</strong>
                <span class="trending-row-meta">${article.viewCount.toLocaleString('vi-VN')} lượt đọc</span></span>
            </a>`).join('');
    }

    function updateActiveButtons() {
        document.querySelectorAll('#blogCategoryTabs [data-cat]').forEach((button) => {
            const active = button.dataset.cat === state.category;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        document.querySelectorAll('#blogPetChips [data-pet]').forEach((button) => {
            const active = button.dataset.pet === state.pet;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
        if (byId('blogSortSelect')) byId('blogSortSelect').value = state.sort;
        if (byId('blogSearchInput')) byId('blogSearchInput').value = state.keyword;
    }

    function matchCategory(article) {
        if (state.category === 'all') return true;
        const slug = normalize(article.categorySlug).replace(/\s+/g, '-');
        const title = normalize(article.categoryName);
        const terms = {
            tips: ['tips', 'cham soc', 'meo vat', 'kien thuc'],
            'dinh-duong': ['dinh duong', 'khau phan'],
            'suc-khoe': ['suc khoe', 'y te', 'benh'],
            'huan-luyen': ['huan luyen', 'tap tinh'],
            promo: ['khuyen mai', 'su kien', 'promo'],
            news: ['tin tuc', 'pawpal news']
        };
        if (slug === state.category || slug === state.category.replace(/-/g, '')) return true;
        return (terms[state.category] || []).some((term) => title.includes(term) || slug.includes(term.replace(/ /g, '-')));
    }

    function refreshFilters() {
        let matches = state.articles.filter((article) => {
            if (!matchCategory(article)) return false;
            if (state.pet !== 'all' && article.petTarget !== 'all' && article.petTarget !== state.pet) return false;
            const searchHaystack = normalize([article.title, article.summary, article.categoryName, article.petTargetLabel].join(' '));
            return !state.keyword || searchHaystack.includes(normalize(state.keyword));
        });
        const isDefault = state.category === 'all' && state.pet === 'all' && !state.keyword.trim() && state.sort === 'latest';
        if (isDefault && matches.length > 5) {
            matches = matches.filter((a) => !state.featuredIds.has(a.id));
        }
        state.matches = sorting(matches, state.sort);
        state.page = 1;
        renderFeed();
        updateActiveButtons();
        try {
            sessionStorage.setItem('pawpal_blog_filters', JSON.stringify({
                currentCategory: state.category, currentPetTarget: state.pet,
                currentKeyword: state.keyword, currentSort: state.sort
            }));
        } catch { /* Private browsing can disable storage. */ }
    }

    function feedCard(article) {
        const url = escapeHtml(detailUrl(article));
        return `<article class="magazine-article-card">
            <a href="${url}" class="article-card-media" tabindex="-1" aria-hidden="true">
                ${imageMarkup(article, 'article-card-image')}</a>
            <div class="article-card-body">
                <p class="article-meta-line"><span>${escapeHtml(article.categoryName)}</span><span aria-hidden="true">·</span><time>${escapeHtml(formatDateVN(article.date))}</time></p>
                <h3 class="article-title"><a href="${url}">${escapeHtml(article.title)}</a></h3>
                <p class="article-excerpt">${escapeHtml(article.summary || '')}</p>
                <div class="article-card-footer"><span>${readingLabel(article)}</span><span class="article-pet-target">${escapeHtml(article.petTargetLabel)}</span></div>
            </div>
        </article>`;
    }

    function renderFeed() {
        const grid = byId('articlesCardGrid');
        const empty = byId('blogEmptyBox');
        const count = byId('articlesCountTitle');
        if (!grid) return;
        if (count) count.textContent = `${state.matches.length} bài viết`;
        if (empty) empty.hidden = state.matches.length > 0;
        grid.replaceChildren();
        if (state.matches.length) {
            const start = (state.page - 1) * PAGE_SIZE;
            grid.innerHTML = state.matches.slice(start, start + PAGE_SIZE).map(feedCard).join('');
        }
        renderPagination();
    }

    function renderPagination() {
        const wrapper = byId('blogPaginationWrapper');
        const list = byId('blogPagination');
        if (!wrapper || !list) return;
        const total = Math.ceil(state.matches.length / PAGE_SIZE);
        wrapper.hidden = total <= 1;
        if (total <= 1) {
            list.replaceChildren();
            return;
        }
        const pages = [
            { text: 'Trước', page: state.page - 1, disabled: state.page === 1 },
            ...Array.from({ length: total }, (_, index) => ({ text: String(index + 1), page: index + 1, current: index + 1 === state.page })),
            { text: 'Tiếp', page: state.page + 1, disabled: state.page === total }
        ];
        list.innerHTML = pages.map(({ text, page, disabled, current }) => `
            <li class="page-item"><button type="button" class="page-link${current ? ' active' : ''}"
            data-page="${page}" ${disabled ? 'disabled' : ''} ${current ? 'aria-current="page"' : ''}>${text}</button></li>`).join('');
    }

    async function loadArticles() {
        if (!window.DataLoader || typeof window.DataLoader.loadBlogs !== 'function') {
            throw new Error('Không tìm thấy nguồn tải Cẩm nang');
        }
        const data = await window.DataLoader.loadBlogs(true);
        state.articles = (Array.isArray(data) ? data : []).map(toArticle).filter((a) => a.slug);
        state.loaded = true;
        renderSpotlight();
        renderSidebar();
        refreshFilters();
    }

    function attachEvents() {
        byId('blogSearchForm')?.addEventListener('submit', (event) => {
            event.preventDefault();
            state.keyword = byId('blogSearchInput').value.trim();
            refreshFilters();
            byId('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        byId('blogSearchInput')?.addEventListener('input', (event) => {
            state.keyword = event.target.value;
            refreshFilters();
        });
        byId('blogCategoryTabs')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-cat]');
            if (!button) return;
            state.category = button.dataset.cat;
            refreshFilters();
        });
        byId('blogPetChips')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-pet]');
            if (!button) return;
            state.pet = button.dataset.pet;
            refreshFilters();
        });
        document.querySelectorAll('.btn-keyword-chip').forEach((button) => {
            button.addEventListener('click', () => {
                state.keyword = button.dataset.keyword || '';
                refreshFilters();
                byId('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
        byId('popularTagsCloud')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-tag]');
            if (!button) return;
            state.keyword = button.dataset.tag.replace(/-/g, ' ');
            refreshFilters();
            byId('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        byId('blogSortSelect')?.addEventListener('change', (event) => {
            state.sort = event.target.value;
            refreshFilters();
        });
        byId('btnResetFilters')?.addEventListener('click', () => {
            state.category = 'all';
            state.pet = 'all';
            state.keyword = '';
            state.sort = 'latest';
            refreshFilters();
        });
        byId('blogPagination')?.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-page]');
            if (!button || button.disabled) return;
            const page = Number(button.dataset.page);
            if (page !== state.page && page >= 1 && page <= Math.ceil(state.matches.length / PAGE_SIZE)) {
                state.page = page;
                renderFeed();
                byId('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        byId('mainContent')?.addEventListener('error', (event) => {
            if (event.target.tagName === 'IMG') {
                event.target.hidden = true;
                event.target.parentElement.classList.add('missing-image');
            }
        }, true);
    }

    window.initBlog = async function initBlog() {
        const root = byId('blogCategoryTabs');
        if (!root || root.dataset.blogReady === 'true') return;
        root.dataset.blogReady = 'true';
        try {
            const saved = JSON.parse(sessionStorage.getItem('pawpal_blog_filters') || 'null');
            if (saved) {
                state.category = saved.currentCategory || 'all';
                state.pet = saved.currentPetTarget || 'all';
                state.keyword = saved.currentKeyword || '';
                state.sort = saved.currentSort || 'latest';
            }
        } catch { /* Optional state only. */ }
        const query = new URLSearchParams(window.location.search);
        if (query.has('search')) state.keyword = query.get('search') || '';
        const category = query.get('category');
        if (category === 'dog') {
            state.pet = 'cho';
            state.category = 'all';
        } else if (category === 'cat') {
            state.pet = 'meo';
            state.category = 'all';
        }
        else if (['tips', 'dinh-duong', 'suc-khoe', 'huan-luyen', 'promo', 'news'].includes(category)) state.category = category;
        updateActiveButtons();
        attachEvents();
        try {
            await loadArticles();
        } catch (error) {
            console.error('Lỗi tải cẩm nang:', error);
            byId('blogHeroBentoGrid').innerHTML = '<p class="bento-loading-placeholder">Chưa thể tải bài viết. Vui lòng thử lại sau.</p>';
            byId('articlesCountTitle').textContent = 'Không thể tải danh sách bài viết';
            byId('articlesCardGrid').innerHTML = '<p class="feed-error">Không thể kết nối dữ liệu Cẩm nang. Vui lòng tải lại trang.</p>';
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initBlog, { once: true });
    } else {
        window.initBlog();
    }
})();
