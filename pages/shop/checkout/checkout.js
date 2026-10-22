
import { voucherBelongsToUser } from '/scripts/shared/cart-state.mjs';

const checkoutState = {
    cart: [],
    products: [],
    user: null,
    selectedAddress: null,
    editingAddressId: null,
    addressRevision: null,
    savingAddress: false,
    deliveryOptions: [],
    paymentMethods: [],
    selectedDelivery: 'standard',
    selectedPayment: 'cod',
    vouchers: [],
    myVouchers: [],
    appliedVoucher: null,
    pointsUsed: 0,
    pointValue: 0,
    requestId: crypto.randomUUID(),
    totals: {
        subtotal: 0,
        shippingFee: 0,
        pointsDiscount: 0,
        voucherDiscount: 0,
        grandTotal: 0
    }
};

let PENDING_POINTS_KEY = 'pawpal_checkout_points_used';

function adoptCheckoutProfile(profile){
    checkoutState.addressRevision=profile.revision;
    checkoutState.user={...checkoutState.user,name:profile.name,email:profile.email,phone:profile.phone,address:'',
        addresses:(profile.addresses||[]).map(a=>({id:a.id,name:a.receiver_name||profile.name,phone:a.receiver_phone||profile.phone,
            street:a.street_address,district:a.district||'',city:a.province||'',isDefault:a.is_default,label:'Địa chỉ nhận hàng'}))};
}
async function persistCheckoutAddress(id,action,values={}){
    const db=window.getSupabaseClient?.()||window.SupabaseClient;
    const result=await db.rpc('save_own_checkout_address',{p_id:id,p_revision:checkoutState.addressRevision,p_action:action,p_values:values});
    if(result.error)throw result.error;
    adoptCheckoutProfile(result.data);return result.data;
}

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
            city = '';
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

    return normalized;
}




function finishCheckoutLoading() {
    const page = document.querySelector('.checkout-page');
    if (!page) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
        page.classList.remove('checkout-loading');
        page.setAttribute('aria-busy', 'false');
        setTimeout(() => page.querySelector('.checkout-skeleton')?.remove(), 260);
    }));
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        checkoutState.user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (!checkoutState.user?.id || checkoutState.user.is_temporary) { window.location.href='/login'; return; }
        PENDING_POINTS_KEY='pawpal_checkout_points_used:'+checkoutState.user.id;
        
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
                const selection = JSON.parse(sessionStorage.getItem('pawpal_checkout_selection') || 'null');
                if (selection && selection.customerId === checkoutState.user?.id && Array.isArray(selection.productIds)) {
                    checkoutState.cart = checkoutState.cart.filter(item => selection.productIds.includes(String(item.id)));
                }
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
        const profileResponse=await (window.getSupabaseClient?.()||window.SupabaseClient).rpc('customer_profile_snapshot');
        if(profileResponse.error)throw profileResponse.error;
        adoptCheckoutProfile(profileResponse.data);
        checkoutState.myVouchers = await window.API.getUserVouchers(checkoutState.user.id);
        
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
        finishCheckoutLoading();
    } catch (error) {
        console.error('Error initializing checkout:', error);
        const content = document.querySelector('.checkout-main-container');
        if (content) content.innerHTML = '<div class="py-5 text-center" role="status"><p>Không thể tải thông tin thanh toán. Vui lòng tải lại trang.</p><a href="/cart">Quay lại giỏ hàng</a></div>';
        finishCheckoutLoading();
    }
});


async function loadData() {
    const db=window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if(!db)throw new Error('Chưa kết nối cấu hình đặt hàng.');
    const {data,error}=await db.rpc('customer_shop_options');if(error)throw error;
    checkoutState.deliveryOptions=(data.delivery_options||[]).map(d=>({...d,fee:Number(d.fee),estimatedDays:d.estimated_days}));
    checkoutState.paymentMethods=(data.payment_methods||[]).map(m=>({...m,configId:m.id,id:({'cod':'cod','cash':'cash','bank transfer':'bank','vietqr':'vietqr'})[m.short_name.toLowerCase()],shortName:m.short_name,bankInfo:m.bank_info}));
    checkoutState.pointValue=Number(data.point_value)||0;
    checkoutState.selectedPayment=checkoutState.paymentMethods.find(m=>m.id==='cod')?.id||checkoutState.paymentMethods[0]?.id||null;
    const quoted=await db.rpc('quote_own_sales_order',{p_details:{delivery:false,discount_mode:'none'},p_lines:checkoutState.cart.map(item=>({variant_id:item.variantId||item.product_variant_id||item.id,quantity:Number(item.quantity)}))});
    if(quoted.error)throw quoted.error;
    checkoutState.user.points=Number(quoted.data.points_balance)||0;
    checkoutState.user.pawPoints=checkoutState.user.points;
    await loadVouchers();
}
async function loadVouchers() {
    if(!window.API?.getVouchers)throw new Error('Chưa tải dịch vụ mã ưu đãi.');
    checkoutState.vouchers=await window.API.getVouchers();
}

