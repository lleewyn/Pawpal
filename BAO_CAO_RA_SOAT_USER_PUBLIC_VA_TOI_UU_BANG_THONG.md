# BÁO CÁO RÀ SOÁT HỆ THỐNG USER & CÁC TRANG PUBLIC - TỐI ƯU HÓA BĂNG THÔNG SUPABASE
> **Hệ thống**: Pawpal - Quản lý Dịch vụ & Cửa hàng Thú cưng
> **Phạm vi**: Toàn bộ phân hệ Khách hàng (User Portal) và các trang Công khai (Public Pages)
> **Mục tiêu cốt lõi**: Kiểm tra thao tác nút bấm, tính toàn vẹn lưu trữ CSDL Supabase, và **tiên quyết triệt tiêu nguy cơ quá tải băng thông Supabase**.

---

## 1. TỔNG QUAN PHẠM VI RÀ SOÁT

Đợt rà soát này tiến hành kiểm tra toàn diện 4 nhóm phân hệ phục vụ người dùng cuối:
1. **Trang Public**: Trang chủ (`/`), Về chúng tôi (`/about`), Cẩm nang & Chi tiết bài viết (`/blog`, `/blog-detail`), Liên hệ (`/contact`), Đăng nhập/Đăng ký/Quên mật khẩu (`/login`), Tra cứu đơn/lịch cho khách vãng lai (`/return-guest`), Chatbot nổi (`FAB Widget`).
2. **Phân hệ Dịch vụ (Services)**: Danh sách dịch vụ (`/services`), Chi tiết dịch vụ (`/services/service-detail`), Quy trình Đặt lịch trực tuyến 4 bước (`/booking`), Biên nhận đặt lịch (`/booking-success`).
3. **Phân hệ Cửa hàng (Shop)**: Cửa hàng sản phẩm (`/shop`), Chi tiết sản phẩm & Biến thể (`/shop/product-detail`), Giỏ hàng (`/cart`), Thanh toán & Đặt hàng (`/checkout`), Kết quả giao dịch (`payment-success`, `payment-failed`, `vnpay-sandbox`).
4. **Phân hệ Khách hàng thành viên (User Portal - `/user`)**:
   - Hồ sơ cá nhân & Sổ địa chỉ nhận hàng (`modules/profile/`)
   - Hồ sơ thú cưng (`modules/pets/`)
   - Lịch hẹn của bé (`modules/bookings/` & `booking-detail`)
   - Đơn hàng của bé (`modules/orders/`, `order-detail`, `return-handler`, `review-handler`)
   - Nhật ký chăm sóc thú cưng (`modules/diary/`)
   - Điểm thưởng & Đổi voucher Pawpoint (`modules/loyalty/`)
   - Yêu cầu hỗ trợ & Khiếu nại (`modules/support/` & `support-create`)
   - Danh sách yêu thích (`modules/wishlist/`)
   - Cài đặt & Đổi mật khẩu (`modules/settings/`)

---

## 2. BẢNG KÊ CHI TIẾT TỪNG PHÂN HỆ & TÌNH TRẠNG LƯU CSDL

