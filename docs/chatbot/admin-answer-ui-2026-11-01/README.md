# Câu trả lời hiện dần, trạng thái tải và văn phong Admin — 01/11/2026

Hàm typewriteText cũ chỉ gán toàn bộ innerHTML một lần nên không có hiệu ứng hiện dần. Trạng thái chờ cũ là một dòng chữ nhẹ; Hotel lặp trạng thái ở từng phòng và lịch trực rỗng vẫn hiện0 kết quả/Trang1/1.

Đã chỉnh:

- Trước khi API trả về: nhãn **Đang tra cứu dữ liệu…** với dấu chờ động, lời nhắn ngắn “Mình đang kiểm tra thông tin bạn cần. Bạn chờ một chút nhé.”; nút gửi đổi trạng thái và bị khóa trong lúc xử lý.
- Sau khi có phản hồi được xác nhận: hiện dần nội dung trong0,6–2,4giây, giữ nguyên DOM Markdown để không lóe dấu sao/bảng dang dở. Nút chuyển sang **Đang trả lời** rồi trở lại bình thường. Tab ẩn hoặc người dùng chọn giảm chuyển động thì hiện đầy đủ ngay.
- Đây là hiệu ứng hiển thị dần ở frontend sau khi backend tra cứu/kiểm tra/lưu thành công. **Chưa thêm SSE cho Admin hoặc streaming token Gemini trong lượt này**. Không gọi model để viết lại số liệu và không phát sinh request theo từng chữ.
- Hotel: tóm tắt số phòng có thể nhận, bảng phòng/loại/sức chứa; chỉ thêm cột trạng thái khi có phòng bị chặn. Giữ cảnh báo chưa giữ phòng, không nhầm sức chứa với số phòng; giữ khoảng giờ kiểm tra và phân trang nếu nhiều trang.
- Lịch trực rỗng: nói chưa tìm thấy lịch phù hợp trong phạm vi được xem và gợi ý đổi ngày/mở Lịch làm việc; không kết luận mọi người đều nghỉ. BỏTrang1/1, giữ thời gian cập nhật.
- Các kết quả nhóm mở rộng có tiêu đề, lời dẫn tự nhiên hơn và mục lưu ý; không đổi facts/nguồn/quyền hoặc công thức tính. Bong bóng bo9px, khoảng dòng thoáng hơn, bảng không có viền khung lồng, thời gian cập nhật nhỏ hơn.

## Kiểm chứng

- **217/217 test Node đạt**: gồm193 test nghiệp vụ cũ,20 test Auth/ngân sách đọc và4 test trình bày mới. Vẫn từ chối số phòng sai tổng hoặc cờ khả dụng mâu thuẫn.
- [Transport kiểm soát](controlled-results.txt): độ dài chữ tăng từ1 lên112 sau220ms, giữ bảng9 dòng, không lộ dấu Markdown, không tràn viewport390px; chế độ giảm chuyển động bỏ hiệu ứng. Dữ liệu QA minh họa, không đọc Supabase/Gemini.
- [UI/API localhost thật](local-real-results.txt): Hotel và lịch trực, đều200; nhãn tải nhìn thấy, chữ tăng lần lượt1→80 và0→50 trong160ms. Hotel9 dòng bảng, lịch trực0; khôngTrang1/1, chỉ một câu hỏi. Mỗi câu1 nguồn, payload1434/382byte; không xuất tên/mã riêng vào báo cáo, không gọi Gemini.
- Test trạng thái chờ/503/gửi lại, lịch sử về chậm và phân trang35 tin của đợt trước cũng chạy đạt với renderer mới.
- Đã xem ảnh loading-desktop.png, hotel-table-desktop.png, staff-empty-desktop.png; ảnh mobile được sinh từ fixture công khai. Không chụp dữ liệu nghiệp vụ thật trong đợt này.

Đã chạy lại server local để nạp formatter mới. Code và báo cáo còn local, chưa push. Định dạng server mới áp dụng cho câu trả lời mới; không viết lại lịch sử đã lưu. Nghiệm thu Vercel003d5e85 trước đó không chứng minh các thay đổi UI mới đã được phát hành.
