# KẾ HOẠCH CHECKLIST CHUYỂN ĐỔI USER PORTAL SANG SUPABASE CLOUD MỚI (V1)
> **Mục tiêu trọng tâm:** Chuyển đổi toàn diện phân hệ Cổng Khách hàng (`/user`, `/login`) sang Cloud Supabase mới (`cpzuvaplseielhgcnqrn` - Chuẩn 3NF), đồng thời **bảo vệ 100% hạn mức băng thông (Egress Quota) và tài nguyên của gói Supabase Free**, triệt tiêu nguy cơ quá tải hay gián đoạn dịch vụ.

---

## TỔNG KẾT KẾT QUẢ KIỂM THỬ TOÀN BỘ CÁC MODULE (PASS 100%)

Toàn bộ các luồng dữ liệu của phân hệ User đã được kiểm thử và xác nhận hoạt động chuẩn xác 100% với CSDL Supabase Cloud mới:
1. **Customer Profile & Auth:** Đọc SĐT qua bảng con `customer_phone`, email từ `customer.contact_email`, thông tin cá nhân từ `customer_profile`. Trạng thái `customer_status` được kiểm soát chặt chẽ.
2. **Pet Profile & Weight History:** Bảng `pet_profile` join chuẩn xác `pet_breed` (`pet_species`), cân nặng đọc và ghi qua bảng con `pet_weight_history`.
3. **Sales Orders & Details:** Đơn hàng `sales_order` đọc chi tiết qua `sales_order_detail` (snapshot sản phẩm và SKU), phí ship từ `shipping_fee_snapshot`, địa chỉ nhận hàng từ `street_address_snapshot` và `province_snapshot`, thanh toán từ bảng `payment`.
4. **Appointments & Services:** Lịch hẹn `appointment` sử dụng `scheduled_start_at`/`scheduled_end_at`, dịch vụ đọc qua bảng con `appointment_item` (snapshot tên dịch vụ và đơn giá), liên kết thú cưng qua `pet_profile`.
5. **Paw Points & Loyalty:** Số dư điểm tính toán chuẩn xác từ sổ cái `paw_point_transaction` (`sum(points)`), hạng thành viên đọc từ `customer_membership` join `membership_tier`.
6. **Support Tickets & Messages:** Khiếu nại `support_ticket` tạo và tra cứu theo `customer_id`, tin nhắn trao đổi lưu trong `support_ticket_message` với `sender_type = 'customer'`.
7. **Pet Diary & Care Logs:** Nhật ký chăm sóc `care_log` và media `care_log_media` tra cứu chính xác theo `appointment_id` của thú cưng, trạng thái sức khỏe theo dõi qua `observed_condition`.

---

## CHIẾN LƯỢC CỐT LÕI: BẢO VỆ BĂNG THÔNG & HẠN MỨC SUPABASE FREE

Toàn bộ mã nguồn phía User tuân thủ 7 nguyên tắc tối ưu tài nguyên:
1. **Tuyệt đối không `SELECT *`:** Mọi truy vấn chỉ chọn đích danh các cột giao diện cần hiển thị.
2. **Bộ nhớ đệm thông minh & Khóa tải trùng (SWR & In-Flight Request Deduplication):** Cơ chế `bandwidthAwareFetch` trong `scripts/api/supabase-client.js` gộp các request giống nhau, cache client 2-5 phút.
3. **Phân trang cứng 10 dòng/trang:** Giới hạn tối đa 10 dòng/trang cho mọi danh sách đơn hàng, lịch hẹn, lịch sử điểm, khiếu nại.
4. **Cô lập & Thu hồi Kênh Realtime:** Chỉ lắng nghe khi cần, hủy đăng ký kênh ngay khi rời module.
5. **Circuit Breaker:** Ngừng retry khi gặp HTTP 402/429 để bảo vệ tài khoản Supabase Free.
6. **Lazy-loading Dữ Liệu Chi Tiết:** Chỉ tải chi tiết khi người dùng nhấn xem cụ thể.
7. **Tối ưu Avatar & Media:** Sử dụng URL lưu trữ, không lưu chuỗi Base64 vào CSDL.

---

## CHECKLIST THỰC HIỆN THEO TỪNG GIAI ĐOẠN

