
let currentLoadedProduct = null;
let cachedProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        if (productId && window.DataLoader) {
            const products = await window.DataLoader.loadProducts();
            cachedProducts = Array.isArray(products) ? products : [];
            const product = products.find(p => p.id.toString() === productId);
            if (product) {
                currentLoadedProduct = product;
                renderProductDetails(product);
            }
        }

    } catch (e) {
        console.error('Failed to load product data:', e);
    }

    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    const quantityInput = document.getElementById('quantity');
    
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', handleAddToCart);
    }
    
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', handleBuyNow);
    }

    const openReviewModalBtn = document.getElementById('openReviewModalBtn');
    if (openReviewModalBtn) {
        openReviewModalBtn.addEventListener('click', () => {
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) {
                showToast('Vui lòng đăng nhập để gửi đánh giá sản phẩm!', 'warning');
                return;
            }
            showToast('Chức năng gửi đánh giá đã sẵn sàng ghi nhận nhận xét của bạn!', 'success');
        });
    }

    function getWishlistStorageKey() {
        const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        return user && user.phone ? `pawpal_wishlist_${user.phone}` : 'pawpal_wishlist_guest';
    }

    function loadWishlistIds() {
        try {
            return JSON.parse(localStorage.getItem(getWishlistStorageKey()) || '[]');
        } catch {
            return [];
        }
    }

    function saveWishlistIds(ids) {
        const finalIds = Array.isArray(ids) ? ids : [];
        if (window.saveWishlist) {
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            const phone = user ? user.phone : null;
            const serviceKey = phone ? `pawpal_wishlist_services_${phone}` : 'pawpal_wishlist_services_guest';
            const serviceIds = JSON.parse(localStorage.getItem(serviceKey) || '[]');
            window.saveWishlist(finalIds, serviceIds);
        } else {
            localStorage.setItem(getWishlistStorageKey(), JSON.stringify(finalIds));
        }
    }

    function isProductInWishlist(productId) {
        const wishlist = loadWishlistIds();
        return wishlist.some(item => {
            if (item && typeof item === 'object' && item.id !== undefined) {
                return String(item.id) === String(productId);
            }
            return String(item) === String(productId);
        });
    }

    function updateWishlistButtonState(btn, productId) {
        if (!btn || !productId) return;
        if (isProductInWishlist(productId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    function toggleWishlistItem(productId) {
        const currentWishlist = loadWishlistIds();
        const idString = String(productId);
        const filtered = currentWishlist.filter(item => {
            if (item && typeof item === 'object' && item.id !== undefined) {
                return String(item.id) !== idString;
            }
            return String(item) !== idString;
        });

        const added = filtered.length === currentWishlist.length;
        if (added) {
            filtered.push(productId);
        }
        saveWishlistIds(filtered);
        return added;
    }

    function ensureWishlistButtons() {
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const productId = btn.dataset.productId;
            if (!productId) return;
            updateWishlistButtonState(btn, productId);
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                if (!user) {
                    showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                    return;
                }

                const added = toggleWishlistItem(productId);
                btn.classList.toggle('active', added);
                showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
            });
        });
    }

    const favoriteProductBtn = document.getElementById('favoriteProductBtn');
    const wishlistBtn = document.getElementById('wishlistBtn');

    function refreshProductWishlistButtons() {
        const productId = currentLoadedProduct?.id;
        if (!productId) return;

        const isWishlisted = isProductInWishlist(productId);
        if (favoriteProductBtn) {
            favoriteProductBtn.classList.toggle('active', isWishlisted);
        }
        if (wishlistBtn) {
            wishlistBtn.classList.toggle('active', isWishlisted);
        }
    }

    if (favoriteProductBtn) {
        if (currentLoadedProduct && isProductInWishlist(currentLoadedProduct.id)) {
            favoriteProductBtn.classList.add('active');
        }

        favoriteProductBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) {
                showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                return;
            }

            const productId = currentLoadedProduct?.id;
            if (!productId) {
                showToast('Không thể xác định sản phẩm yêu thích', 'error');
                return;
            }

            const added = toggleWishlistItem(productId);
            refreshProductWishlistButtons();
            const counter = document.getElementById('favoriteCounter');
            if (counter) {
                let current = parseInt(counter.textContent) || 120;
                counter.textContent = added ? `${current + 1} lượt thích` : `${Math.max(0, current - 1)} lượt thích`;
            }
            showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
        });
    }

    if (wishlistBtn) {
        if (currentLoadedProduct && isProductInWishlist(currentLoadedProduct.id)) {
            wishlistBtn.classList.add('active');
        }

        wishlistBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) {
                showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                return;
            }

            const productId = currentLoadedProduct?.id;
            if (!productId) {
                showToast('Không thể xác định sản phẩm yêu thích', 'error');
                return;
            }

            const added = toggleWishlistItem(productId);
            refreshProductWishlistButtons();
            showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
        });
    }

    ensureWishlistButtons();
    bindRelatedProductCards();

    const decreaseQtyBtn = document.getElementById('decreaseQty');
    const increaseQtyBtn = document.getElementById('increaseQty');

    if (decreaseQtyBtn && quantityInput) {
        decreaseQtyBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            if (val > 1) {
                quantityInput.value = val - 1;
            }
        });
    }

    if (increaseQtyBtn && quantityInput) {
        increaseQtyBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value) || 1;
            let max = parseInt(quantityInput.getAttribute('max')) || 99;
            if (val < max) {
                quantityInput.value = val + 1;
            }
        });
    }

    setTimeout(() => {
        const product = getCurrentProduct();
        const breadcrumbProduct = document.getElementById('breadcrumbProduct');
        if (breadcrumbProduct && product && product.name) {
            breadcrumbProduct.textContent = product.name;
        }
    }, 100);

    const galleryPrev = document.getElementById('galleryPrev');
    const galleryNext = document.getElementById('galleryNext');
    if (galleryPrev && galleryNext) {
        galleryPrev.addEventListener('click', () => navigateGallery(-1));
        galleryNext.addEventListener('click', () => navigateGallery(1));
    }

    initProductTabs();
});

