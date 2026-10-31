# Rà checklist và thử chatbot trên giao diện localhost

Ngày31/10/2026. URL `http://localhost:4000`, giao diện và API local, Supabase Cloud theo cấu hình hiện hành. Admin đăng nhập trực tiếp sau khi người dùng xác nhận; guest dùng browser context riêng. Không tạo tài khoản Cloud, không lấy credential ra báo cáo, không gọi Gemini/Logs và không dùng transport mock cho kiểm tra trực tiếp.

## Kết quả cuối:28 tình huống đạt

| Nhóm | Kết quả | Phạm vi thực sự đã thử |
| --- | --- | --- |
| Admin |14/14 | Tải lịch sử; hỏi số SKU dưới ngưỡng và thực thu hôm nay; reload đúng phiên vừa tạo; đọc sáu nhóm Quy định; FAQ tìm không thấy; ba bộ lọc Inbox |
| Guest |8/8 | Welcome; giới thiệu tắm/cắt tỉa; giá tắm, Hotel và Taxi; không trả số dư Paw Points riêng khi chưa xác minh; giữ nháp khi đóng/mở; reload hội thoại của mình |
| Hai UI |6/6 sau sửa | Nút chuyển người mở lại ngay sau trả lời; guest yêu cầu nhân viên; Admin chọn đúng ca kiểm thử và tiếp nhận; trả lời; hoàn tất/khóa gửi; guest gửi CSAT |

Các lượt gửi câu hỏi và thao tác chuyển/nhận/trả lời/hoàn tất/CSAT thực tế đều trả200 trong bộ cuối. Hai nhóm Admin/guest ghi nhận không có request API/RPC lỗi hoặc pageerror. Chỉ lưu số dòng, độ dài và trạng thái; không ghi response chứa hồ sơ hay nội dung chat của người khác vào Git. Chi tiết: [results.txt](results.txt).

## Lỗi phát hiện và sửa

Sau `public_send`, `read()` render khi `busy=true`, làm khóa nút Gặp chuyên viên. `finally` chỉ mở nút Gửi, bỏ quên nút chuyển người; trước khi có lần đọc nền khác, click không phát `public_mode`. Hai lần thử trước sửa bị timeout ở thao tác này, trace chỉ có open/send/read. Không coi các timeout đó là kết quả đạt.

Đã tách `syncControls()` khỏi phần thông báo trạng thái và gọi sau khi kết thúc gửi/chuyển người. Các nút phản ánh đúng busy/trạng thái ca; lỗi chuyển người giữ thông báo lỗi và nháp, ca blocked vẫn khóa. Không thêm polling, request hoặc truy vấn database.

Hồi quy bổ sung: `chat_public_controls_ui.cjs` PASS cho mở nút ngay, giữ lỗi/nháp khi chuyển thất bại, thử lại và ca blocked; `chat_public_backoff_ui.cjs` PASS cho30/60/120 giây và dừng nền khi lỗi vĩnh viễn. `chat_public_history_widget.cjs` PASS cho phân trang/Unicode/response đến muộn khi đổi tài khoản; ảnh sinh ra bởi test được khôi phục đúng byte trước khi chạy. Đây là các test transport offline, tách khỏi kiểm tra localhost thật phía trên. Kiểm tra cú pháp JS và liên kết Markdown cũng đạt.

Lần harness guest đầu chờ `.fab-message-content` ở welcome nên timeout trước khi gửi câu hỏi; đã sửa chờ `.fab-chat-welcome`. Một probe phụ trả promise khi đóng context nên lỗi target closed; không tính probe này vào bộ28 tình huống.

## Giới hạn và dữ liệu thử

Guest nhận phản hồi nhân viên và CSAT sau khi đóng/mở widget để đọc lại; không dùng kết quả này để chứng minh độ trễ Realtime hoặc polling nền. Không sửa/xóa FAQ hay chính sách thật, không chạy benchmark model, không kiểm tra mọi quyền/tài khoản hoặc dữ liệu riêng thành viên. Các phiên hỏi đáp chẩn đoán được giữ như lịch sử thông thường; ca chuyển người của bộ cuối đã hoàn tất và đánh giá, không tác động ca khác.

Checklist được rút từ605 xuống103 dòng, còn một danh sách hiện hành. Lịch sử cũ lưu nguyên tại [bản trước khi lọc](../archive/checklist-before-cleanup-2026-10-31.md). Giữ toàn bộ A01–A19 và phạm vi công khai rộng cho guest; chỉ bỏ phần mô tả/nhật ký trùng, các trạng thái triển khai đã lỗi thời và checklist nguyên tắc lặp. Thay đổi checklist và sửa nút widget của lượt này đang local, chưa push.
