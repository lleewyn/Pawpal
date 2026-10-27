# Lỗi theo trường khi khách vãng lai thêm bé

Ngày 27/10/2026. Thay đổi local tại `booking-guest-pets.mjs`; không migration, không push/deploy.

Form thêm bé hiển thị lỗi ngay dưới tên chủ nuôi, điện thoại, tên bé, giống, cân nặng, dị ứng và lưu ý an toàn. Các ô có `aria-describedby` nối thông báo, `aria-invalid` phản ánh lỗi; khi lưu, focus về ô sai đầu tiên. Nhập lại xóa lỗi của ô tương ứng. Chọn giống từ popover xóa lỗi giống, sửa chữ sau khi chọn buộc chọn lại giống hợp lệ.

Chặn tên chỉ có khoảng trắng, số điện thoại không đúng định dạng máy chủ đang hỗ trợ (0, +84, 0084 hoặc 84; có thể có dấu cách/dấu phân cách), giống chưa chọn từ catalog, cân nặng ngoài 0,01–200 hoặc sai bước 0,01, ghi chú vượt 1.000 ký tự. Dữ liệu không hợp lệ không gọi API; máy chủ vẫn giữ validation và kiểm tra quyền riêng, không tin validation trình duyệt.

Lỗi lưu từ API tiếp tục dùng thông báo chung vì phản hồi hiện chưa có mã trường cụ thể; không đoán lỗi máy chủ để gán nhầm ô. Nội dung form và mã yêu cầu được giữ sau lỗi. Không bổ sung lưu thông tin cá nhân vào storage, polling hoặc request kiểm tra trường.

## Kiểm thử

`node scripts/test/guest_booking_pet_validation_ui.cjs` PASS trên Chrome headless, import module thật qua route local, dùng transport fixture và không gọi Cloud:

- Form trống: năm ô bắt buộc có lỗi/ARIA, focus đúng ô, không request.
- Tên khoảng trắng, phone sai, giống chỉ gõ chữ, cân nặng quá giới hạn hoặc hơn hai số thập phân: không request.
- Dị ứng/lưu ý hơn 1.000 ký tự (đặt bằng script để vượt giới hạn nhập tay) và sửa chữ giống sau chọn: không request.
- Phone +84 có dấu phân cách hợp lệ đi đến bước lưu; lỗi lưu giả lập giữ nội dung, mở lại nút và giữ request ID.
- Thử lại cùng request ID thành công: đọc context, tự chọn đúng Pet ID, đóng editor, xóa mã chờ, mở nút tiếp theo; không lỗi JavaScript.

Hai test `guest_booking_pet_context.test.cjs` PASS, kiểm tra làm sạch giống và ánh xạ context không lộ field ngoài hợp đồng; syntax module PASS.

Chưa kiểm thử đầy đủ lỗi theo trường cho giờ/phòng/taxi/checkout hoặc lỗi API dưới Auth thật. Chưa thêm API sửa contact/bé guest đã lưu. Mục lỗi tổng thể và các gate GĐ-04/GĐ-05 vẫn mở.
