# PAWPAL — ADMIN DASHBOARD TỔNG QUAN

> **Tài liệu triển khai dành cho Codex trong VS Code**  
> Phạm vi: **Admin Sidebar → Dashboard Tổng quan → 2 sub-tab duy nhất**: (1) **Kinh doanh & Tăng trưởng**, (2) **Quản trị vận hành**.  
> Nguồn dữ liệu: Supabase PostgreSQL của PawPal (thiết kế khoảng 105 bảng).  
> **Ưu tiên:** sử dụng đúng schema, công nghệ và kiến trúc hiện hữu; không tạo dữ liệu giả, không tự ý thay đổi nghiệp vụ.

## HƯỚNG DẪN CODEX THỰC THI

1. Đọc tài liệu này, khảo sát cấu trúc repository, router, component library, authentication, phân quyền Admin, các migrations/types Supabase, API/data-access hiện hữu.
2. **Đối chiếu tất cả bảng, cột, FK, enum và trạng thái** nêu trong tài liệu với schema thật. Danh sách trường phía dưới là *ứng viên ánh xạ từ tài liệu thiết kế*, không phải cam kết schema đang chạy. Không tồn tại thì không tự tạo cột/bảng hoặc giả định tên khác: ghi nhận điểm lệch, tận dụng bảng/trường thật nếu có quan hệ tương đương, và báo rõ tính năng bị chặn.
3. Lập danh sách component, nguồn dữ liệu, công thức và trạng thái triển khai. Sau đó triển khai theo thứ tự: lớp truy vấn tổng hợp → API/RPC hoặc server data layer → UI → kiểm thử. Tận dụng conventions của dự án; không dựng ứng dụng mới.
4. Không tự sửa 105 bảng gốc hoặc migration dữ liệu nghiệp vụ. Nếu cần view/function/index mới, đề xuất migration độc lập, có quyền truy cập phù hợp và không làm hỏng dữ liệu.
5. Không đưa service-role key lên client. Không đưa dữ liệu cá nhân hoặc dữ liệu tài chính nhạy cảm cho AI ngoài phạm vi được cho phép. Không tạo fake KPI, fake forecast, fake AI insights để che lỗi.
6. Kết thúc bằng báo cáo file đã sửa, mapping thực tế đã xác minh, phần đã hoàn thành, phần bị chặn, cách chạy/test và câu hỏi nghiệp vụ còn cần chốt.

---

# 1. TỔNG QUAN MÀN HÌNH DASHBOARD — BUSINESS QUESTIONS

Dashboard là điểm tổng hợp giúp Admin theo dõi tình hình PawPal và đưa ra quyết định dựa trên dữ liệu. Sidebar chỉ có **một** mục Dashboard Tổng quan. Bên trong có **đúng hai** sub-tab, không chia thành nhiều sub-tab con. Mỗi sub-tab chứa KPI, biểu đồ, bảng phân tích và khu vực nhận xét/cảnh báo liên quan.

### 1.1. Tab Kinh doanh & Tăng trưởng

- **KD01:** Kết quả thu tiền hiện tại ra sao, tăng hay giảm so với kỳ trước?
- **KD02:** Bán sản phẩm hay cung cấp dịch vụ đóng góp nhiều hơn vào nguồn thu?
- **KD03:** Sản phẩm và dịch vụ nào nổi bật theo lượng giao dịch và giá trị giao dịch?
- **KD04:** Khách hàng mới và khách quay lại thay đổi như thế nào?
- **KD05:** Voucher, Paw Points và hạng thành viên được sử dụng như thế nào?
- **KD06:** Xu hướng tiền thu, đơn hàng, nhu cầu dịch vụ sắp tới có dấu hiệu gì? Có đủ dữ liệu để dự báo không?

### 1.2. Tab Quản trị vận hành

- **VH01:** Cửa hàng đang có bao nhiêu lịch hẹn và công việc cần xử lý?
- **VH02:** Dịch vụ nào được đặt nhiều, ngày/giờ nào cao điểm?
- **VH03:** Nhân viên được phân bổ ra sao; khung giờ nào có nguy cơ thiếu năng lực phục vụ?
- **VH04:** Đơn hàng ở trạng thái nào, có tồn đọng hoặc đổi trả không?
- **VH05:** Biến thể sản phẩm nào tồn thấp, có nguy cơ thiếu hàng và cần xem xét nhập bổ sung?
- **VH06:** Phản hồi, đánh giá và yêu cầu hỗ trợ khách hàng đang được xử lý thế nào?
- **VH07:** Quản lý cần ưu tiên giải quyết vấn đề gì ngay hoặc trong ngắn hạn?

