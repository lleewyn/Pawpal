# Wireframe: Checkout + Payment Pages (Section 3.1.9 - Thanh toán)

> **Tài liệu thiết kế wireframe cho quy trình thanh toán đơn hàng**
> 
> **Phiên bản:** 1.0  
> **Ngày tạo:** 13/06/2026  
> **Tuân thủ:** design.md - No subtitles, No 50/50 layout, No emoji icons, No "&"

---

## 📌 Tổng quan

Section 3.1.9 bao gồm **3 trang chính**:

1. **Checkout Page** (US 9-1) - Trang thanh toán với form giao hàng + chọn phương thức
2. **Payment Success Page** (US 9-2) - Kết quả giao dịch thành công
3. **Payment Failed Page** (US 9-2) - Kết quả giao dịch thất bại

---

## 🎨 Design Principles

### Màu sắc và Typography
- Background: `--color-bg-white` (trắng) - trang thanh toán cần sáng, tập trung
- Heading: Lora (serif)
- Body/UI: DM Sans (sans-serif)
- Success color: `--color-success` (green)
- Error color: `--color-danger` (red)

### Layout Rules
- ❌ NO 50/50 layouts → Dùng **1.5fr 1fr** (60/40 split)
- ❌ NO subtitles
- ❌ NO emoji icons
- ❌ NO "&" character
- ✅ Asymmetric grid layout (checkout)
- ✅ Single-column for result pages
- ✅ Design token compliant

### Icons Strategy
**Source:** Flaticon (https://www.flaticon.com)
- **Style:** Regular hoặc Thin (line icons)
- **Format:** SVG monochrome
- **Color:** Sử dụng CSS fill với design tokens
- **Size:** 24x24px (UI), 48x48px (large icons)

**Icon mapping cho checkout:**
```
COD            → cash / money icon
MoMo           → wallet / e-wallet icon
VNPay          → credit-card / payment icon
Bank Transfer  → bank / building icon
Success        → check-circle / checkmark icon
Failed         → x-circle / close icon
Copy           → copy / clipboard icon
Order tracking → package / box icon
Shopping       → shopping-bag / cart icon
```

---

## 📄 Page 1: Checkout Page (US 9-1)

### File Structure
```
pages/shop/checkout.html
assets/css/shop/checkout.css
assets/js/shop/checkout.js
data/payment-methods.json
```

### Layout Structure (Asymmetric: 1.5fr 1fr)

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│  CHECKOUT STEPS INDICATOR                               │
│  ● Giỏ hàng  →  ● Thanh toán  →  ○ Hoàn tất           │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│  LEFT SECTION (60%)      │  RIGHT SECTION (40%)         │
│  Form thanh toán         │  Order Summary (Sticky)      │
│                          │                              │
│  ┌────────────────────┐  │  ┌────────────────────────┐  │
│  │ ĐỊA CHỈ GIAO HÀNG  │  │  │ TÓM TẮT ĐƠN HÀNG       │  │
│  ├────────────────────┤  │  ├────────────────────────┤  │
│  │ [📍 Địa chỉ đã lưu]│  │  │ [IMG] Royal Canin      │  │
│  │ [+ Thêm địa chỉ]  │  │  │ x1        250.000đ     │  │
│  │                    │  │  ├────────────────────────┤  │
│  │ Họ tên *           │  │  │ [IMG] Pedigree         │  │
│  │ [_______________]  │  │  │ x2        360.000đ     │  │
│  │ Số điện thoại *    │  │  ├────────────────────────┤  │
│  │ [_______________]  │  │  │ Tổng tiền hàng:        │  │
│  │ Địa chỉ nhận *     │  │  │           610.000đ     │  │
│  │ [_______________]  │  │  │ Phí vận chuyển:        │  │
│  │ Ghi chú            │  │  │           Miễn phí     │  │
│  │ [_______________]  │  │  │ Dùng PawPoints:        │  │
│  └────────────────────┘  │  │           -30.000đ     │  │
│                          │  │ Voucher:               │  │
│  ┌────────────────────┐  │  │           -50.000đ     │  │
│  │ PHƯƠNG THỨC        │  │  │ ──────────────────     │  │
│  │ VẬN CHUYỂN         │  │  │ TỔNG THANH TOÁN:       │  │
│  ├────────────────────┤  │  │ 530.000đ               │  │
│  │ ○ Giao tiêu chuẩn  │  │  └────────────────────────┘  │
│  │   3-5 ngày Miễn phí│  │                              │
│  │ ○ Giao nhanh       │  │  ┌────────────────────────┐  │
│  │   1-2 ngày 25.000đ │  │  │ MÃ GIẢM GIÁ           │  │
│  └────────────────────┘  │  ├────────────────────────┤  │
│                          │  │ [___] [ÁP DỤNG]       │  │
│  ┌────────────────────┐  │  │ [PAWFIRST10 -50k] [x] │  │
│  │ SỬ DỤNG PAWPOINTS  │  │  └────────────────────────┘  │
│  ├────────────────────┤  │                              │
│  │ Bạn có: 150 điểm   │  │  ┌────────────────────────┐  │
│  │ [─────●────] 100đ  │  │  │ XÁC NHẬN ĐẶT HÀNG      │  │
│  │ ☑ Dùng 30đ         │  │  │ (COD)                  │  │
│  └────────────────────┘  │  └────────────────────────┘  │
│                          │                              │
│  ┌────────────────────┐  │  ┌────────────────────────┐  │
│  │ PHƯƠNG THỨC        │  │  │ [🔒] Bảo mật thanh toán│  │
│  │ THANH TOÁN         │  │  │ [↻] Đổi trả 30 ngày   │  │
│  ├────────────────────┤  │  └────────────────────────┘  │
│  │ ● COD [icon]       │  │                              │
│  │ ○ MoMo [icon]      │  │                              │
│  │ ○ VNPay [icon]     │  │                              │
│  │ ○ Bank [icon]      │  │                              │
│  │                    │  │                              │
│  │ □ Lưu PT này       │  │                              │
│  └────────────────────┘  │                              │
└──────────────────────────┴──────────────────────────────┘

### Components Detail

#### 1. Địa chỉ giao hàng (Shipping Address)
```
┌──────────────────────────────────────────┐
│ ĐỊA CHỈ GIAO HÀNG                        │  ← H2
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ 📍 Chọn từ địa chỉ đã lưu           │ │  ← Dropdown
│ │ [▼]                                  │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Dropdown hiển thị:                       │
│ ┌──────────────────────────────────────┐ │
│ │ ● Nhà riêng (mặc định)              │ │  ← Selected
│ │   Nguyễn Văn A, 0901234567          │ │
│ │   123 Lê Lợi, Q.1, TP.HCM          │ │
│ ├──────────────────────────────────────┤ │
│ │ ○ Văn phòng                          │ │
│ │   Nguyễn Văn A, 0901234567          │ │
│ │   456 Nguyễn Huệ, Q.1, TP.HCM      │ │
│ ├──────────────────────────────────────┤ │
│ │ + Thêm địa chỉ mới                   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Hoặc nhập thủ công:                     │
│                                          │
│ Họ và tên *                              │
│ ┌──────────────────────────────────────┐ │
│ │ Nguyễn Văn A                         │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Số điện thoại *                          │
│ ┌──────────────────────────────────────┐ │
│ │ 0901234567                           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Địa chỉ chi tiết *                       │
│ ┌──────────────────────────────────────┐ │
│ │ 123 Lê Lợi, Phường Bến Thành        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Thành phố / Tỉnh *                      │
│ ┌──────────────────────────────────────┐ │
│ │ TP. Hồ Chí Minh [▼]                 │ │  ← Dropdown
│ └──────────────────────────────────────┘ │
│                                          │
│ Quận / Huyện *                          │
│ ┌──────────────────────────────────────┐ │
│ │ Quận 1 [▼]                           │ │  ← Dropdown
│ └──────────────────────────────────────┘ │
│                                          │
│ Ghi chú giao hàng (tùy chọn)           │
│ ┌──────────────────────────────────────┐ │
│ │ Giao vào buổi chiều...               │ │  ← Textarea
│ └──────────────────────────────────────┘ │
│                                          │
│ □ Lưu vào địa chỉ của tôi              │  ← Checkbox (logged in only)
│                                          │
└──────────────────────────────────────────┘
```

**Flaticon Icons:**
- Location: `location` / `map-pin` / `marker`
- Add: `plus` / `add` / `plus-circle`

**JS Logic:**
```javascript
// Load saved addresses for logged-in users
const user = JSON.parse(localStorage.getItem('pawpal_user'));
if (user && user.addresses) {
  populateAddressDropdown(user.addresses);
}

// Auto-fill form when select from dropdown
addressDropdown.addEventListener('change', (e) => {
  const selectedAddress = user.addresses.find(a => a.id === e.target.value);
  if (selectedAddress) {
    fillAddressForm(selectedAddress);
  }
});

// Show manual form if "Add new address" clicked
addNewAddressBtn.addEventListener('click', () => {
  clearAddressForm();
  showManualForm();
});
```

**Validation:**
- Họ tên: Required, min 3 chars
- SĐT: Required, regex `/^0[0-9]{9}$/` (10 digits starting with 0)
- Địa chỉ: Required, min 10 chars
- Thành phố/Quận: Required (dropdown)

#### 2. Phương thức vận chuyển (Delivery Options)
```
┌──────────────────────────────────────────┐
│ PHƯƠNG THỨC VẬN CHUYỂN                   │  ← H2
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ● [🚚] Giao tiêu chuẩn              │ │  ← Radio selected
│ │        3-5 ngày làm việc            │ │
│ │        Miễn phí                      │ │  ← Green text
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ○ [⚡] Giao nhanh                    │ │
│ │        1-2 ngày làm việc            │ │
│ │        25.000đ                       │ │
│ └──────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

**Flaticon Icons:**
- Standard: `truck` / `delivery-truck` / `shipping`
- Express: `fast-delivery` / `lightning-bolt` / `rocket`

**JS Logic:**
```javascript
// Update shipping fee when delivery method changes
deliveryOptions.forEach(option => {
  option.addEventListener('change', (e) => {
    const shippingFee = e.target.dataset.fee; // 0 or 25000
    updateOrderSummary({ shippingFee });
  });
});
```

**CSS:**
```css
.delivery-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border: 2px solid var(--color-border);
  border-radius: var(--card-border-radius);
  cursor: pointer;
  transition: all 0.3s ease;
}

