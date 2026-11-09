# Giai đoạn 5 — Ảnh biên bản tiếp nhận

Cập nhật 08/11/2026: đã triển khai modal tiếp nhận của quản lý, migration và bộ đọc ảnh riêng tư. Kiểm thử kỹ thuật đạt; chưa nghiệm thu một biên bản tiếp nhận nghiệp vụ thật được lưu trên Preview. Modal STAFF được mở rộng ở [báo cáo tiếp theo](PAWPAL_GIAI_DOAN_5_ANH_TIEP_NHAN_NHAN_VIEN.md); bàn giao và phụ phí còn trong kế hoạch.

## Thay đổi

- Thay ảnh Blob chỉ dùng để xem trước bằng upload GridFS và tham chiếu Supabase. Ảnh tiếp nhận là bằng chứng riêng tư nên chỉ upload, theo kế hoạch chung; tối đa 10 ảnh trong bộ chọn, mỗi ảnh 3 MiB, quota chung 100 MiB.
- Migration 193 bổ sung `appointment_record_media` và session gắn đúng ca, đúng UUID biên bản. Tham chiếu được ghi trong cùng giao dịch `save_admin_service_record`; ảnh sai phạm vi làm rollback cả thay đổi trạng thái ca và lịch sử cân nặng.
- Ảnh đã gắn được giữ làm bằng chứng với `legal_hold`; người dùng không được xóa trực tiếp tham chiếu. Chỉ ảnh nháp có nút xóa. Khi lập phiên bản biên bản tiếp theo, bộ đọc vẫn hiển thị bằng chứng của các phiên bản trước.
- API không công khai ảnh tiếp nhận. Admin, nhân viên còn được phân công đúng ca và đúng chủ nuôi được kiểm tra quyền phía máy chủ; anon, chủ nuôi khác và nhân viên bị thu hồi phân công bị chặn.
- Hủy modal trong lúc upload ngăn ghi tiếp biên bản. Retry giữ UUID biên bản và asset đã xác minh, kể cả khi lần ghi trước thành công nhưng tải lại giao diện lỗi.
- Chỉ bật upload trên Preview, video vẫn tắt. Không đổi deployment/env Production, không push.

## Bằng chứng kiểm thử

- `npm run test:media`: 28/28 đạt. Có hồi quy riêng cho định danh biên bản và retry sau lỗi tải lại giao diện.
- [SQL trong database riêng](phase5-intake-database.txt): chạy RPC lưu biên bản thật dưới role STAFF, kiểm tra idempotency, legal hold, chủ nuôi, thu hồi phân công, sai UUID biên bản, rollback trạng thái và cân nặng khi ảnh không hợp lệ. Toàn bộ fixture và chuyển trạng thái rollback; kiểm tra rollback migration và áp dụng lại đạt.
- [Preview với phiên Admin thật](phase5-intake-preview-acceptance.txt): upload 201, đọc có bearer 200 và đúng số byte, không bearer 404, `Cache-Control: private, no-store`. Retry không upload thêm và giữ UUID/asset.
- Trong kiểm thử Preview, trình duyệt chặn RPC ghi biên bản và trả lỗi có kiểm soát. Các lựa chọn biểu mẫu chỉ phục vụ kiểm thử giao diện; không gửi quan sát hoặc xác nhận tiếp nhận giả vào Supabase. Kết quả này không được tính là đã lưu biên bản nghiệp vụ thật.
- Đã xem [desktop](intake-media-desktop.png) và [điện thoại](intake-media-mobile.png), kiểm tra xem trước ảnh và không tràn modal/trang. Ảnh trong hình là bản nháp minh họa kiểm thử, không phải bằng chứng của một lần tiếp nhận thật.

## Trạng thái sau thử

- [Đối chiếu Cloud](phase5-intake-final-verify.txt): trạng thái và thời điểm cập nhật các ca không đổi, số biên bản không đổi, số lượng/nội dung lịch sử cân nặng không đổi; không tạo bản ghi `appointment_record_media` nghiệp vụ.
- [Dọn file thử](phase5-intake-cleanup.txt): xóa đúng file/chunks đã ghi nhận, trả 196.843 byte quota giữ chỗ. Không đụng file khác, không gỡ legal hold của bằng chứng thật. Cuối cùng 0 asset/session đang hoạt động, 0 byte giữ chỗ.
- Preview đã được thay bằng [bản có modal STAFF](https://pawpalgr3-4synmwuea-llwyns-projects.vercel.app/admin#tab-service-bookings). Đã dọn Preview trung gian, deployment cleanup và thu hồi automation bypass. Preview có thể yêu cầu đăng nhập Vercel.

## Còn nghiệm thu

- [ ] Người vận hành ghi nhận một lần tiếp nhận thật có ảnh trên Preview: lưu thành công, tải lại hồ sơ và kiểm tra ảnh đã gắn.
- [ ] Kiểm tra đăng nhập STAFF/chủ nuôi thật theo giai đoạn 7; kết quả SQL theo role không thay thế bằng chứng đăng nhập thực tế.
- [x] Mở rộng riêng modal tiếp nhận STAFF, kiểm thử giao diện riêng đạt; đăng nhập STAFF thật vẫn còn.
- [ ] Ảnh bàn giao và ảnh phụ phí; không sửa gộp các modal.
