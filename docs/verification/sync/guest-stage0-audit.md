# GĐ-00: khảo sát khách vãng lai

Ngày 26/10/2026. **Hoàn tất gate khảo sát**, không phải nghiệm thu guest booking/checkout. Đợt này chỉ đọc code, metadata PostgreSQL và các tài nguyên công khai; không tạo giao dịch, gửi OTP/SMS, chạy migration hoặc sửa dữ liệu khách.

## Phiên bản và môi trường

- Branch `feat/guest-admin-identity`, HEAD và `origin/main`: `515487316452d2df1394984e74d45926c4f0cca9`.
- GitHub Deployment Production của SHA này có trạng thái `success`. Ba file booking, checkout và API đang phục vụ tại `pawpalgr3.vercel.app` có SHA-256 khớp chính xác nội dung commit. [Metadata và dấu vân tay](guest-stage0-baseline.txt).
- Working tree có thay đổi chưa commit, gồm bản vá guest và các thay đổi About/Blog riêng. HEAD không đại diện toàn bộ mã local; báo cáo baseline lưu riêng hash 13 file liên quan. Không đưa About/Blog vào phạm vi này.
- Không có staging riêng. Người dùng đã chọn Cloud dùng chung; khảo sát dùng transaction `REPEATABLE READ READ ONLY`, timeout truy vấn 12 giây, kết thúc `ROLLBACK`. Không gọi Cloud là staging.
- Trước đây migration 111 đã áp dụng theo xác nhận; kết quả đó là mốc hiện trạng, không phải migration mới trong GĐ-00 này.

## Bản chụp schema và dữ liệu kiểm thử

[Bằng chứng catalog](guest-stage0-catalog.txt) ghi nhận 12 bảng, 104 ràng buộc, 49 index, 57 policy và 26 trigger trong phạm vi. RPC lưu cả định nghĩa, quyền gọi, `SECURITY DEFINER` và cấu hình hàm.

Bản chụp toàn bộ catalog `public` và `pawpal_private` (1.654.427 byte) lưu ngoài webroot tại `D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-stage0-2026-10-26/schema-catalog.private.json`; SHA-256 `be0474e3accca035c9e7fa188088728d16a36704972d0208ce290046901c9f14`. Có cấu trúc cột/default, constraints/indexes, policies/ACL, triggers, function/view definitions, types và sequences; không xuất dòng dữ liệu khách hoặc mật khẩu.

**Giới hạn:** đây là bản chụp catalog phục vụ đối chiếu, không phải archive `pg_dump` có thể tự động restore. Máy thiếu PostgreSQL client; không cài Docker hoặc tải bộ cài lớn trong đợt khảo sát. Chưa kiểm thử phục hồi database. Trước đợt thay đổi cấu trúc tiếp theo phải có bản sao SQL/backup có quy trình phục hồi phù hợp; không dùng snapshot này để cam kết khôi phục đầy đủ.

Fixture đã chuẩn bị trong `guest_activation_fixture.cjs`, `admin_customer_identity_cloud.cjs` và các test access. Probe liên kết trước đó đã dọn; không chạy lại để tránh tạo thêm dữ liệu Cloud. Bộ tình huống cho giai đoạn sau:

| Tình huống | Cách chuẩn bị và kiểm tra |
| --- | --- |
| Khách mới | Số test ngẫu nhiên được kiểm tra chưa tồn tại; tạo khách/bé/giao dịch riêng, không dùng số khách thật |
| Khách quay lại cùng phiên | Kiểm tra quyền phiên do server xác minh; hiện chưa có cơ chế giao dịch guest này |
| Trùng số nhưng khác phiên/chủ | Không trả tên bé/lịch sử; không tự chọn hồ sơ đầu tiên |
| Thành viên và khách khóa | Fixture độc lập hạng tích điểm; giữ phân loại guest/member nhưng chặn quyền giao dịch phù hợp |
| Retry và liên kết tài khoản | Giữ Customer/Pet/Appointment ID; gửi lại cùng request không nhân đôi |
| Hai tài khoản | Kiểm tra A không đọc/ghi dữ liệu B; không dùng service role để giả vờ quyền customer |

## Lần theo luồng thực tế

`scripts/api/api.js` là module chạy trong browser, gọi Supabase trực tiếp; tên thư mục `api` không biến nó thành backend. `scripts/api/customer_auth.js` là handler backend có service client. Không tìm thấy Edge Function tham gia các luồng giao dịch dưới đây.

