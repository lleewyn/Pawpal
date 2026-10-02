/**
 * service-detail.js - Logic chi tiết dịch vụ PawPal
 * Cập nhật: Đồng bộ toàn diện layout và components với trang chi tiết sản phẩm (Product Detail),
 * bao gồm Tabs, Bảng giá thành viên (Member Tiers), Thanh tiến độ đánh giá 5 sao,
 * và điều hướng thư viện ảnh mượt mà.
 */

let serviceData = null;
let selectedPetType = 'Chó và Mèo';
let selectedWeight = 'Dưới 5kg';
let selectedGroomer = 'junior';
let currentLikedState = false;

let galleryImages = [];
let currentImageIndex = 0;
let autoSlideTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id') || urlParams.get('service') || urlParams.get('serviceId');

    if (!serviceId) {
        window.location.href = '../services.html';
        return;
    }

    try {
        let attempts = 0;
        while ((!window.DataLoader || typeof window.DataLoader.getServiceById !== 'function') && attempts < 25) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (window.DataLoader && typeof window.DataLoader.getServiceById === 'function') {
            serviceData = await window.DataLoader.getServiceById(serviceId);
            if (!serviceData) {
                console.warn('Service not found for ID:', serviceId);
                showNotFound();
                return;
            }

            console.log('Service loaded:', serviceData.serviceId, serviceData.name);

            try { initServiceTabs(); } catch (e) { console.warn('initServiceTabs error:', e); }
            try { updateBreadcrumb(); } catch (e) { console.warn('updateBreadcrumb error:', e); }
            try { populateServiceInfo(); } catch (e) { console.warn('populateServiceInfo error:', e); }
            try { setupGallery(); } catch (e) { console.warn('setupGallery error:', e); }
            try { setupTimelineAndBenefits(); } catch (e) { console.warn('setupTimelineAndBenefits error:', e); }
            try { setupAmenities(); } catch (e) { console.warn('setupAmenities error:', e); }
            try { setupFAQs(); } catch (e) { console.warn('setupFAQs error:', e); }
            try { await setupReviews(); } catch (e) { console.warn('setupReviews error:', e); }
            try { setupStickyBarTrigger(); } catch (e) { console.warn('setupStickyBarTrigger error:', e); }
            try { setupWishlistAndShare(); } catch (e) { console.warn('setupWishlistAndShare error:', e); }
            try { setupRelatedServices(); } catch (e) { console.warn('setupRelatedServices error:', e); }
            try { setupConfigurator(); } catch (e) { console.warn('setupConfigurator error:', e); }
            try { recalculatePrice(); } catch (e) { console.warn('recalculatePrice error:', e); }
        } else {
            console.error('DataLoader not initialized');
            showNotFound();
        }
    } catch (e) {
        console.error('Error loading service details:', e);
        showNotFound();
    }
});

function showNotFound() {
    const main = document.querySelector('.service-detail-main');
    if (main) {
        main.innerHTML = `
            <div class="container-xl text-center" style="padding: 100px 20px;">
                <h2 style="color: var(--sd-primary); font-family: var(--font-heading); margin-bottom: 20px;">Không tìm thấy dịch vụ</h2>
                <p style="color: var(--sd-text-muted); margin-bottom: 24px;">Dịch vụ này không tồn tại hoặc đã tạm dừng nhận lịch.</p>
                <a href="../services.html" class="btn-book-service-now" style="max-width: 260px; margin: 0 auto; display: inline-block;">Quay lại danh sách dịch vụ</a>
            </div>
        `;
    }
}

function initServiceTabs() {
    const tabs = document.querySelectorAll('.service-tabs-nav .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            document.querySelectorAll('.service-tabs-section .tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const activePanel = document.getElementById(`tab-${targetTab}`);
            if (activePanel) {
                activePanel.classList.add('active');
            }
        });
    });
}

function getServiceCategoryLabel(category) {
    if (category === 'spa') return 'Spa và Làm đẹp';
    if (category === 'hotel') return 'Khách sạn thú cưng';
    if (category === 'taxi') return 'Taxi đưa đón';
    return 'Dịch vụ';
}

function updateBreadcrumb() {
    if (!serviceData) return;
    const categoryEl = document.getElementById('breadcrumbServiceCategory');
    const nameEl = document.getElementById('breadcrumbServiceName');

    if (categoryEl) {
        categoryEl.textContent = getServiceCategoryLabel(serviceData.category);
    }
    if (nameEl) {
        nameEl.textContent = (serviceData.name || '').replace(/&/g, 'và');
    }
}