---

# 2. BỐ CỤC GIAO DIỆN VÀ MÔ TẢ SUB-TAB

## 2.1. Khung chung

Khi Admin nhấp Dashboard trên Sidebar, hiển thị tiêu đề **Dashboard Tổng quan**, hai sub-tab đặt sát đầu nội dung và bộ lọc thời gian. Tab **Kinh doanh & Tăng trưởng** mặc định 30 ngày gần nhất; tab **Quản trị vận hành** mặc định hôm nay. Cung cấp lựa chọn hôm nay, 7 ngày, 30 ngày, 90 ngày và khoảng ngày tùy chỉnh khi phù hợp với từng tab. Hiển thị thời điểm cập nhật cuối và nút làm mới. Chuyển tab không được làm mất trạng thái lọc của tab còn lại nếu người dùng chưa tải lại trang.

Giao diện dùng design system, responsive layout, format VNĐ và timezone `Asia/Ho_Chi_Minh`. Biểu đồ có tiêu đề, trục, đơn vị, tooltip và chú giải. KPI cần nhãn giải thích khi tên có thể gây nhầm lẫn. Không dùng màu đơn độc để phân biệt trạng thái. Với dữ liệu không khả dụng, hiển thị lý do cụ thể thay vì số 0 giả.

## 2.2. Kinh doanh & Tăng trưởng

Đầu tab là các thẻ KPI thể hiện **tiền thu thành công, tiền hoàn thành công, tiền thu thuần, tăng trưởng so với kỳ trước, tiền thu sản phẩm, tiền thu dịch vụ, khách hàng mới và tỷ lệ khách quay lại**. Có thể ưu tiên 4–6 thẻ quan trọng trên hàng đầu, phần còn lại bố trí hợp lý bên dưới. Chỉ số tiền thu thuần không được đặt nhãn “lợi nhuận”.

Bên dưới là biểu đồ đường theo ngày/tuần/tháng thể hiện tiền thu, hoàn tiền và thu thuần, có thể đối chiếu kỳ trước. Biểu đồ cột chồng hoặc donut thể hiện cơ cấu tiền thu theo sản phẩm, dịch vụ và chưa phân loại (nếu có). Kế tiếp là hai bảng/biểu đồ thanh ngang xếp hạng sản phẩm và dịch vụ theo số lượng và giá trị giao dịch; cho phép đổi tiêu chí xếp hạng.

Khu vực khách hàng thể hiện xu hướng khách đăng ký mới và khách quay lại, phân bố hạng thành viên. Khu vực ưu đãi thể hiện lượt dùng voucher và giá trị giảm giá. Cuối tab là **Xu hướng & Nhận xét**: tổng hợp biến động đáng chú ý bằng quy tắc xác định; chỉ hiển thị dự báo 7–30 ngày nếu dữ liệu lịch sử và chất lượng kiểm định đủ điều kiện. AI Analysis là tùy chọn tăng cường khả năng diễn giải, không phải điều kiện để Dashboard hoạt động.

## 2.3. Quản trị vận hành

Đầu tab hiển thị KPI **lịch hẹn hôm nay, lịch cần xử lý, đơn cần xử lý, nhân viên có ca, biến thể tồn thấp và ticket chưa hoàn tất**. Các KPI ưu tiên ngữ cảnh trong ngày; các chỉ số tồn kho hoặc ticket có thể là ảnh chụp trạng thái hiện tại, phải ghi rõ thay vì giả định chúng chịu bộ lọc ngày.

Tiếp theo là biểu đồ trạng thái lịch hẹn và trạng thái đơn hàng, sau đó là biểu đồ dịch vụ được đặt nhiều và heatmap theo ngày trong tuần/giờ bắt đầu. Khu vực nhân sự cho biết lịch hẹn được phân công, số ca hợp lệ và tỷ lệ hoàn thành theo nhân viên; nếu đủ dữ liệu thời lượng/năng lực, bổ sung chỉ số tải phục vụ theo khung giờ. Không suy luận thiếu nhân sự chỉ từ số lượng lịch.

