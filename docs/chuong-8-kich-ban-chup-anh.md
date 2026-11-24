# Kịch bản chụp ảnh minh chứng Chương 8

Chạy các lượt thử trên bản PawPal triển khai tại Vercel, ở bố cục máy tính. Với Chatbot công khai, mở website trong phiên khách, đóng thông báo trang nếu xuất hiện, mở khung PawPal AI và mở rộng khung chat. Mỗi câu hỏi dùng một đoạn chat mới. Với Copilot, đăng nhập đúng vai trò, mở mục Chatbot rồi chọn **Trợ lý AI** (quản lý) hoặc **Trợ lý** (nhân viên). Chờ phản hồi hoàn tất rồi chụp vùng có câu hỏi và kết quả. Nếu câu trả lời dài, kiểm tra cả đầu và cuối khung trước khi chụp.

## Chatbot công khai

**Hình 8.5 — Giờ mở cửa.** Nhập “PawPal mở cửa mấy giờ?”. Chụp câu hỏi và phần phản hồi có giờ ngày thường, cuối tuần. Đối chiếu giờ theo nội dung Chatbot trả về tại thời điểm chụp.

**Hình 8.9 — Giá tắm theo cân nặng.** Nhập “Giá tắm cho chó 7 kg?”. Chụp câu hỏi, các gói hệ thống trả về và lưu ý ở cuối về điều kiện nhận loài. Trong ảnh của báo cáo, chiều cao khung xem được tăng lên khi chụp để thấy trọn phản hồi. Ghi nhận giá hiển thị của gói cơ bản để đối chiếu với phần thuyết minh.

**Hình 8.10 — Tra đơn khi chưa đăng nhập.** Xác nhận phiên trình duyệt chưa đăng nhập, rồi nhập “Đơn hàng của tôi hôm qua đã giao chưa?”. Chụp câu hỏi và hướng dẫn đăng nhập. Dấu hiệu đạt là phản hồi chỉ hướng dẫn xác thực, không hiển thị mã đơn hoặc trạng thái riêng của khách.

**Hình 8.11 — Phản hồi khi chủ nuôi bổ sung dấu hiệu sức khỏe.** Trong môi trường cục bộ, nhập “Bé cún mệt mỏi và biếng ăn sau khi tắm.”. Khi Chatbot trả lời xong, gửi tiếp “Bé vừa nôn một lần.” trong cùng đoạn chat. Chụp cả hai lượt trao đổi. Kiểm tra phản hồi thứ hai ghi nhận đúng một lần nôn và hướng dẫn bổ sung thời điểm bé nôn cho bác sĩ thú y.

## Copilot trong cổng quản trị

**Hình 8.7 — Số lịch Spa chờ phục vụ.** Với vai trò quản lý, mở đoạn chat mới và nhập “Hôm nay bao nhiêu lịch Spa chờ phục vụ?”. Chụp câu hỏi, ngày áp dụng, trạng thái đã lọc, số lịch và liên kết **Mở lịch hẹn**. Số 0 là kết quả hợp lệ nếu phản hồi xác nhận truy vấn thành công.

**Hình 8.12 — Hồ sơ khách hàng 360°.** Với vai trò quản lý, nhập “Xem hồ sơ khách hàng 360° theo số điện thoại: 0901234567”. Chờ Copilot trả hồ sơ kiểm thử Lê Lệ Quyên QA cùng hai phần **Thú cưng trong hồ sơ** và **Đơn được tạo mới nhất**. Chụp đầy đủ câu hỏi, tên và mã khách, hai hồ sơ thú cưng, mã đơn cùng thời điểm đọc từng nguồn.

**Hình 8.13 — SKU dưới mức tối thiểu.** Với tài khoản nhân viên có quyền đọc kho, mở phiên mới rồi nhập “Có bao nhiêu SKU dưới ngưỡng?”. Chụp danh sách có mã SKU, tồn hiện tại, mức tối thiểu và thông tin phân trang. Nếu phản hồi chỉ đếm kết quả trên trang hiện tại, ghi rõ phạm vi này trong báo cáo.

**Hình 8.14 — Giới hạn xem thực thu.** Giữ vai trò nhân viên và mở phiên mới. Nhập “Thực thu hôm nay bao nhiêu?”. Chụp câu hỏi còn trong ô nhập và thông báo thiếu quyền. Kiểm tra riêng mã HTTP của yêu cầu gửi câu hỏi nếu báo cáo cần nêu mã phản hồi.
