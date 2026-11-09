# Giai đoạn 4 — Ảnh nhật ký của nhân viên

Cập nhật 08/11/2026. Đã nối phần ảnh vào modal `staffCareLogModal`, bổ sung giao dịch lưu và bộ đọc ảnh riêng tư cho nhật ký chủ nuôi. Chưa bật upload, chưa push và chưa deploy mã website chính.

Tiến độ tiếp theo: đã nối [form thêm nhật ký quản lý và timeline](PAWPAL_GIAI_DOAN_4_NHAT_KY_QUAN_LY.md); modal sửa bước quản lý vẫn chưa triển khai upload.

## Đã thực hiện

- [x] Modal nhân viên cho chọn ảnh JPEG/PNG/WebP, tối đa 10 ảnh mỗi nhật ký, mỗi ảnh 3 MiB; có xem trước và xóa ảnh mới chọn.
- [x] Ảnh đã gắn là bằng chứng chỉ đọc trong modal này. Thêm ảnh không xóa hoặc thay ảnh đã có; legal hold vẫn được giữ.
- [x] Upload xác minh file trước; RPC `save_admin_service_care_log` gắn asset trong cùng giao dịch lưu nội dung. Giữ nguyên `work_guard_rpc`, quyền nhân viên, kiểm tra ca đang làm và phiên bản dữ liệu.
- [x] RPC `list_care_log_media` chỉ cho Admin/nhân viên đúng phạm vi hoặc đúng chủ nuôi; anon bị chặn. Không trả MongoDB ObjectId hoặc credential.
- [x] Retry upload dùng lại session; lỗi tải ảnh giữ bản nháp. Khi đối soát một lần sửa bị mất phản hồi, kiểm tra cả các asset đã được gắn, không chỉ nội dung chữ.
- [x] Nhật ký của chủ nuôi đọc asset qua bearer token, tạo URL tạm trong trình duyệt và giải phóng khi rời trang hoặc thay dữ liệu. Tối đa ba lượt đọc ảnh đồng thời; không lưu Blob URL vào CSDL.
- [x] Migration 190 đã áp dụng vào Supabase sau kiểm thử database riêng. Gate upload vẫn tắt, chưa có asset/session nghiệp vụ mới; đối chiếu dữ liệu ảnh cũ không đổi.

## Kiểm tra

| Hạng mục | Kết quả |
|---|---|
| `npm run test:media` | 20/20 đạt, gồm hai bài mới về bộ đọc ảnh riêng tư |
| [Database riêng](phase4-care-database.txt) | RPC thật với vai trò staff, gắn ảnh, giữ bằng chứng cũ, retry không trùng, sai nguồn rollback, đúng chủ nuôi, staff bị thu hồi phân công và anon bị chặn |
| [Cloud sau migration](phase4-care-cloud.txt) | Upload tắt, 0 asset/session, không cấp reader cho anon, giữ guard nghiệp vụ |
| [Đối chiếu ảnh cũ](phase3-cloud-verify.txt) | Số lượng/hash URL cũ giữ nguyên |
| Browser desktop/mobile | Nền trắng `rgb(255,255,255)`, không tràn ngang; xem trước/xóa nháp/từ chối SVG đạt |
| Đóng modal | Nút Đóng, Hủy, backdrop và Escape đều đạt |
| Kiểm thử transport của editor trong browser | Mô phỏng mất phản hồi: giữ ảnh nháp, retry cùng session, hủy gọi cancel. Đây là unit test với transport thay thế, không phải Auth end-to-end hay ghi dữ liệu nghiệp vụ Cloud |

Ảnh giao diện: [Desktop](care-media-desktop.png), [Điện thoại](care-media-mobile.png). Trang thử dựng bằng factory modal và CSS thật, không nạp bản ghi nghiệp vụ hay cấp phiên đăng nhập. Ảnh minh họa lấy từ asset sẵn có của repo và không được ghi thành nhật ký.

Database thử dùng schema riêng đã sở hữu và định nghĩa guard lấy từ Cloud; fixtures chỉ nằm trong giao dịch rollback. Định nghĩa hàm Cloud trước thay đổi được giữ ở thư mục hạ tầng riêng ngoài webroot. Không đọc Supabase Logs.

## Còn lại

- [ ] Nghiệm thu modal nhân viên trước khi sửa form quản lý hoặc modal khác theo AGENTS.md.
- [ ] Thử toàn bộ luồng trên Vercel Preview bằng tài khoản staff và chủ nuôi thật: tạo/sửa nhật ký, tải lại, sai ca/sai chủ, mất quyền trong khi upload và mất mạng sau lưu.
- [ ] Chốt quota vận hành và cấu hình `PAWPAL_MEDIA_*`; chưa bật `MEDIA_UPLOAD_ENABLED` hay gate DB.
- [ ] Form nhật ký quản lý, màn hình hồ sơ thú cưng và tra cứu khách vẫn chưa được nối đầy đủ với asset mới. Không coi đã triển khai tất cả nơi dùng ảnh nhật ký.
- [ ] Giao diện nhật ký chủ nuôi hiện giữ cách hiển thị một ảnh đại diện mỗi sự kiện; chưa mở rộng gallery nhiều ảnh.
- [ ] Lịch cleanup, phục hồi đồng bộ file/metadata và nghiệm thu vận hành vẫn còn trong kế hoạch chung. Video chưa hỗ trợ.
