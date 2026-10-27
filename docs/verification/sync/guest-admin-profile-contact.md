# Sửa hồ sơ Admin giữ đúng nguồn số điện thoại

Ngày 27/10/2026, Asia/Bangkok. Migration 118 đã áp dụng Cloud; UI mới còn local. Không cập nhật dữ liệu hiện có khi apply, không push/deploy frontend.

## Vấn đề

Sau khi Admin hiển thị contact tự khai ở 117, form sửa hồ sơ gửi số đó trong `p_phone`. RPC cũ so với `customer_phone.is_primary`; vì guest mới chưa có phone chính, thao tác chỉ đổi tên cũng có thể chèn số tự khai vào bảng số chính hoặc báo trùng số với member khác. Việc sửa tên không phải bằng chứng sở hữu số điện thoại.

## Hành vi 118

Với guest chưa liên kết Auth, có `unverified_contact_phone` và chưa có phone chính, RPC quản lý số tự khai riêng:

- Giữ nguyên số khi sửa tên, không tạo canonical phone; session hợp lệ không bị thu hồi nếu contact không đổi.
- Client cũ gửi `p_phone=NULL` thì giữ contact hiện có, không xóa hoặc báo lỗi chỉ vì UI cũ chưa biết field mới.
- Admin đổi contact hợp lệ: cập nhật trường tự khai, không ghi phone chính hoặc chuyển quyền sở hữu. Số tự khai có thể trùng số canonical của người khác; không gộp hồ sơ. Trigger 112 hiện có thu hồi phiên commerce cũ khi contact thay đổi.
- Member và guest cũ đã có phone chính tiếp tục quy tắc cũ, gồm kiểm tra trùng số canonical. Revision/validation/permissions và địa chỉ/hạng giữ logic trước đó.

`SECURITY INVOKER`, chữ ký và ACL không đổi; không cấp thêm quyền hoặc thay RLS. Form/profile local hiển thị “Chưa xác minh”/“Khách tự cung cấp, chưa xác minh.” theo cờ nguồn, và xóa ghi chú này khi mở hồ sơ có phone chính. Không gọi số chính là đã qua OTP.

## Kiểm tra và áp dụng

[Chín kiểm tra / 65 SQL rollback](admin-guest-profile-rollback.txt): rename không tạo phone chính/thu hồi session; client cũ NULL giữ contact; đổi contact trùng canonical của fixture member vẫn tự khai và thu hồi session cũ; canonical owner giữ nguyên; member/guest truyền thống không đổi hành vi; số sai/revision cũ/canonical duplicate vẫn bị chặn; customer/anon không có quyền; reverse khôi phục body cũ; fixture Auth/staff/customer/phone/session/audit và DDL rollback sạch. Thời gian revision được truyền dạng text PostgreSQL để giữ đủ độ chính xác như payload thực tế.

[Apply Cloud](admin-guest-profile-apply.txt): kiểm tra body đang cài đúng baseline 007 và bằng chứng SHA trước apply; sau apply body/ACL/SECURITY INVOKER khớp. Chỉ thay hàm, không UPDATE khách/session/phone cũ trong bước apply.

Backup ngoài webroot: `D:/Aboutme/Pawpal-infra/supabase-local/backups/admin-guest-profile-118/`, có before/forward/reverse. `118_admin_guest_profile_contact_rollback.sql` khôi phục RPC 007, không xóa số tự khai hoặc tạo phone. Trước reverse cần dừng thao tác sửa hồ sơ guest commerce vì hành vi cũ có thể tái tạo vấn đề; đây không phải backup toàn DB.

UI test `admin_guest_profile_contact_ui.cjs` dùng HTML/module form thật và fixture state: guest mở đúng số/note chưa xác minh, chuyển sang member thì note cũ ẩn. Test không gọi Cloud hoặc giả lập đăng nhập thật; SQL ghi được kiểm riêng như trên. Syntax/whitespace PASS. Bộ Node 88 test của đợt trước không có thay đổi cần chạy lại trong lượt này.

Không đọc Logs, dùng gateway/SMS/Storage hoặc stress test. Chưa UI save qua Auth Admin thật với guest committed/Realtime hai portal. Không thay API cho khách tự sửa contact/pet; các mục đó và gate tổng thể tiếp tục mở.
