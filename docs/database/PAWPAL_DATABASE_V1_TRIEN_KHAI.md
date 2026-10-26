# Database V1 đã triển khai trên Supabase local

> Tài liệu lịch sử ngày 21/10/2026. Hiện dự án dùng Supabase Cloud; các script local được nhắc bên dưới đã được gỡ ngày 25/10/2026. Hướng dẫn hiện tại: [Supabase Cloud](../../scripts/database/v1/README.md).

Ngày: 21/10/2026. Môi trường: Supabase self-host trên máy hiện tại, database `postgres`, schema `public`. Thiết kế nguồn: [3NF V1](PAWPAL_THIET_KE_DATABASE_3NF_V1.md).

**Trạng thái mới nhất — đã hoàn tất phân hệ Khách hàng trên admin local:** danh sách/lọc/CSV, thêm/sửa khách, địa chỉ, khóa/mở khóa, ghi chú, cộng/trừ và lịch sử điểm, thêm/sửa/gỡ/khôi phục thú cưng, hồ sơ đơn/lịch/phiếu và Realtime đã kiểm tra. Migration 008–011 đã áp dụng, không thêm bảng/cột. Đã thử quyền caller, chống lặp, sửa đồng thời, trừ điểm đồng thời và rollback khi audit lỗi. Xem [bảng nghiệm thu và giới hạn phạm vi](../acceptance/PAWPAL_KHACH_HANG_V1_NGHIEM_THU.md). Các đoạn “khóa khách/điều chỉnh điểm chưa chuyển” phía dưới là mốc trước đợt hoàn tất này. Các phân hệ Dịch vụ, Bán hàng, Khiếu nại và Thú cưng độc lập vẫn cần nghiệm thu riêng.

**Cập nhật form Sửa hồ sơ khách hàng:** đã áp dụng `007_update_customer_profile.sql` trên local; giữ nguyên 105 bảng/906 cột. RPC SECURITY INVOKER lưu hồ sơ, điện thoại chính, email liên hệ, hạng, sổ địa chỉ và audit trong một giao dịch, giữ RLS/quyền hiện có. Đổi hạng không tạo hay tăng điểm; email liên hệ không đổi email Auth. Giữ ID địa chỉ, người nhận và mã bưu chính; tỉnh/thành là trường riêng. Hồ sơ chưa có giới tính/ngày sinh/địa chỉ không bị tự điền dữ liệu. Khi đổi số điện thoại chính, trạng thái xác minh cũ bị xóa. Lần sửa dùng phiên bản `customer.updated_at` đã mở form; phiên bản cũ nhận HTTP 409 và form báo cần làm mới. Không bảo đảm phát hiện sửa riêng bảng con từ công cụ ngoài mà không cập nhật phiên bản customer.

Kiểm thử: `node scripts/test/self_host_v1_customer_edit_live.cjs` đã qua Chrome: lỗi tại trường, đóng modal bốn cách, lưu hai lần chỉ gửi một yêu cầu, thêm/đổi mặc định/xóa địa chỉ, giữ dữ liệu người nhận, đổi hạng không tặng điểm, giữ email Auth, từ chối địa chỉ của khách khác/số điện thoại trùng/người không phải nhân viên, và chặn sửa đồng thời bằng phiên bản cũ. Bản database phục hồi đã thử gây lỗi ở bước audit cuối cùng để xác nhận rollback tất cả thay đổi trước đó. Backup trước migration: `D:\Aboutme\Pawpal-infra\supabase-local\backups\customer-profile-9cbd6165ce75`. Khách/Auth kiểm thử đã xóa; audit của các thao tác kiểm thử được giữ theo quy tắc bất biến. Khóa khách và điều chỉnh điểm vẫn chưa chuyển V1.