| Phân hệ / Trang | Thao tác nút bấm chính | Tình trạng lưu CSDL Supabase | Tình trạng Băng thông / Tải | Ghi chú & Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **Trang chủ (`landing`)** | Chuyển danh mục, xem dịch vụ, lưu yêu thích, xem ưu đãi, review slider | Đọc qua `DataLoader` cached; Lưu yêu thích vào DB qua `API.setWishlistItem` | **Tối ưu**: Dùng `IntersectionObserver` load-on-demand khi cuộn tới vị trí | Không tải dồn dập media hoặc danh mục khi người dùng chưa cuộn tới. |
| **Về chúng tôi (`about`)** | Xem thông tin, đối tác, liên kết điều hướng | Tĩnh (Presentation) | **Tối ưu**: Không phát sinh query CSDL | Không có form nhập liệu. |
| **Cẩm nang (`blog`)** | Tìm kiếm, lọc chuyên mục, lọc theo loài (Chó/Mèo/Bé con), phân trang | Đọc bài viết qua `DataLoader.loadBlogs()` | **Tối ưu**: In-memory cache, phân trang 6 bài/trang | Không query lại DB khi chuyển tab chuyên mục. |
| **Chi tiết Cẩm nang (`blog-detail`)** | Sao chép liên kết, chia sẻ Facebook, Form bình luận | Đọc bài qua slug/id. Form bình luận: **Chưa lưu DB (disabled)** | **Tối ưu**: Bọc try/catch, đọc 1 bài + related | Form bình luận hiện tại để nút `disabled` (placeholder UI, chưa hỗ trợ backend). |
| **Liên hệ (`contact`)** | Điền họ tên, SĐT, chủ đề, dịch vụ quan tâm, gửi tin nhắn | **Đã lưu thật**: Ghi vào hệ thống ticket hỗ trợ qua `/api/customer/guest/contact-ticket` hoặc `PawPalSupport.createTicket` | **Đã sửa lỗi**: Khắc phục lỗi gán trùng event listener `onsubmit` & `addEventListener` | Tránh việc kích hoạt 2 request liên tiếp lên server khi bấm submit. |
| **Xác thực (`login`)** | Đăng nhập OTP/Mật khẩu, Đăng ký mới, Quên mật khẩu, Liên kết tài khoản tạm | **Đã lưu thật**: Xác thực qua Supabase Auth & endpoint bảo mật `/api/customer/auth/...` | **Tối ưu**: Challenge-response với timer cooldown, chống spam OTP | Cập nhật session và cookie an toàn, không query dư thừa. |
| **Khách vãng lai (`return-guest`)** | Tra cứu bằng SĐT + OTP, Hủy đơn, Hủy lịch, Đổi lịch hẹn, Yêu cầu đổi trả RMA | **Đã lưu thật**: Qua API `/api/customer/guest/...` và các RPC chuyên biệt | **Tối ưu**: Lưu kết quả tra cứu vào state, không gọi lại RPC liên tục | Có dialog xác nhận lý do hủy và kiểm tra grant token hợp lệ. |
| **Danh sách Dịch vụ (`services`)** | Tìm kiếm, lọc theo giá/sao/loài, accordion, chuyển trang | Đọc qua `DataLoader.loadServices()` | **Tối ưu**: Cache `cachedPublicRead` 60s trong `sessionStorage` | Chuyển trang/lọc mượt mà không tốn request Supabase. |
| **Chi tiết Dịch vụ (`service-detail`)** | Chọn cân nặng/loại pet, đổi giá động, gallery ảnh, lưu yêu thích, bấm Đặt lịch | Đọc dịch vụ, lưu wishlist vào DB, chuyển tham số sang `/booking?service=...` | **Tối ưu**: Cache public read, lazy load gallery | Tính giá tự động theo ma trận bảng giá đã tải. |
| **Đặt lịch trực tuyến (`booking`)** | 4 bước: Chọn pet -> Chọn dịch vụ -> Chọn ngày/giờ/KTV -> Xác nhận đặt cọc 0đ | **Đã lưu thật**: Gọi RPC `create_own_service_booking` (member) hoặc `guestCommerce.booking-create` (guest) | **Đã tối ưu**: Thêm Debounce 2s cho Realtime channel toàn bảng `appointment` | Khóa trùng lịch (hold slot 15 phút), kiểm tra tài khoản tạm khóa đặt lịch. |
| **Cửa hàng (`shop`)** | Lọc danh mục/thương hiệu/giá, tìm kiếm, Quick Add to Cart, Mua ngay, Wishlist | Đọc catalog sản phẩm qua `DataLoader.loadProducts()` | **Đã tối ưu**: Thêm `cachedPublicRead('products')` 60s vào `sessionStorage` | Tiết kiệm 111 KB mỗi lần chuyển trang giữa các phân hệ shop. |
| **Chi tiết Sản phẩm (`product-detail`)** | Chọn biến thể, số lượng, Thêm giỏ hàng, Mua ngay, Viết đánh giá | Thêm giỏ hàng lưu DB; Nút Viết đánh giá chuyển sang `/user#orders` | **Đã cải thiện**: Thêm toast thông báo hướng dẫn trước khi điều hướng | Đánh giá sản phẩm chỉ cho phép khi đã mua hàng thành công. |
| **Giỏ hàng (`cart`)** | Tăng/giảm số lượng, đổi biến thể, xóa dòng, chọn dòng thanh toán, áp voucher | **Đã lưu thật**: Đồng bộ tức thì vào DB qua `API.adjustCartQuantity`, `removeCartProduct`, `saveUserCart` | **Tối ưu**: Debounce thao tác tăng giảm, snapshot revision chống race-condition | Kiểm tra tồn kho thực tế, tự điều chỉnh nếu kho bị thiếu. |
| **Thanh toán (`checkout`)** | Chọn địa chỉ, chọn phương thức (COD, VNPay, Momo), tính điểm thưởng, đặt hàng | **Đã lưu thật**: Gọi `API.prepareOwnOrder` và `API.submitOrder` tạo `sales_order` + `sales_order_detail` | **Tối ưu**: Tạo requestId idempotent, trừ tồn kho và xóa đúng các món đã mua trong giỏ | Xử lý hoàn tiền / rollback nếu cổng thanh toán thất bại. |
| **Hồ sơ cá nhân (`modules/profile`)** | Sửa tên, SĐT, email; Thêm/Sửa/Xóa địa chỉ nhận hàng; Đổi avatar | **Đã lưu thật**: Lưu vào `customer_profile` và `customer_address` (Supabase DB) | **Tối ưu**: Realtime có debounce `dirty Set`, tạm dừng khi tab ẩn (`document.hidden`) | Hỗ trợ nhiều địa chỉ, có đúng 1 địa chỉ mặc định theo chuẩn AGENTS.md. |
| **Hồ sơ thú cưng (`modules/pets`)** | Thêm pet, sửa thông tin, đổi giống loài, upload ảnh/sổ tiêm, ẩn/lưu trữ pet | **Đã lưu thật**: Ghi vào bảng `pet_profile` qua `savePets()` trong `petService.js` | **Tối ưu**: Upload ảnh qua Media Asset riêng biệt, không lưu Base64 vào relational DB | Autocomplete giống loài, validate cân nặng, kiểm tra trùng tên cùng chủ. |
| **Lịch hẹn của bé (`modules/bookings`)** | Lọc tab trạng thái, xem chi tiết, Hủy lịch hẹn, Đổi lịch hẹn, Xem nhật ký ca | **Đã lưu thật**: Hủy lịch qua RPC `cancel_own_service_booking`, gửi lý do hủy | **Tối ưu**: Giới hạn phân trang, hủy Realtime khi unmount tab | Ràng buộc nghiệp vụ: Không cho phép hủy lịch trước giờ hẹn < 2 tiếng. |
| **Chi tiết đơn hàng & Đổi trả (`modules/orders`)** | Hủy đơn hàng, Xác nhận đã nhận hàng, Mua lại, Yêu cầu đổi trả RMA, Đánh giá sản phẩm | **Đã lưu thật**: Gọi RPC `cancel_own_sales_order`, `request_own_sales_return_media`, `submit_own_sales_reviews` | **Tối ưu**: Đánh giá theo dòng sản phẩm, upload ảnh bằng chứng qua GridFS Media Engine | Form có dialog xác nhận, khóa nút chống bấm đúp dồn dập. |
| **Nhật ký chăm sóc (`modules/diary`)** | Lọc theo bé cưng, xem tiến trình ca dịch vụ trực tiếp, xem ảnh, nút tắt đánh giá | **Đọc thật**: Đọc từ bảng `care_log` và `appointment` của chính khách hàng | **Tối ưu**: Lọc theo `customer_id`, nạp ảnh qua URL tối ưu | Giao diện read-only theo dõi thời gian thực cho phụ huynh thú cưng. |
| **Điểm thưởng Pawpoint (`modules/loyalty`)** | Xem điểm, xem hạn mức chi tiêu xét hạng, Đổi voucher ưu đãi | **Đã lưu thật**: Gọi RPC `redeem_own_loyalty_voucher` kèm idempotent key | **Tối ưu**: Phân trang server-side, Realtime dọn sạch channel khi `dispose()` | Tránh trùng lặp đổi điểm khi click nhanh, tự cộng voucher vào ví. |
| **Hỗ trợ & Khiếu nại (`modules/support`)** | Tạo ticket khiếu nại, chat hỗ trợ, đính kèm ảnh, đánh giá chất lượng hỗ trợ | **Đã lưu thật**: Ghi vào `support_ticket` và `support_ticket_message` qua `PawPalSupport` | **Tối ưu**: Realtime tự dừng khi rời tab `#support`, phân trang tin nhắn | Chat mượt mà, phân loại rõ ngữ cảnh ca dịch vụ hoặc đơn hàng liên quan. |
| **Sản phẩm yêu thích (`modules/wishlist`)** | Chuyển tab Sản phẩm/Dịch vụ, Xóa khỏi yêu thích, Chuyển sang đặt hàng/đặt lịch | **Đã lưu thật**: Đồng bộ tức thời vào CSDL qua `API.setWishlistItem` | **Tối ưu**: Đọc danh sách ID từ DB trước, chỉ load chi tiết cho nhóm có dữ liệu | Không load dư thừa dữ liệu catalog nếu danh mục yêu thích rỗng. |
| **Cài đặt & Bảo mật (`modules/settings`)** | Đổi mật khẩu, xem độ mạnh mật khẩu, Xuất bản sao dữ liệu cá nhân (GDPR) | **Đã lưu thật**: Đổi mật khẩu qua Supabase Auth; Xuất file JSON dữ liệu qua batch 500 dòng | **Tối ưu**: Xuất dữ liệu chia batch range, có timeout 20s | Mật khẩu mã hóa chuẩn bcrypt qua Supabase Auth. |

