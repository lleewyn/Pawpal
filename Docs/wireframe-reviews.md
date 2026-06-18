# Wireframe: Đánh Giá — Quy Trình 3.1.11

> **Tuân thủ 100%:** design.md | plan_user_stories.md
> **KHÔNG SỬ DỤNG EMOJI** — chỉ SVG monochrome và text characters (• ▶ → ★)
> **KHÔNG POPUP chặn màn hình** — dùng Accordion Inline (Slide-down)
> **Cập nhật:** Tháng 6/2026

---

## 1. LUỒNG TỔNG QUAN

```
Order-detail (completed)
  └─ Mỗi product-item
       └─ [★ Viết đánh giá]  →  Accordion mở rộng tại chỗ
                                  ├─ Context: ảnh + tên + ngày giao
                                  ├─ Star picker (1-5)
                                  ├─ Textarea (0/500)
                                  ├─ Upload zone ảnh/video
                                  └─ Submit button (2-tap confirm)
                                       └─ Thành công → accordion đóng
                                                     → "Đã đánh giá" label
                                                     → Toast "+N Paw Points"

Orders list (completed card)
  └─ Footer card: [★ Viết đánh giá] link → order-detail#reviews

Product-detail
  └─ Section "Đánh giá sản phẩm"
       ├─ Summary block: điểm TB + progress bars
       ├─ Filter chips: [Tất cả][5★][4★][3★][2★][1★][Có ảnh/video]
       └─ Review list: item × n
            ├─ Avatar chữ cái + tên ẩn + stars + date
            ├─ Comment text
            ├─ Media thumbnails (click → Lightbox)
            └─ [Hữu ích?] button
```

---

## 2. WIREFRAME: REVIEW ACCORDION (order-detail)

```
┌─────────────────────────────────────────────────────────────┐
│  Sản phẩm                                                   │
├─────────────────────────────────────────────────────────────┤
│  ┌────┐  Thức ăn chó Royal Canin 15kg            850.000đ  │
│  │ 🖼 │  x2                                                 │
│  └────┘                                                     │
│          [★ Viết đánh giá]  ← btn-write-review (accent)    │
│                                                             │
│  ▼▼▼ ACCORDION MỞ RỘNG (smooth 0.4s) ▼▼▼                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ┌────┐  Thức ăn chó Royal Canin 15kg              │   │
│  │  │IMG │  Đã mua • 08/06/2026                       │   │
│  │  └────┘                                            │   │
│  │  ─────────────────────────────────────────────────│   │
│  │  Đánh giá *                                        │   │
│  │  ★ ★ ★ ★ ★   ← star-picker (hover sáng trái→phải)│   │
│  │  "Hài lòng"  ← emotion label thay đổi real-time   │   │
│  │                                                    │   │
│  │  Nhận xét (tùy chọn)                              │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │ Chia sẻ trải nghiệm của bạn...               │ │   │
│  │  │                                              │ │   │
│  │  │                                              │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │                                           0/500    │   │
│  │                                                    │   │
│  │  Ảnh/Video minh chứng (tùy chọn)                  │   │
│  │  ┌──────────────────────────────────────────────┐ │   │
│  │  │   ▲                                          │ │   │
│  │  │  Kéo thả hoặc click để tải ảnh/video        │ │   │
│  │  │  Tối đa 5MB — JPG, PNG, WEBP, MP4           │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  │                                                    │   │
│  │  [Phản hồi sẽ hiển thị công khai] [Gửi đánh giá] │   │
│  │                                                    │   │
│  │  ^ Thu gọn                                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Confirm-on-button (US 11-4):**
```
Lần 1: [Gửi đánh giá]
         ↓ click
Lần 2: [Bấm lại để xác nhận công khai]  ← pulse animation, viền đếm ngược 5s
         ↓ click trong 5s
        Thành công → đóng accordion + toast
