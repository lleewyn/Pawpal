# Checklist triển khai phân quyền Admin PawPal

Ngày lập: 04/11/2026
Trạng thái: Hoàn thành giai đoạn 1, 2 và 3 trên môi trường thử nghiệm; đang thực hiện giai đoạn 4; chưa chuyển đổi Cloud
Phạm vi: Giao diện Admin, API, Supabase và chatbot admin.

## 1. Mô hình đã thống nhất

- Hai vai trò vận hành: **Quản lý** và **Nhân viên**.
- Quản lý tương đương quản trị hệ thống, có toàn quyền; giữ mã kỹ thuật `ADMIN`.
- Nhân viên có bộ quyền cố định theo bảng dưới đây ngay khi được gán vai trò.
- Khi tạo hoặc sửa tài khoản chỉ chọn vai trò; không tích từng quyền hoặc chọn mẫu quyền theo chức danh.
- Chức danh nghề nghiệp lưu riêng, không tạo thêm vai trò truy cập.
- Các quyền kỹ thuật hiện có có thể tiếp tục được sử dụng bên trong để thực thi hai bộ quyền cố định.

## 2. Bảng phân quyền

| Nhóm chức năng | Quản lý | Nhân viên |
|---|---|---|
| Khách hàng, thú cưng | Quản lý hồ sơ và thông tin | Tra cứu, thêm và cập nhật thông tin phục vụ công việc |
| Lịch hẹn, dịch vụ | Điều phối, duyệt hủy và điều chỉnh | Tạo lịch, xử lý công việc được giao |
| Bán hàng | Quản lý đơn, giá và hoàn tiền | Tạo đơn, thu tiền theo quy trình |
| Kho | Quản lý nhập xuất, duyệt điều chỉnh | Tra cứu tồn kho |
| Chat và khiếu nại | Phân công, giám sát và duyệt bồi hoàn | Tiếp nhận, trả lời và xử lý hội thoại được giao |
| Báo cáo | Xem doanh thu và báo cáo tổng hợp | Xem kết quả công việc cá nhân |
| Nhân sự, tài khoản | Quản lý nhân sự và cấp quyền | Xem hồ sơ, lịch làm việc cá nhân |
| Cấu hình hệ thống | Được phép theo thẩm quyền | Không được phép mặc định |

**Cách áp dụng:** Quản lý có toàn quyền hệ thống. “Cấp quyền” là gán vai trò Quản lý hoặc Nhân viên. Nhân viên không truy cập cấu hình hệ thống; phiên bản này không có cơ chế cấp ngoại lệ theo từng người. Các giới hạn cá nhân và công việc được giao được thực thi theo quan hệ dữ liệu, không cần màn hình cấu hình phạm vi riêng. Chức năng chưa nêu trong bảng cần được xác định trước khi triển khai, không tự mở thêm quyền cho Nhân viên.

## 3. Rà soát hiện trạng

Đã kiểm kê chỉ đọc CSDL Cloud ngày 04/11/2026: 38 bảng, 159 chính sách RLS và metadata của 129 hàm liên quan. Xem [báo cáo phân quyền CSDL](docs/security/PAWPAL_RASOAT_PHAN_QUYEN_CSDL.md). Đây là kết quả kiểm kê, chưa triển khai hoặc chạy kiểm thử theo hai vai trò.

Phát hiện chính: hiện chỉ có ADMIN với 210 quyền, một người được gán; 16/17 hồ sơ chưa có vai trò, không có quyền cấp riêng. Có 15 hồ sơ dùng trạng thái ACTIVE trong khi hàm xác thực yêu cầu active. Các chính sách phạm vi cá nhân/công việc được giao và nhánh doanh thu chatbot cần được sửa trước khi cấp bộ quyền Nhân viên.

Giai đoạn 1 đã hoàn tất. Xem [thiết kế phân quyền và chuyển đổi tài khoản](docs/security/PAWPAL_GIAI_DOAN_1_THIET_KE_PHAN_QUYEN.md) và [bằng chứng kiểm kê bổ sung](docs/security/PAWPAL_GIAI_DOAN_1_KIEM_KE.md). Kiểm tra bổ sung xác nhận cả 15 tài khoản ACTIVE đều đang khóa Auth và phải đổi mật khẩu; tài khoản nghỉ việc cũng đang khóa. Phương án chuyển đổi giữ nguyên các khóa này.

- [x] Đối chiếu các bảng vai trò, quyền và tài khoản trong mã nguồn với Supabase thực tế.
- [x] Kiểm kê tài khoản, vai trò cũ và quyền cấp riêng đang tồn tại theo nhóm trạng thái, không xuất dữ liệu cá nhân.
- [x] Rà soát thiết kế luồng đăng nhập, `get_staff_login_context`, kiểm tra quyền, RLS và RPC; đối chiếu 121 tên RPC/gateway trong phạm vi quét với Cloud, chưa kiểm thử đầu cuối.
- [x] Xác định mã vai trò Nhân viên là STAFF và phương án chuyển đổi về hai vai trò, không tự cấp vai trò hoặc mở khóa hàng loạt.
- [x] Ánh xạ các nhóm chức năng hiện có; phân loại thêm Pawpoint, ưu đãi, đánh giá, quản lý danh mục và xuất dữ liệu tại mục 3 của bản thiết kế.
- [x] Xác định cách giới hạn dữ liệu phục vụ công việc, ca dịch vụ, chuyến, hội thoại, phiếu được giao và thông tin cá nhân tại mục 4 của bản thiết kế.
- [x] Hoàn tất ánh xạ thao tác vào hai bộ quyền cố định và phân loại đủ 38 intent chatbot; không bổ sung màn hình cấp quyền chi tiết.

Các thay đổi CSDL/API bên dưới đã được triển khai và kiểm tra trên CSDL thử nghiệm riêng ở giai đoạn 2; Cloud chưa áp dụng migration.

## 4. Supabase và API

Đã hoàn thành phần CSDL/API trên môi trường thử nghiệm, gồm migration và khôi phục 165, 19 nhóm kiểm tra SQL, 16 nhóm kiểm tra HTTP/JWT và 7 bài kiểm thử API. Xem [báo cáo giai đoạn 2](docs/security/PAWPAL_GIAI_DOAN_2_SUPABASE_API.md). Dấu [x] trong mục này ghi nhận mã nguồn và kiểm tra cục bộ, không có nghĩa Cloud đã chuyển đổi.

- [x] Viết và kiểm tra chuẩn hóa trạng thái có kiểm soát; giữ nguyên khóa Auth, yêu cầu đổi mật khẩu, trạng thái nghỉ việc và khóa nhận việc.
- [x] Thu hồi đọc bảng lịch nhân sự công khai, giữ RPC lịch khả dụng của khách hàng; danh sách chọn nhân viên chỉ trả thông tin cần thiết.
- [x] Tách quyền thu tiền theo đơn/ca khỏi đọc doanh thu tổng hợp ở CSDL; tích hợp công cụ chatbot và phiên ở giai đoạn 4.
- [x] Tận dụng cấu trúc hiện có, thiết lập ADMIN và STAFF với hai bộ quyền cố định; không sao chép 210 quyền quản trị cho STAFF.
- [x] Loại bỏ quyền cấp riêng khỏi cách tính quyền; từ chối migration nếu có quyền riêng chưa được rà soát, chặn cấp mới ở API/RPC và CSDL.
- [x] Chỉ Quản lý được tạo tài khoản, gán vai trò, khóa và đặt lại mật khẩu nhân viên.
- [x] Kiểm tra vai trò và phạm vi tại API, RPC và CSDL; giữ kiểm tra giao dịch khi chuyển các RPC được phép sang `SECURITY DEFINER`.
- [x] Nhân viên được tạo đơn theo giá máy chủ và thu tiền; không sửa giá, hoàn tiền hoặc duyệt bồi hoàn.
- [x] Nhân viên chỉ tra cứu tồn kho; không nhập xuất hoặc điều chỉnh thủ công. Tác động kho/điểm tự động của giao dịch hợp lệ vẫn hoạt động.
- [x] Chỉ Quản lý có quyền đọc quản trị về doanh thu tổng hợp, nhân sự và cấu hình; Nhân viên dùng các projection cần thiết cho công việc.
- [x] Áp dụng giới hạn cá nhân, ca/hạng mục, chuyến, hội thoại và phiếu được giao; chặn sửa hạng mục của đồng nghiệp.
- [x] Xác minh phiên, danh tính và vai trò từ Auth/CSDL; từ chối vai trò lạ, nhiều vai trò hoặc khai báo quyền từ trình duyệt.
- [x] Kiểm tra đường đọc/ghi trực tiếp và metadata Storage; chặn truy cập bảng gốc của STAFF làm nền bảo vệ Realtime. Kiểm thử kênh Realtime thực tế thuộc giai đoạn 4.
- [x] Dữ liệu quyền lưu tại CSDL, không nạp file JSON hoặc dữ liệu mẫu vào Admin; dữ liệu kiểm thử chỉ ở CSDL riêng.
- [x] Bảo vệ Quản lý hoạt động cuối cùng, đã kiểm tra cả hai yêu cầu hạ vai trò đồng thời qua HTTP.

## 5. Giao diện Admin

- [x] Trong hồ sơ tài khoản nhân viên, Quản lý chỉ cần chọn Quản lý hoặc Nhân viên.
- [x] Hiển thị mô tả ngắn vai trò; bỏ phần tích quyền riêng và mẫu quyền nếu đang có.
- [x] Lưu vai trò theo kết quả thật từ máy chủ; xử lý lỗi và hồ sơ thay đổi đồng thời.
- [x] Menu, tab, nút và dữ liệu hiển thị phù hợp với vai trò trong phần giao diện đã nối và kiểm thử cục bộ.
- [x] Chặn URL hoặc hash vào khu vực không được phép; không tải sẵn dữ liệu vượt quyền.
- [x] Giữ chức năng đổi mật khẩu và xem thông tin cá nhân phù hợp cho Nhân viên.
- [x] Kiểm tra phần giao diện phân quyền theo quy chuẩn Admin trong `AGENTS.md`; các modal đã sửa được kiểm tra trực quan và nghiệm thu lần lượt theo quy định.

## 6. Chatbot, phiên đăng nhập và nhật ký

- [ ] Chatbot sử dụng cùng bộ quyền và phạm vi dữ liệu với người đang đăng nhập.
- [ ] Nhân viên không thể dùng chatbot để xem doanh thu tổng hợp, quản lý nhân sự hoặc thực hiện hành động dành riêng cho Quản lý.
- [ ] Công cụ chatbot kiểm tra quyền lúc tra cứu và thực thi, không dựa vào quyết định của mô hình AI.
- [ ] Lịch sử chat, bộ nhớ đệm, tìm kiếm, thông báo và xuất file không làm lộ dữ liệu vượt quyền.
- [ ] Khi đổi vai trò, yêu cầu tiếp theo áp dụng quyền mới dù phiên cũ vẫn mở.
- [ ] Giao diện cập nhật menu, đóng nội dung không còn được phép và dọn dữ liệu lưu tạm khi đổi vai trò.
- [ ] Cập nhật hoặc hủy kênh Realtime theo vai trò mới; tài khoản bị khóa không tiếp tục truy cập nghiệp vụ.
- [ ] Ghi nhật ký người thực hiện, tài khoản bị thay đổi, thời điểm và vai trò trước/sau; nhân viên không sửa hoặc xóa được nhật ký.

## 7. Kiểm thử nghiệm thu

- [ ] Quản lý sử dụng đầy đủ chức năng hệ thống.
- [ ] Nhân viên có đúng bộ quyền trong bảng ngay khi chọn vai trò, không cần cấp thêm từng quyền.
- [ ] Nhân viên tra cứu, thêm và cập nhật hồ sơ phục vụ công việc đúng phạm vi đã xác định.
- [ ] Nhân viên tạo lịch và xử lý ca dịch vụ được giao.
- [ ] Nhân viên tạo đơn, thu tiền theo quy trình; không sửa giá hoặc hoàn tiền.
- [ ] Nhân viên xem tồn kho nhưng không nhập xuất hoặc điều chỉnh tồn.
- [ ] Nhân viên xử lý hội thoại được giao nhưng không phân công hoặc duyệt bồi hoàn.
- [ ] Nhân viên chỉ xem kết quả công việc, hồ sơ và lịch làm cá nhân.
- [ ] Nhân viên không truy cập cấu hình, quản lý tài khoản hoặc tự nâng vai trò.
- [ ] Gọi API, RPC trực tiếp hoặc sửa URL, mã hồ sơ và payload không vượt quyền.
- [ ] Chatbot, tìm kiếm, thông báo, xuất file, tệp và Realtime tuân theo cùng giới hạn.
- [ ] Đổi vai trò và khóa tài khoản có hiệu lực với phiên đang mở, nhiều tab và sau khi tải lại trang.
- [ ] Không thể khóa hoặc hạ vai trò Quản lý hoạt động cuối cùng.
- [ ] Kiểm tra giao diện máy tính và điện thoại, chạy kiểm thử hồi quy liên quan và lưu bằng chứng nghiệm thu.

## 8. Chuyển đổi và bàn giao

