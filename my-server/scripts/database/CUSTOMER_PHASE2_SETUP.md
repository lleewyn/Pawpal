# Giai đoạn 2: dữ liệu trang khách hàng

## Áp dụng

Chạy toàn bộ `20261010_customer_profile_atomic.sql` trong SQL Editor của dự án Supabase Pawpal, trước khi triển khai giao diện mới. File bổ sung quận/huyện và phường/xã vào sổ địa chỉ, tạo hai RPC chỉ dành cho khách đang đăng nhập. Không cần chạy lại SQL xác thực giai đoạn 1.

`customer_profile_snapshot()` cung cấp dữ liệu hồ sơ và phiên bản hiện tại. `customer_profile_save()` xác định khách từ phiên Supabase, khóa hồ sơ, kiểm tra phiên bản, rồi lưu tên, email và địa chỉ trong cùng giao dịch. Nếu có lỗi, toàn bộ thay đổi được hoàn tác. Các địa chỉ giữ nguyên ID; chỉ địa chỉ người dùng đã bỏ mới được xóa. Nếu địa chỉ còn bị đơn hàng tham chiếu, lưu thất bại và yêu cầu giữ địa chỉ đó. Số điện thoại đăng nhập không được thay đổi ở form hồ sơ.

## Thay đổi giao diện và dữ liệu

- Không ghi cache hoặc báo thành công trước khi CSDL xác nhận lưu hồ sơ.
- Không hiển thị hồ sơ giả khi chưa đăng nhập, không phục hồi địa chỉ cũ khi CSDL trả danh sách rỗng.
- Không hợp nhất đơn hàng và lịch hẹn cục bộ vào danh sách trực tiếp từ Supabase. Không khớp quyền sở hữu qua số điện thoại nhận hàng hoặc mã USER-001.
- Tra cứu dữ liệu theo Auth user đang đăng nhập và từ chối ID khách không khớp.
- Chuyển tab nhanh chỉ hiển thị kết quả của tab mới nhất; khởi tạo module được tuần tự hóa, lỗi khởi tạo không kích hoạt lại script lần hai.
- Đăng ký Realtime cho hồ sơ, địa chỉ, điểm, đơn hàng, đánh giá, đổi trả và lịch hẹn. Gỡ kênh, bộ hẹn giờ và modal khi rời module. Các bảng phải được bật trong publication Supabase Realtime của dự án; kiểm tra việc này khi thử tích hợp.

## Kiểm thử

Chạy `node --test scripts/test/customer_auth.test.js scripts/test/customer_auth_ui.test.js scripts/test/customer_phase2.test.mjs`.

41 bài kiểm thử đạt, gồm 10 bài mới cho lỗi lưu, giữ ID địa chỉ, phiên bản cũ, phản hồi sai chủ hồ sơ, địa chỉ có tham chiếu, quyền sở hữu, cập nhật lịch không ghi được hàng nào và chuyển tab đồng thời. Các file JavaScript đã qua kiểm tra cú pháp.

Hủy và đổi lịch chỉ báo thành công sau khi Supabase xác nhận ghi đúng lịch của khách hiện tại, với trạng thái vẫn khớp lúc mở hộp thoại. Không tạo thông báo thành công hoặc cập nhật số lần hủy trong cache trước khi lưu. Đã bỏ danh sách nhân viên giả không được ghi vào lịch; yêu cầu đổi ngày/giờ chuyển về chờ xác nhận. Quy tắc giới hạn số lần, điều phối khung giờ và nghiệp vụ hoàn điểm/tồn kho của đơn hàng vẫn cần được xử lý trên máy chủ ở giai đoạn nghiệp vụ tiếp theo.

Chưa xác nhận giao dịch SQL và toàn bộ luồng web trên môi trường thật: RPC mới chưa tồn tại trước khi áp dụng migration và bản Vercel cũ chưa có các thay đổi này. Sau khi chạy SQL, kiểm tra tài khoản thử: lưu hồ sơ, thêm/xóa/chọn mặc định địa chỉ, dữ liệu rỗng, hai phiên chỉnh sửa đồng thời, lỗi CSDL không báo thành công và trạng thái đơn/lịch thay đổi từ quản trị cập nhật đúng. Không lấy việc kiểm thử bằng fixture thay cho kiểm thử SQL trực tiếp.
