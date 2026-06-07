# PawPal — Design System Documentation

> Tài liệu này ghi lại toàn bộ các quyết định thiết kế đã được thống nhất và apply vào codebase.
> Cập nhật lần cuối: Tháng 6/2026

---

## 1. Brand Direction

**Feel:** Warm & Friendly — gần gũi, đáng tin, ấm áp như một người bạn chăm sóc thú cưng. Không quá luxury, không lạnh lẽo tech-startup.

**Audience:** Các Sen (chủ thú cưng) tại Hà Nội, 22–40 tuổi, yêu thú cưng và coi trọng sự minh bạch, tiện lợi.

---

## 2. Typography

### 2.1 Font Families

| Variable | Font | Fallback | Vai trò |
|----------|------|----------|---------|
| `--font-heading` | **Lora** | Georgia, serif | Heading, section title, accent italic, display |
| `--font-body` | **DM Sans** | system-ui, sans-serif | Body text, UI, button, label, nav |

**Lý do chọn:**
- **Lora** — serif có nguồn gốc calligraphy, warm hơn Playfair Display, được tối ưu cho screen. Italic đẹp, phù hợp accent word (`bằng cả`, `mua sắm`).
- **DM Sans** — geometric sans-serif với optical size axis (`opsz`), tự điều chỉnh letterform theo size. Thân thiện hơn Plus Jakarta Sans, không có "tech startup" feel.

**Google Fonts Import:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
```

**Legacy aliases (backward compat):**
- `--font-primary` → alias của `--font-body`
- `--font-display` → alias của `--font-heading`

### 2.2 Type Scale — Modular 1.250 (Major Third)

| Token | Value | Line-height | Letter-spacing | Dùng ở đâu |
|-------|-------|-------------|----------------|-----------|
| `--fs-display` | `clamp(2.8rem, 6.5vw, 5.5rem)` | 1.05 | -0.03em | Hero h1 |
| `--fs-h2` | `clamp(1.6rem, 3vw, 2.25rem)` | 1.15 | -0.02em | Section titles |
| `--fs-h3` | `1.25rem` | 1.3 | -0.01em | Card titles, sub-heading |
| `--fs-h4` | `1.05rem` | 1.35 | 0 | Label heading |
| `--fs-body-lg` | `1rem` | 1.7 | 0 | Hero desc, section subtitle |
| `--fs-body` | `0.9375rem` | 1.65 | 0 | Card body text, general |
| `--fs-small` | `0.875rem` | 1.5 | 0.01em | Tags, meta info |
| `--fs-caption` | `0.75rem` | 1.4 | 0.03em | Badge label, timestamp |

**Legacy token mapping:**
| Token cũ | Map sang |
|----------|---------|
| `--fs-hero-title` | `--fs-display` |
| `--fs-section-title` | `--fs-h2` |
| `--fs-sub-title` | `--fs-h3` |
| `--fs-body-semibold` | `--fs-body` |
| `--fs-body-medium` | `--fs-body-lg` |
| `--fs-desc-hero` | `--fs-body-lg` |

### 2.3 Font Weight Usage

| Weight | Dùng ở đâu |
|--------|-----------|
| 400 | Body text, quotes, Lora regular |
| 500 | Nav links, subtle emphasis |
| 600 | Heading (Lora), card title |
| 700 | Button, badge, price, strong emphasis (DM Sans) |

---

## 3. Color Palette

```css
/* Brand Core */
--color-primary:       hsl(155, 28%, 35%)   /* Soft Sage Green */
--color-primary-light: hsl(155, 20%, 96%)
--color-primary-dark:  hsl(155, 30%, 25%)   /* Deep Sage Green */
--color-accent:        hsl(38, 75%, 50%)    /* Amber Gold #E09F1F */
--color-accent-light:  hsl(38, 50%, 95%)
--color-accent-dark:   hsl(38, 65%, 40%)    /* Deep Amber Gold #9E6B17 */

