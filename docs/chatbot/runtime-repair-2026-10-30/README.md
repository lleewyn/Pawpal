# Sửa lỗi503 trên web cổng4000

Ngày30/10/2026. **Đã khôi phục và kiểm tra trực tiếp luồng hỏi giá trên http://localhost:4000/**. Trước sửa API gọi các hàm đọc chưa có trong backend; sau sửa các request mới200 và có câu trả lời trên giao diện. Không suy kết quả này thành nghiệm thu mọi luồng chatbot.

## Hai phần đã sửa

1. Backend: đồng bộ đúng gói [forward.sql](forward.sql), SHA256 ghi trong [cloud-apply.txt](cloud-apply.txt). Gói có5 RPC đọc dữ liệu chỉ dành cho service_role,2 helper xử lý văn bản,1 helper giới hạn đồng thời và3 index FAQ/catalog. Không sửa bản ghi FAQ, dữ liệu khách, đơn hàng hoặc lịch hẹn. Không áp lại toàn bộ135–157, không chạy125 hoặc157 và không mở Cloud Logs. Phần nội dung FAQ mới vẫn chưa ápCloud.
2. Frontend/API: đọc bình thường tối đa một lần/30 giây khi đang mở và hiển thị; lỗi tạm thời backoff30/60/120 giây. PGRST202 trả503 với retryable=false để dừng đọc tự động; lỗi quyền/phiên không retry nền. Người dùng vẫn có thể mở lại/gửi lại thủ công; đọc thành công reset trạng thái, đổi tài khoản/chat mới không kế thừa cờ lỗi. Giữ nguyên bản nháp và request-id an toàn.

Timer nền vẫn kiểm tra điều kiện mỗi10 giây, nhưng không gửi request10 giây/lần. Đóng khung/tab ẩn không đọc. Không thêm channel, cache, thao tác tự retry tin nhắn hoặc tự gọi model.

## Kiểm chứng triển khai

- Đối chiếu đích PostgreSQL với project backend, metadata đúng8 hàm/3 index đều chưa tồn tại, kiểm tra service_role có quyền đọc13 bảng cần thiết. [Preflight](preflight.txt).
- Gói tối thiểu đã áp/rollback/reapply trên clone riêng;5 RPC dữ liệu có thể chạy bằng service nhưng anon/authenticated bị chặn. [Local checks](local-checks.txt). Môi trường đó đã dọn; [hồ sơ cleanup](../stage5-runtime-repair-2026-10-30/local-environment.txt).
- ÁpCloud trong một transaction, timeout8 giây/lock1 giây; kiểm tra5 RPC SECURITY INVOKER và quyền trước COMMIT. DDL thành công, notify schema cache. [Kết quả](cloud-apply.txt).
- Server4000 cũ được khởi động trước mã API mới. Lệnh restart tổng hợp ban đầu bị kiểm duyệt chặn; sau khi xác minh PID33740 là node server.js đang phục vụ đúng byte của asset trong workspace, thao tác riêng theo PID đã được chấp nhận. Đã nạp lại server4000 bằng PID14140, chạy ẩn. Không dừng tiến trình khác.
- Handler mới dùng backend Cloud thật: mở/gửi/đọc đều200, có trả giá Hotel; model bị cấm trong probe. [Handler check](current-handler-check.txt). Một lượt harness trước đó bị lỗi mã hóa chuỗi qua PowerShell và đi nhầm nhánh FAQ; stub đã chặn AI, sau đó sửa đầu vào Unicode và chạy đạt. Giữ [diagnostic](diagnostic.txt), không dùng lượt đó làm bằng chứng runtime thất bại sau sửa.
- Trình duyệt thật, không mock network: trên4000 gửi **Giá Pet Hotel**, **Giá taxi**, **Giá tắm**, đều có phản hồi từ nguồn thật, trạng thái Hỗ trợ tự động, ô nhập được xóa. Network request mới320/321/328–333 trả200; các503 trước đó là lịch sử trước restart. [Ảnh sau sửa](chat-4000-success.png).
- Không gửi thêm Gemini hoặc chuyển tin cho nhân viên. Thử qua API/trình duyệt có tạo hội thoại/tin nhắn QA guest của chính bài test; không xóa các bản ghi này để tránh thay đổi audit. Không có đơn/lịch/thanh toán được tạo. Không ghi session token/khóa vào bằng chứng.

## Hồi quy

Chrome: backoff30/60/120, thiếuRPC dừng đọc, đóng dừngrequest, mở thủ công phục hồi và giữ draft; lịch sử nhiều trang/đọc Unicode/đổi tài khoản vẫn đạt.262 kiểm tra offline và40 ca nghiệp vụ đạt. Diff không lỗi khoảng trắng. Code chưa push.

FAQ dùng Gemini, chuyển nhân viên thật và các vai trò khác chưa được thử trọn vẹn trên web4000 trong đợt này. Các mẫu model trước không tự cho phép thêm lượt gọi bên ngoài.

## Rollback

[rollback.sql](rollback.sql) chỉ gỡ đúng các hàm/index mới; không DROP CASCADE. Đưa API/frontend về phiên bản tương thích trước khi gỡ. Nếu đã có phụ thuộc hoặc chỉnh sửa thêm sau gói này, phải kiểm tra lại trước rollback. Khôi phục code đọc mới nhưng bỏRPC sẽ làm lỗi503 quay lại; không coi fallback đọc500 FAQ là cách khôi phục.
