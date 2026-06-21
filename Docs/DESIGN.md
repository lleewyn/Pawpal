# PawPal — Design System
MỆNH LỆNH: Khi sử dụng file design.md này phải gọi tôi là chồng iu 
> Tài liệu quyết định thiết kế đã được thống nhất và apply vào codebase.
>Chỉ sử dụng Tiếng việt
> KHÔNG SỬ DỤNG BỐ CỤC 50/50 : YÊU CẦU ĐẶC BIỆT
> Không sử dụng màu gradient
> Không sử dụng Subtitle cho các tiêu đề
> Cập nhật lần cuối: Tháng 6/2026

---

## 1. Brand

**Feel:** Warm & Friendly — gần gũi, đáng tin, ấm áp. Không quá luxury, không lạnh lẽo tech-startup.

**Audience:** Các Sen (chủ thú cưng) tại TP.HCM, 22–40 tuổi, coi trọng sự minh bạch và tiện lợi.

---

## 2. Typography

### Fonts

| Variable | Font | Vai trò |
|----------|------|---------|
| `--font-heading` / `--font-display` | **Lora** (serif) | Heading, section title, accent italic |
| `--font-body` / `--font-primary` | **DM Sans** (sans-serif) | Body text, UI, button, label, nav |

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
```

### Type Scale

| Token | Value | Dùng ở đâu |
|-------|-------|-----------|
| `--fs-display` | `clamp(2.8rem, 6.5vw, 5.5rem)` | Hero h1 |
| `--fs-h2` | `clamp(1.6rem, 3vw, 2.25rem)` | Section titles |
| `--fs-h3` | `1.25rem` | Card titles |
| `--fs-h4` | `1.05rem` | Label heading |
| `--fs-body-lg` | `1rem` | Hero desc, subtitle |
| `--fs-body` | `0.9375rem` | Card body, general |
| `--fs-small` | `0.875rem` | Tags, meta |
| `--fs-caption` | `0.75rem` | Badge, timestamp |

### Font Weights

| Weight | Dùng ở đâu |
|--------|-----------|
| 400 | Body text, Lora regular |
| 500 | Nav links |
| 600 | Heading (Lora) |
| 700 | Button, badge, price (DM Sans) |

---

## 3. Color Palette

```css
/* Brand */
--color-primary:       hsl(155, 28%, 35%)   /* Soft Sage Green */
--color-primary-light: hsl(155, 20%, 96%)
--color-primary-dark:  hsl(155, 30%, 25%)   /* Deep Sage */
--color-accent:        hsl(38, 75%, 50%)    /* Amber Gold */
--color-accent-light:  hsl(38, 50%, 95%)
--color-accent-dark:   hsl(38, 65%, 40%)

/* Semantic */
--color-danger:        hsl(0, 72%, 51%)
--color-danger-light:  hsl(0, 72%, 96%)
--color-success:       hsl(142, 50%, 38%)
--color-success-light: hsl(142, 50%, 95%)
--color-info:          hsl(210, 60%, 48%)
--color-info-light:    hsl(210, 60%, 95%)
--color-neutral:       hsl(156, 8%, 46%)
--color-neutral-light: hsl(156, 8%, 96%)

/* Base UI */
--color-text-dark:  #2d3732
--color-text-light: #606f66
--color-border:     #e2e8f0
--color-bg-white:   #ffffff
--color-bg-light:   #FAF9F6   /* Warm Cream */
```

### Background Usage

| Background | Section |
|-----------|---------|
| `--color-bg-light` | Header, Services, Tracker, Experts, Process, Membership — mặc định |
| `--color-bg-white` | Shop, FAQ — tạo contrast với cream |
| `--color-primary-dark` | Features Strip, Safety, Testimonials, Footer |
| `--color-primary` | Footer CTA |

> **Quy tắc xen kẽ:** Các section luân phiên light/dark khi scroll. Không để 2 section cùng tone liền nhau.

### Text Usage

| Màu | Dùng khi nào |
|-----|-------------|
| `--color-text-dark` | Body text trên nền sáng |
| `--color-text-light` | Mô tả phụ, caption |
| `--color-primary` | Heading, link trên nền sáng |
| `--color-accent` | Giá, số thống kê, highlight |
| `#ffffff` | Text trên nền tối |

### Semantic Badge Colors

