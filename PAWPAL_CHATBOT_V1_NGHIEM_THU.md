# Chatbot V1 — đang chuyển đổi

Ngày 22/10/2026. Chưa nghiệm thu toàn phân hệ; chưa áp migration 045 hoặc triển khai giao diện Chatbot mới lên Cloud/Vercel.

## Phần đọc đã chuyển trên bản phục hồi

- Migration 045: get_admin_chat_inbox trả danh sách theo trang, thứ tự updated_at/id ổn định, tối đa 100 phiên mỗi lần. Mỗi phiên lấy đúng một tin nhắn mới nhất, tránh giới hạn tổng tin nhắn làm một phiên nhiều tin che mất preview của phiên khác.
- Không lấy raw_content. Máy chủ kiểm tra phiên và quyền đọc hội thoại/tin nhắn; không cấp quyền anonymous.
- Số điện thoại từ customer_phone, email liên hệ từ customer.contact_email, giống loài qua pet_breed/pet_species; lịch qua appointment_item; khiếu nại dùng customer_id và subject.
- Điểm từ customer_point_balance; hạng từ customer_membership/membership_tier, bỏ công thức tự suy hạng theo ngưỡng điểm.
- Không chèn lời chào giả khi chưa có tin nhắn trong CSDL.
- Kiểm tra chat_inbox_v1.cjs đạt 8/8 phiên trên bản phục hồi: preview đúng tin cuối, không có raw_content, chặn người không có quyền, không lỗi REST/JavaScript trong lượt tải Trực chat. Đã xem ảnh giao diện.

## Còn phải hoàn thiện trước triển khai

- Thao tác tiếp nhận/trả AI, gửi tin, ghi chú, đóng/mở phiên, tạo phản ánh và các thao tác ảnh/kiểm duyệt còn mã legacy; phải chuyển sang giao dịch máy chủ và kiểm tra quyền, phiên bản, gửi lặp.
- Rà soát SLA theo sla_deadline thực; không dùng đồng hồ suy đoán hoặc thời hạn mặc định chưa chốt.
- Phân trang giao diện danh sách và lịch sử, xử lý lỗi, tên người gửi, giữ phiên đang chọn và Realtime.
- Sửa API Vercel của Trợ lý AI/lịch sử còn thiếu, xác thực và giới hạn dữ liệu ngữ cảnh.
- Kiểm tra từng modal và luồng lưu Quy định trên bản phục hồi; không tự áp chính sách bồi thường hoặc tự cấp điểm/voucher.
- Rà giao diện: bố cục hẹp đang chật, nhãn và trạng thái cần chuẩn hóa. Không coi việc tải được dữ liệu là hoàn tất giao diện.
- Đối soát/backup Cloud và kiểm tra Production chỉ sau khi các thao tác ghi hoàn tất.

Không sửa các thay đổi cổng khách đang được làm trong workspace. Email/SMS/Zalo là giả lập theo scope đã chốt; file/ảnh chưa có nơi lưu không được báo đã tải thành công.

## Tiếp tục thao tác Trực chat — bản phục hồi

- Migration 046 thêm act_admin_chat cho nhận phiên, trả AI, gửi tin và ghi chú. Xác định nhân viên từ auth.uid(), kiểm tra quyền và trạng thái tài khoản, khóa phiên cùng phiên bản updated_at.
- UUID yêu cầu chống gửi lặp; cùng yêu cầu khác nội dung bị từ chối. Phiên thuộc người khác không được tự nhận; chỉ người đã nhận mới gửi hoặc trả AI.
- Gửi tin lưu sender_account_id thật và nhật ký trong cùng giao dịch. Không chèn lời chào của nhân viên hoặc tin nhắn thành công giả trước khi CSDL xác nhận.
- Ghi chú chỉ sửa internal_note của hội thoại, không ghi đè customer.note. Ghi chú không được chèn thành tin nhắn công khai.
- Trình duyệt giữ bản nháp khi lỗi mạng và chặn nút gửi trong lúc đang lưu. Tệp chưa có nơi lưu nên nút đính kèm bị vô hiệu hóa.
- chat_operations_v1.cjs đã đạt: nhận phiên, gửi lại UUID, xung đột nội dung/phiên bản, gửi tin từ trình duyệt, danh tính người gửi, giữ bản nháp khi mất mạng, không ghi đè ghi chú khách, trả AI, từ chối nhận phiên của người khác và tải lại.
- Đã xem ảnh Trực chat sau lưu trên bản phục hồi. Giao diện hẹp vẫn cần chỉnh, chưa nghiệm thu toàn bộ UI hoặc các modal còn lại.

