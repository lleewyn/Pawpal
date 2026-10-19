# KẾ HOẠCH & CHECKLIST KIỂM THỬ TOÀN DIỆN PHÂN HỆ USER (PAWPAL)
> **Tài liệu kiểm định chất lượng chức năng, luồng dữ liệu, nạp Supabase và trải nghiệm người dùng.**
> Phiên bản: 1.0 (Đồng bộ theo CSDL 3NF và Quy chuẩn thiết kế [AGENTS.md](file:///d:/Aboutme/MyProject/Pawpal/AGENTS.md))
> Ngày lập: 20/10/2026

---

## MỤC LỤC
1. [Nguyên Tắc & Tiêu Chí Nghiệm Thu (Quality Gates)](#1-nguyên-tắc--tiêu-chí-nghiệm-thu-quality-gates)
2. [Checklist Component Dùng Chung (Global Components)](#2-checklist-component-dùng-chung-global-components)
3. [Checklist Phân Hệ Trang Công Khai (`/pages/public/`)](#3-checklist-phân-hệ-trang-công-khai-pagespublic)
4. [Checklist Phân Hệ Dịch Vụ & Đặt Lịch (`/pages/services/`)](#4-checklist-phân-hệ-dịch-vụ--đặt-lịch-pagesservices)
5. [Checklist Cổng Khách Hàng Thành Viên (`/pages/user/`)](#5-checklist-cổng-khách-hàng-thành-viên-pagesuser)
6. [Checklist Phân Hệ Cửa Hàng & Mua Sắm (`/pages/shop/`)](#6-checklist-phân-hệ-cửa-hàng--mua-sắm-pagesshop)
7. [Checklist Toàn Vẹn Dữ Liệu & Nạp Supabase (Data Sync & 3NF Integrity)](#7-checklist-toàn-vẹn-dữ-liệu--nạp-supabase-data-sync--3nf-integrity)
8. [Quy Trình Thực Hiện & Báo Cáo Lỗi (Defect Tracking)](#8-quy-trình-thực-hiện--báo-cáo-lỗi-defect-tracking)

---

## 1. NGUYÊN TẮC & TIÊU CHÍ NGHIỆM THU (QUALITY GATES)

Mọi màn hình và luồng thao tác BẮT BUỘC phải thỏa mãn đồng thời 5 tiêu chuẩn cốt lõi:
- **Kiến trúc CSDL 3NF**: Tuyệt đối không gọi hoặc ghi trực tiếp `product_id` vào các bảng chi tiết (`cart_item`, `sales_order_detail`, `inventory`, `return_request_detail`). Toàn bộ điều hướng qua `product_variant_id` $\rightarrow$ `product_variant` $\rightarrow$ `product`.
- **Hệ thống ENUM Tiếng Việt chuẩn mực**: Toàn bộ dữ liệu trạng thái phải dùng 100% giá trị ENUM tiếng Việt chuẩn (Ví dụ: `dang_ban`, `tam_ngung`, `cho_xac_nhan`, `dang_dong_goi`, `dang_giao_hang`, `da_giao_hang`, `da_huy`, `dang_hoat_dong`, `dang_hien_thi`...). Không dùng từ tiếng Anh (`ACTIVE`, `PENDING`...).
- **Quy tắc sao chép ngữ văn (Copywriting)**:
  - Viết hoa Sentence Case (chỉ viết hoa chữ cái đầu tiên).
  - Không dùng ký hiệu `&` thay cho chữ "và".
  - Nút bấm text thuần túy, phẳng, không gắn tiền tố `+ ` (viết `Thêm bé cưng`, `Đặt lịch ngay`, không viết `+ Thêm bé`).
  - Không có dòng phụ chú giải tiếng Anh trong ngoặc đơn rườm rà.
- **Tính bền vững trạng thái (State Persistence)**: Khi F5 / Reload trang web, hệ thống phải giữ nguyên vị trí làm việc, tab con, thông tin lọc và dữ liệu giỏ hàng.
- **Triệt tiêu hiện tượng nháy màn hình (Anti-Flicker)**: Khi mở trang qua Deep Link (`#pets?id=...`, `#diary?sessionId=...`), giao diện mở trực tiếp khung nội dung tương ứng, không nhấp nháy lộ màn hình danh sách.

---

## 2. CHECKLIST COMPONENT DÙNG CHUNG (GLOBAL COMPONENTS)

### 2.1. Thanh điều hướng đầu trang (Header Bar - `components/header/`)
- [ ] **Hiển thị & Cố định (Sticky Header)**:
  - [ ] Header nổi cố định thanh thoát khi cuộn trang, nền mờ kính đục (`backdrop-filter: blur(10px)`).
  - [ ] Topbar thông báo (`.top-bar-notice`): Nạp động thông báo khuyến mãi / voucher từ cấu hình hệ thống.
- [ ] **Thanh tìm kiếm thông minh (Smart Header Search)**:
  - [ ] Nhập từ khóa dịch vụ (ví dụ: `spa`, `hotel`, `khách sạn`, `taxi`, `tắm sấy`, `cắt tỉa`): Tự động chuyển hướng sang `/services?search=[từ_khóa]`.
  - [ ] Nhập từ khóa sản phẩm (ví dụ: `hạt`, `pate`, `sữa tắm`, `royal canin`): Tự động chuyển hướng sang `/shop?search=[từ_khóa]`.
  - [ ] Nhấn phím `Enter` hoặc click icon kính lúp đều kích hoạt tìm kiếm chính xác.
- [ ] **Huy hiệu thông báo & Giỏ hàng (Badges)**:
  - [ ] Huy hiệu giỏ hàng (`.cart-badge`): Tự động cập nhật số lượng món khi thêm/bớt hàng (phản hồi sự kiện `cart_updated`).
  - [ ] Khi giỏ rỗng, huy hiệu ẩn hoặc hiển thị `0`.
  - [ ] Huy hiệu chuông thông báo: Cập nhật số thông báo chưa đọc, tự động đồng bộ khi chuyển tab trình duyệt (`focus` event).
- [ ] **Menu tài khoản người dùng (Auth Dropdown)**:
  - [ ] Khi chưa đăng nhập: Hiển thị nút text `Đăng nhập` / `Đăng ký`.
  - [ ] Khi đã đăng nhập: Hiển thị ảnh đại diện tròn (`border-radius: 50%`), tên khách hàng, hạng thẻ thành viên.
  - [ ] Dropdown chứa các liên kết: `Hồ sơ cá nhân`, `Bé cưng của tôi`, `Lịch hẹn`, `Đơn hàng`, `Đăng xuất`.
  - [ ] Bấm `Đăng xuất`: Xóa sạch `pawpal_current_user`, `pawpal_cart_owner`, reset huy hiệu và chuyển về trang đăng nhập hoặc trang chủ.
- [ ] **Menu di động (Mobile Navigation Drawer)**:
  - [ ] Nút Hamburger mở Drawer mượt mà trên màn hình nhỏ (< 1250px).
  - [ ] Khóa cuộn trang bên dưới (`body: overflow: clip` hoặc `hidden`), chống cuộn lọt qua mép (scroll bleed).
  - [ ] Có nút `Đóng` rõ ràng, click lớp phủ đen mờ (overlay) hoặc chọn một liên kết đều tự động đóng Drawer.

### 2.2. Chân trang (Footer - `components/footer/`)
- [ ] Hiển thị đầy đủ thông tin: Logo, mô tả ngắn gọn, hệ thống chi nhánh, hotline hỗ trợ, email CSKH.
- [ ] Danh mục liên kết dịch vụ: `Grooming Spa`, `Pet Hotel`, `Pet Taxi`.
- [ ] Danh mục liên kết chính sách: `Chính sách bảo mật`, `Chính sách đổi trả`, `Quy định an toàn dịch vụ`.
- [ ] Ô đăng ký nhận bản tin (Newsletter): Có kiểm tra định dạng email và thông báo kết quả.

### 2.3. Nút tiện ích nổi (FAB - `components/fab/`)
- [ ] Nút gọi Hotline / Zalo mở đúng ứng dụng liên hệ.
- [ ] Nút cuộn lên đầu trang (Back-to-top): Chỉ xuất hiện khi cuộn quá 300px, click cuộn mượt lên đỉnh trang.

### 2.4. Modal Mua Nhanh (Landing Buy Now - `components/ui/landing-buy-now`)
- [ ] Click nút `Mua ngay` ở thẻ sản phẩm trang chủ mở Modal Mua nhanh tức thì.
- [ ] Nạp đúng thông tin sản phẩm: Ảnh, tên, giá bán theo biến thể rẻ nhất, các tùy chọn phân loại (hương vị, trọng lượng...).
- [ ] Nút tăng/giảm số lượng hoạt động mượt mà, không cho chọn < 1 và không vượt quá tồn kho khả dụng.
- [ ] Bấm `Tiến hành đặt hàng`: Lưu giỏ hàng phiên và chuyển hướng thẳng đến `/pages/shop/checkout/checkout.html?buynow=true`.
- [ ] Đóng modal bằng phím `Escape`, nút `Đóng` hoặc click backdrop.

---

## 3. CHECKLIST PHÂN HỆ TRANG CÔNG KHAI (`/pages/public/`)

### 3.1. Trang Chủ (Landing Page - `pages/public/landing/`)
- [ ] **Hero Slider & Banners**:
  - [ ] Nạp danh sách banner từ bảng `banner` Supabase với điều kiện `status = 'dang_hien_thi'`.
  - [ ] Không bị lỗi 400 do query sai cột hay enum cũ.
  - [ ] Chuyển slide mượt mà, có nút chuyển trang và tự động dừng khi rê chuột lên banner.
- [ ] **Khối Danh Mục Dịch Vụ Nổi Bật**:
  - [ ] Hiển thị 3 nhóm dịch vụ: Grooming & Spa, Pet Hotel, Pet Taxi.
  - [ ] Bấm vào thẻ dẫn đúng trang dịch vụ tương ứng với bộ lọc đã chọn sẵn.
- [ ] **Khối Sản Phẩm Bán Chạy (Featured Products)**:
  - [ ] Nạp dữ liệu sản phẩm từ Supabase thông qua quan hệ `product_variant(*, inventory(quantity_in_stock))`.
  - [ ] Hiển thị đúng giá khởi điểm (giá thấp nhất của biến thể đang bán `dang_ban`).
  - [ ] Nút `Thêm vào giỏ hàng`: Thêm thành công món hàng và cập nhật huy hiệu giỏ hàng trên Header.
  - [ ] Nút `Mua ngay`: Mở modal mua nhanh (Buy Now Modal).
  - [ ] Nút `Yêu thích (Trái tim)`:
    - [ ] Khi click: Đổi trạng thái tim đỏ/rỗng ngay lập tức.
    - [ ] Nếu đã đăng nhập: Đồng bộ lưu vào bảng `wishlist_item` Supabase.
    - [ ] Nếu là khách vãng lai: Lưu vào `localStorage` an toàn.
- [ ] **Slider Đánh Giá Khách Hàng (Testimonials Carousel)**:
  - [ ] Hiển thị các đánh giá thật và phản hồi của phụ huynh thú cưng.
  - [ ] Card co giãn tự động theo chiều rộng màn hình, không bị lỗi tính toán chiều rộng thẻ làm vỡ bố cục trên mobile.
- [ ] **Khối Tin Tức & Cẩm Nang Chăm Sóc Mới Nhất**:
  - [ ] Nạp 3 bài viết mới nhất từ bảng `blog_post`.
  - [ ] Hiển thị ảnh đại diện, tiêu đề, ngày đăng và thời gian đọc.

### 3.2. Trang Đăng Nhập & Đăng Ký (Auth - `pages/public/login/`)
- [ ] **Chuyển đổi Tab (Đăng nhập / Đăng ký / Quên mật khẩu)**:
  - [ ] Hỗ trợ URL Hash: `#login`, `#register`, `#forgot`.
  - [ ] Khi click liên kết trên Header không bị reload toàn trang mà chuyển mượt form đăng nhập.
- [ ] **Kiểm tra nhập liệu (Validation)**:
  - [ ] Số điện thoại: Định dạng đúng 10 số di động Việt Nam (đầu 03, 05, 07, 08, 09).
  - [ ] Mật khẩu: Tối thiểu 6 ký tự, có nút bật/tắt ẩn hiện mật khẩu.
- [ ] **Đăng nhập thành công**:
  - [ ] Nạp thông tin người dùng từ bảng `customer` vào `localStorage: pawpal_current_user`.
  - [ ] Phát sự kiện `auth_state_changed` để Header và các module cập nhật ngay lập tức.
  - [ ] Tự động chuyển hướng về trang trước đó (hoặc `/pages/user/index.html`).

### 3.3. Trang Về Chúng Tôi (About - `pages/public/about/`)
- [ ] Nạp đầy đủ các script tiện ích chung (`components.js`, `api.js`, `data-loader.js`).
- [ ] Thư viện ảnh Bento Gallery hỗ trợ tải chậm hình ảnh (`loading="lazy"`), tối ưu tốc độ tải trang.
- [ ] Trình bày cam kết an toàn, chứng chỉ KTV và giá trị thương hiệu.

### 3.4. Trang Tra Cứu & Đổi Trả Khách Vãng Lai (`pages/public/return-guest/`)
- [ ] Tra cứu thông tin đơn hàng bằng: Mã đơn hàng + Số điện thoại đặt hàng.
- [ ] Hiển thị thông tin tiến độ đơn hàng và danh sách sản phẩm.
- [ ] Cho phép gửi yêu cầu RMA đổi trả sản phẩm khi đơn hàng ở trạng thái `da_giao_hang`.

---

## 4. CHECKLIST PHÂN HỆ DỊCH VỤ & ĐẶT LỊCH (`/pages/services/`)

### 4.1. Trang Danh Sách Dịch Vụ (`pages/services/services.html`)
- [ ] **Nạp dữ liệu Dịch vụ & Biểu giá**:
  - [ ] Tải thành công 27 dịch vụ từ bảng `service`.
  - [ ] Nạp bảng giá ma trận từ `service_price_matrix` với điều kiện `status = 'dang_hoat_dong'` và `effective_to IS NULL`.
  - [ ] Không phát sinh lỗi 400 do sai enum hay tên cột.
- [ ] **Bộ lọc & Tìm kiếm**:
  - [ ] Bộ lọc phân loại: `Tất cả`, `Grooming & Spa`, `Khách sạn Pet Hotel`, `Pet Taxi`.
  - [ ] Hỗ trợ tham số URL tìm kiếm: Truy cập `services.html?search=tắm` tự động điền ô tìm kiếm và lọc đúng dịch vụ tắm sấy.
  - [ ] Lọc theo loại thú cưng: `Chó`, `Mèo`.
  - [ ] Lọc theo khoảng giá.
- [ ] **Thẻ dịch vụ**:
  - [ ] Hiển thị tên dịch vụ, thời lượng ước tính, đánh giá sao, mức giá khởi điểm từ bảng ma trận.
  - [ ] Nút `Chi tiết`: Dẫn đến trang `service-detail.html?id=[id]`.
  - [ ] Nút `Đặt lịch ngay`: Dẫn đến trang đặt lịch với dịch vụ đã được chọn sẵn.

### 4.2. Quy Trình Đặt Lịch Trực Tuyến (`pages/services/booking/`)
- [ ] **Bước 1: Chọn Dịch Vụ & Thú Cưng**:
  - [ ] Nếu đã đăng nhập: Tự động nạp danh sách bé cưng từ tài khoản để chọn nhanh 1 chạm.
  - [ ] Nếu chưa đăng ký bé hoặc khách vãng lai: Cho phép nhập tên bé, giống loài, cân nặng thực tế.
  - [ ] Tính toán lại giá dịch vụ tương ứng với mức cân nặng của bé theo đúng ma trận giá.
- [ ] **Bước 2: Chọn Chuyên Viên Kỹ Thuật (KTV / Groomer)**:
  - [ ] Nạp danh sách nhân viên từ bảng `staff` có ca trực hợp lệ trong bảng `staff_schedule`.
  - [ ] Hiển thị cấp độ KTV (Senior, Master) và đánh giá khách hàng.
  - [ ] Tùy chọn "PawPal tự động sắp xếp KTV phù hợp nhất".
- [ ] **Bước 3: Chọn Ngày Giờ & Khung Giờ (Timeslot)**:
  - [ ] Chọn ngày đặt lịch (không cho chọn ngày trong quá khứ).
  - [ ] Khung giờ khả dụng: Kiểm tra khung giờ trùng từ bảng `appointment` để vô hiệu hóa (disable) các giờ đã kín lịch.
  - [ ] Bố cục bước 3 dàn trải thoáng đãng, không bị co rúm chữ.
- [ ] **Bước 4: Xác Nhận & Ghi Chú Đặc Tính**:
  - [ ] Ô nhập ghi chú cá nhân hóa tự do: Cảnh báo an toàn, tính cách của bé, dị ứng thuốc sát trùng.
  - [ ] Áp dụng Voucher giảm giá: Kiểm tra đúng hạn sử dụng, min-order và quyền sở hữu voucher của khách.
  - [ ] Hiển thị tóm tắt chi phí rõ ràng: Giá gốc dịch vụ - Giảm giá + Phụ phí (nếu có) = Tổng thanh toán.
  - [ ] Bấm `Xác nhận đặt lịch`: Ghi thành công vào bảng `appointment` Supabase với trạng thái `cho_xac_nhan`.
  - [ ] Chuyển hướng đến trang `booking-success.html` với đầy đủ thông tin mã lịch hẹn.

---

## 5. CHECKLIST CỔNG KHÁCH HÀNG THÀNH VIÊN (`/pages/user/`)

### 5.1. Bộ Điều Phối & Quản Lý Luồng SPA (`pages/user/user.js`)
- [ ] **Điều hướng một bước (Single-step Module Rendering)**:
  - [ ] Nhấp chọn menu bên trái nạp trực tiếp file HTML/JS/CSS tương ứng, triệt tiêu hiện tượng tải 2 bước làm giật màn hình.
  - [ ] Đồng bộ URL Hash: `#profile`, `#pets`, `#diary`, `#bookings`, `#orders`, `#wishlist`, `#loyalty`, `#support`.
  - [ ] F5 Reload: Lưu vết và mở lại đúng phân hệ đang xem.
- [ ] **Thanh Sub-Breadcrumb trên Header Cổng User**:
  - [ ] Hiển thị dạng phân cấp: `Cổng thành viên / Bé cưng / [Tên bé]`.
  - [ ] Tự động cập nhật tên thực thể đang mở chi tiết.

### 5.2. Hồ Sơ Cá Nhân (`pages/user/modules/profile/`)
- [ ] Nạp đúng thông tin khách hàng từ Supabase: Họ tên, SĐT, Email, ngày sinh, hạng thành viên, điểm Pawpoint.
- [ ] Cập nhật thông tin cá nhân: Lưu thành công và thông báo Toast.
- [ ] Sổ địa chỉ nhận hàng:
  - [ ] Hỗ trợ lưu nhiều địa chỉ.
  - [ ] Chọn đúng 1 địa chỉ mặc định (có huy hiệu viền xanh).
  - [ ] Thêm địa chỉ mới / Xóa địa chỉ phụ hoạt động chính xác.

### 5.3. Hồ Sơ Bé Cưng (`pages/user/modules/pets/`)
- [ ] **Tải danh sách & Lọc trạng thái**:
  - [ ] Tab `Đang nuôi` và Tab `Lưu trữ`: Chuyển đổi bằng class `.d-none`, không bị vỡ layout.
  - [ ] Hiển thị thẻ từng bé: Ảnh avatar, tên, giống loài, giới tính, cân nặng, ngày sinh/tuổi.
- [ ] **Hỗ trợ Deep Link trực tiếp**:
  - [ ] Mở `#pets?id=[pet_id]`: Mở thẳng form chi tiết bé mà không bị nháy màn hình danh sách.
  - [ ] Mở `#pets?action=create`: Mở thẳng form tạo bé cưng mới.
- [ ] **Chức năng Thêm & Sửa hồ sơ bé**:
  - [ ] Tải ảnh đại diện bé cưng và ảnh sổ tiêm phòng vaccine.
  - [ ] Toggle loài thú cưng: Chó / Mèo.
  - [ ] Nhập tự do: Tiền sử dị ứng, tập tính cá nhân, cảnh báo an toàn khi cắt tỉa.
  - [ ] Nút bấm `Lưu bé cưng`: Lưu thành công vào bảng `pet` Supabase, cập nhật danh sách và hiển thị Toast thành công.

### 5.4. Nhật Ký Chăm Sóc Thời Gian Thực 360° (`pages/user/modules/diary/`)
- [ ] **Chọn bé & Mở phiên dịch vụ**:
  - [ ] Thanh chọn bé cưng dạng pill ngang: Chuyển đổi bé mượt mà.
  - [ ] Mở deep link từ lịch hẹn: `#diary?id=[petId]&sessionId=[appointmentId]` mở đúng phiên chăm sóc của lịch hẹn đó.
  - [ ] Nếu phiên dịch vụ chưa có nhật ký: Hiển thị thông báo nhẹ nhàng, không mở nhầm nhật ký của ca khác.
  - [ ] Nếu không tìm thấy mã bé: Hiển thị màn hình báo lỗi thanh lịch kèm nút quay lại danh sách.
- [ ] **Tiến trình Stepper & Timeline**:
  - [ ] 5 bước quy trình: `Tiếp nhận an toàn` $\rightarrow$ `Tắm sấy vệ sinh` $\rightarrow$ `Cắt tỉa tạo kiểu` $\rightarrow$ `Kiểm tra chất lượng` $\rightarrow$ `Bàn giao bé`.
  - [ ] Hiển thị hình ảnh trước (Before) và sau (After) khi grooming.
  - [ ] Nhật ký chỉ số sức khỏe: Cân nặng đo tại quầy, tình trạng da lông, tai, móng.
  - [ ] Biểu cảm & Tâm trạng của bé trong suốt quá trình chăm sóc.

### 5.5. Quản Lý Lịch Hẹn Dịch Vụ (`pages/user/modules/bookings/`)
- [ ] **Danh sách lịch hẹn**:
  - [ ] Phân loại theo tab: `Tất cả`, `Sắp tới`, `Đang thực hiện`, `Hoàn thành`, `Đã hủy`.
  - [ ] Nạp lịch hẹn từ Supabase kèm thông tin bé cưng, dịch vụ và KTV phụ trách.
- [ ] **Hủy lịch hẹn**:
  - [ ] Chỉ cho phép hủy khi lịch ở trạng thái `cho_xac_nhan` hoặc `da_xac_nhan`.
  - [ ] Cập nhật trạng thái thành ENUM chuẩn `da_huy` (không dùng mã cũ).
- [ ] **Đánh giá dịch vụ**:
  - [ ] Đối với lịch hẹn đã `hoan_thanh`: Hiển thị form đánh giá số sao (1-5 sao) và nhận xét.
  - [ ] Lưu đánh giá vào bảng `review` với `service_id` và `appointment_id` hợp lệ.

### 5.6. Quản Lý Đơn Hàng & Đổi Trả RMA (`pages/user/modules/orders/`)
- [ ] **Danh sách đơn hàng**:
  - [ ] Phân loại theo tab trạng thái chuẩn: `Chờ xác nhận`, `Đang đóng gói`, `Đang giao hàng`, `Đã giao hàng`, `Đã hủy`.
  - [ ] Hiển thị mã đơn, ngày đặt, hình ảnh sản phẩm, số lượng, tổng tiền thanh toán.
- [ ] **Chi tiết đơn hàng (`order-detail.js`)**:
  - [ ] Nạp thông tin qua `API.getUserOrders` đồng bộ bảng 3NF (đọc `product_variant` $\rightarrow$ `product`).
  - [ ] Hiển thị thông tin người nhận, địa chỉ giao hàng, phương thức thanh toán.
  - [ ] Đơn vị vận chuyển và Mã vận đơn tracking thật (ghn, ghtk, j&t...).
- [ ] **Drawer Yêu Cầu Đổi Trả RMA (`return-handler.js`)**:
  - [ ] Khi đơn hàng ở trạng thái `da_giao_hang`: Nút `Yêu cầu đổi trả` khả dụng.
  - [ ] Click mở Drawer đổi trả với hiệu ứng trượt mượt mà.
  - [ ] Quản lý tiêu điểm (Focus trap) và hỗ trợ đóng nhanh bằng phím `Escape`.
  - [ ] Chọn lý do đổi trả, tải ảnh bằng chứng sản phẩm lỗi, chọn phương thức hoàn tiền hoặc đổi sản phẩm mới.
  - [ ] Ghi nhận thành công vào bảng `return_request` và `return_request_detail` Supabase.

### 5.7. Danh Sách Yêu Thích (`pages/user/modules/wishlist/`)
- [ ] Hiển thị 2 tab: `Sản phẩm yêu thích` và `Dịch vụ yêu thích`.
- [ ] Thêm vào giỏ hàng ngay từ thẻ sản phẩm yêu thích (gọi `API.addToCart` và cập nhật badge giỏ hàng).
- [ ] Xóa sản phẩm khỏi danh sách yêu thích cập nhật ngay giao diện và đồng bộ Supabase.

### 5.8. Pawpoint & Hạng Thành Viên (`pages/user/modules/loyalty/`)
- [ ] Hiển thị tổng điểm tích lũy hiện có, điểm sắp hết hạn.
- [ ] Thanh tiến trình nâng hạng thẻ: `Đồng` $\rightarrow$ `Bạc` $\rightarrow$ `Vàng` $\rightarrow$ `Kim Cương`.
- [ ] Bảng lịch sử biến động điểm: Nạp từ bảng `point_transaction` (ghi rõ lý do cộng/trừ, mã đơn liên quan).
- [ ] Đổi điểm nhận mã giảm giá Voucher.

### 5.9. Khiếu Nại & CSKH 2 Chiều (`pages/user/modules/support/`)
- [ ] Danh sách các phiếu yêu cầu hỗ trợ / khiếu nại của khách.
- [ ] Tạo khiếu nại mới (`support-create.js`):
  - [ ] Tự động nạp danh sách đơn hàng và lịch hẹn thực tế của khách vào dropdown chọn đối tượng.
  - [ ] Chọn loại sự cố: Thái độ phục vụ, trễ hẹn, sai hàng, sự cố chăm sóc bé.
  - [ ] Lưu thành công vào bảng `support_ticket`.
- [ ] Chat trao đổi 2 chiều: Khách hàng gửi tin nhắn trao đổi với nhân viên CSKH (bảng `support_ticket_message`).

---

## 6. CHECKLIST PHÂN HỆ CỬA HÀNG & MUA SẮM (`/pages/shop/`)

### 6.1. Giỏ Hàng (`pages/shop/cart/cart.js`)
- [ ] **Quản lý phiên & Cơ chế hàng đợi (`queueCartWrite`)**:
  - [ ] Đảm bảo mỗi tài khoản người dùng có không gian giỏ hàng riêng biệt (`pawpal_cart_owner`).
  - [ ] Khi bấm tăng/giảm số lượng liên tục không bị mất đồng bộ hay ghi đè sai số lượng (Race condition protection).
- [ ] **Kiểm tra giới hạn tồn kho (`validateCartStock`)**:
  - [ ] Không cho phép tăng số lượng vượt quá số lượng tồn kho khả dụng từ bảng `inventory` qua `product_variant_id`.
  - [ ] Nếu sản phẩm trong giỏ bị hết hàng trong kho: Hiển thị cảnh báo đỏ và chặn thanh toán món đó.
- [ ] **Xóa sản phẩm khỏi giỏ**:
  - [ ] Có hộp thoại xác nhận xóa thân thiện, cập nhật lại tổng tiền ngay tức thì.

### 6.2. Thanh Toán Đặt Hàng (`pages/shop/checkout/checkout.js`)
- [ ] **Kiểm tra thông tin giao hàng**:
  - [ ] Tự động điền họ tên, số điện thoại và địa chỉ mặc định của khách đã đăng nhập.
  - [ ] Cho phép khách vãng lai nhập thông tin giao hàng mới.
- [ ] **Áp dụng Voucher Khuyến Mãi**:
  - [ ] Kiểm tra điều kiện đơn hàng tối thiểu (`min_order_amount`).
  - [ ] Kiểm tra quyền sở hữu: Khách không thể dùng trộm voucher riêng của khách hàng khác.
- [ ] **Phương thức thanh toán**:
  - [ ] Thanh toán khi nhận hàng (`COD`).
  - [ ] Thanh toán trực tuyến VNPay Sandbox: Chuyển hướng đúng cổng và nhận callback cập nhật trạng thái đơn thành `da_thanh_toan`.
- [ ] **Trừ kho nguyên tử (Atomic Stock Deduction)**:
  - [ ] Đơn hàng tạo thành công lập tức cập nhật giảm số lượng tồn trong `inventory` và ghi nhật ký vào `inventory_transaction`.

---

## 7. CHECKLIST TOÀN VẸN DỮ LIỆU & NẠP SUPABASE (DATA SYNC & 3NF INTEGRITY)

| Bảng Dữ Liệu | Khóa Ngoại & Cột Nghiệp Vụ Bắt Buộc | Trạng Thái ENUM Tiếng Việt Chuẩn | Tiêu Chí Kiểm Tra Nạp Dữ Liệu |
| :--- | :--- | :--- | :--- |
| **`product`** | `category_id` $\rightarrow$ `product_category(id)` | `dang_ban`, `tam_ngung`, `ngung_kinh_doanh` | Không join trực tiếp `inventory`. Đọc qua `product_variant`. |
| **`product_variant`** | `product_id` $\rightarrow$ `product(id)` | `dang_ban`, `tam_ngung`, `het_hang` | Nạp đúng `sku_variant`, `sale_price`, `compare_at_price`. |
| **`inventory`** | `product_variant_id` $\rightarrow$ `product_variant(id)` | N/A | Tuyệt đối không còn cột `product_id`. |
| **`cart_item`** | `cart_id`, `product_variant_id` | N/A | Ghi nhận đúng `product_variant_id`, không có `product_id`. |
| **`sales_order`** | `customer_id`, `address_id` | `cho_xac_nhan`, `dang_dong_goi`, `dang_giao_hang`, `da_giao_hang`, `da_huy` | Lưu đúng `tracking_code`, `shipping_provider_id`, `shipped_at`. |
| **`sales_order_detail`** | `sales_order_id`, `product_variant_id` | N/A | Không có cột `product_id`. Đọc sản phẩm qua `product_variant`. |
| **`service`** | `category_id` | `dang_hoat_dong`, `ngung_hoat_dong` | Phân loại: `grooming_spa`, `khach_san_thu_cung`, `dua_don_tan_noi`. |
| **`service_price_matrix`** | `service_id` $\rightarrow$ `service(id)` | `dang_hoat_dong`, `ngung_hoat_dong` | Lọc `status = 'dang_hoat_dong'` và `effective_to IS NULL`. |
| **`appointment`** | `customer_id`, `pet_id`, `service_id`, `staff_id` | `cho_xac_nhan`, `da_xac_nhan`, `dang_thuc_hien`, `hoan_thanh`, `da_huy` | Không dùng mã tiếng Anh `PENDING`/`CONFIRMED`. |
| **`banner`** | N/A | `dang_hien_thi`, `tam_an`, `het_han` | Lọc `status = 'dang_hien_thi'`. Không có cột `is_active`. |
| **`return_request`** | `order_id`, `customer_id` | `cho_tiep_nhan`, `da_duyet`, `tu_choi`, `hoan_tat` | Hỗ trợ quy trình RMA kiểm phẩm và nhập lại kho. |
| **`support_ticket`** | `customer_id`, `order_id`, `appointment_id` | `tiep_nhan`, `dang_xu_ly`, `cho_khach_phan_hoi`, `da_dong` | Đầy đủ 19 cột nghiệp vụ hỗ trợ đa phân hệ. |

---

## 8. QUY TRÌNH THỰC HIỆN & BÁO CÁO LỖI (DEFECT TRACKING)

Khi kiểm thử viên (hoặc Subagent) phát hiện bất kỳ lỗi nào trên giao diện hoặc console, ghi nhận theo định dạng chuẩn sau:

```markdown
### [MÃ_LỖI] Tiêu đề ngắn gọn của lỗi
- **Vị trí (URL / Module)**: Ví dụ: /pages/user/index.html#diary
- **Các bước tái hiện (Steps to Reproduce)**:
  1. Đăng nhập tài khoản khách hàng...
  2. Truy cập phân hệ Bé cưng...
  3. Bấm vào nút...
- **Kết quả thực tế (Actual Result)**: Màn hình báo lỗi đỏ / Console log 400 Bad Request...
- **Kết quả mong đợi (Expected Result)**: Dữ liệu nạp thành công, hiển thị thông tin...
- **Ảnh chụp màn hình / Console log**: (Đính kèm nếu có)
- **Mức độ nghiêm trọng**: [Blocker / Critical / Major / Minor]
```

---
*Tài liệu được khởi tạo và phê duyệt bởi Antigravity Pair-Programming Agent.*
