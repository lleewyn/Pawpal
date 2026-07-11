function initApp() {
    console.log('[main.js] initApp');
    if (typeof initLookup === 'function') initLookup();
    if (typeof initPremiumMotion === 'function') initPremiumMotion();
    if (typeof initTimelineTracker === 'function') initTimelineTracker();
    if (typeof initBookingWidget === 'function') initBookingWidget();
    
    if (typeof initFaqAccordion === 'function') initFaqAccordion();
    if (typeof initShopFilter === 'function') initShopFilter();
    if (typeof initCuteEnhancements === 'function') initCuteEnhancements();
    if (typeof initDraggableServicesCarousel === 'function') initDraggableServicesCarousel();
    if (typeof initPetIdCardTilt === 'function') initPetIdCardTilt();
    if (typeof initTestimonialsCarousel === 'function') initTestimonialsCarousel();
    if (typeof initExpertsCarousel === 'function') initExpertsCarousel();
    if (typeof initInteractivePawPass === 'function') initInteractivePawPass();
    if (typeof initProcessTimeline === 'function') initProcessTimeline();
    if (typeof initServicesGrid === 'function') initServicesGrid();
    if (typeof initFab === 'function') initFab();
    
    if (typeof initActiveNav === 'function') setTimeout(initActiveNav, 50);
    if (typeof initMobileNavigation === 'function') setTimeout(initMobileNavigation, 50);
}

document.addEventListener('headerInjected', function () {
    initActiveNav();
    initMobileNavigation();

    document.querySelectorAll('.nav-item.dropdown > .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (window.innerWidth >= 1250 && this.href && !this.href.endsWith('#')) {
                window.location.href = this.href;
            }
        });
    });
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initSharedComponents() {
    const depth = window.location.pathname
        .split('/')
        .filter(Boolean).length;
    const root = depth <= 1 ? './' : '../'.repeat(depth - 1);
    const script = document.createElement('script');
    script.src = root + 'scripts/shared/components.js';
    script.defer = true;
    document.head.appendChild(script);
}

function initActiveNav() {
    const nav = document.getElementById('primaryNavigation');
    if (!nav) return;

    const currentPath = window.location.pathname.toLowerCase();

    const navList = nav.querySelector('ul.navbar-nav');
    if (!navList) return;

    const links = navList.querySelectorAll('a.nav-link');

    links.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
        link.style.color = '';
        link.style.fontWeight = '';
    });

    if (currentPath.includes('/pages/user/') || currentPath.includes('/user/')) {
        return;
    }

    let matched = null;

    if (currentPath === '/' || currentPath.includes('index.html') || currentPath.includes('landing.html')) {
        matched = navList.querySelector('a.nav-link[href*="landing.html"]');
    } else if (
        currentPath.includes('/services/') ||
        currentPath.includes('services.html') ||
        currentPath.includes('service-detail') ||
        currentPath.includes('/booking/') ||
        currentPath.includes('booking.html')
    ) {
        matched = navList.querySelector('a.nav-link[href*="services.html"]');
    } else if (
        currentPath.includes('/pages/shop/shop.html') ||
        currentPath.includes('product-detail') ||
        currentPath.includes('/pages/shop/product')
    ) {
        matched = navList.querySelector('a.nav-link[href*="shop.html"]');
    } else if (currentPath.includes('blog') || currentPath.includes('cam-nang')) {
        matched = navList.querySelector('a.nav-link[href*="blog.html"]');
    } else if (currentPath.includes('contact') || currentPath.includes('lien-he')) {
        matched = navList.querySelector('a.nav-link[href*="contact.html"]');
    } else if (currentPath.includes('about') || currentPath.includes('ve-chung-toi')) {
        matched = navList.querySelector('a.nav-link[href*="about.html"]');
    }

    if (matched) {
        matched.classList.add('active');
        matched.setAttribute('aria-current', 'page');
        matched.style.color = 'var(--color-accent)';
        matched.style.fontWeight = '700';
    }
}

function initMobileNavigation() {
    const toggleBtn = document.getElementById('mobileNavToggle');
    const nav = document.getElementById('primaryNavigation');
    if (!toggleBtn || !nav) return;

    if (toggleBtn.dataset.mobileNavReady === 'true' && nav.dataset.mobileNavReady === 'true') {
        return;
    }

    let mobileOverlay = null;
    let scrollLockY = 0;
    function createOverlay() {
        if (mobileOverlay) return;
        mobileOverlay = document.createElement('div');
        mobileOverlay.className = 'mobile-nav-overlay';
        mobileOverlay.style.position = 'fixed';
        mobileOverlay.style.inset = '0';
        mobileOverlay.style.background = 'rgba(0,0,0,0.35)';
        mobileOverlay.style.zIndex = '1099';
        mobileOverlay.style.opacity = '0';
        mobileOverlay.style.transition = 'opacity 220ms ease';
        document.body.appendChild(mobileOverlay);
        mobileOverlay.addEventListener('click', closeDrawer);
        requestAnimationFrame(() => mobileOverlay.style.opacity = '1');
    }

    function removeOverlay() {
        if (!mobileOverlay) return;
        mobileOverlay.style.opacity = '0';
        setTimeout(() => {
            if (mobileOverlay && mobileOverlay.parentNode) mobileOverlay.parentNode.removeChild(mobileOverlay);
            mobileOverlay = null;
        }, 240);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });

    let wasMobile = window.innerWidth < 1250;
    window.addEventListener('resize', () => {
        const isMobile = window.innerWidth < 1250;
        if (isMobile !== wasMobile) {
            closeDrawer();
        }
        wasMobile = isMobile;
    });

    nav.classList.remove('show');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    nav.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
    nav.querySelectorAll('.dropdown-toggle').forEach(dt => {
        dt.setAttribute('aria-expanded', 'false');
        const svg = dt.querySelector('svg');
        if (svg) svg.style.transform = 'rotate(0deg)';
    });

    function openDrawer() {
        scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
        nav.classList.add('show');
        toggleBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        createOverlay();
        nav.querySelectorAll('.dropdown-toggle svg').forEach(svg => svg.style.transform = 'rotate(0deg)');
    }

    function closeDrawer() {
        nav.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        removeOverlay();
        nav.querySelectorAll('.dropdown-toggle svg').forEach(svg => svg.style.transform = 'rotate(0deg)');
    }

    toggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = nav.classList.contains('show');
        if (isOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    };

    nav.querySelectorAll('a').forEach(link => {
        if (!link.classList.contains('dropdown-toggle') && link.dataset.mobileNavCloseBound !== 'true') {
            link.addEventListener('click', closeDrawer);
            link.dataset.mobileNavCloseBound = 'true';
        }
    });

    const dropdownToggles = nav.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(dt => {
        if (dt.dataset.mobileDropdownBound === 'true') return;
        
        dt.addEventListener('click', (e) => {
            setTimeout(() => {
                const expanded = dt.classList.contains('show');
                const svg = dt.querySelector('svg');
                if (svg) svg.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
            }, 50);
        });
        
        dt.dataset.mobileDropdownBound = 'true';
    });

    toggleBtn.dataset.mobileNavReady = 'true';
    nav.dataset.mobileNavReady = 'true';
}