/* Semantic */
--color-danger:        hsl(0, 72%, 51%)     /* #DC2626 — badge KM, error */
--color-danger-light:  hsl(0, 72%, 96%)
--color-info:          hsl(210, 60%, 48%)   /* Blue — thông báo */
--color-info-light:    hsl(210, 60%, 95%)
--color-success:       hsl(142, 50%, 38%)   /* Green nhạt — success state */
--color-success-light: hsl(142, 50%, 95%)
--color-neutral:       hsl(156, 8%, 46%)    /* Warm gray */
--color-neutral-light: hsl(156, 8%, 96%)
--color-neutral-dark:  hsl(156, 8%, 25%)

/* Base UI */
--color-text-dark:  #2d3732
--color-text-light: #606f66
--color-border:     #e2e8f0
--color-bg-white:   #ffffff
--color-bg-light:   #FAF9F6   /* Warm Cream */
```

### Thay đổi so với palette cũ

| Token | Cũ | Mới | Lý do |
|-------|----|-----|-------|
| `--color-primary` | `hsl(156,36%,26%)` | `hsl(156,38%,28%)` | Sáng nhẹ, dễ đọc hơn trên cream |
| `--color-primary-dark` | `hsl(156,36%,16%)` | `hsl(156,40%,12%)` | Tối hơn, contrast rõ với primary |
| `--color-primary-light` | `hsl(156,36%,95%)` | `hsl(156,30%,94%)` | Giảm saturation, bớt cartoon |
| `--color-accent` | `hsl(38,77%,57%)` | `hsl(36,65%,52%)` | Giảm saturation 77→65%, ấm hơn, bớt chói |
| `--color-accent-dark` | `hsl(38,77%,45%)` | `hsl(36,68%,40%)` | Contrast tốt hơn trên nền trắng |
| `--color-accent-light` | `hsl(38,77%,95%)` | `hsl(36,50%,95%)` | Nhẹ hơn cho badge background |
| Thêm mới | — | `--color-danger/info/success/neutral` | Semantic colors cho badge, state UI |

### 3.1 Color Usage Rules

**Background — khi nào dùng gì:**

| Màu nền | Dùng ở section nào | Ghi chú |
|---------|--------------------|---------|
| `--color-bg-light` (#FAF9F6) | Header, Services, Safety, Process, Testimonials | Warm cream — màu nền mặc định |
| `--color-bg-white` (#ffffff) | Shop, FAQ, Pet ID | Trắng thuần — tạo contrast với cream |
| `--color-primary` | Footer CTA | Green đậm — section call-to-action |
| `--color-primary-dark` | Features Strip, Footer | Đậm nhất — tạo nhịp dark/light |

> **Quy tắc xen kẽ:** Các section nên luân phiên background để tạo visual rhythm khi scroll. Không để 2 section `bg-white` liền nhau hoặc 2 section dark liền nhau.

**Text — khi nào dùng gì:**

| Màu chữ | Dùng khi nào |
|---------|-------------|
| `--color-text-dark` | Body text trên nền sáng |
| `--color-text-light` | Mô tả phụ, caption, meta info |
| `--color-primary` | Heading trên nền sáng, link |
| `--color-accent` | Số thống kê, giá, highlight quan trọng |
| `#ffffff` | Tất cả text trên nền tối |

**Semantic colors — badge và UI states:**

| Token | Dùng ở đâu |
|-------|-----------|
| `--color-danger` | Badge "Khuyến mãi", giá sale, error message |
| `--color-danger-light` | Background error, toast lỗi |
| `--color-success` | Badge xác nhận, trạng thái đặt lịch thành công |
| `--color-success-light` | Background success notification |
| `--color-info` | Badge thông báo, link phụ |
| `--color-neutral` | Text phụ, divider, placeholder |
| `--color-neutral-light` | Background section phụ, disabled state |

**Badge mapping đã áp dụng:**
| Badge | Trước (hardcode) | Sau (variable) |
|-------|-----------------|----------------|
| "Bán chạy" | `rgba(229,169,60,0.88)` | `var(--color-accent)` |
| "Khuyến mãi" | `rgba(239,68,68,0.85)` | `var(--color-danger)` |
| "Hàng mới" | `rgba(42,89,68,0.88)` | `var(--color-primary)` |
| Price current | `#ef4444` | `var(--color-danger)` |

---

## 4. Spacing System

### 4.1 Base Unit: 8px — 4 cấp rõ ràng

