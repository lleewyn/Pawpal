# Nhân sự V1 — nghiệm thu triển khai

Theo quyết định của người dùng, **chấm công thực tế, lương, thưởng, hoa hồng và bảng lương nằm ngoài scope hiện tại**, xem xét sau khi hoàn tất các phần đang làm. Không coi chúng là việc còn thiếu để đóng nghiệm thu Nhân sự trong scope đã chốt. Giữ [tài liệu đề xuất](../archive/proposals/PAWPAL_DE_XUAT_CHAM_CONG_LUONG_THUONG.md) để tham khảo; không triển khai các bảng hoặc quy tắc đề xuất vào Cloud khi chưa có yêu cầu tiếp.

## Rà soát tiếp hồ sơ và danh sách ngày 22/10/2026

- Hồ sơ hiển thị ca còn hiệu lực gần nhất từ `staff_schedule`, tổng giờ được phân trong tháng có cắt phần giao với biên tháng, và số ca thực tế. Không gọi lịch phân công là giờ chấm công, không tự đặt khung giờ “trực đêm”.
- Hiển thị lịch sử `staff_assessment` thật với người đánh giá, kết quả và ghi chú, tối đa 10 bản ghi/trang; cập nhật khi dữ liệu Nhân sự được tải lại. Hai nút phân ca/đánh giá từ hồ sơ chọn sẵn đúng nhân viên.
- Danh sách bỏ bộ lọc ca sáng/chiều cố định, thay bằng có/chưa có lịch làm việc. Cột ca và file xuất hiển thị ngày/giờ thật; file xuất thoát dấu nháy và vô hiệu công thức trong dữ liệu văn bản.
- Các chỉ số đánh giá chỉ đếm bản ghi trong tháng hiện tại; phân biệt lượt đánh giá và nhân viên chưa đánh giá trong tháng.
- Bỏ nhãn thưởng cố định “+20k/lượt” và thưởng an toàn “100%” chưa có chính sách được chốt. Các mục thu nhập/chấm công chưa có dữ liệu vẫn ghi rõ chưa có dữ liệu, không tự tính tiền hoặc dựng tỷ lệ.
- Đã kiểm tra `staff_profile_history_v1.cjs`, `staff_profile_browser_v1.cjs`, `staff_directory_v1.cjs` và `staff_assessment_v1.cjs` trên CSDL phục hồi; đã xem ảnh hồ sơ thực tế ngoài repository. Không có migration hoặc thay đổi dữ liệu Cloud trong đợt này.

## Bổ sung lịch dạng card ngày 22/10/2026

Người dùng chỉ ra lịch vẫn là bảng và chưa đúng giao diện mong muốn. Không coi việc hoàn tất các luồng dữ liệu là đã được người dùng duyệt giao diện toàn phân hệ.

- [x] Theo ngày: card từng nhân viên, các ca thực tế nằm bên trong, tổng giờ trong ngày chỉ cộng ca còn hiệu lực và đi làm; ca qua đêm được tính phần giao với ngày đang xem.
- [x] Theo tuần: lưới bảy ngày từ thứ Hai, card từng ca, có giờ và nút xem/sửa. Ca qua đêm xuất hiện ở cả hai ngày liên quan với mốc ngày rõ ràng.
- [x] Loại bỏ bảng lịch cũ và cuộn ngang của bảng. Card/lưới co theo màn hình; tối đa 10 nhân viên mỗi trang, bộ lọc và điều hướng ngày/tuần dùng dữ liệu thật.
- [x] Phân biệt ca inactive là “Không hiệu lực”, cancelled là “Đã hủy”; không hiển thị các ca này thành “Đi làm” hoặc cộng tổng giờ.
- [x] Kiểm thử trình duyệt `staff_calendar_cards_v1.cjs`: nguồn Cloud thật, card theo ngày, đủ bảy ngày, mở sửa từ card, màn hình 1440/920/390px không tràn lưới, không ghi nghiệp vụ trên Cloud. Đã xem ảnh ngày/tuần/màn hình hẹp ngoài repository.
- [x] Kiểm thử lưu/sửa/hủy ca trên CSDL phục hồi qua `staff_schedule_browser_v1.cjs` vẫn đạt.
- [x] Ngày 23/10/2026, người dùng xác nhận giao diện lịch Nhân sự hiện tại ổn và dễ nhìn. Đã duyệt giao diện hiện tại; giữ cách trình bày này.

Ảnh riêng: `staff-calendar-day.private.png`, `staff-calendar-week.private.png`, `staff-calendar-week-narrow.private.png` trong thư mục infra. Đây là thay đổi trình bày, không có migration hoặc thay đổi dữ liệu Cloud.

