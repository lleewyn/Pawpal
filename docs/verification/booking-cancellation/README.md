# Lý do hủy lịch

Modal hủy lịch dùng chung cho danh sách lịch hẹn và chi tiết lịch hẹn của khách hàng có 5 radio chọn một theo yêu cầu. Chỉ “Lý do cá nhân khác” mở textarea, bắt buộc nhập khi chọn mục này. Chọn lý do có sẵn gửi nguyên nội dung lựa chọn qua luồng RPC hủy lịch hiện có. Nút xác nhận xanh rừng `#236B48`, bo góc 9px.

- `node scripts/test/booking_cancellation_reasons_ui.cjs`: đạt kiểm tra 5 lựa chọn, chọn một, điều kiện hiện/ẩn textarea, chặn thiếu lý do, nội dung chuyển cho thao tác lưu, màu nút, Escape và giữ lịch. Chụp giao diện thực với dữ liệu kiểm thử và bộ lưu cô lập; không ghi CSDL.
- `node --test scripts/test/customer_booking_cancel.test.mjs`: 4 kiểm tra đạt về RPC có kiểm tra phiên bản, mã yêu cầu ổn định, lỗi lưu, trạng thái không được hủy.
- Kiểm tra cũ `user_booking_detail_actor_ui.cjs` chưa đạt: bộ giả lập CSDL thiếu `db.from` ở phần đánh giá dịch vụ nên chờ `#serviceReviewSection` hết thời gian. Modal trong thay đổi này được kiểm tra riêng bằng bài kiểm tra phía trên.

Ảnh: [Desktop](reasons-other-desktop.png), [Mobile nhập lý do khác](reasons-other-mobile.png), [Mobile chọn lý do](reasons-mobile.png).

Chưa push hoặc triển khai.
