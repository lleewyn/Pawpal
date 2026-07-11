
document.addEventListener('DOMContentLoaded', function() {

        window._pageLoadStart = Date.now();
        var _loaderThreshold = 300; // ms
        var _loaderTimeout = setTimeout(function () {
            var loader = document.getElementById('cute-loader');
            if (loader) loader.style.display = 'flex';
        }, _loaderThreshold);
    
});

document.addEventListener('DOMContentLoaded', function() {

        //Ẩn ngay khi DOM sẵn sàng, hủy timer nếu tải đủ nhanh
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
            // Cập nhật tình trạng khả dụng trên màn hình chính
            function updateHeroAvailability() {
                const el = document.getElementById('heroAvailability');
                if (!el) return;

                const spaSlots = Math.floor(Math.random() * 5) + 1;
                const hotelRooms = Math.floor(Math.random() * 4) + 1;
                const now = new Date();
                const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

                el.innerHTML = `Hôm nay còn trống: <strong style="color:#ffffff; font-weight:700;">${spaSlots} slot Spa</strong> | <strong style="color:#ffffff; font-weight:700;">${hotelRooms} phòng Hotel</strong> <span style="opacity:0.6">(Cập nhật ${timeStr})</span>`;
            }

            // Cập nhật mức độ khẩn cấp ở Footer
            function updateCtaUrgency() {
                const el = document.getElementById('ctaUrgency');
                if (!el) return;

                const totalSlots = Math.floor(Math.random() * 8) + 3; // 3-10 slots
                el.innerHTML = `<span class="urgency-dot"></span><span>Hôm nay còn <strong>${totalSlots} slot</strong> trống — Đặt ngay!</span>`;
            }

            // Khởi tạo và tự động cập nhật
            updateHeroAvailability();
            updateCtaUrgency();
            setInterval(updateHeroAvailability, 300000); // 5 phút
            setInterval(updateCtaUrgency, 180000); // 3 phút

            // ── Service Featured Swap 
            (function initSvcSwap() {
                const featured   = document.getElementById('svcFeatured');
                const miniItems  = document.querySelectorAll('.svc-mini-item');
                if (!featured || !miniItems.length) return;

                function swapFeatured(el) {
                    const d = el.dataset;
                    if (!d.id || d.id === featured.dataset.id) return;

                    // Hiệu ứng ẩn đi
                    featured.style.transition = 'opacity 0.2s ease';
                    featured.style.opacity = '0';

                    setTimeout(function () {
                        // Cập nhật nội dung nổi bật
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

                        // Trạng thái active trên thẻ mini
                        miniItems.forEach(function(m) {
                            m.classList.remove('svc-active');
                            m.style.display = '';
                        });
                        el.classList.add('svc-active');

                        // Hiệu ứng hiện ra
                        featured.style.opacity = '1';
                    }, 200);
                }

                miniItems.forEach(function(item) {
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', function(e) {
                        // Chỉ đổi nội dung, không chuyển trang
                        e.preventDefault();
                        swapFeatured(item);
                    });
                });
            })();

        })();
    
});

        document.addEventListener('DOMContentLoaded', function () {
            console.log('--- DIAGNOSTICS START ---');
            console.log('Bootstrap available:', typeof bootstrap !== 'undefined');

            const carousel = document.getElementById('heroCarousel');
            if (carousel) {
                console.log('Found #heroCarousel element');

                // Theo dõi sự kiện chuyển đổi
                carousel.addEventListener('slide.bs.carousel', function (e) {
                    console.log('Carousel slide event triggered. Moving to index:', e.to);
                });

                // Kiểm tra ảnh bên trong carousel
                const images = carousel.querySelectorAll('img');
                console.log('Number of images in carousel:', images.length);
                images.forEach((img, i) => {
                    console.log(`Image ${i + 1} src:`, img.src);

                    // Kiểm tra nếu đã tải xong
                    if (img.complete) {
                        if (img.naturalWidth === 0) {
                            console.error(`Image ${i + 1} (${img.src}) failed to load (naturalWidth is 0)`);
                        } else {
                            console.log(`Image ${i + 1} loaded successfully`);
                        }
                    }

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
// Tải sản phẩm thật từ dữ liệu và hiển thị lên lưới sản phẩm  trang chủ
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
        toast.className = 'cart-toast';
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

    // Chờ DataLoader tải xong
    let attempts = 0;
    while (!window.DataLoader && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    if (!window.DataLoader) return;

    const products = await window.DataLoader.loadProducts();
    if (!products || !products.length) return;

    // Hiển thị 10 sản phẩm nổi bật
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
            <a href="${detailBase}?id=${p.id}" class="product-card-link">
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

    // Các tab lọc phụ
    document.querySelectorAll('.shop-sub-filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.shop-sub-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tag = btn.dataset.tag;

            let filtered;
            if (tag === 'all') {
                filtered = featured;
            } else {
                const catMap = { 
                    thucan: ['food','thucăn','thức ăn', 'thực phẩm'], 
                    phukien: ['accessory','phụkiện','đồdùng', 'đồ dùng'], 
                    vesinh: ['hygiene','vệsinh','chămsóc', 'vệ sinh'] 
                };
                const keys = catMap[tag] || [tag];
                filtered = products
                    .filter(p => p.stock > 0 && keys.some(k =>
                        (p.categoryName || p.category || '').toLowerCase().includes(k) ||
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

// ── Service Loading ──────────────────────────────────────────
(async function() {
    const svcGrid = document.getElementById('svcLandingGrid');
    const svcTabBar = document.getElementById('svcTabBar');
    if (!svcGrid || !window.DataLoader) return;

    let services = [];
    try {
        services = await window.DataLoader.loadServices();
    } catch(e) {
        console.error('Failed to load services', e);
        return;
    }
    if (!services || !services.length) return;

    const renderServices = (items) => {
        svcGrid.innerHTML = items.map(s => {
            const formattedPrice = Number(s.price).toLocaleString('vi-VN');
            const memberPrice = Math.round(Number(s.price) * 0.95).toLocaleString('vi-VN');
            const sanitizedName = s.name.replace(/&/g, 'và');
            const sanitizedDesc = s.description.replace(/&/g, 'và');

            return `
            <div class="svc-landing-card">
                <button class="svc-landing-wishlist-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                <div class="svc-landing-img-box">
                    <img src="${s.image || '/assets/images/services/placeholder.webp'}" alt="${sanitizedName}" loading="lazy" onerror="this.src='/assets/images/services/placeholder.webp'">
                </div>
                <div class="svc-landing-body">
                    <div class="svc-landing-header">
                        <span class="svc-landing-id">${s.serviceId || 'SVC'}</span>
                        <span class="svc-landing-rating">${Number(s.rating || 5.0).toFixed(1)} <span>(${s.reviewCount || 0})</span></span>
                    </div>
                    <h3 class="svc-landing-title">${sanitizedName}</h3>
                    <p class="svc-landing-desc">${sanitizedDesc}</p>
                    
                    <div class="svc-landing-meta">
                        ${s.petType || 'Tất cả'} &nbsp;&nbsp; ${s.weightClass || ''} &nbsp;&nbsp; ${s.duration || ''}
                    </div>
                    
                    <div class="svc-landing-price-row">
                        <div class="svc-landing-price">Từ ${formattedPrice}đ</div>
                        <button class="svc-landing-book-btn" onclick="window.location.href='/pages/services/booking/booking.html?service=${s.serviceId || s.id}'">Đặt lịch</button>
                    </div>
                    <div class="svc-landing-member-price">
                        TV Bạc: ${memberPrice}đ
                    </div>
                </div>
            </div>`;
        }).join('');
    };

    // Diverse mix for "All" tab
    const getMixedServices = () => {
        const spa = services.filter(s => s.category === 'spa').slice(0, 5);
        const hotel = services.filter(s => s.category === 'hotel').slice(0, 4);
        const taxi = services.filter(s => s.category === 'taxi').slice(0, 2);
        return [...spa, ...hotel, ...taxi];
    };

    // Initial render (mixed categories)
    renderServices(getMixedServices());

    // Tab filtering
    if (svcTabBar) {
        const tabs = svcTabBar.querySelectorAll('.shop-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const cat = tab.dataset.category;
                
                let filtered = services;
                if (cat === 'all') {
                    filtered = getMixedServices();
                } else if (cat === 'spa') {
                    filtered = services.filter(s => s.category === 'spa');
                } else if (cat === 'hotel') {
                    filtered = services.filter(s => s.category === 'hotel');
                } else if (cat === 'taxi') {
                    filtered = services.filter(s => s.category === 'taxi');
                }
                
                renderServices(filtered.slice(0, 10));
            });
        });
    }
})();