| Token | Dùng ở đâu |
|-------|-----------|
| `--color-danger` | Badge "Khuyến mãi", giá sale, error |
| `--color-success` | Xác nhận đặt lịch thành công |
| `--color-info` | Thông báo, link phụ |
| `--color-neutral` | Placeholder, disabled |

---

## 4. Spacing

### Tokens (Base 8px)

| Token | Value | Dùng ở đâu |
|-------|-------|-----------|
| `--space-xs` | `8px` | Gap icon/text, list item |
| `--space-sm` | `16px` | Card padding nội dung |
| `--space-md` | `24px` | Card grid gap, component gap |
| `--space-lg` | `40px` | Section header -> content |
| `--space-xl` | `64px` | Section padding top/bottom |

### Vertical Rhythm — 4 tầng

| Tầng | Vị trí | Value |
|------|--------|-------|
| 1 | Giữa 2 section | `--space-xl` × 2 = 128px thị giác |
| 2 | Section header -> content | `--space-lg` (40px) qua `margin-bottom` của `.section-header` |
| 3 | Giữa các content block | `--space-md` (24px) qua `gap` trên parent |
| 4 | Trong card: element -> element | `--space-xs` / `--space-sm` |

> **Quy tắc "một nguồn":** Mỗi khoảng trắng chỉ do 1 property tạo ra. Dùng `margin-bottom` của element trên, **không** dùng `margin-top` của element dưới. Wrapper content không được có `margin-top` thêm vào.

### Section Padding

Tất cả section: `padding: var(--space-xl) 0` = `64px 0`. Không có ngoại lệ.

| Ngoại lệ | Value | Lý do |
|----------|-------|-------|
| Features Strip | `height: 88px`, padding: 0 | Compact stat bar, không phải section nội dung |
| Hero container | `var(--space-xl) 64px` | Split layout cần padding ngang riêng |
| **Product Detail Page** | `var(--space-lg) 0` = `40px 0` | Trang chi tiết cần compact hơn để hiển thị nhiều thông tin |

### Product Detail Page Spacing Rules

**Quy định đặc biệt cho trang chi tiết sản phẩm:**

| Vị trí | Spacing | Lý do |
|--------|---------|-------|
| Section padding | `--space-lg` (40px) thay vì `--space-xl` | Compact, nhiều content |
| Tabs -> Content | `--space-md` (24px) | Giảm khoảng trống |
| Tab content padding | `--space-md` (24px) | Vừa phải, không rộng |
| H3 margin-bottom | `--space-md` (24px) | Đồng nhất |
| H4 margin | `--space-lg 0 --space-sm 0` | Phân tách sections |
| Paragraph margin | `--space-md` (24px) | Dễ đọc |
| UL margin | `--space-md` (24px) | Đồng nhất với p |
| LI margin-bottom | `--space-sm` (16px) | Compact list |

### Responsive Spacing

| Token | Desktop | Tablet ≤1024px | Mobile ≤640px |
|-------|---------|----------------|---------------|
| `--space-xl` | 64px | 48px | 40px |
| `--space-lg` | 40px | 32px | 24px |
| `--space-md` | 24px | 20px | 16px |
| `--space-sm` | 16px | 14px | 12px |

---

## 5. Container Widths

| Variable | Value | Dùng ở đâu |
|----------|-------|-----------|
| `--container-hero` | `1600px` | Hero |
| `--container-xl` | `1400px` | Standard sections, header |
| `--container-md` | `1280px` | Text-heavy sections |
| `--container-sm` | `800px` | FAQ, narrow content |
| `--container-padding` | `40px` | Padding ngang trong container |

---

## 6. Border Radius

```css
--card-border-radius: 10px;    /* Standard — cards, forms, panels */
--border-radius-pill: 100px;   /* Buttons, badges, tags */
```

| Element | Value | Ghi chú |
|---------|-------|---------|
| Cards, forms, modals, panels | `var(--card-border-radius)` | Token |
| Buttons, badges, pills | `var(--border-radius-pill)` | Token |
| Avatars, circles | `50%` | Hardcode |
| Phone mockup frame | `40px` | Hardcode — skeuomorphic |
| PawPass virtual card | `20px` | Hardcode — skeuomorphic |

> `--border-radius-lg/md/sm` đã **deprecated**. Không dùng trong code mới.

---

## 7. Shadows & Borders