.delivery-option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.delivery-icon {
  width: 32px;
  height: 32px;
  fill: var(--color-primary);
}

.shipping-free {
  color: var(--color-success);
  font-weight: 600;
}
```

#### 3. Sử dụng PawPoints (Loyalty Points Redemption)
```
┌──────────────────────────────────────────┐
│ SỬ DỤNG PAWPOINTS                        │  ← H2
├──────────────────────────────────────────┤
│                                          │
│ Bạn có: 150 điểm (≈ 150.000đ)          │  ← Current points balance
│                                          │
│ Dùng PawPoints để giảm giá:             │
│ ┌──────────────────────────────────────┐ │
│ │ ────────●─────────────── 30.000đ    │ │  ← Slider
│ │ 0                        150.000đ    │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ☑ Sử dụng 30 điểm (giảm 30.000đ)       │  ← Checkbox toggle
│                                          │
│ Điểm còn lại sau giao dịch: 120 điểm   │  ← Calculated remaining
│                                          │
│ ℹ️ 1 điểm = 1.000đ, tối thiểu 10 điểm  │  ← Info text
│                                          │
└──────────────────────────────────────────┘
```

**Flaticon Icons:**
- Points: `star` / `medal` / `reward`
- Info: `info-circle` / `information`

**JS Logic:**
```javascript
// Points slider interaction
const pointsSlider = document.getElementById('points-slider');
const pointsValue = document.getElementById('points-value');
const checkbox = document.getElementById('use-points');

pointsSlider.addEventListener('input', (e) => {
  const points = parseInt(e.target.value);
  const discount = points * 1000; // 1 point = 1000đ
  
  pointsValue.textContent = discount.toLocaleString('vi-VN');
  
  // Update order summary if checkbox is checked
  if (checkbox.checked) {
    updateOrderSummary({ pointsDiscount: discount });
  }
});

checkbox.addEventListener('change', (e) => {
  const discount = e.target.checked ? parseInt(pointsSlider.value) * 1000 : 0;
  updateOrderSummary({ pointsDiscount: discount });
});
```

**Rules:**
- Minimum: 10 points (10.000đ)
- Maximum: User's balance OR order total (whichever is lower)
- Conversion: 1 point = 1.000đ
- Only logged-in members can use points

#### 4. Mã giảm giá (Voucher Code)
```
┌──────────────────────────────────────────┐
│ MÃ GIẢM GIÁ                              │  ← H2
├──────────────────────────────────────────┤
│                                          │
│ ┌────────────────────────┬────────────┐ │
│ │ Nhập mã giảm giá...    │ ÁP DỤNG   │ │  ← Input + Button
│ └────────────────────────┴────────────┘ │
│                                          │
│ Voucher đã áp dụng:                     │
│ ┌──────────────────────────────────────┐ │
│ │ [🎫] PAWFIRST10                      │ │  ← Badge
│ │      Giảm 50.000đ          [×]      │ │  ← Remove button
│ └──────────────────────────────────────┘ │
│                                          │
│ Hoặc chọn voucher khả dụng:            │
│ ┌──────────────────────────────────────┐ │
│ │ FREESHIP - Miễn phí vận chuyển      │ │  ← Available voucher
│ │ Đơn từ 200k | HSD: 30/06/2026       │ │
│ │                        [ÁP DỤNG]    │ │
│ ├──────────────────────────────────────┤ │
│ │ SUMMER50 - Giảm 50.000đ             │ │
│ │ Đơn từ 500k | HSD: 15/07/2026       │ │
│ │                        [ÁP DỤNG]    │ │
│ └──────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

**Flaticon Icons:**
- Voucher: `ticket` / `coupon` / `discount-tag`
- Remove: `close` / `x-circle`

**JS Logic:**
```javascript
// Apply voucher code
applyVoucherBtn.addEventListener('click', async () => {
  const code = voucherInput.value.trim().toUpperCase();
  
  // Validate voucher (API call or local validation)
  const voucher = await validateVoucher(code, cartTotal);
  
  if (voucher.valid) {
    showVoucherSuccess(voucher);
    updateOrderSummary({ voucherDiscount: voucher.discount });
  } else {
    showVoucherError(voucher.message);
  }
});

// Remove voucher
removeVoucherBtn.addEventListener('click', () => {
  currentVoucher = null;
  updateOrderSummary({ voucherDiscount: 0 });
  hideAppliedVoucher();
});
```

**Validation Rules:**
```javascript
const voucherRules = {
  minOrderValue: 200000, // Minimum order for voucher
  maxDiscount: 100000,   // Max discount amount
  validUntil: '2026-06-30',
  applicableFor: ['all', 'food', 'toys'] // Category restrictions
};
```

#### 5. Xuất hóa đơn VAT (Invoice Option)
```
┌──────────────────────────────────────────┐
│ XUẤT HÓA ĐƠN VAT (TÙY CHỌN)             │  ← H2
├──────────────────────────────────────────┤
│                                          │
│ □ Tôi muốn xuất hóa đơn VAT             │  ← Checkbox
│                                          │
│ Khi checked, hiển thị form:             │
│                                          │
│ Tên công ty *                            │
│ ┌──────────────────────────────────────┐ │
│ │ Công ty TNHH ABC                     │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Mã số thuế *                            │
│ ┌──────────────────────────────────────┐ │
│ │ 0123456789                           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Địa chỉ công ty *                       │
│ ┌──────────────────────────────────────┐ │
│ │ 789 Nguyễn Trãi, Q.5, TP.HCM        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Email nhận hóa đơn *                    │
│ ┌──────────────────────────────────────┐ │
│ │ accounting@company.com               │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ℹ️ Hóa đơn VAT sẽ được gửi trong 3 ngày│  ← Info
│                                          │
└──────────────────────────────────────────┘
```

**JS Logic:**
```javascript
// Toggle invoice form visibility
invoiceCheckbox.addEventListener('change', (e) => {
  const invoiceForm = document.getElementById('invoice-form');
  
  if (e.target.checked) {
    invoiceForm.style.display = 'block';
    // Make invoice fields required
    invoiceForm.querySelectorAll('input').forEach(input => {
      input.setAttribute('required', 'required');
    });
  } else {
    invoiceForm.style.display = 'none';
    // Remove required attribute
    invoiceForm.querySelectorAll('input').forEach(input => {
      input.removeAttribute('required');
    });
  }
});
```

**Validation:**
- Tên công ty: Required if checked, min 3 chars
- Mã số thuế: Required if checked, regex `/^[0-9]{10}$/` or `/^[0-9]{10}-[0-9]{3}$/`
- Địa chỉ: Required if checked
- Email: Required if checked, valid email format