**Cập nhật form Thêm khách:** đã triển khai migration `006_create_customer_quick.sql` trên local, không thêm bảng/cột. RPC chạy theo quyền người gọi và RLS, lưu khách/hồ sơ/điện thoại chính/hạng khởi đầu cùng địa chỉ và thú cưng tùy chọn trong một giao dịch. Email liên hệ và Auth ID để NULL; không gửi OTP/SMS, không tạo điểm, không tự đặt tỉnh/thành. Danh mục loài/giống đọc trực tiếp từ database; cân nặng ghi vào `pet_weight_history` với nhân viên đang đăng nhập. Chrome đã kiểm tra báo lỗi tại trường, đóng modal bốn cách, chống bấm lưu hai lần, thêm khách tối thiểu và khách kèm thú cưng/địa chỉ; RPC kiểm tra hai yêu cầu trùng điện thoại và từ chối anonymous/người không phải nhân viên. Dữ liệu kiểm thử đã xóa. Đã phục hồi bản sao database và cố tình gây lỗi ở bước địa chỉ để xác nhận rollback cả hồ sơ trước khi áp dụng. Backup trước migration: `D:\Aboutme\Pawpal-infra\supabase-local\backups\customer-intake-346a63cf64d1`. Kiểm tra: `node scripts/test/self_host_v1_customer_add_live.cjs`. Form Sửa hồ sơ đã được chuyển trong cập nhật phía trên; khóa khách và điều chỉnh điểm còn chờ chuyển.

**Cập nhật giao diện đọc Khách hàng:** preview `http://localhost:3001/admin/login` đã đọc V1 cho danh sách, điện thoại chính, địa chỉ, thú cưng và cân nặng, hạng thành viên, chính sách hạng, số dư và lịch sử điểm. Hạng lấy từ quan hệ membership; điểm lấy từ sổ giao dịch, không suy ra hạng theo điểm. Hồ sơ đọc đơn/lịch/ticket dùng cột V1; thanh toán đơn hiển thị “Chưa đối soát” trong khi chưa triển khai đối soát giao dịch. Đã kiểm tra bằng Chrome với Admin thật: 35 khách, 22 membership, 4 hạng, 14 bút toán và tổng 7.964 điểm; 10 dòng/trang, không gọi Cloud và không có REST lỗi trong luồng đọc. Kiểm tra: `node scripts/test/self_host_v1_customers_read_live.cjs`. Chưa nghiệm thu CRUD toàn phân hệ.

**Cập nhật sau nhập nghiệp vụ:** đã chuyển phần hợp lệ từ bản xuất Cloud 80 bảng/2.167 dòng: 35 khách, 76 địa chỉ, 82 thú cưng, 16 nhân viên thêm mới bị khóa Auth, 71 lịch và 23 đơn cùng các dữ liệu phụ thuộc. Giữ số dư điểm 7.964 và tồn 4.382 bằng bút toán chuyển hệ thống theo lựa chọn người dùng. Admin local cũ giữ nguyên. Không phải tất cả dòng nguồn đã nhập: các lỗi tổng tiền, ngày sinh tương lai hoặc thiếu quan hệ được lưu riêng; xem [báo cáo chuyển dữ liệu nghiệp vụ](../archive/migration/PAWPAL_NHAP_DU_LIEU_NGHIEP_VU_V1.md). Các đoạn mô tả database rỗng bên dưới là mốc nghiệm thu schema trước nhập dữ liệu.

## Kết quả thực tế

| Nội dung kiểm tra sau triển khai | Kết quả |
|---|---:|
| Bảng nghiệp vụ V1 | 105/105 |
| Cột theo từ điển V1 | 906/906 |
| Bảng ngoài V1 trong public | 0 |
| Bảng/cột V1 còn thiếu | 0 |
| Khóa ngoại hợp lệ | 160 |
| Bảng bật RLS | 105 |
| Mã quyền đọc/ghi theo bảng | 210 |
| Bảng V1 truy cập được qua REST (limit=0) | 105/105 |

