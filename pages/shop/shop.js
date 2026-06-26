/**
 * shop.js — Shop Page Interactive Logic (US 8-1)
 * Features: Category tabs, carousel, filters, search, sort, pagination
 */

// ══════════════════════════════════════════════════════════════════════════
// Static fallback data kept only for rendering support
// ══════════════════════════════════════════════════════════════════════════

const brandCatalog = [
    { id: 1, name: 'Royal Canin', logo: '/assets/images/shop/brand/royal-canin.png', slug: 'royal-canin' },
    { id: 2, name: 'Pedigree', logo: '/assets/images/shop/brand/Pedigree.png', slug: 'pedigree' },
    { id: 3, name: 'Me-O', logo: '/assets/images/shop/brand/me-o.png', slug: 'me-o' },
    { id: 4, name: 'Whiskas', logo: '/assets/images/shop/brand/Whiskas.png', slug: 'whiskas' },
    { id: 5, name: 'Hill\'s', logo: '/assets/images/shop/brand/Hills.png', slug: 'hills' },
    { id: 6, name: 'Purina', logo: '/assets/images/shop/brand/Purina.png', slug: 'purina' },
    { id: 7, name: 'Kong', logo: '/assets/images/shop/brand/Kong.png', slug: 'kong' },
    { id: 8, name: 'Taste of the Wild', logo: '/assets/images/shop/brand/Taste-of-the-wild.png', slug: 'taste-of-the-wild' },
    { id: 9, name: 'Frontline', logo: '/assets/images/shop/brand/frontline-plus.png', slug: 'frontline' },
    { id: 10, name: 'Furminator', logo: '/assets/images/shop/brand/FURminator.png', slug: 'furminator' },
    { id: 11, name: 'Nylabone', logo: '/assets/images/shop/brand/Nylabone.png', slug: 'nylabone' },
    { id: 12, name: 'Hartz', logo: '/assets/images/shop/brand/Hartz.png', slug: 'hartz' },
];

// ══════════════════════════════════════════════════════════════════════════
// State Management
// ══════════════════════════════════════════════════════════════════════════

let state = {
    products: [],
    filteredProducts: [],
    currentPage: 1,
    itemsPerPage: 20,
    filters: {
        category: 'all',
        brands: [],
        priceMin: 0,
        priceMax: 10000000,
        inStock: true,
        onSale: false,
        search: ''
    },
    sort: 'default',
    wishlist: [],
    isLoading: true
};

function isCompactShopLayout() {
    return window.innerWidth <= 1024;
}

