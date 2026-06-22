// ==========================================================================
// wishlist.js — Wishlist Page Logic
// ==========================================================================

(function() {
    'use strict';

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
        } catch {
            return null;
        }
    }

    function getWishlistStorageKey(user = getCurrentUser()) {
        return user && user.phone ? `pawpal_wishlist_${user.phone}` : 'pawpal_wishlist_guest';
    }

    function migrateGuestWishlistToUser(user) {
        const guestKey = 'pawpal_wishlist_guest';
        const targetKey = getWishlistStorageKey(user);
        if (!user || !user.phone || guestKey === targetKey) {
            return;
        }

        let guestWishlist = [];
        try {
            guestWishlist = JSON.parse(localStorage.getItem(guestKey) || '[]');
        } catch (e) {
            guestWishlist = [];
        }

        if (!Array.isArray(guestWishlist) || guestWishlist.length === 0) {
            return;
        }

        let targetWishlist = [];
        try {
            targetWishlist = JSON.parse(localStorage.getItem(targetKey) || '[]');
        } catch (e) {
            targetWishlist = [];
        }

        const merged = [...targetWishlist];
        const existingIds = new Set(merged.map(item => (typeof item === 'object' && item !== null && item.id !== undefined) ? String(item.id) : String(item)));

        guestWishlist.forEach(item => {
            const id = (typeof item === 'object' && item !== null && item.id !== undefined) ? String(item.id) : String(item);
            if (!existingIds.has(id)) {
                merged.push(item);
                existingIds.add(id);
            }
        });

        localStorage.setItem(targetKey, JSON.stringify(merged));
        localStorage.removeItem(guestKey);
    }

    // Get wishlist from localStorage
    function getWishlist() {
        const user = getCurrentUser();
        const storageKey = getWishlistStorageKey(user);

        if (user && user.phone) {
            migrateGuestWishlistToUser(user);
        }

        const wishlist = localStorage.getItem(storageKey);
        try {
            return wishlist ? JSON.parse(wishlist) : [];
        } catch (e) {
            return [];
        }
    }

    // Save wishlist to localStorage
    function saveWishlist(wishlist) {
        localStorage.setItem(getWishlistStorageKey(), JSON.stringify(Array.isArray(wishlist) ? wishlist : []));
    }

    function isWishlistItemObject(item) {
        return item && typeof item === 'object' && item.id !== undefined;
    }

    async function getWishlistItems() {
        const rawWishlist = getWishlist();
        const allProducts = window.DataLoader && typeof window.DataLoader.loadProducts === 'function'
            ? await window.DataLoader.loadProducts()
            : [];

        if (!rawWishlist || rawWishlist.length === 0) {
            return [];
        }

        return rawWishlist.map(item => {
            if (isWishlistItemObject(item)) {
                const productId = Number(item.id);
                const matchedProduct = allProducts.find(p => p.id === productId);
                const baseProduct = matchedProduct || {};

                return {
                    id: productId,
                    image: item.image || baseProduct.image || '/assets/images/shop/products/placeholder.webp',
                    brand: item.brand || baseProduct.brand || 'Chưa xác định',
                    name: item.name || baseProduct.name || `Sản phẩm #${productId}`,
                    price: Number(item.price ?? baseProduct.price ?? 0) || 0,
                    originalPrice: Number(item.originalPrice ?? item.oldPrice ?? baseProduct.originalPrice ?? baseProduct.oldPrice ?? null) || null,
                    inStock: typeof item.inStock === 'boolean' ? item.inStock : (baseProduct.inStock !== undefined ? baseProduct.inStock : true),
                    addedAt: item.addedAt || baseProduct.addedAt || new Date().toISOString(),
                };
            }

            const productId = Number(item);
            if (!Number.isFinite(productId)) {
                return null;
            }

            const product = allProducts.find(p => p.id === productId);
            if (!product) {
                return {
                    id: productId,
                    image: '/assets/images/shop/products/placeholder.webp',
                    brand: 'Chưa xác định',
                    name: `Sản phẩm #${productId}`,
                    price: 0,
                    originalPrice: null,
                    inStock: true,
                    addedAt: new Date().toISOString(),
                };
            }

            return {
                ...product,
                addedAt: product.addedAt || new Date().toISOString(),
            };
        }).filter(Boolean);
    }

    // Format price
    function formatPrice(price) {
        const numericPrice = Number(price) || 0;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(numericPrice);
    }

    // Format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        if (isNaN(date)) return 'vừa xong';

        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hôm nay';
        if (diffDays === 1) return 'Hôm qua';
        if (diffDays < 7) return `${diffDays} ngày trước`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
        return date.toLocaleDateString('vi-VN');
    }

    // Remove from wishlist
    function removeFromWishlist(productId) {
        const rawWishlist = getWishlist();
        const filteredWishlist = rawWishlist.filter(item => {
            if (isWishlistItemObject(item)) {
                return String(item.id) !== String(productId);
            }
            return String(item) !== String(productId);
        });

        saveWishlist(filteredWishlist);
        renderWishlist();
        
        // Show notification
        showNotification('Đã xóa khỏi danh sách yêu thích');
    }

    // Add to cart
    function addToCart(product) {
        let cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
        
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                ...product,
                quantity: 1
            });
        }
        
        localStorage.setItem('pawpal_cart', JSON.stringify(cart));
        showNotification('Đã thêm vào giỏ hàng');
        
        // Update cart badge if exists
        updateCartBadge();
    }

    // Update cart badge in header
    function updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    // Show notification
    function showNotification(message) {
        // Simple notification - can be enhanced with a toast library
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--color-success);
            color: white;
            padding: 12px 20px;
            border-radius: var(--border-radius-pill);
            box-shadow: var(--shadow-card-hover);
            z-index: 9999;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Render wishlist
    async function renderWishlist() {
        const wishlistItems = await getWishlistItems();
        const rawWishlist = getWishlist();
        const emptyState = document.getElementById('emptyWishlist');
        const grid = document.getElementById('wishlistGrid');
        const countSpan = document.getElementById('wishlistCount');
        
        countSpan.textContent = rawWishlist.length;
        
        if (wishlistItems.length === 0) {
            emptyState.style.display = 'block';
            grid.style.display = 'none';
            return;
        }
        
        emptyState.style.display = 'none';
        grid.style.display = 'grid';
        
        grid.innerHTML = wishlistItems.map(product => {
            const hasDiscount = product.originalPrice && product.originalPrice > product.price;
            const discountPercent = hasDiscount 
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;
            
            return `
                <div class="wishlist-card" data-product-id="${product.id}">
                    <div class="wishlist-card-image-wrapper">
                        <img src="${product.image}" alt="${product.name}" class="wishlist-card-image">
                        
                        <button class="wishlist-card-remove" onclick="removeFromWishlist('${product.id}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        
                        ${hasDiscount ? `<span class="wishlist-card-sale-badge">-${discountPercent}%</span>` : ''}
                        ${!product.inStock ? '<div class="wishlist-card-out-of-stock">Hết hàng</div>' : ''}
                    </div>
                    
                    <div class="wishlist-card-info">
                        <div class="wishlist-card-brand">${product.brand}</div>
                        <a href="../shop/product-detail.html?id=${product.id}" class="wishlist-card-name">${product.name}</a>
                        
                        <div class="wishlist-card-price-wrapper">
                            <span class="wishlist-card-price">${formatPrice(product.price)}</span>
                            ${hasDiscount ? `<span class="wishlist-card-price-old">${formatPrice(product.originalPrice)}</span>` : ''}
                        </div>
                        
                        <div class="wishlist-card-added-date">Đã thêm ${formatDate(product.addedAt)}</div>
                        
                        <div class="wishlist-card-actions">
                            <button 
                                class="wishlist-card-add-to-cart" 
                                onclick="addToCartFromWishlist('${product.id}')"
                                ${!product.inStock ? 'disabled' : ''}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                                ${product.inStock ? 'Thêm giỏ' : 'Hết hàng'}
                            </button>
                            <a href="../shop/product-detail.html?id=${product.id}" class="wishlist-card-view-detail">
                                Chi tiết
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Global functions for onclick handlers
    window.removeFromWishlist = removeFromWishlist;
    
    window.addToCartFromWishlist = async function(productId) {
        const wishlistItems = await getWishlistItems();
        const product = wishlistItems.find(item => String(item.id) === String(productId));
        if (product) {
            addToCart(product);
        }
    };

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        renderWishlist();
    });

})();