function initTimelineTracker() {
    const indicators = document.querySelectorAll('.timeline-indicator-item');
    const phoneCards = document.querySelectorAll('.phone-timeline-card');
    const phoneScreen = document.querySelector('.phone-screen');
    
    if (indicators.length === 0 || phoneCards.length === 0) return;

    let activeIndex = 0;
    let autoPlayInterval;

    function setActiveStep(index) {
        indicators.forEach(ind => ind.classList.remove('active'));
        indicators[index].classList.add('active');

        phoneCards.forEach((card, i) => {
            if (i === index) {
                card.classList.add('active');
                
                if (phoneScreen) {
                    const containerRect = phoneScreen.getBoundingClientRect();
                    const cardRect = card.getBoundingClientRect();
                    const scrollTarget = cardRect.top - containerRect.top + phoneScreen.scrollTop - (containerRect.height / 2) + (cardRect.height / 2);
                    
                    phoneScreen.scrollTo({
                        top: scrollTarget,
                        behavior: 'smooth'
                    });
                }
            } else {
                card.classList.remove('active');
            }
        });

        activeIndex = index;
    }

    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            clearInterval(autoPlayInterval);
            setActiveStep(index);
        });
    });

    setActiveStep(0);
}

function initBookingWidget() {
    const bookingWidget = document.getElementById('booking');
    const triggerButtons = document.querySelectorAll('a[href="#booking"]');
    const closeBtn = document.getElementById('closeBookingBtn');
    const overlay = document.getElementById('bookingOverlay');

    if (!bookingWidget || triggerButtons.length === 0) return;

    triggerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            bookingWidget.classList.add('open');
            
            const firstInput = bookingWidget.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 150);
            }
        });
    });

    const closeModal = () => {
        bookingWidget.classList.remove('open');
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && bookingWidget.classList.contains('open')) {
            closeModal();
        }
    });
}

