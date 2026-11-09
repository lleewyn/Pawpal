# Giai đoạn 3 — Bộ media dùng chung

Ngày cập nhật: 07/11/2026. Đã có nền tảng API, GridFS và metadata; chưa bật upload trên website và chưa nghiệm thu luồng Vercel hoàn chỉnh.

Cập nhật tiếp theo: [Modal sản phẩm và bài thử Vercel multipart/Sharp/GridFS](PAWPAL_GIAI_DOAN_4_SAN_PHAM.md). RPC sản phẩm đã nhận asset; RPC nhật ký và luồng Auth thật vẫn còn trong checklist.

## Phần đã thực hiện

- [x] Migration `188_media_foundation.sql` đã áp dụng vào Supabase Cloud sau khi thử trên database riêng.
- [x] Tạo session và asset; khóa quyền đọc bảng trực tiếp, RPC xác nhận file và cleanup chỉ dành cho service role.
- [x] Bổ sung FK cho `product_media` và `care_log_media`, CHECK đúng một nguồn URL hoặc asset. Đường dẫn và số lượng ảnh cũ không đổi.
- [x] API `/api/media`: chuẩn bị phiên, upload một file, đọc ảnh theo quyền và hủy nháp. Chỉ nhận hai mục đích `product_image`, `care_log_image`.
- [x] Giới hạn ảnh 3 MiB, body 4.000.000 byte, JPEG/PNG/WebP; giải mã nội dung thật, kiểm tra kích thước và SHA-256. Video chưa hỗ trợ.
- [x] Chống ghi trùng qua request/session/lease; lỗi giữa Atlas và Supabase giữ reservation để dọn sau.
- [x] Ảnh sản phẩm chỉ công khai sau khi được gắn vào sản phẩm đang hoạt động; ảnh nhật ký kiểm tra nhân viên phụ trách hoặc đúng chủ nuôi, trả cache riêng tư.
- [x] Bộ đọc `scripts/shared/media-source.mjs` hỗ trợ URL cũ hoặc asset; chưa gắn vào giao diện.
- [x] Cleanup có lease, thời gian giữ và legal hold; chỉ giải phóng quota sau khi xóa vật lý thành công. Không có endpoint xóa theo ObjectId do trình duyệt cung cấp.
- [x] Rollback đã thử trên database riêng, chỉ cho phép khi chưa có session/asset và upload tắt.

## Bằng chứng kiểm tra

- `npm run test:media`: **18/18 đạt** cho connector, multipart, nội dung ảnh, quyền API, retry, lỗi liên hai DB, cache và cleanup.
- [Kiểm thử PostgreSQL](phase3-database-tests.txt): quyền SQL thực, gate tắt, quota reservation, idempotency, lease, sai người/sai đối tượng, nguồn ảnh, sản phẩm công khai, nhật ký đúng chủ, nhân viên bị vô hiệu hóa, retention và legal hold; rollback và áp dụng lại đạt.
- [Thử GridFS thật](phase3-gridfs-smoke.txt): ghi ảnh PNG nhỏ, đọc so khớp toàn bộ byte/hash, xóa đúng file thử và chunks; không tạo dữ liệu nghiệp vụ Supabase. Collection/index GridFS có thể còn sau lần ghi đầu.
- [Đối chiếu Cloud sau migration](phase3-cloud-verify.txt): 0 session, 0 asset, gate tắt, anon không đọc trực tiếp, người dùng không được finalize; số lượng và hash URL cũ không đổi.

Backup trước thay đổi đặt ngoài webroot trong thư mục hạ tầng riêng. Backup Cloud có phạm vi hai bảng media bị sửa, định nghĩa cột/ràng buộc và hàm kiểm tra chủ nuôi. Database thử dựng từ schema local rồi đối chiếu cột hai bảng với Cloud và nạp định nghĩa kiểm tra chủ nuôi Cloud. Đây không phải bản khôi phục toàn bộ Cloud. Dữ liệu kiểm thử chỉ nằm trong giao dịch của database riêng và đã rollback; không đưa dữ liệu mẫu vào website.

## Cấu hình và vận hành

Mẫu: [config/media.env.example](../../config/media.env.example). Runtime dùng namespace riêng `PAWPAL_MEDIA_MONGODB_*` và `PAWPAL_MEDIA_SUPABASE_*`, tránh dùng nhầm `MONGODB_URI` có sẵn của dự án. Không đưa khóa service role vào client.

Hai chốt hiện tắt: `MEDIA_UPLOAD_ENABLED` ở API và `pawpal_private.media_settings.enabled=false`, `max_storage_bytes=0` trong DB. Mức trần kỹ thuật 300.000.000 byte không có nghĩa đã chốt quota vận hành. Chưa thay env project Vercel và chưa deploy/push mã API này.

Cleanup mặc định chỉ báo không thực thi, không kết nối hay sửa dữ liệu:

```powershell
node scripts/media_cleanup_operator.cjs
```

Khi vận hành sau này, dùng `--execute --env-file` với đường dẫn tuyệt đối đến file env riêng đầy đủ. Worker nhận ứng viên từ RPC service-only, xóa GridFS rồi xác nhận SQL; gặp lỗi giữ reservation/lease để lần sau đối soát. Chưa thiết lập lịch chạy tự động. Không tự giải phóng legal hold của ảnh bằng chứng.

## Phần còn lại trước khi bật thật

- [ ] Chốt quota vận hành, thời gian giữ và quyền database user Atlas.
- [ ] Cấu hình namespace media cho Vercel Preview.
- [ ] Thử multipart/Sharp thật trên Vercel, đọc private qua Auth thật và kiểm tra ảnh còn sau deploy. Bài ping giai đoạn 2 chưa thay thế được các bước này.
- [ ] Mở rộng RPC lưu sản phẩm/nhật ký để nhận `media_asset_id` trong cùng giao dịch lưu nghiệp vụ. Hiện chỉ có FK/trigger bảo vệ, chưa có API attach/detach nghiệp vụ hoàn chỉnh.
- [ ] Gắn bộ đọc vào các truy vấn/giao diện trước khi cho tạo bản ghi có URL null; giữ URL cũ.
- [ ] Làm modal sản phẩm trước, kiểm tra desktop/điện thoại rồi báo nghiệm thu theo AGENTS.md; sau đó mới làm modal nhật ký.
- [ ] Kiểm tra tải đồng thời và phục hồi metadata cùng file; chưa coi là đã nghiệm thu vận hành.

Chưa triển khai các nhóm avatar, chat, đánh giá, banner hoặc video. Khi rollback sau khi có file thật, tắt ghi và giữ bộ đọc/metadata; không chạy script rollback cấu trúc để tránh mất tham chiếu.