#### 6. Checkout Steps Indicator
```
┌─────────────────────────────────────────────────────────┐
│  TIẾN TRÌNH THANH TOÁN                                  │
│                                                         │
│  ● Giỏ hàng  →  ● Thanh toán  →  ○ Hoàn tất           │
│  Completed     Active            Pending                │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Filled circle `●` : `--color-primary` (completed/active)
- Empty circle `○` : `--color-neutral` (pending)
- Arrow `→` : Text character, not icon
- Current step: Bold text
- Progress bar beneath (optional)

**CSS:**
```css
.checkout-steps {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) 0;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-body);
  color: var(--color-text-light);
}

.step.completed,
.step.active {
  color: var(--color-primary);
  font-weight: 600;
}

.step-indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-neutral);
}

.step.completed .step-indicator,
.step.active .step-indicator {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}
```

#### 7. Thẻ tin cậy (Trust Badges)
```
┌──────────────────────────────────────────┐
│                                          │
│  ┌────────┬────────┬────────┬────────┐  │
│  │ [🔒]   │ [↻]    │ [✓]    │ [📞]   │  │  ← Icons SVG
│  │ Bảo mật│ Đổi trả│ Chính  │ Hỗ trợ │  │
│  │ SSL    │ 30 ngày│ hãng   │ 24/7   │  │
│  └────────┴────────┴────────┴────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**Flaticon Icons:**
- SSL/Security: `lock` / `shield` / `security`
- Return: `return` / `refresh` / `undo`
- Authentic: `check-badge` / `verified` / `certificate`
- Support: `headset` / `support` / `24-7`

**Placement:**
- Desktop: Bottom of checkout form (before payment methods)
- Mobile: Fixed bottom bar OR above checkout button

**CSS:**
```css
.trust-badges {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-bg-light);
  border-radius: var(--card-border-radius);
}

.trust-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.trust-badge-icon {
  width: 32px;
  height: 32px;
  fill: var(--color-success);
}

.trust-badge-text {
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--color-text-dark);
}

@media (max-width: 640px) {
  .trust-badges {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

#### 8. Form thông tin giao hàng (Legacy - Replaced by Component 1)
```
┌──────────────────────────────────────────┐
│ THÔNG TIN GIAO HÀNG                      │  ← H2
├──────────────────────────────────────────┤
│                                          │
│ Họ và tên *                              │  ← Label
│ ┌──────────────────────────────────────┐ │
│ │ Nguyễn Văn A                         │ │  ← Input (auto-filled if logged in)
│ └──────────────────────────────────────┘ │
│                                          │
│ Số điện thoại *                          │
│ ┌──────────────────────────────────────┐ │
│ │ 0901234567                           │ │
│ └──────────────────────────────────────┘ │
│ [!] Số điện thoại phải có 10 chữ số     │  ← Error message (hidden by default)
│                                          │
│ Địa chỉ nhận hàng *                      │
│ ┌──────────────────────────────────────┐ │
│ │ 123 Lê Lợi, Q.1, TP.HCM             │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Ghi chú đơn hàng (tuỳ chọn)            │
│ ┌──────────────────────────────────────┐ │
│ │ Giao vào buổi chiều                  │ │  ← Textarea
│ │                                      │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Auto-fill Logic (JS):**
```javascript
// Nếu user đã đăng nhập
const user = JSON.parse(localStorage.getItem('pawpal_user'));
if (user) {
  document.querySelector('[name="fullName"]').value = user.name || '';
  document.querySelector('[name="phone"]').value = user.phone || '';
  document.querySelector('[name="address"]').value = user.address || '';
}
```

**Validation:**
- Họ tên: Required, min 3 chars
- SĐT: Required, regex `/^[0-9]{10}$/`
- Địa chỉ: Required, min 10 chars
- Ghi chú: Optional, max 500 chars

**Error states:**
- Input border: `--color-danger`
- Error text: `--color-danger`, `--fs-small`
- Icon: SVG warning icon (not emoji)

#### 9. Phương thức thanh toán
```
┌──────────────────────────────────────────┐
│ PHƯƠNG THỨC THANH TOÁN                   │  ← H2
├──────────────────────────────────────────┤
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ● [💵] Thanh toán khi nhận hàng     │ │  ← Selected (radio button)
│ │        (COD)                         │ │
│ │        Thanh toán bằng tiền mặt     │ │  ← Description
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ○ [💳] Ví điện tử MoMo              │ │
│ │        Thanh toán qua ví MoMo       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ○ [💳] VNPay                        │ │
│ │        Thanh toán qua cổng VNPay    │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ ○ [🏦] Chuyển khoản ngân hàng       │ │
│ │        Chuyển khoản qua Internet    │ │
│ │        Banking                       │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Icon Implementation (Flaticon):**
```html
<!-- Payment method card -->
<div class="payment-method-card selected" data-method="cod">
  <input type="radio" name="payment" value="cod" checked>
  <svg class="payment-icon" width="32" height="32">
    <use href="/assets/icons/flaticon-payment.svg#cash"></use>
  </svg>
  <div class="payment-info">
    <h4>Thanh toán khi nhận hàng (COD)</h4>
    <p>Thanh toán bằng tiền mặt khi nhận hàng</p>
  </div>
</div>
```

**Flaticon icons:**
- COD: `cash` / `money` / `banknote`
- MoMo: `wallet` / `e-wallet` / `mobile-payment`
- VNPay: `credit-card` / `payment-method` / `atm-card`
- Bank: `bank` / `banking` / `building`

**Styling:**
```css
.payment-method-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border: 2px solid var(--color-border);
  border-radius: var(--card-border-radius);
  cursor: pointer;
  transition: all 0.3s ease;
}