- [ ] Lưu cấu hình vai trò, quyền và ánh xạ tài khoản trước khi chuyển đổi.
- [ ] Chuẩn bị migration và phương án khôi phục tương thích với mã nguồn.
- [ ] Xác nhận tài khoản Quản lý và Nhân viên; ghi rõ thay đổi quyền so với trước.
- [ ] Kiểm thử trước khi áp dụng lên hệ thống đang chạy.
- [ ] Áp dụng theo thứ tự tránh gián đoạn hoặc mở quyền quá rộng khi chuyển đổi.
- [ ] Kiểm tra lại đăng nhập, đổi vai trò, khóa tài khoản và nghiệp vụ chính sau triển khai.
- [ ] Kiểm tra bằng dữ liệu nghiệp vụ, định nghĩa CSDL, phản hồi API và trình duyệt; không truy vấn hệ thống Logs Supabase Cloud theo `AGENTS.md`.
- [ ] Bàn giao bảng phân quyền và hướng dẫn chọn vai trò; cập nhật checklist theo kết quả thật.
- [ ] Giữ thay đổi ở local; chỉ `git push` khi người dùng yêu cầu rõ ràng.

## Các giai đoạn thực hiện

Thực hiện theo thứ tự dưới đây. Kiểm thử phần đã sửa ngay trong từng giai đoạn; giai đoạn 5 là kiểm thử tích hợp toàn bộ. Chỉ đánh dấu hoàn thành khi có đầu ra và bằng chứng tương ứng.

### Giai đoạn 1 — Rà soát và hoàn tất thiết kế quyền

Trạng thái: Hoàn thành ngày 04/11/2026. Chỉ hoàn tất rà soát và thiết kế, chưa áp dụng lên hệ thống.

- [x] Kiểm kê cấu trúc, vai trò, quyền, RLS và các hàm liên quan trên Cloud; lưu báo cáo ở `docs/security/PAWPAL_RASOAT_PHAN_QUYEN_CSDL.md`.
- [x] Hoàn tất các mục còn lại ở mục 3: ánh xạ chức năng, mã vai trò Nhân viên STAFF và phạm vi công việc được giao.
- [x] Xác định quyền cho chức năng chưa nêu trong bảng như Pawpoint, ưu đãi, đánh giá và xuất dữ liệu.
- [x] Lập phương án xử lý trạng thái ACTIVE/active và tài khoản chưa có vai trò, giữ nguyên các giới hạn khóa và nghỉ việc.

Đầu ra đã lưu tại [bản thiết kế giai đoạn 1](docs/security/PAWPAL_GIAI_DOAN_1_THIET_KE_PHAN_QUYEN.md). Giai đoạn 1 chỉ rà soát và thiết kế; việc triển khai thử nghiệm ghi nhận ở giai đoạn 2. Chưa chạy trọn bộ PQ-01 đến PQ-30 trên giao diện.

**Đầu ra và điều kiện hoàn thành:** Có danh sách thao tác thuộc từng vai trò, quan hệ dữ liệu dùng để giới hạn phạm vi và phương án chuyển đổi tài khoản; không còn chức năng chưa được phân loại trước khi cấp quyền tương ứng.

### Giai đoạn 2 — Hoàn thiện Supabase và API

Trạng thái: Hoàn thành ngày 04/11/2026 trên môi trường thử nghiệm. Chưa áp dụng migration trên Cloud hoặc triển khai API mới lên hệ thống đang chạy.

- [x] Thực hiện phần CSDL/API của mục 4 trên môi trường kiểm thử: hai bộ quyền cố định, kiểm soát API/RPC và RLS theo phạm vi.
- [x] Tách lịch khả dụng công khai khỏi lịch nhân sự, bảo vệ thanh toán, hoàn tiền, kho và dữ liệu nội bộ.
- [x] Giới hạn thao tác gán vai trò ở API/RPC; giữ bảo vệ Quản lý cuối cùng và xử lý thay đổi đồng thời.
- [x] Chuẩn bị migration 165 và phương án khôi phục đã thử; kiểm tra các đường gọi trực tiếp bằng SQL và HTTP/JWT.

Đầu ra: [báo cáo và bằng chứng giai đoạn 2](docs/security/PAWPAL_GIAI_DOAN_2_SUPABASE_API.md). Đã kiểm tra dấu kiểm 31 hàm so với Cloud, không thấy thay đổi nguồn; Cloud vẫn chỉ có ADMIN. Giai đoạn 3 nối giao diện vào RPC có phạm vi; giai đoạn 4 tiếp tục chatbot, bộ nhớ đệm và Realtime.

**Đầu ra và điều kiện hoàn thành:** Bộ quyền được thực thi trên máy chủ và CSDL trong môi trường kiểm thử, yêu cầu vượt quyền bị chặn và không làm thay đổi dữ liệu. Chưa chuyển tài khoản đang vận hành ở giai đoạn này.

### Giai đoạn 3 — Áp dụng vào giao diện Admin

Trạng thái: Hoàn thành ngày 05/11/2026 trên môi trường thử nghiệm. Các modal đã qua nghiệm thu; toàn bộ bộ nghiệp vụ phân quyền đã chạy bằng Auth thật và hồi quy các phần Quản lý bị ảnh hưởng. Đánh giá khách giữ cho Quản lý theo lựa chọn người dùng. Chưa chuyển đổi Cloud; AI, cập nhật phiên và Realtime vẫn thuộc giai đoạn 4, bộ PQ tổng hợp thuộc giai đoạn 5.