| Luồng và file | Chuỗi xử lý hiện tại | Kết luận khảo sát |
| --- | --- | --- |
| `pages/public/login/login.js` | UI → `/api/customer/auth/lookup`, `login`, `otp/request`, `otp/complete` → backend Auth → `complete_customer_auth` | OTP thuộc đăng ký/kích hoạt/khôi phục; không thêm OTP vào booking/checkout. Không coi OTP giả lập là SMS thật |
| `pages/public/return-guest/return-guest.js` | UI → `loadSupabaseGuestResults` → `/api/customer/auth/guest-records` → truy vấn lịch/đơn bằng service client | Mã production nền đọc lịch sử theo phone trước xác minh owner. Local đã yêu cầu Bearer/owner và bỏ fallback đọc DB; bản vá chưa deploy. UI còn OTP browser `555666`, chưa phải token tra cứu do server xác minh |
| `pages/services/booking/booking.js` | `auth.getUser` → `customer_service_catalog`, `own_booking_pets`, `customer_profile_snapshot` → `own_booking_day_slots`/`quote_own_service_booking` → `create_own_service_booking` → appointment/items → trang nhận lịch và Admin | Người chưa đăng nhập bị dừng ở bước 1. Chọn bé có sẵn của owner; chưa có luồng guest nhập/lưu bé. Request UUID lưu theo Auth ID trong sessionStorage; đối chiếu quote, retry và receipt đọc lại từ DB |
| `pages/shop/cart/cart.js` và `scripts/shared/cart-access.mjs` | `ensureCartAccess` → `API.getUserCart`/`saveUserCart` → `own_customer_cart`; selection/backup lưu kèm owner → checkout | Guest bị yêu cầu đăng nhập. Browser storage phục vụ cache/selection, không chứng minh quyền DB. Chưa có guest cart được server tiếp nhận an toàn |
| `pages/shop/checkout/checkout.js` | Chặn thiếu user hoặc `is_temporary` → profile/address/options → báo giá → `API.submitOrder` → `create_own_sales_order` → sales_order/details/payment | Chưa hỗ trợ checkout guest. Receiver/address là snapshot đơn hàng, tách khỏi hồ sơ. Request journal theo Customer ID; chỉ dọn giỏ sau server xác nhận |
| `scripts/api/customer_auth.js` (`guest`) | Chuẩn hóa phone → rate limit → `ensure_guest_customer` bằng service role → trả Customer ID, không phát Auth session | Tạo/tìm hồ sơ nghiệp vụ không đồng nghĩa cấp quyền chọn bé hay tạo đơn; endpoint chưa được nối thành luồng guest booking/checkout hoàn chỉnh |
| Thành viên: `pages/user/modules/{profile,pets,bookings,orders}` | Hồ sơ/bé truy vấn Supabase qua RLS; bookings/orders qua module API và owner RPC; cập nhật qua Realtime/refresh | Phải giữ luồng owner hiện tại. Profile còn nhánh tra phone nếu lookup ID thất bại; RLS vẫn áp dụng, không được tái sử dụng nhánh này làm bằng chứng guest ownership |
| Admin khách/đơn/lịch | `admin_customer_page` (111) và các truy vấn có quyền → nhãn/bộ lọc guest/member → chi tiết giao dịch | Nhận diện đã kiểm tra riêng. Admin nhận diện guest không mở quyền giao dịch cho guest |

`scripts/shared/customer-identity.mjs` kiểm tra `auth.getUser()` và đối chiếu `auth_user_id` khi có Auth client. Nhánh legacy khi không có Auth có thử ID/phone rồi trả requested ID; không được dùng nó để cấp quyền guest trong triển khai mới. Backend/RPC/RLS phải là nơi quyết định quyền.

## Schema và quyền Cloud đã đối chiếu

