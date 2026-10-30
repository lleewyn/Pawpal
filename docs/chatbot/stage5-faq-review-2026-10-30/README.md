# G5.2 — Rà nội dung FAQ công khai

Ngày30/10/2026. Đã đọc có giới hạn92 FAQ từ database baseline local bằng giao dịch READ ONLY, timeout5 giây, cap200 dòng. Không đọc Supabase Cloud hoặc Logs. [Snapshot](public-faq-local-snapshot.txt) là bằng chứng nội dung công khai tại local, không dùng làm dữ liệu runtime hoặc fallback.

## Kết quả rà và sửa

[19 thay đổi đã đối chiếu nguồn](reviewed-changes.txt), migration157 và rollback:

- 15 câu được sửa nội dung: đặt lịch/mua hàng guest không bắt buộc thành viên; một bé/gói chính/phần thêm; OTP phụ thuộc cấu hình; giới hạn tra cứu đơn/điểm; bỏ lời hứa tra lịch/phòng/chi nhánh/ưu đãi khi chưa có công cụ hoặc nguồn xác nhận.
- Tắt1 FAQ QA đang bật, giữ bản ghi để rollback.
- Thêm3 hướng dẫn từ UI/nghiệp vụ hiện có: khách vãng lai mua hàng, phí/phạm vi giao nhận được xác nhận ở đâu, gửi yêu cầu đổi trả. Không tự tạo thời hạn/chi phí hay điều kiện chấp thuận đổi trả.
- Giữ2 sửa booking/Hotel đã chuẩn bị ở150/152. Phát hiện file CRLF trên Windows làm hằng chuỗi cũ khác dữ liệu LF; đã chuẩn hóa hằng previous của150/152 ở cả forward/rollback. Không bỏ guard nội dung hoặc sửa lại mẫu model lịch sử.
- Tìm kiếm155 ưu tiên FAQ trùng nguyên văn trước xếp hạng từ khóa. Bằng chứng dữ liệu thật phát hiện câu trùng có thể bị các mục liên quan đẩy khỏi5 kết quả; đã sửa và kiểm tra18 câu active được sửa/thêm đều truy xuất được câu trả lời đã rà.
- Mẫu yêu cầu nhân viên được bổ sung đúng câu FAQ “Tôi muốn nói chuyện trực tiếp với nhân viên”; tránh chỉ hứa chuyển trong nội dung FAQ mà không chuyển trạng thái.

Các câu còn lại không tự thay bằng số liệu/địa chỉ/giờ/chính sách chưa có nguồn. Rà nội dung này không đồng nghĩa đã xác minh thực tế hoạt động cửa hàng. FAQ trả lời có điều kiện vẫn phải được kiểm tra khi quyết định nghiệp vụ; AI không được lấy hội thoại làm chứng nhận đã xác minh.

## Kiểm chứng

[local-results.txt](local-results.txt): **7 nhóm SQL/Auth/JWT/REST thật đạt**:

1. 19 thay đổi chính xác, chạy lại không đổi kết quả.
2. 18 câu active sửa/thêm được tìm thấy qua RPC công khai có giới hạn.
3. QA bị loại khỏi truy xuất, không xóa bản ghi.
4. Apply/rollback từ chối ghi đè answer đã sửa độc lập.
5. Rollback giữ mục mới nếu metadata đã được người khác chỉnh.
6. Rollback khôi phục đúng bản ghi/cờ/nội dung ban đầu trừ updated_at; chạy lại và reapply đạt.
7. File CRLF150/152/157 áp dụng/rollback được trên dữ liệu LF thực tế, vẫn giữ guard sửa độc lập.

Ngoài ra chạy lại17 nhóm tích hợp tìm kiếm/catalog/chuyển nhân viên của giai đoạn5 sau thay đổi155; hồi quy offline259 kiểm tra và40 ca nghiệp vụ. Không gọi Gemini; đây không phải kết quả đánh giá model. Môi trường thử được dọn theo marker; xem [local-environment.txt](local-environment.txt).

## Thông tin còn thiếu nguồn kinh doanh

Chưa có địa chỉ/tên chi nhánh, lịch mở cửa theo ngày/chi nhánh, thời hạn/phí/điều kiện duyệt đổi trả hoặc danh sách ưu đãi đang hiệu lực được xác nhận trong phạm vi FAQ đã đọc. Không tự sao chép thông tin minh họa thành chính sách. FAQ đã sửa hướng người dùng đến bước xác nhận/màn hình phù hợp hoặc nhân viên, nói rõ phần chưa biết. Các dữ kiện này cần được nhập và duyệt theo nguồn vận hành thật trước khi chatbot có thể trả cụ thể.

## Phát hành

Chưa push hoặc áp Cloud. Áp150/152 (nếu thuộc bản phát hành),143/155/156 rồi157 cùng API tương thích.157 so khớp id, câu hỏi, answer và trạng thái baseline; bản ghi thiếu/trùng/bị sửa làm dừng transaction, không tự chèn thay bản ghi cũ hay bật lại mục bị tắt. Chỉ3 câu mới được chèn theo id cố định; chạy lại không nhân bản.

Rollback riêng157 trước khi rollback150/152. Nếu gỡ cả155/156 thì đưa API về bản trước, gỡ156 trước155 do phụ thuộc helper. Không dùng DROP CASCADE. Không coi bản baseline local là đã đối chiếu Production.
