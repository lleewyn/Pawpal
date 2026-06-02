# Cấu trúc thư mục dự án PawPal

## Tổng quan

```
Pawpal/
├── index.html                  # Landing page chính
├── package.json
├── README.md
│
├── pages/                      # Tất cả trang HTML
│   ├── admin/                  # Trang quản trị
│   │   └── index.html          (admin dashboard)
│   │
│   ├── user/                   # Trang người dùng
│   │   ├── dashboard.html      (dashboard khách hàng)
│   │   ├── orders.html         (lịch sử đơn hàng)
│   │   ├── order-detail.html   (chi tiết đơn)
│   │   ├── pet-archive.html    (danh sách pet)
│   │   └── pet-form.html       (thêm/sửa pet)
│   │
│   ├── shop/                   # Trang mua sắm
│   │   ├── shop.html           (danh sách sản phẩm)
│   │   └── checkout.html       (thanh toán)
│   │
│   ├── services/               # Trang dịch vụ
│   │   ├── services.html       (danh sách dịch vụ)
│   │   └── booking.html        (đặt dịch vụ)
│   │
│   └── public/                 # Trang công khai
│       ├── about.html          (về chúng tôi)
│       ├── blog.html           (cẩm nang)
│       ├── contact.html        (liên hệ)
│       └── login.html          (đăng nhập)
│
├── assets/                     # Tài nguyên tĩnh
│   ├── css/                    (stylesheet)
│   ├── js/                     (JavaScript)
│   └── images/                 (hình ảnh)
│
├── scripts/                    # Utility scripts
│   ├── sync_headers.js
│   ├── sync_footers.js
│   ├── update-nav.js
│   └── README.md
│
└── Docs/                       # Tài liệu dự án
    ├── requirements.md
    ├── DESIGN.md
    ├── PRODUCT.md
    ├── backlog.md
    ├── quytrinh.md
    ├── todo.md
    ├── dichvu.csv
    ├── sanpham.csv
    └── STRUCTURE.md           (file này)
```

## Quy tắc Path

### Từ root (index.html):
- Link đến pages: `pages/services/services.html`
- Assets: `assets/css/style.css`

### Từ pages/*/ (depth 2):
- Link về root: `../../index.html`
- Assets: `../../assets/css/style.css`
- Link sang page khác: `../services/booking.html`

## Nguyên tắc tổ chức

1. **Landing page** (`index.html`) luôn ở root
2. **Pages** được phân theo chức năng:
   - `admin/` - quản trị hệ thống
   - `user/` - dashboard và quản lý tài khoản
   - `shop/` - mua sắm sản phẩm
   - `services/` - đặt dịch vụ
   - `public/` - trang thông tin chung
3. **Assets** tập trung tại root `/assets`
4. **Scripts** utility tại `/scripts`
5. **Docs** tất cả tài liệu tại `/Docs`

## Lợi ích

- ✅ Dễ scale: thêm page mới vào đúng folder
- ✅ Rõ ràng: biết ngay page thuộc chức năng nào
- ✅ Bảo trì tốt: các page cùng chức năng nằm gần nhau
- ✅ SEO-friendly: URL structure rõ ràng
