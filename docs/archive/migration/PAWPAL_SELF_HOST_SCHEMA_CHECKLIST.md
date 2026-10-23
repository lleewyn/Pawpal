# Schema tương thích cho mốc self-host đầu tiên

**Tài liệu này là lịch sử baseline.** Database local hiện đã chuyển sang 105 bảng V1. Xem [báo cáo triển khai V1](../database/PAWPAL_DATABASE_V1_TRIEN_KHAI.md); các kiểm thử baseline dưới đây không phải kiểm thử mã giao diện trên V1.

**Mốc này chỉ mô tả baseline tương thích, không phải schema V1.** Đã đối chiếu database local: 21 bảng hiện có, 20 bảng trùng tên V1, 1 bảng ngoài V1 và 85 bảng V1 chưa dựng. Xem [báo cáo sai khác và kế hoạch chuyển đổi](../archive/migration/PAWPAL_DOI_CHIEU_DATABASE_SELF_HOST_VOI_3NF_V1.md). Các kiểm thử bên dưới không chứng nhận đã triển khai 3NF V1; công việc schema tiếp theo theo V1.

Ngày rà soát: 21/10/2026. Phạm vi: đăng nhập Admin → tạo khách → thêm thú cưng → mở hồ sơ → reload. Đây là danh mục phụ thuộc từ mã, chưa phải SQL đã nghiệm thu hoặc bản xác nhận schema Cloud.

## 1. Bộ Docker đã chuẩn bị

- Nguồn chính thức: `https://github.com/supabase/supabase`, tag `self-hosted/v0.8.3`, commit `bc27d2661edd09a5d0b8d76ce33da6d4071a756e`.
- Bản nguồn: `D:\Aboutme\Pawpal-infra\supabase-source`.
- Bản triển khai tại máy: `D:\Aboutme\Pawpal-infra\supabase-local`, ngoài thư mục được Express phục vụ.
- File `docker-compose.local.yml` ghi đè các cổng công khai thành loopback: API `8000`, pooler `5432` và `6543`. Phải dùng cùng file Compose gốc khi vận hành.
- Chỉ có cấu hình mẫu với giá trị mặc định của upstream; chưa tạo `.env` riêng, chưa sinh secret, chưa pull image và chưa khởi động stack.

## 2. Những đối tượng phải dựng trước

| Luồng | Bảng/hàm cần đối chiếu | Bằng chứng từ mã |
|---|---|---|
| Đăng nhập Admin | Supabase Auth, `staff`, RPC `check_user_account_type(check_auth_id)` | `pages/admin/login/login.js`: đăng nhập bằng mật khẩu, gọi RPC và đọc staff theo `auth_user_id`, yêu cầu `account_status = 'ACTIVE'` |
| Quyền nhân viên | `pawpal_is_staff()`, policy/grants trên các bảng nghiệp vụ | Có nhiều phiên bản hàm trong SQL cũ; cần chọn định nghĩa phù hợp trạng thái tài khoản, không mặc định phiên đăng nhập nào cũng là nhân viên |
| Danh sách khách | `customer`, `customer_profile`, `customer_membership`, `customer_address`, `pet_profile` | `pages/admin/modules/customers/customers.js` nạp đồng thời các bảng này |
| Tạo khách | Các bảng khách ở trên, `customer_activation_sms`, có thể thêm `pet_profile` | `pages/admin/modules/customers/subtabs/tab-customer-list.js` ghi tuần tự và có thao tác bù khi lỗi; giữ luồng kích hoạt giả lập hiện có |
| Danh sách và tạo thú cưng | `pet_profile`, `pet_weight_history`, `customer`, `customer_profile`, `customer_membership`, `customer_address` | `pages/admin/modules/pets/pets.js` và `subtabs/tab-pet-list.js`; khi có cân nặng đầu tiên còn ghi lịch sử |
| Hồ sơ khách | `sales_order`, `appointment`, `support_ticket`, `paw_point_transaction`, `audit_log`, `notification` | Màn hình hồ sơ có thêm các truy vấn lịch sử và thao tác phụ; cần bảng rỗng hợp lệ hoặc schema hoàn chỉnh, không chèn dữ liệu giả để che lỗi |
| Hồ sơ thú cưng | `care_log`, `appointment`, `pet_weight_history` | `pages/admin/modules/pets/pets.js` tải lịch sử chăm sóc, lịch hẹn và cân nặng |

