// ==========================================================================
// services.js — Public Services Page Script (Section 3.1.4)
// ==========================================================================



let allServices = [];
let filteredServices = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== SERVICES PAGE LOADING ===');
    
    // Load services from CSV using DataLoader
    try {
        if (window.DataLoader && typeof window.DataLoader.loadServices === 'function') {
            allServices = await window.DataLoader.loadServices();
            console.log(`✓ Loaded ${allServices.length} services`);
            
            // Apply initial filters and render
            applyFilters();
        } else {
            console.error('DataLoader.loadServices not found');
            showErrorMessage();
        }
    } catch (error) {
        console.error('Error loading services:', error);
        showErrorMessage();
    }
});

// Show error message if loading fails
function showErrorMessage() {
    const grid = document.getElementById('servicesGrid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #fff3cd; border-radius: 8px;">
                <h3 style="color: #856404; margin-bottom: 10px;">⚠️ Không thể tải dữ liệu dịch vụ</h3>
                <p style="color: #856404;">Vui lòng kiểm tra kết nối và tải lại trang, chồng iu nhé.</p>
            </div>
        `;
    }
}

// 1. Filter Logic
window.applyFilters = function() {
    const categoryFilter = document.querySelector('input[name="categoryFilter"]:checked')?.value || 'all';
    const maxPrice = parseInt(document.getElementById('priceRange')?.value || '1000000', 10);
    const ratingFilter = document.querySelector('input[name="ratingFilter"]:checked')?.value || 'all';

    filteredServices = allServices.filter(service => {
        // Category filter
        const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
        
        // Price filter
        const matchesPrice = service.price <= maxPrice;
        
        // Rating filter
        let matchesRating = true;
        if (ratingFilter === '5') {
            matchesRating = service.rating === 5;
        } else if (ratingFilter === '4') {
            matchesRating = service.rating >= 4;
        }

        return matchesCategory && matchesPrice && matchesRating;
    });

    renderServices();
};

// 2. Render Services Dynamic Grid
function renderServices() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;

    if (filteredServices.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-services">
                <div class="empty-icon">🔍</div>
                <h3 class="empty-title">Không tìm thấy dịch vụ</h3>
                <p class="empty-desc">Rất tiếc, PawPal không tìm thấy dịch vụ nào phù hợp với bộ lọc của chồng iu.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filteredServices.map(service => {
        // Map category slug to display label (avoid ampersand)
        let displayCategory = 'Dịch vụ';
        if (service.category === 'spa') displayCategory = 'Spa và Làm đẹp';
        else if (service.category === 'hotel') displayCategory = 'Khách sạn thú cưng';
        else if (service.category === 'taxi') displayCategory = 'Taxi đưa đón';

        // Format price
        const formattedPrice = service.price.toLocaleString('vi-VN');
        const priceUnit = service.priceDisplay.includes('đêm') ? ' / đêm' : '';

        // Safely replace ampersand in descriptions or benefits
        const sanitizedDesc = service.description.replace(/&/g, 'và');
        const sanitizedName = service.name.replace(/&/g, 'và');

        return `
            <div class="service-card" data-id="${service.serviceId}">
                <div class="service-card-link">
                    <div class="service-image-wrapper">
                        <span class="service-category-badge">${displayCategory}</span>
                        <img src="../../${service.image}" alt="${sanitizedName}" class="service-image" loading="lazy" onerror="this.src='../../assets/images/services/spa-intro.jpg'">
                    </div>
                    <div class="service-card-info">
                        <div class="service-card-header">
                            <span class="service-card-id">${service.serviceId}</span>
                            <div class="service-card-rating">
                                <span>★</span>
                                <span>${service.rating.toFixed(1)} (${service.reviewCount})</span>
                            </div>
                        </div>
                        <h3 class="service-card-title">${sanitizedName}</h3>
                        <p class="service-card-desc">${sanitizedDesc}</p>
                        
                        <div class="service-card-meta">
                            <div class="service-meta-item">
                                <span>🐾</span>
                                <span>${service.petType} (${service.weightClass.replace(/&/g, 'và')})</span>
                            </div>
                            ${service.duration ? `
                            <div class="service-meta-item">
                                <span>⏱</span>
                                <span>${service.duration}</span>
                            </div>
                            ` : ''}
                        </div>

                        <div class="service-card-price-row">
                            <span class="price-label">Giá niêm yết:</span>
                            <span class="service-card-price">${formattedPrice} VNĐ<span class="service-card-price-unit">${priceUnit}</span></span>
                        </div>
                    </div>
                </div>
                <div class="service-card-actions">
                    <a href="booking.html?service=${service.serviceId}" class="service-btn-book">Đặt lịch ngay</a>
                </div>
            </div>
        `;
    }).join('');

    // Trigger GSAP fade-in for dynamic cards
    const cards = grid.querySelectorAll('.service-card');
    if (cards.length > 0 && typeof gsap !== 'undefined') {
        gsap.fromTo(cards, 
            { opacity: 0, y: 15 }, 
            { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
        );
    }
}

// 3. Clear Filters
window.clearFilters = function() {
    const radioAll = document.querySelector('input[name="categoryFilter"][value="all"]');
    if (radioAll) radioAll.checked = true;
    
    const priceRange = document.getElementById('priceRange');
    if (priceRange) {
        priceRange.value = 1000000;
        updatePriceDisplay(1000000);
    }

    const ratingAll = document.querySelector('input[name="ratingFilter"][value="all"]');
    if (ratingAll) ratingAll.checked = true;

    applyFilters();
};

// 4. Update Price Display Text
window.updatePriceDisplay = function(val) {
    const display = document.getElementById('priceDisplay');
    if (display) {
        display.textContent = `${parseInt(val, 10).toLocaleString('vi-VN')} VNĐ`;
    }
};

// 5. Accordion Toggle Logic
window.toggleAccordion = function(id) {
    const accordion = document.getElementById(id);
    if (!accordion) return;
    const trigger = accordion.previousElementSibling;

    if (accordion.style.display === 'none' || !accordion.style.display) {
        if (trigger) trigger.classList.add('active');
        gsap.set(accordion, { display: 'block', height: 0, opacity: 0 });
        gsap.to(accordion, {
            height: 'auto',
            opacity: 1,
            duration: 0.35,
            ease: 'power2.out'
        });
    } else {
        if (trigger) trigger.classList.remove('active');
        gsap.to(accordion, {
            height: 0,
            opacity: 0,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                accordion.style.display = 'none';
            }
        });
    }
};
