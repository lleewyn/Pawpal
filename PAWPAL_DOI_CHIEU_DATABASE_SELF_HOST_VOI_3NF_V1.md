# Đối chiếu database self-host với thiết kế 3NF V1

**Tài liệu lịch sử trước chuyển đổi.** Sau lần đối chiếu dưới đây, đã thay public bằng V1 đúng 105 bảng/906 cột. Xem [trạng thái triển khai hiện tại](PAWPAL_DATABASE_V1_TRIEN_KHAI.md). Báo cáo metadata tự sinh được làm mới theo database hiện tại nên không còn là ảnh chụp baseline; bản cũ được lưu trong thư mục backup trước V1 ngoài webroot.

Ngày kiểm tra: 21/10/2026. Thiết kế đích: [3NF V1](PAWPAL_THIET_KE_DATABASE_3NF_V1.md). Database kiểm tra: `postgres`, schema `public`, container local `supabase-db`.

## 1. Kết luận và điều chỉnh hướng triển khai

Database đang chạy là bản nền tương thích mã cũ, **chưa triển khai thiết kế V1**. Các kiểm thử Auth, CRUD, Realtime, backup và restore đã làm chỉ chứng minh những luồng tương thích đó hoạt động. Không dùng kết quả này để đánh dấu hoàn tất chuyển schema 3NF.

| Phạm vi | Kết quả đọc trực tiếp metadata |
|---|---:|
| Bảng nghiệp vụ trong V1 | 105 |
| Thuộc tính trong từ điển V1 | 906 |
| Bảng ứng dụng public hiện có | 21 |
| Bảng hiện có trùng tên V1 | 20 |
| Bảng hiện có ngoài V1 | 1 — `customer_activation_sms` |
| Bảng V1 chưa dựng | 85 |

20 bảng trùng tên không có nghĩa 20 bảng đã đạt V1. Chỉ `audit_log` và `membership_tier` có tập tên cột khớp từ điển; vẫn phải kiểm tra kiểu dữ liệu, khóa, quyền và quy tắc nghiệp vụ. Không lấy tỷ lệ 20/105 làm phần trăm hoàn thành.

**Từ mốc này, V1 là thiết kế đích cho công việc schema tiếp theo.** Không tiếp tục thêm bảng/cột cũ chỉ để một màn hình hết lỗi. Mỗi thay đổi phải có đối chiếu V1, migration, thay đổi mã liên quan và phép thử nghiệp vụ. Không tự bổ sung lại chi nhánh, nhiều kho, thú y hoặc các bảng đã loại khỏi V1.

Lần rà soát này chỉ đọc database, tạo báo cáo và điều chỉnh tài liệu triển khai; **chưa đổi schema, xóa bảng hay chuyển ứng dụng sang V1**.

## 2. Bằng chứng và khả năng kiểm tra lại

[Báo cáo metadata đầy đủ](scripts/database/self-host/schema-audit.generated.md) có:

- Đối chiếu cột cho cả 21 bảng hiện có; danh sách đầy đủ 85 bảng V1 chưa có.
- Các file ứng dụng tham chiếu từng bảng trong phạm vi quét, bao gồm Admin và phần public.
- Kiểu cột, NOT NULL, PK, FK, CHECK, chỉ mục, RLS, Realtime, view, hàm và trigger hiện tại.

Chạy lại từ thư mục dự án khi Docker đang chạy:

```powershell
node scripts/database/self-host/audit_v1_schema.cjs
```

Công cụ không đọc bản ghi nghiệp vụ hoặc `.env`, không gọi Cloud và không chạy DDL/DML. Kết quả so sánh tự động dựa trên **mục 15 của V1**; các quy tắc bằng văn bản tại mục 3–13 vẫn phải được chuyển thành đặc tả và kiểm thử. Cột ngoài từ điển là sai khác cần xét, không phải danh sách lệnh DROP tự động.

## 3. Sai khác cần xử lý theo từng nhóm

