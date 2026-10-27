# GĐ-03: API phiên guest và lưu bé

Ngày 27/10/2026, Asia/Bangkok. **Hoàn tất một phần GĐ-03: phiên và lưu bé**, chưa hoàn tất tạo lịch/đơn guest hoặc giao diện. Migration 113 đã áp dụng Cloud; mã backend/route vẫn local, chưa push/deploy.

## Hành vi đã làm

Backend `scripts/api/guest_commerce.js` dùng service client ở máy chủ. Route local và Vercel cùng ánh xạ `/api/customer/guest/:action` tới handler này:

| POST JSON | Chức năng |
| --- | --- |
| `session` `{}` | Cấp cookie ký HMAC chứa nonce ngẫu nhiên 32 byte, không tạo customer/pet/session row nghiệp vụ. Nếu cookie đã có thì kiểm tra context, không tự nâng quyền hoặc gia hạn |
| `context` `{page: 1}` | Xác minh cookie rồi trả contact tự khai của phiên và tối đa 10 bé active/trang; chưa liên kết thì trả trạng thái trống. Không nhận phone/customer ID để tìm hồ sơ cũ |
| `pets` `{requestId, contact: {name, phone}, pet: {name, breedId, ...}}` | Trong một RPC transaction, lần đầu tạo hồ sơ nghiệp vụ tách biệt, profile, binding phiên commerce và bé/weight nếu có. Lần sau dùng lại đúng hồ sơ phiên. Không gọi `ensure_guest_customer` hoặc dò customer cũ theo phone |
| `end` `{}` | Thu hồi binding commerce và xóa cookie. Cookie đã sao chép cũng không đọc lại context sau khi bị thu hồi |

Cookie production `__Host-pawpal_guest`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, thời hạn tuyệt đối 7 ngày; local HTTP dùng tên dev riêng. DB chỉ nhận SHA-256 của giá trị cookie, không lưu token thô. Cookie có HMAC chống giả; khóa từ `PAWPAL_GUEST_COOKIE_SECRET` nếu cấu hình, hoặc khóa dẫn xuất có namespace từ service key đang có. Đổi khóa làm cookie cũ mất hiệu lực. Không đưa token/key vào JSON response, URL hoặc log.

Origin phải thuộc cấu hình tin cậy; từ chối `cross-site`, phương thức khác POST, content type không phải JSON, payload quá 16 KiB, cookie trùng/giả/hết hạn. Request có Bearer không bị chuyển thành guest. Caller UI vẫn phải chọn đúng luồng member; server không thể suy luận Auth từ localStorage mà browser không gửi.

Rate limit dùng RPC store hiện có, bucket tách theo action/IP; lưu hash khóa. Lưu bé tối đa 20 lần/phút/IP; action khác tối đa 60. Không polling hoặc tạo hồ sơ khi gõ phone/mở trang. Store rate lỗi thì từ chối xử lý, không tiếp tục ghi.

Phone chuẩn hóa các dạng nội địa/`+84`/`0084`/`84`, chỉ bỏ ký tự trình bày hợp lệ; chữ/mã máy lẻ bị từ chối. Phone giống nhau ở hai phiên không cho đọc hoặc gộp hồ sơ. Name/phone của phiên đã liên kết không được âm thầm đổi qua API lưu bé; trả xung đột để xử lý rõ ràng.

Pet request ID chính là UUID của bé mới. Gửi lại cùng nội dung trả cùng ID, không thêm weight lần nữa; đổi nội dung dưới cùng ID báo xung đột. UUID giống loài phiên bản 8 đang có trong Cloud được chấp nhận. ID bé thuộc customer khác bị từ chối, kể cả biết ID và cùng phone. Health text chỉ lưu theo dữ liệu khách tự nhập, không trả qua context tối thiểu.

SQL khóa theo token/request, khóa customer trước session khi dùng binding hiện có. Hai writer đồng thời **chưa kiểm thử thực tế**, không suy ra PASS concurrency từ việc có advisory lock. Cookie mất/phiên hết hạn không cấp lại quyền hồ sơ cũ chỉ bằng phone.

