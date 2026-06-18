# Wireframe: Shop Pages (Section 3.1.8 - Mua sắm)

> **Tài liệu thiết kế wireframe cho quy trình mua sắm sản phẩm**
> 
> **Phiên bản:** 1.0  
> **Ngày tạo:** 12/06/2026  
> **Tuân thủ:** design.md - No subtitles, No 50/50 layout, No emoji icons, No "&"

---

## 📌 Tổng quan

Section 3.1.8 bao gồm **4 trang chính**:

1. **Shop Page** (US 8-1) - Danh sách sản phẩm với search + filters
2. **Product Detail Page** (US 8-2) - Chi tiết sản phẩm
3. **Wishlist Page** (US 8-3) - Danh sách yêu thích
4. **Cart Page** (US 8-4) - Giỏ hàng

---

## 🎨 Design Principles

### Màu sắc và Typography
- Background: `--color-bg-light` (cream) cho consistency
- Heading: Lora (serif)
- Body/UI: DM Sans (sans-serif)
- Accent color: `--color-accent` (amber gold)

### Icons Strategy
**Source:** Flaticon (https://www.flaticon.com)
- **Style:** Regular hoặc Thin (line icons)
- **Format:** SVG monochrome
- **Color:** Sử dụng CSS fill với design tokens
- **Size:** 24x24px (UI), 48x48px (category cards)

**Icon mapping cho shop:**
```
Thức ăn khô  → pet-food / dog-food icon
Đồ chơi      → pet-toy / ball icon
Phụ kiện     → collar / leash icon
Vệ sinh      → bathtub / shower icon
Sức khỏe     → medical / first-aid icon
Quần áo      → shirt / clothes icon
Bát ăn       → pet-bowl / food-bowl icon
Xương gặm    → bone icon
```

**Attribution:**
- Thêm credit trong footer: "Icons from Flaticon"
- Hoặc mua license để remove attribution

### Layout Rules
- ❌ NO 50/50 layouts
- ❌ NO subtitles
- ❌ NO emoji icons
- ❌ NO "&" character
- ✅ Asymmetric grid layouts
- ✅ Single-column for cart
- ✅ Design token compliant

---

## 📄 Page 1: Shop Page (US 8-1)

### File Structure
```
pages/shop/shop.html
assets/css/shop/shop.css
assets/js/shop/shop.js
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│  DANH MỤC SẢN PHẨM (Horizontal scroll categories)      │
│  [🐕 Thức ăn] [🧸 Đồ chơi] [🎒 Phụ kiện] ...           │
├──────────────┬──────────────────────────────────────────┤
│              │  GỢI Ý CHO BẠN (Carousel)                │
│              │  ← [P1] [P2] [P3] [P4] →                │
│              ├──────────────────────────────────────────┤
│              │  MUA SẮM THEO DANH MỤC                   │
│  SIDEBAR     │  ┌───┬───┬───┬───┬───┬───┐              │
│  FILTERS     │  │ 🐶 │ 🍖 │ 🦴 │ 💊 │ 🎾 │ 👕 │          │
│  (Sticky)    │  ├───┼───┼───┼───┼───┼───┤              │
│              │  │ 🛁 │ 🥣 │ 🧴 │ 💝 │ 📺 │ 🎁 │          │
│  [Danh mục]  │  └───┴───┴───┴───┴───┴───┘              │
│  □ Thức ăn   ├──────────────────────────────────────────┤
│  □ Đồ chơi   │  Toolbar                                 │
│  □ Phụ kiện  │  - Search bar (left)                     │
│              │  - Sort dropdown (right)                 │
│  [Giá]       │  - Result count                          │
│  Price       ├──────────────────────────────────────────┤
│  Slider      │                                          │
│  0 - 500k    │  PRODUCT GRID                            │
│              │  ┌────┬────┬────┬────┐                   │
│  [Kho]       │  │ P1 │ P2 │ P3 │ P4 │                   │
│  □ Còn hàng  │  ├────┼────┼────┼────┤                   │
│              │  │ P5 │ P6 │ P7 │ P8 │                   │
│  [Thương     │  └────┴────┴────┴────┘                   │
│   hiệu]      │                                          │
│  □ Royal     │  Pagination                              │
│  □ Pedigree  │  ← 1 2 3 ... →                          │
│              ├──────────────────────────────────────────┤
└──────────────┤  THƯƠNG HIỆU BÁN CHẠY                    │
               │  [Royal Canin] [Pedigree] [Me-O] ...     │
               └──────────────────────────────────────────┘
│                    FOOTER                               │
└─────────────────────────────────────────────────────────┘
```

### Components Detail

#### 1. Category Tabs (Top - Full width)
```
┌─────────────────────────────────────────────────────────┐
│ DANH MỤC SẢN PHẨM                                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [🐕 Thức ăn] [🧸 Đồ chơi] [🎒 Phụ kiện] [🛁 Vệ sinh]│  │ ← Horizontal scroll
│ │ [💊 Sức khỏe] [👕 Quần áo] [🥣 Bát ăn] [🦴 Xương]   │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Icon Implementation (Flaticon):**
```html
<!-- Example: Category tab with Flaticon SVG -->
<button class="category-tab active">
  <svg class="category-icon" width="24" height="24" fill="currentColor">
    <use href="/assets/icons/flaticon-pet.svg#dog-food"></use>
  </svg>
  <span>Thức ăn</span>
</button>
```

**Styling:**
- Pills/Chip design with inline SVG icons
- Icon color: `currentColor` (inherits from text)
- Active state: `--color-primary` background + white text
- Hover: Scale 1.05 + `--color-primary-light` bg
- Horizontal scroll on mobile with snap points

**CSS:**
```css
.category-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--border-radius-pill);
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
}

