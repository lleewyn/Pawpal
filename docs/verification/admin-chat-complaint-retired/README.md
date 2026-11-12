# Bỏ tạo khiếu nại từ Chatbot Admin

- Bỏ mục “Tạo khiếu nại” trong menu ba chấm và xóa modal chuyển hội thoại thành phiếu, cùng toàn bộ bộ xử lý chọn giao dịch/gửi RPC.
- Bỏ nút tạo khiếu nại trong giao diện Chatbot của nhân viên. Chặn lời gọi mở form với nguồn hội thoại ở bộ mở form dùng chung.
- API chat cũ trả `410 COMPLAINTS_MODULE_REQUIRED`, không truy cập CSDL.
- Migration 232 đã áp dụng lên Supabase, thu hồi quyền gọi cả 2 phiên bản `create_chat_complaint` đối với `anon`, `authenticated`, `service_role`. Không xóa hội thoại hoặc phiếu cũ.
- Giữ form tạo phiếu trong mục Khiếu nại. Kiểm tra trước/sau migration xác nhận định nghĩa và quyền của các phiên bản `create_admin_complaint` không thay đổi.

Kiểm tra:

- `node scripts/test/admin_chat_complaint_retired_ui.cjs`: đạt; dùng HTML/CSS và mã gắn sự kiện thực, mở menu, xác nhận không còn nút/modal, giữ form Khiếu nại, chặn nguồn chat. Không ghi dữ liệu thật.
- `node --test scripts/test/chat_complaint_retired.test.cjs`: đạt; API cũ từ chối trước mọi truy cập CSDL.
- `node scripts/database/v1/apply_retire_chat_complaint.cjs --apply`: đạt; gọi trực tiếp hai hàm bằng vai trò authenticated bị từ chối với `42501`; API trung tâm giữ nguyên; không thay đổi dòng dữ liệu nghiệp vụ.
- Kiểm tra inbox cũ `admin_chat_inbox_ui.cjs` chưa chạy được trong harness: `PawpalChatbot` không được khởi tạo do thiếu quyền Admin đã xác minh. Kiểm tra riêng menu và sự kiện mới ở trên đã đạt.

Ảnh local: [Menu Chatbot đã bỏ tạo khiếu nại](chat-menu.png), [Form Khiếu nại giữ nguyên](complaints-create-kept.png). Chưa push hoặc triển khai mã giao diện/API.
