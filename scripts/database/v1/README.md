# Schema 3NF V1 trên Supabase self-host

Bộ này tạo đúng danh sách **105 bảng / 906 cột** tại mục 15 của [thiết kế V1](../../../PAWPAL_THIET_KE_DATABASE_3NF_V1.md). Khác với bộ `self-host/001–004` tương thích mã cũ. Các bảng Auth và Storage do Supabase quản lý được giữ nguyên, không tính vào 105 bảng.

## Thành phần

- `model.cjs`: đọc từ điển V1, chỉ định kiểu/NULL/default; dừng nếu danh sách không còn 105 bảng/906 cột hoặc có thuộc tính chưa định kiểu.
- `generate.cjs`: sinh `001_schema.sql` cùng [từ điển vật lý](../../../PAWPAL_DATABASE_V1_DAC_TA_VAT_LY.md); không tự chạy migration.
- `001_schema.sql`: bảng/cột/comment, 160 FK, PK/UQ/CHECK, unique tổ hợp/partial và exclusion cho khoảng giá/đặt phòng/lịch ca; RLS bật toàn bộ bảng.
- `002_rules.sql`, `003_integrity.sql`: quy tắc liên bảng, quyền theo vai trò, các view giá trị suy ra, sổ điểm/kho, kiểm tra tiền và trigger audit.
- `004_staff_login_context.sql`: RPC chỉ đọc hồ sơ và quyền của Auth user đang gọi để đăng nhập Admin; không nhận Auth ID từ trình duyệt. Đã áp dụng sau khi triển khai V1. Không thêm cột/bảng legacy.
- `005_staff_unknown_hire_date.sql`: cho phép hire_date NULL khi lịch sử nguồn không có ngày vào làm, không gán ngày tạo hồ sơ thành ngày vào làm giả. Không thay danh sách 105 bảng/906 cột.
- `verify.cjs`: đối chiếu toàn bộ tên bảng/cột, kiểu, NULL, PK, số FK hợp lệ, RLS và chặn quyền anonymous ngoài ý muốn.
- `verify_integrity.sql`, `verify_policies.sql`: thử ràng buộc và RLS trong transaction rồi rollback.
- `verify_concurrency.cjs`: hai phiên PostgreSQL cạnh tranh trừ điểm, thu tiền, giữ tồn; chỉ chạy trên database kiểm thử tên được kiểm soát, sẽ bị xóa sau kiểm tra.
- `verify_api_local.cjs`: kiểm tra 105 bảng qua REST bằng limit=0; không lấy bản ghi nghiệp vụ và không in key.
- `export_cloud_reference_data.sql`: chạy trên SQL Editor của Cloud cũ để lấy 33 nhóm danh mục/cấu hình với các cột cho phép; chỉ tạo hàm tạm pg_temp và đọc dữ liệu. Tự báo bảng/cột chưa có, không đọc Auth, khách/đơn hoặc secret. Chưa phải SQL import; kết quả phải ánh xạ lại sang V1 trước khi nạp.
- `export_cloud_business_data.sql`: xuất các bảng nghiệp vụ public để chuyển tiếp khách, thú cưng, đơn/lịch, điểm, nhân sự và dữ liệu khác. Có phân trang và metadata kiểu/khóa; lọc các bảng/cột xác thực và dòng setting chứa cấu hình bí mật. Không phải full backup, không xuất dữ liệu Auth hoặc nội dung file Storage. Cần ánh xạ và đối soát trước khi nhập vào V1, không chạy chép đè các danh mục đã nhập.
- `import_cloud_catalogs.cjs`: đọc hai bản xuất được cung cấp, đối chiếu 100 dòng giá đầu với bản đủ 102 dòng, chuẩn hóa và tạm giữ dữ liệu sai. Backup local, thử import có đầy đủ constraint trong database riêng; chỉ `--apply` mới ghi local trong transaction. Từ chối các bảng đích đã có dữ liệu, không upsert/xóa ghi đè. SQL nhập/bản nguồn nằm ngoài webroot; kết quả tại [báo cáo nhập](../../../PAWPAL_NHAP_DANH_MUC_CLOUD_VAO_V1.md).
- `business_export.cjs`, `import_cloud_business.cjs`: đọc bản xuất 80 bảng, kiểm tra phân trang và số dòng; giải mã lớp escape Markdown một lần rồi parse JSON nghiêm ngặt. Lưu nguồn/backup/SQL/từ chối bên ngoài webroot. Thử từng đơn vị nhập trên bản restore riêng với đầy đủ constraint; chỉ áp dụng các đơn vị hợp lệ trong một transaction khi có `--apply`, không tắt trigger. Tạo Auth nhân viên mới bị ban theo lựa chọn người dùng; không copy quyền Cloud. Số dư điểm/kho dùng bút toán mở đầu đã được người dùng chốt; lịch sử cũ không cộng trùng. Không phải bộ nhập mặc định dùng cho dữ liệu khác chưa được rà soát; xem báo cáo nghiệp vụ để biết các nhóm chưa chuyển.
- `deploy_local.cjs`: chỉ nhận container Compose local đã biết, public phải đúng 21 bảng baseline; tạo full dump ngoài webroot, kiểm tra restore rồi dựng V1 trên database riêng. Với `--apply`, thay public trong một transaction sau khi các kiểm tra qua; không chỉnh cấu trúc Auth/Storage.