Toàn bộ spacing dùng bội số của 8px, chia thành 4 cấp theo vai trò:

| Token | Value | Cấp | Dùng ở đâu |
|-------|-------|-----|-----------|
| `--space-xs` | `8px` | Cấp 4 — trong component | Gap icon/text, H3→body, list item gap |
| `--space-sm` | `16px` | Cấp 4 — trong component | Card padding, body→price/action |
| `--space-md` | `24px` | Cấp 3 — giữa components | Card grid gap, component→component trong section |
| `--space-lg` | `40px` | Cấp 2 — tiêu đề → nội dung | Section header→content, container padding ngang |
| `--space-xl` | `64px` | Cấp 1 — section padding | Section padding top/bottom tất cả section |

### 4.2 Vertical Rhythm — Kế hoạch chiều dọc đầy đủ

#### Nguyên tắc cốt lõi
> **Một nguồn khoảng cách duy nhất.** Mỗi khoảng trắng giữa 2 thành phần chỉ được tạo bởi 1 property CSS duy nhất — không để 2 margin/padding cộng dồn vô tình.

---

#### Tầng 1 — Giữa các section (ngoài section)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← section trên kết thúc
          64px  (--space-xl, padding-bottom của section trên)
          64px  (--space-xl, padding-top của section dưới)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← section dưới bắt đầu
```

**Quy tắc:** Khoảng giữa 2 section = tổng padding-bottom + padding-top = 128px thị giác. Đây là intentional — tạo ranh giới rõ giữa các chủ đề.

---

#### Tầng 2 — Trong section: header → content

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ← section bắt đầu (padding-top: 64px)
  [eyebrow / badge]           ↕ --space-xs (8px)
  [H2 tiêu đề]                ↕ 12px → subtitle
  [Subtitle]
                              ↕ --space-lg (40px) ← section-header margin-bottom DUY NHẤT
  [Content đầu tiên / Cards]
```

**Quy tắc quan trọng:** `section-header margin-bottom` là **nguồn khoảng cách duy nhất** giữa header và content. Content wrapper (card grid, carousel...) **không được có** `margin-top` thêm vào — sẽ gây cộng dồn.

**Vấn đề đã phát hiện:** `.services-arched-wrapper` có `margin-top: var(--space-md)` cộng thêm vào `section-header margin-bottom: 40px` → tổng = 64px, trông như khoảng cách giữa 2 section khác nhau. **Cần fix:** bỏ `margin-top` trên wrapper.

---

#### Tầng 3 — Trong section: giữa các content block

```
  [Content block 1]           ↕ --space-md (24px)
  [Content block 2]           ↕ --space-md (24px)
  [Nav / Action button]
```

Ví dụ Services section:
```
  [Hàng card 1 (track-top)]   ↕ --space-xs (8px) ← padding bottom track-top
  [Hàng card 2 (track-bottom)] ↕ --space-md (24px)
  [Carousel nav arrows]        ↕ --space-md (24px)
  [Nút "Xem bảng giá"]
```

---

#### Tầng 4 — Trong một card/component

```
  ┌─────────────────────────┐
  │  padding: 16px (--space-sm) tất cả 4 phía
  │  [Image]
  │           ↕ 0 (border-radius xử lý)
  │  [H3 tên]               ↕ --space-xs (8px)
  │  [Body text]            ↕ --space-sm (16px)
  │  [Price / CTA]
  └─────────────────────────┘
```

---

#### Tóm tắt 4 tầng — bảng nhanh

| Tầng | Vị trí | Value | Token | Nguồn duy nhất |
|------|--------|-------|-------|----------------|
| 1 | Giữa 2 section | 64px × 2 = 128px thị giác | `--space-xl` | padding section |
| 2 | Header block → content | 40px | `--space-lg` | `section-header margin-bottom` |
| 3 | Giữa content blocks | 24px | `--space-md` | `gap` hoặc `margin-bottom` của block trên |
| 4 | Trong card: H3→body | 8px | `--space-xs` | `margin-bottom` của H3 |
| 4 | Trong card: body→action | 16px | `--space-sm` | `margin-bottom` của body |

#### ⚠ Quy tắc "một nguồn" — checklist khi viết CSS