```

---

## 3. WIREFRAME: REVIEW SUMMARY (product-detail)

```
┌─────────────────────────────────────────────────────────────┐
│  Đánh giá sản phẩm                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┬──────────────────────────────────────┐   │
│  │  4.7          │  5★ ████████████████░░  (102)        │   │
│  │  trên 5       │  4★ ████░░░░░░░░░░░░░  (31)          │   │
│  │  ★★★★★        │  3★ ██░░░░░░░░░░░░░░░  (16)          │   │
│  │  (156 đánh   │  2★ ░░░░░░░░░░░░░░░░░  (5)           │   │
│  │   giá)       │  1★ ░░░░░░░░░░░░░░░░░  (2)           │   │
│  └──────────────┴──────────────────────────────────────┘   │
│                                                             │
│  [Tất cả] [5 Sao (102)] [4 Sao (31)] [3 Sao (16)]         │
│  [2 Sao (5)] [1 Sao (2)] [Có Hình Ảnh/Video (24)]         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  N    Nguyễn T***i    ★★★★★    07/05/2025           │   │
│  │       Người mua thực                                │   │
│  │  "Sản phẩm rất tốt! Chó nhà mình ăn rất ngon..."   │   │
│  │                                                     │   │
│  │  [Hữu ích?]                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  T    Trần V***g    ★★★★☆    28/05/2025             │   │
│  │  "Chất lượng ổn..."                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Xem thêm đánh giá ▼]   Đang hiển thị 5/156 đánh giá     │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. WIREFRAME: LIGHTBOX (US 11-7 AC7.3)

```
┌─────────────────────────────────────────────────────────────┐
│                       [×]                                   │
│                                                             │
│   ‹         ┌─────────────────────────┐          ›         │
│  (prev)     │                         │      (next)        │
│             │     ảnh toàn màn hình   │                    │
│             │      max 90vw×85vh      │                    │
│             └─────────────────────────┘                    │
│                                                             │
│                   nền đen 85% opacity                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. WIREFRAME: OFFLINE BANNER (US 11-8)

```
┌─────────────────────────────────────────────────────────────┐
│  review-form-card                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [wifi-off icon]  Mất kết nối mạng. Đang tự động    │   │
│  │                   lưu nháp và thử kết nối lại...    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ← banner vàng nhạt, ẩn khi online                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. WIREFRAME: PAW POINTS TOAST (US 11-6)

```
                                    ┌──────────────────────────┐
                                    │  🐾  +5 Paw Points đã    │
                                    │  được thêm vào ví của bạn│
                                    └──────────────────────────┘
                                    ← góc phải, 3s, slide-in/out
```

---

## 7. SPACING + COLOR SPEC

### Review Accordion

| Element | Token |
|---------|-------|
| Accordion background | `--color-bg-light` |
| Accordion border | `--border-card` |
| Accordion border-radius | `--card-border-radius` |
| Accordion padding | `--space-md` |
| Accordion gap giữa elements | `--space-md` |

### Star Picker

| Element | Token/Value |
|---------|-------------|
| Star size | `2rem` |
| Star inactive | `--color-border` |
| Star active | `--color-accent` (Amber Gold) |
| Star hover scale | `1.15` |
| Emotion label | `--color-text-light`, `font-style: italic` |

### Submit Button

| State | Màu |
|-------|-----|
| Default | `--color-accent` |
| Hover | `--color-accent-dark` |
| Confirm pending | `#e05a20` (orange-red) |
| Disabled | opacity 0.55 |

### Progress Bars (product-detail)

| Element | Token |
|---------|-------|
| Fill color | `--color-accent` |
| Track background | `--color-border` |
| Bar height | `8px` |
| Border-radius | `--border-radius-pill` |

### Lightbox

| Element | Value |
|---------|-------|
| Overlay background | `rgba(0,0,0,0.85)` |
| Nav button bg | `rgba(255,255,255,0.12)` |
| Nav button hover | `rgba(255,255,255,0.28)` |
| Close button | `rgba(255,255,255,0.15)` |

---

## 8. FILE MAP

| File mới/cập nhật | Mục đích |
|-------------------|----------|
| `assets/css/components/review-form.css` | Accordion, star picker, upload, confirm-btn, lightbox, toast |
| `assets/js/user/review-handler.js` | US 11-1~4, 11-6, 11-8 — inline form logic |
| `assets/js/shop/product-reviews.js` | US 11-7 — filter + lightbox trên product-detail |
| `data/reviews.json` | Mock data đánh giá |
| `pages/user/order-detail.html` | Link CSS + JS review |
| `pages/shop/product-detail.html` | Link CSS + JS reviews |