.category-tab.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.category-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}
```

#### 2. Gợi ý cho bạn (Carousel)
```
┌─────────────────────────────────────────────────────────┐
│ GỢI Ý CHO BẠN                      [← Tất cả] [→ Ẩn]   │
├─────────────────────────────────────────────────────────┤
│  ←  [P1]     [P2]     [P3]     [P4]     [P5]  →        │
│     ┌────┐   ┌────┐   ┌────┐   ┌────┐   ┌────┐         │
│     │IMG │   │IMG │   │IMG │   │IMG │   │IMG │         │
│     ├────┤   ├────┤   ├────┤   ├────┤   ├────┤         │
│     │Name│   │Name│   │Name│   │Name│   │Name│         │
│     │150k│   │200k│   │180k│   │220k│   │195k│         │
│     └────┘   └────┘   └────┘   └────┘   └────┘         │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Auto-play: 5s interval
- Drag to scroll
- Dot indicators
- Based on: View history + Popular products

#### 3. Mua sắm theo danh mục (Category Grid)
```
┌─────────────────────────────────────────────────────────┐
│ MUA SẮM THEO DANH MỤC                    [← Tất cả →]   │
├─────────────────────────────────────────────────────────┤
│  ┌─────┬─────┬─────┬─────┬─────┬─────┐                 │
│  │[🐶] │[🍖] │[🦴] │[💊] │[🎾] │[👕] │                 │
│  │Thức │Thức │Xương│Sức  │Đồ   │Quần │                 │
│  │Khô  │Ướt  │Gặm  │Khỏe │Chơi │Áo   │                 │
│  ├─────┼─────┼─────┼─────┼─────┼─────┤                 │
│  │[🛁] │[🥣] │[🧴] │[💝] │[📺] │[🎁] │                 │
│  │Vệ   │Bát  │Chăm │Phụ  │Nội  │Khác │                 │
│  │Sinh │Ăn   │Sóc  │Kiện │Thất │     │                 │
│  └─────┴─────┴─────┴─────┴─────┴─────┘                 │
└─────────────────────────────────────────────────────────┘
```

**Icon Implementation (Flaticon):**
```html
<!-- Example: Category card -->
<a href="/shop?category=food" class="category-card">
  <svg class="category-card-icon" width="48" height="48">
    <use href="/assets/icons/flaticon-pet.svg#dog-food"></use>
  </svg>
  <span class="category-card-label">Thức ăn khô</span>
</a>
```

**Flaticon icons to use:**
- Thức khô: `dog-food` / `kibble`
- Thức ướt: `pet-food` / `canned-food`
- Xương gặm: `bone` / `dog-bone`
- Sức khỏe: `medical` / `first-aid-kit`
- Đồ chơi: `pet-toy` / `ball`
- Quần áo: `pet-clothes` / `shirt`
- Vệ sinh: `bathtub` / `shower`
- Bát ăn: `pet-bowl` / `food-bowl`
- Chăm sóc: `brush` / `grooming`
- Phụ kiện: `collar` / `leash`
- Nội thất: `pet-house` / `bed`
- Khác: `paw` / `heart`

