# Giai đoạn 1 — Thiết kế phân quyền Quản lý và Nhân viên

Ngày hoàn tất thiết kế: 04/11/2026. Phạm vi giai đoạn này: đọc CSDL, đối chiếu mã nguồn, xác định cách triển khai và cập nhật checklist. Chưa thay đổi vai trò, tài khoản, RLS, API hoặc giao diện đang chạy.

## 1. Căn cứ và kết quả kiểm tra

- Mô hình nghiệp vụ: bảng hai vai trò đã thống nhất trong [checklist](../../PAWPAL_CHECKLIST_PHAN_QUYEN_ADMIN.md).
- [Báo cáo CSDL ban đầu](PAWPAL_RASOAT_PHAN_QUYEN_CSDL.md): 38 bảng, 159 policy, metadata của 129 hàm liên quan.
- [Bằng chứng bổ sung giai đoạn 1](PAWPAL_GIAI_DOAN_1_KIEM_KE.md): quét 50 file mã nguồn, đối chiếu 121 tên RPC/gateway với 121 chữ ký trên Cloud; không có tên bị thiếu trong phạm vi quét. Kiểm tra thêm cột và quan hệ của 22 bảng dùng xác định phạm vi.
- Đã đọc luồng đăng nhập, xác thực máy chủ, registry công cụ chatbot, quản lý tài khoản và các luồng khách hàng, thú cưng, ca dịch vụ, thu ngân, khiếu nại. Bằng chứng nguồn ghi trong bản kiểm kê; phần này là thiết kế cần triển khai tiếp, không phải kết quả nghiệm thu phân quyền.
- Hai lượt truy vấn bổ sung chỉ đọc, mỗi lượt 5 truy vấn nghiệp vụ/catalog có phạm vi trong giao dịch READ ONLY. Không đăng nhập Auth, không đọc hệ thống Logs, không thay đổi dữ liệu và không xuất thông tin cá nhân.

## 2. Quy ước triển khai

| Nội dung | Quyết định thiết kế |
|---|---|
| Vai trò Quản lý | Mã `ADMIN`, tên hiển thị Quản lý, toàn quyền nghiệp vụ hợp lệ |
| Vai trò Nhân viên | Mã `STAFF`, tên hiển thị Nhân viên, bộ quyền cố định dưới đây |
| Số vai trò mỗi người | Đúng một vai trò khi được cấp quyền sử dụng Admin; không gán đồng thời ADMIN và STAFF |
| Hồ sơ chưa được cấp quyền | Có thể chưa có vai trò; không được vào màn hình nghiệp vụ |
| Quyền cấp riêng | Không sử dụng trong mô hình mới; API/RPC phải từ chối yêu cầu cấp quyền riêng hoặc nhiều vai trò |
| Khóa nhận việc | `staff.service_locked` chỉ giới hạn nhận/điều phối việc; không dùng thay khóa đăng nhập |
| Định danh người gọi | Từ Supabase Auth và `staff.auth_user_id`; không lấy mã nhân viên gửi lên làm căn cứ |
| Vai trò không nhận diện | Không cấp quyền nghiệp vụ; không mặc định thành ADMIN |
| Phân công rỗng | Không có nghĩa ai cũng được cập nhật. Nhân viên chỉ làm công việc đã giao; hàng chờ chat có quy tắc riêng bên dưới |
| Chức năng mới | Mặc định dành Quản lý cho đến khi được phân loại vào bộ quyền Nhân viên |

Mã STAFF là quyết định thiết kế cho giai đoạn 2; chưa được thêm vào danh mục vai trò trên Cloud. Mọi chức danh dùng chung bộ quyền Nhân viên theo lựa chọn của người dùng, không phát sinh quyền riêng theo nghề nghiệp.

## 3. Ánh xạ chức năng và thao tác

Quản lý được thực hiện các thao tác hợp lệ của mọi dòng. Các giới hạn dưới đây áp dụng cho Nhân viên. Mục chưa được nêu rõ trong bảng tổng quát được xử lý bằng mặc định giới hạn, không tự mở thêm quyền quản trị.