.payment-method-card.selected {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.payment-icon {
  width: 32px;
  height: 32px;
  fill: var(--color-primary);
}

.payment-method-card.selected .payment-icon {
  fill: var(--color-accent);
}
```

#### 10. Order Summary (Sticky Right Sidebar)
```
┌────────────────────────────────────┐
│ TÓM TẮT ĐƠN HÀNG                   │  ← H2
├────────────────────────────────────┤
│                                    │
│ ┌────┬─────────────────┬─────────┐ │
│ │IMG │ Royal Canin     │250.000đ │ │  ← Product item
│ │80px│ Mini Adult      │    x1   │ │
│ └────┴─────────────────┴─────────┘ │
│                                    │
│ ┌────┬─────────────────┬─────────┐ │
│ │IMG │ Pedigree Adult  │180.000đ │ │
│ │80px│ Dry Food        │    x2   │ │
│ └────┴─────────────────┴─────────┘ │
│                                    │
│ ──────────────────────────────────  │
│                                    │
│ Tổng tiền hàng:        610.000đ   │
│ Phí vận chuyển (std):  Miễn phí   │  ← Dynamic: Standard/Express
│ Dùng PawPoints (30):   -30.000đ   │  ← Conditional: if used
│ Voucher (PAWFIRST10):  -50.000đ   │  ← Conditional: if applied
│ ──────────────────────────────────  │
│                                    │
│ TỔNG THANH TOÁN:       530.000đ   │  ← Large, bold, accent color
│                                    │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ XÁC NHẬN ĐẶT HÀNG (COD)       │ │  ← Primary CTA button
│ └────────────────────────────────┘ │
│                                    │
│ [🔒] Thanh toán an toàn, bảo mật  │  ← Security note
└────────────────────────────────────┘
```

**Dynamic calculation JS:**
```javascript
function updateOrderSummary(changes = {}) {
  const summary = {
    subtotal: 610000, // From cart
    shipping: changes.shippingFee ?? 0,
    pointsDiscount: changes.pointsDiscount ?? 0,
    voucherDiscount: changes.voucherDiscount ?? 0
  };
  
  // Calculate grand total
  const grandTotal = summary.subtotal 
    + summary.shipping 
    - summary.pointsDiscount 
    - summary.voucherDiscount;
  
  // Update UI
  document.getElementById('shipping-fee').textContent = 
    summary.shipping === 0 ? 'Miễn phí' : formatCurrency(summary.shipping);
  
  if (summary.pointsDiscount > 0) {
    document.getElementById('points-row').style.display = 'flex';
    document.getElementById('points-discount').textContent = 
      `-${formatCurrency(summary.pointsDiscount)}`;
  } else {
    document.getElementById('points-row').style.display = 'none';
  }
  
  if (summary.voucherDiscount > 0) {
    document.getElementById('voucher-row').style.display = 'flex';
    document.getElementById('voucher-discount').textContent = 
      `-${formatCurrency(summary.voucherDiscount)}`;
  } else {
    document.getElementById('voucher-row').style.display = 'none';
  }
  
  document.getElementById('grand-total').textContent = formatCurrency(grandTotal);
}
```

**Sticky behavior:**
```
┌────────────────────────────────────┐
│ TÓM TẮT ĐƠN HÀNG                   │  ← H2
├────────────────────────────────────┤
│                                    │
│ ┌────┬─────────────────┬─────────┐ │
│ │IMG │ Royal Canin     │250.000đ │ │  ← Product item
│ │80px│ Mini Adult      │    x1   │ │
│ └────┴─────────────────┴─────────┘ │
│                                    │
│ ┌────┬─────────────────┬─────────┐ │
│ │IMG │ Pedigree Adult  │180.000đ │ │
│ │80px│ Dry Food        │    x2   │ │
│ └────┴─────────────────┴─────────┘ │
│                                    │
│ ──────────────────────────────────  │
│                                    │
│ Tổng tiền hàng:        610.000đ   │
│ Phí vận chuyển:        Miễn phí   │  ← Green text
│ Giảm giá (PAWFIRST10): -50.000đ  │  ← Red text
│ ──────────────────────────────────  │
│                                    │
│ TỔNG THANH TOÁN:       560.000đ   │  ← Large, bold, accent color
│                                    │
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ XÁC NHẬN ĐẶT HÀNG (COD)       │ │  ← Primary CTA button
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Sticky behavior:**
```css
.order-summary-sticky {
  position: sticky;
  top: 100px; /* Below header */
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
```

**Button text change:**
```javascript
// Update button text based on payment method
document.querySelectorAll('.payment-method-card').forEach(card => {
  card.addEventListener('click', () => {
    const method = card.dataset.method;
    const btnText = method === 'cod' 
      ? 'XÁC NHẬN ĐẶT HÀNG (COD)'
      : 'TIẾN HÀNH THANH TOÁN ONLINE';
    document.getElementById('btn-checkout').textContent = btnText;
  });
});
```

**Product item structure:**
```html
<div class="order-item">
  <img src="..." alt="..." class="order-item-img">
  <div class="order-item-info">
    <h4>Royal Canin Mini Adult</h4>
    <p class="order-item-qty">x1</p>
  </div>
  <span class="order-item-price">250.000đ</span>
</div>
```

### Responsive Breakpoints (Checkout)

| Screen | Layout | Summary |
|--------|--------|---------|
| ≥1024px | 2 columns (1.5fr 1fr) | Sticky right |
| ≤1024px | 1 column | Summary first, then form |
| ≤640px | 1 column | Summary fixed bottom bar |

**Mobile layout:**
```
┌─────────────────────────┐
│ HEADER                  │
├─────────────────────────┤
│ Steps Indicator         │
├─────────────────────────┤
│ Order Summary (collapsed)│  ← Accordion, tap to expand
├─────────────────────────┤
│ Form thông tin giao hàng│
├─────────────────────────┤
│ Phương thức thanh toán  │
├─────────────────────────┤
│ [Sticky Bottom Bar]     │  ← Total + Checkout button
│ 560.000đ [XÁC NHẬN]    │
└─────────────────────────┘
```

---

## 📄 Page 2: Payment Success Page (US 9-2)

### File Structure
```
pages/shop/payment-success.html
assets/css/shop/payment-result.css
assets/js/shop/payment-success.js
```

### Layout Structure (Single Column - Centered)

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│               ┌───────────────────┐                     │
│               │                   │                     │
│               │   [✓ ICON]        │  ← Success checkmark (SVG)
│               │   Size: 80x80     │     Color: --color-success
│               │                   │                     │
│               └───────────────────┘                     │
│                                                         │
│            ĐẶT HÀNG THÀNH CÔNG!                        │  ← H1, color: success
│                                                         │
│     Cảm ơn bạn đã tin tưởng Pawpal.                   │  ← Body text
│     Đơn hàng của bạn đã được tiếp nhận.               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ THÔNG TIN ĐƠN HÀNG                                │ │  ← Card
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │ Mã đơn hàng:  #ORD-20260613-001234  [📋 Copy]   │ │
│  │                                                   │ │
│  │ Trạng thái thanh toán:  ĐÃ THANH TOÁN           │ │  ← Green badge
│  │                                                   │ │
│  │ Địa chỉ giao hàng:                               │ │
│  │ Nguyễn Văn A, 0901234567                        │ │
│  │ 123 Lê Lợi, Quận 1, TP.HCM                      │ │
│  │                                                   │ │
│  │ Thời gian đặt hàng:  13/06/2026 14:30           │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────┐ │
│  │ SẢN PHẨM ĐÃ ĐẶT                                  │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │ ┌────┬────────────────────────┬──────┬─────────┐ │ │
│  │ │IMG │ Royal Canin Mini Adult │  x1  │250.000đ │ │ │
│  │ └────┴────────────────────────┴──────┴─────────┘ │ │
│  │                                                   │ │
│  │ ┌────┬────────────────────────┬──────┬─────────┐ │ │
│  │ │IMG │ Pedigree Adult         │  x2  │360.000đ │ │ │
│  │ └────┴────────────────────────┴──────┴─────────┘ │ │
│  │                                                   │ │
│  │           Tổng cộng:           560.000đ          │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐ │
│  │ THEO DÕI ĐƠN HÀNG   │  │ TIẾP TỤC MUA SẮM       │ │  ← Action buttons
│  └─────────────────────┘  └─────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Components Detail (Success Page)

#### 1. Success Icon + Heading
```
┌───────────────────────────────┐
│                               │
│       [✓ Checkmark Icon]      │  ← SVG circle with checkmark
│       Size: 80x80             │     Flaticon: check-circle
│       Color: --color-success  │     Animation: Scale in + check draw
│                               │
│   ĐẶT HÀNG THÀNH CÔNG!       │  ← H1, Lora font
│                               │     Color: --color-success
│                               │
│ Cảm ơn bạn đã tin tưởng      │  ← Body text, center aligned
│ Pawpal. Đơn hàng của bạn     │     Color: --color-text-light
│ đã được tiếp nhận.           │
│                               │
└───────────────────────────────┘
```

**Icon Animation (CSS):**
```css
@keyframes checkmark-draw {
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.success-icon {
  animation: scale-in 0.5s ease-out;
}

.success-icon path {
  stroke-dasharray: 100;
  animation: checkmark-draw 0.6s 0.3s ease-out forwards;
}

@keyframes scale-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
```

#### 2. Order Info Card
```
┌─────────────────────────────────────────┐
│ THÔNG TIN ĐƠN HÀNG                      │  ← H2
├─────────────────────────────────────────┤
│                                         │
│ Mã đơn hàng:                           │
│ #ORD-20260613-001234  [📋 Copy]       │  ← Copy button (JS)
│                                         │
│ Trạng thái thanh toán:                 │
│ [✓] ĐÃ THANH TOÁN                     │  ← Badge with icon
│                                         │
│ Địa chỉ giao hàng:                     │
│ Nguyễn Văn A, 0901234567              │
│ 123 Lê Lợi, Quận 1, TP.HCM           │
│                                         │
│ Thời gian đặt hàng:                    │
│ 13/06/2026 - 14:30                    │
│                                         │
│ Phương thức thanh toán:                │
│ Thanh toán khi nhận hàng (COD)        │
│                                         │
└─────────────────────────────────────────┘
```

**Copy Order ID functionality:**
```javascript
function copyOrderId() {
  const orderId = document.getElementById('order-id').textContent;
  navigator.clipboard.writeText(orderId);
  
  // Show toast notification
  showToast('Đã sao chép mã đơn hàng');
}
```

**Status badge:**
```html
<span class="status-badge status-paid">
  <svg width="16" height="16">
    <use href="/assets/icons/ui.svg#check-circle"></use>
  </svg>
  ĐÃ THANH TOÁN
</span>
```

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--border-radius-pill);
  font-size: var(--fs-small);
  font-weight: 600;
}

.status-paid {
  background: var(--color-success-light);
  color: var(--color-success);
}
```

#### 3. Products List
```
┌─────────────────────────────────────────┐
│ SẢN PHẨM ĐÃ ĐẶT                        │  ← H2
├─────────────────────────────────────────┤
│                                         │
│ ┌────┬──────────────────┬────┬───────┐ │
│ │IMG │ Royal Canin      │ x1 │250k đ │ │
│ │80px│ Mini Adult       │    │       │ │
│ └────┴──────────────────┴────┴───────┘ │
│                                         │
│ ┌────┬──────────────────┬────┬───────┐ │
│ │IMG │ Pedigree Adult   │ x2 │360k đ │ │
│ │80px│ Dry Food         │    │       │ │
│ └────┴──────────────────┴────┴───────┘ │
│                                         │
│ ─────────────────────────────────────   │
│                                         │
│ Tổng tiền hàng:          610.000đ     │
│ Phí vận chuyển:          Miễn phí     │
│ Giảm giá:                -50.000đ     │
│ ─────────────────────────────────────   │
│                                         │
│ TỔNG CỘNG:               560.000đ     │  ← Bold, large
│                                         │
└─────────────────────────────────────────┘
```

#### 4. Action Buttons
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ [📦] THEO DÕI │  │ [🛒] TIẾP TỤC│   │  ← Icons are SVG
│  │ ĐƠN HÀNG     │  │ MUA SẮM      │   │
│  └──────────────┘  └──────────────┘   │
│   Primary CTA       Secondary          │
│                                         │
└─────────────────────────────────────────┘
```