- ✅ Dùng `margin-bottom` của element trên, KHÔNG dùng `margin-top` của element dưới
- ✅ Wrapper/container content: `margin-top: 0` — để section-header tự quyết định khoảng cách
- ✅ Khoảng giữa 2 rows/blocks: dùng `gap` trên parent flex/grid
- ❌ Không để 2 margin cùng chiều cộng dồn (ví dụ: `margin-bottom: 40px` + `margin-top: 24px`)

### 4.3 Section Padding Rules

**Quy tắc duy nhất: tất cả section dùng `--space-xl` (64px) cả trên lẫn dưới.**

| Section | Padding | Ghi chú |
|---------|---------|---------|
| Tất cả section | `var(--space-xl) 0` = `64px 0` | Không có ngoại lệ |
| Features Strip | `height: 88px`, padding: 0 | Intentional compact bar, không phải section nội dung |
| Hero container | `var(--space-xl) 64px` | 64px top/bottom, 64px ngang cho split layout |
| Hero container tablet | `var(--space-xl) 32px` | Giảm padding ngang |
| Hero container mobile | `var(--space-xl) 20px` | Giảm padding ngang |
| Footer CTA banner | `var(--space-xl) var(--container-padding)` | Dùng token, đồng nhất |

> **Lý do chọn đồng nhất hoàn toàn:** Tránh người dùng cảm nhận sự "nhảy" khi scroll qua các section. Mắt người tự nhiên nhận ra nhịp đều — khi một section bỗng dưng to hơn hay nhỏ hơn mà không có lý do visual rõ ràng, nó tạo cảm giác lỗi thiết kế.

### 4.4 Section Header Rules

| Vị trí | Value | Token | Ghi chú |
|--------|-------|-------|---------|
| Section header max-width | `640px` | hardcode | |
| H2 → subtitle gap | `12px` | **hardcode, không có token** — intentionally nhỏ, không cần token riêng | Nếu muốn tokenize: thêm `--space-2xs: 12px` vào `:root` |
| Header block → content | `40px` | `--space-lg` | |
| Shop header → banner (exception) | `24px` | `--space-md` | Compact vì có banner ngay dưới |
| Membership header | `40px` | `--space-lg` | |

### 4.5 Component Spacing Rules

| Component | Property | Value | Token |
|-----------|----------|-------|-------|
| Card padding | `padding` | `16px` | `--space-sm` |
| Card grid gap | `gap` | `24px` | `--space-md` |
| Services card gap | `gap` | `24px` | `--space-md` |
| Services card wrapper padding top | `padding-top` | `0` | — | **Lý do top=0:** section-header `margin-bottom: 40px` đã là nguồn duy nhất cho khoảng cách này. Nếu thêm padding-top sẽ cộng dồn. |
| Services card wrapper padding bottom | `padding-bottom` | `8px` | `--space-xs` | **Lý do bottom≠0:** tạo shadow breathing room cho card hover effect — card scale lên sẽ không bị clipped bởi container. |
| Services: khoảng giữa 2 hàng track | top/bottom padding mỗi track | `8px` | `--space-xs` |
| H3 → body text | `margin-bottom` | `8px` | `--space-xs` |
| Body → price/action | `margin-bottom` | `16px` | `--space-sm` |
| List item gap | `gap` | `8px` | `--space-xs` |
| Component → component trong section | `margin-bottom` của block trên | `24px` | `--space-md` |
| Safety layout wrapper top | `margin-top` | `40px` | `--space-lg` |

### 4.6 Shop Section Internal Spacing

Shop có nhiều lớp nội dung xếp chồng — mỗi lớp cách nhau đồng nhất theo token:

```
Badge (label)
  ↓ 12px (hardcode nhỏ — OK)
H2 (Góc mua sắm)
  ↓ --space-sm (16px)
Feature strip (miễn phí vận chuyển...)
  ↓ --space-md (24px) ← shop-features-inline margin-bottom
Promo Banner
  ↓ --space-md (24px)
Tabs (Sản phẩm mới / Bán chạy / Khuyến mãi)
  ↓ --space-md (24px) ← tab-bar margin-bottom
Sub-filter (Thức ăn / Đồ dùng...)
  ↓ --space-md (24px) ← sub-filters margin-bottom
Product Grid
  ↓ --space-lg (40px)
Action button (Xem tất cả)
```