| Nhóm | Nhân viên được thực hiện | Nhân viên không được thực hiện | Nguồn chính cần áp dụng |
|---|---|---|---|
| Tổng quan | Công việc và chỉ số cá nhân, liên kết đến công việc được giao | Tổng doanh thu, lợi nhuận, thống kê toàn cửa hàng, danh sách cảnh báo toàn hệ thống | `dashboard/dashboard.js`, `get_admin_dashboard_cashflow`, các truy vấn số đếm |
| Khách hàng | Tìm, xem liên hệ phục vụ đặt lịch/bán hàng; thêm nhanh; cập nhật thông tin liên hệ và ghi chú cần thiết | Khóa/mở tài khoản, xóa hồ sơ, đổi liên kết Auth, xuất danh sách, xem nhật ký quản trị | `customers/customers.js`, `admin_customer_page`, `create_customer_quick`, `update_customer_profile`, `save_customer_note` |
| Thú cưng | Tìm, thêm, cập nhật thông tin, ghi cân nặng; xem thông tin sức khỏe cần phục vụ | Xóa/khôi phục hồ sơ, đổi chủ nuôi hoặc sửa quan hệ ngoài luồng nghiệp vụ được phép | `pets/pets.js`, `save_admin_pet`, `record_admin_pet_weight`, `add_customer_pet`, `update_customer_pet` |
| Lịch hẹn | Tạo lịch theo gói và giá đang áp dụng; xem lịch công việc cá nhân; xem lựa chọn giờ/người khả dụng tối thiểu khi tạo lịch | Xem lịch điều phối toàn cửa hàng, đổi KTV, duyệt hủy, đổi giá hoặc tự gửi trạng thái bất kỳ | `services/subtabs/tab-service-bookings.js`, `create_admin_service_booking`, `create_admin_logistics_booking`, `update_admin_service_booking` |
| Thực hiện dịch vụ | Nhận ca, bắt đầu, ghi biên bản, chăm sóc, bàn giao/hoàn tất theo trình tự hợp lệ của ca được giao | Sửa ca của người khác; xóa nhật ký; thêm/hủy hạng mục tính phí hoặc duyệt phụ phí | `save_admin_service_record`, `save_admin_service_care_log`, `change_admin_service_charge` |
| Khách sạn thú cưng và đưa đón | Tạo đặt chỗ; xử lý ca khách sạn được giao và chuyến được giao theo quy trình | Quản lý phòng/bảng giá; đổi tài xế; xem toàn bộ khách lưu trú/chuyến hoặc ghi thay ca chưa được giao | `hotel_booking`, `taxi_trip`, `close_admin_hotel_stay`, các RPC dịch vụ |
| Bán hàng | Tra cứu đơn để phục vụ khách, báo giá máy chủ, tạo đơn và in chứng từ của đơn được xem | Tự sửa giá/giảm giá, hủy, hoàn tiền, đổi trả, tạo đơn thay thế, điều phối giao hàng hoặc xuất danh sách | `orders/subtabs/tab-order-list.js`, `quote_admin_sales_order`, `create_admin_sales_order`, `update_admin_sales_order`, `save_admin_sales_return` |
| Thu ngân | Xem số tiền phải thu và giao dịch liên quan của đơn/ca đang xử lý; ghi nhận thu tiền theo quy trình | Hoàn tiền, sửa/xóa khoản thu, thay phương thức cấu hình hoặc xem doanh thu tổng hợp | `get_admin_sales_cashier`, `get_admin_service_cashier`, `post_admin_sales_money`, `post_admin_service_money` |
| Kho và sản phẩm | Xem hàng đang bán, giá niêm yết, số tồn phục vụ báo giá và tạo đơn | Xem giá vốn, sửa danh mục/giá; nhập xuất thủ công, điều chỉnh tồn, duyệt trả hàng nhập lại kho | `orders/subtabs/tab-order-products.js`, `get_admin_sales_product_page`, `inventory`, `product_variant` |
| Pawpoint | Tra cứu số điểm/hạng cần phục vụ khách; áp dụng đổi điểm theo quy tắc máy chủ khi lập đơn | Cộng/trừ thủ công, bồi hoàn điểm, sửa hạng/quy tắc hoặc xem báo cáo điểm toàn hệ thống | `customers/subtabs/tab-customer-pawpoint.js`, `adjust_customer_points`, `quote_admin_sales_order` |
| Ưu đãi | Xem ưu đãi còn hiệu lực và áp dụng mã đủ điều kiện khi tạo đơn | Tạo/sửa/xóa ưu đãi, tự thêm giảm giá hoặc thay quy tắc áp dụng | `orders/subtabs/tab-order-promos.js`, `save_admin_sales_voucher`, các RPC báo giá |
| Hội thoại | Xem hàng chờ tối thiểu; tự tiếp nhận ca chưa ai nhận; trả lời, ghi chú và kết thúc ca của mình | Xem nội dung ca người khác, phân công/chuyển cho người khác, mở nguyên văn nhạy cảm, chặn/mở khóa khách hoặc bồi hoàn | `act_admin_chat`, `resolve_admin_chat`, `transfer_admin_chat`, `chat_conversation` |
| Khiếu nại | Tạo tiếp nhận liên quan công việc, xem/gửi thông tin cho phiếu được giao, gửi đề xuất để Quản lý duyệt | Tự phân công, duyệt/từ chối phương án, hoàn tiền/bồi hoàn, đóng hồ sơ bằng hành động quản trị | `create_admin_complaint`, `act_admin_complaint`, `assign_admin_complaint` |
| Đánh giá khách | Không mở trang đánh giá STAFF; tiếp nhận phản hồi qua hội thoại/khiếu nại. Người dùng chốt giữ Quản lý xử lý đánh giá khi kết thúc giai đoạn 3 ngày 05/11/2026 | Tra cứu đánh giá, phản hồi chính thức, ẩn/hiện hoặc kiểm duyệt | `services/subtabs/tab-service-reviews.js`, `get_admin_sales_review_page`, các RPC review |
| Nhân sự | Xem hồ sơ, lịch và kết quả đánh giá cá nhân; đổi mật khẩu qua luồng cá nhân hiện có | Danh bạ hồ sơ nội bộ, phân ca, sửa hồ sơ, cấp tài khoản/quyền, đánh giá người khác hoặc duyệt nghỉ/đổi ca | `staff/*`, `get_admin_staff_directory`, `save_admin_staff_profile`, `save_admin_staff_schedule` |
| Cấu hình, nội dung và nhật ký | Không có quyền quản trị | Cấu hình hệ thống, banner, bài viết, quy tắc chatbot, kiểm tra bộ quy tắc và nhật ký quản trị | `settings/*`, `chatbot/subtabs/tab-chatbot-rules.js`, `api/admin-chat.js` |
| Xuất dữ liệu | In/xem chứng từ của một đơn/ca được phép theo quy trình thu ngân | Xuất Excel/CSV, xuất hàng loạt khách/đơn/ca, trích toàn bộ hội thoại, báo cáo toàn cửa hàng | Các nút xuất, bộ lọc tải toàn bộ, API tệp và đường dẫn tải |