function initResponsiveCategorySection() {
    const section = document.querySelector('.shop-by-category-section');
    const toggle = document.getElementById('categoryMobileToggle');
    const jumpLink = document.querySelector('.shop-category-jump');
    if (!section || !toggle) return;

    function syncCategorySection() {
        const shouldCollapse = window.innerWidth <= 768;
        const expanded = toggle.dataset.expanded === 'true';
        section.classList.toggle('is-collapsed', shouldCollapse && !expanded);
        toggle.hidden = !shouldCollapse;
        if (!shouldCollapse) {
            toggle.dataset.expanded = 'false';
            toggle.textContent = 'Xem thêm danh mục';
        }
    }

    toggle.addEventListener('click', () => {
        const expanded = toggle.dataset.expanded === 'true';
        toggle.dataset.expanded = expanded ? 'false' : 'true';
        toggle.textContent = expanded ? 'Xem thêm danh mục' : 'Thu gọn danh mục';
        syncCategorySection();
    });

    if (jumpLink) {
        jumpLink.addEventListener('click', (event) => {
            if (window.innerWidth <= 768) {
                event.preventDefault();
                document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    window.addEventListener('resize', syncCategorySection);
    syncCategorySection();
}

// ══════════════════════════════════════════════════════════════════════════
// Initialization
// ══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== SHOP PAGE LOADING ===');
    
    // Load products from CSV
    try {
        console.log('Loading products from DataLoader...');
        state.products = await window.DataLoader.loadProducts();
        console.log(` Loaded ${state.products.length} products`);
        state.isLoading = false;
        state.wishlist = loadWishlist();
        
        // Initialize UI after data loaded
        initSuggestionsSidebar();
        initCategoryGrid();
        initResponsiveCategorySection();
        initFilters();
        
        // --- Parse URL parameters ---
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        if (categoryParam) {
            let selectedCats = [categoryParam];
            if (categoryParam === 'food') selectedCats = ['food-dry', 'food-wet', 'bones'];
            else if (categoryParam === 'care') selectedCats = ['health', 'grooming', 'hygiene'];
            else if (categoryParam === 'toys') selectedCats = ['toys', 'accessories', 'clothes', 'bowls'];
            else if (categoryParam === 'other') selectedCats = ['furniture', 'other'];

            state.filters.category = selectedCats;
            
            // Update checkbox UI
            const categoryFilters = document.getElementById('categoryFilters');
            if (categoryFilters) {
                categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.value === 'all') cb.checked = false;
                    else cb.checked = selectedCats.includes(cb.value);
                });
                
                // If nothing was checked, fallback to all
                const checked = categoryFilters.querySelectorAll('input[type="checkbox"]:checked');
                if (checked.length === 0) {
                    categoryFilters.querySelector('input[value="all"]').checked = true;
                    state.filters.category = 'all';
                }
            }
        }
        // -----------------------------

        initToolbar();
        initBrands();
        initMobileFilter();
        applyFilters();
        renderProducts();
        
        console.log('=== SHOP PAGE READY ===');
    } catch (error) {
        console.error(' Error loading products:', error);
        state.isLoading = false;
        
        // Show error message
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #fff3cd; border-radius: 8px;">
                    <h3 style="color: #856404; margin-bottom: 10px;">️ Không thể tải dữ liệu sản phẩm</h3>
                    <p style="color: #856404;">Vui lòng kiểm tra kết nối và thử lại.</p>
                    <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: #2a5944; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Tải lại trang
                    </button>
                </div>
            `;
        }
    }
});

// ══════════════════════════════════════════════════════════════════════════
// Suggestions Sidebar
// ══════════════════════════════════════════════════════════════════════════

function initSuggestionsSidebar() {
    const suggestionsList = document.getElementById('suggestionsList');
    
    // Get top 8 products for suggestions (in stock + mix of sale items)
    const suggestions = state.products
        .filter(p => p.inStock)
        .sort((a, b) => {
            // Prioritize sale items
            if (a.sale && !b.sale) return -1;
            if (!a.sale && b.sale) return 1;
            return 0;
        })
        .slice(0, 8);
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Đang tải...</p>';
        return;
    }
    
    suggestionsList.innerHTML = suggestions.map(product => `
        <a href="product-detail/product-detail.html?id=${product.id}" class="suggestion-card">
            <div class="suggestion-image-wrapper">
                <img src="${product.image}" alt="${product.name}" class="suggestion-image" loading="lazy">
            </div>
            <div class="suggestion-info">
                <h4 class="suggestion-name">${product.name}</h4>
                <div class="suggestion-price-wrapper">
                    <span class="suggestion-price">${formatPrice(product.price)}</span>
                    ${product.oldPrice ? `<span class="suggestion-price-old">${formatPrice(product.oldPrice)}</span>` : ''}
                </div>
            </div>
        </a>
    `).join('');
}

// ══════════════════════════════════════════════════════════════════════════
// Category Grid
// ══════════════════════════════════════════════════════════════════════════

function initCategoryGrid() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const category = card.dataset.category;
            state.filters.category = category === 'all' ? 'all' : [category];
            state.currentPage = 1;

            // Sync sidebar checkboxes
            const categoryFilters = document.getElementById('categoryFilters');
            if (categoryFilters) {
                categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = category === 'all' ? cb.value === 'all' : cb.value === category;
                });
            }

            applyFilters();
            renderProducts();
            document.getElementById('all-products').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Filters
// ══════════════════════════════════════════════════════════════════════════

function initFilters() {
    // Populate category filters
    const categoryFilters = document.getElementById('categoryFilters');
    const categories = [
        { value: 'all', label: 'Tất cả' },
        { value: 'food-dry', label: 'Thức ăn khô' },
        { value: 'food-wet', label: 'Thức ăn ướt' },
        { value: 'toys', label: 'Đồ chơi' },
        { value: 'bones', label: 'Xương gặm' },
        { value: 'health', label: 'Sức khỏe' },
        { value: 'grooming', label: 'Chăm sóc' },
        { value: 'accessories', label: 'Phụ kiện' },
        { value: 'hygiene', label: 'Vệ sinh' },
        { value: 'clothes', label: 'Quần áo' },
        { value: 'bowls', label: 'Bát ăn' },
        { value: 'furniture', label: 'Nội thất' },
        { value: 'other', label: 'Khác' }
    ];
    
    categoryFilters.innerHTML = categories.map(cat => {
        const count = state.products.filter(p => cat.value === 'all' || p.category === cat.value).length;
        return `
            <label class="filter-checkbox">
                <input type="checkbox" value="${cat.value}" ${cat.value === 'all' ? 'checked' : ''}>
                <span>${cat.label} (${count})</span>
            </label>
        `;
    }).join('');
    
    // Populate brand filters
    const brandFilters = document.getElementById('brandFilters');
    const brands = [...new Set(state.products.map(p => p.brand))].slice(0, 10);
    brandFilters.innerHTML = brands.map(brand => {
        const count = state.products.filter(p => p.brand === brand).length;
        return `
            <label class="filter-checkbox">
                <input type="checkbox" value="${brand}">
                <span>${brand} (${count})</span>
            </label>
        `;
    }).join('');
    
    // Category filter listeners
    categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.value === 'all') {
                categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });
                e.target.checked = true;
                state.filters.category = 'all';
            } else {
                categoryFilters.querySelector('input[value="all"]').checked = false;
                const checkedCategories = Array.from(categoryFilters.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(cb => cb.value);
                if (checkedCategories.length === 0) {
                    categoryFilters.querySelector('input[value="all"]').checked = true;
                    state.filters.category = 'all';
                } else {
                    state.filters.category = checkedCategories;
                }
            }
            state.currentPage = 1;
            applyFilters();
            renderProducts();
            closeShopSidebarIfCompact();
        });
    });
    
    // Brand filter listeners
    brandFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            state.filters.brands = Array.from(brandFilters.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            state.currentPage = 1;
            applyFilters();
            renderProducts();
            closeShopSidebarIfCompact();
        });
    });
    
    // Price range buckets
    const PRICE_BUCKETS = {
        'all':        [0, 10000000],
        'under-100k': [0, 99999],
        '100k-300k':  [100000, 300000],
        '300k-1m':    [300000, 1000000],
        'over-1m':    [1000000, 10000000]
    };

    document.querySelectorAll('input[name="priceFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const [min, max] = PRICE_BUCKETS[e.target.value] || [0, 10000000];
            state.filters.priceMin = min;
            state.filters.priceMax = max;
            state.currentPage = 1;
            applyFilters();
            renderProducts();
            closeShopSidebarIfCompact();
        });
    });
    
    // Stock and sale filters
    document.getElementById('filterInStock').addEventListener('change', (e) => {
        state.filters.inStock = e.target.checked;
        applyFilters();
        renderProducts();
        closeShopSidebarIfCompact();
    });
    
    document.getElementById('filterOnSale').addEventListener('change', (e) => {
        state.filters.onSale = e.target.checked;
        applyFilters();
        renderProducts();
        closeShopSidebarIfCompact();
    });
    
    // Clear filters
    document.getElementById('btnClearFilters').addEventListener('click', () => {
        state.sort = 'default';
        state.filters = {
            category: 'all',
            brands: [],
            priceMin: 0,
            priceMax: 10000000,
            inStock: true,
            onSale: false,
            search: ''
        };

        // Reset UI
        const defaultSort = document.querySelector('input[name="sortFilter"][value="default"]');
        if (defaultSort) defaultSort.checked = true;
        categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = cb.value === 'all';
        });
        brandFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        const defaultPrice = document.querySelector('input[name="priceFilter"][value="all"]');
        if (defaultPrice) defaultPrice.checked = true;
        document.getElementById('filterInStock').checked = true;
        document.getElementById('filterOnSale').checked = false;
        document.getElementById('searchInput').value = '';

        applyFilters();
        renderProducts();
        closeShopSidebarIfCompact();
    });
}

let applyFiltersTimeout;
function applyFiltersDebounced() {
    clearTimeout(applyFiltersTimeout);
    applyFiltersTimeout = setTimeout(() => {
        applyFilters();
        renderProducts();
    }, 300);
}

// ══════════════════════════════════════════════════════════════════════════
// Apply Filters Logic
// ══════════════════════════════════════════════════════════════════════════

function applyFilters() {
    let filtered = [...state.products];
    
    // Category filter
    if (state.filters.category && state.filters.category !== 'all') {
        const cats = Array.isArray(state.filters.category) ? state.filters.category : [state.filters.category];
        filtered = filtered.filter(p => cats.includes(p.category));
    }
    
    // Brand filter
    if (state.filters.brands.length > 0) {
        filtered = filtered.filter(p => state.filters.brands.includes(p.brand));
    }
    
    // Price range filter
    filtered = filtered.filter(p => 
        p.price >= state.filters.priceMin && p.price <= state.filters.priceMax
    );
    
    // Stock filter
    if (state.filters.inStock) {
        filtered = filtered.filter(p => p.inStock);
    }
    
    // Sale filter
    if (state.filters.onSale) {
        filtered = filtered.filter(p => p.sale);
    }
    
    // Search filter
    if (state.filters.search) {
        const searchLower = state.filters.search.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.brand.toLowerCase().includes(searchLower)
        );
    }
    
    // Apply sort
    filtered = applySort(filtered);
    
    state.filteredProducts = filtered;
}

function applySort(products) {
    const sorted = [...products];
    
    switch (state.sort) {
        case 'price-asc':
            return sorted.sort((a, b) => a.price - b.price);
        case 'price-desc':
            return sorted.sort((a, b) => b.price - a.price);
        case 'name-asc':
            return sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        case 'name-desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name, 'vi'));
        case 'newest':
            return sorted.reverse();
        default:
            return sorted;
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Toolbar (Search + Sort)
// ══════════════════════════════════════════════════════════════════════════

function initToolbar() {
    // Search
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.filters.search = e.target.value.trim();
            state.currentPage = 1;
            applyFilters();
            renderProducts();
            closeShopSidebarIfCompact();
        }, 300);
    });
    
    // Sort
    document.querySelectorAll('input[name="sortFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.sort = e.target.value;
            applyFilters();
            renderProducts();
            closeShopSidebarIfCompact();
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Render Products
// ══════════════════════════════════════════════════════════════════════════

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const resultCount = document.getElementById('resultCount');
    
    // Pagination
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedProducts = state.filteredProducts.slice(startIndex, endIndex);
    
    // Update result count
    resultCount.textContent = `Hiển thị ${paginatedProducts.length} sản phẩm`;
    
    // Render products or empty state
    if (paginatedProducts.length === 0) {
        grid.classList.add('d-none');
        renderNoResultsSuggestions();
        emptyState.classList.remove('d-none');
    } else {
        const emptyRecommendations = document.getElementById('emptyRecommendations');
        if (emptyRecommendations) {
            emptyRecommendations.classList.add('d-none');
        }
        grid.classList.remove('d-none');
        emptyState.classList.add('d-none');
        grid.innerHTML = paginatedProducts.map(product => createProductCardHTML(product)).join('');
        
        // Attach wishlist button listeners
        grid.querySelectorAll('.product-wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleWishlist(parseInt(btn.dataset.productId));
                btn.classList.toggle('active');
            });
        });
        
        // Attach quick add listeners
        grid.querySelectorAll('.product-quick-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                addToCart(parseInt(btn.dataset.productId));
            });
        });

        // Attach buy now listeners
        grid.querySelectorAll('.product-buy-now').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const productId = parseInt(btn.dataset.productId);
                const product = state.products.find(p => p.id === productId);
                if (product && product.inStock) {
                    // Create temporary cart with this product only
                    const buyNowCart = [{
                        ...product,
                        quantity: 1
                    }];
                    
                    // Save to sessionStorage
                    sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
                    sessionStorage.setItem('pawpal_is_buynow', 'true');
                    
                    // Redirect to checkout
                    window.location.href = '/pages/shop/checkout/checkout.html?buynow=true';
                }
            });
        });
    }
    
    // Render pagination
    renderPagination();
}

function createProductCardHTML(product) {
    const isInWishlist = state.wishlist.includes(product.id);
    
    // Create rating stars
    const rating = product.rating || 5.0;
    const reviewCount = product.reviewCount || 0;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let starsHTML = '';
    
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#FFB800" stroke="#FFB800" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
        } else if (i === fullStars && hasHalfStar) {
            starsHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFB800" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
        } else {
            starsHTML += '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
        }
    }
    
    // Badge mapping
    let badgeHTML = '';
    if (product.badge) {
        const badgeClass = product.badge === 'best' ? 'badge-best' : product.badge === 'new' ? 'badge-new' : 'badge-hot';
        const badgeText = product.badge === 'best' ? 'Bán chạy' : product.badge === 'new' ? 'Mới' : 'Hot';
        badgeHTML = `<div class="product-badge ${badgeClass}">${badgeText}</div>`;
    }

    // Stock mapping
    let stockHTML = '';
    if (product.inStock && product.stock > 0 && product.stock <= 10) {
        stockHTML = `<div class="product-stock-warning">Chỉ còn ${product.stock} SP!</div>`;
    }

    return `
        <div class="product-card" data-product-id="${product.id}">
            <a href="product-detail/product-detail.html?id=${product.id}" class="product-card-link">
                <div class="product-image-wrapper">
                    ${badgeHTML}
                    ${product.sale ? '<div class="product-sale-badge">-' + Math.round((1 - product.price / product.oldPrice) * 100) + '%</div>' : ''}
                    ${!product.inStock ? '<div class="product-out-of-stock-overlay">Tạm hết hàng</div>' : ''}
                    <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h3 class="product-name">${product.name}</h3>
                    
                    <div class="product-rating-wrapper">
                        <div class="product-rating-stars">${starsHTML}</div>
                        <span class="product-rating-count">(${reviewCount})</span>
                    </div>

                    <div class="product-price-wrapper">
                        <span class="product-price">${formatPrice(product.price)}</span>
                        ${product.oldPrice ? `<span class="product-price-old">${formatPrice(product.oldPrice)}</span>` : ''}
                    </div>
                    ${stockHTML}
                </div>
            </a>
            <button class="product-wishlist-btn ${isInWishlist ? 'active' : ''}" data-product-id="${product.id}" aria-label="Thêm vào yêu thích">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <div class="product-card-actions">
                <button class="product-quick-add" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''} aria-label="Thêm vào giỏ">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                </button>
                <button class="product-buy-now" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                    Mua ngay
                </button>
            </div>
        </div>
    `;
}

// ══════════════════════════════════════════════════════════════════════════
// Pagination
// ══════════════════════════════════════════════════════════════════════════

function renderPagination() {
    const totalPages = Math.ceil(state.filteredProducts.length / state.itemsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    const pagePrev = document.getElementById('pagePrev');
    const pageNext = document.getElementById('pageNext');
    const paginationWrapper = document.getElementById('paginationWrapper');
    
    if (totalPages <= 1) {
        paginationWrapper.classList.add('d-none');
        return;
    }
    
    paginationWrapper.classList.remove('d-none');
    
    // Prev/Next buttons
    pagePrev.disabled = state.currentPage === 1;
    pageNext.disabled = state.currentPage === totalPages;
    
    pagePrev.onclick = () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    pageNext.onclick = () => {
        if (state.currentPage < totalPages) {
            state.currentPage++;
            renderProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    // Page numbers
    pageNumbers.innerHTML = '';
    
    // Always show first page
    pageNumbers.appendChild(createPageButton(1));
    
    // Calculate range
    let startPage = Math.max(2, state.currentPage - 1);
    let endPage = Math.min(totalPages - 1, state.currentPage + 1);
    
    // Ellipsis before
    if (startPage > 2) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }
    
    // Middle pages
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.appendChild(createPageButton(i));
    }
    
    // Ellipsis after
    if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }
    
    // Always show last page
    if (totalPages > 1) {
        pageNumbers.appendChild(createPageButton(totalPages));
    }
}

function createPageButton(pageNum) {
    const button = document.createElement('button');
    button.className = `page-number ${pageNum === state.currentPage ? 'active' : ''}`;
    button.textContent = pageNum;
    button.addEventListener('click', () => {
        state.currentPage = pageNum;
        renderProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return button;
}

// ══════════════════════════════════════════════════════════════════════════
// Brands Section
// ══════════════════════════════════════════════════════════════════════════

function initBrands() {
    const brandsGrid = document.getElementById('brandsGrid');
    brandsGrid.innerHTML = brandCatalog.map(brand => `
        <a href="#brand-${brand.slug}" class="brand-card" data-brand="${brand.name}">
            <img src="${brand.logo}" alt="${brand.name}" class="brand-logo">
        </a>
    `).join('');
    
    // Brand click filters
    brandsGrid.querySelectorAll('.brand-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const brandName = card.dataset.brand;
            state.filters.brands = [brandName];
            state.currentPage = 1;
            
            // Update sidebar
            document.querySelectorAll('#brandFilters input[type="checkbox"]').forEach(cb => {
                cb.checked = cb.value === brandName;
            });
            
            applyFilters();
            renderProducts();
            document.getElementById('all-products').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Mobile Filter Drawer
// ══════════════════════════════════════════════════════════════════════════

function initMobileFilter() {
    const btnMobileFilter = document.getElementById('btnMobileFilter');
    const mobileFilterOverlay = document.getElementById('mobileFilterOverlay');
    const shopSidebar = document.getElementById('shopSidebar');
    const closeShopSidebar = document.getElementById('closeShopSidebar');
    if (!btnMobileFilter || !mobileFilterOverlay || !shopSidebar || !closeShopSidebar) return;
    
    function openDrawer() {
        if (!isCompactShopLayout()) return;
        shopSidebar.classList.add('show');
        mobileFilterOverlay.hidden = false;
        requestAnimationFrame(() => mobileFilterOverlay.classList.add('show'));
        document.body.classList.add('shop-filter-open');
    }
    
    function closeDrawer() {
        mobileFilterOverlay.classList.remove('show');
        setTimeout(() => {
            if (!mobileFilterOverlay.classList.contains('show')) {
                mobileFilterOverlay.hidden = true;
            }
        }, 350);
        shopSidebar.classList.remove('show');
        document.body.classList.remove('shop-filter-open');
    }
    
    btnMobileFilter.addEventListener('click', openDrawer);
    closeShopSidebar.addEventListener('click', closeDrawer);
    mobileFilterOverlay.addEventListener('click', closeDrawer);
    shopSidebar.addEventListener('change', (event) => {
        if (!isCompactShopLayout()) return;
        const target = event.target;
        if (target instanceof HTMLInputElement && target.type !== 'text' && target.type !== 'search') {
            closeDrawer();
        }
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeDrawer();
    });
    window.addEventListener('resize', () => {
        if (!isCompactShopLayout()) {
            closeDrawer();
        }
    });
}

function closeShopSidebarIfCompact() {
    if (!isCompactShopLayout()) return;
    const shopSidebar = document.getElementById('shopSidebar');
    const mobileFilterOverlay = document.getElementById('mobileFilterOverlay');
    if (shopSidebar) shopSidebar.classList.remove('show');
    if (mobileFilterOverlay) {
        mobileFilterOverlay.classList.remove('show');
        mobileFilterOverlay.hidden = true;
    }
    document.body.classList.remove('shop-filter-open');
}

// ══════════════════════════════════════════════════════════════════════════
// Wishlist Management
// ══════════════════════════════════════════════════════════════════════════

function getWishlistStorageKey() {
    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    return user && user.phone ? `pawpal_wishlist_${user.phone}` : 'pawpal_wishlist_guest';
}

function loadWishlist() {
    try {
        return JSON.parse(localStorage.getItem(getWishlistStorageKey()) || '[]');
    } catch (e) {
        console.error('Failed to load wishlist', e);
        return [];
    }
}

function saveWishlist() {
    localStorage.setItem(getWishlistStorageKey(), JSON.stringify(state.wishlist));
}

function toggleWishlist(productId) {
    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!user) {
        showToast('Vui lòng đăng nhập để sử dụng tính năng yêu thích', 'warning');
        return;
    }

    const index = state.wishlist.indexOf(productId);
    if (index > -1) {
        state.wishlist.splice(index, 1);
        showToast('Đã xóa khỏi danh sách yêu thích', 'info');
    } else {
        state.wishlist.push(productId);
        showToast('Đã thêm vào danh sách yêu thích', 'success');
    }
    saveWishlist();
}

// ══════════════════════════════════════════════════════════════════════════
// Cart Management
// ══════════════════════════════════════════════════════════════════════════

function addToCart(productId) {
    const product = state.products.find(p => p.id === productId);
    if (!product || !product.inStock) return;
    
    // Get cart from localStorage
    let cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    
    // Check if product already in cart
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
        // Fix for previously broken cart items that only had id and quantity
        if (!existingItem.name) {
            Object.assign(existingItem, product);
        }
    } else {
        cart.push({ 
            ...product, 
            quantity: 1 
        });
    }
    
    localStorage.setItem('pawpal_cart', JSON.stringify(cart));
    showToast(`Đã thêm ${product.name} vào giỏ hàng`, 'success');
    
    // Update cart badge if exists
    updateCartBadge();
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'block' : 'none';
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════════════════════════════════

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price).replace('₫', 'đ');
}

function renderNoResultsSuggestions() {
    const recommendations = document.getElementById('emptyRecommendations');
    if (!recommendations) return;

    const suggestionProducts = state.products
        .filter(p => p.inStock)
        .sort((a, b) => (b.sale ? 1 : 0) - (a.sale ? 1 : 0))
        .slice(0, 4);

    if (!suggestionProducts.length) {
        recommendations.classList.add('d-none');
        return;
    }

    recommendations.style.display = 'grid';
    recommendations.innerHTML = `
        <div class="suggestions-header">
            <h4>Các sản phẩm gợi ý cho bạn</h4>
            <p>Thông tin này được tổng hợp từ các sản phẩm đang bán chạy.</p>
        </div>
        <div class="suggestions-grid">
            ${suggestionProducts.map(product => `
                <a href="product-detail/product-detail.html?id=${product.id}" class="suggestion-card-empty">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                    <div class="suggestion-card-info">
                        <strong>${product.name}</strong>
                        <span>${formatPrice(product.price)}</span>
                    </div>
                </a>
            `).join('')}
        </div>
    `;
}

function showToast(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${type === 'success' ? 'var(--color-success)' : 'var(--color-info)'};
        color: #ffffff;
        padding: 12px 20px;
        border-radius: var(--border-radius-pill);
        font-family: var(--font-body);
        font-size: var(--fs-small);
        font-weight: 600;
        box-shadow: var(--shadow-card-hover);
        z-index: 9999;
        animation: slideInUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            transform: translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