### 4.7 Vấn đề đã phát hiện & fix

| Vấn đề | Trước | Sau |
|--------|-------|-----|
| `services-section` padding | `40px/45px` lẻ tẻ | `64px` = `--space-xl` |
| `membership-section` padding | `32px` — quá nhỏ | `64px` = `--space-xl` |
| `pet-id-section` padding | `96px` | `64px` = `--space-xl` |
| `experts-section` padding | `96px` | `64px` = `--space-xl` |
| `safety-section` padding | `70px` — lẻ | `64px` = `--space-xl` |
| Services card wrapper padding | `30px / 50px` hardcode | `24px` = `--space-md` |
| Services track gap giữa 2 hàng | `10px / 5px` | `8px` = `--space-xs` (top/bottom của mỗi track) |
| Services card gap | `30px` | `24px` = `--space-md` |
| Services bottom track card size | `230px / scale(0.9)` — rời rạc | `290px / scale(0.96)` — đồng nhất với top track |
| Services `carousel-nav` margin-top | `20px` hardcode | `--space-md` |
| Services `services-action` margin-top | `50px` inline hardcode | `--space-md` |
| `safety-layout-wrapper` margin-top | `50px` | `40px` = `--space-lg` |
| `membership .section-header` margin | `20px` override | `40px` = `--space-lg` |
| Shop tabs → sub-filter gap | `40px` | `24px` = `--space-md` |
| Shop sub-filter → grid gap | `-15px / 40px` lẻ | `16px / 24px` = `--space-sm / --space-md` |
| Shop product grid margin-bottom | `45px` | `40px` = `--space-lg` |
| Shop promo banner margin-bottom | `24px` hardcode | `var(--space-md)` |
| Shop features-inline gap | `16px` hardcode | `var(--space-sm)` |

### 4.8 Responsive Spacing

Trên mobile, spacing scale down để tránh lãng phí không gian màn hình nhỏ.

| Token | Desktop | Tablet (≤1024px) | Mobile (≤640px) |
|-------|---------|-----------------|-----------------|
| `--space-xl` (section padding) | `64px` | `48px` | `40px` |
| `--space-lg` (header→content) | `40px` | `32px` | `24px` |
| `--space-md` (component gap) | `24px` | `20px` | `16px` |
| `--space-sm` (card padding) | `16px` | `14px` | `12px` |
| `--space-xs` (inline gap) | `8px` | `8px` | `8px` |

**Hero container** đã có responsive padding riêng (không dùng token vì padding ngang ≠ padding section):
- Desktop: `var(--space-xl) 64px`
- Tablet: `var(--space-xl) 32px`
- Mobile: `var(--space-xl) 20px`

### 4.9 Card Sizing Rules

#### Quy tắc chung & Chống AI Slop
- **Đồng bộ chiều cao lưới:** Không dùng `height` cố định cứng (ví dụ 500px), nhưng phải thêm `height: 100%` vào card để grid tự động kéo giãn các card bằng nhau trên cùng một hàng.
- **Cắt text (Line-clamp):** Tiêu đề card (`h3`) phải cố định số dòng (tối đa 2 dòng, `min-height: 2.6em`) bằng `-webkit-line-clamp`. Đủ để hiển thị tên sản phẩm và quy cách nhưng không làm vỡ layout.
- **Dùng `aspect-ratio`** trên image thay vì `height` cứng — ảnh luôn đúng tỉ lệ dù card rộng hẹp.

| Loại card | Image aspect-ratio | Ghi chú |
|-----------|-------------------|---------|
| Service card | `3/2` | Landscape, hiển thị context rõ |
| Product card | `16/9` | Cinematic Widescreen — ép chiều cao ảnh siêu mỏng, tối đa hóa không gian |
| Expert card | `4/3` | Portrait nhẹ — hiển thị người |
| Blog card | `16/9` | Widescreen |

#### Product Grid (Shop)

