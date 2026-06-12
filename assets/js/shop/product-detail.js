/**
 * product-detail.js — Product Detail Page Logic (US 8-2)
 * Features: Image gallery, quantity selector, add to cart, wishlist, tabs, related products
 */

// ══════════════════════════════════════════════════════════════════════════
// Mock Data - Should match shop.js data
// ══════════════════════════════════════════════════════════════════════════

const mockProducts = [
    { id: 1, name: 'Royal Canin Mini Adult', brand: 'Royal Canin', category: 'food-dry', price: 250000, originalPrice: 320000, oldPrice: 320000, image: 'https://via.placeholder.com/600', inStock: true, sale: true, sku: 'RC-MA-001', stock: 45, badge: 'best', trending: true },
    { id: 2, name: 'Pedigree Adult', brand: 'Pedigree', category: 'food-dry', price: 180000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'PD-AD-002', stock: 120, badge: null, trending: false },
    { id: 3, name: 'Me-O Tuna', brand: 'Me-O', category: 'food-wet', price: 120000, originalPrice: 150000, oldPrice: 150000, image: 'https://via.placeholder.com/600', inStock: false, sale: true, sku: 'MO-TN-003', stock: 0, badge: null, trending: false },
    { id: 4, name: 'Kong Classic', brand: 'Kong', category: 'toys', price: 150000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'KG-CL-004', stock: 88, badge: 'hot', trending: true },
    { id: 5, name: 'Whiskas Pouch', brand: 'Whiskas', category: 'food-wet', price: 95000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'WK-PC-005', stock: 5, badge: null, trending: false },
    { id: 6, name: 'Hartz Grooming Brush', brand: 'Hartz', category: 'grooming', price: 85000, originalPrice: 110000, oldPrice: 110000, image: 'https://via.placeholder.com/600', inStock: true, sale: true, sku: 'HZ-GB-006', stock: 67, badge: null, trending: false },
    { id: 7, name: 'Taste of the Wild', brand: 'Taste of the Wild', category: 'food-dry', price: 450000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'TW-FD-007', stock: 8, badge: 'new', trending: true },
    { id: 8, name: 'Chuckit Ball Launcher', brand: 'Chuckit', category: 'toys', price: 220000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'CK-BL-008', stock: 34, badge: null, trending: false },
    { id: 9, name: 'SmartBones Chew', brand: 'SmartBones', category: 'bones', price: 130000, originalPrice: 160000, oldPrice: 160000, image: 'https://via.placeholder.com/600', inStock: true, sale: true, sku: 'SB-CH-009', stock: 23, badge: null, trending: false },
    { id: 10, name: 'Frontline Plus', brand: 'Frontline', category: 'health', price: 280000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'FL-PL-010', stock: 56, badge: null, trending: false },
    { id: 11, name: 'Furminator DeShedding', brand: 'Furminator', category: 'grooming', price: 350000, originalPrice: 420000, oldPrice: 420000, image: 'https://via.placeholder.com/600', inStock: true, sale: true, sku: 'FM-DS-011', stock: 19, badge: null, trending: false },
    { id: 12, name: 'Hill\'s Science Diet', brand: 'Hill\'s', category: 'food-dry', price: 380000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'HS-SD-012', stock: 89, badge: 'hot', trending: true },
    { id: 13, name: 'Nylabone DuraChew', brand: 'Nylabone', category: 'bones', price: 145000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'NB-DC-013', stock: 67, badge: null, trending: false },
    { id: 14, name: 'Purina ONE', brand: 'Purina', category: 'food-dry', price: 210000, originalPrice: 250000, oldPrice: 250000, image: 'https://via.placeholder.com/600', inStock: true, sale: true, sku: 'PR-ONE-014', stock: 34, badge: null, trending: false },
    { id: 15, name: 'Coastal Pet Collar', brand: 'Coastal Pet', category: 'accessories', price: 65000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'CP-COL-015', stock: 120, badge: null, trending: false },
    { id: 16, name: 'Nature\'s Miracle Stain Remover', brand: 'Nature\'s Miracle', category: 'hygiene', price: 175000, originalPrice: null, oldPrice: null, image: 'https://via.placeholder.com/600', inStock: true, sale: false, sku: 'NM-SR-016', stock: 78, badge: null, trending: false },
];