Phần tồn kho là bảng các biến thể tồn thấp, ngưỡng tối thiểu, tốc độ bán gần đây, số ngày đủ hàng ước tính và mức độ ưu tiên. Phần cuối là **Công việc cần xử lý & Cảnh báo vận hành** với mã tham chiếu, lý do, thời gian chờ và liên kết sang màn hình quản lý tương ứng. Nhận xét cần dựa trên ngưỡng/quy tắc kiểm chứng được; AI chỉ giải thích, không tự thao tác nghiệp vụ.

---

# 3. ĐẶC TẢ DỮ LIỆU TỪNG THÀNH PHẦN

## 3.1. Kinh doanh & Tăng trưởng

| ID | Thành phần / UI | Cách tính / dữ liệu | BQ |
|---|---|---|---|
| KD-K01 | KPI Tiền thu thành công | SUM(`payment.amount`) của giao dịch thành công, theo `succeeded_at` trong kỳ | KD01 |
| KD-K02 | KPI Hoàn tiền | SUM(`refund_transaction.refunded_amount`) của hoàn tiền hoàn tất, theo `completed_at` trong kỳ | KD01 |
| KD-K03 | KPI Tiền thu thuần | KD-K01 − KD-K02; **dòng tiền thuần**, không phải lợi nhuận | KD01 |
| KD-K04 | KPI Tăng trưởng | (Thu thuần kỳ này − thu thuần kỳ trước) / ABS(thu thuần kỳ trước) × 100%; nếu mẫu số = 0 thì N/A | KD01 |
| KD-K05 | KPI Thu sản phẩm / dịch vụ | Phân nhóm payment theo liên kết `order_id` / `appointment_id`; giao dịch mơ hồ hoặc không phân loại tách riêng | KD02 |
| KD-K06 | KPI Khách mới | COUNT DISTINCT khách đăng ký trong kỳ theo thời điểm đăng ký hợp lệ | KD04 |
| KD-K07 | KPI Tỷ lệ quay lại | Khách có ≥2 giao dịch hợp lệ / khách có ≥1 giao dịch hợp lệ trong cohort đã chốt; cần thống nhất định nghĩa trước khi bật | KD04 |
| KD-C01 | Line chart Thu tiền theo thời gian | Nhóm payment/refund theo ngày/tuần/tháng, phân biệt thu/hoàn/thuần | KD01 |
| KD-C02 | Stacked bar / donut Cơ cấu nguồn thu | Tổng tiền thu phân nhóm sản phẩm/dịch vụ/chưa phân loại | KD02 |
| KD-C03 | Bar Top sản phẩm | SUM số lượng, SUM giá trị dòng hàng theo biến thể/sản phẩm; lọc đơn hợp lệ | KD03 |
| KD-C04 | Bar Top dịch vụ | SUM số lượt/quantity và giá trị dòng dịch vụ; lọc lịch hợp lệ | KD03 |
| KD-C05 | Chart Khách hàng | Khách mới, khách quay lại theo kỳ; hạng thành viên hiện tại | KD04 |
| KD-C06 | Chart Ưu đãi | Voucher đã dùng, giá trị giảm giá snapshot, phân bố membership | KD05 |
| KD-C07 | Chart Xu hướng / dự báo | Lịch sử thực tế; chỉ thêm đường forecast khi đủ dữ liệu và có kiểm định | KD06 |
| KD-T01 | Nhận xét / AI Insights | Nhận xét có căn cứ từ KPI, nêu rõ kỳ và nguồn; không tự tạo con số | KD01–06 |

**Nguyên tắc:** Không JOIN payment trực tiếp với nhiều dòng order detail/refund rồi SUM gây nhân đôi. Tiền thu theo thanh toán khác với giá trị hàng/dịch vụ theo dòng chi tiết. Khi so sánh kỳ trước, dùng hai khoảng thời gian có độ dài tương đương. Nếu chưa xác định COD được ghi nhận khi nào hoặc hoàn tiền một phần ra sao, phải đánh dấu chỉ số liên quan cần xác nhận.

## 3.2. Quản trị vận hành