## Lệnh đã dùng

```powershell
node scripts/database/v1/generate.cjs
node scripts/database/v1/deploy_local.cjs
node scripts/database/v1/deploy_local.cjs --apply
node scripts/database/v1/verify_api_local.cjs
node scripts/database/v1/verify_restore_local.cjs
```

Lệnh deploy không phải script reset dùng lặp lại. Nó từ chối nếu schema không còn đúng baseline 21 bảng đã rà soát. Thay đổi V1 về sau phải viết migration bổ sung và giữ dữ liệu hiện tại, không chạy lại bootstrap cũ hoặc DROP schema tùy tiện.

Backup cùng log kết quả nằm dưới `D:\Aboutme\Pawpal-infra\supabase-local\backups\before-v1-*`, không ở thư mục web. Full dump có dữ liệu Auth nên giữ riêng. File SQL cài đặt riêng trong backup có mapping hồ sơ Admin cũ; không đưa lên Git. Khôi phục full dump vào bộ Supabase riêng cùng phiên bản/role để kiểm tra trước khi đổi kết nối; không pg_restore chồng lên database đang phục vụ. Khi quay lại baseline cần dùng cả mã và database cùng mốc.

## Quyết định triển khai

- Các bảng/cột đã người dùng loại không được tạo; không có SMS activation queue, branch/warehouse, shipment, bảng brand hoặc tiêm phòng.
- FK giữ lịch sử bằng NO ACTION; không xóa dây chuyền đơn, thu/hoàn, sổ điểm/kho. Các liên kết được chú thích thiếu FK trong từ điển như promotion_id vẫn có FK thật.
- Quyền ban đầu chỉ gán ADMIN cho hồ sơ đã có system_role ADMIN ở baseline. Các staff khác không tự nhận quyền mới. Auth ID, mật khẩu và hồ sơ staff hiện có được giữ; không thêm tài khoản đăng nhập giả.
- Có 210 mã quyền table.read/table.write. Chính sách kiểm tra staff active, không bị yêu cầu đổi mật khẩu và không bị Auth ban. Mặc định không cấp quyền; RLS có đọc hồ sơ/điểm/số điện thoại/địa chỉ/thú cưng của chính khách. Các endpoint khách tự sửa dữ liệu vẫn phải xây riêng.
- Thu/hoàn, điểm, sổ kho, giữ tồn và dùng voucher chỉ ghi qua máy chủ; client không có quyền ghi trực tiếp. Điều này tránh nhiều request độc lập làm hỏng giao dịch. API/RPC nghiệp vụ dùng chúng chưa được chuyển trong đợt dựng schema.
- Danh mục vai trò/quyền là cấu hình hệ thống cần cho RLS, không phải dữ liệu mô phỏng nghiệp vụ. Không seed khách, thú cưng, đơn, số dư hoặc ảnh giả.
- Các bảng ảnh/file có cấu trúc nhưng chưa phát triển upload; OTP/email vẫn ngoài phạm vi gửi thật. Vector dùng pgvector không khóa số chiều khi chưa chọn mô hình embedding.
- Các view suy ra chạy security_invoker để giữ RLS của nguồn: cân hiện tại, điểm, chi tiêu, tổng đơn/lịch và danh sách staff rút gọn. Không tạo cột vật lý cũ để làm code cũ tiếp tục chạy.