function populateServiceInfo() {
    if (!serviceData) return;

    const sanitizedName = (serviceData.name || '').replace(/&/g, 'và');
    const displayCategory = getServiceCategoryLabel(serviceData.category);
    const petTypeDisplay = (serviceData.petType || 'Chó và Mèo').replace(/&/g, 'và');

    // Summary Card Header
    const idEl = document.getElementById('detailServiceId');
    if (idEl) idEl.textContent = serviceData.serviceId || 'SVC';

    const catEl = document.getElementById('detailCategoryLabel');
    if (catEl) catEl.textContent = displayCategory;

    const titleEl = document.getElementById('detailServiceTitle');
    if (titleEl) titleEl.textContent = sanitizedName;

    const score = (serviceData.rating || 4.8).toFixed(1);
    const count = serviceData.reviewCount || 115;
    const ratingTextEl = document.getElementById('detailRatingText');
    if (ratingTextEl) ratingTextEl.textContent = `(${score} - ${count} đánh giá)`;

    // Rating Stars in Summary Header
    const starsContainer = document.getElementById('detailHeaderStars');
    if (starsContainer) {
        const roundedScore = Math.round(parseFloat(score));
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star ${i <= roundedScore ? 'filled' : ''}">★</span>`;
        }
        starsContainer.innerHTML = starsHtml;
    }

    // Meta row
    const petEl = document.getElementById('detailPetType');
    if (petEl) petEl.textContent = petTypeDisplay;

    const durEl = document.getElementById('detailDuration');
    if (durEl) durEl.textContent = serviceData.duration || '60 phút';

    const statusEl = document.getElementById('detailStatus');
    const btnPanelBook = document.getElementById('btnPanelBook');

    if (btnPanelBook) {
        btnPanelBook.href = `../booking/booking.html?service=${serviceData.serviceId}`;
    }

    if (statusEl) {
        statusEl.textContent = serviceData.status || 'Đang phục vụ';
        if (serviceData.status && serviceData.status !== 'Đang phục vụ') {
            statusEl.className = 'text-danger fw-semibold';
            if (btnPanelBook) {
                btnPanelBook.textContent = 'Tạm dừng nhận lịch';
                btnPanelBook.style.background = '#CBD5E1';
                btnPanelBook.style.pointerEvents = 'none';
            }
        }
    }

    // Tab 1 Meta Card & Description
    const tabMetaServiceId = document.getElementById('tabMetaServiceId');
    if (tabMetaServiceId) tabMetaServiceId.textContent = serviceData.serviceId || 'SVC';

    const tabMetaCategory = document.getElementById('tabMetaCategory');
    if (tabMetaCategory) tabMetaCategory.textContent = displayCategory;

    const tabMetaPetType = document.getElementById('tabMetaPetType');
    if (tabMetaPetType) tabMetaPetType.textContent = petTypeDisplay;

    const tabDesc = document.getElementById('tabServiceDescription');
    if (tabDesc) {
        tabDesc.textContent = (serviceData.description || 'Dịch vụ chăm sóc và làm đẹp chuyên nghiệp tại PawPal mang lại trải nghiệm êm ái, an toàn và toàn diện cho bé cưng của bạn.').replace(/&/g, 'và');
    }

    // Sticky Bar elements
    const stickyName = document.getElementById('stickyServiceName');
    if (stickyName) stickyName.textContent = sanitizedName;

    const fallbackImg = '/assets/images/services/' + (serviceData.category === 'hotel' ? 'hotel.png' : 'spa.png');
    const stickyThumb = document.getElementById('stickyServiceThumb');
    if (stickyThumb) {
        stickyThumb.src = serviceData.image || fallbackImg;
        stickyThumb.onerror = () => { stickyThumb.src = fallbackImg; };
    }
}

function setupGallery() {
    if (!serviceData) return;

    const mainImg = document.getElementById('mainShowcaseImg');
    const fallbackImage = '/assets/images/services/' + (serviceData.category === 'hotel' ? 'hotel.png' : 'spa.png');

    if (mainImg) {
        mainImg.onerror = function () {
            this.onerror = null;
            this.src = fallbackImage;
        };
        mainImg.src = serviceData.image || fallbackImage;
    }

    const thumbsContainer = document.getElementById('galleryThumbnails');
    if (!thumbsContainer) return;

    let rawImages = Array.isArray(serviceData.images) && serviceData.images.length > 0 ? [...serviceData.images] : [serviceData.image || fallbackImage];

    rawImages = [...new Set(rawImages.filter(Boolean))];
    if (rawImages.length === 0) rawImages = [fallbackImage];

    galleryImages = rawImages;
    currentImageIndex = 0;

    thumbsContainer.innerHTML = rawImages.map((imgUrl, index) => `
        <div class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="${imgUrl}" alt="Ảnh ${index + 1}" class="gallery-thumb-img" onerror="this.onerror=null; this.src='${fallbackImage}'">
        </div>
    `).join('');

    thumbsContainer.querySelectorAll('.gallery-thumb').forEach(thumb => {
        thumb.addEventListener('click', () => {
            const idx = parseInt(thumb.getAttribute('data-index'), 10);
            currentImageIndex = idx;
            updateMainImage(currentImageIndex);
            resetAutoSlide();
        });
    });

    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    if (prevBtn) prevBtn.addEventListener('click', () => navigateGallery(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateGallery(1));

    startAutoSlide();
}

function updateMainImage(index) {
    const mainImg = document.getElementById('mainShowcaseImg');
    const thumbsContainer = document.getElementById('galleryThumbnails');
    if (!mainImg || !galleryImages[index]) return;

    if (thumbsContainer) {
        thumbsContainer.querySelectorAll('.gallery-thumb').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });
    }

    if (typeof gsap !== 'undefined') {
        gsap.to(mainImg, {
            opacity: 0.1,
            duration: 0.15,
            onComplete: () => {
                mainImg.src = galleryImages[index];
                gsap.to(mainImg, { opacity: 1, duration: 0.25 });
            }
        });
    } else {
        mainImg.src = galleryImages[index];
    }
}

function navigateGallery(direction) {
    if (galleryImages.length === 0) return;
    currentImageIndex = (currentImageIndex + direction + galleryImages.length) % galleryImages.length;
    updateMainImage(currentImageIndex);
    resetAutoSlide();
}

function startAutoSlide() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(() => {
        if (galleryImages.length > 1) {
            currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
            updateMainImage(currentImageIndex);
        }
    }, 4000);
}

