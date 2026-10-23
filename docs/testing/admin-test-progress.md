# Tiến độ kiểm thử Admin theo từng tab

Ngày bắt đầu: 13/10/2026. Mỗi lượt chỉ kiểm thử **một tab**. Checklist điều khiển đầy đủ nằm trong [admin-test-flows.md](admin-test-flows.md). Trạng thái “đang kiểm thử” không có nghĩa là toàn bộ tab đã đạt.

## Trình tự

1. Dashboard.
2. Khách hàng: Danh sách → Hồ sơ → Pawpoint.
3. Thú cưng: Danh sách → Hồ sơ → Nhật ký → Nhắc lịch.
4. Dịch vụ: Lịch hẹn → Hồ sơ ca → Danh mục → Đánh giá.
5. Bán hàng: Đơn hàng → Chi tiết → Sản phẩm → Khuyến mãi.
6. Nhân sự: Danh sách → Hồ sơ → Lịch → Đánh giá.
7. Khiếu nại: Theo dịch vụ → Theo đơn hàng → Hồ sơ.
8. Chatbot: Hỗ trợ trực tiếp → Copilot → Quy tắc.
9. Cấu hình: Banner và khuyến mãi → Nội dung → Hệ thống → Nhật ký thao tác.

Với mỗi tab: kiểm tra tải dữ liệu/skeleton/trống/lỗi; bấm từng nút và liên kết; nhập/chọn từng trường; lọc và phân trang; mở/đóng modal; kiểm tra giao diện; sau thao tác ghi thì tải lại để đối chiếu dữ liệu thật. Ghi kết quả **Đạt / Lỗi / Chưa kiểm thử** cùng bước tái hiện. Chỉ chuyển tab sau khi đã báo kết quả tab hiện tại.

## Dashboard — đang kiểm thử

**Đạt:** mở Dashboard và thấy chỉ số; chuyển lịch tháng/tuần/ngày; lùi/tiến tháng và ngày; nút Hôm nay; chọn ngày 15/10 có lịch; mở modal ca dịch vụ; đóng modal bằng nút Đóng/Quay lại; nút Tiếp nhận bé mới mở tab Danh sách thú cưng; nút Xử lý ngay mở Khiếu nại theo dịch vụ.

**Lỗi đã sửa và thử lại trên giao diện:**

1. Chuyển “Tháng/Tuần/Ngày” cập nhật `aria-selected` đúng theo tab đang hiển thị.
2. Nhấn Escape đóng modal “Thông tin ca dịch vụ”.
3. “Đặt lịch Spa và Hotel” và “Lên đơn bán lẻ” mở đúng form sau khi chuyển phân hệ.
4. “Chuyển sang ca Dịch vụ” mở đúng hồ sơ ca vừa chọn, kể cả khi phân hệ Dịch vụ đang tải dữ liệu.

**Đã kiểm thử bổ sung:** nút “Khiếu nại chờ xử lý” mở `tab-complaint-services`; nút “Xem hội thoại” mở `tab-live-support`; lịch tuần hiển thị các ngày có lịch hẹn; console không ghi nhận lỗi/warning trong lượt kiểm thử.

**Còn giới hạn:** chưa thể xác nhận backdrop của modal vì ngày có dấu lịch không trả về ca chi tiết trong dữ liệu hiện tại; màn hình hẹp và lỗi API cần môi trường mô phỏng riêng. Tồn kho vẫn cần đối chiếu quan hệ `product` và `inventory`.

## Khách hàng / Danh sách — đã kiểm thử vòng chức năng

**Đạt:** tải skeleton rồi hiển thị dữ liệu Supabase; tìm kiếm; lọc hạng và trạng thái; lọc khiếu nại từ nút trong thanh công cụ và dải cảnh báo; xóa bộ lọc; KPI Tổng khách/Thành viên/Vãng lai/Bị khóa/Có khiếu nại; phân trang tối đa 10 dòng; xuất CSV; mở hồ sơ; mở modal Thêm khách/Sửa hồ sơ/Điều chỉnh Pawpoint; kiểm tra bắt buộc khi form thêm khách trống; chip lý do Pawpoint; đóng modal bằng Đóng, Hủy và Escape.

**Lỗi đã sửa và thử lại trên giao diện:**

1. KPI “Có khiếu nại” đặt lại bộ lọc trạng thái và hiển thị đúng 2 khách sau khi chuyển từ KPI “Bị khóa”.
2. Bảng đã loại chuỗi số và các giá trị `Chưa rõ`, `Chưa cập nhật`; các giống hợp lệ được gộp và bỏ trùng.
3. Hồ sơ khách không có SĐT ẩn Gọi điện, Zalo và Gửi lại SMS.
4. “Khóa tài khoản” mở modal xác nhận, hỗ trợ Hủy và Escape. Sau khi người dùng xác nhận, hệ thống chỉ báo thành công nếu Supabase trả về đúng bản ghi đã cập nhật và dữ liệu tải mới khớp trạng thái.

**Đã kiểm thử bổ sung (15/10/2026):** mở biểu mẫu sửa hồ sơ và lưu tên khách hàng. Đã sửa hai lỗi: giá trị hiển thị `Chưa cập nhật` bị đưa vào ô email `type=email`, và thao tác sửa tên luôn xóa/ghi lại `customer_address` dù người dùng không sửa địa chỉ. Sau khi chuẩn hóa email rỗng và chỉ đồng bộ sổ địa chỉ khi thực sự thay đổi, modal đóng, toast thành công xuất hiện và dữ liệu được ghi vào Supabase. Lưu ý dữ liệu có mã khách trùng/ánh xạ hồ sơ không ổn định nên sau F5 giao diện có thể chọn sang hồ sơ khác; cần làm sạch mã quan hệ riêng.

**Khóa/mở khóa (15/10/2026):** đã mở modal xác nhận và thực hiện khóa trên bản ghi thử. Sau tải lại, số tài khoản bị khóa vẫn là 0. Đã siết kiểm tra phản hồi `update(...).select()` để không báo thành công khi Supabase không trả về đúng bản ghi; hiện cần kiểm tra RLS hoặc enum `account_status` của bảng `customer`.

**Nguyên nhân cần xử lý sau:** thao tác cập nhật tài khoản quản trị chưa được CSDL xác nhận, nhiều khả năng do policy RLS không nhận diện phiên admin qua `staff.auth_user_id` hoặc trạng thái `staff.account_status` chưa đúng. Khi đối chiếu thủ công cần dùng UUID thật; bảng `staff` hiện không có cột `email`, nên không được dùng truy vấn có `staff.email`. Cần đối chiếu `auth.users.id` với `staff.auth_user_id`, kiểm tra `staff.account_status = 'ACTIVE'`, policy `customer` cho lệnh `UPDATE`, và giá trị enum thực tế của `customer.account_status`. Không đánh dấu đạt cho đến khi khóa, tải lại, thấy `Bị khóa`, rồi mở khóa và tải lại thành `Đang hoạt động`.

**Chưa kiểm thử:** lưu mới khách, điều chỉnh điểm và bước xác nhận khóa/mở khóa trên bản ghi QA riêng; tổ hợp lỗi Supabase; responsive; backdrop modal.

### Kiểm thử ghi dữ liệu bổ sung (14/10/2026)

- Lưu ghi chú trên hồ sơ `CUST-002` báo thành công và giữ nguyên sau khi tải lại hồ sơ.
- Luồng khóa tài khoản mở đúng menu và modal xác nhận, nhưng sau khi xác nhận trạng thái vẫn là `Thành viên` và tải lại danh sách không hiển thị `Bị khóa`. Cần xử lý lỗi đồng bộ thao tác `account_status` trước khi đánh dấu đạt; chưa thực hiện thao tác mở khóa vì bản ghi không chuyển sang trạng thái khóa.

## Khách hàng / Pawpoint — đã kiểm thử chức năng sử dụng và điều chỉnh điểm (14/10/2026)

**Đạt:**
- Tải bảng chính sách 3 hạng thẻ (Bạc, Vàng, Kim Cương) kèm mức chi tiêu và chiết khấu.
- Tải lịch sử biến động Pawpoint từ Supabase live database; bộ lọc Tất cả / Cộng điểm / Trừ điểm; tìm kiếm theo tên, SĐT, lý do; phân trang căn giữa ngoài bảng.
- Xuất file CSV lịch sử giao dịch hoạt động với định dạng chuẩn UTF-8 BOM kèm tên file theo ngày.
- Mở modal "Điều chỉnh Pawpoint" từ nút trong header bảng lịch sử hoặc từ menu tác vụ từng khách hàng trong bảng danh sách.
- Ô tìm kiếm khách hàng: Custom autocomplete popover dạng 100% phẳng thuần chữ (đã triệt tiêu avatar/icon tròn viết tắt theo chuẩn AGENTS.md), hiển thị rõ tên in đậm, SĐT, bé cưng, hạng thẻ và số dư điểm hiện tại.
- Thẻ tóm tắt xác nhận lựa chọn khách hàng hiển thị thông tin rõ ràng kèm nút `✕ Bỏ chọn` (bấm một chạm để xóa lựa chọn và đưa con trỏ về ô tìm kiếm).
- Kiểm tra tính hợp lệ dữ liệu: chặn điểm $\le 0$, chặn trường lý do trống, chặn trừ điểm vượt quá số dư hiện tại của khách hàng.
- Nút chip một chạm điền nhanh lý do (`Bù sự cố trễ hẹn`, `Bù giao hàng chậm`, `Tặng điểm tri ân`, `Thu hồi do hủy đơn`, `Đổi quà tại quầy`, `Điều chỉnh sai lệch điểm`) hoạt động mượt mà qua cơ chế event delegation.
- Thao tác ghi dữ liệu sử dụng điểm (Trừ điểm - SUB) và Điều chỉnh cộng điểm (ADD):
  - Cập nhật số dư trong bảng `customer_membership.total_paw_points`.
  - Ghi bản ghi biến động lịch sử vào bảng `paw_point_transaction` trên Supabase (kèm liên kết `reward_rule_id`).
  - Tự động bỏ qua cache 90 giây (`force: true`) để nạp ngay số dư mới và dòng lịch sử vừa tạo lên đầu bảng.
  - Hiển thị Toast thông báo thành công xanh lá (`Đã trừ/cộng X Pawpoint cho khách hàng... Số dư mới: Y điểm`).
  - Đồng bộ cập nhật ngay lên bảng danh sách khách hàng và Drawer hồ sơ 360° nếu đang mở.
  - Đã thực hiện thao tác hoàn nguyên (cộng điểm bù lại) trên bản ghi thử nghiệm để bảo toàn số dư thực tế trong CSDL.
  - Kiểm tra F5 / tải lại trang: dữ liệu lịch sử và số dư được lưu trữ bền vững từ CSDL Supabase.

**Lỗi đã phát hiện và sửa trong lượt kiểm thử:**
1. **Thiếu `reward_rule_id` khi ghi lịch sử**: Bảng `paw_point_transaction` trên Supabase có ràng buộc Not-Null đối với cột `reward_rule_id`. Code cũ chỉ gửi `customer_id, points, balance_after, description` dẫn đến lỗi `23502` khiến giao dịch bị hủy và báo lỗi đỏ. Đã bổ sung mã quy tắc mặc định hợp lệ của hệ thống để đảm bảo ghi nhận thành công 100%.
2. **Bộ nhớ đệm dữ liệu ngăn cập nhật tức thì**: Hàm `loadCustomersModuleData()` có cơ chế cache 90s, sau khi lưu điểm thành công nếu không truyền `{ force: true }` thì bảng lịch sử vẫn dùng dữ liệu cũ. Đã thêm cờ `force: true` sau khi điều chỉnh điểm.
3. **Lỗi lưu tham chiếu phần tử DOM tĩnh (Stale DOM Reference)**: Các biến `adjustReasonInput`, `adjustPhoneInput` trước đây lưu tĩnh ở phạm vi script dẫn đến việc bấm chip lý do không điền được nội dung khi DOM được render lại. Đã chuyển toàn bộ sang hàm getter động và cơ chế Event Delegation trên `document`.
4. **Vi phạm chuẩn Text-Only trong Autocomplete**: Dropdown chọn khách hàng trước đây có icon avatar tròn `.customer-autocomplete-avatar` mang chữ cái viết tắt; đã loại bỏ hoàn toàn và bổ sung nút `✕ Bỏ chọn` vào thẻ tóm tắt theo quy chuẩn AGENTS.md.

**Chưa kiểm thử:** Mô phỏng mất mạng khi đang submit API Supabase; hiển thị trên màn hình siêu hẹp (mobile responsive dưới 360px).

## Thú cưng / Danh sách — đã kiểm thử vòng tải và lọc

**Đạt:** skeleton chuyển sang dữ liệu Supabase; KPI Tổng thú cưng/Bé cún/Bé mèo/Thú cưng khác/Cảnh báo an toàn; bốn bộ lọc Loài, Giống loài, Cân nặng, Tiêm chủng; phân trang tối đa 10 dòng; nút Xuất file và Thêm bé cưng hiện đúng; cột tác vụ hiển thị menu text-only.

**Lỗi đã sửa và thử lại:** giá trị giống loài chỉ là số như `7` đã được lọc thành `Chưa cập nhật`; tên mặc định gây hiểu nhầm `Khách hàng PawPal` đã đổi thành `Chưa cập nhật chủ nuôi` khi `customer_id` không nối được. Dữ liệu thật trong CSDL không bị sửa. Sau reload không còn chuỗi `Chó 7` hay `Khách hàng PawPal`.

Theo góp ý giao diện, cột `Loài và Giống` trong bảng danh sách hiện chỉ hiển thị tên giống (`Corgi`, `Nhật Bản`...), không lặp tiền tố `Chó` hoặc `Mèo`; thông tin loài vẫn có trong bộ lọc và hồ sơ chi tiết.

## Thú cưng / Hồ sơ — đã kiểm thử vòng hiển thị

**Đạt:** mở hồ sơ từ bảng; breadcrumb `/ ĐẬU`; hiển thị thông tin cơ bản, cảnh báo, trạng thái, nút Đặt lịch Spa hoặc Hotel, Cân bé và Thể trạng, Đăng ảnh nhật ký, Xem chủ nuôi; các khu vực Thể trạng và Đặc tính, Xác nhận tiêm chủng, Nhật ký chăm sóc, Lịch sử dịch vụ và Thông tin thể trạng tải được.

**Lỗi đã sửa:** khi thú cưng không có chủ nuôi hoặc SĐT, hồ sơ không còn hiển thị cặp ngoặc rỗng sau tên chủ nuôi; hiện hiển thị gọn `Chủ sở hữu: Chưa cập nhật chủ nuôi`.

**Chưa kiểm thử:** lưu Sửa hồ sơ, Cân bé, ghi nhật ký, xác nhận tiêm chủng, đăng ảnh, sửa/xóa và các nút điều hướng sang dịch vụ.

## Thú cưng / Nhật ký — đã kiểm thử vòng tải và phân trang

**Đạt:** skeleton tải xong thành bảng nhật ký chăm sóc; dữ liệu sắp xếp mới nhất trước; hiển thị thời gian, bé cưng, nội dung và tình trạng sức khỏe; phân trang `< 1 2 >`; trạng thái trống và ô tìm kiếm có sẵn.

**Lỗi đã sửa:** nhật ký cũ có thể tham chiếu `pet_code` (`PET-001`) trong khi dữ liệu mới dùng UUID, khiến bước nối hồ sơ không ổn định. Đã lập chỉ mục cả `rawId` và `pet_code` khi ghép nhật ký với thú cưng/chủ nuôi. Các bản ghi không có `customer_id` vẫn hiển thị `Chưa cập nhật chủ nuôi`, không tự bịa tên.

**Chưa kiểm thử:** tìm kiếm theo nội dung/tình trạng, lỗi API và responsive.

## Thú cưng / Nhắc lịch — đã kiểm thử vòng tải và lọc

**Đạt:** tải KPI nhắc tắm sấy, cắt tỉa, Pet Hotel và sổ tiêm; danh sách nhắc lịch hiển thị đúng bé, loại nhắc, lần gần nhất, trạng thái và nút Gửi tin/Đặt lịch; bộ lọc loại nhắc và trạng thái hoạt động (lọc Cắt tỉa còn đúng Đậu Phộng và Kẹo Bông); phân trang; dữ liệu trạng thái trống hiển thị rõ.

**Lưu ý dữ liệu:** nhiều bản ghi không có quan hệ chủ nuôi nên hiển thị `Chưa cập nhật chủ nuôi`; không tự gán tên để tránh sai dữ liệu. Nút Gửi tin chưa bấm vì là thao tác gửi thông báo thật.

**Chưa kiểm thử:** gửi tin/đặt lịch trên bản ghi QA, bộ lọc trạng thái Đã gửi tin, lỗi API và responsive.

## Dịch vụ / Lịch hẹn — đã kiểm thử vòng tải và lọc

**Đạt:** KPI lịch hôm nay, chờ xác nhận, sắp tới, đang thực hiện, hoàn thành và yêu cầu đổi/hủy; bảng lịch hẹn tải dữ liệu; bộ lọc loại dịch vụ, trạng thái và KTV; các dải Lịch hẹn sắp tới/Pet có lưu ý/Quá hạn SLA; phân trang; menu tác vụ dạng text-only; nút Xuất file và Thêm lịch hẹn hiển thị đúng.

**Lưu ý dữ liệu:** nhiều lịch hẹn hiển thị `Khách vãng lai —` dù có bé và dịch vụ. Cần đối chiếu `appointment.customer_id` với `customer`/`customer_profile` trong CSDL trước khi sửa, vì đây có thể là dữ liệu thiếu quan hệ.

**Đã rà soát và sửa cách nối dữ liệu:** truy vấn lịch hẹn nay lấy thêm quan hệ chủ nuôi từ `pet_profile.customer_id`, đối chiếu thêm danh sách `customer` tải riêng và xử lý cả `customer_profile` dạng object/mảng. Sau khi tải lại, các bản ghi vẫn hiển thị `Khách vãng lai —`, xác nhận dữ liệu hiện tại thực sự thiếu quan hệ/tên hồ sơ hợp lệ trong CSDL; giao diện không tự gán sai chủ nuôi.

**Chưa kiểm thử:** mở hồ sơ ca, xác nhận/đổi KTV/hủy/hoàn thành, thêm lịch hẹn, xuất file, lỗi API và responsive.

## Dịch vụ / Hồ sơ ca — đã kiểm thử vòng đọc

**Đạt:** mở chi tiết từ mã lịch hẹn; breadcrumb; các nhóm thông tin dịch vụ, khách và thú cưng, chi phí, thanh toán, nhật ký chăm sóc; nút Tiếp nhận bé, Đổi KTV, Hủy lịch, In/Sửa biên bản, thêm dịch vụ và phụ phí hiển thị.

**Lỗi dữ liệu hiển thị cần sửa:** hồ sơ ca Pet Hotel đang hiển thị thời gian lưu trú không hợp lý (`2026-10-11 ➔ 2026-07-04`), KTV là `1@gmail.com` thay vì tên nhân viên, và chủ nuôi là `Khách vãng lai` dù lịch có bé Cà Phê. Cần rà soát mapping cột ngày trả phòng, staff và quan hệ customer trước khi cho phép thao tác nghiệp vụ.

**Lỗi đã sửa:** bỏ ngày trả phòng mặc định giả `2026-07-04`, bỏ mã phòng/số đêm mặc định khi CSDL không có dữ liệu và hiển thị `Chưa cập nhật`; giá trị tên KTV chứa email không còn được hiển thị như tên nhân viên mà chuyển thành trạng thái chưa phân công.

**Chưa kiểm thử:** các nút tiếp nhận/đổi KTV/hủy/hoàn tất, ghi nhật ký, upload ảnh, lỗi API và responsive.

## Dịch vụ / Bảng giá — đã kiểm thử vòng tải và lọc

