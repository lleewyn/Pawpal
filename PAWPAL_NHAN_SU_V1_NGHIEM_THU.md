# Nhân sự V1 — triển khai và nghiệm thu

Cập nhật 22/10/2026. Đã áp migration Nhân sự 029–038 lên Cloud mới, dữ liệu nguồn không đổi. Đang hoàn tất push/triển khai và kiểm tra Production. Giữ đúng `staff.js` và 4 file tab sẵn có.

## Quy tắc đã chốt

## Triển khai Cloud ngày 22/10/2026

- Áp 029–037 trong một giao dịch, đối chiếu hàm băm toàn bộ dữ liệu các bảng public cùng danh tính, mật khẩu và trạng thái khóa Auth trước/sau: không thay đổi dữ liệu nguồn; vẫn 17 hồ sơ nhân sự.
- Bản sao lưu public/pawpal_private/auth và SHA256 nằm ngoài repository tại `D:\Aboutme\Pawpal-infra\supabase-local\backups\staff-cloud-2026-10-22T03-29-05-601Z`.
- `038_admin_staff_realtime.sql` bổ sung các bảng phân quyền còn thiếu vào publication. Đã đối chiếu đủ 8 bảng: staff, staff_schedule, staff_shift_request, staff_assessment, staff_role, staff_permission, access_role, role_permission.
- Trình duyệt dùng mã mới trên localhost kết nối Cloud đã đạt: 17 nhân viên, 16 Auth đang khóa, hồ sơ và modal thực tế, Realtime joined, giữ tab khi reload; không ghi nghiệp vụ hoặc gọi Cloud cũ/tunnel/JSON.
- Hồi quy Cloud Khách hàng đạt 35 khách và 7.964 điểm; Bán hàng đạt 23 đơn/37 sản phẩm và tồn khớp; Dịch vụ đạt 71 lịch/22 dịch vụ/3 đánh giá. Một lượt kiểm tra Dịch vụ gặp lỗi tải sau reload; chạy lại đầy đủ đạt, chưa xác định nguyên nhân của lỗi gián đoạn này.

Các ghi chú “chưa áp Cloud” trong phần tiến độ phía dưới là lịch sử giai đoạn thử; trạng thái triển khai mới nhất nằm tại mục này.

- Người dùng chọn nhập giờ bắt đầu và kết thúc cho từng ca; không tự đặt các mốc sáng/chiều/tối, không tự gán ca 4 hoặc 8 giờ.
- Giữ nguyên 16 tài khoản nhân viên bị khóa và Admin đang dùng. Đọc danh sách không cấp tài khoản, không đổi mật khẩu hoặc mở khóa.
- Chức danh `staff.job_title` khác vai trò phân quyền `staff_role`/`access_role`. Quyền riêng lấy từ `staff_permission`, không dùng các cột legacy `staff.role`, `system_role`, `permissions`.
- Đánh giá lấy từ `staff_assessment`. Không tạo điểm 90, ngày đánh giá, người đánh giá, tỷ lệ không khiếu nại 100%, chi nhánh hoặc ảnh giả.
- Lịch dùng `staff_schedule.start_at`/`end_at`; giữ múi giờ khi lưu. Ca trùng bị chặn; ca liền kề được phép. Nghỉ/vắng không được chồng lịch dịch vụ chưa kết thúc đang giao cho nhân viên.

## Đã thực hiện trên bản phục hồi riêng

- `029_admin_staff_directory.sql`: đọc hồ sơ, vai trò, quyền riêng được phép xem và trạng thái liên kết/khóa Auth. Không trả mật khẩu, token hoặc phiên. Có kiểm tra quyền, search_path cố định và không cấp thực thi cho anon.
- Chuyển phần đọc trong `staff.js` sang RPC hồ sơ V1 và các bảng lịch/đánh giá/yêu cầu thực tế; phân trang truy vấn để không cắt lịch sử. Khi lỗi, xóa trạng thái cũ và báo lỗi; không dựng dữ liệu thay thế.
- Đổi tên các biến trạng thái `mock*` thành `staff`, `assessments`, `roster`, `shiftRequests`, `workstations` trong đúng các file sẵn có.
- Hồ sơ không tự hiển thị thưởng bằng 0, lượt yêu cầu bằng 0 hoặc tỷ lệ không khiếu nại 100% khi chưa có dữ liệu.
- `030_admin_staff_schedule.sql`: lưu/cập nhật/hủy ca có giờ cụ thể, phiên bản, lý do, nhật ký và chống gửi lặp. Hủy giữ lại bản ghi lịch sử. Chặn nghỉ/vắng xung đột lịch dịch vụ; không tự thay người phụ trách dịch vụ.
- `staff_directory_v1.cjs` đạt: số hồ sơ/tên/liên kết Auth khớp nguồn, không lộ trường bí mật, anon bị từ chối và mở danh sách Nhân sự trong trình duyệt không lỗi JS/REST.
- `staff_schedule_v1.cjs` đạt: giờ tùy chọn, qua đêm, liền kề, ca trùng, gửi lặp, phiên bản cũ, hủy, chặn nghỉ khi còn dịch vụ. Các ca thử chỉ nằm trong CSDL phục hồi trên cổng 8011.

