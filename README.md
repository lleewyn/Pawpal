# 🐾 PawPal - Premium Pet Care Platform

[![Status](https://img.shields.io/badge/status-active-success.svg)](#)
[![Tech Stack](https://img.shields.io/badge/tech--stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Bootstrap%205.3-blue.svg)](#)

**PawPal** là sự giao thoa hoàn hảo giữa một trang thương hiệu giàu cảm xúc (gửi gắm sự tận tâm, an tâm tuyệt đối, nhật ký hình ảnh sống động) và một nền tảng dịch vụ tiện ích cao cấp dành cho thế hệ chủ nuôi hiện đại (Gen Z, Millennials). 

Dự án được xây dựng với mục tiêu tối thượng là xóa bỏ sự lo lắng của chủ nuôi khi gửi gắm thú cưng, thông qua sự minh bạch hóa quy trình chăm sóc và tối ưu hóa luồng trải nghiệm số.

---

## 🌟 Tính Năng Nổi Bật

- **Quản lý Hồ sơ Thú cưng (Pet ID):** Lưu trữ thông tin chi tiết, tiểu sử sức khỏe và lịch trình chăm sóc của từng bé cún/mèo.
- **Hệ thống Đặt lịch Dịch vụ Thông minh (Smart Booking):** Luồng đặt lịch không ma sát cho các dịch vụ chăm sóc, spa, và khách sạn thú cưng.
- **Nhật ký Số Real-time (Transparency Care Log):** Theo dõi trạng thái sinh hoạt, hình ảnh của thú cưng theo thời gian thực khi đang gửi tại cửa hàng.
- **Cửa hàng Mua sắm Tiện lợi (Pet Shop & Checkout):** Trải nghiệm mua sắm phụ kiện, thức ăn dinh dưỡng cao cấp được thiết kế tinh tế.
- **Trang Quản trị (Admin Panel):** Quản lý trạng thái đơn hàng, thông tin khách hàng, quản lý danh sách dịch vụ và sản phẩm.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Yêu cầu hệ thống
- Máy tính đã cài đặt [Node.js](https://nodejs.org/) (Khuyến nghị bản LTS).
- Công cụ Git để tải mã nguồn.

### 2. Các bước cài đặt
Mở terminal và thực hiện các lệnh sau:

```bash
# Clone repository này về máy cá nhân
git clone https://github.com/username/Pawpal.git

# Di chuyển vào thư mục dự án
cd Pawpal

# Cài đặt các thư viện phụ thuộc
npm install
```

### 3. Cách chạy dự án
Vì PawPal là một dự án giao diện tĩnh (Static Web App), bạn có thể chạy dự án vô cùng đơn giản:
- **Sử dụng Live Server (Khuyên dùng):** Nếu bạn dùng VS Code, hãy cài đặt extension **Live Server**, click chuột phải vào file `index.html` và chọn **Open with Live Server**. Giao diện sẽ tự động cập nhật mỗi khi bạn lưu file.
- **Mở trực tiếp:** Mở file `index.html` bằng trình duyệt web bất kỳ.
- **Sử dụng Live Server CLI:** Chạy lệnh `npx serve` hoặc cài đặt package `npm install -g serve` để chạy một local server nhẹ nhàng tại root.

---

## 🎨 Ngôn Ngữ Thiết Kế & Nhận Diện Thương Hiệu

PawPal đi theo phong cách **Hybrid (Brand & Product-centric)**, tập trung vào trải nghiệm cảm xúc ấm áp nhưng vẫn đảm bảo sự nhanh gọn, tiện lợi của sản phẩm công nghệ.

- **Bảng màu cốt lõi (Core Palette):**
  - Primary (`#1a4332` / `hsl(156, 36%, 26%)`): Forest Green - Xanh lục bảo sang trọng, biểu trưng cho sự uy tín, tin cậy.
  - Accent (`#f39c12` / `hsl(38, 77%, 57%)`): Gold/Yellow - Vàng ấm rực rỡ làm điểm nhấn cảm xúc.
  - Background Light (`#FAF9F6`): Warm Cream - Màu kem ấm áp tạo cảm giác dễ chịu thay vì màu trắng toát lâm sàng.
- **Typography:**
  - Tiêu đề (Headings): `Playfair Display` (Serif cổ điển, nghệ thuật và sang trọng).
  - Nội dung (Body Text): `Plus Jakarta Sans` (Sans-serif hiện đại, rõ ràng, hỗ trợ tối ưu hiển thị tiếng Việt).
- **Chất liệu giao diện:**
  - Double-Bezel Glassmorphism (hiệu ứng kính mờ hai lớp) tạo chiều sâu.
  - Các góc bo tròn lớn (`24px` cho card lớn, `16px` cho card trung bình).
  - Micro-animations & Haptic hover (hiệu ứng phản hồi đàn hồi tinh tế khi tương tác).

---

## 📁 Cấu Trúc Thư Mục Dự Án

Cấu trúc thư mục được tổ chức khoa học theo từng nhóm chức năng, tối ưu hóa cho bảo trì và SEO:

```text
Pawpal/
├── index.html                   # Landing page chính của dự án (tọa lạc tại root)
├── package.json                 # Quản lý dependencies (Bootstrap 5.3)
├── README.md                    # Tài liệu hướng dẫn này
├── RESTRUCTURE_SUMMARY.md       # Nhật ký tóm tắt cấu trúc tái cấu trúc
│
├── pages/                       # Tất cả trang chức năng HTML
│   ├── admin/                   # Trang quản trị dành cho nhân viên/admin
│   │   └── index.html
│   ├── user/                    # Trang chức năng dành cho khách hàng đã đăng nhập
│   │   ├── dashboard.html       (quản lý chung)
│   │   ├── orders.html          (lịch sử đặt dịch vụ/mua hàng)
│   │   ├── order-detail.html    (chi tiết đơn hàng & nhật ký thời gian thực)
│   │   ├── pet-archive.html     (danh sách thú cưng)
│   │   └── pet-form.html        (thêm/sửa hồ sơ thú cưng)
│   ├── shop/                    # Phân hệ mua sắm
│   │   ├── shop.html            (cửa hàng sản phẩm)
│   │   └── checkout.html        (thanh toán đơn hàng)
│   ├── services/                # Phân hệ dịch vụ
│   │   ├── services.html        (danh sách dịch vụ)
│   │   └── booking.html         (luồng đặt chỗ dịch vụ)
│   └── public/                  # Các trang giới thiệu và công khai
│       ├── about.html           (về chúng tôi)
│       ├── blog.html            (cẩm nang nuôi dạy thú cưng)
│       ├── contact.html         (liên hệ & hỗ trợ)
│       └── login.html           (đăng nhập/đăng ký tài khoản)
│
├── assets/                      # Tài nguyên tĩnh của hệ thống
│   ├── css/                     (tập tin stylesheet và hệ thống design tokens)
│   ├── js/                      (tập tin Javascript xử lý logic và UI)
│   └── images/                  (hình ảnh sản phẩm, minh họa dịch vụ)
│
├── scripts/                     # Các công cụ hỗ trợ phát triển (Node.js)
│   ├── sync_headers.js          (đồng bộ header từ index.html sang tất cả trang con)
│   ├── sync_footers.js          (đồng bộ footer từ index.html sang tất cả trang con)
│   └── update-nav.js            (tự động cập nhật đường dẫn điều hướng)
│
└── Docs/                        # Kho lưu trữ tài liệu dự án chi tiết
    ├── requirements.md          (yêu cầu nghiệp vụ)
    ├── DESIGN.md                (chi tiết thiết kế UI/UX)
    ├── PRODUCT.md               (định hướng sản phẩm)
    ├── backlog.md               (danh sách công việc)
    ├── STRUCTURE.md             (chi tiết cấu trúc đường dẫn liên kết)
    ├── dichvu.csv               (dữ liệu dịch vụ mẫu)
    └── sanpham.csv              (dữ liệu sản phẩm mẫu)
```

---

## 🔧 Công Cụ Phát Triển (Utilities)

Dự án tích hợp một số tập lệnh tự động hóa hỗ trợ đồng bộ giao diện đồng nhất:

### Đồng bộ Header & Footer
Khi bạn có thay đổi ở thanh điều hướng (Header) hoặc chân trang (Footer) trên file `index.html` gốc, hãy chạy lệnh sau để đồng bộ tự động sang tất cả các trang HTML con nằm trong thư mục `pages/`:

```bash
# Đồng bộ header
node scripts/sync_headers.js

# Đồng bộ footer
node scripts/sync_footers.js
```

---

## 📐 Chiến Lược Responsive

PawPal ưu tiên tối đa cho trải nghiệm di động (**Mobile-first content priority**):
- **Framework:** Sử dụng hệ thống Grid và các class Responsive của **Bootstrap 5.3** kết hợp tùy biến CSS thuần.
- **Kích thước nút bấm:** Mọi phần tử tương tác trên Mobile đảm bảo touch target tối thiểu là `44px x 44px`.
- **Hiển thị thông tin:** Đảm bảo không ẩn các thông tin thiết yếu (CTA, giá tiền, tên dịch vụ) trên giao diện điện thoại.
