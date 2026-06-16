/**
 * cart.js — Xử lý logic giỏ hàng PawPal
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Đợi DataLoader sẵn sàng
    if (!window.DataLoader) {
        console.error('❌ DataLoader không tìm thấy');
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
    const rowDiscount = document.getElementById('row-discount');
    const discountCodeLabel = document.getElementById('discount-code-label');
    const cartDiscount = document.getElementById('cart-discount');
    
    // Select all checkbox
    const selectAllItems = document.getElementById('select-all-items');

    let products = [];
    let cart = [];
    let vouchers = [];
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
            
            // Lấy giỏ hàng từ localStorage
            cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
            
            // Mặc định chọn tất cả sản phẩm
            cart.forEach(item => {
                selectedIds.add(Number(item.id));
            });

            // Tải danh sách voucher
            try {
                const vouchersResponse = await fetch('/data/vouchers.json');
                vouchers = await vouchersResponse.json();
            } catch (err) {
                console.error('❌ Lỗi tải danh sách voucher:', err);
            }
            
            setupVoucherEvents();
            setupSelectAllEvent();
            setupCheckoutEvent();
            renderCart();
        } catch (error) {
            console.error('❌ Lỗi khởi tạo giỏ hàng:', error);
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
    function applyVoucherCode() {
        const code = voucherInput.value.trim().toUpperCase();
        if (!code) {
            alert('Vui lòng nhập mã giảm giá.');
            return;
        }

        const voucher = vouchers.find(v => v.code === code && v.active);
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

        cartEmptyState.style.display = 'none';
        cartContentRow.style.display = '';

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
            // Kiểm tra lại nếu đơn hàng ko đủ minOrderValue thì hủy voucher
            if (subtotal < appliedVoucher.minOrderValue) {
                appliedVoucher = null;
                renderAppliedVoucherBadge();
                alert('Voucher đã tự động gỡ vì tổng giá trị đơn hàng được chọn nhỏ hơn mức tối thiểu.');
            } else {
                if (appliedVoucher.type === 'fixed') {
                    discount = appliedVoucher.value;
                } else if (appliedVoucher.type === 'percentage') {
                    discount = Math.floor((subtotal * appliedVoucher.value) / 100);
                    if (appliedVoucher.maxDiscount) {
                        discount = Math.min(discount, appliedVoucher.maxDiscount);
                    }
                } else if (appliedVoucher.type === 'shipping') {
                    discount = Math.min(appliedVoucher.value, 0); // Phí ship mặc định đang miễn phí
                }
            }
        }

        if (discount > 0) {
            rowDiscount.style.display = 'flex';
            discountCodeLabel.textContent = appliedVoucher.code;
            cartDiscount.textContent = `-${formatPrice(discount)}`;
        } else {
            rowDiscount.style.display = 'none';
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
        cartContentRow.style.display = 'none';
        cartEmptyState.style.display = 'block';
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
                saveCart();
                renderCart();
            }
        });
    }

    // Khởi tạo
    await initCart();
});
