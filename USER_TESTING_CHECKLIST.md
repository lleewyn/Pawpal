# BẢNG MA TRẬN & CHECKLIST KIỂM THỬ CHI TIẾT TOÀN DIỆN PHÂN HỆ USER (PAWPAL)
> **Tài liệu kiểm định chất lượng phần mềm chuyên sâu (Master QA/QC Test Matrix)**
> Phục vụ kiểm thử chức năng (Functional), luồng dữ liệu (Data Flow), giao diện (UI/UX), phản hồi biên (Edge Cases) và toàn vẹn cơ sở dữ liệu Supabase 3NF.
> Phiên bản: 2.0 (Nâng cấp toàn diện - 100+ Test Cases chi tiết)
> Ngày cập nhật: 20/10/2026

---

## BẢNG TÀI KHOẢN & DỮ LIỆU DÙNG ĐỂ KIỂM THỬ (TEST FIXTURES)

| Đối tượng | Tài khoản / Số điện thoại | Mật khẩu chuẩn | Ghi chú & Dữ liệu sẵn có |
| :--- | :--- | :--- | :--- |
| **Khách hàng QA 1** | `0987654321` | `Password123!` | Khách: Lê Lệ Quyên QA. Có sẵn thú cưng, sổ địa chỉ, lịch hẹn dịch vụ. |
| **Khách hàng QA 2** | `0901234567` | `Password123!` | Khách: Lê Lệ Quyên QA. Có sẵn đơn hàng mua sắm, lịch sử giao hàng. |
| **Khách hàng QA 3** | `0834562948` | `Password123!` | Khách: Nguyễn Lê Thi. Có sẵn bé cưng và nhật ký chăm sóc 360°. |
| **Khách hàng QA 4** | `0972163376` | `Password123!` | Khách: Nguyễn Lê Nhật Khanh. Có danh sách yêu thích và tích điểm loyalty. |
| **Khách vãng lai** | Nhập tự do 10 số (bắt đầu bằng `0...`) | OTP: `555666` | Dùng để test luồng Đăng ký mới, Quên mật khẩu, Tra cứu đơn vãng lai. |
| **Quản trị viên** | `admin@pawpal.vn` | `PawpalSecure2026!` | Cổng `/admin/login`: Dùng để đối soát đơn hàng, lịch hẹn, duyệt RMA. |

---

# PHẦN I: KHUNG GIAO DIỆN & COMPONENTS DÙNG CHUNG (GLOBAL COMPONENTS)

## 1. Thanh Điều Hướng Đầu Trang (Header Bar - `components/header/`)

### TC-HDR-01: Hiển thị giao diện, thanh thông báo Topbar và hiệu ứng cố định (Sticky Header)
- **Điều kiện**: Truy cập trang bất kỳ (`/`, `/shop`, `/services`, `/user`).
- **Các bước thực hiện**:
  1. Mở trang chủ `http://localhost:3000/`.
  2. Quan sát thanh thông báo Topbar (`.top-bar-notice`) trên cùng.
  3. Cuộn trang xuống dưới 200px - 1000px.
- **Kết quả mong đợi**:
  - [ ] Topbar hiển thị rõ ràng thông báo khuyến mãi / voucher hệ thống.
  - [ ] Khi cuộn trang, Header Bar bám dính cố định mượt mà (sticky), bề mặt kính mờ bán trong suốt (`backdrop-filter: blur(10px)`).
  - [ ] Không có hiện tượng giật cục (layout shift) hoặc che lấp tiêu đề trang bên dưới.

### TC-HDR-02: Thanh tìm kiếm phân luồng thông minh (Smart Search Routing)
- **Điều kiện**: Đang ở bất kỳ trang nào.
- **Các bước thực hiện**:
  1. Click vào ô tìm kiếm trên Header.
  2. Gõ từ khóa liên quan đến dịch vụ: `spa`, `hotel`, `khach san`, `dua ruoc`, `taxi`, `tắm sấy` $\rightarrow$ Nhấn `Enter` hoặc click icon kính lúp.
  3. Quay lại, gõ từ khóa sản phẩm: `pate`, `hạt mèo`, `royal canin`, `sữa tắm` $\rightarrow$ Nhấn `Enter`.
  4. Để ô tìm kiếm rỗng và nhấn `Enter`.
- **Kết quả mong đợi**:
  - [ ] Với từ khóa dịch vụ: Tự động chuyển hướng chính xác đến `/services?search=[từ_khóa]` và nạp ngay danh sách dịch vụ phù hợp.
  - [ ] Với từ khóa sản phẩm: Tự động chuyển hướng đến `/shop?search=[từ_khóa]` và nạp đúng sản phẩm tương ứng.
  - [ ] Khi ô tìm kiếm rỗng: Không chuyển trang, không reload lại trang không cần thiết.

### TC-HDR-03: Huy hiệu giỏ hàng (Cart Badge) và đồng bộ thời gian thực
- **Điều kiện**: Mở trang web ở 2 tab trình duyệt cùng lúc.
- **Các bước thực hiện**:
  1. Quan sát số lượng hiển thị trên huy hiệu giỏ hàng (`.cart-badge`).
  2. Tại Tab 1: Bấm `Thêm vào giỏ hàng` một sản phẩm bất kỳ.
  3. Chuyển sang Tab 2: Kiểm tra số lượng trên huy hiệu giỏ hàng.
  4. Xóa hết sản phẩm trong giỏ hàng.