function resetAutoSlide() {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
    startAutoSlide();
}

function setupConfigurator() {
    if (!serviceData) return;

    const rawPet = serviceData.petType || '';
    if (rawPet.includes('/') || rawPet.toLowerCase().includes('và')) {
        selectedPetType = 'Chó và Mèo';
    } else {
        selectedPetType = rawPet.includes('Chó') ? 'Chó' : (rawPet.includes('Mèo') ? 'Mèo' : 'Tất cả');
    }

    const weightOptions = document.getElementById('weightClassOptions');
    if (!weightOptions) return;

    const pricesObj = serviceData.prices || {};
    const availableWeights = Object.keys(pricesObj).filter(w => pricesObj[w] > 0);

    if (availableWeights.length > 0) {
        weightOptions.innerHTML = availableWeights.map((w, idx) => `
            <button class="config-pill-btn ${idx === 0 ? 'active' : ''}" data-val="${w}">${w}</button>
        `).join('');
        selectedWeight = availableWeights[0];
    } else {
        weightOptions.innerHTML = `<button class="config-pill-btn active" data-val="Tiêu chuẩn">Tiêu chuẩn</button>`;
        selectedWeight = 'Tiêu chuẩn';
    }

    weightOptions.querySelectorAll('.config-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            weightOptions.querySelectorAll('.config-pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedWeight = btn.getAttribute('data-val');
            recalculatePrice();
        });
    });
}

function recalculatePrice() {
    if (!serviceData) return;

    let finalPrice = serviceData.prices && serviceData.prices[selectedWeight] ? serviceData.prices[selectedWeight] : (serviceData.price || 0);

    const silverPrice = Math.round(finalPrice * 0.95);
    const goldPrice = Math.round(finalPrice * 0.90);
    const diamondPrice = Math.round(finalPrice * 0.85);

    animatePriceChange('detailBasePrice', finalPrice);
    animatePriceChange('priceTierSilver', silverPrice);
    animatePriceChange('priceTierGold', goldPrice);
    animatePriceChange('priceTierDiamond', diamondPrice);
    animatePriceChange('stickyPriceVal', finalPrice);

    const stickySub = document.getElementById('stickyServiceSub');
    if (stickySub) {
        stickySub.textContent = `Gói: ${selectedWeight} • ${selectedPetType}`;
    }

    const bookingParams = new URLSearchParams({
        service: serviceData.serviceId || '',
        petType: selectedPetType || 'Tất cả',
        weight: selectedWeight || 'Tiêu chuẩn',
        groomer: selectedGroomer || 'junior',
        price: finalPrice
    });

    const bookingUrl = `../booking/booking.html?${bookingParams.toString()}`;
    const stickyBookAction = document.getElementById('btnStickyBookAction');
    if (stickyBookAction) {
        stickyBookAction.href = bookingUrl;
    }
}

function animatePriceChange(elementId, newPrice) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = `${Number(newPrice || 0).toLocaleString('vi-VN')} VNĐ`;
    }
}

function setupTimelineAndBenefits() {
    if (!serviceData) return;

    // Key Benefits
    const benefitsContainer = document.getElementById('benefitsGridContainer');
    if (benefitsContainer) {
        let benefits = [
            'Nuôi dưỡng chuyên sâu làn da và bộ lông thú cưng',
            'Khử mùi hôi cơ thể triệt để, giữ hương thơm mát dài lâu',
            'Cắt móng và vệ sinh an toàn tuyệt đối ngừa cào xước',
            'Sử dụng 100% dòng sản phẩm hữu cơ nhập khẩu an toàn'
        ];

        if (serviceData.benefits) {
            const rawBenefits = serviceData.benefits.split(/[;.\n]/).map(b => b.trim()).filter(b => b.length > 0);
            if (rawBenefits.length > 0) benefits = rawBenefits;
        }

        benefitsContainer.innerHTML = benefits.map(b => `
            <div class="benefit-card">
                <span class="benefit-icon">✓</span>
                <span class="benefit-text">${b.replace(/&/g, 'và')}</span>
            </div>
        `).join('');
    }

    // Checklist Timeline
    const timeline = document.getElementById('checklistTimeline');
    if (!timeline) return;

    let checklist = [
        { step: 'Kiểm tra sơ bộ', desc: 'Tiếp nhận bé, phân tích tình trạng da lông và tư vấn' },
        { step: 'Cắt và mài móng', desc: 'Vệ sinh móng chân sạch sẽ, bo tròn góc sắc ngừa cào xước' },
        { step: 'Vệ sinh tai mắt', desc: 'Nhỏ dung dịch chuyên dụng làm sạch sâu kẽ tai và tuyến nước mắt' },
        { step: 'Tắm sạch lần 1', desc: 'Tắm sạch sâu loại bỏ toàn bộ bụi bẩn bám dính trên da lông' },
        { step: 'Tắm dưỡng lần 2', desc: 'Sử dụng dầu tắm cao cấp nuôi dưỡng và làm mềm mượt lớp lông' },
        { step: 'Vắt tuyến hôi', desc: 'Triệt tiêu ổ vi khuẩn và khử mùi hôi đặc trưng hậu môn' },
        { step: 'Sấy khô tạo phồng', desc: 'Sấy bằng luồng khí ấm chuyên dụng kết hợp chải tơi lông' },
        { step: 'Chải lông hoàn thiện', desc: 'Xịt dưỡng chất thơm thiên nhiên bảo vệ lông da hoàn chỉnh' }
    ];

    if (serviceData.checklist) {
        const rawSteps = serviceData.checklist.split(/[;\n]/).map(s => s.trim()).filter(s => s.length > 0);
        if (rawSteps.length > 0) {
            checklist = rawSteps.map((stepText, idx) => {
                let title = `Bước ${idx + 1}`;
                let desc = stepText;
                if (stepText.includes(':')) {
                    const parts = stepText.split(':');
                    title = parts[0].trim();
                    desc = parts.slice(1).join(':').trim();
                }
                return { step: title, desc: desc };
            });
        }
    }

    const MAX_VISIBLE_STEPS = 6;
    timeline.innerHTML = checklist.map((item, idx) => `
        <div class="timeline-step-item ${idx >= MAX_VISIBLE_STEPS ? 'd-none collapsed-step' : ''}" id="timelineStep-${idx}">
            <div class="timeline-step-badge">${idx + 1}</div>
            <div class="timeline-step-content">
                <h4 class="timeline-step-title">${item.step.replace(/&/g, 'và')}</h4>
                <p class="timeline-step-desc">${item.desc.replace(/&/g, 'và')}</p>
            </div>
        </div>
    `).join('');

    const toggleBtn = document.getElementById('timelineToggleBtn');
    if (toggleBtn && checklist.length > MAX_VISIBLE_STEPS) {
        toggleBtn.hidden = false;
        let isExpanded = false;
        toggleBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;
            const hiddenSteps = timeline.querySelectorAll('.collapsed-step');
            if (isExpanded) {
                hiddenSteps.forEach(el => el.classList.remove('d-none'));
                toggleBtn.textContent = 'Rút gọn quy trình';
            } else {
                hiddenSteps.forEach(el => el.classList.add('d-none'));
                toggleBtn.textContent = `Xem thêm ${checklist.length - MAX_VISIBLE_STEPS} bước quy trình`;
            }
        });
        toggleBtn.textContent = `Xem thêm ${checklist.length - MAX_VISIBLE_STEPS} bước quy trình`;
    } else if (toggleBtn) {
        toggleBtn.hidden = true;
    }
}

