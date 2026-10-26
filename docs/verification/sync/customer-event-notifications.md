# Thông báo phản hồi ticket và kiểm duyệt dịch vụ — 26/10/2026

Đã sửa **NOTIFY-01 / P1**: trước đây cập nhật ticket và kiểm duyệt review chưa ghi thông báo chuông cho khách. Migration 110 đã áp dụng lên Supabase Cloud `cpzuvaplseielhgcnqrn` ngày 26/10/2026; xác minh ba trigger, chỉ mục chống trùng và quyền helper riêng. Không sửa/backfill dữ liệu cũ. [Bằng chứng áp dụng](customer-event-notifications-apply.txt).

## Hành vi mới

- Tin nhắn công khai của nhân viên tạo notification cho đúng khách của ticket. Ghi chú nội bộ và tin khách tự gửi không tạo notification cho chính khách đó.
- Chuyển trạng thái ticket tạo một notification chung, không đưa nội dung điều tra, lý do nội bộ hoặc đề xuất riêng vào chuông. Customer followup tự chuyển trạng thái không tạo thông báo tự gửi.
- Kiểm duyệt review dịch vụ tạo notification cho chủ lịch khi trạng thái thực sự đổi: chờ duyệt/công bố/ẩn/không duyệt. Không đưa lý do kiểm duyệt nội bộ vào notification; chưa công bố review khi chỉ gửi review pending.
- Link chuông dùng FK `support_ticket_id` hoặc `appointment_id`, header hiện có dẫn đúng trang; không thêm query hoặc channel trình duyệt.
- `source_event` nullable và unique index chống trùng theo sự kiện gốc. RPC retry không chạy lại insert nguồn; no-op status không tạo notice mới. Không backfill hoặc sửa notification cũ.

## Bằng chứng

[14 kiểm tra Cloud/111 SQL PASS](customer-event-notifications-rollback.txt), một ticket và một lịch/review tổng hợp, mọi dữ liệu/DDL rollback. Các nhánh gồm public reply retry, internal note, resolve nội bộ, đúng A/B, đánh dấu đọc lặp, pending/publication/hide/no-op, lý do riêng tư, unique source và quyền guest. Không đăng review thật, gửi tin thật, truy vấn Logs hoặc stress test.

```text
node scripts/test/sync_customer_event_notifications_rollback.cjs --cloud
```

Mặc định không kết nối; statement timeout 8 giây/lock timeout 3 giây; luôn rollback. SQL claims không thay Auth/commit/Realtime thật.

## Kiểm thử đăng nhập, commit và Realtime thật

- [Ticket: 11 kiểm tra PASS, 54 request HTTP](ticket-notifications-auth-realtime.txt). Hai khách tổng hợp và tài khoản QA Admin đăng nhập Supabase Auth thật. Hai request tạo ticket chồng thời gian cùng UUID chỉ tạo một ticket; phản hồi công khai retry chỉ tạo một thông báo. Khách A nhận message và chuông qua WebSocket; B không nhận và không đọc/đánh dấu đọc được dữ liệu A. Ghi chú nội bộ không lộ; đánh dấu đọc lặp trả 1 rồi 0; client mới đọc lại trạng thái đã commit. Resolve retry thêm đúng một thông báo.
- [Đánh giá riêng tư: 8 kiểm tra PASS, 55 request HTTP](review-notifications-auth-realtime.txt). Gửi/retry một review chờ duyệt, Admin ẩn bằng hai request chồng thời gian chỉ ghi một thay đổi; revision cũ bị chặn; không duyệt tạo thông báo thứ hai đúng chủ lịch. Khách B không nhận; lý do nội bộ không lộ; client mới đọc lại trạng thái đã commit. Chỉ dùng pending/hidden/rejected, không công bố review thử nghiệm lên dịch vụ thật.
- Dọn sạch toàn bộ Auth, khách, ticket, lịch, thú cưng, review và thông báo tổng hợp theo UUID. Giữ đúng thiết kế ba audit xử lý ticket và hai audit kiểm duyệt bất biến của QA Admin; không tắt trigger hoặc xóa audit.
- Không thêm query, polling hoặc channel vào ứng dụng; không stress test hay truy vấn Logs. Số request trên là của harness kiểm thử, không phải số đo băng thông production.

Chạy lại chỉ khi có thay đổi cần xác minh: `node scripts/test/ticket_notifications_auth_realtime.cjs --cloud` hoặc thêm `--review-only`. Đây là SDK/Auth/PostgREST/WebSocket thật, chưa thay kiểm thử thao tác đầy đủ trên hai giao diện, reload trình duyệt hoặc công bố review sau commit. Nhánh công bố/lọc public mới được xác minh trong transaction rollback.

Upload và quyền Storage **HOÃN theo yêu cầu người dùng** vì chưa nối nơi lưu ảnh. Không tạo bucket, policy Storage, trường file hay tác vụ upload; không coi đó là điều kiện chặn đợt ticket/chat/notification hiện tại.
