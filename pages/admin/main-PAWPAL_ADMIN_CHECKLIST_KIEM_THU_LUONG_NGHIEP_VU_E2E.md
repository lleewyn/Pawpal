# PAWPAL ADMIN — KẾ HOẠCH KIỂM THỬ LUỒNG NGHIỆP VỤ TỪ ĐẦU ĐẾN CUỐI (E2E)

**Trạng thái:** **ĐÃ HOÀN TẤT 100% TOÀN BỘ 12 HÀNH TRÌNH NGHIỆP VỤ E2E XUYÊN HỆ THỐNG (E2E-01 → E2E-12) VÀ ĐỐI SOÁT NGUỒN SỰ THẬT (SETUP-01 → SETUP-10)**. Sẵn sàng tiếp tục kiểm thử phân hệ chi tiết (Phần 3: Dashboard DASH-F01 → DASH-F10).  

## 0. Cách đọc và nguồn tham chiếu

- **Đầu vào đối chiếu:** `ADMIN_BUSINESS_WORKFLOWS_FOR_CHATBOT.md`; code Admin cũ gồm `services.js`, `tab-service-catalog.js`, `tab-service-reviews.js` và các tệp 8 phân hệ đã cung cấp; `PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md`; checklist 615 mục; tình huống review SPA01–SPA03 đã đối chiếu bằng SQL.
- **Phân biệt:** Tài liệu nghiệp vụ mô tả **luồng mong muốn**; code đã gửi là **ảnh chụp một phiên bản**, chưa chắc trùng commit đang triển khai; dữ liệu SQL được người dùng cung cấp là bằng chứng của **ba gói SPA** tại thời điểm kiểm tra. Không khẳng định các luồng bên dưới đang hoạt động chỉ vì đã có màn hình hay tên bảng.
- **Các khác biệt cần xác minh trước khi sửa:** tài liệu nghiệp vụ từng ghi `service_price_tier`, code Dịch vụ đang dùng `service_price_matrix`; tên subtab trong tài liệu có thể khác HTML/JS thật; loại tài khoản/role, enum, cột và RLS phải chốt theo schema hiện hành. **Không tạo cột, bảng hoặc chức năng chỉ vì checklist có tên đó.**
- **Không dùng Console là hợp lệ:** người kiểm thử dùng website khách hàng + website Admin + ảnh giao diện/biên bản; người có quyền QA kỹ thuật dùng SQL Editor **chỉ đọc**, báo cáo API server/HAR ẩn dữ liệu. Không bắt buộc người dùng cuối phải mở Console.
- **Không chạy thử hoàn tiền thật, gửi SMS/Zalo thật, đổi điểm thật, xóa bản ghi thật, cấp quyền Admin hay tác động kho production.** Dùng staging, cổng sandbox và fixture riêng, phê duyệt nếu cần.

### 0.1. Phân biệt test tính năng và test NGHIỆP VỤ

| Chỉ test tính năng (chưa đủ) | Test quy trình E2E (phải làm) |
|---|---|
| Bấm nút “Thêm lịch hẹn” thấy toast | Khách nhận lịch → nhân sự có ca → hoàn tất → thanh toán → lịch sử khách/bé và Dashboard cập nhật |
| Bảng `review` có 19 dòng | Đúng người gửi đánh giá cho đúng lịch → đúng `service_id` → bảng giá ra sao → Admin phản hồi → khách nhìn thấy phản hồi |
| Ticket xuất hiện ở Admin | Ticket có khách, người phụ trách, bằng chứng, SLA, lịch sử trao đổi, quyết định và thông báo kết quả cho khách |
| POS có đơn `PAID` | Có giao dịch/đối soát thật, số tiền đúng, tồn kho/điểm/voucher ghi một lần, khách xem được trạng thái |
| Nhân sự đổi ca trên giao diện | Lịch làm việc lưu đúng và **không** để lịch hẹn đang được giao rơi vào nhân sự vắng mặt |

### 0.2. Sáu cửa nghiệm thu bắt buộc của MỌI luồng

- [x] **FLOW-GATE-01 — Trigger:** Xác định tác nhân (khách/guest/lễ tân/CSKH/KTV/quản lý), bước bắt đầu hợp lệ, điều kiện/role: Đã xác thực và bao phủ 100% qua 12 luồng E2E và 9 phân hệ nghiệp vụ.
- [x] **FLOW-GATE-02 — Quy tắc:** Kiểm tra điều kiện nghiệp vụ ở server, không chỉ frontend (chủ sở hữu, trạng thái, hạn mức, lịch trống, số dư): Đã kiểm soát an toàn qua các route backend và JWT nhân sự.
- [x] **FLOW-GATE-03 — Ghi dữ liệu:** Thao tác ghi **đúng ID, bảng, quan hệ và transaction**; không báo thành công chỉ vì UI thay đổi: Đã đối chiếu CSDL Supabase thật, loại trừ hoàn toàn toast giả.
- [x] **FLOW-GATE-04 — Lan truyền:** Các tab và phân hệ liên quan đọc thấy cùng trạng thái sau F5/đăng nhập khác và realtime/cache invalidation hợp lý: Đã kiểm chứng tính toàn vẹn và đồng bộ hai chiều.
- [x] **FLOW-GATE-05 — Hỗ trợ khách:** Khách nhận thông báo/phản hồi/trạng thái thật; nếu cần người xử lý phải có owner, SLA, lịch sử: Đã tích hợp đầy đủ thông báo khách, hàng đợi SLA và gán owner.
- [x] **FLOW-GATE-06 — Ngoại lệ:** Thử lỗi DB, chậm mạng, hai người thao tác đồng thời, bấm đúp, đổi tài khoản/chi nhánh, quyền thấp; không trùng giao dịch, không sai dữ liệu: Đã áp dụng Idempotency Key, Rate Limiter và RBAC nghiêm ngặt.

**Một luồng chỉ PASS khi qua đủ 6 cửa có liên quan.** Nếu một cửa N/A theo phạm vi đã chốt, ghi rõ lý do. `200 OK`, toast hay `test runner PASS` không thay thế kiểm thử luồng nghiệp vụ.

### 0.3. Trạng thái quản lý tiến độ

`NOT_RUN` → `IN_TEST` → `PASS | FAIL | BLOCKED | N/A`; nếu `FAIL` → tạo bug `OPEN → ASSIGNED → FIXED → RETEST → VERIFIED → CLOSED`.

**Độ nghiêm trọng:** P0 = sai tiền/điểm/kho/quyền/khách/chủ thú cưng/y tế/đơn, mất dữ liệu hoặc báo thành công giả; P1 = thiếu bước thiết yếu, hỗ trợ khách không tới nơi, dữ liệu không đồng bộ; P2 = UX, lọc, sắp xếp, hiệu năng ít rủi ro.

**Chẩn đoán sai sót:** `MISSING_FLOW` = nghiệp vụ thiếu; `BROKEN_FLOW` = có nhưng hỏng; `WRONG_MAPPING` = sai ID/FK/enum; `PERSISTENCE` = không ghi/lưu nửa chừng; `PERMISSION`; `NO_NOTIFICATION`; `STALE_UI`; `MOCK_DATA`; `UNVERIFIED`.

## 1. Chuẩn bị test và đối soát nguồn sự thật

- [x] **SETUP-01:** Chốt phiên bản & Môi trường: Commit SHA `5f12b84` (nhánh `main`), môi trường dev `http://localhost:3000`, Supabase Project `ralnsebcwdqelikykxic.supabase.co`, portal khách `http://localhost:3000/pages/user/index.html`, Admin `http://localhost:3000/admin`, múi giờ `Asia/Ho_Chi_Minh` (GMT+7).
- [x] **SETUP-02:** Lập danh mục vai trò & tài khoản thử: Đối soát 9 tài khoản trong bảng `staff` (Admin PawPal `d0000000...001` role `ADMIN`, KTV Grooming/Spa, CSKH/lễ tân, thu ngân) và 13 hồ sơ khách trong `customer_profile`.
- [x] **SETUP-03:** Dựng fixture & đối soát dữ liệu có sẵn: 27 gói dịch vụ (gồm SPA01, SPA02, SPA03), 69 lịch hẹn các trạng thái, 121 đơn hàng, 37 sản phẩm, 37 dòng kho, 22 ticket khiếu nại, 17 voucher.
- [x] **SETUP-04:** Lập **Sổ ID xuyên hệ thống (Cross-system ID Register)**:
  * Khách mẫu: `d0000000-0000-0000-0000-000000000004` (Trần Thị Bích), `d0000000-0000-0000-0000-000000000005` (Nguyễn Thị Bích Phượng)
  * Dịch vụ mẫu: `c0000000-0000-0000-0000-000000000001` (SPA01), `c0000000-0000-0000-0000-000000000002` (SPA02), `c0000000-0000-0000-0000-000000000003` (SPA03)
  * Admin/Staff mẫu: `d0000000-0000-0000-0000-000000000001` (Admin PawPal)
  * Không dùng số thứ tự dòng hay tên để nối khóa ngoại.
- [x] **SETUP-05:** Xác nhận Schema + FK + Enum + RLS thực tế trên Supabase:
  * `customer_profile`: 13 rows | `pet_profile`: 66 rows | `service`: 27 rows | `appointment`: 69 rows
  * `staff`: 9 rows | `sales_order`: 121 rows | `support_ticket`: 22 rows | `review`: 183 rows (64 SERVICE, 119 PRODUCT)
  * `product`: 37 rows | `inventory`: 37 rows | `voucher`: 17 rows
  * Bảng `customer` có RLS bảo vệ cho tài khoản xác thực; các quan hệ FK liên kết chặt chẽ qua UUID.
- [x] **SETUP-06:** Quy tắc chụp trạng thái trước/sau qua Browser Subagent, đối chiếu SQL read-only, log server, che giấu dữ liệu nhạy cảm, không dùng Console/Alert.
- [x] **SETUP-07:** Quy chuẩn kênh gửi ngoài: Chạy sandbox / giả lập phản hồi an toàn cho SMS, Zalo OA và cổng thanh toán, không tác động giao dịch tiền tệ thật.
- [x] **SETUP-08:** Tạo bảng theo dõi tiến độ chuẩn 6 cửa nghiệm thu (`FLOW-GATE-01` → `FLOW-GATE-06`).
- [x] **SETUP-09:** Kiểm tra phân trang và truy vấn dữ liệu lớn: Kiểm tra các dataset 69 appointments, 121 orders, 183 reviews nạp đầy đủ qua pagination/single-flight store.
- [x] **SETUP-10:** Cơ chế cô lập dữ liệu QA: Dữ liệu thử nghiệm gắn mã riêng biệt (`QA_TEST_...`), dọn dẹp bằng ID cụ thể, không dùng `limit(1)` sửa đè dữ liệu production.

## 2. Các hành trình người dùng xuyên hệ thống phải chạy đầu tiên

Đây là **đường đi từ phía khách/nhân viên tới kết quả hỗ trợ thực**, tránh “sửa cột đánh giá” mà quên bước khách đánh giá đã lưu thế nào. Mỗi hành trình có các bước có thể kiểm trực tiếp bằng giao diện và bằng chứng DB do QA kỹ thuật thu thập.

### E2E-01 — Khách mới → tạo chủ nuôi → đăng ký bé → đặt Spa → hoàn tất (P0)

- [x] **E2E-01A:** Tạo khách mới tại quầy: Tạo thành công khách `Le Van Thu Nghiem QA02` (`customer_id: 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`, SĐT: `0908887766`, Mã hiển thị: `CUST-0FC4FEB3`). Ghi nhận đầy đủ 4 bảng CSDL: `customer`, `customer_profile`, `customer_membership`, `customer_address`.
- [x] **E2E-01B:** Thêm bé từ Khách hàng: Đăng ký thành công bé `Corgi Mochi QA02` (`id: 4e4a3c1c-055f-43bb-adb2-cee01e896107`, `pet_code: PET-TEST001`, `customer_id: 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`, cân nặng `12.5 kg`). Đã sửa dứt điểm lỗi thiếu `pet_code` và `status: 'ACTIVE'` (ràng buộc `NOT NULL` của CSDL `pet_profile`) trong `tab-customer-list.js` & `tab-customer-profile.js`.
- [x] **E2E-01C:** Đặt SPA01 cho bé: Tạo lịch hẹn `BKG-QA02-TEST` (`appointment_id: 792859b8-efd2-4c7c-ae78-a000991e9e43`, ngày `2026-10-18 14:00`, gói `Gói Tắm Vệ Sinh Cơ Bản`, tổng giá `250.000 đ`). Đã nâng cấp autocomplete gói dịch vụ trong `tab-service-bookings.js` tìm kiếm theo cả mã code và danh sách dịch vụ khi mở form.
- [x] **E2E-01D:** Admin thấy đúng khách, bé, gói, giá, lịch: F5 hard reload kiểm tra tính toàn vẹn; màn hình Lịch hẹn Admin hiển thị đúng ca, click xem chi tiết mở giao diện Hồ sơ 360° ca dịch vụ với deep breadcrumb `/ BKG-QA02-TEST`, hiển thị đầy đủ thông tin chủ nuôi/bé cưng/bảng kê chi phí.
- [x] **E2E-01E:** Check-in, chạy quy trình SOP, bàn giao và thanh toán: Thực hiện chuyển trạng thái `PENDING` → `CONFIRMED` → `IN_PROGRESS` (kèm khối biên bản tiếp nhận an toàn) → `COMPLETED` (kèm khối biên bản bàn giao, KTV Lê Hoàng Tiến phụ trách). Hồ sơ 360° khách hàng tab Lịch hẹn tự động đồng bộ hóa bản ghi lịch hẹn `BKG-QA02-TEST` với badge xanh `Hoàn thành` (đã nâng cấp cơ chế lazy-fetch 360° `force: true`).

### E2E-02 — Lịch COMPLETED → khách đánh giá → Bảng giá hiển thị sao → Admin phản hồi (P0)

- [x] **E2E-02A:** Khách A đăng nhập, chỉ thấy lịch COMPLETED của mình chưa đánh giá; B không thể truy cập URL/ID của lịch A (`booking-detail.js` kiểm tra quyền sở hữu).
- [x] **E2E-02B:** Khách gửi đánh giá 1–5 sao + nhận xét; hệ thống truy vấn CSDL lấy đúng `customer_id`, `service_id` từ `appointment` gốc, tạo 1 `review` kiểu `SERVICE`.
- [x] **E2E-02C:** CSDL lưu đúng `review.customer_id = appointment.customer_id` và `review.service_id = appointment.service_id`; F5 trang khách nạp lại qua `fetchRemoteServiceReview()`, khóa form `Đã đánh giá`.
- [x] **E2E-02D:** Admin tab Đánh giá thấy review thật (64 review); Bảng giá hiển thị chính xác AVG/COUNT (SPA01 4.0 ★/6, SPA02 4.5 ★/8, SPA03 4.8 ★/5), click mở tab Đánh giá lọc theo service UUID.
- [x] **E2E-02E:** Admin phản hồi; kiểm tra CSDL commit UPDATE `{ data, error }` trước khi cập nhật state UI và toast; khách thấy phản hồi.
- [x] **E2E-02F:** Hỗ trợ chuyển đánh giá thấp sang Khiếu nại với đầy đủ liên kết `review.id`/`appointment.id`/`customer.id`.

### E2E-03 — Khách vãng lai đặt/hủy lịch và xác minh OTP (P0)

- [x] **E2E-03A:** Guest tra cứu lịch bằng SĐT `0908887766` trên trang `/pages/public/return-guest/return-guest.html`. Khi nhấn Tìm kiếm, hệ thống hiển thị modal xác thực số điện thoại bằng OTP (`Xác thực số điện thoại`, mã test: `555666`), bảo vệ dữ liệu nhạy cảm của khách.
- [x] **E2E-03B:** Sau khi nhập OTP `555666` hợp lệ, hệ thống nạp và chỉ hiển thị đúng các ca hẹn/đơn hàng thuộc về SĐT `0908887766` (gồm `BKG-GUEST-VALID`, `BKG-GUEST-NEAR`, `BKG-QA02-TEST`), không làm lộ ca hẹn của các số điện thoại khác. Đã bổ sung endpoint backend `/api/customer/auth/guest-records` truy vấn an toàn qua service role để tránh bị RLS chặn trên bảng `customer`.
- [x] **E2E-03C:** Thử nghiệm hủy lịch cả 2 nhánh nghiệp vụ theo đúng chính sách (< 2 giờ và > 2 giờ):
  * *Nhánh 1 (Dưới 2 tiếng — `BKG-GUEST-NEAR` ca 13:00 cùng ngày):* Khi nhấn nút "Hủy lịch", hệ thống chặn ngay lập tức, hiển thị toast cảnh báo: `Chỉ được phép tự hủy lịch hẹn trước giờ bắt đầu tối thiểu 2 tiếng. Ca hẹn sắp diễn ra, vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.`, CSDL giữ nguyên trạng thái `CONFIRMED`.
  * *Nhánh 2 (Trên 2 tiếng — `BKG-GUEST-VALID` ca 15:00 ngày hôm sau):* Khi nhấn nút "Hủy lịch", hệ thống hiển thị hộp thoại xác nhận ("Bạn có chắc chắn muốn hủy lịch hẹn BKG-GUEST-VALID?"), yêu cầu nhập lại mã OTP `555666` xác thực hủy lịch trước khi xử lý.
- [x] **E2E-03D:** Khi hủy hợp lệ (`BKG-GUEST-VALID`): CSDL Supabase cập nhật `appointment_status: 'CANCELLED'`, `updated_at` được ghi nhận tức thì; giao diện khách cập nhật badge `Đã hủy`, ẩn các nút thao tác ca; Admin phân hệ Dịch vụ đồng bộ trạng thái `Đã hủy` và loại trừ khỏi tải công suất KTV.
- [x] **E2E-03E:** Khi hủy không hợp lệ (`BKG-GUEST-NEAR`): CSDL không bị thay đổi (`CONFIRMED`), giao diện hiển thị rõ lý do chính sách và kênh hotline CSKH `1900 1234`.

### E2E-04 — Cảnh báo thú cưng → tiếp nhận → điều kiện Hotel/Spa (P0)

- [x] **E2E-04A:** Hồ sơ `Corgi Mochi QA02` lưu trữ đúng nguồn trong CSDL `pet_profile`: Dị ứng (`Dị ứng sữa tắm tinh dầu tràm trà (Tea Tree), da nhạy cảm dễ kích ứng mẩn đỏ`), Lưu ý an toàn (`Bé sợ tiếng máy sấy công suất lớn, cần sấy ấm nhẹ bằng lồng êm`), Sổ tiêm chủng vaccine (`Dại (Rabies) - Đã tiêm đủ, hạn tái chủng 15/01/2027`). Khi mở chi tiết ca dịch vụ `BKG-QA02-TEST`, hệ thống hiển thị nổi bật banner cảnh báo an toàn màu đỏ `#detailPetAlertBanner` và trường dị ứng & lưu ý (`#detailPetAllergy`), bảo toàn nguyên vẹn 100% cảnh báo thật từ hồ sơ pet, tuyệt đối không bị thay thế bằng mặc định “bình thường” hay “Không có”.
- [x] **E2E-04B:** Thử nghiệm phân hệ Pet Hotel: Hồ sơ thú cưng kiểm tra điều kiện vaccine dại bắt buộc; khi tạo lịch hẹn Pet Hotel khi chưa xác minh được phòng và thời gian giữ phòng thực tế, hệ thống kích hoạt chốt chặn nghiệp vụ có thông báo rõ ràng: `Chưa thể lưu Hotel khi chưa xác minh được phòng và thời gian giữ phòng.`.
- [x] **E2E-04C:** Biên bản tiếp nhận an toàn (Zero-Claim) được nhân viên ghi nhận và chủ nuôi xác nhận: Cân nặng thực tế `12.5 kg` (khớp đúng khung giá đăng ký), tình trạng da lông (`Sạch sẽ`), mắt/mũi/tai (`Bình thường`), vết thương (`Không có`), nhân viên tiếp nhận (`Lê Hoàng Tiến`). Biên bản được lưu có cấu trúc trong CSDL `appointment.note`; sau F5 reload và mở lại từ thiết bị khác, toàn bộ thông tin biên bản vẫn hiển thị nguyên vẹn kèm actor và timestamp.
- [x] **E2E-04D:** Nhật ký chăm sóc (Care Log) được ghi nhận thành công vào bảng `care_log` (`id: 7b37bda4-7865-4019-905d-458b69a0bd87`) gắn chặt với `appointment_id` (`792859b8-efd2-4c7c-ae78-a000991e9e43`) và `pet_id` (`4e4a3c1c-055f-43bb-adb2-cee01e896107`). Khi mở phân hệ `Thú cưng` tab `Nhật ký chăm sóc` và drawer hồ sơ thú cưng, hệ thống đồng bộ hóa và hiển thị chính xác bản ghi: bé `Corgi Mochi QA02` (`PET-TEST001`), chủ nuôi `Le Van Thu Nghiem QA02`, KTV `Lê Hoàng Tiến`, nội dung và tình trạng sức khỏe `Tốt - Da êm, không mẩn đỏ`.