**Icon usage (Flaticon):**
- Theo dõi đơn hàng: `package` / `box` / `delivery`
- Tiếp tục mua sắm: `shopping-bag` / `cart` / `shop`

**Button styling:**
```css
.btn-track-order {
  background: var(--color-primary);
  color: white;
}

.btn-continue-shopping {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}
```

---

## 📄 Page 3: Payment Failed Page (US 9-2)

### File Structure
```
pages/shop/payment-failed.html
assets/css/shop/payment-result.css
assets/js/shop/payment-failed.js
```

### Layout Structure (Single Column - Centered)

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│               ┌───────────────────┐                     │
│               │                   │                     │
│               │   [✗ ICON]        │  ← Error X mark (SVG)
│               │   Size: 80x80     │     Color: --color-danger
│               │                   │                     │
│               └───────────────────┘                     │
│                                                         │
│         GIAO DỊCH KHÔNG THÀNH CÔNG!                    │  ← H1, color: danger
│                                                         │
│        Rất tiếc, thanh toán của bạn không              │  ← Body text
│        được xử lý thành công.                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ THÔNG TIN LỖI                                     │ │  ← Card
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │ Mã đơn hàng:  #ORD-20260613-001234              │ │
│  │                                                   │ │
│  │ Trạng thái thanh toán:  THẤT BẠI                │ │  ← Red badge
│  │                                                   │ │
│  │ Lý do:                                           │ │
│  │ Tài khoản của quý khách không đủ số dư để       │ │
│  │ thực hiện giao dịch                             │ │
│  │                                                   │ │
│  │ Thời gian:  13/06/2026 - 14:30                  │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐ │
│  │ THỬ THANH TOÁN LẠI  │  │ QUAY VỀ GIỎ HÀNG       │ │  ← Action buttons
│  └─────────────────────┘  └─────────────────────────┘ │
│                                                         │
│  Hoặc liên hệ hỗ trợ: 1900 xxxx                       │  ← Support link
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Components Detail (Failed Page)

#### 1. Error Icon + Heading
```
┌───────────────────────────────┐
│                               │
│       [✗ X Mark Icon]         │  ← SVG circle with X
│       Size: 80x80             │     Flaticon: x-circle / close-circle
│       Color: --color-danger   │     Animation: Shake + fade in
│                               │
│ GIAO DỊCH KHÔNG THÀNH CÔNG!  │  ← H1, Lora font
│                               │     Color: --color-danger
│                               │
│ Rất tiếc, thanh toán của bạn │  ← Body text, center aligned
│ không được xử lý thành công. │     Color: --color-text-light
│                               │
└───────────────────────────────┘
```

**Icon Animation (CSS):**
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.error-icon {
  animation: fade-in 0.3s ease-out, shake 0.5s 0.3s ease-out;
}
```

#### 2. Error Info Card
```
┌─────────────────────────────────────────┐
│ THÔNG TIN LỖI                           │  ← H2
├─────────────────────────────────────────┤
│                                         │
│ Mã đơn hàng:                           │
│ #ORD-20260613-001234                   │
│                                         │
│ Trạng thái thanh toán:                 │
│ [✗] THẤT BẠI                          │  ← Red badge
│                                         │
│ Lý do:                                 │
│ • Tài khoản không đủ số dư             │
│ hoặc                                   │
│ • Người dùng hủy thao tác thanh toán  │
│ hoặc                                   │
│ • Thông tin thẻ không chính xác       │
│                                         │
│ Thời gian:                             │
│ 13/06/2026 - 14:30                    │
│                                         │
│ Mã giao dịch:                          │
│ TXN-20260613-FAILED-001                │
│                                         │
└─────────────────────────────────────────┘
```

**Failed status badge:**
```html
<span class="status-badge status-failed">
  <svg width="16" height="16">
    <use href="/assets/icons/ui.svg#x-circle"></use>
  </svg>
  THẤT BẠI
</span>
```

```css
.status-failed {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
```

#### 3. Retry Actions
```
┌─────────────────────────────────────────┐
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ [🔄] THỬ     │  │ [◀] QUAY VỀ  │   │  ← Icons are SVG
│  │ THANH TOÁN   │  │ GIỎ HÀNG     │   │
│  │ LẠI          │  │              │   │
│  └──────────────┘  └──────────────┘   │
│   Primary CTA       Secondary          │
│                                         │
│  Hoặc liên hệ hỗ trợ: 1900 xxxx       │  ← Link with phone icon
│                                         │
└─────────────────────────────────────────┘
```

**Icons (Flaticon):**
- Thử lại: `refresh` / `reload` / `retry`
- Quay về: `arrow-left` / `back` / `undo`
- Hỗ trợ: `phone` / `support` / `headset`

**Retry Logic (JS):**
```javascript
// When click "Thử thanh toán lại"
document.getElementById('btn-retry').addEventListener('click', () => {
  // Preserve order data
  const orderId = new URLSearchParams(window.location.search).get('orderId');
  
  // Redirect back to checkout with order data
  window.location.href = `checkout.html?retry=true&orderId=${orderId}`;
});
```

---

## 🔧 Interactive Features

### 1. Saved Address Selection (Checkout Page)
```javascript
// Load saved addresses for logged-in users
const user = JSON.parse(localStorage.getItem('pawpal_user'));

if (user && user.addresses && user.addresses.length > 0) {
  // Show address dropdown
  document.getElementById('saved-addresses-section').style.display = 'block';
  populateAddressDropdown(user.addresses);
  
  // Set default address
  const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
  fillAddressForm(defaultAddr);
} else {
  // Show manual form only
  document.getElementById('saved-addresses-section').style.display = 'none';
  showManualForm();
}

// Address selection logic
addressDropdown.addEventListener('change', (e) => {
  if (e.target.value === 'new') {
    // Add new address
    clearAddressForm();
    showManualForm();
  } else {
    // Load selected address
    const selectedAddress = user.addresses.find(a => a.id === e.target.value);
    fillAddressForm(selectedAddress);
  }
});

function fillAddressForm(address) {
  document.querySelector('[name="fullName"]').value = address.name;
  document.querySelector('[name="phone"]').value = address.phone;
  document.querySelector('[name="address"]').value = address.street;
  document.querySelector('[name="city"]').value = address.city;
  document.querySelector('[name="district"]').value = address.district;
  document.querySelector('[name="note"]').value = address.note || '';
}
```

### 2. Delivery Option Selection (Checkout Page)
```javascript
// Delivery method change → Recalculate shipping fee
deliveryOptions.forEach(option => {
  option.addEventListener('change', (e) => {
    const deliveryCard = e.target.closest('.delivery-option');
    
    // Remove selected state from all
    document.querySelectorAll('.delivery-option').forEach(card => {
      card.classList.remove('selected');
    });
    
    // Add selected state
    deliveryCard.classList.add('selected');
    
    // Get shipping fee
    const shippingFee = parseInt(e.target.dataset.fee) || 0;
    const deliveryType = e.target.value; // 'standard' or 'express'
    
    // Update order summary
    updateOrderSummary({ 
      shippingFee, 
      deliveryType 
    });
    
    // Update UI labels
    document.getElementById('delivery-label').textContent = 
      deliveryType === 'standard' ? 'Giao tiêu chuẩn' : 'Giao nhanh';
  });
});
```

### 3. PawPoints Redemption (Checkout Page)
```javascript
// Points slider interaction
const pointsSlider = document.getElementById('points-slider');
const pointsValue = document.getElementById('points-value-display');
const pointsCheckbox = document.getElementById('use-points-checkbox');
const remainingPoints = document.getElementById('remaining-points');

const userPoints = user?.pawPoints || 0;
const orderTotal = 610000; // From cart

// Set slider max: Min of (user points, order total / 1000)
const maxPoints = Math.min(userPoints, Math.floor(orderTotal / 1000));
pointsSlider.max = maxPoints;
pointsSlider.min = 10; // Minimum 10 points

pointsSlider.addEventListener('input', (e) => {
  const points = parseInt(e.target.value);
  const discount = points * 1000; // 1 point = 1.000đ
  
  // Update display
  pointsValue.textContent = discount.toLocaleString('vi-VN');
  remainingPoints.textContent = userPoints - points;
  
  // Update order summary if checkbox is checked
  if (pointsCheckbox.checked) {
    updateOrderSummary({ pointsDiscount: discount, pointsUsed: points });
  }
});

pointsCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    // Enable slider
    pointsSlider.disabled = false;
    const points = parseInt(pointsSlider.value);
    const discount = points * 1000;
    updateOrderSummary({ pointsDiscount: discount, pointsUsed: points });
  } else {
    // Disable slider
    pointsSlider.disabled = true;
    updateOrderSummary({ pointsDiscount: 0, pointsUsed: 0 });
  }
});