- **Kết quả mong đợi**:
  - [ ] Khi thêm sản phẩm: Huy hiệu giỏ hàng tăng ngay lập tức mà không cần F5.
  - [ ] Tab 2 tự động cập nhật số lượng mới qua sự kiện `storage` / `cart_updated`.
  - [ ] Khi giỏ rỗng: Huy hiệu hiển thị `0` hoặc ẩn đi một cách thẩm mỹ.

### TC-HDR-04: Huy hiệu thông báo và menu thông báo đẩy (Notifications)
- **Điều kiện**: Đã đăng nhập tài khoản khách hàng.
- **Các bước thực hiện**:
  1. Click icon chuông thông báo trên Header.
  2. Đọc một thông báo chưa đọc.
  3. Bấm `Đánh dấu tất cả đã đọc`.
- **Kết quả mong đợi**:
  - [ ] Sổ menu thông báo thanh thoát, hiển thị danh sách thông báo lịch hẹn, đơn hàng, điểm thưởng.
  - [ ] Bấm đọc thông báo: Chấm đỏ chưa đọc biến mất, số trên huy hiệu giảm 1.
  - [ ] `Đánh dấu tất cả đã đọc`: Huy hiệu chuông biến mất chấm đỏ, lưu trạng thái vào Supabase/LocalStorage.

### TC-HDR-05: Menu tài khoản người dùng (Auth Dropdown State)
- **Điều kiện**: Kiểm tra ở cả 2 trạng thái Chưa đăng nhập và Đã đăng nhập.
- **Các bước thực hiện**:
  1. **Khi chưa đăng nhập**: Quan sát Header. Click nút `Đăng nhập`.
  2. **Khi đã đăng nhập** (với SĐT `0987654321` / `Password123!`):
     - Quan sát góc phải Header.
     - Click vào avatar / tên khách hàng để mở menu dropdown.
     - Kiểm tra từng liên kết: `Hồ sơ cá nhân`, `Bé cưng của tôi`, `Lịch hẹn`, `Đơn hàng`.
     - Click nút `Đăng xuất`.
- **Kết quả mong đợi**:
  - [ ] Khi chưa đăng nhập: Nút `Đăng nhập` / `Đăng ký` dạng text phẳng, click chuyển đến `/login`.
  - [ ] Khi đã đăng nhập: Hiển thị avatar tròn (`border-radius: 50%`) hoặc chữ cái viết tắt, tên khách hàng và badge hạng thành viên.
  - [ ] Các liên kết trong menu dẫn chính xác đến các module tương ứng trong `/user#profile`, `/user#pets`, `/user#bookings`, `/user#orders`.
  - [ ] Bấm `Đăng xuất`: Xóa sạch `pawpal_current_user`, `pawpal_cart_owner`, reset giỏ hàng phiên, Header quay về trạng thái chưa đăng nhập mà không phát sinh lỗi Console.

### TC-HDR-06: Menu di động (Mobile Nav Drawer) và quản lý thanh cuộn
- **Điều kiện**: Bật chế độ Responsive trên trình duyệt (kích thước màn hình: 375px, 414px, 768px).
- **Các bước thực hiện**:
  1. Bấm nút Hamburger menu (`.mobile-menu-toggle`).
  2. Lướt ngón tay cuộn trang bên dưới menu.
  3. Click nút `Đóng [×]` hoặc click vào vùng tối mờ (Backdrop).
  4. Mở lại menu và click vào một liên kết menu (ví dụ: `Dịch vụ`).
- **Kết quả mong đợi**:
  - [ ] Menu Drawer trượt ra mượt mà từ mép màn hình.
  - [ ] Toàn bộ khung trang bên dưới bị khóa cuộn cứng (`overflow: hidden` / `overscroll-behavior: contain`), triệt tiêu 100% hiện tượng cuộn lọt mép.
  - [ ] Click nút Đóng hoặc click Backdrop đóng menu tức thì.
  - [ ] Click liên kết: Chuyển đúng trang và tự động đóng Drawer.

---

## 2. Modal Mua Nhanh Tại Trang Chủ (`components/ui/landing-buy-now`)

### TC-MOD-01: Kích hoạt modal mua nhanh và nạp dữ liệu sản phẩm
- **Điều kiện**: Đang ở trang chủ `/`.
- **Các bước thực hiện**:
  1. Tìm đến thẻ sản phẩm bất kỳ tại mục "Sản phẩm bán chạy".
  2. Bấm nút `Mua ngay`.
