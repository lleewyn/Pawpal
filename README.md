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
|-- api/
|   `-- chat.js              # Endpoint backend xử lý Chatbot AI (nếu có)
|
|-- components/              # Các UI Component độc lập tái sử dụng
|   |-- fab/                 # Nút Floating Action Button (Mở Chatbot/Hỗ trợ)
|   |   |-- fab.css          # Style CSS của nút FAB
|   |   |-- fab.html         # Khung giao diện HTML của nút
|   |   `-- fab.js           # Logic hiển thị và bắt sự kiện click
|   |-- footer/              # Chân trang (Footer)
|   |   |-- footer.css       # Định dạng chân trang
|   |   |-- footer.html      # Nội dung các cột link, logo chân trang
|   |   `-- footer.js        # Script xử lý ở chân trang
|   |-- header/              # Thanh điều hướng chính (Header)
|   |   |-- header.css       # Style cho thanh menu, thanh tìm kiếm
|   |   |-- header.html      # HTML của thanh navbar, logo, biểu tượng giỏ hàng
|   |   `-- header.js        # Logic mở dropdown, kiểm tra đăng nhập trên header
|   `-- user-sidebar/        # Thanh điều hướng dọc của khách hàng (Sidebar)
|       |-- user-sidebar.css # Style Sidebar
|       |-- user-sidebar.html# HTML các menu (Tổng quan, Đơn hàng, Thú cưng...)
|       `-- user-sidebar.js  # Script tô màu (active) menu đang được chọn
|
|-- data/                    # Thư mục chứa dữ liệu tĩnh Mock/Seed (JSON, CSV)
|   `-- (pets.json, dichvu.csv, sanpham.csv, orders.json,...)
|
|-- pages/                   # Giao diện chính của ứng dụng
|   |-- admin/               # Phân hệ dành cho Quản trị viên
|   |-- public/              # Các trang công khai (Không cần đăng nhập)
|   |   |-- about/           # Trang Giới thiệu về Pawpal
|   |   |   |-- about.css
|   |   |   `-- about.html
|   |   |-- blog/            # Trang danh sách bài viết/Cẩm nang
|   |   |   |-- blog.css
|   |   |   |-- blog.html
|   |   |   `-- blog.js
|   |   |-- blog-detail/     # Xem chi tiết 1 bài viết Blog
|   |   |   |-- blog-detail.css
|   |   |   |-- blog-detail.html
|   |   |   `-- blog-detail.js
|   |   |-- contact/         # Trang Liên hệ & Bản đồ
|   |   |   |-- contact.css
|   |   |   |-- contact.html
|   |   |   `-- contact.js
|   |   |-- landing/         # Trang chủ chính (Landing Page)
|   |   |   |-- landing.css
|   |   |   |-- landing.html
|   |   |   `-- landing.js
|   |   |-- login/           # Trang Đăng nhập & Đăng ký
|   |   |   |-- login.css
|   |   |   |-- login.html
|   |   |   `-- login.js
|   |   `-- return-guest/    # Trang tra cứu đơn đổi trả dành cho khách vãng lai
|   |       |-- return-guest.css
|   |       |-- return-guest.html
|   |       `-- return-guest.js
|   |-- services/            # Phân hệ Dịch vụ & Đặt lịch (Spa, Hotel)
|   |   |-- services.css     # Style cho danh mục dịch vụ
|   |   |-- services.html    # Trang hiển thị danh sách các gói dịch vụ
|   |   |-- services.js      # Fetch data và render dịch vụ
|   |   |-- booking/         # Luồng điền thông tin đặt lịch
|   |   |   |-- booking.css
|   |   |   |-- booking.html
|   |   |   `-- booking.js
|   |   |-- booking-success/ # Trang thông báo sau khi đặt lịch thành công
|   |   |   |-- booking-success.css
|   |   |   |-- booking-success.html
|   |   |   `-- booking-success.js
|   |   `-- service-detail/  # Trang thông tin chi tiết 1 dịch vụ
|   |       |-- service-detail.css
|   |       |-- service-detail.html
|   |       `-- service-detail.js
|   |-- shop/                # Phân hệ Cửa hàng (Mua sắm sản phẩm)
|   |   |-- payment-result.css # Style hiển thị kết quả giao dịch chung
|   |   |-- shop.css         # Style trang danh sách sản phẩm
|   |   |-- shop.html        # Trang cửa hàng tổng hợp (Shop)
|   |   |-- shop.js          # Logic lọc, tìm kiếm, fetch sản phẩm
|   |   |-- cart/            # Trang quản lý Giỏ hàng
|   |   |   |-- cart.css
|   |   |   |-- cart.html
|   |   |   `-- cart.js
|   |   |-- checkout/        # Trang thanh toán đơn hàng (Checkout)
|   |   |   |-- checkout.css
|   |   |   |-- checkout.html
|   |   |   |-- checkout.js
|   |   |   `-- payment-qr.css # Style cho modal QR Code thanh toán
|   |   |-- payment-failed/  # Trang thông báo Thanh toán thất bại
|   |   |   |-- payment-failed.css
|   |   |   |-- payment-failed.html
|   |   |   `-- payment-failed.js
|   |   |-- payment-success/ # Trang thông báo Thanh toán thành công
|   |   |   |-- payment-success.css
|   |   |   |-- payment-success.html
|   |   |   `-- payment-success.js
|   |   `-- product-detail/  # Xem chi tiết 1 sản phẩm cụ thể
|   |       |-- product-detail.css
|   |       |-- product-detail.html
|   |       |-- product-detail.js
|   |       `-- product-reviews.js # Xử lý tính năng Đánh giá sản phẩm (Review)
|   `-- user/                # Phân hệ Quản lý tài khoản 
|       |-- dashboard-init.js # Khởi tạo dữ liệu cho luồng user dashboard
|       |-- return-handler.js # Module xử lý đổi trả hàng hóa
|       |-- review-handler.js # Module xử lý đánh giá sản phẩm/dịch vụ
|       |-- support.css       # Style cho tính năng Gửi yêu cầu hỗ trợ 
|       |-- booking-detail/  # Chi tiết một đơn đặt lịch chăm sóc
|       |   |-- booking-detail.css
|       |   |-- booking-detail.html
|       |   `-- booking-detail.js
|       |-- bookings/        # Danh sách lịch sử các lần đặt lịch
|       |   |-- bookings.css
|       |   |-- bookings.html
|       |   `-- bookings.js
|       |-- dashboard/       # Trang Tổng quan tài khoản (Dashboard chính)
|       |   |-- dashboard.css
|       |   |-- dashboard.html
|       |   `-- dashboard.js
|       |-- loyalty/         # Hệ thống hạng thành viên & Đổi điểm (Paw Points)
|       |   |-- loyalty.css
|       |   |-- loyalty.html
|       |   `-- loyalty.js
|       |-- order-detail/    # Xem chi tiết lịch trình 1 đơn hàng đã mua
|       |   |-- order-detail.css
|       |   |-- order-detail.html
|       |   |-- order-detail.js
|       |   `-- return-form.css # Form điền lý do khi nhấn nút Trả hàng
|       |-- orders/          # Danh sách lịch sử mua hàng
|       |   |-- orders.css
|       |   |-- orders.html
|       |   `-- orders.js
|       |-- pet-diary/       # Sổ Nhật ký sức khỏe/chăm sóc thú cưng
|       |   |-- pet-diary-init.js
|       |   |-- pet-diary.css
|       |   |-- pet-diary.html
|       |   `-- pet-diary.js
|       |-- pet-profile/     # Quản lý danh sách Thú cưng cá nhân
|       |   |-- pet-add.css  # Form Thêm mới Thú cưng
|       |   |-- pet-add.js
|       |   |-- pet-form.css # CSS form cập nhật thông tin thú cưng
|       |   |-- pet-profile-init.js
|       |   |-- pet-profile-page.js
|       |   |-- pet-profile.css
|       |   |-- pet-profile.html
|       |   `-- pet-profile.js
|       |-- return-detail/   # Xem tiến trình xử lý một yêu cầu Trả hàng
|       |   |-- return-detail.css
|       |   |-- return-detail.html
|       |   `-- return-detail.js
|       |-- settings/        # Cài đặt tài khoản (Đổi mật khẩu, Sửa Profile)
|       |   |-- settings.css
|       |   |-- settings.html
|       |   `-- settings.js
|       |-- support-create/  # Tạo mới một Yêu cầu Hỗ trợ (Ticket)
|       |   `-- support-create.html
|       |-- support-tickets/ # Lịch sử các Ticket đã gửi cho admin
|       |   |-- support-tickets.css
|       |   |-- support-tickets.html
|       |   `-- support-tickets.js
|       `-- wishlist/        # Trang chứa Sản phẩm/Dịch vụ Yêu thích
|           |-- wishlist.css
|           |-- wishlist.html
|           `-- wishlist.js
|
|-- scripts/                 # Core Logic JavaScript của toàn bộ dự án
|   |-- api/                 # Thư mục xử lý Database và Backend APIs
|   |   |-- api-global.js    # Khai báo biến toàn cục liên quan đến API
|   |   |-- api.js           # Lớp Data Access thực thi truy vấn tới Supabase
|   |   |-- chat.js          # Giao tiếp LLM trả lời khách hàng
|   |   |-- index.js         # Export file
|   |   |-- petService.js    # Module API tách biệt chuyên xử lý cho Pet
|   |   `-- supabase-client.js # Khởi tạo & nạp key kết nối Supabase
|   |-- rag/                 # RAG/AI Data Logic
|   |   |-- embed_data.js    # Script node js chuyển text thành Vector AI
|   |   |-- fix_vector_dimensions.sql # Script DB sửa lỗi độ dài Vector
|   |   `-- setup_vector_db.sql # Script DB tạo bảng Vector Match
|   `-- shared/              # Script và Thư viện Dùng chung 
|       |-- auth.js          # Hệ thống Quản lý Đăng nhập & Phiên (Session)
|       |-- components.js    # Xử lý Load Header/Footer/Sidebar tĩnh bằng JS
|       |-- data-loader.js   # Module nạp dữ liệu từ File JSON (nếu không dùng DB)
|       |-- main.js          # Core Script chạy đầu tiên khi mở web
|       |-- notifications-handler.js # Xử lý Hiển thị thông báo (Toast)
|       `-- support-handler.js # Module tiện ích dùng cho CSKH
|
|-- styles/                  # Định dạng giao diện CSS
|   `-- style.css            # Tập tin CSS duy nhất, kết hợp style toàn trang
|
|-- assets/                  # Tài nguyên tĩnh
|   `-- images/              # Kho Hình ảnh minh họa, Logo, Icon, Banner
|
|-- Docs/                    # Chứa tài liệu System Design, Đặc tả kỹ thuật
|-- index.html               # Entry point (Thường redirect ngay sang Landing page)
|-- server.js                # Code Node.js Express server chạy local backend
`-- package.json             # File cấu hình NPM (scripts npm run dev, cài đặt lib)
```

---

## 🎨 Ngôn Ngữ Thiết Kế

PawPal sử dụng ngôn ngữ thiết kế **Hybrid (Brand & Product-centric)**:
- **Màu sắc chủ đạo:** Xanh lục bảo (Forest Green - `#1a4332`), Vàng nhấn (Gold/Yellow - `#f39c12`), Kem nhạt (Warm Cream - `#FAF9F6`).
- **Typography:** `Playfair Display` (tiêu đề sang trọng) và `Plus Jakarta Sans` (nội dung hiện đại).
- **Trải nghiệm:** Glassmorphism (hiệu ứng kính mờ), bo góc mềm mại, micro-animations tương tác mượt mà.

---

*Bản quyền © 2026 PawPal Team.*