## Cần hoàn tất trước khi triển khai

### Tiến độ bổ sung ngày 22/10/2026

Các mục hồ sơ, chuyển giao, tài khoản, đánh giá, nghỉ/đổi ca và sự cố bên dưới đã được triển khai và kiểm thử trên bản phục hồi riêng. **Chưa áp migration Nhân sự lên Cloud, chưa push hoặc triển khai Vercel; chưa đóng nghiệm thu Production.**

- `031_admin_staff_profile.sql` và `032_admin_staff_handover.sql`: sửa hồ sơ, ngừng việc, khóa phân công, chuyển giao toàn bộ công việc trong một giao dịch; bảo vệ Admin cuối cùng, phiên bản và lịch sử. Không thay đổi Auth hoặc vai trò khi sửa hồ sơ.
- `033_admin_staff_access.sql` và `034_admin_staff_auth_actions.sql`: tạo Auth mới, khóa/mở đăng nhập, reset mật khẩu và lưu quyền qua RPC/API có xác thực phía máy chủ. Quyền lấy từ CSDL, không tin metadata do người dùng tự sửa. Không gán quyền theo chức danh. Mật khẩu tạm phải đổi khi đăng nhập; không ghi mật khẩu vào nhật ký. Gửi lại yêu cầu tạo đã hoàn tất không mở lại tài khoản bị khóa sau đó; không chiếm Auth có email trùng.
- `035_admin_staff_assessment.sql`: lưu đánh giá và nhật ký trong một giao dịch, lấy người đánh giá từ phiên đăng nhập. Người quản trị chọn kết quả; điểm không tự thay đổi cấp chuyên môn, khóa phân công hoặc Auth. Bỏ thông báo gửi giả.
- `036_admin_staff_shift_requests.sql`: chọn đúng ca có giờ thực tế, lưu chờ duyệt hoặc duyệt ngay nguyên tử, chặn phiên bản cũ và rollback khi ca trùng. Không còn fallback ghi từng phần theo schema cũ. Lịch dịch vụ phải được chuyển giao trước khi nghỉ/đổi ca.
- `037_admin_staff_incident.sql`: ghi sự cố đúng lịch và nhân viên đang được giao, xác định người ghi từ phiên đăng nhập. Chỉ ghi thời gian đề nghị thêm, không tự dời lịch hoặc thu tiền. Chặn giả/xóa nhật ký `STAFF_*` từ trình duyệt và ghi trực tiếp danh mục quyền.
- Thu hồi ghi trực tiếp từ trình duyệt đối với hồ sơ, vai trò/quyền, lịch, đơn nghỉ/đổi ca và đánh giá; UI ghi qua RPC/API. Không thêm file runtime UI ngoài `staff.js` và bốn tab hiện có.

**Phạm vi nghỉ/đổi ca hiện tại:** mỗi đơn chọn một ca cụ thể; nghỉ nhiều ca tạo từng đơn. Cột `shift`/`target_shift` lưu UUID ca, nhật ký tạo đơn giữ thời gian và phiên bản tại lúc gửi. Không thêm bảng/cột. Đơn cũ thiếu ảnh chụp ca cần tạo lại để duyệt; không tự quy mốc sáng/chiều/tối thành giờ tùy chọn. Cloud hiện chỉ có vai trò ADMIN; có thể chọn quyền riêng rõ ràng hoặc tạo tài khoản đang khóa, không tự tạo bộ quyền nhân viên.

**Kiểm thử đã đạt:** `staff_profile_v1.cjs`, `staff_profile_browser_v1.cjs`, `staff_handover_v1.cjs`, `staff_handover_browser_v1.cjs`, `staff_auth_v1_stage.cjs`, `staff_auth_browser_v1.cjs`, `staff_assessment_v1.cjs`, `staff_shift_requests_v1.cjs`, `staff_incident_v1.cjs`; cùng các kiểm thử danh sách/lịch đã nêu ở trên. Đã mở và xem ảnh các modal thực tế ngoài webroot. Bài đổi ca xác nhận xung đột rollback cả hai ca; bài Auth xác nhận trạng thái khóa các tài khoản có trước không đổi và mật khẩu không xuất hiện trong nhật ký.