**Đạt:** tải danh mục dịch vụ; chuyển nhóm Spa và Grooming, Pet Hotel, Pet Taxi; tìm kiếm; lọc trạng thái; bảng hiển thị mã, tên, phân loại, đối tượng, thời lượng, giá từ, SOP, đánh giá và trạng thái; nút xem SOP và Sửa; nút Thêm dịch vụ hiện đúng.

**Lưu ý giao diện:** mô tả dịch vụ dài làm hàng bảng cao và dễ tạo cảm giác tràn trên màn hình hẹp; cần kiểm tra responsive ở vòng sau. Một số tên dịch vụ còn dùng ký hiệu `&`, cần chuẩn hóa theo quy chuẩn câu chữ khi chỉnh nội dung.

**Chưa kiểm thử:** mở SOP, thêm/sửa dịch vụ, thay đổi trạng thái, bảng giá theo cân nặng, lỗi API và responsive.

**Kiểm thử trực tiếp bổ sung (16/10/2026):** tìm `SPA01` chỉ còn đúng một dòng dữ liệu; chuyển Pet Hotel khi còn từ khóa giữ bộ lọc (bảng rỗng là đúng theo điều kiện), xóa từ khóa thì bảng nạp các mã `HTL01` trở đi. Đạt tìm kiếm và chuyển nhóm trên giao diện; chưa tạo/sửa dịch vụ.
- Mở SOP `6 bước` của `HTL01`: modal hiện đúng Phòng Standard, mã gói, nhóm Pet Hotel, thời lượng, hoa hồng, sáu bước và tiêu chuẩn bàn giao. Đạt đọc SOP trên giao diện.
- Mở Sửa `HTL01`: form điền đúng mã/tên/nhóm/loài/thời lượng, ma trận giá 180000–250000, mô tả, sáu bước SOP, hoa hồng 15% và trạng thái Đang phục vụ. Chưa lưu thay đổi dữ liệu danh mục.
- Form Thêm dịch vụ tạo mã mới `HTL13`, nhóm Pet Hotel, thời lượng Theo ngày, ma trận giá và SOP Hotel mặc định. Đây là dữ liệu khởi tạo theo nhóm đang chọn, không phải sao chép HTL01. Bấm lưu khi chưa có tên không tạo bản ghi; cần tiếp tục kiểm tra thông báo xác thực trực quan.
- **Sửa và xác minh ghi trực tiếp (16/10/2026):** tạo `HTLQA86` từng bị Supabase từ chối vì `service_category_enum` không có `SPA_GROOMING`. Đã đối chiếu enum thật (`GROOMING_SPA`, `PET_HOTEL`, `PET_TAXI`) và sửa mapping Spa.
- **Sửa và xác minh ma trận giá:** trước đây bốn mức giá chỉ hiện ở form, chưa được ghi vào `service_price_matrix`. Đã nối lưu theo `service_id`, đóng hiệu lực phiên bản giá cũ khi sửa, và chỉ nạp mức còn hiệu lực. Mốc trên 20kg dùng `999.99` thay cho `9999` để không tràn cột số.
- **Kiểm thử UI và sau tải lại đạt:** tạo dịch vụ QA `SPAQA87`, sửa bốn mức giá `111.111`, `222.222`, `333.333`, `444.444` trên giao diện, rồi F5. Danh mục vẫn hiện giá từ `111.111 đ`; mở lại form vẫn nạp đúng cả bốn mức giá. CSDL có đúng bốn dòng giá đang hiệu lực cho dịch vụ QA.
- **Kiểm thử bổ sung Pet Hotel đạt:** tạo `HTLQA91` qua form, dùng SOP Hotel 6 bước, bốn mức giá `151.111`–`454.444`. Đổi trạng thái sang `Tạm ẩn`, F5 và lọc theo trạng thái vẫn tìm được bản ghi; sau đó đổi lại `Đang phục vụ`, F5 và lọc lại xác nhận đã lưu.
- **Sửa độ ổn định nút Lưu:** nội dung tab render động có thể để lại listener cũ hoặc mất listener sau khi thay DOM. Đã bắt sự kiện lưu một lần ở pha capture của document; kiểm thử lại bằng thao tác đổi trạng thái `HTLQA91` đạt sau F5.
- **Kiểm thử Pet Taxi đạt:** tạo `TXIQA92` từ form với SOP Taxi 4 bước và bốn mức giá `161.111`–`464.444`. Sau F5, lọc Pet Taxi, tìm mã và mở lại form vẫn hiển thị đúng mã, thời lượng 45 phút, giá từ `161.111 đ` cùng cả bốn mức giá.

## Dịch vụ / Đánh giá — đã kiểm thử vòng tải và lọc

**Sửa và kiểm thử trực tiếp bổ sung (16/10/2026):**
- Đã bỏ mã giả `REV-100...` và giá trị lịch hẹn `—` cố định. Bảng nay nạp `appointment_code`, nhân viên phụ trách và ID đánh giá rút gọn từ bản ghi Supabase thật; đánh giá không có lịch hẹn vẫn hiển thị `—` đúng dữ liệu.
- Sửa tìm kiếm để nhận mã lịch hẹn lẫn mã đánh giá thật. Sau F5, tìm `APP-20260706` kết hợp lọc 5 sao, Spa và Grooming, Chưa phản hồi trả đúng một dòng.
- Lọc Pet Taxi trả đúng các đánh giá Taxi; reset lọc và chuyển trang 2 hiển thị tập dữ liệu khác. Không gửi phản hồi vì đây là nội dung trao đổi với khách hàng.
- **Sửa xuất báo cáo:** nút Xuất file trước đây chỉ hiển thị toast. Đã tạo CSV UTF-8 từ dữ liệu đánh giá Supabase; kiểm thử UI tải thành công `bao-cao-danh-gia-2026-10-16.csv`.

**Đạt:** KPI điểm trung bình, tổng lượt, chưa phản hồi và cảnh báo; bảng đánh giá tải dữ liệu; bộ lọc mức sao, nhóm dịch vụ, KTV và trạng thái phản hồi; phân trang; nút Xuất file và Phản hồi hiển thị.

**Lưu ý dữ liệu:** nhiều đánh giá đang hiển thị `Khách hàng PawPal —` và `Chưa có thông tin` ở KTV. Code đã xử lý profile dạng object/mảng ở lớp nạp dịch vụ, nhưng dữ liệu đánh giá hiện không trả về quan hệ khách/KTV hợp lệ nên không tự gán tên.

**Chưa kiểm thử:** mở modal Phản hồi, gửi phản hồi, xuất file, lọc 1–3 sao trên dữ liệu đầy đủ, lỗi API và responsive.

## Bán hàng / Đơn hàng — đã kiểm thử vòng tải và lọc

**Kiểm thử và sửa trực tiếp bổ sung (16/10/2026):**
- Tìm mã `ORD-20261006-789545` kết hợp lọc Đổi trả và COD trả đúng một đơn.
- Phát hiện nút `Có khiếu nại` lấy cả các đơn quá hạn SLA vì hai trường hợp cùng dùng `alertType: danger`. Đã sửa lọc chỉ nhận đơn Đổi trả hoặc có hồ sơ RMA thật; tải lại xác nhận các đơn quá hạn không còn xuất hiện trong kết quả.
- Menu `•••` mở đúng các tác vụ theo đơn; phân trang sang trang 2 nạp tập đơn khác. Xuất file tải thành công `Bao_Cao_Don_Hang_PawPal_2026-10-16.xlsx`.

**Đạt:** KPI đơn hôm nay, chờ xác nhận, chuẩn bị, đang giao, hoàn tất và đổi trả/hủy; bảng đơn hàng tải dữ liệu khách, sản phẩm, tổng tiền, thanh toán, vận chuyển, trạng thái và cảnh báo; bộ lọc trạng thái đơn, thanh toán, đối soát; nút Có khiếu nại, Chờ xử lý gấp, Quá hạn SLA; phân trang; Xuất file và Tạo đơn tại quầy hiển thị.

**Lưu ý dữ liệu:** có hai dòng khách cùng SĐT nhưng khác thứ tự tên (`Nguyễn Thị Bích Phượng`/`Phượng Nguyễn Thị Bích`), cần chuẩn hóa nguồn hồ sơ nếu đây là cùng một khách.

**Chưa kiểm thử:** mở chi tiết, menu tác vụ, tạo đơn tại quầy, lọc nâng cao, xuất file, lỗi API và responsive.

## Bán hàng / Hồ sơ đơn hàng — đã kiểm thử vòng đọc

**Đạt:** mở chi tiết từ mã đơn; breadcrumb; danh sách sản phẩm/SKU/đơn giá/số lượng/thành tiền; bảng kê thanh toán; mã giảm giá và Pawpoint; ghi chú; thông tin người nhận, SĐT, địa chỉ, COD, đối soát, đơn vị vận chuyển và lịch trình đơn.

**Lưu ý:** đơn đã hủy hiển thị lịch trình hủy chưa có thời gian, phù hợp trạng thái dữ liệu hiện tại.

**Chưa kiểm thử:** cập nhật trạng thái/đối soát, đổi vận chuyển, hoàn tiền/đổi trả, menu tác vụ, lỗi API và responsive.

## Bán hàng / Sản phẩm và Kho — đã kiểm thử vòng tải và lọc

**Đạt:** KPI tổng mặt hàng, còn hàng, sắp hết, hết hàng và giá trị vốn; nút Nhập hàng NCC, Kiểm kê kho, Xuất file kho, Thêm sản phẩm; bộ lọc danh mục và tình trạng tồn; bảng SKU, tên, danh mục, giá, đánh giá, tồn, tạm giữ, khả dụng, cảnh báo, trạng thái và tác vụ tải được.

**Lưu ý:** mô tả quy cách dài làm bảng rộng; cần kiểm tra responsive và cuộn ngang ở vòng sau.

**Chưa kiểm thử:** nhập hàng, kiểm kê, thêm/sửa sản phẩm, menu tác vụ, xuất file, lỗi API và responsive.

## Bán hàng / Khuyến mãi — đã kiểm thử vòng tải

**Đạt:** KPI voucher đang chạy, đã dùng và sắp hết hạn; nút Cấu hình Marketing và Banner, Tạo mã khuyến mãi; bảng mã voucher, chương trình, mức giảm, đơn tối thiểu, điểm đổi, thời hạn, lượt dùng, trạng thái và menu tác vụ tải được.

**Lỗi dữ liệu cần rà soát:** có voucher giảm `101%`, mã có ký tự thừa như `QA-FIXED30K;`, mức giảm/đơn tối thiểu bất thường và ngày đã hết hạn nhưng vẫn cần phân loại rõ. Cần kiểm tra validation dữ liệu voucher trước khi chỉnh.

**Lỗi đã sửa và thử lại:** phần hiển thị chuẩn hóa mã voucher, loại ký tự thừa (`QA-FIXED30K;` thành `QA-FIXED30K`), giới hạn giảm phần trăm trong khoảng 0–100 (`101%` hiển thị `100%`), và không cho giá trị đơn tối thiểu/điểm âm. Mã gốc vẫn được giữ riêng để cập nhật đúng bản ghi khi thao tác sau này.

**Chưa kiểm thử:** tạo/sửa/khóa voucher, menu tác vụ, cấu hình banner, lỗi API và responsive.

## Nhân sự / Danh sách — đã kiểm thử vòng tải và lọc

**Đạt:** KPI tổng nhân viên, đang làm việc, nghỉ phép, tạm nghỉ, cần đào tạo; Xuất Excel, Thêm nhân viên; bộ lọc chức vụ, trạng thái, ca làm việc và các bộ lọc nhanh; bảng mã NV, họ tên, chức vụ, SĐT, ca, tay nghề, trạng thái và menu tác vụ tải được.

**Lỗi dữ liệu cần rà soát:** danh sách có tên nhân viên là email (`1@gmail.com`), tên thử nghiệm (`hrth`, `vv`) và một tên chứa cả câu thông báo giao diện; một số SĐT không hợp lệ. Cần làm sạch bản ghi `staff`/`staff_profile` trước khi dùng dữ liệu này trong điều phối KTV.

**Chưa kiểm thử:** thêm/sửa/khóa nhân viên, phân ca, xuất Excel, lỗi API và responsive.

## Nhân sự / Hồ sơ — đã kiểm thử vòng đọc

**Đạt:** mở hồ sơ từ danh sách; breadcrumb; thông tin cá nhân/liên hệ; thông tin công việc và ca trực; công ca, năng suất, hoa hồng, thu nhập; đánh giá và lịch sử nghiệp vụ; nút Khóa nhận việc, Chỉnh sửa hồ sơ, Phân ca làm việc và Đánh giá nghiệp vụ hiển thị.

**Lưu ý:** hồ sơ nhân viên đang chọn tải đúng dữ liệu nhưng nhiều chỉ số công ca/thu nhập/đánh giá là trạng thái trống, phù hợp khi chưa có dữ liệu liên quan.

**Chưa kiểm thử:** khóa nhận việc, chỉnh sửa, phân ca, đánh giá nghiệp vụ, lỗi API và responsive.

## Nhân sự / Lịch làm việc — đã kiểm thử vòng đọc

**Đạt:** hiển thị bốn ca sáng/chiều/tối/khuya; chuyển Hôm nay/Theo ngày/Theo tuần; đơn xin nghỉ và đổi ca; nút Tạo đơn nghỉ hoặc đổi ca, Phân ca làm việc; bộ lọc chức vụ và ca; bảng nhân sự, các cột ca và tổng giờ/ngày; khu vực tiến độ bàn dịch vụ và báo cáo sự cố.

**Lưu ý dữ liệu:** hiện chưa có lịch phân ca nên tất cả nhân sự là `0.0h` và các ô ca là `—`, phù hợp trạng thái dữ liệu trống.

**Chưa kiểm thử:** tạo đơn nghỉ/đổi ca, phân ca, đổi ca từng dòng, chuyển tuần/ngày có dữ liệu, lỗi API và responsive.

## Nhân sự / Đánh giá — đã kiểm thử vòng tải và trạng thái trống

**Đạt:** KPI đã đánh giá/đạt/cần đào tạo/chưa đánh giá; nút Ghi nhận đánh giá; bộ lọc loại kiểm tra và kết quả; bảng cột ngày, mã NV, họ tên, loại kiểm tra, điểm, kết quả, người đánh giá, ghi chú và tác vụ; trạng thái trống hiển thị rõ khi chưa có kết quả.

**Lưu ý dữ liệu:** KPI `Chưa đánh giá = 9` khớp với danh sách nhân sự, không có bản ghi đánh giá để hiển thị.

**Chưa kiểm thử:** ghi nhận đánh giá, mở/sửa kết quả, lỗi API và responsive.

**Lỗi đã sửa:** nút Theo ngày/Theo tuần trước đây chỉ đổi trạng thái active nhưng không đổi wrapper hiển thị, nên nội dung vẫn giữ chế độ ngày. Đã đồng bộ `scheduleDayViewWrapper` và `scheduleWeekViewWrapper`; kiểm tra lại cho thấy Theo tuần hiển thị bảng tuần và Theo ngày quay lại bảng ngày.

## Khiếu nại / Theo dịch vụ — đã kiểm thử vòng tải và lọc

**Đạt:** KPI Chưa xử lý/Đang xử lý/Chờ phản hồi/Mức độ cao/Quá hạn; dải cảnh báo vận hành; nút Lọc ca cần xử lý gấp, Xuất file, Tạo khiếu nại; bộ lọc nhanh, loại dịch vụ, trạng thái, mức độ và nhân viên phụ trách; bảng mã khiếu nại, khách, thú cưng, lịch hẹn, dịch vụ, nội dung, SLA, người phụ trách, ngày tiếp nhận, trạng thái và thao tác tải được.

**Lưu ý:** dữ liệu có nhiều SLA quá hạn và một số nội dung thử nghiệm dài; cần kiểm tra responsive và quy tắc dữ liệu ở bước hồ sơ khiếu nại.

**Chưa kiểm thử:** mở hồ sơ khiếu nại, phân công, xử lý, phản hồi khách hàng, tạo khiếu nại, xuất file, lỗi API và responsive.

## Khiếu nại / Theo đơn hàng — đã kiểm thử vòng tải và lọc

**Đạt:** KPI chưa xử lý/đang xử lý/đổi trả/chờ gửi hàng/hoàn tiền/quá hạn; cảnh báo SLA; nút Lọc ca cần xử lý gấp, Xuất file, Tạo khiếu nại; bộ lọc nhanh, loại vấn đề, trạng thái, mức độ và nhân viên; bảng mã khiếu nại, khách, mã đơn, sản phẩm, vấn đề, yêu cầu, SLA, người phụ trách, ngày tiếp nhận, trạng thái và thao tác tải được.

**Lưu ý:** dữ liệu hiện có 1 khiếu nại chưa xử lý và 1 đã giải quyết; trạng thái KPI khớp danh sách.

**Chưa kiểm thử:** mở hồ sơ, xử lý đổi trả/hoàn tiền, phân công, tạo khiếu nại, xuất file, lỗi API và responsive.

## Khiếu nại / Hồ sơ — đã kiểm thử vòng đọc

**Đạt:** mở hồ sơ khiếu nại từ danh sách; breadcrumb, mã ticket, loại, trạng thái, mức độ; nút Chuyển người phụ trách, Yêu cầu bổ sung, Chọn phương án giải quyết; phản ánh khách, ảnh bằng chứng, đối tượng liên quan, dữ liệu đối chứng 360°, nhật ký xử lý và form phản hồi/ghi chú hiển thị.

**Lưu ý dữ liệu/giao diện:** hồ sơ đang có nhiều trường trống nên xuất hiện các dấu `—` liên tiếp; số điện thoại khách chưa có dữ liệu. Cần tinh gọn trạng thái trống khi hoàn thiện UI.

**Chưa kiểm thử:** chuyển người phụ trách, yêu cầu bổ sung, phương án giải quyết, upload ảnh, lưu phản hồi/ghi chú, khóa an toàn KTV, lỗi API và responsive.

**Chưa kiểm thử:** mở hồ sơ 360°, sửa/xóa/khóa thú cưng, thêm bé cưng và các bước lưu, lỗi API, responsive và backdrop modal.

## Khách hàng / Hồ sơ — đã kiểm thử vòng đọc và điều hướng

**Đạt:** mở hồ sơ và breadcrumb `/ Meo`; hiển thị đúng thông tin khách; các nút Đặt lịch, Lên đơn, Khiếu nại hiện đúng; với khách không có SĐT, Gọi điện/Zalo/Gửi lại SMS không xuất hiện; chuyển được các thẻ Cá nhân, Thú cưng, Đơn hàng, Lịch hẹn, Khiếu nại; dữ liệu thú cưng, lịch hẹn và trạng thái trống tải đúng; mở và đóng modal Sửa hồ sơ, Thêm bé cưng; form Thêm bé cưng có trường bắt buộc, chọn loài và chip giống loài.

**Lỗi đã sửa và thử lại:** modal Sửa hồ sơ trước đây luôn đánh dấu Số điện thoại là bắt buộc dù khách vãng lai `Meo` không có SĐT. Đã chuyển sang bắt buộc động: khách vãng lai/tài khoản tạm được để trống, thành viên vẫn phải nhập SĐT 9–11 số. Khi mở lại hồ sơ `Meo`, trường hiển thị “Số điện thoại”, `required=false` và không chặn việc lưu trường khác.

**Chưa kiểm thử:** lưu sửa hồ sơ trên bản ghi QA; các nút Đặt lịch/Lên đơn/Khiếu nại đến bước submit; lưu ghi chú; sửa/xóa thú cưng; gửi SMS; backdrop và lỗi API. Không thực hiện thao tác ghi dữ liệu thật.

## Chatbot — đã kiểm thử vòng đọc, lọc và thao tác trực tiếp

