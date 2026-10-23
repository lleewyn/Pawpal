# Thiết kế database Pawpal — quyết định phiên bản 1

Ngày: 21/10/2026. Phạm vi: xác định mô hình logic trước khi viết migration PostgreSQL.

**Phương án nền tảng đã chọn: Supabase self-host.** PostgreSQL vẫn là lõi dữ liệu, nhưng Auth, API dữ liệu, Storage và Realtime dùng các dịch vụ Supabase có sẵn. Kế hoạch đang áp dụng: [triển khai Supabase self-host](../archive/migration/PAWPAL_KE_HOACH_SUPABASE_SELF_HOST.md). Schema local đã chuyển theo V1; công việc tiếp theo là chuyển mã gọi tương ứng, không thêm lại cấu trúc baseline ngoài thiết kế.

**Trạng thái sau triển khai ngày 21/10/2026:** Supabase self-host local đã có đúng **105 bảng, 906 cột và 160 khóa ngoại** theo từ điển V1; 105 bảng đều bật RLS. Đã đối chiếu tên, kiểu, NULL, PK và kiểm tra REST, ràng buộc, thao tác đồng thời, backup/restore. Xem [kết quả triển khai và giới hạn nghiệm thu](PAWPAL_DATABASE_V1_TRIEN_KHAI.md) cùng [đặc tả vật lý](PAWPAL_DATABASE_V1_DAC_TA_VAT_LY.md). Mã ứng dụng cũ chưa chuyển xong; việc có schema không đồng nghĩa toàn bộ chức năng đã chạy trên V1.

Tài liệu này chốt phương án thiết kế từ bản 77 bảng người dùng gửi, [CDSLfinal.md](../archive/database/CDSLfinal.md), [sổ tay nghiệp vụ](../business/HUONG_DAN_LUONG_NGHIEP_VU_PAWPAL.md) và các migration hiện có. Cấu trúc V1 đã được triển khai trên local theo đặc tả vật lý liên kết ở trên; đây không phải chứng nhận tự động toàn bộ bảng đạt 3NF hoặc toàn bộ nghiệp vụ đã hoàn thành.

## 1. Quyết định tổng thể

1. Dùng PostgreSQL trong Supabase self-host; kết hợp Auth, RLS, RPC và API Pawpal để kiểm soát quyền và giao dịch.
2. Tách tài khoản đăng nhập khỏi hồ sơ khách và nhân viên. Khách tại quầy không bắt buộc có tài khoản đăng nhập.
3. Mỗi loại thông tin hiện tại có một nguồn chính. Giá, địa chỉ và nội dung đã giao dịch được lưu như sự kiện lịch sử riêng.
4. Danh sách có cấu trúc và được thao tác từng mục phải có bảng con. Đoạn văn ghi chú tự do không bị tách thành danh mục gò bó.
5. Số dư, điểm trung bình và tổng tiền được phân loại rõ là dữ liệu suy ra hoặc số liệu đã chốt, không mặc định mọi trường tổng hợp đều vi phạm 3NF.
6. Giữ chức năng chatbot, hotel, taxi và biên bản dịch vụ đang có; thanh toán dùng quan hệ trực tiếp với đơn hoặc lịch, không mở rộng sang phân bổ nhiều chứng từ.
7. Không xóa hoặc sửa database Supabase trong bước xác định thiết kế.

### Các giả định nghiệp vụ được chọn cho phiên bản 1

Đây là mặc định thiết kế có thể điều chỉnh trước khi triển khai, không phải yêu cầu đã được người dùng xác nhận từng chi tiết:

| Nội dung | Mặc định được chọn |
|---|---|
| Tài khoản khách và nhân viên | Hai phạm vi đăng nhập tách biệt; một người là nhân viên và khách sử dụng hai tài khoản riêng |
| Chủ nuôi | Một thú cưng có một chủ hiện tại; không lập bảng lịch sử đổi chủ hoặc hỗ trợ đồng sở hữu trong phiên bản 1 |
| Thanh toán | Có đặt cọc và thanh toán nhiều lần; mỗi lần thu thuộc đúng một đơn hoặc một lịch |
| Hạng thành viên | Xét theo chi tiêu đủ điều kiện đã thực thu và được ghi nhận, có trừ phần hoàn tương ứng; không đồng nhất với điểm có thể tiêu |
| Cửa hàng và tồn kho | Một cửa hàng với một kho chung; không quản lý nhiều chi nhánh hoặc nhiều kho |
| Đơn hàng giao nhận | Một đơn có một bộ thông tin giao nhận nằm ngay trong đơn; không quản lý bảng lượt giao, nhiều kiện hoặc giao từng phần |
| Đánh giá | Khách đã dùng dịch vụ/mua hàng mới được đánh giá; một đánh giá cho mỗi dòng mua/dòng dịch vụ |
| Phạm vi dịch vụ | Chỉ Spa/Grooming, khách sạn thú cưng, taxi và bán hàng; không có thú y, tiêm phòng, khám, chẩn đoán, kê đơn hoặc điều trị |

## 2. Ký hiệu và quy tắc chung

- `PK`: khóa chính; `FK`: khóa ngoại; `UQ`: khóa duy nhất; `?`: cho phép NULL.
- UUID cho định danh nghiệp vụ; mã hiển thị như mã đơn, mã thú cưng có `UQ`, không thay vai trò UUID.
- `created_at`, `updated_at` được bổ sung cho bảng có thể chỉnh sửa; sự kiện bất biến dùng thời điểm ghi nhận và thời điểm phát sinh phù hợp.
- Tiền dùng `numeric`, không dùng số thực dấu phẩy động; cân nặng và khoảng cách cũng dùng `numeric` có độ chính xác xác định.
- Lịch cụ thể dùng thời điểm bắt đầu/kết thúc có múi giờ; ngày sinh dùng `date`. Hiển thị theo múi giờ vận hành.
- Chuẩn hóa số điện thoại, email và mã trước khi kiểm tra duy nhất; không dùng chuỗi rỗng thay NULL.
- Khóa nghiệp vụ và quan hệ 1–1 cần `UNIQUE`, dù bảng đã có `id`.
- Không xóa dây chuyền lịch sử đơn hàng, thanh toán, điểm hoặc kiểm kho khi ngừng tài khoản/danh mục; dùng trạng thái và `RESTRICT` phù hợp.
- Mọi quy tắc phụ thuộc tổng nhiều dòng cần transaction và khóa/constraint trigger phù hợp; không đặt truy vấn chéo bảng vào `CHECK` của một dòng.

Tham chiếu kỹ thuật: [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html). `CHECK` cho phép kết quả NULL nên các trường bắt buộc vẫn phải có `NOT NULL`.

## 3. Tài khoản và phân quyền

```text
auth.users(id PK, ...) — bảng hạ tầng do Supabase Auth quản lý
permission(code PK, description)
access_role(code PK, role_name)
role_permission(role_code PK/FK, permission_code PK/FK)
staff_role(staff_id PK/FK, role_code PK/FK)
staff_permission(staff_id PK/FK, permission_code PK/FK)
```

- Supabase Auth quản lý danh tính, mật khẩu, token xác minh và phiên. Không tự tạo bảng tài khoản, phiên hoặc challenge thay thế; không chỉnh cấu trúc bảng Auth nội bộ bằng migration nghiệp vụ.
- `customer.auth_user_id` và `staff.auth_user_id` là FK duy nhất đến `auth.users.id`; khách tại quầy có thể chưa có liên kết Auth. Kiểm tra cổng khách/nhân viên theo hồ sơ liên kết và RLS, không tin role từ trình duyệt hoặc metadata do người dùng tự sửa.
- Hai cổng có vùng lưu phiên riêng như ứng dụng hiện tại. Nếu một người cần hai tài khoản tách biệt, thông tin đăng nhập phải phù hợp ràng buộc duy nhất của Supabase Auth; không giả định cùng một email có thể tạo hai danh tính chỉ vì khác cổng.
- Mật khẩu và trạng thái xác minh thuộc Auth. `staff.must_change_password` là yêu cầu nghiệp vụ sau cấp/reset mật khẩu, phải được API/RLS kiểm tra; không thay cho khóa tài khoản Auth. Thời điểm đăng nhập gần nhất đọc từ Auth qua máy chủ khi có quyền.
- `staff_permission` là quyền cấp thêm; không có cơ chế deny trong bản 1. Quyền hiệu lực là hợp các quyền vai trò và cấp thêm; mặc định không cấp quyền.
- Chức danh nghề nghiệp như KTV, lễ tân tách khỏi vai trò truy cập như quản trị hoặc kế toán.
- Khóa tài khoản phải thu hồi phiên và chặn kênh sự kiện, không chỉ ẩn giao diện.

## 4. Khách hàng, liên hệ và thành viên

```text
customer(id PK, auth_user_id? FK/UQ, customer_code UQ,
         contact_email?, customer_status, registered_at, note)
customer_profile(customer_id PK/FK, full_name, date_of_birth?, gender?)
customer_phone(id PK, customer_id FK, phone_number, is_primary, verified_at?)
customer_address(id PK, customer_id FK, receiver_name, receiver_phone,
                 province, street_address, postal_code?, is_default)
membership_tier(id PK, tier_name UQ, minimum_expenditure,
                discount_percent, description?, is_active)
customer_membership(customer_id PK/FK, membership_tier_id FK, assigned_at)
```

### Điện thoại và đăng nhập

- Bỏ cột lưu vật lý `customer.phone_main`; API/view có thể trả tên cũ bằng cách lấy dòng `is_primary` để hỗ trợ chuyển code.
- `UQ(customer_id, phone_number)` chống lặp số trong cùng hồ sơ.
- Một khách có đúng một số chính khi hồ sơ đã có số liên hệ. Partial unique index bảo đảm tối đa một; dịch vụ và deferred constraint trigger bảo đảm không còn 0 số chính sau transaction thay/xóa.
- Số chính duy nhất giữa các khách; số phụ dùng liên hệ người thân có thể được chia sẻ. Chỉ số chính đã xác minh được dùng đăng nhập bằng điện thoại.
- Số điện thoại liên hệ thuộc bảng nghiệp vụ; danh tính đăng nhập và trạng thái xác minh thuộc Supabase Auth. Khi đổi số đăng nhập, dùng luồng xác minh Auth hoặc endpoint xác minh đang có; không cập nhật trực tiếp bảng Auth để bỏ qua bước này. Dữ liệu liên hệ và Auth có ý nghĩa khác nhau, cần đồng bộ có kiểm soát.
- Email đăng nhập thuộc Supabase Auth; email nhận liên hệ ở `customer.contact_email`, có thể NULL. Hai trường có ý nghĩa khác nhau và không tự cập nhật lẫn nhau.
- Khách tạo nhanh có thể chưa có `auth_user_id`. Có hay chưa có tài khoản được suy ra từ liên kết này, không dùng thêm `is_temporary` cùng nghĩa. Nếu cần trạng thái hồ sơ chưa hoàn tất thì dùng `customer_status` riêng.

### Hồ sơ và địa chỉ

- `customer_profile.customer_id` dùng luôn làm PK, biểu diễn rõ một hồ sơ cho một khách; không cần thêm `id` thứ hai.
- Khách không có địa chỉ là hợp lệ; nếu có địa chỉ thì đúng một mặc định tại thời điểm transaction kết thúc.
- Partial unique index chỉ giải quyết tối đa một mặc định; thao tác xóa/đổi phải tự chọn địa chỉ thay thế hoặc xóa hết địa chỉ trong transaction hợp lệ.
- `receiver_phone` là số của người nhận tại địa chỉ, không bắt buộc trùng số chính của chủ tài khoản.
- Giữ địa chỉ dạng text có cấu trúc hiện tại; không tự tách danh mục địa giới khi chưa có yêu cầu quản lý mã địa giới.

### Điểm và hạng

- `paw_point_transaction` là sổ phát sinh cộng/trừ điểm có thể tiêu, có thứ tự ghi nhận theo khách và khóa chống phát sinh trùng.
- Chi tiêu xét hạng được tính từ các lần thu thành công, trừ phần hoàn thành công đủ điều kiện. `payment.eligible_spend_amount` và `refund_transaction.eligible_refund_amount` ghi giá trị đủ điều kiện đã chốt, tách khỏi tổng tiền thực thu/hoàn. Không cần sổ chi tiêu xét hạng riêng.
- Phần đủ điều kiện của lần thu không vượt `amount`; phần hoàn giảm chi tiêu không vượt số tiền thực hoàn hoặc phần đủ điều kiện chưa hoàn của lần thu gốc. Tiền cọc chỉ được ghi nhận đủ điều kiện khi hàng/dịch vụ được hoàn tất theo chính sách; lần cập nhật phải có audit và không cộng lại khi chạy lại tác vụ.
- Bỏ `total_paw_points` và `tier_points` khỏi bảng lõi `customer_membership`; cung cấp bằng view. Nếu hiệu năng cần cache, dùng bảng tổng hợp có cơ chế tái tính/đối soát riêng.
- `customer_membership.membership_tier_id` là hạng hiện tại, `assigned_at` ghi thời điểm gán. Không lập bảng lịch sử hạng riêng; thay đổi quan trọng được ghi trong audit chung. Sửa ngưỡng danh mục không tự đổi hạng cho đến khi tác vụ xét hạng thực hiện.
- `balance_after` là giá trị đối soát lịch sử tùy chọn, thuộc lớp dữ liệu phi chuẩn hóa có chủ đích; nếu giữ phải ghi cùng transaction và không được sửa độc lập.

## 5. Thú cưng và theo dõi chăm sóc

```text
pet_species(id PK, species_name UQ, is_active)
pet_breed(id PK, species_id FK, breed_name, is_active)
pet_profile(id PK, pet_code UQ, customer_id FK, breed_id FK, pet_name,
            avatar_url?, gender?, date_of_birth?, color?, routine?,
            allergy?, safety_note?, status)
pet_weight_history(id PK, pet_id FK, weight, measured_at,
                   recorded_by? FK, note?)
```

- `UQ(species_id, breed_name)`; tên giống có ý nghĩa trong phạm vi loài. Không buộc mọi loài dùng chung danh sách giống.
- Mỗi loài có một giống quy ước “Chưa xác định” trong danh mục để ghi nhận thú cưng chưa rõ giống; không đưa mục này vào gợi ý như giống thực tế. `breed_id` bắt buộc, từ đó suy ra loài, không lưu thêm `species_id` ở thú cưng.
- Nếu form nhận giống nhập tự do, API tạo hoặc đối chiếu giống thuộc loài đã chọn; không tự gán giống sang loài khác.
- Bỏ `pet_profile.weight` vật lý; cân hiện tại lấy theo `measured_at DESC, created_at DESC, id`, ghi nhận muộn không ghi đè lần đo mới hơn. Không thiết kế bảng hoặc trường theo dõi tiêm phòng.
- Ghi chú dị ứng, tập tính và an toàn giữ dạng text tự do. Không coi các dấu phẩy trong lời ghi chú là danh sách thực thể phải tách.
- Nhật ký chỉ ghi nhận tình trạng quan sát khi chăm sóc như da, lông, hành vi và sinh hoạt. Không có bệnh án, chẩn đoán, đơn thuốc hoặc lịch điều trị. Lưu trú dùng ghi chú chăm sóc và chế độ ăn, không quản lý cho thuốc hoặc theo dõi y tế.
- Không lưu `recorded_by_name` như tên hiện tại của nhân viên. Lấy qua FK; nếu cần tên tại thời điểm ghi thì đặt rõ `recorded_by_name_snapshot`.
- Khi đổi chủ, đơn/lịch cũ vẫn giữ khách đã đặt tại thời điểm phát sinh. Không bắt lịch sử phải khớp chủ hiện tại; lúc tạo lịch mới phải xác minh quyền chủ nuôi.

## 6. Danh mục dịch vụ và thực hiện ca

