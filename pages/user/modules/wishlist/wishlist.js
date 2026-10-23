/**
 * modules/wishlist/wishlist.js - Module logic độc lập cho Sản phẩm & Dịch vụ yêu thích PawPal
 */

import { API } from '/scripts/api/api.js';

let currentFilter = 'all';
let wishlistRenderVersion = 0;
let wishlistChannel=null;
let wishlistChannelKey='';
export function dispose() { ++wishlistRenderVersion; if(wishlistChannel)(window.getSupabaseClient?.() || window.SupabaseClient)?.removeChannel(wishlistChannel);wishlistChannel=null;wishlistChannelKey='';document.removeEventListener('wishlist_updated',renderWishlist);document.removeEventListener('auth_state_changed',renderWishlist); }
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function getCurrentUser() {
    if (typeof window.getCurrentUser === 'function') {
        return window.getCurrentUser();
    }
    try {
        return JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    } catch {
        return null;
    }
}

function formatPrice(price) {
    const numericPrice = Number(price) || 0;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(numericPrice);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return 'vừa xong';

    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
    return date.toLocaleDateString('vi-VN');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #236B48;
        color: white;
        padding: 12px 20px;
        border-radius: 9px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        font-family: 'DM Sans', sans-serif;
        font-size: 14px;
        animation: userModuleFadeIn 0.2s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2400);
}

async function loadAllProductsSafely() {
    if (window.DataLoader && typeof window.DataLoader.loadProducts === 'function') {
        try {
            const data = await window.DataLoader.loadProducts();
            if (data && data.length) return data;
        } catch (e) {
            throw e;
        }
    }
    return [];
}

async function loadAllServicesSafely() {
    if (window.DataLoader && typeof window.DataLoader.loadServices === 'function') {
        try {
            const data = await window.DataLoader.loadServices();
            if (data && data.length) return data;
        } catch (e) {
            throw e;
        }
    }
    return [];
}

async function getWishlistItems() {
    const currentUser = getCurrentUser();

    if(!currentUser?.id)throw Error('Vui lòng đăng nhập để tải yêu thích.');
    const serverWishlist=await API.getUserWishlist(currentUser.id);
    syncWishlistChannel(currentUser.id,serverWishlist.id);
    const finalProductIds=serverWishlist.products || [];
    const finalServiceIds=serverWishlist.services || [];

    const allProducts = await loadAllProductsSafely();
    const allServices = await loadAllServicesSafely();

    const seenProducts = new Set();
    const products = finalProductIds.map((item) => {
        const productId = typeof item === 'object' && item !== null ? String(item.id || item.productId) : String(item);
        if (seenProducts.has(productId)) return null;
        seenProducts.add(productId);
        const product = allProducts.find((p) => String(p.id) === productId || String(p.dbId) === productId);

        if (!product && !item.name) return null;
        const source=product || {name:item.name,status:item.status};

        return {
            type: 'product',
            id: productId,
            uniqueId: `product-${productId}`,
            image: source.image || '/assets/images/shop/products/placeholder.webp',
            title: source.name,
            subtitle: source.brand || '',
            price: product && Number.isFinite(Number(product.price)) ? Number(product.price) : null,
            originalPrice: Number(source.originalPrice || source.oldPrice || 0) || null,
            inStock: item.status==='active' && Boolean(product) && product.inStock !== false,
            addedAt: typeof item === 'object' && item?.addedAt ? item.addedAt : new Date().toISOString(),
            detailUrl: `/pages/shop/product-detail/product-detail.html?id=${productId}`,
            actionLabel: 'Thêm giỏ',
            actionType: 'cart',
            rawProduct: product
        };
    }).filter(Boolean);

    const seenServices = new Set();
    const services = finalServiceIds.map((item) => {
        const serviceId = typeof item === 'object' && item !== null ? String(item.id || item.serviceId) : String(item);
        if (seenServices.has(serviceId)) return null;
        seenServices.add(serviceId);
        const service = allServices.find((s) => String(s.serviceId) === serviceId || String(s.id) === serviceId || String(s.dbId) === serviceId);
        if (!service && !item.name) return null;
        const source=service || {name:item.name,status:item.status};

        return {
            type: 'service',
            id: serviceId,
            uniqueId: `service-${serviceId}`,
            image: source.image || '/assets/images/services/spa.png',
            title: source.name,
            subtitle: source.category === 'hotel' ? 'Khách sạn thú cưng' : source.category === 'taxi' ? 'Taxi thú cưng' : 'Spa và làm đẹp',
            price: service && Number(service.price)>0 ? Number(service.price) : null,
            originalPrice: null,
            inStock: item.status === 'active',
            addedAt: typeof item === 'object' && item?.addedAt ? item.addedAt : new Date().toISOString(),
            detailUrl: `/pages/services/service-detail/service-detail.html?id=${serviceId}`,
            actionLabel: 'Đặt lịch',
            actionType: 'booking',
            bookingUrl: `/pages/services/booking/booking.html?service=${serviceId}`
        };
    }).filter(Boolean);

    return [...products, ...services];
}

function syncWishlistChannel(owner,id){
    const key=owner+':'+id;if(wishlistChannelKey===key)return;
    const db=window.getSupabaseClient?.() || window.SupabaseClient;
    if(wishlistChannel)db.removeChannel(wishlistChannel);
    wishlistChannelKey=key;wishlistChannel=db.channel('wishlist-'+crypto.randomUUID());
    wishlistChannel.on('postgres_changes',{event:'*',schema:'public',table:'wishlist',filter:'customer_id=eq.'+owner},renderWishlist);
    if(id)for(const table of ['wishlist_product','wishlist_service'])wishlistChannel.on('postgres_changes',{event:'*',schema:'public',table,filter:'wishlist_id=eq.'+id},renderWishlist);
    wishlistChannel.subscribe();
}

