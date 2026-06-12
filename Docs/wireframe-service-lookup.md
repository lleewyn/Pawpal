# Wireframe & Mockup - Tra cứu dịch vụ (Service Lookup)

> **Mục đích:** Thiết kế giao diện cho US 7-2 (Guest access - Tra cứu dịch vụ công khai)  
> **File:** `pages/public/return-guest.html`  
> **Ngày tạo:** 12/06/2026  
> **Trạng thái:** 🟡 Đang thiết kế

---

## 📑 Table of Contents

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Layout Structure](#2-layout-structure)
3. [Components chi tiết](#3-components-chi-tiết)
4. [Flow diagram](#4-flow-diagram)
5. [Checklist implementation](#5-checklist-implementation)

---

## 1. Tổng quan hệ thống

### 1.1. User Stories Coverage

**US 7-2:** Khách vãng lai tra cứu dịch vụ bằng SĐT

**Acceptance Criteria:**
- ✅ AC2.1: Form tra cứu với SĐT → Hiển thị kết quả
- ✅ AC2.2: Timeline accordion/slide-down (không chuyển trang)
- ✅ 2 Tab: "Lịch hẹn dịch vụ" và "Đơn hàng sản phẩm"
- ✅ Nút "Xem nhật ký" mở accordion timeline
- ✅ Bảo mật: Chỉ xem đúng SĐT của mình

### 1.2. Files liên quan

```
pages/public/
└── return-guest.html              ← Main page (sẽ update)

assets/css/public/
└── return-guest.css               ← Page styles (sẽ update)

assets/js/public/
└── return-guest.js                ← Page logic (sẽ tạo mới)
```

---

## 2. Layout Structure

### 2.1. ASCII Layout - Initial State (Chưa tra cứu)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         HEADER (Sticky)                                 │
│                     Logo | Nav | Login Button                           │
└────────────────────────────────────────────────────────────────────────┘

┌─ HERO SECTION ──────────────────────────────────────────────────────────┐
│                                                                          │
│                    🔍 Tra cứu dịch vụ & đơn hàng                        │
│                                                                          │
│    ┌──────────────────────────────────────────────────────────┐        │
│    │ 📱 [            Nhập số điện thoại (10 số)             ] │        │
│    └──────────────────────────────────────────────────────────┘        │
│                                                                          │
│                      [ 🔍 Tra cứu ngay ]                                │
│                                                                          │
│              ───────────────── HOẶC ─────────────────────               │
│                                                                          │
│         Bạn đã có tài khoản? [Đăng nhập ngay] để xem tất cả            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2. ASCII Layout - After Lookup (Sau khi tra cứu)

```
┌────────────────────────────────────────────────────────────────────────┐
│                         HEADER (Sticky)                                 │
└────────────────────────────────────────────────────────────────────────┘

┌─ SEARCH BAR (Thu nhỏ, sticky top) ─────────────────────────────────────┐
│  📱 [   0901234567   ] [Tra cứu lại]  |  Tìm thấy 3 kết quả             │
└──────────────────────────────────────────────────────────────────────────┘

┌─ TABS NAVIGATION ───────────────────────────────────────────────────────┐
│  [ 📅 Lịch hẹn dịch vụ (2) ]    [ 📦 Đơn hàng sản phẩm (1) ]           │
└──────────────────────────────────────────────────────────────────────────┘

┌─ TAB 1: LỊCH HẸN DỊCH VỤ ──────────────────────────────────────────────┐
│                                                                          │
│  ┌─ SERVICE CARD 1 ────────────────────────────────────────────┐       │
│  │ 🐕 Bé Bông • Spa & Grooming                                  │       │
│  │ 📅 15/06/2026 • 10:00 - 11:30                                │       │
│  │ 👤 Nhân viên: Minh An                                        │       │
│  │ 💰 180.000đ                                                  │       │
│  │ 🟢 Đang thực hiện                                            │       │
│  │                                                               │       │
│  │ [ 📖 Xem nhật ký bé cưng ▼ ]                                │       │
│  │                                                               │       │
│  │ ┌─ ACCORDION TIMELINE (Expanded) ──────────────────────┐    │       │
│  │ │                                                        │    │       │
│  │ │ ● ──────────────────────────────────────             │    │       │
│  │ │ │ 15:30 • Đã hoàn thành chăm sóc                     │    │       │
│  │ │ │ Bé đã hoàn thành quá trình spa...                  │    │       │
│  │ │ │ 👤 Nguyễn Mai Anh                                  │    │       │
│  │ │ │ [💰 Hóa đơn: 180.000đ]                            │    │       │
│  │ │ └────────────────────────────────────────            │    │       │
│  │ │                                                        │    │       │
│  │ │ ● ──────────────────────────────────────             │    │       │
│  │ │ │ 14:45 • Đang sấy lông                             │    │       │
│  │ │ │ Bé đang được sấy lông...                           │    │       │
│  │ │ └────────────────────────────────────────            │    │       │
│  │ │                                                        │    │       │
│  │ │ ● ──────────────────────────────────────             │    │       │
│  │ │ │ ⚠️ 14:20 • Ghi chú khẩn                           │    │       │
│  │ │ │ Bé tỏ ra hơi căng thẳng...                        │    │       │
│  │ │ │                                                     │    │       │
│  │ │ │ [💬 Chat với nhân viên]                           │    │       │
│  │ │ └────────────────────────────────────────            │    │       │
│  │ │                                                        │    │       │
│  │ └────────────────────────────────────────────────────┘    │       │
│  └───────────────────────────────────────────────────────────┘       │
│                                                                          │
│  ┌─ SERVICE CARD 2 ────────────────────────────────────────────┐       │
│  │ 🐱 Miu • Pet Hotel (3 đêm)                                   │       │
│  │ 📅 10/06/2026 - 13/06/2026                                   │       │
│  │ 💰 450.000đ                                                  │       │
│  │ ✅ Hoàn thành                                                │       │
│  │                                                               │       │
│  │ [ 📖 Xem nhật ký bé cưng ▶ ]   (Collapsed)                 │       │
│  └───────────────────────────────────────────────────────────┘       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─ TAB 2: ĐƠN HÀNG SẢN PHẨM ─────────────────────────────────────────────┐
│                                                                          │
│  ┌─ ORDER CARD ─────────────────────────────────────────────────┐      │
│  │ 📦 Đơn hàng #DH-123456                                       │      │
│  │ 📅 08/06/2026                                                 │      │
│  │ 💰 350.000đ                                                   │      │
│  │ 🚚 Đang giao hàng                                            │      │
│  │                                                               │      │
│  │ [ Xem chi tiết → ]                                           │      │
│  └───────────────────────────────────────────────────────────┘      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Components chi tiết

### 3.1. Hero Search Section (Initial state)

**Specs:**
- Background: `var(--color-bg-light)` (cream)
- Padding: `var(--space-xl) * 2` (128px top/bottom)
- Max-width: `800px` (centered)

**CSS:**
```css
.lookup-hero {
    background: var(--color-bg-light);
    padding: calc(var(--space-xl) * 2) 0;
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
}

.lookup-hero-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    padding: 0 var(--space-md);
}

.lookup-hero-icon {
    font-size: 4rem;
    margin-bottom: var(--space-md);
}

.lookup-hero-title {
    font-family: var(--font-heading);
    font-size: clamp(2rem, 5vw, 3rem);
    color: var(--color-primary);
    margin-bottom: var(--space-lg);
}

.lookup-search-form {
    max-width: 600px;
    margin: 0 auto var(--space-lg) auto;
}

.lookup-phone-input {
    width: 100%;
    height: 56px;
    padding: 0 var(--space-md) 0 48px;
    border: 2px solid var(--color-border);
    border-radius: var(--card-border-radius);
    font-size: var(--fs-body);
    font-family: var(--font-primary);
    background: var(--color-bg-white);
    position: relative;
    transition: all 0.3s ease;
}

.lookup-phone-input:focus {
    border-color: var(--color-accent);
    outline: none;
    box-shadow: 0 0 0 3px rgba(229, 169, 60, 0.1);
}

.lookup-phone-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
    color: var(--color-text-light);
    pointer-events: none;
}

.btn-lookup {
    margin-top: var(--space-md);
    width: 100%;
    max-width: 300px;
    height: 48px;
    background: var(--color-primary);
    color: #ffffff;
    border: none;
    border-radius: var(--border-radius-pill);
    font-size: var(--fs-body);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-lookup:hover {
    background: var(--color-primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(42, 89, 68, 0.2);
}

.lookup-divider {
    margin: var(--space-lg) 0;
    color: var(--color-text-light);
    font-size: var(--fs-small);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.lookup-footer-text {
    font-size: var(--fs-body);
    color: var(--color-text-light);
}

.login-link {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
    transition: color 0.3s ease;
}

.login-link:hover {
    color: var(--color-primary-dark);
    text-decoration: underline;
}
```

### 3.2. Compact Search Bar (After lookup)

**Specs:**
- Sticky top: `80px` (below header)
- Background: `var(--color-bg-white)`
- Border-bottom: `1px solid var(--color-border)`
- Height: `60px`

**CSS:**
```css
.lookup-compact-bar {
    position: sticky;
    top: 80px;
    background: var(--color-bg-white);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-sm) 0;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.compact-bar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
}

.compact-search-group {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex: 1;
    max-width: 500px;
}

.compact-phone-input {
    flex: 1;
    height: 40px;
    padding: 0 var(--space-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--card-border-radius);
    font-size: var(--fs-small);
}

.btn-lookup-again {
    height: 40px;
    padding: 0 var(--space-md);
    background: var(--color-primary);
    color: #ffffff;
    border: none;
    border-radius: var(--border-radius-pill);
    font-size: var(--fs-small);
    font-weight: 600;
    white-space: nowrap;
}

.lookup-result-count {
    font-size: var(--fs-small);
    color: var(--color-text-light);
}
```

### 3.3. Tabs Navigation

**Specs:**
- Sticky top: `140px` (below compact bar)
- Tabs style: Underline active state

**CSS:**
```css
.lookup-tabs {
    position: sticky;
    top: 140px;
    background: var(--color-bg-light);
    border-bottom: 2px solid var(--color-border);
    z-index: 99;
}

.lookup-tabs-nav {
    display: flex;
    gap: var(--space-sm);
    padding: 0;
    margin: 0;
    list-style: none;
}

.lookup-tab {
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    font-family: var(--font-primary);
    font-size: var(--fs-body);
    font-weight: 500;
    color: var(--color-text-light);
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.lookup-tab:hover {
    color: var(--color-primary);
    background: var(--color-primary-light);
}

.lookup-tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    font-weight: 600;
}

.tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: var(--color-primary);
    color: #ffffff;
    border-radius: var(--border-radius-pill);
    font-size: var(--fs-caption);
    font-weight: 700;
    margin-left: 6px;
}
```

### 3.4. Service Card with Accordion Timeline

**Specs:**
- Card: `border-radius: var(--card-border-radius)`
- Accordion: Smooth slide animation (300ms)
- Timeline: Vertical line với dots

**CSS:**
```css
.service-card {
    background: var(--color-bg-white);
    border: var(--border-card);
    border-radius: var(--card-border-radius);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    box-shadow: var(--shadow-card);
    transition: all 0.3s ease;
}

.service-card:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);
}

.service-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-sm);
}