const categoryNames = {
    'food-dry': 'Thức ăn khô',
    'food-wet': 'Thức ăn ướt',
    'toys': 'Đồ chơi',
    'bones': 'Xương gặm',
    'health': 'Sức khỏe',
    'grooming': 'Chăm sóc',
    'accessories': 'Phụ kiện',
    'hygiene': 'Vệ sinh'
};

// ══════════════════════════════════════════════════════════════════════════
// State Management
// ══════════════════════════════════════════════════════════════════════════

let state = {
    currentProduct: null,
    quantity: 1,
    currentImageIndex: 0,
    images: [],
    wishlist: JSON.parse(localStorage.getItem('pawpal_wishlist') || '[]'),
    recentlyViewed: JSON.parse(localStorage.getItem('pawpal_recently_viewed') || '[]')
};

// ══════════════════════════════════════════════════════════════════════════
// Initialization
// ══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    console.log('=== PRODUCT DETAIL PAGE LOADING ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);
    
    const productId = getProductIdFromURL();
    console.log('Product ID from URL:', productId);
    console.log('Type of productId:', typeof productId);
    console.log('Is NaN?', isNaN(productId));
    console.log('Is null?', productId === null);
    console.log('Is > 0?', productId > 0);
    
    // Check if productId is a valid number (not NaN, null, undefined)
    if (productId !== null && !isNaN(productId) && productId > 0) {
        console.log('✓ Valid product ID, loading product...');
        loadProduct(productId);
        initQuantityControls();
        initTabs();
        initWishlistButton();
        initImageZoom();
        initShareButtons();
        addToRecentlyViewed(productId);
    } else {
        console.error('❌ Invalid product ID:', productId);
        console.log('Redirecting to shop in 3 seconds...');
        // Show error message for 3 seconds before redirect
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
                <div style="text-align: center;">
                    <h1 style="color: #c00;">❌ Không tìm thấy sản phẩm</h1>
                    <p>Product ID: ${productId}</p>
                    <p>Redirecting to shop...</p>
                </div>
            </div>
        `;
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 3000);
    }
});

// ══════════════════════════════════════════════════════════════════════════
// Get Product ID from URL
// ══════════════════════════════════════════════════════════════════════════

function getProductIdFromURL() {
    console.log('=== Getting Product ID from URL ===');
    console.log('Full URL:', window.location.href);
    console.log('Search string:', window.location.search);
    console.log('Pathname:', window.location.pathname);
    console.log('Hash:', window.location.hash);
    
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URLSearchParams keys:', Array.from(urlParams.keys()));
    console.log('URLSearchParams entries:', Array.from(urlParams.entries()));
    
    const idParam = urlParams.get('id');
    console.log('URL param "id":', idParam);
    console.log('Type of idParam:', typeof idParam);
    
    if (!idParam) {
        console.error('❌ No "id" parameter in URL');
        console.error('Expected format: product-detail.html?id=1');
        console.error('Actual URL:', window.location.href);
        return null;
    }
    
    const parsedId = parseInt(idParam, 10);
    console.log('Parsed ID:', parsedId);
    console.log('Type of parsedId:', typeof parsedId);
    
    if (isNaN(parsedId) || parsedId <= 0) {
        console.error('❌ Invalid ID parameter:', idParam);
        console.error('Parsed to:', parsedId);
        return null;
    }
    
    console.log('✅ Valid product ID:', parsedId);
    return parsedId;
}

// ══════════════════════════════════════════════════════════════════════════
// Load Product Data
// ══════════════════════════════════════════════════════════════════════════

function loadProduct(productId) {
    console.log('=== Loading Product ===');
    console.log('Product ID:', productId);
    console.log('Product ID type:', typeof productId);
    console.log('Available products:', mockProducts.length);
    console.log('Mock products:', mockProducts.map(p => ({ id: p.id, idType: typeof p.id, name: p.name })));
    
    // Ensure productId is a number for comparison
    const numericProductId = Number(productId);
    console.log('Numeric Product ID:', numericProductId);
    
    const product = mockProducts.find(p => {
        // Convert both to numbers for safe comparison
        const pId = Number(p.id);
        const match = pId === numericProductId;
        console.log(`Comparing p.id (${p.id}, ${typeof p.id}) === productId (${productId}, ${typeof productId}): ${match}`);
        return match;
    });
    
    console.log('Found product:', product);
    
    if (!product) {
        console.error('❌ Product not found with ID:', productId);
        console.error('Redirecting to shop in 2 seconds...');
        setTimeout(() => {
            window.location.href = 'shop.html';
        }, 2000);
        return;
    }
    
    console.log('✓ Product found:', product.name);
    state.currentProduct = product;
    state.images = [product.image, product.image, product.image, product.image]; // Mock multiple images
    
    console.log('Rendering product details...');
    try {
        renderProductDetails();
        renderThumbnails();
        renderRelatedProducts();
        renderYouMayLikeProducts();
        renderRecentlyViewedProducts();
        updateBreadcrumb();
        console.log('✓ Product loaded successfully');
    } catch (error) {
        console.error('❌ Error rendering product:', error);
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Render Product Details
// ══════════════════════════════════════════════════════════════════════════

function renderProductDetails() {
    const product = state.currentProduct;
    
    // Update page title
    document.title = `${product.name} - PawPal`;
    
    // Update product info
    document.getElementById('productBrand').textContent = product.brand;
    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productPrice').textContent = formatPrice(product.price);
    
    // Original price
    if (product.originalPrice) {
        document.getElementById('productPriceOld').textContent = formatPrice(product.originalPrice);
        document.getElementById('productPriceOld').style.display = 'block';
        
        const discount = product.originalPrice - product.price;
        document.getElementById('productDiscount').textContent = `Tiết kiệm ${formatPrice(discount)}`;
        document.getElementById('productDiscount').style.display = 'block';
        
        // Badge
        const discountPercent = Math.round((discount / product.originalPrice) * 100);
        document.getElementById('badgeOverlay').style.display = 'block';
        document.querySelector('.badge-sale').textContent = `-${discountPercent}%`;
    }
    
    // Stock status
    const stockStatus = document.getElementById('stockStatus');
    if (!product.inStock) {
        stockStatus.classList.add('out-of-stock');
        stockStatus.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span>Tạm hết hàng</span>
        `;
        
        // Disable add to cart button
        const addToCartBtn = document.getElementById('addToCartBtn');
        addToCartBtn.disabled = true;
        addToCartBtn.textContent = 'Tạm hết hàng';
    }
    
    // Meta
    document.getElementById('productSKU').textContent = product.sku || 'N/A';
    document.getElementById('productCategory').textContent = categoryNames[product.category] || product.category;
    document.getElementById('productBrandMeta').textContent = product.brand;
    
    // Delivery estimate
    if (product.inStock) {
        document.getElementById('deliveryEstimate').style.display = 'flex';
    }
    
    // Stock countdown (show if stock < 10)
    if (product.stock && product.stock < 10 && product.stock > 0) {
        const stockCountdown = document.getElementById('stockCountdown');
        stockCountdown.style.display = 'flex';
        document.getElementById('stockRemaining').textContent = product.stock;
    }
    
    // Main image
    document.getElementById('mainImage').src = product.image;
    document.getElementById('mainImage').alt = product.name;
}