Các thao tác hoàn tất/đóng ca chỉ được phép nếu không đồng thời cho phép hủy, sửa giá hoặc ghi hoàn tiền. Đơn tạo mới có thể làm phát sinh giữ chỗ kho, trừ/hoàn điểm hoặc ưu đãi tự động theo giao dịch chuẩn; đây không phải quyền điều chỉnh kho/điểm thủ công. Không cấp quyền ghi trực tiếp các bảng liên quan để phục vụ các hiệu ứng tự động này.

“Thông tin phục vụ công việc” của khách hàng/thú cưng được hiểu là tra cứu liên hệ và hồ sơ nghiệp vụ cần thiết để đặt lịch, chăm sóc hoặc bán hàng. Không gán một chủ nuôi cố định cho một nhân viên vì CSDL hiện không có quan hệ đó. Tra cứu có phân trang và giới hạn cột; không trả mọi lịch sử nhạy cảm chỉ vì biết mã khách.

## 4. Phạm vi theo quan hệ CSDL

| Đối tượng | Cách xác định quyền Nhân viên |
|---|---|
| Hồ sơ nhân sự | `staff.auth_user_id = auth.uid()`; không nhận staff_id từ người dùng để chọn hồ sơ cá nhân |
| Lịch và kết quả cá nhân | `staff_schedule.staff_id` hoặc `staff_assessment.staff_id` trỏ đến nhân sự của phiên |
| Ca dịch vụ | `appointment.staff_id` là mình, hoặc có `appointment_item.staff_id` là mình; chỉ sửa hạng mục được giao, không sửa hạng mục của đồng nghiệp trong ca chung |
| Chuyến đưa đón | `taxi_trip.driver_staff_id` là mình; không dùng trường tài xế trên payload để chứng minh quyền |
| Ca khách sạn | Dựa trên ca `appointment` và hạng mục được giao; `hotel_booking` không có staff_id riêng, không suy ra quyền từ số phòng |
| Biên bản và nhật ký | Liên kết `appointment_id` tới ca được phép; `recorded_by` ghi tác giả từ phiên, không dùng tác giả làm bằng chứng phân công hiện tại |
| Hội thoại | `chat_conversation.assigned_staff_id` là mình. Ca chưa phân công chỉ trả dữ liệu hàng chờ tối thiểu; tiếp nhận nguyên tử rồi mới đọc đầy đủ. Không lấy toàn bộ lịch sử trước khi kiểm tra quyền |
| Phiếu khiếu nại | `support_ticket.assigned_staff_id` là mình; tin nhắn và tệp kế thừa phạm vi phiếu, tạo phiếu không tự có quyền phân công hoặc duyệt |
| Lịch sử chatbot | `admin_copilot_history.staff_id` là mình và quyền hiện tại cho phép dữ liệu trong câu trả lời; lịch sử/replay cần kiểm tra lại khi đổi vai trò |
| Đơn và thanh toán | Tra cứu nghiệp vụ theo đơn/khách để tạo đơn và thu tiền; không áp điều kiện “được giao” giả vì `sales_order` và `payment` hiện không có staff_id phụ trách. Trả projection theo đơn, không cho quét bảng tiền hoặc thống kê tổng |
| Kết quả cá nhân | Ca/hạng mục/chuyến và đánh giá thuộc mình. Không tự suy ra doanh thu cá nhân từ mã người thu trong audit_log; số lần thu tiền chỉ tính từ sự kiện nghiệp vụ do mình thực hiện nếu cần |
| Lịch khả dụng công khai | RPC chỉ trả giờ khả dụng và thông tin lựa chọn cần thiết; không trả lý do nghỉ, hồ sơ cá nhân hoặc toàn bộ staff_schedule |

