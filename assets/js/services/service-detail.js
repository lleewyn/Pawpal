// ==========================================================================
// service-detail.js — Public Service Detail Interactive Logic (Section 3.1.4)
// ==========================================================================

let serviceData = null;
let selectedPetType = 'Chó';
let selectedWeight = 'Dưới 5kg';
let selectedGroomer = 'junior';
let currentLikedState = false;

let galleryImages = [];
let currentImageIndex = 0;
let autoSlideTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Parse URL ID
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('id');

    if (!serviceId) {
        window.location.href = 'services.html';
        return;
    }

    // 2. Load Service Data
    try {
        if (window.DataLoader && typeof window.DataLoader.getServiceById === 'function') {
            serviceData = await window.DataLoader.getServiceById(serviceId);
            if (!serviceData) {
                showNotFound();
                return;
            }

            // Populate Details
            populateServiceInfo();
            setupGallery();
            setupTimelineAndBenefits();
            setupAmenities();
            setupFAQs();
            setupReviews();
            setupStickyBarTrigger();
            setupWishlistAndShare();

            // Initial Price Recalculation
            recalculatePrice();
        } else {
            console.error('DataLoader not initialized');
            showNotFound();
        }
    } catch (e) {
        console.error('Error loading service details:', e);
        showNotFound();
    }
});

// Show fallback if service id is invalid
function showNotFound() {
    const main = document.querySelector('.service-detail-main');
    if (main) {
        main.innerHTML = `
            <div class="container-xl text-center" style="padding: 100px 20px;">
                <h2 style="color: var(--color-primary); font-family: var(--font-heading); margin-bottom: 20px;">Không tìm thấy dịch vụ</h2>
                <p style="color: var(--color-text-light); margin-bottom: var(--space-md);">Dịch vụ này không tồn tại hoặc đã tạm dừng hoạt động.</p>
                <a href="services.html" class="btn-cta">Quay lại danh sách dịch vụ</a>
            </div>
        `;
    }
}

// 1. Populate Service Info text
function populateServiceInfo() {
    document.getElementById('detailServiceId').textContent = serviceData.serviceId;
    document.getElementById('detailServiceTitle').textContent = serviceData.name.replace(/&/g, 'và');
    document.getElementById('detailRatingScore').textContent = `${serviceData.rating.toFixed(1)} / 5`;
    document.getElementById('detailRatingCount').textContent = `(${serviceData.reviewCount} đánh giá thực tế)`;
    document.getElementById('detailPetType').textContent = serviceData.petType;
    document.getElementById('detailWeightClass').textContent = serviceData.weightClass.replace(/&/g, 'và');
    document.getElementById('detailDuration').textContent = serviceData.duration || 'Đang cập nhật';

    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = serviceData.status;

    const btnPanelBook = document.getElementById('btnPanelBook');
    if (btnPanelBook) {
        btnPanelBook.href = `booking.html?service=${serviceData.serviceId}`;
    }

    if (serviceData.status !== 'Đang phục vụ') {
        statusEl.style.color = 'var(--color-danger)';
        const stickyBtn = document.getElementById('btnStickyBookAction');
        if (stickyBtn) {
            stickyBtn.textContent = 'Tạm dừng nhận lịch';
            stickyBtn.style.background = 'var(--color-neutral)';
            stickyBtn.style.pointerEvents = 'none';
        }
        if (btnPanelBook) {
            btnPanelBook.textContent = 'Tạm dừng nhận lịch';
            btnPanelBook.style.background = 'var(--color-neutral)';
            btnPanelBook.style.pointerEvents = 'none';
        }
    }
}

