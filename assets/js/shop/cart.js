/**
 * cart.js — Xử lý logic giỏ hàng PawPal
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Đợi DataLoader sẵn sàng
    if (!window.DataLoader) {
        console.error(' DataLoader không tìm thấy');
        return;
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
    const appliedVouchersContainer = document.getElementById('applied-vouchers-container');
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

    // Format tiền tệ Việt Nam
    function formatPrice(price) {
        return price.toLocaleString('vi-VN') + 'đ';
    }

    // Tải dữ liệu giỏ hàng, sản phẩm và voucher
    async function initCart() {
        try {
            // Tải sản phẩm từ CSV
            products = await window.DataLoader.loadProducts();
            
            // Lấy giỏ hàng từ localStorage và phục hồi nếu có backup
            cart = restoreCartFromBackup(JSON.parse(localStorage.getItem('pawpal_cart') || '[]'));
            
            // Mặc định chọn tất cả sản phẩm
            cart.forEach(item => {
                selectedIds.add(Number(item.id));
            });

            // Tải danh sách voucher
            try {
                const vouchersResponse = await fetch('/data/vouchers.json');
                vouchers = await vouchersResponse.json();
            } catch (err) {
                console.error(' Lỗi tải danh sách voucher:', err);
            }

            const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
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
                    cart.forEach(item => selectedIds.add(Number(item.id)));
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
                const selectedItems = cart.filter(item => selectedIds.has(Number(item.id)));
                
                if (selectedItems.length === 0) {
                    e.preventDefault();
                    alert('Vui lòng chọn ít nhất một sản phẩm để thanh toán.');
                    return;
                }

                // Lưu lại giỏ hàng thanh toán và các phần không chọn (để phục hồi sau)
                const unselectedItems = cart.filter(item => !selectedIds.has(Number(item.id)));
                localStorage.setItem('pawpal_cart_unselected_backup', JSON.stringify(unselectedItems));
                
                // Cập nhật lại giỏ hàng chính chỉ gồm các sản phẩm được chọn để trang checkout xử lý
                localStorage.setItem('pawpal_cart', JSON.stringify(selectedItems));
                
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

        // Tính tổng tiền các sản phẩm được chọn để kiểm tra minOrderValue
        let checkedSubtotal = 0;
        cart.forEach(item => {
            if (selectedIds.has(Number(item.id))) {
                const prod = products.find(p => Number(p.id) === Number(item.id));
                if (prod) {
                    checkedSubtotal += prod.price * item.quantity;
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
        renderAppliedVoucherBadge();
        calculateTotals();
    }

    // Hiển thị badge voucher đã áp dụng
    function renderAppliedVoucherBadge() {
        if (!appliedVouchersContainer) return;
        
        if (!appliedVoucher) {
            appliedVouchersContainer.innerHTML = '';
            return;
        }

        let discountText = '';
        if (appliedVoucher.type === 'fixed') {
            discountText = `-${formatPrice(appliedVoucher.value)}`;
        } else if (appliedVoucher.type === 'percentage') {
            discountText = `-${appliedVoucher.value}%`;
        } else if (appliedVoucher.type === 'shipping') {
            discountText = `Freeship tối đa -${formatPrice(appliedVoucher.value)}`;
        }

        appliedVouchersContainer.innerHTML = `
            <div class="applied-voucher-badge d-inline-flex align-items-center gap-2 py-1 px-3 bg-success-light text-success rounded-pill border border-success">
                <span class="fw-bold">${appliedVoucher.code}</span>
                <span class="fs-sm">(${discountText})</span>
                <button type="button" class="btn-close btn-close-voucher btn-sm ms-2" aria-label="Close" id="btn-remove-voucher"></button>
            </div>
        `;

        // Bắt sự kiện xóa voucher
        document.getElementById('btn-remove-voucher').addEventListener('click', () => {
            appliedVoucher = null;
            renderAppliedVoucherBadge();
            calculateTotals();
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
            const product = products.find(p => Number(p.id) === Number(item.id));
            return product ? { ...product, quantity: item.quantity } : null;
        }).filter(item => item !== null);

        if (cartItemsData.length === 0) {
            showEmptyState();
            return;
        }

        cartEmptyState.classList.add('d-none');
        cartContentRow.classList.remove('d-none');

        cartItemsList.innerHTML = '';
        
        cartItemsData.forEach(item => {
            const itemTotal = item.price * item.quantity;

            const row = document.createElement('div');
            row.className = 'cart-item-row';
            row.dataset.id = item.id;
            
            const isChecked = selectedIds.has(Number(item.id));
            
            row.innerHTML = `
                <div class="cart-item-checkbox-wrapper">
                    <input type="checkbox" class="form-check-input item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                </div>
                <img src="../../${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.onerror=null; this.src='../../assets/images/shop/products/placeholder.webp'">
                <div class="cart-item-details">
                    <a href="../../pages/shop/product-detail.html?id=${item.id}" class="cart-item-name">${item.name}</a>
                    <div class="cart-item-meta">Thương hiệu: ${item.brand}</div>
                    <div class="cart-item-price-unit mt-1">${formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-qty-actions">
                    <button class="cart-item-qty-btn btn-qty-minus" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <span class="cart-item-qty-value">${item.quantity}</span>
                    <button class="cart-item-qty-btn btn-qty-plus">+</button>
                </div>
                <div class="cart-item-total-price">${formatPrice(itemTotal)}</div>
                <button class="btn-remove-cart-item" title="Xóa sản phẩm">
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

            btnMinus.addEventListener('click', () => updateQuantity(item.id, item.quantity - 1));
            btnPlus.addEventListener('click', () => updateQuantity(item.id, item.quantity + 1));
            btnRemove.addEventListener('click', () => removeCartItem(item.id, row));
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedIds.add(Number(item.id));
                } else {
                    selectedIds.delete(Number(item.id));
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
            if (!selectedIds.has(Number(item.id))) {
                return sum;
            }
            const prod = products.find(p => Number(p.id) === Number(item.id));
            return prod ? sum + prod.price * item.quantity : sum;
        }, 0);
    }

    function calculateTotals() {
        let subtotal = 0;
        let selectedCount = 0;

        cart.forEach(item => {
            if (selectedIds.has(Number(item.id))) {
                const prod = products.find(p => Number(p.id) === Number(item.id));
                if (prod) {
                    subtotal += prod.price * item.quantity;
                    selectedCount += item.quantity;
                }
            }
        });

        // Tổng số lượng sản phẩm hiển thị trên tiêu đề chính
        if (cartCountHeader) {
            cartCountHeader.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
        }

        cartSubtotal.textContent = formatPrice(subtotal);

        // Tính giảm giá voucher
        let discount = 0;
        if (appliedVoucher) {
            const validation = validateVoucherCode(appliedVoucher.code, subtotal);
            if (!validation.valid) {
                appliedVoucher = null;
                renderAppliedVoucherBadge();
                localStorage.removeItem('pawpal_applied_voucher_code');
                alert('Voucher đã tự động gỡ vì không còn hợp lệ.');
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
        }

        const grandTotal = Math.max(0, subtotal - discount);
        cartGrandTotal.textContent = formatPrice(grandTotal);

        // Cập nhật badge giỏ hàng trên header
        if (typeof window.updateCartBadge === 'function') {
            window.updateCartBadge();
        }
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
        
        const item = cart.find(i => Number(i.id) === Number(productId));
        if (item) {
            item.quantity = newQty;
            saveCart();
            renderCart();
        }
    }

    // Xóa một sản phẩm
    function removeCartItem(productId, rowElement) {
        rowElement.classList.add('item-removed');
        
        // Đợi hiệu ứng chuyển động hoàn tất rồi mới xóa
        setTimeout(() => {
            cart = cart.filter(i => Number(i.id) !== Number(productId));
            selectedIds.delete(Number(productId));
            saveCart();
            renderCart();
        }, 300);
    }

    // Lưu giỏ hàng vào localStorage
    function saveCart() {
        localStorage.setItem('pawpal_cart', JSON.stringify(cart));
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
            renderAppliedVoucherBadge();
        } else {
            localStorage.removeItem('pawpal_applied_voucher_code');
        }
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
            return `
                <button type="button" class="btn btn-outline-secondary btn-sm voucher-select-btn" data-code="${voucher.code}">
                    <strong>${voucher.code}</strong> • ${label}
                </button>
            `;
        }).join('');

        availableVouchersList.querySelectorAll('.voucher-select-btn').forEach(button => {
            button.addEventListener('click', () => {
                const code = button.dataset.code;
                applyVoucherCode(code);
            });
        });
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
                const prod = products.find(p => Number(p.id) === Number(item.id));
                return prod ? prod.category : null;
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
            const existing = mergedCart.find(item => Number(item.id) === Number(backupItem.id));
            if (existing) {
                existing.quantity += Number(backupItem.quantity || 0);
            } else {
                mergedCart.push(backupItem);
            }
        });

        localStorage.setItem('pawpal_cart', JSON.stringify(mergedCart));
        localStorage.removeItem('pawpal_cart_unselected_backup');
        return mergedCart;
    }

    // Khởi tạo
    await initCart();
});