- **Kết quả mong đợi**:
  - [ ] Modal mở lên chính giữa màn hình với hiệu ứng mờ kính đục, bo góc 9px chuẩn [AGENTS.md](file:///d:/Aboutme/MyProject/Pawpal/AGENTS.md).
  - [ ] Nạp chính xác: Ảnh sản phẩm, tên sản phẩm, nhãn hiệu, giá bán theo biến thể rẻ nhất, các tùy chọn phân loại (size, mùi vị, trọng lượng...).
  - [ ] Nút tăng giảm số lượng hoạt động: Click `+` tăng 1, click `-` giảm 1 (chặn không cho giảm xuống < 1).

### TC-MOD-02: Kiểm tra giới hạn tồn kho khi mua nhanh
- **Điều kiện**: Modal mua nhanh đang mở.
- **Các bước thực hiện**:
  1. Nhập số lượng mua lớn hơn số lượng tồn kho thực tế của biến thể (ví dụ: nhập `9999`).
  2. Bấm nút `Tiến hành đặt hàng`.
- **Kết quả mong đợi**:
  - [ ] Hệ thống hiển thị cảnh báo đỏ rõ ràng: "Chỉ còn X sản phẩm trong kho".
  - [ ] Chặn không cho chuyển trang thanh toán khi vượt quá tồn kho.

### TC-MOD-03: Chuyển hướng Checkout từ modal mua nhanh
- **Điều kiện**: Chọn số lượng hợp lệ (ví dụ: `2`).
- **Các bước thực hiện**:
  1. Chọn phân loại biến thể mong muốn.
  2. Bấm `Tiến hành đặt hàng`.
- **Kết quả mong đợi**:
  - [ ] Lưu giỏ hàng phiên mua nhanh và chuyển hướng thẳng đến `/pages/shop/checkout/checkout.html?buynow=true`.
  - [ ] Tại trang Checkout: Chỉ hiển thị đúng sản phẩm vừa chọn mua nhanh, không bị lẫn với các món đang có trong giỏ hàng chính.

---

# PHẦN II: PHÂN HỆ TRANG CÔNG KHAI (`/pages/public/`)

## 1. Trang Chủ (Landing Page - `pages/public/landing/`)

### TC-LND-01: Tải Banner động từ Supabase
- **Điều kiện**: Truy cập `/`.
- **Các bước thực hiện**:
  1. Mở trang chủ và quan sát slider banner đầu trang.
  2. Kiểm tra tab Network trên DevTools (lọc `banner`).
- **Kết quả mong đợi**:
  - [ ] Câu truy vấn Supabase gọi đúng bảng `banner` với điều kiện `status = 'dang_hien_thi'`.
  - [ ] Mã HTTP 200 OK, **không có lỗi 400 Bad Request** do sai enum hay tìm cột không tồn tại.
  - [ ] Banner hiển thị đầy đủ hình ảnh, tiêu đề, nút bấm CTA chuyển hướng đúng trang khuyến mãi.

### TC-LND-02: Nạp danh mục dịch vụ nổi bật
- **Các bước thực hiện**:
  1. Cuộn đến khối "Dịch vụ nổi bật tại PawPal".
  2. Kiểm tra hiển thị 3 khối: Grooming & Spa, Pet Hotel, Pet Taxi.
  3. Bấm vào từng khối dịch vụ.
- **Kết quả mong đợi**:
  - [ ] Chuyển hướng chính xác đến `/services` với tab danh mục tương ứng được active sẵn.

### TC-LND-03: Danh sách sản phẩm nổi bật & Hiển thị giá đa biến thể
- **Các bước thực hiện**:
  1. Cuộn đến khối sản phẩm.
  2. Quan sát mức giá hiển thị trên từng thẻ sản phẩm.
  3. Kiểm tra các sản phẩm có giảm giá.
- **Kết quả mong đợi**:
  - [ ] Giá hiển thị là giá thấp nhất trong số các biến thể đang bán (`dang_ban`).
  - [ ] Sản phẩm có giảm giá: Hiển thị giá khuyến mãi in đậm màu xanh `#236B48`, giá gốc gạch ngang màu xám mờ và huy hiệu `% Giảm`.
  - [ ] Không có sản phẩm nào bị hiển thị giá `0đ` hoặc `NaN`.

### TC-LND-04: Thao tác Yêu thích (Wishlist Heart Toggle) tại trang chủ
- **Các bước thực hiện**:
  1. **Khi chưa đăng nhập**: Bấm icon trái tim trên thẻ sản phẩm $\rightarrow$ Kiểm tra `localStorage: pawpal_wishlist`.
  2. **Khi đã đăng nhập** (`0987654321`): Bấm icon trái tim trên 2 sản phẩm khác nhau.
  3. Mở tab Network kiểm tra request Supabase.
  4. Truy cập trang `/user#wishlist`.
- **Kết quả mong đợi**:
  - [ ] Icon trái tim chuyển ngay sang màu đỏ khi yêu thích, chuyển về rỗng khi bỏ chọn.
  - [ ] Khi đã đăng nhập: Dữ liệu đồng bộ ghi vào bảng `wishlist_item` Supabase.
  - [ ] Trang `/user#wishlist` hiển thị đúng các sản phẩm vừa thả tim.

### TC-LND-05: Slider Đánh giá khách hàng (Testimonials Carousel)
- **Các bước thực hiện**:
  1. Cuộn đến khối "Khách hàng nói gì về PawPal".
  2. Thu nhỏ cửa sổ trình duyệt từ 1920px xuống 1200px, 768px, 375px.
  3. Bấm nút điều hướng `<` và `>` của slider.
- **Kết quả mong đợi**:
  - [ ] Các thẻ đánh giá tự động tính toán lại chiều rộng vừa vặn với khung nhìn màn hình.
  - [ ] Không có hiện tượng tràn chiều ngang (horizontal overflow) làm mất thanh cuộn trang chính.
  - [ ] Nút điều hướng hoạt động êm ái, hiển thị số sao, hình ảnh bé cưng và nhận xét của chủ nuôi.

---

## 2. Trang Đăng Nhập & Đăng Ký (`pages/public/login/`)

### TC-LOG-01: Chuyển đổi qua lại giữa Đăng nhập, Đăng ký và Quên mật khẩu
- **Các bước thực hiện**:
  1. Truy cập `http://localhost:3000/login`.
  2. Bấm tab `Đăng ký` $\rightarrow$ Quan sát URL.
  3. Bấm liên kết `Quên mật khẩu?` $\rightarrow$ Quan sát URL.
  4. Bấm liên kết `Quay lại đăng nhập`.
- **Kết quả mong đợi**:
  - [ ] Giao diện chuyển đổi form tức thì mà không bị reload lại trang.
  - [ ] URL cập nhật đúng hash/param: `?action=register`, `?action=forgot`, `?action=login`.

### TC-LOG-02: Kiểm tra nhập liệu form Đăng nhập (Validation & Error States)
- **Các bước thực hiện**:
  1. Bỏ trống SĐT $\rightarrow$ Bấm `Tiếp tục`.
  2. Nhập SĐT sai định dạng: `12345`, `091234567899` (11 số), `abc` $\rightarrow$ Bấm `Tiếp tục`.
  3. Nhập SĐT chưa từng đăng ký: `0999999999` $\rightarrow$ Bấm `Tiếp tục`.
  4. Nhập SĐT đúng `0987654321`, nhập sai mật khẩu `SaiMatKhau123!` $\rightarrow$ Bấm `Đăng nhập`.
- **Kết quả mong đợi**:
  - [ ] Báo lỗi rõ ràng: "Vui lòng nhập số điện thoại hợp lệ (10 chữ số, bắt đầu bằng 0)".
  - [ ] Với SĐT chưa đăng ký: Báo lỗi "Số điện thoại chưa đăng ký. Vui lòng tạo tài khoản".
  - [ ] Với mật khẩu sai: Báo lỗi "Thông tin đăng nhập không đúng". Ô mật khẩu được giữ nguyên để nhập lại.

### TC-LOG-03: Đăng nhập thành công và khôi phục đích đến (Redirect URL)
- **Các bước thực hiện**:
  1. Đang ở trang chi tiết sản phẩm `/pages/shop/product-detail/product-detail.html?id=[id]`.
  2. Bấm vào Header để đăng nhập (URL có gắn `?redirect=...`).
  3. Nhập SĐT: `0987654321` $\rightarrow$ Bấm `Tiếp tục`.
  4. Nhập mật khẩu: `Password123!` $\rightarrow$ Bấm `Đăng nhập`.
- **Kết quả mong đợi**:
  - [ ] Thông báo Toast xanh: "Đăng nhập thành công".
  - [ ] Lưu đầy đủ thông tin phiên vào `localStorage` và `sessionStorage: pawpal_current_user`.
  - [ ] Tự động chuyển hướng quay lại đúng trang chi tiết sản phẩm ban đầu.

### TC-LOG-04: Đăng ký tài khoản mới với mã OTP thử nghiệm (Demo OTP)
- **Các bước thực hiện**:
  1. Chọn tab `Đăng ký`.
  2. Nhập Họ và tên: `Nguyễn Văn Thử Nghiệm`.
  3. Nhập SĐT mới chưa từng có trong hệ thống (ví dụ: `0933112233`).
  4. Nhập mật khẩu: `Pawpal@2026` và xác nhận lại mật khẩu.
  5. Bấm `Đăng ký` $\rightarrow$ Màn hình hiển thị ô nhập mã OTP 6 số.
  6. Nhập mã OTP sai `111222` $\rightarrow$ Bấm xác thực.
  7. Nhập mã OTP thử nghiệm chuẩn: `555666`.
- **Kết quả mong đợi**:
  - [ ] Khi nhập mã sai: Báo lỗi "Mã xác thực không đúng. Vui lòng kiểm tra lại".
  - [ ] Khi nhập đúng `555666`: Tạo thành công tài khoản trong bảng `customer` và `customer_profile`, tự động đăng nhập và chuyển về trang người dùng `/user`.

---

# PHẦN III: PHÂN HỆ DỊCH VỤ & ĐẶT LỊCH (`/pages/services/`)

## 1. Danh Sách Dịch Vụ (`pages/services/services.html`)

### TC-SVC-01: Tải toàn bộ danh sách dịch vụ và bảng giá ma trận
- **Các bước thực hiện**:
  1. Mở trang `http://localhost:3000/services`.
  2. Kiểm tra tab Console và Network trên DevTools.
- **Kết quả mong đợi**:
  - [ ] Nạp thành công toàn bộ 27 dịch vụ từ bảng `service`.
  - [ ] Nạp thành công 85 dòng giá ma trận từ `service_price_matrix` với điều kiện `status = 'dang_hoat_dong'`.
  - [ ] **Không có lỗi 400 Bad Request** liên quan đến enum hay null check.
  - [ ] Tất cả các dịch vụ đều hiển thị giá khởi điểm chính xác (không bị trống giá).

### TC-SVC-02: Bộ lọc danh mục dịch vụ và phân loại theo thú cưng
- **Các bước thực hiện**:
  1. Bấm chip lọc `Grooming & Spa` $\rightarrow$ Kiểm tra danh sách hiển thị.
  2. Bấm chip lọc `Khách sạn Pet Hotel` $\rightarrow$ Kiểm tra các gói phòng lưu trú.
  3. Bấm chip lọc `Pet Taxi` $\rightarrow$ Kiểm tra các gói đưa đón.
  4. Chọn lọc theo thú cưng: `Chó` hoặc `Mèo`.
- **Kết quả mong đợi**:
  - [ ] Danh sách lọc chính xác 100%, không bị lẫn lộn giữa khách sạn và cắt tỉa.
  - [ ] Thẻ dịch vụ hiển thị rõ thời lượng thực hiện (ví dụ: `60 phút`, `90 phút`).

### TC-SVC-03: Lọc dịch vụ từ liên kết tìm kiếm trên Header
- **Các bước thực hiện**:
  1. Truy cập trực tiếp đường dẫn: `http://localhost:3000/services?search=khách+sạn`.
- **Kết quả mong đợi**:
  - [ ] Ô tìm kiếm trên trang tự động điền chữ "khách sạn".
  - [ ] Danh sách dịch vụ được lọc tự động, chỉ hiển thị các gói dịch vụ Pet Hotel.

---

## 2. Quy Trình Đặt Lịch Trực Tuyến 4 Bước (`pages/services/booking/`)

### TC-BKG-01: Bước 1 - Chọn dịch vụ và nạp bé cưng tự động
- **Điều kiện**: Đã đăng nhập tài khoản `0987654321`.
- **Các bước thực hiện**:
  1. Truy cập `/booking`.
  2. Chọn dịch vụ `Tắm sấy và vệ sinh tiêu chuẩn`.
  3. Quan sát ô chọn thú cưng.
  4. Chuyển đổi giữa các bé cưng có sẵn trong tài khoản.
- **Kết quả mong đợi**:
  - [ ] Hệ thống tự động nạp danh sách các bé cưng của tài khoản.
  - [ ] Khi chọn một bé: Cân nặng của bé được nạp vào và **giá dịch vụ tự động nhảy theo đúng biểu giá ma trận** tương ứng với cân nặng của bé.

### TC-BKG-02: Bước 2 - Chọn chuyên viên kỹ thuật (KTV / Groomer) theo ca trực thật
- **Các bước thực hiện**:
  1. Tại Bước 2, quan sát danh sách KTV hiển thị.
  2. Bấm chọn một KTV cụ thể (ví dụ: Chuyên viên Phạm Thúy Vy).
  3. Hoặc chọn tùy chọn "PawPal tự động sắp xếp chuyên viên phù hợp".
- **Kết quả mong đợi**:
  - [ ] Danh sách KTV được nạp từ bảng `staff` với trạng thái `ACTIVE` / `dang_hoat_dong`.
  - [ ] Hiển thị đầy đủ cấp bậc chuyên môn và số lượng đánh giá tích cực.

### TC-BKG-03: Bước 3 - Chọn ngày giờ và chống trùng lịch hẹn (Slot Locking)
- **Các bước thực hiện**:
  1. Chọn ngày hẹn là ngày hôm nay hoặc ngày mai (kiểm tra các ngày quá khứ bị vô hiệu hóa).
  2. Quan sát lưới các khung giờ (Timeslot) từ 08:00 đến 19:00.
  3. Chọn một khung giờ đã có lịch hẹn được xác nhận trước đó.
- **Kết quả mong đợi**:
  - [ ] Các khung giờ đã kín lịch hiển thị trạng thái xám mờ (disabled) kèm nhãn "Đã kín".
  - [ ] Người dùng chỉ được phép chọn các khung giờ còn trống.
  - [ ] Bố cục lưới giờ hiển thị thoáng đãng, không bị co giật chữ.

### TC-BKG-04: Bước 4 - Xác nhận thông tin, ghi chú an toàn và tạo lịch hẹn Supabase
- **Các bước thực hiện**:
  1. Nhập ghi chú tập tính: `Bé sợ tiếng máy sấy mạnh, nhờ KTV thao tác nhẹ nhàng`.
  2. Nhập mã giảm giá Voucher nếu có.
  3. Kiểm tra bảng tóm tắt chi phí (Giá dịch vụ, chiết khấu, tổng thanh toán).
  4. Bấm nút `Xác nhận đặt lịch`.
- **Kết quả mong đợi**:
  - [ ] Dữ liệu được ghi thành công vào bảng `appointment` Supabase với trạng thái chuẩn `cho_xac_nhan`.
  - [ ] Màn hình chuyển hướng đến `booking-success.html`.
  - [ ] Hiển thị mã lịch hẹn (ví dụ: `BK-2026-XXXXX`), QR Code và nút "Xem nhật ký chăm sóc của ca này".

---

# PHẦN IV: PHÂN HỆ CỔNG THÀNH VIÊN USER PORTAL (`/pages/user/`)

## 1. Bộ Điều Phối & Quản Lý Luồng SPA (`pages/user/user.js`)

### TC-USR-01: Điều hướng các phân hệ một bước (Single-step Rendering)
- **Các bước thực hiện**:
  1. Đăng nhập tài khoản `0987654321`.
  2. Lần lượt click qua các mục bên Sidebar: `Hồ sơ cá nhân` $\rightarrow$ `Bé cưng của tôi` $\rightarrow$ `Nhật ký chăm sóc` $\rightarrow$ `Lịch hẹn dịch vụ` $\rightarrow$ `Đơn hàng của bé` $\rightarrow$ `Danh sách yêu thích` $\rightarrow$ `Pawpoint` $\rightarrow$ `Khiếu nại & Hỗ trợ`.
  3. Quan sát màn hình khi chuyển tab.
- **Kết quả mong đợi**:
  - [ ] Phân hệ mới nạp mượt mà, **triệt tiêu 100% hiện tượng màn hình trắng chớp nháy (no flicker)**.
  - [ ] URL Hash thay đổi tương ứng: `#profile`, `#pets`, `#diary`, `#bookings`, `#orders`, `#wishlist`, `#loyalty`, `#support`.
  - [ ] Sub-breadcrumb trên Header tự động nối đường dẫn: `Cổng thành viên / [Tên phân hệ]`.

### TC-USR-02: Bền vững trạng thái khi F5 / Reload trang web
- **Các bước thực hiện**:
  1. Đang ở phân hệ `#diary` (Nhật ký chăm sóc) của một bé cưng.
  2. Nhấn phím `F5` hoặc `Ctrl + R` để tải lại trang.
- **Kết quả mong đợi**:
  - [ ] Trang web mở lại ngay lập tức tại đúng phân hệ `#diary`, không bị nhảy về trang mặc định `#profile`.
  - [ ] Bé cưng đang chọn được giữ nguyên.

---

## 2. Quản Lý Bé Cưng (`pages/user/modules/pets/`)

### TC-PET-01: Tải danh sách bé cưng và chuyển tab Lưu trữ / Đang nuôi
- **Các bước thực hiện**:
  1. Vào `#pets`.
  2. Bấm chuyển qua lại giữa tab `Bé cưng đang nuôi` và `Hồ sơ lưu trữ`.
- **Kết quả mong đợi**:
  - [ ] Danh sách hiển thị đúng các bé từ bảng `pet` của chủ nuôi.
  - [ ] Thẻ từng bé có ảnh đại diện, tên, giống loài, giới tính, cân nặng.
  - [ ] Chuyển tab dùng class `.d-none`, không bị vỡ khung thẻ.

### TC-PET-02: Mở Deep Link xem chi tiết bé cưng
- **Các bước thực hiện**:
  1. Lấy ID của một bé cưng (ví dụ: `pet-123`).
  2. Dán link trực tiếp vào trình duyệt: `http://localhost:3000/pages/user/index.html#pets?id=pet-123`.
- **Kết quả mong đợi**:
  - [ ] Giao diện mở thẳng màn hình chi tiết của bé cưng `pet-123`.
  - [ ] **Không bị nháy lộ màn hình danh sách bé cưng trước khi vào chi tiết**.

### TC-PET-03: Thêm bé cưng mới và kiểm tra ràng buộc trường
- **Các bước thực hiện**:
  1. Bấm nút `Thêm bé cưng`.
  2. Bỏ trống Tên bé $\rightarrow$ Bấm `Lưu bé cưng`.
  3. Nhập đầy đủ: Tên bé `Miu Miu`, Loài `Mèo`, Giống `Anh lông ngắn`, Cân nặng `4.5 kg`, Ngày sinh, Giới tính `Đực`.
  4. Nhập trường tự do: Tiền sử dị ứng `Dị ứng hải sản`, Cảnh báo an toàn `Hay cắn khi cắt móng`.
  5. Bấm nút `Lưu bé cưng`.
- **Kết quả mong đợi**:
  - [ ] Bỏ trống trường bắt buộc: Báo lỗi đỏ tại ô nhập, không cho lưu.
  - [ ] Nhập đủ: Ghi dữ liệu thành công vào bảng `pet` Supabase, hiển thị Toast xanh và bé mới xuất hiện ngay trên danh sách.

---

## 3. Nhật Ký Chăm Sóc Thời Gian Thực 360° (`pages/user/modules/diary/`)

### TC-DIR-01: Chuyển đổi bé cưng trên thanh trượt Pill
- **Các bước thực hiện**:
  1. Vào `#diary`.
  2. Quan sát hàng nút chọn bé cưng dạng pill ngang.
  3. Bấm chọn bé cưng thứ 2.
- **Kết quả mong đợi**:
  - [ ] Nút chọn đổi màu active xanh Forest Green `#236B48`.
  - [ ] Khung nhật ký bên dưới cập nhật ngay nhật ký tương ứng của bé được chọn.

### TC-DIR-02: Mở đúng phiên chăm sóc từ lịch hẹn (Deep Link Session ID)
- **Các bước thực hiện**:
  1. Từ màn hình Lịch hẹn (`#bookings`), bấm nút `Xem nhật ký ca này` của một lịch hẹn cụ thể (ID: `apt-999`).
  2. Trình duyệt điều hướng đến `#diary?id=[petId]&sessionId=apt-999`.
- **Kết quả mong đợi**:
  - [ ] Mở chính xác ca dịch vụ mang mã `apt-999`.
  - [ ] Hiển thị đầy đủ ảnh Before/After, các chỉ số da lông, tai móng và biểu đồ tâm trạng của ca đó.
  - [ ] Nếu ca dịch vụ này KTV chưa ghi nhật ký: Hiển thị Empty state thanh nhã: "Ca dịch vụ này chưa có nhật ký chăm sóc", **tuyệt đối không mở nhầm nhật ký của ca khác**.

---

## 4. Quản Lý Đơn Hàng & Đổi Trả RMA (`pages/user/modules/orders/`)

### TC-ORD-01: Tải danh sách đơn hàng và phân loại trạng thái
- **Các bước thực hiện**:
  1. Vào `#orders`.
  2. Bấm qua từng tab: `Tất cả`, `Chờ xác nhận`, `Đang đóng gói`, `Đang giao hàng`, `Đã giao hàng`, `Đã hủy`.
- **Kết quả mong đợi**:
  - [ ] Đơn hàng hiển thị đúng mã đơn, ngày đặt, hình ảnh sản phẩm đại diện, tổng tiền.
  - [ ] Các trạng thái khớp chuẩn 100% với ENUM Tiếng Việt trong Supabase.

### TC-ORD-02: Xem chi tiết đơn hàng (3NF Product Variant Navigation)
- **Các bước thực hiện**:
  1. Bấm vào một đơn hàng để xem chi tiết.
  2. Kiểm tra thông tin dòng sản phẩm.
- **Kết quả mong đợi**:
  - [ ] Hàm `API.getUserOrders` nạp dữ liệu chuẩn 3NF: Đọc qua `product_variant` lấy `sku_variant`, `sale_price` và thông tin `product`.
  - [ ] Hiển thị chính xác mã SKU, số lượng, đơn giá, tổng tiền, đơn vị vận chuyển và mã tracking.
  - [ ] Không có lỗi Console do thiếu `product_id`.

### TC-ORD-03: Kích hoạt Drawer Đổi Trả RMA và hỗ trợ phím Escape
- **Các bước thực hiện**:
  1. Tìm đơn hàng ở trạng thái `da_giao_hang`.
  2. Bấm nút `Yêu cầu đổi trả`.
  3. Nhấn phím `Escape` trên bàn phím.
  4. Mở lại Drawer, chọn lý do đổi trả, tải ảnh bằng chứng và bấm `Gửi yêu cầu`.
- **Kết quả mong đợi**:
  - [ ] Drawer trượt ra mượt mà, tiêu điểm focus tự động chuyển vào Drawer.
  - [ ] Nhấn phím `Escape` đóng Drawer ngay lập tức và trả lại focus cho nút vừa bấm.
  - [ ] Gửi yêu cầu: Lưu thành công vào bảng `return_request` và `return_request_detail` Supabase, chuyển trạng thái thành `cho_tiep_nhan`.

---

## 5. Khiếu Nại & CSKH 2 Chiều (`pages/user/modules/support/`)

### TC-SUP-01: Tạo phiếu khiếu nại liên kết đơn hàng / lịch hẹn thật
- **Các bước thực hiện**:
  1. Vào `#support`, bấm nút `Tạo yêu cầu mới`.
  2. Kiểm tra ô dropdown "Đơn hàng liên quan".
  3. Chọn một đơn hàng thực tế của tài khoản.
  4. Nhập tiêu đề, mô tả sự cố và bấm `Gửi yêu cầu`.
- **Kết quả mong đợi**:
  - [ ] Dropdown tự động nạp danh sách các đơn hàng thật của tài khoản (không bị trống rỗng).
  - [ ] Tạo thành công ticket trong bảng `support_ticket`.

### TC-SUP-02: Chat trao đổi 2 chiều giữa Khách hàng và Nhân viên CSKH
- **Các bước thực hiện**:
  1. Mở một phiếu khiếu nại đang xử lý.
  2. Gõ tin nhắn: `Tôi muốn cập nhật thêm hình ảnh bao bì sản phẩm bị móp`.
  3. Bấm gửi.
- **Kết quả mong đợi**:
  - [ ] Tin nhắn xuất hiện ngay trên khung chat của khách.
  - [ ] Lưu thành công vào bảng `support_ticket_message` với cột nội dung là `content`.

---

# PHẦN V: PHÂN HỆ CỬA HÀNG & MUA SẮM (`/pages/shop/`)

## 1. Giỏ Hàng (`pages/shop/cart/cart.js`)

### TC-CRT-01: Cơ chế hàng đợi bất đồng bộ (`queueCartWrite`) chống tranh chấp dữ liệu
- **Các bước thực hiện**:
  1. Mở giỏ hàng có 1 sản phẩm.
  2. Dùng chuột click nút tăng số lượng `+` liên tục 5 lần thật nhanh.
  3. Quan sát số lượng hiển thị và kiểm tra bảng `cart_item` trong CSDL.
- **Kết quả mong đợi**:
  - [ ] Số lượng nhảy chính xác từ 1 lên 6 mà không bị ghi đè hay mất lần bấm nào.
  - [ ] Không phát sinh lỗi Race Condition.
  - [ ] Dữ liệu lưu vào `cart_item` khớp đúng 6 món với `product_variant_id`.

### TC-CRT-02: Cách ly giỏ hàng theo tài khoản (`pawpal_cart_owner`)
- **Các bước thực hiện**:
  1. Đăng nhập tài khoản A (`0987654321`), thêm 2 sản phẩm vào giỏ.
  2. Đăng xuất tài khoản A.
  3. Đăng nhập tài khoản B (`0901234567`).
  4. Mở giỏ hàng.
- **Kết quả mong đợi**:
  - [ ] Giỏ hàng của tài khoản B hoàn toàn độc lập, **tuyệt đối không bị lẫn sản phẩm từ giỏ của tài khoản A**.

---

## 2. Thanh Toán Đặt Hàng (`pages/shop/checkout/checkout.js`)

### TC-CHK-01: Kiểm tra quyền sở hữu Voucher và hạn mức tối thiểu
- **Các bước thực hiện**:
  1. Cho vào giỏ món hàng trị giá `100.000đ`.
  2. Tại trang Checkout, nhập mã voucher có điều kiện min-order `150.000đ` (ví dụ: `PETCARE50`).
  3. Bấm áp dụng.
  4. Nhập mã voucher thuộc sở hữu của một tài khoản khác.
- **Kết quả mong đợi**:
  - [ ] Đơn 100k áp voucher min 150k: Báo lỗi từ chối "Đơn hàng chưa đạt giá trị tối thiểu 150.000đ".
  - [ ] Voucher của khách khác: Báo lỗi "Mã giảm giá không hợp lệ hoặc không thuộc tài khoản của bạn".

### TC-CHK-02: Đặt hàng thành công và trừ tồn kho nguyên tử (Atomic Stock Deduction)
- **Các bước thực hiện**:
  1. Kiểm tra số lượng tồn kho ban đầu của sản phẩm (ví dụ: còn `10` cái).
  2. Đặt đơn hàng với số lượng `2` cái, chọn phương thức `COD`.
  3. Bấm `Hoàn tất đặt hàng`.
  4. Kiểm tra lại bảng `inventory` và `sales_order`.
- **Kết quả mong đợi**:
  - [ ] Tạo thành công đơn hàng trong `sales_order` với trạng thái `cho_xac_nhan`.
  - [ ] Tồn kho trong `inventory` tự động giảm nguyên tử từ `10` xuống còn `8`.
  - [ ] Ghi nhận một dòng giao dịch xuất kho trong bảng `inventory_transaction`.
  - [ ] Chuyển hướng đến trang `payment-success.html` kèm mã đơn hàng.

---

# PHẦN VI: KIỂM THỬ TOÀN VẸN DỮ LIỆU, HIỆU NĂNG & CONSOLE (SYSTEM HEALTH)

### TC-SYS-01: Zero Console Errors trên mọi trang
- **Các bước thực hiện**:
  1. Mở DevTools Console (phím `F12`), bật bộ lọc `Errors`.
  2. Điều hướng qua tất cả các trang: Trang chủ $\rightarrow$ Dịch vụ $\rightarrow$ Đặt lịch $\rightarrow$ Cửa hàng $\rightarrow$ Chi tiết sản phẩm $\rightarrow$ Giỏ hàng $\rightarrow$ Thanh toán $\rightarrow$ Cổng User.
- **Kết quả mong đợi**:
  - [ ] **0 lỗi đỏ (Zero Red Errors)** trên toàn bộ hành trình trải nghiệm.
  - [ ] Không có lỗi cú pháp Javascript (`SyntaxError`).
  - [ ] Không có lỗi tài nguyên 404 / 400 Bad Request từ Supabase PostgREST.

### TC-SYS-02: Ràng buộc khóa ngoại 3NF & Không còn `product_id` thừa
- **Các bước thực hiện**:
  1. Chạy bộ kiểm thử tự động `node scripts/test/test_sales_lifecycle.js`.
  2. Chạy bộ kiểm thử tự động `node scripts/test/test_ord_f01_f16_suite.js`.
- **Kết quả mong đợi**:
  - [ ] Toàn bộ 7/7 bước vòng đời bán hàng đạt 100%.
  - [ ] Toàn bộ 16/16 tiêu chuẩn nghiệp vụ ORD đạt 100%.

---

## TIẾN ĐỘ THỰC HIỆN KIỂM THỬ (TRACKING PROGRESS)

- [x] **GIAI ĐOẠN 1: Xác thực & Khung giao diện (Foundation, Header, Auth, Landing & Buy Now)** (6/6 nhóm - ĐÃ PASS 100%)
- [ ] **GIAI ĐOẠN 2: Dịch vụ & Luồng đặt lịch trực tuyến (Services & Booking Flow)** (Chưa kiểm thử)
- [ ] **GIAI ĐOẠN 3: Cửa hàng, Giỏ hàng & Thanh toán (Shop, Cart & Checkout)** (Chưa kiểm thử)
- [ ] **GIAI ĐOẠN 4: Cổng thành viên User Portal & Nghiệp vụ chuyên sâu (Pets, Diary, Orders, RMA, Support)** (Chưa kiểm thử)
- [x] **Toàn vẹn hệ thống & Console (Zero Red Errors & 3NF Schema)** (ĐÃ PASS 100%)

*Tiến độ: Đã hoàn thành Giai đoạn 1 xuất sắc! Sẵn sàng chuyển sang Giai đoạn 2.*
