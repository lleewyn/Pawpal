// ==========================================================================
// services.js — Public Services Page Script (Section 3.1.4)
// ==========================================================================



let allServices = [];
let filteredServices = [];
let currentPage = 1;
const itemsPerPage = 12;

function getCurrentWishlistUser() {
    if (typeof window.getCurrentUser === 'function') {
        return window.getCurrentUser();
    }
    try {
        return JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    } catch {
        return null;
    }
}

function requireWishlistUser() {
    const user = getCurrentWishlistUser();
    if (!user) {
        showServiceWishlistToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích');
        return null;
    }
    return user;
}

function getServiceWishlistStorageKey(user = getCurrentWishlistUser()) {
    const userKey = user?.id || user?.phone || user?.phone_main || user?.email;
    return userKey ? `pawpal_wishlist_services_${String(userKey)}` : 'pawpal_wishlist_services';
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

function toggleServiceWishlist(serviceId) {
    const user = requireWishlistUser();
    if (!user) return null;

    const current = loadServiceWishlistIds();
    const normalizedId = String(serviceId);
    const exists = current.includes(normalizedId);
    const next = exists ? current.filter((id) => id !== normalizedId) : [...current, normalizedId];
    saveServiceWishlistIds(next);
    return !exists;
}

function showServiceWishlistToast(message) {
    if (typeof window.showGlobalToast === 'function') {
        window.showGlobalToast('success', message);
        return;
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;right:24px;bottom:24px;background:#2d5343;color:#fff;padding:10px 20px;border-radius:99px;font-size:14px;z-index:9999;pointer-events:none;opacity:1;transition:opacity 0.4s';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 2000);
}

function isCompactServicesLayout() {
    return window.innerWidth <= 1024;
}

function openServicesSidebar() {
    const sidebar = document.getElementById('servicesSidebar');
    const overlay = document.getElementById('servicesSidebarOverlay');
    if (!sidebar || !overlay || !isCompactServicesLayout()) return;
    sidebar.classList.add('show');
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.classList.add('services-filter-open');
}

function closeServicesSidebar() {
    const sidebar = document.getElementById('servicesSidebar');
    const overlay = document.getElementById('servicesSidebarOverlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
    document.body.classList.remove('services-filter-open');
    setTimeout(() => {
        if (!overlay.classList.contains('show')) {
            overlay.hidden = true;
        }
    }, 260);
}

function initResponsiveServicesSidebar() {
    const openBtn = document.getElementById('openServicesSidebar');
    const closeBtn = document.getElementById('closeServicesSidebar');
    const overlay = document.getElementById('servicesSidebarOverlay');
    const sidebar = document.getElementById('servicesSidebar');
    if (!openBtn || !closeBtn || !overlay || !sidebar) return;

    openBtn.onclick = () => openServicesSidebar();
    closeBtn.onclick = () => closeServicesSidebar();
    overlay.onclick = () => closeServicesSidebar();

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeServicesSidebar();
    });

    window.addEventListener('resize', () => {
        if (!isCompactServicesLayout()) {
            closeServicesSidebar();
        }
    });
}

function initServicesFilterControls() {
    const searchInput = document.getElementById('searchServiceInput');
    if (searchInput && searchInput.dataset.bound !== 'true') {
        searchInput.addEventListener('input', () => applyFilters());
        searchInput.dataset.bound = 'true';
    }

    document.querySelectorAll('input[name="sortFilter"], input[name="categoryFilter"], input[name="petFilter"], input[name="priceBucketFilter"]').forEach((input) => {
        if (input.dataset.bound === 'true') return;
        input.addEventListener('change', () => applyFilters());
        input.dataset.bound = 'true';
    });

    const ratingAll = document.getElementById('ratingAll');
    if (ratingAll && ratingAll.dataset.bound !== 'true') {
        ratingAll.addEventListener('change', () => handleRatingAllChange(ratingAll));
        ratingAll.dataset.bound = 'true';
    }

    document.querySelectorAll('.rating-star-check').forEach((input) => {
        if (input.dataset.bound === 'true') return;
        input.addEventListener('change', () => handleRatingStarChange());
        input.dataset.bound = 'true';
    });

    document.querySelectorAll('.btn-clear-filters-full, .btn-clear-filters').forEach((button) => {
        if (button.dataset.bound === 'true') return;
        button.addEventListener('click', () => clearFilters());
        button.dataset.bound = 'true';
    });

    document.querySelectorAll('[data-service-focus]').forEach((button) => {
        if (button.dataset.bound === 'true') return;
        button.addEventListener('click', () => applyQuickServiceFocus(button.dataset.serviceFocus || ''));
        button.dataset.bound = 'true';
    });
}

function initServicesAccordions() {
    document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
        if (trigger.dataset.bound === 'true') return;
        trigger.addEventListener('click', () => {
            const panel = trigger.nextElementSibling;
            if (!panel?.id) return;
            toggleAccordion(panel.id);
        });
        trigger.dataset.bound = 'true';
    });
}