.service-card-title {
    font-family: var(--font-heading);
    font-size: var(--fs-h3);
    color: var(--color-text-dark);
    margin: 0 0 var(--space-xs) 0;
}

.service-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    font-size: var(--fs-small);
    color: var(--color-text-light);
    margin-bottom: var(--space-sm);
}

.service-card-price {
    font-size: var(--fs-h4);
    color: var(--color-accent);
    font-weight: 700;
}

.service-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: var(--border-radius-pill);
    font-size: var(--fs-caption);
    font-weight: 700;
}

.status-in-progress {
    background: var(--color-info-light);
    color: var(--color-info);
}

.status-completed {
    background: var(--color-success-light);
    color: var(--color-success);
}

.btn-toggle-timeline {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--color-primary-light);
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    border-radius: var(--border-radius-pill);
    font-size: var(--fs-small);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-toggle-timeline:hover {
    background: var(--color-primary);
    color: #ffffff;
}

.timeline-accordion {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    margin-top: var(--space-md);
}

.timeline-accordion.expanded {
    max-height: 2000px;
}

.accordion-timeline-wrapper {
    position: relative;
    padding-left: var(--space-md);
}

/* Reuse timeline styles from pet-diary.css */
```

### 3.5. Order Card (Tab 2)

**CSS:**
```css
.order-card {
    background: var(--color-bg-white);
    border: var(--border-card);
    border-radius: var(--card-border-radius);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    box-shadow: var(--shadow-card);
    transition: all 0.3s ease;
}