// Validation: Points cannot exceed order total
function validatePointsUsage(points, orderTotal) {
  const discount = points * 1000;
  if (discount > orderTotal) {
    showToast('Số điểm sử dụng không được vượt quá tổng đơn hàng', 'warning');
    return false;
  }
  return true;
}
```

### 4. Voucher Application (Checkout Page)
```javascript
// Apply voucher code
const voucherInput = document.getElementById('voucher-input');
const applyVoucherBtn = document.getElementById('apply-voucher-btn');
const appliedVoucherBadge = document.getElementById('applied-voucher');

applyVoucherBtn.addEventListener('click', async () => {
  const code = voucherInput.value.trim().toUpperCase();
  
  if (!code) {
    showToast('Vui lòng nhập mã giảm giá', 'error');
    return;
  }
  
  // Show loading
  applyVoucherBtn.disabled = true;
  applyVoucherBtn.textContent = 'Đang xử lý...';
  
  try {
    // Validate voucher (API call or local validation)
    const voucher = await validateVoucher(code, getCurrentCartTotal());
    
    if (voucher.valid) {
      // Show success
      showVoucherSuccess(voucher);
      updateOrderSummary({ 
        voucherDiscount: voucher.discount,
        voucherCode: code 
      });
      
      // Show applied badge
      appliedVoucherBadge.style.display = 'flex';
      document.getElementById('voucher-code-display').textContent = code;
      document.getElementById('voucher-amount').textContent = 
        `-${formatCurrency(voucher.discount)}`;
      
      // Clear input
      voucherInput.value = '';
      
      showToast('Áp dụng mã giảm giá thành công!', 'success');
    } else {
      showToast(voucher.message || 'Mã giảm giá không hợp lệ', 'error');
    }
  } catch (error) {
    showToast('Có lỗi xảy ra khi áp dụng mã giảm giá', 'error');
  } finally {
    applyVoucherBtn.disabled = false;
    applyVoucherBtn.textContent = 'ÁP DỤNG';
  }
});

// Remove voucher
removeVoucherBtn.addEventListener('click', () => {
  currentVoucher = null;
  updateOrderSummary({ voucherDiscount: 0, voucherCode: null });
  appliedVoucherBadge.style.display = 'none';
  showToast('Đã xóa mã giảm giá', 'info');
});

// Voucher validation function
async function validateVoucher(code, cartTotal) {
  // Load vouchers from data
  const vouchers = await loadJSON('data/vouchers.json');
  const voucher = vouchers.find(v => v.code === code);
  
  if (!voucher) {
    return { valid: false, message: 'Mã giảm giá không tồn tại' };
  }
  
  // Check expiry
  const now = new Date();
  const expiry = new Date(voucher.validUntil);
  if (now > expiry) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn' };
  }
  
  // Check minimum order value
  if (cartTotal < voucher.minOrderValue) {
    return { 
      valid: false, 
      message: `Đơn hàng tối thiểu ${formatCurrency(voucher.minOrderValue)}` 
    };
  }
  
  // Check usage limit
  if (voucher.usageCount >= voucher.maxUsage) {
    return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
  }
  
  // Calculate discount
  let discount = 0;
  if (voucher.type === 'percentage') {
    discount = Math.min(
      (cartTotal * voucher.value) / 100,
      voucher.maxDiscount || Infinity
    );
  } else {
    discount = voucher.value;
  }
  
  return { 
    valid: true, 
    discount, 
    voucher 
  };
}
```

### 5. Invoice Form Toggle (Checkout Page)
```javascript
// Toggle invoice form visibility
const invoiceCheckbox = document.getElementById('invoice-checkbox');
const invoiceForm = document.getElementById('invoice-form');

invoiceCheckbox.addEventListener('change', (e) => {
  if (e.target.checked) {
    // Show invoice form
    invoiceForm.style.display = 'block';
    
    // Make fields required
    invoiceForm.querySelectorAll('input').forEach(input => {
      input.setAttribute('required', 'required');
    });
    
    // Focus first field
    invoiceForm.querySelector('input').focus();
  } else {
    // Hide invoice form
    invoiceForm.style.display = 'none';
    
    // Remove required
    invoiceForm.querySelectorAll('input').forEach(input => {
      input.removeAttribute('required');
    });
  }
});

// Validate tax code format
const taxCodeInput = document.querySelector('[name="taxCode"]');
taxCodeInput.addEventListener('input', (e) => {
  const value = e.target.value;
  const regex = /^[0-9]{10}(-[0-9]{3})?$/;
  
  if (value && !regex.test(value)) {
    taxCodeInput.setCustomValidity('Mã số thuế không hợp lệ (10 hoặc 13 chữ số)');
  } else {
    taxCodeInput.setCustomValidity('');
  }
});
```

### 6. Form Validation (Checkout Page)
```javascript
// Real-time validation
const phoneInput = document.querySelector('[name="phone"]');
phoneInput.addEventListener('blur', () => {
  const phone = phoneInput.value;
  const phoneRegex = /^[0-9]{10}$/;
  
  if (!phoneRegex.test(phone)) {
    phoneInput.classList.add('error');
    showErrorMessage(phoneInput, 'Số điện thoại phải có 10 chữ số');
  } else {
    phoneInput.classList.remove('error');
    hideErrorMessage(phoneInput);
  }
});
```

### 2. Payment Method Selection
```javascript
// Radio button behavior
document.querySelectorAll('.payment-method-card').forEach(card => {
  card.addEventListener('click', () => {
    // Remove selected from all
    document.querySelectorAll('.payment-method-card').forEach(c => 
      c.classList.remove('selected')
    );
    
    // Add selected to clicked
    card.classList.add('selected');
    
    // Check radio
    card.querySelector('input[type="radio"]').checked = true;
    
    // Update button text
    updateCheckoutButtonText(card.dataset.method);
  });
});
```

### 3. Checkout Submit Logic
```javascript
document.getElementById('btn-checkout').addEventListener('click', async (e) => {
  e.preventDefault();
  
  // 1. Validate form
  if (!validateForm()) {
    return;
  }
  
  // 2. Get selected payment method
  const selectedPayment = document.querySelector('.payment-method-card.selected');
  const paymentMethod = selectedPayment.dataset.method;
  
  // 3. Collect order data
  const orderData = {
    orderId: generateOrderId(),
    customer: {
      name: document.querySelector('[name="fullName"]').value,
      phone: document.querySelector('[name="phone"]').value,
      address: document.querySelector('[name="address"]').value,
      note: document.querySelector('[name="note"]').value
    },
    items: getCartItems(),
    payment: {
      method: paymentMethod,
      total: calculateTotal()
    },
    createdAt: new Date().toISOString()
  };
  
  // 4. Route based on payment method
  if (paymentMethod === 'cod') {
    // COD → Create order and go to success
    await createOrder(orderData, 'pending');
    window.location.href = `payment-success.html?orderId=${orderData.orderId}`;
  } else {
    // Online payment → Create order and redirect to gateway
    await createOrder(orderData, 'awaiting_payment');
    redirectToPaymentGateway(paymentMethod, orderData);
  }
});
```

### 4. Payment Gateway Simulation
```javascript
// Simulate redirect to payment gateway
function redirectToPaymentGateway(method, orderData) {
  // In real app, this would call backend API to get payment URL
  // Backend would call MoMo/VNPay API and return payment URL
  
  // For demo: simulate with query params
  const paymentUrl = `payment-gateway-sim.html?method=${method}&orderId=${orderData.orderId}&amount=${orderData.payment.total}`;
  
  window.location.href = paymentUrl;
}