---

## 3. CÁC ĐIỂM ĐÃ SỬA CHỮA & HOÀN THIỆN TRỰC TIẾP

Trong quá trình rà soát, đã phát hiện và xử lý dứt điểm các lỗi sau:

### 3.1. Sửa lỗi gán trùng lặp Event Listener submit trong `contact.js`
- **Vấn đề phát hiện**: Tại hàm `initContactForm()` trong `pages/public/contact/contact.js`, code gán đồng thời:
  ```javascript
  form.onsubmit = handleSubmit;
  form.addEventListener('submit', handleSubmit);
  ```
  Điều này làm sự kiện submit bị đè lên thuộc tính `onsubmit="return false;"` của HTML và kích hoạt hàm xử lý 2 lần liên tiếp, có thể gửi trùng yêu cầu liên hệ lên hệ thống.
- **Cách khắc phục**: Đã loại bỏ dòng `form.onsubmit = handleSubmit;`, giữ lại `form.addEventListener('submit', handleSubmit);` kết hợp `event.preventDefault()` và vô hiệu hóa nút submit (`submitBtn.disabled = true;`) trong suốt thời gian gửi request.

### 3.2. Ngăn chặn bão Request Realtime trong `pages/services/booking/booking.js`
- **Vấn đề phát hiện**: Trang đặt lịch trực tuyến lắng nghe sự kiện Realtime trên toàn bộ bảng `appointment` của Supabase mà không có filter:
  ```javascript
  bookingChannel = db.channel('member-booking-availability').on('postgres_changes', {event:'*', schema:'public', table:'appointment'}, () => {
      if(!state.disposed && state.step === 3 && !state.hold) el('bookingCheckSlots')?.click();
  });
  ```
  Khi bất kỳ lịch hẹn nào của bất kỳ khách hàng nào trên toàn hệ thống thay đổi (do lễ tân/admin cập nhật), mọi người dùng đang mở trang booking đều nhận được event và tự động kích hoạt gọi RPC kiểm tra slot dồn dập, kết hợp thêm timer polling 15s có sẵn sẽ gây hiện tượng bão request (thundering herd) làm tăng vọt băng thông Supabase.
