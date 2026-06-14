/**
 * shop.js — Shop Page Interactive Logic (US 8-1)
 * Features: Category tabs, carousel, filters, search, sort, pagination
 */

// ══════════════════════════════════════════════════════════════════════════
// Mock Data - DEPRECATED: Now using DataLoader to load from CSV
// ══════════════════════════════════════════════════════════════════════════

// Mock data kept as fallback only
const mockProducts = [];

const mockBrands = [
    { id: 1, name: 'Royal Canin', logo: 'https://via.placeholder.com/150x100?text=Royal+Canin', slug: 'royal-canin' },
    { id: 2, name: 'Pedigree', logo: 'https://via.placeholder.com/150x100?text=Pedigree', slug: 'pedigree' },
    { id: 3, name: 'Me-O', logo: 'https://via.placeholder.com/150x100?text=Me-O', slug: 'me-o' },
    { id: 4, name: 'Whiskas', logo: 'https://via.placeholder.com/150x100?text=Whiskas', slug: 'whiskas' },
    { id: 5, name: 'Hill\'s', logo: 'https://via.placeholder.com/150x100?text=Hills', slug: 'hills' },
    { id: 6, name: 'Purina', logo: 'https://via.placeholder.com/150x100?text=Purina', slug: 'purina' },
    { id: 7, name: 'Kong', logo: 'https://via.placeholder.com/150x100?text=Kong', slug: 'kong' },
    { id: 8, name: 'Taste of the Wild', logo: 'https://via.placeholder.com/150x100?text=TOTW', slug: 'taste-of-the-wild' },
    { id: 9, name: 'Frontline', logo: 'https://via.placeholder.com/150x100?text=Frontline', slug: 'frontline' },
    { id: 10, name: 'Furminator', logo: 'https://via.placeholder.com/150x100?text=Furminator', slug: 'furminator' },
    { id: 11, name: 'Nylabone', logo: 'https://via.placeholder.com/150x100?text=Nylabone', slug: 'nylabone' },
    { id: 12, name: 'Hartz', logo: 'https://via.placeholder.com/150x100?text=Hartz', slug: 'hartz' },
];

// ══════════════════════════════════════════════════════════════════════════
// State Management
// ══════════════════════════════════════════════════════════════════════════

let state = {
    products: [],
    filteredProducts: [],
    currentPage: 1,
    itemsPerPage: 12,
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
    wishlist: JSON.parse(localStorage.getItem('pawpal_wishlist') || '[]'),
    isLoading: true
};

// ══════════════════════════════════════════════════════════════════════════
// Initialization
// ══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== SHOP PAGE LOADING ===');
    
    // Load products from CSV
    try {
        console.log('Loading products from DataLoader...');
        state.products = await window.DataLoader.loadProducts();
        console.log(`✓ Loaded ${state.products.length} products`);
        state.isLoading = false;
        
        // Initialize UI after data loaded
        initSuggestionsSidebar();
        initCategoryGrid();
        initFilters();
        initToolbar();
        initBrands();
        initMobileFilter();
        applyFilters();
        renderProducts();
        
        console.log('=== SHOP PAGE READY ===');
    } catch (error) {
        console.error('❌ Error loading products:', error);
        state.isLoading = false;
        
        // Show error message
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #fff3cd; border-radius: 8px;">
                    <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Không thể tải dữ liệu sản phẩm</h3>
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
        <a href="product-detail.html?id=${product.id}" class="suggestion-card">
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
            state.filters.category = category;
            state.currentPage = 1;
            
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
                state.filters.category = checkedCategories.length > 0 ? checkedCategories[0] : 'all';
            }
            state.currentPage = 1;
            applyFilters();
            renderProducts();
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
        });
    });
    
    // Price range
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    
    priceMin.addEventListener('change', () => {
        const minVal = parseInt(priceMin.value) || 0;
        const maxVal = parseInt(priceMax.value) || 10000000;
        
        if (minVal > maxVal) {
            priceMin.value = maxVal;
        }
        
        state.filters.priceMin = parseInt(priceMin.value) || 0;
        applyFiltersDebounced();
    });
    
    priceMax.addEventListener('change', () => {
        const minVal = parseInt(priceMin.value) || 0;
        const maxVal = parseInt(priceMax.value) || 10000000;
        
        if (maxVal < minVal) {
            priceMax.value = minVal;
        }
        
        state.filters.priceMax = parseInt(priceMax.value) || 10000000;
        applyFiltersDebounced();
    });
    
    // Stock and sale filters
    document.getElementById('filterInStock').addEventListener('change', (e) => {
        state.filters.inStock = e.target.checked;
        applyFilters();
        renderProducts();
    });
    
    document.getElementById('filterOnSale').addEventListener('change', (e) => {
        state.filters.onSale = e.target.checked;
        applyFilters();
        renderProducts();
    });
    
    // Clear filters
    document.getElementById('btnClearFilters').addEventListener('click', () => {
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
        categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = cb.value === 'all';
        });
        brandFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        priceMin.value = 0;
        priceMax.value = 10000000;
        document.getElementById('filterInStock').checked = true;
        document.getElementById('filterOnSale').checked = false;
        document.getElementById('searchInput').value = '';
        
        applyFilters();
        renderProducts();
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
        filtered = filtered.filter(p => p.category === state.filters.category);
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
        }, 300);
    });
    
    // Sort
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        applyFilters();
        renderProducts();
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
        grid.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
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
    }
    
    // Render pagination
    renderPagination();
}