- [x] Xác minh vai trò trực tiếp từ phiên và RPC trước khi nạp dữ liệu; không dùng vai trò lưu trong trình duyệt làm nguồn cấp quyền.
- [x] Modal tài khoản chỉ chọn Quản lý/Nhân viên, gửi đúng một vai trò và quyền riêng rỗng; đã thử lưu qua RPC thật trên CSDL riêng.
- [x] Kiểm tra modal tài khoản trên máy tính/điện thoại, không cắt cột, hỗ trợ bàn phím và bốn cách đóng.
- [x] Người dùng nghiệm thu modal tài khoản: “Đồng ý, tiếp tục”.
- [x] Nhân viên dùng màn hình đọc qua RPC có phạm vi; chặn phân hệ Cấu hình và không khởi tạo bộ tải quản trị.
- [x] Nối modal Thêm khách cho Nhân viên vào `create_customer_quick`; kiểm tra dữ liệu bắt buộc, chuẩn hóa số điện thoại, báo trùng và mở hồ sơ vừa lưu. Email và liên kết Auth để null.
- [x] Kiểm tra trực quan modal Thêm khách trên máy tính/điện thoại và bốn cách đóng; bộ kiểm thử trình duyệt hiện có 25 nhóm đạt trên CSDL riêng, đã dọn bản sao kiểm thử.
- [x] Người dùng nghiệm thu modal Thêm khách: “Đồng ý, tiếp tục”; chuyển sang modal thú cưng theo `AGENTS.md:243`.
- [x] Modal Thêm bé cưng dùng chủ nuôi và giống/loài từ RPC có phạm vi; tự điền SĐT, bỏ chọn xóa SĐT; ghi chú nhập tự do; lưu bằng `save_admin_pet`, mở hồ sơ vừa tạo.
- [x] Kiểm tra lưu thú cưng và cân nặng cùng giao dịch, tải lại còn dữ liệu; chặn ngày sinh tương lai, cân nặng sai và tên trùng; hỗ trợ bàn phím, bốn cách đóng, xem ảnh máy tính/điện thoại. Bộ kiểm thử hiện có 34 nhóm đạt trên CSDL riêng và đã dọn bản sao.
- [x] Người dùng đồng ý nghiệp vụ Thêm bé cưng và phản ánh màu modal; đã sửa nền trắng đặc, bỏ làm mờ theo modal chuẩn, xem lại ảnh máy tính/điện thoại. Người dùng yêu cầu tiếp tục.
- [x] Nối Sửa hồ sơ bé cưng: lấy dữ liệu mới trước khi mở form, giữ chủ nuôi cố định, gửi phiên bản `updated_at`, cập nhật hồ sơ/cân nặng cùng giao dịch và tải lại hồ sơ sau lưu.
- [x] Kiểm tra sửa thật, tải lại còn dữ liệu, xung đột không ghi đè/không thêm cân nặng, chặn giả mạo chuyển chủ nuôi, bàn phím và bốn cách đóng. Bộ trình duyệt hiện có 40 nhóm đạt, đã dọn bản sao CSDL; đã xem ảnh máy tính và đầu/cuối form điện thoại.
- [x] Người dùng nghiệm thu modal Sửa hồ sơ bé cưng và nền trắng: “Đồng ý, tiếp tục”.
- [x] Nối Sửa thông tin khách với `update_customer_profile`: họ tên, SĐT, email liên hệ, giới tính, ngày sinh; đọc lại dữ liệu/phiên bản trước khi mở, giữ hạng hiện tại và không thay sổ địa chỉ.
- [x] Kiểm tra ghi thật và tải lại, SĐT trùng không ghi một phần, email trống thành null, chặn ngày sinh/email sai, xung đột cập nhật, từ chối payload xóa hạng, bàn phím và bốn cách đóng; xem ảnh máy tính/điện thoại. Bộ trình duyệt có 48 nhóm đạt, đã dọn bản sao CSDL.
- [x] Người dùng nghiệm thu modal Sửa thông tin khách: “Đồng ý, tiếp tục”.
- [x] Nối Sổ địa chỉ với RPC có phạm vi: tải đủ các trang, thêm/sửa/xóa, đúng một mặc định khi còn địa chỉ; thêm mới điền sẵn người nhận và SĐT, chuẩn hóa SĐT; giữ thông tin khách và hạng khi lưu.
- [x] Kiểm tra 11 địa chỉ không mất trang sau, đổi mặc định, xóa mặc định/cuối cùng, xung đột cập nhật, từ chối ID địa chỉ khách khác, lỗi tải khóa lưu, bàn phím và bốn cách đóng; xem ảnh máy tính/điện thoại. Bộ trình duyệt có 57 nhóm đạt, đã dọn bản sao CSDL.
- [x] Người dùng yêu cầu “tiep tuc” sau phần nghiệm thu Sổ địa chỉ; chuyển sang Tạo lịch hẹn.
- [x] Nối Tạo lịch hẹn cho Nhân viên: khách/thú cưng/dịch vụ dùng autocomplete CSDL, chọn khách tự điền SĐT và bé đầu tiên; chọn bé trước tự điền chủ nuôi; lấy cân nặng đã lưu; trường tạo kiểu, lưu trú và xe chỉ hiện theo gói, xóa khi đổi gói.
- [x] Tạo lịch chăm sóc, lưu trú có phòng và xe một chiều/khứ hồi qua RPC hiện có; giá do CSDL quyết định. Lịch mới chờ Quản lý phân công, không có ô điều phối cho Nhân viên; giữ mã yêu cầu khi thử lại sau mất phản hồi.
- [x] Bổ sung migration/khôi phục 166: danh mục đặt lịch có phạm vi và chặn Nhân viên gửi `staff_id` trong cả hai RPC tạo lịch. Chỉ áp dụng trên bản sao thử nghiệm, đã thử khôi phục và đối chiếu dấu kiểm hai RPC gốc.
- [x] Bộ trình duyệt có 68 nhóm đạt, gồm lưu thật chăm sóc/lưu trú/xe, giá, mất phản hồi không trùng, trùng phòng, chặn tự phân công, chọn bé trước, trường có điều kiện và ẩn danh bị chặn; xem ảnh máy tính/điện thoại; đã dọn bản sao CSDL.
- [x] Người dùng nghiệm thu modal Tạo lịch hẹn: “Đồng ý, tiếp tục”.
- [x] Nối Biên bản tiếp nhận với `save_admin_service_record`: đọc mới ca được giao/khách/thú cưng; cố định người tiếp nhận là tài khoản hiện tại; cân nặng và bốn ghi nhận bắt buộc; tư trang nhập tự do; xác nhận khách mặc định chưa chọn.
- [x] Lưu biên bản, cân nặng và chuyển ca/hạng mục chính sang đang thực hiện trong một giao dịch; giữ UUID khi thử lại. Có thể lập phiên bản tiếp nhận mới cho ca đang thực hiện, giữ biên bản cũ; bảng biên bản hiển thị trạng thái khách xác nhận.
- [x] Bộ trình duyệt có 78 nhóm đạt: lưu thật và tải lại, xung đột không ghi một phần, phân lại ca thu hồi quyền lưu, chặn giả mạo người tiếp nhận/ca người khác, mất phản hồi không trùng, bản xác nhận sau giữ bản chờ trước đó, lỗi tải khóa lưu và bàn phím/bốn cách đóng. Đã xem ảnh máy tính/điện thoại và dọn CSDL bản sao.
- [x] Người dùng nghiệm thu modal Biên bản tiếp nhận: “Đồng ý, tiếp tục”.
- [x] Hạng mục được giao có menu bắt đầu/hoàn thành, gửi đúng phiên bản qua `perform_staff_service_item`; không hiện hạng mục đồng nghiệp. Khi mất phản hồi, đọc trạng thái có phạm vi trước khi cho thao tác tiếp.
- [x] Nối form thêm/sửa Nhật ký chăm sóc cho ca đang thực hiện; người ghi cố định theo phiên, chỉ sửa nhật ký của mình, không có xóa; kiểm tra thời điểm, phiên bản ca/nhật ký; giữ nguyên thời điểm chính xác nếu chỉ sửa nội dung.
- [x] Bổ sung migration/khôi phục 167 chặn Nhân viên giả mạo người ghi nhật ký tại `work_guard_rpc`; áp dụng/thử khôi phục trên CSDL bản sao, đối chiếu định nghĩa guard khớp nguyên bản.
- [x] Bộ trình duyệt có 91 nhóm đạt, gồm lưu thật, mất phản hồi không trùng, xung đột ca/nhật ký/hạng mục, chặn giả mạo người ghi/sửa/xóa nhật ký đồng nghiệp, hạng mục đồng nghiệp, thời điểm trước tiếp nhận và bàn phím/bốn cách đóng. Đã xem ảnh máy tính/điện thoại, dọn bản sao CSDL.
- [x] Người dùng nghiệm thu form Nhật ký chăm sóc (thêm/sửa): “Đồng ý, tiếp tục”.
- [x] Nối Biên bản bàn giao với `save_admin_service_record`: lấy biên bản tiếp nhận mới nhất, ba xác nhận bắt buộc không chọn sẵn, ghi chú tự do; giữ UUID khi thử lại; lưu biên bản và hoàn tất ca/hạng mục cùng giao dịch.
- [x] Kiểm tra chặn bản tiếp nhận mới chưa xác nhận dù bản cũ đã xác nhận, hạng mục đồng nghiệp chưa xong, điều chỉnh chưa đủ duyệt/xác nhận, lưu trú chưa trả phòng, lượt về xe chưa đến giờ, phiên bản cũ và phân lại ca.
- [x] Bổ sung migration/khôi phục 168: nối quyền STAFF có phạm vi vào trigger đồng bộ lưu trú/xe, giữ ràng buộc giờ/phòng và không cấp quyền ghi bảng cũ; chặn trường hợp người phụ trách null. Đã thử khôi phục đúng định nghĩa trigger gốc trên CSDL bản sao.
- [x] Bộ trình duyệt có 105 nhóm đạt; gồm bàn giao thật, mất phản hồi không trùng, hoàn tất lưu trú sau đóng phòng qua RPC, thời điểm xe và các kiểm tra trên. Đã xem ảnh máy tính/điện thoại; đã dọn CSDL bản sao và một tài nguyên kiểm thử bị dừng giữa chừng theo marker sở hữu.
- [x] Người dùng nghiệm thu modal Biên bản bàn giao: “Đồng ý, tiếp tục”.
- [x] Nối modal Trả phòng: đọc mới ca/phòng/đơn giá đã chốt, chỉ người phụ trách ca được trả phòng; gửi phiên bản ca và đối chiếu trạng thái thật khi mất phản hồi.
- [x] Bổ sung migration/khôi phục 169 cho dữ liệu phòng có phạm vi; bộ trình duyệt đạt 115 nhóm, giữ nguyên giá/hạng mục/thanh toán, phòng trả nhận được đặt chỗ mới; khôi phục đúng định nghĩa gốc và dọn CSDL bản sao.
- [x] Người dùng yêu cầu “tiếp tục” sau ảnh Trả phòng; chuyển sang modal Tạo đơn tại quầy.
- [x] Nối modal Tạo đơn tại quầy qua RPC có quyền STAFF: tìm khách/sản phẩm có phân trang, tự điền SĐT, gộp biến thể, đổi số lượng/xóa; không sửa giá hoặc hoàn tiền.
- [x] Tính giá/tồn có thể bán/hạng/voucher/điểm qua máy chủ; chặn bản tính cũ, giữ UUID khi thử lại; tạo đơn pending và giữ hàng, chưa ghi nhận thu tiền.
- [x] Bộ trình duyệt đạt 126 nhóm, gồm giá thay đổi, vượt tồn, voucher/điểm không hợp lệ, mất phản hồi không tạo trùng, đối chiếu đơn/hàng giữ/audit/không thanh toán; xem ảnh máy tính/điện thoại, kiểm tra cú pháp, dọn CSDL bản sao.
- [x] Người dùng nghiệm thu modal Tạo đơn tại quầy: “Đồng ý, tiếp tục”.
- [x] Nối modal Thu tiền đơn hàng với số dư/lịch sử/phương thức thật qua RPC; chỉ gửi collect, không có hoàn tiền; số tiền/nội dung/xác nhận thực nhận bắt buộc, chuyển khoản yêu cầu mã đã đối soát.
- [x] Giữ phiên bản và UUID khoản thu; đối chiếu mất phản hồi bằng khoản thu thực, khóa nội dung chưa rõ kết quả và giữ yêu cầu khi đóng/mở lại trong phiên; lỗi nghiệp vụ yêu cầu đọc lại.
- [x] Bộ trình duyệt đạt 140 nhóm: thu một phần/thu đủ, mã ngân hàng trùng, bản cũ, phương thức bị tắt, giả mạo hoàn tiền, lỗi đọc và mất phản hồi; giữ nguyên giá/kho/hàng giữ chỗ, đúng audit. Sửa lỗi popover đóng ngay khi bỏ chọn; xem ảnh máy tính/điện thoại, kiểm tra cú pháp và dọn bản sao CSDL.
- [x] Người dùng nghiệm thu modal Thu tiền đơn hàng: “Đồng ý, tiếp tục”.
- [x] Nối modal Thu tiền ca dịch vụ theo ca được giao, số dư/phương thức/lịch sử thật; chỉ collect, bắt buộc thực nhận, không sửa giá/duyệt điều chỉnh/hoàn tiền.
- [x] Kiểm tra chặn phân lại ca, ca ngoài phạm vi, bản cũ, điều chỉnh chờ duyệt hoặc khách chưa xác nhận; giữ UUID và đối chiếu khoản thu thật khi lỗi mạng, không ghi trùng.
- [x] Bộ trình duyệt đạt 153 nhóm: thu một phần/thu đủ, mã ngân hàng trùng với đơn bán hàng, giả mạo hoàn tiền, lỗi đọc, thử lại/mất phản hồi; giữ nguyên ca/hạng mục/biên bản và đúng audit. Đã xem ảnh máy tính/điện thoại, kiểm tra cú pháp và dọn CSDL bản sao.
- [x] Người dùng nghiệm thu modal Thu tiền ca dịch vụ: “Đồng ý, tiếp tục”.
- [x] Nối modal Trao đổi khiếu nại: mặc định nội bộ, chọn rõ phản hồi khách hoặc ghi nhận yêu cầu bổ sung; chỉ phiếu được giao, giữ phiên bản và UUID khi kết quả chưa rõ, kể cả đóng/mở lại.
- [x] Phân biệt phạm vi nội bộ/khách trong lịch sử, phân trang 10 dòng; chặn phiếu đã kết thúc, yêu cầu bổ sung khi chờ duyệt và các action quản trị; không tự gửi qua kênh ngoài.
- [x] Bộ trình duyệt đạt 167 nhóm: lưu thật, thời điểm phản hồi đầu tiên, đổi trạng thái, phân lại người, phiếu khác, phiên bản cũ, thử lại không trùng, chặn giả mạo duyệt/đóng/mở lại/liên kết; xem ảnh máy tính/điện thoại, kiểm tra cú pháp và dọn bản sao CSDL.
- [x] Người dùng nghiệm thu modal Trao đổi khiếu nại: “Đồng ý, tiếp tục”.
- [x] Nối modal Đề xuất phương án xử lý với action propose: năm phương án theo giao dịch dịch vụ/bán hàng, số tiền chỉ cho hoàn tiền, lý do bắt buộc; chuyển chờ Quản lý duyệt, không thực hiện bồi hoàn.
- [x] Bổ sung migration/khôi phục 170: phép chiếu liên kết và kết quả xử lý chỉ cho phiếu được giao, mã giao dịch khớp khách; không cấp quyền bảng nguồn hoặc duyệt. Đã thử khôi phục và đối chiếu MD5 nguyên bản trên CSDL bản sao.
- [x] Bộ trình duyệt đạt 180 nhóm: phương án hợp lệ/sai loại, bản cũ, phân lại phiếu, thiếu/sai liên kết, số tiền/lý do, thử lại cùng UUID sau mất phản hồi, phiếu chờ duyệt/kết thúc; tiền/kho/trả hàng/phân công giữ nguyên. Đã xem ảnh máy tính/điện thoại, kiểm tra cú pháp và dọn CSDL bản sao.
- [x] Người dùng nghiệm thu modal Đề xuất phương án xử lý: “Đồng ý, tiếp tục”.
- [x] Nối modal Tạo khiếu nại: chọn khách/SĐT, nhóm, ưu tiên, giao dịch, tiêu đề/nội dung; chủ động đánh dấu chưa xác định giao dịch nếu cần. Tạo phiếu pending chưa phân công, không tự cấp quyền xử lý cho người tạo.
- [x] Migration/khôi phục 171 bổ sung danh sách giao dịch đúng khách, ca dịch vụ có phạm vi, tìm mã/phân trang 10 dòng; không cấp quyền bảng nguồn. Đã thử khôi phục trên CSDL bản sao.
- [x] Bộ trình duyệt đạt 194 nhóm: lưu thật dịch vụ/bán hàng/không liên kết, khách–giao dịch sai, ca ngoài phạm vi/phân lại, thử lại không trùng, thiếu trường/lỗi gợi ý, phân trang và chặn truy cập ẩn danh. Sửa sự kiện nút chuyển trang, xử lý mã đơn dài; xem ảnh máy tính/điện thoại, kiểm tra cú pháp và dọn bản sao CSDL.
- [x] Người dùng yêu cầu tiếp tục sau ảnh Tạo khiếu nại; chuyển sang Đổi mật khẩu cá nhân.
- [x] Nối modal Đổi mật khẩu cá nhân cho Quản lý/Nhân viên: ba ô che mật khẩu, kiểm tra nhập lại, xóa ô khi đóng/lỗi, không lưu mật khẩu vào storage; sau thành công dọn phiên hiện tại và yêu cầu đăng nhập lại.
- [x] Endpoint tự đổi dùng token + Auth email chính người đăng nhập, xác minh mật khẩu cũ và kiểm tra lại quyền trước cập nhật bằng phiên người đó; không dùng service key để đổi, không nhận ID đích, không bỏ cổng đổi lần đầu. Kết quả mạng chưa rõ không tự thử lại mù.
- [x] 10 nhóm kiểm thử trình duyệt/Auth thật cục bộ đạt: sai mật khẩu cũ, quyền đổi giữa hai lần kiểm tra, tài khoản khóa/must_change_password, mật khẩu cũ/mới, STAFF/ADMIN và mất phản hồi sau cập nhật. Hồi quy 194 nhóm và 6 bài API quyền cố định đạt; xem ảnh máy tính/điện thoại, đối chiếu dấu kiểm nguồn, dọn CSDL/Auth/PostgREST bản sao.
- [x] Người dùng nghiệm thu modal Đổi mật khẩu cá nhân: “Đồng ý, tiếp tục”.
- [x] Đối chiếu thiết kế giai đoạn 1 với giao diện; lập [báo cáo khoảng trống tích hợp](docs/security/PAWPAL_GIAI_DOAN_3_RASOAT_TICH_HOP.md), không chốt giai đoạn 3 khi còn thiếu luồng.
- [x] Nối hàng chờ chat tối thiểu, tự tiếp nhận theo phiên bản, phân trang tin nhắn và ghi chú nội bộ của mình; không tải trước nguyên văn hàng chờ hoặc đọc nội dung người khác.
- [x] Nối modal Kết thúc hội thoại: kết quả/xác nhận bắt buộc, khảo sát mặc định tắt; receipt theo UUID và người thực hiện đối chiếu mất phản hồi ngay cả sau khi RPC xóa phân công.
- [x] Migration/khôi phục 172 chỉ thêm phiên bản hàng chờ và biên nhận có phạm vi; 208 nhóm hồi quy và 10 nhóm Auth thực đạt, gồm cạnh tranh tiếp nhận, mất phản hồi, phân lại ca, quyền biên nhận và khôi phục đúng định nghĩa gốc. Đã xem ảnh, dọn tài nguyên bản sao.
- [x] Bổ sung dọn modal Tạo lịch hẹn khi xác minh quyền thất bại; kiểm thử xóa dữ liệu thực thể và ẩn thao tác tài khoản.
- [x] Người dùng nghiệm thu modal Kết thúc hội thoại: “Đồng ý, tiếp tục”.
- [x] Nối modal Mời đón bé vào hồ sơ ca: tải khách/bé theo phạm vi, nội dung tối đa 4000 ký tự và xác nhận sẵn sàng bắt buộc, mặc định chưa tích; chỉ gửi thông báo vào tài khoản PawPal của khách qua RPC hiện có.
- [x] Giữ UUID và khóa nội dung khi chưa xác nhận kết quả gửi; mở lại vẫn thử cùng thông báo. Đóng/đổi trang/lỗi xác minh quyền dọn dữ liệu hiển thị.
- [x] Hoàn tất kiểm thử và xem ảnh máy tính/điện thoại cho Mời đón bé: 219 nhóm hồi quy và 10 nhóm Auth thực đạt; bản cũ/phân lại ca/thiếu xác nhận tiếp nhận/điều chỉnh chưa xong bị chặn; mất phản hồi thử cùng UUID chỉ tạo một thông báo và một audit; bản sao đã dọn, dấu kiểm mã nguồn khớp.
- [x] Người dùng nghiệm thu modal Mời đón bé: “Đồng ý, tiếp tục”.
- [x] Hiển thị hạng, số Pawpoint và ghi chú trong hồ sơ một khách được chọn; thêm RPC đọc tối thiểu 173, không trả chi tiêu, sổ điểm, tài khoản Auth hoặc cấp quyền bảng.
- [x] Nối modal Ghi chú khách hàng: nạp ghi chú hiện tại, nhập tự do tối đa 10000 ký tự, cho phép xóa nội dung; dùng `save_customer_note` có kiểm tra phiên bản, không sửa hạng/điểm/tài khoản.
- [x] Hoàn tất kiểm thử và xem ảnh máy tính/điện thoại cho Ghi chú khách hàng; kiểm tra khôi phục 173. Kết quả mới nhất: 231 nhóm hồi quy và 10 nhóm Auth thực đạt; đã kiểm tra dữ liệu đọc tối thiểu, lưu/xóa, hiển thị chữ thuần, xung đột, mất phản hồi, thu hồi quyền, lỗi đọc/xác minh và bốn cách đóng. Dấu kiểm nguồn khớp; tài nguyên bản sao đã dọn.
- [x] Người dùng nghiệm thu modal Ghi chú khách hàng: “Tiếp tục”.
- [x] Nối modal Phiếu bán hàng chỉ đọc cho một đơn; migration/khôi phục 174 trả thông tin phiếu tối thiểu, không trả giá vốn, bảng thanh toán thô hoặc tổng hợp cửa hàng.
- [x] Phân trang xem tối đa 10 sản phẩm; in toàn bộ sản phẩm của đúng đơn sau khi đọc lại quyền và dữ liệu mới; dọn phiếu và khung in khi đóng/đổi trang/lỗi xác minh.
- [x] Hoàn tất kiểm thử CSDL/trình duyệt, xem ảnh máy tính/điện thoại và kiểm tra khôi phục 174 cho Phiếu bán hàng. Kết quả mới nhất: 241 nhóm hồi quy và 10 nhóm Auth thực đạt; xem 10 dòng/trang, in đủ 12 dòng qua dữ liệu mới, không ghi nghiệp vụ; lỗi đọc/thu hồi quyền chặn in; dọn khung in và trả tiêu điểm sau in. Dấu kiểm nguồn khớp; tài nguyên bản sao đã dọn.
- [x] Người dùng nghiệm thu modal Phiếu bán hàng: “Đồng ý, tiếp tục”.
- [x] Nối modal Phiếu ca dịch vụ chỉ đọc vào hồ sơ ca; thêm migration/khôi phục 175 cho một ca theo đúng phạm vi thu ngân và phân công hiện có.
- [x] Loại hạng mục đã hủy khỏi phiếu; điều chỉnh chỉ tính khi đã duyệt và khách xác nhận. Xem 10 hạng mục/trang, in đủ hạng mục tính tiền sau khi đọc lại quyền và dữ liệu mới.
- [x] Hoàn tất kiểm thử CSDL/trình duyệt, xem ảnh máy tính/điện thoại và khôi phục 175 cho Phiếu ca dịch vụ. Kết quả mới nhất: 252 nhóm hồi quy và 10 nhóm Auth thực đạt; ca khác/null/ẩn danh bị chặn, loại hạng mục hủy, chỉ tính điều chỉnh đã duyệt và khách xác nhận, phân trang 10 dòng và in đủ dòng qua dữ liệu mới. Phân lại ca/lỗi đọc chặn in; không ghi nghiệp vụ, dọn khung in và trả tiêu điểm. Dấu kiểm nguồn khớp; tài nguyên bản sao đã dọn.
- [x] Người dùng nghiệm thu modal Phiếu ca dịch vụ: “Đồng ý, tiếp tục”.

