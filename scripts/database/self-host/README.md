# Mốc Supabase local đầu tiên

**Baseline này đã được thay trên database local bằng V1.** Không chạy lại SQL 001–004 vào public hiện tại. Xem [bộ schema V1](../v1/README.md) và [kết quả triển khai](../../../PAWPAL_DATABASE_V1_TRIEN_KHAI.md). Metadata trong schema-audit.generated.md hiện phản ánh 105 bảng V1; snapshot baseline đã lưu ngoài webroot trong backup trước chuyển đổi.

**Trạng thái sau rà soát:** bộ SQL 001–004 bên dưới là baseline tương thích, không phải migration 3NF V1. Dừng mở rộng bộ nền để chạy thêm mã cũ. Xem [đối chiếu và kế hoạch chuyển V1](../../../PAWPAL_DOI_CHIEU_DATABASE_SELF_HOST_VOI_3NF_V1.md) và [kiểm kê metadata đầy đủ](schema-audit.generated.md). Bộ migration V1 sẽ được tách riêng; chưa có và chưa được áp dụng.

Phạm vi đã kiểm tra: Admin khách/thú cưng và phần đọc dữ liệu/Realtime của Dashboard. `001_local_core.sql` dựng 17 bảng; `004_dashboard_dependencies.sql` bổ sung 4 bảng, tổng 21 bảng ứng dụng local. Đây chưa phải schema đầy đủ của toàn Pawpal hoặc toàn thiết kế 3NF V1. Các bảng dịch vụ, lịch hẹn, đơn hàng và khiếu nại hiện phục vụ truy vấn hồ sơ và Dashboard; chưa nghiệm thu nghiệp vụ đầy đủ của các phân hệ đó.

Không chạy bộ bootstrap này trên Cloud hoặc trên database đã có schema chưa được rà soát. Chỉ áp dụng vào container `supabase-db` riêng đã chuẩn bị tại `D:\Aboutme\Pawpal-infra\supabase-local`.

Thứ tự dựng schema từ rỗng: `001_local_core.sql` → `002_audit_actor.sql` → `003_customer_status_compatibility.sql` → `004_dashboard_dependencies.sql`. Bản đang chạy đã áp dụng cả bốn.

## Trạng thái và cách mở

- Studio: `http://localhost:8000`, thông tin đăng nhập ở `STUDIO-LOGIN.private.txt` trong thư mục hạ tầng.
- Pawpal thử: `http://localhost:3001/admin/login`, thông tin Admin ở `PAWPAL-ADMIN.private.txt` cùng thư mục. Đây là hai tài khoản khác nhau.
- File `.env` của Pawpal và bản web cổng `3000` vẫn giữ nguyên. Bản `3001` nạp cấu hình công khai từ hạ tầng vào SDK, không đưa service-role key ra trình duyệt.
- Bản thử phục vụ Admin khách/thú cưng và dữ liệu Dashboard. Các API backend chưa chuyển trả lỗi rõ ràng; không chuyển tiếp về Cloud.

Chạy lại bản thử nếu tiến trình đã dừng, từ thư mục dự án:

```powershell
node scripts/dev/self-host-preview.cjs D:\Aboutme\Pawpal-infra\supabase-local\.env
```

## Kiểm tra đã dùng

```powershell
node --test scripts/test/pawpoint_empty_ledger.test.cjs
node scripts/test/test_bandwidth_regression.js
node scripts/test/self_host_core_live.cjs D:\Aboutme\Pawpal-infra\supabase-local\.env
node scripts/test/self_host_preview_live.cjs D:\Aboutme\Pawpal-infra\supabase-local\.env D:\Aboutme\Pawpal-infra\browser-check\node_modules\playwright
node scripts/test/self_host_dashboard_live.cjs D:\Aboutme\Pawpal-infra\supabase-local\.env D:\Aboutme\Pawpal-infra\browser-check\node_modules\playwright
node scripts/test/self_host_restore_live.cjs D:\Aboutme\Pawpal-infra\supabase-local\.env
```

Kiểm tra tích hợp trình duyệt dùng Chrome headless và Playwright được cài riêng ngoài dự án; không đổi dependency ứng dụng. Tài khoản/bản ghi kiểm thử được tạo trong database thật rồi dọn theo định danh riêng của từng lần chạy. Tài khoản Admin local được giữ lại để sử dụng.

