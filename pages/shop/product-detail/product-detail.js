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

        // Reviews are loaded dynamically inside renderProductDetails
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
        const finalIds = Array.isArray(ids) ? ids : [];
        if (window.saveWishlist) {
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            const phone = user ? user.phone : null;
            const serviceKey = phone ? `pawpal_wishlist_services_${phone}` : 'pawpal_wishlist_services_guest';
            const serviceIds = JSON.parse(localStorage.getItem(serviceKey) || '[]');
            window.saveWishlist(finalIds, serviceIds);
        } else {
            localStorage.setItem(getWishlistStorageKey(), JSON.stringify(finalIds));
        }
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
    if (window.saveCart) {
        window.saveCart(cart);
    } else {
        localStorage.setItem('pawpal_cart', JSON.stringify(cart));
    }
    


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

// ============================================================
// (Removed duplicate loadProductReviewsFromSupabase function)

function renderReviewItem(r) {
    const name    = r.customer?.customer_profile?.[0]?.full_name || r.customer?.customer_profile?.full_name || 'Khách hàng';
    const rating  = Number(r.rating) || 0;
    const stars   = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const date    = new Date(r.created_at).toLocaleDateString('vi-VN');
    const content = r.review_content || '';
    const images  = Array.isArray(r.image_urls) ? r.image_urls : [];

    const imagesHtml = images.length
        ? `<div class="review-media-list">${images.map(img =>
            `<img src="${img.startsWith('/') || img.startsWith('http') ? img : '/' + img}" 
                  alt="Ảnh đánh giá" class="review-photo" loading="lazy"
                  style="width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer;">`
          ).join('')}</div>`
        : '';

    const response = r.review_response?.[0];
    const responseHtml = response
        ? `<div class="seller-reply" style="background:#f0f9f4;border-left:3px solid var(--color-primary);padding:10px 14px;margin-top:10px;border-radius:8px;">
               <strong>Phản hồi từ PawPal:</strong>
               <p style="margin:4px 0 0;">${response.response_content}</p>
           </div>`
        : '';

    return `
        <div class="review-item" data-stars="${rating}" data-has-media="${images.length > 0}">
            <div class="review-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div>
                    <strong>${name}</strong>
                    <span style="color:#f59e0b;margin-left:8px;">${stars}</span>
                </div>
                <span style="color:#94a3b8;font-size:0.85rem;">${date}</span>
            </div>
            ${content ? `<p style="margin-bottom:8px;">${content}</p>` : ''}
            ${imagesHtml}
            ${responseHtml}
        </div>
    `;
}