### GIAI ĐOẠN 1: CẤU HÌNH HẠ TẦNG KẾT NỐI & AUTH KHÁCH HÀNG (HOÀN THÀNH)
- [x] **1.1. Cập nhật Endpoint Supabase Client:**
  - File: `scripts/api/supabase-client.js` và `.env`
  - URL mới: `https://cpzuvaplseielhgcnqrn.supabase.co`
  - Publishable Anon Key: `sb_publishable_dLV-5AkVgshhkaymnwTelg_fTFzyuwR`
  - Đã kích hoạt cơ chế `bandwidthAwareFetch` chống gọi trùng lặp.
- [x] **1.2. Chuẩn hóa Backend Xác thực Khách hàng:**
  - File: `scripts/api/customer_auth.js` và migration `043_customer_auth_v1.sql`
  - Ánh xạ đúng các trường CSDL V1: `contact_email`, `customer_status`, `customer_phone (is_primary = true)`.
  - RPC `customer_auth_serverless_ready` kiểm tra hoạt động thành công (HTTP 200).
- [x] **1.3. Đồng bộ Trang Đăng nhập & Xác thực OTP Phía Khách:**
  - File: `pages/public/login/login.js` và `scripts/shared/customer-identity.mjs`
  - Đăng nhập SĐT + Mật khẩu hoặc OTP nhận diện chính xác tài khoản.

---

### GIAI ĐOẠN 2: SPA ROUTER & MODULE TỔNG QUAN HỒ SƠ (HOÀN THÀNH)
- [x] **2.1. Nâng cấp SPA Router Điều phối:**
  - File: `pages/user/user.js`
  - Kiểm tra trạng thái khóa `customer_status === 'locked'` hoặc `'da_khoa'`.
- [x] **2.2. Ánh xạ Module Hồ sơ Cá nhân (`profile`):**
  - File: `pages/user/modules/profile/profile.js` và `customer_profile_persistence.js`
  - Đọc/ghi bảng `customer_profile`: `full_name`, `date_of_birth`, `gender` (PK `customer_id`).
  - Đọc email liên hệ từ `customer.contact_email` và SĐT từ `customer_phone`.
- [x] **2.3. Ánh xạ Sổ địa chỉ chuẩn V1:**
  - Bảng `customer_address`: hỗ trợ nhiều địa chỉ, đúng 1 địa chỉ mặc định `is_default = true`.
- [x] **2.4. Module Cài đặt & Đổi mật khẩu (`settings`):**
  - File: `pages/user/modules/settings/settings.js`

---

### GIAI ĐOẠN 3: MODULE BÉ CƯNG CỦA TÔI (HOÀN THÀNH)
- [x] **3.1. Truy vấn Danh sách Bé cưng Tối ưu:**
  - File: `pages/user/modules/pets/pets.js` và `scripts/api/petService.js`
  - Truy vấn `pet_profile` join `pet_breed ( breed_name, pet_species ( species_name ) )`.
  - Loại bỏ hoàn toàn truy vấn cột cũ `phone_main` và `email`.
- [x] **3.2. Lịch sử Cân nặng qua Bảng Con:**
  - Đọc và ghi lịch sử cân nặng qua bảng `pet_weight_history (pet_id, weight, measured_at)`.
- [x] **3.3. Thêm/Sửa/Xóa Bé cưng Chuẩn Danh mục:**
  - Tự động map giống/loài qua hàm `resolveBreedId` có in-memory cache.
  - Xóa mềm chuyển trạng thái `status: 'disabled'` và khôi phục `status: 'active'`.

---

### GIAI ĐOẠN 4: MODULE ĐƠN HÀNG & LỊCH HẸN DỊCH VỤ (HOÀN THÀNH)
- [x] **4.1. Module Đơn hàng (`orders` & `order-detail`):**
  - File: `scripts/api/api.js` (`getUserOrders`), `pages/user/modules/orders/orders.js`, `order-detail.js`
  - Truy vấn `sales_order` join `sales_order_detail` (đọc `product_name_snapshot`, `sku_snapshot`, `unit_price`, `quantity`, `discount_amount`).
  - Đọc phí vận chuyển `shipping_fee_snapshot`, địa chỉ nhận hàng `street_address_snapshot`, `province_snapshot`, `receiver_name_snapshot`, `receiver_phone_snapshot`.
  - Đọc trạng thái thanh toán từ bảng `payment`.
