function initApp() {
    console.log('[main.js] initApp');
    initLookup();
    initPremiumMotion();
    initTimelineTracker();
    initBookingWidget();
    initPricingModal();
    initFaqAccordion();
    initShopFilter();
    initCuteEnhancements();
    initDraggableServicesCarousel();
    initPetIdCardTilt();
    initTestimonialsCarousel();
    initExpertsCarousel();
    initInteractivePawPass();
    initProcessTimeline();
    initServicesGrid();
    initFab();
    // Gọi lại initActiveNav ở đây để đảm bảo chạy sau khi header đã inject
    setTimeout(initActiveNav, 50);
}

// Run nav init after header is injected by components.js
document.addEventListener('headerInjected', function () {
    initActiveNav();
    initMobileNavigation();

    // Cho phép bấm trực tiếp vào mục cha (Desktop) để chuyển trang
    document.querySelectorAll('.nav-item.dropdown > .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            // Trên Desktop (>1250px), click thẳng vào link sẽ chuyển trang luôn
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
    script.src = root + 'assets/js/shared/components.js';
    script.defer = true;
    document.head.appendChild(script);
}

/**
 * Active Nav — tự động gắn class "active" vào nav link khớp với URL hiện tại.
 * Xóa toàn bộ active hardcode trong HTML, JS tự xử lý khi load trang.
 */
function initActiveNav() {
    const nav = document.getElementById('primaryNavigation');
    if (!nav) return;

    const currentPath = window.location.pathname.toLowerCase();

    const navList = nav.querySelector('ul.navbar-nav');
    if (!navList) return;

    const links = navList.querySelectorAll('a.nav-link');

    // Xóa hết active cũ
    links.forEach(link => {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
    });

    let matched = null;

    // Logic mới: So khớp linh hoạt cho toàn bộ các trang con
    if (currentPath === '/' || currentPath.includes('index.html') || currentPath.includes('landing.html')) {
        matched = navList.querySelector('a.nav-link[href*="landing.html"]');
    } else if (currentPath.includes('services') || currentPath.includes('service-detail') || currentPath.includes('booking')) {
        matched = navList.querySelector('a.nav-link[href*="services.html"]');
    } else if (currentPath.includes('shop') || currentPath.includes('product') || currentPath.includes('cart') || currentPath.includes('checkout')) {
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
        // Force style just in case CSS isn't applying correctly (fallback)
        matched.style.color = 'var(--color-accent)';
        matched.style.fontWeight = '700';
    }
}

/**
 * Mobile Navigation — Custom toggle (không dùng Bootstrap Collapse)
 */
function initMobileNavigation() {
    const toggleBtn = document.getElementById('mobileNavToggle');
    const nav = document.getElementById('primaryNavigation');
    if (!toggleBtn || !nav) return;

    // Toggle open/close (stop propagation so document click doesn't immediately close it)
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = nav.classList.contains('show');
        if (isOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    });

    // Close when nav link clicked (trừ dropdown toggle)
    nav.querySelectorAll('a').forEach(link => {
        if (!link.classList.contains('dropdown-toggle')) {
            link.addEventListener('click', closeDrawer);
        }
    });

    // Close on overlay click (click outside drawer)
    // We'll create an overlay element when opening the drawer and remove it on close.
    let mobileOverlay = null;
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
        // clicking overlay closes drawer
        mobileOverlay.addEventListener('click', closeDrawer);
        // small delay to allow transition
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

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });

    function openDrawer() {
        nav.classList.add('show');
        toggleBtn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        createOverlay();
        // reset carets when opening
        nav.querySelectorAll('.dropdown-toggle svg').forEach(svg => svg.style.transform = 'rotate(0deg)');
    }

    function closeDrawer() {
        nav.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        removeOverlay();
        // reset carets when closing
        nav.querySelectorAll('.dropdown-toggle svg').forEach(svg => svg.style.transform = 'rotate(0deg)');
    }

    // Rotate caret icons for any dropdown toggles when they expand/collapse
    const dropdownToggles = nav.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(dt => {
        dt.addEventListener('click', (e) => {
            // after bootstrap or custom toggle behavior, flip the SVG
            setTimeout(() => {
                const expanded = dt.getAttribute('aria-expanded') === 'true' || dt.classList.contains('show');
                const svg = dt.querySelector('svg');
                if (svg) svg.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
            }, 40);
        });
    });
}

