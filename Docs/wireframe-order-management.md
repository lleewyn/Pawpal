# Wireframe và Kế Hoạch Code: Quản Lý Đơn Hàng (3.1.10)

> **Tài liệu thiết kế giao diện chi tiết cho quy trình US 10-1, 10-2, 10-3**
> 
> **Tuân thủ 100%:** design.md | plan_user_stories.md
> 
> **✅ KHÔNG SỬ DỤNG EMOJI** - Chỉ dùng SVG icons monochrome và text characters (• ▶ ▼ →)
> 
> **Cập nhật:** Tháng 6/2026

---

## TỔNG QUAN HỆ THỐNG

### Các trang cần triển khai

| STT | Trang | File Path | Mô tả |
|-----|-------|-----------|-------|
| 1 | **Danh sách đơn hàng** | `/pages/user/orders.html` | Trang chính quản lý đơn hàng (US 10-1) |
| 2 | **Chi tiết đơn hàng** | `/pages/user/order-detail.html` | Xem chi tiết 1 đơn cụ thể (US 10-2) |
| 3 | **Yêu cầu đổi trả** | Component Slide-out Panel | Form đổi trả sản phẩm (US 10-3) |
| 4 | **Tra cứu đơn hàng** | `/pages/public/order-lookup.html` | Dành cho khách vãng lai tra SĐT |

### CSS và JS Files

```
assets/css/user/orders.css           ← Style cho trang danh sách
assets/css/user/order-detail.css     ← Style cho trang chi tiết
assets/css/components/return-form.css ← Style cho slide-out panel
assets/js/user/orders.js             ← Logic danh sách + filter
assets/js/user/order-detail.js       ← Logic timeline, actions
assets/js/user/return-handler.js     ← Xử lý form đổi trả
```

### Data Structure

```
data/orders.json          ← Mock data đơn hàng
data/order-statuses.json  ← Các trạng thái + màu sắc
data/return-reasons.json  ← Lý do đổi trả
```

---

## WIREFRAME 1: DANH SÁCH ĐƠN HÀNG (US 10-1)

### A. Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Sticky)                                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┬────────────────────────────────────────┐   │
│  │ User        │  MAIN CONTENT                          │   │
│  │ Sidebar     │  ┌──────────────────────────────────┐  │   │
│  │             │  │  Breadcrumb: Trang cá nhân > Đơn │  │   │
│  │ • Dashboard │  │   hàng của tôi                   │  │   │
│  │ • Đơn hàng  │  └──────────────────────────────────┘  │   │
│  │ • Lịch hẹn  │  ┌──────────────────────────────────┐  │   │
│  │ • Bé cưng   │  │  THỐNG KÊ NHANH                  │  │   │
│  │ • Tài khoản │  │  • 2 đơn đang xử lý              │  │   │
│  │             │  │  • 5 đơn hoàn thành              │  │   │
│  │             │  │  • Tổng chi tiêu: 2.5M VNĐ       │  │   │
│  │             │  └──────────────────────────────────┘  │   │
│  │             │  ┌──────────────────────────────────┐  │   │
│  │             │  │  TÌM KIẾM ĐƠN HÀNG               │  │   │
│  │             │  │  [Input + SVG Icon Search]       │  │   │
│  │             │  └──────────────────────────────────┘  │   │
│  │             │  ┌──────────────────────────────────┐  │   │
│  │             │  │  TAB FILTER (Sticky on scroll)   │  │   │
│  │             │  │  [Tất cả] [Chờ TT] [Chuẩn bị]   │  │   │
│  │             │  │  [Đang giao] [Hoàn thành] [Hủy]  │  │   │
│  │             │  └──────────────────────────────────┘  │   │
│  │             │  ┌──────────────────────────────────┐  │   │
│  │             │  │  ▶ ORDER CARD #1                 │  │   │
│  │             │  │  [Badge: Đang giao]              │  │   │
│  │             │  │  Mã: ORD-2026-001 | 10/06/2026   │  │   │
│  │             │  │  ┌────┐                          │  │   │
│  │             │  │  │IMG │ Thức ăn cho chó 15kg    │  │   │
│  │             │  │  └────┘ và 2 sản phẩm khác      │  │   │
│  │             │  │  Tổng: 850.000 VNĐ               │  │   │
│  │             │  │  [Xem chi tiết] [Theo dõi đơn]   │  │   │
│  │             │  └──────────────────────────────────┘  │   │
│  │             │  ┌──────────────────────────────────┐  │   │
│  │             │  │  ▶ ORDER CARD #2                 │  │   │
│  │             │  │  ...                             │  │   │
│  │             │  └──────────────────────────────────┘  │   │
│  │             │  [Pagination: ← 1 2 3 ... 10 →]      │   │
│  └─────────────┴────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**✅ TUÂN THỦ DESIGN.MD:**
- ✅ KHÔNG dùng emoji
- ✅ Dùng SVG icon monochrome cho search
- ✅ Dùng text character "▶" cho indicator
- ✅ Layout 2 cột (280px sidebar + 1fr main)
- ✅ Spacing dùng var(--space-*)
- ✅ Container max-width: var(--container-xl) = 1400px

### B. HTML Structure (orders.html)

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn hàng của tôi - PawPal</title>
    
    <!-- Fonts -->
