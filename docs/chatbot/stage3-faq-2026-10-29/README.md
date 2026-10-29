# G3.4 — Migration FAQ đặt lịch theo đối tượng

Ngày kiểm chứng: 29/10/2026. **Đạt 7 nhóm SQL local; chưa push hoặc áp Cloud.**

Đã chuyển nội dung [FAQ đề xuất từ đối chiếu mã nguồn](../stage3-staff-2026-10-28/faq-audience-review-2026-10-29.md) thành [migration 150](../../../scripts/database/v1/150_chat_booking_faq_audience.sql) và [rollback](../../../scripts/database/v1/150_chat_booking_faq_audience.rollback.sql).

Nội dung phân biệt thành viên đăng nhập dùng hồ sơ tài khoản với khách vãng lai dùng luồng riêng, liên hệ và hồ sơ bé. Đồng thời làm rõ đã tiếp nhận yêu cầu chưa đồng nghĩa đã thanh toán hoặc được cửa hàng duyệt. Không đổi giao diện, quyền đặt lịch hoặc tạo giao dịch trong chat.

## Điều kiện áp dụng

- Phải có đúng một FAQ mang câu hỏi chính xác “Đặt lịch PawPal như thế nào?”. Thiếu hoặc trùng thì dừng giao dịch.
- Chỉ thay câu trả lời cũ đã đối chiếu trong payload được lưu; nội dung đã sửa độc lập thì dừng để rà lại. Không tự chèn FAQ mới.
- Chạy lại khi nội dung đã đúng là không làm gì. Rollback cũng kiểm tra nội dung tương ứng trước khi hoàn nguyên; không ghi đè thay đổi được thực hiện sau migration.
- Chỉ sửa `answer` và `updated_at`. Giữ mã, nhóm, từ khóa, độ ưu tiên, ngày tạo và trạng thái bật/tắt.
- Giao dịch khóa đúng các dòng có câu hỏi đích; `statement_timeout=5s`, `lock_timeout=1s`. Không đổi chính sách hoặc tạo job chạy nền. Các timeout được khai báo trong SQL; đợt kiểm chứng này chưa đo tranh chấp khóa.

## Bằng chứng

[Kết quả PostgreSQL local và SHA-256](local-results.txt), [môi trường và biên nhận dọn](local-environment.txt). Script tái lập: [chat_stage3_faq_local.cjs](../../../scripts/test/chat_stage3_faq_local.cjs), chỉ chạy khi có `--local-fixtures`, trạng thái READY và database có dấu sở hữu khớp.

1. Sửa đúng nội dung và giữ thuộc tính khác; chạy lại không cập nhật thêm.
2. Rollback trả đúng nội dung cũ; chạy lại rollback không cập nhật thêm.
3. Cả hai chiều từ chối nội dung đã sửa độc lập.
4. Thiếu FAQ thì từ chối, không tạo bản ghi.
5. Trùng câu hỏi thì từ chối, không sửa một phần.
6. FAQ tắt giữ nguyên trạng thái qua cả hai chiều.
7. Rollback từ chối ghi đè nội dung đã sửa sau migration.

Kiểm tra sử dụng fixture trong clone riêng, không phải cập nhật FAQ nghiệp vụ thật. Không kiểm chứng RLS/Auth/API, tìm kiếm FAQ qua chatbot hoặc chất lượng model trong đợt này. Docker chưa sẵn sàng lúc đầu; sau khi khởi động đã tạo được môi trường và chạy hoàn tất. Database clone và hai container Auth/REST đã xóa, tệp thông tin kết nối riêng đã dọn, database nguồn còn nguyên.

## Tác động tài nguyên và việc còn lại

Đây là cập nhật dữ liệu một lần, không thêm truy vấn ở mỗi câu hỏi, polling, listener hoặc dịch vụ. Giữ trần đọc nguồn hiện tại của chatbot. Chưa đo query plan/độ trễ trên dữ liệu Production; câu hỏi chưa có chỉ mục riêng không đồng nghĩa tra cứu là O(1).

FAQ Cloud chưa được cập nhật. G3.4 còn nguồn FAQ nhóm C chính thức và đánh giá model rộng hơn. Hai lượt Gemini cũ vẫn PARTIAL; không có lượt Gemini bổ sung. Gate 2 vẫn mở; chưa triển khai migrations 135–150 lên Cloud.