- Thêm `service_category(id PK, category_code UQ, category_name)`; `service` tham chiếu `category_id`, không lặp tên nhóm.
- `service_supported_pet_type` đổi thành `service_supported_species(service_id PK/FK, species_id PK/FK)`.
- `service_image` giữ ảnh bổ sung. Ảnh đại diện lưu cùng bảng ảnh với cờ `is_thumbnail`; API suy ra `thumbnail_url`, không lưu thêm nguồn ảnh đại diện độc lập ở `service`.
- `benefits` giữ text giới thiệu; `service.amenities` và `hotel_room_type.amenities` là đoạn mô tả tiện ích tự do để hiển thị. Không quản lý danh mục, lọc hoặc liên kết từng tiện ích riêng; không dùng nội dung text này làm danh sách mã để xử lý nghiệp vụ.
- `care_action` là loại thao tác độc lập; thêm `service_care_action(service_id PK/FK, care_action_id PK/FK, display_order, estimated_duration)` làm checklist mẫu. Bỏ `care_action.service_category` và `service_id` lặp.
- `care_log` giữ sự kiện thao tác thực tế của ca; `care_log_media` giữ ảnh/video của từng sự kiện. Checklist mẫu thay đổi không sửa nội dung đã ghi.
- Cấp độ kỹ thuật viên chỉ có một danh mục `staff_level`; bỏ cặp trường cùng nghĩa `groomer_level`/`staff_level_required`, giữ FK cấp độ tối thiểu tại dịch vụ.
- `service_price_matrix` dùng khoảng cân nặng nửa kín `[from, to)` và khoảng hiệu lực; không cho hai mức giá cùng dịch vụ chồng cả cân nặng lẫn thời gian.
- `taxi_price_rule` áp dụng cùng nguyên tắc cho khoảng km, cân nặng và hiệu lực; thêm phạm vi dịch vụ nếu có nhiều gói taxi khác nhau.
- `appointment` giữ khách đặt, thú cưng, mã ca, thời gian dự kiến, trạng thái và ghi chú. Dịch vụ thực tế lưu ở `appointment_item` với FK dịch vụ hoặc addon, đúng một nguồn cho mỗi dòng.
- Bỏ nguồn chính `appointment.service_id` khi đã có nhiều dòng dịch vụ; API có thể trả “dịch vụ chính” từ dòng được đánh dấu rõ ràng, tối đa một dòng chính.
- Người phụ trách ca nằm ở `appointment.staff_id`; KTV thực hiện một dòng nằm ở `appointment_item.staff_id`. Đây là hai trách nhiệm có thể khác nhau.
- Giá, tên gói, thời lượng và cân nặng tính giá được lưu snapshot theo dòng; sửa danh mục không đổi ca đã chốt.
- Giữ `appointment_adjustment`, `appointment_record` và `taxi_trip` từ thiết kế mở rộng hiện có; chuyển nội dung biên bản quan trọng cần truy vấn thành cột/bảng con. Metadata bổ trợ không thay thế các FK và số tiền nghiệp vụ.
- `hotel_booking.appointment_id` là FK duy nhất; chỉ lưu thông tin lưu trú riêng, suy ra khách và thú cưng qua lịch hẹn thay vì lặp hai FK cùng nghĩa. Trạng thái phòng khác trạng thái ca, nhưng trạng thái thanh toán được suy ra từ khoản thu.
- Giá phòng tại thời điểm ở là snapshot. Chống trùng đặt cùng phòng trong khoảng lưu trú có hiệu lực; phiên bản 1 mỗi phòng có một booking cho một thú cưng tại một thời điểm. Ghép nhiều thú cưng trong một booking cần mô hình bảng thành viên lưu trú riêng và chưa thuộc mặc định này; `capacity` không tự cho phép tạo booking chồng phòng.
- Quan hệ ticket nằm ở `support_ticket.appointment_id`; bỏ chiều FK `appointment.support_ticket_id` để tránh hai chiều lưu cùng một liên kết. Một ca có thể có nhiều ticket.

## 7. Sản phẩm, mua hàng, tồn kho và đổi trả

- Giữ các bảng sản phẩm, biến thể, màu, size, hương vị. Thương hiệu là thuộc tính text `product.brand_name`, không có danh mục thương hiệu riêng trong phạm vi hiện tại.
- Giữ mô hình ba thuộc tính biến thể cho phạm vi hiện tại; SKU duy nhất, barcode duy nhất khi có; tổ hợp `(product_id, color_id, size_id, flavor_id)` không trùng, kể cả trường hợp NULL.
- `product_media` là ảnh chung của sản phẩm; `product_variant_media` là ảnh riêng của biến thể. Hai phạm vi khác nhau được giữ, không đồng bộ bản sao ảnh giữa hai bảng.
- Mỗi phạm vi ảnh tối đa một ảnh đại diện. Không có ảnh riêng biến thể thì giao diện dùng ảnh chung theo quy tắc đọc.
- `min_price`, `rating`, `review_count` nằm ở view/tổng hợp, không là thuộc tính nhập tay của sản phẩm/dịch vụ.
- `cart_item` có `UQ(cart_id, product_variant_id)`. Giá trong giỏ chỉ là báo giá; máy chủ tính và xác nhận lại khi tạo đơn.
- Một wishlist cho mỗi khách; tách `wishlist_product(wishlist_id PK/FK, product_id PK/FK)` và `wishlist_service(wishlist_id PK/FK, service_id PK/FK)` thay hai FK tùy chọn trong một dòng.
- `sales_order_detail` giữ `product_variant_id`, tên/SKU snapshot, số lượng, đơn giá đã bán và giảm giá được phân bổ. `subtotal` là biểu thức/view, không cho nhập độc lập.
- Địa chỉ lúc đặt nằm ngay trong `sales_order`: `receiver_name_snapshot`, `receiver_phone_snapshot`, `province_snapshot`, `street_address_snapshot`, `postal_code_snapshot`. Sổ địa chỉ hiện tại không thay đổi các giá trị lịch sử này; đơn nhận tại quầy không cần địa chỉ giao.
- Mỗi đơn có một bộ thông tin giao nhận ngay trong `sales_order`: `delivery_option_id`, `shipping_provider_id`, `tracking_code`, `shipped_at`, `delivered_at`, `shipping_status`. Không quản lý nhiều lượt giao cho một đơn. Phí giao đã chốt giữ ở `shipping_fee_snapshot`, không lấy lại phí cấu hình mới.
- `purchase_order_detail` tham chiếu biến thể. Mỗi lần nhập thực tế ghi một `inventory_transaction` liên kết `purchase_order_detail_id`; có số lượng, nhân viên và thời điểm phát sinh. Không quản lý chứng từ nhận hàng riêng; số lượng đã nhận được tính từ các bút toán nhập mua đã ghi sổ và các bút toán đảo tương ứng.
- `inventory_transaction` là sổ nhập/xuất có dấu và nguồn chứng từ rõ ràng cho kho chung của cửa hàng. `inventory` là bảng số dư tổng hợp với `UQ(product_variant_id)`, mỗi biến thể có tối đa một dòng tồn; không phải sổ gốc.
- Tồn khả dụng = tồn thực tế − lượng giữ còn hiệu lực. `stock_reservation` giữ số lượng và hạn; khi chuyển từ giỏ sang đơn phải chuyển nguồn giữ trong cùng transaction, không tạo hai lượt giữ cho cùng lượng hàng.
- `quantity_reserved`, `stock_before`, `stock_after` nếu lưu là dữ liệu đối soát có chủ đích; chỉ cập nhật qua nghiệp vụ và kiểm tra định kỳ với sổ gốc.
- `return_request_detail` tham chiếu `sales_order_detail_id`, không chọn biến thể độc lập. Không cho tổng số đã nhận trả vượt số lượng dòng bán.
- Giá hoàn căn cứ dòng đã mua và mức giảm đã phân bổ; không lấy `product_variant.sale_price` hiện tại.
- Quyết định hoàn tiền và quyết định nhập lại kho là hai nghiệp vụ riêng. Không tự nhập lại kho chỉ vì yêu cầu hoàn tiền đã được duyệt.

## 8. Thanh toán, hoàn tiền, voucher và đánh giá

### Thanh toán và hoàn tiền

- `payment` là lần thu tiền: khách, mã thu duy nhất, phương thức, số tiền, trạng thái, thời điểm thành công, mã giao dịch ngoài và khóa chống gửi lặp.
- Giữ `order_id` hoặc `appointment_id` làm liên kết chứng từ của `payment`. Bỏ `voucher_id`, `paw_points_used`, `paw_points_earned` khỏi vai trò nguồn chính của khoản thu; khoản giảm thuộc chứng từ, phát sinh điểm thuộc sổ điểm.
- `payment` có `order_id` và `appointment_id`, bắt buộc đúng một FK có giá trị. Một lần thu chỉ thuộc một đơn hoặc một lịch; kiểm tra khách của khoản thu khớp khách của chứng từ.
- Một đơn hoặc lịch có thể có nhiều lần thu để hỗ trợ đặt cọc và thanh toán phần còn lại. Kiểm tra tổng thu còn hiệu lực trong transaction, không thu vượt số phải trả. Không dùng ID nguồn không có FK cho tiền.
- Hotel được thanh toán qua lịch liên quan, không thêm một đích đặt phòng riêng gây tính hai lần.
- `refund_transaction.payment_id` trỏ trực tiếp lần thu cần hoàn. Mỗi lần hoàn có đúng một nguồn thu; tổng hoàn thành công không vượt số đã thu của nguồn đó. Khóa và kiểm tra trong transaction để chống hai phiên hoàn cùng lúc.
- `refund_transaction.return_request_id` là FK có thể NULL khi hoàn không liên quan trả hàng. Một yêu cầu trả có thể có nhiều lần hoàn; một lần hoàn chỉ gắn tối đa một yêu cầu. Nguồn thu phải thuộc đúng đơn của yêu cầu trả. Không lưu FK hoàn tiền duy nhất ngược ở `return_request`.
- Trạng thái thanh toán của đơn/lịch/hotel là view hoặc projection được kiểm soát, không có ba màn hình tự ghi ba trạng thái độc lập.
- Không thay đổi khoản thu/hoàn đã ghi sổ để sửa sai; tạo bút toán điều chỉnh tương ứng và audit.

### Voucher và khuyến mãi

- `voucher` giữ quy tắc và mã duy nhất; `customer_voucher` là từng lượt phát hành, không ép `UQ(customer_id, voucher_id)` vì một khách có thể nhận nhiều lượt cùng mẫu.
- Thêm `voucher_redemption` liên kết lượt sử dụng với `customer_voucher_id?`, `voucher_id`, đúng một đơn/lịch và số tiền giảm snapshot. Mã công khai có thể không có lượt phát hành cá nhân.
- Mỗi `customer_voucher` tối đa một redemption chưa bị đảo/hủy. `voucher.usage_count` tính từ lượt dùng hợp lệ, nếu cache phải đối soát và khóa khi kiểm tra quota.
- `expired_at` của lượt phát hành là hạn đã cấp nếu có chính sách riêng, không phải trạng thái “đã hết hạn” do đồng hồ tự cập nhật.
- Giữ `promotion_product`, `promotion_service`; thêm khóa duy nhất theo cặp FK. Mức giảm áp dụng vào chứng từ được lưu khi chốt, không tính lại từ chương trình đã sửa.

### Đánh giá

- `review` liên kết đúng một `sales_order_detail_id` hoặc `appointment_item_id`; mỗi nguồn tối đa một đánh giá, rating trong 1–5.
- Người đánh giá suy từ khách của chứng từ. Nếu API nhận customer ID thì kiểm tra khớp, không lưu cột khách như một giá trị độc lập có thể mâu thuẫn.
- Sản phẩm/dịch vụ được suy ra từ dòng giao dịch; bỏ các FK `product_id`, `service_id` cùng nghĩa ở review lõi.
- Chỉ dùng `review_response` cho phản hồi cửa hàng; bỏ `shop_reply`. Có thể lưu nhiều lượt phản hồi kèm người viết và thời điểm.
- Giữ `review_media`; không đưa danh sách URL ảnh vào một chuỗi.

## 9. Hỗ trợ, chat, thông báo và nhật ký

- `support_ticket.customer_id` xác định khách liên quan nếu đã nhận diện. `created_by_account_id?` là tài khoản lập ticket, khác khách được phản ánh; bỏ `user_id` mơ hồ.
- Chọn `subject` là tiêu đề ticket, không lưu thêm `title` cùng nghĩa. `type`, `category`, `channel` chỉ giữ khi được định nghĩa thành các chiều phân loại khác nhau.
- Ticket cho phép liên kết đơn và/hoặc lịch nếu sự việc liên quan cả hai; xác minh các nguồn thuộc khách liên quan, không ép XOR khi nghiệp vụ không yêu cầu.
- `support_ticket_message` và `chat_message` dùng FK người gửi có đích rõ: tài khoản nhân viên/khách hoặc phiên khách vãng lai; hệ thống/bot có loại người gửi riêng. Không dùng một UUID tùy ý trỏ được sang nhiều bảng.
- Tên người gửi lấy qua quan hệ; nếu cần giữ tên lúc gửi, cột phải có hậu tố `_snapshot` và không được cập nhật theo hồ sơ hiện tại.
- Phiên khách vãng lai có bảng `guest_session`, token dạng hash, hết hạn và thu hồi; không bắt khách vãng lai có hồ sơ customer giả.
- Nội dung gốc/phần đã kiểm duyệt của tin nhắn là hai phiên bản có ý nghĩa riêng; hạn chế quyền đọc bản gốc.
- Giữ `support_ticket_message_attachment`, `return_request_evidence` và các bảng media; FK đúng đối tượng, có thứ tự và metadata file cần thiết.
- `notification` giữ các FK đơn/lịch/ticket/hoàn tiền; nếu dùng `related_entity_type` thì suy ra từ FK thay vì một cột chọn tay có thể mâu thuẫn. Không ép chỉ một FK nếu thông báo cần ngữ cảnh nhiều thực thể.
- Trạng thái đã đọc suy ra từ `read_at`; bỏ `is_read` lưu lặp.
- `audit_log` có thể giữ tên loại thực thể và ID không có FK để truy vết cả đối tượng đã xóa; đây là nhật ký, không dùng quan hệ mềm này cho sổ tiền hoặc kiểm tra quyền sở hữu.

## 10. Nhân sự và lịch làm

- `staff` giữ hồ sơ công việc, trạng thái việc làm, chuyên môn và `auth_user_id`. Không lưu mật khẩu hoặc bản sao thời điểm đăng nhập. Giữ `must_change_password` làm cờ bắt buộc đổi mật khẩu công vụ, khác trạng thái Auth và có kiểm tra phía máy chủ.
- `role` nghề nghiệp và vai trò quyền truy cập có tên riêng trong API; không giữ `system_role` text như một nguồn cấp quyền song song với `staff_role`.
- Bỏ `staff.shift` nếu biểu diễn lịch trực hiện tại; lịch thực tế nằm ở `staff_schedule`. Nếu bổ sung lịch mẫu, tạo bảng riêng và đặt rõ đó là mẫu.
- `staff_schedule` giữ khoảng làm việc tại cửa hàng, chống chồng ca của cùng nhân viên trong các trạng thái có hiệu lực. Vắng mặt và nghỉ phép liên kết quyết định được duyệt, không chỉ sửa nhãn UI.
- `staff_shift_request.created_by`, `reviewed_by` tham chiếu `auth.users.id`; người đổi ca/người thay vẫn tham chiếu hồ sơ staff.
- Giữ `staff_assessment` từ migration mở rộng; `skill_score` là kết quả tổng hợp, không là điểm nhập tay cùng nghĩa với đánh giá chi tiết.
- Toàn bộ nhân sự, ca làm, phòng lưu trú, đơn và lịch hẹn thuộc cửa hàng hiện tại. Không cần bảng định danh cơ sở hoặc địa điểm kho; thông tin liên hệ chung của cửa hàng dùng cấu hình hệ thống.

## 11. Phạm vi giữ lại và bảng bổ sung