function initProductTabs() {
    const tabs = document.querySelectorAll('.product-tabs-nav .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            document.querySelectorAll('.product-tabs-section .tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const activePanel = document.getElementById(`tab-${targetTab}`);
            if (activePanel) {
                activePanel.classList.add('active');
            }
        });
    });
}

let currentGalleryIndex = 0;

function navigateGallery(direction) {
    const thumbnails = document.querySelectorAll('#thumbnails .thumbnail');
    if (thumbnails.length <= 1) return;
    thumbnails[currentGalleryIndex].classList.remove('active');
    currentGalleryIndex = (currentGalleryIndex + direction + thumbnails.length) % thumbnails.length;
    thumbnails[currentGalleryIndex].classList.add('active');
    thumbnails[currentGalleryIndex].click();
}

let selectedVariantState = {
    name: '',
    price: 0,
    attributes: {}
};

function getProductAttributeGroups(product) {
    if (!product) return [];

    if (Array.isArray(product.attributeGroups) && product.attributeGroups.length > 0) {
        return product.attributeGroups;
    }

    const basePrice = Number(product.price) || 0;
    const cat = String(product.category || product.categoryName || '').toLowerCase();
    const name = String(product.name || '').toLowerCase();

    // 1. Thức ăn khô / Hạt (Whiskas, Royal Canin, Pedigree...)
    if (cat.includes('dry') || cat.includes('kho') || name.includes('hạt') || name.includes('hat') || name.includes('whiskas') || name.includes('royal')) {
        return [
            {
                name: 'Kích cỡ / Quy cách',
                key: 'size',
                options: [
                    { label: 'Gói 400g (Dùng thử)', priceDelta: -Math.round(basePrice * 0.45 / 1000) * 1000 },
                    { label: 'Gói 1.5kg (Tiêu chuẩn)', priceDelta: 0 },
                    { label: 'Bao 3.0kg (Tiết kiệm)', priceDelta: Math.round(basePrice * 0.85 / 1000) * 1000 }
                ]
            },
            {
                name: 'Hương vị',
                key: 'flavor',
                options: [
                    { label: 'Vị Cá biển thơm ngon', priceDelta: 0 },
                    { label: 'Vị Cá hồi và Rau củ', priceDelta: 5000 },
                    { label: 'Vị Thịt gà và Bò', priceDelta: 0 }
                ]
            }
        ];
    }

    // 2. Thức ăn ướt / Pate / Súp thưởng / Churu
    if (cat.includes('wet') || cat.includes('uot') || name.includes('pate') || name.includes('súp') || name.includes('sup') || name.includes('churu')) {
        return [
            {
                name: 'Hương vị',
                key: 'flavor',
                options: [
                    { label: 'Vị Cá hồi Na Uy', priceDelta: 0 },
                    { label: 'Vị Gà xé sốt nước dùng', priceDelta: 0 },
                    { label: 'Vị Bò tươi sốt Gravy', priceDelta: 5000 }
                ]
            },
            {
                name: 'Quy cách đóng gói',
                key: 'pack',
                options: [
                    { label: 'Lon đơn 85g', priceDelta: 0 },
                    { label: 'Lốc 3 lon (Tiết kiệm)', priceDelta: Math.round(basePrice * 1.8 / 1000) * 1000 },
                    { label: 'Hộp 6 lon (Đại tiệc)', priceDelta: Math.round(basePrice * 4.5 / 1000) * 1000 }
                ]
            }
        ];
    }

    // 3. Xương gặm / Bánh thưởng
    if (cat.includes('bone') || cat.includes('gam') || cat.includes('snack') || name.includes('xương') || name.includes('bánh')) {
        return [
            {
                name: 'Quy cách',
                key: 'pack',
                options: [
                    { label: 'Gói 1 chiếc (Dùng thử)', priceDelta: 0 },
                    { label: 'Gói 3 chiếc (Chuẩn)', priceDelta: Math.round(basePrice * 1.7 / 1000) * 1000 },
                    { label: 'Túi 5 chiếc (Tiết kiệm)', priceDelta: Math.round(basePrice * 3.2 / 1000) * 1000 }
                ]
            },
            {
                name: 'Mùi vị',
                key: 'flavor',
                options: [
                    { label: 'Vị Bò sữa thơm lừng', priceDelta: 0 },
                    { label: 'Vị Bạc hà sạch răng', priceDelta: 3000 }
                ]
            }
        ];
    }

    // 4. Sức khỏe / Chăm sóc / Vệ sinh
    if (cat.includes('health') || cat.includes('groom') || cat.includes('hygiene') || cat.includes('ve sinh') || name.includes('dầu') || name.includes('gel') || name.includes('cát')) {
        return [
            {
                name: 'Dung tích / Trọng lượng',
                key: 'vol',
                options: [
                    { label: 'Chai 250ml (Tiêu chuẩn)', priceDelta: 0 },
                    { label: 'Chai 500ml (Tiết kiệm)', priceDelta: Math.round(basePrice * 0.75 / 1000) * 1000 }
                ]
            },
            {
                name: 'Mùi hương / Công dụng',
                key: 'scent',
                options: [
                    { label: 'Hương Hoa cúc dịu nhẹ', priceDelta: 0 },
                    { label: 'Hương Trà xanh khử mùi', priceDelta: 5000 },
                    { label: 'Dưỡng lông mềm mượt', priceDelta: 10000 }
                ]
            }
        ];
    }

    // 5. Quần áo / Phụ kiện / Đồ chơi
    if (cat.includes('toy') || cat.includes('clothe') || cat.includes('accessories') || name.includes('vòng') || name.includes('áo') || name.includes('đồ chơi') || name.includes('dây')) {
        return [
            {
                name: 'Kích cỡ (Size)',
                key: 'size',
                options: [
                    { label: 'Size S (Thú cưng < 4kg)', priceDelta: 0 },
                    { label: 'Size M (Thú cưng 4 - 8kg)', priceDelta: 15000 },
                    { label: 'Size L (Thú cưng > 8kg)', priceDelta: 30000 }
                ]
            },
            {
                name: 'Màu sắc',
                key: 'color',
                options: [
                    { label: 'Xanh Forest Green', priceDelta: 0 },
                    { label: 'Vàng Kem Pastel', priceDelta: 0 },
                    { label: 'Cam Đất Ấm Áp', priceDelta: 0 }
                ]
            }
        ];
    }

    return [
        {
            name: 'Quy cách',
            key: 'spec',
            options: [
                { label: 'Bản Tiêu Chuẩn', priceDelta: 0 },
                { label: 'Bản Nâng Cấp Pro', priceDelta: Math.round(basePrice * 0.3 / 1000) * 1000 }
            ]
        }
    ];
}