**Styling:**
- Square cards: 120x120px (desktop), 100x100px (mobile)
- Icon: 48x48px SVG in circle background
- Circle bg: `--color-primary-light`
- Icon color: `--color-primary`
- Border: `--border-card`
- Hover: `--shadow-card-hover` + scale + icon color → `--color-accent`
- Active/Selected: `--color-accent` border

**CSS:**
```css
.category-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 120px;
  height: 120px;
  background: var(--color-bg-white);
  border: var(--border-card);
  border-radius: var(--card-border-radius);
  transition: all 0.3s ease;
}

.category-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: scale(1.05);
}

.category-card:hover .category-card-icon {
  fill: var(--color-accent);
}

.category-card-icon {
  width: 48px;
  height: 48px;
  fill: var(--color-primary);
  transition: fill 0.3s ease;
}

.category-card-label {
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--color-text-dark);
  text-align: center;
}
```

**Grid responsive:**
- Desktop: 6 columns
- Tablet: 4 columns  
- Mobile: 3 columns

#### 4. Sidebar Filters (Left - 25% width)
```
┌─────────────────────┐
│ BỘ LỌC              │ ← H3, no subtitle
├─────────────────────┤
│ Danh mục            │ ← H4
│ □ Thức ăn (45)      │
│ □ Đồ chơi (32)      │
│ □ Phụ kiện (28)     │
│ □ Vệ sinh (15)      │
├─────────────────────┤
│ Thương hiệu         │
│ □ Royal Canin (20)  │
│ □ Pedigree (15)     │
│ □ Me-O (12)         │
├─────────────────────┤
│ Khoảng giá          │
│ ────●══════●────    │ ← Price slider
│ 50.000đ - 500.000đ  │
├─────────────────────┤
│ Tình trạng          │
│ □ Còn hàng          │
│ □ Giảm giá          │
├─────────────────────┤
│ [Xóa bộ lọc]        │ ← Link button
└─────────────────────┘
```

**Styling:**
- Sticky position: `top: 100px`
- Background: `--color-bg-white`
- Border: `--border-card`
- Radius: `--card-border-radius`

#### 5. Thương hiệu bán chạy (Brand Section)
```
┌─────────────────────────────────────────────────────────┐
│ THƯƠNG HIỆU BÁN CHẠY                    [Xem tất cả →]  │
├─────────────────────────────────────────────────────────┤
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐           │
│  │Royal │Pedi  │Me-O  │Nutri │RefLex│Whiskas│          │
│  │Canin │gree  │      │tion  │      │       │          │
│  │[LOGO]│[LOGO]│[LOGO]│[LOGO]│[LOGO]│[LOGO] │          │
│  ├──────┼──────┼──────┼──────┼──────┼──────┤           │
│  │Cat's │Happy │Bow   │Taste │Euro  │Avoderm│          │
│  │Rang  │Dog   │Wow   │Wild  │Canin │       │          │
│  │[LOGO]│[LOGO]│[LOGO]│[LOGO]│[LOGO]│[LOGO] │          │
│  └──────┴──────┴──────┴──────┴──────┴──────┘           │
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Card: 150x100px (desktop), 120x80px (mobile)
- Grayscale filter: Default
- Color + scale: On hover
- Border: `--border-card`
- Background: `--color-bg-white`
- Grid: 6 columns → 4 → 3 → 2

**Interaction:**
- Click → Filter products by brand
- Hover → Show brand name tooltip

#### 6. Product Grid (Right - 75% width)
```
Grid: 4 columns (desktop)
Gap: var(--space-md)