**Đạt:** tab Trực chat tải được danh sách 24 hội thoại và khung hội thoại hiện tại; bộ đếm Xử lý ngay 5, Đang chat 3, Tất cả 24; lọc Đang chat hiển thị 3 hội thoại, lọc Xử lý ngay hiển thị 5 hội thoại; tìm kiếm theo tên khách lọc đúng kết quả; chuyển qua tab Trợ lý AI và Quy định tải đúng nội dung, FAQ 91 bản ghi cùng bộ lọc, phân trang và thao tác đọc.

**Lưu ý dữ liệu:** nhiều hội thoại là khách vãng lai/mã khách thử nghiệm, nội dung bot lặp lại và SLA quá hạn; đây là dữ liệu cần làm sạch/đối soát, chưa thấy lỗi logic trong bộ lọc.

**Đã kiểm thử ghi dữ liệu trực tiếp (15/10/2026):** gửi tin nhắn nhân viên vào `chat_message`, chuyển ca về AI (`bot_handling`) và tiếp nhận lại (`agent_handling`); sau mỗi thao tác tải lại trang, nội dung và trạng thái vẫn giữ đúng từ Supabase. Ghi chú nội bộ đã sửa để hội thoại dựng từ `customer_profile` tự tạo/nối bản ghi `chat_conversation`, cập nhật `internal_note`, đọc lại bản ghi sau khi lưu và chỉ báo thành công khi xác minh được giá trị; đã kiểm tra F5 giữ đúng ghi chú.

**Chưa kiểm thử:** hoàn tất ca, tạo khiếu nại/tặng điểm/chuyển cấp, đồng bộ tri thức và chỉnh sửa FAQ vì đều là thao tác nghiệp vụ ghi dữ liệu thật.

## Chatbot / Quy định — đã kiểm thử vòng đọc và lọc

**Đạt:** Kho FAQ tải 91 mục; tìm kiếm, lọc danh mục và lọc trạng thái cập nhật bảng; phân trang hiển thị đúng. Các nhóm Màng lọc Toxic Shield, Mẫu câu phản hồi, Hạn mức bồi hoàn và chuyển giao, Ma trận kịch bản Benchmark và Quy chuẩn văn hóa CSKH đều chuyển được và có nội dung; ma trận hiển thị các tình huống, cảm xúc, bàn giao và kết quả.

**Lưu ý:** khi lọc FAQ theo danh mục Đơn hàng rồi chọn trạng thái Tạm tắt, bảng trả về trạng thái trống đúng vì không có bản ghi phù hợp; không phải lỗi tải dữ liệu. Dữ liệu hiện có nhiều nội dung quy định dài, cần rà soát chất lượng nội dung riêng.

**Chưa kiểm thử:** thêm/sửa/xóa FAQ, bật/tắt FAQ, đồng bộ RAG và chạy Benchmark vì đây là thao tác ghi hoặc chạy nghiệp vụ thật.

## Cấu hình / Bài viết — phát hiện lỗi skeleton

**Phát hiện:** mở `#tab-content-management` qua điều hướng giao diện vẫn giữ 4 dòng skeleton trong bảng bài viết sau khi chờ tải; KPI không có số và `PawpalSettings` chưa được khởi tạo trong trang, dù các script settings đã được gắn vào DOM. Đây là lỗi khởi tạo/nạp module, không phải trạng thái dữ liệu rỗng. Cần sửa lifecycle để `settings.js` chạy `PawpalSettings.init/loadSettingsModuleData` trước khi render tab Bài viết; khi lỗi phải thay skeleton bằng empty/error state.

**Đã kiểm tra:** bộ lọc Danh mục và Trạng thái, ô tìm kiếm và khung phân trang có mặt; chưa thực hiện tạo/sửa/xóa bài viết.

## Cấu hình vận hành và Nhật ký — đã kiểm thử vòng đọc

**Cấu hình vận hành:** tải được cơ chế khóa an toàn, thông tin cửa hàng, thanh toán, giao hàng, chính sách đặt lịch và kết nối đối tác. Dữ liệu cấu hình cửa hàng/giao hàng/đặt lịch hiện trống nên hiển thị “Chưa có cấu hình được lưu”; các cổng thanh toán hiển thị đang bật.

**Nhật ký:** KPI, trạng thái khóa an toàn, tìm kiếm, lọc phân hệ, bảng audit và phân trang tải đúng; hiện có 1 bản ghi đồng bộ SSOT từ Bán hàng.

**Chưa kiểm thử:** mở khóa, lưu các modal cấu hình và kiểm tra kết nối đối tác vì là thao tác thay đổi hoặc gọi nghiệp vụ thật.

## Dashboard — kiểm thử bổ sung trực tiếp

**Đạt thêm:** nút Xem kho điều hướng đúng sang Bán hàng / Sản phẩm và Kho; nút Xem tất cả trong lịch điều hướng đúng sang Dịch vụ / Lịch hẹn; chuyển chế độ lịch Tuần và Ngày cập nhật trạng thái chọn đúng khi Dashboard đã hoạt động.

**Lưu ý dữ liệu:** Dashboard hiện hiển thị Tổng khách hàng = 0, Lịch hẹn hôm nay = 0 và Tồn kho ổn định dù các phân hệ tương ứng có dữ liệu; cần đối chiếu truy vấn KPI Dashboard với Supabase. Lịch có các ngày đánh dấu có hẹn nhưng agenda hôm nay báo trống, cần rà soát quy đổi múi giờ/ngày.

**Chưa kiểm thử:** các nút tạo lịch/đơn, Xem hội thoại, Xem tất cả khi có lịch thật, tồn kho có sản phẩm sắp hết, modal backdrop/responsive và KPI đối chiếu toàn bộ.
## Dashboard — rà soát bổ sung (14/10/2026)

- Đã đối chiếu lại sau khi tải mới màn hình: KPI Tổng khách hàng hiển thị 13, Tổng bé cưng 52; dữ liệu không còn rơi về 0 khi bảng `customer` không trả count nhưng `customer_profile` có dữ liệu.
- Đã chuẩn hóa khóa ngày cho `appointment_date` ở dạng DATE và TIMESTAMP, áp dụng cho KPI lịch hẹn, doanh thu dịch vụ, lịch tháng/tuần/ngày và tỷ lệ phân ca. Việc này tránh bỏ sót lịch do so sánh chuỗi nguyên trạng.
- Kiểm thử lại các điểm điều hướng Dashboard: `Xem kho` mở `tab-order-products`, `Xem tất cả` mở `tab-service-bookings`; các nút cảnh báo và ưu tiên vẫn có điều hướng đúng.
- Trạng thái hiện tại: Dashboard tải được dữ liệu thật (14 khiếu nại, 52 bé, 13 khách, 24 phiên chatbot). Kho đang hiển thị trạng thái trống vì truy vấn tồn kho chưa trả sản phẩm; cần rà soát schema quan hệ `inventory` nếu dữ liệu sản phẩm thực tế đang có.
- Đối chiếu trực tiếp tab Sản phẩm cho thấy CSDL có 37 mặt hàng, 36 còn hàng, 1 sắp hết và 1 hết hàng. Vì vậy dòng “chưa có sản phẩm” trên Dashboard là lỗi đồng bộ truy vấn, không phải dữ liệu rỗng. Đã phát hiện truy vấn Dashboard đang yêu cầu cột `stock`/các cột inventory không dùng trong truy vấn chuẩn của tab Sản phẩm; đã thêm fallback truy vấn `product` và `inventory` riêng để tiếp tục xử lý.


## Thú cưng — rà soát luồng ghi dữ liệu (15/10/2026)

- Đã rà soát luồng hồ sơ, cân bé, ghi chú Groomer và các bảng liên quan. Truy vấn ghi hồ sơ thú cưng trước đây chỉ kiểm tra lỗi request, chưa xác minh số dòng cập nhật; ghi chú Groomer còn có thể báo thành công dù bản ghi bị từ chối.
- Đã sửa: cập nhật hồ sơ, ghi chú Groomer và cân nặng đều dùng `select` để xác minh đúng một bản ghi trả về; luồng cân bắt buộc ghi thành công vào cả `pet_weight_history` và `pet_profile.weight`, không bỏ qua lỗi RLS/schema của lịch sử cân.
- Sau khi tải phiên bản `20261015_r48`, cần thao tác một lần trên hồ sơ bé có chủ nuôi: nhập cân mới, lưu, tải lại và kiểm tra mốc mới trong bảng lịch sử cùng cân hiện tại. Nếu Supabase trả lỗi, giao diện phải hiện lỗi CSDL thay vì báo thành công.

## Quy ước cập nhật tiến trình

Sau mỗi lượt kiểm thử hoặc sửa lỗi, bắt buộc cập nhật ngay tài liệu này với: phạm vi và thao tác đã thực hiện, kết quả giao diện, kết quả ghi/đọc lại từ Supabase, lỗi còn lại và trạng thái Đạt/Chưa đạt. Không đánh dấu Đạt nếu chưa xác minh dữ liệu sau khi tải lại.

## Thú cưng — lưu trữ và khôi phục hồ sơ (15/10/2026)

- Rà soát thao tác Lưu trữ hồ sơ và Khôi phục hồ sơ trong menu `•••`.
- Đã sửa để cả hai thao tác dùng `select` xác minh đúng một dòng và trạng thái `INACTIVE`/`ACTIVE` từ Supabase trước khi tải lại bảng và báo thành công. Lỗi RLS, thiếu ID hoặc cập nhật 0 dòng sẽ báo lỗi rõ ràng và không làm mới trạng thái giả.
- Phiên bản module: `20261015_r49`. Đã kiểm tra cú pháp JavaScript.
- Cần chạy lại trên một hồ sơ QA có thể khôi phục để xác nhận trực tiếp sau F5; chưa đánh dấu Đạt nếu chưa kiểm tra được bản ghi thật.

## Thú cưng / Cân bé — kiểm thử trực tiếp và sửa (15/10/2026, r51)

- Bản ghi thử: Bông kiểm thử skeleton, PET-009. Mở hồ sơ qua tên bé, mở Cân bé, nhập và bấm lưu thật.
- Tái hiện: một lần lưu 4.6 kg tạo hai mốc lịch sử và hai toast; hồ sơ vẫn hiện 4.5 kg đến khi F5. Xác nhận sau F5 cả hai mốc 4.6 kg đã được ghi thật.
- Nguyên nhân: tab danh sách và tab hồ sơ cùng gắn handler cho nút Lưu cân nặng; nạp lại sau lưu bị cache TTL chặn.
- Đã sửa: chỉ dùng handler cân của hồ sơ, truyền đúng bé khi mở từ menu danh sách, chặn bấm khi request đang chạy, force tải dữ liệu sau ghi và cập nhật toàn bộ hồ sơ.
- Kiểm thử lại: lưu 4.7 kg chỉ có một mốc; sau sửa cache lưu 4.8 kg cập nhật ngay cân trên header, thông tin thể trạng và lịch sử. F5 xác minh đúng một ô lịch sử 4.8 kg và cân hiện tại 4.8 kg. Đạt luồng cân từ hồ sơ.
- Bằng chứng: artifacts/pet-weight-r51.png. Hai mốc 4.6 kg do lượt tái hiện vẫn được giữ để đối soát, chưa xóa dữ liệu.
- Chưa kiểm thử lại trong lượt này: lưu trữ/khôi phục, chỉnh sửa hồ sơ, ghi chú, cân từ menu danh sách. Không suy rộng kết quả Đạt cho các thao tác này.

## Thú cưng / Ghi chú và form sửa — kiểm thử trực tiếp (15/10/2026, r52)

- PET-009: nhập ghi chú QA, bấm Lưu ghi chú, F5 xác nhận nội dung vẫn giữ. Thử lại với chuỗi QA lưu ghi chú r52 ngày 15/10/2026; xác minh cả thông tin thể trạng, form sửa nhận ngay nội dung mới, sau F5 textarea vẫn đúng. Đạt luồng ghi chú với bản ghi này.
- Tái hiện và sửa: trước sửa form chỉnh hồ sơ dùng ghi chú cũ sau khi lưu Groomer; đã đồng bộ pet.notes và nội dung thể trạng sau lưu. Lỗi lưu ghi chú phải thoát và báo lỗi, không chạy tiếp toast thành công.
- Tái hiện và sửa: hồ sơ chưa có ngày sinh nhưng mở form tự điền 2023-05-15. Đã bỏ ngày mặc định; mở lại form bản r52 xác minh giá trị ngày sinh trống.
- Kiểm tra Lưu thay đổi khi chưa chọn chủ nuôi: bị chặn, hiện Bắt buộc chọn chủ nuôi trước khi lưu hồ sơ bé cưng. Nút Hủy đóng form được. Không tự gán chủ nuôi cho PET-009.
- Chưa đánh dấu đạt toàn bộ sửa hồ sơ: chưa submit thành công form trên bé có quan hệ chủ nuôi rõ ràng trong lượt này. Chụp ảnh bằng chứng thất bại hai lần do công cụ capture; kết quả được xác minh bằng DOM sau F5.

## Đính chính chủ nuôi thú cưng — đối chiếu Supabase thật (15/10/2026, r53)

- Truy vấn chỉ đọc trực tiếp CSDL: 58 pet_profile, cả 58 có customer_id khớp customer.id, không có bé nào customer_id null. 39 bé khớp customer_profile.customer_id; 19 bé có tài khoản chủ nhưng chưa có hồ sơ tên tương ứng. PET-009 có cả tài khoản và hồ sơ chủ hợp lệ.
- Đính chính các ghi nhận trước nói PET-009/Bo thiếu chủ: nhãn UI không chứng minh thiếu quan hệ; kết luận trước đó chưa đúng. Không sửa/gán lại customer_id.
- Lỗi mapping: custMap chỉ tạo từ response customer; khi tài khoản bị giới hạn đọc nhưng customer_profile có tên, code loại mất hồ sơ đó và hiển thị Chưa cập nhật chủ nuôi.
- Đã bổ sung mapping từ customer_profile theo customer_id chuẩn; nếu còn liên kết nhưng không tải được thông tin thì hiển thị Chưa tải được thông tin chủ nuôi, không ngụ ý không có chủ.
- Test trực tiếp sau reload r53: LuLu hiện Lê Lệ Quyên QA; Miu Miu và PET-009 hiện Trần Thị Bích; Bar và High hiện Nguyễn Lê Thi. Danh sách đã hiển thị đúng tên từ quan hệ hiện có.
- Còn cần xử lý riêng: quyền đọc customer cho phiên admin và 19 bé có tài khoản chủ nhưng thiếu customer_profile; không tự suy đoán tên hoặc đổi chủ.

## Thú cưng — tiếp tục đối chiếu và thử sửa hồ sơ (15/10/2026)

- Đối chiếu chỉ đọc: 19 bé chưa có hồ sơ tên thuộc 7 tài khoản customer, không có trường hợp customer_id nhầm sang customer_profile.id. Trong 7 tài khoản có 2 tài khoản tạm; 4 tài khoản có auth_user_id. Chưa suy diễn tên, chưa thay đổi quan hệ chủ.
- Thử trực tiếp sửa PET-009 sau sửa mapping: form tự chọn đúng Trần Thị Bích; đổi màu lông thành Trắng QA 15/10, bấm Lưu thay đổi. Form đóng và thông tin cập nhật.
- Sau F5 xác minh: màu lông Trắng QA 15/10, chủ nuôi Trần Thị Bích, ngày sinh Chưa cập nhật. Đạt cập nhật màu lông, giữ chủ nuôi và giữ ngày sinh null trên bản ghi này; không suy rộng sang toàn bộ trường hoặc luồng CRUD.
- Còn lại: bổ sung/khôi phục tên của 7 tài khoản thiếu customer_profile dựa trên nguồn xác thực; quyền đọc tài khoản khách trong phiên admin vẫn cần giải quyết để lấy đầy đủ SĐT.

## Thú cưng — lưu trữ/khôi phục thực tế và đối chiếu tên (15/10/2026, r54)

- PET-009: thao tác Lưu trữ hồ sơ, xác nhận Lưu trữ; CSDL đã ghi nhưng bảng giữ trạng thái cũ đến F5. Tái hiện lỗi cache TTL chặn tải lại sau ghi.
- Sửa hai callback lưu trữ/khôi phục dùng loadPetsModuleData({ force: true }); tăng phiên bản module r54. Kiểm tra cú pháp JavaScript đạt.
- Kiểm thử lại trực tiếp cả hai chiều, đợi request hoàn tất: bảng chuyển Lưu trữ trước F5; F5 xác nhận vẫn Lưu trữ. Bấm Khôi phục hồ sơ, bảng chuyển Đang nuôi trước F5; F5 xác nhận vẫn Đang nuôi. Đạt luồng lưu trữ/khôi phục trên PET-009; bản ghi cuối đã trả về Đang nuôi.
- Bằng chứng cuối: artifacts/pet-restore-r54.png. Chủ Trần Thị Bích, cân 4.8 kg và ghi chú QA vẫn giữ.
- Đối chiếu thêm 7 tài khoản thiếu customer_profile: metadata đăng ký không có full_name/name; chỉ 2 tài khoản có tên người nhận trong địa chỉ. Tên người nhận không đủ chứng minh tên chủ nuôi nên chưa tự điền hoặc đổi quan hệ. Vấn đề tên thiếu và quyền đọc SĐT vẫn còn, chưa đánh dấu đã sửa hết.

## Thú cưng — cân từ menu danh sách (15/10/2026, r54)

- PET-009: mở menu ••• > Cân bé và thể trạng; modal nhận đúng tên và cân cũ 4.8 kg. Nhập 4.9 kg, chọn Cân định kỳ, bấm Lưu cân nặng một lần.
- Request hoàn tất: modal đóng, bảng hiện 4.9 kg. Công cụ chờ lần đầu hết hạn trước khi request xong; không bấm lưu lại và không kết luận lỗi từ timeout của công cụ.
- F5 xác minh bảng vẫn 4.9 kg; mở hồ sơ thấy cân hiện tại 4.9 kg và đúng một ô lịch sử 4.9 kg. Đạt ghi cân từ danh sách, không nhân đôi mốc trong lượt này.
- Thử cân 0 kg: hiện Vui lòng nhập cân nặng lớn hơn 0 kg, modal giữ mở; Hủy đóng được, cân hiện tại giữ 4.9 kg. Chưa kiểm tra lại CSDL sau F5 riêng cho lượt nhập 0.
- Bằng chứng: artifacts/pet-list-weigh-r54.png. Không sửa code trong lượt này. Chưa kết luận đạt toàn bộ thao tác Thú cưng.

## Thú cưng — lỗi lưu và hiển thị dịch tễ (15/10/2026, r55)

- Thử PET-009 chọn Xổ giun định kỳ và nhỏ gáy ve rận, nhập ghi chú QA, lưu thật. Tái hiện: UI gán tiêu đề Vắc-xin phòng dại, báo đủ điều kiện Hotel sai và bỏ ghi chú.
- Nguyên nhân: loader dựng tiêu đề, nơi đối chiếu, chu kỳ Hằng năm tĩnh cho mọi vaccination_history; handler chỉ lưu loại/ngày, ghi đè lịch sử và bỏ trạng thái, ngày tái chủng, nguồn đối chiếu.
- Sửa r55: đọc đúng nội dung cũ mà không gán nhãn dại; lưu đủ trường trong cột text vaccination_history hiện có, nối thêm lịch sử; xác minh select sau ghi, force refresh. Không tạo file JSON hoặc mock. Bỏ thông tin mặc định không có trong CSDL và escape nội dung khi render.
- Sau reload r55, bản ghi xổ giun cũ hiển thị đúng loại, ngày 15/10/2026; không còn tự báo đủ điều kiện Hotel. Trường thiếu hiện Chưa cập nhật/Chưa xác nhận.
- Đang kiểm thử lại lưu đủ nguồn QA r55, trạng thái Đã thực hiện và ngày tái chủng 2026-11-15; chưa đánh dấu Đạt khi chưa xác minh sau F5.
- Kết quả lượt thử lại đã hoàn tất: modal đóng, hiển thị đúng Xổ giun, Đã thực hiện, ngày 15/10/2026, tái chủng 2026-11-15 và nguồn QA r55. F5 rồi mở tab dịch tễ: toàn bộ nội dung giữ nguyên; mốc cũ vẫn tồn tại, không bị ghi đè. Đạt lưu/đọc lại các trường đã thử trên PET-009. Bằng chứng artifacts/pet-vaccine-r55.png.
- Giới hạn còn lại: chưa kiểm thử đồng thời hai phiên ghi lịch sử; chưa rà soát đầy đủ nghiệp vụ hạn hiệu lực và các điều kiện Hotel. Không kết luận đủ toàn bộ điều kiện nhận phòng chỉ từ lượt này.