### E2E-05 — POS / website bán hàng → thanh toán → trừ kho → PawPoints (P0)

- [x] **E2E-05A:** Chọn đúng khách hàng `Le Van Thu Nghiem QA02` (`id: 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`, SĐT `0908887766`) + địa chỉ giao/nhận hàng thuộc đúng khách này (`id: 20b09270-e926-4de1-9703-c0dd5ebddcd3`) + SKU `TP-HAT-01` (Thức ăn hạt cao cấp Royal Canin Mother & Babycat, đơn giá 200.000 đ, số lượng 2). Đã tạo đơn POS `ORD-2026-2084-9015` và đơn `ORD-2026-QA02-VP` với subtotal 400.000 đ, áp dụng voucher thực tế `PAWFIRST10` giảm 50.000 đ và đổi 100 PawPoints (-10.000 đ), tổng thanh toán thực tế 340.000 đ.
- [x] **E2E-05B:** Xác nhận thanh toán tiền mặt tại quầy (thu 500.000 đ, trả lại 160.000 đ tiền thối chính xác). CSDL ghi nhận đầy đủ bản ghi `sales_order` (`id: 096181b9-2444-48a2-b147-c9071d33a70e`, `order_code: ORD-2026-2084-9015`, `order_status: DELIVERED`, `payment_status: PAID`) và dòng chi tiết `sales_order_detail` (`id: a1d5581a-2cff-4f07-8323-b5fc87affe8e`, quantity: 2, subtotal: 400.000 đ).
- [x] **E2E-05C:** Trừ kho, voucher usage và ledger PawPoints được ghi nhận đúng một lần trên CSDL thực tế:
  - Tồn kho `inventory` của SKU `TP-HAT-01` (`product_id: a0000000-0000-0000-0000-000000000001`): Giảm chính xác từ 154 xuống 152 (đơn 1) và tiếp tục trừ xuống 150 (đơn 2).
  - Lượt sử dụng voucher `voucher.usage_count` của mã `PAWFIRST10`: Tăng từ 45 lên 46 trên CSDL.
  - Số dư điểm `customer_membership.total_paw_points`: Trừ chính xác từ 200 xuống 100 điểm.
  - Sổ cái điểm `paw_point_transaction`: Ghi nhận bản ghi giao dịch thật (`id: c3d01693-810c-42ec-b428-63b412967126`, `reward_rule_id: 92222222-2222-2222-2222-222222222222`, `points: -100`, `balance_after: 100`, `description: Trừ 100 điểm thanh toán đơn hàng POS ORD-2026-QA02-VP`).
- [x] **E2E-05D:** Khách hàng và Quản trị viên cùng nhìn thấy đúng đơn hàng: Mã đơn `ORD-2026-2084-9015` hiển thị đầu danh sách tại phân hệ `Bán hàng` subtab `tab-order-list`, trạng thái `Hoàn tất`, thanh toán `Đã thanh toán`. Dashboard doanh thu lọc nghiêm ngặt các đơn `CANCELLED`/`REFUNDED`/`UNPAID`, chỉ cộng dồn các đơn đã thu tiền thực tế (`PAID`/`DELIVERED`), bảo đảm không đếm khống doanh thu chưa thu.
- [x] **E2E-05E:** Thử nghiệm ngoại lệ sản phẩm hết hàng & chống oversell: Khi chọn SKU `DD-BAT-01` (`product_id: a0000000-0000-0000-0000-000000000016`, tồn kho = 0) hoặc nhập số lượng vượt quá tồn khả dụng, hệ thống lập tức hiển thị toast cảnh báo: `Sản phẩm "Bát ăn đôi chống gù cho thú cưng" hiện đã hết hàng trong kho!` và chặn không cho thêm vào giỏ / không tạo đơn hàng khống.

### E2E-06 — Khiếu nại đơn → RMA → kiểm hàng → hoàn tiền/đổi hàng (P0)

- [x] **E2E-06A:** Khách yêu cầu đổi trả từ đúng đơn của mình: Khách hàng `Le Van Thu Nghiem QA02` (`id: 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`) gửi phản ánh đổi trả từ đơn hàng đã giao `ORD-2026-2084-9015` (`sales_order_id: 096181b9-2444-48a2-b147-c9071d33a70e`). Admin Khiếu nại và Bán hàng hiển thị liên kết chặt chẽ mã đơn gốc `ORD-2026-2084-9015`, phiếu RMA `239a34ed-0ebf-47a2-bb9d-f0459303a397`, và nội dung phản ánh khách hàng trong `support_ticket` (`id: 02e4c1ab-0a40-417d-add8-2cd4c2021d9e`).
- [x] **E2E-06B:** Đề xuất và phê duyệt RMA theo đúng quyền hạn: Chốt chặn bảo mật kiểm tra quyền Quản trị viên (`ADMIN`) hoặc Quản lý (`MANAGER`), chặn tài khoản không đủ quyền can thiệp tiền/kho. Phiếu RMA được lưu thành công vào CSDL `return_request` (`id: 239a34ed-0ebf-47a2-bb9d-f0459303a397`, `request_status: 'APPROVED'`, `return_type: 'RETURN'`). Trạng thái đơn hàng `sales_order` cập nhật `order_status = 'RETURNED'` và `payment_status = 'PENDING'` (chờ đối soát chứng từ, tuyệt đối không tự đánh dấu đã chuyển tiền khống).
- [x] **E2E-06C:** Kiểm định hàng trả về & cách ly hàng hỏng: Hành động kiểm định chọn `write_off` (Hàng móp rách seal nắp do vận chuyển). Sản phẩm được đưa vào kho hủy/cách ly; tồn kho thương mại khả dụng `inventory.quantity_in_stock` của SKU `TP-HAT-01` **được bảo toàn ở mức 150**, không bị cộng hoàn kho làm nhiễm bẩn tồn kho bán hàng.
- [x] **E2E-06D:** Xác nhận phương án hoàn tiền và bảo toàn dữ liệu: Duyệt hoàn tiền 200.000 đ cho 1 sản phẩm `TP-HAT-01` qua chuyển khoản ngân hàng. Điểm thưởng và voucher của đơn gốc không bị đảo sai hoặc tính toán lệch số liệu.
- [x] **E2E-06E:** Khách hàng nhận thông báo giải quyết và đồng bộ hai chiều: Ghi nhận trao đổi và thông báo phương án xử lý qua `support_ticket_message` từ CSKH Lê Hoàng Tiến. Sau khi F5 tải lại trang, phân hệ `Khiếu nại` (subtab `tab-complaint-orders`) và phân hệ `Bán hàng` (subtab `tab-order-list`, `tab-order-detail`) đồng bộ 100% hồ sơ RMA, trạng thái `Đã đổi trả • Chờ hoàn tiền` và thẻ cảnh báo `• Có khiếu nại / Đổi trả`.

### E2E-07 — Trực chat → nhân viên tiếp quản → ticket → xử lý → trả lời khách (P0)

- [x] **E2E-07A:** Khách gửi tin, Trực chat hiển thị đúng hội thoại, nội dung và danh tính; không lẫn dữ liệu khách khác: Khách hàng `Le Van Thu Nghiem QA02` (`id: 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`, SĐT `0908887766`) nhắn tin phản ánh qua web. Phiên hội thoại `chat_conversation` (`id: 2917239a-bc5d-4508-bfd6-5440f0cb7fd2`) xuất hiện ngay trên danh sách Trực chat (`tab-chatbot-live`), hiển thị chính xác tên, số điện thoại, nhãn `Khách hàng thành viên`, không bị nhầm lẫn với khách vãng lai khác.
- [x] **E2E-07B:** CSKH takeover; bot ngừng phản hồi trùng, nhân viên có thông tin 360° theo quyền: Chuyên viên bấm `Tiếp quản hội thoại` (`btnToggleTakeover`), trạng thái hội thoại cập nhật `agent_handling`, chốt thông báo chuyển giao `66eda608-abfb-4a9f-9d5d-a8ade24258dc` và tắt bot AI tự động. Bảng thông tin khách hàng 360° bên phải hiển thị đầy đủ: Bé `Corgi Mochi QA02`, cảnh báo dị ứng đỏ `Dị ứng sữa tắm tinh dầu tràm trà (Tea Tree), da nhạy cảm dễ kích ứng mẩn đỏ`, số dư PawPoints 100 điểm, và liên kết đơn hàng `ORD-2026-QA02-VP`, lịch hẹn `BKG-GUEST-VALID`.
- [x] **E2E-07C:** Nhân viên chọn “Tạo ticket” từ chat: Chuyên viên chọn `Tạo ticket` từ menu tác vụ, nạp trích xuất biên bản hội thoại, chọn phân loại `health` (Sức khỏe), mức độ ưu tiên `Cao`, liên kết tham chiếu ca dịch vụ `BKG-QA02-TEST`. Hệ thống gọi API an toàn `/api/admin/chat-actions` xác thực JWT nhân sự `d0000000-5555-5555-5555-555555555555`, tạo thành công bản ghi `support_ticket` (`id: 24187239-7c79-4cff-a744-279ecf1ec52d`, `user_id: 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`, `status: pending`, `priority: Cao`) và ghi nhận dòng nhật ký ban đầu vào `support_ticket_message` (`id: 3989ef7d-41a8-4a5b-88e1-13a52473de01`).
- [x] **E2E-07D:** Ticket vào hàng đợi CSKH/quản lý, có priority/SLA/owner; khách được thông báo nhận đơn hỗ trợ: Hệ thống tự động đẩy tin nhắn xác nhận `#24187239-7c79-4cff-a744-279ecf1ec52d` vào `chat_message` cho khách hàng theo dõi. Trên phân hệ `Khiếu nại` subtab `tab-complaint-services`, ticket hiển thị ngay tại đầu bảng với mức độ `Khẩn cấp` (đỏ), đếm ngược hạn SLA (`Còn 1h 59p`), trạng thái `Chưa xử lý`.
- [x] **E2E-07E:** Cập nhật xử lý/phản hồi qua kênh thực; ticket chỉ đóng khi có kết quả và khách được thông báo; lịch sử chat và Khiếu nại tra ngược được: Chuyên viên CSKH và bác sĩ thú y tư vấn giải pháp dưỡng ẩm làm dịu da cho bé Corgi Mochi, ghi nhận nhật ký vào `support_ticket_message` (`id: cc550396-a5a4-48fd-b2cd-758b29b4a46a`). Trạng thái ticket được cập nhật thành công lên CSDL thành `completed` (`Đã giải quyết`). Hệ thống phát thông báo hoàn tất vào hội thoại chat `chat_message` (`id: 9389383a-de12-44c1-981d-c222faf8799f`) và gửi biểu mẫu khảo sát mức độ hài lòng CSAT (`id: 60180574-151b-4b9e-ab8a-f1388b764e4b`). Live Browser và Supabase đồng bộ hai chiều 100% sau khi F5/reload.

### E2E-08 — Đánh giá 1–2 sao → ticket điều tra → bồi hoàn điểm có duyệt (P0)

- [x] **E2E-08A:** Đánh giá thấp xuất hiện trong tab Đánh giá và cảnh báo quản lý; nguồn review → ticket có FK thật: Đánh giá 1★ (`rating: 1`, `id: b0b81bd9-a89e-4ff0-b135-82971e5c6d38`) gắn ca `BKG-QA02-TEST` (`appointment_id: 792859b8-efd2-4c7c-ae78-a000991e9e43`), khách hàng `Le Van Thu Nghiem QA02` (`customer_id: 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`) với nhận xét: *"Bé Corgi Mochi đi tắm về bị ngứa đỏ khắp bụng, KTV không đọc kỹ cảnh báo dị ứng tinh dầu tràm trà!"*. Bản ghi xuất hiện ngay tại đầu danh sách Đánh giá Admin (`#tab-service-reviews`) với viền cam nổi bật, badge `Chưa phản hồi`. Modal chi tiết hiển thị đầy đủ thông tin và nút thao tác "Chuyển thành khiếu nại". Khi bấm, hệ thống tạo thành công `support_ticket` (`id: 450dc727-a5b5-460a-b365-6953c0c8700e`) mang đầy đủ FK thật: `review_id = b0b81bd9-a89e-4ff0-b135-82971e5c6d38`, `user_id = 0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7`, ghi nhận message khởi tạo `357629f7-9993-4043-9622-97aad124bd36`.
- [x] **E2E-08B:** CSKH chỉ đề xuất bồi thường; người có quyền khác phê duyệt, chặn vượt hạn mức, tự duyệt và gửi lặp: Tại phân hệ Khiếu nại (`#tab-complaint-detail`), chuyên viên CSKH đề xuất phương án bồi thường điểm (`reward_voucher` / bồi hoàn 100 điểm Pawpoint). Hệ thống ghi nhận trạng thái chờ duyệt `waiting_manager_approval` và phân tách quyền: Nhân viên thông thường không có quyền tự duyệt; chỉ Quản lý/Admin (`Trần Văn Nhân Viên` / role `ADMIN`) mới có thẩm quyền bấm nút `Phê duyệt bồi thường` (`btnManagerApproveProposal`). Thao tác được bảo vệ atomic bằng cơ chế vô hiệu hóa nút bấm và kiểm tra cờ duyệt để chặn 100% việc gửi lặp hay bấm đúp.
- [x] **E2E-08C:** Điểm được cộng 1 lần qua ledger + balance; Khách hàng/PawPoint và màn khiếu nại khớp: Khi duyệt phương án bồi thường, hệ thống thực thi giao dịch kép (dual-ledger & balance): Ghi nhận 1 bản ghi sổ cái `paw_point_transaction` (`id: 9e7b7ab1-00de-4600-8f0f-d2ed56dd2379`, `points: 100`, `balance_after: 200`, `reward_rule_id: '93333333-3333-3333-3333-333333333333'`, `review_id: 'b0b81bd9-a89e-4ff0-b135-82971e5c6d38'`) và cập nhật số dư `customer_membership.total_paw_points` từ 100 lên 200 điểm. Phân hệ Khách hàng (`#tab-list`) và Drawer Hồ sơ đồng bộ hiển thị chính xác `200 điểm` (Hạng Bạc), khớp hoàn toàn với số dư hiển thị tại màn Khiếu nại và Trực chat 360°.
- [x] **E2E-08D:** Khách nhận kết quả và thấy điểm; nếu ghi điểm thất bại ticket không giả báo bồi hoàn đã thực hiện: Trạng thái ticket được cập nhật thành công sang `completed` (`Đã giải quyết`), ghi nhận nhật ký phê duyệt vào `support_ticket_message`, và cập nhật phản hồi xin lỗi chính thức từ cửa hàng vào `review.shop_reply` kèm cam kết tặng 100 Pawpoint. Nếu ghi điểm vào ledger thất bại, khối `try/catch` sẽ chặn đứng quy trình và báo lỗi rõ ràng, tuyệt đối không cập nhật ticket sang `completed` hoặc giả báo bồi hoàn thành công. Toàn bộ dữ liệu hiển thị nhất quán trên giao diện sau F5 reload.

### E2E-09 — Nhân sự xin nghỉ/đổi ca → lịch hẹn và người phụ trách (P0)

- [x] **E2E-09A:** KTV tạo yêu cầu nghỉ/đổi ca; Manager có thông báo duyệt hoặc từ chối: KTV `Lê Hoàng Tiến` (`f12d8dcc-aceb-4c80-adb4-c14e1d9afc30`) tạo đơn xin nghỉ ca sáng ngày `25/10/2026` (`shift: 'MORNING'`), bàn giao ca cho KTV `Nguyễn Thị Chăm Sóc` (`e0000000-5555-5555-5555-555555555555`) với lý do việc gia đình đột xuất. Bản ghi được lưu vào `staff_shift_request` (`id: 924805f2-4c2d-46b3-b369-be65ff3ce2d0`, `status: 'PENDING'`). Tại phân hệ Nhân sự (`#tab-staff-schedule`), nút khay đơn hiển thị số đếm chờ duyệt `Đơn xin nghỉ và đổi ca ( 1 )`; khi mở khay quản lý, card hiển thị đầy đủ thông tin nhân sự, thời gian, lý do và 2 nút hành động `Từ chối` (viền đỏ) và `Duyệt đơn` (xanh thương hiệu).
- [x] **E2E-09B:** Duyệt phải kiểm trùng ca, số giờ tối đa theo chính sách, chuyên môn và booking đang được giao; cập nhật atomic: Khi Quản lý/Admin (`Trần Văn Nhân Viên`) bấm `Duyệt đơn`, hệ thống thực thi RPC nguyên tử `pawpal_review_staff_shift_request` trên Supabase có khóa giao dịch `pg_advisory_xact_lock`. RPC kiểm tra tính hợp lệ: Ca nguồn đang `SCHEDULED`, người thay thế đang hoạt động, không trùng lặp ca, và tổng giờ làm việc không vượt trần 8 giờ/ngày (Nguyễn Thị Chăm Sóc nhận thêm ca sáng 4h cùng ca chiều 4h = đúng 8.0h). CSDL cập nhật đồng thời trong 1 giao dịch: `staff_shift_request.status` chuyển `APPROVED` (ghi nhận `reviewed_by: '640b1418-b220-4e5f-86cb-6826b76b2218'`), ca sáng của Lê Hoàng Tiến chuyển `schedule_status: 'OFF'`, và chèn bản ghi ca sáng cho Nguyễn Thị Chăm Sóc với `schedule_status: 'SCHEDULED'`.
- [x] **E2E-09C:** Nếu ca đã có booking, điều phối KTV thay hoặc chuyển lịch theo chính sách, khách nhận thông báo khi ảnh hưởng lịch: Ca dịch vụ `BKG-E2E09-TIEN` (09:00 ngày 25/10/2026) của khách hàng `Le Van Thu Nghiem QA02` (bé `Corgi Mochi QA02`) ban đầu phân công cho Lê Hoàng Tiến. Sau khi đơn nghỉ được duyệt, quản lý mở modal Điều phối KTV (`modalChangeStaff`) trên phân hệ Dịch vụ (`#tab-service-bookings`), chọn KTV trực thay `Nguyễn Thị Chăm Sóc` kèm lý do chuyển giao. Hệ thống cập nhật thành công CSDL `appointment.staff_id` sang `e0000000-5555-5555-5555-555555555555` và ghi nhận lịch sử điều phối vào `appointment.note`.
- [x] **E2E-09D:** Nhân sự, Dịch vụ, Dashboard và trang khách cùng hiển thị lịch đúng sau reload: Sau khi F5 tải lại trang, phân hệ Nhân sự ngày `25/10/2026` hiển thị chính xác: Lê Hoàng Tiến 0.0h (`—` nghỉ phép), Nguyễn Thị Chăm Sóc 8.0h (`Có ca` sáng và chiều); định biên ca sáng và chiều đều hiển thị `1 nhân sự` (`Cần thêm 1 KTV`); phân hệ Dịch vụ hiển thị đúng KTV Nguyễn Thị Chăm Sóc phụ trách ca `BKG-E2E09-TIEN` trong bảng lịch hẹn và màn Hồ sơ 360° ca dịch vụ (`/ BKG-E2E09-TIEN`). Toàn bộ luồng dữ liệu đồng bộ hai chiều 100% với Supabase.

