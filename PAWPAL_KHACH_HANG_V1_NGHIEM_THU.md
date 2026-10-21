# Nghiệm thu phân hệ Khách hàng V1 trên admin local

Ngày 21/10/2026. Môi trường sử dụng: `http://localhost:3001/admin/login`, Supabase self-host `http://localhost:8000`. Giữ nguyên thiết kế 105 bảng, 906 cột và 160 khóa ngoại; không thêm bảng ngoài tài liệu 3NF V1.

## Các luồng đã hoàn tất

| Luồng | Hành vi đã thực hiện và kiểm tra |
|---|---|
| Danh sách khách | Dữ liệu thật từ V1; tìm tên, mã, số điện thoại, email, thú cưng; lọc hạng/trạng thái/khiếu nại; 10 dòng/trang |
| Xuất danh sách | CSV theo đúng bộ lọc hiện tại, gồm toàn bộ kết quả; bảo vệ ô có thể bị bảng tính hiểu là công thức |
| Thêm khách | Khách, hồ sơ, điện thoại chính, hạng khởi đầu và địa chỉ/thú cưng tùy chọn trong một giao dịch; không tạo Auth hay gửi SMS |
| Sửa hồ sơ | Họ tên, điện thoại chính, email liên hệ, giới tính/ngày sinh tùy chọn, hạng và sổ địa chỉ; chặn phiên bản cũ; không tự cộng điểm khi đổi hạng |
| Sổ địa chỉ | Giữ mã địa chỉ, người nhận, số điện thoại, tỉnh/thành và mã bưu chính; đúng một địa chỉ mặc định nếu có địa chỉ; cho phép sổ địa chỉ rỗng |
| Khóa/mở khóa | Ghi `customer.customer_status`, kiểm tra phiên bản và ghi audit; RLS chặn/khôi phục quyền đọc dữ liệu của chủ hồ sơ |
| Ghi chú | Lưu có kiểm tra phiên bản và audit; giữ bản đang gõ khi có cập nhật Realtime; cảnh báo khi lưu bản cũ |
| Chính sách hạng | Đọc danh mục thật; hạng từ membership, số dư từ sổ điểm, hai khái niệm độc lập |
| Cộng/trừ điểm | RPC giao dịch phía database, kiểm tra quyền và lý do, khóa theo khách, chống yêu cầu lặp, không âm số dư; không cấp quyền ghi ledger trực tiếp cho trình duyệt |
| Lịch sử điểm | Số dư từng giao dịch theo sequence; tải đủ lịch sử, đã thử vượt 100 giao dịch; lọc/xuất CSV và phân trang 10 dòng |
| Thêm bé cưng | Chọn loài/giống từ danh mục thật; dị ứng, tập tính và cảnh báo an toàn riêng; lần cân ghi vào lịch sử và gắn nhân viên |
| Sửa bé cưng | Giữ các thuộc tính khác ngoài form, chặn phiên bản cũ và nhầm chủ nuôi; cân mới thêm lịch sử, không ghi đè lần cân trước |
| Gỡ/khôi phục bé cưng | Chưa có lịch sử: xóa hồ sơ. Đã có lịch sử: ngừng theo dõi và giữ dữ liệu, có nút khôi phục |
| Hồ sơ 360° | Đơn hàng, lịch hẹn và phiếu hỗ trợ theo đúng customer ID; phân trang 10 dòng; trạng thái thu/hoàn tính từ giao dịch thành công; lỗi nguồn hiển thị lỗi rõ ràng |
| Đồng bộ | Realtime cập nhật danh sách và hồ sơ; đã thử thêm/sửa/xóa trên hệ thống local thật |

Đã bỏ SMS kích hoạt giả và trường tiêm chủng khỏi luồng Khách hàng đang chạy. Không đọc dữ liệu nghiệp vụ từ file JSON hoặc ghép đơn từ bộ nhớ của phân hệ khác.

## Migration bổ sung

- `006_create_customer_quick.sql`: thêm khách.
- `007_update_customer_profile.sql`: sửa hồ sơ và địa chỉ.
- `008_customer_status_note.sql`: khóa/mở khóa và ghi chú.
- `009_customer_points.sql`: giao dịch cộng/trừ điểm có khóa và chống lặp.
- `010_customer_pet_add.sql`: thêm bé cưng và lần cân ban đầu.
- `011_customer_pet_edit_remove.sql`: sửa, gỡ và khôi phục bé cưng.

