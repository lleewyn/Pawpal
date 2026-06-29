
document.addEventListener('DOMContentLoaded', function() {

        window._pageLoadStart = Date.now();
        var _loaderThreshold = 300; // ms
        var _loaderTimeout = setTimeout(function () {
            var loader = document.getElementById('cute-loader');
            if (loader) loader.style.display = 'flex';
        }, _loaderThreshold);
    
});

document.addEventListener('DOMContentLoaded', function() {

        // Smart Loader: hide as soon as DOM is ready, cancel show-timer if fast enough
        (function () {
            function hideLoader() {
                clearTimeout(window._loaderTimeout);
                var loader = document.getElementById('cute-loader');
                if (!loader) return;
                if (loader.style.display === 'none') return; // Never shown, do nothing
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.3s ease';
                setTimeout(function () { loader.style.display = 'none'; }, 300);
            }
            if (document.readyState === 'complete') {
                hideLoader();
            } else {
                window.addEventListener('load', hideLoader);
            }
        })();
    
});

document.addEventListener('DOMContentLoaded', function() {

        (function () {
            // Update Hero Availability
            function updateHeroAvailability() {
                const el = document.getElementById('heroAvailability');
                if (!el) return;

                const spaSlots = Math.floor(Math.random() * 5) + 1;
                const hotelRooms = Math.floor(Math.random() * 4) + 1;
                const now = new Date();
                const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                el.innerHTML = `Hôm nay còn trống: <strong style="color:#ffffff; font-weight:700;">${spaSlots} slot Spa</strong> | <strong style="color:#ffffff; font-weight:700;">${hotelRooms} phòng Hotel</strong> <span style="opacity:0.6">(Cập nhật ${timeStr})</span>`;
            }

            // Update Footer CTA Urgency
            function updateCtaUrgency() {
                const el = document.getElementById('ctaUrgency');
                if (!el) return;

                const totalSlots = Math.floor(Math.random() * 8) + 3; // 3-10 slots
                el.innerHTML = `<span class="urgency-dot"></span><span>Hôm nay còn <strong>${totalSlots} slot</strong> trống — Đặt ngay!</span>`;
            }

            // Init và auto-update
            updateHeroAvailability();
            updateCtaUrgency();
            setInterval(updateHeroAvailability, 300000); // 5 phút
            setInterval(updateCtaUrgency, 180000); // 3 phút

            // ── Service Featured Swap ──────────────────────────────────────
            (function initSvcSwap() {
                const featured   = document.getElementById('svcFeatured');
                const miniItems  = document.querySelectorAll('.svc-mini-item');
                if (!featured || !miniItems.length) return;

                function swapFeatured(el) {
                    const d = el.dataset;
                    if (!d.id || d.id === featured.dataset.id) return;

                    // Animate out
                    featured.style.transition = 'opacity 0.2s ease';
                    featured.style.opacity = '0';

                    setTimeout(function () {
                        // Update featured content
                        document.getElementById('svcFeaturedImgEl').src = d.img;
                        document.getElementById('svcFeaturedImgEl').alt = d.title;
                        document.getElementById('svcFeaturedTitle').innerHTML = d.title;
                        document.getElementById('svcFeaturedDesc').textContent = d.desc;
                        document.getElementById('svcFeaturedPrice').textContent = d.price;
                        document.getElementById('svcFeaturedCta').textContent = d.cta;

                        var badge = document.getElementById('svcFeaturedBadge');
                        if (d.badge) {
                            badge.textContent = d.badge;
                            badge.style.display = '';
                        } else {
                            badge.style.display = 'none';
                        }

                        // Update href
                        featured.href = d.href || '#';
                        featured.dataset.id = d.id;

                        // Active state on mini cards — highlight the one now in stack that matches featured
                        miniItems.forEach(function(m) {
                            m.classList.remove('svc-active');
                            // Show all mini cards
                            m.style.display = '';
                        });
                        el.classList.add('svc-active');

                        // Animate in
                        featured.style.opacity = '1';
                    }, 200);
                }

                miniItems.forEach(function(item) {
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', function(e) {
                        // Only swap, don't navigate (navigation handled by featured card)
                        e.preventDefault();
                        swapFeatured(item);
                    });
                });
            })();
            // ─────────────────────────────────────────────────────────────────

        })();
    
});

        document.addEventListener('DOMContentLoaded', function () {
            console.log('--- DIAGNOSTICS START ---');
            console.log('Bootstrap available:', typeof bootstrap !== 'undefined');

            const carousel = document.getElementById('heroCarousel');
            if (carousel) {
                console.log('Found #heroCarousel element');

                // Track transition events
                carousel.addEventListener('slide.bs.carousel', function (e) {
                    console.log('Carousel slide event triggered. Moving to index:', e.to);
                });

                // Check images inside carousel
                const images = carousel.querySelectorAll('img');
                console.log('Number of images in carousel:', images.length);
                images.forEach((img, i) => {
                    console.log(`Image ${i + 1} src:`, img.src);

                    // Check if already loaded
                    if (img.complete) {
                        if (img.naturalWidth === 0) {
                            console.error(`Image ${i + 1} (${img.src}) failed to load (naturalWidth is 0)`);
                        } else {
                            console.log(`Image ${i + 1} loaded successfully`);
                        }
                    }

                    // Error listener
                    img.addEventListener('error', function () {
                        console.error(`Image ${i + 1} (${img.src}) failed to load`);
                    });
                    img.addEventListener('load', function () {
                        console.log(`Image ${i + 1} loaded successfully`);
                    });
                });
            } else {
                console.error('Could not find #heroCarousel element');
            }
            console.log('--- DIAGNOSTICS END ---');
        });
    