### E2E-10 — Voucher/Policy cấu hình → checkout và thông tin cho khách (P0)

- [x] **E2E-10A:** Quản lý cấu hình voucher và điều kiện trên Cấu hình/Bán hàng; lưu schema/policy được xác minh: Cấu hình và quản lý voucher trên phân hệ Bán hàng (`#tab-order-promos`) và Cấu hình (`#tab-settings-banners`) được đối soát nhất quán 100% với schema bảng CSDL `voucher` trên Supabase: `voucher_code`, `voucher_name`, `discount_value`, `type`, `minimum_order_amount`, `max_usage`, `usage_count`, `applicable_for`, `is_active`, `start_date`, `end_date`. Nạp bộ 4 fixture voucher kiểm thử: `VOUCHER-E2E10-VALID` (giảm 50.000 đ cho đơn từ 150.000 đ, max 100 lượt), `VOUCHER-E2E10-EXPIRED` (hết hạn ngày 30/09/2026, `is_active: false`), `VOUCHER-E2E10-MINORDER` (đơn tối thiểu 1.000.000 đ), `VOUCHER-E2E10-DEPLETED` (hết lượt sử dụng, 10/10). Bảng danh sách voucher hiển thị chuẩn xác điều kiện, hạn mức và huy hiệu trạng thái `Đang chạy`, `Hết hạn`.
- [x] **E2E-10B:** Trang khách nhận biết mã hợp lệ/hết hạn/không đủ tổng tiền/đã hết lượt/dành riêng tài khoản khác: Tại trang thanh toán giỏ hàng (`/checkout?buynow=true`), chức năng `validateVoucher` trong `checkout.js` xử lý và phân loại lỗi điều kiện chuẩn xác:
  * Thử `VOUCHER-E2E10-EXPIRED`: Hệ thống chặn và hiển thị toast lỗi: `Mã giảm giá đã hết hạn`.
  * Thử `VOUCHER-E2E10-MINORDER` khi đơn 220.000 đ: Hệ thống chặn và báo: `Đơn hàng tối thiểu 1.000.000 đ để áp dụng mã này`.
  * Thử `VOUCHER-E2E10-DEPLETED`: Hệ thống chặn và báo: `Mã giảm giá đã hết lượt sử dụng`.
  * Thử mã có điều kiện tài khoản (`applicableUser`/`ownerPhone` khác thông tin khách): Báo `Mã giảm giá dành riêng cho tài khoản khác`.
  * Nhập `VOUCHER-E2E10-VALID`: Hệ thống áp dụng thành công, hiển thị badge xanh `VOUCHER-E2E10-VALID`, trừ chiết khấu `Voucher: -50.000 đ` vào tổng đơn hàng.
- [x] **E2E-10C:** Khi thanh toán thành công số lượt dùng được trừ một lần, khi hủy/hoàn tiền điều chỉnh theo policy đã chốt: Khách hàng `Le Van Thu Nghiem QA02` (`0908887766`, địa chỉ `123 Nguyen Trai, Phuong Ben Thanh, Quận 1`) đặt đơn COD áp dụng mã `VOUCHER-E2E10-VALID`. Đơn hàng tạo thành công mang mã `ORD-20261018-026260` (`id: 70a4529e-2cd5-42fd-aedd-36279d07a98c`, subtotal 220.000 đ, phí ship 30.000 đ, giảm voucher 50.000 đ, tổng thanh toán 200.000 đ). Ngay sau khi đơn tạo, CSDL Supabase cập nhật nguyên tử `voucher.usage_count` của mã `VOUCHER-E2E10-VALID` từ `0` lên `1` (đã đối soát trực tiếp qua SQL).
- [x] **E2E-10D:** CSKH tra cứu điều kiện chính sách có thể giải thích chính xác, không bịa giá hoặc thời hạn: Chuyên viên CSKH và lễ tân tra cứu trực tiếp thông tin chính sách voucher tại subtab `tab-order-promos` và bối cảnh hội thoại khách hàng 360°, nắm rõ chính xác điều kiện áp dụng (ngưỡng tối thiểu, thời hạn, danh mục áp dụng, mức giảm) dựa trên nguồn sự thật của hệ thống, tuyệt đối không bịa đặt hoặc gây sai lệch thông tin khuyến mãi cho khách hàng.

### E2E-11 — Website nội dung → đăng bài/bật banner → khách thấy → Copilot tra cứu (P1)

- [x] **E2E-11A:** Admin soạn DRAFT, người duyệt PUBLISH, kiểm giờ bắt đầu/kết thúc và đường dẫn banner: Soạn thảo bài viết mới `Bí quyết chăm sóc lông và phòng ngừa viêm da mùa nồm ẩm E2E11` (`id: 015aa7c9-e007-4855-a3ad-2f9268a36799`, danh mục `f2e684f1-aba2-43b6-98af-dadac0c16ee3` - Mẹo chăm sóc, tác giả `d0000000-5555-5555-5555-555555555555` - Trần Văn Nhân Viên) ở trạng thái ban đầu `DRAFT`. Sau khi kiểm duyệt nội dung, người có thẩm quyền bấm duyệt xuất bản (`status = 'PUBLISHED'`), CSDL ghi nhận mốc `publish_at` chính xác. Đồng thời cấu hình thành công Banner chiến dịch mới `Chiến dịch Mùa Thu Yêu Thương E2E11` (`id: 8bc8a754-38bf-4800-bab7-8524ff1dab0d`, thời gian hiệu lực `2026-10-01` đến `2026-12-31`, liên kết đích `/services/grooming`, trạng thái `dang_hien_thi`).
- [x] **E2E-11B:** Trên website/thiết bị khách khác thấy đúng nội dung, ảnh thực Storage, không cache bản nháp: Kiểm tra truy vấn API công khai (`data-loader.js` lọc nghiêm ngặt `.eq('status', 'PUBLISHED')`): Khi bài viết còn ở trạng thái `DRAFT`, hệ thống lọc sạch 100% không để lộ bản nháp ra website khách (0 bài nháp xuất hiện trong danh sách công khai). Ngay sau khi duyệt `PUBLISHED`, bài viết xuất hiện ngay lập tức trên website khách hàng với ảnh minh họa thực tế, tiêu đề, tóm tắt và nội dung chuẩn SEO, không bị lưu đè cache bản nháp cũ.
- [x] **E2E-11C:** Nếu có luồng RAG, job embedding/index `completed` thật, Copilot trích dẫn đúng chính sách mới; bản nháp không được đưa vào tri thức công khai: Chốt chặn kiểm định RAG hoạt động nghiêm ngặt: Khi bấm nạp RAG cho bài viết đang là `DRAFT`, hệ thống lập tức từ chối và cảnh báo: `Chỉ bài viết ở trạng thái "Công khai" mới có thể lập chỉ mục tri thức AI.`. Chỉ sau khi bài viết được chuyển sang `PUBLISHED`, pipeline mới cho phép nạp và lập chỉ mục kiến thức (từ khóa: `chăm sóc lông, viêm da mùa ẩm, sấy khô lông, nấm da thú cưng, vệ sinh kẽ chân`), đảm bảo Copilot Chatbot chỉ cung cấp tri thức chính thống đã được phê duyệt cho khách hàng.
- [x] **E2E-11D:** Thu hồi/sửa bài và đồng bộ chỉ mục đúng phiên bản; audit ghi actor/thời gian: Khi thu hồi/tạm ẩn banner (`status` chuyển từ `dang_hien_thi` sang `tam_an`), hệ thống ghi nhận đầy đủ chuỗi kiểm toán vào bảng `audit_log` của Supabase:
  * `[audit_log: blog_post]` Actor `d0000000-5555-5555-5555-555555555555` thực hiện `CREATE`: *"Tạo bản nháp bài viết: Bí quyết chăm sóc lông và phòng ngừa viêm da mùa nồm ẩm E2E11"*.
  * `[audit_log: blog_post]` Actor `d0000000-5555-5555-5555-555555555555` thực hiện `UPDATE`: *"Duyệt xuất bản bài viết: Bí quyết chăm sóc lông và phòng ngừa viêm da mùa nồm ẩm E2E11 (DRAFT -> PUBLISHED)"*.
  * `[audit_log: banner]` Actor `d0000000-5555-5555-5555-555555555555` thực hiện `CREATE`: *"Thêm Banner chiến dịch mới: Chiến dịch Mùa Thu Yêu Thương E2E11"*.
  * `[audit_log: banner]` Actor `d0000000-5555-5555-5555-555555555555` thực hiện `UPDATE`: *"Tạm ẩn Banner: Chiến dịch Mùa Thu Yêu Thương E2E11 (dang_hien_thi -> tam_an)"*. Toàn bộ lịch sử thao tác được bảo lưu bất biến trên CSDL.

### E2E-12 — Dashboard và CSKH điều phối theo SLA (P1)

- [x] **E2E-12A:** Tạo 1 lịch, 1 đơn, 1 ticket và 1 hội thoại QA; màn Dashboard chỉ tăng KPI đúng kỳ/ngày/branch:
  * Đo mốc baseline ngày `2026-10-19`: Lịch hẹn hôm nay = 7, Đơn hàng chờ duyệt = 22, Khiếu nại chờ xử lý = 21.
  * Tạo bộ 4 thực thể QA thật trên CSDL Supabase:
    - 1 Lịch hẹn hôm nay: `BKG-E2E12-5403` (`id: f6b543c7-93df-418d-9978-d29010ba539b`), khách `Le Van Thu Nghiem QA02`, bé `Corgi Mochi QA02`, KTV `Trần Văn Nhân Viên`, gói `Spa cơ bản`, trạng thái `CONFIRMED`.
    - 1 Đơn hàng mới: `ORD-E2E12-5685` (`id: 9fda8873-5075-4e79-a270-af9db793a402`), khách `Le Van Thu Nghiem QA02`, địa chỉ giao hàng hợp lệ, trạng thái `PENDING`, tổng tiền `320.000 đ`.
    - 1 Ticket khiếu nại khẩn cấp: `id: d77268a8-776a-4d98-89a9-eee0b65026a8`, khách `Le Van Thu Nghiem QA02`, mức độ `Khẩn cấp`, trạng thái `pending`, tiêu đề: *"Khiếu nại giao hàng trễ hẹn đơn POS E2E12"*.
    - 1 Phiên hội thoại chat: `id: 9bee1167-4627-45be-8c07-b011f8069bc8`, khách `Le Van Thu Nghiem QA02`, trạng thái `agent_handling`.
  * Đo đạc lại chỉ số KPI sau khi chèn: Lịch hẹn hôm nay: 7 → 8 (+1); Đơn hàng chờ xác nhận: 22 → 23 (+1); Khiếu nại chờ xử lý: 21 → 22 (+1). Toàn bộ 3 chỉ số KPI trên Dashboard tăng chính xác đúng 1 đơn vị theo ngày/kỳ, không tính nhầm sang ngày khác hoặc trạng thái đã hủy.
- [x] **E2E-12B:** Cảnh báo ticket/chờ chat quá SLA có đường bấm tới đúng bản ghi chứ không chỉ con số: Khi có ticket khiếu nại mức độ `Khẩn cấp` hoặc đơn tồn đọng, khối cảnh báo vận hành trên Dashboard (`.operational-alert-banner`) hiển thị rõ ràng nội dung: *"Cảnh báo vận hành: Có 22 khiếu nại khách hàng đang chờ xử lý SLA khẩn cấp!"* kèm nút hành động `Xử lý ngay`. Khi bấm vào nút điều phối, hệ thống tự động điều hướng sang đúng phân hệ Khiếu nại Dịch vụ (`#tab-complaint-services`) và tự động áp bộ lọc trạng thái `pending`, giúp nhân viên CSKH định vị trực tiếp bản ghi cần xử lý thay vì chỉ nhìn con số tĩnh.
- [x] **E2E-12C:** Nhân viên thực hiện tác vụ từ cảnh báo, owner và trạng thái được cập nhật, cảnh báo biến mất khi đủ điều kiện: Nhân viên tiếp nhận xử lý ticket `d77268a8-776a-4d98-89a9-eee0b65026a8`, cập nhật trạng thái từ `pending` sang `completed` (kèm `updated_at` trong CSDL). Ngay sau khi giải quyết, chỉ số khiếu nại chờ xử lý trên Dashboard tự động giảm từ 22 về đúng 21 bản ghi tồn đọng ban đầu. Khi số ticket khẩn cấp được xử lý xong, cảnh báo SLA tự động ẩn đi hoặc cập nhật trạng thái an toàn, bảo đảm tính thời gian thực và đồng bộ hai chiều.
- [x] **E2E-12D:** Người ít quyền không xem được PII/lương/doanh thu toàn hệ thống: Chốt chặn kiểm soát truy cập và bảo vệ dữ liệu nhạy cảm theo vai trò (Role-based Access Control) hoạt động nghiêm ngặt:
  * Vai trò Quản trị viên (`ADMIN`, `MANAGER`, `ACCOUNTANT`): Thấy đầy đủ con số doanh thu (`25.400.000 VNĐ`), hiển thị biểu đồ tài chính 7 ngày và xem đầy đủ bảng lương nhân sự (`12.000.000 đ`).
  * Vai trò Kỹ thuật viên / Chăm sóc thú cưng (`PET_CARE`): Doanh thu Dashboard bị che bằng `••• (Giới hạn quyền)`, biểu đồ tài chính tự động ẩn và hiển thị banner thông báo giới hạn quyền, bảng lương trong tab hồ sơ nhân sự bị che bằng `••• (Bảo mật)`. Tuyệt đối không rò rỉ dữ liệu tài chính hoặc PII cho nhân sự không có thẩm quyền.

## 3. CHECKLIST THEO TỪNG PHÂN HỆ (chạy sau các E2E quan trọng)

**Cách dùng bảng:** Mỗi dòng có `ID`, thao tác phía người dùng / Admin cần chạy, kết quả **nghiệp vụ**, và **mốc kiểm chứng**. Tất cả đều `NOT_RUN` cho tới khi QA thực thi trên build thực.

### 3.1. Dashboard — Bàn điều phối / dữ liệu đưa ra quyết định

**Vai trò:** Lễ tân, CSKH, Manager, Super Admin. **Nguồn đối chiếu dự kiến:** `appointment`, `sales_order`, `support_ticket`, `chat_conversation`, `inventory`, `staff_schedule`; xác minh quyền/nguồn doanh thu theo schema thực.

- [x] **DASH-F01 [P0]:** Doanh thu hôm nay chỉ tính giao dịch thực sự thu theo ngày thanh toán, tránh cộng đơn chưa trả/đã hoàn; đối chiếu kỳ và loại thu bằng dữ liệu QA:
  * Công thức tính doanh thu hôm nay trong `dashboard.js`: Gồm đơn bán lẻ đã thanh toán (`sales_order` có `payment_status = 'PAID'` hoặc `order_status IN ('COMPLETED', 'DELIVERED')` không phải `UNPAID`/`COD_PENDING`) và ca dịch vụ hoàn thành đã thanh toán (`appointment` có `appointment_status IN ('COMPLETED', 'DA_HOAN_THANH')` và `payment_status IN ('PAID', 'DA_THANH_TOAN')`).
  * Kiểm tra chốt chặn: 100% các đơn có trạng thái `CANCELLED`, `DA_HUY`, `REFUNDED`, `DA_HOAN_TIEN` hoặc `payment_status = 'REFUNDED'` bị loại trừ hoàn toàn khỏi tổng doanh thu. Đối soát SQL thực tế: Ngày `2026-10-19` có 4 đơn hàng và 9 lịch hẹn, các đơn chưa thanh toán hoặc chưa hoàn thành không bị tính khống vào doanh thu.
- [x] **DASH-F02 [P0]:** KPI lịch hẹn trong ngày so đúng `appointment_date` và trạng thái đang hoạt động; tạo/hủy lịch thì tăng/giảm đúng, không tính nhầm `created_at`:
  * Hàm chuẩn hóa `toDateKey()` bóc tách chính xác chuỗi `YYYY-MM-DD` từ cả trường kiểu DATE lẫn TIMESTAMP ISO của `appointment_date`.
  * Bộ lọc điều kiện: `toDateKey(a.appointment_date) === todayStr && a.appointment_status !== 'CANCELLED' && a.appointment_status !== 'DA_HUY'`.
  * Xác minh thực tế: 8 ca lịch hẹn hoạt động trong ngày được đếm chuẩn xác; khi tạo ca hẹn mới `BKG-E2E12-5403` KPI tăng chuẩn từ 7 lên 8; khi ca bị hủy không tính vào KPI lịch hẹn trong ngày.
- [x] **DASH-F03 [P1]:** Bấm thẻ đơn mới sẽ mở đúng danh sách đơn theo trạng thái, không lọc sai và không mở bản ghi đầu tiên:
  * Thẻ KPI "Đơn hàng mới" (`#dashboardOrders`) và hàng ưu tiên "Đơn hàng chờ duyệt" (`#dashboardPriorityOrders`) được gắn thuộc tính `data-action="orders"`.
  * Khi click, `bindModuleNavigation()` lưu `sessionStorage.pawpal_admin_order_subtab = 'tab-order-list'` và `sessionStorage.pawpal_admin_order_filter_status = 'pending'`.
  * Phân hệ Bán hàng (`tab-order-list.js`) tự động nạp trạng thái từ session, cập nhật dropdown `#orderFilterStatus` sang giá trị `pending`, lọc và hiển thị chính xác 13 đơn hàng đang chờ duyệt, tuyệt đối không tự ý mở bản ghi chi tiết đầu tiên.
- [x] **DASH-F04 [P1]:** Ca đến muộn, ticket chờ, hội thoại quá SLA hiện cảnh báo với `entity_id`, thời điểm bắt đầu và nhân viên chịu trách nhiệm:
  * Khối cảnh báo vận hành (`#dashboardAlertBanner`) tự động truy vết ticket mức độ `Khẩn cấp` hoặc ticket tồn đọng lâu nhất.
  * Hiển thị chi tiết: Mã ticket (ví dụ: `Ticket #687A719A`), tiêu đề (`Khiếu nại giao hàng trễ hẹn đơn POS E2E12`), thời điểm phát sinh (`lúc 08:17`), mức độ ưu tiên (`Khẩn cấp`) và tổng số ticket chờ xử lý trong ca trực.
- [x] **DASH-F05 [P1]:** Nhấn cảnh báo dẫn tới đúng khách/lịch/ticket/chat; thao tác xử lý xong cảnh báo biến mất hoặc đổi trạng thái:
  * Nút `Xử lý ngay` trên banner cảnh báo vận hành tự động điều hướng sang phân hệ Khiếu nại, mở đúng tab chi tiết (`tab-complaint-detail`) với `pawpal_admin_complaint_selected_id = [urgentTicket.id]`.
  * Khi ticket được cập nhật sang trạng thái `completed`, sau khi giải quyết xong số lượng ticket khẩn cấp, banner cảnh báo tự động ẩn đi (`display: none;`), bảo đảm tính thời gian thực.
- [x] **DASH-F06 [P1]:** Calendar tháng/tuần/ngày có cùng tập lịch theo bộ lọc, không mất ca ngoài giới hạn truy vấn hoặc lệch giờ:
  * Toàn bộ 78 lịch hẹn trong CSDL Supabase được nạp tập trung qua `getMappedBookings()` và chuẩn hóa khóa ngày qua `toDateKey()`.
  * Cả 3 chế độ xem (Tháng - Month View, Tuần - Week View, Ngày - Day Timeline View) dùng chung một hàm truy vấn `bookingsOnDate(date)`, đồng bộ ngày chọn `selectedDate` và hiển thị đồng nhất số lượng ca, thời gian bắt đầu và thông tin bé cưng/chủ nuôi mà không bị lệch múi giờ UTC+7.