Đã kiểm tra cả kiểu dữ liệu, NULL và PK của từng cột/bảng; không chỉ so tên. Supabase Auth và Storage không bị tạo lại. Auth ID và mật khẩu hiện có được giữ nguyên; hồ sơ Admin cũ chuyển sang staff V1 và liên kết vai trò ADMIN. Studio vẫn ở `http://localhost:8000` và dùng tài khoản Studio cũ.

Các bảng/cột cũ ngoài thiết kế đã được loại khi thay schema: customer_activation_sms, phone_main vật lý, token kích hoạt trong customer, species/breed/weight/vaccination_history trong pet_profile, tổng điểm nhập tay trong membership và vai trò text cũ. Không tạo lại chi nhánh, bảng kho riêng, shipment, brand hoặc nghiệp vụ thú y.

Sau triển khai, không có khách, thú cưng hoặc đơn hàng thử nghiệm lưu lại trong database chính. Giữ một Auth user và một hồ sơ staff hiện có; danh mục ADMIN/quyền là cấu hình hệ thống.

## SQL và đặc tả

- [Bộ migration V1 và cách kiểm tra](../../scripts/database/v1/README.md).
- [Đặc tả kiểu dữ liệu, NULL/default và khóa cho 906 cột](PAWPAL_DATABASE_V1_DAC_TA_VAT_LY.md).
- [Báo cáo metadata đang chạy](scripts/database/self-host/schema-audit.generated.md): toàn bộ bảng/cột, FK, CHECK, index, RLS, Realtime, view và trigger thực tế.
- [Báo cáo sai khác trước khi chuyển](../archive/migration/PAWPAL_DOI_CHIEU_DATABASE_SELF_HOST_VOI_3NF_V1.md): lưu lịch sử vì sao phải thay baseline.

## Kiểm tra đã qua

1. Full dump baseline được khôi phục vào database riêng; Auth fingerprint và danh sách 21 bảng cũ khớp trước khi đổi database chính.
2. Dựng V1 từ public rỗng trên database kiểm thử: đủ 105 bảng/906 cột, đúng kiểu/NULL/PK, đủ 160 FK và RLS.
3. Kiểm tra transaction cho số điện thoại chính/địa chỉ mặc định; FK chủ nuôi, cân nặng hiện tại, khoảng giá không chồng lấn, XOR dòng dịch vụ/thu tiền, biên bản đã xác nhận, thu/hoàn, số dư điểm, tồn và giữ tồn, trả hàng/đánh giá, khách của ticket. Fixture được rollback hoặc chỉ tồn tại trong database dùng một lần.
4. Hai phiên PostgreSQL chạy đồng thời trừ điểm, thu tiền và giữ tồn: mỗi tình huống chỉ một phiên thành công, phiên còn lại bị chặn khi vượt hạn mức.
5. RLS: ADMIN cũ có quyền tương ứng; danh tính chưa gắn staff và anonymous không đọc dữ liệu staff/quyền; staff ngừng hoạt động hoặc bắt đổi mật khẩu mất quyền; client không ghi trực tiếp vào sổ điểm.
6. Sau khi áp dụng, đủ 105 bảng được REST nhận diện; bảng queue SMS cũ trả 404, cột phone_main cũ không còn.
7. Full dump V1 đã được khôi phục lại vào database riêng: 105 bảng/906 cột/160 FK/RLS, Auth fingerprint và các chính sách RLS khớp. Các database kiểm thử được xóa sau kiểm tra.

## Bản sao và đường quay lui

- Bản trước chuyển: `D:\Aboutme\Pawpal-infra\supabase-local\backups\before-v1-2026-10-21T08-54-15-778Z\baseline-full.dump`.
- Bản V1 đã thử restore: `D:\Aboutme\Pawpal-infra\supabase-local\backups\v1-verified-57be25156d399101\v1-full.dump`.
- Mỗi thư mục có SHA256 và kết quả xác minh. File dump có dữ liệu Auth; giữ ngoài webroot/Git.