Các RPC thường dùng SECURITY INVOKER để giữ quyền người gọi và RLS. Riêng RPC ghi điểm dùng SECURITY DEFINER với kiểm tra quyền cụ thể để ghi sổ trong một giao dịch; không mở quyền INSERT/UPDATE/DELETE ledger cho authenticated. Các hàm mới không cấp EXECUTE cho anonymous. Đã thử từ chối người không phải nhân viên và nhân viên bị ban/bắt đổi mật khẩu.

## Bằng chứng kiểm thử

Các bài thử ghi điểm, giao dịch thu/hoàn và hồ sơ phụ thuộc chạy trên database phục hồi riêng, qua một API thử chỉ mở ở `127.0.0.1:8011`; trình duyệt vẫn dùng giao diện admin thật. Không chèn sổ điểm/kho mô phỏng vào database đang sử dụng. Bài Realtime chạy trên local thật với một hồ sơ tạm và dọn sau khi thử.

| Bộ kiểm tra | Nội dung |
|---|---|
| `self_host_v1_customers_read_live.cjs` | Đối chiếu dữ liệu giao diện với local thật |
| `self_host_v1_customer_add_live.cjs` | Form thêm khách, danh mục, địa chỉ, cân nặng và chống bấm lặp |
| `self_host_v1_customer_edit_live.cjs` | Form sửa khách, địa chỉ, Auth, hạng và sửa đồng thời |
| `customer_status_note_stage.cjs` | Khóa/mở khóa qua giao diện, RLS của khách và lưu ghi chú |
| `customer_points_stage.cjs` | Form điểm, chống lặp, trừ đồng thời, vượt số dư, lịch sử vượt 100 dòng và CSV |
| `customer_pet_add_stage.cjs` | Form thêm thú cưng và lịch sử cân |
| `customer_pet_edit_stage.cjs` | Form sửa, cân mới, nhầm chủ, gỡ/khôi phục và giữ lịch sử |
| `customer_history_export_stage.cjs` | Lịch sử theo khách, thu/hoàn, phân trang, CSV, escape nội dung và lỗi nguồn |
| `customer_permissions_rollback_stage.cjs` | Quyền caller và gây lỗi audit cuối giao dịch để xác nhận rollback sáu RPC mới |
| `customer_realtime_live.cjs` | Realtime thêm/sửa/xóa và giữ ghi chú chưa lưu trên local thật |
| `pawpoint_empty_ledger.test.cjs` | Danh sách điểm rỗng/lỗi không tự tải vô hạn |

Các file kiểm thử nằm trong `scripts/test/`. Chạy các bài có hậu tố `_stage` sau khi chuẩn bị môi trường bằng `node scripts/database/v1/customer_completion_local.cjs prepare`; áp dụng các migration 008–011 vào bản phục hồi trước khi thử. Lệnh `finish` so định nghĩa RPC giữa bản đã thử và local, tạo backup sau triển khai, sau đó dọn database/API thử. Không chạy bootstrap cũ để tạo lại public schema.

Ảnh kiểm tra từng form nằm ngoài thư mục web: `D:\Aboutme\Pawpal-infra\supabase-local\verification\v1-customer-*.png`.

## Phạm vi còn lại của dự án

- Đây là nghiệm thu phân hệ **Khách hàng của admin local**. Các nút đặt lịch, lên đơn, mở đơn/lịch/phiếu và xem hồ sơ thú cưng chuyển mã cùng thông tin sang phân hệ tương ứng; luồng xử lý của Dịch vụ, Bán hàng, Khiếu nại và phân hệ Thú cưng phải nghiệm thu riêng.
- Khóa hồ sơ hạn chế truy cập dữ liệu qua RLS; không ban tài khoản ở Supabase Auth. Không đổi mật khẩu hoặc gửi OTP/email/SMS thật trong phân hệ này.
- Hạng được chỉnh qua form hiện tại; chưa triển khai quy trình tự xét hạng theo chi tiêu. Hiển thị thu/hoàn phản ánh dữ liệu đã nhập, không tự khôi phục các giao dịch Cloud bị giữ lại do chưa đối soát.
- Ảnh/file và triển khai server online/Vercel không thuộc đợt này. Không thay `.env` Cloud hoặc cấu hình port 3000.
- Kiểm tra phiên bản sửa dựa trên `updated_at` của thực thể. Công cụ ngoài sửa riêng bảng con mà không cập nhật phiên bản cha có thể không bị phát hiện như một lần sửa hồ sơ đồng thời.

Backup trước và sau đợt hoàn tất nằm ở `D:\Aboutme\Pawpal-infra\supabase-local\backups\customers-complete-d9bc72cdf025`. Giữ credential/Auth dump riêng, không đưa lên web hoặc Git.