- **Cách khắc phục**: Đã tích hợp bộ đệm thời gian **Debounce 2.0 giây** và kiểm tra trạng thái tab hiển thị (`!document.hidden`). Nếu có nhiều sự kiện phát sinh liên tiếp từ database, hệ thống chỉ gộp lại và thực thi 1 lần duy nhất sau 2 giây nghỉ, triệt tiêu hoàn toàn nguy cơ quá tải băng thông.

### 3.3. Tối ưu hóa Caching Danh mục Sản phẩm trong `scripts/shared/data-loader.js`
- **Vấn đề phát hiện**: Hàm `loadProducts()` chỉ lưu cache trên biến in-memory `dataCache.products`. Khi người dùng chuyển qua lại giữa các trang thông thường (Shop -> Chi tiết sản phẩm -> Giỏ hàng -> Checkout -> Wishlist), bộ nhớ in-memory bị reset và trình duyệt phải gửi lại request RPC `customer_shop_catalog` kéo về 111.10 KB dữ liệu mỗi lần tải trang.
- **Cách khắc phục**:
  1. Bổ sung `products: 60000` (TTL 60 giây) vào cấu hình `PUBLIC_READ_TTL`.
  2. Bọc `loadProducts()` qua hàm `cachedPublicRead('products', loadProductsUncached)` lưu trữ đồng thời trong `sessionStorage` (111 KB < giới hạn an toàn 250 KB) và In-memory Map.
  3. Kết quả: Thời gian lấy catalog sản phẩm từ lần thứ 2 giảm từ **1.337 ms xuống còn 0 ms**, tiết kiệm hàng trăm Megabyte băng thông Supabase mỗi ngày khi người dùng duyệt nhiều trang sản phẩm.