async function loadProducts() {
    try {
        if (window.DataLoader && typeof window.DataLoader.loadProducts === 'function') {
            checkoutState.products = await window.DataLoader.loadProducts();
            
            // Merge product details into cart items
            checkoutState.cart = checkoutState.cart.map(item => {
                const product = checkoutState.products.find(p => String(p.id) === String(item.product_id || item.id));
                if (product) {
                    const variant=product.variants?.find(v=>String(v.id)===String(item.variantId || item.product_variant_id || item.id));
                    return { 
                        ...product, 
                        ...item, 
                        price: Number(variant?.price ?? item.price ?? product.price ?? 0),
                        quantity: Number(item.quantity ?? item.qty ?? 1),
                        qty: Number(item.quantity ?? item.qty ?? 1)
                    };
                }
                return { ...item, quantity: Number(item.quantity ?? item.qty ?? 1), qty: Number(item.quantity ?? item.qty ?? 1) };
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
        const product = checkoutState.products.find(p => String(p.id) === String(item.product_id || item.id));
        if (!product) {
            continue;
        }

        const variant=product.variants?.find(v=>String(v.id)===String(item.variantId || item.product_variant_id || item.id));
        if (!variant || Number(item.quantity) > Number(variant.stock)) {
            const remaining = variant?.stock || 0;
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
    if (checkoutState.totals.grandTotal < 0) {
        return { valid: false, message: 'Tổng thanh toán không hợp lệ. Vui lòng kiểm tra lại đơn hàng.' };
    }

    return { valid: true };
}

function validateVoucher(code) {
    const voucher=[...checkoutState.vouchers,...checkoutState.myVouchers].find(v=>v.code===code&&v.active);
    if(!voucher)return {valid:false,message:'Mã ưu đãi không có sẵn. Vui lòng kiểm tra lại.'};
    const subtotal=calculateSubtotal();
    if(subtotal<Number(voucher.minOrderValue||0))return {valid:false,message:'Giá trị đơn chưa đạt mức tối thiểu của mã ưu đãi.'};
    const discount=voucher.type==='fixed'?Math.min(subtotal,Number(voucher.value)):
        voucher.type==='percentage'?Math.min(subtotal,Math.floor(subtotal*Number(voucher.value)/100)):
        voucher.type==='shipping'?Math.min(Number(voucher.value),checkoutState.totals.shippingFee):0;
    return {valid:true,voucher,discount};
}

function calculateVoucherDiscount() {
    if (!checkoutState.appliedVoucher) {
        return 0;
    }
    if(checkoutState.appliedVoucher.verifiedSignature===voucherSignature())return checkoutState.appliedVoucher.verifiedDiscount;

    const validation = validateVoucher(checkoutState.appliedVoucher.code, false);
    if (!validation.valid) {
        return 0;
    }

    checkoutState.appliedVoucher = validation.voucher;
    return validation.discount || 0;
}
function voucherSignature(){return JSON.stringify([checkoutState.selectedDelivery,checkoutState.totals.shippingFee,checkoutState.cart.map(i=>[i.variantId||i.product_variant_id||i.id,i.quantity,i.price])]);}

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
            
        if ((voucher.type === 'percentage' || voucher.type === 'percent') && voucher.maxDiscount) {
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
    const input=document.getElementById('voucher-input');
    if(input)input.value=localStorage.getItem('pawpal_applied_voucher_code')||'';
}

// ============================================================================
// Shipping Form & Address Management
// ============================================================================
function initializeShippingForm() {
    if (checkoutState.user) {
        checkoutState.user.addresses = getCheckoutUserAddresses(checkoutState.user);

        const saveSection = document.getElementById('save-address-section');
        if (saveSection) saveSection.classList.add('d-none');

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

async function setDefaultAddressDirectly(addrId) {
    if(checkoutState.savingAddress)return;
    checkoutState.savingAddress=true;
    try{
        await persistCheckoutAddress(addrId,'default');
        const current=checkoutState.user.addresses.find(a=>a.id===checkoutState.selectedAddress?.id)||checkoutState.user.addresses.find(a=>a.isDefault);
        if(current)selectCheckoutAddress(current);
        openAddressBookModal();
    }catch(error){showToast(error.code==='PT409'?'Sổ địa chỉ đã thay đổi. Vui lòng tải lại trang.':error.message,'error');}
    finally{checkoutState.savingAddress=false;}
}
async function deleteAddressDirectly(addrId) {
    if(checkoutState.savingAddress)return;
    checkoutState.savingAddress=true;
    try{
        await persistCheckoutAddress(addrId,'delete');
        const current=checkoutState.user.addresses.find(a=>a.id===checkoutState.selectedAddress?.id)||checkoutState.user.addresses.find(a=>a.isDefault);
        checkoutState.selectedAddress=null;
        if(current)selectCheckoutAddress(current);else initializeShippingForm();
        openAddressBookModal();
    }catch(error){showToast(error.code==='PT409'?'Sổ địa chỉ đã thay đổi. Vui lòng tải lại trang.':error.message,'error');}
    finally{checkoutState.savingAddress=false;}
}

function openAddressEditModal(addrId = null) {
    checkoutState.editingAddressId = addrId;
    checkoutState.addressDraftId=addrId||crypto.randomUUID();

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
    if(checkoutState.savingAddress)return;
    const overlay = document.getElementById('addressEditModalOverlay');
    if (overlay) overlay.classList.add('d-none');
}

async function saveAddressFromModal() {
    if(checkoutState.savingAddress)return;
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

    const button=document.getElementById('btn-save-modal-address');
    checkoutState.savingAddress=true;if(button)button.disabled=true;
    try {
        const snapshot=await persistCheckoutAddress(checkoutState.addressDraftId,'save',{name,phone,street,district,city,isDefault});
        const saved=snapshot.addresses.find(a=>a.id===checkoutState.addressDraftId);
        const selected=checkoutState.user.addresses.find(a=>a.id===saved?.id);
        if(selected)selectCheckoutAddress({...selected,note});
        checkoutState.savingAddress=false;
        closeAddressEditModal();closeAddressBookModal();
        showToast('Đã lưu địa chỉ lên tài khoản.','success');
    }catch(error){showToast(error.code==='PT409'?'Sổ địa chỉ đã thay đổi. Vui lòng tải lại trang trước khi lưu.':error.message||'Không thể lưu địa chỉ.','error');}
    finally{checkoutState.savingAddress=false;if(button)button.disabled=false;}
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
    
    if (checkoutState.deliveryOptions && checkoutState.deliveryOptions.length > 0) {
        const found = checkoutState.deliveryOptions.find(o => o.id === checkoutState.selectedDelivery);
        if (!found) {
            checkoutState.selectedDelivery = checkoutState.deliveryOptions[0].id;
            const initialFee = Number(checkoutState.deliveryOptions[0].fee ?? checkoutState.deliveryOptions[0].price ?? 0);
            checkoutState.totals.shippingFee = isNaN(initialFee) ? 0 : initialFee;
        } else {
            const initialFee = Number(found.fee ?? found.price ?? 0);
            checkoutState.totals.shippingFee = isNaN(initialFee) ? 0 : initialFee;
        }
    }
    
    checkoutState.deliveryOptions.forEach((option, index) => {
        const isSelected = option.id === checkoutState.selectedDelivery;
        const optFee = Number(option.fee ?? option.price ?? 0);
        const resolvedFee = isNaN(optFee) ? 0 : optFee;
        
        const optionDiv = document.createElement('div');
        optionDiv.className = `delivery-option ${isSelected ? 'selected' : ''}`;
        optionDiv.innerHTML = `
            <input type="radio" name="delivery" value="${option.id}" 
                   id="delivery-${option.id}" ${isSelected ? 'checked' : ''}
                   data-fee="${resolvedFee}">
            <svg class="delivery-icon" viewBox="0 0 24 24">
                ${option.id === 'standard' ? 
                    '<path d="M18 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3zM3 6v9h.76c.55-.61 1.35-1 2.24-1s1.69.39 2.24 1H15V6H3z"/>' :
                    '<path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z"/><path d="M10.09 13.75L7.77 11.42l-1.06 1.06 3.38 3.38 5.66-5.66-1.06-1.06z"/>'
                }
            </svg>
            <div class="delivery-info">
                <h4>${option.name}</h4>
                <p>${option.description || ''}</p>
            </div>
            <div class="delivery-fee ${resolvedFee === 0 ? 'free' : ''}">
                ${resolvedFee === 0 ? 'Miễn phí' : formatCurrency(resolvedFee)}
            </div>
        `;
        
        optionDiv.addEventListener('click', () => {
            selectDeliveryOption(option.id, resolvedFee);
        });
        
        container.appendChild(optionDiv);
    });
}

function selectDeliveryOption(deliveryId, fee) {
    checkoutState.selectedDelivery = deliveryId;
    const option = checkoutState.deliveryOptions.find(o => o.id === deliveryId);
    const optFee = Number(fee !== undefined && !isNaN(fee) ? fee : (option?.fee ?? option?.price ?? 0));
    checkoutState.totals.shippingFee = isNaN(optFee) ? 0 : optFee;
    
    document.querySelectorAll('.delivery-option').forEach(el => el.classList.remove('selected'));
    const targetRadio = document.querySelector(`#delivery-${deliveryId}`);
    if (targetRadio) {
        targetRadio.closest('.delivery-option')?.classList.add('selected');
        targetRadio.checked = true;
    }
    
    if (option) {
        const labelEl = document.getElementById('delivery-label');
        if (labelEl) labelEl.textContent = `(${option.name})`;
    }
    
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
        if (['cod','cash'].includes(method.id)) {
            groupedMethods.offline.push(method);
        } else if (['bank','vietqr'].includes(method.id)) {
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
    btnCheckout.textContent = 'Xác nhận đặt hàng';
}

// ============================================================================
// PawPoints
// ============================================================================
function initializePawPoints() {
    const section = document.getElementById('pawpoints-section');
    if (!(checkoutState.pointValue > 0)) { section.classList.add('d-none'); checkoutState.pointsUsed=0; return; }
    section.classList.remove('d-none');
    
    const userPoints = checkoutState.user.points || checkoutState.user.pawPoints || 0;
    const orderTotal = calculateSubtotal();
    
    const maxPoints = Math.min(userPoints, Math.floor(orderTotal / checkoutState.pointValue));
    
    document.getElementById('user-points').textContent = userPoints;
    document.getElementById('points-value-equivalent').textContent = formatCurrency(userPoints * checkoutState.pointValue);
    document.getElementById('points-max-label').textContent = formatCurrency(maxPoints * checkoutState.pointValue);
    
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
            if(checkoutState.appliedVoucher){checkoutState.appliedVoucher=null;checkoutState.totals.voucherDiscount=0;renderAppliedVoucherUI();localStorage.removeItem('pawpal_applied_voucher_code');}
            // Automatically use max points when checked if not already set
            const pointsToUse = maxPoints; 
            slider.value = pointsToUse;
            checkoutState.pointsUsed = pointsToUse;
            checkoutState.totals.pointsDiscount = pointsToUse * checkoutState.pointValue;
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
            checkoutState.totals.pointsDiscount = points * checkoutState.pointValue;
            localStorage.setItem(PENDING_POINTS_KEY, String(points));
            updateOrderTotals();
        }
    });
}

function updatePointsDisplay(points) {
    const discount = points * checkoutState.pointValue;
    const remaining = (checkoutState.user.points || checkoutState.user.pawPoints || 0) - points;
    
    document.getElementById('points-to-use').textContent = points;
    document.getElementById('points-discount-display').textContent = formatCurrency(discount);
    document.getElementById('remaining-points').textContent = remaining;
}

function loadPersistedPoints() {
    const savedPoints = checkoutState.pointValue>0?Math.max(0,Math.min(Math.floor(Number(localStorage.getItem(PENDING_POINTS_KEY))||0),
        Number(checkoutState.user.points)||0,Math.floor(calculateSubtotal()/checkoutState.pointValue))):0;
    if (!savedPoints) return;

    const checkbox = document.getElementById('use-points-checkbox');
    const slider = document.getElementById('points-slider');
    if (!checkbox || !slider) return;

    checkbox.checked = true;
    slider.disabled = false;
    slider.value = savedPoints;
    checkoutState.pointsUsed = savedPoints;
    checkoutState.totals.pointsDiscount = savedPoints * checkoutState.pointValue;
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
    const subtotal = Number(calculateSubtotal() || 0);
    checkoutState.totals.subtotal = isNaN(subtotal) ? 0 : subtotal;
    const vDiscount = Number(calculateVoucherDiscount() || 0);
    checkoutState.totals.voucherDiscount = isNaN(vDiscount) ? 0 : vDiscount;
    const sFee = Number(checkoutState.totals.shippingFee || 0);
    checkoutState.totals.shippingFee = isNaN(sFee) ? 0 : sFee;
    const pDiscount = Number(checkoutState.totals.pointsDiscount || 0);
    checkoutState.totals.pointsDiscount = isNaN(pDiscount) ? 0 : pDiscount;
    
    const grandTotal = subtotal 
        + checkoutState.totals.shippingFee 
        - checkoutState.totals.pointsDiscount 
        - checkoutState.totals.voucherDiscount;
    
    checkoutState.totals.grandTotal = Math.max(0, isNaN(grandTotal) ? 0 : grandTotal);
    
    document.getElementById('subtotal').textContent = formatCurrency(checkoutState.totals.subtotal);
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
        const db=window.getSupabaseClient?.()||window.SupabaseClient;
        const quoted=await db.rpc('quote_own_sales_order',{p_details:{delivery:true,delivery_option_id:checkoutState.selectedDelivery,discount_mode:'voucher',voucher_code:code},
            p_lines:checkoutState.cart.map(item=>({variant_id:item.variantId||item.product_variant_id||item.id,quantity:Number(item.quantity)}))});
        if(quoted.error){showToast('Mã ưu đãi không áp dụng được cho đơn này hoặc đã hết lượt sử dụng.','error');return;}
        checkoutState.pointsUsed=0;checkoutState.totals.pointsDiscount=0;localStorage.removeItem(PENDING_POINTS_KEY);
        const pointsCheckbox=document.getElementById('use-points-checkbox');if(pointsCheckbox)pointsCheckbox.checked=false;
        checkoutState.appliedVoucher = result.voucher;
        checkoutState.appliedVoucher.verifiedSignature=voucherSignature();
        checkoutState.appliedVoucher.verifiedDiscount=Number(quoted.data.voucher_discount)||0;
        checkoutState.totals.voucherDiscount = Number(quoted.data.voucher_discount)||0;
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
    if(document.getElementById('invoice-checkbox')?.checked){
        for(const id of ['companyName','taxCode','companyAddress','invoiceEmail']){
            const input=document.getElementById(id);
            if(!input?.value.trim()||!input.checkValidity()){showToast('Vui lòng kiểm tra đầy đủ thông tin yêu cầu hóa đơn.','error');input?.focus();return false;}
        }
    }
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
async function finalizeCheckoutCart() {
    if (sessionStorage.getItem('pawpal_is_buynow') === 'true') {
        sessionStorage.removeItem('pawpal_buynow_cart');
        sessionStorage.removeItem('pawpal_is_buynow');
        return;
    }
    const customerId = checkoutState.user?.id;
    const backupJson = localStorage.getItem('pawpal_cart_unselected_backup');
    const context = JSON.parse(localStorage.getItem('pawpal_cart_backup_context') || 'null');
    const ownBackup = !context || context.ownerId === customerId;
    if (backupJson && ownBackup) await window.API.restoreCartBackup(customerId, JSON.parse(backupJson), context?.raw === backupJson ? context : {});
    await window.API.removePurchasedCartItems(customerId, checkoutState.cart);
    if (ownBackup && localStorage.getItem('pawpal_cart_unselected_backup') === backupJson) {
        localStorage.removeItem('pawpal_cart_unselected_backup');
        localStorage.removeItem('pawpal_cart_backup_context');
    }
    sessionStorage.removeItem('pawpal_checkout_selection');
}

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
        city: selectedAddr.city || document.getElementById('city')?.value || '',
        note: selectedAddr.note || document.getElementById('note')?.value || '',
        deliveryMethod: checkoutState.selectedDelivery,
        deliveryFee: checkoutState.totals.shippingFee
    } : {
        name: document.getElementById('fullName')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        address: document.getElementById('address')?.value || '',
        district: document.getElementById('district')?.value || '',
        city: document.getElementById('city')?.value || '',
        note: document.getElementById('note')?.value || '',
        deliveryMethod: checkoutState.selectedDelivery,
        deliveryFee: checkoutState.totals.shippingFee
    };

    if(document.getElementById('invoice-checkbox')?.checked){
        const company=document.getElementById('companyName')?.value.trim()||'';
        const tax=document.getElementById('taxCode')?.value.trim()||'';
        const companyAddress=document.getElementById('companyAddress')?.value.trim()||'';
        const invoiceEmail=document.getElementById('invoiceEmail')?.value.trim()||'';
        shippingInfo.note=[shippingInfo.note,`Yêu cầu hóa đơn — Công ty: ${company}; Mã số thuế: ${tax}; Địa chỉ: ${companyAddress}; Email nhận: ${invoiceEmail}. Nhân viên xác nhận riêng.`].filter(Boolean).join('\n');
    }
    const orderData = {
        orderId: checkoutState.requestId,
        requestId: checkoutState.requestId,
        pointsUsed: checkoutState.pointsUsed,
        userId: checkoutState.user?.id || null,
        userPhone: shippingInfo.phone || checkoutState.user?.phone || null,
        status: isOnlinePayment ? 'pending_payment' : 'pending',
        paymentExpiry: isOnlinePayment ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
        
        shipping: shippingInfo,
        
        items: checkoutState.cart,
        products: checkoutState.cart.map(item => ({ ...item, total: (Number(item.price) || 0) * (Number(item.quantity) || 1) })),
        
        pricing: checkoutState.totals,
        appliedVoucher: checkoutState.appliedVoucher,
        voucherCode: checkoutState.appliedVoucher ? checkoutState.appliedVoucher.code : null,
        
        payment: {
            method: checkoutState.selectedPayment,
            configId: checkoutState.paymentMethods.find(m=>m.id===checkoutState.selectedPayment)?.configId,
            status: isOnlinePayment ? 'pending_payment' : 'pending'
        }
    };

    try {
        if(!orderData.payment.configId)throw new Error('Vui lòng chọn phương thức thanh toán.');
        const prepared=await window.API.prepareOwnOrder(orderData);
        const quote=prepared.quote;
        if(Number(checkoutState.totals.grandTotal)!==Number(quote.total)) {
            const prices=new Map((quote.lines||[]).map(line=>[line.variant_id,Number(line.unit_price)]));
            checkoutState.cart=checkoutState.cart.map(item=>({...item,price:prices.get(item.variantId||item.product_variant_id||item.id)??item.price}));
            checkoutState.pointValue=Number(quote.point_value)||0;
            checkoutState.totals={...checkoutState.totals,subtotal:Number(quote.subtotal),shippingFee:Number(quote.shipping_fee),
                voucherDiscount:Number(quote.voucher_discount)||0,pointsDiscount:Number(quote.line_discount)||0,grandTotal:Number(quote.total)};
            if(checkoutState.appliedVoucher){checkoutState.appliedVoucher.verifiedSignature=voucherSignature();checkoutState.appliedVoucher.verifiedDiscount=Number(quote.voucher_discount)||0;}
            const total=document.getElementById('grand-total');if(total)total.textContent=formatCurrency(Number(quote.total));
            renderOrderSummary();
            showToast('Giá và ưu đãi đã cập nhật từ CSDL. Vui lòng kiểm tra và xác nhận lại.','info');
            restoreBtn();return;
        }
        orderData._prepared=prepared;
        const response=await window.API.submitOrder(orderData);
        if(!response.success)throw response.error||new Error('Không thể tạo đơn hàng.');
        await finalizeCheckoutCart();
        localStorage.removeItem('pawpal_applied_voucher_code');localStorage.removeItem(PENDING_POINTS_KEY);
        window.location.href='/user#orders';
    } catch(error) {
        showToast(error.message||'Không thể đặt hàng. Vui lòng thử lại.','error');restoreBtn();
    }
}

// ============================================================================
// QR Payment Modal
// ============================================================================
function hideQRPaymentModal() {
    document.getElementById('qr-backdrop')?.classList.remove('show');
    document.getElementById('payment-qr-modal')?.classList.remove('show');
}
function verifyPaymentSimulation() { return false; }

function setupEventListeners() {
    document.getElementById('modal-address-form')?.addEventListener('submit',event=>event.preventDefault());
    document.addEventListener('keydown',event=>{
        if(event.key!=='Escape')return;
        const edit=document.getElementById('addressEditModalOverlay');
        if(edit&&!edit.classList.contains('d-none'))closeAddressEditModal();
        else closeAddressBookModal();
    });
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
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
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