function setupAmenities() {
    if (!serviceData) return;

    const amenitiesGrid = document.getElementById('amenitiesGrid');
    const tabBtn = document.getElementById('tabBtnAmenities');
    if (!amenitiesGrid) return;

    let amenities = [
        'Phòng điều hòa mát lạnh 24/7 duy trì 24 - 26°C',
        'Camera IP giám sát trực tiếp cho phụ huynh theo dõi từ xa',
        'Máy sấy êm ái giảm tiếng ồn chuyên dụng chống hoảng sợ',
        'Khử trùng tia cực tím UV và khử khuẩn bề mặt mỗi ngày',
        'Bác sĩ thú y túc trực hỗ trợ khẩn cấp 24/7',
        'Khu vực vui chơi tương tác vận động giải tỏa căng thẳng'
    ];

    if (serviceData.amenities) {
        const customAmenities = serviceData.amenities.split(/[;.\n,]/).map(a => a.trim()).filter(a => a.length > 0);
        if (customAmenities.length > 0) amenities = customAmenities;
    }

    amenitiesGrid.innerHTML = amenities.map(item => `<li>${item.replace(/&/g, 'và')}</li>`).join('');
}

function setupFAQs() {
    const container = document.getElementById('faqList');
    if (!container) return;

    const faqs = [
        { q: 'Gói dịch vụ này có phát sinh thêm phụ phí nào khác không?', a: 'Giá dịch vụ sẽ dựa trên cấu hình cân nặng và cấp bậc nhân viên do bạn chọn ở trên. PawPal cam kết không tự ý thu thêm bất kỳ khoản phí ngoài nào nếu không có sự đồng ý trước của gia đình.' },
        { q: 'Quy trình sấy khô có làm bé cưng bị hoảng sợ hay bỏng không?', a: 'Dạ hoàn toàn không ạ! PawPal sử dụng máy sấy luồng gió ấm chuyên dụng giảm tiếng ồn xuống mức thấp nhất, kết hợp với các kỹ thuật trấn an giúp bé thư giãn, không làm bé bị giật mình hay bỏng rát.' },
        { q: 'Tôi có cần đặt lịch trước bao lâu?', a: 'PawPal khuyến khích bạn đặt lịch trước ít nhất 1 ngày để chúng em có thể sắp xếp chuyên viên phù hợp và chuẩn bị chu đáo nhất đón bé ạ.' }
    ];

    container.innerHTML = faqs.map((faq, idx) => `
        <div class="faq-accordion-item">
            <button class="faq-accordion-trigger" onclick="toggleFaqAccordion('faqAcc-${idx}')">
                <span>${faq.q}</span>
                <span class="faq-accordion-icon">▼</span>
            </button>
            <div class="faq-accordion-panel d-none" id="faqAcc-${idx}">
                <p style="margin:0;">${faq.a}</p>
            </div>
        </div>
    `).join('');

    window.toggleFaqAccordion = function (id) {
        const panel = document.getElementById(id);
        if (!panel) return;
        const trigger = panel.previousElementSibling;

        const isHidden = panel.classList.contains('d-none') || panel.style.display === 'none';
        if (isHidden) {
            panel.classList.remove('d-none');
            if (trigger) trigger.classList.add('active');
            if (typeof gsap !== 'undefined') {
                gsap.set(panel, { display: 'block', height: 0, opacity: 0 });
                gsap.to(panel, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' });
            }
        } else {
            if (trigger) trigger.classList.remove('active');
            if (typeof gsap !== 'undefined') {
                gsap.to(panel, {
                    height: 0, opacity: 0, duration: 0.25, ease: 'power2.in',
                    onComplete: () => {
                        panel.classList.add('d-none');
                        panel.style.display = '';
                    }
                });
            } else {
                panel.classList.add('d-none');
            }
        }
    };
}

let reviewsList = [];
let filteredReviews = [];
let currentReviewPage = 1;
const reviewsPerPage = 5;
let selectedStarFilter = 'all';
let selectedVariantFilter = 'all';

async function setupReviews() {
    if (!serviceData) return;

    let rawReviews = [];
    if (window.DataLoader && typeof window.DataLoader.getServiceReviews === 'function') {
        try {
            const dynamicReviews = await window.DataLoader.getServiceReviews(serviceData.dbId || serviceData.serviceId);
            if (dynamicReviews && dynamicReviews.length > 0) {
                rawReviews = dynamicReviews;
            }
        } catch (err) {
            console.warn('Could not load dynamic reviews:', err);
        }
    }

    if (rawReviews.length === 0 && Array.isArray(serviceData.reviews) && serviceData.reviews.length > 0) {
        rawReviews = serviceData.reviews;
    }

    if (rawReviews.length === 0) {
        rawReviews = [
            {
                customerName: 'Trần Thị Bích',
                tier: 'gold',
                tierName: 'Hội viên Vàng',
                rating: 5,
                createdAt: '2026-06-18',
                variant: 'Dưới 5kg',
                content: 'Các bạn nhân viên cắt tỉa rất đẹp, đúng ý mình. Bé Miu về nhà vui vẻ lắm, không bị stress.',
                media: ['/assets/images/services/spa.png'],
                hasMedia: true,
                shopReply: 'Cảm ơn chị Bích đã luôn tin tưởng PawPal! Chúc bé cưng luôn ngoan và khỏe mạnh, hẹn gặp lại chị và bé trong lần làm đẹp tới ạ.'
            },
            {
                customerName: 'Trần Thị Bích',
                tier: 'silver',
                tierName: 'Hội viên Bạc',
                rating: 4,
                createdAt: '2026-06-10',
                variant: '5 - 10kg',
                content: 'Bé cún nhà mình thơm tho suốt cả tuần luôn, đỉnh thật sự.',
                media: ['/assets/images/services/hotel.png'],
                hasMedia: true,
                shopReply: 'PawPal cảm ơn chị Bích đã dành lời khen ngợi cho đội ngũ Groomer. PawPal sẽ luôn nỗ lực giữ vững chất lượng phục vụ tốt nhất ạ!'
            },
            {
                customerName: 'Khách Vãng Lai Demo',
                tier: 'member',
                tierName: 'Thành viên',
                rating: 5,
                createdAt: '2026-05-28',
                variant: '10 - 20kg',
                content: 'Rất chuyên nghiệp! Lông bé nhà mình rối nùi mà các bạn gỡ được hết không bị cắt lẹm. 10 điểm!',
                media: [],
                hasMedia: false,
                shopReply: 'PawPal xin cảm ơn đánh giá tuyệt vời của bạn ạ!'
            },
            {
                customerName: 'Lê Hoàng Anh',
                tier: 'member',
                tierName: 'Thành viên',
                rating: 4,
                createdAt: '2026-05-20',
                variant: 'Dưới 5kg',
                content: 'Chất lượng dịch vụ xứng đáng với giá tiền. Không gian phòng Spa sạch sẽ, máy sấy êm ái không làm bé bị giật mình.',
                media: [],
                hasMedia: false,
                shopReply: 'PawPal cảm ơn anh Hoàng Anh đã tin tưởng và đồng hành cùng PawPal ạ.'
            }
        ];
    }

    // Determine available variant options for this service
    let availableVariants = [];
    if (serviceData.prices && typeof serviceData.prices === 'object' && Object.keys(serviceData.prices).length > 0) {
        availableVariants = Object.keys(serviceData.prices);
    }
    if (availableVariants.length === 0) {
        availableVariants = ['Dưới 5kg', '5 - 10kg', '10 - 20kg', 'Trên 20kg'];
    }

    reviewsList = rawReviews.map((r, idx) => {
        const rawRating = Number(r.rating) || 5;
        const normRating = rawRating > 5 ? Math.round(rawRating / 2) : Math.min(5, Math.max(1, Math.round(rawRating)));
        
        let assignedVariant = r.variant || r.weight;
        if (!assignedVariant || assignedVariant === 'Tiêu chuẩn') {
            assignedVariant = availableVariants[idx % availableVariants.length];
        }

        return {
            customerName: r.customerName || r.name || 'Khách hàng PawPal',
            tier: r.tier || 'member',
            tierName: r.tierName || (r.tier === 'gold' ? 'Hội viên Vàng' : r.tier === 'silver' ? 'Hội viên Bạc' : 'Thành viên'),
            rating: normRating,
            createdAt: r.createdAt || r.date || '2026-06-01',
            variant: assignedVariant,
            content: r.content || r.text || 'Dịch vụ rất tốt và chu đáo.',
            media: Array.isArray(r.media) ? r.media : (Array.isArray(r.images) ? r.images : []),
            hasMedia: Boolean((r.media && r.media.length > 0) || (r.images && r.images.length > 0)),
            shopReply: r.shopReply || r.sellerReply || null
        };
    });

    // Sample realistic feedback images for review demonstration if DB has no media
    reviewsList.forEach((r, idx) => {
        if ((!r.media || r.media.length === 0) && (idx === 0 || idx === 1)) {
            if (serviceData.images && serviceData.images.length > 1) {
                r.media = [serviceData.images[1]];
                r.hasMedia = true;
            } else if (serviceData.image) {
                r.media = [serviceData.image];
                r.hasMedia = true;
            }
        }
    });

    // Calculate rating statistics
    const totalCount = reviewsList.length;
    let sumRating = 0;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let mediaCount = 0;

    reviewsList.forEach(r => {
        const star = r.rating;
        counts[star] = (counts[star] || 0) + 1;
        sumRating += r.rating;
        if (r.hasMedia && r.media && r.media.length > 0) mediaCount++;
    });

    const avgScore = totalCount > 0 ? (sumRating / totalCount).toFixed(1) : (serviceData.rating || 5.0).toFixed(1);

    // Update Average Score & Summary UI
    const avgScoreEl = document.getElementById('averageScore');
    if (avgScoreEl) avgScoreEl.textContent = avgScore;

    const totalReviewsEl = document.getElementById('totalReviewsCount');
    if (totalReviewsEl) totalReviewsEl.textContent = `Dựa trên ${totalCount} lượt đánh giá thực tế`;

    const headerCountEl = document.getElementById('reviewsHeaderCount');
    if (headerCountEl) headerCountEl.textContent = `${totalCount} nhận xét`;

    const summaryStarsRow = document.getElementById('summaryStarsRow');
    if (summaryStarsRow) {
        const roundedAvg = Math.round(parseFloat(avgScore));
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star ${i <= roundedAvg ? 'filled' : ''}">★</span>`;
        }
        summaryStarsRow.innerHTML = starsHtml;
    }

    // Update Distribution Bars
    for (let star = 1; star <= 5; star++) {
        const cnt = counts[star] || 0;
        const pct = totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0;
        const barEl = document.getElementById(`bar${star}`);
        const cntEl = document.getElementById(`cnt${star}`);
        const pctEl = document.getElementById(`pct${star}`);

        if (barEl) barEl.style.width = `${pct}%`;
        if (cntEl) cntEl.textContent = cnt;
        if (pctEl) pctEl.textContent = `(${pct}%)`;
    }

    // Update Filter Chip Counts
    const chipCntAll = document.getElementById('chipCntAll');
    if (chipCntAll) chipCntAll.textContent = totalCount;

    for (let s = 1; s <= 5; s++) {
        const chipEl = document.getElementById(`chipCnt${s}`);
        if (chipEl) chipEl.textContent = counts[s] || 0;
    }

    const chipCntMedia = document.getElementById('chipCntMedia');
    if (chipCntMedia) chipCntMedia.textContent = mediaCount;

    // Render Variant Filter Chips
    const variantCounts = {};
    reviewsList.forEach(r => {
        const v = r.variant || 'Tiêu chuẩn';
        variantCounts[v] = (variantCounts[v] || 0) + 1;
    });

    const distinctVariants = Object.keys(variantCounts);
    const variantFilterRow = document.getElementById('reviewVariantFilterRow');
    const variantChipsContainer = document.getElementById('reviewVariantChips');

    if (distinctVariants.length > 0 && variantFilterRow && variantChipsContainer) {
        variantFilterRow.style.display = 'flex';
        let varHtml = `<button class="variant-filter-chip active" data-variant="all">Tất cả (${totalCount})</button>`;
        distinctVariants.forEach(v => {
            varHtml += `<button class="variant-filter-chip" data-variant="${v}">${v} (${variantCounts[v]})</button>`;
        });
        variantChipsContainer.innerHTML = varHtml;

        variantChipsContainer.querySelectorAll('.variant-filter-chip').forEach(btn => {
            btn.addEventListener('click', function() {
                variantChipsContainer.querySelectorAll('.variant-filter-chip').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                selectedVariantFilter = this.getAttribute('data-variant');
                applyReviewFilters();
            });
        });
    } else if (variantFilterRow) {
        variantFilterRow.style.display = 'none';
    }

    // Setup Star Filter Chips
    const starChips = document.querySelectorAll('.review-filter-chip');
    starChips.forEach(chip => {
        chip.addEventListener('click', function() {
            starChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            selectedStarFilter = this.getAttribute('data-filter');
            applyReviewFilters();
        });
    });

    applyReviewFilters();
}