Nếu không có phân công thì Nhân viên không được cập nhật ca/chuyến/phiếu. Quản lý phân công bằng quy trình hiện có. Lựa chọn nhân sự khi tạo lịch phải theo ứng viên/giờ hợp lệ do máy chủ xác minh; không tạo quyền điều phối lại lịch sau khi lưu.

## 5. Thiết kế quyền kỹ thuật cho giai đoạn 2

- Giữ bộ quyền ADMIN hiện có; nếu bổ sung mã quyền kỹ thuật thì ADMIN cũng nhận các quyền đó. STAFF có một bộ quyền cố định do migration quản lý, không cho chỉnh từng người.
- Không sao chép 210 quyền sang STAFF. Các quyền read/write cấp bảng hiện tại quá rộng ở một số nơi, cần kết hợp kiểm tra vai trò, hành động và phạm vi trên cùng nguồn xác thực.
- Không cấp các quyền quản trị `staff.write`, `staff_role.write`, `staff_permission.write`, `role_permission.write`, `access_role.write`, `permission.write`, `refund_transaction.write` và cấu hình cho STAFF.
- Đọc phục vụ Nhân viên dùng RPC hoặc view có giới hạn cột/dòng. Các RPC hiện dùng SECURITY INVOKER cần được điều chỉnh cùng RLS/GRANT; không cấp SELECT toàn bộ bảng chỉ để RPC thu ngân hết lỗi.
- Các RPC ghi dùng chung phải phân nhánh hành động trước khi đọc dữ liệu hoặc replay yêu cầu: STAFF chỉ được tập hành động đã nêu trong mục 3; tham số khác bị từ chối dù biết tên RPC.
- `post_admin_sales_money` và `post_admin_service_money`: STAFF chỉ được `collect`, ADMIN được `collect/refund`; kiểm tra phiên bản, điều kiện số tiền và chống lặp vẫn giữ nguyên.
- `update_admin_service_booking`: tách cập nhật tiến độ ca được giao khỏi đổi KTV/hủy/điều chỉnh. `save_admin_service_care_log`: STAFF chỉ lưu ca được giao, không dùng nhánh delete.
- `act_admin_complaint`: STAFF chỉ `message`, `request_info`, `propose` trên phiếu được giao; các hành động duyệt, giải quyết tài chính, đóng/mở lại và đổi liên kết dành ADMIN.
- `update_admin_sales_order`: quản lý trạng thái xác nhận/giao/hủy thuộc ADMIN theo bảng đã chốt; STAFF tạo đơn và thu tiền qua RPC riêng hiện có.
- Không cho STAFF ghi audit_log tùy ý. RPC nghiệp vụ tự ghi sự kiện và người thực hiện, không dựa vào `audit_log.write` cấp rộng để mở mọi hành động.
- Rà soát GRANT UPDATE cột `staff.id`, quyền đọc staff_schedule công khai và các API/view/file trước khi cấp STAFF.
- Cả giai đoạn 2 và 4 phải sửa quyền trong registry chatbot, gateway, RPC nền và RLS/view liên quan; chỉ chặn ở registry JavaScript hoặc prompt chưa đủ.