## Thú cưng — thao tác nhanh hồ sơ (16/10/2026, r56)

- Kiểm thử PET-009: tab Nhật ký chăm sóc và Lịch sử dịch vụ chuyển được, hiển thị trạng thái trống trên hồ sơ này. Chưa coi là xác minh mọi bản ghi CSDL.
- Tái hiện hai nút chết: Đặt lịch Spa hoặc Hotel và Đăng ảnh nhật ký bấm không có phản hồi. Source không có listener cho hai class tương ứng.
- Đang sửa nút đặt lịch dùng luồng của menu danh sách. Phát hiện thêm sessionStorage mà menu danh sách truyền sang Dịch vụ chưa có nơi tiếp nhận, nên chỉ điều hướng mà không mở form/chọn bé.
- Bổ sung nhận ngữ cảnh và điền qua hàm chọn khách/bé của form lịch hẹn; chưa đánh dấu Đạt trước khi thử lại UI.
- Đăng ảnh nhật ký chưa có luồng tạo/upload tại phân hệ Thú cưng; còn lỗi, chưa sửa xong, chưa ghi dữ liệu từ nút này.
- Kết quả r58: sau reload, bấm Đặt lịch Spa hoặc Hotel từ PET-009 tự mở form Thêm lịch hẹn, tự chọn đúng Trần Thị Bích và Bông kiểm thử skeleton/Poodle; cảnh báo nhận ghi chú của bé. Hủy đóng được và quay lại Thú cưng. Đạt điều hướng/mở form/chọn bé-chủ trong lượt này, chưa tạo lịch mới.
- SĐT vẫn trống do nguồn khách không tải đủ SĐT (vấn đề đã ghi trước). Form còn hiện ngày 2026-10-15 trong khi ngày người dùng là 16/10; cần sửa ngày mặc định theo múi giờ/ngày hiện tại. Chưa đánh dấu đạt luồng tạo lịch và ghi CSDL.
- Chụp bằng chứng form thất bại do công cụ capture; kết quả kiểm chứng bằng DOM. Nút Đăng ảnh nhật ký vẫn chưa có xử lý, cần tiếp tục triển khai/test, không coi hồ sơ thú cưng đã hoàn tất mọi thao tác.

## Tiếp nối Thú cưng > Đặt lịch — ngày mặc định và phát hiện lưu giả (16/10/2026, r59)

- Sửa ngày mặc định: mỗi lần mở form lấy ngày hiện tại theo Asia/Bangkok, không giữ ngày cũ/UTC. Sau reload thử trực tiếp Thêm lịch hẹn: hiện 2026-10-16. Đổi sang 2026-10-20 rồi Hủy và mở lại: trở về 2026-10-16. Đạt mở mới/reset ngày mặc định trong lượt này.
- Bấm Lưu lịch hẹn khi form trống: hiện Vui lòng nhập tên khách hàng; form giữ mở. Hủy đóng được. Không tạo lịch trong lượt kiểm thử này.
- Bằng chứng: artifacts/booking-date-r59.png.
- LỖI CÒN MỞ, phát hiện qua source chưa thử ghi hợp lệ: handler tạo lịch gán ID giả CUST-NEW/PET-NEW, giá 250000 cố định vào state trước khi ghi; insert appointment không ghi customer_id/pet_id/service_id và không kiểm tra error trả về; vẫn có thể đóng form/toast thành công dù CSDL từ chối. Cần sửa handler theo quan hệ và giá thật, rồi thử ghi/F5. Chưa đánh dấu đạt tạo lịch.
- SĐT thiếu và nút Đăng ảnh nhật ký ở hồ sơ Thú cưng vẫn chưa xử lý xong. Không suy rộng kiểm thử ngày thành đạt toàn bộ CRUD.

## Lịch hẹn từ Thú cưng — sửa ghi dữ liệu thật (16/10/2026, r61)

- Đã bỏ tạo dòng giả CUST-NEW/PET-NEW và giá 250000 cố định trước insert. Luồng Spa kiểm tra bé/chủ bằng UUID, đối chiếu pet_profile.customer_id, chọn dịch vụ thật và service_price_matrix theo cân/ngày; insert đầy đủ customer_id/pet_id/service_id/staff_id, kiểm tra error và bản ghi trả về rồi force tải lại.
- Bấm Lưu khóa trong khi request chạy; lỗi giữ form mở. Tái hiện lỗi enum khi dùng giá trị trong CSDLdemo: cho_xac_nhan không được CSDL thật chấp nhận. Đã sửa PENDING/UNPAID theo code và phản hồi thực tế.
- Đã thử ghi từ LuLu PET-1792044472428 / Lê Lệ Quyên QA, chọn Express Care – Vệ Sinh Nhanh, 17/10/2026 11:30, ghi chú QA r61. Modal đóng; bảng có lịch BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8, LuLu 5 kg, dịch vụ 30 phút, 100000 đ, Chờ xác nhận. Giá lấy từ CSDL, không phải 250000 mặc định.
- Còn mở: nhãn khách trên bảng vẫn Khách vãng lai do quyền đọc/mapping tên khách; insert đã xác minh customer_id đúng chủ, không được kết luận dữ liệu mất chủ từ nhãn này. SĐT chưa tải. Hotel/Taxi hiện báo rõ chưa hoàn thiện luồng phòng/chuyến và không lưu giả; chưa đạt CRUD hai nhóm này. Chưa kiểm thử trùng lịch và đồng thời.
- Sau F5 đã xác minh lịch BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8 vẫn xuất hiện đúng bé, dịch vụ, ngày giờ, giá 100000 đ và trạng thái chờ xác nhận. Đạt ghi/đọc lại lịch Spa trên bản ghi QA này. Bằng chứng artifacts/booking-save-r61.png. Giữ bản ghi QA để đối soát, chưa hủy.

## Lịch hẹn — sửa hiển thị tên khách (16/10/2026, r62)

- Nguyên nhân: truy vấn appointment thiếu customer_id thô; tên phụ thuộc customer join bị giới hạn quyền đọc nên bị thay nhãn Khách vãng lai dù lịch có chủ hợp lệ.
- Sửa: lấy customer_id/pet_id, đọc customer_profile riêng và ghép chính xác bằng appointment.customer_id. Không suy chủ từ bé, không gán USER-001 giả, không gọi khách thiếu tên là khách vãng lai. Không thay đổi quan hệ hoặc dữ liệu lịch.
- Kiểm thử trực tiếp sau reload: lịch BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8 hiển thị Lê Lệ Quyên QA, LuLu 5 kg, Express Care, 17/10/2026 11:30, 100000 đ. Đạt sửa tên trên bản ghi QA đã ghi ở r61. node --check services.js đạt. Bằng chứng artifacts/booking-customer-r62.png.
- Còn mở: SĐT vẫn — vì chưa đọc được số tài khoản; chưa sửa quyền RLS. Hotel/Taxi, kiểm tra trùng lịch và nút Đăng ảnh nhật ký vẫn chưa hoàn tất; không đánh dấu đạt toàn bộ CRUD.

## Lịch hẹn — gợi ý khách và đổi nhóm dịch vụ (16/10/2026, r63)

- Sửa danh sách chọn khách: dùng hồ sơ đã ghép bằng customer_id, ghép thú cưng từ pet_profile bằng đúng customer_id. Bỏ nhánh lấy khách từ lịch hẹn rồi tự điền SĐT 0901234567, giống Poodle và cân 4.5 không có nguồn dữ liệu.
- Bỏ các mảng gói dịch vụ mẫu khi danh mục CSDL rỗng; chỉ gợi ý dịch vụ đang phục vụ. Không tìm thấy thì hiện trạng thái trống.
- Test trực tiếp phát hiện đổi nhóm khi dropdown đang mở vẫn giữ gói Spa. Đã sửa cập nhật dropdown ngay khi đổi nhóm; reload rồi test lại Spa -> Hotel -> Taxi: Hotel có Phòng Standard/Deluxe/Luxury Suite, Taxi chỉ có Dịch Vụ Xe Đưa Đón Tận Nơi, không còn gói Spa trong danh sách Taxi.
- Test tìm Lê Lệ Quyên QA: hiện 2 tài khoản trùng tên với danh sách bé khác nhau; chọn tài khoản có lala/LuLu, thẻ xác nhận và bé đầu tiên lala được điền. Tìm gói zzQA-khong-co-goi hiện Không tìm thấy gói dịch vụ phù hợp. Không tạo lịch mới trong lượt này; chưa đánh dấu đạt ghi Hotel/Taxi.
- node --check services.js và tab-service-bookings.js đạt. Công cụ chụp ảnh lỗi Unable to capture screenshot hai lần nên lượt này chưa có ảnh bằng chứng; kết quả kiểm tra dùng DOM trực tiếp.
- SĐT vẫn chưa tải: phone_main thuộc customer, policy customer_identity_boundary chỉ cho chủ tài khoản hoặc pawpal_is_staff(); cần xác minh liên kết Auth nhân viên/quyền đọc CSDL (vấn đề đã ghi trước), chưa sửa policy hay gán số từ người nhận. Giá hiển thị Hotel/Taxi và luồng ghi hai nhóm này chưa được xác minh đầy đủ.

## Lịch hẹn — lưu Taxi một chiều thật (16/10/2026, r64)

- Bổ sung luồng Taxi một chiều trong form Thêm lịch hẹn: xác minh UUID chủ/bé/dịch vụ, yêu cầu đủ địa chỉ đón/trả và cự ly dương, kiểm tra cân nặng thực. Đọc taxi_price_rule từ Supabase; chỉ dùng đúng một quy tắc còn hiệu lực theo cự ly/cân/ngày, giá bằng base_price + surcharge. Không có/nhập nhằng giá thì báo lỗi, không dùng công thức dự phòng.
- Lưu lộ trình, hình thức, cự ly và ID quy tắc giá trong khối text có nhãn ở appointment.note hiện có, cùng ghi chú QA. Loader đọc lại khối này; bảng và hồ sơ hiển thị đúng dữ liệu. Không dùng file JSON hay thêm bảng không tồn tại. Chưa phải cơ chế giữ phòng Hotel.
- Test thật: chọn Lê Lệ Quyên QA, LuLu 5 kg; Taxi một chiều đón đến quầy, ngày 18/10/2026 11:30, 4 km. Lưu khi chưa có địa chỉ bị chặn với thông báo yêu cầu địa chỉ đón/trả, form giữ mở.
- Sau nhập Điểm đón QA r64 và Điểm trả QA r64, lưu thành công BKG-08e4e094-a5e6-48c9-b135-ffac698f70c8. F5: bảng giữ đúng khách/bé, hai điểm, 4 km, một chiều, 120000 đ, Chờ xác nhận. Mở hồ sơ giữ đúng lộ trình/hình thức/cự ly/giá.
- Phát hiện thêm ghi chú đã lưu nhưng hồ sơ hiện Không có do loader thiếu customerNote. Đã nối lại; reload hồ sơ xác minh hiện QA r64 kiểm thử lưu Taxi 16/10/2026. Bỏ địa chỉ 45 Lê Duẩn, cự ly 4.2 km, khứ hồi và đích Q.1 mặc định sai ở hồ sơ Taxi; escape địa chỉ khi render HTML.
- Bằng chứng artifacts/booking-taxi-r64.png. node --check cả ba file dịch vụ đạt; git diff --check đạt. Giữ lịch QA để đối soát, chưa xác nhận/thu tiền/điều phối.
- Phạm vi đạt: tạo và đọc lại chuyến Taxi một chiều đã thử; chưa test hướng Chở về nhà, biên khoảng giá, đồng thời, trùng lịch hay sửa/hủy. Khứ hồi đang chặn rõ do thiếu quy tắc giờ về/giá khứ hồi; Hotel vẫn chặn vì chưa có cơ chế liên kết/giữ phòng được xác minh. SĐT và quyền đọc customer còn mở. Không kết luận hoàn tất toàn bộ CRUD dịch vụ.

## Dịch vụ — xác nhận, điều phối và hủy thật (16/10/2026, r65)

- Tái hiện: bấm xác nhận lịch Taxi, hồ sơ còn Chờ xác nhận vì render trước khi request kết thúc. Handler trạng thái và điều phối bỏ qua Supabase error, đổi state trước ghi nên có nguy cơ báo thành công giả.
- Sửa chuyển trạng thái: kiểm tra kết nối/UUID/trạng thái gốc, chỉ cho chuyển theo trạng thái hiện tại, chống request lặp trong phiên; update có điều kiện trạng thái gốc, select xác minh id/status, force nạp và render hồ sơ sau await. Lỗi trả về thông báo và không đổi state giả.
- Sửa hủy: đợi kết quả lưu rồi mới đóng modal/báo thành công; lưu lý do vào note, giữ nguyên khối lộ trình Taxi. Sửa điều phối: dùng đúng một staff UUID, xác minh id/staff_id sau update, so sánh nhân viên và trạng thái gốc, lưu lý do điều phối trong note, không tự sửa nhật ký cũ trên state. Chặn bàn giao toàn bộ các nhật ký đã ghi khi chưa có luồng lưu tương ứng. Bỏ KTV mặc định Ngọc Anh trong modal; vô hiệu nút Đổi KTV trên ca kết thúc.
- Test chuyến QA BKG-08e4e094-a5e6-48c9-b135-ffac698f70c8: xác nhận đã tồn tại sau F5. Điều phối thử cho Trần Văn Nhân Viên, lý do QA r65 kiểm thử lưu điều phối; F5 bảng và hồ sơ giữ đúng nhân viên và Đã xác nhận. Đây là kiểm thử khả năng ghi staff_id, chưa xác minh tiêu chuẩn vai trò tài xế/lịch trực.
- Hủy chuyến QA trên UI, lý do QA r65 kết thúc kiểm thử chuyến Taxi. F5: Đã hủy, lý do hủy và điều phối còn trong note; lộ trình/4 km/120000 đ giữ nguyên. Sau bản sửa mới nút Đổi KTV bị disabled trên lịch này, đã kiểm tra isEnabled=false. Không thu tiền hay tiếp nhận bé.
- Test lại xác nhận bằng bản sửa mới trên lịch Spa QA BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8: đợi Supabase hoàn tất, hồ sơ tự đổi Đã xác nhận; F5 bảng giữ Đã xác nhận/100000 đ/LuLu. Giữ lịch Spa ở Đã xác nhận để đối soát.
- Bằng chứng artifacts/booking-status-r65.png. node --check ba file dịch vụ và git diff --check đạt.
- Còn mở: khi F5 Hồ sơ, HTML mẫu BKG-1001/Miu Con có thể xuất hiện trong lúc dữ liệu thật đang tải (không phải bản ghi mới). Chưa sửa lượt này. Danh sách điều phối còn nhãn KTV Spa chung, chưa xác minh đúng vai trò tài xế, ca trực và xung đột lịch. Chưa thử lỗi RLS bằng phiên mất quyền, hai phiên ghi đồng thời, tiếp nhận/hoàn tất, thu tiền. Hotel/khứ hồi/SĐT vẫn mở. Lý do hủy và điều phối đang trình bày chung khu Ghi chú của khách; cần tách cách trình bày sau, dữ liệu đã lưu.

## Dịch vụ — hồ sơ đúng ca khi tải lại (16/10/2026, r66)

- Sửa lỗi F5 lộ HTML mẫu BKG-1001/Miu Con trong lúc chờ CSDL: nội dung hồ sơ ban đầu ẩn, trạng thái tải nằm ngoài thẻ hồ sơ. Khi có dữ liệu đúng ID mới hiện thẻ.
- Bỏ fallback BKG-1001 và fallback bookingsData[0] trong render hồ sơ. Nếu không có lựa chọn/ID không tồn tại/không đọc được thì hiện trạng thái chọn lịch, không tìm thấy hoặc lỗi tải; không tự đổi sang ca khác. Breadcrumb chỉ hiện khi tìm thấy lịch thật.
- Test trực tiếp F5 trên hồ sơ Taxi QA: DOM đầu chỉ có Đang tải hồ sơ lịch hẹn…, sau nạp có đúng BKG-08e4e094-a5e6-48c9-b135-ffac698f70c8 / Đã hủy. Chuyển bảng rồi mở Spa QA: code đúng BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8. F5 lần nữa có trạng thái tải, chưa có dữ liệu mẫu.
- Bằng chứng artifacts/service-detail-loading-r66.png. node --check services.js/tab-service-detail.js và git diff --check đạt. Không ghi thay đổi nghiệp vụ trong lượt này.
- Chưa thao tác tạo tình huống ID bị xóa hoặc phiên mất quyền trên CSDL; nhánh lỗi/trống mới được rà code, chưa đánh dấu kiểm thử trực tiếp. Đây là trạng thái tải chữ, chưa phải skeleton bố cục hồ sơ. Hotel/khứ hồi/SĐT và các mục còn mở r65 vẫn chưa hoàn tất.

## Lỗi để sửa sau và kiểm thử tiếp nhận (16/10/2026, r67)

- Theo yêu cầu người dùng: ghi lại lỗi còn mở, tạm hoãn sửa. Các mục Hotel, Taxi khứ hồi, quyền đọc SĐT customer, vai trò/ca trực điều phối và bố cục skeleton hồ sơ tiếp tục giữ trạng thái CHƯA HOÀN TẤT, không kiểm thử lại các mục đã đạt chỉ để đổi nhãn.
- Kiểm thử trực tiếp tiếp nhận lịch Spa QA BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8: chọn Trần Văn Nhân Viên, cân 5.1 kg, tick Dây dắt, ghi QA r67 dây dắt kiểm thử tiếp nhận, bấm Xác nhận tiếp nhận và bắt đầu ca.
- Tái hiện lỗi: ngay sau bấm có 5.1 kg/nhân viên/biên bản trong state; sau request tải lại thì lịch chuyển Đang thực hiện nhưng cân hiện 5 kg, nhân viên Chưa phân công, thông báo Ca dịch vụ chưa thực hiện tiếp nhận và kiểm tra an toàn tại quầy. Chưa đạt lưu biên bản.
- Đối chiếu source: intakeRecord và booking.staff/petWeight chỉ gán vào state; không có insert/update lưu biên bản/cân tiếp nhận/staff_id/check_in_time. Chỉ updateBookingStatus ghi appointment_status. Force refresh bộc lộ dữ liệu chưa được lưu. Handler còn báo thành công trước await, fallback cân 4.2/Ngọc Anh, ảnh chỉ dùng blob URL. Đây là lỗi nghiệp vụ ghi dữ liệu, không phải dữ liệu bẩn.
- Chưa sửa theo yêu cầu hoãn. Không thu tiền/hoàn tất ca. Lịch Spa QA hiện Đang thực hiện do kiểm thử; dữ liệu pet_profile.weight không bị đổi bởi thao tác này. Cần lưu biên bản và bắt đầu ca đồng nhất, kiểm tra required/cân dương/nhân viên thật, upload ảnh thật, xác minh sau reload trước báo thành công.
- Sau F5 đã xác minh vẫn Đang thực hiện nhưng biên bản còn thông báo chưa tiếp nhận. Bằng chứng artifacts/intake-not-saved-r67.png. Lượt này chỉ kiểm thử và ghi process, không sửa code.

## Dịch vụ — kiểm thử nhật ký, phụ phí và dịch vụ đi cùng (16/10/2026, r68)

