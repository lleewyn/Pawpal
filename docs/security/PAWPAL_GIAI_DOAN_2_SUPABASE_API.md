# Giai đoạn 2 — Supabase và API phân quyền

Ngày thực hiện: 04/11/2026. Trạng thái: hoàn thiện migration và API, kiểm tra trên CSDL thử nghiệm riêng. **Chưa áp dụng migration lên Cloud, chưa chuyển đổi tài khoản đang vận hành và chưa push.**

## Thay đổi đã thực hiện

| Thành phần | Kết quả |
|---|---|
| Hai vai trò | ADMIN hiển thị Quản lý; thêm STAFF/Nhân viên với 13 quyền kỹ thuật cố định. ADMIN giữ quyền nghiệp vụ hiện có và nhận các quyền mới |
| Tài khoản | Một người chỉ có một vai trò; không cấp quyền riêng. API và RPC từ chối vai trò lạ, nhiều vai trò hoặc quyền bổ sung |
| Trạng thái nhân sự | Chuẩn hóa các giá trị viết hoa đã nhận diện; giữ khóa Auth, yêu cầu đổi mật khẩu và trạng thái nghỉ việc. Không tự gán STAFF hoặc mở khóa tài khoản |
| Phòng ngừa thay đổi ngoài dự kiến | Migration đối chiếu dấu kiểm 31 định nghĩa hàm đã rà soát; từ chối cấu hình vai trò/quyền, trạng thái hoặc quan hệ không được bảo vệ chưa được rà soát |
| Truy cập trực tiếp | Bổ sung RLS hạn chế với các bảng ứng dụng đã bật RLS: danh tính nhân sự chỉ đọc/ghi trực tiếp khi là Quản lý hợp lệ; Nhân viên đi qua RPC có phạm vi và giới hạn cột |
| Giao dịch nghiệp vụ | Điều chỉnh 27 RPC hiện có: giữ kiểm tra nghiệp vụ, phiên bản, khóa và chống lặp; bổ sung quyền theo thao tác và người được giao trước khi đọc/ghi hoặc trả kết quả cũ |
| Thu ngân | Nhân viên được thu tiền theo đơn/ca cụ thể qua RPC; không được đọc quét bảng tiền hoặc gọi nhánh hoàn tiền. Giá, điểm và ưu đãi do máy chủ tính |
| Kho và điểm | Chỉ tra cứu phục vụ công việc; không cấp quyền điều chỉnh thủ công. Giữ tác động kho/điểm tự động bên trong giao dịch tạo đơn hợp lệ |
| Dữ liệu cá nhân/công việc | Lịch, hồ sơ và kết quả cá nhân; ca và hạng mục được giao; chuyến của mình; hội thoại và phiếu được giao |
| Ca nhiều kỹ thuật viên | Có RPC riêng cập nhật tiến độ hạng mục của mình; không hoàn tất hạng mục của người khác. Biên bản và nhật ký áp dụng thêm điều kiện người thực hiện và tác giả |
| Lịch khả dụng | Thu hồi đọc bảng lịch nhân sự công khai, giữ RPC tính khả dụng của luồng khách hàng; danh sách ứng viên cho Nhân viên chỉ trả thông tin lựa chọn tối thiểu |
| Chat và khiếu nại | Hàng chờ chat chỉ có thông tin tối thiểu; tiếp nhận có khóa giao dịch. Nhân viên xử lý ca của mình, gửi thông tin/đề xuất trên phiếu được giao; không phân công hoặc duyệt bồi hoàn |
| Quản lý cuối cùng | Giữ luồng bảo vệ hiện có; thử nghiệm hai yêu cầu hạ vai trò đồng thời vẫn giữ một ADMIN |
| Storage | Đã đọc metadata Cloud: hiện không có bucket hoặc policy trên storage.objects/storage.buckets trong phạm vi kiểm tra. Không có đối tượng tệp nào được đọc hoặc thay đổi |

