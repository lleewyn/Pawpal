# Giai đoạn 5 — Ảnh dịch vụ

Cập nhật 08/11/2026: hoàn thành quản lý ảnh trong modal thêm/sửa danh mục dịch vụ. Biên bản tiếp nhận, bàn giao và phụ phí là phần riêng, chưa triển khai trong lượt này.

## Chức năng

- Thêm lựa chọn dùng đường dẫn hoặc tải ảnh lên, xem trước, xóa ảnh khỏi bản nháp. URL cũ giữ nguyên; thay đổi chỉ có hiệu lực khi lưu dịch vụ thành công.
- Tối đa 10 ảnh, mỗi ảnh 3 MiB; dùng quota chung 100 MiB. Upload chỉ bật trên Preview, video vẫn tắt.
- Migration 192 lưu metadata/tham chiếu trên Supabase, file trên GridFS. Ràng buộc asset vào đúng dịch vụ hoặc bản nháp dịch vụ; không dùng ảnh sản phẩm/biến thể/nhật ký cho dịch vụ.
- Tham chiếu ảnh được lưu trong cùng giao dịch `save_admin_service_catalog`. RPC cũ không gửi trường ảnh tiếp tục giữ nguyên ảnh.
- Danh mục công khai nhận endpoint ảnh khi dịch vụ hoạt động. Ảnh dịch vụ tạm ẩn cần phiên hợp lệ; thumbnail Admin dùng bearer token, tối đa ba lượt tải đồng thời.
- Lưu lại không đổi ảnh giữ ID tham chiếu. Gỡ ảnh đưa asset vào hàng chờ retention; không xóa file ngay trên giao diện.
- Đóng modal trong lúc tải không tiếp tục ghi dịch vụ. Khi lưu đã thành công nhưng tải lại danh mục lỗi, thông báo đúng trạng thái đã lưu để tránh ghi lặp.

## Nghiệm thu

- `npm run test:media`: 26/26 đạt; kiểm thử adapter catalog sản phẩm đạt.
- [Kiểm thử SQL](phase5-service-database.txt) trong database riêng: dùng RPC lưu dịch vụ thật dưới role authenticated, chặn sai dịch vụ và STAFF, bảo vệ ảnh nháp/dịch vụ tạm ẩn, giữ tham chiếu, chuyển bản nháp sang dịch vụ thật, retention, rollback và áp dụng lại. Dữ liệu thử đều rollback.
- Preview bằng phiên Admin thật: upload JPEG 196.843 byte trả 201; lưu dịch vụ trả 200. Tải lại và mở modal vẫn thấy ảnh, đúng chế độ upload. Danh mục công khai có endpoint của đúng dịch vụ; đọc không có bearer trả 200 và đúng số byte. Lưu tiếp không đổi ảnh trả 200, giữ tham chiếu.
- Desktop 1440 × 1000 và điện thoại 390 × 844: phần ảnh hiển thị đúng, không tràn trang/modal. [Desktop](service-media-desktop.png), [điện thoại](service-media-mobile.png).
- Phát hiện ảnh legacy `spa04.webp` chứa dữ liệu JPEG: API từ chối `MEDIA_INVALID_IMAGE` đúng thiết kế. Giữ nguyên file legacy; nghiệm thu upload bằng đúng MIME JPEG. Đã cải thiện thông báo và kiểm tra riêng việc retry sau lỗi 400 tạo session mới, giữ file đã chọn; kiểm tra retry không ghi fixture vào Cloud.

## Khôi phục sau kiểm thử

- Khôi phục chính xác toàn bộ 23 bản ghi ảnh dịch vụ cũ. Loài hỗ trợ và các bước quy trình của dịch vụ được thử cũng được khôi phục đúng bản ghi trước thử. Giá và các cột nghiệp vụ dịch vụ không đổi; giữ lịch sử kiểm toán và thời điểm cập nhật dịch vụ.
- Đối soát hai session đã ghi nhận: một upload bị từ chối, một upload thành công. Xóa file/chunks thử, xác nhận phiên lỗi không còn file/chunks mồ côi, trả 393.686 byte quota giữ chỗ. Không xóa file ngoài phạm vi.
- Xem [khôi phục](phase5-service-restoration.txt), [dọn file](phase5-service-cleanup.txt), [đối chiếu cuối](phase5-service-final-verify.txt). Kết thúc: 0 asset/session đang hoạt động, 0 byte giữ chỗ; ngân sách 104.857.600 byte.
- Giữ [Preview cuối](https://pawpalgr3-2uzvub4xz-llwyns-projects.vercel.app/admin#tab-service-catalog); xóa hai Preview trung gian và deployment dọn file, thu hồi automation bypass. Preview có thể yêu cầu đăng nhập Vercel theo cấu hình bảo vệ.
- Không push, không đổi deployment hoặc biến môi trường Production. Supabase Cloud dùng chung đã nhận migration và thao tác nghiệm thu có khôi phục dữ liệu ảnh.

Giai đoạn 5 còn biên bản/phụ phí, hồ sơ và các phân hệ kế tiếp. Kiểm thử đăng nhập thực tế bằng STAFF/chủ nuôi, cleanup định kỳ và diễn tập phục hồi hai CSDL vẫn còn trong kế hoạch chung.