function applyReviewFilters() {
    filteredReviews = reviewsList.filter(r => {
        let starMatch = true;
        if (selectedStarFilter === 'has_media' || selectedStarFilter === 'media') {
            starMatch = !!(r.hasMedia && r.media && r.media.length > 0);
        } else if (selectedStarFilter !== 'all') {
            const targetStar = parseInt(selectedStarFilter, 10);
            starMatch = (r.rating === targetStar);
        }

        let variantMatch = true;
        if (selectedVariantFilter !== 'all') {
            variantMatch = (r.variant === selectedVariantFilter);
        }

        return starMatch && variantMatch;
    });

    currentReviewPage = 1;
    renderReviewsPage();
}

window.openReviewImageLightbox = function(src) {
    let modal = document.getElementById('reviewImageLightbox');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reviewImageLightbox';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(20,40,30,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:99999;cursor:zoom-out;padding:20px;';
        modal.innerHTML = '<img id="reviewLightboxImg" style="max-width:90vw;max-height:85vh;border-radius:9px;box-shadow:0 12px 40px rgba(0,0,0,0.4);object-fit:contain;" src="" alt="Ảnh đánh giá phóng to">';
        modal.onclick = () => { modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }
    const imgEl = document.getElementById('reviewLightboxImg');
    if (imgEl) imgEl.src = src;
    modal.style.display = 'flex';
};