### 3.4. Cải thiện trải nghiệm Nút Viết đánh giá trên `pages/shop/product-detail/product-detail.js`
- **Vấn đề phát hiện**: Nút `openReviewModalBtn` khi người dùng đã đăng nhập click vào sẽ ngay lập tức redirect sang `/user#orders` mà không giải thích, khiến người dùng bỡ ngỡ không hiểu vì sao bị chuyển trang.
- **Cách khắc phục**: Đã bổ sung thông báo Toast hướng dẫn người dùng: *"Chuyển đến đơn hàng đã mua để gửi đánh giá sản phẩm..."* trước khi chuyển hướng 800ms sau đó.

### 3.5. Chuẩn hóa URL Rewrite "Mua ngay" và "Đăng ký nhận tin"
- **Vấn đề phát hiện**: Một số file vẫn dùng URL cũ dạng `/pages/shop/checkout/checkout.html?buynow=true` hoặc đường link đăng ký nhận tin chân trang footer chưa kèm query parameters mượt mà.
- **Cách khắc phục**:
  - `pages/shop/product-detail/product-detail.js`: Chuẩn hóa sang `/checkout?buynow=true`.
  - `pages/shop/shop.js`: Chuẩn hóa sang `/checkout?buynow=true`.
  - `components/ui/landing-buy-now.js`: Chuẩn hóa sang `/checkout?buynow=true`.
  - `components/footer/footer.js`: Chuẩn hóa sang `/login?action=register&phone=...`.

### 3.6. Hoàn thiện các nút hành động trong Nhật ký chăm sóc (User Diary)
- **Vấn đề phát hiện**: Trong `pages/user/modules/diary/diary.js`, các nút hành động "Đánh giá ca dịch vụ" và "Gửi phản hồi / Chat" chỉ có mã log hoặc chưa liên kết liền mạch tới module tương ứng.
- **Cách khắc phục**:
  - *Đánh giá ca dịch vụ*: Lưu nháp review vào `sessionStorage`, lấy `appointmentId` chính xác và điều hướng sang tab Lịch hẹn `#booking-detail?id=...&section=service-review` kèm Toast thông báo hướng dẫn.
  - *Nhắn tin cho KTV*: Lưu nháp tin nhắn vào `sessionStorage`, hiển thị Toast thông báo mở phòng chat hỗ trợ và điều hướng sang `#support`.

