document.addEventListener('DOMContentLoaded', () => {
    initMobileNavigation();
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
});

/**
 * Mobile Navigation — handled by Bootstrap Collapse (data-bs-toggle="collapse")
 * Custom toggle removed: navbar-toggler now uses data-bs-target="#primaryNavigation"
 */
function initMobileNavigation() {
    // Bootstrap Collapse handles open/close automatically via data-bs-toggle
    // Close menu when a nav link is clicked (Bootstrap doesn't do this by default)
    const primaryNav = document.getElementById('primaryNavigation');
    if (!primaryNav) return;

    const navLinks = primaryNav.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Only collapse if menu is currently open (mobile view)
            if (primaryNav.classList.contains('show')) {
                const bsCollapse = bootstrap.Collapse.getInstance(primaryNav);
                if (bsCollapse) bsCollapse.hide();
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

function initShopFilter() {
    const mainTabBtns = document.querySelectorAll('.shop-tab-bar .shop-tab-btn');
    const subFilterBtns = document.querySelectorAll('.shop-sub-filters .shop-sub-filter-btn');
    const products = document.querySelectorAll('#productGrid .product-card');

    if (products.length === 0) return;

    let activeMarketingStatus = 'all'; // default to all on page load
    let activeCategory = 'all';        // default to all on page load

    function applyFilter() {
        products.forEach(product => {
            const productCategory = product.getAttribute('data-category') || '';
            const productMarketing = product.getAttribute('data-marketing') || '';
            const marketingList = productMarketing.split(/\s+/);

            const matchesCategory = (activeCategory === 'all' || productCategory === activeCategory);
            const matchesMarketing = (activeMarketingStatus === 'all' || marketingList.includes(activeMarketingStatus));

            if (matchesCategory && matchesMarketing) {
                product.style.display = 'flex';
                setTimeout(() => {
                    product.style.opacity = '1';
                    product.style.transform = 'translateY(0) scale(1)';
                }, 20);
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

    // Run initial filter (shows all products since defaults are 'all')
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

    const cardWidth = 340;
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
 * Premium Motion System (Lenis Smooth Scroll & GSAP ScrollTrigger)
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
                
                // Constrain top & bottom
                const minTop = sectionTopInParent;
                const maxTop = sectionBottomInParent - guardianRect.height;
                top = Math.max(minTop, Math.min(top, maxTop));
                
                // Constrain left & right (can be moved anywhere horizontally within viewport section boundary)
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