function updateServicesFilterCount() {
    const badge = document.getElementById('servicesFilterCount');
    const label = document.getElementById('servicesFilterLabel');
    const toggle = document.getElementById('openServicesSidebar');
    if (!badge || !label || !toggle) return;

    let activeCount = 0;

    const searchVal = document.getElementById('searchServiceInput')?.value.trim() || '';
    if (searchVal) activeCount += 1;

    const categoryFilter = document.querySelector('input[name="categoryFilter"]:checked')?.value || 'all';
    if (categoryFilter !== 'all') activeCount += 1;

    const petFilter = document.querySelector('input[name="petFilter"]:checked')?.value || 'all';
    if (petFilter !== 'all') activeCount += 1;

    const priceBucketFilter = document.querySelector('input[name="priceBucketFilter"]:checked')?.value || 'all';
    if (priceBucketFilter !== 'all') activeCount += 1;

    const sortBy = document.querySelector('input[name="sortFilter"]:checked')?.value || 'default';
    if (sortBy !== 'default') activeCount += 1;

    const selectedRatings = [...document.querySelectorAll('.rating-star-check:checked')];
    if (selectedRatings.length > 0) activeCount += 1;

    badge.textContent = String(activeCount);
    badge.hidden = activeCount === 0;
    label.textContent = activeCount > 0 ? `Bộ lọc (${activeCount})` : 'Bộ lọc';
    toggle.classList.toggle('is-active', activeCount > 0);
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== SERVICES PAGE LOADING ===');
    initResponsiveServicesSidebar();
    initServicesFilterControls();
    initServicesAccordions();

    // Load services from CSV using DataLoader
    try {
        if (window.DataLoader && typeof window.DataLoader.loadServices === 'function') {
            allServices = await window.DataLoader.loadServices();
            console.log(` Loaded ${allServices.length} services`);

            // Apply URL filter if present
            const urlParams = new URLSearchParams(window.location.search);
            const categoryParam = urlParams.get('category');
            if (categoryParam) {
                const catRadio = document.querySelector(`input[name="categoryFilter"][value="${categoryParam}"]`);
                if (catRadio) catRadio.checked = true;
            }

            // Apply initial filters and render
            applyFilters();
            updateServicesFilterCount();
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
                <h3 style="color: #856404; margin-bottom: 10px;">️ Không thể tải dữ liệu dịch vụ</h3>
                <p style="color: #856404;">Vui lòng kiểm tra kết nối và tải lại trang.</p>
            </div>
        `;
    }
}

// 1. Filter Logic
window.applyFilters = function () {
    const searchVal = document.getElementById('searchServiceInput')?.value.trim().toLowerCase() || '';
    const categoryFilter = document.querySelector('input[name="categoryFilter"]:checked')?.value || 'all';
    const petFilter = document.querySelector('input[name="petFilter"]:checked')?.value || 'all';
    const priceBucketFilter = document.querySelector('input[name="priceBucketFilter"]:checked')?.value || 'all';
    const ratingAllChecked = document.getElementById('ratingAll')?.checked ?? true;
    const selectedRatings = [...document.querySelectorAll('.rating-star-check:checked')].map(c => parseInt(c.value));

    filteredServices = allServices.filter(service => {
        // 0. Search text filter
        let matchesSearch = true;
        if (searchVal) {
            const nameMatch = service.name.toLowerCase().includes(searchVal);
            const descMatch = service.description.toLowerCase().includes(searchVal);
            matchesSearch = nameMatch || descMatch;
        }

        // 1. Category filter
        const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;

        // 1.5. Pet type filter
        let matchesPet = true;
        if (petFilter !== 'all') {
            const petType = service.petType.toLowerCase();
            if (petFilter === 'dog') {
                matchesPet = petType.includes('chó') || petType.includes('cún');
            } else if (petFilter === 'cat') {
                matchesPet = petType.includes('mèo');
            } else if (petFilter === 'rabbit') {
                matchesPet = petType.includes('thỏ');
            } else if (petFilter === 'small') {
                matchesPet = petType.includes('bọ') || petType.includes('hamster') || petType.includes('thú nhỏ');
            }
        }

        // 2. Price bucket filter
        let matchesPrice = true;
        if (priceBucketFilter === 'under-150') {
            matchesPrice = service.price < 150000;
        } else if (priceBucketFilter === '150-300') {
            matchesPrice = service.price >= 150000 && service.price <= 300000;
        } else if (priceBucketFilter === 'over-300') {
            matchesPrice = service.price > 300000;
        }

        // 3. Rating filter (multi-select checkbox)
        let matchesRating = true;
        if (!ratingAllChecked && selectedRatings.length > 0) {
            matchesRating = selectedRatings.some(star => Math.floor(service.rating) === star);
        }

        return matchesSearch && matchesCategory && matchesPet && matchesPrice && matchesRating;
    });

    // Handle sorting before rendering
    const sortBy = document.querySelector('input[name="sortFilter"]:checked')?.value || 'default';
        if (sortBy === 'price-asc') {
        filteredServices.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
        filteredServices.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating-desc') {
        filteredServices.sort((a, b) => b.rating - a.rating);
    }

    currentPage = 1;
    renderServices();
    updateServicesFilterCount();

    if (isCompactServicesLayout()) {
        closeServicesSidebar();
    }
};

// 2. Render Services Dynamic Grid
function renderServices() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;

    if (filteredServices.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-services">
                <div class="empty-icon"></div>
                <h3 class="empty-title">Không tìm thấy dịch vụ</h3>
                <p class="empty-desc">Rất tiếc, PawPal không tìm thấy dịch vụ nào phù hợp với bộ lọc của bạn.</p>
            </div>
        `;
        document.getElementById('paginationWrapper')?.classList.add('d-none');
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedServices = filteredServices.slice(startIndex, endIndex);
    const likedServiceIds = loadServiceWishlistIds();

    grid.innerHTML = paginatedServices.map(service => {
        // Map category slug to display label (avoid ampersand)
        let displayCategory = 'Dịch vụ';
        if (service.category === 'spa') displayCategory = 'Spa và Làm đẹp';
        else if (service.category === 'hotel') displayCategory = 'Khách sạn thú cưng';
        else if (service.category === 'taxi') displayCategory = 'Taxi đưa đón';

        // Format prices
        const formattedPrice = service.price.toLocaleString('vi-VN');
        const priceUnit = service.priceDisplay.includes('đêm') ? ' / đêm' : '';

        // Member price (Silver 5% discount)
        const memberPrice = Math.round(service.price * 0.95);
        const formattedMemberPrice = memberPrice.toLocaleString('vi-VN');

        // Safely replace ampersand in descriptions or benefits
        const sanitizedDesc = service.description.replace(/&/g, 'và');
        const sanitizedName = service.name.replace(/&/g, 'và');

        return `
            <div class="service-card" data-id="${service.serviceId}">
                <button class="service-wishlist-btn ${likedServiceIds.includes(String(service.serviceId)) ? 'active' : ''}" data-service-id="${service.serviceId}" aria-label="Lưu dịch vụ yêu thích">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                <a href="service-detail/service-detail.html?id=${service.serviceId}" class="service-card-link">
                    <div class="service-image-wrapper">
                        <span class="service-category-badge">${displayCategory}</span>
                        <img src="${service.image}" alt="${sanitizedName}" class="service-image" loading="lazy" onerror="this.onerror=null; this.src='../../assets/images/services/${service.category === 'hotel' ? 'hotel.png' : 'spa.png'}'">
                    </div>
                    <div class="service-card-info">
                        <div class="service-card-header">
                            <span class="service-card-id">${service.serviceId}</span>
                            <div class="service-card-rating">
                                <span></span>
                                <span>${service.rating.toFixed(1)} (${service.reviewCount})</span>
                            </div>
                        </div>
                        <h3 class="service-card-title">${sanitizedName}</h3>
                        <p class="service-card-desc">${sanitizedDesc}</p>
                        
                        <div class="service-card-meta">
                            <div class="service-meta-item">
                                <span></span>
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
                            <span class="service-card-price">Từ ${formattedPrice} VNĐ<span class="service-card-price-unit">${priceUnit}</span></span>
                        </div>
                        <div class="service-card-member-price-row">
                            <span class="member-price-label">Thành viên:</span>
                            <span class="service-card-member-price">
                                <span>Từ ${formattedMemberPrice} VNĐ<span class="service-card-price-unit">${priceUnit}</span></span>
                                <span class="member-badge">PawPass Bạc (-5%)</span>
                            </span>
                        </div>
                    </div>
                </a>
                <div class="service-card-actions">
                    <a href="booking/booking.html?service=${service.serviceId}" class="service-btn-book">Đặt lịch ngay</a>
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

    grid.querySelectorAll('.service-wishlist-btn').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const added = toggleServiceWishlist(button.dataset.serviceId || '');
            button.classList.toggle('active', added);
            showServiceWishlistToast(added ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích');
        });
    });

    renderPagination();
}

// 2.5 Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    const pagePrev = document.getElementById('pagePrev');
    const pageNext = document.getElementById('pageNext');
    const paginationWrapper = document.getElementById('paginationWrapper');
    
    if (!pageNumbers || !pagePrev || !pageNext || !paginationWrapper) return;
    
    if (totalPages <= 1) {
        paginationWrapper.classList.add('d-none');
        return;
    }
    
    paginationWrapper.classList.remove('d-none');
    
    pagePrev.disabled = currentPage === 1;
    pageNext.disabled = currentPage === totalPages;
    
    pagePrev.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderServices();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    pageNext.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderServices();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    
    pageNumbers.innerHTML = '';
    pageNumbers.appendChild(createPageButton(1));
    
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);
    
    if (startPage > 2) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.appendChild(createPageButton(i));
    }
    
    if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }
    
    if (totalPages > 1) {
        pageNumbers.appendChild(createPageButton(totalPages));
    }
}

function createPageButton(page) {
    const btn = document.createElement('button');
    btn.className = `page-number ${page === currentPage ? 'active' : ''}`;
    btn.textContent = page;
    btn.onclick = () => {
        if (currentPage !== page) {
            currentPage = page;
            renderServices();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    return btn;
}

// 3. Clear Filters
window.clearFilters = function () {
    const searchInput = document.getElementById('searchServiceInput');
    if (searchInput) searchInput.value = '';

    const categoryAll = document.querySelector('input[name="categoryFilter"][value="all"]');
    if (categoryAll) categoryAll.checked = true;

    const petAll = document.querySelector('input[name="petFilter"][value="all"]');
    if (petAll) petAll.checked = true;

    const priceAll = document.querySelector('input[name="priceBucketFilter"][value="all"]');
    if (priceAll) priceAll.checked = true;

    const ratingAll = document.getElementById('ratingAll');
    if (ratingAll) ratingAll.checked = true;
    document.querySelectorAll('.rating-star-check').forEach(c => c.checked = false);

    const sortDefault = document.querySelector('input[name="sortFilter"][value="default"]');
    if (sortDefault) sortDefault.checked = true;

    applyFilters();
};

function setRadioFilter(name, value) {
    const target = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (target) target.checked = true;
}

function focusServicesResult() {
    const toolbar = document.querySelector('.services-toolbar');
    if (!toolbar) return;
    toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.applyQuickServiceFocus = function (focusKey) {
    const searchInput = document.getElementById('searchServiceInput');
    if (searchInput) searchInput.value = '';

    setRadioFilter('sortFilter', 'default');
    setRadioFilter('categoryFilter', 'all');
    setRadioFilter('petFilter', 'all');
    setRadioFilter('priceBucketFilter', 'all');

    const ratingAll = document.getElementById('ratingAll');
    if (ratingAll) ratingAll.checked = true;
    document.querySelectorAll('.rating-star-check').forEach((checkbox) => {
        checkbox.checked = false;
    });

    switch (focusKey) {
        case 'basic':
            if (searchInput) searchInput.value = 'vệ sinh cơ bản';
            setRadioFilter('priceBucketFilter', 'under-150');
            break;
        case 'premium':
            if (searchInput) searchInput.value = 'premium';
            setRadioFilter('priceBucketFilter', '150-300');
            break;
        case 'style':
        case 'styling':
            if (searchInput) searchInput.value = 'tạo kiểu';
            setRadioFilter('priceBucketFilter', 'over-300');
            break;
        case 'odor':
            if (searchInput) searchInput.value = 'khử mùi';
            break;
        case 'shedding':
            if (searchInput) searchInput.value = 'dưỡng';
            setRadioFilter('priceBucketFilter', '150-300');
            break;
        case 'hotel':
            setRadioFilter('categoryFilter', 'hotel');
            break;
        default:
            break;
    }

    applyFilters();
    focusServicesResult();
};

// 4. Update Price Display Text
window.updatePriceDisplay = function (val) {
    const display = document.getElementById('priceDisplay');
    if (display) {
        display.textContent = `${parseInt(val, 10).toLocaleString('vi-VN')} VNĐ`;
    }
};

// 5. Rating checkbox handlers
window.handleRatingAllChange = function (checkbox) {
    if (checkbox.checked) {
        document.querySelectorAll('.rating-star-check').forEach(c => c.checked = false);
    } else {
        // Không cho bỏ chọn "Tất cả" khi không có sao nào được chọn
        checkbox.checked = true;
    }
    applyFilters();
};

window.handleRatingStarChange = function () {
    const anyStarChecked = [...document.querySelectorAll('.rating-star-check')].some(c => c.checked);
    const ratingAll = document.getElementById('ratingAll');
    if (ratingAll) ratingAll.checked = !anyStarChecked;
    applyFilters();
};

// 6. Accordion Toggle Logic
window.toggleAccordion = function (id) {
    const accordion = document.getElementById(id);
    if (!accordion) return;
    const trigger = accordion.previousElementSibling;

    const isHidden = accordion.classList.contains('d-none') || accordion.style.display === 'none';

    if (isHidden) {
        accordion.classList.remove('d-none');
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
                accordion.classList.add('d-none');
                accordion.style.display = '';
            }
        });
    }
};