| Bảng hoặc nhóm | Hiện tại | Thiết kế đích và việc cần làm |
|---|---|---|
| `customer_activation_sms` | Queue SMS giả lập, tạo từ migration cũ `scripts/database/20261010_customer_activation.sql`; mã thêm khách vẫn ghi vào bảng | Không thuộc V1. Bỏ việc ghi queue và thông báo giả định gửi SMS trong luồng thêm khách; kiểm tra không còn caller rồi mới viết migration loại bảng. Không cần nhà cung cấp SMS cho phạm vi hiện tại |
| `customer` | Có `phone_main`, `email`, `is_temporary`, token kích hoạt và `membership_tier_id`; thiếu mã khách và tên trạng thái/liên hệ V1 | Chuyển số sang `customer_phone`; email liên hệ sang `contact_email`; có `customer_code`, `customer_status`; trạng thái có tài khoản suy ra từ `auth_user_id`. Hạng lấy từ `customer_membership`. Auth quản lý thông tin xác minh; không chuyển token mô phỏng thành cách đăng nhập thật |
| `customer_profile` | PK `id`, UNIQUE `customer_id` | Dùng `customer_id` làm PK/FK; sửa các upsert, mapping và quan hệ PostgREST đang dựa vào khóa cũ |
| `customer_address` | Có thêm `district`, `ward`; receiver có thể NULL; partial unique chỉ bảo đảm tối đa một mặc định | Đối chiếu cấu trúc địa chỉ V1 trước khi bỏ trường; chuyển thay/xóa địa chỉ vào một transaction, bảo đảm đúng một mặc định nếu còn địa chỉ. Mã hiện có xóa rồi chèn bằng nhiều request chưa bảo đảm nguyên tử |
| `customer_membership`, `membership_tier` | Membership có PK `id`, `total_paw_points`, `tier_points`; mã sửa hạng nâng điểm theo sàn cứng | Membership dùng PK `customer_id`, thêm `assigned_at`; hạng xét từ chi tiêu hợp lệ, tách khỏi điểm tiêu được. Không nâng số dư điểm khi đổi hạng. Tên cột membership_tier khớp nhưng nghiệp vụ xét hạng chưa thực hiện |
| `paw_point_transaction` | Có điểm và balance_after; chưa có khóa chống lặp, thứ tự hoặc FK nguồn nghiệp vụ | Bổ sung nguồn và idempotency theo V1; ghi điểm trong transaction có khóa theo khách; số dư cung cấp qua view. `balance_after` chỉ là đối soát tùy chọn theo mục 4 V1, không kết luận vi phạm 3NF chỉ vì khác từ điển |
| `pet_profile` | Loài/giống text, cân hiện tại lưu trực tiếp, có `vaccination_history`, thiếu `safety_note` | Dựng `pet_species`, `pet_breed`, dùng `breed_id`; cân hiện tại đọc lịch đo; loại luồng tiêm phòng khỏi mã và schema theo phạm vi không thú y; giữ dị ứng/an toàn dạng ghi chú tự do |
| `pet_weight_history` | `recorded_by_name` là text; thiếu FK người ghi và ghi chú | Thêm `recorded_by` FK và `note`; đọc tên qua nhân viên. Chốt view cân hiện tại với thứ tự measured_at, created_at, id; kiểm thử ghi bù lịch sử không làm sai cân mới nhất |
| `staff` và phân quyền | `system_role` text, `permissions` jsonb; hàm `pawpal_is_staff()` chỉ kiểm tra nhân viên ACTIVE | Dựng permission/access_role/role_permission/staff_role/staff_permission, staff_level; tách nghề nghiệp và quyền truy cập. RLS hiện tại cho staff active quyền rộng ở các bảng lõi, chưa phải phân quyền từng nghiệp vụ theo V1; ẩn KPI trên UI không thay RLS. Trường JSON quyền không phải dữ liệu mock, nhưng cần chuyển quan hệ theo V1 |
| `service` | Nhóm dịch vụ text, ảnh đại diện trực tiếp; mới là bảng rút gọn | Dựng service_category, staff_level, các bảng loài hỗ trợ, ảnh, addon, giá và checklist theo V1; thumbnail suy ra. Không triển khai upload thật trong đợt chưa có yêu cầu file |
| `appointment` | Ngày và giờ rời, service_id một nguồn, trạng thái thanh toán/tổng tiền ghi trực tiếp | Dùng thời điểm dự kiến có múi giờ, appointment_item, adjustment, record; dịch vụ và giá theo dòng đã chốt. Giữ appointment_record vì có biên bản riêng trong nghiệp vụ; trạng thái thu tiền lấy từ thanh toán |
| `care_log` | Có pet_id và health_status; thiếu thao tác, FK người ghi, nội dung quan sát V1 | Gắn vào ca và care_action, dùng observed_condition, recorded_by và snapshot tên thao tác. Nhật ký chăm sóc không trở thành bệnh án |
| `product`, `product_variant` | Chỉ đủ các cột Dashboard đang đọc; thiếu danh mục và màu/size/flavor | Bổ sung cấu trúc V1 và các bảng liên quan; brand_name đã đúng hướng text, không dựng bảng brand. Kiểm tra unique tổ hợp biến thể kể cả NULL |
| `inventory` | Có số dư và ngưỡng, chưa có sổ nhập/xuất và giữ hàng | Dựng inventory_transaction, stock_reservation và nguồn chứng từ V1; số dư là tổng hợp đối soát. Cột last_updated_at khác tên hiện tại cần ánh xạ. Chỉ một kho chung; không bổ sung warehouse |
| `sales_order` | Có shipping_address_id, tổng và trạng thái thanh toán; chưa có dòng hàng hoặc địa chỉ snapshot | Dựng sales_order_detail, cấu hình giao nhận và snapshot ngay trên đơn; tổng/trạng thái tính qua nguồn nghiệp vụ. Không dựng shipment hoặc sales_order_shipping_snapshot |
| `payment`, `refund_transaction` và các bảng nguồn tiền | Chưa có | Dựng theo V1: mỗi lần thu gắn đúng một đơn hoặc lịch; hoàn gắn lần thu gốc; kiểm tra khách, số tiền, tổng thu/hoàn và chống lặp trong transaction. Không thêm payment_allocation/refund_allocation |
| `support_ticket` | Rút gọn với user_id và title; thiếu nhiều nội dung xử lý và người phụ trách | Theo FK khách/đơn/lịch V1, dùng subject và các trường quy trình xử lý, bổ sung message/attachment; không xóa title trước khi sửa Dashboard và các truy vấn khiếu nại |
| `notification` | Có is_read và related_entity_type ngoài từ điển; thiếu FK hoàn tiền | Chuyển theo FK V1 và read_at; cập nhật người đọc/thông báo. Không nhầm việc có bảng với việc đã có quy trình thông báo hoàn chỉnh |
| `chat_conversation` | session_token trực tiếp; thiếu guest_session_id và metadata giải quyết | Dùng guest_session theo V1, bổ sung tin nhắn/kiểm duyệt/phản hồi và quy trình giải quyết. Dashboard hiện chỉ kiểm tra đọc số hội thoại |
| `audit_log` | Tên cột khớp; trigger đã gán actor thực, cấm sửa/xóa từ client | Giữ cơ chế actor đã kiểm tra; rà quyền theo vai trò mới và ghi audit cùng transaction nghiệp vụ. Không coi khớp cột là đã hoàn tất toàn bộ hệ thống audit |