┌──────────────┐
│  [♡]         │ ← Heart icon top-right
│              │
│    IMAGE     │ ← 1:1 ratio
│   (300x300)  │
├──────────────┤
│ Tên sản phẩm │ ← H4, max 2 lines
│ Thương hiệu  │ ← Small text
│              │
│ 250.000đ     │ ← Price (accent color)
│ 320.000đ     │ ← Old price (strike)
│              │
│ [🛒 Giỏ hàng]│ ← Quick add button
└──────────────┘
```

**Product Card States:**
- Default: `--shadow-card`
- Hover: `--shadow-card-hover` + `translateY(-4px)`
- Out of stock: Overlay "Tạm hết hàng" + opacity 0.6

#### 3. Empty State (No results)
```
┌─────────────────────────────────────┐
│                                     │
│          [Icon placeholder]         │ ← SVG icon, not emoji
│                                     │
│  Rất tiếc! PawPal không tìm thấy   │
│  sản phẩm nào phù hợp với           │
│  từ khóa "[keyword]"                │
│                                     │
│  ───────────────────────────        │
│                                     │
│  SẢN PHẨM NỔI BẬT DÀNH CHO         │
│  THÚ CƯNG                           │
│                                     │
│  ┌────┬────┬────┬────┐             │
│  │ P1 │ P2 │ P3 │ P4 │             │
│  └────┴────┴────┴────┘             │
└─────────────────────────────────────┘
```

### Responsive Breakpoints

| Screen | Grid | Sidebar |
|--------|------|---------|
| ≥1400px | 4 cols | Visible |
| ≤1200px | 3 cols | Visible |
| ≤1024px | 3 cols | Collapsible |
| ≤768px | 2 cols | Drawer (mobile) |
| ≤640px | 2 cols | Drawer |
| ≤480px | 1 col | Drawer |

---

## 📄 Page 2: Product Detail Page (US 8-2)

### File Structure
```
pages/shop/product-detail.html
assets/css/shop/product-detail.css
assets/js/shop/product-detail.js
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│  Breadcrumb: Trang chủ → Cửa hàng → Thức ăn → ...      │
├───────────────────────┬─────────────────────────────────┤
│                       │                                 │
│   IMAGE GALLERY       │   PRODUCT INFO                  │
│   ┌─────────────┐     │   Royal Canin Mini Adult       │ ← H1
│   │             │     │   Thương hiệu: Royal Canin     │
│   │    MAIN     │     │                                 │
│   │   (600px)   │     │   ★★★★☆ (4.5) - 128 đánh giá  │
│   │             │     │                                 │
│   └─────────────┘     │   250.000đ   320.000đ          │ ← Price
│   [🔍]               │   -22%                          │ ← Badge
│                       │                                 │
│   ┌───┬───┬───┬───┐   │   Tình trạng: Còn 45 sản phẩm  │
│   │ 1 │ 2 │ 3 │ 4 │   │                                 │
│   └───┴───┴───┴───┘   │   Số lượng: [−] [1] [+]        │
│   Thumbnails          │                                 │
│                       │   [♡ Yêu thích] [🛒 Thêm giỏ]  │
│                       │                                 │
├───────────────────────┴─────────────────────────────────┤
│                                                         │
│  TABS NAVIGATION                                        │
│  [Mô tả] [Thông số] [Đánh giá (128)] [Hỏi đáp]       │
│  ─────                                                  │
│                                                         │
│  Content area (active tab)                             │
│  ...                                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  SẢN PHẨM LIÊN QUAN                                     │
│  ┌────┬────┬────┬────┐                                 │
│  │ P1 │ P2 │ P3 │ P4 │                                 │
│  └────┴────┴────┴────┘                                 │
└─────────────────────────────────────────────────────────┘
```

### Components Detail

#### 1. Image Gallery
- Main image: 600x600px
- Thumbnails: 4 images, 120x120px
- Zoom icon on hover
- Lightbox on click

#### 2. Product Info (Sticky on scroll)
```
┌─────────────────────────────┐
│ Royal Canin Mini Adult      │ ← H1
│ Thương hiệu: Royal Canin    │ ← Meta
│                             │
│ ★★★★☆ 4.5 - 128 đánh giá   │ ← Rating
│                             │
│ 250.000đ  [320.000đ]       │ ← Price + old price
│ ─22%                        │ ← Sale badge
│                             │
│ Tình trạng: Còn 45 sp       │ ← Stock status
│                             │
│ Số lượng:  [−] [1] [+]     │ ← Quantity picker
│            Max: 10          │ ← Limit hint
│                             │
│ ┌─────────────────────────┐ │
│ │ [♡]  YÊU THÍCH          │ │ ← Outline button
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ [🛒] THÊM VÀO GIỎ HÀNG  │ │ ← Primary CTA
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Out of Stock State:**
```
┌─────────────────────────────┐
│ Tình trạng: TẠM HẾT HÀNG    │ ← Red text
│                             │
│ ┌─────────────────────────┐ │
│ │ THÔNG BÁO KHI CÓ HÀNG   │ │ ← Disabled state
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

#### 3. Tabs Content
- Mô tả: Rich text + images
- Thông số: Specifications table
- Đánh giá: Reviews list + rating breakdown
- Hỏi đáp: Q&A section

---

## 📄 Page 3: Wishlist Page (US 8-3)

### File Structure
```
pages/shop/wishlist.html
assets/css/shop/wishlist.css
assets/js/shop/wishlist.js
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│  WISHLIST HEADER                                        │
│  Sản phẩm yêu thích của tôi (8)                        │ ← H1
│                                                         │
│  [Xóa tất cả]                          [Thêm tất cả]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  WISHLIST GRID (same as shop grid)                     │
│  ┌────┬────┬────┬────┐                                 │
│  │ P1 │ P2 │ P3 │ P4 │                                 │
│  │ [X]│ [X]│ [X]│ [X]│ ← Remove icon                   │
│  ├────┼────┼────┼────┤                                 │
│  │ P5 │ P6 │ P7 │ P8 │                                 │
│  │ [X]│ [X]│ [X]│ [X]│                                 │
│  └────┴────┴────┴────┘                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────┐
│                                     │
│          [Icon placeholder]         │
│                                     │
│  Danh sách yêu thích của bạn        │
│  đang trống!                        │
│                                     │
│  Hãy khám phá cửa hàng và lưu lại  │
│  những sản phẩm bạn thích           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  KHÁM PHÁ CỬA HÀNG           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Product Card (Wishlist specific)
```
┌──────────────┐
│  [X]    [♥]  │ ← Remove X + Filled heart
│              │
│    IMAGE     │
│   (300x300)  │
├──────────────┤
│ Tên sản phẩm │
│ Thương hiệu  │
│              │
│ 250.000đ     │
│ Còn hàng ✓   │ ← Stock badge
│              │
│ [🛒 Giỏ hàng]│
└──────────────┘
```