.order-card:hover {
    box-shadow: var(--shadow-card-hover);
    transform: translateY(-2px);
}

.order-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-sm);
}

.order-card-code {
    font-family: var(--font-heading);
    font-size: var(--fs-h4);
    color: var(--color-text-dark);
    font-weight: 600;
}

.order-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    font-size: var(--fs-small);
    color: var(--color-text-light);
    margin-bottom: var(--space-sm);
}

.order-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: var(--border-radius-pill);
    font-size: var(--fs-caption);
    font-weight: 700;
}

.btn-view-order {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: var(--space-xs) var(--space-md);
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    border-radius: var(--border-radius-pill);
    font-size: var(--fs-small);
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
}

.btn-view-order:hover {
    background: var(--color-primary);
    color: #ffffff;
}
```

---

## 4. Flow diagram

```
┌─────────────────┐
│ User lands on   │
│ return-guest.   │
│ html            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Show hero       │
│ search form     │
└────────┬────────┘
         │
         ▼ Enter phone
┌─────────────────┐
│ Validate phone  │
│ (10 digits)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │ Yes
         ▼
┌─────────────────┐
│ Call API with   │
│ phone number    │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
         │ Yes
         ▼
┌─────────────────┐
│ Hide hero,      │
│ show compact    │
│ search bar      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Render tabs:    │
│ - Services (2)  │
│ - Orders (1)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User clicks     │
│ "Xem nhật ký"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Expand          │
│ accordion       │
│ timeline        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Show timeline   │
│ with chat box   │
│ if urgent       │
└─────────────────┘
```

---

## 5. Checklist implementation

### Phase 1: HTML Structure
- [ ] Update `return-guest.html` title
- [ ] Hero search section
- [ ] Compact search bar (hidden by default)
- [ ] Tabs navigation
- [ ] Tab 1: Services grid
- [ ] Tab 2: Orders grid
- [ ] Empty state

### Phase 2: CSS Styling
- [ ] Update `return-guest.css`
- [ ] Hero section styles
- [ ] Compact bar styles
- [ ] Tabs styles
- [ ] Service card styles
- [ ] Accordion animation
- [ ] Timeline styles (reuse from pet-diary)
- [ ] Order card styles
- [ ] Responsive breakpoints

### Phase 3: JavaScript Logic
- [ ] Create `return-guest.js`
- [ ] Form validation (10 digits phone)
- [ ] API call mock
- [ ] Toggle hero ↔ results view
- [ ] Tab switching
- [ ] Accordion expand/collapse
- [ ] Timeline rendering (reuse from pet-diary)
- [ ] Chat box integration

### Phase 4: Integration
- [ ] Link from header navigation
- [ ] Link from landing page
- [ ] Test guest access flow
- [ ] Test timeline accordion
- [ ] Test chat box in accordion

---

## 6. Mock Data Structure

```javascript
const MOCK_LOOKUP_DATA = {
    phone: "0901234567",
    services: [
        {
            id: "S001",
            petName: "Bé Bông",
            petEmoji: "🐕",
            serviceName: "Spa & Grooming",
            date: "2026-06-15",
            time: "10:00 - 11:30",
            staff: "Minh An",
            price: 180000,
            status: "in-progress",
            timeline: [...] // Reuse MOCK_TIMELINE_DATA
        },
        {
            id: "S002",
            petName: "Miu",
            petEmoji: "🐱",
            serviceName: "Pet Hotel (3 đêm)",
            dateRange: "10/06/2026 - 13/06/2026",
            price: 450000,
            status: "completed",
            timeline: [...]
        }
    ],
    orders: [
        {
            id: "DH-123456",
            date: "2026-06-08",
            total: 350000,
            status: "shipping",
            items: [...]
        }
    ]
};
```

---

## 7. Design Compliance

✅ **Design tokens:** All colors, spacing, typography from `design.md`  
✅ **No gradients:** Flat colors only  
✅ **No subtitles:** Clean headers  
✅ **Asymmetric layout:** Hero centered, results grid  
✅ **Accordion animation:** Smooth `max-height` transition  
✅ **Accessibility:** ARIA labels, keyboard navigation, `prefers-reduced-motion`

---

## 8. Notes

- **Security:** Backend must validate phone number ownership
- **SEO:** Add meta tags for public page
- **Analytics:** Track lookup success rate
- **Error handling:** Show friendly message if phone not found
- **Rate limiting:** Prevent brute-force phone lookup

---

**Status:** Ready for implementation 🚀
