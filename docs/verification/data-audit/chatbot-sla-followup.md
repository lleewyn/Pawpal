# Rà soát tiếp SLA và câu trả lời mẫu

## Đính chính số liệu SLA

Đối chiếu trigger set_chat_handoff_sla đang chạy trên Supabase và giao diện formatSlaInfo: sla_deadline được đặt khi chuyển sang waiting_agent; khi nhân viên tiếp nhận, giao diện hiện “Đang tiếp nhận” và không tiếp tục tính như hàng chờ. Mốc cũ vẫn được giữ trong dữ liệu.

Do đó 5 mốc hạn đã qua trong lần rà đầu không đồng nghĩa 5 ca còn quá hạn chờ tiếp nhận. Có 2 ca waiting_agent thực sự quá hạn, 3 ca agent_handling đã được nhận. Trình kiểm tra dữ liệu đã được sửa để báo riêng hai chỉ số này.

## Đã xử lý trực tiếp một phiên kiểm tra

Hội thoại 2d4521f3-ac32-446f-8ddf-45c9842c5d65 có lời khách ghi rõ “Kiểm tra gửi ảnh trên Preview theo yêu cầu chủ dự án. Ảnh mẫu từ assets, không phải yêu cầu chăm sóc hay khiếu nại.”

Đã thử trong giao dịch và ROLLBACK, sau đó đóng đúng phiên này với lý do “Kết thúc phiên kiểm tra ảnh”, bỏ phân công đang giữ và thêm ghi chú nội bộ mô tả đúng việc rà soát. Không ghi nhận giả rằng đã giải quyết yêu cầu khách hàng, không gửi tin nhắn kết thúc hoặc khảo sát.

Toàn bộ tin nhắn và dữ liệu ảnh được giữ nguyên; đối chiếu hash xác nhận không thay đổi các hội thoại khác. Sao lưu ngoài webroot/Git: D:/Aboutme/Pawpal-infra/supabase-local/backups/close-preview-chat-2026-11-11T10-21-18-569Z/before.private.json.

## Nhóm còn cần xử lý thực tế

- dc2c819b-017a-43cf-84c0-9878fc0a0b5d: chờ tiếp nhận, khẩn cấp, phản ánh thanh toán. Chưa có mã giao dịch/kết quả đối soát trong phần trao đổi đã xem; không tự tuyên bố đã hoàn tiền hoặc đóng ca.
- db25d445-d136-4bf8-bde7-42baa36615ed: chờ tiếp nhận, yêu cầu tư vấn dịch vụ và nhân viên hỗ trợ. Không tự gán nhân viên khi chưa có quyết định phân công.
- aa78eae9-a654-443e-a606-78e724301296 và faaad508-272a-4e38-982f-0599f5574abb: đã có nhân viên phụ trách, chưa có kết quả kết thúc được xác nhận. Trong lịch sử có câu mẫu chưa điền “[Tên khách hàng]”, “[Tên thú cưng]”; không sửa lại tin nhắn đã gửi hoặc xem đó là bằng chứng sự cố đã được giải quyết.

## Chặn tái diễn câu mẫu chưa điền — local

Thêm kiểm tra chung cho ô trả lời Admin và Nhân viên: phát hiện các ô tên/mã/thời gian còn ở dạng ngoặc vuông, hiển thị lỗi và giữ nguyên bản nháp trước khi gọi RPC. Ghi chú nội bộ không bị chặn; tin chỉ có “[Hình ảnh]”, trích dẫn số và nội dung thực đã điền vẫn được phép.

Chưa push/deploy thay đổi mã. Không gửi tin thử thật hoặc gọi mô hình AI để kiểm chứng; dùng kiểm thử ngoại tuyến. Không tải tệp hoặc truy vấn Supabase Logs.