function renderReviewsPage() {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    if (filteredReviews.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-secondary">Không có đánh giá nào phù hợp với bộ lọc hiện tại.</div>';
        const paginationWrapper = document.getElementById('reviewsPaginationWrapper');
        if (paginationWrapper) paginationWrapper.style.display = 'none';
        return;
    }

    const start = (currentReviewPage - 1) * reviewsPerPage;
    const end = start + reviewsPerPage;
    const pageItems = filteredReviews.slice(start, end);

    let html = '';
    pageItems.forEach((r) => {
        let dateStr = r.createdAt || '2026-06-01';
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }
        const initial = r.customerName ? r.customerName.charAt(0).toUpperCase() : 'K';
        const normRating = r.rating;
        const variantText = r.variant || 'Dưới 5kg';
        
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star ${i <= normRating ? 'filled' : ''}">★</span>`;
        }

        html += `
            <div class="review-item" data-stars="${normRating}">
                <div class="review-header">
                    <div class="reviewer-avatar">${initial}</div>
                    <div class="reviewer-meta">
                        <div class="reviewer-top-row">
                            <div class="reviewer-info-left">
                                <span class="reviewer-name">${r.customerName || 'Khách hàng'}</span>
                                <div class="review-stars" aria-label="${normRating} sao">
                                    ${starsHtml}
                                </div>
                                <span class="review-verified-badge">Đã trải nghiệm dịch vụ tại PawPal</span>
                            </div>
                            <button class="review-helpful-btn" onclick="toggleReviewHelpful(this)">Hữu ích (0)</button>
                        </div>
                        <div class="review-meta-info">
                            <span class="review-date">${dateStr}</span>
                            <span class="review-meta-dot">•</span>
                            <span class="review-variant-tag">Phân loại: ${variantText}</span>
                        </div>
                        <div class="review-content">
                            <p class="review-text">${r.content}</p>
                            ${r.hasMedia && r.media && r.media.length > 0 ? `
                            <div class="review-media-list">
                                ${r.media.map(img => `<img src="${img}" alt="Ảnh đánh giá" class="review-media-thumb" onclick="openReviewImageLightbox('${img}')" title="Bấm để xem ảnh phóng to">`).join('')}
                            </div>
                            ` : ''}
                            ${r.shopReply ? `
                            <div class="seller-reply">
                                <div class="reply-header">Phản hồi từ PawPal Care:</div>
                                <div class="reply-content">${r.shopReply}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    renderReviewPagination();
}

