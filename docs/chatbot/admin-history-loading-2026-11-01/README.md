# Trạng thái tải khi vừa mở Trợ lý Admin — 01/11/2026

Ảnh người dùng phản ánh bước tải ban đầu của tab, khác trạng thái gửi câu hỏi đã sửa trước. HTML cũ hiện sẵn một lời chào và các khả năng chưa được đối chiếu; controller chờ danh sách phiên/lịch sử rồi mới thay nội dung, nên không thể hiện đang tải.

Đã thay lời chào tĩnh bằng trạng thái tải ngay trong HTML, trước cả khi script khởi tạo. Danh sách trái báo đang tải phiên; khung phải có nhãn **Đang tải lịch sử trò chuyện…**, dấu chờ động và lời nhắn ngắn. Nút tải lại có trạng thái bận, không cho bấm lặp trong lúc tải.

Chỉ chuyển sang phiên trống sau khi API xác nhận lịch sử rỗng. Lỗi có lời báo và nút thử lại; dữ liệu cũ đã tải vẫn được giữ khi làm mới gặp lỗi. Tạo phiên/gửi câu hỏi mới vô hiệu hóa phản hồi tải cũ; lỗi về muộn không ghi đè cuộc trò chuyện mới. Việc tải lại khi request cũ còn chạy dùng cache/inflight hiện có, không thêm request và không kẹt trạng thái tải.

## Kiểm tra

- [Sáu kiểm tra transport kiểm soát](controlled-results.txt): HTML/GET danh sách đang chờ, GET tin nhắn đang chờ, dữ liệu đã xác nhận, tải lại chồng lượt không tăng request,503 và thử lại, lỗi tải cũ về muộn sau câu trả lời mới.
- Hồi quy chat_copilot_initial_load_race.cjs và chat_history_pages_ui.cjs đạt: lịch sử chậm không đè câu mới;35 tin tải đúng các trang, không lặp/mất.
- [Browser localhost thật](local-real-results.txt): giữ GET tại browser để quan sát trạng thái tải. Cả hai vùng aria-busy=true, nút tải lại bị khóa, không có lời chào/phiên trống giả. Sau đó2 GET thật200, trạng thái tải và lỗi đều không còn. Chỉ đọc lịch sử bằng phiên Admin hiện có, không tạo câu hỏi, không gọi model và không xuất nội dung riêng.
- Đã xem ảnh initial-loading.png từ ca kiểm soát, không chứa lịch sử khách thật.

Không thêm lượt đọc nền hoặc thời gian chờ nhân tạo trong runtime. Code và tài liệu còn local; chưa push. Cần tải lại tab localhost đang mở để nạp controller/HTML mới.