// 2. Set up gallery & thumbnails
function setupGallery() {
    const mainImg = document.getElementById('mainShowcaseImg');
    mainImg.onerror = function () {
        this.onerror = null;
        this.src = '../../assets/images/services/' + (serviceData.category === 'hotel' ? 'hotel.png' : 'spa.png');
    };
    mainImg.src = '../../' + serviceData.image;

    const thumbsContainer = document.getElementById('galleryThumbnails');
    if (!thumbsContainer) return;

    // Build image list (main service image + 2 fallback shots)
    const rawImages = [
        serviceData.image,
        'assets/images/services/spa.png',
        'assets/images/services/hotel.png'
    ];
    galleryImages = rawImages.map(url => '../../' + url);
    currentImageIndex = 0;

    thumbsContainer.innerHTML = rawImages.map((imgUrl, index) => `
        <div class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}">
            <img src="../../${imgUrl}" alt="Ảnh chi tiết ${index + 1}" class="gallery-thumb-img" onerror="this.onerror=null; this.src='../../assets/images/services/spa.png'">
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

    // Arrow navigation
    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    if (prevBtn) prevBtn.addEventListener('click', () => navigateGallery(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateGallery(1));

    startAutoSlide();
}

function updateMainImage(index) {
    const mainImg = document.getElementById('mainShowcaseImg');
    const thumbsContainer = document.getElementById('galleryThumbnails');
    if (!mainImg) return;

    thumbsContainer.querySelectorAll('.gallery-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === index);
    });

    gsap.to(mainImg, {
        opacity: 0.1,
        duration: 0.15,
        onComplete: () => {
            mainImg.src = galleryImages[index];
            gsap.to(mainImg, { opacity: 1, duration: 0.25 });
        }
    });
}

function navigateGallery(direction) {
    if (galleryImages.length === 0) return;
    currentImageIndex = (currentImageIndex + direction + galleryImages.length) % galleryImages.length;
    updateMainImage(currentImageIndex);
    resetAutoSlide();
}

function startAutoSlide() {
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

// 3. Set up configuration selection pill buttons
function setupConfigurator() {
    // A. Pet Type Option
    const petGroup = document.getElementById('petTypeGroup');
    const petOptions = document.getElementById('petTypeOptions');

    const rawPet = serviceData.petType;
    if (rawPet.includes('/') || rawPet.toLowerCase().includes('và')) {
        // Both dog and cat supported
        petGroup.style.display = 'block';
        petOptions.innerHTML = `
            <button class="config-pill-btn active" data-val="Chó">Chó cún</button>
            <button class="config-pill-btn" data-val="Mèo">Mèo con</button>
        `;
        petOptions.querySelectorAll('.config-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                petOptions.querySelectorAll('.config-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedPetType = btn.getAttribute('data-val');
                recalculatePrice();
            });
        });
    } else {
        selectedPetType = rawPet.includes('Chó') ? 'Chó' : (rawPet.includes('Mèo') ? 'Mèo' : 'Tất cả');
    }

    // B. Weight Class Options
    const weightOptions = document.getElementById('weightClassOptions');
    const rawWeight = serviceData.weightClass;

    let weightList = ['Dưới 5kg', '5kg - 10kg', 'Trên 10kg']; // Default choices
    if (rawWeight.includes('/') || rawWeight.includes('–')) {
        weightList = rawWeight.split(/[\/–]/).map(w => w.trim());
    } else if (rawWeight !== 'Tất cả' && !rawWeight.includes('Tất cả')) {
        weightList = [rawWeight];
    }

    weightOptions.innerHTML = weightList.map((w, idx) => `
        <button class="config-pill-btn ${idx === 0 ? 'active' : ''}" data-val="${w}">${w.replace(/&/g, 'và')}</button>
    `).join('');

    selectedWeight = weightList[0];

    weightOptions.querySelectorAll('.config-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            weightOptions.querySelectorAll('.config-pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedWeight = btn.getAttribute('data-val');
            recalculatePrice();
        });
    });

    // C. Groomer Selection Level (Only for Spa Category)
    const groomerGroup = document.getElementById('groomerGroup');
    if (serviceData.category === 'spa') {
        groomerGroup.style.display = 'block';
        const groomerOpts = document.getElementById('groomerOptions');
        groomerOpts.querySelectorAll('.config-pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                groomerOpts.querySelectorAll('.config-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedGroomer = btn.getAttribute('data-level');
                recalculatePrice();
            });
        });
    }
}

// 4. Calculate prices with weight and staff surcharge
function recalculatePrice() {
    let finalPrice = serviceData.price;

    // A. Staff level surcharge
    if (serviceData.category === 'spa') {
        if (selectedGroomer === 'senior') {
            finalPrice += 50000;
        } else if (selectedGroomer === 'master') {
            finalPrice += 100000;
        }
    }

    // B. Weight level surcharge
    // If user picks heavier weight options, we add a logical 40,000 phụ thu per level
    const weightOptions = Array.from(document.querySelectorAll('#weightClassOptions .config-pill-btn'));
    const selectedIdx = weightOptions.findIndex(b => b.classList.contains('active'));
    if (selectedIdx > 0) {
        finalPrice += (selectedIdx * 40000);
    }

    // C. Calculate member tier prices
    const silverPrice = Math.round(finalPrice * 0.95);
    const goldPrice = Math.round(finalPrice * 0.90);
    const diamondPrice = Math.round(finalPrice * 0.85);

    // D. Update UI
    animatePriceChange('detailBasePrice', finalPrice);
    animatePriceChange('priceTierSilver', silverPrice);
    animatePriceChange('priceTierGold', goldPrice);
    animatePriceChange('priceTierDiamond', diamondPrice);
    animatePriceChange('stickyPriceVal', finalPrice);

    // E. Update booking URLs
    const bookingParams = new URLSearchParams({
        service: serviceData.serviceId,
        petType: selectedPetType,
        weight: selectedWeight,
        groomer: selectedGroomer,
        price: finalPrice
    });

    const bookingUrl = `booking.html?${bookingParams.toString()}`;
    const stickyBookAction = document.getElementById('btnStickyBookAction');
    if (stickyBookAction) {
        stickyBookAction.href = bookingUrl;
    }
}

// Simple text transition for price update
function animatePriceChange(elementId, newPrice) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = `${newPrice.toLocaleString('vi-VN')} VNĐ`;
    }
}

// 5. Populate benefits and timeline checklist
function setupTimelineAndBenefits() {
    // Benefits
    const benefitsList = document.getElementById('benefitsList');
    let benefits = [
        'Nuôi dưỡng chuyên sâu làn da và lông thú cưng',
        'Khử mùi hôi cơ thể triệt để, giữ hương thơm lên đến 7 ngày',
        'Cắt móng và mài dũa an toàn chống cào xước'
    ];

    if (serviceData.benefits) {
        benefits = serviceData.benefits.split(/[;.\n]/).map(b => b.trim()).filter(b => b.length > 0);
    }

    benefitsList.innerHTML = benefits.map(b => `<li>${b.replace(/&/g, 'và')}</li>`).join('');

    // Timeline
    const timeline = document.getElementById('checklistTimeline');
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
        const rawSteps = serviceData.checklist.split(/[;.\n]/).map(s => s.trim()).filter(s => s.length > 0);
        if (rawSteps.length > 0) {
            checklist = rawSteps.map((stepText, idx) => {
                const parts = stepText.split(':');
                const title = parts[0] || `Bước ${idx + 1}`;
                const desc = parts[1] || 'Tiến hành chăm sóc kỹ lưỡng chuẩn y khoa';
                return { step: title.trim(), desc: desc.trim() };
            });
        }
    }

    timeline.innerHTML = checklist.map((item, idx) => `
        <div class="timeline-step-item" id="timelineStep-${idx}">
            <div class="timeline-bullet"></div>
            <div class="timeline-step-content">
                <h4 class="timeline-step-title">Bước ${idx + 1}: ${item.step}</h4>
                <p class="timeline-step-desc">${item.desc}</p>
            </div>
        </div>
    `).join('');

    // GSAP ScrollTrigger to activate steps on scroll
    setTimeout(() => {
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            checklist.forEach((item, idx) => {
                const stepEl = document.getElementById(`timelineStep-${idx}`);
                ScrollTrigger.create({
                    trigger: stepEl,
                    start: 'top 80%',
                    onEnter: () => stepEl.classList.add('active'),
                    onLeaveBack: () => stepEl.classList.remove('active')
                });
            });
        } else {
            // Fallback: make all active
            document.querySelectorAll('.timeline-step-item').forEach(el => el.classList.add('active'));
        }
    }, 400);
}

// 6. Amenities Bento
function setupAmenities() {
    const container = document.getElementById('amenitiesGrid');
    if (!container) return;

    let amenities = [];
    if (serviceData.amenities) {
        amenities = serviceData.amenities.split(/[,;\n]/).map(a => a.trim()).filter(a => a.length > 0);
    }

    if (amenities.length === 0) {
        amenities = ['Phòng điều hòa 26 độ C', 'Máy sấy giảm tiếng ồn', 'Dầu tắm thảo dược dịu nhẹ'];
    }

    container.innerHTML = amenities.map(amenity => `
        <div class="amenity-card-item">
            <div class="amenity-icon-wrapper">
                <svg class="amenity-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h4 class="amenity-title-label">${amenity.replace(/&/g, 'và')}</h4>
            <p class="amenity-desc-text">PawPal trang bị cơ sở vật chất hiện đại bậc nhất, mang lại cảm giác thoải mái nhất cho bé cưng.</p>
        </div>
    `).join('');
}

// 7. FAQs accordion
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
            <div class="faq-accordion-panel" id="faqAcc-${idx}" style="display: none;">
                <p style="margin:0;">${faq.a}</p>
            </div>
        </div>
    `).join('');

    // Register global toggle function
    window.toggleFaqAccordion = function (id) {
        const panel = document.getElementById(id);
        const trigger = panel.previousElementSibling;

        if (panel.style.display === 'none') {
            trigger.classList.add('active');
            gsap.set(panel, { display: 'block', height: 0, opacity: 0 });
            gsap.to(panel, {
                height: 'auto',
                opacity: 1,
                duration: 0.3,
                ease: 'power2.out'
            });
        } else {
            trigger.classList.remove('active');
            gsap.to(panel, {
                height: 0,
                opacity: 0,
                duration: 0.25,
                ease: 'power2.in',
                onComplete: () => {
                    panel.style.display = 'none';
                }
            });
        }
    };
}