| Nhóm từ bản 77 bảng | Quyết định |
|---|---|
| Khách, liên hệ, hạng, điểm | Giữ nghiệp vụ; áp dụng mô hình tại mục 3–4 |
| Thú cưng, lịch cân | Giữ và bổ sung danh mục loài/giống; chỉ giữ chủ hiện tại và phục vụ chăm sóc, lưu trú |
| Dịch vụ, addon, giá, hotel, taxi và nhật ký | Giữ; bổ sung các dòng ca, chuyến, biên bản và điều chỉnh đã có trong migration mở rộng |
| Nhà cung cấp, mua hàng, sản phẩm, biến thể và kho | Giữ; ghi nhập hàng trực tiếp vào sổ kho, thương hiệu là text của sản phẩm |
| Giỏ, wishlist, đơn, vận chuyển và đổi trả | Giữ; địa chỉ lịch sử và thông tin giao nhận nằm ngay trong đơn |
| Thu/hoàn, voucher, khuyến mãi và đánh giá | Giữ; mỗi lần thu gắn một đơn/lịch, mỗi lần hoàn gắn một lần thu bằng FK thật |
| Nhân sự, ca, yêu cầu nghỉ/đổi ca, quyền | Giữ; tách danh tính và vai trò truy cập |
| Banner, blog, danh mục blog, setting và audit | Giữ; mã/slug/setting key có khóa duy nhất theo phạm vi |
| Ảnh và tệp đính kèm mới trong bản gửi | Giữ; phân biệt ảnh chung/biến thể và chủ sở hữu file |
| Chatbot và vector đang có trong CDSLfinal | Giữ đầy đủ phạm vi, không loại ngầm khi chuyển nền tảng |

Các đối tượng cần giữ từ bản cũ nhưng chưa xuất hiện trong bản gửi: `chatbot_sentiment_tier`, `chatbot_sentiment_trigger`, `chatbot_sentiment_action`, `chatbot_compensation_policy`, `chatbot_handover_rule`, `chatbot_knowledge_faq`, `chatbot_system_prompt`, `chatbot_canned_response`, `chatbot_profanity_filter`, `chatbot_scenario_matrix`, `document_embeddings`. Giữ thêm `admin_copilot_history`, `chat_feedback` và các phần mở rộng đang phục vụ chức năng thực tế sau khi kiểm kê.

`staff_public_view` là view với danh sách cột công khai được cho phép, không phải bản sao bảng nhân viên. `api_keys` chuyển sang secret môi trường hoặc kho secret phía máy chủ; database chỉ giữ metadata và tham chiếu secret nếu cần, không có bảng khóa bí mật được giao diện đọc.

Tên bảng lõi không đổi nếu không có lý do nghiệp vụ. Các trường không bị thay trong tài liệu này được giữ ý nghĩa từ bản nguồn, nhưng vẫn phải khai báo kiểu, NULL, FK và khóa duy nhất khi lập từ điển dữ liệu đầy đủ.

## 12. Phân biệt lõi chuẩn hóa, lịch sử và projection

| Loại | Ví dụ | Cách quản lý |
|---|---|---|
| Lõi quan hệ chuẩn hóa | Khách, số điện thoại, loài/giống, danh mục, dòng giao dịch và các quan hệ nối | Khóa ứng viên, phụ thuộc hàm và FK được đặc tả |
| Sự kiện lịch sử | Giá bán đã chốt, địa chỉ khi đặt, tên tại thời điểm gửi nếu cần | Bất biến sau chốt hoặc có phiên bản/điều chỉnh; khác nghĩa với dữ liệu hiện tại |
| Giá trị suy ra | Tổng dòng, giá thấp nhất, số đánh giá, trạng thái đã đọc | View/biểu thức trước; không nhập tay |
| Projection vận hành | Tồn hiện tại, điểm khả dụng, rating cache, trạng thái thanh toán cache | Chỉ thêm khi đo hiệu năng; có nguồn gốc, cập nhật nguyên tử và tái dựng được |

Không gọi tất cả dữ liệu trùng là lỗi 3NF. Ví dụ snapshot giá không phải bản sao “giá hiện tại”; nhưng lưu cả `breed_id` và loài suy ra cùng nghĩa sẽ tạo dư thừa. Tổng hợp nhiều dòng là bài toán nhất quán, không tự động là phụ thuộc hàm vi phạm 3NF trong một bảng.

## 13. Ràng buộc và bằng chứng cần có trước SQL triển khai

- Lập từ điển từng bảng: thuộc tính, kiểu, NULL/default, PK, mọi khóa ứng viên, FK và ý nghĩa nghiệp vụ.
- Ghi các phụ thuộc hàm ngoài khóa `id`; chứng minh các bảng lõi không có phụ thuộc vi phạm 3NF theo quy tắc đã chọn. Nếu tách bảng, kiểm tra nối không mất mát và khả năng bảo toàn phụ thuộc.
- Partial unique index cho tối đa một điện thoại chính/địa chỉ mặc định/ảnh đại diện; ràng buộc “phải có một” cần cơ chế riêng. [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html).
- Constraint chống khoảng giá, đặt phòng và lịch làm chồng lấn; kiểm tra khả năng cần extension và mô hình range trước khi chọn cú pháp SQL.
- Transaction và khóa cho chuyển số chính, đổi chủ, dùng voucher, giữ/xuất tồn, ghi nhận thu/hoàn và phát sinh điểm.
- Kiểm thử đồng thời, không chỉ thử tuần tự từ UI. Kiểm thử dựng từ database rỗng và khôi phục bản sao có chạy lại constraint.
- Chỉ sau bước này mới cập nhật `CDSLfinal.md` thành từ điển cấu trúc chính thức và viết migration mới. Tài liệu hiện tại ghi quyết định logic, không tuyên bố đã kiểm chứng 3NF cho toàn bộ schema.

## 14. Thứ tự thực hiện tiếp theo

1. Lập từ điển đầy đủ cho nhóm tài khoản–khách hàng–thú cưng theo các quyết định trên.
2. Vẽ ERD nhóm này và đặc tả khóa/phụ thuộc; kiểm tra đăng nhập tách cổng, khách tại quầy và đổi chủ.
3. Làm tiếp nhóm dịch vụ–lịch hẹn và sản phẩm–kho–đơn hàng.
4. Chốt từ điển và phép thử tiền–điểm–hoàn tiền trước khi dựng chức năng ghi giao dịch.
5. Hoàn tất các nhóm còn lại, ma trận thay thế cột/API cũ và migration PostgreSQL.

Không cần mật khẩu Supabase để hoàn thiện thiết kế logic. Nếu kết nối được nguồn cũ sau đó, dùng metadata để kiểm kê chênh lệch, không dùng schema cũ để ghi đè các quyết định thiết kế mới mà không đối chiếu nghiệp vụ.

Schema V1 và đặc tả vật lý đã được tạo và kiểm tra trên local; xem [kết quả triển khai](PAWPAL_DATABASE_V1_TRIEN_KHAI.md). Các bước 1–5 trên là trình tự thiết kế ban đầu; phần tiếp tục hiện tại là sửa các lời gọi tương ứng và nghiệm thu từng luồng nghiệp vụ trên V1. Không coi các kiểm thử giao diện baseline trước đây là nghiệm thu giao diện V1.


## 15. Bảng CSDL theo thiết kế V1

Bảng dưới mô tả **105 thực thể lưu trữ** và **906 thuộc tính** của phương án V1, đã được tạo trên Supabase local ngày 21/10/2026. Mỗi thuộc tính nằm trên một dòng; STT, tên và mô tả thực thể chỉ ghi ở dòng đầu của thực thể đó. PK ghép gồm toàn bộ các thuộc tính được đánh dấu PK ghép.

Các cột UQ biểu diễn khóa duy nhất đơn; khóa duy nhất theo tổ hợp, điều kiện NULL và quy tắc chéo dòng vẫn áp dụng theo mục 3–13. Kiểu dữ liệu và NULL/default triển khai nằm trong [đặc tả vật lý](PAWPAL_DATABASE_V1_DAC_TA_VAT_LY.md); các quy trình chưa nghiệm thu được ghi trong báo cáo triển khai. Bảng này không thay cho chứng minh phụ thuộc hàm hoặc kiểm thử toàn bộ luồng nghiệp vụ.

Số lượng trên chỉ tính các bảng nghiệp vụ Pawpal đề xuất. Các bảng hạ tầng do Supabase quản lý trong schema `auth`, `storage` và các schema nội bộ không được tính vào đây; FK tới `auth.users.id` là tham chiếu hợp lệ ra ngoài danh mục bảng nghiệp vụ.

Không liệt kê các giá trị suy ra như phone_main, cân nặng hiện tại, subtotal, rating, review_count, số dư điểm hoặc trạng thái thanh toán như cột nhập tay. Riêng inventory là bảng tổng hợp vận hành có kiểm soát đã được phân biệt tại mục 12. Các view công khai, view thống kê và secret môi trường không được tính là bảng lõi.