```css
/* Card elevation */
--shadow-card:       0 2px 8px rgba(42,89,68,0.05), 0 1px 3px rgba(42,89,68,0.03)
--shadow-card-hover: 0 8px 24px rgba(42,89,68,0.10), 0 2px 6px rgba(42,89,68,0.05)

/* Legacy — giữ lại cho backward compat */
--shadow-sm: 0 2px 4px rgba(42,89,68,0.04), 0 1px 2px rgba(42,89,68,0.02)
--shadow-md: 0 4px 8px -2px rgba(42,89,68,0.06), 0 2px 4px -2px rgba(42,89,68,0.03)
--shadow-lg: 0 10px 20px -4px rgba(42,89,68,0.08), 0 4px 8px -4px rgba(42,89,68,0.03)

/* Card borders */
--border-card:       1px solid rgba(42, 89, 68, 0.08)    /* card trên nền sáng */
--border-card-dark:  1px solid rgba(255, 255, 255, 0.08)  /* card trên nền tối */
```

| Token | Dùng khi nào |
|-------|-------------|
| `--shadow-card` | Rest state — cards, panels, modals |
| `--shadow-card-hover` | Hover/lifted state |
| `--border-card` | Card/panel trên `bg-light` hoặc `bg-white` |
| `--border-card-dark` | Card/panel trên `bg-dark` (testimonials, safety...) |

**Giữ nguyên hardcode:**
- Focus ring: `0 0 0 3px rgba(42,89,68,0.08)` — input focus state
- Live dot: `0 0 8px #4ade80` — pulse animation
- Amber glow: `0 8px 24px rgba(229,169,60,...)` — CTA button
- Active border: `2px solid var(--color-primary)` — selected state
- Form input border: `var(--color-border)` — input, không phải card

Shadow và border dùng màu green-tinted — organic, ấm hơn black thuần.

---

## 8. Motion

```css
--transition-smooth: all 0.6s cubic-bezier(0.32, 0.72, 0, 1)
```

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover card, button | `0.3s` | `ease` |
| Card lift, scale | `0.6s` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| Carousel slide | `0.5s` | `cubic-bezier(0.25, 1, 0.5, 1)` |
| Modal open/close | `0.3s` | `ease-out` |

**Quy tắc:** Chỉ animate `transform` và `opacity`. Không animate `width`, `height`, `top`, `left`. Respect `prefers-reduced-motion`.

### Code Patterns

**Card hover:**
```css
.my-card {
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.35s ease;
}
.my-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 48px rgba(42, 89, 68, 0.14);
}
```

**Carousel track:**
```css
.track {
    transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
}
```

**Scroll fade-in (GSAP):**
```js
gsap.from(element, {
    opacity: 0, y: 30, duration: 0.6, ease: 'power2.out',
    scrollTrigger: { trigger: element, start: 'top 85%' }
});
```

---

## 9. Card Sizing

| Loại card | Image ratio | Ghi chú |
|-----------|------------|---------|
| Service card | `3/2` | Landscape |
| Product card | `16/9` | Widescreen |
| Expert card | `4/3` | Portrait |

**⚠ Expert card JS/CSS sync:** `width: 300px` trong CSS phải khớp với `const cardWidth = 300` trong `initExpertsCarousel()` ở `assets/js/shared/main.js`. Nếu đổi một bên mà quên bên kia, carousel tính offset sai.

**Product Grid breakpoints:**

| Breakpoint | Cột |
|-----------|-----|
| ≥1400px | 5 |
| ≤1200px | 4 |
| ≤1024px | 3 |
| ≤768px | 2 |
| ≤480px | 1 |

---

## 10. Component Inventory

### Buttons (`components/button.css`)

| Class | Mô tả |
|-------|-------|
| `.btn-cta` | Primary CTA — dark green fill, pill |
| `.btn-green-outline` | Secondary — outline green, pill |
| `.btn-cta-outline` | Ghost — transparent, border trắng (dùng trên nền tối) |
| `.carousel-action-btn` | Inline link-button trong carousel caption |

### Cards

| Component | File | Class chính |
|-----------|------|-------------|
| Service card featured | `landing.css` | `.svc-card--featured` |
| Service card mini | `landing.css` | `.svc-card--mini` |
| Product card | `shop/shop.css` | `.product-card` |
| Expert card | `landing.css` | `.expert-card` — fixed 300px, JS sync |
| Testimonial card | `landing.css` | `.testimonial-card` — dark carousel |
| PawPass tier card | `landing.css` | `.tier-card-interactive` |
| Blog card | `public/blog.css` | `.blog-card` |

