# Giai đoạn 5 — Ảnh tiếp nhận của nhân viên

Cập nhật 08/11/2026: đã nối bộ ảnh riêng tư vào modal `staffIntakeModal`. Không thêm migration hoặc đổi cơ chế phân quyền; dùng nền tảng biên bản ở migration 193.

## Chức năng

- Nhân viên chọn và xem trước ảnh, gỡ ảnh nháp, xem bằng chứng đã lưu dưới dạng chỉ đọc. Giới hạn chung 10 ảnh trong bộ chọn, 3 MiB mỗi ảnh, quota 100 MiB; video vẫn tắt.
- UUID biên bản được tạo khi mở modal, dùng chung cho session upload và RPC lưu. Lỗi lưu rồi thử lại giữ cùng mã biên bản và asset, tránh tải file hoặc lập biên bản trùng.
- Kiểm tra lại quyền và phiên modal sau upload, trước khi gọi RPC ghi biên bản. Đóng giữa lúc upload hủy nháp và không ghi tiếp. Các nút Đóng, Hủy, backdrop và Escape vẫn hoạt động.
- Chỉ bật lưu sau khi đã nạp đủ ca, chủ nuôi, thú cưng và ảnh cũ; không bỏ qua lỗi nạp bằng chứng.

## Kiểm chứng và giới hạn

- 28/28 bài `npm run test:media` đạt; bộ SQL intake chạy lại đạt, có role STAFF thật trong PostgreSQL riêng, quyền chủ nuôi và kiểm tra thu hồi phân công. Fixture đều rollback.
- Harness trình duyệt dùng nguyên closure modal STAFF từ `services.js` và bộ editor thật. Endpoint và dữ liệu mô phỏng chỉ tồn tại ở `scripts/test/media_staff_intake_visual_server.cjs`, không được nạp làm fallback trong ứng dụng hoặc đưa vào artifact Preview.
- Đã thử lưu lỗi hai lần: modal giữ nháp, UUID và asset không đổi, chỉ upload một lần, session khớp đúng ca/biên bản. Khi endpoint thử trả thành công, modal đóng.
- Đã giữ request upload đang chạy rồi đóng modal: không gọi RPC ghi biên bản, nháp được hủy sau khi upload kết thúc.
- [Desktop](staff-intake-media-desktop.png) và [điện thoại](staff-intake-media-mobile.png) đã kiểm tra trực quan; không tràn trang hoặc modal.
- Preview đã cập nhật mã mới: [mở Preview](https://pawpalgr3-4synmwuea-llwyns-projects.vercel.app/admin). Đây là bằng chứng triển khai mã, chưa phải nghiệm thu đăng nhập STAFF thật hoặc lưu biên bản thật trên Vercel. Các mục này tiếp tục để mở trong kế hoạch.
- Lượt này không ghi dữ liệu hoặc tải file thử lên Supabase/Atlas Cloud, không thay deployment/env Production, không push. Đã dừng server kiểm thử riêng sau khi hoàn tất.

Phần kế tiếp: ảnh bàn giao, nghiệm thu riêng modal; việc nghiệm thu một lần tiếp nhận thật có ảnh vẫn còn.