Các nhóm khác trong 85 bảng chưa có gồm wishlist/giỏ hàng, voucher, mua hàng/đổi trả, nhân sự và lịch ca, đánh giá, nội dung và cấu hình chatbot. Danh mục đầy đủ nằm trong báo cáo metadata; chưa đánh dấu chúng là đã triển khai.

## 4. Những vị trí mã phải chuyển trước khi bỏ cấu trúc cũ

Đây là các điểm đã xác định trực tiếp, bổ sung cho danh sách file tự động; không giới hạn thay đổi tương lai vào riêng Admin.

| Vị trí | Phụ thuộc cũ và tác động |
|---|---|
| `pages/admin/modules/customers/subtabs/tab-customer-list.js` | Tạo activation_token/expiry, ghi customer_activation_sms, tạo membership và pet. Phải chuyển trọn luồng thêm khách; bỏ queue riêng lẻ chưa đủ |
| `pages/admin/modules/pets/subtabs/tab-pet-list.js` | Thêm nhanh chủ cũng tạo activation_token; tạo pet có vaccination_history, ghi cân và tên người ghi. Phải sửa cả luồng tạo chủ từ modal thú cưng |
| `pages/admin/modules/customers/subtabs/tab-customer-profile.js` | Ghi phone_main, thay địa chỉ qua nhiều request, nâng total_paw_points bằng tierFloors khi sửa hạng. Cần transaction/RPC và nguồn hạng/điểm riêng |
| `pages/admin/modules/customers/customers.js` | Select/mapping hồ sơ, điện thoại, membership, species/breed/weight và vaccination_history; cần thay quan hệ và nguồn dữ liệu hiển thị |
| `pages/admin/modules/pets/pets.js`, `subtabs/tab-pet-profile.js` | Nạp/lưu cân và tên người ghi, có luồng cập nhật lịch sử tiêm; phải loại chức năng tiêm và sửa nguồn cân/giống, không chỉ xóa cột |
| `pages/admin/modules/services/services.js` | Join pet và customer theo phone_main/species/breed/weight/vaccination_history; schema mới làm các select cũ lỗi |
| `pages/admin/modules/orders/subtabs/tab-order-list.js` | Có thao tác đọc/ghi trực tiếp total_paw_points; cần chuyển cùng sổ điểm/thu tiền, tránh ghi hai nguồn |
| `pages/admin/modules/complaints/subtabs/tab-complaint-detail.js` | Có thao tác bù điểm bằng update/insert membership; cần dùng nghiệp vụ ghi điểm có idempotency và audit |
| `pages/admin/modules/chatbot/chatbot.js` | Đọc total_paw_points từ membership; phải chuyển nguồn số dư |
| `pages/admin/admin-data-store.js`, `pages/admin/modules/dashboard/dashboard.js` | Cache, select và subscription theo tên bảng/cột cũ; đổi nguồn view/RPC cùng mapping và bộ kiểm thử Realtime, ngày/múi giờ, thu nhập |
| `scripts/api`, `api`, các trang public | Phải rà các caller của bảng/cột và RPC trong báo cáo trước khi chuyển môi trường chính. Tìm chuỗi không chứng minh đầy đủ các truy vấn sinh động |