| ID | Thành phần / UI | Cách tính / dữ liệu | BQ |
|---|---|---|---|
| VH-K01 | KPI Lịch hẹn hôm nay | COUNT DISTINCT appointment có `scheduled_start_at` thuộc ngày tại VN | VH01 |
| VH-K02 | KPI Lịch cần xử lý | COUNT appointment theo tập trạng thái cần xử lý đã đối chiếu enum | VH01 |
| VH-K03 | KPI Đơn cần xử lý | COUNT sales_order theo trạng thái cần thao tác | VH04 |
| VH-K04 | KPI Nhân viên có ca | COUNT DISTINCT staff có lịch làm việc hợp lệ, giao với kỳ | VH03 |
| VH-K05 | KPI Tồn kho thấp | COUNT biến thể có `quantity_in_stock <= minimum_stock` | VH05 |
| VH-K06 | KPI Ticket chưa hoàn tất | COUNT support_ticket có trạng thái chưa đóng | VH06 |
| VH-C01 | Biểu đồ trạng thái lịch | COUNT appointment GROUP BY appointment_status | VH01 |
| VH-C02 | Biểu đồ trạng thái đơn | COUNT sales_order GROUP BY order_status | VH04 |
| VH-C03 | Top dịch vụ | SUM appointment_item.quantity theo service_id; loại lịch không hợp lệ | VH02 |
| VH-C04 | Heatmap lịch hẹn | COUNT appointment theo thứ trong tuần và giờ bắt đầu, timezone VN | VH02 |
| VH-C05 | Biểu đồ nhân sự | Số lịch theo staff_id, tỷ lệ hoàn thành; thời lượng nếu schema có | VH03 |
| VH-T01 | Bảng tồn kho | Tồn hiện tại, tồn tối thiểu, bán/ngày; days-of-cover = tồn khả dụng / bán trung bình/ngày khi mẫu số > 0 | VH05 |
| VH-T02 | Bảng công việc | Lịch/đơn/ticket tồn đọng, thời điểm phát sinh, mức ưu tiên theo rule | VH01/04/06 |
| VH-T03 | Cảnh báo / AI Insights | Rule cảnh báo có bằng chứng: tồn thấp, quá hạn xử lý, lịch dày; AI diễn giải tùy chọn | VH07 |

**Nguyên tắc:** Một lịch nhiều dịch vụ không được tính thành nhiều lịch khi KPI đếm appointment. Dữ liệu nhân sự phải xét ca, nghỉ, khả dụng và thời lượng; chỉ kết luận “nguy cơ thiếu người” khi có căn cứ năng lực. Với `stock_reservation`, xác minh `quantity_in_stock` đã trừ phần giữ chỗ chưa trước khi tính tồn khả dụng.

---

# 4. NGHIỆP VỤ VÀ LUỒNG THAO TÁC

## 4.1. Truy cập và lọc

Admin đã xác thực và có quyền truy cập chọn Dashboard trong Sidebar. Hệ thống mở sub-tab mặc định, tải các dữ liệu tổng hợp của tab đó và hiển thị thời điểm cập nhật. Khi chuyển tab, nội dung và bộ lọc tương ứng thay đổi mà không tải lại toàn bộ ứng dụng. Khi chọn khoảng thời gian mới, tất cả thành phần phụ thuộc khoảng thời gian phải được truy vấn lại đồng bộ. Với các KPI snapshot như tồn kho hiện tại, giao diện phải nêu rõ chúng không bị chi phối bởi bộ lọc lịch sử nếu chưa có dữ liệu snapshot theo thời gian.

## 4.2. Tương tác và điều hướng

Hover biểu đồ hiển thị tooltip có nhãn, đơn vị và giá trị. Các thành phần có khả năng drill-down phải dẫn đến trang nghiệp vụ hiện hữu, ví dụ đơn hàng, lịch hẹn, nhân viên, tồn kho hoặc ticket, có thể mang theo bộ lọc khi router hỗ trợ. Dashboard chỉ đọc; mọi cập nhật đơn hàng, lịch hẹn, tồn kho và phân ca được thực hiện tại các màn hình nghiệp vụ có phân quyền.

## 4.3. Đồng bộ và làm mới

