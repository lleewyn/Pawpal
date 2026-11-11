# Phạm vi chat vãng lai và thành viên — 11/11/2026

Đã áp dụng migration `229_chat_member_handoff.sql` trên Supabase. Khách vãng lai tiếp tục hỏi bot; chuyển sang nhân viên và gửi ảnh cần tài khoản khách hàng đang hoạt động, có mật khẩu, không bị khóa. Điều kiện này độc lập với hạng tích điểm.

## Dữ liệu Admin

- Đúng 2 hội thoại vãng lai đang chờ nhân viên được đưa về `bot_handling`, bỏ phân công và hạn tiếp nhận. Không ghi nhận giả là đã giải quyết.
- Không xóa hay sửa tin nhắn, ảnh, nội dung phản ánh hoặc dấu hiệu khẩn cấp. Không gửi thông báo/tin nhắn cho khách trong lượt chỉnh dữ liệu.
- Mục tất cả giữ lịch sử khách vãng lai; bộ lọc khẩn cấp và đang xử lý dành cho tài khoản đủ điều kiện tiếp nhận. CSDL chặn mọi đường đưa khách chưa đủ điều kiện vào trạng thái chờ/đang được nhân viên xử lý, kể cả gọi API trực tiếp và chuyển tự động do bot lặp.
- Bản sao trước thay đổi và SHA256 nằm ngoài webroot, trong thư mục backup riêng của hạ tầng.

## Mã ứng dụng đã sửa tại workspace

- Gateway đang hoạt động là `api/admin-chat.js`: kiểm tra quyền chuyển ca; khách yêu cầu nhân viên nhận hướng dẫn hoàn tất tài khoản, không được thông báo sai rằng đã chuyển ca.
- Widget giữ yêu cầu chuyển ca và bản nháp trong phiên tối đa 30 phút. Sau xác thực, nhận lại đúng hội thoại bằng cả tài khoản đã xác minh và bí mật phiên khách gốc; không dựa vào số điện thoại. Không tự gửi lại bản nháp.
- Chặn truy cập của phiên khách sau khi hội thoại đã thuộc thành viên. Đổi tài khoản hoặc đăng xuất xóa ý định chuyển ca; tạo đoạn chat mới hủy ý định cũ.
- Giao diện Admin vô hiệu hóa tiếp nhận cho tài khoản chưa kích hoạt. Có đường dẫn liên hệ hiện có nếu khách gặp khó khăn về kích hoạt hoặc thanh toán.
- CSDL và bộ lọc RPC đã áp dụng thật. Mã ứng dụng, migration và kiểm tra được đóng gói cùng thay đổi chat; trạng thái deploy cần được xác nhận riêng sau push.

## Kiểm chứng

- 13 kiểm tra CSDL trong savepoint rồi rollback: chặn chuyển thủ công và tiếp nhận trực tiếp, chặn chuyển rủi ro/lặp bot cho khách, kiểm tra nhận lại hội thoại và thử lại, từ chối sai phiên/sai tài khoản, từ chối ảnh khách, cho phép thành viên chuyển ca. Không lưu dữ liệu kiểm thử.
- Fingerprint xác nhận toàn bộ tin nhắn, liên kết ảnh và các hội thoại khác giữ nguyên sau lượt sửa dữ liệu.
- 29 kiểm tra offline về quyền sở hữu, phạm vi khách, gateway và stream đã qua; 2 lượt Chrome offline kiểm tra bản nháp, nhận lại hội thoại, không gửi trùng, đổi tài khoản và trạng thái nút.
- Xác minh live bằng Auth Admin thật và 3 trang bộ lọc, mỗi trang tối đa 10 dòng: 6 HTTP request, 25.679 byte nội dung phản hồi. Không tải ảnh, không gọi AI, không truy vấn Logs; không thêm polling.

Tài liệu này không khẳng định các phản ánh của 2 khách đã được xử lý xong. Lịch sử của họ vẫn còn để tra cứu.
