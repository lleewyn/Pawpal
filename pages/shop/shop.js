

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

let buyNowModalState = {
    product: null,
    quantity: 1
};

function isCompactShopLayout() {
    return window.innerWidth <= 1024;
}

function ensureBuyNowModal() {
    if (document.getElementById('buyNowQuantityModal')) return;

    const modal = document.createElement('div');
    modal.id = 'buyNowQuantityModal';
    modal.className = 'buy-now-modal';
    modal.hidden = true;
    modal.innerHTML = `
        <div class="buy-now-modal__backdrop" data-close-buy-now="true"></div>
        <div class="buy-now-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="buyNowModalTitle">
            <button type="button" class="buy-now-modal__close" aria-label="Đóng" data-close-buy-now="true">×</button>
            <p class="buy-now-modal__eyebrow">Mua ngay</p>
            <h3 id="buyNowModalTitle" class="buy-now-modal__title">Chọn số lượng trước khi thanh toán</h3>
            <div class="buy-now-modal__product">
                <img id="buyNowModalImage" class="buy-now-modal__image" src="" alt="">
                <div class="buy-now-modal__product-info">
                    <strong id="buyNowModalName"></strong>
                    <span id="buyNowModalPrice"></span>
                    <small id="buyNowModalStock"></small>
                </div>
            </div>
            <div class="buy-now-modal__quantity">
                <span class="buy-now-modal__label">Số lượng</span>
                <div class="buy-now-modal__quantity-control">
                    <button type="button" class="buy-now-modal__qty-btn" data-action="decrease">-</button>
                    <input id="buyNowModalQty" class="buy-now-modal__qty-input" type="number" min="1" value="1">
                    <button type="button" class="buy-now-modal__qty-btn" data-action="increase">+</button>
                </div>
            </div>
            <button type="button" id="buyNowModalConfirm" class="buy-now-modal__confirm">Tiếp tục thanh toán</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.dataset.closeBuyNow === 'true') {
            closeBuyNowModal();
        }
    });

    modal.querySelectorAll('.buy-now-modal__qty-btn').forEach((button) => {
        button.addEventListener('click', () => updateBuyNowModalQuantity(button.dataset.action));
    });

    const qtyInput = modal.querySelector('#buyNowModalQty');
    qtyInput.addEventListener('input', () => {
        const max = Number(buyNowModalState.product?.stock) || 99;
        let nextValue = Number(qtyInput.value) || 1;
        nextValue = Math.max(1, Math.min(max, nextValue));
        buyNowModalState.quantity = nextValue;
        qtyInput.value = nextValue;
    });

    modal.querySelector('#buyNowModalConfirm').addEventListener('click', confirmBuyNowFromModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modal.hidden) {
            closeBuyNowModal();
        }
    });
}

function openBuyNowModal(product) {
    if (!product) return;

    ensureBuyNowModal();
    buyNowModalState.product = product;
    buyNowModalState.quantity = 1;

    const modal = document.getElementById('buyNowQuantityModal');
    const image = document.getElementById('buyNowModalImage');
    const name = document.getElementById('buyNowModalName');
    const price = document.getElementById('buyNowModalPrice');
    const stock = document.getElementById('buyNowModalStock');
    const qtyInput = document.getElementById('buyNowModalQty');

    image.src = product.image || '';
    image.alt = product.name || 'Sản phẩm';
    name.textContent = product.name || 'Sản phẩm';
    price.textContent = formatPrice(product.price || 0);
    stock.textContent = `Còn ${product.stock || 0} sản phẩm trong kho`;
    qtyInput.max = product.stock || 99;
    qtyInput.value = '1';

    modal.hidden = false;
    document.body.classList.add('buy-now-modal-open');
}

function closeBuyNowModal() {
    const modal = document.getElementById('buyNowQuantityModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('buy-now-modal-open');
}

function updateBuyNowModalQuantity(action) {
    const qtyInput = document.getElementById('buyNowModalQty');
    const max = Number(buyNowModalState.product?.stock) || 99;
    const current = Number(qtyInput.value) || 1;
    let next = current;

    if (action === 'decrease') next = Math.max(1, current - 1);
    if (action === 'increase') next = Math.min(max, current + 1);

    buyNowModalState.quantity = next;
    qtyInput.value = String(next);
}

function confirmBuyNowFromModal() {
    const product = buyNowModalState.product;
    const quantity = buyNowModalState.quantity;
    if (!product) return;

    const buyNowCart = [{
        ...product,
        quantity
    }];

    sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
    sessionStorage.setItem('pawpal_is_buynow', 'true');
    closeBuyNowModal();
    window.location.href = '/pages/shop/checkout/checkout.html?buynow=true';
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


document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== SHOP PAGE LOADING ===');
    
    try {
        console.log('Loading products from DataLoader...');
        state.products = await window.DataLoader.loadProducts();
        console.log(` Loaded ${state.products.length} products`);
        state.isLoading = false;
        state.wishlist = [];
        const u = getCurrentShopUser();
        if (u && u.id && window.API && window.API.getUserWishlist) {
            try {
                const wl = await window.API.getUserWishlist(u.id);
                if (wl && wl.productIds) state.wishlist = wl.productIds;
            } catch(e) { console.warn('Failed to load wishlist', e); }
        }

        initSuggestionsSidebar();
        initCategoryGrid();
        initResponsiveCategorySection();
        initFilters();
        
        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        if (categoryParam) {
            let selectedCats = [categoryParam];
            if (categoryParam === 'food') selectedCats = ['food-dry', 'food-wet', 'bones'];
            else if (categoryParam === 'care') selectedCats = ['health', 'grooming', 'hygiene'];
            else if (categoryParam === 'toys') selectedCats = ['toys', 'accessories', 'clothes', 'bowls'];
            else if (categoryParam === 'other') selectedCats = ['furniture', 'other'];

            state.filters.category = selectedCats;
            
            const categoryFilters = document.getElementById('categoryFilters');
            if (categoryFilters) {
                categoryFilters.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    if (cb.value === 'all') cb.checked = false;
                    else cb.checked = selectedCats.includes(cb.value);
                });
                
                const checked = categoryFilters.querySelectorAll('input[type="checkbox"]:checked');
                if (checked.length === 0) {
                    categoryFilters.querySelector('input[value="all"]').checked = true;
                    state.filters.category = 'all';
                }
            }
        }

        initToolbar();
        initBrands();
        initMobileFilter();
        applyFilters();
        renderProducts();
        
        console.log('=== SHOP PAGE READY ===');
    } catch (error) {
        console.error(' Error loading products:', error);
        state.isLoading = false;
        
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


function initSuggestionsSidebar() {
    const suggestionsList = document.getElementById('suggestionsList');
    
    const suggestions = state.products
        .filter(p => p.inStock)
        .sort((a, b) => {
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


function initCategoryGrid() {
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const category = card.dataset.category;
            state.filters.category = category === 'all' ? 'all' : [category];
            state.currentPage = 1;

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


function initFilters() {
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


function applyFilters() {
    let filtered = [...state.products];
    
    if (state.filters.category && state.filters.category !== 'all') {
        const cats = Array.isArray(state.filters.category) ? state.filters.category : [state.filters.category];
        
        const catMapping = {
            'food-dry': { catId: 'c0000000-0000-0000-0000-000000000001', keywords: ['hạt', 'khô', 'dry'] },
            'food-wet': { catId: 'c0000000-0000-0000-0000-000000000001', keywords: ['pate', 'sốt', 'ướt', 'lon', 'lon', 'pouches'] },
            'bones': { catId: 'c0000000-0000-0000-0000-000000000001', keywords: ['xương', 'gặm', 'bánh thưởng', 'snack', 'súp thưởng'] },
            'bowls': { catId: 'c0000000-0000-0000-0000-000000000002', keywords: ['bát', 'chén', 'khay ăn', 'bình nước'] },
            'toys': { catId: 'c0000000-0000-0000-0000-000000000002', keywords: ['đồ chơi', 'bóng', 'cần câu', 'lật đật', 'chuông', 'thú nhồi', 'trêu', 'cắn', 'catnip'] },
            'clothes': { catId: 'c0000000-0000-0000-0000-000000000002', keywords: ['áo', 'quần', 'mũ', 'nón', 'váy', 'giày', 'tất'] },
            'furniture': { catId: 'c0000000-0000-0000-0000-000000000002', keywords: ['chuồng', 'giường', 'nệm', 'đệm', 'lồng', 'nhà', 'võng', 'chuột cào', 'trụ cào', 'nhà cây'] },
            'accessories': { catId: 'c0000000-0000-0000-0000-000000000004', keywords: ['vòng', 'dây', 'túi', 'balo', 'kính', 'rọ mõm', 'yếm'] },
            'hygiene': { catId: 'c0000000-0000-0000-0000-000000000003', keywords: ['cát', 'khay vệ sinh', 'tã', 'bỉm', 'xịt', 'khử mùi', 'sữa tắm', 'dầu gội', 'khăn', 'chậu', 'nhà vệ sinh'] },
            'grooming': { catId: 'c0000000-0000-0000-0000-000000000003', keywords: ['lược', 'tông đơ', 'kéo', 'bấm móng', 'cạo', 'chải'] },
            'health': { catId: 'c0000000-0000-0000-0000-000000000003', keywords: ['thuốc', 'nhỏ gáy', 'tẩy giun', 'vitamin', 'gel', 'dinh dưỡng', 'xịt rận', 'phòng rận', 'trị rận', 'canxi'] }
        };

        filtered = filtered.filter(p => {
            const nameLower = p.name.toLowerCase();
            return cats.some(c => {
                if (c === 'other') {
                    const matchesAny = Object.values(catMapping).some(m => 
                        m.keywords && m.keywords.some(kw => nameLower.includes(kw))
                    );
                    return !matchesAny;
                }
                const map = catMapping[c];
                if (!map) return p.category === c || p.categoryName === c;
                
                if (p.category !== map.catId && p.categoryName !== map.catId && p.categoryName !== 'Thực phẩm' && p.categoryName !== 'Đồ dùng' && p.categoryName !== 'Chăm sóc' && p.categoryName !== 'Phụ kiện') {
                    // Weak check if UUIDs don't strictly match but we still want to filter by keywords
                }
                
                // Allow matching by just keywords if category ID is a bit flaky, but ideally match both
                const isCorrectCategory = p.category === map.catId || 
                    (map.catId === 'c0000000-0000-0000-0000-000000000001' && p.categoryName === 'Thực phẩm') ||
                    (map.catId === 'c0000000-0000-0000-0000-000000000002' && p.categoryName === 'Đồ dùng') ||
                    (map.catId === 'c0000000-0000-0000-0000-000000000003' && p.categoryName === 'Vệ sinh') ||
                    (map.catId === 'c0000000-0000-0000-0000-000000000004' && p.categoryName === 'Phụ kiện');
                
                if (map.keywords && map.keywords.length > 0) {
                    return isCorrectCategory && map.keywords.some(kw => nameLower.includes(kw));
                }
                return isCorrectCategory;
            });
        });
    }
    
    if (state.filters.brands.length > 0) {
        filtered = filtered.filter(p => state.filters.brands.includes(p.brand));
    }
    
    filtered = filtered.filter(p => 
        p.price >= state.filters.priceMin && p.price <= state.filters.priceMax
    );
    
    if (state.filters.inStock) {
        filtered = filtered.filter(p => p.inStock);
    }
    
    if (state.filters.onSale) {
        filtered = filtered.filter(p => p.sale);
    }
    
    if (state.filters.search) {
        const searchLower = state.filters.search.toLowerCase();
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.brand.toLowerCase().includes(searchLower)
        );
    }
    
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


function initToolbar() {
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
    
    document.querySelectorAll('input[name="sortFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.sort = e.target.value;
            applyFilters();
            renderProducts();
            closeShopSidebarIfCompact();
        });
    });
}


function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const resultCount = document.getElementById('resultCount');
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedProducts = state.filteredProducts.slice(startIndex, endIndex);
    
    resultCount.textContent = `Hiển thị ${paginatedProducts.length} sản phẩm`;
    
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
        
        grid.querySelectorAll('.product-wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                if (!user) {
                    showToast('Vui lòng đăng nhập để sử dụng tính năng yêu thích', 'warning');
                    return; // KHÔNG đổi màu icon
                }
                toggleWishlist(btn.dataset.productId);
                btn.classList.toggle('active');
            });
        });
        
        grid.querySelectorAll('.product-quick-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                addToCart(btn.dataset.productId);
            });
        });

        grid.querySelectorAll('.product-buy-now').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                const productId = btn.dataset.productId;
                const product = state.products.find(p => String(p.id) === String(productId));
                if (product && product.inStock) {
                    openBuyNowModal(product);
                }
            });
        });
    }
    
    renderPagination();
}

function createProductCardHTML(product) {
    const isInWishlist = state.wishlist.includes(product.id);
    
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
    
    let badgeHTML = '';
    if (product.badge) {
        const badgeClass = product.badge === 'best' ? 'badge-best' : product.badge === 'new' ? 'badge-new' : 'badge-hot';
        const badgeText = product.badge === 'best' ? 'Bán chạy' : product.badge === 'new' ? 'Mới' : 'Hot';
        badgeHTML = `<div class="product-badge ${badgeClass}">${badgeText}</div>`;
    }

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
    
    pageNumbers.innerHTML = '';
    
    pageNumbers.appendChild(createPageButton(1));
    
    let startPage = Math.max(2, state.currentPage - 1);
    let endPage = Math.min(totalPages - 1, state.currentPage + 1);
    
    if (startPage > 2) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.appendChild(createPageButton(i));
    }
    
    if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }
    
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


function initBrands() {
    const brandsGrid = document.getElementById('brandsGrid');
    brandsGrid.innerHTML = brandCatalog.map(brand => `
        <a href="#brand-${brand.slug}" class="brand-card" data-brand="${brand.name}">
            <img src="${brand.logo}" alt="${brand.name}" class="brand-logo">
        </a>
    `).join('');
    
    brandsGrid.querySelectorAll('.brand-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const brandName = card.dataset.brand;
            state.filters.brands = [brandName];
            state.currentPage = 1;
            
            document.querySelectorAll('#brandFilters input[type="checkbox"]').forEach(cb => {
                cb.checked = cb.value === brandName;
            });
            
            applyFilters();
            renderProducts();
            document.getElementById('all-products').scrollIntoView({ behavior: 'smooth' });
        });
    });
}


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


function getCurrentShopUser() {
    try { return JSON.parse(localStorage.getItem('pawpal_current_user')) || null; } catch { return null; }
}

async function toggleWishlist(productId) {
    const user = getCurrentShopUser();
    if (!user || !user.id) {
        showToast('Vui lòng đăng nhập để sử dụng tính năng yêu thích', 'warning');
        return;
    }

    if (window.API && window.API.toggleWishlist) {
        const res = await window.API.toggleWishlist(user.id, productId);
        if (res && res.success) {
            if (res.action === 'added') {
                if (!state.wishlist.includes(productId)) state.wishlist.push(productId);
                showToast('Đã thêm vào danh sách yêu thích', 'success');
            } else {
                state.wishlist = state.wishlist.filter(id => id !== productId);
                showToast('Đã xóa khỏi danh sách yêu thích', 'info');
            }
            renderProducts();
        }
    }
}

async function addToCart(productId) {
    const product = state.products.find(p => String(p.id) === String(productId));
    if (!product || !product.inStock) return;
    
    const user = getCurrentShopUser();
    if (!user || !user.id) {
        showToast('Vui lòng đăng nhập để sử dụng giỏ hàng', 'warning');
        return;
    }
    
    if (window.API && window.API.addToCart) {
        const res = await window.API.addToCart(user.id, productId, 1);
        if (res && res.success) {
            showToast(`Đã thêm ${product.name} vào giỏ hàng`, 'success');
            if (typeof window.updateCartBadge === 'function') {
                window.updateCartBadge();
            }
        } else {
            showToast('Có lỗi xảy ra khi thêm vào giỏ hàng', 'error');
        }
    }
}


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