function createProductCardHTML(product) {
    const isInWishlist = state.wishlist.includes(product.id);
    
    // Debug: Log product ID and link
    console.log('Creating product card:', { id: product.id, name: product.name, link: `product-detail.html?id=${product.id}` });
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <a href="product-detail.html?id=${product.id}" class="product-card-link">
                <div class="product-image-wrapper">
                    ${product.sale ? '<div class="product-sale-badge">-' + Math.round((1 - product.price / product.oldPrice) * 100) + '%</div>' : ''}
                    ${!product.inStock ? '<div class="product-out-of-stock-overlay">Tạm hết hàng</div>' : ''}
                    <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price-wrapper">
                        <span class="product-price">${formatPrice(product.price)}</span>
                        ${product.oldPrice ? `<span class="product-price-old">${formatPrice(product.oldPrice)}</span>` : ''}
                    </div>
                </div>
            </a>
            <button class="product-wishlist-btn ${isInWishlist ? 'active' : ''}" data-product-id="${product.id}" aria-label="Thêm vào yêu thích">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <div class="product-card-actions">
                <button class="product-quick-add" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    Thêm vào giỏ
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
        paginationWrapper.style.display = 'none';
        return;
    }
    
    paginationWrapper.style.display = 'block';
    
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
    brandsGrid.innerHTML = mockBrands.map(brand => `
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
    const mobileFilterDrawer = document.getElementById('mobileFilterDrawer');
    const mobileFilterOverlay = document.getElementById('mobileFilterOverlay');
    const drawerClose = document.getElementById('drawerClose');
    const btnApplyFilters = document.getElementById('btnApplyFilters');
    const drawerContent = document.getElementById('drawerContent');
    
    function openDrawer() {
        // Clone sidebar content
        const sidebarContent = document.querySelector('.shop-sidebar').cloneNode(true);
        drawerContent.innerHTML = '';
        drawerContent.appendChild(sidebarContent);
        
        // Re-attach listeners to cloned elements
        attachFilterListenersToDrawer();
        
        mobileFilterOverlay.style.display = 'block';
        mobileFilterDrawer.style.display = 'flex';
        setTimeout(() => {
            mobileFilterOverlay.classList.add('show');
            mobileFilterDrawer.classList.add('show');
        }, 10);
        document.body.style.overflow = 'hidden';
    }
    
    function closeDrawer() {
        mobileFilterOverlay.classList.remove('show');
        mobileFilterDrawer.classList.remove('show');
        setTimeout(() => {
            mobileFilterOverlay.style.display = 'none';
            mobileFilterDrawer.style.display = 'none';
            document.body.style.overflow = '';
        }, 350);
    }
    
    btnMobileFilter.addEventListener('click', openDrawer);
    drawerClose.addEventListener('click', closeDrawer);
    mobileFilterOverlay.addEventListener('click', closeDrawer);
    btnApplyFilters.addEventListener('click', closeDrawer);
}

function attachFilterListenersToDrawer() {
    // Copy same logic from initFilters for drawer
    const categoryFilters = document.querySelector('#drawerContent #categoryFilters');
    const brandFilters = document.querySelector('#drawerContent #brandFilters');
    
    if (!categoryFilters || !brandFilters) return;
    
    // Category checkboxes
    categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            if (e.target.value === 'all') {
                categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                e.target.checked = true;
                state.filters.category = 'all';
            } else {
                categoryFilters.querySelector('input[value="all"]').checked = false;
                const checkedCategories = Array.from(categoryFilters.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(cb => cb.value);
                state.filters.category = checkedCategories.length > 0 ? checkedCategories[0] : 'all';
            }
            state.currentPage = 1;
            applyFilters();
            renderProducts();
        });
    });
    
    // Brand checkboxes
    brandFilters.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            state.filters.brands = Array.from(brandFilters.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            state.currentPage = 1;
            applyFilters();
            renderProducts();
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Wishlist Management
// ══════════════════════════════════════════════════════════════════════════

function toggleWishlist(productId) {
    const index = state.wishlist.indexOf(productId);
    if (index > -1) {
        state.wishlist.splice(index, 1);
        showToast('Đã xóa khỏi danh sách yêu thích', 'info');
    } else {
        state.wishlist.push(productId);
        showToast('Đã thêm vào danh sách yêu thích', 'success');
    }
    localStorage.setItem('pawpal_wishlist', JSON.stringify(state.wishlist));
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
    } else {
        cart.push({ id: productId, quantity: 1 });
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
