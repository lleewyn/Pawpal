# Giảm dữ liệu phục vụ bộ chọn và thông tin tóm tắt

Ngày kiểm tra: 13/11/2026. Migration 240 đã áp dụng lên Supabase.

- Admin lịch hẹn: bỏ tải toàn bộ khách, thú cưng và lịch sử cân nặng khi đọc một trang lịch. Cân nặng chỉ đọc cho bé trên trang và thời điểm biên bản. Giá trị cân tại biên bản được giữ trong kết quả cache của từng lịch.
- Bộ chọn khách/bé tìm bằng RPC, chờ ngừng gõ 250 ms, tối đa 15 kết quả. Danh sách khách kèm tối đa 100 bé; khi chọn khách, tìm lại bé theo đúng chủ, nên vẫn tìm được bé không nằm trong danh sách gợi ý ban đầu. Có cache theo phiên, từ khóa và chủ nuôi; lỗi tải không dùng dữ liệu giả.
- Hỗ trợ User: mở form không tải lịch sử; tìm giao dịch bằng metadata, tối đa 15 kết quả. Liên kết từ đơn/lịch đọc đúng giao dịch được chỉ định.
- Đổi trả User: đọc đúng một đơn và chỉ nhận số tiền của đơn đó; hàm tổng hợp tài chính hiện có vẫn là nguồn đối soát.
- Hồ sơ bé: CSDL chọn tối đa ba lịch (gần nhất, tắm gần nhất, cắt tỉa gần nhất), thay vì gửi toàn bộ lịch sử kèm thanh toán xuống trình duyệt.
- Chatbot: ba luồng điểm dùng `customer_point_balance` thay vì tải các giao dịch điểm để cộng lại. Lỗi đọc số dư không được coi là số dư bằng không.
- Tra cứu vãng lai: giữ giới hạn 50 đơn và 50 lịch hiện có; mỗi sản phẩm chỉ nhận một ảnh, ưu tiên ảnh đại diện. Đợt này chưa chuyển lịch sử vãng lai sang phân trang.

Kiểm chứng:

- `context_read_budget_cloud.cjs`: biên dịch RPC, giới hạn kết quả, tìm đơn cũ trong 23 đơn, cách ly chủ sở hữu cả metadata và tài chính, từ chối staff/anonymous; dữ liệu kiểm thử rollback.
- `support_context_budget_ui.cjs`: form thật, không đọc lịch sử khi mở, tìm kiếm sau khi ngừng gõ, chọn ID, ngừng đọc khi đóng.
- `service_booking_create_regressions_ui.cjs`: form thật, chọn khách/bé và điền số điện thoại, cân nặng, chọn dịch vụ, luồng Taxi/Spa và kiểm tra giá; transport giả lập, ảnh giao diện đã kiểm tra.
- Các bài kiểm tra API lịch sử, tra cứu OTP/đổi trả vãng lai, hàng đợi đọc Supabase, cập nhật tab đang mở và cách ly tài khoản trong chi tiết đơn đều đạt.

Không truy vấn Logs hạ tầng. Chưa đo lưu lượng thực tế toàn bộ production; các giới hạn trên là giới hạn phản hồi đã kiểm tra, không phải cam kết không bao giờ chạm hạn mức Free.