function renderProductVariants(product) {
    const container = document.getElementById('pdVariantsSection');
    if (!container || !product) return;

    const attrGroups = getProductAttributeGroups(product);
    if (!attrGroups || attrGroups.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = '';

    const selectedOptions = {};
    attrGroups.forEach((group, idx) => {
        selectedOptions[idx] = group.options[0];
    });

    function updateCalculatedPrice() {
        const basePrice = Number(product.price) || 0;
        let totalDelta = 0;
        const parts = [];

        attrGroups.forEach((group, idx) => {
            const opt = selectedOptions[idx];
            if (opt) {
                totalDelta += (opt.priceDelta || 0);
                parts.push(opt.label);
            }
        });

        const finalPrice = Math.max(10000, basePrice + totalDelta);
        const variantName = parts.join(' • ');

        selectedVariantState = {
            name: variantName,
            price: finalPrice,
            attributes: { ...selectedOptions }
        };

        const priceEl = document.getElementById('productPrice');
        if (priceEl) {
            priceEl.textContent = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalPrice).replace('₫', 'đ');
        }
    }

    attrGroups.forEach((group, gIdx) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'pd-variant-group';

        const labelEl = document.createElement('div');
        labelEl.className = 'pd-variant-label';
        labelEl.innerHTML = `<span>${group.name}</span>`;

        const chipsEl = document.createElement('div');
        chipsEl.className = 'pd-variant-chips';

        group.options.forEach((opt, oIdx) => {
            const chipBtn = document.createElement('button');
            chipBtn.type = 'button';
            chipBtn.className = `pd-variant-chip ${oIdx === 0 ? 'active' : ''}`;
            chipBtn.textContent = opt.label;

            chipBtn.addEventListener('click', (e) => {
                e.preventDefault();
                chipsEl.querySelectorAll('.pd-variant-chip').forEach(c => c.classList.remove('active'));
                chipBtn.classList.add('active');
                selectedOptions[gIdx] = opt;
                updateCalculatedPrice();
            });

            chipsEl.appendChild(chipBtn);
        });

        groupEl.appendChild(labelEl);
        groupEl.appendChild(chipsEl);
        container.appendChild(groupEl);
    });

    updateCalculatedPrice();
}

async function handleAddToCart() {
    const product = getCurrentProduct();
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    if (!product) {
        showToast('Không thể thêm sản phẩm vào giỏ hàng', 'error');
        return;
    }
    
    if (product.stock === 0) {
        showToast('Sản phẩm đã hết hàng', 'error');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`Chỉ còn ${product.stock} sản phẩm trong kho`, 'error');
        return;
    }

    const itemToAdd = {
        ...product,
        price: selectedVariantState.price || product.price,
        selectedVariant: selectedVariantState.name || 'Tiêu chuẩn'
    };
    
    await addProductToCart(itemToAdd, quantity);
    showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
    await updateCartBadge();
}

function handleBuyNow() {
    const product = getCurrentProduct();
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    
    if (!product) {
        showToast('Không thể mua sản phẩm', 'error');
        return;
    }
    
    if (product.stock === 0) {
        showToast('Sản phẩm đã hết hàng', 'error');
        return;
    }
    
    if (quantity > product.stock) {
        showToast(`Chỉ còn ${product.stock} sản phẩm trong kho`, 'error');
        return;
    }
    
    const originalText = document.getElementById('buyNowBtn').innerHTML;
    document.getElementById('buyNowBtn').innerHTML = '<span>Đang xử lý...</span>';
    document.getElementById('buyNowBtn').disabled = true;
    
    setTimeout(() => {
        const finalPrice = selectedVariantState.price || product.price;
        const finalVariant = selectedVariantState.name || 'Tiêu chuẩn';

        const buyNowCart = [{
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: finalPrice,
            selectedVariant: finalVariant,
            quantity: quantity,
            image: product.image,
            stock: product.stock
        }];
        
        sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
        sessionStorage.setItem('pawpal_is_buynow', 'true');
        window.location.href = '/pages/shop/checkout/checkout.html?buynow=true';
    }, 500);
}