Quyền kỹ thuật work.* phục vụ kiểm tra trong hệ thống, không tạo màn hình tích quyền theo từng người. Nhân viên không nhận các quyền ghi bảng quản trị hoặc quyền ghi tiền/nhật ký trực tiếp.

## Mã nguồn và migration

- [Migration 165](../../scripts/database/v1/165_admin_fixed_roles.sql).
- [Khôi phục migration 165](../../scripts/database/v1/165_admin_fixed_roles.rollback.sql).
- [API xác thực và tài khoản](../../scripts/api/staff_auth.js).
- [Kiểm tra dấu kiểm Cloud chỉ đọc](../../scripts/database/v1/verify_fixed_roles_cloud.cjs).

Migration tự lưu bản định nghĩa hàm, ACL, cấu hình quyền và trạng thái trước thay đổi trong bảng snapshot riêng thuộc schema pawpal_private, không cấp quyền đọc cho anon/authenticated/service_role. Mọi thay đổi nằm trong giao dịch; lỗi khiến giao dịch không được áp dụng.

Khôi phục đã được thử trên CSDL riêng. Script khôi phục từ chối chạy nếu còn tài khoản gán STAFF hoặc trạng thái nhân sự đã thay đổi sau migration cần được đối chiếu. Không khôi phục mật khẩu, không bỏ ban Auth và không xóa dữ liệu nghiệp vụ. Nếu đã áp dụng migration giai đoạn sau, phải khôi phục theo thứ tự ngược và rà soát phụ thuộc trước khi dùng rollback 165.

## Giao diện kết nối dành cho giai đoạn 3

`get_staff_workspace(p_kind, p_query, p_id, p_page)` trả tối đa 10 dòng mỗi trang, theo trường dữ liệu cần thiết cho công việc. Các nhóm chính:

- Hồ sơ, lịch và kết quả cá nhân.
- Khách, địa chỉ nhận hàng, thú cưng và cân nặng hiện tại.
- Ca được giao, hạng mục, biên bản và nhật ký chăm sóc.
- Danh mục dịch vụ/giá, phòng và ca khách sạn, giá và chuyến đưa đón.
- Hàng đang bán và tồn kho, điểm, ưu đãi, phương thức thu tiền.
- Tra cứu đơn, dòng chứng từ, hội thoại, hàng chờ và phiếu phản ánh.

Khách/đơn phải được tra cứu bằng đối tượng hoặc điều kiện phù hợp; không có nhánh doanh thu hoặc xuất hàng loạt. Các phòng hiển thị là danh mục phòng đang hoạt động, không phải cam kết còn trống theo mọi khoảng ngày; giao dịch đặt chỗ vẫn kiểm tra xung đột tại máy chủ.

`perform_staff_service_item` xử lý tiến độ riêng của hạng mục được giao, có kiểm tra phiên bản và chuyển trạng thái hợp lệ. Các RPC nghiệp vụ được phép tiếp tục dùng tên hiện tại; không sử dụng cờ nâng quyền tạm thời, role do trình duyệt tự khai báo hoặc sửa prompt để cấp quyền.

## Kiểm tra và bằng chứng

| Lớp kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| PostgreSQL thực tế, role authenticated/anon và claims | 19 nhóm kiểm tra đạt, gồm migration, khôi phục, quyền dữ liệu và các luồng ghi nghiệp vụ | [Kết quả SQL](phase2/sql-results.txt) |
| HTTP qua PostgREST, JWT ký riêng cho môi trường thử nghiệm | 16 nhóm kiểm tra đạt, gồm chữ ký, phạm vi, hoàn tiền bị chặn, luồng công khai và cạnh tranh hạ vai trò | [Kết quả HTTP](phase2/http-results.txt) |
| API tài khoản và kiểm tra hồi quy endpoint mật khẩu | 7 bài kiểm thử đạt; HTTP/Auth được mô phỏng để kiểm tra quyết định và tránh tác động tài khoản thật | [Bản ghi API](phase2/api-results.txt) |
| Dấu kiểm nguồn Cloud | 31 hàm trùng bản đã kiểm tra; Cloud vẫn chỉ có ADMIN | [Đối chiếu chỉ đọc](phase2/cloud-baseline-readonly.txt) |
| Storage Cloud | Không có bucket/policy trong phạm vi đọc metadata | [Metadata Storage](phase2/storage-readonly.txt) |