Ghi nhận 05/11/2026: Người dùng đã nghiệm thu Phiếu bán hàng. Đã thêm và kiểm thử Phiếu ca dịch vụ cùng migration/khôi phục 175 chỉ đọc một ca theo phạm vi thu ngân đã chốt. Chưa áp dụng Cloud/CSDL chính hoặc push; giai đoạn 3 vẫn đang thực hiện.
xo
Ghi nhận 05/11/2026: Đã nghiệm thu Ghi chú khách hàng theo yêu cầu “Tiếp tục”. Đã thêm và kiểm thử Phiếu bán hàng cùng migration/khôi phục 174 chỉ đọc một đơn; chưa làm phiếu ca dịch vụ. Chưa áp dụng Cloud/CSDL chính hoặc push; giai đoạn 3 vẫn đang thực hiện.

Ghi nhận 05/11/2026: Mời đón bé đã được nghiệm thu. Đã nối hạng/Pawpoint chỉ đọc và modal Ghi chú khách hàng; thêm migration/khôi phục 173 cho đường đọc tối thiểu, giữ nguyên RPC ghi và bộ quyền. Chưa ghi Cloud hoặc push; giai đoạn 3 chưa hoàn tất.

Ghi nhận 05/11/2026: Người dùng đã nghiệm thu Kết thúc hội thoại. Đã thực hiện và kiểm thử Mời đón bé như trên; không thêm migration, không ghi Cloud và không push. Chi tiết và ảnh tại [báo cáo giao diện giai đoạn 3](docs/security/PAWPAL_GIAI_DOAN_3_GIAO_DIEN.md). Giai đoạn 3 vẫn đang thực hiện.
- [x] Hoàn thiện hoặc chốt phạm vi các mục còn thiếu từ rà soát: mời đón bé, Pawpoint/hạng, chứng từ đơn/ca, ghi chú khách và các điểm liên kết nghiệp vụ; không tự mở quyền quản trị. Đánh giá khách giữ cho Quản lý; điều phối giao hàng không thuộc STAFF.
- [x] Hoàn thiện và nghiệm thu lần lượt các modal nghiệp vụ: Thêm khách, hồ sơ thú cưng, đặt lịch, xử lý ca, bán hàng/thu tiền và hỗ trợ như lịch sử phía trên.
- [x] Hoàn thiện thao tác nghiệp vụ, đổi mật khẩu cá nhân và kiểm tra tích hợp giao diện giai đoạn 3: bộ 300 nhóm với Auth thật; hồi quy Quản lý và phạm vi bị chặn trên CSDL bản sao. Không suy ra đã kiểm thử mọi biến thể nghiệp vụ cũ hoặc hoàn tất bộ PQ.

- [x] Trong mục 5, hồ sơ tài khoản chỉ chọn Quản lý hoặc Nhân viên; các modal bổ sung vẫn nghiệm thu lần lượt.
- [x] Áp dụng menu, tab, nút, đường dẫn và cách tải dữ liệu theo vai trò cho tám phân hệ STAFF; các nghiệp vụ còn thiếu được liệt kê riêng trong báo cáo rà soát.
- [x] Kiểm tra các luồng được phép và bị chặn trên máy tính, điện thoại; các modal đã sửa có nghiệm thu theo `AGENTS.md`. Bằng chứng kết thúc tại `docs/security/phase3/auth-integration/ui-results.txt` và ảnh trong báo cáo giao diện.

Tiến độ và bằng chứng: [báo cáo giai đoạn 3](docs/security/PAWPAL_GIAI_DOAN_3_GIAO_DIEN.md).

**Đầu ra và điều kiện hoàn thành:** Nhân viên sử dụng đúng bộ chức năng đã chốt, không cần tích quyền riêng; giao diện không tải hoặc hiển thị dữ liệu ngoài phạm vi và phù hợp kiểm soát phía máy chủ.

#### Dọn cấu trúc file Nhân viên theo yêu cầu người dùng

- [x] Chuyển 19 file `admin-staff-*` từ `pages/admin/` vào `pages/admin/modules/staff-workspace/`, chia nhóm `customers`, `services`, `sales`, `support`; phần khung và CSS ở thư mục gốc của nhóm.
- [x] Giữ nguyên từng byte của các file được chuyển, tên đối tượng JS, thứ tự tải và nghiệp vụ. Bảng đối chiếu tại [file-organization-results.txt](docs/security/phase3/file-organization-results.txt).
- [x] Cập nhật đường dẫn trong `index.html` và hai bộ kiểm thử; kiểm tra cú pháp JS, tài nguyên Admin tồn tại và mỗi file được tải đúng một lần. Hướng dẫn của đợt dọn thư mục cũ đã được thay bằng [báo cáo cấu trúc hiện tại](docs/security/PAWPAL_GIAI_DOAN_3_GIAO_DIEN.md).
- [x] Chạy lại 252 nhóm hồi quy và 10 nhóm Auth thực trên cấu trúc mới: tất cả PASS. Mã băm nguồn khớp, 19 file giữ nguyên từng byte, không còn đường dẫn cũ trong mã chạy; CSDL/container bản sao đã dọn.

Ghi nhận 05/11/2026: Đã hoàn tất dọn thư mục theo yêu cầu “ok”. Chỉ chuyển 19 file và sửa đường dẫn trong `index.html`/hai bộ kiểm thử, không thay giao diện, nghiệp vụ hoặc CSDL. Không triển khai Cloud hoặc push.

Việc dọn thư mục không thay đổi trạng thái nghiệm thu Phiếu ca dịch vụ hoặc hoàn tất giai đoạn 3. `admin-access.js` và `admin-own-password.js` vẫn là thành phần dùng chung ở `pages/admin/`.

#### Rà soát dùng chung JS — bắt đầu với Nhật ký chăm sóc

- [x] Đối chiếu form và hàm lưu của Quản lý/Nhân viên: cùng RPC nhưng khác phạm vi đọc, chọn người thực hiện, xóa và cập nhật giao diện sau lưu.
- [x] Đưa Nhật ký chăm sóc vào `pages/admin/modules/services/care-log.js`; hai vai trò dùng chung `PawpalCareLog.save`, không còn hai đoạn gọi/kiểm tra kết quả RPC lưu riêng.
- [x] Giữ form đã nghiệm thu, phiên bản ca/nhật ký, UUID khi thử lại, kiểm tra quyền tại CSDL và xử lý mất phản hồi của từng luồng; Quản lý giữ chọn người thực hiện/xóa, Nhân viên giữ giới hạn của mình.
- [x] Cập nhật đường dẫn, bộ nhớ đệm tải script, tên gọi tại workspace/dọn phiên và kiểm thử. Các module khác chưa hợp nhất hàng loạt.
- [x] Hoàn tất hồi quy: 255 nhóm và 10 nhóm Auth thực PASS. Ba kiểm tra bổ sung dùng hàm chung để Quản lý ghi nhật ký cho người được chọn/xóa với phiên bản mới, đối chiếu audit đúng Quản lý; Nhân viên thử xóa bị CSDL chặn. Mã băm nguồn khớp và tài nguyên bản sao đã dọn; ảnh form Nhân viên giữ bố cục đã nghiệm thu. Chưa kiểm thử toàn bộ form Quản lý từ đầu đến cuối.

Ghi nhận 05/11/2026: Hoàn tất bước dùng chung phần lưu Nhật ký chăm sóc. Chỉ còn một chỗ gọi RPC lưu trong JS giao diện tại `modules/services/care-log.js`; các khác biệt nghiệp vụ theo vai trò được giữ. Chưa hợp nhất các phân hệ khác, không thêm migration, không ghi Cloud hoặc push.

#### Gộp xử lý Nhân viên vào JS phân hệ theo yêu cầu đã làm rõ

- [x] Gộp 17 file nghiệp vụ vào sáu file hiện có: `customers.js`, `pets.js`, `services.js`, `orders.js`, `complaints.js`, `chatbot.js`; bỏ các file rời và thư mục con tương ứng trong `staff-workspace`.
- [x] Tách form thú cưng khỏi gói form khách để đặt đúng `pets.js`; giữ tên hàm gọi tương thích cho các nơi mở form hiện có.
- [x] Giữ nguyên phần thân JS Quản lý; thêm cổng khởi tạo chỉ cho ADMIN. Sau xác minh STAFF, tải JS phân hệ để dùng nhánh theo vai trò, không khởi tạo dữ liệu/subtab Quản lý. `staff-workspace` chỉ giữ khung và CSS chung.
- [x] Cập nhật đường dẫn, thứ tự tải, kiểm thử và bộ nhớ đệm; kiểm tra cú pháp sáu JS phân hệ. Bằng chứng cấu trúc tại [domain-integration-results.txt](docs/security/phase3/domain-integration-results.txt).
- [x] Hoàn tất hồi quy: 255 nhóm và 10 nhóm Auth thực đều PASS, mã băm nguồn khớp, bản sao đã dọn. Kiểm tra sáu JS phân hệ tải đúng một lần cho STAFF, namespace/subtab Quản lý không được khởi tạo và yêu cầu dữ liệu vẫn chỉ qua RPC. Các form khách/thú cưng/dịch vụ/bán hàng/hỗ trợ và hàm Nhật ký chăm sóc dùng chung tiếp tục đạt.