async function removeFromWishlist(type, id) {
    const currentUser = getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    const isService = type === 'service';
    const res = await API.setWishlistItem(currentUser.id, id, isService, false);
    if (res && res.success) {
        renderWishlist();
        showNotification('Đã xóa khỏi danh sách yêu thích');
    }
}

function bindTabs() {
    document.querySelectorAll('.wishlist-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.wishlist-tab').forEach((item) => item.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.type || 'all';
            renderWishlist();
        });
    });
}

async function renderWishlist() {
    const version = ++wishlistRenderVersion;
    const filter = currentFilter;
    const skeletonEl = document.getElementById('wishlistSkeleton');
    const container = document.querySelector('.wishlist-module-container');
    skeletonEl?.classList.remove('d-none');
    document.getElementById('wishlistGrid')?.classList.add('d-none');
    document.getElementById('emptyWishlist')?.classList.add('d-none');
    container?.setAttribute('aria-busy', 'true');
    let items;
    try {
        items = await getWishlistItems();
    } catch (error) {
        if (version !== wishlistRenderVersion || !container?.isConnected) return;
        const count=document.getElementById('wishlistCount');if(count)count.textContent='0';
        console.error('[Wishlist] Không thể tải danh sách:', error);
        const grid = document.getElementById('wishlistGrid');
        if (grid) {
            grid.innerHTML = '<p class="text-muted py-4" role="status">Không thể tải danh sách yêu thích. Vui lòng thử lại hoặc tải lại trang.</p>';
            grid.classList.remove('d-none');
        }
        return;
    } finally {
        if (version === wishlistRenderVersion) {
            skeletonEl?.classList.add('d-none');
            container?.setAttribute('aria-busy', 'false');
        }
    }
    if (version !== wishlistRenderVersion || !container?.isConnected) return;

    const filteredItems = filter === 'all' ? items : items.filter((item) => item.type === filter);
    const emptyState = document.getElementById('emptyWishlist');
    const grid = document.getElementById('wishlistGrid');
    const countSpan = document.getElementById('wishlistCount');

    if (countSpan) countSpan.textContent = String(items.length);

    if (!filteredItems.length) {
        if (emptyState) emptyState.classList.remove('d-none');
        if (grid) grid.classList.add('d-none');
        return;
    }

    if (emptyState) emptyState.classList.add('d-none');
    if (grid) {
        grid.classList.remove('d-none');
        grid.innerHTML = filteredItems.map((item) => {
            const hasDiscount = item.originalPrice && item.originalPrice > item.price;
            const discountPercent = hasDiscount ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
            const typeLabel = item.type === 'service' ? 'Dịch vụ' : 'Sản phẩm';

            return `
                <div class="wishlist-card pawpal-smooth-entrance" data-type="${item.type}" data-id="${item.id}">
                    <div class="wishlist-card-image-wrapper">
                        <img src="${esc(item.image || '/assets/images/publics/feed.jpg')}" alt="${esc(item.title)}" class="wishlist-card-image" onerror="this.onerror=null; this.src='/assets/images/publics/feed.jpg';">
                        <button class="wishlist-card-remove" data-type="${item.type}" data-id="${item.id}" aria-label="Xóa khỏi yêu thích">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                        </button>
                        ${hasDiscount ? `<span class="wishlist-card-sale-badge">-${discountPercent}%</span>` : ''}
                        ${!item.inStock ? `<div class="wishlist-card-out-of-stock">${item.type === 'service' ? 'Tạm dừng' : 'Hết hàng'}</div>` : ''}
                    </div>
                    <div class="wishlist-card-info">
                        <span class="wishlist-card-type">${typeLabel}</span>
                        <div class="wishlist-card-brand">${esc(item.subtitle)}</div>
                        <a href="${item.detailUrl}" class="wishlist-card-name">${esc(item.title)}</a>
                        <div class="wishlist-card-price-wrapper">
                            <span class="wishlist-card-price">${item.price===null?'Xem giá khi chọn':formatPrice(item.price)}</span>
                            ${hasDiscount ? `<span class="wishlist-card-price-old">${formatPrice(item.originalPrice)}</span>` : ''}
                        </div>
                        <div class="wishlist-card-added-date">Đã thêm ${formatDate(item.addedAt)}</div>
                        <div class="wishlist-card-actions">
                            <a href="${item.type==='product'?item.detailUrl:item.bookingUrl}" class="wishlist-card-add-to-cart">${item.type==='product'?'Chọn sản phẩm':'Đặt lịch'}</a>
                            <a href="${item.detailUrl}" class="wishlist-card-view-detail">Chi tiết</a>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        grid.querySelectorAll('.wishlist-card-remove').forEach((button) => {
            button.addEventListener('click', async () => {if(button.disabled)return;button.disabled=true;try{await removeFromWishlist(button.dataset.type || 'product',button.dataset.id || '');}catch{showNotification('Không thể lưu thay đổi. Vui lòng thử lại.');}finally{button.disabled=false;}});
        });


    }
}

let isInitRunning = false;

export function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    try {
        dispose();currentFilter='all';bindTabs();document.addEventListener('wishlist_updated',renderWishlist);document.addEventListener('auth_state_changed',renderWishlist);
        renderWishlist();
    } finally {
        isInitRunning = false;
    }
}

export const initWishlist = init;
window.initWishlist = init;