// Handle payment callback (on payment-gateway-sim.html)
function handlePaymentCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const status = urlParams.get('status'); // 'success' or 'failed'
  const orderId = urlParams.get('orderId');
  
  if (status === 'success') {
    // Update order status to 'paid'
    updateOrderStatus(orderId, 'paid');
    window.location.href = `payment-success.html?orderId=${orderId}`;
  } else {
    window.location.href = `payment-failed.html?orderId=${orderId}&error=${urlParams.get('error')}`;
  }
}
```

### 5. Copy Order ID
```javascript
async function copyOrderId() {
  const orderIdElement = document.getElementById('order-id');
  const orderId = orderIdElement.textContent.trim();
  
  try {
    await navigator.clipboard.writeText(orderId);
    
    // Show success feedback
    showToast('Đã sao chép mã đơn hàng', 'success');
    
    // Optional: Change button text temporarily
    const btn = document.getElementById('btn-copy');
    const originalText = btn.textContent;
    btn.textContent = 'Đã sao chép!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  } catch (err) {
    showToast('Không thể sao chép', 'error');
  }
}
```

---

## 📱 Mobile Considerations

### Checkout Page (Mobile)
- Grid → Single column
- Summary sticky at bottom (collapsed)
- Tap to expand summary
- Larger touch targets for radio buttons (44x44px)
- Payment cards full width
- Sticky submit button at bottom

**Mobile Summary Accordion:**
```
┌─────────────────────────┐
│ [▼] Tóm tắt đơn hàng    │  ← Tap to expand
│     560.000đ            │
├─────────────────────────┤
│ (Collapsed content)     │
└─────────────────────────┘
```

**Expanded:**
```
┌─────────────────────────┐
│ [▲] Tóm tắt đơn hàng    │
├─────────────────────────┤
│ [IMG] Royal Canin       │
│ x1        250.000đ      │
├─────────────────────────┤
│ [IMG] Pedigree          │
│ x2        360.000đ      │
├─────────────────────────┤
│ Tổng: 610.000đ         │
│ Giảm: -50.000đ         │
│ ────────────            │
│ 560.000đ                │
└─────────────────────────┘
```

### Result Pages (Mobile)
- Icon size: 64x64px (smaller than desktop)
- Card padding: Reduced to `--space-sm`
- Buttons stack vertically
- Full width buttons

---

## 🎯 Data Structure

### Order Object (localStorage)
```javascript
const order = {
  orderId: "ORD-20260613-001234",
  status: "pending", // pending | paid | processing | shipped | completed | cancelled
  paymentStatus: "paid", // unpaid | paid | refunded
  paymentMethod: "cod", // cod | momo | vnpay | bank
  customer: {
    name: "Nguyễn Văn A",
    phone: "0901234567",
    address: "123 Lê Lợi, Quận 1, TP.HCM",
    note: "Giao buổi chiều"
  },
  items: [
    {
      id: "RC001",
      name: "Royal Canin Mini Adult",
      image: "...",
      price: 250000,
      quantity: 1,
      subtotal: 250000
    }
  ],
  pricing: {
    subtotal: 610000,
    shipping: 0,
    discount: 50000,
    total: 560000,
    voucher: "PAWFIRST10"
  },
  createdAt: "2026-06-13T14:30:00Z",
  paidAt: null,
  transactionId: null
};
```

### Payment Methods Data (payment-methods.json)
```json
{
  "paymentMethods": [
    {
      "id": "cod",
      "name": "Thanh toán khi nhận hàng (COD)",
      "icon": "cash",
      "description": "Thanh toán bằng tiền mặt khi nhận hàng",
      "enabled": true,
      "fee": 0
    },
    {
      "id": "momo",
      "name": "Ví điện tử MoMo",
      "icon": "wallet",
      "description": "Thanh toán qua ví MoMo",
      "enabled": true,
      "fee": 0
    },
    {
      "id": "vnpay",
      "name": "VNPay",
      "icon": "credit-card",
      "description": "Thanh toán qua cổng VNPay",
      "enabled": true,
      "fee": 0
    },
    {
      "id": "bank",
      "name": "Chuyển khoản ngân hàng",
      "icon": "bank",
      "description": "Chuyển khoản qua Internet Banking",
      "enabled": true,
      "fee": 0
    }
  ],
  "shippingFee": 25000,
  "freeShippingThreshold": 500000
}
```

---

## 📦 Data Structures

### User Address Object
```javascript
{
  id: 'addr_001',
  userId: 'user_123',
  name: 'Nguyễn Văn A',
  phone: '0901234567',
  street: '123 Lê Lợi, Phường Bến Thành',
  district: 'Quận 1',
  city: 'TP. Hồ Chí Minh',
  type: 'home', // 'home' | 'office' | 'other'
  label: 'Nhà riêng', // User-friendly label
  isDefault: true,
  note: 'Giao vào buổi chiều',
  createdAt: '2026-05-01T10:30:00Z',
  updatedAt: '2026-06-10T14:20:00Z'
}
```

### Delivery Options (data/delivery-options.json)
```json
[
  {
    "id": "standard",
    "name": "Giao tiêu chuẩn",
    "description": "3-5 ngày làm việc",
    "fee": 0,
    "estimatedDays": [3, 5],
    "icon": "truck",
    "available": true
  },
  {
    "id": "express",
    "name": "Giao nhanh",
    "description": "1-2 ngày làm việc",
    "fee": 25000,
    "estimatedDays": [1, 2],
    "icon": "fast-delivery",
    "available": true
  }
]
```

### Voucher Object (data/vouchers.json)
```json
[
  {
    "code": "PAWFIRST10",
    "type": "fixed", 
    "value": 50000,
    "minOrderValue": 200000,
    "maxDiscount": null,
    "validFrom": "2026-06-01T00:00:00Z",
    "validUntil": "2026-06-30T23:59:59Z",
    "usageCount": 45,
    "maxUsage": 1000,
    "applicableFor": ["all"],
    "description": "Giảm 50.000đ cho đơn hàng đầu tiên",
    "active": true
  },
  {
    "code": "FREESHIP",
    "type": "shipping",
    "value": 25000,
    "minOrderValue": 200000,
    "maxDiscount": 25000,
    "validFrom": "2026-06-01T00:00:00Z",
    "validUntil": "2026-06-30T23:59:59Z",
    "usageCount": 120,
    "maxUsage": 500,
    "applicableFor": ["all"],
    "description": "Miễn phí vận chuyển",
    "active": true
  },
  {
    "code": "SUMMER50",
    "type": "percentage",
    "value": 10,
    "minOrderValue": 500000,
    "maxDiscount": 50000,
    "validFrom": "2026-06-15T00:00:00Z",
    "validUntil": "2026-07-15T23:59:59Z",
    "usageCount": 0,
    "maxUsage": 200,
    "applicableFor": ["food", "toys"],
    "description": "Giảm 10% tối đa 50.000đ",
    "active": true
  }
]
```

### PawPoints Redemption
```javascript
{
  userId: 'user_123',
  currentPoints: 150,
  pointsUsed: 30,
  pointsRemaining: 120,
  discount: 30000, // 30 points x 1000đ
  conversionRate: 1000, // 1 point = 1000đ
  minRedemption: 10, // Minimum 10 points
  maxRedemption: 150 // User's balance or order total / 1000
}
```

### Invoice Data (VAT Invoice)
```javascript
{
  orderId: 'ORD-20260613-001234',
  companyName: 'Công ty TNHH ABC',
  taxCode: '0123456789',
  companyAddress: '789 Nguyễn Trãi, Quận 5, TP.HCM',
  email: 'accounting@company.com',
  requestedAt: '2026-06-13T14:30:00Z',
  status: 'pending', // 'pending' | 'issued' | 'sent'
  invoiceNumber: null, // Assigned when issued
  issuedAt: null
}
```

### Payment Methods (data/payment-methods.json)
```json
[
  {
    "id": "cod",
    "name": "Thanh toán khi nhận hàng",
    "shortName": "COD",
    "description": "Thanh toán bằng tiền mặt khi nhận hàng",
    "icon": "cash",
    "fee": 0,
    "available": true,
    "requiresInfo": false
  },
  {
    "id": "momo",
    "name": "Ví điện tử MoMo",
    "shortName": "MoMo",
    "description": "Thanh toán qua ví MoMo",
    "icon": "wallet",
    "fee": 0,
    "available": true,
    "requiresInfo": false,
    "redirectUrl": "https://payment.momo.vn/..."
  },
  {
    "id": "vnpay",
    "name": "Cổng thanh toán VNPay",
    "shortName": "VNPay",
    "description": "Thanh toán qua cổng VNPay",
    "icon": "credit-card",
    "fee": 0,
    "available": true,
    "requiresInfo": false,
    "redirectUrl": "https://sandbox.vnpayment.vn/..."
  },
  {
    "id": "bank",
    "name": "Chuyển khoản ngân hàng",
    "shortName": "Bank Transfer",
    "description": "Chuyển khoản qua Internet Banking",
    "icon": "bank",
    "fee": 0,
    "available": true,
    "requiresInfo": true,
    "bankInfo": {
      "bankName": "Ngân hàng Vietcombank",
      "accountNumber": "0123456789",
      "accountName": "CÔNG TY PAWPAL",
      "branch": "Chi nhánh TP.HCM"
    }
  }
]
```

### Order Object (Submitted to API)
```javascript
{
  orderId: 'ORD-20260613-001234',
  userId: 'user_123',
  
  // Shipping info
  shipping: {
    name: 'Nguyễn Văn A',
    phone: '0901234567',
    address: '123 Lê Lợi, Phường Bến Thành',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    note: 'Giao vào buổi chiều',
    deliveryMethod: 'standard', // 'standard' | 'express'
    deliveryFee: 0
  },
  
  // Products
  items: [
    {
      productId: 'prod_001',
      name: 'Royal Canin Mini Adult',
      brand: 'Royal Canin',
      price: 250000,
      quantity: 1,
      image: '/assets/images/products/royal-canin-mini.jpg',
      subtotal: 250000
    },
    {
      productId: 'prod_002',
      name: 'Pedigree Adult Dry Food',
      brand: 'Pedigree',
      price: 180000,
      quantity: 2,
      image: '/assets/images/products/pedigree-adult.jpg',
      subtotal: 360000
    }
  ],
  
  // Pricing
  pricing: {
    subtotal: 610000,
    shippingFee: 0,
    pointsDiscount: 30000,
    pointsUsed: 30,
    voucherDiscount: 50000,
    voucherCode: 'PAWFIRST10',
    grandTotal: 530000
  },
  
  // Payment
  payment: {
    method: 'cod', // 'cod' | 'momo' | 'vnpay' | 'bank'
    status: 'pending', // 'pending' | 'paid' | 'failed'
    transactionId: null,
    paidAt: null
  },
  
  // Invoice (optional)
  invoice: {
    required: true,
    companyName: 'Công ty TNHH ABC',
    taxCode: '0123456789',
    companyAddress: '789 Nguyễn Trãi, Quận 5, TP.HCM',
    email: 'accounting@company.com'
  },
  
  // Metadata
  status: 'pending', // 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled'
  createdAt: '2026-06-13T14:30:00Z',
  updatedAt: '2026-06-13T14:30:00Z',
  
  // Tracking
  tracking: {
    carrier: 'Giao Hàng Nhanh',
    trackingNumber: null,
    estimatedDelivery: '2026-06-18',
    statusHistory: [
      {
        status: 'pending',
        timestamp: '2026-06-13T14:30:00Z',
        note: 'Đơn hàng đã được tạo'
      }
    ]
  }
}
```

### Order Summary State (Client-side)
```javascript
const orderSummary = {
  // Base
  subtotal: 610000,
  itemCount: 3,
  
  // Adjustments
  shippingFee: 0,
  deliveryMethod: 'standard',
  pointsDiscount: 30000,
  pointsUsed: 30,
  voucherDiscount: 50000,
  voucherCode: 'PAWFIRST10',
  
  // Calculated
  grandTotal: 530000,
  
  // Methods
  calculate() {
    this.grandTotal = this.subtotal 
      + this.shippingFee 
      - this.pointsDiscount 
      - this.voucherDiscount;
    return this.grandTotal;
  },
  
  update(changes) {
    Object.assign(this, changes);
    return this.calculate();
  }
};
```

---

## ✅ Implementation Checklist

### Phase 0: Prepare Data Files
- [ ] Create `data/delivery-options.json` (Standard/Express)
- [ ] Create `data/vouchers.json` (PAWFIRST10, FREESHIP, SUMMER50)
- [ ] Update `data/payment-methods.json` (Add bank info for transfer)
- [ ] Add user addresses to localStorage structure
- [ ] Add PawPoints to user profile structure

### Phase 1: Checkout Page - Shipping Address
- [ ] Download Flaticon icons (location, plus, map-pin)
- [ ] Saved addresses dropdown (logged-in users)
- [ ] Address selection logic (auto-fill form)
- [ ] "Add new address" button
- [ ] Manual address form with validation
- [ ] City/District dropdowns (Vietnam locations)
- [ ] "Save to my addresses" checkbox
- [ ] Phone number validation (10 digits, starts with 0)

### Phase 2: Checkout Page - Delivery Options
- [ ] Download Flaticon icons (truck, fast-delivery)
- [ ] Delivery method cards (Standard/Express)
- [ ] Radio selection with visual feedback
- [ ] Shipping fee calculation
- [ ] Update order summary when delivery changes

### Phase 3: Checkout Page - PawPoints
- [ ] Download Flaticon icons (star, medal, reward)
- [ ] Points balance display
- [ ] Points slider (min 10, max: user balance or order total)
- [ ] Real-time discount calculation
- [ ] Checkbox toggle to enable/disable
- [ ] Remaining points display
- [ ] Validation (cannot exceed order total)

### Phase 4: Checkout Page - Vouchers
- [ ] Download Flaticon icons (ticket, coupon)
- [ ] Voucher input + Apply button
- [ ] Voucher validation logic (API or local)
- [ ] Applied voucher badge (with remove button)
- [ ] Available vouchers section (quick apply)
- [ ] Error handling (expired, min order, invalid code)
- [ ] Success toast notification

### Phase 5: Checkout Page - Invoice Option
- [ ] Invoice checkbox toggle
- [ ] Show/hide invoice form
- [ ] Company name, tax code, address, email fields
- [ ] Tax code validation (10 or 13 digits)
- [ ] Make fields required when checked
- [ ] Info text about invoice delivery (3 days)

### Phase 6: Checkout Page - Trust Badges
- [ ] Download Flaticon icons (lock, return, verified, support)
- [ ] Trust badges section (4 badges grid)
- [ ] Responsive layout (4 cols → 2 cols mobile)
- [ ] Place above or below payment methods

### Phase 7: Checkout Page - Order Summary
- [ ] Sticky sidebar on desktop
- [ ] Product list with images
- [ ] Dynamic subtotal calculation
- [ ] Conditional rows (shipping, points, voucher)
- [ ] Real-time grand total update
- [ ] Security note with lock icon
- [ ] Button text changes based on payment method

### Phase 8: Checkout Page - Payment Methods
- [ ] Download Flaticon icons (payment + UI)
- [ ] Create payment-methods.json
- [ ] Steps indicator component
- [ ] Form validation (real-time)
- [ ] Auto-fill logic (logged in users)
- [ ] Payment method cards (radio selection)
- [ ] Order summary (sticky on desktop)
- [ ] Calculate totals (real-time)
- [ ] Button text change (COD vs Online)
- [ ] Submit handler (route by payment method)
- [ ] Loading state (disable form during submit)
- [ ] Mobile: Collapsible summary
- [ ] Mobile: Sticky bottom bar

### Payment Success Page
- [ ] Success icon with animation
- [ ] Order info card
- [ ] Copy order ID functionality
- [ ] Products list with totals
- [ ] Action buttons (track order + continue shopping)
- [ ] URL params: Get orderId
- [ ] Load order data from localStorage
- [ ] Mobile: Optimized layout

### Payment Failed Page
- [ ] Error icon with animation
- [ ] Error info card
- [ ] Display error reason
- [ ] Retry payment button
- [ ] Back to cart button
- [ ] Support contact link
- [ ] URL params: Get orderId + error
- [ ] Preserve order data for retry
- [ ] Mobile: Optimized layout

### Shared
- [ ] Toast notification component
- [ ] Loading spinner component
- [ ] Error message component
- [ ] Order management (localStorage CRUD)
- [ ] Clear cart after successful order

---

## 📦 Icon Assets Required

### Flaticon Icons (Checkout Flow)

**Download from:** https://www.flaticon.com

**Style:** Regular / Thin (line icons)  
**Format:** SVG  
**License:** Free (with attribution) or Premium

**Icon list:**
```
Payment Methods:
- cash / money / banknote (COD)
- wallet / e-wallet (MoMo)
- credit-card / payment-method (VNPay)
- bank / banking / building (Bank transfer)

UI Icons:
- check-circle / checkmark (Success)
- x-circle / close-circle (Failed)
- copy / clipboard (Copy button)
- package / box / delivery (Track order)
- shopping-bag / cart (Continue shopping)
- refresh / reload (Retry)
- arrow-left / back (Back button)
- phone / support / headset (Support)
- warning / alert (Error message)
```

**File structure:**
```
assets/icons/
├── payment/
│   ├── cash.svg
│   ├── wallet.svg
│   ├── credit-card.svg
│   └── bank.svg
└── ui/
    ├── check-circle.svg
    ├── x-circle.svg
    ├── copy.svg
    ├── package.svg
    ├── shopping-bag.svg
    ├── refresh.svg
    ├── arrow-left.svg
    ├── phone.svg
    └── warning.svg
```

---

**Ghi chú:** Tất cả wireframe tuân thủ design.md, không sử dụng subtitle, emoji, gradient, và layout 50/50.