function updateReviewSummary(reviews) {
    const avgEl   = document.getElementById('averageScore');
    const countEl = document.getElementById('totalReviewsCount');
    if (!reviews.length) {
        if (avgEl)   avgEl.textContent   = '0.0';
        if (countEl) countEl.textContent = 'Chưa có đánh giá';
        return;
    }
    const avg = reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length;
    if (avgEl)   avgEl.textContent   = avg.toFixed(1);
    if (countEl) countEl.textContent = `Dựa trên ${reviews.length} đánh giá`;

    // Cập nhật star bars
    [5,4,3,2,1].forEach(star => {
        const barFill = document.getElementById(`star${star}Fill`);
        const pctEl   = document.getElementById(`star${star}Pct`);
        const count   = reviews.filter(r => Number(r.rating) === star).length;
        const pct     = Math.round((count / reviews.length) * 100);
        if (barFill) barFill.style.width = pct + '%';
        if (pctEl)   pctEl.textContent   = pct + '%';
    });
}
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
    // Load and render dynamic reviews from Supabase
    if (window.DataLoader && window.DataLoader.getProductReviews) {
        window.DataLoader.getProductReviews(product.id).then(reviews => {
            const container = document.getElementById('reviewsContainer');
            if (!container) return;
            
            if (!reviews || reviews.length === 0) {
                container.innerHTML = '<div class="text-center py-4 text-secondary">Chưa có đánh giá nào cho sản phẩm này.</div>';
                
                // Reset bars to 0
                for(let i=1; i<=5; i++) {
                    const bar = document.getElementById('bar'+i);
                    const pct = document.getElementById('pct'+i);
                    if(bar) bar.style.width = '0%';
                    if(pct) pct.textContent = '0%';
                }
                if (totalReviewsCount) totalReviewsCount.textContent = 'Chưa có đánh giá';
                if (averageScore) averageScore.textContent = '0.0';
                return;
            }
            
            // Calculate stats
            let sum = 0;
            let counts = {1:0, 2:0, 3:0, 4:0, 5:0};
            reviews.forEach(r => {
                sum += r.rating;
                if(counts[r.rating] !== undefined) counts[r.rating]++;
            });
            const avg = sum / reviews.length;
            
            if (averageScore) averageScore.textContent = avg.toFixed(1);
            if (totalReviewsCount) totalReviewsCount.textContent = `Dựa trên ${reviews.length} đánh giá`;
            
            // Update bars
            for(let i=1; i<=5; i++) {
                const pct = Math.round((counts[i] / reviews.length) * 100);
                const bar = document.getElementById('bar'+i);
                const pctLabel = document.getElementById('pct'+i);
                if(bar) bar.style.width = pct + '%';
                if(pctLabel) pctLabel.textContent = pct + '%';
            }
            
            // Pagination and Filtering logic
            window.allProductReviews = reviews;
            window.filteredReviews = reviews;
            window.currentReviewPage = 1;
            window.reviewsPerPage = 5;

            // Define render functions globally for easy access
            window.renderReviewsPage = function() {
                const start = (window.currentReviewPage - 1) * window.reviewsPerPage;
                const end = start + window.reviewsPerPage;
                const currentItems = window.filteredReviews.slice(start, end);
                
                if (window.filteredReviews.length === 0) {
                    container.innerHTML = '<div class="text-center py-4 text-secondary">Không có đánh giá nào phù hợp với bộ lọc.</div>';
                    document.getElementById('reviewsPaginationWrapper').style.display = 'none';
                    return;
                }

                let html = '';
                currentItems.forEach(r => {
                    const d = new Date(r.createdAt);
                    const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                    const initial = r.customerName ? r.customerName.charAt(0).toUpperCase() : 'K';
                    
                    let starsHtml = '';
                    for(let i=1; i<=5; i++) {
                        starsHtml += `<span class="star ${i <= r.rating ? 'filled' : ''}" aria-hidden="true"></span>`;
                    }
                    
                    html += `
                        <div class="review-item" data-stars="${r.rating}">
                            <div class="review-header">
                                <div class="reviewer-avatar">${initial}</div>
                                <div class="reviewer-meta">
                                    <div class="d-flex align-items-center gap-2 mb-1">
                                        <div class="reviewer-name ui-spacing-5">${r.customerName}</div>
                                        <div class="review-stars ui-text-format-9" aria-label="${r.rating} sao">
                                            ${starsHtml}
                                        </div>
                                    </div>
                                    <span class="review-verified-badge">Người mua thực</span>
                                    <div class="review-meta-info">
                                        <span class="review-date">${dateStr}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="review-content">
                                <p>${r.content}</p>
                            </div>
                        </div>
                    `;
                });
                
                container.innerHTML = html;
                window.renderReviewPagination();
            };

            window.renderReviewPagination = function() {
                const totalPages = Math.ceil(window.filteredReviews.length / window.reviewsPerPage);
                const paginationWrapper = document.getElementById('reviewsPaginationWrapper');
                const paginationUl = document.getElementById('reviewsPagination');
                
                if (totalPages <= 1) {
                    paginationWrapper.style.display = 'none';
                    return;
                }
                
                paginationWrapper.style.display = 'block';
                let html = '';
                
                // Prev button
                html += `
                    <li class="page-item ${window.currentReviewPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${window.currentReviewPage - 1}" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                `;
                
                // Page numbers
                for (let i = 1; i <= totalPages; i++) {
                    html += `
                        <li class="page-item ${window.currentReviewPage === i ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                }
                
                // Next button
                html += `
                    <li class="page-item ${window.currentReviewPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${window.currentReviewPage + 1}" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                `;
                
                paginationUl.innerHTML = html;
                
                // Add event listeners to pagination links
                paginationUl.querySelectorAll('.page-link').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const page = parseInt(this.getAttribute('data-page'));
                        if (page > 0 && page <= totalPages && page !== window.currentReviewPage) {
                            window.currentReviewPage = page;
                            window.renderReviewsPage();
                            document.getElementById('reviewsContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });
                });
            };

            // Setup Filter Chips
            const chips = document.querySelectorAll('.review-filter-chip');
            chips.forEach(chip => {
                chip.addEventListener('click', function() {
                    // Update active class
                    chips.forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                    
                    const filter = this.getAttribute('data-filter');
                    if (filter === 'all') {
                        window.filteredReviews = window.allProductReviews;
                    } else {
                        const starRating = parseInt(filter);
                        window.filteredReviews = window.allProductReviews.filter(r => r.rating === starRating);
                    }
                    
                    window.currentReviewPage = 1;
                    window.renderReviewsPage();
                });
            });

            // Initial render
            window.renderReviewsPage();
        });
    }

    // Disable buttons if out of stock
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (product.stock <= 0) {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }
}