## RPC và phát hành

Migration `113_guest_commerce_api.sql` thêm `guest_commerce_context`, `guest_commerce_save_pet`, `guest_commerce_end`; tất cả `SECURITY DEFINER` với search path cố định, chỉ `service_role` có EXECUTE. Không đổi RLS, bảng, index hoặc RPC member hiện tại.

[Bằng chứng apply](guest-commerce-api-apply.txt) lưu hash/ACL/cấu hình hàm. Schema trước là chưa có ba hàm này; bản SQL/metadata trước/sau và SQL đảo nằm ngoài webroot tại `D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-commerce-113/`. SQL đảo chỉ gỡ ba hàm, giữ nguyên toàn bộ dữ liệu; dừng writers trước khi đảo, không CASCADE/restore đè database. Không phải backup toàn DB.

## Kiểm tra đã chạy

- [24 kiểm tra / 125 SQL](guest-commerce-api-rollback.txt): handler HTTP thật ở loopback → RPC PostgreSQL Cloud thật trong transaction rollback, có rate-limit SQL thực tế. Kiểm tra bootstrap không tạo hồ sơ, lưu bé/weight atomic, retry, payload đổi, hai phiên cùng phone, owner isolation, phân trang, cookie giả/trùng/hết hạn, Origin, Bearer, thu hồi phiên. SQL đảo đã chạy trong transaction, chỉ xóa hàm và giữ ba bé fixture cho đến outer rollback; sau đó tất cả fixture/DDL rollback sạch.
- Role `anon` và `authenticated` bị chặn thực thi RPC qua SQL. Đây là role test, không giả vờ đã login hai tài khoản Auth thật.
- [Hai request Supabase REST thật chỉ đọc](guest-commerce-rest-readonly.txt): service role nhận context trống cho hash ngẫu nhiên chưa có, anon bị từ chối. Không đọc phone/hồ sơ thật hoặc tạo hồ sơ committed.
- [Ba kiểm tra identity/atomicity trên RPC đã cài](guest-pet-identity-rollback.txt): hai bé trùng tên giữ ID riêng, lần ghi đầu dùng ID bé người khác không để lại customer/session dang dở, guest không chiếm primary phone. Fixture SQL rollback sạch.
- 39 test Node hồi quy Auth/access/HTTP guard PASS (`customer_auth.test.js`, `guest_records_access.test.cjs`, `guest_commerce_http_guards.test.cjs`). Test guard có case rate limit và store lỗi, request sai định dạng/Origin/content type, không gọi privileged RPC khi input chưa hợp lệ.
- Syntax backend/adapter/server và JSON Vercel hợp lệ. Không đọc Logs, gửi SMS, dùng Storage hoặc tạo thanh toán.

Lượt thử đầu phát hiện validation UUID cũ không nhận giống loài UUID v8; đã sửa trước PASS. Lượt SQL rollback dùng `now()` cố định trong transaction nên đã căn clock test theo timestamp DB; không coi thời gian mỗi HTTP request trong outer transaction là transaction commit riêng. Các lượt lỗi được rollback, không đánh PASS thay thế.

## Còn lại

- Quote/submit lịch và đơn bằng phiên commerce, kiểm tra bé được chọn, giá/kho/slot/payment/retry và receipt đúng phiên.
- Chính sách nhận lại hồ sơ sau mất phiên và liên kết Auth cho hồ sơ mới có `unverified_contact_phone`; không dùng lookup phone `LIMIT 1` cũ để liên kết nhầm.
- Chưa cập nhật UI booking/cart/checkout/Admin contact mới. Chưa thay OTP demo hoặc nghiệm thu tra cứu riêng.
- Chưa có E2E trên domain Vercel, commit/Realtime hai portal, concurrency hoặc test dịch vụ nhiều bé. Chưa push; route mới trên Production chưa phát hành mặc dù RPC đã cài.

Vì thế chỉ cập nhật các dòng phiên/chuẩn hóa/tạo bé có bằng chứng; gate GĐ-03 và mục tạo giao dịch vẫn chưa hoàn tất.