function initPricingModal() {
    const pricingModal = document.getElementById('pricingModal');
    const openBtn = document.getElementById('openPricingBtn');
    const closeBtn = document.getElementById('closePricingBtn');
    const overlay = document.getElementById('pricingOverlay');
    const pricingBookBtn = document.getElementById('pricingBookBtn');
    const bookingWidget = document.getElementById('booking');

    if (!pricingModal || !openBtn) return;

    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        pricingModal.classList.add('open');
    });

    const closePricing = () => {
        pricingModal.classList.remove('open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closePricing);
    if (overlay) overlay.addEventListener('click', closePricing);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pricingModal.classList.contains('open')) {
            closePricing();
        }
    });

    if (pricingBookBtn && bookingWidget) {
        pricingBookBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePricing();
            
            bookingWidget.classList.add('open');
            const firstInput = bookingWidget.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 150);
            }
        });
    }

    const tabButtons = pricingModal.querySelectorAll('.pricing-tab-btn');
    const tabContents = pricingModal.querySelectorAll('.pricing-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                if (content.id === targetTabId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}

function initFaqAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            if (!item) return;
            
            const answer = item.querySelector('.faq-answer');
            const isOpen = item.classList.contains('active');

            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq-answer');
                    if (otherAnswer) {
                        otherAnswer.style.maxHeight = '0';
                    }
                    const otherBtn = otherItem.querySelector('.faq-question');
                    if (otherBtn) {
                        otherBtn.setAttribute('aria-expanded', 'false');
                    }
                }
            });

            if (isOpen) {
                answer.style.maxHeight = '0';
                item.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function initShopFilter() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (window.DataLoader && typeof window.DataLoader.loadProducts === 'function') {
        window.DataLoader.loadProducts().then(allProducts => {
            grid.innerHTML = allProducts.map(product => {
                let mappedCategory = '';
                if (['food-dry', 'food-wet', 'bones'].includes(product.category)) mappedCategory = 'thucan';
                else if (['hygiene', 'grooming', 'health'].includes(product.category)) mappedCategory = 'vesinh';
                else mappedCategory = 'phukien'; // toys, clothes, bowls, accessories, furniture, other

                let marketingTags = [];
                if (product.badge === 'new') marketingTags.push('hangmoi');
                if (product.badge === 'best') marketingTags.push('banchay');
                if (product.sale || product.badge === 'hot') marketingTags.push('khuyenmai');

                const formattedPrice = product.price.toLocaleString('vi-VN') + 'đ';
                const formattedOldPrice = product.originalPrice > product.price ? product.originalPrice.toLocaleString('vi-VN') + 'đ' : '';
                
                const imgSrc = product.image.startsWith('http') ? product.image : `../../${product.image}`;

                return `
                    <div class="product-card" data-category="${mappedCategory}" data-marketing="${marketingTags.join(' ')}" data-product-id="${product.id}">
                        <a href="/pages/shop/product-detail/product-detail.html?id=${product.id}" class="product-card-link">
                            <div class="product-image-box">
                                <img src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.src='../../assets/images/shop/products/placeholder.webp'">
                            </div>
                            <div class="product-info">
                                <h3>${product.name}</h3>
                                <div class="product-meta">
                                    <span class="rating-stars"></span> <span class="rating-score">${product.rating}</span> <span class="sold-count">(${product.reviewCount} đã bán)</span>
                                </div>
                                <div class="product-info-footer">
                                    <div class="product-price">
                                        <span class="price-current">${formattedPrice}</span>
                                        ${formattedOldPrice ? `<span class="price-old">${formattedOldPrice}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        </a>
                        <div class="product-card-actions">
                            <button class="product-wishlist-btn" data-product-id="${product.id}" aria-label="Thêm vào yêu thích">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            <button class="product-quick-add" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''} aria-label="Thêm vào giỏ">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="9" cy="21" r="1"></circle>
                                    <circle cx="20" cy="21" r="1"></circle>
                                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                </svg>
                            </button>
                            <button class="product-buy-now" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>Mua ngay</button>
                        </div>
                    </div>
                `;
            }).join('');

            setupShopLandingActions(grid);

            setupFilterInteractions();
        }).catch(err => {
            console.error('Error loading products for landing:', err);
            setupFilterInteractions();
        });
    } else {
        setupFilterInteractions();
    }
}

function setupShopLandingActions(grid) {
    const rootPath = window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../';

    function getCart() { return JSON.parse(localStorage.getItem('pawpal_cart') || '[]'); }
    function saveCart(cart) { 
        if (window.saveCart) {
            window.saveCart(cart);
        } else {
            localStorage.setItem('pawpal_cart', JSON.stringify(cart));
            if (window.updateCartBadge) window.updateCartBadge();
        }
    }

    function getWishlistStorageKey() {
        const user = getCurrentWishlistUser();
        return user && user.phone ? `pawpal_wishlist_${user.phone}` : 'pawpal_wishlist_guest';
    }
    function getWishlist() {
        const current = JSON.parse(localStorage.getItem(getWishlistStorageKey()) || '[]');
        const legacy = JSON.parse(localStorage.getItem('pawpal_wishlist') || '[]');
        const merged = [...new Set([...(Array.isArray(current) ? current : []), ...(Array.isArray(legacy) ? legacy : [])].map(String))];
        if (legacy.length) {
            localStorage.setItem(getWishlistStorageKey(), JSON.stringify(merged));
            localStorage.removeItem('pawpal_wishlist');
        }
        return merged;
    }
    function saveWishlist(wl) { localStorage.setItem(getWishlistStorageKey(), JSON.stringify(wl.map(String))); }

    function miniToast(msg, type) {
        if (typeof window.showGlobalToast === 'function') { window.showGlobalToast(type || 'success', msg); return; }
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;right:24px;bottom:24px;background:#2d5343;color:#fff;padding:10px 20px;border-radius:99px;font-size:14px;z-index:9999;pointer-events:none;opacity:1;transition:opacity 0.4s';
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2000);
    }

    grid.querySelectorAll('.product-wishlist-btn').forEach(btn => {
        const id = btn.dataset.productId;
        const wl = getWishlist();
        if (wl.includes(id)) btn.classList.add('active');

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const wl = getWishlist();
            const idx = wl.indexOf(id);
            if (idx === -1) {
                wl.push(id);
                btn.classList.add('active');
                miniToast('Đã thêm vào yêu thích ❤️');
            } else {
                wl.splice(idx, 1);
                btn.classList.remove('active');
                miniToast('Đã bỏ khỏi yêu thích');
            }
            saveWishlist(wl);
        });
    });

    grid.querySelectorAll('.product-quick-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.dataset.productId;
            const cart = getCart();
            const existing = cart.find(i => i.id === id);
            if (existing) { existing.qty = (existing.qty || 1) + 1; }
            else { cart.push({ id, qty: 1 }); }
            saveCart(cart);
            const badge = document.querySelector('.cart-count');
            if (badge) badge.textContent = cart.reduce((s, i) => s + (i.qty || 1), 0);
            miniToast('Đã thêm vào giỏ hàng 🛒');
        });
    });

    grid.querySelectorAll('.product-buy-now').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.dataset.productId;
            const cart = getCart();
            const existing = cart.find(i => i.id === id);
            if (existing) { existing.qty = (existing.qty || 1) + 1; }
            else { cart.push({ id, qty: 1 }); }
            saveCart(cart);
            window.location.href = rootPath + 'pages/shop/cart/cart.html';
        });
    });
}

function getCurrentWishlistUser() {
    try {
        return JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    } catch {
        return null;
    }
}

function requireWishlistUser() {
    const user = getCurrentWishlistUser();
    if (!user) {
        miniToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích', 'warning');
        return null;
    }
    return user;
}

function getServiceWishlistStorageKey(user = getCurrentWishlistUser()) {
    return user && user.phone ? `pawpal_wishlist_services_${user.phone}` : 'pawpal_wishlist_services';
}

function loadServiceWishlistIds() {
    try {
        return JSON.parse(localStorage.getItem(getServiceWishlistStorageKey()) || '[]').map(String);
    } catch {
        return [];
    }
}

function saveServiceWishlistIds(ids) {
    localStorage.setItem(getServiceWishlistStorageKey(), JSON.stringify(ids.map(String)));
}

function setupLandingServiceWishlist(grid) {
    function miniToast(msg, type) {
        if (typeof window.showGlobalToast === 'function') {
            window.showGlobalToast(type || 'success', msg);
            return;
        }
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;right:24px;bottom:24px;background:#2d5343;color:#fff;padding:10px 20px;border-radius:99px;font-size:14px;z-index:9999;pointer-events:none;opacity:1;transition:opacity 0.4s';
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2000);
    }

    grid.querySelectorAll('.svc-wishlist-btn').forEach((btn) => {
        btn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!requireWishlistUser()) return;
            const serviceId = String(btn.dataset.serviceId || '');
            const current = loadServiceWishlistIds();
            const exists = current.includes(serviceId);
            const next = exists ? current.filter((id) => id !== serviceId) : [...current, serviceId];
            saveServiceWishlistIds(next);
            btn.classList.toggle('active', !exists);
            miniToast(!exists ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích');
        });
    });
}
function setupFilterInteractions() {
    const mainTabBtns = document.querySelectorAll('.shop-tab-bar .shop-tab-btn');
    const subFilterBtns = document.querySelectorAll('.shop-sub-filters .shop-sub-filter-btn');
    const products = document.querySelectorAll('#productGrid .product-card');

    if (products.length === 0) return;

    let activeMarketingStatus = 'all'; // default to all on page load
    let activeCategory = 'all';        // default to all on page load

    function applyFilter() {
        let count = 0;
        const maxItems = 10;
        products.forEach(product => {
            const productCategory = product.getAttribute('data-category') || '';
            const productMarketing = product.getAttribute('data-marketing') || '';
            const marketingList = productMarketing.split(/\s+/);

            const matchesCategory = (activeCategory === 'all' || productCategory === activeCategory);
            const matchesMarketing = (activeMarketingStatus === 'all' || marketingList.includes(activeMarketingStatus));

            if (matchesCategory && matchesMarketing && count < maxItems) {
                product.style.display = 'flex';
                setTimeout(() => {
                    product.style.opacity = '1';
                    product.style.transform = 'translateY(0) scale(1)';
                }, 20);
                count++;
            } else {
                product.style.opacity = '0';
                product.style.transform = 'translateY(10px) scale(0.95)';
                setTimeout(() => {
                    if (product.style.opacity === '0') {
                        product.style.display = 'none';
                    }
                }, 300);
            }
        });
    }

    mainTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isAlreadyActive = btn.classList.contains('active');
            
            mainTabBtns.forEach(b => b.classList.remove('active'));
            
            if (isAlreadyActive) {
                activeMarketingStatus = 'all';
            } else {
                btn.classList.add('active');
                activeMarketingStatus = btn.getAttribute('data-tab');
            }
            applyFilter();
        });
    });

    subFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isAlreadyActive = btn.classList.contains('active');
            
            subFilterBtns.forEach(b => b.classList.remove('active'));
            
            if (isAlreadyActive) {
                activeCategory = 'all';
            } else {
                btn.classList.add('active');
                activeCategory = btn.getAttribute('data-tag');
            }
            applyFilter();
        });
    });

    applyFilter();
}

function initCuteEnhancements() {
    window.addEventListener('load', () => {
        const loader = document.getElementById('cute-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600); // wait for fade out transition
        }
    });

    let idleTimer;
    const ctaBtns = document.querySelectorAll('.btn-cta');
    
    if (ctaBtns.length === 0) return;

    const resetIdleTimer = () => {
        ctaBtns.forEach(btn => btn.classList.remove('wiggle'));
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            ctaBtns.forEach(btn => btn.classList.add('wiggle'));
        }, 3000);
    };

    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();
}

function initDraggableServicesCarousel() {
    const wrappers = document.querySelectorAll('.services-arched-wrapper');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    
    if (wrappers.length === 0) return;

    wrappers.forEach(wrapper => {
        const cards = wrapper.querySelectorAll('.arched-card');
        if (cards.length === 0) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            wrapper.classList.add('is-scrolling');
            wrapper.style.cursor = 'grabbing';
            wrapper.style.scrollSnapType = 'none'; // Vô hiệu hóa snap khi đang kéo
            wrapper.style.scrollBehavior = 'auto'; // Instant response during drag
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
        });

        const endDrag = () => {
            if (!isDown) return;
            isDown = false;
            wrapper.classList.remove('is-scrolling');
            wrapper.style.cursor = 'grab';
            wrapper.style.scrollBehavior = 'smooth';
            wrapper.style.scrollSnapType = 'x mandatory'; // Kích hoạt lại snap sau khi nhả chuột
        };

        wrapper.addEventListener('mouseleave', endDrag);
        wrapper.addEventListener('mouseup', endDrag);

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 1.5; // Scroll speed multiplier
            wrapper.scrollLeft = scrollLeft - walk;
        });

        wrapper.addEventListener('touchstart', (e) => {
            isDown = true;
            wrapper.style.scrollSnapType = 'none';
            wrapper.style.scrollBehavior = 'auto';
            startX = e.touches[0].pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDown = false;
            wrapper.style.scrollBehavior = 'smooth';
            wrapper.style.scrollSnapType = 'x mandatory';
        });
    });

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            wrappers.forEach(wrapper => {
                wrapper.style.scrollBehavior = 'smooth';
                const card = wrapper.querySelector('.arched-card');
                const cardWidth = card ? card.offsetWidth + 30 : 320; // card width + gap
                wrapper.scrollLeft -= cardWidth; 
            });
        });

        nextBtn.addEventListener('click', () => {
            wrappers.forEach(wrapper => {
                wrapper.style.scrollBehavior = 'smooth';
                const card = wrapper.querySelector('.arched-card');
                const cardWidth = card ? card.offsetWidth + 30 : 320;
                wrapper.scrollLeft += cardWidth; 
            });
        });
    }
}

function initPetIdCardTilt() {
    const card = document.getElementById('petPassportCard');
    if (!card) return;

    card.addEventListener('mousemove', (e) => {
        const cardRect = card.getBoundingClientRect();
        const cardWidth = cardRect.width;
        const cardHeight = cardRect.height;
        
        const centerX = cardRect.left + cardWidth / 2;
        const centerY = cardRect.top + cardHeight / 2;
        
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        
        const rotateX = -12 * (mouseY / (cardHeight / 2));
        const rotateY = 12 * (mouseX / (cardWidth / 2));
        
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
    });
}

function initTestimonialsCarousel() {
    const track = document.querySelector('.testimonials-carousel-track');
    const cards = document.querySelectorAll('.testimonials-carousel-track .testimonial-card');
    const prevBtn = document.querySelector('.testimonials-carousel-container .prev-btn');
    const nextBtn = document.querySelector('.testimonials-carousel-container .next-btn');

    if (!track || cards.length === 0 || !prevBtn || !nextBtn) return;

    const cardWidth = 320;
    const gap = 30;
    const step = cardWidth + gap;
    const wrapper = document.querySelector('.testimonials-carousel-wrapper');
    
    const totalCards = cards.length;

    cards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
    });
    for (let i = totalCards - 1; i >= 0; i--) {
        const clone = cards[i].cloneNode(true);
        track.insertBefore(clone, track.firstChild);
    }

    const allCards = track.querySelectorAll('.testimonial-card');
    
    let positionIndex = totalCards;

    function updateSlider(instant = false) {
        track.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
        
        const wrapperWidth = wrapper.offsetWidth;
        const offset = - (positionIndex * step) + (wrapperWidth / 2) - (cardWidth / 2);
        
        track.style.transform = `translateX(${offset}px)`;

        allCards.forEach((card, idx) => {
            if (idx === positionIndex) {
                card.classList.add('active-center');
            } else {
                card.classList.remove('active-center');
            }
        });
    }

    let isTransitioning = false;

    function handleNext() {
        if (isTransitioning) return;
        isTransitioning = true;
        positionIndex++;
        updateSlider();

        setTimeout(() => {
            if (positionIndex >= totalCards * 2) {
                positionIndex = totalCards;
                updateSlider(true);
            }
            isTransitioning = false;
        }, 500);
    }

    function handlePrev() {
        if (isTransitioning) return;
        isTransitioning = true;
        positionIndex--;
        updateSlider();

        setTimeout(() => {
            if (positionIndex < totalCards) {
                positionIndex = totalCards * 2 - 1;
                updateSlider(true);
            }
            isTransitioning = false;
        }, 500);
    }

    nextBtn.addEventListener('click', handleNext);
    prevBtn.addEventListener('click', handlePrev);

    updateSlider(true);

    window.addEventListener('resize', () => {
        updateSlider(true);
    });
}

function initExpertsCarousel() {
    const track = document.querySelector('.experts-carousel-track');
    const cards = document.querySelectorAll('.experts-carousel-track .expert-card');
    const prevBtn = document.querySelector('.experts-carousel-container .prev-btn');
    const nextBtn = document.querySelector('.experts-carousel-container .next-btn');

    if (!track || cards.length === 0 || !prevBtn || !nextBtn) return;

    const cardWidth = 300;
    const gap = 30;
    const step = cardWidth + gap;
    const wrapper = document.querySelector('.experts-carousel-wrapper');

    const totalCards = cards.length;

    cards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
    });
    for (let i = totalCards - 1; i >= 0; i--) {
        const clone = cards[i].cloneNode(true);
        track.insertBefore(clone, track.firstChild);
    }

    const allCards = track.querySelectorAll('.expert-card');
    let positionIndex = totalCards;

    function updateSlider(instant = false) {
        track.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
        
        const wrapperWidth = wrapper.offsetWidth;
        const offset = - (positionIndex * step) + (wrapperWidth / 2) - (cardWidth / 2);
        
        track.style.transform = `translateX(${offset}px)`;

        allCards.forEach((card, idx) => {
            if (idx === positionIndex) {
                card.classList.add('highlighted-expert');
            } else {
                card.classList.remove('highlighted-expert');
            }
        });
    }

    let isTransitioning = false;

    function handleNext() {
        if (isTransitioning) return;
        isTransitioning = true;
        positionIndex++;
        updateSlider();

        setTimeout(() => {
            if (positionIndex >= totalCards * 2) {
                positionIndex = totalCards;
                updateSlider(true);
            }
            isTransitioning = false;
        }, 500);
    }

    function handlePrev() {
        if (isTransitioning) return;
        isTransitioning = true;
        positionIndex--;
        updateSlider();

        setTimeout(() => {
            if (positionIndex < totalCards) {
                positionIndex = totalCards * 2 - 1;
                updateSlider(true);
            }
            isTransitioning = false;
        }, 500);
    }

    nextBtn.addEventListener('click', handleNext);
    prevBtn.addEventListener('click', handlePrev);

    updateSlider(true);

    window.addEventListener('resize', () => {
        updateSlider(true);
    });
}

function initPremiumMotion() {
    if (typeof Lenis === 'undefined') {
        console.warn('Lenis is not loaded — skipping smooth scroll.');
    }

    let lenis = null;
    if (typeof Lenis !== 'undefined') {
        try {
            lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                wheelMultiplier: 1,
                touchMultiplier: 2,
            });

            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        } catch (e) {
            console.warn('Lenis init failed:', e);
            lenis = null;
        }
    }

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('GSAP or ScrollTrigger is not loaded — skipping animations.');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    document.documentElement.classList.add('gsap-ready');

    if (lenis) {
        lenis.on('scroll', () => {
            ScrollTrigger.update();
        });
    }

    const heroTl = gsap.timeline({
        onComplete: () => {
            document.documentElement.classList.add('hero-animated');
        }
    });
    
    if (document.querySelector('.hero-title')) {
        heroTl.from('.hero-title', {
            opacity: 0,
            y: 45,
            duration: 1.2,
            ease: 'power4.out',
            clearProps: 'all',
        });
    }
    
    if (document.querySelector('.hero-description-box')) {
        heroTl.from('.hero-description-box', {
            opacity: 0,
            y: 30,
            duration: 1.0,
            ease: 'power4.out',
            clearProps: 'all',
        }, '-=0.9');
    }
    
    if (document.querySelector('.hero-cta-container')) {
        heroTl.from('.hero-cta-container', {
            opacity: 0,
            y: 30,
            duration: 1.0,
            ease: 'power4.out',
            clearProps: 'all',
        }, '-=0.8');
    }

    gsap.utils.toArray('.section-header').forEach((header) => {
        gsap.from(header, {
            scrollTrigger: {
                trigger: header,
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 35,
            duration: 1.0,
            ease: 'power3.out',
            clearProps: "all"
        });
    });

    if (document.querySelector('.feature-item')) {
        gsap.from('.feature-item', {
            scrollTrigger: {
                trigger: '.features-section',
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 40,
            stagger: 0.15,
            duration: 1.0,
            ease: 'power3.out',
            clearProps: "all"
        });
    }

    if (document.querySelector('.arched-card')) {
        gsap.from('.arched-card', {
            scrollTrigger: {
                trigger: '.services-section',
                start: 'top 85%', // Changed from 80% to be consistent with others
                toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 40, // Changed from x: 50 to avoid flex overflow bug
            stagger: 0.1,
            duration: 1.0,
            ease: 'power3.out',
            clearProps: "all" // Ensure inline styles are cleared after animation to prevent layout bugs
        });
    }

    if (document.querySelector('.safety-card')) {
        gsap.from('.safety-card', {
            scrollTrigger: {
                trigger: '.safety-section',
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 40,
            stagger: 0.15,
            duration: 1.0,
            ease: 'power3.out',
            clearProps: "all"
        });
    }

    if (document.querySelector('.experts-carousel-container')) {
        gsap.from('.experts-carousel-container', {
            scrollTrigger: {
                trigger: '.experts-section',
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            opacity: 0,
            y: 50,
            duration: 1.2,
            ease: 'power4.out',
            clearProps: "all"
        });
    }

    if (document.querySelector('.step-card')) {
        gsap.from('.step-card', {
            scrollTrigger: {
                trigger: '.process-section',
                start: 'top 85%',
                toggleActions: 'play none none none',
            },
            opacity: 0,
            scale: 0.95,
            y: 30,
            stagger: 0.15,
            duration: 1.0,
            ease: 'back.out(1.4)',
            clearProps: "all"
        });
    }

    const guardians = document.querySelectorAll('.safety-guardian');
    guardians.forEach(guardian => {
        guardian.style.cursor = 'grab';
        
        const img = guardian.querySelector('img');
        if (img) {
            img.addEventListener('dragstart', (e) => e.preventDefault());
        }

        guardian.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            
            guardian.style.cursor = 'grabbing';
            const originalTransition = guardian.style.transition;
            const originalAnimation = guardian.style.animation;
            
            guardian.style.transition = 'none';
            guardian.style.animation = 'none'; // Stop floating animation entirely when grabbed
            
            const parent = guardian.offsetParent || guardian.parentElement;
            const parentRect = parent.getBoundingClientRect();
            
            const section = document.querySelector('.safety-section');
            const sectionRect = section.getBoundingClientRect();
            
            const guardianRect = guardian.getBoundingClientRect();
            
            const shiftX = e.clientX - guardianRect.left;
            const shiftY = e.clientY - guardianRect.top;
            
            guardian.setPointerCapture(e.pointerId);
            
            const onPointerMove = (moveEvent) => {
                let left = moveEvent.clientX - parentRect.left - shiftX;
                let top = moveEvent.clientY - parentRect.top - shiftY;
                
                const sectionTopInParent = sectionRect.top - parentRect.top;
                const sectionBottomInParent = sectionRect.bottom - parentRect.top;
                
                const minTop = sectionTopInParent;
                const maxTop = sectionBottomInParent - guardianRect.height;
                top = Math.max(minTop, Math.min(top, maxTop));
                
                const minLeft = sectionRect.left - parentRect.left;
                const maxLeft = sectionRect.right - parentRect.left - guardianRect.width;
                left = Math.max(minLeft, Math.min(left, maxLeft));
                
                guardian.style.left = `${left}px`;
                guardian.style.top = `${top}px`;
                guardian.style.right = 'auto';
                guardian.style.bottom = 'auto';
            };
            
            const onPointerUp = (upEvent) => {
                guardian.releasePointerCapture(upEvent.pointerId);
                guardian.style.cursor = 'grab';
                
                guardian.style.transition = originalTransition;
                
                guardian.removeEventListener('pointermove', onPointerMove);
                guardian.removeEventListener('pointerup', onPointerUp);
            };
            
            guardian.addEventListener('pointermove', onPointerMove);
            guardian.addEventListener('pointerup', onPointerUp);
        });
    });

    window.addEventListener('load', () => {
        ScrollTrigger.refresh();
    });
    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 500);
}

function initInteractivePawPass() {
    const virtualCard = document.getElementById('pawpassVirtualCard');
    const tierCards = document.querySelectorAll('.tier-card-interactive');
    
    if (!virtualCard || tierCards.length === 0) return;

    const cardTierText = document.getElementById('virtualCardTier');
    const cardPointsText = document.getElementById('virtualCardPoints');
    const cardPerkText = document.getElementById('virtualCardPerk');

    const tierData = {
        silver: {
            tierName: 'Hạng Bạc',
            pointsMultiplier: '1x Points',
            primaryPerk: 'Nhật ký Care-Log',
            className: 'tier-silver'
        },
        gold: {
            tierName: 'Hạng Vàng',
            pointsMultiplier: '1.5x Points',
            primaryPerk: 'Giảm 10% dịch vụ',
            className: 'tier-gold'
        },
        diamond: {
            tierName: 'Hạng Kim Cương',
            pointsMultiplier: '2x Points',
            primaryPerk: 'Giảm 15% dịch vụ',
            className: 'tier-diamond'
        }
    };

    function updateVirtualCard(tierKey) {
        const data = tierData[tierKey];
        if (!data) return;

        const elementsToAnimate = [cardTierText, cardPointsText, cardPerkText];
        elementsToAnimate.forEach(el => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(4px)';
            }
        });

        setTimeout(() => {
            virtualCard.classList.remove('tier-silver', 'tier-gold', 'tier-diamond');
            virtualCard.classList.add(data.className);

            if (cardTierText) cardTierText.textContent = data.tierName;
            if (cardPointsText) cardPointsText.textContent = data.pointsMultiplier;
            if (cardPerkText) cardPerkText.textContent = data.primaryPerk;

            elementsToAnimate.forEach(el => {
                if (el) {
                    el.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }
            });
        }, 150);
    }

    tierCards.forEach(card => {
        const tier = card.getAttribute('data-tier');
        
        const selectTier = () => {
            tierCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            updateVirtualCard(tier);
        };

        card.addEventListener('click', selectTier);
        card.addEventListener('mouseenter', selectTier);
    });

    const cardWrapper = document.querySelector('.pawpass-card-wrapper');
    if (cardWrapper && virtualCard) {
        cardWrapper.addEventListener('mousemove', (e) => {
            const rect = cardWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left - (rect.width / 2);
            const y = e.clientY - rect.top - (rect.height / 2);
            
            const rotateX = -(y / (rect.height / 2)) * 12;
            const rotateY = (x / (rect.width / 2)) * 12;
            
            virtualCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
            
            const shimmer = virtualCard.querySelector('.card-shimmer');
            if (shimmer) {
                const percentX = (e.clientX - rect.left) / rect.width * 100;
                shimmer.style.transform = `translateX(${percentX - 100}%) translateZ(10px)`;
            }
        });

        cardWrapper.addEventListener('mouseleave', () => {
            virtualCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
            const shimmer = virtualCard.querySelector('.card-shimmer');
            if (shimmer) {
                shimmer.style.transform = 'translateX(-50%) translateZ(10px)';
            }
        });
    }
}




window.openLookupModal  = openLookupModal;
window.closeLookupModal = closeLookupModal;
window.switchLookupTab  = switchLookupTab;
window.submitLookup     = submitLookup;

function initLookup() {
    const overlay = document.getElementById('lookupModal');
    if (!overlay) return; // Không có modal trên trang này -> bỏ qua

    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLookupModal();
    });

    const phoneInput = document.getElementById('lookupPhone');
    if (phoneInput) {
        phoneInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitLookup();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeLookupModal();
        }
    });
}

var _lookupCurrentTab = 'orders';
var _lookupLastResults = { orders: [], bookings: [] };

function openLookupModal() {
    const overlay = document.getElementById('lookupModal');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
        const input = document.getElementById('lookupPhone');
        if (input) input.focus();
    }, 260);
}

function closeLookupModal() {
    const overlay = document.getElementById('lookupModal');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    _resetLookup();
}

function switchLookupTab(tab, btnEl) {
    _lookupCurrentTab = tab;
    document.querySelectorAll('.lookup-tab').forEach(function (b) {
        b.classList.remove('active');
    });
    if (btnEl) btnEl.classList.add('active');
    if (_lookupLastResults.orders.length > 0 || _lookupLastResults.bookings.length > 0) {
        _renderLookupResults(_lookupLastResults);
    }
}

function submitLookup() {
    const input = document.getElementById('lookupPhone');
    const resultsEl = document.getElementById('lookupResults');
    if (!input || !resultsEl) return;

    const phone = input.value.trim().replace(/\s/g, '');

    if (!phone || phone.length < 9) {
        input.style.borderColor = 'var(--color-danger)';
        input.focus();
        return;
    }
    input.style.borderColor = '';

    const btn = document.getElementById('lookupSubmitBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="opacity:0.7">Đang tìm...</span>';
    }

    resultsEl.style.display = 'block';
    resultsEl.innerHTML = '<div class="lookup-empty"><div class="lookup-empty-icon"></div><p>Đang tìm kiếm...</p></div>';

    setTimeout(function () {
        const data = _getLookupMockData(phone);
        _lookupLastResults = data;
        _renderLookupResults(data);

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Tra cứu';
        }
    }, 700);
}

function _renderLookupResults(data) {
    const resultsEl = document.getElementById('lookupResults');
    if (!resultsEl) return;

    let items = [];
    if (_lookupCurrentTab === 'orders') items = data.orders;
    else if (_lookupCurrentTab === 'bookings') items = data.bookings;
    else items = data.orders.concat(data.bookings);

    if (items.length === 0) {
        resultsEl.innerHTML =
            '<div class="lookup-empty">' +
                '<div class="lookup-empty-icon"></div>' +
                '<p>Không tìm thấy kết quả với số điện thoại này</p>' +
            '</div>';
        return;
    }

    const tabLabel = _lookupCurrentTab === 'orders' ? 'đơn hàng'
                   : _lookupCurrentTab === 'bookings' ? 'lịch hẹn'
                   : 'kết quả';

    let html = '<p class="lookup-results-header">Tìm thấy ' + items.length + ' ' + tabLabel + '</p>';
    items.forEach(function (item) {
        const sc = item.statusClass || 'lookup-status-pending';
        html +=
            '<div class="lookup-result-item">' +
                '<div class="lookup-result-info">' +
                    '<span class="lookup-result-id">' + _escLookup(item.id) + '</span>' +
                    '<span class="lookup-result-meta">' + _escLookup(item.meta) + '</span>' +
                '</div>' +
                '<span class="lookup-result-status ' + sc + '">' + _escLookup(item.status) + '</span>' +
            '</div>';
    });
    resultsEl.innerHTML = html;
}

function _resetLookup() {
    const input = document.getElementById('lookupPhone');
    const resultsEl = document.getElementById('lookupResults');
    if (input) { input.value = ''; input.style.borderColor = ''; }
    if (resultsEl) { resultsEl.style.display = 'none'; resultsEl.innerHTML = ''; }
    _lookupLastResults = { orders: [], bookings: [] };
    switchLookupTab('orders', document.querySelector('.lookup-tab[data-tab="orders"]'));
}

function _getLookupMockData(phone) {
    return {
        orders: [
            { id: '#DH-20240601', meta: 'Thức ăn Royal Canin · 01/06/2024', status: 'Đã giao', statusClass: 'lookup-status-done' },
            { id: '#DH-20240520', meta: 'Vòng cổ chống bọ chét · 20/05/2024', status: 'Đang xử lý', statusClass: 'lookup-status-pending' },
        ],
        bookings: [
            { id: '#LH-20240615', meta: 'Spa và Grooming · 15/06/2024 · 09:00', status: 'Xác nhận', statusClass: 'lookup-status-done' },
            { id: '#LH-20240510', meta: 'Lưu trú Hotel · 10/05/2024', status: 'Đã hoàn thành', statusClass: 'lookup-status-done' },
        ],
    };
}

function _escLookup(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function initProcessTimeline() {
    const track = document.getElementById('processTrack');
    if (!track) return;

    const steps = track.querySelectorAll('.process-step');
    const prevBtn = document.querySelector('.process-prev');
    const nextBtn = document.querySelector('.process-next');

    if (steps.length === 0) return;

    let currentIndex = 0;

    function getStepWidth() {
        return steps[0] ? steps[0].offsetWidth : 280;
    }

    function setActive(index) {
        steps.forEach((s, i) => {
            s.classList.toggle('active', i === index);
        });
        currentIndex = index;
    }

    function scrollToStep(index) {
        const stepW = getStepWidth();
        const trackW = track.offsetWidth;
        const offset = index * stepW - (trackW / 2 - stepW / 2);
        track.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
        setActive(index);
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const next = Math.max(0, currentIndex - 1);
            scrollToStep(next);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const next = Math.min(steps.length - 1, currentIndex + 1);
            scrollToStep(next);
        });
    }

    let isDown = false, startX, scrollLeft;
    track.addEventListener('mousedown', (e) => {
        isDown = true;
        track.classList.add('is-dragging');
        startX = e.pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
    });
    track.addEventListener('mouseleave', () => { isDown = false; track.classList.remove('is-dragging'); });
    track.addEventListener('mouseup', () => { isDown = false; track.classList.remove('is-dragging'); });
    track.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - track.offsetLeft;
        track.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });

    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
    }, { passive: true });
    track.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - track.offsetLeft;
        track.scrollLeft = scrollLeft - (x - startX);
    }, { passive: true });

    track.addEventListener('scrollend', () => {
        const stepW = getStepWidth();
        const center = track.scrollLeft + track.offsetWidth / 2;
        let closest = 0;
        let minDist = Infinity;
        steps.forEach((s, i) => {
            const stepCenter = i * stepW + stepW / 2;
            const dist = Math.abs(stepCenter - center);
            if (dist < minDist) { minDist = dist; closest = i; }
        });
        setActive(closest);
    });

    setActive(0);
}



async function initServicesGrid() {
    const grid = document.getElementById('svcLandingGrid');
    if (!grid) return;

    if (window.DataLoader && typeof window.DataLoader.loadServices === 'function') {
        try {
            const allServices = await window.DataLoader.loadServices();
            if (allServices.length > 0) {
                const likedServiceIds = loadServiceWishlistIds();
                grid.innerHTML = allServices.map(service => {
                    const priceList = service.prices ? Object.values(service.prices).filter((p) => Number.isFinite(p) && p > 0) : [];
                    const displayPrice = priceList.length > 0 ? Math.min(...priceList) : service.price;
                    const formattedPrice = displayPrice.toLocaleString('vi-VN') + 'đ';
                    const memberPrice = Math.round(displayPrice * 0.95).toLocaleString('vi-VN') + 'đ';
                    const priceUnit = service.priceDisplay.includes('đêm') ? '<span style="font-size: 11px; color: var(--color-text-light);">/đêm</span>' : '';
                    const memberPriceUnit = service.priceDisplay.includes('đêm') ? '/đêm' : '';
                    const shortDuration = service.duration
                        ? service.duration.replace(/\bphút\b/i, 'p').replace(/\s+/g, ' ')
                        : 'Theo ngày';
                    const imgSrc = service.image.startsWith('http') ? service.image : service.image;
                    const fallbackImg = service.category === 'hotel' ? '../../assets/images/services/hotel.png' : '../../assets/images/services/spa.png';
                    const detailUrl = `${window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../'}pages/services/service-detail/service-detail.html?id=${encodeURIComponent(service.serviceId)}`;
                    const bookingUrl = `${window.pawpalGetRootPath ? window.pawpalGetRootPath() : '../../'}pages/services/booking/booking.html?service=${encodeURIComponent(service.serviceId)}`;

                    return `
                        <div class="product-card svc-landing-card" data-category="${service.category}">
                            <button class="svc-wishlist-btn ${likedServiceIds.includes(String(service.serviceId)) ? 'active' : ''}" data-service-id="${service.serviceId}" aria-label="Lưu dịch vụ yêu thích">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                            <a href="${detailUrl}" class="svc-landing-card-link" aria-label="Xem chi tiết ${service.name}">
                                <div class="product-image-box">
                                    <img src="${imgSrc}" alt="${service.name}" loading="lazy" onerror="this.src='${fallbackImg}'">
                                </div>
                            </a>
                            <div class="product-info">
                                <a href="${detailUrl}" class="svc-landing-card-link" aria-label="Xem chi tiết ${service.name}">
                                    <div class="product-meta" style="justify-content: space-between; margin-bottom: 6px;">
                                        <span style="font-size:10px; font-weight:700; background:var(--color-bg-light); color:var(--color-text-light); padding:2px 6px; border-radius:4px;">${service.serviceId}</span>
                                        <div>
                                            <span class="rating-stars"></span> <span class="rating-score rating-score-gold">${service.rating.toFixed(1)}</span> <span class="sold-count">(${service.reviewCount})</span>
                                        </div>
                                    </div>
                                    <h3>${service.name}</h3>
                                    <p style="font-size:13px; color:var(--color-text-light); margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${service.description}</p>
                                    <div style="font-size:12px; color:var(--color-text-dark); margin-bottom:12px; display:flex; gap:12px; font-weight: 500; flex-wrap: wrap;">
                                        <span style="white-space:nowrap;">${service.petType}</span>
                                        <span>${service.weightClass || 'Tùy chọn cân nặng'}</span>
                                        <span>${shortDuration}</span>
                                    </div>
                                </a>
                                <div class="product-info-footer">
                                    <div class="product-price">
                                        <span class="price-current" style="font-size: 16px;">Từ ${formattedPrice}</span>
                                        ${priceUnit}
                                    </div>
                                    <a href="${bookingUrl}" class="add-to-cart-btn" style="text-decoration:none; text-align:center; padding: 8px 16px;">Đặt lịch</a>
                                </div>
                                <div style="font-size:12px; font-weight:700; color:var(--color-accent); text-align:left; margin-top:8px; border-top:1px dashed var(--color-border); padding-top:6px;">
                                    TV Bạc: ${memberPrice}${memberPriceUnit}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                setupLandingServiceWishlist(grid);
            } else {
                console.warn('Landing services data is empty; keeping static markup.');
            }
        } catch (err) {
            console.error('Error loading services for landing:', err);
            console.warn('Keeping existing landing service markup due to load failure.');
        }
    }

    const tabButtons = document.querySelectorAll('#svcTabBar .shop-tab-btn');
    const serviceCards = document.querySelectorAll('#svcLandingGrid .svc-landing-card');
    
    if (tabButtons.length === 0 || serviceCards.length === 0) return;

    let activeCategory = 'all';

    function applyFilter() {
        let count = 0;
        const maxItems = 10;
        serviceCards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            if ((activeCategory === 'all' || cardCat === activeCategory) && count < maxItems) {
                card.style.display = 'flex';
                count++;
            } else {
                card.style.display = 'none';
            }
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            activeCategory = btn.getAttribute('data-category');
            applyFilter();
        });
    });

    applyFilter();
}
