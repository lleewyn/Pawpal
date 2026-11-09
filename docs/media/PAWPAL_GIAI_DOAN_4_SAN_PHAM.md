# Giai đoạn 4 — Modal ảnh sản phẩm

Cập nhật 07/11/2026. Đã nối mã modal và giao dịch lưu ảnh sản phẩm, áp dụng migration 189 vào Supabase. Chưa bật upload và chưa nghiệm thu toàn bộ luồng bằng tài khoản thật trên website Preview.

## Đã thực hiện

- [x] Modal sản phẩm có hai lựa chọn: **Dùng đường dẫn** hoặc **Tải ảnh lên**. Chỉ hiển thị ô nhập tương ứng, có xem trước và xóa ảnh khỏi bản nháp.
- [x] Chọn tối đa 10 ảnh JPEG/PNG/WebP, mỗi ảnh tối đa 3 MiB. Trình duyệt kiểm tra sơ bộ; API vẫn giải mã và kiểm tra lại file thật.
- [x] File tải lên được xác minh trước; `media_asset_id` được gắn trong cùng giao dịch `save_admin_sales_product`. Lỗi lưu không báo thành công và không xóa ảnh đang dùng.
- [x] Giữ nguyên dòng tham chiếu nếu ảnh không đổi; ảnh bị thay được đưa vào hàng đợi retention. Đường dẫn cũ tiếp tục dùng được.
- [x] Trình đọc Admin nhận asset qua API có token; danh mục cửa hàng trả endpoint ảnh công khai cho asset thay cho URL null. Đọc ảnh Admin tối đa ba request đồng thời, không tải ảnh hàng loạt khi xuất danh sách kho.
- [x] Migration chỉ thay phần xử lý ảnh trong hàm nghiệp vụ hiện có và biểu thức ảnh sản phẩm của danh mục. Backup định nghĩa hàm Cloud trước thay đổi đặt trong thư mục hạ tầng riêng.
- [x] Không chỉnh modal nhật ký hay các modal khác, không push và không deploy mã website chính.

## Bằng chứng và giới hạn

| Kiểm tra | Kết quả |
|---|---|
| `npm run test:media` | 18/18 đạt |
| Adapter danh mục hiện có | Đạt; sửa bộ kiểm thử cũ để lấy đúng phạm vi module và nạp helper định danh thật |
| [RPC sản phẩm trong database riêng](phase4-product-database.txt) | Caller `authenticated`, gắn asset, giữ nguyên tham chiếu, trả URL API công khai, từ chối ảnh nhật ký làm ảnh sản phẩm, thay bằng URL cũ; fixture đã rollback |
| [Đối chiếu Supabase Cloud](phase4-product-cloud.txt) | Hàm mới đã áp dụng, 0 asset/session, gate tắt |
| [Đối chiếu dữ liệu cũ](phase3-cloud-verify.txt) | Số lượng và hash đường dẫn cũ giữ nguyên |
| [Vercel Preview](phase4-vercel-preview.txt) | HTTP 200: multipart → Sharp giải mã → GridFS ghi/đọc khớp byte → xóa file/chunks; không tạo bản ghi nghiệp vụ |
| Browser desktop 1440 × 1000 và mobile 390 × 844 | Khu vực ảnh không tràn ngang; chọn file xem trước, xóa, từ chối SVG và URL `javascript:` đạt |

Bài Vercel là artifact kỹ thuật tối giản, không phải luồng Admin đăng nhập hoàn chỉnh. Deployment thử, ảnh thử và automation bypass phát sinh đã được dọn; không thay env media lâu dài của project hoặc Production. Bài layout dùng đúng HTML modal và stylesheet hiện có, không tải dữ liệu nghiệp vụ hoặc bỏ qua đăng nhập Admin. Ảnh xem trước lấy từ asset hiện có trong repo, không được ghi thành sản phẩm mẫu.

Ảnh kiểm tra giao diện: [Desktop](product-media-desktop.png), [Điện thoại](product-media-mobile.png).

Đính chính ảnh test: harness ban đầu thiếu link stylesheet được nạp cùng module `orders.html`, khiến nền trắng 70% của lớp V8 ghi đè và bị ám xám. Đã sửa harness theo đúng thứ tự nạp của Admin và chụp lại hai ảnh trên; computed background của modal là `rgb(255, 255, 255)`. Không đổi CSS giao diện sản phẩm trong lần sửa test này.

## Còn lại trước khi bật upload

- [ ] Người dùng xem và nghiệm thu modal sản phẩm theo mục 8 trong `AGENTS.md`.
- [ ] Chốt quota và cấu hình namespace `PAWPAL_MEDIA_*` trên Preview; xác nhận quyền Atlas đủ hẹp.
- [ ] Deploy mã website lên Preview và thử bằng tài khoản Admin thật: tạo/sửa sản phẩm, upload, đổi nguồn, hủy, tải lại, cửa hàng công khai và thu hồi quyền. Chưa có kết quả end-to-end này.
- [ ] Thử đóng modal trong lúc request chạy, mất mạng sau khi server đã ghi, quota đầy và ảnh sản phẩm ngừng kinh doanh bằng luồng đăng nhập thật.
- [ ] Kiểm tra ảnh tồn tại sau một lần deploy mới, lịch cleanup và phục hồi đồng bộ metadata/file.
- [ ] Sau nghiệm thu sản phẩm mới chuyển sang modal nhật ký; chưa bật video.

`MEDIA_UPLOAD_ENABLED` và gate trong database vẫn tắt. Không áp dụng bản rollback hàm cũ sau khi bắt đầu có asset thật; khi cần dừng triển khai, tắt upload và giữ phần đọc/metadata.