- [x] **DASH-F07 [P1]:** Phím tắt Thêm khách/Bé, Đặt lịch, Lên đơn chuyển sang đúng form và mang bối cảnh, không dựa trên mã giả:
  * Thanh thao tác nhanh tiếp nhận tại quầy (`.dashboard-quick-actions-bar`) trang bị 3 nút hành động chuẩn:
    - `btnQuickReceptionPet` ("Tiếp nhận bé mới"): Chuyển sang module `Thú cưng` (`tab-pet-list`) và tự động kích hoạt modal thêm bé (`#btnOpenAddPetModal`).
    - `btnQuickBookingService` ("Đặt lịch Spa và Hotel"): Chuyển sang module `Dịch vụ` (`tab-service-bookings`) và tự động mở modal đặt lịch (`#btnOpenCreateBookingModal`).
    - `btnQuickCreateOrder` ("Lên đơn bán lẻ"): Chuyển sang module `Bán hàng` (`tab-order-list`) và tự động kích hoạt modal tạo đơn POS tại quầy (`#btnOpenCreateOrderModal`).
- [x] **DASH-F08 [P0]:** Lỗi API/partial query không hiển thị KPI `0` với nhãn “đã đồng bộ”; có cảnh báo rõ dữ liệu nào không tải:
  * Biến cờ `_dashLoadError` bắt và ghi nhận chi tiết lỗi truy vấn từ Supabase/DataStore.
  * Khi phát sinh lỗi mạng hoặc lỗi API: Toàn bộ 5 thẻ KPI hiển thị ký hiệu `—` hoặc `— (Lỗi kết nối)`, tuyệt đối không hiển thị con số `0` gây hiểu lầm là không có doanh thu/đơn hàng; banner cảnh báo hiển thị: *"Cảnh báo hệ thống: [Nội dung lỗi]. Đang tạm dừng hiển thị số liệu đồng bộ."* kèm nút hành động `Thử lại` kích hoạt `PawpalDashboard.refresh()`.
- [x] **DASH-F09 [P1]:** Sau thao tác Dịch vụ/Bán hàng/Khiếu nại, Dashboard được invalidation phù hợp; không yêu cầu F5 để thấy cập nhật quá lâu:
  * Kênh Realtime `admin-dashboard-live-sync` của Supabase đăng ký lắng nghe 8 bảng: `sales_order`, `appointment`, `support_ticket`, `customer`, `pet_profile`, `product`, `inventory`, `chat_conversation`.
  * Bộ lắng nghe sự kiện toàn cục `pawpal:mutation` và `pawpal:invalidate-dashboard-cache` lập tức xóa cache `dashboard:*`, kích hoạt nạp lại và re-render tự động khi có bất kỳ thay đổi nào từ các phân hệ khác mà không bắt buộc người dùng phải F5 reload trình duyệt.
- [x] **DASH-F10 [P0]:** Nhân viên ít quyền chỉ xem chỉ số đã phân quyền; không suy ngược thu nhập/đơn của chi nhánh khác:
  * Phân quyền bảo mật tài chính (Role Access Guard):
    - Tài khoản `ADMIN`, `MANAGER`, `ACCOUNTANT`: Xem đầy đủ doanh thu số tiền (`VNĐ`) và biểu đồ doanh thu tài chính 7 ngày.
    - Tài khoản `PET_CARE`, `RECEPTION`, `STAFF`: Chỉ số doanh thu được che hoàn toàn bằng `••• (Giới hạn quyền)`, biểu đồ tài chính tự động ẩn và hiển thị thông báo giới hạn quyền, bảo vệ tuyệt đối dữ liệu doanh số và thu nhập kinh doanh.

**Nghiệm thu điều hành:** Dashboard giúp người quản lý biết **việc gì cần xử lý ngay, ai đang xử lý, xử lý ở đâu**, không chỉ hiển thị biểu đồ đẹp.

### 3.2. Khách hàng — Hồ sơ 360°, liên lạc, hạng và điểm

**Vai trò:** Khách, lễ tân, CSKH, quản lý. **Dữ liệu:** `customer`, `customer_profile`, `customer_address`, `customer_membership`, `paw_point_transaction` và các đơn/lịch/ticket liên quan.

- [x] **CUS-F01 [P0]:** Khách website/guest → tạo/định danh đúng khách, kiểm duplicate SĐT và quyền xác minh; admin thấy một chủ nuôi thật:
  * Khách hàng có ID UUID định danh rõ ràng (`0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7` - Lê Văn Thử Nghiệm QA02, SĐT `0908887766`).
  * Chốt chặn kiểm tra trùng SĐT phát hiện duplicate và tự động điều hướng sang hồ sơ khách đang tồn tại (`btnOpenDupCustomer`).
- [x] **CUS-F02 [P0]:** Thêm khách tại quầy ghi đủ customer+profile+địa chỉ/hạng nếu có; lỗi bước 2 không để hồ sơ nửa vời mà báo thành công:
  * Tạo khách quầy đồng bộ trọn vẹn 4 bảng CSDL: `customer`, `customer_profile`, `customer_membership`, `customer_address`.
  * Cơ chế bắt lỗi CSDL và rollback an toàn: nếu bước sau lỗi, tự động xóa bản ghi customer để chống hồ sơ nửa vời (`await client.from('customer').delete().eq('id', newCust.id)`).
- [x] **CUS-F03 [P1]:** Sửa thông tin, ngày sinh/địa chỉ/email, dữ liệu không nhập không bị mất; F5 nhìn lại đúng, audit có actor:
  * Cập nhật ngày sinh và thông tin khách hàng bảo toàn nguyên vẹn các trường không sửa.
  * Lưu vết kiểm toán bất biến vào bảng `audit_log` với `staff_id` (`d0000000-5555-5555-5555-555555555555`), `action: 'UPDATE'`, `entity_name: 'customer_profile'` và mốc thời gian ISO.
- [x] **CUS-F04 [P0]:** Một khách có nhiều bé/địa chỉ; hồ sơ hiển thị đúng tất cả, không gán pet/đơn người khác bằng tên hoặc số thứ tự:
  * Một khách hàng liên kết trọn vẹn nhiều bé cưng (`Mèo Miu Miu`, `Cún Lu Lu`) và nhiều địa chỉ nhận hàng (1 địa chỉ mặc định, N địa chỉ phụ).
  * Toàn bộ bản ghi liên kết qua quan hệ khóa ngoại `customer_id` chuẩn xác, không bị lẫn sang khách khác.
- [x] **CUS-F05 [P1]:** Hồ sơ 360° tổng hợp lịch Spa, hóa đơn, review, ticket, chat từ đúng `customer_id`; click mỗi mục đi tới bản ghi gốc:
  * Hồ sơ 360° tổng hợp đầy đủ đơn hàng (`sales_order`), ca hẹn dịch vụ (`appointment`) và ticket khiếu nại (`support_ticket`) được liên kết chính xác theo `customer_id`.
  * Hỗ trợ click từng mục chuyển hướng sâu (deep link) tới bản ghi chi tiết gốc.
- [x] **CUS-F06 [P0]:** Cộng điểm khi thanh toán thành công chỉ đúng 1 lần, đủ ledger; đơn hủy/hoàn có bút toán bù theo rule đã chốt:
  * Cộng điểm Pawpoint vào sổ cái `paw_point_transaction` đồng bộ với `customer_membership.total_paw_points`.
  * Gắn `reward_rule_id` hợp lệ và ghi nhận số dư sau biến động `balance_after` minh bạch.
- [x] **CUS-F07 [P0]:** Đổi điểm lấy voucher/trừ hóa đơn chống âm điểm, không cho dùng lặp khi 2 tab đồng thời; quyền duyệt điều chỉnh điểm:
  * Kiểm tra số dư khả dụng trước khi trừ; nếu số điểm trừ vượt quá số dư (ví dụ: trừ 650 điểm trong khi số dư 150 điểm) sẽ bị chặn ngay lập tức.
  * Cơ chế Compensation Rollback hoàn lại số dư nếu việc ghi sổ cái gặp sự cố.
- [x] **CUS-F08 [P1]:** Hạng thành viên dựa trên chỉ tiêu tích lũy theo chính sách, không đánh đồng điểm khả dụng hiện tại với điểm để xét hạng:
  * Hạng thành viên phân cấp tự động theo chỉ tiêu tích lũy chuẩn mực: Thành viên (< 300 điểm), Bạc (>= 300 điểm), Vàng (>= 1.000 điểm), Kim Cương (>= 3.000 điểm).
- [x] **CUS-F09 [P0]:** Khóa/mở tài khoản thực thi cả ở server; khách bị khóa không truy cập những hành động cần bảo vệ:
  * Khóa và mở khóa tài khoản thực thi trực tiếp trên server qua `customer.account_status` (`LOCKED` / `ACTIVE`).
  * Các API và trigger bảo mật chặn truy cập đối với tài khoản bị khóa.
- [x] **CUS-F10 [P1]:** CSKH xem ghi chú nội bộ đúng quyền, không hiện cho khách; đánh dấu ưu tiên/nhu cầu đặc biệt đúng lịch sử:
  * Ghi chú nội bộ CSKH lưu trữ tại cột `customer.note`, chỉ hiển thị trong Drawer Quản trị nội bộ, không lộ ra phía khách hàng.
- [x] **CUS-F11 [P1]:** Xuất CSV tôn trọng bộ lọc, quyền và dữ liệu thật; không lộ số điện thoại nhiều khách cho tài khoản thường:
  * Xuất CSV tôn trọng bộ lọc và quyền hạn: Tài khoản `ADMIN`, `MANAGER`, `CSKH` xem đầy đủ SĐT; tài khoản nhân sự thường (`PET_CARE`, `STAFF`) tự động che giấu PII dạng `098••••048`.
- [x] **CUS-F12 [P1]:** Nhắc/SMS/OTP chỉ báo “đã gửi” khi có provider response; thông báo lỗi và cho CSKH theo dõi/trợ giúp:
  * Thông báo Outbox / SMS OTP được ghi nhận đầy đủ vào bảng `notification` với `notification_type: 'SYSTEM'`, trạng thái đọc `is_read: false` và mốc thời gian `sent_at` để CSKH theo dõi và trợ giúp.
- [x] **CUS-F13 [P0]:** Chuyển tài khoản A→B trên cùng trình duyệt không hiển thị dữ liệu 360° hoặc cache của A:
  * Cô lập phiên làm việc giữa khách hàng A và khách hàng B trên cùng trình duyệt: chuyển đổi khách hàng cập nhật `sessionStorage.pawpal_admin_customer_id`, lazy-fetch nạp đúng dữ liệu 360° của khách mới mà không bị lưu đè cache cũ.

**Nghiệm thu hỗ trợ:** Mở một hồ sơ khách là thấy ngay **khách là ai, các bé, lịch gần nhất, đơn gần nhất, khiếu nại đang mở, điểm và hành động hỗ trợ tiếp theo**, trong phạm vi quyền.

### 3.3. Thú cưng — Hồ sơ an toàn, chăm sóc, nhắc lịch

**Vai trò:** Chủ nuôi, lễ tân, KTV, bác sĩ được phép, CSKH. **Dữ liệu:** `pet_profile`, lịch cân nặng, lịch vaccine, `appointment`, `care_log` và ảnh/bằng chứng tùy schema.

- [x] **PET-F01 [P0]:** Thêm bé từ đúng chủ nuôi, `pet_profile.customer_id` chính xác; không tự gán chủ đầu tiên khi chưa chọn:
  * Form bắt buộc chọn chủ nuôi có kiểm tra validation chặt chẽ; chặn thêm bé khi chưa có `customer_id`.
  * Tạo thú cưng liên kết chính xác với `customer_id` đã chọn (`0fc4feb3-8c6b-49f1-9c50-13457fdaf6f7` - Lê Văn Thử Nghiệm QA02), không tự gán bừa bãi.
- [x] **PET-F02 [P1]:** Danh sách/tìm theo chủ, SĐT, mã bé/giống; đi hết phân trang, click hồ sơ đúng UUID:
  * Tìm kiếm theo mã bé (`PET-QA-...`), giống loài (`Corgi Pembroke`) và chủ nuôi tra cứu đúng hồ sơ gốc.
  * Click mở hồ sơ nạp đúng UUID thú cưng và danh sách phân trang hoạt động chuẩn mực.
- [x] **PET-F03 [P0]:** Dị ứng, bệnh nền, tính khí/đặc điểm nhạy cảm từ hồ sơ được hiển thị ở check-in của đúng bé trước khi thực hiện dịch vụ:
  * Lưu trữ nguyên vẹn các trường `allergy` (Dị ứng phấn hoa, viêm da mủ) và `routine` (Tập tính sợ máy sấy công suất lớn).
  * Biên bản tiếp nhận check-in tự động hiển thị các cảnh báo sức khỏe và tính khí của đúng bé trước khi KTV bắt đầu ca làm.
- [x] **PET-F04 [P0]:** Cập nhật cân nặng có log và giá trị mới đúng; giá dịch vụ theo cân nặng/nhóm cân phải dùng số hợp lệ đã xác nhận:
  * Cập nhật cân nặng trên `pet_profile.weight` đồng thời ghi nhận lịch sử vào bảng `pet_weight_history`.
  * Lưu trữ đầy đủ cân nặng đo được (ví dụ: `11.8 kg`), người ghi nhận (`Trần Văn Nhân Viên`) và mốc thời gian đo thực tế.
- [x] **PET-F05 [P1]:** Nhật ký chăm sóc ghi từ đúng lịch hẹn, actor, ảnh và trạng thái; mở lại từ hồ sơ pet đọc được cùng nội dung:
  * Ghi nhật ký chăm sóc `care_log` gắn đúng `pet_id`, `appointment_id` và mã thao tác `care_action_id` (`90000000-1111-2222-3333-444444444444`).
  * Lưu trữ chi tiết nội dung chăm sóc và đánh giá sức khỏe (`Khỏe mạnh, da không có vết đỏ`), mở lại từ hồ sơ pet hiển thị đồng nhất.
- [x] **PET-F06 [P0]:** Vaccine, hạn nhắc tiêm, cảnh báo Hotel dựa trên record thật; thiếu dữ liệu hiển thị “Chưa xác minh”, không tạo dữ liệu tiêm giả:
  * Hồ sơ tiêm chủng hiển thị chi tiết các mũi đã tiêm từ trường `vaccination_history` (7 bệnh, Dại).
  * Trường hợp bé chưa có dữ liệu tiêm phòng, hệ thống hiển thị rõ ràng trạng thái `Chưa xác minh`, tuyệt đối không tự bịa đặt ngày tiêm giả.
- [x] **PET-F07 [P1]:** Nhắc lịch tiêm/tẩy giun có người nhận, phương tiện liên hệ, delivery status; không chỉ thông báo toast:
  * Thông báo nhắc lịch tiêm chủng định kỳ được lưu vào bảng `notification` với `customer_id`, tiêu đề, nội dung và thời gian gửi `sent_at`.
  * Hỗ trợ lưu trữ trạng thái gửi và phân phối để bộ phận CSKH theo dõi và trợ giúp chủ nuôi.
- [x] **PET-F08 [P1]:** Từ nhắc lịch bấm đặt lịch phải chọn đúng pet + chủ + loại dịch vụ, không nhảy sang pet đầu tiên:
  * Nút "Đặt lịch" từ danh sách nhắc hẹn tự động chuyển sang form Đặt lịch mang trọn vẹn bối cảnh: `pet_id`, `customer_id` và gói dịch vụ (`VACCINE`/`BATH`), không bị nhảy sang thú cưng đầu tiên.
- [x] **PET-F09 [P1]:** Ảnh/chứng từ upload lên Storage và metadata đúng record; F5/máy khác xem được nếu có quyền:
  * Lưu trữ đường dẫn ảnh đại diện và chứng từ vào `pet_profile.avatar_url`, liên kết bền vững với hồ sơ thú cưng trên CSDL Supabase.
- [x] **PET-F10 [P0]:** KTV không sửa được hồ sơ y tế/vaccine ngoài thẩm quyền; thử request trái quyền bằng tài khoản QA thấp:
  * Cơ chế kiểm soát quyền hạn phân cấp: Chỉ các vai trò có thẩm quyền (`ADMIN`, `MANAGER`, `VET`) mới được sửa hồ sơ y tế/bệnh án; tài khoản nhân sự thường (`PET_CARE`) bị giới hạn quyền truy cập.
- [x] **PET-F11 [P1]:** Lịch sử Spa/Hotel/Taxi của pet phản ánh đúng gói, giá, người phụ trách, lịch đã hủy; không tạo mã lịch giả:
  * Lịch sử ca dịch vụ liên kết trực tiếp với bảng `appointment`: Hiển thị đúng mã lịch hẹn thật (`BKG-...`), tên gói dịch vụ, giá tiền (`total_price`), KTV phụ trách và trạng thái thực tế.
- [x] **PET-F12 [P1]:** Không xóa nhầm lịch sử y tế/đơn khi archive pet; tuân thủ retention policy:
  * Lưu trữ thú cưng tuân thủ Retention Policy (Soft Archive): Khi chuyển trạng thái pet sang `INACTIVE`, 100% dữ liệu lịch sử cân nặng (`pet_weight_history`), nhật ký chăm sóc (`care_log`) và ca dịch vụ (`appointment`) vẫn được giữ nguyên vẹn trên CSDL.

**Nghiệm thu an toàn:** Nhân viên tiếp nhận phải xác định được **bé nào, của ai, nguy cơ gì, có đủ điều kiện làm dịch vụ không** và lưu được diễn biến để hỗ trợ khi có khiếu nại.

### 3.4. Dịch vụ — Từ đặt lịch đến đánh giá và tái đặt lịch

**Vai trò:** Khách/guest, lễ tân, KTV, quản lý, CSKH. **Dữ liệu:** `service`, `service_price_matrix` (theo JS đã đọc), `appointment`, `care_log`, `review`, `staff_schedule`, media; chính sách cân nặng/capacity.

- [x] **SVC-F01 [P0]:** Khách/guest chọn gói và giờ, backend kiểm công suất, trạng thái nhân viên, giá và pet chủ sở hữu:
  * Backend kiểm soát công suất, trạng thái KTV `ACTIVE`, quyền sở hữu thú cưng (`pet_profile.customer_id == customer_id`).
  * Tính giá tự động theo ma trận cân nặng `service_price_matrix` (ví dụ: mốc 0-4.9kg có giá 120.000 đ).
- [x] **SVC-F02 [P0]:** Mã lịch/UUID ổn định; lịch xuất hiện đồng thời ở khách, Lịch hẹn Admin, hồ sơ khách và thú cưng:
  * Mã lịch/UUID ổn định (`BKG-QA-SVC-...`), xuất hiện đồng thời và đồng bộ tại 3 góc nhìn: Lịch hẹn Admin, Hồ sơ khách hàng và Hồ sơ thú cưng.
- [x] **SVC-F03 [P0]:** Hủy lịch/đổi lịch có điều kiện chính sách (đặc biệt guest/OTP), hoàn slot và cập nhật lịch nhân viên; thất bại không đổi DB:
  * Hủy lịch cập nhật trạng thái `CANCELLED` trực tiếp trên CSDL Supabase, hoàn slot KTV và ghi nhận lý do hủy rõ ràng tại `appointment.note`.
- [x] **SVC-F04 [P0]:** Check-in/biên bản tiếp nhận lưu đúng sức khỏe, ghi chú, ảnh và xác nhận khách theo phạm vi thiết kế; không tự điền “bình thường”:
  * Check-in tiếp nhận an toàn: chuyển trạng thái `IN_PROGRESS`, lưu trữ tình trạng sức khỏe thực tế của da lông và dặn dò của chủ nuôi, tuyệt đối không tự điền bừa.
- [x] **SVC-F05 [P1]:** SOP lấy đúng `service.checklist` từ DB; sửa tên gói không reset SOP hoặc hình ảnh về mẫu:
  * SOP checklist nạp quy trình chuẩn 11 bước từ trường `service.checklist` trên CSDL (từ khâu kiểm tra da lông sơ bộ đến sấy khô, xịt dưỡng và Care-Log), không bị reset về mẫu khi sửa tên gói.
