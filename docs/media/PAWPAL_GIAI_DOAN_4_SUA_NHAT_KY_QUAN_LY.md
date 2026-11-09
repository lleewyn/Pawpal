# Giai đoạn 4 — Modal sửa nhật ký quản lý

Cập nhật 08/11/2026. Đã nối bộ ảnh vào `modalEditCarelogStep`. Thay đổi hiện ở local; upload vẫn tắt, chưa push/deploy và không thay cấu hình Cloud trong đợt này.

## Đã thực hiện

- [x] Đọc ảnh đã gắn qua RPC kiểm tra quyền và API có token. Ảnh bằng chứng chỉ đọc; chỉ ảnh nháp mới có nút Xóa. Không cho xóa nhật ký có ảnh đã lưu; server vẫn kiểm tra lại.
- [x] Cho thêm JPEG/PNG/WebP qua bộ media dùng chung, tối đa 10 ảnh cho nhật ký, mỗi ảnh 3 MiB. Asset mới được gắn cùng giao dịch lưu nhật ký hiện có; không cần migration mới.
- [x] Tách controller modal khỏi handler cũ. Giữ snapshot ID nhật ký, ca và phiên bản dữ liệu lúc mở; không tìm lại nhật ký theo vị trí trong timeline lúc Lưu.
- [x] Chọn người ghi theo UUID thay vì đối chiếu tên, tránh trùng tên. Giữ chính xác giây/mili giây của thời điểm gốc nếu người dùng không đổi giờ.
- [x] Khóa trường khi đang lưu, giữ nháp sau lỗi, retry cùng session/asset; đóng modal trước khi upload hoàn tất sẽ chặn thao tác ghi tiếp theo.
- [x] Đối soát một lần sửa bị mất phản hồi bằng nội dung, người ghi, thời điểm và asset đã gắn trước khi thông báo đã lưu.
- [x] Xóa ảnh xem trước cũ ngay khi mở nhật ký khác; giải phóng Blob URL khi đóng. Đóng/Hủy/backdrop/Escape đều được xử lý.

## Kiểm tra và giới hạn

- `npm run test:media`: **21/21 đạt**; kiểm tra cú pháp controller/module và `git diff --check` đạt. Git có thông báo chuẩn xuống dòng Windows.
- Browser dùng đúng HTML modal và stylesheet hiện có, desktop 1440 × 1000 và mobile 390 × 844; nền `rgb(255,255,255)`, không tràn ngang.
- Kiểm thử UI với RPC/transport thay thế riêng trong harness: ảnh đã gắn không có nút xóa; nút xóa nhật ký bị khóa; snapshot vẫn lưu đúng ID/phiên bản sau khi dữ liệu nguồn đổi; thời điểm gốc giữ đúng giây/mili giây.
- Kiểm thử lỗi upload, lỗi lưu và retry: nội dung/ảnh nháp được giữ, một session được chuẩn bị cho các lần thử lại, cùng asset được gửi lại. Đóng giữa upload không ghi nhật ký và gọi cancel cho nháp.
- Đóng, Hủy, backdrop và Escape đều đạt. Không tạo nhật ký hoặc ghi media lên Cloud trong các bài UI này; dữ liệu fixture chỉ ở bộ nhớ trình duyệt kiểm thử.
- Phần đối soát mất phản hồi có triển khai, nhưng chưa có kết quả end-to-end bằng phiên Auth thật. Các bài UI trên không thay thế nghiệm thu Vercel Preview.

Ảnh: [Desktop](edit-care-media-desktop.png), [Điện thoại](edit-care-media-mobile.png). Asset trong ảnh lấy từ repo hiện có để kiểm tra hiển thị; không ghi thành bằng chứng nghiệp vụ.

## Còn lại của giai đoạn 4

- [ ] Nghiệm thu modal sửa nhật ký quản lý.
- [ ] Thử toàn bộ luồng trên Vercel Preview bằng tài khoản Admin, staff và chủ nuôi thật, bao gồm sửa nhật ký, tải lại, thu hồi quyền và mất mạng sau khi server đã ghi.
- [ ] Chốt quota, quyền user Atlas và cấu hình runtime Preview trước khi bật upload.
- [ ] Nối ảnh ở hồ sơ thú cưng/tra cứu khách; nghiệm thu theo từng khu vực, không sửa gộp modal khác.
- [ ] Kiểm tra ảnh tồn tại sau deploy, lịch cleanup và phục hồi đồng bộ file/metadata. Video chưa hỗ trợ.
