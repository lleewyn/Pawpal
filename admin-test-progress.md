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

**Chưa kiểm thử:** các nút ưu tiên/nhìn tồn kho còn lại, lịch tuần khi có ca, “Xem tất cả”, “Xem hội thoại”, hành vi backdrop của modal, dữ liệu KPI đối chiếu Supabase, giao diện màn hình hẹp và trạng thái API lỗi.

## Khách hàng / Danh sách — đã kiểm thử vòng chức năng

**Đạt:** tải skeleton rồi hiển thị dữ liệu Supabase; tìm kiếm; lọc hạng và trạng thái; lọc khiếu nại từ nút trong thanh công cụ và dải cảnh báo; xóa bộ lọc; KPI Tổng khách/Thành viên/Vãng lai/Bị khóa/Có khiếu nại; phân trang tối đa 10 dòng; xuất CSV; mở hồ sơ; mở modal Thêm khách/Sửa hồ sơ/Điều chỉnh Pawpoint; kiểm tra bắt buộc khi form thêm khách trống; chip lý do Pawpoint; đóng modal bằng Đóng, Hủy và Escape.

**Lỗi đã sửa và thử lại trên giao diện:**

1. KPI “Có khiếu nại” đặt lại bộ lọc trạng thái và hiển thị đúng 2 khách sau khi chuyển từ KPI “Bị khóa”.
2. Bảng đã loại chuỗi số và các giá trị `Chưa rõ`, `Chưa cập nhật`; các giống hợp lệ được gộp và bỏ trùng.
3. Hồ sơ khách không có SĐT ẩn Gọi điện, Zalo và Gửi lại SMS.
4. “Khóa tài khoản” mở modal xác nhận, hỗ trợ Hủy và Escape. Sau khi người dùng xác nhận, hệ thống chỉ báo thành công nếu Supabase trả về đúng bản ghi đã cập nhật và dữ liệu tải mới khớp trạng thái.

**Chưa kiểm thử:** lưu mới/sửa khách, điều chỉnh điểm và bước xác nhận khóa/mở khóa trên bản ghi QA riêng; tổ hợp lỗi Supabase; responsive; backdrop modal. Không tạo dữ liệu thử trong vòng này.

## Khách hàng / Pawpoint — đã kiểm thử vòng đọc và modal

**Đạt:** tải chính sách hạng thẻ; tải lịch sử giao dịch Pawpoint từ dữ liệu hiện có; bộ lọc Tất cả/Cộng điểm/Trừ điểm; phân trang; mở modal Điều chỉnh Pawpoint; ô Khách hàng hoặc số điện thoại hiển thị custom autocomplete có tên, SĐT, thú cưng, hạng và số dư; chip lý do điền nhanh; loại điều chỉnh Cộng điểm/Trừ điểm; nút Đóng/Hủy đóng modal. Không xác nhận điều chỉnh để tránh ghi dữ liệu thật.

**Chưa kiểm thử:** xuất file; xác nhận cộng/trừ điểm trên bản ghi QA; kiểm tra lỗi số điểm âm/0, khách không tồn tại, lỗi Supabase; responsive và backdrop modal.

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

## Dịch vụ / Đánh giá — đã kiểm thử vòng tải và lọc

**Đạt:** KPI điểm trung bình, tổng lượt, chưa phản hồi và cảnh báo; bảng đánh giá tải dữ liệu; bộ lọc mức sao, nhóm dịch vụ, KTV và trạng thái phản hồi; phân trang; nút Xuất file và Phản hồi hiển thị.

**Lưu ý dữ liệu:** nhiều đánh giá đang hiển thị `Khách hàng PawPal —` và `Chưa có thông tin` ở KTV. Code đã xử lý profile dạng object/mảng ở lớp nạp dịch vụ, nhưng dữ liệu đánh giá hiện không trả về quan hệ khách/KTV hợp lệ nên không tự gán tên.

**Chưa kiểm thử:** mở modal Phản hồi, gửi phản hồi, xuất file, lọc 1–3 sao trên dữ liệu đầy đủ, lỗi API và responsive.

## Bán hàng / Đơn hàng — đã kiểm thử vòng tải và lọc

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

## Chatbot — đã kiểm thử vòng đọc và lọc

**Đạt:** tab Trực chat tải được danh sách 24 hội thoại và khung hội thoại hiện tại; bộ đếm Xử lý ngay 5, Đang chat 3, Tất cả 24; lọc Đang chat hiển thị 3 hội thoại, lọc Xử lý ngay hiển thị 5 hội thoại; tìm kiếm theo tên khách lọc đúng kết quả; chuyển qua tab Trợ lý AI và Quy định tải đúng nội dung, FAQ 91 bản ghi cùng bộ lọc, phân trang và thao tác đọc.

**Lưu ý dữ liệu:** nhiều hội thoại là khách vãng lai/mã khách thử nghiệm, nội dung bot lặp lại và SLA quá hạn; đây là dữ liệu cần làm sạch/đối soát, chưa thấy lỗi logic trong bộ lọc.

**Chưa kiểm thử:** gửi tin, tiếp nhận/trả lại AI, hoàn tất ca, lưu ghi chú, tạo khiếu nại/tặng điểm/chuyển cấp, đồng bộ tri thức và chỉnh sửa FAQ vì đều là thao tác ghi dữ liệu thật.

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