Ghi nhận 05/11/2026: Đã hoàn tất gộp 17 file chức năng vào sáu JS phân hệ hiện có, không còn các file form rời trong `staff-workspace`. 16 phần thân file được giữ nguyên; gói form khách được tách phần thú cưng sang `pets.js` với hàm gọi tương thích. Phần thân Quản lý của cả sáu file được giữ nguyên, chỉ thêm cổng khởi tạo theo vai trò. Không thay CSDL, không triển khai Cloud hoặc push. Bộ kiểm thử chưa bao phủ toàn bộ nghiệp vụ Quản lý và giai đoạn 3 chưa hoàn tất.

Đây là gộp vị trí xử lý vào đúng phân hệ; các khác biệt nghiệp vụ theo vai trò vẫn được giữ. Không thay form đã nghiệm thu, quyền CSDL hoặc migration. Chưa đánh dấu giai đoạn 3 hoàn tất.

#### Bỏ phần workspace riêng, đưa màn hình về JS phân hệ

- [x] Chuyển hồ sơ, cấu hình cột, nút công việc và tác vụ dòng về JS phân hệ tương ứng: khách, thú cưng, dịch vụ, bán hàng, khiếu nại, hội thoại và hồ sơ cá nhân trong `staff.js`.
- [x] Phần điều hướng, bảng, phân trang và dựng khối chung nằm trong `admin.js` qua `PawpalAdminViews`; phân hệ đăng ký phần hiển thị theo vai trò. CSS chung chuyển vào `admin-components.css`.
- [x] Bỏ `admin-staff-workspace.js`, `admin-staff-workspace.css`, README cũ và thư mục `modules/staff-workspace`; cập nhật đường dẫn tải/kiểm thử. Giữ riêng `admin-access.js` và `admin-own-password.js` vì dùng chung toàn Admin.
- [x] Kiểm tra cú pháp bảy JS phân hệ và `admin.js`; giữ nhánh khởi tạo Quản lý sau kiểm tra ADMIN, Nhân viên vẫn đọc qua RPC có phạm vi.
- [x] Hoàn tất hồi quy 255 nhóm và 10 nhóm Auth thực: tất cả PASS, mã băm nguồn khớp, bản sao đã dọn. Đã xem ảnh sau khi giữ lại nền modal không mờ; thêm kiểm tra CSS để chặn hồi quy. Nhân viên tải bảy JS phân hệ nhưng không khởi tạo namespace/subtab Quản lý, chỉ đọc dữ liệu qua RPC có phạm vi.

Ghi nhận 05/11/2026: Hoàn tất bỏ workspace riêng, đưa phần dựng màn hình và tác vụ về JS phân hệ; điều hướng/bảng/phân trang dùng chung trong `admin.js`, CSS chung trong `admin-components.css`. Không còn thư mục `staff-workspace`. Không đổi CSDL hoặc nghiệp vụ, không triển khai Cloud hoặc push. Chưa bao phủ mọi luồng giao diện Quản lý và giai đoạn 3 chưa hoàn tất.

#### Nối tạo khiếu nại từ hồ sơ ca và đơn hàng

- [x] Thêm điểm mở Tạo khiếu nại trong hồ sơ ca/đơn; dùng lại form trong `complaints.js`, không thêm JS hoặc migration.
- [x] Đọc lại nguồn và khách từ CSDL, điền SĐT và giao dịch; khóa khách/nhóm/nguồn khi mở từ hồ sơ, ẩn lựa chọn chưa xác định nguồn. Mở từ danh sách khiếu nại vẫn tìm/chọn bình thường.
- [x] Nguồn ngoài phạm vi hoặc lỗi đọc giữ form không có dữ liệu nguồn cũ và khóa lưu. Giữ nguyên UUID/nguồn/nội dung của lần gửi chưa rõ kết quả, kể cả khi mở lại từ hồ sơ khác.
- [x] Hoàn tất kiểm thử và xem ảnh máy tính/điện thoại: 264 nhóm hồi quy và 10 nhóm Auth thực PASS, dấu kiểm nguồn khớp, tài nguyên bản sao đã dọn. Chín kiểm tra mới gồm tự điền/khóa nguồn, giao diện/tiêu điểm, lưu đúng phiếu, thu hồi phân công, ca khác/lỗi đọc, thử lại cùng UUID qua hồ sơ khác, đơn hàng, luồng danh sách cũ và dọn dữ liệu khi xác minh quyền thất bại.
- [x] Người dùng nghiệm thu biến thể Tạo khiếu nại từ hồ sơ ca/đơn: “Đồng ý, tiếp tục”.
- [x] Nối luồng khiếu nại từ hội thoại vào form hiện có trong `complaints.js`; nút mở thuộc `chatbot.js`, không tạo JS riêng. Khóa đúng khách của hội thoại đang được giao, cho chọn ca/đơn đúng khách hoặc xác nhận chưa xác định giao dịch.
- [x] Thêm migration/khôi phục 176: phiên bản RPC tám tham số nhận nguyên nội dung chi tiết, giữ nguyên phiên bản bảy tham số. Kiểm tra người xử lý, phiên bản hội thoại, phạm vi giao dịch và UUID; ghi liên kết hội thoại vào audit nghiệp vụ. Phiếu mới chờ Quản lý phân công.
- [x] Hoàn tất kiểm thử luồng hội thoại, khôi phục migration và kiểm tra ảnh máy tính/điện thoại: 279 nhóm hồi quy, 10 nhóm Auth thực và 6 bài API đạt. Mã băm nguồn khớp; bản sao kiểm thử đã dọn. Kiểm tra nội dung nhiều dòng/8000 ký tự, nguồn đúng khách, phiên bản cũ, phân lại người xử lý, mất phản hồi không trùng, chặn đổi nguồn/nội dung của UUID cũ, khách vãng lai, mất quyền và tương thích RPC bảy tham số. Đã sửa xóa thông báo lỗi sau khi xác nhận chưa xác định giao dịch.
- [x] Người dùng nghiệm thu biến thể Tạo khiếu nại từ hội thoại: “Đồng ý, tiếp tục”.

Ghi nhận 05/11/2026: Người dùng đã nghiệm thu tạo khiếu nại từ hồ sơ ca/đơn và từ hội thoại. Nguồn hội thoại và migration 176 đã kiểm thử đạt trên CSDL bản sao. Không cấp thêm quyền bảng; chưa triển khai Cloud/push và chưa hoàn tất giai đoạn 3.

#### Đối chiếu phạm vi sau nghiệm thu khiếu nại từ hội thoại

- [x] Ghi nhận nghiệm thu nguồn hội thoại và đối chiếu trạng thái trong báo cáo tích hợp.
- [x] Đối chiếu mục 3 của thiết kế giai đoạn 1: điều phối giao hàng nằm ngoài quyền Nhân viên; không bổ sung luồng này vào giao diện STAFF hoặc coi thiếu luồng đó là lỗi triển khai.
- [x] Đối chiếu bằng chứng hiện có: Phiếu ca dịch vụ đã được kiểm thử trong bộ 279 nhóm hồi quy, ảnh máy tính/điện thoại đã có; vẫn giữ ô nghiệm thu riêng chưa tích khi chưa có xác nhận.
- [x] Nghiệm thu Phiếu ca dịch vụ: “Đồng ý, tiếp tục”.
- [x] Đối chiếu ca/chuyến và sửa khoảng trống lịch sử dài như mục dưới. Không suy ra hoàn tất giai đoạn 3 từ nghiệm thu một form.

#### Phân trang lịch sử trong hồ sơ ca dịch vụ

- [x] Rà soát luồng nhận ca/chuyến: tiếp nhận dùng Biên bản tiếp nhận đã nghiệm thu; CSDL giữ kiểm tra phân công, phòng/giờ nhận và giờ chuyến. Không thêm thao tác tự phân công hoặc chọn tài xế.
- [x] Bổ sung phân trang độc lập tối đa 10 dòng cho Hạng mục của tôi, Biên bản và Nhật ký chăm sóc; đặt thanh trang ngoài khối bảng. Xóa dòng/trang cũ khi tải trang mới thất bại.
- [x] Đối chiếu khi mất phản hồi cập nhật hạng mục qua các trang có phạm vi, thay vì chỉ tìm trong 10 dòng đầu; không gửi lại thao tác nếu đã xác minh trạng thái được ghi.
- [x] Hoàn tất kiểm thử dữ liệu dài, thu hồi phân công, ảnh hai kích thước và hồi quy tích hợp: 285 nhóm hồi quy, 10 nhóm Auth thực và 6 bài API đạt; mã băm nguồn khớp, tài nguyên bản sao đã dọn. Sáu kiểm tra mới dùng 23 dòng mỗi bảng, trang 10/10/3 độc lập, nhật ký đồng nghiệp chỉ đọc, mất phản hồi trang 2 không trùng, lỗi đọc xóa dòng cũ và phân lại ca chặn trang tiếp theo.

Ghi nhận 05/11/2026: Phiếu ca dịch vụ đã được nghiệm thu. Đã sửa phân trang ba bảng hồ sơ ca trong `services.js`, không thêm file JS hoặc migration/quyền. Giai đoạn 3 còn kiểm thử tích hợp đầy đủ, phạm vi phản hồi đánh giá liên quan ca và các mục tổng hợp chưa tích; chưa chuyển sang giai đoạn 4, chưa triển khai Cloud/push.

#### Kiểm tra kết thúc giai đoạn 3

- [x] Người dùng chốt phạm vi đánh giá: “Giữ Quản lý xử lý đánh giá (đề xuất)”. Không thêm giao diện đánh giá cho Nhân viên; dùng hội thoại và khiếu nại đã nghiệm thu để tiếp nhận phản hồi. Không cấp thêm quyền đọc/kiểm duyệt đánh giá.
- [x] Bổ sung chế độ Auth thật cho bộ kiểm thử nghiệp vụ hiện có bằng `PAWPAL_PHASE3_REAL_AUTH=1`; tạo tài khoản GoTrue trên CSDL bản sao rồi liên kết đúng hồ sơ Nhân viên/Quản lý kiểm thử. Không dùng JWT tự ký để thay phiên người dùng trong chế độ này.
- [x] Hoàn tất toàn bộ bộ nghiệp vụ bằng Auth thật: 300 nhóm PASS, dùng tài khoản GoTrue thật gắn với hồ sơ kiểm thử; báo cáo riêng tại `docs/security/phase3/auth-integration/ui-results.txt`. Mã băm nguồn khớp; CSDL bản sao đã dọn.
- [x] Hoàn tất hồi quy Quản lý: chín phân hệ nạp đúng namespace/giao diện, không chạy nhánh STAFF; sáu thân JS quản trị khớp Git gốc sau chuẩn hóa xuống dòng; tạo khách qua form cũ, tải lại thấy đúng dòng; hàm nhật ký dùng chung vẫn lưu/xóa đúng người thực hiện và audit. Không có lỗi JS hoặc truy vấn đọc thất bại trong lượt điều hướng. Kiểm tra bổ sung 15 nhóm và ảnh máy tính/điện thoại tại `docs/security/phase3/auth-smoke/`.
- [x] Dọn toàn bộ tài nguyên kiểm thử và kiểm tra lại: không còn CSDL/container bản sao hoặc tệp cấu hình bí mật tạm của các bộ kiểm thử. Báo cáo 300 nhóm tích hợp, 15 nhóm Quản lý bổ sung và 10 nhóm đổi mật khẩu đều PASS, nguồn khớp; 6 bài API đạt, `git diff --check` đạt. Đã tích các mục tổng hợp giai đoạn 3; giữ nguyên các mục AI/phiên/Realtime và bộ PQ của giai đoạn 4/5 chưa thực hiện.

Ghi nhận kết thúc 05/11/2026: **Hoàn thành giai đoạn 3 trên môi trường thử nghiệm.** Bộ 300 nhóm dùng Auth thật bao gồm 285 nhóm nghiệp vụ cũ và 15 nhóm kiểm tra Auth/Quản lý; không cộng lượt Quản lý bổ sung 15 nhóm lần nữa. Mười nhóm đổi mật khẩu chạy riêng bằng Auth thật. Chi tiết tại [mục kết thúc báo cáo giao diện](docs/security/PAWPAL_GIAI_DOAN_3_GIAO_DIEN.md). Không thay đổi mã giao diện hoặc tạo modal mới trong lượt kết thúc; đã chốt đánh giá cho Quản lý. Chưa bắt đầu giai đoạn 4, chưa triển khai Cloud hoặc push.

### Giai đoạn 4 — Phân quyền chatbot và cập nhật phiên

Trạng thái: Đang thực hiện; lớp dọn phiên/bộ nhớ/kênh, 28 nguồn đọc theo quyền và nền tảng lịch sử riêng cho STAFF đã kiểm thử đạt. API/giao diện chatbot AI cho STAFF vẫn chưa được mở; còn nối các nguồn/lịch sử vào API và kiểm tra quyền trước khi trả lời, cùng Realtime.

- [ ] Thực hiện mục 6: chatbot và công cụ truy xuất dùng cùng quyền với người đăng nhập.
- [ ] Tách quyền doanh thu tổng hợp khỏi quyền đọc thanh toán phục vụ thu ngân; kiểm tra dữ liệu và hành động theo công việc được giao.
- [ ] Xử lý đổi vai trò, khóa tài khoản, nhiều tab, bộ nhớ đệm, lịch sử chat, Realtime và nhật ký.
- [ ] Chạy các trường hợp chatbot PQ-19 đến PQ-21 và các kiểm tra liên quan đến phiên PQ-23 đến PQ-25.