// 8. Reviews section setup (matches shop reviews)
let mockReviews = [];
function setupReviews() {
    // Populate score block
    document.getElementById('averageScore').textContent = serviceData.rating.toFixed(1);
    document.getElementById('totalReviewsCount').textContent = `Dựa trên ${serviceData.reviewCount} lượt đánh giá thực tế`;

    // Generate reviews based on rating and category
    mockReviews = [
        { name: 'N***A', tier: 'gold', tierName: 'Hội viên Vàng', rating: 5, date: '12/06/2026', text: 'Nhân viên cẩn thận tắm cho bé cún nhà mình rất kỹ, sấy lông phồng thơm mềm mượt lắm. Sẽ tiếp tục đặt lịch.', images: ['assets/images/services/spa.png'], sellerReply: 'Cảm ơn bạn đã tin tưởng PawPal ạ! Tụi em luôn mong được đón bé tới làm điệu tiếp nhé!' },
        { name: 'M***H', tier: 'silver', tierName: 'Hội viên Bạc', rating: 5, date: '10/06/2026', text: 'Bé mèo nhà mình rất nhát nước nhưng các bạn chuyên viên dỗ dành khéo lắm, tắm khô xong thơm tho sạch sẽ.', images: [] },
        { name: 'T***V', tier: 'diamond', tierName: 'Hội viên Kim Cương', rating: 4, date: '08/06/2026', text: 'Dịch vụ tốt, cơ sở vật chất phòng tắm ấm áp điều hòa dễ chịu. Đáng tiền lắm cưng.', images: ['assets/images/services/hotel.png'], sellerReply: 'PawPal rất vui vì mang lại trải nghiệm tốt cho bé. Nếu có góp ý gì thêm bạn cứ dặn nhé!' },
        { name: 'H***N', tier: 'silver', tierName: 'Hội viên Bạc', rating: 5, date: '05/06/2026', text: 'Phòng lưu trú sạch sẽ cách âm tốt, camera soi 24/7 rõ nét giúp mình đi công tác yên tâm tuyệt đối.', images: [] }
    ];

    renderReviewList('all');

    // Set up filter clickers
    const chips = document.querySelectorAll('.review-filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderReviewList(chip.getAttribute('data-filter'));
        });
    });

    // Setup Lightbox Close
    document.getElementById('btnLightboxClose').addEventListener('click', () => {
        document.getElementById('lightboxModal').style.display = 'none';
    });
    document.getElementById('lightboxModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('lightboxModal')) {
            document.getElementById('lightboxModal').style.display = 'none';
        }
    });
}