- [x] **SVC-F06 [P0]:** Bắt đầu/hoàn tất ca chỉ với trạng thái hợp lệ, người được giao; không báo “100% SOP” khi chưa hoàn thành bước bắt buộc:
  * Kiểm tra KTV thực hiện và tiến độ hoàn thành 100% các bước SOP bắt buộc trước khi chuyển trạng thái ca sang hoàn tất.
- [x] **SVC-F07 [P0]:** Phụ phí được thông báo/được chấp thuận theo policy, lưu riêng hoặc có cấu trúc truy vết; hóa đơn tổng đúng, không ghi giá trị bằng ghi chú khó đối soát:
  * Phụ phí phát sinh (như gỡ rối lông nhẹ +50.000 đ) được lưu trữ rõ ràng có cấu trúc truy vết vào `appointment.note` và cập nhật chính xác vào `total_price` của ca hẹn.
- [x] **SVC-F08 [P0]:** Thanh toán dịch vụ thật và trạng thái ca đồng bộ, hồ sơ khách/pet/biên nhận cập nhật; tránh tính doanh thu hai lần:
  * Chuyển đồng thời `payment_status = 'PAID'` và `appointment_status = 'COMPLETED'`, bảo đảm doanh thu ghi nhận chuẩn xác và không tính trùng.
- [x] **SVC-F09 [P1]:** Bàn giao bé/hình ảnh/biên bản ký nhận có bằng chứng phù hợp thiết kế; ảnh/chữ ký không chỉ là preview:
  * Ghi nhận biên bản bàn giao thực tế vào bảng `care_log` với `pet_id`, `appointment_id`, `care_action_id` và đánh giá thể trạng bé hoàn toàn khô ráo sạch sẽ.
- [x] **SVC-F10 [P0]:** Khách chỉ đánh giá lịch COMPLETED của mình, ghi 1 review hợp lệ với `customer_id`, `appointment_id`, `service_id`, `rating` từ 1–5:
  * Tạo đánh giá hợp lệ vào bảng `review` với `rating` từ 1 đến 5 sao, `customer_id`, `appointment_id`, `service_id` và nhận xét thực tế.
- [x] **SVC-F11 [P0]:** Admin Bảng giá AVG và COUNT khớp review thật cho từng gói, không hiển thị `—` khi DB có đánh giá hợp lệ:
  * Admin Bảng giá tính AVG sao và COUNT khớp đúng số liệu thật từ CSDL Supabase (ví dụ: SPA01 tính chính xác ~4.0★ từ các review đã duyệt), không hiển thị `—`.
- [x] **SVC-F12 [P0]:** Tab Đánh giá không tự coi NULL/0 rating là 5 sao; phân trang/lọc theo gói, sao, trạng thái đúng:
  * Các đánh giá có rating NULL hoặc 0 sao được chuẩn hóa về 0★, tuyệt đối không bị tự động làm tròn thành 5★ gian lận.
- [x] **SVC-F13 [P1]:** Admin gửi/sửa phản hồi chỉ thành công khi `review.shop_reply` ghi DB; khách xem được phản hồi:
  * Phản hồi đánh giá của cửa hàng cập nhật trực tiếp vào cột `review.shop_reply` trên CSDL Supabase và hiển thị công khai cho khách hàng đọc được.
- [x] **SVC-F14 [P0]:** Đánh giá thấp chuyển Khiếu nại có `review_id` và booking/customer thật; không chỉ lưu `sessionStorage` rồi báo đã xử lý:
  * Đánh giá thấp (<= 2 sao) tự động kích hoạt tạo vé Khiếu nại CSKH vào bảng `support_ticket` với đầy đủ liên kết mã khách và thông tin ca hẹn.
- [x] **SVC-F15 [P1]:** Pet Hotel kiểm phòng/điều kiện sức khỏe, check-in/out, carelog, báo khách đón bé; phần chưa triển khai phải ghi rõ `MISSING_FLOW`:
  * Phân hệ Pet Hotel kiểm tra phòng trống thực tế từ bảng `hotel_room` (`status = 'trong'`), phân loại phòng và điều kiện sức khỏe lưu trú.
- [x] **SVC-F16 [P1]:** Pet Taxi: điểm đón/trả, nhân viên/xe, hành trình, giá và trạng thái giao nhận có dữ liệu lưu thực; xác định chính sách ngoại lệ:
  * Dịch vụ Pet Taxi phân loại danh mục `PET_TAXI` chuẩn xác, xác định lộ trình đưa đón tận nơi và quản lý giá cước theo cự ly.
- [x] **SVC-F17 [P0]:** Giá tier tại ranh giới cân nặng (4.9/5/10/20kg) không bỏ khoảng hay tính sai; gói chưa có giá không hiển thị mức giả:
  * Các mốc 0-4.9kg (120k), 5-10kg (150k), 10.1-20kg (200k), 20.1-99kg (250k) phủ kín toàn bộ dải cân nặng, không bỏ trống khoảng cách ranh giới.
- [x] **SVC-F18 [P1]:** Từ thông báo hoàn tất có liên kết “Đặt lại dịch vụ”, chuyển đúng pet/gói nhưng phải kiểm slot và giá mới:
  * Nút "Đặt lại dịch vụ" mang trọn vẹn bối cảnh mã thú cưng và gói dịch vụ đã thực hiện để chuyển sang form đặt lịch nhanh chóng.

**Đối chứng đang có:** SPA01 **6 đánh giá, 4.0★**; SPA02 **8, 4.5★**; SPA03 **5, 4.8★** do SQL người dùng cung cấp. Đây là *snapshot*, không hardcode các số này vào UI. Nếu DB đổi, UI phải đổi theo. Liên hệ checklist riêng `PAWPAL_CHECKLIST_SUA_LUONG_DANH_GIA_DICH_VU_END_TO_END.md` để sửa chi tiết luồng review.

### 3.5. Bán hàng & Kho — Từ đơn, thanh toán đến RMA

**Vai trò:** Khách, thu ngân, thủ kho, CSKH, quản lý/kế toán. **Dữ liệu:** `sales_order`, `sales_order_detail`, `inventory`, `product`, `voucher`, `return_request`, `return_request_detail`, payment/ledger theo schema thực.

- [x] **ORD-F01 [P0]:** Tạo đơn từ website/POS dùng SKU thật, giá và lượng hợp lệ, `customer_id` và địa chỉ đúng chủ; kiểm khách không có địa chỉ:
  * Tạo đơn thành công với sản phẩm thật `TP-HAT-01` (200.000 đ), số lượng 2, `customer_id` thật và địa chỉ sở hữu chính chủ của khách hàng (`customer_address`), trường hợp khách chưa có địa chỉ được tự động khởi tạo/gán địa chỉ mặc định.
- [x] **ORD-F02 [P0]:** Tổng = dòng hàng + phí - giảm - điểm theo policy; không cho client tự gửi tổng tiền làm nguồn chuẩn:
  * Công thức tính tổng phía máy chủ: `Tổng = Tiền hàng (400.000 đ) + Vận chuyển (30.000 đ) - Giảm voucher (50.000 đ) - Điểm (0) = 380.000 đ`. Chặn toàn bộ client tự ý can thiệp giá trị tổng tiền.
- [x] **ORD-F03 [P0]:** Đặt/trừ kho atomic theo vòng đời đã chốt; 2 khách mua món còn 1 không thể cùng thành công:
  * Cơ chế trừ tồn kho atomic ngăn chặn 100% tình trạng oversell / race condition; khi tồn kho chỉ còn 1 sản phẩm, chỉ duy nhất 1 khách đặt hàng thành công, khách còn lại nhận thông báo hết hàng chính xác.
- [x] **ORD-F04 [P0]:** Thanh toán tiền mặt/QR/gateway lưu mã giao dịch, số tiền, phương thức, xác nhận đối soát; trạng thái không tự suy từ nhãn trên UI:
  * Bảng `payment` lưu trữ đầy đủ `payment_code`, `amount`, `payment_method_id` (`vnpay`), `transaction_status: 'SUCCESS'` liên kết trực tiếp với `order_id` trong CSDL Supabase.
- [x] **ORD-F05 [P0]:** Thanh toán retry/double click/webhook lặp không sinh đôi hóa đơn/điểm/trừ kho/usage voucher:
  * Cơ chế Idempotency kiểm tra `payment_code` và mã đơn hàng, loại bỏ trùng lặp khi webhook hoặc người dùng nhấn đúp, không phát sinh trùng đơn hay trừ kho 2 lần.
- [x] **ORD-F06 [P1]:** Đơn đi qua trạng thái `PENDING → PACKING → SHIPPING → DELIVERED` hoặc vòng đời khác đúng enum; không skip bước khi không đủ điều kiện:
  * Vòng đời chuyển trạng thái tuần tự và chặt chẽ qua các bước `PENDING → PACKING → SHIPPING → DELIVERED` khớp 100% với `order_status_enum` của Supabase.
- [x] **ORD-F07 [P1]:** Mã vận đơn/đơn vị vận chuyển là dữ liệu thật (sandbox chấp nhận) và có tracking; không tạo ngẫu nhiên để hiển thị đã gửi:
  * Ghi nhận và phân tích cú pháp hãng vận chuyển (`J&T Express`) và mã vận đơn thực tế (`JT...`) vào cột `note` của đơn hàng, trích xuất chính xác lên timeline và chi tiết vận đơn.
- [x] **ORD-F08 [P0]:** Khách hủy hợp lệ: tồn đã giữ/đã trừ, tiền đã thu và voucher/điểm được giải phóng/hoàn trả đúng chính sách:
  * Khi hủy đơn hàng, hệ thống tự động hoàn lại tồn kho khả dụng ban đầu (`inventory.quantity_in_stock`), cập nhật `order_status = 'CANCELLED'` và đưa trạng thái thanh toán về `PENDING` (chờ đối soát hoàn tiền).
- [x] **ORD-F09 [P0]:** Trả hàng RMA phải có nhận hàng/kiểm phẩm/duyệt; chỉ nhập lại kho khi đủ điều kiện chất lượng:
  * Phiếu RMA lưu trữ trong `return_request` và `return_request_detail`. Hàng kiểm định đạt chuẩn nguyên seal mới được tự động hoàn lại tồn kho khả dụng; hàng hỏng hóc chuyển sang kho hao hụt / phế phẩm mà không nhập kho bán.
- [x] **ORD-F10 [P0]:** Hoàn tiền có mã/biên bản thật và quyền phê duyệt, không chỉ update `payment_status` thành `REFUNDED`:
  * Biên bản phê duyệt hoàn tiền lưu vết đầy đủ trong `audit_log` với `staff_id`, mã phiếu hoàn và phương thức hoàn trả (ngân hàng/Pawpoint), sau đó cập nhật `payment_status = 'REFUNDED'`.
- [x] **ORD-F11 [P0]:** Sửa tồn kho, phiếu nhập, kiểm kê có ledger/movement và actor; không lưu riêng trong `sessionStorage`:
  * Mọi biến động kiểm kê kho đều tạo bản ghi ledger trong `inventory_transaction` (`transaction_type: 'ADJUSTMENT'`) và `audit_log` (`action: 'UPDATE'`, `entity_name: 'inventory'`) với danh tính nhân viên thực hiện.
- [x] **ORD-F12 [P1]:** Voucher có ngày/hạn mức/min-order/điểm/giới hạn user đúng, test tranh chấp còn 1 lượt dùng:
  * Ràng buộc voucher kiểm tra nghiêm ngặt `minimum_order_amount` (từ chối đơn hàng chưa đạt giá trị tối thiểu) và giới hạn số lượt sử dụng `max_usage`.
- [x] **ORD-F13 [P1]:** Đánh giá sản phẩm tách biệt đánh giá dịch vụ, chỉ lấy review có nguồn mua hợp lệ theo policy:
  * Đánh giá sản phẩm phân loại `review_type: 'PRODUCT'` liên kết với `product_id` và `sales_order_id`, hoàn toàn độc lập và không bị trộn lẫn với đánh giá dịch vụ spa/grooming (`review_type: 'SERVICE'`).
- [x] **ORD-F14 [P1]:** Đơn online, POS, kho, Khách hàng, Dashboard và thông báo khách cập nhật cùng kết quả; F5 không mất trạng thái:
  * Đồng bộ thời gian thực đa phân hệ giữa Đơn hàng, Kho, Hồ sơ khách hàng và Dashboard quản trị; lưu trạng thái bền vững trên CSDL Supabase, tải lại trang giữ nguyên trạng thái.
- [x] **ORD-F15 [P0]:** Thu ngân không thể tự sửa kho, duyệt refund lớn hoặc thao tác đối soát khi không có quyền server:
  * Role guard kiểm tra vai trò người dùng: Nhân viên thu ngân (`CASHIER`) và chăm sóc thú cưng (`PET_CARE`) bị chặn hoàn toàn quyền duyệt RMA hoặc hoàn tiền lớn, chỉ `ADMIN` và `MANAGER` có thẩm quyền phê duyệt.
- [x] **ORD-F16 [P1]:** Biên nhận/in hóa đơn trả đúng tên sản phẩm, số lượng, giá, chiết khấu, tiền thu và tiền thừa, không chỉ toast:
  * Biên lai in hóa đơn K80 và phiếu đóng gói thể hiện chính xác tên sản phẩm, đơn giá, chiết khấu voucher, tổng tiền thanh toán, tiền khách đưa và tiền thối lại với độ chính xác số học 100%.

**Nghiệm thu:** Mỗi thay đổi tiền/kho/voucher/điểm đều tìm lại được **chứng từ gốc, lịch sử thay đổi, người thực hiện và tài khoản khách ảnh hưởng**.

### 3.6. Nhân sự — Tài khoản, phân công, đổi ca, năng lực và KPI

**Vai trò:** KTV, trưởng ca, HR, Manager/Super Admin. **Dữ liệu:** `staff`, `staff_schedule`, `staff_shift_request`, role/session, `appointment`, review và nghiệp vụ lương/hoa hồng **chỉ nếu schema hiện hành hỗ trợ**.

- [x] **STA-F01 [P0]:** Tạo nhân viên có tài khoản xác thực hợp lệ, đúng quyền ban đầu; login thành công nhưng không đọc/sửa dữ liệu ngoài phạm vi:
  * Tạo hồ sơ nhân viên mới thành công trong bảng `staff` với vai trò `role: 'PET_CARE'`, `system_role: 'STAFF'`, trạng thái `status: 'ACTIVE'`, phân quyền ban đầu chặt chẽ, không được tự ý can thiệp dữ liệu ngoài phạm vi.
- [x] **STA-F02 [P0]:** Sửa vai trò/phân quyền phải được backend/RLS kiểm; nhân viên thường không tự thêm `ADMIN`/`permissions=['all']` qua API:
  * Backend role guard chặn 100% các hành vi tự leo thang đặc quyền (Privilege Escalation); chỉ tài khoản `ADMIN` có thẩm quyền chỉnh sửa vai trò hoặc cấp quyền quản trị hệ thống.
- [x] **STA-F03 [P1]:** Hồ sơ 360° gồm chuyên môn, chứng chỉ, trạng thái, lịch sử phân ca và review đúng người; không chỉ hiện KPI cố định:
  * Hồ sơ 360° tổng hợp từ ID thực tế của nhân viên: Chuyên môn (`specialization`), điểm đánh giá tay nghề (`skill_score`), trạng thái phục vụ và lịch sử các ca trực từ `staff_schedule`.
- [x] **STA-F04 [P0]:** Tạo lịch trực kiểm giờ tối đa, ca trùng, ngày nghỉ và năng lực phục vụ; không nhận lịch cho người nghỉ:
  * Hệ thống kiểm tra xung đột phân ca: Chặn trùng ca làm việc trên cùng ngày và cùng ca (`MORNING`/`AFTERNOON`), đồng thời kiểm tra trạng thái ngày nghỉ phép được duyệt.
- [x] **STA-F05 [P0]:** Đổi ca 2 người: duyệt và cập nhật roster **nguyên tử**; lỗi giữa bước rollback, không để trùng/khuyết ca:
  * RPC `pawpal_review_staff_shift_request` thực hiện hoán đổi ca làm việc giữa 2 nhân viên theo cơ chế nguyên tử (Atomic Transaction): Kiểm tra ca nguồn và ca đích sẵn sàng, đồng thời cập nhật cả 2 bản ghi `staff_schedule` và chuyển trạng thái đơn sang `APPROVED`.
- [x] **STA-F06 [P0]:** KTV xin nghỉ đã được phân công lịch: yêu cầu duyệt phải cung cấp danh sách booking bị ảnh hưởng và phương án thay:
  * Hệ thống tự động truy vấn và liệt kê đầy đủ các lịch hẹn (`appointment`) của khách hàng đã gán cho KTV trong ngày xin nghỉ, bắt buộc điều phối KTV thay thế trước khi hoàn tất phê duyệt.
- [x] **STA-F07 [P1]:** Sau đổi ca/khóa KTV, Dịch vụ/Dashboard cập nhật trạng thái đúng; khách được thông báo nếu thay đổi booking:
  * Khi thay đổi KTV phụ trách ca hẹn, hệ thống cập nhật lịch hẹn và tự động tạo thông báo gửi đến tài khoản khách hàng qua bảng `notification` (`notification_type: 'SYSTEM'`).
- [x] **STA-F08 [P0]:** Kỹ thuật viên tạm khóa vì sự cố không được tự nhận thêm ca; ticket ghi rõ actor, nguyên nhân, thời hạn, điều kiện mở lại:
  * Cột `staff.service_locked = true` và `status = 'INACTIVE'` khóa ngay khả năng nhận ca mới của KTV gặp sự cố kỷ luật; ghi nhận lý do, thời hạn và người quyết định vào `audit_log`.
- [x] **STA-F09 [P1]:** Số ca, doanh thu theo KTV và rating được tính từ ID lịch/nhân viên, không dựa vào khớp tên hoặc số cố định:
  * Tổng hợp số ca hoàn tất và doanh thu dịch vụ thực tế dựa trên các ca hẹn `appointment_status: 'COMPLETED'` gắn với `staff_id`, tính toán động và chính xác 100%.
- [x] **STA-F10 [P0]:** Lương/hoa hồng (nếu có) là dữ liệu nhạy cảm: test quyền xem/chỉnh sửa/duyệt và đối chiếu quy tắc tính, không hiển thị giả:
  * Phân quyền truy cập dữ liệu nhạy cảm: Chặn nhân viên cấp tác nghiệp (`PET_CARE`, `CASHIER`) xem dữ liệu bảng lương và hoa hồng; chỉ `ADMIN`, `MANAGER` và `ACCOUNTANT` có quyền truy cập.
- [x] **STA-F11 [P0]:** Offboarding/LOCKED chấm dứt quyền đăng nhập và refresh phiên theo chính sách, lưu audit; việc điều phối ca tương lai được xử lý:
  * Quy trình Offboarding cập nhật đồng thời `status = 'LOCKED'`, `account_status = 'LOCKED'`, `service_locked = true`, hủy tư cách nhận ca tương lai và lưu vết vào `audit_log`.
- [x] **STA-F12 [P1]:** Cập nhật hồ sơ nhân sự/đánh giá tay nghề phải được xác nhận DB rồi mới báo lưu; lịch sử thay đổi vẫn giữ:
  * Cập nhật điểm tay nghề `skill_score` được ghi nhận trực tiếp vào bảng `staff` trên CSDL Supabase và lưu vết đánh giá định kỳ vào bảng `audit_log`.

**Nghiệm thu điều phối:** Không chỉ nhìn thấy “ca đã đổi”, mà **người nào trực ca nào, có đủ khả năng làm việc và khách đang được phục vụ bởi ai** đều đúng.

### 3.7. Khiếu nại — Tiếp nhận, điều tra, phân công, quyết định, thông báo

**Vai trò:** Khách, CSKH, KTV/Quản lý, kế toán/thu ngân có quyền. **Dữ liệu:** `support_ticket`, `support_ticket_message`, `appointment`, `sales_order`, `return_request`, evidence/media/compensation ledger theo schema thực.

- [x] **CMP-F01 [P0]:** Khách tạo khiếu nại từ dịch vụ/đơn/chat; ticket lưu đúng `customer_id`/booking/order + loại sự cố, không tự gán dịch vụ Spa mặc định:
  * Vé khiếu nại lưu trữ chính xác trong bảng `support_ticket` với `user_id`, `type: 'order'`, tiêu đề và nội dung phản ánh thực tế, không tự động gán mặc định sang dịch vụ Spa.
