
const checkoutState = {
    cart: [],
    products: [],
    user: null,
    selectedAddress: null,
    editingAddressId: null,
    deliveryOptions: [],
    paymentMethods: [],
    selectedDelivery: 'standard',
    selectedPayment: 'cod',
    vouchers: [],
    myVouchers: [],
    appliedVoucher: null,
    pointsUsed: 0,
    totals: {
        subtotal: 0,
        shippingFee: 0,
        pointsDiscount: 0,
        voucherDiscount: 0,
        grandTotal: 0
    }
};

const PENDING_POINTS_KEY = 'pawpal_checkout_points_used';

function ensureSelectOption(selectElement, value) {
    if (!selectElement || !value) return;

    const hasOption = Array.from(selectElement.options).some((option) => option.value === value);
    if (!hasOption) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
    }
}

function buildStructuredAddressLabel(address) {
    if (!address || typeof address !== 'object') return '';

    return [address.street, address.district, address.city]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');
}

function normalizeCheckoutAddress(address, fallbackUser = {}) {
    if (!address || typeof address !== 'string' && !address.street && !address.address) return null;
    
    const addressStr = typeof address === 'string' ? address : (address.street || address.address || '');
    if (addressStr.toLowerCase() === 'chưa thiết lập' || addressStr.toLowerCase() === 'chua thiet lap' || addressStr.trim() === '') {
        return null;
    }

    if (typeof address === 'string') {
        const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
        let city = '';
        let district = '';
        let street = '';

        if (parts.length >= 3) {
            city = parts[parts.length - 1];
            district = parts[parts.length - 2];
            street = parts.slice(0, parts.length - 2).join(', ');
        } else if (parts.length === 2) {
            street = parts[0];
            city = parts[1];
            district = '';
        } else {
            street = parts[0] || address;
            city = 'TP. Hồ Chí Minh';
            district = '';
        }

        return {
            id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            label: 'Địa chỉ đã lưu',
            name: fallbackUser.name || '',
            phone: fallbackUser.phone || '',
            street,
            district,
            city,
            note: '',
            isDefault: true
        };
    }

    return {
        id: address.id || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: address.label || 'Dia chi da luu',
        name: address.name || fallbackUser.name || '',
        phone: address.phone || fallbackUser.phone || '',
        street: address.street || address.address || '',
        district: address.district || '',
        city: address.city || '',
        note: address.note || '',
        isDefault: Boolean(address.isDefault)
    };
}

function getCheckoutUserAddresses(user) {
    const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
    const normalized = addresses
        .map((address) => normalizeCheckoutAddress(address, user))
        .filter(Boolean);

    if (!normalized.length && user?.address) {
        const legacyAddress = normalizeCheckoutAddress(user.address, user);
        if (legacyAddress) normalized.push(legacyAddress);
    }

    return normalized.map((address, index) => ({
        ...address,
        isDefault: index === 0 ? true : Boolean(address.isDefault)
    }));
}




document.addEventListener('DOMContentLoaded', async () => {
    try {
        checkoutState.user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        
        const isBuyNow = sessionStorage.getItem('pawpal_is_buynow') === 'true';
        
        if (isBuyNow) {
            checkoutState.cart = JSON.parse(sessionStorage.getItem('pawpal_buynow_cart') || '[]');
            
            if (checkoutState.cart.length === 0) {
                window.location.href = '/pages/shop/shop.html';
                return;
            }
        } else {
            if (window.API && typeof window.API.getUserCart === 'function') {
                checkoutState.cart = await window.API.getUserCart(checkoutState.user?.id || checkoutState.user?.phone || null);
            } else {
                checkoutState.cart = [];
            }
            
            if (!checkoutState.cart || checkoutState.cart.length === 0) {
                window.location.href = '/pages/shop/shop.html';
                return;
            }
        }
        
        await loadData();
        await loadProducts();

        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        checkoutState.user = checkoutState.user || currentUser;
        checkoutState.myVouchers = JSON.parse(localStorage.getItem('pawpal_my_vouchers') || '[]')
            .filter(v => currentUser && v.ownerPhone === currentUser.phone);
        
        initializeShippingForm();
        renderDeliveryOptions();
        renderPaymentMethods();
        loadPersistedVoucher();
        loadPersistedPoints();
        renderVoucherHints();
        renderOrderSummary();
        
        if (checkoutState.user && (checkoutState.user.points || checkoutState.user.pawPoints)) {
            initializePawPoints();
        }
        
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing checkout:', error);
        showToast('Có lỗi xảy ra khi tải trang', 'error');
    }
});