// ══════════════════════════════════════════════════════════════════════════
// Render Thumbnails
// ══════════════════════════════════════════════════════════════════════════

function renderThumbnails() {
    const thumbnailsContainer = document.getElementById('thumbnails');
    thumbnailsContainer.innerHTML = state.images.map((img, index) => `
        <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${img}" alt="Thumbnail ${index + 1}">
        </div>
    `).join('');
    
    // Attach click listeners
    thumbnailsContainer.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.addEventListener('click', () => {
            const index = parseInt(thumb.dataset.index);
            changeMainImage(index);
        });
    });
}

function changeMainImage(index) {
    state.currentImageIndex = index;
    document.getElementById('mainImage').src = state.images[index];
    
    // Update active thumbnail
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Quantity Controls
// ══════════════════════════════════════════════════════════════════════════

function initQuantityControls() {
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decreaseQty');
    const increaseBtn = document.getElementById('increaseQty');
    
    decreaseBtn.addEventListener('click', () => {
        if (state.quantity > 1) {
            state.quantity--;
            quantityInput.value = state.quantity;
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        if (state.quantity < 99) {
            state.quantity++;
            quantityInput.value = state.quantity;
        }
    });
    
    quantityInput.addEventListener('change', (e) => {
        let value = parseInt(e.target.value) || 1;
        value = Math.max(1, Math.min(99, value));
        state.quantity = value;
        quantityInput.value = value;
    });
    
    // Add to cart button
    document.getElementById('addToCartBtn').addEventListener('click', () => {
        if (state.currentProduct && state.currentProduct.inStock) {
            addToCart(state.currentProduct.id, state.quantity);
        }
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Wishlist
// ══════════════════════════════════════════════════════════════════════════

function initWishlistButton() {
    const wishlistBtn = document.getElementById('wishlistBtn');
    const isInWishlist = state.wishlist.some(item => item.id === state.currentProduct.id);
    
    if (isInWishlist) {
        wishlistBtn.classList.add('active');
    }
    
    wishlistBtn.addEventListener('click', () => {
        toggleWishlist();
    });
}

function toggleWishlist() {
    const product = state.currentProduct;
    const wishlistBtn = document.getElementById('wishlistBtn');
    
    let wishlist = JSON.parse(localStorage.getItem('pawpal_wishlist') || '[]');
    const index = wishlist.findIndex(item => item.id === product.id);
    
    if (index > -1) {
        // Remove from wishlist
        wishlist.splice(index, 1);
        wishlistBtn.classList.remove('active');
        showToast('Đã xóa khỏi danh sách yêu thích', 'info');
    } else {
        // Add to wishlist
        wishlist.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            inStock: product.inStock,
            addedAt: new Date().toISOString()
        });
        wishlistBtn.classList.add('active');
        showToast('Đã thêm vào danh sách yêu thích', 'success');
    }
    
    localStorage.setItem('pawpal_wishlist', JSON.stringify(wishlist));
    state.wishlist = wishlist;
}

// ══════════════════════════════════════════════════════════════════════════
// Add to Cart
// ══════════════════════════════════════════════════════════════════════════

function addToCart(productId, quantity) {
    let cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ id: productId, quantity: quantity });
    }
    
    localStorage.setItem('pawpal_cart', JSON.stringify(cart));
    showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng`, 'success');
    
    // Update cart badge
    updateCartBadge();
}

function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Tabs
// ══════════════════════════════════════════════════════════════════════════

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Remove active class from all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Related Products
// ══════════════════════════════════════════════════════════════════════════

function renderRelatedProducts() {
    const currentProduct = state.currentProduct;
    
    // Same category and brand products (excluding current)
    const relatedProducts = mockProducts
        .filter(p => 
            p.id !== currentProduct.id && 
            (p.category === currentProduct.category || p.brand === currentProduct.brand)
        )
        .slice(0, 5);
    
    const container = document.getElementById('relatedProducts');
    container.innerHTML = relatedProducts.map(product => createProductCardHTML(product)).join('');
    
    // Attach wishlist listeners
    attachWishlistListeners(container);
}

// ══════════════════════════════════════════════════════════════════════════
// You May Also Like (Cross-category recommendations)
// ══════════════════════════════════════════════════════════════════════════

function renderYouMayLikeProducts() {
    const currentProduct = state.currentProduct;
    const wishlist = state.wishlist;
    
    // Algorithm: Trending products + products from wishlist categories + high stock products
    let youMayLike = [];
    
    // 1. Add trending products (different category)
    const trendingProducts = mockProducts.filter(p => 
        p.trending && 
        p.id !== currentProduct.id && 
        p.category !== currentProduct.category &&
        p.inStock
    );
    youMayLike.push(...trendingProducts);
    
    // 2. Add products from wishlist categories
    const wishlistCategories = wishlist.map(item => {
        const product = mockProducts.find(p => p.id === item.id);
        return product ? product.category : null;
    }).filter(cat => cat !== null);
    
    const wishlistCategoryProducts = mockProducts.filter(p =>
        wishlistCategories.includes(p.category) &&
        p.id !== currentProduct.id &&
        p.inStock &&
        !youMayLike.find(item => item.id === p.id)
    );
    youMayLike.push(...wishlistCategoryProducts);
    
    // 3. Fill remaining with bestsellers
    const bestSellers = mockProducts.filter(p =>
        p.badge === 'best' &&
        p.id !== currentProduct.id &&
        p.inStock &&
        !youMayLike.find(item => item.id === p.id)
    );
    youMayLike.push(...bestSellers);
    
    // Limit to 5 products
    youMayLike = youMayLike.slice(0, 5);
    
    if (youMayLike.length > 0) {
        const container = document.getElementById('youMayLikeProducts');
        container.innerHTML = youMayLike.map(product => createProductCardHTML(product)).join('');
        
        // Attach wishlist listeners
        attachWishlistListeners(container);
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Recently Viewed Products
// ══════════════════════════════════════════════════════════════════════════

function addToRecentlyViewed(productId) {
    let recentlyViewed = JSON.parse(localStorage.getItem('pawpal_recently_viewed') || '[]');
    
    // Remove if already exists
    recentlyViewed = recentlyViewed.filter(id => id !== productId);
    
    // Add to beginning
    recentlyViewed.unshift(productId);
    
    // Keep only last 10
    recentlyViewed = recentlyViewed.slice(0, 10);
    
    localStorage.setItem('pawpal_recently_viewed', JSON.stringify(recentlyViewed));
    state.recentlyViewed = recentlyViewed;
}

function renderRecentlyViewedProducts() {
    const recentlyViewed = state.recentlyViewed.filter(id => id !== state.currentProduct.id);
    
    if (recentlyViewed.length > 0) {
        const products = recentlyViewed
            .map(id => mockProducts.find(p => p.id === id))
            .filter(p => p !== undefined)
            .slice(0, 5);
        
        if (products.length > 0) {
            document.getElementById('recentlyViewedSection').style.display = 'block';
            const container = document.getElementById('recentlyViewedProducts');
            container.innerHTML = products.map(product => createProductCardHTML(product)).join('');
            
            // Attach wishlist listeners
            attachWishlistListeners(container);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// Image Zoom
// ══════════════════════════════════════════════════════════════════════════

function initImageZoom() {
    const mainImage = document.getElementById('mainImage');
    const zoomOverlay = document.getElementById('zoomOverlay');
    
    mainImage.addEventListener('mousemove', (e) => {
        const rect = mainImage.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        zoomOverlay.style.backgroundImage = `url(${mainImage.src})`;
        zoomOverlay.style.backgroundPosition = `${x}% ${y}%`;
        zoomOverlay.style.display = 'block';
    });
    
    mainImage.addEventListener('mouseleave', () => {
        zoomOverlay.style.display = 'none';
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Share Buttons
// ══════════════════════════════════════════════════════════════════════════

function initShareButtons() {
    // Facebook share
    document.getElementById('shareFacebook')?.addEventListener('click', () => {
        const url = encodeURIComponent(window.location.href);
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
    });
    
    // Zalo share
    document.getElementById('shareZalo')?.addEventListener('click', () => {
        const url = encodeURIComponent(window.location.href);
        const zaloUrl = `https://zalo.me/share?url=${url}`;
        window.open(zaloUrl, '_blank', 'width=600,height=400');
    });
    
    // Copy link
    const copyBtn = document.getElementById('shareCopy');
    copyBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            copyBtn.classList.add('copied');
            showToast('Đã sao chép liên kết', 'success');
            
            setTimeout(() => {
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    });
}