**Out of Stock in Wishlist:**
- Badge: "Tạm hết hàng" (red)
- Button disabled
- Card opacity: 0.7

---

## 📄 Page 4: Cart Page (US 8-4)

### File Structure
```
pages/shop/cart.html
assets/css/shop/cart.css
assets/js/shop/cart.js
```

### Layout Structure (SINGLE COLUMN)

```
┌─────────────────────────────────────────────────────────┐
│                    HEADER (Nav)                         │
├─────────────────────────────────────────────────────────┤
│  GIỎ HÀNG CỦA BẠN (3 sản phẩm)                         │ ← H1
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ CART TABLE                                      │   │
│  ├────┬──────────────┬────────┬──────────┬────────┤   │
│  │ □  │ SẢN PHẨM     │ ĐƠN GIÁ│ SỐ LƯỢNG │ TỔNG   │   │
│  ├────┼──────────────┼────────┼──────────┼────────┤   │
│  │ ☑  │ [IMG] Royal  │250.000đ│ [-][1][+]│250.000đ│   │
│  │    │ Canin...     │        │   Max:10 │   [X]  │   │
│  ├────┼──────────────┼────────┼──────────┼────────┤   │
│  │ ☑  │ [IMG] Pedi.. │180.000đ│ [-][2][+]│360.000đ│   │
│  │    │              │        │          │   [X]  │   │
│  ├────┼──────────────┼────────┼──────────┼────────┤   │
│  │ □  │ [IMG] Me-O   │120.000đ│ [-][1][+]│120.000đ│   │
│  │    │ (Hết hàng)   │        │ Disabled │   [X]  │   │
│  └────┴──────────────┴────────┴──────────┴────────┘   │
│                                                         │
│  [Xóa các mục đã chọn]                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  MÃ GIẢM GIÁ                                            │
│  ┌──────────────────────────┬──────────┐               │
│  │ Nhập mã giảm giá...      │ ÁP DỤNG  │               │
│  └──────────────────────────┴──────────┘               │
│                                                         │
│  [PAWFIRST10] -50.000đ [X] ← Applied voucher           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  TỔNG KẾT ĐỠN HÀNG                                      │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Tổng tiền hàng:              730.000đ            │ │
│  │ Giảm giá (PAWFIRST10):       -50.000đ           │ │
│  │ Phí vận chuyển:              Miễn phí            │ │
│  │ ────────────────────────────────────────────     │ │
│  │ TỔNG THANH TOÁN:             680.000đ            │ │ ← Large, bold
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │         TIẾN HÀNH THANH TOÁN                      │ │ ← Primary CTA
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [← Tiếp tục mua sắm]                                  │ ← Link
└─────────────────────────────────────────────────────────┘
```