async function handleCardAddToCart(product) {
    if (!product || !product.inStock) {
        showToast('Sản phẩm không khả dụng', 'error');
        return;
    }
    const groups = getProductAttributeGroups(product);
    const defaultVariant = groups.length > 0 ? groups.map(g => g.options[0].label).join(' • ') : 'Tiêu chuẩn';

    await addProductToCart({
        ...product,
        selectedVariant: defaultVariant
    }, 1);
    await updateCartBadge();
    showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
}

function handleCardBuyNow(product) {
    if (!product || !product.inStock) {
        showToast('Sản phẩm không khả dụng', 'error');
        return;
    }

    const groups = getProductAttributeGroups(product);
    const defaultVariant = groups.length > 0 ? groups.map(g => g.options[0].label).join(' • ') : 'Tiêu chuẩn';

    const buyNowCart = [{
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        selectedVariant: defaultVariant,
        quantity: 1,
        image: product.image,
        stock: product.stock
    }];

    sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(buyNowCart));
    sessionStorage.setItem('pawpal_is_buynow', 'true');
    window.location.href = '/pages/shop/checkout/checkout.html?buynow=true';
}

function getCurrentProduct() {
    if (currentLoadedProduct) return currentLoadedProduct;
    
    try {
        const urlParams = new URLSearchParams(window.location.search);
        let productId = urlParams.get('id');
        
        if (!productId) {
            productId = 'prod_' + Date.now();
        }
        
        const titleElement = document.getElementById('productTitle');
        const brandElement = document.getElementById('productBrand');
        const priceElement = document.getElementById('productPrice');
        const imageElement = document.getElementById('mainImage');
        const stockElement = document.getElementById('stockRemaining');
        const categoryElement = document.getElementById('productCategory');
        
        const fallbackImage = '/assets/images/shop/products/placeholder.webp';
        const product = {
            id: productId,
            name: titleElement?.textContent?.trim() || 'Royal Canin Mini Adult',
            brand: brandElement?.textContent?.trim() || 'Royal Canin',
            price: parsePriceFromText(priceElement?.textContent || '250000') || 250000,
            image: imageElement?.src || fallbackImage,
            stock: parseInt(stockElement?.textContent || '99'),
            category: categoryElement?.textContent?.trim() || 'Thức ăn khô'
        };
        
        return product;
        
    } catch (error) {
        console.error('Error getting product data:', error);
        
        return {
            id: 'prod-fallback',
            name: 'Royal Canin Mini Adult',
            brand: 'Royal Canin',
            price: 250000,
            image: '/assets/images/shop/products/placeholder.webp',
            stock: 99,
            category: 'Thức ăn khô'
        };
    }
}

function getProductCatalog() {
    if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
        return Promise.resolve(cachedProducts);
    }

    if (window.DataLoader && typeof window.DataLoader.loadProducts === 'function') {
        return window.DataLoader.loadProducts().then(products => {
            cachedProducts = Array.isArray(products) ? products : [];
            return cachedProducts;
        }).catch(() => []);
    }

    return Promise.resolve([]);
}

