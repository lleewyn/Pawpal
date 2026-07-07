let entries = [];
const mainFilters = [...document.querySelectorAll('.main-filters .btn-filter-pill')];
const subFilters = [...document.querySelectorAll('.sub-filters .btn-filter-tag')];
const searchForm = document.querySelector('.blog-search-form');
const searchInput = document.querySelector('#blogSearchInput');
const emptyState = document.querySelector('#blogEmptyState');

let activeMain = 'all';
let activeTag = 'all';
let searchKeyword = '';

function normalizeText(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function matchesTag(entryTags, expectedTag) {
    if (expectedTag === 'all') return true;
    return entryTags.includes(expectedTag);
}

function applyFilters() {
    let visibleCount = 0;
    entries.forEach((entry) => {
        const main = entry.dataset.main || '';
        const tags = normalizeText(entry.dataset.tags || '').split(/\s+/).filter(Boolean);
        const title = normalizeText(entry.textContent || '');

        const isTipsEntry = main === 'tips';
        const tagMatch = matchesTag(tags, activeTag);
        const searchMatch = !searchKeyword || title.includes(searchKeyword);
        const shouldShow = isTipsEntry
            ? tagMatch && searchMatch
            : true;

        entry.hidden = !shouldShow;
        if (shouldShow) {
            visibleCount += 1;
        }
    });

    if (emptyState) {
        emptyState.hidden = visibleCount > 0;
    }
}

function setActiveFilter(buttons, currentButton) {
    buttons.forEach((button) => button.classList.remove('active'));
    currentButton.classList.add('active');
}

mainFilters.forEach((button) => {
    button.addEventListener('click', () => {
        activeMain = button.dataset.mainTarget || 'all';
        setActiveFilter(mainFilters, button);
        applyFilters();

        const target = button.dataset.mainTarget === 'promo'
            ? '#blog-promo-column'
            : button.dataset.mainTarget === 'news'
                ? '#blog-news-column'
                : button.dataset.scrollTarget;

        if (target) {
            requestAnimationFrame(() => {
                document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
    });
});

subFilters.forEach((button) => {
    button.addEventListener('click', () => {
        activeTag = button.dataset.tag || 'all';
        setActiveFilter(subFilters, button);
        applyFilters();
    });
});

if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        searchKeyword = normalizeText(searchInput.value);
        applyFilters();
        document.querySelector('#blog-latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    searchInput.addEventListener('input', () => {
        searchKeyword = normalizeText(searchInput.value);
        applyFilters();
    });
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function createBlogCard(blog, type = 'standard', rank = 1) {
    const mainCat = blog.categorySlug;
    const url = `../blog-detail/blog-detail.html?slug=${blog.slug}`;
    const readingTime = Math.max(2, Math.ceil(blog.content.length / 1000)) + ' phút đọc';

    if (type === 'spotlight') {
        return `
        <article class="blog-hero-spotlight blog-entry" data-main="${mainCat}" data-tags="${mainCat}">
            <a href="${url}" class="card-img-link">
                <div class="img-wrapper">
                    <img src="${blog.thumbnail}" alt="${blog.title}" loading="lazy">
                    <span class="card-badge">Bài nổi bật</span>
                </div>
            </a>
            <div class="card-content">
                <div class="card-meta-line">
                    <span class="card-date">${formatDate(blog.date)}</span>
                    <span class="card-reading-time">${readingTime}</span>
                </div>
                <h2 class="card-title"><a href="${url}">${blog.title}</a></h2>
                <p class="card-excerpt">${blog.summary}</p>
                <div class="card-tags">
                    <span>${blog.categoryName}</span>
                </div>
            </div>
        </article>`;
    }

    if (type === 'featured') {
        return `
        <article class="blog-card featured-card blog-entry" data-main="${mainCat}" data-tags="${mainCat}">
            <a href="${url}" class="card-img-link">
                <div class="img-wrapper">
                    <img src="${blog.thumbnail}" alt="${blog.title}" loading="lazy">
                    <span class="card-badge">Mới nhất</span>
                </div>
            </a>
            <div class="card-content">
                <div class="card-meta-line">
                    <span class="card-date">${formatDate(blog.date)}</span>
                    <span class="card-reading-time">${readingTime}</span>
                </div>
                <h3 class="card-title"><a href="${url}">${blog.title}</a></h3>
                <p class="card-excerpt">${blog.summary}</p>
            </div>
        </article>`;
    }

    if (type === 'small') {
        return `
        <article class="blog-card-small blog-entry" data-main="${mainCat}" data-tags="${mainCat}">
            <a href="${url}" class="card-img-link"><img src="${blog.thumbnail}" alt="${blog.title}"></a>
            <div class="card-content">
                <div class="card-meta-line">
                    <span class="card-date">${formatDate(blog.date)}</span>
                    <span class="card-reading-time">${readingTime}</span>
                </div>
                <h3 class="card-title"><a href="${url}">${blog.title}</a></h3>
            </div>
        </article>`;
    }

    if (type === 'trending') {
        return `
        <article class="trending-item blog-entry" data-main="${mainCat}" data-tags="${mainCat}">
            <div class="trending-rank">${rank}</div>
            <a href="${url}" class="trending-img"><img src="${blog.thumbnail}" alt="${blog.title}"></a>
            <div class="trending-content">
                <div class="card-meta-line">
                    <span class="trending-date">${formatDate(blog.date)}</span>
                    <span class="card-reading-time">${readingTime}</span>
                </div>
                <h3 class="trending-title"><a href="${url}">${blog.title}</a></h3>
            </div>
        </article>`;
    }

    if (type === 'news') {
        return `
        <article class="news-list-item blog-entry" data-main="${mainCat}" data-tags="${mainCat}">
            <a href="${url}" class="news-img"><img src="${blog.thumbnail}" alt="${blog.title}"></a>
            <div class="news-content">
                <div class="card-meta-line">
                    <span class="news-date">${formatDate(blog.date)}</span>
                    <span class="card-reading-time">${readingTime}</span>
                </div>
                <h3 class="news-title"><a href="${url}">${blog.title}</a></h3>
            </div>
        </article>`;
    }

    // standard
    return `
    <article class="blog-card standard-card blog-entry" data-main="${mainCat}" data-tags="${mainCat}">
        <a href="${url}" class="card-img-link"><img src="${blog.thumbnail}" alt="${blog.title}"></a>
        <div class="card-content">
            <div class="card-meta-line">
                <span class="card-date">${formatDate(blog.date)}</span>
                <span class="card-reading-time">${readingTime}</span>
            </div>
            <h3 class="card-title"><a href="${url}">${blog.title}</a></h3>
        </div>
    </article>`;
}

async function initBlog() {
    if (!window.DataLoader || !window.DataLoader.loadBlogs) {
        setTimeout(initBlog, 100);
        return;
    }

    const blogs = await window.DataLoader.loadBlogs();
    
    // Categorize blogs based on categorySlug
    const tips = blogs.filter(b => b.categorySlug === 'tips');
    const news = blogs.filter(b => b.categorySlug === 'news');
    const promo = blogs.filter(b => b.categorySlug === 'promo');
    
    // Spotlight section
    const spotlightWrapper = document.querySelector('#blog-hero-spotlight-wrapper');
    if (spotlightWrapper && blogs.length > 0) {
        // Find "Có nên tắm cho chó" or just pick the most viewed overall
        const spotlightBlog = blogs.find(b => b.title.includes('tắm cho chó')) || blogs[0];
        spotlightWrapper.innerHTML = createBlogCard(spotlightBlog, 'spotlight');
    }

    // Latest section
    const latestGrid = document.querySelector('#latest-grid-wrapper');
    const standardGrid = document.querySelector('#blog-card-grid');
    if (latestGrid && tips.length > 0) {
        const featured = tips[0];
        const smallList = tips.slice(1, 4);
        const standardList = tips.slice(4);

        let html = createBlogCard(featured, 'featured');
        if (smallList.length > 0) {
            html += '<div class="stacked-cards-list">';
            html += smallList.map(b => createBlogCard(b, 'small')).join('');
            html += '</div>';
        }
        latestGrid.innerHTML = html;

        if (standardGrid) {
            standardGrid.innerHTML = standardList.map(b => createBlogCard(b, 'standard')).join('');
        }
    }

    // Trending section (sort by views)
    const trendingList = document.querySelector('#trending-list-wrapper');
    if (trendingList) {
        const topTrending = [...blogs].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3);
        trendingList.innerHTML = topTrending.map((b, i) => createBlogCard(b, 'trending', i + 1)).join('');
    }

    // News & Promo sections
    const promoList = document.querySelector('#blog-promo-list');
    if (promoList) {
        promoList.innerHTML = promo.map(b => createBlogCard(b, 'news')).join('');
    }

    const newsList = document.querySelector('#blog-news-list');
    if (newsList) {
        newsList.innerHTML = news.map(b => createBlogCard(b, 'news')).join('');
    }

    // Re-bind entries for filtering
    entries = [...document.querySelectorAll('.blog-entry')];

    // Handle URL params
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        const normalizedCategory = normalizeText(categoryParam);
        if (normalizedCategory === 'events') {
            const promoButton = mainFilters.find((button) => button.dataset.mainTarget === 'promo');
            promoButton?.click();
        } else if (normalizedCategory === 'tips') {
            const tipsButton = mainFilters.find((button) => button.dataset.mainTarget === 'tips');
            tipsButton?.click();
        }
    }

    applyFilters();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlog);
} else {
    initBlog();
}