Dữ liệu tải khi vào tab, đổi bộ lọc và nhấn làm mới. Với vận hành, có thể subscribe Supabase Realtime cho những bảng thực sự liên quan và **invalidate/refetch** truy vấn khi thay đổi; không tự cộng trừ KPI từ payload event. Có cơ chế debounce/coalescing để tránh nhiều truy vấn liên tiếp. Nếu Realtime không sẵn có, dùng polling với khoảng hợp lý, ngừng khi trang không hoạt động nếu framework hỗ trợ. Không để listener trùng hoặc memory leak khi đổi tab.

## 4.4. Phân tích và đề xuất

Trước tiên, hệ thống tính toán KPI và phát hiện tình huống bằng quy tắc xác định, chẳng hạn tồn thấp hơn mức tối thiểu hoặc số ticket quá hạn theo SLA đã được cấu hình. Các nhận xét phải ghi rõ chỉ số và khoảng thời gian làm căn cứ. Nếu AI Analysis được bật và có quyền sử dụng, chỉ gửi dữ liệu tổng hợp tối thiểu cho mô hình; AI chỉ tóm tắt và diễn giải. Nếu AI lỗi hoặc chưa được cấu hình, các KPI/biểu đồ và cảnh báo rule-based vẫn hoạt động. Không tự động tạo đơn nhập hàng, đổi ca, hủy lịch hoặc sửa dữ liệu.

## 4.5. Dự báo

Chỉ chạy dự báo khi chuỗi lịch sử đủ dài, liên tục và được kiểm định trên giai đoạn chưa dùng để xây mô hình. Bắt đầu bằng baseline thống kê (ví dụ trung bình động hoặc mẫu theo ngày trong tuần), đo sai số; không bắt buộc ML. Dữ liệu forecast phải có nhãn “ước tính”, khoảng dự báo, ngày tính và phương pháp. Khi không đủ điều kiện, hiển thị “Chưa đủ dữ liệu để dự báo”, không dựng đường dự báo giả.

---

# 5. TRẠNG THÁI MÀN HÌNH VÀ XỬ LÝ NGOẠI LỆ

| Trạng thái | Cách xử lý |
|---|---|
| Loading | Skeleton từng thẻ/chart; không nhấp nháy toàn trang khi refetch |
| Success | Hiển thị số liệu có đơn vị, kỳ, thời gian cập nhật |
| Empty | “Chưa có dữ liệu trong khoảng thời gian này”; nếu COUNT/SUM xác định thật sự bằng 0 thì hiển thị 0 |
| Partial failure | Thành phần thành công vẫn hiển thị; phần lỗi có thông báo và Retry riêng |
| API/DB error | Không thay lỗi bằng số 0; hiển thị lỗi an toàn và Retry |
| Permission denied | Chặn truy cập hoặc ẩn thành phần theo quyền; không lộ dữ liệu qua API |
| Invalid filter | Không gửi truy vấn; giải thích ngày bắt đầu/kết thúc không hợp lệ |
| Missing schema/business rule | Đánh dấu unavailable; báo rõ field/rule cần xác nhận, không đoán |
| Insufficient history | Ẩn đường dự báo, nêu lý do |
| AI unavailable | Hiển thị nhận xét rule-based hoặc trạng thái tạm không khả dụng |
| Realtime disconnected | Giữ thao tác làm mới thủ công; không báo sai rằng dữ liệu đang live |
| Zero denominator | Hiển thị N/A, không NaN/Infinity |

**Yêu cầu bảo mật và chất lượng:** validate khoảng thời gian ở server; dùng quyền Admin đúng hiện trạng; không xuất PII thừa; tránh SQL injection; không lộ thông tin DB nội bộ qua thông báo lỗi. Truy vấn cần giới hạn phạm vi, index phù hợp, phân trang bảng chi tiết và xử lý timezone nhất quán.

---

# 6. TÍCH HỢP DATABASE — THỰC THỂ VÀ TRƯỜNG DỮ LIỆU

> **Quan trọng:** Đây là mapping ứng viên theo bản thiết kế PawPal trước đó. Codex **phải kiểm tra trực tiếp schema trong repository/Supabase**. Không được coi tên cột chưa kiểm chứng là tồn tại. Nếu khác schema, báo mapping thay thế và bằng chứng từ code/migration.

## 6.1. Kinh doanh & Tăng trưởng

