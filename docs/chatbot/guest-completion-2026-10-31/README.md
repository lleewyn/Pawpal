# Đợt đầu hoàn thiện tư vấn khách vãng lai

Ngày31/10/2026. Công việc ưu tiên theo [file riêng](../../../PAWPAL_HOAN_THIEN_CHATBOT_KHACH_VANG_LAI.md): sửa thông tin khách đọc trước khi đặt/mua, không lấy số công cụ làm kết quả hoàn thành.

## Đã làm

1. Đối chiếu READ ONLY21 FAQ mục tiêu trênCloud với nội dung sửa đã chuẩn bị:18 mục cần cập nhật,3 mục cần thêm, không có mục đã bị chỉnh độc lập hoặc trùng câu hỏi. Kết quả: `faq-readiness.txt`.
2. Sửa nhãn tiếng Việt của ba hướng dẫn mới trong157 và guard rollback: trước đó nguồn có chuỗi `H??ng d?n c?ng khai`, nay là `Hướng dẫn công khai`. Thêm kiểm tra hồi quy,5 test nội dung PASS.
3. Áp đúng150,152,157 trong một transaction có guard nội dung cũ, timeout5 giây/lock1 giây. Kiểm tra đủ21 trạng thái sau sửa trước commit; danh mục ba mục mới đúng tiếng Việt. Không sửa nguồn khác hoặc dữ liệu khách/giao dịch. Kết quả và hash nguồn: `faq-apply.txt`.
4. Với role service_role như nguồn public API, dùng một hội thoại guest kiểm thử của lượt browser trước để truy xuất20 FAQ đang bật: đủ nội dung đã rà, tối đa5 mục/32KiB context. Một mục QA được tắt, không xóa lịch sử. Không gọi model.
5. Trên UI localhost4000, tìm sáu câu đại diện qua tab FAQ: đặt lịch không tài khoản, mua không tài khoản, OTP, đổi trả, hướng dẫn đặt lịch và giá Hotel thường/VIP. Mỗi câu trả đúng một hàng có nội dung mới. Đây là kiểm tra nội dung thật từCloud qua giao diện, không phải nghiệm thu câu trả lời Gemini cho guest.

## Nội dung đã cải thiện

- Guest được đặt/mua theo luồng hiện hành mà không bị FAQ ép tạo tài khoản thành viên.
- Đặt cho nhiều bé, gói chính/phần thêm và trạng thái tiếp nhận được diễn đạt đúng giới hạn.
- OTP không bị nói chắc đã gửi qua SMS; không yêu cầu khách đưa OTP/mật khẩu vào chat.
- Không hứa chatbot đã tra phòng/lịch/ưu đãi/đơn/điểm khi chưa có nguồn và xác minh phù hợp.
- Có hướng dẫn mua guest, xác nhận phí/phạm vi giao nhận và cách gửi yêu cầu đổi trả; không tự tạo thời hạn/phí/điều kiện được duyệt.
- Phân biệt thông tin công khai với dữ liệu riêng, giá hiện hành với báo giá đã xác nhận.

## Giới hạn

Không có lượt Gemini mới hoặc truy vấn Cloud Logs. Chưa xác nhận đủ mọi dữ kiện kinh doanh cho14 nhu cầu, chưa bổ sung công cụ tồn hàng/lịch/phòng và chưa nghiệm thu chất lượng trả lời model. Các bước này vẫn mở trong file công việc riêng. Chưa được gọi toàn bộ chatbot guest đã hoàn thiện.

Rollback đã có ở ba file150/152/157 tương ứng; giữ guard nội dung/metadata để không ghi đè chỉnh sửa sau này. Không thực hiện rollback thử trênCloud. Phiên bản157 mới thay nhãn danh mục nên hash khác bằng chứng local ngày30/10; nội dung sửa câu hỏi giữ nguyên, trạng thái Cloud và truy xuất được kiểm tra lại ở lượt này.