Bản ghi SQL và HTTP có SHA256 của migration để đối chiếu đúng phiên bản kiểm tra. Đây không phải kết quả chạy trọn bộ PQ-01 đến PQ-30 trên giao diện.

Các trường hợp SQL tiêu biểu đã chạy: tạo và sửa liên hệ khách; sửa hồ sơ thú cưng nhưng không đổi hạng/ẩn hồ sơ; tạo lịch; nhận ca; cập nhật hạng mục của mình; tạo đơn theo giá CSDL dù payload gửi giá khác; thu tiền đơn và dịch vụ; gửi lại yêu cầu không thu trùng; tiếp nhận chat; tạo phiếu và ghi thông tin được giao; từ chối sửa ca của người khác, thay phân công, hoàn tiền, điều chỉnh điểm/kho, duyệt bồi hoàn và tự nâng quyền.

CSDL thử nghiệm lấy cấu trúc hiện tại từ Cloud bằng schema-only snapshot, không sao chép dữ liệu khách hàng hoặc hội thoại Cloud. Dữ liệu nghiệp vụ kiểm thử được tạo trong CSDL riêng. Các giao dịch SQL kiểm tra được rollback; HTTP chạy trên bản sao riêng rồi gỡ container, xóa CSDL HTTP và tệp cấu hình thử nghiệm. CSDL chính của giai đoạn 2 được giữ để tiếp tục kiểm tra. Hai bản sao cục bộ không dùng từ các lần chuẩn bị trước đã được dọn theo đúng tên và dấu sở hữu.

Lệnh kiểm tra:

```text
node scripts/test/admin_fixed_roles_sql.cjs
node scripts/test/admin_fixed_roles_http.cjs
node --test scripts/test/admin_fixed_roles_api.test.cjs scripts/test/staff_auth_cloud.test.cjs
node scripts/database/v1/verify_fixed_roles_cloud.cjs
```

## Giới hạn và việc chuyển sang giai đoạn sau

- Chưa thay giao diện hoặc biểu mẫu; giao diện Nhân viên ở giai đoạn 3 phải dùng projection/RPC mới, không gọi lại các bộ tải bảng toàn bộ.
- Chưa triển khai registry, gateway, lịch sử/replay chatbot theo bộ quyền mới. Hiện các RPC chatbot cũ yêu cầu quyền bảng quản trị nên STAFF bị chặn; giai đoạn 4 mở đúng công cụ được phép mà vẫn giữ chặn doanh thu.
- Realtime đọc hàng trực tiếp cũng chịu RLS và bị chặn cho STAFF. Giai đoạn 4 cần tín hiệu/kênh riêng có phạm vi để tải lại projection, cùng cơ chế báo đổi quyền; không mở SELECT bảng tiền/nhân sự để sửa kết nối Realtime.
- HTTP dùng JWT ký bằng khóa riêng của PostgREST thử nghiệm, chưa kiểm tra đăng nhập qua Supabase Auth thực tế hoặc trình duyệt. Bộ test đầy đủ, phiên nhiều tab, biểu mẫu và toàn bộ luồng đặt lịch công khai thuộc giai đoạn 5.
- Chưa áp dụng 165 lên Cloud; chưa chuẩn hóa trạng thái, cấp STAFF, mở khóa hoặc reset mật khẩu người dùng thật. Việc chuyển đổi và triển khai tương thích cùng giao diện thuộc giai đoạn 6.