| Breakpoint | Số cột | Ghi chú |
|-----------|--------|---------|
| ≥1400px (container max) | 5 cột | Desktop wide |
| ≤1200px | 4 cột | Desktop thường |
| ≤1024px | 3 cột | Tablet |
| ≤768px | 2 cột | Mobile landscape |
| ≤480px | 1 cột | Mobile portrait |

#### Expert Card

| Property | Value | Ghi chú |
|----------|-------|---------|
| `width` | `300px` fixed | Carousel cần fixed width để tính offset |
| `height` | `auto` | Tự cao theo content |
| `image aspect-ratio` | `4/3` | |
| `info padding` | `20px` | `--space-sm` + extra |
| `transform` | `scale(0.96)` | Default, hover lên `scale(1.0)` |
| `opacity` | `0.85` | Default, hover lên `1` |
| JS `cardWidth` | `300` | Phải đồng bộ với CSS width |

> **⚠ CRITICAL — JS/CSS sync:** Khi thay đổi `width` của expert card trong CSS, **bắt buộc phải đồng bộ** `const cardWidth = 300` trong `assets/js/main.js` hàm `initExpertsCarousel()`.
> **Hậu quả nếu quên:** carousel tính offset sai → card bị cắt một phần ở cạnh trái/phải, gap giữa các card không đều, card center không đúng vị trí giữa wrapper.

---

## 5. Container Width System

| Variable | Value | Dùng ở đâu |
|----------|-------|-----------|
| `--container-hero` | `1600px` | Hero section — wide editorial split |
| `--container-xl` | `1400px` | Standard section containers |
| `--container-md` | `1280px` | Text-heavy sections (tracker, process) |
| `--container-sm` | `800px` | FAQ, narrow text sections |
| `--container-padding` | `40px` | Horizontal padding inside containers |

**Quy tắc:** Header container cũng dùng `1400px` để đồng bộ với section containers.

---

## 6. Border Radius

```css
--border-radius-lg:   2px;     /* Card ngoài, modal, image frame lớn - bo góc rất nhẹ tạo cá tính */
--border-radius-md:   2px;     /* Card sản phẩm, inner elements - bo góc rất nhẹ tạo cá tính */
--border-radius-sm:   2px;     /* Badge nhỏ, input, tag phụ - bo nhẹ tinh tế */
--border-radius-pill: 100px;   /* Button, label pill, search bar chính - bo tròn viên thuốc */
--card-border-radius: 2px;     /* Alias của --border-radius-md — dùng cho product/service cards */
```

**Quy tắc dùng:**

| Element | Token | Trạng thái bo góc |
|---------|-------|-------------------|
| Service card, testimonial card, modal, image hero | `--border-radius-lg` / `--card-border-radius` | **2px** (Bo góc siêu nhẹ) |
| Product card, expert card, blog card | `--border-radius-md` / `--card-border-radius` | **2px** (Bo góc siêu nhẹ) |
| Badge phụ nhỏ, form input, tag phụ | `--border-radius-sm` | **2px** (Bo góc siêu nhẹ) |
| Button hành động, search bar chính, nhãn thú cưng | `--border-radius-pill` | **100px** (Bo tròn viên thuốc) |

> `--card-border-radius` và `--border-radius-md` cùng giá trị `2px`. `--card-border-radius` là **semantic alias** dành riêng cho product/service cards — nếu sau này muốn đổi radius card thì chỉ cần sửa 1 token này, không ảnh hưởng các element khác dùng `--border-radius-md`.
>
> **Quy tắc:** Trong CSS của card, **luôn dùng `--card-border-radius`**, không dùng `--border-radius-md` trực tiếp — để khi thay đổi card radius không gây side effect.

---

## 7. Shadow System

```css
--shadow-sm: 0 2px 4px rgba(42, 89, 68, 0.04), 0 1px 2px rgba(42, 89, 68, 0.02)
--shadow-md: 0 4px 8px -2px rgba(42, 89, 68, 0.06), 0 2px 4px -2px rgba(42, 89, 68, 0.03)
--shadow-lg: 0 10px 20px -4px rgba(42, 89, 68, 0.08), 0 4px 8px -4px rgba(42, 89, 68, 0.03)
```

Tất cả shadow dùng màu `--color-primary` tinted (green-tinted shadows) thay vì black — tạo cảm giác organic, ấm hơn.