Đây là ánh xạ bắt buộc của thao tác vào hai vai trò. Tên và chữ ký RPC bổ sung, migration và câu lệnh GRANT cụ thể sẽ được viết ở giai đoạn 2 dựa trên các giới hạn này; chưa tạo API hoặc mã quyền mới ở giai đoạn 1.

## 6. Ánh xạ toàn bộ registry chatbot hiện có

Quản lý được dùng các công cụ trong phạm vi nghiệp vụ hợp lệ. Nhân viên áp dụng bảng dưới, không nhận mã nhân viên/phạm vi rộng hơn từ câu hỏi hoặc payload. Tên công cụ dùng để đối chiếu kỹ thuật, không hiển thị trong giao diện cho người dùng.

| Nhóm công cụ | Intent hiện có | Quy tắc cho Nhân viên |
|---|---|---|
| Tra cứu phục vụ khách | `customer.lookup`, `customer.pets`, `pet.lookup`, `internal.customer_resolve`, `internal.customer_pets`, `internal.customer_latest_order` | Thông tin khách/thú cưng/đơn cần phục vụ, giới hạn cột và phân trang như giao diện |
| Bán hàng và danh mục | `order.lookup`, `payment.order`, `catalog.product`, `catalog.service`, `catalog.service_price`, `catalog.price_rows`, `inventory.low_stock`, `points.lookup`, `offer.list`, `knowledge.search`, `hotel.availability` | Chỉ dữ liệu nghiệp vụ: giá bán/tồn/điểm/ưu đãi đang áp dụng; tiền theo đơn cụ thể, không giá vốn hoặc nội dung cấu hình nội bộ |
| Công việc được giao | `appointment.list`, `appointment.search`, `internal.customer_appointment`, `hotel.stays`, `taxi.trips`, `ticket.open`, `ticket.lookup`, `internal.customer_tickets`, `conversation.context`, `conversation.list` | Lọc theo nhân sự phiên tại CSDL; không chấp nhận staff_query hoặc customerId để mở rộng phạm vi; hàng chờ chat chỉ trả thông tin tối thiểu |
| Cá nhân | `staff.lookup`, `staff.schedule`, `history.context` | Chỉ hồ sơ/lịch/lịch sử của mình; từ chối yêu cầu người khác dù người hỏi biết tên hoặc mã |
| Quản trị | `revenue.summary`, `order.refund_pending`, `review.list`, `review.read`, `content.list`, `content.read`, `report.operations`, `settings.read` | Từ chối cho STAFF; đánh giá khách giữ cho Quản lý theo phạm vi đã chốt ở mục 3 |

Kiểm tra cả gateway đọc từng phần, lịch sử đã lưu, câu trả lời replay, bản tóm tắt và ngữ cảnh gửi mô hình. Sau khi hạ từ ADMIN xuống STAFF, không trả lại câu trả lời cũ chứa doanh thu hoặc dữ liệu quản trị. Các bài kiểm tra quy tắc/chatbot benchmark chỉ dành ADMIN.

## 7. Phương án chuyển đổi tài khoản

| Nhóm hiện tại trên Cloud | Số hồ sơ | Phương án |
|---|---|---|
| ADMIN, active, Auth mở, đã đổi mật khẩu | 1 | Giữ ADMIN và khả năng đăng nhập; đổi tên hiển thị thành Quản lý; không tự reset mật khẩu |
| Chưa vai trò, ACTIVE, Auth khóa, phải đổi mật khẩu | 15 | Có thể chuẩn hóa trạng thái về active bằng migration có điều kiện, nhưng giữ ban Auth và cờ đổi mật khẩu. Không tự gán STAFF hoặc mở khóa hàng loạt; cấp vai trò và mở tài khoản theo từng hồ sơ khi Quản lý thực hiện quy trình vận hành |
| Chưa vai trò, resigned, Auth khóa, phải đổi mật khẩu | 1 | Giữ nghỉ việc, khóa và chưa có vai trò; không tự kích hoạt hoặc cấp quyền |

