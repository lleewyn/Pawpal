/**
 * PawPal Client Interactions & Micro-animations
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileNavigation();
    initTimelineTracker();
    initBookingWidget();
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
                // Scroll the phone card into view smoothly inside the phone screen container
                card.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'start'
                });
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

    // Auto-cycle timeline every 4 seconds to make the UI look alive
    function startAutoplay() {
        autoPlayInterval = setInterval(() => {
            let nextIndex = (activeIndex + 1) % indicators.length;
            setActiveStep(nextIndex);
        }, 4000);
    }

    // Initialize state
    setActiveStep(0);
    startAutoplay();

    // Pause autoplay when mouse enters phone mockup, resume when leaves
    const mockup = document.querySelector('.phone-mockup');
    if (mockup) {
        mockup.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
        mockup.addEventListener('mouseleave', startAutoplay);
    }
}

/**
 * Booking Widget Popup Interaction
 */
function initBookingWidget() {
    const bookingWidget = document.getElementById('booking');
    const triggerButtons = document.querySelectorAll('a[href="#booking"]');

    if (!bookingWidget || triggerButtons.length === 0) return;

    triggerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            bookingWidget.style.display = 'block';
            bookingWidget.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            // Focus on first input
            const firstInput = bookingWidget.querySelector('input');
            if (firstInput) firstInput.focus();
        });
    });
}
