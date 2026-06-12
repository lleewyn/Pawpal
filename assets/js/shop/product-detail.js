/**
 * Product Detail Page JavaScript
 * Handles "Add to Cart" and "Buy Now" functionality
 */

document.addEventListener('DOMContentLoaded', () => {
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
});

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