Quy trình dự kiến ở giai đoạn 6:

1. Lưu bản trước chuyển đổi ở vị trí riêng không được web phục vụ: mã hồ sơ/Auth, trạng thái, vai trò và quyền; không ghi mật khẩu hoặc token. Giai đoạn 1 chỉ lưu thống kê, chưa tạo bản sao chứa dữ liệu cá nhân.
2. Chuẩn bị ADMIN/STAFF, policy/RPC/API tương thích và ràng buộc một vai trò; áp dụng theo thứ tự không tạo khoảng mở quyền.
3. Chuẩn hóa có điều kiện các giá trị trạng thái đã nhận diện, giữ khóa Auth, yêu cầu đổi mật khẩu, trạng thái nghỉ việc và khóa nhận việc. Giá trị lạ phải được báo ra, không tự đổi thành active.
4. Giữ ADMIN hiện tại hoạt động. Các hồ sơ khóa và chưa vai trò giữ nguyên quyền đăng nhập; Quản lý chọn từng người cần sử dụng và gán STAFF bằng luồng có ghi nhật ký.
5. Tài khoản chỉ dùng nghiệp vụ sau khi hợp lệ đồng thời: có Auth, không bị khóa, trạng thái active, đã hoàn tất đổi mật khẩu và có đúng vai trò nhận diện.
6. Kiểm tra lại từ phiên đăng nhập thật; khôi phục theo snapshot nếu lỗi. Khi khôi phục không mở khóa tài khoản, không bỏ cờ đổi mật khẩu và không khôi phục quyền rộng cho tài khoản đã bị thu hồi sau snapshot mà chưa đối chiếu.

Không xóa bảng `staff_permission` ngay: giữ tương thích cấu trúc nếu cần, khóa đầu vào cấp riêng và xử lý các dòng cũ trong migration. Kiểm kê hiện tại không có dòng quyền riêng.

## 8. Danh sách phần mã cần sửa ở giai đoạn sau

| Giai đoạn | Điểm sửa chính |
|---|---|
| 2 | Migration vai trò và quyền cố định; RLS/GRANT; `get_staff_login_context`, `has_permission`; RPC đọc hồ sơ, công việc, thu ngân; các RPC ghi có nhiều hành động; API tài khoản và bảo vệ ADMIN cuối cùng |
| 3 | `pages/admin/login/login.js`, `pages/admin/admin.js`, các module/subtab; bỏ mặc định ADMIN từ sessionStorage ở hồ sơ nhân sự, tránh nạp dữ liệu và KPI quản trị trước khi biết vai trò |
| 4 | `scripts/api/chat_read_tools.js`, `scripts/api/admin_copilot.js`, `api/admin-chat.js`, gateway/RPC nền, lịch sử/replay/ngữ cảnh, cache và Realtime; cập nhật phiên khi vai trò thay đổi |
| 5 | PQ-01 đến PQ-30 và các trường hợp bổ sung theo thiết kế: nhân viên không nhập vai người khác bằng staff_query, ca chung nhiều KTV, giá vốn, kho/điểm tự động, lịch khả dụng công khai |
| 6 | Snapshot riêng, migration và triển khai tương thích, cấp vai trò theo hồ sơ, kiểm tra sau chuyển đổi và bàn giao |

## 9. Kết quả giai đoạn 1

- Hoàn thành thiết kế hai vai trò ADMIN/STAFF và ánh xạ các nhóm chức năng hiện có.
- Xác định quan hệ CSDL để lọc ca dịch vụ, lịch cá nhân, chuyến, chat và phiếu phản ánh; ghi rõ đơn hàng chưa có quan hệ phân công.
- Phân loại đủ 38 intent trong registry chatbot hiện tại; registry có thay đổi phải rà soát lại trước khi triển khai.
- Có phương án chuẩn hóa trạng thái và chuyển đổi tài khoản, không tự mở khóa 16 tài khoản Auth đang khóa.
- Chưa sửa hệ thống, chưa cấp vai trò STAFF, chưa chạy 30 kịch bản và chưa triển khai giai đoạn 2.
