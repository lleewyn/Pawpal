# Kiểm tra giai đoạn 1 ngày 10/10/2026

Cập nhật sau kiểm tra: đã bỏ phụ thuộc Phone provider trong chế độ demo. Đăng nhập và đổi mật khẩu sử dụng định danh nội bộ để tạo phiên Supabase, OTP vẫn là 555666. Kiểm tra trực tiếp Supabase khi Phone provider tắt đã tạo phiên thành công và xóa tài khoản Auth thử sau đó. 31 bài kiểm thử đạt. Điều kiện bật Phone provider bên dưới chỉ còn áp dụng cho chế độ SMS thật, không còn áp dụng cho demo. Bản Vercel vẫn cần triển khai mã mới trước khi kiểm tra toàn bộ luồng website.

Kết luận: chưa đạt trên website đã triển khai, chưa chuyển giai đoạn 2.

- Website kiểm tra: https://pawpalgr3.vercel.app (địa chỉ trong README).
- POST `/api/customer/auth/me`: HTTP 404 `NOT_FOUND`. API tài khoản mới chưa được triển khai.
- `/scripts/shared/customer-auth.js`: trả HTML thay vì JavaScript. Website chưa có bộ điều phối xác thực mới.
- Supabase: `customer_auth_serverless_ready()` đã trả true; migration OTP có hiệu lực.
- Supabase đăng nhập SĐT: `phone_provider_disabled`, `Phone logins are disabled`. OTP giả lập không cần gửi SMS, nhưng bước tạo phiên bằng SĐT/mật khẩu vẫn cần Phone provider được bật.
- 30 bài kiểm thử máy chủ và giao diện đạt. Kiểm thử kho OTP trực tiếp trước đó đạt mã sai, tranh chấp đồng thời, dùng một lần và giới hạn dùng chung.
- Chưa kiểm thử đầy đủ đăng ký, quên mật khẩu, đổi mật khẩu trên website mới vì hai điều kiện triển khai trên chưa đáp ứng. Không coi bài kiểm thử bằng fixture là bằng chứng luồng web thật đã đạt.

## Điều kiện kiểm tra lại

Triển khai mã nguồn hiện tại lên Vercel. Cấu hình ba biến Supabase ở máy chủ và `PAWPAL_SMS_MODE=demo`. Bật Phone provider trên Supabase; chế độ demo không gọi API gửi SMS. Sau đó kiểm thử bằng tài khoản thử riêng: đăng ký với mã 555666, đăng nhập, đăng xuất, mã sai, đặt lại mật khẩu, mật khẩu cũ bị từ chối, đổi mật khẩu yêu cầu mật khẩu hiện tại, tải lại trang giữ phiên và truy cập khi không có phiên bị từ chối.

Không thay đổi mật khẩu khách thật để kiểm thử. Chế độ demo dùng mã chung cho mọi khách hàng nên chỉ dùng với dữ liệu thử nghiệm.