Các script kiểm thử tương thích hiện tại cũng phải được chuyển theo từng đợt; kết quả kiểm thử cũ không phải bộ tiêu chí V1.

## 5. Kế hoạch chuyển đổi lấy V1 làm chuẩn

Không chạy DROP hàng loạt rồi sửa UI sau. Dữ liệu hiện tại là thử nghiệm nên không bắt buộc ETL dữ liệu Cloud; vẫn giữ bản nền để đối chiếu và quay lui.

| Đợt | Công việc | Điều kiện nghiệm thu |
|---|---|---|
| 0 — Đối chiếu | Đọc metadata, so 105 thực thể/906 thuộc tính, chỉ ra mã cũ và rủi ro | Hoàn thành trong lần rà soát này; báo cáo có thể tạo lại |
| 1 — Đặc tả vật lý nhóm lõi | Tài khoản/quyền, customer/profile/phone/address, pet_species/breed/profile/weight; chốt kiểu, NULL/default, PK/FK/UQ, RLS, RPC và view cho giá trị suy ra | Không thêm thực thể ngoài V1; giải quyết các giả định/chỗ còn thiếu trong V1 trước khi sinh SQL; quy định status và khóa liên kết Auth |
| 2 — Dựng và chuyển nhóm lõi trên bản V1 riêng | Migration trong bộ riêng với bootstrap tương thích 001–004; dựng thử từ rỗng, giữ Auth do Supabase quản lý. Sửa đăng nhập, danh sách và từng modal khách/thú cưng theo thứ tự nghiệm thu | CRUD thật, Autocomplete liên kết đúng, khách tại quầy không cần Auth, kiểm thử truy cập chéo và quyền tối thiểu, số chính/địa chỉ mặc định đúng cả khi thao tác đồng thời; không còn ghi queue SMS/tiêm phòng |
| 3 — Tiền và điểm cùng nguồn giao dịch | Đặc tả payment/refund, điểm, voucher và liên kết đơn/lịch; hạng theo chi tiêu. Không đưa nguồn điểm giả hoặc tổng nhập tay vào V1 để giữ UI cũ | Kiểm tra thu/hoàn vượt mức, gửi lặp, xử lý đồng thời, đổi hạng không tự tăng điểm, audit và đối soát số dư |
| 4 — Dịch vụ, lịch, hotel, taxi và biên bản | Bổ sung nhóm bảng V1, chuyển giá theo dòng, lịch và constraint chồng lấn | Biên bản riêng hoạt động; không thú y; Realtime đúng và có kiểm tra giao dịch |
| 5 — Bán hàng, kho và đổi trả | Sản phẩm/biến thể, cart/wishlist, dòng đơn, giao nhận trong đơn, sổ kho và giữ tồn | Không âm/vượt tồn khi hai phiên thao tác; đổi địa chỉ không thay đơn cũ; hoàn tiền và nhập kho là hai quyết định riêng |
| 6 — Các nhóm còn lại và Dashboard | Khiếu nại, chat, nhân sự, đánh giá, nội dung/cấu hình; hoàn thiện các nguồn tổng hợp của Dashboard | Tất cả 105 thực thể được phân loại triển khai hoặc trì hoãn có lý do; không tự gọi phần trì hoãn là hoàn tất; không fallback JSON/mock |
| 7 — Chuyển môi trường và quay lui | Backup, dựng từ rỗng, restore trên môi trường V1; kiểm thử toàn luồng; sau đó mới đổi cấu hình bản chạy chính | Lưu mốc mã + cấu hình + database tương ứng; quay lui cả bộ, không chỉ đổi URL về schema cũ. Vercel cần máy chủ online HTTPS và kiểm tra riêng |