function renderReviewList(filter) {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    let filtered = [...mockReviews];
    if (filter === '5') {
        filtered = mockReviews.filter(r => r.rating === 5);
    } else if (filter === '4') {
        filtered = mockReviews.filter(r => r.rating >= 4);
    } else if (filter === 'media') {
        filtered = mockReviews.filter(r => r.images.length > 0);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--color-text-light);padding:20px;">Chưa có đánh giá phù hợp bộ lọc này.</p>';
        return;
    }

    container.innerHTML = filtered.map((r, idx) => {
        const initial = r.name.charAt(0);
        const starsText = '<span class="star filled" aria-hidden="true">★</span>'.repeat(r.rating) + '<span class="star" aria-hidden="true">★</span>'.repeat(5 - r.rating);

        return `
            <div class="review-item" data-stars="${r.rating}">
                <div class="review-header">
                    <div class="reviewer-avatar">${initial}</div>
                    <div class="reviewer-meta">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <div class="reviewer-name" style="margin-bottom: 0;">Khách hàng ${r.name}</div>
                            <div class="review-stars" aria-label="${r.rating} sao" style="margin-bottom: 0; font-size: 1.15em;">
                                ${starsText}
                            </div>
                        </div>
                        <span class="reviewer-tier-badge ${r.tier}">${r.tierName}</span>
                        <div class="review-meta-info">
                            <span class="review-date">${r.date}</span>
                        </div>
                    </div>
                </div>
                <div class="review-content">
                    <p>${r.text}</p>
                </div>
                ${r.images.length > 0 ? `
                <div class="review-media-list">
                    ${r.images.map(img => `
                        <img src="../../${img}" alt="Ảnh đính kèm" class="review-photo" onclick="openLightbox('../../${img}')">
                    `).join('')}
                </div>
                ` : ''}
                ${r.sellerReply ? `
                <div class="seller-reply">
                    <div class="seller-reply-title">Phản hồi của cửa hàng</div>
                    <div class="seller-reply-content">${r.sellerReply}</div>
                </div>
                ` : ''}
                <div class="review-actions">
                    <button class="btn-helpful" id="helpfulBtn-${filter}-${idx}" onclick="voteHelpful('helpfulBtn-${filter}-${idx}')" aria-label="Đánh dấu đánh giá này hữu ích">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        Hữu ích (${Math.floor(Math.random() * 10) + 1})
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Open Lightbox
window.openLightbox = function (src) {
    const modal = document.getElementById('lightboxModal');
    const img = document.getElementById('lightboxImg');
    img.src = src;
    modal.style.display = 'flex';
};

// Vote Helpful click
window.voteHelpful = function (btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.classList.toggle('active');
    // Using string matching to find and update count, as the structure has text and svg
    const htmlStr = btn.innerHTML;
    const match = htmlStr.match(/Hữu ích \((\d+)\)/);
    if (match) {
        let count = parseInt(match[1], 10);
        if (btn.classList.contains('active')) {
            count++;
        } else {
            count--;
        }
        btn.innerHTML = htmlStr.replace(/Hữu ích \(\d+\)/, `Hữu ích (${count})`);
    }
};

// 9. Sticky Bottom Booking Bar Trigger
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

// 10. Wishlist and Share action
function setupWishlistAndShare() {
    const likeBtn = document.getElementById('btnLikeService');
    const shareBtn = document.getElementById('btnShareService');

    // Check if liked in localStorage
    const savedWishlist = JSON.parse(localStorage.getItem('pawpal_wishlist_services') || '[]');
    currentLikedState = savedWishlist.includes(serviceData.serviceId);

    updateLikeButtonUI();

    likeBtn.addEventListener('click', () => {
        let list = JSON.parse(localStorage.getItem('pawpal_wishlist_services') || '[]');
        if (currentLikedState) {
            list = list.filter(id => id !== serviceData.serviceId);
            currentLikedState = false;
            showToast('Đã xóa dịch vụ khỏi danh sách yêu thích');
        } else {
            list.push(serviceData.serviceId);
            currentLikedState = true;
            showToast('Đã lưu dịch vụ vào danh sách yêu thích!');
        }
        localStorage.setItem('pawpal_wishlist_services', JSON.stringify(list));
        updateLikeButtonUI();
    });

    shareBtn.addEventListener('click', () => {
        // Copy current page URL to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Đã sao chép liên kết chia sẻ dịch vụ!');
        }).catch(err => {
            console.error('Failed to copy link:', err);
        });
    });
}

function updateLikeButtonUI() {
    const likeBtn = document.getElementById('btnLikeService');
    const likeText = document.getElementById('likeText');

    if (currentLikedState) {
        likeBtn.classList.add('liked');
        likeText.textContent = 'Đã lưu yêu thích';
    } else {
        likeBtn.classList.remove('liked');
        likeText.textContent = 'Lưu yêu thích';
    }
}

// Toast Helper
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