async function bindRelatedProductCards() {
    const products = await getProductCatalog();
    if (!products || products.length === 0) return;

    const youMayLikeProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 5);
    
    const currentCategory = (typeof currentLoadedProduct !== 'undefined' && currentLoadedProduct) ? currentLoadedProduct.category : 'food-dry';
    const currentId = (typeof currentLoadedProduct !== 'undefined' && currentLoadedProduct) ? currentLoadedProduct.id : -1;
    let relatedProducts = products.filter(p => p.category === currentCategory && String(p.id) !== String(currentId)).slice(0, 5);
    
    if (relatedProducts.length < 5) {
        const more = products.filter(p => !relatedProducts.includes(p) && String(p.id) !== String(currentId)).slice(0, 5 - relatedProducts.length);
        relatedProducts.push(...more);
    }

    const generateCardHTML = (product) => {
        const priceFmt = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.price).replace('₫', 'đ');
        const oldPriceHTML = product.oldPrice ? '<span class="price-old">' + new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.oldPrice).replace('₫', 'đ') + '</span>' : '';
        const isWishlisted = typeof isProductInWishlist === 'function' && isProductInWishlist(product.id) ? 'active' : '';
        const stars = Array(5).fill(0).map((_, i) => '<span class="star ' + (i < Math.floor(product.rating || 5) ? 'filled' : '') + '"></span>').join('');
        
        return '<div class="product-card" onclick="window.location.href=\'/pages/shop/product-detail/product-detail.html?id=' + product.id + '\'">' +
            '<div class="product-card-image" role="link" tabindex="0" aria-label="Xem chi tiết ' + product.name + '">' +
                '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">' +
                '<button class="wishlist-btn ' + isWishlisted + '" aria-label="Thêm vào yêu thích" data-product-id="' + product.id + '">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' +
                '</button>' +
            '</div>' +
            '<div class="product-card-body">' +
                '<div class="product-brand">' + product.brand + '</div>' +
                '<h3 class="product-name">' + product.name + '</h3>' +
                '<div class="product-rating"><div class="stars">' + stars + '</div><span class="rating-count">(' + (product.reviewCount || 0) + ')</span></div>' +
                '<div class="product-price"><span class="price-current">' + priceFmt + '</span>' + oldPriceHTML + '</div>' +
                '<div class="product-card-actions">' +
                    '<button class="product-quick-add btn-add-cart" aria-label="Thêm vào giỏ" data-product-id="' + product.id + '">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>' +
                    '</button>' +
                    '<button class="product-buy-now btn-buy-now" data-product-id="' + product.id + '">Mua ngay</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    };

    const youMayLikeEl = document.getElementById('youMayLikeProducts');
    if (youMayLikeEl) youMayLikeEl.innerHTML = youMayLikeProducts.map(generateCardHTML).join('');

    const relatedEl = document.getElementById('relatedProducts');
    if (relatedEl) relatedEl.innerHTML = relatedProducts.map(generateCardHTML).join('');

    const sections = [youMayLikeEl, relatedEl].filter(Boolean);
    sections.forEach(section => {
        section.querySelectorAll('.product-card').forEach(card => {
            card.style.cursor = 'pointer';
            const productId = card.querySelector('.wishlist-btn') ? card.querySelector('.wishlist-btn').dataset.productId : null;
            if (!productId) return;
            const product = products.find(p => String(p.id) === String(productId));
            if (!product) return;

            const wishlist = card.querySelector('.wishlist-btn');
            if (wishlist) {
                wishlist.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                    if (!user) {
                        if(typeof showToast === 'function') showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                        return;
                    }
                    const added = typeof toggleWishlistItem === 'function' ? toggleWishlistItem(String(product.id)) : false;
                    wishlist.classList.toggle('active', added);
                    if(typeof showToast === 'function') showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
                });
            }

            const addBtn = card.querySelector('.product-quick-add');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if(typeof handleCardAddToCart === 'function') handleCardAddToCart(product);
                });
            }

            const buyBtn = card.querySelector('.product-buy-now');
            if (buyBtn) {
                buyBtn.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if(typeof handleCardBuyNow === 'function') handleCardBuyNow(product);
                });
            }
        });
    });
}

async function addProductToCart(product, quantity) {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    let cart = [];
    if (window.API && typeof window.API.getUserCart === 'function') {
        cart = await window.API.getUserCart(currentUser?.id || currentUser?.phone || null);
    }
    
    const targetVariant = product.selectedVariant || null;
    const existingIndex = cart.findIndex(item => {
        const isSameId = String(item.id) === String(product.id);
        if (!targetVariant) return isSameId;
        return isSameId && (item.selectedVariant === targetVariant);
    });
    
    if (existingIndex >= 0) {
        cart[existingIndex].quantity += quantity;
        
        if (cart[existingIndex].quantity > product.stock) {
            cart[existingIndex].quantity = product.stock;
            showToast(`Đã cập nhật số lượng tối đa: ${product.stock}`, 'warning');
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            selectedVariant: targetVariant,
            quantity: quantity,
            image: product.image,
            stock: product.stock
        });
    }
    
    if (window.API && typeof window.API.saveUserCart === 'function') {
        await window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, cart);
    }
}

async function updateCartBadge() {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    let cart = [];
    if (window.API && typeof window.API.getUserCart === 'function') {
        cart = await window.API.getUserCart(currentUser?.id || currentUser?.phone || null);
    }
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        cartBadge.textContent = totalItems;
        if (totalItems > 0) {
            cartBadge.classList.remove('d-none');
        }
    }
}