### Empty Cart State
```
┌─────────────────────────────────────┐
│                                     │
│          [Cart icon]                │
│                                     │
│  Giỏ hàng của bạn đang trống!      │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  QUAY LẠI CỬA HÀNG           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Cart Item Row Detail
```
┌─────────────────────────────────────────────┐
│ [☑] [IMG]  Royal Canin Mini Adult          │
│     80x80  Thức ăn cho chó trưởng thành    │ ← Product name + desc
│            Thương hiệu: Royal Canin         │
│                                             │
│            250.000đ  [−] [1] [+]  250.000đ │
│            Đơn giá    SL (Max:10)  Tổng    │
│                                      [X]    │
└─────────────────────────────────────────────┘
```

**States:**
- Normal: Checkbox enabled
- Out of stock: Red text "Hết hàng" + Disabled quantity + Gray overlay
- Quantity warning: "Chỉ còn 3 sản phẩm" (orange text)

### Voucher Applied State
```
┌──────────────────────────────────┐
│ Mã giảm giá đã áp dụng:          │
│ ┌──────────────────────────────┐ │
│ │ PAWFIRST10  -50.000đ    [X] │ │ ← Green badge + Remove
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

---

## 🔧 Interactive Features

### 0. Category Navigation
```javascript
// Top category tabs
- Horizontal scroll with snap points
- Active state persists
- Click → Filter products by category
- Update URL: ?category=food
```

### 0.1. Gợi ý cho bạn Carousel
```javascript
// Auto-play carousel
- Interval: 5000ms
- Pause on hover
- Drag to scroll (Swiper.js)
- Dot indicators
- Lazy load images
- Based on: user history + popular items
```

### 0.2. Category Grid Icons
```javascript
// Interactive category cards
- Click → Navigate to /shop?category=X
- Hover → Scale 1.05 + shadow
- Icon: SVG monochrome (not emoji)
- Loading state: Skeleton
```

### 0.3. Brand Logos
```javascript
// Brand filter interaction
- Grayscale → Color on hover
- Click → Filter by brand
- Update URL: ?brand=royal-canin
- Tooltip on hover showing brand name
```

### 1. Search + Filter (US 8-1)
```javascript
// Real-time filtering
- Debounce search: 300ms
- Update URL params: ?category=food&price_min=50000
- Preserve filter state on reload
- Loading skeleton during filter
```

### 2. Add to Cart (US 8-1, 8-2, 8-3)
```javascript
// Stock validation
- Check available quantity
- Show toast: "Đã thêm vào giỏ hàng"
- Update cart badge in header
- Animate button (scale + check icon)
```

### 3. Wishlist Toggle (US 8-1, 8-2, 8-3)
```javascript
// Heart icon animation
- Empty heart → Filled heart (scale + color)
- Guest: Save to localStorage
- Member: Save to account (API call)
- Toast: "Đã thêm vào danh sách yêu thích"
```

### 4. Cart Calculations (US 8-4)
```javascript
// Real-time updates
- Quantity change: Recalculate line total
- Remove item: Fade out animation
- Apply voucher: Validate + show discount
- Update grand total instantly
```

### 5. Stock Alerts (US 8-4)
```javascript
// Cart page warnings
- If item out of stock: Red banner "Sản phẩm X đã hết hàng"
- If quantity > available: "Chỉ còn Y sản phẩm"
- Disable checkout if any invalid items
```

---

## 📱 Mobile Considerations

### Shop Page (Mobile)
- Category tabs: Horizontal scroll with snap
- Gợi ý carousel: Full width swipe
- Category grid: 3 columns
- Brand section: 2 columns
- Sidebar → Drawer (slide from left)
- Filter button: Fixed bottom-right FAB
- Product grid: 2 columns → 1 column (≤480px)
- Sort: Bottom sheet