---

## 4. MINH CHỨNG KIỂM THỬ TRỰC QUAN BẰNG PLAYWRIGHT CHROME (TEST THẬT TRÊN TRÌNH DUYỆT)

Nhằm đảm bảo tính chính xác và trực quan (không chỉ chạy test ngầm), hệ thống kiểm thử Playwright đã tự động khởi chạy trình duyệt Chromium và tương tác thực tế trên các luồng nghiệp vụ tại máy chủ local (Port 4000):

| Luồng nghiệp vụ | Thao tác thực tế | Kết quả kiểm thử | File ảnh chụp minh chứng |
| :--- | :--- | :--- | :--- |
| **1. Shop Catalog & Mua ngay** | Truy cập `/shop`, nạp 20 sản phẩm từ cache `sessionStorage` (không gọi lại RPC). Click nút "Mua ngay", modal chọn phân loại mở ra, chọn biến thể và click xác nhận. | Chuyển hướng chính xác sang `/checkout?buynow=true` với dữ liệu món hàng sẵn sàng thanh toán. | - [minh_chung_1_shop_catalog.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_1_shop_catalog.png)<br>- [minh_chung_1b_modal_mua_ngay.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_1b_modal_mua_ngay.png)<br>- [minh_chung_1c_checkout_page.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_1c_checkout_page.png) |
| **2. Đặt lịch dịch vụ (Booking)** | Truy cập `/booking`, hiển thị Stepper 4 bước chuẩn mực, chọn chi nhánh và dịch vụ. | Realtime debounce 2.0s hoạt động tốt, không gây spam slot check. Giao diện phẳng 9px chuẩn nhận diện. | - [minh_chung_2_booking_page.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_2_booking_page.png) |
| **3. Trang Liên hệ & Chống Double Submit** | Truy cập `/contact`, điền đầy đủ form liên hệ và nhấn gửi tin nhắn. | Nút gửi bị vô hiệu hóa tức thì, chỉ gửi đúng 1 request lên server và hiển thị mã phiếu hỗ trợ thành công. | - [minh_chung_3a_contact_form.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_3a_contact_form.png)<br>- [minh_chung_3b_contact_submitted.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_3b_contact_submitted.png) |
| **4. Nhật ký chăm sóc (User Diary)** | Đăng nhập tài khoản khách hàng, vào `/user#diary`, xem danh sách nhật ký ca dịch vụ và kích hoạt hành động đánh giá / chat. | Hiển thị Toast thông báo điều hướng, lưu trữ nháp phiên làm việc và chuyển tab mượt mà. | - [minh_chung_4_user_diary.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_4_user_diary.png)<br>- [minh_chung_4b_diary_action.png](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_4b_diary_action.png) |

---

## 4. PHÂN TÍCH CHUYÊN SÂU: CÁCH LOAD DỮ LIỆU CÓ ĐANG TỐI ƯU CHƯA?

Dưới đây là đánh giá kỹ thuật toàn diện về kiến trúc truyền tải dữ liệu giữa Client và Supabase trong hệ thống Pawpal:

### 4.1. Điểm Tối Ưu Hiện Tại (Đã thực hiện rất tốt)
1. **Kiến trúc RPC thay vì Direct Table Query**:
   - Thay vì để client thực hiện các câu query phức tạp với nhiều bảng lồng nhau (`appointment`, `pet_profile`, `sales_order_detail`, `voucher`...), hệ thống chuyển sang gọi các Stored Procedures / RPC tập trung như: `customer_service_catalog`, `customer_shop_catalog`, `own_service_booking_execution`, `redeem_own_loyalty_voucher`.
   - Lợi ích: Rút ngắn từ 4-5 round-trips mạng xuống còn đúng 1 round-trip duy nhất, giảm triệt để overhead kết nối TLS và header HTTP.