---

## 8. Motion & Animation

```css
--transition-smooth: all 0.6s cubic-bezier(0.32, 0.72, 0, 1)
```

### 8.1 Khi nào dùng animation

| Loại interaction | Duration | Easing | Ghi chú |
|-----------------|----------|--------|---------|
| Hover trên card, button | `0.3s` | `ease` | Nhanh, phản hồi tức thì |
| Card lift, scale | `0.6s` | `cubic-bezier(0.25, 1, 0.5, 1)` | Smooth deceleration |
| Nav underline, fade | `0.6s` | `--transition-smooth` | Dùng token |
| Carousel slide | `0.5s` | `cubic-bezier(0.25, 1, 0.5, 1)` | |
| Modal open/close | `0.3s` | `ease-out` | |
| Loader, pulse dot | `2s` | `ease-in-out` | Infinite loop |

### 8.2 Quy tắc

- ✅ Chỉ animate `transform` và `opacity` — không animate `width`, `height`, `top`, `left` (gây layout reflow)
- ✅ Dùng `will-change: transform` cho element có animation phức tạp
- ❌ Không animate nếu người dùng đã bật `prefers-reduced-motion`
- ❌ Không dùng animation chỉ để "cho đẹp" nếu không có mục đích UX rõ ràng

---

## 9. Accessibility

### 9.1 Contrast Ratio (WCAG 2.1 AA)

| Tổ hợp | Ratio yêu cầu | Ghi chú |
|--------|--------------|---------|
| Body text trên `bg-light` | ≥ 4.5:1 | `color-text-dark` (#2d3732) trên #FAF9F6 — đạt |
| Heading trên `bg-light` | ≥ 4.5:1 | `color-primary` trên #FAF9F6 — đạt |
| White text trên `color-primary` | ≥ 4.5:1 | #fff trên #2A5944 — đạt |
| Accent text trên white | ≥ 4.5:1 | `color-accent-dark` (#C17F24) trên #fff — ratio ~4.6:1 ✅ đạt AA |

### 9.2 Focus States

- Tất cả interactive element (button, link, input) phải có `:focus-visible` rõ ràng
- Dùng `outline: 3px solid var(--color-accent)` với `outline-offset: 2px`
- Không dùng `outline: none` mà không có alternative focus indicator

### 9.3 Touch Targets

- Minimum touch target: **44×44px** (WCAG 2.5.5)
- Các button icon nhỏ (cart, nav toggle) cần đảm bảo padding đủ để đạt 44px

### 9.4 Semantic HTML

- Mỗi section phải có heading level đúng thứ tự (không nhảy từ H2 → H4)
- Image decorative dùng `alt=""`, image nội dung phải có `alt` mô tả
- Button dùng `<button>`, link điều hướng dùng `<a>`

---

## 10. Changelog

| Ngày | Thay đổi |
|------|---------|
| 06/2026 | Đổi font từ Playfair Display + Plus Jakarta Sans → **Lora + DM Sans** |
| 06/2026 | Thiết lập Type Scale modular 1.25, thêm legacy token aliases |
| 06/2026 | Đồng bộ container max-width: 1200px → **1400px** cho tất cả section |
| 06/2026 | Thiết lập Spacing System base 8px với Vertical Rhythm 4 tầng |
| 06/2026 | Đồng bộ section padding về **64px** (`--space-xl`), xóa các biến padding dư thừa |
| 06/2026 | Fix toàn bộ component spacing (Services, Shop, Membership) tuân thủ rule "một nguồn duy nhất" |
| 06/2026 | Cập nhật Card sizing: đổi Product card về `aspect-ratio: 16/9`, cắt title 2 dòng (`line-clamp: 2`) để hiển thị đủ thông tin quy cách |
| 06/2026 | Giảm độ đậm của shadow toàn trang (giảm opacity & blur radius) để tạo cảm giác minimalist, sửa lỗi trùng lặp biến `--shadow-lg` |
| 06/2026 | Tinh chỉnh color palette: thêm semantic colors, cập nhật contrast cho primary dark |
| 06/2026 | Thêm Media Queries để responsive spacing trên Tablet và Mobile |
