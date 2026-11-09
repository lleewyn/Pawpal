# Giai đoạn 5 — Ảnh bàn giao của quản lý

Cập nhật 08/11/2026: đã triển khai ảnh riêng tư trong modal bàn giao của quản lý, bộ đọc hồ sơ và migration 194. Kiểm thử kỹ thuật đạt; chưa nghiệm thu upload và lưu một biên bản bàn giao nghiệp vụ thật trên Vercel. Modal STAFF đã mở rộng ở [báo cáo riêng](PAWPAL_GIAI_DOAN_5_ANH_BAN_GIAO_NHAN_VIEN.md); phụ phí còn trong kế hoạch.

## Chức năng

- Chọn ảnh, xem trước, gỡ nháp; ảnh đã lưu chỉ đọc và giữ làm bằng chứng với legal hold. Tối đa 10 ảnh trong bộ chọn, 3 MiB/ảnh, quota chung 100 MiB; video vẫn tắt.
- Session ràng buộc đúng ca, UUID biên bản và mục đích `handover_image`. Không dùng ảnh tiếp nhận hoặc ảnh biên bản khác để hoàn tất ca.
- Lưu ảnh cùng giao dịch lưu biên bản: ảnh không hợp lệ khiến chuyển trạng thái hoàn tất bị rollback. Các điều kiện chất lượng, trả tư trang và khách xác nhận vẫn bắt buộc; bàn giao không tự ghi khoản thanh toán.
- Retry giữ UUID biên bản và asset, không upload trùng. Đóng/Hủy trong lúc upload không gọi tiếp lệnh hoàn tất ca; chỉ gỡ ảnh nháp.
- Bộ đọc hồ sơ giữ tách biệt ảnh tiếp nhận và ảnh bàn giao. Ảnh bàn giao đã lưu hiện trong hồ sơ ca và mở xem bằng bộ xem ảnh hiện có.
- API luôn kiểm tra quyền: Admin, nhân viên còn được phân công và đúng chủ nuôi; ảnh bàn giao không được công khai.

## Kiểm chứng

- 29/29 bài `npm run test:media` đạt.
- [SQL riêng](phase5-handover-database.txt): RPC lưu bàn giao thật dưới role STAFF, sai UUID/ảnh tiếp nhận bị chặn, thiếu xác nhận bị chặn, lỗi ảnh rollback hoàn tất, retry không trùng, hoàn tất không tạo payment, giữ legal hold, chủ nuôi và thu hồi quyền. Các fixture và trạng thái ca đều rollback; rollback migration và áp dụng lại đạt.
- [Kiểm thử giao diện riêng và Preview](phase5-handover-ui-acceptance.txt): harness dùng HTML và handler modal thật, dữ liệu/endpoint mô phỏng chỉ nằm trong script kiểm thử, không nạp vào ứng dụng hoặc artifact Vercel.
- Giao diện: thiếu xác nhận không bắt đầu upload; hai lần lưu lỗi chỉ upload một lần và giữ UUID/asset; bằng chứng cũ không có nút xóa và không bị gửi lại; Hủy giữa upload không gọi hoàn tất ca. Endpoint mô phỏng trả thành công thì modal đóng.
- [Desktop](handover-media-desktop.png) và [điện thoại](handover-media-mobile.png) đã kiểm tra; không tràn modal/trang. Ảnh và số liệu trong hình thuộc môi trường kiểm thử riêng.
- Preview quản lý đã mở bằng phiên Admin thật: đọc metadata bàn giao thành công, prepare cho ca chưa chạy bị từ chối 400. Không gửi lệnh ghi biên bản hoặc hoàn tất ca; không upload file thử lên Atlas trong lượt này. Bản đó đã được thay bằng [Preview có modal STAFF](https://pawpalgr3-v9rsx5g8j-llwyns-projects.vercel.app/admin#tab-service-bookings).

## Môi trường và phần còn lại

- Migration 194 đã áp dụng lên Supabase Cloud sau kiểm thử và kiểm tra định nghĩa trước thay đổi. Không tạo biên bản nghiệp vụ hoặc thay trạng thái ca để thử ảnh; không thay deployment/env Production, không push.
- Preview upload bật theo phạm vi đã được chọn; quota và giới hạn cũ giữ nguyên. Automation bypass tạm đã thu hồi; server kiểm thử riêng đã dừng.
- [ ] Nghiệm thu upload, lưu và tải lại một biên bản bàn giao thật có ảnh trên Preview khi có ca đủ điều kiện.
- [ ] Đăng nhập STAFF/chủ nuôi thật theo kế hoạch phát hành; kiểm thử SQL theo role không thay thế đăng nhập thực tế.
- [x] Mở rộng riêng modal bàn giao STAFF, kiểm thử giao diện riêng đạt; đăng nhập thực tế vẫn còn.
- [ ] Ảnh phụ phí.
