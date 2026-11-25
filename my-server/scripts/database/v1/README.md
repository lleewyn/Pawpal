# Schema 3NF V1 — Supabase Cloud

> **Cập nhật 25/10/2026:** đã xóa 92 script triển khai/kiểm thử CSDL local và các tệp phụ thuộc chúng. `cloud_connection.cjs` dùng PostgreSQL client trực tiếp, không chạy container. Các mục sau phần hướng dẫn hiện tại bên dưới chỉ là lịch sử, không chạy các lệnh local được nhắc trong đó.

## Hướng dẫn hiện tại

- Ứng dụng và công cụ nhập sản phẩm/dịch vụ đều kết nối project `cpzuvaplseielhgcnqrn` trên Supabase Cloud.
- `cloud_connection.cjs`: dùng `psql` và `pg_dump` cài trực tiếp. Thêm chúng vào PATH hoặc đặt biến `PAWPAL_PG_BIN` trỏ tới thư mục PostgreSQL `bin`. Không cần cài/chạy PostgreSQL server trên máy.
- Thông tin kết nối vẫn đọc từ tệp cấu hình Cloud riêng hiện có. Thư mục ngoài repo có tên `supabase-local` chỉ là vị trí lưu cấu hình/ảnh kiểm tra cũ; tên thư mục không có nghĩa là đang dùng CSDL local.
- `service_import_connection.cjs`: kết nối PostgreSQL Cloud trực tiếp qua thư viện pg, có kiểm tra chứng chỉ TLS, được importer CSV sử dụng.
- Giữ migrations SQL, thiết kế schema, kiểm thử Cloud và công cụ nhập CSV đang dùng. Không tự chạy migration/nhập dữ liệu chỉ để kiểm tra kết nối.
- Kiểm tra transport không cần mạng: `node scripts/test/cloud_connection_native.cjs`.
- Danh sách script đã gỡ: [báo cáo dọn script local](../../../docs/database/local-scripts-removal-2026-10-25.md).

## Lịch sử triển khai — không phải hướng dẫn chạy hiện tại

> Cập nhật 23/10/2026: ứng dụng chạy với Cloud mới. Bộ tương thích self-host `001–004`, `deploy_local.cjs`, preview/tunnel và các test `self_host_*` đã đưa ra kho lưu trữ ngoài repo. Các lệnh liên quan ở phần lịch sử bên dưới không còn là hướng dẫn chạy hiện tại. Giữ migrations V1 và công cụ phục hồi còn được test dùng; `cloud_connection.cjs` chạy PostgreSQL CLI dùng một lần, không cần database Supabase local. Không xóa hoặc thay đổi database Cloud/local trong đợt dọn repo.

Bộ này tạo đúng danh sách **105 bảng / 906 cột** tại mục 15 của [thiết kế V1](../../../docs/database/PAWPAL_THIET_KE_DATABASE_3NF_V1.md). Khác với bộ `self-host/001–004` tương thích mã cũ. Các bảng Auth và Storage do Supabase quản lý được giữ nguyên, không tính vào 105 bảng.

## Thành phần

- `018_admin_service_ticket.sql`: tạo phiếu phản ánh từ lịch/đánh giá vào `support_ticket`, lấy khách và người tạo từ nguồn thật; giao dịch cùng audit, chống trùng, không chuyển sang màn hình cũ để giả lập việc đã tạo phiếu. Kiểm thử: `scripts/test/service_ticket_v1_stage.cjs`.
- `017_admin_service_cashier.sql`: giao dịch máy chủ hẹp cho thu/hoàn tiền thực tế, khóa số dư và kiểm tra phiên bản, chống trùng/mã ngân hàng dùng lại; không mở ghi trực tiếp bảng tiền. Bổ sung cấu hình Tiền mặt, hủy lịch sau hoàn hết và chặn nhân viên không khả dụng. Giữ nguyên 105 bảng/906 cột. Kiểm thử: `scripts/test/service_cashier_v1_stage.cjs` và `scripts/test/services_v1_completion_stage.cjs`.

- `016_admin_pickup_notification.sql`: lưu thông báo nội bộ đón bé và kiểm toán trong cùng giao dịch, kiểm tra quyền/trạng thái/phiên bản/xác nhận sẵn sàng, chống trùng khi thử lại. Không gửi Zalo/SMS/email và không tạo nhật ký chăm sóc giả. Kiểm thử giao diện, bốn cách đóng, đồng thời và rollback: `scripts/test/pickup_notification_v1_stage.cjs`.

- `015_admin_service_logistics.sql`: đặt phòng độc quyền, nhận/trả phòng và xe một chiều/khứ hồi; giá khách sạn làm tròn lên theo 24 giờ, giá xe cộng hai lượt theo thời điểm từng lượt. Giữ nguyên schema V1. Kiểm tra ghi trên bản phục hồi: `scripts/test/logistics_v1_stage.cjs`; chính sách và giới hạn được ghi trong tài liệu nghiệm thu Dịch vụ.

- `014_admin_service_records.sql`: giao dịch biên bản tiếp nhận/bàn giao, nhật ký chăm sóc và phụ phí/dịch vụ đi cùng; có phiên bản, kiểm tra quyền, đồng ý của khách, duyệt và nhật ký kiểm toán. Không thêm bảng/cột, không tạo thanh toán hoặc điểm giả. Kiểm tra ghi: `scripts/test/service_records_v1_stage.cjs` trên bản phục hồi riêng.