| Nhóm | Thực thể | Trường ứng viên |
|---|---|---|
| Thanh toán | `payment` | `id`, `amount`, `transaction_status`, `succeeded_at`, `order_id`, `appointment_id`, `customer_id` |
| Hoàn tiền | `refund_transaction` | `payment_id`, `refunded_amount`, `refund_status`, `completed_at` |
| Đơn bán | `sales_order` | `id`, `customer_id`, `order_status`, `created_at` |
| Chi tiết bán | `sales_order_detail` | `order_id`, `product_variant_id`, `quantity`, `unit_price`, `discount_amount`, `product_name_snapshot` |
| Sản phẩm | `product_variant`, `product` | `product_variant.id`, `product_variant.product_id`, `product.id`; tên sản phẩm ưu tiên snapshot hoặc cột thực tế |
| Lịch dịch vụ | `appointment` | `id`, `customer_id`, `appointment_status`, `scheduled_start_at`, `created_at` |
| Chi tiết dịch vụ | `appointment_item` | `appointment_id`, `service_id`, `quantity`, `unit_price`, `discount_amount`, `status` |
| Danh mục dịch vụ | `service` | `id`, `service_name` |
| Khách hàng | `customer` | `id`, `registered_at`, `created_at`, `customer_status` |
| Thành viên | `customer_membership`, `membership_tier` | `customer_id`, `membership_tier_id`, `membership_tier.id`, `tier_name` |
| Voucher | `voucher_redemption`, `customer_voucher` | `voucher_id`, `status`, `redeemed_at`, `discount_amount_snapshot`, `customer_voucher_id`, `voucher_status` |
| Điểm thưởng | `paw_point_transaction` | `customer_id`, `points`, `created_at`; xác minh loại giao dịch để phân biệt cộng/trừ |

## 6.2. Quản trị vận hành

| Nhóm | Thực thể | Trường ứng viên |
|---|---|---|
| Lịch hẹn | `appointment` | `id`, `staff_id`, `appointment_status`, `scheduled_start_at`, `created_at` |
| Chi tiết lịch | `appointment_item` | `appointment_id`, `service_id`, `quantity`, `status`; thời lượng chỉ dùng nếu schema có trường thật |
| Nhân viên | `staff` | `id`, `employment_status`; tên nhân viên phải kiểm tra schema |
| Ca làm | `staff_schedule` | `staff_id`, `start_at`, `end_at`, `availability_status`, `schedule_status` |
| Đánh giá nhân sự | `staff_assessment` | `staff_id`, `score`, `assessment_date`, `assessment_type`; không đánh đồng với đánh giá khách |
| Đơn hàng | `sales_order` | `id`, `order_status`, `created_at`; `updated_at` cần xác minh |
| Chi tiết bán | `sales_order_detail` | `order_id`, `product_variant_id`, `quantity` |
| Tồn kho | `inventory` | `product_variant_id`, `quantity_in_stock`, `minimum_stock` |
| Giữ hàng | `stock_reservation` | `quantity`, `status`, `expires_at`; xác minh FK biến thể và quy tắc trừ tồn |
| Đổi trả | `return_request` | `id`, `request_status`, `reason`, `created_at`; xác minh FK đơn hàng |
| Hỗ trợ | `support_ticket` | `id`, `status`, `priority`, `assigned_staff_id`, `created_at`, `resolved_at` |
| Đánh giá khách | `review` | `rating`, `review_status`, `created_at` |
| Nhập hàng (nếu có) | bảng nhập hàng thực tế | Chỉ sử dụng nếu xác minh tồn tại: lượng đang về, ETA, trạng thái, SKU |

## 6.3. Các JOIN ứng viên cần kiểm tra FK

- `staff.id = appointment.staff_id`; `staff.id = staff_schedule.staff_id`.
- `appointment.id = appointment_item.appointment_id`; `service.id = appointment_item.service_id`.
- `sales_order.id = sales_order_detail.order_id`; `product_variant.id = sales_order_detail.product_variant_id`; `product.id = product_variant.product_id`.
- `product_variant.id = inventory.product_variant_id`.
- `sales_order.id = payment.order_id`; `appointment.id = payment.appointment_id`; `payment.id = refund_transaction.payment_id`.
- `customer.id = sales_order.customer_id`; `customer.id = appointment.customer_id`; `customer.id = payment.customer_id`.
- `customer.id = customer_membership.customer_id`; `membership_tier.id = customer_membership.membership_tier_id`.

## 6.4. Cách tổ chức data layer