async function loadData() {
    try {
        if (window.API && typeof window.API.getDeliveryOptions === 'function') {
            checkoutState.deliveryOptions = await window.API.getDeliveryOptions();
        } else {
            const deliveryResponse = await fetch('/data/delivery-options.json');
            checkoutState.deliveryOptions = await deliveryResponse.json();
        }
        
        if (window.API && typeof window.API.getPaymentMethods === 'function') {
            checkoutState.paymentMethods = await window.API.getPaymentMethods();
        } else {
            const paymentResponse = await fetch('/data/payment-methods.json');
            checkoutState.paymentMethods = await paymentResponse.json();
        }
        
        await loadVouchers();
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadVouchers() {
    try {
        if (window.API && typeof window.API.getVouchers === 'function') {
            checkoutState.vouchers = await window.API.getVouchers();
        } else {
            const vouchersResponse = await fetch('/data/vouchers.json');
            checkoutState.vouchers = await vouchersResponse.json();
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadProducts() {
    try {
        if (window.DataLoader && typeof window.DataLoader.loadProducts === 'function') {
            checkoutState.products = await window.DataLoader.loadProducts();
            
            // Merge product details into cart items
            checkoutState.cart = checkoutState.cart.map(item => {
                const product = checkoutState.products.find(p => String(p.id) === String(item.id));
                if (product) {
                    return { 
                        ...product, 
                        ...item, 
                        price: Number(item.price) || Number(product.price) || 0,
                        quantity: item.qty || item.quantity || 1, 
                        qty: item.qty || item.quantity || 1 
                    };
                }
                return { ...item, quantity: item.qty || item.quantity || 1, qty: item.qty || item.quantity || 1 };
            });
        } else {
            console.warn('DataLoader không có sẵn, không thể tải sản phẩm');
            checkoutState.products = [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
        checkoutState.products = [];
    }
}

function validateCheckoutCart() {
    if (!checkoutState.cart || checkoutState.cart.length === 0) {
        return { valid: false, message: 'Giỏ hàng của bạn đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.' };
    }

    if (!checkoutState.products || checkoutState.products.length === 0) {
        return { valid: true };
    }

    for (const item of checkoutState.cart) {
        const product = checkoutState.products.find(p => String(p.id) === String(item.id));
        if (!product) {
            continue;
        }

        if (!product.inStock || Number(item.quantity) > Number(product.stock)) {
            const remaining = product.stock || 0;
            return { valid: false, message: `Sản phẩm "${product.name}" chỉ còn ${remaining} trong kho. Vui lòng điều chỉnh số lượng.` };
        }

    }

    if (checkoutState.appliedVoucher) {
        const validation = validateVoucher(checkoutState.appliedVoucher.code, false);
        if (!validation.valid) {
            checkoutState.totals.voucherDiscount = 0;
            renderAppliedVoucherUI();
            updateOrderTotals();
        }
    }

    updateOrderTotals();
    if (checkoutState.totals.grandTotal <= 0) {
        return { valid: false, message: 'Tổng thanh toán không hợp lệ. Vui lòng kiểm tra lại đơn hàng.' };
    }

    return { valid: true };
}

function validateVoucher(code, showMessage = true) {
    let voucher = checkoutState.vouchers.find(v => v.code === code && v.active);
    if (!voucher) {
        voucher = checkoutState.myVouchers.find(v => v.code === code);
    }

    if (!voucher) {
        return { valid: false, message: 'Mã giảm giá không tồn tại' };
    }
    
    const now = new Date();
    const expiry = new Date(voucher.validUntil);
    if (now > expiry) {
        return { valid: false, message: 'Mã giảm giá đã hết hạn' };
    }
    
    const subtotal = calculateSubtotal();
    if (subtotal < voucher.minOrderValue) {
        return { 
            valid: false, 
            message: `Đơn hàng tối thiểu ${formatCurrency(voucher.minOrderValue)} để áp dụng mã này` 
        };
    }
    
    if (voucher.usageCount >= voucher.maxUsage) {
        return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
    }
    if (voucher.applicableFor && !voucher.applicableFor.includes('all')) {
        const cartCategories = checkoutState.cart.map(item => {
            const product = checkoutState.products.find(p => String(p.id) === String(item.id));
            const rawCat = product ? String(product.categoryName || product.category || item.categoryName || item.category || '').toLowerCase().trim() : '';
            
            if (rawCat.includes('thực phẩm') || rawCat.includes('thuc pham') || rawCat.includes('thức ăn') || rawCat.includes('thuc an') || rawCat.includes('food') || rawCat.includes('pate') || rawCat.includes('hạt')) return 'food';
            if (rawCat.includes('đồ chơi') || rawCat.includes('do choi') || rawCat.includes('toy')) return 'toys';
            if (rawCat.includes('vệ sinh') || rawCat.includes('ve sinh') || rawCat.includes('cát') || rawCat.includes('cat')) return 'hygiene';
            if (rawCat.includes('chăm sóc') || rawCat.includes('cham soc') || rawCat.includes('care')) return 'care';
            
            return product ? (product.categoryName || product.category) : null;
        }).filter(Boolean);

        const hasMatchingCategory = cartCategories.some(category => voucher.applicableFor.includes(category));
        if (!hasMatchingCategory) {
            return { valid: false, message: 'Mã giảm giá không áp dụng cho sản phẩm trong giỏ hàng hiện tại' };
        }
    }
    
    let discount = 0;
    if (voucher.type === 'fixed') {
        discount = voucher.value;
    } else if (voucher.type === 'percentage') {
        discount = Math.min(
            Math.floor((subtotal * voucher.value) / 100),
            voucher.maxDiscount || Infinity
        );
    } else if (voucher.type === 'shipping') {
        discount = Math.min(voucher.value, checkoutState.totals.shippingFee);
    }
    
    return { valid: true, discount, voucher };
}

function calculateVoucherDiscount() {
    if (!checkoutState.appliedVoucher) {
        return 0;
    }

    const validation = validateVoucher(checkoutState.appliedVoucher.code, false);
    if (!validation.valid) {
        return 0;
    }

    checkoutState.appliedVoucher = validation.voucher;
    return validation.discount || 0;
}

function renderAppliedVoucherUI() {
    const appliedVoucherElement = document.getElementById('applied-voucher');
    const voucherCodeDisplay = document.getElementById('voucher-code-display');
    const voucherAmount = document.getElementById('voucher-amount');

    if (!checkoutState.appliedVoucher) {
        if (appliedVoucherElement) {
            appliedVoucherElement.classList.add('d-none');
        }
        return;
    }

    if (appliedVoucherElement) {
        appliedVoucherElement.classList.remove('d-none');
    }
    if (voucherCodeDisplay) {
        voucherCodeDisplay.textContent = checkoutState.appliedVoucher.code;
    }
    if (voucherAmount) {
        voucherAmount.textContent = `-${formatCurrency(checkoutState.totals.voucherDiscount)}`;
    }
}

function renderVoucherHints() {
    const dropdown = document.getElementById('checkoutVoucherDropdown');
    if (!dropdown) return;

    const subtotal = calculateSubtotal();
    const vouchers = [...checkoutState.vouchers, ...checkoutState.myVouchers];
    const seen = new Set();

    const visibleVouchers = vouchers.filter(voucher => {
        if (!voucher || !voucher.code || seen.has(voucher.code)) return false;
        seen.add(voucher.code);
        return true;
    });

    if (visibleVouchers.length === 0) {
        dropdown.innerHTML = '<div class="px-3 py-2 text-muted small">Không có mã giảm giá nào</div>';
        return;
    }

    dropdown.innerHTML = visibleVouchers.map(voucher => {
        const minimum = Number(voucher.minOrderValue || 0);
        const isEligible = subtotal >= minimum;
        
        let discountText = voucher.type === 'percentage'
            ? `-${voucher.value}%`
            : `-${formatCurrency(voucher.value)}`;
            
        if (voucher.type === 'percentage' && voucher.maxDiscount) {
            discountText += ` (Tối đa ${formatCurrency(voucher.maxDiscount)})`;
        }

        return `
            <div class="dropdown-item voucher-dropdown-item ${isEligible ? '' : 'opacity-50'}" style="cursor:${isEligible ? 'pointer' : 'not-allowed'}; padding: 10px 16px; border-bottom: 1px solid #eee; white-space: normal;" data-voucher-code="${voucher.code}" data-eligible="${isEligible}">
                <div class="fw-bold text-primary-custom" style="font-size: 0.95rem;">${voucher.code} <span class="ms-2 badge ${isEligible ? 'bg-success' : 'bg-secondary'}">${isEligible ? 'Đủ ĐK' : 'Chưa đủ ĐK'}</span></div>
                <div class="text-muted" style="font-size: 0.85rem; margin-top: 2px;">Giảm ${discountText}</div>
                <div class="text-muted mt-1" style="font-size: 0.75rem; color: #e67e22 !important;">Đơn tối thiểu: ${formatCurrency(minimum)}</div>
            </div>
        `;
    }).join('');

    dropdown.querySelectorAll('.voucher-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.dataset.eligible === 'true') {
                const input = document.getElementById('voucher-input');
                if (input) {
                    input.value = item.dataset.voucherCode || '';
                    dropdown.style.display = 'none';
                    applyVoucher();
                }
            }
        });
    });
}

function loadPersistedVoucher() {
    const code = localStorage.getItem('pawpal_applied_voucher_code');
    if (!code) {
        return;
    }

    const result = validateVoucher(code, false);
    if (result.valid) {
        checkoutState.appliedVoucher = result.voucher;
        checkoutState.totals.voucherDiscount = result.discount;
        renderAppliedVoucherUI();
    } else {
        localStorage.removeItem('pawpal_applied_voucher_code');
    }
}

// ============================================================================
// Shipping Form & Address Management
// ============================================================================
function initializeShippingForm() {
    if (checkoutState.user) {
        checkoutState.user.addresses = getCheckoutUserAddresses(checkoutState.user);

        const saveSection = document.getElementById('save-address-section');
        if (saveSection) saveSection.classList.remove('d-none');

        if (checkoutState.user.addresses && checkoutState.user.addresses.length > 0) {
            const defaultAddr = checkoutState.user.addresses.find(a => a.isDefault) || checkoutState.user.addresses[0];
            selectCheckoutAddress(defaultAddr);
        } else {
            // Trường hợp user chưa có địa chỉ lưu sẵn
            const manualWrapper = document.getElementById('manual-address-wrapper');
            const selectedAddressCard = document.getElementById('selected-address-card');
            const btnOpenBook = document.getElementById('btn-open-address-book');
            const btnEditSelected = document.getElementById('btn-edit-selected-address');

            if (manualWrapper) manualWrapper.classList.remove('d-none');
            if (selectedAddressCard) selectedAddressCard.classList.add('d-none');
            if (btnOpenBook) btnOpenBook.style.display = 'none';
            if (btnEditSelected) btnEditSelected.style.display = 'none';

            const fullNameInput = document.getElementById('fullName');
            const phoneInput = document.getElementById('phone');
            const addressInput = document.getElementById('address');
            if (fullNameInput) fullNameInput.value = checkoutState.user.name || '';
            if (phoneInput) phoneInput.value = checkoutState.user.phone || '';
            if (addressInput) addressInput.value = checkoutState.user.address || '';
        }
    } else {
        // Khách vãng lai
        const manualWrapper = document.getElementById('manual-address-wrapper');
        const selectedAddressCard = document.getElementById('selected-address-card');
        const btnOpenBook = document.getElementById('btn-open-address-book');
        const btnEditSelected = document.getElementById('btn-edit-selected-address');

        if (manualWrapper) manualWrapper.classList.remove('d-none');
        if (selectedAddressCard) selectedAddressCard.classList.add('d-none');
        if (btnOpenBook) btnOpenBook.style.display = 'none';
        if (btnEditSelected) btnEditSelected.style.display = 'none';
    }
}

function selectCheckoutAddress(address) {
    if (!address) return;
    checkoutState.selectedAddress = address;

    // Cập nhật card hiển thị
    const selectedAddressCard = document.getElementById('selected-address-card');
    const manualWrapper = document.getElementById('manual-address-wrapper');
    const btnOpenBook = document.getElementById('btn-open-address-book');
    const btnEditSelected = document.getElementById('btn-edit-selected-address');

    const nameEl = document.getElementById('selected-addr-name');
    const phoneEl = document.getElementById('selected-addr-phone');
    const fullEl = document.getElementById('selected-addr-full');
    const noteEl = document.getElementById('selected-addr-note');
    const defaultBadge = document.getElementById('selected-addr-default-badge');

    if (nameEl) nameEl.textContent = address.name || checkoutState.user?.name || 'Người nhận';
    if (phoneEl) phoneEl.textContent = address.phone || checkoutState.user?.phone || '';
    if (fullEl) fullEl.textContent = buildStructuredAddressLabel(address) || address.street || address.address || '';

    if (noteEl) {
        if (address.note && address.note.trim()) {
            noteEl.textContent = `Ghi chú: ${address.note}`;
            noteEl.classList.remove('d-none');
        } else {
            noteEl.classList.add('d-none');
        }
    }

    if (defaultBadge) {
        if (address.isDefault) {
            defaultBadge.classList.remove('d-none');
        } else {
            defaultBadge.classList.add('d-none');
        }
    }

    if (selectedAddressCard) selectedAddressCard.classList.remove('d-none');
    if (manualWrapper) manualWrapper.classList.add('d-none');
    if (btnOpenBook) btnOpenBook.style.display = 'inline-block';
    if (btnEditSelected) btnEditSelected.style.display = 'inline-block';

    // Đồng bộ vào form ẩn để form validation và đơn hàng lấy chính xác
    fillAddressForm(address);
}

function fillAddressForm(address) {
    if (!address) return;
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    const noteInput = document.getElementById('note');

    const resolvedName = address.name || checkoutState.user?.name || '';
    const resolvedPhone = address.phone || checkoutState.user?.phone || '';
    const resolvedStreet = address.street || address.address || '';
    const resolvedCity = address.city || 'TP. Hồ Chí Minh';
    const resolvedDistrict = address.district || (districtSelect?.options?.[1]?.value || 'Quận 1');

    if (fullNameInput) fullNameInput.value = resolvedName;
    if (phoneInput) phoneInput.value = resolvedPhone;
    if (addressInput) addressInput.value = resolvedStreet;

    if (citySelect) {
        ensureSelectOption(citySelect, resolvedCity);
        citySelect.value = resolvedCity;
    }
    if (districtSelect) {
        ensureSelectOption(districtSelect, resolvedDistrict);
        districtSelect.value = resolvedDistrict;
    }
    if (noteInput) noteInput.value = address.note || '';
}

function openAddressBookModal() {
    if (!checkoutState.user) return;
    checkoutState.user.addresses = getCheckoutUserAddresses(checkoutState.user);

    const listContainer = document.getElementById('addressBookListContainer');
    if (!listContainer) return;

    if (!checkoutState.user.addresses || checkoutState.user.addresses.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-4 text-muted">
                <p>Bạn chưa lưu địa chỉ giao hàng nào.</p>
                <button type="button" class="btn-address-action text-brand" onclick="openAddressEditModal(null)">+ Thêm địa chỉ đầu tiên</button>
            </div>
        `;
    } else {
        listContainer.innerHTML = checkoutState.user.addresses.map((addr) => {
            const isSelected = checkoutState.selectedAddress && String(checkoutState.selectedAddress.id) === String(addr.id);
            const isDefault = Boolean(addr.isDefault);
            const addrFull = buildStructuredAddressLabel(addr) || addr.street || addr.address || '';

            return `
                <div class="address-card-item ${isDefault ? 'is-default' : ''} ${isSelected ? 'selected' : ''}" data-id="${addr.id}">
                    <div class="address-card-main">
                        <input type="radio" name="addressChoiceRadio" value="${addr.id}" id="addr-choice-${addr.id}" ${isSelected ? 'checked' : ''} class="address-card-radio">
                        <label for="addr-choice-${addr.id}" class="address-card-content cursor-pointer">
                            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                <strong style="color: #203A2C;">${addr.name || 'Người nhận'}</strong>
                                <span class="text-muted small">${addr.phone || ''}</span>
                                ${isDefault ? '<span class="badge-default-addr">Mặc định</span>' : ''}
                            </div>
                            <div class="address-card-text text-muted small">
                                ${addrFull}
                            </div>
                            ${addr.note ? `<div class="text-muted small fst-italic mt-1">Ghi chú: ${addr.note}</div>` : ''}
                        </label>
                    </div>
                    <div class="address-card-actions">
                        <button type="button" class="btn-address-action action-edit" onclick="openAddressEditModal('${addr.id}')">Sửa</button>
                        ${!isDefault ? `<button type="button" class="btn-address-action action-default" onclick="setDefaultAddressDirectly('${addr.id}')">Thiết lập mặc định</button>` : ''}
                        ${!isDefault && checkoutState.user.addresses.length > 1 ? `<button type="button" class="btn-address-action action-delete" onclick="deleteAddressDirectly('${addr.id}')">Xóa</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    const overlay = document.getElementById('addressBookModalOverlay');
    if (overlay) overlay.classList.remove('d-none');
}

function closeAddressBookModal() {
    const overlay = document.getElementById('addressBookModalOverlay');
    if (overlay) overlay.classList.add('d-none');
}

function confirmAddressChoice() {
    const selectedRadio = document.querySelector('input[name="addressChoiceRadio"]:checked');
    if (selectedRadio && checkoutState.user?.addresses) {
        const found = checkoutState.user.addresses.find(a => String(a.id) === String(selectedRadio.value));
        if (found) {
            selectCheckoutAddress(found);
            showToast('Đã chọn địa chỉ giao hàng', 'info');
        }
    }
    closeAddressBookModal();
}

function setDefaultAddressDirectly(addrId) {
    if (!checkoutState.user || !checkoutState.user.addresses) return;

    checkoutState.user.addresses.forEach(a => {
        a.isDefault = (String(a.id) === String(addrId));
    });

    const defaultAddr = checkoutState.user.addresses.find(a => a.isDefault);
    if (defaultAddr) {
        checkoutState.user.address = buildStructuredAddressLabel(defaultAddr);
    }

    localStorage.setItem('pawpal_current_user', JSON.stringify(checkoutState.user));

    if (checkoutState.selectedAddress && String(checkoutState.selectedAddress.id) === String(addrId)) {
        checkoutState.selectedAddress.isDefault = true;
        selectCheckoutAddress(defaultAddr);
    } else {
        // Cập nhật lại UI thẻ hiện tại nếu nó vừa bị bỏ mặc định
        if (checkoutState.selectedAddress) {
            const updatedCur = checkoutState.user.addresses.find(a => String(a.id) === String(checkoutState.selectedAddress.id));
            if (updatedCur) selectCheckoutAddress(updatedCur);
        }
    }

    openAddressBookModal();
    showToast('Đã cập nhật địa chỉ mặc định', 'success');
}

function deleteAddressDirectly(addrId) {
    if (!checkoutState.user || !checkoutState.user.addresses) return;

    checkoutState.user.addresses = checkoutState.user.addresses.filter(a => String(a.id) !== String(addrId));
    localStorage.setItem('pawpal_current_user', JSON.stringify(checkoutState.user));

    if (checkoutState.selectedAddress && String(checkoutState.selectedAddress.id) === String(addrId)) {
        const fallback = checkoutState.user.addresses.find(a => a.isDefault) || checkoutState.user.addresses[0];
        if (fallback) selectCheckoutAddress(fallback);
    }

    openAddressBookModal();
    showToast('Đã xóa địa chỉ thành công', 'info');
}

function openAddressEditModal(addrId = null) {
    checkoutState.editingAddressId = addrId;

    const modalTitle = document.getElementById('addressEditModalTitle');
    const form = document.getElementById('modal-address-form');
    if (form) form.reset();

    const fullNameInput = document.getElementById('modalFullName');
    const phoneInput = document.getElementById('modalPhone');
    const addressInput = document.getElementById('modalAddress');
    const citySelect = document.getElementById('modalCity');
    const districtSelect = document.getElementById('modalDistrict');
    const noteInput = document.getElementById('modalNote');
    const setDefaultCheckbox = document.getElementById('modalSetDefault');

    if (addrId && checkoutState.user?.addresses) {
        const addr = checkoutState.user.addresses.find(a => String(a.id) === String(addrId));
        if (modalTitle) modalTitle.textContent = 'Chỉnh sửa thông tin địa chỉ';
        if (addr) {
            if (fullNameInput) fullNameInput.value = addr.name || '';
            if (phoneInput) phoneInput.value = addr.phone || '';
            if (addressInput) addressInput.value = addr.street || addr.address || '';
            if (citySelect) {
                ensureSelectOption(citySelect, addr.city);
                citySelect.value = addr.city || '';
            }
            if (districtSelect) {
                ensureSelectOption(districtSelect, addr.district);
                districtSelect.value = addr.district || '';
            }
            if (noteInput) noteInput.value = addr.note || '';
            if (setDefaultCheckbox) setDefaultCheckbox.checked = Boolean(addr.isDefault);
        }
    } else {
        if (modalTitle) modalTitle.textContent = 'Thêm địa chỉ nhận hàng mới';
        if (fullNameInput) fullNameInput.value = checkoutState.user?.name || '';
        if (phoneInput) phoneInput.value = checkoutState.user?.phone || '';
        if (setDefaultCheckbox) {
            const hasExisting = checkoutState.user?.addresses && checkoutState.user.addresses.length > 0;
            setDefaultCheckbox.checked = !hasExisting;
        }
    }

    const overlay = document.getElementById('addressEditModalOverlay');
    if (overlay) overlay.classList.remove('d-none');
}

function closeAddressEditModal() {
    const overlay = document.getElementById('addressEditModalOverlay');
    if (overlay) overlay.classList.add('d-none');
}

function saveAddressFromModal() {
    const fullNameInput = document.getElementById('modalFullName');
    const phoneInput = document.getElementById('modalPhone');
    const addressInput = document.getElementById('modalAddress');
    const citySelect = document.getElementById('modalCity');
    const districtSelect = document.getElementById('modalDistrict');
    const noteInput = document.getElementById('modalNote');
    const setDefaultCheckbox = document.getElementById('modalSetDefault');

    const name = fullNameInput?.value.trim() || '';
    const phone = phoneInput?.value.trim() || '';
    const street = addressInput?.value.trim() || '';
    const city = citySelect?.value || '';
    const district = districtSelect?.value || '';
    const note = noteInput?.value.trim() || '';
    const isDefault = Boolean(setDefaultCheckbox?.checked);

    if (!name) {
        showToast('Vui lòng nhập họ và tên người nhận', 'error');
        fullNameInput?.focus();
        return;
    }
    if (!phone || !/^0[0-9]{9}$/.test(phone)) {
        showToast('Số điện thoại không hợp lệ (cần 10 chữ số bắt đầu bằng số 0)', 'error');
        phoneInput?.focus();
        return;
    }
    if (!street) {
        showToast('Vui lòng nhập địa chỉ chi tiết', 'error');
        addressInput?.focus();
        return;
    }
    if (!city) {
        showToast('Vui lòng chọn Tỉnh/Thành phố', 'error');
        citySelect?.focus();
        return;
    }
    if (!district) {
        showToast('Vui lòng chọn Quận/Huyện', 'error');
        districtSelect?.focus();
        return;
    }

    if (!checkoutState.user) {
        checkoutState.user = {
            id: 'user-' + Date.now(),
            name,
            phone,
            addresses: []
        };
    }
    if (!Array.isArray(checkoutState.user.addresses)) {
        checkoutState.user.addresses = [];
    }

    let savedAddress = null;

    if (checkoutState.editingAddressId) {
        const idx = checkoutState.user.addresses.findIndex(a => String(a.id) === String(checkoutState.editingAddressId));
        if (idx !== -1) {
            checkoutState.user.addresses[idx] = {
                ...checkoutState.user.addresses[idx],
                name,
                phone,
                street,
                city,
                district,
                note,
                isDefault: isDefault || checkoutState.user.addresses[idx].isDefault
            };
            savedAddress = checkoutState.user.addresses[idx];
        }
    } else {
        savedAddress = {
            id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            label: `Địa chỉ ${checkoutState.user.addresses.length + 1}`,
            name,
            phone,
            street,
            city,
            district,
            note,
            isDefault: isDefault || checkoutState.user.addresses.length === 0
        };
        checkoutState.user.addresses.push(savedAddress);
    }

    if (isDefault && savedAddress) {
        checkoutState.user.addresses.forEach(a => {
            a.isDefault = (String(a.id) === String(savedAddress.id));
        });
        savedAddress.isDefault = true;
        checkoutState.user.address = buildStructuredAddressLabel(savedAddress);
    }

    // Lưu vào localStorage
    localStorage.setItem('pawpal_current_user', JSON.stringify(checkoutState.user));

    // Đồng bộ ngay lập tức vào card giao diện thanh toán
    if (savedAddress) {
        selectCheckoutAddress(savedAddress);
    }

    closeAddressEditModal();
    closeAddressBookModal();
    showToast(isDefault ? 'Đã lưu và đặt làm địa chỉ mặc định thành công!' : 'Đã lưu địa chỉ thành công!', 'success');
}

// Gắn window để gọi từ inline onclick nếu có
window.openAddressBookModal = openAddressBookModal;
window.closeAddressBookModal = closeAddressBookModal;
window.confirmAddressChoice = confirmAddressChoice;
window.setDefaultAddressDirectly = setDefaultAddressDirectly;
window.deleteAddressDirectly = deleteAddressDirectly;
window.openAddressEditModal = openAddressEditModal;
window.closeAddressEditModal = closeAddressEditModal;
window.saveAddressFromModal = saveAddressFromModal;

// ============================================================================
// Delivery Options
// ============================================================================
function renderDeliveryOptions() {
    const container = document.getElementById('delivery-options');
    container.innerHTML = '';
    
    checkoutState.deliveryOptions.forEach((option, index) => {
        const isSelected = option.id === checkoutState.selectedDelivery;
        
        const optionDiv = document.createElement('div');
        optionDiv.className = `delivery-option ${isSelected ? 'selected' : ''}`;
        optionDiv.innerHTML = `
            <input type="radio" name="delivery" value="${option.id}" 
                   id="delivery-${option.id}" ${isSelected ? 'checked' : ''}
                   data-fee="${option.fee}">
            <svg class="delivery-icon" viewBox="0 0 24 24">
                ${option.id === 'standard' ? 
                    '<path d="M18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3zM3 6v9h.76c.55-.61 1.35-1 2.24-1s1.69.39 2.24 1H15V6H3z"/>' :
                    '<path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z"/><path d="M10.09 13.75L7.77 11.42l-1.06 1.06 3.38 3.38 5.66-5.66-1.06-1.06z"/>'
                }
            </svg>
            <div class="delivery-info">
                <h4>${option.name}</h4>
                <p>${option.description}</p>
            </div>
            <div class="delivery-fee ${option.fee === 0 ? 'free' : ''}">
                ${option.fee === 0 ? 'Miễn phí' : formatCurrency(option.fee)}
            </div>
        `;
        
        optionDiv.addEventListener('click', () => {
            selectDeliveryOption(option.id, option.fee);
        });
        
        container.appendChild(optionDiv);
    });
}

function selectDeliveryOption(deliveryId, fee) {
    checkoutState.selectedDelivery = deliveryId;
    checkoutState.totals.shippingFee = fee;
    
    document.querySelectorAll('.delivery-option').forEach(el => el.classList.remove('selected'));
    document.querySelector(`#delivery-${deliveryId}`).closest('.delivery-option').classList.add('selected');
    document.querySelector(`#delivery-${deliveryId}`).checked = true;
    
    const option = checkoutState.deliveryOptions.find(o => o.id === deliveryId);
    document.getElementById('delivery-label').textContent = `(${option.name})`;
    
    updateOrderTotals();
}

function renderPaymentMethods() {
    const container = document.getElementById('payment-methods');
    container.innerHTML = '';

    const groupedMethods = {
        offline: [],
        online: [],
        bank: []
    };

    checkoutState.paymentMethods.forEach(method => {
        if (method.id === 'cod') {
            groupedMethods.offline.push(method);
        } else if (method.id === 'bank') {
            groupedMethods.bank.push(method);
        } else {
            groupedMethods.online.push(method);
        }
    });

    const groupLabels = {
        offline: 'Thanh toán khi nhận hàng',
        online: 'Thanh toán trực tuyến',
        bank: 'Chuyển khoản ngân hàng'
    };

    Object.entries(groupedMethods).forEach(([group, methods]) => {
        if (!methods.length) return;

        const groupWrapper = document.createElement('div');
        groupWrapper.className = 'payment-method-group';

        const groupTitle = document.createElement('div');
        groupTitle.className = 'payment-method-group-title';
        groupTitle.textContent = groupLabels[group];
        groupWrapper.appendChild(groupTitle);

        const groupList = document.createElement('div');
        groupList.className = 'payment-method-group-list';

        methods.forEach(method => {
            groupList.appendChild(renderPaymentMethodCard(method));
        });

        groupWrapper.appendChild(groupList);
        container.appendChild(groupWrapper);
    });
}

function renderPaymentMethodCard(method) {
    const isSelected = method.id === checkoutState.selectedPayment;
    const methodDiv = document.createElement('div');
    methodDiv.className = `payment-method-card ${isSelected ? 'selected' : ''}`;
    methodDiv.innerHTML = `
        <input type="radio" name="payment" value="${method.id}" 
               id="payment-${method.id}" ${isSelected ? 'checked' : ''}>
        ${['momo', 'vnpay', 'vietqr'].includes(method.id) 
            ? `<img src="/assets/images/shared/payment_${method.id === 'vietqr' ? 'VietQR' : method.id}.png" class="payment-icon" style="object-fit: contain; width: 32px; height: 32px; border-radius: 4px;">`
            : `<svg class="payment-icon" viewBox="0 0 24 24">${getPaymentIcon(method.icon)}</svg>`
        }
        <div class="payment-info">
            <h4>${method.name}</h4>
            <p>${method.description}</p>
        </div>
    `;

    methodDiv.addEventListener('click', () => {
        selectPaymentMethod(method.id);
    });

    return methodDiv;
}

function getPaymentIcon(iconType) {
    const icons = {
        cash: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>',
        wallet: '<path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
        'credit-card': '<path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>',
        bank: '<path d="M6.5 10h-2v7h2v-7zm6 0h-2v7h2v-7zm8.5 9H2v2h19v-2zm-2.5-9h-2v7h2v-7zm-7-6.74L16.71 6H6.29l5.21-2.74m0-2.26L2 6v2h19V6l-9.5-5z"/>'
    };
    return icons[iconType] || icons.cash;
}

function selectPaymentMethod(methodId) {
    checkoutState.selectedPayment = methodId;
    
    // Update UI
    document.querySelectorAll('.payment-method-card').forEach(el => el.classList.remove('selected'));
    document.querySelector(`#payment-${methodId}`).closest('.payment-method-card').classList.add('selected');
    document.querySelector(`#payment-${methodId}`).checked = true;
    
    // Update button text
    const btnCheckout = document.getElementById('btn-checkout');
    if (methodId === 'cod') {
        btnCheckout.textContent = 'Xác nhận đặt hàng (COD)';
    } else {
        btnCheckout.textContent = 'Tiến hành thanh toán online';
    }
}

// ============================================================================
// PawPoints
// ============================================================================
function initializePawPoints() {
    const section = document.getElementById('pawpoints-section');
    section.classList.remove('d-none');
    
    const userPoints = checkoutState.user.points || checkoutState.user.pawPoints || 0;
    const orderTotal = calculateSubtotal();
    
    const maxPoints = Math.min(userPoints, Math.floor(orderTotal / 150));
    
    document.getElementById('user-points').textContent = userPoints;
    document.getElementById('points-value-equivalent').textContent = formatCurrency(userPoints * 150);
    document.getElementById('points-max-label').textContent = formatCurrency(maxPoints * 150);
    
    const slider = document.getElementById('points-slider');
    slider.max = maxPoints;
    slider.min = 0; // Fix step/min issues
    
    let initialPoints = Math.min(Number(localStorage.getItem(PENDING_POINTS_KEY) || 0), maxPoints);
    slider.value = initialPoints;
    
    // Call updatePointsDisplay to fix "0 points remaining" bug initially
    updatePointsDisplay(initialPoints);
    
    const checkbox = document.getElementById('use-points-checkbox');
    checkbox.checked = initialPoints > 0;
    slider.disabled = !checkbox.checked;

    checkbox.addEventListener('change', (e) => {
        slider.disabled = !e.target.checked;
        if (!e.target.checked) {
            slider.value = 0;
            updatePointsDisplay(0);
            checkoutState.pointsUsed = 0;
            checkoutState.totals.pointsDiscount = 0;
            localStorage.removeItem(PENDING_POINTS_KEY);
            updateOrderTotals();
        } else {
            // Automatically use max points when checked if not already set
            const pointsToUse = maxPoints; 
            slider.value = pointsToUse;
            checkoutState.pointsUsed = pointsToUse;
            checkoutState.totals.pointsDiscount = pointsToUse * 150;
            localStorage.setItem(PENDING_POINTS_KEY, String(pointsToUse));
            updatePointsDisplay(pointsToUse);
            updateOrderTotals();
        }
    });
    
    slider.addEventListener('input', (e) => {
        const points = parseInt(e.target.value) || 0;
        updatePointsDisplay(points);
        
        if (checkbox.checked) {
            checkoutState.pointsUsed = points;
            checkoutState.totals.pointsDiscount = points * 150;
            localStorage.setItem(PENDING_POINTS_KEY, String(points));
            updateOrderTotals();
        }
    });
}

function updatePointsDisplay(points) {
    const discount = points * 150;
    const remaining = (checkoutState.user.points || checkoutState.user.pawPoints || 0) - points;
    
    document.getElementById('points-to-use').textContent = points;
    document.getElementById('points-discount-display').textContent = formatCurrency(discount);
    document.getElementById('remaining-points').textContent = remaining;
}

function loadPersistedPoints() {
    const savedPoints = Number(localStorage.getItem(PENDING_POINTS_KEY) || 0);
    if (!savedPoints) return;

    const checkbox = document.getElementById('use-points-checkbox');
    const slider = document.getElementById('points-slider');
    if (!checkbox || !slider) return;

    checkbox.checked = true;
    slider.disabled = false;
    slider.value = savedPoints;
    checkoutState.pointsUsed = savedPoints;
    checkoutState.totals.pointsDiscount = savedPoints * 150;
    updatePointsDisplay(savedPoints);
}

// ============================================================================
// Order Summary
// ============================================================================
function renderOrderSummary() {
    const container = document.getElementById('order-items');
    container.innerHTML = '';
    const isBuyNow = sessionStorage.getItem('pawpal_is_buynow') === 'true';
    
    checkoutState.cart.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'order-item';
        itemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="order-item-img">
            <div class="order-item-info">
                <h4>${item.name}</h4>
                ${item.selectedVariant ? `<div class="order-item-variant" style="font-size: 0.8rem; color: #4F7A65; margin: 2px 0 4px 0;">Phân loại: <strong style="color: #236B48;">${item.selectedVariant}</strong></div>` : ''}
                ${isBuyNow ? `
                    <div class="buy-now-qty-control" data-index="${index}">
                        <button type="button" class="buy-now-qty-btn" data-action="decrease" aria-label="Giảm số lượng">-</button>
                        <span class="buy-now-qty-value">${item.quantity}</span>
                        <button type="button" class="buy-now-qty-btn" data-action="increase" aria-label="Tăng số lượng">+</button>
                    </div>
                ` : `<p class="order-item-qty">x${item.quantity}</p>`}
            </div>
            <span class="order-item-price">${formatCurrency(item.price * item.quantity)}</span>
        `;
        container.appendChild(itemDiv);
    });

    if (isBuyNow) {
        bindBuyNowQuantityControls();
    }
    
    updateOrderTotals();
}

function bindBuyNowQuantityControls() {
    document.querySelectorAll('.buy-now-qty-control').forEach((control) => {
        control.querySelectorAll('.buy-now-qty-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const itemIndex = Number(control.dataset.index);
                const action = button.dataset.action;
                updateBuyNowQuantity(itemIndex, action);
            });
        });
    });
}

function updateBuyNowQuantity(itemIndex, action) {
    const item = checkoutState.cart[itemIndex];
    if (!item) return;

    const currentQuantity = Number(item.quantity) || 1;
    const maxQuantity = Number(item.stock) || 99;
    let nextQuantity = currentQuantity;

    if (action === 'decrease') {
        nextQuantity = Math.max(1, currentQuantity - 1);
    } else if (action === 'increase') {
        nextQuantity = Math.min(maxQuantity, currentQuantity + 1);
    }

    if (nextQuantity === currentQuantity) return;

    item.quantity = nextQuantity;
    sessionStorage.setItem('pawpal_buynow_cart', JSON.stringify(checkoutState.cart));
    renderOrderSummary();
}

function calculateSubtotal() {
    return checkoutState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateOrderTotals() {
    const subtotal = calculateSubtotal();
    checkoutState.totals.subtotal = subtotal;
    checkoutState.totals.voucherDiscount = calculateVoucherDiscount();
    
    const grandTotal = subtotal 
        + checkoutState.totals.shippingFee 
        - checkoutState.totals.pointsDiscount 
        - checkoutState.totals.voucherDiscount;
    
    checkoutState.totals.grandTotal = Math.max(0, grandTotal);
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('shipping-fee').textContent = 
        checkoutState.totals.shippingFee === 0 ? 'Miễn phí' : formatCurrency(checkoutState.totals.shippingFee);
    
    if (checkoutState.totals.pointsDiscount > 0) {
        document.getElementById('points-row').classList.remove('d-none');
        document.getElementById('points-discount').textContent = `-${formatCurrency(checkoutState.totals.pointsDiscount)}`;
    } else {
        document.getElementById('points-row').classList.add('d-none');
    }
    
    if (checkoutState.totals.voucherDiscount > 0) {
        document.getElementById('voucher-row').classList.remove('d-none');
        document.getElementById('voucher-discount').textContent = `-${formatCurrency(checkoutState.totals.voucherDiscount)}`;
        document.getElementById('voucher-code-summary').textContent = `(${checkoutState.appliedVoucher.code})`;
    } else {
        document.getElementById('voucher-row').classList.add('d-none');
    }
    
    document.getElementById('grand-total').textContent = formatCurrency(checkoutState.totals.grandTotal);
}

// ============================================================================
// Voucher
// ============================================================================
async function applyVoucher() {
    const input = document.getElementById('voucher-input');
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
        showToast('Vui lòng nhập mã giảm giá', 'error');
        return;
    }
    
    const result = validateVoucher(code);
    
    if (result.valid) {
        checkoutState.appliedVoucher = result.voucher;
        checkoutState.totals.voucherDiscount = result.discount;
        localStorage.setItem('pawpal_applied_voucher_code', code);
        
        renderAppliedVoucherUI();
        
        input.value = '';
        
        updateOrderTotals();
        
        showToast(`Áp dụng mã ${code} thành công! Tiết kiệm ${formatCurrency(result.discount)}.`, 'success');
    } else {
        showToast(result.message, 'error');
    }
}

function removeVoucher() {
    checkoutState.appliedVoucher = null;
    checkoutState.totals.voucherDiscount = 0;
    localStorage.removeItem('pawpal_applied_voucher_code');
    
    document.getElementById('applied-voucher').classList.add('d-none');
    updateOrderTotals();
    
    showToast('Đã xóa mã giảm giá', 'info');
}

// ============================================================================
// Form Validation
// ============================================================================
function validateCheckoutForm() {
    // Trường hợp 1: Đang chọn địa chỉ có sẵn từ Sổ địa chỉ (Card hiển thị)
    if (checkoutState.selectedAddress) {
        const addr = checkoutState.selectedAddress;
        const name = (addr.name || checkoutState.user?.name || '').trim();
        const phone = (addr.phone || checkoutState.user?.phone || '').trim();
        const street = (addr.street || addr.address || '').trim();

        if (!name || !phone || !street) {
            showToast('Thông tin địa chỉ giao hàng chưa đầy đủ. Vui lòng bấm Sửa để bổ sung.', 'error');
            return false;
        }

        const phoneRegex = /^0[0-9]{9}$/;
        if (!phoneRegex.test(phone)) {
            showToast('Số điện thoại không hợp lệ (cần đúng 10 chữ số bắt đầu bằng số 0). Vui lòng bấm Sửa để cập nhật.', 'error');
            return false;
        }

        // Đảm bảo form ẩn luôn được điền để đồng bộ
        fillAddressForm(addr);

        const invoiceChecked = document.getElementById('invoice-checkbox')?.checked;
        if (invoiceChecked) {
            const companyName = document.getElementById('companyName')?.value.trim();
            const taxCode = document.getElementById('taxCode')?.value.trim();
            if (!companyName || !taxCode) {
                showToast('Vui lòng điền đầy đủ thông tin hóa đơn', 'error');
                return false;
            }
        }
        return true;
    }

    // Trường hợp 2: Khách vãng lai hoặc nhập form thủ công
    const form = document.getElementById('shipping-form');
    if (form && !form.checkValidity()) {
        form.classList.add('was-validated');
        showToast('Vui lòng điền đầy đủ thông tin giao hàng', 'error');
        return false;
    }
    
    const invoiceChecked = document.getElementById('invoice-checkbox')?.checked;
    if (invoiceChecked) {
        const companyName = document.getElementById('companyName')?.value.trim();
        const taxCode = document.getElementById('taxCode')?.value.trim();
        if (!companyName || !taxCode) {
            showToast('Vui lòng điền đầy đủ thông tin hóa đơn', 'error');
            return false;
        }
    }
    
    return true;
}

// ============================================================================
// Checkout
// ============================================================================
async function handleCheckout() {
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        if (btnCheckout.disabled) return;      
        btnCheckout.disabled = true;
        btnCheckout.dataset.originalText = btnCheckout.textContent;
        btnCheckout.textContent = 'Đang xử lý...';
    }

    const restoreBtn = () => {
        if (btnCheckout) {
            btnCheckout.disabled = false;
            btnCheckout.textContent = btnCheckout.dataset.originalText || 'Xác nhận đặt hàng';
        }
    };

    // Kiểm tra điều kiện tiên quyết: Giỏ hàng và Kho hàng
    const cartValidation = validateCheckoutCart();
    if (!cartValidation.valid) {
        showToast(cartValidation.message, 'error');
        restoreBtn();
        return;
    }

    // Kiểm tra điều kiện tiên quyết: Thông tin giao hàng
    if (!validateCheckoutForm()) {
        restoreBtn();
        return;
    }
    
    const isOnlinePayment = ['momo', 'vnpay', 'zalopay', 'vietqr'].includes(checkoutState.selectedPayment);
    const selectedAddr = checkoutState.selectedAddress;

    const shippingInfo = selectedAddr ? {
        name: selectedAddr.name || checkoutState.user?.name || document.getElementById('fullName')?.value || '',
        phone: selectedAddr.phone || checkoutState.user?.phone || document.getElementById('phone')?.value || '',
        address: selectedAddr.street || selectedAddr.address || document.getElementById('address')?.value || '',
        district: selectedAddr.district || document.getElementById('district')?.value || '',
        city: selectedAddr.city || document.getElementById('city')?.value || 'TP. Hồ Chí Minh',
        note: selectedAddr.note || document.getElementById('note')?.value || '',
        deliveryMethod: checkoutState.selectedDelivery,
        deliveryFee: checkoutState.totals.shippingFee
    } : {
        name: document.getElementById('fullName')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        address: document.getElementById('address')?.value || '',
        district: document.getElementById('district')?.value || '',
        city: document.getElementById('city')?.value || 'TP. Hồ Chí Minh',
        note: document.getElementById('note')?.value || '',
        deliveryMethod: checkoutState.selectedDelivery,
        deliveryFee: checkoutState.totals.shippingFee
    };

    const orderData = {
        orderId: generateOrderId(),
        userId: checkoutState.user?.id || null,
        userPhone: shippingInfo.phone || checkoutState.user?.phone || null,
        status: isOnlinePayment ? 'pending_payment' : 'pending',
        paymentExpiry: isOnlinePayment ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
        
        shipping: shippingInfo,
        
        items: checkoutState.cart,
        products: checkoutState.cart.map(item => ({ ...item, total: (Number(item.price) || 0) * (Number(item.quantity) || 1) })),
        
        pricing: checkoutState.totals,
        
        payment: {
            method: checkoutState.selectedPayment,
            status: isOnlinePayment ? 'pending_payment' : 'pending'
        }
    };

    if (checkoutState.user && document.getElementById('saveAddress')?.checked) {
        const savedAddresses = getCheckoutUserAddresses(checkoutState.user);
        const newAddress = {
            id: `addr-${Date.now()}`,
            label: savedAddresses.length === 0 ? 'Dia chi mac dinh' : `Dia chi ${savedAddresses.length + 1}`,
            name: orderData.shipping.name,
            phone: orderData.shipping.phone,
            street: orderData.shipping.address,
            district: orderData.shipping.district,
            city: orderData.shipping.city,
            note: orderData.shipping.note || '',
            isDefault: savedAddresses.length === 0
        };

        const updatedUser = {
            ...checkoutState.user,
            address: buildStructuredAddressLabel(newAddress),
            addresses: [...savedAddresses, newAddress]
        };

        checkoutState.user = updatedUser;
        localStorage.setItem('pawpal_current_user', JSON.stringify(updatedUser));

        const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
        const userIndex = users.findIndex((user) => String(user.id) === String(updatedUser.id));
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updatedUser };
            localStorage.setItem('pawpal_users', JSON.stringify(users));
        }
    }
    
    const invoiceChecked = document.getElementById('invoice-checkbox').checked;
    if (invoiceChecked) {
        orderData.invoice = {
            required: true,
            companyName: document.getElementById('companyName').value,
            taxCode: document.getElementById('taxCode').value,
            companyAddress: document.getElementById('companyAddress').value,
            email: document.getElementById('invoiceEmail').value
        };
    }
    
    updateOrderTotals();
    const validation = validateCheckoutCart();
    if (!validation.valid) {
        showToast(validation.message, 'error');
        document.getElementById('shipping-form').scrollIntoView({ behavior: 'smooth' });
        restoreBtn();
        return;
    }

    if (window.API && window.API.submitOrder) {
        const response = await window.API.submitOrder(orderData);
        if (response && !response.success) {
            showToast('Lỗi kết nối khi tạo đơn hàng trên hệ thống. Vui lòng thử lại!', 'error');
            restoreBtn();
            return;
        }
        if (response && response.success && response.orderId) {
            orderData.orderId = response.orderId;
        }
    }

    localStorage.setItem('pawpal_current_order', JSON.stringify(orderData));

    saveOrderToUserHistory(orderData);

    if (!checkoutState.user) {
        createGuestTempUserForOrder(orderData);
    }
    
    if (checkoutState.selectedPayment === 'cod') {
        localStorage.removeItem('pawpal_cart_unselected_backup');
        localStorage.removeItem('pawpal_applied_voucher_code');
        localStorage.removeItem(PENDING_POINTS_KEY);
        const isBuyNow = sessionStorage.getItem('pawpal_is_buynow') === 'true';
        if (isBuyNow) {
            sessionStorage.removeItem('pawpal_buynow_cart');
            sessionStorage.removeItem('pawpal_is_buynow');
        } else {
            if (window.API && typeof window.API.saveUserCart === 'function') {
                await window.API.saveUserCart(checkoutState.user?.id || checkoutState.user?.phone || null, []);
            }
        }
        window.location.href = `/payment-success?orderId=${orderData.orderId}`;
    } else if (checkoutState.selectedPayment === 'vnpay') {
        localStorage.removeItem('pawpal_cart_unselected_backup');
        localStorage.removeItem('pawpal_applied_voucher_code');
        localStorage.removeItem(PENDING_POINTS_KEY);
        const isBuyNow = sessionStorage.getItem('pawpal_is_buynow') === 'true';
        if (isBuyNow) {
            sessionStorage.removeItem('pawpal_buynow_cart');
            sessionStorage.removeItem('pawpal_is_buynow');
        } else {
            if (window.API && typeof window.API.saveUserCart === 'function') {
                await window.API.saveUserCart(checkoutState.user?.id || checkoutState.user?.phone || null, []);
            }
        }

        // Ưu tiên gọi Backend để lấy URL Cổng VNPAY Sandbox thật
        try {
            const vnpRes = await fetch('/api/vnpay/create-payment-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderData.orderId,
                    amount: orderData.pricing.grandTotal,
                    orderInfo: `Thanh toan don hang ${orderData.orderId} tai PawPal`
                })
            });
            const vnpData = await vnpRes.json();
            if (vnpData.success && vnpData.paymentUrl && !vnpData.paymentUrl.includes('DEMO_TMN')) {
                window.location.href = vnpData.paymentUrl;
                return;
            }
        } catch (err) {
            console.warn('[Checkout] Không thể kết nối API VNPAY thật, chuyển sang giao diện giả lập:', err);
        }

        window.location.href = `/vnpay-sandbox?orderId=${orderData.orderId}&amount=${orderData.pricing.grandTotal}`;
    } else if (['momo', 'zalopay', 'vietqr'].includes(checkoutState.selectedPayment)) {
        showQRPaymentModal(orderData);
    } else {
        localStorage.removeItem('pawpal_cart_unselected_backup');
        localStorage.removeItem('pawpal_applied_voucher_code');
        localStorage.removeItem(PENDING_POINTS_KEY);
        const isBuyNow = sessionStorage.getItem('pawpal_is_buynow') === 'true';
        if (isBuyNow) {
            sessionStorage.removeItem('pawpal_buynow_cart');
            sessionStorage.removeItem('pawpal_is_buynow');
        } else {
            if (window.API && typeof window.API.saveUserCart === 'function') {
                await window.API.saveUserCart(checkoutState.user?.id || checkoutState.user?.phone || null, []);
            }
        }
        window.location.href = `/payment-success?orderId=${orderData.orderId}`;
    }
}

// ============================================================================
// QR Payment Modal
// ============================================================================
let qrPaymentState = {
    orderData: null,
    timerInterval: null,
    timeRemaining: 900, 
    paymentVerified: false
};

const paymentMethodConfig = {
    momo: {
        name: 'Ví điện tử MoMo',
        color: '#A72930',
        instruction: 'Quét mã QR bằng ứng dụng MoMo',
        timeout: 900 
    },
    vnpay: {
        name: 'Cổng thanh toán VNPay',
        color: '#0066CC',
        instruction: 'Quét mã QR qua ứng dụng Ngân hàng của bạn',
        timeout: 900
    },
    zalopay: {
        name: 'Thanh toán qua ZaloPay',
        color: '#0084FF',
        instruction: 'Quét mã QR bằng ứng dụng Zalo hoặc ZaloPay',
        timeout: 600
    },
    vietqr: {
        name: 'Quét mã VietQR',
        color: '#2A5944',
        instruction: 'Quét mã QR qua ứng dụng Mobile Banking của ngân hàng',
        timeout: 1200 
    }
};

function generateMockQRCode(orderId, amount) {
    const size = 220;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    const modulesCount = 25;
    const margin = 10;
    const moduleSize = (size - margin * 2) / modulesCount;

    const grid = Array.from({ length: modulesCount }, () => Array(modulesCount).fill(null));

    function addFinder(startR, startC) {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const gr = startR + r;
                const gc = startC + c;
                if (gr >= 0 && gr < modulesCount && gc >= 0 && gc < modulesCount) grid[gr][gc] = 0;
            }
        }
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                    grid[startR + r][startC + c] = 1;
                } else {
                    grid[startR + r][startC + c] = 0;
                }
            }
        }
    }

    addFinder(0, 0);
    addFinder(0, modulesCount - 7);
    addFinder(modulesCount - 7, 0);

    for (let i = 8; i < modulesCount - 8; i++) {
        if (grid[6][i] === null) grid[6][i] = (i % 2 === 0) ? 1 : 0;
        if (grid[i][6] === null) grid[i][6] = (i % 2 === 0) ? 1 : 0;
    }

    let seed = 0;
    const seedStr = String(orderId || 'QR') + String(amount || '100000');
    for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
    }
    function pseudo() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    for (let r = 0; r < modulesCount; r++) {
        for (let c = 0; c < modulesCount; c++) {
            if (grid[r][c] === null) {
                const mask = (r + c) % 2 === 0;
                grid[r][c] = (mask ^ (pseudo() > 0.48)) ? 1 : 0;
            }
        }
    }

    ctx.fillStyle = '#1E293B';
    for (let r = 0; r < modulesCount; r++) {
        for (let c = 0; c < modulesCount; c++) {
            if (grid[r][c] === 1) {
                ctx.fillRect(
                    Math.round(margin + c * moduleSize),
                    Math.round(margin + r * moduleSize),
                    Math.ceil(moduleSize),
                    Math.ceil(moduleSize)
                );
            }
        }
    }
    
    return canvas.toDataURL('image/png');
}

function showQRPaymentModal(orderData) {
    qrPaymentState.orderData = orderData;
    qrPaymentState.timeRemaining = paymentMethodConfig[orderData.payment.method].timeout;
    qrPaymentState.paymentVerified = false;
    
    const methodId = orderData.payment.method;
    const config = paymentMethodConfig[methodId];
    
    document.getElementById('qr-method-name').textContent = config.name;
    document.getElementById('qr-method-desc').textContent = `Đơn hàng #${orderData.orderId}`;
    document.getElementById('qr-instruction').textContent = config.instruction;
    
    const qrLogo = document.getElementById('qr-logo');
    qrLogo.className = `qr-logo ${methodId}`;
    qrLogo.src = `/assets/images/shared/payment_${methodId === 'vietqr' ? 'VietQR' : methodId}.png`;
    qrLogo.onerror = () => {
        qrLogo.classList.add('d-none');
    };
    
    const qrCode = generateMockQRCode(orderData.orderId, orderData.pricing.grandTotal);
    document.getElementById('qr-code-image').src = qrCode;
    
    document.getElementById('btn-confirm-payment').disabled = false;
    
    const statusMsg = document.getElementById('payment-status-message');
    statusMsg.className = 'payment-status-message';
    statusMsg.textContent = '';
    
    document.getElementById('qr-backdrop').classList.add('show');
    document.getElementById('payment-qr-modal').classList.add('show');
    
    startQRTimer();
}

function startQRTimer() {
    if (qrPaymentState.timerInterval) {
        clearInterval(qrPaymentState.timerInterval);
    }
    
    const timerElement = document.getElementById('qr-timer');
    
    qrPaymentState.timerInterval = setInterval(() => {
        qrPaymentState.timeRemaining--;
        
        const minutes = Math.floor(qrPaymentState.timeRemaining / 60);
        const seconds = qrPaymentState.timeRemaining % 60;
        const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        timerElement.textContent = timeStr;
        
        if (qrPaymentState.timeRemaining <= 60) {
            timerElement.style.color = 'var(--color-danger)';
        }
        
        if (qrPaymentState.timeRemaining <= 0) {
            clearInterval(qrPaymentState.timerInterval);
            timerElement.textContent = '00:00';
            handleQRExpired();
        }
    }, 1000);
}

function hideQRPaymentModal() {
    document.getElementById('qr-backdrop').classList.remove('show');
    document.getElementById('payment-qr-modal').classList.remove('show');
    
    if (qrPaymentState.timerInterval) {
        clearInterval(qrPaymentState.timerInterval);
        qrPaymentState.timerInterval = null;
    }

    // Nếu người dùng đóng modal khi chưa hoàn tất thanh toán
    if (!qrPaymentState.paymentVerified && qrPaymentState.orderData) {
        localStorage.removeItem('pawpal_cart_unselected_backup');
        localStorage.removeItem('pawpal_applied_voucher_code');
        localStorage.removeItem(PENDING_POINTS_KEY);
        const isBuyNow = sessionStorage.getItem('pawpal_is_buynow') === 'true';
        if (isBuyNow) {
            sessionStorage.removeItem('pawpal_buynow_cart');
            sessionStorage.removeItem('pawpal_is_buynow');
        } else {
            if (window.API && typeof window.API.saveUserCart === 'function') {
                window.API.saveUserCart(checkoutState.user?.id || checkoutState.user?.phone || null, []);
            }
        }

        showToast(`Đơn hàng #${qrPaymentState.orderData.orderId} đang ở trạng thái "Chờ thanh toán" (thời hạn 15 phút). Bạn có thể tiếp tục thanh toán trong mục Đơn hàng của tôi.`, 'info');
        setTimeout(() => {
            window.location.href = `/pages/user/#orders?status=pending_payment`;
        }, 1500);
    }
}

function handleQRExpired() {
    const statusMsg = document.getElementById('payment-status-message');
    statusMsg.className = 'payment-status-message show error';
    statusMsg.textContent = 'Đã hết thời hạn thanh toán (15 phút). Đơn hàng đã tự động hủy.';
    
    document.getElementById('btn-confirm-payment').disabled = true;

    if (qrPaymentState.orderData) {
        updatePersistedOrderPaymentStatus(
            qrPaymentState.orderData.orderId,
            'expired',
            'cancelled',
            {
                status: 'cancelled',
                title: 'Tự động hủy đơn hàng',
                description: 'Đơn hàng tự động hủy do quá thời hạn thanh toán trực tuyến 15 phút',
                timestamp: new Date().toISOString()
            }
        );
    }
    
    setTimeout(() => {
        document.getElementById('qr-backdrop').classList.remove('show');
        document.getElementById('payment-qr-modal').classList.remove('show');
        window.location.href = `/pages/user/#orders?status=cancelled`;
    }, 2500);
}

function verifyPaymentSimulation() {
    const willSucceed = true;
    const delay = 1800;
    
    const statusMsg = document.getElementById('payment-status-message');
    statusMsg.className = 'payment-status-message show loading';
    statusMsg.innerHTML = '<div class="payment-verification-spinner"></div> Đang xác nhận thanh toán...';
    
    return new Promise(resolve => {
        setTimeout(async () => {
            if (willSucceed) {
                qrPaymentState.paymentVerified = true;
                qrPaymentState.orderData.payment.status = 'paid';
                qrPaymentState.orderData.status = 'preparing';
                finalizePendingPointsUsage();
                localStorage.setItem('pawpal_current_order', JSON.stringify(qrPaymentState.orderData));

                const timelineSuccess = {
                    status: 'paid',
                    title: 'Thanh toán thành công',
                    description: `Khách hàng đã thanh toán thành công qua ${paymentMethodConfig[qrPaymentState.orderData.payment.method]?.name || 'cổng điện tử'}`,
                    timestamp: new Date().toISOString()
                };
                updatePersistedOrderPaymentStatus(qrPaymentState.orderData.orderId, 'paid', 'preparing', timelineSuccess);
                
                if (window.API && window.API.updateOrderPaymentStatus) {
                    window.API.updateOrderPaymentStatus(qrPaymentState.orderData.orderId, 'PAID').catch(err => console.error('Failed to update DB payment status', err));
                }
                
                statusMsg.className = 'payment-status-message show success';
                statusMsg.innerHTML = 'Thanh toán thành công!';
                
                localStorage.removeItem('pawpal_cart_unselected_backup');
                const isBuyNow = sessionStorage.getItem('pawpal_is_buynow') === 'true';
                if (isBuyNow) {
                    sessionStorage.removeItem('pawpal_buynow_cart');
                    sessionStorage.removeItem('pawpal_is_buynow');
                } else {
                    if (window.API && typeof window.API.saveUserCart === 'function') {
                        await window.API.saveUserCart(checkoutState.user?.id || checkoutState.user?.phone || null, []);
                    }
                }
                
                setTimeout(() => {
                    window.location.href = `/payment-success?orderId=${qrPaymentState.orderData.orderId}`;
                }, 1500);
            } else {
                statusMsg.className = 'payment-status-message show error';
                statusMsg.textContent = 'Xác nhận thanh toán thất bại. Vui lòng thử lại.';
                document.getElementById('btn-confirm-payment').disabled = false;
                
                setTimeout(() => {
                    hideQRPaymentModal();
                }, 2000);
            }
            resolve();
        }, delay);
    });
}

function finalizePendingPointsUsage() {
    if (!checkoutState.user || !checkoutState.pointsUsed) return;

    try {
        const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
        const ui = users.findIndex(u => String(u.phone) === String(checkoutState.user.phone));
        if (ui !== -1) {
            users[ui].points = Math.max(0, (users[ui].points || 0) - checkoutState.pointsUsed);
            localStorage.setItem('pawpal_users', JSON.stringify(users));
        }
        const sessionUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (sessionUser) {
            sessionUser.points = Math.max(0, (sessionUser.points || 0) - checkoutState.pointsUsed);
            localStorage.setItem('pawpal_current_user', JSON.stringify(sessionUser));
        }
    } catch (e) {
        console.warn('[Checkout] Lỗi trừ điểm sau thanh toán:', e);
    } finally {
        localStorage.removeItem(PENDING_POINTS_KEY);
    }
}
function setupEventListeners() {
    // Address Book & Edit Modal triggers
    const btnOpenAddressBook = document.getElementById('btn-open-address-book');
    if (btnOpenAddressBook) btnOpenAddressBook.addEventListener('click', openAddressBookModal);

    const btnEditSelectedAddress = document.getElementById('btn-edit-selected-address');
    if (btnEditSelectedAddress) {
        btnEditSelectedAddress.addEventListener('click', () => {
            openAddressEditModal(checkoutState.selectedAddress?.id || null);
        });
    }

    const btnCloseAddressBookX = document.getElementById('btn-close-address-book-x');
    if (btnCloseAddressBookX) btnCloseAddressBookX.addEventListener('click', closeAddressBookModal);

    const btnCloseAddressBook = document.getElementById('btn-close-address-book');
    if (btnCloseAddressBook) btnCloseAddressBook.addEventListener('click', closeAddressBookModal);

    const btnConfirmAddressChoice = document.getElementById('btn-confirm-address-choice');
    if (btnConfirmAddressChoice) btnConfirmAddressChoice.addEventListener('click', confirmAddressChoice);

    const btnModalAddAddress = document.getElementById('btn-modal-add-address');
    if (btnModalAddAddress) btnModalAddAddress.addEventListener('click', () => openAddressEditModal(null));

    const btnCloseAddressEditX = document.getElementById('btn-close-address-edit-x');
    if (btnCloseAddressEditX) btnCloseAddressEditX.addEventListener('click', closeAddressEditModal);

    const btnCancelModalAddress = document.getElementById('btn-cancel-modal-address');
    if (btnCancelModalAddress) btnCancelModalAddress.addEventListener('click', closeAddressEditModal);

    const btnSaveModalAddress = document.getElementById('btn-save-modal-address');
    if (btnSaveModalAddress) btnSaveModalAddress.addEventListener('click', saveAddressFromModal);

    // Click backdrop overlay to close modals
    const addressBookModalOverlay = document.getElementById('addressBookModalOverlay');
    if (addressBookModalOverlay) {
        addressBookModalOverlay.addEventListener('click', (e) => {
            if (e.target === addressBookModalOverlay) closeAddressBookModal();
        });
    }

    const addressEditModalOverlay = document.getElementById('addressEditModalOverlay');
    if (addressEditModalOverlay) {
        addressEditModalOverlay.addEventListener('click', (e) => {
            if (e.target === addressEditModalOverlay) closeAddressEditModal();
        });
    }

    const voucherInput = document.getElementById('voucher-input');
    const voucherDropdown = document.getElementById('checkoutVoucherDropdown');

    document.getElementById('apply-voucher-btn').addEventListener('click', applyVoucher);
    document.getElementById('remove-voucher-btn').addEventListener('click', removeVoucher);
    
    if (voucherInput) {
        voucherInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyVoucher();
            }
        });

        voucherInput.addEventListener('focus', () => {
            renderVoucherHints();
            if (voucherDropdown) voucherDropdown.style.display = 'block';
        });

        document.addEventListener('click', (e) => {
            if (voucherInput && voucherDropdown) {
                if (!voucherInput.contains(e.target) && !voucherDropdown.contains(e.target)) {
                    voucherDropdown.style.display = 'none';
                }
            }
        });
    }
    
    const invoiceCheckbox = document.getElementById('invoice-checkbox');
    if (invoiceCheckbox) {
        invoiceCheckbox.addEventListener('change', (e) => {
            const form = document.getElementById('invoice-form');
            if (form) {
                if (e.target.checked) {
                    form.classList.remove('d-none');
                    form.querySelectorAll('input').forEach(input => {
                        input.setAttribute('required', 'required');
                    });
                } else {
                    form.classList.add('d-none');
                    form.querySelectorAll('input').forEach(input => {
                        input.removeAttribute('required');
                    });
                }
            }
        });
    }
    
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) btnCheckout.addEventListener('click', handleCheckout);
    
    const btnCloseQr = document.getElementById('btn-close-qr');
    if (btnCloseQr) btnCloseQr.addEventListener('click', hideQRPaymentModal);

    const btnCancelQr = document.getElementById('btn-cancel-qr');
    if (btnCancelQr) btnCancelQr.addEventListener('click', hideQRPaymentModal);

    const qrBackdrop = document.getElementById('qr-backdrop');
    if (qrBackdrop) qrBackdrop.addEventListener('click', hideQRPaymentModal);
    
    const btnConfirmPayment = document.getElementById('btn-confirm-payment');
    if (btnConfirmPayment) {
        btnConfirmPayment.addEventListener('click', async () => {
            btnConfirmPayment.disabled = true;
            await verifyPaymentSimulation();
        });
    }
}

// ============================================================================
// Utilities
// ============================================================================
function saveOrderToUserHistory(orderData) {
    let orders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');

    const toNumber = (value, fallback = 0) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    };
    
    const subtotal    = toNumber(orderData.pricing?.subtotal, 0);
    const shippingFee = toNumber(orderData.pricing?.shippingFee, 0);
    const discount = toNumber(
        orderData.pricing?.discount
        ?? (toNumber(orderData.pricing?.voucherDiscount) + toNumber(orderData.pricing?.pointsDiscount)),
        0
    );
    const grandTotal = toNumber(
        orderData.pricing?.grandTotal ?? orderData.pricing?.total,
        Math.max(0, subtotal + shippingFee - discount)
    );

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const resolvedUserId = orderData.userId || currentUser?.id || null;
    const resolvedUserPhone = orderData.userPhone || orderData.shipping?.phone || currentUser?.phone || null;

    const normalized = {
        id: orderData.orderId || orderData.id || generateOrderId(),
        userId: resolvedUserId,
        userPhone: resolvedUserPhone,
        delivery: orderData.shipping || {},
        products: (orderData.items || []).map(item => {
            const qty = toNumber(item.quantity ?? item.qty, 1);
            const unitPrice = toNumber(item.price ?? item.unitPrice ?? item.salePrice, 0);
            const totalVal = toNumber(item.total, unitPrice * qty);
            return {
                id: item.id || item.productId || null,
                name: item.name || item.title || 'Sản phẩm',
                image: item.image || item.img || '',
                quantity: qty,
                total: totalVal
            };
        }),
        pricing: {
            subtotal,
            shippingFee,
            discount,
            total: grandTotal
        },
        paymentMethod: orderData.payment?.method || null,
        paymentStatus: (() => {
            const method = orderData.payment?.method;
            if (method === 'cod') return 'pending_payment';
            if (orderData.payment?.status === 'paid') return 'paid';
            return orderData.payment?.status || 'pending';
        })(),
        paymentExpiry: orderData.paymentExpiry || null,
        timeline: (orderData.timeline && orderData.timeline.length > 0) ? orderData.timeline : [
            {
                status: orderData.status || 'pending',
                title: orderData.status === 'pending_payment' ? 'Chờ thanh toán trực tuyến' : 'Đặt hàng thành công',
                description: orderData.status === 'pending_payment' ? 'Đang chờ khách hàng hoàn tất thanh toán trực tuyến (thời hạn 15 phút)' : 'Đơn hàng đã được tạo thành công trên hệ thống',
                timestamp: new Date().toISOString()
            }
        ],
        createdAt: new Date().toISOString(),
        status: orderData.status || 'pending'
    };
    orders.unshift(normalized);
    
    localStorage.setItem('pawpal_orders', JSON.stringify(orders));
    
    console.log('Order saved to history:', orderData.orderId);
}