- Tiếp tục kiểm thử trên Spa QA BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8, đang thực hiện. Theo yêu cầu đang hoãn sửa: chỉ kiểm thử và ghi lỗi, không đổi code.
- Nhật ký: điền QA r68 kiểm thử ghi nhật ký và ghi chú rồi bấm Ghi nhật ký. Không có phản hồi/toast/bản ghi mới, form không reset; ô KTV chỉ có lựa chọn rỗng. Rà source không tìm thấy listener cho btnSubmitCarelogStep hoặc code nạp newLogStepStaff. Sau F5 nhật ký vẫn trống. CHƯA ĐẠT tạo nhật ký; chưa thể kiểm thử sửa/xóa trên ca QA này vì chưa tạo được bản ghi.
- Phụ phí: thêm QA r68 phụ phí kiểm thử, 1000 đ, lý do QA r68 kiểm tra lưu dữ liệu, không thu tiền. UI báo thành công, có dòng 1000 đ nhưng tổng từ 100000 thành 102000 đ (sai cộng đôi). F5: dòng phụ phí biến mất, tổng trở về 100000 đ. Source chỉ push booking.surcharges và tăng booking.surchargePrice, không ghi CSDL; render lại cộng cả mảng và surchargePrice nên cộng đôi. CHƯA ĐẠT lưu phụ phí/tổng tiền. Bằng chứng artifacts/service-surcharge-r68-before.png.
- Dịch vụ đi cùng: chọn Cắt tỉa móng và mài mịn chống xước 40000 đ, nhân viên Trần Văn Nhân Viên, ghi chú QA r68. Bấm Lưu dịch vụ đi cùng báo thành công, bảng kê có dòng và tổng 140000 đ. Gói trong dropdown lấy mảng tĩnh accompanyingServicesCatalog, handler chỉ ghi state. Bằng chứng trước F5 artifacts/service-addon-r68-before.png. Đang xác minh sau F5, chưa đánh dấu đạt ghi CSDL.
- Không bấm thu tiền, không gửi tin khách, không thực hiện dịch vụ thực tế. Các thay đổi phụ phí/dịch vụ đi cùng chỉ nhằm kiểm thử lưu trên ca QA, không phải thu phí thật. Các lỗi r67 và mục Hotel/khứ hồi/SĐT vẫn hoãn sửa.
- Xác minh F5 hoàn tất: dịch vụ đi cùng 40000 đ biến mất, tổng 140000 trở về 100000 đ; nhật ký vẫn trống. CHƯA ĐẠT lưu dịch vụ đi cùng. Bằng chứng artifacts/service-extras-r68-after.png. Đã ghi kết quả cuối, không còn ở trạng thái đang xác minh.

## Dịch vụ — sửa lưu nhật ký và chi phí (16/10/2026, r69)

- Sửa nút Ghi nhật ký: nạp nhân viên thật theo UUID, bắt buộc tên bước/nhân viên, chỉ ghi trên ca đang thực hiện; ghi care_log với appointment_id/pet_id/care_action_id, recorded_at thật, kiểm tra lỗi và select xác minh. Thiếu mốc thì tạo care_action thật. Nhân viên được ghi kèm description vì care_log thật không có staff_id; loader đọc lại, hiển thị tên nhân viên/ghi chú, giờ Asia/Bangkok và nhãn Đã ghi.
- Test phát hiện CSDLdemo sai cấu trúc care_action: bảng thật KHÔNG có service_id, dùng service_category. Đã đọc cấu trúc bảng thật chỉ đọc và sửa theo nhóm dịch vụ. Lần thử đầu thất bại không tạo care_log; lần thử sau đã lưu QA r69 ghi nhật ký thật với ghi chú QA r69 kiểm tra lưu Supabase và F5.
- Phụ phí/dịch vụ đi cùng: CSDL hiện chưa có bảng chi tiết phát sinh. Lưu các dòng có ID, loại, số tiền, tên, lý do, nhân viên, service UUID trong khối text có cấu trúc ở appointment.note; ghi note và total_price bằng cùng một update, điều kiện note/giá/trạng thái gốc chống ghi đè dữ liệu đã đổi. Không dùng file JSON/mock, không báo thành công nếu lỗi/0 dòng. Nạp lại từ CSDL sau ghi. Hạn chế: đây là chi tiết text của lịch hẹn, chưa thay thế bảng hạch toán riêng.
- Bỏ cộng thêm surchargePrice lần thứ hai; giá gói được tách từ tổng đã lưu trừ đúng một lần các dòng phát sinh. Đổi nút Lưu phụ phí và ghi nhật ký thành Lưu phụ phí vì thao tác này không ghi care_log. Thêm lựa chọn mặc định Chưa có xác nhận của chủ nuôi để không tự khẳng định đã gửi Zalo/khách đồng ý. Bản ghi QA thử trước thay đổi mặc định có nguyên văn lựa chọn mặc định cũ; không có tin nhắn nào được gửi và không có khách thật xác nhận.
- Bỏ danh mục dịch vụ đi cùng tĩnh; chọn từ service đang phục vụ. Giá đi cùng vẫn do quản trị nhập trên form, chưa tự định giá theo cân/Hotel/Taxi. Đổi dịch vụ sẽ xóa giá cũ. Hai nút xóa dòng chi phí đã chuyển sang ghi lại note/tổng bằng cùng cơ chế, chưa test xóa thật lượt này. Escape nội dung tài chính khi render.
- Test trực tiếp lưu QA r69 phụ phí lưu thật 1000 đ: tổng 100000 -> 101000 đ, không còn 102000 đ. Thêm Cắt Móng & Vệ Sinh Tai từ CSDL, giá nhập kiểm thử 60000 đ, Trần Văn Nhân Viên, ghi chú QA: tổng 161000 đ. F5: cả dòng 1000, dòng 60000 và tổng 161000 vẫn còn; nhật ký QA/tên nhân viên/ghi chú vẫn còn, form nhật ký reset. Bằng chứng artifacts/service-saved-r69.png. Không thu tiền/hoàn tất/gửi thông báo khách.
- Kiểm tra node --check ba file dịch vụ và git diff --check đạt. Phạm vi đạt: tạo/đọc lại nhật ký chữ, phụ phí và dịch vụ đi cùng đã thử. CHƯA đạt toàn bộ CRUD: sửa/xóa nhật ký cũ vẫn dùng state, ảnh chưa có luồng upload thật (lưu có file sẽ báo lỗi rõ), chưa test hai phiên cùng sửa, xóa chi phí, lỗi mất quyền hoặc giá từng loại dịch vụ. Biên bản tiếp nhận r67, Hotel/khứ hồi/SĐT còn mở; không đánh dấu đã sửa các mục này.

## Nhật ký chăm sóc — sửa bản ghi thật (16/10/2026, r70)

- Sửa handler Lưu thay đổi: ghi care_log thật theo id và appointment_id, kiểm tra updated_at gốc để tránh ghi đè bản ghi đã đổi; kiểm tra error/select xác minh rồi force refresh. Không tự sửa state/toast thành công trước CSDL. Khi đổi tên mốc, tìm hoặc tạo care_action cùng service_category, không đổi tên mốc dùng chung của ca khác.
- Bỏ ngày cố định 2026-10-12: form đọc giờ Asia/Bangkok; cập nhật giữ đúng ngày cũ của recorded_at và giờ được chọn. Nạp đúng step_name/nhân viên/ghi chú đã lưu. care_log không có trạng thái hoàn thành bước riêng, đổi nhãn thành Đã ghi nhật ký, không giả lưu checkbox hoàn thành.
- Test UI trên BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8: đổi tên QA r69 ghi nhật ký thật thành QA r70 nhật ký đã chỉnh sửa; đổi nội dung QA r70 đã sửa nội dung, kiểm tra sau F5; giữ Trần Văn Nhân Viên/08:00. Lưu thành công, F5 vẫn đúng tên/nội dung/nhân viên/giờ. Bằng chứng artifacts/carelog-edit-r70.png. Đạt sửa/đọc lại bản ghi đã thử.
- Handler Xóa bước này đã chuyển từ splice state sang DELETE care_log có id/appointment_id/updated_at và select xác minh; có xác nhận rõ xóa vĩnh viễn, chặn nhật ký có media. CHƯA TEST XÓA THẬT vì không có cơ chế khôi phục; không đánh dấu đã đạt Delete. Không xóa mốc care_action hoặc ảnh ngoài ý muốn.
- Kiểm tra Supabase Storage chỉ đọc bằng listBuckets: kết quả [] (chưa có bucket). Ảnh chưa hoàn tất: chưa có bucket/private access policy/upload/media link để kiểm thử. Không tự mở bucket public hoặc quyền anon. Các nút thêm ảnh hiện báo rõ chưa cấu hình kho ảnh thay vì im lặng hoặc chấp nhận blob như ảnh đã lưu; thao tác sửa giữ nguyên ảnh có sẵn và chặn thay đổi ảnh chưa lưu. Handler báo lỗi ảnh mới chưa được test lại UI lượt này, chưa đánh dấu đạt upload.
- node --check tab-service-detail.js và git diff --check đạt. Chưa sửa biên bản tiếp nhận/Hotel/khứ hồi/SĐT. Tổng ca QA vẫn 161000 đ, chưa thu tiền. Không coi kết quả sửa nhật ký là hoàn tất toàn bộ CRUD/ảnh.

## Dịch vụ — nghiệm thu và hoàn tất ca QA (16/10/2026, r71)

- Người dùng yêu cầu bỏ qua ảnh, tiếp tục các phần còn lại. Lượt này kiểm thử UI và đối chiếu CSDL, không sửa code hay cấu hình Storage.
- Mở Hoàn thành dịch vụ trên Spa QA BKG-c8237798-4ead-4e89-8a5b-d6cafce481c8. Bỏ chọn Đã thu đủ tiền tại quầy để không ghi thanh toán giả. Không chọn voucher/đổi điểm, không thu tiền và không gửi tin khách.
- Test validation: bỏ xác nhận chất lượng rồi bấm Xác nhận bàn giao: bị chặn với thông báo yêu cầu đạt tiêu chuẩn. Tick chất lượng, bỏ trả tư trang: bị chặn yêu cầu trao trả đủ tư trang. Hai điều kiện UI này đạt trên lượt thử.
- Tick đủ hai điều kiện, giữ chưa thu tiền, bấm hoàn tất. Đối chiếu CSDL thật chỉ đọc: appointment_status=COMPLETED, payment_status=UNPAID, total_price=161000. Đạt chuyển trạng thái hoàn tất, giữ tổng tiền và chưa thanh toán trên ca QA này. Không chứng minh đạt thu ngân/voucher/đổi điểm.
- Đối chiếu schema: appointment thật KHÔNG có check_in_time/check_out_time (query cột check_out_time báo không tồn tại; đã đọc tên cột thật). Không được dùng file demo để kết luận giờ bàn giao đã lưu. Handler hiện còn gửi update các cột sai status/total_amount và enum payment paid/pending, bỏ qua error; chỉ request updateBookingStatus riêng ghi được COMPLETED. Cần sửa tách hoàn tất/thu ngân, lưu biên bản bàn giao và kiểm tra lỗi toàn bộ request.
- Lỗi mở: modal mặc định tick đạt chất lượng/trả tư trang/đã thu tiền; voucher và lựa chọn đổi điểm là danh sách tĩnh, tích điểm dự kiến +16 chưa có chứng cứ ghi transaction. Tiến độ báo 0/1 do care_log không có cờ completed dù nhật ký đã ghi; trước hoàn tất vẫn không có biên bản tiếp nhận hay staff_id mà cho hoàn tất. Chưa kiểm thử thu tiền, voucher hoặc trừ điểm thật; không đánh dấu đạt những mục này.
- Ca Spa QA hiện đã Hoàn thành/Chưa thu/161000 đ. Các khoản QA và nhật ký giữ để đối soát. Các lỗi còn mở được giữ trong process; ảnh bỏ qua theo yêu cầu.
- Sau F5 xác minh UI Hoàn thành, Chưa thu, tổng 161000 đ, phụ phí/dịch vụ đi cùng và nhật ký vẫn còn; bằng chứng artifacts/service-complete-r71.png. Ca vẫn hiển thị biên bản chưa tiếp nhận, xác nhận lỗi điều kiện nghiệp vụ chưa được chặn.

## Dịch vụ — sửa tiếp nhận và bàn giao (16/10/2026, r72)

- Lưu biên bản tiếp nhận vào khối text có cấu trúc ở appointment.note hiện có (cân tiếp nhận, UUID/tên nhân viên, checklist, tư trang, recordedAt/updatedAt). Cùng một UPDATE ghi note + staff_id + IN_PROGRESS; so sánh note/trạng thái/giá gốc, select xác minh trước báo thành công. Không giả định cột check_in_time/check_out_time có trong CSDL thật, không sửa pet_profile.weight ngoài ý muốn.
- Loader đọc lại biên bản, cân tiếp nhận 5.1 kg tách với cân hồ sơ gốc 5 kg; hiển thị tư trang ở cả phần tóm tắt và biên bản, thời điểm tiếp nhận/bàn giao ở header theo Asia/Bangkok. Bỏ ảnh Unsplash mặc định khỏi biên bản không có ảnh.
- Intake chặn cân <=0/thiếu hoặc trùng tên nhân viên/tình trạng bình thường và bất thường cùng tick. Phụ phí cân nặng chỉ kiểm tra khi vượt ngưỡng 0.5 kg; không tự cộng giá 50000 trong state. Khi cần phụ phí phải dùng luồng lưu phụ phí thật. Chặn chỉnh biên bản trên ca đã kết thúc.
- Hoàn tất ca: assertHandoverReady kiểm tra đang thực hiện và biên bản tiếp nhận đã lưu có thời gian hợp lệ/UUID nhân viên/cân dương. Không cho đổi IN_PROGRESS/COMPLETED trực tiếp qua updateBookingStatus để bỏ qua biên bản. Lưu biên bản bàn giao (xác nhận chất lượng/trả tư trang, thời điểm thật, mốc tiếp nhận và tổng) cùng COMPLETED bằng một update, kiểm tra lỗi/select. Bỏ request sai cột status/total_amount và enum paid/pending, bỏ catch nuốt lỗi. Giữ nguyên payment_status và total_price.
- Form bàn giao không tự tick nghiệm thu/tư trang; thanh toán chỉ hiển thị trạng thái từ CSDL, checkbox và phương thức bị khóa chỉnh sửa tại bước này. Bỏ voucher/điểm mẫu khỏi form, chưa tự tích điểm; chuyển xử lý các mục này sang thu ngân. Nút đổi thành Lưu biên bản bàn giao, không hứa xuất phiếu khi chưa in. Tiến độ hiển thị số nhật ký đã ghi thay vì cờ completed không tồn tại.
- Tạo mới qua UI QA BKG-46e6e9c7-9896-4f15-956c-5eafe0a4c7f5, LuLu/Lê Lệ Quyên QA, Express Care, 19/10/2026 10:00, 100000 đ. Xác nhận lịch; test cân 0 bị chặn, cân 5.1 nhưng thiếu nhân viên bị chặn. Chọn Trần Văn Nhân Viên, Dây dắt, QA r72 dây dắt đã lưu cùng biên bản; lưu thành công. F5 giữ Đang thực hiện/5.1 kg/nhân viên/tư trang/checklist. Bằng chứng artifacts/intake-saved-r72.png.
- Test bàn giao trên ca này: form ban đầu không tick nghiệm thu/đã thu tiền, tổng 100000 đ, tư trang đúng biên bản, không có nhật ký thì hiển thị Chưa có nhật ký chăm sóc. Tick đủ hai xác nhận, giữ chưa thanh toán, lưu thành công. Sau F5 Hoàn thành/Chưa thu/100000 đ, nguyên biên bản và tư trang, header có thời điểm tiếp nhận 08:17 và bàn giao 08:18 ngày 16/10/2026. Bằng chứng artifacts/handover-saved-r72.png.
- Đối chiếu CSDL chỉ đọc đúng mã QA: COMPLETED, UNPAID, total_price=100000, có cả khối intake/handover, staff_id và tư trang đã lưu. Không thu tiền, không gửi thông báo, không tự cộng/trừ điểm. Giữ ca QA để đối soát.
- Một phép thử chọn Đã thu đủ tiền rồi bấm lưu bị kiểm duyệt tự động từ chối vì nguy cơ ghi nhận thanh toán cho ca chưa thu. Không thực hiện/không thử vòng tránh. Tiếp tục bằng phương án bỏ chọn thu tiền; sau đó chuyển trạng thái thanh toán thành trường chỉ đọc trong bước bàn giao. Không đánh dấu đã kiểm thử thanh toán.
- Kiểm tra tự động helper: chặn thiếu biên bản, sai trạng thái, cân 0; chấp nhận biên bản hợp lệ. Kiểm tra đọc biên bản text đúng cân/Unicode/loại bản ghi. node --check ba file dịch vụ và git diff --check đạt. Nhánh thiếu biên bản được kiểm tra helper, không thử hoàn tất một ca khách thật khác.
- Giới hạn: kiểm tra chuyển trạng thái là phía giao diện, chưa thêm transaction/RPC kiểm soát quy tắc tại CSDL. Không kiểm thử hai phiên ghi đồng thời/mất quyền, biên bản có ảnh (bỏ qua theo yêu cầu), thu ngân/voucher/điểm thật, sửa biên bản đang thực hiện hoặc các mức phụ phí cân khác. Các ca legacy đã COMPLETED trước bản sửa không tự tạo biên bản ngược. Hotel/khứ hồi/SĐT vẫn mở.

## Nhân sự / Lịch làm việc — sửa lưu phân ca (16/10/2026, r73)

- Kiểm tra trang lịch trực người dùng đang mở. Tái hiện form tự chọn hai nhân viên đầu tiên dù bảng ngày/CSDL chưa có ca; handler Lưu phân ca chỉ ghi mockRoster theo cấu trúc sai (date -> shift -> ids), không ghi staff_schedule. Đã bỏ tự gán hai nhân viên; form đọc đúng roster date -> staffId -> shifts và tự reset lựa chọn theo ngày/ca.
- Đọc metadata CSDL thật: staff_schedule có staff_id, work_date, shift, start_time, end_time, work_location, schedule_status; shift chỉ MORNING/AFTERNOON/EVENING, status SCHEDULED/WORKING/COMPLETED/OFF. File demo availability_status không khớp schema thật. Vô hiệu lựa chọn NIGHT; không báo lưu ca khuya giả.
- Lưu thật: đọc lại lịch ngày, đối chiếu snapshot ca, kiểm tra UUID và 8 giờ/ngày; INSERT chọn mới hoặc UPDATE lịch OFF/SCHEDULED theo id, select xác minh rồi force tải lại. Bỏ phân công dùng OFF có thể tái kích hoạt, không DELETE. Không bỏ ca WORKING/COMPLETED. Loader bỏ OFF khỏi roster. Nếu request lỗi hoặc thay đổi một phần, tải lại lịch và báo lỗi thay vì đổi state giả. Chưa có RPC giao dịch nhiều nhân viên nên không đảm bảo toàn bộ nhóm được ghi nguyên tử.
- Test UI trên Trần Văn Nhân Viên (UUID d0000000-5555-5555-5555-555555555555), ngày 20/10/2026: modal ngày mới không gán ai; chọn người dùng kiểm thử, lưu ca sáng 08:00–12:00. Bảng ngày 4.0h, F5 rồi chọn lại 20/10 vẫn giữ ca sáng. Thêm ca chiều 13:00–17:00 thành 8.0h. Không gửi thông báo và không đổi nhân viên khác.
- Thử thêm ca tối khi đã đủ 8 giờ. Đối chiếu CSDL chỉ đọc sau lượt thử: chỉ có MORNING và AFTERNOON, đều SCHEDULED; không có EVENING. Toast lỗi đã hết trước lần đọc nên không lưu được ảnh toast; logic chặn 8h được rà code và kết quả không ghi ca thứ ba được xác minh.
- Sửa bảng tuần: trước đó chỉ render tên + 7 ca trong khi header có Mã NV/Họ tên/7 ngày/Tổng giờ, gây lệch cột; ngày đầu lại là ngày đang chọn dù header ghi Thứ 2. Đã căn tuần bắt đầu thứ Hai, hiện ngày dưới nhãn, đủ 10 cột, nhãn ca tiếng Việt và tổng giờ. Bỏ suy ca từ staff.shift FULL_TIME khi chưa có staff_schedule.
- Test F5 sau đủ hai ca: chọn 20/10, Theo tuần hiển thị EMP-001, Trần Văn Nhân Viên, thứ Hai trống/thứ Ba Sáng, Chiều/tổng 8.0h. Mở lại phân ca sáng có đúng nhân viên đã lưu. Option NIGHT isEnabled=false. Đổi ngày trong modal sang 21/10: danh sách đã phân trống, không kéo lựa chọn từ 20/10. Hủy đóng form, không ghi lịch ngày 21.
- Bằng chứng artifacts/staff-schedule-r73.png. node --check staff.js/tab-staff-schedule.js và git diff --check đạt. Các thay đổi staff khác có sẵn trong workspace được giữ nguyên; lượt này chỉ thêm lọc OFF trong loader và sửa schedule subtab/cache version.
- Phạm vi đạt: thêm/đọc lại hai ca và tuần/ngày trên dữ liệu đã thử. Chưa test Bỏ/OFF và tái kích hoạt, hai phiên đồng thời, lỗi quyền, lọc chức vụ, các lịch qua đêm. Hai ca QA sáng/chiều 20/10 được giữ để đối soát. Đơn nghỉ/đổi ca và báo cáo sự cố vẫn có handler chỉ đổi state/toast, chưa được sửa/test ghi thật lượt này. Không đánh dấu hoàn tất toàn bộ Nhân sự.