// ══════════════════════════════════════════════════════════════════════════
// Create Product Card HTML
// ══════════════════════════════════════════════════════════════════════════

function createProductCardHTML(product) {
    const isInWishlist = state.wishlist.some(item => item.id === product.id);
    const discountPercent = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    
    let badgeHTML = '';
    if (product.badge === 'hot') {
        badgeHTML = '<div class="product-badge-hot">Hot</div>';
    } else if (product.badge === 'new') {
        badgeHTML = '<div class="product-badge-new">Mới</div>';
    } else if (product.badge === 'best') {
        badgeHTML = '<div class="product-badge-best">Bán chạy</div>';
    } else if (product.sale && discountPercent > 0) {
        badgeHTML = `<div class="product-badge-hot">-${discountPercent}%</div>`;
    }
    
    return `
        <div class="product-card">
            <a href="product-detail.html?id=${product.id}" class="product-card-link">
                <div class="product-card-image">
                    ${badgeHTML}
                    ${!product.inStock ? '<div class="product-out-of-stock-overlay">Tạm hết hàng</div>' : ''}
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                </div>
            </a>
            <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-product-id="${product.id}" aria-label="Thêm vào yêu thích">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <div class="product-card-body">
                <div class="product-brand">${product.brand}</div>
                <a href="product-detail.html?id=${product.id}">
                    <h3 class="product-name">${product.name}</h3>
                </a>
                <div class="product-rating">
                    <div class="stars">
                        ${generateStars(4)}
                    </div>
                    <span class="rating-count">(${Math.floor(Math.random() * 150) + 20})</span>
                </div>
                <div class="product-price">
                    <span class="price-current">${formatPrice(product.price)}</span>
                    ${product.originalPrice ? `<span class="price-old">${formatPrice(product.originalPrice)}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
    }
    return stars;
}