Tên bảng tương thích mã hiện tại là `pet_profile`, không phải `pet`. Các trường lịch sử cũ như `vaccination_history` vẫn được mã đọc; giữ tương thích dữ liệu hiện có không đồng nghĩa thêm dịch vụ thú y hay dựng lại bảng `pet_vaccination` đã loại khỏi thiết kế mới.

## 3. Cách hoàn thiện bộ dựng nền

1. Ưu tiên lấy schema nguồn qua kết nối PostgreSQL chỉ đọc khi có mật khẩu; đối chiếu bản dump với đúng phiên bản self-host trước khi khôi phục.
2. Nếu chưa lấy được: lập từng định nghĩa bảng từ truy vấn đọc/ghi, tài liệu và SQL hiện có. Ghi rõ kiểu dữ liệu, mặc định, enum, PK/FK/UNIQUE/CHECK và thứ tự phụ thuộc; không suy ra chỉ từ tên cột.
3. Dựng bảng nền trước, rồi mới chọn migration bổ sung. Không chạy cả thư mục SQL theo ngày vì có backfill, thay đổi enum và đối tượng đã bỏ.
4. Rà riêng RLS/grants và hàm `SECURITY DEFINER`. Ví dụ migration cân nặng cũ có policy `TO authenticated, anon USING (true)`; chưa được đưa nguyên trạng vào bản nghiệm thu quyền truy cập.
5. Tạo tài khoản thử bằng Auth Admin API, liên kết `staff.auth_user_id`; hồ sơ khách tạo nhanh không bắt buộc có tài khoản Auth. Không đưa mật khẩu vào bảng hồ sơ hoặc tài liệu.
6. Chạy trên database riêng từ rỗng và xác minh không thiếu bảng/hàm. Sau đó thử quyền với khách, nhân viên và phiên chưa đăng nhập, kiểm tra Realtime rồi restart stack.

## 4. Điều kiện chuyển sang kết nối ứng dụng

- [ ] Có bộ SQL dựng nền có thứ tự, chạy thành công trên database riêng.
- [ ] Auth hoạt động và staff thử có liên kết đúng; RPC và đọc hồ sơ trả quyền phù hợp.
- [ ] Các truy vấn mở danh sách/hồ sơ không còn lỗi thiếu bảng, cột, hàm hoặc enum.
- [ ] Khách/phiên chưa đăng nhập không đọc hoặc ghi được dữ liệu nội bộ nhân viên và khách khác.
- [ ] Tạo khách/thú cưng, reload và restart vẫn giữ dữ liệu; không gửi request nghiệp vụ về Cloud.

Chưa hoàn thành các điều kiện trên. Danh mục này chỉ bao phủ mốc đầu; trước nghiệm thu toàn hệ thống vẫn phải rà dashboard, dịch vụ, bán hàng, chat và thông báo.

## 5. Cập nhật sau thực hiện — 21/10/2026

Mốc đầu đã dựng bằng `scripts/database/self-host/001_local_core.sql`, gồm 17 bảng và các hàm/policy cần cho kiểm tra ban đầu. Đã tạo Admin local; 26 kiểm tra API/RLS/Realtime đạt. Trình duyệt đã kiểm tra đăng nhập, tạo khách kèm thú cưng, reload và xem danh sách thú cưng mà không gọi Cloud. Dữ liệu tồn tại sau restart database.

Các ghi chú “chưa hoàn thành” ở trên mô tả thời điểm lập danh mục. Hiện bộ dựng nền cho mốc đầu đã chạy được; schema toàn ứng dụng, đầy đủ thao tác hồ sơ, restore và triển khai online vẫn chưa hoàn tất. Xem trạng thái chi tiết ở [kế hoạch self-host](../archive/migration/PAWPAL_KE_HOACH_SUPABASE_SELF_HOST.md).
