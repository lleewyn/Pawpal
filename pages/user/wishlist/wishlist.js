// ==========================================================================
// wishlist.js - Wishlist Page Logic
// ==========================================================================

(function () {
    'use strict';

    let currentFilter = 'all';

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
        } catch {
            return null;
        }
    }

    function getProductWishlistStorageKey(user = getCurrentUser()) {
        return user && user.phone ? `pawpal_wishlist_${user.phone}` : 'pawpal_wishlist_guest';
    }

    function getServiceWishlistStorageKey(user = getCurrentUser()) {
        return user && user.phone ? `pawpal_wishlist_services_${user.phone}` : 'pawpal_wishlist_services_guest';
    }

    function loadWishlistRaw(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
            return [];
        }
    }

    function saveWishlistRaw(key, list) {
        localStorage.setItem(key, JSON.stringify(Array.isArray(list) ? list : []));
    }

    function formatPrice(price) {
        const numericPrice = Number(price) || 0;
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(numericPrice);
    }

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

    function showNotification(message) {
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
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2200);
    }

    async function getWishlistItems() {
        const currentUser = getCurrentUser();
        const serverWishlist = currentUser && window.API && typeof window.API.getUserWishlist === 'function'
            ? await window.API.getUserWishlist(currentUser.id || currentUser.phone || null)
            : { productIds: [], serviceIds: [] };

        const productIdsRaw = [
            ...(serverWishlist.productIds || []),
            ...loadWishlistRaw(getProductWishlistStorageKey()),
            ...loadWishlistRaw('pawpal_wishlist')
        ];
        const serviceIdsRaw = [
            ...(serverWishlist.serviceIds || []),
            ...loadWishlistRaw(getServiceWishlistStorageKey())
        ];

        // Lọc trùng
        const finalProductIds = [...new Set(productIdsRaw.map(String))];
        const finalServiceIds = [...new Set(serviceIdsRaw.map(String))];

        // Lưu lại local storage bản đã merge
        saveWishlistRaw(getProductWishlistStorageKey(), finalProductIds);
        saveWishlistRaw(getServiceWishlistStorageKey(), finalServiceIds);

        // Background sync lên server nếu có data mới ở local
        if (currentUser && window.API && typeof window.API.saveUserWishlist === 'function') {
            if (finalProductIds.length > (serverWishlist.productIds?.length || 0) ||
                finalServiceIds.length > (serverWishlist.serviceIds?.length || 0)) {
                window.API.saveUserWishlist(currentUser.id || currentUser.phone || null, {
                    productIds: finalProductIds,
                    serviceIds: finalServiceIds
                });
                localStorage.removeItem('pawpal_wishlist');
                localStorage.removeItem('pawpal_wishlist_services_guest');
            }
        }

        const allProducts = window.DataLoader && typeof window.DataLoader.loadProducts === 'function'
            ? await window.DataLoader.loadProducts()
            : [];
        const allServices = window.DataLoader && typeof window.DataLoader.loadServices === 'function'
            ? await window.DataLoader.loadServices()
            : [];

        const productRaw = finalProductIds;
        const serviceRaw = finalServiceIds;

        const seenProducts = new Set();
        const products = productRaw.map((item) => {
            const productId = typeof item === 'object' && item !== null ? Number(item.id) : Number(item);
            if (seenProducts.has(productId)) return null;
            seenProducts.add(productId);
            const product = allProducts.find((p) => p.id === productId);
            if (!product) return null;

            return {
                type: 'product',
                id: productId,
                uniqueId: `product-${productId}`,
                image: product.image || '/assets/images/shop/products/placeholder.webp',
                title: product.name,
                subtitle: product.brand || 'Sản phẩm',
                price: Number(product.price) || 0,
                originalPrice: Number(product.originalPrice || product.oldPrice || 0) || null,
                inStock: product.inStock !== false,
                addedAt: typeof item === 'object' && item?.addedAt ? item.addedAt : new Date().toISOString(),
                detailUrl: `../../shop/product-detail/product-detail.html?id=${productId}`,
                actionLabel: 'Thêm giỏ',
                actionType: 'cart',
                rawProduct: product
            };
        }).filter(Boolean);

        const seenServices = new Set();
        const services = serviceRaw.map((item) => {
            const serviceId = typeof item === 'object' && item !== null ? String(item.id || item.serviceId) : String(item);
            if (seenServices.has(serviceId)) return null;
            seenServices.add(serviceId);
            const service = allServices.find((s) => String(s.serviceId) === serviceId);
            if (!service) return null;

            return {
                type: 'service',
                id: serviceId,
                uniqueId: `service-${serviceId}`,
                image: service.image || '/assets/images/services/spa.png',
                title: service.name,
                subtitle: service.category === 'hotel' ? 'Khách sạn thú cưng' : service.category === 'taxi' ? 'Taxi thú cưng' : 'Spa và làm đẹp',
                price: Number(service.price) || 0,
                originalPrice: null,
                inStock: service.status === 'Đang phục vụ',
                addedAt: typeof item === 'object' && item?.addedAt ? item.addedAt : new Date().toISOString(),
                detailUrl: `../../services/service-detail/service-detail.html?id=${serviceId}`,
                actionLabel: 'Đặt lịch',
                actionType: 'booking',
                bookingUrl: `../../services/booking/booking.html?service=${serviceId}`
            };
        }).filter(Boolean);

        return [...products, ...services];
    }

    function removeFromWishlist(type, id) {
        const key = type === 'service' ? getServiceWishlistStorageKey() : getProductWishlistStorageKey();
        const rawWishlist = loadWishlistRaw(key);
        const filtered = rawWishlist.filter((item) => {
            if (typeof item === 'object' && item !== null) {
                const itemId = item.id ?? item.serviceId;
                return String(itemId) !== String(id);
            }
            return String(item) !== String(id);
        });
        saveWishlistRaw(key, filtered);
        const currentUser = getCurrentUser();
        if (currentUser && window.API && typeof window.API.saveUserWishlist === 'function') {
            const productIds = type === 'service'
                ? loadWishlistRaw(getProductWishlistStorageKey()).map(String)
                : filtered.map(String);
            const serviceIds = type === 'service'
                ? filtered.map(String)
                : loadWishlistRaw(getServiceWishlistStorageKey()).map(String);
            window.API.saveUserWishlist(currentUser.id || currentUser.phone || null, { productIds, serviceIds });
        }
        renderWishlist();
        showNotification('Đã xóa khỏi danh sách yêu thích');
    }

    function addProductToCart(product) {
        const user = getCurrentUser();
        if (!user) {
            showNotification('Vui lòng đăng nhập để thêm vào giỏ hàng');
            return;
        }

        const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
        const existing = cart.find((item) => Number(item.id) === Number(product.id));
        if (existing) existing.quantity += 1;
        else cart.push({ ...product.rawProduct, quantity: 1 });
        localStorage.setItem('pawpal_cart', JSON.stringify(cart));
        const currentUser = getCurrentUser();
        if (currentUser && window.API && typeof window.API.saveUserCart === 'function') {
            window.API.saveUserCart(currentUser.id || currentUser.phone || null, cart);
        }
        showNotification('Đã thêm vào giỏ hàng');
    }

    function bindTabs() {
        document.querySelectorAll('.wishlist-tab').forEach((tab) => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.wishlist-tab').forEach((item) => item.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.type || 'all';
                renderWishlist();
            });
        });
    }

    async function renderWishlist() {
        const items = await getWishlistItems();
        const filteredItems = currentFilter === 'all' ? items : items.filter((item) => item.type === currentFilter);
        const emptyState = document.getElementById('emptyWishlist');
        const grid = document.getElementById('wishlistGrid');
        const countSpan = document.getElementById('wishlistCount');

        if (countSpan) countSpan.textContent = String(items.length);

        if (!filteredItems.length) {
            emptyState.classList.remove('d-none');
            grid.classList.add('d-none');
            return;
        }

        emptyState.classList.add('d-none');
        grid.classList.remove('d-none');

        grid.innerHTML = filteredItems.map((item) => {
            const hasDiscount = item.originalPrice && item.originalPrice > item.price;
            const discountPercent = hasDiscount ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
            const typeLabel = item.type === 'service' ? 'Dịch vụ' : 'Sản phẩm';

            return `
                <div class="wishlist-card" data-type="${item.type}" data-id="${item.id}">
                    <div class="wishlist-card-image-wrapper">
                        <img src="${item.image}" alt="${item.title}" class="wishlist-card-image">
                        <button class="wishlist-card-remove" data-type="${item.type}" data-id="${item.id}" aria-label="Xóa khỏi yêu thích">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        ${hasDiscount ? `<span class="wishlist-card-sale-badge">-${discountPercent}%</span>` : ''}
                        ${!item.inStock ? `<div class="wishlist-card-out-of-stock">${item.type === 'service' ? 'Tạm dừng' : 'Hết hàng'}</div>` : ''}
                    </div>
                    <div class="wishlist-card-info">
                        <span class="wishlist-card-type">${typeLabel}</span>
                        <div class="wishlist-card-brand">${item.subtitle}</div>
                        <a href="${item.detailUrl}" class="wishlist-card-name">${item.title}</a>
                        <div class="wishlist-card-price-wrapper">
                            <span class="wishlist-card-price">${formatPrice(item.price)}</span>
                            ${hasDiscount ? `<span class="wishlist-card-price-old">${formatPrice(item.originalPrice)}</span>` : ''}
                        </div>
                        <div class="wishlist-card-added-date">Đã thêm ${formatDate(item.addedAt)}</div>
                        <div class="wishlist-card-actions">
                            ${item.type === 'product' ? `
                                <button class="wishlist-card-add-to-cart" data-action="cart" data-id="${item.id}" ${!item.inStock ? 'disabled' : ''}>
                                    ${item.inStock ? item.actionLabel : 'Hết hàng'}
                                </button>
                            ` : `
                                <a href="${item.bookingUrl}" class="wishlist-card-add-to-cart">${item.actionLabel}</a>
                            `}
                            <a href="${item.detailUrl}" class="wishlist-card-view-detail">Chi tiết</a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.wishlist-card-remove').forEach((button) => {
            button.addEventListener('click', () => removeFromWishlist(button.dataset.type || 'product', button.dataset.id || ''));
        });

        grid.querySelectorAll('[data-action="cart"]').forEach((button) => {
            button.addEventListener('click', () => {
                const product = filteredItems.find((item) => item.type === 'product' && String(item.id) === String(button.dataset.id));
                if (product) addProductToCart(product);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Đợi window.API sẵn sàng (api-global.js là module, có thể chạy sau)
        function runWhenReady() {
            if (window.API && window.DataLoader) {
                bindTabs();
                renderWishlist();
            } else {
                setTimeout(runWhenReady, 20);
            }
        }
        runWhenReady();
    });
})();