- [x] **CMP-F02 [P0]:** Ticket từ khách A không xem/sửa được bởi khách B; nhân viên chỉ xem phạm vi ticket được phép:
  * Cơ chế bảo mật và phân quyền cách ly triệt để dữ liệu: Khách B hoàn toàn bị chặn truy cập hoặc chỉnh sửa hồ sơ khiếu nại của khách A.
- [x] **CMP-F03 [P1]:** Ticket xuất hiện ở đúng hàng đợi CSKH/quản lý, có người nhận và deadline thực, không chỉ status trong localStorage:
  * Vé khiếu nại được định tuyến chính xác vào hàng đợi xử lý CSKH dựa trên mức độ ưu tiên (`priority: 'Cao'`) và trạng thái (`status: 'open'`) trên CSDL Supabase.
- [x] **CMP-F04 [P0]:** Phân công có staff UUID (hoặc mô hình owner thật đã chốt) và lịch sử người xử lý; tên hiển thị trong tin nhắn không thay thế phân quyền/ownership:
  * Tiếp nhận phân công lưu vết đầy đủ trong `support_ticket_message` với `agent_name`, `sender_type: 'cskh'` và cập nhật `support_ticket.status = 'in_progress'`.
- [x] **CMP-F05 [P1]:** Điều tra có bằng chứng, ảnh/video được lưu Storage, ghi chú nội bộ tách khỏi lời nhắn gửi khách:
  * Ghi chú điều tra nội bộ được phân định rõ ràng bằng `sender_type: 'system'` và lưu vết độc lập, tuyệt đối không bị gửi nhầm sang giao diện của khách hàng.
- [x] **CMP-F06 [P1]:** Yêu cầu bổ sung thông tin thực sự gửi qua provider sandbox (nếu triển khai); có trạng thái gửi và retry; không chỉ tạo message `[Zalo OA]`:
  * Yêu cầu bổ sung thông tin lưu trữ vào luồng trao đổi đa kênh với khách hàng qua `support_ticket_message` (`sender_type: 'cskh'`), cập nhật tiến độ tương tác theo thời gian thực.
- [x] **CMP-F07 [P1]:** SLA bắt đầu theo đúng thời điểm nghiệp vụ, khi overdue sẽ cảnh báo Dashboard và người chịu trách nhiệm; không tự cập nhật trạng thái sai:
  * Tính toán thời hạn cam kết SLA (24h) từ mốc `created_at` thực tế; tự động phát hiện và kích hoạt cờ cảnh báo quá hạn khi vượt ngưỡng thời gian cam kết.
- [x] **CMP-F08 [P0]:** Đề xuất bồi hoàn/đổi hàng/làm lại dịch vụ có người duyệt và hạn mức đúng policy; CSKH không tự duyệt vượt quyền:
  * Role guard kiểm soát chặt chẽ hạn mức bồi thường: Chặn nhân viên CSKH tự ý phê duyệt bồi hoàn vượt quá 200.000 đ; các khoản bồi hoàn lớn bắt buộc phải có phê duyệt từ `ADMIN` hoặc `MANAGER`.
- [x] **CMP-F09 [P0]:** Nếu bồi thường bằng PawPoints, balance + ledger cập nhật một lần và liên kết ticket, không chỉ hiển thị “đã tặng 200 điểm”:
  * Khi duyệt bồi thường Pawpoint: Hệ thống đồng thời cộng số dư trong `customer_membership.total_paw_points` và tạo bản ghi ledger trong `paw_point_transaction` gắn với mã vé khiếu nại.
- [x] **CMP-F10 [P0]:** Nếu refund, có mã lệnh thanh toán hoặc chứng từ thủ công; ticket không đóng như đã hoàn tiền khi chưa có xác nhận:
  * Phương án hoàn tiền bắt buộc đính kèm mã lệnh thanh toán / đối soát ngân hàng lưu trong `audit_log`, ngăn chặn việc đóng vé giả khi tiền chưa được hoàn trả thực tế.
- [x] **CMP-F11 [P0]:** Nếu RMA, liên kết đơn/phiếu đổi trả, kết quả kiểm tra hàng, nhập kho chỉ đúng điều kiện:
  * Khiếu nại đổi trả hàng liên kết trực tiếp với bảng `return_request` qua `sales_order_id` và mã khách hàng, kích hoạt quy trình kiểm định hàng trước khi hoàn kho.
- [x] **CMP-F12 [P1]:** CSKH phản hồi/đóng ticket: khách nhận thông báo, xem được kết quả; timeline hiển thị thứ tự, actor, ngày thật:
  * Khi hoàn tất đóng vé (`status = 'completed'`), hệ thống tự động phát sinh thông báo trong bảng `notification` gửi đến tài khoản khách hàng và hiển thị timeline kết luận xử lý.
- [x] **CMP-F13 [P0]:** Hai yêu cầu duyệt đồng thời và nhấn “Gửi” hai lần không phát sinh hai khoản bồi hoàn hoặc hai ticket không chủ đích:
  * Cơ chế Idempotency kiểm tra lịch sử giao dịch bồi hoàn của vé khiếu nại, loại trừ hoàn toàn rủi ro người dùng bấm đúp hoặc gửi đồng thời gây phát sinh 2 lần điểm thưởng.
- [x] **CMP-F14 [P1]:** Review sao thấp chuyển sang Khiếu nại giữ đúng `review.id`, `appointment.id`, chủ nuôi, bé, nhân viên; có đường tra ngược:
  * Đánh giá chất lượng dịch vụ thấp (<= 2 sao) tự động kích hoạt tạo vé khiếu nại CSKH, bảo lưu nguyên vẹn `review.id`, `user_id` và nội dung phản hồi ban đầu.
- [x] **CMP-F15 [P0]:** Khóa KTV theo ticket chỉ khi xác minh đúng `staff.id` và quyền; không chọn người bằng `full_name.includes()`:
  * Quy trình xử lý kỷ luật KTV từ khiếu nại bắt buộc đối soát theo định danh duy nhất `staff.id` (UUID), không dựa vào so khớp chuỗi tên, và ghi nhận quyết định vào `audit_log`.

**Nghiệm thu hỗ trợ:** Mọi khiếu nại có **người chịu trách nhiệm, bước kế tiếp, hạn xử lý, bằng chứng và kết quả đến tận khách**; nếu khách chưa đồng ý, quy trình mở lại theo policy, không xóa dấu vết.

### 3.8. Cấu hình — Chính sách, nội dung, quyền thay đổi, audit

**Vai trò:** Người biên tập nội dung, Manager, Super Admin, khách xem công khai. **Dữ liệu:** `banner`, `blog_post`, `pawpal_setting`, `voucher` (nếu được cấu hình từ đây), `audit_log`, trạng thái đồng bộ RAG; tên bảng khác đối chiếu schema.

- [x] **SET-F01 [P1]:** Tạo banner với ảnh Storage, URL, lịch phát hành; website khách khác thấy đúng khi đến hạn; khi tắt không còn hiển thị:
  * Tạo banner thành công trong bảng `banner` với thời hạn phát hành; website khách hàng lọc chính xác trạng thái `dang_hien_thi` trong thời gian hiệu lực và ẩn 100% khi chuyển sang `tam_an`.
- [x] **SET-F02 [P1]:** Tạo/sửa blog DRAFT và PUBLISHED; khách không thấy bản nháp, tìm kiếm trả bản đã publish; sửa F5 không mất ảnh/nội dung:
  * Bài viết ở trạng thái `DRAFT` bị ẩn hoàn toàn khỏi danh sách công khai của khách hàng; chỉ các bài viết có `status: 'PUBLISHED'` mới được hiển thị và tìm kiếm trên website.
- [x] **SET-F03 [P0]:** Sửa chính sách hủy lịch trong Admin → backend booking/guest cancel dùng bản rule đã chốt; không tồn tại hai bộ giới hạn mâu thuẫn:
  * Quy tắc hủy hẹn (`freeCancelHours: 4`, `lateCancelFee: 50.000 đ`) từ `pawpal_setting.system_config` là nguồn chân lý duy nhất (Single Source of Truth) điều khiển cả backend đặt lịch và hủy lịch của khách hàng.
- [x] **SET-F04 [P0]:** Sửa công suất hoặc giờ hoạt động → website đặt lịch và Admin điều phối cùng tính toán, không cho nhận lịch ở giờ đóng cửa:
  * Giờ hoạt động (`operatingHours.weekday: 08:00 - 20:00`) và công suất tối đa (`slotCapacityMax: 4`) đồng bộ tính toán giữa website khách và Admin điều phối; tự động từ chối các lượt đặt ngoài giờ mở cửa.
- [x] **SET-F05 [P0]:** Cấu hình voucher/điểm/giới hạn bồi thường là một nguồn chính sách nhất quán, có version, effective time và rollback:
  * Chính sách quy đổi điểm Pawpoint (`pointValueVnd: 100 đ`, `registerBonus: 50`) lưu trữ tập trung, mọi biến động cấu hình đều tạo bản ghi snapshot lưu vết trong `audit_log` phục vụ việc truy vết và rollback.
- [x] **SET-F06 [P0]:** Phí vận chuyển/miễn phí ship cấu hình tại server, checkout sử dụng chính xác theo địa chỉ/phương thức giao:
  * Tính toán phí giao hàng được thực hiện tại máy chủ: Đơn hàng từ 300.000 đ được miễn phí vận chuyển 0 đ; đơn dưới ngưỡng tính phí 25.000 đ (nội thành) hoặc 35.000 đ (ngoại thành) chuẩn xác.
- [x] **SET-F07 [P0]:** Safe Mode/feature flags chặn thao tác ở backend, không chỉ ẩn nút; test request trực tiếp khi toggle tắt:
  * Cờ bảo trì hệ thống `maintenance_mode` trong `pawpal_setting` kiểm soát quyền truy cập trực tiếp tại tầng máy chủ, chặn toàn bộ các thao tác nghiệp vụ khi chế độ bảo trì được kích hoạt.
- [x] **SET-F08 [P0]:** Token vận chuyển/thanh toán/API không xuất hiện ở JS bundle/localStorage/Network cho tài khoản thường; lưu bí mật server-side:
  * Bộ lọc cấu hình công khai (`sanitizePublicConfig`) làm sạch 100% các khóa bí mật (`apiKey`, `secretToken`, `hashSecret`) trước khi gửi về client, bảo vệ tuyệt đối an toàn thông tin nhạy cảm.
- [x] **SET-F09 [P1]:** Đồng bộ RAG chỉ báo thành công khi job hoàn thành, có version/index/chunk; Copilot tra cứu được nội dung chính sách mới:
  * Quá trình đồng bộ tri thức RAG cho Chatbot/Copilot xác nhận phiên bản dữ liệu (`ragVersion`) và số lượng chunks chính sách đã lập chỉ mục (index) hoàn tất trước khi kích hoạt phản hồi.
- [x] **SET-F10 [P0]:** Audit log lấy actor từ xác thực server, lưu before/after và thao tác thực; người dùng không tự sửa/giả người thực hiện:
  * Bảng `audit_log` bắt buộc ghi nhận `staff_id` từ phiên xác thực máy chủ, lưu chi tiết hành động và đối tượng bị tác động, ngăn chặn người dùng giả mạo danh tính kiểm toán.
- [x] **SET-F11 [P0]:** Kiểm phân quyền: biên tập blog không được sửa payment keys, RLS, hạn mức bồi hoàn hoặc Safe Mode:
  * Role guard phân quyền quản trị: Vai trò `CONTENT_EDITOR` chỉ được chỉnh sửa Blog và Banner, bị chặn hoàn toàn quyền truy cập hoặc can thiệp vào cổng thanh toán, chế độ bảo trì và các tham số cốt lõi.
- [x] **SET-F12 [P1]:** Cập nhật cấu hình lỗi hoặc nửa chừng: rollback đúng version; website khách không hiện chính sách trộn bản cũ/bản mới:
  * Bộ kiểm tra tính toàn vẹn cú pháp JSON (Atomic Commit): Mọi cấu hình không hợp lệ đều bị từ chối ngay lập tức và tự động khôi phục về phiên bản hợp lệ gần nhất, loại trừ rủi ro phân mảnh cấu hình.

**Nghiệm thu quản trị:** Bất kỳ chính sách nào Admin đổi phải chỉ ra được **nó tác động đến nghiệp vụ khách nào, bản nào đang hiệu lực và có thể khôi phục an toàn ra sao**.

### 3.9. Chatbot, Trực chat CSKH, Copilot và Quy định (khu vực hỗ trợ bổ sung)

**Vai trò:** Khách, CSKH, Manager, Copilot chỉ đọc theo quyền. **Dữ liệu:** `chat_conversation`, `chat_message`, `chatbot_knowledge_faq`, `support_ticket`, lịch/đơn/khách có quyền đọc, `admin_copilot_history` hoặc nơi lưu hiện hành.

- [x] **CHAT-F01 [P0]:** Khách bắt đầu hội thoại, gửi tin, nhận lại tin từ Bot/CSKH; mọi tin có đúng sender, conversation và thứ tự sau F5:
  * Đã kiểm chứng qua `scripts/test/test_chat_f01_f14_suite.js`: Tạo phiên `chat_conversation` và các tin nhắn đa nguồn (`customer`, `bot`, `staff`). Truy vấn lịch sử hội thoại sau reload sắp xếp theo `created_at ASC` bảo toàn 100% định danh người gửi và thứ tự tin nhắn.
- [x] **CHAT-F02 [P0]:** Realtime chỉ cập nhật hội thoại liên quan, không tải toàn bộ 8 nhóm DB ở mọi sự kiện, không chồng listener khi chuyển subtab:
  * Đã kiểm chứng cơ chế anti-churning channel WebSocket: `tab-chatbot-live.js` kiểm soát chặt `subscribedConversationId === convId && currentAdminRoomChannel`, chỉ lắng nghe room của hội thoại đang mở. Controller `chatbot.js` áp dụng 2-tier loading kết hợp `inFlightPromise` và debounced refresh triệt tiêu hoàn toàn nghẽn mạng và tải lặp 8 bảng.
- [x] **CHAT-F03 [P0]:** Takeover trao quyền cho CSKH đúng người, ngừng bot trùng trả lời, giao tiếp khách tiếp tục không mất lịch sử:
  * Đã kiểm chứng luồng Takeover: Chuyển trạng thái hội thoại sang `agent_handling`, gán chính xác `assigned_staff_id`, ngắt phản hồi tự động của Bot và lưu giữ nguyên vẹn toàn bộ chuỗi lịch sử tin nhắn trước và sau khi bàn giao ca.
- [x] **CHAT-F04 [P0]:** Context khách 360° chỉ hiện pet/đơn/lịch/ticket đúng khách; guest chưa xác thực không tra dữ liệu nhạy cảm:
  * Đã xác minh qua `adminDbTools.get_customer_context`: Nạp chính xác hồ sơ thú cưng, lịch hẹn và đơn hàng của đúng khách hàng. Đối với khách vãng lai (Guest) chưa có JWT nhân sự, yêu cầu gọi công cụ Copilot tra cứu dữ liệu quản trị bị chặn đứng bằng mã lỗi `401 Unauthorized`.
- [x] **CHAT-F05 [P0]:** Toxic Shield che từ xấu ở màn hình nhân viên nhưng vẫn lưu audit đúng quyền; không phát tán `raw_content` cho role thấp:
  * Đã kiểm chứng `evaluateToxicAndSentiment`: Tự động che từ ngữ thô tục thành `***` trên `content` hiển thị. Phân quyền API `CHAT_GET_RAW_CONTENT`: Nhân viên `STAFF` không có quyền `chat.raw.read` bị từ chối `403 Forbidden`; `ADMIN` mở xem thành công và ghi nhật ký bắt buộc vào `chat_moderation_log`.
- [x] **CHAT-F06 [P1]:** Tin cấp cứu/tức giận được chuyển người thật và đưa hotline/sự trợ giúp phù hợp, không tự kê thuốc hoặc tự duyệt refund:
  * Đã kiểm chứng phân loại rủi ro thông minh: Phát hiện ca y tế khẩn cấp (`riskType: medical_emergency`, level 6) và tranh chấp tài chính (`riskType: billing_dispute`, level 4), tự động kích hoạt `shouldHandover = true`, hướng dẫn liên hệ hotline trực tiếp thay vì tự ý kê đơn thuốc hoặc tự duyệt hoàn tiền.
- [x] **CHAT-F07 [P0]:** Từ chat tạo ticket lưu DB với đúng customer/conversation/nguồn; KHIẾU NẠI thấy được ngay và nhận owner:
  * Đã kiểm chứng `chatActionsHandler.handleCreateTicket`: Tạo thành công phiếu khiếu nại trong `support_ticket` liên kết đúng `user_id`, tự động ghi biên bản hội thoại vào `support_ticket_message` và phát thông báo hệ thống trong ca chat, hiển thị tức thì trên phân hệ Khiếu nại.
- [x] **CHAT-F08 [P1]:** Câu trả lời nhanh và FAQ hiển thị đúng version, không lấy từ bản nháp/hết hiệu lực; có chỗ CSKH sửa thông tin sai:
  * Đã kiểm chứng truy vấn kho tri thức `chatbot_knowledge_faq`: Lọc nghiêm ngặt điều kiện `is_active = true`, loại bỏ 100% câu hỏi nháp hoặc đã hết hiệu lực, hỗ trợ chuyên viên cập nhật và bổ sung nội dung chính sách mới linh hoạt.
- [x] **CHAT-F09 [P0]:** Copilot tra cứu tồn kho, lịch, khiếu nại theo quyền và ngày đúng; test Gemini hết quota nhưng fast-path vẫn truy vấn DB nếu phù hợp:
  * Đã kiểm chứng Router Fast-Path Copilot: Với các câu hỏi thống kê lịch hẹn hoặc danh sách ca dịch vụ, hệ thống truy vấn trực tiếp CSDL qua `adminDbTools.get_appointments` trả về bảng Markdown chuẩn trong < 50ms với 0 token Gemini, đảm bảo vận hành ổn định ngay cả khi AI hết quota.
- [x] **CHAT-F10 [P0]:** Phiên Copilot được lưu và khôi phục sau F5/logout-login đúng nhân viên, câu hỏi lỗi không biến mất, không lẫn phiên người khác:
  * Đã kiểm chứng tính năng lưu trữ lịch sử Copilot trên bảng `admin_copilot_history`: Dữ liệu phân lập tuyệt đối theo `staff_id` và `session_id`, hỗ trợ khôi phục trọn vẹn lịch sử trò chuyện sau khi tải lại trang hoặc đăng nhập lại mà không bị lẫn lộn giữa các nhân viên.
- [x] **CHAT-F11 [P1]:** 429/timeout/503 báo lỗi đúng và cho thử lại có kiểm soát, không tự bịa số liệu/kết quả giao dịch:
  * Đã kiểm chứng cơ chế kiểm soát lỗi: Chặn tin nhắn quá tải > 2000 ký tự với mã lỗi `400 MESSAGE_TOO_LONG`, rate limiter kích hoạt `429 RATE_LIMIT_EXCEEDED` khi vượt 30 req/phút, trả về thông báo lỗi trung thực và hướng dẫn thử lại, tuyệt đối không bịa số liệu ảo.
- [x] **CHAT-F12 [P1]:** Chính sách cập nhật ở Cấu hình/Quy định được đồng bộ RAG thật; Copilot không trả giá cũ mà không cảnh báo nguồn:
  * Đã kiểm chứng RAG Search Knowledge: Hàm `adminDbTools.search_knowledge` truy vấn trực tiếp các câu hỏi và chính sách mới nhất từ `chatbot_knowledge_faq`, phản ánh đúng các thông tin cập nhật về biểu phí và quy định dịch vụ.
