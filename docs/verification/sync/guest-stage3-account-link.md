# GĐ-03: liên kết Auth và chuẩn hóa phone

Ngày 27/10/2026, Asia/Bangkok. **Đã áp dụng migration 116 lên Cloud**, triển khai nhánh backend liên kết có chủ đích. Backend/UI chưa push/deploy; chưa nghiệm thu SMS thật, đăng ký trên Production hoặc toàn bộ GĐ-03.

## Điều kiện liên kết

Đăng ký/kích hoạt có thể gửi `linkGuest: true` vào các endpoint OTP hiện có. Đây là lựa chọn rõ ràng, không tự lấy hồ sơ guest chỉ vì cookie hoặc số điện thoại trùng. Đặt lịch/mua hàng vẫn không đăng nhập/OTP; thay đổi này chỉ dành cho lúc khách tự chọn tạo tài khoản.

Backend yêu cầu đồng thời:

- Cookie guest ký đúng, Origin tin cậy, phiên commerce đã gắn với hồ sơ và contact khớp phone cần xác minh.
- Nhánh xác minh OTP thật qua Supabase trả Auth ID; không nhận Auth ID/customer ID do client gửi. `demo`/`preview`/`console` không được liên kết theo flag mới. Không đổi cấu hình hoặc hành vi demo của các luồng cũ không có flag.
- SQL kiểm tra Auth user có phone đã confirmed, phone khớp, không bị xóa/banned, không là nhân sự; khóa bản ghi Auth trong transaction. Phone được chuẩn hóa và khóa theo cùng namespace với account/guest legacy.
- Hồ sơ guest active, phiên chưa hết hạn hoặc thu hồi; kiểm tra lại sau khi khóa customer/session. Phone/Auth không thuộc hồ sơ khác; phone chính hiện có của target không bị thay hoặc ghi đè.

Nếu Auth đã gắn ở hồ sơ khác, hoặc canonical phone thuộc customer khác, trả xung đột để đối soát. Không tự gộp hai customer, không chuyển pet/order/appointment, không xóa dòng trùng để ép liên kết. Cookie không phải bằng chứng sở hữu số điện thoại; OTP phone cũng không tự cấp quyền lên hồ sơ của phiên khác.

## Khi liên kết thành công

`complete_guest_customer_auth` thêm canonical phone vào đúng Customer ID, gắn Auth ID và có thể cập nhật tên đăng ký. Trigger 112 thu hồi các phiên commerce của hồ sơ đó. Response lấy identity từ DB đã liên kết, xóa cookie guest; quyền member dùng cơ chế owner/Auth hiện tại. Retry SQL với cùng Auth/phone/proof trả lại đúng ID đã liên kết, không nhân đôi phone.

Pet ID, Appointment ID, Order ID và customer owner của các tài nguyên giữ nguyên. Nhận diện Admin tiếp tục dựa vào `auth_user_id`, nên loại khách chuyển thành member theo nguồn server; đợt này chưa kiểm thử nhãn/UI Admin hoặc Realtime mới.

Liên kết SQL là atomic nhưng xác minh Auth, cập nhật mật khẩu và RPC là các API khác nhau. Nếu SQL đã liên kết mà thiết lập mật khẩu lỗi, không giả vờ rollback identity: trả hướng dẫn dùng Quên mật khẩu; dữ liệu và Customer ID đã liên kết được giữ. Chỉ xóa cookie sau khi có identity response thành công. Cookie cũ dù còn tại browser vẫn bị DB thu hồi.

## Phone dùng chung phía máy chủ

`scripts/shared/phone-normalization.cjs` là bộ chuẩn hóa chung cho API Auth và commerce: số nội địa, `+84`/`0084`/`84`, bỏ ký tự trình bày hợp lệ, từ chối chữ/máy lẻ/sai độ dài. Không đổi giá trị phone của các hồ sơ cũ. Form/browser legacy chưa được nối/chỉnh validation trong đợt này; việc đó thuộc GĐ-04.

`cookieConfiguration` và bộ kiểm tra cookie dùng chung giữa commerce và nhánh Auth link, không nhân bản thuật toán ký hoặc gửi token thô trong body/URL. RPC link chỉ service role có EXECUTE, SECURITY DEFINER với search path cố định. Legacy `complete_customer_auth` giữ nguyên.

## Bằng chứng và giới hạn

- [22 kiểm tra / 144 SQL](guest-account-link-rollback.txt): HTTP loopback thật/cookie thật → SQL Cloud mới trong transaction rollback. Chặn anon/customer, Auth chưa confirmed/khác phone/banned, token lạ/hết hạn/thu hồi, guest khóa, nhân sự và phone nhân sự, xung đột phone/Auth. Kiểm tra HTTP OTP completion bỏ qua owner/Auth ID giả từ client, giữ Customer ID, pet/lịch/đơn, idempotency, thu hồi tất cả commerce session, member RPC đọc lại profile/pet và deferred constraints chạy immediate. Legacy RPC không đổi; fixture Auth/profile/transaction và DDL rollback sạch.
- **OTP delivery, verifier và cập nhật password trong bài HTTP trên được mock.** Auth records được seed confirmed trong transaction rồi rollback, không gửi SMS, không tạo user Auth committed hoặc coi đó là login Auth thật. Appointment/order headers chỉ dùng kiểm tra ID retention, không thay kiểm thử tạo giao dịch 114/115.
- [Forward/reverse và grants](guest-account-link-reverse.txt), [apply Cloud](guest-account-link-apply.txt): chỉ thêm hàm link service-only, không backfill hoặc gắn tài khoản hiện có lúc apply.
- [Hai REST probe thật chỉ đọc](guest-account-link-rest-readonly.txt): identity Auth ngẫu nhiên không tồn tại bị chặn, anon không được gọi RPC; không ghi identity hoặc đọc lịch sử thật.
- 50 test Node Auth/cookie/access/HTTP guard PASS: shared normalization, cookie/Origin, sai OTP, demo link bị chặn, xung đột trước password write, owner ID giả bị bỏ qua, lỗi password sau link có hướng dẫn phục hồi, thông báo không lộ DB detail. Các test “real verifier branch” dùng fake verifier, không phải SMS integration.

Lượt fixture ban đầu dùng phone quốc tế trong `customer_phone` bị constraint canonical từ chối; đã sửa fixture đúng canonical, không nới schema. Trước apply đã thêm khóa Auth và recheck session sau khóa rồi chạy lại toàn bộ 22 case đạt trên mã cuối.

## Khôi phục và việc còn lại

Ngoài webroot: `D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-account-link-116/` chứa legacy RPC trước, SQL forward/reverse và định nghĩa sau cài. `116_guest_account_link_rollback.sql` chỉ gỡ RPC mới; dừng nhánh link trước, không tháo liên kết Auth đã xác minh, xóa phone, mở lại token hoặc di chuyển giao dịch. Không phải backup/restore toàn database.

Chưa nối UI `linkGuest`, chưa cấu hình/kiểm tra SMS thật và không tự chuyển `PAWPAL_SMS_MODE` sang Supabase. Nếu đang chạy demo, người dùng không thể dùng nhánh link mới này để chứng minh phone; API giao dịch guest vẫn hoạt động độc lập khi được nối UI. Vẫn còn hai DB writer/multi-pet booking, UI và commit/Realtime hai portal. Không đánh toàn bộ GĐ-03 hoặc các stage nghiệm thu sau là hoàn tất.
