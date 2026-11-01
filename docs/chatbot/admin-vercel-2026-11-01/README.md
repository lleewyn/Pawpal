# Kiểm tra Admin Vercel — 01/11/2026

Đã kiểm tra trực tiếp https://pawpalgr3.vercel.app sau khi push003d5e85. Endpoint thật trả được ba ý định Hotel/Taxi mới và bộ định tuyến tự nhiên; đây là bằng chứng hành vi bản triển khai, không phải đọc metadata SHA từ Vercel.

## Kết quả

- **24/24 câu browser đạt**, HTTP200 và câu trả lời hiển thị trong ô chat. Gồm phòng Hotel theo khoảng, lượt lưu trú, Taxi, lịch Spa theo buổi/KTV, giá Daycare, so sánh tuần/tháng, việc chờ, đơn, phiếu, tồn kho, hội thoại, thực thu, hoàn tiền, lịch trực, đánh giá, bài viết và cấu hình.
- Mã khách không tồn tại, thiếu ngày hoặc thiếu gói được hỏi rõ; yêu cầu xóa bị từ chối. Không thử thao tác ghi nghiệp vụ.
- Tab **Trực chat**: get_admin_chat_inbox_view200, khung danh sách hiện, không lỗi tải.
- Tab **Quy định**: admin_chat_rule_counts và admin_chat_rule_page_bounded200;10 dòng FAQ hiện, không lỗi tải. Không sửa FAQ hoặc chạy benchmark có ghi dữ liệu.
- Lịch sử Trợ lý tải được bằng API200; phiên không đăng nhập gọi API lịch sử bị401.
- Không gọi thêm Gemini, không đọc Cloud Logs, không xuất nội dung khách/mã thực vào báo cáo. Chỉ tạo lịch sử chat kiểm tra của chính tài khoản Admin đang đăng nhập.

[Bằng chứng chi tiết](browser-results.txt).

## Chi phí và độ trễ quan sát được

24 câu dùng tối đa2 nguồn/câu, tổng payload nguồn13.415byte, lớn nhất3.334byte/nguồn. Thời gian từ gửi UI tới phản hồi khoảng1.880–6.460ms/câu. Đây là lượt smoke có giãn9s giữa câu, không phải benchmark tải đồng thời.

Đo mạng bổ sung cho16 câu cuối và4 lần mở trang mới:32 phản hồi API/REST phía browser đều200, tổng98.600byte body sau giải nén; riêng16 POST hỏi chatbot23.727byte. Mỗi lần mở trang còn tải hộp thư trực chat15.644byte. Không cộng số này với payload nguồn để suy thành tổng egress vì chúng có thể biểu diễn cùng dữ liệu ở các tầng khác nhau.

Chưa bao gồm request Auth/SQL/RPC phía server, header/TLS, byte database egress hoặc tải nhiều người. Probe tự động gửi song song câu capabilities không thu được phép đo dùng được, nên không tính đạt kiểm tra cạnh tranh. **Gate2 vẫn mở**; không kết luận toàn hệ thống không thể quá tải.

## Lượt kiểm tra cần sửa cách chờ

Bài test Quy định ban đầu đợi RPC tên cũ admin_chat_rule_page_bundle nên timeout; mã hiện hành dùng admin_chat_rule_page_bounded và truy vấn này200. Một cách chờ khác dựa vào việc mất thuộc tính data-loading-skeleton cũng timeout dù bảng đã có10 dòng; lần cuối xác minh bằng RPC thực, bảng hiển thị và không có thông báo lỗi. Không coi các timeout của harness là lỗi ứng dụng đã được sửa, và không thay runtime để cho test qua.

Kết quả và checklist được cập nhật local; chưa push thêm tài liệu trong lượt kiểm tra này.
