# Minh chứng sửa luồng hủy đơn

Ảnh đã chụp lại sau khi bổ sung đúng CSS và lớp trang `user-portal-body` / `lookup-public-page`. Popup thao tác đơn hàng có CSS riêng, nút xác nhận xanh rừng `#236B48`, không bóng cam; nút phụ xanh nhạt, bo góc 9px. Kiểm tra màu tính toán trong trình duyệt cho cả khách hàng và khách vãng lai. Mobile hiển thị tên sản phẩm ở cột đủ rộng, giá xuống hàng; nhãn “Đã hủy” dùng đúng màu trạng thái hủy.

- Bổ sung 6 lý do theo yêu cầu và mục nhập “Lý do khác” ở danh sách đơn, chi tiết đơn khách hàng và trang tra cứu.
- Admin có cùng 6 lý do, giữ các lý do nghiệp vụ hiện có; danh sách đơn đã hủy hiển thị lý do dưới trạng thái.
- Đầu chi tiết đơn đã hủy hiển thị lý do ở tài khoản khách hàng, Admin, tra cứu theo điện thoại và biên nhận khách vãng lai. Đơn cũ thiếu lý do hiển thị “Chưa ghi nhận lý do hủy”.
- Lưu `sales_order.cancel_reason` trong giao dịch xử lý hủy hiện có. Migration 231 đã áp dụng lên Supabase. Không đọc Logs hệ thống.
- Khách vãng lai theo phiên dùng cookie ký số; khách tra cứu OTP dùng quyền hủy riêng gắn với mã đơn, số điện thoại và thời hạn. Hủy đơn không còn cập nhật trực tiếp từ trình duyệt.

## Kiểm tra

`node scripts/test/order_cancellation_cloud_rollback.cjs --screenshots`

Kiểm tra trên Supabase trong giao dịch luôn hoàn tác: phiên khách khác bị từ chối, phiên bản cũ bị từ chối, lý do trống bị từ chối; hủy theo phiên, số điện thoại đã xác thực, tài khoản khách hàng và Admin đều lưu đúng lý do; hàng giữ được giải phóng; yêu cầu lặp cùng mã chỉ ghi nhận một lần; thay đổi nội dung cùng mã bị từ chối; biên nhận và khôi phục biên nhận trả đúng lý do. Dữ liệu đơn thử được hoàn tác sau khi chụp ảnh.

`node --test scripts/test/order_cancellation_http.test.cjs scripts/test/guest_commerce_http_guards.test.cjs`

12 kiểm tra đạt, bao gồm quyền OTP khác số điện thoại/mã đơn/mục đích/hết hạn, cookie bắt buộc, kiểm tra đầu vào trước RPC.

Các kiểm tra giao diện hiện có về thay đổi tài khoản, thông tin khách vãng lai và bộ chuyển dữ liệu Admin đều đạt. Bộ kiểm tra cũ `sync_orders_cloud_rollback.cjs --cloud` dừng ở dữ liệu nhân viên thử không hợp lệ (`invalid_staff_phone`); kiểm tra hủy của thay đổi này dùng bộ kiểm tra riêng phía trên và đã đạt cả khách hàng lẫn Admin.

## Ảnh

- [Khách hàng chọn lý do — desktop](user-reasons-desktop.png)
- [Khách hàng chọn lý do — mobile](user-reasons-mobile.png)
- [Chi tiết đơn khách hàng — desktop](user-cancelled-desktop.png)
- [Chi tiết đơn khách hàng — mobile](user-cancelled-mobile.png)
- [Khách vãng lai chọn lý do](guest-receipt-reasons.png)
- [Biên nhận khách vãng lai đã hủy](guest-receipt-cancelled.png)
- [Kết quả tra cứu đã hủy](lookup-cancelled.png)
- [Chi tiết Admin, khách vãng lai](admin-cancelled.png)
- [Modal hủy đơn Admin](admin-cancel-reasons.png)

Ảnh dùng HTML/CSS và hàm dựng giao diện thực của dự án, nhận dữ liệu biên nhận từ đơn thử trong giao dịch Supabase hoàn tác. Đây là minh chứng giao diện local có cô lập phần tải dữ liệu, chưa phải kiểm thử xuyên suốt trên bản triển khai. Mã giao diện/API chưa push hoặc triển khai.