Các bản sao hiện ở cùng máy, chưa phải lịch backup tự động hoặc bản sao ngoài máy. Restore đã thử trong cùng cụm PostgreSQL có sẵn các role Supabase; chuyển máy mới cần giữ phiên bản/role tương ứng và thử lại. Không phục hồi đè tùy tiện lên database đang phục vụ. Nếu quay về baseline, phải dùng cả database và mã/cấu hình tương ứng.

## Phần chưa hoàn thành

Studio local đã sửa lỗi BasicAuth hỏi mật khẩu lặp giữa các URL. File hạ tầng `volumes/api/envoy/lds.template.yaml` thêm Lua response filter cố định challenge thành `Basic realm="Pawpal Supabase Studio"`; Envoy 1.39.1 không có trường realm trong BasicAuth proto nên không thêm trường cấu hình không hỗ trợ. Chỉ sửa tên vùng xác thực, không bỏ BasicAuth, không đổi password và không mở cổng. Đã kiểm tra bằng browser không dùng httpCredentials: chỉ nhập một lần, bảng customer tải đủ 35 records và manifest/version/profile đều qua; anonymous vẫn 401. Test hồi quy: `scripts/test/self_host_studio_auth_live.cjs`. Cấu hình cũ được sao lưu ngoài webroot dưới `backups/studio-basic-realm-*`.

**Cập nhật dữ liệu danh mục:** đã nhập 283 dòng chuẩn hóa từ bản xuất Cloud, gồm 4 hạng, 22 dịch vụ, 37 sản phẩm, 41 biến thể và 69 dòng giá của các dịch vụ được giữ. Những dòng QA, không đúng phạm vi hoặc không hợp lệ chưa nhập và được ghi rõ trong [báo cáo nhập](../archive/migration/PAWPAL_NHAP_DANH_MUC_CLOUD_VAO_V1.md). Đã kiểm tra Admin thật đọc qua REST/RLS và join nhóm dịch vụ; không thêm khách, đơn, tồn kho hoặc số dư giả.

**Đã tạo database theo từ điển V1; chưa chuyển xong ứng dụng sang V1.** Đăng nhập Admin trên cổng 3001 đã chuyển sang `get_staff_login_context()`, lấy trạng thái việc làm và quyền từ quan hệ V1, không đọc account_status/system_role cũ hoặc ghi last_login_at. Đã kiểm tra trình duyệt: Admin thật đăng nhập vào khung Admin, sai mật khẩu, lỗi RPC, tài khoản khách, staff ngừng hoạt động/chưa được cấp quyền và luồng bắt đổi mật khẩu qua endpoint máy chủ. Không dùng quyền mặc định ADMIN khi thiếu dữ liệu.

Các phân hệ nghiệp vụ vẫn còn select/upsert/RPC theo schema trước; việc đăng nhập vào được khung Admin không nghiệm thu dữ liệu/chức năng Khách hàng, Thú cưng hoặc Dashboard trên V1. Không mở rộng schema mới để giữ các lời gọi cũ; bước tiếp theo là sửa mã theo nguồn dữ liệu mới.

Các quy trình API/RPC ghi sổ nguyên tử, xét hạng theo chi tiêu, voucher theo chính sách cụ thể, chuyển giữ tồn, xác minh Auth/điện thoại và thao tác từng modal cần triển khai, kiểm tra riêng. Có schema và trigger không đồng nghĩa 105 thực thể đã hoạt động đầy đủ qua UI hoặc toàn bộ tính đúng đắn nghiệp vụ đã được chứng minh.

Chưa đổi `.env` của bản chạy chính, chưa thay Supabase Cloud, chưa phát hành Vercel. Email/OTP thật và upload file vẫn ngoài phạm vi đợt này.
