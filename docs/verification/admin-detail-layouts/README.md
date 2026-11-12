# Rà soát bố cục chi tiết Admin

Đã rà soát 5 trang: đơn hàng, ca dịch vụ, khách hàng, thú cưng và nhân sự. Thêm lớp CSS giới hạn cho các bề mặt chi tiết, không áp lên danh sách hoặc modal.

- Nhóm nút chính căn phải, tự xuống hàng khi thiếu chỗ.
- Thống nhất khoảng cách giữa tiêu đề, nhóm dữ liệu và phần ghi chú.
- Giữ bo góc 9px và bề mặt trắng bán trong suốt; bỏ hộp con, viền trái lịch sử và đường kẻ thừa trong phạm vi chi tiết.
- Đơn hàng: nhãn không còn dấu hai chấm, nhãn–giá trị căn trái rõ ràng, ghi chú khách đậm hơn, bảng sản phẩm cuộn ngang bên trong trên mobile. Sửa flex cũ khiến tiêu đề trên mobile cao bất thường.
- Dịch vụ: làm rõ ghi chú khách, bỏ nền/viền cảnh báo và nhóm con thừa.
- Khách hàng/thú cưng: tab con cuộn trong khung, không gây tràn toàn trang khi màn hình hẹp.
- Nhân sự: nút tự xuống hàng và dữ liệu về một cột ở màn hình nhỏ.

Kiểm tra đạt:

- `node scripts/test/admin_detail_surfaces_ui.cjs`: 10 bố cục (5 trang × 1440px/390px), nạp toàn bộ CSS theo thứ tự trang Admin thật; kiểm tra tràn ngang, căn phải nhóm nút, bo góc, nền/viền đơn hàng.
- `node scripts/test/admin_guest_order_contact_ui.cjs`: bộ dựng đơn hàng giữ riêng thông tin người đặt và người nhận.
- `node scripts/test/admin_orders_adapter.cjs`: truy vấn theo phạm vi, số tiền đã thu/hoàn và dữ liệu chi tiết vẫn đạt.

Ảnh là kiểm tra bố cục local dùng HTML/CSS thật với nội dung thử dài và trạng thái trống/skeleton có sẵn. Không phải ảnh dữ liệu khách thật hoặc kiểm thử xuyên suốt trên bản triển khai. Không thay đổi nghiệp vụ/CSDL.

Ảnh desktop/mobile: `orders-1440.png`, `orders-390.png`, `services-1440.png`, `services-390.png`, `customers-1440.png`, `customers-390.png`, `pets-1440.png`, `pets-390.png`, `staff-1440.png`, `staff-390.png`.

Chưa push các chỉnh sửa bố cục này.
