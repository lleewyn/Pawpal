/**
 * Product Detail Page JavaScript
 * Handles "Add to Cart" and "Buy Now" functionality
 */

let currentLoadedProduct = null;
let cachedProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Load dynamic product data if id exists in URL
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (productId && window.DataLoader) {
            const products = await window.DataLoader.loadProducts();
            cachedProducts = Array.isArray(products) ? products : [];
            const product = products.find(p => p.id.toString() === productId);
            if (product) {
                currentLoadedProduct = product;
                renderProductDetails(product);
            }
        }
    } catch (e) {
        console.error('Failed to load product data:', e);
    }

    // Get buttons
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    const quantityInput = document.getElementById('quantity');
    
    // Add to Cart functionality (existing)
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', handleAddToCart);
    }
    
    // Buy Now functionality (new)
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', handleBuyNow);
    }

    function getWishlistStorageKey() {
        const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        return user && user.phone ? `pawpal_wishlist_${user.phone}` : 'pawpal_wishlist_guest';
    }

    function loadWishlistIds() {
        try {
            return JSON.parse(localStorage.getItem(getWishlistStorageKey()) || '[]');
        } catch {
            return [];
        }
    }

    function saveWishlistIds(ids) {
        localStorage.setItem(getWishlistStorageKey(), JSON.stringify(Array.isArray(ids) ? ids : []));
    }

    function isProductInWishlist(productId) {
        const wishlist = loadWishlistIds();
        return wishlist.some(item => {
            if (item && typeof item === 'object' && item.id !== undefined) {
                return String(item.id) === String(productId);
            }
            return String(item) === String(productId);
        });
    }

    function updateWishlistButtonState(btn, productId) {
        if (!btn || !productId) return;
        if (isProductInWishlist(productId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    function toggleWishlistItem(productId) {
        const currentWishlist = loadWishlistIds();
        const idString = String(productId);
        const filtered = currentWishlist.filter(item => {
            if (item && typeof item === 'object' && item.id !== undefined) {
                return String(item.id) !== idString;
            }
            return String(item) !== idString;
        });

        const added = filtered.length === currentWishlist.length;
        if (added) {
            filtered.push(productId);
        }
        saveWishlistIds(filtered);
        return added;
    }

    function ensureWishlistButtons() {
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const productId = btn.dataset.productId;
            if (!productId) return;
            updateWishlistButtonState(btn, productId);
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                if (!user) {
                    showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                    return;
                }

                const added = toggleWishlistItem(productId);
                btn.classList.toggle('active', added);
                showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
            });
        });
    }

    // Favorite Product functionality
    const favoriteProductBtn = document.getElementById('favoriteProductBtn');
    const wishlistBtn = document.getElementById('wishlistBtn');

    function refreshProductWishlistButtons() {
        const productId = currentLoadedProduct?.id;
        if (!productId) return;

        const isWishlisted = isProductInWishlist(productId);
        if (favoriteProductBtn) {
            favoriteProductBtn.classList.toggle('active', isWishlisted);
        }
        if (wishlistBtn) {
            wishlistBtn.classList.toggle('active', isWishlisted);
        }
    }

    if (favoriteProductBtn) {
        if (currentLoadedProduct && isProductInWishlist(currentLoadedProduct.id)) {
            favoriteProductBtn.classList.add('active');
        }

        favoriteProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) {
                showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                return;
            }

            const productId = currentLoadedProduct?.id;
            if (!productId) {
                showToast('Không thể xác định sản phẩm yêu thích', 'error');
                return;
            }

            const added = toggleWishlistItem(productId);
            refreshProductWishlistButtons();
            const counter = document.getElementById('favoriteCounter');
            if (counter) {
                let current = parseInt(counter.textContent) || 120;
                counter.textContent = added ? `${current + 1} lượt thích` : `${Math.max(0, current - 1)} lượt thích`;
            }
            showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
        });
    }

    if (wishlistBtn) {
        if (currentLoadedProduct && isProductInWishlist(currentLoadedProduct.id)) {
            wishlistBtn.classList.add('active');
        }

        wishlistBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) {
                showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                return;
            }

            const productId = currentLoadedProduct?.id;
            if (!productId) {
                showToast('Không thể xác định sản phẩm yêu thích', 'error');
                return;
            }

            const added = toggleWishlistItem(productId);
            refreshProductWishlistButtons();
            showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
        });
    }

    // Related products wishlist buttons
    ensureWishlistButtons();
    bindRelatedProductCards();

    // Quantity controls
    const decreaseQtyBtn = document.getElementById('decreaseQty');
    const increaseQtyBtn = document.getElementById('increaseQty');

    if (decreaseQtyBtn && quantityInput) {
        decreaseQtyBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            if (val > 1) {
                quantityInput.value = val - 1;
            }
        });
    }

    if (increaseQtyBtn && quantityInput) {
        increaseQtyBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            let max = parseInt(quantityInput.getAttribute('max')) || 99;
            if (val < max) {
                quantityInput.value = val + 1;
            }
        });
    }

    // Update breadcrumb
    setTimeout(() => {
        const product = getCurrentProduct();
        const breadcrumbProduct = document.getElementById('breadcrumbProduct');
        if (breadcrumbProduct && product && product.name) {
            breadcrumbProduct.textContent = product.name;
        }
    }, 100);

    // Gallery arrows navigation
    const galleryPrev = document.getElementById('galleryPrev');
    const galleryNext = document.getElementById('galleryNext');
    if (galleryPrev && galleryNext) {
        galleryPrev.addEventListener('click', () => navigateGallery(-1));
        galleryNext.addEventListener('click', () => navigateGallery(1));
    }
});