- Cả 12 bảng `customer`, `customer_phone`, `customer_profile`, `guest_session`, `pet_profile`, `appointment`, `appointment_item`, `cart`, `cart_item`, `sales_order`, `sales_order_detail`, `payment` tồn tại, có khóa chính và bật RLS. Không có policy dành cho `anon` trên 12 bảng này.
- Policy đọc owner của hồ sơ, phone, bé, lịch, đơn và payment gọi `pawpal_private.owns_customer`; hàm yêu cầu `customer.auth_user_id = auth.uid()` và trạng thái `active`. Dòng chi tiết đi qua quan hệ cha. Policy Admin dùng quyền cụ thể `has_permission(...read/write)`, không phải điều kiện luôn đúng.
- `cart_item` trong snapshot chỉ có policy quyền nhân viên; cart của customer đi qua RPC `own_customer_cart`, tự xác định owner. Không mở SELECT/INSERT anon để làm guest cart.
- `customer.auth_user_id` có FK tới `auth.users` và unique. Trigger `check_portal_identity` kiểm tra liên kết cổng tài khoản. `customer_profile` có PK/FK Customer ID.
- `customer_phone` unique theo `(customer_id, phone_number)`, unique số chính giữa các hồ sơ (`WHERE is_primary`) và một số chính/khách. **Không unique toàn cục cho mọi số phụ**. Trigger deferred kiểm tra đúng một số chính khi hồ sơ có phone.
- `pet_profile.customer_id` FK tới customer. Appointment có FK customer/pet; trigger `validate_appointment_owner` kiểm tra bé thuộc đúng khách bằng `FOR SHARE` khi tạo/đổi owner. Tên bé không phải khóa duy nhất.
- `appointment_item.appointment_id`, `sales_order_detail.order_id`, cart items và payment đều có FK. Mã lịch/đơn/payment unique; payment còn unique `idempotency_key`, cart item unique `(cart_id, product_variant_id)`.
- `guest_session` có UUID, `token_hash` unique, `expires_at`, `revoked_at`; FK sử dụng hiện thuộc chat/support. Không có cột guest token/session trên cart, pet, appointment hoặc sales_order trong snapshot. Bảng này tồn tại chưa đủ để xác thực guest giao dịch.
- `ensure_guest_customer` và `complete_customer_auth` không cấp EXECUTE cho `anon` hoặc `authenticated`; backend service role gọi. Cả hai hiện tìm phone bằng `LIMIT 1`; `ensure_guest_customer` trả ngay ID nếu trùng. Đây chưa đáp ứng quy tắc không tự chọn hồ sơ khi phone mơ hồ.
- Các RPC `own_booking_pets`, `customer_profile_snapshot`, quote/create booking, `own_customer_cart`, quote/create order chỉ cấp cho `authenticated`, không cho `anon`. Các hàm tạo thực tế kiểm tra owner lấy từ Auth; tạo đơn/booking kiểm tra quote và retry. Không được chỉ bỏ login guard UI rồi coi guest đã hoạt động.

Đây là xác minh định nghĩa/ACL/policy thực tế; không thay thế test chạy mọi nhánh bằng từng role. Kiểm tra deny/identity và liên kết đã có bằng chứng riêng; chưa chạy E2E đặt lịch/mua hàng guest.

## Danh sách cần xử lý sau GĐ-00

| Mã | Mức | Hiện trạng và việc tiếp theo |
| --- | --- | --- |
| GUEST-LOOKUP-01 | P0 | Bản nền production chưa xác minh owner khi lấy lịch sử theo phone; local đã có bản vá deny và test. Cần phát hành bản vá, sau đó xây proof tra cứu riêng cho guest; OTP browser không cấp quyền |
| GUEST-IDENTITY-02 | P0 | Hai RPC tìm phone `LIMIT 1`, số phụ không unique toàn cục. Chốt xử lý mơ hồ và bằng chứng sở hữu trước khi tái sử dụng hồ sơ; không auto merge/chọn hồ sơ đầu tiên |
| GUEST-BOOKING-03 | P0 | UI và RPC hiện yêu cầu Auth. Cần luồng server guest tạo khách/bé/lịch trong giao dịch, kiểm tra owner bé, retry và mã xác nhận; không tiết lộ bé cũ chỉ qua phone |
| GUEST-CHECKOUT-04 | P0 | Cart/checkout hiện chặn guest. Cần chiến lược giỏ guest và submit server có giá/kho/payment/idempotency; giữ owner isolation và luồng thành viên |
| GUEST-SESSION-05 | P0 | Chưa có liên kết phiên guest giao dịch được chứng minh. Chốt token lưu server dạng hash, hết hạn/thu hồi, tái sử dụng cùng phiên và quy tắc sau liên kết tài khoản |
| GUEST-LEGACY-06 | P1 | Nhánh lookup phone và OTP/localStorage trong trang quay lại cần thay thế/loại bỏ theo luồng mới; không đánh thành công khi chỉ cập nhật browser |
| GUEST-VERIFY-07 | P1 | Chưa nghiệm thu OTP/SMS thật, customer xem lại bé/lịch sau kích hoạt, hoặc E2E guest/2 portal. Upload và gateway thật ngoài phạm vi đã thống nhất |

## Kết quả gate

Đã có bản đồ file/luồng, phiên bản nền và deployment đối chiếu, catalog/RPC/RLS thực tế, fixture dự kiến và danh sách lỗi/thiếu chức năng có mức ưu tiên. **Gate khảo sát GĐ-00 đạt** với giới hạn backup nêu rõ; chuyển sang GĐ-01 chốt phiên guest và phone trùng. Chưa đánh hoàn tất các mục triển khai ở GĐ-01 trở đi.

Tái chạy có chủ đích: `node scripts/test/guest_stage0_baseline.cjs` và `node scripts/test/guest_stage0_audit.cjs --cloud-readonly`. Không polling, không đọc Supabase Logs hoặc xuất dữ liệu khách. Bản catalog công khai chỉ chứa metadata phạm vi; bản đầy đủ nằm ngoài repo.