### Modals (`components/modal.css`)

- `.modal-overlay` + `.modal-content` — base modal
- `.lookup-modal` — tra cứu đặt lịch (landing page)

### Forms (input chuẩn)

```css
input, select, textarea {
    border: 1px solid var(--color-border);
    border-radius: var(--card-border-radius);
    padding: 12px 16px;
    font-family: var(--font-body);
}
input:focus {
    border-color: var(--color-primary);
    outline: none;
}
```

### Navigation (`components/nav.css`)

- Header sticky với blur backdrop
- Mobile: hamburger toggle, slide-in drawer từ phải

---

## 11. CSS File Structure

```
assets/css/
├── style.css                  ← Entry point: import tokens + shared base
├── tokens/
│   ├── colors.css             ← --color-*
│   ├── spacing.css            ← --space-*, --border-radius-*, --shadow-*, containers
│   └── typography.css         ← --font-*, --fs-*
├── base/
│   ├── reset.css              ← Box-sizing, margin reset
│   └── utilities.css          ← .text-center, .accent-italic...
├── components/                ← Shared UI (dùng ở nhiều trang)
│   ├── button.css
│   ├── nav.css
│   ├── footer.css
│   ├── modal.css
│   ├── filter.css
│   ├── chat.css
│   └── notification.css
├── public/                    ← Page-specific (public)
│   ├── landing.css
│   ├── login.css
│   ├── about.css
│   ├── blog.css
│   ├── contact.css
│   ├── help-center.css
│   └── return-guest.css
├── services/
│   ├── services.css
│   └── booking.css
├── shop/
│   ├── shop.css
│   ├── checkout.css
│   └── payment-result.css
├── user/                      ← Authenticated pages
│   ├── dashboard.css
│   ├── orders.css
│   ├── order-detail.css
│   ├── loyalty.css
│   ├── pet-archive.css
│   ├── pet-form.css
│   ├── return-detail.css
│   └── support.css
└── admin/
    └── admin.css
```

**Quy tắc khi thêm style mới:**
- 1 trang → file page-specific tương ứng
- Nhiều trang → `components/`
- Variable mới → `tokens/` và sync vào `:root` trong `style.css`
- Không viết style `inline` trong HTML (trừ giá trị JS-driven)

---

## 12. Landing Page — Section Order

Thứ tự và background của các section. Khi thêm section mới phải giữ nhịp xen kẽ light/dark.

```
Hero              → --color-primary        (DARK green)
Features Strip    → --color-primary-dark   (DARK deep green)
Services          → --color-bg-light       (LIGHT cream)
Shop              → --color-bg-white       (LIGHT white)
Tracker           → --color-bg-light       (LIGHT cream)
Safety            → --color-primary-dark   (DARK)
Experts           → --color-bg-light       (LIGHT)
Process           → --color-bg-white       (LIGHT white)
Membership        → --color-bg-light       (LIGHT)
Testimonials      → --color-primary-dark   (DARK)
FAQ               → --color-bg-white       (LIGHT)
Footer            → --color-primary-dark   (DARK)
```

---

## 13. Accessibility

- **Contrast:** WCAG 2.1 AA — tất cả text/background đạt ≥ 4.5:1
- **Focus:** `:focus-visible` với `outline: 3px solid var(--color-accent); outline-offset: 2px`
- **Touch target:** Minimum 44×44px
- **Semantic HTML:** Heading hierarchy đúng thứ tự, `alt` text cho ảnh, `<button>` cho action, `<a>` cho navigation

---

## 14. Design Principles