### Product Detail (Mobile)
- Image gallery: Swiper carousel
- Sticky add to cart bar at bottom
- Tabs: Horizontal scroll

### Cart (Mobile)
- Table → Card list
- Quantity picker: Larger touch targets (44x44px)
- Sticky checkout button at bottom

---

## 🎯 Success Metrics

- Product card hover interaction
- Filter application count
- Add to cart success rate
- Cart abandonment points
- Voucher usage rate

---

## ✅ Implementation Checklist

### Shop Page
- [ ] Download Flaticon icons (Regular/Thin style)
- [ ] Create SVG sprite for category icons
- [ ] Category tabs (horizontal scroll)
- [ ] Gợi ý carousel (auto-play + drag)
- [ ] Category grid (icon cards 6 cols)
- [ ] Brand logos section (grayscale → color)
- [ ] Sidebar filters (sticky)
- [ ] Product grid (responsive)
- [ ] Search bar (debounce)
- [ ] Sort dropdown
- [ ] Empty state
- [ ] Pagination
- [ ] Loading skeletons

### Product Detail
- [ ] Image gallery (lightbox)
- [ ] Sticky product info
- [ ] Quantity picker (validation)
- [ ] Add to cart (stock check)
- [ ] Wishlist toggle
- [ ] Tabs navigation
- [ ] Related products carousel
- [ ] Breadcrumb navigation

### Wishlist
- [ ] Grid layout (same as shop)
- [ ] Remove from wishlist (fade out)
- [ ] Add to cart from wishlist
- [ ] Empty state
- [ ] Stock status badges
- [ ] Guest: localStorage sync
- [ ] Member: Account sync

### Cart
- [ ] Single-column layout
- [ ] Checkbox selection
- [ ] Quantity picker (max limit)
- [ ] Remove items (fade out)
- [ ] Voucher input + validation
- [ ] Real-time calculations
- [ ] Stock warnings
- [ ] Empty state
- [ ] Checkout button (validate)
- [ ] Continue shopping link
- [ ] Guest: Cookie persistence
- [ ] Member: Account sync

---

## 📦 Icon Assets Setup

### Flaticon Icons Required

**Download from:** https://www.flaticon.com

**Style:** Regular hoặc Thin (line icons)  
**Format:** SVG  
**License:** Free (with attribution) hoặc Premium

**Icon list:**
```
Categories:
- dog-food / pet-food (Thức ăn khô)
- canned-food (Thức ướt)
- bone / dog-bone (Xương gặm)
- medical / first-aid-kit (Sức khỏe)
- pet-toy / ball (Đồ chơi)
- pet-clothes / shirt (Quần áo)
- bathtub / shower (Vệ sinh)
- pet-bowl / food-bowl (Bát ăn)
- brush / grooming (Chăm sóc)
- collar / leash (Phụ kiện)
- pet-house / bed (Nội thất)
- paw / heart (Khác)

UI Icons:
- shopping-cart
- heart (wishlist)
- search
- filter
- arrow-left / arrow-right
- close / x
- check / checkmark
- trash / delete
```

**File structure:**
```
assets/icons/
├── flaticon-pet.svg          ← SVG sprite (all icons)
├── categories/
│   ├── dog-food.svg
│   ├── bone.svg
│   ├── pet-toy.svg
│   └── ...
└── ui/
    ├── cart.svg
    ├── heart.svg
    └── ...
```

**SVG Sprite technique:**
```html
<!-- Single sprite file with all icons -->
<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
  <symbol id="dog-food" viewBox="0 0 24 24">
    <path d="..."/>
  </symbol>
  <symbol id="bone" viewBox="0 0 24 24">
    <path d="..."/>
  </symbol>
  <!-- ... more icons -->
</svg>

<!-- Usage in HTML -->
<svg width="24" height="24" fill="currentColor">
  <use href="/assets/icons/flaticon-pet.svg#dog-food"></use>
</svg>
```

**Attribution:**
```html
<!-- In footer -->
<div class="flaticon-attribution">
  Icons from <a href="https://www.flaticon.com" target="_blank">Flaticon</a>
</div>
```

---

**Ghi chú:** Tất cả wireframe tuân thủ design.md, không sử dụng subtitle, emoji, gradient, và layout 50/50.