Chưa áp migration 045/046 lên Cloud. Chưa thu hồi toàn bộ quyền ghi chat trực tiếp vì backend chat và các thao tác quản trị khác còn cần chuyển đồng bộ; không coi lớp bảo vệ từng RPC là đã hoàn tất bảo mật toàn phân hệ.

## Hoàn tất hội thoại — bản phục hồi

- Migration 047 lưu trạng thái, người xử lý, thời điểm, lý do, tổng kết và thông báo hệ thống trong cùng giao dịch; chỉ nhân viên đang nhận phiên được hoàn tất.
- Kiểm tra phiên bản updated_at, chống lặp bằng UUID và nhật ký máy chủ. Không đóng giao diện hoặc chèn thông báo thành công trước khi CSDL xác nhận.
- Modal giữ nguyên hội thoại đích khi mở, giữ nội dung tổng kết khi lỗi mạng. Hội thoại đã hoàn tất được phân loại đúng sau tải lại.
- Tạm vô hiệu hóa mời đánh giá vì luồng biểu mẫu cũ chưa tương thích; không báo đã gửi biểu mẫu.
- chat_resolution_v1.cjs đạt: từ chối chưa nhận phiên, lưu từ trình duyệt, giữ nháp khi mất mạng, danh tính/thời điểm/kết quả, chống lặp và xung đột. Đã xem ảnh modal. chat_operations_v1.cjs chạy lại đạt.
- Migration 047 mới áp trên bản phục hồi, chưa lên Cloud hoặc Production. Các modal còn lại và bố cục Trực chat vẫn đang tiếp tục hoàn thiện.

## Tạo khiếu nại từ hội thoại — bản phục hồi

- Migration 048 dùng lại create_admin_complaint, kiểm tra quyền, khách hàng thật, nhân viên đang nhận phiên và phiên bản hội thoại; kiểm tra giao dịch thuộc đúng khách qua luồng Khiếu nại V1.
- Phiếu lưu mã hội thoại nguồn trong mô tả, không tuyên bố đã sao chép toàn bộ biên bản. Không chèn tin nhắn thành công giả hoặc tự thay đổi trạng thái hội thoại.
- Bỏ API chat-actions và token local dự phòng ở modal này. UUID ổn định khi thử lại, thay đổi nội dung dùng yêu cầu mới; lỗi giữ nguyên form.
- Gợi ý giao dịch gần nhất theo loại đơn/dịch vụ dùng popover thuần chữ. Có thể nhập UUID giao dịch khác; máy chủ kiểm tra quyền sở hữu. Chưa hỗ trợ tìm toàn bộ lịch sử giao dịch trong popover.
- Khách vãng lai chưa gắn hồ sơ không được tự tạo khách hoặc phiếu mang danh tính giả.
- chat_complaint_v1.cjs đạt trên bản phục hồi: chưa nhận phiên bị từ chối, giao dịch khác khách bị từ chối, lưu từ trình duyệt, giữ nháp khi lỗi mạng, liên kết nguồn, thử lại và xung đột. Đã xem ảnh modal.
- Chưa áp migration 048 lên Cloud; chưa nghiệm thu toàn bộ Chatbot.