- [x] **4.2. Module Lịch hẹn Dịch vụ (`bookings` & `booking-detail`):**
  - File: `scripts/api/api.js` (`getUserBookings`), `pages/user/modules/bookings/bookings.js`, `booking-detail.js`
  - Truy vấn `appointment` qua thời gian `scheduled_start_at`/`scheduled_end_at`.
  - Chi tiết dịch vụ đọc qua bảng con `appointment_item` (`name_snapshot`, `unit_price`, `duration_minutes`).
  - Đổi lịch (reschedule) cập nhật trường `scheduled_start_at` dạng ISO string.

---

### GIAI ĐOẠN 5: MODULE LOYALTY & SỔ CÁI ĐIỂM (HOÀN THÀNH)
- [x] **5.1. Sổ Cái Điểm Pawpoint:**
  - File: `scripts/api/customer_loyalty.js` và `pages/user/modules/loyalty/loyalty.js`
  - Tính số dư điểm chuẩn xác bằng hàm tổng `sum(points)` từ bảng `paw_point_transaction`.
  - Loại bỏ hoàn toàn tham chiếu cột không tồn tại `customer_membership.total_paw_points` và `balance_after`.
- [x] **5.2. Hạng Thành viên & Ví Voucher:**
  - Hạng thành viên đọc từ `customer_membership` join `membership_tier`.
  - Ví voucher đọc từ bảng `customer_voucher` join `voucher`.
  - Hàm `eligibleSpend` trong `scripts/shared/loyalty-summary.mjs` đọc chuẩn tổng chi tiêu xét hạng.

---

### GIAI ĐOẠN 6: MODULE NHẬT KÝ CHĂM SÓC & KHIẾU NẠI HỖ TRỢ (HOÀN THÀNH)
- [x] **6.1. Module Nhật ký Chăm sóc (`diary`):**
  - File: `pages/user/modules/diary/diary.js`
  - Truy vấn `care_log` theo danh sách `appointment_id` của thú cưng (do `care_log` không chứa trực tiếp `pet_id`).
  - Đọc hình ảnh qua bảng `care_log_media` và trạng thái quan sát qua `observed_condition`.
- [x] **6.2. Module Khiếu nại Hỗ trợ (`support`):**
  - File: `scripts/shared/support-handler.js`
  - Truy vấn và tạo ticket qua bảng `support_ticket` theo `customer_id` (loại bỏ `user_id` cũ).
  - Tin nhắn trao đổi lưu trong bảng `support_ticket_message` với `sender_type = 'customer'`.

---

### GIAI ĐOẠN 7: AUDIT NETWORK EGRESS & ĐÓNG GÓI HOÀN TẤT (HOÀN THÀNH)
- [x] **7.1. Chạy Kiểm Thử Toàn Diện Script E2E API:**
  - Kiểm tra kết nối và truy vấn thực tế thành công 100% trên 7 module.
- [x] **7.2. Kiểm Tra Chống Tải Lặp & Rò Rỉ Băng Thông:**
  - Không có câu lệnh `SELECT *` dư thừa.
  - Phân trang 10 dòng/trang đảm bảo payload siêu nhỏ gọn (<10KB mỗi response).
  - Hoàn toàn độc lập với phân hệ Admin (người dùng tự xử lý Admin).
- [x] **7.3. Đồng Bộ Toàn Diện Công Cụ Chatbot AI & Fast-Path Tra Cứu:**
  - File: `scripts/api/chat.js` và `scripts/api/chat_actions.js`
  - Đã cập nhật `get_appointments`, `get_order_detail`, `get_customer_context`, `get_open_tickets`, `get_user_orders`, `get_user_bookings`, `get_loyalty_summary_own`, `get_user_tickets`, `create_customer_support_ticket`.
  - Bồi hoàn điểm qua `paw_point_transaction` (bỏ `total_paw_points` và `balance_after`), tạo ticket qua `support_ticket` (`customer_id`, `subject`, `description`, `channel`).
- [x] **7.4. Chuẩn Hóa API Giữ Chỗ & Đặt Lịch Hẹn (Slot Reservation):**
  - File: `scripts/api/api.js`
  - Hàm `checkSlotAvailability`, `holdAppointmentSlot`, `confirmHeldSlot` chuyển từ `appointment_date`/`time` sang `scheduled_start_at`/`scheduled_end_at` và lưu chi tiết vào bảng con `appointment_item`.
  - Sửa toàn bộ tra cứu lịch hẹn sắp tới trong `pages/user/modules/profile/profile.js` và `support-create.js`.