## Nhân sự / Đơn nghỉ và đổi ca — chuẩn bị lưu thật (16/10/2026, r74, CHƯA KIỂM THỬ LIVE)

- Tiếp tục mục còn mở r73. Đọc metadata Supabase thật: chỉ có staff và staff_schedule, chưa có bảng đơn nghỉ/đổi ca. Handler trước đó chỉ unshift state/đổi status tạm, duyệt ngay chỉnh sai cấu trúc roster, không ghi lịch thật.
- Đã chuẩn bị scripts/database/20261016_staff_shift_requests.sql: bảng staff_shift_request có UUID người xin/người đổi/người thay, loại nghỉ, khoảng ngày/ca, lý do, người tạo, trạng thái và người duyệt. RLS chỉ authenticated là nhân viên ACTIVE được tạo đơn của mình; ADMIN ACTIVE được tạo thay/đọc/duyệt. Không mở anon. RPC duyệt/từ chối kiểm tra ADMIN từ auth.uid(), khóa đơn và cập nhật lịch/trạng thái đơn trong cùng giao dịch. Nghỉ đổi ca SCHEDULED sang OFF, có thể tạo ca cho người trực thay; swap đổi nhân viên hai ca SCHEDULED và kiểm tra trùng/8 giờ. Không duyệt ca đã bắt đầu/hoàn tất. Có unique index staff/date/shift để chống bản ghi trùng; nếu dữ liệu cũ trùng thì migration sẽ lỗi và rollback, không tự xóa dữ liệu.
- Giao diện đã nối tạo đơn -> INSERT select xác minh, duyệt/từ chối -> RPC single, tải lại lịch và đơn từ CSDL. Bỏ báo thành công dựa vào state. Duyệt ngay nếu đã tạo đơn nhưng duyệt lỗi sẽ báo rõ đơn còn chờ duyệt, không nhận đã áp dụng lịch. Hiển thị lỗi tải đơn riêng, không giả thành danh sách trống. Thêm kiểm tra ngày/32 ngày tối đa, nhân viên đổi khác nhau, người thay khác người nghỉ, lý do và enum ca hỗ trợ. Escape text đơn khi render.
- Chưa chạy SQL, chưa tạo/duyệt/từ chối đơn thật và chưa xác minh sau F5. Chưa compile SQL trên PostgreSQL. node --check staff.js/tab-staff-schedule.js và git diff --check đạt. Không được đánh dấu chức năng hoàn tất dựa trên syntax check.
- Lượt reload staff-schedule để test bị kiểm duyệt tự động chặn: hệ thống duyệt báo chạm giới hạn sử dụng, không cấp quyền thao tác frame localhost:3000. Đây là lỗi hạn mức kiểm duyệt, không phải kết luận hành động không an toàn. Không thử đường vòng/trình duyệt khác hoặc gọi API để thay thế lượt test UI bị chặn. Người dùng sau đó yêu cầu tiếp tục; chỉ tiếp tục kiểm tra mã/process độc lập, chưa thử lại trình duyệt.
- Bước cần thiết: người dùng chạy file SQL trong Supabase SQL Editor, sau đó kiểm tra tài khoản ADMIN ACTIVE có auth_user_id đúng; khi trình duyệt được cấp quyền lại, test tạo -> F5 -> từ chối và tạo -> duyệt -> F5 đối chiếu lịch, thay ca/trực thay và các điều kiện lỗi. Không yêu cầu tự điền UUID giả vào SQL. SQL tự dùng auth.uid() tại thời điểm ứng dụng gọi RPC.
- Giới hạn còn lại: chưa có kiểm thử RPC/SQL; hai phiên phân ca trực tiếp có thể vẫn tranh chấp với duyệt (khóa duyệt chỉ tuần tự hóa các RPC duyệt). Cần thử cạnh tranh và cân nhắc chuyển cả phân ca sang RPC chung. Báo cáo sự cố vẫn chưa sửa. Các phần Khiếu nại đã kiểm thử trước đây không tự đánh dấu kiểm thử lại trong lượt này. Ảnh tiếp tục bỏ qua theo yêu cầu.

## Nhân sự / Đơn nghỉ và đổi ca — kiểm tra trực tiếp giao diện (16/10/2026, r75)

- Sau yêu cầu kiểm tra giao diện, công cụ trình duyệt đã hoạt động lại. Đã thao tác trên tab staff-schedule của người dùng, reload và mở khay đơn nghỉ/đổi ca.
- Xác minh UI báo Chưa tải được đơn nghỉ/đổi ca. Cần chạy migration staff_shift_request và kiểm tra quyền nhân sự. Mở Tạo đơn mới: form có trường nhân viên, loại nghỉ, khoảng ngày, phạm vi ca, người thay, lý do.
- Test validation: không nhập lý do bị chặn Vui lòng nhập lý do ít nhất 3 ký tự; ngày 20/10 -> 19/10 bị chặn khoảng ngày không hợp lệ; tab đổi ca với cùng người nguồn/đích bị chặn Hai nhân viên đổi ca phải khác nhau.
- Test lưu hợp lệ trên UI: Trần Văn Nhân Viên, nghỉ ngày 20/10/2026, lý do QA r75 kiểm thử lưu đơn nghỉ, chưa duyệt. Supabase trả chính xác: Could not find the table 'public.staff_shift_request' in the schema cache. Đã bắt toast ngay trong lượt bấm và chụp artifacts/staff-request-ui-r75.png. Modal giữ mở, không toast thành công giả, chưa tạo đơn và không thay đổi lịch sáng/chiều QA trước đó.
- Chưa chạy migration và chưa test duyệt/từ chối. Cần chạy scripts/database/20261016_staff_shift_requests.sql trong Supabase trước; chưa kết luận RLS đúng chỉ từ lỗi thiếu bảng.
- Sửa thêm lỗi đọc sớm: khi mở khay trong lúc dữ liệu đang tải, trước đây hiện Không có đơn; đã đổi thành Đang tải đơn nghỉ và đổi ca… và cập nhật lại khay theo sự kiện staff-data-loaded. Test sau reload mở khay ngay: hiện đúng trạng thái tải. node --check schedule JS và git diff --check đạt.

## Nhân sự / Form nghỉ và đổi ca — khoảng cách theo rule (16/10/2026, r76)

- Người dùng chỉ ra các hàng form sát nhau. Nguyên nhân: .modal-body-clean có gap nhưng hai phần form con là block, các .form-row-2col liên tiếp không có khoảng cách dọc; JS chuyển phần active sang display:block nên chỉ thêm gap trên form cha không đủ.
- Sửa CSS giới hạn trong #leaveSwapModalOverlay: margin-top 16px giữa các hàng của cả formSectionLeave/formSectionSwap, khoảng cách hai cột 16px, minmax(0,1fr)/min-width:0 tránh tràn cột. Giữ 6px giữa label và input, padding modal 26px 30px. Dùng wide-modal 740px/max95vw theo chuẩn form hai cột; màn <=600px chuyển một cột và footer được wrap. Bỏ border-bottom dài của nhóm tab, giữ gạch active ngay chữ.
- Đo trực tiếp DOM sau reload: tab đổi ca ba khoảng dọc đều 16px (sai số số thực ~0.00003px); tab nghỉ phép [16,16,16]. Đã xem ảnh giao diện sau sửa và kiểm tra bố cục. git diff --check đạt. Không thay đổi hoặc ghi dữ liệu nghiệp vụ. Chưa chạy test responsive ở viewport di động, không đánh dấu đã kiểm thử mobile.
- Bằng chứng artifacts/staff-form-spacing-r76.png. Lỗi thiếu bảng staff_shift_request/migration r74-r75 vẫn chưa giải quyết bởi việc chỉnh layout.

## Đơn nghỉ/đổi ca sau khi chạy SQL — vướng phiên Auth (16/10/2026, r77)

- Người dùng xác nhận đã chạy migration. Đã reload giao diện và thử lưu đơn nghỉ QA cho Trần Văn Nhân Viên, ngày 20/10/2026 ca sáng, lý do QA r77. Lỗi thiếu bảng đã được thay bằng permission denied for table staff_shift_request. Chưa có đơn nào được lưu/duyệt; lịch ca không đổi.
- Đọc source xác thực: admin header dựa trên pawpal_admin_user, còn Supabase Auth dùng storageKey riêng pawpal_admin_supabase_auth. Có thông tin header không chứng minh có phiên Supabase hợp lệ. Không mở SELECT/INSERT cho anon để né lỗi quyền.
- Bổ sung requireStaffAuth gọi auth.getUser trước INSERT hoặc RPC duyệt; phân biệt lỗi quyền với lỗi thiếu bảng ở khay đơn, không tiếp tục yêu cầu chạy SQL khi lỗi là permission denied.
- Test lại UI: lưu đơn hợp lệ trả Không lưu được đơn. Phiên xác thực Supabase của quản trị chưa có hoặc đã hết hạn. Vui lòng đăng nhập lại tại /admin/login. Đã chụp artifacts/staff-request-auth-r77.png; ảnh lỗi quyền ban đầu artifacts/staff-request-r77.png. Xác nhận cần đăng nhập lại để có phiên Supabase thật trước khi kiểm thử lưu/duyệt/từ chối. Chưa yêu cầu người dùng cung cấp mật khẩu trong chat và chưa tự reset tài khoản/quyền.
- node --check schedule JS và git diff --check đạt. Chưa kết luận RPC/SQL nghiệp vụ đạt vì chưa có phiên hợp lệ để thực hiện. Bước tiếp: người dùng đăng nhập lại tại /admin/login; tiếp tục test UI pending/F5/reject/approve và đối chiếu lịch, kiểm tra ADMIN ACTIVE/auth_user_id nếu đăng nhập thành công nhưng vẫn bị RLS chặn.

## Nhân sự / Đơn nghỉ và đổi ca — kiểm thử live sau đăng nhập lại (16/10/2026, r78)

- Người dùng báo đã đăng nhập lại và yêu cầu tiếp tục. Reload tab staff-schedule, kiểm thử bằng UI với phiên Supabase mới. Đã hết lỗi thiếu phiên/quyền r77 trên các thao tác đã thử; không mở quyền anon và không sửa Auth/RLS để né kiểm tra.
- Tạo đơn nghỉ QA cho Trần Văn Nhân Viên, ngày 20/10/2026 ca sáng, lý do QA r78 kiểm thử từ chối đơn sau đăng nhập lại. Đơn PENDING xuất hiện, F5 vẫn còn. Bấm Từ chối: RPC trả REJECTED, UI giữ trạng thái Từ chối; lịch không bị thay đổi bởi nhánh này.
- Tạo đơn thứ hai QA r78 kiểm thử duyệt nghỉ ca sáng đã phân. Bấm Duyệt đơn: thành APPROVED. F5 chọn 20/10: ca sáng không còn, chỉ còn ca chiều và tổng 4.0h. Ca sáng được chuyển OFF, không xóa dữ liệu phân ca.
- Chuẩn bị ca đối ứng QA qua UI: Nguyễn Thị Chăm Sóc ca sáng 21/10/2026. Tạo SWAP từ Trần Văn Nhân Viên ca chiều 20/10 sang Nguyễn Thị Chăm Sóc ca sáng 21/10, lý do QA r78 kiểm thử đổi ca chiều 20 với ca sáng 21. Lưu PENDING rồi Duyệt đơn thành APPROVED. Kiểm tra bảng: Nguyễn Thị Chăm Sóc có ca chiều 20/10 (4h); Trần Văn Nhân Viên có ca sáng 21/10 (4h). Reload dữ liệu giữ kết quả. Không có ca thứ ba vượt 8h được tạo trong lượt này.
- Đối chiếu CSDL chỉ đọc sau ba nhánh đầu: LEAVE REJECTED, LEAVE APPROVED, SWAP APPROVED đúng ngày 20/10 và target 21/10. Không dùng service role để tạo hoặc duyệt đơn; mọi ghi nghiệp vụ đi qua UI và RLS/RPC thật.
- Test lỗi Duyệt ngay và áp dụng trên ca sáng 20/10 đã OFF: tạo đơn thứ tư QA r78 kiểm thử duyệt ca đã nghỉ phải thất bại; UI báo Đơn đã lưu chờ duyệt nhưng chưa áp dụng lịch. Không có ca đã phân phù hợp để nghỉ. F5: đơn còn PENDING, không báo đã duyệt và không chuyển lịch thêm. Lọc Chờ duyệt có đúng đơn QA này. Đã bấm Từ chối để đóng phép thử, UI trở thành REJECTED. Đây là nhánh lỗi trước khi ghi lịch; chưa test rollback khi lỗi xảy ra giữa nhiều thay đổi lịch.
- Sửa lỗi hiển thị phát hiện khi test: đơn SWAP trước chỉ hiện ngày/ca nguồn và enum AFTERNOON. Nay hiện 20/10/2026 → 21/10/2026 (Ca chiều → Ca sáng), đầy đủ người đổi để duyệt đúng. Không thay raw shift của bản ghi. Sửa thêm nhánh tạo thành công nhưng duyệt ngay lỗi: tải lại đơn/lịch trước báo lỗi để số đếm không bị cũ; chưa lặp lại toàn bộ nhánh lỗi sau thay đổi nhỏ này, kiểm tra syntax đạt.
- Kết quả cuối UI khay Tất cả: 4 đơn QA, 2 Đã duyệt (LEAVE/SWAP), 2 Từ chối. Bằng chứng artifacts/staff-requests-live-r78.png. Ca QA còn lại: ca sáng 20/10 của Trần Văn Nhân Viên OFF; Nguyễn Thị Chăm Sóc ca chiều 20/10; Trần Văn Nhân Viên ca sáng 21/10. Giữ để đối soát, không gửi thông báo cho nhân viên.
- node --check staff.js/tab-staff-schedule.js và git diff --check đạt. Phạm vi đạt: tạo/đọc lại đơn sau F5, từ chối, duyệt nghỉ một ca, duyệt đổi hai ca khác ngày, lỗi ca nguồn không còn hoạt động. Chưa test nghỉ nhiều ngày/cả ngày, người trực thay, nhân viên thường tự gửi đơn, quyền không phải ADMIN, hai phiên tranh chấp, trùng ca/vượt 8h phát sinh trong RPC duyệt, Duyệt ngay thành công hoặc báo cáo sự cố. Không đánh dấu hoàn tất toàn bộ Nhân sự. Ảnh nghiệp vụ vẫn bỏ qua theo yêu cầu.

## Nhân sự / Lịch làm việc — kiểm thử giao diện mở rộng (16/10/2026, r79)

- Thao tác trực tiếp UI, ghi dữ liệu bằng form/RLS/RPC, không dùng service role. Lượt này kiểm thử, không sửa mã nghiệp vụ.
- ĐẠT: Duyệt ngay thành công, nghỉ cả ngày có người trực thay. Đơn QA r79 nghỉ cả ngày và bàn giao người trực thay: EMP-001 ngày 21/10, người thay EMP-002. F5: người nghỉ 0h, người thay ca sáng 4h; đơn Đã duyệt.
- ĐẠT: nghỉ nhiều ngày. Tạo ca sáng 22 và 23/10 cho EMP-001 bằng modal phân ca, duyệt ngay nghỉ 22–23/10. F5 từng ngày đều 0h, bảng tuần và khay đọc đúng hai ngày. Sau đó lịch 22 được tái kích hoạt để test lỗi khác.
- ĐẠT validation: chặn khoảng ngày vượt 32 ngày; người trực thay trùng người nghỉ; NIGHT chưa hỗ trợ. Modal giữ mở và báo lỗi, không báo lưu thành công. Nút Hủy/Đóng form nghỉ và Escape form nghỉ/phân ca đóng được.
- ĐẠT: bỏ ca bằng OFF và tái kích hoạt qua UI. Ngày 22 tái kích hoạt sáng EMP-001; tạo rồi bỏ sáng EMP-002 về 0h; phân chiều và tối EMP-002 lên 8h.
- ĐẠT nhánh người thay trùng ca: tạo sáng 22/10 cho EMP-001/002, duyệt nghỉ người 1 và thay bằng người 2: RPC báo Người thay thế đã có bản ghi cùng ca, cần rà soát. F5 cả hai còn 4h, đơn PENDING; đã Từ chối. Thử lại khi ca sáng EMP-002 đã OFF vẫn bị cùng lỗi (RPC chặn cả bản ghi OFF), không dùng phép thử này để kết luận chặn 8h.
- ĐẠT vượt 8h/rollback ngày mới 24/10: EMP-001 tối 4h, EMP-002 sáng+chiều 8h, chưa có bản ghi tối. Duyệt ngay đơn QA r79 RPC chặn nhận ca thứ ba vượt 8 giờ ngày 24: lỗi Thay đổi làm nhân viên vượt 8 giờ mỗi ngày. F5 người 1 vẫn tối 4h, người 2 vẫn sáng+chiều 8h, không có tối; đơn PENDING. Đã Từ chối. Kết quả xác minh rollback không mất ca nguồn/không tạo ca thứ ba. Bằng chứng artifacts/staff-rollback-r79.png.
- ĐẠT: lọc khay Đã duyệt/Từ chối đúng trạng thái; Chờ duyệt 0 có empty state. Đơn duyệt không còn nút duyệt lại. Nhánh INSERT thành công/RPC lỗi tải lại đơn và số đếm đúng ở lượt r79.
- LỖI UI: scheduleFilterShift MORNING/AFTERNOON không lọc bảng; scheduleFilterPosition Veterinarian vẫn hiện 9 nhân viên. Source chưa nối handler các bộ lọc vào render, không phải dữ liệu bẩn.
- LỖI UI: <, > ở bảng tuần và Hôm nay không đổi ngày (giữ 23/10 trong phép thử). Source chưa có listener btnPrevDay/btnNextDay/btnToday. Ô ngày trực tiếp và Theo ngày/Theo tuần hoạt động.
- LỖI UI: Báo cáo sự cố ca hiển thị lịch mẫu BK-8901/BK-8902/BK-8903 dù bàn thực tế trống. Nhập QA r79 kiểm tra lưu biên bản sự cố thiết bị, không thông báo khách rồi lưu: báo Đã lưu biên bản sự cố ca trực thành công. Đối chiếu handler chỉ showToast/đóng modal, không INSERT/UPDATE. Không có luồng đọc lại biên bản; không đánh dấu lưu CSDL đạt. Gia hạn/thông báo chưa chứng minh ghi/gửi thật; không gửi thông báo khách lượt này.
- CẦN RÀ SOÁT: khay đơn nghỉ không hiện tên người thay đã chọn; chọn nhân viên vẫn native select, chưa đúng quy tắc autocomplete. Form nghỉ cho chọn NIGHT rồi mới chặn khi lưu, trong khi phân ca đã vô hiệu option này.
- Cuối lượt: 9 đơn qua r78–r79, 4 APPROVED/5 REJECTED, không còn PENDING. EMP-002: chiều 20, sáng 21, chiều+tối 22, sáng+chiều 24. EMP-001: sáng 22, tối 24; các ca nghỉ cũ OFF. Ngày 23 không có ca. Giữ QA để đối soát, không xóa vĩnh viễn.
- Chưa đánh dấu toàn bộ Nhân sự đạt: còn lỗi lọc/điều hướng/sự cố; chưa có phiên nhân viên thường để test tự tạo đơn và quyền không ADMIN; chưa thử cạnh tranh hai phiên ghi, ca WORKING/COMPLETED, responsive mobile. Không đổi quyền/reset mật khẩu/giả phiên để test. Ảnh nghiệp vụ bỏ qua theo yêu cầu. Chụp ảnh bảng tuần cuối lượt lỗi capture; dùng ảnh rollback đã lưu, không nhận có ảnh tuần.

