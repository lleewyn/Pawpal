/**
 * Product Detail Page JavaScript
 * Handles "Add to Cart" and "Buy Now" functionality
 */

let currentLoadedProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Load dynamic product data if id exists in URL
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (productId && window.DataLoader) {
            const products = await window.DataLoader.loadProducts();
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

    // Favorite Product functionality
    const favoriteProductBtn = document.getElementById('favoriteProductBtn');
    if (favoriteProductBtn) {
        favoriteProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) {
                showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                return;
            }
            // Toggle active state
            favoriteProductBtn.classList.toggle('active');
            const counter = document.getElementById('favoriteCounter');
            if (counter) {
                let current = parseInt(counter.textContent) || 120;
                if (favoriteProductBtn.classList.contains('active')) {
                    counter.textContent = `${current + 1} lượt thích`;
                    showToast('Đã thêm vào danh sách yêu thích', 'success');
                } else {
                    counter.textContent = `${current - 1} lượt thích`;
                    showToast('Đã bỏ khỏi danh sách yêu thích', 'success');
                }
            }
        });
    }

    // Related products wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) {
                showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                return;
            }
            btn.classList.toggle('active');
            if (btn.classList.contains('active')) {
                showToast('Đã thêm vào danh sách yêu thích', 'success');
            } else {
                showToast('Đã bỏ khỏi danh sách yêu thích', 'success');
            }
        });
    });

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
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!user) {
        showToast('Vui lòng đăng nhập để thêm vào giỏ hàng', 'warning');
        return;
    }

    const product = getCurrentProduct();
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    if (!product) {
        showToast('Không thể thêm sản phẩm vào giỏ hàng', 'error');
        return;
    }
    
    // Check stock
    if (product.stock === 0) {
        showToast('Sản phẩm đã hết hàng', 'error');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`Chỉ còn ${product.stock} sản phẩm trong kho`, 'error');
        return;
    }
    
    // Add to cart
    addProductToCart(product, quantity);
    
    // Show success toast
    showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
    
    // Update cart badge (if exists)
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
    
    // Check stock
    if (product.stock === 0) {
        showToast('Sản phẩm đã hết hàng', 'error');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`Chỉ còn ${product.stock} sản phẩm trong kho`, 'error');
        return;
    }
    
    // Show loading
    const originalText = document.getElementById('buyNowBtn').innerHTML;
    document.getElementById('buyNowBtn').innerHTML = '<span>Đang xử lý...</span>';
    document.getElementById('buyNowBtn').disabled = true;
    
    setTimeout(() => {
        // Create temporary cart with this product only
        const buyNowCart = [{
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            quantity: quantity,
            image: product.image,
            stock: product.stock
        }];
        
        // Save to sessionStorage (temporary cart for buy now)
        sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
        
        // Set flag to indicate this is a buy now checkout
        sessionStorage.setItem('pawpal_is_buynow', 'true');
        
        // Redirect to checkout
        window.location.href = '/pages/shop/checkout.html?buynow=true';
    }, 500);
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
        
        // If no ID in URL, generate a mock ID
        if (!productId) {
            productId = 'prod_' + Date.now();
        }
        
        // Get product data from page elements (with fallbacks for demo)
        const titleElement = document.getElementById('productTitle');
        const brandElement = document.getElementById('productBrand');
        const priceElement = document.getElementById('productPrice');
        const imageElement = document.getElementById('mainImage');
        const stockElement = document.getElementById('stockRemaining');
        const categoryElement = document.getElementById('productCategory');
        
        const product = {
            id: productId,
            name: titleElement?.textContent?.trim() || 'Royal Canin Mini Adult',
            brand: brandElement?.textContent?.trim() || 'Royal Canin',
            price: parsePriceFromText(priceElement?.textContent || '250000') || 250000,
            image: imageElement?.src || 'https://via.placeholder.com/300',
            stock: parseInt(stockElement?.textContent || '99'),
            category: categoryElement?.textContent?.trim() || 'Thức ăn khô'
        };
        
        console.log('Product data:', product);
        return product;
        
    } catch (error) {
        console.error('Error getting product data:', error);
        
        // Return mock product as fallback
        return {
            id: 'prod_mock_' + Date.now(),
            name: 'Royal Canin Mini Adult',
            brand: 'Royal Canin',
            price: 250000,
            image: 'https://via.placeholder.com/300',
            stock: 99,
            category: 'Thức ăn khô'
        };
    }
}

/**
 * Add product to cart (persistent cart in localStorage)
 */
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
            cartBadge.style.display = 'flex';
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
            productPriceOld.style.display = 'block';
        }
        if (productDiscount) {
            productDiscount.textContent = 'Tiết kiệm ' + new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.oldPrice - product.price).replace('₫', 'đ');
            productDiscount.style.display = 'block';
        }
    } else {
        if (productPriceOld) productPriceOld.style.display = 'none';
        if (productDiscount) productDiscount.style.display = 'none';
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
    
    // Disable buttons if out of stock
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (product.stock <= 0) {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }
}
