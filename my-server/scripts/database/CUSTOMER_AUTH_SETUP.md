# Bật xác thực khách hàng giai đoạn 1

Bản sửa dùng Supabase Auth để quản lý mật khẩu và phiên đăng nhập. Không dùng mật khẩu trong `public.customer` hoặc dữ liệu lưu cục bộ để xác thực.

## Thứ tự áp dụng

1. Sao lưu CSDL. Chạy `20261010_customer_auth_security.sql` trong Supabase SQL Editor bằng tài khoản quản trị. Migration chạy trong một transaction: chuyển mật khẩu cũ sang schema riêng không được công khai qua API, xóa giá trị trong bảng public, thêm quyền và RPC chỉ dành cho máy chủ.
2. Chạy `node scripts/migrate_customer_auth.js` để kiểm tra số tài khoản cần chuyển, sau đó `node scripts/migrate_customer_auth.js --apply`. Script tạo tài khoản Supabase Auth bằng mật khẩu cũ, liên kết ID, rồi xóa mật khẩu cũ khỏi schema riêng. Không in mật khẩu ra terminal. Nếu đã có tài khoản Auth cho số điện thoại đó, giữ mật khẩu Auth hiện tại. Nếu dừng giữa chừng, có thể chạy lại.
3. Chạy thêm `20261010_customer_auth_vercel_otp.sql` trong cùng dự án Supabase. File tạo kho OTP và giới hạn dùng chung cho các lần chạy API Vercel, rồi yêu cầu tải lại bộ nhớ đệm schema.
4. Trên Vercel, cấu hình `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` và `PAWPAL_SMS_MODE=supabase`, sau đó triển khai lại. Với máy local, khởi động lại bằng `npm run dev`.
4. Đăng nhập thử bằng một tài khoản kiểm thử. Tài khoản tạm không có mật khẩu phải xác thực OTP để kích hoạt. Phiên đăng nhập cũ chỉ có localStorage cần đăng nhập lại.

Khóa `SUPABASE_SERVICE_ROLE_KEY` chỉ đặt ở máy chủ. Cần có `SUPABASE_URL` và `SUPABASE_ANON_KEY` khớp cùng dự án. API sẽ từ chối xử lý nếu chưa có migration; không quay lại xác thực cũ.

## SMS giả lập trên máy local

Trong `.env` của máy phát triển:

```dotenv
NODE_ENV=development
PAWPAL_SMS_MODE=console
PAWPAL_AUTH_TEST_PHONES=SO_DIEN_THOAI_THU_NGHIEM
```

OTP được sinh ngẫu nhiên và hiển thị ở terminal máy chủ dưới dạng `[SMS LOCAL]`. Không trả OTP qua HTTP, không hiển thị trên giao diện. Mã có hạn dùng 5 phút, tối đa 5 lần nhập, chỉ dùng một lần. Gửi lại sau ít nhất 60 giây và hủy mã cũ. Máy chủ chỉ cho phép truy cập giả lập từ địa chỉ loopback; không dùng qua LAN, tunnel hay reverse proxy.

Chế độ giả lập vẫn tạo/liên kết tài khoản và đổi mật khẩu thật trên dự án Supabase đã cấu hình. Dùng dự án thử nghiệm và tài khoản thử nghiệm riêng; không nhập số điện thoại của khách thật để thử kích hoạt/đặt lại mật khẩu.

## SMS thật

```dotenv
NODE_ENV=production
PAWPAL_SMS_MODE=supabase
```

Bật Phone Auth và cấu hình nhà cung cấp SMS trong Supabase Auth. Đặt OTP expiry 300 giây và bật giới hạn gửi/xác thực của Supabase. Máy chủ gửi và xác minh OTP qua Supabase Auth. Mật khẩu mới chỉ được lưu sau khi OTP hợp lệ; đổi mật khẩu trong tài khoản yêu cầu phiên hợp lệ và mật khẩu hiện tại đúng.

Challenge và giới hạn bổ sung được lưu trong schema riêng của Supabase, chỉ máy chủ có quyền truy cập. Các lần chạy API Vercel dùng chung trạng thái; nhận quyền xử lý mã được khóa nguyên tử trong CSDL. Mã chỉ lưu dạng băm, hết hạn sau 5 phút và bị hủy khi gửi lại.

## Thử trên Vercel Preview khi chưa có dịch vụ SMS