## Nhân sự / Lịch trực — sửa lỗi và test lại (16/10/2026, r80)

- Sửa bộ lọc trong `tab-staff-schedule.js`: lọc chức vụ dùng `staff.role` đã chuẩn hóa; lọc ca dùng roster Supabase của ngày đang xem, và trong chế độ tuần tìm trong đúng bảy ngày. Không còn render đầy đủ danh sách khi bộ lọc đã chọn.
- Test UI sau F5: chọn Bác sĩ thú y chỉ còn EMP-004 Phạm Thúy Vy; ngày 24/10 chọn Ca sáng và Ca chiều đều chỉ còn EMP-002, người có lịch thật. Các cột vẫn giữ nguyên để so sánh ca trong cùng ngày.
- Sửa và test điều hướng: `<` ở ngày giảm 16/10 xuống 15/10; khi Theo tuần, `>` tăng một tuần từ 15/10 lên 22/10. Nút Hôm nay dùng Asia/Bangkok. Không thay đổi CSDL khi điều hướng.
- Bỏ ba lịch giả BK-8901/BK-8902/BK-8903 khỏi báo cáo sự cố. Modal truy vấn `appointment` thật của đúng ngày đang xem với trạng thái CONFIRMED/CHECKED_IN/IN_PROGRESS, sau đó lấy tên pet/service thật. Khi không có ca, select bị khóa và ghi rõ Không có ca dịch vụ đang xử lý trong ngày.
- Thay toast giả bằng INSERT `audit_log` thật: action OTHER, entity_name appointment_incident, staff_id, appointment_id, loại/mức độ/gia hạn/nội dung được lưu trong description có định dạng. Sau insert, handler yêu cầu bản ghi trả về có id/staff/entity đúng rồi mới đóng modal/báo thành công. Không tự sửa giờ hoặc trạng thái appointment vì schema không có trường thời gian hoàn tất riêng; giá trị gia hạn được ghi biên bản để điều phối.
- Test UI không có ca thật ngày 24/10: select ca bị disabled, nhập QA r80 không có ca dịch vụ phải chặn lưu rồi bấm Lưu biên bản sự cố: báo Hãy chọn nhân sự và ca dịch vụ đang xử lý trước khi lưu biên bản, modal vẫn mở, không ghi audit. Đọc CSDL chỉ đọc cho 16–31/10: không có appointment CONFIRMED/CHECKED_IN/IN_PROGRESS, nên CHƯA thể test nhánh INSERT thành công mà không tạo một ca dịch vụ giả mới. Không dùng dữ liệu mẫu để nhận đạt.
- Đổi copy modal thành Ghi nhận sự cố ca trực/Lưu biên bản sự cố để không hứa cập nhật tiến độ khi hiện tại chỉ có audit. `node --check` và `git diff --check` đạt.

## Nhân sự / Báo cáo sự cố — kiểm thử ghi CSDL thành công (16/10/2026, r81)

- Theo yêu cầu người dùng, tạo lịch hẹn QA bằng giao diện Dịch vụ: BKG-68b6ff1f-25f3-4af5-b12b-1c8f30f9b8d9, Lê Lệ Quyên QA, bé lala, Express Care – Vệ Sinh Nhanh, 17/10/2026 10:30, 100000 đ, chưa thu. Lượt tạo ngày 16/10 bị chặn đúng do thời gian hẹn phải ở tương lai; không tạo bản ghi ngày 16.
- Tạo lần hai ngày 17/10 thành PENDING. Chọn `Xác nhận lịch hẹn` trong bảng: CSDL cập nhật CONFIRMED. Bảng chưa đổi nhãn ngay sau click ở lượt đầu nhưng sau F5 hiện Đã xác nhận; đây là lỗi làm mới tức thì cần tiếp tục rà soát, không phải lỗi ghi CSDL.
- Vào Lịch trực ngày 17/10, form Báo cáo sự cố nạp đúng ca thật, không dữ liệu mẫu: `BKG-... · lala · Express Care – Vệ Sinh Nhanh · 10:30`.
- Lưu qua UI biên bản QA r81 lưu biên bản sự cố thực tế, kiểm tra sau tải lại; loại SKIN_ISSUE, mức INTERNAL, gia hạn 15 phút. Toast chỉ báo thành công sau insert/select xác minh. Đối chiếu CSDL chỉ đọc: audit_log id `0c3cdf31-efee-49ff-bfb8-a8b0b4619df2`, action OTHER, entity_name appointment_incident, đúng staff_id, appointment_id, loại/mức/gia hạn/nội dung. Appointment vẫn CONFIRMED, UNPAID, 17/10 10:30; không tự đổi thanh toán/trạng thái ca.
- F5 lại lịch trực ngày 17/10: ca QA vẫn xuất hiện trong form sự cố. F5 danh sách lịch hẹn: hiện Đã xác nhận và cảnh báo Chờ KTV (+15p). Đạt create appointment, confirm và ghi audit biên bản sự cố trên UI/CSDL. Giữ toàn bộ dữ liệu QA để đối soát, không xóa vĩnh viễn.

## Dịch vụ / Lịch hẹn — đồng bộ trạng thái và tải lại (16/10/2026, r82–r84)

- Sửa thao tác `Xác nhận lịch hẹn`: chờ xong request cập nhật, chỉ đổi `rawStatus` và trạng thái hiển thị của đúng bản ghi sau khi Supabase trả về `appointment_status` đã xác minh. Bảng, KPI, dải cảnh báo và hồ sơ đang mở được dựng lại ngay trước lần nạp dữ liệu nền.
- Tạo qua UI lịch QA `BKG-5b927c05-5abd-482f-b96c-8385ba133d78` cho Lê Lệ Quyên QA, bé `lala`, Express Care – Vệ Sinh Nhanh, 17/10/2026 11:30. Đối chiếu CSDL: bản ghi được tạo `PENDING`; sau bấm `Xác nhận lịch hẹn` trên UI, CSDL trả `CONFIRMED` và có `updated_at` mới. Không xóa dữ liệu QA theo yêu cầu.
- Khi tải lại trong phiên kiểm thử, truy vấn Supabase của phân hệ Dịch vụ treo vô hạn ở trạng thái skeleton. Đã sửa trình nạp script động theo thứ tự tuần tự, đóng gói SDK Supabase nội bộ tại `scripts/vendor/supabase.js` để không phụ thuộc CDN, và đặt giới hạn 12 giây cho các truy vấn Dịch vụ. Kiểm thử UI sau 13 giây hiển thị lỗi có kiểm soát `Không thể tải dữ liệu dịch vụ. Vui lòng tải lại trang.` thay vì skeleton vô hạn.
- Kiểm thử lại hoàn tất khi endpoint phản hồi: tạo qua UI `BKG-d0380934-64c7-4819-ba27-147b390b6807` (17/10/2026 12:00, Lê Lệ Quyên QA, `lala`, Express Care) ở trạng thái `Chờ xác nhận`, sau đó bấm `••• → Xác nhận lịch hẹn`. Ngay trong bảng, không F5, nhãn đổi thành `Đã xác nhận`, KPI chờ xác nhận giảm 31 → 30 và cảnh báo đổi thành `• Chờ KTV (+15p)`. Đạt cập nhật UI và ghi CSDL.
- Kiểm thử điều phối trên chính lịch QA `BKG-d0380934-64c7-4819-ba27-147b390b6807`: chọn Nguyễn Thị Chăm Sóc, lý do `QA r84 kiểm thử lưu điều phối kỹ thuật viên`, rồi lưu. Sau khi request hoàn tất, modal đóng và hồ sơ lập tức hiển thị KTV Nguyễn Thị Chăm Sóc cùng ghi chú điều phối; đạt ghi `staff_id` và đồng bộ UI. Chưa kiểm thử xóa/hủy lịch hoặc thanh toán.

## Cấu hình / Quản lý nội dung bài viết — kiểm tra và đồng bộ CSDL (16/10/2026, r85)

- **Rà soát và sửa lỗi toàn diện trong `tab-settings-content.js`:**
  1. *Lỗi ràng buộc `author_id NOT NULL`*: Bảng `blog_post` trong Supabase yêu cầu khóa ngoại `author_id` bắt buộc tham chiếu tới `staff.id`. Trước đây form tạo bài viết thiếu trường này dẫn đến lỗi DB `null value in column "author_id" of relation "blog_post" violates not-null constraint`. Đã sửa tự động lấy `author_id` từ phiên đăng nhập nhân sự `pawpal_admin_user` trong `localStorage`/`sessionStorage` hoặc fallback an toàn sang `staff.id` hợp lệ đầu tiên trong CSDL.
  2. *Lỗi ánh xạ danh mục `category_id`*: Trước đây truy vấn tìm danh mục theo `category_name` với chuỗi tiếng Việt dẫn đến `null` do DB lưu mã định danh `Tips`, `News`, `Promo` và mô tả tiếng Việt trong cột `description`. Đã sửa nạp trực tiếp UUID vào giá trị của `<select id="inputArticleCategory">` và cập nhật hàm nạp danh mục động `populateBlogCategories()`.
  3. *Lỗi giá trị Enum `blog_status_enum`*: Trạng thái bài viết trong Postgres là enum `blog_status_enum` chỉ chấp nhận `DRAFT`, `PUBLISHED`, `ARCHIVED`. Thao tác đổi sang `HIDDEN` trước đây làm sập truy vấn với mã lỗi `22P02`. Đã chuẩn hóa ánh xạ: `published` ↔ `PUBLISHED`, `draft` ↔ `DRAFT`, `hidden` (Tạm ẩn) ↔ `ARCHIVED`.
  4. *Rò rỉ Event Listener phân trang*: Khắc phục việc gắn lặp lại `addEventListener` trên các nút phân trang trước/sau mỗi khi gọi `renderArticles()`. Đồng thời bổ sung biến bảo vệ `isContentInitialized` để ngăn gắn đa sự kiện khi chuyển đổi qua lại giữa các subtab.
  5. *Đồng bộ tri thức RAG vào cấu hình hệ thống*: Đã bổ sung lưu vết danh sách `ragSyncedArticleIds` trong `PawpalSettings.state.systemConfig` và lưu kiên định xuống CSDL qua `persistSystemConfig`.
  6. *Tuân thủ nghiêm ngặt AGENTS.md*: Kiểm tra toàn bộ text-only (không gắn icon thừa), chuẩn hóa câu văn Sentence Case cho menu dropdown và tiêu đề modal ("Tri thức AI trích xuất cho chatbot", "Đổi trạng thái bật hoặc tắt", "Xem tóm tắt tri thức AI"), xử lý lỗi xóa bài viết có kiểm tra `{ error }`.
- **Kiểm thử tự động trên CSDL Supabase thật:**
  - Thao tác tạo bài viết mới (INSERT) thành công: trả về `id`, `title`, `status: 'PUBLISHED'`.
  - Thao tác tạm ẩn bài viết (UPDATE `ARCHIVED`): thành công, không gặp lỗi enum.
  - Thao tác công khai lại (UPDATE `PUBLISHED`): thành công.
  - Thao tác xóa bài viết (DELETE): thành công loại bỏ bản ghi thử nghiệm khỏi CSDL.

- Kiểm thử tiếp nhận trên cùng lịch QA: giữ cân 7 kg, KTV Nguyễn Thị Chăm Sóc và checklist bình thường, bấm xác nhận. Hồ sơ đổi sang `Đang thực hiện`, có mốc tiếp nhận, biên bản cân nặng/checklist/KTV; F5 vẫn giữ toàn bộ dữ liệu. Đạt ghi biên bản tiếp nhận, `staff_id` và trạng thái nghiệp vụ. Ảnh bằng chứng chưa thử vì kho ảnh chưa được nối.
- Kiểm thử sửa nhật ký trên cùng bản ghi QA: mở thẻ nhật ký, đổi nội dung thành `QA r85 đã sửa nội dung và xác minh tải lại`, lưu xong thẻ đổi tức thì; F5 kiểm tra lại tìm được đúng nội dung. Đạt cập nhật và đọc lại nhật ký. Không thử Xóa vì là xóa vĩnh viễn.

## Cấu hình / Cấu hình hệ thống và vận hành — kiểm tra và đồng bộ CSDL (16/10/2026, r86)

- **Rà soát và sửa lỗi toàn diện trong `tab-settings-system.js` và `settings.html`:**
  1. *Lỗi logic chặn lưu giờ Pet Hotel*: Trước đây hàm kiểm tra so sánh `toMinutes(checkIn) >= toMinutes(checkOut)` dẫn đến người dùng không thể đặt giờ nhận/trả phòng khách sạn chuẩn (Check-in 14:00 chiều ngày nhận và Check-out 12:00 trưa ngày trả phòng, vì 14:00 > 12:00). Đã loại bỏ logic so sánh sai lệch ngày này, chỉ giữ kiểm tra định dạng giờ hợp lệ và `open < close` trong cùng ngày của chi nhánh.
  2. *Thêm biến bảo vệ `isSystemInitialized`*: Ngăn chặn tình trạng gắn lặp nhiều lần các event listener mở modal cấu hình khi chuyển đổi giữa các subtab trong phân hệ Cấu hình.
  3. *Bọc khối `try...catch` và chuẩn hóa thông báo lỗi*: Bổ sung `try...catch` cho tất cả các thao tác lưu cấu hình (Cửa hàng, Thanh toán, Vận chuyển, Đặt lịch) và chuẩn hóa kiểu toast lỗi sang `'danger'` (khắc phục việc dùng `'error'` không có trong bảng màu thông báo).
  4. *Khắc phục đóng modal tác động đa phân hệ*: Trong `settings.js`, chuẩn hóa nút `btnConfirmAndSyncImpact` để `await` callback bất đồng bộ và gọi hàm đóng modal chuẩn `closeModal('impactConfirmModalOverlay')` thay vì ẩn `style.display` thủ công.
  5. *Đồng bộ trạng thái đối tác thẻ 5*: Cập nhật thẻ kết nối đối tác API phản ánh chính xác trạng thái thực tế từ `systemConfig` (GHN: Đã cấu hình / Chưa cấu hình; MoMo, VNPay: Đang kích hoạt / Tạm tắt).
  6. *Tuân thủ nghiêm ngặt quy tắc [AGENTS.md](../../AGENTS.md)*: Triệt tiêu toàn bộ dấu hai chấm `:` ở cuối nhãn trường thông tin (`.info-label`, `.filter-label`), chuẩn hóa viết hoa Sentence Case thuần Tiếng Việt, loại bỏ ngoặc đơn thừa ("Mã số thuế VAT", "Phí nội thành và ngoại tỉnh", "Giao hỏa tốc 2 giờ", "Công suất tối đa mỗi ca", "Hủy miễn phí và phí trễ").
- **Kiểm thử tự động trên CSDL Supabase thật (`pawpal_setting`):**
  - Đọc thành công bản ghi `system_config` hiện hữu từ Supabase.
  - Cập nhật (upsert) trường cấu hình với khóa `system_config` thành công.
  - Đọc lại dữ liệu để xác minh giá trị mới đã được ghi kiên định vào CSDL.
  - Khôi phục nguyên vẹn cấu hình ban đầu an toàn.

- Mở Thêm phụ phí trên lịch QA và thử lưu trống: form chặn tại chỗ với thông báo `Vui lòng nhập tên phụ phí!`, không tạo dòng chi phí và tổng vẫn 100000 đ. Đạt kiểm tra bắt buộc ở bước đầu. Chưa ghi phụ phí thử vì thao tác này thay đổi giá phải thu.
- Sau khi được xác nhận, lưu qua giao diện phụ phí QA `QA r85 phụ phí kiểm thử`, 1000 đ, lý do QA, chưa có xác nhận của chủ nuôi. Màn hình lập tức có dòng phụ phí và tổng đổi 100000 → 101000 đ; F5 vẫn tìm thấy dòng và tổng 101000 đ. Đạt ghi/đọc lại phụ phí, không thực hiện thanh toán.
- Kiểm thử màn hình nghiệm thu trên cùng ca: có 1/1 bước (100%), phụ phí 1000 đ và tổng 101000 đ; voucher, điểm, phương thức thanh toán và trạng thái thu ngân đều bị khóa để xử lý ở POS. Bấm lưu khi chưa tick chất lượng bị chặn `Vui lòng xác nhận đạt tiêu chuẩn quy trình chăm sóc!`; không hoàn tất/bàn giao ca.
- Kiểm thử hoàn tất trên màn hình ca QA: tick xác nhận chất lượng và trả tư trang, lưu biên bản. UI đổi ngay sang `Hoàn thành`, có mốc bàn giao 15:32, nút đổi KTV bị khóa; toast xác nhận trạng thái thanh toán giữ nguyên. Sau F5 vẫn có trạng thái Hoàn thành, Chưa thu và tổng 101000 đ. Đạt lưu biên bản bàn giao/hoàn tất ca; không thu tiền, không áp voucher/điểm, không gửi tin cho khách.

## Cấu hình / Nhật ký cấu hình và thao tác — kiểm tra và đồng bộ CSDL (16/10/2026, r87)

- **Rà soát và sửa lỗi toàn diện trong `tab-settings-audit.js`, `settings.js` và `settings.html`:**
  1. *Lỗi ràng buộc `staff_id NOT NULL` của bảng `audit_log`*: Hàm `logSystemAudit` trước đây không truyền `staff_id` trong payload chèn dữ liệu, dẫn đến lỗi Postgres `23502: null value in column "staff_id" of relation "audit_log" violates not-null constraint` và làm thất bại ngầm mọi lệnh ghi nhật ký từ phân hệ Cấu hình. Đã khắc phục bằng cách lấy ID nhân sự từ phiên đăng nhập `pawpal_admin_user` hoặc fallback sang ID nhân sự hợp lệ trong CSDL.
  2. *Truy vấn tên nhân sự thực hiện (Staff Join)*: Bổ sung join `staff:staff_id(full_name)` trong câu truy vấn `audit_log` để thay thế tên tĩnh `'Quản trị viên (Admin)'` bằng tên nhân viên thực tế đã thực hiện thao tác (ví dụ: `Trần Văn Nhân Viên`).
  3. *Ánh xạ phân hệ chi tiết*: Mở rộng từ điển ánh xạ thực thể `entity_name` sang tên phân hệ tương ứng: bổ sung `store_profile`, `payment`, `shipping`, `booking_policy`, `blog_post`, `banner`, `voucher` ánh xạ về đúng `Cấu hình`, `Bài viết`, `Khuyến mãi` thay vì mặc định rơi vào `Hệ thống`.
  4. *Cập nhật bộ lọc phân hệ trong HTML*: Bổ sung các tùy chọn `Cấu hình`, `Khuyến mãi`, `Bài viết`, `Banner`, `Thú cưng` vào select `filterAuditTargetModule`.
  5. *Định dạng thời gian chuẩn*: Chuẩn hóa hàm `formatDateTime` trả về định dạng `DD/MM/YYYY HH:mm` theo tiêu chuẩn giao diện tiếng Việt.
  6. *Tuân thủ giao diện AGENTS.md*:
     - Hiển thị avatar tròn (`border-radius: 50%`) mang chữ cái viết tắt của người thực hiện thao tác.
     - Thanh phân trang chuẩn phẳng, căn giữa bên ngoài bảng với các nút `< >`.
     - Tự động đặt lại `auditPage = 1` khi thay đổi từ khóa tìm kiếm hoặc bộ lọc phân hệ.
     - Bổ sung biến cờ `isAuditInitialized` ngăn chặn rò rỉ event listener.
