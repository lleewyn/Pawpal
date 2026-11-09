# Giai đoạn 4 — Form nhật ký của quản lý

Cập nhật 08/11/2026. Đã nối phần đính kèm ảnh trong form thêm bước nhật ký ở hồ sơ ca dịch vụ. Đây là form nằm trong trang, không phải modal sửa bước.

Cập nhật tiếp theo: [Modal sửa nhật ký quản lý](PAWPAL_GIAI_DOAN_4_SUA_NHAT_KY_QUAN_LY.md) đã được nối riêng và kiểm tra; các mục chưa làm dưới đây là trạng thái lúc hoàn thành form thêm.

## Đã thực hiện

- [x] Thay thông báo kho ảnh chưa cấu hình bằng bộ chọn JPEG/PNG/WebP, xem trước và xóa ảnh nháp dùng chung với nhân viên.
- [x] Upload xác minh trước; chuyển `media_asset_ids` vào RPC lưu nhật ký hiện có. Không thay quyền, không xóa bằng chứng cũ và không thêm migration trong đợt này.
- [x] Khóa trường đang lưu; chuyển ca khi upload chưa xong sẽ chặn ghi nhật ký. Ảnh nháp không tự đi sang ca mới.
- [x] Giữ request ID khi server đã lưu nhưng tải lại dữ liệu thất bại, để retry không tạo nhật ký trùng.
- [x] Timeline quản lý đọc `media_asset_id` qua API có bearer token; giữ URL cũ. Dùng bộ đọc tối đa ba request ảnh đồng thời, giải phóng URL tạm khi thay dữ liệu/rời trang và giới hạn cache năm ca.
- [x] Escape URL ở ảnh thumbnail và thuộc tính mở ảnh phóng to.

## Kiểm tra

- `npm run test:media`: **21/21 đạt**, có bài mới dùng đúng hàm lưu quản lý để thử lỗi refresh sau khi server đã lưu và xác nhận retry giữ nguyên ID.
- Browser dùng đúng HTML form và CSS hiện có: ảnh xem trước giải mã được, desktop 1440 × 1000 và mobile 390 × 844 không tràn ngang. Ảnh thử lấy từ asset có sẵn, không ghi thành nhật ký.
- Browser chạy handler form thực với transport/state kiểm thử riêng: chuyển từ ca A sang B trong khi upload đang chờ cho kết quả **0 lần ghi nghiệp vụ**, nút lưu được bật lại. Không có request ghi Cloud trong bài kiểm thử này.
- Kiểm tra cú pháp hai module sửa và `git diff --check` đạt; chỉ còn thông báo Git về chuẩn xuống dòng Windows.

Ảnh: [Desktop](admin-care-media-desktop.png), [Điện thoại](admin-care-media-mobile.png). Harness này chỉ kiểm tra khu vực form, không thay thế nghiệm thu toàn bộ trang đăng nhập thật.

## Còn lại

- [ ] Nghiệm thu khu vực thêm nhật ký quản lý.
- [ ] Modal sửa bước quản lý chưa nhận upload mới; không sửa gộp cùng đợt này.
- [ ] Các màn hình hồ sơ thú cưng và tra cứu khách chưa được nối đầy đủ với asset mới.
- [ ] Chốt quota, cấu hình Preview và thử toàn bộ luồng bằng tài khoản Admin/staff/chủ nuôi thật. Upload vẫn tắt; chưa push hoặc deploy mã website chính.
- [ ] Kiểm tra mất mạng sau lưu, tải lại và tồn tại sau deploy thật; lịch cleanup và phục hồi vẫn trong checklist chung.