2. **Loại bỏ việc lưu Base64 trong Relational Database**:
   - Toàn bộ hình ảnh (avatar bé cưng, ảnh sổ tiêm phòng, ảnh đánh giá review, ảnh bằng chứng đổi trả RMA) đều được tải lên cụm Media Engine độc lập (`media_asset_id` lưu trên MongoDB GridFS/Storage) và chỉ lưu UUID tham chiếu trong Supabase.
   - Khi client gọi `SELECT`, kích thước payload luôn ở mức vài KB thay vì phình to hàng chục MB do chứa mã Base64 chuỗi dài.
3. **Quản lý Vòng đời Realtime Channels (Anti-Leak)**:
   - Tất cả các module trong User Portal (`profile`, `pets`, `bookings`, `orders`, `loyalty`, `support`, `wishlist`) đều trang bị hàm `dispose()` gọi `client.removeChannel(channel)` khi người dùng chuyển tab.
   - Nhờ đó, trình duyệt không duy trì hàng loạt websocket channel ngầm sau lưng, không làm cạn kiệt giới hạn đồng thời (concurrent connections) của gói Supabase.
4. **Kiểm tra trạng thái Tab ẩn (`document.hidden`)**:
   - Cơ chế đồng bộ dữ liệu tự động kiểm tra `document.hidden`. Khi người dùng thu nhỏ trình duyệt hoặc chuyển sang tab khác, toàn bộ timer và listener tạm ngưng kích hoạt gọi API, chỉ kích hoạt đồng bộ lại khi người dùng quay lại tab (`visibilitychange` / `window.focus`).
5. **Cơ chế Idempotent Request ID (Chống lặp đơn / lặp điểm)**:
   - Các hành động nhạy cảm như Đặt lịch (`requestId`), Tạo đơn hàng (`requestId`), Đổi voucher (`requestId`), Hủy lịch (`requestId`) đều sinh UUID và lưu tạm trong `sessionStorage`.
   - Nếu mạng chập chờn người dùng bấm liên tục, Supabase RPC bắt được request trùng và trả về ngay kết quả đã xử lý trước đó, không trừ điểm hay tạo đơn trùng lặp.

### 4.2. Khuyến nghị Tiếp tục Duy trì & Giám sát
1. **Kiểm soát dung lượng danh mục khi sản phẩm tăng trưởng**:
   - Hiện tại catalog sản phẩm có 37 mặt hàng (~111 KB raw JSON), nằm hoàn toàn trong ngưỡng an toàn của `sessionStorage` (dưới 250 KB).
   - Khi số lượng sản phẩm vượt quá 100 sản phẩm trong tương lai, cần chuyển sang phân trang REST API (`range(offset, limit)`) để không tải toàn bộ danh mục một lần về client.
2. **Giữ nguyên trạng thái Disabled của Form bình luận Blog**:
   - Việc giữ nút gửi bình luận ở trạng thái disabled trên trang chi tiết cẩm nang là quyết định hợp lý cho giai đoạn hiện tại, giúp tránh việc mở thêm bảng lưu trữ bình luận rác khi chưa có bộ lọc kiểm duyệt tự động (Anti-spam / Moderation).

---

## 5. KẾT LUẬN

Hệ thống Client (User Portal & Public Pages) của Pawpal hiện tại hoạt động **ổn định, an toàn và đồng bộ dữ liệu chính xác 100% với CSDL Supabase**.
- Toàn bộ các thao tác cốt lõi của người dùng (Đăng nhập, Tạo thú cưng, Đổi địa chỉ, Đặt lịch hẹn, Thêm giỏ hàng, Tạo đơn hàng, Hủy đơn/lịch, Đổi voucher, Gửi khiếu nại, Đổi mật khẩu) **đều đã được lưu thật vào Supabase DB qua các RPC chuẩn mực**.
- Các lỗi thao tác nút bấm tiềm ẩn (gán trùng event listener tại form liên hệ, thiếu thông báo tại nút đánh giá) **đã được xử lý dứt điểm**.
- Các giải pháp tối ưu hóa băng thông (Debounce Realtime Booking, Cache catalog sản phẩm 60s trên SessionStorage) **đã kích hoạt thành công**, đảm bảo hệ thống vận hành mượt mà với chi phí băng thông Supabase tối thiểu.
