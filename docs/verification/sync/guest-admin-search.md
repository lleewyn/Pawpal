# Admin tìm khách vãng lai khi tạo đơn, tìm đơn và lịch hẹn

Ngày 27/10/2026. Migration 119 đã áp dụng Supabase Cloud; thay đổi giao diện còn local, chưa push/deploy.

## Thay đổi

Ba RPC đọc cũ bỏ sót `customer.unverified_contact_phone`. Admin có thể không tìm được guest mới dù danh sách/chi tiết đã hiển thị số liên hệ sau 117. Bộ tìm đơn còn dùng số/tên người nhận làm fallback, nên người nhận khác chủ đặt có thể bị bỏ qua khi chủ đặt đã có tên/số.

- `search_admin_sales_customers`: ưu tiên số chính, dự phòng số tự khai; trả cờ `phoneUnverified` và loại khách `customerType`, không trả Auth UUID. Giữ lọc khách hoạt động và giới hạn 10 kết quả. Hai khách cùng số vẫn là hai Customer ID để Admin chọn, không tự chọn hoặc gộp.
- `get_admin_sales_order_page`: tìm theo liên hệ chủ đặt và snapshot tên/số người nhận riêng. Giữ phân trang, bộ lọc và ID đơn.
- `get_admin_service_booking_page`: dùng số tự khai khi chưa có số chính, giữ phân trang và ID lịch.

Hai hàm tìm đơn/lịch thêm điều kiện quyền `customer.read` vì nay đọc trường contact trên bảng customer. Cả ba giữ chữ ký, ACL và `SECURITY INVOKER`; không cấp quyền mới hoặc thay RLS. Apply chỉ thay hàm, không ghi dữ liệu khách/đơn/lịch, không tạo số chính hoặc bằng chứng OTP.

Trong popover chọn khách của modal tạo đơn, giao diện dùng chữ phẳng “Khách vãng lai” và “Chưa xác minh”. Sau khi chọn, contact trong thẻ xác nhận vẫn ghi chưa xác minh. Tải chi tiết theo ID chỉ diễn ra sau thao tác chọn; giữ debounce, cache theo actor, không thêm polling hoặc lượt truy vấn riêng cho nhãn.

## Bằng chứng

- [SQL rollback](admin-guest-search-rollback.txt): 9 nhóm kiểm tra, 72 SQL. Tìm hai guest cùng số riêng biệt, bỏ khách khóa, ưu tiên số member; tìm đơn theo chủ đặt và người nhận; tìm lịch theo contact; không tạo phone chính; chặn customer và anon trên cả ba RPC; SQL đảo phục hồi ba baseline và quyền; fixture Auth/staff/customer/pet/order/appointment và DDL rollback sạch.
- [Áp dụng](admin-guest-search-apply.txt): đối chiếu baseline live với 091/092/095 và SHA bằng chứng trước apply; kiểm tra body/ACL/invoker sau apply. Before/forward/reverse nằm ngoài webroot tại `D:/Aboutme/Pawpal-infra/supabase-local/backups/admin-guest-search-119/`.
- `node scripts/test/admin_orders_pos_search_ui.cjs`: Chrome với HTML/module thật và transport fixture, PASS debounce, nhãn nguồn/loại khách, chống HTML injection, chỉ tải detail khi chọn, tự điền địa chỉ/người nhận, chọn biến thể/giỏ và trạng thái rỗng. Không gọi Cloud hoặc đăng nhập Admin thật.
- Syntax hai file Admin đã sửa PASS. Không chạy lại bộ Node không liên quan; không đọc Logs hoặc stress test.

`119_admin_guest_search_rollback.sql` khôi phục đúng ba hàm cũ, không xóa hàng dữ liệu. Khôi phục sẽ làm tìm kiếm bỏ sót số tự khai như trước. Đây không phải backup toàn database.

Chưa nghiệm thu luồng guest committed → Admin Auth thật → tìm/chọn/tạo đơn → hai portal/Realtime. API khách tự sửa contact/pet, upload/Storage và các gate tổng thể vẫn giữ trạng thái chưa làm/chưa nghiệm thu tương ứng.