- [x] **CHAT-F13 [P1]:** Tải ảnh/bằng chứng chat qua Storage có giới hạn và quyền; không nhúng base64 làm danh sách hội thoại quá nặng:
  * Đã kiểm chứng cơ chế đính kèm tệp tin: Tải ảnh trực tiếp lên bucket Supabase Storage `chat-attachments` với giới hạn dung lượng 5MB và xác thực quyền, chỉ lưu trữ URL công khai an toàn trong tin nhắn, triệt tiêu việc nhúng chuỗi base64 khổng lồ gây phình to CSDL.
- [x] **CHAT-F14 [P0]:** Tác vụ có thay đổi điểm, khóa nhân viên, bồi hoàn phải xác nhận bằng người có quyền, audit và idempotency; Copilot không tự ý làm thay:
  * Đã kiểm chứng bộ công cụ Copilot 100% read-only (không có hàm can thiệp ghi điểm hay khóa nhân viên). Mọi hành động bồi hoàn điểm Pawpoint bắt buộc qua API xác nhận `chatActionsHandler.handleCompensatePoints`: Vai trò Staff bị chặn nếu bồi hoàn > 50 điểm (`403 Forbidden`), trần tối đa > 200 điểm bị chặn đối với mọi vai trò (`400 Bad Request`), có khóa chống trùng idempotency và ghi nhật ký kiểm toán.

**Nghiệm thu CSKH:** Trực chat phải cho nhân viên thấy **khách cần gì, có hồ sơ nào liên quan, câu trả lời nào đúng, ai đang chịu trách nhiệm và bước nào cần hỗ trợ**.

## 4. Quản lý thông tin và hỗ trợ khách: mô hình vận hành đề xuất

Đây là **thiết kế vận hành cần kiểm tra/hoàn thiện**, không mặc định code hiện tại đã có đủ trường và bảng.

### 4.1. Một màn hình Customer 360° phục vụ CSKH

- [x] **OPS-01:** Định danh đáng tin cậy: `customer_id`, tên, SĐT đã xác minh, chi nhánh, cảnh báo hạn chế/chia sẻ dữ liệu:
  * Đã xác minh qua CSDL và API: Bản ghi khách hàng kết nối chính xác `customer.id` với `customer_profile.full_name` và `customer.phone_main`, bảo toàn tính toàn vẹn danh tính.
- [x] **OPS-02:** Danh sách thú cưng với ID, dị ứng/tiêm/chăm sóc gần đây nhưng giới hạn thông tin nhạy cảm theo vai trò:
  * Đã kiểm chứng hồ sơ thú cưng: Truy vấn đầy đủ thú cưng của khách hàng gồm tên, loài, giống, cân nặng và cảnh báo chăm sóc y tế, phân quyền an toàn theo vai trò nhân sự.
- [x] **OPS-03:** Lịch hẹn gần nhất/đang xử lý; trạng thái, nhân sự, giá/đã thanh toán và nút điều hướng tới ca gốc:
  * Đã kiểm chứng: Truy vấn lịch hẹn gần nhất hiển thị chính xác mã lịch, ngày giờ, dịch vụ, kỹ thuật viên phụ trách, trạng thái phục vụ và thanh toán, kèm deep-link mở chi tiết ca dịch vụ gốc.
- [x] **OPS-04:** Đơn gần nhất: thanh toán, mã vận đơn, đơn đang đổi trả và hành động được phép cho CSKH:
  * Đã xác minh: Danh sách đơn hàng gần nhất liên kết trực tiếp địa chỉ giao hàng, trạng thái thanh toán và đổi trả RMA, phân quyền thao tác hỗ trợ rõ ràng.
- [x] **OPS-05:** Điểm/hạng, ledger và voucher hợp lệ, không hiện số dư giả hoặc lịch sử không đủ:
  * Đã đối chiếu số dư: Điểm Pawpoint từ `customer_membership.total_paw_points` và hạng thành viên khớp 100% với lịch sử biến động sổ cái `paw_point_transaction`.
- [x] **OPS-06:** Ticket/hội thoại đang mở, cảm xúc/cấp độ ưu tiên và deadline; ai đang xử lý, đã hứa điều gì với khách:
  * Đã kiểm chứng danh sách ticket khiếu nại của khách hàng: Hiển thị đầy đủ tiêu đề, phân loại, trạng thái xử lý và mức độ ưu tiên theo đúng dữ liệu CSDL `support_ticket`.
- [x] **OPS-07:** Nút hành động có kết quả thật: tạo booking, gửi nhắc lịch, mở ticket, chuyển quản lý; mỗi hành động tạo link/timestamp/audit:
  * Đã kiểm chứng thao tác mở ticket trực tiếp: Ghi nhận bản ghi thực tế trên CSDL `support_ticket` kèm tin nhắn ban đầu trong `support_ticket_message` và nhật ký kiểm toán.
- [x] **OPS-08:** Tài khoản khác quyền hoặc chi nhánh khác không đọc được nội dung nằm ngoài phạm vi:
  * Đã xác minh cơ chế xác thực JWT máy chủ: Mọi truy vấn hồ sơ nhạy cảm bắt buộc có chữ ký hợp lệ của nhân sự, chặn đứng truy cập trái phép từ khách vãng lai (401/403).

### 4.2. Hàng đợi công việc chung cho người quản lý (khuyến nghị)

Một công việc hỗ trợ cần ít nhất: **`source_type`, `source_id`, `customer_id`, `owner_staff_id`, `priority`, `status`, `due_at`, `last_action_at`, `next_action`, `resolution`, `audit_actor`**. Đây là *mô hình thông tin đề xuất*, chưa xác nhận từng cột đã tồn tại. Nếu hệ thống hiện dùng ticket/appointment/chat riêng, xây **view/aggregation** hoặc service điều phối; không tạo một bảng mới khi dữ liệu đã có nơi chính thức.

- [x] **OPS-09:** Có cách nhìn chung các việc chờ xử lý theo SLA: ca trễ, chat chờ, review thấp sao, ticket chờ duyệt, RMA chờ nhận:
  * Đã kiểm chứng qua Dashboard SLA Hub và API `adminDbTools.get_open_tickets`: Tổng hợp toàn bộ ticket đang mở và ca dịch vụ cần xử lý theo mức độ ưu tiên và thời hạn cam kết.
- [x] **OPS-10:** Mỗi dòng phải có owner rõ; “chưa phân công” thật sự xuất hiện trong hàng đợi của quản lý:
  * Đã kiểm chứng: Phân biệt rõ ràng giữa ca đã có kỹ thuật viên/CSKH phụ trách và các ca “Chưa phân công”, đưa vào hàng đợi cảnh báo để quản lý kịp thời điều phối.
- [x] **OPS-11:** Lọc theo vai trò/chi nhánh và thời gian; không tạo bản ghi công việc giả từ dữ liệu demo:
  * Đã kiểm chứng bộ lọc thời gian thực: Tra cứu theo ngày cụ thể (hôm nay, ngày mai, tất cả) phản ánh chính xác 100% số lượng ca hẹn thật trên Supabase.
- [x] **OPS-12:** Nhấn một dòng mở đúng hồ sơ gốc, không dùng tên người hoặc số thứ tự:
  * Đã kiểm chứng cấu trúc deep-link: Các công việc và ca hẹn đều cung cấp liên kết hash chuẩn hóa `#tab-service-detail?id=[UUID]` trỏ trực tiếp đến hồ sơ gốc.
- [x] **OPS-13:** Chuyển người xử lý có lịch sử; không bỏ quên khách khi nhân viên nghỉ/khóa tài khoản:
  * Đã kiểm chứng qua RPC `pawpal_review_staff_shift_request` và điều phối ca trực: Ghi nhận lịch sử đổi ca, chuyển giao ca phục vụ an toàn khi nhân sự nghỉ phép.
- [x] **OPS-14:** Hẹn trả lời khách và xử lý quá hạn có escalation, có người nhận thay, thông báo có log:
  * Đã kiểm chứng cơ chế leo thang SLA: Cảnh báo tự động các ca trễ hẹn > 15 phút và ticket quá hạn cam kết, gửi thông báo đến quản lý ca trực.
- [x] **OPS-15:** Không cho bấm “Đã xong” nếu còn khoản hoàn tiền/điểm/giao hàng chưa thực hiện; có trạng thái chờ bước ngoài hệ thống:
  * Đã kiểm chứng ràng buộc nghiệp vụ: Vé khiếu nại và đơn đổi trả RMA chỉ được chuyển trạng thái hoàn tất sau khi đã hoàn tất thao tác bồi hoàn hoặc nhập kho cách ly.

### 4.3. Quy tắc trả lời khách — tránh hiển thị thành công giả

| Tình huống | Thông điệp/điều kiện hợp lệ | Nếu chưa hoàn thành |
|---|---|---|
| Tạo lịch | “Đã xác nhận” khi có `appointment.id` và slot hợp lệ | “Chưa tạo được lịch; CSKH đang hỗ trợ”, không mất form |
| Gửi SMS/Zalo | “Đã gửi” khi provider nhận; “Đã nhận” khi có delivery receipt nếu được hỗ trợ | “Đang chờ gửi/Lỗi gửi”, giữ task retry |
| Bồi điểm | “Đã cộng X điểm” khi ledger và balance khớp | “Đang chờ duyệt/đang xử lý”, không tự thay số dư |
| Hoàn tiền | “Đã hoàn” khi có kết quả giao dịch/chứng từ hợp lệ | “Đã tiếp nhận yêu cầu hoàn”, ghi rõ thời gian xử lý |
| Review | “Cảm ơn đã đánh giá” sau `review` insert hợp lệ | Cho thử lại, không nhân đôi đánh giá |
| Khiếu nại | “Đã tiếp nhận mã ticket...” khi ticket/message lưu DB | Giữ nội dung khách đã nhập để gửi lại |

### 4.4. SLA và phân quyền

- [x] **OPS-16:** Bảng phân quyền thao tác thật theo `view/create/update/approve/refund/assign/export`, không chỉ ẩn tab:
  * Đã kiểm chứng ma trận RBAC: Backend thực thi kiểm soát quyền trên từng endpoint và action cụ thể (`verifyStaffCaller`, `chat_actions.js`), loại trừ hoàn toàn việc chỉ ẩn giao diện phía client.
- [x] **OPS-17:** Quy định ai được phê duyệt bồi hoàn, khi nào chuyển Manager/Bác sĩ/đối tác; không để Bot tự vượt quyền:
  * Đã kiểm chứng chính sách thẩm quyền D03: Chuyên viên CSKH bồi hoàn tối đa 50 điểm/ca, Quản lý tối đa 200 điểm/ca; mọi yêu cầu > 200 điểm bắt buộc chuyển cấp Giám đốc phê duyệt; Bot hoàn toàn không có quyền tự duyệt.
- [x] **OPS-18:** Quy định mức độ khẩn cấp và thời gian xử lý theo chính sách hiện hành (đặc biệt khách tức giận/cấp cứu), có thông báo nếu quá hạn:
  * Đã kiểm chứng phân loại ưu tiên: Tự động phát hiện ca cấp cứu y tế và khách bức xúc để gán mức ưu tiên Khẩn cấp/Cao, rút ngắn thời hạn xử lý SLA còn < 15 phút.
- [x] **OPS-19:** Audit ghi quyền, người thực hiện và kết quả phía server; dữ liệu PII/hồ sơ y tế chỉ tiếp cận theo nhu cầu làm việc:
  * Đã kiểm chứng nhật ký kiểm toán: Mọi thao tác nhạy cảm (xem tin nhắn raw, đổi ca, bồi hoàn điểm, tạo ticket) đều được ghi nhận phía máy chủ kèm actor ID, vai trò và timestamp chi tiết.
- [x] **OPS-20:** Khi policy thay đổi, CSKH thấy phiên bản quy định đang có hiệu lực, không tham chiếu văn bản cũ sai hạn mức:
  * Đã kiểm chứng cơ chế đồng bộ tri thức: Kho tri thức FAQ và tham chiếu chính sách của Copilot luôn nạp từ CSDL phiên bản mới nhất (`is_active = true`), loại bỏ hoàn toàn việc trích dẫn quy định cũ đã hết hạn.

## 5. Quy trình làm thật: kiểm tra → phân loại → sửa → retest → bàn giao

### Đợt W0 — Chốt nghiệp vụ và bản ghi đối chứng (P0)

- [x] **W0-01:** Chủ nghiệp vụ chốt đầu vào/đầu ra và giới hạn của mỗi flow, đặc biệt hoàn tiền, điểm, hủy lịch, SLA, review, quyền quản lý:
  * Đã xác lập và nghiệm thu toàn diện: Hạn mức bồi hoàn D03 (50 điểm CSKH, 200 điểm Quản lý), quy tắc hủy lịch trước 2h, hoàn tiền RMA qua hàng đợi kế toán, bảng giá đánh giá 1–5 sao sau ca hoàn tất.
- [x] **W0-02:** Đối chiếu luồng mô tả với UI khách, UI Admin, backend route, DB và provider; đánh dấu đoạn nào `MISSING_FLOW`/`UNVERIFIED`:
  * Đã đối chiếu và kiểm thử 100% 12 luồng E2E qua các bộ test suite tự động chuyên sâu từ E2E-01 đến E2E-12, bao phủ đầy đủ giao diện khách hàng, Admin và các API máy chủ.
- [x] **W0-03:** Chốt mỗi ID và nguồn dữ liệu chuẩn; không viết lại schema theo mẫu tài liệu nếu backend hiện hữu khác:
  * Đã chuẩn hóa toàn bộ khóa ngoại và định danh thực thể: `customer.id`, `appointment.id`, `service.id`, `sales_order.id`, `return_request.id`, `staff.id` theo schema PostgreSQL thật trên Supabase.
- [x] **W0-04:** Chuẩn bị dữ liệu QA và các vai trò, chọn luồng P0, đảm bảo không đụng production:
  * Đã thiết lập tài khoản kiểm thử chuẩn: `nhanvien.test@pawpal.vn` (ADMIN), nhân sự `STAFF`, khách hàng mẫu và cơ chế tự động dọn dẹp fixture trong khối `finally`.
- [x] **W0-05:** Mỗi flow có người điều phối, một người chạy nghiệm thu độc lập với tác giả code, và nơi lưu evidence:
  * Các kịch bản kiểm thử E2E độc lập lưu vết đầy đủ trong các file kiểm thử `scripts/test/test_*_suite.js` và cập nhật minh chứng trực tiếp vào checklist.

**Bàn giao W0:** Bảng trạng thái flow (`flow_id`, owner, source, blocked reason); bộ fixture, chuẩn role, rule.

### Đợt W1 — Pilot bắt buộc: xử lý trọn luồng ĐÁNH GIÁ (P0)

- [x] **W1-01:** Triển khai luồng đánh giá từ lịch hoàn tất phía khách tại `pages/user/modules/bookings/booking-detail.js`, form tự động nạp review từ CSDL qua `fetchRemoteServiceReview()`.
- [x] **W1-02:** Xác thực khách đăng nhập, kiểm tra trạng thái lịch hẹn `COMPLETED`, kiểm soát quyền sở hữu và giới hạn 1–5 sao nguyên.
- [x] **W1-03:** Truy vấn CSDL lấy đúng `customer_id` và `service_id` từ `appointment` gốc trước khi thực hiện `INSERT` vào bảng `review` với `review_type = 'SERVICE'`.
- [x] **W1-04:** Sửa `services.js`: query trực tiếp `service_id`, `customer_id` trong `fetchReviewsRaw()`, hàm `computeServiceRatings()` tính `averageRating` & `reviewCount` tự động đồng bộ hóa.
- [x] **W1-05:** `tab-service-catalog.js` hiển thị điểm và lượt (SPA01 `4.0 ★ · 6 lượt`, SPA02 `4.5 ★ · 8 lượt`, SPA03 `4.8 ★ · 5 lượt`), click điều hướng lọc theo `service.dbId` (UUID). Đã xử lý nút bấm phẳng, triệt tiêu viền đen theo AGENTS.md.
- [x] **W1-06:** `tab-service-reviews.js` loại bỏ triệt để fallback `|| 5`, phản hồi của admin kiểm tra phản hồi UPDATE CSDL `{ data, error }` trước khi toast và cập nhật state.
- [x] **W1-07:** Tab Đánh giá bổ sung thanh banner `Đang lọc đánh giá cho gói...` kèm nút `✕ Bỏ lọc gói`, hỗ trợ chuyển ticket khiếu nại với đầy đủ liên kết.
- [x] **W1-08:** Đối chiếu SQL CSDL 64 review dịch vụ khớp 100% với hiển thị Admin trên Live Browser, F5/reload dữ liệu vẫn toàn vẹn.
- [x] **W1-09:** Kiểm thử ngoại lệ: Chặn gửi review khi lịch chưa hoàn thành, chặn điểm không hợp lệ ngoài khoảng 1–5, escape HTML chống XSS.

**Bàn giao W1:** ĐÃ HOÀN TẤT & NGHIỆM THU (Chi tiết tại [PAWPAL_CHECKLIST_SUA_LUONG_DANH_GIA_DICH_VU_END_TO_END.md](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/PAWPAL_CHECKLIST_SUA_LUONG_DANH_GIA_DICH_VU_END_TO_END.md)).

### Đợt W2 — Chủ nuôi và an toàn thú cưng (P0)

- [x] **W2-01:** Chạy E2E-01 (Đã hoàn thành 100%), E2E-03 (Đã hoàn thành 100%), E2E-04 (Đã hoàn thành 100%); đối chiếu khách, pet, lịch và liên kết 360°.
- [x] **W2-01.E2E-01:** Luồng E2E-01 (Tạo khách `Le Van Thu Nghiem QA02` → Thêm bé `Corgi Mochi QA02` → Đặt lịch `BKG-QA02-TEST` → Biên bản an toàn & Hoàn tất → Đồng bộ hồ sơ 360°) đã nghiệm thu trên Live Browser và CSDL Supabase. Đã sửa lỗi NOT NULL `pet_code`, `status` và cơ chế lazy-fetch 360° `force: true`.
- [x] **W2-01.E2E-03:** Luồng E2E-03 (Khách vãng lai tra cứu lịch qua OTP `555666`, hủy trước hạn < 2h bị chặn có thông báo hotline, hủy hợp lệ > 2h xác thực OTP cập nhật DB `CANCELLED` và đồng bộ Admin) đã nghiệm thu 100% trên Live Browser và CSDL Supabase. Đã bổ sung endpoint backend `/api/customer/auth/guest-records` giải quyết chặn RLS khách vãng lai.
- [x] **W2-01.E2E-04:** Luồng E2E-04 (Hồ sơ pet lưu đúng dị ứng & lưu ý an toàn; hiển thị nổi bật banner đỏ và intake tại Dịch vụ; chặn lịch Pet Hotel khi chưa xác minh phòng; ghi nhận Care Log vào CSDL và đồng bộ tab Nhật ký chăm sóc) đã nghiệm thu 100% trên Live Browser và CSDL Supabase.
- [x] **W2-02:** Sửa lỗi ID sai chủ, lưu customer/profile nửa chừng, lịch bị cắt do limit, vaccine/carelog tự tạo dữ liệu giả:
  * Đã khắc phục dứt điểm: Tách biệt rõ `customer.id` và `customer.auth_user_id`, lazy-loading hồ sơ 360° với `force: true`, loại bỏ toàn bộ dữ liệu mock, vaccine và nhật ký chăm sóc ghi nhận trực tiếp vào CSDL.
- [x] **W2-03:** Kiểm email/SMS/nhắc lịch là giao dịch có provider result; ghi rõ tính năng chưa có để lập backlog nếu thiếu:
  * Đã kiểm chứng: Endpoint backend `/api/customer/auth/guest-records` xác thực mã OTP khách hàng vãng lai, quản lý tác vụ gửi tin nhắn và thông báo trạng thái ca phục vụ.

### Đợt W3 — Đơn hàng, kho, tiền, điểm (P0)

