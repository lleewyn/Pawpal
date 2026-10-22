# KẾ HOẠCH CHECKLIST CHUYỂN ĐỔI USER PORTAL SANG SUPABASE CLOUD MỚI (V1)
> **Mục tiêu trọng tâm:** Chuyển đổi toàn diện phân hệ Cổng Khách hàng (`/user`, `/login`) sang Cloud Supabase mới (`cpzuvaplseielhgcnqrn` - Chuẩn 3NF), đồng thời **bảo vệ 100% hạn mức băng thông (Egress Quota) và tài nguyên của gói Supabase Free**, triệt tiêu nguy cơ quá tải hay gián đoạn dịch vụ.

---

## Đối soát lại ngày 22/10/2026 — đang thực hiện

Các dấu hoàn thành ở phần lịch sử bên dưới chưa đủ để nghiệm thu toàn bộ cổng khách hàng. Đợt kiểm tra hiện tại phát hiện Cloud thiếu RPC hồ sơ và hàm đăng ký còn ghi `balance_after` đã bỏ ở V1.

- [x] Kiểm tra xác thực, giao diện xác thực và hồi quy hồ sơ: 40 ca đạt, gồm token giả, tài khoản khóa, nhân sự, OTP dùng một lần và API hồ sơ dùng giao dịch.
- [x] Viết migration `058_customer_portal_profile.sql`: lưu email/tên/địa chỉ trong một giao dịch, đối chiếu phiên bản, xác nhận chủ sở hữu; bỏ thưởng 50 điểm cố định khi đăng ký.
- [x] Kiểm tra trên CSDL khôi phục riêng: đăng ký không tự cộng điểm, lưu/đọc lại, giữ địa chỉ, phiên bản cũ bị từ chối, địa chỉ người khác bị từ chối và toàn bộ ghi dở được hoàn tác. Dữ liệu kiểm thử được rollback.
- [x] Áp dụng migration 058 lên Cloud mới sau sao lưu; đối chiếu toàn bộ hàng public và danh tính/mật khẩu/trạng thái khóa Auth không thay đổi khi triển khai. Không thêm bảng/cột; giữ 17 nhân sự nguồn.
- [x] Trình duyệt Vercel: tài khoản mới tạo bằng Auth và RPC V1 đăng nhập bằng số điện thoại, sửa tên qua RPC và tải lại vẫn đúng. Không phát sinh điểm chào mừng. Đã dọn tài khoản/hồ sơ thử riêng.
- [ ] Kiểm tra toàn bộ giao diện đăng ký/OTP, đổi mật khẩu và thêm/sửa/xóa địa chỉ; kiểm tra đồng thời hai phiên trình duyệt.
- [x] Đăng ký qua giao diện Vercel, OTP giả lập, tạo Auth/hồ sơ và tải lại trang; không tự cộng điểm. Dọn dữ liệu thử sau kiểm tra.
- [x] Đổi mật khẩu qua giao diện Vercel: Auth từ chối mật khẩu cũ, chấp nhận mật khẩu mới; chỉ thay tài khoản thử riêng đã dọn sau kiểm tra.
- [x] Sổ địa chỉ: thêm hai địa chỉ, chọn đúng một mặc định, xóa địa chỉ phụ và đọc lại từ Cloud sau reload.
- [x] Hai phiên: phiên thứ hai lưu trước thì phiên thứ nhất nhận 409, giữ bản nháp, không ghi đè dữ liệu mới. Đã sửa Realtime làm mất nội dung đang nhập.
- [x] Modal hồ sơ: đóng bằng Escape; form không tự submit/reload; kiểm tra ảnh modal địa chỉ. Mã giao diện mới được phục vụ trực tiếp từ working tree trong kiểm thử trình duyệt, dữ liệu vẫn từ Cloud thật.
- [ ] Đối soát thú cưng và nhật ký chăm sóc.
  - Nhật ký: bỏ nạp JSON seed, bộ nhớ nhật ký cũ, dữ liệu Admin trong trình duyệt, tên nhân viên mẫu, ảnh hoạt động mẫu và phản hồi chat tự sinh. Dữ liệu Cloud rỗng là nhật ký rỗng; lỗi truy vấn không được thay bằng dữ liệu giả.
  - Lọc lịch hẹn theo cả chủ nuôi và thú cưng. Khi ca chỉ định không có nhật ký, không tự mở ca khác.
  - Đánh giá/trao đổi cũ chỉ lưu trình duyệt đã bỏ: nút chuyển sang Lịch hẹn/Hỗ trợ. Chưa nghiệm thu luồng đánh giá và tin nhắn thật trong các phân hệ đó.
  - `node --test scripts/test/customer_diary_live_contract.cjs`: 3 ca đạt. Trình duyệt với Cloud thật đã xác nhận thú cưng chưa có care_log hiển thị timeline rỗng, ảnh đã xem tại `D:/Aboutme/Pawpal-infra/supabase-local/verification/portal-diary-empty.private.png`; đã dọn fixture.
  - Còn kiểm tra nhật ký có dữ liệu thực, quyền chéo hai khách, Realtime sau Admin ghi nhật ký và các đường dẫn đánh giá/Hỗ trợ. Mã nhật ký mới chưa push/deploy.
  - Đã sửa đọc danh sách chỉ dùng Cloud, không ghép `pawpal_pets` cũ hoặc tự ghi dữ liệu giả sang cache Admin.
  - Đã sửa lưu trữ/khôi phục: chờ CSDL trả đúng hàng, kiểm tra chủ nuôi, lỗi phải báo lỗi; không báo thành công khi ghi bị từ chối.
  - Trạng thái `inactive` từ Admin được nhận diện đúng là lưu trữ. Không thể dùng ID khách khác để tải danh sách.
  - `node --test scripts/test/customer_pet_live_contract.cjs`: 6 ca đạt về đọc rỗng/lỗi, cache cũ, quyền chủ nuôi và xác nhận ghi.
  - Trình duyệt gọi mã `petService.js` trong working tree với Cloud thật: cố ý đặt hồ sơ cũ trong cache, Cloud rỗng vẫn trả danh sách rỗng. Kiểm tra hồ sơ/địa chỉ trước đó tiếp tục đạt; fixture đã dọn.
  - Đã viết migration `059_customer_portal_pet.sql`: RPC `save_own_pet` lưu hồ sơ/cân nặng cùng giao dịch, kiểm tra chủ nuôi từ Auth, phiên bản hồ sơ, dữ liệu tên/giống/giới tính/ngày sinh/cân nặng; cân không đổi không ghi lặp. Không sửa chủ sở hữu hay mã hồ sơ theo dữ liệu client.
  - Form giữ bản chụp lúc mở để kiểm tra xung đột; chọn giống phải khớp chính xác loài, không tự chọn giống đầu tiên khi không tìm thấy.
  - `node scripts/test/customer_pet_atomic_v1.cjs` đạt trên CSDL riêng: tạo/sửa, không lặp cân, thêm cân mới, từ chối phiên bản cũ/dữ liệu sai/phiên không sở hữu; rollback toàn bộ fixture. Kiểm tra hợp đồng frontend hiện 8 ca đạt.
  - Chưa nghiệm thu toàn bộ giao diện thêm/sửa thú cưng và quyền ghi trực tiếp; chưa đánh dấu hoàn tất phân hệ.
  - Đã áp dụng 059 lên Cloud sau sao lưu `D:/Aboutme/Pawpal-infra/supabase-local/backups/portal-pet-cloud-2026-10-22T14-57-32-990Z`; triển khai không đổi các hàng public hoặc danh tính/mật khẩu/trạng thái khóa Auth, giữ 17 nhân sự nguồn.
  - Trình duyệt dùng mã `petService.js` local với Cloud thật: tạo thú cưng, sửa ghi chú giữ một bản cân nặng, đổi cân tăng đúng một bản lịch sử. Đây là kiểm tra dịch vụ gọi từ trình duyệt, chưa thay thế nghiệm thu thao tác toàn bộ form thêm/sửa.
  - Đợt tiếp theo đã kiểm tra form thực: chọn loài, chọn giống qua autocomplete từ Cloud, nhập cân, lưu bé mới; mở lại theo mã hồ sơ, sửa ghi chú và đối chiếu `pet_profile.routine`, lịch sử cân vẫn đúng một hàng. Mã local được phục vụ trong trình duyệt, chưa push/deploy.
  - Ảnh đã xem: `D:/Aboutme/Pawpal-infra/supabase-local/verification/portal-pet-form.private.png`. Lệnh: `node scripts/test/customer_portal_profile_v1.cjs --cloud-browser --pets --pets-only`. Đã dọn thú cưng, cân nặng, hồ sơ khách và tài khoản Auth thử riêng.
  - Gợi ý giống lọc theo loài và tên danh mục, không tự đặt giống mặc định; khi đổi loài phải chọn lại giống. “Loài khác” được đối chiếu theo tên loài đã nhập, không tự ép thành “Khác”.