#### Phiên, bộ nhớ đệm và kênh đã đăng ký — bước đầu giai đoạn 4

- [x] Rà soát API trợ lý, registry, đường đọc lịch sử và cổng giao diện: hiện STAFF chưa có quyền lịch sử quản trị cũ nên trợ lý tiếp tục bị chặn. Không ánh xạ quyền thu ngân thành quyền đọc thanh toán tổng hợp để mở AI.
- [x] Xác minh lại phiên sau khi RPC trả về; không chấp nhận phản hồi của danh tính cũ. Đổi tài khoản cùng vai trò hoặc đổi vai trò đều dọn dữ liệu và tải lại toàn bộ ngữ cảnh JS.
- [x] Khi xác minh thất bại: bỏ quyền hiển thị, đóng/dọn form, xóa cache và ngữ cảnh Copilot/tab cũ, gỡ kênh đã đăng ký và hủy bộ nhớ DOM phân hệ. Giữ token Auth riêng để hệ thống xác minh lại; không dùng vai trò trong storage để cấp quyền.
- [x] Xác minh lại khi quay về tab/cửa sổ, khi Auth thay đổi qua tab khác và định kỳ 60 giây khi tab đang hiện và có tiêu điểm; trang được phục hồi từ bộ nhớ trình duyệt phải xác minh lại qua tải trang. Mọi request nghiệp vụ vẫn do CSDL/API kiểm tra, không đợi chu kỳ giao diện.
- [x] 11 nhóm kiểm tra phiên bằng Auth thật đạt trên bản sao: danh tính không đổi không mất nháp, kể cả token được làm mới từ tab khác; đổi người cùng vai trò; đăng nhập/đăng xuất liên tab; hạ Quản lý xuống Nhân viên; khóa nhân viên; lỗi RPC; hạ quyền sau lỗi mạng; phản hồi xác minh cũ đến trễ. Có kiểm tra dọn kênh đã đăng ký, chưa phải kiểm thử payload Realtime đầu cuối.
- [x] Hoàn tất hồi quy sau bản sửa phiên cuối: 300 nhóm nghiệp vụ Auth thật, 10 nhóm đổi mật khẩu Auth thật và 6 bài API đều đạt. Đối chiếu nguồn khớp; bản sao CSDL/container và cấu hình bí mật tạm đã dọn. Bằng chứng hồi quy tại `docs/security/phase4/regression-results.txt`; đã xem ảnh sau thu hồi phiên, không còn đường dẫn hồ sơ hoặc dữ liệu form cũ.
- [ ] Hoàn thiện gateway AI, registry, lịch sử/replay và kênh dữ liệu Realtime theo cùng quyền; chưa coi giai đoạn 4 hoàn tất từ các kiểm tra phiên.

Chi tiết: [báo cáo giai đoạn 4](docs/security/PAWPAL_GIAI_DOAN_4_CHATBOT_PHIEN.md).

#### Gateway đọc nền tảng cho trợ lý Nhân viên — migration 177

- [x] Thêm `read_staff_copilot` với danh sách đóng 20 công cụ đọc: khách/thú cưng/đơn, tiền theo đúng mã đơn, điểm, sản phẩm/tồn thấp/dịch vụ, lịch/phiếu/hội thoại được giao, hồ sơ/lịch cá nhân, lưu trú/chuyến được giao, hướng dẫn và ưu đãi đang bật.
- [x] CSDL tự lấy nhân viên từ phiên Auth; kiểm tra vai trò STAFF, trạng thái hoạt động và quyền `work.*` ở mỗi lần đọc. Chặn bộ lọc chọn người khác, SQL/cột tùy ý, công cụ doanh thu/quản trị và các công cụ chưa triển khai; không ánh xạ sang quyền đọc bảng rộng.
- [x] Mỗi lần đọc trả tối đa 10 dòng và 32 KB; tổng được đánh dấu chỉ thuộc trang hiện tại. Khách chỉ trả mã/tên/SĐT; sản phẩm không trả giá vốn; thanh toán chỉ theo đúng mã đơn; hàng chờ chat không có khách/nội dung; transcript không đọc raw; lịch cá nhân không trả lý do riêng tư.
- [x] Thêm registry STAFF riêng qua `prepareStaff` trong file máy chủ hiện có; giữ nguyên registry Quản lý. Dùng token đọc bất biến và ngân sách chung tối đa 3 nguồn/2 nguồn đồng thời/64 KB; chưa nối API hoặc giao diện AI.
- [x] 21 nhóm kiểm tra gateway bằng Auth thật đạt, gồm 20 công cụ, phân trang 13 kết quả, lọc người được giao, chống giả mạo bộ lọc, mất quyền ngay với token cũ, không mở bảng tiền thô, không ghi nghiệp vụ và khôi phục 177. Mã băm nguồn khớp; tài nguyên bản sao đã dọn. Báo cáo: `docs/security/phase4/gateway/ui-results.txt`.
- [x] 30 bài hồi quy registry/bộ đọc cũ đạt; hai bộ kiểm tra nghiệp vụ Copilot offline cũng đạt. Không gọi Gemini, không đọc Logs Cloud, không triển khai Cloud/CSDL rà soát chính hoặc push.
- [ ] Nối các nguồn giá/phòng trống/quan hệ khách và lịch sử mới vào API, kiểm tra quyền khi hoàn thành rồi mới mở giao diện. AI cho STAFF hiện vẫn bị chặn; giai đoạn 4 chưa hoàn thành.

#### Lịch sử riêng và phát lại theo quyền hiện tại — migration 178, ngày 06/11/2026

- [x] Thêm kho lịch sử STAFF trong schema riêng, gắn cả hồ sơ nhân viên và Auth ID; không lấy lịch sử quản trị cũ sau hạ quyền. Trình duyệt không được ghi câu trả lời hoặc giả mạo nguồn; chỉ máy chủ được lưu qua RPC riêng.
- [x] Bộ đọc máy chủ tự ghi nhận hồ sơ nguồn từ công cụ đã xác minh và kết quả SQL; không lấy danh sách nguồn từ câu hỏi hoặc mô hình. Giữ dấu quyền kể cả khi nguồn trả rỗng; danh sách nguồn bất biến và có giới hạn.
- [x] Lưu câu trả lời phải khớp mốc quyền/phân công hiện tại. Đọc lịch sử, phát lại, ngữ cảnh gần đây và từng phần nội dung đều kiểm tra lại chủ sở hữu, vai trò, trạng thái và từng nguồn. Chuyển ca làm ẩn câu trả lời liên quan; nhận thêm ca khác không làm mất lịch sử vẫn còn quyền.
- [x] Phân trang tối đa 10 phiên hoặc 10 tin nhắn mỗi trang, ngữ cảnh tối đa 6 tin, phản hồi tối đa 32 KB; nội dung dài đọc từng phần có mã phiên bản. Xóa phiên chỉ tác động lịch sử riêng của người đang đăng nhập.
- [x] 16 nhóm kiểm tra bằng Auth thật đạt: chống ghi giả, truy cập chéo nhân viên, phân công/quyền bị thu hồi, vai trò/khóa/đổi mật khẩu, đổi liên kết Auth không kế thừa lịch sử, canary lịch sử quản trị cũ, phân trang, nội dung tiếng Việt dài, phát lại khi lưu trùng request và rollback. Mã băm nguồn khớp, bản sao đã dọn. Bằng chứng: `docs/security/phase4/history/ui-results.txt`.
- [x] 4 bài kiểm tra nguồn dữ liệu mới và 30 bài hồi quy bộ đọc cũ đạt; hai bộ nghiệp vụ Copilot offline đạt. Không thêm JS giao diện hoặc modal.
- [ ] Nối các RPC mới vào API/giao diện STAFF sau khi hoàn thiện các nguồn còn thiếu, hạn mức request và xác minh lại trước trả kết quả; khi dùng lịch sử làm ngữ cảnh phải kế thừa cả nguồn của lịch sử đó. Các bước trên mới là nền tảng, chưa hoàn tất giai đoạn 4.

#### Tra cứu quan hệ khách theo quyền công việc — migration 179, ngày 06/11/2026

- [x] Bổ sung 5 nguồn: xác định khách, thú cưng của khách, đơn tạo mới nhất, lịch sắp tới/vừa qua gần nhất và khiếu nại còn mở. Registry STAFF hiện có 25 nguồn; giữ gateway nền tảng 177 và các đường quản trị cũ nguyên trạng.
- [x] Xác định khách bằng đúng UUID/mã/SĐT hoặc họ tên đầy đủ đã chuẩn hóa; tối đa 2 kết quả để phát hiện trùng tên, không tự chọn từ chuỗi tên gần đúng. Chỉ trả mã và tên, không Auth/email/dữ liệu tài khoản.
- [x] Mọi nguồn quan hệ yêu cầu cả quyền khách và quyền nghiệp vụ tương ứng. Lịch/khiếu nại còn lọc nhân viên được giao; đơn mới nhất gồm mọi trạng thái và không suy ra thanh toán từ trạng thái đơn.
- [x] Kết quả phải khớp UUID khách trong descriptor đã xác minh, kể cả trang rỗng. Danh sách nguồn cho lịch sử giữ cả khách, quyền khách, quyền nghiệp vụ và các hồ sơ thực sự đã đọc; dùng chung ngân sách 3 nguồn/2 nguồn đồng thời/64 KB.
- [x] 11 nhóm kiểm tra Auth thật đạt, gồm trùng tên, UUID/mã/SĐT chính xác, thú cưng 13 kết quả chia 10/3, ca đồng nghiệp gần hơn vẫn bị loại, khiếu nại đúng khách/người phụ trách, quyền kép, nguồn lịch sử sau chuyển phân công và rollback. Báo cáo: `docs/security/phase4/relations/ui-results.txt`.
- [x] 37 bài kiểm tra máy chủ và hai bộ nghiệp vụ Copilot offline đạt; đã chạy lại 16 nhóm lịch sử và 21 nhóm gateway với nguồn hiện tại. Mã băm khớp, bản sao và cấu hình bí mật đã dọn; chưa triển khai Cloud.
- [ ] Nối planner/formatter theo vai trò vào API; nhánh STAFF phải xử lý tổng thuộc trang hiện tại, dừng khi khách chưa rõ/trùng tên và giữ nguyên nguồn khi đưa lịch sử vào ngữ cảnh. Chưa bật AI cho STAFF từ các RPC nền này.

#### Giá dịch vụ và phòng trống — migration 180, ngày 06/11/2026

- [x] Thêm 3 nguồn `catalog.service_price`, `catalog.price_rows`, `hotel.availability` qua RPC đóng, yêu cầu STAFF còn quyền Copilot và tạo lịch. Registry hiện có 28 nguồn, không cấp thêm quyền đọc bảng hoặc điều phối cho Nhân viên.
- [x] Giá chọn đúng dịch vụ bằng UUID/mã/tên đầy đủ; trùng tên không tự chọn. Chỉ lấy giá đang hoạt động và còn hiệu lực của đúng dịch vụ, giữ điều kiện biến thể, cận cân nặng/cự ly và cờ bao gồm cận trên; Hotel giữ kỳ tính tiền, Taxi giữ phụ phí riêng. Không tự tính thành báo giá/đơn thu.
- [x] Phòng trống xét giao khoảng thời gian và tình trạng đang ở, chỉ trả phòng hoạt động thuộc loại phòng/dịch vụ còn hiệu lực. Không trả mã ca, mã lưu trú, khách, thú cưng hoặc người phụ trách của ca khác; kết quả chưa giữ phòng.
- [x] Giá và phòng trống tối đa 10 dòng/trang, 32 KB; tổng và số phòng nhận được chỉ thuộc trang hiện tại. Bộ đọc kiểm tra lại quan hệ dịch vụ/giá và tính nhất quán trạng thái phòng trước khi đưa dữ liệu vào chatbot.
- [x] Nguồn lịch sử mới gồm dịch vụ, dòng giá, loại phòng và phòng; mất quyền đặt lịch hoặc tắt nguồn liên quan thì không đọc/phát lại câu trả lời cũ. Rollback 180 khôi phục đúng bộ kiểm tra nguồn của 178 và giữ các hàm trước.
- [x] 14 nhóm kiểm tra Auth thật đạt; giá 13 dòng chia 10/3, 14 phòng chia 10/4, cận trên, giá chưa/hết hiệu lực, dịch vụ khác/trùng tên, phòng giao cận thời gian/đang ở/đã hủy, không lộ ca khác, không ghi nghiệp vụ, thu hồi quyền và rollback. Bằng chứng: `docs/security/phase4/booking/ui-results.txt`.
- [x] 41 bài máy chủ và hai bộ nghiệp vụ Copilot offline đạt; chạy lại các bộ quan hệ khách/lịch sử/gateway với shared reader hiện tại. Không thêm JS giao diện hoặc modal, chưa áp dụng Cloud.
- [ ] Nối planner/formatter STAFF, API và lịch sử kế thừa nguồn; trình bày rõ tổng trang, thời điểm đọc và điều kiện giá/phòng. Không dùng formatter quản trị cũ khi chưa xử lý các DTO STAFF này. Giai đoạn 4 chưa hoàn tất.