Theo cấu hình demo hiện tại, `PAWPAL_SMS_MODE=demo` (cũng là mặc định khi không có biến này) cho mọi SĐT khách hàng dùng mã cố định `555666`, kể cả Vercel Production. Không cần danh sách số thử hoặc dịch vụ SMS. Tài khoản nhân sự và khách bị khóa vẫn bị từ chối. Đây không phải xác minh quyền sở hữu số điện thoại: ai biết SĐT cũng có thể đặt lại mật khẩu. Chỉ sử dụng với dữ liệu thử nghiệm; chuyển sang `supabase` trước khi phục vụ khách thật. Chế độ demo tạo phiên bằng định danh nội bộ của tài khoản Auth, không cần bật Phone provider; người dùng vẫn nhập SĐT và không cần email. Email hiện có của Auth được giữ nguyên, tài khoản chưa có email được gắn địa chỉ nội bộ theo UUID và không gửi thư. Nếu Vercel đã có biến `PAWPAL_SMS_MODE`, đổi thành `demo` rồi triển khai lại.

Trong Vercel, mở dự án Pawpal → Settings → Environment Variables. Thêm `PAWPAL_SMS_MODE=preview` và `PAWPAL_AUTH_TEST_PHONES` chứa số thử 10 chữ số, chỉ chọn môi trường **Preview**. Ba biến Supabase cũng phải có trên Preview và cùng dự án đã chạy SQL. Tham khảo `.env.preview.example`, không đưa khóa máy chủ vào mã trình duyệt. Sau khi lưu, triển khai lại bản Preview để nhận biến mới.

Mở URL bản Preview, chọn đăng ký và nhập số thử chưa thuộc khách hàng hay nhân viên. Sau khi yêu cầu OTP, nhập mã cố định `555666` xuất hiện trên giao diện để hoàn tất. Mã vẫn có thời hạn, giới hạn số lần nhập và chỉ dùng cho challenge hiện tại. Tài khoản mới được đánh dấu là tài khoản thử tại máy chủ; không tự đánh dấu tài khoản khách thật là tài khoản thử.

Đặt `PAWPAL_SMS_MODE=preview` và `PAWPAL_AUTH_TEST_PHONES` là danh sách số thử nghiệm, phân cách bằng dấu phẩy. Mã thử xuất hiện ngay trên giao diện, không gửi SMS. Chế độ này chỉ chạy khi `VERCEL_ENV=preview`; bản Production từ chối giả lập. Tài khoản Auth đã tồn tại phải có `app_metadata.pawpal_test=true` và nằm trong danh sách số thử. Tài khoản khách thật bị từ chối ngay cả khi số được thêm vào danh sách.

Để nhận OTP thật trên điện thoại, phải bật Phone Auth và cấu hình dịch vụ SMS trong Supabase. Chạy SQL hoặc triển khai lên Vercel không tự cung cấp dịch vụ gửi SMS.

## Kiểm thử

```powershell
node --test scripts/test/customer_auth.test.js scripts/test/customer_auth_ui.test.js
```

Các bài kiểm thử này không ghi vào Supabase thật. Cần chạy kiểm thử tích hợp sau khi áp dụng SQL, gồm đăng ký/kích hoạt, đăng nhập, đổi mật khẩu, OTP sai/hết hạn/dùng lại, tài khoản bị khóa và nhân sự bị từ chối ở cổng khách.

## Phạm vi cần kiểm tra khi bật quyền mới

Migration giới hạn truy cập bảng `customer` theo Supabase Auth. Tra cứu/tạo hồ sơ khách vãng lai trong đặt lịch và thanh toán đã được chuyển sang API máy chủ: chỉ trả ID hồ sơ để tiếp tục nghiệp vụ, không cấp phiên đăng nhập hay thay đổi tài khoản hiện có. Cần kiểm thử tích hợp hai luồng này trên dự án thử nghiệm trước khi bật production. Quyền trên các bảng nghiệp vụ khác cần kiểm tra tiếp trong giai đoạn 3.

Luồng thay số điện thoại nhận hàng và số điện thoại đăng nhập cần được tách riêng. Migration chặn thay số đăng nhập trực tiếp trong form hồ sơ; thay số đăng nhập phải qua xác thực số mới bằng Supabase Auth.

Tài liệu Supabase: [đăng nhập bằng số điện thoại](https://supabase.com/docs/guides/auth/phone-login), [xác minh OTP](https://supabase.com/docs/reference/javascript/auth-verifyotp), [đăng nhập bằng mật khẩu](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).
