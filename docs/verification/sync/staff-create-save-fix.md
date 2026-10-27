# Sửa thông báo và kiểm tra đầu vào khi thêm nhân viên

Ngày: 27/10/2026. Đã push/deploy production sau yêu cầu của người dùng.

## Nguyên nhân đã tái hiện

Trên Admin production → Nhân sự → Thêm nhân viên, nhập họ tên/chức vụ nhưng bỏ trống email công vụ đăng nhập và mật khẩu tạm: endpoint `provision-account` trả HTTP 400, thông báo yêu cầu email/mật khẩu và quyền nếu cho đăng nhập. Giao diện thay thông báo đó bằng câu chung “Không thể lưu hồ sơ. Kiểm tra thông tin và quyền thực hiện.”, nên không biết thiếu ô nào. Mật khẩu cũng chưa có dấu bắt buộc.

Thiết kế cấp nhân sự hiện tại luôn tạo Auth identity, khóa đăng nhập nếu chưa bật cho phép; vì vậy email đăng nhập và mật khẩu tạm vẫn cần khi checkbox chưa chọn. Không thay đổi mô hình này hoặc bỏ kiểm tra quyền của API. Đây là nguyên nhân được tái hiện, không khẳng định mọi lỗi thêm nhân viên đều do thiếu dữ liệu.

## Thay đổi

- Trước khi gọi API, kiểm tra họ tên, chức vụ, email đăng nhập, mật khẩu 6–128 ký tự; nếu cho đăng nhập thì cần vai trò hoặc quyền đã chọn.
- Hiện thông báo cụ thể, focus ô cần sửa và ARIA liên kết lỗi. Không gửi yêu cầu tạo Auth khi dữ liệu thiếu.
- Hiển thị nguyên thông báo an toàn do endpoint quản lý tài khoản trả về, kèm mã yêu cầu; giữ dữ liệu form khi thất bại. Lỗi RPC sửa hồ sơ vẫn dùng các thông báo được ánh xạ sẵn, không đưa lỗi CSDL thô lên giao diện.
- Đánh dấu mật khẩu tạm bắt buộc khi thêm; ẩn dấu khi xem/sửa hồ sơ hiện có. Giới hạn chiều dài email theo API.

## Kiểm thử

`node scripts/test/staff_create_validation_ui.cjs --run` PASS. [Kết quả](staff-create-validation.txt).

Chrome đăng nhập Admin thật trên production, chỉ thay transport của hai asset HTML/JS form bằng bản local. API và CSDL/Auth Cloud thật. Các trường thiếu, quyền trống khi bật đăng nhập đều bị chặn trước POST, có thông báo/focus/ARIA. Một response 409 giả lập xác minh thông báo API được giữ, không gọi đó là lỗi email trùng thật trên CSDL.

Một lần tạo nhân viên QA hợp lệ qua giao diện trả HTTP 200, lưu đúng tên/chức vụ, `must_change_password=true`, Auth vẫn bị khóa và không có vai trò được cấp. Modal đóng sau lưu. Nhân viên/Auth QA được xóa chính xác theo ID; audit giữ nguyên, không sửa nhân viên có sẵn. Lượt test trước đã tạo thành công nhưng câu chờ modal dùng nhầm điều kiện visible; sửa script, dọn fixture và chạy lại đầy đủ PASS.

`node --test scripts/test/staff_auth_cloud.test.cjs`, kiểm tra cú pháp file JS và `git diff --check` PASS. Không migration, không Supabase Logs, không polling hoặc load test.

Bản `a6635fed` đã push lên `origin/main`, Vercel deployment success. Hai asset staff production khớp source. Chrome đăng nhập Admin thực tế, mở Thêm nhân viên và xác nhận lỗi thiếu email hiện rõ/focus đúng ô, dấu bắt buộc mật khẩu hiển thị; không gửi request provisioning hoặc tạo dữ liệu thử trong lượt kiểm tra sau phát hành. [Bằng chứng production](staff-create-production.txt). Lượt tạo nhân viên Cloud hợp lệ đã kiểm ở trên; không tạo lại nhân viên chỉ để kiểm tra deployment.