Auth thử chạy riêng ở 8021, REST 8011 và CSDL `pawpal_customers_3daa55e18acd`; không gửi dữ liệu thử vào Auth gốc 8000 hoặc Cloud. Áp đủ migration 029–037 trước khi dùng UI mới; `031` sử dụng hàm bảo vệ Admin được cung cấp trong `033`, không mở ghi hồ sơ ở giữa quá trình áp migration.

**Còn lại:** kiểm tra tổng hợp quyền/Realtime/tải lại và hồi quy các phân hệ khác; sao lưu và áp Cloud; đối chiếu 105 bảng/906 cột/160 FK và 17 tài khoản nguồn; push/triển khai Vercel, kiểm thử chỉ đọc Production rồi mới đóng nghiệm thu. Các checkbox dưới đây vẫn giữ mở cho đến khi đối chiếu triển khai hoàn tất.

Hồi quy bổ sung đã đạt: `services_v1_completion_stage.cjs` (phân công, từ chối nhân viên không sẵn sàng, danh mục, xuất dữ liệu, 18 cách đóng modal và tải lại), `sales_checkout_v1.cjs` (giá, giữ tồn, gửi lặp, ưu đãi theo cấu hình và chống bán vượt tồn), `staff_auth_cloud.test.cjs` (cấu hình thiếu/sai bị từ chối). Kiểm tra vật lý trên bản phục hồi đạt 105 bảng/906 cột/160 FK và RLS 105 bảng.

Đã xử lý tương thích khóa dòng: RPC Dịch vụ cũ dùng `SELECT FOR UPDATE` trên nhân viên cần quyền UPDATE tối thiểu của PostgreSQL. Chỉ cấp quyền khóa qua cột `id`, đồng thời trigger từ chối mọi UPDATE trực tiếp từ trình duyệt. Không mở lại quyền sửa hồ sơ hoặc danh tính Auth; RPC Nhân sự có kiểm tra phía máy chủ vẫn ghi được. Fixture kiểm thử được đổi cách chọn thời gian để không xung đột với dữ liệu của lần chạy trước.

- [x] Bảng lịch theo ngày/khoảng tuần hiển thị từng khoảng thời gian thực tế, tối đa 10 ca/trang; bỏ phân chia ca 4/8 giờ và chỉ tiêu định biên tự đặt. Modal chọn nhân viên bằng autocomplete, nhập ngày/giờ bắt đầu và kết thúc; lưu/sửa/hủy qua RPC. Đã kiểm tra trình duyệt và xem ảnh modal.
- [ ] Chuyển yêu cầu nghỉ/đổi ca và phê duyệt sang giao dịch nguyên tử; bỏ fallback ghi từng phần qua schema cũ.
- [ ] Chuyển thêm/sửa hồ sơ, ngừng việc, khóa phân công và chuyển giao công việc; giữ lịch sử nhân viên.
- [ ] Chuyển cấp/reset/khóa tài khoản và phân quyền sang Auth/role V1, kiểm tra phía máy chủ và không cho người dùng tự tăng quyền.
- [ ] Chuyển ghi đánh giá; không tự nâng cấp chuyên môn hoặc khóa phân công từ điểm nếu chưa có quy tắc được chốt.
- [ ] Chuyển ghi sự cố/quan hệ lịch dịch vụ theo V1; không thêm nghiệp vụ thú y.
- [ ] Nghiệm thu từng modal trên bản phục hồi, quyền, xung đột, rollback, Realtime và tải lại.
- [ ] Sao lưu, áp Cloud, đối chiếu 105 bảng/906 cột/160 FK và trạng thái 17 tài khoản, triển khai Vercel và kiểm tra chỉ đọc Production.

Không dùng phần ghi Nhân sự để nghiệm thu trên Cloud ở giai đoạn này. Supabase Docker gốc và Cloud chưa bị sửa trong đợt Nhân sự. CSDL thử `pawpal_customers_3daa55e18acd` và API 8011 được giữ để tiếp tục kiểm thử; backup nằm ngoài webroot trong `D:\Aboutme\Pawpal-infra\supabase-local\backups\customers-complete-3daa55e18acd`.
