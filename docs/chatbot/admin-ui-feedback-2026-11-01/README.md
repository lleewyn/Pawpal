# Sửa trạng thái gửi và vị trí nút Admin — 01/11/2026

Người dùng phát hiện câu hỏi chưa hiện trong lúc gửi, lời hướng dẫn trống nằm giữa khung và nhóm nút Trực chat bị đẩy ra giữa.

Nguyên nhân: submit tạo pendingMessage nhưng chỉ thêm vào danh sách sau khi API trả về; render vẫn vẽ khung trống cao200px. Thanh Trực chat vừa giãn tên vừa có spacer nằm giữa nhóm tác vụ và nút Tiếp nhận.

Đã sửa:

- Hiện ngay một câu hỏi trước khi gọi API; lời hướng dẫn trống biến mất. Trạng thái chờ ở ngay sau câu hỏi, có thông báo trạng thái cho trình đọc màn hình.
- Lỗi giữ câu hỏi và bản nhập để gửi lại. Gửi lại cùng nội dung giữ nguyên request/session ID và không nhân đôi câu hỏi; thành công chỉ có một câu hỏi và một trả lời.
- Lời hướng dẫn của phiên trống căn trái phía trên. Bỏ spacer giữa các nút, gom tác vụ về phải; nhóm có thể xuống dòng khi hẹp.
- Bong bóng tin nhắn giữ bo9px, bỏ viền trái trang trí; cập nhật phiên bản CSS/JS để tải đúng thay đổi sau phát hành. Không thêm request hoặc thay nguồn/quyền database.

## Kiểm tra

- [Test giao diện có transport kiểm soát](controlled-results.txt): giữ request đang chờ, trả503, gửi lại và thành công; kiểm tra căn phải/không tràn ở1440/800/390px. Không dùng Supabase hoặc Gemini cho các ca lỗi mô phỏng này.
- [Browser/API localhost thật](local-real-results.txt): hai lượt cùng câu “Bạn làm được gì?” dùng phiên Admin hiện có; câu hỏi hiện trong lúc POST được giữ tại browser, không còn lời hướng dẫn trống; API200/capabilities, sau đó đúng một câu hỏi và một trả lời, trạng thái chờ đã bỏ. Xác nhận câu hỏi nằm trong viewport; ảnh cuối che sidebar lịch sử và tên tài khoản. Không gọi Gemini hoặc đọc nguồn nghiệp vụ.
- Hồi quy chat_copilot_initial_load_race.cjs và chat_history_pages_ui.cjs đều đạt: lịch sử về chậm không đè câu trả lời, phân trang35 tin không mất/lặp.
- Đã xem ảnh pending-desktop.png, local-real-pending.png và hai ảnh live-header-1440.png/live-header-390.png. Ảnh chỉ chứa ca kiểm tra công khai, không có nội dung khách.

Lượt Vercel trước kiểm tra kết quả cuối của24 câu, chưa kiểm đầy đủ trạng thái chờ trong thời gian API chưa trả về. Lượt này bổ sung kiểm tra đó. Thay đổi hiện ở local, chưa push và chưa nghiệm thu lại Vercel.