// ── Product Loading ──────────────────────────────────────────
// Load real products from sanpham.csv and render into landing grid
(async function() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    const cartKey = 'pawpal_cart';
    const cartPage = '/pages/shop/cart/cart.html';
    const checkoutPage = '/pages/shop/checkout/checkout.html?buynow=true';
    const getCart = () => JSON.parse(localStorage.getItem(cartKey) || '[]');
    const saveCart = (cart) => {
        localStorage.setItem(cartKey, JSON.stringify(cart));
        const currentUser = getCurrentWishlistUser();
        if (window.API && typeof window.API.saveUserCart === 'function') {
            window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, cart);
        }
    };
    const getQty = (item) => {
        const qty = Number(item?.quantity ?? item?.qty ?? 1);
        return Number.isFinite(qty) && qty > 0 ? qty : 1;
    };
    const showCartToast = (message) => {
        if (typeof window.showGlobalToast === 'function') {
            window.showGlobalToast('success', message);
            return;
        }
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'success');
            return;
        }
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            right: 24px;
            bottom: 24px;
            transform: translateY(8px);
            background: var(--color-success, #2d8a57);
            color: #fff;
            padding: 12px 20px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            z-index: 9999;
            box-shadow: 0 10px 24px rgba(0,0,0,0.18);
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.35s ease, transform 0.35s ease;
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            setTimeout(() => toast.remove(), 350);
        }, 2200);
    };
    const upsertCartItem = (cart, id, product, quantity = 1) => {
        const existing = cart.find(item => String(item.id) === String(id));
        if (existing) {
            existing.quantity = getQty(existing) + quantity;
            existing.qty = existing.quantity;
            Object.assign(existing, product);
        } else {
            cart.push({
                ...product,
                id,
                quantity,
                qty: quantity
            });
        }
        return cart;
    };
    const getCurrentWishlistUser = () => {
        try {
            return JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        } catch (error) {
            return null;
        }
    };
    const getWishlistKey = () => {
        const user = getCurrentWishlistUser();
        return user && user.phone ? `pawpal_wishlist_${user.phone}` : 'pawpal_wishlist_guest';
    };
    const getWishlist = () => {
        try {
            return JSON.parse(localStorage.getItem(getWishlistKey()) || '[]');
        } catch (error) {
            return [];
        }
    };
    const saveWishlist = (wishlist) => {
        const list = wishlist.map(String);
        localStorage.setItem(getWishlistKey(), JSON.stringify(list));
        const currentUser = getCurrentWishlistUser();
        if (window.API && typeof window.API.saveUserWishlist === 'function') {
            window.API.saveUserWishlist(currentUser?.id || currentUser?.phone || null, { productIds: list, serviceIds: [] });
        }
    };
    const toggleWishlist = (productId) => {
        const wishlist = getWishlist();
        const id = String(productId);
        const index = wishlist.indexOf(id);
        if (index >= 0) {
            wishlist.splice(index, 1);
        } else {
            wishlist.push(id);
        }
        saveWishlist(wishlist);
        return wishlist.includes(id);
    };
    const syncWishlistButtons = () => {
        const wishlist = getWishlist();
        grid.querySelectorAll('.product-wishlist-btn').forEach(btn => {
            btn.classList.toggle('active', wishlist.includes(String(btn.dataset.productId)));
        });
    };

    // Wait for DataLoader
    let attempts = 0;
    while (!window.DataLoader && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    if (!window.DataLoader) return;

    const products = await window.DataLoader.loadProducts();
    if (!products || !products.length) return;

    // Show 10 featured products (on sale / highest rated)
    const featured = products
        .filter(p => p.stock > 0)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 10);

    const detailBase = '/pages/shop/product-detail/product-detail.html';

    grid.innerHTML = featured.map(p => {
        const hasDiscount = p.originalPrice && p.originalPrice > p.price;
        const oldPrice = hasDiscount
            ? `<span class="price-old">${Number(p.originalPrice).toLocaleString('vi-VN')}đ</span>`
            : '';
        const stars = '★'.repeat(Math.round(p.rating || 5));
        const sold = p.soldCount ? `(${Number(p.soldCount).toLocaleString('vi-VN')} đã bán)` : '';

        return `
        <div class="product-card" data-product-id="${p.id}">
            <button class="product-wishlist-btn" data-product-id="${p.id}" aria-label="Thêm vào yêu thích">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
            </button>
            <a href="${detailBase}?id=${p.id}" class="product-card-link" style="text-decoration:none;color:inherit">
                <div class="product-image-box">
                    <img src="${p.image || '/assets/images/shop/products/placeholder.webp'}"
                        alt="${p.name}" loading="lazy"
                        onerror="this.src='/assets/images/shop/products/placeholder.webp'">
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <div class="product-meta">
                        <span class="rating-stars" style="color:#f59e0b">${stars}</span>
                        <span class="rating-score">${p.rating || '5.0'}</span>
                        <span class="sold-count">${sold}</span>
                    </div>
                    <div class="product-info-footer">
                        <div class="product-price">
                            <span class="price-current">${Number(p.price).toLocaleString('vi-VN')}đ</span>
                            ${oldPrice}
                        </div>
                    </div>
                </div>
            </a>
            <div class="product-card-actions">
                <button class="add-to-cart-btn" data-product-id="${p.id}"
                    aria-label="Thêm vào giỏ hàng">Thêm vào giỏ</button>
                <button class="buy-now-btn" data-product-id="${p.id}"
                    aria-label="Mua ngay">Mua ngay</button>
            </div>
        </div>`;
    }).join('');
    syncWishlistButtons();

    grid.addEventListener('click', (event) => {
        const wishlistBtn = event.target.closest('.product-wishlist-btn');
        const addBtn = event.target.closest('.add-to-cart-btn');
        const buyBtn = event.target.closest('.buy-now-btn');
        if (!wishlistBtn && !addBtn && !buyBtn) return;

        event.preventDefault();
        event.stopPropagation();

        if (wishlistBtn) {
            const active = toggleWishlist(wishlistBtn.dataset.productId);
            wishlistBtn.classList.toggle('active', active);
            return;
        }

        const btn = addBtn || buyBtn;
        const id = btn.dataset.productId;
        const product = products.find(item => String(item.id) === String(id));
        if (!product) return;

        if (buyBtn) {
            const buyNowCart = [{
                ...product,
                quantity: 1,
                qty: 1
            }];
            sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
            sessionStorage.setItem('pawpal_is_buynow', 'true');
            window.location.href = checkoutPage;
            return;
        }

        const cart = getCart();
        upsertCartItem(cart, id, product, 1);
        saveCart(cart);
        showCartToast(`Đã thêm ${product.name} vào giỏ hàng`);
        if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    });

    // Sub-filter tabs
    document.querySelectorAll('.shop-sub-filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.shop-sub-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tag = btn.dataset.tag;

            let filtered;
            if (tag === 'all') {
                filtered = featured;
            } else {
                const catMap = { thucan: ['food','thucăn','thức ăn'], phukien: ['accessory','phụkiện','đồdùng'], vesinh: ['hygiene','vệsinh','chămsóc'] };
                const keys = catMap[tag] || [tag];
                filtered = products
                    .filter(p => p.stock > 0 && keys.some(k =>
                        (p.category || '').toLowerCase().includes(k) ||
                        (p.tags || '').toLowerCase().includes(k)
                    ))
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                    .slice(0, 10);
                if (!filtered.length) filtered = featured.slice(0, 10);
            }

            grid.innerHTML = filtered.map(p => {
                const hasDiscount = p.originalPrice && p.originalPrice > p.price;
                const oldPrice = hasDiscount
                    ? `<span class="price-old">${Number(p.originalPrice).toLocaleString('vi-VN')}đ</span>`
                    : '';
                return `
                <div class="product-card" data-product-id="${p.id}">
                    <button class="product-wishlist-btn" data-product-id="${p.id}" aria-label="Thêm vào yêu thích">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                    <a href="${detailBase}?id=${p.id}" class="product-card-link" style="text-decoration:none;color:inherit">
                        <div class="product-image-box">
                            <img src="${p.image || '/assets/images/shop/products/placeholder.webp'}"
                                alt="${p.name}" loading="lazy"
                                onerror="this.src='/assets/images/shop/products/placeholder.webp'">
                        </div>
                        <div class="product-info">
                            <h3>${p.name}</h3>
                            <div class="product-info-footer">
                                <div class="product-price">
                                    <span class="price-current">${Number(p.price).toLocaleString('vi-VN')}đ</span>
                                    ${oldPrice}
                                </div>
                            </div>
                        </div>
                    </a>
                    <div class="product-card-actions">
                        <button class="add-to-cart-btn" data-product-id="${p.id}"
                            aria-label="Thêm vào giỏ hàng">Thêm vào giỏ</button>
                        <button class="buy-now-btn" data-product-id="${p.id}"
                            aria-label="Mua ngay">Mua ngay</button>
                    </div>
                </div>`;
            }).join('');
            syncWishlistButtons();

            grid.addEventListener('click', (event) => {
                const wishlistBtn = event.target.closest('.product-wishlist-btn');
                const addBtn = event.target.closest('.add-to-cart-btn');
                const buyBtn = event.target.closest('.buy-now-btn');
                if (!wishlistBtn && !addBtn && !buyBtn) return;

                event.preventDefault();
                event.stopPropagation();

                if (wishlistBtn) {
                    const active = toggleWishlist(wishlistBtn.dataset.productId);
                    wishlistBtn.classList.toggle('active', active);
                    return;
                }

                const btn = addBtn || buyBtn;
                const id = btn.dataset.productId;
                const product = products.find(item => String(item.id) === String(id));
                if (!product) return;

                if (buyBtn) {
                    const buyNowCart = [{
                        ...product,
                        quantity: 1,
                        qty: 1
                    }];
                    sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
                    sessionStorage.setItem('pawpal_is_buynow', 'true');
                    window.location.href = checkoutPage;
                    return;
                }

                const cart = getCart();
                upsertCartItem(cart, id, product, 1);
                saveCart(cart);
                showCartToast(`Đã thêm ${product.name} vào giỏ hàng`);
                if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
            });
        });
    });
})();