let currentGalleryIndex = 0;

function navigateGallery(direction) {
    const thumbnails = document.querySelectorAll('#thumbnails .thumbnail');
    if (thumbnails.length <= 1) return;
    thumbnails[currentGalleryIndex].classList.remove('active');
    currentGalleryIndex = (currentGalleryIndex + direction + thumbnails.length) % thumbnails.length;
    thumbnails[currentGalleryIndex].classList.add('active');
    thumbnails[currentGalleryIndex].click();
}

/**
 * Handle Add to Cart - Add product to cart and stay on page
 */
function handleAddToCart() {
    const product = getCurrentProduct();
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    if (!product) {
        showToast('Không thể thêm sản phẩm vào giỏ hàng', 'error');
        return;
    }
    
    if (product.stock === 0) {
        showToast('Sản phẩm đã hết hàng', 'error');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`Chỉ còn ${product.stock} sản phẩm trong kho`, 'error');
        return;
    }
    
    addProductToCart(product, quantity);
    showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
    updateCartBadge();
}

/**
 * Handle Buy Now - Add product to cart and redirect to checkout
 */
function handleBuyNow() {
    const product = getCurrentProduct();
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    if (!product) {
        showToast('Không thể mua sản phẩm', 'error');
        return;
    }
    
    if (product.stock === 0) {
        showToast('Sản phẩm đã hết hàng', 'error');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`Chỉ còn ${product.stock} sản phẩm trong kho`, 'error');
        return;
    }
    
    const originalText = document.getElementById('buyNowBtn').innerHTML;
    document.getElementById('buyNowBtn').innerHTML = '<span>Đang xử lý...</span>';
    document.getElementById('buyNowBtn').disabled = true;
    
    setTimeout(() => {
        const buyNowCart = [{
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            quantity: quantity,
            image: product.image,
            stock: product.stock
        }];
        
        sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
        sessionStorage.setItem('pawpal_is_buynow', 'true');
        window.location.href = '/pages/shop/checkout/checkout.html?buynow=true';
    }, 500);
}

function handleCardAddToCart(product) {
    if (!product || !product.inStock) {
        showToast('Sản phẩm không khả dụng', 'error');
        return;
    }
    addProductToCart(product, 1);
    updateCartBadge();
    showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
}

function handleCardBuyNow(product) {
    if (!product || !product.inStock) {
        showToast('Sản phẩm không khả dụng', 'error');
        return;
    }

    const buyNowCart = [{
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        quantity: 1,
        image: product.image,
        stock: product.stock
    }];

    sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
    sessionStorage.setItem('pawpal_is_buynow', 'true');
    window.location.href = '/pages/shop/checkout/checkout.html?buynow=true';
}

/**
 * Get current product data from page
 */
