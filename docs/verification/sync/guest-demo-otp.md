# OTP giả lập liên kết guest và kiểm thử đồng thời

Ngày kiểm tra: 27/10/2026. Local nối Supabase Cloud dùng chung theo phạm vi đã được cho phép; không SMS thật, không migration mới.

## Thay đổi

API đăng ký tự nhận diện phiên guest từ cookie có chữ ký, đúng nguồn gọi và đúng phone trong context máy chủ. Response OTP có `linkGuest: true`; trang đăng ký giữ cờ trong bộ nhớ và gửi lại khi hoàn tất. OTP giả lập được lưu hash có thêm hash phiên guest, nên bỏ cờ liên kết hay đổi cookie không dùng được challenge đó. Máy chủ kiểm tra lại phiên/phone trước liên kết.

Nhánh giả lập dùng `complete_guest_customer_auth` hiện có thay vì tạo hồ sơ mới qua RPC thông thường. Giữ kiểm tra phone-confirmed/Auth, owner, xung đột và thu hồi phiên của RPC 116. Auth tạo qua simulator mang `pawpal_test`; nhánh liên kết từ chối Auth đã tồn tại không có dấu test trước khi đổi mật khẩu. OTP giả lập không chứng minh quyền sở hữu số điện thoại ngoài đời; đây là phạm vi demo đã chốt.

## Bằng chứng thực tế

Lệnh: `node scripts/test/guest_demo_otp_committed_ui.cjs --run`. [Kết quả](guest-demo-otp-committed.txt).

- Chrome chạy giao diện booking, sản phẩm/giỏ/checkout và đăng ký thật; HTTP/API, PostgreSQL/Supabase Auth đều thật. Không thay verifier hay xác nhận sẵn Auth fixture.
- Gửi đúng một cặp request đồng thời cho từng thao tác tạo bé đầu tiên, tạo lịch và tạo đơn. Mỗi cặp trả cùng ID; DB committed có đúng một owner, một bé, một lịch và một đơn.
- Admin hủy đơn QA chưa thu tiền qua giao diện, giải phóng giữ kho; không giao hàng/xuất kho.
- Đăng ký bằng mã simulator do API trả, hoàn tất OTP qua hai request đồng thời: một 200, một 400. Portal đăng nhập được, reload được, RPC thành viên đọc bé cũ; đối chiếu Customer/Pet/Appointment/Order ID không đổi và không tạo owner mới.
- Cookie guest cũ sao chép và challenge đã dùng đều bị từ chối sau liên kết; mọi phiên guest của owner đã thu hồi.
- Dọn toàn bộ owner/pet/booking/order/cart/session/Auth fixture theo ID; giữ audit, không sửa ledger kho/điểm. Hai lần đầu test dừng vì tên cột catalog và cố điền contact readonly trong script kiểm thử; fixture từng lần đã dọn. Sửa script rồi chạy lại đầy đủ PASS.
- Hồi quy 86 test Node: Auth, UI Auth, cookie/link discovery, HTTP guard, commerce client, giỏ, checkout preference, pet context, profile rotation và recovery PASS. Chrome giỏ/checkout fixture đã PASS ở V1.28.

Không kiểm thử tải, không polling liên tục. Đây là một cặp request theo cùng cookie/request ID, không chứng minh tự hợp nhất mọi hồ sơ khác thiết bị cùng phone. Nhánh kích hoạt tài khoản tạm tại quầy và nghiệm thu Vercel giữ trạng thái riêng, không đánh dấu đạt dựa trên lượt này.

## Phát hành

[Kiểm tra HTTP production](guest-demo-release-check.txt): trang chủ 200, `login.js` đang chạy khác bản sửa, module giỏ guest trả 404. Vì vậy không đánh dấu đã triển khai hoặc nghiệm thu bản mới trên Vercel. Workspace liên kết project `pawpal_gr3` nhưng không có Vercel token/phiên CLI để chủ động deploy trong lượt này. Nhánh Git đang dùng là `feat/guest-admin-identity`; push nhánh không đồng nghĩa cập nhật production.

Commit `d1aede07` đã push lên `origin/feat/guest-admin-identity`. GitHub/Vercel xác nhận deployment môi trường **Preview** thành công; [bằng chứng HTTP](guest-demo-preview-check.txt). Ba đường dẫn Preview trả 302 tới Vercel SSO, nên phiên không có đăng nhập Vercel này chưa kiểm thử được giao diện Preview. Không đổi cấu hình bảo vệ và không kết luận website lỗi từ redirect đăng nhập. Production vẫn thuộc commit `51548731` theo GitHub deployments; chưa promote nhánh guest lên production.

## Khôi phục

Không có DDL cần đảo ngược. Nếu hồi quy, khôi phục commit mã trước bản vá cho `customer_auth.js`, `guest_account_link.js`, `guest_commerce.js` và `pages/public/login/login.js`; không đổi dữ liệu đã liên kết. Phiên guest đã thu hồi vẫn giữ thu hồi, không phục hồi cookie cũ. Khách đã liên kết dùng đăng nhập hoặc Quên mật khẩu của hệ thống.
