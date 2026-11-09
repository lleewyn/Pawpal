# Giai đoạn 5 — Ảnh banner và bài viết

Checkpoint 09/11/2026.

- Migration 201 đã áp dụng Cloud sau kiểm thử SQL và rollback/reapply. Bổ sung FK ảnh banner và ảnh đại diện bài viết; mỗi vị trí dùng một nguồn URL hoặc asset. Ảnh bài viết có thể để trống.
- Ảnh banner chỉ công khai khi trạng thái và khoảng ngày cho phép, theo múi giờ Việt Nam. Ảnh bài nháp/hẹn giờ chưa công khai; khi công bố đúng thời điểm mới mở quyền đọc.
- STAFF không được upload ảnh nội dung; Admin lưu qua RPC có kiểm tra quyền, snapshot và nhật ký hiện có. Upload gắn UUID bản ghi ổn định, gồm cả bản nháp chưa tạo.
- Modal banner và bài viết có chọn link/upload, tối đa một ảnh 3 MiB JPEG/PNG/WebP. Gửi lỗi giữ nguyên asset, UUID, slug và thời điểm gửi; thử lại không tải file trùng. Đổi ảnh chỉ tác động CSDL sau khi lưu thành công.
- Thay ảnh hoặc xóa bản ghi đưa file cũ vào thời hạn giữ 7 ngày. Cleanup kiểm tra cả hai FK mới.
- Đã nối bộ đọc banner Admin với bearer cho ảnh ẩn; nguồn public dùng endpoint ổn định trong DataLoader và chi tiết bài viết. Các URL cũ giữ nguyên.

## Kiểm thử và giới hạn

- [SQL](phase5-content-database.txt), [áp dụng Cloud](phase5-content-cloud.txt).
- Hai modal dùng mã thật trong giao diện riêng: hai lần lỗi giữ cùng payload, một upload; xác nhận thành công rồi đóng. Đã xem ảnh chụp desktop/mobile `banner-media-*.png` và `article-media-*.png`.
- Preview tổng hợp mở được modal sửa banner bằng Admin thật; bộ chọn ảnh giữ URL cũ, đóng modal không thay bản ghi. Ảnh chụp `banner-preview-real-admin-*.png`.
- Upload riêng tư trên Vercel đã đạt cho ảnh hồ sơ và nháp khiếu nại; xem [bằng chứng API](phase5-live-private-preview.txt) và [dọn file/quota](phase5-live-draft-cleanup.txt). Không coi đây là nghiệm thu lưu banner/bài viết.
- Ngày 09/11/2026 đã nghiệm thu lưu ảnh đại diện bài viết qua modal bằng Admin thật trên Preview, dùng đúng file ảnh gốc: tải công khai 200 và hash khớp. Nội dung, slug, trạng thái và ngày công bố không thay đổi. Đã khôi phục chính xác toàn bộ bản ghi và dọn file/chunks thử; `phase5-admin-live-media-cleanup.txt`.
- Sửa form bài viết để giữ ngày công bố và dạng trạng thái cũ khi chỉ thay ảnh; phân biệt tiêu đề và nút lưu khi sửa bài. Kiểm thử riêng xác nhận ngày công bố, trạng thái và slug cũ được giữ.
- Chưa nghiệm thu lưu banner: các ảnh gốc kiểm tra hiện vượt giới hạn 3 MiB. Không thay bằng ảnh khác nội dung để lấy kết quả đạt. Chưa đổi deployment/env Production, chưa push.
- Không tạo banner hoặc bài viết giả trên Cloud để thử.