function getCurrentProduct() {
    if (currentLoadedProduct) return currentLoadedProduct;
    
    try {
        // Try to get from URL params first
        const urlParams = new URLSearchParams(window.location.search);
        let productId = urlParams.get('id');
        
        // If no ID in URL, generate a temporary ID
        if (!productId) {
            productId = 'prod_' + Date.now();
        }
        
        // Get product data from page elements with safe fallbacks
        const titleElement = document.getElementById('productTitle');
        const brandElement = document.getElementById('productBrand');
        const priceElement = document.getElementById('productPrice');
        const imageElement = document.getElementById('mainImage');
        const stockElement = document.getElementById('stockRemaining');
        const categoryElement = document.getElementById('productCategory');
        
        const fallbackImage = '/assets/images/shop/products/placeholder.webp';
        const product = {
            id: productId,
            name: titleElement?.textContent?.trim() || 'Royal Canin Mini Adult',
            brand: brandElement?.textContent?.trim() || 'Royal Canin',
            price: parsePriceFromText(priceElement?.textContent || '250000') || 250000,
            image: imageElement?.src || fallbackImage,
            stock: parseInt(stockElement?.textContent || '99'),
            category: categoryElement?.textContent?.trim() || 'Thức ăn khô'
        };
        
        return product;
        
    } catch (error) {
        console.error('Error getting product data:', error);
        
        return {
            id: 'prod-fallback',
            name: 'Royal Canin Mini Adult',
            brand: 'Royal Canin',
            price: 250000,
            image: '/assets/images/shop/products/placeholder.webp',
            stock: 99,
            category: 'Thức ăn khô'
        };
    }
}

function getProductCatalog() {
    if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
        return Promise.resolve(cachedProducts);
    }

    if (window.DataLoader && typeof window.DataLoader.loadProducts === 'function') {
        return window.DataLoader.loadProducts().then(products => {
            cachedProducts = Array.isArray(products) ? products : [];
            return cachedProducts;
        }).catch(() => []);
    }

    return Promise.resolve([]);
}

async function bindRelatedProductCards() {
    const products = await getProductCatalog();
    if (!products || products.length === 0) return;

    // Get random products for 'You May Like' (5 items)
    const youMayLikeProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    // Get related products from same category (5 items)
    const currentCategory = (typeof currentLoadedProduct !== 'undefined' && currentLoadedProduct) ? currentLoadedProduct.category : 'food-dry';
    const currentId = (typeof currentLoadedProduct !== 'undefined' && currentLoadedProduct) ? currentLoadedProduct.id : -1;
    let relatedProducts = products.filter(p => p.category === currentCategory && String(p.id) !== String(currentId)).slice(0, 5);
    
    // Fallback if not enough related products
    if (relatedProducts.length < 5) {
        const more = products.filter(p => !relatedProducts.includes(p) && String(p.id) !== String(currentId)).slice(0, 5 - relatedProducts.length);
        relatedProducts.push(...more);
    }

    const generateCardHTML = (product) => {
        const priceFmt = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.price).replace('₫', 'đ');
        const oldPriceHTML = product.oldPrice ? '<span class="price-old">' + new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.oldPrice).replace('₫', 'đ') + '</span>' : '';
        const isWishlisted = typeof isProductInWishlist === 'function' && isProductInWishlist(product.id) ? 'active' : '';
        const stars = Array(5).fill(0).map((_, i) => '<span class="star ' + (i < Math.floor(product.rating || 5) ? 'filled' : '') + '"></span>').join('');
        
        return '<div class="product-card" onclick="window.location.href=\'/pages/shop/product-detail/product-detail.html?id=' + product.id + '\'">' +
            '<div class="product-card-image" role="link" tabindex="0" aria-label="Xem chi tiết ' + product.name + '">' +
                '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">' +
                '<button class="wishlist-btn ' + isWishlisted + '" aria-label="Thêm vào yêu thích" data-product-id="' + product.id + '">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' +
                '</button>' +
            '</div>' +
            '<div class="product-card-body">' +
                '<div class="product-brand">' + product.brand + '</div>' +
                '<h3 class="product-name">' + product.name + '</h3>' +
                '<div class="product-rating"><div class="stars">' + stars + '</div><span class="rating-count">(' + (product.reviewCount || 0) + ')</span></div>' +
                '<div class="product-price"><span class="price-current">' + priceFmt + '</span>' + oldPriceHTML + '</div>' +
                '<div class="product-card-actions">' +
                    '<button class="product-quick-add btn-add-cart" aria-label="Thêm vào giỏ" data-product-id="' + product.id + '">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' +
                    '</button>' +
                    '<button class="product-buy-now btn-buy-now" data-product-id="' + product.id + '">Mua ngay</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    };

    const youMayLikeEl = document.getElementById('youMayLikeProducts');
    if (youMayLikeEl) youMayLikeEl.innerHTML = youMayLikeProducts.map(generateCardHTML).join('');

    const relatedEl = document.getElementById('relatedProducts');
    if (relatedEl) relatedEl.innerHTML = relatedProducts.map(generateCardHTML).join('');

    const sections = [youMayLikeEl, relatedEl].filter(Boolean);
    sections.forEach(section => {
        section.querySelectorAll('.product-card').forEach(card => {
            card.style.cursor = 'pointer';
            const productId = card.querySelector('.wishlist-btn') ? card.querySelector('.wishlist-btn').dataset.productId : null;
            if (!productId) return;
            const product = products.find(p => String(p.id) === String(productId));
            if (!product) return;

            const wishlist = card.querySelector('.wishlist-btn');
            if (wishlist) {
                wishlist.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                    if (!user) {
                        if(typeof showToast === 'function') showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                        return;
                    }
                    const added = typeof toggleWishlistItem === 'function' ? toggleWishlistItem(String(product.id)) : false;
                    wishlist.classList.toggle('active', added);
                    if(typeof showToast === 'function') showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
                });
            }

            const addBtn = card.querySelector('.product-quick-add');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if(typeof handleCardAddToCart === 'function') handleCardAddToCart(product);
                });
            }

            const buyBtn = card.querySelector('.product-buy-now');
            if (buyBtn) {
                buyBtn.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if(typeof handleCardBuyNow === 'function') handleCardBuyNow(product);
                });
            }
        });
    });
}

