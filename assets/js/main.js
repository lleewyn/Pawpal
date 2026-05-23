/**
 * PawPal Client Interactions & Micro-animations
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNavigation();
    initTimelineTracker();
    initBookingWidget();
    initPricingModal();
    initFaqAccordion();
    initShopFilter();
    initCuteEnhancements();
    initDraggableServicesCarousel();
});

/**
 * Mobile Navigation Drawer Toggle
 */
function initMobileNavigation() {
    const navToggle = document.getElementById('mobileNavToggle');
    const primaryNav = document.getElementById('primaryNavigation');
    const iconMenu = navToggle?.querySelector('.icon-menu');
    const iconClose = navToggle?.querySelector('.icon-close');

    if (!navToggle || !primaryNav) return;

    navToggle.addEventListener('click', () => {
        const isOpen = primaryNav.classList.contains('open');
        
        if (isOpen) {
            primaryNav.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
            if (iconMenu && iconClose) {
                iconMenu.style.display = 'block';
                iconClose.style.display = 'none';
            }
        } else {
            primaryNav.classList.add('open');
            navToggle.setAttribute('aria-expanded', 'true');
            if (iconMenu && iconClose) {
                iconMenu.style.display = 'none';
                iconClose.style.display = 'block';
            }
        }
    });

    // Close menu when a link is clicked
    const navLinks = primaryNav.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            primaryNav.classList.remove('open');
            navToggle.setAttribute('aria-expanded', 'false');
            if (iconMenu && iconClose) {
                iconMenu.style.display = 'block';
                iconClose.style.display = 'none';
            }
        });
    });
}

/**
 * Timeline Tracker & Phone Mockup Linkage
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
 * Pricing Modal Tab-switching & Pop-up Interaction
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

/**
 * Shop Category Filter Logic
 */
function initShopFilter() {
    const filterBtns = document.querySelectorAll('.shop-filter-bar .filter-btn');
    const products = document.querySelectorAll('#productGrid .product-card');

    if (filterBtns.length === 0 || products.length === 0) return;

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');

            // Toggle active classes on filter buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Apply smooth show/hide transitions
            products.forEach(product => {
                const category = product.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    product.style.display = 'flex';
                    // Trigger a tiny delay to allow display flex to be processed before animating opacity
                    setTimeout(() => {
                        product.style.opacity = '1';
                        product.style.transform = 'translateY(0) scale(1)';
                    }, 20);
                } else {
                    product.style.opacity = '0';
                    product.style.transform = 'translateY(10px) scale(0.95)';
                    // Hide from document layout after transition completes
                    setTimeout(() => {
                        if (product.style.opacity === '0') {
                            product.style.display = 'none';
                        }
                    }, 300);
                }
            });
        });
    });
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
    const wrapper = document.querySelector('.services-arched-wrapper');
    const cards = document.querySelectorAll('.services-arched-wrapper .arched-card');
    
    if (!wrapper || cards.length === 0) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    let cachedWrapperWidth = 0;
    let cardCaches = [];

    // --- Cache Layout Values to Eliminate Layout Thrashing ---
    function cacheLayout() {
        // Temporarily reset transforms to get pristine layout values
        cards.forEach(card => {
            card.style.transform = 'none';
        });

        // Force browser to compute layout once
        cachedWrapperWidth = wrapper.offsetWidth;

        cardCaches = Array.from(cards).map(card => {
            return {
                element: card,
                centerX: card.offsetLeft + card.offsetWidth / 2
            };
        });

        // Immediately apply arched transform with new layout offsets
        updateArcTransform();
    }

    // --- Dynamic Parabolic Arc Position Calculation ---
    function updateArcTransform() {
        const scrollLeft = wrapper.scrollLeft;
        const containerCenterX = cachedWrapperWidth / 2;
        
        // Define the horizontal window where the curve takes effect.
        const maxDistance = Math.min(600, cachedWrapperWidth * 0.45);

        cardCaches.forEach(cache => {
            const distanceX = cache.centerX - scrollLeft - containerCenterX;
            
            // Normalized distance: -1 at left of curve, 0 at center, 1 at right of curve
            let pct = distanceX / maxDistance;
            
            // Clamp normalized distance to keep cards from over-rotating far offscreen
            pct = Math.max(-1.5, Math.min(1.5, pct));

            // Parabolic vertical offset: highest in the center (translateY = 0), drops as pct increases
            // We use power of 2 for a clean parabolic shape, multiplied by max vertical offset (80px)
            const translateY = Math.pow(Math.abs(pct), 2) * 80;

            // Rotation: tilt outwards. Max rotation is 22 degrees.
            const rotate = pct * 22;

            // Scale: slightly smaller at the sides to add depth
            const scale = 1 - Math.pow(Math.abs(pct), 2) * 0.04;

            cache.element.style.transform = `translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`;
        });
    }

    // Throttle scroll events with requestAnimationFrame for 60fps/120fps scrolling
    let ticking = false;
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateArcTransform();
                ticking = false;
            });
            ticking = true;
        }
    }

    // --- Drag to Scroll Logic ---
    wrapper.addEventListener('mousedown', (e) => {
        isDown = true;
        wrapper.style.cursor = 'grabbing';
        startX = e.pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
        // Disable smooth scroll behavior during drag for instant response
        wrapper.style.scrollBehavior = 'auto';
    });

    wrapper.addEventListener('mouseleave', () => {
        isDown = false;
        wrapper.style.cursor = 'grab';
    });

    wrapper.addEventListener('mouseup', () => {
        isDown = false;
        wrapper.style.cursor = 'grab';
    });

    wrapper.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - wrapper.offsetLeft;
        const walk = (x - startX) * 1.5; // Scroll speed multiplier
        wrapper.scrollLeft = scrollLeft - walk;
    });

    // Touch events for mobile
    wrapper.addEventListener('touchstart', (e) => {
        isDown = true;
        startX = e.touches[0].pageX - wrapper.offsetLeft;
        scrollLeft = wrapper.scrollLeft;
        wrapper.style.scrollBehavior = 'auto';
    }, {passive: true});
    
    wrapper.addEventListener('touchend', () => {
        isDown = false;
    });

    // Handle all scrolling (mousewheel, trackpad, arrow keys, drag, touch scroll)
    wrapper.addEventListener('scroll', requestTick);

    // Run on window resize and load to keep things centered and correct
    window.addEventListener('resize', cacheLayout);
    window.addEventListener('load', cacheLayout);
    if (document.fonts) {
        document.fonts.ready.then(cacheLayout);
    }

    // --- Arrow Navigation ---
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            wrapper.style.scrollBehavior = 'smooth';
            wrapper.scrollLeft -= 280; 
        });

        nextBtn.addEventListener('click', () => {
            wrapper.style.scrollBehavior = 'smooth';
            wrapper.scrollLeft += 280; 
        });
    }

    // Trigger initial calculation once layout is loaded and rendered
    setTimeout(cacheLayout, 100);
}