- `013_admin_service_bookings.sql`: giao dịch V1 cho tạo lịch chăm sóc/xe một chiều, xác nhận/hủy/đổi nhân viên, danh mục và phản hồi đánh giá. Giữ nguyên 105 bảng/906 cột; đã thử ghi trên bản phục hồi trước khi áp dụng local và Cloud mới. Xem [tiến độ Dịch vụ V1](../../../docs/acceptance/PAWPAL_DICH_VU_V1_NGHIEM_THU.md) để phân biệt phần đã đạt với biên bản, chi phí và lưu trú còn cần chuyển.

- `012_admin_pet_profile.sql`: RPC của phân hệ Thú cưng (`save_admin_pet`, `record_admin_pet_weight`, `record_pet_contact`), giữ RLS và ghi hồ sơ/cân/audit trong transaction. Đã thử trên bản phục hồi trước khi áp dụng local và Cloud mới. Xem [nghiệm thu Thú cưng](../../../docs/acceptance/PAWPAL_THU_CUNG_V1_NGHIEM_THU.md). Không chạy lại bootstrap schema cho thay đổi này.

- `model.cjs`: đọc từ điển V1, chỉ định kiểu/NULL/default; dừng nếu danh sách không còn 105 bảng/906 cột hoặc có thuộc tính chưa định kiểu.
- `generate.cjs`: sinh `001_schema.sql` cùng [từ điển vật lý](../../../docs/database/PAWPAL_DATABASE_V1_DAC_TA_VAT_LY.md); không tự chạy migration.
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
- `import_cloud_catalogs.cjs`: đọc hai bản xuất được cung cấp, đối chiếu 100 dòng giá đầu với bản đủ 102 dòng, chuẩn hóa và tạm giữ dữ liệu sai. Backup local, thử import có đầy đủ constraint trong database riêng; chỉ `--apply` mới ghi local trong transaction. Từ chối các bảng đích đã có dữ liệu, không upsert/xóa ghi đè. SQL nhập/bản nguồn nằm ngoài webroot; kết quả tại [báo cáo nhập](../../../docs/archive/migration/PAWPAL_NHAP_DANH_MUC_CLOUD_VAO_V1.md).
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

Phân hệ Khách hàng admin local đã hoàn tất các luồng hiện có theo [bảng nghiệm thu](../../../docs/acceptance/PAWPAL_KHACH_HANG_V1_NGHIEM_THU.md), gồm migration 008–011 (trạng thái/ghi chú, điểm, thêm/sửa/gỡ/khôi phục thú cưng). Công cụ `customer_completion_local.cjs prepare` tạo backup và database/API phục hồi riêng để thử ledger; `apply <tên migration>` thử trên bản phục hồi rồi áp dụng local; `finish` kiểm tra định nghĩa RPC, backup sau triển khai và dọn môi trường thử. Không chạy bài `_stage` vào database thật hoặc tắt trigger ledger để dọn dữ liệu thử. Các đoạn mô tả chỉ mới có form thêm/sửa bên dưới là mốc nghiệm thu trước đợt hoàn tất.

Migration `007_update_customer_profile.sql` đã áp dụng cho riêng modal Sửa hồ sơ khách. `node scripts/database/v1/apply_customer_profile_local.cjs` từ thư mục gốc tạo backup, phục hồi database riêng, kiểm tra rollback khi audit lỗi rồi áp dụng migration. RPC giữ quyền invoker/RLS, không thay đổi điểm khi đổi hạng; phiên bản customer cũ trả HTTP 409. Kiểm tra Chrome/API: `node scripts/test/self_host_v1_customer_edit_live.cjs`. Khách/Auth thử được dọn; audit bất biến của thao tác thử được giữ.

Migration bổ sung `006_create_customer_quick.sql` đã áp dụng trên local cho riêng modal Thêm khách. `node apply_customer_intake_local.cjs` tạo full backup, thử migration và lỗi giữa giao dịch trên database phục hồi riêng rồi mới áp dụng; không reset schema. RPC SECURITY INVOKER giữ RLS và quyền bảng, không cấp quyền mới cho caller. Kiểm thử giao diện/RPC: `node scripts/test/self_host_v1_customer_add_live.cjs` từ thư mục gốc dự án. Form Sửa hồ sơ đã chuyển ở migration 007; khóa khách và điều chỉnh điểm chưa chuyển.

Đợt này nghiệm thu **cấu trúc database và các quy tắc đã kiểm thử**, chưa nghiệm thu toàn bộ 105 thực thể qua giao diện. Đăng nhập Admin đã chuyển sang V1 và kiểm thử tại `scripts/test/self_host_v1_login_live.cjs`; luồng bắt đổi mật khẩu dùng endpoint máy chủ chỉ gắn trên preview local, Auth nhận mật khẩu mới trước khi bỏ cờ bắt đổi. Các phân hệ còn select/upsert/RPC trỏ phone_main, vaccination_history, total_paw_points và vai trò cũ; phải chuyển theo V1. Không chạy các bộ kiểm thử baseline như bằng chứng giao diện nghiệp vụ V1 đã hoạt động.

Các chính sách giá/voucher cụ thể, cấp quyền nhân viên theo chức năng, kiểm soát chủ thể gửi chat đúng hội thoại, xác minh điện thoại/Auth, chuyển giữ tồn từ giỏ sang đơn, quy trình ghi sổ/đảo bút toán và xét hạng tự động cần API/RPC theo transaction và phép thử riêng trước khi cho sử dụng thực tế. Có trigger bảo vệ không đồng nghĩa tất cả các luồng này đã hoàn thành. Chuẩn hóa điện thoại theo quốc gia và chuẩn tên trạng thái/API phải thực hiện nhất quán khi chuyển mã.

`staff_public_view` hiện chỉ cấp authenticated/service_role và vẫn chịu RLS; chưa mở danh bạ nhân viên cho anonymous. Các view thống kê public catalog cần chính sách riêng trước khi phát hành website khách.