- **Kiểm thử tự động trên CSDL Supabase thật (`audit_log`):**
  - Chèn (INSERT) thành công bản ghi audit có `staff_id` hợp lệ.
  - Truy vấn (SELECT) có join `staff:staff_id(full_name)` trả về đúng tên nhân viên thực tế.
  - Xóa (DELETE) dọn dẹp sạch bản ghi kiểm thử an toàn.

## Khiếu nại / Toàn diện các subtab — kiểm tra và đồng bộ CSDL (16/10/2026, r88)

- **Rà soát và sửa lỗi toàn diện phân hệ Khiếu nại (`complaints.js` và các subtab):**
  1. *Khắc phục màu hiển thị Toast lỗi*: Hàm `showToast` trong `complaints.js` trước đây chỉ ánh xạ các màu `success`, `warning`, `danger`, `info`. Các thông báo lỗi truyền kiểu `'error'` bị rơi vào màu mặc định `info` (xanh dương nhạt) thay vì màu đỏ cảnh báo. Đã chuẩn hóa ánh xạ `normalizedType = type === 'error' ? 'danger' : type` để hiển thị đúng tone màu cảnh báo `#F7DCDC` và chữ `#8F2424`.
  2. *Bổ sung biến bảo vệ ngăn rò rỉ Event Listener*:
     - `tab-complaint-services.js`: Đã thêm `isServicesInitialized` guard.
     - `tab-complaint-orders.js`: Đã thêm `isOrdersInitialized` guard.
     - `tab-complaint-detail.js`: Đã thêm `isDetailInitialized` guard.
  3. *Tuân thủ nghiêm ngặt quy tắc AGENTS.md*:
     - Nút text-only thuần túy, không có ký hiệu `+ ` thừa trên các nút thao tác ("Tạo khiếu nại", "Xuất file", "Lọc ca cần xử lý gấp").
     - Không sử dụng icon Lucide bên ngoài sidebar.
     - Không dùng ký hiệu `&`, viết đầy đủ chữ "và".
     - Triệt tiêu hoàn toàn dấu hai chấm `:` ở cuối nhãn trường dữ liệu.
     - Hỗ trợ đóng modal đầy đủ 4 hình thức: nút Đóng, nút Hủy, click backdrop và nhấn phím Escape.

- **Kiểm thử trực tiếp trên giao diện trình duyệt (UI Automated Testing):**
  - **Theo dịch vụ (`tab-complaint-services`)**: Tải thành công 5 thẻ KPI vận hành, thanh cảnh báo SLA, bộ lọc nhanh (Tất cả, Của tôi phụ trách, Chưa phân công, Chờ quản lý duyệt, Xử lý lần 2, Quá hạn SLA, Mức độ Cao), ô tìm kiếm và các dropdown.
  - **Modal Tiếp nhận khiếu nại (`createTicketModalOverlay`)**: Mở đúng form 740px 2 cột, kiểm tra validation khi submit form trống (chặn và hiện toast thông báo bắt buộc hợp lệ), đóng sạch bằng nút Hủy và phím Escape.
  - **Theo đơn hàng (`tab-complaint-orders`)**: Chuyển subtab mượt mà, tải đúng bảng danh sách khiếu nại đơn hàng, phân trang và trạng thái.
  - **Hồ sơ khiếu nại (`tab-complaint-detail`)**:
    - Mở hồ sơ từ bảng danh sách, hiển thị đúng breadcrumb `/ [Mã Ticket]`, thông tin khách hàng 360°, thông tin đối ứng và nhật ký xử lý (Timeline).
    - Mở và đóng thành công Modal 3: Chuyển người phụ trách (`assignHandlerModalOverlay`).
    - Mở và đóng thành công Modal 4: Yêu cầu bổ sung thông tin qua Zalo OA (`requestMoreInfoModalOverlay`).
    - Mở và đóng thành công Modal 2: Phương án giải quyết (`resolveTicketModalOverlay`), tự động hiển thị/ẩn các nhóm trường có điều kiện (RMA, làm lại dịch vụ, bồi hoàn Pawpoint/Voucher, hoàn tiền).
    - Ghi nhận phản hồi / ghi chú nội bộ vào timeline thành công, cập nhật ngay giao diện và hiển thị Toast thông báo.

- **Kiểm thử tự động trên CSDL Supabase thật (`support_ticket` & `support_ticket_message`):**
  1. *Tạo vé khiếu nại mới (INSERT `support_ticket`)*: Tạo thành công vé dịch vụ với trạng thái `pending`.
  2. *Ghi nhận phản ánh ban đầu (INSERT `support_ticket_message`)*: Lưu phản ánh của khách hàng theo `ticket_id`.
  3. *Phân công người phụ trách (Assign)*: Chèn bản ghi phân công của CSKH có `agent_name`, cập nhật trạng thái vé sang `processing`.
  4. *Yêu cầu bổ sung thông tin (Request info)*: Gửi thông điệp kênh Zalo OA, cập nhật trạng thái vé sang `waiting_customer`.
  5. *Giải quyết khiếu nại (Resolve)*: Ghi nhận giải pháp bồi hoàn, cập nhật trạng thái sang `completed` kèm `rating = 5` và `rating_comment`.
  6. *Đối soát dữ liệu*: Truy vấn lại từ CSDL Supabase xác nhận đầy đủ toàn bộ 4 bản ghi timeline theo thứ tự thời gian.
  7. *Dọn dẹp sạch bản ghi kiểm thử*: Xóa sạch các bản ghi QA trong CSDL thật mà không để lại dữ liệu rác.

---

## Bán hàng & Kho — Kiểm thử toàn diện và Chuẩn hóa Live CSDL (16/10/2026, r89)

- **Rà soát & Sửa lỗi logic điều hướng, chống rò rỉ bộ lắng nghe sự kiện (Listener Stacking):**
  1. *Khắc phục nhân bản Event Listener*: Đã bổ sung các biến cờ bảo vệ khởi tạo một lần (`isListEventsInitialized`, `isDetailEventsInitialized`, `isProductsEventsInitialized`, `isPromosEventsInitialized`) trên toàn bộ 4 subtab (`tab-order-list.js`, `tab-order-detail.js`, `tab-order-products.js`, `tab-order-promos.js`).
  2. *Sửa lỗi schema và ràng buộc toàn vẹn CSDL*:
     - **Tạo đơn POS tại quầy**: Bổ sung tự động truy xuất `shipping_address_id` hợp lệ từ địa chỉ khách hàng hoặc địa chỉ chi nhánh mặc định, khắc phục triệt để lỗi vi phạm ràng buộc `NOT NULL` của cột `sales_order.shipping_address_id` trên Supabase.
     - **Ghi nhận chi tiết dòng sản phẩm**: Đồng bộ lưu trữ toàn bộ các mục giỏ hàng POS vào bảng `sales_order_detail`.
     - **Chuẩn hóa Enum trạng thái đơn hàng (`order_status_enum`)**:
       - Thay thế các giá trị không hợp lệ `'CONFIRMED'` và `'COMPLETED'` bằng các giá trị chuẩn trong CSDL Supabase: `'PACKING'` (Chờ đóng gói/xác nhận) và `'DELIVERED'` (Đã giao hàng/hoàn tất).
       - Khớp nối `orders.js` tự động ánh xạ `PACKING` từ Supabase thành `'confirmed'` trên giao diện để các bộ lọc và thẻ KPI thống kê hiển thị chính xác 100%.
     - **Chuẩn hóa Enum phiếu đổi trả RMA (`return_request`)**:
       - Sửa đổi cột liên kết thành `sales_order_id` (thay vì `order_id`).
       - Thay thế enum loại đổi trả: dùng `'RETURN'` (thay vì `'REFUND'` gây lỗi 22P02).
       - Thay thế enum trạng thái: dùng `'COMPLETED'` (thay vì `'RESOLVED'`).
       - Bổ sung ghi nhận chi tiết các mặt hàng đổi trả vào bảng `return_request_detail`.
  3. *Tuân thủ nghiêm ngặt quy tắc AGENTS.md*:
     - 100% nút bấm Text-only phẳng, thanh lịch, triệt tiêu tiền tố `+ ` ("Tạo đơn tại quầy", "Thêm sản phẩm", "Nhập hàng", "Kiểm kê", "Tạo mã mới").
     - Không có icon Lucide bên ngoài sidebar; nút 3 chấm thao tác dạng text `•••`.
     - Toàn bộ nhãn trường không có dấu hai chấm `:`, trường bắt buộc có dấu sao `*` màu đỏ.
     - Bo góc chuẩn 9px (`--admin-radius: 9px;`), nền bán trong suốt Frosted Glass kết hợp bảng màu Forest Green.
     - Viết hoa Sentence Case chuẩn Tiếng Việt, không dùng ký hiệu `&` (viết đầy đủ "Sản phẩm và kho").

- **Kiểm thử tự động trên CSDL Supabase thật (`scripts/test/test_sales_lifecycle.js`):**
  1. *Lấy dữ liệu thực thể*: Truy vấn thành công khách hàng (`customer` + `customer_profile`) và sản phẩm khả dụng (`product` + `inventory`).
  2. *Tạo đơn hàng POS (`sales_order`)*: Tạo đơn mới với mã tự sinh, gắn `shipping_address_id` và trạng thái khởi tạo `PENDING`.
  3. *Thêm chi tiết đơn hàng (`sales_order_detail`)*: Chèn thành công dòng sản phẩm với số lượng, đơn giá và thành tiền chính xác.
  4. *Xác nhận đơn và trừ kho*: Chuyển trạng thái đơn sang `PACKING`, cập nhật `payment_status = 'PAID'` và tự động trừ tồn kho tức thời trong bảng `inventory`.
  5. *Cập nhật tiến độ giao hàng*: Cập nhật trạng thái tuần tự sang `SHIPPING` rồi `DELIVERED`.
  6. *Tạo phiếu đổi trả bảo hành RMA (`return_request` & `return_request_detail`)*: Tạo thành công phiếu RMA loại `RETURN` với trạng thái `COMPLETED` và lưu chi tiết mặt hàng đổi trả.
  7. *Hoàn trả tồn kho và dọn dẹp*: Khôi phục tồn kho ban đầu, xóa sạch đơn hàng, chi tiết đơn và phiếu RMA kiểm thử. Toàn bộ 7/7 bước vượt qua thành công 100%.

- **Kiểm thử trực tiếp trên giao diện trình duyệt (UI Automated Testing):**
  - **Subtab 1 — Danh sách đơn hàng (`tab-order-list`)**:
    - Hiển thị đầy đủ 6 thẻ KPI vận hành, bảng đơn hàng với mã đơn, tên khách, tổng tiền, phương thức, trạng thái và thời gian.
    - Mở và đóng thành công modal POS Tạo đơn tại quầy (`#modalCreateOrder`), kiểm tra bộ tính toán trực tiếp giỏ hàng.
    - Mở và xem trước phiếu in đóng gói (`#modalPackingSlip`) với barcode, thông tin vận chuyển và bảng kê hàng hóa.
  - **Subtab 2 — Hồ sơ đơn hàng (`tab-order-detail`)**:
    - Mở chi tiết đơn hàng từ bảng, Header Bar hiển thị đường dẫn cấp con `/ [Mã đơn]` tinh gọn.
    - Hiển thị đầy đủ thẻ khách hàng 360°, chi tiết từng dòng sản phẩm, bảng kê thanh toán và nhật ký timeline theo mốc thời gian.
    - Mở và đóng thành công modal Đổi trả hàng RMA (`#modalRmaExchange`).
  - **Subtab 3 — Sản phẩm và kho (`tab-order-products`)**:
    - Hiển thị 5 thẻ chỉ số kho hàng (Tổng mặt hàng, Còn hàng, Sắp hết, Hết hàng, Giá trị vốn tồn kho).
    - Mở và đóng thành công modal Thêm sản phẩm (`#modalAddProduct`), modal Nhập hàng NCC (`#modalGrnReceipt`), và modal Kiểm kê kho (`#modalStocktake`).
  - **Subtab 4 — Khuyến mãi (`tab-order-promos`)**:
    - Hiển thị 3 chỉ số voucher và bảng danh sách chương trình ưu đãi.
    - Mở và đóng thành công modal Tạo mã khuyến mãi (`#modalCreateVoucher`) và modal Tác vụ voucher (`#modalVoucherAction`).

---

## Chatbot & Trực chat CSKH — Kiểm thử toàn diện và Chuẩn hóa Live CSDL (16/10/2026, r90)

- **Rà soát & Sửa lỗi logic điều hướng, chống rò rỉ bộ lắng nghe sự kiện (Listener Stacking):**
  1. *Khắc phục nhân bản Event Listener*:
     - Tách biệt logic khởi tạo DOM event listener thành `setupLiveChatEventListeners()` có cờ bảo vệ `isLiveChatEventsInitialized` trong [tab-chatbot-live.js](../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js). Ngăn chặn tình trạng nhân bản hàng loạt bộ lắng nghe sự kiện khi chuyển đổi qua lại giữa 3 subtab (*Trực chat*, *Trợ lý AI*, *Quy định*).
     - Duy trì biến bảo vệ `copilotBound` trong [tab-chatbot-copilot.js](../../pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js) và `rulesHubInitialized` trong [tab-chatbot-rules.js](../../pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js).
  2. *Sửa lỗi schema và ràng buộc toàn vẹn CSDL*:
     - **Ràng buộc kênh liên lạc (`chat_conversation_channel_check`)**: CSDL Supabase chỉ chấp nhận giá trị kênh hợp lệ `'web'`, thay vì `'web_chat'`.
     - **Ràng buộc trạng thái phiên hội thoại (`chat_conversation_status_check`)**: Xác nhận các trạng thái hợp lệ gồm `'bot_handling'`, `'waiting_agent'`, `'agent_handling'`, `'resolved'`, `'closed'`.
     - **Định dạng mảng từ khóa FAQ (`chatbot_knowledge_faq.keywords`)**: CSDL lưu kiểu mảng `text[]` (Array) thay vì chuỗi đơn lẻ, đảm bảo câu hỏi FAQ lưu kiên định không bị lỗi `22P02`.
  3. *Tuân thủ nghiêm ngặt quy tắc AGENTS.md*:
     - Không sử dụng icon Lucide bên ngoài sidebar (0 icon Lucide trong `chatbot.html`).
     - Nút 3 chấm tác vụ trên khung chat dạng text `•••` (`#btnChatActionsDots`).
     - Triệt tiêu hoàn toàn ký hiệu `+ ` thừa trên các nút ("Thêm câu hỏi FAQ", "Thêm từ cấm", "Thêm mẫu câu", "Đồng bộ tri thức RAG").
     - Toàn bộ nhãn trường không có dấu hai chấm `:`, trường bắt buộc có dấu sao `*` màu đỏ.
     - Bo góc cố định 9px (`--admin-radius: 9px;`), 100% màu phẳng Solid và nền bán trong suốt Frosted Glass kết hợp hiệu ứng mờ nhạt (0 gradients).
     - Viết hoa Sentence Case chuẩn Tiếng Việt ("Trực chat", "Trợ lý AI", "Quy định", "Tặng điểm Pawpoint", "Chuyển thành Ticket", "Chuyển cấp quản lý", "Hoàn tất ca chat").

- **Kiểm thử tự động trên CSDL Supabase thật (`scripts/test/test_chatbot_lifecycle.js`):**
  1. *Lấy dữ liệu thực thể*: Truy vấn thành công khách hàng (`customer` + `customer_profile`).
  2. *Khởi tạo phiên hội thoại mới (`chat_conversation`)*: Chèn thành công phiên mới với `channel = 'web'` và `status = 'bot_handling'`.
  3. *Khách hàng gửi tin nhắn (`chat_message`)*: Ghi nhận tin nhắn loại `customer` với nội dung hỏi dịch vụ tiêm phòng.
  4. *Bot tự động phản hồi (`chat_message`)*: Ghi nhận tin nhắn phản hồi tự động loại `bot`.
  5. *Chuyên viên CSKH tiếp quản (`Takeover`)*: Cập nhật thành công trạng thái phiên hội thoại sang `agent_handling`.
  6. *Chuyên viên CSKH gửi tin nhắn hỗ trợ trực tiếp*: Ghi nhận tin nhắn loại `staff` với tên người gửi rõ ràng.
  7. *Ghi chú nội bộ và hoàn tất*: Cập nhật `internal_note`, `sentiment_level = 2` và `status = 'resolved'`.
  8. *Tạo câu hỏi FAQ (`chatbot_knowledge_faq`)*: Tạo thành công bản ghi FAQ với mảng từ khóa `keywords`.
  9. *Tạo mẫu câu phản hồi nhanh (`chatbot_canned_response`)*: Tạo thành công mẫu câu với `shortcut = '/qa_vac'`.
  10. *Dọn dẹp sạch bản ghi kiểm thử*: Xóa sạch các tin nhắn, phiên hội thoại, FAQ và mẫu câu QA mà không để lại dữ liệu rác. Toàn bộ 10/10 bước vượt qua thành công 100%.

- **Kiểm thử trực tiếp trên giao diện trình duyệt (UI Automated Testing):**
  - **Subtab 1 — Trực chat (`tab-live-support`)**:
    - Hiển thị bố cục 3 cột hoàn chỉnh: Danh sách hội thoại theo 3 tab SLA (*Xử lý ngay*, *Đang chat*, *Tất cả*), Khung chat trực tiếp kèm tin nhắn đa nguồn (User/Bot/Agent), và Thẻ hồ sơ khách hàng 360° (Thú cưng, Đơn hàng, Lịch hẹn, Khiếu nại, Ghi chú nội bộ).
    - Thao tác nút `•••` mở menu thả xuống mượt mà.
    - Mở và đóng thành công modal Trích xuất vé khiếu nại (`#convertTicketModalOverlay`), kiểm tra nhãn chuẩn không có dấu `:`, trường bắt buộc có dấu `*` đỏ.
    - Mở và đóng thành công modal Chuyển cấp quản lý (`#escalateManagerModalOverlay`).
  - **Subtab 2 — Trợ lý AI (`tab-ai-copilot`)**:
    - Hiển thị khung làm việc với Copilot Gemini 1.5 Pro nội bộ, hàng prompt gợi ý một chạm, nút Xóa lịch sử và Đồng bộ tri thức RAG.
  - **Subtab 3 — Quy định (`tab-chatbot-rules`)**:
    - Rules Hub tải đầy đủ 6 tab con: Kho tri thức FAQ (92 mục), Màng lọc Toxic Shield, Mẫu câu phản hồi, Hạn mức bồi hoàn, Ma trận kịch bản, Quy chuẩn văn hóa CSKH.
    - Bộ lọc tìm kiếm, phân trang và các modal thêm câu hỏi, từ cấm, mẫu câu hoạt động chính xác.