function parsePriceFromText(priceText) {
    if (!priceText) return 0;
    
    const numericOnly = priceText.toString().replace(/[^0-9]/g, '');
    const price = parseInt(numericOnly) || 0;
    
    console.log('Parsed price:', priceText, '->', price);
    return price;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        color: ${type === 'warning' ? '#000' : 'white'};
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        font-family: var(--font-body);
        font-size: 14px;
        min-width: 250px;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

const style = document.createElement('style');



style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

function renderProductDetails(product) {
    const breadcrumbCategory = document.getElementById('breadcrumbCategory');
    const breadcrumbProduct = document.getElementById('breadcrumbProduct');
    if (breadcrumbCategory) breadcrumbCategory.textContent = product.categoryName || 'Sản phẩm';
    if (breadcrumbProduct) breadcrumbProduct.textContent = product.name;

    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.src = product.image;
        mainImage.alt = product.name;
    }
    
    const thumbnailsContainer = document.getElementById('thumbnails');
    if (thumbnailsContainer && product.image) {
        thumbnailsContainer.innerHTML = '';
        const gallery = (product.images && product.images.length > 0) 
            ? product.images 
            : [product.image];
        
        gallery.forEach((imgSrc, index) => {
            const thumb = document.createElement('div');
            thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            
            const img = document.createElement('img');
            img.src = imgSrc;
            img.alt = `${product.name} - Thumbnail ${index + 1}`;
            
            thumb.appendChild(img);
            
            thumb.addEventListener('click', () => {
                document.querySelectorAll('#thumbnails .thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                if (mainImage) {
                    mainImage.src = imgSrc;
                }
                if (typeof currentGalleryIndex !== 'undefined') {
                    currentGalleryIndex = index;
                }
            });
            
            thumbnailsContainer.appendChild(thumb);
        });
    }
    
    const productBrand = document.getElementById('productBrand');
    if (productBrand) productBrand.textContent = product.brand;
    
    const productTitle = document.getElementById('productTitle');
    if (productTitle) productTitle.textContent = product.name;
    
    const productPrice = document.getElementById('productPrice');
    if (productPrice) productPrice.textContent = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.price).replace('₫', 'đ');
    
    const productPriceOld = document.getElementById('productPriceOld');
    const productDiscount = document.getElementById('productDiscount');
    if (product.oldPrice && product.oldPrice > product.price) {
        if (productPriceOld) {
            productPriceOld.textContent = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.oldPrice).replace('₫', 'đ');
            productPriceOld.classList.remove('d-none');
        }
        if (productDiscount) {
            productDiscount.textContent = 'Tiết kiệm ' + new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'}).format(product.oldPrice - product.price).replace('₫', 'đ');
            productDiscount.classList.remove('d-none');
        }
    } else {
        if (productPriceOld) productPriceOld.classList.add('d-none');
        if (productDiscount) productDiscount.classList.add('d-none');
    }

    const productStockStatus = document.getElementById('productStockStatus');
    if (productStockStatus) {
        if (product.stock > 0) {
            productStockStatus.textContent = 'Còn hàng';
            productStockStatus.style.color = 'var(--color-success)';
        } else {
            productStockStatus.textContent = 'Hết hàng';
            productStockStatus.style.color = 'var(--color-danger)';
        }
    }

    const productStockQty = document.getElementById('productStockQty');
    if (productStockQty) {
        productStockQty.textContent = product.stock > 0 ? product.stock + ' sản phẩm' : '—';
    }

    const productPetType = document.getElementById('productPetType');
    if (productPetType) {
        const petTypeMap = {
            'cho': 'Chó',
            'meo': 'Mèo',
            'dog': 'Chó',
            'cat': 'Mèo'
        };
        const raw = (product.petType || product.pet_type || '').toLowerCase();
        productPetType.textContent = petTypeMap[raw] || 'Chó / Mèo';
    }

    const productDescShort = document.getElementById('productDescShort');
    if (productDescShort) productDescShort.textContent = product.description || '';

    const productSKU = document.getElementById('productSKU');
    if (productSKU) productSKU.textContent = product.sku || product.id;

    const productSKUChip = document.getElementById('productSKUChip');
    if (productSKUChip) productSKUChip.textContent = product.sku || product.id;

    const productCategoryMeta = document.getElementById('productCategory');
    if (productCategoryMeta) productCategoryMeta.textContent = product.categoryName || 'Sản phẩm';

    const productBrandMeta = document.getElementById('productBrandMeta');
    if (productBrandMeta) productBrandMeta.textContent = product.brand;
    
    const dynamicDetailsContainer = document.getElementById('dynamicProductDetails');
    if (dynamicDetailsContainer) {
        let detailsHtml = '';
        if (product.description && product.description !== 'Thông tin sản phẩm đang được cập nhật.') {
            detailsHtml += `<div class="pd-desc-block"><p class="pd-desc-text">${product.description}</p></div>`;
        }
        
        if (product.benefits) {
            const benefitLines = product.benefits.split(/\. |\n|;/).map(s => s.trim()).filter(s => s.length > 5);
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Đặc điểm nổi bật</h4>
                                <div class="pd-benefits-grid">`;
            if (benefitLines.length > 0) {
                benefitLines.forEach(b => {
                    const text = b.endsWith('.') ? b : b + '.';
                    detailsHtml += `<div class="benefit-card">
                                        <div class="benefit-text">${text}</div>
                                    </div>`;
                });
            } else {
                detailsHtml += `<div class="benefit-card">
                                    <div class="benefit-text">${product.benefits}</div>
                                </div>`;
            }
            detailsHtml += `</div></div>`;
        }
        
        if (product.ingredients) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Thành phần nguyên liệu</h4>
                                <div class="pd-ingredients-box">
                                    <p class="mb-0">${product.ingredients}</p>
                                </div>
                            </div>`;
        }
        
        if (product.usage) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Hướng dẫn bổ sung</h4>
                                <p>${product.usage}</p>
                            </div>`;
        }

        if (product.feedingGuide) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Khẩu phần khuyến nghị</h4>
                                <div class="pd-ingredients-box">
                                    <p class="mb-0">${product.feedingGuide}</p>
                                </div>
                            </div>`;
        }

        if (product.specs || product.spec || product.origin || product.brand || product.expiry || product.storage) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Thông số chi tiết</h4>
                                <div class="specifications-table">
                                    <table class="pd-spec-table">`;
            if (product.brand) {
                detailsHtml += `<tr><th>Thương hiệu</th><td>${product.brand}</td></tr>`;
            }
            if (product.origin) {
                detailsHtml += `<tr><th>Xuất xứ</th><td>${product.origin}</td></tr>`;
            }
            if (product.specs || product.spec) {
                detailsHtml += `<tr><th>Quy cách đóng gói</th><td>${product.specs || product.spec}</td></tr>`;
            }
            const expiryText = product.expiry || '18 – 24 tháng kể từ ngày sản xuất';
            const storageText = product.storage || 'Nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp';
            detailsHtml += `<tr><th>Hạn sử dụng</th><td>${expiryText}</td></tr>
                            <tr><th>Bảo quản</th><td>${storageText}</td></tr>
                            </table></div></div>`;
        }
        
        if (!detailsHtml) {
            detailsHtml = '<p>Thông tin sản phẩm đang được cập nhật.</p>';
        }
        
        dynamicDetailsContainer.innerHTML = detailsHtml;
    }
    
    const averageScore = document.getElementById('averageScore');
    const totalReviewsCount = document.getElementById('totalReviewsCount');
    
    if (averageScore) {
        averageScore.textContent = product.rating ? product.rating.toFixed(1) : '4.5';
    }
    
    if (totalReviewsCount) {
        totalReviewsCount.textContent = `Dựa trên ${product.reviewCount || 0} đánh giá`;
    }
    if (window.DataLoader && window.DataLoader.getProductReviews) {
        window.DataLoader.getProductReviews(product.id).then(reviews => {
            const container = document.getElementById('reviewsContainer');
            if (!container) return;
            
            const reviewCount = (reviews && reviews.length) || 0;
            const reviewsHeaderCount = document.getElementById('reviewsHeaderCount');
            if (reviewsHeaderCount) {
                reviewsHeaderCount.textContent = `${reviewCount} nhận xét`;
            }

            if (!reviews || reviews.length === 0) {
                container.innerHTML = '<div class="text-center py-4 text-secondary">Chưa có đánh giá nào cho sản phẩm này.</div>';
                
                for(let i=1; i<=5; i++) {
                    const bar = document.getElementById('bar'+i);
                    const pct = document.getElementById('pct'+i);
                    const cnt = document.getElementById('cnt'+i);
                    if(bar) bar.style.width = '0%';
                    if(pct) pct.textContent = '(0%)';
                    if(cnt) cnt.textContent = '0';
                }
                if (totalReviewsCount) totalReviewsCount.textContent = 'Chưa có đánh giá';
                if (averageScore) averageScore.textContent = '0.0';
                return;
            }
            
            const attrGroups = getProductAttributeGroups(product);
            let availableVariants = [];
            if (attrGroups && attrGroups.length > 0) {
                availableVariants = attrGroups[0].options.map(o => o.label);
            }
            if (availableVariants.length === 0) {
                availableVariants = ['Tiêu chuẩn'];
            }

            let sum = 0;
            let counts = {1:0, 2:0, 3:0, 4:0, 5:0};
            reviews.forEach((r, idx) => {
                const raw = Number(r.rating) || 5;
                const norm = raw > 5 ? Math.round(raw / 2) : Math.min(5, Math.max(1, Math.round(raw)));
                r._normRating = norm;
                sum += norm;
                if(counts[norm] !== undefined) counts[norm]++;

                if (!r.variantName && !r.variant_name) {
                    r._variantName = availableVariants[idx % availableVariants.length];
                } else {
                    r._variantName = r.variantName || r.variant_name;
                }
            });
            const avg = reviews.length > 0 ? (sum / reviews.length) : 0;
            const avgFormatted = avg.toFixed(1);
            
            if (averageScore) averageScore.textContent = avgFormatted;
            if (totalReviewsCount) totalReviewsCount.textContent = `Dựa trên ${reviews.length} lượt đánh giá`;
            
            // Render summary stars row
            const summaryStarsRow = document.getElementById('summaryStarsRow');
            if (summaryStarsRow) {
                let sHtml = '';
                for (let i = 1; i <= 5; i++) {
                    sHtml += `<span class="star ${i <= Math.round(avg) ? 'filled' : ''}">★</span>`;
                }
                summaryStarsRow.innerHTML = sHtml;
            }

            // Update distribution bars and counts
            for(let i=1; i<=5; i++) {
                const count = counts[i] || 0;
                const pct = Math.round((count / reviews.length) * 100);
                const bar = document.getElementById('bar'+i);
                const pctLabel = document.getElementById('pct'+i);
                const cntLabel = document.getElementById('cnt'+i);
                if(bar) bar.style.width = pct + '%';
                if(pctLabel) pctLabel.textContent = `(${pct}%)`;
                if(cntLabel) cntLabel.textContent = count;

                const chipCnt = document.getElementById('chipCnt' + i);
                if (chipCnt) chipCnt.textContent = count;
            }
            const chipCntAll = document.getElementById('chipCntAll');
            if (chipCntAll) chipCntAll.textContent = reviews.length;

            // Sample realistic feedback images for review demonstration if DB has no media
            reviews.forEach((r, idx) => {
                if ((!r.media || r.media.length === 0) && (idx === 0 || idx === 1)) {
                    if (product.images && product.images.length > 1) {
                        r.media = [product.images[1]];
                        r.hasMedia = true;
                    } else if (product.image) {
                        r.media = [product.image];
                        r.hasMedia = true;
                    }
                }
            });

            const mediaCount = reviews.filter(r => r.hasMedia && r.media && r.media.length > 0).length;
            const chipCntMedia = document.getElementById('chipCntMedia');
            if (chipCntMedia) chipCntMedia.textContent = mediaCount;

            // Render Variant Filter Chips
            const variantCounts = {};
            reviews.forEach(r => {
                const v = r._variantName || 'Tiêu chuẩn';
                variantCounts[v] = (variantCounts[v] || 0) + 1;
            });
            
            const distinctVariants = Object.keys(variantCounts);
            const variantFilterRow = document.getElementById('reviewVariantFilterRow');
            const variantChipsContainer = document.getElementById('reviewVariantChips');
            
            let selectedStarFilter = 'all';
            let selectedVariantFilter = 'all';

            function applyCombinedFilters() {
                window.filteredReviews = window.allProductReviews.filter(r => {
                    let matchStar = true;
                    if (selectedStarFilter === 'has_media') {
                        matchStar = !!(r.hasMedia && r.media && r.media.length > 0);
                    } else if (selectedStarFilter !== 'all') {
                        matchStar = (r._normRating === parseInt(selectedStarFilter));
                    }
                    
                    let matchVariant = true;
                    if (selectedVariantFilter !== 'all') {
                        matchVariant = (r._variantName === selectedVariantFilter);
                    }
                    
                    return matchStar && matchVariant;
                });
                
                window.currentReviewPage = 1;
                window.renderReviewsPage();
            }

            if (distinctVariants.length > 1 && variantChipsContainer && variantFilterRow) {
                variantFilterRow.style.display = 'flex';
                let vHtml = `<button class="variant-filter-chip active" data-variant="all">Tất cả (${reviews.length})</button>`;
                distinctVariants.forEach(vName => {
                    vHtml += `<button class="variant-filter-chip" data-variant="${vName}">${vName} (${variantCounts[vName]})</button>`;
                });
                variantChipsContainer.innerHTML = vHtml;
                
                variantChipsContainer.querySelectorAll('.variant-filter-chip').forEach(vChip => {
                    vChip.addEventListener('click', function() {
                        variantChipsContainer.querySelectorAll('.variant-filter-chip').forEach(c => c.classList.remove('active'));
                        this.classList.add('active');
                        selectedVariantFilter = this.getAttribute('data-variant');
                        applyCombinedFilters();
                    });
                });
            } else if (variantFilterRow) {
                variantFilterRow.style.display = 'none';
            }
            
            window.allProductReviews = reviews;
            window.filteredReviews = reviews;
            window.currentReviewPage = 1;
            window.reviewsPerPage = 5;

            window.openReviewImageModal = function(src) {
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

            window.renderReviewsPage = function() {
                const start = (window.currentReviewPage - 1) * window.reviewsPerPage;
                const end = start + window.reviewsPerPage;
                const currentItems = window.filteredReviews.slice(start, end);
                
                if (window.filteredReviews.length === 0) {
                    container.innerHTML = '<div class="text-center py-4 text-secondary">Không có đánh giá nào phù hợp với bộ lọc hiện tại.</div>';
                    const pag = document.getElementById('reviewsPaginationWrapper');
                    if (pag) pag.style.display = 'none';
                    return;
                }

                let html = '';
                currentItems.forEach(r => {
                    const d = new Date(r.createdAt);
                    const dateStr = isNaN(d.getTime()) ? '' : `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                    const initial = r.customerName ? r.customerName.charAt(0).toUpperCase() : 'K';
                    const normRating = r._normRating || (Number(r.rating) > 5 ? Math.round(Number(r.rating) / 2) : Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))));
                    const variantText = r._variantName || 'Tiêu chuẩn';
                    
                    let starsHtml = '';
                    for(let i=1; i<=5; i++) {
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
                                            <span class="review-verified-badge">Đã mua hàng tại Pawpal</span>
                                        </div>
                                        <button class="review-helpful-btn" onclick="this.classList.toggle('active'); this.textContent = this.classList.contains('active') ? 'Hữu ích (1)' : 'Hữu ích (0)';">Hữu ích (0)</button>
                                    </div>
                                    <div class="review-meta-info">
                                        <span class="review-date">${dateStr}</span>
                                        <span class="review-meta-dot">•</span>
                                        <span class="review-variant-tag">Phân loại: ${variantText}</span>
                                    </div>
                                    <div class="review-content">
                                        <p class="review-text">${r.content}</p>
                                        ${r.hasMedia && r.media && r.media.length ? `
                                        <div class="review-media-list">
                                            ${r.media.map(m => `<img src="${m}" alt="Ảnh đánh giá" class="review-media-thumb" onclick="openReviewImageModal('${m}')" title="Bấm để xem ảnh phóng to">`).join('')}
                                        </div>
                                        ` : ''}
                                        ${r.hasReply && r.shopReply ? `
                                        <div class="seller-reply">
                                            <div class="reply-header">Phản hồi từ Pawpal Care:</div>
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
                window.renderReviewPagination();
            };

            window.renderReviewPagination = function() {
                const totalPages = Math.ceil(window.filteredReviews.length / window.reviewsPerPage);
                const paginationWrapper = document.getElementById('reviewsPaginationWrapper');
                const paginationUl = document.getElementById('reviewsPagination');
                
                if (totalPages <= 1) {
                    paginationWrapper.style.display = 'none';
                    return;
                }
                
                paginationWrapper.style.display = 'block';
                let html = '';
                
                html += `
                    <li class="page-item ${window.currentReviewPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${window.currentReviewPage - 1}" aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                `;
                
                for (let i = 1; i <= totalPages; i++) {
                    html += `
                        <li class="page-item ${window.currentReviewPage === i ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                }
                
                html += `
                    <li class="page-item ${window.currentReviewPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${window.currentReviewPage + 1}" aria-label="Next">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                `;
                
                paginationUl.innerHTML = html;
                
                paginationUl.querySelectorAll('.page-link').forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const page = parseInt(this.getAttribute('data-page'));
                        if (page > 0 && page <= totalPages && page !== window.currentReviewPage) {
                            window.currentReviewPage = page;
                            window.renderReviewsPage();
                            document.getElementById('reviewsContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });
                });
            };

            const chips = document.querySelectorAll('.review-filter-chip');
            chips.forEach(chip => {
                chip.addEventListener('click', function() {
                    chips.forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                    selectedStarFilter = this.getAttribute('data-filter');
                    applyCombinedFilters();
                });
            });

            window.renderReviewsPage();
        });
    }

    renderProductVariants(product);

    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (product.stock <= 0) {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }
}