**Đầu ra và điều kiện hoàn thành:** Chatbot không cung cấp dữ liệu vượt quyền; đổi vai trò và khóa tài khoản có hiệu lực với yêu cầu tiếp theo của phiên đang mở, đồng thời giao diện và kênh dữ liệu cập nhật phù hợp.

### Giai đoạn 5 — Kiểm thử tích hợp và nghiệm thu

Trạng thái: Chưa thực hiện; phụ thuộc giai đoạn 2, 3 và 4.

- [ ] Hoàn tất mục 7 và chạy đủ 30 kịch bản PQ-01 đến PQ-30 ở mục 9 bằng tài khoản kiểm thử phù hợp.
- [ ] Kiểm tra hồi quy đăng nhập, nghiệp vụ phục vụ khách, đặt lịch công khai và các luồng liên quan sau khi siết quyền.
- [ ] Lưu bằng chứng, sửa lỗi và chạy lại các trường hợp bị ảnh hưởng; dọn dữ liệu kiểm thử.

**Đầu ra và điều kiện hoàn thành:** Có kết quả cho đủ 30 kịch bản, các trường hợp đều đạt sau khi sửa và chạy lại; không còn lỗi vượt quyền, mất quyền nghiệp vụ cần thiết hoặc gián đoạn luồng công khai liên quan.

### Giai đoạn 6 — Chuyển đổi hệ thống đang chạy và bàn giao

Trạng thái: Chưa thực hiện; chỉ tiến hành sau khi giai đoạn 5 đạt.

- [ ] Thực hiện mục 8: lưu cấu hình trước chuyển đổi, xác định tài khoản Quản lý/Nhân viên và kiểm tra phương án khôi phục.
- [ ] Áp dụng migration và mã nguồn theo thứ tự tương thích đã chốt sau kiểm thử: 165 → 166 → 167 → 168 → 169 → 170 → 171 → 172 → 173 → 174 → 175 → 176 → 177 → 178 → 179 → 180 cùng các bổ sung giai đoạn 4 được nghiệm thu trước mã sử dụng chúng; khôi phục theo thứ tự ngược, không tự kích hoạt toàn bộ tài khoản chưa có vai trò.
- [ ] Kiểm tra nhanh đăng nhập hai vai trò, nghiệp vụ chính, chatbot, đổi vai trò và khóa tài khoản sau triển khai.
- [ ] Bàn giao bảng quyền, hướng dẫn vận hành và bằng chứng; chỉ push khi người dùng yêu cầu rõ ràng theo `AGENTS.md`.

**Đầu ra và điều kiện hoàn thành:** Hệ thống đang chạy áp dụng đúng hai vai trò, có thể khôi phục khi cần và đáp ứng toàn bộ tiêu chí hoàn thành bên dưới.

## Tiêu chí hoàn thành

- [ ] Chỉ có hai vai trò vận hành: Quản lý và Nhân viên.
- [ ] Tạo tài khoản chỉ cần chọn vai trò, không cấp quyền riêng cho từng người.
- [ ] Các chức năng hoạt động đúng bảng ở giao diện, máy chủ và CSDL.
- [ ] Đổi vai trò và khóa tài khoản có hiệu lực với phiên đang mở.
- [ ] Có nhật ký thay đổi, bằng chứng kiểm thử và phương án khôi phục.

## Nhật ký thực hiện

| Ngày | Giai đoạn | Đã thực hiện | Chưa thực hiện |
|---|---|---|---|
| 04/11/2026 | 1 — Rà soát và thiết kế | Đối chiếu kiểm kê CSDL; quét 50 file; kiểm tra 121 tên RPC/gateway đều có trên Cloud; đọc quan hệ của 22 bảng; xác nhận nhóm tài khoản/Auth; lập ma trận chức năng, phạm vi dữ liệu và 38 intent chatbot; chọn mã STAFF; viết phương án chuyển đổi; cập nhật các ô hoàn thành và tài liệu bằng chứng | Chưa tạo STAFF trên CSDL; chưa chuẩn hóa trạng thái, mở khóa/gán vai trò; chưa sửa RLS/API/giao diện/chatbot; chưa chạy 30 kịch bản; chưa push |
| 04/11/2026 | 2 — Supabase và API | Dựng CSDL riêng từ cấu trúc Cloud; viết migration/khôi phục 165; ADMIN/STAFF cố định, chặn quyền riêng; bổ sung RLS và RPC theo phạm vi; siết API tài khoản; kiểm tra 19 nhóm SQL, 16 nhóm HTTP và 7 bài API đều đạt; thử cạnh tranh hạ Quản lý; đối chiếu 31 hàm Cloud và metadata Storage chỉ đọc; dọn bản sao HTTP/container và hai CSDL chuẩn bị không dùng; giữ CSDL kiểm tra chính | Chưa áp dụng migration lên Cloud, chưa mở khóa/gán STAFF cho người thật, chưa sửa giao diện, chưa tích hợp chatbot/Realtime theo quyền mới, chưa đăng nhập Auth thực tế hoặc chạy trọn bộ PQ trên trình duyệt, chưa push |

| 04/11/2026 | 3 — Giao diện, đang thực hiện | Xác minh vai trò trước khi tải dữ liệu; giao diện đọc có phạm vi cho Nhân viên; hoàn thiện và được nghiệm thu modal tài khoản hai vai trò; nối trả lời hội thoại được giao và modal Thêm khách; 25 nhóm trình duyệt đạt trên CSDL riêng; xem ảnh máy tính/điện thoại; lưu báo cáo và dọn bản sao kiểm thử | Chờ nghiệm thu Thêm khách; còn cập nhật hồ sơ, thú cưng, đặt lịch, nghiệp vụ bán hàng/thu tiền và đổi mật khẩu; chưa tích hợp AI/Realtime, chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Modal Thêm bé cưng | Ghi nhận nghiệm thu Thêm khách; nối form thú cưng với autocomplete chủ nuôi/giống, tự điền SĐT, lưu cân nặng và hồ sơ; sửa mở lại popover sau Escape; 34 nhóm trình duyệt đạt, xem ảnh máy tính/điện thoại và dọn CSDL bản sao | Chờ nghiệm thu Thêm bé cưng; còn cập nhật hồ sơ và các nghiệp vụ khác trong giai đoạn 3; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Sửa hồ sơ bé cưng | Ghi nhận đồng ý Thêm bé cưng; sửa màu modal trắng theo phản hồi; nối sửa hồ sơ có phiên bản, giữ nguyên chủ nuôi; 40 nhóm trình duyệt đạt, gồm cạnh tranh cập nhật và chặn giả mạo chuyển chủ; lưu ảnh và dọn CSDL bản sao | Chờ nghiệm thu Sửa hồ sơ bé cưng; còn cập nhật khách, đặt lịch, xử lý ca, bán hàng/thu tiền và đổi mật khẩu; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Sửa thông tin khách | Ghi nhận nghiệm thu Sửa hồ sơ bé cưng; nối sửa thông tin khách có phiên bản, giữ hạng và địa chỉ; 48 nhóm trình duyệt đạt, gồm trùng SĐT, xung đột và chặn payload xóa hạng; lưu ảnh máy tính/điện thoại và dọn CSDL bản sao | Chờ nghiệm thu Sửa thông tin khách; còn đặt lịch, xử lý ca, bán hàng/thu tiền, địa chỉ và đổi mật khẩu; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Sổ địa chỉ | Ghi nhận nghiệm thu Sửa thông tin khách; thêm/sửa/xóa địa chỉ và một mặc định; tải đủ các trang trước lưu; 57 nhóm trình duyệt đạt gồm dữ liệu 11 địa chỉ, xung đột, lỗi tải và từ chối ID địa chỉ khách khác; xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Sổ địa chỉ; còn đặt lịch, xử lý ca, bán hàng/thu tiền và đổi mật khẩu; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Tạo lịch hẹn | Ghi nhận tiếp tục sau Sổ địa chỉ; nối đặt lịch chăm sóc/lưu trú/xe có giá CSDL và trường có điều kiện; migration 166 đọc danh mục, chặn tự phân công; 68 nhóm trình duyệt đạt, thử khôi phục đúng hai RPC gốc; xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Tạo lịch hẹn; còn tiếp nhận/xử lý ca, bán hàng/thu tiền, xử lý khiếu nại và đổi mật khẩu; chưa áp dụng 166 lên CSDL rà soát chính hoặc Cloud, chưa push |

| 05/11/2026 | 3 — Biên bản tiếp nhận | Ghi nhận nghiệm thu Tạo lịch hẹn; nối tiếp nhận có phiên bản, cố định người thực hiện và ghi nhận xác nhận thực tế; 78 nhóm trình duyệt đạt gồm mất phản hồi không trùng, xung đột, phân lại ca và chặn giả mạo; xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Biên bản tiếp nhận; còn xử lý hạng mục/nhật ký, bàn giao, bán hàng/thu tiền, xử lý khiếu nại và đổi mật khẩu; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Hạng mục và Nhật ký chăm sóc | Ghi nhận nghiệm thu tiếp nhận; nối bắt đầu/hoàn thành hạng mục được giao và form thêm/sửa nhật ký của chính mình; bổ sung 167 chặn giả mạo người ghi; 91 nhóm trình duyệt đạt, gồm mất phản hồi, bản sửa cũ và yêu cầu vượt quyền; xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu form Nhật ký chăm sóc; còn bàn giao/đóng lưu trú, bán hàng/thu tiền, xử lý khiếu nại và đổi mật khẩu; chưa áp dụng 166/167 vào CSDL rà soát chính hoặc Cloud, chưa push |

| 05/11/2026 | 3 — Biên bản bàn giao | Ghi nhận nghiệm thu nhật ký; nối bàn giao có ba xác nhận, bản tiếp nhận mới nhất và idempotency; sửa tích hợp trigger lưu trú/xe bằng 168; 105 nhóm trình duyệt đạt, thử khôi phục 168/167/166, xem ảnh và dọn tài nguyên kiểm thử | Chờ nghiệm thu Bàn giao; còn giao diện đóng lưu trú, bán hàng/thu tiền, xử lý khiếu nại và đổi mật khẩu; chưa áp dụng 166/167/168 vào CSDL rà soát chính hoặc Cloud, chưa push |

| 05/11/2026 | 3 — Trả phòng | Ghi nhận nghiệm thu Bàn giao; nối trả phòng đúng người phụ trách và phiên bản ca; thêm dữ liệu đọc có phạm vi bằng 169; 115 nhóm kiểm thử đạt, xác nhận giữ giá/hạng mục/thanh toán và giải phóng phòng; xem ảnh, thử khôi phục và dọn bản sao | Người dùng yêu cầu tiếp tục sau ảnh; đang làm Tạo đơn tại quầy; còn thu tiền, khiếu nại và đổi mật khẩu; chưa áp dụng 166–169 vào CSDL rà soát chính hoặc Cloud, chưa push |

| 05/11/2026 | 3 — Tạo đơn tại quầy | Ghi nhận tiếp tục sau Trả phòng; nối chọn khách/sản phẩm, số lượng và ưu đãi theo giá máy chủ; tạo đơn/giữ hàng có idempotency, chưa thu tiền; 126 nhóm kiểm thử đạt, xem ảnh máy tính/điện thoại và dọn bản sao CSDL | Chờ nghiệm thu Tạo đơn tại quầy; còn thu tiền, khiếu nại, đổi mật khẩu và tích hợp; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Thu tiền đơn hàng | Ghi nhận nghiệm thu Tạo đơn tại quầy; nối thu một phần/thu đủ theo số dư máy chủ, phương thức và xác nhận thực nhận; giữ yêu cầu khi chưa rõ kết quả, đối chiếu không trùng; 140 nhóm kiểm thử đạt, xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Thu tiền đơn hàng; còn thu tiền ca dịch vụ, khiếu nại, đổi mật khẩu và tích hợp; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Thu tiền ca dịch vụ | Ghi nhận nghiệm thu Thu tiền đơn hàng; nối thu tiền ca được giao, giữ kiểm tra điều chỉnh/khách xác nhận, phiên bản và idempotency; 153 nhóm kiểm thử đạt, gồm phân lại ca, khoản thu thật, từ chối hoàn tiền; xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Thu tiền ca dịch vụ; còn khiếu nại, đổi mật khẩu và kiểm tra tích hợp; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Trao đổi khiếu nại | Ghi nhận nghiệm thu Thu tiền ca dịch vụ; nối ghi chú nội bộ/phản hồi khách/yêu cầu bổ sung, lịch sử phân trang và retry cùng UUID; 167 nhóm kiểm thử đạt, đúng người/phạm vi/trạng thái; xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Trao đổi khiếu nại; còn đề xuất phương án, tạo phiếu nếu cần trong luồng đã chốt, đổi mật khẩu và tích hợp; chưa chuyển Cloud, chưa push |

