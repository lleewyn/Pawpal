# Kết quả dọn dữ liệu và sửa cấu hình chatbot

## Đã áp dụng trực tiếp trên Supabase

- Bỏ hậu tố E2E11 ở tiêu đề bài 015aa7c9-e007-4855-a3ad-2f9268a36799 và câu hỏi FAQ đồng bộ cùng ID. Nội dung, đường dẫn và trạng thái bài viết/FAQ giữ nguyên, nên đồng bộ lại từ nguồn không mang hậu tố cũ trở lại.
- Xóa đúng 4 hội thoại đã có lời kiểm thử trực tiếp, cùng 19 tin nhắn và 2 đánh giá thử: tổng 25 bản ghi. Không xóa những hội thoại chỉ vô tình nhận câu trả lời nhắc dữ liệu thử.
- Đã chạy thử trong giao dịch rồi ROLLBACK, sau đó mới COMMIT. Đối chiếu xác nhận các hội thoại khác, danh mục, cấu hình khác và sổ tiền/điểm không thay đổi.
- Bản sao lưu ngoài webroot/Git: D:/Aboutme/Pawpal-infra/supabase-local/backups/chatbot-cleanup-2026-11-11T10-08-24-115Z/before-delete.private.json, kèm SHA-256.
- Không tạo mới dữ liệu mẫu. FAQ QA cũ đã tắt được giữ nguyên trạng thái tắt.

## Sửa mã prompt — ở local, chưa push/deploy

- Loại bỏ cách lấy tùy ý 5 prompt đầu tiên.
- Chọn theo thứ tự ưu tiên rõ ràng: vai trò, bảo mật, chống bịa thông tin, an toàn sức khỏe và chuyển nhân viên được ưu tiên trước các hướng dẫn bổ sung.
- Truy vấn chỉ lấy kênh web đang bật, sắp xếp theo prompt_key và giới hạn 50 dòng; giữ cache 5 phút.
- Giới hạn tổng nội dung chỉ dẫn 12.000 ký tự và không cắt ngang từng chỉ dẫn. Hai mươi prompt hiện có tổng khoảng 6.707 ký tự kể cả dấu xuống dòng, nằm trong giới hạn này.
- Bốn kiểm thử ngoại tuyến đạt: giữ đủ 20 vai trò hiện tại khi đảo thứ tự dữ liệu, ưu tiên an toàn khi chạm ngân sách, loại mục rỗng/tắt/trùng, và cache/truy vấn có giới hạn. Không gọi AI để kiểm thử.

## Phân loại hàng chờ, không tự ghi kết quả giả

- Năm ca quá SLA: hai waiting_agent (chưa có nhân viên nhận, một ca khẩn cấp), ba agent_handling đã có nhân viên phụ trách. Trạng thái/đánh dấu khẩn cấp và hạn SLA được giữ nguyên để người quản trị thấy công việc thực tế, không đóng chỉ để làm sạch số đếm.
- Không có phiên nào đáp ứng đầy đủ bộ điều kiện bảo thủ để đóng do im lặng: bot_handling, không nhân viên phụ trách, không khẩn cấp, không hạn SLA, tin cuối là bot và không có cập nhật/tin mới trong hơn 30 ngày.
- Không triển khai tác vụ đóng/xóa định kỳ khi chưa có chính sách vận hành được chốt. Ba hội thoại rỗng và những hội thoại cũ không được mặc nhiên coi là rác.

## Băng thông và giới hạn kiểm chứng

Các lượt đọc giới hạn theo mã và chỉ lấy metadata/tổng hợp; sao lưu chỉ chứa các bản ghi sắp chỉnh/xóa. Không tải ảnh/tệp, gọi mô hình AI hoặc truy vấn Supabase Logs. Phép đối chiếu toàn vẹn được tính hash phía PostgreSQL, không tải toàn bộ dữ liệu bảo vệ về máy.

FAQ có thể còn hiện tiêu đề cũ trong cache API tối đa thời gian cache hiện có hoặc trong tin nhắn lịch sử được giữ lại. Chưa gọi AI để đánh giá chất lượng câu trả lời sau thay đổi. Phần sửa prompt chỉ có hiệu lực sau khi mã được triển khai; chưa chạy git push vì người dùng chưa yêu cầu.
