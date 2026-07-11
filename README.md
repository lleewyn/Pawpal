# 🐾 PawPal - Premium Pet Care Platform

[![Tech Stack](https://img.shields.io/badge/tech--stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Node.js%20%7C%20Supabase-blue.svg)](#)

**PawPal** là một nền tảng chăm sóc thú cưng cao cấp, kết hợp giữa cửa hàng mua sắm tiện lợi và dịch vụ chăm sóc thú cưng hiện đại. PawPal tập trung vào trải nghiệm người dùng tối ưu, giao diện sang trọng, và các tính năng minh bạch giúp chủ nuôi an tâm tuyệt đối khi gửi gắm thú cưng.

---

## 🌟 Tính Năng Nổi Bật

- 🛒 **Cửa hàng thú cưng (Pet Shop):** Mua sắm thức ăn, phụ kiện với giỏ hàng và danh sách yêu thích được đồng bộ thời gian thực qua cơ sở dữ liệu.
- 📅 **Đặt lịch dịch vụ (Smart Booking):** Đặt lịch Spa, Khách sạn thú cưng, Khám sức khỏe dễ dàng.
- 🐶 **Hồ sơ thú cưng (Pet ID):** Quản lý chi tiết thú cưng, theo dõi tình trạng sức khỏe, nhật ký chăm sóc (Transparency Care Log).
- 🎁 **Khách hàng thân thiết (Loyalty):** Tích điểm, đổi voucher, và các hạng thành viên (PawPass).
- 🔐 **Bảo mật & Đồng bộ:** Xác thực người dùng, đồng bộ dữ liệu giỏ hàng, wishlist và đơn hàng trực tiếp lên Supabase.
- ⚙️ **Quản trị hệ thống (Admin):** Bảng điều khiển dành cho nhân viên quản lý đơn hàng, dịch vụ, chăm sóc khách hàng và cập nhật nhật ký thú cưng.

---

## 🚀 Công Nghệ Sử Dụng

- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Bootstrap 5.3
- **Backend/Database:** Node.js (Express), Supabase (PostgreSQL), JWT Authentication
- **Kiến trúc:** Client-Server, tích hợp Supabase SDK.

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Yêu cầu hệ thống
- Máy tính đã cài đặt [Node.js](https://nodejs.org/) (phiên bản v18 trở lên).
- Cài đặt Git.
- Môi trường cơ sở dữ liệu Supabase.

### 2. Cài đặt và thiết lập
Mở terminal và thực thi các lệnh sau:

```bash
# 1. Clone repository về máy
git clone https://github.com/lleewyn/Pawpal.git

# 2. Di chuyển vào thư mục dự án
cd Pawpal

# 3. Cài đặt các thư viện phụ thuộc
npm install

# 4. Cấu hình biến môi trường
# Tạo file .env ở thư mục gốc và cung cấp các thông số kết nối Supabase
# SUPABASE_URL=...
# SUPABASE_KEY=...
```

### 3. Chạy dự án
Dự án có đi kèm với một Express Server (`server.js`) đóng vai trò vừa phục vụ file tĩnh vừa có thể mở rộng làm API trung gian.

```bash
# Khởi chạy server development
npm run dev
```

Truy cập hệ thống tại: `http://localhost:3000`

---

## 📁 Cấu Trúc Thư Mục Chính

```text
Pawpal/
|-- components/              # Các component HTML tái sử dụng dùng chung
|   |-- header.html          # Thanh điều hướng chính
|   |-- footer.html          # Chân trang
|   |-- user-sidebar.html    # Thanh sidebar cho phân hệ user
|   `-- fab.html             # Nút Floating Action Button
|
|-- pages/                   # Giao diện HTML của dự án
|   |-- admin/               # Dành cho Quản trị viên & Nhân viên (Quản lý đơn hàng, user, logs)
|   |-- public/              # Dành cho Khách (Landing page, Đăng nhập, Giới thiệu, Blog)
|   |-- services/            # Dành cho Dịch vụ (Danh sách dịch vụ Spa/Hotel, Booking chi tiết)
|   |-- shop/                # Cửa hàng (Sản phẩm, Giỏ hàng, Checkout, Chi tiết sản phẩm)
|   `-- user/                # Dành cho Khách hàng đã đăng nhập
|       |-- dashboard/       # Bảng điều khiển cá nhân
|       |-- orders/          # Lịch sử đơn hàng, chi tiết đơn hàng
|       |-- pet-profile/     # Quản lý hồ sơ và sổ sức khỏe thú cưng
|       |-- wishlist/        # Danh sách yêu thích
|       `-- loyalty/         # Hệ thống tích điểm & thành viên
|
|-- scripts/                 # Logic JavaScript của ứng dụng
|   |-- api/                 # Kết nối và thao tác với Supabase Database (api.js)
|   |-- shared/              # Tiện ích dùng chung (main.js, auth.js, data-loader.js,...)
|   |-- auth/                # Xử lý đăng nhập, xác thực JWT, phân quyền
|   `-- sync_static.js       # Script Node.js đồng bộ component tĩnh (header/footer)
|
|-- styles/                  # Định dạng CSS theo kiến trúc module
|   |-- tokens/              # Chứa các biến CSS cốt lõi (colors.css, spacing.css, typography.css)
|   |-- components/          # CSS cho từng component (button.css, modal.css, nav.css,...)
|   |-- pages/               # CSS đặc thù cho từng trang (shop, user, admin,...)
|   `-- style.css            # File CSS tổng hợp (được tự động biên dịch)
|
|-- assets/                  # Tài nguyên tĩnh
|   |-- images/              # Hình ảnh sản phẩm, dịch vụ, banner
|   `-- icons/               # SVG/Icons
|
|-- Docs/                    # Tài liệu đặc tả kỹ thuật, UI/UX, hướng dẫn phát triển
|-- server.js                # Server Node.js (Express) để chạy app local và mock API
`-- package.json             # Quản lý thư viện và scripts (npm run dev, npm run sync)
```

---

## 🎨 Ngôn Ngữ Thiết Kế

PawPal sử dụng ngôn ngữ thiết kế **Hybrid (Brand & Product-centric)**:
- **Màu sắc chủ đạo:** Xanh lục bảo (Forest Green - `#1a4332`), Vàng nhấn (Gold/Yellow - `#f39c12`), Kem nhạt (Warm Cream - `#FAF9F6`).
- **Typography:** `Playfair Display` (tiêu đề sang trọng) và `Plus Jakarta Sans` (nội dung hiện đại).
- **Trải nghiệm:** Glassmorphism (hiệu ứng kính mờ), bo góc mềm mại, micro-animations tương tác mượt mà.

---

*Bản quyền © 2026 PawPal Team.*