## Giới hạn nghiệm thu

Phân hệ Khách hàng admin local đã hoàn tất các luồng hiện có theo [bảng nghiệm thu](../../../PAWPAL_KHACH_HANG_V1_NGHIEM_THU.md), gồm migration 008–011 (trạng thái/ghi chú, điểm, thêm/sửa/gỡ/khôi phục thú cưng). Công cụ `customer_completion_local.cjs prepare` tạo backup và database/API phục hồi riêng để thử ledger; `apply <tên migration>` thử trên bản phục hồi rồi áp dụng local; `finish` kiểm tra định nghĩa RPC, backup sau triển khai và dọn môi trường thử. Không chạy bài `_stage` vào database thật hoặc tắt trigger ledger để dọn dữ liệu thử. Các đoạn mô tả chỉ mới có form thêm/sửa bên dưới là mốc nghiệm thu trước đợt hoàn tất.

Migration `007_update_customer_profile.sql` đã áp dụng cho riêng modal Sửa hồ sơ khách. `node scripts/database/v1/apply_customer_profile_local.cjs` từ thư mục gốc tạo backup, phục hồi database riêng, kiểm tra rollback khi audit lỗi rồi áp dụng migration. RPC giữ quyền invoker/RLS, không thay đổi điểm khi đổi hạng; phiên bản customer cũ trả HTTP 409. Kiểm tra Chrome/API: `node scripts/test/self_host_v1_customer_edit_live.cjs`. Khách/Auth thử được dọn; audit bất biến của thao tác thử được giữ.

Migration bổ sung `006_create_customer_quick.sql` đã áp dụng trên local cho riêng modal Thêm khách. `node apply_customer_intake_local.cjs` tạo full backup, thử migration và lỗi giữa giao dịch trên database phục hồi riêng rồi mới áp dụng; không reset schema. RPC SECURITY INVOKER giữ RLS và quyền bảng, không cấp quyền mới cho caller. Kiểm thử giao diện/RPC: `node scripts/test/self_host_v1_customer_add_live.cjs` từ thư mục gốc dự án. Form Sửa hồ sơ đã chuyển ở migration 007; khóa khách và điều chỉnh điểm chưa chuyển.

Đợt này nghiệm thu **cấu trúc database và các quy tắc đã kiểm thử**, chưa nghiệm thu toàn bộ 105 thực thể qua giao diện. Đăng nhập Admin đã chuyển sang V1 và kiểm thử tại `scripts/test/self_host_v1_login_live.cjs`; luồng bắt đổi mật khẩu dùng endpoint máy chủ chỉ gắn trên preview local, Auth nhận mật khẩu mới trước khi bỏ cờ bắt đổi. Các phân hệ còn select/upsert/RPC trỏ phone_main, vaccination_history, total_paw_points và vai trò cũ; phải chuyển theo V1. Không chạy các bộ kiểm thử baseline như bằng chứng giao diện nghiệp vụ V1 đã hoạt động.

Các chính sách giá/voucher cụ thể, cấp quyền nhân viên theo chức năng, kiểm soát chủ thể gửi chat đúng hội thoại, xác minh điện thoại/Auth, chuyển giữ tồn từ giỏ sang đơn, quy trình ghi sổ/đảo bút toán và xét hạng tự động cần API/RPC theo transaction và phép thử riêng trước khi cho sử dụng thực tế. Có trigger bảo vệ không đồng nghĩa tất cả các luồng này đã hoàn thành. Chuẩn hóa điện thoại theo quốc gia và chuẩn tên trạng thái/API phải thực hiện nhất quán khi chuyển mã.

`staff_public_view` hiện chỉ cấp authenticated/service_role và vẫn chịu RLS; chưa mở danh bạ nhân viên cho anonymous. Các view thống kê public catalog cần chính sách riêng trước khi phát hành website khách.
