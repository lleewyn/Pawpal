# Giai đoạn 5 — Ảnh khiếu nại và hoàn trả

## Phần đã triển khai

- Migration `198_private_evidence_media.sql` đã áp dụng Cloud sau kiểm thử trong cơ sở dữ liệu riêng. Không tạo phiếu, đơn hàng hoặc tài khoản giả trên Cloud.
- Ảnh MongoDB gắn với UUID tin nhắn và phiếu khiếu nại, hoặc UUID yêu cầu hoàn trả và đơn hàng. Metadata và khóa ngoại nằm trong Supabase.
- Tạo phiếu, phản hồi của khách, trao đổi của Admin/STAFF và yêu cầu hoàn trả lưu ảnh cùng giao dịch nghiệp vụ. Ảnh sai quyền/sai đối tượng làm rollback cả giao dịch.
- Tối đa 5 ảnh cho một tin nhắn hoặc yêu cầu hoàn trả, 3 MiB/ảnh; JPEG, PNG, WebP. Chưa bật video.
- Bằng chứng gắn `legal_hold`; không tự xóa khi hết hạn nháp. Bộ dọn file kiểm tra cả hai bảng tham chiếu mới.
- Chủ phiếu/chủ đơn xem được ảnh của mình. STAFF chỉ được xem khi còn được giao phiếu và có quyền xử lý. Ghi chú nội bộ và metadata của ảnh nội bộ bị chặn với khách.
- Giao diện giữ mã yêu cầu và asset khi gửi lỗi; không tải lại ảnh đã xác minh. STAFF có thể mở lại lần gửi chưa rõ kết quả để thử lại đúng payload.
- Bộ đọc dùng bearer và blob tạm cho ảnh riêng tư, giải phóng URL khi đổi phiếu/đóng giao diện. Link cũ được giữ làm nguồn độc lập, không ghi đè hàng loạt.

## Bằng chứng kiểm thử

- [Kiểm thử SQL](phase5-evidence-database.txt): tạo/claim/finalize bằng chủ nuôi; rollback phiếu khi ảnh sai; retry không trùng; quyền chủ sở hữu; chặn người khác và anonymous; ẩn nội bộ; STAFF thật ở tầng SQL và thu hồi phân công; hoàn trả không giữ số lượng khi ảnh sai; rollback/reapply migration.
- [Áp dụng Cloud](phase5-evidence-cloud.txt): có checksum migration, không ghi fixture nghiệp vụ.
- Giao diện riêng dùng chính mã ứng dụng: hoàn trả, Admin trao đổi, khách tạo phiếu, khách phản hồi, STAFF trao đổi. Hai lần gửi lỗi chỉ một upload, UUID/payload không đổi; thành công được xác nhận trước khi xóa nháp.
- Đã xem ảnh chụp desktop/mobile cho hoàn trả, Admin trao đổi, khách tạo phiếu và khách phản hồi; không tràn ngang. Các file `*-evidence-desktop.png` và `*-evidence-mobile.png` nằm cùng thư mục.
- `npm run test:media`: 33/33 đạt tại checkpoint này.

## Chưa nghiệm thu xong

- Preview tổng hợp đã tạo và đã đăng nhập Admin thật. Upload/đọc/hủy nháp khiếu nại trên Vercel đạt; chưa ghi phiếu nghiệp vụ giả để thử giao dịch lưu. Xem [bằng chứng API](phase5-live-private-preview.txt).
- Chưa đăng nhập STAFF/chủ nuôi thật để nghiệm thu upload, đọc lại và thu hồi quyền trên Preview.
- Bộ đọc ảnh hoàn trả ở chi tiết khách/Admin đã kiểm tra riêng bằng mã thật, ảnh tải qua bearer và không tràn ngang trên điện thoại; còn nghiệm thu Preview với phiếu thực tế.
- Chưa có kiểm thử nghiệp vụ thật trên Cloud cho việc tạo khiếu nại/hoàn trả. Không tự ghi phản ánh, điều kiện hàng hóa hoặc quyết định hoàn tiền giả.
- Chưa thay deployment hay biến môi trường Production, chưa push.

## Rollback

`198_private_evidence_media.rollback.sql` chỉ dùng khi không có session `ticket_image`/`return_image`. Script kiểm tra điều kiện trước khi gỡ cấu trúc và khôi phục định nghĩa hàm, CHECK và ACL trước thay đổi. Khi đã có bằng chứng thật, cần kế hoạch bảo toàn dữ liệu riêng; không chạy rollback cấu trúc trực tiếp.