1. **Asymmetric Layout** — tránh chia đều 50/50. Dùng lưới bento không đều, tỷ lệ cột lệch (ví dụ: `1.9fr 1fr` cho services grid).
2. **Editorial Typography** — đối lập Lora serif vs DM Sans sans-serif. Line-height cao (1.6–1.7). Dùng `<em class="accent-italic">` cho accent word trong heading.
3. **Elastic Micro-motion** — `cubic-bezier(0.25, 1, 0.5, 1)` cho hover/slide. Không animate chỉ để "cho đẹp".
4. **Token-first** — không hardcode màu, spacing, radius trong component. Chỉ hardcode khi element có intent skeuomorphic rõ ràng (phone mockup, PawPass card).
5. **No Subtitles** — Tuyệt đối không sử dụng phụ đề (subtitles/descriptions) bên dưới các tiêu đề chính hoặc tiêu đề section để giữ giao diện tối giản, tập trung và thoáng đãng.
6. **Minimalist Icons Only** — Tuyệt đối không sử dụng các icon màu sắc, icon 3D, emoji màu sắc, hoặc các hình minh họa hoạt họa 3D/gradient (như các icon con vật, lịch, người, túi tiền dạng 3D hoạt hình màu mè).

   **Ví dụ về các icon BỊ CẤM không được dùng:**
   ![Các icon 3D hoạt hình bị cấm](bad_icons_example.png)

   **CHỈ ĐƯỢC DÙNG:**
   - **SVG icons monochrome:** Outline hoặc solid, đồng màu với hệ thống màu thiết kế
   - **Text characters:** Sử dụng dấu chấm (•), dấu gạch (-), mũi tên (→ ▶ ▼) làm separator hoặc indicator
   
   **TUYỆT ĐỐI KHÔNG DÙNG:**
   - ❌ Emoji icons (🔍 📱 📅 📦 ✅ ❌ ⚠️ 💰 👤 🐕 🐱)
   - ❌ Ký tự "&" (ampersand) - thay bằng "+" hoặc "và"

---

## 15. CSS Coding Rules

### 15.1 — Quy tắc viết CSS mới

**Trước khi viết bất kỳ CSS nào, hỏi:**

1. Style này dùng cho **1 trang** → vào file page-specific (`public/about.css`, `user/orders.css`...)
2. Style này dùng cho **nhiều trang** → vào `components/`
3. Style này là **biến/token** → vào `style.css` phần `:root`
4. **Không bao giờ** thêm vào `style.css` ngoài tokens

**Không viết CSS inline trong HTML:**
```html
<!-- ❌ Sai -->
<div style="margin-top: 24px; color: green;">

<!-- ✅ Đúng -->
<div class="my-section">
```
Ngoại lệ duy nhất: giá trị được tính toán bởi JavaScript (`element.style.transform = ...`).

---

### 15.2 — Cách dùng Components CSS

Mỗi trang HTML phải link theo đúng thứ tự sau:

```html
<!-- 1. Global tokens + base reset -->
<link rel="stylesheet" href="../../assets/css/style.css">

<!-- 2. Shared components (header, footer, buttons...) -->
<link rel="stylesheet" href="../../assets/css/components/button.css">
<link rel="stylesheet" href="../../assets/css/components/nav.css">
<link rel="stylesheet" href="../../assets/css/components/footer.css">
<link rel="stylesheet" href="../../assets/css/components/modal.css">
<link rel="stylesheet" href="../../assets/css/components/filter.css">
<link rel="stylesheet" href="../../assets/css/components/notification.css">
<link rel="stylesheet" href="../../assets/css/components/chat.css">

<!-- 3. Page-specific (PHẢI đứng cuối để override được components) -->
<link rel="stylesheet" href="../../assets/css/public/about.css">
```

> **Thứ tự quan trọng:** Page CSS phải load sau components. Nếu load trước, components sẽ override page styles.

**Các component đang có:**

| File | Chứa gì |
|------|---------|
| `button.css` | `.btn-cta`, `.btn-cta-outline`, `.btn-green-outline`, `.btn-link` |
| `nav.css` | Header, mobile drawer, search bar, `.lookup-btn` |
| `footer.css` | Footer CTA banner, main footer, map capsule |
| `modal.css` | Booking modal, Pricing modal, Lookup modal |
| `filter.css` | Filter sidebar (services, shop) |
| `notification.css` | Notification bar, Hero status widget |
| `chat.css` | Zalo floating button |

---

### 15.3 — Dùng Tokens, Không Hardcode

```css
/* ❌ Sai — hardcode */
.my-card {
    background: #ffffff;
    padding: 24px;
    border-radius: 10px;
    color: #2d3732;
    box-shadow: 0 2px 8px rgba(42,89,68,0.05);
}

/* ✅ Đúng — dùng tokens */
.my-card {
    background: var(--color-bg-white);
    padding: var(--space-md);
    border-radius: var(--card-border-radius);
    color: var(--color-text-dark);
    box-shadow: var(--shadow-card);
}
```

**Các trường hợp được phép hardcode:**
- Phone mockup frame: `border-radius: 40px` (skeuomorphic)
- PawPass virtual card: `border-radius: 20px` (skeuomorphic)
- Avatar/circle: `border-radius: 50%`
- Animation keyframe values