Ưu tiên dùng các query/service hiện hữu. Nếu cần bổ sung, tạo lớp aggregate rõ ràng theo hai miền `business-growth` và `operations`, tránh một truy vấn JOIN tất cả bảng. Có thể dùng SQL views/RPC với quyền truy cập đúng hoặc server endpoints, tùy kiến trúc repo. Các truy vấn lớn phải aggregate theo thực thể gốc trước khi JOIN để tránh nhân đôi tiền hoặc số lịch. Tạo index khi có bằng chứng cần thiết và không thay đổi logic nghiệp vụ.

**Contract tối thiểu mỗi chỉ số:** `id`, `value`, `unit`, `period`, `comparison` (nếu có), `updatedAt`, `status` (`ok` / `empty` / `unavailable` / `error`), `definition` và `source`. Không ép kiểu thiếu dữ liệu thành 0.

## 6.5. Các điểm bắt buộc xác nhận

1. Enum trạng thái thanh toán, hoàn tiền, đơn hàng, lịch hẹn, lịch làm và ticket.
2. Cách ghi nhận COD, thanh toán nhiều lần, hoàn tiền một phần và giao dịch đảo ngược.
3. Định nghĩa khách quay lại (cohort và loại giao dịch đủ điều kiện).
4. Quy tắc tồn khả dụng, lượng giữ hàng, tồn tối thiểu, hàng đang về và lead time nhập hàng.
5. Thời lượng dịch vụ, kỹ năng nhân viên, năng lực ca và ngưỡng cảnh báo quá tải.
6. Ngưỡng quá hạn xử lý/SLA và vai trò Admin nào được xem dữ liệu tài chính.
7. Thời điểm ghi nhận giá trị dịch vụ, hủy lịch, đơn hoàn thành và giá trị sau giảm giá.

---

# 7. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

- [ ] Sidebar chỉ có **Dashboard Tổng quan**, bên trong **đúng hai sub-tab** đã chốt.
- [ ] Mỗi sub-tab hiển thị KPI/chart/bảng đúng mục tiêu BQ; có loading/empty/error độc lập.
- [ ] Dữ liệu lấy từ Supabase thực tế, không hardcode demo values trong môi trường production.
- [ ] Lọc thời gian cập nhật các thành phần phụ thuộc; timezone và kỳ so sánh chính xác.
- [ ] Tiền thu và hoàn tiền không bị nhân đôi do JOIN một-nhiều; tiền thu thuần không bị gắn nhãn lợi nhuận.
- [ ] Trạng thái hợp lệ được đối chiếu enum thật, không tự giả định string.
- [ ] Heatmap, top dịch vụ và thống kê nhân sự không đếm trùng lịch hẹn.
- [ ] Bảng tồn kho thể hiện mức cảnh báo đúng; không trừ reservation hai lần.
- [ ] Chỉ số thiếu dữ liệu/định nghĩa hiển thị unavailable, không dựng số 0 giả.
- [ ] Cảnh báo có số liệu căn cứ; AI lỗi không làm hỏng Dashboard.
- [ ] Dự báo chỉ hiển thị khi đủ lịch sử và có kiểm định; dữ liệu dự báo phân biệt dữ liệu thật.
- [ ] Phân quyền Admin được áp dụng cả UI và server; không lộ service key/PII.
- [ ] Có test cho phép tính, kỳ trước = 0, trạng thái không hợp lệ, hoàn tiền một phần, empty/error.
- [ ] Báo cáo cuối của Codex nêu rõ mapping thực tế, thay đổi file và các phần cần xác nhận.

---

## LỆNH KHỞI ĐỘNG GỢI Ý CHO CODEX

> Hãy đọc toàn bộ `PAWPAL_ADMIN_DASHBOARD_CODEX_SPEC.md`, khảo sát codebase và schema Supabase thật trước khi sửa. Triển khai Dashboard Admin với đúng 2 sub-tab Kinh doanh & Tăng trưởng và Quản trị vận hành theo đặc tả. Ưu tiên tái sử dụng kiến trúc, component và API hiện hữu. Không tự tạo cột/trạng thái/số liệu. Trước khi code, liệt kê những mapping xác minh được và những điểm thiếu; sau đó triển khai phần khả thi, thêm test, chạy kiểm tra và báo cáo phần còn bị chặn.