function createGuestTempUserForOrder(orderData) {
    const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
    let tempUser = users.find(u => u.phone === orderData.shipping.phone && u.is_temporary);

    if (!tempUser) {
        tempUser = {
            id: `GUEST-${Date.now()}`,
            name: orderData.shipping.name,
            phone: orderData.shipping.phone,
            role: 'customer',
            is_temporary: true,
            points: 0
        };
        users.push(tempUser);
        localStorage.setItem('pawpal_users', JSON.stringify(users));
    }

    const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
    const hasToken = tokens.some(t => t.phone === orderData.shipping.phone);
    if (!hasToken) {
        const token = `token-temp-${Math.floor(100000 + Math.random() * 900000)}`;
        tokens.push({
            token,
            phone: orderData.shipping.phone,
            createdAt: Date.now()
        });
        localStorage.setItem('pawpal_temp_tokens', JSON.stringify(tokens));
    }
}

function updatePersistedOrderPaymentStatus(orderId, paymentStatus, newOrderStatus = null, timelineItem = null) {
    const orders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const index = orders.findIndex(order => String(order.id) === String(orderId));

    if (index === -1) {
        return;
    }

    orders[index] = {
        ...orders[index],
        paymentStatus,
        payment: {
            ...(orders[index].payment || {}),
            status: paymentStatus
        },
        updatedAt: new Date().toISOString()
    };

    if (newOrderStatus) {
        orders[index].status = newOrderStatus;
    }

    if (timelineItem) {
        if (!Array.isArray(orders[index].timeline)) orders[index].timeline = [];
        orders[index].timeline.push(timelineItem);
    }

    localStorage.setItem('pawpal_orders', JSON.stringify(orders));
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function generateOrderId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `ORD-${dateStr}-${random}`;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
