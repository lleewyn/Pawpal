/**
 * cart.js — Xử lý logic giỏ hàng PawPal
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Đợi DataLoader sẵn sàng
    if (!window.DataLoader) {
        console.error(' DataLoader không tìm thấy');
        return;
    }

    // Đợi window.API sẵn sàng (api.js là module, load song song với cart.js)
    if (!window.API) {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (window.API) { clearInterval(check); resolve(); }
            }, 20);
            // Timeout sau 3s để tránh treo vô hạn
            setTimeout(() => { clearInterval(check); resolve(); }, 3000);
        });
    }

    const cartContentRow = document.getElementById('cart-content-row');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartGrandTotal = document.getElementById('cart-grand-total');
    const cartEmptyState = document.getElementById('cart-empty-state');
    const btnClearCart = document.getElementById('btn-clear-cart');
    
    // Header elements
    const cartCountHeader = document.getElementById('cart-count-header');
    
    // Voucher elements
    const voucherInput = document.getElementById('voucher-input');
    const btnApplyVoucher = document.getElementById('btn-apply-voucher');
    const myVouchersList = document.getElementById('my-vouchers-list');
    const availableVouchersList = document.getElementById('available-vouchers-list');
    const rowDiscount = document.getElementById('row-discount');
    const discountCodeLabel = document.getElementById('discount-code-label');
    const cartDiscount = document.getElementById('cart-discount');
    
    // Select all checkbox
    const selectAllItems = document.getElementById('select-all-items');

    let products = [];
    let cart = [];
    let vouchers = [];
    let myVouchers = [];
    let appliedVoucher = null;
    let selectedIds = new Set(); // Store IDs of selected items

    function getCurrentUser() {
        if (typeof window.getCurrentUser === 'function') {
            return window.getCurrentUser();
        }
        try {
            return JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        } catch {
            return null;
        }
    }

    function normalizeId(value) {
        return value == null ? '' : String(value);
    }

    function isSameCartItemId(a, b) {
        return normalizeId(a) === normalizeId(b);
    }

    // Format tiền tệ Việt Nam
    function formatPrice(price) {
        return price.toLocaleString('vi-VN') + 'đ';
    }

    // Tải dữ liệu giỏ hàng, sản phẩm và voucher
    async function initCart() {
        try {
            // Tải sản phẩm từ CSV
            products = await window.DataLoader.loadProducts();
            
            // Lấy giỏ hàng từ localStorage (offline-first, tránh duplicate)
            const currentUser = getCurrentUser();
            const fetchedCart = currentUser ? await window.API.getUserCart(currentUser.id || currentUser.phone || null) : JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
            const localCart = restoreCartFromBackup(fetchedCart);
            cart = localCart.map(normalizeCartItem);
            
            // Mặc định chọn tất cả sản phẩm
            cart.forEach(item => {
                selectedIds.add(normalizeId(item.id));
            });

            // Tải danh sách voucher
            try {
                const vouchersResponse = await fetch('/data/vouchers.json');
                vouchers = await vouchersResponse.json();
            } catch (err) {
                console.error(' Lỗi tải danh sách voucher:', err);
            }

            myVouchers = JSON.parse(localStorage.getItem('pawpal_my_vouchers') || '[]')
                .filter(v => currentUser && v.ownerPhone === currentUser.phone);
            
            setupVoucherEvents();
            setupSelectAllEvent();
        setupCheckoutEvent();
        loadPersistedVoucher();
        renderAvailableVouchers();
        renderMyVouchers();
        renderCart();
        } catch (error) {
            console.error(' Lỗi khởi tạo giỏ hàng:', error);
        }
    }

    // Thiết lập sự kiện chọn tất cả
    function setupSelectAllEvent() {
        if (selectAllItems) {
            selectAllItems.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                    cart.forEach(item => selectedIds.add(normalizeId(item.id)));
                } else {
                    selectedIds.clear();
                }
                
                // Cập nhật các checkbox con
                document.querySelectorAll('.item-checkbox').forEach(cb => {
                    cb.checked = isChecked;
                });
                
                calculateTotals();
            });
        }
    }

    // Thiết lập sự kiện áp dụng voucher
    function setupVoucherEvents() {
        if (btnApplyVoucher) {
            btnApplyVoucher.addEventListener('click', applyVoucherCode);
        }
        if (voucherInput) {
            voucherInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyVoucherCode();
                }
            });
        }
    }

    // Thiết lập sự kiện trước khi sang trang thanh toán
    function setupCheckoutEvent() {
        const btnProceed = document.getElementById('btn-proceed-checkout');
        if (btnProceed) {
            btnProceed.addEventListener('click', (e) => {
                // Lọc ra các sản phẩm được tích chọn
                const selectedItems = cart.filter(item => selectedIds.has(normalizeId(item.id)));
                
                if (selectedItems.length === 0) {
                    e.preventDefault();
                    alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');
                    return;
                }

                // Lưu lại giỏ hàng thanh toán và các phần không chọn (để phục hồi sau)
                const unselectedItems = cart.filter(item => !selectedIds.has(normalizeId(item.id)));
                localStorage.setItem('pawpal_cart_unselected_backup', JSON.stringify(unselectedItems));
                
                // Cập nhật lại giỏ hàng chính chỉ gồm các sản phẩm được chọn để trang checkout xử lý
                if (window.saveCart) window.saveCart(selectedItems); else if (window.saveCart) window.saveCart(selectedItems); else localStorage.setItem('pawpal_cart', JSON.stringify(selectedItems));
                const currentUser = getCurrentUser();
                window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, selectedItems);
                
                // Clear any lingering "buy now" state so checkout loads the normal cart
                sessionStorage.removeItem('pawpal_is_buynow');
                sessionStorage.removeItem('pawpal_buynow_cart');
                
                // Nếu có mã giảm giá đã áp dụng, lưu vào localStorage để checkout.html tự nhận diện
                if (appliedVoucher) {
                    localStorage.setItem('pawpal_applied_voucher_code', appliedVoucher.code);
                } else {
                    localStorage.removeItem('pawpal_applied_voucher_code');
                }
            });
        }
    }

    // Hàm áp dụng mã voucher
    function applyVoucherCode(selectedCode) {
        const code = (selectedCode || voucherInput.value).trim().toUpperCase();
        if (!code) {
            alert('Vui lòng nhập mã giảm giá.');
            return;
        }

        let voucher = vouchers.find(v => v.code === code && v.active);
        if (!voucher) {
            voucher = myVouchers.find(v => v.code === code);
        }
        if (!voucher) {
            alert('Mã giảm giá không tồn tại hoặc đã hết hạn.');
            return;
        }

        if (appliedVoucher && appliedVoucher.code === code) {
            appliedVoucher = null;
            localStorage.removeItem('pawpal_applied_voucher_code');
            renderVoucherHighlights();
            calculateTotals();
            voucherInput.value = '';
            return;
        }

        // Tính tổng tiền các sản phẩm được chọn để kiểm tra minOrderValue
        let checkedSubtotal = 0;
        cart.forEach(item => {
            if (selectedIds.has(normalizeId(item.id))) {
                const prod = products.find(p => isSameCartItemId(p.id, item.id));
                if (prod) {
                    checkedSubtotal += prod.price * getItemQuantity(item);
                }
            }
        });

        if (checkedSubtotal < voucher.minOrderValue) {
            alert(`Mã này chỉ áp dụng cho đơn hàng từ ${formatPrice(voucher.minOrderValue)} trở lên.`);
            return;
        }

        appliedVoucher = voucher;
        localStorage.setItem('pawpal_applied_voucher_code', code);
        voucherInput.value = '';
        renderVoucherHighlights();
        calculateTotals();
    }

    function renderVoucherHighlights() {
        const allVoucherButtons = document.querySelectorAll('.voucher-select-btn, .my-voucher-btn');
        allVoucherButtons.forEach(button => {
            const code = button.dataset.code;
            const isActive = appliedVoucher && appliedVoucher.code === code;
            button.classList.toggle('is-selected-voucher', !!isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    // Hiển thị giỏ hàng
    function renderCart() {
        if (!cart || cart.length === 0) {
            showEmptyState();
            return;
        }

        // Lọc những sản phẩm thực sự hợp lệ và còn tồn tại
        const cartItemsData = cart.map(item => {
            const product = products.find(p => isSameCartItemId(p.id, item.id));
            if (product) {
                return { ...product, quantity: getItemQuantity(item), qty: getItemQuantity(item) };
            }

            // Fallback cho các mặt hàng được lưu trực tiếp từ đơn hàng/nguồn ngoài catalogue
            return {
                ...item,
                name: item.name || `Sản phẩm ${item.id}`,
                brand: item.brand || '',
                price: Number(item.price || 0),
                image: item.image || '/assets/images/shop/products/placeholder.webp',
                quantity: getItemQuantity(item),
                qty: getItemQuantity(item),
                category: item.category || null
            };
        }).filter(item => item !== null);

        if (cartItemsData.length === 0) {
            showEmptyState();
            return;
        }

        cartEmptyState.classList.add('d-none');
        cartContentRow.classList.remove('d-none');

        cartItemsList.innerHTML = '';
        
        cartItemsData.forEach(item => {
            const itemTotal = item.price * getItemQuantity(item);

            const row = document.createElement('div');
            row.className = 'cart-item-row';
            row.dataset.id = item.id;
            
            const isChecked = selectedIds.has(normalizeId(item.id));
            
            row.innerHTML = `
                <div class="cart-item-checkbox-wrapper">
                    <input type="checkbox" class="form-check-input item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                </div>
                <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.onerror=null; this.src='/assets/images/shop/products/placeholder.webp'">
                <div class="cart-item-details">
                    <a href="/pages/shop/product-detail/product-detail.html?id=${item.id}" class="cart-item-name">${item.name}</a>
                    <div class="cart-item-meta">Thương hiệu: ${item.brand}</div>
                    <div class="cart-item-price-unit mt-1">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-qty-actions">
                    <button type="button" class="cart-item-qty-btn btn-qty-minus" ${getItemQuantity(item) <= 1 ? 'disabled' : ''}>-</button>
                    <span class="cart-item-qty-value">${getItemQuantity(item)}</span>
                    <button type="button" class="cart-item-qty-btn btn-qty-plus">+</button>
                </div>
                <div class="cart-item-total-price">${formatPrice(itemTotal)}</div>
                <button type="button" class="btn-remove-cart-item" title="Xóa sản phẩm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            `;

            // Gắn sự kiện cho các nút trong dòng
            const btnMinus = row.querySelector('.btn-qty-minus');
            const btnPlus = row.querySelector('.btn-qty-plus');
            const btnRemove = row.querySelector('.btn-remove-cart-item');
            const checkbox = row.querySelector('.item-checkbox');

            btnMinus.addEventListener('click', () => updateQuantity(item.id, getItemQuantity(item) - 1));
            btnPlus.addEventListener('click', () => updateQuantity(item.id, getItemQuantity(item) + 1));
            btnRemove.addEventListener('click', () => removeCartItem(item.id, row));
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedIds.add(normalizeId(item.id));
                } else {
                    selectedIds.delete(normalizeId(item.id));
                }
                
                // Cập nhật trạng thái selectAll
                if (selectAllItems) {
                    selectAllItems.checked = selectedIds.size === cart.length;
                }
                
                calculateTotals();
            });

            cartItemsList.appendChild(row);
        });

        // Đồng bộ trạng thái selectAll ban đầu
        if (selectAllItems) {
            selectAllItems.checked = selectedIds.size === cart.length;
        }

        calculateTotals();
    }

    // Tính toán lại tổng tiền
    function calculateSelectedSubtotal() {
        return cart.reduce((sum, item) => {
            if (!selectedIds.has(normalizeId(item.id))) {
                return sum;
            }
            const prod = products.find(p => isSameCartItemId(p.id, item.id));
            const unitPrice = prod?.price ?? Number(item.price) ?? 0;
            return sum + unitPrice * getItemQuantity(item);
        }, 0);
    }

    function calculateTotals() {
        let subtotal = 0;
        let selectedCount = 0;

        cart.forEach(item => {
            if (selectedIds.has(normalizeId(item.id))) {
                const prod = products.find(p => isSameCartItemId(p.id, item.id));
                const unitPrice = prod?.price ?? Number(item.price) ?? 0;
                subtotal += unitPrice * getItemQuantity(item);
                selectedCount += getItemQuantity(item);
            }
        });

        // Tổng số lượng sản phẩm hiển thị trên tiêu đề chính
        if (cartCountHeader) {
            cartCountHeader.textContent = cart.reduce((sum, item) => sum + getItemQuantity(item), 0);
        }

        cartSubtotal.textContent = formatPrice(subtotal);

        // Tính giảm giá voucher
        let discount = 0;
        if (appliedVoucher) {
            const validation = validateVoucherCode(appliedVoucher.code, subtotal);
            if (!validation.valid) {
                // Giữ voucher đã chọn trong state, chỉ tạm thời không tính giảm
                // để khi tăng số lượng lên đủ điều kiện sẽ tự áp lại ngay.
                discount = 0;
            } else {
                appliedVoucher = validation.voucher;
                discount = validation.discount;
            }
        }

        if (discount > 0) {
            rowDiscount.classList.replace('d-none', 'd-flex');
            discountCodeLabel.textContent = appliedVoucher.code;
            cartDiscount.textContent = `-${formatPrice(discount)}`;
        } else {
            rowDiscount.classList.replace('d-flex', 'd-none');
            discountCodeLabel.textContent = 'Voucher';
            cartDiscount.textContent = '-0đ';
        }

        const grandTotal = Math.max(0, subtotal - discount);
        cartGrandTotal.textContent = formatPrice(grandTotal);

        // Cập nhật badge giỏ hàng trên header
        if (typeof window.updateCartBadge === 'function') {
            window.updateCartBadge();
        }

        renderVoucherHighlights();
    }

    // Hiển thị trạng thái trống
    function showEmptyState() {
        cartContentRow.classList.add('d-none');
        cartEmptyState.classList.remove('d-none');
        if (typeof window.updateCartBadge === 'function') {
            window.updateCartBadge();
        }
    }

    // Cập nhật số lượng sản phẩm
    function updateQuantity(productId, newQty) {
        if (newQty < 1) return;

        const item = cart.find(i => isSameCartItemId(i.id, productId));
        if (item) {
            // Cap theo stock nếu có
            const maxQty = (item.stock != null && item.stock > 0) ? item.stock : newQty;
            if (newQty > maxQty) {
                showToast(`Chỉ còn ${maxQty} sản phẩm trong kho`, 'warning');
                newQty = maxQty;
            }
            item.quantity = newQty;
            item.qty = newQty;
            saveCart();
            renderCart();
        }
    }

    // Xóa một sản phẩm
    function removeCartItem(productId, rowElement) {
        rowElement.classList.add('item-removed');
        
        // Đợi hiệu ứng chuyển động hoàn tất rồi mới xóa
        setTimeout(() => {
            cart = cart.filter(i => !isSameCartItemId(i.id, productId));
            selectedIds.delete(normalizeId(productId));
            saveCart();
            renderCart();
        }, 300);
    }

    // Lưu giỏ hàng vào localStorage
    function saveCart() {
        if (window.saveCart) {
            window.saveCart(cart);
        } else {
            localStorage.setItem('pawpal_cart', JSON.stringify(cart));
            const currentUser = getCurrentUser();
            if (window.API && typeof window.API.saveUserCart === 'function') {
                window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, cart);
            }
        }
    }

    // Xóa toàn bộ giỏ hàng
        if (btnClearCart) {
            btnClearCart.addEventListener('click', () => {
                if (confirm('Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng?')) {
                    cart = [];
                    selectedIds.clear();
                    localStorage.removeItem('pawpal_applied_voucher_code');
                    saveCart();
                    renderCart();
                }
            });
        }

    function loadPersistedVoucher() {
        const code = localStorage.getItem('pawpal_applied_voucher_code');
        if (!code || (!vouchers.length && !myVouchers.length)) {
            return;
        }

        const result = validateVoucherCode(code, calculateSelectedSubtotal());
        if (result.valid) {
            appliedVoucher = result.voucher;
        }
        renderVoucherHighlights();
    }

    function renderMyVouchers() {
        if (!myVouchersList) {
            return;
        }

        if (!myVouchers.length) {
            myVouchersList.innerHTML = '<div class="text-muted">Bạn chưa có voucher đổi điểm nào.</div>';
            return;
        }

        myVouchersList.innerHTML = myVouchers.map(voucher => {
            return `
                <button type="button" class="btn btn-outline-primary btn-sm my-voucher-btn" data-code="${voucher.code}">
                    <strong>${voucher.code}</strong> • ${voucher.name}
                    <small class="text-muted">Áp dụng cho đơn từ ${formatPrice(voucher.minOrderValue || 0)}</small>
                </button>
            `;
        }).join('');

        myVouchersList.querySelectorAll('.my-voucher-btn').forEach(button => {
            button.addEventListener('click', () => {
                const code = button.dataset.code;
                applyVoucherCode(code);
            });
        });
    }

    function renderAvailableVouchers() {
        if (!availableVouchersList) {
            return;
        }

        const now = new Date();
        const activeVouchers = vouchers.filter(v => v.active
            && new Date(v.validFrom) <= now
            && new Date(v.validUntil) >= now);

        if (activeVouchers.length === 0) {
            availableVouchersList.innerHTML = '<div class="text-muted">Hiện không có mã ưu đãi nào.</div>';
            return;
        }

        availableVouchersList.innerHTML = activeVouchers.map(voucher => {
            const label = voucher.type === 'fixed'
                ? `-${formatPrice(voucher.value)}`
                : voucher.type === 'percentage'
                    ? `-${voucher.value}%` : `Freeship tối đa ${formatPrice(voucher.value)}`;
            const minOrderLabel = voucher.minOrderValue
                ? `Áp dụng cho đơn từ ${formatPrice(voucher.minOrderValue)}`
                : 'Áp dụng cho mọi đơn hàng';
            return `
                <button type="button" class="btn btn-outline-secondary btn-sm voucher-select-btn" data-code="${voucher.code}">
                    <strong>${voucher.code}</strong> • ${label}<br>
                    <small class="text-muted">${minOrderLabel}</small>
                </button>
            `;
        }).join('');

        availableVouchersList.querySelectorAll('.voucher-select-btn').forEach(button => {
            button.addEventListener('click', () => {
                const code = button.dataset.code;
                applyVoucherCode(code);
            });
        });

        renderVoucherHighlights();
    }

    function validateVoucherCode(code, subtotal) {
        let voucher = vouchers.find(v => v.code === code && v.active);
        if (!voucher) {
            voucher = myVouchers.find(v => v.code === code);
        }

        if (!voucher) {
            return { valid: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' };
        }

        const now = new Date();
        if (voucher.validFrom) {
            const validFrom = new Date(voucher.validFrom);
            if (now < validFrom) {
                return { valid: false, message: 'Mã giảm giá chưa bắt đầu áp dụng.' };
            }
        }

        if (voucher.validUntil) {
            const expiry = new Date(voucher.validUntil);
            if (now > expiry) {
                return { valid: false, message: 'Mã giảm giá đã hết hạn.' };
            }
        }

        if (subtotal < (voucher.minOrderValue || 0)) {
            return { valid: false, message: `Mã này chỉ áp dụng cho đơn hàng từ ${formatPrice(voucher.minOrderValue || 0)} trở lên.` };
        }

        if ((voucher.usageCount || 0) >= (voucher.maxUsage || Infinity)) {
            return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng.' };
        }

        if (voucher.applicableFor && !voucher.applicableFor.includes('all')) {
            const cartCategories = cart.map(item => {
                const prod = products.find(p => isSameCartItemId(p.id, item.id));
                return prod ? prod.category : (item.category || null);
            }).filter(Boolean);
            const hasMatchingCategory = cartCategories.some(category => voucher.applicableFor.includes(category));
            if (!hasMatchingCategory) {
                return { valid: false, message: 'Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng hiện tại.' };
            }
        }

        let discount = 0;
        if (voucher.type === 'fixed') {
            discount = voucher.value;
        } else if (voucher.type === 'percentage') {
            discount = Math.floor((subtotal * voucher.value) / 100);
            if (voucher.maxDiscount) {
                discount = Math.min(discount, voucher.maxDiscount);
            }
        } else if (voucher.type === 'shipping') {
            discount = 0;
        }

        return { valid: true, discount, voucher };
    }

    function restoreCartFromBackup(currentCart) {
        const backupJson = localStorage.getItem('pawpal_cart_unselected_backup');
        if (!backupJson) {
            return currentCart;
        }

        let backupItems = [];
        try {
            backupItems = JSON.parse(backupJson);
        } catch (err) {
            console.error(' Lỗi đọc backup giỏ hàng:', err);
            localStorage.removeItem('pawpal_cart_unselected_backup');
            return currentCart;
        }

        const mergedCart = [...currentCart];
        backupItems.forEach(backupItem => {
            const existing = mergedCart.find(item => isSameCartItemId(item.id, backupItem.id));
            if (existing) {
                const backupQty = getItemQuantity(backupItem);
                existing.quantity = getItemQuantity(existing) + backupQty;
                existing.qty = existing.quantity;
            } else {
                mergedCart.push(normalizeCartItem(backupItem));
            }
        });

        if (window.saveCart) window.saveCart(mergedCart); else if (window.saveCart) window.saveCart(mergedCart); else localStorage.setItem('pawpal_cart', JSON.stringify(mergedCart));
        const currentUser = getCurrentUser();
        if (window.API && typeof window.API.saveUserCart === 'function') {
            window.API.saveUserCart(currentUser?.id || currentUser?.phone || null, mergedCart);
        }
        localStorage.removeItem('pawpal_cart_unselected_backup');
        return mergedCart;
    }

    function getItemQuantity(item) {
        const qty = Number(item?.quantity ?? item?.qty ?? 1);
        return Number.isFinite(qty) && qty > 0 ? qty : 1;
    }

    function normalizeCartItem(item) {
        const quantity = getItemQuantity(item);
        return {
            ...item,
            quantity,
            qty: quantity
        };
    }

    // Khởi tạo
    await initCart();
});
