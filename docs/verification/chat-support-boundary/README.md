# Phạm vi chatbot phía khách hàng

- Chat để tư vấn và trao đổi với CSKH. Banner luôn có đường dẫn “Tạo yêu cầu hỗ trợ”. Khiếu nại và đề nghị bồi hoàn được hướng tới `/user#support-create`.
- Khách chưa đăng nhập được chuyển tới đăng nhập, giữ đường dẫn quay lại form Hỗ trợ.
- Nút “Chưa hữu ích, gặp CSKH” trên câu trả lời mới nhất sử dụng cơ chế chuyển nhân viên hiện có. Chỉ hiển thị đã chuyển sang chờ CSKH sau khi máy chủ xác nhận; không khẳng định nhân viên đã nhận ca ngay.
- Gateway hướng các nội dung khiếu nại/bồi hoàn tới Hỗ trợ bằng câu trả lời xác định, không gọi mô hình để quyết định bồi hoàn hoặc tạo ticket. Hợp đồng trả lời của mô hình cũng quy định phạm vi này.
- Giữ cơ chế đăng nhập/kích hoạt thành viên trước khi chat với nhân viên.

Kiểm tra đạt: `chat_support_boundary.test.cjs`, `chat_member_gate.test.cjs` (8 kiểm tra), `chat_public_controls_ui.cjs`, `chat_support_boundary_ui.cjs`. Bao gồm hướng dẫn từ gateway, không gọi thao tác tạo ticket/bồi hoàn, nút chuyển CSKH, giữ bản nháp khi lỗi, thông báo chờ đúng trạng thái, điều hướng tới form, màu/giao diện desktop/mobile.

Kiểm tra cũ `chat_public_automatic_handoff.cjs` dừng ở giả định chỉ có 1 RPC, trong khi gateway hiện có thêm các RPC đọc/quyền thành viên (thực tế 3). Các kiểm tra mới dùng phản hồi quyền thành viên đúng hợp đồng và đã đạt.

Ảnh: [Desktop](chat-support-desktop.png), [Mobile](chat-support-mobile.png), [Chuyển sang chờ CSKH](chat-handoff-mobile.png). Ảnh dựng bằng component thực và dữ liệu kiểm thử với API cô lập, không gửi tin nhắn hoặc tạo yêu cầu trên CSDL thật.

Chưa push hoặc triển khai.