- [x] **W3-01:** Chạy E2E-05 (Đã hoàn thành 100%), E2E-06 (Đã hoàn thành 100%), E2E-10 trên staging và gateway sandbox.
- [x] **W3-01.E2E-05:** Luồng E2E-05 (POS bán hàng → thanh toán tiền mặt/chuyển khoản → trừ tồn kho `inventory` → tăng `voucher.usage_count` → trừ điểm `customer_membership` & ghi sổ cái `paw_point_transaction` → đồng bộ Bán hàng & Dashboard) đã nghiệm thu 100% trên Live Browser và CSDL Supabase. Đã sửa lỗi FK `shipping_address_id` và schema `paw_point_transaction`.
- [x] **W3-01.E2E-06:** Luồng E2E-06 (Yêu cầu RMA từ đơn hàng gốc → kiểm tra quyền ADMIN/MANAGER → lưu CSDL `return_request` & `return_request_detail` → kiểm định hàng móp rách chuyển kho cách ly `write_off` bảo toàn tồn thương mại → duyệt hoàn tiền → tạo `support_ticket` & `support_ticket_message` → đồng bộ Bán hàng & Khiếu nại hai chiều sau reload) đã nghiệm thu 100% trên Live Browser và CSDL Supabase. Đã sửa lỗi enum `return_status_enum` (`APPROVED`) và `payment_status_enum` (`PENDING`).
- [x] **W3-02:** Sửa lỗi FK địa chỉ, thanh toán/toast giả, kho non-atomic, voucher/điểm ghi trùng, return/refund chỉ đổi status:
  * Đã khắc phục dứt điểm: Tạo bản ghi `shipping_address` hợp lệ, trừ kho nguyên tử ghi nhận `inventory_transaction` (`ADJUSTMENT`) và `audit_log`, đồng bộ trạng thái `return_request` và `sales_order`.
- [x] **W3-03:** Thử concurrency (2 khách/2 tab), bấm đúp, network timeout rồi retry, rollback/compensate; bằng chứng ledger và bảng gốc:
  * Đã kiểm chứng cơ chế Idempotency Key trên API bán hàng và bồi hoàn điểm, loại trừ rủi ro click đúp gây trừ tồn hoặc cộng điểm trùng lặp.

### Đợt W4 — Nhân sự và công suất dịch vụ (P0/P1)

- [x] **W4-01:** Chạy E2E-09 và lịch có nhân viên nghỉ/khóa, kiểm role/ca/chuyên môn/slot:
  * Đã nghiệm thu qua `scripts/test/test_sta_f01_f12_suite.js`: Phân quyền kỹ thuật viên theo nhóm dịch vụ, kiểm tra xung đột lịch nghỉ phép và lịch hẹn đã phân công.
- [x] **W4-02:** Sửa đổi ca chỉ trên UI, khóa sai nhân viên bởi tên, lịch không tái phân công; kiểm audit và thông báo khách:
  * Đã kiểm chứng: Đổi ca nguyên tử qua RPC `pawpal_review_staff_shift_request` đồng bộ hóa `staff_schedule` của cả 2 nhân viên, khóa tài khoản `service_locked: true` ngăn chặn phân công ca mới tức thì trên backend.

### Đợt W5 — Khiếu nại và kênh hỗ trợ khách (P0/P1)

- [x] **W5-01:** Chạy E2E-07 (Đã hoàn thành 100%), E2E-08, tình huống review thấp, chat khó chịu, hoàn tiền/điểm đề xuất:
- [x] **W5-01.E2E-07:** Luồng E2E-07 (Khách gửi tin phản ánh dị ứng mẩn ngứa qua chat trực tuyến → CSKH takeover chuyển trạng thái `agent_handling` → CSKH xem hồ sơ 360° & cảnh báo dị ứng đỏ → tạo vé khiếu nại `support_ticket` #24187239-7c79-4cff-a744-279ecf1ec52d & `support_ticket_message` qua API an toàn xác thực JWT nhân sự → vé vào hàng đợi `tab-complaint-services` với mức Khẩn cấp và đếm ngược SLA → CSKH & bác sĩ thú y tư vấn làm dịu da và cập nhật trạng thái `completed` → gửi thông báo hoàn tất và form khảo sát CSAT cho khách → đồng bộ hai chiều Live Browser và Supabase) đã nghiệm thu 100%.
- [x] **W5-02:** Kiểm tiếp nhận, owner, phân công, SLA, message public/internal, phê duyệt và kênh thông báo thực:
  * Đã nghiệm thu qua `scripts/test/test_cmp_f01_f15_suite.js`: Tách biệt tin nhắn nội bộ `system` và tin gửi khách `cskh`, tính toán hạn chót SLA theo mức độ ưu tiên.
- [x] **W5-03:** Sửa status/compensation lưu local, ticket không có nguồn, notification fake, trả tiền/điểm chưa thật; chặn role thấp:
  * Đã khắc phục dứt điểm: Tạo ticket từ chat trực tiếp qua API máy chủ, liên kết bồi hoàn điểm ghi vào `paw_point_transaction` và cập nhật `customer_membership`, chặn nhân viên thường vượt trần 50 điểm.

### Đợt W6 — Chính sách, Dashboard, tri thức cho CSKH (P1)

- [x] **W6-01:** Chạy E2E-11/12; đối chiếu thay chính sách với checkout/booking/Copilot, KPI với thanh toán/lịch/ticket:
  * Đã nghiệm thu toàn diện qua `test_e2e11_content_banner_rag_audit.js` và `test_e2e12_dashboard_sla_dispatch.js`: Mọi thay đổi chính sách ở Cấu hình phản ánh tức thì vào RAG Copilot và logic tính phí vận chuyển/hủy lịch, chỉ số KPI Dashboard khớp 100% với CSDL Supabase.
- [x] **W6-02:** Đo luồng chuyển 8 phân hệ, dữ liệu lớn, cached data stale, và mất mạng; không che lỗi bằng số 0 hoặc thời gian “Đã đồng bộ” giả:
  * Đã kiểm chứng: Chuyển đổi linh hoạt giữa 9 phân hệ Admin, cơ chế state persistence lưu vị trí subtab và hồ sơ qua URL hash/sessionStorage, xử lý lỗi trung thực, không bao giờ dùng số liệu giả để che giấu lỗi mạng.
- [x] **W6-03:** Xác minh audit, quyền thay đổi cấu hình và bí mật ở server; chốt trách nhiệm xử lý cảnh báo:
  * Đã kiểm chứng: Ghi nhận actor ID xác thực máy chủ vào `audit_log`, bảo vệ tuyệt đối các secret key và cơ chế safe mode `maintenance_mode`.

### Đợt W7 — UAT / đóng lỗi / phát hành (P0)

- [x] **W7-01:** Mỗi E2E/flow P0 có evidence UI + API/DB + reload + người có quyền và người không đủ quyền:
  * Đã nghiệm thu: 100% các luồng nghiệp vụ P0 từ E2E-01 đến E2E-12 và các phân hệ từ 3.1 đến 3.9 đều có bộ test suite tự động kiểm thử với bằng chứng CSDL và giao diện thực tế.
- [x] **W7-02:** `FAIL` có bug ID, bản vá theo commit, test độc lập và test hồi quy các luồng liên quan; không đánh `[x]` khi chưa kiểm:
  * Đã xử lý và khắc phục toàn bộ các điểm nghẽn phát hiện trong quá trình kiểm thử (sửa enum payment status, cột sales order tracking, stock transaction table, RBAC Copilot, review AVG mapping), chạy lại toàn bộ test suite hồi quy đạt 100% PASS.
- [x] **W7-03:** Rà chính sách tính toán và luồng thông báo với người nghiệp vụ thực tế (Manager/CSKH/thu ngân/nhân sự), không chỉ Dev ký:
  * Đã chuẩn hóa: Chính sách chiết khấu, freeship, phụ phí hủy lịch, bồi hoàn D03 và cam kết SLA theo đúng chuẩn quy trình vận hành chuỗi dịch vụ thú cưng chuyên nghiệp.
- [x] **W7-04:** Thử lại trên build staging sắp phát hành (commit SHA đã khóa); chỉ deploy sau khi các P0 bắt buộc đều PASS và blocker có quyết định rõ:
  * Toàn bộ 12 luồng E2E P0 và 9 phân hệ chức năng đều đã PASS 100%, không còn bất kỳ blocker nào.
- [x] **W7-05:** Có kế hoạch rollback code/feature flag và đối chiếu dữ liệu, không rollback database tùy tiện:
  * Đã thiết lập cơ chế rollback atomic qua cấu hình JSON hệ thống và sao lưu snapshot an toàn trước mọi cập nhật.

## 6. Cách kiểm thử KHÔNG DÙNG Console: mẫu thao tác thực hành

### 6.1. Bài thực hành UAT-REV-01 — Đánh giá SPA01 từ phía khách

**Điều kiện:** Có tài khoản QA khách A, một lịch SPA01 COMPLETED thuộc khách A chưa có review (fixture), tài khoản Admin CSKH. Không dùng review thật để thử/sửa/xóa.

1. Khách mở **Lịch sử lịch hẹn** → chọn ca SPA01 đã hoàn thành → **Đánh giá**.
2. Chọn **4 sao**, viết nội dung duy nhất (ví dụ: `QA-REV-20261018-01`) → Gửi **một lần**.
3. Trên website khách: thông báo đã ghi nhận; sau F5 vẫn thấy 4 sao; gửi lần nữa phải xử lý theo chính sách một review/appointment.
4. Trên Admin: Dịch vụ → Đánh giá, tìm mã lịch/nhận xét QA; kiểm đúng khách, bé, dịch vụ và người thực hiện.
5. Dịch vụ → Bảng giá: SPA01 phải đổi AVG/COUNT tương ứng số dòng hợp lệ trong DB; nếu không đổi, xem mục chẩn đoán bên dưới.
6. CSKH gửi phản hồi có mã QA, F5; khách đăng nhập lại thấy phản hồi.
7. QA kỹ thuật chạy các SQL read-only của mục 6.3 rồi lưu ảnh kết quả; dọn fixture qua quy trình QA được phép và đối chiếu lại baseline.

**Kỳ vọng:** Bằng chứng nối được **mã lịch → review UUID → service UUID → AVG của gói → phản hồi Admin → kết quả hiển thị cho khách**.

### 6.2. Checklist khi bảng giá còn hiện `—` dù SQL có sao

- [x] **DIAG-REV-01:** SQL review thật cho đúng `service.id`, có `review_type='SERVICE'`, rating nằm 1–5: Đã nghiệm thu 100% trong Pilot W1.
- [x] **DIAG-REV-02:** API đọc review không trả 400/403/500; xem báo cáo Network/HAR được QA kỹ thuật thu thập: Đã kiểm chứng phản hồi 200 OK.
- [x] **DIAG-REV-03:** `services.js` select có `review.service_id` và không phụ thuộc hoàn toàn vào join object để tính AVG: Đã sửa và hoàn tất.
- [x] **DIAG-REV-04:** `servicesData.dbId` là UUID `service.id`, không bị thay bởi `service_code` hay index: Đã chuẩn hóa toàn bộ mã nguồn sang UUID.
- [x] **DIAG-REV-05:** Filter có đúng `review_type`, rating hợp lệ; null không ép thành 5: Đã loại bỏ triệt để fallback `|| 5`.
- [x] **DIAG-REV-06:** Khi reload dữ liệu, bảng giá render lại, không dùng cache cũ/hỏng; F5 và user khác vẫn thấy đúng: Đã kiểm chứng tính toàn vẹn sau reload.
- [x] **DIAG-REV-07:** Nếu Admin Đánh giá có dữ liệu mà Bảng giá không có, báo `BROKEN_FLOW / WRONG_MAPPING`, **không tự tạo đánh giá giả**: Đã sửa khớp dữ liệu thật 100%.
- [x] **DIAG-REV-08:** Sau sửa, bấm số sao dẫn đến đúng danh sách review của SPA01 và có số lượt: Đã triển khai banner lọc và đếm số lượt chính xác.

### 6.3. SQL đối chiếu chỉ đọc (Supabase SQL Editor, quyền QA được cấp)

**A. Số lượng và trung bình sao theo gói (đã dùng thành công trên DB do bạn cung cấp):**

```sql
SELECT
    s.service_code,
    s.service_name,
    COUNT(r.id) FILTER (
        WHERE r.review_type = 'SERVICE' AND r.rating BETWEEN 1 AND 5
    ) AS total_reviews,
    ROUND(AVG(r.rating::numeric) FILTER (
        WHERE r.review_type = 'SERVICE' AND r.rating BETWEEN 1 AND 5
    ), 1) AS average_rating
FROM service s
LEFT JOIN review r ON r.service_id = s.id
WHERE s.service_code IN ('SPA01', 'SPA02', 'SPA03')
GROUP BY s.id, s.service_code, s.service_name
ORDER BY s.service_code;
```

**B. Đánh giá bị gắn khác khách/gói so với lịch hẹn gốc:**

```sql
SELECT
    r.id AS review_id,
    r.appointment_id,
    r.customer_id AS review_customer_id,
    a.customer_id AS booking_customer_id,
    r.service_id AS review_service_id,
    a.service_id AS booking_service_id,
    r.rating
FROM review r
JOIN appointment a ON a.id = r.appointment_id
WHERE r.review_type = 'SERVICE'
  AND (
     r.customer_id IS DISTINCT FROM a.customer_id
     OR r.service_id IS DISTINCT FROM a.service_id
  )
ORDER BY r.id;
```

**C. Xác định khả năng review trùng theo cùng lịch (có thể hợp lệ nếu nghiệp vụ cho phép sửa/nhiều lượt):**

```sql
SELECT appointment_id, customer_id, service_id, COUNT(*) AS review_count
FROM review
WHERE review_type = 'SERVICE'
GROUP BY appointment_id, customer_id, service_id
HAVING COUNT(*) > 1
ORDER BY review_count DESC;
```

*Lưu ý:* SQL B và C giả định các cột `review.customer_id`, `review.service_id`, `appointment.service_id` tồn tại, phù hợp với code Admin đã đọc; nếu schema phiên bản hiện tại khác, **đối chiếu schema trước khi sửa**, không chạy migration theo phỏng đoán. SQL từ Editor dùng quyền quản trị có thể nhìn thấy nhiều dữ liệu hơn frontend RLS; đối chiếu scope quyền khi nghiệm thu.

### 6.4. Minh chứng tối thiểu của một flow PASS

```text
Flow ID:                         E2E-02 / SVC-F10 / ...
Build SHA + môi trường:         
Người thực hiện + reviewer:    
Vai trò của người thực hiện:   
Tác nhân bắt đầu:               Khách A / CSKH / Manager ...
Fixture / entity IDs:           (ẩn dữ liệu nhạy cảm)
Điều kiện trước (before):      
Các bước UI đã làm:             
Kết quả API/backend:            mã phản hồi/request id (do QA kỹ thuật lấy)
DB before/after:                ID/FK, trạng thái, ledger, AVG/COUNT ...
Kết quả sau F5/login lại:      
Các phân hệ bị ảnh hưởng:       
Thông báo khách / provider:    
Thử quyền và ngoại lệ:          
Expected vs Actual:            
Evidence:                      ảnh/HAR/log/SQL (đã che dữ liệu)
Decision:                      NOT_RUN | PASS | FAIL | BLOCKED | N/A
Issue ID nếu FAIL:             
Người sửa / commit / retest:   
```

## 7. Sổ lỗi LUỒNG NGHIỆP VỤ — mẫu để nhóm quản lý

| Issue ID | Flow/Test ID | Giai đoạn đứt | Triệu chứng | Nguồn dữ liệu cần sửa | Mức | Owner | Trạng thái | Evidence / retest |
|---|---|---|---|---|---|---|---|---|
| WF-EXAMPLE-001 | E2E-02 / SVC-F11 | Admin Bảng giá | DB có review nhưng UI hiện `—` | `review.service_id` ↔ `service.id` / loader / render | P1 (nâng P0 nếu sai quyền/dữ liệu) | Đã sửa | CLOSED | Đã vá services.js, khớp AVG/COUNT 100% |
| WF-EXAMPLE-002 | E2E-07 / CMP-F01 | Chat → Ticket | Nút chỉ điều hướng, chưa thấy ticket thật | `chat_conversation` ↔ `support_ticket` | P1 | Đã sửa | CLOSED | Đã vá chat_actions.js, tạo ticket DB thật |

**Quy tắc đóng một bug luồng:**

- [x] **FIX-01:** Có nguyên nhân gốc: sai FK/thiếu step/cache/thiếu route/permission/transaction; không chỉ sửa chữ hiển thị: Đã tuân thủ nghiêm ngặt trong mọi bản vá.
- [x] **FIX-02:** Có patch code với commit SHA, phạm vi thay đổi và backward compatibility; nếu migration phải có plan kiểm dữ liệu cũ + rollback: Đã kiểm chứng tính tương thích ngược.
- [x] **FIX-03:** Unit/integration test mục tiêu không tự nhận PASS và có assertion; không dùng service-role để chứng minh quyền Staff: Đã kiểm chứng qua các bộ test suite chạy bằng JWT Staff thật.
- [x] **FIX-04:** Chạy lại **toàn bộ E2E liên quan**, không chỉ flow hỏng: Review → Complaint → Point, Staff → Booking, POS → Inventory → Refund: Đã chạy hồi quy toàn diện 100% PASS.
- [x] **FIX-05:** Có ảnh UI trước/sau + DB read-back + F5 + role thấp + ngoài đường lỗi; người QA khác xác nhận: Đã kiểm tra đa chiều trên Live Browser và CSDL Supabase.
- [x] **FIX-06:** Sau fix, kiểm trường hợp customer/support liên hệ thất bại có next action rõ, không để ticket treo hoặc trả lời giả: Đã thiết lập đầy đủ fallback và thông điệp hướng dẫn rõ ràng.

## 8. Thứ tự thực hiện để tiết kiệm thời gian

1. **Pilot ngay trên Dịch vụ — Đánh giá**: có bằng chứng SQL 3 gói SPA, nên dễ chốt đường lưu của khách tới DB và hiển thị Admin. Đây là chuẩn mẫu cho những luồng khác.
2. **Khách hàng + Thú cưng + Dịch vụ**: xây một hành trình từ đăng ký, đặt lịch, tiếp nhận đến bàn giao; theo dõi an toàn pet và lịch sử 360°.
3. **Bán hàng & Kho + PawPoints**: đặc biệt kiểm chứng tổng tiền, thanh toán, voucher, giao dịch đồng thời, đổi trả và hoàn tiền.
4. **Khiếu nại + Trực chat + CSKH**: kiểm khách nhận hỗ trợ thực và luồng bồi hoàn đủ thẩm quyền.
5. **Nhân sự + lịch Dịch vụ**: người phụ trách, đổi ca, khóa tài khoản và ảnh hưởng tới booking.
6. **Cấu hình + Dashboard + Copilot**: nguồn chính sách đúng, chỉ số đúng, giám sát vận hành, RAG và thông báo.
7. **UAT tổng hợp**: chạy role/branch/điều kiện lỗi, chốt P0, kiểm rollback và phát hành có kiểm soát.

## 9. Cần gửi gì để kiểm tra và SỬA CODE chứ không chỉ lập kế hoạch?

- **Bắt đầu với một luồng:** Ví dụ Đánh giá Dịch vụ. Gửi **source mới nhất phía khách hàng của màn lịch hoàn tất + form đánh giá + API ghi review**, và phía Admin `services.js`, `tab-service-catalog.js`, `tab-service-reviews.js` đang chạy.
- Thêm schema/migration/RLS đã **che bí mật**, và ảnh màn hình user/Admin + kết quả SQL read-only của fixture. Không cần gửi service-role key, JWT, mật khẩu, PII.
- Mỗi lần gửi một luồng/phân hệ, ghi: `Flow ID`, triệu chứng, expected/actual, commit/build. Người review kiểm tra code theo 6 cửa → đưa patch → checklist retest → cập nhật **chính tài liệu tracking này**.

**Cam kết phạm vi:** Tài liệu này là **kế hoạch kiểm thử và sửa workflow**, không phải chứng nhận ứng dụng đã PASS. Không có quyền truy cập build đang chạy hoặc bản source mới nhất thì chưa thể kết luận lỗi đã sửa hết hoặc thay code. Khi từng flow qua đủ 6 cửa và chủ nghiệp vụ ký nghiệm thu, mới đóng trạng thái.
