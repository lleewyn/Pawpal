# Đổi hàng: giao diện, HTTP và Cloud — 26/10/2026

Đã bổ sung hai lớp kiểm chứng sau khi migration 108 được triển khai. Kết quả dưới đây **không đóng ô E2E toàn chuỗi**.

## Giao diện → HTTP thử nghiệm → RPC/RLS Cloud

[11 kiểm tra PASS](sales-replacements-http-rollback.txt), 147 SQL và 15 request HTTP nghiệp vụ, tổng response JSON 23.148 byte. Đây là số đo trong bộ kiểm thử, chưa bao gồm tài nguyên tĩnh/TLS và không phải tổng egress production.

- Dùng HTML và mã thật của modal tạo đơn thay thế Admin, bộ render RMA Admin và trang chi tiết RMA khách. Các phản hồi nghiệp vụ lấy từ Supabase Cloud, không trả dữ liệu fixture tĩnh thay cho RPC.
- Modal tạo đơn thành công qua HTTP; double-click chỉ gửi một RPC. Khách tải lại trang thấy đơn đổi liên kết và thông báo không thu thêm tiền.
- Hành động giao/hoàn tất được bộ kiểm thử gọi vào RPC fulfillment hiện có. Khách tải lại thấy đúng `E2E-HTTP-TRACK`, trạng thái đang giao rồi hoàn tất; bộ render Admin đọc cùng kết quả.
- Hai request HTTP đọc A/B được gửi đồng thời: A có liên kết, B nhận rỗng. B gọi RPC Admin qua HTTP bị `42501`. Hàng thay thế được xuất đúng hai đơn vị sau khi hàng cũ đã nhận/kiểm định.
- Một transaction PG duy nhất chứa toàn bộ fixture, luôn rollback. Xác minh không còn đơn gốc/đơn thay thế/customer/auth fixture. Server chỉ bind loopback, tài nguyên tĩnh có allowlist, endpoint dữ liệu yêu cầu token thử nghiệm ngẫu nhiên.
- [Ảnh timeline khách đọc từ Cloud](sales-replacement-http-customer.png).

**Giới hạn:** bridge HTTP này phục vụ riêng kiểm thử. API bootstrap được rút gọn; định danh A/B/Admin là fixture claims trên SQL, không phải phiên Supabase Auth. Role và query được tuần tự hóa trên một kết nối PG để tránh lẫn danh tính trong transaction. Chưa kiểm tra PostgREST embedding, commit, Realtime delivery hoặc hai DB writer đồng thời bằng lượt này. Modal giao hàng production cũng chưa được chạy trong lượt này.

## Đăng nhập Admin thật và PostgREST chỉ đọc

[PASS với 6 request Auth/REST](sales-replacements-auth-readonly.txt), không ghi dữ liệu nghiệp vụ.

- Dùng trang đăng nhập và mã Auth thật, tài khoản Admin kiểm thử private đã có. Không đưa email/mật khẩu/token vào báo cáo.
- Đăng nhập Supabase Auth thành công, `get_staff_login_context` cấp đúng đường vào Admin. Cờ đổi/gửi bù bật theo cấu hình local.
- Truy vấn thực qua PostgREST đọc quan hệ `return_request → sales_replacement → sales_order` thành công; kiểm tra được schema cache/quan hệ triển khai, không chỉ dùng SQL ghép JSON trong bridge.
- Đọc bảng liên kết dưới phiên Admin và gọi hàm thu ngân đã triển khai thành công. Mỗi GET giới hạn tối đa một dòng; bảng liên kết hiện trả 0 dòng, không tự tạo dữ liệu để ép kết quả có hàng.
- Route trình duyệt chặn mọi ghi REST nghiệp vụ ngoài hai RPC chỉ đọc đã cho phép. Không mở toàn bộ Dashboard/Admin portal để tránh kéo thêm danh sách không liên quan.

**Giới hạn:** đăng nhập Admin thật không thay thế Auth khách A/B, CRUD commit hoặc kiểm thử full portal. Không có thao tác tạo, giao hàng hoặc hoàn tiền trên dữ liệu thật.

## Tái hiện khi cần

```text
node scripts/test/sync_sales_replacements_http_rollback.cjs --cloud
node scripts/test/sales_replacements_auth_readonly.cjs --cloud
```

Cả hai script mặc định không kết nối nếu thiếu `--cloud`; không nằm trong batch offline. Không chạy lại chỉ để cập nhật tài liệu. Không Logs/load test, không tạo migration hoặc sửa dữ liệu thật trong đợt này.

Còn nghiệm thu: Auth khách, giao diện đầy đủ Admin/khách với commit và reload, Realtime delivery thật, hai kết nối ghi đồng thời. Frontend chưa push/deploy. Các mục này giữ trống trong checklist.