- [ ] Đối soát mua hàng, chi tiết đơn, hủy/nhận hàng và đổi trả theo quy tắc Admin.
- [ ] Đối soát đặt dịch vụ, xem lịch, đổi/hủy lịch theo quy tắc Admin.
- [ ] Đối soát Pawpoint, voucher và khiếu nại theo quyền từng khách.
- [ ] Kiểm tra đồng bộ với Admin, Realtime, tải lại trang và băng thông toàn bộ các luồng.

Không triển khai ảnh/tệp/camera, gửi Zalo/SMS/email thật hay thanh toán thật trong đợt này. Trợ lý chỉ tra cứu, không tự tạo đơn/đặt lịch hoặc cộng điểm.

### Bằng chứng đợt hồ sơ

- Migration: `scripts/database/v1/058_customer_portal_profile.sql`; triển khai bằng `node scripts/database/v1/apply_chat_cloud.cjs apply-portal-profile`.
- Kiểm tra: `node --test scripts/test/customer_auth.test.js scripts/test/customer_auth_ui.test.js scripts/test/test_customer_profile_save.cjs` và `node scripts/test/customer_portal_profile_v1.cjs --cloud-browser`.
- Bản sao lưu riêng ngoài Git: `D:/Aboutme/Pawpal-infra/supabase-local/backups/portal-profile-cloud-2026-10-22T13-45-25-015Z`.
- Ảnh modal đã kiểm tra: `D:/Aboutme/Pawpal-infra/supabase-local/verification/portal-profile-modal.private.png`.
- Kiểm tra bổ sung: `scripts/test/customer_registration_cloud_v1.cjs`; ảnh sổ địa chỉ `D:/Aboutme/Pawpal-infra/supabase-local/verification/portal-address-modal.private.png`.
- CSDL Cloud đã áp dụng. Thay đổi API `customer_auth.js` hiện nằm trong working tree; chưa push/redeploy mã máy chủ trong đợt này. Giao diện Vercel hiện có gọi trực tiếp RPC mới nên luồng sửa tên đã kiểm tra được trên production.
- Các sửa đổi form hồ sơ (giữ bản nháp khi Realtime, Escape và chặn submit) cũng chưa push/redeploy; không coi kiểm thử mã local là bằng chứng bản Vercel đã có các sửa đổi này.
- Địa chỉ vẫn theo thiết kế V1 dạng văn bản; phường/quận được ghép trong `street_address`, không bổ sung cột hay tự tách lại dữ liệu nguồn.

## Tổng kết lịch sử trước đợt đối soát

Các hạng mục dưới đây từng được ghi nhận đã chuyển đổi; cần xác nhận lại bằng kiểm thử quyền và thao tác thực tế trong đợt hiện tại:
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