Điểm, hạng và tiền chưa thể hoàn thành độc lập bằng cách thêm vài cột vào nhóm lõi. Khi các bảng nguồn chưa dựng, trạng thái phải ghi là chưa triển khai; không dùng giá trị giả để làm màn hình có vẻ đầy đủ.

Nếu dùng view tương thích tên cũ tạm thời, view phải đọc từ một nguồn dữ liệu V1, có kiểm soát RLS/quyền (không vô tình chạy với quyền chủ view), và có mốc bỏ. Không giữ hai bộ cột lõi cùng được ghi độc lập.

Theo AGENTS.md, các modal được phân tích, sửa và kiểm tra trực quan tuần tự, báo nghiệm thu từng modal trước khi chuyển modal kế tiếp. Việc kiểm kê schema không đồng nghĩa đã nghiệm thu lại các modal.

## 6. Trạng thái sau lần rà soát

- [x] Đối chiếu đủ 21 bảng public thực tế với từ điển 105 thực thể.
- [x] Liệt kê toàn bộ bảng/cột thiếu và ngoài từ điển; thu metadata khóa, chỉ mục, chính sách, trigger.
- [x] Xác định nguồn customer_activation_sms, các phụ thuộc kích hoạt, điểm, tiêm phòng và quyền còn khác V1.
- [x] Điều chỉnh tài liệu triển khai: dừng mở rộng baseline cũ; công việc schema tiếp theo theo V1.
- [ ] Hoàn tất đặc tả vật lý V1 và viết bộ migration riêng.
- [ ] Chuyển mã, loại bảng/cột cũ và kiểm thử V1 theo từng đợt.
- [ ] Chuyển bản web chính/Vercel sang môi trường V1 đã nghiệm thu.

Không có lệnh xóa bảng, đổi quyền, ghi dữ liệu hoặc migration nào được áp dụng trong lần rà soát này. Baseline local vẫn giữ nguyên để sử dụng và so sánh.
