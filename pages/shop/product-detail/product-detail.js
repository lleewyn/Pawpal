
let currentLoadedProduct = null;
let cachedProducts = [];
function finishProductLoading(selector, message) {
    document.querySelectorAll(selector).forEach(section => {
        if (message) {
            const status = document.createElement('p');
            status.className = 'container text-muted py-4';
            status.setAttribute('role', 'status');
            status.textContent = message;
            section.replaceChildren(status);
        }
        // Commit the loading frame before revealing already-populated content.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            section.classList.remove('pd-loading');
            section.setAttribute('aria-busy', 'false');
            const placeholder = section.querySelector(':scope > .pd-loading-placeholder');
            if (placeholder) setTimeout(() => placeholder.remove(), 260);
        }));
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        
        let attempts = 0;
        while (!window.DataLoader && attempts++ < 20) await new Promise(resolve => setTimeout(resolve, 100));
        if (!productId || !window.DataLoader) throw new Error('Product unavailable');
        if (productId && window.DataLoader) {
            const products = await window.DataLoader.loadProducts();
            cachedProducts = Array.isArray(products) ? products : [];
            const product = products.find(p => p.id.toString() === productId);
            if (product) {
                renderProductDetails(product);
                currentLoadedProduct = product;
                finishProductLoading('.product-detail-section, .product-tabs-section, .you-may-like-section, .related-products-section');
            }
        }

    } catch (e) {
        console.error('Failed to load product data:', e);
    } finally {
        if (!currentLoadedProduct) finishProductLoading('.pd-loading', 'Không thể tải sản phẩm. Vui lòng kiểm tra đường dẫn hoặc tải lại trang.');
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
            window.location.href='/user#orders';
        });
    }

    let wishlistIds=[];
    let wishlistSaving=false;
    function loadWishlistIds(){return wishlistIds;}
    (async()=>{try{const user=JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');if(!user?.id)return;const {API}=await import('/scripts/api/api.js');const state=await API.getUserWishlist(user.id);wishlistIds=state.productIds;refreshProductWishlistButtons();document.querySelectorAll('.wishlist-btn').forEach(b=>updateWishlistButtonState(b,b.dataset.productId));}catch{wishlistIds=[];}})();

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

    async function toggleWishlistItem(productId){
        if(wishlistSaving)return null;wishlistSaving=true;
        try{const user=JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');if(!user?.id)throw Error('SIGN_IN_REQUIRED');const {API}=await import('/scripts/api/api.js');const result=await API.setWishlistItem(user.id,productId,false,!isProductInWishlist(productId));const added=result.action==='added';wishlistIds=wishlistIds.filter(id=>String(id)!==String(productId));if(added)wishlistIds.push(String(productId));return added;}
        catch{showToast('Chưa lưu được yêu thích. Vui lòng đăng nhập và thử lại.','error');return null;}finally{wishlistSaving=false;}
    }

    function ensureWishlistButtons() {
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const productId = btn.dataset.productId;
            if (!productId) return;
            updateWishlistButtonState(btn, productId);
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                if (!user) {
                    showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                    return;
                }

                const added = await toggleWishlistItem(productId);if(added===null)return;
                btn.classList.toggle('active', added);
                showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
            });
        });
    }

    const favoriteProductBtn = document.getElementById('favoriteProductBtn');
    const wishlistBtn = document.getElementById('wishlistBtn');

    function refreshProductWishlistButtons() {
        const counter=document.getElementById('favoriteCounter');if(counter)counter.hidden=true;
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

        favoriteProductBtn.addEventListener('click', async (e) => {
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

            const added = await toggleWishlistItem(productId);if(added===null)return;
            refreshProductWishlistButtons();
            showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
        });
    }

    if (wishlistBtn) {
        if (currentLoadedProduct && isProductInWishlist(currentLoadedProduct.id)) {
            wishlistBtn.classList.add('active');
        }

        wishlistBtn.addEventListener('click', async (e) => {
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

            const added = await toggleWishlistItem(productId);if(added===null)return;
            refreshProductWishlistButtons();
            showToast(added ? 'Đã thêm vào danh sách yêu thích' : 'Đã bỏ khỏi danh sách yêu thích', 'success');
        });
    }

    ensureWishlistButtons();
    bindRelatedProductCards(isProductInWishlist, toggleWishlistItem);

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
    const options=(product.variants||[]).filter(v=>Number(v.stock)>0).map(v=>({label:v.name||v.sku,variantId:v.id,stock:v.stock,priceDelta:Number(v.price)-Number(product.price)}));
    return options.length?[{name:'Phân loại',options}]:[];
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

        const finalPrice = Math.max(0, basePrice + totalDelta);
        const variantName = parts.join(' • ');

        selectedVariantState = {
            id: selectedOptions[0]?.variantId,
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

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!currentUser || !currentUser.id || currentUser.is_temporary) {
        showToast('Vui lòng đăng nhập để sử dụng giỏ hàng, hoặc bấm "Mua ngay"', 'warning');
        return;
    }

    const itemToAdd = {
        ...product,
        variantId: selectedVariantState.id || product.variantId,
        price: selectedVariantState.price ?? product.price,
        selectedVariant: selectedVariantState.name || 'Tiêu chuẩn'
    };
    
    try {
        await addProductToCart(itemToAdd, quantity);
        showToast('Đã thêm sản phẩm vào giỏ hàng', 'success');
        await updateCartBadge();
    } catch (error) {
        showToast(error.message || 'Không thể thêm sản phẩm vào giỏ hàng', 'warning');
    }
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
            variantId: selectedVariantState.id || product.variantId,
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
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!currentUser || !currentUser.id || currentUser.is_temporary) {
        showToast('Vui lòng đăng nhập để sử dụng giỏ hàng, hoặc bấm "Mua ngay"', 'warning');
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
        product_id: product.id,
        variantId: groups[0]?.options[0]?.variantId || product.variantId,
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

function getCurrentProduct(){return currentLoadedProduct;}

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

async function bindRelatedProductCards(isProductInWishlist, toggleWishlistItem) {
    const products = await getProductCatalog();
    if (!products || products.length === 0) return;

    const youMayLikeProducts = products.filter(p=>p.id!==currentLoadedProduct?.id).slice(0,5);
    
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
        const stars = Array(5).fill(0).map((_, i) => '<span class="star ' + (i < Math.floor(product.rating || 0) ? 'filled' : '') + '"></span>').join('');
        
        return '<div class="product-card" onclick="window.location.href=\'/pages/shop/product-detail/product-detail.html?id=' + product.id + '\'">' +
            '<div class="product-card-image" role="link" tabindex="0" aria-label="Xem chi tiết ' + escapeHtml(product.name) + '">' +
                '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
                '<button class="wishlist-btn ' + isWishlisted + '" aria-label="Thêm vào yêu thích" data-product-id="' + product.id + '">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' +
                '</button>' +
            '</div>' +
            '<div class="product-card-body">' +
                '<div class="product-brand">' + escapeHtml(product.brand) + '</div>' +
                '<h3 class="product-name">' + escapeHtml(product.name) + '</h3>' +
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
                wishlist.addEventListener('click', async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                    if (!user) {
                        if(typeof showToast === 'function') showToast('Vui lòng đăng nhập để thêm vào danh sách yêu thích!', 'warning');
                        return;
                    }
                    const added = typeof toggleWishlistItem === 'function' ? await toggleWishlistItem(String(product.id)) : null;if(added===null)return;
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
    const result = await window.API.addToCart(currentUser?.id, product.id, quantity, product);
    if (!result?.success) throw new Error(result?.error || 'Cannot update cart');
}

async function updateCartBadge() {
    if (typeof window.updateCartBadge === 'function' && window.updateCartBadge !== updateCartBadge) {
        window.updateCartBadge();
        return;
    }
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    let cart = [];
    if (window.API && typeof window.API.getUserCart === 'function') {
        cart = await window.API.getUserCart(currentUser?.id || currentUser?.phone || null);
    }
    const totalItems = cart.length;
    
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
        const raw = (product.target_pet || product.targetPet || product.petType || product.pet_type || '').toLowerCase();
        productPetType.textContent = product.target_pet || product.targetPet || petTypeMap[raw] || 'Chó và Mèo';
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
    if (productBrandMeta) productBrandMeta.textContent = product.brand_name || product.brand || 'Pawpal';
    
    const dynamicDetailsContainer = document.getElementById('dynamicProductDetails');
    if (dynamicDetailsContainer) {
        let detailsHtml = '';
        if (product.description && product.description !== 'Thông tin sản phẩm đang được cập nhật.') {
            detailsHtml += `<div class="pd-desc-block"><p class="pd-desc-text">${escapeHtml(product.description)}</p></div>`;
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
                                        <div class="benefit-text">${escapeHtml(text)}</div>
                                    </div>`;
                });
            } else {
                detailsHtml += `<div class="benefit-card">
                                    <div class="benefit-text">${escapeHtml(product.benefits)}</div>
                                </div>`;
            }
            detailsHtml += `</div></div>`;
        }
        
        if (product.ingredients) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Thành phần nguyên liệu</h4>
                                <div class="pd-ingredients-box">
                                    <p class="mb-0">${escapeHtml(product.ingredients)}</p>
                                </div>
                            </div>`;
        }
        
        if (product.usage) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Hướng dẫn bổ sung</h4>
                                <p>${escapeHtml(product.usage)}</p>
                            </div>`;
        }

        if (product.feedingGuide) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Khẩu phần khuyến nghị</h4>
                                <div class="pd-ingredients-box">
                                    <p class="mb-0">${escapeHtml(product.feedingGuide)}</p>
                                </div>
                            </div>`;
        }

        if (product.specs || product.spec || product.origin || product.brand || product.expiry || product.storage) {
            detailsHtml += `<div class="pd-detail-block">
                                <h4 class="pd-section-subtitle">Thông số chi tiết</h4>
                                <div class="specifications-table">
                                    <table class="pd-spec-table">`;
            if (product.brand) {
                detailsHtml += `<tr><th>Thương hiệu</th><td>${escapeHtml(product.brand)}</td></tr>`;
            }
            if (product.origin) {
                detailsHtml += `<tr><th>Xuất xứ</th><td>${escapeHtml(product.origin)}</td></tr>`;
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
    
    loadPublicProductDetails(product);

    renderProductVariants(product);

    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (product.stock <= 0) {
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
    }
}
function escapeHtml(value) { return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loadPublicProductDetails(product){
    document.getElementById('productUsageContent').textContent=product.usage || 'Chưa có hướng dẫn sử dụng được công bố cho sản phẩm này.';
    const count=Number(product.reviewCount)||0,rating=Number(product.rating)||0;
    document.querySelectorAll('.product-detail-section .rating-text').forEach(el=>el.textContent=count?`${rating.toFixed(1)} / 5 · ${count} đánh giá`:'Chưa có đánh giá công bố');
    const summary=document.getElementById('productReviewSummary');summary.textContent=count?`${rating.toFixed(1)} / 5 từ ${count} đánh giá công bố`:'Chưa có đánh giá công bố';
    try{
        const rows=await window.DataLoader.getProductReviews(product.id);let page=0,filter='all';
        const render=()=>{
            const selected=rows.filter(r=>filter==='all'||Number(r.rating)===Number(filter)),pages=Math.max(1,Math.ceil(selected.length/10));page=Math.min(page,pages-1);
            document.getElementById('reviewsContainer').innerHTML=selected.slice(page*10,page*10+10).map(r=>`<article class="review-item"><p>Khách đã mua hàng · ${Number(r.rating)} / 5 · ${escapeHtml(new Date(r.createdAt).toLocaleDateString('vi-VN'))}</p><p>${escapeHtml(r.content)}</p><p>Phân loại ${escapeHtml(r.variantName || r.variant_name || '—')}</p>${r.shopReply?`<div class="seller-reply"><strong>Phản hồi cửa hàng</strong><p>${escapeHtml(r.shopReply)}</p></div>`:''}</article>`).join('') || '<p>Không có đánh giá phù hợp.</p>';
            const nav=document.getElementById('productReviewPages');nav.innerHTML=`<button type="button" id="productReviewsPrev" ${page===0?'disabled':''}>&lt;</button><span>${page+1} / ${pages}</span><button type="button" id="productReviewsNext" ${page===pages-1?'disabled':''}>&gt;</button>`;nav.querySelector('#productReviewsPrev').onclick=()=>{page--;render();};nav.querySelector('#productReviewsNext').onclick=()=>{page++;render();};
        };
        document.getElementById('productReviewFilter').onchange=e=>{filter=e.target.value;page=0;render();};render();
    }catch{document.getElementById('reviewsContainer').innerHTML='<p role="alert">Không thể tải đánh giá. Vui lòng tải lại trang.</p>';}
    finally{finishProductLoading('.product-reviews-section');}
    try{
        const result=await (window.getSupabaseClient?.() || window.SupabaseClient).rpc('public_product_delivery_options');if(result.error)throw result.error;
        document.getElementById('productDeliveryOptions').innerHTML=(result.data || []).map(row=>`<p><strong>${escapeHtml(row.name)}</strong> · Phí cấu hình ${Number(row.fee).toLocaleString('vi-VN')}đ${row.estimated_days?' · Dự kiến '+escapeHtml(row.estimated_days)+' ngày':''}<br>${escapeHtml(row.description || '')}</p>`).join('') || '<p>Chưa có tùy chọn giao hàng được công bố.</p>';
    }catch{document.getElementById('productDeliveryOptions').textContent='Không thể tải tùy chọn giao hàng. Vui lòng tải lại trang.';}
}