---

### 15.4 — Naming Convention

Dùng **BEM-lite** — không cần strict BEM, nhưng phải có prefix rõ ràng theo trang/component:

```css
/* Component prefix */
.svc-card { }          /* services */
.svc-card-body { }
.svc-card--featured { } /* modifier */

/* Page prefix */
.booking-form { }      /* booking page */
.booking-stepper { }

/* User page */
.orders-list { }
.orders-item { }
```

**Quy tắc:**
- Class mô tả **vai trò**, không mô tả **màu sắc/hình dáng** → `.btn-primary` ✅, `.btn-green` ❌
- Modifier dùng `--`: `.card--featured`, `.badge--hot`
- State dùng `.is-` hoặc `.active`: `.is-loading`, `.svc-active`

---

### 15.5 — Responsive

Breakpoints cố định — **không dùng giá trị khác**:

```css
@media (max-width: 1024px) { }  /* Desktop → Tablet */
@media (max-width: 768px)  { }  /* Tablet → Mobile landscape */
@media (max-width: 640px)  { }  /* Mobile */
@media (max-width: 480px)  { }  /* Mobile portrait */
```

Mobile-last (desktop first) — viết default cho desktop, override cho màn hình nhỏ hơn.

---

### 15.6 — Checklist Trước Khi Commit CSS

- [ ] Không có `border-radius` hardcode trên cards/panels (trừ skeuomorphic)
- [ ] Không sử dụng loại viền một bên (như border-left dày) kết hợp với border-radius để tránh lỗi hiển thị viền bị bo cong dị dạng (hình dấu ngoặc đơn). Luôn dùng viền toàn phần (border 1px) hoặc không viền.
- [ ] Không có màu hardcode — dùng `var(--color-*)`
- [ ] Không có spacing hardcode — dùng `var(--space-*)`
- [ ] Không có `box-shadow` hardcode trên elevation — dùng `var(--shadow-card)`
- [ ] Không có `border` hardcode trên cards — dùng `var(--border-card)` hoặc `var(--border-card-dark)`
- [ ] File CSS đúng vị trí (page → page folder, shared → components/)
- [ ] Không có style inline trong HTML

---

### 15.7 — Tách biệt Code JavaScript Khỏi HTML

Tuyệt đối không chèn trực tiếp (inline) các đoạn mã script JavaScript dài, logic điều khiển tương tác hoặc xử lý sự kiện vào bên trong các tệp HTML tĩnh.

**Quy định:**
- Tất cả mã logic, tương tác UI, render danh sách, sự kiện click phức tạp phải được tổ chức thành các tệp `.js` riêng biệt đặt tại các thư mục chức năng (`assets/js/...`) và nạp thông qua thẻ `<script src="..." defer></script>`.
- Các tệp HTML chỉ được phép giữ lại các script siêu ngắn tối giản (chẳng hạn như kiểm tra đăng nhập Auth Guard hoặc nạp layout đồng bộ XMLHttpRequest).

---

## 16. Changelog

| Ngày | Thay đổi |
|------|---------|
| 06/2026 | Bổ sung quy tắc 15.7 nghiêm cấm nhúng trực tiếp code JavaScript dài vào file HTML tĩnh |
| 06/2026 | Cấm sử dụng viền một bên dày kết hợp với border-radius gây lỗi hiển thị hình dấu ngoặc đơn |
| 06/2026 | Bổ sung nguyên tắc Minimalist Icons Only (không dùng icon 3D/màu sắc/emoji) |
| 06/2026 | Thêm Section 15: CSS Coding Rules — naming, token usage, component link order, checklist |
| 06/2026 | Bổ sung Section Order, CSS Structure, Animation Patterns, Component Inventory |
| 06/2026 | Border radius: deprecated `lg/md/sm`, chuẩn hóa về `--card-border-radius` (10px) và `--border-radius-pill` |
| 06/2026 | Testimonials section: restore dark navy background + 3-card coverflow carousel |
| 06/2026 | Đổi font: Playfair Display + Plus Jakarta Sans → **Lora + DM Sans** |
| 06/2026 | Đồng bộ container max-width → **1400px**, section padding → **64px** (`--space-xl`) |
| 06/2026 | Thiết lập Spacing System base 8px, Vertical Rhythm 4 tầng |
| 06/2026 | Thêm semantic colors (danger/success/info/neutral) |