/**
 * Timeline Tracker và Phone Mockup Linkage
 */
function initTimelineTracker() {
    const indicators = document.querySelectorAll('.timeline-indicator-item');
    const phoneCards = document.querySelectorAll('.phone-timeline-card');
    const phoneScreen = document.querySelector('.phone-screen');
    
    if (indicators.length === 0 || phoneCards.length === 0) return;

    let activeIndex = 0;
    let autoPlayInterval;

    function setActiveStep(index) {
        // Remove active class from all indicators
        indicators.forEach(ind => ind.classList.remove('active'));
        // Add active to current
        indicators[index].classList.add('active');

        // Update phone cards active state
        phoneCards.forEach((card, i) => {
            if (i === index) {
                card.classList.add('active');
                
                // Scroll only the phone-screen container, avoiding body/window scrolling
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

    // Set click handlers for indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            // Stop autoplay when user manually interacts
            clearInterval(autoPlayInterval);
            setActiveStep(index);
        });
    });

    // Auto-play was causing an unexpected auto-scroll bug, removed per request.
    // Initialize state only
    setActiveStep(0);
}

/**
 * Booking Widget Popup Interaction
 */
function initBookingWidget() {
    const bookingWidget = document.getElementById('booking');
    const triggerButtons = document.querySelectorAll('a[href="#booking"]');
    const closeBtn = document.getElementById('closeBookingBtn');
    const overlay = document.getElementById('bookingOverlay');

    if (!bookingWidget || triggerButtons.length === 0) return;

    // Open Modal
    triggerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            bookingWidget.classList.add('open');
            
            // Focus on first input with slight delay for transition
            const firstInput = bookingWidget.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 150);
            }
        });
    });

    // Close Modal function
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

    // Escape key support for accessibility
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && bookingWidget.classList.contains('open')) {
            closeModal();
        }
    });
}

/**
 * Pricing Modal Tab-switching và Pop-up Interaction
 */
function initPricingModal() {
    const pricingModal = document.getElementById('pricingModal');
    const openBtn = document.getElementById('openPricingBtn');
    const closeBtn = document.getElementById('closePricingBtn');
    const overlay = document.getElementById('pricingOverlay');
    const pricingBookBtn = document.getElementById('pricingBookBtn');
    const bookingWidget = document.getElementById('booking');

    if (!pricingModal || !openBtn) return;

    // Open Pricing Modal
    openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        pricingModal.classList.add('open');
    });

    // Close Pricing Modal
    const closePricing = () => {
        pricingModal.classList.remove('open');
    };

    if (closeBtn) closeBtn.addEventListener('click', closePricing);
    if (overlay) overlay.addEventListener('click', closePricing);

    // Escape key support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && pricingModal.classList.contains('open')) {
            closePricing();
        }
    });

    // Pricing book button links to booking modal
    if (pricingBookBtn && bookingWidget) {
        pricingBookBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePricing();
            
            // Open booking modal
            bookingWidget.classList.add('open');
            const firstInput = bookingWidget.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 150);
            }
        });
    }

    // Tab switching logic
    const tabButtons = pricingModal.querySelectorAll('.pricing-tab-btn');
    const tabContents = pricingModal.querySelectorAll('.pricing-tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-tab');
            
            // Reset buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Reset content sections
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

/**
 * FAQ Accordion Interaction
 */
function initFaqAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            if (!item) return;
            
            const answer = item.querySelector('.faq-answer');
            const isOpen = item.classList.contains('active');

            // Close all other items first (accordion behavior)
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

            // Toggle current item
            if (isOpen) {
                answer.style.maxHeight = '0';
                item.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('active');
                // Calculate correct scrollHeight after adding active class (which applies padding)
                answer.style.maxHeight = answer.scrollHeight + 'px';
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function initShopFilter() {
    // Dynamically load products if grid exists and DataLoader is available
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (window.DataLoader && typeof window.DataLoader.loadProducts === 'function') {
        window.DataLoader.loadProducts().then(allProducts => {
            grid.innerHTML = allProducts.map(product => {
                // Determine mapped category for tabs (thucan, phukien, vesinh)
                let mappedCategory = '';
                if (['food-dry', 'food-wet', 'bones'].includes(product.category)) mappedCategory = 'thucan';
                else if (['hygiene', 'grooming', 'health'].includes(product.category)) mappedCategory = 'vesinh';
                else mappedCategory = 'phukien'; // toys, clothes, bowls, accessories, furniture, other

                // Determine marketing tags
                let marketingTags = [];
                if (product.badge === 'new') marketingTags.push('hangmoi');
                if (product.badge === 'best') marketingTags.push('banchay');
                if (product.sale || product.badge === 'hot') marketingTags.push('khuyenmai');
                
                // Determine badge to display (priority: khuyenmai, banchay, hangmoi)
                let displayBadge = '';
                if (product.sale) displayBadge = '<span class="tag-badge tag-khuyenmai">Khuyến mãi</span>';
                else if (product.badge === 'best') displayBadge = '<span class="tag-badge tag-banchay">Bán chạy</span>';
                else if (product.badge === 'new') displayBadge = '<span class="tag-badge tag-hangmoi">Hàng mới</span>';

                const formattedPrice = product.price.toLocaleString('vi-VN') + 'đ';
                const formattedOldPrice = product.originalPrice > product.price ? product.originalPrice.toLocaleString('vi-VN') + 'đ' : '';
                
                const imgSrc = product.image.startsWith('http') ? product.image : `../../${product.image}`;

                return `
                    <div class="product-card" data-category="${mappedCategory}" data-marketing="${marketingTags.join(' ')}">
                        <div class="product-image-box">
                            <img src="${imgSrc}" alt="${product.name}" loading="lazy" onerror="this.src='../../assets/images/placeholder.jpg'">
                            ${displayBadge}
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
                                <button class="add-to-cart-btn" aria-label="Thêm vào giỏ hàng">Thêm vào giỏ</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Call setup logic after rendering
            setupFilterInteractions();
        }).catch(err => {
            console.error('Error loading products for landing:', err);
            setupFilterInteractions();
        });
    } else {
        setupFilterInteractions();
    }
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

    // Run initial filter
    applyFilter();
}

/**
 * Cute UI Enhancements (Loader, Wiggle)
 */
function initCuteEnhancements() {
    // Hide Loader on load
    window.addEventListener('load', () => {
        const loader = document.getElementById('cute-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600); // wait for fade out transition
        }
    });

    // Wiggle idle timer (3 seconds)
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

    // Listen for user interactions to reset timer
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, { passive: true });
    });

    // Start timer initially
    resetIdleTimer();
}

/**
 * Draggable Curved Carousel for Services
 */
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

        // Touch support for mobile swipe
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

    // Arrow Navigation controls all rows in sync
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

/**
 * 3D Mouse Hover Tilt Effect for Pet ID Card
 */
function initPetIdCardTilt() {
    const card = document.getElementById('petPassportCard');
    if (!card) return;

    card.addEventListener('mousemove', (e) => {
        const cardRect = card.getBoundingClientRect();
        const cardWidth = cardRect.width;
        const cardHeight = cardRect.height;
        
        // Calculate coordinate center of the card
        const centerX = cardRect.left + cardWidth / 2;
        const centerY = cardRect.top + cardHeight / 2;
        
        // Calculate distance from cursor to center
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        
        // Map to rotation degrees (-12 to 12 degrees max for elegance)
        const rotateX = -12 * (mouseY / (cardHeight / 2));
        const rotateY = 12 * (mouseX / (cardWidth / 2));
        
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateX(0) rotateY(0) scale(1)';
    });
}

/**
 * Infinite Loop Carousel for Customer Testimonials
 */
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

    // Clone cards at the beginning and the end to support infinite scroll
    cards.forEach(card => {
        const clone = card.cloneNode(true);
        track.appendChild(clone);
    });
    // Append in reverse order or standard order to keep index matching correct
    for (let i = totalCards - 1; i >= 0; i--) {
        const clone = cards[i].cloneNode(true);
        track.insertBefore(clone, track.firstChild);
    }

    const allCards = track.querySelectorAll('.testimonial-card');
    
    // Position starts at the first original card (after totalCards prepended clones)
    let positionIndex = totalCards;

    function updateSlider(instant = false) {
        track.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
        
        const wrapperWidth = wrapper.offsetWidth;
        const offset = - (positionIndex * step) + (wrapperWidth / 2) - (cardWidth / 2);
        
        track.style.transform = `translateX(${offset}px)`;

        // Highlight center active card
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

        // Safe transition check
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

    // Initial positioning
    updateSlider(true);

    // Refresh layout dynamically on resize
    window.addEventListener('resize', () => {
        updateSlider(true);
    });
}

/**
 * Infinite Loop Carousel for Experts
 */
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

    // Clone cards to support infinite scroll
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

        // Highlight center active card
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

/**
 * Premium Motion System (Lenis Smooth Scroll và GSAP ScrollTrigger)
 */
function initPremiumMotion() {
    // 1. Initialize Lenis if library is available
    if (typeof Lenis === 'undefined') {
        console.warn('Lenis is not loaded — skipping smooth scroll.');
        // Vẫn chạy GSAP nếu có, không return sớm
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

    // 2. Connect GSAP and ScrollTrigger if available
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('GSAP or ScrollTrigger is not loaded — skipping animations.');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // Đánh dấu GSAP đã sẵn sàng — tắt CSS fallback opacity:1
    document.documentElement.classList.add('gsap-ready');

    // Sync ScrollTrigger with Lenis scroll events if lenis loaded
    if (lenis) {
        lenis.on('scroll', () => {
            ScrollTrigger.update();
        });
    }

    // 3. Hero Section Load Animations
    const heroTl = gsap.timeline({
        onComplete: () => {
            // Đánh dấu hero đã animated xong
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

    // 4. Scroll-Triggered Reveal Animations for Sections
    // Batch reveal section headers
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

    // Batch reveal feature items
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

    // Batch reveal services cards
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

    // Batch reveal safety commitment cards
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

    // Batch reveal experts carousel
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

    // Batch reveal step cards
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

    // Make safety guardians draggable inside safety section
    const guardians = document.querySelectorAll('.safety-guardian');
    guardians.forEach(guardian => {
        guardian.style.cursor = 'grab';
        
        // Prevent default drag events on image
        const img = guardian.querySelector('img');
        if (img) {
            img.addEventListener('dragstart', (e) => e.preventDefault());
        }

        guardian.addEventListener('pointerdown', (e) => {
            // Only left mouse button or touch
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            
            guardian.style.cursor = 'grabbing';
            // Store current transitions to restore later
            const originalTransition = guardian.style.transition;
            const originalAnimation = guardian.style.animation;
            
            guardian.style.transition = 'none';
            guardian.style.animation = 'none'; // Stop floating animation entirely when grabbed
            
            const parent = guardian.offsetParent || guardian.parentElement;
            const parentRect = parent.getBoundingClientRect();
            
            // Grandparent section bounds for dragging constraints
            const section = document.querySelector('.safety-section');
            const sectionRect = section.getBoundingClientRect();
            
            const guardianRect = guardian.getBoundingClientRect();
            
            const shiftX = e.clientX - guardianRect.left;
            const shiftY = e.clientY - guardianRect.top;
            
            guardian.setPointerCapture(e.pointerId);
            
            const onPointerMove = (moveEvent) => {
                // Determine new coordinates relative to the parent offset container
                let left = moveEvent.clientX - parentRect.left - shiftX;
                let top = moveEvent.clientY - parentRect.top - shiftY;
                
                // Keep the guardian within the vertical bounds of the section
                const sectionTopInParent = sectionRect.top - parentRect.top;
                const sectionBottomInParent = sectionRect.bottom - parentRect.top;
                
                // Constrain top và bottom
                const minTop = sectionTopInParent;
                const maxTop = sectionBottomInParent - guardianRect.height;
                top = Math.max(minTop, Math.min(top, maxTop));
                
                // Constrain left và right (can be moved anywhere horizontally within viewport section boundary)
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
                // Leave it where it is, do not restore old animations to prevent jumping back
                
                guardian.removeEventListener('pointermove', onPointerMove);
                guardian.removeEventListener('pointerup', onPointerUp);
            };
            
            guardian.addEventListener('pointermove', onPointerMove);
            guardian.addEventListener('pointerup', onPointerUp);
        });
    });

    // Refresh ScrollTrigger to calculate correct layout offsets
    window.addEventListener('load', () => {
        ScrollTrigger.refresh();
    });
    // Fallback refresh
    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 500);
}

/**
 * Interactive PawPass Loyalty Card Previewer
 */
function initInteractivePawPass() {
    const virtualCard = document.getElementById('pawpassVirtualCard');
    const tierCards = document.querySelectorAll('.tier-card-interactive');
    
    if (!virtualCard || tierCards.length === 0) return;

    // Card text fields
    const cardTierText = document.getElementById('virtualCardTier');
    const cardPointsText = document.getElementById('virtualCardPoints');
    const cardPerkText = document.getElementById('virtualCardPerk');

    // Data definition for each tier to update the virtual card
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

        // Animate out card content slightly before updating
        const elementsToAnimate = [cardTierText, cardPointsText, cardPerkText];
        elementsToAnimate.forEach(el => {
            if (el) {
                el.style.opacity = '0';
                el.style.transform = 'translateY(4px)';
            }
        });

        setTimeout(() => {
            // Remove all tier classes
            virtualCard.classList.remove('tier-silver', 'tier-gold', 'tier-diamond');
            // Add new tier class
            virtualCard.classList.add(data.className);

            // Update text values
            if (cardTierText) cardTierText.textContent = data.tierName;
            if (cardPointsText) cardPointsText.textContent = data.pointsMultiplier;
            if (cardPerkText) cardPerkText.textContent = data.primaryPerk;

            // Animate in updated content
            elementsToAnimate.forEach(el => {
                if (el) {
                    el.style.transition = 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                }
            });
        }, 150);
    }

    // Set up click/hover listeners on the tier cards
    tierCards.forEach(card => {
        const tier = card.getAttribute('data-tier');
        
        const selectTier = () => {
            // Reset active states for cards
            tierCards.forEach(c => c.classList.remove('active'));
            // Set current active card
            card.classList.add('active');

            // Update virtual card
            updateVirtualCard(tier);
        };

        card.addEventListener('click', selectTier);
        card.addEventListener('mouseenter', selectTier);
    });

    // 3D Card Hover Tilt effect for the virtual card
    const cardWrapper = document.querySelector('.pawpass-card-wrapper');
    if (cardWrapper && virtualCard) {
        cardWrapper.addEventListener('mousemove', (e) => {
            const rect = cardWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left - (rect.width / 2);
            const y = e.clientY - rect.top - (rect.height / 2);
            
            // Limit tilt values for sub-milliradian elegance
            const rotateX = -(y / (rect.height / 2)) * 12;
            const rotateY = (x / (rect.width / 2)) * 12;
            
            virtualCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
            
            // Highlight reflective sweep based on cursor location
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



// =============================================================================
// Lookup — Tra cứu đơn hàng và lịch hẹn (khách vãng lai)
// Chạy trên mọi page có header. Nếu không có #lookupModal thì tự bỏ qua.
// TODO: Thay getMockData() bằng fetch('/api/lookup?phone=...') khi có backend.
// =============================================================================

// Expose ra window vì main.js load dưới dạng type="module" (scoped)
// -> onclick="openLookupModal()" trong HTML cần hàm ở global scope
window.openLookupModal  = openLookupModal;
window.closeLookupModal = closeLookupModal;
window.switchLookupTab  = switchLookupTab;
window.submitLookup     = submitLookup;

function initLookup() {
    const overlay = document.getElementById('lookupModal');
    if (!overlay) return; // Không có modal trên trang này -> bỏ qua

    // Đóng khi click ra ngoài modal box
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLookupModal();
    });

    // Enter để submit khi đang focus input
    const phoneInput = document.getElementById('lookupPhone');
    if (phoneInput) {
        phoneInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submitLookup();
        });
    }

    // Escape đóng modal (chỉ register 1 lần ở đây, không đăng ký global)
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeLookupModal();
        }
    });
}

// ── State (scoped via closure không cần thiết vì app này không module) ────────
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

    // TODO: Thay bằng fetch('/api/lookup?phone=' + encodeURIComponent(phone)).then(...)
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
    // Mock data — xóa và thay bằng API khi backend sẵn sàng
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

/**
 * Process Timeline — horizontal scroll with nav buttons and active state
 */
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

    // Nav buttons
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

    // Drag to scroll
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

    // Touch
    track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
    }, { passive: true });
    track.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX - track.offsetLeft;
        track.scrollLeft = scrollLeft - (x - startX);
    }, { passive: true });

    // Update active on scroll end
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

    // Init
    setActive(0);
}

/**
 * FAB Stack — AI Chatbot + Scroll to top
 */
function initFab() {
    // ── Scroll to top button visibility ──
    const bookingBtn = document.getElementById('fabBookingBtn');
    if (bookingBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                bookingBtn.classList.add('visible');
            } else {
                bookingBtn.classList.remove('visible');
            }
        }, { passive: true });
    }

    // ── AI Chatbot Panel ──
    const aiBtn    = document.getElementById('fabAiBtn');
    const chatPanel = document.getElementById('fabChatPanel');
    const closeBtn = document.getElementById('fabChatClose');
    const input    = document.getElementById('fabChatInput');
    const sendBtn  = document.getElementById('fabChatSend');
    const messages = document.getElementById('fabChatMessages');

    if (!aiBtn || !chatPanel) return;

    aiBtn.addEventListener('click', () => {
        chatPanel.classList.toggle('open');
        if (chatPanel.classList.contains('open') && input) {
            setTimeout(() => input.focus(), 300);
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => chatPanel.classList.remove('open'));
    }

    // Send message
    function sendMessage() {
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';
        appendMessage(text, 'user');
        showTyping();
        setTimeout(() => {
            removeTyping();
            appendMessage(getBotReply(text), 'bot');
        }, 900 + Math.random() * 600);
    }

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    function appendMessage(text, type) {
        const bubble = document.createElement('div');
        bubble.className = `fab-chat-bubble fab-chat-bubble--${type}`;
        bubble.innerHTML = text;
        // Remove suggestions on first user message
        if (type === 'user') {
            const sug = messages && messages.querySelector('.fab-chat-suggestions');
            if (sug) sug.remove();
        }
        if (messages) {
            messages.appendChild(bubble);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'fab-chat-bubble fab-chat-bubble--typing';
        typing.id = 'fabTyping';
        typing.innerHTML = '<span></span><span></span><span></span>';
        if (messages) {
            messages.appendChild(typing);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    function removeTyping() {
        const t = document.getElementById('fabTyping');
        if (t) t.remove();
    }

    // Simple rule-based replies — thay bằng API call sau
    function getBotReply(text) {
        const t = text.toLowerCase();
        if (t.match(/spa|grooming|tắm|cắt/))
            return 'Dịch vụ Spa và Grooming của PawPal bao gồm tắm, cắt tỉa, vệ sinh tai và móng. Giá từ <strong>120.000đ</strong>. Bạn muốn đặt lịch không?';
        if (t.match(/hotel|lưu trú|gửi/))
            return 'Pet Hotel có phòng riêng, điều hòa, camera 24/7. Giá từ <strong>180.000đ/đêm</strong>. Yêu cầu vaccine đầy đủ.';
        if (t.match(/giá|bao nhiêu|phí/))
            return 'Bạn có thể xem bảng giá đầy đủ tại <a href="pages/services/services.html" style="color:#7c3aed">trang dịch vụ</a>. Cần tư vấn dịch vụ cụ thể nào?';
        if (t.match(/chuẩn bị|mang gì|cần gì/))
            return 'Cần mang: sổ tiêm phòng, đồ ăn riêng (nếu có), đồ chơi yêu thích của bé. Chúng tôi lo phần còn lại!';
        if (t.match(/đặt lịch|booking/))
            return 'Bạn có thể đặt lịch ngay tại <a href="pages/services/booking.html" style="color:#7c3aed">trang đặt lịch</a> — xác nhận tức thì qua SMS/Zalo.';
        if (t.match(/giờ|mở cửa|thời gian/))
            return 'PawPal mở cửa <strong>8:00–20:00</strong> mỗi ngày. Pet Hotel hoạt động 24/7.';
        return 'Cảm ơn bạn đã nhắn tin!  Để được tư vấn chi tiết hơn, bạn có thể gọi hotline <strong>0774 561 496</strong> hoặc chat Zalo nhé.';
    }
}

// Gọi initFab sau khi footerInjected (fab inject cùng lúc với footer)
document.addEventListener('footerInjected', function () {
    setTimeout(initFab, 100);
});

/**
 * Services Grid — Handle category tabs filtering for landing page (Dynamic)
 */
async function initServicesGrid() {
    const grid = document.getElementById('svcLandingGrid');
    if (!grid) return;

    // Dynamically load services
    if (window.DataLoader && typeof window.DataLoader.loadServices === 'function') {
        try {
            const allServices = await window.DataLoader.loadServices();
            
            grid.innerHTML = allServices.map(service => {
                const formattedPrice = service.price.toLocaleString('vi-VN') + 'đ';
                const memberPrice = Math.round(service.price * 0.95).toLocaleString('vi-VN') + 'đ';
                const priceUnit = service.priceDisplay.includes('đêm') ? '<span style="font-size: 11px; color: var(--color-text-light);">/đêm</span>' : '';
                const memberPriceUnit = service.priceDisplay.includes('đêm') ? '/đêm' : '';
                const imgSrc = service.image.startsWith('http') ? service.image : `../../${service.image}`;
                const fallbackImg = service.category === 'hotel' ? '../../assets/images/services/hotel.png' : '../../assets/images/services/spa.png';
                const detailUrl = `../../pages/services/service-detail.html?id=${encodeURIComponent(service.serviceId)}`;

                return `
                    <div class="product-card svc-landing-card" data-category="${service.category}">
                        <a href="${detailUrl}" class="svc-landing-card-link" aria-label="Xem chi tiết ${service.name}">
                            <div class="product-image-box">
                                <img src="${imgSrc}" alt="${service.name}" loading="lazy" onerror="this.src='${fallbackImg}'">
                                ${service.rating >= 4.8 ? '<span class="tag-badge tag-banchay">Yêu thích</span>' : ''}
                            </div>
                        </a>
                        <div class="product-info">
                            <a href="${detailUrl}" class="svc-landing-card-link" aria-label="Xem chi tiết ${service.name}">
                                <div class="product-meta" style="justify-content: space-between; margin-bottom: 6px;">
                                    <span style="font-size:10px; font-weight:700; background:var(--color-bg-light); color:var(--color-text-light); padding:2px 6px; border-radius:4px;">${service.serviceId}</span>
                                    <div>
                                        <span class="rating-stars"></span> <span class="rating-score">${service.rating.toFixed(1)}</span> <span class="sold-count">(${service.reviewCount})</span>
                                    </div>
                                </div>
                                <h3>${service.name}</h3>
                                <p style="font-size:13px; color:var(--color-text-light); margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${service.description}</p>
                                <div style="font-size:12px; color:var(--color-text-dark); margin-bottom:12px; display:flex; gap:12px; font-weight: 500;">
                                    <span> ${service.petType}</span>
                                    <span>${service.duration || 'Theo ngày'}</span>
                                </div>
                            </a>
                            <div class="product-info-footer">
                                <div class="product-price">
                                    <span class="price-current" style="font-size: 16px;">${formattedPrice}</span>
                                    ${priceUnit}
                                </div>
                                <a href="../../pages/services/booking.html?service=${service.serviceId}" class="add-to-cart-btn" style="text-decoration:none; text-align:center; padding: 8px 16px;">Đặt lịch</a>
                            </div>
                            <div style="font-size:12px; font-weight:700; color:var(--color-accent); text-align:left; margin-top:8px; border-top:1px dashed var(--color-border); padding-top:6px;">
                                TV Bạc: ${memberPrice}${memberPriceUnit}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('Error loading services for landing:', err);
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
            // Remove active from all tabs
            tabButtons.forEach(b => b.classList.remove('active'));
            // Add active to clicked tab
            btn.classList.add('active');

            activeCategory = btn.getAttribute('data-category');
            applyFilter();
        });
    });

    // Initial filter
    applyFilter();
}
