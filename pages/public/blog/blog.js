/**
 * PAWPAL BLOG & EDITORIAL MAGAZINE JAVASCRIPT
 * Live Filtering, Bento Spotlight, Sidebar Widgets & Search
 */

let allBlogs = [];
let filteredBlogs = [];
let currentCategory = 'all';
let currentPetTarget = 'all';
let currentKeyword = '';
let currentSort = 'latest';
let currentPage = 1;
const itemsPerPage = 6;

function normalizeText(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function formatDateVN(dateStr) {
    if (!dateStr) return 'Gần đây';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

async function loadAndPrepareBlogs() {
    let rawBlogs = [];
    if (window.DataLoader && typeof window.DataLoader.loadBlogs === 'function') {
        try {
            rawBlogs = await window.DataLoader.loadBlogs(true);
        } catch (e) {
            console.error('Không thể tải bài viết từ CSDL:', e);
            const title = document.getElementById('articlesCountTitle');
            if (title) title.textContent = 'Không thể tải bài viết';
            const grid = document.getElementById('articlesCardGrid');
            if (grid) grid.innerHTML = '<p>Không thể tải bài viết. Vui lòng tải lại trang để thử lại.</p>';
            return;
        }
    }

    rawBlogs = Array.isArray(rawBlogs) ? rawBlogs : [];

    // Enhance blogs with metadata
    allBlogs = rawBlogs.map((b, idx) => {
        const titleLower = (b.title || '').toLowerCase();
        let petTarget = b.petTarget || 'all';
        let petLabel = b.petTargetLabel || 'Chó và Mèo';

        if (titleLower.includes('mèo con')) {
            petTarget = 'be-con';
            petLabel = 'Mèo con';
        } else if (titleLower.includes('chó con')) {
            petTarget = 'be-con';
            petLabel = 'Chó con';
        } else if (titleLower.includes('mèo')) {
            petTarget = 'meo';
            petLabel = 'Mèo cưng';
        } else if (titleLower.includes('chó') || titleLower.includes('cún')) {
            petTarget = 'cho';
            petLabel = 'Chó cưng';
        }

        const readTime = b.readingTime || (b.content ? Math.max(3, Math.ceil(b.content.length / 900)) + ' phút đọc' : '4 phút đọc');
        const viewCount = Math.max(0, Number(b.viewCount ?? b.view_count) || 0);

        return {
            ...b,
            petTarget,
            petTargetLabel: petLabel,
            readingTime: readTime,
            viewCount: viewCount,
            author: b.author || 'Chuyên gia Pawpal'
        };
    });

    renderHeroBentoSpotlight();
    renderSidebarWidgets();
    applyCombinedFilters();
}

/**
 * 1. RENDER HERO BENTO SPOTLIGHT (1 Main + 2 Side Articles)
 */
function renderHeroBentoSpotlight() {
    const container = document.getElementById('blogHeroBentoGrid');
    if (!container || allBlogs.length === 0) return;

    const spotlight = allBlogs.find(b => b.title.includes('tắm cho chó') || b.categorySlug === 'tips') || allBlogs[0];
    const sideArticles = allBlogs.filter(b => b.id !== spotlight.id).slice(0, 2);

    const spotlightUrl = `/pages/public/blog-detail/blog-detail.html?slug=${encodeURIComponent(spotlight.slug)}`;

    let html = `
        <a href="${spotlightUrl}" class="bento-hero-card">
            <div class="bento-hero-media">
                <img src="${spotlight.thumbnail}" alt="${spotlight.title}" loading="lazy">
                <span class="bento-badge-spotlight">Bài Tiêu Điểm</span>
            </div>
            <div class="bento-hero-body">
                <div class="bento-meta-row">
                    <span class="bento-category-tag">${spotlight.categoryName || 'Cẩm nang'}</span>
                    <span>•</span>
                    <span>${formatDateVN(spotlight.date)}</span>
                    <span>•</span>
                    <span>${spotlight.readingTime}</span>
                </div>
                <h2 class="bento-hero-title">${spotlight.title}</h2>
                <p class="bento-hero-excerpt">${spotlight.summary || ''}</p>
                <div class="bento-hero-footer">
                    <div class="author-chip">
                        <span class="author-dot"></span>
                        <span>${spotlight.author}</span>
                    </div>
                    <span class="read-more-text">Đọc bài viết →</span>
                </div>
            </div>
        </a>

        <div class="bento-stacked-cards">
            ${sideArticles.map(article => {
                const articleUrl = `/pages/public/blog-detail/blog-detail.html?slug=${encodeURIComponent(article.slug)}`;
                return `
                    <a href="${articleUrl}" class="bento-mini-card">
                        <div class="bento-mini-media">
                            <img src="${article.thumbnail}" alt="${article.title}" loading="lazy">
                        </div>
                        <div class="bento-mini-body">
                            <div class="bento-meta-row">
                                <span class="bento-category-tag">${article.categoryName || 'Cẩm nang'}</span>
                                <span>•</span>
                                <span>${article.readingTime}</span>
                            </div>
                            <h3 class="bento-mini-title">${article.title}</h3>
                            <p class="bento-mini-excerpt">${article.summary || ''}</p>
                        </div>
                    </a>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

/**
 * 2. RENDER SIDEBAR WIDGETS
 */
function renderSidebarWidgets() {
    // Trending top 5
    const trendingContainer = document.getElementById('sidebarTrendingList');
    if (trendingContainer && allBlogs.length > 0) {
        const top5 = [...allBlogs].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
        trendingContainer.innerHTML = top5.map((b, i) => {
            const url = `/pages/public/blog-detail/blog-detail.html?slug=${encodeURIComponent(b.slug)}`;
            const num = (i + 1).toString().padStart(2, '0');
            return `
                <a href="${url}" class="trending-row-item">
                    <span class="trending-rank-num">${num}</span>
                    <div class="trending-row-info">
                        <h4 class="trending-row-title">${b.title}</h4>
                        <div class="trending-row-meta">
                            <span>${b.readingTime}</span> • <span>${b.viewCount.toLocaleString()} lượt đọc</span>
                        </div>
                    </div>
                </a>
            `;
        }).join('');
    }
}

/**
 * 3. COMBINED FILTERS & SEARCH
 */
function applyCombinedFilters() {
    try {
        sessionStorage.setItem('pawpal_blog_filters', JSON.stringify({ currentCategory, currentPetTarget, currentKeyword, currentSort }));
    } catch {}
    const normKeyword = normalizeText(currentKeyword);

    filteredBlogs = allBlogs.filter(b => {
        // Category match
        let matchCat = true;
        if (currentCategory !== 'all') {
            const bCat = (b.categorySlug || '').toLowerCase();
            const bName = normalizeText(b.categoryName || '');
            if (currentCategory === 'tips') matchCat = bCat === 'tips' || bName.includes('cham soc') || bName.includes('meo');
            else if (currentCategory === 'dinh-duong') matchCat = bCat === 'dinh-duong' || bName.includes('dinh duong');
            else if (currentCategory === 'suc-khoe') matchCat = bCat === 'suc-khoe' || bName.includes('suc khoe') || bName.includes('y te');
            else if (currentCategory === 'huan-luyen') matchCat = bCat === 'huan-luyen' || bName.includes('huan luyen') || bName.includes('tap tinh');
            else if (currentCategory === 'promo') matchCat = bCat === 'promo' || bName.includes('khuyen mai') || bName.includes('su kien');
            else if (currentCategory === 'news') matchCat = bCat === 'news' || bName.includes('tin tuc');
        }

        // Pet target match
        let matchPet = true;
        if (currentPetTarget !== 'all') {
            if (currentPetTarget === 'be-con') matchPet = b.petTarget === 'be-con';
            else if (currentPetTarget === 'cho') matchPet = b.petTarget === 'cho' || b.petTarget === 'all';
            else if (currentPetTarget === 'meo') matchPet = b.petTarget === 'meo' || b.petTarget === 'all';
        }

        // Search keyword match
        let matchSearch = true;
        if (normKeyword) {
            const fullText = normalizeText(`${b.title} ${b.summary} ${b.categoryName} ${b.petTargetLabel}`);
            matchSearch = fullText.includes(normKeyword);
        }

        return matchCat && matchPet && matchSearch;
    });

    // Apply sorting
    if (currentSort === 'popular') {
        filteredBlogs.sort((a, b) => b.viewCount - a.viewCount);
    } else {
        filteredBlogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    currentPage = 1;
    renderArticlesFeed();
}

/**
 * 4. RENDER ARTICLES FEED & PAGINATION
 */
function renderArticlesFeed() {
    const grid = document.getElementById('articlesCardGrid');
    const emptyBox = document.getElementById('blogEmptyBox');
    const countTitle = document.getElementById('articlesCountTitle');
    const pagWrapper = document.getElementById('blogPaginationWrapper');

    if (!grid) return;

    if (countTitle) {
        countTitle.textContent = `Danh sách bài viết (${filteredBlogs.length} bài)`;
    }

    if (filteredBlogs.length === 0) {
        grid.innerHTML = '';
        if (emptyBox) emptyBox.style.display = 'block';
        if (pagWrapper) pagWrapper.style.display = 'none';
        return;
    }

    if (emptyBox) emptyBox.style.display = 'none';

    // Pagination slice
    const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredBlogs.slice(startIndex, startIndex + itemsPerPage);

    grid.style.opacity = '0.35';
    grid.style.transition = 'opacity 140ms ease';
    grid.innerHTML = currentItems.map(blog => {
        const url = `/pages/public/blog-detail/blog-detail.html?slug=${encodeURIComponent(blog.slug)}`;
        return `
            <article class="magazine-article-card">
                <a href="${url}" class="article-card-media">
                    <img src="${blog.thumbnail}" alt="${blog.title}" loading="lazy">
                    <span class="article-cat-badge">${blog.categoryName || 'Cẩm nang'}</span>
                </a>
                <div class="article-card-body">
                    <div class="article-meta-line">
                        <span>${formatDateVN(blog.date)}</span>
                        <span>•</span>
                        <span>${blog.readingTime}</span>
                    </div>
                    <h3 class="article-title"><a href="${url}">${blog.title}</a></h3>
                    <p class="article-excerpt">${blog.summary || ''}</p>
                    <div class="article-card-footer">
                        <span>${blog.author}</span>
                        <span class="article-pet-target">${blog.petTargetLabel}</span>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    requestAnimationFrame(() => {
        grid.style.opacity = '1';
    });

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const pagWrapper = document.getElementById('blogPaginationWrapper');
    const pagUl = document.getElementById('blogPagination');
    if (!pagWrapper || !pagUl) return;

    if (totalPages <= 1) {
        pagWrapper.style.display = 'none';
        return;
    }

    pagWrapper.style.display = 'block';
    let html = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">‹</a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">›</a>
        </li>
    `;

    pagUl.innerHTML = html;
    pagUl.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const p = parseInt(link.getAttribute('data-page'));
            if (p > 0 && p <= totalPages && p !== currentPage) {
                currentPage = p;
                renderArticlesFeed();
                document.getElementById('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * 5. ATTACH INTERACTIVE LISTENERS
 */
function initEventListeners() {
    // Category Tabs
    const catTabs = document.querySelectorAll('#blogCategoryTabs .cat-tab-btn');
    catTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            catTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.cat || 'all';
            if (currentCategory === 'all') {
                currentPetTarget = 'all';
                currentKeyword = '';
                const search = document.getElementById('blogSearchInput');
                if (search) search.value = '';
                document.querySelectorAll('#blogPetChips .pet-chip-btn').forEach(chip => chip.classList.toggle('active', chip.dataset.pet === 'all'));
            }
            applyCombinedFilters();
        });
    });

    // Pet Type Chips
    const petChips = document.querySelectorAll('#blogPetChips .pet-chip-btn');
    petChips.forEach(chip => {
        chip.addEventListener('click', () => {
            petChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentPetTarget = chip.dataset.pet || 'all';
            applyCombinedFilters();
        });
    });

    // Search Form & Input
    const searchForm = document.getElementById('blogSearchForm');
    const searchInput = document.getElementById('blogSearchInput');
    if (searchForm && searchInput) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentKeyword = searchInput.value;
            applyCombinedFilters();
            document.getElementById('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        searchInput.addEventListener('input', () => {
            currentKeyword = searchInput.value;
            applyCombinedFilters();
        });
    }

    // Keyword Chips in Hero
    document.querySelectorAll('.btn-keyword-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const kw = chip.dataset.keyword;
            if (searchInput) searchInput.value = kw;
            currentKeyword = kw;
            applyCombinedFilters();
            document.getElementById('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Popular Tags in Sidebar
    document.querySelectorAll('.tag-cloud-btn').forEach(tagBtn => {
        tagBtn.addEventListener('click', () => {
            const tag = tagBtn.dataset.tag;
            if (searchInput) searchInput.value = tagBtn.textContent.replace('#', '');
            currentKeyword = String(tag || '').replace(/-/g, ' ');
            applyCombinedFilters();
            document.getElementById('blogFilterSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // Sort dropdown
    const sortSelect = document.getElementById('blogSortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applyCombinedFilters();
        });
    }

    // Reset Filters button
    const btnReset = document.getElementById('btnResetFilters');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            currentCategory = 'all';
            currentPetTarget = 'all';
            currentKeyword = '';
            if (searchInput) searchInput.value = '';

            document.querySelectorAll('#blogCategoryTabs .cat-tab-btn').forEach((t, i) => t.classList.toggle('active', i === 0));
            document.querySelectorAll('#blogPetChips .pet-chip-btn').forEach((c, i) => c.classList.toggle('active', i === 0));
            applyCombinedFilters();
            if (!allBlogs.length) loadAndPrepareBlogs();
        });
    }

    // Newsletter Form
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input').value;
            newsletterForm.innerHTML = '<div style="color:#165335;background:#DCEEE2;padding:10px 12px;border-radius:6px;font-size:12.5px;font-weight:600;">Cảm ơn bạn đã đăng ký nhận bản tin Pawpal!</div>';
        });
    }

    // URL Query Param Category Handlers
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        const targetTab = document.querySelector(`#blogCategoryTabs [data-cat="${categoryParam}"]`);
        if (targetTab) {
            targetTab.click();
        }
    }
}

window.initBlog = async function() {
    const root = document.getElementById('blogCategoryTabs');
    if (!root || root.dataset.blogReady === 'true') return;
    root.dataset.blogReady = 'true';
    try {
        const saved = JSON.parse(sessionStorage.getItem('pawpal_blog_filters') || 'null');
        if (saved) {
            currentCategory = saved.currentCategory || 'all';
            currentPetTarget = saved.currentPetTarget || 'all';
            currentKeyword = saved.currentKeyword || '';
            currentSort = saved.currentSort || 'latest';
            const search = document.getElementById('blogSearchInput');
            if (search) search.value = currentKeyword;
            document.querySelectorAll('#blogCategoryTabs .cat-tab-btn').forEach(tab => tab.classList.toggle('active', tab.dataset.cat === currentCategory));
            document.querySelectorAll('#blogPetChips .pet-chip-btn').forEach(chip => chip.classList.toggle('active', chip.dataset.pet === currentPetTarget));
        }
    } catch {}
    initEventListeners();
    await loadAndPrepareBlogs();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initBlog);
} else {
    window.initBlog();
}
