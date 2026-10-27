# GĐ-03: báo giá và đặt lịch guest

Ngày 27/10/2026, Asia/Bangkok. **API đặt lịch guest đã kiểm tra và migration 114 đã áp dụng Cloud.** Mã backend/route còn local, chưa push/deploy hoặc nối giao diện; chưa hoàn tất GĐ-03 vì còn tạo đơn guest và các kiểm tra tích hợp.

## Hành vi

Cùng route backend đã có, thêm ba POST JSON:

| Action | Body | Kết quả |
| --- | --- | --- |
| `booking-quote` | `{details}` | Phiên hợp lệ → bé thuộc hồ sơ active của phiên → giá theo cân nặng/gói/nhóm dịch vụ, phụ phí đã chọn và kiểm tra khả dụng. Trả version, giá/thời gian và lựa chọn nhân viên tối thiểu; bỏ core chứa owner/context nội bộ |
| `booking-create` | `{requestId, expectedQuote, details}` | Server kiểm tra lại báo giá/khả dụng rồi ghi lịch, các dòng dịch vụ, thông tin hotel/taxi và audit trong cùng transaction. Trạng thái `pending`, không tự phân công hoặc ghi nhận thanh toán |
| `booking-receipt` | `{requestId}` | Đọc trạng thái, mã, thời gian và tổng từ DB; cần đúng owner và đúng phiên đã tạo lịch. Tổng lấy từ view nghiệp vụ, gồm điều chỉnh được chấp thuận theo quy tắc hiện tại |

Cookie/hash, hạn, thu hồi và Origin dùng cơ chế [phiên guest đã kiểm tra](guest-stage3-session-pets.md). Khách phải có bé được lưu hợp lệ bằng phiên, không cấp quyền đặt cho bé cũ bằng phone. Không nhận customer ID, staff phân công, giá hoặc tổng tiền do client áp đặt. Backend giới hạn JSON 16 KiB, chi tiết lịch 12 KiB, ngày giờ phải có múi giờ và kiểm tra UUID/addon/nội dung. Tạo lịch tối đa 20 lần/phút/IP; quote/receipt 60.

Gửi lại cùng request ID, details và version trả lại mã cũ, không tạo thêm dòng. Đổi payload/version dưới mã đó bị từ chối. Mã lịch của phiên khác trả không tìm thấy; biết ID và trùng phone không cấp quyền. Phiên bị thu hồi/khóa/liên kết Auth không tiếp tục xem hoặc tạo lịch.

Spa lưu giá theo weight variant và addon; hotel giữ đúng phòng/kỳ tính/giá snapshot; taxi hỗ trợ một chiều/khứ hồi theo bảng giá. Nhân viên ưu tiên chỉ là yêu cầu chờ cửa hàng xác nhận, không tự gán ca. Receipt không trả health text/phone/lịch sử ngoài lịch được phép.

## Cách dùng lại quy tắc hiện có

`build_guest_booking_migration.cjs` đọc hai định nghĩa member thực tế và sinh **hàm private mới** cho guest, chỉ thay nguồn owner thành customer đã được phiên server xác minh. Không giả lập JWT/Auth và không sửa hàm member. [Baseline nguồn](guest-booking-source-baseline.txt) ghi hash; bộ apply kiểm tra lại đúng hash trước khi cài.

Một điều chỉnh riêng cho guest: availability dùng `catalog_duration` theo cân nặng/gói thay vì duration mặc định của service. Closing-hour và kiểm tra giao nhau phải dùng cùng duration với giá; addon được cộng theo quy tắc nhóm dịch vụ. Test dùng service mặc định 60 phút nhưng variant 90 phút, addon 15 phút: còn 80 phút trước đóng cửa phải từ chối.

Quote/create giữ khóa khả dụng cùng namespace với booking member, kiểm tra phòng và giá từ DB. **Chưa kiểm thử hai writer cạnh tranh/full-capacity**, không suy ra PASS concurrency từ việc có khóa. Quy tắc giá/khả dụng có bản guest riêng được sinh từ source; lần sửa logic member sau này cần cập nhật và kiểm tra cả guest. Bảng giá/catalog live vẫn được đọc trực tiếp, không chèn giá mẫu vào runtime.

## Bằng chứng

- [31 kiểm tra / 285 SQL](guest-booking-rollback.txt): HTTP loopback thật → RPC SQL Cloud/rate limit thật qua role service trong transaction rollback. Ba nhóm spa/hotel/taxi có dịch vụ/phòng/giá riêng trong fixture; không sửa cấu hình hoặc hồ sơ khách thật. Kiểm tra quote đúng tổng, pending, items/logistics, retry, receipt, owner/phiên khác, required addon, giờ mở cửa, duration theo variant, giá cũ và phòng đã giữ. Không để lại fixture/audit/DDL committed.
- [SQL forward/reverse và quyền](guest-booking-reverse.txt): cài/gỡ sáu hàm trong transaction, không đụng dữ liệu nghiệp vụ; hàm member giữ nguyên. [Apply Cloud](guest-booking-apply.txt): ba RPC public chỉ service role có EXECUTE; ba helper private không cấp trực tiếp cho anon/customer/service. Tất cả SECURITY DEFINER dùng search path cố định.
- [Hai request Supabase REST chỉ đọc](guest-booking-rest-readonly.txt): service request với hash không có binding bị từ chối; anon không được lấy receipt. Không tra phone hoặc lịch thật.
- [Hai guard trên RPC đã cài](guest-booking-pet-guard.txt): bé inactive bị từ chối, client chèn owner bị chặn ngay trong RPC. Fixture rollback sạch.
- 40 test Node Auth/access/HTTP guard PASS. Kiểm tra syntax và JSON route; không dùng Logs/SMS/Storage hoặc payment gateway.

Lượt đầu 30 case PASS; sau khi bổ sung duration theo variant và case sát giờ đóng cửa, chạy lại toàn bộ được 31 case PASS trước apply. Không dùng kết quả bản cũ để nghiệm thu mã đã đổi.

## Khôi phục và giới hạn

Backup theo phạm vi ngoài webroot: `D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-booking-114/` chứa định nghĩa member được bảo vệ, SQL forward/reverse và metadata sau cài. `114_guest_booking_rollback.sql` chỉ gỡ sáu hàm mới; dừng guest booking writers trước khi đảo, giữ toàn bộ hồ sơ/lịch/audit, không CASCADE hoặc restore đè DB. Đây không phải backup/restore toàn database.

Chưa chạy giao dịch committed/Realtime hai portal, Auth member quote parity, full-slot/two-writer, frontend booking hoặc domain Vercel với mã backend mới. Chưa có giỏ/quote/submit đơn guest, nhận lại hồ sơ sau mất phiên, liên kết Auth cho contact mới hoặc thao tác hủy/sửa lịch guest. Cơ chế tra cứu riêng/OTP và các giới hạn upload/gateway không thay đổi.

Chỉ đánh checklist phần booking có bằng chứng; mục giao dịch shop, liên kết tài khoản và gate GĐ-03 tiếp tục để trống.