function addProductToCart(product, quantity) {
    // Get existing cart
    let cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    
    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex >= 0) {
        // Update quantity
        cart[existingIndex].quantity += quantity;
        
        // Check stock limit
        if (cart[existingIndex].quantity > product.stock) {
            cart[existingIndex].quantity = product.stock;
            showToast(`Đã cập nhật số lượng tối đa: ${product.stock}`, 'warning');
        }
    } else {
        // Add new product
        cart.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            quantity: quantity,
            image: product.image,
            stock: product.stock
        });
    }
    
    // Save to localStorage
    localStorage.setItem('pawpal_cart', JSON.stringify(cart));
}

/**
 * Update cart badge count in header
 */
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Find cart badge element (if exists in header)
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        if (totalItems > 0) {
            cartBadge.classList.remove('d-none');
        }
    }
}

/**
 * Parse price from formatted text (e.g., "250.000₫" -> 250000)
 */
function parsePriceFromText(priceText) {
    if (!priceText) return 0;
    
    // Remove all non-numeric characters except digits
    const numericOnly = priceText.toString().replace(/[^0-9]/g, '');
    const price = parseInt(numericOnly) || 0;
    
    console.log('Parsed price:', priceText, '->', price);
    return price;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: ${type === 'warning' ? '#000' : 'white'};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        font-family: var(--font-body);
        font-size: 14px;
        min-width: 250px;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Render loaded product to the DOM
function renderProductDetails(product) {
    // Update Breadcrumb
    const breadcrumbCategory = document.getElementById('breadcrumbCategory');
    const breadcrumbProduct = document.getElementById('breadcrumbProduct');
    if (breadcrumbCategory) breadcrumbCategory.textContent = product.categoryName || 'Sản phẩm';
    if (breadcrumbProduct) breadcrumbProduct.textContent = product.name;

    // Update Product Info
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.src = product.image;
        mainImage.alt = product.name;
    }
    
    // Generate Thumbnails
    const thumbnailsContainer = document.getElementById('thumbnails');
    if (thumbnailsContainer && product.image) {
        thumbnailsContainer.innerHTML = '';
        // Use product.images or fallback to single image
        const gallery = (product.images && product.images.length > 0) 
            ? product.images 
            : [product.image];
        
        gallery.forEach((imgSrc, index) => {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = `${product.name} - Thumbnail ${index + 1}`;
            
            thumb.appendChild(img);
            
            thumb.addEventListener('click', () => {
                document.querySelectorAll('#thumbnails .thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                if (mainImage) {
                    mainImage.src = imgSrc;
                }
                if (typeof currentGalleryIndex !== 'undefined') {
                    currentGalleryIndex = index;
                }
            });
            
            thumbnailsContainer.appendChild(thumb);
        });
    }
    
    const productBrand = document.getElementById('productBrand');
    if (productBrand) productBrand.textContent = product.brand;
    
    const productTitle = document.getElementById('productTitle');
    if (productTitle) productTitle.textContent = product.name;
    
    const productPrice = document.getElementById('productPrice');
    if (productPrice) productPrice.textContent = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.price).replace('₫', 'đ');
    
    const productPriceOld = document.getElementById('productPriceOld');
    const productDiscount = document.getElementById('productDiscount');
    if (product.oldPrice && product.oldPrice > product.price) {
        if (productPriceOld) {
            productPriceOld.textContent = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.oldPrice).replace('₫', 'đ');
            productPriceOld.classList.remove('d-none');
        }
        if (productDiscount) {
            productDiscount.textContent = 'Tiết kiệm ' + new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.oldPrice - product.price).replace('₫', 'đ');
            productDiscount.classList.remove('d-none');
        }
    } else {
        if (productPriceOld) productPriceOld.classList.add('d-none');
        if (productDiscount) productDiscount.classList.add('d-none');
    }

    const productStockStatus = document.getElementById('productStockStatus');
    if (productStockStatus) {
        if (product.stock > 0) {
            productStockStatus.textContent = 'Còn hàng';
            productStockStatus.style.color = 'var(--color-success)';
        } else {
            productStockStatus.textContent = 'Hết hàng';
            productStockStatus.style.color = 'var(--color-danger)';
        }
    }

    const productStockQty = document.getElementById('productStockQty');
    if (productStockQty) {
        productStockQty.textContent = product.stock > 0 ? product.stock + ' sản phẩm' : '—';
    }

    const productPetType = document.getElementById('productPetType');
    if (productPetType) {
        const petTypeMap = {
            'cho': 'Chó',
            'meo': 'Mèo',
            'dog': 'Chó',
            'cat': 'Mèo'
        };
        const raw = (product.petType || product.pet_type || '').toLowerCase();
        productPetType.textContent = petTypeMap[raw] || 'Chó / Mèo';
    }

    const productDescShort = document.getElementById('productDescShort');
    if (productDescShort) productDescShort.textContent = product.description || '';

    const productSKU = document.getElementById('productSKU');
    if (productSKU) productSKU.textContent = product.sku || product.id;

    const productSKUChip = document.getElementById('productSKUChip');
    if (productSKUChip) productSKUChip.textContent = product.sku || product.id;

    const productCategoryMeta = document.getElementById('productCategory');
    if (productCategoryMeta) productCategoryMeta.textContent = product.categoryName || 'Sản phẩm';

    const productBrandMeta = document.getElementById('productBrandMeta');
    if (productBrandMeta) productBrandMeta.textContent = product.brand;
    
    // Dynamic Description block
    const dynamicDetailsContainer = document.getElementById('dynamicProductDetails');
    if (dynamicDetailsContainer) {
        let detailsHtml = '';
        if (product.description && product.description !== 'Thông tin sản phẩm đang được cập nhật.') {
            detailsHtml += `<p>${product.description}</p>`;
        }
        
        if (product.benefits) {
            detailsHtml += `<h4>Đặc điểm nổi bật:</h4><p>${product.benefits}</p>`;
        }
        
        if (product.ingredients) {
            detailsHtml += `<h4>Thành phần:</h4><p>${product.ingredients}</p>`;
        }
        
        if (product.usage) {
            detailsHtml += `<h4>Hướng dẫn sử dụng:</h4><p>${product.usage}</p>`;
        }

        if (product.specs || product.origin) {
            detailsHtml += `<h4>Thông số kỹ thuật:</h4>
                            <div class="specifications-table">
                                <table>`;
            if (product.origin) {
                detailsHtml += `<tr><th>Xuất xứ</th><td>${product.origin}</td></tr>`;
            }
            if (product.specs) {
                detailsHtml += `<tr><th>Quy cách / Khác</th><td>${product.specs}</td></tr>`;
            }
            detailsHtml += `</table></div>`;
        }
        
        if (!detailsHtml) {
            detailsHtml = '<p>Thông tin sản phẩm đang được cập nhật.</p>';
        }
        
        dynamicDetailsContainer.innerHTML = detailsHtml;
    }
    
    // Dynamic Reviews block
    const averageScore = document.getElementById('averageScore');
    const totalReviewsCount = document.getElementById('totalReviewsCount');
    
    if (averageScore) {
        averageScore.textContent = product.rating ? product.rating.toFixed(1) : '4.5';
    }
    
    if (totalReviewsCount) {
        totalReviewsCount.textContent = `Dựa trên ${product.reviewCount || 0} đánh giá`;
    }
    
    // Disable buttons if out of stock
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (product.stock <= 0) {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }
}
