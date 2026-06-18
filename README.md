# 🐾 PawPal - Premium Pet Care Platform

[![Status](https://img.shields.io/badge/status-active-success.svg)](#)
[![Tech Stack](https://img.shields.io/badge/tech--stack-HTML%20%7C%20CSS%20%7C%20JS%20%7C%20Bootstrap%205.3-blue.svg)](#)


> [!IMPORTANT]
> **⚠️ QUY ĐỊNH PHÁT TRIỂN (DEVELOPER GUIDELINES):**
> 1. **Bắt buộc đọc và tuân thủ [DESIGN.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/DESIGN.md):** Mọi thiết kế UI/UX mới hoặc sửa đổi phải khớp với quy chuẩn thiết kế cao cấp đã định vị trong tài liệu này (bảng màu, font chữ, các góc bo tròn, chất liệu kính mờ).
> 2. **Chú ý khoảng cách giữa các thành phần (Spacing & Layout):** Cần kiểm soát kỹ margin/padding từ hệ thống token `spacing.css`. Tránh thiết kế ad-hoc dẫn đến lỗi khoảng cách (spacing) quá lớn làm loãng giao diện hoặc lệch bố cục.
> 3. **Cơ chế dùng chung Components (Header, Footer, User Sidebar):** Các thành phần `header.html`, `footer.html`, `user-sidebar.html` đang được dùng chung và tự động nhúng qua script `npm run sync`. Chỉ chỉnh sửa tại thư mục nguồn `/components/`, không sửa trực tiếp ở trang con. Sau khi sửa, **bắt buộc chạy `npm run sync`** để cập nhật toàn bộ trang con và kiểm tra đứt gãy đường dẫn.

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
- Máy tính đã cài đặt [Node.js](https://nodejs.org/) (Khuyên dùng bản LTS).
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

### 3. Cách chạy dự án & Lệnh khả dụng
Hệ thống sử dụng các script tự động hóa trong [package.json](file:///d:/Aboutme/MyProject/Pawpal/package.json) để hỗ trợ biên dịch và chạy ứng dụng:

- **Đồng bộ hóa component tĩnh & CSS (`npm run sync`):**
  Lệnh này thực thi script [sync_static.js](file:///d:/Aboutme/MyProject/Pawpal/scripts/sync_static.js). Nó sẽ tự động gộp các file CSS riêng lẻ thành một file CSS đồng nhất và nhúng tự động nội dung của `header.html` & `footer.html` vào tất cả các trang con.
- **Chạy local server phục vụ phát triển (`npm run dev`):**
  Lệnh này sẽ khởi chạy một máy chủ local nhẹ thông qua `npx serve` tại địa chỉ `http://localhost:3000`. Khi bạn mở trang này, trình duyệt sẽ tự động cập nhật hoặc hỗ trợ load chính xác tài nguyên dự án theo đúng đường dẫn tuyệt đối/tương đối.
- **Xây dựng bản build tĩnh (`npm run build`):**
  Đồng bộ lại toàn bộ mã nguồn tĩnh trước khi triển khai (deploy).

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
├── index.html                   # Chuyển hướng tức thời đến trang landing
├── package.json                 # Quản lý script biên dịch & thư viện (Bootstrap 5.3)
├── README.md                    # Tài liệu hướng dẫn này
│
├── components/                  # Chứa các thành phần HTML tái sử dụng dùng chung
│   ├── header.html              # Thanh điều hướng chuẩn hóa của dự án
│   ├── footer.html              # Chân trang chuẩn hóa
│   ├── fab.html                 # Nút Floating Action Button tương tác nhanh
│   └── user-sidebar.html        # Thanh điều hướng Dashboard của khách hàng
│
├── pages/                       # Tất cả trang giao diện HTML tĩnh
│   ├── public/                  # Các trang giới thiệu và công khai
│   │   ├── landing.html         # Trang chủ chính thức giới thiệu dịch vụ
│   │   ├── login.html           # Trang đăng nhập và đăng ký tích hợp
│   │   ├── about.html           # Trang giới thiệu đội ngũ & tầm nhìn
│   │   ├── blog.html            # Cẩm nang chia sẻ kinh nghiệm chăm thú cưng
│   │   ├── contact.html         # Trang liên hệ & hỗ trợ khách hàng
│   │   └── return-guest.html    # Trang chào mừng người dùng quay lại
│   ├── user/                    # Trang chức năng dành cho khách hàng
│   │   ├── booking-detail.html  # Chi tiết thông tin đặt lịch dịch vụ
│   │   ├── bookings.html        # Lịch sử đặt dịch vụ của người dùng
│   │   ├── dashboard.html       # Bảng điều khiển quản lý chung
│   │   ├── loyalty.html         # Giao diện tích điểm đổi quà (Loyalty Program)
│   │   ├── order-detail.html    # Chi tiết đơn hàng và Nhật ký chăm sóc Realtime (Transparency Care Log)
│   │   ├── orders.html          # Lịch sử và trạng thái đặt dịch vụ/mua hàng
│   │   ├── pet-archive.html     # Quản lý danh sách thú cưng của tôi
│   │   ├── pet-diary.html       # Nhật ký sinh hoạt chi tiết của thú cưng
│   │   ├── pet-form.html        # Thêm mới / cập nhật hồ sơ thú cưng
│   │   ├── pet-profile.html     # Xem chi tiết hồ sơ cá nhân thú cưng
│   │   ├── return-detail.html   # Xem chi tiết thông tin phản hồi/trả phòng
│   │   ├── support-create.html  # Form gửi yêu cầu hỗ trợ (Support Ticket)
│   │   ├── support-tickets.html # Xem danh sách vé hỗ trợ
│   │   └── wishlist.html        # Danh sách sản phẩm/dịch vụ yêu thích
│   ├── shop/                    # Phân hệ mua sắm trực tuyến
│   │   ├── cart.html            # Giao diện giỏ hàng của bạn
│   │   ├── checkout.html        # Giao diện thanh toán & giỏ hàng
│   │   ├── payment-failed.html  # Trang thông báo giao dịch thất bại
│   │   ├── payment-success.html # Trang thông báo giao dịch thành công
│   │   ├── product-detail.html  # Giao diện chi tiết thông tin sản phẩm
│   │   └── shop.html            # Cửa hàng phụ kiện & dinh dưỡng thú cưng
│   ├── services/                # Phân hệ đặt dịch vụ
│   │   ├── services.html        # Danh sách dịch vụ chi tiết (Spa, Khách sạn, Khám sức khỏe)
│   │   └── booking.html         # Luồng đặt lịch dịch vụ thông minh từng bước
│   └── admin/                   # Trang quản trị dành cho nhân viên / quản lý
│       ├── bookings.html        # Quản lý thông tin đặt lịch toàn bộ hệ thống
│       ├── care-log.html        # Ghi và cập nhật nhật ký chăm sóc thú cưng
│       ├── index.html           # Dashboard quản trị chính dịch vụ, đơn hàng và doanh số
│       ├── orders.html          # Quản lý toàn bộ đơn hàng
│       ├── products.html        # Quản lý sản phẩm trong shop
│       └── users.html           # Quản lý danh sách người dùng hệ thống
│
├── assets/                      # Tài nguyên tĩnh của hệ thống
│   ├── css/                     # Toàn bộ stylesheet của dự án
│   │   ├── admin/
│   │   │   └── admin.css        # Định dạng trang Admin
│   │   ├── tokens/              # Các biến thiết kế (màu sắc, khoảng cách, typo)
│   │   │   ├── colors.css
│   │   │   ├── spacing.css
│   │   │   └── typography.css
│   │   ├── components/          # CSS cho từng thành phần giao diện
│   │   │   ├── button.css
│   │   │   ├── chat.css
│   │   │   ├── fab.css
│   │   │   ├── filter.css
│   │   │   ├── footer.css
│   │   │   ├── modal.css
│   │   │   ├── nav.css
│   │   │   ├── notification.css
│   │   │   ├── return-form.css
│   │   │   └── review-form.css
│   │   ├── public/              # CSS chuyên biệt cho các trang công khai
│   │   │   ├── about.css
│   │   │   ├── blog.css
│   │   │   ├── contact.css
│   │   │   ├── help-center.css
│   │   │   ├── landing.css
│   │   │   ├── login.css
│   │   │   └── return-guest.css
│   │   ├── services/            # CSS liên quan tới dịch vụ
│   │   │   ├── booking.css
│   │   │   └── services.css
│   │   ├── shop/                # CSS liên quan tới cửa hàng
│   │   │   ├── cart.css
│   │   │   ├── checkout.css
│   │   │   ├── payment-result.css
│   │   │   ├── product-detail.css
│   │   │   └── shop.css
│   │   ├── user/                # CSS liên quan tới dashboard khách hàng
│   │   │   ├── bookings.css
│   │   │   ├── dashboard.css
│   │   │   ├── loyalty.css
│   │   │   ├── order-detail.css
│   │   │   ├── orders.css
│   │   │   ├── pet-archive.css
│   │   │   ├── pet-diary.css
│   │   │   ├── pet-form.css
│   │   │   ├── return-detail.css
│   │   │   ├── support.css
│   │   │   └── wishlist.css
│   │   └── style.css            # File CSS tổng hợp cuối cùng (tự động biên dịch)
│   ├── js/                      # File điều khiển JavaScript
│   │   ├── shared/              # Thư viện dùng chung
│   │   │   ├── auth-backup-old.js
│   │   │   ├── auth.js
│   │   │   ├── components.js
│   │   │   ├── data-loader.js
│   │   │   ├── header-auth.js
│   │   │   └── main.js
│   │   └── ...                  # JS chuyên biệt cho từng trang (shop, user, services, public...)
│   └── images/                  # Thư viện hình ảnh
│
├── scripts/                     # Scripts tự động hóa Node.js hỗ trợ phát triển
│   ├── add-auth-script.js       # Thêm script bảo vệ xác thực
│   ├── fix-cross-links.js       # Sửa các liên kết chéo giữa các trang
│   ├── fix-paths-after-restructure.js # Sửa đường dẫn tài nguyên sau tái cấu trúc
│   ├── fix_logos.py             # Sửa hiển thị logo
│   ├── restructure_css.js       # Tổ chức lại cấu trúc thư mục CSS
│   ├── sync_static.js           # Core script đồng bộ HTML components & biên dịch CSS
│   └── update-nav.js            # Tự động hóa cập nhật liên kết thanh menu
│
└── Docs/                        # Kho tài liệu đặc tả của dự án
    ├── DESIGN.md                # Tài liệu đặc tả phong cách thiết kế UI/UX
    ├── Dinhhuong.txt            # Tài liệu định hướng sản phẩm gốc
    ├── PRODUCT.md               # Tài liệu sản phẩm rút gọn
    ├── bad_icons_example.png    # Ví dụ về các icon lỗi/không nên dùng
    ├── plan_user_stories.md     # Kế hoạch phát triển các kịch bản người dùng
    ├── quytrinh.md              # Quy trình vận hành & tích hợp hệ thống
    ├── wireframe-checkout.md    # Wireframe luồng thanh toán
    ├── wireframe-order-management.md # Wireframe quản lý đơn hàng
    ├── wireframe-reviews.md     # Wireframe khu vực review của khách hàng
    └── wireframe-shop.md        # Wireframe trang cửa hàng sản phẩm
```

---

## 🛠️ Chi Tiết Cơ Chế Hoạt Động Của Source Code

### 1. Đồng Bộ Component Tĩnh (HTML Component Injection)
Dự án được xây dựng dưới dạng Static HTML nhằm tối ưu hóa SEO và thời gian tải trang, đồng thời giảm phụ thuộc vào các framework phức tạp. Tuy nhiên, để tránh việc phải sửa thủ công hàng chục tệp tin khi thay đổi Header hoặc Footer, script [sync_static.js](file:///d:/Aboutme/MyProject/Pawpal/scripts/sync_static.js) được tích hợp để giải quyết vấn đề này:

* **Tệp nguồn:** Các component chung được tách biệt hoàn toàn tại thư mục [components/](file:///d:/Aboutme/MyProject/Pawpal/components/).
* **Nguyên lý nhúng:** Script sử dụng Regular Expression để định vị các khối thẻ tương ứng trong toàn bộ các tệp HTML con của thư mục [pages/](file:///d:/Aboutme/MyProject/Pawpal/pages/):
  * Định vị vùng `<header class="main-header" id="mainHeader">...</header>` và thay thế toàn bộ phần ruột bằng nội dung của [header.html](file:///d:/Aboutme/MyProject/Pawpal/components/header.html).
  * Định vị vùng `<footer class="main-footer" id="contact">...</footer>` và thay thế toàn bộ phần ruột bằng nội dung của [footer.html](file:///d:/Aboutme/MyProject/Pawpal/components/footer.html).
* **Chuẩn hóa đường dẫn tương đối:** Script tự động chuyển đổi các đường dẫn gốc `/pages/` hay `/assets/` trong file component thành các đường dẫn tương đối tương ứng `../../pages/` và `../../assets/` phù hợp với cấu trúc phân cấp thư mục của từng trang con để tránh lỗi liên kết đứt gãy.
* **Làm sạch Layout:** Loại bỏ các container thừa như Notification bar hoặc Toast container bị trùng lặp ở ngoài component để mã nguồn được sạch sẽ nhất.

### 2. Hệ Thống Design Tokens & Biên Dịch CSS
Để duy trì tính nhất quán của hệ thống thiết kế cao cấp, CSS của PawPal được tổ chức mô-đun hóa:
* **Design Tokens ([assets/css/tokens/](file:///d:/Aboutme/MyProject/Pawpal/assets/css/tokens/)):** Định nghĩa các biến CSS Custom Properties cho màu sắc (`colors.css`), kích thước font (`typography.css`), và giãn cách (`spacing.css`).
* **Component-specific CSS ([assets/css/components/](file:///d:/Aboutme/MyProject/Pawpal/assets/css/components/)):** Mỗi cấu phần như nút bấm, thanh điều hướng, khung chat, bộ lọc hay modal đều được viết trong các file riêng biệt để dễ dàng phát triển và kiểm soát.
* **Biên dịch và Gộp CSS:** Khi thực hiện `npm run sync`, [sync_static.js](file:///d:/Aboutme/MyProject/Pawpal/scripts/sync_static.js) sẽ:
  1. Đọc nội dung hiện tại của [style.css](file:///d:/Aboutme/MyProject/Pawpal/assets/css/style.css).
  2. Định vị mốc marker đặc biệt: `/* --- CORE_STYLES_START --- */`.
  3. Giữ nguyên toàn bộ mã CSS tùy chỉnh nằm dưới mốc marker này (không làm mất các CSS viết tay bổ sung trực tiếp trên style.css).
  4. Đọc tất cả các file css tokens & css components từ danh sách định sẵn, gộp chúng lại với nhau rồi chèn vào phía trên marker của [style.css](file:///d:/Aboutme/MyProject/Pawpal/assets/css/style.css).

---

## 📐 Chiến Lược Responsive

PawPal ưu tiên tối đa cho trải nghiệm di động (**Mobile-first content priority**):
- **Framework:** Sử dụng hệ thống Grid và các class Responsive của **Bootstrap 5.3** kết hợp tùy biến CSS thuần.
- **Kích thước nút bấm:** Mọi phần tử tương tác trên Mobile đảm bảo touch target tối thiểu là `44px x 44px`.
- **Hiển thị thông tin:** Đảm bảo không ẩn các thông tin thiết yếu (CTA, giá tiền, tên dịch vụ) trên giao diện điện thoại.