// ══════════════════════════════════════════════════════════════════════════
// Attach Wishlist Listeners to Product Cards
// ══════════════════════════════════════════════════════════════════════════

function attachWishlistListeners(container) {
    container.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(btn.dataset.productId);
            toggleWishlistForProduct(productId, btn);
        });
    });
}

function toggleWishlistForProduct(productId, btn) {
    const product = mockProducts.find(p => p.id === productId);
    if (!product) return;
    
    let wishlist = JSON.parse(localStorage.getItem('pawpal_wishlist') || '[]');
    const index = wishlist.findIndex(item => item.id === productId);
    
    if (index > -1) {
        wishlist.splice(index, 1);
        btn.classList.remove('active');
        showToast('Đã xóa khỏi danh sách yêu thích', 'info');
    } else {
        wishlist.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            inStock: product.inStock,
            addedAt: new Date().toISOString()
        });
        btn.classList.add('active');
        showToast('Đã thêm vào danh sách yêu thích', 'success');
    }
    
    localStorage.setItem('pawpal_wishlist', JSON.stringify(wishlist));
    state.wishlist = wishlist;
}

// ══════════════════════════════════════════════════════════════════════════
// Update Breadcrumb
// ══════════════════════════════════════════════════════════════════════════

function updateBreadcrumb() {
    const product = state.currentProduct;
    document.getElementById('breadcrumbCategory').textContent = categoryNames[product.category] || product.category;
    document.getElementById('breadcrumbProduct').textContent = product.name;
}

// ══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ══════════════════════════════════════════════════════════════════════════

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? 'var(--color-success)' : type === 'info' ? 'var(--color-info)' : 'var(--color-danger)'};
        color: white;
        padding: 12px 20px;
        border-radius: var(--border-radius-pill);
        box-shadow: var(--shadow-card-hover);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        font-family: var(--font-body);
        font-size: var(--fs-body);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);