| 05/11/2026 | 3 — Đề xuất phương án xử lý | Ghi nhận nghiệm thu Trao đổi khiếu nại; nối đề xuất theo giao dịch, chỉ chờ Quản lý duyệt; thêm phép chiếu có phạm vi bằng 170; 180 nhóm kiểm thử đạt, thử khôi phục đúng định nghĩa, xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Đề xuất phương án xử lý; còn tạo khiếu nại, đổi mật khẩu và tích hợp; chưa áp dụng 166–170 lên CSDL rà soát chính hoặc Cloud, chưa push |

| 05/11/2026 | 3 — Tạo khiếu nại | Ghi nhận nghiệm thu Đề xuất phương án xử lý; nối tạo phiếu đúng khách/giao dịch, chờ Quản lý phân công; thêm RPC nguồn có phạm vi bằng 171; 194 nhóm kiểm thử đạt, sửa phân trang/mã đơn dài, xem ảnh và dọn CSDL bản sao | Chờ nghiệm thu Tạo khiếu nại; còn đổi mật khẩu và kiểm tra tích hợp giai đoạn 3; chưa áp dụng 166–171 vào CSDL rà soát chính hoặc Cloud, chưa push |

| 05/11/2026 | 3 — Đổi mật khẩu cá nhân | Ghi nhận tiếp tục sau Tạo khiếu nại; nối tự đổi đúng tài khoản, xác minh mật khẩu hiện tại và quyền hai lần; 10 nhóm Auth thật với GoTrue/PostgREST/trình duyệt, 194 nhóm hồi quy và 6 bài API đạt; xem ảnh và dọn tài nguyên bản sao | Chờ nghiệm thu Đổi mật khẩu cá nhân; còn rà soát tích hợp giai đoạn 3, chưa nghiệm thu trọn bộ Auth/PQ/Realtime, chưa triển khai Cloud hoặc push |

| 05/11/2026 | 3 — Rà soát tích hợp và bổ sung chat | Ghi nhận nghiệm thu Đổi mật khẩu; đối chiếu thiết kế, lập báo cáo khoảng trống; nối hàng chờ/tự nhận/ghi chú/phân trang/kết thúc chat và receipt 172; sửa dọn modal lịch hẹn khi mất xác minh; 208 nhóm hồi quy và 10 nhóm Auth đạt, xem ảnh và dọn bản sao | Chờ nghiệm thu Kết thúc hội thoại; còn mời đón bé, Pawpoint/hạng, chứng từ, ghi chú khách và các mục rà soát; chưa triển khai Cloud hoặc push, giai đoạn 3 chưa hoàn tất |

## 9. Kịch bản kiểm thử chi tiết

### Chuẩn bị

- Thực hiện trên môi trường kiểm thử có cùng cơ chế xác thực và phân quyền với hệ thống triển khai.
- Chuẩn bị hai tài khoản Quản lý để kiểm tra thay đổi vai trò; hai tài khoản Nhân viên A và B để kiểm tra dữ liệu cá nhân và công việc được giao; một tài khoản khách hàng.
- Chuẩn bị hồ sơ khách hàng, thú cưng, lịch hẹn, đơn hàng, sản phẩm và hội thoại kiểm thử trong Supabase. Có ca dịch vụ và hội thoại giao cho A, có ca giao cho B.
- Dữ liệu kiểm thử lưu trong CSDL kiểm thử, không nạp file JSON hoặc chèn dữ liệu mẫu vào giao diện Admin. Không thu tiền, hoàn tiền hoặc gửi tin nhắn thật cho khách trong quá trình test.
- Ghi trạng thái dữ liệu trước mỗi thao tác nhạy cảm để đối chiếu và khôi phục sau test.
- Mỗi dòng chỉ đánh dấu hoàn thành khi đã thực hiện và có bằng chứng. Các kịch bản dưới đây chưa được chạy.

### Chức năng theo vai trò

| Xong | Mã | Vai trò | Bước thực hiện | Kết quả mong đợi |
|---|---|---|---|---|
| [ ] | PQ-01 | Quản lý | Tạo tài khoản Nhân viên, đăng nhập bằng tài khoản mới | Chỉ cần chọn vai trò; Nhân viên nhận đúng bộ quyền cố định, không cần tích quyền riêng |
| [ ] | PQ-02 | Quản lý | Mở từng phân hệ và thực hiện một thao tác hợp lệ đại diện | Truy cập được toàn bộ phân hệ; thao tác hợp lệ được ghi nhận đúng vào CSDL |
| [ ] | PQ-03 | Nhân viên | Tìm khách, xem thú cưng, thêm và cập nhật hồ sơ phục vụ công việc | Thao tác thành công trong phạm vi đã xác định; tải lại vẫn thấy dữ liệu đã lưu |
| [ ] | PQ-04 | Nhân viên A | Tạo lịch hẹn, mở và cập nhật ca dịch vụ được giao cho A | Tạo lịch thành công; cập nhật ca được giao đúng quy trình |
| [ ] | PQ-05 | Nhân viên A | Mở ca giao cho B qua đường dẫn và gọi yêu cầu cập nhật trực tiếp | Không được cập nhật ca của B; quyền đọc áp dụng đúng phạm vi đã chốt, không tự mở rộng dữ liệu |
| [ ] | PQ-06 | Nhân viên | Tạo đơn và ghi nhận thu tiền bằng phương thức kiểm thử theo quy trình | Đơn và thanh toán được lưu đúng; không tự sửa giá niêm yết |
| [ ] | PQ-07 | Nhân viên | Thử sửa giá, hoàn tiền, điều phối và duyệt hủy lịch qua màn hình và API | Không có thao tác quản trị trên giao diện; API từ chối, giá, thanh toán và lịch không bị thay đổi |
| [ ] | PQ-08 | Nhân viên | Tra cứu tồn kho, sau đó thử nhập xuất và điều chỉnh tồn | Xem tồn kho được; các yêu cầu thay đổi kho bị chặn, tồn kho không đổi |
| [ ] | PQ-09 | Quản lý | Nhập xuất, duyệt điều chỉnh kho và hoàn tiền cho đơn đủ điều kiện trên môi trường test | Các thao tác hợp lệ thành công, cập nhật dữ liệu và lịch sử nghiệp vụ đúng quy trình |
| [ ] | PQ-10 | Nhân viên A | Mở, trả lời và xử lý hội thoại giao cho A; thử xử lý hội thoại giao cho B | Xử lý được hội thoại của A; không trả lời hoặc thay đổi hội thoại của B |
| [ ] | PQ-11 | Nhân viên | Thử phân công hội thoại và duyệt bồi hoàn | Bị chặn cả giao diện và API; không thay đổi phân công hoặc phát sinh bồi hoàn |
| [ ] | PQ-12 | Quản lý | Phân công hội thoại, giám sát và duyệt bồi hoàn hợp lệ | Thao tác thành công theo quy trình; người được giao và lịch sử được cập nhật |
| [ ] | PQ-13 | Nhân viên A | Xem kết quả công việc, hồ sơ và lịch làm cá nhân; sửa mã nhân viên sang B | Chỉ nhận dữ liệu cá nhân của A; không lấy được hồ sơ nội bộ, lịch và kết quả cá nhân của B |
| [ ] | PQ-14 | Nhân viên | Mở doanh thu tổng hợp, quản lý tài khoản và cấu hình bằng URL trực tiếp | Bị chặn; phản hồi mạng và mã trang không chứa dữ liệu bị hạn chế |
| [ ] | PQ-15 | Quản lý | Mở báo cáo doanh thu, quản lý nhân sự và sửa một cấu hình kiểm thử hợp lệ | Truy cập và lưu được; tải lại phản ánh dữ liệu thật đã lưu |
| [ ] | PQ-16 | Nhân viên | Sửa vai trò trong bộ nhớ trình duyệt hoặc gửi payload tự nhận ADMIN | Không được nâng quyền; vai trò thật trong CSDL không đổi |

### Đường truy cập trực tiếp và chatbot

| Xong | Mã | Vai trò | Bước thực hiện | Kết quả mong đợi |
|---|---|---|---|---|
| [ ] | PQ-17 | Nhân viên | Dùng phiên hợp lệ gọi trực tiếp API, RPC, truy vấn bảng và tệp dành cho Quản lý | Bị từ chối hoặc không trả dữ liệu theo chính sách; không phát sinh thay đổi nghiệp vụ |
| [ ] | PQ-18 | Khách hàng hoặc chưa đăng nhập | Mở Admin và gọi các API quản trị | Không nhận dữ liệu admin; API yêu cầu xác thực hoặc từ chối đúng quyền |
| [ ] | PQ-19 | Nhân viên | Hỏi chatbot doanh thu toàn cửa hàng, danh sách nhân sự và yêu cầu hoàn tiền | Chatbot báo không đủ quyền; công cụ không trả dữ liệu hạn chế và không thực hiện hoàn tiền |
| [ ] | PQ-20 | Nhân viên A | Hỏi chatbot về công việc của A, sau đó yêu cầu thông tin hoặc xử lý công việc ngoài phạm vi của A | Trả lời được thông tin được phép; yêu cầu vượt phạm vi bị chặn tại công cụ truy xuất |
| [ ] | PQ-21 | Quản lý | Hỏi chatbot về doanh thu trong khoảng ngày có dữ liệu kiểm thử | Trả lời theo dữ liệu thật và đúng khoảng ngày; không bị chặn nhầm bởi vai trò |
| [ ] | PQ-22 | Nhân viên | Tìm kiếm, xem thông báo, số đếm và thử xuất báo cáo doanh thu | Không lộ doanh thu hoặc dữ liệu ngoài phạm vi qua kết quả, gợi ý, số đếm và tệp xuất |

### Đổi vai trò, khóa tài khoản và đồng thời

| Xong | Mã | Vai trò | Bước thực hiện | Kết quả mong đợi |
|---|---|---|---|---|
| [ ] | PQ-23 | Hai Quản lý | Quản lý thứ nhất mở báo cáo và chat trên hai tab; Quản lý thứ hai đổi tài khoản thứ nhất thành Nhân viên | Yêu cầu tiếp theo bị giới hạn theo Nhân viên; giao diện dọn dữ liệu vượt quyền, kể cả ngữ cảnh chat, bộ nhớ đệm và kênh Realtime |
| [ ] | PQ-24 | Quản lý và Nhân viên | Nhân viên đang đăng nhập; Quản lý đổi tài khoản đó thành Quản lý | Phiên cập nhật vai trò từ nguồn tin cậy và có đầy đủ quyền Quản lý; tải lại hoặc đăng nhập lại vẫn đúng |
| [ ] | PQ-25 | Quản lý và Nhân viên | Quản lý khóa tài khoản Nhân viên đang mở nhiều tab; dùng lại token cũ để gọi API và RPC | Không tiếp tục truy cập nghiệp vụ; kênh Realtime không tiếp tục nhận dữ liệu và giao diện chuyển về trạng thái phù hợp |
| [ ] | PQ-26 | Quản lý | Trên môi trường kiểm thử chỉ còn một Quản lý hoạt động, thử khóa hoặc hạ vai trò tài khoản đó | Bị từ chối; luôn còn ít nhất một Quản lý hoạt động |
| [ ] | PQ-27 | Hai Quản lý | Gửi đồng thời hai yêu cầu khóa hoặc hạ vai trò hai Quản lý đang hoạt động | Không thể làm mất toàn bộ Quản lý; CSDL giữ điều kiện có ít nhất một Quản lý hoạt động |
| [ ] | PQ-28 | Hai Quản lý | Cùng mở hồ sơ một nhân viên, lần lượt lưu thay đổi vai trò từ hai phiên dùng cùng dữ liệu ban đầu | Phát hiện dữ liệu cũ, yêu cầu tải lại theo cơ chế xử lý đồng thời; không âm thầm ghi đè thay đổi mới |
| [ ] | PQ-29 | Quản lý | Đổi vai trò một nhân viên và xem nhật ký; Nhân viên thử sửa hoặc xóa bản ghi đó | Nhật ký có người thực hiện, đối tượng, thời điểm và vai trò trước/sau; Nhân viên không sửa hoặc xóa được |
| [ ] | PQ-30 | Nhân viên | Ngắt kết nối khi xác minh vai trò, sau đó tải lại và đăng nhập lại | Không tự nhận quyền Quản lý hoặc hiển thị dữ liệu vượt quyền; khi kết nối lại áp dụng vai trò thật |

### Ghi nhận kết quả

Với mỗi mã test, ghi: kết quả Đạt/Không đạt, ngày chạy, tài khoản kiểm thử, bằng chứng, lỗi phát hiện và kết quả chạy lại. Không lưu mật khẩu, khóa máy chủ hoặc token vào tài liệu và ảnh chụp.

Khi kiểm tra thao tác bị chặn, cần xác nhận cả phản hồi từ máy chủ và dữ liệu không bị thay đổi. Việc chỉ ẩn nút trên giao diện chưa đủ để kết luận đạt. Với API dùng HTTP, phiên thiếu hoặc không hợp lệ thường trả 401; phiên hợp lệ thiếu quyền trả 403. Với truy vấn trực tiếp chịu RLS, dữ liệu ngoài phạm vi có thể bị lọc khỏi kết quả.

Các chức năng chưa được phân loại ở mục 3 chỉ nghiệm thu sau khi đã xác định rõ quyền của hai vai trò. Hoàn tất dọn dữ liệu kiểm thử và khôi phục cấu hình sau khi chạy; không truy vấn hệ thống Logs Supabase Cloud.