Cập nhật 22/10/2026. Đã áp Cloud mới, push GitHub và triển khai Vercel. Phần ghi được kiểm thử trên CSDL phục hồi riêng; kiểm tra Production chỉ đọc, không tạo nhân viên, đổi mật khẩu hoặc ghi nghiệp vụ thử trên Cloud.

## Bản triển khai

- Cloud: `https://cpzuvaplseielhgcnqrn.supabase.co`.
- Admin: [Pawpal](https://pawpalgr3.vercel.app/admin/login).
- Mã Nhân sự: `f7a8659`; sửa chuyển phân hệ khi mã còn tải: `4a19678`.
- Deployment đã kiểm tra: `dpl_DYiF5bPx5fgNT1h7CFF5435k7QNL`, trạng thái READY.
- Backup trước áp, SHA256 và kết quả đối soát: `D:\Aboutme\Pawpal-infra\supabase-local\backups\staff-cloud-2026-10-22T03-29-05-601Z`. Không có credential hoặc dữ liệu xuất riêng trong Git.

## Phạm vi đã nghiệm thu

- [x] Danh sách và hồ sơ đọc dữ liệu thực, vai trò, quyền riêng và trạng thái liên kết/khóa Auth. Không dựng điểm, ngày, người đánh giá, ảnh, số tiền hoặc chi nhánh giả.
- [x] Thêm/sửa hồ sơ, ngừng việc, khóa phân công và chuyển giao công việc; giữ lịch sử. Không đổi danh tính Auth qua form hồ sơ. Chặn ngừng việc khi còn việc chưa chuyển giao; bảo vệ Admin cuối cùng.
- [x] Cấp tài khoản mới, khóa/mở đăng nhập, đặt lại mật khẩu và lưu quyền qua API/RPC có kiểm tra phía máy chủ. Không suy vai trò theo chức danh; không tin metadata tự sửa trong tài khoản. Mật khẩu tạm bắt buộc đổi khi đăng nhập, không ghi vào nhật ký.
- [x] Lịch từng ca có ngày/giờ bắt đầu và kết thúc; hỗ trợ qua đêm, tối đa 10 ca/trang. Sửa/hủy có phiên bản, lý do, nhật ký và chống gửi lặp. Ca liền kề được phép; ca trùng bị chặn.
- [x] Yêu cầu nghỉ/đổi ca chọn ca thực tế; lưu chờ duyệt hoặc duyệt ngay qua giao dịch nguyên tử. Ca đã đổi sau khi gửi thì không duyệt được; xung đột rollback cả hai ca. Chuyển giao lịch dịch vụ trước khi nghỉ/đổi ca.
- [x] Đánh giá lưu đúng `staff_assessment`, người đánh giá từ phiên đăng nhập và kết quả do quản trị chọn. Không tự nâng cấp, khóa/mở phân công theo điểm hoặc thay đổi Auth.
- [x] Sự cố gắn lịch và nhân viên thực sự được giao. Lấy người ghi từ phiên đăng nhập; ghi thời gian đề nghị thêm, không tự dời lịch, gửi thông báo hay thu tiền.
- [x] Modal hồ sơ, tài khoản, chuyển giao, ca làm, đánh giá, nghỉ/đổi ca và sự cố được kiểm tra bằng trình duyệt và xem ảnh ngoài webroot.
- [x] Realtime đủ 8 bảng nhân sự/phân quyền; Production xác nhận kênh joined và giữ tab khi tải lại.
- [x] Đối soát Cloud: 105 bảng, 906 cột, 160 FK, RLS 105 bảng; dữ liệu nguồn không đổi.
- [x] Push và triển khai Vercel; kiểm tra Production các phân hệ đã chuyển.

## Quy tắc và giới hạn

- Giữ đúng `staff.js` cùng bốn file tab sẵn có cho mã giao diện; không tạo thêm file runtime UI.
- Cloud hiện có vai trò ADMIN. Tài khoản mới chọn quyền riêng rõ ràng hoặc giữ khóa; không tự tạo bộ quyền nhân viên mặc định.
- Mỗi đơn nghỉ hiện chọn một ca cụ thể; nghỉ nhiều ca cần tạo từng đơn. `shift`/`target_shift` lưu UUID ca, nhật ký tạo đơn giữ thời gian và phiên bản lúc gửi. Không thêm bảng hoặc cột.
- Đơn cũ thiếu ảnh chụp ca trong nhật ký cần tạo lại để duyệt áp lịch. Không tự quy ca sáng/chiều/tối thành giờ tùy chọn.
- Gửi lại yêu cầu tạo tài khoản đã hoàn tất không mở lại tài khoản đã bị khóa sau đó. Email trùng không được dùng để chiếm hoặc reset Auth hiện có.
- Biên bản sự cố lưu trong nhật ký quản trị, không thêm nghiệp vụ thú y. Thời gian thêm là đề nghị, chưa tự gia hạn lịch.
- Chỉ xác nhận đăng ký kênh Realtime và cấu hình publication trên Production; không tạo thay đổi nghiệp vụ giả để ép phát sự kiện.
- Có lượt kiểm tra Dịch vụ gặp lỗi tải gián đoạn; lần kiểm tra đầy đủ cuối đạt. Chưa xác định nguyên nhân nên không khẳng định đã xử lý mọi trường hợp tải chậm của Dịch vụ.

## Migration và bảo vệ dữ liệu

Đã áp 029–037 trong một giao dịch; hàm băm toàn bộ dữ liệu public cùng danh tính, mật khẩu và trạng thái khóa Auth được so trước/sau ngay trong giao dịch. Nếu khác, giao dịch hủy. Kết quả không đổi dữ liệu nguồn: 17 hồ sơ nhân sự, Admin tiếp tục dùng được và 16 tài khoản còn khóa.

`038_admin_staff_realtime.sql` bổ sung các bảng phân quyền còn thiếu vào publication. Đã đối chiếu đủ: staff, staff_schedule, staff_shift_request, staff_assessment, staff_role, staff_permission, access_role, role_permission.

| Migration | Nội dung |
|---|---|
| 029 | Danh sách V1 và liên kết Auth |
| 030 | Ca làm việc có giờ cụ thể |
| 031 | Hồ sơ và trạng thái làm việc |
| 032 | Chuyển giao công việc |
| 033 | Vai trò, quyền riêng và hồ sơ Auth mới |
| 034 | Thao tác Auth có nhật ký và chống gửi lặp |
| 035 | Đánh giá thực tế |
| 036 | Yêu cầu và duyệt nghỉ/đổi ca |
| 037 | Sự cố, bảo vệ nhật ký và tương thích khóa dòng Dịch vụ |
| 038 | Publication Realtime |

Không mở lại quyền sửa hồ sơ trực tiếp. RPC Dịch vụ dùng SELECT FOR UPDATE cần quyền UPDATE tối thiểu của PostgreSQL; chỉ cấp qua cột id và có trigger từ chối mọi UPDATE trực tiếp từ trình duyệt. Đã kiểm tra vẫn khóa dòng được, sửa danh tính/hồ sơ trực tiếp bị từ chối. RPC Nhân sự có kiểm tra phía máy chủ vẫn ghi được. Sự kiện nhật ký STAFF_* không thể bị giả hoặc xóa từ trình duyệt.

## Bằng chứng kiểm thử

- Bản phục hồi: staff_directory_v1, staff_schedule_v1/browser, staff_profile_v1/browser, staff_handover_v1/browser, staff_auth_v1_stage/browser, staff_assessment_v1, staff_shift_requests_v1, staff_incident_v1.
- Kiểm thử Auth dùng GoTrue thật tách riêng ở 8021 và REST 8011; xác nhận các tài khoản có trước không đổi trạng thái khóa, mật khẩu không vào nhật ký.
- Hồi quy bản phục hồi: services_v1_completion_stage, sales_checkout_v1; kiểm tra cấu hình server qua staff_auth_cloud.test và vercel_admin_config.test đều đạt.
- Production Nhân sự: staff_v1_cloud_live xác nhận nguồn 17 nhân viên/16 khóa, hồ sơ, modal ca/đánh giá, API không xác thực bị từ chối, Realtime, tải lại và không ghi nghiệp vụ.
- Production chuyển phân hệ: admin_navigation_cloud_live trì hoãn một script Khách hàng rồi chuyển nhanh Nhân sự/Bán hàng, quay lại Khách hàng; không còn lỗi gắn sự kiện vào DOM đã tháo. Bộ nạp giữ DOM đến khi khởi tạo xong và chỉ thực hiện yêu cầu chuyển mới nhất.
- Production Khách hàng: 35 khách, 7.964 điểm; Thú cưng: 82 hồ sơ và 7 nhật ký; Dịch vụ: 71 lịch, 22 dịch vụ, 3 đánh giá; Bán hàng: 23 đơn, 37 sản phẩm, giá trị và tồn khớp nguồn.
- Các kiểm tra Production cuối không gọi Cloud cũ/tunnel/JSON dữ liệu, không ghi nghiệp vụ thử và không có lỗi JS/REST.

Ảnh và bằng chứng riêng: staff-cloud-read.private.png, staff-cloud-read-verification.private.txt, các báo cáo kiểm tra Customers/Pets/Services/Sales trong thư mục infra ngoài repository.

Môi trường phục hồi được giữ để tái hiện kiểm thử, tách biệt với Cloud và không cần cho Production: pawpal_customers_3daa55e18acd, REST 8011, Auth 8021. Docker gốc được giữ làm nguồn dự phòng; website Admin dùng Cloud mới không cần Docker hoặc tunnel trên máy cá nhân.