| **STT** | **THỰC THỂ** | **MÔ TẢ** | **THUỘC TÍNH** | **Ý NGHĨA THUỘC TÍNH** |
| :-----: | :----------: | :-------: | :------------: | :--------------------: |
| 1 | `guest_session` | Định danh phiên khách vãng lai mà không tạo hồ sơ khách giả. | `id` (PK) | Mã phiên khách vãng lai. |
|  |  |  | `token_hash` (UQ) | Giá trị băm token truy cập phiên, duy nhất. |
|  |  |  | `expires_at` | Thời điểm hết hạn phiên. |
|  |  |  | `revoked_at` | Thời điểm thu hồi phiên; có thể NULL. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 2 | `permission` | Danh mục các quyền thao tác được máy chủ kiểm tra. | `code` (PK) | Mã quyền duy nhất, dùng làm khóa chính. |
|  |  |  | `description` | Nội dung và phạm vi thao tác được cấp quyền. |
| 3 | `access_role` | Danh mục vai trò truy cập, độc lập chức danh nghề nghiệp. | `code` (PK) | Mã vai trò truy cập, dùng làm khóa chính. |
|  |  |  | `role_name` | Tên hiển thị của vai trò. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 4 | `role_permission` | Liên kết nhiều quyền với nhiều vai trò truy cập. | `role_code` (PK ghép; FK → access_role.code) | Vai trò được gán quyền; cùng permission_code tạo khóa chính. |
|  |  |  | `permission_code` (PK ghép; FK → permission.code) | Quyền thuộc vai trò; cùng role_code tạo khóa chính. |
| 5 | `staff_role` | Gán các vai trò truy cập cho nhân viên. | `staff_id` (PK ghép; FK → staff.id) | Nhân viên được gán vai trò; cùng role_code tạo khóa chính. |
|  |  |  | `role_code` (PK ghép; FK → access_role.code) | Vai trò truy cập được gán; cùng staff_id tạo khóa chính. |
| 6 | `staff_permission` | Cấp thêm quyền trực tiếp cho nhân viên, không biểu diễn quyền từ chối. | `staff_id` (PK ghép; FK → staff.id) | Nhân viên nhận quyền; cùng permission_code tạo khóa chính. |
|  |  |  | `permission_code` (PK ghép; FK → permission.code) | Quyền được cấp thêm; cùng staff_id tạo khóa chính. |
| 7 | `customer` | Hồ sơ nghiệp vụ khách hàng, có thể được tạo tại quầy trước khi có tài khoản. | `id` (PK) | Mã định danh khách hàng. |
|  |  |  | `auth_user_id` (FK → auth.users.id; UQ) | Tài khoản đăng nhập liên kết duy nhất; NULL nếu khách chưa đăng ký. |
|  |  |  | `customer_code` (UQ) | Mã khách hàng dùng tra cứu và hiển thị, duy nhất. |
|  |  |  | `customer_status` | Trạng thái hồ sơ nghiệp vụ, độc lập trạng thái tài khoản đăng nhập. |
|  |  |  | `registered_at` | Thời điểm khách được ghi nhận vào hệ thống. |
|  |  |  | `note` | Ghi chú nội bộ về khách hàng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `contact_email` | Email nhận liên hệ của khách; có thể NULL và không tự thay đổi email đăng nhập. |
| 8 | `customer_profile` | Lưu một hồ sơ cá nhân cho mỗi khách hàng. | `customer_id` (PK; FK → customer.id) | Khách sở hữu hồ sơ; đồng thời là khóa chính và khóa ngoại. |
|  |  |  | `full_name` | Họ tên khách hàng. |
|  |  |  | `date_of_birth` | Ngày sinh, có thể chưa cung cấp. |
|  |  |  | `gender` | Giới tính do khách cung cấp, có thể chưa xác định. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 9 | `customer_phone` | Lưu các số điện thoại liên hệ và số chính dùng xác minh đăng nhập. | `id` (PK) | Mã số liên hệ. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng sở hữu số liên hệ. |
|  |  |  | `phone_number` | Số điện thoại đã chuẩn hóa; không trùng trong cùng khách. |
|  |  |  | `is_primary` | Đánh dấu số chính; số chính không được dùng cho nhiều khách. |
|  |  |  | `verified_at` | Thời điểm xác minh số điện thoại thành công; NULL khi chưa xác minh. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 10 | `customer_address` | Lưu nhiều địa chỉ giao hàng, đón trả thú cưng hoặc địa chỉ đặt hộ của khách hàng | `id` (PK) | Mã định danh địa chỉ |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng sở hữu địa chỉ |
|  |  |  | `receiver_name` | Tên người nhận tại địa chỉ |
|  |  |  | `receiver_phone` | Số điện thoại người nhận |
|  |  |  | `province` | Tỉnh hoặc thành phố của địa chỉ |
|  |  |  | `street_address` | Địa chỉ chi tiết |
|  |  |  | `postal_code` | Mã bưu chính |
|  |  |  | `is_default` | Cho biết đây có phải địa chỉ mặc định hay không |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 11 | `membership_tier` | Lưu cấu hình các hạng thành viên như Bạc, Vàng, Kim Cương | `id` (PK) | Mã định danh hạng thành viên |
|  |  |  | `tier_name` (UQ) | Tên hạng thành viên |
|  |  |  | `minimum_expenditure` | Mức chi tiêu tối thiểu để đạt hạng |
|  |  |  | `discount_percent` | Tỷ lệ giảm giá của hạng |
|  |  |  | `description` | Quyền lợi của hạng thành viên |
|  |  |  | `is_active` | Hạng thành viên có đang áp dụng hay không |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 12 | `customer_membership` | Lưu hạng thành viên hiện đang được gán; không lưu số dư điểm lặp. | `customer_id` (PK; FK → customer.id) | Khách được gán hạng; đồng thời là khóa chính và khóa ngoại. |
|  |  |  | `membership_tier_id` (FK → membership_tier.id) | Hạng hiện tại được gán theo chính sách xét hạng. |
|  |  |  | `assigned_at` | Thời điểm hạng hiện tại bắt đầu được áp dụng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 13 | `reward_rule` | Lưu quy tắc cộng hoặc trừ Paw Points theo từng sự kiện như đăng ký, đặt lịch, mua hàng, đánh giá hoặc chương trình khuyến mãi | `id` (PK) | Mã định danh quy tắc |
|  |  |  | `rule_name` | Tên quy tắc thưởng |
|  |  |  | `reward_type` | Loại phần thưởng |
|  |  |  | `trigger_event` | Sự kiện làm phát sinh phần thưởng |
|  |  |  | `reward_value` | Giá trị phần thưởng |
|  |  |  | `description` | Mô tả cách áp dụng quy tắc |
|  |  |  | `is_active` | Quy tắc có đang áp dụng hay không |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 14 | `paw_point_transaction` | Lưu toàn bộ lịch sử cộng, trừ và quy đổi Paw Point | `id` (PK) | Mã định danh giao dịch điểm |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng phát sinh giao dịch điểm |
|  |  |  | `payment_id` (FK → payment.id) | Giao dịch thanh toán liên quan |
|  |  |  | `review_id` (FK → review.id) | Đánh giá làm phát sinh điểm |
|  |  |  | `reward_rule_id` (FK → reward_rule.id) | Quy tắc tạo giao dịch điểm |
|  |  |  | `points` | Số điểm cộng hoặc trừ |
|  |  |  | `description` | Lý do phát sinh giao dịch điểm |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `refund_transaction_id` (FK → refund_transaction.id) | Lần hoàn tiền liên quan khi cần hoàn hoặc thu hồi điểm. |
|  |  |  | `voucher_redemption_id` (FK → voucher_redemption.id) | Lượt dùng voucher liên quan nếu làm phát sinh điểm. |
|  |  |  | `customer_voucher_id` (FK → customer_voucher.id) | Lượt phát hành voucher nhận bằng đổi điểm, nếu có. |
|  |  |  | `idempotency_key` (UQ) | Khóa duy nhất ngăn một nghiệp vụ cộng hoặc trừ điểm nhiều lần. |
|  |  |  | `sequence_no` | Thứ tự ghi sổ tăng dần trong phạm vi từng khách. |
| 15 | `voucher` | Lưu danh mục voucher có thể phát hành hoặc | `id` (PK) | Mã định danh voucher |
|  |  |  | `voucher_code` (UQ) | Mã voucher khách hàng nhập khi sử dụng |
|  |  |  | `voucher_name` | Tên voucher |
|  |  |  | `discount_value` | Giá trị giảm giá |
|  |  |  | `minimum_order_amount` | Giá trị đơn tối thiểu để dùng voucher |
|  |  |  | `required_points` | Số Paw Points cần để đổi voucher |
|  |  |  | `start_date` | Ngày bắt đầu áp dụng voucher |
|  |  |  | `end_date` | Ngày kết thúc áp dụng voucher |
|  |  |  | `is_active` | Voucher có đang được kích hoạt hay không |
|  |  |  | `type` | Cách tính mức giảm |
|  |  |  | `description` | Điều kiện hoặc nội dung voucher |
|  |  |  | `applicable_for` | Đối tượng được áp dụng voucher |
|  |  |  | `max_usage` | Số lần voucher được phép sử dụng |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 16 | `customer_voucher` | Lưu danh sách voucher mà khách hàng đang sở hữu hoặc đã sử dụng | `id` (PK) | Mã định danh bản ghi |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng sở hữu voucher |
|  |  |  | `voucher_id` (FK → voucher.id) | Voucher được khách hàng nhận |
|  |  |  | `acquired_method` | Cách khách hàng nhận voucher |
|  |  |  | `voucher_status` | Tình trạng sử dụng voucher |
|  |  |  | `acquired_at` | Thời điểm khách hàng nhận voucher |
|  |  |  | `expired_at` | Thời điểm voucher hết hạn |
| 17 | `voucher_redemption` | Lưu từng lượt áp dụng voucher vào đơn hoặc lịch, giữ mức giảm đã chốt. | `id` (PK) | Mã lượt sử dụng voucher. |
|  |  |  | `customer_voucher_id` (FK → customer_voucher.id) | Lượt phát hành cá nhân được sử dụng; có thể NULL cho mã công khai. |
|  |  |  | `voucher_id` (FK → voucher.id) | Mẫu voucher áp dụng; với lượt cá nhân phải khớp mẫu đã phát hành. |
|  |  |  | `order_id` (FK → sales_order.id) | Đơn được giảm; NULL khi áp dụng cho lịch hẹn. |
|  |  |  | `appointment_id` (FK → appointment.id) | Lịch được giảm; NULL khi áp dụng cho đơn hàng. |
|  |  |  | `discount_amount_snapshot` | Số tiền thực giảm đã chốt. |
|  |  |  | `status` | Trạng thái áp dụng hoặc đã đảo/hủy lượt dùng. |
|  |  |  | `redeemed_at` | Thời điểm áp dụng. |
|  |  |  | `reversed_at` | Thời điểm đảo lượt dùng khi có. |
|  |  |  | `idempotency_key` (UQ) | Khóa duy nhất chống áp dụng lặp. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 18 | `pet_species` | Danh mục loài thú cưng. | `id` (PK) | Mã loài thú cưng. |
|  |  |  | `species_name` (UQ) | Tên loài, duy nhất. |
|  |  |  | `is_active` | Loài còn được sử dụng trong danh mục hay không. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 19 | `pet_breed` | Danh mục giống thuộc từng loài thú cưng. | `id` (PK) | Mã giống thú cưng. |
|  |  |  | `species_id` (FK → pet_species.id) | Loài mà giống thuộc về. |
|  |  |  | `breed_name` | Tên giống, duy nhất trong cùng loài. |
|  |  |  | `is_active` | Giống còn được dùng trong danh mục hay không. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 20 | `pet_profile` | Lưu hồ sơ định danh Pet ID, tên thú cưng, giống loài, giới tính, ngày sinh và trạng thái hoạt động | `id` (PK) | Mã định danh hồ sơ thú cưng |
|  |  |  | `customer_id` (FK → customer.id) | Chủ sở hữu thú cưng |
|  |  |  | `pet_code` (UQ) | Mã Pet ID của thú cưng |
|  |  |  | `pet_name` | Tên thú cưng |
|  |  |  | `avatar_url` | Ảnh đại diện của thú cưng |
|  |  |  | `gender` | Giới tính thú cưng |
|  |  |  | `date_of_birth` | Ngày sinh thú cưng |
|  |  |  | `color` | Màu lông thú cưng |
|  |  |  | `routine` | Thói quen và sở thích của thú cưng |
|  |  |  | `allergy` | Thông tin dị ứng cần lưu ý khi chăm sóc |
|  |  |  | `status` | Trạng thái hồ sơ thú cưng |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `breed_id` (FK → pet_breed.id) | Giống thuộc loài đã chọn; từ giống suy ra loài. |
|  |  |  | `safety_note` | Ghi chú an toàn tự do khi tiếp xúc và chăm sóc thú cưng. |
| 21 | `pet_weight_history` | Lưu lịch sử cân đo trọng lượng định kỳ của thú cưng phục vụ theo dõi sức khỏe và điều chỉnh dịch vụ | `id` (PK) | Mã định danh duy nhất của lượt cân đo. |
|  |  |  | `pet_id` (FK → pet_profile.id) | Bé cưng được cân đo. |
|  |  |  | `weight` | Trọng lượng ghi nhận (kg). |
|  |  |  | `measured_at` | Thời điểm thực hiện cân đo. |
|  |  |  | `recorded_by` (FK → staff.id) | Nhân viên ghi nhận nếu đã định danh. |
|  |  |  | `note` | Ghi chú của lần cân. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 22 | `staff_level` | Danh mục cấp độ chuyên môn của kỹ thuật viên. | `id` (PK) | Mã cấp độ chuyên môn. |
|  |  |  | `level_code` (UQ) | Mã cấp độ, duy nhất. |
|  |  |  | `level_name` | Tên cấp độ hiển thị. |
|  |  |  | `rank_order` | Thứ tự cấp độ dùng đối chiếu yêu cầu dịch vụ. |
|  |  |  | `is_active` | Cấp độ còn được áp dụng hay không. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 23 | `service_category` | Danh mục nhóm dịch vụ chăm sóc, lưu trú và đưa đón. | `id` (PK) | Mã nhóm dịch vụ. |
|  |  |  | `category_code` (UQ) | Mã nhóm nghiệp vụ, duy nhất. |
|  |  |  | `category_name` | Tên nhóm dịch vụ. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 24 | `service` | Lưu danh mục các dịch vụ thuộc các nhóm Grooming & Spa, Pet Hotel và Pet Taxi | `id` (PK) | Mã định danh dịch vụ |
|  |  |  | `service_code` (UQ) | Mã dịch vụ |
|  |  |  | `service_name` | Tên dịch vụ |
|  |  |  | `description` | Mô tả dịch vụ |
|  |  |  | `estimated_duration` | Thời gian thực hiện dự kiến, tính bằng phút |
|  |  |  | `status` | Trạng thái cung cấp dịch vụ |
|  |  |  | `commission_rate` | Tỷ lệ hoa hồng cấu hình cho dịch vụ; mức áp dụng lịch sử cần chốt theo ca. |
|  |  |  | `benefits` | Lợi ích của dịch vụ |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `category_id` (FK → service_category.id) | Nhóm dịch vụ mà gói thuộc về. |
|  |  |  | `staff_level_required_id` (FK → staff_level.id) | Cấp độ chuyên môn tối thiểu cần để thực hiện gói, nếu có. |
|  |  |  | `amenities` | Đoạn mô tả tiện ích đi kèm dịch vụ; có thể để trống và không tham chiếu danh mục riêng. |
| 25 | `service_image` | Lưu ảnh của dịch vụ và xác định ảnh đại diện từ cùng một nguồn. | `id` (PK) | Mã ảnh dịch vụ. |
|  |  |  | `service_id` (FK → service.id) | Dịch vụ sở hữu ảnh. |
|  |  |  | `image_url` | Đường dẫn hoặc khóa lưu ảnh. |
|  |  |  | `display_order` | Thứ tự hiển thị ảnh. |
|  |  |  | `is_thumbnail` | Đánh dấu ảnh đại diện, tối đa một ảnh cho mỗi dịch vụ. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 26 | `service_supported_species` | Liên kết dịch vụ với các loài được phục vụ. | `service_id` (PK ghép; FK → service.id) | Dịch vụ hỗ trợ loài; cùng species_id tạo khóa chính. |
|  |  |  | `species_id` (PK ghép; FK → pet_species.id) | Loài được phục vụ; cùng service_id tạo khóa chính. |
| 27 | `service_addon` | Lưu danh sách các dịch vụ bổ sung đi kèm dịch vụ chính (Spa, Hotel, Taxi), bao gồm giá, thời lượng và trạng thái áp dụng. | `id` (PK) | Mã định danh dịch vụ bổ sung |
|  |  |  | `service_id` (FK → service.id) | Dịch vụ chính áp dụng addon |
|  |  |  | `addon_name` | Tên dịch vụ bổ sung |
|  |  |  | `description` | Mô tả dịch vụ bổ sung |
|  |  |  | `price` | Giá dịch vụ bổ sung |
|  |  |  | `estimated_duration` | Thời gian thực hiện dự kiến, tính bằng phút |
|  |  |  | `is_required` | Cho biết addon có bắt buộc hay không |
|  |  |  | `status` | Trạng thái cung cấp addon |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 28 | `care_action` | Lưu danh mục các mốc chăm sóc như Tắm, | `id` (PK) | Mã định danh hoạt động chăm sóc |
|  |  |  | `action_name` | Tên mốc chăm sóc |
|  |  |  | `is_active` | Mốc chăm sóc có đang được sử dụng hay không |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 29 | `service_care_action` | Checklist mẫu của từng dịch vụ, độc lập nhật ký thực hiện. | `service_id` (PK ghép; FK → service.id) | Dịch vụ có bước chăm sóc; cùng care_action_id tạo khóa chính. |
|  |  |  | `care_action_id` (PK ghép; FK → care_action.id) | Loại thao tác trong checklist; cùng service_id tạo khóa chính. |
|  |  |  | `display_order` | Thứ tự thực hiện thao tác trong dịch vụ. |
|  |  |  | `estimated_duration` | Thời lượng dự kiến của bước, tính bằng phút. |
| 30 | `service_price_matrix` | Lưu bảng giá của từng dịch vụ theo loài thú cưng, cân nặng hoặc điều kiện áp dụng | `id` (PK) | Mã định danh bảng giá |
|  |  |  | `service_id` (FK → service.id) | Dịch vụ áp dụng bảng giá |
|  |  |  | `weight_from` | Mức cân nặng tối thiểu của khoảng giá |
|  |  |  | `weight_to` | Mức cân nặng tối đa của khoảng giá |
|  |  |  | `unit_price` | Giá dịch vụ theo khoảng điều kiện |
|  |  |  | `effective_from` | Thời điểm bắt đầu áp dụng giá |
|  |  |  | `effective_to` | Thời điểm kết thúc áp dụng giá |
|  |  |  | `status` | Trạng thái bảng giá |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 31 | `taxi_price_rule` | Lưu các quy tắc tính giá dịch vụ Pet Taxi theo khoảng cách, cân nặng và thời gian hiệu lực của bảng giá. | `id` (PK) | Mã định danh quy tắc giá |
|  |  |  | `distance_from` | Mức khoảng cách tối thiểu của quy tắc |
|  |  |  | `distance_to` | Mức khoảng cách tối đa của quy tắc |
|  |  |  | `weight_from` | Mức cân nặng tối thiểu của quy tắc |
|  |  |  | `weight_to` | Mức cân nặng tối đa của quy tắc |
|  |  |  | `base_price` | Giá cơ bản của chuyến taxi |
|  |  |  | `surcharge` | Phụ phí của quy tắc giá |
|  |  |  | `effective_from` | Thời điểm bắt đầu áp dụng quy tắc |
|  |  |  | `effective_to` | Thời điểm kết thúc áp dụng quy tắc |
|  |  |  | `status` | Trạng thái quy tắc giá |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 32 | `hotel_room_type` | Loại phòng khách sạn dành cho thú cưng, lưu thông tin cấu hình và mức giá dùng chung cho các phòng cùng loại. | `id` (PK) | Mã định danh loại phòng |
|  |  |  | `room_type` | Tên loại phòng |
|  |  |  | `capacity` | Sức chứa tối đa của loại phòng |
|  |  |  | `daily_price` | Giá thuê phòng theo ngày |
|  |  |  | `description` | Mô tả loại phòng |
|  |  |  | `amenities` | Đoạn mô tả tiện ích của loại phòng, chỉ dùng giới thiệu và hiển thị. |
|  |  |  | `status` | Trạng thái cung cấp loại phòng |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 33 | `hotel_room` | Phòng vật lý thực tế tại cơ sở lưu trú, thuộc một loại phòng cụ thể và được quản lý theo số phòng và trạng thái sử dụng. | `id` (PK) | Mã định danh phòng |
|  |  |  | `room_number` (UQ) | Số hoặc mã phòng thực tế |
|  |  |  | `room_type_id` (FK → hotel_room_type.id) | Loại phòng của phòng thực tế |
|  |  |  | `status` | Trạng thái sử dụng của phòng |
|  |  |  | `description` | Ghi chú riêng của phòng |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 34 | `appointment` | Lưu phiếu đặt lịch dịch vụ của khách hàng cho từng thú cưng | `id` (PK) | Mã định danh lịch hẹn |
|  |  |  | `appointment_code` (UQ) | Mã lịch hẹn hiển thị |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng đặt lịch |
|  |  |  | `pet_id` (FK → pet_profile.id) | Thú cưng sử dụng dịch vụ |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên được phân công |
|  |  |  | `check_in_time` | Thời điểm khách đưa thú cưng đến |
|  |  |  | `check_out_time` | Thời điểm hoàn tất bàn giao thú cưng |
|  |  |  | `note` | Ghi chú của khách hàng khi đặt lịch |
|  |  |  | `change_count` | Số lần khách đổi lịch |
|  |  |  | `appointment_status` | Trạng thái lịch hẹn |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `scheduled_start_at` | Thời điểm dự kiến bắt đầu có múi giờ. |
|  |  |  | `scheduled_end_at` | Thời điểm dự kiến kết thúc có múi giờ. |
| 35 | `appointment_item` | Dòng dịch vụ hoặc addon thực tế của một ca, giữ nội dung giá đã chốt. | `id` (PK) | Mã dòng dịch vụ. |
|  |  |  | `appointment_id` (FK → appointment.id) | Ca dịch vụ chứa dòng. |
|  |  |  | `service_id` (FK → service.id) | Gói dịch vụ được chọn; NULL nếu dòng là addon. |
|  |  |  | `service_addon_id` (FK → service_addon.id) | Addon được chọn; NULL nếu dòng là gói dịch vụ. |
|  |  |  | `is_primary` | Đánh dấu gói chính của ca, tối đa một dòng chính. |
|  |  |  | `name_snapshot` | Tên gói hoặc addon tại thời điểm ghi nhận. |
|  |  |  | `quantity` | Số lượng áp dụng, lớn hơn 0. |
|  |  |  | `unit_price` | Đơn giá tại thời điểm chốt. |
|  |  |  | `discount_amount` | Tổng giảm giá phân bổ cho dòng tại thời điểm chốt. |
|  |  |  | `duration_minutes` | Thời lượng đã chốt cho dòng dịch vụ. |
|  |  |  | `weight_snapshot` | Cân nặng dùng tính giá tại thời điểm chốt, nếu áp dụng. |
|  |  |  | `staff_id` (FK → staff.id) | Kỹ thuật viên thực hiện dòng; có thể khác người phụ trách ca. |
|  |  |  | `status` | Trạng thái áp dụng, hoàn tất hoặc hủy dòng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 36 | `appointment_record` | Biên bản tiếp nhận hoặc bàn giao có phiên bản, giữ thông tin tại thời điểm lập. | `id` (PK) | Mã biên bản. |
|  |  |  | `appointment_id` (FK → appointment.id) | Ca được lập biên bản. |
|  |  |  | `record_type` | Loại tiếp nhận hoặc bàn giao. |
|  |  |  | `schema_version` | Phiên bản cấu trúc biểu mẫu. |
|  |  |  | `revision_no` | Số lần sửa biên bản; bản đã ký không bị ghi đè. |
|  |  |  | `recorded_by` (FK → staff.id) | Nhân viên lập biên bản. |
|  |  |  | `recorded_at` | Thời điểm lập biên bản. |
|  |  |  | `condition_note` | Mô tả tình trạng khi tiếp nhận hoặc bàn giao. |
|  |  |  | `safety_note_snapshot` | Cảnh báo an toàn được ghi nhận lúc lập. |
|  |  |  | `allergy_note_snapshot` | Thông tin dị ứng được ghi nhận lúc lập. |
|  |  |  | `customer_confirmation_status` | Trạng thái xác nhận nội dung của khách. |
|  |  |  | `confirmed_at` | Thời điểm khách xác nhận, nếu có. |
|  |  |  | `note` | Nội dung bổ sung của biên bản. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 37 | `appointment_adjustment` | Ghi nhận phụ phí, giảm trừ, gia hạn hoặc sự cố cần duyệt. | `id` (PK) | Mã điều chỉnh ca. |
|  |  |  | `appointment_id` (FK → appointment.id) | Ca chịu điều chỉnh. |
|  |  |  | `adjustment_type` | Loại gia hạn, phụ phí, giảm trừ hoặc sự cố. |
|  |  |  | `duration_delta_minutes` | Số phút tăng hoặc giảm có dấu. |
|  |  |  | `amount_delta` | Số tiền tăng hoặc giảm có dấu. |
|  |  |  | `reason` | Lý do điều chỉnh. |
|  |  |  | `proposed_by` (FK → staff.id) | Nhân viên đề xuất. |
|  |  |  | `approved_by` (FK → staff.id) | Nhân viên phê duyệt; có thể NULL khi chưa duyệt. |
|  |  |  | `approval_status` | Trạng thái xét duyệt điều chỉnh. |
|  |  |  | `customer_consent_status` | Trạng thái đồng ý của khách khi nghiệp vụ yêu cầu. |
|  |  |  | `approved_at` | Thời điểm duyệt, có thể NULL. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 38 | `hotel_booking` | Quản lý lịch đặt phòng lưu trú khách sạn thú cưng Pet Hotel | `id` (PK) | Mã định danh duy nhất của đơn lưu trú khách sạn. |
|  |  |  | `booking_code` (UQ) | Mã đặt phòng hiển thị cho khách hàng. |
|  |  |  | `room_id` (FK → hotel_room.id) | Phòng hoặc chuồng lưu trú được chỉ định. |
|  |  |  | `appointment_id` (FK → appointment.id; UQ) | Lịch hẹn dịch vụ liên kết với đơn lưu trú. |
|  |  |  | `check_in_at` | Thời điểm bắt đầu lưu trú có múi giờ. |
|  |  |  | `check_out_at` | Thời điểm kết thúc lưu trú dự kiến có múi giờ. |
|  |  |  | `status` | Trạng thái lưu trú (chờ nhận, đang ở, đã trả, đã hủy). |
|  |  |  | `special_diet_notes` | Ghi chú chế độ dinh dưỡng đặc biệt cho bé. |
|  |  |  | `care_notes` | Lưu ý sinh hoạt, nghỉ ngơi và chăm sóc trong thời gian lưu trú. |
|  |  |  | `daily_price` | Đơn giá lưu trú mỗi ngày đêm. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 39 | `taxi_trip` | Thông tin chuyến đưa đón gắn duy nhất với một lịch dịch vụ. | `id` (PK) | Mã chuyến đưa đón. |
|  |  |  | `appointment_id` (FK → appointment.id; UQ) | Lịch dịch vụ liên quan, duy nhất cho mỗi chuyến theo bản 1. |
|  |  |  | `driver_staff_id` (FK → staff.id) | Nhân viên phụ trách đưa đón. |
|  |  |  | `pickup_address` | Địa chỉ đón được chốt khi đặt. |
|  |  |  | `dropoff_address` | Địa chỉ trả được chốt khi đặt. |
|  |  |  | `distance_km` | Quãng đường dùng tính giá, lớn hơn 0. |
|  |  |  | `trip_type` | Loại một chiều hoặc khứ hồi. |
|  |  |  | `outbound_at` | Thời điểm dự kiến đi. |
|  |  |  | `return_at` | Thời điểm dự kiến về khi là chuyến khứ hồi. |
|  |  |  | `taxi_price_rule_id` (FK → taxi_price_rule.id) | Quy tắc giá dùng tham chiếu khi báo giá. |
|  |  |  | `quoted_amount` | Giá chuyến đã báo và chốt. |
|  |  |  | `status` | Trạng thái điều phối và thực hiện chuyến. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 40 | `care_log` | Lưu toàn bộ timeline chăm sóc trong quá trình thực hiện dịch vụ | `id` (PK) | Mã định danh Care Log |
|  |  |  | `appointment_id` (FK → appointment.id) | Lịch hẹn phát sinh Care Log |
|  |  |  | `care_action_id` (FK → care_action.id) | Mốc chăm sóc được ghi nhận |
|  |  |  | `description` | Nội dung nhân viên ghi nhận |
|  |  |  | `observed_condition` | Tình trạng da, lông và hành vi quan sát được khi chăm sóc; không phải chẩn đoán y khoa. |
|  |  |  | `recorded_at` | Thời điểm ghi nhận Care Log |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `recorded_by` (FK → staff.id) | Nhân viên ghi nhận thao tác thực tế. |
|  |  |  | `action_name_snapshot` | Tên thao tác tại thời điểm thực hiện, không đổi theo checklist mẫu. |
| 41 | `care_log_media` | Lưu ảnh và video minh chứng được cập nhật vào Care Log | `id` (PK) | Mã định danh media |
|  |  |  | `care_log_id` (FK → care_log.id) | Care Log chứa media |
|  |  |  | `media_type` | Loại media |
|  |  |  | `media_url` | Đường dẫn file media |
|  |  |  | `file_name` | Tên file media |
|  |  |  | `file_size` | Dung lượng file tính bằng byte |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên tải media lên |
|  |  |  | `uploaded_at` | Thời điểm tải media lên |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 42 | `supplier` | Lưu thông tin nhà cung cấp sản phẩm | `id` (PK) | Mã định danh nhà cung cấp trong PawPal. |
|  |  |  | `supplier_name` | Tên nhà cung cấp sản phẩm mà PawPal hợp tác. |
|  |  |  | `contact_person` | Người phụ trách liên hệ phía nhà cung cấp. |
|  |  |  | `phone_number` | Số điện thoại liên hệ chính với nhà cung cấp. |
|  |  |  | `email` | Email dùng để liên hệ hoặc nhận chứng từ từ nhà cung cấp. |
|  |  |  | `address` | Địa chỉ giao dịch hoặc nhận hàng của nhà cung cấp. |
|  |  |  | `status` | Trạng thái hợp tác hiện tại với nhà cung cấp. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 43 | `product_category` | Lưu danh mục nhóm sản phẩm | `id` (PK) | Mã định danh danh mục sản phẩm. |
|  |  |  | `category_name` | Tên danh mục sản phẩm hiển thị trong quản trị và website. |
|  |  |  | `description` | Mô tả phạm vi hoặc nội dung của danh mục. |
|  |  |  | `status` | Trạng thái sử dụng của danh mục. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 44 | `product` | Lưu danh mục sản phẩm kinh | `id` (PK) | Mã định danh sản phẩm gốc, dùng để gom các biến thể cùng một sản phẩm. |
|  |  |  | `category_id` (FK → product_category.id) | Nhóm sản phẩm mà sản phẩm thuộc về. |
|  |  |  | `product_name` | Tên sản phẩm hiển thị cho khách hàng. |
|  |  |  | `unit` | Đơn vị bán cơ bản của sản phẩm. |
|  |  |  | `target_pet` | Loài thú cưng mà sản phẩm hướng đến. |
|  |  |  | `description` | Mô tả sản phẩm, thành phần hoặc thông tin sử dụng. |
|  |  |  | `slug` (UQ) | Đường dẫn định danh trang chi tiết sản phẩm. |
|  |  |  | `status` | Trạng thái kinh doanh của sản phẩm. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `origin` | Xuất xứ hoặc nơi sản xuất được công bố. |
|  |  |  | `ingredients` | Nội dung thành phần sản phẩm dạng mô tả. |
|  |  |  | `benefits` | Đoạn văn mô tả lợi ích sản phẩm. |
|  |  |  | `usage_instructions` | Hướng dẫn sử dụng sản phẩm. |
|  |  |  | `specs` | Thông số giới thiệu; thuộc tính biến thể phải lưu tại bảng biến thể. |
|  |  |  | `badge` | Nhãn giới thiệu sản phẩm, không thay thế trạng thái nghiệp vụ. |
|  |  |  | `brand_name` | Tên thương hiệu dạng text; không quản lý danh mục thương hiệu riêng. |
| 45 | `product_media` | Ảnh dùng chung của sản phẩm, độc lập ảnh riêng từng biến thể. | `id` (PK) | Mã ảnh sản phẩm. |
|  |  |  | `product_id` (FK → product.id) | Sản phẩm sở hữu ảnh. |
|  |  |  | `image_url` | Đường dẫn hoặc khóa lưu ảnh. |
|  |  |  | `display_order` | Thứ tự hiển thị. |
|  |  |  | `is_thumbnail` | Đánh dấu ảnh đại diện, tối đa một ảnh mỗi sản phẩm. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 46 | `variant_color` | Lưu định dạng màu sắc sản phẩm | `id` (PK) | Mã định danh màu sắc. |
|  |  |  | `color_name` | Tên màu hiển thị cho khách hàng. |
|  |  |  | `hex_code` | Mã màu dùng để hiển thị swatch màu trên website. |
|  |  |  | `display_order` | Thứ tự hiển thị màu trên giao diện. |
|  |  |  | `is_active` | Cho biết màu còn được phép sử dụng cho biến thể mới hay không. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 47 | `variant_size` | Lưu định dạng kích thước sản phẩm | `id` (PK) | Mã định danh kích thước/quy cách. |
|  |  |  | `size_name` | Tên kích thước hoặc quy cách như S, M, L, 200g, 500g. |
|  |  |  | `display_order` | Thứ tự hiển thị kích thước/quy cách trên giao diện. |
|  |  |  | `is_active` | Cho biết kích thước/quy cách còn được phép sử dụng cho biến thể mới hay không. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 48 | `variant_flavor` | Lưu danh mục hương vị hoặc mùi hương dùng chung cho các biến thể sản phẩm. | `id` (PK) | Mã định danh hương vị. |
|  |  |  | `flavor_name` | Tên hương vị sản phẩm như gà, bò, cá hồi. |
|  |  |  | `display_order` | Thứ tự hiển thị hương vị trên giao diện chọn biến thể. |
|  |  |  | `is_active` | Cho biết hương vị còn được phép sử dụng cho biến thể mới hay không. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 49 | `product_variant` | Lưu từng phiên bản cụ thể của một sản phẩm theo màu sắc, kích thước, kiểu dáng, SKU và giá bán riêng. | `id` (PK) | Mã định danh biến thể sản phẩm. |
|  |  |  | `product_id` (FK → product.id) | Sản phẩm gốc chứa biến thể này. |
|  |  |  | `color_id` (FK → variant_color.id) | Màu sắc của biến thể nếu sản phẩm có phân loại màu. |
|  |  |  | `size_id` (FK → variant_size.id) | Kích thước hoặc quy cách của biến thể. |
|  |  |  | `flavor_id` (FK → variant_flavor.id) | Hương vị của biến thể nếu sản phẩm có phân loại hương vị. |
|  |  |  | `sku_variant` (UQ) | Mã SKU duy nhất dùng để bán hàng và quản lý tồn kho cho đúng biến thể. |
|  |  |  | `cost_price` | Giá vốn của biến thể tại thời điểm quản lý sản phẩm. |
|  |  |  | `sale_price` | Giá bán hiện tại của biến thể. |
|  |  |  | `compare_at_price` | Giá niêm yết dùng để so sánh với sale_price khi hiển thị khuyến mãi. |
|  |  |  | `weight` | Khối lượng/quy cách của biến thể phục vụ hiển thị và nghiệp vụ bán hàng. |
|  |  |  | `barcode` (UQ) | Mã vạch của biến thể dùng cho bán hàng và kiểm kho. |
|  |  |  | `status` | Trạng thái kinh doanh của biến thể. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 50 | `product_variant_media` | Lưu ảnh riêng của từng biến thể sản phẩm, độc lập ảnh dùng chung của sản phẩm. | `id` (PK) | Mã định danh bản ghi hình ảnh biến thể. |
|  |  |  | `product_variant_id` (FK → product_variant.id) | Biến thể sản phẩm sở hữu hình ảnh này. |
|  |  |  | `image_url` | Đường dẫn đến file hình ảnh biến thể được lưu trữ. |
|  |  |  | `display_order` | Thứ tự hình ảnh khi hiển thị trên trang sản phẩm. |
|  |  |  | `is_thumbnail` | Xác định hình ảnh đại diện của biến thể. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 51 | `purchase_order` | Lưu phiếu nhập hàng từ nhà cung cấp | `id` (PK) | Mã định danh phiếu nhập hàng. |
|  |  |  | `supplier_id` (FK → supplier.id) | Nhà cung cấp thực hiện giao lô hàng này. |
|  |  |  | `order_number` (UQ) | Mã phiếu nhập dùng để tra cứu và đối soát. |
|  |  |  | `order_date` | Ngày PawPal tạo hoặc ghi nhận phiếu nhập. |
|  |  |  | `expected_date` | Ngày dự kiến nhận hàng từ nhà cung cấp. |
|  |  |  | `order_status` | Trạng thái xử lý phiếu nhập. |
|  |  |  | `note` | Ghi chú thêm về phiếu nhập hoặc lô hàng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 52 | `purchase_order_detail` | Lưu chi tiết từng sản phẩm trong phiếu nhập hàng | `id` (PK) | Mã định danh dòng chi tiết phiếu nhập. |
|  |  |  | `purchase_order_id` (FK → purchase_order.id) | Phiếu nhập chứa sản phẩm này. |
|  |  |  | `product_variant_id` (FK → product_variant.id) | Biến thể sản phẩm thực tế được nhập vào kho. |
|  |  |  | `quantity` | Số lượng sản phẩm được đặt nhập theo phiếu. |
|  |  |  | `unit_price` | Giá nhập trên mỗi đơn vị sản phẩm. |
| 53 | `cart` | Lưu giỏ hàng hiện tại của khách trước khi tạo đơn hàng | `id` (PK) | Mã định danh giỏ hàng. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng sở hữu giỏ hàng. |
|  |  |  | `cart_status` | Trạng thái vòng đời của giỏ hàng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 54 | `cart_item` | Lưu danh sách sản phẩm được thêm vào giỏ hàng | `id` (PK) | Mã định danh dòng sản phẩm trong giỏ. |
|  |  |  | `cart_id` (FK → cart.id) | Giỏ hàng chứa sản phẩm này. |
|  |  |  | `product_variant_id` (FK → product_variant.id) | Biến thể sản phẩm khách đang mua. |
|  |  |  | `quantity` | Số lượng biến thể được chọn trong giỏ. |
|  |  |  | `unit_price` | Giá bán của biến thể tại thời điểm được thêm/cập nhật vào giỏ. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 55 | `wishlist` | Lưu danh sách sản phẩm yêu thích của khách hàng | `id` (PK) | Mã định danh danh sách yêu thích. |
|  |  |  | `customer_id` (FK → customer.id; UQ) | Khách hàng sở hữu danh sách yêu thích. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 56 | `wishlist_product` | Sản phẩm yêu thích của khách thông qua wishlist. | `wishlist_id` (PK ghép; FK → wishlist.id) | Danh sách yêu thích; cùng product_id tạo khóa chính. |
|  |  |  | `product_id` (PK ghép; FK → product.id) | Sản phẩm được yêu thích; cùng wishlist_id tạo khóa chính. |
|  |  |  | `added_at` | Thời điểm thêm sản phẩm. |
| 57 | `wishlist_service` | Dịch vụ yêu thích của khách thông qua wishlist. | `wishlist_id` (PK ghép; FK → wishlist.id) | Danh sách yêu thích; cùng service_id tạo khóa chính. |
|  |  |  | `service_id` (PK ghép; FK → service.id) | Dịch vụ được yêu thích; cùng wishlist_id tạo khóa chính. |
|  |  |  | `added_at` | Thời điểm thêm dịch vụ. |
| 58 | `sales_order` | Lưu đơn hàng mua sắm trên website hoặc tại cửa hàng | `id` (PK) | Mã định danh đơn hàng. |
|  |  |  | `order_code` (UQ) | Mã đơn hàng hiển thị cho khách và Admin. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng sở hữu đơn hàng. |
|  |  |  | `order_status` | Trạng thái xử lý đơn hàng. |
|  |  |  | `note` | Ghi chú khách hàng gửi khi đặt đơn. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `shipping_fee_snapshot` | Phí giao hàng được chốt khi đặt, không đổi theo cấu hình sau này. |
|  |  |  | `receiver_name_snapshot` | Tên người nhận được chốt khi đặt đơn; không đổi theo sổ địa chỉ. |
|  |  |  | `receiver_phone_snapshot` | Số điện thoại người nhận được chốt khi đặt đơn. |
|  |  |  | `province_snapshot` | Tỉnh hoặc thành phố nhận hàng tại thời điểm đặt. |
|  |  |  | `street_address_snapshot` | Địa chỉ giao hàng chi tiết tại thời điểm đặt. |
|  |  |  | `postal_code_snapshot` | Mã bưu chính tại thời điểm đặt, nếu có. |
|  |  |  | `delivery_option_id` (FK → delivery_option_config.id) | Hình thức giao hoặc nhận hàng được chọn cho đơn. |
|  |  |  | `shipping_provider_id` (FK → shipping_provider.id) | Đơn vị vận chuyển; có thể NULL khi khách nhận tại cửa hàng. |
|  |  |  | `tracking_code` | Mã vận đơn của đơn hàng, khi có. |
|  |  |  | `shipped_at` | Thời điểm bàn giao đơn cho đơn vị vận chuyển. |
|  |  |  | `delivered_at` | Thời điểm giao hoặc nhận hàng thành công. |
|  |  |  | `shipping_status` | Trạng thái giao nhận của đơn, độc lập trạng thái xử lý đơn. |
| 59 | `sales_order_detail` | Lưu chi tiết sản phẩm, số lượng và đơn giá trong từng đơn hàng | `id` (PK) | Mã định danh dòng chi tiết đơn hàng. |
|  |  |  | `order_id` (FK → sales_order.id) | Đơn hàng chứa dòng sản phẩm này. |
|  |  |  | `product_variant_id` (FK → product_variant.id) | Biến thể SKU thực tế khách mua. |
|  |  |  | `quantity` | Số lượng SKU được mua trong dòng đơn. |
|  |  |  | `unit_price` | Đơn giá SKU tại thời điểm chốt đơn. |
|  |  |  | `discount_amount` | Số tiền giảm trực tiếp trên dòng sản phẩm. |
|  |  |  | `product_name_snapshot` | Tên hàng tại thời điểm bán. |
|  |  |  | `sku_snapshot` | SKU tại thời điểm bán, không đổi theo danh mục sau này. |
| 60 | `stock_reservation` | Lưu thông tin giữ trước số lượng tồn kho của từng biến thể sản phẩm | `id` (PK) | Mã định danh lượt giữ hàng. |
|  |  |  | `product_variant_id` (FK → product_variant.id) | Biến thể SKU đang được giữ tồn kho. |
|  |  |  | `cart_id` (FK → cart.id) | Giỏ hàng tạo ra lượt giữ tồn kho. |
|  |  |  | `quantity` | Số lượng SKU được giữ tạm. |
|  |  |  | `reserved_at` | Thời điểm hệ thống bắt đầu giữ hàng. |
|  |  |  | `expires_at` | Thời điểm reservation hết hiệu lực nếu khách không hoàn tất giao dịch. |
|  |  |  | `status` | Trạng thái của lượt giữ hàng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `order_id` (FK → sales_order.id) | Đơn hàng sở hữu lượt giữ sau khi chuyển từ giỏ; NULL khi còn giữ cho giỏ. |
| 61 | `inventory` | Bảng số dư tồn tổng hợp của kho chung theo từng biến thể; có thể dựng lại từ sổ kho, không thuộc lõi chuẩn hóa độc lập. | `id` (PK) | Mã định danh bản ghi tồn kho. |
|  |  |  | `product_variant_id` (UQ; FK → product_variant.id) | Biến thể SKU được quản lý tồn kho. |
|  |  |  | `quantity_in_stock` | Số lượng thực tế đang có trong kho. |
|  |  |  | `minimum_stock` | Mức tồn kho tối thiểu để phát cảnh báo sắp hết hàng. |
|  |  |  | `last_updated_at` | Thời điểm số liệu tồn kho được cập nhật gần nhất. |
| 62 | `inventory_transaction` | Lưu lịch sử nhập kho, xuất kho và điều chỉnh tồn kho | `id` (PK) | Mã định danh giao dịch kho. |
|  |  |  | `product_variant_id` (FK → product_variant.id) | Biến thể SKU phát sinh thay đổi tồn kho. |
|  |  |  | `transaction_type` | Loại thay đổi tồn kho. |
|  |  |  | `quantity` | Lượng tồn thay đổi có dấu: dương khi nhập và âm khi xuất hoặc đảo nhập. |
|  |  |  | `note` | Lý do hoặc ghi chú về giao dịch điều chỉnh kho. |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên thực hiện hoặc xác nhận giao dịch kho. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `purchase_order_detail_id` (FK → purchase_order_detail.id) | Dòng mua hàng là nguồn nhập hoặc đảo nhập; NULL nếu giao dịch không phải nhập mua. |
|  |  |  | `sales_order_detail_id` (FK → sales_order_detail.id) | Dòng bán hàng là nguồn xuất hoặc đảo xuất, nếu có. |
|  |  |  | `return_request_detail_id` (FK → return_request_detail.id) | Dòng hàng trả là nguồn nhập lại, nếu đủ điều kiện. |
|  |  |  | `idempotency_key` (UQ) | Khóa duy nhất ngăn ghi biến động kho trùng. |
|  |  |  | `recorded_at` | Thời điểm nghiệp vụ kho thực tế phát sinh. |
| 63 | `payment_method_config` | Lưu thông tin các loại phương thức thanh toán khả dụng | `id` (PK) | Mã định danh phương thức thanh toán. |
|  |  |  | `name` | Tên phương thức thanh toán hiển thị cho khách. |
|  |  |  | `short_name` | Tên viết tắt dùng trong giao diện/quản trị. |
|  |  |  | `description` | Mô tả cách thức hoặc điều kiện sử dụng phương thức. |
|  |  |  | `icon` | Thông tin nhận diện icon hiển thị cho phương thức thanh toán. |
|  |  |  | `fee` | Phí cố định áp dụng cho phương thức thanh toán nếu có. |
|  |  |  | `available` | Cho biết phương thức hiện có được phép sử dụng hay không. |
|  |  |  | `requires_info` | Thông tin bổ sung cần thu thập khi khách chọn phương thức. |
|  |  |  | `redirect_url` | URL chuyển khách sang cổng thanh toán nếu phương thức yêu cầu. |
|  |  |  | `bank_info` | Thông tin tài khoản ngân hàng dùng cho chuyển khoản. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 64 | `delivery_option_config` | Lưu thông tin các hình thức giao hàng | `id` (PK) | Mã định danh hình thức giao hàng. |
|  |  |  | `name` | Tên hình thức giao hàng hiển thị cho khách. |
|  |  |  | `description` | Mô tả phạm vi hoặc điều kiện của hình thức giao hàng. |
|  |  |  | `fee` | Phí giao hàng cơ bản của hình thức. |
|  |  |  | `estimated_days` | Số ngày dự kiến giao hàng. |
|  |  |  | `icon` | Thông tin nhận diện icon của hình thức giao hàng. |
|  |  |  | `available` | Cho biết hình thức giao hàng có đang được phép chọn hay không. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 65 | `shipping_provider` | Lưu danh sách các đơn vị vận chuyển mà PawPal sử dụng để giao đơn hàng, giúp Admin quản lý đối tác giao hàng và liên | `id` (PK) | Mã định danh đơn vị vận chuyển. |
|  |  |  | `provider_name` | Tên đơn vị vận chuyển mà PawPal hợp tác. |
|  |  |  | `provider_code` | Mã định danh ngắn của đơn vị vận chuyển trong hệ thống. |
|  |  |  | `logo_url` | Đường dẫn logo của đơn vị vận chuyển. |
|  |  |  | `contact_phone` | Số điện thoại liên hệ của đơn vị vận chuyển. |
|  |  |  | `tracking_url` | Mẫu URL dùng để tra cứu vận đơn. |
|  |  |  | `status` | Trạng thái hợp tác/sử dụng đơn vị vận chuyển. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 66 | `payment` | Lưu lịch sử thanh toán, phương thức thanh toán và trạng thái giao dịch | `id` (PK) | Mã định danh giao dịch thanh toán. |
|  |  |  | `payment_code` (UQ) | Mã giao dịch thanh toán dùng để đối soát. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng thực hiện thanh toán. |
|  |  |  | `payment_method_config_id` (FK → payment_method_config.id) | Phương thức thanh toán được sử dụng. |
|  |  |  | `payment_type` | Loại giao dịch thanh toán. |
|  |  |  | `amount` | Số tiền thực tế của giao dịch thanh toán. |
|  |  |  | `transaction_status` | Trạng thái xử lý giao dịch thanh toán. |
|  |  |  | `succeeded_at` | Thời điểm khoản thanh toán được xác nhận thu thành công. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `gateway_transaction_id` | Mã thu tiền bên cổng thanh toán, khi có. |
|  |  |  | `idempotency_key` (UQ) | Khóa duy nhất chống thu hoặc ghi nhận lặp một yêu cầu. |
|  |  |  | `order_id` (FK → sales_order.id) | Đơn hàng được thanh toán; NULL khi lần thu thuộc một lịch hẹn. |
|  |  |  | `appointment_id` (FK → appointment.id) | Lịch được thanh toán; NULL khi lần thu thuộc một đơn hàng. |
|  |  |  | `eligible_spend_amount` | Phần tiền đủ điều kiện xét hạng đã được ghi nhận, từ 0 đến amount; tiền cọc chưa đủ điều kiện có giá trị 0. |
| 67 | `refund_transaction` | Lưu giao dịch hoàn tiền hoặc bồi thường thực tế phát sinh từ một support ticket đã được phê duyệt xử lý. Đây là thực thể ghi nhận dòng tiền, tách biệt với quá trình tiếp nhận và xử lý khiếu nại. | `id` (PK) | Mã định danh giao dịch hoàn tiền/bồi thường. |
|  |  |  | `refund_code` (UQ) | Mã giao dịch hoàn tiền dùng để tra cứu và đối soát. |
|  |  |  | `ticket_id` (FK → support_ticket.id) | Ticket làm cơ sở phát sinh giao dịch hoàn/bồi thường. |
|  |  |  | `payment_id` (FK → payment.id) | Giao dịch thanh toán ban đầu liên quan đến khoản hoàn tiền. |
|  |  |  | `refund_type` | Loại hoàn tiền hoặc bồi thường. |
|  |  |  | `requested_amount` | Số tiền khách yêu cầu hoàn/bồi thường. |
|  |  |  | `approved_amount` | Số tiền được PawPal phê duyệt. |
|  |  |  | `refunded_amount` | Số tiền thực tế đã hoàn/bồi thường thành công. |
|  |  |  | `refund_method` | Phương thức hoàn tiền/bồi thường. |
|  |  |  | `refund_status` | Trạng thái xử lý giao dịch hoàn tiền. |
|  |  |  | `gateway_transaction_id` | Mã giao dịch từ cổng thanh toán liên quan đến hoàn tiền. |
|  |  |  | `note` | Ghi chú bổ sung về giao dịch hoàn tiền/bồi thường. |
|  |  |  | `processed_by` (FK → staff.id) | Nhân viên thực hiện giao dịch hoàn tiền/bồi thường. |
|  |  |  | `processed_at` | Thời điểm nhân viên/hệ thống bắt đầu xử lý hoàn tiền. |
|  |  |  | `completed_at` | Thời điểm giao dịch hoàn tiền hoàn tất thành công. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `return_request_id` (FK → return_request.id) | Yêu cầu trả hàng liên quan; có thể NULL khi hoàn không thuộc yêu cầu trả hàng. |
|  |  |  | `eligible_refund_amount` | Phần hoàn làm giảm chi tiêu xét hạng; không vượt số tiền thực hoàn và phần đủ điều kiện còn lại của lần thu gốc. |
| 68 | `return_request` | Lưu yêu cầu đổi trả sản phẩm và thông tin hậu mãi | `id` (PK) | Mã định danh yêu cầu đổi trả. |
|  |  |  | `sales_order_id` (FK → sales_order.id) | Đơn hàng phát sinh yêu cầu đổi trả. |
|  |  |  | `resolution_type` | Kết quả xử lý cuối cùng của yêu cầu đổi trả. |
|  |  |  | `resolved_by` (FK → staff.id) | Nhân viên/Admin chốt kết quả yêu cầu đổi trả. |
|  |  |  | `reason` | Lý do khách hàng yêu cầu đổi/trả. |
|  |  |  | `return_type` | Loại yêu cầu đổi/trả của khách hàng. |
|  |  |  | `description` | Thông tin chi tiết bổ sung về tình trạng hoặc yêu cầu đổi trả. |
|  |  |  | `request_status` | Trạng thái xử lý yêu cầu đổi trả. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 69 | `return_request_detail` | Lưu chi tiết sản phẩm được đổi trả | `id` (PK) | Mã định danh dòng chi tiết đổi trả. |
|  |  |  | `return_request_id` (FK → return_request.id) | Yêu cầu đổi trả chứa sản phẩm này. |
|  |  |  | `quantity` | Số lượng SKU được yêu cầu đổi/trả. |
|  |  |  | `sales_order_detail_id` (FK → sales_order_detail.id) | Dòng hàng đã mua được yêu cầu trả, từ đó suy ra biến thể và giá gốc. |
| 70 | `return_request_evidence` | Ảnh bằng chứng của yêu cầu trả hàng. | `id` (PK) | Mã ảnh bằng chứng. |
|  |  |  | `return_request_id` (FK → return_request.id) | Yêu cầu trả hàng sở hữu ảnh. |
|  |  |  | `image_url` | Đường dẫn hoặc khóa lưu ảnh. |
|  |  |  | `display_order` | Thứ tự ảnh. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 71 | `review` | Lưu đánh giá của khách hàng cho sản phẩm hoặc dịch vụ | `id` (PK) | Mã định danh đánh giá. |
|  |  |  | `rating` | Số sao khách hàng chấm cho sản phẩm/dịch vụ. |
|  |  |  | `review_content` | Nội dung nhận xét của khách hàng. |
|  |  |  | `review_status` | Trạng thái kiểm duyệt và hiển thị đánh giá. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `sales_order_detail_id` (FK → sales_order_detail.id) | Dòng mua được đánh giá; NULL nếu đánh giá dòng dịch vụ. |
|  |  |  | `appointment_item_id` (FK → appointment_item.id) | Dòng dịch vụ được đánh giá; NULL nếu đánh giá dòng mua. |
| 72 | `review_response` | Lưu phản hồi của Admin đối với đánh giá của khách hàng | `id` (PK) | Mã định danh phản hồi đánh giá. |
|  |  |  | `review_id` (FK → review.id) | Đánh giá được Admin phản hồi. |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên/Admin thực hiện phản hồi. |
|  |  |  | `response_content` | Nội dung phản hồi của Admin đối với khách hàng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 73 | `review_media` | Ảnh minh chứng đính kèm đánh giá. | `id` (PK) | Mã ảnh đánh giá. |
|  |  |  | `review_id` (FK → review.id) | Đánh giá sở hữu ảnh. |
|  |  |  | `image_url` | Đường dẫn hoặc khóa lưu ảnh. |
|  |  |  | `display_order` | Thứ tự ảnh trong đánh giá. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 74 | `support_ticket` | Lưu các yêu cầu hỗ trợ, khiếu nại, tranh chấp và yêu cầu xử lý phát sinh từ khách hàng trong quá trình sử dụng dịch vụ/mua hàng. Đây là thực thể trung tâm để theo dõi toàn bộ vụ việc từ lúc tiếp nhận đến khi giải quyết và đóng yêu cầu. | `id` (PK) | Mã định danh yêu cầu hỗ trợ. |
|  |  |  | `ticket_code` (UQ) | Mã yêu cầu hỗ trợ/khiếu nại dùng để khách hàng và Admin tra cứu. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng tạo yêu cầu hỗ trợ. |
|  |  |  | `order_id` (FK → sales_order.id) | Đơn hàng liên quan đến yêu cầu nếu có. |
|  |  |  | `appointment_id` (FK → appointment.id) | Lịch hẹn liên quan đến yêu cầu nếu có. |
|  |  |  | `channel` | Kênh khách hàng sử dụng để gửi yêu cầu. |
|  |  |  | `category` | Loại vấn đề hoặc yêu cầu cần xử lý. |
|  |  |  | `subject` | Tiêu đề ngắn giúp Admin nhận diện nội dung ticket. |
|  |  |  | `description` | Nội dung ban đầu khách hàng cung cấp về vấn đề cần hỗ trợ. |
|  |  |  | `priority` | Mức độ ưu tiên xử lý ticket. |
|  |  |  | `type` | Loại yêu cầu nghiệp vụ như khiếu nại, hỗ trợ hoặc yêu cầu khác. |
|  |  |  | `status` | Trạng thái xử lý hiện tại của ticket. |
|  |  |  | `requested_resolution` | Phương án xử lý mà khách hàng đề nghị. |
|  |  |  | `requested_amount` | Số tiền khách hàng đề nghị hoàn/bồi thường nếu có. |
|  |  |  | `assigned_staff_id` (FK → staff.id) | Nhân viên đang được phân công xử lý ticket. |
|  |  |  | `first_response_at` | Thời điểm PawPal gửi phản hồi đầu tiên cho khách hàng. |
|  |  |  | `investigation_note` | Ghi chú nội bộ về quá trình xác minh vụ việc và bằng chứng. |
|  |  |  | `resolution_type` | Kết quả xử lý cuối cùng của ticket. |
|  |  |  | `resolution_note` | Ghi chú giải thích phương án xử lý cuối cùng. |
|  |  |  | `approved_amount` | Số tiền được PawPal phê duyệt hoàn/bồi thường. |
|  |  |  | `resolved_by` (FK → staff.id) | Nhân viên thực hiện hoặc phê duyệt kết quả xử lý. |
|  |  |  | `resolved_at` | Thời điểm ticket được xác định là đã giải quyết. |
|  |  |  | `closed_at` | Thời điểm ticket chính thức đóng. |
|  |  |  | `rating` | Điểm khách hàng đánh giá chất lượng xử lý ticket. |
|  |  |  | `rating_comment` | Nhận xét của khách hàng về quá trình hỗ trợ. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `created_by_account_id` (FK → auth.users.id) | Tài khoản lập ticket, khác khách liên quan nếu nhân viên lập hộ. |
| 75 | `support_ticket_message` | Lưu toàn bộ nội dung trao đổi, phản hồi, bằng chứng và ghi chú trong quá trình xử lý một support ticket. | `id` (PK) | Mã định danh tin nhắn/ghi nhận trao đổi. |
|  |  |  | `ticket_id` (FK → support_ticket.id) | Ticket chứa nội dung trao đổi này. |
|  |  |  | `sender_type` | Loại người gửi nội dung. |
|  |  |  | `content` | Nội dung tin nhắn, phản hồi hoặc ghi chú được lưu trong ticket. |
|  |  |  | `is_internal` | Xác định nội dung chỉ dành cho nội bộ hay được hiển thị cho khách. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `sender_account_id` (FK → auth.users.id) | Tài khoản gửi tin, NULL khi người gửi là khách vãng lai hoặc hệ thống. |
|  |  |  | `sender_guest_session_id` (FK → guest_session.id) | Phiên khách vãng lai gửi tin, NULL với người gửi khác. |
| 76 | `support_ticket_message_attachment` | Tệp đính kèm của từng tin nhắn hỗ trợ. | `id` (PK) | Mã tệp đính kèm. |
|  |  |  | `message_id` (FK → support_ticket_message.id) | Tin nhắn hỗ trợ sở hữu tệp. |
|  |  |  | `file_url` | Đường dẫn hoặc khóa lưu tệp. |
|  |  |  | `file_name` | Tên gốc của tệp. |
|  |  |  | `file_size` | Kích thước tệp tính bằng byte. |
|  |  |  | `media_type` | Loại nội dung tệp. |
|  |  |  | `display_order` | Thứ tự tệp trong tin nhắn. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 77 | `staff` | Lưu thông tin tài khoản nhân viên, lễ tân, chuyên môn, CSKH và quản lý | `id` (PK) | Mã định danh nhân viên. |
|  |  |  | `full_name` | Họ tên nhân viên hiển thị trong hệ thống quản trị. |
|  |  |  | `phone_number` | Số điện thoại liên hệ của nhân viên. |
|  |  |  | `job_title` | Chức danh công việc, không phải vai trò cấp quyền truy cập. |
|  |  |  | `specialization` | Chuyên môn hoặc lĩnh vực phụ trách của nhân viên. |
|  |  |  | `hire_date` | Ngày nhân viên bắt đầu làm việc tại PawPal. |
|  |  |  | `email` | Email liên hệ công việc, không tự thay email đăng nhập. |
|  |  |  | `address` | Địa chỉ liên hệ nhân viên. |
|  |  |  | `dob` | Ngày sinh nhân viên. |
|  |  |  | `service_locked` | Cờ tạm ngừng phân công dịch vụ; độc lập quyền đăng nhập. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `auth_user_id` (FK → auth.users.id; UQ) | Tài khoản công vụ liên kết duy nhất của nhân viên. |
|  |  |  | `staff_level_id` (FK → staff_level.id) | Cấp độ chuyên môn hiện được công nhận. |
|  |  |  | `employment_status` | Trạng thái việc làm như đang làm, nghỉ phép dài hạn hoặc nghỉ việc. |
|  |  |  | `must_change_password` | Yêu cầu nhân viên đổi mật khẩu sau cấp hoặc reset; phải được kiểm tra phía máy chủ. |
| 78 | `staff_schedule` | Lưu lịch làm việc, ca trực và thời gian hoạt động của nhân viên | `id` (PK) | Mã định danh lịch làm việc. |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên được xếp lịch. |
|  |  |  | `availability_status` | Trạng thái đi làm hoặc khả dụng của nhân viên trong ca. |
|  |  |  | `reason` | Lý do nghỉ/vắng hoặc không được xếp ca. |
|  |  |  | `schedule_status` | Trạng thái phân ca và hiệu lực ca làm. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `start_at` | Thời điểm bắt đầu ca có múi giờ. |
|  |  |  | `end_at` | Thời điểm kết thúc ca có múi giờ. |
| 79 | `staff_assessment` | Lưu các lần sát hạch hoặc đánh giá kỹ năng thực tế của nhân viên. | `id` (PK) | Mã lần đánh giá. |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên được đánh giá. |
|  |  |  | `assessment_date` | Ngày thực hiện đánh giá. |
|  |  |  | `assessment_type` | Loại nội dung được đánh giá. |
|  |  |  | `score` | Điểm đánh giá theo thang 0–100. |
|  |  |  | `result` | Kết quả đạt, không đạt hoặc cần đào tạo lại. |
|  |  |  | `note` | Nhận xét và căn cứ đánh giá. |
|  |  |  | `assessed_by` (FK → staff.id) | Nhân viên có thẩm quyền thực hiện đánh giá. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 80 | `staff_shift_request` | Lưu yêu cầu xin đổi ca, xin nghỉ phép hoặc vắng mặt của nhân viên | `id` (PK) | Mã định danh duy nhất của yêu cầu đổi ca/nghỉ phép. |
|  |  |  | `request_type` | Loại yêu cầu (xin nghỉ, đổi ca, tăng ca). |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên gửi yêu cầu. |
|  |  |  | `target_staff_id` (FK → staff.id) | Nhân viên liên quan trong yêu cầu đổi ca. |
|  |  |  | `replacement_staff_id` (FK → staff.id) | Nhân viên nhận ca làm thay thế. |
|  |  |  | `leave_type` | Loại nghỉ phép (nghỉ ốm, nghỉ phép năm, việc riêng). |
|  |  |  | `start_date` | Ngày bắt đầu nghỉ hoặc đổi ca. |
|  |  |  | `end_date` | Ngày kết thúc nghỉ. |
|  |  |  | `shift` | Ca làm việc liên quan (sáng, chiều, tối). |
|  |  |  | `target_date` | Ngày chuyển đến trong ca làm việc mới. |
|  |  |  | `target_shift` | Ca làm việc mới sau khi chuyển đổi. |
|  |  |  | `reason` | Lý do gửi yêu cầu của nhân viên. |
|  |  |  | `status` | Trạng thái phê duyệt (chờ duyệt, đã duyệt, từ chối). |
|  |  |  | `created_by` (FK → auth.users.id) | Người khởi tạo yêu cầu. |
|  |  |  | `reviewed_by` (FK → auth.users.id) | Quản lý thực hiện xét duyệt yêu cầu. |
|  |  |  | `reviewed_at` | Thời điểm xét duyệt yêu cầu. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 81 | `promotion` | Lưu các chương trình khuyến mãi đang áp dụng | `id` (PK) | Mã định danh duy nhất của chương trình. |
|  |  |  | `promotion_name` | Tên chương trình khuyến mãi hiển thị trên hệ thống. |
|  |  |  | `description` | Mô tả nội dung và điều kiện của chương trình. |
|  |  |  | `discount_type` | Cách tính mức giảm giá của chương trình. |
|  |  |  | `discount_value` | Mức giảm theo phần trăm hoặc số tiền cố định. |
|  |  |  | `start_date` | Ngày bắt đầu chương trình khuyến mãi. |
|  |  |  | `end_date` | Ngày kết thúc chương trình khuyến mãi. |
|  |  |  | `minimum_order_value` | Giá trị đơn hàng tối thiểu để được hưởng khuyến mãi. |
|  |  |  | `status` | Trạng thái vận hành của chương trình. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 82 | `promotion_product` | Lưu danh sách sản phẩm được áp dụng trong chương trình khuyến mãi | `id` (PK) | Mã định danh bản ghi áp dụng khuyến mãi cho sản phẩm. |
|  |  |  | `promotion_id` | Chương trình khuyến mãi được áp dụng. |
|  |  |  | `product_variant_id` (FK → product_variant.id) | Biến thể sản phẩm cụ thể được hưởng khuyến mãi. |
| 83 | `promotion_service` | Lưu danh sách dịch vụ được áp dụng trong chương trình khuyến mãi | `id` (PK) | Mã định danh bản ghi áp dụng khuyến mãi cho dịch vụ. |
|  |  |  | `promotion_id` | Chương trình khuyến mãi được áp dụng. |
|  |  |  | `service_id` (FK → service.id) | Dịch vụ được hưởng khuyến mãi. |
| 84 | `banner` | Lưu thông tin Banner quảng bá hiển thị trên website, gồm hình ảnh, tiêu đề, liên kết và thời gian hiển thị. | `id` (PK) | Mã định danh duy nhất của banner. |
|  |  |  | `image_url` | Hình ảnh banner được hiển thị trên website. |
|  |  |  | `title` | Tiêu đề chính hiển thị trên banner. |
|  |  |  | `description` | Mô tả hoặc thông điệp khuyến mãi trên banner. |
|  |  |  | `link` | Đường dẫn đến trang đích khi khách hàng bấm banner. |
|  |  |  | `button_text` | Nội dung nút kêu gọi hành động trên banner. |
|  |  |  | `display_order` | Thứ tự banner trong khu vực hiển thị. |
|  |  |  | `start_date` | Ngày bắt đầu hiển thị banner. |
|  |  |  | `end_date` | Ngày kết thúc hiển thị banner. |
|  |  |  | `status` | Trạng thái hiển thị của banner. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 85 | `blog_category` | Lưu danh mục bài viết | `id` (PK) | Mã định danh duy nhất của danh mục. |
|  |  |  | `category_name` | Tên danh mục bài viết. |
|  |  |  | `description` | Mô tả phạm vi nội dung của danh mục. |
|  |  |  | `display_order` | Thứ tự hiển thị danh mục trên website. |
|  |  |  | `status` | Trạng thái sử dụng của danh mục. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 86 | `blog_post` | Lưu bài viết chia sẻ kiến thức và tin tức trên website | `id` (PK) | Mã định danh duy nhất của bài viết. |
|  |  |  | `category_id` (FK → blog_category.id) | Danh mục bài viết mà bài viết thuộc về. |
|  |  |  | `title` | Tiêu đề bài viết hiển thị trên website. |
|  |  |  | `slug` (UQ) | Đường dẫn thân thiện dùng để truy cập bài viết. |
|  |  |  | `summary` | Phần tóm tắt ngắn dùng ở danh sách bài viết. |
|  |  |  | `content` | Nội dung đầy đủ của bài viết. |
|  |  |  | `thumbnail_url` | Hình ảnh đại diện của bài viết. |
|  |  |  | `author_id` (FK → staff.id) | Nhân viên chịu trách nhiệm biên soạn hoặc đăng bài. |
|  |  |  | `publish_at` | Thời điểm bài viết được công khai trên website. |
|  |  |  | `status` | Trạng thái xuất bản của bài viết. |
|  |  |  | `view_count` | Số lượt xem bài viết. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 87 | `notification` | Lưu các thông báo gửi đến khách hàng về trạng thái đơn hàng, lịch hẹn, yêu cầu hỗ trợ và giao dịch hoàn tiền; các FK liên quan giúp xác định chính xác đối tượng mà thông báo dẫn đến. | `id` (PK) | Mã định danh duy nhất của thông báo. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng nhận thông báo. |
|  |  |  | `notification_type` | Loại sự kiện tạo ra thông báo. |
|  |  |  | `title` | Tiêu đề ngắn hiển thị trong danh sách thông báo. |
|  |  |  | `content` | Nội dung chi tiết giúp khách hàng hiểu sự kiện đã xảy ra. |
|  |  |  | `sales_order_id` (FK → sales_order.id) | Đơn hàng liên quan đến thông báo. |
|  |  |  | `appointment_id` (FK → appointment.id) | Lịch hẹn liên quan đến thông báo. |
|  |  |  | `support_ticket_id` (FK → support_ticket.id) | Yêu cầu hỗ trợ liên quan đến thông báo. |
|  |  |  | `refund_transaction_id` (FK → refund_transaction.id) | Giao dịch hoàn tiền liên quan đến thông báo. |
|  |  |  | `sent_at` | Thời điểm thông báo được gửi/ghi nhận thành công. |
|  |  |  | `read_at` | Thời điểm khách hàng đọc thông báo. |
| 88 | `pawpal_setting` | Lưu các cấu hình chung của website như hotline, popup, top-bar và các thiết lập hệ thống khác. | `id` (PK) | Mã định danh duy nhất của cấu hình. |
|  |  |  | `setting_key` (UQ) | Mã khóa duy nhất dùng để truy xuất cấu hình trong hệ thống. |
|  |  |  | `setting_value` | Giá trị cấu hình được lưu theo kiểu dữ liệu đã khai báo. |
|  |  |  | `setting_type` | Kiểu dữ liệu thực tế của setting_value. |
|  |  |  | `description` | Giải thích mục đích và phạm vi sử dụng của cấu hình. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 89 | `audit_log` | Lưu lịch sử thao tác quan trọng của nhân viên nhằm phục vụ kiểm tra và truy vết hệ thống | `id` (PK) | Mã định danh duy nhất của bản ghi audit. |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên thực hiện thao tác. |
|  |  |  | `action` | Loại hành động đã thực hiện, ví dụ tạo, cập nhật, xóa hoặc duyệt. |
|  |  |  | `entity_name` | Tên thực thể bị tác động. |
|  |  |  | `entity_id` | Mã bản ghi cụ thể bị tác động. |
|  |  |  | `description` | Mô tả chi tiết thao tác và thay đổi quan trọng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 90 | `chat_conversation` | Quản lý các phiên hội thoại trực tuyến giữa khách hàng và AI Chatbot hoặc nhân viên tư vấn | `id` (PK) | Mã định danh duy nhất của phiên hội thoại. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng tham gia hội thoại. |
|  |  |  | `status` | Trạng thái phiên (đang mở, chờ xử lý, đã đóng). |
|  |  |  | `sentiment_level` (FK → chatbot_sentiment_tier.level) | Cấp độ cảm xúc hiện tại của khách hàng. |
|  |  |  | `sentiment_trend` | Xu hướng cảm xúc (tích cực, tiêu cực, leo thang). |
|  |  |  | `is_urgent` | Đánh dấu phiên hội thoại khẩn cấp cần can thiệp. |
|  |  |  | `assigned_staff_id` (FK → staff.id) | Nhân viên CSKH tiếp nhận xử lý phiên. |
|  |  |  | `ai_summary` | Tóm tắt nội dung hội thoại tự động bởi AI. |
|  |  |  | `internal_note` | Ghi chú nội bộ giữa các nhân viên hỗ trợ. |
|  |  |  | `sla_deadline` | Hạn chót thời gian cam kết phản hồi (SLA). |
|  |  |  | `resolved_at` | Thời điểm hội thoại được đóng thực tế. |
|  |  |  | `resolved_reason` | Lý do đóng hội thoại. |
|  |  |  | `resolved_by` (FK → staff.id) | Nhân viên đóng hội thoại. |
|  |  |  | `violation_count` | Số lần vi phạm quy tắc ngôn từ của phiên. |
|  |  |  | `blocked_until` | Thời gian tạm khóa người dùng nếu vi phạm nặng. |
|  |  |  | `channel` | Kênh tiếp nhận hội thoại (web, zalo, facebook). |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
|  |  |  | `guest_session_id` (FK → guest_session.id) | Phiên của khách vãng lai; có thể được giữ để truy vết sau khi khách đăng nhập. |
| 91 | `chat_message` | Lưu từng tin nhắn chi tiết trong các phiên hội thoại chat | `id` (PK) | Mã định danh duy nhất của tin nhắn. |
|  |  |  | `conversation_id` (FK → chat_conversation.id) | Phiên hội thoại chứa tin nhắn. |
|  |  |  | `sender_type` | Đối tượng gửi (khách hàng, bot, nhân viên). |
|  |  |  | `content` | Nội dung tin nhắn sau khi đã lọc kiểm duyệt. |
|  |  |  | `raw_content` | Nội dung gốc trước khi xử lý lọc từ khóa. |
|  |  |  | `is_toxic` | Đánh dấu tin nhắn chứa từ ngữ công kích hoặc tiêu cực. |
|  |  |  | `sentiment_score` | Điểm số đánh giá cảm xúc của tin nhắn. |
|  |  |  | `metadata` | Dữ liệu đính kèm dạng JSON (nút gợi ý, thẻ sản phẩm). |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `sender_account_id` (FK → auth.users.id) | Tài khoản gửi tin; NULL với phiên vãng lai hoặc bot/hệ thống. |
|  |  |  | `sender_guest_session_id` (FK → guest_session.id) | Phiên vãng lai gửi tin; NULL với tài khoản hoặc bot/hệ thống. |
| 92 | `chat_moderation_log` | Nhật ký kiểm duyệt nội dung tin nhắn và ghi nhận các vi phạm quy chuẩn giao tiếp | `id` (PK) | Mã định danh duy nhất của bản ghi kiểm duyệt. |
|  |  |  | `conversation_id` (FK → chat_conversation.id) | Phiên hội thoại xảy ra vi phạm. |
|  |  |  | `customer_id` (FK → customer.id) | Khách hàng có tin nhắn vi phạm. |
|  |  |  | `detected_keywords` | Danh sách từ khóa vi phạm được phát hiện. |
|  |  |  | `violation_count` | Số lần vi phạm cộng dồn của khách hàng. |
|  |  |  | `action_taken` | Biện pháp đã xử lý (cảnh báo, che từ, chặn tạm thời). |
|  |  |  | `notes` | Ghi chú thêm về bối cảnh vi phạm. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 93 | `chat_feedback` | Ghi nhận một đánh giá hài lòng cho mỗi hội thoại. | `id` (PK) | Mã đánh giá hội thoại. |
|  |  |  | `conversation_id` (FK → chat_conversation.id; UQ) | Hội thoại được đánh giá, duy nhất. |
|  |  |  | `score` | Mức hài lòng từ 1 đến 5. |
|  |  |  | `comment` | Nhận xét bổ sung của người tham gia. |
|  |  |  | `submitted_at` | Thời điểm gửi đánh giá. |
| 94 | `admin_copilot_history` | Lưu tin nhắn trợ lý nội bộ theo phiên của từng nhân viên. | `id` (PK) | Mã tin nhắn trợ lý. |
|  |  |  | `session_id` | Mã nhóm phiên trao đổi của nhân viên, không phải token đăng nhập. |
|  |  |  | `staff_id` (FK → staff.id) | Nhân viên sở hữu phiên trao đổi. |
|  |  |  | `role` | Vai trò tin nhắn người dùng, trợ lý hoặc hệ thống. |
|  |  |  | `content` | Nội dung tin nhắn. |
|  |  |  | `metadata` | Thông tin ngữ cảnh bổ trợ; không thay các quan hệ nghiệp vụ. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 95 | `chatbot_sentiment_tier` | Bảng phân tầng các cấp độ cảm xúc của khách hàng (Bình thường, Bức xúc, Khẩn cấp) kèm cam kết phản hồi SLA | `level` (PK) | Cấp độ cảm xúc (mã số hoặc định danh tầng). |
|  |  |  | `name` | Tên hiển thị của tầng cảm xúc. |
|  |  |  | `color_badge` | Mã màu hiển thị thẻ nhãn cảm xúc. |
|  |  |  | `sla_seconds` | Thời hạn cam kết phản hồi tối đa tính bằng giây. |
|  |  |  | `description` | Mô tả tiêu chuẩn và dấu hiệu nhận biết cấp độ. |
| 96 | `chatbot_sentiment_trigger` | Danh sách các mẫu từ khóa và biểu thức nhận diện cảm xúc khách hàng của hệ thống AI Chatbot | `id` (PK) | Mã định danh quy tắc kích hoạt. |
|  |  |  | `tier_level` (FK → chatbot_sentiment_tier.level) | Cấp độ cảm xúc tương ứng khi kích hoạt. |
|  |  |  | `trigger_pattern` | Mẫu từ khóa hoặc cụm từ nhận diện. |
|  |  |  | `weight` | Trọng số đánh giá mức độ ảnh hưởng. |
|  |  |  | `context_domain` | Ngữ cảnh áp dụng (giá cả, chất lượng, giao hàng, thái độ). |
|  |  |  | `is_active` | Trạng thái kích hoạt sử dụng quy tắc. |
| 97 | `chatbot_sentiment_action` | Quy định các hành vi phản ứng tự động của chatbot tương ứng với từng cấp độ cảm xúc | `id` (PK) | Mã định danh hành vi ứng phó. |
|  |  |  | `tier_level` (FK → chatbot_sentiment_tier.level) | Cấp độ cảm xúc kích hoạt hành động. |
|  |  |  | `bot_behavior` | Hành vi của bot (xoa dịu, xin lỗi, đề xuất đền bù). |
|  |  |  | `notify_admin` | Cờ bật thông báo khẩn cho quản trị viên. |
|  |  |  | `suggested_canned_id` (FK → chatbot_canned_response.id) | Mã câu trả lời mẫu gợi ý cho nhân viên. |
|  |  |  | `instructions` | Hướng dẫn xử lý nghiệp vụ cho nhân viên CSKH. |
| 98 | `chatbot_compensation_policy` | Chính sách đền bù và tặng điểm Pawpoint tự động khi khách hàng gặp sự cố dịch vụ | `id` (PK) | Mã định danh chính sách đền bù. |
|  |  |  | `issue_type` | Loại sự cố (trễ hẹn, sản phẩm lỗi, dịch vụ chưa đạt). |
|  |  |  | `max_points` | Số điểm Pawpoint tối đa được phép đền bù tự động. |
|  |  |  | `max_discount_vnd` | Số tiền giảm giá tối đa được áp dụng. |
|  |  |  | `approval_required` | Cờ yêu cầu quản trị viên duyệt trước khi cấp. |
|  |  |  | `description` | Mô tả chi tiết điều kiện và hạn mức áp dụng. |
|  |  |  | `is_active` | Trạng thái hiệu lực của chính sách. |
| 99 | `chatbot_handover_rule` | Quy tắc tự động bàn giao cuộc trò chuyện từ Bot sang nhân viên chuyên môn như KTV Grooming hoặc CSKH; không có thú y. | `id` (PK) | Mã định danh quy tắc chuyển tiếp. |
|  |  |  | `condition_name` | Tên điều kiện chuyển tiếp. |
|  |  |  | `trigger_type` | Loại kích hoạt (cảm xúc tiêu cực, từ khóa chuyên sâu, yêu cầu trực tiếp). |
|  |  |  | `threshold_value` | Ngưỡng kích hoạt. |
|  |  |  | `auto_assign_role` (FK → access_role.code) | Vai trò nhân viên tiếp nhận (CSKH, KTV, Quản lý). |
|  |  |  | `sla_seconds` | Thời gian cam kết tiếp nhận ca sau khi bàn giao. |
|  |  |  | `is_active` | Trạng thái kích hoạt quy tắc. |
| 100 | `chatbot_knowledge_faq` | Kho tri thức các câu hỏi thường gặp FAQ phục vụ giải đáp tự động cho khách hàng | `id` (PK) | Mã định danh câu hỏi tri thức. |
|  |  |  | `category` | Chuyên mục (dịch vụ, sản phẩm, chính sách đổi trả, bảng giá). |
|  |  |  | `question` | Nội dung câu hỏi thường gặp. |
|  |  |  | `answer` | Câu trả lời chuẩn mực đã được kiểm duyệt. |
|  |  |  | `keywords` | Từ khóa liên quan hỗ trợ tìm kiếm nhanh. |
|  |  |  | `priority` | Thứ tự ưu tiên hiển thị và đối soát. |
|  |  |  | `is_active` | Trạng thái sử dụng câu hỏi tri thức. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 101 | `chatbot_system_prompt` | Quản lý các System Prompt cấu hình nhân cách (Persona), phong cách giao tiếp và hướng dẫn hành vi của AI Chatbot | `id` (PK) | Mã định danh cấu hình Prompt. |
|  |  |  | `prompt_key` (UQ) | Mã khóa định danh prompt trong hệ thống. |
|  |  |  | `channel` | Kênh ứng dụng áp dụng prompt. |
|  |  |  | `persona_name` | Tên nhân cách của trợ lý ảo (Pawpal Assistant). |
|  |  |  | `tone_of_voice` | Tông giọng giao tiếp (thân thiện, chuyên nghiệp, ân cần). |
|  |  |  | `content` | Toàn văn nội dung Prompt hệ thống. |
|  |  |  | `is_active` | Trạng thái hiệu lực của prompt. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
|  |  |  | `updated_at` | Thời điểm cập nhật gần nhất. |
| 102 | `chatbot_canned_response` | Danh mục các câu trả lời nhanh soạn sẵn cho nhân viên CSKH và Chatbot | `id` (PK) | Mã định danh câu trả lời nhanh. |
|  |  |  | `shortcut` | Phím tắt gõ nhanh. |
|  |  |  | `title` | Tiêu đề gợi nhớ. |
|  |  |  | `content` | Nội dung mẫu phản hồi đầy đủ. |
|  |  |  | `category` | Chuyên mục phân loại tin nhắn. |
|  |  |  | `usage_count` | Số lượt sử dụng thực tế. |
|  |  |  | `is_active` | Trạng thái khả dụng. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 103 | `chatbot_profanity_filter` | Danh mục các từ ngữ nhạy cảm, thô tục cần tự động che hoặc chặn trong phiên chat | `id` (PK) | Mã định danh từ khóa lọc. |
|  |  |  | `keyword` | Từ hoặc cụm từ nhạy cảm. |
|  |  |  | `severity` | Mức độ nghiêm trọng của vi phạm. |
|  |  |  | `action` | Hành động xử lý (thay thế ký tự sao, chặn gửi tin, cảnh báo). |
|  |  |  | `replacement_text` | Chuỗi ký tự dùng để thay thế. |
|  |  |  | `is_active` | Trạng thái kích hoạt bộ lọc. |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 104 | `chatbot_scenario_matrix` | Ma trận các kịch bản kiểm thử (benchmark) đánh giá chất lượng phản hồi và độ chính xác của AI Chatbot | `id` (PK) | Mã định danh kịch bản kiểm định. |
|  |  |  | `scenario_name` | Tên kịch bản thử nghiệm. |
|  |  |  | `sample_user_input` | Câu nói mẫu của khách hàng thử nghiệm. |
|  |  |  | `expected_sentiment` | Cảm xúc mong đợi hệ thống nhận diện. |
|  |  |  | `expected_tool_call` | Công cụ/hàm nghiệp vụ mong đợi bot gọi. |
|  |  |  | `expected_handover` | Kỳ vọng có chuyển giao cho người thật hay không. |
|  |  |  | `benchmark_status` | Kết quả đánh giá kiểm thử (đạt, chưa đạt). |
|  |  |  | `created_at` | Thời điểm tạo bản ghi. |
| 105 | `document_embeddings` | Bảng lưu trữ vector embedding các đoạn tài liệu chính sách, cẩm nang chăm sóc thú cưng phục vụ tra cứu ngữ nghĩa RAG cho AI | `id` (PK) | Mã định danh duy nhất của vector tài liệu. |
|  |  |  | `content` | Nội dung văn bản được chia đoạn. |
|  |  |  | `metadata` | Thông tin ngữ cảnh và nguồn tài liệu. |
|  |  |  | `embedding` | Vector số học đại diện ngữ nghĩa của đoạn văn bản. |