Kiểm tra dưới đây khởi động lại container database local, chỉ chạy khi không có thao tác đang lưu trên bản thử:

```powershell
node scripts/test/self_host_restart_live.cjs D:\Aboutme\Pawpal-infra\supabase-local\.env
```

Script restart tạo bản ghi riêng, xác nhận dữ liệu tồn tại sau restart và xuất bản dump database vào `backups` ở thư mục hạ tầng. Bản dump chứa dữ liệu và thông tin hệ thống, giữ riêng ngoài Git/web.

Script restore đã khôi phục thành công toàn bộ dump vào database tên ngẫu nhiên `pawpal_restorecheck_*` trong cluster local. Nó đối chiếu dữ liệu/liên kết khách-thú cưng, policy RLS, grants, trigger nhật ký, bản ghi Auth và chủ sở hữu hàm bảo mật, rồi xóa đúng database kiểm tra vừa tạo. Đây là kiểm tra restore database trên cùng cluster, chưa phải phục hồi cả máy chủ mới hoặc VPS. Khi chuyển máy còn phải mang theo cấu hình/secret và các volume cần thiết; hiện chưa có file upload nghiệp vụ để sao lưu.

## Các luồng Admin đã kiểm tra

- Tạo khách kèm thú cưng; sửa hồ sơ khách, lưu dữ liệu thành viên và ghi nhật ký đúng nhân viên đăng nhập.
- Tạo thú cưng riêng bằng autocomplete chủ nuôi, ghi cân nặng đầu tiên; sửa tên và đọc lại sau reload.
- Lưu trữ/khôi phục thú cưng; khóa/mở khóa khách; xóa thú cưng từ hồ sơ chủ nuôi và xóa liên đới lịch sử cân nặng của bản ghi thử.
- 32 kiểm tra API/RLS/Realtime, gồm từ chối các trạng thái khóa cũ/mới; không cho giả mã người ghi, sửa hoặc xóa nhật ký từ trình duyệt.
- Dashboard: KPI và biểu đồ đọc cùng dữ liệu, đơn tại ranh giới nửa đêm theo giờ địa phương, ca hoàn tất đã thanh toán, đơn hủy/chưa trả/hoàn tiền, mức ưu tiên khiếu nại, cảnh báo tồn và Realtime. Sửa đơn chỉ đọc lại tập đơn; cập nhật tồn tự bỏ cảnh báo hết hàng. Các kiểm tra ghi vào database thật rồi dọn, không nạp file JSON làm dữ liệu nghiệp vụ.

`product`, `product_variant`, `inventory`, `chat_conversation` hiện chỉ cấp quyền đọc cho nhân viên hoạt động qua RLS; khách và phiên chưa đăng nhập chưa được mở quyền catalog/chat ở đợt này. Dịch vụ backend và nghiệp vụ ghi sẽ được bổ sung theo phân hệ tương ứng.

Admin hiện có thao tác khóa/mở khóa khách; không thêm nút xóa khách mới. Dữ liệu dùng trong các lượt kiểm thử được dọn theo định danh riêng, chỉ giữ tài khoản Admin local.

## Phần còn lại

- Dựng đủ schema, hàm, trigger, policy cho bán hàng, dịch vụ, nhân sự, chat và các API backend. Các nút Dashboard dẫn sang những phân hệ này chưa chứng minh phân hệ đích đã chạy được.
- Dashboard còn dùng giới hạn truy vấn hiện tại và thông tin tồn từ biến thể đầu tiên của sản phẩm. Chưa coi đây là báo cáo tài chính/tồn kho đầy đủ trên dữ liệu lớn hoặc nhiều biến thể; cần mở rộng phần tổng hợp khi nghiệm thu bán hàng.
- Nghiệm thu các thao tác hồ sơ còn lại: nhiều địa chỉ, các trường dữ liệu mở rộng, sổ cân nặng và đầy đủ tình huống lỗi/xung đột; các luồng nêu trên không thay thế toàn bộ ma trận E2E.
- Chốt lịch sao lưu và bản sao ngoài máy, diễn tập phục hồi trên máy chủ mới; triển khai HTTPS và Vercel Preview sau khi bản tại máy đủ chức năng.
- Email/OTP thật, upload file và chuyển schema 3NF toàn bộ thuộc đợt riêng đã thống nhất.