function renderReviewPagination() {
    const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
    const paginationWrapper = document.getElementById('reviewsPaginationWrapper');
    const paginationUl = document.getElementById('reviewsPagination');

    if (!paginationWrapper || !paginationUl) return;

    if (totalPages <= 1) {
        paginationWrapper.style.display = 'none';
        return;
    }

    paginationWrapper.style.display = 'block';
    let html = `
        <li class="page-item ${currentReviewPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentReviewPage - 1}" aria-label="Previous">&lt;</a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${currentReviewPage === i ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    html += `
        <li class="page-item ${currentReviewPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentReviewPage + 1}" aria-label="Next">&gt;</a>
        </li>
    `;

    paginationUl.innerHTML = html;

    paginationUl.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'), 10);
            if (page > 0 && page <= totalPages && page !== currentReviewPage) {
                currentReviewPage = page;
                renderReviewsPage();
                const container = document.getElementById('reviewsContainer');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        });
    });
}

window.toggleReviewHelpful = function(btn) {
    if (!btn) return;
    btn.classList.toggle('active');
    const isActive = btn.classList.contains('active');
    btn.textContent = isActive ? 'Hữu ích (1)' : 'Hữu ích (0)';
};

window.openReviewImageLightbox = function(src) {
    let modal = document.getElementById('reviewImageLightboxModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reviewImageLightboxModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(20,40,30,0.85);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:99999;cursor:zoom-out;padding:20px;';
        modal.innerHTML = '<img id="reviewImageLightboxImg" style="max-width:90vw;max-height:85vh;border-radius:9px;box-shadow:0 12px 40px rgba(0,0,0,0.4);object-fit:contain;" src="" alt="Ảnh đánh giá phóng to">';
        modal.onclick = () => { modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }
    const imgEl = document.getElementById('reviewImageLightboxImg');
    if (imgEl) imgEl.src = src;
    modal.style.display = 'flex';
};

function setupStickyBarTrigger() {
    const bar = document.getElementById('stickyBookingBar');
    if (!bar) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            bar.classList.add('show');
        } else {
            bar.classList.remove('show');
        }
    }, { passive: true });
}

function setupWishlistAndShare() {
    const likeBtn = document.getElementById('btnLikeService');
    const shareBtn = document.getElementById('btnShareService');
    if (!likeBtn || !serviceData) return;

    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const phone = user ? user.phone : null;
    const serviceKey = phone ? `pawpal_wishlist_services_${phone}` : 'pawpal_wishlist_services_guest';
    const productKey = phone ? `pawpal_wishlist_${phone}` : 'pawpal_wishlist_guest';

    const savedWishlist = JSON.parse(localStorage.getItem(serviceKey) || '[]');
    currentLikedState = savedWishlist.includes(String(serviceData.dbId || serviceData.serviceId));

    updateLikeButtonUI();

    likeBtn.addEventListener('click', () => {
        let list = JSON.parse(localStorage.getItem(serviceKey) || '[]');
        const targetId = String(serviceData.dbId || serviceData.serviceId);
        if (currentLikedState) {
            list = list.filter(id => String(id) !== targetId);
            currentLikedState = false;
            showToast('Đã xóa dịch vụ khỏi danh sách yêu thích');
        } else {
            list.push(targetId);
            currentLikedState = true;
            showToast('Đã lưu dịch vụ vào danh sách yêu thích!');
        }
        
        if (window.saveWishlist) {
            const productIds = JSON.parse(localStorage.getItem(productKey) || '[]');
            window.saveWishlist(productIds, list);
        } else {
            localStorage.setItem(serviceKey, JSON.stringify(list));
        }
        
        updateLikeButtonUI();
    });

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href).then(() => {
                showToast('Đã sao chép liên kết chia sẻ dịch vụ!');
            }).catch(err => {
                console.error('Failed to copy link:', err);
            });
        });
    }
}

function updateLikeButtonUI() {
    const likeBtn = document.getElementById('btnLikeService');
    const likeText = document.getElementById('likeText');
    if (!likeBtn) return;

    if (currentLikedState) {
        likeBtn.classList.add('liked');
        if (likeText) likeText.textContent = 'Đã lưu yêu thích';
    } else {
        likeBtn.classList.remove('liked');
        if (likeText) likeText.textContent = 'Lưu yêu thích';
    }
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-custom toast-success';
    toast.innerHTML = `
        <div class="toast-custom-content">
            <span class="toast-custom-icon">✓</span>
            <span class="toast-custom-message">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    if (typeof gsap !== 'undefined') {
        gsap.fromTo(toast,
            { opacity: 0, y: 50, scale: 0.9 },
            { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
        );
    }

    setTimeout(() => {
        if (typeof gsap !== 'undefined') {
            gsap.to(toast, {
                opacity: 0,
                y: -20,
                duration: 0.3,
                onComplete: () => toast.remove()
            });
        } else {
            toast.remove();
        }
    }, 3000);
}

async function setupRelatedServices() {
    const container = document.getElementById('relatedServicesGrid');
    if (!container || !serviceData) return;

    if (typeof window.DataLoader === 'undefined' || typeof window.DataLoader.loadServices !== 'function') return;

    const allServices = await window.DataLoader.loadServices();
    if (!allServices || allServices.length === 0) return;
    
    let related = allServices.filter(s => s.category === serviceData.category && s.serviceId !== serviceData.serviceId);
    
    if (related.length < 4) {
        const others = allServices.filter(s => s.category !== serviceData.category && s.serviceId !== serviceData.serviceId);
        related = related.concat(others);
    }
    
    related = related.slice(0, 4);

    if (related.length === 0) {
        if (container.parentElement) container.parentElement.classList.add('d-none');
        return;
    }

    container.innerHTML = related.map(service => {
        let displayCategory = 'Dịch vụ';
        if (service.category === 'spa') displayCategory = 'Spa và Làm đẹp';
        else if (service.category === 'hotel') displayCategory = 'Khách sạn thú cưng';
        else if (service.category === 'taxi') displayCategory = 'Taxi đưa đón';

        const formattedPrice = (service.price || 0).toLocaleString('vi-VN');
        const priceUnit = (service.priceDisplay || '').includes('đêm') ? ' / đêm' : '';

        const memberPrice = Math.round((service.price || 0) * 0.95);
        const formattedMemberPrice = memberPrice.toLocaleString('vi-VN');

        const sanitizedDesc = (service.description || '').replace(/&/g, 'và');
        const sanitizedName = (service.name || '').replace(/&/g, 'và');

        return `
            <div class="service-card" data-id="${service.serviceId}">
                <a href="service-detail.html?id=${service.serviceId}" class="service-card-link">
                    <div class="service-image-wrapper">
                        <span class="service-category-badge">${displayCategory}</span>
                        <img src="${service.image}" alt="${sanitizedName}" class="service-image" loading="lazy" onerror="this.onerror=null; this.src='/assets/images/services/${service.category === 'hotel' ? 'hotel.png' : 'spa.png'}'">
                    </div>
                    <div class="service-card-info">
                        <div class="service-card-header">
                            <span class="service-card-id">${service.serviceId}</span>
                            <div class="service-card-rating">
                                <span>⭐</span>
                                <span>${(service.rating || 5).toFixed(1)} (${service.reviewCount || 0})</span>
                            </div>
                        </div>
                        <h3 class="service-card-title">${sanitizedName}</h3>
                        <p class="service-card-desc">${sanitizedDesc}</p>
                        
                        <div class="service-card-meta">
                            <div class="service-meta-item">
                                <span>🐾</span>
                                <span>${service.petType} (${(service.weightClass || 'Tất cả').replace(/&/g, 'và')})</span>
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
                        <div class="service-card-member-price-row">
                            <span class="member-price-label">Thành viên:</span>
                            <span class="service-card-member-price">
                                <span>${formattedMemberPrice} VNĐ<span class="service-card-price-unit">${priceUnit}</span></span>
                                <span class="member-badge">PawPass Bạc (-5%)</span>
                            </span>
                        </div>
                    </div>
                </a>
                <div class="service-card-actions">
                    <a href="../booking/booking.html?service=${service.serviceId}" class="service-btn-book">Đặt lịch ngay</a>
                </div>
            </div>
        `;
    }).join('');
}
