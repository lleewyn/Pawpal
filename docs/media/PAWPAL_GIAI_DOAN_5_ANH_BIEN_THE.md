# Giai đoạn 5 — Ảnh biến thể sản phẩm

Cập nhật 08/11/2026: hoàn thành phần ảnh biến thể, chưa hoàn thành toàn bộ giai đoạn 5.

## Kết quả

- Mỗi biến thể có lựa chọn dùng đường dẫn hoặc tải ảnh, xem trước và gỡ ảnh. Ảnh sản phẩm chính vẫn được quản lý riêng.
- Giữ ID biến thể và ảnh đang chọn khi dựng lại bảng thuộc tính; các nhóm chọn nguồn ảnh độc lập.
- Lưu file trên MongoDB GridFS, metadata và tham chiếu trên Supabase. URL cũ tiếp tục hoạt động.
- Migration 191 ràng buộc asset vào đúng biến thể và sản phẩm; không cho dùng ảnh biến thể làm ảnh sản phẩm chính. Chỉ công khai ảnh đã gắn vào biến thể và sản phẩm đang hoạt động.
- Giới hạn 3 MiB/ảnh, quota 100 MiB, tối đa 10 file mới trong một lần lưu sản phẩm gồm cả ảnh chính và ảnh biến thể. Video vẫn tắt.

## Kiểm chứng

- `npm run test:media`: 24/24 đạt. Kiểm thử adapter catalog đạt.
- Kiểm thử SQL trong database riêng: đúng/sai phạm vi, phân quyền, giữ tham chiếu, biến thể ngừng hoạt động, lưu sản phẩm nháp, retention, rollback và áp dụng lại đều đạt. Xem [kết quả SQL](phase5-variant-database.txt).
- Phiên Admin thật trên Vercel Preview: upload trả 201, lưu sản phẩm trả 200; catalog chứa endpoint ảnh của đúng biến thể; đọc ảnh công khai trả 200 và đúng số byte. Tải lại trang, mở modal vẫn thấy ảnh; lưu tiếp không đổi ảnh giữ nguyên ID và nguồn tham chiếu, chỉ cập nhật thời điểm sửa.
- Kiểm tra giao diện riêng: chọn ảnh rồi dựng lại bảng vẫn giữ lựa chọn; nhóm chọn nguồn độc lập; bảng tự cuộn ngang trên điện thoại, không làm tràn modal hoặc trang. Bộ kiểm tra giao diện riêng không ghi dữ liệu giả vào Cloud.
- [Ảnh desktop](variant-media-desktop.png), [ảnh điện thoại](variant-media-mobile.png).

## Dữ liệu và môi trường sau kiểm thử

- Khôi phục chính xác toàn bộ 134 bản ghi ảnh biến thể cũ, gồm 11 tham chiếu của sản phẩm đã thử. Giá, tồn kho và các cột nghiệp vụ sản phẩm/biến thể không đổi; lịch sử kiểm toán và thời điểm cập nhật được giữ lại.
- File thử 1.385.797 byte cùng các chunk đã được xóa theo session/asset đã ghi nhận. Quota giữ chỗ về 0 byte; không xóa file ngoài phạm vi. Xem [khôi phục](phase5-variant-restoration.txt), [dọn file](phase5-variant-cleanup.txt), [đối chiếu cuối](phase5-variant-final-verify.txt).
- Giữ [Preview nghiệm thu](https://pawpalgr3-mnu5zz4u4-llwyns-projects.vercel.app/admin#tab-order-products); đã xóa deployment dọn file và thu hồi automation bypass. Preview có thể yêu cầu đăng nhập Vercel theo cấu hình bảo vệ hiện hành.
- Không push, không thay deployment hoặc biến môi trường Production. Supabase Cloud dùng chung đã nhận migration và các thao tác nghiệm thu có khôi phục dữ liệu ảnh.
- Chưa kiểm thử đăng nhập trực tiếp bằng STAFF/chủ nuôi; kiểm tra phát hành giai đoạn 7 vẫn giữ nguyên. Lịch cleanup định kỳ và diễn tập phục hồi hai CSDL vẫn còn trong kế hoạch.

Phần kế tiếp: ảnh dịch vụ, nghiệm thu riêng từng modal trước khi mở rộng sang nghiệp vụ khác.
